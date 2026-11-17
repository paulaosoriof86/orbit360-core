'use strict';

// Passive QA evidence only. This owner never starts a request, invokes an app
// method, changes browser storage, enables CDP, waits for app readiness or grants
// acceptance. The caller feeds events from its existing CDP observation session.
const crypto=require('node:crypto');
const SCHEMA='GI_I66_STARTUP_READINESS_DIAGNOSTIC_V1';
const MAX_REQUESTS=512,MAX_AGE_MS=120000,DOM_TAIL=8,CAPTURE_DEADLINE_MS=1000;
const TYPES=new Set(['Document','Script','Stylesheet','Font']);
const STAGES=new Set(['BUILD_IDENTITY','SIGNED_SESSION','DIRECTION_LEGAL_ACCEPTANCE','FINANCE_UI_HYDRATION',
  'ASSIGNMENT_DOCUMENTARY_UI','ASSIGNMENT_RELOAD','PENDING_CXP_RELOAD','SYNTHETIC_RESTORE']);
const ERRORS=new Set(['CDP_UNAVAILABLE','CDP_CALLBACK_FAILED','CDP_ENABLE_FAILED','INVALID_CRITICAL_EVENT',
  'INVALID_RESOURCE_LOCATION','REQUEST_LIMIT_EXCEEDED','COUNTER_LIMIT_EXCEEDED','CLOCK_UNAVAILABLE',
  'STAGE_UNAVAILABLE','DOM_CAPTURE_FAILED','DOM_CAPTURE_TIMEOUT','DOM_CONTEXT_UNAVAILABLE','DOM_PAGE_CLOSED',
  'DOM_HASH_UNAVAILABLE','DOM_LOCATION_UNAVAILABLE','DOM_PROJECTION_INVALID','NETWORK_OBSERVATION_UNAVAILABLE','UNKNOWN_DIAGNOSTIC_ERROR']);
