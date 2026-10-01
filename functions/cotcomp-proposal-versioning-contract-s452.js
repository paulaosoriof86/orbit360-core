'use strict';

const crypto=require('node:crypto');
const data=require('./cotcomp-runtime-data-contract');
const proposalContracts=require('./cotcomp-proposal-contracts');

const VERSION='ays-cotcomp-proposal-versioning-contract-s452-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const PROVIDER_OR_RATER_CALLS_ALLOWED=false;
const PHYSICAL_W3_ALLOWED=false;

function clean(v,max=260){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function stable(v){
  if(v==null)return v;
  if(Array.isArray(v))return v.map(stable);
  if(typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
  return v;
}
function digest(v){return sha(JSON.stringify(stable(v)));}

function isoInstant(v,label){
  const s=clean(v,80);
  if(!s||!/(Z|[+-]\d{2}:\d{2})$/.test(s))return {ok:false,code:(label||'INSTANT')+'_TIMEZONE_REQUIRED'};
  const ms=Date.parse(s);
  if(!Number.isFinite(ms))return {ok:false,code:(label||'INSTANT')+'_INVALID'};
  return {ok:true,value:new Date(ms).toISOString(),ms};
}

function normalizeValidity(validity={}){
  if(!validity||typeof validity!=='object'||Array.isArray(validity))return {ok:false,code:'VALIDITY_OBJECT_REQUIRED'};
  const from=isoInstant(validity.validFrom,'VALID_FROM');
  if(!from.ok)return from;
  const until=isoInstant(validity.validUntil,'VALID_UNTIL');
  if(!until.ok)return until;
  if(until.ms<=from.ms)return {ok:false,code:'VALIDITY_RANGE_INVALID'};
  return {
    ok:true,
    value:Object.freeze({
      validFrom:from.value,
      validUntil:until.value
    })
  };
}

function evaluateCurrentValidity(validity,asOf){
  const normalized=normalizeValidity(validity);
  if(!normalized.ok)return {current:false,reason:normalized.code};
  const instant=isoInstant(asOf,'AS_OF');
  if(!instant.ok)return {current:false,reason:instant.code};
  const from=Date.parse(normalized.value.validFrom);
  const until=Date.parse(normalized.value.validUntil);
  if(instant.ms<from)return {current:false,reason:'NOT_YET_VALID'};
  if(instant.ms>until)return {current:false,reason:'EXPIRED'};
  return {current:true,reason:'CURRENT'};
}

function normalizeCaseLink(input={}){
  const normalized=proposalContracts.normalizeProposalCaseLink(input);
  if(!normalized.ok)return normalized;
  const caseId=clean(normalized.proposal.caseId,180);
  if(!caseId)return {ok:false,errors:[{fieldId:'caseId',code:'REQUIRED'}]};
  return {ok:true,proposal:normalized.proposal,caseId,errors:[]};
}

function deriveSeriesId(input={}){
  const link=normalizeCaseLink(input);
  if(!link.ok)return {ok:false,code:'CASE_LINK_INVALID',errors:link.errors};
  const required=['tenantId','insurerId','sourceId','product','planName'];
  const missing=required.filter(k=>!clean(input[k],260));
  if(missing.length)return {ok:false,code:'PROPOSAL_SERIES_REQUIRED_FIELDS',missing};
  const seed=[
    clean(input.tenantId,180),
    link.caseId,
    clean(input.insurerId,180),
    clean(input.sourceId,180),
    clean(input.product,160),
    clean(input.planName,220)
  ].join('|');
  return {ok:true,proposalSeriesId:'pseries_'+sha(seed).slice(0,24),caseId:link.caseId};
}

function deriveProposalId(proposalSeriesId,versionNumber){
  const series=clean(proposalSeriesId,180);
  const version=Number(versionNumber);
  if(!series||!Number.isInteger(version)||version<1)return {ok:false,code:'PROPOSAL_VERSION_IDENTITY_INVALID'};
  return {ok:true,proposalId:'proposal_'+sha(series+'|v'+version).slice(0,24)};
}

function proposalRequestId({tenantId,proposalSeriesId,versionNumber,requestKey}={}){
  const tenant=clean(tenantId,180),series=clean(proposalSeriesId,180),key=clean(requestKey,320);
  const version=Number(versionNumber);
  if(!tenant||!series||!key||!Number.isInteger(version)||version<1)return {ok:false,code:'PROPOSAL_REQUEST_IDENTITY_REQUIRED'};
  return {ok:true,requestId:'pverreq_'+sha([tenant,series,'v'+version,key].join('|')).slice(0,24)};
}

function canonicalRequestDigest(input={}){
  return digest({
    tenantId:clean(input.tenantId,180),
    caseId:clean(input.caseId,180),
    proposalSeriesId:clean(input.proposalSeriesId,180),
    versionNumber:Number(input.versionNumber),
    insurerId:clean(input.insurerId,180),
    sourceId:clean(input.sourceId,180),
    country:clean(input.country,8).toUpperCase(),
    product:clean(input.product,160),
    currency:clean(input.currency,8).toUpperCase(),
    planName:clean(input.planName,220),
    premium:input.premium,
    coverages:input.coverages||{},
    limits:input.limits||{},
    sublimits:input.sublimits||{},
    deductibles:input.deductibles||{},
    assistance:input.assistance||{},
    conditions:Array.isArray(input.conditions)?input.conditions:[],
    exclusions:Array.isArray(input.exclusions)?input.exclusions:[],
    validity:input.validity||{},
    provenance:input.provenance||{},
    validationState:clean(input.validationState,80),
    validatedBy:clean(input.validatedBy,180),
    validatedAt:input.validatedAt||null,
    supersedesProposalId:clean(input.supersedesProposalId,180)
  });
}

function buildVersionedProposal(input={}){
  const series=deriveSeriesId(input);
  if(!series.ok)return series;
  const versionNumber=Number(input.versionNumber);
  if(!Number.isInteger(versionNumber)||versionNumber<1)return {ok:false,code:'VERSION_NUMBER_INVALID'};

  const proposalIdResult=deriveProposalId(series.proposalSeriesId,versionNumber);
  if(!proposalIdResult.ok)return proposalIdResult;
  if(clean(input.proposalId,180)&&clean(input.proposalId,180)!==proposalIdResult.proposalId){
    return {ok:false,code:'PROPOSAL_ID_NOT_DETERMINISTIC'};
  }

  const validity=normalizeValidity(input.validity);
  if(!validity.ok)return validity;

  const supersedes=clean(input.supersedesProposalId,180);
  if(versionNumber===1&&supersedes)return {ok:false,code:'V1_CANNOT_SUPERSEDE'};
  if(versionNumber>1&&!supersedes)return {ok:false,code:'SUPERSEDES_REQUIRED_FROM_V2'};

  const base=data.buildProposal(Object.assign({},input,{
    proposalId:proposalIdResult.proposalId,
    caseId:series.caseId,
    validity:validity.value,
    supersedesProposalId:supersedes
  }));
  if(!base.ok)return base;

  const proposal=Object.freeze(Object.assign({},base.value,{
    proposalSeriesId:series.proposalSeriesId,
    versionNumber,
    isCurrentVersion:true,
    supersededByProposalId:'',
    validity:validity.value
  }));

  const comparisonShape=proposalContracts.validateProposalShape(proposal);
  if(!comparisonShape.ok)return {ok:false,code:'COMPARISON_SHAPE_INVALID',errors:comparisonShape.errors};

  return {
    ok:true,
    value:proposal,
    proposalSeriesId:series.proposalSeriesId,
    proposalId:proposal.proposalId,
    versionNumber
  };
}

function validatePreviousForNext(previous,next){
  if(!previous||typeof previous!=='object')return {ok:false,code:'PREVIOUS_PROPOSAL_REQUIRED'};
  if(clean(previous.proposalSeriesId,180)!==clean(next.proposalSeriesId,180))return {ok:false,code:'PROPOSAL_SERIES_MISMATCH'};
  if(Number(previous.versionNumber)+1!==Number(next.versionNumber))return {ok:false,code:'VERSION_SEQUENCE_INVALID'};
  if(previous.isCurrentVersion!==true)return {ok:false,code:'PREVIOUS_NOT_CURRENT'};
  if(clean(next.supersedesProposalId,180)!==clean(previous.proposalId,180))return {ok:false,code:'SUPERSEDES_LINK_INVALID'};
  if(clean(previous.supersededByProposalId,180))return {ok:false,code:'PREVIOUS_ALREADY_SUPERSEDED'};
  return {ok:true};
}

function supersededPrevious(previous,nextProposalId){
  const check=clean(nextProposalId,180);
  if(!check)throw new Error('NEXT_PROPOSAL_ID_REQUIRED');
  return Object.freeze(Object.assign({},previous,{
    validationState:'SUPERSEDED',
    isCurrentVersion:false,
    supersededByProposalId:check
  }));
}

function pathForProposal(tenantId,proposalId){
  return data.pathFor(tenantId,data.ENTITY.PROPOSAL,proposalId);
}
function pathForIdempotency(tenantId,requestId){
  return data.pathFor(tenantId,data.ENTITY.IDEMPOTENCY,requestId);
}

function buildAtomicVersionPlan(input={}){
  const built=buildVersionedProposal(input);
  if(!built.ok)return built;

  const request=proposalRequestId({
    tenantId:input.tenantId,
    proposalSeriesId:built.proposalSeriesId,
    versionNumber:built.versionNumber,
    requestKey:input.requestKey
  });
  if(!request.ok)return request;

  const requestDigest=canonicalRequestDigest(built.value);
  const proposalPath=pathForProposal(input.tenantId,built.proposalId);
  const requestPath=pathForIdempotency(input.tenantId,request.requestId);
  const operations=[];

  if(built.versionNumber===1){
    if(input.previousProposal)return {ok:false,code:'V1_PREVIOUS_PROPOSAL_FORBIDDEN'};
  }else{
    const prev=validatePreviousForNext(input.previousProposal,built.value);
    if(!prev.ok)return prev;
    operations.push(Object.freeze({
      type:'UPDATE_EXACT_IF_DIGEST_MATCH',
      entity:'proposal_previous',
      path:pathForProposal(input.tenantId,input.previousProposal.proposalId),
      expectedBeforeDigest:digest(input.previousProposal),
      payload:supersededPrevious(input.previousProposal,built.proposalId)
    }));
  }

  operations.push(Object.freeze({
    type:'CREATE_IF_ABSENT',
    entity:'proposal_version',
    path:proposalPath,
    payload:built.value
  }));
  operations.push(Object.freeze({
    type:'CREATE_IDEMPOTENCY_IF_ABSENT',
    entity:'proposal_version_request',
    path:requestPath,
    payload:Object.freeze({
      schemaVersion:VERSION,
      kind:'PROPOSAL_VERSION',
      tenantId:clean(input.tenantId,180),
      caseId:built.value.caseId,
      proposalSeriesId:built.proposalSeriesId,
      proposalId:built.proposalId,
      versionNumber:built.versionNumber,
      requestId:request.requestId,
      requestDigest,
      status:'COMMITTED'
    })
  }));

  return Object.freeze({
    ok:true,
    version:VERSION,
    executionEnabled:EXECUTION_ENABLED,
    writesEnabled:APP_DATA_WRITES_ALLOWED,
    physicalW3Allowed:PHYSICAL_W3_ALLOWED,
    atomic:true,
    requestId:request.requestId,
    requestDigest,
    proposal:built.value,
    operations:Object.freeze(operations),
    invariants:Object.freeze({
      immutableVersionDocument:true,
      silentOverwriteForbidden:true,
      uniqueCurrentBySequentialSupersession:true,
      sameRequestSamePayloadWrites:0,
      sameRequestChangedPayload:'DENY',
      duplicateVersionCreate:'DENY',
      providerOrRaterCallsAllowed:false
    })
  });
}

function retryDecision(existingRequest,input={}){
  if(!existingRequest||typeof existingRequest!=='object')return {action:'NEW',writesAllowedByDecision:true};
  const digestNow=clean(input.requestDigest,80);
  if(existingRequest.requestDigest===digestNow&&existingRequest.status==='COMMITTED'){
    return {action:'REUSE',writesAllowedByDecision:false,writes:0};
  }
  return {action:'DENY',writesAllowedByDecision:false,writes:0,code:'PROPOSAL_IDEMPOTENCY_CONFLICT'};
}

function buildSyntheticW3Lifecycle(){
  const common={
    tenantId:'alianzas-soluciones',
    caseId:'qcase_s452_synthetic',
    country:'GT',
    product:'AUTO',
    currency:'GTQ',
    insurerId:'insurer_s452',
    insurerDisplayName:'Synthetic Insurer',
    sourceId:'source_s452',
    planName:'Synthetic Plan',
    premium:2500,
    coverages:{collision:'COVERED'},
    limits:{},
    sublimits:{},
    deductibles:{},
    assistance:{},
    conditions:[],
    exclusions:[],
    validity:{validFrom:'2026-10-01T00:00:00Z',validUntil:'2026-10-31T23:59:59Z'},
    provenance:{synthetic:true},
    validationState:'VALIDATED',
    validatedBy:'s452-source-only',
    validatedAt:'2026-10-01T00:00:00Z'
  };
  const v1=buildAtomicVersionPlan(Object.assign({},common,{versionNumber:1,requestKey:'s452-v1'}));
  if(!v1.ok)return v1;
  const v2=buildAtomicVersionPlan(Object.assign({},common,{
    premium:2600,
    versionNumber:2,
    requestKey:'s452-v2',
    supersedesProposalId:v1.proposal.proposalId,
    previousProposal:v1.proposal
  }));
  if(!v2.ok)return v2;

  const currentV1=evaluateCurrentValidity(v1.proposal.validity,'2026-10-15T12:00:00Z');
  const currentV2=evaluateCurrentValidity(v2.proposal.validity,'2026-10-15T12:00:00Z');
  const v1After=supersededPrevious(v1.proposal,v2.proposal.proposalId);

  const createdPaths=[
    pathForProposal(common.tenantId,v1.proposal.proposalId),
    pathForIdempotency(common.tenantId,v1.requestId),
    pathForProposal(common.tenantId,v2.proposal.proposalId),
    pathForIdempotency(common.tenantId,v2.requestId)
  ];

  return Object.freeze({
    ok:true,
    v1,
    v2,
    v1After,
    validity:Object.freeze({v1:currentV1,v2:currentV2}),
    journal:Object.freeze({
      createdPaths:Object.freeze(createdPaths),
      updatePath:pathForProposal(common.tenantId,v1.proposal.proposalId),
      expectedCreatedDocuments:4,
      expectedVersion2AtomicWrites:3,
      cleanupDeletePaths:Object.freeze([...createdPaths].reverse()),
      finalAbsenceRequired:true
    }),
    proofSequence:Object.freeze([
      'CREATE_V1_AND_IDEMPOTENCY_ATOMIC',
      'READBACK_V1_EXACT',
      'RETRY_V1_SAME_REQUEST_EXPECT_0_WRITES',
      'CONFLICT_V1_CHANGED_PAYLOAD_EXPECT_DENY',
      'CREATE_V2_SUPERSEDE_V1_AND_IDEMPOTENCY_ATOMIC',
      'READBACK_V1_SUPERSEDED_AND_V2_CURRENT_EXACT',
      'RETRY_V2_SAME_REQUEST_EXPECT_0_WRITES',
      'CONFLICT_V2_CHANGED_PAYLOAD_EXPECT_DENY',
      'VERIFY_VALIDATED_AND_CURRENT_V2_ONLY',
      'CLEANUP_EXACT_SYNTHETIC_JOURNAL',
      'VERIFY_FINAL_ABSENCE'
    ])
  });
}

function readiness(){
  const life=buildSyntheticW3Lifecycle();
  const blockers=[];
  if(!life.ok)blockers.push(life.code||'W3_LIFECYCLE_INVALID');
  if(life.ok){
    if(life.v1.proposal.caseId!=='qcase_s452_synthetic')blockers.push('CASE_LINK_NOT_CANONICAL');
    if(life.v1.proposal.versionNumber!==1||life.v2.proposal.versionNumber!==2)blockers.push('VERSION_IDENTITY_INVALID');
    if(life.v1After.validationState!=='SUPERSEDED'||life.v1After.isCurrentVersion!==false)blockers.push('SUPERSESSION_INVALID');
    if(life.v2.proposal.isCurrentVersion!==true)blockers.push('CURRENT_VERSION_INVALID');
    if(life.validity.v2.current!==true)blockers.push('CURRENT_VALIDITY_NOT_DERIVABLE');
    if(life.journal.expectedCreatedDocuments!==4||life.journal.expectedVersion2AtomicWrites!==3)blockers.push('ROLLBACK_JOURNAL_INVALID');
  }
  return Object.freeze({
    version:VERSION,
    sourceContractReady:blockers.length===0,
    physicalW3Ready:blockers.length===0,
    physicalW3Allowed:false,
    ownerW3Authorization:false,
    blockers:Object.freeze(blockers.length?blockers:['OWNER_W3_AUTHORIZATION_REQUIRED']),
    executionEnabled:EXECUTION_ENABLED,
    appDataReadsAllowed:APP_DATA_READS_ALLOWED,
    appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
    providerOrRaterCallsAllowed:PROVIDER_OR_RATER_CALLS_ALLOWED,
    lifecycle:life.ok?life:null
  });
}

module.exports=Object.freeze({
  VERSION,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,
  PROVIDER_OR_RATER_CALLS_ALLOWED,PHYSICAL_W3_ALLOWED,
  clean,sha,digest,normalizeValidity,evaluateCurrentValidity,normalizeCaseLink,
  deriveSeriesId,deriveProposalId,proposalRequestId,canonicalRequestDigest,
  buildVersionedProposal,validatePreviousForNext,supersededPrevious,
  pathForProposal,pathForIdempotency,buildAtomicVersionPlan,retryDecision,
  buildSyntheticW3Lifecycle,readiness
});
