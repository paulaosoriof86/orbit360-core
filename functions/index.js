'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'ays-orbit-360-lab';
const EXPECTED_PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
const EXPECTED_EMAIL = 'orbit.lab@demo.com';
const REGION = 'us-central1';
const SECRET_ID = process.env.ORBIT360_CREDENTIAL_SECRET_ID || 'orbit360-insurer-credentials-alianzas-soluciones';
const RUNTIME_SERVICE_ACCOUNT = process.env.ORBIT360_SECRETS_SERVICE_ACCOUNT ||
  'orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com';
const SECRET_PARENT = `projects/${EXPECTED_PROJECT_ID}/secrets/${SECRET_ID}`;
const SECRET_LATEST = `${SECRET_PARENT}/versions/latest`;
const REF_RE = /^cred_[a-f0-9]{32}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const VIEW_ROLES = new Set(['direccion', 'superadmin', 'super_admin', 'admin', 'admintenant', 'admin_tenant', 'operativo']);
const IMPORT_ROLES = new Set(['direccion', 'superadmin', 'super_admin', 'admin', 'admintenant', 'admin_tenant']);
const VIEW_EXTRA_PERMISSIONS = new Set(['aseguradoras_ver_credenciales', 'aseguradoras_credenciales_ver', 'credentials_view']);
const IMPORT_EXTRA_PERMISSIONS = new Set(['aseguradoras_importar_credenciales', 'aseguradoras_credenciales_importar', 'credentials_import']);
const MAX_IMPORT_ITEMS = 100;
const MAX_SECRET_BYTES = 62000;

setGlobalOptions({ region: REGION, serviceAccount: RUNTIME_SERVICE_ACCOUNT, memory: '256MiB' });

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
    row.roles || [],
    row.rolesAsignados || [],
    row.rolesDisponibles || [],
    row.assignedRoles || [],
    row.role || [],
    row.rol || [],
    row.rolDefault || []
  )).map(normalize).filter(Boolean);
}

function permissionsFrom(row) {
  row = row || {};
  return unique([].concat(
    row.permisosExtra || [],
    row.extras || [],
    row.permissions || [],
    row.extraPermissions || []
  )).map(normalize).filter(Boolean);
}

function stableRef(insurerId, portalId) {
  const digest = crypto.createHash('sha256')
    .update(`${TENANT_ID}|${clean(insurerId, 120)}|${clean(portalId, 120)}`)
    .digest('hex')
    .slice(0, 32);
  return `cred_${digest}`;
}

function emptyVault() {
  return {
    schemaVersion: 'orbit360-insurer-credentials-v1',
    tenantId: TENANT_ID,
    updatedAt: new Date().toISOString(),
    records: {}
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
    return parsed;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    const code = Number(error && error.code);
    if (code === 5) return emptyVault();
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
    await secrets.addSecretVersion({
      parent: SECRET_PARENT,
      payload: { data: payload }
    });
  } catch (error) {
    throw new HttpsError('unavailable', 'No fue posible guardar las credenciales de forma segura.');
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
  if (PROJECT_ID !== EXPECTED_PROJECT_ID) {
    throw new HttpsError('failed-precondition', 'Proveedor seguro fuera del proyecto autorizado.');
  }
  if (!request.auth) throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  const email = clean(request.auth.token && request.auth.token.email, 200).toLowerCase();
  if (request.auth.uid !== EXPECTED_UID || email !== EXPECTED_EMAIL) {
    throw new HttpsError('permission-denied', 'Identidad no autorizada para este LAB.');
  }

  const input = request.data || {};
  if (clean(input.tenantId, 120) !== TENANT_ID) {
    throw new HttpsError('permission-denied', 'Tenant no autorizado.');
  }

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

  const roleAllowed = action === 'import' ? IMPORT_ROLES.has(activeRole) : VIEW_ROLES.has(activeRole);
  const permissionSet = action === 'import' ? IMPORT_EXTRA_PERMISSIONS : VIEW_EXTRA_PERMISSIONS;
  const extraAllowed = permissions.some((item) => permissionSet.has(item));
  if (!roleAllowed && !extraAllowed) {
    throw new HttpsError('permission-denied', 'El rol activo no permite acceder a credenciales.');
  }

  return {
    uid: request.auth.uid,
    activeRole,
    advisorId: advisor && advisor.id || '',
    assignedRoles,
    permissions
  };
}

async function audit(action, actor, detail) {
  const safe = detail || {};
  await db.collection('tenants').doc(TENANT_ID).collection('auditEvents').add({
    schemaVersion: 'orbit360-secure-access-audit-v1',
    tenantId: TENANT_ID,
    action: clean(action, 80),
    actorUid: clean(actor && actor.uid, 160),
    activeRole: clean(actor && actor.activeRole, 80),
    advisorId: clean(actor && actor.advisorId, 160),
    insurerId: clean(safe.insurerId, 160),
    portalId: clean(safe.portalId, 160),
    credentialRef: REF_RE.test(clean(safe.credentialRef, 80)) ? clean(safe.credentialRef, 80) : '',
    field: ['username', 'password'].includes(safe.field) ? safe.field : '',
    outcome: clean(safe.outcome || 'ok', 60),
    sourceHash: HASH_RE.test(clean(safe.sourceHash, 80)) ? clean(safe.sourceHash, 80) : '',
    count: Number.isFinite(Number(safe.count)) ? Number(safe.count) : 0,
    createdAt: FieldValue.serverTimestamp(),
    containsSecrets: false
  });
}

function sanitizeImportItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > MAX_IMPORT_ITEMS) {
    throw new HttpsError('invalid-argument', 'Cantidad de credenciales inválida.');
  }
  return items.map((item, index) => {
    const insurerId = clean(item && item.insurerId, 160);
    const portalId = clean(item && (item.portalId || item.resourceId), 160);
    const username = clean(item && item.username, 320);
    const password = clean(item && item.password, 512);
    if (!insurerId || !portalId || (!username && !password)) {
      throw new HttpsError('invalid-argument', `Credencial incompleta en posición ${index + 1}.`);
    }
    const ref = REF_RE.test(clean(item && item.credentialRef, 80))
      ? clean(item.credentialRef, 80)
      : stableRef(insurerId, portalId);
    return { insurerId, portalId, username, password, ref };
  });
}

