'use strict';
// Focused read-only regression for the canonical Conciliaciones bridge.
// All records, memberships and Firestore interfaces below are synthetic.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {readScopedRelatedDocument,readScopedRelatedList}=require('../functions/b4-003-scoped-related-reader');
const {Denied}=require('../functions/b4-003-scoped-access-boundary');
const root=path.resolve(__dirname,'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const expected=['conciliaciones','conciliacionesPrimas'];
const assertSources=[
 ['orbit360-platform/core/router.js',"conciliaciones: ['conciliaciones', 'conciliacionesPrimas']"],
 ['orbit360-platform/core/product-runtime-browser-providers-p0.js',"'conciliaciones','conciliacionesPrimas'"],
 ['orbit360-platform/data/store-firestore-product-readonly-p0.js',"'conciliaciones','conciliacionesPrimas'"],
 ['orbit360-platform/core/tenant-access-policy-contract-p0.js',"conciliacionesPrimas: { module: 'conciliaciones'"],
 ['functions/b4-003-scoped-access-boundary.js',"conciliacionesPrimas:'conciliaciones'"],
 ['functions/b4-003-scoped-related-reader.js',"'conciliaciones','conciliacionesPrimas'"]
];
assertSources.forEach(([file,needle])=>assert.ok(source(file).includes(needle),'BRIDGE_MISSING_'+file));
const tenantId='tenant-test';
let member={uid:'u',tenantId,status:'active',roles:['Finanzas','Dirección','AdminTenant','Operativo','Asesor'],
 advisorId:'a1',countries:['GT','CO'],dataScopes:{default:'all'}};
let access={roleScopes:{finanzas:'all',direccion:'all',admintenant:'all',operativo:'all',asesor:'own'}};
const records={
 clientes:{c1:{tenantId,pais:'GT',asesorId:'a1'},c2:{tenantId,pais:'CO',asesorId:'a2'}},
 polizas:{p1:{tenantId,pais:'GT',asesorId:'a1',clienteId:'c1'},p2:{tenantId,pais:'CO',asesorId:'a2',clienteId:'c2'}},
 conciliaciones:{linked:{polizaId:'p1',clienteId:'c1',monto:100,pais:'CO'},foreign:{polizaId:'p2',clienteId:'c2',monto:200},orphan:{monto:300}},
 conciliacionesPrimas:{premium:{polizaId:'p1',clienteId:'c1',monto:50},mismatch:{polizaId:'p1',clienteId:'c2',monto:1}}
};
const snap=(id,row)=>({id,exists:!!row,data:()=>row});
function query(table,after='',limit=100){
 const rows=records[table]||{};
 return {
  doc:id=>({get:async()=>snap(id,rows[id])}),
  orderBy:field=>{assert.equal(field,'__name__');return query(table,after,limit);},
  startAfter:at=>query(table,at.id,limit),
  limit:n=>query(table,after,n),
  get:async()=>({docs:Object.keys(rows).sort().filter(id=>id>after).slice(0,limit).map(id=>snap(id,rows[id]))})
 };
}
const db={collection:name=>{assert.equal(name,'tenants');return{doc:tid=>{
 assert.equal(tid,tenantId);return{collection:coll=>{
  if(coll==='members')return{doc:()=>({get:async()=>snap('u',member)})};
  if(coll==='config')return{doc:()=>({get:async()=>snap('access',access)})};
  if(coll==='data')return{doc:table=>({collection:items=>{assert.equal(items,'items');return query(table);}})};
  throw Error('UNKNOWN_COLLECTION');
 }};
 }}}};
const read=(collection,role='Finanzas',country='GT',rest={})=>readScopedRelatedList({
 db,auth:{uid:'u',token:{}},request:{tenantId,collection,activeRole:role,country,pageSize:1,...rest}
});
async function denied(action,code){
 await assert.rejects(action,e=>e instanceof Denied&&e.code===code);
}
function browserState(confirmed=[],errors={},deniedCollections=[]){
 const moduleCode=source('orbit360-platform/modules/conciliaciones.js');
 const fakeStore={_productStatus:()=>({serverConfirmedCollections:confirmed,snapshotErrors:errors,deniedCollections}),
  all:name=>[{id:'proposed-'+name,polizaId:'p1',monto:100,sourceKey:name}]};
 const context={window:{Orbit:{store:fakeStore,modules:{},ui:{},kit:{}}},document:{addEventListener(){}}};
 context.Orbit=context.window.Orbit;
 vm.runInNewContext(moduleCode,context);
 return context.Orbit.cobrosConciliacionReadOnly.proposalReadiness();
}
(async()=>{
 for(const collection of expected){
  const p1=await read(collection,'Finanzas','GT');
  assert.equal(p1.rows.length,1,'VERIFIED_GT_ONE_ROW_'+collection);
  assert.equal(p1.rows[0].pais,'GT','SERVER_PARENT_COUNTRY_'+collection);
  assert.equal(p1.nextCursor,null,'QUARANTINED_OR_FOREIGN_ROWS_NOT_PAGED_'+collection);
  const co=await read(collection,'Finanzas','CO');
  assert.equal(co.rows.length,collection==='conciliaciones'?1:0,'NO_CROSS_COUNTRY_LEAK_'+collection);
  for(const role of ['Dirección','AdminTenant']){
   const privileged=await read(collection,role,'GT');
   assert.equal(privileged.rows.length,1,'PRIVILEGED_GT_SCOPED_'+role+'_'+collection);
  }
  await denied(()=>read(collection,'Operativo','GT'),'MODULE_DENIED');
  await denied(()=>read(collection,'Asesor','GT'),'MODULE_DENIED');
  await denied(()=>read(collection,'Finanzas','GT',{policyIds:['p1']}),'RELATION_ANCHOR_UNEXPECTED');
  await denied(()=>read(collection,'Finanzas','GT',{pageSize:201}),'PAGE_SIZE_INVALID');
 }
 const detail=await readScopedRelatedDocument({db,auth:{uid:'u',token:{}},request:{tenantId,
  collection:'conciliaciones',documentId:'linked',activeRole:'Finanzas',country:'GT'}});
 assert.equal(detail.row.pais,'GT');
 await denied(()=>readScopedRelatedDocument({db,auth:{uid:'u',token:{}},request:{tenantId,
  collection:'conciliaciones',documentId:'foreign',activeRole:'Finanzas',country:'GT'}}),
  'RECORD_NOT_FOUND_OR_DENIED');
 assert.equal(browserState([]),'pending');
 assert.equal(browserState(expected),'ready');
 assert.equal(browserState([],{},['conciliaciones']),'denied');
 assert.equal(browserState([],{conciliacionesPrimas:'functions/unavailable'}),'unavailable');
 console.log('I6_6_CONCILIACIONES_PROTECTED_BRIDGE_PASS synthetic_only roles_country_parent_paging_readiness no_firestore_writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
