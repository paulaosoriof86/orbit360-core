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

const clean = (value, max = 512) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const clone = (value) => JSON.parse(JSON.stringify(value));

function fail(code, detail = '') {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function sanitizeError(error) {
  return clean(error && (error.code || error.message) || error || 'unknown', 180).replace(/[^A-Za-z0-9_.:-]/g, '_');
}

function mask(value) {
  const compact = clean(value, 240).replace(/\s+/g, '');
  return compact ? (compact.length <= 4 ? '••••' : `•••• ${compact.slice(-4)}`) : '';
}

function stableRef(insurerId, accountId) {
  const digest = crypto.createHash('sha256')
    .update(`${TENANT_ID}|bank_account|${clean(insurerId, 160)}|${clean(accountId, 160)}`)
    .digest('hex')
    .slice(0, 32);
  return `acct_${digest}`;
}

function initAdmin() {
  if (PROJECT_ID !== EXPECTED_PROJECT_ID) fail('PROJECT_MISMATCH');
  if (getApps().length) return getApps()[0];
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile || !fs.existsSync(keyFile)) fail('SERVICE_ACCOUNT_FILE_REQUIRED');
  const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  if (serviceAccount.project_id !== EXPECTED_PROJECT_ID) fail('SERVICE_ACCOUNT_PROJECT_MISMATCH');
  return initializeApp({ credential: cert(serviceAccount), projectId: EXPECTED_PROJECT_ID });
}

function emptyVault() {
  return {
    schemaVersion: 'orbit360-insurer-credentials-v1',
    tenantId: TENANT_ID,
    updatedAt: new Date().toISOString(),
    records: {},
    bankAccounts: {}
  };
}

