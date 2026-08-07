#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const EXPECTED = Object.freeze({ clientes: 414, aseguradoras: 26, asesores: 7 });
export const SCHEMA = 'orbit360-block1-universe-adjudication-v23-readonly-v1';
const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_TENANT_ID || 'alianzas-soluciones';
const EVIDENCE = process.env.ORBIT360_UNIVERSE_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v23-block1-universe-adjudication-sanitized-v20260807.json';

const norm = value => String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
const text = value => String(value == null ? '' : value).trim();
const fp = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex').slice(0, 20);
const cleanStatus = value => norm(value).slice(0, 80);

const CLIENT_ID_FIELDS = ['identificacion','identificacionNormalizada','dpi','nit','rut','documento','numeroDocumento','cedula','cedulaJuridica','taxId'];
const INSURER_ID_FIELDS = ['nit','identificacionFiscal','taxId','codigoIntermediario','codigo'];
const ADVISOR_ID_FIELDS = ['codigo','codigoAsesor','employeeId','identificacion','documento'];
const INACTIVE = new Set(['inactive','inactivo','inactiva','disabled','deshabilitado','deshabilitada','archived','archivado','archivada','historico','historica','baja','cancelado','cancelada','cerrado','cerrada']);
const VALIDATION = new Set(['requierevalidacion','requiresvalidation','pendientevalidacion','pendingvalidation']);
const ALLOWED_COUNTRIES = new Set(['GT','CO']);

export function strongKey(row, fields) {
  for (const field of fields) {
    const v = norm(row && row[field]);
    if (v) return field + ':' + v;
  }
  return '';
}
function explicitInactive(row, kind) {
  if (!row || typeof row !== 'object') return false;
  if (row.active === false || row.activo === false) return true;
  if (kind === 'aseguradoras' && row.vinculada === false) return true;
  return INACTIVE.has(cleanStatus(row.estado || row.status));
}
function requiresValidation(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.requiereValidacion === true || row.requiresValidation === true) return true;
  const state = cleanStatus(row.estado || row.status);
  if (VALIDATION.has(state)) return true;
  const country = text(row.pais || row.country).toUpperCase();
  const currency = text(row.moneda || row.currency).toUpperCase();
  return !country || !currency;
}
function explicitOutOfUniverse(row) {
  if (!row || typeof row !== 'object') return false;
  const rowTenant = text(row.tenantId || row.tenant);
  if (rowTenant && rowTenant !== TENANT) return true;
  const country = text(row.pais || row.country).toUpperCase();
  return !!country && !ALLOWED_COUNTRIES.has(country);
}

export function adjudicateRows(kind, rows, expected) {
  const fields = kind === 'clientes' ? CLIENT_ID_FIELDS : kind === 'aseguradoras' ? INSURER_ID_FIELDS : ADVISOR_ID_FIELDS;
  const strongCounts = new Map();
  for (const item of rows) {
    const key = strongKey(item.data, fields);
    if (key) strongCounts.set(key, (strongCounts.get(key) || 0) + 1);
  }
  const classifications = [];
  const seenStrong = new Set();
  let duplicate = 0, inactive = 0, outOfUniverse = 0, validation = 0;
  const orderedRows = rows.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (const item of orderedRows) {
    const key = strongKey(item.data, fields);
    const isDuplicate = !!key && (strongCounts.get(key) || 0) > 1 && seenStrong.has(key);
    if (key) seenStrong.add(key);
    const isInactive = explicitInactive(item.data, kind);
    const isOut = explicitOutOfUniverse(item.data);
    const isValidation = requiresValidation(item.data);
    let category = 'effective';
    let excluded = false;
    if (isOut) { category = 'out_of_effective_universe'; excluded = true; outOfUniverse += 1; }
    else if (isInactive) { category = 'historical_inactive'; excluded = true; inactive += 1; }
    else if (isDuplicate) { category = 'duplicate'; excluded = true; duplicate += 1; }
    else if (isValidation) { category = 'requires_validation'; validation += 1; }
    classifications.push({ fingerprint: fp(kind + ':' + item.id), category, excludedFromEffective: excluded });
  }
  const raw = rows.length;
  const effective = classifications.filter(x => !x.excludedFromEffective).length;
  const deltaRaw = raw - expected;
  const deltaEffective = effective - expected;
  let status = 'PASS_RECONCILED';
  let classification = 'PASS_DATA_CONTRACT';
  let contractDrift = 0;
  if (effective !== expected) {
    contractDrift = deltaEffective;
    if (effective > expected && duplicate === 0 && inactive === 0 && outOfUniverse === 0) {
      status = 'STOP_CONTRACT_COUNT_STALE';
      classification = 'VALIDATOR_STALE';
    } else {
      status = 'STOP_UNIVERSE_NOT_RECONCILED';
      classification = 'DATA_CONTRACT_FAILURE';
    }
  }
  return {
    kind, expected, raw, effective, deltaRaw, deltaEffective,
    categories: { duplicate, historicalInactive: inactive, outOfEffectiveUniverse: outOfUniverse, requiresValidation: validation, contractDrift },
    status, classification,
    items: classifications
  };
}

