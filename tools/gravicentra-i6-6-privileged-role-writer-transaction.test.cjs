'use strict';
// Reversible in-memory transactional QA for privileged operational writes.
// No credentials, network calls, production records or financial applications.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../functions');
const clone=v=>JSON.parse(JSON.stringify(v));
const roles=['Operativo','Dirección','Admin','AdminTenant','SuperAdmin'];
const collections=['clientes','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros',
  'tareas','actividades','reclamos','cancelaciones','comisiones','aseguradoras'];
const collectionModule={clientes:'cliente360',polizas:'polizas',vehiculos:'polizas',recibosEsperados:'cobros',
  carteraPrimas:'cobros',cobros:'cobros',tareas:'ops',actividades:'cliente360',reclamos:'siniestros',
  cancelaciones:'cancelaciones',comisiones:'comisiones',aseguradoras:'aseguradoras'};
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}

function fixture(role,options={}){
  const tenant='synthetic-tenant',uid='synthetic-actor',peer='advisor-peer';
  const rows=new Map(),writeEvents=[];
  const data=(collection,id)=>`tenants/${tenant}/data/${collection}/items/${id}`;
  const access={roleScopes:{[role]:options.roleScope||'all'},rolePermissions:{[role]:Object.fromEntries(
    [...new Set(Object.values(collectionModule))].map(module=>[module,{ver:true,editar:module!==options.deniedModule}]))}};
  const member={uid,tenantId:tenant,status:'active',active:true,roles:[role],activeRole:role,
    advisorId:'advisor-own',countries:['GT'],dataScopes:{default:'own',modules:options.moduleScopes||{}},
    modulesRestricted:options.restricted||[]};
  rows.set(`tenants/${tenant}/members/${uid}`,member);
  rows.set(`tenants/${tenant}/config/access`,access);
  rows.set(data('clientes','parent-client'),{id:'parent-client',tenantId:tenant,pais:'GT',asesorId:peer,nombre:'Synthetic linked parent'});
  const snap=p=>({id:p.split('/').pop(),exists:rows.has(p),data:()=>clone(rows.get(p)||{})});
  class Ref{
    constructor(p,query=false,where=[]){this.p=p;this.query=query;this.whereClauses=where;}
    doc(k){return new Ref(this.p+'/'+k);}collection(k){return new Ref(this.p+'/'+k,true);}
    where(...args){return new Ref(this.p,true,[...this.whereClauses,args]);}limit(){return this;}
    async get(){if(!this.query)return snap(this.p);const docs=[...rows.keys()].filter(p=>p.startsWith(this.p+'/')&&!p.slice(this.p.length+1).includes('/'))
      .map(snap).filter(s=>this.whereClauses.every(([k,op,v])=>op==='=='&&s.data()[k]===v));return{docs,empty:!docs.length};}
  }
  const db={collection:k=>new Ref(k,true),async runTransaction(fn){const changes=[];let written=false;
    const tx={get:async ref=>{if(written)throw Error('READ_AFTER_WRITE');return ref.get();},
      set:(ref,row,o)=>{written=true;changes.push({ref:ref.p,row:clone(row),merge:!!o?.merge});},
      delete:ref=>{written=true;changes.push({ref:ref.p,remove:true});}};
    const out=await fn(tx);for(const c of changes){if(c.remove)rows.delete(c.ref);
      else rows.set(c.ref,c.merge?Object.assign({},rows.get(c.ref)||{},c.row):c.row);writeEvents.push(c);}return out;
  }};
  const cache={};function load(name){const f=path.resolve(root,name.endsWith('.js')?name:name+'.js');
    if(cache[f])return cache[f].exports;const mod={exports:{}};cache[f]=mod;
    const requireIsolated=id=>{
      if(id.startsWith('.'))return load(id);
      if(id==='firebase-admin/app')return{getApps:()=>[{}],initializeApp:()=>({})};
      if(id==='firebase-admin/firestore')return{getFirestore:()=>db,FieldValue:{serverTimestamp:()=> 'SYNTHETIC_TIMESTAMP'}};
      if(id==='firebase-admin/storage')return{getStorage:()=>({})};
      if(id==='firebase-functions/v2/https')return{HttpsError,onCall:(_opts,fn)=>fn};
      if(id==='node:crypto')return crypto;
      throw Error('UNEXPECTED_EXTERNAL_MODULE:'+id);
    };
    vm.runInNewContext(fs.readFileSync(f,'utf8'),{module:mod,exports:mod.exports,require:requireIsolated,
      process:{env:{}},Buffer,console},{filename:f});return mod.exports;
  }
  const callable=load('product-operational-domain').orbit360ProductOperationalCommand;
  const execute=(collection,action,id,payload)=>callable({auth:{uid,token:{name:'QA Operador'}},data:{tenantId:tenant,
    activeRole:role,mutations:[{collection,action,id,payload}]}});
  return{rows,writeEvents,peer,tenant,data,execute};
}

