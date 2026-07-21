#!/usr/bin/env node
'use strict';

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'ays-orbit-360-lab';
const EXPECTED_PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const SECRET_ID = process.env.ORBIT360_CREDENTIAL_SECRET_ID || 'orbit360-insurer-credentials-alianzas-soluciones';
const SECRET_PARENT = `projects/${EXPECTED_PROJECT_ID}/secrets/${SECRET_ID}`;
const SECRET_LATEST = `${SECRET_PARENT}/versions/latest`;
const EXPECTED_RAW = Number(process.env.ORBIT360_EXPECTED_BANK_ACCOUNTS || 91);
const MAX_SECRET_BYTES = 62000;
const OUT_FILE = path.resolve('orbit360-platform/lab-bank-account-migration.json');

function fail(code, detail = '') {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function clean(value, max = 512) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mask(value) {
  const compact = clean(value, 240).replace(/\s+/g, '');
  if (!compact) return '';
  return compact.length <= 4 ? '••••' : `•••• ${compact.slice(-4)}`;
}

function stableRef(insurerId, accountId) {
  return `acct_${crypto.createHash('sha256')
    .update(`${TENANT_ID}|bank_account|${clean(insurerId, 160)}|${clean(accountId, 160)}`)
    .digest('hex')
    .slice(0, 32)}`;
}

function emptyVault() {
  return {
    schemaVersion: 'orbit360-insurer-credentials-v1',
    tenantId: TENANT_ID,
    updatedAt: new Date().toISOString(),
    records: {},
    bankAccounts: {},
    bankAccountMigrationBackups: {}
  };
}

function sanitizeError(error) {
  return clean(error && (error.code || error.message) || error || 'unknown', 180).replace(/[^A-Za-z0-9_.:-]/g, '_');
}

async function readVault(client) {
  try {
    const [version] = await client.accessSecretVersion({ name: SECRET_LATEST });
    const text = version && version.payload && version.payload.data
      ? Buffer.from(version.payload.data).toString('utf8')
      : '';
    if (!text) return emptyVault();
    const parsed = JSON.parse(text);
    if (parsed.schemaVersion !== 'orbit360-insurer-credentials-v1' || parsed.tenantId !== TENANT_ID) {
      fail('VAULT_CONTRACT_MISMATCH');
    }
    parsed.records = parsed.records && typeof parsed.records === 'object' ? parsed.records : {};
    parsed.bankAccounts = parsed.bankAccounts && typeof parsed.bankAccounts === 'object' ? parsed.bankAccounts : {};
    parsed.bankAccountMigrationBackups = parsed.bankAccountMigrationBackups && typeof parsed.bankAccountMigrationBackups === 'object'
      ? parsed.bankAccountMigrationBackups
      : {};
    return parsed;
  } catch (error) {
    if (error && error.code === 'VAULT_CONTRACT_MISMATCH') throw error;
    if (Number(error && error.code) === 5) return emptyVault();
    throw error;
  }
}

async function writeVault(client, vault) {
  vault.updatedAt = new Date().toISOString();
  const payload = Buffer.from(JSON.stringify(vault), 'utf8');
  if (payload.byteLength > MAX_SECRET_BYTES) fail('VAULT_CAPACITY_EXCEEDED', String(payload.byteLength));
  const [version] = await client.addSecretVersion({ parent: SECRET_PARENT, payload: { data: payload } });
  return { versionName: clean(version && version.name, 300), bytes: payload.byteLength };
}

function initAdmin() {
  if (PROJECT_ID !== EXPECTED_PROJECT_ID) fail('PROJECT_MISMATCH', PROJECT_ID);
  if (getApps().length) return getApps()[0];
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile || !fs.existsSync(keyFile)) fail('SERVICE_ACCOUNT_FILE_REQUIRED');
  const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  if (serviceAccount.project_id !== EXPECTED_PROJECT_ID) fail('SERVICE_ACCOUNT_PROJECT_MISMATCH');
  return initializeApp({ credential: cert(serviceAccount), projectId: EXPECTED_PROJECT_ID });
}

