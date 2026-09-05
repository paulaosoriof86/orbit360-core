'use strict';

const crypto = require('node:crypto');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { resolveProductActiveRole } = require('./product-active-role-contract');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'gravicentra-product-operational-domain-v1';
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);

const COLLECTION_MODULE = Object.freeze({
  clientes: 'cliente360',
  aseguradoras: 'aseguradoras',
  polizas: 'polizas',
  vehiculos: 'polizas',
  recibosEsperados: 'polizas',
  carteraPrimas: 'polizas',
  cobros: 'cobros',
  reclamos: 'siniestros',
  cancelaciones: 'cancelaciones',
  comisiones: 'comisiones',
  actividades: 'cliente360',
  asesores: 'equipo',
  auditoria: 'equipo',
  auditoriaAsegExterna: 'aseguradoras'
});
const ADMIN_ROLES = new Set(['direccion', 'superadmin', 'super_admin', 'admintenant', 'admin_tenant', 'admin', 'operativo']);
const TEAM_ROLES = new Set(['direccion', 'superadmin', 'super_admin', 'admintenant', 'admin_tenant', 'admin']);
const FINANCE_ROLES = new Set(['finanzas', 'finance']);
const INSERT_ONLY = new Set(['auditoria', 'auditoriaAsegExterna']);
const REMOVABLE = new Set(['aseguradoras']);
const SECRET_KEY = /^(?:password|pass|pwd|contrasena|contraseña|clave|secret|token|accessToken|refreshToken|privateKey|clientSecret|credentialValue|credential_value)$/i;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,255}$/;

const text = (value, max = 800) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const norm = value => text(value, 160).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const unique = values => Array.from(new Set([].concat(values || []).map(v => text(v, 180)).filter(Boolean)));
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const stable = value => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};
const digest = value => sha(JSON.stringify(stable(value)));
const now = () => FieldValue.serverTimestamp();

