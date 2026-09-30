'use strict';

const VERSION = 'ays-cotcomp-negative-security-contract-s424-v0.1';
const RUNTIME_ENABLED = false;
const WRITES_ENABLED = false;

const FORBIDDEN_PUBLIC_KEYS = Object.freeze(new Set([
  'contact',
  'email',
  'whatsapp',
  'rawToken',
  'tokenHash',
  'validatedBy',
  'validatedAt',
  'provenance',
  'sourceDiagnostics',
  'internalNotes',
  'capturedFields',
  'consents'
]));

function clean(v,max=300){
  return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);
}

function evaluateIdempotencyReplay({existingRequestDigest,incomingRequestDigest} = {}){
  const existing=clean(existingRequestDigest,128);
  const incoming=clean(incomingRequestDigest,128);

  if(!incoming) return {ok:false,code:'INCOMING_REQUEST_DIGEST_REQUIRED'};
  if(!existing) return {ok:true,code:'NEW_REQUEST'};
  if(existing===incoming) return {ok:true,code:'IDEMPOTENT_RETRY_MATCH'};
  return {ok:false,code:'IDEMPOTENCY_PAYLOAD_CONFLICT'};
}

function findForbiddenPublicKeys(value,path='$',found=[]){
  if(value==null) return found;
  if(Array.isArray(value)){
    value.forEach((item,index)=>findForbiddenPublicKeys(item,path+'['+index+']',found));
    return found;
  }
  if(typeof value!=='object') return found;

  for(const [key,item] of Object.entries(value)){
    const next=path+'.'+key;
    if(FORBIDDEN_PUBLIC_KEYS.has(key)) found.push(next);
    findForbiddenPublicKeys(item,next,found);
  }
  return found;
}

function validatePublicPayload(value){
  const forbidden=findForbiddenPublicKeys(value);
  return {
    ok:forbidden.length===0,
    code:forbidden.length?'PUBLIC_PAYLOAD_FORBIDDEN_FIELDS':'PUBLIC_PAYLOAD_SAFE',
    forbidden
  };
}

function validateDryRunSummary(summary = {}){
  const forbidden=[];
  const serialized=JSON.stringify(summary);
  for(const key of ['rawToken','contactWhatsapp','contactEmail','capturedFields','consents']){
    if(serialized.includes('"'+key+'"')) forbidden.push(key);
  }
  return {
    ok:forbidden.length===0,
    code:forbidden.length?'DRY_RUN_SUMMARY_PII_LEAK':'DRY_RUN_SUMMARY_SAFE',
    forbidden
  };
}

module.exports=Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  WRITES_ENABLED,
  FORBIDDEN_PUBLIC_KEYS,
  evaluateIdempotencyReplay,
  findForbiddenPublicKeys,
  validatePublicPayload,
  validateDryRunSummary
});
