'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path='functions/product-ops-leads-domain.js',source=fs.readFileSync(path,'utf8');
const start=source.indexOf('function humanActorName(value){'),end=source.indexOf('function workflowConfig(',start);
assert.ok(start>=0&&end>start,'ACTOR_AUTHORIZE_OWNER_NOT_FOUND');
const tenantId='synthetic-tenant',uid='synthetic-uid',advisorId='synthetic-advisor';
let member={tenantId,uid,advisorId,roles:['operativo','asesor'],activeRole:'operativo',
 email:'not-a-name@example.test',status:'active'};
let advisor={id:advisorId,tenantId,nombre:'Persona de ejemplo'};
let reads=0;
const snap=x=>({exists:x!=null,data:()=>x});
const text=(x,n)=>String(x==null?'':x).trim().slice(0,n||10000);
const norm=x=>text(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_');
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
const scope={text,norm,HttpsError,
 memberRef:(_t,_uid)=>({get:async()=>{reads++;return snap(member)}}),
 dataRef:(_t,c,_id)=>{assert.equal(c,'asesores');return{get:async()=>{reads++;return snap(advisor)}};},
 active:m=>m&&m.status==='active',
 permissions:()=>[],ADMIN_ROLES:new Set(['operativo']),
 MANAGE_PERMISSIONS:new Set(),SELF_SERVICE_ROLES:new Set(['asesor']),
 resolveProductActiveRole:(m,requested)=>{
  const role=requested||m.activeRole;
  if(!m.roles.includes(role))throw Object.assign(Error('not assigned'),{code:'PRODUCT_ACTIVE_ROLE_NOT_ASSIGNED'});
  return{activeRole:role,assignedRoles:m.roles.slice()};
 }};
vm.runInNewContext(source.slice(start,end)+'\nthis.api={humanActorName,authorize};',scope,{timeout:1000});
const call=(activeRole='operativo',token={email:'not-a-name@example.test'})=>scope.api.authorize({
 auth:{uid,token},data:{tenantId,activeRole}
},'update_business');
const denied=async(fn,code)=>{let x;try{await fn()}catch(e){x=e}assert.equal(x&&x.code,code);};
(async()=>{
 let checks=0;
 let r=await call();assert.equal(r.actor.name,'Persona de ejemplo');checks++;
 assert.equal(r.actor.uid,uid);checks++;
 assert.equal(r.actor.email,'not-a-name@example.test');checks++;
 assert.equal(reads,2);checks++;
 member={...member,nombre:'Persona de membresía'};
 r=await call();assert.equal(r.actor.name,'Persona de membresía');checks++;
 member={...member,nombre:'not-a-name@example.test'};
 r=await call();assert.equal(r.actor.name,'Persona de ejemplo');checks++;
 advisor={...advisor,tenantId:'foreign'};
 r=await call('operativo',{email:'not-a-name@example.test',name:'Actor autenticado'});
 assert.equal(r.actor.name,'Actor autenticado');checks++;
 r=await call('operativo',{email:'not-a-name@example.test',name:'another@example.test'});
 assert.equal(r.actor.name,'Usuario del equipo');checks++;
 member={...member,tenantId:'foreign'};
 await denied(()=>call(),'permission-denied');checks++;
 member={...member,tenantId};
 await denied(()=>call('superadmin'),'permission-denied');checks++;
 member={...member,nombre:'Dirección'};
 r=await call();assert.equal(r.actor.name,'Usuario del equipo');checks++;
 member={...member,nombre:'Persona válida'};
 r=await call('asesor');assert.equal(r.actor.activeRole,'asesor');checks++;
 assert.equal(JSON.stringify(r.actor).includes('synthetic-advisor'),true);checks++;
 console.log('B4_003_OPS_LEADS_CANONICAL_HUMAN_ACTOR_SOURCE_QA_PASS checks='+checks+' synthetic_only_no_writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