const sha=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const shaValue=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)?value:null;
const bool=value=>typeof value==='boolean'?value:null;
const count=(value,max=10000)=>Number.isSafeInteger(value)&&value>=0&&value<=max?value:null;
const enumValue=(value,values,fallback='UNKNOWN')=>values.includes(value)?value:fallback;
const stage=value=>STAGES.has(value)?value:'UNKNOWN_STAGE';
const actor=value=>['direccion','operativo'].includes(value)?value:'UNKNOWN_ACTOR';
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
function locationProjection(url,origin){
  try{
    const u=new URL(url);
    if(!['http:','https:'].includes(u.protocol))return{originClass:'NON_HTTP',pathSha256:null};
    return{originClass:u.origin===origin?'EXPECTED_ORIGIN':'EXTERNAL_ORIGIN',pathSha256:sha(u.pathname)};
  }catch{return{originClass:'UNKNOWN',pathSha256:null};}
}
function safePath(value){
  const v=plain(value);return{originClass:enumValue(v.originClass,['EXPECTED_ORIGIN','EXTERNAL_ORIGIN','NON_HTTP']),pathSha256:shaValue(v.pathSha256)};
}
function safeDocument(value){
  const v=plain(value),sw=plain(v.serviceWorker),pwa=plain(v.pwa),dom=plain(v.dom);
  return{status:enumValue(v.status,['CAPTURED','UNAVAILABLE'],'UNAVAILABLE'),
    providerPresent:bool(v.providerPresent),appPresent:bool(v.appPresent),orbitPresent:bool(v.orbitPresent),
    readyState:enumValue(v.readyState,['loading','interactive','complete'],'UNKNOWN'),
    visibilityState:enumValue(v.visibilityState,['visible','hidden','prerender'],'UNKNOWN'),
    originClass:enumValue(v.originClass,['EXPECTED_ORIGIN','UNEXPECTED_ORIGIN'],'UNKNOWN'),
    pathClass:enumValue(v.pathClass,['ROOT','INDEX','OTHER'],'UNKNOWN'),
    routeClass:enumValue(v.routeClass,['EMPTY','INICIO','FINANZAS','IMPORTAR','LOGIN','OTHER'],'UNKNOWN'),
    dom:{scriptCount:count(dom.scriptCount),externalScriptCount:count(dom.externalScriptCount),
      inlineScriptCount:count(dom.inlineScriptCount),stylesheetLinkCount:count(dom.stylesheetLinkCount),
      inlineStyleCount:count(dom.inlineStyleCount),stylesheetCount:count(dom.stylesheetCount),
      fontStatus:enumValue(dom.fontStatus,['loading','loaded','UNSUPPORTED'],'UNKNOWN'),
      scriptPathsTail:Array.isArray(dom.scriptPathsTail)?dom.scriptPathsTail.slice(-DOM_TAIL).map(safePath):[],
      stylesheetPathsTail:Array.isArray(dom.stylesheetPathsTail)?dom.stylesheetPathsTail.slice(-DOM_TAIL).map(safePath):[]},
    serviceWorker:{supported:bool(sw.supported),controllerPresent:bool(sw.controllerPresent),
      controllerState:enumValue(sw.controllerState,['parsed','installing','installed','activating','activated','redundant','ABSENT'],'UNKNOWN'),
      controllerPathSha256:shaValue(sw.controllerPathSha256),controllerBuildMatches:bool(sw.controllerBuildMatches)},
    pwa:{workerState:enumValue(pwa.workerState,['registering','controlled','uncontrolled','unsupported','error','ABSENT'],'UNKNOWN'),
      workerControlled:bool(pwa.workerControlled),workerBuildMatches:bool(pwa.workerBuildMatches),
      freshnessState:enumValue(pwa.freshnessState,['idle','checking','stale','stale-reload-exhausted','current','unverified','ABSENT'],'UNKNOWN'),
      serverBuildMatches:bool(pwa.serverBuildMatches),freshnessChecks:count(pwa.freshnessChecks)}};
}
function safeResource(value){
  const v=plain(value);return{requestKey:shaValue(v.requestKey),resourceType:enumValue(v.resourceType,[...TYPES]),
    ...safePath(v),state:enumValue(v.state,['PENDING','FINISHED','FAILED','CANCELLED','REDIRECTED']),
    responseReceived:bool(v.responseReceived),httpStatus:count(v.httpStatus,599),fromServiceWorker:bool(v.fromServiceWorker),
    ageMs:count(v.ageMs,MAX_AGE_MS),ageCapped:bool(v.ageCapped),startedAfterBoundary:bool(v.startedAfterBoundary)};
}
function safeStartupReadinessDiagnostic(value){
  const v=plain(value),net=plain(v.network),inputErrors=Array.isArray(v.diagnosticErrors)?v.diagnosticErrors:[];
  const errors=[...new Set(inputErrors.map(e=>ERRORS.has(e)?e:'UNKNOWN_DIAGNOSTIC_ERROR'))].sort();
  if(v.schema!==SCHEMA)errors.push('DOM_PROJECTION_INVALID');
  const document=safeDocument(v.document),resources=Array.isArray(net.resources)?net.resources.slice(0,MAX_REQUESTS).map(safeResource):[];
  const networkStatus=enumValue(net.status,['OBSERVED','PARTIAL','UNAVAILABLE'],'UNAVAILABLE');
  if(networkStatus==='UNAVAILABLE')errors.push('NETWORK_OBSERVATION_UNAVAILABLE');
  if(document.status==='CAPTURED'&&([document.providerPresent,document.appPresent,document.orbitPresent].some(x=>x===null)||
    document.readyState==='UNKNOWN'||document.originClass==='UNKNOWN'||document.pathClass==='UNKNOWN'||document.routeClass==='UNKNOWN'||
    ['scriptCount','externalScriptCount','inlineScriptCount','stylesheetLinkCount','inlineStyleCount','stylesheetCount'].some(k=>document.dom[k]===null)))errors.push('DOM_PROJECTION_INVALID');
  if(resources.some(row=>!row.requestKey||row.resourceType==='UNKNOWN'||!row.pathSha256||row.originClass==='UNKNOWN'))errors.push('INVALID_CRITICAL_EVENT');
  const diagnosticErrors=[...new Set(errors)].sort();
  return{schema:SCHEMA,diagnosticOnly:true,sourceSha:typeof v.sourceSha==='string'&&/^[a-f0-9]{40}$/.test(v.sourceSha)?v.sourceSha:null,
    buildId:typeof v.buildId==='string'&&/^gi-i66-[a-f0-9]{12}-[a-f0-9]{12}$/.test(v.buildId)?v.buildId:null,
    actorRole:actor(v.actorRole),stage:stage(v.stage),windowSequence:count(v.windowSequence),elapsedMs:count(v.elapsedMs,MAX_AGE_MS),
    status:document.status==='UNAVAILABLE'?'UNAVAILABLE':diagnosticErrors.length?'PARTIAL':'CAPTURED',document,
    network:{status:networkStatus,observedCount:networkStatus==='UNAVAILABLE'?null:count(net.observedCount,1000000),
      pendingCount:networkStatus==='UNAVAILABLE'?null:count(net.pendingCount,MAX_REQUESTS),
      finishedCount:networkStatus==='UNAVAILABLE'?null:count(net.finishedCount,MAX_REQUESTS),failedCount:networkStatus==='UNAVAILABLE'?null:count(net.failedCount,MAX_REQUESTS),
      cancelledCount:networkStatus==='UNAVAILABLE'?null:count(net.cancelledCount,MAX_REQUESTS),redirectedCount:networkStatus==='UNAVAILABLE'?null:count(net.redirectedCount,MAX_REQUESTS),
      truncated:net.truncated===true||Array.isArray(net.resources)&&net.resources.length>MAX_REQUESTS,
      resources,lastFinishedScriptPaths:Array.isArray(net.lastFinishedScriptPaths)?net.lastFinishedScriptPaths.slice(-DOM_TAIL).map(safePath):[]},
    diagnosticErrors};
}

