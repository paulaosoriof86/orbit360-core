'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('orbit360-platform/core/access-scope.js','utf8');
const mock=(role,requested,configured='all',country='GT')=>{
 const advisor={id:'a1',countries:['GT','CO'],dataScopes:{default:'own',modules:{polizas:requested,cliente360:requested}}};
 const store={get:(collection,id)=>collection==='asesores'&&id==='a1'?advisor:null,all:()=>[]};
 const Orbit={store,session:{rol:()=>role,rolesAsignados:()=>[role],asesorId:()=> 'a1'},
  domainConfig:{peek:()=>({roleScopes:{[role]:configured}})},tenant:{get:()=>({tenantId:'t'})},
  auth:{user:()=>({rol:role})},ROLES:{[role]:{scopes:{polizas:configured,cliente360:configured}}}};
 const ctx={Orbit,window:{Orbit},console};
 vm.runInNewContext(source,ctx);
 return {access:Orbit.access,advisor};
};
for(const role of ['Operativo','AdminTenant']){
 for(const member of ['own','team']){
  const a=mock(role,member).access;
  assert.equal(a.dataScope('polizas'),'all',role+member+' polizas');
  assert.equal(a.dataScope('cliente360'),'all',role+member+' cliente360');
 }
 const n=mock(role,'none').access;
 assert.equal(n.dataScope('polizas'),'none',role+' explicit deny');
 assert.equal(mock(role,'team','team').access.dataScope('polizas'),'team',role+' restricted tenant');
 const strict=mock(role,'team');
 strict.advisor.countries=['GT'];
 assert.equal(strict.access.canAccessRecord({pais:'GT',asesorId:'other'},'polizas'),true,role+' GT');
 for(const pais of ['CO','Pendiente','']){
  assert.equal(strict.access.canAccessRecord({pais,asesorId:'other'},'polizas'),false,
   role+' not authorized country '+pais);
 }
 assert.deepEqual(Array.from(strict.access.filter('polizas',[
  {id:'gt',pais:'GT',asesorId:'other'},
  {id:'co',pais:'CO',asesorId:'other'},
  {id:'pending',pais:'Pendiente',asesorId:'other'},
  {id:'missing',pais:'',asesorId:'other'}
 ]).map(row=>row.id)),['gt'],role+' strict role-wide list');
}
assert.equal(mock('Asesor','all').access.dataScope('polizas'),'own',
 'Asesor must never inherit tenant-wide scope even on broad misconfiguration');
// I6.5 Block A: two different identities with the same role and signed country
// membership must get the same list/get answers, regardless of stale legacy
// adviser country fields. No Firestore access, privileged token or writes.
function productCase(role,uid,memberCountries,legacyCountries,requested,advisorId) {
 const advisor={id:advisorId,countries:legacyCountries,
  dataScopes:{default:requested,modules:{polizas:requested,cliente360:requested}}};
 const rows={
  polizas:[{id:'p-co',pais:'CO',asesorId:'other'}, {id:'p-gt',pais:'GT',asesorId:advisorId}],
  clientes:[{id:'c-co',pais:'CO',asesorId:'other'}, {id:'c-gt',pais:'GT',asesorId:advisorId}]
 };
 const store={
  get:(collection,id)=>collection==='asesores'?(id===advisorId?advisor:null):(rows[collection]||[]).find(r=>r.id===id)||null,
  all:collection=>rows[collection]||[]
 };
 const Orbit={
  store,session:{rol:()=>role,rolesAsignados:()=>[role],asesorId:()=>advisorId,canSee:()=>true},
  tenant:{get:()=>({tenantId:'t'})},domainConfig:{peek:()=>({roleScopes:{[role]:'all'}})},
  auth:{user:()=>({uid,rol:role}),productUser:{uid,tenantId:'t',roles:[role],
   countries:memberCountries,productReadOnly:true}},
  ROLES:{[role]:{modulos:['polizas','cliente360'],scopes:{polizas:'all',cliente360:'all'}}}
 };
 vm.runInNewContext(source,{Orbit,window:{Orbit},console});
 return {access:Orbit.access,store};
}
const operativeA=productCase('Operativo','u-a',['GT','CO'],['GT'],'team','a-a');
const operativeB=productCase('Operativo','u-b',['GT','CO'],['CO'],'own','a-b');
for(const [name,example] of [['A',operativeA],['B',operativeB]]) {
 for(const [collection,moduleName,recordId] of [
  ['polizas','polizas','p-co'],['clientes','cliente360','c-co']
 ]) {
  const list=example.access.filter(collection,example.store.all(collection),moduleName);
  assert.equal(list.length,2,'Operativo '+name+' '+collection+' signed membership list');
  assert.equal(example.access.scopedStore(moduleName).get(collection,recordId)?.id,recordId,
   'Operativo '+name+' '+collection+' signed membership detail');
 }
}
const restricted=productCase('Operativo','u-c',['GT'],['GT','CO'],'team','a-c');
assert.deepEqual(Array.from(restricted.access.filter('polizas',restricted.store.all('polizas'),'polizas').map(r=>r.id)),['p-gt'],
 'signed country restriction prevails over legacy countries');
assert.equal(restricted.access.scopedStore('polizas').get('polizas','p-co'),null,
 'signed country negative on protected detail');
const adminTenant=productCase('AdminTenant','u-d',['GT','CO'],[],'own','a-d');
assert.equal(adminTenant.access.scopedStore('cliente360').get('clientes','c-co')?.id,'c-co',
 'AdminTenant signed countries admit authorized detail');
const advisor=productCase('Asesor','u-e',['GT','CO'],['GT','CO'],'all','a-e');
assert.equal(advisor.access.dataScope('polizas'),'own','Asesor has mandatory own ceiling');
assert.deepEqual(Array.from(advisor.access.filter('polizas',advisor.store.all('polizas'),'polizas').map(r=>r.id)),['p-gt'],
 'Asesor list excludes foreign policy');
assert.equal(advisor.access.scopedStore('polizas').get('polizas','p-co'),null,
 'Asesor direct lookup excludes foreign policy');
const absent=productCase('Operativo','u-f',[],['GT','CO'],'team','a-f');
assert.equal(absent.access.filter('polizas',absent.store.all('polizas'),'polizas').length,0,
 'authenticated product user with no membership countries remains denied');
assert.equal(absent.access.scopedStore('polizas').get('polizas','p-gt'),null,
 'missing membership countries deny direct lookup');
console.log('B4_003_FRONT_SCOPE_ROLE_PARITY_PASS signed_membership_two_UIDs_list_get_denials_synthetic_only_no_writes');
