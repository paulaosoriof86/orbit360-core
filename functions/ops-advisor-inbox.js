'use strict';

const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'orbit360-ops-advisor-inbox-v1';
const app = getApps()[0] || initializeApp();
const db = getFirestore(app);

const text = (value, max = 300) => String(value == null ? '' : value).trim().slice(0, max);
const norm = value => text(value, 100).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const cleanId = (value, label) => {
  const id = text(value, 180);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(id)) throw new HttpsError('invalid-argument', `${label || 'ID'} inválido.`);
  return id;
};
const unique = values => Array.from(new Set([].concat(values || []).map(v => text(v, 180)).filter(Boolean)));

function membershipRef(tenantId, uid) {
  return db.collection('tenants').doc(tenantId).collection('members').doc(uid);
}
function configRef(tenantId) {
  return db.collection('tenants').doc(tenantId).collection('config').doc('workflow');
}
function legacyCollection(tenantId, collection) {
  return db.collection('tenantId').doc(tenantId).collection(collection);
}
function canonicalCollection(tenantId, collection) {
  return db.collection('tenants').doc(tenantId).collection('workflow').doc(collection).collection('items');
}
function activeMember(member) {
  const status = norm(member && (member.status || member.estado));
  return !!member && member.active !== false && member.activo !== false && !['inactive', 'inactivo', 'blocked', 'bloqueado', 'suspended', 'suspendido'].includes(status);
}
function rolesOf(member) {
  return unique([...(member.roles || []), member.activeRole, member.rolActivo, member.defaultRole, member.rol]).map(norm);
}
function advisorIdOf(member) {
  return text(member && (member.advisorId || member.asesorId), 180);
}
function scopeOf(member) {
  const scopes = member && member.dataScopes || {};
  const value = norm(scopes.ops || scopes.workflow || scopes.default || member.scopeDatos || member.dataScope);
  if (['ninguno', 'none'].includes(value)) return 'none';
  if (['equipo', 'team'].includes(value)) return 'team';
  if (['todos', 'all'].includes(value)) return 'all';
  return rolesOf(member).some(role => /asesor|comercial|asistente/.test(role)) ? 'own' : 'all';
}
function teamAdvisorIds(member) {
  const own = advisorIdOf(member);
  return unique([own, ...(member.teamAdvisorIds || []), ...(member.asesoresEquipo || [])]);
}
async function authorize(request) {
  if (!request.auth || !request.auth.uid) throw new HttpsError('unauthenticated', 'Se requiere sesión activa.');
  const tenantId = cleanId(request.data && request.data.tenantId, 'tenantId');
  const snap = await membershipRef(tenantId, request.auth.uid).get();
  const member = snap.exists ? snap.data() : null;
  if (!activeMember(member)) throw new HttpsError('permission-denied', 'La membresía no está activa.');
  const advisorId = advisorIdOf(member);
  const scope = scopeOf(member);
  if (scope === 'none') throw new HttpsError('permission-denied', 'El alcance de Ops está deshabilitado.');
  if (scope === 'own' && !advisorId) throw new HttpsError('failed-precondition', 'La membresía no está vinculada a un asesor.');
  return { tenantId, member, advisorId, scope };
}
async function storageMode(tenantId) {
  const snap = await configRef(tenantId).get();
  return snap.exists && snap.data().storageMode === 'canonicalV2' ? 'canonicalV2' : 'legacyCompatible';
}
function refFor(mode, tenantId, collection) {
  return mode === 'canonicalV2' ? canonicalCollection(tenantId, collection) : legacyCollection(tenantId, collection);
}
function allowedAdvisorIds(authz) {
  if (authz.scope === 'own') return [authz.advisorId];
  if (authz.scope === 'team') return teamAdvisorIds(authz.member);
  return [];
}
function visible(record, authz) {
  if (!record || record.archivado === true) return false;
  if (authz.scope === 'all') return true;
  return allowedAdvisorIds(authz).includes(text(record.asesorId || record.advisorId, 180));
}
function project(record, type) {
  return {
    id: text(record.id, 180),
    type,
    title: text(record.titulo || record.nombre || record.tipo, 240),
    clientId: text(record.clienteId, 180),
    policyId: text(record.polizaId, 180),
    businessId: text(record.negocioId, 180),
    advisorId: text(record.asesorId, 180),
    insurerId: text(record.aseguradoraId, 180),
    stage: text(record.etapa || record.emissionStage, 100),
    status: text(record.estado, 100),
    priority: text(record.prioridad, 60),
    nextAction: text(record.proximaAccion, 500),
    note: text(record.resultado || record.nota || record.notas, 1200),
    origin: text(record.origen, 120),
    dueDate: text(record.vence, 40),
    updatedAt: record.updatedAt || record.actualizado || record.resolvedAt || null
  };
}
async function getCollectionRows(ref, limit) {
  const snap = await ref.limit(limit).get();
  return snap.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));
}
async function inbox(request) {
  const authz = await authorize(request);
  const mode = await storageMode(authz.tenantId);
  const limit = Math.min(500, Math.max(20, Number(request.data && request.data.limit) || 250));
  const [managementRows, businessRows, noticesSnap] = await Promise.all([
    getCollectionRows(refFor(mode, authz.tenantId, 'gestiones'), limit),
    getCollectionRows(refFor(mode, authz.tenantId, 'negocios'), limit),
    db.collection('tenants').doc(authz.tenantId).collection('notificationOutbox').orderBy('createdAt', 'desc').limit(limit).get()
  ]);
  const managements = managementRows.filter(row => visible(row, authz)).map(row => project(row, 'management'));
  const businesses = businessRows.filter(row => visible(row, authz)).map(row => project(row, 'business'));
  const allowed = new Set(allowedAdvisorIds(authz));
  const notices = noticesSnap.docs.map(doc => Object.assign({ id: doc.id }, doc.data())).filter(row => {
    if (authz.scope === 'all') return true;
    return [].concat(row.targets || []).some(target => target && target.type === 'advisor' && allowed.has(text(target.id, 180)));
  }).map(row => ({
    id: text(row.id, 180),
    entityType: text(row.entityType, 100),
    entityId: text(row.entityId, 180),
    operation: text(row.operation, 100),
    status: text(row.status, 80),
    title: text(row.payload && row.payload.title, 240),
    message: text(row.payload && row.payload.message, 1200),
    createdAt: row.createdAt || null
  }));
  return {
    ok: true,
    version: VERSION,
    tenantId: authz.tenantId,
    scope: authz.scope,
    advisorId: authz.advisorId,
    storageMode: mode,
    managements,
    businesses,
    notices,
    counts: { managements: managements.length, businesses: businesses.length, notices: notices.length }
  };
}

exports.orbit360GetAdvisorOpsInbox = onCall({ region: REGION, cors: true }, inbox);
exports.orbit360GetAdvisorOpsInboxLabV20260804 = onCall({ region: REGION, cors: true }, inbox);
exports.__opsAdvisorInbox = Object.freeze({ VERSION });
