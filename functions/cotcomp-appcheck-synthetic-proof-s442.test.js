'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const p=require('./cotcomp-appcheck-synthetic-proof-s442');

function good(){
  return {
    projectId:p.TARGET.projectId,
    webAppId:p.TARGET.webAppId,
    deployedSourceSha:p.TARGET.deployedSourceSha,
    appCheckEnforced:true,
    firebaseClientSdkUsed:true,
    syntheticOnly:true,
    persistenceEnabled:false,
    appDataWritesExecuted:0,
    realDataUsed:false,
    productionTouched:false,
    calls:p.FUNCTIONS.map(name=>({name,ok:true}))
  };
}

test('S4.42 is pinned to the exact S4.40 LAB baseline',()=>{
  assert.equal(p.TARGET.projectId,'ays-orbit-360-lab');
  assert.equal(p.TARGET.webAppDisplayName,'Orbit360 LAB Web');
  assert.equal(p.TARGET.deployedSourceSha,'17d599e884d5b834b73b9499d8cef177575d56f9');
  assert.equal(p.FUNCTIONS.length,4);
});

test('S4.42 cannot weaken App Check or use raw callable bypass',()=>{
  assert.equal(p.SECURITY.appCheckMustRemainEnforced,true);
  assert.equal(p.SECURITY.rawHttpCallableBypassForbidden,true);
  assert.equal(p.SECURITY.firebaseClientSdkRequired,true);
});

test('valid synthetic four-callable receipt passes while release locks stay closed',()=>{
  const s=p.evaluateProofReceipt(good());
  assert.equal(s.ok,true);
  assert.equal(s.releaseTruth.validAppCheckSyntheticInvocationPass,true);
  assert.equal(s.releaseTruth.persistenceReleased,false);
  assert.equal(s.releaseTruth.writesReleased,false);
  assert.equal(s.releaseTruth.realDataReleased,false);
  assert.equal(s.releaseTruth.productionReleased,false);
});

test('any app-data write fails the proof',()=>{
  const s=p.evaluateProofReceipt({...good(),appDataWritesExecuted:1});
  assert.equal(s.ok,false);
  assert.ok(s.reasons.includes('APP_DATA_WRITES_MUST_BE_ZERO'));
});

test('wrong callable order or failed callable fails the proof',()=>{
  const x=good();
  x.calls=[...x.calls].reverse();
  let s=p.evaluateProofReceipt(x);
  assert.equal(s.ok,false);
  assert.ok(s.reasons.includes('CALLABLE_SEQUENCE_MISMATCH'));

  const y=good();
  y.calls[2]={...y.calls[2],ok:false};
  s=p.evaluateProofReceipt(y);
  assert.equal(s.ok,false);
  assert.ok(s.reasons.includes('ALL_CALLABLES_MUST_PASS'));
});
