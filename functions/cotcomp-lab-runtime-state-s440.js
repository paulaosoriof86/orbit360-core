'use strict';

const VERSION = 'ays-cotcomp-lab-runtime-state-s440-v1.0';

const LAB = Object.freeze({
  projectId:'ays-orbit-360-lab',
  environment:'LAB',
  region:'us-central1',
  deployedSourceSha:'17d599e884d5b834b73b9499d8cef177575d56f9',
  deployedSourceTree:'e645aaed3d012174f1e6b1a9b083b86e03f8b60d',
  workflowOwnerBlob:'73e09a4404cb4298dc34c9c38e26ad1f960d3170',
  deployRunId:36763893708,
  deployWorkflowConclusion:'FAILURE_AFTER_SUCCESSFUL_FUNCTION_CREATION_CLEANUP_POLICY_ONLY',
  readbackRunId:36764338132,
  readbackWorkflowConclusion:'SUCCESS',
  sourceArtifactId:'11119533069',
  sourceArtifactDigest:'9d50a9b8fca53a9971811f5cae663109e602ec028129c6dede8f5adcc539e838',
  readbackArtifactId:'11120545801',
  readbackArtifactDigest:'8f0673b0afa05c014c43b99c63d99a7055d87b1b0a65ef0e863d6677736e9e67',
  backendSourceDigest:'ea6941bfba5e53347a12713a978b7e35c3077a7854590bc1c520c4b50e628802'
});

const FUNCTIONS = Object.freeze([
  'cotcompValidateDraft',
  'cotcompSubmitHandoff',
  'cotcompFetchComparableProposals',
  'cotcompSelectProposal'
]);

const RUNTIME = Object.freeze({
  deployed:true,
  inventoryReadbackVerified:true,
  functionState:'ACTIVE',
  platform:'gcfv2',
  runtime:'nodejs22',
  syntheticOnlySourceGate:true,
  appCheckConfiguredInDeployedSource:true,
  replayProtectionConfiguredInDeployedSource:true,
  callableInvocationVerified:false,
  persistenceEnabled:false,
  appDataWritesExecuted:0,
  realDataUsed:false,
  productionTouched:false,
  cleanupPolicyConfigured:false,
  cleanupPolicyWarningOpen:true
});

function currentState(){
  return Object.freeze({
    version:VERSION,
    lab:LAB,
    functions:FUNCTIONS.slice(),
    runtime:RUNTIME,
    releaseTruth:{
      labRuntimeDeployed:true,
      labInventoryReadbackPass:true,
      syntheticCallableInvocationPass:false,
      persistenceReleased:false,
      writesReleased:false,
      realDataReleased:false,
      productionReleased:false
    }
  });
}

module.exports=Object.freeze({
  VERSION,
  LAB,
  FUNCTIONS,
  RUNTIME,
  currentState
});
