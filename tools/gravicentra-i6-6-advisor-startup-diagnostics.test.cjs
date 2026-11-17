'use strict';
// Offline causal integration tests. No live browser, credential, storage write,
// network request, fixture application, deployment or acceptance is performed.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{EventEmitter}=require('node:events');
const driver=require('./gravicentra-i6-6-advisor-payables-signed-uat.cjs');
const startup=require('./gravicentra-i6-6-startup-readiness-diagnostics.cjs');
const documented=require('./gravicentra-i6-6-documented-terms-signed-check.cjs');
const proposal=require('./gravicentra-i6-6-proposal-uat-diagnostics.cjs');
const cfg=driver.configuration({I66_SOURCE_SHA:'a'.repeat(40),I66_PREVIEW_ORIGIN:'https://ays-orbit-360-lab--gi-i66-rc-123-abcd.web.app'});
const buildId='gi-i66-'+'a'.repeat(12)+'-57f234755dc1';
const privateValue='PRIVATE_RAW_IDENTITY_URL_TOKEN_MUST_NOT_LEAVE';
function documentState(providerPresent=false,appPresent=false){return{status:'CAPTURED',providerPresent,appPresent,
  orbitPresent:providerPresent||appPresent,readyState:'loading',visibilityState:'visible',originClass:'EXPECTED_ORIGIN',
  pathClass:'ROOT',routeClass:'FINANZAS',dom:{scriptCount:3,externalScriptCount:3,inlineScriptCount:0,
    stylesheetLinkCount:1,inlineStyleCount:0,stylesheetCount:1,fontStatus:'loading',scriptPathsTail:[],stylesheetPathsTail:[]},
  serviceWorker:{supported:true,controllerPresent:false,controllerState:'ABSENT'},pwa:{workerState:'ABSENT',freshnessState:'ABSENT'}};}
function observer(page,{role='direccion',getStage=()=> 'PENDING_CXP_RELOAD',now}={}){
  const result=startup.createStartupReadinessObserver({page,origin:cfg.origin,sourceSha:cfg.source,buildId,actorRole:role,getStage,...(now?{now}:{})});
  result.networkReady();return result;
}

test('failed original wait freezes pending script and missing globals before finally can change the page',async()=>{
  const events=[],report={},error=new Error(privateValue);error.name='TimeoutError';let time=0,dom=documentState();
  const page={evaluate:async()=>{events.push('capture');return dom;},waitForFunction:async(predicate,arg,options)=>{
    events.push('wait');assert.equal(arg,null);assert.deepEqual(options,{timeout:30000});
    for(const orbit of [undefined,{}, {productAppP0:{}},{productRuntimeBrowserProvidersP0:{}}])
      assert.equal(vm.runInNewContext('('+predicate.toString()+')()',{window:{Orbit:orbit}}),false);
    assert.equal(vm.runInNewContext('('+predicate.toString()+')()',{window:{Orbit:{productAppP0:{},productRuntimeBrowserProvidersP0:{}}}}),true);
    time=30000;throw error;
  }};
  const watched=observer(page,{now:()=>time});let caught;
  try{await driver.waitForStartupGlobals({page,startup:watched,report,actorRole:'direccion',stage:'PENDING_CXP_RELOAD',navigate:async()=>{
    events.push('reload');watched.onRequest({requestId:'private-request',type:'Script',request:{url:cfg.origin+'/core/product-app-p0.js?token='+privateValue}});
    watched.onResponse({requestId:'private-request',response:{status:200,fromServiceWorker:false}});
  }});}catch(e){caught=e;events.push('caught');}
  finally{events.push('cleanup');dom.providerPresent=true;dom.appPresent=true;dom.readyState='complete';time=31000;
    watched.onLoadingFinished({requestId:'private-request'});}
  assert.equal(caught,error,'the original error object must survive diagnostics');
  assert.deepEqual(events,['reload','wait','capture','caught','cleanup']);
  const row=report.startupDiagnostics[0],snapshot=row.diagnostic;
  assert.equal(row.waitOutcome,'ORIGINAL_WAIT_FAILED');assert.equal(row.stage,'PENDING_CXP_RELOAD');
  assert.equal(snapshot.document.providerPresent,false);assert.equal(snapshot.document.appPresent,false);
  assert.equal(snapshot.network.pendingCount,1);assert.equal(snapshot.network.finishedCount,0);
  assert.equal(snapshot.network.resources[0].state,'PENDING');assert.equal(snapshot.network.resources[0].responseReceived,true);
  assert.equal(snapshot.network.resources[0].ageMs,30000);assert.equal(snapshot.elapsedMs,30000);
  assert.equal(JSON.stringify(report).includes(privateValue),false);
});

