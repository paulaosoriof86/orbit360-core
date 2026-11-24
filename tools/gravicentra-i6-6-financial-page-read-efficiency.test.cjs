'use strict';
// Isolated A14 source experiment. Runs the unmodified accepted owner and the
// candidate against synthetic Firestore snapshots; no network or data writes.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const Module=require('node:module');
const baselineRoot=path.resolve(__dirname,'../../baseline');
const candidateRoot=path.resolve(__dirname,'..');
const next=require(path.join(candidateRoot,'functions/b4-003-scoped-related-reader'));
const tenantId='a14-synthetic',uid='a14-synthetic-reader';
const clone=x=>structuredClone(x);
const pad=i=>String(i).padStart(5,'0');
const blob=content=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(content)+'\0').update(content).digest('hex');
const readerPath='functions/b4-003-scoped-related-reader.js';
const isolatedBaseline=path.join(baselineRoot,readerPath);
// CI has complete canonical Git history. The isolated review workspace has a
// separately downloaded copy, accepted only with the same immutable blob.
const oldBytes=fs.existsSync(isolatedBaseline)?fs.readFileSync(isolatedBaseline):
 execFileSync('git',['show','65c825b2808a615ca4195bdde6689dbdbe3193b2:'+readerPath],{cwd:candidateRoot});
assert.equal(blob(oldBytes),'aafdbe3384506b1772c7e409d565de88bf287b21','accepted E3/current reader must stay exact');
const oldModule=new Module(path.join(candidateRoot,readerPath),module);
oldModule.filename=path.join(candidateRoot,readerPath);
oldModule.paths=Module._nodeModulePaths(path.dirname(oldModule.filename));
oldModule._compile(oldBytes.toString(),oldModule.filename);
const old=oldModule.exports;
const measurements=[];

function fixture(count=442,options={}){
 const table=options.collection||'recibosEsperados';
 const rows={polizas:{},clientes:{},[table]:{}};
 for(let i=0;i<count;i++){
  const id='event-'+pad(i),pid='policy-'+pad(i),cid='client-'+pad(i);
  rows.clientes[cid]={id:cid,tenantId,pais:'GT',asesorId:'own-advisor'};
  rows.polizas[pid]={id:pid,tenantId,pais:'GT',asesorId:'own-advisor',clienteId:cid};
  rows[table][id]={id,tenantId,polizaId:pid,clienteId:cid,moneda:'GTQ',
   primaTotal:(i%17)*1.23,numeroRecibo:'folio-'+pad(i),estadoOperativo:'futuro_pendiente',
   fechaInicioPeriodo:'2026-11-02',fechaVencimientoContractual:'2026-11-02',
   saldo:i===0?0:undefined,metadata:{synthetic:true,ordinal:i}};
 }
 const state={member:{uid,tenantId,status:'active',roles:['Operativo','Asesor','Finanzas'],
  advisorId:'own-advisor',countries:['GT','CO'],dataScopes:{default:'all'}},
  config:{roleScopes:{Operativo:'all',Asesor:'own',Finanzas:'all'}}};
 const counters={queries:[],documentReads:[],parentBatches:[],membershipReads:0,configReads:0,writes:0};
 function snapshot(table,id){const record=rows[table]?.[id];return {id,exists:record!==undefined,data:()=>clone(record),ref:{path:`tenants/${tenantId}/data/${table}/items/${id}`}};}
 function query(table,terms=[],after='',limit=Infinity){
  return {
   doc(id){return {path:`tenants/${tenantId}/data/${table}/items/${id}`,__table:table,__id:id,
    async get(){counters.documentReads.push({table,id});return snapshot(table,id);}};},
   where(field,op,value){return query(table,terms.concat({field,op,value}),after,limit);},
   orderBy(field){assert.equal(field,'__name__');return query(table,terms,after,limit);},
   startAfter(doc){return query(table,terms,doc.id,limit);},
   limit(n){assert.ok(Number.isInteger(n)&&n>0);return query(table,terms,after,n);},
   async get(){
    const docs=Object.keys(rows[table]||{}).sort().filter(id=>id>after).filter(id=>terms.every(t=>t.op==='=='?rows[table][id][t.field]===t.value:t.op==='in'&&t.value.includes(rows[table][id][t.field]))).slice(0,limit).map(id=>snapshot(table,id));
    counters.queries.push({table,limit,after,returned:docs.length});return {docs};
   }
  };
 }
 const tenant={collection(name){
  if(name==='members')return {doc(id){assert.equal(id,uid);return {async get(){counters.membershipReads++;return {exists:true,data:()=>clone(state.member)};}};}};
  if(name==='config')return {doc(id){assert.equal(id,'access');return {async get(){counters.configReads++;return {exists:true,data:()=>clone(state.config)};}};}};
  assert.equal(name,'data');return {doc(table){return {collection(items){assert.equal(items,'items');return query(table);}};}};
 }};
 const db={collection(name){assert.equal(name,'tenants');return {doc(id){assert.equal(id,tenantId);return tenant;}};},
  async getAll(...refs){counters.parentBatches.push(refs.map(r=>({table:r.__table,id:r.__id})));return refs.map(r=>snapshot(r.__table,r.__id));},
  batch(){counters.writes++;throw Error('WRITE_FORBIDDEN');},runTransaction(){counters.writes++;throw Error('WRITE_FORBIDDEN');}};
 if(options.noGetAll)delete db.getAll;
 const auth={uid,token:{}};
 const request={tenantId,collection:table,country:'GT',activeRole:table==='conciliacionesPrimas'?'Finanzas':'Operativo',pageSize:200};
 return {table,rows,state,counters,db,auth,request,read:(owner,extra={})=>owner.readScopedRelatedList({db,auth,request:{...request,...extra}})};
}
async function complete(owner,f){
 const pages=[];let cursor='';
 do {const result=await f.read(owner,{cursor});pages.push(result);cursor=result.nextCursor;}while(cursor);
 return pages;
}
function stats(f){return {httpPages:f.counters.membershipReads,configReads:f.counters.configReads,
 rawQueries:f.counters.queries.length,rawRows:f.counters.queries.reduce((n,q)=>n+q.returned,0),
 parentBatchCalls:f.counters.parentBatches.length,parentBatchDocuments:f.counters.parentBatches.reduce((n,b)=>n+b.length,0),
 individualDocumentReads:f.counters.documentReads.length,writes:f.counters.writes};}
