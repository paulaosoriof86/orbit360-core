'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const a=require('./cotcomp-persistence-adapter-candidate');

function sample(){
  return {
    tenantId:'alianzas-soluciones',
    idempotencyKey:'idem-s421-1',
    journeyId:'GT_AUTO_MOTO_HYBRID',
    country:'GT',
    product:'AUTO',
    capturedFields:{brand:'Toyota',lineModel:'Corolla'},
    missingFields:[],
    contact:{name:'Paula',whatsapp:'+50255555555',email:'paula@example.com'},
    consents:{requestManagement:true},
    caseAccessToken:'opaque-token',
    caseAccessExpiresAt:'2026-09-30T12:00:00Z',
    gate:{}
  };
}

test('adapter is dry-run only and imports no Firestore',()=>{
  assert.equal(a.DRY_RUN_ONLY,true);
  assert.equal(a.EXECUTION_ENABLED,false);
  assert.equal(a.WRITES_ENABLED,false);
  assert.equal(a.FIRESTORE_IMPORTED,false);
});

test('initial handoff compiles deterministic commands without executing',()=>{
  const x=a.compileInitialHandoff(sample());
  const y=a.compileInitialHandoff(sample());
  assert.equal(x.ok,true);
  assert.deepEqual(x.identifiers,y.identifiers);
  assert.deepEqual(x.commands,y.commands);
  assert.equal(x.executionEnabled,false);
});

test('workflow projection commands are blocked until deployed schema exists',()=>{
  const r=a.compileInitialHandoff(sample());
  const workflow=r.commands.filter(x=>x.phase==='OPERATIONS_PROJECTION');
  assert.equal(workflow.length,2);
  assert.ok(workflow.every(x=>x.blocked===true));
  assert.ok(workflow.every(x=>x.blockReason==='WORKFLOW_COTCOMP_SCHEMA_NOT_DEPLOYED'));
});

test('case commit commands remain visible in dry-run plan',()=>{
  const r=a.compileInitialHandoff(sample());
  const entities=r.commands.filter(x=>x.phase==='CASE_COMMIT').map(x=>x.entity);
  assert.deepEqual(entities,['idempotency','quoteCase','caseAccess']);
});

test('payloads are represented by digests, not leaked in command summary',()=>{
  const r=a.compileInitialHandoff(sample());
  assert.ok(r.commands.every(x=>typeof x.payloadDigest==='string' && x.payloadDigest.length===64));
  assert.equal(Object.prototype.hasOwnProperty.call(r.commands[0],'payload'),false);
});

test('proposal compile retains validated/current/no-ranking requirements',()=>{
  const r=a.compileProposal({proposal:{
    tenantId:'alianzas-soluciones',proposalId:'p1',caseId:'qcase_1',country:'GT',
    product:'AUTO',currency:'GTQ',insurerId:'ins1',sourceId:'src1',validationState:'RECEIVED'
  }});
  assert.equal(r.ok,true);
  assert.equal(r.comparisonEligibility.requiredValidationState,'VALIDATED');
  assert.equal(r.comparisonEligibility.currentValidityRequired,true);
  assert.equal(r.comparisonEligibility.rankingPolicy,'NONE_BY_DEFAULT');
});

test('selection compile remains explicit and non-binding',()=>{
  const r=a.compileSelection({
    tenantId:'alianzas-soluciones',caseId:'qcase_1',comparisonSetId:'cmp_1',
    proposalId:'p1',selectionRequestKey:'select-1',explicitUserChoice:true
  });
  assert.equal(r.ok,true);
  assert.equal(r.truth.issuanceState,'NOT_ISSUED');
  assert.equal(r.truth.bindingState,'NOT_BOUND');
  assert.equal(r.truth.coverageState,'NOT_CONFIRMED');
});

test('executeCompiled fails closed',()=>{
  assert.throws(()=>a.executeCompiled(),/COTCOMP_PERSISTENCE_EXECUTION_DISABLED/);
});
