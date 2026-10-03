'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-sat2026-snapshot-s475');

test('S4.75 freezes exact official SAT 2026 source',()=>{
  assert.equal(s.SOURCE.authority,'SAT_GUATEMALA');
  assert.equal(s.SOURCE.jurisdiction,'GT');
  assert.equal(s.SOURCE.year,2026);
  assert.equal(s.SOURCE.sourceFileId,'91646');
  assert.match(s.SOURCE.sourceUrl,/portal\.sat\.gob\.gt/);
  assert.deepEqual(s.SOURCE.requiredColumns,['Tipo','Marca','Línea']);
});

test('S4.75 source-only readiness does not claim physical snapshot yet',()=>{
  const r=s.readiness();
  assert.equal(r.sourceContractReady,true);
  assert.equal(r.snapshotMaterialized,false);
  assert.equal(r.normalizedCatalogBuilt,false);
  assert.equal(r.publicDropdownReleased,false);
  assert.equal(r.appDataReads,0);
  assert.equal(r.appDataWrites,0);
  assert.equal(r.providerOrRaterCalls,0);
  assert.equal(r.productionTouched,false);
});

test('S4.75 receipt validator accepts only verified physical SAT snapshot',()=>{
  const good={
    schemaVersion:'ays-cotcomp-s475-sat2026-snapshot-receipt-v1.0',
    sourceId:s.SOURCE.sourceId,sourceUrl:s.SOURCE.sourceUrl,
    authority:'SAT_GUATEMALA',jurisdiction:'GT',year:2026,httpStatus:200,
    pdfMagicPass:true,titlePass:true,headerPass:true,sampleToyotaCorollaPass:true,
    rawBytes:800000,pageCount:50,rawSha256:'a'.repeat(64),textSha256:'b'.repeat(64),
    snapshotMaterialized:true,normalizedCatalogBuilt:false,publicDropdownReleased:false,
    appDataReads:0,appDataWrites:0,providerOrRaterCalls:0,productionTouched:false
  };
  assert.equal(s.validateReceipt(good).ok,true);
  good.publicDropdownReleased=true;
  const bad=s.validateReceipt(good);
  assert.equal(bad.ok,false);
  assert.ok(bad.errors.includes('PUBLIC_RELEASE_FORBIDDEN'));
});
