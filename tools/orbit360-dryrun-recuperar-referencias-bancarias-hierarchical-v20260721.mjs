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
const OUT_DIR = path.resolve('orbit360-platform/runtime-incident-importer-20260721');
const OUT = path.join(OUT_DIR, 'bank-reference-recovery-dry-run-sanitizado.json');
const BACKUP = path.join(OUT_DIR, 'bank-reference-recovery-backup-manifest-sanitizado.json');
const REF_RE = /^acct_[a-f0-9]{32}$/;

const clean = (v, n = 240) => String(v == null ? '' : v).replace(/\u0000/g, '').trim().slice(0, n);
const fold = (v) => clean(v, 320).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const hash = (v, n = 16) => crypto.createHash('sha256').update(String(v == null ? '' : v)).digest('hex').slice(0, n);
const last4 = (v) => { const d = clean(v, 320).replace(/\D/g, ''); return d.length >= 4 ? d.slice(-4) : d; };
const clone = (v) => JSON.parse(JSON.stringify(v));
const stable = (v) => Array.isArray(v)
  ? `[${v.map(stable).join(',')}]`
  : v && typeof v === 'object'
    ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
    : JSON.stringify(v);
const digest = (v) => crypto.createHash('sha256').update(stable(v)).digest('hex');
const refOf = (r) => clean(r && (r.accountRef || r.secureAccountRef || r.cuentaRef), 100);
const idOf = (r, i) => clean(r && (r.id || r.accountId || r.resourceId || String(i)), 180);
const fp = (bank, type, currency, ending) => [fold(bank), fold(type), fold(currency), clean(ending, 8)].join('|');
const fail = (code) => { const e = new Error(code); e.code = code; throw e; };

function init() {
  const project = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
  if (project !== PROJECT) fail('PROJECT_MISMATCH');
  if (getApps().length) return getApps()[0];
  const key = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!key || !fs.existsSync(key)) fail('SERVICE_ACCOUNT_FILE_REQUIRED');
  const serviceAccount = JSON.parse(fs.readFileSync(key, 'utf8'));
  if (serviceAccount.project_id !== PROJECT) fail('SERVICE_ACCOUNT_PROJECT_MISMATCH');
  return initializeApp({ credential: cert(serviceAccount), projectId: PROJECT });
}

async function readVault() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({ name: SECRET });
  const text = version && version.payload && version.payload.data ? Buffer.from(version.payload.data).toString('utf8') : '';
  if (!text) fail('VAULT_EMPTY');
  const vault = JSON.parse(text);
  if (vault.schemaVersion !== 'orbit360-insurer-credentials-v1' || vault.tenantId !== TENANT) fail('VAULT_CONTRACT_MISMATCH');
  const rows = Object.entries(vault.bankAccounts || {}).map(([ref, r]) => ({
    ref: clean(ref, 100), insurerId: clean(r.insurerId, 180), oldId: clean(r.accountId, 180),
    bank: clean(r.bank, 180), type: clean(r.accountType, 140), currency: clean(r.currency, 20),
    last4: last4(r.accountNumber), valuePresent: Boolean(clean(r.accountNumber, 320))
  }));
  return { updatedAt: clean(vault.updatedAt, 80), rows };
}

function stripRefs(account) {
  const copy = clone(account || {});
  delete copy.accountRef;
  delete copy.secureAccountRef;
  delete copy.cuentaRef;
  return copy;
}

