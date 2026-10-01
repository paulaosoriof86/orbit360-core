'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w5-governance-reconcile-s459');

test('S4.59 reconciles no-counsel exception with W5 and keeps real data blocked',()=>{
  const r=s.evaluate();
  assert.equal(r.sourceReconciliationPass,true);
  assert.equal(r.ownerNoCounselException.realDataWritesAllowed,false);
  assert.equal(r.ownerNoCounselException.productionReleaseAllowed,false);
  assert.equal(r.noCounselExceptionCanAuthorizeW5RealData,false);
  assert.equal(r.realDataPilotExecutionAllowed,false);
});

test('S4.59 confirms legal evidence is still incomplete',()=>{
  const r=s.evaluate();
  assert.equal(r.legalEvidence.gtLegalPacketPresent,false);
  assert.equal(r.legalEvidence.coLegalPacketPresent,false);
  assert.equal(r.legalEvidence.formalLegalValidationComplete,false);
  assert.equal(r.legalEvidence.evidenceSource,'NO_COUNSEL_PACKETS_RECORDED');
});

test('S4.59 confirms technical W5 contract is ready but external gates remain',()=>{
  const r=s.evaluate();
  assert.equal(r.technicalW5Ready,true);
  assert.deepEqual(r.remainingBlockers,[
    'FORMAL_LEGAL_VALIDATION_REQUIRED',
    'W5_EXACT_PILOT_SCOPE_REQUIRED',
    'W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED',
    'OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED'
  ]);
  assert.equal(r.boundaries.appDataReadsAllowed,false);
  assert.equal(r.boundaries.appDataWritesAllowed,false);
  assert.equal(r.boundaries.realDataAllowed,false);
});
