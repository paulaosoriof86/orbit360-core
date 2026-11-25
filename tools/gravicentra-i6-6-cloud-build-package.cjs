'use strict';
// An explicit executor for the existing I6.6 PACKAGE gate. It never performs
// Preview, LIVE, function, Auth, Rules, IAM or business-data deployment/writes.
// Product, admission, preflight, builder and byte-verification code are read
// from the selected immutable request commit, not reconstructed here.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync,spawnSync}=require('node:child_process');
const C=Object.freeze({
  provider:'CLOUD_BUILD',repository:'paulaosoriof86/orbit360-core',
  repositoryUrl:'https://github.com/paulaosoriof86/orbit360-core.git',branch:'recovery/fase-a-clean-20260831',
  projectId:'ays-orbit-360-lab',projectNumber:'646761409743',region:'us-central1',
  serviceAccount:'646761409743-compute@developer.gserviceaccount.com',
  bucket:'ays-orbit360-firestore-private-backup-646761409743',
  tool:'tools/gravicentra-i6-6-cloud-build-package.cjs',
  test:'tools/gravicentra-i6-6-cloud-build-package.test.cjs',
  branding:'tools/gravicentra-i6-5-b1-branding-snapshot.mjs',
  brandingTest:'tools/gravicentra-i6-5-b1-branding-snapshot-adc.test.cjs',
  workflow:'.github/workflows/gravicentra-release-delta-66-package.yml',
  builder:'tools/gravicentra-i6-1-preview-package.mjs',
  admission:'tools/gravicentra-i6-6-frontend-preview-authority.cjs',
  transport:'artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json',
  manifest:'artifacts/orbit360-recovery/release-control/I6_6_APPROVED_PRODUCT_DELTA_MANIFEST_20261110.json',
  control:'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json',
  image:'node:22-bookworm',stepId:'i66-package-gates-and-build',
  scope:'PACKAGE_ONLY_PREVIEW_LIVE_AND_BACKEND_PENDING',
  planSchema:'GI_I66_CLOUD_BUILD_PACKAGE_PLAN_V1',proofSchema:'GI_I66_CLOUD_BUILD_PACKAGE_WORKER_V1',
  receiptSchema:'GI_I66_CLOUD_BUILD_IMMUTABLE_PACKAGE_RECEIPT_V1'
});
const N=Object.freeze({
  gate:'Certify insurer-source bulk preflight with isolated exceptions',
  source:'Verify latest I6.6 source and historical B4 seals without reopening B4',
  build:'Build a single immutable package from the exact I6.6 source and config snapshot',
  archive:'Preserve byte-exact package, digest and source identity for Preview then LIVE'
});
const F=Object.freeze({archive:'gi-i66-exact-package.tar.gz',digest:'gi-i66-exact-package.sha256',
  proof:'gi-i66-cloud-build-worker-proof.json',gate:'gi-i66-cloud-build-gate.log',
  source:'gi-i66-cloud-build-source.log',build:'gi-i66-cloud-build-package.log',mechanism:'gi-i66-cloud-build-mechanism.log',
  admission:'gi-i66-cloud-build-admission.json',summary:'gi-i66-cloud-build-summary.txt'});
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const blob=v=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(v)+'\0').update(v).digest('hex');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const digest=v=>sha(JSON.stringify(stable(v)));
const need=(value,code)=>assert.ok(value,'I66_CLOUD_BUILD_'+code);
const equal=(a,b,code)=>assert.deepEqual(a,b,'I66_CLOUD_BUILD_'+code);
const sha40=v=>/^[a-f0-9]{40}$/.test(v||'');
const sha64=v=>/^[a-f0-9]{64}$/.test(v||'');
const uuid=v=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v||'');
const generation=v=>/^[1-9][0-9]{0,24}$/.test(String(v||''));
const json=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const gitBytes=(cwd,ref,p)=>execFileSync('git',['show',ref+':'+p],{cwd,maxBuffer:64*1024*1024});
const write=(p,v)=>fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx',mode:0o600});
const roots=['orbit360-platform','functions','firebase.json','storage.rules','firestore.rules','database.rules.json',C.builder,':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json'];

