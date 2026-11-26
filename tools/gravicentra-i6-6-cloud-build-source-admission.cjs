'use strict';
// Isolated provider adapter for the EXISTING source-QA / control-plane guard.
// prepare writes local config only; worker executes original read-only blocks;
// verify reads real provider evidence. Nothing here dispatches a build, admits
// a package, changes a ref, deploys, or substitutes for signed functional QA.
// Request 35 retains its frozen Actions QA lineage. Subsequent requests may
// use provider-pinned native source QA through the existing admission owner.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const crypto=require('node:crypto');
const pkg=require('./gravicentra-i6-6-cloud-build-package.cjs');
const {sha,blob,digest}=pkg;
const C=Object.freeze({...pkg.C,
  tool:'tools/gravicentra-i6-6-cloud-build-source-admission.cjs',
  test:'tools/gravicentra-i6-6-cloud-build-source-admission.test.cjs',
  sourceWorkflow:'.github/workflows/gravicentra-i66-privileged-role-parity-source-qa.yml',
  guardWorkflow:'.github/workflows/gravicentra-release-lock-sync.yml',
  stepId:'i66-native-source-qa-and-guard',
  scope:'EXISTING_MANDATORY_SOURCE_QA_GUARD_ONLY_NO_RELEASE_ADMISSION',
  mode:'CANONICAL_SOURCE_CHANGE',
  planSchema:'GI_I66_NATIVE_SOURCE_QA_PLAN_V1',
  proofSchema:'GI_I66_NATIVE_SOURCE_QA_PROOF_V1',
  receiptSchema:'GI_I66_NATIVE_SOURCE_QA_RECEIPT_V1',
  sdkRoot:'/workspace/.i66-source-admission-adc',
  sdkVersion:'10.9.1'
});
const JOBS=Object.freeze({
  source:'signed-source-gate-no-production-writes',
  governance:'verify-control-plane',
  availability:'live-hosting-availability-readonly'
});
const STEPS=Object.freeze({
  source:{job:'source',name:'Source test with 5 roles, 12 domain writers and explicit negative boundaries'},
  lineage:{job:'source',name:'Canonical source blob and historic release guard without re-opening B4'},
  governance:{job:'governance',name:'Fail closed through canonical shared governance preflight'},
  receipt:{job:'availability',name:'Verify active generation against its physical receipt and file counts',inline:true},
  availability:{job:'availability',name:'Probe DNS TLS HTTPS both LIVE origins and exact build, fail closed'}
});
const F=Object.freeze({proof:'gi-i66-native-source-proof.json',
  source:'gi-i66-native-source.log',lineage:'gi-i66-native-source-lineage.log',
  governance:'gi-i66-native-governance.log',receipt:'gi-i66-native-receipt.log',
  availability:'gi-i66-native-availability.log',regression:'gi-operational-regression.json',
  availabilityReport:'gi-i66-live-availability.json',summary:'gi-i66-native-source-summary.txt'});
const PINS=Object.freeze([C.tool,C.test,pkg.C.tool,pkg.C.test,C.admission,
  'tools/gravicentra-i6-6-native-preview-admission.test.cjs']);
