'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const r=require('./cotcomp-composite-release-readiness');

test('current composite status remains blocked',()=>{
  const s=r.currentCompositeStatus();
  assert.equal(s.formalLegalValidationComplete,false);
  assert.equal(s.cotcompLabDeployEvidencePresent,false);
  assert.equal(s.ownerWriteAuthorization,false);
  assert.equal(s.deployAuthorization,false);
  assert.equal(s.effectiveRuntimeAllowed,false);
});

test('empty readiness input fails closed',()=>{
  const x=r.evaluateCompositeReadiness({});
  assert.equal(x.ok,false);
  assert.ok(x.reasons.includes('FORMAL_LEGAL_VALIDATION_REQUIRED'));
  assert.ok(x.reasons.includes('LAB_DEPLOY_EVIDENCE_REQUIRED'));
  assert.ok(x.reasons.includes('NEGATIVE_SECURITY_QA_REQUIRED'));
  assert.ok(x.reasons.includes('OWNER_WRITE_AUTHORIZATION_REQUIRED'));
  assert.ok(x.reasons.includes('DEPLOY_AUTHORIZATION_REQUIRED'));
});

test('hard runtime locks stay false regardless of logical inputs',()=>{
  const x=r.evaluateCompositeReadiness({
    negativeSecurityQaPass:true,
    ownerWriteAuthorization:true,
    deployAuthorization:true
  });
  assert.equal(x.runtimeEnabledByCode,false);
  assert.equal(x.writesEnabledByCode,false);
  assert.equal(x.deployAllowedByCode,false);
  assert.equal(x.effectiveRuntimeAllowed,false);
});
