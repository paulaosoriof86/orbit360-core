'use strict';
// Pure synthetic fixtures and protocol mocks. No Firebase, browser login, real
// records, remote calls, Auth changes, or modification of historical tests.
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const fs=require('node:fs'),path=require('node:path'),driver=require('./gravicentra-i6-6-advisor-payables-signed-uat.cjs');
const cfg=driver.configuration({I66_SOURCE_SHA:'a'.repeat(40),I66_PREVIEW_ORIGIN:'https://ays-orbit-360-lab--gi-i66-rc-123-abcd.web.app'});
const fx=driver.withAssignmentFixtures(driver.signedDocumentaryFixtures('b4003qa_i66_cxp_browser_observability'));
const steps=driver.assignmentStepsFor(fx,'qa-only-actor',false),catalog=driver.browserDenialCatalog(fx,steps);
const endpoint='https://'+cfg.region+'-ays-orbit-360-lab.cloudfunctions.net/'+cfg.functionName;
const secret='CUSTOMER_AND_TOKEN_MUST_NOT_SURVIVE';
const changed=JSON.parse(JSON.stringify(fx.specs[0]));changed.lines[0].ordinaryCommission=38.66;
changed.lines[0].components.find(row=>row.coverageCode==='GAME').ordinaryCommission=35.60;
const inputs={
  OPERATIVE_CXP:{advisorPayable:fx.specs[0]},OPERATIVE_ASSIGNMENT:{advisorAssignmentCorrection:steps[0].spec},
  ADVISOR_CONFLICT:{advisorPayable:{...fx.specs[0],advisorId:fx.ids.advisor60}},SOURCE_REINTERPRETATION:{advisorPayable:changed},
  HISTORICAL_PAYABLE:{advisorPayable:fx.historical[0]},HISTORICAL_COMMISSION:{advisorPayable:fx.historical[1]},
  PROTECTED_COMMISSION:{mutations:[{collection:'comisiones',id:fx.ids.oldCommission,action:'update',payload:{estado:'liquidada',__syntheticQa:true}}]},
  PROTECTED_PAID_TOGGLE:{mutations:[{collection:'finmovs',id:fx.plans[0].payable.id,action:'update',payload:{estado:'pagado',pagada:true,__syntheticQa:true}}]}
};
const clone=value=>JSON.parse(JSON.stringify(value));
function harness(actorRole,options={}){
  let stage='SIGNED_SESSION';
  return {actorRole,setStage:value=>{stage=value;},ledger:driver.createBrowserErrorLedger({cfg,actorRole,getStage:()=>stage,catalog,...options})};
}
function wire(item,id=item.id){return {requestId:id,type:'Fetch',request:{url:endpoint,method:'POST',
  postData:JSON.stringify({data:{tenantId:'alianzas-soluciones',activeRole:item.actorRole==='direccion'?'Dirección':'Operativo',...inputs[item.id]}})}};}
