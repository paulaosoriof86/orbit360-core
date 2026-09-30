'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const p=require('./cotcomp-legal-evidence-provenance');
const g=require('./cotcomp-governance-policy');

function evidence(country='GT'){
  return {
    country,
    sourceType:'FORMAL_COUNSEL_OPINION',
    reviewedPolicyVersion:g.VERSION,
    documentReference:country+'-LEGAL-2026-001',
    documentFileName:'dictamen-'+country+'.pdf',
    documentSha256:'a'.repeat(64),
    issuedBy:'Firma Jurídica',
    issuedAt:'2026-09-30',
    signedOrOfficial:true,
    derivedFromPublicResearch:false
  };
}

test('provenance remains source-only and hard locked',()=>{
  assert.equal(p.RUNTIME_ENABLED,false);
  assert.equal(p.WRITES_ENABLED,false);
  assert.equal(p.DEPLOY_ALLOWED,false);
});

test('formal signed counsel evidence passes',()=>{
  const r=p.validateEvidenceProvenance(evidence('GT'));
  assert.equal(r.ok,true);
  assert.equal(r.value.country,'GT');
});

test('public research can never become formal counsel evidence',()=>{
  const r=p.validateEvidenceProvenance({...evidence('CO'),derivedFromPublicResearch:true});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('PUBLIC_RESEARCH_CANNOT_BE_COUNSEL_EVIDENCE'));
});

test('unsigned evidence fails closed',()=>{
  const r=p.validateEvidenceProvenance({...evidence('GT'),signedOrOfficial:false});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('SIGNED_OR_OFFICIAL_EVIDENCE_REQUIRED'));
});

test('invalid document hash fails closed',()=>{
  const r=p.validateEvidenceProvenance({...evidence('GT'),documentSha256:'bad'});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('DOCUMENT_SHA256_REQUIRED'));
});

test('owner acceptance binds exact policy version and evidence hash',()=>{
  const r=p.ownerAcceptanceRecord({
    country:'GT',
    policyVersion:g.VERSION,
    ownerAccepted:true,
    acceptedAt:'2026-09-30T12:00:00-06:00',
    evidenceDocumentSha256:'b'.repeat(64)
  });
  assert.equal(r.ok,true);
  assert.equal(r.value.policyVersion,g.VERSION);
});

test('owner acceptance cannot bind wrong policy version',()=>{
  const r=p.ownerAcceptanceRecord({
    country:'GT',
    policyVersion:'old',
    ownerAccepted:true,
    acceptedAt:'2026-09-30T12:00:00-06:00',
    evidenceDocumentSha256:'b'.repeat(64)
  });
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('POLICY_VERSION_MISMATCH'));
});
