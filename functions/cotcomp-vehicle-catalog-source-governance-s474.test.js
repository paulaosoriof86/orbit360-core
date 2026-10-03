'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-vehicle-catalog-source-governance-s474');

test('S4.74 uses SAT as local canonical baseline and separates provider eligibility',()=>{
  const p=s.sourcePolicy();
  assert.equal(p.canonicalIdentityBaseline,'SAT_GT_2026');
  assert.equal(p.quoteEligibilitySource,'INSURER_PROVIDER_CATALOGS');
  assert.equal(p.providerAvailabilityMustRemainSeparate,true);
  assert.equal(p.yearControlStrategy,'SEPARATE_NUMERIC_SELECT');
});

test('S4.74 keeps NHTSA vPIC secondary rather than Guatemala-local authority',()=>{
  const n=s.SOURCES.NHTSA_VPIC;
  assert.equal(n.role,'SECONDARY_NORMALIZATION');
  assert.equal(n.localMarketAuthority,false);
  assert.equal(n.quoteEligibilityAuthority,false);
});

test('S4.74 forbids building public catalog from client vehicles or quote corpus alone',()=>{
  const bad={
    jurisdiction:'GT',primarySource:'SAT_GT_2026',version:'v1',
    digestSha256:'a'.repeat(64),entries:[{brand:'TOYOTA',line:'COROLLA'}],
    includesRawOperationalClientVehicles:true,derivedOnlyFromQuoteCorpus:true
  };
  const v=s.validateCandidateCatalog(bad);
  assert.equal(v.ok,false);
  assert.ok(v.errors.includes('OPERATIONAL_CLIENT_VEHICLES_FORBIDDEN'));
  assert.ok(v.errors.includes('QUOTE_CORPUS_ONLY_FORBIDDEN'));
});

test('S4.74 candidate catalog requires SAT provenance, version and digest',()=>{
  const good={
    jurisdiction:'GT',primarySource:'SAT_GT_2026',version:'sat-gt-2026-v1',
    digestSha256:'b'.repeat(64),entries:[{vehicleType:'AUTOMOVIL',brand:'TOYOTA',line:'COROLLA'}]
  };
  const v=s.validateCandidateCatalog(good);
  assert.equal(v.ok,true);
  assert.deepEqual(v.errors,[]);
});

test('S4.74 does not falsely claim catalog ingestion or release',()=>{
  const r=s.readiness();
  assert.equal(r.sourceGovernanceReady,true);
  assert.equal(r.satOfficialSourceIdentified,true);
  assert.equal(r.satSnapshotMaterialized,false);
  assert.equal(r.publicDropdownCatalogReady,false);
  assert.equal(r.nextBlocker,'SAT_2026_CATALOG_SNAPSHOT_INGESTION_REQUIRED');
  assert.equal(r.providerOrRaterCalls,0);
  assert.equal(r.appDataReads,0);
  assert.equal(r.appDataWrites,0);
  assert.equal(r.productionTouched,false);
});
