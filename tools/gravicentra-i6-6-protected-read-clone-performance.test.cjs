'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../orbit360-platform/data/store-firestore-product-readonly-p0.js'),'utf8');
const tenantId='alianzas-soluciones';

async function fixture(nativeClone){
  const calls=[];
  const window={Orbit:{},dispatchEvent(){}};
  const context={window,console,Map,Set,Promise,setTimeout,clearTimeout,Date,
    CustomEvent:class CustomEvent{constructor(type,init){this.type=type;this.detail=init?.detail;}},
    ...(nativeClone?{structuredClone:value=>{calls.push(Array.isArray(value)?'array':'single');return globalThis.structuredClone(value);}}:{})};
  vm.runInNewContext(source,context,{filename:'store-firestore-product-readonly-p0.js'});
  const raw=[
    {id:'C1',tenantId,pais:'GT',nombre:'A',contacto:{canales:['correo','wa']},importe:145.75},
    {id:'C2',tenantId,pais:'GT',nombre:'B',contacto:{canales:['tel']},importe:0}
  ];
  const store=window.Orbit.createFirestoreProductReadOnlyStoreP0({
    protectedReadPage:async q=>({ok:true,serverScoped:true,collection:q.collection,country:q.country,
      rows:q.collection==='clientes'?raw:[],nextCursor:''})
  },{
    tenantId,membership:{activeRole:'Operativo',roles:['Operativo'],countries:['GT']},
    protectedReadCandidate:true,collections:['clientes'],requiredCollections:['clientes'],
    authoritativeFirstReadRequired:true,
    paths:{validateTenantId:id=>({ok:id===tenantId,tenantId:id}),dataCollectionPath:(_t,c)=>c},
    queryPlanner:()=>({ok:true,constraints:[{field:'tenantId',op:'==',value:tenantId}]})
  });
  assert.equal(store._attachSnapshots(),true);
  const deadline=Date.now()+2000;
  while(!store._productStatus().serverConfirmedCollections.includes('clientes')&&Date.now()<deadline){
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert.ok(store._productStatus().serverConfirmedCollections.includes('clientes'));
  return {store,calls,raw};
}

for(const nativeClone of [false,true]){
  test('I6.6 protected read: nested clone isolation and exact values ('+(nativeClone?'native':'fallback')+')',async()=>{
    const {store,calls,raw}=await fixture(nativeClone);
    const all=store.all('clientes');
    assert.deepEqual(JSON.parse(JSON.stringify(all)),raw);
    assert.equal(all.length,2);
    all[0].contacto.canales[0]='CAMBIADO';
    assert.equal(store.get('clientes','C1').contacto.canales[0],'correo');
    const subset=store.where('clientes',r=>r.nombre==='A');
    assert.equal(subset.length,1);
    subset[0].contacto.canales.push('MUTACION');
    assert.deepEqual(JSON.parse(JSON.stringify(store.get('clientes','C1').contacto)),{canales:['correo','wa']});
    assert.throws(()=>store.insert('clientes',{id:'C3'}),error=>error?.code==='WRITE_BLOCKED_PRODUCT_READ_ONLY_P0');
    if(nativeClone){assert.ok(calls.filter(x=>x==='array').length>=2,'bulk native snapshots');}
    else assert.equal(calls.length,0);
  });
}
