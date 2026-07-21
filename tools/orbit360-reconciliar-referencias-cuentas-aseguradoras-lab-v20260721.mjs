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
const SECRET_ID = 'orbit360-ays-insurer-bank-accounts';
const EXPECTED_INSURERS = 26;
const EXPECTED_ACCOUNTS = Number(process.env.ORBIT360_EXPECTED_BANK_ACCOUNTS || 91);
const EXPECTED_VALID_REFS = Number(process.env.ORBIT360_EXPECTED_CURRENT_VALID_BANK_REFS || 23);
const EXPECTED_REPAIR = Number(process.env.ORBIT360_EXPECTED_BANK_REF_REPAIR || 68);
const OUT_FILE = path.resolve('orbit360-platform/runtime-gate-real-insurer-directories-v20260720/bank-reference-reconciliation-sanitizado.json');
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

const report = {
  schemaVersion: 'orbit360-bank-reference-reconciliation-v2',
  generatedAt: new Date().toISOString(),
  projectId: EXPECTED_PROJECT_ID,
  tenantId: TENANT_ID,
  mode: 'read_only',
  expected: {
    insurers: EXPECTED_INSURERS,
    accounts: EXPECTED_ACCOUNTS,
    preRepairValidReferences: EXPECTED_VALID_REFS,
    preRepairCount: EXPECTED_REPAIR,
    completedValidReferences: EXPECTED_ACCOUNTS
  },
  containsPII: false,
  containsSecrets: false,
  checks: {},
  state: 'unknown',
  repairReady: false,
  alreadyRepaired: false,
  ok: false
};

try {
  const app = initAdmin();
  const db = getFirestore(app);
  const secretClient = new SecretManagerServiceClient();
  const [snapshot, vault] = await Promise.all([
    db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras').get(),
    readVault(secretClient)
  ]);

  const vaultMap = new Map();
  let vaultInvalid = 0;
  let vaultDuplicates = 0;
  vault.bankAccounts.forEach((item) => {
    const key = accountKey(item && item.insurerId, item && item.accountId);
    const ref = clean(item && item.accountRef, 80);
    if (!key || key === '::' || !REF_RE.test(ref)) {
      vaultInvalid += 1;
      return;
    }
    if (vaultMap.has(key)) vaultDuplicates += 1;
    vaultMap.set(key, ref);
  });

  let accountRows = 0;
  let rawCount = 0;
  let currentValidRefs = 0;
  let repairNeeded = 0;
  let matchedAccounts = 0;
  let currentWithoutVault = 0;
  let currentDuplicateKeys = 0;
  const currentKeys = new Set();

  snapshot.docs.forEach((doc) => {
    const insurerId = doc.id;
    const data = doc.data() || {};
    [].concat(data.cuentas || []).forEach((account) => {
      accountRows += 1;
      const key = accountKey(insurerId, account && account.id);
      const raw = clean(account && (account.numero || account.accountNumber), 240);
      const currentRef = clean(account && account.accountRef, 80);
      if (raw) rawCount += 1;
      if (currentKeys.has(key)) currentDuplicateKeys += 1;
      currentKeys.add(key);
      const vaultRef = vaultMap.get(key);
      if (!vaultRef) {
        currentWithoutVault += 1;
        return;
      }
      matchedAccounts += 1;
      if (currentRef === vaultRef && REF_RE.test(currentRef)) currentValidRefs += 1;
      else repairNeeded += 1;
    });
  });

  let vaultWithoutCurrent = 0;
  vaultMap.forEach((_ref, key) => { if (!currentKeys.has(key)) vaultWithoutCurrent += 1; });

  report.inventory = {
    insurerCount: snapshot.size,
    accountRows,
    vaultRecords: vault.bankAccounts.length,
    vaultValidRecords: vaultMap.size,
    rawCount,
    currentValidRefs,
    repairNeeded,
    matchedAccounts,
    currentWithoutVault,
    vaultWithoutCurrent,
    currentDuplicateKeys,
    vaultInvalid,
    vaultDuplicates
  };

  const commonChecks = {
    insurerCountPreserved: snapshot.size === EXPECTED_INSURERS,
    accountRowsExact: accountRows === EXPECTED_ACCOUNTS,
    vaultRecordsExact: vault.bankAccounts.length === EXPECTED_ACCOUNTS,
    vaultValidExact: vaultMap.size === EXPECTED_ACCOUNTS,
    rawValuesAbsent: rawCount === 0,
    allAccountsMatched: matchedAccounts === EXPECTED_ACCOUNTS,
    noCurrentOrphans: currentWithoutVault === 0,
    noVaultOrphans: vaultWithoutCurrent === 0,
    noDuplicateCurrentKeys: currentDuplicateKeys === 0,
    noInvalidVaultRecords: vaultInvalid === 0,
    noDuplicateVaultRecords: vaultDuplicates === 0
  };
  const commonReady = Object.values(commonChecks).every(Boolean);
  const repairState = currentValidRefs === EXPECTED_VALID_REFS && repairNeeded === EXPECTED_REPAIR;
  const completeState = currentValidRefs === EXPECTED_ACCOUNTS && repairNeeded === 0;

  report.checks = Object.assign({}, commonChecks, {
    preRepairStateExact: repairState,
    completedStateExact: completeState
  });
  report.repairReady = commonReady && repairState;
  report.alreadyRepaired = commonReady && completeState;
  report.state = report.repairReady ? 'repair_required' : report.alreadyRepaired ? 'already_repaired' : 'inconsistent';
  report.ok = report.repairReady || report.alreadyRepaired;
  if (!report.ok) report.errorCode = 'REFERENCE_RECONCILIATION_NOT_READY';
} catch (error) {
  report.errorCode = sanitizeError(error);
  report.ok = false;
  report.repairReady = false;
  report.alreadyRepaired = false;
  report.state = 'error';
} finally {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

console.log(`ORBIT360_BANK_REFERENCE_RECONCILIATION:${JSON.stringify({ ok: report.ok, state: report.state, repairReady: report.repairReady, alreadyRepaired: report.alreadyRepaired, inventory: report.inventory || {}, checks: report.checks, errorCode: report.errorCode || '', containsSecrets: false })}`);
if (!report.ok) process.exit(1);
