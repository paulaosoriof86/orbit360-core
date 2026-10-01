'use strict';

const fs=require('node:fs');
const path=require('node:path');
const stages=require('./cotcomp-write-release-stages-s443');
const governance=require('./cotcomp-governance-policy');
const legal=require('./cotcomp-legal-validation-evidence');
const completion=require('./cotcomp-completion-contract');

const VERSION='ays-cotcomp-w5-realdata-readiness-s457-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const REAL_DATA_ALLOWED=false;
const PRODUCTION_ALLOWED=false;

function currentLegalTruth(){
  const result=legal.evaluateFormalValidation();
  return Object.freeze({
    formalLegalValidationComplete:result.formalLegalValidationComplete===true,
    reasons:Object.freeze(result.reasons||[]),
    reviewedPolicyVersion:result.reviewedPolicyVersion,
    gtPacketComplete:!!(result.countries&&result.countries.GT&&result.countries.GT.ok),
    coPacketComplete:!!(result.countries&&result.countries.CO&&result.countries.CO.ok)
  });
}

function journeyInventory(){
  return Object.freeze(Object.keys(completion.FIELDS).map(journeyId=>Object.freeze({
    journeyId,
    country:journeyId.startsWith('GT_')?'GT':journeyId.startsWith('CO_')?'CO':'UNKNOWN',
    hasHealthSignal:/GASTOS_MEDICOS|SALUD|HEALTH/i.test(journeyId),
    contactFields:completion.FIELDS[journeyId].filter(x=>String(x.id||'').startsWith('contact.')).map(x=>x.id),
    consentFields:completion.FIELDS[journeyId].filter(x=>String(x.id||'').startsWith('consents.')).map(x=>x.id)
  })));
}

function audit(){
  const stage=stages.stage('W5');
  if(!stage)throw new Error('S457_W5_STAGE_MISSING');
  const legalTruth=currentLegalTruth();
  const journeys=journeyInventory();

  const governanceSource=fs.readFileSync(path.join(__dirname,'cotcomp-governance-policy.js'),'utf8');
  const legalSource=fs.readFileSync(path.join(__dirname,'cotcomp-legal-validation-evidence.js'),'utf8');

  const findings={
    w5Defined:stage.id==='W5'&&stage.name==='REAL_DATA_PILOT',
    w5StillHardClosed:stage.executableNow===false&&stage.writesAllowed===false&&stage.realDataAllowed===false,
    formalLegalValidationComplete:legalTruth.formalLegalValidationComplete,
    gtCounselPacketComplete:legalTruth.gtPacketComplete,
    coCounselPacketComplete:legalTruth.coPacketComplete,
    currentPolicyVersion:governance.VERSION,
    legalEvidenceBoundToCurrentPolicy:legalSource.includes('reviewedPolicyVersion:governance.VERSION'),
    ownerGovernancePolicyApproved:governance.OWNER_APPROVED===true,
    retentionStillPendingFormalLegalValidation:
      governance.RETENTION.DRAFT_INACTIVE.legalBasis==='INTERNAL_GOVERNANCE_PENDING_FORMAL_LEGAL_VALIDATION' &&
      governance.RETENTION.SUBMITTED_NOT_CONVERTED.legalBasis==='INTERNAL_GOVERNANCE_PENDING_FORMAL_LEGAL_VALIDATION',
    rawCaseAccessTokenPersistenceForbidden:governance.CASE_ACCESS.rawTokenPersistenceAllowed===false,
    marketingConsentSeparate:governance.CONSENT.requestManagementSeparateFromMarketing===true&&governance.CONSENT.marketingDefault===false,
    journeyCount:journeys.length,
    healthSensitiveJourneyPresent:journeys.some(x=>x.hasHealthSignal),
    exactPilotScopeContractPresent:false,
    singleExecutionGuardPresent:false,
    realDataMinimizationContractPresent:false,
    sanitizedObservabilityContractPresent:false,
    beforeImageRollbackContainmentContractPresent:false,
    successAbortCriteriaPresent:false,
    successPersistenceDispositionFrozen:false,
    providerProductionLockContractPresent:false
  };

  const blockers=[];
  if(!findings.formalLegalValidationComplete)blockers.push('FORMAL_LEGAL_VALIDATION_REQUIRED');
  blockers.push('W5_EXACT_PILOT_SCOPE_REQUIRED');
  blockers.push('W5_SINGLE_EXECUTION_GUARD_REQUIRED');
  blockers.push('W5_REAL_DATA_MINIMIZATION_REQUIRED');
  blockers.push('W5_SANITIZED_OBSERVABILITY_REQUIRED');
  blockers.push('W5_ROLLBACK_CONTAINMENT_REQUIRED');
  blockers.push('W5_SUCCESS_ABORT_CRITERIA_REQUIRED');
  blockers.push('W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED');
  blockers.push('W5_PROVIDER_PRODUCTION_LOCKS_REQUIRED');
  blockers.push('OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED');

  return Object.freeze({
    version:VERSION,
    sourceReadinessAuditPass:true,
    technicalW5Ready:false,
    executionAllowed:false,
    realDataAllowed:false,
    productionAllowed:false,
    legalTruth,
    journeys,
    findings:Object.freeze(findings),
    blockers:Object.freeze([...new Set(blockers)]),
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
  REAL_DATA_ALLOWED,PRODUCTION_ALLOWED,currentLegalTruth,journeyInventory,audit
});
