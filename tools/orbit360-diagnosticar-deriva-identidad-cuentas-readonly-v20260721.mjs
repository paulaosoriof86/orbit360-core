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
const OUT = path.resolve('orbit360-platform/runtime-incident-importer-20260721/bank-account-identity-drift-sanitizado.json');
const REF_RE = /^acct_[a-f0-9]{32}$/;

const clean = (v, n = 240) => String(v == null ? '' : v).replace(/\u0000/g, '').trim().slice(0, n);
const fold = (v) => clean(v, 320).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const h = (v, n = 16) => crypto.createHash('sha256').update(String(v == null ? '' : v)).digest('hex').slice(0, n);
const last4 = (v) => { const d = clean(v, 320).replace(/\D/g, ''); return d.length >= 4 ? d.slice(-4) : d; };
const refOf = (r) => clean(r && (r.accountRef || r.secureAccountRef || r.cuentaRef), 100);
const idOf = (r, i) => clean(r && (r.id || r.accountId || r.resourceId || String(i)), 180);
const fp = (b, t, c, l) => [fold(b), fold(t), fold(c), clean(l, 8)].join('|');

function fail(code) { const e = new Error(code); e.code = code; throw e; }
function init() {
  const project = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
  if (project !== PROJECT) fail('PROJECT_MISMATCH');
  if (getApps().length) return getApps()[0];
  const key = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!key || !fs.existsSync(key)) fail('SERVICE_ACCOUNT_FILE_REQUIRED');
  const sa = JSON.parse(fs.readFileSync(key, 'utf8'));
  if (sa.project_id !== PROJECT) fail('SERVICE_ACCOUNT_PROJECT_MISMATCH');
  return initializeApp({ credential: cert(sa), projectId: PROJECT });
}
async function vaultRows() {
  const client = new SecretManagerServiceClient();
  const [v] = await client.accessSecretVersion({ name: SECRET });
  const text = v && v.payload && v.payload.data ? Buffer.from(v.payload.data).toString('utf8') : '';
  if (!text) fail('VAULT_EMPTY');
  const vault = JSON.parse(text);
  if (vault.schemaVersion !== 'orbit360-insurer-credentials-v1' || vault.tenantId !== TENANT) fail('VAULT_CONTRACT_MISMATCH');
  return Object.entries(vault.bankAccounts || {}).map(([ref, r]) => ({
    ref: clean(ref, 100), insurerId: clean(r.insurerId, 180), oldId: clean(r.accountId, 180),
    bank: clean(r.bank, 180), type: clean(r.accountType, 140), currency: clean(r.currency, 20),
    last4: last4(r.accountNumber), valuePresent: Boolean(clean(r.accountNumber, 320))
  }));
}

