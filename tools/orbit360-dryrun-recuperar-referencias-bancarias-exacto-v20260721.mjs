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
const EXPECTED = Object.freeze({ clients: 414, insurers: 26, advisors: 7, currentValid: 23, currentPending: 70, vaultRows: 91, restore: 68, removeDuplicates: 2, finalValid: 91 });

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
const traceSheet = (row) => clean(row && row.fuenteTraza && row.fuenteTraza.hoja || row && row.source && row.source.sheet, 240);
const traceRow = (row) => Number(row && row.fuenteTraza && row.fuenteTraza.fila || row && row.source && row.source.row || 0);
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
  if (manifest.schemaVersion !== 'orbit360-bank-reference-recovery-map-v2-sanitized') fail('RECOVERY_MANIFEST_SCHEMA_MISMATCH');
  if (manifest.mode !== 'STATIC_CONFIRMED_NO_WRITE' || manifest.evidenceClassification !== 'CONFIRMED') fail('RECOVERY_MANIFEST_NOT_CONFIRMED');
  if (!manifest.safety || manifest.safety.containsPII !== false || manifest.safety.containsSecrets !== false || manifest.safety.containsRawBankValues !== false || manifest.safety.colombiaTouched !== false) fail('RECOVERY_MANIFEST_SAFETY_MISMATCH');
  if (!Array.isArray(manifest.recoveryMappings) || manifest.recoveryMappings.length !== EXPECTED.restore) fail('RECOVERY_MAPPING_COUNT_MISMATCH');
  if (!Array.isArray(manifest.duplicateIncomingRows) || manifest.duplicateIncomingRows.length !== EXPECTED.removeDuplicates) fail('RECOVERY_DUPLICATE_COUNT_MISMATCH');
  if (Number(manifest.summary && manifest.summary.ambiguousRows) !== 0 || Number(manifest.summary && manifest.summary.unmappedRows) !== 0) fail('RECOVERY_MANIFEST_NOT_EXACT');
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
  let currentValid = 0;
  let currentPending = 0;
  let rawProtectedValues = 0;

  insurerSnapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data() || {};
    const country = clean(data.pais || data.country, 12).toUpperCase() || 'OTHER';
    const accounts = [].concat(data.cuentas || []).map((row, index) => {
      const ref = refOf(row);
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
  const duplicateProposals = [];
  const consumedCurrent = new Set();
  const consumedLegacy = new Set();

  for (const row of manifest.recoveryMappings) {
    const [insurerId, currentAccountId, legacyAccountId, sourceSheet, sourceRow, currentIdHash, legacyIdHash, expectedRefHash] = row;
    const doc = docs.get(insurerId);
    if (!doc) fail('RECOVERY_INSURER_NOT_FOUND', hash(insurerId));
    if (doc.country !== 'GT') fail('RECOVERY_OUTSIDE_GT', `${hash(insurerId)}:${doc.country}`);
    const matches = doc.accounts.filter((account) => account.id === currentAccountId);
    if (matches.length !== 1) fail('CURRENT_ACCOUNT_ID_NOT_UNIQUE', `${hash(insurerId)}:${hash(currentAccountId)}`);
    const account = matches[0];
    if (account.ref !== 'backend_required') fail('CURRENT_ACCOUNT_NOT_PENDING', `${hash(insurerId)}:${hash(currentAccountId)}`);
    if (hash(currentAccountId) !== currentIdHash || hash(legacyAccountId) !== legacyIdHash) fail('RECOVERY_ID_HASH_MISMATCH', hash(currentAccountId));
    if (traceSheet(account.original) !== sourceSheet || traceRow(account.original) !== Number(sourceRow)) fail('RECOVERY_TRACE_MISMATCH', `${hash(insurerId)}:${hash(currentAccountId)}`);
    const vaultRow = vaultByLegacy.get(`${insurerId}|${legacyAccountId}`);
    if (!vaultRow || !vaultRow.valuePresent || !REF_RE.test(vaultRow.ref)) fail('VAULT_REFERENCE_NOT_AVAILABLE', `${hash(insurerId)}:${legacyIdHash}`);
    if (hash(vaultRow.ref) !== expectedRefHash) fail('VAULT_REFERENCE_HASH_MISMATCH', `${hash(insurerId)}:${legacyIdHash}`);
    const currentKey = `${insurerId}|${currentAccountId}`;
    const legacyKey = `${insurerId}|${legacyAccountId}`;
    if (consumedCurrent.has(currentKey) || consumedLegacy.has(legacyKey)) fail('RECOVERY_MAPPING_DUPLICATE', hash(currentKey));
    consumedCurrent.add(currentKey);
    consumedLegacy.add(legacyKey);
    if (!proposalsByInsurer.has(insurerId)) proposalsByInsurer.set(insurerId, { restores: [], duplicates: [] });
    proposalsByInsurer.get(insurerId).restores.push({ accountIndex: account.index, currentAccountId, legacyAccountId, ref: vaultRow.ref });
    restoreProposals.push({
      insurerId,
      currentAccountId,
      legacyAccountId,
      sourceSheet,
      sourceRow: Number(sourceRow),
      currentIdHash,
      legacyIdHash,
      afterRefHash: expectedRefHash,
      operation: 'restore_accountRef_only',
      containsPII: false,
      containsSecrets: false
    });
  }

  for (const row of manifest.duplicateIncomingRows) {
    const [insurerId, incomingAccountId, preservedLegacyAccountId, sourceSheet, sourceRow, incomingIdHash, legacyIdHash, resolution] = row;
    const doc = docs.get(insurerId);
    if (!doc) fail('DUPLICATE_INSURER_NOT_FOUND', hash(insurerId));
    if (doc.country !== 'GT') fail('DUPLICATE_OUTSIDE_GT', `${hash(insurerId)}:${doc.country}`);
    const incomingMatches = doc.accounts.filter((account) => account.id === incomingAccountId);
    const preservedMatches = doc.accounts.filter((account) => account.id === preservedLegacyAccountId);
    if (incomingMatches.length !== 1 || preservedMatches.length !== 1) fail('DUPLICATE_PAIR_NOT_UNIQUE', hash(`${insurerId}|${incomingAccountId}`));
    const incoming = incomingMatches[0];
    const preserved = preservedMatches[0];
    if (incoming.ref !== 'backend_required' || !REF_RE.test(preserved.ref)) fail('DUPLICATE_PAIR_STATE_MISMATCH', hash(`${insurerId}|${incomingAccountId}`));
    if (hash(incomingAccountId) !== incomingIdHash || hash(preservedLegacyAccountId) !== legacyIdHash) fail('DUPLICATE_ID_HASH_MISMATCH', hash(incomingAccountId));
    if (traceSheet(incoming.original) !== sourceSheet || traceRow(incoming.original) !== Number(sourceRow)) fail('DUPLICATE_TRACE_MISMATCH', hash(incomingAccountId));
    if (fingerprint(incoming.original) !== fingerprint(preserved.original)) fail('DUPLICATE_FINGERPRINT_MISMATCH', hash(incomingAccountId));
    if (resolution !== 'remove_incoming_duplicate_preserve_existing_valid_reference') fail('DUPLICATE_RESOLUTION_MISMATCH');
    if (!proposalsByInsurer.has(insurerId)) proposalsByInsurer.set(insurerId, { restores: [], duplicates: [] });
    proposalsByInsurer.get(insurerId).duplicates.push({ incomingIndex: incoming.index, incomingAccountId, preservedLegacyAccountId });
    duplicateProposals.push({
      insurerId,
      incomingAccountId,
      preservedLegacyAccountId,
      sourceSheet,
      sourceRow: Number(sourceRow),
      incomingIdHash,
      legacyIdHash,
      operation: resolution,
      containsPII: false,
      containsSecrets: false
    });
  }

  const affectedDocuments = [];
  let simulatedValid = 0;
  let simulatedPending = 0;
  let simulatedDuplicates = 0;
  let nonReferenceFieldChanges = 0;
  let colombiaDocumentChanges = 0;
  const countryHashesAfter = { GT: [], CO: [], OTHER: [] };

  docs.forEach((doc, insurerId) => {
    const beforeAccounts = [].concat(doc.data.cuentas || []).map(clone);
    let afterAccounts = beforeAccounts.map(clone);
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
      const duplicateIds = new Set(plan.duplicates.map((duplicate) => duplicate.incomingAccountId));
      afterAccounts = afterAccounts.filter((account, index) => !duplicateIds.has(idOf(account, index)));
      affectedDocuments.push({
        insurerId,
        country: doc.country,
        restores: plan.restores.length,
        duplicateRemovals: plan.duplicates.length,
        accountsBefore: beforeAccounts.length,
        accountsAfter: afterAccounts.length,
        beforeDocumentHash: digest(doc.data),
        beforeAccountsHash: digest(beforeAccounts),
        simulatedAfterAccountsHash: digest(afterAccounts),
        rollbackPreconditionHash: digest(beforeAccounts),
        containsPII: false,
        containsSecrets: false
      });
    }

    afterAccounts.forEach((account) => {
      const ref = refOf(account);
      if (REF_RE.test(ref)) simulatedValid += 1;
      if (ref === 'backend_required') simulatedPending += 1;
    });
    const fingerprints = afterAccounts.map(fingerprint).filter(Boolean);
    simulatedDuplicates += fingerprints.length - new Set(fingerprints).size;
    const simulatedData = Object.assign({}, doc.data, { cuentas: afterAccounts });
    if (doc.country === 'CO' && digest(simulatedData) !== digest(doc.data)) colombiaDocumentChanges += 1;
    const bucket = doc.country === 'GT' || doc.country === 'CO' ? doc.country : 'OTHER';
    countryHashesAfter[bucket].push([insurerId, digest(simulatedData)]);
  });
  Object.values(countryHashesAfter).forEach((rows) => rows.sort((left, right) => left[0].localeCompare(right[0])));

  const checks = {
    clientsPreserved: clientSnapshot.size === EXPECTED.clients,
    insurersPreserved: insurerSnapshot.size === EXPECTED.insurers,
    advisorsPreserved: advisorSnapshot.size === EXPECTED.advisors,
    currentStateExpected: currentValid === EXPECTED.currentValid && currentPending === EXPECTED.currentPending,
    vaultRowsPreserved: vault.rows.length === EXPECTED.vaultRows,
    vaultValuesPresent: vault.rows.filter((row) => row.valuePresent).length === EXPECTED.vaultRows,
    rawProtectedValuesAbsent: rawProtectedValues === 0,
    restoreProposalsExact: restoreProposals.length === EXPECTED.restore,
    duplicateRemovalsExact: duplicateProposals.length === EXPECTED.removeDuplicates,
    allPendingRowsAccounted: consumedCurrent.size + duplicateProposals.length === EXPECTED.currentPending,
    affectedGtDocumentsExact: affectedDocuments.length === 13 && affectedDocuments.every((doc) => doc.country === 'GT'),
    noNonReferenceFieldChanges: nonReferenceFieldChanges === 0,
    colombiaUntouched: colombiaDocumentChanges === 0 && digest(countryHashesBefore.CO) === digest(countryHashesAfter.CO),
    finalValidReferencesExact: simulatedValid === EXPECTED.finalValid,
    finalPendingReferencesZero: simulatedPending === 0,
    finalDuplicateFingerprintsZero: simulatedDuplicates === 0,
    manifestHashCoverageExact: manifest.validation && manifest.validation.hashSetDifference === 0,
    writesExecuted: false,
    containsPII: false,
    containsSecrets: false
  };

  const report = {
    schemaVersion: 'orbit360-bank-reference-recovery-exact-dry-run-v1',
    generatedAt: new Date().toISOString(),
    projectId: PROJECT,
    tenantId: TENANT,
    mode: 'read_only_exact_manifest_dry_run',
    ok: Object.values(checks).every(Boolean),
    classification: Object.values(checks).every(Boolean) ? null : 'DATA_CONTRACT_FAILURE',
    writesExecuted: false,
    deployExecuted: false,
    migrationExecuted: false,
    containsPII: false,
    containsSecrets: false,
    source: {
      manifestPath: MANIFEST_REL,
      manifestHash: digest(manifest),
      vaultUpdatedAtHash: hash(vault.updatedAt, 16)
    },
    before: {
      clients: clientSnapshot.size,
      insurers: insurerSnapshot.size,
      advisors: advisorSnapshot.size,
      validReferences: currentValid,
      pendingReferences: currentPending,
      vaultRows: vault.rows.length,
      rawProtectedValues
    },
    proposal: {
      restores: restoreProposals.length,
      duplicateRemovals: duplicateProposals.length,
      affectedDocuments: affectedDocuments.length,
      nonReferenceFieldChanges,
      colombiaDocumentChanges
    },
    simulatedAfter: {
      validReferences: simulatedValid,
      pendingReferences: simulatedPending,
      duplicateFingerprints: simulatedDuplicates
    },
    checks,
    restoreProposals,
    duplicateProposals,
    affectedDocuments,
    authorizationRequiredForWrite: true,
    nextAllowedAction: Object.values(checks).every(Boolean) ? 'single_atomic_recovery_write_after_separate_preflight' : 'STOP_THE_LINE'
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
    failedCheckIds: Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id),
    evidencePath: OUT_REL,
    containsPII: false,
    containsSecrets: false
  }, null, 2));
  process.exit(report.ok ? 0 : 41);
}

main().catch((error) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    schemaVersion: 'orbit360-bank-reference-recovery-exact-dry-run-v1',
    generatedAt: new Date().toISOString(),
    projectId: PROJECT,
    tenantId: TENANT,
    mode: 'read_only_exact_manifest_dry_run',
    ok: false,
    classification: error && error.code === 'PROJECT_MISMATCH' || error && String(error.code || '').includes('SERVICE_ACCOUNT') ? 'ENVIRONMENT_FAILURE' : 'DATA_CONTRACT_FAILURE',
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
