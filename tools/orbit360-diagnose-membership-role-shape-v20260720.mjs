#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const OUTPUT = process.env.ORBIT360_MEMBERSHIP_SHAPE_EVIDENCE ||
  'orbit360-platform/runtime-gate-crm-v20260716/membership-role-shape-sanitized.json';
const READS = 4;
const PAUSE_MS = 750;
const ROLE_FIELDS = [
  'roles', 'rolesAsignados', 'rolesDisponibles', 'assignedRoles',
  'role', 'rol', 'rolDefault', 'defaultRole', 'activeRole', 'rolActivo'
];
const CANONICAL_ROLES = new Set([
  'direccion', 'superadmin', 'admin_tenant', 'admintenant',
  'asesor', 'operativo', 'finanzas', 'marketing', 'comercial', 'asistente'
]);

const runtimeProject = String(process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '');
if (runtimeProject !== PROJECT_ID) throw new Error('BLOQUEO_PROYECTO_LAB_MEMBERSHIP_SHAPE');

function clean(value, max = 160) {
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
function sha(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function typeOf(value) {
  if (value == null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
function valuesOf(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' || typeof value === 'number') return [value];
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}
function summarizeField(value) {
  const normalizedValues = Array.from(new Set(valuesOf(value).map(normalize).filter(Boolean))).sort();
  const canonicalValues = normalizedValues.filter(item => CANONICAL_ROLES.has(item));
  const nonCanonicalValues = normalizedValues.filter(item => !CANONICAL_ROLES.has(item));
  return {
    present: value !== undefined,
    type: value === undefined ? 'missing' : typeOf(value),
    sourceCount: valuesOf(value).length,
    normalizedCount: normalizedValues.length,
    canonicalCount: canonicalValues.length,
    nonCanonicalCount: nonCanonicalValues.length,
    normalizedValues,
    canonicalValues,
    nonCanonicalValues,
    valueHash: sha(value === undefined ? '__missing__' : value)
  };
}
function roleSurface(row = {}) {
  const fields = {};
  for (const key of ROLE_FIELDS) fields[key] = summarizeField(row[key]);
  const activeRole = normalize(row.activeRole || row.rolActivo || row.defaultRole || row.rolDefault || '');
  const rolesOnly = fields.roles.normalizedValues;
  const allValues = Array.from(new Set(ROLE_FIELDS.flatMap(key => fields[key].normalizedValues))).sort();
  return {
    fields,
    activeRole,
    rolesOnly,
    allValues,
    rolesFieldIsArray: fields.roles.type === 'array',
    rolesFieldOnlyCanonical: fields.roles.type === 'array' && fields.roles.nonCanonicalCount === 0,
    activeRoleInRolesField: Boolean(activeRole && rolesOnly.includes(activeRole)),
    activeRoleInAnyRoleField: Boolean(activeRole && allValues.includes(activeRole)),
    roleSurfaceHash: sha({ fields, activeRole })
  };
}
function metadata(row = {}) {
  return {
    schemaVersion: clean(row.schemaVersion, 80),
    status: clean(row.status || row.estado, 40).toLowerCase(),
    tenantMatches: clean(row.tenantId || row.tenant, 120) === TENANT_ID,
    updatedBy: clean(row.updatedBy || row.actualizadoPor, 120),
    contractSource: clean(row.contractSource, 160),
    reasonPresent: Boolean(clean(row.reason || row.motivo, 300)),
    accessExpansionConfirmed: row.accessExpansionConfirmed === true,
    labOnly: row.labOnly === true,
    countriesCount: Array.isArray(row.countries || row.paises) ? (row.countries || row.paises).length : 0,
    defaultScope: clean(row.dataScopes?.default || row.scopes?.default || row.scopeDatos, 40)
  };
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore(app);
const memberRef = db.collection('tenants').doc(TENANT_ID).collection('members').doc(EXPECTED_UID);
const observations = [];

for (let index = 0; index < READS; index += 1) {
  const memberSnap = await memberRef.get();
  const member = memberSnap.exists ? (memberSnap.data() || {}) : {};
  const advisorId = clean(member.advisorId || member.asesorId, 160);
  const advisorSnap = advisorId
    ? await db.collection('tenantId').doc(TENANT_ID).collection('asesores').doc(advisorId).get()
    : null;
  const advisor = advisorSnap?.exists ? (advisorSnap.data() || {}) : {};
  observations.push({
    read: index + 1,
    memberExists: memberSnap.exists,
    memberUpdateTime: memberSnap.updateTime?.toDate?.().toISOString?.() || '',
    memberCreateTime: memberSnap.createTime?.toDate?.().toISOString?.() || '',
    memberMetadata: metadata(member),
    memberRoles: roleSurface(member),
    advisorLinked: Boolean(advisorId),
    advisorExists: Boolean(advisorSnap?.exists),
    advisorUpdateTime: advisorSnap?.updateTime?.toDate?.().toISOString?.() || '',
    advisorMetadata: metadata(advisor),
    advisorRoles: roleSurface(advisor)
  });
  if (index < READS - 1) await sleep(PAUSE_MS);
}

const memberHashes = Array.from(new Set(observations.map(item => item.memberRoles.roleSurfaceHash)));
const advisorHashes = Array.from(new Set(observations.map(item => item.advisorRoles.roleSurfaceHash)));
const memberUpdateTimes = Array.from(new Set(observations.map(item => item.memberUpdateTime)));
const advisorUpdateTimes = Array.from(new Set(observations.map(item => item.advisorUpdateTime)));
const last = observations[observations.length - 1];
const checks = {
  memberExists: last.memberExists,
  rolesFieldIsArray: last.memberRoles.rolesFieldIsArray,
  rolesFieldOnlyCanonical: last.memberRoles.rolesFieldOnlyCanonical,
  activeRoleInRolesField: last.memberRoles.activeRoleInRolesField,
  activeRoleInAnyRoleField: last.memberRoles.activeRoleInAnyRoleField,
  memberRoleSurfaceStable: memberHashes.length === 1 && memberUpdateTimes.length === 1,
  advisorRoleSurfaceStable: advisorHashes.length === 1 && advisorUpdateTimes.length === 1,
  memberMetadataClaimsRepair: Boolean(last.memberMetadata.contractSource || last.memberMetadata.updatedBy),
  noWritePerformed: true
};

let classification = 'MEMBERSHIP_ROLE_SHAPE_CANONICAL';
if (!checks.memberRoleSurfaceStable || !checks.advisorRoleSurfaceStable) {
  classification = 'PIPELINE_MECHANISM_FAILURE_CONCURRENT_MEMBERSHIP_WRITER';
} else if (!checks.rolesFieldIsArray) {
  classification = 'DATA_CONTRACT_FAILURE_ROLES_FIELD_TYPE';
} else if (!checks.rolesFieldOnlyCanonical || !checks.activeRoleInRolesField) {
  classification = 'VALIDATOR_STALE_MEMBERSHIP_CANONICALIZER_FALSE_PASS';
} else if (last.advisorRoles.fields.roles.nonCanonicalCount > 0) {
  classification = 'DATA_CONTRACT_WARNING_ADVISOR_ROLE_INDEX_CONTAMINATION';
}

const report = {
  schemaVersion: 'orbit360-membership-role-shape-evidence-v1',
  diagnosticRevision: 'strict-role-field-shape-and-stability-v1',
  projectId: PROJECT_ID,
  tenantId: TENANT_ID,
  mode: 'read_only',
  containsPII: false,
  containsSecrets: false,
  readCount: observations.length,
  pauseMs: PAUSE_MS,
  classification,
  checks,
  observations,
  ok: classification === 'MEMBERSHIP_ROLE_SHAPE_CANONICAL' || classification === 'DATA_CONTRACT_WARNING_ADVISOR_ROLE_INDEX_CONTAMINATION'
};

fs.mkdirSync(new URL('../orbit360-platform/runtime-gate-crm-v20260716/', import.meta.url), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`ORBIT360_MEMBERSHIP_ROLE_SHAPE:${classification}`);
