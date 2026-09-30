'use strict';

const VERSION='ays-cotcomp-write-release-stages-s443-v1.0';

const STAGES=Object.freeze([
  Object.freeze({
    id:'W0',
    name:'SOURCE_ONLY_CURRENT',
    executableNow:true,
    writesAllowed:false,
    realDataAllowed:false,
    purpose:'Contracts, dry-run plans, QA and evidence only.'
  }),
  Object.freeze({
    id:'W1',
    name:'SYNTHETIC_CORE_COMMIT',
    executableNow:false,
    writesAllowed:false,
    realDataAllowed:false,
    purpose:'Future gated synthetic create/readback/retry/cleanup proof for idempotency + quoteCase + caseAccess(hash-only) + event.',
    excludes:['workflowProjection','notificationProviderDelivery','realData','production']
  }),
  Object.freeze({
    id:'W2',
    name:'SYNTHETIC_WORKFLOW_PROJECTION',
    executableNow:false,
    writesAllowed:false,
    realDataAllowed:false,
    purpose:'Future gated synthetic lead/ops projection after exact workflow owner runtime proof.',
    excludes:['notificationProviderDelivery','realData','production']
  }),
  Object.freeze({
    id:'W3',
    name:'SYNTHETIC_PROPOSAL_VERSIONING',
    executableNow:false,
    writesAllowed:false,
    realDataAllowed:false,
    purpose:'Future gated synthetic proposal create/version/current-validity/readback proof.',
    excludes:['providerOrRaterCalls','realData','production']
  }),
  Object.freeze({
    id:'W4',
    name:'SYNTHETIC_SELECTION',
    executableNow:false,
    writesAllowed:false,
    realDataAllowed:false,
    purpose:'Future gated synthetic explicit-user-selection persistence and truth-lock readback.',
    excludes:['issuance','binding','payment','realData','production']
  }),
  Object.freeze({
    id:'W5',
    name:'REAL_DATA_PILOT',
    executableNow:false,
    writesAllowed:false,
    realDataAllowed:false,
    purpose:'Separate future gate only after W1-W4 physical PASS and explicit Owner authorization.',
    excludes:['productionByInference']
  })
]);

const CORE_WRITE_SEQUENCE=Object.freeze([
  'RESERVE_IDEMPOTENCY',
  'CREATE_QUOTE_CASE_IF_ABSENT',
  'CREATE_CASE_ACCESS_HASH_ONLY_IF_ABSENT',
  'CREATE_EVENT_IF_ABSENT',
  'READBACK_EXACT_CORE',
  'RETRY_SAME_PAYLOAD_EXPECT_NO_DUPLICATE',
  'RETRY_CONFLICTING_PAYLOAD_EXPECT_DENY',
  'CLEANUP_SYNTHETIC_CORE',
  'VERIFY_FINAL_ABSENCE'
]);

const SAGA_STATES=Object.freeze([
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

function stage(id){
  return STAGES.find(x=>x.id===id)||null;
}

function evaluateStageGate(id,input={}){
  const s=stage(id);
  if(!s) return {ok:false,reasons:['STAGE_UNKNOWN'],stage:null,effectiveWriteAllowed:false};
  if(id==='W0') return {ok:true,reasons:[],stage:s,effectiveWriteAllowed:false};

  const reasons=[];
  if(input.projectId!=='ays-orbit-360-lab') reasons.push('PROJECT_NOT_LAB');
  if(input.syntheticOnly!==true && id!=='W5') reasons.push('SYNTHETIC_ONLY_REQUIRED');
  if(input.notificationProviderSideEffectsDisabled!==true && ['W1','W2'].includes(id)) reasons.push('NOTIFICATION_SIDE_EFFECTS_MUST_BE_DISABLED');
  if(input.ownerStageAuthorization!==true) reasons.push('EXPLICIT_OWNER_STAGE_AUTHORIZATION_REQUIRED');
  if(input.rollbackHarnessReady!==true) reasons.push('ROLLBACK_HARNESS_REQUIRED');
  if(input.realData===true && id!=='W5') reasons.push('REAL_DATA_FORBIDDEN');
  if(input.production===true) reasons.push('PRODUCTION_FORBIDDEN');

  return {
    ok:reasons.length===0,
    reasons,
    stage:s,
    effectiveWriteAllowed:false
  };
}

module.exports=Object.freeze({
  VERSION,
  STAGES,
  CORE_WRITE_SEQUENCE,
  SAGA_STATES,
  stage,
  evaluateStageGate
});