async function retrieveRecord(request, action) {
  const actor = await authorize(request, 'view');
  const input = request.data || {};
  const ref = clean(input.credentialRef, 80);
  const insurerId = clean(input.insurerId, 160);
  const portalId = clean(input.portalId, 160);
  if (!REF_RE.test(ref)) throw new HttpsError('invalid-argument', 'Referencia de credencial inválida.');
  const vault = await readVault();
  const record = vault.records[ref];
  if (!record || record.insurerId !== insurerId || record.portalId !== portalId) {
    await audit(action, actor, { insurerId, portalId, credentialRef: ref, outcome: 'not_found' });
    throw new HttpsError('not-found', 'Credencial no disponible.');
  }
  return { actor, input, ref, record };
}

exports.orbit360ImportInsurerCredentials = onCall(
  { timeoutSeconds: 60, maxInstances: 1, concurrency: 1 },
  async (request) => {
    const actor = await authorize(request, 'import');
    const input = request.data || {};
    const sourceHash = clean(input.sourceHash, 80).toLowerCase();
    if (sourceHash && !HASH_RE.test(sourceHash)) {
      throw new HttpsError('invalid-argument', 'Huella de fuente inválida.');
    }
    const items = sanitizeImportItems(input.items);
    const vault = await readVault();
    const mappings = [];
    for (const item of items) {
      const before = vault.records[item.ref] || {};
      vault.records[item.ref] = {
        schemaVersion: 'orbit360-insurer-credential-record-v1',
        tenantId: TENANT_ID,
        insurerId: item.insurerId,
        portalId: item.portalId,
        username: item.username || clean(before.username, 320),
        password: item.password || clean(before.password, 512),
        sourceHash: sourceHash || clean(before.sourceHash, 80),
        updatedAt: new Date().toISOString()
      };
      mappings.push({
        insurerId: item.insurerId,
        portalId: item.portalId,
        credentialRef: item.ref,
        available: Boolean(vault.records[item.ref].username || vault.records[item.ref].password),
        usernameAvailable: Boolean(vault.records[item.ref].username),
        passwordAvailable: Boolean(vault.records[item.ref].password)
      });
    }
    await writeVault(vault);
    await audit('credential.import', actor, { sourceHash, count: mappings.length, outcome: 'stored' });
    return {
      ok: true,
      status: 'stored_securely',
      imported: mappings.length,
      mappings,
      containsSecrets: false
    };
  }
);

exports.orbit360CredentialStatus = onCall(
  { timeoutSeconds: 20, maxInstances: 10 },
  async (request) => {
    const actor = await authorize(request, 'view');
    const input = request.data || {};
    const ref = clean(input.credentialRef, 80);
    const insurerId = clean(input.insurerId, 160);
    const portalId = clean(input.portalId, 160);
    if (!REF_RE.test(ref)) return { ok: true, status: 'sin_referencia', available: false, revealAvailable: false, copyAvailable: false };
    const vault = await readVault();
    const record = vault.records[ref];
    const available = Boolean(record && record.insurerId === insurerId && record.portalId === portalId && (record.username || record.password));
    await audit('credential.status', actor, { insurerId, portalId, credentialRef: ref, outcome: available ? 'available' : 'not_found' });
    return {
      ok: true,
      status: available ? 'disponible' : 'no_disponible',
      available,
      revealAvailable: available,
      copyAvailable: available,
      requiresReauth: true,
      usernameAvailable: Boolean(available && record.username),
      passwordAvailable: Boolean(available && record.password),
      containsSecrets: false
    };
  }
);

exports.orbit360RevealInsurerCredential = onCall(
  { timeoutSeconds: 20, maxInstances: 10 },
  async (request) => {
    const result = await retrieveRecord(request, 'credential.reveal');
    const field = clean(result.input.field, 40);
    if (!['username', 'password'].includes(field)) throw new HttpsError('invalid-argument', 'Campo de credencial inválido.');
    const value = clean(result.record[field], field === 'password' ? 512 : 320);
    if (!value) throw new HttpsError('not-found', 'Dato de acceso no disponible.');
    await audit('credential.reveal', result.actor, {
      insurerId: result.record.insurerId,
      portalId: result.record.portalId,
      credentialRef: result.ref,
      field,
      outcome: 'revealed'
    });
    return { ok: true, value, field, expiresInMs: 10000 };
  }
);

exports.orbit360CopyInsurerCredential = onCall(
  { timeoutSeconds: 20, maxInstances: 10 },
  async (request) => {
    const result = await retrieveRecord(request, 'credential.copy');
    const field = clean(result.input.field, 40);
    if (!['username', 'password'].includes(field)) throw new HttpsError('invalid-argument', 'Campo de credencial inválido.');
    const value = clean(result.record[field], field === 'password' ? 512 : 320);
    if (!value) throw new HttpsError('not-found', 'Dato de acceso no disponible.');
    await audit('credential.copy', result.actor, {
      insurerId: result.record.insurerId,
      portalId: result.record.portalId,
      credentialRef: result.ref,
      field,
      outcome: 'copied'
    });
    return { ok: true, value, field, expiresInMs: 3000 };
  }
);