function runBlock(text,name){
  const start='      - name: '+name+'\n';
  equal(text.split(start).length,2,'WORKFLOW_STEP_MISSING_OR_DUPLICATED');
  const tail=text.split(start)[1].split(/^      - /m)[0];
  const match=tail.match(/^        run: \|\n([\s\S]*)$/m);
  need(match,'WORKFLOW_LITERAL_RUN_REQUIRED');
  const lines=match[1].replace(/\n+$/,'').split('\n');
  need(lines.every(line=>line===''||line.startsWith('          ')),'WORKFLOW_RUN_INDENT');
  return lines.map(line=>line.slice(10)).join('\n')+'\n';
}
function workflowBlocks(text){
  const blocks=Object.fromEntries(Object.entries(N).map(([k,n])=>[k,runBlock(text,n)]));
  need(blocks.source.includes('node tools/gravicentra-governance-preflight-v1.mjs --mode=i6'),'GOVERNANCE_GATE_REQUIRED');
  need(blocks.build.includes('I66_MANIFEST_EXACT_BUILD_BOUND_INDEX_PWA_AND_TENANT_ICONS_PASS'),'PRODUCT_BYTE_GATE_REQUIRED');
  need(blocks.build.includes('I66_PACKAGE_BUILD_AFTER_SOURCE_MUTATION'),'POST_BUILD_SOURCE_GATE_REQUIRED');
  for(const block of Object.values(blocks))need(!/(?:hosting:|firebase deploy|functions:delete|gcloud\s|gsutil\s)/.test(block),'PACKAGE_ONLY_COMMAND_BOUNDARY');
  return blocks;
}
function runtimeBlocks(blocks){
  const command='node '+C.branding+' "$RUNNER_TEMP/gi-i66-branding.json"';
  equal(blocks.build.split(command).length,2,'EXACT_BRANDING_READER_SUBSTITUTION_REQUIRED');
  equal((blocks.archive.match(/\$GITHUB_STEP_SUMMARY/g)||[]).length,2,'EXACT_SUMMARY_ONLY_SUBSTITUTION_REQUIRED');
  const out={...blocks,
    build:blocks.build.replace(command,'node "$I66_BRANDING_READER" "$RUNNER_TEMP/gi-i66-branding.json"'),
    archive:blocks.archive.replaceAll('$GITHUB_STEP_SUMMARY','$I66_PACKAGE_SUMMARY')};
  for(const text of Object.values(out))need(!/\$\{?GITHUB_/.test(text),'NO_GITHUB_RUNTIME_IMPERSONATION');
  return out;
}
function validatePlan(p){
  equal(p.schema,C.planSchema,'PLAN_SCHEMA');equal(p.provider,C.provider,'PROVIDER');equal(p.scope,C.scope,'PACKAGE_ONLY');
  equal(p.repository,C.repository,'REPOSITORY');equal(p.branch,C.branch,'BRANCH');
  equal(p.projectId,C.projectId,'PROJECT');equal(p.projectNumber,C.projectNumber,'PROJECT_NUMBER');
  equal(p.region,C.region,'REGION');equal(p.serviceAccount,C.serviceAccount,'SERVICE_ACCOUNT');equal(p.bucket,C.bucket,'BUCKET');
  need(sha40(p.mechanismSha)&&sha40(p.sourceSha)&&sha40(p.sourceTreeSha),'EXACT_GIT_SOURCES_REQUIRED');
  need(Number.isSafeInteger(p.requestVersion)&&p.requestVersion>0,'REQUEST_VERSION');
  need(sha40(p.transportBlob)&&sha40(p.manifestBlob)&&sha64(p.requestSha256),'SEALED_REQUEST');
  equal(Object.keys(p.sourceQa||{}).sort(),['guardRunId','headSha','runId'],'SOURCE_QA_KEYS');
  need(sha40(p.sourceQa.headSha)&&Number.isSafeInteger(p.sourceQa.runId)&&p.sourceQa.runId>0&&Number.isSafeInteger(p.sourceQa.guardRunId)&&p.sourceQa.guardRunId>0,'SOURCE_QA');
  equal(Object.keys(p.pins||{}).sort(),[C.tool,C.test,C.branding,C.brandingTest].sort(),'MECHANISM_PIN_SCOPE');
  for(const pin of Object.values(p.pins)){need(sha40(pin.blob)&&sha64(pin.sha256),'MECHANISM_PIN');equal(Object.keys(pin).sort(),['blob','sha256'],'MECHANISM_PIN_KEYS');}
  need(sha40(p.workflowBlob)&&sha64(p.workflowSha256)&&sha40(p.builderBlob),'ORIGINAL_WORKFLOW_BUILDER_PINS');
  equal(Object.keys(p.blocks||{}).sort(),Object.keys(N).sort(),'EXACT_GATE_BLOCKS');
  for(const value of Object.values(p.blocks))need(sha64(value),'GATE_BLOCK_PIN');
  const old=p.unexecutedGithubBuild;
  equal(Object.keys(old||{}).sort(),['attempt','runId'],'GITHUB_FAILURE_BINDING_KEYS');
  need(Number.isSafeInteger(old.runId)&&old.runId>0&&Number.isSafeInteger(old.attempt)&&old.attempt>0,'GITHUB_FAILURE_BINDING');
  equal(p.noDeploy,true,'NO_DEPLOY_REQUIRED');equal(p.realBusinessWrites,0,'NO_BUSINESS_WRITE_REQUIRED');
  equal(p.fullI66ProductionAccepted,false,'NO_ACCEPTANCE_CLAIM');
  equal(Object.keys(p).sort(),['schema','provider','scope','repository','branch','projectId','projectNumber','region','serviceAccount','bucket','mechanismSha','sourceSha','sourceTreeSha','requestVersion','transportBlob','manifestBlob','requestSha256','sourceQa','pins','workflowBlob','workflowSha256','builderBlob','blocks','unexecutedGithubBuild','noDeploy','realBusinessWrites','fullI66ProductionAccepted'].sort(),'PLAN_UNKNOWN_FIELD');
  return p;
}
function makePlan(repo,{sourceSha,mechanismSha=git(repo,'rev-parse','HEAD'),githubRunId,githubAttempt}){
  need(sha40(sourceSha)&&sha40(mechanismSha),'PLAN_EXACT_SOURCES');
  equal(git(repo,'status','--porcelain','--untracked-files=no'),'','CLEAN_MECHANISM_CHECKOUT_REQUIRED');
  equal(git(repo,'rev-parse','HEAD'),mechanismSha,'MECHANISM_HEAD');
  git(repo,'merge-base','--is-ancestor',sourceSha,mechanismSha);
  equal(git(repo,'diff','--name-only',sourceSha,mechanismSha,'--',...roots),'','PRODUCT_SOURCE_DRIFT');
  const transportBytes=gitBytes(repo,sourceSha,C.transport),transport=JSON.parse(transportBytes);
  const request=transport.frontendPreviewRequest;
  need(request,'REQUEST_MISSING');
  equal(gitBytes(repo,mechanismSha,C.transport),transportBytes,'FROZEN_TRANSPORT_CHANGED');
  equal(git(repo,'rev-parse',mechanismSha+':'+C.manifest),request.manifestBlob,'MANIFEST_CHANGED');
  const previous=JSON.parse(gitBytes(repo,sourceSha+'^',C.transport));
  equal(request.version,(previous.frontendPreviewRequest?.version||0)+1,'SOURCE_IS_NOT_REQUEST_TRANSITION');
  const workflow=gitBytes(repo,sourceSha,C.workflow),blocks=workflowBlocks(workflow.toString('utf8'));
  runtimeBlocks(blocks);
  const pins=Object.fromEntries([C.tool,C.test,C.branding,C.brandingTest].map(p=>{const bytes=gitBytes(repo,mechanismSha,p);equal(fs.readFileSync(path.join(repo,p)),bytes,'MECHANISM_WORKTREE_DRIFT');return[p,{blob:blob(bytes),sha256:sha(bytes)}];}));
  return validatePlan({schema:C.planSchema,provider:C.provider,scope:C.scope,repository:C.repository,branch:C.branch,
    projectId:C.projectId,projectNumber:C.projectNumber,region:C.region,serviceAccount:C.serviceAccount,bucket:C.bucket,
    mechanismSha,sourceSha,sourceTreeSha:git(repo,'rev-parse',sourceSha+'^{tree}'),requestVersion:request.version,
    transportBlob:blob(transportBytes),manifestBlob:request.manifestBlob,requestSha256:digest(request),
    sourceQa:{headSha:request.sourceQaHead,runId:request.sourceQaRunId,guardRunId:request.guardRunId},pins,
    workflowBlob:blob(workflow),workflowSha256:sha(workflow),builderBlob:git(repo,'rev-parse',sourceSha+':'+C.builder),
    blocks:Object.fromEntries(Object.entries(blocks).map(([k,v])=>[k,sha(v)])),
    unexecutedGithubBuild:{runId:githubRunId,attempt:githubAttempt},noDeploy:true,realBusinessWrites:0,fullI66ProductionAccepted:false});
}
function artifactPrefix(p,id){need(uuid(id)||id==='$BUILD_ID','BUILD_UUID');return 'i66/packages/request-'+p.requestVersion+'/'+p.sourceSha+'/'+id+'/';}
function lockName(p){return 'i66/package-locks/request-'+p.requestVersion+'-'+p.sourceSha+'.json';}
function configFor(p){
  validatePlan(p);
  return {steps:[{id:C.stepId,name:C.image,entrypoint:'node',args:[C.tool,'worker',JSON.stringify(p)],
    env:['GRAVICENTRA_BUILD_PROVIDER=$_I66_PROVIDER','GRAVICENTRA_CLOUD_BUILD_ID=$BUILD_ID','GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT='+C.serviceAccount,
      'I66_PRODUCT_SOURCE_SHA=$_I66_SOURCE_SHA','I66_MECHANISM_SOURCE_SHA=$_I66_MECHANISM_SHA','I66_REQUEST_VERSION=$_I66_REQUEST_VERSION',
      'PROJECT_ID='+C.projectId,'TENANT_HINT=alianzas-soluciones']}],
    serviceAccount:'projects/'+C.projectId+'/serviceAccounts/'+C.serviceAccount,
    timeout:'1800s',logsBucket:'gs://'+C.bucket+'/i66/cloud-build-logs',
    options:{logging:'GCS_ONLY',sourceProvenanceHash:['SHA256'],machineType:'E2_STANDARD_2'},
    substitutions:{_I66_PROVIDER:C.provider,_I66_SOURCE_SHA:p.sourceSha,_I66_MECHANISM_SHA:p.mechanismSha,_I66_REQUEST_VERSION:String(p.requestVersion)},
    tags:['i66-package-only','i66-request-'+p.requestVersion],
    artifacts:{objects:{location:'gs://'+C.bucket+'/'+artifactPrefix(p,'$BUILD_ID'),paths:Object.values(F)}}};
}
function validateBuild(p,b,{finished=true}={}){
  validatePlan(p);need(uuid(b.id),'REAL_BUILD_UUID');
  need([C.projectNumber,C.projectId].some(project=>b.name==='projects/'+project+'/locations/'+C.region+'/builds/'+b.id),'BUILD_RESOURCE_NAME');
  equal(b.projectId,C.projectId,'BUILD_PROJECT');equal(b.status,finished?'SUCCESS':'WORKING','BUILD_STATUS');
  const cfg=configFor(p);
  equal(b.serviceAccount,cfg.serviceAccount,'BUILD_SERVICE_ACCOUNT');equal(b.logsBucket,cfg.logsBucket,'BUILD_LOG_BUCKET');
  for(const key of ['timeout','substitutions','tags'])equal(b[key],cfg[key],'BUILD_CONFIG_'+key);
  equal(b.options?.logging,'GCS_ONLY','BUILD_LOGGING');equal(b.options?.sourceProvenanceHash,['SHA256'],'BUILD_SOURCE_HASH');
  need(!b.options?.pool?.name&&!b.options?.workerPool,'NO_UNREVIEWED_PRIVATE_POOL');
  equal(b.options?.machineType,'E2_STANDARD_2','DEFAULT_POOL_MACHINE_REQUIRED');
  for(const key of ['env','secretEnv','volumes'])need(!b.options?.[key]?.length,'NO_GLOBAL_OVERRIDE_'+key);
  need(!b.options?.automapSubstitutions&&!b.options?.dynamicSubstitutions,'NO_IMPLICIT_ENV_SUBSTITUTIONS');
  need(!b.secrets?.length&&!b.availableSecrets,'NO_SECRET_EXPORT');
  need(!b.dependencies?.length&&!b.images?.length&&!b.gitConfig&&!b.buildTriggerId,'NO_EXTRA_EXECUTOR_SCOPE');
  equal(b.source?.gitSource?.url,C.repositoryUrl,'BUILD_SOURCE_REPOSITORY');equal(b.source.gitSource.revision,p.mechanismSha,'BUILD_MECHANISM_SOURCE');
  equal(Object.keys(b.source),['gitSource'],'EXACT_SOURCE_KIND');need(!b.source.gitSource.dir,'EXACT_SOURCE_ROOT');
  const resolved=b.sourceProvenance?.resolvedGitSource;
  if(finished){equal(resolved?.url,C.repositoryUrl,'RESOLVED_SOURCE_REPOSITORY');equal(resolved.revision,p.mechanismSha,'RESOLVED_SOURCE_REVISION');}
  else if(resolved){equal(resolved.url,C.repositoryUrl,'RESOLVED_SOURCE_REPOSITORY');equal(resolved.revision,p.mechanismSha,'RESOLVED_SOURCE_REVISION');}
  equal(b.steps?.length,1,'EXACT_EXECUTED_STEP_SCOPE');
  const s=b.steps[0],expected=cfg.steps[0];
  for(const key of ['id','name','entrypoint','args'])equal(s[key],expected[key],'STEP_'+key);
  const expectedEnv=expected.env.map(v=>v.replace(/\$([A-Z_][A-Z0-9_]*)/g,(all,key)=>key==='BUILD_ID'?b.id:cfg.substitutions[key]??all));
  need(JSON.stringify(s.env)===JSON.stringify(expectedEnv)||JSON.stringify(s.env)===JSON.stringify(expected.env),'STEP_ENV');
  need(!s.allowFailure&&!s.allowExitCodes?.length&&!s.script&&!s.secretEnv?.length&&!s.dir&&!s.volumes?.length,'NO_STEP_BYPASS');
  const expectedLocation=cfg.artifacts.objects.location.replace('$BUILD_ID',b.id);
  equal(Object.keys(b.artifacts||{}),['objects'],'NO_EXTRA_ARTIFACT_PUBLISHER');
  need([cfg.artifacts.objects.location,expectedLocation].includes(b.artifacts?.objects?.location),'ARTIFACT_LOCATION');
  equal(b.artifacts.objects.paths,Object.values(F),'EXACT_ARTIFACT_MEMBERS');
  need(Number.isFinite(Date.parse(b.createTime))&&Number.isFinite(Date.parse(b.startTime)),'BUILD_TIMES');
  if(finished){
    equal(s.status,'SUCCESS','STEP_EXECUTED_SUCCESS');equal(b.results?.buildStepImages?.length,1,'REAL_STEP_IMAGE_COUNT');
    need(/^sha256:[a-f0-9]{64}$/.test(b.results.buildStepImages[0]),'REAL_STEP_IMAGE_DIGEST');
    need(Number.isFinite(Date.parse(s.timing?.startTime))&&Date.parse(s.timing.endTime)>Date.parse(s.timing.startTime),'STEP_EXECUTED_TIMING');
    need(Date.parse(b.finishTime)>=Date.parse(s.timing.endTime),'BUILD_FINISH_TIMING');
    equal(String(b.results.numArtifacts),String(Object.keys(F).length),'ARTIFACT_COUNT');
    const manifestUri=expectedLocation+'artifacts-'+b.id+'.json';
    need(b.results.artifactManifest===manifestUri||new RegExp('^'+manifestUri.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'#[1-9][0-9]{0,24}$').test(b.results.artifactManifest||''),'REAL_ARTIFACT_MANIFEST');
    need(typeof b.logUrl==='string'&&b.logUrl.startsWith('https://console.cloud.google.com/')&&b.logUrl.includes(b.id)&&[C.projectId,C.projectNumber].some(p=>b.logUrl.includes(p)),'REAL_BUILD_LOG_URL');
  }
  return b;
}
function validateOriginalFailure(p,run,jobs,artifacts){
  equal([run.id,run.run_attempt,run.head_sha,run.head_branch,run.path,run.status,run.conclusion],
    [p.unexecutedGithubBuild.runId,p.unexecutedGithubBuild.attempt,p.sourceSha,C.branch,C.workflow,'completed','failure'],'UNEXECUTED_GITHUB_RUN_CHANGED');
  equal(artifacts.total_count,0,'PREEXISTING_PACKAGE_FORBIDS_REBUILD');equal(artifacts.artifacts,[],'PREEXISTING_ARTIFACT');
  need(Array.isArray(jobs.jobs)&&jobs.jobs.length>0,'GITHUB_JOBS_REQUIRED');
  const gate=jobs.jobs.find(j=>j.name==='gate'),pack=jobs.jobs.find(j=>j.name==='immutable-package');
  need(gate&&pack,'ORIGINAL_PACKAGE_JOBS');
  equal([gate.conclusion,pack.conclusion],['failure','skipped'],'ORIGINAL_FAILURE_NOT_PRE_EXECUTION');
  for(const j of jobs.jobs){equal(j.run_id,run.id,'ORIGINAL_JOB_RUN');equal(j.status,'completed','ORIGINAL_JOB_STATUS');equal(j.steps,[],'ORIGINAL_JOB_ALREADY_EXECUTED');need(['failure','skipped'].includes(j.conclusion),'ORIGINAL_JOB_CONCLUSION');}
  return true;
}
function validateObject(p,id,metadata,name){
  equal(metadata.bucket,C.bucket,'OBJECT_BUCKET');equal(metadata.name,artifactPrefix(p,id)+name,'OBJECT_PATH');
  need(generation(metadata.generation),'OBJECT_GENERATION_REQUIRED');need(Number(metadata.size)>0,'NONEMPTY_OBJECT_REQUIRED');
  need(Number.isFinite(Date.parse(metadata.timeCreated)),'OBJECT_CREATED_TIME');
  need(!metadata.acl?.some(a=>['allUsers','allAuthenticatedUsers'].includes(a.entity)),'PRIVATE_ARTIFACT_REQUIRED');
  return metadata;
}
function validateObjectTime(b,metadata){
  need(Date.parse(metadata.timeCreated)>=Date.parse(b.startTime)&&Date.parse(metadata.timeCreated)<=Date.parse(b.finishTime),'ARTIFACT_FROM_CURRENT_BUILD');
}
function parseArtifactManifest(bytes){
  const text=bytes.toString('utf8').trim();need(text,'NONEMPTY_ARTIFACT_MANIFEST');
  try{return JSON.parse(text);}catch{
    // Some provider writers emit one complete JSON object per line. Every line
    // must parse, and the same exact member/generation/hash rules apply.
    const lines=text.split(/\r?\n/);need(lines.length>1&&lines.every(line=>line.trim()),'ARTIFACT_MANIFEST_ENCODING');
    return lines.map(line=>JSON.parse(line));
  }
}
function nativeArtifactMd5(row){
  const keys=['file_hash','fileHash'].filter(key=>row[key]!==undefined);
  equal(keys.length,1,'ONE_NATIVE_HASH_FIELD_REQUIRED');
  let value=row[keys[0]];
  // ArtifactResult -> repeated FileHashes -> repeated Hash is the provider's
  // documented schema. Its serializers use snake_case or camelCase. Retain
  // support for the flat Hash form, but never merge ambiguous/multiple hashes.
  for(let depth=0;depth<3;depth++){
    const entries=Array.isArray(value)?value:[value];equal(entries.length,1,'ONE_NATIVE_MD5_REQUIRED');
    const item=entries[0];need(item&&typeof item==='object','NATIVE_HASH_OBJECT_REQUIRED');
    if(item.type!==undefined||item.value!==undefined){
      equal(Object.keys(item).sort(),['type','value'],'NATIVE_HASH_KEYS');
      need([2,'MD5'].includes(item.type)&&typeof item.value==='string','NATIVE_ARTIFACT_HASH_REQUIRED');
      if(/^[a-f0-9]{32}$/.test(item.value))return item.value;
      // The actual Cloud Build manifest serializes its bytes value as base64
      // around the ASCII base64 MD5. Decode exactly one such wrapper; the
      // resulting 16-byte digest must retain a canonical base64 round trip.
      const md5=/^[A-Za-z0-9+/]{32}$/.test(item.value)?Buffer.from(item.value,'base64').toString('utf8'):item.value;
      need(/^[A-Za-z0-9+/]{22}==$/.test(md5)&&Buffer.from(md5,'base64').length===16&&Buffer.from(md5,'base64').toString('base64')===md5,'NATIVE_MD5_ENCODING');return md5;
    }
    const inner=['file_hash','fileHash'].filter(key=>item[key]!==undefined);
    equal(inner.length,1,'ONE_NATIVE_HASH_WRAPPER');equal(Object.keys(item),inner,'NATIVE_HASH_WRAPPER_KEYS');value=item[inner[0]];
  }
  throw Error('I66_CLOUD_BUILD_NATIVE_HASH_DEPTH');
}
function artifactRows(p,id,manifest){
  const rows=Array.isArray(manifest)?manifest:manifest?.artifacts;
  need(Array.isArray(rows),'GCS_ARTIFACT_MANIFEST_REQUIRED');equal(rows.length,Object.keys(F).length,'ARTIFACT_MANIFEST_COUNT');
  const out=new Map();
  for(const row of rows){
    need(typeof row.location==='string','ARTIFACT_GENERATION_URI');
    const prefix='gs://'+C.bucket+'/'+artifactPrefix(p,id);
    need(row.location.startsWith(prefix),'ARTIFACT_MANIFEST_PREFIX');
    const match=row.location.slice(prefix.length).match(/^([^/#]+)#([1-9][0-9]{0,24})$/);
    need(match&&Object.values(F).includes(match[1])&&!out.has(match[1]),'ARTIFACT_MEMBER_DUPLICATE_OR_UNKNOWN');
    out.set(match[1],{generation:match[2],uri:row.location,md5:nativeArtifactMd5(row)});
  }
  equal([...out.keys()].sort(),Object.values(F).sort(),'ARTIFACT_MEMBERS_EXACT');return out;
}
function validateWorkerProof(p,b,proof,files,objects){
  equal(proof.schema,C.proofSchema,'WORKER_PROOF_SCHEMA');equal(proof.provider,C.provider,'WORKER_PROVIDER');equal(proof.scope,C.scope,'WORKER_SCOPE');
  equal(proof.buildId,b.id,'WORKER_BUILD_ID');equal(proof.planSha256,digest(p),'WORKER_PLAN');equal(proof.sourceSha,p.sourceSha,'WORKER_SOURCE');
  equal(proof.mechanismSha,p.mechanismSha,'WORKER_MECHANISM');equal(proof.sourceTreeSha,p.sourceTreeSha,'WORKER_SOURCE_TREE');
  equal(proof.serviceAccount,C.serviceAccount,'WORKER_PRINCIPAL');equal(proof.requestVersion,p.requestVersion,'WORKER_REQUEST');
  equal(proof.status,'PACKAGE_BUILT_NO_DEPLOY','WORKER_STATUS');equal(proof.fullI66ProductionAccepted,false,'NO_ACCEPTANCE_OVERCLAIM');
  equal(proof.deployments,{preview:0,live:0,functions:0},'NO_DEPLOY_OVERCLAIM');equal(proof.businessWrites,0,'NO_WRITE_OVERCLAIM');
  equal(Object.keys(proof.checks||{}).sort(),['admission','mechanism','gate','source','build','archive'].sort(),'ALL_PACKAGE_GATES_REQUIRED');
  for(const [name,check] of Object.entries(proof.checks)){
    equal(check.file,name==='archive'?F.build:F[name],'CHECK_EXACT_LOG_'+name);
    equal(check.status,'PASS','REAL_CHECK_PASS_'+name);equal(check.exitCode,0,'REAL_CHECK_EXIT_'+name);
    need(Date.parse(check.endedAt)>=Date.parse(check.startedAt),'REAL_CHECK_TIME_'+name);
    equal(check.logSha256,sha(files[check.file]),'CHECK_LOG_BYTES_'+name);
    if(name!=='admission'&&name!=='mechanism')equal(check.signedBlockSha256,p.blocks[name],'SIGNED_BLOCK_'+name);
    if(name==='mechanism')equal(check.tests,[{path:C.test,...p.pins[C.test]},{path:C.brandingTest,...p.pins[C.brandingTest]}],'EXACT_MECHANISM_TESTS');
  }
  equal(proof.archiveSha256,sha(files[F.archive]),'ARCHIVE_SHA256');
  need(files[F.digest].toString('utf8').startsWith(proof.archiveSha256+'  '),'SHA256_SIDECAR');
  equal(proof.archiveBytes,files[F.archive].length,'ARCHIVE_SIZE');
  for(const marker of ['I66_MANIFEST_EXACT_BUILD_BOUND_INDEX_PWA_AND_TENANT_ICONS_PASS','I66_BUILD_ONE_SOURCE_ONE_ARTIFACT_NO_DEPLOY_PASS'])need(files[F.build].toString('utf8').includes(marker),'EXACT_PACKAGE_LOG_REQUIRED');
  const admission=JSON.parse(files[F.admission]);equal(admission.eligible,true,'ADMISSION_TRUE_REQUIRED');equal(admission.sourceSha,p.sourceSha,'ADMISSION_SOURCE');
  need(admission.apiReads?.length>=5&&admission.markers?.length===2,'ADMISSION_REAL_READBACKS_REQUIRED');
  equal(proof.lock.bucket,C.bucket,'BUILD_LOCK_BUCKET');equal(proof.lock.name,lockName(p),'BUILD_LOCK_NAME');need(generation(proof.lock.generation),'BUILD_LOCK_GENERATION');
  for(const [name,meta] of Object.entries(objects)){equal(Number(meta.size),files[name].length,'OBJECT_BYTE_SIZE');validateObjectTime(b,meta);}
  return true;
}
function validateExecutionLog(p,b,proof,bytes){
  const prefix='I66_CLOUD_BUILD_PACKAGE_READY_FOR_PROVIDER_RETENTION ';
  const lines=bytes.toString('utf8').split(/\r?\n/).filter(line=>line.includes(prefix));
  equal(lines.length,1,'UNIQUE_REAL_EXECUTION_MARKER');
  const marker=JSON.parse(lines[0].slice(lines[0].indexOf(prefix)+prefix.length));
  equal(marker,{buildId:b.id,sourceSha:p.sourceSha,archiveSha256:proof.archiveSha256,scope:C.scope},'EXECUTION_LOG_ARCHIVE_BINDING');
  return marker;
}

const TRANSIENT_READ_CODES=new Set(['ECONNRESET','ECONNREFUSED','EPIPE','ETIMEDOUT','EAI_AGAIN','ENETUNREACH','EHOSTUNREACH',
  'UND_ERR_SOCKET','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','REQUEST_TIMEOUT']);
const TERMINAL_REQUEST_CODES=new Set(['ENOTFOUND','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID','ERR_INVALID_URL','UND_ERR_INVALID_ARG']);
const REQUEST_CONTEXTS=new Set(['PROVIDER_JSON','CLOUD_BUILD_METADATA','GITHUB_RUN','GITHUB_JOBS','GITHUB_ARTIFACTS','GITHUB_ACTIONS_READ',
  'HOSTING_BUILD_MARKER','METADATA_PROJECT','METADATA_PROJECT_NUMBER','METADATA_PRINCIPAL','METADATA_TOKEN','PACKAGE_CLAIM_CREATE']);
function requestCauseCode(error){
  // Never expose an exception message, URL, request options or nested provider
  // response. Only known transport codes may leave this boundary.
  const candidates=[error?.code,error?.cause?.code,...[].concat(error?.cause?.errors||[]).slice(0,4).map(x=>x?.code)];
  const code=candidates.find(value=>TRANSIENT_READ_CODES.has(value)||TERMINAL_REQUEST_CODES.has(value));
  if(code)return code;
  if(error?.name==='TimeoutError')return 'REQUEST_TIMEOUT';
  if(error?.name==='SyntaxError')return 'INVALID_JSON';
  return 'UNCLASSIFIED_TRANSPORT_ERROR';
}
async function providerRequest(url,options={},context={}){
  const method=String(options.method||'GET').toUpperCase(),hostname=new URL(url).hostname;
  const operation=REQUEST_CONTEXTS.has(context.operation)?context.operation:'PROVIDER_JSON';
  const fetcher=context.fetch||globalThis.fetch,emit=context.emit||console.error;
  const pause=context.pause||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
  const attempts=method==='GET'?3:1;
  for(let attempt=1;attempt<=attempts;attempt++){
    let httpStatus=null,code;
    try{
      const response=await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(context.timeoutMs||45000)});
      httpStatus=response.status;
      if(!response.ok){code='HTTP_STATUS';throw Error('HTTP_STATUS');}
      if(context.metadata&&(response.redirected===true||response.headers?.get('metadata-flavor')!=='Google')){
        code='AUTHENTIC_METADATA_REQUIRED';throw Error('AUTHENTIC_METADATA_REQUIRED');
      }
      return await (context.format==='text'?response.text():response.json());
    }catch(error){
      code=code||requestCauseCode(error);
      // Only an idempotent GET with an explicit transient transport cause can
      // retry. HTTP denials/statuses, parse failures and the conditional claim
      // POST remain single-attempt failures, even after a lost response.
      const retry=method==='GET'&&TRANSIENT_READ_CODES.has(code)&&attempt<attempts;
      emit('I66_CLOUD_BUILD_PROVIDER_REQUEST_FAILURE '+JSON.stringify({operation,method,hostname,attempt,
        httpStatus:Number.isInteger(httpStatus)&&httpStatus>=100&&httpStatus<=599?httpStatus:null,causeCode:code,retry}));
      if(!retry)throw Error('I66_CLOUD_BUILD_REQUEST_FAILED_'+operation+'_'+method+'_'+hostname+'_'+code+(httpStatus?'_'+httpStatus:''));
      await pause(attempt===1?250:1000);
    }
  }
}
async function requestJson(url,options={},context={}){
  return providerRequest(url,options,{...context,format:'json'});
}
async function workerIdentity(env=process.env,requestContext={}){
  equal(env.GRAVICENTRA_BUILD_PROVIDER,C.provider,'RUNTIME_PROVIDER');need(uuid(env.GRAVICENTRA_CLOUD_BUILD_ID),'RUNTIME_UUID');
  equal(env.GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT,C.serviceAccount,'RUNTIME_SA');
  for(const name of Object.keys(env))if(name.startsWith('GITHUB_')||['GOOGLE_APPLICATION_CREDENTIALS','CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE','GCE_METADATA_HOST','GCE_METADATA_IP','GCE_METADATA_ROOT','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','STORAGE_EMULATOR_HOST'].includes(name))need(!env[name],'NO_FAKE_OR_OVERRIDDEN_IDENTITY_'+name);
  const base='http://metadata.google.internal/computeMetadata/v1/';
  async function metadata(suffix,asJson=false){
    const operation={'project/project-id':'METADATA_PROJECT','project/numeric-project-id':'METADATA_PROJECT_NUMBER',
      'instance/service-accounts/default/email':'METADATA_PRINCIPAL','instance/service-accounts/default/token':'METADATA_TOKEN'}[suffix];
    return providerRequest(base+suffix,{headers:{'Metadata-Flavor':'Google'}},
      {...requestContext,operation,metadata:true,timeoutMs:10000,format:asJson?'json':'text'});
  }
  equal((await metadata('project/project-id')).trim(),C.projectId,'METADATA_PROJECT');
  equal((await metadata('project/numeric-project-id')).trim(),C.projectNumber,'METADATA_PROJECT_NUMBER');
  equal((await metadata('instance/service-accounts/default/email')).trim(),C.serviceAccount,'METADATA_PRINCIPAL');
  const token=await metadata('instance/service-accounts/default/token',true);
  need(token.token_type==='Bearer'&&typeof token.access_token==='string'&&token.access_token.length>20,'METADATA_ADC_TOKEN');
  // Access tokens are used only in memory for the same project's provider APIs.
  return {buildId:env.GRAVICENTRA_CLOUD_BUILD_ID,headers:{Authorization:'Bearer '+token.access_token}};
}
function execLogged(command,args,{cwd,env,log,append=false}){
  const fd=fs.openSync(log,append?'a':'wx',0o600),startedAt=new Date().toISOString();
  let result;
  try{result=spawnSync(command,args,{cwd,env,stdio:['ignore',fd,fd],timeout:1700000});}finally{fs.closeSync(fd);}
  if(result.error||result.status!==0){
    // Native artifacts upload only on success. Preserve the causal check tail
    // in the provider's private log even when no artifact is retained. This
    // prints only this check's output, never its environment or credentials.
    const tail=fs.readFileSync(log).subarray(-16384).toString('utf8').split(/\r?\n/).slice(-200).join('\n');
    console.error('I66_CLOUD_BUILD_CHECK_FAILED '+JSON.stringify({file:path.basename(log),exitCode:result.status,signal:result.signal||null}));
    process.stderr.write(tail+'\n');
    const error=new Error('I66_CLOUD_BUILD_COMMAND_FAILED_'+path.basename(log));
    error.exitCode=Number.isInteger(result.status)&&result.status>0?result.status:1;
    error.signal=result.signal||null;throw error;
  }
  return {status:'PASS',exitCode:0,startedAt,endedAt:new Date().toISOString()};
}
async function worker(p){
  validatePlan(p);need(process.versions.node.split('.')[0]==='22','NODE_22_REQUIRED');
  equal([process.env.I66_PRODUCT_SOURCE_SHA,process.env.I66_MECHANISM_SOURCE_SHA,process.env.I66_REQUEST_VERSION],[p.sourceSha,p.mechanismSha,String(p.requestVersion)],'RUNTIME_SOURCE_SUBSTITUTIONS');
  const root=process.cwd(),identity=await workerIdentity();
  const buildApi='https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+identity.buildId;
  const running=await requestJson(buildApi,{headers:identity.headers},{operation:'CLOUD_BUILD_METADATA'});validateBuild(p,running,{finished:false});
  for(const [file,pin] of Object.entries(p.pins)){const bytes=fs.readFileSync(path.join(root,file));equal(blob(bytes),pin.blob,'MECHANISM_BLOB');equal(sha(bytes),pin.sha256,'MECHANISM_SHA256');}
  const temp=path.join(root,'gi-i66-work-'+identity.buildId),source=path.join(temp,'source');
  fs.mkdirSync(temp,{recursive:false});
  execFileSync('git',['clone','--no-checkout','--branch',C.branch,C.repositoryUrl,source],{stdio:'inherit'});
  const branchHead=git(source,'rev-parse','refs/remotes/origin/'+C.branch);
  git(source,'merge-base','--is-ancestor',p.mechanismSha,branchHead);
  equal(blob(gitBytes(source,branchHead,C.transport)),p.transportBlob,'CURRENT_REQUEST_CHANGED');
  equal(git(source,'rev-parse',branchHead+':'+C.manifest),p.manifestBlob,'CURRENT_MANIFEST_CHANGED');
  equal(git(source,'diff','--name-only',p.sourceSha,branchHead,'--',...roots),'','CONCURRENT_PRODUCT_CHANGED');
  equal(git(source,'rev-parse',p.sourceSha+'^{tree}'),p.sourceTreeSha,'PRODUCT_TREE');
  execFileSync('git',['checkout','--detach',p.sourceSha],{cwd:source,stdio:'inherit'});
  const transport=json(path.join(source,C.transport));equal(digest(transport.frontendPreviewRequest),p.requestSha256,'REQUEST_BYTES');
  const workflow=fs.readFileSync(path.join(source,C.workflow));equal(blob(workflow),p.workflowBlob,'WORKFLOW_BLOB');equal(sha(workflow),p.workflowSha256,'WORKFLOW_SHA256');
  equal(blob(fs.readFileSync(path.join(source,C.builder))),p.builderBlob,'BUILDER_UNCHANGED');
  const signed=workflowBlocks(workflow.toString('utf8')),blocks=runtimeBlocks(signed);
  equal(Object.fromEntries(Object.entries(signed).map(([k,v])=>[k,sha(v)])),p.blocks,'WORKFLOW_BLOCKS_CHANGED');
  const apiReads=[],markers=[];
  const github=async suffix=>{const operation=suffix.includes('/jobs')?'GITHUB_JOBS':suffix.includes('artifacts')?'GITHUB_ARTIFACTS':/^runs\/[0-9]+$/.test(suffix)?'GITHUB_RUN':'GITHUB_ACTIONS_READ';
    const value=await requestJson('https://api.github.com/repos/'+C.repository+'/actions/'+suffix,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}},{operation});apiReads.push({suffix,value});return value;};
  const old=p.unexecutedGithubBuild;
  validateOriginalFailure(p,await github('runs/'+old.runId),await github('runs/'+old.runId+'/attempts/'+old.attempt+'/jobs?per_page=100'),await github('runs/'+old.runId+'/artifacts?per_page=100'));
  const env={...process.env,SOURCE_SHA:p.sourceSha,PROJECT_ID:C.projectId,HOSTING_SITE:C.projectId,TENANT_HINT:'alianzas-soluciones',
    RELEASE_GATE:'I6.6',BUILD_PREFIX:'gi-i66',ENVIRONMENT_REF:'firebase-hosting-preview-i6-6',
    GRAVICENTRA_B4_003_SCOPED_PREVIEW:'true',GRAVICENTRA_B4_003_GOALS_PREVIEW:'true',RUNNER_TEMP:temp,
    I66_BRANDING_READER:path.join(root,C.branding),I66_PACKAGE_SUMMARY:path.join(root,F.summary)};
  const checks={};
  function shell(name,log,append=false){const r=execLogged('bash',['-euo','pipefail','-c',blocks[name]],{cwd:source,env,log:path.join(root,log),append});checks[name]={...r,file:log,signedBlockSha256:p.blocks[name],executedBlockSha256:sha(blocks[name])};}
  checks.mechanism={...execLogged(process.execPath,['--test',C.test,C.brandingTest],{cwd:root,env,log:path.join(root,F.mechanism)}),
    file:F.mechanism,tests:[{path:C.test,...p.pins[C.test]},{path:C.brandingTest,...p.pins[C.brandingTest]}]};
  shell('gate',F.gate);
  const startedAt=new Date().toISOString(),previous=process.cwd();
  let eligible;
  try{process.chdir(source);eligible=await require(path.join(source,C.admission)).admitPreview(transport,github,async origin=>{const value=await requestJson(origin+'/__recovery__/build.json',{cache:'no-store'},{operation:'HOSTING_BUILD_MARKER'});markers.push({origin,value});return value;});}finally{process.chdir(previous);}
  equal(eligible,true,'EXISTING_ADMISSION_DENIED');
  write(path.join(root,F.admission),{provider:C.provider,sourceSha:p.sourceSha,eligible,apiReads,markers});
  checks.admission={status:'PASS',exitCode:0,startedAt,endedAt:new Date().toISOString(),file:F.admission};
  shell('source',F.source);
  // Installed versions equal the signed workflow. No service-account key is
  // downloaded/exported; Firebase CLI and the branding reader use native ADC.
  const cliRoot=path.join(temp,'cli');
  execFileSync('npm',['install','--prefix',cliRoot,'--no-save','--ignore-scripts','--no-audit','--no-fund','firebase-tools@14.10.1'],{cwd:source,stdio:'inherit'});
  execFileSync(process.execPath,['tools/gravicentra-firebase-tools-empty-extensions-workaround-v1.mjs',cliRoot],{cwd:source,stdio:'inherit'});
  for(const cwd of [root,source])execFileSync('npm',['install','--no-save','--package-lock=false','--ignore-scripts','--no-audit','--no-fund','firebase-admin@13.4.0'],{cwd,stdio:'inherit'});
  env.FIREBASE_CLI_BIN=path.join(cliRoot,'node_modules/firebase-tools/lib/bin/firebase.js');
  // Recheck the active branch immediately before the one package creation.
  // A later metadata-only checkpoint is harmless; a new source/request is not.
  execFileSync('git',['fetch','--no-tags','--no-write-fetch-head','origin','refs/heads/'+C.branch+':refs/remotes/origin/'+C.branch],{cwd:source,stdio:'inherit'});
  const beforeBuildHead=git(source,'rev-parse','refs/remotes/origin/'+C.branch);
  equal(blob(gitBytes(source,beforeBuildHead,C.transport)),p.transportBlob,'CURRENT_REQUEST_CHANGED');
  equal(git(source,'rev-parse',beforeBuildHead+':'+C.manifest),p.manifestBlob,'CURRENT_MANIFEST_CHANGED');
  equal(git(source,'diff','--name-only',p.sourceSha,beforeBuildHead,'--',...roots),'','CONCURRENT_PRODUCT_CHANGED');
  validateOriginalFailure(p,await github('runs/'+old.runId),await github('runs/'+old.runId+'/attempts/'+old.attempt+'/jobs?per_page=100'),await github('runs/'+old.runId+'/artifacts?per_page=100'));
  // A single immutable object claims this request/source only after QA. A
  // subsequent failed build leaves the claim intact for causal disposition;
  // this executor never deletes a claim or silently builds a second package.
  const lock={schema:'GI_I66_CLOUD_BUILD_PACKAGE_CLAIM_V1',provider:C.provider,sourceSha:p.sourceSha,requestVersion:p.requestVersion,buildId:identity.buildId,mechanismSha:p.mechanismSha,planSha256:digest(p),createdAt:new Date().toISOString()};
  const refreshedIdentity=await workerIdentity();equal(refreshedIdentity.buildId,identity.buildId,'RUNTIME_IDENTITY_CHANGED');
  const lockMeta=await requestJson('https://storage.googleapis.com/upload/storage/v1/b/'+C.bucket+'/o?uploadType=media&ifGenerationMatch=0&name='+encodeURIComponent(lockName(p)),{method:'POST',headers:{...refreshedIdentity.headers,'Content-Type':'application/json'},body:JSON.stringify(lock)+'\n'},{operation:'PACKAGE_CLAIM_CREATE'});
  equal(lockMeta.name,lockName(p),'BUILD_CLAIM_PATH');need(generation(lockMeta.generation),'BUILD_CLAIM_GENERATION');
  shell('build',F.build);shell('archive',F.build,true);
  equal(git(source,'status','--porcelain','--untracked-files=no'),'','PRODUCT_CHECKOUT_MUTATED');
  for(const name of [F.archive,F.digest])fs.copyFileSync(path.join(temp,name),path.join(root,name),fs.constants.COPYFILE_EXCL);
  for(const check of Object.values(checks))check.logSha256=sha(fs.readFileSync(path.join(root,check.file)));
  const proof={schema:C.proofSchema,provider:C.provider,scope:C.scope,status:'PACKAGE_BUILT_NO_DEPLOY',
    buildId:identity.buildId,sourceSha:p.sourceSha,sourceTreeSha:p.sourceTreeSha,mechanismSha:p.mechanismSha,requestVersion:p.requestVersion,
    planSha256:digest(p),serviceAccount:C.serviceAccount,observedBranchHead:branchHead,beforeBuildBranchHead:beforeBuildHead,checks,
    lock:{bucket:C.bucket,name:lockMeta.name,generation:String(lockMeta.generation)},
    archiveSha256:sha(fs.readFileSync(path.join(root,F.archive))),archiveBytes:fs.statSync(path.join(root,F.archive)).size,
    deployments:{preview:0,live:0,functions:0},businessWrites:0,fullI66ProductionAccepted:false};
  write(path.join(root,F.proof),proof);
  console.log('I66_CLOUD_BUILD_PACKAGE_READY_FOR_PROVIDER_RETENTION '+JSON.stringify({buildId:identity.buildId,sourceSha:p.sourceSha,archiveSha256:proof.archiveSha256,scope:C.scope}));
}

