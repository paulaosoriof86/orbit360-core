'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-w2-controlled-proof-s450');

test('S4.50 is pinned to LAB legacyCompatible and canonical owner callable',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.REGION,'us-central1');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  assert.equal(s.STORAGE_MODE,'legacyCompatible');
  assert.equal(s.OWNER_CALLABLE,'orbit360OpsLeadsCommand');
});

test('S4.50 fixture produces exactly two commands and eight journal documents',()=>{
  const f=s.fixtureFor('s450-123456');
  assert.equal(f.projection.ok,true);
  assert.equal(f.projection.commands.length,2);
  assert.equal(f.journal.ok,true);
  assert.equal(f.journal.entries.length,8);
  assert.equal(f.journal.expectedCreatedDocuments,8);
  assert.deepEqual(f.projection.commands.map(x=>x.operation),['create_business','create_management']);
});

test('S4.50 journal uses legacy entity paths and tenant workflow journals',()=>{
  const f=s.fixtureFor('s450-123456');
  const paths=f.journal.entries.map(x=>x.path);
  assert.ok(paths.some(p=>p.startsWith('tenantId/alianzas-soluciones/negocios/')));
  assert.ok(paths.some(p=>p.startsWith('tenantId/alianzas-soluciones/gestiones/')));
  assert.equal(paths.filter(p=>p.startsWith('tenants/alianzas-soluciones/workflowEvents/')).length,2);
  assert.equal(paths.filter(p=>p.startsWith('tenants/alianzas-soluciones/workflowRequests/')).length,2);
  assert.equal(paths.filter(p=>p.startsWith('tenants/alianzas-soluciones/notificationOutbox/')).length,2);
});

test('S4.50 conflict artifacts are request/event/outbox only and remain separate from original ids',()=>{
  const f=s.fixtureFor('s450-123456');
  const c=s.conflictJournal(f.projection);
  assert.equal(c.length,6);
  assert.equal(c.filter(x=>x.component==='workflow_request').length,2);
  assert.equal(c.filter(x=>x.component==='workflow_event').length,2);
  assert.equal(c.filter(x=>x.component==='notification_outbox').length,2);
  for(const cmd of f.projection.commands){
    assert.notEqual(s.conflictRequestId(cmd.requestId),cmd.requestId);
  }
});

test('S4.50 command envelopes preserve exact request and entity identities',()=>{
  const f=s.fixtureFor('s450-123456');
  for(const cmd of f.projection.commands){
    const env=s.commandEnvelope(cmd);
    assert.equal(env.operation,cmd.operation);
    assert.equal(env.entityId,cmd.entityId);
    assert.equal(env.requestId,cmd.requestId);
    assert.equal(env.tenantId,'alianzas-soluciones');
  }
});

test('S4.50 conflict envelope changes request identity and payload while keeping entity identity',()=>{
  const f=s.fixtureFor('s450-123456');
  for(const cmd of f.projection.commands){
    const env=s.conflictEnvelope(cmd);
    assert.equal(env.entityId,cmd.entityId);
    assert.notEqual(env.requestId,cmd.requestId);
    assert.equal(env.payload.prioridad,'Alta');
  }
});

test('S4.50 source hard-locks no provider execution and exact cleanup accounting',()=>{
  const fs=require('node:fs');
  const source=fs.readFileSync(require.resolve('./cotcomp-w2-controlled-proof-s450'),'utf8');
  assert.match(source,/providerDelivery:\{executed:false/);
  assert.match(source,/createWrites:8/);
  assert.match(source,/retryWrites:0/);
  assert.match(source,/conflictWrites:0/);
  assert.match(source,/deleteWrites:8/);
  assert.match(source,/netPersistentDocuments:0/);
  assert.match(source,/realClientOrBusinessDataTouched:false/);
  assert.match(source,/productionTouched:false/);
});
