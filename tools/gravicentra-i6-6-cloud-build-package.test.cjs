'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const owner=require('./gravicentra-i6-6-cloud-build-package.cjs');
const {C,N,F}=owner;
const copy=value=>JSON.parse(JSON.stringify(value));
const buildUuid='12345678-1234-4234-8234-123456789035';
const started='2026-11-25T12:00:00.000Z',finished='2026-11-25T12:05:00.000Z';
const workflow=fs.readFileSync(path.join(__dirname,'..',C.workflow),'utf8');

// Provider API examples are synthetic, including object generations and UUIDs.
// These tests never authorize a real artifact, call a provider, or claim UAT.
function plan(){
  const blocks=owner.workflowBlocks(workflow);
  return {schema:C.planSchema,provider:C.provider,scope:C.scope,repository:C.repository,branch:C.branch,
    projectId:C.projectId,projectNumber:C.projectNumber,region:C.region,serviceAccount:C.serviceAccount,bucket:C.bucket,
    mechanismSha:'a'.repeat(40),sourceSha:'b'.repeat(40),sourceTreeSha:'c'.repeat(40),requestVersion:35,
    transportBlob:'d'.repeat(40),manifestBlob:'e'.repeat(40),requestSha256:'f'.repeat(64),
    sourceQa:{headSha:'1'.repeat(40),runId:45548703476,guardRunId:45548703495},
    pins:Object.fromEntries([C.tool,C.test,C.branding,C.brandingTest].map(p=>[p,{blob:'2'.repeat(40),sha256:'3'.repeat(64)}])),
    workflowBlob:owner.blob(workflow),workflowSha256:owner.sha(workflow),builderBlob:'4'.repeat(40),
    blocks:Object.fromEntries(Object.entries(blocks).map(([k,v])=>[k,owner.sha(v)])),
    unexecutedGithubBuild:{runId:45549464538,attempt:2},noDeploy:true,realBusinessWrites:0,fullI66ProductionAccepted:false};
}
function build(p=plan()){
  const c=owner.configFor(p);
  return {...c,id:buildUuid,name:'projects/'+C.projectNumber+'/locations/'+C.region+'/builds/'+buildUuid,projectId:C.projectId,status:'SUCCESS',
    source:{gitSource:{url:C.repositoryUrl,revision:p.mechanismSha}},sourceProvenance:{resolvedGitSource:{url:C.repositoryUrl,revision:p.mechanismSha}},
    steps:c.steps.map(s=>({...s,env:['GRAVICENTRA_BUILD_PROVIDER=CLOUD_BUILD','GRAVICENTRA_CLOUD_BUILD_ID='+buildUuid,
      'GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT='+C.serviceAccount,'I66_PRODUCT_SOURCE_SHA='+p.sourceSha,
      'I66_MECHANISM_SOURCE_SHA='+p.mechanismSha,'I66_REQUEST_VERSION='+p.requestVersion,
      'PROJECT_ID='+C.projectId,'TENANT_HINT=alianzas-soluciones'],status:'SUCCESS',timing:{startTime:started,endTime:'2026-11-25T12:04:00.000Z'}})),
    artifacts:{objects:{...c.artifacts.objects,location:c.artifacts.objects.location.replace('$BUILD_ID',buildUuid)}},
    results:{buildStepImages:['sha256:'+'5'.repeat(64)],numArtifacts:String(Object.keys(F).length),
      artifactManifest:'gs://'+C.bucket+'/'+owner.artifactPrefix(p,buildUuid)+'artifacts-'+buildUuid+'.json'},
    createTime:'2026-11-25T11:59:58.000Z',startTime:started,finishTime:finished,
    logUrl:'https://console.cloud.google.com/cloud-build/builds;region='+C.region+'/'+buildUuid+'?project='+C.projectId};
}
function original(p=plan()){
  const run={id:p.unexecutedGithubBuild.runId,run_attempt:2,head_sha:p.sourceSha,head_branch:C.branch,path:C.workflow,status:'completed',conclusion:'failure'};
  const jobs={jobs:[{name:'gate',run_id:run.id,status:'completed',conclusion:'failure',steps:[]},{name:'immutable-package',run_id:run.id,status:'completed',conclusion:'skipped',steps:[]}]};
  return {run,jobs,artifacts:{total_count:0,artifacts:[]}};
}
function proofFixture(){
  const p=plan(),b=build(p),files=Object.fromEntries(Object.values(F).map(n=>[n,Buffer.from('synthetic '+n+'\n')]));
  files[F.archive]=Buffer.from('synthetic archive bytes; NOT A REAL RELEASE');
  const archiveSha256=owner.sha(files[F.archive]);
  files[F.digest]=Buffer.from(archiveSha256+'  /workspace/gi-i66-exact-package.tar.gz\n');
  files[F.build]=Buffer.from('I66_MANIFEST_EXACT_BUILD_BOUND_INDEX_PWA_AND_TENANT_ICONS_PASS\nI66_BUILD_ONE_SOURCE_ONE_ARTIFACT_NO_DEPLOY_PASS\n');
  files[F.admission]=Buffer.from(JSON.stringify({eligible:true,sourceSha:p.sourceSha,apiReads:[1,2,3,4,5],markers:[1,2]}));
  const checks={};
  for(const name of ['gate','source','build','archive','admission','mechanism']){
    const file=name==='archive'?F.build:F[name];
    checks[name]={status:'PASS',exitCode:0,startedAt:started,endedAt:'2026-11-25T12:04:00.000Z',file,logSha256:owner.sha(files[file])};
    if(N[name])checks[name].signedBlockSha256=p.blocks[name];
    if(name==='mechanism')checks[name].tests=[{path:C.test,...p.pins[C.test]},{path:C.brandingTest,...p.pins[C.brandingTest]}];
  }
  const proof={schema:C.proofSchema,provider:C.provider,scope:C.scope,buildId:b.id,planSha256:owner.digest(p),sourceSha:p.sourceSha,
    mechanismSha:p.mechanismSha,sourceTreeSha:p.sourceTreeSha,serviceAccount:C.serviceAccount,requestVersion:p.requestVersion,
    status:'PACKAGE_BUILT_NO_DEPLOY',fullI66ProductionAccepted:false,deployments:{preview:0,live:0,functions:0},businessWrites:0,
    checks,archiveSha256,archiveBytes:files[F.archive].length,lock:{bucket:C.bucket,name:owner.lockName(p),generation:'10000000000001'}};
  files[F.proof]=Buffer.from(JSON.stringify(proof));
  const objects=Object.fromEntries(Object.entries(files).map(([name,data])=>[name,{bucket:C.bucket,name:owner.artifactPrefix(p,b.id)+name,generation:'10000000000002',size:String(data.length),timeCreated:'2026-11-25T12:04:30.000Z'}]));
  return {p,b,proof,files,objects};
}