for(const role of roles){
  test(`${role}: insert, update, canonical persistence and country boundary for 12 authorized domains`,async()=>{
    const e=fixture(role);
    for(const collection of collections){
      const id='qa_'+collection;
      const payload={id,tenantId:e.tenant,pais:'GT',asesorId:e.peer,nombre:'Synthetic '+collection,
        ...(collection==='reclamos'?{clienteId:'parent-client'}:{})};
      const inserted=await e.execute(collection,'insert',id,payload);
      assert.equal(inserted.canonicalReadback,true,role+' '+collection+' insert readback');
      assert.equal(e.rows.get(e.data(collection,id)).createdByUid,'synthetic-actor');
      const updated=await e.execute(collection,'update',id,{observaciones:'Synthetic updated '+role});
      assert.equal(updated.canonicalReadback,true,role+' '+collection+' edit readback');
      assert.equal(e.rows.get(e.data(collection,id)).observaciones,'Synthetic updated '+role);
      assert.equal(e.rows.get(e.data(collection,id)).updatedByUid,'synthetic-actor');
      const count=e.writeEvents.length;
      await assert.rejects(e.execute(collection,'insert','qa_outside_'+collection,
        {...payload,id:'qa_outside_'+collection,pais:'CO'}),x=>['permission-denied','failed-precondition'].includes(x.code));
      assert.equal(e.writeEvents.length,count,role+' '+collection+' foreign country no write');
    }
    assert.equal([...e.rows.keys()].filter(p=>p.includes('/data/')&&p.includes('/qa_')).length,collections.length);
  });
}

test('Explicit tenant role module denial overrides every privileged fallback',async()=>{
  for(const role of roles){
    const e=fixture(role,{deniedModule:'polizas'});
    await assert.rejects(e.execute('polizas','insert','qa_denied',{pais:'GT',asesorId:e.peer}),x=>x.code==='permission-denied');
    assert.equal(e.writeEvents.length,0);
    const separate=fixture(role,{moduleScopes:{polizas:'none'}});
    await assert.rejects(separate.execute('polizas','insert','qa_none',{pais:'GT',asesorId:e.peer}),x=>x.code==='permission-denied');
    assert.equal(separate.writeEvents.length,0);
  }
});

test('Operativo does not inherit finance ledger or Equipo administrative writes',async()=>{
  const e=fixture('Operativo');
  await assert.rejects(e.execute('finmovs','insert','qa_finmov',{pais:'GT',asesorId:e.peer}),x=>x.code==='permission-denied');
  await assert.rejects(e.execute('asesores','insert','qa_advisor',{pais:'GT',asesorId:e.peer}),x=>x.code==='permission-denied');
  assert.equal(e.writeEvents.length,0);
});

console.log('I66_PRIVILEGED_5_ROLES_12_DOMAINS_TRANSACTIONAL_IN_MEMORY_NO_LIVE_WRITES');
