#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const EXPECTED_PROJECT_ID = 'ays-orbit-360-lab';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
const TENANT_ID = 'alianzas-soluciones';
const SECRET_ID = process.env.ORBIT360_CREDENTIAL_SECRET_ID || 'orbit360-insurer-credentials-alianzas-soluciones';
const SECRET_LATEST = `projects/${EXPECTED_PROJECT_ID}/secrets/${SECRET_ID}/versions/latest`;
const EXPECTED_INSURERS = 26;
const EXPECTED_PROPOSALS = 68;
const EXPECTED_AFFECTED_GT = 13;
const ACCOUNT_REF_RE = /^acct_[a-f0-9]{32}$/;
const OUT_DIR = path.resolve('orbit360-platform/runtime-incident-importer-20260721');
const OUT_FILE = path.join(OUT_DIR, 'bank-reference-recovery-dry-run-sanitizado.json');
const BACKUP_MANIFEST_FILE = path.join(OUT_DIR, 'bank-reference-recovery-backup-manifest-sanitizado.json');

function clean(value, max = 220) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}

function hash(value, size = 16) {
  return crypto.createHash('sha256').update(String(value == null ? '' : value)).digest('hex').slice(0, size);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function fail(code, detail = '') {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function initAdmin() {
  if (PROJECT_ID !== EXPECTED_PROJECT_ID) fail('PROJECT_MISMATCH', PROJECT_ID || 'missing');
  if (getApps().length) return getApps()[0];
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile || !fs.existsSync(keyFile)) fail('SERVICE_ACCOUNT_FILE_REQUIRED');
  const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  if (serviceAccount.project_id !== EXPECTED_PROJECT_ID) fail('SERVICE_ACCOUNT_PROJECT_MISMATCH');
  return initializeApp({ credential: cert(serviceAccount), projectId: EXPECTED_PROJECT_ID });
}

async function readVault() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({ name: SECRET_LATEST });
  const text = version && version.payload && version.payload.data
    ? Buffer.from(version.payload.data).toString('utf8')
    : '';
  if (!text) fail('VAULT_EMPTY');
  const vault = JSON.parse(text);
  if (!vault || vault.schemaVersion !== 'orbit360-insurer-credentials-v1' || vault.tenantId !== TENANT_ID) {
    fail('VAULT_CONTRACT_MISMATCH');
  }
  const bankAccounts = vault.bankAccounts && typeof vault.bankAccounts === 'object' ? vault.bankAccounts : {};
  return { updatedAt: clean(vault.updatedAt, 80), bankAccounts };
}

function rawAccountPresent(account) {
  return Boolean(clean(account && (account.numero || account.accountNumber), 320));
}

function accountRef(account) {
  return clean(account && (account.accountRef || account.secureAccountRef || account.cuentaRef), 100);
}

