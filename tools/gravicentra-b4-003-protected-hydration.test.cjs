'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('orbit360-platform/data/store-firestore-product-readonly-p0.js','utf8');
const provider=fs.readFileSync('orbit360-platform/core/product-runtime-browser-providers-p0.js','utf8');
const app=fs.readFileSync('orbit360-platform/core/product-app-p0.js','utf8');
const bootstrap=fs.readFileSync('orbit360-platform/core/backend-product-readonly-bootstrap-p0.js','utf8');
assert.match(provider,/orbit360ScopedPolicyReadPreview/);
assert.match(app,/scopedReadPreviewCandidate===true/);
assert.match(bootstrap,/protectedReadCandidate: options.protectedReadCandidate===true/);
const events={},calls=[],tenant='synthetic-tenant';let role='asesor',direct=0;
const win={Orbit:{session:{rol:()=>role}}};
const doc={addEventListener:(k,fn)=>{(events[k]||(events[k]=[])).push(fn);},
 removeEventListener:(k,fn)=>{events[k]=(events[k]||[]).filter(v=>v!==fn);}};
vm.runInNewContext(source,{window:win,document:doc,console,Promise,Map,Set,CustomEvent:function(){},
setTimeout,clearTimeout,requestIdleCallback:fn=>setTimeout(fn,0)});
const dataset={GT:[{id:'c1',canonicalDocumentId:'c1',tenantId:tenant,pais:'GT',asesorId:'a1'},
{id:'c2',canonicalDocumentId:'c2',tenantId:tenant,pais:'GT',asesorId:'a2'}],
CO:[{id:'c3',canonicalDocumentId:'c3',tenantId:tenant,pais:'CO',asesorId:'a1'}]};
const policyFixtures={GT:[{id:'p1',canonicalDocumentId:'p1',tenantId:tenant,pais:'GT',asesorId:'a1'},
{id:'p2',canonicalDocumentId:'p2',tenantId:tenant,pais:'GT',asesorId:'a2'}],
CO:[{id:'p3',canonicalDocumentId:'p3',tenantId:tenant,pais:'CO',asesorId:'a1'}]};
const relatedFixtures={GT:[{id:'r1',canonicalDocumentId:'r1',tenantId:tenant,pais:'GT',polizaId:'p1'},
{id:'r2',canonicalDocumentId:'r2',tenantId:tenant,pais:'GT',polizaId:'p2'}],
CO:[{id:'r3',canonicalDocumentId:'r3',tenantId:tenant,pais:'CO',polizaId:'p3'}]};
const deps={db:{},collection:()=>{direct++;throw Error('DIRECT_READ_USED');},
onSnapshot:()=>{direct++;throw Error('DIRECT_LISTENER_USED');},getDocsFromServer:()=>{direct++;throw Error('DIRECT_GET_USED');},
protectedReadPage:async req=>{
 calls.push({...req});
 const source=(req.collection==='polizas'?policyFixtures:req.collection==='recibosEsperados'?relatedFixtures:dataset);
 const visiblePolicyIds=(policyFixtures[req.country]||[]).filter(x=>req.activeRole==='operativo'||x.asesorId==='a1').map(x=>x.id);
 const visible=(source[req.country]||[]).filter(x=>(req.activeRole==='operativo'||x.asesorId==='a1'||req.collection==='recibosEsperados'&&visiblePolicyIds.includes(x.polizaId))
   &&(!Array.isArray(req.policyIds)||req.policyIds.includes(x.polizaId))&&(!req.policyId||req.policyId===x.polizaId));
 const pos=req.cursor?visible.findIndex(x=>x.id===req.cursor)+1:0;
 const slice=visible.slice(pos,pos+1);
 return {ok:true,serverScoped:true,collection:req.collection,country:req.country,
 rows:slice,nextCursor:pos+slice.length<visible.length?slice[slice.length-1].id:null};
}};
const paths={validateTenantId:id=>({ok:id===tenant,tenantId:id}),
 dataCollectionPath:()=>{direct++;throw Error('DIRECT_COLLECTION_USED');}};
const config=collections=>({tenantId:tenant,collections,requiredCollections:[collections[0]],
 membership:{activeRole:'asesor',roles:['asesor','operativo'],countries:['GT','CO']},
 protectedReadCandidate:true,paths,queryPlanner:()=>({ok:true,constraints:[{field:'tenantId',op:'==',value:tenant}]})});