test('uses all signed package blocks and retains the governance and byte gates',()=>{
  const b=owner.workflowBlocks(workflow),r=owner.runtimeBlocks(b);
  assert.deepEqual(Object.keys(b),['gate','source','build','archive']);
  assert.equal(b.source,owner.runBlock(workflow,N.source));
  assert.equal(r.gate,b.gate);assert.equal(r.source,b.source);
  assert.equal(r.build.replace('node "$I66_BRANDING_READER"', 'node '+C.branding),b.build);
  assert.equal(r.archive.replaceAll('$I66_PACKAGE_SUMMARY','$GITHUB_STEP_SUMMARY'),b.archive);
  assert.ok(b.source.includes('node --test tools/gravicentra-i6-6-operational-live-acceptance.test.cjs'));
  assert.ok(b.build.includes('I66_APPROVED_PRODUCT_BUILD_BYTES_DRIFT'));
  assert.ok(!Object.values(r).some(text=>/hosting:channel:deploy|hosting:clone|firebase deploy/.test(text)));
});
for(const [name,mutate,code] of [
  ['missing preflight step',s=>s.replace(N.source,'removed source gate'),'STEP_MISSING_OR_DUPLICATED'],
  ['missing governance command',s=>s.replace('node tools/gravicentra-governance-preflight-v1.mjs --mode=i6','echo bypass'),'GOVERNANCE_GATE_REQUIRED'],
  ['deploy inside package block',s=>s.replace('test -s "$RUNNER_TEMP/gi-i66-exact-package.tar.gz"','firebase deploy'),'PACKAGE_ONLY_COMMAND_BOUNDARY'],
  ['duplicate signed step',s=>s+'\n      - name: '+N.source+'\n        run: |\n          true\n','STEP_MISSING_OR_DUPLICATED']
])test('rejects '+name,()=>assert.throws(()=>owner.workflowBlocks(mutate(workflow)),new RegExp(code)));

