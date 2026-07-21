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
const OUT_DIR = path.resolve('orbit360-platform/runtime-incident-importer-20260721');
const OUT_REL = 'orbit360-platform/runtime-incident-importer-20260721/bank-reference-recovery-exact-dry-run-sanitized.json';
const OUT = path.resolve(OUT_REL);
const REF_RE = /^acct_[a-f0-9]{32}$/;
const EXPECTED = Object.freeze({
  clients: 414,
  insurers: 26,
  advisors: 7,
  bankRows: 93,
  currentValid: 23,
  currentPending: 70,
  vaultRows: 91,
  restore: 68,
  newPending: 2,
  removeDuplicates: 0,
  affectedGtDocuments: 13,
  finalValid: 91,
  finalPending: 2
});

const clean = (value, max = 240) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const fold = (value) => clean(value, 320).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const hash = (value, size = 12) => crypto.createHash('sha256').update(String(value == null ? '' : value)).digest('hex').slice(0, size);
const clone = (value) => JSON.parse(JSON.stringify(value));
const stable = (value) => Array.isArray(value)
  ? `[${value.map(stable).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const digest = (value) => crypto.createHash('sha256').update(stable(value)).digest('hex');
const refOf = (row) => clean(row && (row.accountRef || row.secureAccountRef || row.cuentaRef), 100);
const idOf = (row, index) => clean(row && (row.id || row.accountId || row.resourceId || String(index)), 180);
const last4 = (value) => { const digits = clean(value, 320).replace(/\D/g, ''); return digits ? digits.slice(-4) : ''; };
const fingerprint = (row) => [fold(row && row.banco), fold(row && row.tipo), clean(row && row.moneda, 20).toUpperCase(), last4(row && (row.numeroHint || row.numero || row.accountNumber))].join('|');
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

function readManifest() {
  const full = path.resolve(MANIFEST_REL);
  if (!fs.existsSync(full)) fail('RECOVERY_MANIFEST_REQUIRED', MANIFEST_REL);
  const manifest = JSON.parse(fs.readFileSync(full, 'utf8'));
  if (manifest.schemaVersion !== 'orbit360-bank-reference-recovery-map-v3-sanitized') fail('RECOVERY_MANIFEST_SCHEMA_MISMATCH');
  if (manifest.mode !== 'STATIC_CONFIRMED_NO_WRITE' || manifest.evidenceClassification !== 'CONFIRMED') fail('RECOVERY_MANIFEST_NOT_CONFIRMED');
  if (!manifest.safety || manifest.safety.containsPII !== false || manifest.safety.containsSecrets !== false || manifest.safety.containsRawBankValues !== false || manifest.safety.colombiaTouched !== false) fail('RECOVERY_MANIFEST_SAFETY_MISMATCH');
  if (manifest.safety.createsRows !== false || manifest.safety.deletesRows !== false || manifest.safety.reordersRows !== false) fail('RECOVERY_MANIFEST_ROW_MUTATION_MISMATCH');
  if (!Array.isArray(manifest.recoveryMappings) || manifest.recoveryMappings.length !== EXPECTED.restore) fail('RECOVERY_MAPPING_COUNT_MISMATCH');
  if (!Array.isArray(manifest.newPendingRows) || manifest.newPendingRows.length !== EXPECTED.newPending) fail('RECOVERY_NEW_PENDING_COUNT_MISMATCH');
  if (!Array.isArray(manifest.duplicateIncomingRows) || manifest.duplicateIncomingRows.length !== EXPECTED.removeDuplicates) fail('RECOVERY_DUPLICATE_COUNT_MISMATCH');
  if (Number(manifest.summary && manifest.summary.ambiguousRows) !== 0 || Number(manifest.summary && manifest.summary.unmappedRows) !== 0) fail('RECOVERY_MANIFEST_NOT_EXACT');
  if (Number(manifest.summary && manifest.summary.expectedFinalBankRows) !== EXPECTED.bankRows ||
      Number(manifest.summary && manifest.summary.expectedFinalValidReferences) !== EXPECTED.finalValid ||
      Number(manifest.summary && manifest.summary.expectedFinalPendingRows) !== EXPECTED.finalPending ||
      Number(manifest.summary && manifest.summary.expectedFinalDuplicateRows) !== 0) fail('RECOVERY_MANIFEST_FINAL_STATE_MISMATCH');
  const identity = manifest.identityContract || {};
  if (Number(identity.historicalReferenceRestorations) !== EXPECTED.restore ||
      Number(identity.newPendingRowsPreserved) !== EXPECTED.newPending ||
      Number(identity.duplicateRemovals) !== EXPECTED.removeDuplicates ||
      identity.newPendingRowsMeaning !== 'new_relative_to_healthy_checkpoint_not_historical_duplicates') fail('RECOVERY_IDENTITY_CONTRACT_NOT_CONFIRMED');
  const trace = manifest.traceContract || {};
  const traceValid = trace.classification === 'DATA_CONTRACT_FAILURE' &&
    trace.rootCause === 'xlsx_blankrows_false_converted_physical_rows_to_nonblank_ordinals' &&
    trace.reconciliation === 'exact_from_original_valid_source_not_inference' &&
    Number(trace.rowsReconciled) === 70 &&
    Number(trace.ambiguousRows) === 0 &&
    Number(trace.unmappedRows) === 0 &&
    trace.recoveryScopeChangesTraceFields === false &&
    manifest.validation && manifest.validation.physicalToStoredTraceRowsExact === true &&
    Number(manifest.validation.traceRowsReconciled) === 70;
  if (!traceValid) fail('RECOVERY_TRACE_CONTRACT_NOT_CONFIRMED');
  return manifest;
}

async function readVault() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({ name: SECRET });
  const text = version && version.payload && version.payload.data ? Buffer.from(version.payload.data).toString('utf8') : '';
  if (!text) fail('VAULT_EMPTY');
  const vault = JSON.parse(text);
  if (vault.schemaVersion !== 'orbit360-insurer-credentials-v1' || vault.tenantId !== TENANT) fail('VAULT_CONTRACT_MISMATCH');
  const rows = Object.entries(vault.bankAccounts || {}).map(([ref, row]) => ({
    ref: clean(ref, 100),
    insurerId: clean(row && row.insurerId, 180),
    legacyAccountId: clean(row && row.accountId, 180),
    valuePresent: Boolean(clean(row && row.accountNumber, 320))
  }));
  return { rows, updatedAt: clean(vault.updatedAt, 80) };
}

function publicAccount(row) {
  const copy = clone(row || {});
  delete copy.accountRef;
  delete copy.secureAccountRef;
  delete copy.cuentaRef;
  delete copy.numero;
  delete copy.accountNumber;
  return copy;
}

async function main() {
  const manifest = readManifest();
  const manifestIdentityContractValidated = true;
  const manifestTraceContractValidated = true;
  const traceIsAuditMetadata = true;
  const recoveryScopeChangesTraceFields = false;
  const db = getFirestore(init());
  const tenant = db.collection('tenantId').doc(TENANT);
  const [clientSnapshot, insurerSnapshot, advisorSnapshot, vault] = await Promise.all([
    tenant.collection('clientes').get(),
    tenant.collection('aseguradoras').get(),
    tenant.collection('asesores').get(),
    readVault()
  ]);

  const docs = new Map();
  const countryHashesBefore = { GT: [], CO: [], OTHER: [] };
  let currentBankRows = 0;
  let currentValid = 0;
  let currentPending = 0;
  let rawProtectedValues = 0;

  insurerSnapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data() || {};
    const country = clean(data.pais || data.country, 12).toUpperCase() || 'OTHER';
    const accounts = [].concat(data.cuentas || []).map((row, index) => {
      const ref = refOf(row);
      currentBankRows += 1;
      if (REF_RE.test(ref)) currentValid += 1;
      if (ref === 'backend_required') currentPending += 1;
      if (clean(row && (row.numero || row.accountNumber), 320)) rawProtectedValues += 1;
      return { index, id: idOf(row, index), ref, original: clone(row) };
    });
    docs.set(docSnapshot.id, { id: docSnapshot.id, country, data: clone(data), accounts });
    const bucket = country === 'GT' || country === 'CO' ? country : 'OTHER';
    countryHashesBefore[bucket].push([docSnapshot.id, digest(data)]);
  });
  Object.values(countryHashesBefore).forEach((rows) => rows.sort((left, right) => left[0].localeCompare(right[0])));

  const vaultByLegacy = new Map();
  vault.rows.forEach((row) => {
    const key = `${row.insurerId}|${row.legacyAccountId}`;
    if (vaultByLegacy.has(key)) fail('VAULT_LEGACY_ID_DUPLICATE', hash(key));
    vaultByLegacy.set(key, row);
  });

  const proposalsByInsurer = new Map();
  const restoreProposals = [];
  const newPendingEvidence = [];
  const consumedCurrent = new Set();
  const consumedLegacy = new Set();

  for (const row of manifest.recoveryMappings) {
    const [insurerId, currentAccountId, legacyAccountId, sourceSheet, storedTraceRow, currentIdHash, legacyIdHash, expectedRefHash] = row;
    const doc = docs.get(insurerId);
    if (!doc) fail('RECOVERY_INSURER_NOT_FOUND', hash(insurerId));
    if (doc.country !== 'GT') fail('RECOVERY_OUTSIDE_GT', `${hash(insurerId)}:${doc.country}`);
    const matches = doc.accounts.filter((account) => account.id === currentAccountId);
    if (matches.length !== 1) fail('CURRENT_ACCOUNT_ID_NOT_UNIQUE', `${hash(insurerId)}:${hash(currentAccountId)}`);
    const account = matches[0];
    if (account.ref !== 'backend_required') fail('CURRENT_ACCOUNT_NOT_PENDING', `${hash(insurerId)}:${hash(currentAccountId)}`);
    if (hash(currentAccountId) !== currentIdHash || hash(legacyAccountId) !== legacyIdHash) fail('RECOVERY_ID_HASH_MISMATCH', hash(currentAccountId));
    const vaultRow = vaultByLegacy.get(`${insurerId}|${legacyAccountId}`);
    if (!vaultRow || !vaultRow.valuePresent || !REF_RE.test(vaultRow.ref)) fail('VAULT_REFERENCE_NOT_AVAILABLE', `${hash(insurerId)}:${legacyIdHash}`);
    if (hash(vaultRow.ref) !== expectedRefHash) fail('VAULT_REFERENCE_HASH_MISMATCH', `${hash(insurerId)}:${legacyIdHash}`);
    const currentKey = `${insurerId}|${currentAccountId}`;
    const legacyKey = `${insurerId}|${legacyAccountId}`;
    if (consumedCurrent.has(currentKey) || consumedLegacy.has(legacyKey)) fail('RECOVERY_MAPPING_DUPLICATE', hash(currentKey));
    consumedCurrent.add(currentKey);
    consumedLegacy.add(legacyKey);
    if (!proposalsByInsurer.has(insurerId)) proposalsByInsurer.set(insurerId, { restores: [] });
    proposalsByInsurer.get(insurerId).restores.push({ accountIndex: account.index, currentAccountId, legacyAccountId, ref: vaultRow.ref });
    restoreProposals.push({
      insurerId,
      currentAccountId,
      legacyAccountId,
      sourceSheet,
      storedTraceRow: Number(storedTraceRow),
      traceIsAuditMetadata: true,
      currentIdHash,
      legacyIdHash,
      afterRefHash: expectedRefHash,
      operation: 'restore_accountRef_only',
      containsPII: false,
      containsSecrets: false
    });
  }

  const newPendingIds = new Set();
  const newPendingFingerprints = new Set();
  for (const row of manifest.newPendingRows) {
    const [insurerId, currentAccountId, sourceSheet, storedTraceRow, currentIdHash, evidenceStatus, resolution] = row;
    const doc = docs.get(insurerId);
    if (!doc) fail('NEW_PENDING_INSURER_NOT_FOUND', hash(insurerId));
    if (doc.country !== 'GT') fail('NEW_PENDING_OUTSIDE_GT', `${hash(insurerId)}:${doc.country}`);
    const matches = doc.accounts.filter((account) => account.id === currentAccountId);
    if (matches.length !== 1) fail('NEW_PENDING_ACCOUNT_ID_NOT_UNIQUE', `${hash(insurerId)}:${hash(currentAccountId)}`);
    const account = matches[0];
    if (account.ref !== 'backend_required') fail('NEW_PENDING_ACCOUNT_NOT_PENDING', `${hash(insurerId)}:${hash(currentAccountId)}`);
    if (hash(currentAccountId) !== currentIdHash) fail('NEW_PENDING_ID_HASH_MISMATCH', hash(currentAccountId));
    if (evidenceStatus !== 'CONFIRMED_NEW_RELATIVE_TO_HEALTHY_CHECKPOINT' ||
        resolution !== 'preserve_backend_required_for_separate_secure_onboarding') fail('NEW_PENDING_RESOLUTION_MISMATCH', hash(currentAccountId));
    const currentKey = `${insurerId}|${currentAccountId}`;
    if (consumedCurrent.has(currentKey) || newPendingIds.has(currentKey)) fail('NEW_PENDING_OVERLAPS_RECOVERY', hash(currentKey));
    if (vaultByLegacy.has(currentKey)) fail('NEW_PENDING_DIRECT_VAULT_ID_COLLISION', hash(currentKey));
    const accountFingerprint = fingerprint(account.original);
    if (!accountFingerprint || accountFingerprint === '|||') fail('NEW_PENDING_FINGERPRINT_EMPTY', hash(currentAccountId));
    const otherFingerprints = doc.accounts
      .filter((candidate) => candidate.id !== currentAccountId)
      .map((candidate) => fingerprint(candidate.original))
      .filter((value) => value && value !== '|||');
    if (otherFingerprints.includes(accountFingerprint)) fail('NEW_PENDING_NOT_DISTINCT', hash(currentAccountId));
    if (newPendingFingerprints.has(accountFingerprint)) fail('NEW_PENDING_ROWS_DUPLICATE_EACH_OTHER', hash(currentAccountId));
    newPendingFingerprints.add(accountFingerprint);
    newPendingIds.add(currentKey);
    newPendingEvidence.push({
      insurerId,
      currentAccountId,
      sourceSheet,
      storedTraceRow: Number(storedTraceRow),
      currentIdHash,
      evidenceStatus,
      resolution,
      beforeState: 'backend_required',
      afterState: 'backend_required',
      operation: 'preserve_new_pending_row_unchanged',
      distinctFingerprintConfirmed: true,
      containsPII: false,
      containsSecrets: false
    });
  }

  const affectedDocuments = [];
  let simulatedBankRows = 0;
  let simulatedValid = 0;
  let simulatedPending = 0;
  let simulatedDuplicates = 0;
  let creates = 0;
  let deletes = 0;
  let reorderChanges = 0;
  let nonReferenceFieldChanges = 0;
  let colombiaDocumentChanges = 0;
  const countryHashesAfter = { GT: [], CO: [], OTHER: [] };

  docs.forEach((doc, insurerId) => {
    const beforeAccounts = [].concat(doc.data.cuentas || []).map(clone);
    const afterAccounts = beforeAccounts.map(clone);
    const beforeOrder = beforeAccounts.map((account, index) => idOf(account, index));
    const plan = proposalsByInsurer.get(insurerId);
    if (plan) {
      for (const restore of plan.restores) {
        const before = clone(afterAccounts[restore.accountIndex]);
        const after = clone(before);
        after.accountRef = restore.ref;
        delete after.secureAccountRef;
        delete after.cuentaRef;
        afterAccounts[restore.accountIndex] = after;
        if (digest(publicAccount(before)) !== digest(publicAccount(after))) nonReferenceFieldChanges += 1;
      }
      affectedDocuments.push({
        insurerId,
        country: doc.country,
        restores: plan.restores.length,
        newPendingRowsPreserved: newPendingEvidence.filter((row) => row.insurerId === insurerId).length,
        duplicateRemovals: 0,
        accountsBefore: beforeAccounts.length,
        accountsAfter: afterAccounts.length,
        beforeDocumentHash: digest(doc.data),
        beforeAccountsHash: digest(beforeAccounts),
        simulatedAfterAccountsHash: digest(afterAccounts),
        rollbackPreconditionHash: digest(beforeAccounts),
        traceFieldsChanged: false,
        containsPII: false,
        containsSecrets: false
      });
    }

    creates += Math.max(0, afterAccounts.length - beforeAccounts.length);
    deletes += Math.max(0, beforeAccounts.length - afterAccounts.length);
    const afterOrder = afterAccounts.map((account, index) => idOf(account, index));
    if (digest(beforeOrder) !== digest(afterOrder)) reorderChanges += 1;

    afterAccounts.forEach((account) => {
      simulatedBankRows += 1;
      const ref = refOf(account);
      if (REF_RE.test(ref)) simulatedValid += 1;
      if (ref === 'backend_required') simulatedPending += 1;
    });
    const fingerprints = afterAccounts.map(fingerprint).filter((value) => value !== '|||');
    simulatedDuplicates += fingerprints.length - new Set(fingerprints).size;
    const simulatedData = Object.assign({}, doc.data, { cuentas: afterAccounts });
    if (doc.country === 'CO' && digest(simulatedData) !== digest(doc.data)) colombiaDocumentChanges += 1;
    const bucket = doc.country === 'GT' || doc.country === 'CO' ? doc.country : 'OTHER';
    countryHashesAfter[bucket].push([insurerId, digest(simulatedData)]);
  });
  Object.values(countryHashesAfter).forEach((rows) => rows.sort((left, right) => left[0].localeCompare(right[0])));

  const newPendingRowsPreserved = newPendingEvidence.every((item) => {
    const doc = docs.get(item.insurerId);
    const account = doc && doc.accounts.find((candidate) => candidate.id === item.currentAccountId);
    return account && account.ref === 'backend_required';
  });

  const checks = {
    clientsPreserved: clientSnapshot.size === EXPECTED.clients,
    insurersPreserved: insurerSnapshot.size === EXPECTED.insurers,
    advisorsPreserved: advisorSnapshot.size === EXPECTED.advisors,
    bankRowsBeforeExpected: currentBankRows === EXPECTED.bankRows,
    currentStateExpected: currentValid === EXPECTED.currentValid && currentPending === EXPECTED.currentPending,
    vaultRowsPreserved: vault.rows.length === EXPECTED.vaultRows,
    vaultValuesPresent: vault.rows.filter((row) => row.valuePresent).length === EXPECTED.vaultRows,
    rawProtectedValuesAbsent: rawProtectedValues === 0,
    manifestIdentityContractValidated,
    manifestTraceContractValidated,
    traceIsAuditMetadata,
    recoveryScopeChangesTraceFields: recoveryScopeChangesTraceFields === false,
    restoreProposalsExact: restoreProposals.length === EXPECTED.restore,
    newPendingRowsExact: newPendingEvidence.length === EXPECTED.newPending,
    newPendingRowsDistinct: newPendingEvidence.every((row) => row.distinctFingerprintConfirmed === true),
    newPendingRowsPreserved,
    duplicateRemovalsZero: EXPECTED.removeDuplicates === 0,
    allPendingRowsAccounted: consumedCurrent.size + newPendingIds.size === EXPECTED.currentPending,
    affectedGtDocumentsExact: affectedDocuments.length === EXPECTED.affectedGtDocuments && affectedDocuments.every((doc) => doc.country === 'GT'),
    noCreates: creates === 0,
    noDeletes: deletes === 0,
    noReorder: reorderChanges === 0,
    noNonReferenceFieldChanges: nonReferenceFieldChanges === 0,
    traceFieldsUntouched: affectedDocuments.every((doc) => doc.traceFieldsChanged === false),
    colombiaUntouched: colombiaDocumentChanges === 0 && digest(countryHashesBefore.CO) === digest(countryHashesAfter.CO),
    finalBankRowsExact: simulatedBankRows === EXPECTED.bankRows,
    finalValidReferencesExact: simulatedValid === EXPECTED.finalValid,
    finalPendingReferencesExact: simulatedPending === EXPECTED.finalPending,
    finalDuplicateFingerprintsZero: simulatedDuplicates === 0,
    manifestHashCoverageExact: manifest.validation && manifest.validation.hashSetDifference === 0,
    writesExecuted: false,
    containsPII: false,
    containsSecrets: false
  };

  const ok = Object.values(checks).every(Boolean);
  const report = {
    schemaVersion: 'orbit360-bank-reference-recovery-exact-dry-run-v3-68-restores-2-new-pending',
    generatedAt: new Date().toISOString(),
    projectId: PROJECT,
    tenantId: TENANT,
    mode: 'read_only_exact_manifest_dry_run',
    ok,
    classification: ok ? null : 'DATA_CONTRACT_FAILURE',
    writesExecuted: false,
    deployExecuted: false,
    migrationExecuted: false,
    containsPII: false,
    containsSecrets: false,
    source: {
      manifestPath: MANIFEST_REL,
      manifestHash: digest(manifest),
      vaultUpdatedAtHash: hash(vault.updatedAt, 16),
      identityContract: '68_historical_restores_2_new_pending_0_removals',
      traceContract: 'audit_metadata_not_identity_key'
    },
    before: {
      clients: clientSnapshot.size,
      insurers: insurerSnapshot.size,
      advisors: advisorSnapshot.size,
      bankRows: currentBankRows,
      validReferences: currentValid,
      pendingReferences: currentPending,
      vaultRows: vault.rows.length,
      rawProtectedValues
    },
    proposal: {
      restores: restoreProposals.length,
      newPendingRowsPreserved: newPendingEvidence.length,
      duplicateRemovals: 0,
      creates,
      deletes,
      reorderChanges,
      affectedDocuments: affectedDocuments.length,
      nonReferenceFieldChanges,
      traceFieldChanges: 0,
      colombiaDocumentChanges
    },
    simulatedAfter: {
      bankRows: simulatedBankRows,
      validReferences: simulatedValid,
      pendingReferences: simulatedPending,
      duplicateFingerprints: simulatedDuplicates
    },
    checks,
    restoreProposals,
    newPendingEvidence,
    affectedDocuments,
    authorizationRequiredForWrite: true,
    nextAllowedAction: ok ? 'single_atomic_68_reference_recovery_after_separate_preflight' : 'STOP_THE_LINE'
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    writesExecuted: false,
    before: report.before,
    proposal: report.proposal,
    simulatedAfter: report.simulatedAfter,
    failedCheckIds: Object.entries(checks).filter(([, value]) => !value).map(([id]) => id),
    evidencePath: OUT_REL,
    containsPII: false,
    containsSecrets: false
  }, null, 2));
  process.exit(report.ok ? 0 : 41);
}

main().catch((error) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    schemaVersion: 'orbit360-bank-reference-recovery-exact-dry-run-v3-68-restores-2-new-pending',
    generatedAt: new Date().toISOString(),
    projectId: PROJECT,
    tenantId: TENANT,
    mode: 'read_only_exact_manifest_dry_run',
    ok: false,
    classification: error && (error.code === 'PROJECT_MISMATCH' || String(error.code || '').includes('SERVICE_ACCOUNT')) ? 'ENVIRONMENT_FAILURE' : 'DATA_CONTRACT_FAILURE',
    errorCode: clean(error && (error.code || error.message), 120),
    errorDetailHash: hash(error && error.detail, 16),
    writesExecuted: false,
    deployExecuted: false,
    migrationExecuted: false,
    containsPII: false,
    containsSecrets: false,
    nextAllowedAction: 'STOP_THE_LINE'
  };
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.error(JSON.stringify(payload, null, 2));
  process.exit(41);
});