const pause=()=>new Promise(ok=>setTimeout(ok,30));
(async()=>{
 // All eight canonical startup collections must be supported before any
 // protected query begins; partial authorization is not readiness.
 const allRequired=['clientes','polizas','cobros','aseguradoras','vehiculos','recibosEsperados','carteraPrimas','asesores'];
 const allConfig=config(allRequired);allConfig.requiredCollections=allRequired;
 const beforeCalls=calls.length;
 const incomplete=win.Orbit.createFirestoreProductReadOnlyStoreP0(deps,allConfig);
 assert.equal(incomplete._attachSnapshots(),false);
 assert.equal(incomplete._productStatus().status,'blocked-protected-incomplete');
 assert.equal(incomplete._productStatus().snapshotErrors.__startup,
  'PROTECTED_READ_REQUIRED_COLLECTIONS_UNSUPPORTED:aseguradoras,asesores');
 await pause();
 assert.equal(calls.length,beforeCalls);
 assert.deepEqual(Array.from(incomplete.all('polizas')),[]);
 console.log('B4_003_REQUIRED_EIGHT_BOOTSTRAP_FAIL_CLOSED checks=5 zero_partial_reads');
 const store=win.Orbit.createFirestoreProductReadOnlyStoreP0(deps,config(['clientes']));
 assert.equal(store._attachSnapshots(),true);await pause();
 assert.deepEqual(Array.from(store.all('clientes'),x=>x.id),['c1','c3']);
 assert.equal(direct,0);assert.equal(store._productStatus().serverConfirmedCollections.includes('clientes'),true);
 assert.ok(calls.some(x=>x.country==='GT'&&x.activeRole==='asesor'));
 role='operativo';events['orbit:active-role-changed'].slice().forEach(fn=>fn());
 assert.deepEqual(Array.from(store.all('clientes'),x=>x.id),[]);
 await pause();assert.deepEqual(Array.from(store.all('clientes'),x=>x.id),['c1','c2','c3']);
 assert.equal(direct,0);
 const related=win.Orbit.createFirestoreProductReadOnlyStoreP0(deps,config(['recibosEsperados']));
 assert.equal(related._attachSnapshots(),true);
 await pause();
 assert.deepEqual(Array.from(related.all('recibosEsperados'),x=>x.id),['r1','r2','r3']);
 assert.equal(related._productStatus().serverConfirmedCollections.includes('recibosEsperados'),true);
 assert.ok(calls.some(x=>x.collection==='recibosEsperados'&&Array.isArray(x.policyIds)&&x.policyIds.length>0));
 assert.equal(direct,0);

 role='asesor';events['orbit:active-role-changed'].slice().forEach(fn=>fn());
 assert.deepEqual(Array.from(store.all('clientes'),x=>x.id),[]);
 assert.deepEqual(Array.from(related.all('recibosEsperados'),x=>x.id),[]);
 await pause();assert.deepEqual(Array.from(store.all('clientes'),x=>x.id),['c1','c3']);
 assert.deepEqual(Array.from(related.all('recibosEsperados'),x=>x.id),['r1','r3']);
 let poisonCount=0;
 const poisonDeps=Object.assign({},deps,{protectedReadPage:async request=>{
   poisonCount++;
   return {ok:true,serverScoped:true,collection:request.collection,country:request.country,
     rows:[{id:'foreign-country',canonicalDocumentId:'foreign-country',tenantId:tenant,pais:'CO'}],nextCursor:null};
 }});
 const poison=win.Orbit.createFirestoreProductReadOnlyStoreP0(poisonDeps,config(['clientes']));
 assert.equal(poison._attachSnapshots(),true);
 await pause();
 assert.ok(poisonCount>0);
 assert.deepEqual(Array.from(poison.all('clientes'),x=>x.id),[]);
 assert.ok(poison._productStatus().snapshotErrors.clientes);
 assert.equal(direct,0);
 assert.match(bootstrap,/productQueryPlannerP0\.compile\(collection/);

 // Execute the actual bootstrap planner factory, not only its static source literal.
 let bootstrapRole='asesor',capturedPlanner=null;
 const authorizedMembership={uid:'mock-uid',email:'test@example.test',tenantId:tenant,
   status:'active',activeRole:'asesor',roles:['asesor','operativo'],countries:['GT'],advisorId:'a1',
   modulesExtra:[],modulesRestricted:[]};
 const mockOrbit={
   session:{rol:()=>bootstrapRole},
   membershipMultirolEffectiveP0:{
     normalize:m=>m,validate:m=>({ok:true,membership:m,errors:[]}),effectiveModules:()=>[]
   },
   tenantAccessPolicyProductP0:{VERSION:'mock-access'},
   productQueryPlannerP0:{
     createPlanner:()=>()=>({ok:true,scope:'frozen-asesor'}),
     compile:(collection,member)=>({ok:true,scope:member.activeRole,collection,constraints:[{field:'tenantId',op:'==',value:tenant}]})
   },
   tenantCanonicalPathsP0:{VERSION:'mock-path',validateTenantId:id=>({ok:id===tenant,tenantId:id})},
   backendProductReadinessP0:{readiness:()=>({ok:true})},
   createFirestoreProductReadOnlyStoreP0:(_deps,opts)=>{
     capturedPlanner=opts.queryPlanner;
     throw Error('STOP_AFTER_CAPTURE');
   }
 };
 const mockWindow={Orbit:mockOrbit,dispatchEvent:()=>{}};
 vm.runInNewContext(bootstrap,{window:mockWindow,console,Promise,setTimeout,clearTimeout,Date,CustomEvent:function(){}});
 const bootDeps={
   environmentProvider:{describePublicConfig:async()=>({})},
   firebaseAdapter:{initializeFromEnvironment:async()=>({db:{}}),storeDependencies:()=>({db:{}})},
   authProvider:{waitForAuthenticatedUser:async()=>({uid:'mock-uid',email:'test@example.test'})},
   membershipProvider:{getByUid:async()=>authorizedMembership},
   protectedReadPage:async()=>({ok:true})
 };
 const bootResult=await mockOrbit.backendProductReadOnlyBootstrapP0.start(bootDeps,{
   mode:'product',authorizedProductReadOnly:true,runtimeAuthorized:true,
   protectedReadCandidate:true,collections:['clientes']
 });
 assert.equal(bootResult.ok,false,'only controlled QA capture is expected');
 assert.equal(typeof capturedPlanner,'function');
 assert.equal(capturedPlanner('clientes').scope,'asesor');
 bootstrapRole='operativo';
 assert.equal(capturedPlanner('clientes').scope,'operativo');
 bootstrapRole='unassigned';
 assert.equal(capturedPlanner('clientes').hardError,true);

 // Preview hostname alone must not authorize the protected read transport.
 const flagCase=(flag,hostname)=>{
  const w={Orbit:{},location:{hostname},__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{
   enabled:false,tenantHint:tenant,scopedReadPreviewCandidate:flag}};
  vm.runInNewContext(provider,{window:w,Promise,Set,Map,console},{timeout:1000});
  return w.Orbit.productRuntimeBrowserProvidersP0.protectedReadPage({
   tenantId:tenant,collection:'polizas',country:'GT',activeRole:'asesor'});
 };
 await assert.rejects(flagCase(false,'ays-orbit-360-lab--gi-i65-b4-test.web.app'),
  /PROTECTED_READ_CANDIDATE_DISABLED/);
 await assert.rejects(flagCase(true,'ays-orbit-360-lab.web.app'),
  /PROTECTED_READ_PREVIEW_ONLY/);
 await assert.rejects(flagCase(true,'ays-orbit-360-lab--gi-i65-b4-test.web.app'),
  /PRODUCT_RUNTIME_NOT_CONFIGURED/);
 console.log('B4_003_PROTECTED_READ_PREVIEW_FLAG_QA_PASS checks=3 mock_only no_network');
 console.log('B4_003_ACTUAL_BOOTSTRAP_ROLE_RECOMPILE_PASS mock-only no-reads');
 console.log('B4_003_PROTECTED_HYDRATION_MOCK_PASS no_direct_firestore role_cache_reset protected_related_policy_batches');
})().catch(error=>{console.error(error);process.exitCode=1;});
