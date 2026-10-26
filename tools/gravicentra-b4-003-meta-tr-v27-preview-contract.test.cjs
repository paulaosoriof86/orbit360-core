'use strict';
// B4-003 TR-01..TR-07 source-level contract. In-memory doubles only; no network,
// no Firebase credentials, no browser tokens and no physical writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const nodeCrypto=require('node:crypto');

const source=fs.readFileSync('functions/product-ops-leads-domain.js','utf8');
const cycle=fs.readFileSync('orbit360-platform/core/ciclo.js','utf8');
const ID='b4003qa_meta_tr_v27_20261025_01';
const TENANT='alianzas-soluciones';
const PIECE='F02-V27-QA';
const documents=new Map();
const path=(collection,id)=>`tenants/${TENANT}/data/${collection}/items/${id}`;
const memberPath=uid=>`tenants/${TENANT}/members/${uid}`;
const snap=row=>({exists:row!==undefined,data:()=>row});
class Ref{
 constructor(key){this.key=key;}
 collection(name){return new Ref(`${this.key}/${name}`);}
 doc(id){return new Ref(`${this.key}/${id}`);}
 async get(){return snap(documents.get(this.key));}
}
let writes=0;
const db={collection:name=>new Ref(name),runTransaction:async handler=>{
 const pending=[];
 const tx={get:ref=>ref.get(),set:(ref,row,options)=>pending.push({key:ref.key,row,merge:options?.merge===true})};
 const outcome=await handler(tx);
 for(const change of pending){documents.set(change.key,change.merge?{...documents.get(change.key),...change.row}:change.row);writes++;}
 return outcome;
}};
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
const mockExports={};
const mockRequire=name=>{
 if(name==='node:crypto')return nodeCrypto;
 if(name==='firebase-admin/app')return{getApps:()=>[{}],initializeApp:()=>({})};
 if(name==='firebase-admin/firestore')return{getFirestore:()=>db,FieldValue:{serverTimestamp:()=> '2026-10-25T18:00:00.000Z'}};
 if(name==='firebase-functions/v2/https')return{HttpsError,onCall:(_config,fn)=>fn};
 if(name==='firebase-functions/v2/scheduler')return{onSchedule:(_config,fn)=>fn};
 if(name==='./product-active-role-contract')return{resolveProductActiveRole:(member,requested)=>{
  const role=String(requested||member.activeRole||'').toLowerCase();
  if(!member.roles.includes(role))throw Error('ROLE_NOT_ASSIGNED');
  return{activeRole:role,assignedRoles:[...member.roles]};
 }};
 throw Error('UNEXPECTED_TEST_IMPORT:'+name);
};
vm.runInNewContext(source,{require:mockRequire,exports:mockExports,process:{env:{}},console},{timeout:1000});
documents.set(memberPath('paula-qa'),{tenantId:TENANT,status:'active',roles:['direccion'],activeRole:'direccion',advisorId:'advisor-paula',nombre:'Dirección QA',dataScopes:{modules:{leads:'todos',ops:'todos'}}});
documents.set(memberPath('samuel-qa'),{tenantId:TENANT,status:'active',roles:['asesor'],activeRole:'asesor',advisorId:'advisor-samuel',nombre:'Asesor QA'});
const preview=mockExports.orbit360OpsLeadsCommandPreview;
const regular=mockExports.orbit360OpsLeadsCommand;
const request=(uid,activeRole,operation,payload={},serial='01',tenantId=TENANT)=>({
 auth:{uid,token:{}},data:{tenantId,activeRole,operation,entityId:ID,requestId:`meta-tr-v27-${operation}-${serial}`,
  reason:'Verificación sintética de trazabilidad sin comunicaciones',payload}
});
const createPayload={id:ID,nombre:'QA Meta · Caso sintético sin datos personales',tipo:'Persona',
 asesorId:'advisor-samuel',etapa:'nuevo',pais:'GT',moneda:'GTQ',canal:'Facebook',piezaOrigen:PIECE,
 origen:'Leads',descripcion:'Necesidad sintética declarada',email:'',telefono:'',producto:'Vehículo Liviano'};

