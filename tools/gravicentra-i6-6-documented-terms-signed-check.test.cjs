'use strict';
// Unit tests for the signed driver's safety/proof contract. The browser and
// database transport below are in-memory doubles, not evidence of live QA.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const H=require('./gravicentra-i6-6-documented-terms-signed-check.cjs');
const source='1'.repeat(40),origin='https://ays-orbit-360-lab--gi-i66-rc-1234-abc123.web.app',buildId='gi-i66-'+source.slice(0,12)+'-123456789abc';
const clientId='b4003qa_i66_cxp_synthetic_test_client',actorUid='qa_actor',tenantId='alianzas-soluciones';
const base={role:'Dirección',actorUid,tenantId,live:false,clientId},clone=x=>JSON.parse(JSON.stringify(x));
const cfg=()=>H.contextIdentity(base,origin,source);
for(const change of [{role:'Operativo'},{actorUid:''},{tenantId:'other'},{live:'false'},{clientId:'real_client'},{clientId:clientId+'\n'}])test('context rejects unapproved or ambiguous identity '+JSON.stringify(change),()=>assert.throws(()=>H.contextIdentity({...base,...change},origin,source),/I66_DOCUMENTED_TERMS_/));
for(const badOrigin of [origin+'/',origin+'?x=1',origin+'\n','http://app.aysseguros.com','https://app.aysseguros.com'])test('Preview rejects origin drift '+JSON.stringify(badOrigin),()=>assert.throws(()=>H.contextIdentity(base,badOrigin,source),/ORIGIN/));
test('LIVE retains its exact existing endpoint, not the Preview endpoint',()=>{const c=H.contextIdentity({...base,live:true},'https://app.aysseguros.com',source);assert.equal(c.functionName,'orbit360ProductOperationalCommand');assert.equal(c.region,'us-central1');});
test('synthetic client must have exact id, tenant, country, run marker and provenance',()=>{
  const row={id:clientId,tenantId,pais:'GT',__syntheticQa:true,__qaRunId:clientId.slice(0,-7)};H.clientProof(row,cfg());
  for(const patch of [{id:'real_client'},{tenantId:'other'},{pais:'CO'},{__syntheticQa:false},{__qaRunId:'b4003qa_i66_cxp_other'}])assert.throws(()=>H.clientProof({...row,...patch},cfg()),/CLIENT_NOT_OWNED_QA/);
});
test('nonce and generated request/audit identities remain exact and bounded',()=>{
  const id=H.fixtureIdentity('a'.repeat(24));assert.match(id.policyId,/^b4003qa_i66_documented_/);assert.equal(id.eventId,'opevt_'+H.hash(tenantId+'|'+id.requestId).slice(0,28));
  for(const value of ['a'.repeat(24)+'\n','a'.repeat(25),'real',''])assert.throws(()=>H.fixtureIdentity(value),/NONCE/);
});
function setup(options={}){
  const rows=new Map(),deletes=[],calls=[],fields={'payment-form':'',conduct:''};let modal=false,time=0;
  const client={id:clientId,tenantId,pais:'GT',moneda:'GTQ',nombre:'QA synthetic',__syntheticQa:true,__qaRunId:clientId.slice(0,-7),asesorId:'b4003qa_i66_cxp_synthetic_test_advisor',...options.clientPatch};
  const basePath='tenants/'+tenantId,clientPath=basePath+'/data/clientes/items/'+clientId;rows.set(clientPath,clone(client));
  function ref(p){return{path:p,collection(n){return ref(p+'/'+n);},doc(n){return ref(p+'/'+n);},async get(){const row=rows.get(p);return{exists:!!row,data:()=>row?clone(row):undefined,updateTime:'t-'+time};},async delete(precondition){assert.equal(precondition.lastUpdateTime,'t-'+time);if(options.deleteFailure)throw Error('synthetic failure');deletes.push(p);rows.delete(p);}};}
  const db={collection:n=>ref(n)};
  const document={querySelector(selector){if(selector==='[data-legal-gate]')return options.gate?{}:null;if(selector==='#policy-v1199')return modal?{}:null;return null;}};
  const store={get(collection,id){return rows.get(basePath+'/data/'+collection+'/items/'+id)||null;},all(){return[];},where(){return[];},async _ensureCollections(){}};
  const Orbit={store,paisCfg:()=>({iva:12,gastosEmision:0,recargoFinanciero:0}),ui:{today:()=> '2026-11-17'},auth:{productUser:{uid:actorUid}},session:{rol:()=> 'Dirección'},
    access:{tenantId:()=>tenantId,activeRole:()=> 'Dirección',actorUser:()=>({id:actorUid,nombre:'QA actor'}),currencyFor:()=> 'GTQ'},modules:{cliente360:{nuevaPoliza(id){assert.equal(id,clientId);modal=true;}}},
    productRuntimeBrowserProvidersP0:{async initialize(){return{auth:{currentUser:{uid:options.uid||actorUid}}};},isI66PreviewHost:()=>!options.live,
      async callFunction(name,data,region){
        calls.push({name,data:clone(data),region});
        assert.equal(name,options.live?'orbit360ProductOperationalCommand':'orbit360ProductOperationalCommandPreview');assert.equal(region,options.live?'us-central1':'us-east1');
        if(options.denied)throw Error('permission-denied');
        const eventId='opevt_'+H.hash(tenantId+'|'+data.requestId).slice(0,28),payloadDigest=H.hash(data.mutations),collections=['polizas','recibosEsperados'];
        for(const m of data.mutations){assert.match(m.id,/^b4003qa_/);assert.equal(m.payload.__syntheticQa,true);assert.equal(m.action,'insert');assert.ok(collections.includes(m.collection));
          const value={...clone(m.payload),createdByUid:actorUid,updatedByUid:actorUid};if(options.persistedPatch)Object.assign(value,options.persistedPatch);rows.set(basePath+'/data/'+m.collection+'/items/'+m.id,value);}
        const result={ok:true,serverOwned:true,requestId:data.requestId,eventId,mutationCount:2,collections};
        rows.set(basePath+'/operationalRequests/'+data.requestId,{status:'committed',payloadDigest,result});
        rows.set(basePath+'/operationalEvents/'+eventId,{tenantId,actorUid,activeRole:'direccion',requestId:data.requestId,eventId,payloadDigest,mutationCount:2,collections,...options.eventPatch});
        if(options.endUid)Orbit.auth.productUser.uid=options.endUid;
        if(options.transportAfterCommit)throw Error('Transport failed after commit');
        return{...result,canonicalReadback:!options.missingProof,canonicalReadbackCount:2};
      }}
  };
  const context=vm.createContext({Orbit,document,Date,console,fetch:async()=>({ok:true,json:async()=>({sourceSha:source,buildId,gate:'I6.6',product:'Gravicentra Insurance',...options.markerPatch})})});context.window=context;
  for(const p of ['core/primas.js','core/policy-receipts-engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../orbit360-platform',p),'utf8'),context);
  const form={async waitFor({state}){assert.equal(modal,state==='visible');},locator(selector){const m=selector.match(/^\[data-([^\]]+)\]$/);assert.ok(m);const key=m[1];return{async inputValue(){return key==='client'?clientId:(fields[key]||'');},async fill(value){fields[key]=value;},async selectOption(value){fields[key]=value;}};},
    getByRole(role,spec){assert.equal(role,'button');assert.equal(spec.name,'Cancelar');assert.equal(spec.exact,true);return{async click(){modal=false;}};},
    async evaluate(fn){const node={querySelector(selector){if(selector==='[data-preview]')return{textContent:options.badUi?'976.08':'978.78 2026-11-06'};const key=selector.match(/^\[data-([^\]]+)\]$/)[1];return{value:fields[key]||''};}};return fn(node);}};
  const page={url:()=> (options.live?'https://app.aysseguros.com':origin)+'/#/inicio',locator(selector){assert.equal(selector,'#policy-v1199');return form;},async evaluate(fn,arg){context.__arg=arg;return vm.runInContext('('+fn.toString()+')(__arg)',context);},async waitForFunction(fn,arg){assert.equal(await this.evaluate(fn,arg),true);}};
  return{page,db,rows,calls,deletes,clientPath,client,context,fields};
}
async function run(options={}){
  const env={I66_PREVIEW_ORIGIN:process.env.I66_PREVIEW_ORIGIN,I66_SOURCE_SHA:process.env.I66_SOURCE_SHA,I66_EXPECTED_BUILD_ID:process.env.I66_EXPECTED_BUILD_ID};
  process.env.I66_PREVIEW_ORIGIN=options.live?'https://app.aysseguros.com':origin;process.env.I66_SOURCE_SHA=source;process.env.I66_EXPECTED_BUILD_ID=buildId;
  const h=setup(options);try{h.proof=await H.runDocumentedTermsCheck({...base,page:h.page,db:h.db,live:!!options.live});}catch(error){h.error=error;h.proof=error.documentedTermsProof;}finally{for(const[k,v]of Object.entries(env))if(v===undefined)delete process.env[k];else process.env[k]=v;}
  return h;
}
for(const live of [false,true])test('same helper uses signed '+(live?'LIVE':'Preview')+' writer and restores exactly two records plus request/event',async()=>{
  const h=await run({live});assert.equal(h.error,undefined);assert.equal(h.proof.status,'PASS');assert.equal(h.proof.ui,'PASS');assert.equal(h.proof.durableReadbackCount,2);assert.equal(h.proof.reloadPerformed,false);assert.equal(h.proof.sessionPreserved,true);assert.equal(h.proof.modalCancelled,true);assert.deepEqual(h.proof.cleanup,{status:'PASS',remaining:0});assert.equal(h.calls.length,1);assert.equal(h.deletes.length,4);assert.equal(h.rows.size,1);assert.deepEqual(h.rows.get(h.clientPath),h.client);
});
for(const options of [{gate:true},{uid:'wrong_actor'},{markerPatch:{sourceSha:'2'.repeat(40)}},{markerPatch:{buildId:buildId+'\n'}},{markerPatch:{gate:'I6.5'}},{clientPatch:{__syntheticQa:false}}])test('no writes on scope/session/legal/source failure '+JSON.stringify(options),async()=>{
  const h=await run(options);assert.ok(h.error);assert.equal(h.calls.length,0);assert.equal(h.deletes.length,0);assert.equal(h.rows.size,1);
});
test('UI errors cannot be substituted with a valid calculator or writer result',async()=>{const h=await run({badUi:true});assert.ok(h.error);assert.equal(h.proof.ui,'NOT_RUN');assert.equal(h.calls.length,0);assert.equal(h.proof.modalCancelled,true);});
test('server permission denial stays HOLD without alternate writer or fabricated readback',async()=>{const h=await run({denied:true});assert.ok(h.error);assert.equal(h.calls.length,1);assert.equal(h.deletes.length,0);assert.equal(h.proof.durableReadbackCount,0);assert.equal(h.proof.status,'HOLD');});
for(const options of [{missingProof:true},{transportAfterCommit:true},{endUid:'different_actor'}])test('failure after actual simulated commit preserves HOLD but restores owned exact records '+JSON.stringify(options),async()=>{const h=await run(options);assert.ok(h.error);assert.equal(h.proof.status,'HOLD');assert.equal(h.deletes.length,4);assert.equal(h.rows.size,1);assert.equal(h.proof.cleanup.status,'PASS');});
for(const patch of [{cargoNoGravadoMonto:2.71},{createdByUid:'other_actor'},{__qaRunId:'foreign_run'},{primaTotal:976.08},{unexpectedFinancialField:100}])test('changed or foreign record is never deleted by cleanup '+JSON.stringify(patch),async()=>{
  const h=await run({persistedPatch:patch});assert.ok(h.error);assert.equal(h.proof.cleanup.status,'HOLD');assert.ok(h.rows.size>1);assert.equal(h.deletes.filter(p=>p.includes('/data/')).length,0);
});
test('foreign audit actor cannot be removed',async()=>{const h=await run({eventPatch:{actorUid:'other_actor'}});assert.ok(h.error);assert.equal(h.proof.cleanup.status,'HOLD');assert.equal(h.deletes.filter(p=>p.includes('/operational')).length,0);});
test('failed cleanup never reports PASS even if UI and durable write succeeded',async()=>{const h=await run({deleteFailure:true});assert.ok(h.error);assert.equal(h.proof.ui,'PASS');assert.equal(h.proof.durableReadbackCount,2);assert.equal(h.proof.cleanup.remaining,4);assert.equal(h.proof.status,'HOLD');});
test('calculation validator rejects extra fee, altered IVA/amount and invented payment values',async()=>{
  const h=await run();const mutations=h.calls[0].data.mutations,ids={runId:mutations[0].payload.__qaRunId,policyId:mutations[0].id,receiptId:mutations[1].id},c=cfg(),value={policy:mutations[0].payload,receipt:mutations[1].payload};
  H.validateCalculation(value,ids,c);
  for(const [record,field,wrong]of [['policy','cargoNoGravadoMonto',3],['receipt','cargoNoGravadoDocumentRef',''],['receipt','iva',104.9],['policy','formaPago','Tarjeta de crédito'],['receipt','conducto','CAT'],['receipt','pagado',978.78]]){const altered=clone(value);altered[record][field]=wrong;assert.throws(()=>H.validateCalculation(altered,ids,c),/I66_DOCUMENTED_TERMS_/);}
});
test('sanitized proof does not disclose actor/client IDs, payload, errors or a claimed reload',async()=>{
  const h=await run({denied:true}),serialized=JSON.stringify(h.proof);assert.ok(!serialized.includes(actorUid));assert.ok(!serialized.includes(clientId));assert.ok(!serialized.includes('permission-denied'));assert.equal(h.proof.reloadPerformed,false);assert.equal(h.proof.financialPayments,0);assert.equal(h.proof.realCustomerWrites,0);
});
