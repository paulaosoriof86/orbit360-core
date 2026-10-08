'use strict';

const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

const REGION = process.env.ORBIT360_FUNCTIONS_REGION || 'us-central1';
const VERSION = 'orbit360-ops-advisor-inbox-v7-shared-task-state';
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
function inboxStateCollection(tenantId,uid,preview){
  return membershipRef(tenantId,uid).collection(preview?'previewInboxState':'inboxState');
}
function inboxTaskCollection(tenantId,preview){
  return db.collection('tenants').doc(tenantId).collection(preview?'previewInboxTasks':'inboxTasks');
}
function memberName(member){
  return text(member&&(member.displayName||member.nombre||member.name||member.email),220)||'Usuario autenticado';
}
function semanticKey(row){
  return [row.entityType,row.entityId,row.operation,row.direction,row.targetType,row.targetId,norm(row.title),norm(row.message)].map(v=>text(v,500)).join('|');
}
function opsRole(activeRole){return /operativo|admin|direccion|superadmin|super admin/.test(norm(activeRole));}
function advisorRole(activeRole){return /asesor|comercial|asistente/.test(norm(activeRole));}
function timestampMs(value){
  if(!value)return 0;
  if(typeof value.toMillis==='function')return value.toMillis();
  if(typeof value.toDate==='function')return value.toDate().getTime();
  if(typeof value._seconds==='number')return value._seconds*1000+Number(value._nanoseconds||0)/1e6;
  if(typeof value.seconds==='number')return value.seconds*1000+Number(value.nanoseconds||0)/1e6;
  const n=Date.parse(String(value));return Number.isFinite(n)?n:0;
}
function recipientMatch(target,authz,actorUid){
  if(actorUid&&text(actorUid,180)===text(authz.uid,180))return false;
  const type=norm(target&&target.type),targetId=text(target&&target.id,180);
  if(type==='advisor')return advisorRole(authz.activeRole)&&!!authz.advisorId&&targetId===authz.advisorId;
  if(type==='role'&&norm(targetId)==='operations')return authz.opsScope!=='none'&&opsRole(authz.activeRole);
  return false;
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
  const roles=rolesOf(member),requestedRole=norm(request.data&&request.data.activeRole),activeRole=requestedRole||norm(member.activeRole||member.rolActivo||member.defaultRole||member.rol)||roles[0]||'';
  if(requestedRole&&!roles.includes(requestedRole))throw new HttpsError('permission-denied','El rol activo no está asignado.');
  const advisorId=advisorIdOf(member),opsScope=scopeOf(member,'ops'),leadsScope=scopeOf(member,'leads');
  if (opsScope==='none'&&leadsScope==='none') throw new HttpsError('permission-denied','Los alcances de Ops y Leads están deshabilitados.');
  if ((opsScope==='own'||leadsScope==='own')&&!advisorId) throw new HttpsError('failed-precondition','La membresía no está vinculada a un asesor.');
  return { tenantId, member, advisorId, opsScope, leadsScope, roles, activeRole, uid:request.auth.uid };
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
  const [productManagementRows, productBusinessRows, compatibilityManagementRows, compatibilityBusinessRows, noticesSnap, internalSnap, stateSnap, taskSnap] = await Promise.all([
    getCollectionRows(productCanonicalCollection(authz.tenantId, 'gestiones'), limit),
    getCollectionRows(productCanonicalCollection(authz.tenantId, 'negocios'), limit),
    getCollectionRows(refFor(mode, authz.tenantId, 'gestiones'), limit),
    getCollectionRows(refFor(mode, authz.tenantId, 'negocios'), limit),
    db.collection('tenants').doc(authz.tenantId).collection(preview?'previewNotificationOutbox':'notificationOutbox').orderBy('createdAt','desc').limit(limit).get(),
    db.collection('tenants').doc(authz.tenantId).collection(preview?'previewInternalNotifs':'internalNotifs').orderBy('createdAt','desc').limit(limit).get(),
    inboxStateCollection(authz.tenantId,authz.uid,preview).limit(Math.min(500,limit*3)).get(),
    inboxTaskCollection(authz.tenantId,preview).limit(Math.min(500,limit*3)).get()
  ]);
  const managementRows = mergeRows(productManagementRows, compatibilityManagementRows);
  const businessRows = mergeRows(productBusinessRows, compatibilityBusinessRows);
  const managements=managementRows.filter(row=>visible(row,authz,'ops')).map(row=>project(row,'management'));
  const businesses=businessRows.filter(row=>visible(row,authz,'leads')).map(row=>project(row,'business'));
  const stateByEvent=new Map(stateSnap.docs.map(doc=>{const row=doc.data()||{};return[text(row.noticeId||doc.id,180),row];}));
  const taskByEvent=new Map(taskSnap.docs.map(doc=>{const row=doc.data()||{};return[text(row.noticeId||doc.id,180),row];}));
  const outboxNotices = noticesSnap.docs.map(doc => Object.assign({ id: doc.id }, doc.data())).filter(row =>
    [].concat(row.targets||[]).some(target=>recipientMatch(target,authz,row.actorUid))
  ).map(row => {
    const allTargets=[].concat(row.targets||[]).filter(Boolean),targets=allTargets.filter(t=>recipientMatch(t,authz,row.actorUid)),target=targets[0]||{},eventId=text(row.eventId||row.id,180);
    const recipientList=allTargets.map(t=>norm(t&&t.type)+':'+text(t&&t.id,180)).filter(v=>!/:$/.test(v));
    return {
      id:eventId,eventId,entityType:text(row.entityType,100),entityId:text(row.entityId,180),operation:text(row.operation,100),
      status:text(row.status,80),title:text(row.payload&&row.payload.title,240),message:text(row.payload&&row.payload.message,1200),
      attemptCount:Math.max(0,Number(row.attemptCount)||0),retryEligible:row.retryEligible===true,lastError:text(row.lastError,800),
      nextAttemptAt:row.nextAttemptAt||null,processedAt:row.processedAt||null,channelStates:row.channelStates&&typeof row.channelStates==='object'?row.channelStates:{},
      externalChannelsPendingConnection:unique(row.externalChannelsPendingConnection||[]),createdAt:row.createdAt||null,direction:text(row.direction,40),
      targetType:norm(target.type),targetId:text(target.id,180),targetSurface:norm(target.type)==='advisor'?'leads':'ops',
      ownerType:norm(row.ownerType||target.type),ownerId:text(row.ownerId||target.id,180),assigneeType:norm(target.type),assigneeId:text(target.id,180),
      recipientList,observerIds:unique(row.observerIds||[]),actorUid:text(row.actorUid,180),actorName:text(row.actorName,220),sourceRank:2
    };
  });
  const collaborationNotices=[];
  businessRows.forEach(row=>{
    [].concat(row&&row.comentarios||[]).forEach((comment,index)=>{
      const direction=text(comment&&comment.direction,40);if(!['advisor','operations'].includes(direction))return;
      const target=direction==='advisor'?{type:'advisor',id:text(row.asesorId,180)}:{type:'role',id:'operations'};
      const actorUid=text(comment&&comment.actorUid,180);
      if(!recipientMatch(target,authz,actorUid))return;
      const eventId=text(comment.eventId||('collab_'+row.id+'_'+index),180);
      collaborationNotices.push({id:eventId,eventId,entityType:'negocios',entityId:text(row.id,180),operation:'typed_collaboration',status:'internal_committed',
        title:text(comment.tipo||'Colaboración comercial-operativa',240),message:text(comment.texto||comment.txt,1200),attemptCount:0,retryEligible:false,lastError:'',
        nextAttemptAt:null,processedAt:null,channelStates:{internal:'committed'},externalChannelsPendingConnection:[],createdAt:comment.ts||row.updatedAt||row.actualizado||null,
        direction,targetType:norm(target.type),targetId:text(target.id,180),targetSurface:direction==='advisor'?'leads':'ops',
        ownerType:norm(target.type),ownerId:text(target.id,180),assigneeType:norm(target.type),assigneeId:text(target.id,180),
        recipientList:[norm(target.type)+':'+text(target.id,180)],observerIds:[],actorUid,actorName:text(comment.actorName||comment.user,220),sourceRank:1});
    });
  });
  const internalNotices=internalSnap.docs.map(doc=>Object.assign({id:doc.id},doc.data())).filter(row=>{
    const target={type:row.targetType,id:row.targetId};return recipientMatch(target,authz,row.actorUid);
  }).map(row=>{const eventId=text(row.eventId||row.id,180),type=norm(row.targetType),targetId=text(row.targetId,180);return{id:eventId,eventId,entityType:text(row.entityType,100),entityId:text(row.entityId,180),
    operation:text(row.operation,100),status:'internal_delivered',title:text(row.titulo,240),message:text(row.cuerpo,1200),attemptCount:1,retryEligible:false,lastError:'',
    nextAttemptAt:null,processedAt:row.updatedAt||null,channelStates:{internal:'delivered'},externalChannelsPendingConnection:[],createdAt:row.createdAt||null,
    direction:text(row.direction,40),targetType:type,targetId,targetSurface:type==='advisor'?'leads':'ops',
    ownerType:norm(row.ownerType||type),ownerId:text(row.ownerId||targetId,180),assigneeType:type,assigneeId:targetId,
    recipientList:[type+':'+targetId],observerIds:unique(row.observerIds||[]),actorUid:text(row.actorUid,180),actorName:text(row.actorName,220),sourceRank:3};});
  const deduped=new Map();
  internalNotices.concat(outboxNotices,collaborationNotices).forEach(row=>{const key=text(row.eventId||row.id,180);const prior=deduped.get(key);if(!prior||Number(row.sourceRank||0)>Number(prior.sourceRank||0))deduped.set(key,row);});
  const exactRows=Array.from(deduped.values());
  const semanticGroups=new Map();
  exactRows.forEach(row=>{const key=semanticKey(row),ids=semanticGroups.get(key)||[];ids.push(text(row.eventId||row.id,180));semanticGroups.set(key,ids);});
  const includeArchived=request.data&&request.data.includeArchived===true;
  const notices=exactRows.map(row=>{
    const eventId=text(row.eventId||row.id,180),state=stateByEvent.get(eventId)||{},task=taskByEvent.get(eventId)||{};
    const readAt=state.readAt||null,acknowledgedAt=state.acknowledgedAt||state.attendedAt||null,archivedAt=state.archivedAt||null,resolvedAt=task.resolvedAt||null;
    const groupEventIds=semanticGroups.get(semanticKey(row))||[eventId];
    return Object.assign({},row,{
      readAt,acknowledgedAt,archivedAt,read:!!readAt,acknowledged:!!acknowledgedAt,archived:!!archivedAt,
      globalResolved:!!resolvedAt,resolvedAt,resolvedByUid:text(task.resolvedByUid,180),resolvedByName:text(task.resolvedByName,220),
      attended:!!resolvedAt,attendedAt:resolvedAt,
      semanticDuplicateCandidate:groupEventIds.length>1,semanticDuplicateCount:groupEventIds.length,semanticGroupEventIds:groupEventIds,
      statusLabel:resolvedAt?'Resuelta para todos':acknowledgedAt?'Reconocida por ti':readAt?'Vista por ti':'Nueva'
    });
  }).filter(row=>includeArchived||!row.archived).sort((a,b)=>timestampMs(b.createdAt)-timestampMs(a.createdAt)).slice(0,limit);
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
    activeRole: authz.activeRole,
    preview: preview===true,
    storageMode: mode,
    productCanonicalDataOwner: true,
    compatibilityOwnerMerged: true,
    sharedResolutionOwner: true,
    semanticCandidatesOnly: true,
    managements,
    businesses,
    notices,
    noticeStatusCounts,
    counts: {
      managements:managements.length,businesses:businesses.length,notices:notices.length,
      unread:notices.filter(row=>!row.read).length,
      acknowledged:notices.filter(row=>row.acknowledged).length,
      resolved:notices.filter(row=>row.globalResolved).length,
      attended:notices.filter(row=>row.globalResolved).length
    }
  };
}

