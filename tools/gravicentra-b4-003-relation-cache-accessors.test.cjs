'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('orbit360-platform/data/store-firestore-product-readonly-p0.js','utf8');
const browser={Orbit:{}};
const context={window:browser,CustomEvent:function(){},Map,Set,console,Promise,setTimeout,clearTimeout,requestIdleCallback:()=>{}};
vm.runInNewContext(source,context,{filename:'store-firestore-product-readonly-p0.js'});
const factory=browser.Orbit.createFirestoreProductReadOnlyStoreP0;
const dataset={
 polizas:[
  {id:'p_own',clienteId:'c_own',pais:'GT',asesorId:'a1'},
  {id:'p_foreign',clienteId:'c_foreign',pais:'GT',asesorId:'a2'}],
 clientes:[
  {id:'c_own',pais:'GT',asesorId:'a1'},
  {id:'c_foreign',pais:'GT',asesorId:'a2'}],
 recibosEsperados:[
  {id:'r_own',clienteId:'c_own',polizaId:'p_own',pais:'GT',monto:120},
  {id:'r_foreign',clienteId:'c_foreign',polizaId:'p_foreign',pais:'GT',monto:240},
  {id:'r_orphan',clienteId:'',polizaId:'missing',pais:'GT',monto:333}]
};
const deps={
 db:{},
 collection:(_db,path)=>({path}),
 onSnapshot:(ref,next)=>{const name=ref.path.split('/')[3]; const rows=dataset[name]||[];
  next({metadata:{fromCache:false},docs:rows.map(row=>({id:row.id,data:()=>Object.assign({},row)}))});
  return ()=>{};
 }
};
const tenant='alianzas-soluciones';
const paths={validateTenantId:t=>({ok:t===tenant,tenantId:t}),dataCollectionPath:(t,k)=>'tenants/'+t+'/data/'+k+'/items'};
function storeFor(advisorId,scope){
 const s=factory(deps,{tenantId:tenant,collections:['polizas','clientes','recibosEsperados'],
 paths,
 queryPlanner:collection=>{
  const cs=[{field:'tenantId',op:'==',value:tenant}];
  if(collection==='recibosEsperados'){
   if(scope==='none')cs.push({field:'__deny__',op:'==',value:true});
   else if(scope==='own')cs.push({field:'__relation_advisor__',op:'==',value:advisorId});
   else if(scope==='team')cs.push({field:'__relation_advisor__',op:'in',value:['a1','a2']});
  }
  return {ok:true,constraints:cs};
 }});
 s._attachSnapshots();
 return s;
}
const own=storeFor('a1','own');
assert.deepEqual(Array.from(own.all('recibosEsperados'),r=>r.id),['r_own']);
assert.equal(own.get('recibosEsperados','r_foreign'),null);
assert.equal(own.get('recibosEsperados','r_orphan'),null);
assert.equal(own.get('recibosEsperados','r_own').id,'r_own');
assert.deepEqual(Array.from(own.where('recibosEsperados',()=>true),r=>r.id),['r_own']);
assert.deepEqual(Array.from(own.where('recibosEsperados','monto','>=',0),r=>r.id),['r_own']);
assert.equal(own.find('recibosEsperados',row=>row.id==='r_foreign'),null);
assert.equal(own.find('recibosEsperados',{id:'r_own'}).id,'r_own');
const team=storeFor('a1','team');
assert.deepEqual(Array.from(team.all('recibosEsperados'),r=>r.id),['r_own','r_foreign']);
const none=storeFor('a1','none');
assert.deepEqual(Array.from(none.all('recibosEsperados'),r=>r.id),[]);
assert.equal(none.get('recibosEsperados','r_own'),null);
assert.equal(none.find('recibosEsperados',()=>true),null);
assert.deepEqual(Array.from(none.where('recibosEsperados',()=>true)),[]);
console.log('B4_003_RELATION_CACHE_ACCESSOR_CONSISTENCY_PASS 13 assertions; NOT server security');