function equalData(a,b){assert.deepEqual(a,b,'complete financial and identity payload, order, scope and cursor remain exact');}

for(const collection of ['recibosEsperados','carteraPrimas','cobros','vehiculos','conciliacionesPrimas']){
 test(collection+': 442 authorized rows retain exact payload and three HTTP pages with fewer raw queries',async()=>{
  const before=fixture(442,{collection}),after=fixture(442,{collection}),saved=clone(after.rows);
  const a=await complete(old,before),b=await complete(next,after);equalData(a,b);
  assert.deepEqual(b.map(p=>p.rows.length),[200,200,42]);
  assert.equal(new Set(b.flatMap(p=>p.rows.map(r=>r.canonicalDocumentId))).size,442);
  assert.deepEqual(before.counters.queries.map(q=>q.limit),[100,100,100,100,100,100,100]);
  assert.deepEqual(after.counters.queries.map(q=>q.limit),[201,201,201]);
  assert.equal(stats(before).rawQueries,7);assert.equal(stats(after).rawQueries,3);
  assert.equal(stats(before).parentBatchCalls,14);assert.equal(stats(after).parentBatchCalls,6);
  assert.equal(after.counters.membershipReads,3);assert.equal(after.counters.configReads,3);
  assert.equal(after.counters.writes,0);assert.deepEqual(after.rows,saved);
  measurements.push({collection,rows:442,before:stats(before),after:stats(after)});
 });
}

test('mixed authorized, conflicting, orphan and foreign rows retain exact server projection for every role/country',async()=>{
 for(const role of ['Operativo','Asesor'])for(const country of ['GT','CO']){
  const fixtures=[fixture(509),fixture(509)];
  for(const f of fixtures)for(let i=0;i<509;i++){
   const r=f.rows[f.table]['event-'+pad(i)],p=f.rows.polizas[r.polizaId],c=f.rows.clientes[r.clienteId];
   if(i%9===0)r.tenantId='foreign';
   if(i%9===1)delete f.rows.polizas[r.polizaId];
   if(i%9===2)r.clienteId='conflicting-client';
   if(i%9===3){p.pais='CO';c.pais='GT';}
   if(i%9===4)p.asesorId=c.asesorId='foreign-advisor';
   if(i%9===5){delete r.polizaId;r.country=r.pais='CO';}
   if(i%9===6){delete f.rows.clientes[r.clienteId];}
   if(i%9===7){r.asesorId='old-advisor';r.pais='CO';}
  }
  for(const f of fixtures)Object.assign(f.request,{activeRole:role,country});
  equalData(await complete(old,fixtures[0]),await complete(next,fixtures[1]));
  assert.equal(fixtures[1].counters.writes,0);
 }
});

test('small requested pages keep the accepted 100-row raw bound and unchanged cursor',async()=>{
 for(const pageSize of [1,20,50,99]){
  const a=fixture(450),b=fixture(450);
  equalData(await a.read(old,{pageSize}),await b.read(next,{pageSize}));
  assert.equal(b.counters.queries[0].limit,100);
 }
});