async function inspect(db) {
  const snapshot = await db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras').get();
  const insurers = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
  let rawCount = 0;
  let refCount = 0;
  const originals = {};
  const prepared = [];
  const vaultRecords = [];

  for (const insurer of insurers) {
    const accounts = [].concat(insurer.cuentas || []);
    originals[insurer.id] = clone(accounts);
    const next = accounts.map((account, index) => {
      const row = { ...(account || {}) };
      const accountId = clean(row.id || `account_${String(index + 1).padStart(3, '0')}`, 160);
      const number = clean(row.numero || row.accountNumber, 240);
      const existingRef = clean(row.accountRef, 80);
      row.id = accountId;
      if (number) {
        rawCount += 1;
        const accountRef = stableRef(insurer.id, accountId);
        vaultRecords.push({
          accountRef,
          insurerId: insurer.id,
          accountId,
          accountNumber: number,
          bank: clean(row.banco, 160),
          accountType: clean(row.tipo, 120),
          currency: clean(row.moneda, 20)
        });
        row.numeroHint = clean(row.numeroHint, 40) || mask(number);
        row.accountRef = accountRef;
        row.estado = 'Cuenta protegida disponible';
        row.legacyPlaintextPendingMigration = false;
        row.secretoExpuesto = false;
        row.migratedToVaultAt = new Date().toISOString();
        delete row.numero;
        delete row.accountNumber;
        delete row.secureAccountRef;
      } else if (existingRef) {
        refCount += 1;
      }
      return row;
    });
    prepared.push({ id: insurer.id, before: accounts, after: next });
  }

  return { insurers, originals, prepared, vaultRecords, rawCount, refCount };
}

async function verifyFirestore(db) {
  const snapshot = await db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras').get();
  let rawCount = 0;
  let refCount = 0;
  snapshot.docs.forEach((doc) => {
    [].concat((doc.data() || {}).cuentas || []).forEach((account) => {
      if (clean(account && (account.numero || account.accountNumber), 240)) rawCount += 1;
      if (/^acct_[a-f0-9]{32}$/.test(clean(account && account.accountRef, 80))) refCount += 1;
    });
  });
  return { rawCount, refCount, insurerCount: snapshot.size };
}

