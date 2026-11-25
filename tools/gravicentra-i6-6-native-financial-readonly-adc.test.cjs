'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const helper=require('./gravicentra-i66-signed-qa-runtime-auth.cjs');
const driverPath=path.join(__dirname,'gravicentra-i66-live-performance-readonly.mjs');
const bytes=fs.readFileSync(process.env.I66_PERF_TEST_SOURCE_PATH||driverPath,'utf8');
// Execute the real driver bootstrap, stopping before any actor or Firestore read.
// The actual metadata guard is reused with synthetic metadata responses.
const bootstrap=bytes.slice(bytes.indexOf("const PROJECT='"),bytes.indexOf('async function findCarlos()'));
assert.ok(bootstrap.includes('const report=')&&bootstrap.includes('const db='));
const UUID='12345678-1234-1234-1234-123456789abc',SOURCE='a'.repeat(40),HEAD='b'.repeat(40);
const DRIVER='tools/gravicentra-i66-live-performance-readonly.mjs';

function fixture(options={}){
  const phase=options.phase||'preview',native=options.native!==false;
  const candidate={executionProvider:'CLOUD_BUILD',sourceSha:SOURCE,buildId:'gi-i66-'+SOURCE.slice(0,12)+'-123456789abc',
    buildRunId:'23456789-2345-2345-2345-23456789abcd',artifactId:'gs://synthetic-bucket/package.tar.gz#123',
    artifactDigest:'sha256:'+'c'.repeat(64),previewUrl:'https://synthetic-preview.example'};
  const qa={executionProvider:native?'CLOUD_BUILD':undefined,workflowHeadSha:HEAD,runId:native?UUID:123,
    phase,target:{...candidate},scopeId:'SIX_RECEIPT_CURRENT_BALANCE_READONLY'};
  const env={GI_I66_PERF_PROJECT:helper.C.projectId,GI_I66_PERF_TENANT:'alianzas-soluciones',RUNNER_TEMP:'/synthetic-temp',
    GI_I66_PERF_REPORT:'/synthetic-temp/report.json',GI_I66_PERF_PHASE:phase,GI_I66_READONLY_MODE:'six-frontend-release',
    ...(native?{GRAVICENTRA_BUILD_PROVIDER:'CLOUD_BUILD',PROJECT_ID:helper.C.projectId,
      GRAVICENTRA_CLOUD_BUILD_ID:UUID,GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT:helper.C.serviceAccount}:{GITHUB_SHA:HEAD})};
  const calls={initialize:[],adc:0,pinned:[],metadata:[],firestore:0,auth:0};
  const transport={status:phase==='live'?'OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED':'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED',
    scopedBackendPreviewI66:{candidate}};
  const financial={resolveFinancialQa:async requested=>{assert.equal(requested,phase);return qa;}};
  const release={CONTROL:'synthetic-control.json',candidateForPhase:(control,requested)=>{
    assert.equal(control.status,transport.status);assert.equal(requested,phase);return candidate;
  },verifyPinnedOwners:(p,opts)=>{calls.pinned.push(opts);assert.equal(p,candidate);
    if(options.ownerError)throw Error(options.ownerError);}};
  const metadata={
    'project/project-id':helper.C.projectId,'project/numeric-project-id':helper.C.projectNumber,
    'instance/service-accounts/default/email':helper.C.serviceAccount
  };
  Object.assign(metadata,options.metadata||{});
  const runtime={verifyCloudBuildRuntime:()=>helper.verifyCloudBuildRuntime(env,{
    homedir:()=>'/synthetic-home',existsSync:()=>options.localAdc===true,
    fetch:async url=>{calls.metadata.push(url);const suffix=url.slice(helper.C.metadataRoot.length);
      return {status:200,redirected:false,headers:{get:()=> 'Google'},text:async()=>metadata[suffix]};}
  })};
  const context={Buffer,process:{env,cwd:()=>'/synthetic-worktree'},
    fs:{readFileSync:file=>file===DRIVER?Buffer.from(options.driverDrift?'changed':bytes):Buffer.from(JSON.stringify(transport))},
    execFileSync:()=>Buffer.from(bytes),
    require:name=>name.includes('operational-release-candidate')?release:name.includes('frontend-control')?{}:
      name.includes('frontend-promotion-owner')?financial:name.includes('signed-qa-runtime-auth')?runtime:(()=>{throw Error('UNEXPECTED_MODULE '+name)})(),
    getApps:()=>options.existingApps||[],applicationDefault:()=>{calls.adc++;return {type:'ADC'};},
    initializeApp:value=>{calls.initialize.push(value);return {app:'synthetic',options:value};},
    getFirestore:()=>{calls.firestore++;return {};},getAuth:()=>{calls.auth++;return {};}
  };
  options.mutate?.({env,qa,candidate,transport});
  return {calls,env,qa,candidate,run:()=>vm.runInNewContext('(async()=>{'+bootstrap+';return {app,report};})()',context)};
}
function noAuth(f){assert.equal(f.calls.initialize.length,0);assert.equal(f.calls.adc,0);assert.equal(f.calls.firestore,0);assert.equal(f.calls.auth,0);}

