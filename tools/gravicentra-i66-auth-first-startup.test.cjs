'use strict';

// I6.6: the login SDK must be usable while Firestore/Functions code is still
// downloading. This is a synthetic module loader; it never contacts Firebase.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {test}=require('node:test');

const source=fs.readFileSync(path.join(__dirname,'../orbit360-platform/core/product-runtime-browser-providers-p0.js'),'utf8');
const authOwner=fs.readFileSync(path.join(__dirname,'../orbit360-platform/core/auth-product-runtime-p0.js'),'utf8');
const moduleCode={
  'firebase-app.js':`let apps=[]; export function getApps(){return apps;}
    export function initializeApp(cfg){let app={projectId:cfg.projectId};apps.push(app);return app;}`,
  'firebase-auth.js':`export const browserSessionPersistence='SESSION';
    let auth={currentUser:null,authStateReady:()=>Promise.resolve()};
    export function getAuth(){return auth;}
    export function setPersistence(){return Promise.resolve();}
    export function signInWithEmailAndPassword(a,email){a.currentUser={uid:'uid-qa',email,emailVerified:true};return Promise.resolve({user:a.currentUser});}
    export function signOut(a){a.currentUser=null;return Promise.resolve();}
    export function sendEmailVerification(){return Promise.resolve();}
    export function updatePassword(){return Promise.resolve();}`,
  'firebase-firestore.js':`export function getFirestore(app){return {projectId:app.projectId};}`,
  'firebase-functions.js':`export function getFunctions(){return {};}
    export function httpsCallable(){return () => Promise.resolve({data:{ok:true}});}`
};

function harness(){
  let releaseData;
  const dataGate=new Promise(resolve=>{releaseData=resolve;});
  const imported=[];
  const config={enabled:true,projectId:'ays-orbit-360-lab',authDomain:'ays-orbit-360-lab.firebaseapp.com',
    apiKey:'public-test-key',appId:'test-app',tenantHint:'alianzas-soluciones',scopedReadPreviewCandidate:true};
  const window={Orbit:{},__ORBIT360_PRODUCT_PUBLIC_CONFIG__:config,
    location:{hostname:'app.aysseguros.com'}};
  const sdkImport=async specifier=>{
      const name=Object.keys(moduleCode).find(suffix=>specifier.endsWith(suffix));
      assert.ok(name,'unexpected SDK import');
      imported.push(name);
      if(name==='firebase-firestore.js'||name==='firebase-functions.js')await dataGate;
      return import('data:text/javascript;charset=utf-8,'+encodeURIComponent(moduleCode[name]));
    };
  // Replace only the import expression with an injected promise-returning
  // function; no experimental vm module flag or live network is required.
  const ctx=vm.createContext({window,Promise,Object,Array,String,RegExp,Set,URL,setTimeout,clearTimeout,console,__sdkImport:sdkImport});
  const script=new vm.Script(source.replaceAll('import(','__sdkImport('),{filename:'product-runtime-browser-providers-p0.js'});
  script.runInContext(ctx);
  return{provider:window.Orbit.productRuntimeBrowserProvidersP0,releaseData,imported,config};
}

test('auth and credential login finish without waiting for Firestore or Functions SDK',async()=>{
  const h=harness(),p=h.provider;
  const auth=await Promise.race([p.initializeAuth(),new Promise((_,reject)=>setTimeout(()=>reject(Error('AUTH_BLOCKED_BY_DATA_SDK')),800))]);
  assert.equal(auth.app.projectId,'ays-orbit-360-lab');
  assert.ok(h.imported.includes('firebase-firestore.js'));
  const result=await Promise.race([p.signIn(' paula@example.test ','synthetic'),new Promise((_,reject)=>setTimeout(()=>reject(Error('SIGNIN_BLOCKED_BY_DATA_SDK')),800))]);
  assert.equal(result.user.email,'paula@example.test');
  assert.equal((await p.initialUser()).uid,'uid-qa');
  let fullReady=false;
  const full=p.initialize().then(ctx=>{fullReady=true;return ctx;});
  await Promise.resolve();
  assert.equal(fullReady,false,'full store must not fake readiness before data SDK');
  h.releaseData();
  const ctx=await full;
  assert.equal(ctx.app,auth.app);
  assert.equal(ctx.auth,auth.auth);
  assert.equal(ctx.db.projectId,'ays-orbit-360-lab');
  assert.equal(fullReady,true);
  await p.signOut();
  assert.equal(await p.initialUser(),null);
});

test('the separated auth path retains protected host and configuration deny rules',async()=>{
  const h=harness();h.config.scopedReadPreviewCandidate=false;
  await assert.rejects(h.provider.initializeAuth(),/PROTECTED_READ_CANDIDATE_DISABLED/);
  await assert.rejects(h.provider.signIn('x','y'),/PROTECTED_READ_CANDIDATE_DISABLED/);
  h.releaseData();
});

test('product auth owner starts session restore through the lightweight provider',()=>{
  assert.match(authOwner,/var boot=typeof p\.initializeAuth==='function'\?p\.initializeAuth\(\):p\.initialize\(\)/);
  assert.match(authOwner,/return Orbit\.productAppP0\.activate\(\)/);
  assert.match(source,/serverWriteTransport:'firebase-functions'/);
  assert.match(source,/browserFirestoreWriteAuthorized:false/);
});
