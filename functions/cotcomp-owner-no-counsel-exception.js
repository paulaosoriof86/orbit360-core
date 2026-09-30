'use strict';

const governance = require('./cotcomp-governance-policy');

const VERSION = 'ays-cotcomp-owner-no-counsel-exception-s434-v1.0';

const OWNER_DECISION = 'PROCEED_WITHOUT_FORMAL_COUNSEL_OPINION';
const OWNER_DECISION_DATE = '2026-09-30';
const OWNER_WAIVES_FORMAL_COUNSEL = true;
const LEGAL_COMPLIANCE_VERIFIED = false;

const SOURCE_ONLY_ALLOWED = true;
const LAB_NO_WRITE_PREPARATION_ALLOWED = true;
const REAL_DATA_WRITES_ALLOWED = false;
const PRODUCTION_RELEASE_ALLOWED = false;

const RUNTIME_ENABLED = false;
const WRITES_ENABLED = false;
const DEPLOY_ALLOWED = false;

function evaluateOwnerException(input = {}){
  const reasons=[];

  if(input.policyVersion!==governance.VERSION) reasons.push('POLICY_VERSION_MISMATCH');
  if(input.ownerDecision!==OWNER_DECISION) reasons.push('OWNER_NO_COUNSEL_DECISION_REQUIRED');
  if(input.ownerAcceptedRisk!==true) reasons.push('OWNER_RISK_ACCEPTANCE_REQUIRED');

  return {
    version:VERSION,
    ok:reasons.length===0,
    reasons,
    policyVersion:governance.VERSION,
    ownerDecision:OWNER_DECISION,
    ownerWaivesFormalCounsel:OWNER_WAIVES_FORMAL_COUNSEL,
    legalComplianceVerified:LEGAL_COMPLIANCE_VERIFIED,
    sourceOnlyAllowed:SOURCE_ONLY_ALLOWED,
    labNoWritePreparationAllowed:LAB_NO_WRITE_PREPARATION_ALLOWED,
    realDataWritesAllowed:REAL_DATA_WRITES_ALLOWED,
    productionReleaseAllowed:PRODUCTION_RELEASE_ALLOWED,
    runtimeEnabled:RUNTIME_ENABLED,
    writesEnabled:WRITES_ENABLED,
    deployAllowed:DEPLOY_ALLOWED,
    effectiveRuntimeAllowed:false
  };
}

function currentException(){
  return Object.freeze({
    version:VERSION,
    policyVersion:governance.VERSION,
    ownerDecision:OWNER_DECISION,
    ownerDecisionDate:OWNER_DECISION_DATE,
    ownerWaivesFormalCounsel:true,
    ownerAcceptedRisk:true,
    legalComplianceVerified:false,
    formalCounselPathStatus:'WAIVED_BY_OWNER',
    sourceOnlyAllowed:true,
    labNoWritePreparationAllowed:true,
    realDataWritesAllowed:false,
    productionReleaseAllowed:false
  });
}

module.exports=Object.freeze({
  VERSION,
  OWNER_DECISION,
  OWNER_DECISION_DATE,
  OWNER_WAIVES_FORMAL_COUNSEL,
  LEGAL_COMPLIANCE_VERIFIED,
  SOURCE_ONLY_ALLOWED,
  LAB_NO_WRITE_PREPARATION_ALLOWED,
  REAL_DATA_WRITES_ALLOWED,
  PRODUCTION_RELEASE_ALLOWED,
  RUNTIME_ENABLED,
  WRITES_ENABLED,
  DEPLOY_ALLOWED,
  evaluateOwnerException,
  currentException
});
