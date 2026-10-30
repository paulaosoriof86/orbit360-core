'use strict';
// Execute the real diagnostic owner in a denied-by-default Firestore/Auth VM.
// No network, credentials, business writes or repository authority mutations.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const owner=path.resolve('tools/gravicentra-b4-003-integral-readonly-audit.cjs');
const source=fs.readFileSync(owner,'utf8');
const requestPath='artifacts/orbit360-recovery/release-control/I6_5_B4_003_INTEGRAL_AUDIT_REQUEST_20261016.json';
const baseRequest=JSON.parse(fs.readFileSync(requestPath,'utf8'));
const rootPath=(c,id)=>'data/'+c+'/items/'+id;
const secret='DO_NOT_EXPORT_PERSON_EMAIL_PHONE_OR_MESSAGE';
const rootIds=baseRequest.exactQaResidue.roots;
function fixtures(){
  const rows=new Map();
  for(const {collection,id} of rootIds)rows.set(rootPath(collection,id),{id,tenantId:'alianzas-soluciones',__syntheticQa:id.startsWith('b4003qa_'),ownerUid:secret,ownerEmail:secret,nombre:secret,telefono:secret,sourceType:secret,createdAt:'2026-10-12T21:23:30.000Z'});
  const orphans=['pol_mulsmxsk','pol_mulssmuz','pol_mulsxofx'];
  orphans.forEach((id,i)=>{
    const row=rows.get(rootPath('polizas',id));row.renuevaDe='b2-r9195-missing-parent-'+i;
    if(i===0)row.id='canonical_policy_alias';
    for(let j=0;j<2;j++){
      const field=j===0?'polizaId':'policyId',policy=i===0?row.id:id;
      rows.set(rootPath('recibosEsperados','opaque_receipt_'+i+'_'+j),{id:'opaque_receipt_'+i+'_'+j,[field]:policy,monto:700,moneda:'GTQ',estado:'Pendiente',email:secret});
      rows.set(rootPath('carteraPrimas','opaque_portfolio_'+i+'_'+j),{id:'opaque_portfolio_'+i+'_'+j,[field]:policy,reciboId:'opaque_receipt_'+i+'_'+j,monto:700,moneda:'GTQ',estado:'Pendiente',nombre:secret});
    }
  });
  const policy='b4003qa_policy_renewwrite_38102224750',receipt='cob_b4003qa_policy_renewwrite_38102224750_001';
  rows.set(rootPath('recibosEsperados',receipt),{id:receipt,policyId:policy,clienteId:'b4003qa_client_38102224750',monto:683.2,moneda:'GTQ',estado:'Pendiente'});
  const business='b4003qa_business_collab_38102224750';
  Object.assign(rows.get(rootPath('negocios',business)),{comentarios:[{texto:secret},{texto:secret},{texto:secret},{texto:secret}],bitacora:[{actor:secret}],clienteId:'b4003qa_client_38102224750',previewWrite:true});
  rows.set('previewWorkflowEvents/evt_fixture',{entityId:business,entityType:'negocios',requestId:'req_fixture',actor:{uid:secret,name:secret},reason:secret,operation:'update_business',createdAt:'2026-10-28T15:00:00.000Z'});
  rows.set('previewWorkflowRequests/req_fixture',{entityId:business,entityType:'negocios',eventId:'evt_fixture',status:'committed',result:{message:secret}});
  rows.set('previewNotificationOutbox/evt_fixture',{entityId:business,entityType:'negocios',eventId:'evt_fixture',status:'pending_provider',payload:{message:secret},targets:[{id:secret}]});
  rows.set(rootPath('polizas','unrelated_business_policy'),{id:'unrelated_business_policy',clienteId:'real_unrelated_client',nombre:secret});
  return rows;
}
async function run(options={}){
  const request=JSON.parse(JSON.stringify(baseRequest));if(options.changeRequest)options.changeRequest(request);
  const rows=fixtures();if(options.changeRows)options.changeRows(rows);
  const calls={auth:0,tokens:0,browser:0,rest:0,broad:0,mutations:0,memberships:0,admin:0,documents:[],queries:[],files:new Map()};
  let resolveFinished;const finished=new Promise(resolve=>{resolveFinished=resolve});
  const forbidden=name=>{calls[name]++;throw Error('MOCK_FORBIDDEN_'+name.toUpperCase())};
  const relative=p=>p.replace(/^tenants\/alianzas-soluciones\//,'');
  const snapshot=(p,data)=>({id:p.split('/').pop(),exists:data!==undefined,data:()=>data,readTime:new Date('2026-10-30T22:00:00Z'),updateTime:data?new Date('2026-10-28T15:00:00Z'):null});
  class Ref{
    constructor(p,filter=null,bound=null){this.path=p;this.filter=filter;this.bound=bound}
    collection(c){if(c==='members')return forbidden('memberships');return new Ref(this.path+'/'+c)}
    doc(id){return new Ref(this.path+'/'+id)}
    where(field,op,ids){assert.equal(op,'in');assert.ok(ids.length>0&&ids.length<=10);return new Ref(this.path,{field,ids},this.bound)}
    limit(n){assert.equal(n,101);return new Ref(this.path,this.filter,n)}
    async get(){
      const p=relative(this.path),pieces=p.split('/'),isDoc=(pieces[0]==='data'&&pieces.length===4)||(pieces[0]!=='data'&&pieces.length===2);
      if(isDoc){assert.equal(this.filter,null);calls.documents.push(p);return snapshot(p,rows.get(p))}
      if(!this.filter||this.bound!==101)return forbidden('broad');
      calls.queries.push({path:p,...this.filter,bound:this.bound});
      if(options.denyQuery&&options.denyQuery(p,this.filter))throw Object.assign(Error(secret),{code:'permission-denied'});
      const out=[...rows.entries()].filter(([key,data])=>key.startsWith(p+'/')&&key.split('/').length===pieces.length+1&&this.filter.ids.includes(data[this.filter.field])).slice(0,this.bound).map(([key,data])=>snapshot(key,data));
      return{docs:out,size:out.length};
    }
    set(){return forbidden('mutations')}
    update(){return forbidden('mutations')}
    delete(){return forbidden('mutations')}
  }
  const app={delete:async()=>resolveFinished()};
  const admin={credential:{applicationDefault:()=>({})},initializeApp:()=>{calls.admin++;return app},firestore:()=>({collection:n=>new Ref(n),batch:()=>forbidden('mutations'),runTransaction:()=>forbidden('mutations')}),auth:()=>forbidden('auth')};
  const fakeFs={...fs,readFileSync:(p,encoding)=>{
    if(String(p).endsWith('I6_5_B4_003_INTEGRAL_AUDIT_REQUEST_20261016.json')){const raw=JSON.stringify(request);return encoding?raw:Buffer.from(raw)}
    return fs.readFileSync(p,encoding);
  },mkdirSync:()=>{},copyFileSync:()=>{},writeFileSync:(p,data)=>calls.files.set(String(p),String(data))};
  const fakeProcess={env:{PROJECT_ID:'ays-orbit-360-lab',TENANT_HINT:'alianzas-soluciones',INTEGRAL_AUDIT_OUT:'/test-output'},exitCode:0};
  const context={require:name=>{
    if(name==='node:fs')return fakeFs;
    if(name==='node:child_process')return{execFileSync:(cmd,args)=>{assert.equal(cmd,'git');if(args[0]==='rev-parse'&&args[1]==='HEAD')return baseRequest.observedSourceHead+'\n';if(args[0]==='merge-base')return baseRequest.observedSourceHead+'\n';throw Error('MOCK_UNEXPECTED_GIT_'+args[0])}};
    if(name==='firebase-admin')return admin;
    if(name==='playwright')return forbidden('browser');
    if(['node:path','node:crypto'].includes(name))return require(name);
    throw Error('MOCK_UNEXPECTED_MODULE_'+name);
  },__filename:owner,process:fakeProcess,Buffer,console:{log:()=>{},error:()=>{}},fetch:()=>forbidden('rest'),Date,URL,AbortSignal};
  let syncError=null;
  try{vm.runInNewContext(source,context,{filename:owner})}catch(e){syncError=e;resolveFinished()}
  await finished;
  const output=calls.files.get('/test-output/integral-readonly.json');
  const evidence=output?JSON.parse(output):null;
  return{calls,evidence,output:output||'',syncError,exitCode:fakeProcess.exitCode};
}
function assertNoForbidden(result){for(const key of ['auth','tokens','browser','rest','broad','mutations','memberships'])assert.equal(result.calls[key],0,key+' must not be used');assert.ok(!result.output.includes(secret),'personal content must not be exported')}
(async()=>{
  let checks=0;
  const good=await run();assert.equal(good.syncError,null);assertNoForbidden(good);checks++;
  const proof=good.evidence.sections.exactQaResidue;
  assert.equal(good.evidence.status,'DECLARED_RELATIONS_READ_COMPLETE_DISPOSITION_HOLD');assert.equal(proof.roots.length,17);assert.ok(proof.roots.every(x=>x.readSucceeded&&x.exists));assert.equal(good.evidence.cleanupPermitted,false);assert.equal(good.evidence.findingsClosed,0);assert.equal(good.evidence.newProductAcceptance,false);checks++;
  const aliases=proof.edges.filter(x=>x.from==='data/polizas/items/pol_mulsmxsk'&&x.kind==='INBOUND_DEPENDENCY');assert.equal(aliases.filter(x=>/opaque_(receipt|portfolio)_0_/.test(x.to)).length,4);assert.ok(aliases.some(x=>x.field==='policyId'));assert.ok(aliases.some(x=>x.field==='polizaId'));checks++;
  assert.equal(proof.records.filter(x=>/^opaque_receipt_/.test(x.id)).length,6);assert.equal(proof.records.filter(x=>/^opaque_portfolio_/.test(x.id)).length,6);assert.equal(proof.records.filter(x=>x.origin==='REFERENCED_PARENT'&&!x.exists).length,3);checks++;
  assert.ok(proof.records.some(x=>x.id==='cob_b4003qa_policy_renewwrite_38102224750_001'));assert.ok(proof.records.some(x=>x.id==='evt_fixture'&&x.collection==='previewNotificationOutbox'));assert.equal(proof.records.find(x=>x.id==='b4003qa_business_collab_38102224750').commentsCount,4);assert.ok(!proof.records.some(x=>x.id==='unrelated_business_policy'));checks++;
  assert.equal(proof.declaredRelationCoverageComplete,true);assert.equal(proof.universalDependencyGraphComplete,false);assert.ok(good.calls.queries.length<=250);checks++;
  const denied=await run({denyQuery:(p,f)=>p==='data/carteraPrimas/items'&&f.field==='polizaId'});assertNoForbidden(denied);assert.equal(denied.evidence.status,'PARTIAL_RELATION_READ_HOLD');assert.ok(denied.evidence.sections.exactQaResidue.issues.some(x=>x.code==='FILTERED_RELATION_READ_FAILED'));checks++;
  const truncated=await run({changeRows:rows=>{for(let i=0;i<101;i++)rows.set(rootPath('recibosEsperados','extra_receipt_'+i),{id:'extra_receipt_'+i,polizaId:'pol_mulssmuz',monto:1})}});assertNoForbidden(truncated);assert.equal(truncated.evidence.status,'PARTIAL_RELATION_READ_HOLD');assert.ok(truncated.evidence.sections.exactQaResidue.issues.some(x=>x.code==='QUERY_RESULT_LIMIT_REACHED'));assert.ok(truncated.evidence.sections.exactQaResidue.records.length<=500);checks++;
  for(const changeRequest of [r=>{r.auditToolBlob='0'.repeat(40)},r=>{r.controlPlaneBlob='0'.repeat(40)},r=>{r.exactQaResidue.roots.push({collection:'clientes',id:'unapproved_client'})},r=>{r.mintUserTokens=true},r=>{r.executionScope='UNKNOWN_SCOPE'},r=>{r.executionScope=null},r=>{delete r.executionScope},r=>{r.exactQaResidue.tenantId='another-tenant'}]){
    const bad=await run({changeRequest});assert.ok(bad.syncError,'invalid request must fail before initialization');assert.equal(bad.calls.admin,0);assertNoForbidden(bad);checks++;
  }
  console.log('B4_003_EXACT_QA_RESIDUE_READONLY_TEST_PASS checks='+checks+' no_network no_auth no_business_writes');
})().catch(e=>{console.error(e);process.exitCode=1});