test('explicit provider config is package only, same project/SA/bucket and Node22',()=>{
  const p=plan(),c=owner.configFor(p);assert.equal(owner.validatePlan(p),p);
  assert.equal(c.steps.length,1);assert.equal(c.steps[0].name,'node:22-bookworm');assert.equal(c.steps[0].entrypoint,'node');
  assert.equal(c.options.machineType,'E2_STANDARD_2');assert.equal(c.options.logging,'GCS_ONLY');
  assert.deepEqual(c.artifacts.objects.paths,Object.values(F));
  for(const key of Object.keys(c.substitutions))assert.ok(c.steps[0].env.some(value=>value.includes('$'+key)),'MUST_MATCH substitution '+key+' is actually used');
  assert.ok(!JSON.stringify(c).includes('GITHUB_ACTIONS'));assert.ok(!JSON.stringify(c).includes('GOOGLE_APPLICATION_CREDENTIALS'));
  assert.ok(c.artifacts.objects.location.includes('$BUILD_ID'));assert.equal(c.serviceAccount,'projects/'+C.projectId+'/serviceAccounts/'+C.serviceAccount);
});
for(const [label,change] of [
  ['implicit provider',p=>delete p.provider],['other project',p=>p.projectId='other-project'],
  ['other bucket',p=>p.bucket='another-bucket'],['other SA',p=>p.serviceAccount='admin@other.iam.gserviceaccount.com'],
  ['branch name instead of source',p=>p.sourceSha=C.branch],['missing test pin',p=>delete p.pins[C.test]],
  ['extra provider permission',p=>p.deploy=true],['acceptance overclaim',p=>p.fullI66ProductionAccepted=true],
  ['GitHub failure attempt missing',p=>delete p.unexecutedGithubBuild.attempt],['source QA missing',p=>p.sourceQa.runId=0]
])test('closed plan rejects '+label,()=>{const p=plan();change(p);assert.throws(()=>owner.validatePlan(p));});

