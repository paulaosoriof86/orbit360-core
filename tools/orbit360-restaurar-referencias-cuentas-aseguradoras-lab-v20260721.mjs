#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
const EXPECTED_PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const SECRET_ID = 'orbit360-ays-insurer-bank-accounts';
const EXPECTED_INSURERS = 26;
const EXPECTED_ACCOUNTS = Number(process.env.ORBIT360_EXPECTED_BANK_ACCOUNTS || 91);
const EXPECTED_REPAIR = Number(process.env.ORBIT360_EXPECTED_BANK_REF_REPAIR || 68);
const REQUIRED_CONFIRMATION = 'CONFIRM_68_REFERENCE_RESTORE';
const RECON_FILE = path.resolve('orbit360-platform/runtime-gate-real-insurer-directories-v20260720/bank-reference-reconciliation-sanitizado.json');
const OUT_FILE = path.resolve('orbit360-platform/runtime-gate-real-insurer-directories-v20260720/bank-reference-repair-sanitizado.json');
const REF_RE = /^acct_[a-f0-9]{32}$/;

function clean(value, max = 180) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}

function fail(code, detail = '') {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function sanitizeError(error) {
  return clean(error && (error.code || error.message) || error || 'unknown')
    .replace(/[^A-Za-z0-9_.:-]/g, '_');
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

function readReconciliation() {
  if (!fs.existsSync(RECON_FILE)) fail('RECONCILIATION_EVIDENCE_REQUIRED');
  const report = JSON.parse(fs.readFileSync(RECON_FILE, 'utf8'));
  if (!report || report.schemaVersion !== 'orbit360-bank-reference-reconciliation-v2' || report.ok !== true) {
    fail('RECONCILIATION_EVIDENCE_INVALID');
  }
  return report;
}

async function readVault(client) {
  const name = `projects/${EXPECTED_PROJECT_ID}/secrets/${SECRET_ID}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name });
  const payload = version && version.payload && version.payload.data
    ? JSON.parse(Buffer.from(version.payload.data).toString('utf8'))
    : null;
  if (!payload || payload.tenantId !== TENANT_ID || !Array.isArray(payload.bankAccounts)) {
    fail('VAULT_PAYLOAD_INVALID');
  }
  return payload;
}

function accountKey(insurerId, accountId) {
  return `${clean(insurerId, 180)}::${clean(accountId, 180)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateConfirmation(reconciliation) {
  const confirmation = clean(process.env.ORBIT360_APPLY_BANK_REF_RECOVERY, 80);
  if (reconciliation.alreadyRepaired === true) return 'already_repaired';
  if (confirmation !== REQUIRED_CONFIRMATION) fail('RECOVERY_CONFIRMATION_REQUIRED');
  if (reconciliation.state !== 'repair_required' || reconciliation.repairReady !== true) {
    fail('RECONCILIATION_NOT_READY_FOR_REPAIR');
  }
  const inventory = reconciliation.inventory || {};
  if (Number(inventory.insurerCount || 0) !== EXPECTED_INSURERS) fail('INSURER_COUNT_MISMATCH');
  if (Number(inventory.accountRows || 0) !== EXPECTED_ACCOUNTS) fail('ACCOUNT_COUNT_MISMATCH');
  if (Number(inventory.rawCount || -1) !== 0) fail('RAW_VALUES_PRESENT');
  if (Number(inventory.repairNeeded || 0) !== EXPECTED_REPAIR) fail('REPAIR_COUNT_MISMATCH');
  return 'repair_required';
}

async function inventoryCurrent(db) {
  const snapshot = await db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras').get();
  let accountRows = 0;
  let rawCount = 0;
  let validRefs = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    [].concat(data.cuentas || []).forEach((account) => {
      accountRows += 1;
      if (clean(account && (account.numero || account.accountNumber), 240)) rawCount += 1;
      if (REF_RE.test(clean(account && account.accountRef, 80))) validRefs += 1;
    });
  });
  return { insurerCount: snapshot.size, accountRows, rawCount, validRefs };
}

const report = {
  schemaVersion: 'orbit360-bank-reference-repair-v1',
  generatedAt: new Date().toISOString(),
  projectId: EXPECTED_PROJECT_ID,
  tenantId: TENANT_ID,
  mode: 'controlled_reference_restore',
  containsPII: false,
  containsSecrets: false,
  repairExecuted: false,
  rollbackExecuted: false,
  idempotent: false,
  ok: false
};

try {
  const reconciliation = readReconciliation();
  const mode = validateConfirmation(reconciliation);
  const app = initAdmin();
  const db = getFirestore(app);

  if (mode === 'already_repaired') {
    const current = await inventoryCurrent(db);
    report.before = current;
    report.after = current;
    report.idempotent = true;
    report.repairExecuted = false;
    report.ok = current.insurerCount === EXPECTED_INSURERS && current.accountRows === EXPECTED_ACCOUNTS && current.rawCount === 0 && current.validRefs === EXPECTED_ACCOUNTS;
    if (!report.ok) report.errorCode = 'IDEMPOTENT_STATE_INVALID';
  } else {
    const secretClient = new SecretManagerServiceClient();
    const [snapshot, vault] = await Promise.all([
      db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras').get(),
      readVault(secretClient)
    ]);

    const vaultMap = new Map();
    vault.bankAccounts.forEach((item) => {
      const key = accountKey(item && item.insurerId, item && item.accountId);
      const ref = clean(item && item.accountRef, 80);
      if (!key || key === '::' || !REF_RE.test(ref) || vaultMap.has(key)) fail('VAULT_REFERENCE_CONTRACT_INVALID');
      vaultMap.set(key, ref);
    });
    if (vaultMap.size !== EXPECTED_ACCOUNTS) fail('VAULT_REFERENCE_COUNT_INVALID');

    const repairId = `bank_ref_repair_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const modifiedDocs = [];
    const protectedRollback = [];
    let repairCount = 0;
    let rawCount = 0;
    let accountRows = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      const originalAccounts = clone([].concat(data.cuentas || []));
      let changed = false;
      const nextAccounts = originalAccounts.map((account) => {
        accountRows += 1;
        if (clean(account && (account.numero || account.accountNumber), 240)) rawCount += 1;
        const key = accountKey(doc.id, account && account.id);
        const targetRef = vaultMap.get(key);
        if (!targetRef) fail('ACCOUNT_WITHOUT_VAULT_REFERENCE');
        const currentRef = clean(account && account.accountRef, 80);
        if (currentRef === targetRef) return account;
        if (REF_RE.test(currentRef) && currentRef !== targetRef) fail('CONFLICTING_VALID_REFERENCE');
        changed = true;
        repairCount += 1;
        protectedRollback.push({ insurerId: doc.id, accountId: clean(account && account.id, 180), previousRef: currentRef });
        return Object.assign({}, account, {
          accountRef: targetRef,
          estado: 'Cuenta protegida confirmada',
          referenceRepairId: repairId,
          referenceRepairedAt: new Date().toISOString()
        });
      });
      if (changed) modifiedDocs.push({ ref: doc.ref, before: originalAccounts, after: nextAccounts });
    });

    if (snapshot.size !== EXPECTED_INSURERS) fail('INSURER_COUNT_MISMATCH');
    if (accountRows !== EXPECTED_ACCOUNTS) fail('ACCOUNT_COUNT_MISMATCH');
    if (rawCount !== 0) fail('RAW_VALUES_PRESENT');
    if (repairCount !== EXPECTED_REPAIR) fail('REPAIR_COUNT_MISMATCH', String(repairCount));
    if (protectedRollback.length !== EXPECTED_REPAIR) fail('ROLLBACK_COUNT_MISMATCH');

    const vaultBackup = clone(vault);
    vaultBackup.referenceRepairHistory = [].concat(vaultBackup.referenceRepairHistory || [], [{
      repairId,
      repairedAt: new Date().toISOString(),
      source: 'vault_reconciliation',
      previousReferences: protectedRollback
    }]).slice(-10);
    vaultBackup.lastReferenceRepair = {
      repairId,
      repairedAt: new Date().toISOString(),
      repairCount,
      rollbackAvailable: true
    };

    const [backupVersion] = await secretClient.addSecretVersion({
      parent: `projects/${EXPECTED_PROJECT_ID}/secrets/${SECRET_ID}`,
      payload: { data: Buffer.from(JSON.stringify(vaultBackup), 'utf8') }
    });
    if (!backupVersion || !backupVersion.name) fail('ROLLBACK_VERSION_NOT_CREATED');

    const batch = db.batch();
    modifiedDocs.forEach((item) => {
      batch.update(item.ref, {
        cuentas: item.after,
        bankReferenceRepair: {
          repairId,
          repairedAt: FieldValue.serverTimestamp(),
          repairCount: item.after.filter((account) => account && account.referenceRepairId === repairId).length,
          source: 'protected_vault_reconciliation'
        },
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    const auditRef = db.collection('tenantId').doc(TENANT_ID).collection('auditoriaImportaciones').doc(`aud_${repairId}`);
    batch.set(auditRef, {
      tenantId: TENANT_ID,
      tipo: 'bank_reference_restore',
      repairId,
      sourceType: 'protected_vault_reconciliation',
      insurerDocumentsModified: modifiedDocs.length,
      referencesRestored: repairCount,
      rawValuesBefore: 0,
      rawValuesAfter: 0,
      rollbackAvailable: true,
      createdAt: FieldValue.serverTimestamp(),
      containsSecrets: false
    }, { merge: true });
    await batch.commit();

    const after = await inventoryCurrent(db);
    report.before = {
      insurerCount: snapshot.size,
      accountRows,
      rawCount,
      validRefs: EXPECTED_ACCOUNTS - repairCount
    };
    report.after = after;
    report.repairExecuted = true;
    report.repairCount = repairCount;
    report.modifiedInsurerDocuments = modifiedDocs.length;
    report.rollbackVersionCreated = true;
    report.rollbackModel = 'secret_version_plus_atomic_firestore_batch';

    const verified = after.insurerCount === EXPECTED_INSURERS && after.accountRows === EXPECTED_ACCOUNTS && after.rawCount === 0 && after.validRefs === EXPECTED_ACCOUNTS;
    if (!verified) {
      const rollbackBatch = db.batch();
      modifiedDocs.forEach((item) => rollbackBatch.update(item.ref, {
        cuentas: item.before,
        bankReferenceRepairRollback: {
          repairId,
          rolledBackAt: FieldValue.serverTimestamp(),
          reason: 'read_after_write_failed'
        },
        updatedAt: FieldValue.serverTimestamp()
      }));
      await rollbackBatch.commit();
      report.rollbackExecuted = true;
      report.errorCode = 'READ_AFTER_WRITE_FAILED_ROLLED_BACK';
      report.ok = false;
    } else {
      report.ok = true;
    }
  }
} catch (error) {
  report.errorCode = sanitizeError(error);
  report.ok = false;
} finally {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

console.log(`ORBIT360_BANK_REFERENCE_REPAIR:${JSON.stringify({ ok: report.ok, repairExecuted: report.repairExecuted, repairCount: report.repairCount || 0, rollbackExecuted: report.rollbackExecuted, idempotent: report.idempotent, before: report.before || {}, after: report.after || {}, errorCode: report.errorCode || '', containsSecrets: false })}`);
if (!report.ok) process.exit(1);