for(const phase of ['preview','live'])test('native financial '+phase+' uses exact metadata ADC, IAM signer and real provider evidence',async()=>{
  const f=fixture({phase}),{app,report}=await f.run();
  assert.equal(app.options.serviceAccountId,helper.C.serviceAccount);assert.equal(app.options.projectId,helper.C.projectId);
  assert.equal(app.options.credential.type,'ADC');assert.equal(f.calls.initialize.length,1);assert.equal(f.calls.adc,1);
  assert.deepEqual(f.calls.pinned.map(x=>({...x})),[{head:'HEAD',cwd:'/synthetic-worktree'}]);assert.equal(f.calls.metadata.length,3);
  assert.equal(report.executionProvider,'CLOUD_BUILD');assert.equal(report.workflowHeadSha,HEAD);
  assert.equal(report.frontendQaBefore,undefined); // Collected later by the unchanged 48-stage matrix.
  assert.equal(report.releaseBuildRunId,f.candidate.buildRunId);assert.equal(report.releaseArtifactId,f.candidate.artifactId);
  for(const key of ['firestoreWrites','businessActions','paymentActions','syntheticFixtures','pushNotifications'])assert.equal(report[key],0);
});
test('unknown provider fails before ADC or data access',async()=>{
  const f=fixture({mutate:({env})=>env.GRAVICENTRA_BUILD_PROVIDER='OTHER'});
  await assert.rejects(f.run(),/I66_PERF_PROVIDER_UNSUPPORTED/);noAuth(f);
});
test('native financial authority, UUID and exact target are required before ADC',async()=>{
  for(const [mutate,code] of [
    [({qa})=>delete qa.executionProvider,'NATIVE_FINANCIAL_AUTHORITY_REQUIRED'],
    [({qa})=>qa.workflowHeadSha='unverified','NATIVE_AUTHORITY_HEAD_REQUIRED'],
    [({qa})=>qa.runId=123,'NATIVE_RUN_DRIFT'],
    [({candidate})=>delete candidate.executionProvider,'NATIVE_CANDIDATE_REQUIRED'],
    [({candidate})=>candidate.artifactDigest='sha256:'+'d'.repeat(64),'NATIVE_TARGET_DRIFT_artifactDigest']
  ]){const f=fixture({mutate});await assert.rejects(f.run(),new RegExp(code));noAuth(f);}
});
test('mechanism-owner mismatch fails before metadata and ADC',async()=>{
  const f=fixture({ownerError:'EXACT_MECHANISM_PIN_DRIFT'});await assert.rejects(f.run(),/EXACT_MECHANISM_PIN_DRIFT/);
  noAuth(f);assert.equal(f.calls.metadata.length,0);
});
test('a preinitialized app cannot substitute native ADC authority',async()=>{
  const f=fixture({existingApps:[{unverified:true}]});await assert.rejects(f.run(),/NATIVE_PREINITIALIZED_APP_FORBIDDEN/);noAuth(f);
});
test('wrong metadata project or signing identity fails before ADC initialization',async()=>{
  for(const metadata of [{'project/project-id':'other-project'},{'project/numeric-project-id':'1'},
    {'instance/service-accounts/default/email':'wrong@example.invalid'}]){
    const f=fixture({metadata});await assert.rejects(f.run(),/CLOUD_RUNTIME_IDENTITY_MISMATCH/);noAuth(f);
  }
});
test('credential-file override and local ADC cannot enter the native driver',async()=>{
  for(const options of [{mutate:({env})=>env.GOOGLE_APPLICATION_CREDENTIALS='/synthetic-key.json'},{localAdc:true}]){
    const f=fixture(options);await assert.rejects(f.run(),/CLOUD_(CREDENTIAL_OVERRIDE|LOCAL_ADC_FORBIDDEN)/);noAuth(f);
  }
});
test('legacy Preview retains exact source bytes and existing ADC behavior',async()=>{
  const f=fixture({native:false}),{app,report}=await f.run();
  assert.equal(app.options.serviceAccountId,undefined);assert.equal(app.options.credential.type,'ADC');
  assert.equal(report.executionProvider,undefined);assert.equal(report.workflowHeadSha,HEAD);assert.equal(f.calls.metadata.length,0);
  const drift=fixture({native:false,driverDrift:true});await assert.rejects(drift.run(),/I66_PERF_DRIVER_SOURCE_BYTES_DRIFT/);noAuth(drift);
});
