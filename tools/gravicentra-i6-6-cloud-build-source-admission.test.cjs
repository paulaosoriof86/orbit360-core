'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),Module=require('node:module');
const {execFileSync}=require('node:child_process');
const owner=require('./gravicentra-i6-6-cloud-build-source-admission.cjs'),pkg=require('./gravicentra-i6-6-cloud-build-package.cjs');
const {C,F,STEPS,JOBS}=owner,copy=x=>structuredClone(x),root=path.join(__dirname,'..');
const sourceText=fs.readFileSync(path.join(root,C.sourceWorkflow),'utf8'),guardText=fs.readFileSync(path.join(root,C.guardWorkflow),'utf8');
const id='22345678-1234-4234-8234-123456789036',packageId='12345678-1234-4234-8234-123456789035';
const start='2026-11-25T12:00:00.000Z',end='2026-11-25T12:05:00.000Z';
// UUIDs, times, objects and provider replies below are synthetic fixtures. No
// test dispatches a build, changes a ref, uses credentials, or performs UAT.
function plan(){
  const c=owner.workflowContract(sourceText,guardText,'fix: synthetic native source QA\n');
  return {schema:C.planSchema,provider:C.provider,scope:C.scope,mode:C.mode,
    repository:C.repository,branch:C.branch,projectId:C.projectId,projectNumber:C.projectNumber,region:C.region,serviceAccount:C.serviceAccount,bucket:C.bucket,
    mechanismSha:'a'.repeat(40),sourceQaHead:'b'.repeat(40),sourceTreeSha:'c'.repeat(40),commitMessageSha256:pkg.sha('fix: synthetic native source QA\n'),
    pins:Object.fromEntries(owner.PINS.map(p=>[p,{blob:'d'.repeat(40),sha256:'e'.repeat(64)}])),
    workflows:Object.fromEntries([[C.sourceWorkflow,sourceText],[C.guardWorkflow,guardText]].map(([p,t])=>[p,{blob:pkg.blob(t),sha256:pkg.sha(t)}])),
    jobs:c.jobs,blocks:Object.fromEntries(Object.keys(STEPS).map(k=>[k,{signedSha256:pkg.sha(c.blocks[k]),executedSha256:pkg.sha(c.runtime[k])}])),
    noDeploy:true,realBusinessWrites:0,fullI66ProductionAccepted:false};
}
function build(p=plan()){
  const c=owner.configFor(p);return {...c,id,name:'projects/'+C.projectNumber+'/locations/'+C.region+'/builds/'+id,projectId:C.projectId,status:'SUCCESS',
    source:{gitSource:{url:C.repositoryUrl,revision:p.mechanismSha}},sourceProvenance:{resolvedGitSource:{url:C.repositoryUrl,revision:p.mechanismSha}},
    steps:c.steps.map(s=>({...s,status:'SUCCESS',timing:{startTime:start,endTime:'2026-11-25T12:04:00.000Z'}})),
    artifacts:{objects:{...c.artifacts.objects,location:c.artifacts.objects.location.replace('$BUILD_ID',id)}},
    results:{buildStepImages:['sha256:'+'9'.repeat(64)],numArtifacts:String(Object.keys(F).length),artifactManifest:'gs://'+C.bucket+'/'+owner.prefix(p,id)+'artifacts-'+id+'.json#101'},
    createTime:'2026-11-25T11:59:58.000Z',startTime:start,finishTime:end,
    logUrl:'https://console.cloud.google.com/cloud-build/builds;region='+C.region+'/'+id+'?project='+C.projectId};
}
function fixture(){
  const p=plan(),b=build(p),files=Object.fromEntries(Object.values(F).filter(f=>f!==F.proof).map(f=>[f,Buffer.from('synthetic '+f+'\n')]));
  files[F.source]=Buffer.from('I66_PRIVILEGED_ROLE_SYNTHETIC_SOURCE_REGRESSION_PASS_NO_CUSTOMER_WRITES_NO_DEPLOY\n');
  files[F.lineage]=Buffer.from('I66_APPROVED_ROLE_SOURCE_LINEAGE_GUARD_PASS_PREVIEW_AND_LIVE_STILL_PENDING\n');
  const availability={result:'PASS',readOnly:true,controlPlaneTransportAgree:true,bothAnonymousHome200:true,bothMarkersExact:true,expectedSource:'f'.repeat(40),expectedBuild:'gi-i66-synthetic-existing-live',
    checks:['CUSTOM','CUSTOM_MARKER','FIREBASE','FIREBASE_MARKER'].map(label=>({label,status:200,dns:['192.0.2.1'],error:null,...(label.endsWith('_MARKER')?{sourceSha:'f'.repeat(40),buildId:'gi-i66-synthetic-existing-live'}:{})}))};
  const checks={};let n=0;
  for(const [name,step] of Object.entries(STEPS)){
    const t=Date.parse(start)+1000+30000*n++;
    checks[name]={status:'PASS',exitCode:0,startedAt:new Date(t).toISOString(),endedAt:new Date(t+20000).toISOString(),file:F[name],job:JOBS[step.job],
      signedBlockSha256:p.blocks[name].signedSha256,executedBlockSha256:p.blocks[name].executedSha256,logSha256:pkg.sha(files[F[name]])};
  }
  const proof={schema:C.proofSchema,provider:C.provider,scope:C.scope,status:'SOURCE_QA_AND_GUARD_EXECUTED_NO_RELEASE_ADMISSION',buildId:id,sourceQaHead:p.sourceQaHead,sourceTreeSha:p.sourceTreeSha,
    mechanismSha:p.mechanismSha,planSha256:pkg.digest(p),serviceAccount:C.serviceAccount,checks,fileHashes:{},noDeploy:true,realBusinessWrites:0,fullI66ProductionAccepted:false};
  const objects=new Map(),calls=[];
  function sync(){
    objects.clear();files[F.availabilityReport]=Buffer.from(JSON.stringify(availability));
    proof.fileHashes=Object.fromEntries(Object.entries(files).filter(([f])=>f!==F.proof).map(([f,b])=>[f,pkg.sha(b)]));files[F.proof]=Buffer.from(JSON.stringify(proof));
    const rows=[];
    for(const [file,bytes] of Object.entries(files)){const name=owner.prefix(p,id)+file,md5=crypto.createHash('md5').update(bytes).digest('base64');
      objects.set(name,{data:bytes,meta:{bucket:C.bucket,name,generation:'102',size:String(bytes.length),timeCreated:'2026-11-25T12:04:30.000Z',md5Hash:md5}});
      rows.push({location:'gs://'+C.bucket+'/'+name+'#102',file_hash:[{type:2,value:md5}]});
    }
    const name=owner.prefix(p,id)+'artifacts-'+id+'.json',data=Buffer.from(JSON.stringify(rows));
    objects.set(name,{data,meta:{bucket:C.bucket,name,generation:'101',size:String(data.length),timeCreated:'2026-11-25T12:04:40.000Z'}});
    const logName='i66/cloud-build-logs/log-'+id+'.txt',log=Buffer.from('I66_NATIVE_SOURCE_QA_READY_FOR_PROVIDER_RETENTION '+JSON.stringify({buildId:id,sourceQaHead:p.sourceQaHead,planSha256:pkg.digest(p),proofSha256:pkg.sha(files[F.proof]),scope:C.scope})+'\n');
    objects.set(logName,{data:log,meta:{bucket:C.bucket,name:logName,generation:'103',size:String(log.length)}});
  }
  sync();
  const io={api:async url=>{calls.push(['api',url]);assert.equal(url,'https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+id);return b;},
    metadata:async(name,gen)=>{calls.push(['metadata',name,gen]);const o=objects.get(name);assert.ok(o,'unexpected object '+name);return o.meta;},
    bytes:async(name,gen)=>{calls.push(['bytes',name,gen]);assert.match(gen,/^[1-9][0-9]*$/);const o=objects.get(name);assert.ok(o);return o.data;}};
  return {p,b,files,proof,availability,objects,calls,io,sync};
}
async function temp(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-native-source-test-'));try{return await fn(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}}

test('literal original source, lineage, governance, receipt and LIVE probe remain intact',()=>{
  const c=owner.workflowContract(sourceText,guardText,'fix: ordinary source change\n');
  assert.deepEqual(c.jobs,{source:{id:JOBS.source,timeoutSeconds:960},governance:{id:JOBS.governance,timeoutSeconds:480},availability:{id:JOBS.availability,timeoutSeconds:300}});
  assert.equal(c.runtime.source,c.blocks.source);assert.equal(c.runtime.lineage,c.blocks.lineage);assert.equal(c.runtime.receipt,c.blocks.receipt);
  assert.equal(c.runtime.governance.replaceAll('$I66_SOURCE_QA_BRANCH','$GITHUB_REF_NAME').replaceAll('$I66_SOURCE_QA_SUMMARY','$GITHUB_STEP_SUMMARY'),c.blocks.governance);
  assert.equal(c.runtime.availability.replaceAll("os.environ['I66_SOURCE_QA_SUMMARY']","os.environ['GITHUB_STEP_SUMMARY']"),c.blocks.availability);
  assert.ok(c.runtime.source.includes('tools/gravicentra-i6-6-payment-optional-evidence.test.cjs'));
  assert.ok(c.runtime.source.includes('tools/gravicentra-i6-6-privileged-role-writer-transaction.test.cjs'));
  assert.ok(c.runtime.governance.includes('tools/gravicentra-governance-preflight-v1.mjs --mode=governance'));
  assert.ok(!Object.values(c.runtime).some(s=>s.includes('GITHUB_')));
});
for(const message of ['fix: I66_QA_DETACH_CAUSAL_CHECK','test(i6.5 B4-003 security-emulator): test','fix(b4003): permission repair'])
  test('applicable existing conditional job cannot be silently skipped: '+message,()=>assert.throws(()=>owner.workflowContract(sourceText,guardText,message),/APPLICABLE_CONDITIONAL_JOB/));
for(const [name,s,g] of [
  ['missing source step',sourceText.replace(STEPS.source.name,'absent step'),guardText],
  ['changed lineage owner',sourceText.replace('node tools/gravicentra-i6-6-delta-guard.mjs','echo bypass'),guardText],
  ['source conditional bypass',sourceText.replace('      - name: '+STEPS.source.name+'\n','      - name: '+STEPS.source.name+'\n        if: false\n'),guardText],
  ['new required job',sourceText+'\n  another-job:\n    steps: []\n',guardText],
  ['changed conditional semantics',sourceText.replace("contains(github.event.head_commit.message, 'I66_QA_DETACH_CAUSAL_CHECK')","true"),guardText],
  ['broadened conditional still containing original expression',sourceText.replace("&& github.event_name == 'push' && contains","|| true || github.event_name == 'push' && contains"),guardText],
  ['new required run step',sourceText.replace('      - name: Preserve source-only validation receipt','      - name: Additional source gate\n        run: echo another\n      - name: Preserve source-only validation receipt'),guardText],
  ['global environment override','env:\n  NODE_OPTIONS: override\n'+sourceText,guardText],
  ['missing governance owner',sourceText,guardText.replace('node tools/gravicentra-governance-preflight-v1.mjs --mode=governance','echo bypass')],
  ['removed public probe HOLD',sourceText,guardText.replace("if report['result']!='PASS': raise SystemExit('I66_LIVE_PUBLIC_AVAILABILITY_HOLD')",'pass')],
  ['different receipt owner',sourceText,guardText.replace('run: node --test tools/gravicentra-i66-frontend-control.test.cjs','run: echo success')],
  ['deployment in source',sourceText.replace("echo 'I66_PRIVILEGED_ROLE_SYNTHETIC_SOURCE_REGRESSION_PASS_NO_CUSTOMER_WRITES_NO_DEPLOY'","firebase deploy\n          echo 'I66_PRIVILEGED_ROLE_SYNTHETIC_SOURCE_REGRESSION_PASS_NO_CUSTOMER_WRITES_NO_DEPLOY'"),guardText]
])test('workflow contract rejects '+name,()=>assert.throws(()=>owner.workflowContract(s,g,'fix: source correction\n')));
test('native config has no Actions IDs, failed-run prerequisite, deploy command or GitHub credentials',()=>{
  const p=plan(),c=owner.configFor(p);assert.equal(owner.validatePlan(p),p);
  assert.equal(c.timeout,'1740s');assert.equal(c.steps[0].name,'node:22-bookworm');assert.equal(c.steps[0].args.at(-1),JSON.stringify(p));
  assert.match(c.steps[0].args[3],/google-auth-library@10\.9\.1/);assert.match(c.steps[0].args[3],/worker "\$\$1"/);
  assert.ok(!/sourceQaRunId|guardRunId|unexecutedGithubBuild|GITHUB_TOKEN|firebase deploy|hosting:clone/.test(JSON.stringify(c)));
});
function preparationHarness(){
  const repo='/synthetic-native-source-prepare',sourceQaHead='b'.repeat(40),mechanismSha='a'.repeat(40),tree='c'.repeat(40),reads=[];
  const originals=new Map([[C.sourceWorkflow,Buffer.from(sourceText)],[C.guardWorkflow,Buffer.from(guardText)]]);
  const pinned=new Map(owner.PINS.map(file=>[file,Buffer.from('synthetic pinned owner '+file)]));
  const state={message:'fix: synthetic native source QA\n',tree,dirty:false};
  const filename=path.join(__dirname,path.basename(C.tool)),loaded=new Module(filename,module),realRequire=loaded.require.bind(loaded);
  loaded.filename=filename;loaded.paths=Module._nodeModulePaths(__dirname);
  loaded.require=name=>name==='node:child_process'?{execFileSync:(command,args,options)=>{
    assert.equal(command,'git');assert.equal(options.cwd,repo);reads.push(args);let value;
    if(args.join(' ')==='rev-parse HEAD')value=mechanismSha;
    else if(args[0]==='merge-base'){assert.deepEqual(args,['merge-base','--is-ancestor',sourceQaHead,mechanismSha]);value='';}
    else if(args.join(' ')==='rev-parse '+sourceQaHead+'^{tree}')value=state.tree;
    else if(args.join(' ')==='show -s --format=%B '+sourceQaHead)value=state.message;
    else if(args[0]==='show'){
      const [ref,file]=args[1].split(':');assert.ok(ref===sourceQaHead||ref===mechanismSha);
      value=(ref===sourceQaHead?originals:pinned).get(file);
    }
    assert.notEqual(value,undefined,'UNEXPECTED_PREPARATION_GIT_READ '+args.join(' '));
    return options.encoding?String(value):Buffer.from(value);
  }}:name==='node:fs'?{...fs,readFileSync:file=>{
    const name=path.relative(repo,file);assert.ok(pinned.has(name),'UNEXPECTED_OWNER_READ '+file);
    return state.dirty?Buffer.from('uncommitted drift'):pinned.get(name);
  }}:realRequire(name);
  loaded._compile(fs.readFileSync(filename,'utf8'),filename);
  return {repo,sourceQaHead,mechanismSha,reads,state,originals,pinned,helper:loaded.exports};
}
test('prepare binds exact committed owners, original workflow bytes, source tree and message without remote operations',()=>{
  const h=preparationHarness(),p=h.helper.makePlan(h.repo,{sourceQaHead:h.sourceQaHead,mechanismSha:h.mechanismSha});
  assert.equal(p.sourceQaHead,h.sourceQaHead);assert.equal(p.sourceTreeSha,h.state.tree);
  for(const [name,bytes] of h.pinned)assert.deepEqual(p.pins[name],{blob:pkg.blob(bytes),sha256:pkg.sha(bytes)});
  assert.equal(p.workflows[C.guardWorkflow].blob,pkg.blob(guardText));
  const contract=h.helper.sourceContract(h.repo,p);assert.equal(contract.blocks.source,owner.workflowContract(sourceText,guardText,h.state.message).blocks.source);
  assert.ok(h.reads.every(args=>['show','rev-parse','merge-base'].includes(args[0])));
  h.state.dirty=true;assert.throws(()=>h.helper.makePlan(h.repo,{sourceQaHead:h.sourceQaHead,mechanismSha:h.mechanismSha}),/MECHANISM_WORKTREE_DRIFT/);
});
for(const [name,change] of [
  ['source tree changed',h=>h.state.tree='d'.repeat(40)],
  ['commit message changed',h=>h.state.message='fix: other source message\n'],
  ['literal workflow bytes changed',h=>h.originals.set(C.sourceWorkflow,Buffer.from(sourceText+'\n'))]
])test('worker source contract refuses '+name,()=>{
  const h=preparationHarness(),p=h.helper.makePlan(h.repo,{sourceQaHead:h.sourceQaHead,mechanismSha:h.mechanismSha});change(h);
  assert.throws(()=>h.helper.sourceContract(h.repo,p));
});
for(const [name,mutate] of [
  ['legacy run ID injected',p=>p.sourceQaRunId=42],['unknown provider',p=>p.provider='OTHER'],['other project',p=>p.projectId='other'],
  ['missing workflow pin',p=>delete p.workflows[C.guardWorkflow]],['missing test pin',p=>delete p.pins[C.test]],
  ['missing mandatory job',p=>delete p.jobs.availability],['unknown block',p=>p.blocks.another=copy(p.blocks.source)],
  ['invalid timeout',p=>p.jobs.source.timeoutSeconds=0],['production claim',p=>p.fullI66ProductionAccepted=true],['real write',p=>p.realBusinessWrites=1]
])test('closed native plan rejects '+name,()=>{const p=plan();mutate(p);assert.throws(()=>owner.validatePlan(p));});
test('build verification requires successful real metadata and accepts only actual substitution forms',()=>{
  const p=plan(),b=build(p);assert.equal(owner.validateBuild(p,b),b);
  b.steps[0].args[3]=b.steps[0].args[3].replaceAll('$$','$');
  b.steps[0].env=b.steps[0].env.map(s=>s.replace(/\$([A-Z_][A-Z0-9_]*)/g,(m,k)=>k==='BUILD_ID'?id:b.substitutions[k]??m));
  assert.equal(owner.validateBuild(p,b),b);b.status='WORKING';delete b.results;delete b.steps[0].status;
  assert.equal(owner.validateBuild(p,b,{finished:false}),b);assert.throws(()=>owner.validateBuild(p,b));
});
for(const [name,mutate] of [
  ['numeric pseudo run',b=>b.id=45548703476],['failed execution',b=>b.status='FAILURE'],['skipped QA',b=>b.steps[0].status='SKIPPED'],
  ['empty job success',b=>b.steps=[]],['ignored failure',b=>b.steps[0].allowFailure=true],['extra executor',b=>b.steps.push(copy(b.steps[0]))],
  ['altered block args',b=>b.steps[0].args[3]='echo pass'],['changed source',b=>b.source.gitSource.revision='0'.repeat(40)],
  ['different principal',b=>b.serviceAccount='other'],['extra env',b=>b.options.env=['GITHUB_RUN_ID=7']],
  ['secrets',b=>b.availableSecrets={}],['no image digest',b=>b.results.buildStepImages=['node:22']],
  ['missing outputs',b=>b.results.numArtifacts=0],['wrong manifest',b=>b.results.artifactManifest='gs://other/a#1'],
  ['time outside worker',b=>b.steps[0].timing.endTime='2026-11-25T14:00:00Z'],['unbounded overall timeout',b=>b.timeout='86400s'],
  ['local step timeout override',b=>b.steps[0].timeout='2s']
])test('real provider metadata rejects '+name,()=>{const p=plan(),b=build(p);mutate(b);assert.throws(()=>owner.validateBuild(p,b));});
test('per-job timeout preserves original job budget and is capped by actual total deadline',()=>{
  const p=plan(),b=build(p),t=Date.parse(start);assert.equal(owner.jobBudgetMs(p,b,'source',t,t),960000);
  assert.equal(owner.jobBudgetMs(p,b,'source',t,t+120000),840000);
  assert.equal(owner.jobBudgetMs(p,b,'availability',t+1700000,t+1700000),40000);
  assert.throws(()=>owner.jobBudgetMs(p,b,'source',t,t+960000),/BUDGET_EXHAUSTED/);
  assert.throws(()=>owner.jobBudgetMs(p,b,'availability',t+1700000,t+1740000),/BUDGET_EXHAUSTED/);
});
function identityHarness(){
  const env={GRAVICENTRA_BUILD_PROVIDER:C.provider,GRAVICENTRA_CLOUD_BUILD_ID:id,GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT:C.serviceAccount,PROJECT_ID:C.projectId},calls=[];
  const values=[C.projectId,C.projectNumber,C.serviceAccount];
  return {env,calls,deps:{exists:()=>false,homedir:()=>'/synthetic-home',fetcher:async(url,options)=>{
    calls.push({url,options});assert.ok(!url.includes('/token'));return {status:200,redirected:false,headers:{get:()=> 'Google'},text:async()=>values[calls.length-1]};}}};
}
test('worker checks actual metadata identity without reading a token or exporting credentials',async()=>{
  const h=identityHarness(),identity=await owner.workerIdentity(h.env,h.deps);assert.equal(identity.buildId,id);assert.equal(h.calls.length,3);assert.ok(!('headers' in identity));
});
for(const key of ['GITHUB_RUN_ID','GOOGLE_APPLICATION_CREDENTIALS','CLOUDSDK_AUTH_ACCESS_TOKEN','CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT','GCE_METADATA_HOST','FIRESTORE_EMULATOR_HOST'])
  test('worker refuses override '+key,async()=>{const h=identityHarness();h.env[key]='synthetic';await assert.rejects(owner.workerIdentity(h.env,h.deps),/OVERRIDE/);assert.equal(h.calls.length,0);});
test('worker refuses local ADC and untrusted worker metadata',async()=>{
  const h=identityHarness();h.deps.exists=()=>true;await assert.rejects(owner.workerIdentity(h.env,h.deps),/NO_LOCAL_ADC/);assert.equal(h.calls.length,0);
  h.deps.exists=()=>false;h.deps.fetcher=async()=>({status:200,redirected:false,headers:{get:()=>null},text:async()=>C.projectId});
  await assert.rejects(owner.workerIdentity(h.env,h.deps),/TRUSTED_WORKER_METADATA/);
});
test('native Build GET uses SDK ADC request and never getAccessToken',async()=>{
  const calls=[];
  class GoogleAuth{constructor(options){calls.push(['constructor',options]);}async getClient(){return {getAccessToken(){throw Error('TOKEN_EXTRACTION_FORBIDDEN');},async request(options){calls.push(['request',options]);return {data:{id}};}};}}
  assert.deepEqual(await owner.sdkReadBuild(id,GoogleAuth),{id});
  assert.deepEqual(calls[0][1],{projectId:C.projectId,scopes:['https://www.googleapis.com/auth/cloud-platform']});
  assert.deepEqual(calls[1][1],{url:'https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+id,method:'GET',responseType:'json',timeout:60000});
});
test('native source receipt reads actual build, exact manifest/object generations, hashes, step results and provider log',()=>temp(async dir=>{
  const f=fixture(),receipt=await owner.verify(f.p,id,path.join(dir,'out'),f.io);
  assert.equal(receipt.executionProvider,C.provider);assert.equal(receipt.buildId,id);assert.equal(receipt.fullI66ProductionAccepted,false);
  assert.equal(receipt.manifest.generation,'101');assert.equal(receipt.objects[F.proof].generation,'102');assert.equal(receipt.log.generation,'103');
  assert.ok(f.calls.filter(c=>c[0]==='bytes').every(c=>/^[1-9][0-9]*$/.test(c[2])));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'out','receipt.json'),'utf8')),receipt);
}));
for(const [name,mutate] of [
  ['wrong source',f=>f.proof.sourceQaHead='0'.repeat(40)],['wrong UUID',f=>f.proof.buildId=packageId],
  ['missing source check',f=>delete f.proof.checks.source],['source failed',f=>f.proof.checks.source.exitCode=1],
  ['fabricated body hash',f=>f.proof.checks.lineage.signedBlockSha256='0'.repeat(64)],
  ['stale QA time',f=>f.proof.checks.source.startedAt='2026-11-24T12:00:00Z'],['LIVE overclaim',f=>f.proof.fullI66ProductionAccepted=true],
  ['public root failed',f=>f.availability.checks[0].status=500],['one marker drift',f=>f.availability.checks[3].buildId='different'],
  ['missed LIVE origin',f=>f.availability.checks.pop()],['availability HOLD',f=>f.availability.result='HOLD']
])test('source proof rejects '+name,()=>temp(async dir=>{const f=fixture();mutate(f);f.sync();await assert.rejects(owner.verify(f.p,id,path.join(dir,'out'),f.io));assert.ok(!fs.existsSync(path.join(dir,'out')));}));
for(const [name,mutate] of [
  ['generation mismatch',f=>f.objects.get(owner.prefix(f.p,id)+F.source).meta.generation='999'],
  ['wrong object bytes',f=>f.objects.get(owner.prefix(f.p,id)+F.source).data=Buffer.from('tampered source log')],
  ['post-build overwrite',f=>f.objects.get(owner.prefix(f.p,id)+F.source).meta.timeCreated='2026-11-25T12:07:00Z'],
  ['public artifact',f=>f.objects.get(owner.prefix(f.p,id)+F.source).meta.acl=[{entity:'allUsers'}]],
  ['changed provider marker',f=>{const o=f.objects.get('i66/cloud-build-logs/log-'+id+'.txt');o.data=Buffer.from(o.data.toString().replace(id,packageId));o.meta.size=String(o.data.length);}],
  ['duplicate provider marker',f=>{const o=f.objects.get('i66/cloud-build-logs/log-'+id+'.txt');o.data=Buffer.concat([o.data,o.data]);o.meta.size=String(o.data.length);}],
  ['duplicate native manifest member',f=>{const o=f.objects.get(owner.prefix(f.p,id)+'artifacts-'+id+'.json'),r=JSON.parse(o.data);r[1]=r[0];o.data=Buffer.from(JSON.stringify(r));o.meta.size=String(o.data.length);}]
])test('retained evidence rejects '+name,()=>temp(async dir=>{const f=fixture();mutate(f);await assert.rejects(owner.verify(f.p,id,path.join(dir,'out'),f.io));}));
test('gcloud adapter is read-only, generation-specific, and never lists storage or reads credentials',async()=>{
  const calls=[],run=(cmd,args,options)=>{calls.push({cmd,args,options});return args[0]==='storage'&&args[1]==='cat'?Buffer.from('synthetic'):'{}';};
  const io=owner.gcloudReadIo(run),name='i66/source-qa/test/object.json';
  await io.api('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+id);await io.metadata(name,'101');await io.bytes(name,'101');
  assert.deepEqual(calls.map(c=>c.args.slice(0,2)),[['builds','describe'],['storage','objects'],['storage','cat']]);
  assert.equal(calls[1].args[3],'gs://'+C.bucket+'/'+name+'#101');assert.equal(calls[2].args[2],'gs://'+C.bucket+'/'+name+'#101');
  await assert.rejects(io.bytes(name,undefined),/EXACT_BYTES_GENERATION/);await assert.rejects(io.metadata('i66/../bad','1'),/READONLY_OBJECT_PATH/);
  await assert.rejects(io.api('https://other.example/builds/'+id),/READONLY_BUILD_API/);assert.equal(calls.length,3);
});

function packageFixture(){
  const PC=pkg.C,PF=pkg.F,workflow=fs.readFileSync(path.join(root,PC.workflow),'utf8'),blocks=pkg.workflowBlocks(workflow);
  const p={schema:PC.planSchema,provider:PC.provider,scope:PC.scope,repository:PC.repository,branch:PC.branch,projectId:PC.projectId,projectNumber:PC.projectNumber,region:PC.region,serviceAccount:PC.serviceAccount,bucket:PC.bucket,
    mechanismSha:'a'.repeat(40),sourceSha:'b'.repeat(40),sourceTreeSha:'c'.repeat(40),requestVersion:35,transportBlob:'d'.repeat(40),manifestBlob:'e'.repeat(40),requestSha256:'f'.repeat(64),
    sourceQa:{headSha:'1'.repeat(40),runId:45548703476,guardRunId:45548703495},pins:Object.fromEntries([PC.tool,PC.test,PC.branding,PC.brandingTest].map(p=>[p,{blob:'2'.repeat(40),sha256:'3'.repeat(64)}])),
    workflowBlob:pkg.blob(workflow),workflowSha256:pkg.sha(workflow),builderBlob:'4'.repeat(40),blocks:Object.fromEntries(Object.entries(blocks).map(([k,v])=>[k,pkg.sha(v)])),
    unexecutedGithubBuild:{runId:45549464538,attempt:2},noDeploy:true,realBusinessWrites:0,fullI66ProductionAccepted:false};
  const c=pkg.configFor(p),b={...c,id:packageId,name:'projects/'+C.projectNumber+'/locations/'+C.region+'/builds/'+packageId,projectId:C.projectId,status:'SUCCESS',
    source:{gitSource:{url:C.repositoryUrl,revision:p.mechanismSha}},sourceProvenance:{resolvedGitSource:{url:C.repositoryUrl,revision:p.mechanismSha}},
    steps:c.steps.map(s=>({...s,status:'SUCCESS',timing:{startTime:start,endTime:'2026-11-25T12:04:00.000Z'}})),
    artifacts:{objects:{...c.artifacts.objects,location:c.artifacts.objects.location.replace('$BUILD_ID',packageId)}},
    results:{buildStepImages:['sha256:'+'5'.repeat(64)],numArtifacts:String(Object.keys(PF).length),artifactManifest:'gs://'+C.bucket+'/'+pkg.artifactPrefix(p,packageId)+'artifacts-'+packageId+'.json#111'},
    createTime:'2026-11-25T11:59:58.000Z',startTime:start,finishTime:end,logUrl:'https://console.cloud.google.com/cloud-build/builds;region='+C.region+'/'+packageId+'?project='+C.projectId};
  const files=Object.fromEntries(Object.values(PF).map(n=>[n,Buffer.from('synthetic '+n+'\n')]));
  files[PF.archive]=Buffer.from('synthetic archive, never production');files[PF.digest]=Buffer.from(pkg.sha(files[PF.archive])+'  /workspace/gi-i66-exact-package.tar.gz\n');
  files[PF.build]=Buffer.from('I66_MANIFEST_EXACT_BUILD_BOUND_INDEX_PWA_AND_TENANT_ICONS_PASS\nI66_BUILD_ONE_SOURCE_ONE_ARTIFACT_NO_DEPLOY_PASS\n');
  files[PF.admission]=Buffer.from(JSON.stringify({eligible:true,sourceSha:p.sourceSha,apiReads:[1,2,3,4,5],markers:[1,2]}));
  const checks={};for(const name of ['gate','source','build','archive','admission','mechanism']){
    const file=name==='archive'?PF.build:PF[name];checks[name]={status:'PASS',exitCode:0,startedAt:start,endedAt:'2026-11-25T12:04:00.000Z',file,logSha256:pkg.sha(files[file])};
    if(pkg.N[name])checks[name].signedBlockSha256=p.blocks[name];
    if(name==='mechanism')checks[name].tests=[{path:PC.test,...p.pins[PC.test]},{path:PC.brandingTest,...p.pins[PC.brandingTest]}];
  }
  const proof={schema:PC.proofSchema,provider:C.provider,scope:PC.scope,buildId:packageId,planSha256:pkg.digest(p),sourceSha:p.sourceSha,mechanismSha:p.mechanismSha,sourceTreeSha:p.sourceTreeSha,serviceAccount:C.serviceAccount,requestVersion:35,
    status:'PACKAGE_BUILT_NO_DEPLOY',fullI66ProductionAccepted:false,deployments:{preview:0,live:0,functions:0},businessWrites:0,checks,
    archiveSha256:pkg.sha(files[PF.archive]),archiveBytes:files[PF.archive].length,lock:{bucket:C.bucket,name:pkg.lockName(p),generation:'112'}};
  files[PF.proof]=Buffer.from(JSON.stringify(proof));
  const objects=new Map(),calls=[],rows=[];
  function add(name,data,generation){objects.set(name,{data,meta:{bucket:C.bucket,name,generation,size:String(data.length),timeCreated:'2026-11-25T12:04:30.000Z'}});}
  for(const [file,bytes] of Object.entries(files)){const name=pkg.artifactPrefix(p,packageId)+file;add(name,bytes,'113');rows.push({location:'gs://'+C.bucket+'/'+name+'#113',file_hash:[{type:2,value:crypto.createHash('md5').update(bytes).digest('hex')}]});}
  add(pkg.artifactPrefix(p,packageId)+'artifacts-'+packageId+'.json',Buffer.from(JSON.stringify(rows)),'111');
  add(pkg.lockName(p),Buffer.from(JSON.stringify({provider:C.provider,buildId:packageId,sourceSha:p.sourceSha,mechanismSha:p.mechanismSha,planSha256:pkg.digest(p)})),'112');
  add('i66/cloud-build-logs/log-'+packageId+'.txt',Buffer.from('I66_CLOUD_BUILD_PACKAGE_READY_FOR_PROVIDER_RETENTION '+JSON.stringify({buildId:packageId,sourceSha:p.sourceSha,archiveSha256:proof.archiveSha256,scope:PC.scope})+'\n'),'114');
  const current={executionProvider:C.provider,sourceSha:p.sourceSha,buildRunId:packageId,buildId:'gi-i66-synthetic35',artifactId:'gs://'+C.bucket+'/'+pkg.artifactPrefix(p,packageId)+PF.archive+'#113',artifactDigest:'sha256:'+proof.archiveSha256};
  const io={api:async url=>{calls.push(['api',url]);assert.ok(url.endsWith('/'+packageId));return b;},metadata:async(name,gen)=>{calls.push(['metadata',name,gen]);assert.ok(objects.has(name));return objects.get(name).meta;},
    bytes:async(name,gen)=>{calls.push(['bytes',name,gen]);assert.ok(objects.has(name));return objects.get(name).data;}};
  return {p,b,proof,files,objects,calls,io,current};
}
test('legacy request35 plan and legacy Actions artifact remain compatible with original validation',async()=>{
  const f=packageFixture(),before=JSON.stringify(f.p);assert.equal(pkg.validatePlan(f.p),f.p);assert.equal(owner.packagePlanFromBuild(f.b).requestVersion,35);assert.equal(JSON.stringify(f.p),before);
  const current={sourceSha:f.p.sourceSha,artifactId:14873426438,artifactDigest:'sha256:'+'6'.repeat(64)},calls=[];
  const receipt=await owner.verifyCurrentArtifact(current,{legacyApi:async suffix=>{calls.push(suffix);return {digest:current.artifactDigest,workflow_run:{head_sha:current.sourceSha}};}});
  assert.equal(receipt.executionProvider,'GITHUB_ACTIONS');assert.deepEqual(calls,['artifacts/14873426438']);
});
test('native current artifact reads original full package proof, claim and log; does not call Actions artifacts',()=>temp(async dir=>{
  const f=packageFixture(),before=JSON.stringify(f.current);let markerReads=0;
  const result=await owner.verifyCurrentArtifact(f.current,{io:f.io,out:path.join(dir,'package'),legacyApi:()=>{throw Error('NATIVE_CANNOT_CALL_ACTIONS');},
    readMarker:async file=>{markerReads++;assert.equal(fs.readFileSync(file).toString(),f.files[pkg.F.archive].toString());return {sourceSha:f.current.sourceSha,buildId:f.current.buildId};}});
  assert.equal(markerReads,1);assert.equal(result.executionProvider,C.provider);assert.equal(result.artifact.generation,'113');assert.equal(JSON.stringify(f.current),before);
  assert.ok(f.calls.some(c=>c[1]===pkg.lockName(f.p)));assert.ok(f.calls.some(c=>c[1]==='i66/cloud-build-logs/log-'+packageId+'.txt'));
}));
for(const [name,mutate] of [
  ['numeric native run',f=>f.current.buildRunId=45548703476],['numeric native artifact',f=>f.current.artifactId=14873426438],
  ['unversioned native artifact',f=>f.current.artifactId=f.current.artifactId.split('#')[0]],
  ['artifact source drift',f=>f.current.sourceSha='0'.repeat(40)],['wrong native provider',f=>f.current.executionProvider='OTHER'],
  ['missing provider on GCS',f=>delete f.current.executionProvider],['wrong artifact digest',f=>f.current.artifactDigest='sha256:'+'0'.repeat(64)],
  ['wrong object generation',f=>f.objects.get(pkg.artifactPrefix(f.p,packageId)+pkg.F.archive).meta.generation='999'],
  ['package was not executed',f=>f.b.steps[0].status='SKIPPED'],['package admission incomplete',f=>{f.proof.checks.admission.status='SKIPPED';f.objects.get(pkg.artifactPrefix(f.p,packageId)+pkg.F.proof).data=Buffer.from(JSON.stringify(f.proof));}]
])test('native current artifact refuses '+name,()=>temp(async dir=>{
  const f=packageFixture();mutate(f);
  await assert.rejects(owner.verifyCurrentArtifact(f.current,{io:f.io,out:path.join(dir,'package'),readMarker:()=>({sourceSha:f.current.sourceSha,buildId:f.current.buildId})}));
}));
test('native archive product build marker must agree with the current signed pointer',()=>temp(async dir=>{
  const f=packageFixture();await assert.rejects(owner.verifyCurrentArtifact(f.current,{io:f.io,out:path.join(dir,'package'),readMarker:()=>({sourceSha:f.current.sourceSha,buildId:'different'})}),/CURRENT_PRODUCT_BUILD_MARKER/);
}));
test('actual tar marker reader checks a unique regular file without extracting files',()=>temp(async dir=>{
  const source=path.join(dir,'source'),member='bundle/site/__recovery__/build.json';fs.mkdirSync(path.dirname(path.join(source,member)),{recursive:true});
  const marker={sourceSha:'a'.repeat(40),buildId:'gi-i66-synthetic'};fs.writeFileSync(path.join(source,member),JSON.stringify(marker));
  const archive=path.join(dir,'package.tar.gz');execFileSync('tar',['-czf',archive,'-C',source,member]);assert.deepEqual(owner.readArchiveMarker(archive),marker);
  const duplicate=path.join(dir,'duplicate.tar.gz');execFileSync('tar',['-czf',duplicate,'-C',source,member,member]);assert.throws(()=>owner.readArchiveMarker(duplicate),/UNIQUE_ARCHIVE_MARKER/);
  fs.unlinkSync(path.join(source,member));fs.symlinkSync('/synthetic/private',path.join(source,member));const linked=path.join(dir,'linked.tar.gz');
  execFileSync('tar',['-czf',linked,'-C',source,member]);assert.throws(()=>owner.readArchiveMarker(linked),/REGULAR_ARCHIVE_MARKER/);
}));
test('import is inert: no shell, provider request, file write, or execution',()=>{
  const filename=path.join(__dirname,path.basename(C.tool)),loaded=new Module(filename,module),realRequire=loaded.require.bind(loaded);let calls=0;
  const forbidden=()=>{calls++;throw Error('IMPORT_SIDE_EFFECT');};
  loaded.filename=filename;loaded.paths=Module._nodeModulePaths(__dirname);
  loaded.require=name=>name==='node:child_process'?{execFileSync:forbidden}:name==='node:fs'?{...fs,writeFileSync:forbidden,mkdirSync:forbidden}:realRequire(name);
  loaded._compile(fs.readFileSync(filename,'utf8'),filename);assert.equal(calls,0);assert.equal(typeof loaded.exports.verify,'function');
});

async function sourceReferenceFixture(dir){
  const f=fixture(),head='f'.repeat(40),message='fix: synthetic native source QA\n',pins=new Map(owner.PINS.map(file=>[file,Buffer.from('synthetic pinned source owner '+file)]));
  f.p.pins=Object.fromEntries([...pins].map(([file,bytes])=>[file,{blob:pkg.blob(bytes),sha256:pkg.sha(bytes)}]));
  Object.assign(f.b,build(f.p));f.proof.planSha256=pkg.digest(f.p);f.sync();
  const retained=await owner.verify(f.p,id,path.join(dir,'retained'),f.io),raw=Buffer.from(JSON.stringify(retained,null,2)+'\n');
  const receiptPath='artifacts/orbit360-recovery/release-control/I6_6_NATIVE_SOURCE_QA_TEST_RECEIPT.json';
  const request={version:36,sourceQaHead:f.p.sourceQaHead,nativeSourceQa:{schema:'GI_I66_NATIVE_SOURCE_QA_REFERENCE_V1',executionProvider:C.provider,buildId:id,
    sourceQaHead:f.p.sourceQaHead,mechanismSha:f.p.mechanismSha,planSha256:pkg.digest(f.p),receiptPath,receiptBlob:pkg.blob(raw),receiptSha256:pkg.sha(raw)}};
  const state={receipt:raw,driftOwner:false,missingAncestor:false,wrongTree:false},repo='/synthetic-admission-repo';
  const filename=path.join(__dirname,path.basename(C.tool)),m=new Module(filename,module),real=m.require.bind(m);m.filename=filename;m.paths=Module._nodeModulePaths(__dirname);
  m.require=name=>name==='node:child_process'?{execFileSync:(command,args,options)=>{
    assert.equal(command,'git');assert.equal(options.cwd,repo);let value;
    if(args.join(' ')==='rev-parse HEAD')value=head;
    else if(args[0]==='merge-base'){if(state.missingAncestor)throw Error('not ancestor');value='';}
    else if(args.join(' ')==='rev-parse '+f.p.sourceQaHead+'^{tree}')value=state.wrongTree?'0'.repeat(40):f.p.sourceTreeSha;
    else if(args.join(' ')==='show -s --format=%B '+f.p.sourceQaHead)value=message;
    else if(args[0]==='show'){
      const [ref,file]=args[1].split(':');
      if(ref===head&&file===receiptPath)value=state.receipt;
      else if(pins.has(file)&&(ref===head||ref===f.p.mechanismSha))value=state.driftOwner&&ref===head?Buffer.from('changed owner'):pins.get(file);
      else if(ref===f.p.sourceQaHead&&file===C.sourceWorkflow)value=sourceText;
      else if(ref===f.p.sourceQaHead&&file===C.guardWorkflow)value=guardText;
    }
    assert.notEqual(value,undefined,'unexpected source reference git '+args.join(' '));return options.encoding?String(value):Buffer.from(value);
  }}:real(name);m._compile(fs.readFileSync(filename,'utf8'),filename);
  return{...f,request,retained,raw,state,run:()=>m.exports.verifySourceQaReference(request,{repo,io:f.io,out:path.join(dir,'verified')})};
}
test('native request admission rereads actual provider proof and pins the committed receipt and owners',()=>temp(async dir=>{
  const f=await sourceReferenceFixture(dir),result=await f.run();assert.equal(result.buildId,id);assert.equal(result.retainedReceipt.gitBlobSha,pkg.blob(f.raw));
  assert.ok(f.calls.filter(c=>c[0]==='api').length>=3);assert.ok(fs.existsSync(path.join(dir,'verified','receipt.json')));
}));
for(const [name,mutate] of [
  ['frozen request35',f=>f.request.version=35],['mixed numeric QA run',f=>f.request.sourceQaRunId=8],['mixed guard run',f=>f.request.guardRunId=9],
  ['unknown reference field',f=>f.request.nativeSourceQa.skip=true],['source mismatch',f=>f.request.nativeSourceQa.sourceQaHead='0'.repeat(40)],
  ['receipt outside canonical evidence',f=>f.request.nativeSourceQa.receiptPath='README.md'],['receipt bytes changed',f=>f.state.receipt=Buffer.from('{}')],
  ['ancestor missing',f=>f.state.missingAncestor=true],['source tree changed',f=>f.state.wrongTree=true],['admission owner changed after QA',f=>f.state.driftOwner=true],
  ['provider metadata changed',f=>f.b.status='FAILURE'],['different provider plan',f=>f.request.nativeSourceQa.planSha256='0'.repeat(64)],
  ['retained provider evidence changed',f=>{const altered={...f.retained,cloudBuild:{...f.retained.cloudBuild,status:'OTHER'}};f.state.receipt=Buffer.from(JSON.stringify(altered));f.request.nativeSourceQa.receiptBlob=pkg.blob(f.state.receipt);f.request.nativeSourceQa.receiptSha256=pkg.sha(f.state.receipt);}]
])test('native admission refuses '+name,()=>temp(async dir=>{const f=await sourceReferenceFixture(dir);mutate(f);await assert.rejects(f.run());}));

test('ADC provider reader exposes GET-only build and generation-pinned object reads without tokens',async()=>{
  const calls=[],constructor=[];
  class GoogleAuth{constructor(options){constructor.push(options);}async getClient(){return{request:async options=>{calls.push(options);return{data:options.responseType==='arraybuffer'?Buffer.from('proof bytes'):{ok:true}};}};}}
  const io=await owner.adcReadIo(GoogleAuth);
  assert.deepEqual(constructor,[{projectId:C.projectId,scopes:['https://www.googleapis.com/auth/cloud-platform']}]);
  assert.deepEqual(await io.api('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+id),{ok:true});
  assert.deepEqual(await io.metadata('i66/source-qa/proof.json','123'),{ok:true});
  assert.equal((await io.bytes('i66/source-qa/proof.json','123')).toString(),'proof bytes');
  assert.ok(calls.every(c=>c.method==='GET'&&c.timeout===60000&&!c.headers&&!c.data));
  assert.ok(calls[1].url.endsWith('/i66%2Fsource-qa%2Fproof.json?generation=123'));
  assert.ok(calls[2].url.endsWith('?alt=media&generation=123'));
  const count=calls.length;
  await assert.rejects(io.api('https://other.example/'+id),/READONLY_BUILD_API/);
  assert.throws(()=>io.metadata('../object','1'),/READONLY_OBJECT_PATH/);
  await assert.rejects(io.bytes('i66/source-qa/proof.json'),/EXACT_BYTES_GENERATION/);
  assert.equal(calls.length,count);
});