async function main() {
  const db = getFirestore(init());
  const [snapshot, vault] = await Promise.all([
    db.collection('tenantId').doc(TENANT).collection('aseguradoras').get(),
    readVault()
  ]);

  const docs = new Map();
  const currentRefs = new Set();
  let currentValidRefs = 0, currentPendingRefs = 0, rawValues = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    const country = clean(data.pais || data.country, 12).toUpperCase();
    const accounts = [].concat(data.cuentas || []).map((row, index) => {
      const ref = refOf(row);
      if (REF_RE.test(ref)) { currentValidRefs += 1; currentRefs.add(ref); }
      if (ref === 'backend_required') currentPendingRefs += 1;
      if (clean(row && (row.numero || row.accountNumber), 320)) rawValues += 1;
      return {
        index,
        id: idOf(row, index),
        ref,
        bank: clean(row && row.banco, 180),
        type: clean(row && row.tipo, 140),
        currency: clean(row && row.moneda, 20),
        last4: last4(row && row.numeroHint),
        original: clone(row)
      };
    });
    docs.set(doc.id, { id: doc.id, data, country, accounts });
  });

  const missing = vault.rows.filter((row) => !currentRefs.has(row.ref));
  const used = new Set();
  const matches = [];
  const ambiguous = [];
  const unmatched = [];
  let direct = 0, full = 0, last4Only = 0, nonGt = 0;

  for (const vaultRow of missing) {
    const doc = docs.get(vaultRow.insurerId);
    if (!doc) { unmatched.push({ reason: 'insurer_missing', insurerHash: hash(vaultRow.insurerId) }); continue; }
    if (doc.country !== 'GT') { nonGt += 1; unmatched.push({ reason: 'outside_gt', insurerHash: hash(vaultRow.insurerId), country: doc.country }); continue; }

    const available = doc.accounts.filter((a) => a.ref === 'backend_required' && !used.has(`${doc.id}|${a.index}`));
    const byId = available.filter((a) => a.id === vaultRow.oldId);
    const fingerprint = fp(vaultRow.bank, vaultRow.type, vaultRow.currency, vaultRow.last4);
    const byFull = available.filter((a) => fp(a.bank, a.type, a.currency, a.last4) === fingerprint);
    const byLast4 = vaultRow.last4 ? available.filter((a) => a.last4 === vaultRow.last4) : [];

    let candidates = [], method = '';
    if (byId.length === 1) { candidates = byId; method = 'direct_account_id'; }
    else if (byFull.length === 1) { candidates = byFull; method = 'unique_metadata_fingerprint'; }
    else if (byFull.length === 0 && byLast4.length === 1) { candidates = byLast4; method = 'unique_last4_within_insurer'; }
    else if (byFull.length > 1 || byLast4.length > 1) {
      const pool = byFull.length > 1 ? byFull : byLast4;
      ambiguous.push({ insurerHash: hash(doc.id), candidateCount: pool.length, candidateHashes: pool.map((a) => hash(a.id, 12)).sort() });
      continue;
    }

    if (candidates.length !== 1) {
      unmatched.push({ reason: 'no_unique_candidate', insurerHash: hash(doc.id), fullCandidates: byFull.length, last4Candidates: byLast4.length, available: available.length });
      continue;
    }

    const account = candidates[0];
    used.add(`${doc.id}|${account.index}`);
    if (method === 'direct_account_id') direct += 1;
    if (method === 'unique_metadata_fingerprint') full += 1;
    if (method === 'unique_last4_within_insurer') last4Only += 1;
    matches.push({
      insurerId: doc.id,
      accountIndex: account.index,
      currentId: account.id,
      beforeRef: account.ref,
      afterRef: vaultRow.ref,
      method,
      insurerHash: hash(doc.id),
      currentHash: hash(account.id, 12),
      oldHash: hash(vaultRow.oldId, 12),
      refHash: hash(vaultRow.ref, 12),
      containsPII: false,
      containsSecrets: false
    });
  }

  const byDocument = new Map();
  matches.forEach((match) => {
    if (!byDocument.has(match.insurerId)) byDocument.set(match.insurerId, []);
    byDocument.get(match.insurerId).push(match);
  });

  const proposals = [];
  const affectedDocuments = [];
  let creates = 0, deletes = 0, reorderDetected = 0, nonReferenceFieldChanges = 0, colombiaChanges = 0;

  byDocument.forEach((documentMatches, insurerId) => {
    const doc = docs.get(insurerId);
    const beforeAccounts = [].concat(doc.data.cuentas || []).map(clone);
    const afterAccounts = beforeAccounts.map(clone);
    const beforeOrder = beforeAccounts.map((row, index) => idOf(row, index));

    documentMatches.forEach((match) => {
      const before = beforeAccounts[match.accountIndex];
      const after = clone(before);
      after.accountRef = match.afterRef;
      delete after.secureAccountRef;
      delete after.cuentaRef;
      afterAccounts[match.accountIndex] = after;
      if (digest(stripRefs(before)) !== digest(stripRefs(after))) nonReferenceFieldChanges += 1;
      proposals.push({
        insurerHash: match.insurerHash,
        accountHash: match.currentHash,
        index: match.accountIndex,
        beforeState: match.beforeRef === 'backend_required' ? 'backend_required' : 'empty',
        afterRefHash: match.refHash,
        method: match.method,
        operation: 'set_accountRef_only',
        containsPII: false,
        containsSecrets: false
      });
    });

    creates += Math.max(0, afterAccounts.length - beforeAccounts.length);
    deletes += Math.max(0, beforeAccounts.length - afterAccounts.length);
    const afterOrder = afterAccounts.map((row, index) => idOf(row, index));
    if (digest(beforeOrder) !== digest(afterOrder)) reorderDetected += 1;
    if (doc.country === 'CO') colombiaChanges += documentMatches.length;

    affectedDocuments.push({
      insurerHash: hash(insurerId),
      country: doc.country,
      proposalCount: documentMatches.length,
      accountRowsBefore: beforeAccounts.length,
      accountRowsAfter: afterAccounts.length,
      beforeDocumentHash: digest(doc.data),
      beforeAccountsHash: digest(beforeAccounts),
      simulatedAfterAccountsHash: digest(afterAccounts),
      rollback: {
        strategy: 'restore_original_cuentas_array_if_precondition_hash_matches',
        originalAccountsHash: digest(beforeAccounts),
        exactBeforeStates: documentMatches.map((m) => ({ accountHash: m.currentHash, beforeState: m.beforeRef === 'backend_required' ? 'backend_required' : 'empty' }))
      },
      containsPII: false,
      containsSecrets: false
    });
  });

  const remainingPending = [];
  docs.forEach((doc) => {
    if (doc.country !== 'GT') return;
    doc.accounts.filter((a) => a.ref === 'backend_required' && !used.has(`${doc.id}|${a.index}`)).forEach((a) => {
      remainingPending.push({ insurerHash: hash(doc.id), accountHash: hash(a.id, 12) });
    });
  });

  const proposalKeys = new Set(proposals.map((p) => `${p.insurerHash}|${p.accountHash}`));
  const refHashes = new Set(proposals.map((p) => p.afterRefHash));
  const checks = {
    insurerCountPreserved: snapshot.size === 26,
    currentStateExpected: currentValidRefs === 23 && currentPendingRefs === 70,
    vaultRowsPreserved: vault.rows.length === 91,
    vaultValuesPresent: vault.rows.filter((r) => r.valuePresent).length === 91,
    rawValuesAbsent: rawValues === 0,
    missingRefsExpected: missing.length === 68,
    proposalsExact: proposals.length === 68,
    affectedGtExact: affectedDocuments.filter((d) => d.country === 'GT').length === 13,
    colombiaUntouched: colombiaChanges === 0,
    directIdMatchesExpected: direct === 0,
    hierarchicalMatchSplitExpected: full === 34 && last4Only === 34,
    ambiguousZero: ambiguous.length === 0,
    unmatchedZero: unmatched.length === 0,
    nonGtZero: nonGt === 0,
    remainingPendingExpected: remainingPending.length === 2,
    noCreates: creates === 0,
    noDeletes: deletes === 0,
    noReorder: reorderDetected === 0,
    noNonReferenceFieldChanges: nonReferenceFieldChanges === 0,
    proposalsUnique: proposalKeys.size === proposals.length,
    refsUnique: refHashes.size === proposals.length,
    projectedValidRefsExpected: currentValidRefs + proposals.length === 91,
    rollbackExact: affectedDocuments.every((d) => d.rollback.exactBeforeStates.length === d.proposalCount),
    writesExecuted: false,
    containsPII: false,
    containsSecrets: false
  };

  const report = {
    schemaVersion: 'orbit360-bank-reference-recovery-dry-run-v2',
    generatedAt: new Date().toISOString(), projectId: PROJECT, tenantId: TENANT,
    mode: 'read_only_hierarchical_recovery_dry_run', writesExecuted: false, deployExecuted: false, migrationExecuted: false,
    containsPII: false, containsSecrets: false,
    baseline: { insurerCount: snapshot.size, currentValidRefs, currentPendingRefs, vaultRows: vault.rows.length, vaultValuesPresent: vault.rows.filter((r) => r.valuePresent).length, vaultUpdatedAtHash: hash(vault.updatedAt) },
    matching: { directIdMatches: direct, uniqueFingerprintMatches: full, uniqueLast4Matches: last4Only, ambiguous: ambiguous.length, unmatched: unmatched.length },
    proposal: { proposedChanges: proposals.length, affectedDocuments: affectedDocuments.length, affectedGtDocuments: affectedDocuments.filter((d) => d.country === 'GT').length, projectedValidRefs: currentValidRefs + proposals.length, projectedPendingRefs: remainingPending.length, creates, deletes, reorderDetected, nonReferenceFieldChanges, colombiaChanges },
    affectedDocuments, proposals, ambiguous, unmatched, remainingPending, checks,
    recoveryReady: Object.values(checks).every(Boolean)
  };

  const backup = {
    schemaVersion: 'orbit360-bank-reference-recovery-backup-manifest-v2',
    generatedAt: report.generatedAt, projectId: PROJECT, tenantId: TENANT,
    mode: 'read_only_backup_manifest', affectedDocuments: affectedDocuments.length, proposedChanges: proposals.length,
    documents: affectedDocuments.map((d) => ({ insurerHash: d.insurerHash, country: d.country, beforeDocumentHash: d.beforeDocumentHash, beforeAccountsHash: d.beforeAccountsHash, simulatedAfterAccountsHash: d.simulatedAfterAccountsHash, proposalCount: d.proposalCount, rollback: d.rollback, containsPII: false, containsSecrets: false })),
    rollbackExact: checks.rollbackExact, writesExecuted: false, containsPII: false, containsSecrets: false
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(BACKUP, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
  console.log(`ORBIT360_BANK_REFERENCE_RECOVERY_DRY_RUN:${JSON.stringify({ recoveryReady: report.recoveryReady, proposedChanges: proposals.length, affectedDocuments: affectedDocuments.length, projectedValidRefs: report.proposal.projectedValidRefs, projectedPendingRefs: report.proposal.projectedPendingRefs, directIdMatches: direct, uniqueFingerprintMatches: full, uniqueLast4Matches: last4Only, ambiguous: ambiguous.length, unmatched: unmatched.length, writesExecuted: false, containsSecrets: false })}`);
  if (!report.recoveryReady) process.exit(1);
}

main().catch((error) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const payload = { schemaVersion: 'orbit360-bank-reference-recovery-dry-run-v2', generatedAt: new Date().toISOString(), projectId: PROJECT, tenantId: TENANT, mode: 'read_only_hierarchical_recovery_dry_run', writesExecuted: false, deployExecuted: false, migrationExecuted: false, containsPII: false, containsSecrets: false, recoveryReady: false, errorCode: clean(error && (error.code || error.message) || error || 'unknown', 180).replace(/[^A-Za-z0-9_.:-]/g, '_') };
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.error(payload.errorCode);
  process.exit(1);
});
