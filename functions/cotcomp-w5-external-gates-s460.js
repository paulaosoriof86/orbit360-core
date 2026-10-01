'use strict';

const governance=require('./cotcomp-governance-policy');
const counsel=require('./cotcomp-counsel-packet-intake');
const legal=require('./cotcomp-legal-validation-evidence');
const pilot=require('./cotcomp-w5-pilot-contract-s458');

const VERSION='ays-cotcomp-w5-external-gates-s460-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const REAL_DATA_ALLOWED=false;
const PRODUCTION_ALLOWED=false;

function ownerDecisionTemplate(){
  return Object.freeze({
    schemaVersion:VERSION,
    projectId:pilot.PROJECT_ID,
    tenantId:pilot.TENANT_ID,
    governancePolicyVersion:governance.VERSION,
    country:null,
    journeyId:null,
    allowedStages:Object.freeze([]),
    maxExistingRecordsTouched:null,
    caseSelectorCommitmentSha256:null,
    actorSelectorCommitmentSha256:null,
    requestManagementConsentEvidenceCommitmentSha256:null,
    successDisposition:null,
    healthSensitiveDataAllowed:false,
    healthLegalEvidenceCommitmentSha256:null,
    formalLegalValidationReference:null,
    ownerW5RealDataAuthorization:false,
    hardLocks:Object.freeze({
      maxQuoteCases:1,
      maxDataSubjects:1,
      allowedExecutions:1,
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

function legalEvidenceRequirements(){
  return Object.freeze({
    governancePolicyVersion:governance.VERSION,
    countries:Object.freeze(['GT','CO']),
    perCountry:Object.freeze([
      'structurally valid formal legal packet',
      'formal document reference',
      'original file name',
      'SHA-256 document hash',
      'issuing organization',
      'issue date',
      'signed-or-official flag',
      'exact reviewed governance-policy version',
      'Owner acceptance bound to the same country + document hash',
      'explicit Owner acceptance of the country opinion'
    ]),
    bothCountriesRequiredByCurrentFrozenContract:true,
    publicResearchCannotSubstituteFormalCounselEvidence:true
  });
}

function currentExternalGateStatus(){
  const currentIntake=counsel.currentIntakeStatus();
  const currentLegal=legal.evaluateFormalValidation();
  return Object.freeze({
    governancePolicyVersion:governance.VERSION,
    gtCounselStatus:currentIntake.GT,
    coCounselStatus:currentIntake.CO,
    formalLegalValidationComplete:currentLegal.formalLegalValidationComplete===true,
    legalComplianceVerified:false,
    ownerDecisionPacketComplete:false,
    exactPilotScopeComplete:false,
    successDispositionChosen:false,
    ownerW5RealDataAuthorization:false,
    executionAllowed:false,
    blockers:Object.freeze([
      'FORMAL_LEGAL_VALIDATION_REQUIRED',
      'W5_EXACT_PILOT_SCOPE_REQUIRED',
      'W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED',
      'OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'
    ])
  });
}

function validateDecisionPacket(input={}){
  const hard={
    maxQuoteCases:1,
    maxDataSubjects:1,
    allowedExecutions:1,
    rawTokenPersistenceAllowed:false,
    marketingConsentDefault:false,
    providerOrRaterCallsAllowed:false,
    productionAllowed:false,
    issuanceAllowed:false,
    bindingAllowed:false,
    paymentAllowed:false
  };
  const descriptor=pilot.validatePilotDescriptor({
    projectId:pilot.PROJECT_ID,
    tenantId:pilot.TENANT_ID,
    country:input.country,
    journeyId:input.journeyId,
    allowedStages:input.allowedStages,
    maxQuoteCases:1,
    maxDataSubjects:1,
    maxExistingRecordsTouched:input.maxExistingRecordsTouched,
    caseSelectorCommitmentSha256:input.caseSelectorCommitmentSha256,
    actorSelectorCommitmentSha256:input.actorSelectorCommitmentSha256,
    requestManagementConsentEvidenceCommitmentSha256:input.requestManagementConsentEvidenceCommitmentSha256,
    allowedExecutions:1,
    consumed:false,
    successDisposition:input.successDisposition,
    healthSensitiveDataAllowed:input.healthSensitiveDataAllowed===true,
    healthLegalEvidenceCommitmentSha256:input.healthLegalEvidenceCommitmentSha256,
    ...hard
  });

  const reasons=[];
  if(!descriptor.ok)reasons.push(...descriptor.reasons);
  if(input.governancePolicyVersion!==governance.VERSION)reasons.push('GOVERNANCE_POLICY_VERSION_MISMATCH');
  if(input.formalLegalValidationComplete!==true)reasons.push('FORMAL_LEGAL_VALIDATION_REQUIRED');
  if(!String(input.formalLegalValidationReference||'').trim())reasons.push('FORMAL_LEGAL_VALIDATION_REFERENCE_REQUIRED');
  if(input.ownerW5RealDataAuthorization!==true)reasons.push('OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED');

  return Object.freeze({
    ok:reasons.length===0,
    reasons:Object.freeze([...new Set(reasons)]),
    descriptor:descriptor.ok?descriptor.value:null,
    executionAllowed:false,
    realDataAllowed:false,
    productionAllowed:false,
    note:'Validation may prove the packet complete; execution remains hard-disabled in S4.60.'
  });
}

function sourceReadiness(){
  const current=currentExternalGateStatus();
  const req=legalEvidenceRequirements();
  const template=ownerDecisionTemplate();

  const technicalPass=
    current.executionAllowed===false &&
    template.hardLocks.productionAllowed===false &&
    template.hardLocks.providerOrRaterCallsAllowed===false &&
    template.hardLocks.issuanceAllowed===false &&
    template.hardLocks.bindingAllowed===false &&
    template.hardLocks.paymentAllowed===false &&
    req.bothCountriesRequiredByCurrentFrozenContract===true &&
    req.publicResearchCannotSubstituteFormalCounselEvidence===true;

  return Object.freeze({
    version:VERSION,
    externalGatePackageReady:technicalPass,
    technicalW5Ready:true,
    executionAllowed:false,
    realDataAllowed:false,
    productionAllowed:false,
    current,
    template,
    legalEvidenceRequirements:req,
    nextHumanInputs:Object.freeze([
      'formal GT counsel evidence packet accepted under current policy version',
      'formal CO counsel evidence packet accepted under current policy version',
      'pilot country',
      'pilot journeyId',
      'allowed W1-W4 stages',
      'maximum existing record count',
      'case selector SHA-256 commitment',
      'authorized actor selector SHA-256 commitment',
      'request-management consent evidence SHA-256 commitment',
      'success disposition: ROLLBACK_TO_BEFORE_STATE or RETAIN_IF_VALID_BUSINESS_RECORD',
      'explicit Owner W5 real-data authorization after all prior gates are satisfied'
    ]),
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
  VERSION,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,REAL_DATA_ALLOWED,PRODUCTION_ALLOWED,
  ownerDecisionTemplate,legalEvidenceRequirements,currentExternalGateStatus,validateDecisionPacket,sourceReadiness
});
