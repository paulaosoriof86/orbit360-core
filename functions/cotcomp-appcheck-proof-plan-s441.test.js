'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const p=require('./cotcomp-appcheck-proof-plan-s441');

test('S4.41 proof is pinned to exact LAB runtime baseline',()=>{
  assert.equal(p.TARGET.projectId,'ays-orbit-360-lab');
  assert.equal(p.TARGET.region,'us-central1');
  assert.equal(p.TARGET.deployedSourceSha,'17d599e884d5b834b73b9499d8cef177575d56f9');
  assert.equal(p.FUNCTIONS.length,4);
});

test('proof never weakens App Check or bypasses callable protocol',()=>{
  assert.equal(p.PROOF.providerMode,'FIREBASE_APPCHECK_DEBUG_PROVIDER_IN_CI');
  assert.equal(p.PROOF.clientMode,'FIREBASE_WEB_CLIENT_SDK');
  assert.equal(p.PROOF.directRawHttpForbidden,true);
  assert.equal(p.PROOF.adminBypassForbidden,true);
  assert.equal(p.PROOF.appCheckWeakeningForbidden,true);
});

test('proof remains synthetic and zero-write',()=>{
  assert.equal(p.PROOF.syntheticProofRequired,true);
  assert.equal(p.PROOF.persistenceExpected,false);
  assert.equal(p.PROOF.appDataWritesExpected,0);
  assert.equal(p.PROOF.realDataAllowed,false);
  assert.equal(p.PROOF.productionAllowed,false);
});

test('missing debug token blocks proof rather than weakening security',()=>{
  const s=p.evaluatePreflight({
    projectId:'ays-orbit-360-lab',
    webAppCount:1,
    sdkConfigResolvable:true,
    debugTokenSecretPresent:false,
    deployedSourceSha:p.TARGET.deployedSourceSha,
    persistenceEnabled:false,
    productionTargeted:false
  });
  assert.equal(s.ready,false);
  assert.ok(s.blockers.includes('APPCHECK_DEBUG_TOKEN_SECRET_REQUIRED'));
  assert.equal(s.nextAction,'RESOLVE_PREFLIGHT_BLOCKERS_WITHOUT_WEAKENING_SECURITY');
});

test('complete preflight can advance to valid-App-Check synthetic proof',()=>{
  const s=p.evaluatePreflight({
    projectId:'ays-orbit-360-lab',
    webAppCount:1,
    sdkConfigResolvable:true,
    debugTokenSecretPresent:true,
    deployedSourceSha:p.TARGET.deployedSourceSha,
    persistenceEnabled:false,
    productionTargeted:false
  });
  assert.equal(s.ready,true);
  assert.deepEqual(s.blockers,[]);
  assert.equal(s.nextAction,'RUN_VALID_APPCHECK_SYNTHETIC_BROWSER_PROOF');
});
