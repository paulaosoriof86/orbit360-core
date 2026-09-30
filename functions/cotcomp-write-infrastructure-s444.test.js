'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const driver=require('./cotcomp-lab-firestore-driver-s444');
const audit=require('./cotcomp-audit-adapter-s444');
const saga=require('./cotcomp-saga-compensation-s444');
const harness=require('./cotcomp-controlled-write-rollback-harness-s444');
const preflight=require('./cotcomp-w1-preflight-s444');

function ctx(){
  return {
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    actorType:'SERVER_COTCOMP_WRITER',
    publicBrowser:false
  };
}

test('S4.44 Firestore driver candidate remains execution closed',()=>{
  assert.equal(driver.EXECUTION_ENABLED,false);
  assert.equal(driver.WRITE_CALLS_ALLOWED,false);
  assert.equal(driver.DELETE_CALLS_ALLOWED,false);
  assert.throws(()=>driver.assertExecutionClosed(),{code:'COTCOMP_S444_FIRESTORE_DRIVER_EXECUTION_DISABLED'});
});

test('driver maps create-if-absent to transaction.create and validates LAB path',()=>{
  const c=driver.compileCommand({
    type:'CREATE_IF_ABSENT',
    path:'tenants/alianzas-soluciones/cotcomp/quoteCases/items/qcase_1'
  });
  assert.equal(c.ok,true);
  assert.equal(c.firestoreMethod,'transaction.create');
  assert.equal(c.precondition,'MUST_NOT_EXIST');
  assert.equal(c.executable,false);
});

test('driver rejects cross-tenant path',()=>{
  const c=driver.compileCommand({
    type:'CREATE_IF_ABSENT',
    path:'tenants/otro/cotcomp/quoteCases/items/qcase_1'
  });
  assert.equal(c.ok,false);
});

test('audit adapter is deterministic sanitized and execution closed',()=>{
  const input={
    tenantId:'alianzas-soluciones',
    caseId:'qcase_1',
    correlationId:'corr_1',
    type:'W1_CORE',
    status:'PASS',
    digest:'abc123',
    proofRunId:'proof_1',
    synthetic:true
  };
  const a=audit.buildAuditRecord(input);
  const b=audit.buildAuditRecord(input);
  assert.equal(a.ok,true);
  assert.equal(a.id,b.id);
  assert.match(a.path,/tenants\/alianzas-soluciones\/cotcomp\/events\/items\/aud_/);
  assert.equal(a.record.synthetic,true);
  assert.equal(a.executable,false);
  assert.throws(()=>audit.assertExecutionClosed(),{code:'COTCOMP_S444_AUDIT_EXECUTION_DISABLED'});
});

test('saga never reports complete success from a partial group outcome',()=>{
  const p=saga.partialOutcome({
    completedGroups:['CORE'],
    failedGroup:'WORKFLOW',
    errorCode:'FAIL'
  });
  assert.equal(p.state,'COMPENSATION_REQUIRED');
  assert.equal(p.reportCompleteSuccess,false);
});

test('compensation requires synthetic proof journal and exact digests',()=>{
  const bad=saga.compensationPlan({
    state:'COMPENSATION_REQUIRED',
    syntheticOnly:false,
    proofRunId:'',
    createdPaths:['p1'],
    createdDigests:{}
  });
  assert.equal(bad.ok,false);
  assert.ok(bad.reasons.includes('SYNTHETIC_ONLY_REQUIRED'));
  assert.ok(bad.reasons.includes('PROOF_RUN_ID_REQUIRED'));
});

test('source-only controlled-write harness proves idempotency conflict deny cleanup and final absence',()=>{
  const r=harness.runInMemoryProof();
  assert.equal(r.sideEffectsAllowed,false);
  assert.equal(r.compiledCorePass,true);
  assert.equal(r.firstReadbackPass,true);
  assert.equal(r.samePayloadRetryPass,true);
  assert.equal(r.samePayloadDuplicateCreated,false);
  assert.equal(r.conflictingPayloadDenied,true);
  assert.equal(r.auditPreviewPass,true);
  assert.equal(r.partialSuccessReportedAsComplete,false);
  assert.equal(r.compensationPlanPass,true);
  assert.equal(r.cleanupPass,true);
  assert.equal(r.finalAbsence,true);
  assert.equal(r.appDataWritesExecuted,0);
  assert.equal(r.realDataUsed,false);
  assert.equal(r.productionTouched,false);
});

test('W1 source preflight is ready for Owner gate but still cannot write',()=>{
  const s=preflight.currentState();
  assert.equal(s.sourceReadyForOwnerW1Gate,true);
  assert.equal(s.executionEnabled,false);
  assert.equal(s.effectiveWriteAllowed,false);
  assert.equal(s.storageDriverCandidateReady,true);
  assert.equal(s.auditAdapterCandidateReady,true);
  assert.equal(s.sagaCandidateReady,true);
  assert.equal(s.rollbackHarnessSourcePass,true);
  assert.equal(s.ownerW1AuthorizationPresent,false);
  assert.equal(s.deployAuthorizationPresent,false);
  assert.deepEqual(s.remainingGateBlockers,[
    'OWNER_W1_SYNTHETIC_WRITE_AUTHORIZATION_REQUIRED',
    'W1_LAB_DEPLOY_AUTHORIZATION_REQUIRED'
  ]);
});