// Serialized by Playwright. Values leaving the page are finite enums, counts,
// booleans and hashes. URL queries/fragments, text, UIDs and storage never leave.
async function captureDocumentReadiness({expectedOrigin,expectedBuildId}){
  const errors=[],mark=code=>{if(!errors.includes(code))errors.push(code);};
  const safeEnum=(value,values,absent)=>value===undefined||value===null?absent:values.includes(value)?value:'UNKNOWN';
  const hash=async value=>{
    try{
      const bytes=new TextEncoder().encode(value),result=await crypto.subtle.digest('SHA-256',bytes);
      return Array.from(new Uint8Array(result),x=>x.toString(16).padStart(2,'0')).join('');
    }catch{mark('DOM_HASH_UNAVAILABLE');return null;}
  };
  const resource=async value=>{
    try{const u=new URL(value,document.baseURI);if(!['https:','http:'].includes(u.protocol))return{originClass:'NON_HTTP',pathSha256:null};
      return{originClass:u.origin===expectedOrigin?'EXPECTED_ORIGIN':'EXTERNAL_ORIGIN',pathSha256:await hash(u.pathname)};
    }catch{mark('DOM_LOCATION_UNAVAILABLE');return{originClass:'UNKNOWN',pathSha256:null};}
  };
  let originClass='UNKNOWN',pathClass='UNKNOWN',routeClass='UNKNOWN';
  try{originClass=location.origin===expectedOrigin?'EXPECTED_ORIGIN':'UNEXPECTED_ORIGIN';
    pathClass=location.pathname==='/'?'ROOT':location.pathname==='/index.html'?'INDEX':'OTHER';
    const route=location.hash.split('?')[0].split('#').slice(1).join('#').replace(/^\//,'').toLowerCase();
    routeClass=route===''?'EMPTY':({inicio:'INICIO',finanzas:'FINANZAS',importar:'IMPORTAR',login:'LOGIN'})[route]||'OTHER';
  }catch{mark('DOM_LOCATION_UNAVAILABLE');}
  const scripts=Array.from(document.scripts),external=scripts.filter(s=>s.hasAttribute('src')),
    styles=Array.from(document.querySelectorAll('link[rel~="stylesheet"]'));
  const swSupported='serviceWorker' in navigator,controller=swSupported?navigator.serviceWorker.controller:null;
  const worker=window.OrbitPwaWorkerState,freshness=window.OrbitPwaBuildFreshness;
  let controllerPathSha256=null,controllerBuildMatches=null;
  if(controller){try{const u=new URL(controller.scriptURL);controllerPathSha256=await hash(u.pathname);
    controllerBuildMatches=u.searchParams.get('v')===expectedBuildId;}catch{mark('DOM_LOCATION_UNAVAILABLE');}}
  const boolOrNull=value=>typeof value==='boolean'?value:null;
  return{status:'CAPTURED',providerPresent:!!window.Orbit?.productRuntimeBrowserProvidersP0,
    appPresent:!!window.Orbit?.productAppP0,orbitPresent:!!window.Orbit,readyState:document.readyState,
    visibilityState:document.visibilityState,originClass,pathClass,routeClass,
    dom:{scriptCount:scripts.length,externalScriptCount:external.length,inlineScriptCount:scripts.length-external.length,
      stylesheetLinkCount:styles.length,inlineStyleCount:document.querySelectorAll('style').length,
      stylesheetCount:document.styleSheets.length,fontStatus:document.fonts?document.fonts.status:'UNSUPPORTED',
      scriptPathsTail:await Promise.all(external.slice(-8).map(s=>resource(s.src))),
      stylesheetPathsTail:await Promise.all(styles.slice(-8).map(s=>resource(s.href)))},
    serviceWorker:{supported:swSupported,controllerPresent:!!controller,controllerState:controller?controller.state:'ABSENT',controllerPathSha256,controllerBuildMatches},
    pwa:{workerState:safeEnum(worker?.status,['registering','controlled','uncontrolled','unsupported','error'],'ABSENT'),
      workerControlled:boolOrNull(worker?.controlled),workerBuildMatches:typeof worker?.runtimeBuild==='string'?worker.runtimeBuild===expectedBuildId:null,
      freshnessState:safeEnum(freshness?.status,['idle','checking','stale','stale-reload-exhausted','current','unverified'],'ABSENT'),
      serverBuildMatches:typeof freshness?.serverBuild==='string'&&freshness.serverBuild!==''?freshness.serverBuild===expectedBuildId:null,
      freshnessChecks:Number.isSafeInteger(freshness?.checks)&&freshness.checks>=0&&freshness.checks<=10000?freshness.checks:null},
    diagnosticErrors:errors};
}

function createStartupReadinessObserver({page,origin,buildId,sourceSha,actorRole,getStage=()=>'',now=Date.now}={}){
  const errors=new Set(),active=new Map();let entries=[],observedCount=0,sequence=0,truncated=false,networkEnabled=false;
  const telemetry=code=>errors.add(ERRORS.has(code)?code:'UNKNOWN_DIAGNOSTIC_ERROR');
  const clock=()=>{try{const value=now();if(!Number.isFinite(value))throw Error();return value;}
    catch{telemetry('CLOCK_UNAVAILABLE');return 0;}};
  let boundaryAt=clock();
  const currentStage=()=>{try{return stage(getStage());}catch{telemetry('STAGE_UNAVAILABLE');return'UNKNOWN_STAGE';}};
  const guarded=fn=>event=>{try{fn(event||{});}catch{telemetry('CDP_CALLBACK_FAILED');}};
  const onRequest=guarded(event=>{
    if(!TYPES.has(event.type))return;
    if(typeof event.requestId!=='string'||event.requestId.length===0||event.requestId.length>256){telemetry('INVALID_CRITICAL_EVENT');return;}
    const prior=active.get(event.requestId);
    if(prior){if(event.redirectResponse){prior.state='REDIRECTED';prior.endedAt=clock();}else telemetry('INVALID_CRITICAL_EVENT');active.delete(event.requestId);}
    observedCount=Math.min(observedCount+1,1000000);if(observedCount===1000000)telemetry('COUNTER_LIMIT_EXCEEDED');
    if(entries.length>=MAX_REQUESTS){truncated=true;telemetry('REQUEST_LIMIT_EXCEEDED');return;}
    const location=locationProjection(event.request?.url,origin);if(!location.pathSha256)telemetry('INVALID_RESOURCE_LOCATION');
    const row={requestKey:sha(event.requestId+'|'+sequence+'|'+entries.length),resourceType:event.type,...location,state:'PENDING',
      responseReceived:false,httpStatus:null,fromServiceWorker:null,startedAt:clock(),endedAt:null,startedAfterBoundary:true};
    entries.push(row);active.set(event.requestId,row);
  });
  const onResponse=guarded(event=>{
    const row=active.get(event.requestId);if(!row)return;row.responseReceived=true;
    row.httpStatus=count(event.response?.status,599);row.fromServiceWorker=bool(event.response?.fromServiceWorker);
  });
  const complete=(event,state)=>{const row=active.get(event.requestId);if(!row)return;row.state=state;row.endedAt=clock();active.delete(event.requestId);};
  const onLoadingFinished=guarded(event=>complete(event,'FINISHED'));
  const onLoadingFailed=guarded(event=>complete(event,event.canceled===true?'CANCELLED':'FAILED'));
  function markReload(){
    // Observer memory only; no navigation, app call, network or storage action.
    entries=[];active.clear();observedCount=0;truncated=false;sequence=Math.min(sequence+1,10000);boundaryAt=clock();
    return sequence;
  }
  function networkSnapshot(){
    const capturedAt=clock();const resources=entries.map(row=>{
      const age=Math.max(0,(row.endedAt===null?capturedAt:row.endedAt)-row.startedAt);
      return safeResource({...row,ageMs:Math.min(Math.floor(age),MAX_AGE_MS),ageCapped:age>MAX_AGE_MS});
    });
    const unavailable=errors.has('CDP_UNAVAILABLE')||errors.has('CDP_ENABLE_FAILED');
    const status=(!networkEnabled||unavailable)&&entries.length===0?'UNAVAILABLE':!networkEnabled||unavailable||errors.has('CDP_CALLBACK_FAILED')?'PARTIAL':'OBSERVED';
    return{status,observedCount,pendingCount:resources.filter(r=>r.state==='PENDING').length,finishedCount:resources.filter(r=>r.state==='FINISHED').length,
      failedCount:resources.filter(r=>r.state==='FAILED').length,cancelledCount:resources.filter(r=>r.state==='CANCELLED').length,
      redirectedCount:resources.filter(r=>r.state==='REDIRECTED').length,truncated,resources,
      lastFinishedScriptPaths:entries.filter(r=>r.resourceType==='Script'&&r.state==='FINISHED').sort((a,b)=>a.endedAt-b.endedAt).slice(-DOM_TAIL).map(safePath)};
  }
  async function capture(){
    // Freeze the evidence boundary before the bounded DOM projection. Events
    // arriving later remain observable but cannot rewrite this returned snapshot.
    const network=networkSnapshot(),elapsed=Math.max(0,clock()-boundaryAt),capturedStage=currentStage();let document,timer;
    try{
      if(!page||typeof page.evaluate!=='function')throw Error('DOM_CAPTURE_FAILED');
      document=await Promise.race([Promise.resolve().then(()=>page.evaluate(captureDocumentReadiness,{expectedOrigin:origin,expectedBuildId:buildId})),
        new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('DOM_CAPTURE_TIMEOUT')),CAPTURE_DEADLINE_MS);timer.unref?.();})]);
      if(!document||document.status!=='CAPTURED'){telemetry('DOM_PROJECTION_INVALID');document={status:'UNAVAILABLE'};}
      for(const code of Array.isArray(document.diagnosticErrors)?document.diagnosticErrors:[])telemetry(code);
    }catch(error){
      const message=typeof error?.message==='string'?error.message:'';
      telemetry(message==='DOM_CAPTURE_TIMEOUT'?'DOM_CAPTURE_TIMEOUT':/Execution context was destroyed|Cannot find context|context.*destroyed/i.test(message)?'DOM_CONTEXT_UNAVAILABLE':
        /Target.*closed|page.*closed|browser.*closed/i.test(message)?'DOM_PAGE_CLOSED':'DOM_CAPTURE_FAILED');
      document={status:'UNAVAILABLE'};
    }finally{clearTimeout(timer);}
    return safeStartupReadinessDiagnostic({schema:SCHEMA,sourceSha,buildId,actorRole,stage:capturedStage,windowSequence:sequence,
      elapsedMs:Math.min(Math.floor(elapsed),MAX_AGE_MS),document,network,diagnosticErrors:[...errors]});
  }
  return{onRequest,onResponse,onLoadingFinished,onLoadingFailed,markReload,capture,telemetry,networkReady:()=>{networkEnabled=true;}};
}
module.exports={SCHEMA,MAX_REQUESTS,MAX_AGE_MS,CAPTURE_DEADLINE_MS,ERRORS,locationProjection,captureDocumentReadiness,
  safeStartupReadinessDiagnostic,createStartupReadinessObserver};