async function restoreFirestore(db, originals) {
  const batch = db.batch();
  const collection = db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras');
  Object.entries(originals).forEach(([id, cuentas]) => {
    batch.set(collection.doc(id), { cuentas, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  await batch.commit();
}

async function main() {
  const report = {
    schemaVersion: 'orbit360-bank-account-vault-migration-v1',
    generatedAt: new Date().toISOString(),
    projectId: EXPECTED_PROJECT_ID,
    tenantId: TENANT_ID,
    containsPII: false,
    containsSecrets: false,
    readOnlyBeforeMigration: true,
    expectedRawAccounts: EXPECTED_RAW,
    ok: false
  };

  let previousVault = null;
  let vaultWritten = false;
  let originals = null;
  const client = new SecretManagerServiceClient();
  const app = initAdmin();
  const db = getFirestore(app);

  try {
    const state = await inspect(db);
    report.before = {
      insurers: state.insurers.length,
      rawAccounts: state.rawCount,
      secureRefs: state.refCount
    };

    if (state.rawCount === 0) {
      const verified = await verifyFirestore(db);
      report.after = verified;
      report.idempotent = true;
      report.ok = verified.rawCount === 0 && verified.refCount >= EXPECTED_RAW && verified.insurerCount === 26;
      if (!report.ok) fail('IDEMPOTENT_STATE_INCOMPLETE', `${verified.refCount}`);
      return report;
    }

    if (state.insurers.length !== 26) fail('INSURER_COUNT_INVALID', String(state.insurers.length));
    if (state.rawCount !== EXPECTED_RAW) fail('RAW_ACCOUNT_COUNT_CHANGED', String(state.rawCount));

    previousVault = await readVault(client);
    const nextVault = clone(previousVault);
    const batchId = `bank_migration_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
    nextVault.bankAccounts = nextVault.bankAccounts || {};
    nextVault.bankAccountMigrationBackups = nextVault.bankAccountMigrationBackups || {};
    nextVault.bankAccountMigrationBackups[batchId] = {
      schemaVersion: 'orbit360-bank-account-migration-backup-v1',
      tenantId: TENANT_ID,
      createdAt: new Date().toISOString(),
      insurerCount: state.insurers.length,
      accountCount: state.rawCount,
      originals: state.originals
    };
    state.vaultRecords.forEach((record) => {
      nextVault.bankAccounts[record.accountRef] = {
        schemaVersion: 'orbit360-insurer-bank-account-record-v1',
        tenantId: TENANT_ID,
        insurerId: record.insurerId,
        accountId: record.accountId,
        accountNumber: record.accountNumber,
        bank: record.bank,
        accountType: record.accountType,
        currency: record.currency,
        migrationBatchId: batchId,
        updatedAt: new Date().toISOString()
      };
    });

    const vaultWrite = await writeVault(client, nextVault);
    vaultWritten = true;
    const confirmedVault = await readVault(client);
    const confirmedRecords = state.vaultRecords.filter((record) => {
      const stored = confirmedVault.bankAccounts && confirmedVault.bankAccounts[record.accountRef];
      return stored && stored.insurerId === record.insurerId && stored.accountId === record.accountId && clean(stored.accountNumber, 240);
    }).length;
    if (confirmedRecords !== state.rawCount) fail('VAULT_READ_AFTER_WRITE_FAILED', String(confirmedRecords));

    const collection = db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras');
    const batch = db.batch();
    state.prepared.forEach((item) => {
      batch.set(collection.doc(item.id), {
        cuentas: item.after,
        sensitiveResourceStatus: 'migrated_securely',
        bankAccountMigrationBatchId: batchId,
        bankAccountMigrationAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();

    const verified = await verifyFirestore(db);
    if (verified.rawCount !== 0 || verified.refCount < state.rawCount || verified.insurerCount !== 26) {
      fail('FIRESTORE_READ_AFTER_WRITE_FAILED', `${verified.rawCount}:${verified.refCount}:${verified.insurerCount}`);
    }

    await db.collection('tenantId').doc(TENANT_ID).collection('importBatches').doc(batchId).set({
      schemaVersion: 'orbit360-bank-account-migration-batch-v1',
      tenantId: TENANT_ID,
      sourceType: 'legacy_insurer_bank_accounts',
      status: 'completed',
      insurerCount: 26,
      migratedAccounts: state.rawCount,
      rawAccountsRemaining: 0,
      secureRefsConfirmed: verified.refCount,
      vaultVersionCreated: Boolean(vaultWrite.versionName),
      rollbackProtected: true,
      containsPII: false,
      containsSecrets: false,
      createdAt: FieldValue.serverTimestamp()
    });
    await db.collection('tenantId').doc(TENANT_ID).collection('auditLog').add({
      schemaVersion: 'orbit360-bank-account-migration-audit-v1',
      tenantId: TENANT_ID,
      action: 'migrate_bank_accounts_to_secure_vault',
      batchId,
      insurerCount: 26,
      migratedAccounts: state.rawCount,
      result: 'success',
      rollbackProtected: true,
      containsPII: false,
      containsSecrets: false,
      createdAt: FieldValue.serverTimestamp()
    });

    report.batchId = batchId;
    report.vault = { recordsConfirmed: confirmedRecords, bytes: vaultWrite.bytes, versionCreated: true };
    report.after = verified;
    report.idempotent = false;
    report.rollbackProtected = true;
    report.ok = true;
    return report;
  } catch (error) {
    report.errorCode = sanitizeError(error);
    report.rollbackAttempted = Boolean(originals || previousVault);
    try {
      if (originals) await restoreFirestore(db, originals);
      if (vaultWritten && previousVault) await writeVault(client, previousVault);
      report.rollbackCompleted = true;
    } catch (rollbackError) {
      report.rollbackCompleted = false;
      report.rollbackErrorCode = sanitizeError(rollbackError);
    }
    throw Object.assign(error, { report });
  } finally {
    fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`);
  }
}

try {
  const result = await main();
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`ORBIT360_BANK_ACCOUNT_MIGRATION:${JSON.stringify({ ok: result.ok, before: result.before, after: result.after, idempotent: result.idempotent, containsSecrets: false })}`);
  if (!result.ok) process.exit(1);
} catch (error) {
  const report = error && error.report ? error.report : { ok: false, errorCode: sanitizeError(error), containsPII: false, containsSecrets: false };
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`);
  console.error(`ORBIT360_BANK_ACCOUNT_MIGRATION_FAILED:${JSON.stringify({ ok: false, errorCode: report.errorCode, rollbackCompleted: report.rollbackCompleted, containsSecrets: false })}`);
  process.exit(1);
}