function response(item,id=item.id){return {requestId:id,type:'Fetch',response:{url:endpoint,status:item.httpStatus}};}
function body(item,reason=item.reason){return JSON.stringify({error:{status:item.errorStatus,message:secret,details:{reason}}});}
function sdk(item,reason=item.reason){return {ok:false,code:'functions/'+item.code,reason};}
function start(h,item){h.setStage(item.stage);return h.ledger.expectDenial(inputs[item.id],item.code,item.reason);}
async function verified(h,item,{console=true,late=false}={}){
  const token=start(h,item);h.ledger.onRequest(wire(item));h.ledger.onResponse(response(item));
  if(console&&!late){h.ledger.onLog({level:'error',source:'network',networkRequestId:item.id,url:endpoint,text:secret});h.ledger.onPageConsole('error');}
  h.ledger.onBody(item.id,body(item));await h.ledger.confirmDenial(token,sdk(item),10);
  if(console&&late){h.setStage('SYNTHETIC_RESTORE');h.ledger.onLog({level:'error',source:'network',networkRequestId:item.id,url:endpoint,text:secret});h.ledger.onPageConsole('error');}
}
async function complete(options={}){
  const direction=harness('direccion'),operator=harness('operativo');
  for(const item of catalog)await verified(item.actorRole==='direccion'?direction:operator,item,options);
  return {direction,operator,report:()=>driver.browserObservabilityReport([direction.ledger,operator.ledger])};
}
for(const item of catalog)test('exact owned negative command is attributable: '+item.id,async()=>{
  const h=harness(item.actorRole);await verified(h,item);const result=h.ledger.summary();
  assert.equal(result.verifiedExpectedDenials,1);assert.equal(result.unexpectedConsoleErrors,0);assert.equal(result.unexpectedHttpErrors,0);
  assert.equal(result.telemetryFailures,0);assert.equal(result.expectedNetworkConsoleErrors,1);
  assert.equal(result.denials.find(row=>row.denialId===item.id).status,'PASS');assert.doesNotMatch(JSON.stringify(result),new RegExp(secret));
});
test('two actors/eight exact HTTP+SDK denials revalidate independently, including delayed native console events',async()=>{
  const h=await complete({late:true}),report=h.report();assert.equal(report.status,'PASS');assert.equal(driver.validateBrowserObservability(report),true);
  assert.deepEqual(report.totals,{expectedDenials:8,verifiedExpectedDenials:8,observedConsoleErrors:8,capturedConsoleErrors:8,
    expectedNetworkConsoleErrors:8,unexpectedConsoleErrors:0,pageErrorCount:0,unexpectedHttpErrors:0,telemetryFailures:0});
  assert.deepEqual(report.actors.map(row=>[row.actorRole,row.verifiedExpectedDenials]),[['direccion',6],['operativo',2]]);
});
test('verified HTTP negatives do not require Chromium to emit a console event',async()=>{
  const h=await complete({console:false}),report=h.report();assert.equal(report.status,'PASS');driver.validateBrowserObservability(report);
  assert.equal(report.totals.observedConsoleErrors,0);assert.equal(report.totals.verifiedExpectedDenials,8);
});
test('catalog accepts only unchanged deterministic owned fixtures, not arbitrary QA flags or prefixes',()=>{
  for(const mutate of [
    value=>{value.rows[0][1].__syntheticQa=false;},value=>{value.rows[0][1].tenantId='another';},
    value=>{value.rows[0][1].id='b4003qa_other_owned_by_somebody_else';},
    value=>{value.specs[0].lines[0].polizaId='real-policy';},value=>{value.plans[0].payable.id='real-cxp';}
  ]){const value=clone(fx);mutate(value);assert.throws(()=>driver.browserDenialCatalog(value,steps),/DENIAL_FIXTURE_SCOPE/);}
  const wrongSteps=clone(steps);wrongSteps[0].spec.clientId='different-client';assert.throws(()=>driver.browserDenialCatalog(fx,wrongSteps),/DENIAL_FIXTURE_SCOPE/);
});
test('wrong actor, stage, command, expected code/reason and duplicate registration acquire no exception',()=>{
  const item=catalog[0],h=harness('operativo');h.setStage(item.stage);
  for(const [input,code,reason] of [[{...inputs[item.id],unowned:true},item.code,''],[inputs[item.id],'failed-precondition',''],[inputs[item.id],item.code,'made-up']])
    assert.throws(()=>h.ledger.expectDenial(input,code,reason),/DENIAL_HTTP_PROOF_HOLD/);
  const other=harness('direccion');other.setStage(item.stage);assert.throws(()=>other.ledger.expectDenial(inputs[item.id],item.code,''));
  h.setStage('LEGACY_GUARDS');assert.throws(()=>h.ledger.expectDenial(inputs[item.id],item.code,''));
  h.setStage(item.stage);h.ledger.expectDenial(inputs[item.id],item.code,'');assert.throws(()=>h.ledger.expectDenial(inputs[item.id],item.code,''));
  assert.throws(()=>harness('superadmin'),/DENIAL_ACTOR_SCOPE/);
});
const wireMutations={
  origin:event=>{event.request.url='https://foreign.example/'+cfg.functionName;},
  live:event=>{event.request.url='https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360ProductOperationalCommand';},
  method:event=>{event.request.method='GET';},malformed:event=>{event.request.postData='not-json';},
  tenant:event=>{const p=JSON.parse(event.request.postData);p.data.tenantId='another';event.request.postData=JSON.stringify(p);},
  role:event=>{const p=JSON.parse(event.request.postData);p.data.activeRole='Dirección';event.request.postData=JSON.stringify(p);},
  policy:event=>{const p=JSON.parse(event.request.postData);p.data.advisorPayable.lines[0].polizaId='b4003qa_unknown';event.request.postData=JSON.stringify(p);},
  extra:event=>{const p=JSON.parse(event.request.postData);p.data.extra='same-url-not-same-command';event.request.postData=JSON.stringify(p);},
  envelope:event=>{const p=JSON.parse(event.request.postData);p.extra=true;event.request.postData=JSON.stringify(p);}
};
for(const [name,mutate] of Object.entries(wireMutations))test('400/403 is not expected with nonexact wire '+name,async()=>{
  const h=harness('operativo'),item=catalog[0],token=start(h,item),request=wire(item);mutate(request);
  h.ledger.onRequest(request);h.ledger.onResponse(response(item));h.ledger.onBody(item.id,body(item));
  await assert.rejects(h.ledger.confirmDenial(token,sdk(item),1),/DENIAL_HTTP_PROOF_HOLD/);
  assert.equal(h.ledger.summary().verifiedExpectedDenials,0);assert.equal(h.ledger.summary().unexpectedHttpErrors,1);
});
for(const [name,change] of Object.entries({
  http200:({reply})=>{reply.response.status=200;},http401:({reply})=>{reply.response.status=401;},
  http500:({reply})=>{reply.response.status=500;},
  wrongStatus:value=>{value.body=JSON.stringify({error:{status:'UNAUTHENTICATED'}});},
  malformed:value=>{value.body='not json '+secret;},successfulBody:value=>{value.body=JSON.stringify({data:{ok:true}});},
  mixedBody:value=>{value.body=JSON.stringify({error:{status:'PERMISSION_DENIED'},data:{ok:true}});},
  unavailable:value=>{value.body=null;},huge:value=>{value.body='x'.repeat(131073);},
  wrongSdk:value=>{value.out.code='malicious-prefix/permission-denied';},successSdk:value=>{value.out.ok=true;},
  reasonMismatch:value=>{value.out.reason=secret;}
}))test('transport and SDK evidence fail closed: '+name,async()=>{
  const h=harness('operativo'),item=catalog[0],token=start(h,item),value={reply:response(item),body:body(item),out:sdk(item)};change(value);
  h.ledger.onRequest(wire(item));h.ledger.onResponse(value.reply);
  if(value.body===null)h.ledger.onBodyUnavailable(item.id);else h.ledger.onBody(item.id,value.body);
  await assert.rejects(h.ledger.confirmDenial(token,value.out,1),/DENIAL_HTTP_PROOF_HOLD/);
  assert.equal(h.ledger.summary().verifiedExpectedDenials,0);assert.equal(h.ledger.summary().status,'HOLD');assert.doesNotMatch(JSON.stringify(h.ledger.summary()),new RegExp(secret));
});
test('server reason must match the exact specified business-negative reason',async()=>{
  const item=catalog.find(row=>row.id==='ADVISOR_CONFLICT'),h=harness('direccion'),token=start(h,item);
  h.ledger.onRequest(wire(item));h.ledger.onResponse(response(item));h.ledger.onBody(item.id,body(item,'OTHER_REASON'));
  await assert.rejects(h.ledger.confirmDenial(token,sdk(item),1));assert.equal(h.ledger.summary().status,'HOLD');
});
test('nonpublic reason can correlate in memory without appearing in diagnostics',async()=>{
  const h=harness('operativo'),item=catalog[0],token=start(h,item);h.ledger.onRequest(wire(item));h.ledger.onResponse(response(item));
  h.ledger.onBody(item.id,body(item,secret));await h.ledger.confirmDenial(token,sdk(item,secret),10);
  assert.equal(h.ledger.summary().verifiedExpectedDenials,1);assert.doesNotMatch(JSON.stringify(h.ledger.summary()),new RegExp(secret));
});
for(const [name,event] of Object.entries({unattributed:{source:'network'},differentRequest:{source:'network',networkRequestId:'unrelated'},
  appLog:{source:'javascript',networkRequestId:'OPERATIVE_CXP'},security:{source:'security',networkRequestId:'OPERATIVE_CXP'}}))
  test('native console error is not exempt by proximity, text or source: '+name,async()=>{
    const h=await complete();h.operator.ledger.onLog({level:'error',url:endpoint,text:'403 PERMISSION_DENIED '+secret,...event});h.operator.ledger.onPageConsole('error');
    const report=h.report();assert.equal(report.status,'HOLD');assert.equal(report.totals.unexpectedConsoleErrors,1);assert.throws(()=>driver.validateBrowserObservability(report));
  });
