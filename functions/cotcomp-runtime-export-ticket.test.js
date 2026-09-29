'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const t = require('./cotcomp-runtime-export-ticket');

test('runtime export ticket is hard-off by code', () => {
  assert.equal(t.RUNTIME_EXPORT_ALLOWED,false);
  assert.equal(t.DEPLOY_ALLOWED,false);
  assert.equal(t.WRITES_ALLOWED,false);
});

test('target is LAB only', () => {
  assert.equal(t.TARGET.projectId,'ays-orbit-360-lab');
  assert.equal(t.TARGET.environment,'LAB');
  assert.deepEqual(t.TARGET.productionProjectIds,[]);
});

test('all proposed exports preserve App Check and no writes', () => {
  for (const item of Object.values(t.EXPORTS)) {
    assert.equal(item.appCheck,true);
    assert.equal(item.writes,false);
  }
});

test('proposal read and selection require case access', () => {
  assert.equal(t.EXPORTS.cotcompFetchComparableProposals.caseAccess,true);
  assert.equal(t.EXPORTS.cotcompSelectProposal.caseAccess,true);
});

test('mutation-sensitive candidates keep replay protection', () => {
  assert.equal(t.EXPORTS.cotcompSubmitHandoff.replayProtection,true);
  assert.equal(t.EXPORTS.cotcompSelectProposal.replayProtection,true);
});

test('runtime gate fails closed without explicit owner authorization', () => {
  const r = t.evaluateRuntimeGate({
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    sourceQaPass:true,
    caseAccessContractFrozen:true,
    persistenceEnabled:false,
    deployRequested:false
  });
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('OWNER_RUNTIME_AUTHORIZATION_REQUIRED'));
  assert.equal(r.effectiveExportAllowed,false);
});

test('even a logically satisfied ticket does not export because code gate remains off', () => {
  const r = t.evaluateRuntimeGate({
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    ownerRuntimeAuthorization:true,
    sourceQaPass:true,
    caseAccessContractFrozen:true,
    persistenceEnabled:false,
    deployRequested:false
  });
  assert.equal(r.ok,true);
  assert.equal(r.runtimeExportAllowedByCode,false);
  assert.equal(r.effectiveExportAllowed,false);
});

test('production-like targets are denied', () => {
  const r = t.evaluateRuntimeGate({
    projectId:'some-production-project',
    environment:'PROD',
    ownerRuntimeAuthorization:true,
    sourceQaPass:true,
    caseAccessContractFrozen:true,
    persistenceEnabled:false
  });
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('PROJECT_NOT_LAB'));
  assert.ok(r.reasons.includes('ENVIRONMENT_NOT_LAB'));
});

test('future bootstrap delta is descriptive only', () => {
  const r = t.proposedBootstrapDelta();
  assert.equal(r.action,'FUTURE_DIFF_ONLY');
  assert.equal(r.applyNow,false);
  assert.deepEqual(r.exports.sort(),Object.keys(t.EXPORTS).sort());
});
