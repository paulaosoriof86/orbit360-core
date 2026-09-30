'use strict';

const VERSION='ays-cotcomp-runtime-config-readback-s449-v1.0';
const EXPECTED_PROJECT_ID='ays-orbit-360-lab';
const EXPECTED_REGION='us-central1';
const EXPECTED_TENANT_ID='alianzas-soluciones';
const EXPECTED_OWNER_BLOB='73e09a4404cb4298dc34c9c38e26ad1f960d3170';

const REQUIRED_OWNER_MARKERS=Object.freeze([
  "collection('config').doc('workflow')",
  "storageMode: raw.storageMode === 'canonicalV2' ? 'canonicalV2' : 'legacyCompatible'",
  "config && config.storageMode === 'canonicalV2'"
]);

function clean(value,max=300){
  return String(value==null?'':value).replace(/\u0000/g,'').trim().slice(0,max);
}

function analyzeOwnerSource(source){
  const text=String(source==null?'':source);
  const missingRequired=REQUIRED_OWNER_MARKERS.filter(marker=>!text.includes(marker));
  return Object.freeze({
    requiredMarkersPresent:missingRequired.length===0,
    missingRequired,
    effectiveModeRule:'canonicalV2 iff raw storageMode is exactly canonicalV2; otherwise legacyCompatible'
  });
}

function stringField(fields,name){
  const row=fields && fields[name];
  return row && typeof row.stringValue==='string' ? clean(row.stringValue,160) : '';
}

function decodeReadback(input={}){
  const status=Number(input.httpStatus||0);
  const response=input.response && typeof input.response==='object' ? input.response : {};
  if(status===404){
    return Object.freeze({
      readable:true,
      documentExists:false,
      rawStorageMode:'',
      configVersion:'',
      effectiveStorageMode:'legacyCompatible',
      basis:'CONFIG_DOCUMENT_ABSENT_OWNER_DEFAULT'
    });
  }
  if(status!==200){
    return Object.freeze({
      readable:false,
      documentExists:null,
      rawStorageMode:'',
      configVersion:'',
      effectiveStorageMode:'',
      basis:'CONFIG_READ_FAILED_HTTP_'+String(status||'UNKNOWN')
    });
  }
  const fields=response.fields && typeof response.fields==='object' ? response.fields : {};
  const rawStorageMode=stringField(fields,'storageMode');
  const configVersion=stringField(fields,'version');
  return Object.freeze({
    readable:true,
    documentExists:true,
    rawStorageMode,
    configVersion,
    effectiveStorageMode:rawStorageMode==='canonicalV2' ? 'canonicalV2' : 'legacyCompatible',
    basis:rawStorageMode==='canonicalV2'
      ? 'CONFIG_EXPLICIT_CANONICALV2'
      : 'OWNER_DEFAULT_FOR_NON_CANONICAL_VALUE'
  });
}

function evaluate(input={}){
  const blockers=[];
  if(clean(input.projectId,120)!==EXPECTED_PROJECT_ID) blockers.push('PROJECT_NOT_LAB');
  if(clean(input.region,80)!==EXPECTED_REGION) blockers.push('REGION_NOT_ALLOWED');
  if(clean(input.tenantId,120)!==EXPECTED_TENANT_ID) blockers.push('TENANT_NOT_ALLOWED');
  if(clean(input.functionState,80)!=='ACTIVE') blockers.push('OWNER_FUNCTION_NOT_ACTIVE');
  if(clean(input.deployedOwnerBlob,80)!==EXPECTED_OWNER_BLOB) blockers.push('DEPLOYED_OWNER_BLOB_MISMATCH');

  const source=analyzeOwnerSource(input.ownerSource||'');
  if(!source.requiredMarkersPresent) blockers.push('OWNER_STORAGE_MODE_SEMANTICS_NOT_VERIFIED');

  const readback=decodeReadback({
    httpStatus:input.configHttpStatus,
    response:input.configResponse
  });
  if(!readback.readable) blockers.push('RUNTIME_WORKFLOW_CONFIG_READBACK_FAILED');
  if(Number(input.configReadAttempts)!==1) blockers.push('EXACTLY_ONE_CONFIG_READ_ATTEMPT_REQUIRED');
  if(Number(input.appDataWritesExecuted)!==0) blockers.push('APP_DATA_WRITES_NOT_ZERO');
  if(input.w2Executed===true) blockers.push('W2_EXECUTED_FORBIDDEN');
  if(input.providerDeliveryExecuted===true) blockers.push('PROVIDER_DELIVERY_FORBIDDEN');
  if(input.realDataTouched===true) blockers.push('REAL_DATA_FORBIDDEN');
  if(input.productionTouched===true) blockers.push('PRODUCTION_FORBIDDEN');
  if(input.deployExecuted===true) blockers.push('DEPLOY_FORBIDDEN');
  if(Number(input.iamWritesExecuted)!==0) blockers.push('IAM_WRITES_NOT_ZERO');
  if(Number(input.firebaseConfigWritesExecuted)!==0) blockers.push('FIREBASE_CONFIG_WRITES_NOT_ZERO');

  return Object.freeze({
    version:VERSION,
    runtimeStorageModeVerified:blockers.length===0,
    effectiveStorageMode:readback.effectiveStorageMode,
    readback,
    source,
    blockers,
    effectiveW2CallAllowed:false,
    effectiveW2WriteAllowed:false,
    remainingW2Blockers:blockers.length===0
      ? Object.freeze(['OWNER_W2_AUTHORIZATION_REQUIRED'])
      : Object.freeze(['W2_RUNTIME_CONFIG_READBACK_REQUIRED','OWNER_W2_AUTHORIZATION_REQUIRED'])
  });
}

module.exports=Object.freeze({
  VERSION,
  EXPECTED_PROJECT_ID,
  EXPECTED_REGION,
  EXPECTED_TENANT_ID,
  EXPECTED_OWNER_BLOB,
  REQUIRED_OWNER_MARKERS,
  analyzeOwnerSource,
  decodeReadback,
  evaluate
});
