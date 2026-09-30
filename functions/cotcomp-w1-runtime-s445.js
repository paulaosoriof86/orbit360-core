'use strict';

const crypto=require('node:crypto');
const { getApps, initializeApp }=require('firebase-admin/app');
const { getFirestore }=require('firebase-admin/firestore');
const { onCall, HttpsError }=require('firebase-functions/v2/https');

const VERSION='ays-cotcomp-w1-synthetic-runtime-s445-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const TENANT_ID='alianzas-soluciones';
const LAB_WEB_APP_ID='1:646761409743:web:2ec4595ee9160f9d945bba';

const app=getApps()[0]||initializeApp();
const db=getFirestore(app);

function clean(v,max=240){
  return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);
}
function sha(v){
  return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');
}
function stable(v){
  if(v==null) return v;
  if(Array.isArray(v)) return v.map(stable);
  if(typeof v==='object') return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
  return v;
}
function digest(v){
  return sha(JSON.stringify(stable(v)));
}
function runtimeProjectId(){
  return process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||'';
}
function requireProofRequest(request){
  if(runtimeProjectId()!==PROJECT_ID){
    throw new HttpsError('failed-precondition','S445_PROJECT_MISMATCH');
  }
  if(!(request&&request.app&&request.app.appId===LAB_WEB_APP_ID)){
    throw new HttpsError('permission-denied','S445_LAB_WEB_APP_APPCHECK_REQUIRED');
  }
  if(!(request&&request.data&&request.data.syntheticProof===true)){
    throw new HttpsError('failed-precondition','S445_SYNTHETIC_PROOF_ONLY');
  }
  const proofRunId=clean(request.data.proofRunId,120);
  if(!/^s445-[A-Za-z0-9._:-]{6,100}$/.test(proofRunId)){
    throw new HttpsError('invalid-argument','S445_PROOF_RUN_ID_INVALID');
  }
  return proofRunId;
}
function idsFor(proofRunId){
  const seed=TENANT_ID+'|'+proofRunId;
  const h=sha(seed);
  return Object.freeze({
    proofRunId,
    caseId:'qcase_'+h.slice(0,24),
    correlationId:'corr_'+h.slice(24,48),
    idempotencyRecordId:'idem_'+h.slice(0,24),
    eventId:'evt_'+h.slice(40,64)
  });
}
function pathsFor(ids){
  const base='tenants/'+TENANT_ID+'/cotcomp/';
  return Object.freeze({
    idempotency:base+'idempotency/items/'+ids.idempotencyRecordId,
    quoteCase:base+'quoteCases/items/'+ids.caseId,
    caseAccess:base+'caseAccess/items/'+ids.caseId,
    event:base+'events/items/'+ids.eventId
  });
}
function refsFor(paths){
  return Object.freeze({
    idempotency:db.doc(paths.idempotency),
    quoteCase:db.doc(paths.quoteCase),
    caseAccess:db.doc(paths.caseAccess),
    event:db.doc(paths.event)
  });
}
function payloadsFor(ids,proofStartedAt,variant='BASE'){
  const capturedFields={
    vehicleType:'AUTO',
    brand:'SYNTHETIC',
    lineModel:variant==='BASE'?'S445_W1_QA_ONLY':'S445_CONFLICT'
  };
  const requestShape={
    journeyId:'GT_AUTO_MOTO_HYBRID',
    country:'GT',
    product:'AUTO',
    capturedFields
  };
  const requestDigest=digest(requestShape);
  const syntheticRawToken='s445-token-'+ids.proofRunId;
  return Object.freeze({
    requestDigest,
    idempotency:{
      schemaVersion:VERSION,
      synthetic:true,
      proofRunId:ids.proofRunId,
      idempotencyRecordId:ids.idempotencyRecordId,
      caseId:ids.caseId,
      correlationId:ids.correlationId,
      requestDigest,
      status:'RESERVED',
      createdAt:proofStartedAt
    },
    quoteCase:{
      schemaVersion:VERSION,
      synthetic:true,
      proofRunId:ids.proofRunId,
      tenantId:TENANT_ID,
      caseId:ids.caseId,
      journeyId:'GT_AUTO_MOTO_HYBRID',
      correlationId:ids.correlationId,
      country:'GT',
      source:'PUBLIC_WEB',
      intent:'COTIZAR',
      segment:'PERSONAS',
      riskOrProductCandidate:'AUTO',
      status:'SUBMITTED',
      capturedFields,
      missingFields:[],
      contact:{
        name:'Synthetic QA',
        whatsapp:'+50200000000',
        email:'synthetic@example.invalid'
      },
      consents:{requestManagement:true},
      createdAt:proofStartedAt
    },
    caseAccess:{
      schemaVersion:VERSION,
      synthetic:true,
      proofRunId:ids.proofRunId,
      tenantId:TENANT_ID,
      caseId:ids.caseId,
      tokenHash:sha(syntheticRawToken),
      rawTokenPersisted:false,
      status:'ACTIVE',
      expiresAt:'2099-01-01T00:00:00.000Z',
      createdAt:proofStartedAt
    },
    event:{
      schemaVersion:VERSION,
      synthetic:true,
      proofRunId:ids.proofRunId,
      eventId:ids.eventId,
      type:'S445_W1_SYNTHETIC_CORE_PROOF',
      caseId:ids.caseId,
      correlationId:ids.correlationId,
      createdAt:proofStartedAt
    }
  });
}
async function readExact(refs){
  const snaps=await db.getAll(refs.idempotency,refs.quoteCase,refs.caseAccess,refs.event);
  const keys=['idempotency','quoteCase','caseAccess','event'];
  const out={};
  for(let i=0;i<snaps.length;i++){
    const snap=snaps[i];
    const data=snap.exists?snap.data():null;
    out[keys[i]]={
      exists:snap.exists,
      data,
      digest:snap.exists?digest(data):null,
      updateTime:snap.updateTime?snap.updateTime.toDate().toISOString():null
    };
  }
  return out;
}
function assertExactReadback(readback,payloads){
  for(const key of ['idempotency','quoteCase','caseAccess','event']){
    if(!readback[key]||readback[key].exists!==true) throw new Error('S445_READBACK_MISSING_'+key);
    if(readback[key].digest!==digest(payloads[key])) throw new Error('S445_READBACK_DIGEST_MISMATCH_'+key);
  }
  return true;
}
async function commitCore(refs,payloads){
  return db.runTransaction(async tx=>{
    const idem=await tx.get(refs.idempotency);
    if(idem.exists){
      const current=idem.data()||{};
      if(current.requestDigest!==payloads.requestDigest){
        const err=new Error('S445_IDEMPOTENCY_PAYLOAD_CONFLICT');
        err.code='S445_IDEMPOTENCY_PAYLOAD_CONFLICT';
        throw err;
      }
      const rest=await Promise.all([
        tx.get(refs.quoteCase),
        tx.get(refs.caseAccess),
        tx.get(refs.event)
      ]);
      if(rest.some(s=>!s.exists)){
        const err=new Error('S445_IDEMPOTENCY_PARTIAL_STATE');
        err.code='S445_IDEMPOTENCY_PARTIAL_STATE';
        throw err;
      }
      return {code:'IDEMPOTENT_RETRY_MATCH',writes:0};
    }

    tx.create(refs.idempotency,payloads.idempotency);
    tx.create(refs.quoteCase,payloads.quoteCase);
    tx.create(refs.caseAccess,payloads.caseAccess);
    tx.create(refs.event,payloads.event);
    return {code:'CREATED',writes:4};
  });
}
async function cleanupExact(refs,expected,proofRunId){
  return db.runTransaction(async tx=>{
    const entries=[
      ['idempotency',refs.idempotency],
      ['quoteCase',refs.quoteCase],
      ['caseAccess',refs.caseAccess],
      ['event',refs.event]
    ];
    const snaps=[];
    for(const [,ref] of entries) snaps.push(await tx.get(ref));
    for(let i=0;i<entries.length;i++){
      const [key]=entries[i];
      const snap=snaps[i];
      if(!snap.exists) throw new Error('S445_CLEANUP_MISSING_'+key);
      const data=snap.data()||{};
      if(data.synthetic!==true||data.proofRunId!==proofRunId){
        throw new Error('S445_CLEANUP_NOT_OWNED_'+key);
      }
      if(digest(data)!==expected[key].digest){
        throw new Error('S445_CLEANUP_DIGEST_MISMATCH_'+key);
      }
    }
    for(const [,ref] of entries) tx.delete(ref);
    return {deleted:entries.length};
  });
}

