'use strict';

const governanceReadiness = require('./cotcomp-governance-readiness');
const legalEvidence = require('./cotcomp-legal-validation-evidence');
const governance = require('./cotcomp-governance-policy');

const VERSION = 'ays-cotcomp-evidence-bound-readiness-s429-v0.1';
const RUNTIME_ENABLED = false;
const WRITES_ENABLED = false;
const DEPLOY_ALLOWED = false;

function evaluateEvidenceBoundReadiness(input = {}){
  const legal = legalEvidence.evaluateFormalValidation({
    gt:input.gtLegalPacket,
    co:input.coLegalPacket
  });

  const readiness = governanceReadiness.evaluateGovernanceReadiness({
    governancePolicyVersion:governance.VERSION,
    ownerGovernanceApproval:governance.OWNER_APPROVED,
    formalLegalValidationComplete:legal.formalLegalValidationComplete,
    projectId:input.projectId,
    environment:input.environment,
    tenantId:input.tenantId,
    workflowStorageMode:input.workflowStorageMode,
    workflowOwnerBlobDeployed:input.workflowOwnerBlobDeployed,
    negativeSecurityQaPass:input.negativeSecurityQaPass,
    ownerWriteAuthorization:input.ownerWriteAuthorization,
    deployAuthorization:input.deployAuthorization
  });

  const reasons=[...legal.reasons,...readiness.reasons];

  return {
    version:VERSION,
    ok:reasons.length===0,
    reasons:[...new Set(reasons)],
    formalLegalValidationComplete:legal.formalLegalValidationComplete,
    legalEvidence:legal,
    governanceReadiness:readiness,
    runtimeEnabledByCode:RUNTIME_ENABLED,
    writesEnabledByCode:WRITES_ENABLED,
    deployAllowedByCode:DEPLOY_ALLOWED,
    effectiveRuntimeAllowed:false
  };
}

function currentEvidenceStatus(){
  return Object.freeze({
    governancePolicyVersion:governance.VERSION,
    gtLegalPacketPresent:false,
    coLegalPacketPresent:false,
    formalLegalValidationComplete:false,
    evidenceSource:'NO_COUNSEL_PACKETS_RECORDED'
  });
}

module.exports=Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  WRITES_ENABLED,
  DEPLOY_ALLOWED,
  evaluateEvidenceBoundReadiness,
  currentEvidenceStatus
});
