'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const r=require('./cotcomp-owner-risk-dev-readiness');
const x=require('./cotcomp-owner-no-counsel-exception');
const g=require('./cotcomp-governance-policy');

function base(){
  return {
    policyVersion:g.VERSION,
    ownerDecision:x.OWNER_DECISION,
    ownerAcceptedRisk:true,
    negativeSecurityQaPass:true,
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones'
  };
}

test('current source-only continuation is allowed without counsel',()=>{
  const s=r.currentDevelopmentStatus();
  assert.equal(s.ownerNoCounselDecision,true);
  assert.equal(s.legalComplianceVerified,false);
  assert.equal(s.sourceOnlyContinuationAllowed,true);
  assert.equal(s.labNoWritePreparationAllowed,true);
});

test('valid owner-risk development path allows source-only continuation',()=>{
  const x=r.evaluateDevelopmentReadiness(base());
  assert.equal(x.ok,true);
  assert.equal(x.sourceOnlyContinuationAllowed,true);
  assert.equal(x.labNoWritePreparationAllowed,true);
  assert.equal(x.legalComplianceVerified,false);
});

test('negative security QA remains required',()=>{
  const x=r.evaluateDevelopmentReadiness({...base(),negativeSecurityQaPass:false});
  assert.equal(x.ok,false);
  assert.ok(x.reasons.includes('NEGATIVE_SECURITY_QA_REQUIRED'));
});

test('wrong LAB target prevents LAB preparation but not by changing legal truth',()=>{
  const x=r.evaluateDevelopmentReadiness({...base(),projectId:'other'});
  assert.equal(x.sourceOnlyContinuationAllowed,true);
  assert.equal(x.labNoWritePreparationAllowed,false);
  assert.ok(x.reasons.includes('PROJECT_NOT_LAB'));
  assert.equal(x.legalComplianceVerified,false);
});

test('development readiness never authorizes deploy, writes or production release',()=>{
  const x=r.evaluateDevelopmentReadiness(base());
  assert.equal(x.labDeployExecutionAllowed,false);
  assert.equal(x.realDataWritesAllowed,false);
  assert.equal(x.productionReleaseAllowed,false);
  assert.equal(x.runtimeEnabledByCode,false);
  assert.equal(x.writesEnabledByCode,false);
  assert.equal(x.deployAllowedByCode,false);
});
