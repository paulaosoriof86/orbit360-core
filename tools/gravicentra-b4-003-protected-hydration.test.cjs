'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('orbit360-platform/data/store-firestore-product-readonly-p0.js','utf8');
const provider=fs.readFileSync('orbit360-platform/core/product-runtime-browser-providers-p0.js','utf8');
const app=fs.readFileSync('orbit360-platform/core/product-app-p0.js','utf8');
const bootstrap=fs.readFileSync('orbit360-platform/core/backend-product-readonly-bootstrap-p0.js','utf8');
// Real Chrome surfaced an authenticated but blocked login; the prior console
// wrote "Object", hiding even the finite, non-sensitive failure category.
// This probe must never reveal Firebase error text, UIDs, emails or paths.
const diagnosticBegin=bootstrap.indexOf('  function safeFailureDetail(');
const diagnosticEnd=bootstrap.indexOf('  function dependencyErrors(',diagnosticBegin);
assert.ok(diagnosticBegin>0&&diagnosticEnd>diagnosticBegin,'SAFE_BOOTSTRAP_DIAGNOSTIC_MISSING');
const diagnostic={};
vm.runInNewContext("function text(value){return String(value == null ? '' : value).trim();}\n"+
  bootstrap.slice(diagnosticBegin,diagnosticEnd)+'\nthis.probe=safeFailureDetail;',diagnostic);
const pii='private-name@example.test tenant/secret-user',snapshot=message=>({
  _productStatus:()=>({snapshotErrors:{clientes:message+' '+pii}})
});
assert.equal(diagnostic.probe(new Error('product_store_blocked:snapshot-error'),
  snapshot('functions/permission-denied')),'FUNCTION_PERMISSION_DENIED');
assert.equal(diagnostic.probe(new Error('product_store_blocked:snapshot-error'),
  snapshot('PROTECTED_READ_COUNTRY_MISMATCH')),'COUNTRY_MISMATCH');
assert.equal(diagnostic.probe(new Error('product_store_readiness_timeout'),null),
  'STORE_TIMEOUT_UNCLASSIFIED');
assert.equal(diagnostic.probe(new Error('product_readiness_blocked:auth_email_no_verificado'),null),
  'READINESS_EMAIL_UNVERIFIED');
assert.equal(diagnostic.probe(new Error('product_store_blocked:snapshot-error'),
  snapshot('RAW_INTERNAL_DETAILS')),'STORE_SNAPSHOT_OTHER');