function cleanId(value, label) {
  const out = text(value, 256);
  if (!ID_RE.test(out)) throw new HttpsError('invalid-argument', `${label || 'ID'} inválido.`);
  return out;
}
function permissionsOf(member) {
  return unique([...(member.permissions || []), ...(member.permisosExtra || []), ...(member.extras || [])]).map(norm);
}
function activeMember(member) {
  const status = norm(member && (member.status || member.estado));
  return !!member && member.active !== false && member.activo !== false && !['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(status);
}
function containsSecret(value, path = '') {
  if (!value || typeof value !== 'object') return '';
  for (const key of Object.keys(value)) {
    const current = path ? `${path}.${key}` : key;
    if (SECRET_KEY.test(key) && value[key] !== null && value[key] !== undefined && text(value[key])) return current;
    if (value[key] && typeof value[key] === 'object') {
      const nested = containsSecret(value[key], current);
      if (nested) return nested;
    }
  }
  return '';
}
function canonicalRef(tenantId, collection, id) {
  return db.collection('tenants').doc(tenantId).collection('data').doc(collection).collection('items').doc(id);
}
function memberRef(tenantId, uid) {
  return db.collection('tenants').doc(tenantId).collection('members').doc(uid);
}
function requestRef(tenantId, requestId) {
  return db.collection('tenants').doc(tenantId).collection('operationalRequests').doc(requestId);
}
function eventRef(tenantId, eventId) {
  return db.collection('tenants').doc(tenantId).collection('operationalEvents').doc(eventId);
}
function dataScopesForAdvisor(row) {
  if (row.dataScopes && typeof row.dataScopes === 'object' && !Array.isArray(row.dataScopes)) return row.dataScopes;
  const scope = text(row.scopeDatos || row.dataScope || 'propios', 40);
  const domains = ['clientes','polizas','vehiculos','recibos','cartera','cobros','comisiones','gestiones','leads','workflow'];
  return Object.fromEntries(domains.map(domain => [domain, scope]));
}
function membershipPatchFromAdvisor(row, current) {
  const roles = unique(row.roles && row.roles.length ? row.roles : [row.rolDefault || row.rol]);
  const defaultRole = text(row.rolDefault || row.defaultRole || row.rol || roles[0], 100);
  const activeRole = roles.includes(text(current && current.activeRole, 100)) ? text(current.activeRole, 100) : defaultRole;
  return {
    tenantId: text(row.tenantId, 160),
    advisorId: text(row.id, 160),
    status: row.inactivo === true || row.activo === false || norm(row.estado) === 'inactivo' ? 'blocked' : 'active',
    roles,
    defaultRole,
    activeRole,
    countries: unique(row.paises && row.paises.length ? row.paises : [row.paisDefault || row.pais]).map(v => text(v, 8).toUpperCase()),
    dataScopes: dataScopesForAdvisor(row),
    modulesExtra: unique(row.modulosExtra || row.modulesExtra),
    modulesRestricted: unique(row.modulosRestringidos || row.modulesRestricted),
    updatedAt: now(),
    schemaVersion: 'orbit360-tenant-membership-v2'
  };
}
async function authorize(request, tenantId, mutations) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Se requiere sesión activa.');
  const snap = await memberRef(tenantId, request.auth.uid).get();
  const member = snap.exists ? snap.data() : null;
  if (!activeMember(member) || text(member.tenantId, 160) !== tenantId) throw new HttpsError('permission-denied', 'Membresía activa requerida.');
  let requestedRole;
  try {
    requestedRole = resolveProductActiveRole(member, request.data && request.data.activeRole).activeRole;
  } catch (error) {
    throw new HttpsError('permission-denied', error && error.code === 'PRODUCT_ASSIGNED_ROLES_MISSING' ? 'La membresía no tiene roles asignados.' : 'El rol activo no está asignado.');
  }
  const permissions = permissionsOf(member);
  for (const mutation of mutations) {
    const collection = text(mutation.collection, 80);
    const moduleKey = COLLECTION_MODULE[collection];
    if (!moduleKey) throw new HttpsError('permission-denied', 'Colección fuera del contrato operativo.');
    let allowed = ADMIN_ROLES.has(requestedRole);
    if (collection === 'asesores' || collection === 'auditoria') allowed = TEAM_ROLES.has(requestedRole);
    if (['cobros','comisiones','recibosEsperados','carteraPrimas'].includes(collection) && FINANCE_ROLES.has(requestedRole)) allowed = true;
    if (!allowed) {
      const keys = [`${moduleKey}_manage`, `${moduleKey}_edit`, `${moduleKey}_editar`, `${moduleKey}_create`, `${moduleKey}_crear`].map(norm);
      allowed = permissions.some(p => keys.includes(p));
    }
    if (!allowed) throw new HttpsError('permission-denied', `El rol activo no puede escribir ${collection}.`);
  }
  return { uid: request.auth.uid, activeRole: requestedRole, member };
}
function normalizeMutation(raw) {
  const mutation = raw || {};
  const action = norm(mutation.action);
  if (!['insert','update','remove'].includes(action)) throw new HttpsError('invalid-argument', 'Acción operativa inválida.');
  const collection = text(mutation.collection, 80);
  if (!COLLECTION_MODULE[collection]) throw new HttpsError('invalid-argument', 'Colección operativa inválida.');
  if (INSERT_ONLY.has(collection) && action !== 'insert') throw new HttpsError('failed-precondition', 'La auditoría es append-only.');
  if (action === 'remove' && !REMOVABLE.has(collection)) throw new HttpsError('failed-precondition', 'Borrado físico no autorizado para esta colección.');
  const id = cleanId(mutation.id || mutation.payload && mutation.payload.id, 'documentId');
  const payload = mutation.payload && typeof mutation.payload === 'object' ? stable(mutation.payload) : null;
  if (action !== 'remove' && !payload) throw new HttpsError('invalid-argument', 'Payload requerido.');
  const secret = containsSecret(payload);
  if (secret) throw new HttpsError('failed-precondition', `Material secreto no permitido en dato operativo: ${secret}`);
  return { action, collection, id, payload };
}

