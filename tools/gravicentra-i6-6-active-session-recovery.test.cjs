'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {test} = require('node:test');
const authSource = fs.readFileSync('orbit360-platform/core/auth-product-runtime-p0.js', 'utf8');
const bootstrapSource = fs.readFileSync('orbit360-platform/core/backend-product-readonly-bootstrap-p0.js', 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

function sessionPage(){
  const hint = {
    style: {}, button:null,
    set textContent(value){ this.text=value; this.button=null; },
    appendChild(button){this.button=button;}
  };
  const login={style:{}, classList:{remove(){}}};
  const document={
    documentElement:{setAttribute(){}, removeAttribute(){}}, body:{classList:{add(){}}},
    getElementById(id){return {login, 'login-error':hint}[id] || null;},
    querySelector(selector){return selector==='.lg-box'?{}:null;},
    querySelectorAll(){return [hint];},
    createElement(){return {addEventListener(event,fn){this[event]=fn;}};}
  };
  let currentUser = {uid:'fixture',emailVerified:true}, activations=0, identityReads=0, available=false;
  const provider={enabled:()=>true,initializeAuth:async()=>{},initialUser:async()=>{identityReads++;return currentUser;}};
  const Orbit={productRuntimeBrowserProvidersP0:provider, productAppP0:{activate:async()=>{
    activations++;
    if(!available)throw new Error('MEMBERSHIP_FAILED');
  }}};
  const window={Orbit,location:{hostname:'ays-orbit-360-lab--gi-i66-rc-0000-fixture.web.app'},
    __ORBIT360_PRODUCT_PUBLIC_CONFIG__:{scopedReadPreviewCandidate:true}};
  vm.runInNewContext(authSource,{window,location:window.location,Orbit,document,console:{warn(){}},Promise});
  Orbit.auth.init();
  return {hint, setAvailable(){available=true;}, endSession(){currentUser=null;},
    counts:()=>({activations,identityReads})};
}

test('retries with the existing authenticated identity and verifies membership again on every attempt',async()=>{
  const page=sessionPage();
  await flush();
  assert.equal(page.hint.button.textContent,'Reintentar con esta sesión');
  const retry=page.hint.button;
  retry.click();
  retry.click();
  await flush();
  assert.deepEqual(page.counts(),{activations:2,identityReads:2});
  assert.ok(page.hint.button,'membership denial still blocks the shell');
  page.setAvailable();
  page.hint.button.click();
  await flush();
  assert.deepEqual(page.counts(),{activations:3,identityReads:3});
  assert.equal(page.hint.button,null);
});

test('an expired session cannot enter the shell through the retry button',async()=>{
  const page=sessionPage();
  await flush();
  page.endSession();
  page.hint.button.click();
  await flush();
  assert.deepEqual(page.counts(),{activations:1,identityReads:2});
});

test('membership diagnostics expose only recognized failure categories',()=>{
  const fn=bootstrapSource.match(/  function safeFailureDetail\(error, store\) \{[\s\S]*?\n  \}/);
  assert.ok(fn);
  const detail=vm.runInNewContext('('+fn[0]+')',{text:v=>String(v||'')});
  for(const [code, result] of Object.entries({'functions/permission-denied':'FUNCTION_PERMISSION_DENIED',
    'functions/deadline-exceeded':'FUNCTION_DEADLINE_EXCEEDED','functions/unavailable':'FUNCTION_UNAVAILABLE',
    'functions/unauthenticated':'FUNCTION_UNAUTHENTICATED','functions/internal':'FUNCTION_INTERNAL'})){
    assert.equal(detail({code,message:'private membership detail'},null),result);
  }
  assert.equal(detail({code:'unsupported',message:'private membership detail'},null),'NONE');
  assert.equal(detail(new Error('PROTECTED_BOOTSTRAP_MEMBERSHIP_INVALID'),null),'MEMBERSHIP_INVALID');
});
