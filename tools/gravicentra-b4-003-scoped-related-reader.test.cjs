'use strict';
const assert=require('node:assert/strict');
const {readScopedRelatedDocument,readScopedRelatedList}=require('../functions/b4-003-scoped-related-reader');
const {Denied}=require('../functions/b4-003-scoped-access-boundary');
const tenantId='alianzas-soluciones';

const {resolve:resolveSecureModule}=require('../functions/b4-003-scoped-access-boundary');
// B4-003 C03/C04: a missing explicit deny MUST NOT grant an unrelated module.
// These are pure server-owner calls with synthetic memberships, never user tokens.
const secureCase=(role,collection,extraConfig={},extraMember={})=>{
 const member={uid:'u-sec',tenantId,status:'active',roles:[role],advisorId:'a1',
   countries:['GT','CO'],dataScopes:{default:'all'},...extraMember};
 const config={roleScopes:{[role]:'all'},...extraConfig};
 return {auth:{uid:'u-sec',token:{}},member,config,tenantId,activeRole:role,
   country:'GT',collection};
};
const moduleSecurityCases=[
 ['Marketing no Cliente360','Marketing','clientes',false,'MODULE_DENIED'],
 ['Marketing Leads','Marketing','negocios',true],
 ['Finanzas no Clientes','Finanzas','clientes',false,'MODULE_DENIED'],
 ['Finanzas Cobros','Finanzas','cobros',true],
 ['Finanzas Recibos como Cobros','Finanzas','recibosEsperados',true],
 ['Finanzas no Cancelaciones','Finanzas','cancelaciones',false,'MODULE_DENIED'],
 ['Asistente no Polizas','Asistente','polizas',false,'MODULE_DENIED'],
 ['Asistente Cliente360','Asistente','clientes',true],
 ['Comercial no Cobros','Comercial','cobros',false,'MODULE_DENIED'],
 ['Comercial Cliente360','Comercial','clientes',true],
 ['Operativo Cancelaciones','Operativo','cancelaciones',true],
 ['Asesor Cancelaciones propio','Asesor','cancelaciones',true],
 ['Asesor no Equipo','Asesor','auditoria',false,'TEAM_DIRECTORY_DENIED'],
 ['Asesor Sr Cliente360 propio','Asesor Sr.','clientes',true],
 ['Dirección Equipo','Dirección','asesores',true],
 ['AdminTenant Cobros','AdminTenant','cobros',true]
];
let positiveModuleChecks=0;
for(const [label,role,collection,allow,code] of moduleSecurityCases){
 const args=secureCase(role,collection);
 if(allow){
   const ctx=resolveSecureModule(args);
   assert.ok(ctx.scope!=='none'&&ctx.role,'SERVER_AFFIRMATIVE_ROLE_'+label);
 }else{
   assert.throws(()=>resolveSecureModule(args),e=>e instanceof Denied&&e.code===code,
     'SERVER_NEGATIVE_MODULE_'+label);
 }positiveModuleChecks++;
}
const selectedAdvisor=secureCase('Asesor','auditoria',{},{
 roles:['Dirección','Asesor'],modulesVisible:['*','equipo']
});
assert.throws(()=>resolveSecureModule(selectedAdvisor),e=>e instanceof Denied&&e.code==='TEAM_DIRECTORY_DENIED',
 'MULTIROLE_DIRECTION_MODULES_VISIBLE_MUST_NOT_LEAK_IN_ADVISOR');positiveModuleChecks++;
const financeExtra=secureCase('Marketing','clientes',{rolePermissions:{Marketing:{cliente360:{ver:true}}}});
assert.equal(resolveSecureModule(financeExtra).scope,'team','EXPLICIT_ROLE_MODULE_GRANT_RESPECTS_TEAM_CEILING');positiveModuleChecks++;
const cancelFalse=secureCase('Operativo','cancelaciones',{rolePermissions:{Operativo:{cancelaciones:{ver:false}}}});
assert.throws(()=>resolveSecureModule(cancelFalse),e=>e instanceof Denied&&e.code==='MODULE_DENIED',
 'STORED_FALSE_OVERRIDES_OPERATIVE_BASELINE');positiveModuleChecks++;
const restrictedAdvisor=secureCase('Asesor','clientes',{}, {modulesRestricted:['cliente360']});
assert.throws(()=>resolveSecureModule(restrictedAdvisor),e=>e instanceof Denied&&e.code==='MODULE_DENIED',
 'INDIVIDUAL_MODULE_RESTRICTION_OVERRIDES_APPROVED_ROLE');positiveModuleChecks++;
console.log('B4_003_AFFIRMATIVE_MODULE_ENTITLEMENT_QA_PASS checks='+positiveModuleChecks+' synthetic_only no_Firebase_no_writes');