async function updateInboxState(request,preview){
  const authz=await authorize(request),noticeId=cleanId(request.data&&request.data.noticeId,'noticeId'),requestedAction=norm(request.data&&request.data.action);
  if(!['read','acknowledge','resolve','attended','archive','restore'].includes(requestedAction))throw new HttpsError('invalid-argument','Acción de bandeja no soportada.');
  const action=requestedAction==='attended'?'resolve':requestedAction;
  const personalDoc=inboxStateCollection(authz.tenantId,authz.uid,preview).doc(noticeId);
  const taskDoc=inboxTaskCollection(authz.tenantId,preview).doc(noticeId);
  const personalPatch={noticeId,updatedAt:FieldValue.serverTimestamp()};
  if(action==='read')personalPatch.readAt=FieldValue.serverTimestamp();
  if(action==='acknowledge'){personalPatch.readAt=FieldValue.serverTimestamp();personalPatch.acknowledgedAt=FieldValue.serverTimestamp();}
  if(action==='resolve')personalPatch.readAt=FieldValue.serverTimestamp();
  if(action==='archive'){personalPatch.readAt=FieldValue.serverTimestamp();personalPatch.archivedAt=FieldValue.serverTimestamp();}
  if(action==='restore')personalPatch.archivedAt=FieldValue.delete();
  await db.runTransaction(async tx=>{
    const taskBefore=action==='resolve'?await tx.get(taskDoc):null;
    tx.set(personalDoc,personalPatch,{merge:true});
    if(action==='resolve'&&(!taskBefore.exists||!taskBefore.data().resolvedAt)){
      tx.set(taskDoc,{
        noticeId,resolutionScope:'shared_event',resolvedAt:FieldValue.serverTimestamp(),
        resolvedByUid:authz.uid,resolvedByName:memberName(authz.member),updatedAt:FieldValue.serverTimestamp()
      },{merge:true});
    }
  });
  const [personalAfter,taskAfter]=await Promise.all([personalDoc.get(),taskDoc.get()]);
  const personal=personalAfter.data()||{},task=taskAfter.exists?taskAfter.data()||{}:{};
  return{
    ok:true,version:VERSION,noticeId,action,requestedAction,
    read:!!personal.readAt,acknowledged:!!(personal.acknowledgedAt||personal.attendedAt),archived:!!personal.archivedAt,
    globalResolved:!!task.resolvedAt,resolvedByUid:text(task.resolvedByUid,180),resolvedByName:text(task.resolvedByName,220),
    attended:!!task.resolvedAt,preview:preview===true
  };
}

exports.orbit360GetAdvisorOpsInbox = onCall({ region: REGION, cors: true }, request=>inbox(request,false));
exports.orbit360GetAdvisorOpsInboxLabV20260804 = onCall({ region: REGION, cors: true }, request=>inbox(request,false));
exports.orbit360GetAdvisorOpsInboxPreview = onCall({ region: 'us-east1', cors: true }, request=>inbox(request,true));
exports.orbit360UpdateAdvisorOpsInboxState = onCall({region:REGION,cors:true},request=>updateInboxState(request,false));
exports.orbit360UpdateAdvisorOpsInboxStatePreview = onCall({region:'us-east1',cors:true},request=>updateInboxState(request,true));
exports.__opsAdvisorInbox = Object.freeze({ VERSION });
