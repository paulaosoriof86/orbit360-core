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
const ACCOUNT_REF_RE = /^acct_[a-f0-9]{32}$/;
const OUT_DIR = path.resolve('orbit360-platform/runtime-incident-importer-20260721');
const OUT_FILE = path.join(OUT_DIR, 'bank-account-identity-drift-sanitizado.json');

function clean(value, max = 220) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}

function fold(value) {
  return clean(value, 300)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hash(value, size = 16) {
  return crypto.createHash('sha256').update(String(value == null ? '' : value)).digest('hex').slice(0, size);
}

function digitsLast4(value) {
  const digits = clean(value, 320).replace(/[^0-9]/g, '');
  return digits.length >= 4 ? digits.slice(-4) : digits;
}

function accountRef(row) {
  return clean(row && (row.accountRef || row.secureAccountRef || row.cuentaRef), 100);
}

function accountId(row, index) {
  return clean(row && (row.id || row.accountId || row.resourceId || String(index)), 180);
}

function fingerprint(bank, type, currency, last4) {
  return [fold(bank), fold(type), fold(currency), clean(last4, 8)].join('|');
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
  return vault.bankAccounts && typeof vault.bankAccounts === 'object' ? vault.bankAccounts : {};
}

async function main() {
  const app = initAdmin();
  const db = getFirestore(app);
  const [snapshot, bankAccounts] = await Promise.all([
    db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras').get(),
    readVault()
  ]);

  const docs = new Map();
  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    const country = clean(data.pais || data.country, 12).toUpperCase();
    const accounts = [].concat(data.cuentas || []).map((row, index) => ({
      index,
      id: accountId(row, index),
      ref: accountRef(row),
      bank: clean(row && row.banco, 180),
      type: clean(row && row.tipo, 140),
      currency: clean(row && row.moneda, 20),
      last4: digitsLast4(row && row.numeroHint),
      rawPresent: Boolean(clean(row && (row.numero || row.accountNumber), 320))
    }));
    docs.set(doc.id, { country, accounts });
  });

  const vaultRows = Object.entries(bankAccounts).map(([ref, row]) => ({
    ref: clean(ref, 100),
    insurerId: clean(row && row.insurerId, 180),
    oldAccountId: clean(row && row.accountId, 180),
    bank: clean(row && row.bank, 180),
    type: clean(row && row.accountType, 140),
    currency: clean(row && row.currency, 20),
    last4: digitsLast4(row && row.accountNumber),
    valuePresent: Boolean(clean(row && row.accountNumber, 320))
  }));

  let currentValidRefs = 0;
  let currentPendingRefs = 0;
  let rawValues = 0;
  const currentRefSet = new Set();
  docs.forEach((doc) => {
    doc.accounts.forEach((row) => {
      if (ACCOUNT_REF_RE.test(row.ref)) { currentValidRefs += 1; currentRefSet.add(row.ref); }
      if (row.ref === 'backend_required') currentPendingRefs += 1;
      if (row.rawPresent) rawValues += 1;
    });
  });

  const missingVaultRows = vaultRows.filter((row) => !currentRefSet.has(row.ref));
  const matches = [];
  const ambiguous = [];
  const unmatched = [];
  const usedCurrent = new Set();
  let directIdMatches = 0;
  let uniqueFingerprintMatches = 0;
  let idDriftMatches = 0;

  missingVaultRows.forEach((vaultRow) => {
    const doc = docs.get(vaultRow.insurerId);
    if (!doc) {
      unmatched.push({ reason: 'insurer_document_missing', insurerHash: hash(vaultRow.insurerId, 16), oldAccountHash: hash(vaultRow.oldAccountId, 12) });
      return;
    }
    const available = doc.accounts.filter((row) => !ACCOUNT_REF_RE.test(row.ref));
    const direct = available.filter((row) => row.id === vaultRow.oldAccountId);
    const vaultFingerprint = fingerprint(vaultRow.bank, vaultRow.type, vaultRow.currency, vaultRow.last4);
    const byFingerprint = available.filter((row) => fingerprint(row.bank, row.type, row.currency, row.last4) === vaultFingerprint);
    const candidates = direct.length === 1 ? direct : byFingerprint;
    const method = direct.length === 1 ? 'direct_account_id' : 'unique_metadata_fingerprint';

    if (candidates.length === 1) {
      const current = candidates[0];
      const currentKey = `${vaultRow.insurerId}|${current.id}`;
      if (usedCurrent.has(currentKey)) {
        ambiguous.push({ reason: 'current_account_reused', insurerHash: hash(vaultRow.insurerId, 16), oldAccountHash: hash(vaultRow.oldAccountId, 12), currentAccountHash: hash(current.id, 12), fingerprintHash: hash(vaultFingerprint, 12) });
        return;
      }
      usedCurrent.add(currentKey);
      if (method === 'direct_account_id') directIdMatches += 1;
      else uniqueFingerprintMatches += 1;
      if (current.id !== vaultRow.oldAccountId) idDriftMatches += 1;
      matches.push({
        insurerHash: hash(vaultRow.insurerId, 16),
        country: doc.country,
        oldAccountHash: hash(vaultRow.oldAccountId, 12),
        currentAccountHash: hash(current.id, 12),
        currentIndex: current.index,
        refHash: hash(vaultRow.ref, 12),
        fingerprintHash: hash(vaultFingerprint, 12),
        method,
        idChanged: current.id !== vaultRow.oldAccountId,
        currentState: current.ref === 'backend_required' ? 'backend_required' : (current.ref ? 'other' : 'empty'),
        containsPII: false,
        containsSecrets: false
      });
      return;
    }

    if (candidates.length > 1) {
      ambiguous.push({
        reason: 'multiple_candidates',
        insurerHash: hash(vaultRow.insurerId, 16),
        oldAccountHash: hash(vaultRow.oldAccountId, 12),
        fingerprintHash: hash(vaultFingerprint, 12),
        candidateCount: candidates.length,
        candidateHashes: candidates.map((row) => hash(row.id, 12)).sort()
      });
      return;
    }

    unmatched.push({
      reason: 'no_candidate',
      insurerHash: hash(vaultRow.insurerId, 16),
      country: doc.country,
      oldAccountHash: hash(vaultRow.oldAccountId, 12),
      fingerprintHash: hash(vaultFingerprint, 12),
      vaultBankHash: hash(fold(vaultRow.bank), 10),
      vaultTypeHash: hash(fold(vaultRow.type), 10),
      currency: vaultRow.currency,
      last4Hash: hash(vaultRow.last4, 8),
      availableCurrentCount: available.length
    });
  });

  const matchedCurrentKeys = new Set(matches.map((row) => `${row.insurerHash}|${row.currentAccountHash}`));
  const pendingWithoutVault = [];
  docs.forEach((doc, insurerId) => {
    doc.accounts.filter((row) => !ACCOUNT_REF_RE.test(row.ref)).forEach((row) => {
      const key = `${hash(insurerId, 16)}|${hash(row.id, 12)}`;
      if (!matchedCurrentKeys.has(key)) {
        pendingWithoutVault.push({
          insurerHash: hash(insurerId, 16),
          country: doc.country,
          currentAccountHash: hash(row.id, 12),
          currentState: row.ref === 'backend_required' ? 'backend_required' : (row.ref ? 'other' : 'empty'),
          fingerprintHash: hash(fingerprint(row.bank, row.type, row.currency, row.last4), 12)
        });
      }
    });
  });

  const countryCounts = matches.reduce((acc, row) => {
    acc[row.country || ''] = (acc[row.country || ''] || 0) + 1;
    return acc;
  }, {});

  const checks = {
    insurerCountPreserved: snapshot.size === 26,
    vaultRowsPreserved: vaultRows.length === 91,
    vaultValuesPresent: vaultRows.filter((row) => row.valuePresent).length === 91,
    currentStateExpected: currentValidRefs === 23 && currentPendingRefs === 70,
    rawValuesAbsent: rawValues === 0,
    missingVaultRefsExpected: missingVaultRows.length === 68,
    allMissingVaultRefsUniquelyMatched: matches.length === 68,
    directIdMatchesZeroOrExpected: directIdMatches === 0,
    idDriftConfirmed: idDriftMatches === 68,
    ambiguousZero: ambiguous.length === 0,
    unmatchedZero: unmatched.length === 0,
    gtOnly: Number(countryCounts.GT || 0) === 68 && Number(countryCounts.CO || 0) === 0,
    pendingWithoutVaultExpected: pendingWithoutVault.length === 2,
    writesExecuted: false,
    containsSecrets: false,
    containsPII: false
  };

  const report = {
    schemaVersion: 'orbit360-bank-account-identity-drift-v1',
    generatedAt: new Date().toISOString(),
    projectId: EXPECTED_PROJECT_ID,
    tenantId: TENANT_ID,
    mode: 'read_only_identity_diagnosis',
    writesExecuted: false,
    deployExecuted: false,
    migrationExecuted: false,
    containsPII: false,
    containsSecrets: false,
    summary: {
      insurerCount: snapshot.size,
      vaultRows: vaultRows.length,
      currentValidRefs,
      currentPendingRefs,
      missingVaultRows: missingVaultRows.length,
      directIdMatches,
      uniqueFingerprintMatches,
      idDriftMatches,
      ambiguous: ambiguous.length,
      unmatched: unmatched.length,
      pendingWithoutVault: pendingWithoutVault.length,
      matchedByCountry: countryCounts
    },
    matches,
    ambiguous,
    unmatched,
    pendingWithoutVault,
    checks,
    identityDiagnosisReady: Object.values(checks).every(Boolean)
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`ORBIT360_BANK_ACCOUNT_IDENTITY_DRIFT:${JSON.stringify({ identityDiagnosisReady: report.identityDiagnosisReady, matches: matches.length, directIdMatches, uniqueFingerprintMatches, idDriftMatches, ambiguous: ambiguous.length, unmatched: unmatched.length, pendingWithoutVault: pendingWithoutVault.length, writesExecuted: false, containsSecrets: false })}`);
  if (!report.identityDiagnosisReady) process.exit(1);
}

main().catch((error) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    schemaVersion: 'orbit360-bank-account-identity-drift-v1',
    generatedAt: new Date().toISOString(),
    projectId: EXPECTED_PROJECT_ID,
    tenantId: TENANT_ID,
    mode: 'read_only_identity_diagnosis',
    writesExecuted: false,
    deployExecuted: false,
    migrationExecuted: false,
    containsPII: false,
    containsSecrets: false,
    identityDiagnosisReady: false,
    errorCode: clean(error && (error.code || error.message) || error || 'unknown', 180).replace(/[^A-Za-z0-9_.:-]/g, '_')
  };
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.error(payload.errorCode);
  process.exit(1);
});
