'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const vm=require('node:vm');
const {TextEncoder}=require('node:util');
const g=require('./gravicentra-i6-6-startup-readiness-diagnostics.cjs');
const ORIGIN='https://preview.example.test',SOURCE='a'.repeat(40),BUILD='gi-i66-'+SOURCE.slice(0,12)+'-'+'b'.repeat(12);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function documentFixture(overrides={}){
  return{status:'CAPTURED',providerPresent:true,appPresent:true,orbitPresent:true,readyState:'complete',visibilityState:'visible',
    originClass:'EXPECTED_ORIGIN',pathClass:'ROOT',routeClass:'FINANZAS',
    dom:{scriptCount:135,externalScriptCount:134,inlineScriptCount:1,stylesheetLinkCount:5,inlineStyleCount:0,stylesheetCount:5,fontStatus:'loaded',scriptPathsTail:[],stylesheetPathsTail:[]},
    serviceWorker:{supported:true,controllerPresent:true,controllerState:'activated',controllerPathSha256:hash('/sw.js'),controllerBuildMatches:true},
    pwa:{workerState:'controlled',workerControlled:true,workerBuildMatches:true,freshnessState:'current',serverBuildMatches:true,freshnessChecks:1},
    ...overrides};
}
function setup(options={}){
  let time=1000,evaluations=0;
  const page=options.page||{evaluate:async()=>{evaluations++;return options.document||documentFixture();}};
  const observer=g.createStartupReadinessObserver({page,origin:ORIGIN,buildId:BUILD,sourceSha:SOURCE,actorRole:'direccion',getStage:()=> 'PENDING_CXP_RELOAD',now:()=>time,...options});
  if(options.networkReady!==false)observer.networkReady();
  return{observer,setTime:value=>{time=value;},evaluations:()=>evaluations};
}
const request=(id,type='Script',url=ORIGIN+'/core/provider.js?private=QUERY_SECRET#FRAGMENT_SECRET')=>({requestId:id,type,request:{url,postData:'BODY_SECRET',headers:{Authorization:'Bearer TOKEN_SECRET'}}});