test('a second console error for one verified request is not silently whitelisted',async()=>{
  const h=await complete();h.operator.ledger.onLog({level:'error',source:'network',networkRequestId:'OPERATIVE_CXP',url:endpoint});h.operator.ledger.onPageConsole('error');
  assert.equal(h.report().totals.unexpectedConsoleErrors,1);assert.equal(h.report().status,'HOLD');
});
test('application console error remains HOLD even if it says permission-denied',async()=>{
  const h=await complete();h.direction.setStage('SYNTHETIC_RESTORE');
  h.direction.ledger.onRuntimeConsole({type:'error',args:[{type:'string',value:'functions/permission-denied '+secret}],
    stackTrace:{callFrames:[{url:cfg.origin+'/core/product-runtime-browser-providers-p0.js?token='+secret,lineNumber:211,columnNumber:7,functionName:secret}]}});
  h.direction.ledger.onPageConsole('error');const report=h.report();assert.equal(report.status,'HOLD');assert.equal(report.totals.unexpectedConsoleErrors,1);
  const row=report.actors[0].events.find(event=>event.eventType==='APPLICATION_CONSOLE_ERROR');
  assert.equal(row.stage,'SYNTHETIC_RESTORE');assert.equal(row.endpointClass,'FIRST_PARTY_SCRIPT');assert.equal(row.line,211);
  assert.deepEqual(row.argumentTypes,['string']);assert.doesNotMatch(JSON.stringify(report),new RegExp(secret));
});
test('page errors and assert console errors always fail and retain only class, role and controlled stage',async()=>{
  const h=await complete();h.direction.ledger.onPageError(new Error(secret));h.operator.ledger.onRuntimeConsole({type:'assert',args:[{type:secret,value:secret}]});h.operator.ledger.onPageConsole('assert');
  const report=h.report();assert.equal(report.status,'HOLD');assert.equal(report.totals.pageErrorCount,1);assert.equal(report.totals.unexpectedConsoleErrors,1);
  assert.doesNotMatch(JSON.stringify(report),new RegExp(secret));
});
for(const count of [0,2])test('unmatched Playwright/CDP count cannot silently pass: '+count,async()=>{
  const h=await complete();if(count===0)h.direction.ledger.onRuntimeConsole({type:'error'});else h.direction.ledger.onPageConsole('error');
  assert.equal(h.report().status,'HOLD');assert.ok(h.report().totals.telemetryFailures>0);
  assert.ok(h.report().actors[0].events.some(event=>event.code==='CONSOLE_EVENT_COVERAGE_MISMATCH'));
});
for(const [kind,url,status] of [['callable',endpoint,403],['asset',cfg.origin+'/missing.js',404],['external','https://foreign.example/x',400]])
  test('unexpected HTTP '+kind+' remains HOLD independent of status family',async()=>{
    const h=await complete();h.direction.ledger.onRequest({requestId:'unexpected',type:'Script',request:{url,method:'GET'}});
    h.direction.ledger.onResponse({requestId:'unexpected',response:{url,status}});assert.equal(h.report().status,'HOLD');assert.equal(h.report().totals.unexpectedHttpErrors,1);
  });
