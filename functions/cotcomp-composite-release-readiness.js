'use strict';

const intake = require('./cotcomp-counsel-packet-intake');
const deployEvidence = require('./cotcomp-lab-deploy-evidence');

const VERSION = 'ays-cotcomp-composite-release-readiness-s433-v0.1';
const RUNTIME_ENABLED = false;
const WRITES_ENABLED = false;
const DEPLOY_ALLOWED = false;

function evaluateCompositeReadiness(input = {}){
  const legal=intake.evaluateDualCountryIntake({
    gt:input.gtCounselSubmission,
    co:input.coCounselSubmission,
    readinessInput:{
      projectId:input.projectId,
      environment:input.environment,
      tenantId:input.tenantId,
      workflowStorageMode:input.workflowStorageMode,
      workflowOwnerBlobDeployed:input.workflowOwnerBlobDeployed,
      negativeSecurityQaPass:input.negativeSecurityQaPass,
      ownerWriteAuthorization:input.ownerWriteAuthorization,
      deployAuthorization:input.deployAuthorization
    }
  });

  const deploy=deployEvidence.validateLabDeployEvidence(input.labDeployEvidence||{});
  const reasons=[];

  if(!legal.formalLegalValidationComplete) reasons.push('FORMAL_LEGAL_VALIDATION_REQUIRED');
  if(!deploy.ok) reasons.push('LAB_DEPLOY_EVIDENCE_REQUIRED');
  if(input.negativeSecurityQaPass!==true) reasons.push('NEGATIVE_SECURITY_QA_REQUIRED');
  if(input.ownerWriteAuthorization!==true) reasons.push('OWNER_WRITE_AUTHORIZATION_REQUIRED');
  if(input.deployAuthorization!==true) reasons.push('DEPLOY_AUTHORIZATION_REQUIRED');

  return {
    version:VERSION,
    ok:reasons.length===0,
    reasons:[...new Set(reasons)],
    legal,
    deploy,
    negativeSecurityQaPass:input.negativeSecurityQaPass===true,
    ownerWriteAuthorization:input.ownerWriteAuthorization===true,
    deployAuthorization:input.deployAuthorization===true,
    runtimeEnabledByCode:RUNTIME_ENABLED,
    writesEnabledByCode:WRITES_ENABLED,
    deployAllowedByCode:DEPLOY_ALLOWED,
    effectiveRuntimeAllowed:false
  };
}

function currentCompositeStatus(){
  return Object.freeze({
    formalLegalValidationComplete:false,
    cotcompLabDeployEvidencePresent:false,
    negativeSecurityQaPass:true,
    ownerWriteAuthorization:false,
    deployAuthorization:false,
    effectiveRuntimeAllowed:false
  });
}

module.exports=Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  WRITES_ENABLED,
  DEPLOY_ALLOWED,
  evaluateCompositeReadiness,
  currentCompositeStatus
});
