'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-public-inbound-lab-proof-s504');

test('S5.04 fixture is LAB-pinned and synthetic',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  const f=s.fixture('s504-123456');
  assert.match(f.uid,/^s504_uid_/);
  assert.match(f.advisorId,/^s504_adv_/);
  assert.match(f.businessId,/^s504_neg_/);
  assert.equal(f.member.synthetic,true);
  assert.equal(f.request.data.operation,'create_business');
  assert.equal(f.request.data.payload.origen,'Web CotComp');
  assert.equal(f.request.data.payload.canal,'Web CotComp');
});

test('S5.04 fixture preserves CotComp correlation and advisor target identity',()=>{
  const f=s.fixture('s504-abcdef');
  assert.equal(f.request.data.payload.asesorId,f.advisorId);
  assert.equal(f.request.data.payload.cotcompRef.caseId,f.caseId);
  assert.equal(f.request.data.payload.cotcompRef.correlationId,f.correlationId);
  assert.equal(f.request.data.requestId,f.requestId);
});

test('S5.04 source hard-locks synthetic cleanup and no production touch',()=>{
  const fs=require('node:fs');
  const src=fs.readFileSync(require.resolve('./cotcomp-public-inbound-lab-proof-s504'),'utf8');
  assert.match(src,/realCustomerDataUsed:false/);
  assert.match(src,/productionTouched:false/);
  assert.match(src,/publicEndpointDeployed:false/);
  assert.match(src,/netPersistentSyntheticDocuments:0/);
  assert.match(src,/sameRequestIdDifferentPayloadDenied:true/);
});
