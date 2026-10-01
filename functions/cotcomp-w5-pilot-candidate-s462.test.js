'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w5-pilot-candidate-s462');
const pilot=require('./cotcomp-w5-pilot-contract-s458');

test('S4.62 remains source-only and cannot touch real data',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.REAL_DATA_ALLOWED,false);
  assert.equal(s.PRODUCTION_ALLOWED,false);
});

test('S4.62 recommends the non-health GT Auto/Moto full W1-W4 path',()=>{
  const r=s.evaluateCandidate();
  const c=r.recommendedCandidate;
  assert.equal(r.technicalRecommendationReady,true);
  assert.equal(c.country,'GT');
  assert.equal(c.journeyId,'GT_AUTO_MOTO_HYBRID');
  assert.deepEqual(c.allowedStages,['W1','W2','W3','W4']);
  assert.equal(c.healthSensitiveDataAllowed,false);
  assert.equal(c.maxQuoteCases,1);
  assert.equal(c.maxDataSubjects,1);
});

test('S4.62 recommends rollback for the first real-data pilot and never marks it Owner-approved',()=>{
  const c=s.recommendedCandidate();
  assert.equal(c.successDisposition,'ROLLBACK_TO_BEFORE_STATE');
  assert.equal(c.ownerApprovalState,'PROPOSED_NOT_APPROVED');
  assert.equal(c.ownerW5RealDataAuthorization,false);
});

test('S4.62 makes remaining external/Owner inputs explicit',()=>{
  const r=s.evaluateCandidate();
  for(const code of [
    'FORMAL_LEGAL_VALIDATION_REQUIRED',
    'W5_CASE_SELECTOR_COMMITMENT_REQUIRED',
    'W5_ACTOR_SELECTOR_COMMITMENT_REQUIRED',
    'W5_CONSENT_EVIDENCE_COMMITMENT_REQUIRED',
    'OWNER_W5_PILOT_SCOPE_APPROVAL_REQUIRED',
    'OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'
  ]) assert.ok(r.externalOrOwnerInputs.includes(code),code);
});

test('S4.62 can simulate a complete decision packet but still cannot execute',()=>{
  const h=v=>pilot.sha256(v);
  const p=s.simulateOwnerApprovedPacket({
    caseCommitment:h('case'),
    actorCommitment:h('actor'),
    consentCommitment:h('consent'),
    formalLegalValidationReference:'formal-validation-reference'
  });
  const r=s.validateWithoutExecuting(p);
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'));
  assert.equal(r.executionAllowed,false);
  assert.equal(r.realDataAllowed,false);
});
