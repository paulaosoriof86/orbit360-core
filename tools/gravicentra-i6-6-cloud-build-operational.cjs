'use strict';
// Native execution adapter for the EXISTING five-function I6.6 transport.
// Product source and its retained package remain immutable. Provider identity
// is explicit; no GitHub run, signature or artifact identifier is synthesized.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync,spawnSync}=require('node:child_process');
const pkg=require('./gravicentra-i6-6-cloud-build-package.cjs');
const preview=require('./gravicentra-i6-6-cloud-build-preview.cjs');
const auth=require('./gravicentra-i66-signed-qa-runtime-auth.cjs');
const {sha,blob,digest}=pkg;
const C=Object.freeze({...pkg.C,serviceAccount:'firebase-adminsdk-fbsvc@ays-orbit-360-lab.iam.gserviceaccount.com',
  tool:'tools/gravicentra-i6-6-cloud-build-operational.cjs',test:'tools/gravicentra-i6-6-cloud-build-operational.test.cjs',
  sdkImage:'gcr.io/google.com/cloudsdktool/google-cloud-cli:stable',sdkStep:'i66-native-provider-cli',stepId:'i66-native-operational-gates',
  planSchema:'GI_I66_CLOUD_BUILD_OPERATIONAL_PLAN_V1',bindingSchema:'GI_I66_CLOUD_BUILD_RELEASE_BINDING_V1',
  proofSchema:'GI_I66_CLOUD_BUILD_OPERATIONAL_PROOF_V1',receiptSchema:'GI_I66_CLOUD_BUILD_OPERATIONAL_RECEIPT_V1',
  previewWorkflow:'.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml',
  liveWorkflow:'.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml'});
const F=Object.freeze({proof:'gi-i66-native-operational-proof.json',signed:'gi-i66-operational-signed-proof.json',
  financial:'gi-i66-financial48.json',evidence:'gi-i66-operational-evidence.tar.gz',log:'gi-i66-operational-execution.log',mechanism:'gi-i66-operational-mechanism.log'});
