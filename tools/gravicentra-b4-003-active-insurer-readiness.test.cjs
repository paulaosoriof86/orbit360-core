'use strict';
// I6.5/B4-003 active Aseguradoras priority/readiness — synthetic-only.
// No Firebase connection, no operational writes, no real identity or secrets.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const storeSource=fs.readFileSync('orbit360-platform/data/store-firestore-product-readonly-p0.js','utf8');
const insurerSource=fs.readFileSync('orbit360-platform/modules/aseguradoras.js','utf8');
const index=fs.readFileSync('orbit360-platform/index.html','utf8');
const events={},calls=[];let currentRole='Asesor',directCalls=0;
const pendingClients={};
const win={Orbit:{route:{key:'aseguradoras'},session:{rol:()=>currentRole}},
 location:{hash:'#/aseguradoras'},dispatchEvent:()=>{}};
const doc={addEventListener:(k,fn)=>{(events[k]||(events[k]=[])).push(fn);},
 removeEventListener:(k,fn)=>{events[k]=(events[k]||[]).filter(f=>f!==fn);}};
vm.runInNewContext(storeSource,{window:win,document:doc,
 CustomEvent:function(){},Promise,Map,Set,Date,console,setTimeout,clearTimeout,
 requestIdleCallback:fn=>setTimeout(fn,0)},{timeout:1000});
const tenant='synthetic-tenant';
const options={
 tenantId:tenant,collections:['clientes','aseguradoras','asesores'],requiredCollections:['clientes'],
 protectedReadCandidate:true,
 membership:{activeRole:'Asesor',roles:['Asesor','Dirección'],countries:['GT','CO']},
 paths:{validateTenantId:id=>({ok:id===tenant,tenantId:id}),
  dataCollectionPath:()=>{directCalls++;throw Error('DIRECT_FIRESTORE_FORBIDDEN');}},
 queryPlanner:collection=>({
  ok:!(currentRole==='Asesor'&&collection==='aseguradoras'),
  errors:currentRole==='Asesor'&&collection==='aseguradoras'?['role_denied']:[],
  constraints:[{field:'tenantId',op:'==',value:tenant}]
 })
};
const response=req=>({ok:true,serverScoped:true,collection:req.collection,
 country:req.country,rows:[],nextCursor:null});
const deps={
 protectedReadPage:req=>{
  calls.push([req.activeRole,req.collection,req.country]);
  if(req.activeRole==='Dirección'&&req.collection==='clientes')
   return new Promise(done=>pendingClients[req.country]=()=>done(response(req)));
  return Promise.resolve(response(req));
 },
 getDocsFromServer:()=>{directCalls++;throw Error('DIRECT_GET_FORBIDDEN');},
 onSnapshot:()=>{directCalls++;throw Error('DIRECT_LISTEN_FORBIDDEN');}
};
const flush=async()=>{for(let i=0;i<150;i++)await Promise.resolve();};
(async()=>{
 const store=win.Orbit.createFirestoreProductReadOnlyStoreP0(deps,options);
 assert.equal(store._attachSnapshots(),true);await flush();
 assert.ok(store._productStatus().serverConfirmedCollections.includes('clientes'));
 currentRole='Dirección';
 assert.equal((events['orbit:active-role-changed']||[]).length,1);
 events['orbit:active-role-changed'][0]();await flush();
 const status=store._productStatus();
 assert.ok(status.serverConfirmedCollections.includes('aseguradoras'),'ACTIVE_ROUTE_MUST_CONFIRM_BEFORE_HOME_SOURCE');
 assert.ok(!status.serverConfirmedCollections.includes('clientes'),'HOME_READ_REMAINS_DELAYED');
 const idxInsurer=calls.findIndex(x=>x[0]==='Dirección'&&x[1]==='aseguradoras');
 const idxClient=calls.findIndex(x=>x[0]==='Dirección'&&x[1]==='clientes');
 assert.ok(idxInsurer>=0&&idxClient>=0&&idxInsurer<idxClient,'ACTIVE_ROUTE_MUST_LAUNCH_FIRST');
 assert.equal(Object.keys(pendingClients).length,2);
 Object.values(pendingClients).forEach(f=>f());await flush();
 assert.ok(store._productStatus().serverConfirmedCollections.includes('clientes'));
 currentRole='Asesor';
 events['orbit:active-role-changed'][0]();await flush();
 assert.equal(calls.filter(x=>x[0]==='Asesor'&&x[1]==='aseguradoras').length,0,
  'ADVISOR_INSURER_REQUEST_FORBIDDEN');
 assert.ok(!store._productStatus().serverConfirmedCollections.includes('aseguradoras'),
  'OLD_DIRECTION_ROWS_MUST_NOT_BE_ACCEPTED');
 assert.equal(directCalls,0,'NEVER_FALLBACK_TO_BROWSER_FIRESTORE');
 assert.throws(()=>store.insert('aseguradoras',{id:'synthetic'}),e=>
  e&&e.code==='WRITE_BLOCKED_PRODUCT_READ_ONLY_P0');
 const b=insurerSource.indexOf('  function protectedDirectoryReadiness(){');
 const e=insurerSource.indexOf('  function render(h)',b);
 assert.ok(b>0&&e>b,'READINESS_OWNER_MISSING');
 function ready(s){
  const scope={__store:s};
  vm.runInNewContext('const S=()=>__store;\n'+insurerSource.slice(b,e)+
   '\nthis.readiness=protectedDirectoryReadiness;',scope);
  return scope.readiness();
 }
 const mock=(confirmed=[],errors={},denied=[])=>
  ({_protectedCandidate:true,_productStatus:()=>({
   serverConfirmedCollections:confirmed,snapshotErrors:errors,deniedCollections:denied})});
 assert.equal(ready(mock()),'loading');
 assert.equal(ready(mock(['aseguradoras'])),'ready');
 assert.equal(ready(mock([],{aseguradoras:'functions/unavailable'})),'failed');
 assert.equal(ready(mock([],{},['aseguradoras'])),'denied');
 assert.equal(ready({}), 'ready','UNPROTECTED_PRODUCTION_VIEW_UNCHANGED');
 assert.match(insurerSource,/readState==='ready'\?S\(\)\.all\('aseguradoras'\):\[\]/);
 assert.match(insurerSource,/data-insurer-readiness=/);
 assert.match(insurerSource,/val:'—'/);
 assert.match(index,/store-firestore-product-readonly-p0\.js\?v=20261024-b4003-active-insurer-readiness/);
 assert.match(index,/aseguradoras\.js\?v=20261007-r20f4-20261020-b4003-source-catalog-20261024-b4003-readiness-explicit/);
 console.log('B4_003_ACTIVE_INSURER_READINESS_VM_PASS early_scope_read=true false_zero=false adviser_denied=true cache_invalidated=true directFirestore=0 writes=0');
})().catch(e=>{console.error(e);process.exitCode=1;});