'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {C,OVERRIDES,verifyCloudBuildRuntime,initializeSignedQaAdmin}=require('./gravicentra-i66-signed-qa-runtime-auth.cjs');
const envFor=()=>({GRAVICENTRA_BUILD_PROVIDER:'CLOUD_BUILD',PROJECT_ID:C.projectId,
  GRAVICENTRA_CLOUD_BUILD_ID:'12345678-1234-1234-1234-123456789abc',
  GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT:C.serviceAccount});
const values={'project/project-id':C.projectId,'project/numeric-project-id':C.projectNumber,
  'instance/service-accounts/default/email':C.serviceAccount};
function harness({responses={},failure,existingPaths=[]}={}){
  const calls={fetch:[],cert:[],adc:0,init:[],exists:[],legacy:0},app={delete:async()=>{calls.deleted=true;}};
  const deps={homedir:()=>'/test-user',existsSync:file=>{calls.exists.push(file);return existingPaths.includes(file);},
    fetch:async(url,options)=>{
      calls.fetch.push({url,options});if(failure)throw failure;
      const suffix=url.slice(C.metadataRoot.length),override=responses[suffix]||{};
      return {status:200,redirected:false,headers:{get:key=>key==='metadata-flavor'?'Google':null},
        text:async()=>values[suffix],...override};
    }};
  const adc={kind:'native-adc'},admin={credential:{cert:value=>{calls.cert.push(value);return {kind:'legacy-cert',value};},
    applicationDefault:()=>{calls.adc++;return adc;}},initializeApp:options=>{calls.init.push(options);return app;}};
  const options={env:envFor(),...deps,getLegacyCredential:()=>{calls.legacy++;throw Error('LEGACY_MUST_NOT_RUN');}};
  return {calls,app,adc,admin,deps,options};
}
test('legacy certificate callback and original error remain authoritative without provider',async()=>{
  const h=harness(),credential={type:'service_account',project_id:C.projectId,private_key:'TEST_ONLY_NOT_A_KEY'};
  const app=await initializeSignedQaAdmin(h.admin,{env:{},...h.deps,getLegacyCredential:()=>credential});
  assert.equal(app,h.app);assert.deepEqual(h.calls.cert,[credential]);assert.equal(h.calls.adc,0);
  assert.equal(h.calls.fetch.length,0);assert.equal(h.calls.exists.length,0);
  const rejection=Error('EXISTING_PROJECT_GUARD');
  await assert.rejects(initializeSignedQaAdmin(h.admin,{env:{},getLegacyCredential:()=>{throw rejection;}}),error=>error===rejection);
  assert.equal(h.calls.init.length,1);
});
test('native SDK identity uses ADC and remote-signing account, without legacy selection',async()=>{
  const h=harness();assert.equal(await initializeSignedQaAdmin(h.admin,h.options),h.app);
  assert.deepEqual(h.calls.init,[{credential:h.adc,projectId:C.projectId,serviceAccountId:C.serviceAccount}]);
  assert.equal(h.calls.adc,1);assert.equal(h.calls.cert.length,0);assert.equal(h.calls.legacy,0);
  assert.deepEqual(h.calls.fetch.map(x=>x.url).sort(),Object.keys(values).map(x=>C.metadataRoot+x).sort());
  for(const call of h.calls.fetch){assert.deepEqual(call.options.headers,{'Metadata-Flavor':'Google'});assert.equal(call.options.redirect,'error');assert.ok(call.options.signal instanceof AbortSignal);}
});
test('identity helper returns public identity only and performs no SDK or token operation',async()=>{
  const h=harness();assert.deepEqual(await verifyCloudBuildRuntime(envFor(),h.deps),{provider:C.provider,
    buildId:envFor().GRAVICENTRA_CLOUD_BUILD_ID,projectId:C.projectId,projectNumber:C.projectNumber,serviceAccount:C.serviceAccount});
  assert.equal(h.calls.adc,0);assert.equal(h.calls.init.length,0);
  assert.ok(h.calls.fetch.every(({url})=>!url.includes('token')&&!url.includes('identity')));
});
test('ADC SDK error propagates without switching credentials',async()=>{
  const h=harness(),error=Object.assign(Error('ADC_DENIED'),{code:403});
  h.admin.credential.applicationDefault=()=>{h.calls.adc++;throw error;};
  await assert.rejects(initializeSignedQaAdmin(h.admin,h.options),value=>value===error);
  assert.equal(h.calls.legacy,0);assert.equal(h.calls.cert.length,0);assert.equal(h.calls.init.length,0);
});
for(const [field,value,code] of [
  ['GRAVICENTRA_BUILD_PROVIDER','OTHER','PROVIDER_UNSUPPORTED'],['PROJECT_ID','wrong-project','CLOUD_PROJECT_REQUIRED'],
  ['GRAVICENTRA_CLOUD_BUILD_ID','45549464538','CLOUD_BUILD_ID_REQUIRED'],
  ['GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT','646761409743-compute@developer.gserviceaccount.com','CLOUD_SERVICE_ACCOUNT_REQUIRED']
])test('rejects invalid provider identity '+field,async()=>{
  const h=harness();h.options.env[field]=value;
  await assert.rejects(initializeSignedQaAdmin(h.admin,h.options),new RegExp('I66_SIGNED_QA_'+code));
  assert.equal(h.calls.init.length,0);assert.equal(h.calls.adc,0);assert.equal(h.calls.legacy,0);assert.equal(h.calls.fetch.length,0);
});
for(const field of OVERRIDES)test('rejects credential, metadata or emulator override '+field,async()=>{
  const h=harness();h.options.env[field]='TEST_OVERRIDE';
  await assert.rejects(initializeSignedQaAdmin(h.admin,h.options),/I66_SIGNED_QA_CLOUD_CREDENTIAL_OVERRIDE/);
  assert.equal(h.calls.init.length,0);assert.equal(h.calls.fetch.length,0);assert.equal(h.calls.legacy,0);
});
for(const root of ['/test-user/.config/gcloud','/explicit-cloudsdk'])test('rejects local ADC file at '+root+' without reading its contents',async()=>{
  const h=harness({existingPaths:[root+'/application_default_credentials.json']});h.options.env.CLOUDSDK_CONFIG='/explicit-cloudsdk';
  await assert.rejects(initializeSignedQaAdmin(h.admin,h.options),/I66_SIGNED_QA_CLOUD_LOCAL_ADC_FORBIDDEN/);
  assert.equal(h.calls.fetch.length,0);assert.equal(h.calls.init.length,0);
});
for(const suffix of Object.keys(values))test('rejects observed runtime mismatch '+suffix,async()=>{
  const h=harness({responses:{[suffix]:{text:async()=>suffix.includes('email')?'646761409743-compute@developer.gserviceaccount.com':'WRONG'}}});
  await assert.rejects(initializeSignedQaAdmin(h.admin,h.options),/I66_SIGNED_QA_CLOUD_RUNTIME_IDENTITY_MISMATCH/);
  assert.equal(h.calls.adc,0);assert.equal(h.calls.init.length,0);assert.equal(h.calls.legacy,0);
});
for(const [name,override] of [['denied',{status:403}],['redirected',{redirected:true}],['missing Google header',{headers:{get:()=>null}}]])
  test('rejects untrusted metadata '+name,async()=>{
    const h=harness({responses:{'project/project-id':override}});
    await assert.rejects(initializeSignedQaAdmin(h.admin,h.options),/I66_SIGNED_QA_CLOUD_METADATA_UNTRUSTED/);
    assert.equal(h.calls.init.length,0);assert.equal(h.calls.adc,0);
  });
