'use strict';

const VERSION='ays-cotcomp-replay-verifier-iam-s442-v1.0';

const TARGET=Object.freeze({
  projectId:'ays-orbit-360-lab',
  functionName:'cotcompSubmitHandoff',
  region:'us-central1',
  runtimeServiceAccount:'orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com',
  requiredRole:'roles/firebaseappcheck.tokenVerifier',
  requiredPermission:'firebaseappcheck.appCheckTokens.verify'
});

function evaluate(input={}){
  const reasons=[];
  if(input.projectId!==TARGET.projectId) reasons.push('PROJECT_MISMATCH');
  if(input.functionName!==TARGET.functionName) reasons.push('FUNCTION_MISMATCH');
  if(input.runtimeServiceAccount!==TARGET.runtimeServiceAccount) reasons.push('RUNTIME_SERVICE_ACCOUNT_MISMATCH');
  if(input.role!==TARGET.requiredRole) reasons.push('ROLE_NOT_LEAST_PRIVILEGE_TOKEN_VERIFIER');
  if(input.productionTouched===true) reasons.push('PRODUCTION_FORBIDDEN');
  if(input.appDataWritesExecuted!==0) reasons.push('APP_DATA_WRITES_MUST_BE_ZERO');
  if(input.deployExecuted===true) reasons.push('DEPLOY_FORBIDDEN');

  return Object.freeze({
    version:VERSION,
    ok:reasons.length===0,
    reasons,
    target:TARGET,
    leastPrivilege:true,
    appCheckWeakening:false,
    persistenceReleased:false,
    productionReleased:false
  });
}

module.exports=Object.freeze({VERSION,TARGET,evaluate});
