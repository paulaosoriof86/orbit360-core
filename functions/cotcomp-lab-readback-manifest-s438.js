'use strict';

const exportTicket = require('./cotcomp-runtime-export-ticket');
const proofPlan = require('./cotcomp-lab-no-write-proof-plan-s437');

const VERSION = 'ays-cotcomp-lab-readback-manifest-s438-v0.1';
const DEPLOYED = false;
const RUNTIME_VERIFIED = false;

function expectedManifest(){
  const proof=proofPlan.proposedRuntimeProofAssertions();
  return Object.freeze({
    projectId:exportTicket.TARGET.projectId,
    environment:exportTicket.TARGET.environment,
    region:exportTicket.TARGET.region,
    functionNames:proof.exactCallableSet.slice(),
    appCheck:proof.appCheck,
    replayProtection:proof.replayProtection,
    persistenceEnabled:false,
    writesExpected:0,
    syntheticOnly:true,
    productionTouched:false,
    dataTouched:false
  });
}

function validateReadback(input = {}){
  const expected=expectedManifest();
  const reasons=[];

  if(input.projectId!==expected.projectId) reasons.push('PROJECT_MISMATCH');
  if(input.environment!==expected.environment) reasons.push('ENVIRONMENT_MISMATCH');
  if(input.region!==expected.region) reasons.push('REGION_MISMATCH');

  const names=Array.isArray(input.functionNames)?input.functionNames:[];
  if(JSON.stringify(names)!==JSON.stringify(expected.functionNames)) reasons.push('FUNCTION_SET_MISMATCH');

  if(JSON.stringify(input.appCheck||{})!==JSON.stringify(expected.appCheck)) reasons.push('APP_CHECK_CONFIG_MISMATCH');
  if(JSON.stringify(input.replayProtection||{})!==JSON.stringify(expected.replayProtection)) reasons.push('REPLAY_CONFIG_MISMATCH');

  if(input.persistenceEnabled!==false) reasons.push('PERSISTENCE_MUST_BE_FALSE');
  if(input.writesExecuted!==0) reasons.push('WRITES_MUST_BE_ZERO');
  if(input.syntheticOnly!==true) reasons.push('SYNTHETIC_ONLY_REQUIRED');
  if(input.productionTouched!==false) reasons.push('PRODUCTION_TOUCH_FORBIDDEN');
  if(input.dataTouched!==false) reasons.push('DATA_TOUCH_FORBIDDEN');

  return {
    ok:reasons.length===0,
    reasons,
    expected,
    deployedByCode:DEPLOYED,
    runtimeVerifiedByCode:RUNTIME_VERIFIED
  };
}

module.exports=Object.freeze({
  VERSION,
  DEPLOYED,
  RUNTIME_VERIFIED,
  expectedManifest,
  validateReadback
});
