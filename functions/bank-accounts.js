'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'ays-orbit-360-lab';
const EXPECTED_PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL = 'orbit.lab@demo.com';
const SECRET_ID = process.env.ORBIT360_CREDENTIAL_SECRET_ID || 'orbit360-insurer-credentials-alianzas-soluciones';
const RUNTIME_SERVICE_ACCOUNT = process.env.ORBIT360_SECRETS_SERVICE_ACCOUNT ||
  'orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com';
const SECRET_PARENT = `projects/${EXPECTED_PROJECT_ID}/secrets/${SECRET_ID}`;
const SECRET_LATEST = `${SECRET_PARENT}/versions/latest`;
const ACCOUNT_REF_RE = /^acct_[a-f0-9]{32}$/;
const BANK_VIEW_ROLES = new Set(['direccion', 'superadmin', 'super_admin', 'admin', 'admintenant', 'admin_tenant', 'operativo', 'asesor']);
const IMPORT_ROLES = new Set(['direccion', 'superadmin', 'super_admin', 'admin', 'admintenant', 'admin_tenant']);
const VIEW_EXTRA_PERMISSIONS = new Set(['aseguradoras_cuentas_ver', 'aseguradoras_cuentas_copiar', 'bank_accounts_view']);
const IMPORT_EXTRA_PERMISSIONS = new Set(['aseguradoras_importar_cuentas', 'aseguradoras_cuentas_importar', 'bank_accounts_import']);
const MAX_IMPORT_ITEMS = 200;
const MAX_SECRET_BYTES = 62000;

const app = getApps()[0] || initializeApp({ projectId: EXPECTED_PROJECT_ID });
const db = getFirestore(app);
const secrets = new SecretManagerServiceClient();

function clean(value, max = 512) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}