test('accepts real-shaped successful Build only with executed step, source provenance and retained artifacts',()=>{
  const p=plan(),b=build(p);assert.equal(owner.validateBuild(p,b),b);
  b.name=b.name.replace(C.projectNumber,C.projectId);assert.equal(owner.validateBuild(p,b),b);
});
test('working Build admits runtime identity check but never final artifact acceptance',()=>{
  const p=plan(),b=build(p);b.status='WORKING';delete b.results;delete b.sourceProvenance;delete b.steps[0].status;
  assert.equal(owner.validateBuild(p,b,{finished:false}),b);assert.throws(()=>owner.validateBuild(p,b),/BUILD_STATUS/);
});
for(const [label,change,code] of [
  ['numeric GitHub run pretending UUID',b=>b.id='45549464538','REAL_BUILD_UUID'],
  ['phase-only SUCCESS',b=>b.steps=[],'EXACT_EXECUTED_STEP_SCOPE'],
  ['skipped step',b=>b.steps[0].status='SKIPPED','STEP_EXECUTED_SUCCESS'],
  ['absent step timing',b=>delete b.steps[0].timing,'STEP_EXECUTED_TIMING'],
  ['different source revision',b=>b.sourceProvenance.resolvedGitSource.revision='9'.repeat(40),'RESOLVED_SOURCE_REVISION'],
  ['different source repository',b=>b.source.gitSource.url='https://github.com/other/repo.git','BUILD_SOURCE_REPOSITORY'],
  ['different execution account',b=>b.serviceAccount='projects/x/serviceAccounts/other','BUILD_SERVICE_ACCOUNT'],
  ['extra executor step',b=>b.steps.push(copy(b.steps[0])),'EXACT_EXECUTED_STEP_SCOPE'],
  ['ignored test failure',b=>b.steps[0].allowFailure=true,'NO_STEP_BYPASS'],
  ['ignored exit code',b=>b.steps[0].allowExitCodes=[1],'NO_STEP_BYPASS'],
  ['different worker args',b=>b.steps[0].args=['other.cjs'],'STEP_args'],
  ['overridden global runtime',b=>b.options.env=['NODE_OPTIONS=--require=other.cjs'],'NO_GLOBAL_OVERRIDE'],
  ['secret export',b=>b.availableSecrets={secretManager:[]},'NO_SECRET_EXPORT'],
  ['private pool',b=>b.options.pool={name:'projects/x/workerPools/y'},'NO_UNREVIEWED_PRIVATE_POOL'],
  ['costly machine replacement',b=>b.options.machineType='E2_HIGHCPU_32','DEFAULT_POOL_MACHINE_REQUIRED'],
  ['missing image digest',b=>b.results.buildStepImages=['node:latest'],'REAL_STEP_IMAGE_DIGEST'],
  ['missing retained artifacts',b=>b.results.numArtifacts='0','ARTIFACT_COUNT'],
  ['different artifact location',b=>b.artifacts.objects.location='gs://other-bucket/','ARTIFACT_LOCATION'],
  ['different artifact manifest',b=>b.results.artifactManifest='gs://other/manifest.json','REAL_ARTIFACT_MANIFEST'],
  ['extra artifact publisher',b=>b.artifacts.pythonPackages=[{repository:'other'}],'NO_EXTRA_ARTIFACT_PUBLISHER'],
  ['unverified log URL',b=>b.logUrl='https://example.com/'+b.id,'REAL_BUILD_LOG_URL']
])test('provider evidence rejects '+label,()=>{const p=plan(),b=build(p);change(b);assert.throws(()=>owner.validateBuild(p,b),new RegExp(code));});

test('original GitHub failure really precedes any executed build and has zero artifacts',()=>{
  const p=plan(),o=original(p);assert.equal(owner.validateOriginalFailure(p,o.run,o.jobs,o.artifacts),true);
});
for(const [label,change] of [
  ['concurrent rerun',o=>o.run.run_attempt++],['running original',o=>o.run.status='in_progress'],
  ['old artifact exists',o=>{o.artifacts.total_count=1;o.artifacts.artifacts=[{id:99}];}],
  ['package already ran',o=>o.jobs.jobs[1].conclusion='success'],
  ['steps ran before failure',o=>o.jobs.jobs[0].steps=[{number:1,status:'completed',conclusion:'success'}]],
  ['different job origin',o=>o.jobs.jobs[0].run_id=1]
])test('cannot silently duplicate a build after '+label,()=>{const p=plan(),o=original(p);change(o);assert.throws(()=>owner.validateOriginalFailure(p,o.run,o.jobs,o.artifacts));});

