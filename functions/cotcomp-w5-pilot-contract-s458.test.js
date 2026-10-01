'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w5-pilot-contract-s458');

function commitment(v){return s.sha256(v);}

function descriptor(overrides={}){
  return Object.assign({
    projectId:'ays-orbit-360-lab',
    tenantId:'alianzas-soluciones',
    country:'GT',
    journeyId:'GT_AUTO_MOTO_HYBRID',
    allowedStages:['W1','W2','W3','W4'],
    maxQuoteCases:1,
    maxDataSubjects:1,
    maxExistingRecordsTouched:8,
    caseSelectorCommitmentSha256:commitment('case'),
    actorSelectorCommitmentSha256:commitment('actor'),
    requestManagementConsentEvidenceCommitmentSha256:commitment('consent'),
    allowedExecutions:1,
    consumed:false,
    successDisposition:'ROLLBACK_TO_BEFORE_STATE',
    healthSensitiveDataAllowed:false,
    healthLegalEvidenceCommitmentSha256:'',
    rawTokenPersistenceAllowed:false,
    marketingConsentDefault:false,
    providerOrRaterCallsAllowed:false,
    productionAllowed:false,
    issuanceAllowed:false,
    bindingAllowed:false,
    paymentAllowed:false
  },overrides);
}

test('S4.58 remains hard-closed to real data and production',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.REAL_DATA_ALLOWED,false);
  assert.equal(s.PRODUCTION_ALLOWED,false);
});

test('S4.58 exact non-health single-case descriptor passes structurally',()=>{
  const r=s.validatePilotDescriptor(descriptor());
  assert.equal(r.ok,true);
  assert.equal(r.value.maxQuoteCases,1);
  assert.equal(r.value.maxDataSubjects,1);
  assert.equal(r.value.allowedExecutions,1);
  assert.equal(r.value.providerOrRaterCallsAllowed,false);
  assert.equal(r.value.productionAllowed,false);
});

test('S4.58 rejects scope expansion, raw-token/marketing/provider/production side effects',()=>{
  const r=s.validatePilotDescriptor(descriptor({
    maxQuoteCases:2,
    rawTokenPersistenceAllowed:true,
    marketingConsentDefault:true,
    providerOrRaterCallsAllowed:true,
    productionAllowed:true
  }));
  assert.equal(r.ok,false);
  for(const code of [
    'SINGLE_QUOTECASE_REQUIRED','RAW_TOKEN_PERSISTENCE_FORBIDDEN',
    'MARKETING_DEFAULT_MUST_BE_FALSE','PROVIDER_RATER_CALLS_FORBIDDEN','PRODUCTION_FORBIDDEN'
  ])assert.ok(r.reasons.includes(code),code);
});

test('S4.58 health journey requires explicit allowance plus legal evidence commitment',()=>{
  const blocked=s.validatePilotDescriptor(descriptor({
    journeyId:'GT_GASTOS_MEDICOS_HYBRID',
    healthSensitiveDataAllowed:false
  }));
  assert.equal(blocked.ok,false);
  assert.ok(blocked.reasons.includes('HEALTH_SENSITIVE_DATA_EXPLICIT_ALLOWANCE_REQUIRED'));
  assert.ok(blocked.reasons.includes('HEALTH_LEGAL_EVIDENCE_COMMITMENT_REQUIRED'));

  const allowed=s.validatePilotDescriptor(descriptor({
    journeyId:'GT_GASTOS_MEDICOS_HYBRID',
    healthSensitiveDataAllowed:true,
    healthLegalEvidenceCommitmentSha256:commitment('formal-health-legal-evidence')
  }));
  assert.equal(allowed.ok,true);
});

test('S4.58 technical control contract freezes sanitization, rollback and abort rules',()=>{
  const c=s.technicalControlContract();
  assert.equal(c.observability.evidenceContainsPII,false);
  assert.equal(c.observability.evidenceContainsSecrets,false);
  assert.equal(c.observability.rawRecordIdsInArtifactForbidden,true);
  assert.equal(c.rollbackContainment.beforeImageUploadForbidden,true);
  assert.equal(c.rollbackContainment.failureRequiresRollbackAttempt,true);
  assert.equal(c.successAbort.abortOnUnexpectedDocumentPath,true);
  assert.equal(c.hardLocks.issuanceAllowed,false);
  assert.equal(c.hardLocks.bindingAllowed,false);
  assert.equal(c.hardLocks.paymentAllowed,false);
});

test('S4.58 source remediation closes technical W5 gaps but leaves external gates',()=>{
  const r=s.sourceReadiness();
  assert.equal(r.sourceRemediationPass,true);
  assert.equal(r.technicalW5Ready,true);
  assert.equal(r.executionAllowed,false);
  assert.equal(r.realDataAllowed,false);
  assert.deepEqual(r.remainingBlockers,[
    'FORMAL_LEGAL_VALIDATION_REQUIRED',
    'W5_EXACT_PILOT_SCOPE_REQUIRED',
    'W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED',
    'OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'
  ]);
});

test('S4.58 current readiness remains blocked with no counsel packets, no descriptor and no Owner auth',()=>{
  const r=s.evaluateReadiness();
  assert.equal(r.executionAllowed,false);
  assert.ok(r.reasons.includes('FORMAL_LEGAL_VALIDATION_REQUIRED'));
  assert.ok(r.reasons.includes('W5_EXACT_PILOT_SCOPE_REQUIRED'));
  assert.ok(r.reasons.includes('OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'));
});