(async()=>{
 let checks=0;
 assert.match(cycle,/id=metaQa\?'b4003qa_meta_tr_v27_20261025_01'/);checks++;
 assert.match(cycle,/metaQa\?'Facebook':v\('nn-canal'\)/);checks++;
 assert.match(cycle,/piezaOrigen:metaQa\?'F02-V27-QA'/);checks++;
 assert.match(cycle,/metaQa\?'':v\('nn-email'\)/);checks++;
 assert.match(cycle,/metaQaPreview=.*Orbit\.auth\?\.productUser\?\.tenantId/);checks++;
 assert.doesNotMatch(source.slice(source.indexOf('function sanitizeBusiness('),source.indexOf('function sanitizeManagement(')),/piezaOrigen:[^,]*origen/);checks++;
 await assert.rejects(regular(request('paula-qa','direccion','create_business',createPayload)),e=>e.code==='permission-denied');checks++;
 await assert.rejects(regular(request('paula-qa','direccion','update_business',{descripcion:'Bloqueado'})),e=>e.code==='permission-denied');checks++;
 await assert.rejects(preview(request('paula-qa','direccion','create_business',{...createPayload,canal:'Instagram'})),e=>e.code==='permission-denied');checks++;
 await assert.rejects(preview(request('paula-qa','direccion','create_business',{...createPayload,id:'caso-erroneo'})),e=>e.code==='permission-denied');checks++;
 await assert.rejects(preview(request('paula-qa','direccion','create_business',{...createPayload,piezaOrigen:'INVALIDA'})),e=>e.code==='permission-denied');checks++;
 await assert.rejects(preview(request('paula-qa','direccion','create_business',{...createPayload,email:'persona@example.invalid'})),e=>e.code==='permission-denied');checks++;
 await assert.rejects(preview(request('paula-qa','direccion','create_business',{...createPayload,origen:'Ops'})),e=>e.code==='permission-denied');checks++;
 assert.equal(writes,0);checks++;
 const create=await preview(request('paula-qa','direccion','create_business',createPayload));
 assert.equal(create.ok,true);assert.equal(create.canonicalReadback,true);checks+=2;
 let row=documents.get(path('negocios',ID));
 assert.equal(row.id,ID);assert.equal(row.canal,'Facebook');assert.equal(row.piezaOrigen,PIECE);checks+=3;
 assert.equal(row.origen,'Leads');assert.equal(row.previewWrite,true);assert.equal(row.archivado,false);checks+=3;
 assert.equal(row.email,'');assert.equal(row.telefono,'');checks+=2;
 const retry=await preview(request('paula-qa','direccion','create_business',createPayload));
 assert.equal(retry.reused,true);checks++;
 await assert.rejects(preview(request('paula-qa','direccion','create_business',createPayload,'new-request')),e=>e.code==='already-exists');checks++;
 const update=await preview(request('samuel-qa','asesor','update_business',{
  descripcion:'La persona QA desea conocer cobertura liviana.',proximoToque:'2026-10-29',piezaOrigen:'NO_CAMBIAR'
 }));
 assert.equal(update.canonicalReadback,true);checks++;
 row=documents.get(path('negocios',ID));
 assert.equal(row.descripcion,'La persona QA desea conocer cobertura liviana.');checks++;
 assert.equal(row.proximoToque,'2026-10-29');checks++;
 assert.equal(row.piezaOrigen,PIECE);checks++;
 const transition=await preview(request('paula-qa','direccion','transition_business',{to:'contactado'},'02'));
 assert.equal(transition.canonicalReadback,true);checks++;
 assert.equal(documents.get(path('negocios',ID)).etapa,'contactado');checks++;
 const archive=await preview(request('paula-qa','direccion','archive_business',{},'03'));
 assert.equal(archive.canonicalReadback,true);checks++;
 assert.equal(documents.get(path('negocios',ID)).archivado,true);checks++;
 assert.equal(documents.has(path('negocios',ID)),true);checks++;
 assert.equal([...documents.keys()].some(key=>key.includes('/notificationOutbox/')),false);checks++;
 assert.ok([...documents.keys()].some(key=>key.includes('/previewNotificationOutbox/')));checks++;
 console.log(`AYS_META_TR_V27_SOURCE_CONTRACT_PASS checks=${checks} in_memory_only physical_writes=0`);
})().catch(error=>{console.error(error);process.exitCode=1;});
