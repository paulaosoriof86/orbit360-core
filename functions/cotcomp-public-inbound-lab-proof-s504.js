'use strict';

const {getApps,initializeApp,applicationDefault}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const ops=require('./ops-leads-domain').__opsLeadsDomain;
const inboxApi=require('./ops-advisor-inbox').__opsAdvisorInbox;

const VERSION='ays-cotcomp-s504-public-inbound-lab-synthetic-proof-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';

function clean(v,max=220){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function runId(v){
  const out=clean(v,100).replace(/[^A-Za-z0-9._:-]/g,'_');
  if(!/^s504-[A-Za-z0-9._:-]{4,90}$/.test(out))throw new Error('S504_RUN_ID_INVALID');
  return out;
}
function refs(db,fx,storageMode,eventId){
  const business=storageMode==='canonicalV2'
    ? db.collection('tenants').doc(TENANT_ID).collection('workflow').doc('negocios').collection('items').doc(fx.businessId)
    : db.collection('tenantId').doc(TENANT_ID).collection('negocios').doc(fx.businessId);
  return {
    member:db.collection('tenants').doc(TENANT_ID).collection('members').doc(fx.uid),
    business,
    request:db.collection('tenants').doc(TENANT_ID).collection('workflowRequests').doc(fx.requestId),
    event:db.collection('tenants').doc(TENANT_ID).collection('workflowEvents').doc(eventId),
    outbox:db.collection('tenants').doc(TENANT_ID).collection('notificationOutbox').doc(eventId)
  };
}
function fixture(raw){
  const id=runId(raw);
  const suffix=id.replace(/[^A-Za-z0-9]/g,'').slice(-20);
  const uid='s504_uid_'+suffix;
  const advisorId='s504_adv_'+suffix;
  const businessId='s504_neg_'+suffix;
  const requestId='s504_req_'+suffix;
  const correlationId='s504_corr_'+suffix;
  const caseId='s504_case_'+suffix;
  const journeyId='GT_AUTO_MOTO_HYBRID';
  const request={
    auth:{uid},
    data:{
      tenantId:TENANT_ID,
      operation:'create_business',
      requestId,
      reason:'Prueba sintética controlada Web CotComp -> Gravicentra',
      payload:{
        id:businessId,
        nombre:'Synthetic QA S5.04',
        tipo:'Prospecto web sintético',
        pais:'GT',
        moneda:'GTQ',
        canal:'Web CotComp',
        producto:'Vehículo / Movilidad',
        ramo:'Automóviles',
        prioridad:'Media',
        origen:'Web CotComp',
        asesorId,
        cotcompRef:{
          role:'public_handoff',
          caseId,
          journeyId,
          correlationId,
          quoteCasePath:'synthetic-only',
          intakeStatus:'lead_recibido'
        },
        notificationTitle:'Synthetic QA · Nueva solicitud Web CotComp',
        notificationMessage:'Synthetic QA only. No customer data.'
      }
    }
  };
  const member={
    schemaVersion:VERSION,
    uid,
    tenantId:TENANT_ID,
    status:'active',
    active:true,
    roles:['SuperAdmin'],
    defaultRole:'SuperAdmin',
    activeRole:'SuperAdmin',
    advisorId,
    countries:['GT'],
    dataScopes:{workflow:'all'},
    synthetic:true,
    proofRunId:id
  };
  return {id,uid,advisorId,businessId,requestId,correlationId,caseId,journeyId,request,member};
}
async function existsMap(map){
  const out={};
  for(const [k,r] of Object.entries(map)){
    const s=await r.get();
    out[k]={exists:s.exists,data:s.exists?s.data():null};
  }
  return out;
}
function allAbsent(m){return Object.values(m).every(x=>x.exists===false);}
async function assertStartClean(db,fx){
  const memberRef=db.collection('tenants').doc(TENANT_ID).collection('members').doc(fx.uid);
  const requestRef=db.collection('tenants').doc(TENANT_ID).collection('workflowRequests').doc(fx.requestId);
  const ms=await memberRef.get(),rs=await requestRef.get();
  if(ms.exists||rs.exists)throw new Error('S504_START_NOT_CLEAN');
}
async function createSyntheticMember(db,fx){
  const ref=db.collection('tenants').doc(TENANT_ID).collection('members').doc(fx.uid);
  await ref.create(fx.member);
  const s=await ref.get();
  if(!s.exists||s.data().proofRunId!==fx.id)throw new Error('S504_MEMBER_READBACK_FAILED');
  return ref;
}
async function cleanup(db,fx,result){
  if(!result||!result.storageMode||!result.eventId)throw new Error('S504_CLEANUP_RESULT_REQUIRED');
  const r=refs(db,fx,result.storageMode,result.eventId);
  const before=await existsMap(r);
  if(before.member.exists && before.member.data.proofRunId!==fx.id)throw new Error('S504_MEMBER_OWNERSHIP_MISMATCH');
  if(before.business.exists && before.business.data.id!==fx.businessId)throw new Error('S504_BUSINESS_ID_MISMATCH');
  if(before.request.exists && before.request.data.entityId!==fx.businessId)throw new Error('S504_REQUEST_ENTITY_MISMATCH');
  if(before.event.exists && before.event.data.entityId!==fx.businessId)throw new Error('S504_EVENT_ENTITY_MISMATCH');
  if(before.outbox.exists && before.outbox.data.entityId!==fx.businessId)throw new Error('S504_OUTBOX_ENTITY_MISMATCH');

  const batch=db.batch();
  let deletes=0;
  for(const ref of Object.values(r)){
    const s=await ref.get();
    if(s.exists){batch.delete(ref);deletes++;}
  }
  if(deletes)await batch.commit();
  const after=await existsMap(r);
  if(!allAbsent(after))throw new Error('S504_FINAL_ABSENCE_FAILED');
  return {deletes,finalAbsence:true};
}
async function run(){
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID;
  if(project!==PROJECT_ID)throw new Error('S504_PROJECT_MISMATCH');
  const fx=fixture(process.env.S504_PROOF_RUN_ID);
  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
  const db=getFirestore(app);

  await assertStartClean(db,fx);
  let createdMember=false;
  let first=null;
  try{
    await createSyntheticMember(db,fx);createdMember=true;

    first=await ops.executeCommand(fx.request);
    if(!first||first.ok!==true||first.operation!=='create_business')throw new Error('S504_FIRST_COMMAND_FAILED');
    if(first.entityId!==fx.businessId||first.requestId!==fx.requestId)throw new Error('S504_FIRST_IDENTITY_MISMATCH');
    if(first.reused===true)throw new Error('S504_FIRST_UNEXPECTED_REUSE');

    const r=refs(db,fx,first.storageMode,first.eventId);
    const rb=await existsMap(r);
    for(const key of ['member','business','request','event','outbox'])if(!rb[key].exists)throw new Error('S504_READBACK_MISSING_'+key.toUpperCase());

    const business=rb.business.data;
    const req=rb.request.data;
    const event=rb.event.data;
    const outbox=rb.outbox.data;
    if(business.origen!=='Web CotComp'||business.canal!=='Web CotComp')throw new Error('S504_BUSINESS_SOURCE_INVALID');
    if(business.asesorId!==fx.advisorId)throw new Error('S504_ADVISOR_INVALID');
    if(!business.cotcompRef||business.cotcompRef.correlationId!==fx.correlationId)throw new Error('S504_COTCOMP_REF_INVALID');
    if(req.status!=='committed'||!req.requestDigest)throw new Error('S504_REQUEST_COMMIT_INVALID');
    if(event.entityId!==fx.businessId||event.requestId!==fx.requestId)throw new Error('S504_EVENT_INVALID');
    if(outbox.entityId!==fx.businessId||outbox.status!=='pending_provider')throw new Error('S504_OUTBOX_INVALID');
    const advisorTarget=[].concat(outbox.targets||[]).some(t=>t&&t.type==='advisor'&&t.id===fx.advisorId);
    if(!advisorTarget)throw new Error('S504_ADVISOR_TARGET_MISSING');

    const inbox=await inboxApi.inbox({auth:{uid:fx.uid},data:{tenantId:TENANT_ID,limit:100}});
    if(!inbox||inbox.ok!==true)throw new Error('S504_INBOX_FAILED');
    if(!inbox.businesses.some(x=>x.id===fx.businessId))throw new Error('S504_INBOX_BUSINESS_MISSING');
    if(!inbox.notices.some(x=>x.entityId===fx.businessId&&x.id===first.eventId))throw new Error('S504_INBOX_NOTICE_MISSING');

    const retry=await ops.executeCommand(fx.request);
    if(!retry||retry.reused!==true||retry.entityId!==fx.businessId||retry.eventId!==first.eventId)throw new Error('S504_RETRY_NOT_REUSED');

    const reqQuery=await db.collection('tenants').doc(TENANT_ID).collection('workflowRequests').where('entityId','==',fx.businessId).get();
    const eventQuery=await db.collection('tenants').doc(TENANT_ID).collection('workflowEvents').where('entityId','==',fx.businessId).get();
    const outboxQuery=await db.collection('tenants').doc(TENANT_ID).collection('notificationOutbox').where('entityId','==',fx.businessId).get();
    if(reqQuery.size!==1||eventQuery.size!==1||outboxQuery.size!==1)throw new Error('S504_DUPLICATE_ARTIFACTS_FOUND');

    let conflictDenied=false;
    const conflict=JSON.parse(JSON.stringify(fx.request));
    conflict.data.payload.nombre='Synthetic QA S5.04 CHANGED';
    try{await ops.executeCommand(conflict);}
    catch(e){conflictDenied=!!e&&e.code==='failed-precondition';}
    if(!conflictDenied)throw new Error('S504_CONFLICT_REPLAY_NOT_DENIED');

    const cleaned=await cleanup(db,fx,first);
    return {
      schemaVersion:'ays-cotcomp-s504-public-inbound-lab-proof-receipt-v1.0',
      version:VERSION,
      projectId:PROJECT_ID,
      tenantId:TENANT_ID,
      proofRunId:fx.id,
      syntheticOnly:true,
      first:{
        entityId:first.entityId,
        requestId:first.requestId,
        eventId:first.eventId,
        storageMode:first.storageMode,
        advisorVisible:first.projection&&first.projection.advisorVisible===true
      },
      readback:{
        business:true,
        requestCommitted:true,
        workflowEvent:true,
        advisorTargetedOutbox:true,
        advisorInboxBusiness:true,
        advisorInboxNotice:true
      },
      retry:{reused:true,duplicateRequests:0,duplicateEvents:0,duplicateOutbox:0},
      conflict:{sameRequestIdDifferentPayloadDenied:true},
      cleanup:cleaned,
      boundaries:{
        realCustomerDataUsed:false,
        productionTouched:false,
        providerCallsExecuted:0,
        publicEndpointDeployed:false,
        netPersistentSyntheticDocuments:0
      }
    };
  }catch(err){
    if(createdMember){
      try{
        if(first)await cleanup(db,fx,first);
        else await db.collection('tenants').doc(TENANT_ID).collection('members').doc(fx.uid).delete();
      }catch(cleanErr){
        throw new Error('S504_PROOF_AND_CLEANUP_FAILED:'+clean(err&&err.message)+':'+clean(cleanErr&&cleanErr.message));
      }
    }
    throw err;
  }
}

module.exports=Object.freeze({VERSION,PROJECT_ID,TENANT_ID,fixture,refs,run});

if(require.main===module){
  run().then(r=>process.stdout.write(JSON.stringify(r,null,2)+'\n')).catch(e=>{console.error(clean(e&&e.stack||e,1600));process.exit(1);});
}
