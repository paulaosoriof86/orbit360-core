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
const SECRET_PARENT = `projects/${EXPECTED_PROJECT_ID}/secrets/${SECRET_ID}`;
const SECRET_LATEST = `${SECRET_PARENT}/versions/latest`;
const EXPECTED_INSURERS = 26;
const EXPECTED_BANK_REFS = Number(process.env.ORBIT360_EXPECTED_BANK_ACCOUNTS || 91);
const OUT_FILE = path.resolve('orbit360-platform/runtime-incident-importer-20260721/insurer-protected-reference-diff-sanitizado.json');
const ACCOUNT_REF_RE = /^acct_[a-f0-9]{32}$/;
const CREDENTIAL_REF_RE = /^cred_[a-f0-9]{32}$/;

function clean(value, max = 220) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}

function hash(value, size = 16) {
  return crypto.createHash('sha256').update(clean(value, 500)).digest('hex').slice(0, size);
}

function iso(value) {
  if (!value) return '';
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function rawAccountPresent(account) {
  return Boolean(clean(account && (account.numero || account.accountNumber), 300));
}

function rawCredentialPresent(portal) {
  return Boolean(clean(portal && (portal.usuario || portal.user || portal.username || portal.password || portal.contrasena), 600));
}

function accountRef(account) {
  return clean(account && (account.accountRef || account.secureAccountRef || account.cuentaRef), 100);
}

function credentialRef(portal) {
  return clean(portal && (portal.credentialRef || portal.secureAccessRef || portal.credencialRef), 100);
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

async function readVaultMetadata(secrets) {
  const versions = [];
  for await (const version of secrets.listSecretVersionsAsync({ parent: SECRET_PARENT })) {
    versions.push({
      version: clean(version.name).split('/').pop(),
      state: clean(version.state),
      createTime: iso(version.createTime)
    });
  }
  versions.sort((a, b) => Number(a.version || 0) - Number(b.version || 0));
  const [latest] = await secrets.accessSecretVersion({ name: SECRET_LATEST });
  const text = latest && latest.payload && latest.payload.data
    ? Buffer.from(latest.payload.data).toString('utf8')
    : '';
  const vault = text ? JSON.parse(text) : {};
  const accounts = vault.bankAccounts && typeof vault.bankAccounts === 'object' ? vault.bankAccounts : {};
  const credentials = vault.records && typeof vault.records === 'object' ? vault.records : {};
  return {
    versions,
    vaultUpdatedAt: iso(vault.updatedAt),
    accountRows: Object.entries(accounts).map(([ref, row]) => ({
      ref,
      insurerId: clean(row && row.insurerId, 180),
      resourceId: clean(row && row.accountId, 180),
      valuePresent: Boolean(clean(row && row.accountNumber, 300)),
      updatedAt: iso(row && row.updatedAt)
    })),
    credentialRows: Object.entries(credentials).map(([ref, row]) => ({
      ref,
      insurerId: clean(row && row.insurerId, 180),
      resourceId: clean(row && row.portalId, 180),
      usernamePresent: Boolean(clean(row && row.username, 400)),
      passwordPresent: Boolean(clean(row && row.password, 700)),
      sourceHashPresent: /^[a-f0-9]{64}$/.test(clean(row && row.sourceHash, 80)),
      updatedAt: iso(row && row.updatedAt)
    }))
  };
}

async function collectAuditEvents(db) {
  const roots = [
    db.collection('tenants').doc(TENANT_ID),
    db.collection('tenantId').doc(TENANT_ID)
  ];
  const output = [];
  for (const root of roots) {
    let collections = [];
    try { collections = await root.listCollections(); } catch (_) { collections = []; }
    for (const collection of collections) {
      if (!/(audit|auditor|activ|gest)/i.test(collection.id)) continue;
      let snapshot;
      try { snapshot = await collection.limit(1000).get(); } catch (_) { continue; }
      snapshot.docs.forEach((doc) => {
        const row = doc.data() || {};
        const insurerId = clean(row.insurerId || row.aseguradoraId || row.entityId || row.registroId, 180);
        const action = clean(row.action || row.accion || row.tipo || row.eventType || row.titulo, 140);
        const sourceType = clean(row.sourceType || row.origen || row.fuente || row.source, 120);
        const reportId = clean(row.reportId || row.batchId || row.importBatchId || row.operationId, 180);
        const createdAt = iso(row.createdAt || row.fecha || row.timestamp || row.updatedAt);
        if (!insurerId && !/(asegurador|credential|bank_account|directorio)/i.test(`${action} ${sourceType}`)) return;
        output.push({
          collection: collection.id,
          insurerId,
          action,
          sourceType,
          reportHash: reportId ? hash(reportId, 12) : '',
          actorHash: row.actorUid || row.userId || row.usuarioId ? hash(row.actorUid || row.userId || row.usuarioId, 12) : '',
          createdAt,
          outcome: clean(row.outcome || row.result || row.estado, 80),
          count: Number.isFinite(Number(row.count)) ? Number(row.count) : 0,
          containsSecrets: false
        });
      });
    }
  }
  return output.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function summarizeActions(events) {
  const map = new Map();
  events.forEach((event) => {
    const key = `${event.collection}|${event.action}|${event.sourceType}`;
    const row = map.get(key) || { collection: event.collection, action: event.action, sourceType: event.sourceType, count: 0, latestAt: '' };
    row.count += 1;
    if (event.createdAt > row.latestAt) row.latestAt = event.createdAt;
    map.set(key, row);
  });
  return [...map.values()].sort((a, b) => String(b.latestAt).localeCompare(String(a.latestAt))).slice(0, 80);
}

async function main() {
  const app = initAdmin();
  const db = getFirestore(app);
  const secrets = new SecretManagerServiceClient();
  const [insurerSnapshot, vault, audits] = await Promise.all([
    db.collection('tenantId').doc(TENANT_ID).collection('aseguradoras').get(),
    readVaultMetadata(secrets),
    collectAuditEvents(db)
  ]);

  const vaultAccountsByInsurer = new Map();
  const vaultCredentialsByInsurer = new Map();
  vault.accountRows.forEach((row) => {
    const rows = vaultAccountsByInsurer.get(row.insurerId) || [];
    rows.push(row); vaultAccountsByInsurer.set(row.insurerId, rows);
  });
  vault.credentialRows.forEach((row) => {
    const rows = vaultCredentialsByInsurer.get(row.insurerId) || [];
    rows.push(row); vaultCredentialsByInsurer.set(row.insurerId, rows);
  });

  let rawAccountValues = 0;
  let rawCredentialValues = 0;
  let validAccountRefs = 0;
  let invalidAccountRefs = 0;
  let pendingAccountRefs = 0;
  let validCredentialRefs = 0;
  let invalidCredentialRefs = 0;
  let pendingCredentialRefs = 0;
  const currentAccountRefs = new Set();
  const currentCredentialRefs = new Set();

  const insurers = insurerSnapshot.docs.map((doc) => {
    const data = doc.data() || {};
    const accounts = [].concat(data.cuentas || []);
    const portals = [].concat(data.portales || []);
    const accountRefs = accounts.map(accountRef).filter(Boolean);
    const credentialRefs = portals.map(credentialRef).filter(Boolean);
    const validAccounts = accountRefs.filter((ref) => ACCOUNT_REF_RE.test(ref));
    const invalidAccounts = accountRefs.filter((ref) => ref !== 'backend_required' && !ACCOUNT_REF_RE.test(ref));
    const pendingAccounts = accountRefs.filter((ref) => ref === 'backend_required');
    const validCredentials = credentialRefs.filter((ref) => CREDENTIAL_REF_RE.test(ref));
    const invalidCredentials = credentialRefs.filter((ref) => ref !== 'backend_required' && !CREDENTIAL_REF_RE.test(ref));
    const pendingCredentials = credentialRefs.filter((ref) => ref === 'backend_required');

    accounts.forEach((row) => { if (rawAccountPresent(row)) rawAccountValues += 1; });
    portals.forEach((row) => { if (rawCredentialPresent(row)) rawCredentialValues += 1; });
    validAccounts.forEach((ref) => currentAccountRefs.add(ref));
    validCredentials.forEach((ref) => currentCredentialRefs.add(ref));
    validAccountRefs += validAccounts.length;
    invalidAccountRefs += invalidAccounts.length;
    pendingAccountRefs += pendingAccounts.length;
    validCredentialRefs += validCredentials.length;
    invalidCredentialRefs += invalidCredentials.length;
    pendingCredentialRefs += pendingCredentials.length;

    const vaultAccounts = vaultAccountsByInsurer.get(doc.id) || [];
    const vaultCredentials = vaultCredentialsByInsurer.get(doc.id) || [];
    const currentAccountSet = new Set(validAccounts);
    const currentCredentialSet = new Set(validCredentials);
    const insurerAudits = audits.filter((event) => event.insurerId === doc.id).slice(0, 8);
    const source = data.fuenteDirectorio || {};

    return {
      insurerHash: hash(doc.id, 16),
      country: clean(data.pais || data.country, 12),
      documentUpdatedAt: iso(data.updatedAt || data.modificadoAt || data.ultimaActualizacion || source.importadoAt),
      sourceType: clean(source.tipo || data.sourceType || data.origen, 100),
      sourceImportedAt: iso(source.importadoAt),
      accounts: {
        rows: accounts.length,
        validRefs: validAccounts.length,
        invalidRefs: invalidAccounts.length,
        pendingBackendRequired: pendingAccounts.length,
        vaultRows: vaultAccounts.length,
        vaultValuesPresent: vaultAccounts.filter((row) => row.valuePresent).length,
        vaultRefsMissingFromDocument: vaultAccounts.filter((row) => !currentAccountSet.has(row.ref)).length,
        documentRefsMissingFromVault: validAccounts.filter((ref) => !vault.accountRows.some((row) => row.ref === ref)).length,
        missingRefHashes: vaultAccounts.filter((row) => !currentAccountSet.has(row.ref)).map((row) => hash(row.ref, 12)).sort()
      },
      credentials: {
        portalRows: portals.length,
        validRefs: validCredentials.length,
        invalidRefs: invalidCredentials.length,
        pendingBackendRequired: pendingCredentials.length,
        vaultRows: vaultCredentials.length,
        usernameAvailable: vaultCredentials.filter((row) => row.usernamePresent).length,
        passwordAvailable: vaultCredentials.filter((row) => row.passwordPresent).length,
        vaultRefsMissingFromDocument: vaultCredentials.filter((row) => !currentCredentialSet.has(row.ref)).length,
        documentRefsMissingFromVault: validCredentials.filter((ref) => !vault.credentialRows.some((row) => row.ref === ref)).length,
        missingRefHashes: vaultCredentials.filter((row) => !currentCredentialSet.has(row.ref)).map((row) => hash(row.ref, 12)).sort()
      },
      latestRelevantAudit: insurerAudits,
      containsPII: false,
      containsSecrets: false
    };
  }).sort((a, b) => b.accounts.vaultRefsMissingFromDocument - a.accounts.vaultRefsMissingFromDocument || a.insurerHash.localeCompare(b.insurerHash));

  const orphanVaultAccounts = vault.accountRows.filter((row) => !currentAccountRefs.has(row.ref));
  const orphanVaultCredentials = vault.credentialRows.filter((row) => !currentCredentialRefs.has(row.ref));
  const report = {
    schemaVersion: 'orbit360-insurer-protected-reference-diff-v1',
    generatedAt: new Date().toISOString(),
    projectId: EXPECTED_PROJECT_ID,
    tenantId: TENANT_ID,
    mode: 'read_only',
    writesExecuted: false,
    deployExecuted: false,
    migrationExecuted: false,
    containsPII: false,
    containsSecrets: false,
    checkpoint: {
      head: '02a5436bc804b3a861f82375b124d05015389b4b',
      runId: '29797444980',
      expectedInsurers: EXPECTED_INSURERS,
      expectedBankReferences: EXPECTED_BANK_REFS
    },
    current: {
      insurerCount: insurerSnapshot.size,
      validAccountRefs,
      invalidAccountRefs,
      pendingAccountRefs,
      validCredentialRefs,
      invalidCredentialRefs,
      pendingCredentialRefs,
      rawAccountValues,
      rawCredentialValues
    },
    vault: {
      versionCount: vault.versions.length,
      versions: vault.versions,
      updatedAt: vault.vaultUpdatedAt,
      bankAccountRows: vault.accountRows.length,
      bankAccountValuesPresent: vault.accountRows.filter((row) => row.valuePresent).length,
      credentialRows: vault.credentialRows.length,
      usernamesPresent: vault.credentialRows.filter((row) => row.usernamePresent).length,
      passwordsPresent: vault.credentialRows.filter((row) => row.passwordPresent).length
    },
    diff: {
      bankReferenceGapAgainstCheckpoint: Math.max(0, EXPECTED_BANK_REFS - validAccountRefs),
      vaultBankRefsMissingFromDocuments: orphanVaultAccounts.length,
      vaultCredentialRefsMissingFromDocuments: orphanVaultCredentials.length,
      accountRefHashesMissingFromDocuments: orphanVaultAccounts.map((row) => hash(row.ref, 12)).sort(),
      credentialRefHashesMissingFromDocuments: orphanVaultCredentials.map((row) => hash(row.ref, 12)).sort()
    },
    audit: {
      relevantEventCount: audits.length,
      actionSummary: summarizeActions(audits),
      latestEvents: audits.slice(0, 100)
    },
    insurers,
    diagnosisComplete: true,
    safetyChecks: {
      insurerCountPreserved: insurerSnapshot.size === EXPECTED_INSURERS,
      noRawAccountValues: rawAccountValues === 0,
      noRawCredentialValues: rawCredentialValues === 0,
      vaultBankRowsCoverCheckpoint: vault.accountRows.length >= EXPECTED_BANK_REFS,
      reportSanitized: true,
      readOnly: true
    }
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`ORBIT360_READONLY_INSURER_REFERENCE_DIAGNOSIS:${JSON.stringify({ diagnosisComplete: true, insurerCount: insurerSnapshot.size, validAccountRefs, vaultBankRows: vault.accountRows.length, gap: report.diff.bankReferenceGapAgainstCheckpoint, orphanVaultAccounts: orphanVaultAccounts.length, orphanVaultCredentials: orphanVaultCredentials.length, rawAccountValues, rawCredentialValues, containsSecrets: false, writesExecuted: false })}`);
}

main().catch((error) => {
  const safe = clean(error && (error.code || error.message) || error || 'unknown').replace(/[^A-Za-z0-9_.:-]/g, '_');
  const failure = { schemaVersion: 'orbit360-insurer-protected-reference-diff-v1', generatedAt: new Date().toISOString(), mode: 'read_only', writesExecuted: false, containsPII: false, containsSecrets: false, diagnosisComplete: false, errorCode: safe };
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(failure, null, 2)}\n`, 'utf8');
  console.error(`ORBIT360_READONLY_INSURER_REFERENCE_DIAGNOSIS_FAILED:${safe}`);
  process.exit(1);
});