async function main() {
  const db = getFirestore(init());
  const [snap, vault] = await Promise.all([
    db.collection('tenantId').doc(TENANT).collection('aseguradoras').get(),
    vaultRows()
  ]);
  const docs = new Map();
  let validRefs = 0, pendingRefs = 0, rawValues = 0;
  const currentRefs = new Set();
  snap.docs.forEach((d) => {
    const data = d.data() || {};
    const country = clean(data.pais || data.country, 12).toUpperCase();
    const accounts = [].concat(data.cuentas || []).map((r, i) => {
      const ref = refOf(r);
      if (REF_RE.test(ref)) { validRefs += 1; currentRefs.add(ref); }
      if (ref === 'backend_required') pendingRefs += 1;
      if (clean(r && (r.numero || r.accountNumber), 320)) rawValues += 1;
      return { i, id: idOf(r, i), ref, bank: clean(r && r.banco, 180), type: clean(r && r.tipo, 140), currency: clean(r && r.moneda, 20), last4: last4(r && r.numeroHint) };
    });
    docs.set(d.id, { country, accounts });
  });

  const missing = vault.filter((r) => !currentRefs.has(r.ref));
  const used = new Set(), matches = [], ambiguous = [], unmatched = [];
  let direct = 0, full = 0, last4Only = 0, idDrift = 0, bankDrift = 0, typeDrift = 0, currencyDrift = 0, nonGt = 0;

  for (const v of missing) {
    const doc = docs.get(v.insurerId);
    if (!doc) { unmatched.push({ reason: 'insurer_missing', insurerHash: h(v.insurerId), oldHash: h(v.oldId, 12) }); continue; }
    if (doc.country !== 'GT') { nonGt += 1; unmatched.push({ reason: 'outside_gt', insurerHash: h(v.insurerId), country: doc.country }); continue; }
    const available = doc.accounts.filter((a) => a.ref === 'backend_required');
    const byId = available.filter((a) => a.id === v.oldId);
    const fingerprint = fp(v.bank, v.type, v.currency, v.last4);
    const byFull = available.filter((a) => fp(a.bank, a.type, a.currency, a.last4) === fingerprint);
    const byLast4 = v.last4 ? available.filter((a) => a.last4 === v.last4) : [];
    let pool = [], method = '';
    if (byId.length === 1) { pool = byId; method = 'direct_account_id'; }
    else if (byFull.length === 1) { pool = byFull; method = 'unique_metadata_fingerprint'; }
    else if (byFull.length === 0 && byLast4.length === 1) { pool = byLast4; method = 'unique_last4_within_insurer'; }
    else if (byFull.length > 1 || byLast4.length > 1) {
      const p = byFull.length > 1 ? byFull : byLast4;
      ambiguous.push({ insurerHash: h(v.insurerId), oldHash: h(v.oldId, 12), candidateCount: p.length, candidateHashes: p.map((a) => h(a.id, 12)).sort() });
      continue;
    }
    if (pool.length !== 1) {
      unmatched.push({ reason: 'no_unique_candidate', insurerHash: h(v.insurerId), oldHash: h(v.oldId, 12), fullCandidates: byFull.length, last4Candidates: byLast4.length, available: available.length });
      continue;
    }
    const a = pool[0], key = `${v.insurerId}|${a.id}`;
    if (used.has(key)) { ambiguous.push({ insurerHash: h(v.insurerId), oldHash: h(v.oldId, 12), reason: 'candidate_reused' }); continue; }
    used.add(key);
    if (method === 'direct_account_id') direct += 1;
    if (method === 'unique_metadata_fingerprint') full += 1;
    if (method === 'unique_last4_within_insurer') last4Only += 1;
    if (a.id !== v.oldId) idDrift += 1;
    if (fold(a.bank) !== fold(v.bank)) bankDrift += 1;
    if (fold(a.type) !== fold(v.type)) typeDrift += 1;
    if (fold(a.currency) !== fold(v.currency)) currencyDrift += 1;
    matches.push({ insurerHash: h(v.insurerId), currentHash: h(a.id, 12), oldHash: h(v.oldId, 12), refHash: h(v.ref, 12), last4Hash: h(v.last4, 8), currentIndex: a.i, method, idChanged: a.id !== v.oldId, bankLabelChanged: fold(a.bank) !== fold(v.bank), typeLabelChanged: fold(a.type) !== fold(v.type), currencyChanged: fold(a.currency) !== fold(v.currency), containsPII: false, containsSecrets: false });
  }

  const matched = new Set(matches.map((m) => `${m.insurerHash}|${m.currentHash}`));
  const pendingWithoutVault = [];
  docs.forEach((doc, insurerId) => {
    if (doc.country !== 'GT') return;
    doc.accounts.filter((a) => a.ref === 'backend_required').forEach((a) => {
      const key = `${h(insurerId)}|${h(a.id, 12)}`;
      if (!matched.has(key)) pendingWithoutVault.push({ insurerHash: h(insurerId), currentHash: h(a.id, 12), fingerprintHash: h(fp(a.bank, a.type, a.currency, a.last4), 12), last4Hash: h(a.last4, 8) });
    });
  });
  const checks = {
    insurerCountPreserved: snap.size === 26,
    vaultRowsPreserved: vault.length === 91,
    vaultValuesPresent: vault.filter((r) => r.valuePresent).length === 91,
    currentStateExpected: validRefs === 23 && pendingRefs === 70,
    rawValuesAbsent: rawValues === 0,
    missingVaultRefsExpected: missing.length === 68,
    allMissingVaultRefsUniquelyMatched: matches.length === 68,
    directIdMatchesExpected: direct === 0,
    hierarchicalMatchSplitExpected: full === 34 && last4Only === 34,
    idDriftConfirmed: idDrift === 68,
    ambiguousZero: ambiguous.length === 0,
    unmatchedZero: unmatched.length === 0,
    gtOnly: nonGt === 0,
    pendingBackendWithoutVaultExpected: pendingWithoutVault.length === 2,
    writesExecuted: false,
    containsSecrets: false,
    containsPII: false
  };
  const report = {
    schemaVersion: 'orbit360-bank-account-identity-drift-v2', generatedAt: new Date().toISOString(), projectId: PROJECT, tenantId: TENANT,
    mode: 'read_only_identity_diagnosis', writesExecuted: false, deployExecuted: false, migrationExecuted: false, containsPII: false, containsSecrets: false,
    summary: { insurerCount: snap.size, vaultRows: vault.length, currentValidRefs: validRefs, currentPendingRefs: pendingRefs, missingVaultRows: missing.length, directIdMatches: direct, uniqueFingerprintMatches: full, uniqueLast4Matches: last4Only, idDriftMatches: idDrift, bankLabelDrift: bankDrift, typeLabelDrift: typeDrift, currencyDrift, ambiguous: ambiguous.length, unmatched: unmatched.length, pendingBackendWithoutVault: pendingWithoutVault.length, matchedByCountry: { GT: matches.length } },
    matches, ambiguous, unmatched, pendingBackendWithoutVault, checks, identityDiagnosisReady: Object.values(checks).every(Boolean)
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`ORBIT360_BANK_ACCOUNT_IDENTITY_DRIFT:${JSON.stringify({ identityDiagnosisReady: report.identityDiagnosisReady, matches: matches.length, directIdMatches: direct, uniqueFingerprintMatches: full, uniqueLast4Matches: last4Only, idDriftMatches: idDrift, ambiguous: ambiguous.length, unmatched: unmatched.length, pendingBackendWithoutVault: pendingWithoutVault.length, writesExecuted: false, containsSecrets: false })}`);
  if (!report.identityDiagnosisReady) process.exit(1);
}

main().catch((error) => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const report = { schemaVersion: 'orbit360-bank-account-identity-drift-v2', generatedAt: new Date().toISOString(), projectId: PROJECT, tenantId: TENANT, mode: 'read_only_identity_diagnosis', writesExecuted: false, deployExecuted: false, migrationExecuted: false, containsPII: false, containsSecrets: false, identityDiagnosisReady: false, errorCode: clean(error && (error.code || error.message) || error || 'unknown', 180).replace(/[^A-Za-z0-9_.:-]/g, '_') };
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.error(report.errorCode);
  process.exit(1);
});