function normalize(value) {
  return clean(value, 120)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function unique(values) {
  return Array.from(new Set([].concat(values || []).map((value) => clean(value)).filter(Boolean)));
}

function rolesFrom(row) {
  row = row || {};
  return unique([].concat(
    row.roles || [], row.rolesAsignados || [], row.rolesDisponibles || [],
    row.assignedRoles || [], row.role || [], row.rol || [], row.rolDefault || []
  )).map(normalize).filter(Boolean);
}

function permissionsFrom(row) {
  row = row || {};
  return unique([].concat(
    row.permisosExtra || [], row.extras || [], row.permissions || [], row.extraPermissions || []
  )).map(normalize).filter(Boolean);
}

function stableAccountRef(insurerId, accountId) {
  const digest = crypto.createHash('sha256')
    .update(`${TENANT_ID}|bank_account|${clean(insurerId, 160)}|${clean(accountId, 160)}`)
    .digest('hex')
    .slice(0, 32);
  return `acct_${digest}`;
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

async function readVault() {
  try {
    const [version] = await secrets.accessSecretVersion({ name: SECRET_LATEST });
    const text = version && version.payload && version.payload.data
      ? Buffer.from(version.payload.data).toString('utf8')
      : '';
    if (!text) return emptyVault();
    const parsed = JSON.parse(text);
    if (!parsed || parsed.schemaVersion !== 'orbit360-insurer-credentials-v1' || parsed.tenantId !== TENANT_ID) {
      throw new HttpsError('failed-precondition', 'La bóveda segura tiene un contrato incompatible.');
    }
    parsed.records = parsed.records && typeof parsed.records === 'object' ? parsed.records : {};
    parsed.bankAccounts = parsed.bankAccounts && typeof parsed.bankAccounts === 'object' ? parsed.bankAccounts : {};
    parsed.bankAccountMigrationBackups = parsed.bankAccountMigrationBackups && typeof parsed.bankAccountMigrationBackups === 'object'
      ? parsed.bankAccountMigrationBackups
      : {};
    return parsed;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (Number(error && error.code) === 5) return emptyVault();
    throw new HttpsError('unavailable', 'No fue posible consultar la bóveda segura.');
  }
}

async function writeVault(vault) {
  vault.updatedAt = new Date().toISOString();
  const payload = Buffer.from(JSON.stringify(vault), 'utf8');
  if (payload.byteLength > MAX_SECRET_BYTES) {
    throw new HttpsError('resource-exhausted', 'La bóveda segura alcanzó su límite operativo.');
  }
  try {
    await secrets.addSecretVersion({ parent: SECRET_PARENT, payload: { data: payload } });
  } catch (error) {
    throw new HttpsError('unavailable', 'No fue posible guardar la cuenta de forma segura.');
  }
}

async function readAdvisor(member, auth) {
  const collection = db.collection('tenantId').doc(TENANT_ID).collection('asesores');
  const directId = clean(member.asesorId || member.advisorId || member.actorAdvisorId, 160);
  if (directId) {
    const direct = await collection.doc(directId).get();
    if (direct.exists) return { id: direct.id, ...(direct.data() || {}) };
  }
  const snapshot = await collection.get();
  const email = clean(auth.token && auth.token.email, 200).toLowerCase();
  const uid = clean(auth.uid, 160);
  const found = snapshot.docs.find((doc) => {
    const row = doc.data() || {};
    const rowUid = clean(row.uid || row.authUid || row.userUid, 160);
    const rowEmail = clean(row.email || row.correo || row.userEmail, 200).toLowerCase();
    return (rowUid && rowUid === uid) || (rowEmail && rowEmail === email);
  });
  return found ? { id: found.id, ...(found.data() || {}) } : null;
}

async function authorize(request, action) {
  if (PROJECT_ID !== EXPECTED_PROJECT_ID) throw new HttpsError('failed-precondition', 'Proveedor seguro fuera del proyecto autorizado.');
  if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  const email = clean(request.auth.token && request.auth.token.email, 200).toLowerCase();
  if (request.auth.uid !== EXPECTED_UID || email !== EXPECTED_EMAIL) {
    throw new HttpsError('permission-denied', 'Identidad no autorizada para este LAB.');
  }
  const input = request.data || {};
  if (clean(input.tenantId, 120) !== TENANT_ID) throw new HttpsError('permission-denied', 'Tenant no autorizado.');
  const memberSnapshot = await db.collection('tenants').doc(TENANT_ID).collection('members').doc(request.auth.uid).get();
  const member = memberSnapshot.exists ? (memberSnapshot.data() || {}) : null;
  if (!member || clean(member.status, 40).toLowerCase() !== 'active' || clean(member.tenantId, 120) !== TENANT_ID) {
    throw new HttpsError('permission-denied', 'Membership activa requerida.');
  }
  const advisor = await readAdvisor(member, request.auth);
  const assignedRoles = unique(rolesFrom(member).concat(rolesFrom(advisor)));
  const permissions = unique(permissionsFrom(member).concat(permissionsFrom(advisor)));
  const activeRole = normalize(input.activeRole);
  if (!activeRole || !assignedRoles.includes(activeRole)) {
    throw new HttpsError('permission-denied', 'El rol activo no está asignado a la identidad.');
  }
  const roles = action === 'import' ? IMPORT_ROLES : BANK_VIEW_ROLES;
  const extras = action === 'import' ? IMPORT_EXTRA_PERMISSIONS : VIEW_EXTRA_PERMISSIONS;
  if (!roles.has(activeRole) && !permissions.some((item) => extras.has(item))) {
    throw new HttpsError('permission-denied', 'El rol activo no permite acceder a cuentas bancarias.');
  }
  return { uid: request.auth.uid, activeRole, advisorId: advisor && advisor.id || '' };
}

async function audit(action, actor, detail) {
  const safe = detail || {};
  await db.collection('tenants').doc(TENANT_ID).collection('auditEvents').add({
    schemaVersion: 'orbit360-secure-bank-audit-v1',
    tenantId: TENANT_ID,
    action: clean(action, 80),
    actorUid: clean(actor && actor.uid, 160),
    activeRole: clean(actor && actor.activeRole, 80),
    advisorId: clean(actor && actor.advisorId, 160),
    insurerId: clean(safe.insurerId, 160),
    accountId: clean(safe.accountId, 160),
    accountRef: ACCOUNT_REF_RE.test(clean(safe.accountRef, 80)) ? clean(safe.accountRef, 80) : '',
    outcome: clean(safe.outcome || 'ok', 60),
    count: Number.isFinite(Number(safe.count)) ? Number(safe.count) : 0,
    createdAt: FieldValue.serverTimestamp(),
    containsSecrets: false
  });
}

function sanitizeImportItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > MAX_IMPORT_ITEMS) {
    throw new HttpsError('invalid-argument', 'Cantidad de cuentas inválida.');
  }
  return items.map((item, index) => {
    const insurerId = clean(item && item.insurerId, 160);
    const accountId = clean(item && (item.accountId || item.resourceId), 160);
    const accountNumber = clean(item && item.accountNumber, 240);
    if (!insurerId || !accountId || !accountNumber) {
      throw new HttpsError('invalid-argument', `Cuenta incompleta en posición ${index + 1}.`);
    }
    const ref = ACCOUNT_REF_RE.test(clean(item && item.accountRef, 80))
      ? clean(item.accountRef, 80)
      : stableAccountRef(insurerId, accountId);
    return {
      insurerId,
      accountId,
      accountNumber,
      bank: clean(item && item.bank, 160),
      accountType: clean(item && item.accountType, 120),
      currency: clean(item && item.currency, 20),
      ref
    };
  });
}