const fs=require('node:fs');
const bootstrapSource=fs.readFileSync(require('node:path').join(__dirname,'../functions/bootstrap.js'),'utf8');
const functionsPackage=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../functions/package.json'),'utf8'));
assert.equal(functionsPackage.main,'bootstrap.js','B4_003_FUNCTIONS_ENTRYPOINT');
assert.ok(bootstrapSource.includes("require('./b4-003-scoped-policy-callable')"),'B4_003_PROTECTED_CALLABLE_MUST_BE_EXPORTED');
const rawReader=fs.readFileSync(require('node:path').join(__dirname,'../functions/b4-003-scoped-related-reader.js'),'utf8');
const protectedBrowserProvider=fs.readFileSync(require('node:path').join(__dirname,'../orbit360-platform/core/product-runtime-browser-providers-p0.js'),'utf8');
for(const collection of ['actividades','metas','reclamos']) {
 assert.ok(protectedBrowserProvider.includes("'"+collection+"'"),
   'B4_003_PROTECTED_BROWSER_ALLOWLIST_MISSING_'+collection);
}

const routerSource=fs.readFileSync(require('node:path').join(__dirname,'../orbit360-platform/core/router.js'),'utf8');
const historialSource=fs.readFileSync(require('node:path').join(__dirname,'../orbit360-platform/modules/historial.js'),'utf8');
assert.ok(routerSource.includes("historial: ['actividades', 'clientes', 'polizas', 'asesores']"),
  'B4_003_HISTORIAL_ROUTER_REACTIVE_COLLECTIONS_REQUIRED');
assert.ok(historialSource.includes('function activityReadiness()')&&historialSource.includes('sourceState.ready?all.length'),
  'B4_003_HISTORIAL_MUST_NOT_RENDER_FALSE_ZERO_BEFORE_SERVER_READ');