const need=(v,c)=>assert.ok(v,'I66_NATIVE_SOURCE_'+c),eq=(a,b,c)=>assert.deepEqual(a,b,'I66_NATIVE_SOURCE_'+c);
const sha40=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v),sha64=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
const generation=v=>typeof v==='string'&&/^[1-9][0-9]{0,24}$/.test(v);
const write=(file,value)=>fs.writeFileSync(file,Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const gitBytes=(cwd,ref,file)=>execFileSync('git',['show',ref+':'+file],{cwd,maxBuffer:64*1024*1024});
const apiUrl=id=>'https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+id;
function jobSections(text){
  need(typeof text==='string'&&!/\r/.test(text),'WORKFLOW_UTF8_LF');
  eq(text.split('\njobs:\n').length,2,'WORKFLOW_JOBS');
  need(!/^(?:env|defaults):/m.test(text),'NO_WORKFLOW_RUNTIME_OVERRIDE');
  const body=text.split('\njobs:\n')[1],matches=[...body.matchAll(/^  ([a-z0-9-]+):\n/gm)],out={};
  for(let i=0;i<matches.length;i++){need(!out[matches[i][1]],'DUPLICATE_JOB');out[matches[i][1]]=body.slice(matches[i].index,(matches[i+1]?.index??body.length));}
  return out;
}
function workflowContract(sourceText,guardText,commitMessage){
  need(typeof commitMessage==='string','SOURCE_COMMIT_MESSAGE');
  const source=jobSections(sourceText),guard=jobSections(guardText);
  eq(Object.keys(source).sort(),[JOBS.source,'synthetic-chromium-detach-causal-no-production-writes'].sort(),'SOURCE_JOB_SET');
  eq(Object.keys(guard).sort(),[JOBS.governance,JOBS.availability,'b4003-firestore-emulator'].sort(),'GUARD_JOB_SET');
  // These are the original conditional jobs, not optional gates silently
  // dropped by native execution. A matching source needs its separate adapter.
  eq(source['synthetic-chromium-detach-causal-no-production-writes'].match(/^    if: (.+)$/m)?.[1],
    "github.repository == '"+C.repository+"' && github.ref == 'refs/heads/"+C.branch+"' && github.event_name == 'push' && contains(github.event.head_commit.message, 'I66_QA_DETACH_CAUSAL_CHECK')",'CHROMIUM_CONDITION_CHANGED');
  eq(guard['b4003-firestore-emulator'].match(/^    if: (.+)$/m)?.[1],
    '$'+"{{ github.event_name == 'workflow_dispatch' || (github.event_name == 'push' && (startsWith(github.event.head_commit.message, 'test(i6.5 B4-003 security-emulator)') || startsWith(github.event.head_commit.message, 'fix(b4003)'))) }}",'EMULATOR_CONDITION_CHANGED');
  need(!commitMessage.includes('I66_QA_DETACH_CAUSAL_CHECK')&&!commitMessage.startsWith('test(i6.5 B4-003 security-emulator)')&&!commitMessage.startsWith('fix(b4003)'),'APPLICABLE_CONDITIONAL_JOB_REQUIRES_ITS_NATIVE_ADAPTER');
  const sections={source:source[JOBS.source],governance:guard[JOBS.governance],availability:guard[JOBS.availability]},jobs={},blocks={};
  for(const [key,section] of Object.entries(sections)){
    const keys=[...section.matchAll(/^    ([a-z-]+):/gm)].map(m=>m[1]).sort();
    eq(keys,(key==='source'?['if','runs-on','steps','timeout-minutes']:key==='availability'?['permissions','runs-on','steps','timeout-minutes']:['runs-on','steps','timeout-minutes']).sort(),'JOB_RUNTIME_KEYS');
    if(key==='source')need(section.includes("    if: github.repository == '"+C.repository+"' && github.ref == 'refs/heads/"+C.branch+"'\n"),'SOURCE_SCOPE_CONDITION');
    if(key==='availability')need(section.includes('    permissions:\n      contents: read\n'),'READONLY_JOB_PERMISSIONS');
    const timeout=section.match(/^    timeout-minutes: ([1-9][0-9]*)$/m);
    need(timeout&&Number.isSafeInteger(Number(timeout[1]))&&Number(timeout[1])<=60,'ORIGINAL_JOB_TIMEOUT');
    need(section.includes('    runs-on: ubuntu-24.04\n'),'ORIGINAL_JOB_RUNNER');
    const expected=Object.entries(STEPS).filter(([,s])=>s.job===key),parts=section.split(/^      - /m).slice(1);
    const runs=parts.filter(s=>/^        run:/m.test(s));
    eq(runs.map(s=>s.match(/^name: (.+)\n/)?.[1]),expected.map(([,s])=>s.name),'ALL_ORIGINAL_RUN_STEPS');
    for(const s of runs)need(/^name: [^\n]+\n        run:/.test(s),'NO_RUN_IF_OR_ENV_OVERRIDE');
    for(const part of parts.filter(s=>!/^        run:/m.test(s)))need(/^(?:name: [^\n]+\n        (?:if: always\(\)\n        )?)?uses: actions\/(?:checkout|setup-node|upload-artifact)@v4\n/.test(part),'UNREVIEWED_ACTION_STEP');
    jobs[key]={id:JOBS[key],timeoutSeconds:Number(timeout[1])*60};
    for(const [name,step] of expected){
      const part=runs.find(s=>s.startsWith('name: '+step.name+'\n'));
      if(step.inline){const match=part.match(/^name: [^\n]+\n        run: ([^\n]+)\n*$/);need(match,'EXACT_INLINE_RUN');blocks[name]=match[1]+'\n';}
      else blocks[name]=pkg.runBlock(section,step.name);
    }
  }
  need(blocks.source.includes('I66_PRIVILEGED_ROLE_SYNTHETIC_SOURCE_REGRESSION_PASS_NO_CUSTOMER_WRITES_NO_DEPLOY'),'SOURCE_GATE_MARKER');
  need(blocks.lineage.includes('node tools/gravicentra-i6-6-delta-guard.mjs'),'ORIGINAL_LINEAGE_OWNER');
  need(blocks.governance.includes('node tools/gravicentra-governance-preflight-v1.mjs --mode=governance'),'ORIGINAL_GOVERNANCE_OWNER');
  eq(blocks.receipt,'node --test tools/gravicentra-i66-frontend-control.test.cjs\n','ORIGINAL_RECEIPT_OWNER');
  need(blocks.availability.includes("if report['result']!='PASS': raise SystemExit('I66_LIVE_PUBLIC_AVAILABILITY_HOLD')"),'ORIGINAL_LIVE_PROBE_REQUIRED');
  const runtime={...blocks};
  eq(runtime.governance.split('$GITHUB_REF_NAME').length,2,'EXACT_BRANCH_SUBSTITUTION');
  eq(runtime.governance.split('$GITHUB_STEP_SUMMARY').length,2,'EXACT_GOVERNANCE_SUMMARY');
  eq(runtime.availability.split("os.environ['GITHUB_STEP_SUMMARY']").length,2,'EXACT_AVAILABILITY_SUMMARY');
  runtime.governance=runtime.governance.replace('$GITHUB_REF_NAME','$I66_SOURCE_QA_BRANCH').replace('$GITHUB_STEP_SUMMARY','$I66_SOURCE_QA_SUMMARY');
  runtime.availability=runtime.availability.replace("os.environ['GITHUB_STEP_SUMMARY']","os.environ['I66_SOURCE_QA_SUMMARY']");
  for(const text of Object.values(runtime)){
    need(!text.includes('GITHUB_'),'NO_GITHUB_RUNTIME_IMPERSONATION');
    need(!/(?:firebase\s+deploy|gcloud\s|gsutil\s|hosting:clone|functions:delete)/.test(text),'NO_DEPLOY_BLOCK');
  }
  return {jobs,blocks,runtime};
}
function validatePlan(p){
  eq(Object.keys(p||{}).sort(),['schema','provider','scope','mode','repository','branch','projectId','projectNumber','region','serviceAccount','bucket','mechanismSha','sourceQaHead','sourceTreeSha','commitMessageSha256','pins','workflows','jobs','blocks','noDeploy','realBusinessWrites','fullI66ProductionAccepted'].sort(),'PLAN_KEYS');
  eq([p.schema,p.provider,p.scope,p.mode],[C.planSchema,C.provider,C.scope,C.mode],'PLAN_KIND');
  eq([p.repository,p.branch,p.projectId,p.projectNumber,p.region,p.serviceAccount,p.bucket],[C.repository,C.branch,C.projectId,C.projectNumber,C.region,C.serviceAccount,C.bucket],'PLAN_BOUNDARY');
  need([p.mechanismSha,p.sourceQaHead,p.sourceTreeSha].every(sha40)&&sha64(p.commitMessageSha256),'EXACT_SOURCE_IDENTITY');
  eq(Object.keys(p.pins||{}).sort(),[...PINS].sort(),'PIN_SCOPE');
  eq(Object.keys(p.workflows||{}).sort(),[C.sourceWorkflow,C.guardWorkflow].sort(),'WORKFLOW_SCOPE');
  for(const pin of [...Object.values(p.pins),...Object.values(p.workflows)]){
    eq(Object.keys(pin).sort(),['blob','sha256'],'PIN_KEYS');need(sha40(pin.blob)&&sha64(pin.sha256),'PIN_HASHES');
  }
  eq(Object.keys(p.jobs||{}).sort(),Object.keys(JOBS).sort(),'JOB_KEYS');
  for(const [key,job] of Object.entries(p.jobs)){eq(Object.keys(job).sort(),['id','timeoutSeconds'],'JOB_KEYS');eq(job.id,JOBS[key],'JOB_ID');need(Number.isSafeInteger(job.timeoutSeconds)&&job.timeoutSeconds>=60&&job.timeoutSeconds<=3600&&job.timeoutSeconds%60===0,'JOB_BUDGET');}
  eq(Object.keys(p.blocks||{}).sort(),Object.keys(STEPS).sort(),'BLOCK_KEYS');
  for(const [key,b] of Object.entries(p.blocks)){eq(Object.keys(b).sort(),['executedSha256','signedSha256'],'BLOCK_HASH_KEYS');need(sha64(b.signedSha256)&&sha64(b.executedSha256),'BLOCK_HASH');}
  eq([p.noDeploy,p.realBusinessWrites,p.fullI66ProductionAccepted],[true,0,false],'NO_RELEASE_CLAIM');
  return p;
}
function sourceContract(repo,p){
  eq(git(repo,'rev-parse',p.sourceQaHead+'^{tree}'),p.sourceTreeSha,'SOURCE_TREE');
  const message=execFileSync('git',['show','-s','--format=%B',p.sourceQaHead],{cwd:repo,encoding:'utf8'});
  eq(sha(message),p.commitMessageSha256,'SOURCE_MESSAGE');
  const read=file=>{const b=gitBytes(repo,p.sourceQaHead,file);eq({blob:blob(b),sha256:sha(b)},p.workflows[file],'WORKFLOW_BYTES');return b.toString('utf8');};
  const contract=workflowContract(read(C.sourceWorkflow),read(C.guardWorkflow),message);
  eq(contract.jobs,p.jobs,'WORKFLOW_JOB_BUDGETS');
  eq(Object.fromEntries(Object.keys(STEPS).map(k=>[k,{signedSha256:sha(contract.blocks[k]),executedSha256:sha(contract.runtime[k])}])),p.blocks,'LITERAL_WORKFLOW_BLOCKS');
  return contract;
}
function makePlan(repo,{sourceQaHead,mechanismSha=git(repo,'rev-parse','HEAD')}){
  need(sha40(sourceQaHead)&&sha40(mechanismSha),'PLAN_EXACT_COMMITS');eq(git(repo,'rev-parse','HEAD'),mechanismSha,'MECHANISM_HEAD');
  git(repo,'merge-base','--is-ancestor',sourceQaHead,mechanismSha);
  const message=execFileSync('git',['show','-s','--format=%B',sourceQaHead],{cwd:repo,encoding:'utf8'});
  const originals=Object.fromEntries([C.sourceWorkflow,C.guardWorkflow].map(f=>[f,gitBytes(repo,sourceQaHead,f)]));
  const contract=workflowContract(originals[C.sourceWorkflow].toString('utf8'),originals[C.guardWorkflow].toString('utf8'),message);
  const pins=Object.fromEntries(PINS.map(f=>{const b=gitBytes(repo,mechanismSha,f);eq(fs.readFileSync(path.join(repo,f)),b,'MECHANISM_WORKTREE_DRIFT');return[f,{blob:blob(b),sha256:sha(b)}];}));
  return validatePlan({schema:C.planSchema,provider:C.provider,scope:C.scope,mode:C.mode,
    repository:C.repository,branch:C.branch,projectId:C.projectId,projectNumber:C.projectNumber,region:C.region,serviceAccount:C.serviceAccount,bucket:C.bucket,
    mechanismSha,sourceQaHead,sourceTreeSha:git(repo,'rev-parse',sourceQaHead+'^{tree}'),commitMessageSha256:sha(message),pins,
    workflows:Object.fromEntries(Object.entries(originals).map(([f,b])=>[f,{blob:blob(b),sha256:sha(b)}])),jobs:contract.jobs,
    blocks:Object.fromEntries(Object.keys(STEPS).map(k=>[k,{signedSha256:sha(contract.blocks[k]),executedSha256:sha(contract.runtime[k])}])),
    noDeploy:true,realBusinessWrites:0,fullI66ProductionAccepted:false});
}
function prefix(p,id){need(uuid(id)||id==='$BUILD_ID','REAL_UUID');return 'i66/source-qa/'+p.sourceQaHead+'/'+id+'/';}
const BOOTSTRAP='set -euo pipefail\npython3 --version\nnpm install --prefix '+C.sdkRoot+' --no-save --package-lock=false --ignore-scripts --no-audit --no-fund google-auth-library@'+C.sdkVersion+'\nnode '+C.tool+' worker "$1"\n';
function configFor(p){
  validatePlan(p);
  return {steps:[{id:C.stepId,name:C.image,entrypoint:'bash',args:['-euo','pipefail','-c',BOOTSTRAP.split('$').join('$$'),'--',JSON.stringify(p)],
    env:['GRAVICENTRA_BUILD_PROVIDER=$_I66_PROVIDER','GRAVICENTRA_CLOUD_BUILD_ID=$BUILD_ID','GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT='+C.serviceAccount,
      'PROJECT_ID='+C.projectId,'I66_SOURCE_QA_HEAD=$_I66_SOURCE_QA_HEAD','I66_SOURCE_QA_PLAN_SHA256=$_I66_PLAN_SHA256']}],
    serviceAccount:'projects/'+C.projectId+'/serviceAccounts/'+C.serviceAccount,
    timeout:String(Object.values(p.jobs).reduce((n,j)=>n+j.timeoutSeconds,0))+'s',logsBucket:'gs://'+C.bucket+'/i66/cloud-build-logs',
    options:{logging:'GCS_ONLY',sourceProvenanceHash:['SHA256'],machineType:'E2_STANDARD_2'},
    substitutions:{_I66_PROVIDER:C.provider,_I66_SOURCE_QA_HEAD:p.sourceQaHead,_I66_PLAN_SHA256:digest(p)},
    tags:['i66-source-qa-and-guard-only'],
    artifacts:{objects:{location:'gs://'+C.bucket+'/'+prefix(p,'$BUILD_ID'),paths:Object.values(F)}}};
}
function validateBuild(p,b,{finished=true}={}){
  validatePlan(p);need(uuid(b.id),'BUILD_UUID');
  need([C.projectId,C.projectNumber].some(n=>b.name==='projects/'+n+'/locations/'+C.region+'/builds/'+b.id),'BUILD_RESOURCE');
  eq([b.projectId,b.status],[C.projectId,finished?'SUCCESS':'WORKING'],'BUILD_STATUS_PROJECT');
  const c=configFor(p);for(const k of ['serviceAccount','timeout','logsBucket','substitutions','tags'])eq(b[k],c[k],'BUILD_'+k);
  for(const k of ['logging','sourceProvenanceHash','machineType'])eq(b.options?.[k],c.options[k],'OPTIONS_'+k);
  for(const k of ['env','secretEnv','volumes'])need(!b.options?.[k]?.length,'NO_GLOBAL_OVERRIDE');
  need(!b.options?.pool?.name&&!b.options?.workerPool&&!b.options?.automapSubstitutions&&!b.options?.dynamicSubstitutions,'NO_RUNTIME_OVERRIDE');
  need(!b.secrets?.length&&!b.availableSecrets&&!b.dependencies?.length&&!b.images?.length&&!b.gitConfig&&!b.buildTriggerId,'NO_EXTRA_EXECUTOR');
  eq(Object.keys(b.source||{}),['gitSource'],'SOURCE_KIND');
  eq([b.source.gitSource.url,b.source.gitSource.revision],[C.repositoryUrl,p.mechanismSha],'BUILD_MECHANISM');need(!b.source.gitSource.dir,'SOURCE_ROOT');
  if(finished||b.sourceProvenance?.resolvedGitSource){const r=b.sourceProvenance?.resolvedGitSource;eq([r?.url,r?.revision],[C.repositoryUrl,p.mechanismSha],'RESOLVED_SOURCE');need(!r.dir,'RESOLVED_ROOT');}
  eq(b.steps?.length,1,'ONE_EXACT_NATIVE_STEP');const s=b.steps[0],e=c.steps[0];
  for(const k of ['id','name','entrypoint'])eq(s[k],e[k],'STEP_'+k);
  const expandedArgs=[...e.args];expandedArgs[3]=BOOTSTRAP;
  need(JSON.stringify(s.args)===JSON.stringify(e.args)||JSON.stringify(s.args)===JSON.stringify(expandedArgs),'EXACT_STEP_ARGS');
  const env=e.env.map(v=>v.replace(/\$([A-Z_][A-Z0-9_]*)/g,(m,k)=>k==='BUILD_ID'?b.id:c.substitutions[k]??m));
  need(JSON.stringify(s.env)===JSON.stringify(e.env)||JSON.stringify(s.env)===JSON.stringify(env),'EXACT_STEP_ENV');
  need(!s.allowFailure&&!s.allowExitCodes?.length&&!s.secretEnv?.length&&!s.script&&!s.dir&&!s.volumes?.length&&!s.waitFor?.length&&!s.timeout,'NO_STEP_BYPASS');
  eq(Object.keys(b.artifacts||{}),['objects'],'ARTIFACT_SCOPE');
  need([c.artifacts.objects.location,c.artifacts.objects.location.replace('$BUILD_ID',b.id)].includes(b.artifacts.objects.location),'ARTIFACT_LOCATION');
  eq(b.artifacts.objects.paths,Object.values(F),'ARTIFACT_SET');
  need(Number.isFinite(Date.parse(b.createTime))&&Date.parse(b.startTime)>=Date.parse(b.createTime),'BUILD_START_TIME');
  if(finished){
    eq(s.status,'SUCCESS','STEP_EXECUTED_SUCCESS');
    need(Date.parse(s.timing?.startTime)>=Date.parse(b.startTime)&&Date.parse(s.timing?.endTime)>Date.parse(s.timing?.startTime)&&Date.parse(b.finishTime)>=Date.parse(s.timing?.endTime),'STEP_EXECUTED_TIMING');
    eq(b.results?.buildStepImages?.length,1,'IMAGE_COUNT');need(/^sha256:[a-f0-9]{64}$/.test(b.results.buildStepImages[0]),'IMAGE_DIGEST');
    eq(Number(b.results.numArtifacts),Object.keys(F).length,'ARTIFACT_COUNT');
    const uri='gs://'+C.bucket+'/'+prefix(p,b.id)+'artifacts-'+b.id+'.json';
    need(b.results.artifactManifest===uri||b.results.artifactManifest?.startsWith(uri+'#')&&generation(b.results.artifactManifest.slice(uri.length+1)),'ARTIFACT_MANIFEST');
    need(b.logUrl?.startsWith('https://console.cloud.google.com/')&&b.logUrl.includes(b.id)&&[C.projectId,C.projectNumber].some(n=>b.logUrl.includes(n)),'PROVIDER_LOG_URL');
  }
  return b;
}
async function workerIdentity(env=process.env,{fetcher=globalThis.fetch,exists=fs.existsSync,homedir=os.homedir}={}){
  eq([env.GRAVICENTRA_BUILD_PROVIDER,env.PROJECT_ID,env.GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT],[C.provider,C.projectId,C.serviceAccount],'RUNTIME_IDENTITY');need(uuid(env.GRAVICENTRA_CLOUD_BUILD_ID),'RUNTIME_UUID');
  for(const k of Object.keys(env))if(k.startsWith('GITHUB_')||/^(?:GOOGLE_APPLICATION_CREDENTIALS|CLOUDSDK_AUTH_|GCE_METADATA_|FIRESTORE_EMULATOR_HOST|FIREBASE_AUTH_EMULATOR_HOST|STORAGE_EMULATOR_HOST)/.test(k))need(!String(env[k]||'').trim(),'NO_CREDENTIAL_OR_RUNTIME_OVERRIDE');
  for(const root of [path.join(homedir(),'.config','gcloud'),env.CLOUDSDK_CONFIG].filter(Boolean))need(!exists(path.join(root,'application_default_credentials.json')),'NO_LOCAL_ADC_IN_WORKER');
  const values=[];
  for(const suffix of ['project/project-id','project/numeric-project-id','instance/service-accounts/default/email']){
    const r=await fetcher('http://metadata.google.internal/computeMetadata/v1/'+suffix,{headers:{'Metadata-Flavor':'Google'},redirect:'error',signal:AbortSignal.timeout(5000)});
    need(r.status===200&&!r.redirected&&r.headers?.get('metadata-flavor')==='Google','TRUSTED_WORKER_METADATA');values.push((await r.text()).trim());
  }
  eq(values,[C.projectId,C.projectNumber,C.serviceAccount],'ACTUAL_WORKER_IDENTITY');
  return {provider:C.provider,buildId:env.GRAVICENTRA_CLOUD_BUILD_ID,projectId:C.projectId,serviceAccount:C.serviceAccount};
}
async function sdkReadBuild(id,GoogleAuth){
  need(uuid(id),'SDK_BUILD_UUID');
  const Constructor=GoogleAuth||require(path.join(C.sdkRoot,'node_modules/google-auth-library')).GoogleAuth;
  // builds.get documents cloud-platform as its OAuth scope; method/path stay
  // GET-only here. A made-up narrower scope would block legitimate readback.
  const client=await new Constructor({projectId:C.projectId,scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
  // ADC handles tokens inside the SDK. No getAccessToken, metadata/token,
  // credential file, environment export, or credential material is returned.
  return (await client.request({url:apiUrl(id),method:'GET',responseType:'json',timeout:60000})).data;
}
function jobBudgetMs(p,build,job,jobStartedMs,now=Date.now()){
  const deadline=Date.parse(build.startTime)+Number(configFor(p).timeout.slice(0,-1))*1000;
  const remaining=Math.floor(Math.min(deadline-now,p.jobs[job].timeoutSeconds*1000-(now-jobStartedMs)));
  need(Number.isSafeInteger(remaining)&&remaining>0,'ORIGINAL_JOB_OR_BUILD_BUDGET_EXHAUSTED');return remaining;
}
async function worker(p){
  validatePlan(p);need(process.versions.node.split('.')[0]==='22','NODE22');
  eq([process.env.I66_SOURCE_QA_HEAD,process.env.I66_SOURCE_QA_PLAN_SHA256],[p.sourceQaHead,digest(p)],'RUNTIME_PLAN');
  const root=process.cwd(),identity=await workerIdentity(),running=await sdkReadBuild(identity.buildId);validateBuild(p,running,{finished:false});
  eq(git(root,'rev-parse','HEAD'),p.mechanismSha,'WORKER_MECHANISM_HEAD');
  for(const [file,pin] of Object.entries(p.pins)){const b=fs.readFileSync(path.join(root,file));eq({blob:blob(b),sha256:sha(b)},pin,'WORKER_MECHANISM_PIN');}
  const temp=path.join(root,'gi-i66-source-qa-'+identity.buildId),source=path.join(temp,'source');fs.mkdirSync(temp,{recursive:false});
  execFileSync('git',['clone','--no-checkout','--branch',C.branch,C.repositoryUrl,source],{stdio:'inherit'});
  git(source,'merge-base','--is-ancestor',p.sourceQaHead,p.mechanismSha);
  const contract=sourceContract(source,p);execFileSync('git',['checkout','--detach',p.sourceQaHead],{cwd:source,stdio:'inherit'});
  eq(git(source,'rev-parse','HEAD'),p.sourceQaHead,'WORKER_SOURCE_HEAD');eq(git(source,'rev-parse','--is-shallow-repository'),'false','FULL_SOURCE_HISTORY');
  const env={...process.env,RUNNER_TEMP:temp,I66_SOURCE_QA_BRANCH:C.branch,I66_SOURCE_QA_SUMMARY:path.join(root,F.summary)};
  // Bootstrap and checkout consume the first original job's budget too.
  const checks={},starts={source:Date.parse(running.startTime)};
  for(const [name,step] of Object.entries(STEPS)){
    starts[step.job]??=Date.now();
    const result=pkg.execLogged('bash',['-euo','pipefail','-c',contract.runtime[name]],{cwd:source,env,log:path.join(root,F[name]),timeoutMs:jobBudgetMs(p,running,step.job,starts[step.job])});
    checks[name]={...result,file:F[name],job:JOBS[step.job],signedBlockSha256:p.blocks[name].signedSha256,executedBlockSha256:p.blocks[name].executedSha256,logSha256:sha(fs.readFileSync(path.join(root,F[name])))};
  }
  eq(git(source,'status','--porcelain','--untracked-files=no'),'','SOURCE_CHECKOUT_MUTATED');
  for(const file of [F.regression,F.availabilityReport])fs.copyFileSync(path.join(temp,file),path.join(root,file),fs.constants.COPYFILE_EXCL);
  const proof={schema:C.proofSchema,provider:C.provider,scope:C.scope,status:'SOURCE_QA_AND_GUARD_EXECUTED_NO_RELEASE_ADMISSION',
    buildId:identity.buildId,sourceQaHead:p.sourceQaHead,sourceTreeSha:p.sourceTreeSha,mechanismSha:p.mechanismSha,planSha256:digest(p),
    serviceAccount:C.serviceAccount,checks,fileHashes:Object.fromEntries(Object.values(F).filter(f=>f!==F.proof).map(f=>[f,sha(fs.readFileSync(path.join(root,f)))])),
    noDeploy:true,realBusinessWrites:0,fullI66ProductionAccepted:false};
  write(path.join(root,F.proof),proof);
  console.log('I66_NATIVE_SOURCE_QA_READY_FOR_PROVIDER_RETENTION '+JSON.stringify({buildId:identity.buildId,sourceQaHead:p.sourceQaHead,planSha256:digest(p),proofSha256:sha(fs.readFileSync(path.join(root,F.proof))),scope:C.scope}));
  return proof;
}
function validateProof(p,b,proof,files){
  eq(Object.keys(proof||{}).sort(),['schema','provider','scope','status','buildId','sourceQaHead','sourceTreeSha','mechanismSha','planSha256','serviceAccount','checks','fileHashes','noDeploy','realBusinessWrites','fullI66ProductionAccepted'].sort(),'PROOF_KEYS');
  eq([proof.schema,proof.provider,proof.scope,proof.status],[C.proofSchema,C.provider,C.scope,'SOURCE_QA_AND_GUARD_EXECUTED_NO_RELEASE_ADMISSION'],'PROOF_SCOPE');
  eq([proof.buildId,proof.sourceQaHead,proof.sourceTreeSha,proof.mechanismSha,proof.planSha256,proof.serviceAccount],[b.id,p.sourceQaHead,p.sourceTreeSha,p.mechanismSha,digest(p),C.serviceAccount],'PROOF_EXECUTION');
  eq([proof.noDeploy,proof.realBusinessWrites,proof.fullI66ProductionAccepted],[true,0,false],'PROOF_NO_RELEASE_CLAIM');
  eq(Object.keys(files).sort(),Object.values(F).sort(),'PROOF_ALL_FILES');
  eq(Object.keys(proof.fileHashes||{}).sort(),Object.values(F).filter(f=>f!==F.proof).sort(),'PROOF_HASH_SCOPE');
  for(const [file,hash] of Object.entries(proof.fileHashes))eq(sha(files[file]),hash,'PROOF_FILE_HASH');
  eq(Object.keys(proof.checks||{}).sort(),Object.keys(STEPS).sort(),'PROOF_ALL_CHECKS');
  let previous=Date.parse(b.steps[0].timing.startTime);const first={},last={};
  for(const [name,step] of Object.entries(STEPS)){
    const check=proof.checks[name],start=Date.parse(check.startedAt),end=Date.parse(check.endedAt);
    eq([check.status,check.exitCode,check.file,check.job,check.signedBlockSha256,check.executedBlockSha256,check.logSha256],
      ['PASS',0,F[name],JOBS[step.job],p.blocks[name].signedSha256,p.blocks[name].executedSha256,sha(files[F[name]])],'REAL_ORIGINAL_CHECK');
    need(start>=previous&&end>=start&&end<=Date.parse(b.steps[0].timing.endTime),'CHECK_EXECUTION_TIMING');previous=end;first[step.job]??=start;last[step.job]=end;
  }
  for(const name of Object.keys(JOBS))need(last[name]-(name==='source'?Date.parse(b.startTime):first[name])<=p.jobs[name].timeoutSeconds*1000,'CHECK_JOB_BUDGET');
  need(files[F.source].toString('utf8').includes('I66_PRIVILEGED_ROLE_SYNTHETIC_SOURCE_REGRESSION_PASS_NO_CUSTOMER_WRITES_NO_DEPLOY'),'REAL_SOURCE_MARKER');
  need(files[F.lineage].toString('utf8').includes('I66_APPROVED_ROLE_SOURCE_LINEAGE_GUARD_PASS_PREVIEW_AND_LIVE_STILL_PENDING'),'REAL_LINEAGE_MARKER');
  const availability=JSON.parse(files[F.availabilityReport]);eq([availability.result,availability.readOnly,availability.controlPlaneTransportAgree,availability.bothAnonymousHome200,availability.bothMarkersExact],['PASS',true,true,true,true],'REAL_AVAILABILITY_REPORT');
  need(sha40(availability.expectedSource)&&typeof availability.expectedBuild==='string'&&availability.expectedBuild.length>0,'AVAILABILITY_IDENTITY');
  eq(availability.checks?.map(r=>r.label),['CUSTOM','CUSTOM_MARKER','FIREBASE','FIREBASE_MARKER'],'AVAILABILITY_ORIGINS');
  for(const row of availability.checks){eq(row.status,200,'AVAILABILITY_HTTP');need(Array.isArray(row.dns)&&row.dns.length>0&&!row.error,'AVAILABILITY_DNS_TLS');if(row.label.endsWith('_MARKER'))eq([row.sourceSha,row.buildId],[availability.expectedSource,availability.expectedBuild],'AVAILABILITY_MARKERS');}
  need(files[F.regression].length>0&&files[F.summary].length>0,'ORIGINAL_REPORTS_PRESENT');
  return proof;
}
function gcloudReadIo(run=execFileSync){
  const json=args=>JSON.parse(run('gcloud',[...args,'--project='+C.projectId,'--format=json'],{encoding:'utf8',maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']}));
  const safe=name=>need(typeof name==='string'&&name.startsWith('i66/')&&/^[A-Za-z0-9_./-]+$/.test(name)&&!name.split('/').some(s=>!s||s==='.'||s==='..'),'READONLY_OBJECT_PATH');
  return {api:async url=>{need(url.startsWith(apiUrl(''))&&uuid(url.slice(apiUrl('').length)),'READONLY_BUILD_API');return json(['builds','describe',url.slice(apiUrl('').length),'--region='+C.region]);},
    metadata:async(name,gen)=>{safe(name);if(gen!==undefined)need(generation(gen),'EXACT_METADATA_GENERATION');return json(['storage','objects','describe','gs://'+C.bucket+'/'+name+(gen?'#'+gen:''),'--raw']);},
    bytes:async(name,gen)=>{safe(name);need(generation(gen),'EXACT_BYTES_GENERATION');return run('gcloud',['storage','cat','gs://'+C.bucket+'/'+name+'#'+gen,'--project='+C.projectId],{maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});}};
}
async function adcReadIo(GoogleAuth){
  need(typeof GoogleAuth==='function','ADC_SDK_REQUIRED');
  const client=await new GoogleAuth({projectId:C.projectId,scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
  const safe=name=>need(typeof name==='string'&&name.startsWith('i66/')&&/^[A-Za-z0-9_./-]+$/.test(name)&&!name.split('/').some(s=>!s||s==='.'||s==='..'),'READONLY_OBJECT_PATH');
  const read=async(url,responseType='json')=>(await client.request({url,method:'GET',responseType,timeout:60000})).data;
  const url=(name,gen,media)=>{
    safe(name);if(gen!==undefined)need(generation(gen),'EXACT_METADATA_GENERATION');
    if(media)need(generation(gen),'EXACT_BYTES_GENERATION');
    return 'https://storage.googleapis.com/storage/v1/b/'+C.bucket+'/o/'+encodeURIComponent(name)+(media?'?alt=media&generation='+gen:gen?'?generation='+gen:'');
  };
  return {api:async address=>{need(address.startsWith(apiUrl(''))&&uuid(address.slice(apiUrl('').length)),'READONLY_BUILD_API');return read(address);},
    metadata:(name,gen)=>read(url(name,gen,false)),bytes:async(name,gen)=>Buffer.from(await read(url(name,gen,true),'arraybuffer'))};
}
async function verify(p,id,out,io=gcloudReadIo()){
  validatePlan(p);need(uuid(id),'VERIFY_UUID');const b=await io.api(apiUrl(id));validateBuild(p,b);
  const base=prefix(p,id),manifestName=base+'artifacts-'+id+'.json',manifestGen=b.results.artifactManifest.split('#')[1];
  async function object(name,gen){
    const meta=await io.metadata(name,gen);
    eq([meta.bucket,meta.name],[C.bucket,name],'OBJECT_METADATA');need(generation(String(meta.generation)),'OBJECT_GENERATION');if(gen)eq(String(meta.generation),gen,'OBJECT_GENERATION_MATCH');
    need(Number.isSafeInteger(Number(meta.size))&&Number(meta.size)>0&&Number(meta.size)<=64*1024*1024,'OBJECT_SIZE_BOUND');
    need(!meta.acl?.some(a=>['allUsers','allAuthenticatedUsers'].includes(a.entity)),'PRIVATE_OBJECT');pkg.validateObjectTime(b,meta);
    const data=await io.bytes(name,String(meta.generation));eq(data.length,Number(meta.size),'OBJECT_BYTE_SIZE');
    return {data,meta,ref:{uri:'gs://'+C.bucket+'/'+name,generation:String(meta.generation),sha256:sha(data),bytes:data.length}};
  }
  const manifest=await object(manifestName,manifestGen),parsed=pkg.parseArtifactManifest(manifest.data),rows=Array.isArray(parsed)?parsed:parsed?.artifacts;
  need(Array.isArray(rows)&&rows.length===Object.keys(F).length,'NATIVE_MANIFEST_COUNT');
  const files={},objects={};
  for(const row of rows){
    const start='gs://'+C.bucket+'/'+base;need(row.location?.startsWith(start),'NATIVE_MANIFEST_PREFIX');
    const match=/^([^/#]+)#([1-9][0-9]{0,24})$/.exec(row.location.slice(start.length));
    need(match&&Object.values(F).includes(match[1])&&!files[match[1]],'NATIVE_MANIFEST_MEMBER');
    const item=await object(base+match[1],match[2]),md5=crypto.createHash('md5').update(item.data).digest();
    need([md5.toString('hex'),md5.toString('base64')].includes(pkg.nativeArtifactMd5(row)),'NATIVE_MANIFEST_HASH');
    if(item.meta.md5Hash)eq(item.meta.md5Hash,md5.toString('base64'),'NATIVE_OBJECT_HASH');
    files[match[1]]=item.data;objects[match[1]]=item.ref;
  }
  const proof=validateProof(p,b,JSON.parse(files[F.proof]),files);
  const logName=b.logsBucket.slice(('gs://'+C.bucket+'/').length).replace(/\/$/,'')+'/log-'+id+'.txt',logMeta=await io.metadata(logName);
  eq([logMeta.bucket,logMeta.name],[C.bucket,logName],'EXECUTION_LOG_LOCATION');need(generation(String(logMeta.generation)),'EXECUTION_LOG_GENERATION');
  const log=await io.bytes(logName,String(logMeta.generation));eq(log.length,Number(logMeta.size),'EXECUTION_LOG_SIZE');
  const marker='I66_NATIVE_SOURCE_QA_READY_FOR_PROVIDER_RETENTION ',lines=log.toString('utf8').split(/\r?\n/).filter(s=>s.includes(marker));
  eq(lines.length,1,'UNIQUE_EXECUTION_MARKER');
  eq(JSON.parse(lines[0].slice(lines[0].indexOf(marker)+marker.length)),{buildId:id,sourceQaHead:p.sourceQaHead,planSha256:digest(p),proofSha256:sha(files[F.proof]),scope:C.scope},'EXECUTION_LOG_PROOF_BINDING');
  const receipt={schema:C.receiptSchema,executionProvider:C.provider,scope:C.scope,status:'SOURCE_QA_AND_GUARD_VERIFIED_PREVIEW_LIVE_PENDING',
    buildId:id,sourceQaHead:p.sourceQaHead,sourceTreeSha:p.sourceTreeSha,mechanismSha:p.mechanismSha,planSha256:digest(p),workflows:p.workflows,jobs:p.jobs,
    cloudBuild:{name:b.name,status:b.status,serviceAccount:b.serviceAccount,metadataSha256:digest(b),stepImages:b.results.buildStepImages},
    manifest:manifest.ref,objects,log:{uri:'gs://'+C.bucket+'/'+logName,generation:String(logMeta.generation),sha256:sha(log),bytes:log.length},
    noDeploy:true,realBusinessWrites:0,fullI66ProductionAccepted:false};
  fs.mkdirSync(out,{recursive:false});write(path.join(out,'build.json'),b);write(path.join(out,'manifest.json'),manifest.data);
  for(const [name,data] of Object.entries(files))write(path.join(out,name),data);
  write(path.join(out,'execution.log'),log);write(path.join(out,'receipt.json'),receipt);return receipt;
}
function nativeSourceQaReference(request){
  const ref=request?.nativeSourceQa;
  need(ref&&request.version>35,'SUCCESSOR_SOURCE_QA_REFERENCE_REQUIRED');
  eq(Object.keys(ref).sort(),['schema','executionProvider','buildId','sourceQaHead','mechanismSha','planSha256','receiptPath','receiptBlob','receiptSha256'].sort(),'ADMISSION_REFERENCE_KEYS');
  eq([ref.schema,ref.executionProvider],['GI_I66_NATIVE_SOURCE_QA_REFERENCE_V1',C.provider],'ADMISSION_REFERENCE_KIND');
  need(uuid(ref.buildId)&&sha40(ref.sourceQaHead)&&sha40(ref.mechanismSha)&&sha64(ref.planSha256)&&sha40(ref.receiptBlob)&&sha64(ref.receiptSha256),'ADMISSION_REFERENCE_IDENTITIES');
  eq(ref.sourceQaHead,request.sourceQaHead,'ADMISSION_SOURCE_QA_HEAD');
  need(/^artifacts\/orbit360-recovery\/release-control\/I6_6_[A-Z0-9_]+\.json$/.test(ref.receiptPath),'ADMISSION_RECEIPT_PATH');
  need(!Object.hasOwn(request,'sourceQaRunId')&&!Object.hasOwn(request,'guardRunId'),'NO_MIXED_SOURCE_QA_PROVIDERS');
  return ref;
}
function sourcePlanFromBuild(b){
  const args=b.steps?.[0]?.args;
  need(Array.isArray(args)&&args.length===6&&args[0]==='-euo'&&args[1]==='pipefail'&&args[2]==='-c'&&args[4]==='--','ORIGINAL_SOURCE_WORKER');
  const p=JSON.parse(args[5]);validateBuild(p,b);return p;
}
async function verifySourceQaReference(request,{repo=process.cwd(),io=gcloudReadIo(),out}={}){
  const ref=nativeSourceQaReference(request),head=git(repo,'rev-parse','HEAD');
  git(repo,'merge-base','--is-ancestor',ref.sourceQaHead,ref.mechanismSha);
  git(repo,'merge-base','--is-ancestor',ref.mechanismSha,head);
  const raw=gitBytes(repo,head,ref.receiptPath);
  eq([blob(raw),sha(raw)],[ref.receiptBlob,ref.receiptSha256],'ADMISSION_RECEIPT_PIN');
  const retained=JSON.parse(raw),b=await io.api(apiUrl(ref.buildId)),p=sourcePlanFromBuild(b);
  eq([p.sourceQaHead,p.mechanismSha,digest(p)],[ref.sourceQaHead,ref.mechanismSha,ref.planSha256],'ADMISSION_EXACT_SOURCE_PLAN');
  for(const file of PINS){
    const original=gitBytes(repo,p.mechanismSha,file),current=gitBytes(repo,head,file);
    eq({blob:blob(original),sha256:sha(original)},p.pins[file],'ADMISSION_ORIGINAL_OWNER_PIN');
    eq(current,original,'ADMISSION_OWNER_CHANGED_SINCE_QA');
  }
  sourceContract(repo,p);
  need(typeof out==='string'&&out.length>0,'ADMISSION_OUTPUT_REQUIRED');
  const verified=await verify(p,ref.buildId,out,io);
  eq(verified,retained,'ADMISSION_PROVIDER_RECEIPT_DRIFT');
  return {...verified,retainedReceipt:{path:ref.receiptPath,gitBlobSha:ref.receiptBlob,sha256:ref.receiptSha256}};
}
function packagePlanFromBuild(b){
  const args=b.steps?.[0]?.args;need(Array.isArray(args)&&args.length===3&&args[0]===pkg.C.tool&&args[1]==='worker','ORIGINAL_PACKAGE_WORKER');
  const p=JSON.parse(args[2]);pkg.validateBuild(p,b);return p;
}
function readArchiveMarker(archive){
  const member='bundle/site/__recovery__/build.json';
  const names=execFileSync('tar',['-tzf',archive],{encoding:'utf8',maxBuffer:4*1024*1024}).trim().split(/\r?\n/);
  eq(names.filter(n=>n===member).length,1,'UNIQUE_ARCHIVE_MARKER');
  const type=execFileSync('tar',['-tvzf',archive,member],{encoding:'utf8',maxBuffer:65536}).trim();need(type.startsWith('-')&&!type.includes('\n'),'REGULAR_ARCHIVE_MARKER');
  return JSON.parse(execFileSync('tar',['-xOzf',archive,member],{encoding:'utf8',maxBuffer:1024*1024}));
}
async function verifyCurrentArtifact(current,{io=gcloudReadIo(),out,legacyApi,readMarker=readArchiveMarker}={}){
  const executionProvider=current?.executionProvider||'GITHUB_ACTIONS';
  if(executionProvider==='GITHUB_ACTIONS'){
    need(Number.isSafeInteger(current.artifactId)&&current.artifactId>0&&typeof legacyApi==='function','LEGACY_ACTIONS_ARTIFACT');
    const artifact=await legacyApi('artifacts/'+current.artifactId);
    eq([artifact.digest,artifact.workflow_run?.head_sha],[current.artifactDigest,current.sourceSha],'LEGACY_CURRENT_ARTIFACT');
    return {executionProvider,artifact};
  }
  eq(executionProvider,C.provider,'SUPPORTED_CURRENT_ARTIFACT_PROVIDER');
  const preview=require('./gravicentra-i6-6-cloud-build-preview.cjs');
  const identity=preview.artifactIdentity(current.sourceSha,current.buildRunId,current.artifactId,current.artifactDigest);
  const b=await io.api(apiUrl(identity.buildId)),packagePlan=packagePlanFromBuild(b);
  eq([packagePlan.sourceSha,packagePlan.requestVersion],[identity.sourceSha,identity.requestVersion],'CURRENT_PACKAGE_SOURCE_REQUEST');
  const name=identity.uri.slice(('gs://'+C.bucket+'/').length),meta=await io.metadata(name,identity.generation);
  eq([meta.bucket,meta.name,String(meta.generation)],[C.bucket,name,identity.generation],'CURRENT_ARTIFACT_METADATA');
  const artifact=preview.objectRef({uri:identity.uri,generation:identity.generation,sha256:identity.sha256,bytes:Number(meta.size)});
  need(typeof out==='string'&&out.length>0,'CURRENT_ARTIFACT_OUTPUT_REQUIRED');
  const evidence=await preview.readPackage({packagePlan,packageBuildId:identity.buildId,packageArtifact:artifact,sourceSha:identity.sourceSha},io,out);
  const marker=await readMarker(path.join(out,pkg.F.archive));eq([marker.sourceSha,marker.buildId],[current.sourceSha,current.buildId],'CURRENT_PRODUCT_BUILD_MARKER');
  return {executionProvider:C.provider,sourceSha:identity.sourceSha,buildRunId:identity.buildId,buildId:current.buildId,artifact,
    cloudBuild:{name:evidence.build.name,status:evidence.build.status,metadataSha256:digest(evidence.build)},manifest:evidence.manifest,log:evidence.log};
}
async function main(args=process.argv.slice(2)){
  if(args[0]==='prepare'&&args.length===3){
    const p=makePlan(process.cwd(),{sourceQaHead:args[1]});fs.mkdirSync(args[2],{recursive:false});
    write(path.join(args[2],'plan.json'),p);write(path.join(args[2],'cloudbuild.json'),configFor(p));
    console.log('I66_NATIVE_SOURCE_PREPARED_NO_PROVIDER_EXECUTION '+digest(p));return p;
  }
  if(args[0]==='worker'&&args.length===2)return worker(JSON.parse(args[1]));
  if(args[0]==='verify'&&args.length===4)return verify(JSON.parse(fs.readFileSync(args[1],'utf8')),args[2],args[3]);
  if(args[0]==='verify-current'&&args.length===3)return verifyCurrentArtifact(JSON.parse(fs.readFileSync(args[1],'utf8')),{out:args[2]});
  throw Error('I66_NATIVE_SOURCE_USE_PREPARE_SOURCE_SHA_OUT_OR_VERIFY_PLAN_REAL_UUID_OUT_OR_VERIFY_CURRENT_POINTER_OUT');
}
module.exports={C,JOBS,STEPS,F,PINS,jobSections,workflowContract,validatePlan,sourceContract,makePlan,prefix,configFor,validateBuild,workerIdentity,sdkReadBuild,jobBudgetMs,worker,validateProof,gcloudReadIo,adcReadIo,verify,nativeSourceQaReference,sourcePlanFromBuild,verifySourceQaReference,packagePlanFromBuild,readArchiveMarker,verifyCurrentArtifact,main};
if(require.main===module)main().catch(error=>{console.error(String(error.message).split('\n')[0]);process.exitCode=1;});