async function readVault(client) {
  try {
    const [version] = await client.accessSecretVersion({ name: SECRET_LATEST });
    const text = version && version.payload && version.payload.data
      ? Buffer.from(version.payload.data).toString('utf8')
      : '';
    if (!text) return emptyVault();
    const parsed = JSON.parse(text);
    if (parsed.schemaVersion !== 'orbit360-insurer-credentials-v1' || parsed.tenantId !== TENANT_ID) fail('VAULT_CONTRACT_MISMATCH');
    parsed.records = parsed.records && typeof parsed.records === 'object' ? parsed.records : {};
    parsed.bankAccounts = parsed.bankAccounts && typeof parsed.bankAccounts === 'object' ? parsed.bankAccounts : {};
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
  return { versionCreated: Boolean(version && version.name), bytes: payload.byteLength };
}

async function inventory(db) {
  const snapshot = await db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras').get();
  const docs = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() || {} }));
  let rawCount = 0;
  let refCount = 0;
  const changes = [];
  const secureRecords = [];

  docs.forEach(({ id: insurerId, data }) => {
    const accounts = [].concat(data.cuentas || []);
    const transformed = accounts.map((account, index) => {
      const row = { ...(account || {}) };
      const accountId = clean(row.id || `account_${String(index + 1).padStart(3, '0')}`, 160);
      const number = clean(row.numero || row.accountNumber, 240);
      row.id = accountId;
      if (number) {
        rawCount += 1;
        const accountRef = stableRef(insurerId, accountId);
        secureRecords.push({
          accountRef,
          insurerId,
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
        delete row.numero;
        delete row.accountNumber;
        delete row.secureAccountRef;
      } else if (/^acct_[a-f0-9]{32}$/.test(clean(row.accountRef, 80))) {
        refCount += 1;
      }
      return row;
    });
    changes.push({ insurerId, transformed });
  });

  return { insurerCount: docs.length, rawCount, refCount, changes, secureRecords };
}

async function verify(db) {
  const current = await inventory(db);
  return { insurerCount: current.insurerCount, rawCount: current.rawCount, refCount: current.refCount };
}

async function main() {
  const report = {
    schemaVersion: 'orbit360-bank-account-vault-migration-v2',
    generatedAt: new Date().toISOString(),
    projectId: EXPECTED_PROJECT_ID,
    tenantId: TENANT_ID,
    expectedRawAccounts: EXPECTED_RAW,
    containsPII: false,
    containsSecrets: false,
    ok: false
  };

  const app = initAdmin();
  const db = getFirestore(app);
  const secrets = new SecretManagerServiceClient();

  try {
    const before = await inventory(db);
    report.before = { insurerCount: before.insurerCount, rawCount: before.rawCount, refCount: before.refCount };

    if (before.rawCount === 0) {
      report.after = await verify(db);
      report.idempotent = true;
      report.rollbackModel = 'secret_version_history_plus_atomic_firestore_batch';
      report.ok = report.after.insurerCount === 26 && report.after.rawCount === 0 && report.after.refCount >= EXPECTED_RAW;
      if (!report.ok) fail('IDEMPOTENT_STATE_INCOMPLETE');
      return report;
    }

    if (before.insurerCount !== 26) fail('INSURER_COUNT_INVALID', String(before.insurerCount));
    if (before.rawCount !== EXPECTED_RAW) fail('RAW_ACCOUNT_COUNT_CHANGED', String(before.rawCount));

    const vault = clone(await readVault(secrets));
    vault.bankAccounts = vault.bankAccounts || {};
    const batchId = `bank_migration_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
    before.secureRecords.forEach((record) => {
      vault.bankAccounts[record.accountRef] = {
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

    const vaultWrite = await writeVault(secrets, vault);
    const confirmedVault = await readVault(secrets);
    const confirmed = before.secureRecords.filter((record) => {
      const stored = confirmedVault.bankAccounts && confirmedVault.bankAccounts[record.accountRef];
      return stored && stored.insurerId === record.insurerId && stored.accountId === record.accountId && clean(stored.accountNumber, 240);
    }).length;
    if (confirmed !== before.rawCount) fail('VAULT_READ_AFTER_WRITE_FAILED', String(confirmed));

    const batch = db.batch();
    const collection = db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras');
    before.changes.forEach((change) => {
      batch.set(collection.doc(change.insurerId), {
        cuentas: change.transformed,
        sensitiveResourceStatus: 'migrated_securely',
        bankAccountMigrationBatchId: batchId,
        bankAccountMigrationAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();

    const after = await verify(db);
    if (after.insurerCount !== 26 || after.rawCount !== 0 || after.refCount < before.rawCount) {
      fail('FIRESTORE_READ_AFTER_WRITE_FAILED', `${after.insurerCount}:${after.rawCount}:${after.refCount}`);
    }

    await db.collection('tenantId').doc(TENANT_ID).collection('importBatches').doc(batchId).set({
      schemaVersion: 'orbit360-bank-account-migration-batch-v2',
      tenantId: TENANT_ID,
      sourceType: 'legacy_insurer_bank_accounts',
      status: 'completed',
      insurerCount: 26,
      migratedAccounts: before.rawCount,
      rawAccountsRemaining: 0,
      secureRefsConfirmed: after.refCount,
      vaultVersionCreated: vaultWrite.versionCreated,
      rollbackModel: 'secret_version_history_plus_atomic_firestore_batch',
      containsPII: false,
      containsSecrets: false,
      createdAt: FieldValue.serverTimestamp()
    });

    report.batchId = batchId;
    report.vault = { recordsConfirmed: confirmed, bytes: vaultWrite.bytes, versionCreated: vaultWrite.versionCreated };
    report.after = after;
    report.idempotent = false;
    report.rollbackModel = 'secret_version_history_plus_atomic_firestore_batch';
    report.ok = true;
    return report;
  } catch (error) {
    report.errorCode = sanitizeError(error);
    report.rollbackModel = 'secret_version_history_plus_atomic_firestore_batch';
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
  console.error(`ORBIT360_BANK_ACCOUNT_MIGRATION_FAILED:${JSON.stringify({ ok: false, errorCode: report.errorCode, containsSecrets: false })}`);
  process.exit(1);
}
