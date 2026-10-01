'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w5-binding-preflight-s465');

test('S4.65 remains source-only and real data hard-closed',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.REAL_DATA_ALLOWED,false);
  assert.equal(s.PRODUCTION_ALLOWED,false);
});

test('S4.65 hashes selectors and never returns raw selector values',()=>{
  const p=s.buildBindingPacket({
    caseSelector:'case-x',actorSelector:'actor-y',consentEvidenceSelector:'consent-z'
  });
  assert.equal(p.ok,true);
  assert.equal(p.rawSelectorsPersisted,false);
  assert.equal(p.rawSelectorsReturned,false);
  assert.ok(Object.values(p.commitments).every(s.validSha));
  assert.doesNotMatch(JSON.stringify(p),/case-x|actor-y|consent-z/);
});

test('S4.65 validates exact three commitment classes',()=>{
  const p=s.buildBindingPacket({
    caseSelector:'case-x',actorSelector:'actor-y',consentEvidenceSelector:'consent-z'
  });
  const r=s.validateCommitments(p.commitments);
  assert.equal(r.ok,true);
  assert.deepEqual(r.reasons,[]);
});

test('S4.65 synthetic binding preflight leaves only final Owner authorization',()=>{
  const r=s.syntheticProof();
  assert.equal(r.gate.commitmentMechanismReady,true);
  assert.equal(r.gate.selectorCommitmentsValid,true);
  assert.equal(r.gate.executionAllowed,false);
  assert.equal(r.gate.realDataAllowed,false);
  assert.deepEqual(r.gate.remainingBlockers,['OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED']);
});

test('S4.65 cannot enable execution even if final authorization boolean is simulated',()=>{
  const p=s.buildBindingPacket({
    caseSelector:'case-x',actorSelector:'actor-y',consentEvidenceSelector:'consent-z'
  });
  const r=s.preflight({commitments:p.commitments,finalOwnerAuthorization:true});
  assert.deepEqual(r.remainingBlockers,[]);
  assert.equal(r.executionAllowed,false);
  assert.equal(r.realDataAllowed,false);
  assert.equal(r.productionAllowed,false);
});
