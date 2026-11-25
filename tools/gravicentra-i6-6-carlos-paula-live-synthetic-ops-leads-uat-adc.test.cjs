'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {C,initializeSignedQaAdmin}=require('./gravicentra-i66-signed-qa-runtime-auth.cjs');
const DRIVER='gravicentra-i6-6-carlos-paula-live-synthetic-ops-leads-uat.cjs';
const ENV={GRAVICENTRA_BUILD_PROVIDER:'CLOUD_BUILD',PROJECT_ID:C.projectId,
  GRAVICENTRA_CLOUD_BUILD_ID:'12345678-1234-1234-1234-123456789abc',GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT:C.serviceAccount,
  I66_LIVE_ORIGIN:'https://app.aysseguros.com',I66_APPROVED_LIVE_SOURCE_SHA:'16e3a70baf4e31ef8453173990f32a398c65e59b'};
const values={'project/project-id':C.projectId,'project/numeric-project-id':C.projectNumber,'instance/service-accounts/default/email':C.serviceAccount};
function source(){
  const pin=process.env.I66_AUTH_TEST_PREIMAGE_SHA;
  if(pin){assert.match(pin,/^[a-f0-9]{40}$/);return execFileSync('git',['show',pin+':tools/'+DRIVER],{cwd:path.join(__dirname,'..'),encoding:'utf8'});}
  return fs.readFileSync(path.join(__dirname,DRIVER),'utf8');
}
async function entrypoint({env={},metadataDenied=false}={}){
  const runtime={...ENV,...env},events=[],logs=[],gates=[],init=[],certs=[];let adcs=0,authorizationError;
  const adc={type:'runtime-adc'},admin={credential:{cert:x=>{certs.push(x);return x;},applicationDefault:()=>{adcs++;return adc;}},
    initializeApp:x=>{events.push('initialize');init.push(x);return{};},
    firestore:()=>{events.push('firestore');throw Error('TEST_STOP_AFTER_AUTH');},
    auth:()=>{events.push('auth');throw Error('TEST_AUTH_NOT_REACHED');}};
  const dependencies={homedir:()=>'/test-user',existsSync:()=>false,
    fetch:(url,options)=>new Promise(resolve=>gates.push(()=>resolve({status:200,headers:{get:()=> 'Google'},redirected:false,
      text:async()=>metadataDenied?'WRONG':values[url.slice(C.metadataRoot.length)]}))) };
  const proc={env:runtime,exitCode:undefined};
  const ctx={process:proc,console:{log:(...args)=>logs.push(args.join(' ')),error:(...args)=>logs.push(args.join(' '))},Buffer,URL,AbortSignal,setTimeout,clearTimeout,
    fetch:async()=>{events.push('business-fetch');throw Error('TEST_NETWORK_NOT_REACHED');},
    require:id=>{
      if(id==='firebase-admin')return admin;
      if(id==='playwright')return{chromium:{launch:()=>{events.push('browser');throw Error('TEST_BROWSER_NOT_REACHED');}}};
      if(id==='./gravicentra-i66-signed-qa-runtime-auth.cjs')return{initializeSignedQaAdmin:async(a,options)=>{
        try{return await initializeSignedQaAdmin(a,{...options,env:runtime,...dependencies});}
        catch(error){authorizationError=error;throw error;}
      }};
      return require(id);
    }};
  let thrown;try{vm.runInNewContext(source(),ctx,{filename:DRIVER});}catch(error){thrown=error;}
  if(runtime.GRAVICENTRA_BUILD_PROVIDER==='CLOUD_BUILD')assert.deepEqual(events,[],'must not initialize SDK or read tenant/build before async identity validation');
  if(!thrown){for(const resolve of gates)resolve();for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));}
  return{events,logs,gates,init,certs,adcs,adc,proc,thrown,authorizationError};
}
test('LIVE Ops/Leads awaits native SDK identity before any SDK or tenant access',async()=>{
  const h=await entrypoint();assert.equal(h.thrown,undefined,'native auth must not require an exported private key');
  assert.equal(h.gates.length,3);assert.deepEqual(h.events,['initialize','firestore']);assert.equal(h.adcs,1);assert.equal(h.certs.length,0);
  assert.deepEqual(h.init,[{credential:h.adc,projectId:C.projectId,serviceAccountId:C.serviceAccount}]);
  assert.equal(h.proc.exitCode,1);assert.ok(h.logs.some(x=>x.includes('TEST_STOP_AFTER_AUTH')));assert.ok(!h.logs.some(x=>x.includes('PASS')));
});
test('LIVE Ops/Leads denies wrong observed metadata without any app, token, browser or business read',async()=>{
  const h=await entrypoint({metadataDenied:true});assert.equal(h.thrown,undefined);assert.equal(h.gates.length,3);
  assert.deepEqual(h.events,[]);assert.equal(h.adcs,0);assert.equal(h.certs.length,0);assert.equal(h.proc.exitCode,1);
  assert.ok(h.logs.some(x=>x.includes('I66_SIGNED_QA_CLOUD_RUNTIME_IDENTITY_MISMATCH')));assert.ok(!h.logs.some(x=>x.includes('PASS')));
});
test('LIVE Ops/Leads cannot use another runtime service account or key override',async()=>{
  for(const env of [{GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT:'646761409743-compute@developer.gserviceaccount.com'},
    {GOOGLE_APPLICATION_CREDENTIALS:'/test-not-a-key'}]){
    const h=await entrypoint({env});assert.equal(h.thrown,undefined);assert.equal(h.gates.length,0);assert.deepEqual(h.events,[]);
    assert.equal(h.adcs,0);assert.equal(h.certs.length,0);assert.equal(h.proc.exitCode,1);assert.ok(!h.logs.some(x=>x.includes('PASS')));
  }
});
test('LIVE staff origin and exact source pin reject before authentication',async()=>{
  for(const env of [{I66_LIVE_ORIGIN:'https://example.invalid'},{I66_APPROVED_LIVE_SOURCE_SHA:'missing-source'}]){
    const h=await entrypoint({env});assert.ok(h.thrown);assert.equal(h.gates.length,0);assert.deepEqual(h.events,[]);assert.equal(h.adcs,0);
  }
});
test('LIVE Ops/Leads legacy certificate and missing-key guard remain unchanged',async()=>{
  const key={type:'service_account',project_id:C.projectId,private_key:'TEST_ONLY_NOT_A_KEY'};
  const good=await entrypoint({env:{GRAVICENTRA_BUILD_PROVIDER:'',SA_LAB:JSON.stringify(key)}});
  assert.equal(good.thrown,undefined);assert.equal(good.gates.length,0);assert.equal(good.adcs,0);assert.equal(JSON.stringify(good.certs),JSON.stringify([key]));
  assert.deepEqual(good.events,['initialize','firestore']);assert.equal(good.proc.exitCode,1);
  const missing=await entrypoint({env:{GRAVICENTRA_BUILD_PROVIDER:''}});
  assert.equal(missing.thrown,undefined);assert.deepEqual(missing.events,[]);assert.equal(missing.proc.exitCode,1);
  assert.equal(missing.authorizationError.message,'I66_LIVE_SIGNED_PROJECT_AUTHORITY_MISSING');
  assert.ok(missing.logs.some(x=>x.includes('HOLD')));assert.ok(!missing.logs.some(x=>x.includes('PASS')));
});
