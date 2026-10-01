'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w3-controlled-proof-s453');

test('S4.53 is pinned to LAB and synthetic-only identifiers',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  const f=s.fixture('s453-123456');
  assert.equal(f.v1.ok,true);
  assert.equal(f.v2.ok,true);
  assert.equal(f.allPaths.length,4);
  assert.notEqual(f.v1.proposal.proposalId,f.v2.proposal.proposalId);
});

test('S4.53 fixture freezes V1/V2 sequential supersession contract',()=>{
  const f=s.fixture('s453-123456');
  assert.equal(f.v1.proposal.versionNumber,1);
  assert.equal(f.v2.proposal.versionNumber,2);
  assert.equal(f.v2.proposal.supersedesProposalId,f.v1.proposal.proposalId);
  assert.equal(f.v1.proposal.provenance.synthetic,true);
  assert.equal(f.v1.proposal.provenance.proofRunId,'s453-123456');
});

test('S4.53 source excludes provider/rater calls and production target',()=>{
  const fs=require('node:fs');
  const src=fs.readFileSync(require.resolve('./cotcomp-w3-controlled-proof-s453'),'utf8');
  assert.doesNotMatch(src,/twilio|sendgrid|nodemailer|mailgun|whatsapp|wa\.me/i);
  assert.match(src,/providerOrRaterCallsExecuted:0/);
  assert.match(src,/productionTouched:false/);
  assert.match(src,/netPersistentDocuments:0/);
});
