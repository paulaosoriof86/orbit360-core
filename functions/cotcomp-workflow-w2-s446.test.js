'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const runtime=require('./cotcomp-workflow-owner-runtime-evidence-s446');
const w2=require('./cotcomp-w2-workflow-projection-candidate-s446');

test('S4.46 runtime evidence expects exact S4.20 owner blob',()=>{
  assert.equal(runtime.EXPECTED.projectId,'ays-orbit-360-lab');
  assert.equal(runtime.EXPECTED.ownerBlob,'73e09a4404cb4298dc34c9c38e26ad1f960d3170');
  assert.ok(runtime.EXPECTED.functions.includes('orbit360OpsLeadsCommand'));
});

test('runtime verification fails closed on owner mismatch',()=>{
  const r=runtime.evaluate({
    projectId:'ays-orbit-360-lab',
    region:'us-central1',
    functionObservedActive:true,
    deployedOwnerBlob:'bad',
    sourceArchiveReadSuccessful:true,
    writeExecuted:false,
    productionTouched:false
  });
  assert.equal(r.ok,false);
  assert.ok(r.blockers.includes('DEPLOYED_OWNER_BLOB_MISMATCH'));
});

test('W2 candidate stays execution and writes closed',()=>{
  assert.equal(w2.EXECUTION_ENABLED,false);
  assert.equal(w2.CALLS_ALLOWED,false);
  assert.equal(w2.WRITE_ALLOWED,false);
});

test('W2 candidate derives deterministic business and management ids',()=>{
  const a=w2.buildSyntheticProjection({
    synthetic:true,
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    caseId:'qcase_synth_1',
    journeyId:'GT_AUTO_MOTO_HYBRID',
    correlationId:'corr_synth_1',
    country:'GT',
    currency:'GTQ',
    product:'AUTO',
    line:'AUTOS',
    realData:false,
    production:false
  });
  const b=w2.buildSyntheticProjection({
    synthetic:true,
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    caseId:'qcase_synth_1',
    journeyId:'GT_AUTO_MOTO_HYBRID',
    correlationId:'corr_synth_1',
    country:'GT',
    currency:'GTQ',
    product:'AUTO',
    line:'AUTOS',
    realData:false,
    production:false
  });
  assert.equal(a.ok,true);
  assert.deepEqual(a.ids,b.ids);
  assert.equal(a.commands.length,2);
  assert.equal(a.commands[0].operation,'create_business');
  assert.equal(a.commands[1].operation,'create_management');
  assert.equal(a.executable,false);
});

test('W2 candidate carries cotcompRef into both commands',()=>{
  const x=w2.buildSyntheticProjection({
    synthetic:true,
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    caseId:'qcase_synth_2',
    journeyId:'CO_RC_PROFESIONAL_CONSULTATIVE_HYBRID',
    correlationId:'corr_synth_2',
    proposalId:'prop_synth_2',
    selectionId:'sel_synth_2',
    realData:false,
    production:false
  });
  assert.equal(x.commands[0].payload.cotcompRef.caseId,'qcase_synth_2');
  assert.equal(x.commands[0].payload.cotcompRef.role,'LEAD_PROJECTION');
  assert.equal(x.commands[1].payload.cotcompRef.role,'OPS_QUOTATION_PROJECTION');
  assert.equal(x.commands[1].payload.cotcompRef.selectedProposalId,'prop_synth_2');
  assert.equal(x.commands[1].payload.cotcompRef.selectionId,undefined);
  assert.equal(x.commands[1].payload.cotcompRef.proposalId,undefined);
});

test('W2 payload intentionally omits advisor/client ids but still requires runtime zero-side-effect proof',()=>{
  const x=w2.buildSyntheticProjection({
    synthetic:true,
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    caseId:'qcase_synth_3',
    journeyId:'GT_GASTOS_MEDICOS_HYBRID',
    correlationId:'corr_synth_3',
    realData:false,
    production:false
  });
  assert.equal(x.commands[0].payload.asesorId,undefined);
  assert.equal(x.commands[0].payload.clienteId,undefined);
  assert.equal(x.commands[1].payload.asesorId,undefined);
  assert.equal(x.commands[1].payload.clienteId,undefined);
  assert.equal(x.notificationIsolation.providerDeliveryMustRemainUnprovenUntilRuntimeIdentityAndTenantConfigAreVerified,true);
});

test('W2 gate cannot open without runtime owner proof zero-notification proof cleanup and Owner authorization',()=>{
  const g=w2.evaluateW2Gate({
    workflowOwnerRuntimeVerified:false,
    notificationSideEffectsZeroVerified:false,
    syntheticCleanupHarnessReady:false,
    ownerW2Authorization:false,
    deployAuthorization:false
  });
  assert.equal(g.logicalReady,false);
  assert.equal(g.effectiveCallAllowed,false);
  assert.equal(g.effectiveWriteAllowed,false);
  for(const code of [
    'WORKFLOW_OWNER_RUNTIME_PROOF_REQUIRED',
    'NOTIFICATION_SIDE_EFFECTS_ZERO_PROOF_REQUIRED',
    'W2_CLEANUP_HARNESS_REQUIRED',
    'OWNER_W2_AUTHORIZATION_REQUIRED',
    'W2_DEPLOY_AUTHORIZATION_REQUIRED'
  ]) assert.ok(g.blockers.includes(code),code);
});
