'use strict';

const VERSION='ays-cotcomp-appcheck-synthetic-proof-s442-v1.0';

const TARGET=Object.freeze({
  projectId:'ays-orbit-360-lab',
  projectNumber:'646761409743',
  region:'us-central1',
  webAppId:'1:646761409743:web:2ec4595ee9160f9d945bba',
  webAppDisplayName:'Orbit360 LAB Web',
  deployedSourceSha:'17d599e884d5b834b73b9499d8cef177575d56f9'
});

const FUNCTIONS=Object.freeze([
  'cotcompValidateDraft',
  'cotcompSubmitHandoff',
  'cotcompFetchComparableProposals',
  'cotcompSelectProposal'
]);

const SECURITY=Object.freeze({
  appCheckMustRemainEnforced:true,
  debugTokenLabOnly:true,
  debugTokenMustBeUuid4:true,
  commitTokenForbidden:true,
  printTokenForbidden:true,
  rawHttpCallableBypassForbidden:true,
  firebaseClientSdkRequired:true,
  persistenceEnabled:false,
  appDataWritesExpected:0,
  realDataAllowed:false,
  productionAllowed:false
});

function evaluateProofReceipt(input={}){
  const reasons=[];
  if(input.projectId!==TARGET.projectId) reasons.push('PROJECT_MISMATCH');
  if(input.webAppId!==TARGET.webAppId) reasons.push('WEB_APP_MISMATCH');
  if(input.deployedSourceSha!==TARGET.deployedSourceSha) reasons.push('DEPLOYED_SOURCE_SHA_MISMATCH');
  if(input.appCheckEnforced!==true) reasons.push('APP_CHECK_MUST_REMAIN_ENFORCED');
  if(input.firebaseClientSdkUsed!==true) reasons.push('FIREBASE_CLIENT_SDK_REQUIRED');
  if(input.syntheticOnly!==true) reasons.push('SYNTHETIC_ONLY_REQUIRED');
  if(input.persistenceEnabled!==false) reasons.push('PERSISTENCE_MUST_REMAIN_OFF');
  if(input.appDataWritesExecuted!==0) reasons.push('APP_DATA_WRITES_MUST_BE_ZERO');
  if(input.realDataUsed!==false) reasons.push('REAL_DATA_FORBIDDEN');
  if(input.productionTouched!==false) reasons.push('PRODUCTION_FORBIDDEN');

  const calls=Array.isArray(input.calls)?input.calls:[];
  const names=calls.map(x=>x&&x.name);
  if(JSON.stringify(names)!==JSON.stringify(FUNCTIONS)) reasons.push('CALLABLE_SEQUENCE_MISMATCH');
  if(calls.some(x=>!x || x.ok!==true)) reasons.push('ALL_CALLABLES_MUST_PASS');

  return Object.freeze({
    version:VERSION,
    ok:reasons.length===0,
    reasons,
    target:TARGET,
    security:SECURITY,
    releaseTruth:{
      validAppCheckSyntheticInvocationPass:reasons.length===0,
      persistenceReleased:false,
      writesReleased:false,
      realDataReleased:false,
      productionReleased:false
    }
  });
}

module.exports=Object.freeze({VERSION,TARGET,FUNCTIONS,SECURITY,evaluateProofReceipt});
