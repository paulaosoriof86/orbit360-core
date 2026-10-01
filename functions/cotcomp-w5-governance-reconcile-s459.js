'use strict';

const exception=require('./cotcomp-owner-no-counsel-exception');
const evidence=require('./cotcomp-evidence-bound-readiness');
const pilot=require('./cotcomp-w5-pilot-contract-s458');

const VERSION='ays-cotcomp-w5-governance-reconcile-s459-v1.0';
const EXECUTION_ENABLED=false;
const APP_DATA_READS_ALLOWED=false;
const APP_DATA_WRITES_ALLOWED=false;
const REAL_DATA_ALLOWED=false;

function evaluate(){
  const owner=exception.currentException();
  const legal=evidence.currentEvidenceStatus();
  const pilotReadiness=pilot.sourceReadiness();

  const reasons=[];
  if(owner.realDataWritesAllowed!==false)reasons.push('OWNER_EXCEPTION_REALDATA_LOCK_REGRESSION');
  if(owner.productionReleaseAllowed!==false)reasons.push('OWNER_EXCEPTION_PRODUCTION_LOCK_REGRESSION');
  if(legal.formalLegalValidationComplete!==false)reasons.push('LEGAL_STATUS_UNEXPECTED');
  if(pilotReadiness.technicalW5Ready!==true)reasons.push('W5_TECHNICAL_CONTRACT_NOT_READY');

  return Object.freeze({
    version:VERSION,
    sourceReconciliationPass:reasons.length===0,
    ownerNoCounselException:Object.freeze({
      ownerNoCounselDecision:owner.ownerNoCounselDecision,
      legalComplianceVerified:owner.legalComplianceVerified,
      sourceOnlyAllowed:owner.sourceOnlyAllowed,
      labNoWritePreparationAllowed:owner.labNoWritePreparationAllowed,
      realDataWritesAllowed:owner.realDataWritesAllowed,
      productionReleaseAllowed:owner.productionReleaseAllowed
    }),
    legalEvidence:Object.freeze({
      gtLegalPacketPresent:legal.gtLegalPacketPresent,
      coLegalPacketPresent:legal.coLegalPacketPresent,
      formalLegalValidationComplete:legal.formalLegalValidationComplete,
      evidenceSource:legal.evidenceSource
    }),
    technicalW5Ready:pilotReadiness.technicalW5Ready,
    realDataPilotExecutionAllowed:false,
    noCounselExceptionCanAuthorizeW5RealData:false,
    remainingBlockers:Object.freeze([
      'FORMAL_LEGAL_VALIDATION_REQUIRED',
      'W5_EXACT_PILOT_SCOPE_REQUIRED',
      'W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED',
      'OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'
    ]),
    reasons:Object.freeze(reasons),
    boundaries:Object.freeze({
      executionEnabled:EXECUTION_ENABLED,
      appDataReadsAllowed:APP_DATA_READS_ALLOWED,
      appDataWritesAllowed:APP_DATA_WRITES_ALLOWED,
      realDataAllowed:REAL_DATA_ALLOWED,
      productionAllowed:false
    })
  });
}

module.exports=Object.freeze({VERSION,EXECUTION_ENABLED,APP_DATA_READS_ALLOWED,APP_DATA_WRITES_ALLOWED,REAL_DATA_ALLOWED,evaluate});
