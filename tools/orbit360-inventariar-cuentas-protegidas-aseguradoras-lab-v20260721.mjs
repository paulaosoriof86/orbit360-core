#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
const EXPECTED_PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const SECRET = `projects/${EXPECTED_PROJECT_ID}/secrets/${process.env.ORBIT360_CREDENTIAL_SECRET_ID || 'orbit360-insurer-credentials-alianzas-soluciones'}/versions/latest`;
const FREEZE_PATH = path.resolve('tools/orbit360-incident-freeze-v20260721.json');
const OUT_FILE = path.resolve('orbit360-platform/runtime-incident-importer-20260721/post-recovery-inventory-sanitized.json');
const REF_RE = /^acct_[a-f0-9]{32}$/;
const EXPECTED_NEW_PENDING = Object.freeze([
  'gt-gt-seguros|account_gtseguros_01',
  'gt-gt-seguros|account_gtseguros_02'
]);
const EXPECTED = Object.freeze({
  clients: 414,
  insurers: 26,
  advisors: 7,
  gtInsurers: 13,
  coInsurers: 13,
  totalCuentaResources: 107,
  protectedBankRows: 93,
  validReferences: 91,
  pendingReferences: 2,
  uniqueValidReferences: 91,
  vaultRows: 91,
  vaultValues: 91,
  rawProtectedValues: 0,
  invalidReferences: 0,
  duplicateReferences: 0,
  colombiaPendingReferences: 0
});

const clean = (value, max = 240) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const idOf = (row, index) => clean(row && (row.id || row.accountId || row.resourceId || String(index)), 180);
const refOf = (row) => clean(row && (row.accountRef || row.secureAccountRef || row.cuentaRef), 100);
const countryOf = (data) => clean(data && (data.pais || data.country), 12).toUpperCase() || 'OTHER';
const fail = (code, detail = '') => { const error = new Error(code); error.code = code; error.detail = detail; throw error; };
const sanitizeError = (error) => clean(error && (error.code || error.message) || error || 'UNKNOWN', 120).replace(/[^A-Za-z0-9_.:-]/g, '_');

function initAdmin() {
  if (PROJECT_ID !== EXPECTED_PROJECT_ID) fail('PROJECT_MISMATCH', PROJECT_ID || 'missing');
  if (getApps().length) return getApps()[0];
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile || !fs.existsSync(keyFile)) fail('SERVICE_ACCOUNT_FILE_REQUIRED');
  const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  if (serviceAccount.project_id !== EXPECTED_PROJECT_ID) fail('SERVICE_ACCOUNT_PROJECT_MISMATCH');
  return initializeApp({ credential: cert(serviceAccount), projectId: EXPECTED_PROJECT_ID });
}

function readFreeze() {
  if (!fs.existsSync(FREEZE_PATH)) fail('INCIDENT_FREEZE_REQUIRED');
  const freeze = JSON.parse(fs.readFileSync(FREEZE_PATH, 'utf8'));
  const valid = freeze.status === 'POST_RECOVERY_INVENTORY_READONLY_AUTHORIZED' &&
    freeze.recoveryResult && freeze.recoveryResult.status === 'COMPLETED_AND_READBACK_CONFIRMED' &&
    freeze.recoveryResult.transactionCommitted === true &&
    freeze.recoveryResult.readAfterWriteConfirmed === true &&
    freeze.applied && Number(freeze.applied.colombiaDocumentChanges) === 0 &&
    freeze.writeAuthorization && freeze.writeAuthorization.active === false &&
    freeze.writeAuthorization.secondExecutionAllowed === false;
  if (!valid) fail('RECOVERY_EVIDENCE_NOT_BOUND');
  return freeze;
}

