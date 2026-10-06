'use strict';

const crypto=require('node:crypto');
const {getApps,initializeApp,applicationDefault}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');

const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';

function clean(v,max=220){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function runId(v){
  const x=clean(v,100).replace(/[^A-Za-z0-9._:-]/g,'_');
  if(!/^s505-[A-Za-z0-9._:-]{4,90}$/.test(x))throw new Error('S505_RUN_ID_INVALID');
  return x;
}
function fixture(raw){
  const id=runId(raw);
  const suffix=id.replace(/[^A-Za-z0-9]/g,'').slice(-20);
  const uid='s505_uid_'+suffix;
  const advisorId='s505_adv_'+suffix;
  const token=clean(process.env.S505_PROOF_TOKEN,200);
  if(token.length<24)throw new Error('S505_TOKEN_MISSING');
  return {
    id,uid,advisorId,
    permit:{
      schemaVersion:'ays-cotcomp-s505-proof-permit-v1.0',
      proofRunId:id,synthetic:true,enabled:true,uid,advisorId,country:'GT',
      tokenDigest:sha(token),expiresAtEpochMs:Date.now()+15*60*1000
    },
    member:{
      schemaVersion:'ays-cotcomp-s505-synthetic-member-v1.0',
      uid,tenantId:TENANT_ID,status:'active',active:true,
      roles:['SuperAdmin'],defaultRole:'SuperAdmin',activeRole:'SuperAdmin',
      advisorId,countries:['GT'],dataScopes:{workflow:'all'},
      synthetic:true,proofRunId:id
    }
  };
}
function refs(db,fx){
  return {
    permit:db.collection('tenants').doc(TENANT_ID).collection('syntheticProofPermits').doc(fx.id),
    member:db.collection('tenants').doc(TENANT_ID).collection('members').doc(fx.uid)
  };
}
async function setup(db,fx){
  const r=refs(db,fx);
  const [p,m]=await Promise.all([r.permit.get(),r.member.get()]);
  if(p.exists||m.exists)throw new Error('S505_SETUP_NOT_CLEAN');
  await r.permit.create(fx.permit);
  await r.member.create(fx.member);
  const [pr,mr]=await Promise.all([r.permit.get(),r.member.get()]);
  if(!pr.exists||!mr.exists)throw new Error('S505_SETUP_READBACK_FAILED');
  return {permit:true,member:true};
}
async function discoverBusinessRef(db,businessId){
  const cfg=await db.collection('tenants').doc(TENANT_ID).collection('config').doc('workflow').get();
  const mode=cfg.exists&&cfg.data().storageMode==='canonicalV2'?'canonicalV2':'legacyCompatible';
  const ref=mode==='canonicalV2'
    ? db.collection('tenants').doc(TENANT_ID).collection('workflow').doc('negocios').collection('items').doc(businessId)
    : db.collection('tenantId').doc(TENANT_ID).collection('negocios').doc(businessId);
  return {mode,ref};
}
async function verify(db,fx,first){
  if(!first||first.ok!==true||first.registered!==true)throw new Error('S505_FIRST_RESPONSE_INVALID');
  if(first.advisorId!==fx.advisorId)throw new Error('S505_ADVISOR_MISMATCH');
  const business=await discoverBusinessRef(db,first.entityId);
  const refs2={
    business:business.ref,
    request:db.collection('tenants').doc(TENANT_ID).collection('workflowRequests').doc(first.requestId),
    event:db.collection('tenants').doc(TENANT_ID).collection('workflowEvents').doc(first.eventId),
    outbox:db.collection('tenants').doc(TENANT_ID).collection('notificationOutbox').doc(first.eventId)
  };
  const out={};
  for(const [k,r] of Object.entries(refs2)){const s=await r.get();out[k]={exists:s.exists,data:s.exists?s.data():null};}
  for(const k of Object.keys(refs2))if(!out[k].exists)throw new Error('S505_VERIFY_MISSING_'+k.toUpperCase());
  if(out.request.data.status!=='committed'||!out.request.data.requestDigest)throw new Error('S505_REQUEST_INVALID');
  if(out.event.data.entityId!==first.entityId)throw new Error('S505_EVENT_ENTITY_MISMATCH');
  const targeted=[].concat(out.outbox.data.targets||[]).some(t=>t&&t.type==='advisor'&&t.id===fx.advisorId);
  if(!targeted)throw new Error('S505_OUTBOX_TARGET_MISSING');
  if(out.business.data.origen!=='Web CotComp'||out.business.data.canal!=='Web CotComp')throw new Error('S505_BUSINESS_SOURCE_INVALID');
  return {storageMode:business.mode,refs:refs2};
}
async function cleanup(db,fx,first){
  const r=refs(db,fx);
  const all=[r.permit,r.member];
  if(first&&first.entityId&&first.requestId&&first.eventId){
    const business=await discoverBusinessRef(db,first.entityId);
    all.push(
      business.ref,
      db.collection('tenants').doc(TENANT_ID).collection('workflowRequests').doc(first.requestId),
      db.collection('tenants').doc(TENANT_ID).collection('workflowEvents').doc(first.eventId),
      db.collection('tenants').doc(TENANT_ID).collection('notificationOutbox').doc(first.eventId)
    );
  }
  const batch=db.batch();let deletes=0;
  for(const ref of all){const s=await ref.get();if(s.exists){batch.delete(ref);deletes++;}}
  if(deletes)await batch.commit();
  for(const ref of all){const s=await ref.get();if(s.exists)throw new Error('S505_FINAL_ABSENCE_FAILED');}
  return {deletes,finalAbsence:true};
}
async function main(){
  const phase=clean(process.argv[2],40);
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID;
  if(project!==PROJECT_ID)throw new Error('S505_PROJECT_MISMATCH');
  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
  const db=getFirestore(app);
  const fx=fixture(process.env.S505_PROOF_RUN_ID);
  if(phase==='setup')return {phase,proofRunId:fx.id,uid:fx.uid,advisorId:fx.advisorId,result:await setup(db,fx)};
  if(phase==='verify'){
    const first=JSON.parse(clean(process.env.S505_FIRST_JSON,5000));
    const verified=await verify(db,fx,first);
    return {phase,proofRunId:fx.id,storageMode:verified.storageMode,readback:true};
  }
  if(phase==='cleanup'){
    let first=null;try{first=JSON.parse(clean(process.env.S505_FIRST_JSON,5000));}catch(e){}
    return {phase,proofRunId:fx.id,result:await cleanup(db,fx,first)};
  }
  throw new Error('S505_PHASE_INVALID');
}

module.exports=Object.freeze({PROJECT_ID,TENANT_ID,fixture,setup,verify,cleanup});

if(require.main===module){
  main().then(r=>process.stdout.write(JSON.stringify(r,null,2)+'\n')).catch(e=>{console.error(clean(e&&e.stack||e,1600));process.exit(1);});
}