test('construction and boundary are passive and do not evaluate, request, enable CDP or call the app',()=>{
  let reads=0;const forbidden=()=>{reads++;throw Error('unexpected mutation');};
  const {observer}=setup({page:{evaluate:forbidden,goto:forbidden,reload:forbidden,route:forbidden}});
  observer.markReload();assert.equal(reads,0);
  assert.deepEqual(Object.keys(observer).sort(),['capture','markReload','networkReady','onLoadingFailed','onLoadingFinished','onRequest','onResponse','telemetry'].sort());
});
test('wait failure can expose provider and app separately without granting acceptance',async()=>{
  const {observer,evaluations}=setup({document:documentFixture({providerPresent:true,appPresent:false,readyState:'loading'})});
  observer.markReload();const d=await observer.capture();
  assert.equal(evaluations(),1);assert.equal(d.document.providerPresent,true);assert.equal(d.document.appPresent,false);
  assert.equal(d.document.readyState,'loading');assert.equal(d.status,'CAPTURED');assert.equal(d.diagnosticOnly,true);
  assert.equal(JSON.stringify(d).includes('PASS'),false);assert.equal(d.stage,'PENDING_CXP_RELOAD');
});
test('two unavailable globals are distinct from an unavailable diagnostic',async()=>{
  const {observer}=setup({document:documentFixture({providerPresent:false,appPresent:false,orbitPresent:false})});
  const d=await observer.capture();assert.equal(d.status,'CAPTURED');assert.equal(d.document.providerPresent,false);assert.equal(d.document.appPresent,false);
});
test('pending stylesheet can remain visible with no completed response or invented error',async()=>{
  const {observer,setTime}=setup();observer.markReload();observer.onRequest(request('css','Stylesheet','https://fonts.example.test/css?family=SECRET'));
  setTime(31000);const d=await observer.capture();
  assert.equal(d.network.pendingCount,1);assert.equal(d.network.resources[0].ageMs,30000);
  assert.equal(d.network.resources[0].responseReceived,false);assert.equal(d.network.resources[0].fromServiceWorker,null);
  assert.equal(d.network.resources[0].pathSha256,hash('/css'));assert.equal(d.network.resources[0].originClass,'EXTERNAL_ORIGIN');
  assert.deepEqual(d.diagnosticErrors,[]);
});
for(const type of ['Document','Script','Stylesheet','Font'])test('captures critical resource type '+type,async()=>{
  const {observer}=setup();observer.onRequest(request(type,type));const d=await observer.capture();assert.equal(d.network.resources[0].resourceType,type);
});
for(const type of ['Fetch','XHR','Image','Media','WebSocket','Manifest','Other'])test('does not capture payload-bearing noncritical '+type,async()=>{
  const {observer}=setup();observer.onRequest(request(type,type));observer.onResponse({requestId:type,response:{status:403,body:'SECRET'}});
  const d=await observer.capture();assert.equal(d.network.observedCount,0);assert.deepEqual(d.network.resources,[]);
});
test('records response and service worker provenance while request is still pending',async()=>{
  const {observer}=setup();observer.onRequest(request('x'));observer.onResponse({requestId:'x',response:{status:200,fromServiceWorker:true,url:'SECRET',headers:{cookie:'SECRET'}}});
  const d=await observer.capture();assert.equal(d.network.resources[0].state,'PENDING');assert.equal(d.network.resources[0].responseReceived,true);
  assert.equal(d.network.resources[0].fromServiceWorker,true);assert.equal(d.network.resources[0].httpStatus,200);
});
test('finished request age is its duration and not time since completion',async()=>{
  const {observer,setTime}=setup();observer.onRequest(request('x'));setTime(1250);observer.onLoadingFinished({requestId:'x'});setTime(9000);
  const d=await observer.capture();assert.equal(d.network.finishedCount,1);assert.equal(d.network.resources[0].ageMs,250);assert.equal(d.network.pendingCount,0);
  assert.deepEqual(d.network.lastFinishedScriptPaths,[{originClass:'EXPECTED_ORIGIN',pathSha256:hash('/core/provider.js')}]);
});
test('failed and cancelled resources remain separate',async()=>{
  const {observer}=setup();observer.onRequest(request('failed'));observer.onRequest(request('cancelled','Font'));
  observer.onLoadingFailed({requestId:'failed',errorText:'SECRET_FAILURE_DETAIL'});observer.onLoadingFailed({requestId:'cancelled',canceled:true});
  const d=await observer.capture();assert.equal(d.network.failedCount,1);assert.equal(d.network.cancelledCount,1);assert.equal(d.network.pendingCount,0);
  assert.equal(JSON.stringify(d).includes('SECRET'),false);
});
test('redirect records both critical paths and does not confuse completion',async()=>{
  const {observer}=setup();observer.onRequest(request('redirect','Document',ORIGIN+'/start?secret=1'));
  observer.onRequest({...request('redirect','Document',ORIGIN+'/final?secret=2'),redirectResponse:{status:302}});
  observer.onLoadingFinished({requestId:'redirect'});const d=await observer.capture();
  assert.equal(d.network.redirectedCount,1);assert.equal(d.network.finishedCount,1);assert.equal(d.network.pendingCount,0);
  assert.deepEqual(d.network.resources.map(x=>x.pathSha256),[hash('/start'),hash('/final')]);
});
test('duplicate critical request ID without redirect is visible as incomplete telemetry',async()=>{
  const {observer}=setup();observer.onRequest(request('same'));observer.onRequest(request('same'));
  const d=await observer.capture();assert.equal(d.status,'PARTIAL');assert.ok(d.diagnosticErrors.includes('INVALID_CRITICAL_EVENT'));
});
test('previous-window late completion cannot create a current-window request',async()=>{
  const {observer}=setup();observer.onRequest(request('old'));observer.markReload();observer.onLoadingFinished({requestId:'old'});
  const d=await observer.capture();assert.equal(d.windowSequence,1);assert.equal(d.network.observedCount,0);assert.equal(d.network.resources.length,0);
});
test('age and elapsed duration are capped without a sleep or readiness retry',async()=>{
  const {observer,setTime}=setup();observer.onRequest(request('x'));setTime(100000000);
  const d=await observer.capture();assert.equal(d.elapsedMs,g.MAX_AGE_MS);assert.equal(d.network.resources[0].ageMs,g.MAX_AGE_MS);assert.equal(d.network.resources[0].ageCapped,true);
});
test('backwards clock produces a bounded zero age',async()=>{
  const {observer,setTime}=setup();observer.onRequest(request('x'));setTime(100);
  const d=await observer.capture();assert.equal(d.elapsedMs,0);assert.equal(d.network.resources[0].ageMs,0);
});
test('critical request bound records truncation and never grows past the cap',async()=>{
  const {observer}=setup();for(let i=0;i<g.MAX_REQUESTS+5;i++)observer.onRequest(request(String(i)));
  const d=await observer.capture();assert.equal(d.network.resources.length,g.MAX_REQUESTS);assert.equal(d.network.observedCount,g.MAX_REQUESTS+5);
  assert.equal(d.network.truncated,true);assert.equal(d.status,'PARTIAL');assert.ok(d.diagnosticErrors.includes('REQUEST_LIMIT_EXCEEDED'));
});
for(const url of ['not a url','data:text/plain,TOP_SECRET','blob:https://private.test/SECRET'])test('malformed/non-http resource never retains '+url.split(':')[0],async()=>{
  const {observer}=setup();observer.onRequest(request('bad','Script',url));const d=await observer.capture();
  assert.equal(d.status,'PARTIAL');assert.equal(d.network.resources[0].pathSha256,null);assert.equal(JSON.stringify(d).includes('SECRET'),false);
});
test('resource hash ignores all query and fragment values',()=>{
  assert.deepEqual(g.locationProjection(ORIGIN+'/same.js?a=1#secret',ORIGIN),g.locationProjection(ORIGIN+'/same.js?b=2#other',ORIGIN));
});
for(const bad of [{},{requestId:''},{requestId:3},{requestId:'a'.repeat(257)}])test('critical event with invalid identity is explicit',async()=>{
  const {observer}=setup();observer.onRequest({type:'Script',...bad});const d=await observer.capture();
  assert.ok(d.diagnosticErrors.includes('INVALID_CRITICAL_EVENT'));assert.equal(d.network.resources.length,0);
});
test('unexpected callback getter failure becomes a bounded diagnostic code',async()=>{
  const {observer}=setup();observer.onRequest({get type(){throw Error('SECRET');}});const d=await observer.capture();
  assert.ok(d.diagnosticErrors.includes('CDP_CALLBACK_FAILED'));assert.equal(JSON.stringify(d).includes('SECRET'),false);
});
test('missing CDP stays explicit across markReload',async()=>{
  const {observer}=setup();observer.telemetry('CDP_UNAVAILABLE');observer.markReload();const d=await observer.capture();
  assert.equal(d.status,'PARTIAL');assert.deepEqual(d.diagnosticErrors,['CDP_UNAVAILABLE','NETWORK_OBSERVATION_UNAVAILABLE']);
  assert.equal(d.network.status,'UNAVAILABLE');assert.equal(d.network.pendingCount,null);assert.equal(d.network.observedCount,null);
});
test('unconfirmed network instrumentation reports unknown counts instead of fabricated zeros',async()=>{
  const {observer}=setup({networkReady:false});const d=await observer.capture();assert.equal(d.network.status,'UNAVAILABLE');
  assert.equal(d.network.finishedCount,null);assert.equal(d.network.failedCount,null);assert.ok(d.diagnosticErrors.includes('NETWORK_OBSERVATION_UNAVAILABLE'));
});
test('network enable failure is unavailable unless actual events have already been observed',async()=>{
  const {observer}=setup();observer.telemetry('CDP_ENABLE_FAILED');let d=await observer.capture();assert.equal(d.network.status,'UNAVAILABLE');
  observer.onRequest(request('observed'));d=await observer.capture();assert.equal(d.network.status,'PARTIAL');assert.equal(d.network.pendingCount,1);
});
for(const [message,code] of [['Execution context was destroyed, private-url SECRET','DOM_CONTEXT_UNAVAILABLE'],
  ['Target page, context or browser has been closed SECRET','DOM_PAGE_CLOSED'],['Arbitrary TOKEN_SECRET failure','DOM_CAPTURE_FAILED']]){
  test('capture failure preserves '+code+' without hiding or leaking original details',async()=>{
    const {observer}=setup({page:{evaluate:async()=>{throw Error(message);}}});const d=await observer.capture();
    assert.equal(d.status,'UNAVAILABLE');assert.ok(d.diagnosticErrors.includes(code));assert.equal(JSON.stringify(d).includes('SECRET'),false);
    assert.equal(d.document.providerPresent,null);assert.equal(d.document.appPresent,null);assert.equal(d.document.readyState,'UNKNOWN');
  });
}
test('hung DOM capture stops at diagnostic deadline without mutating the page',async()=>{
  let finish;const page={evaluate:()=>new Promise(resolve=>{finish=resolve;})};const {observer}=setup({page});
  // Keep the test process alive; the helper timeout itself is unref'ed.
  const keepAlive=setTimeout(()=>{},g.CAPTURE_DEADLINE_MS+1000);
  try{const d=await observer.capture();assert.equal(d.status,'UNAVAILABLE');assert.ok(d.diagnosticErrors.includes('DOM_CAPTURE_TIMEOUT'));
    assert.equal(d.document.providerPresent,null);assert.equal(d.document.appPresent,null);
    const before=JSON.stringify(d);finish(documentFixture());await Promise.resolve();assert.equal(JSON.stringify(d),before);
  }finally{clearTimeout(keepAlive);}
});
test('returned snapshot is not rewritten by late CDP completion',async()=>{
  const {observer}=setup();observer.onRequest(request('pending'));const d=await observer.capture(),before=JSON.stringify(d);
  observer.onResponse({requestId:'pending',response:{status:200,fromServiceWorker:true}});observer.onLoadingFinished({requestId:'pending'});
  assert.equal(JSON.stringify(d),before);assert.equal(d.network.resources[0].state,'PENDING');
});
test('capture has one evaluation and no retries after transient context failure',async()=>{
  let n=0;const {observer}=setup({page:{evaluate:async()=>{n++;throw Error('Execution context was destroyed');}}});
  await observer.capture();assert.equal(n,1);
});
test('bad stage or clock cannot leak exception text',async()=>{
  const {observer}=setup({getStage:()=>{throw Error('SECRET_STAGE');},now:()=>NaN});const d=await observer.capture();
  assert.equal(d.stage,'UNKNOWN_STAGE');assert.ok(d.diagnosticErrors.includes('STAGE_UNAVAILABLE'));
  assert.ok(d.diagnosticErrors.includes('CLOCK_UNAVAILABLE'));assert.equal(JSON.stringify(d).includes('SECRET'),false);
});
test('malformed DOM result is unavailable, never a successful diagnostic',async()=>{
  const {observer}=setup({page:{evaluate:async()=>({status:'PASS',raw:'SECRET'})}});const d=await observer.capture();
  assert.equal(d.status,'UNAVAILABLE');assert.ok(d.diagnosticErrors.includes('DOM_PROJECTION_INVALID'));assert.equal(JSON.stringify(d).includes('SECRET'),false);
});
test('projection strips arbitrary nested values and cannot inherit a PASS claim',async()=>{
  const {observer}=setup();const original=await observer.capture();
  original.status='PASS';original.rawUrl=ORIGIN+'/SECRET';original.actorRole='private-user@SECRET';
  original.document.dom.scriptPathsTail=[{originClass:'SECRET',pathSha256:'SECRET',raw:'SECRET'}];
  original.document.pwa.workerState='SECRET';original.network.resources=[{url:'SECRET',postData:'SECRET',requestKey:'SECRET',resourceType:'SECRET'}];
  const projected=g.safeStartupReadinessDiagnostic(original),text=JSON.stringify(projected);
  assert.equal(text.includes('SECRET'),false);assert.equal(text.includes('PASS'),false);assert.equal(projected.actorRole,'UNKNOWN_ACTOR');
  assert.equal(projected.status,'PARTIAL');assert.equal(projected.diagnosticOnly,true);
});
test('projection is idempotent for an actual captured diagnostic',async()=>{
  const {observer}=setup();observer.onRequest(request('x'));const d=await observer.capture();assert.deepEqual(g.safeStartupReadinessDiagnostic(d),d);
});
test('invalid schema cannot be promoted by a CAPTURED input flag',()=>{
  const d=g.safeStartupReadinessDiagnostic({status:'CAPTURED',document:documentFixture()});
  assert.equal(d.status,'PARTIAL');assert.ok(d.diagnosticErrors.includes('DOM_PROJECTION_INVALID'));
});
test('incomplete DOM booleans are explicitly partial',async()=>{
  const {observer}=setup({document:documentFixture({providerPresent:'true'})});const d=await observer.capture();
  assert.equal(d.document.providerPresent,null);assert.equal(d.status,'PARTIAL');assert.ok(d.diagnosticErrors.includes('DOM_PROJECTION_INVALID'));
});

