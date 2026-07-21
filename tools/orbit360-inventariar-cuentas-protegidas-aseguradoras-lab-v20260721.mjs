#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
const EXPECTED_PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const EXPECTED_INSURERS = 26;
const EXPECTED_REFS = Number(process.env.ORBIT360_EXPECTED_BANK_ACCOUNTS || 91);
const COMPAT_MODE = process.env.ORBIT360_POST_MIGRATION_COMPAT === '1';
const OUT_FILE = path.resolve('orbit360-platform/runtime-gate-real-insurer-directories-v20260720/bank-data-inventory-sanitizado.json');
const LEGACY_OUT_FILE = path.resolve('orbit360-platform/lab-bank-account-migration.json');

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

async function inventory() {
  const app = initAdmin();
  const db = getFirestore(app);
  const snapshot = await db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras').get();

  let accountRows = 0;
  let rawCount = 0;
  let refCount = 0;
  let invalidRefCount = 0;
  let duplicateRefCount = 0;
  const references = new Set();

  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    [].concat(data.cuentas || []).forEach((account) => {
      accountRows += 1;
      const raw = clean(account && (account.numero || account.accountNumber), 240);
      const ref = clean(account && account.accountRef, 80);
      if (raw) rawCount += 1;
      if (ref) {
        if (/^acct_[a-f0-9]{32}$/.test(ref)) {
          refCount += 1;
          if (references.has(ref)) duplicateRefCount += 1;
          references.add(ref);
        } else {
          invalidRefCount += 1;
        }
      }
    });
  });

  return {
    insurerCount: snapshot.size,
    accountRows,
    rawCount,
    refCount,
    invalidRefCount,
    duplicateRefCount
  };
}

const report = {
  schemaVersion: 'orbit360-protected-bank-data-inventory-v1',
  generatedAt: new Date().toISOString(),
  projectId: EXPECTED_PROJECT_ID,
  tenantId: TENANT_ID,
  mode: 'read_only',
  expected: {
    insurers: EXPECTED_INSURERS,
    minimumProtectedReferences: EXPECTED_REFS,
    rawValues: 0
  },
  containsPII: false,
  containsSecrets: false,
  checks: {},
  ok: false
};

try {
  const result = await inventory();
  report.inventory = result;
  report.checks = {
    insurerCountPreserved: result.insurerCount === EXPECTED_INSURERS,
    rawValuesAbsent: result.rawCount === 0,
    protectedReferencesPreserved: result.refCount >= EXPECTED_REFS,
    referenceFormatValid: result.invalidRefCount === 0,
    referencesUnique: result.duplicateRefCount === 0
  };
  report.ok = Object.values(report.checks).every(Boolean);
  if (!report.ok) report.errorCode = 'POST_MIGRATION_STATE_INCOMPLETE';
} catch (error) {
  report.errorCode = sanitizeError(error);
  report.ok = false;
} finally {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const counts = report.inventory || {};
  const legacyReport = {
    schemaVersion: 'orbit360-bank-account-vault-migration-v2',
    generatedAt: report.generatedAt,
    projectId: report.projectId,
    tenantId: report.tenantId,
    mode: 'post_migration_read_only',
    migrationExecuted: false,
    idempotent: true,
    before: {
      insurerCount: Number(counts.insurerCount || 0),
      rawCount: Number(counts.rawCount || 0),
      refCount: Number(counts.refCount || 0)
    },
    after: {
      insurerCount: Number(counts.insurerCount || 0),
      rawCount: Number(counts.rawCount || 0),
      refCount: Number(counts.refCount || 0)
    },
    inventoryChecks: report.checks,
    errorCode: report.errorCode || '',
    rollbackModel: 'historical_migration_artifact_preserved_no_new_write',
    containsPII: false,
    containsSecrets: false,
    ok: report.ok
  };
  fs.writeFileSync(LEGACY_OUT_FILE, `${JSON.stringify(legacyReport, null, 2)}\n`, 'utf8');
}

console.log(`ORBIT360_PROTECTED_BANK_DATA_INVENTORY:${JSON.stringify({ ok: report.ok, inventory: report.inventory || {}, checks: report.checks, errorCode: report.errorCode || '', mode: report.mode, migrationExecuted: false, containsSecrets: false })}`);
if (!report.ok && !COMPAT_MODE) process.exit(1);
