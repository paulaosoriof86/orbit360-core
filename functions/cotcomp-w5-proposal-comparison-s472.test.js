'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w5-proposal-comparison-s472');

test('S4.72 scope is exact LAB W5 Proposal+Comparison',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  assert.equal(s.JOURNEY_ID,'GT_AUTO_MOTO_HYBRID');
  assert.equal(s.COUNTRY,'GT');
  assert.equal(s.PRODUCT,'AUTO');
  assert.equal(s.MAX_PROPOSALS,3);
  assert.equal(s.MAX_COMPARISON_SETS,1);
  assert.equal(s.EXPECTED_TEMP_DOCS,7);
});

test('S4.72 pure preparation yields 3 Proposals + 3 idempotency + 1 ComparisonSet',()=>{
  const out=s.prepareExecution({
    caseId:'qcase_s472_sourceonly',
    ownerAttestationSha256:'f'.repeat(64),
    validatedAt:'2026-10-02T16:50:00Z',
    generatedAt:'2026-10-02T17:00:00Z'
  });
  assert.equal(out.ok,true);
  assert.equal(out.proposalDocs.length,3);
  assert.equal(out.requestDocs.length,3);
  assert.equal(out.tempDocs.length,7);
  assert.equal(out.publicDto.alternatives.length,3);
  assert.equal(out.comparison.rankingPolicy,'NONE_BY_DEFAULT');
  assert.equal(out.comparison.silentWeighting,false);
  assert.equal(out.comparison.missingSemantics,'MISSING_IS_NOT_NOT_COVERED');
});

test('S4.72 preserves explicit-choice boundary',()=>{
  const out=s.prepareExecution({
    caseId:'qcase_s472_sourceonly',
    ownerAttestationSha256:'e'.repeat(64),
    validatedAt:'2026-10-02T16:50:00Z',
    generatedAt:'2026-10-02T17:00:00Z'
  });
  assert.equal(out.ok,true);
  assert.equal(out.w4.ok,false);
  assert.equal(out.w4.code,'EXPLICIT_USER_CHOICE_REQUIRED');
  assert.equal(out.tempDocs.some(x=>x.path.includes('/selections/')),false);
});

test('S4.72 candidates are validated/current and provider-free',()=>{
  const out=s.prepareExecution({
    caseId:'qcase_s472_sourceonly',
    ownerAttestationSha256:'d'.repeat(64),
    validatedAt:'2026-10-02T16:50:00Z',
    generatedAt:'2026-10-02T17:00:00Z'
  });
  assert.equal(out.ok,true);
  for(const p of out.proposalValues){
    assert.equal(p.validationState,'VALIDATED');
    assert.equal(p.isCurrentVersion,true);
    assert.equal(p.versionNumber,1);
    assert.equal(p.provenance.humanValidated,true);
    assert.equal(p.provenance.providerOrRaterCallsExecuted,0);
    assert.equal(p.provenance.rawDocumentStoredInCotComp,false);
    assert.equal(p.provenance.piiCopiedToProposal,false);
  }
});

test('S4.72 journal is unique and exactly seven temp paths',()=>{
  const out=s.prepareExecution({
    caseId:'qcase_s472_sourceonly',
    ownerAttestationSha256:'c'.repeat(64),
    validatedAt:'2026-10-02T16:50:00Z',
    generatedAt:'2026-10-02T17:00:00Z'
  });
  assert.equal(out.ok,true);
  assert.equal(new Set(out.tempDocs.map(x=>x.path)).size,7);
});
