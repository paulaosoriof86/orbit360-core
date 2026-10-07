'use strict';

const crypto=require('node:crypto');
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {HttpsError,onCall}=require('firebase-functions/v2/https');

const REGION=process.env.ORBIT360_FUNCTIONS_REGION||'us-central1';
const VERSION='orbit360-advisor-lead-attention-s509-v1';
const app=getApps()[0]||initializeApp();
const db=getFirestore(app);

const text=(v,m=300)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>text(v,120).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const unique=xs=>Array.from(new Set([].concat(xs||[]).map(v=>text(v,180)).filter(Boolean)));
const receiptId=(uid,eventId)=>'att_'+crypto.createHash('sha256').update(uid+'|'+eventId,'utf8').digest('hex').slice(0,40);

function membershipRef(tenantId,uid){return db.collection('tenants').doc(tenantId).collection('members').doc(uid);}
function outboxCollection(tenantId){return db.collection('tenants').doc(tenantId).collection('notificationOutbox');}
function receiptCollection(tenantId){return db.collection('tenants').doc(tenantId).collection('advisorLeadAttentionReceipts');}
function activeMember(member){
  const status=norm(member&&(member.status||member.estado));
  return !!member&&member.active!==false&&member.activo!==false&&!['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(status);
}
function advisorIdOf(member){return text(member&&(member.advisorId||member.asesorId),180);}
function targetsAdvisor(row,advisorId){
  return [].concat(row&&row.targets||[]).some(t=>t&&t.type==='advisor'&&text(t.id,180)===advisorId);
}
function isLeadCreate(row){
  return !!row&&norm(row.operation)==='create_business'&&norm(row.entityType)==='negocios';
}
async function authorize(request){
  if(!request.auth||!request.auth.uid)throw new HttpsError('unauthenticated','Se requiere sesión activa.');
  const tenantId=text(request.data&&request.data.tenantId,180);
  if(!tenantId)throw new HttpsError('invalid-argument','tenantId requerido.');
  const snap=await membershipRef(tenantId,request.auth.uid).get();
  const member=snap.exists?snap.data():null;
  if(!activeMember(member))throw new HttpsError('permission-denied','La membresía no está activa.');
  const advisorId=advisorIdOf(member);
  if(!advisorId)throw new HttpsError('failed-precondition','La membresía no está vinculada a un asesor.');
  return {tenantId,uid:request.auth.uid,advisorId};
}
async function pollCore(authz,limit=50){
  const snap=await outboxCollection(authz.tenantId).orderBy('createdAt','desc').limit(Math.min(100,Math.max(10,Number(limit)||50))).get();
  const candidates=snap.docs.map(d=>({id:d.id,...(d.data()||{})})).filter(row=>isLeadCreate(row)&&targetsAdvisor(row,authz.advisorId));
  const receipts=await Promise.all(candidates.map(row=>receiptCollection(authz.tenantId).doc(receiptId(authz.uid,row.id)).get()));
  const unseen=[];
  candidates.forEach((row,i)=>{
    if(receipts[i]&&receipts[i].exists)return;
    unseen.push({
      eventId:text(row.id,180),
      businessId:text(row.entityId,180),
      title:'Nuevo lead asignado',
      message:'Tienes un nuevo lead asignado en Leads.',
      createdAt:row.createdAt||null
    });
  });
  return {ok:true,version:VERSION,newLeadCount:unseen.length,unseen};
}
async function ackCore(authz,eventIds){
  const ids=unique(eventIds).slice(0,20);
  if(!ids.length)return {ok:true,acked:0};
  let acked=0;
  for(const eventId of ids){
    const out=await outboxCollection(authz.tenantId).doc(eventId).get();
    if(!out.exists)continue;
    const row=out.data()||{};
    if(!isLeadCreate(row)||!targetsAdvisor(row,authz.advisorId))continue;
    await receiptCollection(authz.tenantId).doc(receiptId(authz.uid,eventId)).set({
      schemaVersion:VERSION,
      tenantId:authz.tenantId,
      uid:authz.uid,
      advisorId:authz.advisorId,
      eventId,
      entityId:text(row.entityId,180),
      seenAt:FieldValue.serverTimestamp(),
      openedRoute:'leads'
    },{merge:true});
    acked++;
  }
  return {ok:true,acked};
}
async function handler(request){
  const authz=await authorize(request);
  const action=norm(request.data&&request.data.action||'poll');
  if(action==='poll')return pollCore(authz,request.data&&request.data.limit);
  if(action==='ack')return ackCore(authz,request.data&&request.data.eventIds);
  throw new HttpsError('invalid-argument','Acción no soportada.');
}

exports.orbit360AdvisorLeadAttentionS509=onCall({region:REGION,cors:true},handler);
exports.__advisorLeadAttentionS509=Object.freeze({VERSION,activeMember,advisorIdOf,targetsAdvisor,isLeadCreate,receiptId,pollCore,ackCore});
