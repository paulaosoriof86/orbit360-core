'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w4-controlled-proof-s456');

test('S4.56 is pinned to LAB with five proof-owned paths',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  const f=s.fixture('s456-123456');
  assert.equal(f.allPaths.length,5);
  assert.equal(f.plan.ok,true);
  assert.equal(f.selection.issuanceState,'NOT_ISSUED');
  assert.equal(f.selection.bindingState,'NOT_BOUND');
  assert.equal(f.selection.coverageState,'NOT_CONFIRMED');
});

test('S4.56 selection identity is request-bound and atomic plan has three writes',()=>{
  const f=s.fixture('s456-123456');
  assert.match(f.plan.selectionRequestId,/^selreq_/);
  assert.equal(f.plan.operations.length,3);
  assert.equal(f.plan.atomic,true);
  assert.deepEqual(f.plan.operations.map(x=>x.entity),['selection','selectionRequest','quoteCase']);
});

test('S4.56 source hard-locks no real data/production and net-zero persistence',()=>{
  const fs=require('node:fs');
  const src=fs.readFileSync(require.resolve('./cotcomp-w4-controlled-proof-s456'),'utf8');
  assert.match(src,/realDataTouched:false/);
  assert.match(src,/productionTouched:false/);
  assert.match(src,/providerOrRaterCallsExecuted:0/);
  assert.match(src,/netPersistentDocuments:0/);
  assert.match(src,/cleanupDeletes:5/);
});