test('lookahead completed exactly at row 3000 is retained even if row 3001 exists',async()=>{
 const fixtures=[fixture(3001),fixture(3001)];
 for(const f of fixtures)for(let i=0;i<2799;i++)f.rows[f.table]['event-'+pad(i)].tenantId='foreign';
 const a=await fixtures[0].read(old),b=await fixtures[1].read(next);equalData(a,b);
 assert.equal(b.rows.length,200);assert.equal(b.nextCursor,'event-02998');
 assert.equal(fixtures[1].counters.queries.reduce((n,q)=>n+q.returned,0),3000);
});

test('exact empty scan boundary distinguishes EOF from the existing bound error',async()=>{
 for(const size of [3000,3001]){
  const fixtures=[fixture(size),fixture(size)];
  for(const f of fixtures)for(const row of Object.values(f.rows[f.table]))row.tenantId='foreign';
  if(size===3000){equalData(await fixtures[0].read(old),await fixtures[1].read(next));assert.equal((await fixtures[1].read(next)).rows.length,0);}
  else for(const [owner,f] of [[old,fixtures[0]],[next,fixtures[1]]])await assert.rejects(()=>f.read(owner),e=>e.code==='FINANCIAL_SCAN_BOUND_EXCEEDED');
 }
});

test('fresh membership, explicit module restrictions, country and cursor checks remain independent every page',async()=>{
 const cases=[
  ['inactive',f=>{f.state.member.status='inactive';},{},'MEMBERSHIP_DENIED'],
  ['unassigned role',f=>{f.state.member.roles=['Asesor'];},{},'ROLE_DENIED'],
  ['explicit module restriction',f=>{f.state.member.modulesRestricted=['cobros'];},{},'MODULE_DENIED'],
  ['explicit role deny',f=>{f.state.config.rolePermissions={Operativo:{cobros:{ver:false}}};},{},'MODULE_DENIED'],
  ['scope none',f=>{f.state.member.dataScopes.modules={cobros:'none'};},{},'SCOPE_NONE'],
  ['country',f=>{f.state.member.countries=['CO'];},{},'COUNTRY_DENIED'],
  ['cursor missing',()=>{},{cursor:'missing'},'CURSOR_DENIED'],
  ['cursor foreign',f=>{f.rows[f.table]['event-00001'].tenantId='foreign';},{cursor:'event-00001'},'CURSOR_DENIED']
 ];
 for(const [label,mutate,request,code] of cases)for(const owner of [old,next]){
  const f=fixture();const first=await f.read(owner);assert.equal(first.rows.length,200);
  mutate(f);await assert.rejects(()=>f.read(owner,{cursor:first.nextCursor,...request}),e=>e.code===code,label);
  assert.equal(f.counters.membershipReads,2);assert.equal(f.counters.configReads,2);assert.equal(f.counters.writes,0);
 }
});

test('server still refreshes canonical parents after the page boundary, including cursor authorization',async()=>{
 for(const owner of [old,next]){
  const f=fixture();const first=await f.read(owner,{activeRole:'Asesor'});
  f.rows.polizas['policy-00199'].asesorId='foreign-advisor';
  await assert.rejects(()=>f.read(owner,{activeRole:'Asesor',cursor:first.nextCursor}),e=>e.code==='CURSOR_DENIED');
  assert.equal(f.counters.membershipReads,2);assert.equal(f.counters.writes,0);
 }
});

test('missing and malformed parent-batch responses fail closed; fallback verifies every parent',async()=>{
 for(const owner of [old,next]){
  const f=fixture();f.db.getAll=async()=>[];
  await assert.rejects(()=>f.read(owner),e=>e.code==='PARENT_BATCH_READBACK_INVALID');
 }
 const a=fixture(218,{noGetAll:true}),b=fixture(218,{noGetAll:true});
 equalData(await complete(old,a),await complete(next,b));
 assert.ok(b.counters.documentReads.length>=218*2);assert.equal(b.counters.writes,0);
});

test('record the source-only measurements without converting them into a live latency claim',()=>{
 assert.equal(measurements.length,5);
 const report={schema:'GI_I66_A14_FINANCIAL_PAGING_EXPERIMENT_V1',synthetic:true,liveAcceptance:false,
  productWrites:0,baselineReaderBlob:blob(oldBytes),candidateReaderBlob:blob(fs.readFileSync(path.join(candidateRoot,'functions/b4-003-scoped-related-reader.js'))),
  measurements,limitation:'RPC request counts are measured with actual owners. The live 11581ms source delay has no per-request timing evidence; no live speedup is claimed.'};
 if(process.env.A14_PROBE_OUTPUT)fs.writeFileSync(process.env.A14_PROBE_OUTPUT,JSON.stringify(report,null,2)+'\n');
 console.log('A14_PAGING_SOURCE_PROOF '+JSON.stringify({rows:442,httpPages:3,rawQueries:[7,3],parentBatchCalls:[14,6],writes:0,liveAcceptance:false}));
});
