'use strict';

const exportTicket = require('./cotcomp-runtime-export-ticket');
const runtimeEntry = require('./cotcomp-runtime-entry-candidate');
const ownerRisk = require('./cotcomp-owner-risk-dev-readiness');

const VERSION = 'ays-cotcomp-lab-no-write-proof-plan-s437-v0.1';
const EXECUTION_ALLOWED = false;
const DEPLOY_EXECUTION_ALLOWED = false;
const WRITES_ALLOWED = false;
const REAL_DATA_ALLOWED = false;

const EXPECTED_CALLABLES = Object.freeze([
  'cotcompValidateDraft',
  'cotcompSubmitHandoff',
  'cotcompFetchComparableProposals',
  'cotcompSelectProposal'
]);

const PHASES = Object.freeze([
  'SOURCE_IDENTITY',
  'BUILD_AND_ARTIFACT',
  'EXPORT_SHAPE_READBACK',
  'LAB_DEPLOY_IF_SEPARATELY_AUTHORIZED',
  'RUNTIME_READBACK',
  'ZERO_WRITE_SECURITY_SMOKE',
  'EVIDENCE_RECEIPT'
]);

function clean(v,max=500){
  return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);
}

function buildProofPlan(input = {}){
  const reasons=[];

  if(input.projectId!==exportTicket.TARGET.projectId) reasons.push('PROJECT_NOT_LAB');
  if(input.environment!==exportTicket.TARGET.environment) reasons.push('ENVIRONMENT_NOT_LAB');
  if(input.tenantId!=='alianzas-soluciones') reasons.push('TENANT_NOT_ALLOWED');
  if(!/^[a-f0-9]{40}$/i.test(clean(input.sourceSha,80))) reasons.push('SOURCE_SHA_REQUIRED');
  if(input.negativeSecurityQaPass!==true) reasons.push('NEGATIVE_SECURITY_QA_REQUIRED');
  if(input.persistenceEnabled===true) reasons.push('PERSISTENCE_MUST_REMAIN_DISABLED');

  const dev=ownerRisk.evaluateDevelopmentReadiness({
    policyVersion:input.policyVersion,
    ownerDecision:input.ownerDecision,
    ownerAcceptedRisk:input.ownerAcceptedRisk,
    negativeSecurityQaPass:input.negativeSecurityQaPass,
    projectId:input.projectId,
    environment:input.environment,
    tenantId:input.tenantId
  });

  if(!dev.sourceOnlyContinuationAllowed) reasons.push('SOURCE_ONLY_CONTINUATION_NOT_ALLOWED');
  if(!dev.labNoWritePreparationAllowed) reasons.push('LAB_NO_WRITE_PREPARATION_NOT_ALLOWED');

  const callables=runtimeEntry.previewCallableShape();

  return {
    version:VERSION,
    ok:reasons.length===0,
    reasons:[...new Set(reasons)],
    target:{
      projectId:exportTicket.TARGET.projectId,
      environment:exportTicket.TARGET.environment,
      region:exportTicket.TARGET.region,
      tenantId:'alianzas-soluciones'
    },
    sourceSha:clean(input.sourceSha,80),
    callables,
    callablesExact:JSON.stringify(callables)===JSON.stringify(EXPECTED_CALLABLES),
    phases:PHASES.slice(),
    requiredEvidence:{
      sourceSha:true,
      sourceTree:true,
      artifactId:true,
      artifactDigest:true,
      backendSourceDigest:true,
      exactFunctionSet:true,
      appCheckSettings:true,
      replayProtectionSettings:true,
      readbackExact:true,
      writesExecutedZero:true,
      syntheticOnly:true,
      productionTouchedFalse:true,
      dataTouchedFalse:true
    },
    executionAllowed:EXECUTION_ALLOWED,
    deployExecutionAllowed:DEPLOY_EXECUTION_ALLOWED,
    writesAllowed:WRITES_ALLOWED,
    realDataAllowed:REAL_DATA_ALLOWED,
    effectiveDeployAllowed:false
  };
}

function proposedRuntimeProofAssertions(){
  return Object.freeze({
    exactCallableSet:EXPECTED_CALLABLES.slice(),
    appCheck:{
      cotcompValidateDraft:true,
      cotcompSubmitHandoff:true,
      cotcompFetchComparableProposals:true,
      cotcompSelectProposal:true
    },
    replayProtection:{
      cotcompValidateDraft:false,
      cotcompSubmitHandoff:true,
      cotcompFetchComparableProposals:false,
      cotcompSelectProposal:true
    },
    persistenceEnabled:false,
    writesExecuted:0,
    syntheticOnly:true,
    productionTouched:false,
    dataTouched:false
  });
}

function assertExecutionClosed(){
  const error=new Error('COTCOMP_LAB_PROOF_PLAN_EXECUTION_DISABLED');
  error.code='COTCOMP_LAB_PROOF_PLAN_EXECUTION_DISABLED';
  throw error;
}

module.exports=Object.freeze({
  VERSION,
  EXECUTION_ALLOWED,
  DEPLOY_EXECUTION_ALLOWED,
  WRITES_ALLOWED,
  REAL_DATA_ALLOWED,
  EXPECTED_CALLABLES,
  PHASES,
  buildProofPlan,
  proposedRuntimeProofAssertions,
  assertExecutionClosed
});
