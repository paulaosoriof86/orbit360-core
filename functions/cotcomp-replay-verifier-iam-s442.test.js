'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const p=require('./cotcomp-replay-verifier-iam-s442');

test('S4.42 replay verifier grant is exact LAB least privilege',()=>{
  assert.equal(p.TARGET.projectId,'ays-orbit-360-lab');
  assert.equal(p.TARGET.runtimeServiceAccount,'orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com');
  assert.equal(p.TARGET.requiredRole,'roles/firebaseappcheck.tokenVerifier');
  assert.equal(p.TARGET.requiredPermission,'firebaseappcheck.appCheckTokens.verify');
});

test('exact IAM grant contract passes without opening release gates',()=>{
  const s=p.evaluate({
    projectId:p.TARGET.projectId,
    functionName:p.TARGET.functionName,
    runtimeServiceAccount:p.TARGET.runtimeServiceAccount,
    role:p.TARGET.requiredRole,
    appDataWritesExecuted:0,
    deployExecuted:false,
    productionTouched:false
  });
  assert.equal(s.ok,true);
  assert.equal(s.leastPrivilege,true);
  assert.equal(s.appCheckWeakening,false);
  assert.equal(s.persistenceReleased,false);
  assert.equal(s.productionReleased,false);
});

test('broader role or wrong service account fails closed',()=>{
  let s=p.evaluate({
    projectId:p.TARGET.projectId,
    functionName:p.TARGET.functionName,
    runtimeServiceAccount:'other@example.invalid',
    role:'roles/editor',
    appDataWritesExecuted:0,
    deployExecuted:false,
    productionTouched:false
  });
  assert.equal(s.ok,false);
  assert.ok(s.reasons.includes('RUNTIME_SERVICE_ACCOUNT_MISMATCH'));
  assert.ok(s.reasons.includes('ROLE_NOT_LEAST_PRIVILEGE_TOKEN_VERIFIER'));
});
