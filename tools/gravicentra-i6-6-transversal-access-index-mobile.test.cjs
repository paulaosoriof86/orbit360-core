'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../orbit360-platform');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('I6.6 immutable access view keeps live revisions and legacy deep copies',async()=>{
 const notices=[],tenant={id:'alianzas-soluciones',domainConfig:{access:{roleScopes:{Operativo:'all'}}}};
 const Orbit={tenant:{get:()=>tenant,setDeep:(key,value)=>{tenant[key]=value;}},
  session:{rol:()=> 'Operativo',rolesAsignados:()=>['Operativo'],asesorId:()=>''},
  productRuntimeBrowserProvidersP0:{callFunction:async()=>({ok:true,config:{roleScopes:{Operativo:'team'},rolePermissions:{}}})}};
 const window={Orbit,dispatchEvent:e=>notices.push(e.detail),__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{tenantHint:tenant.id}};
 const context={window,Orbit,location:{hostname:'app.aysseguros.com'},Map,Set,WeakSet,
  CustomEvent:class CustomEvent{constructor(_n,o){this.detail=o?.detail;}}};
 vm.runInNewContext(read('core/tenant-domain-config-client.js'),context);
 vm.runInNewContext(read('core/access-scope.js'),context);
 const domain=Orbit.domainConfig,one=domain.peekReadOnly('access');
 assert.strictEqual(one,domain.peekReadOnly('access'));
 assert.equal(Object.isFrozen(one),true);assert.equal(Object.isFrozen(one.roleScopes),true);
 assert.strictEqual(Orbit.access.accessConfig(),one);
 const mutable=domain.peek('access');mutable.roleScopes.Operativo='none';
 assert.equal(domain.peekReadOnly('access').roleScopes.Operativo,'all');
 assert.equal(Orbit.access.roleScopeCeiling('polizas'),'all');
 await domain.get('access');
 const two=domain.peekReadOnly('access');
 assert.notStrictEqual(one,two);
 assert.equal(two.roleScopes.Operativo,'team');
 assert.equal(Orbit.access.roleScopeCeiling('polizas'),'team');
 assert.equal(notices.filter(e=>e.domain==='access').length,1);
});

test('I6.6 indexed protected get preserves snapshot, strict id, and independent objects',async()=>{
 const tenantId='alianzas-soluciones',rows={clientes:[
  {id:'c1',tenantId,pais:'GT',nombre:'Primero',detalle:{contactos:['original']}},
  {id:'c2',tenantId,pais:'GT',nombre:'Segundo'}]};
 const window={Orbit:{},dispatchEvent(){}};
 const context={window,Map,Set,Promise,setTimeout,clearTimeout,Date,structuredClone:globalThis.structuredClone,
  CustomEvent:class CustomEvent{constructor(type,o){this.type=type;this.detail=o?.detail;}}};
 vm.runInNewContext(read('data/store-firestore-product-readonly-p0.js'),context);
 const store=window.Orbit.createFirestoreProductReadOnlyStoreP0({protectedReadPage:async q=>({
  ok:true,serverScoped:true,collection:q.collection,country:q.country,rows:rows[q.collection]||[],nextCursor:''
 })},{tenantId,membership:{activeRole:'Operativo',roles:['Operativo'],countries:['GT']},
  protectedReadCandidate:true,collections:['clientes'],requiredCollections:['clientes'],
  authoritativeFirstReadRequired:true,
  paths:{validateTenantId:id=>({ok:id===tenantId,tenantId:id}),dataCollectionPath:(_t,c)=>c},
  queryPlanner:()=>({ok:true,constraints:[{field:'tenantId',op:'==',value:tenantId}]})});
 async function ready(){
  const deadline=Date.now()+2500;
  while(!store._productStatus().serverConfirmedCollections.includes('clientes')&&Date.now()<deadline)
   await new Promise(resolve=>setTimeout(resolve,5));
  assert.ok(store._productStatus().serverConfirmedCollections.includes('clientes'));
 }
 assert.equal(store._attachSnapshots(),true);await ready();
 for(let i=0;i<300;i++)assert.equal(store.get('clientes','c1').nombre,'Primero');
 assert.equal(store.get('clientes','C1'),null,'case remains strict');
 assert.equal(store.get('clientes','foreign'),null,'missing ids remain invisible');
 const copy=store.get('clientes','c1');copy.detalle.contactos.push('mutation');
 assert.deepEqual(JSON.parse(JSON.stringify(store.get('clientes','c1').detalle)),{contactos:['original']});
 rows.clientes=[{id:'c1',tenantId,pais:'GT',nombre:'Actualizado',detalle:{contactos:['nuevo']}}];
 store._detachSnapshots();assert.equal(store._attachSnapshots(),true);await ready();
 assert.equal(store.get('clientes','c1').nombre,'Actualizado');
 assert.equal(store.get('clientes','c2'),null,'previous snapshot index cleared');
 assert.throws(()=>store.update('clientes','c1',{nombre:'no'}),e=>e?.code==='WRITE_BLOCKED_PRODUCT_READ_ONLY_P0');
});

test('I6.6 mobile menu remains open on store refresh and closes on route change',()=>{
 const router=read('core/router.js');
 assert.match(router,/setActive\(route\); const preserveScroll = !!\(options && options\.preserveScroll\); if \(!preserveScroll\) closeMobile\(\)/);
 assert.match(router,/render\(\(location\.hash \|\| ''\).*?\{ preserveScroll: true \}/);
 assert.match(router,/function go\(route\).*?if \(isMobile\(\)\) closeMobile\(\)/);
});