// A finite mechanism revision. Product owners, approved receipts, rules and
// functional profiles never belong to this set. Every admitted byte is pinned
// to a real mechanism commit and its real preimage at the package source.
const HISTORICAL_ADMISSION_TEST='tools/gravicentra-i6-6-composite-preview-admission.test.cjs';
const MECHANISM_PATHS=Object.freeze([
  HISTORICAL_ADMISSION_TEST,'tools/gravicentra-i66-composite-acceptance.test.cjs',
  C.tool,C.test,pkg.C.tool,pkg.C.test,pkg.C.branding,pkg.C.brandingTest,
  preview.C.tool,preview.C.test,preview.C.readback,preview.C.readbackTest,
  'tools/gravicentra-i6-6-operational-release-candidate.cjs',
  'tools/gravicentra-i66-make-release-scope.cjs','tools/gravicentra-i66-make-release-scope.test.cjs',
  'tools/gravicentra-i66-make-lead-protected-executor.cjs','tools/gravicentra-i66-make-lead-protected-executor.test.cjs',
  'tools/gravicentra-i66-signed-qa-runtime-auth.cjs','tools/gravicentra-i66-signed-qa-runtime-auth.test.cjs',
  'tools/gravicentra-i66-privileged-role-signed-ui-permissions-readonly.cjs',
  'tools/gravicentra-i6-6-carlos-real-signed-synthetic-preview-uat.cjs',
  'tools/gravicentra-i6-6-advisor-payables-signed-uat.cjs','tools/gravicentra-i6-6-proposal-application-signed-uat.cjs',
  'tools/gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs',
  'tools/gravicentra-i6-6-carlos-paula-live-synthetic-ops-leads-uat.cjs',
  'tools/gravicentra-i66-privileged-role-exact-live-transport.mjs','tools/gravicentra-i66-privileged-role-exact-live-transport-adc.test.cjs',
  'tools/gravicentra-i66-live-performance-readonly.mjs','tools/gravicentra-i6-6-native-financial-readonly-adc.test.cjs',
  'tools/gravicentra-i66-frontend-promotion-owner.cjs','tools/gravicentra-i66-frontend-promotion-transaction.cjs',
  'tools/gravicentra-i66-frontend-hosting-io.cjs','tools/gravicentra-i66-frontend-control.cjs',
  'tools/gravicentra-i66-frontend-control.test.cjs',
  'tools/gravicentra-i6-6-cloud-build-signed-cas.cjs','tools/gravicentra-i6-6-cloud-build-signed-cas.test.cjs',
  'tools/gravicentra-i6-6-native-promotion-artifact-binding.test.cjs',
  'tools/gravicentra-i6-6-carlos-paula-live-synthetic-ops-leads-uat-adc.test.cjs'
]);
const PRODUCT_PATHS=Object.freeze(['functions','orbit360-platform','firebase.json','firestore.rules','storage.rules','database.rules.json',pkg.C.builder,':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json']);
const PHASES=Object.freeze(['preview','live']);
const ACTIONS=Object.freeze(['admit','worker','snapshot-trigger','before-deploy','capture-trigger','initialize-closed','wait-probe','wait-config','operate','rollback','financial-readonly','accept-live','verify-preview','record-rollback']);
const equal=(a,b,c)=>assert.deepEqual(a,b,'I66_NATIVE_OPERATIONAL_'+c),need=(v,c)=>assert.ok(v,'I66_NATIVE_OPERATIONAL_'+c);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v),sha40=v=>/^[a-f0-9]{40}$/.test(v||''),sha64=v=>/^[a-f0-9]{64}$/.test(v||'');
const native=p=>p?.executionProvider===C.provider;
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,Buffer.isBuffer(v)||typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx',mode:0o600});
const git=(cwd,...a)=>execFileSync('git',a,{cwd,encoding:'utf8',maxBuffer:64*1024*1024}).trimEnd();
const gitBytes=(cwd,ref,p)=>execFileSync('git',['show',ref+':'+p],{cwd,stdio:'pipe',maxBuffer:64*1024*1024});
function provider(p){need(p?.executionProvider===undefined||native(p),'UNKNOWN_PROVIDER');return native(p);}
function executionId(p,value,label){if(provider(p))need(uuid(value),label+'_UUID');else need(Number.isSafeInteger(value)&&value>0,label+'_INTEGER');return value;}
function artifactRef(value){
  need(typeof value==='string','EVIDENCE_URI');const m=/^(gs:\/\/[^#]+)#([1-9][0-9]{0,24})$/.exec(value);need(m,'EVIDENCE_GENERATION');
  need(m[1].startsWith('gs://'+C.bucket+'/i66/'),'PRIVATE_EVIDENCE_BUCKET');
  const tail=m[1].slice(('gs://'+C.bucket+'/i66/').length);need(/^[A-Za-z0-9_./-]+$/.test(tail)&&!tail.split('/').some(s=>!s||s==='.'||s==='..'),'EVIDENCE_NAME');
  return {uri:m[1],generation:m[2]};
}
function validateMechanism(m,sourceSha){
  equal(Object.keys(m||{}).sort(),['schema','sourceSha','commit','files'].sort(),'MECHANISM_KEYS');
  equal(m.schema,'GI_I66_NATIVE_MECHANISM_REVISION_V1','MECHANISM_SCHEMA');equal(m.sourceSha,sourceSha,'MECHANISM_PRODUCT_SOURCE');need(sha40(m.commit),'MECHANISM_COMMIT');
  need(m.files&&typeof m.files==='object'&&!Array.isArray(m.files),'MECHANISM_PINS');
  const keys=Object.keys(m.files);need(keys.length>0&&keys.every(p=>MECHANISM_PATHS.includes(p)),'CLOSED_MECHANISM_FILES');
  for(const p of [C.tool,C.test,'tools/gravicentra-i6-6-operational-release-candidate.cjs','tools/gravicentra-i66-signed-qa-runtime-auth.cjs'])need(Object.hasOwn(m.files,p),'REQUIRED_MECHANISM_'+p);
  for(const row of Object.values(m.files)){equal(Object.keys(row).sort(),['beforeBlob','blob','sha256'],'MECHANISM_PIN_KEYS');need((row.beforeBlob===null||sha40(row.beforeBlob))&&sha40(row.blob)&&sha64(row.sha256),'MECHANISM_PIN_HASH');need(row.beforeBlob!==row.blob,'ONLY_CHANGED_MECHANISM_PINS');}
  // Request 35 admits only the published fixture revision. Both identities are
  // recorded in I6_6_ASSIGNED_ROLES_HISTORICAL_FIXTURE_PROVIDER_QA_20261125.
  const fixture=m.files[HISTORICAL_ADMISSION_TEST];
  if(fixture)equal([fixture.beforeBlob,fixture.blob],['c6485d21daa40ea5a0521521163b67a375d6fd6d','3978f19272a435984207b40f928398fa8046f0b3'],'HISTORICAL_ADMISSION_FIXTURE_EXACT_REVISION');
  const compositeFixture=m.files['tools/gravicentra-i66-composite-acceptance.test.cjs'];
  if(compositeFixture)equal([compositeFixture.beforeBlob,compositeFixture.blob],
    ['3bab3e94cdd575b40efda54eb8d6d7ba72f87a39','db304f586b758321d4d84d1e25e793fb3c9b65f1'],'HISTORICAL_COMPOSITE_FIXTURE_EXACT_REVISION');
  return m;
}
function validateBinding(p,physical){
  if(p?.providerBinding?.schema==='GI_I66_SCOPED_FUNCTION_PACKAGE_V1'){
    need(native(p)&&physical&&typeof physical.readBlob==='function','FUNCTIONAL_PHYSICAL_AUTHORITY_REQUIRED');
    equal(Object.keys(p).sort(),['executionProvider','providerBinding'],'SCOPED_CANDIDATE_FIELDS');
    return scopeOwner().validateFunctionalUnitSuccessor(p.providerBinding,physical.current,physical.readBlob);
  }
  need(native(p),'EXPLICIT_CLOUD_PROVIDER');const b=p.providerBinding;
  equal(Object.keys(b||{}).sort(),['schema','requestVersion','mechanism','hostingPlan','hostingBuildId','hostingProof','hostingVersion'].sort(),'BINDING_KEYS');
  equal(b.schema,C.bindingSchema,'BINDING_SCHEMA');preview.validatePlan(b.hostingPlan);
  equal(b.requestVersion,b.hostingPlan.requestVersion,'BINDING_REQUEST');need(uuid(b.hostingBuildId),'HOSTING_EXECUTION_UUID');preview.objectRef(b.hostingProof);
  equal(b.hostingProof.uri,'gs://'+C.bucket+'/'+preview.prefix(b.hostingPlan,b.hostingBuildId)+preview.F.proof,'HOSTING_PROOF_PATH');
  need(/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(b.hostingVersion||''),'HOSTING_VERSION');
  const h=b.hostingPlan,a=h.packageArtifact;
  equal([p.sourceSha,p.buildRunId,p.artifactId,p.artifactDigest,p.previewChannelId,p.previewUrl],
    [h.sourceSha,h.packageBuildId,a.uri+'#'+a.generation,'sha256:'+a.sha256,preview.C.channel,preview.C.origin],'PACKAGE_AND_PREVIEW_EXACT_BINDING');
  preview.artifactIdentity(p.sourceSha,p.buildRunId,p.artifactId,p.artifactDigest);validateMechanism(b.mechanism,p.sourceSha);
  equal(p.expectedSiteFileCount,224,'SITE_FILES');equal(p.makeIngressComposite,true,'FIVE_FUNCTION_COMPOSITE');
  return b;
}
function verifyPinnedOwners(p,{head='HEAD',cwd=process.cwd(),gitRead,readFile=fs.readFileSync}={}){
  const b=validateBinding(p),m=b.mechanism;
  const read=gitRead||((...a)=>execFileSync('git',a,{cwd,stdio:'pipe',maxBuffer:64*1024*1024}));
  const text=(...a)=>String(read(...a)).trimEnd(),at=(ref,file)=>Buffer.from(read('show',ref+':'+file));
  read('merge-base','--is-ancestor',p.sourceSha,m.commit);read('merge-base','--is-ancestor',m.commit,head);
  equal(text('diff','--name-only',p.sourceSha,head,'--',...PRODUCT_PATHS),'','NO_PRODUCT_CHANGE');
  equal(text('diff','--name-only','--',...PRODUCT_PATHS),'','NO_WORKING_PRODUCT_CHANGE');
  equal(text('ls-files','--others','--exclude-standard','-z','--',...PRODUCT_PATHS),'','NO_UNTRACKED_PRODUCT_OWNER');
  const sourceRequest=JSON.parse(at(p.sourceSha,C.transport)).frontendPreviewRequest;
  const currentRequest=JSON.parse(at(head,C.transport)).frontendPreviewRequest;
  equal(currentRequest,sourceRequest,'SAME_FROZEN_REQUEST');
  equal(digest(sourceRequest),b.hostingPlan.packagePlan.requestSha256,'PACKAGE_REQUEST_SHA256');
  equal(sourceRequest.version,b.requestVersion,'SOURCE_REQUEST_VERSION');
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  const changed=text('diff','--name-only',p.sourceSha,head,'--',...g.PINNED_OWNER_PATHS).split('\n').filter(Boolean);
  need(changed.every(file=>Object.hasOwn(m.files,file)),'UNADMITTED_SOURCE_OR_QA_CHANGE');
  const actual=text('diff','--name-only',p.sourceSha,m.commit,'--',...MECHANISM_PATHS).split('\n').filter(Boolean).sort();
  equal(actual,Object.keys(m.files).sort(),'COMPLETE_MECHANISM_PREIMAGES');
  for(const [file,pin] of Object.entries(m.files)){
    if(pin.beforeBlob===null){let absent=false;try{read('cat-file','-e',p.sourceSha+':'+file);}catch{absent=true;}need(absent,'NEW_OWNER_ACTUALLY_ABSENT');}
    else equal(blob(at(p.sourceSha,file)),pin.beforeBlob,'REAL_OWNER_PREIMAGE');
    const sealed=at(m.commit,file);equal([blob(sealed),sha(sealed)],[pin.blob,pin.sha256],'SEALED_OWNER_BYTES');
    equal(at(head,file),sealed,'CURRENT_MECHANISM_OWNER');equal(Buffer.from(readFile(path.join(cwd,file))),sealed,'EXECUTING_MECHANISM_OWNER');
  }
  // Historical receipts remain governed by the original source, even though
  // the execution provider and selected credential readers are different.
  for(const binding of [p.financialRecoveryQa,p.cancellationRecoveryQa].filter(Boolean)){
    equal(blob(at(p.sourceSha,binding.receiptPath)),binding.receiptBlob,'HISTORICAL_RECEIPT_SOURCE');equal(blob(at(head,binding.receiptPath)),binding.receiptBlob,'HISTORICAL_RECEIPT_CURRENT');
  }
  return {executionProvider:C.provider,sourceSha:p.sourceSha,mechanismSha:m.commit,head:text('rev-parse',head),ownerCount:Object.keys(m.files).length};
}
function ensureHistory(plan,{cwd=process.cwd(),runGit=(...args)=>execFileSync('git',args,{cwd,stdio:'pipe',maxBuffer:64*1024*1024})}={}){
  validatePlan(plan);const text=(...args)=>String(runGit(...args)).trimEnd();
  const head=text('rev-parse','HEAD'),status=text('status','--porcelain','--untracked-files=no'),diff=sha(runGit('diff','--binary','HEAD','--'));
  equal(head,plan.authorityHead,'HISTORY_EXECUTING_HEAD');
  const commits=[plan.sourceSha,plan.mechanismSha,plan.authorityHead];
  const present=ref=>{try{runGit('cat-file','-e',ref+'^{commit}');return true;}catch{return false;}};
  const shallow=text('rev-parse','--is-shallow-repository');need(['true','false'].includes(shallow),'HISTORY_SHALLOW_STATE');
  const fetched=shallow==='true'||!commits.every(present);
  if(fetched)runGit('fetch','--quiet','--no-tags',...(shallow==='true'?['--unshallow']:[]),C.repositoryUrl,'refs/heads/'+C.branch);
  equal(text('rev-parse','--is-shallow-repository'),'false','FULL_PUBLIC_HISTORY_REQUIRED');
  need(commits.every(present),'EXACT_HISTORY_COMMITS_REQUIRED');
  runGit('merge-base','--is-ancestor',plan.sourceSha,plan.mechanismSha);runGit('merge-base','--is-ancestor',plan.mechanismSha,plan.authorityHead);
  equal([text('rev-parse','HEAD'),text('status','--porcelain','--untracked-files=no'),sha(runGit('diff','--binary','HEAD','--'))],[head,status,diff],'HISTORY_FETCH_PRESERVED_CHECKOUT_BYTES');
  return {fetched,sourceSha:plan.sourceSha,mechanismSha:plan.mechanismSha,authorityHead:head};
}
function fetchAuthorityHead(expected,{cwd=process.cwd(),gitRead=(...args)=>execFileSync('git',args,{cwd,stdio:'pipe',maxBuffer:64*1024*1024})}={}){
  need(sha40(expected),'REMOTE_AUTHORITY_SHA');
  gitRead('fetch','--quiet',C.repositoryUrl,'refs/heads/'+C.branch);
  equal(String(gitRead('rev-parse','FETCH_HEAD')).trim(),expected,'REMOTE_AUTHORITY_MOVED_DURING_READ');return expected;
}
function validatePlan(p){
  equal(Object.keys(p||{}).sort(),['schema','provider','phase','repository','branch','projectId','projectNumber','region','serviceAccount','bucket','authorityHead','candidateSha256','mechanismSha','sourceSha','requestVersion','transportBlob','financialAuthorityBlob','workflowBlob','blocks'].sort(),'PLAN_KEYS');
  equal(p.schema,C.planSchema,'PLAN_SCHEMA');equal(p.provider,C.provider,'PLAN_PROVIDER');need(PHASES.includes(p.phase),'PHASE');
  equal([p.repository,p.branch,p.projectId,p.projectNumber,p.region,p.serviceAccount,p.bucket],[C.repository,C.branch,C.projectId,C.projectNumber,C.region,C.serviceAccount,C.bucket],'EXECUTION_BOUNDARY');
  for(const k of ['authorityHead','mechanismSha','sourceSha','transportBlob','financialAuthorityBlob','workflowBlob'])need(sha40(p[k]),'PLAN_'+k);
  need(sha64(p.candidateSha256)&&Number.isSafeInteger(p.requestVersion)&&p.requestVersion>0,'EXACT_CANDIDATE_REQUEST');
  equal(Object.keys(p.blocks||{}).sort(),Object.keys(blockNames(p.phase)).sort(),'ALL_EXISTING_GATES');for(const h of Object.values(p.blocks))need(sha64(h),'BLOCK_HASH');
  return p;
}
function prefix(p,id){need(uuid(id)||id==='$BUILD_ID','EXECUTION_UUID');return 'i66/operational/'+p.phase+'/request-'+p.requestVersion+'/'+p.sourceSha+'/'+id+'/';}
const SDK_SCRIPT='set -euo pipefail\ni66_sdk_root="$(gcloud info --format="value(installation.sdk_root)")"\ntest -d "$i66_sdk_root"\nmkdir -p /workspace/.i66-provider\ncp -a "$i66_sdk_root" /workspace/.i66-provider/google-cloud-sdk\ngcloud version --format=json > /workspace/.i66-provider/version.json\n';
const SDK_PROVIDER_SCRIPT=SDK_SCRIPT.split('$').join('$$');
function configFor(p){validatePlan(p);return {
  steps:[{id:C.sdkStep,name:C.sdkImage,entrypoint:'bash',args:['-euo','pipefail','-c',SDK_PROVIDER_SCRIPT]},
    {id:C.stepId,name:C.image,entrypoint:'node',args:[C.tool,'worker',JSON.stringify(p)],env:[
      'GRAVICENTRA_BUILD_PROVIDER=$_I66_PROVIDER','GRAVICENTRA_CLOUD_BUILD_ID=$BUILD_ID','GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT='+C.serviceAccount,
      'PROJECT_ID='+C.projectId,'TENANT_HINT=alianzas-soluciones','I66_NATIVE_AUTHORITY_HEAD=$_I66_AUTHORITY_HEAD','I66_NATIVE_PLAN_SHA256=$_I66_PLAN_SHA256']}],
  serviceAccount:'projects/'+C.projectId+'/serviceAccounts/'+C.serviceAccount,timeout:'10800s',logsBucket:'gs://'+C.bucket+'/i66/cloud-build-logs',
  options:{logging:'GCS_ONLY',sourceProvenanceHash:['SHA256'],machineType:'E2_STANDARD_2'},
  substitutions:{_I66_PROVIDER:C.provider,_I66_AUTHORITY_HEAD:p.authorityHead,_I66_PLAN_SHA256:digest(p)},
  tags:['i66-operational-'+p.phase,'i66-request-'+p.requestVersion],artifacts:{objects:{location:'gs://'+C.bucket+'/'+prefix(p,'$BUILD_ID'),paths:Object.values(F)}}};}
function validateBuild(p,b,{finished=true}={}){
  validatePlan(p);need(uuid(b.id),'BUILD_UUID');need([C.projectId,C.projectNumber].some(n=>b.name==='projects/'+n+'/locations/'+C.region+'/builds/'+b.id),'BUILD_RESOURCE');
  equal(b.projectId,C.projectId,'BUILD_PROJECT');equal(b.status,finished?'SUCCESS':'WORKING','BUILD_STATUS');const c=configFor(p);
  for(const k of ['serviceAccount','timeout','logsBucket','substitutions','tags'])equal(b[k],c[k],'BUILD_'+k);
  for(const k of ['logging','sourceProvenanceHash','machineType'])equal(b.options?.[k],c.options[k],'OPTIONS_'+k);
  for(const k of ['env','volumes','secretEnv'])need(!b.options?.[k]?.length,'NO_GLOBAL_OVERRIDE');
  need(!b.options?.pool?.name&&!b.options?.workerPool&&!b.options?.automapSubstitutions&&!b.options?.dynamicSubstitutions,'NO_POOL_OVERRIDE');
  need(!b.secrets?.length&&!b.availableSecrets&&!b.dependencies?.length&&!b.images?.length&&!b.gitConfig&&!b.buildTriggerId,'NO_EXTRA_EXECUTION');
  equal(Object.keys(b.source||{}),['gitSource'],'SOURCE_KIND');equal([b.source.gitSource.url,b.source.gitSource.revision],[C.repositoryUrl,p.authorityHead],'ACTUAL_AUTHORITY_CHECKOUT');need(!b.source.gitSource.dir,'ROOT_SOURCE');
  if(finished||b.sourceProvenance?.resolvedGitSource){const r=b.sourceProvenance?.resolvedGitSource;equal([r?.url,r?.revision],[C.repositoryUrl,p.authorityHead],'RESOLVED_SOURCE');need(!r.dir,'RESOLVED_ROOT');}
  equal(b.steps?.length,c.steps.length,'TWO_EXECUTED_STEPS');
  for(let i=0;i<c.steps.length;i++){const s=b.steps[i],e=c.steps[i];for(const k of ['id','name','entrypoint'])equal(s[k],e[k],'STEP_'+k);
    if(i===0)need(JSON.stringify(s.args)===JSON.stringify(e.args)||JSON.stringify(s.args)===JSON.stringify(['-euo','pipefail','-c',SDK_SCRIPT]),'SDK_STEP_EXACT_ARGS');else equal(s.args,e.args,'STEP_args');
    if(e.env){const expanded=e.env.map(x=>x.replace(/\$([A-Z_][A-Z0-9_]*)/g,(m,k)=>k==='BUILD_ID'?b.id:c.substitutions[k]??m));need(JSON.stringify(s.env)===JSON.stringify(e.env)||JSON.stringify(s.env)===JSON.stringify(expanded),'STEP_ENV');}else need(!s.env?.length,'SDK_NO_EXTRA_ENV');
    need(!s.allowFailure&&!s.allowExitCodes?.length&&!s.secretEnv?.length&&!s.script&&!s.dir&&!s.volumes?.length,'NO_STEP_BYPASS');
    if(finished){equal(s.status,'SUCCESS','REAL_STEP_SUCCESS');need(Date.parse(s.timing?.startTime)>=Date.parse(b.startTime)&&Date.parse(s.timing?.endTime)>=Date.parse(s.timing?.startTime)&&Date.parse(s.timing?.endTime)<=Date.parse(b.finishTime),'REAL_STEP_TIMING');}}
  equal(Object.keys(b.artifacts||{}),['objects'],'NATIVE_ARTIFACTS_ONLY');need([c.artifacts.objects.location,c.artifacts.objects.location.replace('$BUILD_ID',b.id)].includes(b.artifacts.objects.location),'ARTIFACT_LOCATION');equal(b.artifacts.objects.paths,Object.values(F),'EXACT_ARTIFACT_SET');
  need(Number.isFinite(Date.parse(b.startTime))&&Number.isFinite(Date.parse(b.createTime)),'REAL_START');
  if(finished){need(Date.parse(b.finishTime)>=Date.parse(b.startTime),'REAL_FINISH');equal(b.results?.buildStepImages?.length,2,'TWO_IMAGE_DIGESTS');need(b.results.buildStepImages.every(x=>/^sha256:[a-f0-9]{64}$/.test(x)),'IMMUTABLE_STEP_IMAGES');equal(Number(b.results.numArtifacts),Object.keys(F).length,'ALL_ARTIFACTS');const uri='gs://'+C.bucket+'/'+prefix(p,b.id)+'artifacts-'+b.id+'.json';need(b.results.artifactManifest===uri||/^#[1-9][0-9]{0,24}$/.test(String(b.results.artifactManifest).slice(uri.length))&&b.results.artifactManifest.startsWith(uri),'ARTIFACT_MANIFEST');}
  return b;
}
async function sdkHeaders({verifyIdentity=()=>auth.verifyCloudBuildRuntime(),requestContext={}}={}){
  await verifyIdentity();
  const token=await pkg.providerRequest('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    {headers:{'Metadata-Flavor':'Google'}},{...requestContext,format:'json',operation:'METADATA_TOKEN',metadata:true,timeoutMs:10000});
  need(token.token_type==='Bearer'&&typeof token.access_token==='string'&&token.access_token.length>20,'METADATA_ACCESS_TOKEN');
  return {Authorization:'Bearer '+token.access_token};
}
async function verifyRuntimeAuthority(p,{phase,action,env=process.env,cwd=process.cwd(),plan:providedPlan,readBuild,verifyIdentity=auth.verifyCloudBuildRuntime,verifyPins=verifyPinnedOwners}={}){
  need(PHASES.includes(phase)&&ACTIONS.includes(action),'RUNTIME_ACTION');validateBinding(p);equal(env.GRAVICENTRA_BUILD_PROVIDER,C.provider,'RUNTIME_PROVIDER');
  for(const k of Object.keys(env))if(k.startsWith('GITHUB_')||k==='GH_TOKEN')need(!env[k],'NO_GITHUB_IMPERSONATION');
  const identity=await verifyIdentity(env);const file=path.join(cwd,'.i66-native-plan.json');const plan=providedPlan||json(file);validatePlan(plan);
  equal([plan.phase,plan.candidateSha256,plan.sourceSha,plan.mechanismSha,plan.requestVersion],[phase,digest(p),p.sourceSha,p.providerBinding.mechanism.commit,p.providerBinding.requestVersion],'RUNTIME_EXACT_CANDIDATE');
  equal([env.GRAVICENTRA_CLOUD_BUILD_ID,env.I66_NATIVE_AUTHORITY_HEAD,env.I66_NATIVE_PLAN_SHA256],[identity.buildId,plan.authorityHead,digest(plan)],'RUNTIME_CONFIG_ENV');
  verifyPins(p,{head:'HEAD',cwd});
  const read=readBuild||((url)=>sdkHeaders().then(headers=>pkg.requestJson(url,{headers},{operation:'PROVIDER_JSON'})));
  const build=await read('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+identity.buildId);validateBuild(plan,build,{finished:false});
  equal(build.id,identity.buildId,'RUNTIME_BUILD_ID');
  return {executionProvider:C.provider,buildId:build.id,workflowHeadSha:plan.authorityHead,mechanismSha:plan.mechanismSha,phase,action,plan,build};
}
function blockNames(phase){return phase==='preview'?{
  gate:'Prove owner-scoped Preview authorization, immutable artifact and sealed source',marker:'Read back the exact immutable Hosting Preview source',
  backend:'Prove exact immutable backend bytes and prepare isolated Firebase config',deploy:'Verify exact authorized Preview callables then deploy only those',
  signed:'Signed Carlos and Paula real-auth synthetic CRUD, durable readback, reload and restore',seal:'Seal source-artifact-specific signed Preview evidence',
  rollback:'Close machine ingress and compensate its exact Preview trigger on failure'
}:phase==='live'?{
  gate:'Gate exact signed Preview, unchanged product owners and immutable artifact',
  proof:'Verify durable signed Preview proof is for this same immutable source and artifact',
  backend:'Read immutable TAR and exact backend and frontend source without rebuilding',
  signedPreview:'Test signed existing Carlos and Direction Preview eight-module permissions before touching LIVE',
  snapshot:'Snapshot exact LIVE function revisions, inventory and previous Hosting version for rollback',
  deploy:'Deploy exact authorized LIVE backend revisions and clone exact Preview artifact with automatic rollback'
}:{};}
function workflowBlocks(text,phase){return Object.fromEntries(Object.entries(blockNames(phase)).map(([key,name])=>[key,pkg.runBlock(text,name)]));}
function workflowTimeoutMs(text,phase,makeIngress){
  need(PHASES.includes(phase)&&typeof makeIngress==='boolean','WORKFLOW_TIMEOUT_PHASE');
  const job=phase==='preview'?'exact-preview-only':'exact-role-live';
  const headers=[...text.matchAll(/^  ([A-Za-z0-9_-]+):\s*$/gm)],matches=headers.filter(row=>row[1]===job);
  equal(matches.length,1,'WORKFLOW_TIMEOUT_JOB');
  const start=matches[0].index,next=headers.find(row=>row.index>start);
  const section=text.slice(start,next?.index??text.length);
  const rows=[...section.matchAll(/^    timeout-minutes:[ \t]*(.+)[ \t]*$/gm)];
  equal(rows.length,1,'WORKFLOW_TIMEOUT_UNIQUE');
  const value=rows[0][1].trim(),literal=/^([1-9][0-9]*)$/.exec(value);
  const conditional=/^\$\{\{\s*needs\.phase\.outputs\.make_ingress\s*==\s*'true'\s*&&\s*([1-9][0-9]*)\s*\|\|\s*([1-9][0-9]*)\s*\}\}$/.exec(value);
  need(literal||conditional,'WORKFLOW_TIMEOUT_EXPRESSION');
  const minutes=Number(literal?literal[1]:conditional[makeIngress?1:2]),ms=minutes*60*1000;
  need(Number.isSafeInteger(ms)&&ms>0&&ms<=2147483647,'WORKFLOW_TIMEOUT_RANGE');return ms;
}
function deploymentTimeoutMs(text,phase,makeIngress,build,nowMs=Date.now()){
  // This command contains the original deployment, signed QA, metadata CAS
  // and rollback. Preserve that job's remaining budget, not the shorter
  // package-command default; the real provider deadline remains an upper bound.
  const budget=workflowTimeoutMs(text,phase,makeIngress),duration=/^([1-9][0-9]*)s$/.exec(build?.timeout||'');
  need(duration,'PROVIDER_TIMEOUT_REQUIRED');
  const providerMs=Number(duration[1])*1000,startedAt=Date.parse(build?.startTime);
  need(Number.isSafeInteger(providerMs)&&providerMs>0&&Number.isFinite(startedAt)&&
    Number.isSafeInteger(nowMs)&&nowMs>=startedAt,'PROVIDER_TIMEOUT_CLOCK');
  const remaining=Math.min(budget,providerMs)-(nowMs-startedAt);
  need(Number.isSafeInteger(remaining)&&remaining>0,'DEPLOYMENT_BUDGET_EXHAUSTED');return remaining;
}
function replaceExact(text,before,after,count=1){equal(text.split(before).length-1,count,'EXACT_PROVIDER_SUBSTITUTION');return text.replaceAll(before,after);}
function runtimeBlocks(original,phase){
  const blocks={...original};
  // Source validation still executes its unchanged owner in the frozen full
  // clone. The native admission and mechanism tests execute the revised bytes.
  blocks.gate=replaceExact(blocks.gate,'node tools/gravicentra-i6-6-delta-guard.mjs',
    '(cd "$I66_FROZEN_SOURCE_ROOT" && node tools/gravicentra-i6-6-delta-guard.mjs)');
  blocks.backend=replaceExact(blocks.backend,'$GITHUB_ENV','$I66_NATIVE_ENV_FILE',2);
  const legacyAuth='gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS" --quiet >/dev/null\n';
  if(phase==='preview'){
    blocks.deploy=replaceExact(blocks.deploy,'  '+legacyAuth,'  node '+C.tool+' verify-runtime preview\n');
    blocks.seal=replaceExact(blocks.seal,'runId:Number(process.env.GITHUB_RUN_ID),headSha:process.env.GITHUB_SHA',
      "executionProvider:'CLOUD_BUILD',runId:process.env.GRAVICENTRA_CLOUD_BUILD_ID,headSha:process.env.I66_NATIVE_AUTHORITY_HEAD");
  }else{
    blocks.snapshot=replaceExact(blocks.snapshot,legacyAuth,'node '+C.tool+' verify-runtime live\n');
    blocks.snapshot=replaceExact(blocks.snapshot,'$GITHUB_ENV','$I66_NATIVE_ENV_FILE');
    blocks.deploy=replaceExact(blocks.deploy,'p.runId=Number(process.env.GITHUB_RUN_ID);p.headSha=process.env.GITHUB_SHA;',
      "p.executionProvider='CLOUD_BUILD';p.runId=process.env.GRAVICENTRA_CLOUD_BUILD_ID;p.headSha=process.env.I66_NATIVE_AUTHORITY_HEAD;");
    blocks.deploy=replaceExact(blocks.deploy,'node tools/gravicentra-i66-make-lead-protected-executor.cjs initialize-closed live\n',
      'node tools/gravicentra-i66-make-lead-protected-executor.cjs initialize-closed live\n  node '+C.tool+' retain-make live\n');
  }
  for(const text of Object.values(blocks))need(!/GITHUB_|GH_TOKEN|activate-service-account|--impersonate-service-account/.test(text),'NO_GITHUB_OR_KEY_IMPERSONATION');
  return blocks;
}
function mechanismManifest(cwd,sourceSha,commit){
  need(sha40(sourceSha)&&sha40(commit),'MECHANISM_COMMIT_REQUIRED');
  const files={};for(const file of MECHANISM_PATHS){let bytes;try{bytes=gitBytes(cwd,commit,file);}catch{continue;}
    let beforeBlob=null;try{beforeBlob=blob(gitBytes(cwd,sourceSha,file));}catch{}
    if(beforeBlob!==blob(bytes))files[file]={beforeBlob,blob:blob(bytes),sha256:sha(bytes)};
  }
  return validateMechanism({schema:'GI_I66_NATIVE_MECHANISM_REVISION_V1',sourceSha,commit,files},sourceSha);
}
function bindingFromHosting(cwd,hostingPlan,receipt,mechanismSha){
  preview.validatePlan(hostingPlan);equal(receipt.schema,preview.C.receiptSchema,'HOSTING_RECEIPT_SCHEMA');
  equal(receipt.status,'EXACT_EXISTING_PREVIEW_RETAINED_READBACK_PASS_SIGNED_QA_PENDING','HOSTING_RECEIPT_PASS');
  equal([receipt.planSha256,receipt.sourceSha,receipt.packageBuildId],[digest(hostingPlan),hostingPlan.sourceSha,hostingPlan.packageBuildId],'HOSTING_RECEIPT_BINDING');
  equal(receipt.packageArtifact,hostingPlan.packageArtifact,'HOSTING_RECEIPT_PACKAGE');preview.objectRef(receipt.proof);
  return {schema:C.bindingSchema,requestVersion:hostingPlan.requestVersion,mechanism:mechanismManifest(cwd,hostingPlan.sourceSha,mechanismSha),
    hostingPlan,hostingBuildId:receipt.executionBuildId,hostingProof:receipt.proof,hostingVersion:receipt.hostingVersion};
}
function makePlan(cwd,phase){
  need(PHASES.includes(phase),'PHASE');const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  const control=json(path.join(cwd,g.CONTROL)),p=g.candidateForPhase(control,phase);assertCompositeFresh(p,json(path.join(cwd,C.control)),(ref,f)=>git(cwd,'rev-parse',ref+':'+f));validateBinding(p);
  const authorityHead=git(cwd,'rev-parse','HEAD');equal(git(cwd,'status','--porcelain','--untracked-files=no'),'','CLEAN_AUTHORITY_CHECKOUT');
  verifyPinnedOwners(p,{head:authorityHead,cwd});
  const workflow=phase==='preview'?C.previewWorkflow:C.liveWorkflow,bytes=gitBytes(cwd,p.sourceSha,workflow),blocks=workflowBlocks(bytes.toString(),phase);runtimeBlocks(blocks,phase);
  workflowTimeoutMs(bytes.toString(),phase,p.makeIngressComposite===true);
  equal(gitBytes(cwd,authorityHead,workflow),bytes,'ORIGINAL_WORKFLOW_UNCHANGED');
  const financial='artifacts/orbit360-recovery/release-control/I6_6_FRONTEND_PROMOTION_AUTHORITY.json';
  const raw=json(path.join(cwd,financial));equal(raw.releaseScope,'COMPOSITE','FINANCIAL_COMPOSITE_SCOPE');equal(raw.scopeId,'SIX_RECEIPT_CURRENT_BALANCE_READONLY','FINANCIAL_SCOPE');
  equal(raw.target.executionProvider,C.provider,'FINANCIAL_NATIVE_TARGET');
  for(const k of ['sourceSha','buildId','artifactId','artifactDigest','buildRunId'])equal(raw.target[k],p[k],'FINANCIAL_TARGET');
  return validatePlan({schema:C.planSchema,provider:C.provider,phase,repository:C.repository,branch:C.branch,projectId:C.projectId,projectNumber:C.projectNumber,region:C.region,serviceAccount:C.serviceAccount,bucket:C.bucket,
    authorityHead,candidateSha256:digest(p),mechanismSha:p.providerBinding.mechanism.commit,sourceSha:p.sourceSha,requestVersion:p.providerBinding.requestVersion,
    transportBlob:blob(gitBytes(cwd,authorityHead,g.CONTROL)),financialAuthorityBlob:blob(gitBytes(cwd,authorityHead,financial)),workflowBlob:blob(bytes),
    blocks:Object.fromEntries(Object.entries(blocks).map(([k,v])=>[k,sha(v)]))});
}
function validatePackageMetadata(p,run,artifact){
  const b=validateBinding(p),h=b.hostingPlan;pkg.validateBuild(h.packagePlan,run);equal(run.id,p.buildRunId,'PACKAGE_EXECUTION_ID');
  const a=h.packageArtifact;equal([artifact.bucket,artifact.name,String(artifact.generation),Number(artifact.size),artifact.sha256],
    [C.bucket,a.uri.slice(('gs://'+C.bucket+'/').length),a.generation,a.bytes,a.sha256],'PACKAGE_ACTUAL_OBJECT');return true;
}
function planFromBuild(build){need(build?.steps?.[1]?.args?.[0]===C.tool&&build.steps[1].args[1]==='worker','REAL_NATIVE_EXECUTOR');return validatePlan(JSON.parse(build.steps[1].args[2]));}
function validatePreviewMetadata(p,build,artifact){
  validateBinding(p);const q=p.previewQa;equal(q?.executionProvider,C.provider,'PREVIEW_EVIDENCE_PROVIDER');const plan=planFromBuild(build);validateBuild(plan,build);
  equal([build.id,plan.phase,plan.authorityHead,plan.sourceSha,plan.mechanismSha,plan.requestVersion],
    [q.runId,'preview',q.headSha,p.sourceSha,p.providerBinding.mechanism.commit,p.providerBinding.requestVersion],'PREVIEW_ACTUAL_EXECUTION');
  const ref=artifactRef(q.receiptArtifactId);equal(ref.uri,'gs://'+C.bucket+'/'+prefix(plan,build.id)+F.signed,'PREVIEW_PROOF_LOCATION');
  equal([artifact.bucket,artifact.name,String(artifact.generation),'sha256:'+artifact.sha256],[C.bucket,ref.uri.slice(('gs://'+C.bucket+'/').length),ref.generation,q.receiptArtifactDigest],'PREVIEW_PROOF_OBJECT');
  if(q.planSha256!==undefined)equal(q.planSha256,digest(plan),'PREVIEW_PLAN_DIGEST');return plan;
}
async function readNativeFiles(plan,build,io,out,{names=F,prefixFor=prefix,validate=validateBuild}={}){
  validate(plan,build);fs.mkdirSync(out,{recursive:false});write(path.join(out,'cloud-build.json'),build);
  const stem=prefixFor(plan,build.id),manifestName=stem+'artifacts-'+build.id+'.json',providerGeneration=build.results.artifactManifest.split('#')[1];
  const mm=await io.metadata(manifestName,providerGeneration);equal([mm.bucket,mm.name],[C.bucket,manifestName],'ACTUAL_NATIVE_MANIFEST');pkg.validateObjectTime(build,mm);if(providerGeneration)equal(String(mm.generation),providerGeneration,'MANIFEST_GENERATION');
  const data=await io.bytes(manifestName,String(mm.generation));equal(data.length,Number(mm.size),'MANIFEST_SIZE');write(path.join(out,'artifact-manifest.json'),data);
  const decoded=pkg.parseArtifactManifest(data),rows=Array.isArray(decoded)?decoded:decoded?.artifacts;need(Array.isArray(rows),'MANIFEST_ROWS');equal(rows.length,Object.keys(names).length,'EXACT_NATIVE_MEMBERS');const files={},objects={};
  for(const row of rows){const start='gs://'+C.bucket+'/'+stem;need(row.location?.startsWith(start),'NATIVE_MEMBER_LOCATION');const match=/^([^/#]+)#([1-9][0-9]{0,24})$/.exec(row.location.slice(start.length));need(match&&Object.values(names).includes(match[1])&&!Object.hasOwn(files,match[1]),'NATIVE_MEMBER_CLOSED_SET');
    const meta=await io.metadata(stem+match[1],match[2]);equal([meta.bucket,meta.name,String(meta.generation)],[C.bucket,stem+match[1],match[2]],'NATIVE_OBJECT_METADATA');pkg.validateObjectTime(build,meta);
    const bytes=await io.bytes(meta.name,match[2]);equal(bytes.length,Number(meta.size),'OBJECT_SIZE');const md5=crypto.createHash('md5').update(bytes).digest('hex'),b64=Buffer.from(md5,'hex').toString('base64');need([md5,b64].includes(pkg.nativeArtifactMd5(row)),'NATIVE_OBJECT_MD5');if(meta.md5Hash)equal(meta.md5Hash,b64,'GCS_OBJECT_MD5');
    files[match[1]]=bytes;objects[match[1]]=meta;write(path.join(out,match[1]),bytes);}
  return {files,objects,manifest:{uri:'gs://'+C.bucket+'/'+manifestName,generation:String(mm.generation),sha256:sha(data)}};
}
async function readPreviewAcceptance(p,io,out){
  const q=p.previewQa;need(q?.executionProvider===C.provider,'PREVIEW_NATIVE_PROOF_REQUIRED');const build=await io.api('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+q.runId);
  const plan=planFromBuild(build),e=await readNativeFiles(plan,build,io,out),signed=JSON.parse(e.files[F.signed]);
  validatePreviewMetadata(p,build,{...e.objects[F.signed],sha256:sha(e.files[F.signed])});
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');g.validateProof(p,signed);equal([signed.runId,signed.headSha],[q.runId,q.headSha],'PREVIEW_SIGNED_EXECUTION');
  await validateOperationalProof(plan,build,e,io);return {...e,build,plan,signed};
}
async function verifiedPackage(p,out){validateBinding(p);const io=await preview.cloudIo(await sdkHeaders());return preview.readPackage(p.providerBinding.hostingPlan,io,out);}
async function admitRuntime(p,phase){
  const runtime=await verifyRuntimeAuthority(p,{phase,action:'admit'}),root=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'i66-native-admission-'));
  const io=await preview.cloudIo(await sdkHeaders()),e=await preview.readPackage(p.providerBinding.hostingPlan,io,path.join(root,'package'));
  validatePackageMetadata(p,e.build,{...e.objects[pkg.F.archive],sha256:sha(e.files[pkg.F.archive])});
  const h=preview.verify(p.providerBinding.hostingPlan,p.providerBinding.hostingBuildId,path.join(root,'hosting'));
  equal(h.proof,p.providerBinding.hostingProof,'HOSTING_PROVIDER_PROOF');equal(h.hostingVersion,p.providerBinding.hostingVersion,'HOSTING_PROVIDER_VERSION');
  if(phase==='live')await readPreviewAcceptance(p,io,path.join(root,'signed-preview'));
  return {...runtime,package:e,hosting:h};
}
async function packageTarForBinding(binding){
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs'),control=json(g.CONTROL);
  const p=g.candidateForPhase(control,control.status==='OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED'?'live':'preview');validateBinding(p);
  await verifyRuntimeAuthority(p,{phase:control.status==='OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED'?'live':'preview',action:'verify-preview'});
  const temp=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'i66-native-hosting-bytes-')),io=await preview.cloudIo(await sdkHeaders());
  if(provider(binding)){
    for(const key of ['sourceSha','buildId','buildRunId','artifactId','artifactDigest'])equal(binding[key],p[key],'HOSTING_SAME_CANDIDATE');
    const e=await preview.readPackage(p.providerBinding.hostingPlan,io,path.join(temp,'current'));return e.files[pkg.F.archive];
  }
  for(const key of ['sourceSha','buildId','buildRunId','artifactId','artifactDigest'])equal(binding[key],p.currentLive[key],'EXACT_PREVIOUS_LIVE_BACKUP');
  const ref=p.providerBinding.hostingPlan.imports.live,data=(await io.object(ref)).data;
  const dir=path.join(temp,'previous');preview.unpackHistorical(data,dir,'live');return fs.readFileSync(path.join(dir,pkg.F.archive));
}
async function signedCasIo(runtime,{storage}={}){
  need(runtime.executionProvider===C.provider&&uuid(runtime.buildId)&&runtime.phase==='live','SIGNED_CAS_REAL_LIVE_RUNTIME');
  const io=storage||await preview.cloudIo(await sdkHeaders());
  return {
    async retainOnce({bucket,name,ifGenerationMatch,bytes,contentType}){equal(bucket,C.bucket,'SIGNED_CAS_PRIVATE_BUCKET');equal(ifGenerationMatch,0,'SIGNED_CAS_CREATE_ONCE');need(name.startsWith('i66/signed-cas/'+runtime.buildId+'/'),'SIGNED_CAS_EXECUTION_PREFIX');
      const ref=await io.retain(name,bytes,contentType);return {bucket,name,generation:ref.generation,sha256:ref.sha256,size:ref.bytes};},
    async readObjectExact(ref){equal(ref.bucket,C.bucket,'SIGNED_CAS_READ_BUCKET');const meta=await io.metadata(ref.name,ref.generation);equal([meta.bucket,meta.name,String(meta.generation),Number(meta.size)],[C.bucket,ref.name,ref.generation,ref.bytes],'SIGNED_CAS_READ_METADATA');
      const bytes=await io.bytes(ref.name,ref.generation);equal(sha(bytes),ref.sha256,'SIGNED_CAS_READ_SHA');return {generation:ref.generation,bytes};},
    emit:ref=>console.log('I66_NATIVE_SIGNED_CAS_REQUIRED '+JSON.stringify(ref))
  };
}
function candidateAt(plan,cwd=process.cwd()){
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs'),bytes=gitBytes(cwd,plan.authorityHead,g.CONTROL);equal(blob(bytes),plan.transportBlob,'AUTHORITY_TRANSPORT_BLOB');
  const p=g.candidateForPhase(JSON.parse(bytes),plan.phase);equal(digest(p),plan.candidateSha256,'AUTHORITY_CANDIDATE_DIGEST');equal(p.sourceSha,plan.sourceSha,'AUTHORITY_PRODUCT_SOURCE');return p;
}
function mandatoryChecks(phase){return phase==='preview'?['gate','marker','backend','deploy','signed','seal','financial','mechanism']:['gate','proof','backend','signedPreview','snapshot','deploy','mechanism'];}
async function validateOperationalProof(plan,build,e,io){
  validateBuild(plan,build);const p=candidateAt(plan),proof=JSON.parse(e.files[F.proof]),signed=JSON.parse(e.files[F.signed]),financial=JSON.parse(e.files[F.financial]);
  equal([proof.schema,proof.executionProvider,proof.phase,proof.status],[C.proofSchema,C.provider,plan.phase,plan.phase==='preview'?'SIGNED_PREVIEW_AND_FINANCIAL48_PASS_LIVE_PENDING':'COMMITTED_SAME_ARTIFACT_SIGNED_LIVE_AND_FINANCIAL48_PASS'],'PROOF_REAL_SCOPE');
  equal([proof.buildId,proof.sourceSha,proof.authorityHead,proof.mechanismSha,proof.planSha256],[build.id,plan.sourceSha,plan.authorityHead,plan.mechanismSha,digest(plan)],'PROOF_EXECUTION_BINDING');
  equal([proof.packageBuildId,proof.artifactId,proof.artifactDigest],[p.buildRunId,p.artifactId,p.artifactDigest],'PROOF_SAME_PACKAGE');
  equal(Object.keys(proof.fileHashes||{}).sort(),Object.values(F).filter(n=>n!==F.proof).sort(),'ALL_PROOF_FILE_HASHES');for(const [name,hash] of Object.entries(proof.fileHashes))equal(hash,sha(e.files[name]),'EXACT_PROOF_BYTES');
  equal(Object.keys(proof.checks||{}).sort(),mandatoryChecks(plan.phase).sort(),'ALL_EXECUTED_GATES');
  const workflow=gitBytes(process.cwd(),plan.sourceSha,plan.phase==='preview'?C.previewWorkflow:C.liveWorkflow);equal(blob(workflow),plan.workflowBlob,'PROVEN_ORIGINAL_WORKFLOW');
  const originals=workflowBlocks(workflow.toString(),plan.phase),blocks=runtimeBlocks(originals,plan.phase);
  for(const [name,check] of Object.entries(proof.checks)){
    equal([check.status,check.exitCode],['PASS',0],'GATE_ACTUALLY_PASSED');need(Date.parse(check.startedAt)>=Date.parse(build.startTime)&&Date.parse(check.endedAt)>=Date.parse(check.startedAt)&&Date.parse(check.endedAt)<=Date.parse(build.finishTime),'GATE_WITHIN_REAL_EXECUTION');
    if(blocks[name])equal([check.signedBlockSha256,check.executedBlockSha256],[sha(originals[name]),sha(blocks[name])],'LITERAL_GATE_ADAPTER');
  }
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  if(plan.phase==='preview')g.validateProof(p,signed);else g.validateLiveProof(p,signed);
  equal([signed.executionProvider,signed.runId,signed.headSha],[C.provider,build.id,plan.authorityHead],'SIGNED_PROOF_NATIVE_EXECUTION');
  const owner=require('./gravicentra-i66-frontend-promotion-owner.cjs'),target=owner.financialTarget({...p,previewChannel:p.previewChannelId});
  owner.validateFinancialReport(financial,target,plan.phase,{authorityBlob:plan.financialAuthorityBlob,physicalPhaseKey:plan.phase==='live'?financial.frontendQaBefore?.physicalPhaseKey:null,releaseScope:'COMPOSITE',parentAuthorityBlob:plan.transportBlob});
  equal([financial.executionProvider,financial.frontendQaBefore?.runId,financial.workflowHeadSha],[C.provider,build.id,plan.authorityHead],'FINANCIAL_NATIVE_EXECUTION');
  equal(proof.financial,{stageCount:48,reportSha256:sha(e.files[F.financial]),execution:plan.phase==='preview'?'EXACT_READONLY_DRIVER':'COMPOSITE_VERIFIED_TRANSACTION'},'FINANCIAL_REAL_PROOF');
  equal(proof.realCustomerWrites,0,'NO_REAL_CUSTOMER_WRITES');equal(proof.realFinancialWrites,0,'NO_REAL_FINANCIAL_WRITES');equal(proof.fullI66ProductionAccepted,false,'NO_FULL_SCOPE_OVERCLAIM');
  const claimRef=proof.claim;preview.objectRef(claimRef);equal(claimRef.uri,'gs://'+C.bucket+'/'+lockName(p,plan.phase),'EXACT_OPERATIONAL_CLAIM');
  const claim=await io.object(claimRef);pkg.validateObjectTime(build,claim.meta);const c=JSON.parse(claim.data);equal(c,{schema:'GI_I66_NATIVE_OPERATIONAL_CLAIM_V1',executionProvider:C.provider,buildId:build.id,phase:plan.phase,sourceSha:p.sourceSha,artifactId:p.artifactId,artifactDigest:p.artifactDigest,authorityHead:plan.authorityHead,planSha256:digest(plan),candidateSha256:plan.candidateSha256},'ACTUAL_OPERATIONAL_CLAIM');
  need(Date.parse(claim.meta.timeCreated)<=Date.parse(proof.checks.deploy.startedAt),'CLAIM_BEFORE_DEPLOY');
  const logName='i66/cloud-build-logs/log-'+build.id+'.txt',meta=await io.metadata(logName),log=await io.bytes(logName,String(meta.generation));equal([meta.bucket,meta.name],[C.bucket,logName],'NATIVE_EXECUTION_LOG');
  const marker='I66_NATIVE_OPERATIONAL_READY_FOR_PROVIDER_RETENTION ',lines=log.toString('utf8').split(/\r?\n/).filter(x=>x.includes(marker));equal(lines.length,1,'UNIQUE_PROVIDER_LOG_MARKER');
  equal(JSON.parse(lines[0].slice(lines[0].indexOf(marker)+marker.length)),{buildId:build.id,phase:plan.phase,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,planSha256:digest(plan),status:proof.status},'REAL_EXECUTION_LOG_BINDING');
  if(plan.phase==='live'){need(sha40(proof.committed?.head)&&sha40(proof.committed?.receiptCommit)&&sha40(proof.committed?.receiptBlob),'COMMITTED_NATIVE_READBACK');equal(proof.committed.phase,'COMMITTED','TRANSACTION_ACTUALLY_COMMITTED');}
  return {proof,signed,financial,plan,build,log:{name:logName,generation:String(meta.generation),sha256:sha(log)}};
}
async function readFinancialPreview(qa,target,{releaseScope,parentAuthorityBlob}={}){
  equal(qa.executionProvider,C.provider,'FINANCIAL_EVIDENCE_PROVIDER');need(uuid(qa.qaRunId),'FINANCIAL_EXECUTION_UUID');const io=await preview.cloudIo(await sdkHeaders());
  const b=await io.api('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+qa.qaRunId),plan=planFromBuild(b);equal(plan.phase,'preview','FINANCIAL_PREVIEW_PHASE');
  const dir=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'i66-native-financial-')),e=await readNativeFiles(plan,b,io,path.join(dir,'proof'));
  await validateOperationalProof(plan,b,e,io);const file=e.files[F.financial],meta=e.objects[F.financial];
  equal([qa.qaArtifactId,qa.qaArtifactDigest,qa.qaReportSha256],['gs://'+C.bucket+'/'+meta.name+'#'+meta.generation,'sha256:'+sha(file),sha(file)],'FINANCIAL_EXACT_GCS_PROOF');
  const report=JSON.parse(file);require('./gravicentra-i66-frontend-promotion-owner.cjs').validateFinancialReport(report,target,'preview',{authorityBlob:qa.previewReadOnlyAuthorityBlob,releaseScope,parentAuthorityBlob});
  equal([report.workflowHeadSha,report.frontendQaBefore.runId],[plan.authorityHead,b.id],'FINANCIAL_ACTUAL_EXECUTOR');return report;
}
function lockName(p,phase){need(PHASES.includes(phase),'CLAIM_PHASE');return 'i66/operational-locks/request-'+p.providerBinding.requestVersion+'-'+phase+'-'+p.sourceSha+'-'+p.artifactDigest.slice(7)+'.json';}
const ENV_OUTPUTS=Object.freeze(['I66_PACKAGE_ROOT','I66_ROLE_PREVIEW_FIREBASE_CONFIG','I66_LIVE_FIREBASE_CONFIG','I66_ROLE_ROLLBACK_HOSTING_VERSION']);
function consumeNativeEnv(file,env){
  const rows=fs.existsSync(file)?fs.readFileSync(file,'utf8').split('\n').filter(Boolean):[];
  const seen=new Set();for(const row of rows){const match=/^([A-Z0-9_]+)=([^\r\n]+)$/.exec(row);need(match&&ENV_OUTPUTS.includes(match[1])&&!seen.has(match[1]),'CLOSED_ENV_OUTPUT');seen.add(match[1]);
    if(match[1]==='I66_ROLE_ROLLBACK_HOSTING_VERSION')need(/^[A-Za-z0-9_-]+$/.test(match[2]),'ROLLBACK_VERSION_OUTPUT');
    else need(match[2].startsWith(env.RUNNER_TEMP+'/')&&!match[2].split('/').includes('..'),'PACKAGE_PATH_OUTPUT');env[match[1]]=match[2];}
  fs.writeFileSync(file,'',{mode:0o600});return env;
}
function branchGuard(p,plan,cwd){
  git(cwd,'fetch','--quiet',C.repositoryUrl,'refs/heads/'+C.branch);const head=git(cwd,'rev-parse','FETCH_HEAD');
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs'),tr=JSON.parse(gitBytes(cwd,head,g.CONTROL));
  assertCompositeFresh(p,JSON.parse(gitBytes(cwd,head,C.control)),(ref,f)=>git(cwd,'rev-parse',ref+':'+f));equal(g.candidateForPhase(tr,plan.phase),p,'CURRENT_CANONICAL_AUTHORIZATION');verifyPinnedOwners(p,{head,cwd});
  equal(blob(gitBytes(cwd,head,'artifacts/orbit360-recovery/release-control/I6_6_FRONTEND_PROMOTION_AUTHORITY.json')),plan.financialAuthorityBlob,'CURRENT_FINANCIAL_AUTHORITY');return head;
}
async function retainMake(phase){
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs'),p=g.candidateForPhase(json(g.CONTROL),phase),runtime=await verifyRuntimeAuthority(p,{phase,action:'initialize-closed'});
  const file=path.join(process.env.RUNNER_TEMP,'gi-make-'+phase+'-initialize-closed.json');need(fs.existsSync(file),'CLOSED_RECEIPT_REQUIRED');
  const io=await preview.cloudIo(await sdkHeaders()),ref=await io.retain('i66/operational-attempts/'+runtime.buildId+'/'+path.basename(file),fs.readFileSync(file),'application/json');
  console.log('I66_NATIVE_MAKE_CLOSED_RETAINED '+JSON.stringify(ref));return ref;
}
async function worker(plan){
  validatePlan(plan);equal(process.versions.node.split('.')[0],'22','NODE22_REQUIRED');const cwd=process.cwd(),head=git(cwd,'rev-parse','HEAD');equal(head,plan.authorityHead,'EXECUTING_AUTHORITY_HEAD');
  equal(git(cwd,'status','--porcelain','--untracked-files=no'),'','CLEAN_EXECUTING_CHECKOUT');write(path.join(cwd,'.i66-native-plan.json'),plan);
  const identity=await auth.verifyCloudBuildRuntime();ensureHistory(plan,{cwd});
  const p=candidateAt(plan,cwd),g=require('./gravicentra-i6-6-operational-release-candidate.cjs');g.assertDirectFormsPersonalAuthority(p,plan.phase.toUpperCase());
  const runtime=await verifyRuntimeAuthority(p,{phase:plan.phase,action:'worker'});
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'i66-native-'+plan.phase+'-'));
  const env={...process.env,...Object.fromEntries(Object.entries(g.envFor(p)).map(([k,v])=>[k,String(v)])),RUNNER_TEMP:temp,SITE:C.projectId,
    I66_NATIVE_ENV_FILE:path.join(temp,'provider-output.env'),I66_FROZEN_SOURCE_ROOT:path.join(temp,'source'),
    PATH:path.join(cwd,'.i66-provider/google-cloud-sdk/bin')+':'+process.env.PATH};
  Object.assign(process.env,env);write(env.I66_NATIVE_ENV_FILE,'');
  const sdk=json(path.join(cwd,'.i66-provider/version.json'));need(Number(String(sdk['Google Cloud SDK']||'').split('.')[0])>=483,'GCLOUD_SUPPORTED_VERSION');
  const workflow=gitBytes(cwd,p.sourceSha,plan.phase==='preview'?C.previewWorkflow:C.liveWorkflow);equal(blob(workflow),plan.workflowBlob,'SIGNED_WORKFLOW_BLOB');
  const original=workflowBlocks(workflow.toString(),plan.phase),blocks=runtimeBlocks(original,plan.phase);
  equal(Object.fromEntries(Object.entries(original).map(([k,v])=>[k,sha(v)])),plan.blocks,'SIGNED_WORKFLOW_BLOCKS');
  const checks={},log=path.join(cwd,F.log);write(log,'');
  const command=(file,args,opts={})=>pkg.execLogged(file,args,{cwd:opts.cwd||cwd,env:{...env,...opts.env},log,append:true,timeoutMs:opts.timeoutMs});
  const shell=name=>{const timeoutMs=name==='deploy'?deploymentTimeoutMs(workflow.toString(),plan.phase,p.makeIngressComposite===true,runtime.build):undefined;
    checks[name]={...command('bash',['-euo','pipefail','-c',blocks[name]],{timeoutMs}),signedBlockSha256:sha(original[name]),executedBlockSha256:sha(blocks[name])};consumeNativeEnv(env.I66_NATIVE_ENV_FILE,env);Object.assign(process.env,env);};
  // Every historical guard still sees the exact full source commit. This clone
  // is validation input only; the package is never rebuilt or overlaid.
  command('git',['clone','--quiet','--single-branch','--branch',C.branch,'--no-tags',C.repositoryUrl,env.I66_FROZEN_SOURCE_ROOT]);
  command('git',['checkout','--quiet','--detach',p.sourceSha],{cwd:env.I66_FROZEN_SOURCE_ROOT});
  equal(git(env.I66_FROZEN_SOURCE_ROOT,'rev-parse','HEAD'),p.sourceSha,'FROZEN_SOURCE_CLONE');
  command('npm',['install','--no-save','--package-lock=false','--ignore-scripts','--no-audit','--no-fund','google-auth-library@10.9.1','firebase-admin@13.4.0','playwright@1.55.0']);
  command('node',['node_modules/playwright/cli.js','install','--with-deps','chromium']);
  const cliRoot=path.join(temp,'firebase-cli');command('npm',['install','--prefix',cliRoot,'--no-save','--ignore-scripts','--no-audit','--no-fund','firebase-tools@14.10.1']);
  command('node',['tools/gravicentra-firebase-tools-empty-extensions-workaround-v1.mjs',cliRoot]);
  const cli=path.join(cliRoot,'node_modules/firebase-tools/lib/bin/firebase.js');env.FIREBASE_CLI_BIN=cli;env.I66_ROLE_FIREBASE_CLI=cli;Object.assign(process.env,env);
  const tests=Object.keys(p.providerBinding.mechanism.files).filter(x=>x.endsWith('.test.cjs'));
  need(tests.includes(C.test)&&tests.includes('tools/gravicentra-i66-signed-qa-runtime-auth.test.cjs'),'NATIVE_MECHANISM_TESTS_REQUIRED');
  checks.mechanism=pkg.execLogged(process.execPath,['--test',...tests],{cwd,env,log:path.join(cwd,F.mechanism)});
  const admitted=await admitRuntime(p,plan.phase),archive=admitted.package.files[pkg.F.archive];equal(sha(archive),p.artifactDigest.slice(7),'PACKAGE_DIGEST_NO_REBUILD');
  const archiveDir=path.join(temp,plan.phase==='preview'?'gi-role-artifact':'gi-i66-role-live-archive');fs.mkdirSync(archiveDir);write(path.join(archiveDir,pkg.F.archive),archive);write(path.join(archiveDir,pkg.F.digest),admitted.package.files[pkg.F.digest]);
  if(plan.phase==='live'){
    const io=await preview.cloudIo(await sdkHeaders()),dir=path.join(temp,'native-preview-proof'),qa=await readPreviewAcceptance(p,io,dir);
    const target=path.join(temp,'gi-i66-operational-preview-proof');fs.mkdirSync(target);write(path.join(target,'i66-operational-preview-proof.json'),qa.files[F.signed]);
  }
  shell('gate');if(plan.phase==='preview')shell('marker');else shell('proof');shell('backend');
  const beforeName=plan.phase==='preview'?'gi-role-functions-before.json':'gi-role-live-functions-before.json';
  const before=spawnSync(process.execPath,[cli,'functions:list','--project',C.projectId,'--non-interactive','--json'],{cwd,env,encoding:'utf8',maxBuffer:8*1024*1024,timeout:60000});need(!before.error&&before.status===0,'FUNCTIONS_BEFORE_READ');write(path.join(temp,beforeName),before.stdout);JSON.parse(before.stdout);
  if(plan.phase==='preview')command('bash',['-euo','pipefail','-c','for o in https://ays-orbit-360-lab.web.app https://app.aysseguros.com;do curl -fsSL --max-time 30 "$o/" | sha256sum;done > "$RUNNER_TEMP/gi-role-live-before.sha"']);
  else{
    command(process.execPath,['tools/gravicentra-i66-frontend-promotion-owner.cjs','--verify-composite-financial-preview']);
    shell('signedPreview');shell('snapshot');
  }
  branchGuard(p,plan,cwd);const claimValue={schema:'GI_I66_NATIVE_OPERATIONAL_CLAIM_V1',executionProvider:C.provider,buildId:identity.buildId,phase:plan.phase,sourceSha:p.sourceSha,artifactId:p.artifactId,artifactDigest:p.artifactDigest,authorityHead:plan.authorityHead,planSha256:digest(plan),candidateSha256:plan.candidateSha256};
  let io=await preview.cloudIo(await sdkHeaders());const claim=await io.retain(lockName(p,plan.phase),Buffer.from(JSON.stringify(claimValue)+'\n'),'application/json');
  const retainedBefore={};
  try{
  for(const file of [beforeName,...(plan.phase==='preview'?['gi-role-live-before.sha']:['gi-role-live-old-revisions.tsv','gi-role-live-before-hosting.json','gi-make-live-snapshot-trigger.json'])]){
    const bytes=fs.readFileSync(path.join(temp,file));retainedBefore[file]=await io.retain('i66/operational-attempts/'+identity.buildId+'/before-'+file,bytes);
  }
  // Recheck branch/pins after durable preimages and immediately before the
  // original deploy block. Runtime owner also gates every Make transition.
  branchGuard(p,plan,cwd);await verifyRuntimeAuthority(p,{phase:plan.phase,action:'worker'});
    // Child output stays in the private execution artifact. Publish only the
    // safe prefixes now so an authenticated operator can observe a pending
    // Make/CAS handoff while the original deploy block is still running.
    console.log('I66_NATIVE_PRIVATE_HANDOFF_PREFIXES '+JSON.stringify({buildId:identity.buildId,phase:plan.phase,signedCas:'gs://'+C.bucket+'/i66/signed-cas/'+identity.buildId+'/',make:'gs://'+C.bucket+'/i66/operational-attempts/'+identity.buildId+'/'}));
    shell('deploy');
    if(plan.phase==='preview'){
      await retainMake('preview');
      command(process.execPath,['tools/gravicentra-i66-make-lead-protected-executor.cjs','wait-probe','preview']);
      io=await preview.cloudIo(await sdkHeaders());const principalFile=path.join(temp,'gi-make-preview-closed-trigger.json');
      const principal=await io.retain('i66/operational-attempts/'+identity.buildId+'/gi-make-preview-closed-trigger.json',fs.readFileSync(principalFile),'application/json');console.log('I66_NATIVE_MAKE_AUTH_CONTEXT_RETAINED '+JSON.stringify(principal));
      command(process.execPath,['tools/gravicentra-i66-make-lead-protected-executor.cjs','wait-config','preview']);
      shell('signed');shell('seal');
      const financialFile=path.join(temp,'gi-i66-native-preview-financial.json');checks.financial=command(process.execPath,['tools/gravicentra-i66-live-performance-readonly.mjs'],{env:{GI_I66_PERF_PROJECT:C.projectId,GI_I66_PERF_TENANT:'alianzas-soluciones',GI_I66_PERF_PHASE:'preview',GI_I66_READONLY_MODE:'six-frontend-release',GI_I66_PERF_REPORT:financialFile}});
      write(path.join(cwd,F.financial),fs.readFileSync(financialFile));write(path.join(cwd,F.signed),fs.readFileSync(path.join(temp,'i66-operational-preview-proof.json')));
    }else{
      write(path.join(cwd,F.financial),fs.readFileSync(path.join(temp,'gi-i66-composite-live-financial-'+identity.buildId+'.json')));
      write(path.join(cwd,F.signed),fs.readFileSync(path.join(temp,'i66-role-live-exact-proof.json')));
    }
    equal(sha(fs.readFileSync(path.join(archiveDir,pkg.F.archive))),p.artifactDigest.slice(7),'CERTIFIED_ARCHIVE_STAYED_IMMUTABLE');
    equal(git(cwd,'diff','--name-only','--',...PRODUCT_PATHS),'','PRODUCT_WORKING_TREE_STAYED_UNCHANGED');
    const signed=json(path.join(cwd,F.signed)),financial=json(path.join(cwd,F.financial));
    if(plan.phase==='preview')g.validateProof(p,signed);else g.validateLiveProof(p,signed);
    const owner=require('./gravicentra-i66-frontend-promotion-owner.cjs');owner.validateFinancialReport(financial,owner.financialTarget({...p,previewChannel:p.previewChannelId}),plan.phase,{authorityBlob:plan.financialAuthorityBlob,physicalPhaseKey:plan.phase==='live'?financial.frontendQaBefore?.physicalPhaseKey:null,releaseScope:'COMPOSITE',parentAuthorityBlob:plan.transportBlob});
    let committed;
    if(plan.phase==='live'){
      git(cwd,'fetch','--quiet',C.repositoryUrl,'refs/heads/'+C.branch);const h=git(cwd,'rev-parse','FETCH_HEAD'),control=JSON.parse(gitBytes(cwd,h,C.control)),head=control.i66FrontendReleaseHead;
      const jp=require('./gravicentra-i66-frontend-control.cjs').genName(head.generation,'JOURNAL'),journal=JSON.parse(gitBytes(cwd,h,jp));
      equal(journal.phase,'COMMITTED','FINAL_TRANSACTION_COMMITTED');equal(journal.liveProof,signed,'FINAL_SIGNED_LIVE_PROOF');equal(head.sourceSha,p.sourceSha,'FINAL_PHYSICAL_SOURCE');
      const signedCommit=await pkg.requestJson('https://api.github.com/repos/'+C.repository+'/commits/'+journal.receipt.commit,{headers:{Accept:'application/vnd.github+json'}},{operation:'PROVIDER_JSON'});equal(signedCommit.commit?.verification?.verified,true,'FINAL_GITHUB_SIGNATURE');
      committed={head:h,phase:'COMMITTED',receiptCommit:journal.receipt.commit,receiptBlob:journal.receipt.blob,generation:journal.generation};
    }
    const evidence=path.join(temp,'native-evidence');fs.mkdirSync(evidence);
    // Private evidence is a closed set of generated diagnostic/receipt files;
    // dependency trees, credentials, caches and raw environment are excluded.
    for(const file of fs.readdirSync(temp).filter(n=>/^(?:gi-|i66-|gravicentra-)[A-Za-z0-9_.-]+\.(?:json|log|sha|tsv)$/.test(n))){const source=path.join(temp,file);if(fs.lstatSync(source).isFile())fs.copyFileSync(source,path.join(evidence,file));}
    const proposal=path.join(env.I66_PACKAGE_ROOT,'evidence','i66-proposal-application-signed-uat-'+plan.phase+'.json');fs.copyFileSync(proposal,path.join(evidence,path.basename(proposal)));
    write(path.join(evidence,'native-retained-before.json'),retainedBefore);write(path.join(evidence,'native-cli-version.json'),sdk);
    execFileSync('tar',['-czf',path.join(cwd,F.evidence),'-C',evidence,'.'],{stdio:'pipe'});
    const proof={schema:C.proofSchema,executionProvider:C.provider,phase:plan.phase,status:plan.phase==='preview'?'SIGNED_PREVIEW_AND_FINANCIAL48_PASS_LIVE_PENDING':'COMMITTED_SAME_ARTIFACT_SIGNED_LIVE_AND_FINANCIAL48_PASS',
      buildId:identity.buildId,sourceSha:p.sourceSha,authorityHead:plan.authorityHead,mechanismSha:plan.mechanismSha,planSha256:digest(plan),packageBuildId:p.buildRunId,artifactId:p.artifactId,artifactDigest:p.artifactDigest,
      claim,checks,financial:{stageCount:48,reportSha256:sha(fs.readFileSync(path.join(cwd,F.financial))),execution:plan.phase==='preview'?'EXACT_READONLY_DRIVER':'COMPOSITE_VERIFIED_TRANSACTION'},
      realCustomerWrites:0,realFinancialWrites:0,fullI66ProductionAccepted:false,...(committed?{committed}:{}),
      fileHashes:Object.fromEntries(Object.values(F).filter(n=>n!==F.proof).map(n=>[n,sha(fs.readFileSync(path.join(cwd,n)))]))};
    write(path.join(cwd,F.proof),proof);console.log('I66_NATIVE_OPERATIONAL_READY_FOR_PROVIDER_RETENTION '+JSON.stringify({buildId:identity.buildId,phase:plan.phase,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,planSha256:digest(plan),status:proof.status}));return proof;
  }catch(error){
    let rollback=null;if(plan.phase==='preview'&&fs.existsSync(path.join(temp,'gi-make-preview-snapshot-trigger.json'))){try{command('bash',['-euo','pipefail','-c',blocks.rollback]);rollback={status:'COMPENSATION_COMMAND_SUCCEEDED',proof:json(path.join(temp,'gi-make-preview-rollback.json'))};}catch(e){rollback={status:'COMPENSATION_HOLD',code:String(e.message).split('\n')[0].slice(0,160)};}}
    const failure={schema:'GI_I66_NATIVE_OPERATIONAL_HOLD_V1',executionProvider:C.provider,buildId:identity.buildId,phase:plan.phase,sourceSha:p.sourceSha,artifactId:p.artifactId,artifactDigest:p.artifactDigest,planSha256:digest(plan),claim,retainedBefore,rollback,code:String(error.message).split('\n')[0].slice(0,200),productionAccepted:false};
    try{io=await preview.cloudIo(await sdkHeaders());for(const [label,file] of [['execution.log',log],['signed-proof.json',path.join(temp,plan.phase==='preview'?'i66-operational-preview-proof.json':'i66-role-live-exact-proof.json')]])if(fs.existsSync(file))await io.retain('i66/operational-attempts/'+identity.buildId+'/hold-'+label,fs.readFileSync(file));const ref=await io.retain('i66/operational-attempts/'+identity.buildId+'/hold.json',Buffer.from(JSON.stringify(failure,null,2)+'\n'),'application/json');console.error('I66_NATIVE_OPERATIONAL_HOLD_RETAINED '+JSON.stringify(ref));}catch{console.error('I66_NATIVE_OPERATIONAL_HOLD_RETENTION_UNCONFIRMED');}
    throw error;
  }
}
function gcloudReadIo(){
  const run=args=>JSON.parse(execFileSync('gcloud',[...args,'--project='+C.projectId,'--format=json'],{encoding:'utf8',maxBuffer:64*1024*1024}));
  const metadata=async(name,gen)=>{need(name.startsWith('i66/')&&!name.split('/').some(x=>!x||x==='.'||x==='..'),'READONLY_GCS_PREFIX');return run(['storage','objects','describe','gs://'+C.bucket+'/'+name+(gen?'#'+gen:''),'--raw']);};
  const bytes=async(name,gen)=>{need(/^[1-9][0-9]{0,24}$/.test(String(gen)),'READONLY_EXACT_GENERATION');return execFileSync('gcloud',['storage','cat','gs://'+C.bucket+'/'+name+'#'+gen,'--project='+C.projectId],{maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});};
  return {metadata,bytes,api:async url=>{const stem='https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/';need(url.startsWith(stem)&&uuid(url.slice(stem.length)),'READONLY_BUILD_API');return run(['builds','describe',url.slice(stem.length),'--region='+C.region]);},
    object:async ref=>{preview.objectRef(ref);const name=ref.uri.slice(('gs://'+C.bucket+'/').length),meta=await metadata(name,ref.generation),data=await bytes(name,ref.generation);equal([meta.bucket,meta.name,String(meta.generation),Number(meta.size),data.length,sha(data)],[C.bucket,name,ref.generation,ref.bytes,ref.bytes,ref.sha256],'READONLY_EXACT_OBJECT');return {meta,data};}};
}
async function verify(plan,id,out){
  validatePlan(plan);need(uuid(id),'VERIFY_REAL_UUID');const io=gcloudReadIo(),b=await io.api('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+id),e=await readNativeFiles(plan,b,io,out);
  const result=await validateOperationalProof(plan,b,e,io),p=candidateAt(plan),object=name=>({uri:'gs://'+C.bucket+'/'+e.objects[name].name,generation:String(e.objects[name].generation),sha256:sha(e.files[name]),bytes:e.files[name].length});
  const receipt={schema:C.receiptSchema,executionProvider:C.provider,status:result.proof.status,phase:plan.phase,sourceSha:p.sourceSha,mechanismSha:plan.mechanismSha,authorityHead:plan.authorityHead,requestVersion:plan.requestVersion,
    executionBuildId:id,packageBuildId:p.buildRunId,artifactId:p.artifactId,artifactDigest:p.artifactDigest,planSha256:digest(plan),
    cloudBuild:{name:b.name,id,status:b.status,serviceAccount:b.serviceAccount,resolvedSource:b.sourceProvenance.resolvedGitSource,stepImages:b.results.buildStepImages,metadataSha256:digest(b),log:result.log},
    proof:object(F.proof),signedProof:object(F.signed),financial:object(F.financial),evidence:object(F.evidence),manifest:e.manifest,
    directFormsChecks:result.signed.focusedReports.directForms.checks,financialStages:48,...(result.proof.committed?{committed:result.proof.committed}:{}),fullI66ProductionAccepted:false};
  write(path.join(out,'receipt.json'),receipt);console.log('I66_NATIVE_OPERATIONAL_RETAINED_READBACK_PASS '+JSON.stringify({phase:plan.phase,buildId:id,status:receipt.status,artifactDigest:p.artifactDigest}));return receipt;
}
// A consumed Cloud Build claim is an immutable pointer to the attempt. Read the
// provider again before planning a retry, including after a lost terminal ACK.
async function observeOperationalClaim(p, phase, io) {
  const name = lockName(p, phase);
  const ref = await io.findClaim(name);
  if (!ref) return null;
  const claim = JSON.parse((await io.object(ref)).data);
  const version = p.providerBinding.requestVersion;
  equal([claim.schema,claim.executionProvider,claim.phase,claim.sourceSha,claim.artifactId,claim.artifactDigest],
    ['GI_I66_NATIVE_OPERATIONAL_CLAIM_V1',C.provider,phase,p.sourceSha,p.artifactId,p.artifactDigest], 'CONSUMED_CLAIM_BINDING');
  need(uuid(claim.buildId) && sha40(claim.authorityHead) && sha64(claim.planSha256), 'CONSUMED_CLAIM_IDENTITY');
  const build = await io.build(claim.buildId);
  equal([build.id,build.projectId,build.source?.gitSource?.revision,build.serviceAccount],
    [claim.buildId,C.projectId,claim.authorityHead,'projects/'+C.projectId+'/serviceAccounts/'+C.serviceAccount], 'TERMINAL_BUILD_IDENTITY');
  if (['PENDING','QUEUED','WORKING'].includes(build.status))
    return {status:'ATTEMPT_RUNNING',buildId:build.id};
  if (build.status === 'SUCCESS') {
    const plan = planFromBuild(build);
    const verified = await io.verifySuccess(plan, build.id);
    equal([verified.sourceSha,verified.artifactDigest,verified.executionBuildId,verified.phase],
      [p.sourceSha,p.artifactDigest,build.id,phase], 'TERMINAL_SIGNED_PROOF');
    return {status:'PROVIDER_SUCCESS_VERIFIED',requestVersion:version,phase,claim:ref,buildId:build.id,
      sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,proof:verified.proof,signedProof:verified.signedProof,
      outcome:verified.status};
  }
  need(['FAILURE','TIMEOUT','CANCELLED','EXPIRED','INTERNAL_ERROR'].includes(build.status), 'KNOWN_TERMINAL_OUTCOME');
  const holdRef = await io.findClaim('i66/operational-attempts/'+build.id+'/hold.json');
  need(holdRef, 'CONSUMED_CLAIM_TERMINAL_HOLD_READBACK_PENDING');
  const hold = JSON.parse((await io.object(holdRef)).data);
  equal([hold.schema,hold.executionProvider,hold.buildId,hold.phase,hold.sourceSha,hold.artifactId,hold.artifactDigest,hold.planSha256,hold.claim],
    ['GI_I66_NATIVE_OPERATIONAL_HOLD_V1',C.provider,build.id,phase,p.sourceSha,p.artifactId,p.artifactDigest,claim.planSha256,ref], 'TERMINAL_HOLD_BINDING');
  const compensated=hold.rollback?.proof?.status==='COMPENSATION_READBACK_VERIFIED';
  return {status:compensated?'PROVIDER_FAILURE_COMPENSATED':'PROVIDER_FAILURE_HOLD',
    requestVersion:version,phase,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,claim:ref,buildId:build.id,
    outcome:build.status,code:hold.code,hold:holdRef};
}

function missingOperationalClaim(stderr,name) {
  const message=String(stderr||'').trim();
  const encoded='gs://'+C.bucket+'/'+encodeURIComponent(name);
  return message.split(/\r?\n/).some(line=>line==='ERROR: (gcloud.storage.objects.describe) '+encoded+' not found: 404.')||
    /HTTPError 404|status.?=.?404|NOT_FOUND|matched no objects/i.test(message);
}
function operationalClaimReader(out) {
  const io=gcloudReadIo();
  return {...io,
    async findClaim(name) {
      const uri='gs://'+C.bucket+'/'+name;
      const call=spawnSync('gcloud',['storage','objects','describe',uri,'--project='+C.projectId,'--raw','--format=json'],
        {encoding:'utf8',maxBuffer:4*1024*1024});
      if(call.status!==0){
        // A permissions or transport error must never be interpreted as an unused claim.
        if(missingOperationalClaim(call.stderr,name))return null;
        throw Error('I66_OPERATIONAL_CLAIM_PROVIDER_UNAVAILABLE');
      }
      const meta=JSON.parse(call.stdout),generation=String(meta.generation);
      equal([meta.bucket,meta.name],[C.bucket,name],'TERMINAL_EXACT_PROVIDER_OBJECT');
      const data=await io.bytes(name,generation);
      return {uri,generation,bytes:data.length,sha256:sha(data)};
    },
    build:id=>io.api('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+id),
    async verifySuccess(plan,id){
      const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'gi-i66-terminal-'));
      try{return await verify(plan,id,path.join(scratch,'readback'));}
      finally{fs.rmSync(scratch,{recursive:true,force:true});}
    }
  };
}
async function reconcileBeforeExecution(phase,out,expectedCandidate) {
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs'),owner=require('./gravicentra-i66-frontend-control.cjs');
  const tr=json(g.CONTROL),fresh=git(process.cwd(),'ls-remote',C.repositoryUrl,'refs/heads/'+C.branch).split(/\s+/)[0];
  equal(fresh,git(process.cwd(),'rev-parse','HEAD'),'RECONCILIATION_REQUIRES_FRESH_AUTHORITY');
  const p=expectedCandidate||g.candidateForPhase(tr,phase),event=await observeOperationalClaim(p,phase,operationalClaimReader(out));
  if(!event)return null;
  if(event.status==='ATTEMPT_RUNNING')return event;
  const change=owner.prepareProviderOutcome(event);
  if(change.status!=='NOOP_ALREADY_RECONCILED')owner.commitProviderOutcome(change);
  return {status:'CONSUMED_CLAIM_RECONCILED',buildId:event.buildId,outcome:event.status};
}

async function runOperationalCycle(phase,out) {
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  const candidate=g.candidateForPhase(json(g.CONTROL),phase);
  const prior=await reconcileBeforeExecution(phase,out,candidate);
  if(prior)return prior;
  const plan=makePlan(process.cwd(),phase);
  fs.mkdirSync(out,{recursive:false});
  const cfg=path.join(out,'cloudbuild.json');
  write(cfg,configFor(plan));write(path.join(out,'plan.json'),plan);
  let failure;
  try{
    execFileSync('gcloud',['builds','submit',C.repositoryUrl,'--git-source-revision='+plan.authorityHead,
      '--region='+C.region,'--project='+C.projectId,'--config='+cfg,'--quiet'],{stdio:'inherit'});
  }catch(error){failure=error;}
  // Poll the actual claim even when submit lost its ACK or exited with failure.
  // The next invocation performs this same reconciliation before any submit.
  const cwd=process.cwd(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'gi-i66-close-')),checkout=path.join(temp,'authority');
  let observed;
  try{
    git(cwd,'fetch','--quiet',C.repositoryUrl,'refs/heads/'+C.branch);
    git(cwd,'worktree','add','--quiet','--detach',checkout,git(cwd,'rev-parse','FETCH_HEAD'));
    process.chdir(checkout);
    observed=await reconcileBeforeExecution(phase,path.join(out,'terminal-readback'),candidate);
  }finally{
    process.chdir(cwd);
    if(fs.existsSync(path.join(checkout,'.git')))git(cwd,'worktree','remove',checkout);
    fs.rmSync(temp,{recursive:true,force:true});
  }
  if(observed)return observed;
  if(failure)throw failure;
  throw Error('I66_TERMINAL_PROVIDER_CLAIM_MISSING');
}

const scopeOwner=()=>require('./gravicentra-i6-6-frontend-preview-authority.cjs');
const UNIT_FILE='artifacts/orbit360-recovery/release-control/I6_6_SCOPED_FUNCTION_RELEASE.json';
function scopedPhysical(control) {
  const hosting=control[control.currentExecutionDecisionPointer],journal=control.i66ScopedFunctionRelease;
  need(hosting?.gate==='I6.6'&&control.gateState.gates.I6.activeSubgate==='I6.6','CURRENT_PHYSICAL_I66');
  if(!journal?.accepted)return {...hosting,functionalEpoch:0};
  const accepted=journal.accepted;
  need(Number.isSafeInteger(accepted.epoch)&&accepted.epoch>0&&sha40(accepted.sourceSha),'SCOPED_PHYSICAL_RECEIPT');
  return {...hosting,functionalEpoch:accepted.epoch,backendRevisions:hosting.backendRevisions.map(target=>
    target.name===accepted.target?{...target,currentRevision:accepted.revision}:target)};
}
function assertCompositeFresh(candidate,control,readBlob){
  const release=control.i66ScopedFunctionRelease;
  need(!release?.providerStages?.LIVE_DEPLOYED||!!release.accepted,'LIVE_FUNCTION_PENDING_POSTCHECK');
  const last=release?.accepted;
  if(!last)return;
  // No older composite may overwrite this function. Recomposition must prove
  // the latest accepted code in the immutable candidate and its rollback base.
  for(const [file,sha] of Object.entries(last.sourcePins))equal(readBlob(candidate.sourceSha,file),sha,'SUPERSEDED_FUNCTIONAL_SOURCE');
  equal(candidate.scopedPredecessor?.epoch,last.epoch,'SUPERSEDED_FUNCTIONAL_PREDECESSOR');
  equal(candidate.scopedPredecessor?.revision,last.revision,'SUPERSEDED_FUNCTIONAL_REVISION');
}
function scopedCandidate(cwd=process.cwd()) {
  const c=json(path.join(cwd,C.control)),record=json(path.join(cwd,UNIT_FILE)),authority=c.i66ScopedFunctionRelease;
  equal(authority?.candidatePath,UNIT_FILE,'ACTIVE_SCOPED_UNIT');
  equal(authority.candidateBlob,blob(fs.readFileSync(path.join(cwd,UNIT_FILE))),'SIGNED_SCOPE_RECORD');
  const p={executionProvider:C.provider,providerBinding:record};
  validateBinding(p,{current:scopedPhysical(c),readBlob:file=>git(cwd,'rev-parse','HEAD:'+file)});
  return record;
}
function packageProviderSource(out,sourceSha) {
  need(sha40(sourceSha),'EXACT_FUNCTION_PACKAGE_INPUT');
  const checkout=fs.mkdtempSync(path.join(os.tmpdir(),'gi-i66-function-source-'));
  try {
    execFileSync('git',['init','-q',checkout]);
    execFileSync('git',['-C',checkout,'fetch','-q','--no-tags','--depth=1',C.repositoryUrl,sourceSha]);
    execFileSync('git',['-C',checkout,'checkout','-q','--detach','FETCH_HEAD']);
    equal(git(checkout,'rev-parse','HEAD'),sourceSha,'FETCHED_FUNCTION_PACKAGE_SOURCE');
    equal(blob(fs.readFileSync(C.tool)),git(checkout,'rev-parse','HEAD:'+C.tool),'BUILDER_SAME_SIGNED_SOURCE');
    return packageFunctionalUnit(path.resolve(out),checkout);
  } finally { fs.rmSync(checkout,{recursive:true,force:true}); }
}
function packageFunctionalUnit(out,cwd=process.cwd()){
  const binding=scopedCandidate(cwd),source=git(cwd,'rev-parse','HEAD');
  equal(git(cwd,'status','--porcelain','--untracked-files=no'),'','CLEAN_UNIT_WORKTREE');
  const tree=git(cwd,'rev-parse',source+':functions');
  const archive=path.join(out,'function-source.zip');fs.mkdirSync(out,{recursive:false});
  // A fresh, complete Functions source archive. The only deployable names are
  // the two explicit entry points in the signed binding. Hosting is retained.
  execFileSync('git',['archive','--format=zip','--output='+archive,source+':functions'],{cwd});
  const report=path.join(out,'source-tests.tap');
  pkg.execLogged(process.execPath,['--test',...binding.sourceQa],{cwd,log:report});
  const data=fs.readFileSync(archive);
  const receipt={schema:'GI_I66_SCOPED_FUNCTION_BUILD_V1',scope:binding.scope,sourceSha:source,functionTree:tree,
    digest:sha(data),bytes:data.length,bindingBlob:blob(fs.readFileSync(path.join(cwd,UNIT_FILE))),
    sourceTestsSha256:sha(fs.readFileSync(report)),targets:binding.targets,sourcePins:binding.sourcePins};
  write(path.join(out,'package.json'),receipt);return receipt;
}
function functionalBuildConfig(cwd=process.cwd(),sourceSha){
  const binding=scopedCandidate(cwd),head=sourceSha||git(cwd,'rev-parse','HEAD'),base='i66/functional/'+binding.unit+'/'+head+'/$BUILD_ID/';
  return {steps:[{name:C.image,id:'certify-function-package',entrypoint:'node',args:[C.tool,'package-functional-unit','gi-functional-output',head]}],
    serviceAccount:'projects/'+C.projectId+'/serviceAccounts/'+C.serviceAccount,
    logsBucket:'gs://'+C.bucket+'/i66/cloud-build-logs',options:{logging:'GCS_ONLY',sourceProvenanceHash:['SHA256']},timeout:'1200s',
    artifacts:{objects:{location:'gs://'+C.bucket+'/'+base,paths:['gi-functional-output/function-source.zip','gi-functional-output/package.json','gi-functional-output/source-tests.tap']}}};
}

function readGcloud(args,options={}){
  return execFileSync('gcloud',[...args,'--project='+C.projectId],{maxBuffer:48*1024*1024,stdio:['ignore','pipe','pipe'],...options});
}
function readFunctionSnapshot(target,region) {
  const fn=JSON.parse(readGcloud(['functions','describe',target,'--gen2','--region='+region,'--format=json']));
  equal(fn.name,'projects/'+C.projectId+'/locations/'+region+'/functions/'+target,'EXACT_FUNCTION_RESOURCE');
  equal(fn.state,'ACTIVE','EXISTING_ACTIVE_FUNCTION');equal(fn.buildConfig.entryPoint,target,'EXACT_FUNCTION_ENTRYPOINT');
  const sc=fn.serviceConfig,source=fn.buildConfig.sourceProvenance?.resolvedStorageSource||fn.buildConfig.source?.storageSource;
  need(source?.bucket&&source.object&&/^[1-9][0-9]+$/.test(String(source.generation)),'IMMUTABLE_BACKEND_SOURCE');
  const service=sc.service.split('/').at(-1);equal(service,target.toLowerCase(),'EXACT_RUN_SERVICE');
  const run=JSON.parse(readGcloud(['run','services','describe',service,'--region='+region,'--format=json(status.traffic,status.conditions,status.latestReadyRevisionName)']));
  const traffic=run.status.traffic.filter(x=>Number(x.percent)>0);
  need(traffic.length===1&&Number(traffic[0].percent)===100,'EXCLUSIVE_REVISION_TRAFFIC');
  const revision=traffic[0].revisionName;
  equal(sc.revision,revision,'FUNCTION_SOURCE_MUST_MATCH_SERVING_REVISION');
  need(run.status.conditions.some(x=>x.type==='Ready'&&x.status==='True'),'RUN_READY');
  const config={...sc};for(const k of ['revision','uri','service','allTrafficOnLatestRevision'])delete config[k];
  return {target,region,service,revision,source,configurationDigest:digest(config)};
}
function scopedArchive(uri,generation){
  need(typeof uri==='string'&&uri.startsWith('gs://')&&!uri.includes('#')&&/^[1-9][0-9]+$/.test(String(generation)),'FROZEN_ARCHIVE_REQUIRED');
  return readGcloud(['storage','cat',uri+'#'+generation]);
}
function checkServingSnapshot(snapshot,expected,phase) {
  const live=phase==='live',src=snapshot.source;
  equal(snapshot.revision,live?expected.revision:expected.previewRevision,'SERVING_REVISION_PRECONDITION');
  equal(String(src.generation),live?expected.sourceGeneration:expected.previewSourceGeneration,'SERVING_SOURCE_GENERATION');
  equal(sha(scopedArchive('gs://'+src.bucket+'/'+src.object,src.generation)),live?expected.archiveSha256:expected.previewArchiveSha256,'SERVING_PACKAGE_PRECONDITION');
}
async function verifyScopedHosting(binding) {
  const origins=['https://app.aysseguros.com','https://ays-orbit-360-lab.web.app'];
  const markers=await Promise.all(origins.map(async origin=>{
    const response=await fetch(origin+'/__recovery__/build.json',{cache:'no-store',redirect:'error'});
    need(response.ok,'HOSTING_READBACK');return Buffer.from(await response.arrayBuffer());
  }));
  equal(markers[0],markers[1],'CUSTOM_AND_FIREBASE_HOSTING_MARKERS');
  const marker=JSON.parse(markers[0]);equal([marker.sourceSha,marker.buildId],[binding.predecessor.sourceSha,binding.predecessor.buildId],'HOSTING_FRONTEND_COMPATIBILITY');
  const token=readGcloud(['auth','print-access-token']).toString().trim();
  const response=await fetch('https://firebasehosting.googleapis.com/v1beta1/sites/'+C.projectId+'/releases?pageSize=1',{headers:{Authorization:'Bearer '+token}});
  need(response.ok,'HOSTING_PROVIDER_READBACK');const release=(await response.json()).releases?.[0];
  equal(release?.version?.name,binding.predecessor.hostingVersion,'PROVIDER_HOSTING_VERSION');
  return {version:release.version.name,buildId:marker.buildId,sourceSha:marker.sourceSha,markerSha256:sha(markers[0])};
}
function readFunctionalPackage(buildId,cwd=process.cwd()){
  need(uuid(buildId),'FUNCTIONAL_BUILD_UUID');
  const build=JSON.parse(readGcloud(['builds','describe',buildId,'--region='+C.region,'--format=json']));
  const sourceSha=build.sourceProvenance?.resolvedGitSource?.revision, b=scopedCandidate(cwd);
  equal([build.status,build.projectId,build.source.gitSource.url,build.source.gitSource.revision,build.sourceProvenance.resolvedGitSource.url],
    ['SUCCESS',C.projectId,C.repositoryUrl,sourceSha,C.repositoryUrl],'SIGNED_PROVIDER_BUILD_SOURCE');
  need(sha40(sourceSha),'EXACT_FUNCTION_PACKAGE_SOURCE');git(cwd,'merge-base','--is-ancestor',sourceSha,'HEAD');
  equal(git(cwd,'rev-parse',sourceSha+':'+UNIT_FILE),blob(fs.readFileSync(path.join(cwd,UNIT_FILE))),'UNCHANGED_BINDING');
  equal(git(cwd,'rev-parse',sourceSha+':functions'),git(cwd,'rev-parse','HEAD:functions'),'STALE_FUNCTION_TREE');
  const cfg=functionalBuildConfig(cwd,sourceSha);
  equal(build.serviceAccount,cfg.serviceAccount,'PACKAGE_PROVIDER_PRINCIPAL');equal(build.steps.length,1,'EXACT_PACKAGE_STEP_COUNT');
  for(const k of ['name','id','entrypoint','args'])equal(build.steps[0][k],cfg.steps[0][k],'EXACT_PACKAGE_STEP_'+k);
  for(const k of ['env','secretEnv','volumes'])need(!build.steps[0][k]?.length&&!build.options?.[k]?.length,'NO_EXECUTION_OVERRIDE');
  need(!build.availableSecrets&&!build.secrets?.length&&!build.buildTriggerId,'NO_ALTERNATE_BUILD_INPUT');
  const prefix='i66/functional/'+b.unit+'/'+sourceSha+'/'+buildId+'/',bucket='gs://'+C.bucket+'/';
  const manifest=build.results?.artifactManifest;need(manifest?.startsWith(bucket+prefix+'artifacts-'),'EXACT_NATIVE_ARTIFACT_MANIFEST');
  const manifestUri=manifest.split('#')[0],meta=JSON.parse(readGcloud(['storage','objects','describe',manifestUri,'--raw','--format=json']));
  const parsed=pkg.parseArtifactManifest(scopedArchive(manifestUri,manifest.split('#')[1]||meta.generation));
  const records=Array.isArray(parsed)?parsed:parsed.artifacts;
  need(Array.isArray(records)&&records.length===3,'EXACT_FUNCTION_PACKAGE_MEMBERS');
  function retained(name){
    const expected=[bucket+prefix+name,bucket+prefix+'gi-functional-output/'+name];
    const rows=records.filter(row=>expected.includes(row.location?.split('#')[0]));equal(rows.length,1,'EXACT_RETAINED_'+name);
    const [uri,generation]=rows[0].location.split('#');const bytes=scopedArchive(uri,generation);
    const md5=crypto.createHash('md5').update(bytes).digest('hex'),reported=pkg.nativeArtifactMd5(rows[0]);
    need([md5,Buffer.from(md5,'hex').toString('base64')].includes(reported),'PROVIDER_OBJECT_HASH_'+name);
    return {uri,generation,sha256:sha(bytes),bytes:bytes.length,data:bytes};
  }
  const artifact=retained('function-source.zip'),receipt=JSON.parse(retained('package.json').data);
  equal(receipt.digest,artifact.sha256,'FUNCTION_PACKAGE_DIGEST');equal(receipt.bytes,artifact.bytes,'FUNCTION_PACKAGE_BYTES');
  equal([receipt.sourceSha,receipt.functionTree,receipt.bindingBlob,receipt.targets,receipt.sourcePins,receipt.sourceTestsSha256],
    [sourceSha,git(cwd,'rev-parse',sourceSha+':functions'),blob(fs.readFileSync(path.join(cwd,UNIT_FILE))),b.targets,b.sourcePins,retained('source-tests.tap').sha256],'CERTIFIED_FUNCTION_PACKAGE');
  delete artifact.data;return {sourceSha,buildId,artifact,receipt};
}

function checkedBranch(){
  const head=git(process.cwd(),'rev-parse','HEAD'),remote=git(process.cwd(),'ls-remote',C.repositoryUrl,'refs/heads/'+C.branch).split(/\s+/)[0];
  equal(remote,head,'FUNCTIONAL_AUTHORITY_CHANGED_RECOMPOSE');return head;
}
function writeFunctionalStage(stage,facts){
  const owner=require('./gravicentra-i66-frontend-control.cjs');
  const change=owner.prepareFunctionalStage(stage,facts,checkedBranch());
  return change.status==='NOOP_ALREADY_RECONCILED'?{status:change.status}:owner.commitProviderOutcome(change);
}
function retainedFunctionRecord(name,value){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gi-functional-evidence-')),file=path.join(tmp,'record.json'),uri='gs://'+C.bucket+'/'+name;
  try{
    const raw=Buffer.from(JSON.stringify(value,null,2)+'\n');fs.writeFileSync(file,raw,{mode:0o600});
    const reader=operationalClaimReader();
    return (async()=>{
      let existing=await reader.findClaim(name);
      if(!existing){
        try{readGcloud(['storage','cp',file,uri,'--if-generation-match=0','--quiet']);}
        catch(error){existing=await reader.findClaim(name);if(!existing)throw error;}
      }
      existing=existing||await reader.findClaim(name);need(existing,'FUNCTIONAL_OBJECT_UNCONFIRMED');
      equal(existing.sha256,sha(raw),'EXCLUSIVE_FUNCTIONAL_OBJECT');return existing;
    })().finally(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  }catch(error){fs.rmSync(tmp,{recursive:true,force:true});throw error;}
}
function functionalFacts(pkg){
  return {sourceSha:pkg.sourceSha,buildId:pkg.buildId,packageSha256:pkg.artifact.sha256,bindingBlob:pkg.receipt.bindingBlob,artifact:pkg.artifact};
}
async function executeFunctionalPhase(phase,buildId){
  need(['package','preview','live'].includes(phase),'FUNCTIONAL_PHASE');
  checkedBranch();const binding=scopedCandidate(),pkg=readFunctionalPackage(buildId),facts=functionalFacts(pkg);
  await verifyScopedHosting(binding);
  const c=json(C.control),stages=c.i66ScopedFunctionRelease.providerStages||{};
  need(!Object.keys(stages).some(k=>/_(HOLD|ROLLED_BACK)$/.test(k)),'TERMINAL_FUNCTIONAL_UNIT_REQUIRES_FRESH_ADMISSION');
  if(phase==='package')return writeFunctionalStage('PACKAGE_CERTIFIED',facts);
  equal(stages.PACKAGE_CERTIFIED,facts,'ARTIFACT_SIGNED_IN_AUTHORITY');
  if(phase==='live')need(stages.PREVIEW_VERIFIED&&stages.PREVIEW_VERIFIED.packageSha256===facts.packageSha256,'SIGNED_PREVIEW_REQUIRED');
  const target=binding.targets[phase],region=binding.targets.region,stage=phase==='preview'?'PREVIEW_DEPLOYED':'LIVE_DEPLOYED';
  const snapshot=readFunctionSnapshot(target,region),prefix='i66/functional/'+binding.unit+'/'+pkg.sourceSha+'/'+buildId+'/';
  const claimName=prefix+phase+'-claim.json',reader=operationalClaimReader(),previous=await reader.findClaim(claimName);
  const holdKey=prefix+phase+'-hold.json';
  async function recordHold(ref) {
    const terminal=JSON.parse((await reader.object(ref)).data);
    equal([terminal.target,terminal.phase,terminal.buildId,terminal.packageSha256],[target,phase,buildId,facts.packageSha256],'EXACT_HELD_OPERATION');
    return writeFunctionalStage(phase.toUpperCase()+'_HOLD',{...facts,target,receipt:ref,revision:terminal.observedRevision,trafficPercent:100});
  }
  const pendingHold=await reader.findClaim(holdKey);
  if(pendingHold)return recordHold(pendingHold);
  let before;
  if(previous){
    const claim=JSON.parse((await reader.object(previous)).data);
    equal([claim.phase,claim.target,claim.packageSha256,claim.buildId,claim.bindingBlob],[phase,target,facts.packageSha256,buildId,facts.bindingBlob],'FUNCTIONAL_EXISTING_CLAIM_BINDING');
    before=claim.before;
    // A lost ACK can be adopted only from a physical source and config readback.
    // An unfinished or rolled-back attempt cannot execute a second deployment.
    need(snapshot.revision!==before.revision,'CONSUMED_FUNCTIONAL_CLAIM_NO_REDEPLOY');
  }else{
    before=snapshot;checkServingSnapshot(before,binding.predecessor,phase);
    if(phase==='preview')checkServingSnapshot(readFunctionSnapshot(binding.targets.live,region),binding.predecessor,'live');
    if(phase==='live'){
      const preview=readFunctionSnapshot(binding.targets.preview,region);
      equal(preview.revision,stages.PREVIEW_VERIFIED.revision,'CURRENT_ACCEPTED_PREVIEW_REVISION');
    }
    checkedBranch();
    // The compare-and-create must be exclusive even if two observers read no claim.
    const claim={...facts,phase,target,before,authorityHead:checkedBranch()};
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-function-claim-')),file=path.join(dir,'claim.json');
    try{fs.writeFileSync(file,JSON.stringify(claim)+'\n',{mode:0o600});readGcloud(['storage','cp',file,'gs://'+C.bucket+'/'+claimName,'--if-generation-match=0','--quiet']);}
    finally{fs.rmSync(dir,{recursive:true,force:true});}
    checkedBranch();checkServingSnapshot(readFunctionSnapshot(target,region),binding.predecessor,phase);
    const meta=JSON.parse(readGcloud(['storage','objects','describe',pkg.artifact.uri,'--raw','--format=json']));
    equal(String(meta.generation),pkg.artifact.generation,'FROZEN_SOURCE_STILL_CURRENT');
    try{readGcloud(['functions','deploy',target,'--gen2','--region='+region,'--entry-point='+target,'--source='+pkg.artifact.uri,'--quiet']);}
    catch(error){
      const fresh=readFunctionSnapshot(target,region),src=fresh.source;
      if(fresh.revision===before.revision||sha(scopedArchive('gs://'+src.bucket+'/'+src.object,src.generation))!==facts.packageSha256){
        const held=await retainedFunctionRecord(holdKey,{...facts,target,phase,beforeRevision:before.revision,observedRevision:fresh.revision});
        return recordHold(held);
      }
    }
  }
  const after=readFunctionSnapshot(target,region),src=after.source;
  need(after.revision!==before.revision,'FUNCTIONAL_NEW_REVISION_REQUIRED');
  equal(sha(scopedArchive('gs://'+src.bucket+'/'+src.object,src.generation)),facts.packageSha256,'EXACT_DEPLOYED_FUNCTION_ARCHIVE');
  equal(after.configurationDigest,before.configurationDigest,'FUNCTION_CONFIGURATION_CHANGED');
  const receipt=await retainedFunctionRecord(prefix+phase+'-deployment.json',{...facts,phase,target,before,after,trafficPercent:100});
  return writeFunctionalStage(stage,{...facts,target,revision:after.revision,trafficPercent:100,receipt,rollbackRevision:before.revision});
}

function firestoreFields(values){
  const decode=v=>{
    if('mapValue'in v)return firestoreFields(v.mapValue.fields||{});
    if('arrayValue'in v)return (v.arrayValue.values||[]).map(decode);
    if('integerValue'in v)return Number(v.integerValue);
    return Object.values(v)[0];
  };
  return Object.fromEntries(Object.entries(values).map(([k,v])=>[k,decode(v)]));
}
async function acceptFunctionalJourney(phase,buildId,refFile){
  need(phase==='preview'||phase==='live','FUNCTIONAL_ACCEPT_PHASE');
  checkedBranch();const b=scopedCandidate(),pkg=readFunctionalPackage(buildId),facts=functionalFacts(pkg),target=b.targets[phase];
  const stages=json(C.control).i66ScopedFunctionRelease.providerStages||{},deployed=stages[phase==='preview'?'PREVIEW_DEPLOYED':'LIVE_DEPLOYED'];
  equal(deployed?.packageSha256,facts.packageSha256,'EXACT_DEPLOYED_PACKAGE_REQUIRED');
  const snapshot=readFunctionSnapshot(target,b.targets.region);equal(snapshot.revision,deployed.revision,'CURRENT_SIGNED_TEST_REVISION');
  const hosting=await verifyScopedHosting(b),ref=json(refFile),io=gcloudReadIo();
  const base='gs://'+C.bucket+'/i66/functional/'+b.unit+'/'+pkg.sourceSha+'/'+buildId+'/';
  equal(ref.uri,base+phase+'-role-journeys.json','EXACT_PRIVATE_JOURNEY_RECEIPT');
  const {data,meta}=await io.object(ref),report=JSON.parse(data);
  const deployEvidence=await io.object(deployed.receipt);
  equal([report.phase,report.sourceSha,report.revision,report.packageSha256,report.hostingBuildId],
    [phase,pkg.sourceSha,snapshot.revision,facts.packageSha256,hosting.buildId],'JOURNEY_PROVENANCE');
  need(Date.parse(meta.timeCreated)>=Date.parse(deployEvidence.meta.timeCreated),'JOURNEY_AFTER_DEPLOY');
  equal(report.journeys.map(x=>x.role),b.roles,'BOTH_AUTHENTICATED_JOURNEYS');
  const token=readGcloud(['auth','print-access-token']).toString().trim();
  const stem='https://firestore.googleapis.com/v1/projects/'+C.projectId+'/databases/(default)/documents/tenants/alianzas-soluciones/';
  async function doc(collection,id){
    need(typeof id==='string'&&/^[A-Za-z0-9_-]{1,180}$/.test(id),'SCOPED_JOURNEY_DOC_ID');
    const r=await fetch(stem+collection+'/'+id,{headers:{Authorization:'Bearer '+token}});need(r.ok,'SERVER_READBACK_REQUIRED');return firestoreFields((await r.json()).fields);
  }
  const prefix=phase==='preview'?'previewReconciliation':'reconciliation';
  const actors=new Set();
  for(const j of report.journeys){
    need(j.origin===(phase==='live'?'https://app.aysseguros.com':json(C.control).i66FrontendReleaseHead.previewUrl),'SCOPED_TEST_ORIGIN');
    need(j.route.startsWith('/#/')&&j.reloaded===true&&j.originalPaymentCount===j.afterPaymentCount&&j.originalPaymentCount===1,'UI_RELOAD_AND_NO_NEW_COLLECTION');
    const audit=await doc(prefix+'Events',j.eventId),request=await doc(prefix+'Requests',j.requestId),result=request.result;
    equal([audit.eventId,audit.requestId,audit.operation,request.status,request.eventId,audit.receiptId,audit.cobroId],
      [j.eventId,j.requestId,'reconcile_payment','committed',j.eventId,j.receiptId,j.cobroId],'SERVER_COMMITTED_JOURNEY');
    equal(audit.actor.activeRole.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),j.role.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),'SERVER_AUTHORIZED_ROLE');
    need(audit.actor.uid&&!actors.has(audit.actor.uid),'DISTINCT_SIGNED_ACTORS');actors.add(audit.actor.uid);
    need(Date.parse(audit.createdAt)>=Date.parse(deployEvidence.meta.timeCreated),'FRESH_SERVER_AUDIT_REQUIRED');
    const r=await doc('data/recibosEsperados/items',j.receiptId),payment=await doc('data/cobros/items',j.cobroId);
    equal([payment.reciboId,r.cobroId,payment.polizaId,payment.clienteId,r.polizaId,r.clienteId],[j.receiptId,j.cobroId,result.policyId,result.clientId,result.policyId,result.clientId],'PERSISTED_PAYMENT_RELATIONS');
    equal([r.invoiceNumber,payment.invoiceNumber,r.paidDate,payment.paidDate,result.amount],[j.invoiceNumber,j.invoiceNumber,j.originalPaidDate,j.originalPaidDate,j.originalAmount],'PERSISTED_HISTORICAL_FACTS');
    const proof=payment.historicalPaymentEvidence;
    need(proof?.newCollection===false&&proof.receiptId===j.receiptId&&proof.policyId===result.policyId&&
      proof.fechaPagoReportada===j.originalPaidDate&&proof.amount===j.originalAmount&&/^[a-f0-9]{64}$/.test(proof.sourceKey),'HISTORICAL_PAYMENT_NO_NEW_REVENUE');
    equal([audit.recordedPaymentBefore?.amount,audit.recordedPaymentAfter?.amount],[j.originalAmount,j.originalAmount],'AUDITED_ORIGINAL_AND_RECORDED_AMOUNT');
    const query=await fetch(stem+'data/cobros:runQuery',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({structuredQuery:{select:{fields:[{fieldPath:'reciboId'}]},from:[{collectionId:'items'}],where:{fieldFilter:{field:{fieldPath:'reciboId'},op:'EQUAL',value:{stringValue:j.receiptId}}},limit:2}})});
    need(query.ok,'SERVER_PAYMENT_UNIQUENESS_READBACK');
    equal((await query.json()).flatMap(row=>row.document?[row.document.name.split('/').at(-1)]:[]),[j.cobroId],'ONE_PERSISTED_MOVEMENT');

    if(phase==='preview')need(r.__syntheticQa===true&&payment.__syntheticQa===true,'SYNTHETIC_PREVIEW_ONLY');
  }
  return writeFunctionalStage(phase==='preview'?'PREVIEW_VERIFIED':'LIVE_VERIFIED',{...facts,target,revision:snapshot.revision,trafficPercent:100,roles:b.roles,journeys:ref});
}
async function rollbackFunctionalPhase(phase,buildId){
  need(['preview','live'].includes(phase),'FUNCTIONAL_ROLLBACK_PHASE');
  checkedBranch();const b=scopedCandidate(),pkg=readFunctionalPackage(buildId),c=json(C.control);
  const stages=c.i66ScopedFunctionRelease.providerStages||{},deployed=stages[phase==='preview'?'PREVIEW_DEPLOYED':'LIVE_DEPLOYED'];
  need(!stages[phase==='preview'?'PREVIEW_VERIFIED':'LIVE_VERIFIED'],'NO_ROLLBACK_AFTER_ACCEPTANCE');
  const target=b.targets[phase],snapshot=readFunctionSnapshot(target,b.targets.region);
  equal([deployed?.revision,deployed?.packageSha256],[snapshot.revision,pkg.artifact.sha256],'OWN_DEPLOYMENT_ONLY');
  const before=JSON.parse((await gcloudReadIo().object(deployed.receipt)).data).before;
  equal(deployed.rollbackRevision,before.revision,'EXACT_RETAINED_ROLLBACK');
  checkServingSnapshot(before,b.predecessor,phase);
  const rev=JSON.parse(readGcloud(['run','revisions','describe',before.revision,'--region='+b.targets.region,'--format=json(status.conditions)']));
  need(rev.status.conditions.some(x=>x.type==='Ready'&&x.status==='True'),'PREVIOUS_REVISION_READY');
  checkedBranch();
  readGcloud(['run','services','update-traffic',snapshot.service,'--region='+b.targets.region,'--to-revisions='+before.revision+'=100','--quiet']);
  const status=JSON.parse(readGcloud(['run','services','describe',snapshot.service,'--region='+b.targets.region,'--format=json(status.traffic)']));
  const traffic=status.status.traffic.filter(x=>x.percent>0);equal(traffic.map(x=>[x.revisionName,x.percent]),[[before.revision,100]],'ROLLBACK_TRAFFIC_READBACK');
  const facts={...functionalFacts(pkg),phase,target,revision:before.revision,trafficPercent:100,rolledBackRevision:snapshot.revision};
  const receipt=await retainedFunctionRecord('i66/functional/'+b.unit+'/'+pkg.sourceSha+'/'+buildId+'/'+phase+'-rollback.json',facts);
  return writeFunctionalStage(phase.toUpperCase()+'_ROLLED_BACK',{...facts,receipt});
}