assert.match(app,/READONLY_BOOTSTRAP_BLOCKED phase=/);
assert.doesNotMatch(app,/console\.warn\('\[Orbit Product\] READONLY_BOOTSTRAP_BLOCKED',\{/);
console.log('B4_003_SAFE_POST_AUTH_DIAGNOSTIC_QA_PASS categories=5 no_personal_data');
assert.match(provider,/orbit360ScopedPolicyReadPreview/);
assert.match(app,/scopedReadPreviewCandidate===true/);
assert.match(bootstrap,/protectedReadCandidate: options.protectedReadCandidate===true/);

// Fail-closed role-switch regression: only an exact stale module visibility
// error for Operativo Ops/Leads may be reconciled, never disabled modules,
// foreign roles, denied scopes, mismatched tenants or additional plan errors.
const begin=bootstrap.indexOf('  function protectedReadRolePlan(');
const end=bootstrap.indexOf('  // B4_003_PROTECTED_ROLE_QUERY_PARITY_END',begin);
assert.ok(begin>0&&end>begin,'B4_003_PROTECTED_ROLE_QUERY_PARITY_HELPER_MISSING');
const probeContext={window:{Orbit:{access:{can:(module,action)=>['ops','leads'].includes(module)&&action==='view'}}}};
vm.runInNewContext(bootstrap.slice(begin,end)+'\nthis.probe=protectedReadRolePlan;',probeContext);
const prototypePlan=(moduleKey)=>({ok:false,errors:['modulo_no_visible'],module:moduleKey,scope:'all',
 constraints:[{field:'tenantId',op:'==',value:'synthetic-tenant'}]});
const membershipProbe={tenantId:'synthetic-tenant'};
for(const [collection,module] of [['negocios','leads'],['gestiones','ops']]){
 const plan=prototypePlan(module),fixed=probeContext.probe(collection,membershipProbe,'Operativo',plan);
 assert.equal(fixed.ok,true,'OPERATIVE_PROTECTED_MODULE_VISIBILITY_PARITY_REQUIRED');
 assert.equal(fixed.constraints[0].value,'synthetic-tenant');
 assert.equal(probeContext.probe(collection,membershipProbe,'Asesor',plan).ok,false,
   'FOREIGN_ROLE_MUST_NOT_BYPASS');
 const extra={...plan,errors:['modulo_no_visible','tenant_constraint_unico_requerido']};
 assert.equal(probeContext.probe(collection,membershipProbe,'Operativo',extra).ok,false,
   'OTHER_QUERY_PLAN_ERRORS_MUST_REMAIN_BLOCKING');
 const noScope={...plan,scope:'none',constraints:[...plan.constraints,{field:'__deny__',op:'==',value:true}]};
 assert.equal(probeContext.probe(collection,membershipProbe,'Operativo',noScope).ok,false,
   'SCOPE_NONE_MUST_REMAIN_DENIED');
 const wrongTenant={...plan,constraints:[{field:'tenantId',op:'==',value:'foreign-tenant'}]};
 assert.equal(probeContext.probe(collection,membershipProbe,'Operativo',wrongTenant).ok,false,
   'TENANT_CONSTRAINT_MUST_REMAIN_EXACT');
}
const deniedAccess={window:{Orbit:{access:{can:()=>false}}}};
vm.runInNewContext(bootstrap.slice(begin,end)+'\nthis.probe=protectedReadRolePlan;',deniedAccess);
assert.equal(deniedAccess.probe('gestiones',membershipProbe,'Operativo',prototypePlan('ops')).ok,false,
 'MODULE_NOT_ENABLED_MUST_REMAIN_DENIED');
console.log('B4_003_PROTECTED_OPERATIVE_ROLE_SWITCH_PARITY_STATIC_AND_VM_PASS checks=12 no_data_writes');
// Recompute effective modules for the actual selected Operativo role, not
// a stale set frozen while signed in as Dirección. No blanket UI bypass.
const membershipOwnerSource=fs.readFileSync('orbit360-platform/core/membership-multirol-contract-p0.js','utf8');
const membershipCtx={window:{Orbit:{}}};
vm.runInNewContext(membershipOwnerSource,membershipCtx);
membershipCtx.window.Orbit.membershipMultirolEffectiveP0={
 effectiveModules:membershipCtx.window.Orbit.membershipMultirolP0.effectiveModules};
vm.runInNewContext(bootstrap.slice(begin,end)+'\nthis.roleMembership=protectedRoleMembership;',membershipCtx);
const initial={tenantId:'synthetic-tenant',status:'active',
 roles:['Dirección','Operativo','Asesor'],activeRole:'Dirección',
 modulesVisible:[],modulesExtra:[],modulesRestricted:['comisiones'],
 countries:['GT'],dataScopes:{default:'all',modules:{}}};
const chosen=membershipCtx.roleMembership(initial,'Operativo');
assert.equal(chosen.activeRole,'Operativo');
assert.ok(chosen.modulesVisible.includes('cliente360')&&chosen.modulesVisible.includes('polizas')&&
 chosen.modulesVisible.includes('cobros')&&chosen.modulesVisible.includes('ops')&&
 chosen.modulesVisible.includes('leads'),'OPERATIVO_APPROVED_MODULE_PROJECTION_REQUIRED');
assert.ok(!chosen.modulesVisible.includes('comisiones'),'RESTRICTED_COMMISSION_NOT_VISIBLE');
assert.ok(!chosen.modulesVisible.includes('siniestros'),'UNAPPROVED_MODULE_NOT_GRANTED');
assert.deepEqual(Array.from(initial.modulesVisible),[],'ORIGINAL_MEMBERSHIP_UNMODIFIED');
const adviserView=membershipCtx.roleMembership(initial,'Asesor');
assert.ok(adviserView.modulesVisible.includes('cliente360')&&adviserView.modulesVisible.includes('polizas')&&adviserView.modulesVisible.includes('cobros'),'ADVISOR_MUST_RECOMPOSE_APPROVED_MODULES');
assert.ok(!adviserView.modulesVisible.includes('comisiones')&&!adviserView.modulesVisible.includes('equipo'),'ADVISOR_MUST_NOT_INHERIT_DIRECTION_MODULES');
assert.deepEqual(Array.from(initial.modulesVisible),[],'UNCHANGED_SIGNED_MEMBER');
const unavailable={window:{Orbit:{}}};
vm.runInNewContext(bootstrap.slice(begin,end)+'\nthis.roleMembership=protectedRoleMembership;',unavailable);
assert.deepEqual(Array.from(unavailable.roleMembership(initial,'Operativo').modulesVisible),[],
 'MISSING_EFFECTIVE_MODULE_OWNER_FAILS_CLOSED');
console.log('B4_003_OPERATIVO_SELECTED_ROLE_MODULE_RECOMPOSITION_VM_PASS checks=8 no_data_writes');


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
const vehicleFixtures={
 GT:[{id:'v1',canonicalDocumentId:'v1',tenantId:tenant,pais:'GT',polizaId:'p1',asesorId:'a1'},
 {id:'v2',canonicalDocumentId:'v2',tenantId:tenant,pais:'GT',polizaId:'p2',asesorId:'a2'}],
 CO:[{id:'v3',canonicalDocumentId:'v3',tenantId:tenant,pais:'CO',polizaId:'p3',asesorId:'a1'}]
};
const portfolioFixtures={
 GT:[{id:'d1',canonicalDocumentId:'d1',tenantId:tenant,pais:'GT',polizaId:'p1',asesorId:'a1'}],
 CO:[{id:'d3',canonicalDocumentId:'d3',tenantId:tenant,pais:'CO',polizaId:'p3',asesorId:'a1'}]
};
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
 const source=(req.collection==='polizas'?policyFixtures:req.collection==='recibosEsperados'?relatedFixtures:req.collection==='vehiculos'?vehicleFixtures:req.collection==='carteraPrimas'?portfolioFixtures:req.collection==='cobros'?cobrosFixtures:req.collection==='aseguradoras'?insurerFixtures:req.collection==='asesores'?advisorFixtures:workflowFixtures[req.collection]||dataset);
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
 assert.deepEqual(Array.from(startup.all('vehiculos'),x=>x.id),['v1','v2','v3']);
 assert.deepEqual(Array.from(startup.all('carteraPrimas'),x=>x.id),['d1','d3']);
 assert.equal(direct,0);
 
 // B4-003 P0: 443 synthetic cross-country clients must hydrate in <=3 bounded
 // requests, preserving complete authoritative results and no direct Firestore.
 const bulkByCountry={
   GT:Array.from({length:400},(_,i)=>({id:'gt-client-'+i,canonicalDocumentId:'gt-client-'+i,tenantId:tenant,pais:'GT',asesorId:'a1'})),
   CO:Array.from({length:43},(_,i)=>({id:'co-client-'+i,canonicalDocumentId:'co-client-'+i,tenantId:tenant,pais:'CO',asesorId:'a1'}))
 };
 const bulkCalls=[];
 const bulkDeps={...deps,protectedReadPage:async req=>{
   bulkCalls.push({collection:req.collection,country:req.country,pageSize:req.pageSize,cursor:req.cursor});
   assert.equal(req.collection,'clientes','P0_BOOTSTRAP_CLIENTS_ONLY');
   assert.equal(req.pageSize,200,'P0_CLIENTS_PAGE_SIZE_BOUND');
   const source=bulkByCountry[req.country]||[];
   const pos=req.cursor?source.findIndex(row=>row.id===req.cursor)+1:0;
   const portion=source.slice(pos,pos+req.pageSize);
   return {ok:true,serverScoped:true,collection:'clientes',country:req.country,rows:portion,
     nextCursor:pos+portion.length<source.length?portion[portion.length-1].id:null};
 }};
 const bulkStore=win.Orbit.createFirestoreProductReadOnlyStoreP0(bulkDeps,config(['clientes']));
 assert.equal(bulkStore._attachSnapshots(),true);
 await pause();
 assert.equal(bulkStore._productStatus().ready,true,'P0_COMPLETE_CLIENT_UNIVERSE_AUTHORITATIVE');
 assert.equal(bulkStore.all('clientes').length,443,'P0_NO_PARTIAL_CLIENT_FINALS');
 assert.equal(bulkCalls.length,3,'P0_NO_9_SEQUENTIAL_CLIENT_PAGE_ROUNDTRIPS');
 assert.equal(direct,0,'P0_NO_BROWSER_FIRESTORE_FALLBACK');
 console.log('B4_003_P0_CLIENT_PAGE_BATCHING_SYNTHETIC_PASS clients=443 calls=3 pageSize=200 directFirestore=0 writes=0');
 // Cross-country calls may overlap, but the visible snapshot is all-or-none.
 // An early GT response must never expose a partial or stale role universe.
 const pendingCountries={},concurrentCalls=[];
 const concurrentDeps={...deps,protectedReadPage:req=>new Promise(resolve=>{
   concurrentCalls.push(req.country);
   pendingCountries[req.country]=resolve;
 })};
 const concurrentStore=win.Orbit.createFirestoreProductReadOnlyStoreP0(concurrentDeps,config(['clientes']));
 assert.equal(concurrentStore._attachSnapshots(),true);
 await pause();
 assert.deepEqual(concurrentCalls,['GT','CO'],'COUNTRIES_MUST_START_WITHOUT_SERIAL_WAIT');
 const response=(country,id)=>({ok:true,serverScoped:true,collection:'clientes',country,
   rows:[{id,canonicalDocumentId:id,tenantId:tenant,pais:country}],nextCursor:null});
 pendingCountries.GT(response('GT','parallel-gt'));
 await pause();
 assert.equal(concurrentStore.all('clientes').length,0,'PARTIAL_COUNTRY_MUST_NOT_RENDER');
 assert.equal(concurrentStore._productStatus().serverConfirmedCollections.includes('clientes'),false,
   'PARTIAL_COUNTRY_MUST_NOT_CONFIRM_SOURCE');
 pendingCountries.CO(response('CO','parallel-co'));
 await pause();
 assert.deepEqual(Array.from(concurrentStore.all('clientes'),x=>x.id),['parallel-gt','parallel-co'],
   'CONCURRENT_COUNTRIES_PRESERVE_DETERMINISTIC_COUNTRY_ORDER');
 const invalidStore=win.Orbit.createFirestoreProductReadOnlyStoreP0({...deps,protectedReadPage:async req=>
   response(req.country,'cross-country-shared-document')},config(['clientes']));
 assert.equal(invalidStore._attachSnapshots(),true);
 await pause();
 assert.equal(invalidStore.all('clientes').length,0,'CROSS_COUNTRY_DUPLICATE_MUST_NOT_RENDER');
 assert.match(invalidStore._productStatus().snapshotErrors.clientes,/PROTECTED_READ_DUPLICATE_OR_MISSING_ID/,
   'CROSS_COUNTRY_DUPLICATE_MUST_FAIL_CLOSED');
 assert.equal(direct,0,'CONCURRENT_READS_MUST_NOT_USE_DIRECT_FIRESTORE');
 console.log('B4_003_PARALLEL_COUNTRY_READ_ATOMIC_COMMIT_SYNTHETIC_PASS starts=2 no_partial no_duplicate no_direct_firestore writes=0');
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
 assert.ok(calls.filter(x=>x.collection==='recibosEsperados').every(x=>!x.policyId&&!Array.isArray(x.policyIds)),
  'RECEIPTS_MUST_USE_INDEPENDENT_SERVER_VERIFIED_PAGES');
 assert.ok(calls.filter(x=>['vehiculos','carteraPrimas','cobros'].includes(x.collection)).every(x=>!x.policyId&&!Array.isArray(x.policyIds)),
  'FINANCIAL_VEHICLE_READS_MUST_NOT_TRAVERSE_ALL_POLICIES');
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
 let bootstrapRole='asesor',capturedPlanner=null,capturedStoreDeps=null,directStoreDepsCalls=0;
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
     capturedStoreDeps=_deps;
     capturedPlanner=opts.queryPlanner;
     throw Error('STOP_AFTER_CAPTURE');
   }
 };
 const mockWindow={Orbit:mockOrbit,dispatchEvent:()=>{}};
 vm.runInNewContext(bootstrap,{window:mockWindow,console,Promise,setTimeout,clearTimeout,Date,CustomEvent:function(){}});
 const bootDeps={
   environmentProvider:{describePublicConfig:async()=>({})},
   firebaseAdapter:{initializeFromEnvironment:async()=>({db:{}}),storeDependencies:()=>{
     directStoreDepsCalls++;return {db:{},collection:()=>{},getDocsFromServer:()=>{},onSnapshot:()=>{}};
   }},
   authProvider:{waitForAuthenticatedUser:async()=>({uid:'mock-uid',email:'test@example.test'})},
   membershipProvider:{getByUid:async()=>authorizedMembership},
   protectedReadPage:async()=>({ok:true})
 };
 const bootResult=await mockOrbit.backendProductReadOnlyBootstrapP0.start(bootDeps,{
   mode:'product',authorizedProductReadOnly:true,runtimeAuthorized:true,
   protectedReadCandidate:true,collections:['clientes']
 });
 assert.equal(bootResult.ok,false,'only controlled QA capture is expected');
 assert.equal(directStoreDepsCalls,0,'PROTECTED_BOOTSTRAP_MUST_NEVER_ACQUIRE_DIRECT_STORE_DEPENDENCIES');
 assert.deepEqual(Object.keys(capturedStoreDeps).sort(),['protectedReadPage'],
   'PROTECTED_BOOTSTRAP_MUST_PASS_CALLABLE_ONLY');
 assert.equal(typeof capturedPlanner,'function');
 assert.equal(capturedPlanner('clientes').scope,'asesor');
 bootstrapRole='operativo';
 assert.equal(capturedPlanner('clientes').scope,'operativo');
 bootstrapRole='unassigned';
 assert.equal(capturedPlanner('clientes').hardError,true);
 // The unprotected channel is unchanged, so this scoped correction does not
 // silently convert the existing LIVE application into a broken Preview.
 capturedStoreDeps=null;capturedPlanner=null;
 const liveResult=await mockOrbit.backendProductReadOnlyBootstrapP0.start(bootDeps,{
   mode:'product',authorizedProductReadOnly:true,runtimeAuthorized:true,
   protectedReadCandidate:false,collections:['clientes']
 });
 assert.equal(liveResult.ok,false,'only controlled QA capture is expected');
 assert.equal(directStoreDepsCalls,1,'LEGACY_CHANNEL_BEHAVIOR_MUST_REMAIN_UNCHANGED_PENDING_RULES_MIGRATION');
 assert.equal(typeof capturedStoreDeps.getDocsFromServer,'function');
 console.log('B4_003_PROTECTED_STORE_TRANSPORT_ISOLATION_PASS callable_only=true directDeps=0 legacy_unchanged=true');

 // The identical artifact has separate protected reader names on Preview/LIVE.
 // Neither hostname alone authorizes the transport; the flag is mandatory.
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
  /PRODUCT_RUNTIME_NOT_CONFIGURED/);
 await assert.rejects(flagCase(true,'ays-orbit-360-lab--gi-i65-b4-test.web.app'),
  /PRODUCT_RUNTIME_NOT_CONFIGURED/);
 // Detect fail-open: missing flags on either release host and a leaked flag on
 // unrelated hosts must NEVER initialize direct Firestore SDK.
 const scopedHost='ays-orbit-360-lab--gi-i65-b4-synthetic.web.app';
 const liveHost='ays-orbit-360-lab.web.app';
 const unrelatedHost='ays-orbit-360-lab--other-synthetic.web.app';
 const guardedMembership=(flag,hostname)=>{
   const w={Orbit:{},location:{hostname},__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{
     enabled:false,tenantHint:tenant,scopedReadPreviewCandidate:flag}};
   vm.runInNewContext(provider,{window:w,Promise,console},{timeout:1000});
   return w.Orbit.productRuntimeBrowserProvidersP0.dependencies().membershipProvider.getByUid('synthetic-uid');
 };
 await assert.rejects(guardedMembership(false,scopedHost),/PROTECTED_READ_CANDIDATE_DISABLED/);
 await assert.rejects(guardedMembership(false,liveHost),/PROTECTED_READ_CANDIDATE_DISABLED/);
 await assert.rejects(guardedMembership(true,liveHost),/PRODUCT_RUNTIME_NOT_CONFIGURED/);
 await assert.rejects(guardedMembership(true,unrelatedHost),/PROTECTED_READ_HOST_DENIED/);
 await assert.rejects(guardedMembership(true,scopedHost),/PRODUCT_RUNTIME_NOT_CONFIGURED/);
 const guardedApp=(flag,hostname)=>{
   const w={Orbit:{},location:{hostname},__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{
     enabled:true,scopedReadPreviewCandidate:flag}};
   vm.runInNewContext(app,{window:w,Orbit:w.Orbit,Promise,console,
     document:{querySelector:()=>null,dispatchEvent:()=>{}},
     CustomEvent:function(){}},{timeout:1000});
   return w.Orbit.productAppP0.activate();
 };
 await assert.rejects(guardedApp(false,scopedHost),/PROTECTED_READ_CANDIDATE_DISABLED/);
 await assert.rejects(guardedApp(false,liveHost),/PROTECTED_READ_CANDIDATE_DISABLED/);
 await assert.rejects(guardedApp(true,liveHost),/PRODUCT_RUNTIME_PROVIDERS_MISSING/);
 await assert.rejects(guardedApp(true,unrelatedHost),/PROTECTED_READ_HOST_DENIED/);
 console.log('B4_003_PROTECTED_TRANSPORT_NON_DOWNGRADE_VM_PASS checks=10 no_direct_firestore no_network');
 console.log('B4_003_PROTECTED_READ_PREVIEW_FLAG_QA_PASS checks=3 mock_only no_network');
 console.log('B4_003_ACTUAL_BOOTSTRAP_ROLE_RECOMPILE_PASS mock-only no-reads');
 console.log('B4_003_PROTECTED_HYDRATION_MOCK_PASS no_direct_firestore role_cache_reset protected_related_policy_batches');
})().catch(error=>{console.error(error);process.exitCode=1;});

