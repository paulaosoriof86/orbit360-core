'use strict';

const exception = require('./cotcomp-owner-no-counsel-exception');
const governance = require('./cotcomp-governance-policy');
const storage = require('./cotcomp-lab-storage-adapter-candidate');

const VERSION = 'ays-cotcomp-owner-risk-dev-readiness-s435-v0.1';
const RUNTIME_ENABLED = false;
const WRITES_ENABLED = false;
const DEPLOY_ALLOWED = false;

function evaluateDevelopmentReadiness(input = {}){
  const owner=exception.evaluateOwnerException({
    policyVersion:input.policyVersion,
    ownerDecision:input.ownerDecision,
    ownerAcceptedRisk:input.ownerAcceptedRisk
  });

  const reasons=[];
  if(!owner.ok) reasons.push(...owner.reasons);
  if(input.negativeSecurityQaPass!==true) reasons.push('NEGATIVE_SECURITY_QA_REQUIRED');
  if(input.projectId!==storage.EXPECTED.projectId) reasons.push('PROJECT_NOT_LAB');
  if(input.environment!=='LAB') reasons.push('ENVIRONMENT_NOT_LAB');
  if(input.tenantId!==storage.EXPECTED.tenantId) reasons.push('TENANT_NOT_ALLOWED');

  const sourceOnlyContinuationAllowed=
    owner.ok &&
    input.negativeSecurityQaPass===true;

  const labNoWritePreparationAllowed=
    sourceOnlyContinuationAllowed &&
    input.projectId===storage.EXPECTED.projectId &&
    input.environment==='LAB' &&
    input.tenantId===storage.EXPECTED.tenantId;

  return {
    version:VERSION,
    ok:sourceOnlyContinuationAllowed,
    reasons:[...new Set(reasons)],
    governancePolicyVersion:governance.VERSION,
    legalComplianceVerified:false,
    formalCounselRequiredForThisDevelopmentPath:false,
    sourceOnlyContinuationAllowed,
    labNoWritePreparationAllowed,
    labDeployExecutionAllowed:false,
    realDataWritesAllowed:false,
    productionReleaseAllowed:false,
    runtimeEnabledByCode:RUNTIME_ENABLED,
    writesEnabledByCode:WRITES_ENABLED,
    deployAllowedByCode:DEPLOY_ALLOWED,
    effectiveRuntimeAllowed:false
  };
}

function currentDevelopmentStatus(){
  return Object.freeze({
    governancePolicyVersion:governance.VERSION,
    ownerNoCounselDecision:true,
    legalComplianceVerified:false,
    negativeSecurityQaPass:true,
    sourceOnlyContinuationAllowed:true,
    labNoWritePreparationAllowed:true,
    labDeployExecutionAllowed:false,
    realDataWritesAllowed:false,
    productionReleaseAllowed:false
  });
}

module.exports=Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  WRITES_ENABLED,
  DEPLOY_ALLOWED,
  evaluateDevelopmentReadiness,
  currentDevelopmentStatus
});