async function main(args=process.argv.slice(2)){
  if(args[0]==='bind'&&args.length===4){const binding=bindingFromHosting(process.cwd(),json(args[1]),json(args[2]),git(process.cwd(),'rev-parse','HEAD'));write(args[3],binding);console.log('I66_NATIVE_BINDING_PREPARED_NOT_AUTHORIZED');return binding;}
  if(args[0]==='verify-functional-journey'&&args.length===4){const result=await acceptFunctionalJourney(args[1],args[2],args[3]);console.log(JSON.stringify(result));return result;}
  if(args[0]==='rollback-functional-phase'&&args.length===3){const result=await rollbackFunctionalPhase(args[1],args[2]);console.log(JSON.stringify(result));return result;}
  if(args[0]==='functional-phase'&&args.length===3){const result=await executeFunctionalPhase(args[1],args[2]);console.log(JSON.stringify(result));return result;}
  if(args[0]==='package-functional-unit'&&args.length===3)return packageProviderSource(args[1],args[2]);
  if(args[0]==='prepare-functional-build'&&args.length===2){const config=functionalBuildConfig();write(args[1],config);return config;}
  if(args[0]==='run'&&args.length===3)return runOperationalCycle(args[1],args[2]);
  if(args[0]==='resume'&&args.length===3)return reconcileBeforeExecution(args[1],args[2]);
  if(args[0]==='prepare'&&args.length===3){const prior=await reconcileBeforeExecution(args[1],args[2]);if(prior){console.log(JSON.stringify(prior));return prior;}const p=makePlan(process.cwd(),args[1]);fs.mkdirSync(args[2],{recursive:false});write(path.join(args[2],'plan.json'),p);write(path.join(args[2],'cloudbuild.json'),configFor(p));console.log('I66_NATIVE_OPERATIONAL_PREPARED_NO_EXECUTION '+digest(p));return p;}
  if(args[0]==='worker'&&args.length===2)return worker(JSON.parse(args[1]));
  if(args[0]==='verify'&&args.length===4)return verify(json(args[1]),args[2],args[3]);
  if(args[0]==='retain-make'&&args.length===2)return retainMake(args[1]);
  if(args[0]==='verify-runtime'&&args.length===2){const g=require('./gravicentra-i6-6-operational-release-candidate.cjs'),p=g.candidateForPhase(json(g.CONTROL),args[1]);return verifyRuntimeAuthority(p,{phase:args[1],action:'worker'});}
  throw Error('I66_NATIVE_OPERATIONAL_USE_BIND_PREPARE_WORKER_VERIFY');
}
module.exports={missingOperationalClaim,readFunctionSnapshot,checkServingSnapshot,verifyScopedHosting,readFunctionalPackage,scopedPhysical,assertCompositeFresh,scopedCandidate,packageFunctionalUnit,functionalBuildConfig,observeOperationalClaim,reconcileBeforeExecution,operationalClaimReader,C,F,MECHANISM_PATHS,PRODUCT_PATHS,PHASES,ACTIONS,native,provider,uuid,executionId,artifactRef,validateMechanism,validateBinding,verifyPinnedOwners,ensureHistory,fetchAuthorityHead,validatePlan,prefix,configFor,validateBuild,sdkHeaders,verifyRuntimeAuthority,blockNames,workflowBlocks,workflowTimeoutMs,deploymentTimeoutMs,runtimeBlocks,mechanismManifest,bindingFromHosting,makePlan,validatePackageMetadata,planFromBuild,validatePreviewMetadata,readPreviewAcceptance,readNativeFiles,verifiedPackage,admitRuntime,packageTarForBinding,signedCasIo,candidateAt,mandatoryChecks,validateOperationalProof,readFinancialPreview,lockName,ENV_OUTPUTS,consumeNativeEnv,branchGuard,retainMake,worker,gcloudReadIo,verify,main};
if(require.main===module)Promise.resolve().then(()=>main()).catch(error=>{console.error(String(error.message||'I66_NATIVE_OPERATIONAL_HOLD').split('\n')[0]);process.exitCode=1;});
