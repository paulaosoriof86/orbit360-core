'use strict';

const crypto=require('node:crypto');
const completion=require('./cotcomp-completion-contract');
const legal=require('./cotcomp-legal-validation-evidence');

const VERSION='ays-cotcomp-w5-pilot-contract-s458-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const REAL_DATA_ALLOWED=false;
const PRODUCTION_ALLOWED=false;

const ALLOWED_STAGES=Object.freeze(['W1','W2','W3','W4']);
const SUCCESS_DISPOSITIONS=Object.freeze(['ROLLBACK_TO_BEFORE_STATE','RETAIN_IF_VALID_BUSINESS_RECORD']);

function clean(v,max=400){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha256(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function validSha(v){return /^[a-f0-9]{64}$/i.test(clean(v,80));}
function journeyCountry(journeyId){return String(journeyId||'').startsWith('GT_')?'GT':String(journeyId||'').startsWith('CO_')?'CO':'UNKNOWN';}
function isHealthJourney(journeyId){return /GASTOS_MEDICOS|SALUD|HEALTH/i.test(String(journeyId||''));}

function validatePilotDescriptor(input={}){
  const reasons=[];
  if(input.projectId!==PROJECT_ID)reasons.push('PROJECT_NOT_LAB');
  if(input.tenantId!==TENANT_ID)reasons.push('TENANT_MISMATCH');

  const journeyId=clean(input.journeyId,180);
  const country=clean(input.country,8).toUpperCase();
  if(!Object.prototype.hasOwnProperty.call(completion.FIELDS,journeyId))reasons.push('JOURNEY_INVALID');
  if(!['GT','CO'].includes(country))reasons.push('COUNTRY_INVALID');
  if(journeyId&&country&&journeyCountry(journeyId)!==country)reasons.push('JOURNEY_COUNTRY_MISMATCH');

  const stages=Array.isArray(input.allowedStages)?[...new Set(input.allowedStages.map(x=>clean(x,8).toUpperCase()))]:[];
  if(!stages.length||stages.some(x=>!ALLOWED_STAGES.includes(x)))reasons.push('ALLOWED_STAGES_INVALID');

  if(input.maxQuoteCases!==1)reasons.push('SINGLE_QUOTECASE_REQUIRED');
  if(input.maxDataSubjects!==1)reasons.push('SINGLE_DATA_SUBJECT_REQUIRED');
  if(!Number.isInteger(input.maxExistingRecordsTouched)||input.maxExistingRecordsTouched<1||input.maxExistingRecordsTouched>12)reasons.push('MAX_EXISTING_RECORDS_INVALID');

  if(!validSha(input.caseSelectorCommitmentSha256))reasons.push('CASE_SELECTOR_COMMITMENT_REQUIRED');
  if(!validSha(input.actorSelectorCommitmentSha256))reasons.push('ACTOR_SELECTOR_COMMITMENT_REQUIRED');
  if(!validSha(input.requestManagementConsentEvidenceCommitmentSha256))reasons.push('CONSENT_EVIDENCE_COMMITMENT_REQUIRED');

  if(input.allowedExecutions!==1)reasons.push('SINGLE_EXECUTION_REQUIRED');
  if(input.consumed!==false)reasons.push('PILOT_MUST_BE_UNCONSUMED');

  if(!SUCCESS_DISPOSITIONS.includes(input.successDisposition))reasons.push('SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED');

  if(input.rawTokenPersistenceAllowed!==false)reasons.push('RAW_TOKEN_PERSISTENCE_FORBIDDEN');
  if(input.marketingConsentDefault!==false)reasons.push('MARKETING_DEFAULT_MUST_BE_FALSE');
  if(input.providerOrRaterCallsAllowed!==false)reasons.push('PROVIDER_RATER_CALLS_FORBIDDEN');
  if(input.productionAllowed!==false)reasons.push('PRODUCTION_FORBIDDEN');
  if(input.issuanceAllowed!==false)reasons.push('ISSUANCE_FORBIDDEN');
  if(input.bindingAllowed!==false)reasons.push('BINDING_FORBIDDEN');
  if(input.paymentAllowed!==false)reasons.push('PAYMENT_FORBIDDEN');

  const health=isHealthJourney(journeyId);
  if(health&&input.healthSensitiveDataAllowed!==true)reasons.push('HEALTH_SENSITIVE_DATA_EXPLICIT_ALLOWANCE_REQUIRED');
  if(health&&!validSha(input.healthLegalEvidenceCommitmentSha256))reasons.push('HEALTH_LEGAL_EVIDENCE_COMMITMENT_REQUIRED');
  if(!health&&input.healthSensitiveDataAllowed===true)reasons.push('HEALTH_ALLOWANCE_NOT_APPLICABLE');

  return {
    ok:reasons.length===0,
    reasons:Object.freeze(reasons),
    value:reasons.length?null:Object.freeze({
      schemaVersion:VERSION,
      projectId:PROJECT_ID,
      tenantId:TENANT_ID,
      country,
      journeyId,
      allowedStages:Object.freeze(stages),
      maxQuoteCases:1,
      maxDataSubjects:1,
      maxExistingRecordsTouched:input.maxExistingRecordsTouched,
      caseSelectorCommitmentSha256:clean(input.caseSelectorCommitmentSha256,80).toLowerCase(),
      actorSelectorCommitmentSha256:clean(input.actorSelectorCommitmentSha256,80).toLowerCase(),
      requestManagementConsentEvidenceCommitmentSha256:clean(input.requestManagementConsentEvidenceCommitmentSha256,80).toLowerCase(),
      allowedExecutions:1,
      consumed:false,
      successDisposition:input.successDisposition,
      healthSensitiveDataAllowed:input.healthSensitiveDataAllowed===true,
      healthLegalEvidenceCommitmentSha256:clean(input.healthLegalEvidenceCommitmentSha256,80).toLowerCase(),
      rawTokenPersistenceAllowed:false,
      marketingConsentDefault:false,
      providerOrRaterCallsAllowed:false,
      productionAllowed:false,
      issuanceAllowed:false,
      bindingAllowed:false,
      paymentAllowed:false
    })
  };
}

function technicalControlContract(){
  return Object.freeze({
    singleExecution:Object.freeze({
      required:true,
      allowedExecutions:1,
      consumedMustStartFalse:true,
      retryAfterConsumptionForbidden:true
    }),
    minimization:Object.freeze({
      maxQuoteCases:1,
      maxDataSubjects:1,
      rawPIIInRepositoryForbidden:true,
      rawPIIInUploadedEvidenceForbidden:true,
      rawCaseAccessTokenForbidden:true,
      marketingDefaultFalse:true,
      healthSensitiveDataDefaultAllowed:false
    }),
    observability:Object.freeze({
      evidenceContainsPII:false,
      evidenceContainsSecrets:false,
      rawRecordIdsInArtifactForbidden:true,
      selectorCommitmentsSha256Only:true,
      beforeAfterDigestsAllowed:true,
      mutationCountsRequired:true,
      abortReasonRequiredOnFailure:true
    }),
    rollbackContainment:Object.freeze({
      beforeStateDigestAnchorRequired:true,
      beforeImageMayExistOnlyEphemerallyDuringRun:true,
      beforeImageUploadForbidden:true,
      failureRequiresRollbackAttempt:true,
      rollbackVerificationRequired:true,
      unexpectedScopeExpansionRequiresAbort:true
    }),
    successAbort:Object.freeze({
      successRequiresAllDeclaredStageChecks:true,
      successRequiresNoForbiddenSideEffects:true,
      successRequiresExactScopeCounts:true,
      abortOnConsentEvidenceMismatch:true,
      abortOnCaseOrActorCommitmentMismatch:true,
      abortOnUnexpectedDocumentPath:true,
      abortOnProviderProductionIssuanceBindingPaymentPath:true
    }),
    hardLocks:Object.freeze({
      projectId:PROJECT_ID,
      tenantId:TENANT_ID,
      productionAllowed:false,
      providerOrRaterCallsAllowed:false,
      issuanceAllowed:false,
      bindingAllowed:false,
      paymentAllowed:false
    })
  });
}

function evaluateReadiness({descriptor,legalEvidence,ownerAuthorization}={}){
  const descriptorState=validatePilotDescriptor(descriptor||{});
  const legalState=legal.evaluateFormalValidation(legalEvidence||{});
  const reasons=[];

  if(!legalState.formalLegalValidationComplete)reasons.push('FORMAL_LEGAL_VALIDATION_REQUIRED');
  if(!descriptorState.ok)reasons.push('W5_EXACT_PILOT_SCOPE_REQUIRED');
  if(descriptorState.ok&&!SUCCESS_DISPOSITIONS.includes(descriptorState.value.successDisposition))reasons.push('W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED');
  if(ownerAuthorization!==true)reasons.push('OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED');

  return Object.freeze({
    version:VERSION,
    technicalContractReady:true,
    executionAllowed:reasons.length===0&&EXECUTION_ENABLED===true,
    realDataAllowed:false,
    productionAllowed:false,
    reasons:Object.freeze([...new Set(reasons)]),
    descriptor:descriptorState,
    legal:legalState,
    controls:technicalControlContract(),
    boundaries:Object.freeze({
      executionEnabled:EXECUTION_ENABLED,
      appDataReadsAllowed:APP_DATA_READS_ALLOWED,
      appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
      realDataAllowed:REAL_DATA_ALLOWED,
      productionAllowed:PRODUCTION_ALLOWED
    })
  });
}

function sourceReadiness(){
  const controls=technicalControlContract();
  const technicalPass=
    controls.singleExecution.allowedExecutions===1 &&
    controls.minimization.maxQuoteCases===1 &&
    controls.minimization.maxDataSubjects===1 &&
    controls.observability.evidenceContainsPII===false &&
    controls.rollbackContainment.failureRequiresRollbackAttempt===true &&
    controls.successAbort.abortOnUnexpectedDocumentPath===true &&
    controls.hardLocks.productionAllowed===false &&
    controls.hardLocks.providerOrRaterCallsAllowed===false;

  return Object.freeze({
    version:VERSION,
    sourceRemediationPass:technicalPass,
    technicalW5Ready:technicalPass,
    executionAllowed:false,
    realDataAllowed:false,
    remainingBlockers:Object.freeze([
      'FORMAL_LEGAL_VALIDATION_REQUIRED',
      'W5_EXACT_PILOT_SCOPE_REQUIRED',
      'W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED',
      'OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'
    ]),
    controls
  });
}

module.exports=Object.freeze({
  VERSION,PROJECT_ID,TENANT_ID,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,
  REAL_DATA_ALLOWED,PRODUCTION_ALLOWED,ALLOWED_STAGES,SUCCESS_DISPOSITIONS,
  sha256,validSha,journeyCountry,isHealthJourney,validatePilotDescriptor,
  technicalControlContract,evaluateReadiness,sourceReadiness
});
