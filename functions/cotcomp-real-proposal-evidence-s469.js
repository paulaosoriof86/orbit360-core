'use strict';

const crypto=require('node:crypto');
const proposals=require('./cotcomp-proposal-contracts');
const versioning=require('./cotcomp-proposal-versioning-contract-s452');

const VERSION='ays-cotcomp-s469-real-proposal-evidence-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const JOURNEY_ID='GT_AUTO_MOTO_HYBRID';
const COUNTRY='GT';
const PRODUCT='AUTO';

const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const PROVIDER_OR_RATER_CALLS_ALLOWED=false;
const PRODUCTION_ALLOWED=false;

const SOURCE_ORIGINS=Object.freeze([
  'pdf_externo',
  'cotizador_excel',
  'cotizador_linea_asistido',
  'ajuste_manual_versionado'
]);

const RAW_PII_KEYS=new Set([
  'contact','contacto','customer','cliente','prospect','prospecto',
  'email','correo','whatsapp','phone','telefono','dpi','cedula','nit',
  'plate','placa','address','direccion'
]);

function clean(v,max=260){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function isSha(v){return /^[a-f0-9]{64}$/i.test(clean(v,80));}
function isoInstant(v){
  const s=clean(v,80);
  if(!s||!/(Z|[+-]\d{2}:\d{2})$/.test(s))return null;
  const ms=Date.parse(s);
  return Number.isFinite(ms)?new Date(ms).toISOString():null;
}
function keyTokens(key){
  return clean(key,160).replace(/([a-z0-9])([A-Z])/g,'$1_$2')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .split(/[^a-z0-9]+/).filter(Boolean);
}
function containsRawPiiKeys(value){
  if(value==null)return false;
  if(Array.isArray(value))return value.some(containsRawPiiKeys);
  if(typeof value!=='object')return false;
  for(const [key,val] of Object.entries(value)){
    if(keyTokens(key).some(t=>RAW_PII_KEYS.has(t)))return true;
    if(containsRawPiiKeys(val))return true;
  }
  return false;
}
function validateEvidencePacket(input={}){
  const errors=[];
  if(clean(input.tenantId,180)!==TENANT_ID)errors.push('TENANT_NOT_ALLOWED');
  if(clean(input.journeyId,180)!==JOURNEY_ID)errors.push('JOURNEY_NOT_ALLOWED');
  if(clean(input.country,8).toUpperCase()!==COUNTRY)errors.push('COUNTRY_NOT_ALLOWED');
  if(clean(input.product,160).toUpperCase()!==PRODUCT)errors.push('PRODUCT_NOT_ALLOWED');
  if(!clean(input.caseId,180))errors.push('CASE_ID_REQUIRED');
  if(!clean(input.insurerId,180))errors.push('INSURER_ID_REQUIRED');
  if(!clean(input.insurerDisplayName,220))errors.push('INSURER_DISPLAY_NAME_REQUIRED');
  if(!clean(input.planName,220))errors.push('PLAN_NAME_REQUIRED');
  if(!clean(input.currency,8))errors.push('CURRENCY_REQUIRED');
  if(!(Number(input.premium)>0))errors.push('PREMIUM_REQUIRED');

  const source=input.sourceEvidence&&typeof input.sourceEvidence==='object'&&!Array.isArray(input.sourceEvidence)
    ? input.sourceEvidence : {};
  const origin=clean(source.origin,80);
  if(!SOURCE_ORIGINS.includes(origin))errors.push('SOURCE_ORIGIN_NOT_ALLOWED');
  if(!isSha(source.documentSha256))errors.push('SOURCE_DOCUMENT_SHA256_REQUIRED');
  if(!isSha(source.referenceCommitmentSha256))errors.push('SOURCE_REFERENCE_COMMITMENT_REQUIRED');
  if(source.humanValidated!==true)errors.push('HUMAN_VALIDATION_REQUIRED');
  if(!isSha(source.validatorCommitmentSha256))errors.push('VALIDATOR_COMMITMENT_REQUIRED');
  if(!isoInstant(source.validatedAt))errors.push('VALIDATED_AT_REQUIRED');
  if(origin==='ajuste_manual_versionado'&&!isSha(source.manualReasonCommitmentSha256)){
    errors.push('MANUAL_REASON_COMMITMENT_REQUIRED');
  }
  if(source.providerOrRaterCallsExecuted!==0)errors.push('PROVIDER_OR_RATER_MUST_BE_ZERO');
  if(source.rawDocumentStoredInCotComp===true)errors.push('RAW_DOCUMENT_IN_COTCOMP_FORBIDDEN');
  if(source.piiCopiedToProposal===true)errors.push('PII_IN_PROPOSAL_FORBIDDEN');
  if(containsRawPiiKeys(input))errors.push('RAW_PII_KEY_FORBIDDEN');

  const validity=versioning.normalizeValidity(input.validity||{});
  if(!validity.ok)errors.push(validity.code);

  const structured=['coverages','limits','sublimits','deductibles','assistance'];
  for(const key of structured){
    if(!input[key]||typeof input[key]!=='object'||Array.isArray(input[key]))errors.push(key.toUpperCase()+'_OBJECT_REQUIRED');
  }
  for(const key of ['conditions','exclusions']){
    if(!Array.isArray(input[key]))errors.push(key.toUpperCase()+'_ARRAY_REQUIRED');
  }

  return Object.freeze({ok:errors.length===0,errors:Object.freeze(Array.from(new Set(errors)))});
}
function sourceIdFromEvidence(source={}){
  if(!isSha(source.documentSha256)||!isSha(source.referenceCommitmentSha256)){
    return {ok:false,code:'SOURCE_HASHES_REQUIRED'};
  }
  return {
    ok:true,
    sourceId:'source_'+sha([
      clean(source.origin,80),
      clean(source.documentSha256,80).toLowerCase(),
      clean(source.referenceCommitmentSha256,80).toLowerCase()
    ].join('|')).slice(0,24)
  };
}
function buildRealProposalCandidate(input={},asOf){
  const validation=validateEvidencePacket(input);
  if(!validation.ok)return {ok:false,code:'REAL_PROPOSAL_EVIDENCE_INVALID',errors:validation.errors};

  const source=input.sourceEvidence;
  const sourceId=sourceIdFromEvidence(source);
  if(!sourceId.ok)return sourceId;

  const validatedAt=isoInstant(source.validatedAt);
  const requestKey='s469|'+sha([
    clean(input.caseId,180),
    sourceId.sourceId,
    clean(source.documentSha256,80),
    clean(source.validatorCommitmentSha256,80),
    validatedAt
  ].join('|'));

  const plan=versioning.buildAtomicVersionPlan({
    tenantId:TENANT_ID,
    caseId:clean(input.caseId,180),
    country:COUNTRY,
    product:PRODUCT,
    currency:clean(input.currency,8).toUpperCase(),
    insurerId:clean(input.insurerId,180),
    insurerDisplayName:clean(input.insurerDisplayName,220),
    sourceId:sourceId.sourceId,
    planName:clean(input.planName,220),
    premium:Number(input.premium),
    coverages:input.coverages,
    limits:input.limits,
    sublimits:input.sublimits,
    deductibles:input.deductibles,
    assistance:input.assistance,
    conditions:input.conditions,
    exclusions:input.exclusions,
    validity:input.validity,
    provenance:{
      evidenceClass:'REAL_INSURER_QUOTE_EVIDENCE',
      sourceOrigin:clean(source.origin,80),
      sourceDocumentSha256:clean(source.documentSha256,80).toLowerCase(),
      sourceReferenceCommitmentSha256:clean(source.referenceCommitmentSha256,80).toLowerCase(),
      validatorCommitmentSha256:clean(source.validatorCommitmentSha256,80).toLowerCase(),
      manualReasonCommitmentSha256:isSha(source.manualReasonCommitmentSha256)
        ? clean(source.manualReasonCommitmentSha256,80).toLowerCase() : '',
      humanValidated:true,
      providerOrRaterCallsExecuted:0,
      rawDocumentStoredInCotComp:false,
      piiCopiedToProposal:false
    },
    validationState:'VALIDATED',
    validatedBy:'sha256:'+clean(source.validatorCommitmentSha256,80).toLowerCase(),
    validatedAt,
    versionNumber:1,
    requestKey
  });
  if(!plan.ok)return plan;

  const validity=versioning.evaluateCurrentValidity(plan.proposal.validity,asOf);
  const eligibility=proposals.evaluateComparisonEligibility(plan.proposal,{
    currentValidityConfirmed:validity.current===true
  });

  return Object.freeze({
    ok:true,
    version:VERSION,
    sourceId:sourceId.sourceId,
    plan,
    validity:Object.freeze(validity),
    comparisonEligibility:Object.freeze(eligibility),
    eligibleForRealW3:eligibility.eligible===true,
    executionEnabled:false,
    appDataReadsAllowed:false,
    appDataWritesAllowed:false,
    providerOrRaterCallsAllowed:false,
    productionAllowed:false
  });
}
function syntheticEvidencePacket(){
  return {
    tenantId:TENANT_ID,
    journeyId:JOURNEY_ID,
    caseId:'qcase_s469_synthetic',
    country:COUNTRY,
    product:PRODUCT,
    insurerId:'insurer_s469',
    insurerDisplayName:'Synthetic Insurer',
    planName:'Synthetic Plan',
    currency:'GTQ',
    premium:2500,
    coverages:{collision:'COVERED'},
    limits:{},
    sublimits:{},
    deductibles:{},
    assistance:{},
    conditions:[],
    exclusions:[],
    validity:{validFrom:'2026-10-01T00:00:00Z',validUntil:'2026-10-31T23:59:59Z'},
    sourceEvidence:{
      origin:'pdf_externo',
      documentSha256:'a'.repeat(64),
      referenceCommitmentSha256:'b'.repeat(64),
      validatorCommitmentSha256:'c'.repeat(64),
      validatedAt:'2026-10-02T12:00:00Z',
      humanValidated:true,
      providerOrRaterCallsExecuted:0,
      rawDocumentStoredInCotComp:false,
      piiCopiedToProposal:false
    }
  };
}
function readiness(){
  const fx=syntheticEvidencePacket();
  const built=buildRealProposalCandidate(fx,'2026-10-15T12:00:00Z');
  const blockers=[];
  if(!built.ok)blockers.push(built.code||'S469_BUILD_FAILED');
  if(built.ok){
    if(built.eligibleForRealW3!==true)blockers.push('S469_SYNTHETIC_ELIGIBILITY_FAILED');
    if(built.plan.proposal.validationState!=='VALIDATED')blockers.push('S469_VALIDATION_STATE_INVALID');
    if(built.plan.proposal.provenance.providerOrRaterCallsExecuted!==0)blockers.push('S469_PROVIDER_LOCK_INVALID');
    if(built.plan.proposal.provenance.rawDocumentStoredInCotComp!==false)blockers.push('S469_RAW_DOCUMENT_POLICY_INVALID');
  }
  return Object.freeze({
    version:VERSION,
    sourceContractReady:blockers.length===0,
    blockers:Object.freeze(blockers),
    currentDependency:'REAL_VALIDATED_PROPOSAL_EVIDENCE_REQUIRED',
    acceptableEvidenceOrigins:SOURCE_ORIGINS,
    executionEnabled:false,
    appDataReadsAllowed:false,
    appDataWritesAllowed:false,
    providerOrRaterCallsAllowed:false,
    productionAllowed:false,
    realProposalCreated:false,
    realDataTouched:false
  });
}

module.exports=Object.freeze({
  VERSION,PROJECT_ID,TENANT_ID,JOURNEY_ID,COUNTRY,PRODUCT,
  EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,
  PROVIDER_OR_RATER_CALLS_ALLOWED,PRODUCTION_ALLOWED,SOURCE_ORIGINS,
  clean,sha,isSha,containsRawPiiKeys,validateEvidencePacket,sourceIdFromEvidence,
  buildRealProposalCandidate,syntheticEvidencePacket,readiness
});
