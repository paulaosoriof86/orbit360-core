'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const p=require('./cotcomp-persistence-plan');

test('planner cannot execute or write',()=>{
  assert.equal(p.EXECUTION_ENABLED,false);
  assert.equal(p.FIRESTORE_IMPORTED,false);
  assert.equal(p.WRITES_ENABLED,false);
});

test('write gate fails closed on every missing governance/runtime dependency',()=>{
  const r=p.writeGate({});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('PROJECT_NOT_LAB'));
  assert.ok(r.reasons.includes('RETENTION_POLICY_REQUIRED'));
  assert.ok(r.reasons.includes('WORKFLOW_COTCOMP_SCHEMA_EXTENSION_REQUIRED'));
  assert.ok(r.reasons.includes('OWNER_WRITE_AUTHORIZATION_REQUIRED'));
  assert.equal(r.effectiveWriteAllowed,false);
});

test('logically satisfied gate still cannot write because code lock is false',()=>{
  const r=p.writeGate({
    projectId:'ays-orbit-360-lab',environment:'LAB',dataContractQaPass:true,
    workflowStorageMode:'canonicalV2',workflowCotCompFieldsSupported:true,
    retentionPolicyApproved:true,caseAccessPersistenceApproved:true,ownerWriteAuthorization:true
  });
  assert.equal(r.ok,true);
  assert.equal(r.writesEnabledByCode,false);
  assert.equal(r.effectiveWriteAllowed,false);
});

function sample(){
  return {
    tenantId:'alianzas-soluciones',
    idempotencyKey:'idem-100',
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

test('initial handoff plan is save-first and deterministic',()=>{
  const a=p.buildInitialHandoffPlan(sample());
  const b=p.buildInitialHandoffPlan(sample());
  assert.equal(a.ok,true);
  assert.deepEqual(a.identifiers,b.identifiers);
  assert.equal(a.phases[0].phase,'CASE_COMMIT');
  assert.equal(a.phases[1].phase,'OPERATIONS_PROJECTION');
  assert.equal(a.phases[2].phase,'EVENT_AND_OUTBOX');
  assert.equal(a.invariant.quoteCaseSurvivesNotificationFailure,true);
});

test('case access plan stores no raw token',()=>{
  const r=p.buildInitialHandoffPlan(sample());
  const op=r.phases[0].operations.find(x=>x.entity==='caseAccess');
  assert.equal(op.payload.rawTokenStored,false);
  assert.equal(Object.prototype.hasOwnProperty.call(op.payload,'rawToken'),false);
});

test('lead and ops projections carry the same case/journey/correlation',()=>{
  const r=p.buildInitialHandoffPlan(sample());
  const lead=r.phases[1].operations[0];
  const ops=r.phases[1].operations[1];
  assert.equal(lead.requiredFields.caseId,ops.requiredFields.caseId);
  assert.equal(lead.requiredFields.journeyId,ops.requiredFields.journeyId);
  assert.equal(lead.requiredFields.correlationId,ops.requiredFields.correlationId);
  assert.equal(ops.requiredFields.businessId,r.identifiers.leadBusinessId);
});

test('undeployed workflow schema blocker is explicit',()=>{
  const r=p.buildInitialHandoffPlan(sample());
  assert.equal(r.phases[1].blockedByUndeployedWorkflowSchema,true);
  assert.ok(r.blockers.includes('WORKFLOW_COTCOMP_SCHEMA_MERGED_SOURCE_NOT_DEPLOYED'));
});

test('notification is outbox-only and cannot invalidate the case',()=>{
  const r=p.buildInitialHandoffPlan(sample());
  const outbox=r.phases[2].operations.find(x=>x.entity==='notificationOutbox');
  assert.deepEqual(outbox.payload.channels,['in_app','whatsapp','email']);
  assert.equal(outbox.payload.status,'PREPARED');
  assert.equal(outbox.payload.deliveryClaim,'NOT_YET_ATTEMPTED');
  assert.equal(r.invariant.quoteCaseSurvivesNotificationFailure,true);
});

test('proposal plan preserves validated/current gate and no ranking',()=>{
  const r=p.buildProposalPlan({proposal:{
    tenantId:'alianzas-soluciones',proposalId:'p1',caseId:'qcase_1',country:'GT',
    product:'AUTO',currency:'GTQ',insurerId:'ins1',sourceId:'src1',validationState:'RECEIVED'
  }});
  assert.equal(r.ok,true);
  assert.equal(r.comparisonEligibility.requiredValidationState,'VALIDATED');
  assert.equal(r.comparisonEligibility.currentValidityRequired,true);
  assert.equal(r.comparisonEligibility.rankingPolicy,'NONE_BY_DEFAULT');
});

test('selection plan is explicit and remains non-binding truth',()=>{
  const blocked=p.buildSelectionPlan({explicitUserChoice:false});
  assert.equal(blocked.ok,false);
  const r=p.buildSelectionPlan({
    tenantId:'alianzas-soluciones',caseId:'qcase_1',comparisonSetId:'cmp_1',
    proposalId:'p1',selectionRequestKey:'select-1',explicitUserChoice:true
  });
  assert.equal(r.ok,true);
  assert.equal(r.truth.issuanceState,'NOT_ISSUED');
  assert.equal(r.truth.bindingState,'NOT_BOUND');
  assert.equal(r.truth.coverageState,'NOT_CONFIRMED');
});

test('planner explicitly forbids direct public workflow writes',()=>{
  const r=p.buildInitialHandoffPlan(sample());
  assert.equal(r.invariant.directPublicWorkflowWriteForbidden,true);
});
