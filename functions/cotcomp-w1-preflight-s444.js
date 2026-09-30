'use strict';

const driver=require('./cotcomp-lab-firestore-driver-s444');
const audit=require('./cotcomp-audit-adapter-s444');
const saga=require('./cotcomp-saga-compensation-s444');
const harness=require('./cotcomp-controlled-write-rollback-harness-s444');

const VERSION='ays-cotcomp-w1-preflight-s444-v1.0';

function currentState(){
  const proof=harness.runInMemoryProof();
  const sourceReady=
    proof.compiledCorePass===true &&
    proof.firstReadbackPass===true &&
    proof.samePayloadRetryPass===true &&
    proof.samePayloadDuplicateCreated===false &&
    proof.conflictingPayloadDenied===true &&
    proof.auditPreviewPass===true &&
    proof.partialSuccessReportedAsComplete===false &&
    proof.compensationPlanPass===true &&
    proof.cleanupPass===true &&
    proof.finalAbsence===true;

  return Object.freeze({
    version:VERSION,
    sourceReadyForOwnerW1Gate:sourceReady,
    executionEnabled:false,
    effectiveWriteAllowed:false,
    storageDriverCandidateReady:sourceReady && driver.EXECUTION_ENABLED===false,
    auditAdapterCandidateReady:sourceReady && audit.EXECUTION_ENABLED===false,
    sagaCandidateReady:sourceReady && saga.EXECUTION_ENABLED===false,
    rollbackHarnessSourcePass:sourceReady,
    providerSideEffectsPlannedDisabled:true,
    ownerW1AuthorizationPresent:false,
    deployAuthorizationPresent:false,
    realDataAllowed:false,
    productionAllowed:false,
    remainingGateBlockers:[
      'OWNER_W1_SYNTHETIC_WRITE_AUTHORIZATION_REQUIRED',
      'W1_LAB_DEPLOY_AUTHORIZATION_REQUIRED'
    ]
  });
}

module.exports=Object.freeze({VERSION,currentState});
