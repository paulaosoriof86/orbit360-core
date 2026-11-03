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
console.log('B4_003_FRONT_SCOPE_ROLE_PARITY_PASS synthetic_only_no_writes');
