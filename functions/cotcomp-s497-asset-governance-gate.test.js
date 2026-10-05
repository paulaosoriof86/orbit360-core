'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('./cotcomp-s497-asset-manifest.json');
const G=require('./cotcomp-s497-asset-governance-gate');

test('S4.97 asset manifest passes provenance and no-repeat gate',()=>{
  const v=G.verify(M);
  assert.equal(v.ok,true,JSON.stringify(v.failed,null,2));
});

test('S4.97 asset gate blocks duplicate primary visual reuse',()=>{
  const m=JSON.parse(JSON.stringify(M));
  m.familyVisuals[0].sha256=m.hero.sha256;
  const v=G.verify(m);
  assert.equal(v.ok,false);
  assert.ok(v.failed.some(x=>x.code==='NO_PRIMARY_ASSET_REUSE'));
});

test('S4.97 production visual approval remains false until Owner promotion',()=>{
  assert.equal(M.gates.productionVisualApproval,false);
  assert.equal(M.gates.packagingComplete,true);
  assert.equal(M.gates.sourceBytesVerified,true);
  assert.equal(M.gates.runtimeBytesVerified,true);
  assert.equal(M.gates.ownerReviewVisualEvidenceComplete,true);
});