async function retrieveRecord(request, action) {
  const actor = await authorize(request, 'view');
  const input = request.data || {};
  const ref = clean(input.accountRef, 80);
  const insurerId = clean(input.insurerId, 160);
  const accountId = clean(input.accountId, 160);
  if (!ACCOUNT_REF_RE.test(ref)) throw new HttpsError('invalid-argument', 'Referencia de cuenta inválida.');
  const vault = await readVault();
  const record = vault.bankAccounts[ref];
  if (!record || record.insurerId !== insurerId || record.accountId !== accountId) {
    await audit(action, actor, { insurerId, accountId, accountRef: ref, outcome: 'not_found' });
    throw new HttpsError('not-found', 'Cuenta no disponible.');
  }
  return { actor, ref, record };
}

const callOptions = { timeoutSeconds: 60, maxInstances: 2, concurrency: 2, serviceAccount: RUNTIME_SERVICE_ACCOUNT };

exports.orbit360ImportInsurerBankAccounts = onCall(callOptions, async (request) => {
  const actor = await authorize(request, 'import');
  const items = sanitizeImportItems((request.data || {}).items);
  const vault = await readVault();
  const mappings = [];
  for (const item of items) {
    vault.bankAccounts[item.ref] = {
      schemaVersion: 'orbit360-insurer-bank-account-record-v1',
      tenantId: TENANT_ID,
      insurerId: item.insurerId,
      accountId: item.accountId,
      accountNumber: item.accountNumber,
      bank: item.bank,
      accountType: item.accountType,
      currency: item.currency,
      updatedAt: new Date().toISOString()
    };
    mappings.push({ insurerId: item.insurerId, accountId: item.accountId, accountRef: item.ref, available: true });
  }
  await writeVault(vault);
  await audit('bank_account.import', actor, { count: mappings.length, outcome: 'stored' });
  return { ok: true, status: 'stored_securely', imported: mappings.length, mappings, containsSecrets: false };
});

exports.orbit360BankAccountStatus = onCall(callOptions, async (request) => {
  const actor = await authorize(request, 'view');
  const input = request.data || {};
  const ref = clean(input.accountRef, 80);
  const insurerId = clean(input.insurerId, 160);
  const accountId = clean(input.accountId, 160);
  if (!ACCOUNT_REF_RE.test(ref)) return { ok: true, status: 'sin_referencia', available: false, revealAvailable: false, copyAvailable: false };
  const vault = await readVault();
  const record = vault.bankAccounts[ref];
  const available = Boolean(record && record.insurerId === insurerId && record.accountId === accountId && record.accountNumber);
  await audit('bank_account.status', actor, { insurerId, accountId, accountRef: ref, outcome: available ? 'available' : 'not_found' });
  return { ok: true, status: available ? 'disponible' : 'no_disponible', available, revealAvailable: available, copyAvailable: available, requiresReauth: true, containsSecrets: false };
});

exports.orbit360RevealInsurerBankAccount = onCall(callOptions, async (request) => {
  const result = await retrieveRecord(request, 'bank_account.reveal');
  await audit('bank_account.reveal', result.actor, { insurerId: result.record.insurerId, accountId: result.record.accountId, accountRef: result.ref, outcome: 'revealed' });
  return { ok: true, value: clean(result.record.accountNumber, 240), field: 'bank_account', expiresInMs: 10000 };
});

exports.orbit360CopyInsurerBankAccount = onCall(callOptions, async (request) => {
  const result = await retrieveRecord(request, 'bank_account.copy');
  await audit('bank_account.copy', result.actor, { insurerId: result.record.insurerId, accountId: result.record.accountId, accountRef: result.ref, outcome: 'copied' });
  return { ok: true, value: clean(result.record.accountNumber, 240), field: 'bank_account', expiresInMs: 3000 };
});
