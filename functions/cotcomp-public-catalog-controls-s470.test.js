'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-public-catalog-controls-s470');

test('S4.70 covers every GT Auto/Moto public field with an explicit UI control',()=>{
  const c=s.validateControlCoverage();
  assert.equal(c.ok,true);
  assert.deepEqual(c.missing,[]);
  assert.deepEqual(c.extra,[]);
});

test('S4.70 freezes brand and line/model as dropdown controls',()=>{
  assert.equal(s.CONTROLS.brand.control,'catalog_select');
  assert.equal(s.CONTROLS.lineModel.control,'dependent_catalog_select');
  assert.deepEqual(s.CONTROLS.lineModel.dependsOn,['route','brand']);
  assert.equal(s.CONTROLS.brand.catalogRequired,true);
  assert.equal(s.CONTROLS.lineModel.catalogRequired,true);
});

test('S4.70 keeps minimum completion separate from public presentation authority',()=>{
  assert.equal(s.COMPLETION_CONTRACT_ROLE,'MINIMUM_COMPLETION_ONLY_NOT_PRESENTATION_AUTHORITY');
  assert.equal(s.PRESENTATION_AUTHORITY,'S470_PUBLIC_UI_CONTROL_CONTRACT');
});

test('S4.70 refuses public release while governed catalog bindings are absent',()=>{
  const r=s.sourceOnlyReadiness();
  assert.equal(r.sourceContractReady,true);
  assert.equal(r.publicUiReleaseReady,false);
  assert.ok(r.blockers.includes('PUBLIC_CATALOG_BINDING_REQUIRED'));
  assert.equal(r.dropdownRequirementFrozen,true);
  assert.equal(r.dependentBrandModel,true);
});

test('S4.70 accepts only versioned governed bindings for every required catalog',()=>{
  const binding={};
  for(const key of s.CATALOG_KEYS){
    binding[key]={status:'BOUND',version:'v1',sourceRef:'catalog://'+key,governed:true};
  }
  const r=s.uiReleaseReadiness(binding);
  assert.equal(r.catalogBinding.ok,true);
  assert.equal(r.publicUiReleaseReady,true);
});

test('S4.70 is source-only and cannot deploy or release',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.DEPLOY_ALLOWED,false);
  assert.equal(s.RELEASE_ALLOWED,false);
});
