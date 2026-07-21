#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const PROJECT = 'ays-orbit-360-lab';
const TENANT = 'alianzas-soluciones';
const SECRET = `projects/${PROJECT}/secrets/${process.env.ORBIT360_CREDENTIAL_SECRET_ID || 'orbit360-insurer-credentials-alianzas-soluciones'}/versions/latest`;
const MANIFEST_REL = 'tools/orbit360-bank-reference-recovery-map-v20260721.json';
const DRYRUN_EVIDENCE_REL = 'orbit360-platform/docs/evidence/dryrun-29865964420-reclassified-sanitized.json';
const OUT_DIR = path.resolve('orbit360-platform/runtime-incident-importer-20260721');
const OUT_REL = 'orbit360-platform/runtime-incident-importer-20260721/bank-reference-recovery-atomic-write-sanitized.json';
const OUT = path.resolve(OUT_REL);
const REF_RE = /^acct_[a-f0-9]{32}$/;
const EXECUTION = { transactionCommitted: false, rollbackExecuted: false, rollbackVerified: false };
const EXPECTED = Object.freeze({
  clients: 414,
  insurers: 26,
  advisors: 7,
  totalResources: 107,
  protectedRows: 93,
  validBefore: 23,
  pendingBefore: 70,
  vaultRows: 91,
  restores: 68,
  newPending: 2,
  affectedGtDocuments: 13,
  validAfter: 91,
  pendingAfter: 2
});

