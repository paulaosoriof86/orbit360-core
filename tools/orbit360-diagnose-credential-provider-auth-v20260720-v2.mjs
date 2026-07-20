#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import { GoogleAuth } from 'google-auth-library';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const REGION = 'us-central1';
const TENANT_ID = 'alianzas-soluciones';
const EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL = 'orbit.lab@demo.com';
const EXPECTED_RUNTIME_SA = 'orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com';
const FUNCTION_IDS = [
  'orbit360ImportInsurerCredentials',
  'orbit360CredentialStatus',
  'orbit360RevealInsurerCredential',
  'orbit360CopyInsurerCredential'
];
const PRIMARY_FUNCTION_ID = FUNCTION_IDS[0];
const OUTPUT = process.env.ORBIT360_PROVIDER_AUTH_DIAGNOSTIC ||
  'orbit360-platform/runtime-gate-crm-v20260716/provider-authorization-diagnostic-sanitized.json';
const IMPORT_ROLES = new Set(['direccion', 'superadmin', 'super_admin', 'admin', 'admintenant', 'admin_tenant']);
const REFERENCE_RUN_ID = String(process.env.ORBIT360_REFERENCE_DEPLOY_RUN_ID || '29781660851');
const REFERENCE_START = String(process.env.ORBIT360_REFERENCE_DEPLOY_START || '2026-07-20T21:49:46Z');
const REFERENCE_END = String(process.env.ORBIT360_REFERENCE_DEPLOY_END || '2026-07-20T21:53:15Z');
const WINDOW_PAD_MS = 5 * 60 * 1000;

const runtimeProject = String(process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '');
if (runtimeProject !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_LAB_PROVIDER_DIAGNOSTIC');

function clean(value, max = 180) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}

function normalize(value) {
  return clean(value, 120)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function unique(values) {
  return Array.from(new Set([].concat(values || []).map((value) => clean(value)).filter(Boolean)));
}

function rolesFrom(row) {
  row = row || {};
  return unique([].concat(
    Array.isArray(row.roles) ? row.roles : [],
    Array.isArray(row.rolesAsignados) ? row.rolesAsignados : [],
    Array.isArray(row.rolesDisponibles) ? row.rolesDisponibles : [],
    Array.isArray(row.assignedRoles) ? row.assignedRoles : [],
    row.role || [],
    row.rol || [],
    row.rolDefault || [],
    row.defaultRole || [],
    row.activeRole || []
  )).map(normalize).filter(Boolean).sort();
}

function category(error, fallback) {
  return clean(error?.code || error?.status || error?.message || fallback, 120)
    .replace(/[^A-Za-z0-9_.:/-]+/g, '_');
}

function hashValue(value) {
  const text = clean(value, 2000);
  return text ? crypto.createHash('sha256').update(text).digest('hex') : '';
}

function safeTimestamp(value) {
  const text = clean(value, 80);
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : '';
}

function withinReferenceWindow(value) {
  const time = Date.parse(String(value || ''));
  const start = Date.parse(REFERENCE_START);
  const end = Date.parse(REFERENCE_END);
  if (![time, start, end].every(Number.isFinite)) return false;
  return time >= start - WINDOW_PAD_MS && time <= end + WINDOW_PAD_MS;
}

function summarizePolicy(policy) {
  const bindings = Array.isArray(policy?.bindings) ? policy.bindings : [];
  const invoker = bindings.filter(binding => clean(binding?.role, 160) === 'roles/run.invoker');
  const members = invoker.flatMap(binding => Array.isArray(binding?.members) ? binding.members : []);
  return {
    readable: true,
    bindingCount: bindings.length,
    invokerBindingCount: invoker.length,
    publicInvoker: members.includes('allUsers'),
    authenticatedPublicInvoker: members.includes('allAuthenticatedUsers'),
    serviceAccountInvokerCount: members.filter(value => /^serviceAccount:/i.test(value)).length,
    userInvokerCount: members.filter(value => /^user:/i.test(value)).length,
    groupInvokerCount: members.filter(value => /^group:/i.test(value)).length
  };
}

function summarizeStateMessages(messages) {
  return (Array.isArray(messages) ? messages : []).slice(0, 12).map((item) => ({
    severity: clean(item?.severity, 40),
    type: clean(item?.type, 100),
    messageHash: hashValue(item?.message || '')
  }));
}

function summarizeTraffic(statuses) {
  return (Array.isArray(statuses) ? statuses : []).slice(0, 12).map((item) => ({
    type: clean(item?.type, 40),
    percent: Number.isFinite(Number(item?.percent)) ? Number(item.percent) : 0,
    revisionHash: hashValue(item?.revision || ''),
    tagPresent: Boolean(item?.tag)
  }));
}

async function accessToken() {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const tokenResult = await client.getAccessToken();
  const token = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
  if (!token) throw new Error('GOOGLE_ACCESS_TOKEN_UNAVAILABLE');
  return token;
}

async function apiGet(token, url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(`HTTP_${response.status}`);
    error.status = response.status;
    error.code = body?.error?.status || body?.error?.code || '';
    throw error;
  }
  return body;
}

