'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const v=require('./cotcomp-w3-remediation-verifier-s452');

test('S4.52 remediation verifier closes all technical W3 source blockers only',()=>{
  const r=v.evaluate();
  assert.equal(r.sourceRemediationPass,true);
  assert.equal(r.technicalW3Ready,true);
  assert.equal(r.physicalW3Ready,false);
  assert.equal(r.physicalW3Allowed,false);
  assert.deepEqual(r.remainingBlockers,['OWNER_W3_AUTHORIZATION_REQUIRED']);
});

test('S4.52 verifier freezes canonical case link, persisted validity, idempotency and rollback',()=>{
  const r=v.evaluate();
  assert.equal(r.findings.canonicalCaseField,'caseId');
  assert.equal(r.findings.publicAlias,'quoteCaseId');
  assert.equal(r.findings.aliasConflictDenied,true);
  assert.equal(r.findings.proposalVersionSpecificId,true);
  assert.equal(r.findings.sequentialSupersession,true);
  assert.equal(r.findings.currentValidityFromPersistedInterval,true);
  assert.equal(r.findings.idempotencyContract,true);
  assert.equal(r.findings.rollbackJournalCreatedDocuments,4);
  assert.equal(r.findings.rollbackCleanupPaths,4);
});

test('S4.52 remains zero-read zero-write source-only',()=>{
  const r=v.evaluate();
  assert.equal(r.boundaries.executionEnabled,false);
  assert.equal(r.boundaries.appDataReadsAllowed,false);
  assert.equal(r.boundaries.appDataWritesAllowed,false);
  assert.equal(r.boundaries.providerOrRaterCallsAllowed,false);
  assert.equal(r.boundaries.realDataAllowed,false);
  assert.equal(r.boundaries.productionAllowed,false);
  assert.equal(r.findings.noRuntimeWriterImports,true);
});