test('artifact manifest resolves exactly every expected member to immutable GCS generation',()=>{
  const p=plan(),rows=Object.values(F).map(name=>({location:'gs://'+C.bucket+'/'+owner.artifactPrefix(p,buildUuid)+name+'#10000000000001',file_hash:[{type:2,value:'0'.repeat(32)}]}));
  const map=owner.artifactRows(p,buildUuid,rows);assert.equal(map.size,Object.keys(F).length);assert.equal(map.get(F.archive).generation,'10000000000001');
  for(const alter of [r=>r.pop(),r=>r.push(copy(r[0])),r=>r[0].location=r[0].location.split('#')[0],r=>r[0].location=r[0].location.replace(C.bucket,'other-bucket'),r=>r[0].location=r[0].location.replace(F.archive,'../escape')]){
    const next=copy(rows);alter(next);assert.throws(()=>owner.artifactRows(p,buildUuid,next));
  }
});
test('native manifests accept whole JSON or complete NDJSON without dropping malformed lines',()=>{
  const rows=[{location:'synthetic-1'},{location:'synthetic-2'}];
  assert.deepEqual(owner.parseArtifactManifest(Buffer.from(JSON.stringify(rows))),rows);
  assert.deepEqual(owner.parseArtifactManifest(Buffer.from(rows.map(r=>JSON.stringify(r)).join('\n')+'\n')),rows);
  assert.throws(()=>owner.parseArtifactManifest(Buffer.from(rows.map(r=>JSON.stringify(r)).join('\n')+'\n{')));
  assert.throws(()=>owner.parseArtifactManifest(Buffer.from('{}\n\n{}')));
});
test('native MD5 normalizes documented repeated FileHashes/Hash wrappers without ambiguity',()=>{
  const hash={type:2,value:'0'.repeat(32)};
  for(const row of [{file_hash:[hash]},{file_hash:hash},{file_hash:[{file_hash:[hash]}]},{fileHash:[{fileHash:[hash]}]},{file_hash:{fileHash:[hash]}}])assert.equal(owner.nativeArtifactMd5(row),hash.value);
  for(const row of [{file_hash:[hash,hash]},{file_hash:[{file_hash:[hash,hash]}]},{file_hash:[hash],fileHash:[hash]},{file_hash:{fileHash:[hash],extra:true}},{file_hash:[{type:1,value:hash.value}]},{file_hash:[{type:2,value:'unverified'}]}])assert.throws(()=>owner.nativeArtifactMd5(row));
});
test('the real execution log binds the exact archive SHA; duplicate or mismatched markers fail',()=>{
  const f=proofFixture(),marker={buildId:f.b.id,sourceSha:f.p.sourceSha,archiveSha256:f.proof.archiveSha256,scope:C.scope};
  const line=value=>'Step #0 - "'+C.stepId+'": I66_CLOUD_BUILD_PACKAGE_READY_FOR_PROVIDER_RETENTION '+JSON.stringify(value)+'\n';
  assert.deepEqual(owner.validateExecutionLog(f.p,f.b,f.proof,Buffer.from(line(marker))),marker);
  assert.throws(()=>owner.validateExecutionLog(f.p,f.b,f.proof,Buffer.from('summary SUCCESS')),/UNIQUE_REAL_EXECUTION_MARKER/);
  assert.throws(()=>owner.validateExecutionLog(f.p,f.b,f.proof,Buffer.from(line(marker)+line(marker))),/UNIQUE_REAL_EXECUTION_MARKER/);
  for(const key of ['archiveSha256','sourceSha','buildId','scope']){
    const changed={...marker,[key]:'wrong'};
    assert.throws(()=>owner.validateExecutionLog(f.p,f.b,f.proof,Buffer.from(line(changed))),/EXECUTION_LOG_ARCHIVE_BINDING/);
  }
});
test('same source and request always resolve to the same build claim; a new UUID cannot replace it',()=>{
  const p=plan();assert.equal(owner.lockName(p),owner.lockName(copy(p)));
  assert.notEqual(owner.artifactPrefix(p,buildUuid),owner.artifactPrefix(p,'12345678-1234-4234-8234-123456789036'));
  assert.ok(!owner.lockName(p).includes(buildUuid));
});
test('object validation requires exact bucket/path, nonempty bytes, immutable generation and no public ACL',()=>{
  const f=proofFixture(),m=f.objects[F.archive];assert.equal(owner.validateObject(f.p,f.b.id,m,F.archive),m);
  for(const mutate of [m=>delete m.generation,m=>m.name+='wrong',m=>m.bucket='other',m=>m.size='0',m=>m.acl=[{entity:'allUsers'}]]){
    const bad=copy(m);mutate(bad);assert.throws(()=>owner.validateObject(f.p,f.b.id,bad,F.archive));
  }
});
test('package readback verifies SHA256 over actual bytes and every gate log, without granting Preview/LIVE',()=>{
  const f=proofFixture();assert.equal(owner.validateWorkerProof(f.p,f.b,f.proof,f.files,f.objects),true);
});
for(const [label,change,code] of [
  ['changed package bytes',f=>f.files[F.archive]=Buffer.from('different archive'),'ARCHIVE_SHA256'],
  ['changed gate log',f=>f.files[F.source]=Buffer.from('only an exit summary'),'CHECK_LOG_BYTES_source'],
  ['omitted source gate',f=>delete f.proof.checks.source,'ALL_PACKAGE_GATES_REQUIRED'],
  ['omitted provider tests',f=>delete f.proof.checks.mechanism,'ALL_PACKAGE_GATES_REQUIRED'],
  ['test failure renamed PASS',f=>f.proof.checks.gate.exitCode=1,'REAL_CHECK_EXIT_gate'],
  ['unrelated source log',f=>f.proof.checks.source.file=F.gate,'CHECK_EXACT_LOG_source'],
  ['old workflow block reused',f=>f.proof.checks.source.signedBlockSha256='0'.repeat(64),'SIGNED_BLOCK_source'],
  ['other cloud build proof',f=>f.proof.buildId='12345678-1234-4234-8234-123456789036','WORKER_BUILD_ID'],
  ['product source changed',f=>f.proof.sourceSha='0'.repeat(40),'WORKER_SOURCE'],
  ['source tree changed',f=>f.proof.sourceTreeSha='0'.repeat(40),'WORKER_SOURCE_TREE'],
  ['different account in worker',f=>f.proof.serviceAccount='other@example.com','WORKER_PRINCIPAL'],
  ['missing claim generation',f=>delete f.proof.lock.generation,'BUILD_LOCK_GENERATION'],
  ['prior artifact generation',f=>f.objects[F.archive].timeCreated='2026-11-24T12:00:00.000Z','ARTIFACT_FROM_CURRENT_BUILD'],
  ['artifact overwritten after completion',f=>f.objects[F.archive].timeCreated='2026-11-26T12:00:00.000Z','ARTIFACT_FROM_CURRENT_BUILD'],
  ['LIVE overclaim',f=>f.proof.deployments.live=1,'NO_DEPLOY_OVERCLAIM'],
  ['acceptance overclaim',f=>f.proof.fullI66ProductionAccepted=true,'NO_ACCEPTANCE_OVERCLAIM']
])test('readback rejects '+label,()=>{const f=proofFixture();change(f);assert.throws(()=>owner.validateWorkerProof(f.p,f.b,f.proof,f.files,f.objects),new RegExp(code));});

