#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 'orbit360-block1-universe-differential-v25-readonly-v1';
export const GATE_ID = 'block1-client360-insurers-lab-v20260717';
export const CONTRACT_VERSION = '1.0.41';
export const BASELINE = Object.freeze({
  manifestDate: '2026-07-14',
  closureDate: '2026-07-24',
  batchTemplate: 'ays_clients_insurers_20260714',
  clientes: 414,
  aseguradoras: 26,
  asesores: 7,
  clientSourceRows: 440,
  clientRequiresValidationAtDryRun: 26,
  insurerGt: 13,
  insurerCo: 13,
  insurerOmittedAtDryRun: 3
});

const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const EVIDENCE = process.env.ORBIT360_V25_DIAGNOSTIC_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v25-block1-universe-differential-sanitized-v20260807.json';

const norm = value => String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
const text = value => String(value == null ? '' : value).trim();
const hash = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex').slice(0, 20);
const statusNorm = row => norm(row?.estado || row?.status).slice(0, 80);
const INACTIVE = new Set(['inactive','inactivo','inactiva','disabled','deshabilitado','deshabilitada','archived','archivado','archivada','historico','historica','baja','cancelado','cancelada','cerrado','cerrada']);
const VALIDATION = new Set(['requierevalidacion','requiresvalidation','pendientevalidacion','pendingvalidation']);
const ALLOWED_COUNTRIES = new Set(['GT','CO']);
const CLIENT_KEYS = ['identificacion','identificacionNormalizada','dpi','nit','rut','documento','numeroDocumento','cedula','cedulaJuridica','taxId'];
const INSURER_KEYS = ['nit','identificacionFiscal','taxId','codigoIntermediario','codigo'];

