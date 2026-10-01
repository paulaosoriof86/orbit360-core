'use strict';

const candidate=require('./cotcomp-w5-pilot-candidate-s462');
const governance=require('./cotcomp-governance-policy');

const VERSION='ays-cotcomp-w5-owner-scope-approval-s463-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const REAL_DATA_ALLOWED=false;
const PRODUCTION_ALLOWED=false;

const OWNER_APPROVED_SCOPE=Object.freeze({
  approvalType:'W5_PILOT_SCOPE_AND_SUCCESS_DISPOSITION_ONLY',
  approvedAt:'2026-10-01',
  governancePolicyVersion:governance.VERSION,
  country:'GT',
  journeyId:'GT_AUTO_MOTO_HYBRID',
  allowedStages:Object.freeze(['W1','W2','W3','W4']),
  maxQuoteCases:1,
  maxDataSubjects:1,
  maxExistingRecordsTouched:8,
  allowedExecutions:1,
  successDisposition:'ROLLBACK_TO_BEFORE_STATE',
  healthSensitiveDataAllowed:false,
  realDataExecutionAuthorized:false,
  finalW5Authorization:false,
  ownerApprovalText:'Apruebo como alcance propuesto del primer piloto W5: Guatemala, GT_AUTO_MOTO_HYBRID, W1–W4, un QuoteCase, un titular, máximo 8 registros existentes, una ejecución y ROLLBACK_TO_BEFORE_STATE, manteniendo datos reales y ejecución W5 bloqueados hasta completar el gate jurídico y la autorización final.'
});

function evaluate(){
  const recommended=candidate.recommendedCandidate();
  const reasons=[];

  if(OWNER_APPROVED_SCOPE.country!==recommended.country)reasons.push('COUNTRY_MISMATCH');
  if(OWNER_APPROVED_SCOPE.journeyId!==recommended.journeyId)reasons.push('JOURNEY_MISMATCH');
  if(OWNER_APPROVED_SCOPE.allowedStages.join(',')!==recommended.allowedStages.join(','))reasons.push('STAGE_SCOPE_MISMATCH');
  if(OWNER_APPROVED_SCOPE.maxQuoteCases!==recommended.maxQuoteCases)reasons.push('QUOTECASE_SCOPE_MISMATCH');
  if(OWNER_APPROVED_SCOPE.maxDataSubjects!==recommended.maxDataSubjects)reasons.push('DATA_SUBJECT_SCOPE_MISMATCH');
  if(OWNER_APPROVED_SCOPE.maxExistingRecordsTouched!==recommended.maxExistingRecordsTouched)reasons.push('RECORD_SCOPE_MISMATCH');
  if(OWNER_APPROVED_SCOPE.successDisposition!==recommended.successDisposition)reasons.push('SUCCESS_DISPOSITION_MISMATCH');
  if(OWNER_APPROVED_SCOPE.healthSensitiveDataAllowed!==false)reasons.push('HEALTH_SCOPE_MUST_REMAIN_FALSE');
  if(OWNER_APPROVED_SCOPE.realDataExecutionAuthorized!==false)reasons.push('REAL_DATA_AUTHORIZATION_MUST_REMAIN_FALSE');
  if(OWNER_APPROVED_SCOPE.finalW5Authorization!==false)reasons.push('FINAL_W5_AUTHORIZATION_MUST_REMAIN_FALSE');

  const ownerScopeApproved=reasons.length===0;

  return Object.freeze({
    version:VERSION,
    ownerScopeApproved,
    ownerSuccessDispositionApproved:ownerScopeApproved,
    approvedScope:OWNER_APPROVED_SCOPE,
    executionBindingsReady:false,
    executionAllowed:false,
    realDataAllowed:false,
    productionAllowed:false,
    closedGates:Object.freeze(ownerScopeApproved?[
      'W5_BUSINESS_SCOPE_OWNER_APPROVED',
      'W5_SUCCESS_PERSISTENCE_DISPOSITION_APPROVED'
    ]:[]),
    remainingBlockers:Object.freeze([
      'FORMAL_LEGAL_VALIDATION_REQUIRED',
      'W5_CASE_SELECTOR_COMMITMENT_REQUIRED',
      'W5_ACTOR_SELECTOR_COMMITMENT_REQUIRED',
      'W5_CONSENT_EVIDENCE_COMMITMENT_REQUIRED',
      'OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'
    ]),
    reasons:Object.freeze(reasons),
    boundaries:Object.freeze({
      executionEnabled:EXECUTION_ENABLED,
      appDataReadsAllowed:APP_DATA_READS_ALLOWED,
      appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
      realDataAllowed:REAL_DATA_ALLOWED,
      productionAllowed:PRODUCTION_ALLOWED
    })
  });
}

module.exports=Object.freeze({
  VERSION,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,
  REAL_DATA_ALLOWED,PRODUCTION_ALLOWED,OWNER_APPROVED_SCOPE,evaluate
});
