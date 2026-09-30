'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w1-runtime-state-s445');

test('S4.45 W1 physical proof is frozen with exact evidence identity',()=>{
  const x=s.currentState();
  assert.equal(x.proof.projectId,'ays-orbit-360-lab');
  assert.equal(x.proof.runId,36783783932);
  assert.equal(x.proof.deployedSourceSha,'fa55f4ce6185656bf00600e8dd41b44b3d13a370');
  assert.equal(x.result.sourceQaTests,307);
  assert.equal(x.result.sourceQaPass,307);
  assert.equal(x.result.sourceQaFail,0);
});

test('W1 retry conflict and cleanup truth are physically PASS',()=>{
  const x=s.currentState();
  assert.equal(x.result.firstReadbackExact,true);
  assert.equal(x.result.samePayloadRetryPass,true);
  assert.equal(x.result.samePayloadRetryWrites,0);
  assert.equal(x.result.duplicateCreatedOnRetry,false);
  assert.equal(x.result.conflictingPayloadDenied,true);
  assert.equal(x.result.conflictWrites,0);
  assert.equal(x.result.caseAccessRawTokenPersisted,false);
  assert.equal(x.result.cleanupDeleted,4);
  assert.equal(x.result.finalAbsence,true);
  assert.equal(x.result.independentFinalAbsence,true);
});

test('W1 write accounting records real synthetic mutations and zero net persistence',()=>{
  const x=s.currentState();
  assert.equal(x.result.createWrites,4);
  assert.equal(x.result.deleteWrites,4);
  assert.equal(x.result.totalAppDataMutations,8);
  assert.equal(x.result.netPersistentDocuments,0);
  assert.equal(x.result.realDataUsed,false);
  assert.equal(x.result.productionTouched,false);
});

test('isolated W1 proof surface was removed after proof',()=>{
  const x=s.currentState();
  assert.equal(x.result.deployedFunctionObservedActive,true);
  assert.equal(x.result.isolatedProofFunctionRemoved,true);
});

test('W1 PASS does not release broader persistence or later stages',()=>{
  const x=s.currentState();
  assert.equal(x.release.w1SyntheticCoreProofPass,true);
  assert.equal(x.release.syntheticPersistencePhysicallyProven,true);
  assert.equal(x.release.generalPersistenceReleased,false);
  assert.equal(x.release.workflowProjectionReleased,false);
  assert.equal(x.release.proposalPersistenceReleased,false);
  assert.equal(x.release.selectionPersistenceReleased,false);
  assert.equal(x.release.realDataReleased,false);
  assert.equal(x.release.productionReleased,false);
});