function browserFixture(overrides={}){
  const requests=[];const forbidden=name=>()=>{requests.push(name);throw Error('FORBIDDEN_'+name);};
  const scripts=Array.from({length:14},(_,i)=>({hasAttribute:n=>n==='src',src:ORIGIN+'/core/script-'+i+'.js?token=DOM_SECRET#private'}));
  scripts.push({hasAttribute:()=>false});
  const styles=[{href:'https://fonts.example.test/css?family=DOM_SECRET'}];
  const context={URL,TextEncoder,Uint8Array,crypto:crypto.webcrypto,
    window:{Orbit:{productRuntimeBrowserProvidersP0:{initialize:forbidden('initialize')},productAppP0:{activate:forbidden('activate'),isStarted:forbidden('isStarted')}},
      OrbitPwaWorkerState:{status:'controlled',controlled:true,runtimeBuild:BUILD,scriptPath:'SECRET'},
      OrbitPwaBuildFreshness:{status:'current',serverBuild:BUILD,checks:2,lastReason:'SECRET'}},
    navigator:{serviceWorker:{controller:{scriptURL:ORIGIN+'/sw.js?v='+BUILD+'&private=DOM_SECRET',state:'activated'},
      getRegistrations:forbidden('getRegistrations'),register:forbidden('register')}},
    document:{baseURI:ORIGIN+'/?SECRET',readyState:'loading',visibilityState:'hidden',scripts,styleSheets:[{},{}],fonts:{status:'loading'},
      querySelectorAll:selector=>selector==='link[rel~="stylesheet"]'?styles:selector==='style'?[{}]:[]},
    location:{origin:ORIGIN,pathname:'/',hash:'#/finanzas?customer=DOM_SECRET',reload:forbidden('reload')},
    fetch:forbidden('fetch'),setTimeout:forbidden('setTimeout'),setInterval:forbidden('setInterval'),
    localStorage:new Proxy({},{get:forbidden('localStorage')}),sessionStorage:new Proxy({},{get:forbidden('sessionStorage')}),...overrides};
  return{context,requests,run:()=>vm.runInNewContext('('+g.captureDocumentReadiness.toString()+')('+JSON.stringify({expectedOrigin:ORIGIN,expectedBuildId:BUILD})+')',context)};
}
test('actual browser projection reads only DOM/native state and hashes paths inside page',async()=>{
  const b=browserFixture(),d=await b.run();assert.deepEqual(b.requests,[]);
  assert.equal(d.providerPresent,true);assert.equal(d.appPresent,true);assert.equal(d.readyState,'loading');
  assert.equal(d.dom.scriptCount,15);assert.equal(d.dom.externalScriptCount,14);assert.equal(d.dom.inlineScriptCount,1);
  assert.equal(d.dom.scriptPathsTail.length,8);assert.equal(d.dom.scriptPathsTail[0].pathSha256,hash('/core/script-6.js'));
  assert.equal(d.dom.stylesheetPathsTail[0].pathSha256,hash('/css'));assert.equal(d.routeClass,'FINANZAS');
  assert.equal(d.serviceWorker.controllerBuildMatches,true);assert.equal(d.serviceWorker.controllerPathSha256,hash('/sw.js'));
  assert.equal(d.pwa.workerBuildMatches,true);assert.equal(d.pwa.serverBuildMatches,true);assert.equal(JSON.stringify(d).includes('SECRET'),false);
});
for(const [hashValue,route] of [['','EMPTY'],['#/inicio','INICIO'],['#/importar?secret=1','IMPORTAR'],['#/login','LOGIN'],['#/private/UID_SECRET','OTHER']]){
  test('route classification '+route+' cannot retain arbitrary route text',async()=>{
    const b=browserFixture();b.context.location.hash=hashValue;const d=await b.run();assert.equal(d.routeClass,route);assert.equal(JSON.stringify(d).includes('SECRET'),false);
  });
}
test('unknown PWA strings are enums and changed origin is explicitly visible',async()=>{
  const b=browserFixture();b.context.location.origin='https://unexpected.example.test';b.context.location.pathname='/private/SECRET';
  b.context.window.OrbitPwaWorkerState.status='SECRET';b.context.window.OrbitPwaBuildFreshness.status='SECRET';
  const d=await b.run();assert.equal(d.originClass,'UNEXPECTED_ORIGIN');assert.equal(d.pathClass,'OTHER');
  assert.equal(d.pwa.workerState,'UNKNOWN');assert.equal(d.pwa.freshnessState,'UNKNOWN');assert.equal(JSON.stringify(d).includes('SECRET'),false);
});
test('absent PWA or service worker is distinguished from an exception',async()=>{
  const b=browserFixture();b.context.navigator={};delete b.context.window.OrbitPwaWorkerState;delete b.context.window.OrbitPwaBuildFreshness;
  const d=await b.run();assert.equal(d.serviceWorker.supported,false);assert.equal(d.serviceWorker.controllerPresent,false);
  assert.equal(d.serviceWorker.controllerState,'ABSENT');assert.equal(d.pwa.workerState,'ABSENT');assert.equal(d.pwa.freshnessState,'ABSENT');
});
test('hash engine failure is preserved explicitly instead of leaking paths',async()=>{
  const b=browserFixture({crypto:{subtle:{digest:async()=>{throw Error('HASH_SECRET');}}}});const d=await b.run();
  assert.ok(d.diagnosticErrors.includes('DOM_HASH_UNAVAILABLE'));assert.equal(d.dom.scriptPathsTail[0].pathSha256,null);assert.equal(JSON.stringify(d).includes('SECRET'),false);
});
