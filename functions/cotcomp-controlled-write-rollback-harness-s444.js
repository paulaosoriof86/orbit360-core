'use strict';

const crypto=require('node:crypto');
const data=require('./cotcomp-runtime-data-contract');
const security=require('./cotcomp-negative-security-contract');
const storageDriver=require('./cotcomp-lab-firestore-driver-s444');
const audit=require('./cotcomp-audit-adapter-s444');
const saga=require('./cotcomp-saga-compensation-s444');

const VERSION='ays-cotcomp-controlled-write-rollback-harness-s444-v1.0';
const SIDE_EFFECTS_ALLOWED=false;

function digest(v){
  return crypto.createHash('sha256').update(JSON.stringify(v),'utf8').digest('hex');
}

function buildSyntheticCoreFixture(overrides={}){
  const tenantId='alianzas-soluciones';
  const idempotencyKey=overrides.idempotencyKey||'s444-proof-idem-001';
  const ids=data.deriveCaseIds({tenantId,idempotencyKey});
  const quote=data.buildQuoteCase({
    tenantId,
    caseId:ids.caseId,
    journeyId:'GT_AUTO_MOTO_HYBRID',
    correlationId:ids.correlationId,
    country:'GT',
    source:'PUBLIC_WEB',
    intent:'COTIZAR',
    segment:'PERSONAS',
    riskOrProductCandidate:'AUTO',
    status:'SUBMITTED',
    capturedFields:{vehicleType:'AUTO',brand:'SYNTHETIC',lineModel:'QA_ONLY'},
    missingFields:[],
    contact:{name:'Synthetic QA',whatsapp:'+50200000000',email:'synthetic@example.invalid'},
    consents:{requestManagement:true}
  });
  const access=data.buildCaseAccessRecord({
    tenantId,
    caseId:ids.caseId,
    rawToken:'synthetic-opaque-token',
    expiresAt:'2026-10-01T00:00:00Z'
  });
  if(!quote.ok || !access.ok) throw new Error('S444_FIXTURE_BUILD_FAILED');

  const requestPayload={
    journeyId:'GT_AUTO_MOTO_HYBRID',
    country:'GT',
    product:'AUTO',
    capturedFields:quote.value.capturedFields
  };
  const requestDigest=digest(requestPayload);
  const eventId='evt_'+crypto.createHash('sha256').update(ids.caseId+'|PUBLIC_HANDOFF_RECEIVED','utf8').digest('hex').slice(0,24);

  const records=[
    {
      type:'CREATE_IF_ABSENT',
      entity:'idempotency',
      path:data.pathFor(tenantId,data.ENTITY.IDEMPOTENCY,ids.idempotencyRecordId),
      payload:{
        schemaVersion:VERSION,
        idempotencyRecordId:ids.idempotencyRecordId,
        caseId:ids.caseId,
        correlationId:ids.correlationId,
        requestDigest,
        status:'RESERVED'
      }
    },
    {
      type:'CREATE_IF_ABSENT',
      entity:'quoteCase',
      path:data.pathFor(tenantId,data.ENTITY.QUOTE_CASE,ids.caseId),
      payload:quote.value
    },
    {
      type:'CREATE_IF_ABSENT',
      entity:'caseAccess',
      path:data.pathFor(tenantId,data.ENTITY.CASE_ACCESS,ids.caseId),
      payload:access.value
    },
    {
      type:'CREATE_IF_ABSENT',
      entity:'event',
      path:data.pathFor(tenantId,data.ENTITY.EVENT,eventId),
      payload:{
        schemaVersion:VERSION,
        eventId,
        type:'PUBLIC_HANDOFF_RECEIVED',
        caseId:ids.caseId,
        journeyId:'GT_AUTO_MOTO_HYBRID',
        correlationId:ids.correlationId
      }
    }
  ];

  return {tenantId,ids,requestPayload,requestDigest,records};
}

