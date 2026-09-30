'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const a=require('./cotcomp-lab-storage-adapter-candidate');

function spyDriver(){
  const calls=[];
  return {
    calls,
    driver:{
      get:async(...args)=>{calls.push(['get',args]);return null;},
      runAtomicGroup:async(...args)=>{calls.push(['runAtomicGroup',args]);return {};},
      patch:async(...args)=>{calls.push(['patch',args]);return {};}
    }
  };
}

const context={actorType:'SERVER_COTCOMP_WRITER',tenantId:'alianzas-soluciones',publicBrowser:false};

test('adapter is hard-closed by code',()=>{
  assert.equal(a.READY,false);
  assert.equal(a.EXECUTION_ENABLED,false);
  assert.equal(a.WRITES_ENABLED,false);
  assert.equal(a.DRIVER_CALLS_ALLOWED,false);
  assert.equal(a.SERVER_SIDE_ONLY,true);
});

test('readiness requires exact LAB, deployed owner blob, governance and explicit authorizations',()=>{
  const r=a.evaluateReadiness({
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    workflowStorageMode:'canonicalV2',
    workflowOwnerBlobDeployed:a.EXPECTED.workflowOwnerBlob,
    retentionPolicyApproved:true,
    caseAccessPersistenceApproved:true,
    negativeSecurityQaPass:true,
    ownerWriteAuthorization:true,
    deployAuthorization:true
  });
  assert.equal(r.ok,true);
  assert.equal(r.effectiveReady,false);
  assert.equal(r.readyByCode,false);
});

test('current missing deployment fails readiness closed',()=>{
  const r=a.evaluateReadiness({
    projectId:'ays-orbit-360-lab',
    environment:'LAB',
    tenantId:'alianzas-soluciones',
    workflowStorageMode:'canonicalV2'
  });
  assert.ok(r.reasons.includes('WORKFLOW_SCHEMA_NOT_DEPLOYED'));
  assert.ok(r.reasons.includes('RETENTION_POLICY_REQUIRED'));
  assert.ok(r.reasons.includes('OWNER_WRITE_AUTHORIZATION_REQUIRED'));
});

test('only canonical tenant CotComp paths are allowed',()=>{
  const ok=a.classifyPath('tenants/alianzas-soluciones/cotcomp/quoteCases/items/qcase_1');
  assert.equal(ok.ok,true);
  assert.equal(ok.kind,'COTCOMP_ENTITY');
  assert.equal(a.classifyPath('tenantId/alianzas-soluciones/quoteCases/qcase_1').ok,false);
  assert.equal(a.classifyPath('tenants/other/cotcomp/quoteCases/items/qcase_1').ok,false);
});

test('canonical Leads Ops projection paths are allowed but legacy paths are denied',()=>{
  assert.equal(a.classifyPath('tenants/alianzas-soluciones/workflow/negocios/items/neg_1').ok,true);
  assert.equal(a.classifyPath('tenants/alianzas-soluciones/workflow/gestiones/items/ges_1').ok,true);
  assert.equal(a.classifyPath('tenantId/alianzas-soluciones/negocios/neg_1').ok,false);
});

test('notification outbox path is narrowly allowed',()=>{
  const r=a.classifyPath('tenants/alianzas-soluciones/notificationOutbox/evt_1');
  assert.equal(r.ok,true);
  assert.equal(r.kind,'NOTIFICATION_OUTBOX');
});

test('public browser context is rejected',()=>{
  const r=a.validateServerContext({actorType:'SERVER_COTCOMP_WRITER',tenantId:'alianzas-soluciones',publicBrowser:true});
  assert.equal(r.ok,false);
  assert.ok(r.reasons.includes('PUBLIC_BROWSER_FORBIDDEN'));
});

test('driver shape is explicit',()=>{
  const s=spyDriver();
  assert.equal(a.validateDriver(s.driver).ok,true);
  assert.equal(a.validateDriver({}).ok,false);
});

test('workflow writes require explicit server projection marker',()=>{
  const denied=a.validateCommand({
    type:'UPSERT_DETERMINISTIC',
    path:'tenants/alianzas-soluciones/workflow/negocios/items/neg_1'
  });
  assert.equal(denied.ok,false);
  assert.equal(denied.code,'WORKFLOW_SERVER_PROJECTION_REQUIRED');

  const allowed=a.validateCommand({
    type:'UPSERT_DETERMINISTIC',
    path:'tenants/alianzas-soluciones/workflow/negocios/items/neg_1',
    serverProjection:true
  });
  assert.equal(allowed.ok,true);
});

test('blocked commands fail preview closed',()=>{
  const r=a.previewAtomicGroup({
    group:'B',
    context,
    commands:[{
      type:'UPSERT_DETERMINISTIC',
      path:'tenants/alianzas-soluciones/workflow/negocios/items/neg_1',
      serverProjection:true,
      blocked:true,
      blockReason:'WORKFLOW_COTCOMP_SCHEMA_NOT_DEPLOYED'
    }]
  });
  assert.equal(r.ok,false);
  assert.equal(r.invalid[0].code,'WORKFLOW_COTCOMP_SCHEMA_NOT_DEPLOYED');
});

test('preview never calls driver',()=>{
  const s=spyDriver();
  const adapter=a.createLabStorageAdapter({driver:s.driver,context});
  const r=adapter.previewRead({path:'tenants/alianzas-soluciones/cotcomp/proposals/items/p1'});
  assert.equal(r.ok,true);
  assert.deepEqual(s.calls,[]);
});

test('execution methods fail before touching driver',async()=>{
  const s=spyDriver();
  const adapter=a.createLabStorageAdapter({driver:s.driver,context});
  await assert.rejects(()=>adapter.read({}),/COTCOMP_LAB_STORAGE_ADAPTER_NOT_READY/);
  await assert.rejects(()=>adapter.runAtomicGroup({}),/COTCOMP_LAB_STORAGE_ADAPTER_NOT_READY/);
  await assert.rejects(()=>adapter.patch({}),/COTCOMP_LAB_STORAGE_ADAPTER_NOT_READY/);
  assert.deepEqual(s.calls,[]);
});