test('navigation failure is captured before cleanup and does not retry or enter a new wait',async()=>{
  const error=new Error(privateValue),report={};let navigations=0,waits=0,captures=0;
  const page={waitForFunction:async()=>{waits++;}};
  await assert.rejects(driver.waitForStartupGlobals({page,startup:{markReload(){},capture:async()=>{captures++;return null;}},report,
    actorRole:'direccion',stage:'ASSIGNMENT_RELOAD',navigate:async()=>{navigations++;throw error;}}),actual=>actual===error);
  assert.equal(navigations,1);assert.equal(waits,0);assert.equal(captures,1);
  assert.equal(report.startupDiagnostics[0].diagnostic.status,'UNAVAILABLE');
  assert.equal(report.startupDiagnostics[0].stage,'ASSIGNMENT_RELOAD');
});

test('diagnostic capture failure never replaces the original error and missing state remains unknown',async()=>{
  const error=new Error('ORIGINAL_WAIT_FAILURE'),report={};let waits=0;
  const page={waitForFunction:async()=>{waits++;throw error;}};
  await assert.rejects(driver.waitForStartupGlobals({page,startup:{markReload(){},capture:async()=>{throw Error(privateValue);}},report,
    actorRole:'direccion',stage:'PENDING_CXP_RELOAD',navigate:async()=>{}}),actual=>actual===error);
  const snapshot=report.startupDiagnostics[0].diagnostic;
  assert.equal(waits,1);assert.equal(snapshot.status,'UNAVAILABLE');assert.equal(snapshot.document.providerPresent,null);
  assert.equal(snapshot.document.appPresent,null);assert.equal(snapshot.network.pendingCount,null);
  assert.equal(JSON.stringify(report).includes(privateValue),false);
});

test('completed wait remains completed when optional diagnostics are unavailable',async()=>{
  const report={},calls=[];const page={waitForFunction:async(_fn,_arg,opts)=>{calls.push('wait');assert.equal(opts.timeout,30000);}};
  await driver.waitForStartupGlobals({page,startup:{markReload(){calls.push('boundary');},capture:async()=>{calls.push('capture');throw Error(privateValue);}},
    report,actorRole:'operativo',stage:'SIGNED_SESSION',navigate:async()=>{calls.push('navigate');}});
  assert.deepEqual(calls,['boundary','navigate','wait','capture']);
  assert.equal(report.startupDiagnostics[0].waitOutcome,'ORIGINAL_WAIT_COMPLETED');
  assert.equal(report.startupDiagnostics[0].diagnostic.status,'UNAVAILABLE');
});

test('even falsy thrown values cannot turn a failed wait into successful readiness',async()=>{
  const report={};let failed=false;
  try{await driver.waitForStartupGlobals({page:{waitForFunction:async()=>{throw null;}},startup:{markReload(){},capture:async()=>null},
    report,actorRole:'direccion',stage:'PENDING_CXP_RELOAD',navigate:async()=>{}});}catch(value){failed=true;assert.equal(value,null);}
  assert.equal(failed,true);assert.equal(report.startupDiagnostics[0].waitOutcome,'ORIGINAL_WAIT_FAILED');
});

