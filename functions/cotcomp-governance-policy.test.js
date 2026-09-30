'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const p=require('./cotcomp-governance-policy');

test('owner policy is approved but legal validation remains open',()=>{
  assert.equal(p.OWNER_APPROVED,true);
  assert.equal(p.LEGAL_VALIDATION_REQUIRED,true);
  assert.equal(p.LEGAL_VALIDATION_COMPLETE,false);
  assert.equal(p.RUNTIME_ENABLED,false);
  assert.equal(p.WRITES_ENABLED,false);
  assert.equal(p.DEPLOY_ALLOWED,false);
});

test('draft inactivity retention is 30 days',()=>{
  const r=p.evaluateRetention({state:'DRAFT',lastActivityAt:'2026-09-30T12:00:00Z'});
  assert.equal(r.ok,true);
  assert.equal(r.policy,'DRAFT_INACTIVE');
  assert.equal(r.deadline,'2026-10-30T12:00:00.000Z');
  assert.equal(r.action,'DELETE_OR_ANONYMIZE');
});

test('submitted not converted retention is 12 calendar months',()=>{
  const r=p.evaluateRetention({state:'CLOSED_NOT_CONVERTED',closedAt:'2026-09-30T12:00:00Z'});
  assert.equal(r.ok,true);
  assert.equal(r.policy,'SUBMITTED_NOT_CONVERTED');
  assert.equal(r.deadline,'2027-09-30T12:00:00.000Z');
});

test('month-end retention calculation is calendar safe',()=>{
  const r=p.evaluateRetention({state:'CLOSED_NOT_CONVERTED',closedAt:'2026-02-28T12:00:00Z'});
  assert.equal(r.deadline,'2027-02-28T12:00:00.000Z');
});

test('converted case requires confirmed transition',()=>{
  assert.equal(p.evaluateRetention({state:'CONVERTED_TO_CLIENT'}).code,'CONVERSION_CONFIRMATION_REQUIRED');
  const r=p.evaluateRetention({state:'CONVERTED_TO_CLIENT',conversionConfirmed:true});
  assert.equal(r.ok,true);
  assert.equal(r.action,'HANDOFF_TO_GRAVICENTRA_CLIENT_POLICY_GOVERNANCE');
  assert.equal(r.cotcompAutomaticDeletionAllowed,false);
});

test('case-access token lifetime is seven days',()=>{
  const r=p.evaluateCaseAccess({
    issuedAt:'2026-09-30T12:00:00Z',
    quoteCaseId:'qcase_1',
    tokenHash:'abc',
    now:'2026-10-07T11:59:59Z'
  });
  assert.equal(r.ok,true);
  assert.equal(r.expiresAt,'2026-10-07T12:00:00.000Z');
});

test('case-access expires exactly at seven days',()=>{
  const r=p.evaluateCaseAccess({
    issuedAt:'2026-09-30T12:00:00Z',
    quoteCaseId:'qcase_1',
    tokenHash:'abc',
    now:'2026-10-07T12:00:00Z'
  });
  assert.equal(r.ok,false);
  assert.equal(r.code,'CASE_ACCESS_EXPIRED');
});

test('revocation requires a frozen reason and fails closed',()=>{
  const r=p.evaluateCaseAccess({
    issuedAt:'2026-09-30T12:00:00Z',
    quoteCaseId:'qcase_1',
    tokenHash:'abc',
    revokedAt:'2026-10-01T12:00:00Z',
    revocationReason:'CASE_CLOSED',
    now:'2026-10-02T12:00:00Z'
  });
  assert.equal(r.ok,false);
  assert.equal(r.code,'CASE_ACCESS_REVOKED');
  assert.equal(r.revocationReason,'CASE_CLOSED');
});

test('raw case token persistence remains forbidden',()=>{
  assert.equal(p.CASE_ACCESS.rawTokenPersistenceAllowed,false);
  assert.equal(p.CASE_ACCESS.tokenHashPersistenceAllowed,true);
  assert.equal(p.CASE_ACCESS.boundToSingleQuoteCase,true);
});

test('renewal rotates token and revokes previous token',()=>{
  assert.equal(p.CASE_ACCESS.renewalCreatesNewToken,true);
  assert.equal(p.CASE_ACCESS.previousTokenRevokedOnRenewal,true);
});

test('marketing consent remains separate and optional',()=>{
  assert.equal(p.CONSENT.requestManagementSeparateFromMarketing,true);
  assert.equal(p.CONSENT.marketingOptional,true);
  assert.equal(p.CONSENT.marketingDefault,false);
  assert.equal(p.CONSENT.noBundledConsent,true);
});

test('governance gate remains closed without formal legal validation',()=>{
  const r=p.governanceGate({ownerApproval:true,legalValidationComplete:false});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('FORMAL_LEGAL_VALIDATION_REQUIRED'));
  assert.equal(r.effectiveRuntimeAllowed,false);
});

test('even owner+legal logical approval does not open runtime by code',()=>{
  const r=p.governanceGate({ownerApproval:true,legalValidationComplete:true});
  assert.equal(r.ok,true);
  assert.equal(r.runtimeEnabled,false);
  assert.equal(r.writesEnabled,false);
  assert.equal(r.deployAllowed,false);
  assert.equal(r.effectiveRuntimeAllowed,false);
});
