'use strict';

const exportTicket = require('./cotcomp-runtime-export-ticket');
const proofPlan = require('./cotcomp-lab-no-write-proof-plan-s437');

const VERSION = 'ays-cotcomp-runtime-export-delta-s438-v0.1';
const APPLY_ALLOWED = false;
const DEPLOY_ALLOWED = false;
const WRITES_ALLOWED = false;

const FUTURE_MODULE = './cotcomp-runtime-entry-s438';
const FUTURE_EXPORTS = Object.freeze(proofPlan.EXPECTED_CALLABLES.slice());

function proposedBootstrapDelta(){
  return Object.freeze({
    action:'FUTURE_DIFF_ONLY',
    applyNow:false,
    targetFile:'functions/bootstrap.js',
    importModule:FUTURE_MODULE,
    exportNames:FUTURE_EXPORTS.slice(),
    projectId:exportTicket.TARGET.projectId,
    environment:exportTicket.TARGET.environment,
    region:exportTicket.TARGET.region
  });
}

function validateDelta(input = {}){
  const reasons=[];
  const expected=proposedBootstrapDelta();

  if(input.targetFile!==expected.targetFile) reasons.push('BOOTSTRAP_TARGET_MISMATCH');
  if(input.importModule!==expected.importModule) reasons.push('RUNTIME_MODULE_MISMATCH');

  const actual=Array.isArray(input.exportNames)?input.exportNames:[];
  if(JSON.stringify(actual)!==JSON.stringify(expected.exportNames)) reasons.push('CALLABLE_EXPORT_SET_MISMATCH');

  if(input.applyNow===true) reasons.push('APPLY_NOT_AUTHORIZED');
  if(input.deployRequested===true) reasons.push('DEPLOY_NOT_AUTHORIZED');
  if(input.writesEnabled===true) reasons.push('WRITES_MUST_REMAIN_DISABLED');

  return {
    ok:reasons.length===0,
    reasons,
    expected,
    applyAllowedByCode:APPLY_ALLOWED,
    deployAllowedByCode:DEPLOY_ALLOWED,
    writesAllowedByCode:WRITES_ALLOWED,
    effectiveApplyAllowed:false
  };
}

function assertApplyClosed(){
  const error=new Error('COTCOMP_RUNTIME_EXPORT_APPLY_DISABLED');
  error.code='COTCOMP_RUNTIME_EXPORT_APPLY_DISABLED';
  throw error;
}

module.exports=Object.freeze({
  VERSION,
  APPLY_ALLOWED,
  DEPLOY_ALLOWED,
  WRITES_ALLOWED,
  FUTURE_MODULE,
  FUTURE_EXPORTS,
  proposedBootstrapDelta,
  validateDelta,
  assertApplyClosed
});
