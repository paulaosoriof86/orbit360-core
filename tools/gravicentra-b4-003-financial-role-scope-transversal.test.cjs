'use strict';
// Synthetic B4-003 regression: role x country x finance collection x consumer route.
// No Firebase sessions, protected data or business writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const FINANCE=['cobros','carteraPrimas','recibosEsperados'];
let count=0;
const rows=FINANCE.reduce((all,collection)=>{
  all[collection]=[
    {id:collection+'-gt-own',tenantId:'tenant-qa',pais:'GT',asesorId:'a1'},
    {id:collection+'-gt-other',tenantId:'tenant-qa',pais:'GT',asesorId:'a2'},
    {id:collection+'-co-other',tenantId:'tenant-qa',pais:'CO',asesorId:'a2'},
    {id:collection+'-unknown',tenantId:'tenant-qa',asesorId:'a2'}
  ];
  return all;
},{});
const state={role:'Operativo',countries:['GT','CO']};
const profile={dataScopes:{default:'own',modules:{polizas:'team',cliente360:'team',cobros:'own'}}};
const store={
  get:(collection,id)=>collection==='asesores'?profile:((rows[collection]||[]).find(r=>r.id===id)||null),
  all:collection=>(rows[collection]||[]).slice()
};
const Orbit={
  store,
  session:{rol:()=>state.role,asesorId:()=> 'a1',rolesAsignados:()=>['Operativo','AdminTenant','Asesor'],canSee:()=>true},
  auth:{user:()=>({uid:'uid-qa',rol:state.role}),productUser:{productReadOnly:true,countries:state.countries}},
  tenant:{get:()=>({tenantId:'tenant-qa'}),isActive:()=>true},
  domainConfig:{peek:key=>key==='access'?{roleScopes:{Operativo:'all',AdminTenant:'all',Asesor:'own'}}:null}
};
vm.runInNewContext(fs.readFileSync('orbit360-platform/core/access-scope.js','utf8'),{Orbit,window:{Orbit},console});
const scope=Orbit.access;
for(const role of ['Operativo','AdminTenant']){
  state.role=role;
  assert.equal(scope.dataScope('cobros'),'all',role+' finance role-wide');
  assert.equal(scope.dataScope('polizas'),'all',role+' existing policy role-wide');
  for(const collection of FINANCE){
    assert.deepEqual(scope.filter(collection,store.all(collection)).map(r=>r.id),[
      collection+'-gt-own',collection+'-gt-other',collection+'-co-other'
    ],role+' '+collection+' all authorized countries');count++;
    for(const route of ['cobros','inicio','reportes']){
      const scoped=scope.scopedStore(route);
      assert.equal(scoped.all(collection).length,3,role+' '+collection+' in '+route);count++;
      assert.equal(scoped.get(collection,collection+'-gt-other').id,collection+'-gt-other');count++;
    }
  }
  state.countries.splice(1,1);
  for(const collection of FINANCE){
    assert.equal(scope.filter(collection,store.all(collection)).length,2,'single membership country '+collection);count++;
    assert.equal(scope.scopedStore('reportes').get(collection,collection+'-co-other'),null);count++;
  }
  state.countries.push('CO');
}
state.role='Asesor';
assert.equal(scope.dataScope('cobros'),'own');
for(const collection of FINANCE){
  assert.deepEqual(scope.filter(collection,store.all(collection)).map(r=>r.id),[collection+'-gt-own'],
    'advisor must not see other advisers');count++;
  assert.equal(scope.scopedStore('reportes').get(collection,collection+'-gt-other'),null);count++;
}
state.role='Operativo';
profile.dataScopes.modules.cobros='none';
assert.equal(scope.dataScope('cobros'),'none','explicit financial module none veto');
for(const collection of FINANCE){
  assert.equal(scope.scopedStore('reportes').all(collection).length,0);count++;
}
profile.dataScopes.modules.cobros='own';

// The browser effective policy must elevate READ/query only, never writer grants.
const observed=[];
const base={
  normalizeMembership:m=>({...m,moduleScopes:m.dataScopes&&m.dataScopes.modules||{},
    defaultScope:m.dataScopes&&m.dataScopes.default||'none'}),
  activeMembership:()=>true,moduleVisible:()=>true,
  canRead:(collection,row,m)=>{observed.push({type:'read',collection,m});return {allowed:true}},
  queryConstraints:(collection,m)=>{observed.push({type:'query',collection,m});return {constraints:[]}},
  canWrite:(collection,action,row,patch,m)=>{observed.push({type:'write',collection,m});return {allowed:false}}
};
const policyOrbit={tenantAccessPolicyP0:base};
vm.runInNewContext(fs.readFileSync('orbit360-platform/core/tenant-access-policy-effective-p0.js','utf8'),
  {Orbit:policyOrbit,window:{Orbit:policyOrbit},console});
