'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),Module=require('node:module');
const {execFileSync}=require('node:child_process');
const n=require('./gravicentra-i6-6-cloud-build-operational.cjs'),pkg=require('./gravicentra-i6-6-cloud-build-package.cjs'),preview=require('./gravicentra-i6-6-cloud-build-preview.cjs');
const g=require('./gravicentra-i6-6-operational-release-candidate.cjs'),scope=require('./gravicentra-i66-make-release-scope.cjs');
const clone=x=>structuredClone(x),root=path.join(__dirname,'..');
const UUID='12345678-1234-4234-8234-123456789035',HOSTING_UUID='22345678-1234-4234-8234-123456789035',EXEC_UUID='32345678-1234-4234-8234-123456789035';
// Synthetic data only. No object produced by these unit tests is a provider
// receipt or operational authorization.
function hostingPlan(){
  const fixture=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-cloud-build-preview.test.cjs'),'utf8');
  const text=fixture.slice(fixture.indexOf('function packagePlan(){'),fixture.indexOf('function build('));
  const value=new Function('fs','path','__dirname','pkg','C','IMPORTS','packageId',text+';return plan();')(fs,path,__dirname,pkg,preview.C,preview.IMPORTS,UUID);
  value.sourceSha=value.packagePlan.sourceSha='2'.repeat(40);value.packageArtifact.uri='gs://'+n.C.bucket+'/'+pkg.artifactPrefix(value.packagePlan,UUID)+pkg.F.archive;return value;
}
function candidate(){
  const src=fs.readFileSync(path.join(__dirname,'gravicentra-i66-make-release-scope.test.cjs'),'utf8');
  const fixture=new Function('g','s','clone',src.slice(src.indexOf('function fixture(){'),src.indexOf('function trigger('))+';return fixture();')(g,scope,clone);
  const h=hostingPlan(),p=fixture.p,a=h.packageArtifact;delete p.financialPreviewQa;
  Object.assign(p,{executionProvider:'CLOUD_BUILD',buildRunId:UUID,artifactId:a.uri+'#'+a.generation,artifactDigest:'sha256:'+a.sha256,previewUrl:preview.C.origin,previewChannelId:preview.C.channel,
    providerBinding:{schema:n.C.bindingSchema,requestVersion:35,hostingPlan:h,hostingBuildId:HOSTING_UUID,
      hostingProof:{uri:'gs://'+n.C.bucket+'/'+preview.prefix(h,HOSTING_UUID)+preview.F.proof,generation:'10000000000003',sha256:'9'.repeat(64),bytes:200},hostingVersion:'sites/ays-orbit-360-lab/versions/synthetic35',
      mechanism:{schema:'GI_I66_NATIVE_MECHANISM_REVISION_V1',sourceSha:p.sourceSha,commit:'3'.repeat(40),files:Object.fromEntries([n.C.tool,n.C.test,'tools/gravicentra-i6-6-operational-release-candidate.cjs','tools/gravicentra-i66-signed-qa-runtime-auth.cjs'].map(file=>[file,{beforeBlob:null,blob:'4'.repeat(40),sha256:'5'.repeat(64)}]))}}});
  return fixture;
}
function plan(phase='preview',p=candidate().p){
  const file=phase==='preview'?n.C.previewWorkflow:n.C.liveWorkflow,raw=fs.readFileSync(path.join(root,file)),blocks=n.workflowBlocks(raw.toString(),phase);
  return {schema:n.C.planSchema,provider:'CLOUD_BUILD',phase,repository:n.C.repository,branch:n.C.branch,projectId:n.C.projectId,projectNumber:n.C.projectNumber,region:n.C.region,serviceAccount:n.C.serviceAccount,bucket:n.C.bucket,
    authorityHead:'a'.repeat(40),candidateSha256:pkg.digest(p),mechanismSha:p.providerBinding.mechanism.commit,sourceSha:p.sourceSha,requestVersion:35,transportBlob:'c'.repeat(40),financialAuthorityBlob:'d'.repeat(40),workflowBlob:pkg.blob(raw),blocks:Object.fromEntries(Object.entries(blocks).map(([k,v])=>[k,pkg.sha(v)]))};
}
function build(pl=plan()){
  const c=n.configFor(pl),start='2026-11-25T12:00:00Z',finish='2026-11-25T12:10:00Z';
  return {...c,id:EXEC_UUID,name:'projects/'+n.C.projectNumber+'/locations/'+n.C.region+'/builds/'+EXEC_UUID,projectId:n.C.projectId,status:'SUCCESS',
    source:{gitSource:{url:n.C.repositoryUrl,revision:pl.authorityHead}},sourceProvenance:{resolvedGitSource:{url:n.C.repositoryUrl,revision:pl.authorityHead}},
    createTime:'2026-11-25T11:59:59Z',startTime:start,finishTime:finish,
    steps:c.steps.map(s=>({...s,status:'SUCCESS',timing:{startTime:start,endTime:'2026-11-25T12:09:00Z'}})),
    results:{buildStepImages:['sha256:'+'1'.repeat(64),'sha256:'+'2'.repeat(64)],numArtifacts:String(Object.keys(n.F).length),artifactManifest:'gs://'+n.C.bucket+'/'+n.prefix(pl,EXEC_UUID)+'artifacts-'+EXEC_UUID+'.json'}};
}
test('native candidate preserves five targets and every existing semantic gate with actual typed provider identities',()=>{
  const {p,control}=candidate();
  let owner=g;if(process.env.I66_NATIVE_CANDIDATE_TEST_SOURCE){const file=path.join(__dirname,'gravicentra-i6-6-operational-release-candidate.cjs'),m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(__dirname);m._compile(fs.readFileSync(process.env.I66_NATIVE_CANDIDATE_TEST_SOURCE,'utf8'),file);owner=m.exports;}
  assert.equal(owner.candidateForPhase(control,'preview'),p);assert.equal(owner.targetsForCandidate(p,'preview').length,5);assert.equal(p.makeIngress.outboundEnabled,false);assert.equal(p.currentLive.artifactId,148);
});
for(const [label,change] of [
  ['unknown provider',p=>p.executionProvider='GITHUB_ACTIONS'],['numeric native run',p=>p.buildRunId=45549464538],['numeric native artifact',p=>p.artifactId=152],
  ['unversioned artifact',p=>p.artifactId=p.artifactId.split('#')[0]],['other artifact source',p=>p.sourceSha='9'.repeat(40)],
  ['other Preview channel',p=>p.previewChannelId='other'],['other Preview origin',p=>p.previewUrl='https://app.aysseguros.com'],
  ['other provider proof object',p=>p.providerBinding.hostingProof.uri=p.providerBinding.hostingProof.uri.replace(HOSTING_UUID,UUID)],
  ['new product allowance',p=>p.providerBinding.mechanism.files['functions/bootstrap.js']={beforeBlob:'1'.repeat(40),blob:'2'.repeat(40),sha256:'3'.repeat(64)}],
  ['missing native executor pin',p=>delete p.providerBinding.mechanism.files[n.C.tool]],['unproved unchanged pin',p=>p.providerBinding.mechanism.files[n.C.tool].beforeBlob=p.providerBinding.mechanism.files[n.C.tool].blob],
  ['extra function',p=>p.targets.preview.push({name:'other',region:'us-east1'})],['real data permission',p=>p.noRealFinancialOrCustomerWrites=false],
  ['project IAM authority',p=>p.makeIngress.permissions.projectIamWrites=1],['real Make activation before COMMITTED',p=>p.makeIngress.realLeadActivationAfterCommittedOnly=false]
])test('candidate rejects '+label,()=>{const {p,control}=candidate();change(p);assert.throws(()=>g.candidateForPhase(control,'preview'));});
test('two real native steps keep SDK metadata identity distinct from immutable product source',()=>{
  const p=plan(),b=build(p);assert.equal(n.validateBuild(p,b),b);assert.equal(b.steps.length,2);assert.equal(b.serviceAccount,'projects/'+n.C.projectId+'/serviceAccounts/'+n.C.serviceAccount);
  assert.ok(b.steps[0].args[3].includes('$$(gcloud'));assert.ok(b.steps[0].args[3].includes('$$i66_sdk_root'));
  b.steps[0].args[3]=b.steps[0].args[3].replaceAll('$$','$');assert.equal(n.validateBuild(p,b),b);
  const working=clone(b);working.status='WORKING';delete working.finishTime;delete working.results;assert.equal(n.validateBuild(p,working,{finished:false}),working);assert.throws(()=>n.validateBuild(p,working));
});
test('native deployment keeps the exact workflow job budget and the provider remaining deadline',()=>{
  const now=Date.parse('2026-11-25T12:10:00Z'),runtime={startTime:'2026-11-25T12:00:00Z',timeout:'10800s'};
  for(const [phase,withoutMake] of [['preview',55],['live',65]]){
    const workflow=fs.readFileSync(path.join(root,phase==='preview'?n.C.previewWorkflow:n.C.liveWorkflow),'utf8');
    assert.equal(n.workflowTimeoutMs(workflow,phase,true),85*60*1000);
    assert.equal(n.workflowTimeoutMs(workflow,phase,false),withoutMake*60*1000);
    assert.equal(n.deploymentTimeoutMs(workflow,phase,true,runtime,now),75*60*1000);
    assert.equal(n.deploymentTimeoutMs(workflow,phase,false,runtime,now),(withoutMake-10)*60*1000);
    assert.equal(n.deploymentTimeoutMs(workflow,phase,true,{...runtime,timeout:'900s'},now),5*60*1000);
    assert.throws(()=>n.deploymentTimeoutMs(workflow,phase,true,runtime,now+75*60*1000),/DEPLOYMENT_BUDGET_EXHAUSTED/);
    assert.throws(()=>n.deploymentTimeoutMs(workflow,phase,true,{...runtime,timeout:'600s'},now),/DEPLOYMENT_BUDGET_EXHAUSTED/);
    for(const value of [{...runtime,startTime:'missing'},{...runtime,timeout:'0s'},{...runtime,timeout:'Infinity'},{...runtime,startTime:'2026-11-25T12:11:00Z'}])
      assert.throws(()=>n.deploymentTimeoutMs(workflow,phase,true,value,now),/PROVIDER_TIMEOUT/);
  }
});
test('workflow budget cannot be guessed from another job or an unrecognized expression',()=>{
  const workflow=fs.readFileSync(path.join(root,n.C.liveWorkflow),'utf8');
  const expression="${{ needs.phase.outputs.make_ingress == 'true' && 85 || 65 }}";
  assert.ok(workflow.includes(expression));
  for(const replacement of ['0','Infinity','${{ arbitrary.value }}','9007199254740991'])
    assert.throws(()=>n.workflowTimeoutMs(workflow.replace(expression,replacement),'live',true),/WORKFLOW_TIMEOUT/);
  assert.throws(()=>n.workflowTimeoutMs(workflow.replace('  exact-role-live:','  another-job:'),'live',true),/WORKFLOW_TIMEOUT_JOB/);
  assert.throws(()=>n.workflowTimeoutMs(workflow.replace('    timeout-minutes: '+expression,'    timeout-minutes: 85\n    timeout-minutes: 85'),'live',true),/WORKFLOW_TIMEOUT_UNIQUE/);
  assert.equal(n.workflowTimeoutMs(workflow.replace(expression,'85'),'live',false),85*60*1000);
  assert.throws(()=>n.workflowTimeoutMs(workflow,'invalid',true),/WORKFLOW_TIMEOUT_PHASE/);
});
for(const [label,change] of [
  ['phase-only SUCCESS',b=>b.steps=[]],['skipped native step',b=>b.steps[1].status='SKIPPED'],['ignored failure',b=>b.steps[1].allowFailure=true],
  ['different executor source',b=>b.source.gitSource.revision='f'.repeat(40)],['different resolved source',b=>b.sourceProvenance.resolvedGitSource.revision='f'.repeat(40)],
  ['untrusted SDK script',b=>b.steps[0].args[3]+='\necho bypass'],['wrong principal',b=>b.serviceAccount=b.serviceAccount.replace('firebase-adminsdk-fbsvc','unapproved')],
  ['global Node injection',b=>b.options.env=['NODE_OPTIONS=--require=/tmp/override']],['global volume injection',b=>b.options.volumes=[{name:'x',path:'/workspace'}]],
  ['secret credential injection',b=>b.availableSecrets={}],['foreign source dir',b=>b.source.gitSource.dir='other'],['additional publisher',b=>b.artifacts.images=['x']],
  ['missing native file',b=>b.results.numArtifacts='0'],['unresolved image digest',b=>b.results.buildStepImages[1]='node:22'],['foreign output',b=>b.artifacts.objects.location='gs://other/'],
  ['step outside actual run',b=>b.steps[1].timing.endTime='2026-11-26T12:10:00Z']
])test('provider metadata rejects '+label,()=>{const p=plan(),b=build(p);change(b);assert.throws(()=>n.validateBuild(p,b));});
test('runtime authenticates metadata and actual Build before privileged action; rejects crossed plan and fake GitHub env',async()=>{
  const p=candidate().p,pl=plan('preview',p),b=build(pl);b.status='WORKING';const env={GRAVICENTRA_BUILD_PROVIDER:'CLOUD_BUILD',GRAVICENTRA_CLOUD_BUILD_ID:EXEC_UUID,I66_NATIVE_AUTHORITY_HEAD:pl.authorityHead,I66_NATIVE_PLAN_SHA256:pkg.digest(pl)};
  const calls=[],options={phase:'preview',action:'before-deploy',env,plan:pl,verifyIdentity:async()=>{calls.push('identity');return{buildId:EXEC_UUID};},verifyPins:()=>calls.push('pins'),readBuild:async()=>{calls.push('build-api');return b;}};
  const out=await n.verifyRuntimeAuthority(p,options);assert.equal(out.buildId,EXEC_UUID);assert.deepEqual(calls,['identity','pins','build-api']);
  for(const bad of [{...env,GITHUB_ACTIONS:'true'},{...env,I66_NATIVE_AUTHORITY_HEAD:'f'.repeat(40)},{...env,I66_NATIVE_PLAN_SHA256:'0'.repeat(64)}])await assert.rejects(n.verifyRuntimeAuthority(p,{...options,env:bad}));
  await assert.rejects(n.verifyRuntimeAuthority(p,{...options,phase:'live'}));await assert.rejects(n.verifyRuntimeAuthority(p,{...options,action:'other'}));
});
test('metadata token authentication works before npm and rejects missing Google response header without leaking token',async()=>{
  const calls=[],token='unit-token-never-printed-01234567890';
  const context={verifyIdentity:async()=>calls.push('identity'),requestContext:{fetch:async(_u,options)=>{calls.push('metadata-token');assert.equal(options.headers['Metadata-Flavor'],'Google');return{ok:true,status:200,headers:{get:()=> 'Google'},json:async()=>({token_type:'Bearer',access_token:token})};},emit:()=>{throw Error('unexpected diagnostic');}}};
  assert.deepEqual(await n.sdkHeaders(context),{Authorization:'Bearer '+token});assert.deepEqual(calls,['identity','metadata-token']);
  const diagnostics=[];await assert.rejects(n.sdkHeaders({verifyIdentity:async()=>{},requestContext:{fetch:async()=>({ok:true,status:200,headers:{get:()=>null},json:async()=>({token_type:'Bearer',access_token:token})}),emit:x=>diagnostics.push(x)}}),/AUTHENTIC_METADATA_REQUIRED/);
  assert.ok(diagnostics.length===1&&!diagnostics[0].includes(token));
});
test('native environment capture cannot inject credentials, provider identity, paths outside runner scope or duplicate outputs',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'i66-env-test-'));try{const file=path.join(temp,'env'),env={RUNNER_TEMP:temp};fs.writeFileSync(file,'I66_PACKAGE_ROOT='+temp+'/package\nI66_ROLE_ROLLBACK_HOSTING_VERSION=synthetic\n');n.consumeNativeEnv(file,env);assert.equal(env.I66_PACKAGE_ROOT,temp+'/package');assert.equal(fs.readFileSync(file,'utf8'),'');
    for(const value of ['GITHUB_ACTIONS=true\n','GOOGLE_APPLICATION_CREDENTIALS=/tmp/key\n','I66_PACKAGE_ROOT=/other/path\n','I66_PACKAGE_ROOT='+temp+'/../escape\n','I66_ROLE_ROLLBACK_HOSTING_VERSION=a\nI66_ROLE_ROLLBACK_HOSTING_VERSION=b\n']){fs.writeFileSync(file,value);assert.throws(()=>n.consumeNativeEnv(file,{RUNNER_TEMP:temp}));}
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('literal Preview and LIVE blocks retain original deployment, rollback and functional gates without invented GitHub runtime',()=>{
  for(const phase of ['preview','live']){const workflow=fs.readFileSync(path.join(root,phase==='preview'?n.C.previewWorkflow:n.C.liveWorkflow),'utf8'),original=n.workflowBlocks(workflow,phase),adapted=n.runtimeBlocks(original,phase);
    assert.deepEqual(Object.keys(adapted),Object.keys(original));for(const text of Object.values(adapted))assert.ok(!/GITHUB_|GH_TOKEN|activate-service-account/.test(text));
    assert.ok(adapted.gate.includes('I66_FROZEN_SOURCE_ROOT'));assert.ok(adapted.deploy.includes('gravicentra-i66-make-firebase-project-iam-guard.cjs'));
    assert.ok(adapted.deploy.includes('validateInventoryAfter'));assert.ok(adapted.backend.includes('validatePackagedSourceBytes'));
    if(phase==='live'){assert.ok(adapted.deploy.includes('--accept-composite-live'));assert.ok(adapted.deploy.includes('--authorize-composite-rollback'));assert.ok(adapted.deploy.includes('trap rollback EXIT'));assert.ok(adapted.deploy.includes('I66_RENEWAL_QA_PHASE=LIVE'));assert.ok(adapted.deploy.indexOf('retain-make live')<adapted.deploy.indexOf('wait-probe live'));}
    else{assert.ok(adapted.signed.includes('I66_RENEWAL_QA_PHASE=PREVIEW'));assert.ok(adapted.seal.includes("executionProvider:'CLOUD_BUILD'"));}
  }
});
test('signed CAS IO consumes the helper actual bytes reference and preserves exact readback before publishing a reference',async()=>{
  const cas=require('./gravicentra-i6-6-cloud-build-signed-cas.cjs'),data=Buffer.from('exact serialized metadata\n'),name='i66/signed-cas/'+EXEC_UUID+'/test.json',generation='10000000000008';let retained;
  const io=await n.signedCasIo({executionProvider:'CLOUD_BUILD',buildId:EXEC_UUID,phase:'live'},{storage:{retain:async(nm,bytes)=>{assert.equal(nm,name);assert.ok(bytes.equals(data));retained=true;return{uri:'gs://'+n.C.bucket+'/'+name,generation,sha256:pkg.sha(bytes),bytes:bytes.length};},metadata:async()=>({bucket:n.C.bucket,name,generation,size:String(data.length)}),bytes:async()=>data}});
  const result=await io.retainOnce({bucket:n.C.bucket,name,ifGenerationMatch:0,bytes:data,contentType:'application/json'});
  const ref=cas.retainedReference({bucket:n.C.bucket,name,uri:'gs://'+n.C.bucket+'/'+name,sha256:pkg.sha(data),bytes:data},result);
  assert.equal(ref.bytes,data.length);assert.equal(ref.size,undefined);assert.ok((await io.readObjectExact(ref)).bytes.equals(data));assert.equal(retained,true);
});
test('Preview metadata from a different mechanism or request cannot authorize LIVE for the same product',()=>{
  const p=candidate().p,pl=plan('preview',p),b=build(pl),id='gs://'+n.C.bucket+'/'+n.prefix(pl,EXEC_UUID)+n.F.signed+'#10000000000009';
  p.previewQa={executionProvider:'CLOUD_BUILD',runId:EXEC_UUID,headSha:pl.authorityHead,receiptArtifactId:id,receiptArtifactDigest:'sha256:'+'6'.repeat(64),planSha256:pkg.digest(pl)};
  const artifact={bucket:n.C.bucket,name:n.prefix(pl,EXEC_UUID)+n.F.signed,generation:'10000000000009',sha256:'6'.repeat(64)};assert.equal(n.validatePreviewMetadata(p,b,artifact).phase,'preview');
  for(const key of ['mechanismSha','requestVersion']){const altered=clone(pl);altered[key]=key==='requestVersion'?36:'f'.repeat(40);const forged=build(altered);assert.throws(()=>n.validatePreviewMetadata(p,forged,artifact));}
});
test('native LIVE financial proof and signed Preview must come from the same actual execution',()=>{
  const p=candidate().p;p.previewQa={executionProvider:'CLOUD_BUILD',runId:EXEC_UUID};
  p.financialPreviewQa={executionProvider:'CLOUD_BUILD',receiptPath:'artifacts/orbit360-recovery/release-control/I6_6_E6_FINANCIAL_PREVIEW_RECEIPT.json',receiptBlob:'1'.repeat(40),previewReadOnlyAuthorityBlob:'2'.repeat(40),qaRunId:EXEC_UUID,
    qaArtifactId:'gs://'+n.C.bucket+'/i66/operational/preview/request-35/'+p.sourceSha+'/'+EXEC_UUID+'/'+n.F.financial+'#10000000000009',qaArtifactDigest:'sha256:'+'3'.repeat(64),qaReportSha256:'3'.repeat(64)};
  scope.validateCandidate(p,'live');p.financialPreviewQa.qaRunId=HOSTING_UUID;
  assert.throws(()=>scope.validateCandidate(p,'live'),/SAME_NATIVE_PREVIEW_EXECUTION_REQUIRED/);
});
function realGitFixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'i66-native-git-')),repo=path.join(dir,'repository');fs.mkdirSync(repo);
  const git=(...args)=>execFileSync('git',args,{cwd:repo,stdio:'pipe'}),text=(...args)=>git(...args).toString().trim();
  git('init','--quiet','--initial-branch='+n.C.branch);git('config','user.name','I66 synthetic unit test');git('config','user.email','synthetic@example.invalid');
  const put=(file,data)=>{fs.mkdirSync(path.dirname(path.join(repo,file)),{recursive:true});fs.writeFileSync(path.join(repo,file),data);};
  const commit=message=>{git('add','.');git('commit','--quiet','-m',message);return text('rev-parse','HEAD');};
  const p=candidate().p,request={version:35,scope:'SYNTHETIC_UNIT_FIXTURE_ONLY'};
  p.financialRecoveryQa={receiptPath:'artifacts/orbit360-recovery/release-control/I6_6_SYNTHETIC_HISTORICAL_RECEIPT.json',receiptBlob:'0'.repeat(40)};
  put(n.C.transport,JSON.stringify({frontendPreviewRequest:request})+'\n');put('functions/synthetic-test-owner.js','module.exports="synthetic source";\n');
  put('tools/gravicentra-i6-6-operational-release-candidate.cjs','module.exports="synthetic legacy mechanism";\n');
  for(const receipt of [p.financialRecoveryQa,p.cancellationRecoveryQa].filter(Boolean)){const data=Buffer.from(JSON.stringify({schema:'SYNTHETIC_UNIT_HISTORICAL_RECEIPT',name:receipt.receiptPath})+'\n');put(receipt.receiptPath,data);receipt.receiptBlob=pkg.blob(data);}
  const source=commit('synthetic frozen source'),files={};
  for(const file of [n.C.tool,n.C.test,'tools/gravicentra-i6-6-operational-release-candidate.cjs','tools/gravicentra-i66-signed-qa-runtime-auth.cjs']){
    let beforeBlob=null;try{beforeBlob=pkg.blob(git('show',source+':'+file));}catch{}
    const data=Buffer.from('// synthetic sealed mechanism '+file+'\n');put(file,data);files[file]={beforeBlob,blob:pkg.blob(data),sha256:pkg.sha(data)};
  }
  const mechanism=commit('synthetic native mechanism');put(n.C.transport,JSON.stringify({frontendPreviewRequest:request,unitEvidence:'not an authorization'})+'\n');const head=commit('synthetic authority metadata');
  p.sourceSha=source;p.providerBinding.mechanism={schema:'GI_I66_NATIVE_MECHANISM_REVISION_V1',sourceSha:source,commit:mechanism,files};
  const h=p.providerBinding.hostingPlan;h.sourceSha=h.packagePlan.sourceSha=source;h.packagePlan.requestSha256=pkg.digest(request);h.packageArtifact.uri='gs://'+n.C.bucket+'/'+pkg.artifactPrefix(h.packagePlan,p.buildRunId)+pkg.F.archive;
  p.artifactId=h.packageArtifact.uri+'#'+h.packageArtifact.generation;p.providerBinding.hostingProof.uri='gs://'+n.C.bucket+'/'+preview.prefix(h,HOSTING_UUID)+preview.F.proof;
  const pl=plan('preview',p);Object.assign(pl,{sourceSha:source,mechanismSha:mechanism,authorityHead:head,transportBlob:pkg.blob(git('show',head+':'+n.C.transport))});
  return {dir,repo,p,pl,git,text,put,commit,source,mechanism,head,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('real Git preimages close native admission against product, working owner, missing revision and historical receipt drift',()=>{
  const f=realGitFixture();try{
    assert.equal(n.verifyPinnedOwners(f.p,{cwd:f.repo}).ownerCount,4);
    const preimage=clone(f.p);preimage.providerBinding.mechanism.files['tools/gravicentra-i6-6-operational-release-candidate.cjs'].beforeBlob='9'.repeat(40);assert.throws(()=>n.verifyPinnedOwners(preimage,{cwd:f.repo}),/REAL_OWNER_PREIMAGE/);
    f.put('functions/synthetic-test-owner.js','changed product\n');assert.throws(()=>n.verifyPinnedOwners(f.p,{cwd:f.repo}),/NO_WORKING_PRODUCT_CHANGE/);f.git('checkout','--','functions/synthetic-test-owner.js');
    f.put('functions/unapproved-test-owner.js','new product\n');assert.throws(()=>n.verifyPinnedOwners(f.p,{cwd:f.repo}),/NO_UNTRACKED_PRODUCT_OWNER/);fs.unlinkSync(path.join(f.repo,'functions/unapproved-test-owner.js'));
    f.put(n.C.tool,'unsealed executing mechanism\n');assert.throws(()=>n.verifyPinnedOwners(f.p,{cwd:f.repo}),/EXECUTING_MECHANISM_OWNER/);f.git('checkout','--',n.C.tool);
    const historical=f.p.financialRecoveryQa;assert.ok(historical);f.put(historical.receiptPath,'{}\n');f.commit('synthetic forbidden historical rewrite');assert.throws(()=>n.verifyPinnedOwners(f.p,{cwd:f.repo}),/HISTORICAL_RECEIPT_CURRENT|UNADMITTED_SOURCE_OR_QA_CHANGE/);f.git('reset','--hard',f.head);
    const undeclared=g.PINNED_OWNER_PATHS.find(x=>x.startsWith('tools/')&&x.endsWith('.test.cjs')&&!n.MECHANISM_PATHS.includes(x));assert.ok(undeclared);f.put(undeclared,'// unadmitted source QA\n');f.commit('synthetic undeclared QA mutation');assert.throws(()=>n.verifyPinnedOwners(f.p,{cwd:f.repo}),/UNADMITTED_SOURCE_OR_QA_CHANGE/);
  }finally{f.cleanup();}
});
test('historical admission fixture permits only its recorded predecessor and successor',()=>{
  const mechanism=candidate().p.providerBinding.mechanism;
  const file='tools/gravicentra-i6-6-composite-preview-admission.test.cjs';
  const receipt=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_ASSIGNED_ROLES_HISTORICAL_FIXTURE_PROVIDER_QA_20261125.json','utf8'));
  const revision=receipt.tests.find(test=>test.path===file);
  const bytes=execFileSync('git',['cat-file','blob',revision.gitBlobSha]);
  assert.equal(pkg.blob(bytes),revision.gitBlobSha);
  mechanism.files[file]={beforeBlob:revision.replaces.priorGitBlobSha,blob:revision.gitBlobSha,sha256:pkg.sha(bytes)};
  assert.equal(n.validateMechanism(mechanism,mechanism.sourceSha),mechanism);
  for(const key of ['beforeBlob','blob']){
    const bad=clone(mechanism);bad.files[file][key]='1'.repeat(40);
    assert.throws(()=>n.validateMechanism(bad,bad.sourceSha),/HISTORICAL_ADMISSION_FIXTURE_EXACT_REVISION/);
  }
});
test('the composite acceptance fixture admits only its exact source and corrected bytes',()=>{
  const mechanism=candidate().p.providerBinding.mechanism,file='tools/gravicentra-i66-composite-acceptance.test.cjs';
  const bytes=fs.readFileSync(file);
  mechanism.files[file]={beforeBlob:'3bab3e94cdd575b40efda54eb8d6d7ba72f87a39',blob:pkg.blob(bytes),sha256:pkg.sha(bytes)};
  assert.equal(n.validateMechanism(mechanism,mechanism.sourceSha),mechanism);
  for(const key of ['beforeBlob','blob']){
    const changed=clone(mechanism);changed.files[file][key]='1'.repeat(40);
    assert.throws(()=>n.validateMechanism(changed,changed.sourceSha),/HISTORICAL_COMPOSITE_FIXTURE_EXACT_REVISION/);
  }
});
test('continuity owner regression test is admissible only with its exact mechanism preimage and current bytes',()=>{
  const f=realGitFixture(),file='tools/gravicentra-i66-frontend-control.test.cjs';
  try{
    assert.ok(n.MECHANISM_PATHS.includes(file));assert.ok(g.PINNED_OWNER_PATHS.includes(file));
    const bytes=Buffer.from('// synthetic continuity regression test\n');f.put(file,bytes);
    f.p.providerBinding.mechanism.commit=f.commit('synthetic continuity QA mechanism successor');
    f.p.providerBinding.mechanism.files[file]={beforeBlob:null,blob:pkg.blob(bytes),sha256:pkg.sha(bytes)};
    assert.equal(n.verifyPinnedOwners(f.p,{cwd:f.repo}).ownerCount,5);
    const omitted=clone(f.p);delete omitted.providerBinding.mechanism.files[file];
    assert.throws(()=>n.verifyPinnedOwners(omitted,{cwd:f.repo}),/UNADMITTED_SOURCE_OR_QA_CHANGE/);
    f.put(file,'// unsealed continuity test bytes\n');
    assert.throws(()=>n.verifyPinnedOwners(f.p,{cwd:f.repo}),/EXECUTING_MECHANISM_OWNER/);
  }finally{f.cleanup();}
});
test('shallow provider checkout fetches canonical public history before pins without changing the executing HEAD or bytes',()=>{
  const f=realGitFixture();try{
    const shallow=path.join(f.dir,'provider-checkout'),url='file://'+f.repo;
    execFileSync('git',['clone','--quiet','--depth','1','--single-branch','--branch',n.C.branch,url,shallow],{stdio:'pipe'});
    const git=(...args)=>execFileSync('git',args,{cwd:shallow,stdio:'pipe'}),head=git('rev-parse','HEAD').toString(),bytes=fs.readFileSync(path.join(shallow,n.C.tool));
    assert.equal(git('rev-parse','--is-shallow-repository').toString().trim(),'true');assert.throws(()=>n.verifyPinnedOwners(f.p,{cwd:shallow}));
    const fetches=[],runGit=(...args)=>{if(args[0]==='fetch'){fetches.push([...args]);assert.ok(args.includes(n.C.repositoryUrl));args=args.map(x=>x===n.C.repositoryUrl?url:x);}return git(...args);};
    assert.equal(n.ensureHistory(f.pl,{cwd:shallow,runGit}).fetched,true);assert.equal(fetches.length,1);assert.ok(fetches[0].includes('--unshallow'));
    assert.equal(git('rev-parse','HEAD').toString(),head);assert.ok(fs.readFileSync(path.join(shallow,n.C.tool)).equals(bytes));assert.equal(n.verifyPinnedOwners(f.p,{cwd:shallow}).ownerCount,4);
    assert.equal(n.ensureHistory(f.pl,{cwd:shallow,runGit}).fetched,false);assert.equal(fetches.length,1);
  }finally{f.cleanup();}
});
test('financial authority fetch makes the newly signed journal commit readable and holds on a concurrent branch change',()=>{
  const f=realGitFixture();try{
    const worker=path.join(f.dir,'financial-worker');execFileSync('git',['clone','--quiet','file://'+f.repo,worker],{stdio:'pipe'});
    f.put('synthetic-journal.json','{"phase":"VERIFIED","unitOnly":true}\n');const journalHead=f.commit('synthetic signed journal availability only');
    const gitRead=(...args)=>execFileSync('git',args.map(x=>x===n.C.repositoryUrl?'file://'+f.repo:x),{cwd:worker,stdio:'pipe'});
    assert.throws(()=>gitRead('cat-file','-e',journalHead+'^{commit}'));
    assert.equal(n.fetchAuthorityHead(journalHead,{cwd:worker,gitRead}),journalHead);assert.ok(gitRead('show',journalHead+':synthetic-journal.json').includes('VERIFIED'));
    assert.equal(gitRead('rev-parse','HEAD').toString().trim(),f.head);
    f.put('synthetic-concurrent.json','{}\n');f.commit('synthetic concurrent advancement');assert.throws(()=>n.fetchAuthorityHead(journalHead,{cwd:worker,gitRead}),/REMOTE_AUTHORITY_MOVED_DURING_READ/);
  }finally{f.cleanup();}
});
test('native financial report retains all 48 real-view obligations and exact provider, artifact and workflow binding',()=>{
  const owner=require('./gravicentra-i66-frontend-promotion-owner.cjs'),p=candidate().p,pl=plan('preview',p),text=fs.readFileSync(path.join(__dirname,'gravicentra-i66-composite-acceptance.test.cjs'),'utf8');
  const makeReport=new Function('require','clone',text.slice(text.indexOf('function financialReport('),text.indexOf('function makeFixture('))+';return financialReport;')(require,clone);
  const target=owner.financialTarget({...p,previewChannel:p.previewChannelId}),binding={scopeId:owner.FINANCIAL_SCOPE,authorityBlob:pl.financialAuthorityBlob,parentAuthorityBlob:pl.transportBlob};
  const report=makeReport({p,request:{target,financialQa:binding,generation:6},proof:{runId:EXEC_UUID,headSha:pl.authorityHead}},{},'preview');report.executionProvider='CLOUD_BUILD';
  const options={authorityBlob:binding.authorityBlob,releaseScope:'COMPOSITE',parentAuthorityBlob:binding.parentAuthorityBlob};owner.validateFinancialReport(report,target,'preview',options);
  for(const change of [x=>delete x.executionProvider,x=>x.executionProvider='GITHUB_ACTIONS',x=>x.releaseArtifactId=123,x=>x.stageCount=47,x=>x.workflowHeadSha='f'.repeat(40),x=>x.roles[0].financialFocal.observations[0].afterReload.balanceCents=27825,x=>x.firestoreWrites=1]){const bad=clone(report);change(bad);assert.throws(()=>owner.validateFinancialReport(bad,target,'preview',options));}
});
module.exports={candidate,plan,build,hostingPlan};

test('assigned-role native preflight fetches the canonical remote and requires the sealed current owners before consent',t=>{
  const driver=require('./gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs');
  const p=candidate().p,head='a'.repeat(40),actions=[];
  t.mock.method(g,'candidateForPhase',()=>p);
  const verify=t.mock.method(g,'verifyPinnedOwners',(observed,options)=>{
    assert.equal(observed,p);assert.equal(options.head,head);
    throw Error('I66_DIRECT_FORMS_ROLE_TEST_REJECTED_UNVERIFIED_OWNER');
  });
  const git=(_program,args)=>{
    actions.push(args);
    if(args[0]==='fetch'||args[0]==='merge-base')return '';
    if(args[0]==='rev-parse')return head;
    if(args[0]==='show'&&args[1]===head+':'+g.CONTROL)return '{}';
    throw Error('UNEXPECTED_GIT_READ');
  };
  const cfg={phase:'PREVIEW',source:p.sourceSha,origin:p.previewUrl};
  assert.throws(()=>driver.readCurrentPaulaRoleAuthority({cfg,candidate:p},{execFileSync:git}),/TEST_REJECTED_UNVERIFIED_OWNER/);
  assert.equal(verify.mock.callCount(),1);
  assert.deepEqual(actions[0],['fetch','--no-tags','--quiet',n.C.repositoryUrl,'refs/heads/'+n.C.branch]);
  assert.ok(actions.some(args=>args[0]==='merge-base'&&args[2]===p.sourceSha&&args[3]===head));
});

test('resume distinguishes a missing claim, an active worker, and a compensated terminal attempt',async()=>{
  const p=candidate().p, artifactDigest=p.artifactDigest, sourceSha=p.sourceSha;
  const claim={schema:'GI_I66_NATIVE_OPERATIONAL_CLAIM_V1',executionProvider:n.C.provider,phase:'preview',sourceSha,
    artifactId:p.artifactId,artifactDigest,authorityHead:'b'.repeat(40),planSha256:'a'.repeat(64),buildId:EXEC_UUID};
  const ref={uri:'gs://'+n.C.bucket+'/'+n.lockName(p,'preview'),generation:'12',bytes:100,sha256:'a'.repeat(64)};
  const holdRef={uri:'gs://'+n.C.bucket+'/i66/operational-attempts/'+EXEC_UUID+'/hold.json',generation:'15',bytes:110,sha256:'b'.repeat(64)};
  const hold={...claim,schema:'GI_I66_NATIVE_OPERATIONAL_HOLD_V1',claim:ref,code:'QA_FAILED',rollback:{proof:{status:'COMPENSATION_READBACK_VERIFIED'}}};
  const build={id:EXEC_UUID,projectId:n.C.projectId,source:{gitSource:{revision:claim.authorityHead}},
    serviceAccount:'projects/'+n.C.projectId+'/serviceAccounts/'+n.C.serviceAccount,status:'WORKING'};
  const io={findClaim:async name=>name.endsWith('hold.json')?holdRef:ref,object:async r=>({data:JSON.stringify(r===ref?claim:hold)}),build:async()=>build};
  assert.equal(await n.observeOperationalClaim(p,'preview',{...io,findClaim:async()=>null}),null);
  assert.equal((await n.observeOperationalClaim(p,'preview',io)).status,'ATTEMPT_RUNNING');
  build.status='FAILURE';assert.equal((await n.observeOperationalClaim(p,'preview',io)).status,'PROVIDER_FAILURE_COMPENSATED');
  hold.rollback=null;assert.equal((await n.observeOperationalClaim(p,'preview',io)).status,'PROVIDER_FAILURE_HOLD');
  hold.artifactDigest='sha256:'+'0'.repeat(64);
  await assert.rejects(()=>n.observeOperationalClaim(p,'preview',io),/TERMINAL_HOLD_BINDING/);
  await assert.rejects(()=>n.observeOperationalClaim(p,'preview',{...io,findClaim:async name=>name.endsWith('hold.json')?null:ref}),/READBACK_PENDING/);
});

test('a functional package is independent of the Make service and retains both financial owners',()=>{
  const contract=require('./gravicentra-i6-6-frontend-preview-authority.cjs'),c=contract.historicalPaymentUnit;
  const binding=JSON.parse(fs.readFileSync(path.join(root,'artifacts/orbit360-recovery/release-control/I6_6_SCOPED_FUNCTION_RELEASE.json')));
  const cp=JSON.parse(fs.readFileSync(path.join(root,n.C.control))),current={...cp[cp.currentExecutionDecisionPointer],functionalEpoch:binding.releaseEpoch};
  const source={current,readBlob:file=>binding.sourcePins[file]};
  const candidate={executionProvider:n.C.provider,providerBinding:binding};
  assert.equal(n.validateBinding(candidate,source),binding);
  assert.ok(!binding.dependencies.includes('make')&&binding.owners.includes('functions/payment-inference-engine.js'));
  for(const mutate of [b=>b.dependencies.splice(b.dependencies.indexOf('firestore'),1),b=>delete b.sourcePins['functions/payment-inference-engine.js'],
    b=>{b.targets.live='orbit360OpsLeadsCommand'},b=>{b.scope='FRONTEND_ONLY'},b=>b.releaseEpoch++]){
    const bad=structuredClone(binding);mutate(bad);assert.throws(()=>n.validateBinding({...candidate,providerBinding:bad},source));
  }
  const latest={i66ScopedFunctionRelease:{accepted:{epoch:1,revision:'new-revision',sourcePins:{'functions/cobros-reconciliation-domain.js':'b'.repeat(40)}}}};
  assert.throws(()=>n.assertCompositeFresh({sourceSha:'a'.repeat(40)},latest,()=> 'c'.repeat(40)),/SUPERSEDED_FUNCTIONAL_SOURCE/);
  assert.throws(()=>n.assertCompositeFresh({sourceSha:'a'.repeat(40)},latest,()=> 'b'.repeat(40)),/SUPERSEDED_FUNCTIONAL_PREDECESSOR/);
  assert.doesNotThrow(()=>n.assertCompositeFresh({sourceSha:'a'.repeat(40),scopedPredecessor:{epoch:1,revision:'new-revision'}},latest,()=> 'b'.repeat(40)));
});

test('Cloud SDK identifies a missing claim by its exact encoded object and 404',()=>{
  const name='i66/functional/test/preview-claim.json';
  const message='ERROR: (gcloud.storage.objects.describe) gs://'+n.C.bucket+'/'+encodeURIComponent(name)+' not found: 404.';
  assert.equal(n.missingOperationalClaim(message,name),true);
  assert.equal(n.missingOperationalClaim(message,'i66/functional/test/live-claim.json'),false);
  assert.equal(n.missingOperationalClaim(message.replace('404','403'),name),false);
  assert.equal(n.missingOperationalClaim('UNAVAILABLE',name),false);
});
