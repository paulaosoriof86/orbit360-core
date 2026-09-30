'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const p=require('./cotcomp-lab-no-write-proof-plan-s437');
const x=require('./cotcomp-owner-no-counsel-exception');
const g=require('./cotcomp-governance-policy');

function base(){
  return {
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    sourceSha:'a'.repeat(40),
    negativeSecurityQaPass:true,
    persistenceEnabled:false,
    policyVersion:g.VERSION,
    ownerDecision:x.OWNER_DECISION,
    ownerAcceptedRisk:true
  };
}

test('proof plan is preparation-only',()=>{
  assert.equal(p.EXECUTION_ALLOWED,false);
  assert.equal(p.DEPLOY_EXECUTION_ALLOWED,false);
  assert.equal(p.WRITES_ALLOWED,false);
  assert.equal(p.REAL_DATA_ALLOWED,false);
});

test('valid LAB input produces exact four-callable proof plan',()=>{
  const r=p.buildProofPlan(base());
  assert.equal(r.ok,true);
  assert.equal(r.callablesExact,true);
  assert.deepEqual(r.callables,p.EXPECTED_CALLABLES);
  assert.equal(r.effectiveDeployAllowed,false);
});

test('wrong project fails closed',()=>{
  const r=p.buildProofPlan({...base(),projectId:'other'});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('PROJECT_NOT_LAB'));
});

test('persistence must remain disabled',()=>{
  const r=p.buildProofPlan({...base(),persistenceEnabled:true});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('PERSISTENCE_MUST_REMAIN_DISABLED'));
});

test('runtime proof assertions require zero writes and synthetic-only operation',()=>{
  const a=p.proposedRuntimeProofAssertions();
  assert.equal(a.writesExecuted,0);
  assert.equal(a.syntheticOnly,true);
  assert.equal(a.productionTouched,false);
  assert.equal(a.dataTouched,false);
});

test('execution assertion fails closed',()=>{
  assert.throws(()=>p.assertExecutionClosed(),/COTCOMP_LAB_PROOF_PLAN_EXECUTION_DISABLED/);
});
