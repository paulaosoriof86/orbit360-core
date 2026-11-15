'use strict';
// Behavioral checks for safe failure evidence; no authentication, network or business writes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const driver=require('./gravicentra-i6-6-advisor-payables-signed-uat.cjs');
test('finance actionability snapshot keeps structural evidence and excludes arbitrary DOM identity or text',()=>{
  const secret='PRIVATE_CUSTOMER_TOKEN_example.invalid';
  const snapshot=driver.safeFinanceUiSnapshot({snapshotStatus:'CAPTURED',route:'FINANZAS',tabCount:1,
    tabConnected:true,tabVisible:true,tabEnabled:true,rect:{x:25.6,y:-3.2,width:110.49,height:30.75,secret},
    centerInViewport:true,targetReceivesPointer:false,topTag:'DIV',topId:secret,
    topClasses:['open',secret,'drawer-back','open'],legalOverlayPresent:true,legalOverlayAtTarget:true,
    legalOverlayCount:1,modalCount:1,authRestoring:false,text:secret,url:'https://'+secret,legalScope:'user:'+secret});
  assert.equal(snapshot.snapshotStatus,'CAPTURED');assert.equal(snapshot.route,'FINANZAS');assert.equal(snapshot.tabCount,1);
  assert.deepEqual(snapshot.rect,{x:26,y:-3,width:110,height:31});
  assert.equal(snapshot.topId,null);assert.deepEqual(snapshot.topClasses,['drawer-back','open']);
  assert.equal(snapshot.legalOverlayAtTarget,true);assert.equal(snapshot.targetReceivesPointer,false);
  assert.doesNotMatch(JSON.stringify(snapshot),/PRIVATE_CUSTOMER|example\.invalid|https|legalScope|"text"|"secret"/);
});
test('finance diagnostic sanitizer rejects malformed geometry, enum values and forged actionability fields',()=>{
  const secret='PRIVATE_MESSAGE_EMAIL_TOKEN';
  const snapshot=driver.safeFinanceUiSnapshot({snapshotStatus:secret,route:secret,tabCount:1.5,
    tabConnected:secret,rect:{x:Infinity,y:NaN,width:123456789,height:secret},topTag:secret,
    topId:secret,topClasses:[secret],legalOverlayCount:-1,modalCount:10001});
  assert.equal(snapshot.snapshotStatus,'UNAVAILABLE');assert.equal(snapshot.route,'UNKNOWN');
  assert.equal(snapshot.tabCount,null);assert.equal(snapshot.tabConnected,null);
  assert.deepEqual(snapshot.rect,{x:null,y:null,width:null,height:null});
  assert.equal(snapshot.topTag,null);assert.equal(snapshot.legalOverlayCount,null);assert.equal(snapshot.modalCount,null);
  const out=driver.safeFinanceUiDiagnostics({beforeClick:snapshot,onFailure:{snapshotStatus:'CAPTURED',route:'FINANZAS'},
    actionability:{pointerInterception:true,detached:secret,notVisible:false,message:secret},error:secret,actorUid:secret});
  assert.equal(out.actionability.pointerInterception,true);assert.equal(out.actionability.detached,false);
  assert.deepEqual(Object.keys(out).sort(),['actionability','beforeClick','onFailure']);
  assert.doesNotMatch(JSON.stringify(out),/PRIVATE_MESSAGE|actorUid|"message"|"error"/);
});
test('click diagnostics classify Playwright actionability without retaining the raw exception',()=>{
  const evidence=driver.safeClickActionability({message:'PRIVATE_SCOPE user@example.invalid token=SECRET\n<div> intercepts pointer events\nelement is not stable\nelement is outside of the viewport'});
  assert.deepEqual(evidence,{pointerInterception:true,detached:false,notVisible:false,notEnabled:false,notStable:true,outsideViewport:true});
  assert.doesNotMatch(JSON.stringify(evidence),/PRIVATE_SCOPE|user@|SECRET|<div>/);
});
test('finance DOM capture sanitizes captured data and unavailable diagnostics cannot replace a click failure',async()=>{
  let calls=0;
  const captured=await driver.captureFinanceUiSnapshot({evaluate:async fn=>{calls+=1;assert.equal(typeof fn,'function');return{snapshotStatus:'CAPTURED',route:'FINANZAS',topId:'SECRET',tabCount:1,legalOverlayPresent:true};}});
  assert.equal(calls,1);assert.equal(captured.snapshotStatus,'CAPTURED');assert.equal(captured.topId,null);
  const unavailable=await driver.captureFinanceUiSnapshot({evaluate:async()=>{throw Error('SECRET_ERROR_TOKEN');}});
  assert.equal(unavailable.snapshotStatus,'UNAVAILABLE');assert.equal(unavailable.legalOverlayPresent,null);
  assert.doesNotMatch(JSON.stringify(unavailable),/SECRET/);
});
test('failed-preview artifact transports sanitized click evidence and exact source location through the workflow code',()=>{
  const vm=require('node:vm');
  const yaml=fs.readFileSync(path.join(__dirname,'../.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml'),'utf8');
  const section=yaml.split('- name: Preserve sanitized failure diagnostics without an acceptance proof')[1].split('- name: Upload diagnostics only')[0];
  const code=section.split("node - <<'NODE'\n")[1].split('\n          NODE')[0].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
  const secret='PRIVATE_ACTOR_CUSTOMER_TOKEN';
  const report={status:'HOLD',phase:'PREVIEW',failureStage:'FINANCE_UI_HYDRATION',failureClass:'TIMEOUT_ERROR',
    failureLocation:{file:'gravicentra-i6-6-advisor-payables-signed-uat.cjs',line:261,column:60},
    financeUiDiagnostics:{beforeClick:{snapshotStatus:'CAPTURED',route:'FINANZAS',tabCount:1,legalOverlayPresent:true,topId:secret,text:secret},
      onFailure:{snapshotStatus:'CAPTURED',route:secret,legalOverlayAtTarget:true},actionability:{pointerInterception:true,message:secret},actorUid:secret},
    checks:[{name:'EXACT_SOURCE',status:'PASS'}],cleanup:{status:'PASS',remaining:0},rawError:secret};
  let written;
  const fakeFs={existsSync:()=>true,readFileSync:()=>JSON.stringify(report),writeFileSync:(name,value)=>{assert.equal(name,'/tmp/qa/i66-preview-failure-diagnostic.json');written=JSON.parse(value);}};
  vm.runInNewContext(code,{require:name=>{
    if(name==='node:fs')return fakeFs;if(name==='node:path')return path;
    if(name==='./tools/gravicentra-i6-6-advisor-payables-signed-uat.cjs')return driver;
    throw Error('UNEXPECTED_DIAGNOSTIC_DEPENDENCY');
  },process:{env:{RUNNER_TEMP:'/tmp/qa',GITHUB_RUN_ID:'71',SOURCE_SHA:'a'.repeat(40)}}});
  assert.equal(written.status,'FAILED_NOT_ACCEPTED');assert.equal(written.reports.length,1);
  assert.deepEqual(written.reports[0].failureLocation,report.failureLocation);
  assert.equal(written.reports[0].financeUiDiagnostics.beforeClick.legalOverlayPresent,true);
  assert.equal(written.reports[0].financeUiDiagnostics.onFailure.legalOverlayAtTarget,true);
  assert.equal(written.reports[0].financeUiDiagnostics.actionability.pointerInterception,true);
  assert.equal(written.reports[0].remaining,0);
  assert.doesNotMatch(JSON.stringify(written),/PRIVATE_ACTOR|rawError|actorUid|"message"/);
});