function iso(value) {
  try {
    if (!value) return '';
    if (typeof value?.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object' && Number.isFinite(value.seconds)) return new Date(value.seconds * 1000).toISOString();
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toISOString() : '';
  } catch { return ''; }
}
function firstIso(row, fields) {
  for (const f of fields) { const v = iso(row?.[f]); if (v) return v; }
  return '';
}
function strongKey(row, fields) {
  for (const field of fields) { const v = norm(row?.[field]); if (v) return `${field}:${v}`; }
  return '';
}
function baselineBatch(row) {
  return text(row?._migration?.batchTemplate || row?.migration?.batchTemplate || row?.batchTemplate) === BASELINE.batchTemplate;
}
function provenanceSignals(row) {
  const batch = text(row?._migration?.batchTemplate || row?.migration?.batchTemplate || row?.batchTemplate);
  const batchId = text(row?._migration?.batchId || row?.migration?.batchId || row?.importBatchId || row?.batchId);
  const source = text(row?._migration?.source || row?.migration?.source || row?.sourceType || row?.trazabilidad?.sourceType || row?.trazabilidad?.archivo);
  const createdAt = firstIso(row, ['createdAt','creadoEn','fechaCreacion','importedAt','importadoEn','_createdAt']);
  const updatedAt = firstIso(row, ['updatedAt','actualizadoEn','fechaActualizacion','modifiedAt','_updatedAt']);
  const auditReason = text(row?.auditReason || row?.motivoCambio || row?.changeReason || row?._audit?.reason || row?.auditoria?.motivo);
  const actor = text(row?.updatedBy || row?.actualizadoPor || row?._audit?.actor || row?.auditoria?.actor);
  const afterManifest = !!createdAt && createdAt.slice(0,10) > BASELINE.manifestDate;
  const afterClosureUpdate = !!updatedAt && updatedAt.slice(0,10) > BASELINE.closureDate;
  const distinctBatch = !!batch && batch !== BASELINE.batchTemplate;
  const hasObjectivePostBaseline = distinctBatch || afterManifest || (!!batchId && !baselineBatch(row));
  return {
    baselineBatch: baselineBatch(row),
    distinctBatch,
    hasBatchId: !!batchId,
    hasSourceMarker: !!source,
    createdAfterManifest: afterManifest,
    updatedAfterClosure: afterClosureUpdate,
    hasAuditReason: !!auditReason,
    hasAuditActor: !!actor,
    provenanceHash: hash([batch,batchId,source].join('|')),
    timestampBasisHash: hash([createdAt,updatedAt].join('|')),
    objectivePostBaseline: hasObjectivePostBaseline
  };
}
function exclusionReason(row, kind, duplicate) {
  const tenant = text(row?.tenantId || row?.tenant);
  const country = text(row?.pais || row?.country).toUpperCase();
  if (tenant && tenant !== TENANT) return 'out_of_effective_universe_tenant';
  if (country && !ALLOWED_COUNTRIES.has(country)) return 'out_of_effective_universe_country';
  if (row?.active === false || row?.activo === false) return 'historical_inactive_active_false';
  if (kind === 'aseguradoras' && row?.vinculada === false) return 'historical_inactive_vinculada_false';
  if (INACTIVE.has(statusNorm(row))) return 'historical_inactive_status';
  if (duplicate) return 'duplicate_strong_key';
  return '';
}
function requiresValidation(row) {
  if (row?.requiereValidacion === true || row?.requiresValidation === true) return true;
  if (VALIDATION.has(statusNorm(row))) return true;
  return !text(row?.pais || row?.country) || !text(row?.moneda || row?.currency);
}
function classifyRows(kind, rows) {
  const fields = kind === 'clientes' ? CLIENT_KEYS : INSURER_KEYS;
  const counts = new Map();
  for (const item of rows) {
    const key = strongKey(item.data, fields);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  const seen = new Set();
  return rows.slice().sort((a,b) => String(a.id).localeCompare(String(b.id))).map(item => {
    const key = strongKey(item.data, fields);
    const duplicate = !!key && (counts.get(key) || 0) > 1 && seen.has(key);
    if (key) seen.add(key);
    const reason = exclusionReason(item.data, kind, duplicate);
    return {
      id: item.id,
      data: item.data,
      fingerprint: hash(`${kind}:${item.id}`),
      baselineMember: baselineBatch(item.data),
      excluded: !!reason,
      exclusionReason: reason || null,
      requiresValidation: requiresValidation(item.data),
      provenance: provenanceSignals(item.data)
    };
  });
}
function sanitized(item, role) {
  return {
    fingerprint: item.fingerprint,
    role,
    baselineMember: item.baselineMember,
    excludedFromEffective: item.excluded,
    exclusionReason: item.exclusionReason,
    requiresValidation: item.requiresValidation,
    provenance: item.provenance,
    recommendedTreatment: item.excluded ? 'REVIEW_EXCLUSION_PROVENANCE_NO_WRITE' : item.baselineMember ? 'KEEP_BASELINE_NO_WRITE' : 'REVIEW_POST_BASELINE_PROVENANCE_NO_WRITE'
  };
}

export function diagnoseSnapshot({ clients, insurers, advisors }) {
  const c = classifyRows('clientes', clients);
  const i = classifyRows('aseguradoras', insurers);
  const clientBaseline = c.filter(x => x.baselineMember);
  const clientExtras = c.filter(x => !x.baselineMember);
  const insurerBaseline = i.filter(x => x.baselineMember);
  const insurerExtras = i.filter(x => !x.baselineMember);
  const insurerExcluded = i.filter(x => x.excluded);
  const clientEffective = c.filter(x => !x.excluded).length;
  const insurerEffective = i.filter(x => !x.excluded).length;

  let clientClassification = 'REQUIERE_VALIDACION';
  let clientBasis = 'BASELINE_MEMBERSHIP_NOT_PROVEN';
  if (clientBaseline.length === BASELINE.clientes && clientExtras.length === 16 && clientExtras.every(x => !x.excluded) && clientExtras.every(x => x.provenance.objectivePostBaseline)) {
    clientClassification = 'VALIDATOR_STALE';
    clientBasis = '414_BASELINE_ROWS_PRESERVED_PLUS_16_OBJECTIVE_POST_BASELINE_EFFECTIVE_ROWS';
  } else if (clientBaseline.length === BASELINE.clientes && clientExtras.some(x => x.excluded)) {
    clientClassification = 'DATA_CONTRACT_FAILURE';
    clientBasis = 'POST_BASELINE_CLIENT_ROWS_INCLUDE_OBJECTIVE_EXCLUSIONS';
  }

  const baselineInsurerExcluded = insurerBaseline.filter(x => x.excluded);
  let insurerClassification = 'REQUIERE_VALIDACION';
  let insurerBasis = 'INSURER_BASELINE_MEMBERSHIP_OR_STATE_TRANSITION_NOT_CONCLUSIVE';
  if (insurerBaseline.length === BASELINE.aseguradoras) {
    if (baselineInsurerExcluded.length === 0 && insurerEffective === BASELINE.aseguradoras) {
      insurerClassification = 'PASS_DATA_CONTRACT';
      insurerBasis = '26_BASELINE_INSURERS_REMAIN_EFFECTIVE_EXTRAS_OBJECTIVELY_EXCLUDED';
    } else if (baselineInsurerExcluded.length > 0 && baselineInsurerExcluded.every(x => x.provenance.updatedAfterClosure && x.provenance.hasAuditReason && x.provenance.hasAuditActor)) {
      insurerClassification = 'VALIDATOR_STALE';
      insurerBasis = 'BASELINE_INSURER_STATE_CHANGED_AFTER_CLOSURE_WITH_AUDIT_PROVENANCE';
    } else if (baselineInsurerExcluded.length > 0 && baselineInsurerExcluded.some(x => !x.provenance.updatedAfterClosure)) {
      insurerClassification = 'DATA_CONTRACT_FAILURE';
      insurerBasis = 'BASELINE_ACTIVE_INSURER_NOW_EXCLUDED_WITHOUT_POST_CLOSURE_TRANSITION_EVIDENCE';
    }
  }

  const overall = [clientClassification, insurerClassification].includes('DATA_CONTRACT_FAILURE') ? 'DATA_CONTRACT_FAILURE'
    : [clientClassification, insurerClassification].includes('REQUIERE_VALIDACION') ? 'REQUIERE_VALIDACION'
    : [clientClassification, insurerClassification].includes('VALIDATOR_STALE') ? 'VALIDATOR_STALE' : 'PASS_DATA_CONTRACT';

  const clientDifferential = clientBaseline.length === BASELINE.clientes ? clientExtras.map(x => sanitized(x, 'post_baseline_candidate')) : [];
  const insurerDiffMap = new Map();
  for (const x of [...insurerExtras, ...insurerExcluded]) insurerDiffMap.set(x.fingerprint, sanitized(x, x.baselineMember ? 'baseline_now_excluded' : x.excluded ? 'nonbaseline_excluded' : 'nonbaseline_effective'));

  return {
    schemaVersion: SCHEMA,
    gateId: GATE_ID,
    contractVersion: CONTRACT_VERSION,
    authorizationGeneration: 'v25-differential-universe-diagnosis',
    baseline: {
      manifestDate: BASELINE.manifestDate,
      closureDate: BASELINE.closureDate,
      batchTemplateHash: hash(BASELINE.batchTemplate),
      expected: { clientes: BASELINE.clientes, aseguradoras: BASELINE.aseguradoras, asesores: BASELINE.asesores },
      sourceManifest: { clientSourceRows: 440, clientWriteCandidates: 414, clientRequiresValidationAtDryRun: 26, insurerWriteCandidates: 26, insurerGt: 13, insurerCo: 13, insurerOmittedAtDryRun: 3 }
    },
    observed: {
      raw: { clientes: clients.length, aseguradoras: insurers.length, asesores: advisors.length },
      effective: { clientes: clientEffective, aseguradoras: insurerEffective, asesores: advisors.length },
      baselineTagged: { clientes: clientBaseline.length, aseguradoras: insurerBaseline.length },
      nonBaseline: { clientes: clientExtras.length, aseguradoras: insurerExtras.length },
      excluded: { clientes: c.filter(x => x.excluded).length, aseguradoras: insurerExcluded.length },
      baselineInsurersExcluded: baselineInsurerExcluded.length
    },
    domainDecision: {
      clientes: { classification: clientClassification, basis: clientBasis, demonstratedObjectiveCount: clientClassification === 'VALIDATOR_STALE' ? clientEffective : null },
      aseguradoras: { classification: insurerClassification, basis: insurerBasis, demonstratedObjectiveCount: insurerClassification === 'VALIDATOR_STALE' ? insurerEffective : null },
      asesores: { classification: advisors.length === BASELINE.asesores ? 'PASS_DATA_CONTRACT' : 'DATA_CONTRACT_FAILURE', basis: 'INVARIANCE_COUNT_ONLY_NO_REPROCESS' }
    },
    differential: {
      clientes: clientDifferential,
      aseguradoras: [...insurerDiffMap.values()]
    },
    decision: overall,
    nextTreatment: overall === 'VALIDATOR_STALE' ? 'AUTHORIZE_CONTRACT_UPDATE_ONLY_NO_DATA_WRITE' : overall === 'DATA_CONTRACT_FAILURE' ? 'AUTHORIZE_TARGETED_DATA_CONTRACT_REPAIR_PLAN_NO_WRITE' : overall === 'REQUIERE_VALIDACION' ? 'OBTAIN_OBJECTIVE_PROVENANCE_FOR_UNRESOLVED_DIFFERENTIAL_NO_WRITE' : 'UNIVERSE_RECONCILED',
    firestoreReads: 3,
    firestoreWrites: 0,
    authReads: 0,
    authWrites: 0,
    operationalWrites: 0,
    reimport: false,
    hostingTouched: false,
    browserExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsNames: false,
    containsEmails: false,
    containsDocuments: false,
    containsSecrets: false,
    ok: ['VALIDATOR_STALE','DATA_CONTRACT_FAILURE','REQUIERE_VALIDACION','PASS_DATA_CONTRACT'].includes(overall)
  };
}

function canonicalRef(db, name) { return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items'); }
function legacyRef(db, name) { return db.collection('tenantId').doc(TENANT).collection(name); }
async function readRows(ref) { const snap = await ref.get(); return snap.docs.map(doc => ({ id: doc.id, data: doc.data() || {} })); }

export async function runDiagnostic(db) {
  const [clients, insurers, advisors] = await Promise.all([
    readRows(canonicalRef(db, 'clientes')),
    readRows(canonicalRef(db, 'aseguradoras')),
    readRows(legacyRef(db, 'asesores'))
  ]);
  return diagnoseSnapshot({ clients, insurers, advisors });
}

async function main() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath) throw new Error('ENVIRONMENT_FAILURE_CREDENTIAL_PATH_MISSING');
  const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  if (serviceAccount.project_id !== PROJECT) throw new Error('ENVIRONMENT_FAILURE_PROJECT_MISMATCH');
  const { default: admin } = await import('firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: PROJECT });
  const output = await runDiagnostic(admin.firestore());
  fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)), { recursive: true });
  fs.writeFileSync(path.resolve(EVIDENCE), JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ decision: output.decision, observed: output.observed, domainDecision: output.domainDecision, differentialCounts: { clientes: output.differential.clientes.length, aseguradoras: output.differential.aseguradoras.length }, ok: output.ok }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const output = { schemaVersion: SCHEMA, gateId: GATE_ID, contractVersion: CONTRACT_VERSION, authorizationGeneration: 'v25-differential-universe-diagnosis', decision: 'STOP_RETRY', classification: /PROJECT_MISMATCH|CREDENTIAL/.test(String(error?.message || error)) ? 'ENVIRONMENT_FAILURE' : 'PIPELINE_MECHANISM_FAILURE', error: String(error?.message || error).replace(/[\w.+-]+@[\w.-]+/g, '[email]').slice(0,300), firestoreWrites: 0, authWrites: 0, operationalWrites: 0, hostingTouched: false, browserExecuted: false, productionTouched: false, containsPII: false, containsSecrets: false, ok: false };
    fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)), { recursive: true });
    fs.writeFileSync(path.resolve(EVIDENCE), JSON.stringify(output, null, 2) + '\n', 'utf8');
    console.error(JSON.stringify({ decision: output.decision, classification: output.classification, ok: false }));
    process.exit(42);
  });
}