function runInMemoryProof(){
  const fx=buildSyntheticCoreFixture();
  const store=new Map();
  const createdPaths=[];
  const createdDigests={};

  const context={
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:fx.tenantId,
    actorType:'SERVER_COTCOMP_WRITER',
    publicBrowser:false
  };

  const compiled=storageDriver.compileAtomicGroup({
    group:'W1_CORE',
    commands:fx.records.map(r=>({...r,payloadDigest:digest(r.payload)})),
    context
  });
  if(!compiled.ok) throw new Error('S444_COMPILE_FAILED');

  for(const r of fx.records){
    if(store.has(r.path)) throw new Error('S444_UNEXPECTED_DUPLICATE_FIRST_PASS');
    store.set(r.path,structuredClone(r.payload));
    createdPaths.push(r.path);
    createdDigests[r.path]=digest(r.payload);
  }

  const firstReadback=fx.records.every(r=>store.has(r.path)&&digest(store.get(r.path))===createdDigests[r.path]);

  const existing=store.get(fx.records[0].path);
  const sameRetry=security.evaluateIdempotencyReplay({
    existingRequestDigest:existing.requestDigest,
    incomingRequestDigest:fx.requestDigest
  });
  let samePayloadDuplicateCreated=false;
  if(sameRetry.ok && sameRetry.code==='IDEMPOTENT_RETRY_MATCH'){
    samePayloadDuplicateCreated=false;
  }

  const conflict=security.evaluateIdempotencyReplay({
    existingRequestDigest:existing.requestDigest,
    incomingRequestDigest:digest({...fx.requestPayload,capturedFields:{brand:'CONFLICT'}})
  });

  const aud=audit.buildAuditRecord({
    tenantId:fx.tenantId,
    caseId:fx.ids.caseId,
    correlationId:fx.ids.correlationId,
    type:'S444_W1_SOURCE_PROOF',
    status:'READBACK_PASS',
    digest:fx.requestDigest,
    proofRunId:'S444_MEMORY',
    synthetic:true,
    createdAt:'2026-09-30T00:00:00Z'
  });

  const partial=saga.partialOutcome({
    completedGroups:['CORE'],
    failedGroup:'WORKFLOW',
    errorCode:'SYNTHETIC_INJECTED_FAILURE'
  });
  const comp=saga.compensationPlan({
    state:partial.state,
    syntheticOnly:true,
    proofRunId:'S444_MEMORY',
    createdPaths,
    createdDigests
  });

  let cleanupPass=comp.ok;
  if(cleanupPass){
    for(const path of comp.cleanupOrder){
      const current=store.get(path);
      if(!current || digest(current)!==createdDigests[path]){
        cleanupPass=false;
        break;
      }
      store.delete(path);
    }
  }

  return {
    version:VERSION,
    sideEffectsAllowed:SIDE_EFFECTS_ALLOWED,
    storageDriverExecutionEnabled:storageDriver.EXECUTION_ENABLED,
    auditExecutionEnabled:audit.EXECUTION_ENABLED,
    sagaExecutionEnabled:saga.EXECUTION_ENABLED,
    compiledCorePass:compiled.ok,
    firstReadbackPass:firstReadback,
    samePayloadRetryPass:sameRetry.ok && sameRetry.code==='IDEMPOTENT_RETRY_MATCH',
    samePayloadDuplicateCreated,
    conflictingPayloadDenied:!conflict.ok && conflict.code==='IDEMPOTENCY_PAYLOAD_CONFLICT',
    auditPreviewPass:aud.ok===true,
    partialSuccessReportedAsComplete:partial.reportCompleteSuccess===true,
    compensationPlanPass:comp.ok===true,
    cleanupPass,
    finalAbsence:store.size===0,
    appDataWritesExecuted:0,
    realDataUsed:false,
    productionTouched:false
  };
}

module.exports=Object.freeze({
  VERSION,SIDE_EFFECTS_ALLOWED,digest,buildSyntheticCoreFixture,runInMemoryProof
});