test('existing CDP sessions feed only their own actor diagnostics without an additional session or protocol enable',async()=>{
  const rows=[];
  for(const role of ['direccion','operativo']){
    let sessions=0;const commands=[],cdp=new EventEmitter(),page=new EventEmitter();
    cdp.send=async name=>{commands.push(name);return{};};page.evaluate=async()=>documentState();
    const context={newCDPSession:async supplied=>{assert.equal(supplied,page);sessions++;return cdp;}};
    const attached=await driver.attachBrowserObservability({context,page,cfg,actorRole:role,getStage:()=> 'SIGNED_SESSION',catalog:[],buildId});
    attached.startup.markReload();rows.push({role,cdp,attached,commands,get sessions(){return sessions;}});
  }
  for(const row of rows)row.cdp.emit('Network.requestWillBeSent',{requestId:'same-browser-counter',type:'Script',
    request:{url:cfg.origin+'/core/'+row.role+'.js?identity='+privateValue}});
  rows[0].cdp.emit('Network.responseReceived',{requestId:'same-browser-counter',response:{status:200,fromServiceWorker:true}});
  rows[0].cdp.emit('Network.loadingFinished',{requestId:'same-browser-counter'});
  const direction=await rows[0].attached.startup.capture(),operative=await rows[1].attached.startup.capture();
  assert.equal(direction.actorRole,'direccion');assert.equal(operative.actorRole,'operativo');
  assert.equal(direction.network.pendingCount,0);assert.equal(direction.network.finishedCount,1);
  assert.equal(operative.network.pendingCount,1);assert.equal(operative.network.finishedCount,0);
  assert.notEqual(direction.network.resources[0].pathSha256,operative.network.resources[0].pathSha256);
  assert.equal(direction.network.resources[0].fromServiceWorker,true);assert.equal(operative.network.resources[0].fromServiceWorker,null);
  for(const row of rows){assert.equal(row.sessions,1);assert.deepEqual(row.commands,['Network.enable','Log.enable','Runtime.enable']);}
  assert.equal(JSON.stringify([direction,operative]).includes(privateValue),false);
});

test('missing existing CDP is explicit diagnostic uncertainty, not invented network success',async()=>{
  const page=new EventEmitter();page.evaluate=async()=>documentState();
  const attached=await driver.attachBrowserObservability({context:{newCDPSession:async()=>{throw Error(privateValue);}},page,
    cfg,actorRole:'direccion',getStage:()=> 'SIGNED_SESSION',catalog:[],buildId});
  attached.startup.markReload();const result=await attached.startup.capture();
  assert.ok(result.diagnosticErrors.includes('CDP_UNAVAILABLE'));assert.equal(result.status,'PARTIAL');
  assert.equal(result.network.pendingCount,null);assert.equal(result.network.finishedCount,null);assert.equal(result.network.observedCount,null);
  assert.equal(attached.summary().status,'HOLD','existing browser-observability fail-closed behavior remains');
});

function diagnosticExport(report){
  const yaml=fs.readFileSync(path.join(__dirname,'../.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml'),'utf8');
  const section=yaml.split('- name: Preserve sanitized failure diagnostics without an acceptance proof')[1].split('- name: Upload diagnostics only')[0];
  const code=section.split("node - <<'NODE'\n")[1].split('\n          NODE')[0].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
  const reportPath='/mock/gravicentra-i66-advisor-payables-signed-uat-preview.json';let output;
  const io={existsSync:file=>file===reportPath,readFileSync:file=>{assert.equal(file,reportPath);return JSON.stringify(report);},
    writeFileSync:(file,bytes)=>{assert.equal(file,'/mock/i66-preview-failure-diagnostic.json');output=JSON.parse(bytes);}};
  vm.runInNewContext(code,{require:name=>{
    if(name==='node:fs')return io;if(name==='node:path')return path;
    if(name==='./tools/gravicentra-i6-6-advisor-payables-signed-uat.cjs')return driver;
    if(name==='./tools/gravicentra-i6-6-documented-terms-signed-check.cjs')return documented;
    if(name==='./tools/gravicentra-i6-6-proposal-uat-diagnostics.cjs')return proposal;
    throw Error('UNEXPECTED_DIAGNOSTIC_DEPENDENCY');
  },process:{env:{RUNNER_TEMP:'/mock',I66_PACKAGE_ROOT:'/mock-package',GITHUB_RUN_ID:'123',SOURCE_SHA:cfg.source}}});
  return output;
}

