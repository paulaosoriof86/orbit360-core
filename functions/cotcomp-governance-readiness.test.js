'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const r=require('./cotcomp-governance-readiness');
const g=require('./cotcomp-governance-policy');
const s=require('./cotcomp-lab-storage-adapter-candidate');

function base(){
  return {
    governancePolicyVersion:g.VERSION,
    ownerGovernanceApproval:true,
    formalLegalValidationComplete:false,
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    workflowStorageMode:'canonicalV2',
    workflowOwnerBlobDeployed:s.EXPECTED.workflowOwnerBlob,
    negativeSecurityQaPass:true,
    ownerWriteAuthorization:false,
    deployAuthorization:false
  };
}

test('current state remains blocked on formal legal validation',()=>{
  const out=r.evaluateGovernanceReadiness(base());
  assert.equal(out.ok,false);
  assert.ok(out.reasons.includes('FORMAL_LEGAL_VALIDATION_REQUIRED'));
  assert.equal(out.retentionPolicyApproved,false);
  assert.equal(out.caseAccessPersistenceApproved,false);
  assert.equal(out.effectiveRuntimeAllowed,false);
});

test('wrong governance version fails closed',()=>{
  const out=r.evaluateGovernanceReadiness({...base(),governancePolicyVersion:'old'});
  assert.equal(out.ok,false);
  assert.ok(out.reasons.includes('GOVERNANCE_POLICY_VERSION_MISMATCH'));
});

test('owner approval is independently required',()=>{
  const out=r.evaluateGovernanceReadiness({...base(),ownerGovernanceApproval:false});
  assert.ok(out.reasons.includes('OWNER_GOVERNANCE_APPROVAL_REQUIRED'));
});

test('legal validation may satisfy governance but not write/deploy gates',()=>{
  const out=r.evaluateGovernanceReadiness({...base(),formalLegalValidationComplete:true});
  assert.equal(out.retentionPolicyApproved,true);
  assert.equal(out.caseAccessPersistenceApproved,true);
  assert.ok(out.reasons.includes('OWNER_WRITE_AUTHORIZATION_REQUIRED'));
  assert.ok(out.reasons.includes('DEPLOY_AUTHORIZATION_REQUIRED'));
  assert.equal(out.effectiveRuntimeAllowed,false);
});

test('missing deployed workflow proof remains independently blocking',()=>{
  const out=r.evaluateGovernanceReadiness({
    ...base(),
    formalLegalValidationComplete:true,
    workflowOwnerBlobDeployed:'not-deployed'
  });
  assert.ok(out.reasons.includes('WORKFLOW_SCHEMA_DEPLOY_PROOF_REQUIRED'));
});

test('negative security QA remains independently required',()=>{
  const out=r.evaluateGovernanceReadiness({
    ...base(),
    formalLegalValidationComplete:true,
    negativeSecurityQaPass:false
  });
  assert.ok(out.reasons.includes('NEGATIVE_SECURITY_QA_REQUIRED'));
});

test('even all logical prerequisites cannot open runtime while hard locks are false',()=>{
  const out=r.evaluateGovernanceReadiness({
    ...base(),
    formalLegalValidationComplete:true,
    ownerWriteAuthorization:true,
    deployAuthorization:true
  });
  assert.equal(out.ok,true);
  assert.equal(out.runtimeEnabledByCode,false);
  assert.equal(out.writesEnabledByCode,false);
  assert.equal(out.deployAllowedByCode,false);
  assert.equal(out.effectiveRuntimeAllowed,false);
});

test('snapshot matches owner-approved S4.26 decisions',()=>{
  const snap=r.currentGovernanceSnapshot();
  assert.equal(snap.draftInactivityDays,30);
  assert.equal(snap.unconvertedRetentionMonths,12);
  assert.equal(snap.caseAccessLifetimeDays,7);
  assert.equal(snap.rawTokenPersistenceAllowed,false);
  assert.equal(snap.marketingConsentSeparate,true);
});