function accountId(account, index) {
  return clean(account && (account.id || account.accountId || account.resourceId || String(index)), 180);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function main() {
  const app = initAdmin();
  const db = getFirestore(app);
  const [snapshot, vault] = await Promise.all([
    db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras').get(),
    readVault()
  ]);

  const vaultRows = Object.entries(vault.bankAccounts).map(([ref, row]) => ({
    ref: clean(ref, 100),
    insurerId: clean(row && row.insurerId, 180),
    accountId: clean(row && row.accountId, 180),
    valuePresent: Boolean(clean(row && row.accountNumber, 320)),
    bank: clean(row && row.bank, 180),
    accountType: clean(row && row.accountType, 140),
    currency: clean(row && row.currency, 20)
  }));

  const vaultKeyMap = new Map();
  const duplicateVaultKeys = [];
  vaultRows.forEach((row) => {
    const key = `${row.insurerId}|${row.accountId}`;
    if (vaultKeyMap.has(key)) duplicateVaultKeys.push(hash(key, 16));
    vaultKeyMap.set(key, row);
  });

  const proposals = [];
  const blockers = [];
  const affectedDocuments = [];
  let rawValues = 0;
  let currentValidRefs = 0;
  let currentPendingRefs = 0;
  let colombiaChanges = 0;
  let creates = 0;
  let deletes = 0;
  let reorderDetected = 0;
  let nonReferenceFieldChanges = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const country = clean(data.pais || data.country, 12).toUpperCase();
    const accounts = [].concat(data.cuentas || []);
    const beforeAccounts = clone(accounts);
    const afterAccounts = clone(accounts);
    const seenAccountIds = new Set();
    const documentProposals = [];

    accounts.forEach((account, index) => {
      if (rawAccountPresent(account)) rawValues += 1;
      const ref = accountRef(account);
      if (ACCOUNT_REF_RE.test(ref)) currentValidRefs += 1;
      if (ref === 'backend_required') currentPendingRefs += 1;

      const resourceId = accountId(account, index);
      if (seenAccountIds.has(resourceId)) {
        blockers.push({ code: 'DUPLICATE_ACCOUNT_ID_IN_DOCUMENT', insurerHash: hash(doc.id, 16), accountHash: hash(resourceId, 12) });
        return;
      }
      seenAccountIds.add(resourceId);

      const vaultRow = vaultKeyMap.get(`${doc.id}|${resourceId}`);
      if (!vaultRow) return;
      if (!ACCOUNT_REF_RE.test(vaultRow.ref) || !vaultRow.valuePresent) {
        blockers.push({ code: 'VAULT_ROW_NOT_RECOVERABLE', insurerHash: hash(doc.id, 16), accountHash: hash(resourceId, 12) });
        return;
      }
      if (ACCOUNT_REF_RE.test(ref)) {
        if (ref !== vaultRow.ref) blockers.push({ code: 'CONFLICTING_VALID_REFERENCE', insurerHash: hash(doc.id, 16), accountHash: hash(resourceId, 12) });
        return;
      }
      if (ref !== 'backend_required' && ref !== '') {
        blockers.push({ code: 'UNEXPECTED_CURRENT_REFERENCE_STATE', insurerHash: hash(doc.id, 16), accountHash: hash(resourceId, 12), stateHash: hash(ref, 10) });
        return;
      }
      if (country !== 'GT') {
        colombiaChanges += country === 'CO' ? 1 : 0;
        blockers.push({ code: 'NON_GT_RECOVERY_PROPOSAL', insurerHash: hash(doc.id, 16), accountHash: hash(resourceId, 12), country });
        return;
      }

      const beforeAccount = clone(account);
      const afterAccount = clone(account);
      afterAccount.accountRef = vaultRow.ref;
      delete afterAccount.secureAccountRef;
      delete afterAccount.cuentaRef;
      afterAccounts[index] = afterAccount;

      const beforeComparable = clone(beforeAccount);
      const afterComparable = clone(afterAccount);
      delete beforeComparable.accountRef;
      delete beforeComparable.secureAccountRef;
      delete beforeComparable.cuentaRef;
      delete afterComparable.accountRef;
      delete afterComparable.secureAccountRef;
      delete afterComparable.cuentaRef;
      if (digest(beforeComparable) !== digest(afterComparable)) nonReferenceFieldChanges += 1;

      const proposal = {
        insurerHash: hash(doc.id, 16),
        accountHash: hash(resourceId, 12),
        index,
        beforeState: ref === 'backend_required' ? 'backend_required' : 'empty',
        afterRefHash: hash(vaultRow.ref, 12),
        matchKeyHash: hash(`${doc.id}|${resourceId}`, 16),
        operation: 'set_accountRef_only',
        containsSecrets: false
      };
      proposals.push(proposal);
      documentProposals.push(proposal);
    });

    if (beforeAccounts.length !== afterAccounts.length) {
      creates += Math.max(0, afterAccounts.length - beforeAccounts.length);
      deletes += Math.max(0, beforeAccounts.length - afterAccounts.length);
    }
    const beforeOrder = beforeAccounts.map((row, index) => accountId(row, index));
    const afterOrder = afterAccounts.map((row, index) => accountId(row, index));
    if (digest(beforeOrder) !== digest(afterOrder)) reorderDetected += 1;

    if (documentProposals.length) {
      affectedDocuments.push({
        insurerHash: hash(doc.id, 16),
        country,
        proposalCount: documentProposals.length,
        accountRowsBefore: beforeAccounts.length,
        accountRowsAfter: afterAccounts.length,
        beforeDocumentHash: digest(data),
        beforeAccountsHash: digest(beforeAccounts),
        simulatedAfterAccountsHash: digest(afterAccounts),
        sourceType: clean(data.fuenteDirectorio && data.fuenteDirectorio.tipo || data.sourceType || data.origen, 100),
        updatedAtHash: hash(clean(data.updatedAt || data.modificadoAt || data.ultimaActualizacion || '', 100), 16),
        rollback: {
          strategy: 'restore_original_cuentas_array_if_precondition_hash_matches',
          originalAccountsHash: digest(beforeAccounts),
          exactBeforeStates: documentProposals.map((item) => ({ accountHash: item.accountHash, beforeState: item.beforeState }))
        },
        containsPII: false,
        containsSecrets: false
      });
    }
  }

  const proposalKeySet = new Set(proposals.map((item) => `${item.insurerHash}|${item.accountHash}`));
  const duplicateProposalCount = proposals.length - proposalKeySet.size;
  const vaultRefsInProposals = new Set(proposals.map((item) => item.afterRefHash));
  const affectedGtCount = affectedDocuments.filter((item) => item.country === 'GT').length;

  const checks = {
    insurerCountPreserved: snapshot.size === EXPECTED_INSURERS,
    rawValuesAbsent: rawValues === 0,
    vaultHasExpectedRows: vaultRows.length === 91,
    vaultValuesPresent: vaultRows.filter((row) => row.valuePresent).length === 91,
    vaultKeysUnique: duplicateVaultKeys.length === 0,
    proposalsExact: proposals.length === EXPECTED_PROPOSALS,
    affectedGtExact: affectedGtCount === EXPECTED_AFFECTED_GT,
    colombiaUntouched: colombiaChanges === 0,
    noCreates: creates === 0,
    noDeletes: deletes === 0,
    noReorder: reorderDetected === 0,
    noNonReferenceFieldChanges: nonReferenceFieldChanges === 0,
    proposalsUnique: duplicateProposalCount === 0,
    proposedRefsUnique: vaultRefsInProposals.size === proposals.length,
    noBlockers: blockers.length === 0,
    expectedCurrentState: currentValidRefs === 23 && currentPendingRefs === 70,
    writesExecuted: false,
    deployExecuted: false,
    migrationExecuted: false
  };

  const report = {
    schemaVersion: 'orbit360-bank-reference-recovery-dry-run-v1',
    generatedAt: new Date().toISOString(),
    projectId: EXPECTED_PROJECT_ID,
    tenantId: TENANT_ID,
    mode: 'read_only_dry_run',
    writesExecuted: false,
    deployExecuted: false,
    migrationExecuted: false,
    containsPII: false,
    containsSecrets: false,
    baseline: {
      insurerCount: snapshot.size,
      currentValidRefs,
      currentPendingRefs,
      vaultRows: vaultRows.length,
      vaultValuesPresent: vaultRows.filter((row) => row.valuePresent).length,
      vaultUpdatedAtHash: hash(vault.updatedAt, 16)
    },
    proposal: {
      operation: 'restore_accountRef_only',
      proposedChanges: proposals.length,
      affectedDocuments: affectedDocuments.length,
      affectedGtDocuments: affectedGtCount,
      colombiaChanges,
      creates,
      deletes,
      reorderDetected,
      nonReferenceFieldChanges,
      duplicateProposalCount,
      blockers: blockers.length,
      projectedValidRefs: currentValidRefs + proposals.length,
      projectedPendingRefs: currentPendingRefs - proposals.filter((item) => item.beforeState === 'backend_required').length
    },
    affectedDocuments,
    proposals,
    blockers,
    checks,
    recoveryReady: Object.values(checks).every(Boolean)
  };

  const backupManifest = {
    schemaVersion: 'orbit360-bank-reference-recovery-backup-manifest-v1',
    generatedAt: report.generatedAt,
    projectId: EXPECTED_PROJECT_ID,
    tenantId: TENANT_ID,
    mode: 'read_only_backup_manifest',
    affectedDocuments: affectedDocuments.length,
    proposedChanges: proposals.length,
    documents: affectedDocuments.map((item) => ({
      insurerHash: item.insurerHash,
      country: item.country,
      beforeDocumentHash: item.beforeDocumentHash,
      beforeAccountsHash: item.beforeAccountsHash,
      simulatedAfterAccountsHash: item.simulatedAfterAccountsHash,
      proposalCount: item.proposalCount,
      rollback: item.rollback,
      containsPII: false,
      containsSecrets: false
    })),
    rollbackExact: affectedDocuments.every((item) => item.rollback && item.rollback.originalAccountsHash && item.rollback.exactBeforeStates.length === item.proposalCount),
    writesExecuted: false,
    containsPII: false,
    containsSecrets: false
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(BACKUP_MANIFEST_FILE, `${JSON.stringify(backupManifest, null, 2)}\n`, 'utf8');

  console.log(`ORBIT360_BANK_REFERENCE_RECOVERY_DRY_RUN:${JSON.stringify({ recoveryReady: report.recoveryReady, proposedChanges: proposals.length, affectedDocuments: affectedDocuments.length, projectedValidRefs: report.proposal.projectedValidRefs, projectedPendingRefs: report.proposal.projectedPendingRefs, blockers: blockers.length, writesExecuted: false, containsSecrets: false })}`);
  if (!report.recoveryReady) process.exit(1);
}

main().catch((error) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    schemaVersion: 'orbit360-bank-reference-recovery-dry-run-v1',
    generatedAt: new Date().toISOString(),
    projectId: EXPECTED_PROJECT_ID,
    tenantId: TENANT_ID,
    mode: 'read_only_dry_run',
    writesExecuted: false,
    deployExecuted: false,
    migrationExecuted: false,
    containsPII: false,
    containsSecrets: false,
    recoveryReady: false,
    errorCode: clean(error && (error.code || error.message) || error || 'unknown', 180).replace(/[^A-Za-z0-9_.:-]/g, '_')
  };
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.error(payload.errorCode);
  process.exit(1);
});
