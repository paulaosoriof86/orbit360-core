'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const x=require('./cotcomp-owner-no-counsel-exception');
const g=require('./cotcomp-governance-policy');

test('owner no-counsel decision is frozen without claiming legal compliance',()=>{
  const s=x.currentException();
  assert.equal(s.ownerWaivesFormalCounsel,true);
  assert.equal(s.ownerAcceptedRisk,true);
  assert.equal(s.legalComplianceVerified,false);
  assert.equal(s.formalCounselPathStatus,'WAIVED_BY_OWNER');
});

test('source-only and LAB no-write preparation may continue',()=>{
  const s=x.currentException();
  assert.equal(s.sourceOnlyAllowed,true);
  assert.equal(s.labNoWritePreparationAllowed,true);
});

test('real writes and production release remain forbidden',()=>{
  const s=x.currentException();
  assert.equal(s.realDataWritesAllowed,false);
  assert.equal(s.productionReleaseAllowed,false);
});

test('exact policy version and owner risk acceptance are required',()=>{
  const r=x.evaluateOwnerException({
    policyVersion:g.VERSION,
    ownerDecision:x.OWNER_DECISION,
    ownerAcceptedRisk:true
  });
  assert.equal(r.ok,true);
  assert.equal(r.legalComplianceVerified,false);
  assert.equal(r.effectiveRuntimeAllowed,false);
});

test('wrong policy version fails closed',()=>{
  const r=x.evaluateOwnerException({
    policyVersion:'old',
    ownerDecision:x.OWNER_DECISION,
    ownerAcceptedRisk:true
  });
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('POLICY_VERSION_MISMATCH'));
});

test('owner exception never opens runtime/write/deploy code locks',()=>{
  const r=x.evaluateOwnerException({
    policyVersion:g.VERSION,
    ownerDecision:x.OWNER_DECISION,
    ownerAcceptedRisk:true
  });
  assert.equal(r.runtimeEnabled,false);
  assert.equal(r.writesEnabled,false);
  assert.equal(r.deployAllowed,false);
  assert.equal(r.effectiveRuntimeAllowed,false);
});
