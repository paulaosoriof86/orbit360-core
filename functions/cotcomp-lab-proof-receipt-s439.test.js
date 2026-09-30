'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const r=require('./cotcomp-lab-proof-receipt-s439');
const m=require('./cotcomp-lab-readback-manifest-s438');
const d=require('./cotcomp-lab-deploy-evidence');

function sample(){
  return {
    sourceSha:'a'.repeat(40),
    sourceTree:'b'.repeat(40),
    runId:'TEST-RUN',
    artifactId:'TEST-ARTIFACT',
    artifactDigest:'c'.repeat(64),
    backendSourceDigest:'d'.repeat(64),
    workflowOwnerBlob:d.EXPECTED.workflowOwnerBlob,
    receiptPath:'artifacts/cotcomp/test-receipt.json',
    readback:{...m.expectedManifest(),writesExecuted:0}
  };
}

test('empty receipt is structurally incomplete',()=>{
  const x=r.validateReceipt(r.emptyReceipt());
  assert.equal(x.ok,false);
  assert.ok(x.reasons.includes('SOURCE_SHA_REQUIRED'));
});

test('complete synthetic zero-write receipt passes contract only',()=>{
  const x=r.validateReceipt(sample());
  assert.equal(x.ok,true);
  assert.equal(x.effectiveRuntimeVerified,false);
  assert.equal(x.runtimeVerifiedByCode,false);
});

test('wrong source identity fails',()=>{
  const x=r.validateReceipt({...sample(),sourceSha:'bad'});
  assert.equal(x.ok,false);
  assert.ok(x.reasons.includes('SOURCE_SHA_REQUIRED'));
});

test('readback mutation fails receipt',()=>{
  const s=sample();
  s.readback={...s.readback,writesExecuted:1,dataTouched:true};
  const x=r.validateReceipt(s);
  assert.equal(x.ok,false);
  assert.ok(x.reasons.includes('READBACK_CONTRACT_FAILED'));
  assert.ok(x.reasons.includes('DEPLOY_EVIDENCE_CONTRACT_FAILED'));
});

test('receipt contract never marks runtime as verified by code',()=>{
  const x=r.validateReceipt(sample());
  assert.equal(x.runtimeVerifiedByCode,false);
  assert.equal(x.deployConfirmedByCode,false);
  assert.equal(x.writesConfirmedByCode,false);
  assert.equal(x.effectiveRuntimeVerified,false);
});