test('failure exporter retains original wait snapshot and allowlisted restoration causes with zero remaining still HOLD',async()=>{
  const page={evaluate:async()=>documentState(false,true)},watched=observer(page);watched.markReload();
  const diagnostic=await watched.capture();
  const report={status:'HOLD',phase:'PREVIEW',failureStage:'PENDING_CXP_RELOAD',failureClass:'TIMEOUT_ERROR',
    failureCheck:'ASSERTION_OR_RUNTIME_FAILURE',checks:[],startupDiagnostics:[{actorRole:'direccion',stage:'PENDING_CXP_RELOAD',
      waitOutcome:'ORIGINAL_WAIT_FAILED',diagnostic:{...diagnostic,rawUrl:privateValue,actorUid:privateValue}}],
    cleanup:{status:'HOLD',remaining:0,failureClasses:[...driver.CLEANUP_FAILURE_CLASSES,'SIGNED_RESTORE',privateValue]}};
  const output=diagnosticExport(report),out=output.reports[0];
  assert.equal(output.status,'FAILED_NOT_ACCEPTED');assert.equal(out.status,'HOLD');assert.equal(out.failureClass,'TIMEOUT_ERROR');
  assert.equal(out.cleanupStatus,'HOLD');assert.equal(out.remaining,0);
  assert.deepEqual(out.cleanupFailureClasses,[...driver.CLEANUP_FAILURE_CLASSES]);
  assert.equal(out.startupDiagnostics[0].diagnostic.document.providerPresent,false);
  assert.equal(out.startupDiagnostics[0].diagnostic.document.appPresent,true);
  assert.equal(out.startupDiagnostics[0].waitOutcome,'ORIGINAL_WAIT_FAILED');
  assert.equal(JSON.stringify(output).includes(privateValue),false);
});

test('untrusted snapshot identity, stage, state and arbitrary restoration text remain redacted',()=>{
  const out=diagnosticExport({status:'HOLD',phase:'PREVIEW',checks:[],startupDiagnostics:[{actorRole:privateValue,
    stage:privateValue,waitOutcome:privateValue,diagnostic:{sourceSha:privateValue,buildId:privateValue,
      actorRole:privateValue,stage:privateValue,document:{providerPresent:privateValue,appPresent:privateValue},rawHtml:privateValue}}],
    cleanup:{status:'HOLD',remaining:0,failureClasses:[privateValue]}}).reports[0];
  assert.equal(out.startupDiagnostics[0].actorRole,'UNKNOWN_ACTOR');assert.equal(out.startupDiagnostics[0].stage,'UNKNOWN_STAGE');
  assert.equal(out.startupDiagnostics[0].diagnostic.document.providerPresent,null);
  assert.equal(out.startupDiagnostics[0].diagnostic.status,'UNAVAILABLE');assert.equal(out.cleanupStatus,'HOLD');
  assert.deepEqual(out.cleanupFailureClasses,[]);assert.equal(JSON.stringify(out).includes(privateValue),false);
});

test('all new QA owners belong to exact build inputs and both causal suites execute during immutable build',()=>{
  const release=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  const yaml=fs.readFileSync(path.join(__dirname,'../.github/workflows/gravicentra-release-delta-66-package.yml'),'utf8');
  for(const name of ['gravicentra-i6-6-startup-readiness-diagnostics.cjs','gravicentra-i6-6-startup-readiness-diagnostics.test.cjs',
    'gravicentra-i6-6-advisor-startup-diagnostics.test.cjs'])assert.ok(release.PINNED_OWNER_PATHS.includes('tools/'+name));
  assert.match(yaml,/node --test tools\/gravicentra-i6-6-startup-readiness-diagnostics\.test\.cjs tools\/gravicentra-i6-6-advisor-startup-diagnostics\.test\.cjs/);
});
