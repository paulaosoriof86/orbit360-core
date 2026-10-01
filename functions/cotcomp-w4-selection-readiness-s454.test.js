'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w4-selection-readiness-s454');

test('S4.54 stays source-only and physical W4 closed',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.PHYSICAL_W4_ALLOWED,false);
});

test('S4.54 confirms explicit choice and non-binding truth already exist',()=>{
  const r=s.audit();
  assert.equal(r.findings.explicitUserChoiceRequired,true);
  assert.equal(r.findings.selectionTruthLocked,true);
});

test('S4.54 detects missing membership/case/current eligibility validation',()=>{
  const r=s.audit();
  assert.ok(r.blockers.includes('SELECTION_COMPARISONSET_MEMBERSHIP_REQUIRED'));
  assert.ok(r.blockers.includes('SELECTION_PROPOSAL_CASE_LINK_REQUIRED'));
  assert.ok(r.blockers.includes('SELECTION_CURRENT_ELIGIBLE_PROPOSAL_REQUIRED'));
});

test('S4.54 detects incomplete idempotency and atomic quoteCase patch contract',()=>{
  const r=s.audit();
  assert.ok(r.blockers.includes('SELECTION_IDEMPOTENCY_CONTRACT_REQUIRED'));
  assert.ok(r.blockers.includes('SELECTION_ATOMIC_CASE_PATCH_REQUIRED'));
  assert.ok(r.blockers.includes('SELECTION_MULTI_DOCUMENT_DRYRUN_CONTRACT_REQUIRED'));
});

test('S4.54 requires rollback journal and separate Owner W4 authorization',()=>{
  const r=s.audit();
  assert.ok(r.blockers.includes('W4_PHYSICAL_ROLLBACK_JOURNAL_REQUIRED'));
  assert.ok(r.blockers.includes('OWNER_W4_AUTHORIZATION_REQUIRED'));
  assert.equal(r.technicalW4Ready,false);
  assert.equal(r.physicalW4Ready,false);
});
