'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const intake=require('./cotcomp-counsel-packet-intake');

test('current intake status records no formal country submissions',()=>{
  const s=intake.currentIntakeStatus();
  assert.equal(s.GT,'ABSENT');
  assert.equal(s.CO,'ABSENT');
  assert.equal(s.formalLegalValidationComplete,false);
});

test('empty country submission fails closed',()=>{
  const r=intake.normalizeSubmission({});
  assert.equal(r.ok,false);
  assert.equal(r.intakeStatus,'REJECTED');
  assert.ok(r.reasons.includes('LEGAL_PACKET_INVALID'));
  assert.ok(r.reasons.includes('LEGAL_EVIDENCE_PROVENANCE_INVALID'));
  assert.ok(r.reasons.includes('OWNER_ACCEPTANCE_INVALID'));
});

test('empty dual-country intake cannot complete formal validation',()=>{
  const r=intake.evaluateDualCountryIntake({});
  assert.equal(r.ok,false);
  assert.equal(r.formalLegalValidationComplete,false);
  assert.ok(r.reasons.includes('GT_COUNSEL_SUBMISSION_INVALID'));
  assert.ok(r.reasons.includes('CO_COUNSEL_SUBMISSION_INVALID'));
  assert.equal(r.effectiveRuntimeAllowed,false);
});