test('metadata transport failure returns only a bounded code and does not fall back',async()=>{
  const h=harness({failure:Error('UNSAFE_PROVIDER_ERROR_TEST_VALUE')});
  await assert.rejects(initializeSignedQaAdmin(h.admin,h.options),error=>error.message==='I66_SIGNED_QA_CLOUD_METADATA_UNAVAILABLE');
  assert.equal(h.calls.init.length,0);assert.equal(h.calls.legacy,0);
});

// Execute the complete two entrypoints which had synchronous top-level auth.
// Stop at their first Firestore access: this proves ordering and fail-closed
// initialization without accessing any tenant or running browser operations.
const ENTRYPOINTS=['gravicentra-i66-privileged-role-signed-ui-permissions-readonly.cjs',
  'gravicentra-i6-6-carlos-real-signed-synthetic-preview-uat.cjs'];
function sourceFor(name){
  const pin=process.env.I66_AUTH_TEST_PREIMAGE_SHA;
  if(pin){assert.match(pin,/^[0-9a-f]{40}$/);return execFileSync('git',['show',pin+':tools/'+name],{cwd:path.join(__dirname,'..'),encoding:'utf8'});}
  return fs.readFileSync(path.join(__dirname,name),'utf8');
}
async function entrypoint(name,{denied=false}={}){
  const h=harness(),events=[],logs=[],env={...envFor(),I66_PREVIEW_ORIGIN:'https://ays-orbit-360-lab--gi-i66-rc-45518809761-eiytd3a3.web.app',
    I66_SIGNED_QA_CHANNEL_ID:'gi-i66-rc-45518809761'};
  const gates=[];h.deps.fetch=(url,options)=>new Promise(resolve=>gates.push(()=>resolve({status:200,headers:{get:()=> 'Google'},
    text:async()=>denied?'WRONG':values[url.slice(C.metadataRoot.length)]})));
  h.admin.firestore=()=>{events.push('firestore');throw Error('TEST_STOP_AFTER_AUTH');};
  h.admin.auth=()=>{throw Error('TEST_AUTH_NOT_REACHED');};
  const originalInit=h.admin.initializeApp;h.admin.initializeApp=options=>{events.push('initialize');return originalInit(options);};
  const appProcess={env,exitCode:undefined};
  const context={process:appProcess,console:{log:(...v)=>logs.push(v.join(' ')),error:(...v)=>logs.push(v.join(' '))},
    Buffer,URL,AbortSignal,setTimeout,clearTimeout,
    require:id=>{
      if(id==='firebase-admin')return h.admin;
      if(id==='playwright')return {chromium:{launch:()=>{throw Error('TEST_BROWSER_NOT_REACHED');}}};
      if(id==='./gravicentra-i66-signed-qa-runtime-auth.cjs')return {initializeSignedQaAdmin:(admin,options)=>initializeSignedQaAdmin(admin,{...options,env,...h.deps})};
      if(id==='./gravicentra-i6-6-operational-release-candidate.cjs')return {signedMatrixBinding:()=>({preview:env.I66_PREVIEW_ORIGIN,origin:env.I66_PREVIEW_ORIGIN,candidate:null})};
      return require(id);
    }};
  let thrown;
  try{vm.runInNewContext(sourceFor(name),context,{filename:name});}catch(error){thrown=error;}
  assert.equal(thrown,undefined,'entrypoint must enter async native credential branch before Firestore: '+thrown?.message);
  assert.deepEqual(events,[],'no SDK initialization or tenant read before metadata resolves');
  assert.equal(gates.length,3);gates.forEach(resolve=>resolve());
  for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  if(denied){assert.deepEqual(events,[]);assert.equal(h.calls.init.length,0);assert.equal(h.calls.deleted,undefined);
    assert.ok(logs.some(x=>x.includes('I66_SIGNED_QA_CLOUD_RUNTIME_IDENTITY_MISMATCH')));}
  else{assert.deepEqual(events,['initialize','firestore']);assert.equal(h.calls.init[0].serviceAccountId,C.serviceAccount);
    assert.ok(logs.some(x=>x.includes('TEST_STOP_AFTER_AUTH')));}
  assert.equal(appProcess.exitCode,1);assert.ok(!logs.some(x=>/PASS/.test(x)),'auth or early failure cannot create a QA PASS');
}
for(const name of ENTRYPOINTS){
  test('entrypoint awaits verified ADC before first Firestore access: '+name,()=>entrypoint(name));
  test('entrypoint denies metadata mismatch without app cleanup masking the HOLD: '+name,()=>entrypoint(name,{denied:true}));
}
