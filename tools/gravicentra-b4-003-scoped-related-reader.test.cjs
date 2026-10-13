'use strict';
const assert=require('node:assert/strict');
const {readScopedRelatedDocument}=require('../functions/b4-003-scoped-related-reader');
const {Denied}=require('../functions/b4-003-scoped-access-boundary');
const tenantId='alianzas-soluciones';
const docs={
 clientes:{c1:{id:'c1',tenantId,pais:'GT',asesorId:'a1'},c2:{id:'c2',tenantId,pais:'GT',asesorId:'a2'}},
 polizas:{p1:{id:'p1',tenantId,pais:'GT',asesorId:'a1',clienteId:'c1'},p2:{id:'p2',tenantId,pais:'GT',asesorId:'a2',clienteId:'c2'}},
 vehiculos:{v1:{id:'v1',polizaId:'p1',clienteId:'c1'},v2:{id:'v2',polizaId:'p2',clienteId:'c2'}},
 recibosEsperados:{r1:{id:'r1',polizaId:'p1',clienteId:'c1',monto:12},r2:{id:'r2',polizaId:'p2',clienteId:'c2'},bad:{id:'bad',polizaId:'p1',clienteId:'c2'},orphan:{id:'orphan',polizaId:'missing',clienteId:'c1'},direct:{id:'direct',clienteId:'c1'}},
 carteraPrimas:{debt1:{id:'debt1',polizaId:'p1',clienteId:'c1',monto:10}},
 cobros:{paid1:{id:'paid1',polizaId:'p1',clienteId:'c1',monto:3},paid2:{id:'paid2',polizaId:'p2',clienteId:'c2'}}
};
let member={uid:'u1',tenantId,status:'active',roles:['Asesor','Operativo'],advisorId:'a1',countries:['GT','CO'],dataScopes:{default:'own'}};
let cfg={roleScopes:{asesor:'own',operativo:'all'}};
const snap=v=>({exists:v!=null,data:()=>v});
const db={collection:x=>{assert.equal(x,'tenants');return{doc:tenant=>{assert.equal(tenant,tenantId);return{
 collection:col=>{
  if(col==='members')return {doc:()=>({get:async()=>snap(member)})};
  if(col==='config')return {doc:()=>({get:async()=>snap(cfg)})};
  if(col==='data')return{doc:collection=>({collection:items=>{assert.equal(items,'items');return{doc:id=>({get:async()=>snap(docs[collection]?.[id])})}}})};
  throw Error('UNKNOWN_COL:'+col);
 }
}}}}};
const read=(collection,documentId,extras={})=>readScopedRelatedDocument({
 db,auth:{uid:'u1',token:extras.claims||{}},request:{tenantId,collection,documentId,country:extras.country||'GT',activeRole:extras.role||'asesor'}
});
async function deny(fn,code){let thrown;try{await fn()}catch(e){thrown=e}assert.ok(thrown instanceof Denied);assert.equal(thrown.code,code);}
(async()=>{
 let checks=0;
 for(const [col,id] of [['clientes','c1'],['vehiculos','v1'],['recibosEsperados','r1'],['carteraPrimas','debt1'],['cobros','paid1'],['recibosEsperados','direct']]){
  const r=await read(col,id);assert.equal(r.row.id,id);assert.equal(r.scope,'own');checks++;
 }
 for(const [col,id] of [['clientes','c2'],['vehiculos','v2'],['recibosEsperados','r2'],['cobros','paid2']]){
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
 console.log('B4_003_RELATED_DOCUMENT_SERVER_SCOPE_MOCK_PASS checks='+checks+' no Firebase writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