test('cancelled navigation listeners are recorded, but cancellation never erases an HTTP error',async()=>{
  const h=await complete();h.direction.ledger.onRequest({requestId:'listener',type:'Fetch',request:{url:'https://firestore.googleapis.com/listen',method:'POST'}});
  h.direction.ledger.onLoadingFailed({requestId:'listener',canceled:true});driver.validateBrowserObservability(h.report());
  h.direction.ledger.onResponse({requestId:'listener',response:{url:'https://firestore.googleapis.com/listen',status:403}});
  assert.equal(h.report().status,'HOLD');assert.equal(h.report().totals.unexpectedHttpErrors,1);
});
test('noncancelled network failure and expected-request cancellation fail closed',async()=>{
  const h=await complete();h.direction.ledger.onLoadingFailed({requestId:'unknown',canceled:false,errorText:secret});assert.equal(h.report().status,'HOLD');
  const item=catalog[0],other=harness('operativo'),token=start(other,item);other.ledger.onRequest(wire(item));other.ledger.onLoadingFailed({requestId:item.id,canceled:true});
  await assert.rejects(other.ledger.confirmDenial(token,sdk(item),1));assert.doesNotMatch(JSON.stringify(other.ledger.summary()),new RegExp(secret));
});
test('late CORS transport failure retains observed codes and both stages but still fails after all eight denials pass',async()=>{
  const h=await complete(),ledger=h.direction.ledger;
  h.direction.setStage('FINANCE_UI_HYDRATION');
  ledger.onRequest({requestId:'scoped-reader',timestamp:100,type:'Fetch',request:{method:'POST',
    url:'https://us-east1-ays-orbit-360-lab.cloudfunctions.net/orbit360ScopedPolicyReadPreview?token='+secret,
    headers:{Authorization:secret},postData:secret}});
  h.direction.setStage('ASSIGNMENT_DOCUMENTARY_UI');
  ledger.onLoadingFailed({requestId:'scoped-reader',timestamp:102.75,canceled:false,errorText:'net::ERR_FAILED',blockedReason:'origin',
    corsErrorStatus:{corsError:'PreflightMissingAllowOriginHeader',failedParameter:secret},url:secret});
  const report=h.report(),row=report.actors[0].events.find(event=>event.eventType==='NETWORK_FAILURE');
  assert.equal(report.totals.verifiedExpectedDenials,8);assert.equal(report.totals.unexpectedHttpErrors,1);
  assert.equal(report.status,'HOLD');assert.equal(row.classification,'UNEXPECTED');assert.equal(row.stage,'FINANCE_UI_HYDRATION');
  assert.deepEqual(row.networkFailureDiagnostic,{netError:'net::ERR_FAILED',blockedReason:'origin',corsError:'PreflightMissingAllowOriginHeader',
    requestMethod:'POST',responseObserved:false,responseStatus:null,responseExtraInfoStatus:null,requestStage:'FINANCE_UI_HYDRATION',observedStage:'ASSIGNMENT_DOCUMENTARY_UI',elapsedMs:2750});
  assert.throws(()=>driver.validateBrowserObservability(report),/BROWSER_OBSERVABILITY_HOLD/);
  assert.doesNotMatch(JSON.stringify(report),new RegExp(secret));assert.doesNotMatch(JSON.stringify(row),/failedParameter|errorText|Authorization|https:/);
});
test('a received response is distinct from no response and does not excuse the later network failure',async()=>{
  for(const status of [204,0]){
    const h=await complete(),ledger=h.direction.ledger;
    h.direction.setStage('FINANCE_UI_HYDRATION');ledger.onRequest({requestId:'partial',timestamp:2,type:'Fetch',request:{url:cfg.origin+'/reader',method:'GET'}});
    ledger.onResponse({requestId:'partial',response:{url:cfg.origin+'/reader',status}});
    h.direction.setStage('ASSIGNMENT_DOCUMENTARY_UI');ledger.onLoadingFailed({requestId:'partial',timestamp:3,errorText:'net::ERR_CONNECTION_RESET'});
    const report=h.report(),detail=report.actors[0].events.find(event=>event.eventType==='NETWORK_FAILURE').networkFailureDiagnostic;
    assert.equal(detail.responseObserved,true);assert.equal(detail.responseStatus,status===204?204:null);
    assert.equal(detail.corsError,null);assert.equal(detail.blockedReason,null);assert.equal(detail.elapsedMs,1000);
    assert.equal(report.status,'HOLD');assert.throws(()=>driver.validateBrowserObservability(report));
  }
});
test('unmatched failure and private suffixes remain unknown without manufacturing response or duration',async()=>{
  const h=await complete();h.direction.setStage('ASSIGNMENT_DOCUMENTARY_UI');
  h.direction.ledger.onLoadingFailed({requestId:'unseen',timestamp:500,errorText:'net::ERR_FAILED '+secret,blockedReason:'origin '+secret,
    corsErrorStatus:{corsError:'MissingAllowOriginHeader '+secret,failedParameter:secret},request:{method:'POST'}});
  const report=h.report(),detail=report.actors[0].events.find(event=>event.eventType==='NETWORK_FAILURE').networkFailureDiagnostic;
  assert.deepEqual(detail,{netError:null,blockedReason:null,corsError:null,requestMethod:null,responseObserved:null,responseStatus:null,responseExtraInfoStatus:null,
    requestStage:'UNKNOWN_STAGE',observedStage:'ASSIGNMENT_DOCUMENTARY_UI',elapsedMs:null});
  assert.equal(report.status,'HOLD');assert.throws(()=>driver.validateBrowserObservability(report));assert.doesNotMatch(JSON.stringify(report),new RegExp(secret));
});
test('duration uses only matching monotonic observations and preserves missing, reversed and over-bound times as null',()=>{
  for(const [started,failed,expected] of [[undefined,5,null],[null,5,null],[10,9,null],[10,610.001,null],[10,Infinity,null],[0,0,0],[10,610,600000]]){
    const h=harness('direccion');h.setStage('FINANCE_UI_HYDRATION');
    h.ledger.onRequest({requestId:'timed',timestamp:started,type:'Fetch',request:{url:cfg.origin,method:secret}});
    h.ledger.onLoadingFailed({requestId:'timed',timestamp:failed,errorText:'net::ERR_TIMED_OUT'});
    const detail=h.ledger.summary().events[0].networkFailureDiagnostic;
    assert.equal(detail.elapsedMs,expected);assert.equal(detail.requestMethod,null);assert.equal(detail.responseObserved,false);assert.equal(detail.responseStatus,null);
  }
});
test('canceled requests keep the exact historical event schema even when CDP provides diagnostic fields',async()=>{
  const h=await complete(),ledger=h.direction.ledger;h.direction.setStage('PENDING_CXP_RELOAD');
  ledger.onRequest({requestId:'canceled-listener',timestamp:1,type:'Fetch',request:{url:'https://firestore.googleapis.com/listen',method:'POST'}});
  ledger.onLoadingFailed({requestId:'canceled-listener',timestamp:2,canceled:true,errorText:'net::ERR_ABORTED',blockedReason:'origin',
    corsErrorStatus:{corsError:'MissingAllowOriginHeader',failedParameter:secret}});
  const report=h.report(),row=report.actors[0].events.find(event=>event.eventType==='NETWORK_CANCELLED');
  assert.deepEqual(Object.keys(row).sort(),['eventType','actorRole','stage','requestKey','endpointClass','resourceType'].sort());
  assert.equal(report.status,'PASS');driver.validateBrowserObservability(report);assert.doesNotMatch(JSON.stringify(report),new RegExp(secret));
});
test('CORS extra-info status survives without a responseReceived event and never reads headers or grants a denial',async()=>{
  for(const statusCode of [429,503,500])for(const late of [false,true]){
    const h=await complete(),ledger=h.direction.ledger;h.direction.setStage('FINANCE_UI_HYDRATION');
    ledger.onRequest({requestId:'cors-reader',timestamp:10,type:'Fetch',request:{url:cfg.origin+'/reader',method:'POST'}});
    const extra={requestId:'cors-reader',statusCode,get headers(){throw Error(secret);},get blockedCookies(){throw Error(secret);}};
    if(!late)ledger.onResponseExtraInfo(extra);
    h.direction.setStage('ASSIGNMENT_DOCUMENTARY_UI');
    ledger.onLoadingFailed({requestId:'cors-reader',timestamp:12,errorText:'net::ERR_FAILED',corsErrorStatus:{corsError:'MissingAllowOriginHeader',failedParameter:secret}});
    if(late){
      assert.equal(ledger.summary().events.find(event=>event.eventType==='NETWORK_FAILURE').networkFailureDiagnostic.responseExtraInfoStatus,null);
      ledger.onResponseExtraInfo(extra);
    }
    const report=h.report(),detail=report.actors[0].events.find(event=>event.eventType==='NETWORK_FAILURE').networkFailureDiagnostic;
    assert.equal(detail.responseObserved,false);assert.equal(detail.responseStatus,null);assert.equal(detail.responseExtraInfoStatus,statusCode);
    assert.equal(report.totals.unexpectedHttpErrors,1);assert.equal(report.status,'HOLD');assert.throws(()=>driver.validateBrowserObservability(report));
    assert.doesNotMatch(JSON.stringify(report),new RegExp(secret));
  }
});
test('extra-info cannot invent a request or coerce a status',()=>{
  for(const statusCode of ['503',0,600,null,secret]){
    const h=harness('direccion');h.setStage('FINANCE_UI_HYDRATION');
    h.ledger.onResponseExtraInfo({requestId:'unseen',statusCode:503});h.ledger.onLoadingFailed({requestId:'unseen',errorText:'net::ERR_FAILED'});
    assert.equal(h.ledger.summary().events[0].networkFailureDiagnostic.responseExtraInfoStatus,null);
    h.ledger.onRequest({requestId:'seen',type:'Fetch',request:{url:cfg.origin,method:'POST'}});
    h.ledger.onResponseExtraInfo({requestId:'seen',statusCode});h.ledger.onLoadingFailed({requestId:'seen',errorText:'net::ERR_FAILED'});
    assert.equal(h.ledger.summary().events[1].networkFailureDiagnostic.responseExtraInfoStatus,null);
  }
});
test('extra-info status alone cannot satisfy an expected denial response',async()=>{
  const h=harness('operativo'),item=catalog[0],token=start(h,item);
  h.ledger.onRequest(wire(item));h.ledger.onResponseExtraInfo({requestId:item.id,statusCode:item.httpStatus});h.ledger.onBody(item.id,body(item));
  await assert.rejects(h.ledger.confirmDenial(token,sdk(item),10));assert.equal(h.ledger.summary().status,'HOLD');
  assert.equal(h.ledger.summary().verifiedExpectedDenials,0);
});
test('retry, redirect and repeated native request IDs do not reuse the previous exemption',async()=>{
  for(const mode of ['retry','redirect','duplicate']){
    const h=harness('operativo'),item=catalog[0];await verified(h,item);const request=wire(item,mode==='retry'?'second-id':item.id);
    if(mode==='redirect')request.redirectResponse={status:302};h.ledger.onRequest(request);h.ledger.onResponse(response(item,request.requestId));
    assert.equal(h.ledger.summary().status,'HOLD');assert.ok(h.ledger.summary().telemetryFailures>0);
  }
});
test('diagnostic bounds and unknown stage/source are sanitized, never silent truncation',()=>{
  const h=harness('direccion',{maxEvents:2,maxRequests:1});h.setStage(secret);
  h.ledger.onRequest({requestId:'one',request:{url:'invalid',method:secret},type:secret});h.ledger.onRequest({requestId:'two',request:{url:'invalid'}});
  for(let i=0;i<4;i++)h.ledger.onLog({level:'error',source:secret,url:'https://foreign.example/'+secret+'?token='+secret,text:secret,lineNumber:-1});
  const summary=h.ledger.summary();assert.equal(summary.status,'HOLD');assert.ok(summary.telemetryFailures>0);assert.ok(summary.events.some(row=>row.code==='EVENT_LIMIT_EXCEEDED'));
  assert.doesNotMatch(JSON.stringify(summary),new RegExp(secret));assert.ok(summary.events.every(row=>row.stage==='UNKNOWN_STAGE'));
});
test('strict downstream verifier rejects tampered receipts, counters, denials and extra data',async()=>{
  const valid=(await complete()).report();
  const mutations=[
    value=>{value.status='HOLD';},value=>{value.schemaVersion='old';},value=>{value.actors.pop();},
    value=>{value.actors[0].actorRole='operativo';},value=>{value.totals.verifiedExpectedDenials=9;},value=>{value.totals.pageErrorCount=1;},
    value=>{value.actors[0].denials[0].sdkVerified=false;},value=>{value.actors[0].denials[0].httpVerified=false;},
    value=>{value.actors[0].denials[0].expectedFunctionsCode='functions/internal';},value=>{value.actors[0].denials[0].stage='SIGNED_SESSION';},
    value=>{value.actors[0].denials[0].requestKey=value.actors[1].denials[0].requestKey;},
    value=>{value.actors[0].events.shift();},value=>{value.actors[0].events[0].status=500;},
    value=>{value.actors[0].events[1].source='javascript';},value=>{value.actors[0].events[0].rawText=secret;},
    value=>{value.actors[0].denials[0].expectedReason=secret;},value=>{value.untrusted=secret;},
    value=>{value.actors[0].observedConsoleErrors=0;},value=>{value.actors[0].events.push(clone(value.actors[0].events[1]));}
  ];
  for(const mutate of mutations){const value=clone(valid);mutate(value);assert.throws(()=>driver.validateBrowserObservability(value),/BROWSER_OBSERVABILITY_HOLD/);}
});
test('missing or failed actor observations cannot produce overall PASS',()=>{
  for(const observers of [[],[harness('direccion').ledger],[harness('direccion').ledger,harness('direccion').ledger]]){
    const report=driver.browserObservabilityReport(observers);assert.equal(report.status,'HOLD');assert.throws(()=>driver.validateBrowserObservability(report));
  }
});
class FakeCdp extends EventEmitter{
  constructor(){super();this.commands=[];this.bodies=new Map();this.failBody=false;}
  async send(name,args){this.commands.push({name,args});if(name==='Network.getResponseBody'){
    if(this.failBody)throw new Error(secret);return {body:this.bodies.get(args.requestId),base64Encoded:false};
  }return {};}
}
test('CDP adapter correlates actual protocol IDs and observes without page interception or authentication changes',async()=>{
  const observers=[];
  for(const role of ['direccion','operativo']){
    const cdp=new FakeCdp(),page=new EventEmitter();let stage='SIGNED_SESSION';
    const observer=await driver.attachBrowserObservability({context:{newCDPSession:async()=>cdp},page,cfg,actorRole:role,getStage:()=>stage,catalog});observers.push(observer);
    for(const item of catalog.filter(row=>row.actorRole===role)){
      stage=item.stage;const token=observer.expectDenial(inputs[item.id],item.code,item.reason);cdp.bodies.set(item.id,body(item));
      cdp.emit('Network.requestWillBeSent',wire(item));cdp.emit('Network.responseReceived',response(item));
      cdp.emit('Log.entryAdded',{entry:{level:'error',source:'network',networkRequestId:item.id,url:endpoint,text:secret}});
      page.emit('console',{type:()=> 'error',text:()=>{throw Error('Raw message must never be read');}});
      cdp.emit('Network.loadingFinished',{requestId:item.id});await observer.confirmDenial(token,sdk(item),10);
    }
    stage='SYNTHETIC_RESTORE';await observer.flush();
    assert.deepEqual(cdp.commands.slice(0,3).map(row=>row.name),['Network.enable','Log.enable','Runtime.enable']);
    assert.ok(cdp.commands.every(row=>['Network.enable','Log.enable','Runtime.enable','Network.getResponseBody','Runtime.evaluate'].includes(row.name)));
  }
  driver.validateBrowserObservability(driver.browserObservabilityReport(observers));
});
test('existing CDP extra-info listener captures only correlated status without issuing any extra protocol call',async()=>{
  const cdp=new FakeCdp();let stage='FINANCE_UI_HYDRATION';
  const observer=await driver.attachBrowserObservability({context:{newCDPSession:async()=>cdp},page:new EventEmitter(),cfg,actorRole:'direccion',getStage:()=>stage,catalog});
  const before=structuredClone(cdp.commands);
  cdp.emit('Network.requestWillBeSent',{requestId:'reader',timestamp:1,type:'Fetch',request:{url:cfg.origin+'/reader',method:'POST'}});
  stage='ASSIGNMENT_DOCUMENTARY_UI';cdp.emit('Network.loadingFailed',{requestId:'reader',timestamp:2,errorText:'net::ERR_FAILED',corsErrorStatus:{corsError:'MissingAllowOriginHeader',failedParameter:secret}});
  cdp.emit('Network.responseReceivedExtraInfo',{requestId:'reader',statusCode:503,get headers(){throw Error(secret);},get blockedCookies(){throw Error(secret);}});
  const row=observer.summary().events.find(event=>event.eventType==='NETWORK_FAILURE');
  assert.equal(row.networkFailureDiagnostic.responseExtraInfoStatus,503);assert.equal(row.networkFailureDiagnostic.responseObserved,false);
  assert.deepEqual(cdp.commands,before);assert.doesNotMatch(JSON.stringify(observer.summary()),new RegExp(secret));
});
test('body observer failures, CDP attach errors and callback exceptions are retained as safe HOLD diagnostics',async()=>{
  const item=catalog[0],cdp=new FakeCdp(),page=new EventEmitter();cdp.failBody=true;
  const observer=await driver.attachBrowserObservability({context:{newCDPSession:async()=>cdp},page,cfg,actorRole:'operativo',getStage:()=>item.stage,catalog});
  const token=observer.expectDenial(inputs[item.id],item.code,item.reason);cdp.emit('Network.requestWillBeSent',wire(item));cdp.emit('Network.responseReceived',response(item));
  cdp.emit('Network.loadingFinished',{requestId:item.id});await assert.rejects(observer.confirmDenial(token,sdk(item),10));
  cdp.emit('Network.requestWillBeSent',{requestId:'bad',get request(){throw new Error(secret);}});await observer.flush();
  assert.ok(observer.summary().events.some(row=>row.code==='DENIAL_BODY_UNAVAILABLE'));
  assert.ok(observer.summary().events.some(row=>row.code==='CDP_CALLBACK_FAILED'));
  const failed=await driver.attachBrowserObservability({context:{newCDPSession:async()=>{throw Error(secret);}},page:new EventEmitter(),cfg,actorRole:'direccion',getStage:()=>secret,catalog});
  assert.equal(failed.summary().status,'HOLD');assert.ok(failed.summary().events.some(row=>row.code==='CDP_ATTACH_FAILED'));
  assert.doesNotMatch(JSON.stringify([observer.summary(),failed.summary()]),new RegExp(secret));
});
test('stalled protocol response body and final barrier are bounded HOLD, never an infinite wait',async()=>{
  const cdp=new FakeCdp(),send=cdp.send.bind(cdp);cdp.send=(name,args)=>['Network.getResponseBody','Runtime.evaluate'].includes(name)?new Promise(()=>{}):send(name,args);
  const item=catalog[0],observer=await driver.attachBrowserObservability({context:{newCDPSession:async()=>cdp},page:new EventEmitter(),cfg,actorRole:'operativo',getStage:()=>item.stage,catalog,protocolTimeoutMs:2});
  const token=observer.expectDenial(inputs[item.id],item.code,item.reason);cdp.emit('Network.requestWillBeSent',wire(item));cdp.emit('Network.responseReceived',response(item));cdp.emit('Network.loadingFinished',{requestId:item.id});
  await assert.rejects(observer.confirmDenial(token,sdk(item),20));await observer.flush();
  const summary=observer.summary();assert.equal(summary.status,'HOLD');assert.ok(summary.events.some(row=>row.code==='DENIAL_BODY_UNAVAILABLE'));
  assert.ok(summary.events.some(row=>row.code==='CDP_BARRIER_FAILED'));
});
for(const kind of ['console','http','page','drain'])test('late '+kind+' error during/after browser close cannot retain an earlier PASS',async()=>{
  const h=await complete(),order=[],observers=[h.direction.ledger,h.operator.ledger].map(ledger=>({...ledger,
    flush:async()=>{order.push('flush');},drain:async()=>{order.push('drain');if(kind==='drain'&&ledger===h.direction.ledger)ledger.onPageError();}}));
  driver.validateBrowserObservability(h.report());
  const report=await driver.finalizeBrowserObservability(observers,async()=>{
    order.push('close');
    if(kind==='console'){h.direction.ledger.onRuntimeConsole({type:'error',args:[{type:'string',value:secret}]});h.direction.ledger.onPageConsole('error');}
    if(kind==='http')h.direction.ledger.onResponse({requestId:'late-error',response:{url:cfg.origin+'/late.js',status:404}});
    if(kind==='page')h.direction.ledger.onPageError(new Error(secret));
  });
  assert.deepEqual(order,['flush','flush','close','drain','drain']);assert.equal(report.status,'HOLD');assert.throws(()=>driver.validateBrowserObservability(report));
  assert.doesNotMatch(JSON.stringify(report),new RegExp(secret));
});
test('normal close preserves final PASS; close failure preserves diagnostics and HOLD',async()=>{
  const h=await complete(),observers=[h.direction.ledger,h.operator.ledger].map(ledger=>({...ledger,flush:async()=>{},drain:async()=>{}}));
  driver.validateBrowserObservability(await driver.finalizeBrowserObservability(observers,async()=>{}));
  const report=await driver.finalizeBrowserObservability(observers,async()=>{throw Error(secret);});
  assert.equal(report.status,'HOLD');assert.equal(report.totals.telemetryFailures,2);assert.ok(report.actors.every(actor=>actor.events.some(event=>event.code==='BROWSER_CLOSE_FAILED')));
  assert.doesNotMatch(JSON.stringify(report),new RegExp(secret));
});
test('driver final report follows synthetic restoration, browser close and capture drain with controlled failure stage',()=>{
  const source=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-advisor-payables-signed-uat.cjs'),'utf8');
  const restore=source.indexOf("stage='SYNTHETIC_RESTORE';",source.indexOf('async function main'));
  const finalSnapshot=source.indexOf('report.browserObservability=await finalizeBrowserObservability(browserObservers',restore);
  assert.ok(restore>0&&finalSnapshot>source.indexOf('EXACT_SYNTHETIC_DATA_AND_AUDIT_ABSENCE_RESTORED_MEMBERSHIP_UNCHANGED'));
  const finalizer=source.slice(source.indexOf('async function finalizeBrowserObservability'),source.indexOf('function validateBrowserObservability'));
  assert.ok(finalizer.indexOf('await closeBrowser()')<finalizer.indexOf('await observer.drain()'));
  assert.ok(finalizer.indexOf('await observer.drain()')<finalizer.indexOf('return browserObservabilityReport(observers)'));
  assert.match(source,/originalFailureStage=stage/);assert.match(source,/validateBrowserObservability\(report\.browserObservability\)/);
  assert.doesNotMatch(source,/console\.error\s*=|route\(|page\.on\('console',[^\n]*\.text\(/);
});

// Keep the product-manifest-sealed retention suite byte-identical. These four
// added cases exercise the same failure exporter here without importing a suite.
{
const advisor=driver,vm=require('node:vm'),documented=require('./gravicentra-i6-6-documented-terms-signed-check.cjs');
const clone=value=>JSON.parse(JSON.stringify(value)),secret='PRIVATE_CUSTOMER_EMAIL_TOKEN_DO_NOT_EXPORT';
const yaml=fs.readFileSync(path.join(__dirname,'../.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml'),'utf8');
const section=yaml.split('- name: Preserve sanitized failure diagnostics without an acceptance proof')[1].split('- name: Upload diagnostics only')[0];
const code=section.split("node - <<'NODE'\n")[1].split('\n          NODE')[0].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
function execute({advisor:advisorReport}){
  const name='/tmp/i66-network-retention/gravicentra-i66-advisor-payables-signed-uat-preview.json';
  const files=new Map([[name,JSON.stringify(advisorReport)]]),writes=[];let written;
  const fakeFs={existsSync:name=>files.has(name),readFileSync:name=>files.get(name),
    writeFileSync:(name,value)=>{writes.push(name);written=JSON.parse(value);}};
  vm.runInNewContext(code,{require:name=>{
    if(name==='node:fs')return fakeFs;if(name==='node:path')return path;
    if(name==='./tools/gravicentra-i6-6-advisor-payables-signed-uat.cjs')return advisor;
    if(name==='./tools/gravicentra-i6-6-documented-terms-signed-check.cjs')return documented;
    throw Error('UNEXPECTED_DIAGNOSTIC_DEPENDENCY');
  },process:{env:{RUNNER_TEMP:'/tmp/i66-network-retention',I66_PACKAGE_ROOT:'/tmp/i66-package',GITHUB_RUN_ID:'44027761291',SOURCE_SHA:'a'.repeat(40)}}});
  assert.deepEqual(writes,['/tmp/i66-network-retention/i66-preview-failure-diagnostic.json']);return written;
}
const counts={expectedDenials:8,verifiedExpectedDenials:8,observedConsoleErrors:10,capturedConsoleErrors:10,
  expectedNetworkConsoleErrors:8,unexpectedConsoleErrors:2,pageErrorCount:0,unexpectedHttpErrors:2,telemetryFailures:0};
function fixture(){
  const http={eventType:'HTTP_ERROR',actorRole:'direccion',stage:'FINANCE_UI_HYDRATION',requestKey:'b'.repeat(64),
    status:403,resourceType:'Fetch',endpointClass:'FUNCTIONS',pathSha256:'c'.repeat(64),classification:'UNEXPECTED'};
  const native={eventType:'NATIVE_CONSOLE_ERROR',actorRole:'direccion',stage:'FINANCE_UI_HYDRATION',requestKey:'b'.repeat(64),
    source:'network',endpointClass:'FUNCTIONS',pathSha256:'c'.repeat(64),line:0,classification:'UNEXPECTED'};
  return {status:'HOLD',phase:'PREVIEW',sourceSha:'a'.repeat(40),failureStage:'FINANCE_UI_HYDRATION',
    failureCheck:'ADVISOR_UAT_BROWSER_OBSERVABILITY_HOLD',failureClass:'ASSERTION_OR_RUNTIME_FAILURE',
    failureLocation:{file:'gravicentra-i6-6-advisor-payables-signed-uat.cjs',line:1104,column:90},
    checks:Array.from({length:15},(_,i)=>({name:'SYNTHETIC_CHECK_'+i,status:'PASS'})),cleanup:{status:'PASS',remaining:0},
    browserObservability:{schemaVersion:'gravicentra-i66-browser-observability-v1',status:'HOLD',totals:{...counts},actors:[
      {actorRole:'direccion',status:'HOLD',...counts,events:[http,native],denials:[{denialId:'ADVISOR_CONFLICT',actorRole:'direccion',stage:'REPLAY_AND_SOURCE_GUARDS',
        expectedHttpStatus:400,expectedFunctionsCode:'functions/failed-precondition',expectedReason:'ADVISOR_POLICY_CONFLICT',registered:true,
        requestKey:'d'.repeat(64),httpVerified:true,sdkVerified:true,status:'PASS'}]},
      {actorRole:'operativo',status:'PASS',...counts,events:[],denials:[]}
    ]}};
}
test('failure export preserves normalized network diagnosis and delayed observation without granting acceptance',()=>{
  const input=fixture(),detail={netError:'net::ERR_FAILED',blockedReason:'origin',corsError:'PreflightMissingAllowOriginHeader',
    requestMethod:'POST',responseObserved:false,responseStatus:null,responseExtraInfoStatus:503,requestStage:'FINANCE_UI_HYDRATION',observedStage:'ASSIGNMENT_DOCUMENTARY_UI',elapsedMs:2750};
  input.browserObservability.actors[0].events=[{eventType:'NETWORK_FAILURE',actorRole:'direccion',stage:'FINANCE_UI_HYDRATION',
    requestKey:'b'.repeat(64),endpointClass:'FUNCTIONS',resourceType:'Fetch',classification:'UNEXPECTED',networkFailureDiagnostic:detail}];
  const out=execute({advisor:input}),obs=out.reports[0].browserObservability;
  assert.deepEqual(obs.actors[0].events[0].networkFailureDiagnostic,detail);assert.equal(obs.status,'HOLD');assert.equal(out.status,'FAILED_NOT_ACCEPTED');
  assert.throws(()=>advisor.validateBrowserObservability(obs),/BROWSER_OBSERVABILITY_HOLD/);
});
test('second network projection removes private fields and rejects unknown values instead of false zeros',()=>{
  const input=fixture(),event={eventType:'NETWORK_FAILURE',actorRole:'direccion',stage:'FINANCE_UI_HYDRATION',
    networkFailureDiagnostic:{netError:'net::ERR_FAILED '+secret,blockedReason:'origin '+secret,corsError:secret,requestMethod:secret,
      responseObserved:secret,responseStatus:0,responseExtraInfoStatus:secret,requestStage:secret,observedStage:secret,elapsedMs:secret,
      errorText:secret,failedParameter:secret,url:'https://example.invalid/'+secret,headers:{Authorization:secret},requestBody:secret}};
  input.browserObservability.actors[0].events=[event];const out=execute({advisor:input}),row=out.reports[0].browserObservability.actors[0].events[0];
  assert.deepEqual(row.networkFailureDiagnostic,{netError:null,blockedReason:null,corsError:null,requestMethod:null,responseObserved:null,responseStatus:null,responseExtraInfoStatus:null,
    requestStage:'UNKNOWN_STAGE',observedStage:'UNKNOWN_STAGE',elapsedMs:null});
  assert.doesNotMatch(JSON.stringify(out),new RegExp(secret));assert.doesNotMatch(JSON.stringify(out),/errorText|failedParameter|https:|Authorization|requestBody/);
});
test('response and elapsed evidence cannot be coerced or invented by the failure projection',()=>{
  for(const [observed,status,duration,expectedStatus,expectedDuration] of [[false,200,0,null,0],[null,200,null,null,null],[true,204,42,204,42],
    [true,'200','42',null,null],[true,0,-1,null,null],[true,600,600001,null,null]]){
    const input=fixture();input.browserObservability.actors[0].events=[{eventType:'NETWORK_FAILURE',networkFailureDiagnostic:{
      responseObserved:observed,responseStatus:status,elapsedMs:duration}}];
    const detail=execute({advisor:input}).reports[0].browserObservability.actors[0].events[0].networkFailureDiagnostic;
    assert.equal(detail.responseObserved,observed);assert.equal(detail.responseStatus,expectedStatus);assert.equal(detail.elapsedMs,expectedDuration);
    assert.equal(detail.responseExtraInfoStatus,null);
  }
});
test('network detail is never attached to cancelled or expected PASS events during failure export',()=>{
  const input=fixture(),actor=input.browserObservability.actors[0];
  actor.events.push({eventType:'NETWORK_CANCELLED',actorRole:'direccion',stage:'SYNTHETIC_RESTORE',requestKey:'e'.repeat(64),endpointClass:'GOOGLE_API',resourceType:'Fetch'});
  const originals=clone(actor.events);
  for(const event of actor.events)event.networkFailureDiagnostic={netError:'net::ERR_FAILED',errorText:secret};
  assert.deepEqual(execute({advisor:input}).reports[0].browserObservability.actors[0].events,originals);
});
}
