'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-vehicle-risk-identity-s473');
const corpus=require('./cotcomp-real-quote-corpus-s471');

test('S4.73 freezes current W5 as Toyota Corolla 2006',()=>{
  const x=s.canonicalizeRisk(s.W5_CANONICAL_RISK);
  assert.equal(x.ok,true);
  assert.deepEqual(x.value,{country:'GT',product:'AUTO',brand:'TOYOTA',model:'COROLLA',year:2006});
});

test('S4.73 current W5 has no matching documentary cluster and does not reuse Yaris',()=>{
  const x=s.exactCorpusMatches(s.W5_CANONICAL_RISK);
  assert.equal(x.ok,true);
  assert.equal(x.matchCount,0);
  assert.equal(x.code,'MATCHING_REAL_PROPOSAL_EVIDENCE_REQUIRED');
  assert.equal(corpus.CLUSTERS.some(c=>c.currentW5Case===true),false);
});

test('S4.73 exact documentary matching still recognizes Yaris 2008 as its own historical cluster',()=>{
  const x=s.exactCorpusMatches({country:'GT',product:'AUTO',brand:'Toyota',model:'Yaris',year:2008});
  assert.equal(x.ok,true);
  assert.equal(x.matchCount,1);
  assert.equal(x.matches[0].clusterId,'GT_AUTO_YARIS_2008_37500');
  assert.equal(x.matches[0].currentW5Case,false);
});

test('S4.73 legacy composite input parses year but canonical contract separates it',()=>{
  const p=s.parseLegacyLineModel('Corolla 2006');
  assert.equal(p.ok,true);
  assert.equal(p.model,'Corolla');
  assert.equal(p.year,2006);
  const c=s.canonicalizeRisk({brand:'Toyota',lineModel:'Corolla 2006'});
  assert.equal(c.ok,true);
  assert.equal(c.value.model,'COROLLA');
  assert.equal(c.value.year,2006);
});

test('S4.73 public controls are dropdown/searchable-select, not primary free text',()=>{
  assert.equal(s.PUBLIC_CONTROL_CONTRACT.brand.control,'searchable-select');
  assert.equal(s.PUBLIC_CONTROL_CONTRACT.model.control,'searchable-select');
  assert.equal(s.PUBLIC_CONTROL_CONTRACT.year.control,'select');
  assert.equal(s.readiness().primaryFreeTextBrandModelAllowed,false);
  assert.equal(s.readiness().yearSeparated,true);
});

test('S4.73 corpus-derived catalog is fixture-only and cannot be released as authoritative',()=>{
  const f=s.deriveEvidenceFixtureCatalog();
  assert.equal(f.authoritative,false);
  assert.equal(f.publicReleaseReady,false);
  assert.equal(f.entries.length,5);
  const v=s.validateCatalogSelection({vehicleBrandId:'TOYOTA',vehicleModelId:'COROLLA',vehicleYear:2006},f);
  assert.equal(v.ok,false);
  assert.equal(v.code,'AUTHORITATIVE_VEHICLE_CATALOG_REQUIRED');
});

test('S4.73 authoritative catalog selection preserves legacy fields plus canonical riskIdentity',()=>{
  const entries=[{country:'GT',product:'AUTO',brandId:'TOYOTA',brandLabel:'Toyota',modelId:'COROLLA',modelLabel:'Corolla',year:2006}];
  const catalog={authoritative:true,version:'gt-vehicles-test-v1',digestSha256:'a'.repeat(64),entries};
  const out=s.buildCapturedFieldsFromCatalog({vehicleBrandId:'TOYOTA',vehicleModelId:'COROLLA',vehicleYear:2006},catalog);
  assert.equal(out.ok,true);
  assert.equal(out.capturedFields.brand,'Toyota');
  assert.equal(out.capturedFields.lineModel,'Corolla 2006');
  assert.equal(out.capturedFields.vehicleYear,2006);
  assert.equal(out.capturedFields.vehicleIdentity.brandId,'TOYOTA');
  assert.equal(out.capturedFields.vehicleIdentity.modelId,'COROLLA');
  assert.equal(out.capturedFields.vehicleIdentity.year,2006);
  assert.equal(out.capturedFields.vehicleIdentity.catalogVersion,'gt-vehicles-test-v1');
});

test('S4.73 readiness is source-only and does not falsely claim dropdown release',()=>{
  const r=s.readiness();
  assert.equal(r.dropdownControlContractReady,true);
  assert.equal(r.authoritativeVehicleCatalogReady,false);
  assert.equal(r.publicDropdownReleaseReady,false);
  assert.equal(r.releaseBlocker,'AUTHORITATIVE_VEHICLE_CATALOG_REQUIRED');
  assert.equal(r.appDataReads,0);
  assert.equal(r.appDataWrites,0);
  assert.equal(r.productionTouched,false);
  assert.equal(r.providerOrRaterCalls,0);
});
