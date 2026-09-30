'use strict';

const governance = require('./cotcomp-governance-policy');
const storage = require('./cotcomp-lab-storage-adapter-candidate');

const VERSION = 'ays-cotcomp-governance-readiness-s427-v0.1';
const RUNTIME_ENABLED = false;
const WRITES_ENABLED = false;
const DEPLOY_ALLOWED = false;

function evaluateGovernanceReadiness(input = {}){
  const reasons=[];

  if(input.governancePolicyVersion!==governance.VERSION) reasons.push('GOVERNANCE_POLICY_VERSION_MISMATCH');
  if(input.ownerGovernanceApproval!==true) reasons.push('OWNER_GOVERNANCE_APPROVAL_REQUIRED');
  if(input.formalLegalValidationComplete!==true) reasons.push('FORMAL_LEGAL_VALIDATION_REQUIRED');

  const governanceGate=governance.governanceGate({
    ownerApproval:input.ownerGovernanceApproval,
    legalValidationComplete:input.formalLegalValidationComplete
  });

  const retentionPolicyApproved=
    input.governancePolicyVersion===governance.VERSION &&
    input.ownerGovernanceApproval===true &&
    input.formalLegalValidationComplete===true;

  const caseAccessPersistenceApproved=retentionPolicyApproved;

  const storageGate=storage.evaluateReadiness({
    projectId:input.projectId,
    environment:input.environment,
    tenantId:input.tenantId,
    workflowStorageMode:input.workflowStorageMode,
    workflowOwnerBlobDeployed:input.workflowOwnerBlobDeployed,
    retentionPolicyApproved,
    caseAccessPersistenceApproved,
    negativeSecurityQaPass:input.negativeSecurityQaPass,
    ownerWriteAuthorization:input.ownerWriteAuthorization,
    deployAuthorization:input.deployAuthorization
  });

  if(storageGate.reasons.includes('WORKFLOW_SCHEMA_NOT_DEPLOYED')) reasons.push('WORKFLOW_SCHEMA_DEPLOY_PROOF_REQUIRED');
  if(storageGate.reasons.includes('NEGATIVE_SECURITY_QA_REQUIRED')) reasons.push('NEGATIVE_SECURITY_QA_REQUIRED');
  if(storageGate.reasons.includes('OWNER_WRITE_AUTHORIZATION_REQUIRED')) reasons.push('OWNER_WRITE_AUTHORIZATION_REQUIRED');
  if(storageGate.reasons.includes('DEPLOY_AUTHORIZATION_REQUIRED')) reasons.push('DEPLOY_AUTHORIZATION_REQUIRED');

  return {
    version:VERSION,
    ok:reasons.length===0,
    reasons:[...new Set(reasons)],
    governancePolicyVersion:governance.VERSION,
    ownerPolicyApprovedByCode:governance.OWNER_APPROVED,
    formalLegalValidationCompleteByCode:governance.LEGAL_VALIDATION_COMPLETE,
    retentionPolicyApproved,
    caseAccessPersistenceApproved,
    governanceGate,
    storageGate,
    runtimeEnabledByCode:RUNTIME_ENABLED,
    writesEnabledByCode:WRITES_ENABLED,
    deployAllowedByCode:DEPLOY_ALLOWED,
    effectiveRuntimeAllowed:false
  };
}

function currentGovernanceSnapshot(){
  return Object.freeze({
    governancePolicyVersion:governance.VERSION,
    ownerApproved:governance.OWNER_APPROVED,
    formalLegalValidationComplete:governance.LEGAL_VALIDATION_COMPLETE,
    draftInactivityDays:governance.RETENTION.DRAFT_INACTIVE.inactivityDays,
    unconvertedRetentionMonths:governance.RETENTION.SUBMITTED_NOT_CONVERTED.retentionMonthsAfterClosureOrLastActivity,
    caseAccessLifetimeDays:governance.CASE_ACCESS.tokenLifetimeDays,
    rawTokenPersistenceAllowed:governance.CASE_ACCESS.rawTokenPersistenceAllowed,
    marketingConsentSeparate:governance.CONSENT.requestManagementSeparateFromMarketing
  });
}

module.exports=Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  WRITES_ENABLED,
  DEPLOY_ALLOWED,
  evaluateGovernanceReadiness,
  currentGovernanceSnapshot
});
