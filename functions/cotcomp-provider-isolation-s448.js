'use strict';

const VERSION='ays-cotcomp-provider-isolation-s448-v1.0';
const EXPECTED_OWNER_BLOB='73e09a4404cb4298dc34c9c38e26ad1f960d3170';

const REQUIRED_OWNER_MARKERS=Object.freeze([
  "collection('notificationOutbox')",
  "status: 'pending_provider'",
  'tx.set(outboxRef'
]);

const DIRECT_PROVIDER_MARKERS=Object.freeze([
  'fetch(',
  'axios',
  'twilio',
  'sendgrid',
  'nodemailer',
  'mailgun',
  'smtp',
  'wa.me/',
  'whatsapp.com/',
  'api.whatsapp',
  'messages.send',
  'sendmail('
]);

function clean(value){
  return String(value==null?'':value);
}

function containsAny(source, markers){
  const lower=clean(source).toLowerCase();
  return markers.filter(marker=>lower.includes(String(marker).toLowerCase()));
}

function analyzeOwnerSource(source){
  const text=clean(source);
  const missingRequired=REQUIRED_OWNER_MARKERS.filter(marker=>!text.includes(marker));
  const directProviderMarkers=containsAny(text,DIRECT_PROVIDER_MARKERS);
  return Object.freeze({
    requiredOutboxMarkersPresent:missingRequired.length===0,
    missingRequired,
    directProviderMarkers,
    directProviderCallDetected:directProviderMarkers.length>0,
    sourceProviderIsolationSupported:missingRequired.length===0 && directProviderMarkers.length===0
  });
}

function inventoryStrings(items){
  return [].concat(items||[]).map(item=>{
    try{return JSON.stringify(item);}catch(_){return String(item);}
  });
}

function analyzeRuntimeInventory(input={}){
  const functionsInventoryRead=input.functionsInventoryRead===true;
  const eventarcInventoryRead=input.eventarcInventoryRead===true;
  const functions=[].concat(input.functions||[]);
  const eventarcTriggers=[].concat(input.eventarcTriggers||[]);
  const outboxFunctionConsumers=functions.filter(row=>/notificationOutbox/i.test(JSON.stringify(row)));
  const outboxEventarcConsumers=eventarcTriggers.filter(row=>/notificationOutbox/i.test(JSON.stringify(row)));
  return Object.freeze({
    functionsInventoryRead,
    eventarcInventoryRead,
    functionCount:functions.length,
    eventarcTriggerCount:eventarcTriggers.length,
    outboxFunctionConsumers,
    outboxEventarcConsumers,
    automaticOutboxConsumerDetected:outboxFunctionConsumers.length>0 || outboxEventarcConsumers.length>0,
    infrastructureIsolationSupported:functionsInventoryRead && eventarcInventoryRead &&
      outboxFunctionConsumers.length===0 && outboxEventarcConsumers.length===0,
    inventoryDigestMaterial:Object.freeze({
      functions:inventoryStrings(functions),
      eventarcTriggers:inventoryStrings(eventarcTriggers)
    })
  });
}

function evaluate(input={}){
  const blockers=[];
  const owner=analyzeOwnerSource(input.ownerSource||'');
  const infra=analyzeRuntimeInventory(input);
  if(input.projectId!=='ays-orbit-360-lab') blockers.push('PROJECT_NOT_LAB');
  if(input.region!=='us-central1') blockers.push('REGION_NOT_ALLOWED');
  if(input.functionState!=='ACTIVE') blockers.push('OWNER_FUNCTION_NOT_ACTIVE');
  if(input.deployedOwnerBlob!==EXPECTED_OWNER_BLOB) blockers.push('DEPLOYED_OWNER_BLOB_MISMATCH');
  if(!owner.requiredOutboxMarkersPresent) blockers.push('OWNER_OUTBOX_CONTRACT_NOT_FOUND');
  if(owner.directProviderCallDetected) blockers.push('DIRECT_PROVIDER_DELIVERY_MARKER_DETECTED');
  if(!infra.functionsInventoryRead) blockers.push('FUNCTIONS_INVENTORY_READ_REQUIRED');
  if(!infra.eventarcInventoryRead) blockers.push('EVENTARC_INVENTORY_READ_REQUIRED');
  if(infra.automaticOutboxConsumerDetected) blockers.push('AUTOMATIC_OUTBOX_CONSUMER_DETECTED');
  if(input.appDataReadsExecuted!==0) blockers.push('APP_DATA_READS_NOT_ZERO');
  if(input.appDataWritesExecuted!==0) blockers.push('APP_DATA_WRITES_NOT_ZERO');
  if(input.w2Executed===true) blockers.push('W2_EXECUTED_FORBIDDEN');
  if(input.providerDeliveryExecuted===true) blockers.push('PROVIDER_DELIVERY_FORBIDDEN');
  if(input.realDataTouched===true) blockers.push('REAL_DATA_FORBIDDEN');
  if(input.productionTouched===true) blockers.push('PRODUCTION_FORBIDDEN');
  return Object.freeze({
    version:VERSION,
    providerDeliveryIsolationVerified:blockers.length===0,
    blockers,
    owner,
    infrastructure:infra,
    effectiveW2CallAllowed:false,
    effectiveW2WriteAllowed:false
  });
}

module.exports=Object.freeze({
  VERSION,
  EXPECTED_OWNER_BLOB,
  REQUIRED_OWNER_MARKERS,
  DIRECT_PROVIDER_MARKERS,
  analyzeOwnerSource,
  analyzeRuntimeInventory,
  evaluate
});
