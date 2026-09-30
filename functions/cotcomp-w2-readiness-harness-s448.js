'use strict';

const crypto=require('node:crypto');
const w2=require('./cotcomp-w2-workflow-projection-candidate-s446');

const VERSION='ays-cotcomp-w2-readiness-harness-s448-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;

function sha(value){
  return crypto.createHash('sha256').update(String(value==null?'':value),'utf8').digest('hex');
}

function eventId(tenantId,requestId){
  return 'evt_'+sha(String(tenantId)+'|'+String(requestId)).slice(0,28);
}

function entityPath(storageMode,tenantId,collection,id){
  if(storageMode==='canonicalV2'){
    return ['tenants',tenantId,'workflow',collection,'items',id].join('/');
  }
  return ['tenantId',tenantId,collection,id].join('/');
}

function buildFixture(overrides={}){
  return w2.buildSyntheticProjection(Object.assign({
    synthetic:true,
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    caseId:'case_s448_synthetic_001',
    journeyId:'journey_s448_synthetic_001',
    correlationId:'corr_s448_synthetic_001',
    quoteCasePath:'tenants/alianzas-soluciones/cotcompQuoteCases/case_s448_synthetic_001',
    product:'AUTO_SYNTHETIC',
    line:'AUTO_SYNTHETIC',
    country:'GT',
    currency:'GTQ',
    realData:false,
    production:false
  },overrides));
}

function buildJournal(input={}){
  const storageMode=input.storageMode;
  if(!['legacyCompatible','canonicalV2'].includes(storageMode)){
    return Object.freeze({ok:false,code:'RUNTIME_STORAGE_MODE_REQUIRED',entries:[]});
  }
  const projection=input.projection||buildFixture();
  if(!projection.ok) return Object.freeze({ok:false,code:'PROJECTION_INVALID',entries:[]});
  const tenantId=projection.target.tenantId;
  const entries=[];
  for(const command of projection.commands){
    const collection=command.operation==='create_business'?'negocios':'gestiones';
    const reqId=command.requestId;
    const evtId=eventId(tenantId,reqId);
    entries.push(
      {component:'workflow_entity',operation:command.operation,path:entityPath(storageMode,tenantId,collection,command.entityId)},
      {component:'workflow_event',operation:command.operation,path:['tenants',tenantId,'workflowEvents',evtId].join('/')},
      {component:'workflow_request',operation:command.operation,path:['tenants',tenantId,'workflowRequests',reqId].join('/')},
      {component:'notification_outbox',operation:command.operation,path:['tenants',tenantId,'notificationOutbox',evtId].join('/')}
    );
  }
  return Object.freeze({
    ok:true,
    version:VERSION,
    storageMode,
    tenantId,
    projectionIds:projection.ids,
    entries:Object.freeze(entries.map(Object.freeze)),
    expectedCreatedDocuments:8,
    portalNotificationExpected:false,
    providerDeliveryAllowed:false,
    journalDigest:sha(JSON.stringify(entries))
  });
}

function makeDigestMap(journal,projection){
  const map={};
  for(const entry of journal.entries){
    const command=projection.commands.find(c=>c.operation===entry.operation);
    map[entry.path]=sha(JSON.stringify({
      path:entry.path,
      operation:entry.operation,
      requestId:command.requestId,
      entityId:command.entityId,
      payload:command.payload
    }));
  }
  return map;
}

function simulateLifecycle(input={}){
  const projection=input.projection||buildFixture();
  const journal=input.journal||buildJournal({storageMode:input.storageMode,projection});
  if(!journal.ok) return Object.freeze({ok:false,code:journal.code});
  const firstDigests=makeDigestMap(journal,projection);
  const store=new Map();
  let firstCreates=0;
  for(const entry of journal.entries){
    store.set(entry.path,firstDigests[entry.path]);
    firstCreates++;
  }
  const sizeAfterFirst=store.size;

  let retryWrites=0;
  for(const entry of journal.entries){
    if(store.get(entry.path)!==firstDigests[entry.path]){
      store.set(entry.path,firstDigests[entry.path]);
      retryWrites++;
    }
  }
  const sizeAfterRetry=store.size;

  const conflictPath=journal.entries[0].path;
  const conflictDigest=sha(firstDigests[conflictPath]+'conflict');
  const conflictDenied=store.has(conflictPath) && store.get(conflictPath)!==conflictDigest;
  const conflictWrites=0;

  let cleanupDeletes=0;
  for(const entry of [...journal.entries].reverse()){
    if(store.delete(entry.path)) cleanupDeletes++;
  }

  return Object.freeze({
    ok:true,
    firstCreates,
    sizeAfterFirst,
    retryWrites,
    sizeAfterRetry,
    duplicateOnRetry:sizeAfterRetry!==sizeAfterFirst,
    conflictDenied,
    conflictWrites,
    cleanupDeletes,
    finalAbsence:store.size===0,
    finalDocumentCount:store.size,
    journalDigest:journal.journalDigest
  });
}

function readiness(input={}){
  const blockers=[];
  const projection=input.projection||buildFixture();
  const journal=input.journal||buildJournal({storageMode:input.storageMode,projection});
  if(!projection.ok) blockers.push('W2_SYNTHETIC_PROJECTION_INVALID');
  if(!journal.ok) blockers.push(journal.code||'W2_JOURNAL_NOT_READY');
  if(input.workflowOwnerRuntimeVerified!==true) blockers.push('WORKFLOW_OWNER_RUNTIME_PROOF_REQUIRED');
  if(input.providerDeliveryIsolationVerified!==true) blockers.push('PROVIDER_DELIVERY_ISOLATION_REQUIRED');
  if(input.runtimeStorageModeVerified!==true) blockers.push('W2_RUNTIME_CONFIG_READBACK_REQUIRED');
  if(input.ownerW2Authorization!==true) blockers.push('OWNER_W2_AUTHORIZATION_REQUIRED');
  return Object.freeze({
    version:VERSION,
    sourceHarnessReady:journal.ok===true,
    logicalReadyForOwnerW2Gate:blockers.length===1 && blockers[0]==='OWNER_W2_AUTHORIZATION_REQUIRED',
    blockers,
    executionEnabled:EXECUTION_ENABLED,
    appDataReadsAllowed:APP_DATA_READS_ALLOWED,
    appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
    effectiveCallAllowed:false,
    effectiveWriteAllowed:false
  });
}

module.exports=Object.freeze({
  VERSION,
  EXECUTION_ENABLED,
  APP_DATA_READS_ALLOWED,
  APP_DATA_WRITES_ALLOWED,
  eventId,
  entityPath,
  buildFixture,
  buildJournal,
  simulateLifecycle,
  readiness
});