function write(report) {
  fs.mkdirSync(new URL('../orbit360-platform/runtime-gate-crm-v20260716/', import.meta.url), { recursive: true });
  report.containsPII = false;
  report.containsSecrets = false;
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

const report = {
  schemaVersion: 'orbit360-provider-authorization-diagnostic-v3-four-functions-readonly',
  diagnosticRevision: 'provider-revisions-readonly-v3',
  projectId: PROJECT_ID,
  region: REGION,
  tenantId: TENANT_ID,
  functionId: PRIMARY_FUNCTION_ID,
  functionIds: FUNCTION_IDS,
  mode: 'read_only',
  iamReadMethod: 'GET',
  referenceDeployRun: {
    runId: REFERENCE_RUN_ID,
    startAt: safeTimestamp(REFERENCE_START),
    endAt: safeTimestamp(REFERENCE_END),
    comparisonPaddingMs: WINDOW_PAD_MS
  },
  checks: {},
  membership: {},
  deployment: {},
  functions: [],
  cloudRunIam: {},
  functionIam: {},
  errors: {}
};

try {
  const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const db = getFirestore(app);
  const memberSnap = await db.collection('tenants').doc(TENANT_ID).collection('members').doc(EXPECTED_UID).get();
  const member = memberSnap.exists ? (memberSnap.data() || {}) : {};
  const advisorId = clean(member.advisorId || member.asesorId, 160);
  const advisorSnap = advisorId
    ? await db.collection('tenantId').doc(TENANT_ID).collection('asesores').doc(advisorId).get()
    : null;
  const advisor = advisorSnap?.exists ? (advisorSnap.data() || {}) : {};
  const memberRoles = rolesFrom(member);
  const advisorRoles = rolesFrom(advisor);
  const assignedRoles = unique(memberRoles.concat(advisorRoles)).sort();
  const activeRole = normalize(member.activeRole || member.rolActivo || member.defaultRole || member.rolDefault || '');
  report.membership = {
    exists: memberSnap.exists,
    statusActive: clean(member.status || member.estado, 40).toLowerCase() === 'active',
    tenantMatches: clean(member.tenantId, 120) === TENANT_ID,
    emailMatchesExpected: clean(member.email || member.correo, 200).toLowerCase() === EXPECTED_EMAIL,
    advisorLinked: Boolean(advisorId),
    advisorExists: Boolean(advisorSnap?.exists),
    memberRoles,
    advisorRoles,
    assignedRoles,
    activeRole,
    activeRoleAssigned: Boolean(activeRole && assignedRoles.includes(activeRole)),
    importRoleAllowed: IMPORT_ROLES.has(activeRole),
    countriesCount: unique(member.countries || member.paises).length,
    defaultScope: clean(member.dataScopes?.default || member.scopes?.default || member.scopeDatos, 40)
  };
  report.checks.membershipAuthorizationWouldPass = Boolean(
    report.membership.exists &&
    report.membership.statusActive &&
    report.membership.tenantMatches &&
    report.membership.activeRoleAssigned &&
    report.membership.importRoleAllowed
  );
} catch (error) {
  report.errors.membership = category(error, 'MEMBERSHIP_DIAGNOSTIC_FAILED');
  report.checks.membershipAuthorizationWouldPass = false;
}

try {
  const token = await accessToken();
  for (const functionId of FUNCTION_IDS) {
    const functionName = `projects/${PROJECT_ID}/locations/${REGION}/functions/${functionId}`;
    const row = {
      functionId,
      exists: false,
      state: '',
      environment: '',
      createTime: '',
      updateTime: '',
      updatedDuringReferenceRun: false,
      runtime: '',
      entryPointMatches: false,
      serviceResourcePresent: false,
      uriPresent: false,
      runtimeServiceAccountMatches: false,
      ingressSettings: '',
      allTrafficOnLatestRevision: false,
      stateMessages: [],
      cloudRun: {},
      functionIam: {},
      cloudRunIam: {},
      errors: {}
    };
    try {
      const functionData = await apiGet(token, `https://cloudfunctions.googleapis.com/v2/${functionName}`);
      const serviceResource = clean(functionData?.serviceConfig?.service, 500);
      row.exists = true;
      row.state = clean(functionData?.state, 80);
      row.environment = clean(functionData?.environment, 80);
      row.createTime = safeTimestamp(functionData?.createTime);
      row.updateTime = safeTimestamp(functionData?.updateTime);
      row.updatedDuringReferenceRun = withinReferenceWindow(functionData?.updateTime);
      row.runtime = clean(functionData?.buildConfig?.runtime, 80);
      row.entryPointMatches = clean(functionData?.buildConfig?.entryPoint, 160) === functionId;
      row.serviceResourcePresent = Boolean(serviceResource);
      row.uriPresent = Boolean(functionData?.serviceConfig?.uri);
      row.runtimeServiceAccountMatches = clean(functionData?.serviceConfig?.serviceAccountEmail, 240) === EXPECTED_RUNTIME_SA;
      row.ingressSettings = clean(functionData?.serviceConfig?.ingressSettings, 100);
      row.allTrafficOnLatestRevision = functionData?.serviceConfig?.allTrafficOnLatestRevision === true;
      row.stateMessages = summarizeStateMessages(functionData?.stateMessages);

      try {
        const functionPolicy = await apiGet(token, `https://cloudfunctions.googleapis.com/v2/${functionName}:getIamPolicy`);
        row.functionIam = summarizePolicy(functionPolicy);
      } catch (error) {
        row.functionIam = { readable: false };
        row.errors.functionIam = category(error, 'FUNCTION_IAM_UNREADABLE');
      }

      if (serviceResource) {
        try {
          const runService = await apiGet(token, `https://run.googleapis.com/v2/${serviceResource}`);
          row.cloudRun = {
            readable: true,
            createTime: safeTimestamp(runService?.createTime),
            updateTime: safeTimestamp(runService?.updateTime),
            latestReadyRevisionHash: hashValue(runService?.latestReadyRevision || ''),
            latestCreatedRevisionHash: hashValue(runService?.latestCreatedRevision || ''),
            latestReadyMatchesCreated: Boolean(
              runService?.latestReadyRevision &&
              runService?.latestCreatedRevision &&
              runService.latestReadyRevision === runService.latestCreatedRevision
            ),
            observedGeneration: clean(runService?.observedGeneration, 80),
            generation: clean(runService?.generation, 80),
            ingress: clean(runService?.ingress, 100),
            uriPresent: Boolean(runService?.uri),
            trafficStatuses: summarizeTraffic(runService?.trafficStatuses),
            terminalConditionState: clean(runService?.terminalCondition?.state, 40),
            terminalConditionType: clean(runService?.terminalCondition?.type, 80),
            terminalConditionReason: clean(runService?.terminalCondition?.reason, 100),
            terminalConditionMessageHash: hashValue(runService?.terminalCondition?.message || '')
          };
        } catch (error) {
          row.cloudRun = { readable: false };
          row.errors.cloudRunService = category(error, 'CLOUD_RUN_SERVICE_UNREADABLE');
        }

        try {
          const runPolicy = await apiGet(token, `https://run.googleapis.com/v2/${serviceResource}:getIamPolicy`);
          row.cloudRunIam = summarizePolicy(runPolicy);
        } catch (error) {
          row.cloudRunIam = { readable: false };
          row.errors.cloudRunIam = category(error, 'CLOUD_RUN_IAM_UNREADABLE');
        }
      }
    } catch (error) {
      row.errors.functionDescribe = category(error, 'FUNCTION_DESCRIBE_FAILED');
    }
    report.functions.push(row);
  }
} catch (error) {
  report.errors.accessToken = category(error, 'GOOGLE_ACCESS_TOKEN_UNAVAILABLE');
}

const primary = report.functions.find((item) => item.functionId === PRIMARY_FUNCTION_ID) || {};
report.deployment = {
  state: clean(primary.state, 80),
  environment: clean(primary.environment, 80),
  createTime: clean(primary.createTime, 80),
  updateTime: clean(primary.updateTime, 80),
  updateTimePresent: Boolean(primary.updateTime),
  updatedDuringReferenceRun: primary.updatedDuringReferenceRun === true,
  serviceResourcePresent: primary.serviceResourcePresent === true,
  uriPresent: primary.uriPresent === true,
  runtimeServiceAccountMatches: primary.runtimeServiceAccountMatches === true,
  ingressSettings: clean(primary.ingressSettings, 100),
  allTrafficOnLatestRevision: primary.allTrafficOnLatestRevision === true,
  cloudRunIngress: clean(primary.cloudRun?.ingress, 100),
  cloudRunUriPresent: primary.cloudRun?.uriPresent === true,
  latestReadyMatchesCreated: primary.cloudRun?.latestReadyMatchesCreated === true
};
report.functionIam = primary.functionIam || {};
report.cloudRunIam = primary.cloudRunIam || {};

report.checks.functionCountExpected = report.functions.length === FUNCTION_IDS.length;
report.checks.allFunctionsDescribed = report.functions.every((item) => item.exists === true);
report.checks.allFunctionsActive = report.functions.every((item) => item.state === 'ACTIVE');
report.checks.functionActive = primary.state === 'ACTIVE';
report.checks.allEntryPointsMatch = report.functions.every((item) => item.entryPointMatches === true);
report.checks.allRuntimeServiceAccountsMatch = report.functions.every((item) => item.runtimeServiceAccountMatches === true);
report.checks.runtimeServiceAccountMatches = primary.runtimeServiceAccountMatches === true;
report.checks.allCloudRunServicesReadable = report.functions.every((item) => item.cloudRun?.readable === true);
report.checks.allLatestRevisionsReady = report.functions.every((item) => item.cloudRun?.latestReadyMatchesCreated === true);
report.checks.allCloudRunIamReadable = report.functions.every((item) => item.cloudRunIam?.readable === true);
report.checks.allCallableIngress = report.functions.every((item) => item.cloudRunIam?.publicInvoker === true);
report.checks.publicCallableIngress = primary.cloudRunIam?.publicInvoker === true;
report.checks.functionsUpdatedDuringReferenceRun = report.functions.filter((item) => item.updatedDuringReferenceRun === true).length;
report.checks.noStateMessages = report.functions.every((item) => item.stateMessages.length === 0);

const updatedCount = report.checks.functionsUpdatedDuringReferenceRun;
if (report.checks.allFunctionsDescribed !== true || report.checks.allFunctionsActive !== true) {
  report.deploymentClassification = 'DEPLOYMENT_REVISION_INCONSISTENT';
} else if (updatedCount === FUNCTION_IDS.length) {
  report.deploymentClassification = 'DEPLOYMENT_CONFIRMED_CURRENT';
} else if (updatedCount > 0) {
  report.deploymentClassification = 'DEPLOYMENT_PARTIAL';
} else {
  report.deploymentClassification = 'DEPLOYMENT_NOT_APPLIED';
}

if (report.checks.membershipAuthorizationWouldPass === false) {
  report.classification = 'DATA_CONTRACT_FAILURE_MEMBERSHIP';
  report.rootCauseCandidate = 'La membresía efectiva aún no contiene el rol activo dentro de roles canónicos asignados.';
} else if (
  report.checks.allFunctionsActive !== true ||
  report.checks.allRuntimeServiceAccountsMatch !== true ||
  report.checks.allEntryPointsMatch !== true
) {
  report.classification = 'ENVIRONMENT_FAILURE_PROVIDER_DEPLOYMENT';
  report.rootCauseCandidate = 'Una o más Functions no están activas o no coinciden con el contrato de runtime vigente.';
} else if (report.checks.allCloudRunIamReadable !== true) {
  report.classification = 'ENVIRONMENT_FAILURE_IAM_POLICY_UNREADABLE';
  report.rootCauseCandidate = 'La política IAM de uno o más servicios no pudo leerse con el método GET correcto.';
} else if (report.checks.allCallableIngress !== true) {
  report.classification = 'ENVIRONMENT_FAILURE_CALLABLE_INVOKER';
  report.rootCauseCandidate = 'Uno o más servicios Cloud Run no tienen un invocador público compatible con el protocolo callable de Firebase.';
} else {
  report.classification = 'PROVIDER_AUTHORIZATION_LAYER_READY';
  report.rootCauseCandidate = 'Membresía, Functions, cuentas ejecutoras e ingreso callable cumplen el contrato previo a una invocación controlada.';
}

report.diagnosticComplete = true;
report.providerAuthorizationReady = report.classification === 'PROVIDER_AUTHORIZATION_LAYER_READY';
report.ok = true;
write(report);
console.log(`ORBIT360_PROVIDER_AUTH_DIAGNOSTIC_V3:${report.deploymentClassification}:${report.classification}`);