assert.ok(rawReader.includes('Promise.all(anchors.map(async pid=>'),'B4_003_RELATED_ANCHORS_PARALLEL_BOUNDED_REQUIRED');
assert.ok(rawReader.includes('policyIds.length>10'),'B4_003_MAX_TEN_ANCHORS_PRESERVED');
const docs={
 clientes:{c1:{id:'c1',tenantId,pais:'GT',asesorId:'a1'},c2:{id:'c2',tenantId,pais:'GT',asesorId:'a2'}},
 polizas:{p1:{id:'p1',tenantId,pais:'GT',asesorId:'a1',clienteId:'c1'},p2:{id:'p2',tenantId,pais:'GT',asesorId:'a2',clienteId:'c2'}},
 vehiculos:{v1:{id:'v1',polizaId:'p1',clienteId:'c1'},v2:{id:'v2',polizaId:'p2',clienteId:'c2'}},
 recibosEsperados:{r1:{id:'r1',polizaId:'p1',clienteId:'c1',monto:12},r2:{id:'r2',polizaId:'p2',clienteId:'c2'},bad:{id:'bad',polizaId:'p1',clienteId:'c2'},orphan:{id:'orphan',polizaId:'missing',clienteId:'c1'},direct:{id:'direct',clienteId:'c1'}},
 carteraPrimas:{debt1:{id:'debt1',polizaId:'p1',clienteId:'c1',monto:10}},
 cobros:{directPaid:{id:'directPaid',clienteId:'c1',monto:1},paid1:{id:'paid1',polizaId:'p1',clienteId:'c1',monto:3},paid2:{id:'paid2',polizaId:'p2',clienteId:'c2'}},
 negocios:{n1:{id:'n1',tenantId,pais:'GT',asesorId:'a1',etapa:'nuevo'},n2:{id:'n2',tenantId,pais:'GT',asesorId:'a2',etapa:'cotizando'}},
 gestiones:{g1:{id:'g1',tenantId,pais:'GT',asesorId:'a1',lista:'Gestiones Admin'},g2:{id:'g2',tenantId,pais:'GT',asesorId:'a2',lista:'Emisiones'}},
 reclamos:{claim1:{id:'claim1',tenantId,pais:'GT',asesorId:'a1',clienteId:'c1',polizaId:'p1'},claim2:{id:'claim2',tenantId,pais:'GT',asesorId:'a2',clienteId:'c2',polizaId:'p2'}},
 actividades:{
  hPolicy:{id:'hPolicy',tenantId,polizaId:'p1',tipo:'llamada'},
  hClient:{id:'hClient',tenantId,clienteId:'c1',tipo:'nota'},
  hForeign:{id:'hForeign',tenantId,clienteId:'c2',tipo:'reunion'},
  hNoParent:{id:'hNoParent',tenantId,tipo:'sistema'},
  hWrongScope:{id:'hWrongScope',tenantId,polizaId:'p2',asesorId:'a1',tipo:'nota'}
 }
};
let member={uid:'u1',tenantId,status:'active',roles:['Asesor','Operativo'],advisorId:'a1',countries:['GT','CO'],dataScopes:{default:'own'}};
let cfg={roleScopes:{asesor:'own',operativo:'all'}};
const snap=v=>({exists:v!=null,data:()=>v});
let observedClientPageLimits=[];
const db={collection:x=>{assert.equal(x,'tenants');return{doc:tenant=>{assert.equal(tenant,tenantId);return{
 collection:col=>{
  if(col==='members')return {doc:()=>({get:async()=>snap(member)})};
  if(col==='config')return {doc:()=>({get:async()=>snap(cfg)})};
  if(col==='data')return{doc:collection=>({collection:items=>{assert.equal(items,'items');return queryModel(collection);}})};
  throw Error('UNKNOWN_COL:'+col);
 }
}}}}};
function queryModel(table,terms=[],after='',cap=100){
 const rows=docs[table]||{};
 return {
  doc:id=>({get:async()=>({id,exists:!!rows[id],data:()=>rows[id]})}),
  where:(field,op,value)=>queryModel(table,terms.concat([{field,op,value}]),after,cap),
  orderBy:field=>{assert.equal(field,'__name__');return queryModel(table,terms,after,cap);},
  startAfter:doc=>queryModel(table,terms,doc.id,cap),
  limit:n=>queryModel(table,terms,after,n),
  get:async()=>{if(table==='clientes')observedClientPageLimits.push(cap);return {docs:Object.keys(rows).sort().filter(id=>id>after).filter(id=>{
    const row=rows[id];return terms.every(t=>t.op==='=='?row[t.field]===t.value:
      t.op==='in'&&t.value.includes(row[t.field]));
   }).slice(0,cap).map(id=>({id,exists:true,data:()=>rows[id]}))};}
 };
}
const read=(collection,documentId,extras={})=>readScopedRelatedDocument({
 db,auth:{uid:'u1',token:extras.claims||{}},request:{tenantId,collection,documentId,country:extras.country||'GT',activeRole:extras.role||'asesor'}
});
async function deny(fn,code){let thrown;try{await fn()}catch(e){thrown=e}assert.ok(thrown instanceof Denied);assert.equal(thrown.code,code);}
(async()=>{
 let checks=0;
 for(const [col,id] of [['clientes','c1'],['vehiculos','v1'],['recibosEsperados','r1'],['carteraPrimas','debt1'],['cobros','paid1'],['recibosEsperados','direct'],['reclamos','claim1']]){
  const r=await read(col,id);assert.equal(r.row.id,id);assert.equal(r.scope,'own');checks++;
 }
 for(const [col,id] of [['clientes','c2'],['vehiculos','v2'],['recibosEsperados','r2'],['cobros','paid2'],['reclamos','claim2']]){
  await deny(()=>read(col,id),'RECORD_NOT_FOUND_OR_DENIED');checks++;
 }
 await deny(()=>read('recibosEsperados','bad'),'RELATION_CLIENT_MISMATCH');checks++;
 await deny(()=>read('recibosEsperados','orphan'),'RELATION_POLICY_NOT_FOUND');checks++;
 await deny(()=>read('clientes','c1',{country:'CO'}),'RECORD_NOT_FOUND_OR_DENIED');checks++;
 await deny(()=>read('credentialRefs','c1'),'COLLECTION_DENIED');checks++;
 member={...member,modulesRestricted:['cliente360']};
 await deny(()=>read('clientes','c1'),'MODULE_DENIED');checks++;
 member={...member,modulesRestricted:[],dataScopes:{default:'all'}};
 const all=await read('clientes','c2',{role:'operativo'});assert.equal(all.scope,'all');checks++;
 cfg={roleScopes:{...cfg.roleScopes,operativo:'none'}};
 await deny(()=>read('clientes','c1',{role:'operativo'}),'SCOPE_NONE');checks++;
 // Global batches must independently authorize all supplied policies and clients.
 member={...member,modulesRestricted:[],dataScopes:{default:'all'}};
 cfg={roleScopes:{asesor:'own',operativo:'all'}};
 const bulk=(collection,policyIds,role='operativo',options={})=>readScopedRelatedList({
  db,auth:{uid:'u1',token:{}},request:{tenantId,collection,policyIds,activeRole:role,country:'GT',pageSize:1,...options}
 });
 const first=await bulk('vehiculos',['p1','p2']);
 assert.deepEqual(first.rows.map(x=>x.id),['v1']);assert.equal(first.nextCursor,'v1');
 assert.equal(first.rows[0].pais,'GT');checks++;
 const second=await bulk('vehiculos',['p1','p2'],'operativo',{cursor:first.nextCursor});
 assert.deepEqual(second.rows.map(x=>x.id),['v2']);assert.equal(second.nextCursor,null);checks++;
 await deny(()=>bulk('vehiculos',['p1','p2'],'asesor'),'POLICY_NOT_FOUND_OR_DENIED');checks++;
 const validWithQuarantined=await bulk('recibosEsperados',['p1']);
 assert.deepEqual(validWithQuarantined.rows.map(x=>x.id),['r1']);
 assert.equal(validWithQuarantined.nextCursor,null);checks++;
 await deny(()=>bulk('vehiculos',['p1','p1']),'POLICY_BATCH_INVALID');checks++;
 await deny(()=>bulk('vehiculos',['p1','p2'],'operativo',{country:'CO'}),'POLICY_NOT_FOUND_OR_DENIED');checks++;
 await deny(()=>bulk('clientes',['p1']),'POLICY_ANCHOR_UNEXPECTED');checks++;
 const direct=await read('recibosEsperados','r1');assert.equal(direct.row.pais,'GT');checks++;
 const flow=(collection,role='operativo',options={})=>readScopedRelatedList({
  db,auth:{uid:'u1',token:{}},request:{tenantId,collection,activeRole:role,country:'GT',pageSize:50,...options}
 });

 // UAT5 source paging optimization is an exact bounded financial-contract change, never wider role/country authorization.
 const fullClientPage=await flow('clientes','operativo',{pageSize:200});
 assert.equal(fullClientPage.ok,true,'CLIENTS_200_PAGE_AUTHORIZED_SCOPED');
 assert.ok(Array.isArray(fullClientPage.rows),'CLIENTS_ONLY_PAGE_SHAPE');checks++;
 for(const coll of ['cobros','recibosEsperados','carteraPrimas','vehiculos']){
   const page=await flow(coll,'operativo',{pageSize:200});
   assert.equal(page.ok,true,'FINANCE_200_SCOPED_'+coll);checks++;
   await deny(()=>flow(coll,'operativo',{pageSize:201}),'PAGE_SIZE_INVALID');checks++;
 }
 await deny(()=>flow('clientes','operativo',{pageSize:201}),'PAGE_SIZE_INVALID');checks++;
 await deny(()=>flow('cancelaciones','operativo',{pageSize:200}),'PAGE_SIZE_INVALID');checks++;
 console.log('B4_003_P0_SCOPED_CLIENT_200_SERVER_ONLY_PASS checks=4 no_firestore_writes');
 // P0 regression: financial and vehicle universes do not require
 // N policy-batch HTTP requests. The server still validates policy/client FK.
 const receiptAll=await flow('recibosEsperados');
 assert.deepEqual(receiptAll.rows.map(x=>x.id),['direct','r1','r2']);checks++;
 const receiptOwn=await flow('recibosEsperados','asesor');
 assert.deepEqual(receiptOwn.rows.map(x=>x.id),['direct','r1']);checks++;
 const receiptCO=await flow('recibosEsperados','operativo',{country:'CO'});
 assert.deepEqual(receiptCO.rows.map(x=>x.id),[]);checks++;
 const portfolioGlobal=await flow('carteraPrimas');
 assert.deepEqual(portfolioGlobal.rows.map(x=>x.id),['debt1']);checks++;
 const vehicleGlobal=await flow('vehiculos');
 assert.deepEqual(vehicleGlobal.rows.map(x=>x.id),['v1','v2']);checks++;
 const vehicleOwn=await flow('vehiculos','asesor');
 assert.deepEqual(vehicleOwn.rows.map(x=>x.id),['v1']);checks++;
 const receiptPageOne=await flow('recibosEsperados','operativo',{pageSize:1});
 assert.deepEqual(receiptPageOne.rows.map(x=>x.id),['direct']);
 const receiptPageTwo=await flow('recibosEsperados','operativo',{pageSize:1,cursor:receiptPageOne.nextCursor});
 assert.deepEqual(receiptPageTwo.rows.map(x=>x.id),['r1']);checks++;
 await deny(()=>flow('recibosEsperados','operativo',{cursor:'bad'}),'CURSOR_DENIED');checks++;
 await deny(()=>flow('carteraPrimas','asesor',{policyIds:['p2']}),'POLICY_NOT_FOUND_OR_DENIED');checks++;
 const payAll=await flow('cobros');
 assert.deepEqual(payAll.rows.map(x=>x.id),['directPaid','paid1','paid2']);checks++;
 const payOwn=await flow('cobros','asesor');
 assert.deepEqual(payOwn.rows.map(x=>x.id),['directPaid','paid1']);checks++;
 const payPage=await flow('cobros','operativo',{pageSize:1});
 assert.deepEqual(payPage.rows.map(x=>x.id),['directPaid']);
 assert.equal(payPage.nextCursor,'directPaid');checks++;
 const payPageTwo=await flow('cobros','operativo',{pageSize:1,cursor:'directPaid'});
 assert.deepEqual(payPageTwo.rows.map(x=>x.id),['paid1']);checks++;
 await deny(()=>flow('cobros','operativo',{cursor:'wrong'}),'CURSOR_DENIED');checks++;
 for(const collection of ['negocios','gestiones']){
  const all=await flow(collection);assert.equal(all.rows.length,2);checks++;
  const own=await flow(collection,'asesor');assert.equal(own.rows.length,1);checks++;
  const id=collection==='negocios'?'n2':'g2';
  await deny(()=>read(collection,id),'RECORD_NOT_FOUND_OR_DENIED');checks++;
  await deny(()=>flow(collection,'operativo',{policyIds:['p1']}),'POLICY_ANCHOR_UNEXPECTED');checks++;
 }
 console.log('B4_003_OPS_LEADS_SCOPED_READ_SOURCE_QA_PASS checks=8 no_data_writes');
 // Regression: a client's current advisor may differ from its policy advisor.
 // Historical policy-linked finances remain scoped to their policy, while
 // the client itself cannot be read via that old ownership.
 docs.clientes.c1.asesorId='a2';
 const historicalReceipt=await read('recibosEsperados','r1');
 assert.equal(historicalReceipt.row.id,'r1');checks++;
 const historicalPolicyBatch=await bulk('vehiculos',['p1'],'asesor',{pageSize:5});
 assert.deepEqual(historicalPolicyBatch.rows.map(x=>x.id),['v1']);checks++;
 await deny(()=>read('clientes','c1'),'RECORD_NOT_FOUND_OR_DENIED');checks++;
 docs.clientes.c1.pais='CO';
 const validCrossBorder=await read('recibosEsperados','r1');
 assert.equal(validCrossBorder.row.pais,'GT');checks++;
 const policyCrossBorder=await bulk('vehiculos',['p1'],'asesor');
 assert.deepEqual(policyCrossBorder.rows.map(x=>x.id),['v1']);checks++;
 // Regression: stale row denormalization must not override verified policy
 // country/advisor for financial projections, but never widen foreign scope.
 for(const [collection,id] of [['recibosEsperados','r1'],['carteraPrimas','debt1'],['vehiculos','v1'],['cobros','paid1']]){
   docs[collection][id].pais='CO';docs[collection][id].asesorId='a2';
   const document=await read(collection,id);
   assert.equal(document.row.pais,'GT');assert.equal(document.row.asesorId,'a1');checks++;
   const projection=await flow(collection,'asesor');
   assert.ok(projection.rows.some(row=>row.id===id&&row.pais==='GT'&&row.asesorId==='a1'));checks++;
   await deny(()=>read(collection,id,{country:'CO'}),'RECORD_NOT_FOUND_OR_DENIED');checks++;
   delete docs[collection][id].pais;delete docs[collection][id].asesorId;
 }
 console.log('B4_003_CANONICAL_FINANCE_PARENT_SCOPE_QA_PASS checks=12 no_cross_country_escalation');
 docs.clientes.c1.pais='GT';docs.clientes.c1.asesorId='a1';
 console.log('B4_003_HISTORICAL_POLICY_ADVISOR_SCOPE_QA_PASS checks=5 no_cross_country_or_client_escalation');
 // P0 discriminator: old operational rows without pais must be recovered
 // only through a verified canonical country/tenant/role parent.
 docs.negocios.nLegacy={id:'nLegacy',tenantId,polizaId:'p1',asesorId:'a1',etapa:'nuevo'};
 docs.gestiones.gLegacy={id:'gLegacy',tenantId,clienteId:'c1',asesorId:'a1',lista:'Emisiones'};
 docs.gestiones.gNoParent={id:'gNoParent',tenantId,asesorId:'a1',lista:'Emisiones'};
 const legacyBiz=await flow('negocios','asesor');
 const legacyOps=await flow('gestiones','asesor');
 assert.ok(legacyBiz.rows.some(x=>x.id==='nLegacy'&&x.pais==='GT'),
   'B4_003_LEGACY_COUNTRY_RELATION_REGRESSION:negocios_missing_policy_derived_country');
 assert.ok(legacyOps.rows.some(x=>x.id==='gLegacy'&&x.pais==='GT'),
   'B4_003_LEGACY_COUNTRY_RELATION_REGRESSION:gestiones_missing_client_derived_country');
 assert.ok(!legacyOps.rows.some(x=>x.id==='gNoParent'),
   'B4_003_LEGACY_COUNTRY_RELATION_REGRESSION:unknown_country_must_remain_denied');
 checks+=3;
 // B4-003: history is a tenant-scoped product capability, but legacy records
 // with no verified country/parent must NOT become visible via a broad read.
 const scopedHistory=await flow('actividades','asesor');
 assert.deepEqual(scopedHistory.rows.map(x=>x.id),['hClient','hPolicy']);
 checks++;
 const privilegedHistory=await flow('actividades','operativo');
 assert.deepEqual(privilegedHistory.rows.map(x=>x.id),['hClient','hForeign','hPolicy','hWrongScope']);
 checks++;
 assert.ok(!privilegedHistory.rows.some(x=>x.id==='hNoParent'));checks++;
 await deny(()=>read('actividades','hNoParent'),'RECORD_NOT_FOUND_OR_DENIED');checks++;
 await deny(()=>read('actividades','hForeign'),'RECORD_NOT_FOUND_OR_DENIED');checks++;
 member={...member,modulesRestricted:['historial']};
 await deny(()=>flow('actividades','asesor'),'MODULE_DENIED');checks++;
 member={...member,modulesRestricted:[]};
 const coHistory=await flow('actividades','operativo',{country:'CO'});
 assert.equal(coHistory.rows.length,0);checks++;
 console.log('B4_003_HISTORY_VERIFIED_RELATION_ROLE_COUNTRY_SCOPE_QA_PASS checks=7 no_data_writes');
 console.log('B4_003_LEGACY_COUNTRY_RELATION_REGRESSION_PASS checks=3 no_data_writes');

 // R23 institutional/individual metas contract against secure B4 list.
 docs.metas={
  own:{id:'own',tenantId,asesorId:'a1',pais:'GT',moneda:'GTQ',tipo:'recaudo',mes:'2026-10',valor:120},
  other:{id:'other',tenantId,asesorId:'a2',pais:'GT',moneda:'GTQ',tipo:'recaudo',mes:'2026-10',valor:250},
  institution:{id:'institution',tenantId,pais:'GT',moneda:'GTQ',tipo:'prima',mes:'2026-10',valor:900},
  col:{id:'col',tenantId,asesorId:'a1',pais:'CO',moneda:'COP',tipo:'recaudo',mes:'2026-10',valor:330},
  currencyOnly:{id:'currencyOnly',tenantId,asesorId:'a1',moneda:'GTQ',tipo:'renovada',mes:'2026-10',valor:50},
  contradictory:{id:'contradictory',tenantId,asesorId:'a1',pais:'GT',moneda:'COP',tipo:'prima',mes:'2026-10',valor:999}
 };
 const ownGoals=await flow('metas','asesor',{pageSize:50});
 assert.deepEqual(ownGoals.rows.map(r=>r.id),['currencyOnly','own']);
 assert.ok(ownGoals.rows.every(r=>r.asesorId==='a1'&&r.pais==='GT'));checks++;
 const allGoals=await flow('metas','operativo',{pageSize:50});
 assert.deepEqual(allGoals.rows.map(r=>r.id),['currencyOnly','institution','other','own']);checks++;
 const countryGoal=await flow('metas','operativo',{country:'CO',pageSize:50});
 assert.deepEqual(countryGoal.rows.map(r=>r.id),['col']);checks++;
 await deny(()=>flow('metas','asesor',{policyIds:['p1']}),'META_POLICY_ANCHOR_UNEXPECTED');checks++;
 member={...member,modulesRestricted:['inicio']};
 await deny(()=>flow('metas','asesor'),'MODULE_DENIED');checks++;
 member={...member,modulesRestricted:[],dataScopes:{default:'own'}};
 const pagedGoals=await flow('metas','operativo',{pageSize:1});
 assert.equal(pagedGoals.rows.length,1);assert.ok(pagedGoals.nextCursor);checks++;
 const page2=await flow('metas','operativo',{pageSize:1,cursor:pagedGoals.nextCursor});
 assert.notEqual(page2.rows[0].id,pagedGoals.rows[0].id);checks++;

 // Guarded cancellation and audit branch; real membership/role resolver.
 const oldMember=member,oldCfg=cfg;
 docs.cancelaciones={
  aOwn:{id:'aOwn',tenantId,polizaId:'p1',clienteId:'c1'},
  bOther:{id:'bOther',tenantId,polizaId:'p2',clienteId:'c2'},
  cStale:{id:'cStale',tenantId,polizaId:'p1',clienteId:'c1',pais:'CO',asesorId:'a2'},
  dOrphan:{id:'dOrphan',tenantId,polizaId:'missing',clienteId:'c1'},
  eMismatch:{id:'eMismatch',tenantId,polizaId:'p1',clienteId:'c2'}
 };
 docs.auditoria={
  aGT:{id:'aGT',tenantId,pais:'GT',accion:'editar'},
  bCO:{id:'bCO',tenantId,pais:'CO',accion:'guardar'},
  cGlobal:{id:'cGlobal',tenantId,accion:'cambio',password:'secret',before:{secret:'secret'}},
  dForeign:{id:'dForeign',tenantId:'foreign',accion:'leer'}
 };
 member={...member,roles:['Asesor','Operativo','Dirección','AdminTenant'],
  modulesVisible:['equipo'],modulesRestricted:[],dataScopes:{default:'all'}};
 cfg={roleScopes:{asesor:'own',operativo:'all',direccion:'all',admintenant:'all'}};
 const cancelled=await flow('cancelaciones','operativo',{pageSize:50});
 assert.deepEqual(cancelled.rows.map(x=>x.id),['aOwn','bOther','cStale']);
 assert.equal(cancelled.rows[2].pais,'GT');checks++;
 const advisorCancellations=await flow('cancelaciones','asesor',{pageSize:50});
 assert.deepEqual(advisorCancellations.rows.map(x=>x.id),['aOwn'],'ADVISOR_ONLY_OWN_CANCELLATIONS');checks++;
 await deny(()=>read('cancelaciones','cStale',{role:'asesor'}),'RECORD_NOT_FOUND_OR_DENIED');checks++;
 await deny(()=>read('cancelaciones','bOther',{role:'asesor'}),'RECORD_NOT_FOUND_OR_DENIED');checks++;
 member={...member,modulesRestricted:['cancelaciones']};
 await deny(()=>flow('cancelaciones','asesor'),'MODULE_DENIED');checks++;
 member={...member,modulesRestricted:[]};
 cfg={...cfg,rolePermissions:{asesor:{cancelaciones:{ver:false}}}};
 await deny(()=>flow('cancelaciones','asesor'),'MODULE_DENIED');checks++;
 // UAT2 canonical config: original false-deny, minimal permission flip,
 // Operativo configured visibility and Asesor STRICT own after flip.
 cfg={...cfg,rolePermissions:{
  operativo:{cancelaciones:{ver:false,editar:false}},
  asesor:{cancelaciones:{ver:false,editar:false}}
 }};
 await deny(()=>flow('cancelaciones','operativo'),'MODULE_DENIED');checks++;
 await deny(()=>flow('cancelaciones','asesor'),'MODULE_DENIED');checks++;
 cfg={...cfg,rolePermissions:{
  operativo:{cancelaciones:{ver:true,editar:false}},
  asesor:{cancelaciones:{ver:true,editar:false}}
 }};
 const openedOperativo=await flow('cancelaciones','operativo',{pageSize:50});
 assert.deepEqual(openedOperativo.rows.map(x=>x.id),['aOwn','bOther','cStale']);checks++;
 const openedAsesor=await flow('cancelaciones','asesor',{pageSize:50});
 assert.deepEqual(openedAsesor.rows.map(x=>x.id),['aOwn']);checks++;
 await deny(()=>read('cancelaciones','bOther',{role:'asesor'}),'RECORD_NOT_FOUND_OR_DENIED');checks++;
 await deny(()=>read('cancelaciones','cStale',{role:'asesor'}),'RECORD_NOT_FOUND_OR_DENIED');checks++;
 const cancellationCO=await flow('cancelaciones','asesor',{country:'CO',pageSize:50});
 assert.equal(cancellationCO.rows.length,0);checks++;
 // Administrative roles continue with their prior module/tenant membership gates.
 assert.equal(cfg.rolePermissions.operativo.cancelaciones.editar,false);checks++;
 assert.equal(cfg.rolePermissions.asesor.cancelaciones.editar,false);checks++;
 console.log('B4_003_CANCEL_ACCESS_CONFIG_BEFORE_AFTER_SCOPE_QA_PASS checks=9 no_backend_or_config_writes');
 cfg={...cfg,rolePermissions:{}};
 await deny(()=>read('cancelaciones','eMismatch',{role:'operativo'}),'RECORD_NOT_FOUND_OR_DENIED');checks++;
 await deny(()=>flow('cancelaciones','operativo',{cursor:'dOrphan'}),'CURSOR_DENIED');checks++;
 const audit=await flow('auditoria','Dirección',{pageSize:50});
 assert.deepEqual(audit.rows.map(x=>x.id),['aGT','cGlobal']);
 assert.ok(audit.rows.every(x=>!('password' in x)&&!('before' in x)));checks++;
 const auditCO=await flow('auditoria','Dirección',{country:'CO',pageSize:50});
 assert.deepEqual(auditCO.rows.map(x=>x.id),['bCO','cGlobal']);checks++;
 await deny(()=>flow('auditoria','asesor'),'TEAM_DIRECTORY_DENIED');checks++;
 await deny(()=>flow('auditoria','operativo'),'TEAM_DIRECTORY_DENIED');checks++;
 await deny(()=>read('auditoria','bCO',{role:'Dirección'}),'RECORD_NOT_FOUND_OR_DENIED');checks++;
 member={...member,modulesRestricted:['equipo']};
 await deny(()=>flow('auditoria','Dirección'),'MODULE_DENIED');checks++;
 member=oldMember;cfg=oldCfg;
 // 442 fully authorized client fixtures mimic the frozen client universe.
 // Preserve every cursor and every server-side membership/country check,
 // without repeatedly scanning 100 rows to fill a 200-row page.
 const retainedClients=docs.clientes,retainedMember=member,retainedConfig=cfg;
 docs.clientes=Object.fromEntries(Array.from({length:442},(_,i)=>{
   const id='client-'+String(i).padStart(4,'0');
   return [id,{id,tenantId,pais:'GT',asesorId:'a1'}];
 }));
 member={...member,roles:['Operativo'],dataScopes:{default:'all'},countries:['GT']};
 cfg={roleScopes:{operativo:'all'}};
 observedClientPageLimits=[];
 const first200=await flow('clientes','operativo',{pageSize:200});
 const second200=await flow('clientes','operativo',{pageSize:200,cursor:first200.nextCursor});
 const final42=await flow('clientes','operativo',{pageSize:200,cursor:second200.nextCursor});
 assert.equal(first200.rows.length,200);assert.equal(second200.rows.length,200);
 assert.equal(final42.rows.length,42);assert.equal(final42.nextCursor,null);
 assert.equal(new Set([...first200.rows,...second200.rows,...final42.rows].map(x=>x.canonicalDocumentId)).size,442);
 assert.deepEqual(observedClientPageLimits,[201,201,201],
   'CLIENT_PAGINATION_ONE_BOUNDED_SERVER_QUERY_PER_AUTHORIZED_PAGE');
 docs.clientes=retainedClients;member=retainedMember;cfg=retainedConfig;
 checks+=5;
 console.log('B4_003_PROTECTED_CLIENT_STARTUP_PAGING_QA_PASS 442_verified_rows 3_bounded_reads no_writes');
 console.log('B4_003_CANCELACIONES_AUDITORIA_AUTHORIZATION_QA_PASS checks=10 no_data_writes');
 console.log('B4_003_METAS_INSTITUTIONAL_AND_ADVISOR_SCOPE_QA_PASS checks=7 no_data_writes');
 console.log('B4_003_RELATED_SERVER_BATCH_SCOPE_MOCK_PASS checks='+checks+' no Firebase writes');
 console.log('B4_003_RELATED_DOCUMENT_SERVER_SCOPE_MOCK_PASS checks='+checks+' no Firebase writes');
})().catch(e=>{console.error(e);process.exitCode=1;});