const policy=policyOrbit.tenantAccessPolicyEffectiveP0;
for(const role of ['Operativo','AdminTenant']){
  const membership={activeRole:role,tenantId:'tenant-qa',
    dataScopes:{default:'own',modules:{cobros:'own'}}};
  for(const collection of FINANCE){
    policy.canRead(collection,{tenantId:'tenant-qa'},membership,{tenantId:'tenant-qa'});
    assert.equal(observed.at(-1).m.dataScopes.modules.cobros,'all',role+' '+collection+' effective read');count++;
    policy.queryConstraints(collection,membership,{tenantId:'tenant-qa'});
    assert.equal(observed.at(-1).m.dataScopes.modules.cobros,'all',role+' '+collection+' effective query');count++;
  }
  policy.canWrite('cobros','update',{}, {},membership,{tenantId:'tenant-qa'});
  assert.equal(observed.at(-1).m.dataScopes.modules.cobros,'own','writer unchanged');count++;
  const denied={...membership,dataScopes:{default:'own',modules:{cobros:'none'}}};
  policy.canRead('cobros',{},denied,{});
  assert.equal(observed.at(-1).m.dataScopes.modules.cobros,'none','explicit none stays denied');count++;
}
policy.canRead('cobros',{}, {activeRole:'Asesor',dataScopes:{default:'own',modules:{cobros:'own'}}},{});
assert.equal(observed.at(-1).m.dataScopes.modules.cobros,'own','advisor backend-policy wrapper remains own');count++;

// Staged server-owned reader: country, tenant, module and active-role gates.
const {resolve,allowRow,Denied}=require('../functions/b4-003-scoped-access-boundary');
const member={uid:'uid-qa',tenantId:'tenant-qa',status:'active',
  roles:['Operativo','AdminTenant','Asesor'],advisorId:'a1',countries:['GT','CO'],
  dataScopes:{default:'own',modules:{cobros:'own'}}};
const config={roleScopes:{Operativo:'all',AdminTenant:'all',Asesor:'own'}};
const ctx=(role,collection,country='GT',m=member,cfg=config)=>resolve({
  auth:{uid:'uid-qa',token:{giActiveRole:role}},member:m,config:cfg,
  tenantId:'tenant-qa',activeRole:role,collection,country
});
for(const role of ['Operativo','AdminTenant']){
  for(const collection of FINANCE){
    const read=ctx(role,collection);
    assert.equal(read.scope,'all',role+' '+collection+' protected scope');count++;
    assert.equal(allowRow(read,{tenantId:'tenant-qa',pais:'GT',asesorId:'a2'},
      [{tenantId:'tenant-qa',pais:'GT',asesorId:'a2'}]),true);count++;
    assert.throws(()=>allowRow(read,{tenantId:'foreign',pais:'GT',asesorId:'a2'}),
      err=>err instanceof Denied&&err.code==='TENANT_DENIED');count++;
    assert.throws(()=>allowRow(read,{tenantId:'tenant-qa',pais:'CO',asesorId:'a2'}),
      err=>err instanceof Denied&&err.code==='COUNTRY_DENIED');count++;
    assert.throws(()=>ctx(role,collection,'GT',{...member,countries:['CO']}),
      err=>err instanceof Denied&&err.code==='COUNTRY_DENIED');count++;
  }
}
for(const collection of FINANCE){
  const advisor=ctx('Asesor',collection);
  assert.equal(advisor.scope,'own');count++;
  assert.equal(allowRow(advisor,{tenantId:'tenant-qa',pais:'GT',asesorId:'a1'}),true);count++;
  assert.throws(()=>allowRow(advisor,{tenantId:'tenant-qa',pais:'GT',asesorId:'a2'}),
    err=>err instanceof Denied&&err.code==='FOREIGN_RECORD_DENIED');count++;
  assert.throws(()=>ctx('Operativo',collection,'GT',{
    ...member,dataScopes:{default:'own',modules:{cobros:'none'}}}),
    err=>err instanceof Denied&&err.code==='SCOPE_NONE');count++;
}
assert.equal(ctx('Operativo','cobros','GT',{
  ...member,dataScopes:{default:'team',modules:{cobros:'team'}}
},{roleScopes:{Operativo:'team'}}).scope,'team','tenant team policy not widened');count++;
console.log('B4_003_FINANCIAL_ROLE_SCOPE_TRANSVERSAL_PASS checks='+count+' synthetic_only no_writes');