for(const name of ['GITHUB_ACTIONS','GITHUB_RUN_ID','GOOGLE_APPLICATION_CREDENTIALS','CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE','GCE_METADATA_HOST','FIRESTORE_EMULATOR_HOST']){
  test('runtime rejects '+name+' before metadata or provider I/O',async()=>{
    const env={GRAVICENTRA_BUILD_PROVIDER:C.provider,GRAVICENTRA_CLOUD_BUILD_ID:buildUuid,GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT:C.serviceAccount,[name]:'untrusted'};
    await assert.rejects(owner.workerIdentity(env),new RegExp('NO_FAKE_OR_OVERRIDDEN_IDENTITY_'+name));
  });
}

test('failed real child preserves exit, full file and bounded causal tail in the provider log',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'i66-cloud-log-test-')),log=path.join(temp,'check.log');
  const oldWrite=process.stderr.write,oldError=console.error;let captured='';
  process.stderr.write=value=>{captured+=String(value);return true;};console.error=value=>{captured+=String(value)+'\n';};
  try{
    assert.throws(()=>owner.execLogged(process.execPath,['-e','for(let i=0;i<400;i++)console.log("synthetic-line-"+i+" "+"x".repeat(100));console.error("SYNTHETIC_CAUSAL_GATE_ASSERTION");process.exit(7)'],
      {cwd:temp,env:{...process.env,I66_NOT_PRINTED_SECRET:'SYNTHETIC_ENV_MUST_NOT_APPEAR'},log}),error=>error.exitCode===7&&/COMMAND_FAILED_check.log/.test(error.message));
  }finally{process.stderr.write=oldWrite;console.error=oldError;}
  try{
    assert.ok(captured.includes('"exitCode":7'));assert.ok(captured.includes('SYNTHETIC_CAUSAL_GATE_ASSERTION'));
    assert.ok(!captured.includes('synthetic-line-0 '));assert.ok(!captured.includes('SYNTHETIC_ENV_MUST_NOT_APPEAR'));
    assert.ok(Buffer.byteLength(captured)<17000);assert.ok(captured.split('\n').length<=203);
    const full=fs.readFileSync(log,'utf8');assert.ok(full.includes('synthetic-line-0 '));assert.ok(full.includes('SYNTHETIC_CAUSAL_GATE_ASSERTION'));
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('successful real child retains PASS and complete file without emitting failure tail',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'i66-cloud-log-pass-')),log=path.join(temp,'check.log');
  const oldWrite=process.stderr.write,oldError=console.error;let captured='';
  process.stderr.write=value=>{captured+=String(value);return true;};console.error=value=>{captured+=String(value)+'\n';};
  try{
    const result=owner.execLogged(process.execPath,['-e','console.log("SYNTHETIC_CHECK_PASS")'],{cwd:temp,env:process.env,log});
    assert.equal(result.status,'PASS');assert.equal(result.exitCode,0);assert.equal(captured,'');assert.equal(fs.readFileSync(log,'utf8'),'SYNTHETIC_CHECK_PASS\n');
  }finally{process.stderr.write=oldWrite;console.error=oldError;fs.rmSync(temp,{recursive:true,force:true});}
});

