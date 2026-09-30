'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('S4.45 runtime is pinned to exact LAB and Web App',()=>{
  const source=fs.readFileSync(require.resolve('./cotcomp-w1-runtime-s445'),'utf8');
  assert.match(source,/ays-orbit-360-lab/);
  assert.match(source,/1:646761409743:web:2ec4595ee9160f9d945bba/);
  assert.match(source,/enforceAppCheck:true/);
  assert.match(source,/consumeAppCheckToken:true/);
  assert.match(source,/maxInstances:1/);
});

test('S4.45 runtime only exports isolated W1 proof callable plus pure helpers',()=>{
  const source=fs.readFileSync(require.resolve('./cotcomp-w1-runtime-s445'),'utf8');
  assert.match(source,/cotcompSyntheticCoreWriteProof/);
  assert.doesNotMatch(source,/ops-leads-domain/);
  assert.doesNotMatch(source,/notificationOutbox/);
  assert.doesNotMatch(source,/cotcompSubmitHandoff/);
  assert.doesNotMatch(source,/cotcompSelectProposal/);
});

test('W1 proof stores hash only for case access',()=>{
  const source=fs.readFileSync(require.resolve('./cotcomp-w1-runtime-s445'),'utf8');
  assert.match(source,/tokenHash:sha\(syntheticRawToken\)/);
  assert.match(source,/rawTokenPersisted:false/);
  assert.doesNotMatch(source,/rawToken:/);
});

test('W1 proof has exact four-create and four-delete lifecycle',()=>{
  const source=fs.readFileSync(require.resolve('./cotcomp-w1-runtime-s445'),'utf8');
  assert.match(source,/tx\.create\(refs\.idempotency/);
  assert.match(source,/tx\.create\(refs\.quoteCase/);
  assert.match(source,/tx\.create\(refs\.caseAccess/);
  assert.match(source,/tx\.create\(refs\.event/);
  assert.match(source,/tx\.delete\(ref\)/);
  assert.match(source,/createWrites:4/);
  assert.match(source,/deleteWrites:4/);
  assert.match(source,/netPersistentDocuments:0/);
});

test('W1 proof verifies retry conflict and final absence',()=>{
  const source=fs.readFileSync(require.resolve('./cotcomp-w1-runtime-s445'),'utf8');
  assert.match(source,/IDEMPOTENT_RETRY_MATCH/);
  assert.match(source,/S445_IDEMPOTENCY_PAYLOAD_CONFLICT/);
  assert.match(source,/S445_FINAL_ABSENCE_FAILED/);
  assert.match(source,/samePayloadRetryWrites:0/);
  assert.match(source,/conflictWrites:0/);
});

test('W1 proof excludes workflow notifications proposal selection real data and production',()=>{
  const source=fs.readFileSync(require.resolve('./cotcomp-w1-runtime-s445'),'utf8');
  for(const label of ['workflow_projection','notifications','proposal_persistence','selection_persistence','real_data','production']){
    assert.match(source,new RegExp(label));
  }
  assert.match(source,/productionTouched:false/);
});
