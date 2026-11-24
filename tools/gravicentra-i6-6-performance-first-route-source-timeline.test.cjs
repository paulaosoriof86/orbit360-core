'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const repo=process.env.I66_PERF_TEST_REPO||path.resolve(__dirname,'..');
const current=fs.readFileSync(path.join(__dirname,'gravicentra-i66-live-performance-readonly.mjs'),'utf8');
const baseline=execFileSync('git',['show','da8ff965c8a104d8224017948745309fbf031faa'],{cwd:repo,encoding:'utf8'});
function callback(source){
  const prefix='const measurement=await page.evaluate(';
  const start=source.indexOf(prefix);assert.ok(start>0);
  const finish=source.indexOf('},{route,readySelector});',start);assert.ok(finish>start);
  return source.slice(start+prefix.length,finish+1);
}
async function measure(source,{financialAt=155,privateError=false,preloaded=false}={}){
  let now=0,nextId=0,done=false,value,failure,observer=null;
  const events=[],intervals=new Map(),docListeners=new Map(),windowListeners=new Map();
  const add=(time,fn)=>events.push({time,fn,order:nextId++});
  const listen=(map,type,fn)=>map.set(type,[...(map.get(type)||[]),fn]);
  const unlisten=(map,type,fn)=>map.set(type,(map.get(type)||[]).filter(x=>x!==fn));
  const emit=(map,type,detail)=>(map.get(type)||[]).forEach(fn=>fn({type,detail}));
  const status={serverConfirmedCollections:preloaded?
    ['clientes','polizas','cobros','recibosEsperados','carteraPrimas','aseguradoras']:['clientes','aseguradoras'],
    deniedCollections:[],snapshotErrors:{},queryPlans:{},optionalMissing:[]};
  let pageReady=false,coreReady=false,financialReady=false;
  const host={get innerText(){return 'Cobros';},get innerHTML(){return '<div class="page">synthetic</div>';},
    querySelector(selector){
      if(selector==='[data-cobros-core-ready="1"]')return coreReady?{getAttribute:()=>financialReady?'ready':'pending'}:null;
      if(selector==='[data-cobros-financial-readiness="ready"]')return financialReady?{}:null;
      if(selector==='.page')return pageReady?{}:null;
      if(selector==='[data-cobros-table], [data-cobros-kpi], .tbl')return coreReady?{}:null;
      return null;
    },querySelectorAll:()=>({length:coreReady?60:0})};
  const Orbit={route:{key:'polizas'},store:{_productStatus:()=>status}};
  const context=vm.createContext({Orbit,console,performance:{now:()=>now},
    document:{getElementById:()=>host,addEventListener:(t,f)=>listen(docListeners,t,f),removeEventListener:(t,f)=>unlisten(docListeners,t,f)},
    MutationObserver:class{constructor(cb){observer=cb;}observe(){}disconnect(){observer=null;}},
    setInterval(fn,delay){const id=++nextId;intervals.set(id,true);
      const tick=()=>{if(!intervals.get(id))return;fn();if(intervals.get(id))add(now+delay,tick);};
      add(now+delay,tick);return id;},clearInterval:id=>intervals.delete(id),
    window:{addEventListener:(t,f)=>listen(windowListeners,t,f),removeEventListener:(t,f)=>unlisten(windowListeners,t,f),
      __GI_I66_RENDER_STATS__:{cobros:{calls:4,totalMs:20,maxMs:5}},__GI_I66_STORE_READ_STATS__:{}},
    location:{set hash(_value){
      add(5,()=>{Orbit.route.key='cobros';pageReady=true;emit(docListeners,'orbit:route-ready',{route:'cobros'});observer?.();});
      for(const [at,collection] of [[10,'polizas'],[35,'cobros'],[70,'recibosEsperados'],[120,'carteraPrimas']])
        add(at,()=>{if(!status.serverConfirmedCollections.includes(collection))status.serverConfirmedCollections.push(collection);
          status.queryPlans[collection]={ok:true,errors:[]};emit(windowListeners,'orbit:store:emit',{collection});});
      add(40,()=>{coreReady=true;emit(docListeners,'orbit:route-ready',{route:'cobros'});observer?.();});
      add(60,()=>{
        for(const collection of ['estadosCuentaAseguradora','recibosAseguradora','reclamos']){
          status.snapshotErrors[collection]=privateError?'private@example.invalid untrusted data':'PROTECTED_READ_PLAN_DENIED';
          status.queryPlans[collection]={ok:false,hardError:true,errors:[collection==='reclamos'?'modulo_no_visible':'politica_no_autoriza_consulta',
            ...(privateError?['private@example.invalid']:[])]};
          emit(windowListeners,'orbit:store:emit',{collection});
        }
      });
      add(financialAt,()=>{financialReady=true;emit(docListeners,'orbit:route-ready',{route:'cobros'});observer?.();});
      add(financialAt+5,()=>{emit(docListeners,'orbit:route-ready',{route:'cobros'});observer?.();});
    }} });
  vm.runInContext('('+callback(source)+')({route:"cobros",readySelector:"[data-cobros-table], [data-cobros-kpi], .tbl"})',context)
    .then(x=>{value=x;done=true;},e=>{failure=e;done=true;});
  for(let i=0;i<1000&&!done;i++){
    for(let n=0;n<8;n++)await Promise.resolve();
    if(done)break;
    events.sort((a,b)=>a.time-b.time||a.order-b.order);
    const event=events.shift();assert.ok(event,'MEASUREMENT_DID_NOT_SETTLE');now=event.time;event.fn();
  }
  if(failure)throw failure;assert.equal(done,true);
  return{value:JSON.parse(JSON.stringify(value)),status,now,remainingStoreListeners:(windowListeners.get('orbit:store:emit')||[]).length};
}
test('actual previous callback overwrites route timing; fixed callback retains first route and reports final rerender separately',async()=>{
  const old=await measure(baseline),next=await measure(current);
  assert.equal(old.value.routeMs,160);assert.equal(next.value.routeMs,5);
  assert.equal(next.value.lastRouteRenderMs,160);
  assert.equal(old.value.cobrosFinancialReadyMs,155);
  assert.equal(next.value.cobrosFinancialReadyMs,old.value.cobrosFinancialReadyMs);
  assert.equal(next.value.cobrosCoreReadyMs,40);
});
test('financial readiness is the first DOM observation, independent of slow polling and the ten-second route cutoff',async()=>{
  for(const at of [155,9805,14699]){
    const old=await measure(baseline,{financialAt:at}),next=await measure(current,{financialAt:at});
    assert.equal(next.value.cobrosFinancialReadyMs,at);assert.equal(old.value.cobrosFinancialReadyMs,at);
    assert.equal(next.value.cobrosFinancialReady,true);
  }
});
test('source confirmations and three real plan errors remain separate from the financial DOM mark',async()=>{
  const {value,status,remainingStoreListeners}=await measure(current);
  assert.equal(value.cobrosSourcesConfirmedMs,120);assert.equal(value.cobrosFinancialDomAfterSourcesMs,35);
  assert.equal(value.snapshotErrorCount,3);assert.deepEqual(value.snapshotErrorSources,
    ['estadosCuentaAseguradora','recibosAseguradora','reclamos']);
  for(const collection of value.snapshotErrorSources){
    const entry=value.sourceTimeline.find(x=>x.collection===collection&&x.state==='failed');
    assert.equal(entry.errorCode,'PROTECTED_READ_PLAN_DENIED');assert.equal(entry.queryPlan.hardError,true);
    assert.ok(entry.queryPlan.errors.includes(collection==='reclamos'?'modulo_no_visible':'politica_no_autoriza_consulta'));
    assert.equal(status.snapshotErrors[collection],'PROTECTED_READ_PLAN_DENIED');
  }
  assert.equal(remainingStoreListeners,0);assert.ok(value.diagnosticStatusReads>0&&value.diagnosticStatusReads<15);
});
test('preloaded snapshots are explicitly initial, never presented as newly completed requests; timeline contains no row or error content',async()=>{
  const {value}=await measure(current,{preloaded:true,privateError:true});
  assert.equal(value.cobrosSourcesConfirmedMs,0);
  assert.ok(value.sourceTimeline.find(x=>x.collection==='carteraPrimas'&&x.state==='confirmed'&&x.initial));
  assert.ok(value.sourceTimeline.some(x=>x.errorCode==='UNCLASSIFIED_ERROR'));
  assert.doesNotMatch(JSON.stringify(value),/private@|untrusted data|token|password|clienteId|policyId/);
  assert.ok(value.sourceTimeline.length<=90);
});
test('measurement still excludes Cobros CPU profiling and has no polling speedup or business request/write',()=>{
  assert.match(current,/withCpuProfile=\['polizas','aseguradoras','renovaciones','inicio'\]/);
  const source=callback(current);
  assert.match(source,/cobrosFinancialReadyMs===null/);assert.match(source,/\},150\)/);
  for(const pattern of [/protectedReadPage\s*\(/,/callFunction\s*\(/,/\.insertDurable\s*\(/,
    /\.updateDurable\s*\(/,/\.setCustomUserClaims\s*\(/,/\.updateUser\s*\(/])assert.doesNotMatch(source,pattern);
});
