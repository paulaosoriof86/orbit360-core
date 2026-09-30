'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const r=require('./cotcomp-persistence-write-readiness-s443');
const s=require('./cotcomp-write-release-stages-s443');

test('S4.43 preserves S4.42 functional baseline truth',()=>{
  assert.equal(r.S442_BASELINE.validAppCheckSyntheticInvocationPass,true);
  assert.equal(r.S442_BASELINE.persistenceEnabled,false);
  assert.equal(r.S442_BASELINE.appDataWritesExecuted,0);
  assert.equal(r.S442_BASELINE.realDataUsed,false);
  assert.equal(r.S442_BASELINE.productionTouched,false);
});

test('runtime governance metadata is aligned to Owner S4.26 without claiming legal verification',()=>{
  assert.equal(r.SOURCE_FACTS.ownerInternalRetentionPolicyVersion,'ays-cotcomp-governance-policy-s426-v1.0');
  assert.equal(r.SOURCE_FACTS.ownerInternalRetentionPolicyStatus,'OWNER_INTERNAL_POLICY_ACTIVE');
  assert.equal(r.SOURCE_FACTS.legalComplianceVerified,false);
});

test('all current persistence execution locks remain closed',()=>{
  assert.equal(r.hardLocksClosed(),true);
  const cur=r.currentReadiness();
  assert.equal(cur.effectiveWriteAllowed,false);
  assert.equal(cur.realDataAllowed,false);
  assert.equal(cur.productionAllowed,false);
});

test('current readiness exposes the material blockers',()=>{
  const cur=r.currentReadiness();
  assert.equal(cur.logicalReady,false);
  for(const code of [
    'WORKFLOW_OWNER_RUNTIME_PROOF_REQUIRED',
    'STORAGE_DRIVER_REQUIRED',
    'AUDIT_ADAPTER_REQUIRED',
    'SAGA_RESUME_COMPENSATION_REQUIRED',
    'SYNTHETIC_CONTROLLED_WRITE_ROLLBACK_PROOF_REQUIRED',
    'NOTIFICATION_SIDE_EFFECTS_MUST_BE_DISABLED',
    'OWNER_WRITE_AUTHORIZATION_REQUIRED',
    'DEPLOY_AUTHORIZATION_REQUIRED'
  ]) assert.ok(cur.blockers.includes(code),code);
});

test('write release is staged and W1-W5 are not executable now',()=>{
  assert.equal(s.stage('W0').executableNow,true);
  for(const id of ['W1','W2','W3','W4','W5']){
    assert.equal(s.stage(id).executableNow,false,id);
    assert.equal(s.stage(id).writesAllowed,false,id);
  }
});

test('W1 future proof requires explicit gate and rollback harness',()=>{
  let g=s.evaluateStageGate('W1',{
    projectId:'ays-orbit-360-lab',
    syntheticOnly:true,
    notificationProviderSideEffectsDisabled:true,
    ownerStageAuthorization:false,
    rollbackHarnessReady:false,
    realData:false,
    production:false
  });
  assert.equal(g.ok,false);
  assert.ok(g.reasons.includes('EXPLICIT_OWNER_STAGE_AUTHORIZATION_REQUIRED'));
  assert.ok(g.reasons.includes('ROLLBACK_HARNESS_REQUIRED'));
  assert.equal(g.effectiveWriteAllowed,false);
});

test('even a logically complete future W1 gate does not enable writes by this source contract',()=>{
  const g=s.evaluateStageGate('W1',{
    projectId:'ays-orbit-360-lab',
    syntheticOnly:true,
    notificationProviderSideEffectsDisabled:true,
    ownerStageAuthorization:true,
    rollbackHarnessReady:true,
    realData:false,
    production:false
  });
  assert.equal(g.ok,true);
  assert.equal(g.effectiveWriteAllowed,false);
});

test('core proof sequence includes idempotent retry conflict deny and final absence',()=>{
  assert.ok(s.CORE_WRITE_SEQUENCE.includes('RETRY_SAME_PAYLOAD_EXPECT_NO_DUPLICATE'));
  assert.ok(s.CORE_WRITE_SEQUENCE.includes('RETRY_CONFLICTING_PAYLOAD_EXPECT_DENY'));
  assert.ok(s.CORE_WRITE_SEQUENCE.includes('VERIFY_FINAL_ABSENCE'));
});

test('saga model explicitly represents partial and compensation states',()=>{
  assert.ok(s.SAGA_STATES.includes('PARTIAL_RETRYABLE'));
  assert.ok(s.SAGA_STATES.includes('COMPENSATION_REQUIRED'));
  assert.ok(s.SAGA_STATES.includes('ROLLED_BACK_SYNTHETIC'));
});