async function execute(request) {
  const input = request.data || {};
  const tenantId = cleanId(input.tenantId, 'tenantId');
  const mutations = [].concat(input.mutations || []).map(normalizeMutation);
  if (!mutations.length || mutations.length > 80) throw new HttpsError('invalid-argument', 'Lote operativo inválido.');
  const actor = await authorize(request, tenantId, mutations);
  const payloadDigest = digest(mutations);
  const requestId = cleanId(input.requestId || `op_${sha(`${tenantId}|${actor.uid}|${payloadDigest}`).slice(0, 32)}`, 'requestId');
  const reqRef = requestRef(tenantId, requestId);
  const eventId = `opevt_${sha(`${tenantId}|${requestId}`).slice(0, 28)}`;

  return db.runTransaction(async tx => {
    const previous = await tx.get(reqRef);
    if (previous.exists) {
      const row = previous.data() || {};
      if (row.payloadDigest !== payloadDigest) throw new HttpsError('already-exists', 'El requestId corresponde a otro contenido.');
      if (row.status === 'committed') return Object.assign({ reused: true }, row.result || {});
    }

    const reads = [];
    for (const mutation of mutations) {
      const ref = canonicalRef(tenantId, mutation.collection, mutation.id);
      reads.push({ mutation, ref, snap: await tx.get(ref) });
    }

    for (const item of reads) {
      const { mutation, ref, snap } = item;
      const before = snap.exists ? snap.data() : null;
      if (mutation.action === 'insert' && before) throw new HttpsError('already-exists', `${mutation.collection}/${mutation.id} ya existe.`);
      if ((mutation.action === 'update' || mutation.action === 'remove') && !before) throw new HttpsError('not-found', `${mutation.collection}/${mutation.id} no existe.`);
      if (mutation.action === 'remove') {
        if (mutation.collection === 'aseguradoras') {
          const linked = db.collection('tenants').doc(tenantId).collection('data').doc('polizas').collection('items').where('aseguradoraId','==',mutation.id).limit(1);
          const linkedSnap = await tx.get(linked);
          if (!linkedSnap.empty) throw new HttpsError('failed-precondition', 'La aseguradora tiene pólizas vinculadas y no puede eliminarse físicamente.');
        }
        tx.delete(ref);
        continue;
      }
      const row = Object.assign({}, mutation.action === 'update' ? before || {} : {}, mutation.payload, {
        id: mutation.id,
        tenantId,
        updatedAt: now(),
        updatedByUid: actor.uid
      });
      if (!before) {
        row.createdAt = row.createdAt || now();
        row.createdByUid = row.createdByUid || actor.uid;
      }
      tx.set(ref, row, { merge: mutation.action === 'update' });
      if (mutation.collection === 'asesores') {
        const authUid = text(row.authUid || row.uid || row.userId, 180);
        if (authUid) {
          const mref = memberRef(tenantId, authUid);
          const msnap = await tx.get(mref);
          if (msnap.exists && text(msnap.data().advisorId, 180) && text(msnap.data().advisorId, 180) !== mutation.id) {
            throw new HttpsError('failed-precondition', 'La identidad está vinculada a otro usuario del equipo.');
          }
          tx.set(mref, membershipPatchFromAdvisor(row, msnap.exists ? msnap.data() : {}), { merge: true });
        }
      }
    }

    const result = { ok: true, requestId, eventId, mutationCount: mutations.length, collections: unique(mutations.map(m => m.collection)), writePath: 'tenants/{tenant}/data/{collection}/items', serverOwned: true };
    tx.set(eventRef(tenantId, eventId), {
      schemaVersion: VERSION,
      tenantId,
      eventId,
      requestId,
      actorUid: actor.uid,
      activeRole: actor.activeRole,
      payloadDigest,
      mutationCount: mutations.length,
      collections: result.collections,
      createdAt: now(),
      containsSecrets: false
    });
    tx.set(reqRef, { status: 'committed', payloadDigest, result, committedAt: now() }, { merge: true });
    return result;
  });
}

exports.orbit360ProductOperationalCommand = onCall({ region: REGION, cors: true, timeoutSeconds: 60, memory: '256MiB' }, execute);
exports.__productOperationalDomain = Object.freeze({ VERSION, COLLECTION_MODULE, INSERT_ONLY, REMOVABLE });