async function readVault() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({ name: SECRET });
  const text = version && version.payload && version.payload.data ? Buffer.from(version.payload.data).toString('utf8') : '';
  if (!text) fail('VAULT_EMPTY');
  const vault = JSON.parse(text);
  if (vault.schemaVersion !== 'orbit360-insurer-credentials-v1' || vault.tenantId !== TENANT_ID) fail('VAULT_CONTRACT_MISMATCH');
  const rows = Object.entries(vault.bankAccounts || {}).map(([ref, row]) => ({
    ref: clean(ref, 100),
    valuePresent: Boolean(clean(row && row.accountNumber, 320))
  }));
  return {
    rows: rows.length,
    valuesPresent: rows.filter((row) => row.valuePresent).length,
    validReferenceKeys: rows.filter((row) => REF_RE.test(row.ref)).length
  };
}

async function inventory() {
  const freeze = readFreeze();
  const db = getFirestore(initAdmin());
  const tenant = db.collection('tenantId').doc(TENANT_ID);
  const [clients, insurers, advisors, vault] = await Promise.all([
    tenant.collection('clientes').get(),
    tenant.collection('aseguradoras').get(),
    tenant.collection('asesores').get(),
    readVault()
  ]);

  const references = new Set();
  const pendingKeys = [];
  const country = {
    GT: { insurers: 0, protectedBankRows: 0, validReferences: 0, pendingReferences: 0, rawProtectedValues: 0 },
    CO: { insurers: 0, protectedBankRows: 0, validReferences: 0, pendingReferences: 0, rawProtectedValues: 0 },
    OTHER: { insurers: 0, protectedBankRows: 0, validReferences: 0, pendingReferences: 0, rawProtectedValues: 0 }
  };
  let totalCuentaResources = 0;
  let protectedBankRows = 0;
  let validReferences = 0;
  let pendingReferences = 0;
  let rawProtectedValues = 0;
  let invalidReferences = 0;
  let duplicateReferences = 0;

  insurers.docs.forEach((doc) => {
    const data = doc.data() || {};
    const countryId = countryOf(data);
    const bucket = country[countryId] || country.OTHER;
    bucket.insurers += 1;
    [].concat(data.cuentas || []).forEach((row, index) => {
      totalCuentaResources += 1;
      const id = idOf(row, index);
      const ref = refOf(row);
      const raw = clean(row && (row.numero || row.accountNumber), 320);
      const valid = REF_RE.test(ref);
      const pending = ref === 'backend_required';
      const protectedRow = valid || pending || Boolean(raw);
      if (!protectedRow) return;
      protectedBankRows += 1;
      bucket.protectedBankRows += 1;
      if (raw) {
        rawProtectedValues += 1;
        bucket.rawProtectedValues += 1;
      }
      if (valid) {
        validReferences += 1;
        bucket.validReferences += 1;
        if (references.has(ref)) duplicateReferences += 1;
        references.add(ref);
      } else if (pending) {
        pendingReferences += 1;
        bucket.pendingReferences += 1;
        pendingKeys.push(`${doc.id}|${id}`);
      } else if (ref) {
        invalidReferences += 1;
      }
    });
  });

  return {
    recoveryRunId: freeze.recoveryResult.runId,
    counts: { clients: clients.size, insurers: insurers.size, advisors: advisors.size },
    inventory: {
      totalCuentaResources,
      protectedBankRows,
      validReferences,
      pendingReferences,
      uniqueValidReferences: references.size,
      invalidReferences,
      duplicateReferences,
      rawProtectedValues,
      pendingKeys: pendingKeys.sort(),
      country,
      vault
    }
  };
}

const report = {
  schemaVersion: 'orbit360-post-recovery-protected-bank-inventory-v2',
  generatedAt: new Date().toISOString(),
  projectId: EXPECTED_PROJECT_ID,
  tenantId: TENANT_ID,
  mode: 'read_only_post_recovery_inventory',
  writesExecuted: false,
  firestoreWritesExecuted: false,
  secretManagerWritesExecuted: false,
  deployExecuted: false,
  migrationExecuted: false,
  containsPII: false,
  containsSecrets: false,
  expected: EXPECTED,
  checks: {},
  ok: false
};

