'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const runtime=require('./cotcomp-workflow-owner-runtime-evidence-s446');
const w2=require('./cotcomp-w2-workflow-projection-candidate-s446');

function baseInput(overrides={}){
  return {
    synthetic:true,
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    caseId:'qcase_synth_1',
    journeyId:'GT_AUTO_MOTO_HYBRID',
    correlationId:'corr_synth_1',
    quoteCasePath:'tenants/alianzas-soluciones/cotcomp/quoteCases/items/qcase_synth_1',
    country:'GT',
    currency:'GTQ',
    product:'AUTO',
    line:'AUTOS',
    realData:false,
    production:false,
    ...overrides
  };
}

test('S4.46 runtime evidence expects exact S4.20 owner blob',()=>{
  assert.equal(runtime.EXPECTED.projectId,'ays-orbit-360-lab');
  assert.equal(runtime.EXPECTED.ownerBlob,'73e09a4404cb4298dc34c9c38e26ad1f960d3170');
  assert.ok(runtime.EXPECTED.functions.includes('orbit360OpsLeadsCommand'));
});

test('runtime verification distinguishes readable archive from owner mismatch',()=>{
  const r=runtime.evaluate({
    projectId:'ays-orbit-360-lab',
    region:'us-central1',
    functionObservedActive:true,
    deployedOwnerBlob:'d0a1e116186bba860d34ec540e8abba81830b553',
    sourceArchiveReadSuccessful:true,
    writeExecuted:false,
    productionTouched:false
  });
  assert.equal(r.ok,false);
  assert.ok(r.blockers.includes('DEPLOYED_OWNER_BLOB_MISMATCH'));
  assert.ok(!r.blockers.includes('DEPLOYED_SOURCE_ARCHIVE_READBACK_REQUIRED'));
});

test('W2 candidate stays execution and writes closed',()=>{
  assert.equal(w2.EXECUTION_ENABLED,false);
  assert.equal(w2.CALLS_ALLOWED,false);
  assert.equal(w2.WRITE_ALLOWED,false);
});

test('W2 candidate derives deterministic entity ids and payload-bound request ids',()=>{
  const a=w2.buildSyntheticProjection(baseInput());
  const b=w2.buildSyntheticProjection(baseInput());
  assert.equal(a.ok,true);
  assert.deepEqual(a.ids,b.ids);
  assert.equal(a.commands.length,2);
  assert.equal(a.commands[0].operation,'create_business');
  assert.equal(a.commands[1].operation,'create_management');
  assert.equal(a.commands[0].requestIdentityPolicy,'PAYLOAD_BOUND_MIRRORS_OWNER_REQUEST_IDENTITY');
  assert.equal(a.commands[1].requestIdentityPolicy,'PAYLOAD_BOUND_MIRRORS_OWNER_REQUEST_IDENTITY');
  assert.match(a.ids.businessRequestId,/^wf_[a-f0-9]{28}$/);
  assert.match(a.ids.managementRequestId,/^wf_[a-f0-9]{28}$/);
  assert.equal(a.executable,false);
});

test('W2 request identity changes when business payload changes',()=>{
  const a=w2.buildSyntheticProjection(baseInput({product:'AUTO'}));
  const b=w2.buildSyntheticProjection(baseInput({product:'MOTO'}));
  assert.notEqual(a.ids.businessRequestId,b.ids.businessRequestId);
});

test('W2 candidate carries canonical S4.20 cotcompRef into both commands',()=>{
  const x=w2.buildSyntheticProjection(baseInput({
    caseId:'qcase_synth_2',
    correlationId:'corr_synth_2',
    proposalId:'prop_synth_2'
  }));
  assert.equal(x.commands[0].payload.cotcompRef.caseId,'qcase_synth_2');
  assert.equal(x.commands[0].payload.cotcompRef.role,'LEAD_PROJECTION');
  assert.equal(x.commands[1].payload.cotcompRef.role,'OPS_QUOTATION_PROJECTION');
  assert.equal(x.commands[1].payload.cotcompRef.selectedProposalId,'prop_synth_2');
  assert.equal(x.commands[1].payload.cotcompRef.selectionId,undefined);
  assert.equal(x.commands[1].payload.cotcompRef.proposalId,undefined);
});

test('W2 candidate matches intended workflow labels and stage',()=>{
  const x=w2.buildSyntheticProjection(baseInput());
  assert.equal(x.commands[0].payload.tipo,'Cotización');
  assert.equal(x.commands[0].payload.etapa,'cotizando');
  assert.equal(x.commands[0].payload.canal,'Web pública A&S');
  assert.equal(x.commands[1].payload.lista,'Cotizaciones');
  assert.equal(x.commands[1].payload.tipo,'Cotización');
  assert.equal(x.commands[1].payload.estado,'Pendiente');
});

test('W2 freezes unavoidable owner outbox side effect and provider-delivery isolation',()=>{
  const x=w2.buildSyntheticProjection(baseInput());
  assert.equal(x.notificationIsolation.successfulOwnerCreateRequiresAdvisorId,true);
  assert.equal(x.notificationIsolation.advisorTargetThereforeExpected,true);
  assert.equal(x.notificationIsolation.notificationOutboxExpected,true);
  assert.equal(x.notificationIsolation.portalNotificationExpected,false);
  assert.equal(x.notificationIsolation.providerDeliveryAllowed,false);
  assert.equal(x.notificationIsolation.providerDeliveryIsolationRequired,true);
  assert.equal(x.notificationIsolation.outboxMustBeJournaledAndCleaned,true);
  assert.equal(x.notificationIsolation.directOwnerExecutionAllowed,false);
  assert.equal(x.cleanupRequirement.expectedCreatedDocuments,8);
});

test('W2 gate cannot open without runtime owner config provider isolation cleanup and Owner authorization',()=>{
  const g=w2.evaluateW2Gate({
    workflowOwnerRuntimeVerified:false,
    runtimeConfigReadbackVerified:false,
    providerDeliveryIsolationVerified:false,
    outboxCleanupHarnessReady:false,
    syntheticCleanupHarnessReady:false,
    ownerW2Authorization:false,
    deployAuthorization:false
  });
  assert.equal(g.logicalReady,false);
  assert.equal(g.effectiveCallAllowed,false);
  assert.equal(g.effectiveWriteAllowed,false);
  for(const code of [
    'WORKFLOW_OWNER_RUNTIME_PROOF_REQUIRED',
    'W2_RUNTIME_CONFIG_READBACK_REQUIRED',
    'PROVIDER_DELIVERY_ISOLATION_REQUIRED',
    'W2_OUTBOX_CLEANUP_HARNESS_REQUIRED',
    'W2_CLEANUP_HARNESS_REQUIRED',
    'OWNER_W2_AUTHORIZATION_REQUIRED',
    'W2_DEPLOY_AUTHORIZATION_REQUIRED'
  ]) assert.ok(g.blockers.includes(code),code);
});
