'use strict';
const assert=require('node:assert/strict');
const {readScopedRelatedDocument,readScopedRelatedList,collections}=require('../functions/b4-003-scoped-related-reader');
const {resolve,Denied}=require('../functions/b4-003-scoped-access-boundary');
const fs=require('node:fs');
const providerSource=fs.readFileSync(require('node:path').join(__dirname,'../orbit360-platform/core/product-runtime-browser-providers-p0.js'),'utf8');
const protectedStore=fs.readFileSync(require('node:path').join(__dirname,'../orbit360-platform/data/store-firestore-product-readonly-p0.js'),'utf8');
const tenantId='alianzas-soluciones';
const member={uid:'u1',tenantId,status:'active',roles:['Asesor','Finanzas'],advisorId:'a1',teamAdvisorIds:['a2'],modulesExtra:['comisiones'],countries:['GT','CO'],dataScopes:{default:'own',modules:{comisiones:'own',conciliaciones:'all',ops:'own'}}};
const config={roleScopes:{asesor:'own',finanzas:'all'}};
const docs={
 clientes:{
  c1:{id:'c1',tenantId,pais:'GT',asesorId:'a1'},
  c2:{id:'c2',tenantId,pais:'GT',asesorId:'a2'},
  c3:{id:'c3',tenantId,pais:'CO',asesorId:'a1'},
  cForeign:{id:'cForeign',tenantId:'other',pais:'GT',asesorId:'a1'}
 },
 polizas:{
  p1:{id:'p1',tenantId,pais:'GT',asesorId:'a1',clienteId:'c1'},
  p2:{id:'p2',tenantId,pais:'GT',asesorId:'a2',clienteId:'c2'},
  p3:{id:'p3',tenantId,pais:'CO',asesorId:'a1',clienteId:'c3'}
 },
 reclamos:{
  claim1:{id:'claim1',polizaId:'p1',clienteId:'c1'},
  claimClientOnly:{id:'claimClientOnly',clienteId:'c1'},
  claimOther:{id:'claimOther',polizaId:'p2',clienteId:'c2'},
  claimCO:{id:'claimCO',polizaId:'p3',clienteId:'c3'},
  claimForeign:{id:'claimForeign',polizaId:'p1',clienteId:'c1',tenantId:'other'}
 },
 comisiones:{
  com1:{id:'com1',polizaId:'p1',clienteId:'c1',monto:10},
  comClientOnly:{id:'comClientOnly',clienteId:'c1',monto:4},
  comOther:{id:'comOther',polizaId:'p2',clienteId:'c2',monto:12}
 },
 finmovs:{
  fmGT:{id:'fmGT',tenantId,pais:'GT',valor:30},
  fmCO:{id:'fmCO',tenantId,pais:'CO',valor:40},
  fmForeign:{id:'fmForeign',tenantId:'other',pais:'GT',valor:90},
  fmUnscoped:{id:'fmUnscoped',tenantId,valor:99}
 },
 tareas:{
  taskOwn:{id:'taskOwn',tenantId,pais:'GT',asesorId:'a1',fecha:'2026-10-26',t:'propia'},
  taskTeam:{id:'taskTeam',tenantId,pais:'GT',asesorId:'a2',fecha:'2026-10-26',t:'equipo'},
  taskPolicy:{id:'taskPolicy',tenantId,polizaId:'p1',clienteId:'c1',fecha:'2026-10-26',t:'vinculada'},
  taskOther:{id:'taskOther',tenantId,polizaId:'p2',clienteId:'c2',fecha:'2026-10-26',t:'ajena'},
  taskCountry:{id:'taskCountry',tenantId,pais:'CO',asesorId:'a1',fecha:'2026-10-26',t:'otro pais'},
  taskUnscoped:{id:'taskUnscoped',tenantId,fecha:'2026-10-26',t:'sin dueño ni relación'}
 }
};
const {resolve:unused}=require('../functions/b4-003-scoped-access-boundary');
const observedQueries=[];
const snap=value=>({exists:value!=null,id:value&&value.id,data:()=>value});
function makeDoc(collection,id){
 return {id,get:async()=>snap(docs[collection]&&docs[collection][id]),collection:()=>{throw Error('unexpected nested collection');}};
}
function makeQuery(collection,after='',limitValue=Infinity){
 return {
  orderBy(){return this;},
  limit(n){return makeQuery(collection,after,n);},
  startAfter(doc){return makeQuery(collection,doc.id||doc._id||'',limitValue);},
  async get(){
   observedQueries.push(collection);
   const rows=Object.entries(docs[collection]||{}).sort(([a],[b])=>a.localeCompare(b)).filter(([id])=>!after||id>after).slice(0,limitValue);
   return {docs:rows.map(([id,row])=>({id,data:()=>row}))};
  },
  doc(id){return makeDoc(collection,id);}
 };
}
const tenantRef={collection(name){
 if(name==='members')return {doc(uid){return {get:async()=>snap(uid===member.uid?member:null)}}};
 if(name==='config')return {doc(id){return {get:async()=>snap(id==='access'?config:null)}}};
 if(name==='data')return {doc(collection){return {collection(name){assert.equal(name,'items');return makeQuery(collection)}}}};
 throw Error('unknown tenant subcollection '+name);
}};
const db={collection(name){assert.equal(name,'tenants');return {doc(id){assert.equal(id,tenantId);return tenantRef}}}};
const auth={uid:'u1',token:{}};
const list=async(collection,role='Asesor',country='GT',pageSize=50,cursor='')=>readScopedRelatedList({db,auth,request:{tenantId,collection,activeRole:role,country,pageSize,cursor}});
const read=async(collection,documentId,role='Asesor',country='GT')=>readScopedRelatedDocument({db,auth,request:{tenantId,collection,activeRole:role,country,documentId}});
(async()=>{
 assert.ok(['reclamos','comisiones','finmovs','tareas'].every(x=>collections.has(x)),'four collections are accepted by server reader');
 assert.ok(['reclamos','comisiones','finmovs','tareas'].every(x=>providerSource.includes("'"+x+"'")),'four collections reach the authenticated callable');
 assert.ok(protectedStore.includes("'reclamos','comisiones','finmovs','tareas'"),'four collections are supported and directly paged by protected store');
 assert.ok(protectedStore.includes("normalize('NFD').replace(/")&&protectedStore.includes(".replace(/^_+|_+$/g,'')"),'frontend active-role comparison matches backend accent and separator normalization');
 const roleNorm=x=>String(x).normalize('NFD').split('').filter(c=>{const n=c.charCodeAt(0);return n<768||n>879;}).join('').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
 assert.equal(roleNorm('Dirección'),'direccion','diacritic role labels match canonical role id');
 assert.equal(roleNorm('Asesor Sr.'),'asesor_sr','punctuated role labels match canonical role id');
 assert.equal(resolve({auth,member,config,tenantId,activeRole:'Asesor',country:'GT',collection:'tareas'}).scope,'own','task module authorization uses assigned ops role');
 assert.throws(()=>resolve({auth,member,config,tenantId,activeRole:'Asesor',country:'GT',collection:'finmovs'}),e=>e instanceof Denied&&e.code==='MODULE_DENIED','finance movement module remains denied without explicit entitlement');
 const claims=await list('reclamos');
 assert.deepEqual(claims.rows.map(x=>x.id),['claim1','claimClientOnly'],'claims verify policy and client-only canonical relations');
 assert.equal(claims.rows[0].asesorId,'a1');
 assert.ok(!observedQueries.includes('polizas'),'claims page scans reclamos directly and does not scan the policy universe');
 assert.equal((await read('reclamos','claimClientOnly')).row.asesorId,'a1','client-only claim gets canonical advisor');
 await assert.rejects(()=>read('reclamos','claimOther'),e=>e instanceof Denied&&e.code==='RECORD_NOT_FOUND_OR_DENIED','foreign advisor claim denied');
 await assert.rejects(()=>read('reclamos','claimCO'),e=>e instanceof Denied&&e.code==='RECORD_NOT_FOUND_OR_DENIED','cross-country claim denied');
 await assert.rejects(()=>read('reclamos','claimForeign'),e=>e instanceof Denied&&e.code==='RECORD_NOT_FOUND_OR_DENIED','cross-tenant claim denied');
 const coms=await list('comisiones');
 assert.deepEqual(coms.rows.map(x=>x.id),['com1','comClientOnly'],'commissions are restricted through canonical policy/client assignments');
 await assert.rejects(()=>read('comisiones','comOther'),e=>e instanceof Denied&&e.code==='RECORD_NOT_FOUND_OR_DENIED','foreign advisor commission denied');
 const tasks=await list('tareas');
 assert.deepEqual(tasks.rows.map(x=>x.id),['taskOwn','taskPolicy'],'tasks require own advisor or verified client/policy relation; team and orphan rows withheld');
 await assert.rejects(()=>read('tareas','taskTeam'),e=>e instanceof Denied&&e.code==='RECORD_NOT_FOUND_OR_DENIED','other advisor task denied for own-only scope');
 await assert.rejects(()=>read('tareas','taskCountry'),e=>e instanceof Denied&&e.code==='RECORD_NOT_FOUND_OR_DENIED','cross-country task denied');
 await assert.rejects(()=>read('tareas','taskUnscoped'),e=>e instanceof Denied&&e.code==='RECORD_NOT_FOUND_OR_DENIED','legacy unscoped task denied');
 const page1=await list('tareas','Asesor','GT',1);
 assert.deepEqual(page1.rows.map(x=>x.id),['taskOwn']);
 assert.equal(page1.nextCursor,'taskOwn','task pagination emits only an authorized cursor');
 const page2=await list('tareas','Asesor','GT',1,page1.nextCursor);
 assert.deepEqual(page2.rows.map(x=>x.id),['taskPolicy']);
 const finance=await list('finmovs','Finanzas','GT');
 assert.deepEqual(finance.rows.map(x=>x.id),['fmGT'],'finance movements require assigned finance scope and matching country');
 await assert.rejects(()=>read('finmovs','fmCO','Finanzas','GT'),e=>e instanceof Denied&&e.code==='RECORD_NOT_FOUND_OR_DENIED','cross-country finance movement denied');
 await assert.rejects(()=>read('finmovs','fmUnscoped','Finanzas','GT'),e=>e instanceof Denied&&e.code==='RECORD_NOT_FOUND_OR_DENIED','country-less finance movement denied');
 await assert.rejects(()=>read('finmovs','fmGT','Asesor','GT'),e=>e instanceof Denied&&e.code==='MODULE_DENIED','non-finance role denied finance movements');
 console.log('B4_003_FOUR_COLLECTION_SCOPED_READER_PASS synthetic_only no_data_writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
