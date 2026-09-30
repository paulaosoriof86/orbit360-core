'use strict';

const runtimeData=require('./cotcomp-runtime-data-contract');
const persistencePlan=require('./cotcomp-persistence-plan');
const persistenceAdapter=require('./cotcomp-persistence-adapter-candidate');
const writer=require('./cotcomp-persistence-writer-interface');
const storage=require('./cotcomp-lab-storage-adapter-candidate');
const workflow=require('./cotcomp-workflow-extension-contract');
const secureEnvelope=require('./cotcomp-secure-writer-envelope');

const VERSION='ays-cotcomp-persistence-write-readiness-s443-v1.0';

const S442_BASELINE=Object.freeze({
  validAppCheckSyntheticInvocationPass:true,
  proofRunId:36774479211,
  exactHeadQaRunId:36779053846,
  exactHeadQaPass:283,
  exactHeadQaFail:0,
  persistenceEnabled:false,
  appDataWritesExecuted:0,
  realDataUsed:false,
  productionTouched:false
});

const SOURCE_FACTS=Object.freeze({
  runtimeDataContractPresent:true,
  deterministicIdempotencyPresent:true,
  caseAccessHashOnlyPresent:true,
  explicitUserChoiceSelectionTruthPresent:true,
  dryRunPersistenceCompilerPresent:true,
  writerInterfacePresent:true,
  storagePathAllowlistPresent:true,
  negativeSecurityHarnessPresent:true,
  workflowCotcompRefSourcePresent:true,
  workflowOwnerBlobReviewed:workflow.TARGET_OWNER.reviewedBlobSha,
  ownerInternalRetentionPolicyVersion:runtimeData.PII_POLICY.retentionPolicyVersion,
  ownerInternalRetentionPolicyStatus:runtimeData.PII_POLICY.retentionPolicyStatus,
  legalComplianceVerified:runtimeData.PII_POLICY.legalComplianceVerified
});

const HARD_LOCKS=Object.freeze({
  persistenceAdapterExecutionEnabled:persistenceAdapter.EXECUTION_ENABLED,
  persistenceAdapterWritesEnabled:persistenceAdapter.WRITES_ENABLED,
  writerExecutionEnabled:writer.EXECUTION_ENABLED,
  writerWritesEnabled:writer.WRITES_ENABLED,
  writerDependencyCallsAllowed:writer.DEPENDENCY_CALLS_ALLOWED,
  storageReady:storage.READY,
  storageExecutionEnabled:storage.EXECUTION_ENABLED,
  storageWritesEnabled:storage.WRITES_ENABLED,
  storageDriverCallsAllowed:storage.DRIVER_CALLS_ALLOWED,
  secureWriterExecutionEnabled:secureEnvelope.EXECUTION_ENABLED,
  secureWriterWritesEnabled:secureEnvelope.WRITES_ENABLED,
  secureWriterDependencyCallsAllowed:secureEnvelope.DEPENDENCY_CALLS_ALLOWED
});

