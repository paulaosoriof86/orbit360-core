'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-workflow-owner-runtime-state-s447');

test('S4.47 physically replaces old owner blob with canonical S4.20 blob',()=>{
  const x=s.currentState();
  assert.equal(x.alignment.projectId,'ays-orbit-360-lab');
  assert.equal(x.alignment.workflowConclusion,'SUCCESS');
  assert.equal(x.alignment.oldOwnerBlob,'d0a1e116186bba860d34ec540e8abba81830b553');
  assert.equal(x.alignment.canonicalOwnerBlob,'73e09a4404cb4298dc34c9c38e26ad1f960d3170');
  assert.equal(x.alignment.physicalSourceReadbackExact,true);
  assert.equal(x.alignment.state,'ACTIVE');
  assert.equal(x.alignment.containsCotcompRef,true);
  assert.equal(x.alignment.containsSanitizeCotcompRef,true);
});

test('S4.47 records successful pre and post deployment QA',()=>{
  const x=s.currentState();
  assert.deepEqual(x.qa.preDeploy,{tests:318,passed:318,failed:0});
  assert.deepEqual(x.qa.postDeploy,{tests:318,passed:318,failed:0});
});

test('S4.47 owner alignment performs no app-data operation or W2 execution',()=>{
  const x=s.currentState();
  assert.equal(x.boundaries.appDataReadsExecuted,0);
  assert.equal(x.boundaries.appDataWritesExecuted,0);
  assert.equal(x.boundaries.w2Executed,false);
  assert.equal(x.boundaries.providerDeliveryExecuted,false);
  assert.equal(x.boundaries.realDataUsed,false);
  assert.equal(x.boundaries.productionTouched,false);
});

test('owner runtime blocker is closed but W2 remains execution closed',()=>{
  const x=s.currentState();
  assert.equal(x.w2.workflowOwnerRuntimeVerified,true);
  assert.equal(x.w2.canonicalCotcompRefRuntimeAvailable,true);
  assert.equal(x.w2.ownerRuntimeCompatibilityBlockerClosed,true);
  assert.equal(x.w2.executionEnabled,false);
  assert.equal(x.w2.callsAllowed,false);
  assert.equal(x.w2.writesAllowed,false);
  assert.equal(x.w2.providerDeliveryIsolationProofRequired,true);
  assert.equal(x.w2.syntheticCleanupHarnessRequired,true);
  assert.equal(x.w2.ownerW2AuthorizationRequired,true);
  assert.equal(x.w2.productionAllowed,false);
});

test('Firebase CLI nonzero is recorded without overriding physical readback truth',()=>{
  const x=s.currentState();
  assert.equal(x.alignment.firebaseDeployCliExitCode,1);
  assert.equal(x.alignment.physicalSourceReadbackExact,true);
});
