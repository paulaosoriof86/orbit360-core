'use strict';

const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-owner-proposal-evidence-s470');

test('S4.70 remains source-only and non-production',()=>{
  assert.equal(s.EXECUTION_ENABLED,false);
  assert.equal(s.APP_DATA_READS_ALLOWED,false);
  assert.equal(s.APP_DATA_WRITES_ALLOWED,false);
  assert.equal(s.REAL_DATA_ALLOWED,false);
  assert.equal(s.PROVIDER_OR_RATER_CALLS_ALLOWED,false);
  assert.equal(s.PRODUCTION_ALLOWED,false);
});

test('S4.70 bundle contains two documents and three documentary alternatives',()=>{
  const r=s.sourceBundleReadiness();
  assert.equal(r.sourceBundleReady,true);
  assert.equal(r.uniqueSourceDocuments,2);
  assert.equal(r.documentaryAlternatives,3);
  assert.equal(r.ownerHumanValidationRequired,true);
  assert.equal(r.ownerHumanValidationPresent,false);
  assert.equal(r.realProposalCreated,false);
});

test('S4.70 refuses to promote uploaded evidence without Owner human-validation commitment',()=>{
  const r=s.buildValidatedPackets({caseId:'qcase_sourceonly',validatedAt:'2026-10-02T16:00:00Z'});
  assert.equal(r.ok,false);
  assert.equal(r.code,'OWNER_HUMAN_VALIDATION_REQUIRED');
});

test('S4.70 can map all three alternatives to existing S4.69 Proposal contract after attestation',()=>{
  const r=s.buildSourceOnlyCandidates({
    caseId:'qcase_sourceonly',
    ownerAttestationSha256:'f'.repeat(64),
    validatedAt:'2026-10-02T16:00:00Z',
    asOf:'2026-10-02T16:00:00Z'
  });
  assert.equal(r.ok,true);
  assert.equal(r.candidates.length,3);
  for(const c of r.candidates){
    assert.equal(c.eligibleForRealW3,true);
    assert.equal(c.plan.proposal.validationState,'VALIDATED');
    assert.equal(c.plan.proposal.caseId,'qcase_sourceonly');
    assert.equal(c.plan.proposal.provenance.providerOrRaterCallsExecuted,0);
    assert.equal(c.plan.proposal.provenance.rawDocumentStoredInCotComp,false);
    assert.equal(c.plan.proposal.provenance.piiCopiedToProposal,false);
  }
});

test('S4.70 source contains no participant PII from uploaded PDFs',()=>{
  const src=fs.readFileSync(require.resolve('./cotcomp-owner-proposal-evidence-s470'),'utf8');
  for(const forbidden of [
    'Monica Marroquin','MONICA MARROQUIN','finanzasyadmin@aysseguros.com','12345678',
    'Danilo Alvarez','Luis Lopez','Laura Bariatti','Elizabeth'
  ]){
    assert.equal(src.includes(forbidden),false);
  }
});

test('S4.70 preserves missing semantics and no silent ranking claims',()=>{
  const names=s.ALTERNATIVES.map(x=>x.planName);
  assert.deepEqual(names,['Aseguate Premium','Aseguate Plus','Seguro de Automóvil']);
  const premium=s.ALTERNATIVES.map(x=>x.premium);
  assert.deepEqual(premium,[2508.80,2273.60,3292.80]);
  assert.equal(s.ALTERNATIVES[1].coverages.lockDamage,'NOT_COVERED');
  assert.equal(Object.prototype.hasOwnProperty.call(s.ALTERNATIVES[2].coverages,'lockDamage'),false);
});
