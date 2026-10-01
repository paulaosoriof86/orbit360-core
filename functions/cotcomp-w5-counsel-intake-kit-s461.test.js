'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w5-counsel-intake-kit-s461');
const governance=require('./cotcomp-governance-policy');
const legal=require('./cotcomp-legal-validation-evidence');

test('S4.61 remains source-only with real data and production hard-closed',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.REAL_DATA_ALLOWED,false);
  assert.equal(s.PRODUCTION_ALLOWED,false);
});

test('S4.61 generates GT and CO templates bound to exact governance version',()=>{
  for(const country of ['GT','CO']){
    const t=s.countryCounselTemplate(country);
    assert.equal(t.packet.country,country);
    assert.equal(t.packet.reviewedPolicyVersion,governance.VERSION);
    assert.equal(t.packet.decisions.length,legal.POLICY_ITEMS.length);
    assert.equal(t.evidence.sourceType,'FORMAL_COUNSEL_OPINION');
    assert.equal(t.ownerAcceptance.policyVersion,governance.VERSION);
  }
});

test('S4.61 questionnaire covers every frozen policy item without legal conclusions',()=>{
  const q=s.counselQuestionnaire('GT');
  assert.equal(q.items.length,legal.POLICY_ITEMS.length);
  assert.deepEqual(q.items.map(x=>x.policyItem),legal.POLICY_ITEMS);
  assert.ok(q.items.every(x=>x.questions.length>=7));
});

test('S4.61 empty templates fail closed and cannot complete dual-country intake',()=>{
  const gt=s.countryCounselTemplate('GT');
  const co=s.countryCounselTemplate('CO');
  const g=s.validateCountryBundle(gt);
  const c=s.validateCountryBundle(co);
  assert.equal(g.ok,false);
  assert.equal(c.ok,false);
  const dual=s.dualCountryGate({gt,co});
  assert.equal(dual.dualCountryCounselIntakeComplete,false);
  assert.equal(dual.executionAllowed,false);
  assert.equal(dual.realDataAllowed,false);
});

test('S4.61 source kit is ready but preserves all external W5 blockers',()=>{
  const r=s.sourceReadiness();
  assert.equal(r.counselIntakeKitReady,true);
  assert.equal(r.executionAllowed,false);
  assert.equal(r.realDataAllowed,false);
  assert.equal(r.productionAllowed,false);
  assert.deepEqual(r.remainingBlockers,[
    'FORMAL_LEGAL_VALIDATION_REQUIRED',
    'W5_EXACT_PILOT_SCOPE_REQUIRED',
    'W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED',
    'OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'
  ]);
});
