'use strict';

const pilot=require('./cotcomp-w5-pilot-contract-s458');
const external=require('./cotcomp-w5-external-gates-s460');
const governance=require('./cotcomp-governance-policy');

const VERSION='ays-cotcomp-w5-pilot-candidate-s462-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const REAL_DATA_ALLOWED=false;
const PRODUCTION_ALLOWED=false;

const RECOMMENDED=Object.freeze({
  rationale:'Use the lowest-risk non-health journey already proven through W1-W4 physical synthetic gates; first real-data pilot should roll back to before-state even on technical success.',
  country:'GT',
  journeyId:'GT_AUTO_MOTO_HYBRID',
  allowedStages:Object.freeze(['W1','W2','W3','W4']),
  maxQuoteCases:1,
  maxDataSubjects:1,
  maxExistingRecordsTouched:8,
  successDisposition:'ROLLBACK_TO_BEFORE_STATE',
  healthSensitiveDataAllowed:false,
  providerOrRaterCallsAllowed:false,
  productionAllowed:false,
  issuanceAllowed:false,
  bindingAllowed:false,
  paymentAllowed:false
});

function recommendedCandidate(){
  return Object.freeze({
    schemaVersion:VERSION,
    projectId:pilot.PROJECT_ID,
    tenantId:pilot.TENANT_ID,
    governancePolicyVersion:governance.VERSION,
    ownerApprovalState:'PROPOSED_NOT_APPROVED',
    country:RECOMMENDED.country,
    journeyId:RECOMMENDED.journeyId,
    allowedStages:RECOMMENDED.allowedStages,
    maxQuoteCases:RECOMMENDED.maxQuoteCases,
    maxDataSubjects:RECOMMENDED.maxDataSubjects,
    maxExistingRecordsTouched:RECOMMENDED.maxExistingRecordsTouched,
    successDisposition:RECOMMENDED.successDisposition,
    healthSensitiveDataAllowed:RECOMMENDED.healthSensitiveDataAllowed,
    caseSelectorCommitmentSha256:null,
    actorSelectorCommitmentSha256:null,
    requestManagementConsentEvidenceCommitmentSha256:null,
    formalLegalValidationReference:null,
    formalLegalValidationComplete:false,
    ownerW5RealDataAuthorization:false,
    hardLocks:Object.freeze({
      rawTokenPersistenceAllowed:false,
      marketingConsentDefault:false,
      providerOrRaterCallsAllowed:false,
      productionAllowed:false,
      issuanceAllowed:false,
      bindingAllowed:false,
      paymentAllowed:false
    })
  });
}

function evaluateCandidate(){
  const c=recommendedCandidate();
  const humanInputs=[];
  if(!c.formalLegalValidationComplete)humanInputs.push('FORMAL_LEGAL_VALIDATION_REQUIRED');
  if(!c.caseSelectorCommitmentSha256)humanInputs.push('W5_CASE_SELECTOR_COMMITMENT_REQUIRED');
  if(!c.actorSelectorCommitmentSha256)humanInputs.push('W5_ACTOR_SELECTOR_COMMITMENT_REQUIRED');
  if(!c.requestManagementConsentEvidenceCommitmentSha256)humanInputs.push('W5_CONSENT_EVIDENCE_COMMITMENT_REQUIRED');
  if(c.ownerApprovalState!=='APPROVED')humanInputs.push('OWNER_W5_PILOT_SCOPE_APPROVAL_REQUIRED');
  if(c.ownerW5RealDataAuthorization!==true)humanInputs.push('OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED');

  const scopeStructurallyRecommended=
    c.country==='GT' &&
    c.journeyId==='GT_AUTO_MOTO_HYBRID' &&
    c.allowedStages.join(',')==='W1,W2,W3,W4' &&
    c.maxQuoteCases===1 &&
    c.maxDataSubjects===1 &&
    c.maxExistingRecordsTouched===8 &&
    c.successDisposition==='ROLLBACK_TO_BEFORE_STATE' &&
    c.healthSensitiveDataAllowed===false;

  return Object.freeze({
    version:VERSION,
    technicalRecommendationReady:scopeStructurallyRecommended,
    recommendedCandidate:c,
    recommendedRationale:RECOMMENDED.rationale,
    externalOrOwnerInputs:Object.freeze(humanInputs),
    executionAllowed:false,
    realDataAllowed:false,
    productionAllowed:false,
    boundaries:Object.freeze({
      executionEnabled:EXECUTION_ENABLED,
      appDataReadsAllowed:APP_DATA_READS_ALLOWED,
      appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
      realDataAllowed:REAL_DATA_ALLOWED,
      productionAllowed:PRODUCTION_ALLOWED
    })
  });
}

function simulateOwnerApprovedPacket({caseCommitment,actorCommitment,consentCommitment,formalLegalValidationReference}={}){
  const c=recommendedCandidate();
  return Object.freeze({
    ...c,
    ownerApprovalState:'APPROVED',
    caseSelectorCommitmentSha256:caseCommitment||null,
    actorSelectorCommitmentSha256:actorCommitment||null,
    requestManagementConsentEvidenceCommitmentSha256:consentCommitment||null,
    formalLegalValidationReference:formalLegalValidationReference||null,
    formalLegalValidationComplete:!!formalLegalValidationReference,
    ownerW5RealDataAuthorization:false
  });
}

function validateWithoutExecuting(packet){
  return external.validateDecisionPacket({
    governancePolicyVersion:packet.governancePolicyVersion,
    country:packet.country,
    journeyId:packet.journeyId,
    allowedStages:packet.allowedStages,
    maxExistingRecordsTouched:packet.maxExistingRecordsTouched,
    caseSelectorCommitmentSha256:packet.caseSelectorCommitmentSha256,
    actorSelectorCommitmentSha256:packet.actorSelectorCommitmentSha256,
    requestManagementConsentEvidenceCommitmentSha256:packet.requestManagementConsentEvidenceCommitmentSha256,
    successDisposition:packet.successDisposition,
    healthSensitiveDataAllowed:packet.healthSensitiveDataAllowed,
    formalLegalValidationComplete:packet.formalLegalValidationComplete,
    formalLegalValidationReference:packet.formalLegalValidationReference,
    ownerW5RealDataAuthorization:packet.ownerW5RealDataAuthorization
  });
}

module.exports=Object.freeze({
  VERSION,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,REAL_DATA_ALLOWED,PRODUCTION_ALLOWED,
  RECOMMENDED,recommendedCandidate,evaluateCandidate,simulateOwnerApprovedPacket,validateWithoutExecuting
});
