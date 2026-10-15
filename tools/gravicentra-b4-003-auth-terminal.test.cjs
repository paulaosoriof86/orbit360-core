'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../orbit360-platform/core/auth-product-runtime-p0.js'),'utf8');
const providers=fs.readFileSync(path.join(__dirname,'../orbit360-platform/core/product-runtime-browser-providers-p0.js'),'utf8');
assert.ok(providers.includes("name==='orbit360ScopedPolicyReadPreview'"),'B4_003_SCOPED_READ_CALLABLE_TIMEOUT_ONLY');
assert.ok(providers.includes('{timeout:16000}'),'B4_003_SCOPED_READ_MUST_FAIL_BOUNDED');
function setup({restoredUser=null}={}){
 const attrs=new Set(),elements={},listeners={}; let error=null,signInCalls=0,activationCalls=0,restores=0;
 const classes=()=>({add(){},remove(){}});
 const mk=(v='')=>({style:{visibility:'hidden',display:''},dataset:{},value:v,textContent:'',disabled:false,classList:classes(),querySelector(){return null},addEventListener(){}});
 const login=mk(),form=mk(),button=mk(),user=mk(),pass=mk(),small=mk(),box=mk(),tb=mk();
 user.value='';pass.value='';button.textContent='INGRESAR';
 form.querySelector=key=>key==='button[type="submit"]'?button:null;
 form.addEventListener=(event,fn)=>listeners[event]=fn;
 box.appendChild=el=>{error=el;};
 const doc={documentElement:{setAttribute:k=>attrs.add(k),removeAttribute:k=>attrs.delete(k)},
  body:{classList:classes()},getElementById:id=>({'login':login,'login-form':form,'lg-user':user,'lg-pass':pass,'tb-user':tb})[id]||null,
  querySelector:q=>q==='#auth-restoring small'?small:q==='.lg-box'?box:null,
  querySelectorAll:q=>q==='#login-error'&&error?[error]:[],
  createElement:()=>mk()};
 const actor={uid:'u1',email:'qa@example.invalid',emailVerified:true,displayName:'QA'};
 const provider={enabled:()=>true,initialize:()=>Promise.resolve({}),initialUser:()=>{restores++;return Promise.resolve(restoredUser);},
  signIn:()=>{signInCalls++;return Promise.resolve({user:actor});},
  signOut:()=>Promise.resolve(),callFunction:()=>Promise.resolve({})};
 const productApp={activate:()=>{activationCalls++;return Promise.reject(new Error('PROTECTED_BOOTSTRAP_SERVER_UNAVAILABLE'));}};
 const win={Orbit:{productRuntimeBrowserProvidersP0:provider,productAppP0:productApp},__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{tenantHint:'alianzas-soluciones'}};
 const loc={hash:'#/inicio',pathname:'/',search:''};
 vm.runInNewContext(source,{window:win,document:doc,location:loc,history:{replaceState(){}},sessionStorage:{getItem:()=>null,setItem(){}},
   Promise,setTimeout:(fn)=>{fn();return 0;},Date,console:{warn(){}}},{timeout:2000});
 const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
 return{auth:win.Orbit.auth,login,form,button,user,pass,small,doc,attrs,settle,submit:()=>listeners.submit({preventDefault(){}}),
  error:()=>error?.textContent||'',get calls(){return{signIn:signInCalls,activation:activationCalls,restores}}};
}
(async()=>{
 const x=setup();x.auth.init();await x.settle();
 assert.equal(x.login.style.visibility,'visible','LOGIN_MUST_APPEAR_AFTER_NO_RESTORED_USER');
 x.user.value='qa@example.invalid';x.pass.value='not-a-real-password';
 x.submit();await x.settle();
 assert.equal(x.calls.activation,1);
 assert.equal(x.attrs.has('data-auth-restoring'),false,'AUTH_RESTORING_OVERLAY_MUST_CLOSE_ON_ACTIVATION_FAILURE');
 assert.equal(x.login.style.visibility,'visible','LOGIN_MUST_BE_VISIBLE_AFTER_VALID_CREDENTIAL_ACTIVATION_FAILURE');
 assert.equal(x.button.disabled,false,'SUBMIT_MUST_BE_UNLOCKED_ON_POST_AUTH_FAILURE');
 assert.match(x.error(),/acceso está confirmado/i);
 x.submit();await x.settle();
 assert.equal(x.calls.activation,2,'RETRY_MUST_REACH_APP_OWNER_NO_STUCK_FORM');
 const y=setup({restoredUser:{uid:'u1',email:'qa@example.invalid',emailVerified:true}});
 y.auth.init();await y.settle();
 assert.equal(y.attrs.has('data-auth-restoring'),false,'RESTORE_ERROR_MUST_UNBLOCK_PRE_AUTH_OVERLAY');
 assert.equal(y.login.style.visibility,'visible','RESTORE_ERROR_MUST_SHOW_LOGIN');
 assert.match(y.error(),/Puedes volver a intentar/);
 y.auth.init();await y.settle();
 assert.equal(y.calls.restores,2,'RESTORE_RETRY_MUST_NOT_CACHE_REJECTED_PROMISE');
 console.log('B4_003_AUTH_TERMINAL_FAILURE_UI_QA_PASS checks=8 synthetic_mock_only no_network no_credentials');
})().catch(e=>{console.error(e);process.exitCode=1;});
