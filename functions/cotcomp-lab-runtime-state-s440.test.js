'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-lab-runtime-state-s440');

test('S4.40 records exact LAB deployment evidence',()=>{
  const x=s.currentState();
  assert.equal(x.lab.projectId,'ays-orbit-360-lab');
  assert.equal(x.lab.deployedSourceSha,'17d599e884d5b834b73b9499d8cef177575d56f9');
  assert.equal(x.lab.readbackWorkflowConclusion,'SUCCESS');
  assert.equal(x.functions.length,4);
});

test('inventory is verified but callable invocation is not claimed',()=>{
  const x=s.currentState();
  assert.equal(x.runtime.deployed,true);
  assert.equal(x.runtime.inventoryReadbackVerified,true);
  assert.equal(x.runtime.callableInvocationVerified,false);
  assert.equal(x.releaseTruth.syntheticCallableInvocationPass,false);
});

test('persistence writes real data and production remain unreleased',()=>{
  const x=s.currentState();
  assert.equal(x.runtime.persistenceEnabled,false);
  assert.equal(x.runtime.appDataWritesExecuted,0);
  assert.equal(x.runtime.realDataUsed,false);
  assert.equal(x.runtime.productionTouched,false);
  assert.equal(x.releaseTruth.persistenceReleased,false);
  assert.equal(x.releaseTruth.writesReleased,false);
  assert.equal(x.releaseTruth.realDataReleased,false);
  assert.equal(x.releaseTruth.productionReleased,false);
});

test('cleanup policy warning remains explicit',()=>{
  const x=s.currentState();
  assert.equal(x.runtime.cleanupPolicyConfigured,false);
  assert.equal(x.runtime.cleanupPolicyWarningOpen,true);
  assert.match(x.lab.deployWorkflowConclusion,/CLEANUP_POLICY_ONLY/);
});
