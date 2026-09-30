'use strict';

const VERSION='ays-cotcomp-saga-compensation-s444-v1.0';
const EXECUTION_ENABLED=false;
const COMPENSATION_CALLS_ALLOWED=false;

const STATES=Object.freeze([
  'CORE_PENDING',
  'CORE_COMMITTED',
  'WORKFLOW_PENDING',
  'WORKFLOW_COMMITTED',
  'EVENT_OUTBOX_PENDING',
  'COMPLETE',
  'PARTIAL_RETRYABLE',
  'COMPENSATION_REQUIRED',
  'ROLLED_BACK_SYNTHETIC'
]);

const TRANSITIONS=Object.freeze({
  CORE_PENDING:Object.freeze(['CORE_COMMITTED','PARTIAL_RETRYABLE']),
  CORE_COMMITTED:Object.freeze(['WORKFLOW_PENDING','COMPLETE','COMPENSATION_REQUIRED']),
  WORKFLOW_PENDING:Object.freeze(['WORKFLOW_COMMITTED','PARTIAL_RETRYABLE','COMPENSATION_REQUIRED']),
  WORKFLOW_COMMITTED:Object.freeze(['EVENT_OUTBOX_PENDING','COMPLETE','COMPENSATION_REQUIRED']),
  EVENT_OUTBOX_PENDING:Object.freeze(['COMPLETE','PARTIAL_RETRYABLE','COMPENSATION_REQUIRED']),
  PARTIAL_RETRYABLE:Object.freeze(['CORE_COMMITTED','WORKFLOW_PENDING','EVENT_OUTBOX_PENDING','COMPENSATION_REQUIRED']),
  COMPENSATION_REQUIRED:Object.freeze(['ROLLED_BACK_SYNTHETIC']),
  COMPLETE:Object.freeze([]),
  ROLLED_BACK_SYNTHETIC:Object.freeze([])
});

function canTransition(from,to){
  return STATES.includes(from) && STATES.includes(to) && (TRANSITIONS[from]||[]).includes(to);
}

function transition(current,to,meta={}){
  if(!canTransition(current,to)){
    return {ok:false,code:'SAGA_TRANSITION_NOT_ALLOWED',from:current,to};
  }
  return {
    ok:true,
    state:to,
    previousState:current,
    retryable:to==='PARTIAL_RETRYABLE',
    compensationRequired:to==='COMPENSATION_REQUIRED',
    syntheticOnly:meta.syntheticOnly===true,
    proofRunId:String(meta.proofRunId||'')
  };
}

function compensationPlan({state,syntheticOnly,proofRunId,createdPaths,createdDigests}={}){
  const reasons=[];
  if(state!=='COMPENSATION_REQUIRED') reasons.push('COMPENSATION_STATE_REQUIRED');
  if(syntheticOnly!==true) reasons.push('SYNTHETIC_ONLY_REQUIRED');
  if(!String(proofRunId||'').trim()) reasons.push('PROOF_RUN_ID_REQUIRED');
  const paths=Array.isArray(createdPaths)?createdPaths.filter(Boolean):[];
  if(!paths.length) reasons.push('CREATED_PATH_JOURNAL_REQUIRED');
  const digests=createdDigests&&typeof createdDigests==='object'?createdDigests:{};
  for(const path of paths){
    if(!digests[path]) reasons.push('CREATED_DIGEST_REQUIRED:'+path);
  }
  return {
    version:VERSION,
    ok:reasons.length===0,
    reasons,
    state,
    proofRunId:String(proofRunId||''),
    cleanupOrder:paths.slice().reverse(),
    requireExactDigestMatch:true,
    stopOnMismatch:true,
    realDataAllowed:false,
    productionAllowed:false,
    executionEnabled:EXECUTION_ENABLED,
    compensationCallsAllowed:COMPENSATION_CALLS_ALLOWED,
    executable:false
  };
}

function partialOutcome({completedGroups=[],failedGroup='',errorCode=''}={}){
  const done=Array.isArray(completedGroups)?completedGroups.slice():[];
  if(!done.length) return {state:'PARTIAL_RETRYABLE',completedGroups:[],failedGroup,errorCode,reportCompleteSuccess:false};
  return {
    state:'COMPENSATION_REQUIRED',
    completedGroups:done,
    failedGroup:String(failedGroup||''),
    errorCode:String(errorCode||''),
    reportCompleteSuccess:false
  };
}

module.exports=Object.freeze({
  VERSION,EXECUTION_ENABLED,COMPENSATION_CALLS_ALLOWED,
  STATES,TRANSITIONS,canTransition,transition,compensationPlan,partialOutcome
});
