'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-sat2026-normalized-catalog-s476');

const FIXTURE=[
'AUTOMOVIL          TOYOTA              COROLLA                             1800      4           4        GA              5         140,552.13    127,774.66   116,158.78    105,598.89     95,998.99     87,271.81     79,338.01     72,125.46     65,568.60     59,611.45     54,192.23     49,265.67     44,786.97     40,715.43     36,643.89     23,193.60',
'AUTOMOVIL          TOYOTA              COROLLA                             1600      4           4        GA              5         100,000.00     90,000.00    80,000.00     70,000.00     60,000.00     50,000.00     40,000.00     30,000.00     20,000.00     10,000.00      9,000.00      8,000.00      7,000.00      6,000.00      5,000.00      4,000.00',
'CAMIONETA          HONDA               CR-V EX                            2400      4           5        GA              5         200,000.00    190,000.00   180,000.00    170,000.00    160,000.00    150,000.00    140,000.00    130,000.00    120,000.00    110,000.00    100,000.00     90,000.00     80,000.00     70,000.00     60,000.00     50,000.00'
].join('\n');

test('S4.76 parses SAT fixed-layout rows using multi-space field boundaries',()=>{
  const p=s.parseText(FIXTURE);
  assert.equal(p.rows.length,3);
  assert.equal(p.rows[0].type,'AUTOMOVIL');
  assert.equal(p.rows[0].brand,'TOYOTA');
  assert.equal(p.rows[0].line,'COROLLA');
  assert.equal(p.rows[0].specs.cc,1800);
});

test('S4.76 collapses duplicate type-brand-line rows while preserving spec variants',()=>{
  const c=s.buildCatalog(s.parseText(FIXTURE).rows);
  assert.equal(c.entries.length,2);
  const corolla=c.entries.find(x=>x.brand==='TOYOTA');
  assert.equal(corolla.sourceRowCount,2);
  assert.equal(corolla.specVariants.length,2);
});

test('S4.76 keeps type in model identity because brand-line can exist across vehicle types',()=>{
  assert.notEqual(
    s.stableId('vmodel',['AUTOMOVIL','FORD','F-350']),
    s.stableId('vmodel',['CAMION','FORD','F-350'])
  );
});

test('S4.76 punctuation-compaction can surface CRV vs CR-V as alias candidate without silently merging',()=>{
  const c=s.buildCatalog(s.parseText(FIXTURE).rows);
  assert.equal(s.exact(c,{type:'CAMIONETA',brand:'HONDA',line:'CRV'}).length,0);
  assert.equal(s.compactPrefix(c,{type:'CAMIONETA',brand:'HONDA',line:'CRV'}).length,1);
});

test('S4.76 readiness does not claim physical catalog or public release',()=>{
  const r=s.readiness();
  assert.equal(r.parserReady,true);
  assert.equal(r.physicalCatalogBuilt,false);
  assert.equal(r.publicDropdownReleased,false);
  assert.equal(r.quoteEligibilityOverlayBuilt,false);
  assert.equal(r.appDataReads,0);
  assert.equal(r.appDataWrites,0);
  assert.equal(r.providerOrRaterCalls,0);
  assert.equal(r.productionTouched,false);
});
