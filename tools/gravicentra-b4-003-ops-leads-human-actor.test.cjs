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
const scope={text,norm,HttpsError,id:x=>text(x),
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

 // B4-003 priority preflight: exercise the REAL Preview command handler with
 // a synthetic transactional Firestore double. This does not touch Firebase.
 {
  const documents=new Map(),unitTenant='test-tenant',managementId='synthetic-management';
  const memberPath=id=>'tenants/'+unitTenant+'/members/'+id;
  const rowPath='tenants/'+unitTenant+'/data/gestiones/items/'+managementId;
  documents.set(memberPath('operator-01'),{tenantId:unitTenant,uid:'operator-01',
   status:'active',roles:['operativo'],activeRole:'operativo',advisorId:'advisor-01',
   nombre:'Operador sintético',
   dataScopes:{modules:{ops:'equipo'}},roleVisibleAdvisorIds:{operativo:['advisor-01','advisor-02']}});
  documents.set(memberPath('advisor-02'),{tenantId:unitTenant,uid:'advisor-02',
   status:'active',roles:['asesor'],activeRole:'asesor',advisorId:'advisor-02',
   nombre:'Asesor sintético',dataScopes:{modules:{ops:'propios'}}});
  documents.set('tenants/'+unitTenant+'/config/workflow',{version:'synthetic'});
  documents.set(rowPath,{id:managementId,tenantId:unitTenant,asesorId:'advisor-01',
   titulo:'Gestión sintética',lista:'Gestiones Admin',estado:'Pendiente',pais:'GT',
   previewWrite:true,comentarios:[]});
  let logicalWrites=0;
  class Reference{
   constructor(path){this.path=path;}
   collection(name){return new Reference(this.path+'/'+name);}
   doc(name){return new Reference(this.path+'/'+name);}
   async get(){return snap(documents.get(this.path));}
  }
  const db={collection:name=>new Reference(name),
   runTransaction:async fn=>{
    const changes=[];
    const tx={get:ref=>ref.get(),set:(ref,patch,options)=>{
     changes.push({path:ref.path,patch,merge:options&&options.merge===true});
    }};
    const response=await fn(tx);
    for(const ch of changes){
     documents.set(ch.path,ch.merge?Object.assign({},documents.get(ch.path)||{},ch.patch):ch.patch);
     logicalWrites++;
    }
    return response;
   }};
  const sandboxExports={};
  const realRequire=require;
  const stubRequire=name=>{
   if(name==='node:crypto')return realRequire(name);
   if(name==='firebase-admin/app')return{getApps:()=>[],initializeApp:()=>({})};
   if(name==='firebase-admin/firestore')return{getFirestore:()=>db,
    FieldValue:{serverTimestamp:()=> '2026-10-13T00:00:00Z'}};
   if(name==='firebase-functions/v2/https')return{HttpsError,onCall:(_opts,fn)=>fn};
   if(name==='firebase-functions/v2/scheduler')return{onSchedule:(_opts,fn)=>fn};
   if(name==='./product-active-role-contract')return{resolveProductActiveRole:(m,requested)=>{
    const role=String(requested||m.activeRole).toLowerCase();
    if(!m.roles.includes(role))throw Error('ROLE_NOT_ASSIGNED');
    return{activeRole:role,assignedRoles:m.roles.slice()};
   }};
   throw Error('UNEXPECTED_MOCK_IMPORT_'+name);
  };
  vm.runInNewContext(source,{require:stubRequire,exports:sandboxExports,process:{env:{}}},
   {timeout:1000});
  const call=sandboxExports.orbit360OpsLeadsCommandPreview;
  const opRequest={auth:{uid:'operator-01',token:{email:'operator@example.invalid'}},
   data:{tenantId:unitTenant,activeRole:'operativo',operation:'assign_management',
    entityId:managementId,requestId:'synthetic-request-001',
    reason:'Reasignación controlada',payload:{asesorId:'advisor-02'}}};
  const first=await call(opRequest);
  assert.equal(first.ok,true);checks++;
  assert.equal(first.canonicalReadback,true);checks++;
  assert.equal(documents.get(rowPath).asesorId,'advisor-02');checks++;
  const repeat=await call(opRequest);
  assert.equal(repeat.reused,true);checks++;
  assert.equal(documents.get(rowPath).asesorId,'advisor-02');checks++;
  const advisorRequest={auth:{uid:'advisor-02',token:{email:'advisor@example.invalid'}},
   data:{tenantId:unitTenant,activeRole:'asesor',operation:'update_management',
    entityId:managementId,requestId:'synthetic-request-002',
    reason:'Validación de alcance',payload:{asesorId:'advisor-01'}}};
  let rejection;
  try{await call(advisorRequest);}catch(error){rejection=error;}
  assert.equal(rejection&&rejection.code,'permission-denied');checks++;
  assert.equal(documents.get(rowPath).asesorId,'advisor-02');checks++;
  assert.equal(logicalWrites,4);checks++;
  console.log('B4_003_TWO_UID_SYNTHETIC_ASSIGNMENT_QA_PASS checks=8 mock_only no_firestore_writes no_preview_claim');
 }
 console.log('B4_003_OPS_LEADS_CANONICAL_HUMAN_ACTOR_SOURCE_QA_PASS checks='+checks+' synthetic_only_no_writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
