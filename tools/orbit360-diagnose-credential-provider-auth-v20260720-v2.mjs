#!/usr/bin/env node
import fs from 'node:fs';
import { GoogleAuth } from 'google-auth-library';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const REGION = 'us-central1';
const TENANT_ID = 'alianzas-soluciones';
const EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL = 'orbit.lab@demo.com';
const FUNCTION_ID = 'orbit360ImportInsurerCredentials';
const EXPECTED_RUNTIME_SA = 'orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com';
const OUTPUT = process.env.ORBIT360_PROVIDER_AUTH_DIAGNOSTIC ||
  'orbit360-platform/runtime-gate-crm-v20260716/provider-authorization-diagnostic-sanitized.json';
const IMPORT_ROLES = new Set(['direccion', 'superadmin', 'super_admin', 'admin', 'admintenant', 'admin_tenant']);

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
  schemaVersion: 'orbit360-provider-authorization-diagnostic-v2',
  diagnosticRevision: 'membership-sources-and-iam-get-v2',
  projectId: PROJECT_ID,
  region: REGION,
  tenantId: TENANT_ID,
  functionId: FUNCTION_ID,
  mode: 'read_only',
  iamReadMethod: 'GET',
  checks: {},
  membership: {},
  deployment: {},
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
  const functionName = `projects/${PROJECT_ID}/locations/${REGION}/functions/${FUNCTION_ID}`;
  const functionData = await apiGet(token, `https://cloudfunctions.googleapis.com/v2/${functionName}`);
  const serviceResource = clean(functionData?.serviceConfig?.service, 360);
  report.deployment = {
    state: clean(functionData?.state, 80),
    environment: clean(functionData?.environment, 80),
    updateTimePresent: Boolean(functionData?.updateTime),
    serviceResourcePresent: Boolean(serviceResource),
    uriPresent: Boolean(functionData?.serviceConfig?.uri),
    runtimeServiceAccountMatches: clean(functionData?.serviceConfig?.serviceAccountEmail, 240) === EXPECTED_RUNTIME_SA,
    ingressSettings: clean(functionData?.serviceConfig?.ingressSettings, 100),
    allTrafficOnLatestRevision: functionData?.serviceConfig?.allTrafficOnLatestRevision === true
  };
  report.checks.functionActive = report.deployment.state === 'ACTIVE';
  report.checks.runtimeServiceAccountMatches = report.deployment.runtimeServiceAccountMatches;

  try {
    const functionPolicy = await apiGet(token, `https://cloudfunctions.googleapis.com/v2/${functionName}:getIamPolicy`);
    report.functionIam = summarizePolicy(functionPolicy);
  } catch (error) {
    report.functionIam = { readable: false };
    report.errors.functionIam = category(error, 'FUNCTION_IAM_UNREADABLE');
  }

  if (serviceResource) {
    try {
      const runService = await apiGet(token, `https://run.googleapis.com/v2/${serviceResource}`);
      report.deployment.cloudRunIngress = clean(runService?.ingress, 100);
      report.deployment.cloudRunUriPresent = Boolean(runService?.uri);
    } catch (error) {
      report.errors.cloudRunService = category(error, 'CLOUD_RUN_SERVICE_UNREADABLE');
    }

    try {
      const runPolicy = await apiGet(token, `https://run.googleapis.com/v2/${serviceResource}:getIamPolicy`);
      report.cloudRunIam = summarizePolicy(runPolicy);
      report.checks.publicCallableIngress = report.cloudRunIam.publicInvoker === true;
    } catch (error) {
      report.cloudRunIam = { readable: false };
      report.errors.cloudRunIam = category(error, 'CLOUD_RUN_IAM_UNREADABLE');
      report.checks.publicCallableIngress = false;
    }
  } else {
    report.checks.publicCallableIngress = false;
  }
} catch (error) {
  report.errors.deployment = category(error, 'FUNCTION_DESCRIBE_FAILED');
  report.checks.functionActive = false;
  report.checks.runtimeServiceAccountMatches = false;
  report.checks.publicCallableIngress = false;
}

if (report.checks.membershipAuthorizationWouldPass === false) {
  report.classification = 'DATA_CONTRACT_FAILURE_MEMBERSHIP';
  report.rootCauseCandidate = 'La membresía efectiva aún no contiene el rol activo dentro de roles canónicos asignados.';
} else if (report.checks.functionActive !== true || report.checks.runtimeServiceAccountMatches !== true) {
  report.classification = 'ENVIRONMENT_FAILURE_PROVIDER_DEPLOYMENT';
  report.rootCauseCandidate = 'La función desplegada o su cuenta ejecutora no coinciden con el contrato vigente.';
} else if (report.cloudRunIam.readable !== true) {
  report.classification = 'ENVIRONMENT_FAILURE_IAM_POLICY_UNREADABLE';
  report.rootCauseCandidate = 'La política IAM del servicio no pudo leerse con el método GET correcto.';
} else if (report.checks.publicCallableIngress !== true) {
  report.classification = 'ENVIRONMENT_FAILURE_CALLABLE_INVOKER';
  report.rootCauseCandidate = 'El servicio Cloud Run no tiene un invocador público compatible con el protocolo callable de Firebase.';
} else {
  report.classification = 'PROVIDER_AUTHORIZATION_LAYER_READY';
  report.rootCauseCandidate = 'Membresía, despliegue e ingreso callable cumplen el contrato previo a una invocación controlada.';
}

report.diagnosticComplete = true;
report.providerAuthorizationReady = report.classification === 'PROVIDER_AUTHORIZATION_LAYER_READY';
report.ok = true;
write(report);
console.log(`ORBIT360_PROVIDER_AUTH_DIAGNOSTIC_V2:${report.classification}`);
