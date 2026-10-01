'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-selection-contract-s455');

test('S4.55 stays source-only and physical W4 closed',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.PHYSICAL_W4_ALLOWED,false);
});

test('selection prerequisites require same case, comparison membership and current eligible proposal',()=>{
  const fx=s.syntheticFixture();
  assert.equal(fx.plan.ok,true);
  const badMembership={...fx.comparisonSet,proposalIds:['other']};
  const r=s.validatePrerequisites({
    tenantId:fx.tenantId,caseId:fx.caseId,comparisonSet:badMembership,
    proposal:fx.proposal,quoteCase:fx.quoteCase,asOf:'2026-10-15T12:00:00Z'
  });
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('PROPOSAL_NOT_IN_COMPARISON_SET'));
});

test('selection denies superseded or expired proposal',()=>{
  const fx=s.syntheticFixture();
  const superseded={...fx.proposal,isCurrentVersion:false,validationState:'SUPERSEDED'};
  const a=s.validatePrerequisites({
    tenantId:fx.tenantId,caseId:fx.caseId,comparisonSet:fx.comparisonSet,
    proposal:superseded,quoteCase:fx.quoteCase,asOf:'2026-10-15T12:00:00Z'
  });
  assert.equal(a.ok,false);
  assert.ok(a.reasons.includes('PROPOSAL_NOT_CURRENT_VERSION'));
  assert.ok(a.reasons.includes('PROPOSAL_NOT_COMPARISON_ELIGIBLE'));
  const expired={...fx.proposal,validity:{validFrom:'2026-09-01T00:00:00Z',validUntil:'2026-09-30T23:59:59Z'}};
  const b=s.validatePrerequisites({
    tenantId:fx.tenantId,caseId:fx.caseId,comparisonSet:fx.comparisonSet,
    proposal:expired,quoteCase:fx.quoteCase,asOf:'2026-10-15T12:00:00Z'
  });
  assert.equal(b.ok,false);
  assert.ok(b.reasons.includes('PROPOSAL_VALIDITY_NOT_CURRENT'));
});

test('selection atomic plan writes selection, idempotency and quoteCase patch together',()=>{
  const fx=s.syntheticFixture();
  assert.equal(fx.plan.atomic,true);
  assert.equal(fx.plan.operations.length,3);
  assert.deepEqual(fx.plan.operations.map(x=>x.entity),['selection','selectionRequest','quoteCase']);
  assert.equal(fx.plan.operations[2].patch.status,'USER_SELECTED');
  assert.equal(fx.plan.operations[2].patch.selectedProposalId,fx.proposal.proposalId);
  assert.equal(fx.plan.selection.issuanceState,'NOT_ISSUED');
  assert.equal(fx.plan.selection.bindingState,'NOT_BOUND');
  assert.equal(fx.plan.selection.coverageState,'NOT_CONFIRMED');
});

test('selection idempotency reuses same digest with zero writes and denies changed digest',()=>{
  const fx=s.syntheticFixture();
  const existing={status:'COMMITTED',requestDigest:fx.plan.requestDigest};
  assert.deepEqual(s.retryDecision(existing,fx.plan.requestDigest),{action:'REUSE',writesAllowedByDecision:false,writes:0});
  const bad=s.retryDecision(existing,'different');
  assert.equal(bad.action,'DENY');
  assert.equal(bad.writes,0);
  assert.equal(bad.code,'SELECTION_IDEMPOTENCY_CONFLICT');
});

test('synthetic W4 proof model freezes exact setup, atomic selection and cleanup accounting',()=>{
  const fx=s.syntheticFixture();
  const m=fx.physicalProofModel;
  assert.equal(m.setupCreatedPaths.length,3);
  assert.equal(m.selectionCreatedPaths.length,2);
  assert.equal(m.expectedSetupWrites,3);
  assert.equal(m.expectedSelectionAtomicWrites,3);
  assert.equal(m.expectedRetryWrites,0);
  assert.equal(m.expectedConflictWrites,0);
  assert.equal(m.expectedCleanupDeletes,5);
  assert.equal(m.expectedTotalMutations,11);
  assert.equal(m.finalAbsenceRequired,true);
});

test('W4 source readiness closes technical blockers but leaves Owner authorization',()=>{
  const r=s.readiness();
  assert.equal(r.sourceContractReady,true);
  assert.equal(r.technicalW4Ready,true);
  assert.equal(r.physicalW4Ready,false);
  assert.equal(r.physicalW4Allowed,false);
  assert.deepEqual(r.remainingBlockers,['OWNER_W4_AUTHORIZATION_REQUIRED']);
});
