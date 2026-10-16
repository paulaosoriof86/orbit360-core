'use strict';
// Regression proof for C03.04's before-image subcase. In-memory only; no Firebase SDK/network.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(process.argv[2]||'functions'),output=process.argv[3];
const clone=x=>JSON.parse(JSON.stringify(x));
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
function env({role='Asesor',scope='propios',countries=['GT'],team=[]}={}){
 const tenant='synthetic-audit',uid='synthetic-user',own='advisor-own',rows=new Map(),writes=[];
 const member={uid,tenantId:tenant,status:'active',active:true,roles:[role],activeRole:role,advisorId:own,countries,dataScopes:{default:scope},teamAdvisorIds:team};
 rows.set(`tenants/${tenant}/members/${uid}`,member);
 rows.set(`tenants/${tenant}/config/access`,{roleScopes:{[role]:scope},rolePermissions:{[role]:{cliente360:{ver:true,editar:true},equipo:{ver:true,editar:true}}}});
 const snapshot=p=>({id:p.split('/').pop(),exists:rows.has(p),data:()=>clone(rows.get(p)||{})});
 class Ref{
  constructor(p,query=false,conditions=[]){this.p=p;this.query=query;this.conditions=conditions;}
  collection(k){return new Ref(this.p+'/'+k,true);}doc(k){return new Ref(this.p+'/'+k);}
  where(...c){return new Ref(this.p,true,[...this.conditions,c]);}limit(){return this;}orderBy(){return this;}
  async get(){if(!this.query)return snapshot(this.p);const docs=[...rows.keys()].filter(p=>p.startsWith(this.p+'/')&&!p.slice(this.p.length+1).includes('/')).map(snapshot).filter(s=>this.conditions.every(([k,op,v])=>op==='=='&&s.data()[k]===v));return{docs,empty:!docs.length};}
 }
 const db={collection:k=>new Ref(k,true),async runTransaction(fn){const pending=[];let written=false;
  const tx={async get(ref){if(written)throw Error('READ_AFTER_WRITE');return ref.get();},set(ref,row,options){written=true;pending.push({p:ref.p,row:clone(row),merge:options?.merge});},delete(ref){written=true;pending.push({p:ref.p,remove:true});}};
  const out=await fn(tx);for(const w of pending){if(w.remove)rows.delete(w.p);else rows.set(w.p,w.merge?{...rows.get(w.p),...w.row}:w.row);writes.push(w);}return out;
 }};
 const cache={};function load(file){const f=path.resolve(root,file.endsWith('.js')?file:file+'.js');if(cache[f])return cache[f].exports;
  const m={exports:{}};cache[f]=m;const req=id=>{if(id.startsWith('.'))return load(id);if(id==='firebase-admin/app')return{getApps:()=>[{}],initializeApp:()=>({})};if(id==='firebase-admin/firestore')return{getFirestore:()=>db,FieldValue:{serverTimestamp:()=> 'SYNTHETIC_TIMESTAMP'}};if(id==='firebase-admin/storage')return{getStorage:()=>({})};if(id==='firebase-functions/v2/https')return{HttpsError,onCall:(_o,f)=>f};if(id==='node:crypto')return crypto;throw Error('UNEXPECTED_IMPORT:'+id);};
  vm.runInNewContext(fs.readFileSync(f,'utf8'),{module:m,exports:m.exports,require:req,process:{env:{}},Buffer,console},{filename:f});return m.exports;
 }
 const mod=load('product-operational-domain');const ref=id=>`tenants/${tenant}/data/clientes/items/${id}`;
 const set=(id,advisor='advisor-own',country='GT')=>rows.set(ref(id),{id,tenantId:tenant,pais:country,asesorId:advisor,nombre:'Synthetic original'});
 const request=(mutations,requestId)=>({auth:{uid,token:{email:'synthetic@example.invalid'}},data:{tenantId:tenant,activeRole:role,mutations,...(requestId?{requestId}:{})}});
 const update=(id,payload)=>({collection:'clientes',action:'update',id,payload});
 const execute=(mutations,requestId)=>mod.orbit360ProductOperationalCommand(request(mutations,requestId));
 return{tenant,uid,own,rows,writes,ref,set,request,update,execute,mod};
}
const cases=[
 ['foreign_to_own_denied',async()=>{const e=env();e.set('foreign','advisor-other');await assert.rejects(e.execute([e.update('foreign',{asesorId:e.own})]),x=>x.code==='permission-denied');assert.equal(e.writes.length,0);assert.equal(e.rows.get(e.ref('foreign')).asesorId,'advisor-other');}],
 ['foreign_content_denied',async()=>{const e=env();e.set('foreign','advisor-other');await assert.rejects(e.execute([e.update('foreign',{nombre:'Changed'})]),x=>x.code==='permission-denied');assert.equal(e.writes.length,0);}],
 ['own_edit_allowed',async()=>{const e=env();e.set('own');const r=await e.execute([e.update('own',{nombre:'Changed'})]);assert.equal(r.canonicalReadback,true);assert.equal(e.rows.get(e.ref('own')).nombre,'Changed');}],
 ['own_to_foreign_denied',async()=>{const e=env();e.set('own');await assert.rejects(e.execute([e.update('own',{asesorId:'advisor-other'})]),x=>x.code==='permission-denied');assert.equal(e.writes.length,0);}],
 ['foreign_country_to_authorized_denied',async()=>{const e=env({role:'Dirección',scope:'todos'});e.set('foreign-country',e.own,'CO');await assert.rejects(e.execute([e.update('foreign-country',{pais:'GT'})]),x=>x.code==='permission-denied');assert.equal(e.writes.length,0);}],
 ['authorized_to_foreign_country_denied',async()=>{const e=env({role:'Dirección',scope:'todos'});e.set('own');await assert.rejects(e.execute([e.update('own',{pais:'CO'})]),x=>x.code==='permission-denied');assert.equal(e.writes.length,0);}],
 ['all_scope_reassignment_preserved',async()=>{const e=env({role:'Dirección',scope:'todos'});e.set('foreign','advisor-other');const r=await e.execute([e.update('foreign',{asesorId:e.own})]);assert.equal(r.canonicalReadback,true);}],
 ['team_member_edit_preserved',async()=>{const e=env({role:'Operativo',scope:'equipo',team:['advisor-peer']});e.set('team','advisor-peer');assert.equal((await e.execute([e.update('team',{nombre:'Changed'})])).canonicalReadback,true);}],
 ['outsider_to_team_denied',async()=>{const e=env({role:'Operativo',scope:'equipo',team:['advisor-peer']});e.set('foreign','advisor-other');await assert.rejects(e.execute([e.update('foreign',{asesorId:'advisor-peer'})]),x=>x.code==='permission-denied');assert.equal(e.writes.length,0);}],
 ['mixed_batch_no_partial_commit',async()=>{const e=env();e.set('own');e.set('foreign','advisor-other');await assert.rejects(e.execute([e.update('own',{nombre:'Changed'}),e.update('foreign',{asesorId:e.own})]),x=>x.code==='permission-denied');assert.equal(e.writes.length,0);assert.equal(e.rows.get(e.ref('own')).nombre,'Synthetic original');}],
 ['own_insert_preserved',async()=>{const e=env();assert.equal((await e.execute([{collection:'clientes',action:'insert',id:'new-client',payload:{pais:'GT',asesorId:e.own,nombre:'New'}}])).canonicalReadback,true);}],
 ['retry_idempotency_preserved',async()=>{const e=env();e.set('own');const m=[e.update('own',{nombre:'Changed'})];await e.execute(m,'same-request');const n=e.writes.length;const out=await e.execute(m,'same-request');assert.equal(out.reused,true);assert.equal(e.writes.length,n);}]
];
(async()=>{const tests=[];for(const [id,test] of cases){try{await test();tests.push({id,pass:true});}catch(e){tests.push({id,pass:false,error:e.message});}}
 const result={schema:'gravicentra-before-image-regression-v1',syntheticOnly:true,externalRequests:0,sourceBlob:crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+fs.statSync(path.join(root,'product-operational-domain.js')).size+'\0'),fs.readFileSync(path.join(root,'product-operational-domain.js'))])).digest('hex'),total:tests.length,passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests,releaseAccepted:false};
 if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=result.failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=2;});