function canonicalRef(db, name) { return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items'); }
function legacyRef(db, name) { return db.collection('tenantId').doc(TENANT).collection(name); }
async function readRows(ref) {
  const snap = await ref.get();
  return snap.docs.map(doc => ({ id: doc.id, data: doc.data() || {} }));
}

export async function runAdjudication(db) {
  const [clients, insurers, advisors] = await Promise.all([
    readRows(canonicalRef(db, 'clientes')),
    readRows(canonicalRef(db, 'aseguradoras')),
    readRows(legacyRef(db, 'asesores'))
  ]);
  const domains = [
    adjudicateRows('clientes', clients, EXPECTED.clientes),
    adjudicateRows('aseguradoras', insurers, EXPECTED.aseguradoras),
    adjudicateRows('asesores', advisors, EXPECTED.asesores)
  ];
  const failed = domains.filter(x => x.effective !== x.expected);
  const classification = failed.some(x => x.classification === 'DATA_CONTRACT_FAILURE') ? 'DATA_CONTRACT_FAILURE'
    : failed.some(x => x.classification === 'VALIDATOR_STALE') ? 'VALIDATOR_STALE' : 'PASS_DATA_CONTRACT';
  const status = failed.length ? 'STOP_RETRY_BLOCK1_UNIVERSE_ADJUDICATION' : 'PASS_BLOCK1_UNIVERSE_ADJUDICATION';
  return {
    schemaVersion: SCHEMA,
    gateScope: 'BLOCK1_CLIENT360_INSURERS',
    projectIdHash: fp(PROJECT),
    tenantIdHash: fp(TENANT),
    expected: EXPECTED,
    observedRaw: Object.fromEntries(domains.map(x => [x.kind, x.raw])),
    observedEffective: Object.fromEntries(domains.map(x => [x.kind, x.effective])),
    domains,
    status,
    classification,
    goForHosting: failed.length === 0,
    firestoreReads: 3,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    reimport: false,
    hostingTouched: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsNames: false,
    containsEmails: false,
    containsSecrets: false,
    ok: failed.length === 0
  };
}

async function main() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath) throw new Error('ENVIRONMENT_FAILURE_CREDENTIAL_PATH_MISSING');
  const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  if (serviceAccount.project_id !== PROJECT) throw new Error('ENVIRONMENT_FAILURE_PROJECT_MISMATCH');
  const { default: admin } = await import('firebase-admin');
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: PROJECT });
  const output = await runAdjudication(admin.firestore());
  fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)), { recursive: true });
  fs.writeFileSync(path.resolve(EVIDENCE), JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ status: output.status, classification: output.classification, observedRaw: output.observedRaw, observedEffective: output.observedEffective, ok: output.ok }));
  process.exit(output.ok ? 0 : 42);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const output = {
      schemaVersion: SCHEMA,
      gateScope: 'BLOCK1_CLIENT360_INSURERS',
      status: 'STOP_RETRY_BLOCK1_UNIVERSE_ADJUDICATION',
      classification: /PROJECT_MISMATCH|CREDENTIAL/.test(String(error && error.message || error)) ? 'ENVIRONMENT_FAILURE' : 'PIPELINE_MECHANISM_FAILURE',
      error: String(error && error.message || error).replace(/[\w.+-]+@[\w.-]+/g, '[email]').slice(0, 300),
      goForHosting: false,
      firestoreWrites: 0,
      authWrites: 0,
      operationalWrites: 0,
      reimport: false,
      hostingTouched: false,
      deployExecuted: false,
      productionTouched: false,
      containsPII: false,
      containsNames: false,
      containsEmails: false,
      containsSecrets: false,
      ok: false
    };
    fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)), { recursive: true });
    fs.writeFileSync(path.resolve(EVIDENCE), JSON.stringify(output, null, 2) + '\n', 'utf8');
    console.error(JSON.stringify({ status: output.status, classification: output.classification, error: output.error, ok: false }));
    process.exit(42);
  });
}