/* UAT5_ROUTE_AND_IMPORTER_CAUSAL_QA: runtime-owner tests, synthetic no writes. */
{
 const vm=require('node:vm');
 const renew=fs.readFileSync('orbit360-platform/modules/renovaciones.js','utf8');
 const a=renew.indexOf('  function scheduleReadinessRecheck(host,readiness){');
 const b=renew.indexOf('  function humanCollection(name){',a);
 assert.ok(a>=0&&b>a,'UAT5_RENEWALS_SOURCE_BOUNDS');
 let latePaint=0,callback=null;
 const context={READINESS_BUDGET_MS:8000,Math,Orbit:{route:{key:'renovaciones'}},
  location:{hash:'#/renovaciones'},Date:{now:()=>0},
  setTimeout:fn=>{callback=fn;return 1;},
  clearTimeout:()=>{},render:()=>{latePaint++;}};
 vm.runInNewContext('let readinessTimer=null;\n'+renew.slice(a,b)+'\nthis.qa=scheduleReadinessRecheck;',context);
 context.qa({isConnected:true},{state:'pending',elapsedMs:0});
 assert.equal(typeof callback,'function','UAT5_TIMER_NOT_INSTALLED');
 context.Orbit.route.key='aseguradoras';context.location.hash='#/aseguradoras';
 callback();assert.equal(latePaint,0,'UAT5_STALE_RENEWAL_ROUTE_MUST_NOT_OVERWRITE_CURRENT_ROUTE');
 const importer=fs.readFileSync('orbit360-platform/modules/importar-p0-dashboard.js','utf8');
 const snapshot={requiredCollections:['clientes'],optionalCollections:['recibosEsperados'],
  serverConfirmedCollections:[],deniedCollections:[],snapshotErrors:{}};
 const store={__productReadOnlyP0:true,_productStatus:()=>snapshot,all:()=>[]};
 const win={Orbit:{store,ui:{esc:x=>String(x)}}};
 vm.runInNewContext(importer,{window:win,Orbit:win.Orbit,console,WeakSet},{timeout:1000});
 const layer=Array.from(win.Orbit.importarP0Dashboard.LAYERS).find(x=>x.id==='recibosEsperados');
 const pending=win.Orbit.importarP0Dashboard.layerStats(layer);
 assert.equal(pending.readiness,'pending');
 assert.equal(pending.totalRows,null,'UAT5_UNCONFIRMED_RECEIPTS_NEVER_ZERO');
 snapshot.deniedCollections=['recibosEsperados'];
 assert.equal(win.Orbit.importarP0Dashboard.layerStats(layer).readiness,'unavailable');
 snapshot.deniedCollections=[];snapshot.serverConfirmedCollections=['recibosEsperados'];
 const confirmed=win.Orbit.importarP0Dashboard.layerStats(layer);
 assert.equal(confirmed.readiness,'ready');assert.equal(confirmed.totalRows,0);
 const c360=fs.readFileSync('orbit360-platform/modules/cliente360.js','utf8');
 assert.match(c360,/receiptState === 'unavailable'/,'UAT5_RECEIPT_TERMINAL_BRANCH');
 assert.match(c360,/data-c360-receipts-unavailable/,'UAT5_RECEIPT_FAIL_CLOSED');
 const backend=fs.readFileSync('functions/b4-003-scoped-related-reader.js','utf8');
 const protectedStore=fs.readFileSync('orbit360-platform/data/store-firestore-product-readonly-p0.js','utf8');
 assert.match(backend,/await warmParents\(docs\)/,'UAT5_BACKEND_BATCH_LOOKUP');
 assert.match(protectedStore,/\['vehiculos','recibosEsperados','carteraPrimas','cobros'\]\.includes\(collection\)/,'UAT5_BATCHED_FINANCE_PAGING');
 console.log('UAT5_CAUSAL_SOURCE_QA_PASS route_stale_blocked importer_tri_state_readiness financial_200_scoped_no_data_writes');
}