const FINDINGS=Object.freeze([
  {
    id:'S443-F01',
    severity:'PASS_SOURCE',
    area:'DATA_CONTRACT',
    finding:'Canonical CotComp entities, deterministic IDs and truth semantics already exist in source.'
  },
  {
    id:'S443-F02',
    severity:'PASS_SOURCE',
    area:'CASE_ACCESS',
    finding:'Case-access persistence stores tokenHash only; raw token persistence is forbidden by the frozen S4.26 policy.'
  },
  {
    id:'S443-F03',
    severity:'PASS_SOURCE',
    area:'RETENTION',
    finding:'Runtime metadata is aligned source-only to Owner internal policy S4.26: 30-day inactive draft, 12-month submitted/not-converted case and 7-day case access. Legal compliance remains unverified.'
  },
  {
    id:'S443-F04',
    severity:'BLOCKER',
    area:'STORAGE_DRIVER',
    finding:'No executable Firestore storage driver is bound to the CotComp writer. Storage adapter remains READY=false and DRIVER_CALLS_ALLOWED=false.'
  },
  {
    id:'S443-F05',
    severity:'BLOCKER',
    area:'WRITER',
    finding:'Writer and secure-writer execution locks remain false. No source path can perform a CotComp persistence write.'
  },
  {
    id:'S443-F06',
    severity:'BLOCKER',
    area:'WORKFLOW_PROJECTION',
    finding:'Canonical Gravicentra source supports cotcompRef at owner blob 73e09a4404cb4298dc34c9c38e26ad1f960d3170, but CotComp has no independent evidence that this exact workflow owner blob is deployed in the LAB runtime used for future projections.'
  },
  {
    id:'S443-F07',
    severity:'BLOCKER',
    area:'MULTI_GROUP_ATOMICITY',
    finding:'Initial handoff spans separate atomic groups for CotComp core, workflow projection and event/outbox. A durable resume/compensation contract is required before writes so partial success is never reported as full success.'
  },
  {
    id:'S443-F08',
    severity:'BLOCKER',
    area:'ROLLBACK',
    finding:'No CotComp controlled-write cleanup/rollback proof has yet demonstrated create-readback-retry-cleanup-final-absence in LAB.'
  },
  {
    id:'S443-F09',
    severity:'BLOCKER',
    area:'AUDIT',
    finding:'Writer interface defines an audit dependency but no concrete CotComp audit adapter has been runtime-bound or physically proven.'
  },
  {
    id:'S443-F10',
    severity:'BLOCKER',
    area:'NOTIFICATION_SIDE_EFFECTS',
    finding:'Notification outbox/provider delivery must remain separately gated; persistence proof must not accidentally trigger WhatsApp/email/provider side effects.'
  },
  {
    id:'S443-F11',
    severity:'BLOCKER',
    area:'AUTHORIZATION',
    finding:'Owner has not authorized CotComp persistence or app-data writes. S4.42 authorization covered synthetic invocation only.'
  },
  {
    id:'S443-F12',
    severity:'BLOCKER',
    area:'REAL_DATA',
    finding:'No real-data read/write or production release is authorized. Any later real-data pilot must be a distinct gate after synthetic controlled-write proof.'
  }
]);

function hardLocksClosed(){
  return Object.values(HARD_LOCKS).every(v=>v===false);
}

function evaluateReadiness(input={}){
  const blockers=[];
  if(input.projectId!=='ays-orbit-360-lab') blockers.push('PROJECT_NOT_LAB');
  if(input.environment!=='LAB') blockers.push('ENVIRONMENT_NOT_LAB');
  if(input.tenantId!=='alianzas-soluciones') blockers.push('TENANT_NOT_ALLOWED');
  if(input.s442FunctionalBaselinePass!==true) blockers.push('S442_FUNCTIONAL_BASELINE_REQUIRED');
  if(input.workflowOwnerBlobRuntimeVerified!==true) blockers.push('WORKFLOW_OWNER_RUNTIME_PROOF_REQUIRED');
  if(input.storageDriverImplemented!==true) blockers.push('STORAGE_DRIVER_REQUIRED');
  if(input.auditAdapterImplemented!==true) blockers.push('AUDIT_ADAPTER_REQUIRED');
  if(input.sagaResumeCompensationContractPass!==true) blockers.push('SAGA_RESUME_COMPENSATION_REQUIRED');
  if(input.syntheticControlledWriteRollbackProofPass!==true) blockers.push('SYNTHETIC_CONTROLLED_WRITE_ROLLBACK_PROOF_REQUIRED');
  if(input.notificationProviderSideEffectsDisabled!==true) blockers.push('NOTIFICATION_SIDE_EFFECTS_MUST_BE_DISABLED');
  if(input.ownerWriteAuthorization!==true) blockers.push('OWNER_WRITE_AUTHORIZATION_REQUIRED');
  if(input.deployAuthorization!==true) blockers.push('DEPLOY_AUTHORIZATION_REQUIRED');

  return Object.freeze({
    version:VERSION,
    logicalReady:blockers.length===0,
    blockers,
    sourceFacts:SOURCE_FACTS,
    hardLocks:HARD_LOCKS,
    hardLocksClosed:hardLocksClosed(),
    effectiveWriteAllowed:false,
    realDataAllowed:false,
    productionAllowed:false
  });
}

function currentReadiness(){
  return evaluateReadiness({
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    s442FunctionalBaselinePass:true,
    workflowOwnerBlobRuntimeVerified:false,
    storageDriverImplemented:false,
    auditAdapterImplemented:false,
    sagaResumeCompensationContractPass:false,
    syntheticControlledWriteRollbackProofPass:false,
    notificationProviderSideEffectsDisabled:false,
    ownerWriteAuthorization:false,
    deployAuthorization:false
  });
}

module.exports=Object.freeze({
  VERSION,
  S442_BASELINE,
  SOURCE_FACTS,
  HARD_LOCKS,
  FINDINGS,
  hardLocksClosed,
  evaluateReadiness,
  currentReadiness
});
