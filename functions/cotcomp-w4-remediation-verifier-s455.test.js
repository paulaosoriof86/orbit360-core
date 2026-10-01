'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const v=require('./cotcomp-w4-remediation-verifier-s455');

test('S4.55 closes W4 technical source blockers only',()=>{
  const r=v.evaluate();
  assert.equal(r.sourceRemediationPass,true);
  assert.equal(r.technicalW4Ready,true);
  assert.equal(r.physicalW4Ready,false);
  assert.equal(r.physicalW4Allowed,false);
  assert.deepEqual(r.remainingBlockers,['OWNER_W4_AUTHORIZATION_REQUIRED']);
});

test('S4.55 verifier freezes linkage, idempotency, atomic patch and non-binding truth',()=>{
  const r=v.evaluate();
  assert.equal(r.findings.explicitUserChoiceRequired,true);
  assert.equal(r.findings.comparisonSetMembershipVerified,true);
  assert.equal(r.findings.sameCaseLinkageVerified,true);
  assert.equal(r.findings.currentEligibleProposalRequired,true);
  assert.equal(r.findings.requestBoundSelectionIdentity,true);
  assert.equal(r.findings.idempotencyContract,true);
  assert.equal(r.findings.atomicQuoteCasePatch,true);
  assert.equal(r.findings.immutableNonBindingTruth,true);
  assert.equal(r.findings.prerequisiteReadSetCount,3);
  assert.equal(r.findings.atomicOperationCount,3);
});

test('S4.55 verifier freezes exact future physical proof accounting',()=>{
  const r=v.evaluate();
  assert.equal(r.findings.setupWrites,3);
  assert.equal(r.findings.selectionAtomicWrites,3);
  assert.equal(r.findings.cleanupDeletes,5);
  assert.equal(r.findings.totalMutations,11);
  assert.equal(r.boundaries.appDataReadsAllowed,false);
  assert.equal(r.boundaries.appDataWritesAllowed,false);
});