try {
  const result = await inventory();
  report.recoveryRunId = result.recoveryRunId;
  report.counts = result.counts;
  report.inventory = result.inventory;
  const actualPending = result.inventory.pendingKeys;
  report.checks = {
    clientsExact: result.counts.clients === EXPECTED.clients,
    insurersExact: result.counts.insurers === EXPECTED.insurers,
    advisorsExact: result.counts.advisors === EXPECTED.advisors,
    gtInsurersExact: result.inventory.country.GT.insurers === EXPECTED.gtInsurers,
    coInsurersExact: result.inventory.country.CO.insurers === EXPECTED.coInsurers,
    totalResourcesExact: result.inventory.totalCuentaResources === EXPECTED.totalCuentaResources,
    protectedBankRowsExact: result.inventory.protectedBankRows === EXPECTED.protectedBankRows,
    validReferencesExact: result.inventory.validReferences === EXPECTED.validReferences,
    pendingReferencesExact: result.inventory.pendingReferences === EXPECTED.pendingReferences,
    uniqueValidReferencesExact: result.inventory.uniqueValidReferences === EXPECTED.uniqueValidReferences,
    invalidReferencesZero: result.inventory.invalidReferences === EXPECTED.invalidReferences,
    duplicateReferencesZero: result.inventory.duplicateReferences === EXPECTED.duplicateReferences,
    rawProtectedValuesZero: result.inventory.rawProtectedValues === EXPECTED.rawProtectedValues,
    newPendingRowsExact: JSON.stringify(actualPending) === JSON.stringify(EXPECTED_NEW_PENDING),
    colombiaPendingZero: result.inventory.country.CO.pendingReferences === EXPECTED.colombiaPendingReferences,
    colombiaRawValuesZero: result.inventory.country.CO.rawProtectedValues === 0,
    vaultRowsExact: result.inventory.vault.rows === EXPECTED.vaultRows,
    vaultValuesExact: result.inventory.vault.valuesPresent === EXPECTED.vaultValues,
    vaultReferenceKeysExact: result.inventory.vault.validReferenceKeys === EXPECTED.vaultRows,
    recoveryEvidenceBound: result.recoveryRunId === 29867382206,
    writesExecuted: report.writesExecuted === false,
    firestoreWritesExecuted: report.firestoreWritesExecuted === false,
    secretManagerWritesExecuted: report.secretManagerWritesExecuted === false,
    deployExecuted: report.deployExecuted === false,
    containsPII: report.containsPII === false,
    containsSecrets: report.containsSecrets === false
  };
  report.ok = Object.values(report.checks).every(Boolean);
  report.classification = report.ok ? null : 'DATA_CONTRACT_FAILURE';
  report.failedCheckIds = Object.entries(report.checks).filter(([, value]) => value !== true).map(([id]) => id);
  report.nextAllowedAction = report.ok ? 'UNIQUE_FINAL_BLOCK1_GATE_READ_ONLY' : 'STOP_THE_LINE';
} catch (error) {
  report.ok = false;
  report.classification = String(error && error.code || '').includes('PROJECT') || String(error && error.code || '').includes('SERVICE_ACCOUNT') ? 'ENVIRONMENT_FAILURE' : 'DATA_CONTRACT_FAILURE';
  report.errorCode = sanitizeError(error);
  report.failedCheckIds = ['inventory'];
  report.nextAllowedAction = 'STOP_THE_LINE';
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: report.ok,
  mode: report.mode,
  recoveryRunId: report.recoveryRunId || 0,
  counts: report.counts || {},
  inventory: report.inventory || {},
  failedCheckIds: report.failedCheckIds || [],
  writesExecuted: false,
  secretManagerWritesExecuted: false,
  deployExecuted: false,
  containsPII: false,
  containsSecrets: false,
  evidencePath: 'orbit360-platform/runtime-incident-importer-20260721/post-recovery-inventory-sanitized.json'
}, null, 2));
process.exit(report.ok ? 0 : 41);
