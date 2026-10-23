'use strict';
// I6.5/B4-003: protected Preview context return regression, synthetic only.
// No Firebase, no real identities, no data writes and no direct Firestore SDK.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('orbit360-platform/data/store-firestore-product-readonly-p0.js','utf8');
const events={};let selectedRole='Asesor',directReads=0;
const tenant='qa-synthetic-tenant';
const w={Orbit:{session:{rol:()=>selectedRole}},dispatchEvent:()=>{}};
const doc={
  addEventListener:(name,fn)=>{(events[name]||(events[name]=[])).push(fn);},
  removeEventListener:(name,fn)=>{events[name]=(events[name]||[]).filter(x=>x!==fn);}
};
vm.runInNewContext(source,{window:w,document:doc,CustomEvent:function(){},
  setTimeout,clearTimeout,console,Promise,Map,Set,Date,requestIdleCallback:fn=>setTimeout(fn,0)});
const config=collections=>({
  tenantId:tenant,collections,requiredCollections:['clientes'],
  membership:{activeRole:'Asesor',roles:['Asesor','Operativo'],countries:['GT','CO']},
  protectedReadCandidate:true,
  paths:{validateTenantId:id=>({ok:id===tenant,tenantId:id}),
    dataCollectionPath:()=>{directReads++;throw Error('DIRECT_COLLECTION_FORBIDDEN');}},
  queryPlanner:()=>({ok:true,constraints:[{field:'tenantId',op:'==',value:tenant}]})
});
const response=req=>({ok:true,serverScoped:true,collection:req.collection,
  country:req.country,rows:[],nextCursor:null});
const protectedDeps=reader=>({
  db:{},getDocsFromServer:()=>{directReads++;throw Error('DIRECT_GET_FORBIDDEN');},
  onSnapshot:()=>{directReads++;throw Error('DIRECT_LISTEN_FORBIDDEN');},
  protectedReadPage:reader
});
const pause=(ms=30)=>new Promise(done=>setTimeout(done,ms));
(async()=>{
  const inflight={},requests=[];
  const reader=req=>{
    requests.push({role:req.activeRole,collection:req.collection,country:req.country});
    if(req.activeRole==='Operativo')return new Promise(done=>{
      inflight[req.collection+':'+req.country]=()=>done(response(req));
    });
    return Promise.resolve(response(req));
  };
  const startEvents=(events['orbit:active-role-changed']||[]).length;
  const store=w.Orbit.createFirestoreProductReadOnlyStoreP0(protectedDeps(reader),
    config(['clientes','polizas','cobros','aseguradoras']));
  assert.equal(store._attachSnapshots(),true);await pause();
  assert.ok(store._productStatus().serverConfirmedCollections.includes('clientes'));
  selectedRole='Operativo';
  events['orbit:active-role-changed'][startEvents]();
  assert.equal(store.all('clientes').length,0,'OLD_ROLE_BYTES_INVALIDATED_SYNCHRONOUSLY');
  store._ensureCollections(['clientes','polizas','cobros','aseguradoras']);
  await pause();
  assert.deepEqual(requests.filter(x=>x.role==='Operativo').map(x=>x.collection),
    ['clientes','clientes'],'REQUIRED_COLLECTION_MUST_BE_FIRST');
  inflight['clientes:GT']();await pause();
  assert.equal(requests.filter(x=>x.role==='Operativo'&&x.collection!=='clientes').length,0,
    'ONE_COUNTRY_RESPONSE_NEVER_UNBLOCKS_ROUTE');
  inflight['clientes:CO']();await pause();
  assert.deepEqual(requests.filter(x=>x.role==='Operativo'&&x.collection!=='clientes')
    .map(x=>x.collection),['polizas','polizas','cobros','cobros'],
    'AT_MOST_TWO_OPTIONAL_COLLECTIONS_IN_FLIGHT');
  inflight['polizas:GT']();inflight['polizas:CO']();await pause();
  assert.equal(requests.filter(x=>x.role==='Operativo'&&x.collection==='aseguradoras').length,2,
    'THIRD_OPTIONAL_WAITS_FOR_FINISHED_COLLECTION');
  inflight['cobros:GT']();inflight['cobros:CO']();
  inflight['aseguradoras:GT']();inflight['aseguradoras:CO']();await pause();
  assert.ok(['clientes','polizas','cobros','aseguradoras'].every(name=>
    store._productStatus().serverConfirmedCollections.includes(name)));
  console.log('B4_003_ROLE_RETURN_PRIORITY_VM_PASS required_first=true optional_cap=2 no_stale_data');

  let transientCalls=0,deniedCalls=0;
  const transient=w.Orbit.createFirestoreProductReadOnlyStoreP0(protectedDeps(async req=>{
    transientCalls++;
    if(req.country==='GT'&&transientCalls===1){
      const error=new Error('transient');error.code='functions/unavailable';throw error;
    }
    return response(req);
  }),config(['clientes']));
  const denied=w.Orbit.createFirestoreProductReadOnlyStoreP0(protectedDeps(async req=>{
    deniedCalls++;
    if(req.country==='GT'){
      const error=new Error('denied');error.code='functions/permission-denied';throw error;
    }
    return response(req);
  }),config(['clientes']));
  assert.equal(transient._attachSnapshots(),true);
  assert.equal(denied._attachSnapshots(),true);await pause();
  assert.ok(transient._productStatus().snapshotErrors.clientes,'NO_FALSE_READY_AFTER_TRANSPORT_ERROR');
  assert.ok(denied._productStatus().snapshotErrors.clientes,'NO_FALSE_READY_AFTER_DENIAL');
  await pause(1350);
  assert.equal(transientCalls,4,'EXACTLY_ONE_RETRY_PER_TRANSIENT_FAILED_COLLECTION');
  assert.equal(transient._productStatus().snapshotErrors.clientes,undefined);
  assert.ok(transient._productStatus().serverConfirmedCollections.includes('clientes'));
  assert.equal(deniedCalls,2,'PERMISSION_DENIAL_NEVER_RETRIED');
  assert.ok(denied._productStatus().snapshotErrors.clientes,'DENIAL_REMAINS_FAIL_CLOSED');
  assert.equal(directReads,0,'NO_DIRECT_FIRESTORE_FALLBACK');
  console.log('B4_003_ROLE_CONTEXT_TRANSIENT_RETRY_VM_PASS bounded=1 denied=0 directFirestore=0 writes=0');
})().catch(error=>{console.error(error);process.exitCode=1;});