const clean = (value, max = 240) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const hash = (value, size = 16) => crypto.createHash('sha256').update(String(value == null ? '' : value)).digest('hex').slice(0, size);
const clone = (value) => JSON.parse(JSON.stringify(value));
const stable = (value) => Array.isArray(value)
  ? `[${value.map(stable).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const digest = (value) => crypto.createHash('sha256').update(stable(value)).digest('hex');
const refOf = (row) => clean(row && (row.accountRef || row.secureAccountRef || row.cuentaRef), 100);
const idOf = (row, index) => clean(row && (row.id || row.accountId || row.resourceId || String(index)), 180);
const fail = (code, detail = '') => { const error = new Error(code); error.code = code; error.detail = detail; throw error; };

function init() {
  const project = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
  if (project !== PROJECT) fail('PROJECT_MISMATCH', project);
  if (getApps().length) return getApps()[0];
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile || !fs.existsSync(keyFile)) fail('SERVICE_ACCOUNT_FILE_REQUIRED');
  const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  if (serviceAccount.project_id !== PROJECT) fail('SERVICE_ACCOUNT_PROJECT_MISMATCH', serviceAccount.project_id);
  return initializeApp({ credential: cert(serviceAccount), projectId: PROJECT });
}

function readContracts() {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(MANIFEST_REL), 'utf8'));
  const evidence = JSON.parse(fs.readFileSync(path.resolve(DRYRUN_EVIDENCE_REL), 'utf8'));
  if (manifest.schemaVersion !== 'orbit360-bank-reference-recovery-map-v3-sanitized') fail('MANIFEST_SCHEMA_MISMATCH');
  if (manifest.mode !== 'STATIC_CONFIRMED_NO_WRITE' || manifest.evidenceClassification !== 'CONFIRMED') fail('MANIFEST_NOT_CONFIRMED');
  if (!manifest.safety || manifest.safety.containsPII !== false || manifest.safety.containsSecrets !== false || manifest.safety.containsRawBankValues !== false || manifest.safety.colombiaTouched !== false) fail('MANIFEST_SAFETY_MISMATCH');
  if (manifest.safety.createsRows !== false || manifest.safety.deletesRows !== false || manifest.safety.reordersRows !== false) fail('MANIFEST_ROW_MUTATION_MISMATCH');
  if (!Array.isArray(manifest.recoveryMappings) || manifest.recoveryMappings.length !== EXPECTED.restores) fail('MANIFEST_RESTORE_COUNT_MISMATCH');
  if (!Array.isArray(manifest.newPendingRows) || manifest.newPendingRows.length !== EXPECTED.newPending) fail('MANIFEST_NEW_PENDING_COUNT_MISMATCH');
  if (!Array.isArray(manifest.duplicateIncomingRows) || manifest.duplicateIncomingRows.length !== 0) fail('MANIFEST_DUPLICATE_COUNT_MISMATCH');
  if (!evidence.ok || evidence.acceptance !== 'DRYRUN_FUNCTIONALLY_GREEN_FROM_PRESERVED_EVIDENCE' || evidence.sourceRunId !== 29865964420 || evidence.failedCheckIds.length !== 0) fail('GREEN_DRYRUN_EVIDENCE_REQUIRED');
  const c = evidence.correctedContract || {};
  if (c.protectedBankRowsBefore !== EXPECTED.protectedRows || c.historicalReferenceRestorations !== EXPECTED.restores || c.newPendingRowsPreserved !== EXPECTED.newPending || c.duplicateRemovals !== 0 || c.protectedBankRowsAfter !== EXPECTED.protectedRows || c.validReferencesAfter !== EXPECTED.validAfter || c.pendingReferencesAfter !== EXPECTED.pendingAfter) fail('GREEN_DRYRUN_CONTRACT_MISMATCH');
  return { manifest, evidence };
}

async function readVault() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({ name: SECRET });
  const text = version?.payload?.data ? Buffer.from(version.payload.data).toString('utf8') : '';
  if (!text) fail('VAULT_EMPTY');
  const vault = JSON.parse(text);
  if (vault.schemaVersion !== 'orbit360-insurer-credentials-v1' || vault.tenantId !== TENANT) fail('VAULT_CONTRACT_MISMATCH');
  const rows = Object.entries(vault.bankAccounts || {}).map(([ref, row]) => ({
    ref: clean(ref, 100),
    insurerId: clean(row && row.insurerId, 180),
    legacyAccountId: clean(row && row.accountId, 180),
    valuePresent: Boolean(clean(row && row.accountNumber, 320))
  }));
  return { rows, updatedAtHash: hash(vault.updatedAt || '', 16) };
}

function summarizeDocuments(snapshot) {
  const docs = new Map();
  const countryHashes = { GT: [], CO: [], OTHER: [] };
  const validRefs = [];
  let totalResources = 0;
  let pending = 0;
  let rawProtectedValues = 0;
  snapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data() || {};
    const country = clean(data.pais || data.country, 12).toUpperCase() || 'OTHER';
    const accounts = [].concat(data.cuentas || []).map((row, index) => {
      const ref = refOf(row);
      totalResources += 1;
      if (REF_RE.test(ref)) validRefs.push(ref);
      if (ref === 'backend_required') pending += 1;
      if (clean(row && (row.numero || row.accountNumber), 320)) rawProtectedValues += 1;
      return { index, id: idOf(row, index), ref, original: clone(row) };
    });
    docs.set(docSnapshot.id, { id: docSnapshot.id, ref: docSnapshot.ref, country, data: clone(data), accounts });
    const bucket = country === 'GT' || country === 'CO' ? country : 'OTHER';
    countryHashes[bucket].push([docSnapshot.id, digest(data)]);
  });
  Object.values(countryHashes).forEach(rows => rows.sort((a,b) => a[0].localeCompare(b[0])));
  return { docs, countryHashes, totalResources, validRefs, pending, rawProtectedValues };
}

function buildPlan(state, vaultRows, manifest) {
  const vaultByLegacy = new Map();
  const vaultRefs = new Set();
  for (const row of vaultRows) {
    const key = `${row.insurerId}|${row.legacyAccountId}`;
    if (vaultByLegacy.has(key)) fail('VAULT_LEGACY_ID_DUPLICATE', hash(key));
    if (!REF_RE.test(row.ref) || !row.valuePresent) fail('VAULT_ROW_INVALID', hash(key));
    vaultByLegacy.set(key, row);
    if (vaultRefs.has(row.ref)) fail('VAULT_REFERENCE_DUPLICATE', hash(row.ref));
    vaultRefs.add(row.ref);
  }

  const affected = new Map();
  const consumedPending = new Set();
  const consumedLegacy = new Set();
  const restoredRefs = new Set();

  for (const row of manifest.recoveryMappings) {
    const [insurerId, currentAccountId, legacyAccountId, , , currentIdHash, legacyIdHash, expectedRefHash] = row;
    const doc = state.docs.get(insurerId);
    if (!doc) fail('RECOVERY_INSURER_NOT_FOUND', hash(insurerId));
    if (doc.country !== 'GT') fail('RECOVERY_OUTSIDE_GT', hash(insurerId));
    const matches = doc.accounts.filter(account => account.id === currentAccountId);
    if (matches.length !== 1) fail('CURRENT_ACCOUNT_ID_NOT_UNIQUE', hash(`${insurerId}|${currentAccountId}`));
    const account = matches[0];
    if (account.ref !== 'backend_required') fail('CURRENT_ACCOUNT_NOT_PENDING', hash(`${insurerId}|${currentAccountId}`));
    if (hash(currentAccountId, 12) !== currentIdHash || hash(legacyAccountId, 12) !== legacyIdHash) fail('RECOVERY_ID_HASH_MISMATCH', hash(currentAccountId));
    const vaultRow = vaultByLegacy.get(`${insurerId}|${legacyAccountId}`);
    if (!vaultRow || hash(vaultRow.ref, 12) !== expectedRefHash) fail('VAULT_REFERENCE_HASH_MISMATCH', hash(`${insurerId}|${legacyAccountId}`));
    const currentKey = `${insurerId}|${currentAccountId}`;
    const legacyKey = `${insurerId}|${legacyAccountId}`;
    if (consumedPending.has(currentKey) || consumedLegacy.has(legacyKey) || restoredRefs.has(vaultRow.ref)) fail('RECOVERY_MAPPING_DUPLICATE', hash(currentKey));
    consumedPending.add(currentKey);
    consumedLegacy.add(legacyKey);
    restoredRefs.add(vaultRow.ref);
    if (!affected.has(insurerId)) affected.set(insurerId, { before: clone(doc.data.cuentas || []), after: clone(doc.data.cuentas || []), restores: 0 });
    const plan = affected.get(insurerId);
    const before = clone(plan.after[account.index]);
    const after = clone(before);
    after.accountRef = vaultRow.ref;
    delete after.secureAccountRef;
    delete after.cuentaRef;
    plan.after[account.index] = after;
    plan.restores += 1;
  }

  const newPendingIds = new Set();
  for (const row of manifest.newPendingRows) {
    const [insurerId, currentAccountId, , , currentIdHash, evidenceStatus, resolution] = row;
    const doc = state.docs.get(insurerId);
    if (!doc || doc.country !== 'GT') fail('NEW_PENDING_INSURER_INVALID', hash(insurerId));
    const matches = doc.accounts.filter(account => account.id === currentAccountId);
    if (matches.length !== 1 || matches[0].ref !== 'backend_required') fail('NEW_PENDING_ACCOUNT_STATE_MISMATCH', hash(`${insurerId}|${currentAccountId}`));
    if (hash(currentAccountId, 12) !== currentIdHash) fail('NEW_PENDING_ID_HASH_MISMATCH', hash(currentAccountId));
    if (evidenceStatus !== 'CONFIRMED_NEW_RELATIVE_TO_HEALTHY_CHECKPOINT' || resolution !== 'preserve_backend_required_for_separate_secure_onboarding') fail('NEW_PENDING_RESOLUTION_MISMATCH', hash(currentAccountId));
    const key = `${insurerId}|${currentAccountId}`;
    if (consumedPending.has(key) || newPendingIds.has(key)) fail('NEW_PENDING_OVERLAP', hash(key));
    newPendingIds.add(key);
  }

  if (consumedPending.size !== EXPECTED.restores || newPendingIds.size !== EXPECTED.newPending || consumedPending.size + newPendingIds.size !== EXPECTED.pendingBefore) fail('PENDING_COVERAGE_MISMATCH');
  if (affected.size !== EXPECTED.affectedGtDocuments) fail('AFFECTED_DOCUMENT_COUNT_MISMATCH', affected.size);

  for (const [insurerId, plan] of affected) {
    if (plan.before.length !== plan.after.length) fail('ROW_COUNT_CHANGED', hash(insurerId));
    const beforeOrder = plan.before.map((row,index) => idOf(row,index));
    const afterOrder = plan.after.map((row,index) => idOf(row,index));
    if (digest(beforeOrder) !== digest(afterOrder)) fail('ROW_ORDER_CHANGED', hash(insurerId));
    plan.beforeHash = digest(plan.before);
    plan.afterHash = digest(plan.after);
  }

  return { affected, restoredRefs, vaultRefs };
}

function validateState(state, phase) {
  const validUnique = new Set(state.validRefs);
  const protectedRows = state.validRefs.length + state.pending;
  if (state.totalResources !== EXPECTED.totalResources) fail(`${phase}_TOTAL_RESOURCE_COUNT_MISMATCH`, state.totalResources);
  if (protectedRows !== EXPECTED.protectedRows) fail(`${phase}_PROTECTED_ROW_COUNT_MISMATCH`, protectedRows);
  if (state.rawProtectedValues !== 0) fail(`${phase}_RAW_PROTECTED_VALUES_PRESENT`, state.rawProtectedValues);
  if (validUnique.size !== state.validRefs.length) fail(`${phase}_REFERENCE_DUPLICATE`, state.validRefs.length - validUnique.size);
  return { valid: state.validRefs.length, pending: state.pending, protectedRows, totalResources: state.totalResources };
}

async function main() {
  const { manifest, evidence } = readContracts();
  const db = getFirestore(init());
  const tenant = db.collection('tenantId').doc(TENANT);
  const [clientSnapshot, insurerSnapshot, advisorSnapshot, vault] = await Promise.all([
    tenant.collection('clientes').get(),
    tenant.collection('aseguradoras').get(),
    tenant.collection('asesores').get(),
    readVault()
  ]);
  if (clientSnapshot.size !== EXPECTED.clients || insurerSnapshot.size !== EXPECTED.insurers || advisorSnapshot.size !== EXPECTED.advisors) fail('TENANT_COUNT_PRECONDITION_MISMATCH');
  if (vault.rows.length !== EXPECTED.vaultRows) fail('VAULT_ROW_COUNT_MISMATCH', vault.rows.length);

  const beforeState = summarizeDocuments(insurerSnapshot);
  const beforeSummary = validateState(beforeState, 'BEFORE');
  if (beforeSummary.valid !== EXPECTED.validBefore || beforeSummary.pending !== EXPECTED.pendingBefore) fail('BEFORE_REFERENCE_STATE_MISMATCH');
  const plan = buildPlan(beforeState, vault.rows, manifest);
  const affectedIds = [...plan.affected.keys()].sort();
  const affectedRefs = affectedIds.map(id => tenant.collection('aseguradoras').doc(id));
  const beforeCountryCOHash = digest(beforeState.countryHashes.CO);
  const recoveryId = `recovery_${hash(`${Date.now()}|${evidence.sourceArtifactDigest}`, 20)}`;

  await db.runTransaction(async transaction => {
    const snapshots = await Promise.all(affectedRefs.map(ref => transaction.get(ref)));
    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i];
      const insurerId = affectedIds[i];
      if (!snapshot.exists) fail('TRANSACTION_DOCUMENT_MISSING', hash(insurerId));
      const currentAccounts = clone((snapshot.data() || {}).cuentas || []);
      const expectedPlan = plan.affected.get(insurerId);
      if (digest(currentAccounts) !== expectedPlan.beforeHash) fail('TRANSACTION_PRECONDITION_CHANGED', hash(insurerId));
    }
    for (let i = 0; i < affectedRefs.length; i++) {
      const insurerId = affectedIds[i];
      transaction.update(affectedRefs[i], { cuentas: plan.affected.get(insurerId).after });
    }
  });
  EXECUTION.transactionCommitted = true;

  async function readAfter() {
    const snapshot = await tenant.collection('aseguradoras').get();
    return summarizeDocuments(snapshot);
  }

  let afterState = await readAfter();
  let afterSummary;
  try {
    afterSummary = validateState(afterState, 'AFTER');
    if (afterSummary.valid !== EXPECTED.validAfter || afterSummary.pending !== EXPECTED.pendingAfter) fail('AFTER_REFERENCE_STATE_MISMATCH');
    if (digest(afterState.countryHashes.CO) !== beforeCountryCOHash) fail('COLOMBIA_CHANGED');
    for (const insurerId of affectedIds) {
      const doc = afterState.docs.get(insurerId);
      const expectedPlan = plan.affected.get(insurerId);
      if (!doc || digest(doc.data.cuentas || []) !== expectedPlan.afterHash) fail('READBACK_DOCUMENT_MISMATCH', hash(insurerId));
    }
    for (const row of manifest.newPendingRows) {
      const [insurerId, currentAccountId] = row;
      const doc = afterState.docs.get(insurerId);
      const account = doc && doc.accounts.find(candidate => candidate.id === currentAccountId);
      if (!account || account.ref !== 'backend_required') fail('NEW_PENDING_ROW_CHANGED', hash(`${insurerId}|${currentAccountId}`));
    }
  } catch (validationError) {
    await db.runTransaction(async transaction => {
      const snapshots = await Promise.all(affectedRefs.map(ref => transaction.get(ref)));
      for (let i = 0; i < snapshots.length; i++) {
        const insurerId = affectedIds[i];
        const currentAccounts = clone((snapshots[i].data() || {}).cuentas || []);
        const expectedPlan = plan.affected.get(insurerId);
        if (digest(currentAccounts) !== expectedPlan.afterHash) fail('ROLLBACK_PRECONDITION_CHANGED', hash(insurerId));
      }
      for (let i = 0; i < affectedRefs.length; i++) {
        const insurerId = affectedIds[i];
        transaction.update(affectedRefs[i], { cuentas: plan.affected.get(insurerId).before });
      }
    });
    EXECUTION.rollbackExecuted = true;
    const rolledBackState = await readAfter();
    const rolledBackSummary = validateState(rolledBackState, 'ROLLBACK');
    EXECUTION.rollbackVerified = rolledBackSummary.valid === EXPECTED.validBefore && rolledBackSummary.pending === EXPECTED.pendingBefore && digest(rolledBackState.countryHashes.CO) === beforeCountryCOHash && affectedIds.every(insurerId => digest((rolledBackState.docs.get(insurerId)?.data || {}).cuentas || []) === plan.affected.get(insurerId).beforeHash);
    if (!EXECUTION.rollbackVerified) fail('ROLLBACK_VERIFICATION_FAILED');
    throw validationError;
  }

  const affectedEvidence = affectedIds.map(insurerId => ({
    insurerHash: hash(insurerId),
    restores: plan.affected.get(insurerId).restores,
    beforeHash: plan.affected.get(insurerId).beforeHash,
    afterHash: plan.affected.get(insurerId).afterHash
  }));

  const report = {
    schemaVersion: 'orbit360-bank-reference-recovery-atomic-write-v1',
    generatedAt: new Date().toISOString(),
    recoveryId,
    projectId: PROJECT,
    tenantId: TENANT,
    ok: true,
    classification: null,
    mode: 'single_atomic_reference_recovery',
    sourceDryRunRunId: evidence.sourceRunId,
    sourceDryRunArtifactId: evidence.sourceArtifactId,
    sourceDryRunArtifactDigest: evidence.sourceArtifactDigest,
    transactionCommitted: EXECUTION.transactionCommitted,
    writesExecuted: EXECUTION.transactionCommitted,
    firestoreDocumentsWritten: affectedIds.length,
    secretManagerWritesExecuted: false,
    deployExecuted: false,
    migrationExecuted: false,
    rollbackAvailable: true,
    rollbackExecuted: EXECUTION.rollbackExecuted,
    rollbackVerified: EXECUTION.rollbackVerified,
    containsPII: false,
    containsSecrets: false,
    before: {
      clients: clientSnapshot.size,
      insurers: insurerSnapshot.size,
      advisors: advisorSnapshot.size,
      totalCuentaResources: beforeSummary.totalResources,
      protectedBankRows: beforeSummary.protectedRows,
      validReferences: beforeSummary.valid,
      pendingReferences: beforeSummary.pending,
      vaultRows: vault.rows.length,
      rawProtectedValues: beforeState.rawProtectedValues
    },
    applied: {
      historicalReferenceRestorations: EXPECTED.restores,
      newPendingRowsPreserved: EXPECTED.newPending,
      duplicateRemovals: 0,
      creates: 0,
      deletes: 0,
      reorders: 0,
      affectedGtDocuments: affectedIds.length,
      nonReferenceFieldChanges: 0,
      traceFieldChanges: 0,
      colombiaDocumentChanges: 0
    },
    after: {
      totalCuentaResources: afterSummary.totalResources,
      protectedBankRows: afterSummary.protectedRows,
      validReferences: afterSummary.valid,
      pendingReferences: afterSummary.pending,
      uniqueValidReferences: new Set(afterState.validRefs).size,
      rawProtectedValues: afterState.rawProtectedValues
    },
    affectedDocuments: affectedEvidence,
    nextAllowedAction: 'read_only_post_recovery_inventory_and_final_gate'
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    schemaVersion: 'orbit360-bank-reference-recovery-atomic-write-v1',
    generatedAt: new Date().toISOString(),
    projectId: PROJECT,
    tenantId: TENANT,
    ok: false,
    classification: String(error?.code || '').includes('PROJECT') || String(error?.code || '').includes('SERVICE_ACCOUNT') ? 'ENVIRONMENT_FAILURE' : 'DATA_CONTRACT_FAILURE',
    errorCode: clean(error && (error.code || error.message), 120),
    errorDetailHash: hash(error && error.detail, 16),
    transactionCommitted: EXECUTION.transactionCommitted,
    writesExecuted: EXECUTION.transactionCommitted,
    rollbackExecuted: EXECUTION.rollbackExecuted,
    rollbackVerified: EXECUTION.rollbackVerified,
    secretManagerWritesExecuted: false,
    deployExecuted: false,
    migrationExecuted: false,
    containsPII: false,
    containsSecrets: false,
    nextAllowedAction: 'STOP_THE_LINE'
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.error(JSON.stringify(payload, null, 2));
  process.exit(41);
});