const cotcompSyntheticCoreWriteProof=onCall({
  region:REGION,
  enforceAppCheck:true,
  consumeAppCheckToken:true,
  timeoutSeconds:120,
  memory:'256MiB',
  maxInstances:1
},async request=>{
  const proofRunId=requireProofRequest(request);
  const ids=idsFor(proofRunId);
  const paths=pathsFor(ids);
  const refs=refsFor(paths);
  const proofStartedAt=new Date().toISOString();
  const payloads=payloadsFor(ids,proofStartedAt,'BASE');

  let created=false;
  let initialReadback=null;
  let sameRetry=null;
  let afterRetry=null;
  let conflictDenied=false;
  let cleanup=null;
  let finalReadback=null;

  try{
    const first=await commitCore(refs,payloads);
    if(first.code!=='CREATED'||first.writes!==4) throw new Error('S445_INITIAL_CREATE_FAILED');
    created=true;

    initialReadback=await readExact(refs);
    assertExactReadback(initialReadback,payloads);

    sameRetry=await commitCore(refs,payloads);
    if(sameRetry.code!=='IDEMPOTENT_RETRY_MATCH'||sameRetry.writes!==0){
      throw new Error('S445_SAME_RETRY_FAILED');
    }

    afterRetry=await readExact(refs);
    for(const key of ['idempotency','quoteCase','caseAccess','event']){
      if(afterRetry[key].digest!==initialReadback[key].digest) throw new Error('S445_RETRY_MUTATED_'+key);
      if(afterRetry[key].updateTime!==initialReadback[key].updateTime) throw new Error('S445_RETRY_UPDATED_'+key);
    }

    const conflictPayloads=payloadsFor(ids,proofStartedAt,'CONFLICT');
    try{
      await commitCore(refs,conflictPayloads);
      throw new Error('S445_CONFLICT_NOT_DENIED');
    }catch(err){
      if(err&&err.code==='S445_IDEMPOTENCY_PAYLOAD_CONFLICT') conflictDenied=true;
      else throw err;
    }

    const afterConflict=await readExact(refs);
    for(const key of ['idempotency','quoteCase','caseAccess','event']){
      if(afterConflict[key].digest!==initialReadback[key].digest) throw new Error('S445_CONFLICT_MUTATED_'+key);
      if(afterConflict[key].updateTime!==initialReadback[key].updateTime) throw new Error('S445_CONFLICT_UPDATED_'+key);
    }

    cleanup=await cleanupExact(refs,initialReadback,proofRunId);
    finalReadback=await readExact(refs);
    const finalAbsence=Object.values(finalReadback).every(x=>x.exists===false);
    if(!finalAbsence) throw new Error('S445_FINAL_ABSENCE_FAILED');

    return {
      ok:true,
      version:VERSION,
      proofRunId,
      projectId:PROJECT_ID,
      region:REGION,
      tenantId:TENANT_ID,
      syntheticOnly:true,
      appCheckAppId:LAB_WEB_APP_ID,
      scope:['idempotency','quoteCase','caseAccess_hash_only','cotcomp_event'],
      excluded:['workflow_projection','notifications','proposal_persistence','selection_persistence','real_data','production'],
      paths,
      firstReadbackExact:true,
      samePayloadRetryPass:true,
      samePayloadRetryWrites:0,
      duplicateCreatedOnRetry:false,
      conflictingPayloadDenied:conflictDenied,
      conflictWrites:0,
      caseAccessRawTokenPersisted:false,
      cleanupDeleted:cleanup.deleted,
      finalAbsence,
      writeAccounting:{
        createWrites:4,
        retryWrites:0,
        conflictWrites:0,
        deleteWrites:4,
        totalAppDataMutations:8,
        netPersistentDocuments:0
      },
      productionTouched:false
    };
  }catch(err){
    if(created&&initialReadback){
      try{
        const current=await readExact(refs);
        const allPresent=Object.values(current).every(x=>x.exists===true);
        if(allPresent){
          await cleanupExact(refs,current,proofRunId);
        }
      }catch(cleanupErr){
        throw new HttpsError('internal','S445_PROOF_FAILED_AND_CLEANUP_FAILED');
      }
    }
    throw new HttpsError('failed-precondition',clean(err&&err.code||err&&err.message||'S445_PROOF_FAILED',180));
  }
});

module.exports=Object.freeze({
  VERSION,
  PROJECT_ID,
  REGION,
  TENANT_ID,
  LAB_WEB_APP_ID,
  idsFor,
  pathsFor,
  payloadsFor,
  cotcompSyntheticCoreWriteProof
});
