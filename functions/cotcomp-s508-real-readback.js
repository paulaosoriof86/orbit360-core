'use strict';

const crypto=require('node:crypto');
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');

const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const TOKEN_SHA256='029f9455791f5e860d6c90be87b5d221faa3ca9e04503f674cfb2fb6f0689cc7';
const STATE_PATH='tenants/alianzas-soluciones/cotcomp/pilotIntake/items/s508';

const clean=(v,m=200)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,160).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sha=v=>crypto.createHash('sha256').update(String(v==null?'':v),'utf8').digest('hex');

function ids(){
  const x=sha('s508|'+TOKEN_SHA256).slice(0,20);
  const requestId='s508_req_'+x;
  return {
    businessId:'s508_neg_'+x,
    requestId,
    eventId:'evt_'+sha(TENANT_ID+'|'+requestId).slice(0,28)
  };
}
function active(row){
  const status=norm(row&&(row.status||row.estado));
  return !!row&&row.active!==false&&row.activo!==false&&!['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(status);
}
function advisorRole(row){
  return [].concat(row&&row.roles||[],row&&row.activeRole||[],row&&row.rolActivo||[],row&&row.role||[],row&&row.rol||[]).map(norm).some(r=>['asesor','asesora','comercial'].includes(r)||r.startsWith('asesor_')||r.startsWith('asesora_'));
}
function paulaName(row){
  const p=norm(row&&(row.nombre||row.name)).split('_').filter(Boolean);
  return p.includes('paula')&&p.includes('osorio');
}
async function storageMode(db){
  const s=await db.collection('tenants').doc(TENANT_ID).collection('config').doc('workflow').get();
  return s.exists&&s.data().storageMode==='canonicalV2'?'canonicalV2':'legacyCompatible';
}
function businessRef(db,mode,id){
  return mode==='canonicalV2'
    ? db.collection('tenants').doc(TENANT_ID).collection('workflow').doc('negocios').collection('items').doc(id)
    : db.collection('tenantId').doc(TENANT_ID).collection('negocios').doc(id);
}
function receiptId(uid,eventId){return 'att_'+sha(uid+'|'+eventId).slice(0,40);}

async function main(){
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'';
  if(project!==PROJECT_ID)throw new Error('WRONG_PROJECT');
  const app=getApps()[0]||initializeApp({projectId:PROJECT_ID});
  const db=getFirestore(app);
  const x=ids();
  const mode=await storageMode(db);

  const advisors=await db.collection('tenantId').doc(TENANT_ID).collection('asesores').get();
  const paulas=advisors.docs.map(d=>({id:d.id,...(d.data()||{})})).filter(r=>paulaName(r)&&active(r)&&advisorRole(r));
  if(paulas.length!==1)throw new Error('PAULA_NOT_UNIQUE');
  const advisorId=paulas[0].id;

  const stateRef=db.doc(STATE_PATH);
  const bRef=businessRef(db,mode,x.businessId);
  const qRef=db.collection('tenants').doc(TENANT_ID).collection('workflowRequests').doc(x.requestId);
  const eRef=db.collection('tenants').doc(TENANT_ID).collection('workflowEvents').doc(x.eventId);
  const oRef=db.collection('tenants').doc(TENANT_ID).collection('notificationOutbox').doc(x.eventId);
  const serviceRef=db.collection('tenants').doc(TENANT_ID).collection('members').doc('s508_public_ingress_service');

  const [stateSnap,bSnap,qSnap,eSnap,oSnap,serviceSnap]=await Promise.all([
    stateRef.get(),bRef.get(),qRef.get(),eRef.get(),oRef.get(),serviceRef.get()
  ]);

  const state=stateSnap.exists?stateSnap.data()||{}:{};
  const business=bSnap.exists?bSnap.data()||{}:{};
  const outbox=oSnap.exists?oSnap.data()||{}:{};

  const members=await db.collection('tenants').doc(TENANT_ID).collection('members').get();
  const advisorMembers=members.docs.map(d=>({uid:d.id,...(d.data()||{})}))
    .filter(r=>active(r)&&clean(r.advisorId||r.asesorId,180)===advisorId);
  const receipts=await Promise.all(advisorMembers.map(m=>
    db.collection('tenants').doc(TENANT_ID).collection('advisorLeadAttentionReceipts').doc(receiptId(m.uid,x.eventId)).get()
  ));
  const seenReceipts=receipts.filter(s=>s.exists).length;

  const result={
    schemaVersion:'ays-cotcomp-s508-real-readback-v1',
    projectId:PROJECT_ID,
    tenantId:TENANT_ID,
    containsParticipantPii:false,
    stateExists:stateSnap.exists,
    stateUsed:state.used===true,
    stateAttempts:Number(state.attempts||0),
    stateProcessing:state.processing===true,
    businessExists:bSnap.exists,
    requestExists:qSnap.exists,
    eventExists:eSnap.exists,
    outboxExists:oSnap.exists,
    businessAssignedToPaula:clean(business.asesorId,180)===advisorId,
    leadsVisible:business.etapa==='nuevo'&&!business.archivado,
    stage:clean(business.etapa,80),
    origin:clean(business.origen,100),
    requestManagementConsent:business.requestManagementConsent===true,
    consentVersionMatches:business.requestManagementConsentVersion==='GT_REAL_CUSTOMER_LAB_PILOT_REQUEST_MANAGEMENT_v1',
    privacyNoticeVersionMatches:business.privacyNoticeVersion==='GT_REAL_CUSTOMER_LAB_PILOT_PRIVACY_v1',
    marketingConsentFalse:business.marketingConsent===false,
    adultConfirmed:business.adultConfirmed===true,
    retentionB1:business.retentionDisposition==='RETAIN_IF_VALID_BUSINESS_RECORD',
    contactChannelPresent:!!clean(business.telefono||business.email,220),
    vehicleContextPresent:/veh/i.test(clean(business.descripcion,3000)),
    advisorTargetedOutbox:[].concat(outbox.targets||[]).some(t=>t&&t.type==='advisor'&&clean(t.id,180)===advisorId),
    productionTouched:state.productionTouched===true,
    providerRaterUsed:state.providerRaterUsed===true,
    issued:state.issued===true,
    bound:state.bound===true,
    paid:state.paid===true,
    temporaryServiceActorAbsent:!serviceSnap.exists,
    activeMembershipsForPaula:advisorMembers.length,
    leadAttentionReceiptCount:seenReceipts,
    leadAttentionCurrentlyUnseen:advisorMembers.length>0&&seenReceipts===0,
    businessCommitment:sha(x.businessId),
    advisorCommitment:sha(advisorId),
    requestCommitment:sha(x.requestId),
    eventCommitment:sha(x.eventId)
  };

  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}

main().catch(e=>{
  console.error(JSON.stringify({schemaVersion:'ays-cotcomp-s508-real-readback-v1',containsParticipantPii:false,ok:false,error:clean(e&&e.message||e,160)}));
  process.exit(1);
});
