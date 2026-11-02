'use strict';
// Both product read owners must honor the approved role rule. Synthetic only;
// no Firebase, browser credentials, Firestore writes, or live role edits.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {resolve,allowRow,Denied}=require('../functions/b4-003-scoped-access-boundary');
const context=vm.createContext({window:{}});
for(const file of [
 'orbit360-platform/core/tenant-access-policy-contract-p0.js',
 'orbit360-platform/core/tenant-access-policy-effective-p0.js'
])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const front=context.window.Orbit.tenantAccessPolicyEffectiveP0;
const base=context.window.Orbit.tenantAccessPolicyP0;
const tenantId='synthetic-tenant';
const config={roleScopes:{Operativo:'all',Asesor:'own'}};
const member=(uid,role='Operativo',dataScopes={default:'own'},extra={})=>({
 uid,tenantId,status:'active',roles:[role],activeRole:role,
 countries:['CO'],advisorId:'own-advisor',
 modulesVisible:['cliente360','polizas','reclamos'],
 dataScopes,...extra
});
const foreign={id:'client-foreign',tenantId,pais:'CO',asesorId:'other-advisor'};
const own={id:'client-own',tenantId,pais:'CO',asesorId:'own-advisor'};
const back=(m,collection='clientes',cfg=config)=>resolve({
 auth:{uid:m.uid,token:{giActiveRole:m.activeRole}},member:m,config:cfg,
 tenantId,activeRole:m.activeRole,collection,country:'CO'
});
const checks=[];
function yes(label,statement){assert.ok(statement,label);checks.push(label);}
function no(label,statement){assert.equal(statement,false,label);checks.push(label);}
function denied(label,run,code){assert.throws(run,e=>e instanceof Denied&&e.code===code,label);checks.push(label);}
const inherited=member('operative-default-own');
const explicitOwn=member('operative-client-own','Operativo',{default:'all',modules:{cliente360:'own'}});
for(const m of [inherited,explicitOwn]){
 yes(m.uid+' backend scope=all',back(m).scope==='all');
 yes(m.uid+' backend cross-advisor allowed',allowRow(back(m),foreign)===true);
 no(m.uid+' base frontend still own',base.canRead('clientes',foreign,m).allowed);
 yes(m.uid+' effective frontend read all clients',front.canRead('clientes',foreign,m).allowed);
 yes(m.uid+' effective frontend query=all',front.queryConstraints('clientes',m).scope==='all');
 yes(m.uid+' no advisor client-query filter',!front.queryConstraints('clientes',m).constraints.some(x=>x.field==='advisorId'));
 yes(m.uid+' other-module policy read unchanged',
  front.canRead('polizas',foreign,m).allowed===base.canRead('polizas',foreign,m).allowed);
 yes(m.uid+' other-module backend scope unchanged',
  back(m,'polizas').scope===m.dataScopes.default);
 no(m.uid+' foreground write remains scoped',front.canWrite('clientes','update',foreign,{nombre:'test'},m).allowed);
}
const advisor=member('advisor','Asesor');
no('Asesor foreign client denied',front.canRead('clientes',foreign,advisor).allowed);
yes('Asesor own client allowed',front.canRead('clientes',own,advisor).allowed);
yes('Asesor query remains own',front.queryConstraints('clientes',advisor).scope==='own');
yes('Asesor backend scope remains own',back(advisor).scope==='own');
const multi=member('multi','Asesor',{default:'own'},{roles:['Asesor','Operativo']});
no('multi-role with active Asesor denied foreign client',front.canRead('clientes',foreign,multi).allowed);
const none=member('explicit-none','Operativo',{default:'all',modules:{cliente360:'none'}});
denied('explicit server module none denied',()=>back(none),'SCOPE_NONE');
no('explicit frontend module none denied',front.canRead('clientes',foreign,none).allowed);
yes('explicit frontend module none query denied',front.queryConstraints('clientes',none).scope==='none');
const restricted=member('restricted','Operativo',{default:'all'},{modulesRestricted:['cliente360']});
denied('restricted module denied server',()=>back(restricted),'MODULE_DENIED');
no('restricted module denied frontend',front.canRead('clientes',foreign,restricted).allowed);
const wrongCountry={...foreign,pais:'GT'};
denied('server country rejected',()=>allowRow(back(inherited),wrongCountry),'COUNTRY_DENIED');
no('frontend country rejected',front.canRead('clientes',wrongCountry,inherited).allowed);
const wrongTenant={...foreign,tenantId:'foreign-tenant'};
denied('server tenant rejected',()=>allowRow(back(inherited),wrongTenant),'TENANT_DENIED');
no('frontend tenant rejected',front.canRead('clientes',wrongTenant,inherited).allowed);
const blocked=member('blocked','Operativo',{default:'all'},{status:'inactive'});
denied('server inactive membership rejected',()=>back(blocked),'MEMBERSHIP_DENIED');
no('frontend inactive membership rejected',front.canRead('clientes',foreign,blocked).allowed);
yes('central role ceiling not overridden',back(inherited,'clientes',{roleScopes:{Operativo:'own'}}).scope==='own');
console.log('B4_003_OPERATIVO_CLIENT_READ_FRONT_BACK_PARITY_PASS checks='+checks.length+
 ' identities=8 role_wide=true advisor_own=true countries_and_tenant_enforced=true writes_unchanged=true');
