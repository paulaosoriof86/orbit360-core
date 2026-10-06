'use strict';

const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'orbit360-ops-advisor-inbox-v5-r20-scope-notices';
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
function productCanonicalCollection(tenantId, collection) {
  return db.collection('tenants').doc(tenantId).collection('data').doc(collection).collection('items');
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
function scopeOf(member,domain) {
  const scopes = member && member.dataScopes || {},raw=domain==='leads'?(scopes.leads||scopes.commercial||scopes.default):(scopes.ops||scopes.workflow||scopes.gestiones||scopes.default),value=norm(raw||member.scopeDatos||member.dataScope);
  if (['ninguno','none'].includes(value)) return 'none';
  if (['equipo','team'].includes(value)) return 'team';
  if (['todos','all'].includes(value)) return 'all';
  if(domain==='leads'&&advisorIdOf(member))return'own';
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
  const advisorId=advisorIdOf(member),opsScope=scopeOf(member,'ops'),leadsScope=scopeOf(member,'leads');
  if (opsScope==='none'&&leadsScope==='none') throw new HttpsError('permission-denied','Los alcances de Ops y Leads están deshabilitados.');
  if ((opsScope==='own'||leadsScope==='own')&&!advisorId) throw new HttpsError('failed-precondition','La membresía no está vinculada a un asesor.');
  return { tenantId, member, advisorId, opsScope, leadsScope, roles: rolesOf(member) };
}
async function storageMode(tenantId) {
  const snap = await configRef(tenantId).get();
  return snap.exists && snap.data().storageMode === 'canonicalV2' ? 'canonicalV2' : 'legacyCompatible';
}
function refFor(mode, tenantId, collection) {
  return mode === 'canonicalV2' ? canonicalCollection(tenantId, collection) : legacyCollection(tenantId, collection);
}
function allowedAdvisorIds(authz,domain){const scope=domain==='leads'?authz.leadsScope:authz.opsScope;if(scope==='own')return[authz.advisorId];if(scope==='team')return teamAdvisorIds(authz.member);return[];}
function visible(record,authz,domain){if(!record||record.archivado===true)return false;const scope=domain==='leads'?authz.leadsScope:authz.opsScope;if(scope==='none')return false;if(scope==='all')return true;return allowedAdvisorIds(authz,domain).includes(text(record.asesorId||record.advisorId,180));}
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
function mergeRows(productRows, compatibilityRows) {
  const byId = new Map();
  [].concat(compatibilityRows || []).forEach(row => { const id = text(row && row.id, 180); if (id) byId.set(id, row); });
  [].concat(productRows || []).forEach(row => { const id = text(row && row.id, 180); if (id) byId.set(id, row); });
  return Array.from(byId.values());
}
async function inbox(request,preview) {
  const authz = await authorize(request);
  const mode = await storageMode(authz.tenantId);
  const limit = Math.min(500, Math.max(20, Number(request.data && request.data.limit) || 250));
  const [productManagementRows, productBusinessRows, compatibilityManagementRows, compatibilityBusinessRows, noticesSnap, internalSnap] = await Promise.all([
    getCollectionRows(productCanonicalCollection(authz.tenantId, 'gestiones'), limit),
    getCollectionRows(productCanonicalCollection(authz.tenantId, 'negocios'), limit),
    getCollectionRows(refFor(mode, authz.tenantId, 'gestiones'), limit),
    getCollectionRows(refFor(mode, authz.tenantId, 'negocios'), limit),
    db.collection('tenants').doc(authz.tenantId).collection(preview?'previewNotificationOutbox':'notificationOutbox').orderBy('createdAt','desc').limit(limit).get(),
    db.collection('tenants').doc(authz.tenantId).collection(preview?'previewInternalNotifs':'internalNotifs').orderBy('createdAt','desc').limit(limit).get()
  ]);
  const managementRows = mergeRows(productManagementRows, compatibilityManagementRows);
  const businessRows = mergeRows(productBusinessRows, compatibilityBusinessRows);
  const managements=managementRows.filter(row=>visible(row,authz,'ops')).map(row=>project(row,'management'));
  const businesses=businessRows.filter(row=>visible(row,authz,'leads')).map(row=>project(row,'business'));
  const allowedLeads=new Set(allowedAdvisorIds(authz,'leads')),allowedOps=new Set(allowedAdvisorIds(authz,'ops'));
  const outboxNotices = noticesSnap.docs.map(doc => Object.assign({ id: doc.id }, doc.data())).filter(row => {
    const domain=text(row.entityType,100)==='negocios'?'leads':'ops',scope=domain==='leads'?authz.leadsScope:authz.opsScope,allowed=domain==='leads'?allowedLeads:allowedOps;
    return [].concat(row.targets||[]).some(target=>{const type=norm(target&&target.type),id=text(target&&target.id,180);if(type==='advisor')return id===authz.advisorId||scope==='all'||allowed.has(id);if(type==='role'&&norm(id)==='operations')return authz.opsScope!=='none'&&authz.roles.some(role=>/operativo|admin|direccion|superadmin|super admin/.test(role));return false;});
  }).map(row => ({
    id: text(row.id, 180),
    entityType: text(row.entityType, 100),
    entityId: text(row.entityId, 180),
    operation: text(row.operation, 100),
    status: text(row.status, 80),
    title: text(row.payload && row.payload.title, 240),
    message: text(row.payload && row.payload.message, 1200),
    attemptCount: Math.max(0, Number(row.attemptCount) || 0),
    retryEligible: row.retryEligible === true,
    lastError: text(row.lastError, 800),
    nextAttemptAt: row.nextAttemptAt || null,
    processedAt: row.processedAt || null,
    channelStates: row.channelStates && typeof row.channelStates === 'object' ? row.channelStates : {},
    externalChannelsPendingConnection: unique(row.externalChannelsPendingConnection || []),
    createdAt: row.createdAt || null
  }));
  const isOpsRole=authz.roles.some(role=>/operativo|admin|direccion|superadmin|super admin/.test(role));
  const collaborationNotices=[];
  businessRows.forEach(row=>{
    [].concat(row&&row.comentarios||[]).forEach((comment,index)=>{
      const direction=text(comment&&comment.direction,40);if(!['advisor','operations'].includes(direction))return;
      const advisorTarget=text(row.asesorId,180),visibleToRecipient=direction==='advisor'?(advisorTarget===authz.advisorId||authz.leadsScope==='all'||allowedLeads.has(advisorTarget)):(authz.opsScope!=='none'&&isOpsRole);
      if(!visibleToRecipient)return;
      collaborationNotices.push({id:text(comment.eventId||('collab_'+row.id+'_'+index),180),entityType:'negocios',entityId:text(row.id,180),operation:'typed_collaboration',status:'internal_committed',title:text(comment.tipo||'Colaboración comercial-operativa',240),message:text(comment.texto||comment.txt,1200),attemptCount:0,retryEligible:false,lastError:'',nextAttemptAt:null,processedAt:null,channelStates:{internal:'committed'},externalChannelsPendingConnection:[],createdAt:comment.ts||row.updatedAt||row.actualizado||null,direction});
    });
  });
  const internalNotices=internalSnap.docs.map(doc=>Object.assign({id:doc.id},doc.data())).filter(row=>{
    const type=norm(row.targetType),targetId=text(row.targetId,180);
    if(type==='advisor')return targetId===authz.advisorId||authz.leadsScope==='all'||allowedLeads.has(targetId);
    if(type==='role'&&norm(targetId)==='operations')return authz.opsScope!=='none'&&isOpsRole;
    return false;
  }).map(row=>({id:text(row.id,180),entityType:text(row.entityType,100),entityId:text(row.entityId,180),operation:text(row.operation,100),status:'internal_delivered',title:text(row.titulo,240),message:text(row.cuerpo,1200),attemptCount:1,retryEligible:false,lastError:'',nextAttemptAt:null,processedAt:row.updatedAt||null,channelStates:{internal:'delivered'},externalChannelsPendingConnection:[],createdAt:row.createdAt||null}));
  const notices=internalNotices.concat(outboxNotices,collaborationNotices).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,limit);
  const noticeStatusCounts = {};
  notices.forEach(row => { const key = row.status || '(blank)'; noticeStatusCounts[key] = (noticeStatusCounts[key] || 0) + 1; });
  return {
    ok: true,
    version: VERSION,
    tenantId: authz.tenantId,
    scope: authz.opsScope,
    opsScope: authz.opsScope,
    leadsScope: authz.leadsScope,
    advisorId: authz.advisorId,
    preview: preview===true,
    storageMode: mode,
    productCanonicalDataOwner: true,
    compatibilityOwnerMerged: true,
    managements,
    businesses,
    notices,
    noticeStatusCounts,
    counts: { managements: managements.length, businesses: businesses.length, notices: notices.length }
  };
}

exports.orbit360GetAdvisorOpsInbox = onCall({ region: REGION, cors: true }, request=>inbox(request,false));
exports.orbit360GetAdvisorOpsInboxLabV20260804 = onCall({ region: REGION, cors: true }, request=>inbox(request,false));
exports.orbit360GetAdvisorOpsInboxPreview = onCall({ region: 'us-east1', cors: true }, request=>inbox(request,true));
exports.__opsAdvisorInbox = Object.freeze({ VERSION });
