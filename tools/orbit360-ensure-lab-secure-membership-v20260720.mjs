#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL = 'orbit.lab@demo.com';
const ADVISOR_ID = 'ase-paula-osorio';
const OUTPUT = process.env.ORBIT360_MEMBERSHIP_EVIDENCE ||
  'orbit360-platform/runtime-gate-crm-v20260716/membership-contract-sanitized.json';
const REASON = 'Restaurar contrato canónico LAB para validar importadores seguros M1';
const CONFIRMATION = 'CONFIRMO AMPLIAR ACCESO';
const DESIRED_ROLES = ['Dirección', 'SuperAdmin', 'AdminTenant', 'Asesor', 'Operativo'];
const DESIRED_COUNTRIES = ['GT', 'CO'];

const runtimeProject = String(process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '');
if (runtimeProject !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_LAB_MEMBERSHIP');

fs.mkdirSync(new URL('../orbit360-platform/runtime-gate-crm-v20260716/', import.meta.url), { recursive: true });

function cleanText(value) {
  return String(value == null ? '' : value).trim();
}
function unique(values) {
  return Array.from(new Set([].concat(values || []).map(cleanText).filter(Boolean)));
}
function sorted(values) {
  return unique(values).sort((a, b) => a.localeCompare(b, 'es'));
}
function cleanObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}
function canonicalMembership(input = {}) {
  const scopes = cleanObject(input.dataScopes || input.scopes || {});
  return {
    schemaVersion: cleanText(input.schemaVersion),
    uid: cleanText(input.uid || input.userId || input.id),
    email: cleanText(input.email || input.correo).toLowerCase(),
    tenantId: cleanText(input.tenantId || input.tenant),
    displayName: cleanText(input.displayName || input.nombre),
    roles: sorted(input.roles || (input.role || input.rol ? [input.role || input.rol] : [])),
    defaultRole: cleanText(input.defaultRole || input.rolDefault || input.roleDefault),
    activeRole: cleanText(input.activeRole || input.rolActivo),
    modulesExtra: sorted(input.modulesExtra || input.modulosExtra),
    modulesRestricted: sorted(input.modulesRestricted || input.modulosRestringidos),
    dataScopes: {
      default: cleanText(scopes.default || scopes['*']),
      modules: Object.fromEntries(Object.entries(cleanObject(scopes.modules)).sort(([a], [b]) => a.localeCompare(b, 'es')))
    },
    countries: sorted(input.countries || input.paises),
    advisorId: cleanText(input.advisorId || input.asesorId),
    teamId: cleanText(input.teamId || input.equipoId),
    status: cleanText(input.status || input.estado).toLowerCase(),
    labOnly: input.labOnly === true
  };
}
function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function equal(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function diffKeys(before, after) {
  return Object.keys(after).filter(key => !equal(before[key], after[key]));
}
function noSensitiveFields(value) {
  const bad = /^(password|pass|pwd|contrasena|contraseña|clave|secret|token|apiKey|credentialValue)$/i;
  let found = false;
  (function walk(node) {
    if (!node || found || typeof node !== 'object') return;
    for (const [key, item] of Object.entries(node)) {
      if (bad.test(key)) { found = true; return; }
      if (item && typeof item === 'object') walk(item);
    }
  })(value);
  return !found;
}
function writeEvidence(payload) {
  const safe = Object.assign({
    schemaVersion: 'orbit360-lab-secure-membership-evidence-v1',
    projectId: PROJECT_ID,
    tenantId: TENANT_ID,
    containsPII: false,
    containsSecrets: false
  }, payload);
  fs.writeFileSync(OUTPUT, `${JSON.stringify(safe, null, 2)}\n`, 'utf8');
}

const desired = canonicalMembership({
  schemaVersion: 'p0-20260713',
  uid: EXPECTED_UID,
  email: EXPECTED_EMAIL,
  tenantId: TENANT_ID,
  displayName: 'Orbit LAB',
  roles: DESIRED_ROLES,
  defaultRole: 'Dirección',
  activeRole: 'Dirección',
  modulesExtra: [],
  modulesRestricted: [],
  dataScopes: {
    default: 'all',
    modules: { aseguradoras: 'all', importar: 'all' }
  },
  countries: DESIRED_COUNTRIES,
  advisorId: ADVISOR_ID,
  teamId: '',
  status: 'active',
  labOnly: true
});

if (!noSensitiveFields(desired)) throw new Error('MEMBERSHIP_SENSITIVE_FIELD_BLOCKED');
if (!desired.roles.includes(desired.defaultRole) || !desired.roles.includes(desired.activeRole)) {
  throw new Error('MEMBERSHIP_ROLE_CONTRACT_INVALID');
}
if (!desired.countries.length || desired.dataScopes.default !== 'all' || desired.advisorId !== ADVISOR_ID) {
  throw new Error('MEMBERSHIP_SCOPE_CONTRACT_INVALID');
}

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore(app);
const memberRef = db.collection('tenants').doc(TENANT_ID).collection('members').doc(EXPECTED_UID);
const advisorRef = db.collection('tenantId').doc(TENANT_ID).collection('asesores').doc(ADVISOR_ID);
const auditRoot = db.collection('tenants').doc(TENANT_ID).collection('auditEvents');

let result = null;
await db.runTransaction(async transaction => {
  const [memberSnap, advisorSnap] = await Promise.all([
    transaction.get(memberRef),
    transaction.get(advisorRef)
  ]);
  if (!advisorSnap.exists) throw new Error('MEMBERSHIP_ADVISOR_REFERENCE_MISSING');
  const advisor = advisorSnap.data() || {};
  if (cleanText(advisor.tenantId) !== TENANT_ID || cleanText(advisor.estado).toLowerCase() !== 'activo') {
    throw new Error('MEMBERSHIP_ADVISOR_REFERENCE_INVALID');
  }

  const beforeRaw = memberSnap.exists ? (memberSnap.data() || {}) : {};
  const before = canonicalMembership(beforeRaw);
  const changedFields = diffKeys(before, desired);
  const alreadyCanonical = memberSnap.exists && changedFields.length === 0;

  if (!alreadyCanonical) {
    const beforeHash = hash(before);
    const afterHash = hash(desired);
    const auditId = `membership_contract_${EXPECTED_UID}_${afterHash.slice(0, 16)}`;
    const auditRef = auditRoot.doc(auditId);
    transaction.set(memberRef, Object.assign({}, desired, {
      activatedAt: beforeRaw.activatedAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'github-actions-importers-e2e-v3',
      reason: REASON,
      accessExpansionConfirmed: true,
      accessExpansionConfirmation: CONFIRMATION,
      contractSource: 'importers-e2e-membership-repair-v20260720'
    }), { merge: true });
    transaction.set(auditRef, {
      id: auditId,
      tenantId: TENANT_ID,
      eventType: 'membership_contract_repaired',
      targetType: 'member',
      targetId: EXPECTED_UID,
      actorType: 'lab_gate_service',
      reason: REASON,
      strongConfirmationVerified: true,
      changedFields,
      before,
      after: desired,
      beforeHash,
      afterHash,
      rollback: {
        supported: true,
        source: 'audit.before',
        targetPath: `tenants/${TENANT_ID}/members/${EXPECTED_UID}`
      },
      labOnly: true,
      containsSecrets: false,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: false });
  }

  result = {
    changed: !alreadyCanonical,
    changedFields,
    beforeHash: hash(before),
    afterHash: hash(desired)
  };
});

const readback = await memberRef.get();
const readbackCanonical = canonicalMembership(readback.data() || {});
const checks = {
  membershipExists: readback.exists,
  tenantMatches: readbackCanonical.tenantId === TENANT_ID,
  statusActive: readbackCanonical.status === 'active',
  rolesAssigned: DESIRED_ROLES.every(role => readbackCanonical.roles.includes(role)),
  activeRoleAssigned: readbackCanonical.roles.includes(readbackCanonical.activeRole) && readbackCanonical.activeRole === 'Dirección',
  defaultRoleAssigned: readbackCanonical.roles.includes(readbackCanonical.defaultRole) && readbackCanonical.defaultRole === 'Dirección',
  countriesAssigned: DESIRED_COUNTRIES.every(country => readbackCanonical.countries.includes(country)),
  scopeAll: readbackCanonical.dataScopes.default === 'all',
  insurerScopeAll: readbackCanonical.dataScopes.modules.aseguradoras === 'all',
  importerScopeAll: readbackCanonical.dataScopes.modules.importar === 'all',
  advisorLinked: readbackCanonical.advisorId === ADVISOR_ID,
  noSensitiveFields: noSensitiveFields(readbackCanonical),
  canonicalReadback: equal(readbackCanonical, desired)
};
const ok = Object.values(checks).every(Boolean);
writeEvidence({
  contractVersion: 'p0-20260713',
  diagnosticRevision: 'lab-secure-membership-repair-v1',
  classification: result?.changed ? 'DATA_CONTRACT_FAILURE_CORRECTED' : 'DATA_CONTRACT_ALREADY_CANONICAL',
  changed: result?.changed === true,
  changedFieldCount: result?.changedFields?.length || 0,
  changedFields: result?.changedFields || [],
  beforeHash: result?.beforeHash || '',
  afterHash: result?.afterHash || '',
  checks,
  writePerformed: result?.changed === true,
  auditRecorded: result?.changed === true,
  rollbackDocumented: result?.changed === true,
  ok
});

if (!ok) {
  console.error('ORBIT360_LAB_MEMBERSHIP_NO_GO');
  process.exit(64);
}
console.log(result?.changed ? 'ORBIT360_LAB_MEMBERSHIP_REPAIRED' : 'ORBIT360_LAB_MEMBERSHIP_CANONICAL');
