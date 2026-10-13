'use strict';
const assert=require('node:assert/strict');
const {readBootstrap}=require('../functions/b4-003-scoped-bootstrap-reader');
const {Denied}=require('../functions/b4-003-scoped-access-boundary');
const tenantId='alianzas-soluciones',uid='u-synthetic';
let member={uid,tenantId,email:'qa@example.test',status:'active',
 roles:['Asesor','Operativo'],activeRole:'Asesor',countries:['GT','CO'],
 advisorId:'advisor-a',dataScopes:{default:'own',modules:{cliente360:'own'}},
 roleVisibleAdvisorIds:{Asesor:['advisor-a']},unapprovedPrivateField:'DO_NOT_RETURN'};
const systemConfig={nombre:'Test',legalName:'Example S.A.',unapprovedPrivateField:'DO_NOT_RETURN'};
const snap=value=>({exists:value!=null,data:()=>value});
const db={collection:k=>{assert.equal(k,'tenants');return{doc:tid=>{
 assert.equal(tid,tenantId);
 return{collection:c=>{
  if(c==='members')return{doc:id=>{assert.equal(id,uid);return{get:async()=>snap(member)}}};
  if(c==='system')return{doc:id=>{assert.equal(id,'config');return{get:async()=>snap(systemConfig)}}};
  throw Error('UNEXPECTED_COLLECTION');
 }};}}}};
const call=(mode='bootstrap-membership',changes={})=>readBootstrap({
 db,auth:{uid,token:{email:'qa@example.test'}},request:{tenantId,mode,...changes}
});
async function denied(fn,code){let e;try{await fn()}catch(err){e=err}
 assert.ok(e instanceof Denied,'expected Denied');assert.equal(e.code,code);}
(async()=>{
 let count=0;
 const data=await call();assert.equal(data.membership.uid,uid);count++;
 assert.deepEqual(data.membership.countries,['GT','CO']);count++;
 assert.equal(data.membership.roleVisibleAdvisorIds.Asesor[0],'advisor-a');count++;
 assert.equal(JSON.stringify(data).includes('DO_NOT_RETURN'),false);count++;
 const config=await call('bootstrap-tenant-config');assert.equal(config.config.nombre,'Test');count++;
 assert.equal(JSON.stringify(config).includes('DO_NOT_RETURN'),false);count++;
 await denied(()=>call('bootstrap-membership',{uid:'another'}),'IDENTITY_DENIED');count++;
 await denied(()=>call('delete'),'MODE_DENIED');count++;
 member={...member,status:'inactive'};await denied(()=>call(),'MEMBERSHIP_DENIED');count++;
 member={...member,status:'active',activeRole:'Admin'};await denied(()=>call(),'ROLE_DENIED');count++;
 member={...member,activeRole:'Asesor',countries:['MX']};await denied(()=>call(),'COUNTRY_DENIED');count++;
 member={...member,countries:['GT'],email:'other@example.test'};await denied(()=>call(),'EMAIL_DENIED');count++;
 console.log('B4_003_PROTECTED_BOOTSTRAP_SOURCE_QA_PASS checks='+count+' synthetic_only no_deploy');
})().catch(e=>{console.error(e);process.exitCode=1;});