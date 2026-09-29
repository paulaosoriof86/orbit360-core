'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const e = require('./cotcomp-runtime-entry-candidate');
const d = require('./cotcomp-staging-deps-candidate');

test('staging dependencies fail closed until real read-only adapters exist', () => {
  assert.equal(d.READY,false);
  assert.equal(d.PERSISTENCE_ENABLED,false);
});

test('candidate export gate remains hard off', () => {
  assert.equal(e.RUNTIME_EXPORT_ALLOWED,false);
  assert.equal(e.DEPLOY_ALLOWED,false);
  assert.equal(e.WRITES_ALLOWED,false);
});

test('candidate shape contains exactly four callables', () => {
  assert.deepEqual(e.previewCallableShape(),[
    'cotcompValidateDraft',
    'cotcompSubmitHandoff',
    'cotcompFetchComparableProposals',
    'cotcompSelectProposal'
  ]);
});

test('candidate gate requires LAB, owner authorization, QA and S4.12 gate', () => {
  const r=e.evaluateCandidateGate({
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    ownerRuntimeAuthorization:false,
    sourceQaPass:true,
    s412GatePass:true,
    persistenceEnabled:false
  });
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('OWNER_RUNTIME_AUTHORIZATION_REQUIRED'));
  assert.ok(r.reasons.includes('STAGING_DEPS_NOT_READY'));
});

test('candidate never returns runtime exports while code gate is false', () => {
  const r=e.buildCandidateExports({
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    ownerRuntimeAuthorization:true,
    sourceQaPass:true,
    s412GatePass:true,
    persistenceEnabled:false
  });
  assert.equal(r.ok,false);
  assert.deepEqual(r.exports,{});
  assert.equal(r.reason,'RUNTIME_EXPORT_GATE_CLOSED');
});
