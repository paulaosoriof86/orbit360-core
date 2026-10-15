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
const cobrosFixtures={GT:[
  {id:'pay1',canonicalDocumentId:'pay1',tenantId:tenant,pais:'GT',polizaId:'p1',asesorId:'a1'},
  {id:'pay2',canonicalDocumentId:'pay2',tenantId:tenant,pais:'GT',polizaId:'p2',asesorId:'a2'}
],CO:[]};
const workflowFixtures={
 negocios:{GT:[{id:'nGT1',canonicalDocumentId:'nGT1',tenantId:tenant,pais:'GT',asesorId:'a1'},{id:'nGT2',canonicalDocumentId:'nGT2',tenantId:tenant,pais:'GT',asesorId:'a2'}],CO:[{id:'nCO1',canonicalDocumentId:'nCO1',tenantId:tenant,pais:'CO',asesorId:'a1'}]},
 gestiones:{GT:[{id:'gGT1',canonicalDocumentId:'gGT1',tenantId:tenant,pais:'GT',asesorId:'a1'},{id:'gGT2',canonicalDocumentId:'gGT2',tenantId:tenant,pais:'GT',asesorId:'a2'}],CO:[{id:'gCO1',canonicalDocumentId:'gCO1',tenantId:tenant,pais:'CO',asesorId:'a1'}]}
};
const insurerFixtures={
 GT:[{id:'iGT',canonicalDocumentId:'iGT',tenantId:tenant,pais:'GT',nombre:'Aseguradora GT'}],
 CO:[{id:'iCO',canonicalDocumentId:'iCO',tenantId:tenant,pais:'CO',nombre:'Aseguradora CO'}]
};
const advisorFixtures={
 GT:[{id:'a1',canonicalDocumentId:'a1',tenantId:tenant,pais:'GT',paises:['GT','CO'],asesorId:'a1'},
     {id:'a2',canonicalDocumentId:'a2',tenantId:tenant,pais:'GT',paises:['GT'],asesorId:'a2'}],
 CO:[{id:'a1',canonicalDocumentId:'a1',tenantId:tenant,pais:'CO',paises:['GT','CO'],asesorId:'a1'}]
};
const deps={db:{},collection:()=>{direct++;throw Error('DIRECT_READ_USED');},
onSnapshot:()=>{direct++;throw Error('DIRECT_LISTENER_USED');},getDocsFromServer:()=>{direct++;throw Error('DIRECT_GET_USED');},
protectedReadPage:async req=>{
 calls.push({...req});
 const source=(req.collection==='polizas'?policyFixtures:req.collection==='recibosEsperados'?relatedFixtures:req.collection==='cobros'?cobrosFixtures:req.collection==='aseguradoras'?insurerFixtures:req.collection==='asesores'?advisorFixtures:workflowFixtures[req.collection]||dataset);
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
 // Exactly eight required collections, no direct Firestore fallback.
 // A single advisor belongs to GT and CO: duplicate canonical ID must merge
 // across countries but must never survive twice within one country.
 role='operativo';
 const allRequired=['clientes','polizas','cobros','aseguradoras','vehiculos','recibosEsperados','carteraPrimas','asesores'];
 const allConfig=config(allRequired);allConfig.requiredCollections=allRequired;
 const startup=win.Orbit.createFirestoreProductReadOnlyStoreP0(deps,allConfig);
 assert.equal(startup._attachSnapshots(),true);
 await pause();
 assert.ok(allRequired.every(name=>startup._productStatus().serverConfirmedCollections.includes(name)),
   'ALL_EIGHT_REQUIRE_AUTHORITATIVE_SERVER_RESPONSE');
 assert.deepEqual(Array.from(startup.all('aseguradoras'),x=>x.id),['iGT','iCO']);
 assert.deepEqual(Array.from(startup.all('asesores'),x=>x.id),['a1','a2']);
 assert.equal(direct,0);
  console.log('B4_003_PROTECTED_EIGHT_REQUIRED_COLLECTIONS_QA_PASS checks=5 no_direct_firestore multi_country_advisor_merged');
 const flowsConfig=config(['negocios','gestiones']);flowsConfig.requiredCollections=['negocios','gestiones'];
 const flows=win.Orbit.createFirestoreProductReadOnlyStoreP0(deps,flowsConfig);
 assert.equal(flows._attachSnapshots(),true);
 await pause();
 assert.deepEqual(Array.from(flows.all('negocios'),x=>x.id),['nGT1','nGT2','nCO1']);
 assert.deepEqual(Array.from(flows.all('gestiones'),x=>x.id),['gGT1','gGT2','gCO1']);
 role='asesor';events['orbit:active-role-changed'].slice().forEach(fn=>fn());
 await pause();
 assert.deepEqual(Array.from(flows.all('negocios'),x=>x.id),['nGT1','nCO1']);
 assert.deepEqual(Array.from(flows.all('gestiones'),x=>x.id),['gGT1','gCO1']);
 assert.equal(direct,0);
 console.log('B4_003_PROTECTED_OPS_LEADS_HYDRATION_ROLE_SWITCH_PASS checks=5 no_direct_firestore');
 role='operativo';events['orbit:active-role-changed'].slice().forEach(fn=>fn());
 await pause();
 role='asesor';
 const store=win.Orbit.createFirestoreProductReadOnlyStoreP0(deps,config(['clientes']));
 assert.equal(store._attachSnapshots(),true);await pause();
 assert.deepEqual(Array.from(store.all('clientes'),x=>x.id),['c1','c3']);
 assert.equal(direct,0);assert.equal(store._productStatus().serverConfirmedCollections.includes('clientes'),true);
 assert.ok(calls.some(x=>x.country==='GT'&&x.activeRole==='asesor'));
 role='operativo';events['orbit:active-role-changed'].slice().forEach(fn=>fn());
 assert.deepEqual(Array.from(store.all('clientes'),x=>x.id),[]);
 await pause();assert.deepEqual(Array.from(store.all('clientes'),x=>x.id),['c1','c2','c3']);
 assert.equal(direct,0);
 const finance=win.Orbit.createFirestoreProductReadOnlyStoreP0(deps,config(['cobros']));
 const from=calls.length;
 assert.equal(finance._attachSnapshots(),true);await pause();
 assert.deepEqual(Array.from(finance.all('cobros'),x=>x.id),['pay1','pay2']);
 assert.equal(finance._productStatus().serverConfirmedCollections.includes('cobros'),true);
 assert.equal(calls.slice(from).filter(x=>x.collection==='cobros').length,3,
   'COBROS_MUST_NOT_FETCH_142_PLUS_POLICY_ANCHOR_BATCHES');
 assert.ok(calls.slice(from).filter(x=>x.collection==='cobros').every(x=>!x.policyId&&!Array.isArray(x.policyIds)));
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