/* B4-003 current-source regression: checks are static only, not authenticated PASS. */
{
 const session=fs.readFileSync('orbit360-platform/core/access-role-session-owner-v20260728.js','utf8');
 const store=fs.readFileSync('orbit360-platform/data/store-firestore-product-readonly-p0.js','utf8');
 const reader=fs.readFileSync('functions/b4-003-scoped-related-reader.js','utf8');
 const config=fs.readFileSync('orbit360-platform/product-runtime-config.js','utf8');
 const before=session.indexOf("document.dispatchEvent(new CustomEvent('orbit:active-role-changed'");
 const after=session.indexOf("if (saved && projection) emitSession()");
 assert.ok(before>=0&&after>before,'ROLE_INVALIDATION_MUST_PRECEDE_SESSION_RENDER');
 assert.ok(store.includes('state.snapshotSources={};state.queryPlans={};state.snapshotErrors={};'),'ROLE_CACHE_INVALIDATION_REQUIRED');
 assert.ok(store.includes('startupCollections.forEach(function(k){attachCollection(k,true);});'),'ROLE_CHANGE_MUST_NOT_REATTACH_ALL_COLLECTIONS');
 const collections=(reader.match(/const collections=new Set\(\[([^\]]*)\]\)/)||[])[1]||'';
 for(const name of ['cancelaciones','auditoria']){
  assert.ok(config.includes("'"+name+"'"),'CONFIGURED_COLLECTION_MISSING_'+name);
  if(!collections.includes("'"+name+"'"))console.log('B4_003_PROTECTED_COVERAGE_HOLD_'+name);
 }
 assert.ok(reader.includes("if(!collections.has(coll))throw new Denied('COLLECTION_DENIED')"),'PROTECTED_COLLECTION_DENIAL_REQUIRED');
 console.log('B4_003_ROLE_HYDRATION_STATIC_PASS_NOT_AUTHENTICATED');
}
