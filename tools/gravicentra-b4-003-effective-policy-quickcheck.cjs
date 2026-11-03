'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('orbit360-platform/core/tenant-access-policy-effective-p0.js','utf8');
const observed=[];
const base={
 normalizeMembership:m=>({activeRole:m.activeRole,tenantId:m.tenantId,
  moduleScopes:m.dataScopes?.modules||{},defaultScope:m.dataScopes?.default||'none'}),
 activeMembership:()=>true,moduleVisible:()=>true,
 canRead:(coll,row,m,ctx)=>{observed.push({op:'read',coll,m,ctx});return {allowed:true};},
 canWrite:(coll,act,row,patch,m,ctx)=>{observed.push({op:'write',coll,m,ctx});return {allowed:false};},
 queryConstraints:(coll,m,ctx)=>{observed.push({op:'query',coll,m,ctx});return {constraints:[]};}
};
const Orbit={tenantAccessPolicyP0:base};
vm.runInNewContext(source,{Orbit,window:{Orbit},console});
const p=Orbit.tenantAccessPolicyEffectiveP0;
for(const role of ['Operativo','AdminTenant']){
 const membership={activeRole:role,tenantId:'t',dataScopes:{default:'own',modules:{polizas:'team',cliente360:'team'}}};
 for(const col of ['clientes','polizas','vehiculos']){
  p.canRead(col,{tenantId:'t'},membership,{tenantId:'t'});
  const last=observed.at(-1);
  const key=col==='clientes'?'cliente360':'polizas';
  assert.equal(last.m.dataScopes.modules[key],'all',role+col+' read');
  p.queryConstraints(col,membership,{tenantId:'t'});
  assert.equal(observed.at(-1).m.dataScopes.modules[key],'all',role+col+' query');
 }
 p.canWrite('polizas','update',{}, {},membership,{tenantId:'t'});
 assert.equal(observed.at(-1).m.dataScopes.modules.polizas,'team',role+' writer unchanged');
}
const deny={activeRole:'Operativo',dataScopes:{default:'all',modules:{polizas:'none'}}};
p.canRead('polizas',{},deny,{});
assert.equal(observed.at(-1).m.dataScopes.modules.polizas,'none','explicit module deny retained');
const advisor={activeRole:'Asesor',dataScopes:{default:'own',modules:{polizas:'own'}}};
p.canRead('polizas',{},advisor,{});
assert.equal(observed.at(-1).m.dataScopes.modules.polizas,'own','advisor not widened');
console.log('B4_003_EFFECTIVE_PORTFOLIO_READ_WRITE_SPLIT_PASS synthetic_only_no_writes');
