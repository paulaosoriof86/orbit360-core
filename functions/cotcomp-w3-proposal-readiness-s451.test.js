'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w3-proposal-readiness-s451');

test('S4.51 remains source-only with physical W3 hard-closed',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.PHYSICAL_W3_ALLOWED,false);
});

test('S4.51 detects proposal case-link mismatch between persistence and comparison contracts',()=>{
  const a=s.auditCurrentModel();
  assert.equal(a.findings.runtimeBuildUsesCaseId,true);
  assert.equal(a.findings.runtimeBuildUsesQuoteCaseId,false);
  assert.equal(a.findings.comparisonRequiresQuoteCaseId,true);
  assert.equal(a.findings.directRuntimeProposalComparisonShapePasses,false);
  assert.ok(a.blockers.includes('PROPOSAL_CASE_LINK_FIELD_MISMATCH'));
});

test('S4.51 detects that UPSERT_VERSIONED_PROPOSAL lacks explicit version identity semantics',()=>{
  const a=s.auditCurrentModel();
  assert.equal(a.findings.proposalPlanOperationType,'UPSERT_VERSIONED_PROPOSAL');
  assert.equal(a.findings.planHasVersionNumber,false);
  assert.ok(a.blockers.includes('PROPOSAL_VERSION_IDENTITY_SEMANTICS_REQUIRED'));
});

test('S4.51 preserves validated + current comparison truth and detects unpersisted current-validity context',()=>{
  const a=s.auditCurrentModel();
  assert.equal(a.findings.comparisonCurrentValidityIsExternalContext,true);
  assert.equal(a.findings.runtimeHasStandardCurrentValidityField,false);
  assert.ok(a.blockers.includes('PROPOSAL_CURRENT_VALIDITY_PERSISTENCE_CONTRACT_REQUIRED'));
});

test('S4.51 detects missing proposal idempotency and atomic supersession write contracts',()=>{
  const a=s.auditCurrentModel();
  assert.equal(a.findings.runtimeHasSupersedesProposalId,true);
  assert.equal(a.findings.proposalPlanHasIdempotencyKey,false);
  assert.equal(a.findings.proposalPlanHasAtomicSupersession,false);
  assert.ok(a.blockers.includes('PROPOSAL_IDEMPOTENT_WRITE_CONTRACT_REQUIRED'));
  assert.ok(a.blockers.includes('PROPOSAL_SUPERSESSION_ATOMICITY_CONTRACT_REQUIRED'));
});

test('S4.51 candidate keeps persisted caseId while requiring explicit public quoteCaseId mapping',()=>{
  const c=s.proposedAlignment();
  assert.equal(c.caseLinkBoundary.persistedCanonicalField,'caseId');
  assert.equal(c.caseLinkBoundary.publicApiFieldMayRemain,'quoteCaseId');
  assert.equal(c.versioningCandidate.silentOverwriteForbidden,true);
  assert.equal(c.idempotencyCandidate.sameRequestSamePayloadWrites,0);
});

test('S4.51 readiness can close source audit but not physical W3',()=>{
  const r=s.readiness();
  assert.equal(r.sourceOnlyReady,true);
  assert.equal(r.physicalW3Ready,false);
  assert.equal(r.physicalW3Allowed,false);
  assert.ok(r.blockers.includes('W3_PHYSICAL_ROLLBACK_JOURNAL_REQUIRED'));
  assert.ok(r.blockers.includes('OWNER_W3_AUTHORIZATION_REQUIRED'));
});
