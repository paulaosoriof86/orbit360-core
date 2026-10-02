'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const c=require('./cotcomp-real-quote-corpus-s471');

test('real quote corpus includes all 16 uploaded insurer PDFs in 5 risk clusters',()=>{
  const s=c.summary();
  assert.equal(s.clusters,5);
  assert.equal(s.sourceDocuments,16);
  assert.equal(s.uniqueInsurers,10);
  assert.equal(s.currentW5Clusters,1);
});

test('motorcycle corpus preserves four real insurer sources',()=>{
  const x=c.CLUSTERS.find(v=>v.clusterId==='GT_MOTO_PULSAR_NS400Z_2026_25000');
  assert.equal(x.sources.length,4);
  assert.deepEqual(new Set(x.sources.map(s=>s.insurer)),new Set(['Seguros El Roble','Seguros Columna','MAPFRE Seguros Guatemala','Aseguradora La Ceiba']));
});

test('CX-5 2014 corpus preserves Bantrab missing premium instead of fabricating it',()=>{
  const x=c.CLUSTERS.find(v=>v.clusterId==='GT_AUTO_CX5_2014_58000');
  const b=x.sources.find(s=>s.insurer==='Seguros Bantrab');
  assert.equal(b.alternatives[0].cashPremium,null);
  assert.equal(b.alternatives[0].premiumMissing,true);
});

test('La Ceiba CX-5 two-column labels remain validation-needed',()=>{
  const x=c.CLUSTERS.find(v=>v.clusterId==='GT_AUTO_CX5_2014_58000');
  const lc=x.sources.find(s=>s.insurer==='Aseguradora La Ceiba');
  assert.equal(lc.alternatives.length,2);
  assert.equal(lc.alternatives.every(a=>a.labelNeedsValidation===true),true);
});

test('only Yaris cluster is eligible as current W5 documentary family',()=>{
  const xs=c.CLUSTERS.filter(x=>x.currentW5Case);
  assert.equal(xs.length,1);
  assert.equal(xs[0].clusterId,'GT_AUTO_YARIS_2008_37500');
  assert.equal(xs[0].sources.length,2);
  assert.equal(xs[0].sources.flatMap(s=>s.alternatives).length,3);
});
