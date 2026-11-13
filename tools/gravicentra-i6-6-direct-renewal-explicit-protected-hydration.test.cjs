'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('orbit360-platform/core/issuance-workflow-v1201.js','utf8');
function setup({withEnsure=true,requestFails=false}={}){
  const requested=[],confirmed=new Set();
  const store={
    _productStatus:()=>({fullHydrationDeferred:true,serverConfirmedCollections:Array.from(confirmed),
      snapshotErrors:{},deniedCollections:[]}),
    get:()=>null,
    all:()=>[],
    on:()=>()=>{}
  };
  if(withEnsure)store._ensureCollections=names=>{
    requested.push(names.slice());
    if(requestFails)throw Error('protected_request_failed');
    names.forEach(name=>confirmed.add(name));
    return names.slice();
  };
  const Orbit={store,access:{activeRole:()=> 'Operativo',actorAdvisor:()=>({}),tenantId:()=> 'tenant_gt'}};
  const sandbox={window:{Orbit},Orbit,console,Date,Promise,Set,Object,Array,String,Number,Error,
    setTimeout,clearTimeout,setInterval,clearInterval};
  vm.runInNewContext(source,sandbox,{filename:'issuance-workflow-v1201.js'});
  return{Orbit,requested};
}
test('Direct renewal requests its own protected Ops, policy, client and vehicle sources',async()=>{
  const {Orbit,requested}=setup();
  const r=await Orbit.issuance.createDirectRenewal('never-existing',{numero:'QA-NOT-A-POLICY'});
  assert.equal(r.ok,false);
  assert.deepEqual(Array.from(r.errors),['gestion_renovacion_aceptada_no_encontrada']);
  assert.deepEqual(Array.from(requested[0]),['gestiones','polizas','vehiculos','clientes']);
  assert.equal(requested.length,1);
});
test('Direct renewal fails closed if an explicit protected source cannot be requested',async()=>{
  const {Orbit}=setup({withEnsure:false});
  const r=await Orbit.issuance.createDirectRenewal('missing',{});
  assert.deepEqual(Array.from(r.errors),['datos_autoritativos_solicitud_no_disponible']);
});
test('Direct renewal fails closed when protected query scheduling throws',async()=>{
  const {Orbit}=setup({requestFails:true});
  const r=await Orbit.issuance.createDirectRenewal('missing',{});
  assert.deepEqual(Array.from(r.errors),['datos_autoritativos_solicitud_fallida']);
});