function gcloudJson(args){return JSON.parse(execFileSync('gcloud',[...args,'--format=json'],{encoding:'utf8',maxBuffer:64*1024*1024}));}
function objectMetadata(bucket,name,generationId){
  // REST through the caller's legitimate ADC. gcloud prints metadata only.
  return gcloudJson(['storage','objects','describe','gs://'+bucket+'/'+name+(generationId?'#'+generationId:''),'--raw','--project='+C.projectId]);
}
function download(uri,destination){execFileSync('gcloud',['storage','cp',uri,destination,'--project='+C.projectId,'--quiet'],{stdio:'inherit'});return fs.readFileSync(destination);}
function verify(p,buildId,out){
  validatePlan(p);need(uuid(buildId),'VERIFY_UUID');
  fs.mkdirSync(out,{recursive:false});
  const b=gcloudJson(['builds','describe',buildId,'--region='+C.region,'--project='+C.projectId]);validateBuild(p,b);
  write(path.join(out,'cloud-build-metadata.json'),b);
  const manifestName=artifactPrefix(p,buildId)+'artifacts-'+buildId+'.json';
  const providerManifestGeneration=b.results.artifactManifest.split('#')[1];
  const manifestMeta=objectMetadata(C.bucket,manifestName,providerManifestGeneration);validateObject(p,buildId,manifestMeta,'artifacts-'+buildId+'.json');validateObjectTime(b,manifestMeta);
  if(providerManifestGeneration)equal(String(manifestMeta.generation),providerManifestGeneration,'PROVIDER_MANIFEST_GENERATION');
  const manifestBytes=download('gs://'+C.bucket+'/'+manifestName+'#'+manifestMeta.generation,path.join(out,'artifact-manifest.json'));
  equal(Number(manifestMeta.size),manifestBytes.length,'MANIFEST_BYTES_SIZE');
  const rows=artifactRows(p,buildId,parseArtifactManifest(manifestBytes)),files={},objects={};
  for(const [name,row] of rows){const metadata=objectMetadata(C.bucket,artifactPrefix(p,buildId)+name,row.generation);validateObject(p,buildId,metadata,name);equal(String(metadata.generation),row.generation,'MANIFEST_GENERATION_DRIFT');objects[name]=metadata;files[name]=download(row.uri,path.join(out,name));
    const md5=crypto.createHash('md5').update(files[name]);
    const hex=md5.digest('hex'),base64=Buffer.from(hex,'hex').toString('base64');
    need([hex,base64].includes(row.md5),'NATIVE_MANIFEST_CONTENT_HASH');
    if(metadata.md5Hash)equal(metadata.md5Hash,base64,'GCS_OBJECT_CONTENT_HASH');
  }
  const proof=JSON.parse(files[F.proof]);validateWorkerProof(p,b,proof,files,objects);
  const lockMeta=objectMetadata(C.bucket,lockName(p),proof.lock.generation);
  equal(lockMeta.bucket,C.bucket,'CLAIM_BUCKET_READBACK');equal(lockMeta.name,lockName(p),'CLAIM_NAME_READBACK');
  equal(String(lockMeta.generation),proof.lock.generation,'CLAIM_GENERATION_READBACK');validateObjectTime(b,lockMeta);
  const lock=JSON.parse(download('gs://'+C.bucket+'/'+lockName(p)+'#'+proof.lock.generation,path.join(out,'package-claim.json')));
  equal([lock.provider,lock.buildId,lock.sourceSha,lock.mechanismSha,lock.planSha256],[C.provider,buildId,p.sourceSha,p.mechanismSha,digest(p)],'CLAIM_READBACK_BINDING');
  const logPath=path.join(out,'cloud-build-execution.log');
  const fd=fs.openSync(logPath,'wx',0o600);try{execFileSync('gcloud',['builds','log',buildId,'--region='+C.region,'--project='+C.projectId],{stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
  const executionLog=fs.readFileSync(logPath);validateExecutionLog(p,b,proof,executionLog);
  const archive=objects[F.archive],receipt={schema:C.receiptSchema,provider:C.provider,scope:C.scope,status:'IMMUTABLE_PACKAGE_RETAINED_READBACK_PASS_NO_DEPLOY',
    sourceSha:p.sourceSha,sourceTreeSha:p.sourceTreeSha,mechanismSha:p.mechanismSha,requestVersion:p.requestVersion,planSha256:digest(p),
    cloudBuild:{name:b.name,id:b.id,status:b.status,serviceAccount:b.serviceAccount,resolvedSource:b.sourceProvenance.resolvedGitSource,stepImages:b.results.buildStepImages,logUrl:b.logUrl,logSha256:sha(executionLog),metadataSha256:digest(b)},
    artifact:{uri:'gs://'+C.bucket+'/'+archive.name,generation:String(archive.generation),sha256:sha(files[F.archive]),bytes:files[F.archive].length,
      manifestUri:'gs://'+C.bucket+'/'+manifestMeta.name,manifestGeneration:String(manifestMeta.generation),manifestSha256:sha(manifestBytes)},
    checks:proof.checks,workerProofSha256:sha(files[F.proof]),claim:proof.lock,
    preview:'PENDING_SAME_ARTIFACT_PROVIDER_ADMISSION_AND_SIGNED_QA',live:'PENDING_EXACT_PREVIEW_ACCEPTANCE',
    deployments:{preview:0,live:0,functions:0},businessWrites:0,fullI66ProductionAccepted:false};
  write(path.join(out,'receipt.json'),receipt);write(path.join(out,'gcs-object-metadata.json'),objects);
  return receipt;
}
function main(args=process.argv.slice(2)){
  const [command,...rest]=args;
  if(command==='prepare'){
    const [sourceSha,githubRun,githubAttempt,out]=rest;need(out&&rest.length===4,'USAGE_PREPARE_SOURCE_RUN_ATTEMPT_OUT');
    const p=makePlan(process.cwd(),{sourceSha,githubRunId:Number(githubRun),githubAttempt:Number(githubAttempt)});
    fs.mkdirSync(out,{recursive:false});write(path.join(out,'plan.json'),p);write(path.join(out,'cloudbuild.json'),configFor(p));
    console.log(JSON.stringify({provider:C.provider,scope:C.scope,planSha256:digest(p),sourceSha:p.sourceSha,mechanismSha:p.mechanismSha,
      command:['gcloud','builds','submit',C.repositoryUrl,'--git-source-revision='+p.mechanismSha,'--region='+C.region,'--project='+C.projectId,'--config='+path.join(out,'cloudbuild.json'),'--gcs-source-staging-dir=gs://'+C.bucket+'/i66/source-staging','--async']}));
  }else if(command==='worker'){need(rest.length===1,'WORKER_PLAN_ARGUMENT');return worker(JSON.parse(rest[0]));}
  else if(command==='verify'){const [planFile,buildId,out]=rest;need(rest.length===3,'USAGE_VERIFY_PLAN_UUID_OUT');console.log(JSON.stringify(verify(json(planFile),buildId,out)));}
  else throw Error('I66_CLOUD_BUILD_USAGE prepare <sourceSha> <unexecutedGithubRunId> <attempt> <newOutputDirectory> | verify <plan.json> <realBuildUuid> <newOutputDirectory>');
}
module.exports={C,N,F,sha,blob,digest,runBlock,workflowBlocks,runtimeBlocks,validatePlan,makePlan,configFor,artifactPrefix,lockName,validateBuild,validateOriginalFailure,validateObject,validateObjectTime,parseArtifactManifest,nativeArtifactMd5,artifactRows,validateWorkerProof,validateExecutionLog,requestCauseCode,providerRequest,requestJson,execLogged,workerIdentity,worker,verify,main};
if(require.main===module)Promise.resolve().then(()=>main()).catch(error=>{console.error(String(error.message||error));process.exitCode=Number.isInteger(error.exitCode)&&error.exitCode>0&&error.exitCode<256?error.exitCode:1;});
