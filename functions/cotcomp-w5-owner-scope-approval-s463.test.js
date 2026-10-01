'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w5-owner-scope-approval-s463');

test('S4.63 records Owner scope approval without enabling execution',()=>{
  const r=s.evaluate();
  assert.equal(r.ownerScopeApproved,true);
  assert.equal(r.ownerSuccessDispositionApproved,true);
  assert.equal(r.executionBindingsReady,false);
  assert.equal(r.executionAllowed,false);
  assert.equal(r.realDataAllowed,false);
  assert.equal(r.productionAllowed,false);
});

test('S4.63 freezes exact approved GT Auto/Moto W1-W4 scope',()=>{
  const a=s.OWNER_APPROVED_SCOPE;
  assert.equal(a.country,'GT');
  assert.equal(a.journeyId,'GT_AUTO_MOTO_HYBRID');
  assert.deepEqual(a.allowedStages,['W1','W2','W3','W4']);
  assert.equal(a.maxQuoteCases,1);
  assert.equal(a.maxDataSubjects,1);
  assert.equal(a.maxExistingRecordsTouched,8);
  assert.equal(a.allowedExecutions,1);
  assert.equal(a.successDisposition,'ROLLBACK_TO_BEFORE_STATE');
  assert.equal(a.healthSensitiveDataAllowed,false);
});

test('S4.63 explicitly preserves legal, selector and final-authorization blockers',()=>{
  const r=s.evaluate();
  assert.deepEqual(r.closedGates,[
    'W5_BUSINESS_SCOPE_OWNER_APPROVED',
    'W5_SUCCESS_PERSISTENCE_DISPOSITION_APPROVED'
  ]);
  assert.deepEqual(r.remainingBlockers,[
    'FORMAL_LEGAL_VALIDATION_REQUIRED',
    'W5_CASE_SELECTOR_COMMITMENT_REQUIRED',
    'W5_ACTOR_SELECTOR_COMMITMENT_REQUIRED',
    'W5_CONSENT_EVIDENCE_COMMITMENT_REQUIRED',
    'OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'
  ]);
});

test('S4.63 remains source-only and real data hard-closed',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.REAL_DATA_ALLOWED,false);
  assert.equal(s.PRODUCTION_ALLOWED,false);
  assert.equal(s.OWNER_APPROVED_SCOPE.realDataExecutionAuthorized,false);
  assert.equal(s.OWNER_APPROVED_SCOPE.finalW5Authorization,false);
});
