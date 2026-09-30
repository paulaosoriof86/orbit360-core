'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-workflow-owner-runtime-state-s446');

test('S4.46 freezes exact deployed owner mismatch from read-only archive proof',()=>{
  const x=s.currentState();
  assert.equal(x.observed.projectId,'ays-orbit-360-lab');
  assert.equal(x.observed.readOnlyProofRunId,36785840790);
  assert.equal(x.observed.sourceArchiveReadSuccessful,true);
  assert.equal(x.observed.expectedOwnerBlob,'73e09a4404cb4298dc34c9c38e26ad1f960d3170');
  assert.equal(x.observed.deployedOwnerBlob,'d0a1e116186bba860d34ec540e8abba81830b553');
  assert.equal(x.observed.exactOwnerBlobMatch,false);
  assert.equal(x.observed.workflowOwnerRuntimeVerified,false);
});

test('deployed owner is explicitly frozen as lacking S4.20 cotcompRef support',()=>{
  const x=s.currentState();
  assert.equal(x.observed.deployedOwnerCotcompRefSupport,false);
  assert.ok(x.observed.blockers.includes('DEPLOYED_OWNER_BLOB_MISMATCH'));
  assert.equal(x.w2.runtimeCompatibleNow,false);
  assert.equal(x.w2.primaryRuntimeBlocker,'DEPLOYED_OWNER_MISSING_S420_COTCOMPREF_SCHEMA');
});

test('S4.46 read-only proof did not mutate application data or runtime config',()=>{
  const x=s.currentState();
  assert.equal(x.observed.appDataReadsExecuted,0);
  assert.equal(x.observed.appDataWritesExecuted,0);
  assert.equal(x.observed.deployExecuted,false);
  assert.equal(x.observed.iamMutationExecuted,false);
  assert.equal(x.observed.firebaseConfigMutationExecuted,false);
  assert.equal(x.observed.productionTouched,false);
});

test('W2 remains completely closed after S4.46',()=>{
  const x=s.currentState();
  assert.equal(x.w2.executionEnabled,false);
  assert.equal(x.w2.callsAllowed,false);
  assert.equal(x.w2.writesAllowed,false);
  assert.equal(x.w2.ownerW2AuthorizationRequired,true);
  assert.equal(x.w2.deployAuthorizationRequired,true);
  assert.equal(x.w2.realDataAllowed,false);
  assert.equal(x.w2.productionAllowed,false);
});
