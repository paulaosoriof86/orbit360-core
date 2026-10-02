'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-real-proposal-evidence-s469');

test('S4.69 is source-only and preserves W5 boundaries',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  assert.equal(s.JOURNEY_ID,'GT_AUTO_MOTO_HYBRID');
  assert.equal(s.COUNTRY,'GT');
  assert.equal(s.PRODUCT,'AUTO');
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.PROVIDER_OR_RATER_CALLS_ALLOWED,false);
  assert.equal(s.PRODUCTION_ALLOWED,false);
});

test('S4.69 rejects a bare manual premium without documentary commitments',()=>{
  const fx=s.syntheticEvidencePacket();
  fx.sourceEvidence={origin:'ajuste_manual_versionado',humanValidated:true,providerOrRaterCallsExecuted:0};
  const v=s.validateEvidencePacket(fx);
  assert.equal(v.ok,false);
  assert.ok(v.errors.includes('SOURCE_DOCUMENT_SHA256_REQUIRED'));
  assert.ok(v.errors.includes('SOURCE_REFERENCE_COMMITMENT_REQUIRED'));
  assert.ok(v.errors.includes('MANUAL_REASON_COMMITMENT_REQUIRED'));
});

test('S4.69 rejects raw participant PII in proposal evidence',()=>{
  const fx=s.syntheticEvidencePacket();
  fx.email='person@example.test';
  const v=s.validateEvidencePacket(fx);
  assert.equal(v.ok,false);
  assert.ok(v.errors.includes('RAW_PII_KEY_FORBIDDEN'));
});

test('S4.69 builds a validated current Proposal candidate from governed evidence',()=>{
  const fx=s.syntheticEvidencePacket();
  const out=s.buildRealProposalCandidate(fx,'2026-10-15T12:00:00Z');
  assert.equal(out.ok,true);
  assert.equal(out.eligibleForRealW3,true);
  assert.equal(out.plan.proposal.validationState,'VALIDATED');
  assert.equal(out.plan.proposal.caseId,'qcase_s469_synthetic');
  assert.equal(out.plan.proposal.country,'GT');
  assert.equal(out.plan.proposal.product,'AUTO');
  assert.match(out.plan.proposal.sourceId,/^source_[a-f0-9]{24}$/);
  assert.equal(out.plan.proposal.provenance.providerOrRaterCallsExecuted,0);
  assert.equal(out.plan.proposal.provenance.rawDocumentStoredInCotComp,false);
  assert.equal(out.plan.proposal.provenance.piiCopiedToProposal,false);
});

test('S4.69 manual versioned evidence requires a reason commitment',()=>{
  const fx=s.syntheticEvidencePacket();
  fx.sourceEvidence.origin='ajuste_manual_versionado';
  let out=s.validateEvidencePacket(fx);
  assert.equal(out.ok,false);
  assert.ok(out.errors.includes('MANUAL_REASON_COMMITMENT_REQUIRED'));
  fx.sourceEvidence.manualReasonCommitmentSha256='d'.repeat(64);
  out=s.buildRealProposalCandidate(fx,'2026-10-15T12:00:00Z');
  assert.equal(out.ok,true);
  assert.equal(out.eligibleForRealW3,true);
});

test('S4.69 readiness prepares no real Proposal and touches no real data',()=>{
  const r=s.readiness();
  assert.equal(r.sourceContractReady,true);
  assert.deepEqual(r.blockers,[]);
  assert.equal(r.currentDependency,'REAL_VALIDATED_PROPOSAL_EVIDENCE_REQUIRED');
  assert.equal(r.realProposalCreated,false);
  assert.equal(r.realDataTouched,false);
  assert.equal(r.appDataReadsAllowed,false);
  assert.equal(r.appDataWritesAllowed,false);
});
