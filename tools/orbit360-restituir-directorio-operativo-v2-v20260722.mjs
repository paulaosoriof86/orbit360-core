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
const SECRET_ID = process.env.ORBIT360_CREDENTIAL_SECRET_ID || 'orbit360-insurer-credentials-alianzas-soluciones';
const SECRET = `projects/${PROJECT}/secrets/${SECRET_ID}/versions/latest`;
const APPLY = process.argv.includes('--apply');
const MODE = APPLY ? 'APPLY' : 'DRY_RUN';
const OUT_REL = APPLY
  ? 'orbit360-platform/runtime-gate-crm-v20260716/operational-directory-repair-apply-sanitized.json'
  : 'orbit360-platform/runtime-gate-crm-v20260716/operational-directory-repair-dryrun-sanitized.json';
const OUT = path.resolve(OUT_REL);
const REF_ACCOUNT = /^acct_[a-f0-9]{32}$/;
const REF_CREDENTIAL = /^cred_[a-f0-9]{32}$/;
const EXPECTED = Object.freeze({ clients: 414, insurers: 26, advisors: 7, bankRefs: 91, bankPending: 2 });
const execution = { transactionCommitted: false, rollbackExecuted: false, rollbackVerified: false };

const clean = (value, max = 512) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const clone = value => JSON.parse(JSON.stringify(value));
const hash = (value, size = 16) => crypto.createHash('sha256').update(String(value == null ? '' : value)).digest('hex').slice(0, size);
const stable = value => Array.isArray(value)
  ? `[${value.map(stable).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const digest = value => crypto.createHash('sha256').update(stable(value)).digest('hex');
const fail = (code, detail = '') => { const error = new Error(code); error.code = code; error.detail = detail; throw error; };
const accountRef = row => clean(row && (row.accountRef || row.secureAccountRef || row.cuentaRef), 100);
const credentialRef = row => clean(row && (row.credentialRef || row.secureAccessRef), 100);
const rowId = (row, index) => clean(row && (row.id || row.accountId || row.portalId || row.resourceId || String(index)), 180);
const accountNumber = row => clean(row && (row.numero || row.numeroCuenta || row.accountNumber), 320);
const portalUser = row => clean(row && (row.usuario || row.user || row.username), 320);
const portalPassword = row => clean(row && (row.password || row.contrasena || row.contraseña || row.clave), 512);

function stripAccountTargetFields(row) {
  const copy = clone(row || {});
  delete copy.numero;
  delete copy.numeroCuenta;
  delete copy.accountNumber;
  delete copy.estado;
  delete copy.clasificacionDato;
  delete copy.visibilidad;
  delete copy.operationalFieldPolicy;
  return copy;
}
function stripPortalTargetFields(row) {
  const copy = clone(row || {});
  delete copy.usuario;
  delete copy.user;
  delete copy.username;
  delete copy.clasificacionUsuario;
  delete copy.estadoCredencial;
  delete copy.estadoAcceso;
  delete copy.operationalFieldPolicy;
  delete copy.password;
  delete copy.contrasena;
  delete copy.contraseña;
  delete copy.clave;
  return copy;
}
function compareUntargeted(beforeAccounts, afterAccounts, beforePortals, afterPortals) {
  let rowCountChanges = 0;
  let rowOrderChanges = 0;
  let nonTargetFieldChanges = 0;
  if (beforeAccounts.length !== afterAccounts.length || beforePortals.length !== afterPortals.length) rowCountChanges += 1;
  const accountLength = Math.min(beforeAccounts.length, afterAccounts.length);
  const portalLength = Math.min(beforePortals.length, afterPortals.length);
  for (let index = 0; index < accountLength; index += 1) {
    if (rowId(beforeAccounts[index], index) !== rowId(afterAccounts[index], index)) rowOrderChanges += 1;
    if (digest(stripAccountTargetFields(beforeAccounts[index])) !== digest(stripAccountTargetFields(afterAccounts[index]))) nonTargetFieldChanges += 1;
  }
  for (let index = 0; index < portalLength; index += 1) {
    if (rowId(beforePortals[index], index) !== rowId(afterPortals[index], index)) rowOrderChanges += 1;
    if (digest(stripPortalTargetFields(beforePortals[index])) !== digest(stripPortalTargetFields(afterPortals[index]))) nonTargetFieldChanges += 1;
  }
  return { rowCountChanges, rowOrderChanges, nonTargetFieldChanges };
}
function write(payload) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
function init() {
  const project = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
  if (project !== PROJECT) fail('PROJECT_MISMATCH', project);
  if (getApps().length) return getApps()[0];
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile || !fs.existsSync(keyFile)) fail('SERVICE_ACCOUNT_FILE_REQUIRED');
  const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  if (serviceAccount.project_id !== PROJECT) fail('SERVICE_ACCOUNT_PROJECT_MISMATCH', serviceAccount.project_id);
  return initializeApp({ credential: cert(serviceAccount), projectId: PROJECT });
}
async function readVault() {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({ name: SECRET });
  const text = version?.payload?.data ? Buffer.from(version.payload.data).toString('utf8') : '';
  if (!text) fail('VAULT_EMPTY');
  const vault = JSON.parse(text);
  if (vault.schemaVersion !== 'orbit360-insurer-credentials-v1' || vault.tenantId !== TENANT) fail('VAULT_CONTRACT_MISMATCH');
  const banks = new Map();
  for (const [ref, row] of Object.entries(vault.bankAccounts || {})) {
    if (!REF_ACCOUNT.test(ref)) fail('VAULT_BANK_REF_INVALID', hash(ref));
    if (banks.has(ref)) fail('VAULT_BANK_REF_DUPLICATE', hash(ref));
    const number = clean(row && row.accountNumber, 320);
    if (!number) fail('VAULT_BANK_NUMBER_MISSING', hash(ref));
    banks.set(ref, {
      ref,
      insurerId: clean(row && row.insurerId, 180),
      accountId: clean(row && row.accountId, 180),
      number
    });
  }
  const credentials = new Map();
  for (const [ref, row] of Object.entries(vault.records || {})) {
    if (!REF_CREDENTIAL.test(ref)) fail('VAULT_CREDENTIAL_REF_INVALID', hash(ref));
    if (credentials.has(ref)) fail('VAULT_CREDENTIAL_REF_DUPLICATE', hash(ref));
    credentials.set(ref, {
      ref,
      insurerId: clean(row && row.insurerId, 180),
      portalId: clean(row && row.portalId, 180),
      username: clean(row && row.username, 320),
      passwordAvailable: Boolean(clean(row && row.password, 512))
    });
  }
  return {
    banks,
    credentials,
    bankCount: banks.size,
    credentialCount: credentials.size,
    updatedAtHash: hash(vault.updatedAt || '', 16)
  };
}
function snapshotState(snapshot, vault) {
  const docs = new Map();
  const refs = { bank: new Set(), credential: new Set() };
  const summary = {
    bankResources: 0,
    bankReferenceRows: 0,
    bankPendingRows: 0,
    bankOperationalNumbers: 0,
    bankMatchedToVault: 0,
    bankReferenceAccountIdMismatches: 0,
    bankUnmatchedRefs: 0,
    credentialReferenceRows: 0,
    credentialMatchedToVault: 0,
    credentialPortalIdMismatches: 0,
    credentialUnmatchedRefs: 0,
    credentialPasswordsAvailable: 0,
    usernamesOperational: 0,
    usernamesAvailableInVault: 0,
    passwordsInOperationalDirectory: 0,
    accountRowsProposed: 0,
    usernameRowsProposed: 0,
    credentialStatusRowsProposed: 0,
    affectedDocuments: 0,
    rowCountChanges: 0,
    rowOrderChanges: 0,
    nonTargetFieldChanges: 0
  };

  snapshot.docs.forEach(docSnapshot => {
    const data = clone(docSnapshot.data() || {});
    const accounts = clone(data.cuentas || []);
    const portals = clone(data.portales || []);
    const afterAccounts = clone(accounts);
    const afterPortals = clone(portals);
    let changed = false;

    accounts.forEach((account, index) => {
      summary.bankResources += 1;
      const ref = accountRef(account);
      const currentId = rowId(account, index);
      const currentNumber = accountNumber(account);
      if (currentNumber) summary.bankOperationalNumbers += 1;
      if (ref === 'backend_required') summary.bankPendingRows += 1;
      if (!REF_ACCOUNT.test(ref)) return;
      summary.bankReferenceRows += 1;
      if (refs.bank.has(ref)) fail('CURRENT_BANK_REF_DUPLICATE', hash(ref));
      refs.bank.add(ref);
      const record = vault.banks.get(ref);
      if (!record || record.insurerId !== docSnapshot.id) {
        summary.bankUnmatchedRefs += 1;
        return;
      }
      summary.bankMatchedToVault += 1;
      if (record.accountId && record.accountId !== currentId) summary.bankReferenceAccountIdMismatches += 1;
      const needsRepair = currentNumber !== record.number
        || clean(account.estado, 80) !== 'Cuenta operativa disponible'
        || clean(account.clasificacionDato, 40) !== 'operativo'
        || clean(account.visibilidad, 80) !== 'modulo_aseguradoras';
      if (needsRepair) {
        afterAccounts[index].numero = record.number;
        afterAccounts[index].estado = 'Cuenta operativa disponible';
        afterAccounts[index].clasificacionDato = 'operativo';
        afterAccounts[index].visibilidad = 'modulo_aseguradoras';
        summary.accountRowsProposed += 1;
        changed = true;
      }
    });

    portals.forEach((portal, index) => {
      const ref = credentialRef(portal);
      const currentId = rowId(portal, index);
      const currentUser = portalUser(portal);
      if (currentUser) summary.usernamesOperational += 1;
      if (portalPassword(portal)) summary.passwordsInOperationalDirectory += 1;
      if (!REF_CREDENTIAL.test(ref)) return;
      summary.credentialReferenceRows += 1;
      if (refs.credential.has(ref)) fail('CURRENT_CREDENTIAL_REF_DUPLICATE', hash(ref));
      refs.credential.add(ref);
      const record = vault.credentials.get(ref);
      if (!record || record.insurerId !== docSnapshot.id) {
        summary.credentialUnmatchedRefs += 1;
        return;
      }
      summary.credentialMatchedToVault += 1;
      if (record.portalId && record.portalId !== currentId) summary.credentialPortalIdMismatches += 1;
      if (record.passwordAvailable) summary.credentialPasswordsAvailable += 1;
      if (record.username) {
        summary.usernamesAvailableInVault += 1;
        if (currentUser !== record.username || clean(portal.clasificacionUsuario, 40) !== 'operativo') {
          afterPortals[index].usuario = record.username;
          afterPortals[index].clasificacionUsuario = 'operativo';
          summary.usernameRowsProposed += 1;
          changed = true;
        }
      }
      const expectedCredentialState = record.passwordAvailable ? 'registrada' : clean(portal.estadoCredencial, 80);
      const expectedAccessState = record.username && record.passwordAvailable ? 'Acceso disponible' : clean(portal.estadoAcceso, 80);
      if (clean(portal.estadoCredencial, 80) !== expectedCredentialState || clean(portal.estadoAcceso, 80) !== expectedAccessState) {
        afterPortals[index].estadoCredencial = expectedCredentialState;
        afterPortals[index].estadoAcceso = expectedAccessState;
        summary.credentialStatusRowsProposed += 1;
        changed = true;
      }
      delete afterPortals[index].password;
      delete afterPortals[index].contrasena;
      delete afterPortals[index].contraseña;
      delete afterPortals[index].clave;
    });

    const scope = compareUntargeted(accounts, afterAccounts, portals, afterPortals);
    summary.rowCountChanges += scope.rowCountChanges;
    summary.rowOrderChanges += scope.rowOrderChanges;
    summary.nonTargetFieldChanges += scope.nonTargetFieldChanges;
    if (changed) summary.affectedDocuments += 1;
    docs.set(docSnapshot.id, {
      id: docSnapshot.id,
      ref: docSnapshot.ref,
      country: clean(data.pais || data.country, 12).toUpperCase(),
      before: data,
      after: { ...data, cuentas: afterAccounts, portales: afterPortals },
      beforeAccountsHash: digest(accounts),
      afterAccountsHash: digest(afterAccounts),
      beforePortalsHash: digest(portals),
      afterPortalsHash: digest(afterPortals),
      changed
    });
  });

  return { docs, summary, refs };
}
function validatePlan(state, vault, phase) {
  const s = state.summary;
  if (vault.bankCount !== EXPECTED.bankRefs) fail(`${phase}_VAULT_BANK_COUNT_MISMATCH`, vault.bankCount);
  if (s.bankReferenceRows !== EXPECTED.bankRefs) fail(`${phase}_BANK_REF_COUNT_MISMATCH`, s.bankReferenceRows);
  if (s.bankPendingRows !== EXPECTED.bankPending) fail(`${phase}_BANK_PENDING_COUNT_MISMATCH`, s.bankPendingRows);
  if (s.bankMatchedToVault !== EXPECTED.bankRefs || s.bankUnmatchedRefs !== 0) fail(`${phase}_BANK_MATCH_MISMATCH`, `${s.bankMatchedToVault}/${s.bankUnmatchedRefs}`);
  if (s.credentialMatchedToVault !== s.credentialReferenceRows || s.credentialUnmatchedRefs !== 0) fail(`${phase}_CREDENTIAL_MATCH_MISMATCH`, `${s.credentialMatchedToVault}/${s.credentialReferenceRows}/${s.credentialUnmatchedRefs}`);
  if (s.credentialReferenceRows < 1) fail(`${phase}_NO_CREDENTIAL_REFERENCES`);
  if (s.credentialPasswordsAvailable !== s.credentialReferenceRows) fail(`${phase}_CREDENTIAL_PASSWORD_COVERAGE_MISMATCH`, `${s.credentialPasswordsAvailable}/${s.credentialReferenceRows}`);
  if (s.passwordsInOperationalDirectory !== 0) fail(`${phase}_PASSWORD_PRESENT_IN_OPERATIONAL_DIRECTORY`, s.passwordsInOperationalDirectory);
  if (s.usernamesAvailableInVault < 1) fail(`${phase}_NO_USERNAME_AVAILABLE_IN_VAULT`);
  if (s.rowCountChanges !== 0 || s.rowOrderChanges !== 0 || s.nonTargetFieldChanges !== 0) fail(`${phase}_NON_TARGET_CHANGE_DETECTED`, `${s.rowCountChanges}/${s.rowOrderChanges}/${s.nonTargetFieldChanges}`);
  return true;
}
function sanitizedReportBase(counts, vault, state) {
  return {
    schemaVersion: 'orbit360-operational-directory-repair-v2-target-field-only',
    generatedAt: new Date().toISOString(),
    mode: MODE,
    projectId: PROJECT,
    tenantId: TENANT,
    classification: 'DATA_CONTRACT_FAILURE',
    contractVersion: '1.0.38',
    counts,
    vault: {
      bankRecords: vault.bankCount,
      credentialRecords: vault.credentialCount,
      updatedAtHash: vault.updatedAtHash
    },
    directory: state.summary,
    safety: {
      creates: 0,
      deletes: 0,
      reorders: state.summary.rowOrderChanges,
      rowCountChanges: state.summary.rowCountChanges,
      nonTargetFieldChanges: state.summary.nonTargetFieldChanges,
      allowedFields: ['cuentas.numero','cuentas.estado','cuentas.clasificacionDato','cuentas.visibilidad','portales.usuario','portales.clasificacionUsuario','portales.estadoCredencial','portales.estadoAcceso'],
      passwordWrites: 0,
      functionsDeploy: false,
      rulesDeploy: false,
      productionTouched: false,
      reimportExecuted: false,
      rollbackAvailable: APPLY
    },
    affectedDocuments: [...state.docs.values()].filter(item => item.changed).map(item => ({
      insurerHash: hash(item.id),
      country: item.country || 'UNSPECIFIED',
      beforeAccountsHash: item.beforeAccountsHash,
      afterAccountsHash: item.afterAccountsHash,
      beforePortalsHash: item.beforePortalsHash,
      afterPortalsHash: item.afterPortalsHash
    })),
    containsPII: false,
    containsSecrets: false,
    containsRawBankValues: false,
    containsRawUsernames: false
  };
}

async function main() {
  const db = getFirestore(init());
  const tenant = db.collection('tenantId').doc(TENANT);
  const [clients, insurers, advisors, vault] = await Promise.all([
    tenant.collection('clientes').get(),
    tenant.collection('aseguradoras').get(),
    tenant.collection('asesores').get(),
    readVault()
  ]);
  const counts = { clients: clients.size, insurers: insurers.size, advisors: advisors.size };
  if (counts.clients !== EXPECTED.clients || counts.insurers !== EXPECTED.insurers || counts.advisors !== EXPECTED.advisors) fail('TENANT_COUNT_PRECONDITION_MISMATCH', JSON.stringify(counts));

  const before = snapshotState(insurers, vault);
  validatePlan(before, vault, 'BEFORE');

  if (!APPLY) {
    const report = sanitizedReportBase(counts, vault, before);
    report.ok = true;
    report.status = 'DRY_RUN_READY';
    report.writesExecuted = false;
    report.transactionCommitted = false;
    report.rollbackExecuted = false;
    report.acceptance = {
      bankNumbersToRestore: before.summary.accountRowsProposed,
      usernamesToRestore: before.summary.usernameRowsProposed,
      credentialStatusesToNormalize: before.summary.credentialStatusRowsProposed,
      expectedOperationalBankNumbersAfter: EXPECTED.bankRefs,
      expectedOperationalUsernamesAfter: before.summary.usernamesAvailableInVault,
      credentialReferences: before.summary.credentialReferenceRows,
      credentialPasswordsAvailable: before.summary.credentialPasswordsAvailable,
      accountIdMismatchExplainsRevealFailure: before.summary.bankReferenceAccountIdMismatches > 0,
      onlyTargetFieldsChanged: before.summary.rowCountChanges === 0 && before.summary.rowOrderChanges === 0 && before.summary.nonTargetFieldChanges === 0,
      passwordsRemainProtected: true
    };
    report.nextAllowedAction = 'AUTHORIZE_SINGLE_ATOMIC_OPERATIONAL_DIRECTORY_REPAIR';
    write(report);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const affected = [...before.docs.values()].filter(item => item.changed).sort((a,b) => a.id.localeCompare(b.id));
  if (!affected.length) fail('NO_OPERATIONAL_REPAIR_CHANGES');
  const refs = affected.map(item => item.ref);

  await db.runTransaction(async transaction => {
    const currentSnapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
    currentSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) fail('TRANSACTION_DOCUMENT_MISSING', hash(affected[index].id));
      const current = snapshot.data() || {};
      if (digest(current.cuentas || []) !== affected[index].beforeAccountsHash || digest(current.portales || []) !== affected[index].beforePortalsHash) {
        fail('TRANSACTION_PRECONDITION_CHANGED', hash(affected[index].id));
      }
    });
    affected.forEach(item => transaction.update(item.ref, { cuentas: item.after.cuentas, portales: item.after.portales }));
  });
  execution.transactionCommitted = true;

  const readAfter = async () => snapshotState(await tenant.collection('aseguradoras').get(), vault);
  let after;
  try {
    after = await readAfter();
    validatePlan(after, vault, 'AFTER');
    if (after.summary.bankOperationalNumbers !== EXPECTED.bankRefs) fail('AFTER_OPERATIONAL_BANK_COUNT_MISMATCH', after.summary.bankOperationalNumbers);
    if (after.summary.usernamesOperational < before.summary.usernamesAvailableInVault) fail('AFTER_OPERATIONAL_USERNAME_COUNT_MISMATCH', `${after.summary.usernamesOperational}/${before.summary.usernamesAvailableInVault}`);
    if (after.summary.accountRowsProposed !== 0 || after.summary.usernameRowsProposed !== 0 || after.summary.credentialStatusRowsProposed !== 0) fail('AFTER_REPAIR_NOT_IDEMPOTENT', `${after.summary.accountRowsProposed}/${after.summary.usernameRowsProposed}/${after.summary.credentialStatusRowsProposed}`);
    for (const item of affected) {
      const current = after.docs.get(item.id);
      if (!current || current.beforeAccountsHash !== item.afterAccountsHash || current.beforePortalsHash !== item.afterPortalsHash) fail('AFTER_READBACK_HASH_MISMATCH', hash(item.id));
    }
  } catch (error) {
    await db.runTransaction(async transaction => {
      const currentSnapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
      currentSnapshots.forEach((snapshot, index) => {
        const current = snapshot.data() || {};
        if (digest(current.cuentas || []) !== affected[index].afterAccountsHash || digest(current.portales || []) !== affected[index].afterPortalsHash) fail('ROLLBACK_PRECONDITION_CHANGED', hash(affected[index].id));
      });
      affected.forEach(item => transaction.update(item.ref, { cuentas: item.before.cuentas || [], portales: item.before.portales || [] }));
    });
    execution.rollbackExecuted = true;
    const rolledBack = await readAfter();
    execution.rollbackVerified = affected.every(item => {
      const current = rolledBack.docs.get(item.id);
      return current && current.beforeAccountsHash === item.beforeAccountsHash && current.beforePortalsHash === item.beforePortalsHash;
    });
    if (!execution.rollbackVerified) fail('ROLLBACK_VERIFICATION_FAILED');
    throw error;
  }

  const report = sanitizedReportBase(counts, vault, before);
  report.ok = true;
  report.status = 'APPLIED_AND_VERIFIED';
  report.writesExecuted = true;
  report.transactionCommitted = execution.transactionCommitted;
  report.rollbackExecuted = execution.rollbackExecuted;
  report.rollbackVerified = execution.rollbackVerified;
  report.after = {
    bankOperationalNumbers: after.summary.bankOperationalNumbers,
    bankPendingRows: after.summary.bankPendingRows,
    usernamesOperational: after.summary.usernamesOperational,
    credentialPasswordsAvailable: after.summary.credentialPasswordsAvailable,
    passwordsInOperationalDirectory: after.summary.passwordsInOperationalDirectory,
    accountRowsStillProposed: after.summary.accountRowsProposed,
    usernameRowsStillProposed: after.summary.usernameRowsProposed,
    credentialStatusRowsStillProposed: after.summary.credentialStatusRowsProposed,
    rowCountChanges: after.summary.rowCountChanges,
    rowOrderChanges: after.summary.rowOrderChanges,
    nonTargetFieldChanges: after.summary.nonTargetFieldChanges
  };
  report.nextAllowedAction = 'PUBLISH_HOSTING_LAB_AND_HUMAN_VISUAL_REVIEW';
  write(report);
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  const code = String(error && (error.code || error.message) || 'UNKNOWN');
  const payload = {
    schemaVersion: 'orbit360-operational-directory-repair-v2-target-field-only',
    generatedAt: new Date().toISOString(),
    mode: MODE,
    projectId: PROJECT,
    tenantId: TENANT,
    ok: false,
    classification: code.includes('PROJECT') || code.includes('SERVICE_ACCOUNT') ? 'ENVIRONMENT_FAILURE' : 'DATA_CONTRACT_FAILURE',
    errorCode: clean(code, 160).replace(/[^A-Za-z0-9_.:-]/g, '_'),
    errorDetailHash: hash(error && error.detail, 16),
    transactionCommitted: execution.transactionCommitted,
    writesExecuted: execution.transactionCommitted,
    rollbackExecuted: execution.rollbackExecuted,
    rollbackVerified: execution.rollbackVerified,
    functionsDeploy: false,
    rulesDeploy: false,
    productionTouched: false,
    reimportExecuted: false,
    containsPII: false,
    containsSecrets: false,
    nextAllowedAction: 'STOP_THE_LINE'
  };
  write(payload);
  console.error(JSON.stringify(payload, null, 2));
  process.exit(41);
});