function requestHarness(responses){
  const calls=[],diagnostics=[],pauses=[];
  return {calls,diagnostics,pauses,context:{operation:'GITHUB_RUN',pause:async ms=>{pauses.push(ms);},emit:value=>diagnostics.push(value),
    fetch:async(url,options)=>{calls.push({url,options});const response=responses[Math.min(calls.length-1,responses.length-1)];
      if(response instanceof Error)throw response;return response;}}};
}
const jsonResponse=(value,status=200)=>({status,ok:status>=200&&status<300,headers:{get:()=>null},json:async()=>value});
const transientError=code=>Object.assign(new TypeError('fetch failed PRIVATE_PROVIDER_DETAIL'),{cause:{code}});
test('provider GET recovers one transient socket error with bounded diagnostics and unchanged request',async()=>{
  const h=requestHarness([transientError('UND_ERR_SOCKET'),jsonResponse({id:35})]);
  const value=await owner.requestJson('https://api.github.com/private-path?secret=PRIVATE_QUERY',
    {headers:{Authorization:'Bearer PRIVATE_AUTH'}},h.context);
  assert.deepEqual(value,{id:35});assert.equal(h.calls.length,2);assert.deepEqual(h.pauses,[250]);
  assert.deepEqual(h.calls[0].options.headers,h.calls[1].options.headers);
  for(const call of h.calls){assert.equal(call.options.redirect,'error');assert.ok(call.options.signal instanceof AbortSignal);}
  assert.notEqual(h.calls[0].options.signal,h.calls[1].options.signal);
  const row=JSON.parse(h.diagnostics[0].slice(h.diagnostics[0].indexOf('{')));
  assert.deepEqual(row,{operation:'GITHUB_RUN',method:'GET',hostname:'api.github.com',attempt:1,httpStatus:null,causeCode:'UND_ERR_SOCKET',retry:true});
  assert.ok(!h.diagnostics.join('\n').includes('PRIVATE_'));
});
test('provider GET exhausts after three explicit transient failures without printing message or query',async()=>{
  const h=requestHarness([transientError('ECONNRESET')]);
  await assert.rejects(owner.requestJson('https://api.github.com/private-path?PRIVATE_QUERY',{},h.context),error=>
    error.message==='I66_CLOUD_BUILD_REQUEST_FAILED_GITHUB_RUN_GET_api.github.com_ECONNRESET');
  assert.equal(h.calls.length,3);assert.deepEqual(h.pauses,[250,1000]);assert.equal(h.diagnostics.length,3);
  assert.equal(JSON.parse(h.diagnostics[2].slice(h.diagnostics[2].indexOf('{'))).retry,false);
  assert.ok(!h.diagnostics.join('\n').includes('PRIVATE_'));
});
for(const status of [403,429,500])test('provider GET does not retry HTTP '+status+' or consume its private error body',async()=>{
  let bodyRead=false;const response=jsonResponse(null,status);response.json=async()=>{bodyRead=true;throw Error('PRIVATE_HTTP_BODY');};
  const h=requestHarness([response]);
  await assert.rejects(owner.requestJson('https://cloudbuild.googleapis.com/private-path?PRIVATE_QUERY',{},
    {...h.context,operation:'CLOUD_BUILD_METADATA'}),new RegExp('HTTP_STATUS_'+status));
  assert.equal(h.calls.length,1);assert.deepEqual(h.pauses,[]);assert.equal(bodyRead,false);
  assert.ok(!h.diagnostics.join('\n').includes('PRIVATE_'));
});
test('conditional claim POST with lost response remains exactly one attempt and never falls back to GET',async()=>{
  const h=requestHarness([transientError('UND_ERR_SOCKET')]);
  await assert.rejects(owner.requestJson('https://storage.googleapis.com/upload?ifGenerationMatch=0&name=PRIVATE_OBJECT',
    {method:'POST',headers:{Authorization:'Bearer PRIVATE_AUTH'},body:'PRIVATE_CLAIM'},
    {...h.context,operation:'PACKAGE_CLAIM_CREATE'}),/REQUEST_FAILED_PACKAGE_CLAIM_CREATE_POST_storage.googleapis.com_UND_ERR_SOCKET/);
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].options.method,'POST');assert.deepEqual(h.pauses,[]);
  assert.equal(JSON.parse(h.diagnostics[0].slice(h.diagnostics[0].indexOf('{'))).retry,false);
  assert.ok(!h.diagnostics.join('\n').includes('PRIVATE_'));
});
test('conditional claim conflict is terminal and retains the CAS precondition',async()=>{
  const h=requestHarness([jsonResponse(null,412)]),url='https://storage.googleapis.com/upload?ifGenerationMatch=0';
  await assert.rejects(owner.requestJson(url,{method:'POST',body:'CLAIM'},{...h.context,operation:'PACKAGE_CLAIM_CREATE'}),/HTTP_STATUS_412/);
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,url);assert.deepEqual(h.pauses,[]);
});
test('invalid JSON, unknown transport errors and TLS errors are terminal and redact exception details',async()=>{
  const malformed=jsonResponse(null);malformed.json=async()=>{throw new SyntaxError('PRIVATE_BODY');};
  for(const [failure,code] of [[malformed,'INVALID_JSON'],[new TypeError('PRIVATE_UNKNOWN'),'UNCLASSIFIED_TRANSPORT_ERROR'],
    [transientError('CERT_HAS_EXPIRED'),'CERT_HAS_EXPIRED']]){
    const h=requestHarness([failure]);
    await assert.rejects(owner.requestJson('https://api.github.com/private',{},h.context),new RegExp(code));
    assert.equal(h.calls.length,1);assert.deepEqual(h.pauses,[]);assert.ok(!h.diagnostics.join('\n').includes('PRIVATE_'));
  }
});
test('metadata retry still requires Google header and exact runtime identity; token never appears in diagnostics',async()=>{
  const env={GRAVICENTRA_BUILD_PROVIDER:'CLOUD_BUILD',GRAVICENTRA_CLOUD_BUILD_ID:'12345678-1234-1234-1234-123456789abc',
    GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT:owner.C.serviceAccount};
  const token='PRIVATE_SYNTHETIC_ACCESS_TOKEN_FOR_TEST';
  const values=[owner.C.projectId,owner.C.projectNumber,owner.C.serviceAccount,{token_type:'Bearer',access_token:token}];
  const responses=values.map(value=>({...jsonResponse(value),headers:{get:()=> 'Google'},text:async()=>value}));
  const h=requestHarness([transientError('EAI_AGAIN'),...responses]);
  const identity=await owner.workerIdentity(env,h.context);
  assert.equal(identity.buildId,env.GRAVICENTRA_CLOUD_BUILD_ID);assert.equal(identity.headers.Authorization,'Bearer '+token);
  assert.equal(h.calls.length,5);assert.deepEqual(h.pauses,[250]);assert.ok(!h.diagnostics.join('\n').includes(token));
  const denied=requestHarness([{...responses[0],headers:{get:()=>null}}]);
  await assert.rejects(owner.workerIdentity(env,denied.context),/AUTHENTIC_METADATA_REQUIRED/);
  assert.equal(denied.calls.length,1);assert.deepEqual(denied.pauses,[]);
  const wrong=requestHarness([{...responses[0],text:async()=> 'wrong-project'}]);
  await assert.rejects(owner.workerIdentity(env,wrong.context),/METADATA_PROJECT/);assert.equal(wrong.calls.length,1);
});
