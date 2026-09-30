'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const d=require('./cotcomp-staging-read-deps-s436');

function spyDriver(){
  const calls=[];
  return {
    calls,
    driver:{
      getCaseAccess:async(...args)=>{calls.push(['getCaseAccess',args]);return null;},
      listProposalsForCase:async(...args)=>{calls.push(['listProposalsForCase',args]);return [];}
    }
  };
}

test('read deps remain hard-closed and read-only',()=>{
  assert.equal(d.READY,false);
  assert.equal(d.PERSISTENCE_ENABLED,false);
  assert.equal(d.WRITES_ENABLED,false);
  assert.equal(d.DRIVER_READS_ALLOWED,false);
  assert.equal(d.SERVER_SIDE_ONLY,true);
});

test('driver shape is explicit',()=>{
  assert.equal(d.validateDriver(spyDriver().driver).ok,true);
  assert.equal(d.validateDriver({}).ok,false);
});

test('case-access preview uses canonical CotComp path',()=>{
  const r=d.previewCaseAccessRead({tenantId:'alianzas-soluciones',caseId:'qcase_1'});
  assert.equal(r.ok,true);
  assert.equal(r.path,'tenants/alianzas-soluciones/cotcomp/caseAccess/items/qcase_1');
  assert.equal(r.executable,false);
});

test('proposal preview uses canonical CotComp path',()=>{
  const r=d.previewProposalRead({tenantId:'alianzas-soluciones',proposalId:'p1'});
  assert.equal(r.ok,true);
  assert.equal(r.path,'tenants/alianzas-soluciones/cotcomp/proposals/items/p1');
  assert.equal(r.executable,false);
});

test('cross-tenant case-access preview fails',()=>{
  const r=d.previewCaseAccessRead({tenantId:'otro-tenant',caseId:'qcase_1'});
  assert.equal(r.ok,false);
});

test('runtime dependency methods fail before calling injected driver',async()=>{
  const s=spyDriver();
  const deps=d.createReadOnlyDeps({driver:s.driver});
  await assert.rejects(()=>deps.verifyCaseAccess({}),/COTCOMP_STAGING_READ_DEPS_NOT_READY/);
  await assert.rejects(()=>deps.loadProposals({}),/COTCOMP_STAGING_READ_DEPS_NOT_READY/);
  assert.deepEqual(s.calls,[]);
});
