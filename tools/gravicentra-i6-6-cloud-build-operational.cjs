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
  'tools/gravicentra-i6-6-cloud-build-source-admission.cjs','tools/gravicentra-i6-6-cloud-build-source-admission.test.cjs',
  'tools/gravicentra-i6-6-native-predecessor-backup.test.cjs',
  'tools/gravicentra-i6-6-native-hosting-continuation.test.cjs','tools/gravicentra-i6-6-native-committed-channel.test.cjs',
  'tools/gravicentra-i6-6-cloud-build-compensated-retry.cjs','tools/gravicentra-i6-6-cloud-build-compensated-retry.test.cjs',
  'tools/gravicentra-i6-6-compensated-retry-runtime.test.cjs',
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
function validatePreviousLive(backup,current){
  equal(backup.executionProvider,current.executionProvider,'PREVIOUS_PROVIDER_DRIFT');
  for(const [field,key] of Object.entries({sourceSha:'sourceSha',buildId:'buildId',artifactId:'artifactId',artifactDigest:'artifactDigest',buildRunId:'previewRunId',liveRunId:'liveCloneRunId',hostingVersion:'liveHostingVersion'}))equal(backup[field],current[key],'PREVIOUS_IDENTITY_'+field);
  need(sha40(backup.sourceSha)&&/^sha256:[a-f0-9]{64}$/.test(backup.artifactDigest||''),'PREVIOUS_SOURCE_DIGEST');
  executionId(backup,backup.buildRunId,'PREVIOUS_BUILD');executionId(backup,backup.liveRunId,'PREVIOUS_LIVE');
  if(native(backup))preview.artifactIdentity(backup.sourceSha,backup.buildRunId,backup.artifactId,backup.artifactDigest);
  else need(Number.isSafeInteger(backup.artifactId)&&backup.artifactId>0,'PREVIOUS_ACTIONS_ARTIFACT');
  need(new RegExp('^gi-i66-'+backup.sourceSha.slice(0,12)+'-[a-f0-9]{12}$').test(backup.buildId||''),'PREVIOUS_BUILD_MARKER');
  need(/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(backup.hostingVersion||''),'PREVIOUS_HOSTING_VERSION');
  return backup;
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
  equal(Object.keys(b||{}).sort(),['schema','requestVersion','mechanism','hostingPlan','hostingBuildId','hostingProof','hostingVersion',...(b?.compensatedRetry===undefined?[]:['compensatedRetry'])].sort(),'BINDING_KEYS');
  equal(b.schema,C.bindingSchema,'BINDING_SCHEMA');preview.validatePlan(b.hostingPlan);
  equal(b.requestVersion,b.hostingPlan.requestVersion,'BINDING_REQUEST');need(uuid(b.hostingBuildId),'HOSTING_EXECUTION_UUID');preview.objectRef(b.hostingProof);
  equal(b.hostingProof.uri,'gs://'+C.bucket+'/'+preview.prefix(b.hostingPlan,b.hostingBuildId)+preview.F.proof,'HOSTING_PROOF_PATH');
  need(/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(b.hostingVersion||''),'HOSTING_VERSION');
  const h=b.hostingPlan,a=h.packageArtifact;
  equal([p.sourceSha,p.buildRunId,p.artifactId,p.artifactDigest,p.previewChannelId,p.previewUrl],
    [h.sourceSha,h.packageBuildId,a.uri+'#'+a.generation,'sha256:'+a.sha256,preview.C.channel,preview.C.origin],'PACKAGE_AND_PREVIEW_EXACT_BINDING');
  preview.artifactIdentity(p.sourceSha,p.buildRunId,p.artifactId,p.artifactDigest);validateMechanism(b.mechanism,p.sourceSha);
  equal(p.expectedSiteFileCount,224,'SITE_FILES');equal(p.makeIngressComposite,true,'FIVE_FUNCTION_COMPOSITE');
  require('./gravicentra-i6-6-cloud-build-compensated-retry.cjs').validateReference(b.compensatedRetry,p,'preview');
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
function validateBuild(p,b,{finished=true,failed=false}={}){
  need(!failed||finished,'FAILED_BUILD_MUST_BE_FINISHED');
  validatePlan(p);need(uuid(b.id),'BUILD_UUID');need([C.projectId,C.projectNumber].some(n=>b.name==='projects/'+n+'/locations/'+C.region+'/builds/'+b.id),'BUILD_RESOURCE');
  equal(b.projectId,C.projectId,'BUILD_PROJECT');equal(b.status,failed?'FAILURE':finished?'SUCCESS':'WORKING','BUILD_STATUS');const c=configFor(p);
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
    if(finished){equal(s.status,failed&&i===1?'FAILURE':'SUCCESS','REAL_STEP_SUCCESS');need(Date.parse(s.timing?.startTime)>=Date.parse(b.startTime)&&Date.parse(s.timing?.endTime)>=Date.parse(s.timing?.startTime)&&Date.parse(s.timing?.endTime)<=Date.parse(b.finishTime),'REAL_STEP_TIMING');}}
  equal(Object.keys(b.artifacts||{}),['objects'],'NATIVE_ARTIFACTS_ONLY');need([c.artifacts.objects.location,c.artifacts.objects.location.replace('$BUILD_ID',b.id)].includes(b.artifacts.objects.location),'ARTIFACT_LOCATION');equal(b.artifacts.objects.paths,Object.values(F),'EXACT_ARTIFACT_SET');
  need(Number.isFinite(Date.parse(b.startTime))&&Number.isFinite(Date.parse(b.createTime)),'REAL_START');
  if(finished){need(Date.parse(b.finishTime)>=Date.parse(b.startTime),'REAL_FINISH');equal(b.results?.buildStepImages?.length,2,'TWO_IMAGE_DIGESTS');need(b.results.buildStepImages.every(x=>/^sha256:[a-f0-9]{64}$/.test(x)),'IMMUTABLE_STEP_IMAGES');if(!failed){equal(Number(b.results.numArtifacts),Object.keys(F).length,'ALL_ARTIFACTS');const uri='gs://'+C.bucket+'/'+prefix(p,b.id)+'artifacts-'+b.id+'.json';need(b.results.artifactManifest===uri||/^#[1-9][0-9]{0,24}$/.test(String(b.results.artifactManifest).slice(uri.length))&&b.results.artifactManifest.startsWith(uri),'ARTIFACT_MANIFEST');}}
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
  const control=json(path.join(cwd,g.CONTROL)),p=g.candidateForPhase(control,phase);assertCompositeFresh(p,json(path.join(cwd,C.control)),(ref,f)=>git(cwd,'rev-parse',ref+':'+f),phase,fs.existsSync(path.join(cwd,UNIT_FILE))?json(path.join(cwd,UNIT_FILE)):undefined);validateBinding(p);
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
  const h=await preview.verify(p.providerBinding.hostingPlan,p.providerBinding.hostingBuildId,path.join(root,'hosting'));
  equal(h.proof,p.providerBinding.hostingProof,'HOSTING_PROVIDER_PROOF');equal(h.hostingVersion,p.providerBinding.hostingVersion,'HOSTING_PROVIDER_VERSION');
  if(phase==='live')await readPreviewAcceptance(p,io,path.join(root,'signed-preview'));
  return {...runtime,package:e,hosting:h};
}
async function packageTarForBinding(binding){
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs'),control=json(g.CONTROL);
  const p=g.candidateForPhase(control,control.status==='OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED'?'live':'preview');validateBinding(p);
  await verifyRuntimeAuthority(p,{phase:control.status==='OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED'?'live':'preview',action:'verify-preview'});
  const temp=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'i66-native-hosting-bytes-')),io=await preview.cloudIo(await sdkHeaders());
  return packageTarForCandidate(p,binding,io,temp);
}
async function packageTarForCandidate(p,binding,io,temp,{verifyNative=require('./gravicentra-i6-6-cloud-build-source-admission.cjs').verifyCurrentArtifact,readPackage=preview.readPackage}={}){
  const same=(a,b)=>['sourceSha','buildId','buildRunId','artifactId','artifactDigest','executionProvider'].every(key=>a[key]===b[key]);
  if(same(binding,p)){
    for(const key of ['sourceSha','buildId','buildRunId','artifactId','artifactDigest'])equal(binding[key],p[key],'HOSTING_SAME_CANDIDATE');
    const e=await readPackage(p.providerBinding.hostingPlan,io,path.join(temp,'current'));return e.files[pkg.F.archive];
  }
  need(same(binding,p.currentLive),'EXACT_PREVIOUS_PROVIDER_AND_PACKAGE');
  for(const key of ['sourceSha','buildId','buildRunId','artifactId','artifactDigest'])equal(binding[key],p.currentLive[key],'EXACT_PREVIOUS_LIVE_BACKUP');
  if(provider(binding)){
    const out=path.join(temp,'previous');await verifyNative(binding,{io,out});
    const archive=fs.readFileSync(path.join(out,pkg.F.archive));equal(sha(archive),binding.artifactDigest.slice(7),'PREVIOUS_NATIVE_TAR_DIGEST');return archive;
  }
  const ref=p.providerBinding.hostingPlan.imports.live,data=(await io.object(ref)).data;
  const dir=path.join(temp,'previous');preview.unpackHistorical(data,dir,'live',{expectedBytes:ref.bytes});return fs.readFileSync(path.join(dir,pkg.F.archive));
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
  if(p.providerBinding.compensatedRetry&&plan.phase==='preview'){
    preview.objectRef(proof.compensatedRetry);equal(proof.compensatedRetry.uri,'gs://'+C.bucket+'/i66/operational-attempts/'+build.id+'/before-'+RETRY_READBACK,'RETRY_RETAINED_PROOF_PATH');
    const retained=await io.object(proof.compensatedRetry);pkg.validateObjectTime(build,retained.meta);
    validateRetryReadback(p,plan.phase,JSON.parse(retained.data),{buildId:build.id,authorityHead:plan.authorityHead});
    need(Date.parse(retained.meta.timeCreated)<=Date.parse(claim.meta.timeCreated),'RETRY_PROOF_PRECEDES_NEW_CLAIM');
  }else need(proof.compensatedRetry===undefined,'NO_UNREQUESTED_RETRY_PROOF');
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
function lockName(p,phase){need(PHASES.includes(phase),'CLAIM_PHASE');const retry=require('./gravicentra-i6-6-cloud-build-compensated-retry.cjs');return retry.retryLockName(retry.originalLockName(p,phase),phase==='preview'?p.providerBinding.compensatedRetry:undefined);}
const RETRY_READBACK='gi-i66-compensated-retry-readback.json';
function validateRetryReadback(p,phase,report,{buildId,authorityHead}={}){
  const retry=require('./gravicentra-i6-6-cloud-build-compensated-retry.cjs'),ref=p.providerBinding?.compensatedRetry;
  if(!ref||phase!=='preview'){need(report===undefined||report===null,'UNREQUESTED_RETRY_PROOF');return null;}
  retry.validateReference(ref,p,phase);need(report&&typeof report==='object','RETRY_READBACK_REQUIRED');
  equal([report.schema,report.status,report.phase],['GI_I66_COMPENSATED_RETRY_VERIFIED_V1','EXACT_COMPENSATED_PREVIEW_RETRY_READBACK_VERIFIED',phase],'RETRY_READBACK_STATUS');
  for(const k of ['priorBuildId','priorClaim','hold','admission'])equal(report[k],ref[k],'RETRY_READBACK_'+k);
  need(uuid(report.currentBuildId)&&report.currentBuildId!==ref.priorBuildId&&sha40(report.authorityHead)&&sha64(report.priorPlanSha256),'RETRY_READBACK_EXECUTION');
  if(buildId!==undefined)equal(report.currentBuildId,buildId,'RETRY_READBACK_BUILD');if(authorityHead!==undefined)equal(report.authorityHead,authorityHead,'RETRY_READBACK_AUTHORITY');
  equal(report.retryClaimName,lockName(p,phase),'RETRY_READBACK_CLAIM');need(Number.isFinite(Date.parse(report.verifiedAtUtc)),'RETRY_READBACK_TIME');
  equal([report.productSourceChanges,report.rebuilds,report.claimWrites,report.businessWrites,report.livePromotion],[0,0,0,0,false],'RETRY_READBACK_NO_SCOPE_EXPANSION');
  const before=report.verifiedCurrentBefore;equal(Object.keys(before||{}).sort(),['configurationDigest','function','traffic'],'RETRY_READBACK_PREIMAGE');need(sha64(before.configurationDigest),'RETRY_READBACK_CLOSED_DIGEST');
  retry.validateFunction(before.function,p);retry.validateTraffic(before.traffic,before.function);return report;
}
function readRetryReadback(p,phase,{directory=process.env.RUNNER_TEMP,env=process.env}={}){
  if(!p.providerBinding?.compensatedRetry||phase!=='preview')return null;
  need(typeof directory==='string'&&directory.length>0,'RETRY_READBACK_DIRECTORY');
  need(uuid(env.GRAVICENTRA_CLOUD_BUILD_ID)&&sha40(env.I66_NATIVE_AUTHORITY_HEAD),'RETRY_READBACK_EXECUTOR_IDENTITY');
  return validateRetryReadback(p,phase,json(path.join(directory,RETRY_READBACK)),{buildId:env.GRAVICENTRA_CLOUD_BUILD_ID,authorityHead:env.I66_NATIVE_AUTHORITY_HEAD});
}
async function currentRetryState({p,phase},{db,auth:client}={}){
  if(!db||!client){
    const {GoogleAuth}=require('google-auth-library');client=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform'],projectId:C.projectId}).getClient();
    const {getApps,initializeApp,applicationDefault}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
    db=getFirestore(getApps()[0]||initializeApp({credential:applicationDefault(),projectId:C.projectId}));
  }
  const owner=require('./gravicentra-i66-make-lead-protected-executor.cjs'),support=require('../functions/product-lead-ingress-owner-support');
  const grant=await support.grantRef(db,phase==='preview').get();need(grant.exists,'RETRY_CURRENT_CLOSED_GRANT_REQUIRED');
  const fn=await owner.deployedFunction(client,p,phase),traffic=await owner.deployedTraffic(client,p,phase,fn);
  const current=await support.grantRef(db,phase==='preview').get();need(current.exists,'RETRY_CURRENT_CLOSED_GRANT_REQUIRED');equal(current.data(),grant.data(),'RETRY_GRANT_CHANGED_DURING_READBACK');
  return {observedAtUtc:new Date().toISOString(),configuration:grant.data(),function:fn,traffic};
}
async function verifyRetryRuntime(p,phase,{runtime,io,cwd=process.cwd(),readCurrentState=currentRetryState}={}){
  if(!p.providerBinding?.compensatedRetry||phase!=='preview')return null;
  runtime=runtime||await verifyRuntimeAuthority(p,{phase,action:'worker',cwd});io=io||await preview.cloudIo(await sdkHeaders());
  const result=await require('./gravicentra-i6-6-cloud-build-compensated-retry.cjs').verifyCompensatedRetry(p,phase,io,{
    currentBuildId:runtime.buildId,authorityHead:runtime.plan.authorityHead,
    readGitBytes:(commit,file)=>gitBytes(cwd,commit,file),
    verifyAdmissionAncestry:(commit,head)=>{git(cwd,'merge-base','--is-ancestor',commit,head);return true;},
    validateFailedBuild:(plan,build)=>validateBuild(plan,build,{finished:true,failed:true}),
    readPriorCandidate:plan=>candidateAt(plan,cwd),readCurrentState});
  return validateRetryReadback(p,phase,result,{buildId:runtime.buildId,authorityHead:runtime.plan.authorityHead});
}
const ENV_OUTPUTS=Object.freeze(['I66_PACKAGE_ROOT','I66_ROLE_PREVIEW_FIREBASE_CONFIG','I66_LIVE_FIREBASE_CONFIG','I66_ROLE_ROLLBACK_HOSTING_VERSION']);
function consumeNativeEnv(file,env){
  const rows=fs.existsSync(file)?fs.readFileSync(file,'utf8').split('\n').filter(Boolean):[];
  const seen=new Set();for(const row of rows){const match=/^([A-Z0-9_]+)=([^\r\n]+)$/.exec(row);need(match&&ENV_OUTPUTS.includes(match[1])&&!seen.has(match[1]),'CLOSED_ENV_OUTPUT');seen.add(match[1]);
    if(match[1]==='I66_ROLE_ROLLBACK_HOSTING_VERSION')need(/^[A-Za-z0-9_-]+$/.test(match[2]),'ROLLBACK_VERSION_OUTPUT');
    else need(match[2].startsWith(env.RUNNER_TEMP+'/')&&!match[2].split('/').includes('..'),'PACKAGE_PATH_OUTPUT');env[match[1]]=match[2];}
  fs.writeFileSync(file,'',{mode:0o600});return env;
}
async function protectOverlappingLiveDeploy(candidate,phase,control,binding,reader=operationalClaimReader()){
  const release=control.i66ScopedFunctionRelease,pkg=release?.providerStages?.PACKAGE_CERTIFIED;
  if(phase!=='live'||!pkg)return;
  need(Array.isArray(candidate.targets?.live),'COMPOSITE_LIVE_TARGETS_REQUIRED');
  if(!candidate.targets.live.some(t=>t.name===binding.targets.live&&t.region===binding.targets.region))return;
  if(release.accepted){
    const live=readFunctionSnapshot(binding.targets.live,binding.targets.region);
    equal(live.revision,release.accepted.revision,'COMPOSITE_ACCEPTED_SERVING_REVISION');
    const src=live.source;
    equal(sha(scopedArchive('gs://'+src.bucket+'/'+src.object,src.generation)),release.accepted.packageSha256,'COMPOSITE_ACCEPTED_SERVING_PACKAGE');
    return;
  }
  const prefix='i66/functional/'+binding.unit+'/'+pkg.sourceSha+'/'+pkg.buildId+'/live-';
  const claim=await reader.findClaim(prefix+'claim.json');
  if(!claim)return;
  const rolled=release.providerStages.LIVE_ROLLED_BACK;
  need(rolled,'SCOPED_LIVE_CLAIM_PENDING_BEFORE_COMPOSITE_DEPLOY');
  const receipt=await reader.findClaim(prefix+'rollback.json');
  equal(receipt,rolled.receipt,'COMPOSITE_RECONCILED_COMPENSATION');
  const restored=JSON.parse((await reader.object(receipt)).data);
  equal([restored.target,restored.revision,restored.packageSha256,restored.buildId],
    [binding.targets.live,binding.predecessor.revision,pkg.packageSha256,pkg.buildId],'COMPOSITE_ROLLBACK_PROOF');
  // A later unrelated service revision must never be overwritten on this basis.
  const row=JSON.parse(readGcloud(['run','services','describe',binding.targets.live.toLowerCase(),
    '--region='+binding.targets.region,'--format=json']));
  equal(singleRollbackRoute(row,binding.targets.live,binding.targets.region).revision,restored.revision,'COMPOSITE_PHYSICAL_PREDECESSOR');
}
function branchGuard(p,plan,cwd){
  git(cwd,'fetch','--quiet',C.repositoryUrl,'refs/heads/'+C.branch);const head=git(cwd,'rev-parse','FETCH_HEAD');
  const g=require('./gravicentra-i6-6-operational-release-candidate.cjs'),tr=JSON.parse(gitBytes(cwd,head,g.CONTROL));
  const releaseControl=JSON.parse(gitBytes(cwd,head,C.control));
  const binding=releaseControl.i66ScopedFunctionRelease?JSON.parse(gitBytes(cwd,head,UNIT_FILE)):undefined;
  assertCompositeFresh(p,releaseControl,(ref,f)=>git(cwd,'rev-parse',ref+':'+f),plan.phase,binding);equal(g.candidateForPhase(tr,plan.phase),p,'CURRENT_CANONICAL_AUTHORIZATION');verifyPinnedOwners(p,{head,cwd});
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
  const protectLive=async()=>{
    const head=branchGuard(p,plan,cwd),control=JSON.parse(gitBytes(cwd,head,C.control));
    if(plan.phase==='live'&&control.i66ScopedFunctionRelease?.providerStages?.PACKAGE_CERTIFIED)
      await protectOverlappingLiveDeploy(p,plan.phase,control,JSON.parse(gitBytes(cwd,head,UNIT_FILE)));
  };
  branchGuard(p,plan,cwd);let io=await preview.cloudIo(await sdkHeaders());
  const retryReadback=await verifyRetryRuntime(p,plan.phase,{runtime,io,cwd}),retainedBefore={};
  if(retryReadback){write(path.join(temp,RETRY_READBACK),retryReadback);retainedBefore[RETRY_READBACK]=await io.retain('i66/operational-attempts/'+identity.buildId+'/before-'+RETRY_READBACK,fs.readFileSync(path.join(temp,RETRY_READBACK)),'application/json');}
  await protectLive();const claimValue={schema:'GI_I66_NATIVE_OPERATIONAL_CLAIM_V1',executionProvider:C.provider,buildId:identity.buildId,phase:plan.phase,sourceSha:p.sourceSha,artifactId:p.artifactId,artifactDigest:p.artifactDigest,authorityHead:plan.authorityHead,planSha256:digest(plan),candidateSha256:plan.candidateSha256};
  const claim=await io.retain(lockName(p,plan.phase),Buffer.from(JSON.stringify(claimValue)+'\n'),'application/json');
  try{
  for(const file of [beforeName,...(plan.phase==='preview'?['gi-role-live-before.sha']:['gi-role-live-old-revisions.tsv','gi-role-live-before-hosting.json','gi-make-live-snapshot-trigger.json'])]){
    const bytes=fs.readFileSync(path.join(temp,file));retainedBefore[file]=await io.retain('i66/operational-attempts/'+identity.buildId+'/before-'+file,bytes);
  }
  // Recheck branch/pins after durable preimages and immediately before the
  // original deploy block. Runtime owner also gates every Make transition.
  await protectLive();await verifyRuntimeAuthority(p,{phase:plan.phase,action:'worker'});
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
      claim,checks,...(retryReadback?{compensatedRetry:retainedBefore[RETRY_READBACK]}:{}),financial:{stageCount:48,reportSha256:sha(fs.readFileSync(path.join(cwd,F.financial))),execution:plan.phase==='preview'?'EXACT_READONLY_DRIVER':'COMPOSITE_VERIFIED_TRANSACTION'},
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
function assertCompositeFresh(candidate,control,readBlob,phase='live',binding){
  const release=control.i66ScopedFunctionRelease;
  if(phase==='preview')return;
  if(binding&&Array.isArray(candidate.targets?.live)&&!candidate.targets.live.some(row=>row.name===binding.targets.live&&row.region===binding.targets.region))return;
  need(!release?.providerStages?.LIVE_DEPLOYED||!!release.accepted||!!release.providerStages.LIVE_ROLLED_BACK,'LIVE_FUNCTION_PENDING_POSTCHECK');
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
function readFunctionSnapshot(target,region,restoredTraffic) {
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
  equal(restoredTraffic||sc.revision,revision,'FUNCTION_SOURCE_MUST_MATCH_SERVING_REVISION');
  need(run.status.conditions.some(x=>x.type==='Ready'&&x.status==='True'),'RUN_READY');
  const config={...sc};for(const k of ['revision','uri','service','allTrafficOnLatestRevision'])delete config[k];
  return {target,region,service,revision:sc.revision,source,configurationDigest:digest(config)};
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
async function writeFunctionalStage(stage,facts,recoveredDeployment){
  const owner=require('./gravicentra-i66-frontend-control.cjs');
  if(stage==='LIVE_VERIFIED'&&facts.publication){
    const prefix='i66/functional/'+json(UNIT_FILE).unit+'/'+facts.sourceSha+'/'+facts.buildId+'/live-';
    need(!await operationalClaimReader().findClaim(prefix+'rollback-intent.json'),'JOURNEY_COMPENSATION_PENDING');
  }
  const ref=facts.journeys||facts.receipt||facts.artifact;
  const {meta}=await gcloudReadIo().object(ref);
  need(meta.timeCreated&&Number.isFinite(Date.parse(meta.timeCreated)),'IMMUTABLE_STAGE_TIMESTAMP');
  const change=owner.prepareFunctionalStage(stage,facts,checkedBranch(),fs,new Date(meta.timeCreated).toISOString(),recoveredDeployment);
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
function verifyFunctionalRollback(before,binding,phase){
  checkServingSnapshot(before,binding.predecessor,phase);
  const revision=JSON.parse(readGcloud(['run','revisions','describe',before.revision,'--region='+before.region,'--format=json(status.conditions)']));
  need(revision.status?.conditions?.some(row=>row.type==='Ready'&&row.status==='True'),'FUNCTIONAL_ROLLBACK_READY_BEFORE_DEPLOY');
  return {revision:before.revision,source:before.source,archiveSha256:phase==='live'?binding.predecessor.archiveSha256:binding.predecessor.previewArchiveSha256,
    configurationDigest:before.configurationDigest,ready:true};
}
function verifyClaimIdentity(claim){
  const {transitionId,...inputs}=claim;
  if(transitionId!==undefined)equal(transitionId,digest(inputs),'FUNCTIONAL_CLAIM_IDENTITY_CHANGED');
}
async function executeFunctionalPhase(phase,buildId){
  need(['package','preview','live','direct-live'].includes(phase),'FUNCTIONAL_PHASE');
  const direct=phase==='direct-live',owner=require('./gravicentra-i66-frontend-control.cjs');if(direct)phase='live';
  const publication=direct?owner.directLivePublication():null,method=publication?{publication}:{};
  if(publication)equal(git(process.cwd(),'rev-parse','HEAD:'+publication.decisionPath),publication.decisionBlob,'DIRECT_LIVE_SIGNED_OWNER_DECISION');
  if(phase==='preview'&&fs.existsSync(owner.DIRECT_LIVE_PUBLICATION.decisionPath))throw Error('I66_NATIVE_OPERATIONAL_DIRECT_LIVE_OWNER_INSTRUCTION_REQUIRES_LIVE');
  checkedBranch();const binding=scopedCandidate(),pkg=readFunctionalPackage(buildId),facts=functionalFacts(pkg);
  await verifyScopedHosting(binding);
  const c=json(C.control),stages=c.i66ScopedFunctionRelease.providerStages||{};
  need(!Object.keys(stages).some(k=>/_(HOLD|ROLLED_BACK)$/.test(k)),'TERMINAL_FUNCTIONAL_UNIT_REQUIRES_FRESH_ADMISSION');
  if(phase==='package')return writeFunctionalStage('PACKAGE_CERTIFIED',facts);
  equal(stages.PACKAGE_CERTIFIED,facts,'ARTIFACT_SIGNED_IN_AUTHORITY');
  if(phase==='live'&&!direct)need(stages.PREVIEW_VERIFIED&&stages.PREVIEW_VERIFIED.packageSha256===facts.packageSha256,'SIGNED_PREVIEW_REQUIRED');
  const target=binding.targets[phase],region=binding.targets.region,stage=phase==='preview'?'PREVIEW_DEPLOYED':'LIVE_DEPLOYED';
  const snapshot=readFunctionSnapshot(target,region),prefix='i66/functional/'+binding.unit+'/'+pkg.sourceSha+'/'+buildId+'/';
  const claimName=prefix+phase+'-claim.json',reader=operationalClaimReader(),previous=await reader.findClaim(claimName);
  const holdKey=prefix+phase+'-hold.json';
  async function recordHold(ref) {
    const terminal=JSON.parse((await reader.object(ref)).data);
    equal([terminal.target,terminal.phase,terminal.buildId,terminal.packageSha256],[target,phase,buildId,facts.packageSha256],'EXACT_HELD_OPERATION');
    equal(terminal.publication,publication||undefined,'FUNCTIONAL_HOLD_PUBLICATION_METHOD');
    return writeFunctionalStage(phase.toUpperCase()+'_HOLD',{...facts,...method,target,receipt:ref,revision:terminal.observedRevision,trafficPercent:100});
  }
  if(direct)need(!await reader.findClaim(prefix+'live-rollback-intent.json'),'DIRECT_ROLLBACK_PENDING_NO_DEPLOYMENT');
  const pendingHold=await reader.findClaim(holdKey);
  if(pendingHold)return recordHold(pendingHold);
  let before,rollbackProof;
  if(previous){
    const claim=JSON.parse((await reader.object(previous)).data);
    verifyClaimIdentity(claim);
    equal([claim.phase,claim.target,claim.packageSha256,claim.buildId,claim.bindingBlob],[phase,target,facts.packageSha256,buildId,facts.bindingBlob],'FUNCTIONAL_EXISTING_CLAIM_BINDING');
    equal(claim.publication,publication||undefined,'FUNCTIONAL_EXISTING_PUBLICATION_METHOD');
    before=claim.before;
    if(direct){rollbackProof=verifyFunctionalRollback(before,binding,phase);equal(claim.rollbackProof,rollbackProof,'DIRECT_LIVE_RETAINED_ROLLBACK_PREIMAGE');}
    // A lost ACK can be adopted only from a physical source and config readback.
    // An unfinished or rolled-back attempt cannot execute a second deployment.
    need(snapshot.revision!==before.revision,'CONSUMED_FUNCTIONAL_CLAIM_NO_REDEPLOY');
  }else{
    before=snapshot;checkServingSnapshot(before,binding.predecessor,phase);
    if(phase==='preview')checkServingSnapshot(readFunctionSnapshot(binding.targets.live,region),binding.predecessor,'live');
    if(phase==='live'&&!direct){
      const preview=readFunctionSnapshot(binding.targets.preview,region);
      equal(preview.revision,stages.PREVIEW_VERIFIED.revision,'CURRENT_ACCEPTED_PREVIEW_REVISION');
    }
    if(direct)rollbackProof=verifyFunctionalRollback(before,binding,phase);
    checkedBranch();
    // The compare-and-create must be exclusive even if two observers read no claim.
    const claim={...facts,...method,...(direct?{rollbackProof}:{}),phase,target,before,authorityHead:checkedBranch()};
    claim.transitionId=digest(claim);
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
        const held=await retainedFunctionRecord(holdKey,{...facts,...method,target,phase,beforeRevision:before.revision,observedRevision:fresh.revision});
        return recordHold(held);
      }
    }
  }
  const after=readFunctionSnapshot(target,region),src=after.source;
  need(after.revision!==before.revision,'FUNCTIONAL_NEW_REVISION_REQUIRED');
  equal(sha(scopedArchive('gs://'+src.bucket+'/'+src.object,src.generation)),facts.packageSha256,'EXACT_DEPLOYED_FUNCTION_ARCHIVE');
  equal(after.configurationDigest,before.configurationDigest,'FUNCTION_CONFIGURATION_CHANGED');
  const receipt=await retainedFunctionRecord(prefix+phase+'-deployment.json',{...facts,...method,...(direct?{rollbackProof}:{}),phase,target,before,after,trafficPercent:100});
  return writeFunctionalStage(stage,{...facts,...method,...(direct?{rollbackProof}:{}),target,revision:after.revision,trafficPercent:100,receipt,rollbackRevision:before.revision});
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
// Producer and retained canonical witness for the already certified scoped
// historical-payment unit. This does not build or deploy any product bytes.
const FUNCTIONAL_JOURNEY=Object.freeze({
  planSchema:'GI_I66_SCOPED_FUNCTION_JOURNEY_PLAN_V1',reportSchema:'GI_I66_SCOPED_FUNCTION_ROLE_JOURNEYS_V1',
  witnessSchema:'GI_I66_SCOPED_FUNCTION_SERVER_WITNESS_V1',driver:'tools/gravicentra-i6-6-proposal-application-signed-uat.cjs',
  test:'tools/gravicentra-i66-scoped-historical-journeys.test.cjs',driverTest:'tools/gravicentra-i66-scoped-historical-signed-driver.test.cjs',
  step:'i66-scoped-historical-signed-journeys',tenant:'alianzas-soluciones'
});
const FUNCTIONAL_JOURNEY_PINS=Object.freeze([C.tool,FUNCTIONAL_JOURNEY.driver,FUNCTIONAL_JOURNEY.test,FUNCTIONAL_JOURNEY.driverTest,
  'tools/gravicentra-i66-signed-qa-runtime-auth.cjs','tools/gravicentra-i66-signed-qa-runtime-auth.test.cjs',
  'tools/gravicentra-i6-6-proposal-application-signed-uat.test.cjs']);
const normalizedRole=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function functionalJourneyPrefix(p){return 'i66/functional/'+p.binding.unit+'/'+p.facts.sourceSha+'/'+p.facts.buildId+'/';}
function validateFunctionalJourneyPlan(p){
  equal(Object.keys(p||{}).sort(),['schema','phase','authorityHead','binding','facts','deployment','deploymentCreatedAt','snapshot','hosting','uiHosting','origin','pins','previousAttempt'].sort(),'JOURNEY_PLAN_KEYS');
  equal(p.schema,FUNCTIONAL_JOURNEY.planSchema,'JOURNEY_PLAN_SCHEMA');need(PHASES.includes(p.phase)&&sha40(p.authorityHead),'JOURNEY_PLAN_IDENTITY');
  equal([p.binding.schema,p.binding.unit,p.binding.scope],['GI_I66_SCOPED_FUNCTION_PACKAGE_V1','documented-historical-payment','BACKEND_CALLABLE'],'JOURNEY_EXISTING_UNIT');
  equal(p.binding.targets,{preview:'orbit360CobrosReconciliationCommandPreview',live:'orbit360CobrosReconciliationCommand',region:'us-central1'},'JOURNEY_EXISTING_TARGETS');
  equal(p.binding.roles,['Dirección','Operativo'],'JOURNEY_ASSIGNED_ROLES');
  need(sha40(p.facts.sourceSha)&&uuid(p.facts.buildId)&&sha64(p.facts.packageSha256)&&sha40(p.facts.bindingBlob),'JOURNEY_CERTIFIED_FACTS');
  preview.objectRef(p.facts.artifact);equal(p.facts.artifact.sha256,p.facts.packageSha256,'JOURNEY_PACKAGE_DIGEST');
  need(p.facts.artifact.uri.startsWith('gs://'+C.bucket+'/'+functionalJourneyPrefix(p)),'JOURNEY_PACKAGE_LOCATION');
  for(const k of Object.keys(p.facts))equal(p.deployment[k],p.facts[k],'JOURNEY_DEPLOYED_'+k);
  equal([p.deployment.target,p.snapshot.target,p.snapshot.region,p.deployment.revision,p.deployment.trafficPercent],
    [p.binding.targets[p.phase],p.binding.targets[p.phase],p.binding.targets.region,p.snapshot.revision,100],'JOURNEY_REVISION');
  need(p.snapshot.revision.startsWith(p.snapshot.target.toLowerCase()+'-')&&sha64(p.snapshot.configurationDigest),'JOURNEY_PHYSICAL_SNAPSHOT');
  preview.objectRef(p.deployment.receipt);need(Number.isFinite(Date.parse(p.deploymentCreatedAt)),'JOURNEY_DEPLOYMENT_TIME');
  equal([p.hosting.version,p.hosting.sourceSha,p.hosting.buildId],[p.binding.predecessor.hostingVersion,p.binding.predecessor.sourceSha,p.binding.predecessor.buildId],'JOURNEY_PROTECTED_LIVE_HOSTING');
  need(sha64(p.hosting.markerSha256)&&sha64(p.uiHosting.markerSha256)&&sha40(p.uiHosting.sourceSha),'JOURNEY_UI_PINS');
  equal(p.origin,p.uiHosting.origin,'JOURNEY_UI_ORIGIN');
  equal(p.uiHosting.basis,'SCOPED_HOSTING_PREDECESSOR','JOURNEY_UI_BASIS');
  if(p.phase==='live')equal([p.origin,p.uiHosting.version,p.uiHosting.sourceSha,p.uiHosting.buildId],['https://app.aysseguros.com',p.hosting.version,p.hosting.sourceSha,p.hosting.buildId],'JOURNEY_LIVE_UI');
  else need(/^https:\/\/ays-orbit-360-lab--gi-i66-rc-\d+-[a-z0-9]+\.web\.app$/.test(p.origin),'JOURNEY_PREVIEW_UI');
  equal([p.uiHosting.version,p.uiHosting.sourceSha,p.uiHosting.buildId],[p.hosting.version,p.hosting.sourceSha,p.hosting.buildId],'JOURNEY_PREDECESSOR_UI');
  equal(Object.keys(p.pins.files).sort(),[...FUNCTIONAL_JOURNEY_PINS].sort(),'JOURNEY_CLOSED_RUNTIME_PINS');
  for(const pin of Object.values(p.pins.files)){equal(Object.keys(pin).sort(),['blob','sha256'],'JOURNEY_FILE_PIN_KEYS');need(sha40(pin.blob)&&sha64(pin.sha256),'JOURNEY_FILE_PIN');}
  for(const k of ['control','unit','transport','toolsTree','functionsTree'])need(sha40(p.pins[k]),'JOURNEY_PIN_'+k);
  equal(p.pins.unit,p.facts.bindingBlob,'JOURNEY_UNIT_PIN');
  if(p.previousAttempt!==null){equal(Object.keys(p.previousAttempt||{}).sort(),['cursor','claim','hold','executionBuildId'].sort(),'JOURNEY_RETRY_KEYS');for(const k of ['cursor','claim','hold'])preview.objectRef(p.previousAttempt[k]);need(uuid(p.previousAttempt.executionBuildId),'JOURNEY_RETRY_BUILD');}
  return p;
}
function functionalJourneyConfig(p){validateFunctionalJourneyPlan(p);return {
  steps:[{id:C.sdkStep,name:C.sdkImage,entrypoint:'bash',args:['-euo','pipefail','-c',SDK_PROVIDER_SCRIPT]},
    {id:FUNCTIONAL_JOURNEY.step,name:C.image,entrypoint:'node',args:[C.tool,'functional-journey-worker',JSON.stringify(p)],env:[
      'GRAVICENTRA_BUILD_PROVIDER=CLOUD_BUILD','GRAVICENTRA_CLOUD_BUILD_ID=$BUILD_ID','GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT='+C.serviceAccount,
      'PROJECT_ID='+C.projectId,'TENANT_HINT='+FUNCTIONAL_JOURNEY.tenant]}],
  serviceAccount:'projects/'+C.projectId+'/serviceAccounts/'+C.serviceAccount,timeout:'1800s',logsBucket:'gs://'+C.bucket+'/i66/cloud-build-logs',
  options:{logging:'GCS_ONLY',sourceProvenanceHash:['SHA256'],machineType:'E2_STANDARD_2'},
  tags:['i66-scoped-journeys-'+p.phase,'i66-package-'+p.facts.buildId]
};}
function validateFunctionalJourneyBuild(p,b,{finished=true,terminalFailure=false}={}){
  const c=functionalJourneyConfig(p);need(uuid(b.id),'JOURNEY_BUILD_UUID');equal(b.projectId,C.projectId,'JOURNEY_PROVIDER_PROJECT');
  need([C.projectId,C.projectNumber].some(x=>b.name==='projects/'+x+'/locations/'+C.region+'/builds/'+b.id),'JOURNEY_BUILD_RESOURCE');
  if(terminalFailure){need(!finished&&['FAILURE','TIMEOUT','CANCELLED','EXPIRED','INTERNAL_ERROR'].includes(b.status)&&Date.parse(b.finishTime)>=Date.parse(b.startTime),'JOURNEY_PROVIDER_TERMINAL_FAILURE');}
  else equal(b.status,finished?'SUCCESS':'WORKING','JOURNEY_PROVIDER_SUCCESS');
  for(const k of ['serviceAccount','timeout','logsBucket','tags'])equal(b[k],c[k],'JOURNEY_BUILD_'+k);
  for(const k of ['logging','sourceProvenanceHash','machineType'])equal(b.options?.[k],c.options[k],'JOURNEY_BUILD_OPTION_'+k);
  for(const k of ['env','secretEnv','volumes'])need(!b.options?.[k]?.length,'JOURNEY_NO_GLOBAL_OVERRIDE');
  need(!b.options?.pool?.name&&!b.options?.workerPool&&!b.options?.automapSubstitutions&&!b.options?.dynamicSubstitutions,'JOURNEY_NO_EXECUTION_POOL_OVERRIDE');
  need(!b.secrets?.length&&!b.availableSecrets&&!b.dependencies?.length&&!b.images?.length&&!b.artifacts&&!b.gitConfig&&!b.buildTriggerId&&!Object.keys(b.substitutions||{}).length,'JOURNEY_NO_OTHER_EXECUTION');
  equal(Object.keys(b.source||{}),['gitSource'],'JOURNEY_GIT_SOURCE');equal([b.source.gitSource.url,b.source.gitSource.revision],[C.repositoryUrl,p.authorityHead],'JOURNEY_RUNTIME_SOURCE');need(!b.source.gitSource.dir,'JOURNEY_ROOT_SOURCE');
  if(finished||b.sourceProvenance?.resolvedGitSource){equal([b.sourceProvenance?.resolvedGitSource?.url,b.sourceProvenance?.resolvedGitSource?.revision],[C.repositoryUrl,p.authorityHead],'JOURNEY_RESOLVED_SOURCE');need(!b.sourceProvenance.resolvedGitSource.dir,'JOURNEY_RESOLVED_ROOT');}
  equal(b.steps?.length,2,'JOURNEY_TWO_STEPS');
  for(let i=0;i<2;i++){const s=b.steps[i],e=c.steps[i];for(const k of ['id','name','entrypoint'])equal(s[k],e[k],'JOURNEY_STEP_'+k);
    if(i===0)need(JSON.stringify(s.args)===JSON.stringify(e.args)||JSON.stringify(s.args)===JSON.stringify(['-euo','pipefail','-c',SDK_SCRIPT]),'JOURNEY_SDK_SCRIPT');else equal(s.args,e.args,'JOURNEY_STEP_ARGS');
    if(e.env)need(JSON.stringify(s.env)===JSON.stringify(e.env)||JSON.stringify(s.env)===JSON.stringify(e.env.map(x=>x.replace('$BUILD_ID',b.id))),'JOURNEY_STEP_ENV');else need(!s.env?.length,'JOURNEY_SDK_ENV');
    need(!s.allowFailure&&!s.allowExitCodes?.length&&!s.script&&!s.dir&&!s.secretEnv?.length&&!s.volumes?.length,'JOURNEY_NO_STEP_BYPASS');
    if(finished){equal(s.status,'SUCCESS','JOURNEY_STEP_SUCCESS');need(Date.parse(s.timing?.startTime)>=Date.parse(b.startTime)&&Date.parse(s.timing?.endTime)>=Date.parse(s.timing?.startTime)&&Date.parse(s.timing?.endTime)<=Date.parse(b.finishTime),'JOURNEY_STEP_TIMING');}}
  need(Number.isFinite(Date.parse(b.startTime))&&Number.isFinite(Date.parse(b.createTime)),'JOURNEY_PROVIDER_START');
  if(finished){need(Date.parse(b.finishTime)>=Date.parse(b.startTime),'JOURNEY_PROVIDER_FINISH');equal(b.results?.buildStepImages?.length,2,'JOURNEY_PROVIDER_IMAGE_COUNT');need(b.results.buildStepImages.every(x=>/^sha256:[a-f0-9]{64}$/.test(x)),'JOURNEY_PROVIDER_IMAGES');}
  return b;
}
function verifyFunctionalJourneyPins(p,cwd=process.cwd()){
  validateFunctionalJourneyPlan(p);git(cwd,'merge-base','--is-ancestor',p.authorityHead,'HEAD');
  equal(git(cwd,'rev-parse',p.authorityHead+':'+C.control),p.pins.control,'JOURNEY_ORIGINAL_CONTROL_PIN');
  equal(git(cwd,'rev-parse',p.authorityHead+':'+C.transport),p.pins.transport,'JOURNEY_ORIGINAL_TRANSPORT_PIN');
  equal(git(cwd,'rev-parse',p.authorityHead+':'+UNIT_FILE),p.pins.unit,'JOURNEY_ORIGINAL_BINDING_PIN');
  equal(blob(fs.readFileSync(path.join(cwd,UNIT_FILE))),p.pins.unit,'JOURNEY_CURRENT_BINDING_PIN');
  equal(json(path.join(cwd,UNIT_FILE)),p.binding,'JOURNEY_CURRENT_BINDING');
  equal(git(cwd,'rev-parse',p.authorityHead+':tools'),p.pins.toolsTree,'JOURNEY_RUNTIME_TREE_PIN');
  equal(git(cwd,'rev-parse','HEAD:tools'),p.pins.toolsTree,'JOURNEY_CURRENT_RUNTIME_DEPENDENCIES');
  equal(git(cwd,'rev-parse',p.facts.sourceSha+':functions'),p.pins.functionsTree,'JOURNEY_PACKAGE_SOURCE_TREE');
  equal(git(cwd,'rev-parse','HEAD:functions'),p.pins.functionsTree,'JOURNEY_CURRENT_FUNCTION_TREE');
  for(const [file,pin] of Object.entries(p.pins.files)){
    const raw=gitBytes(cwd,p.authorityHead,file);equal([blob(raw),sha(raw)],[pin.blob,pin.sha256],'JOURNEY_SEALED_RUNTIME_BYTES');equal(fs.readFileSync(path.join(cwd,file)),raw,'JOURNEY_EXECUTING_RUNTIME_BYTES');
  }
  equal(git(cwd,'status','--porcelain','--untracked-files=no'),'','JOURNEY_CLEAN_TRACKED_CHECKOUT');return true;
}
async function functionalUiHosting(phase,binding,hosting,control=json(C.control),expected){
  const origin=phase==='live'?'https://app.aysseguros.com':control.i66FrontendReleaseHead.previewUrl;
  const r=await fetch(origin+'/__recovery__/build.json',{cache:'no-store',redirect:'error'});need(r.ok,'JOURNEY_UI_MARKER_HTTP');const raw=Buffer.from(await r.arrayBuffer()),marker=JSON.parse(raw);
  let version=hosting.version;
  if(phase==='preview'){
    const match=/--(gi-i66-rc-\d+)-[a-z0-9]+\.web\.app$/.exec(origin);need(match,'JOURNEY_EXISTING_CHANNEL');
    const token=readGcloud(['auth','print-access-token']).toString().trim();
    const response=await fetch('https://firebasehosting.googleapis.com/v1beta1/sites/'+C.projectId+'/channels/'+match[1],{headers:{Authorization:'Bearer '+token}});need(response.ok,'JOURNEY_UI_PROVIDER_CHANNEL');const channel=await response.json();
    equal(channel.url,origin,'JOURNEY_PROVIDER_CHANNEL_URL');version=channel.release?.version?.name;
    need(Date.parse(channel.expireTime)>Date.now(),'JOURNEY_EXISTING_CHANNEL_UNEXPIRED');
  }
  equal([version,marker.buildId,marker.sourceSha],[hosting.version,hosting.buildId,hosting.sourceSha],'JOURNEY_PREDECESSOR_MARKER');
  const observed={origin,version,buildId:marker.buildId,sourceSha:marker.sourceSha,markerSha256:sha(raw),basis:'SCOPED_HOSTING_PREDECESSOR'};
  if(expected)equal(observed,expected,'JOURNEY_CURRENT_UI_UNCHANGED');return observed;
}
async function makeFunctionalJourneyPlan(phase,buildId,previousAttempt=null){
  need(PHASES.includes(phase),'JOURNEY_PHASE');const head=checkedBranch(),binding=scopedCandidate(),pack=readFunctionalPackage(buildId),facts=functionalFacts(pack),control=json(C.control);
  const deployment=control.i66ScopedFunctionRelease.providerStages?.[phase.toUpperCase()+'_DEPLOYED'];need(deployment,'JOURNEY_DEPLOYED_STAGE_REQUIRED');
  equal(control.i66ScopedFunctionRelease.providerStages.PACKAGE_CERTIFIED,facts,'JOURNEY_SIGNED_PACKAGE');
  const snapshot=readFunctionSnapshot(binding.targets[phase],binding.targets.region),evidence=await gcloudReadIo().object(deployment.receipt),stored=JSON.parse(evidence.data);
  equal(stored.after,snapshot,'JOURNEY_DEPLOYMENT_PHYSICAL_READBACK');equal(sha(scopedArchive('gs://'+snapshot.source.bucket+'/'+snapshot.source.object,snapshot.source.generation)),facts.packageSha256,'JOURNEY_DEPLOYED_ARCHIVE');
  const hosting=await verifyScopedHosting(binding),uiHosting=await functionalUiHosting(phase,binding,hosting,control);
  const p={schema:FUNCTIONAL_JOURNEY.planSchema,phase,authorityHead:head,binding,facts,previousAttempt,deployment,deploymentCreatedAt:evidence.meta.timeCreated,snapshot,hosting,uiHosting,origin:uiHosting.origin,
    pins:{control:git(process.cwd(),'rev-parse','HEAD:'+C.control),unit:facts.bindingBlob,transport:git(process.cwd(),'rev-parse','HEAD:'+C.transport),toolsTree:git(process.cwd(),'rev-parse','HEAD:tools'),functionsTree:git(process.cwd(),'rev-parse','HEAD:functions'),
      files:Object.fromEntries(FUNCTIONAL_JOURNEY_PINS.map(file=>{const raw=fs.readFileSync(file);return[file,{blob:blob(raw),sha256:sha(raw)}];}))}};
  validateFunctionalJourneyPlan(p);verifyFunctionalJourneyPins(p);checkedBranch();return p;
}
function functionalJourneyTargets(phase,j){const prefix=phase==='preview'?'previewReconciliation':'reconciliation';return[
  {collection:'data/clientes/items',id:j.clientId},{collection:'data/polizas/items',id:j.policyId},{collection:'data/recibosEsperados/items',id:j.receiptId},
  {collection:'data/cobros/items',id:j.cobroId},{collection:prefix+'Requests',id:j.requestId},{collection:prefix+'Events',id:j.eventId}];}
function functionalWitnessValue(v){return Array.isArray(v)?v.map(functionalWitnessValue):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,functionalWitnessValue(v[k])])):v;}
function functionalServerTime(value){
  if(value&&typeof value==='object'){const seconds=value.seconds??value._seconds,nanos=value.nanoseconds??value._nanoseconds;if(Number.isInteger(seconds)&&Number.isInteger(nanos))return seconds*1000+nanos/1000000;}
  return Date.parse(value);
}
function validateFunctionalJourneyWitness(p,j,w){
  equal(w?.schema,FUNCTIONAL_JOURNEY.witnessSchema,'JOURNEY_CANONICAL_WITNESS_SCHEMA');equal(w.status,'PASS','JOURNEY_CANONICAL_WITNESS_PASS');
  const d=w.documents,r=d.receipt,payment=d.payment,a=d.event,request=d.request,result=request.result,proof=payment.historicalPaymentEvidence;
  equal([j.origin,j.route,j.normalUi,j.reloaded,j.idempotentReplay,j.replayUnchanged,j.newCollection,j.realCustomerWrites],
    [p.origin,'/#/cobros',true,true,true,true,false,0],'JOURNEY_NORMAL_UI_REPLAY');
  equal([j.originalPaymentBasis,j.originalPaymentCount,j.afterPaymentCount,j.originalCobroDocumentCount,j.afterCobroDocumentCount],['VERIFIED_HISTORICAL_RECEIPT',1,1,0,1],'JOURNEY_LOGICAL_VERSUS_PHYSICAL_PAYMENT');
  equal([a.eventId,a.requestId,a.operation,request.operation,request.status,request.eventId,a.receiptId,a.cobroId],
    [j.eventId,j.requestId,'reconcile_payment','reconcile_payment','committed',j.eventId,j.receiptId,j.cobroId],'JOURNEY_CANONICAL_COMMIT');
  equal(normalizedRole(a.actor?.activeRole),normalizedRole(j.role),'JOURNEY_CANONICAL_ROLE');need(a.actor?.uid&&sha(a.actor.uid)===j.actorUidSha256,'JOURNEY_CANONICAL_ACTOR');
  equal([w.actor.uidSha256,w.actor.activeRole],[j.actorUidSha256,normalizedRole(j.role)],'JOURNEY_MEMBER_ROLE');need(sha64(w.actor.memberDigest),'JOURNEY_MEMBER_DIGEST');
  need(functionalServerTime(a.createdAt)>=Date.parse(p.deploymentCreatedAt)&&Date.parse(w.observedAt)>=functionalServerTime(a.createdAt),'JOURNEY_FRESH_SERVER_AUDIT');
  equal([r.id,r.cobroId,r.polizaId,r.clienteId,payment.id,payment.reciboId,payment.polizaId,payment.clienteId,result.policyId,result.clientId],
    [j.receiptId,j.cobroId,j.policyId,j.clientId,j.cobroId,j.receiptId,j.policyId,j.clientId,j.policyId,j.clientId],'JOURNEY_CANONICAL_RELATIONS');
  equal([r.invoiceNumber,payment.invoiceNumber,r.paidDate,payment.paidDate,payment.monto,result.amount,a.recordedPaymentBefore?.amount,a.recordedPaymentAfter?.amount],
    [j.invoiceNumber,j.invoiceNumber,j.originalPaidDate,j.originalPaidDate,j.originalAmount,j.originalAmount,j.originalAmount,j.originalAmount],'JOURNEY_ORIGINAL_AMOUNT_DATE_INVOICE');
  equal([a.recordedPaymentBefore?.sourceCollection,a.recordedPaymentBefore?.sourceId],['recibosEsperados',j.receiptId],'JOURNEY_HISTORICAL_PREIMAGE_SOURCE');
  need(proof?.contract==='SIGA_I65_PAID_PRIMARY_20260918'&&proof.newCollection===false&&proof.receiptId===j.receiptId&&proof.policyId===j.policyId&&proof.amount===j.originalAmount&&proof.fechaPagoReportada===j.originalPaidDate&&sha64(proof.sourceKey),'JOURNEY_HISTORICAL_PROOF');
  equal(a.recordedPaymentBefore.historicalSource,proof,'JOURNEY_AUDITED_HISTORICAL_EVIDENCE');equal(proof.sourceKey,j.sourceKey,'JOURNEY_GLOBAL_SOURCE_KEY');equal(result.historicalPaymentLinked,true,'JOURNEY_NO_NEW_REVENUE');
  equal(w.linkedPaymentIds,[j.cobroId],'JOURNEY_SINGLE_PHYSICAL_DOCUMENT');equal(w.linkedPortfolioIds,[],'JOURNEY_NO_NEW_DEBT');
  const root='tenants/'+FUNCTIONAL_JOURNEY.tenant+'/',targets=functionalJourneyTargets(p.phase,j),before=w.before,after=w.after;
  equal(Object.keys(before).sort(),targets.slice(0,4).map(t=>root+t.collection+'/'+t.id).sort(),'JOURNEY_CLOSED_BEFORE');equal(Object.keys(after).sort(),targets.map(t=>root+t.collection+'/'+t.id).sort(),'JOURNEY_CLOSED_AFTER');
  equal(digest(before),j.beforeDigest,'JOURNEY_CANONICAL_BEFORE_DIGEST');equal(digest(after),j.afterDigest,'JOURNEY_CANONICAL_AFTER_DIGEST');
  const br=before[root+'data/recibosEsperados/items/'+j.receiptId],bp=before[root+'data/cobros/items/'+j.cobroId];equal(bp,{exists:false,data:null,updateTime:null},'JOURNEY_NO_BEFORE_COBRO');
  need(br.exists&&br.data.__syntheticQa===true&&!br.data.cobroId&&/^b3004qa_i66_historical_/.test(j.receiptId),'JOURNEY_OWNED_HISTORICAL_FIXTURE');
  for(const [key,doc] of [['client',d.client],['policy',d.policy]]){const i=key==='client'?0:1,prior=before[root+targets[i].collection+'/'+targets[i].id];need(prior.exists&&prior.data.__syntheticQa===true&&prior.updateTime,'JOURNEY_QA_PARENTS');equal(prior.data,doc,'JOURNEY_PARENTS_UNCHANGED');}
  for(const key of ['fechaPagoReportada','fechaCorteFuente','sourceBundleSha256','sourceRef','sourceRefsI65','matchQuality','motivosCalidad','primaTotal','primaNeta','formaPago','vigenciaInicio','vigenciaFin','serie'])equal(r[key],br.data[key],'JOURNEY_PRESERVED_HISTORICAL_'+key);
  equal(sha(FUNCTIONAL_JOURNEY.tenant+'|'+br.data.sourceBundleSha256+'|'+br.data.sourceRefsI65[0]),j.sourceKey,'JOURNEY_DERIVED_HISTORICAL_SOURCE_KEY');
  equal(j.cobroId,'cob_'+sha(FUNCTIONAL_JOURNEY.tenant+'|receipt|'+j.receiptId).slice(0,28),'JOURNEY_DERIVED_PAYMENT_ID');
  for(const [i,key] of ['client','policy','receipt','payment','request','event'].entries()){const row=after[root+targets[i].collection+'/'+targets[i].id];need(row.exists&&typeof row.updateTime==='string','JOURNEY_CANONICAL_VERSION');equal(row.data,d[key],'JOURNEY_WITNESS_DOC_'+key);}
  equal(r.__syntheticQa,true,'JOURNEY_SYNTHETIC_RECEIPT');if(p.phase==='preview')equal(payment.__syntheticQa,true,'JOURNEY_PREVIEW_SYNTHETIC_PAYMENT');
  return w;
}
function functionalMemberValue(v){
  if(v&&typeof v==='object'&&Number.isInteger(v.seconds)&&Number.isInteger(v.nanoseconds)&&typeof v.toDate==='function')return {$timestamp:v.seconds+':'+String(v.nanoseconds).padStart(9,'0')};
  if(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(v)){
    const seconds=Math.floor(Date.parse(v)/1000),fraction=(/\.(\d+)Z$/.exec(v)?.[1]||'').padEnd(9,'0');if(Number.isFinite(seconds))return {$timestamp:seconds+':'+fraction};
  }
  return Array.isArray(v)?v.map(functionalMemberValue):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,functionalMemberValue(x)])):v;
}
function functionalJourneyMember(member,role){
  const r=require('../functions/product-active-role-contract.js').resolveProductActiveRole(member,normalizedRole(role));
  need(member.active!==false&&member.activo!==false&&['active','activo'].includes(normalizedRole(member.status||member.estado)),'JOURNEY_MEMBER_ACTIVE');
  need([].concat(member.countries||member.paises||[]).includes('GT'),'JOURNEY_MEMBER_COUNTRY');
  return {activeRole:r.activeRole,memberDigest:digest(functionalMemberValue(member))};
}
async function captureFunctionalJourneyWitness(p,{journey:j,before,after},{db}){
  const root='tenants/'+FUNCTIONAL_JOURNEY.tenant+'/',targets=functionalJourneyTargets(p.phase,j),rows={};
  const documents={};for(const [i,t] of targets.entries()){const s=await db.doc(root+t.collection+'/'+t.id).get();need(s.exists&&s.updateTime,'JOURNEY_WORKER_CANONICAL_DOCUMENT');const row={exists:true,data:s.data(),updateTime:s.updateTime.seconds+':'+s.updateTime.nanoseconds};rows[s.ref.path]=row;documents[['client','policy','receipt','payment','request','event'][i]]=row.data;}
  equal(digest(rows),digest(after),'JOURNEY_CALLBACK_CANONICAL_READBACK');
  const ids=async(collection,field)=>{const s=await db.collection(root+'data/'+collection+'/items').where(field,'==',j.receiptId).limit(3).get();need(s.size<3,'JOURNEY_BOUNDED_UNIQUENESS');return s.docs.map(d=>d.id).sort();};
  const payments=[...new Set([...(await ids('cobros','reciboId')),...(await ids('cobros','receiptId'))])].sort(),portfolio=[...new Set([...(await ids('carteraPrimas','reciboId')),...(await ids('carteraPrimas','receiptId'))])].sort();
  const actor=documents.event.actor,member=await db.doc(root+'members/'+actor.uid).get();need(member.exists,'JOURNEY_ACTOR_MEMBERSHIP');
  const membership=functionalJourneyMember(member.data(),j.role);
  const w=functionalWitnessValue({schema:FUNCTIONAL_JOURNEY.witnessSchema,status:'PASS',observedAt:new Date().toISOString(),documents,before,after:rows,linkedPaymentIds:payments,linkedPortfolioIds:portfolio,
    actor:{uidSha256:sha(actor.uid),...membership}});
  validateFunctionalJourneyWitness(p,j,w);return w;
}
function validateFunctionalJourneyReport(p,report,build){
  validateFunctionalJourneyBuild(p,build);equal(report.schema,FUNCTIONAL_JOURNEY.reportSchema,'JOURNEY_REPORT_SCHEMA');equal(report.status,'PASS','JOURNEY_REPORT_SUCCESS');equal(report.plan,p,'JOURNEY_RETAINED_PLAN');
  equal([report.executionProvider,report.executionBuildId,report.phase,report.sourceSha,report.packageBuildId,report.packageSha256,report.bindingBlob,report.revision,report.hostingBuildId],
    [C.provider,build.id,p.phase,p.facts.sourceSha,p.facts.buildId,p.facts.packageSha256,p.facts.bindingBlob,p.snapshot.revision,p.uiHosting.buildId],'JOURNEY_REPORT_PROVENANCE');
  equal(report.protectedLiveHosting,p.hosting,'JOURNEY_REPORT_PROTECTED_LIVE');equal(report.uiHosting,p.uiHosting,'JOURNEY_REPORT_UI');
  equal(report.journeys.map(j=>j.role),p.binding.roles,'JOURNEY_REPORT_ROLES');equal(new Set(report.journeys.map(j=>j.actorUidSha256)).size,2,'JOURNEY_DISTINCT_SIGNED_ACTORS');
  equal([report.realCustomerWrites,report.authOrMembershipMutations],[0,0],'JOURNEY_NO_REAL_OR_AUTH_MUTATIONS');
  need(Date.parse(report.startedAt)>=Date.parse(build.startTime)&&Date.parse(report.finishedAt)>=Date.parse(report.startedAt)&&Date.parse(report.finishedAt)<=Date.parse(build.finishTime),'JOURNEY_ACTUAL_EXECUTION_WINDOW');
  for(const j of report.journeys){equal(j.status,'PASS','JOURNEY_ROLE_SUCCESS');validateFunctionalJourneyWitness(p,j,j.serverReadback);need(Date.parse(j.serverReadback.observedAt)>=Date.parse(report.startedAt)&&Date.parse(j.serverReadback.observedAt)<=Date.parse(report.finishedAt),'JOURNEY_WITNESS_EXECUTION_WINDOW');equal([j.cleanup?.status,j.cleanup?.remaining],['PASS',0],'JOURNEY_ROLE_CLEANUP');equal(j.cleanup.targets,functionalJourneyTargets(p.phase,j),'JOURNEY_ROLE_CLEANUP_TARGETS');}
  equal([report.cleanup?.status,report.cleanup?.remaining],['PASS',0],'JOURNEY_ALL_CLEANUP');equal(report.cleanup.targets,report.journeys.flatMap(j=>functionalJourneyTargets(p.phase,j)),'JOURNEY_CLOSED_CLEANUP_TARGETS');return report;
}
function functionalJourneyCleanupProof(report){
  const rows=report?.journeys;
  if(!Array.isArray(rows)||!rows.length)return null;
  const safe=rows.every(j=>j.cleanup?.status==='PASS'&&j.cleanup.remaining===0&&Array.isArray(j.cleanup.targets));
  return {status:safe?'PASS':'HOLD',remaining:rows.reduce((sum,j)=>sum+(Number.isSafeInteger(j.cleanup?.remaining)?j.cleanup.remaining:1),0),targets:rows.flatMap(j=>j.cleanup?.targets||[])};
}
async function functionalCleanupAbsent(targets,{read=async t=>{
  const token=readGcloud(['auth','print-access-token']).toString().trim();const stem='https://firestore.googleapis.com/v1/projects/'+C.projectId+'/databases/(default)/documents/tenants/'+FUNCTIONAL_JOURNEY.tenant+'/';
  return (await fetch(stem+t.collection+'/'+t.id,{headers:{Authorization:'Bearer '+token}})).status;
}}={}){
  need(Array.isArray(targets)&&targets.length<=12,'JOURNEY_CLOSED_CLEANUP_LIST');
  for(const t of targets){need(/^(?:data\/(?:clientes|polizas|recibosEsperados|cobros)\/items|(?:previewReconciliation|reconciliation)(?:Events|Requests))$/.test(t.collection)&&/^[A-Za-z0-9_-]{1,180}$/.test(t.id),'JOURNEY_CLEANUP_PATH');equal(await read(t),404,'JOURNEY_SERVER_CLEANUP_ABSENCE');}
}
function validateFunctionalJourneyRetryEvidence(p,prior,build,hold,claim,cursor){
  need(prior&&p.previousAttempt,'JOURNEY_RETRY_REFERENCE_REQUIRED');equal(prior,p.previousAttempt,'JOURNEY_RETRY_EXACT_PREIMAGE');
  validateFunctionalJourneyBuild(hold.plan,build,{finished:false,terminalFailure:true});
  equal([hold.schema,hold.executionBuildId,hold.phase,hold.packageBuildId,hold.accepted],['GI_I66_SCOPED_FUNCTION_JOURNEY_HOLD_V1',build.id,p.phase,p.facts.buildId,false],'JOURNEY_RETRY_TERMINAL_HOLD');
  equal(hold.plan.facts,p.facts,'JOURNEY_RETRY_SAME_CERTIFIED_PACKAGE');equal(hold.plan.binding,p.binding,'JOURNEY_RETRY_SAME_UNIT');
  equal(hold.claim,prior.claim,'JOURNEY_RETRY_PRESERVED_CLAIM');equal(hold.planSha256,digest(hold.plan),'JOURNEY_RETRY_OLD_PLAN');
  equal([claim.executionBuildId,claim.planSha256,claim.packageBuildId,claim.phase,claim.authorityHead],[build.id,digest(hold.plan),p.facts.buildId,p.phase,hold.plan.authorityHead],'JOURNEY_RETRY_ORIGINAL_CLAIM');
  equal(cursor,{schema:'GI_I66_SCOPED_FUNCTION_JOURNEY_CURSOR_V1',claim:prior.claim,executionBuildId:build.id,planSha256:digest(hold.plan)},'JOURNEY_RETRY_CURSOR');
  equal([hold.cleanup?.status,hold.cleanup?.remaining],['PASS',0],'JOURNEY_RETRY_PROVEN_CLEANUP');need(Array.isArray(hold.cleanup.targets),'JOURNEY_RETRY_CLEANUP_TARGETS');
  const partial=hold.partialReport;need(partial&&Array.isArray(partial.journeys)&&partial.journeys.length>0&&partial.journeys.length<=2,'JOURNEY_RETRY_PARTIAL_DRIVER_EVIDENCE');
  equal(functionalJourneyCleanupProof(partial),hold.cleanup,'JOURNEY_RETRY_CLEANUP_EVIDENCE');
  for(const j of partial.journeys){need(/^b3004qa_i66_historical_/.test(j.receiptId),'JOURNEY_RETRY_SYNTHETIC_NAMESPACE');const allowed=functionalJourneyTargets(p.phase,j).map(t=>t.collection+'/'+t.id);need(j.cleanup.targets.every(t=>allowed.includes(t.collection+'/'+t.id)),'JOURNEY_RETRY_OWNED_TARGETS');}
  return true;
}
async function verifyPreviousFunctionalJourney(p,io=operationalClaimReader()){
  const prior=p.previousAttempt;need(prior,'JOURNEY_RETRY_PREIMAGE');const objects=await Promise.all([io.object(prior.cursor),io.object(prior.claim),io.object(prior.hold)]),[cursor,claim,hold]=objects.map(o=>JSON.parse(o.data));
  const build=await io.api('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+prior.executionBuildId);
  validateFunctionalJourneyRetryEvidence(p,prior,build,hold,claim,cursor);for(const o of objects)pkg.validateObjectTime(build,o.meta);
  git(process.cwd(),'merge-base','--is-ancestor',hold.plan.authorityHead,p.authorityHead);
  for(const [file,pin] of Object.entries(hold.plan.pins.files)){const raw=gitBytes(process.cwd(),hold.plan.authorityHead,file);equal([blob(raw),sha(raw)],[pin.blob,pin.sha256],'JOURNEY_RETRY_SIGNED_METHOD');}
  equal(await io.findClaim(functionalJourneyPrefix(p)+p.phase+'-journey-current.json'),prior.cursor,'JOURNEY_RETRY_CURRENT_CURSOR');await functionalCleanupAbsent(hold.cleanup.targets);return prior;
}
async function acquireFunctionalJourneyClaim(p,executionBuildId){
  const base=functionalJourneyPrefix(p),reader=operationalClaimReader(),cursorName=base+p.phase+'-journey-current.json';
  if(p.previousAttempt)await verifyPreviousFunctionalJourney(p,reader);else equal(await reader.findClaim(cursorName),null,'JOURNEY_EXCLUSIVE_FIRST_ATTEMPT');
  const claim=await retainedFunctionRecord(base+p.phase+'-journey-claims/'+executionBuildId+'.json',{schema:'GI_I66_SCOPED_FUNCTION_JOURNEY_CLAIM_V1',phase:p.phase,packageBuildId:p.facts.buildId,executionBuildId,authorityHead:p.authorityHead,planSha256:digest(p)});
  const value={schema:'GI_I66_SCOPED_FUNCTION_JOURNEY_CURSOR_V1',claim,executionBuildId,planSha256:digest(p)},raw=Buffer.from(JSON.stringify(value,null,2)+'\n');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'i66-scoped-cursor-')),file=path.join(tmp,'cursor.json');
  try{fs.writeFileSync(file,raw,{mode:0o600});try{readGcloud(['storage','cp',file,'gs://'+C.bucket+'/'+cursorName,'--if-generation-match='+(p.previousAttempt?.cursor.generation||'0'),'--quiet']);}catch(error){const existing=await reader.findClaim(cursorName);if(!existing||existing.sha256!==sha(raw))throw error;}
    const cursor=await reader.findClaim(cursorName);need(cursor,'JOURNEY_CURSOR_UNCONFIRMED');equal(cursor.sha256,sha(raw),'JOURNEY_EXCLUSIVE_CURSOR_CAS');return {claim,cursor};
  }catch(error){error.functionalJourneyClaim=claim;throw error;}finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
async function functionalJourneyWorker(p){
  validateFunctionalJourneyPlan(p);equal(process.versions.node.split('.')[0],'22','JOURNEY_NODE22');equal(git(process.cwd(),'rev-parse','HEAD'),p.authorityHead,'JOURNEY_EXECUTING_HEAD');
  const identity=await auth.verifyCloudBuildRuntime();
  if(git(process.cwd(),'rev-parse','--is-shallow-repository')==='true')git(process.cwd(),'fetch','--quiet','--no-tags','--unshallow',C.repositoryUrl,'refs/heads/'+C.branch);
  verifyFunctionalJourneyPins(p);equal(checkedBranch(),p.authorityHead,'JOURNEY_CURRENT_AUTHORITY');
  process.env.PATH=path.join(process.cwd(),'.i66-provider/google-cloud-sdk/bin')+':'+process.env.PATH;
  need(Number(String(json('.i66-provider/version.json')['Google Cloud SDK']||'').split('.')[0])>=483,'JOURNEY_GCLOUD_VERSION');
  validateFunctionalJourneyBuild(p,await gcloudReadIo().api('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+identity.buildId),{finished:false});
  const base=functionalJourneyPrefix(p),startedAt=new Date().toISOString();let report,attempt=null;
  try{
    const log=path.join(os.tmpdir(),'i66-scoped-journey-'+identity.buildId+'.log');
    pkg.execLogged('npm',['install','--no-save','--package-lock=false','--ignore-scripts','--no-audit','--no-fund','google-auth-library@10.9.1','firebase-admin@13.4.0','playwright@1.55.0'],{log});
    pkg.execLogged(process.execPath,['node_modules/playwright/cli.js','install','--with-deps','chromium'],{log,append:true});
    pkg.execLogged(process.execPath,['--test',FUNCTIONAL_JOURNEY.test,FUNCTIONAL_JOURNEY.driverTest,'tools/gravicentra-i66-signed-qa-runtime-auth.test.cjs'],{log,append:true});
    equal(functionalFacts(readFunctionalPackage(p.facts.buildId)),p.facts,'JOURNEY_WORKER_CERTIFIED_PACKAGE');
    equal(readFunctionSnapshot(p.snapshot.target,p.snapshot.region),p.snapshot,'JOURNEY_WORKER_DEPLOYED_REVISION');equal(await verifyScopedHosting(p.binding),p.hosting,'JOURNEY_WORKER_PROTECTED_LIVE');await functionalUiHosting(p.phase,p.binding,p.hosting,json(C.control),p.uiHosting);checkedBranch();
    const admin=require('firebase-admin');
    report=await require('./gravicentra-i6-6-proposal-application-signed-uat.cjs').runScopedHistoricalPaymentJourneys({phase:p.phase,origin:p.origin,binding:p.binding,facts:p.facts,hosting:p.hosting,uiHosting:p.uiHosting,revision:p.snapshot.revision,
      onServerReadback:input=>captureFunctionalJourneyWitness(p,input,{db:admin.firestore()})},{beforeFixtureWrite:async()=>{
        checkedBranch();equal(readFunctionSnapshot(p.snapshot.target,p.snapshot.region),p.snapshot,'JOURNEY_FIRST_WRITE_REVISION');
        if(!attempt)attempt=await acquireFunctionalJourneyClaim(p,identity.buildId);
        else equal(await operationalClaimReader().findClaim(base+p.phase+'-journey-current.json'),attempt.cursor,'JOURNEY_OWN_ACTIVE_ATTEMPT');
      }});
    need(attempt,'JOURNEY_ACTUAL_WRITE_CLAIM');equal([report.status,report.cleanup?.status,report.cleanup?.remaining],['PASS','PASS',0],'JOURNEY_DRIVER_AND_CLEANUP_PASS');
    for(const t of report.cleanup.targets)equal((await admin.firestore().doc('tenants/'+FUNCTIONAL_JOURNEY.tenant+'/'+t.collection+'/'+t.id).get()).exists,false,'JOURNEY_WORKER_CLEANUP_ABSENCE');
    equal(readFunctionSnapshot(p.snapshot.target,p.snapshot.region),p.snapshot,'JOURNEY_POST_UI_REVISION');equal(await verifyScopedHosting(p.binding),p.hosting,'JOURNEY_POST_UI_PROTECTED_LIVE');await functionalUiHosting(p.phase,p.binding,p.hosting,json(C.control),p.uiHosting);checkedBranch();
    const result={...report,schema:FUNCTIONAL_JOURNEY.reportSchema,executionProvider:C.provider,executionBuildId:identity.buildId,plan:p,claim:attempt.claim,executionCursor:attempt.cursor,startedAt,finishedAt:new Date().toISOString(),hostingBuildId:p.uiHosting.buildId,protectedLiveHosting:p.hosting,uiHosting:p.uiHosting};
    const ref=await retainedFunctionRecord(base+p.phase+'-role-journeys/'+identity.buildId+'.json',result);console.log('I66_SCOPED_JOURNEYS_RETAINED_PROVIDER_SUCCESS_PENDING '+JSON.stringify(ref));return ref;
  }catch(error){
    const partialReport=error.scopedHistoricalReport||report||null;
    await retainedFunctionRecord(base+p.phase+'-journey-holds/'+identity.buildId+'.json',{schema:'GI_I66_SCOPED_FUNCTION_JOURNEY_HOLD_V1',phase:p.phase,packageBuildId:p.facts.buildId,executionBuildId:identity.buildId,plan:p,planSha256:digest(p),claim:attempt?.claim||error.functionalJourneyClaim||null,
      code:String(error.message||'JOURNEY_HOLD').split('\n')[0].slice(0,180),cleanup:functionalJourneyCleanupProof(partialReport),partialReport,accepted:false,businessWriteClaimAcquired:!!attempt});throw error;
  }
}
function adoptedFunctionalJourney(control,binding,phase,buildId,ref){
  const authority=control.i66ScopedFunctionRelease,stages=authority?.providerStages||{},stage=phase.toUpperCase()+'_VERIFIED',prior=stages[stage];if(!prior)return null;
  equal(prior.journeys,ref,'JOURNEY_ADOPT_EXACT_PROVIDER_RECEIPT');equal(prior.buildId,buildId,'JOURNEY_ADOPT_EXACT_BUILD');equal(prior.bindingBlob,authority.candidateBlob,'JOURNEY_ADOPT_EXACT_BINDING');
  for(const k of ['sourceSha','buildId','packageSha256','bindingBlob','artifact'])equal(prior[k],stages.PACKAGE_CERTIFIED[k],'JOURNEY_ADOPT_SAME_PACKAGE');
  equal([prior.target,prior.revision,prior.trafficPercent,prior.roles],[binding.targets[phase],stages[phase.toUpperCase()+'_DEPLOYED'].revision,100,binding.roles],'JOURNEY_ADOPT_EXACT_STAGE');
  if(phase==='live')equal([authority.accepted?.epoch,authority.accepted?.target,authority.accepted?.revision,authority.accepted?.sourceSha,authority.accepted?.packageSha256],
    [binding.releaseEpoch+1,prior.target,prior.revision,prior.sourceSha,prior.packageSha256],'JOURNEY_ADOPT_ACCEPTED_EPOCH');
  return {status:'NOOP_ALREADY_RECONCILED',stage,buildId,revision:prior.revision,journeys:ref};
}
async function validateRetainedFunctionalJourney(p,report,ref,io=gcloudReadIo()){
  const build=await io.api('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+report.executionBuildId);validateFunctionalJourneyReport(p,report,build);verifyFunctionalJourneyPins(p);
  const expected='gs://'+C.bucket+'/'+functionalJourneyPrefix(p)+p.phase+'-role-journeys/'+build.id+'.json';equal(ref.uri,expected,'JOURNEY_CANONICAL_RECEIPT_URI');
  const retained=await io.object(ref);equal(JSON.parse(retained.data),report,'JOURNEY_RETAINED_REPORT_BYTES');pkg.validateObjectTime(build,retained.meta);
  const claimObject=await io.object(report.claim);pkg.validateObjectTime(build,claimObject.meta);const claim=JSON.parse(claimObject.data);equal(report.claim.uri,'gs://'+C.bucket+'/'+functionalJourneyPrefix(p)+p.phase+'-journey-claims/'+build.id+'.json','JOURNEY_CLAIM_URI');
  equal(claim,{schema:'GI_I66_SCOPED_FUNCTION_JOURNEY_CLAIM_V1',phase:p.phase,packageBuildId:p.facts.buildId,executionBuildId:build.id,authorityHead:p.authorityHead,planSha256:digest(p)},'JOURNEY_EXCLUSIVE_EXECUTION_CLAIM');
  const cursorObject=await io.object(report.executionCursor);pkg.validateObjectTime(build,cursorObject.meta);equal(JSON.parse(cursorObject.data),{schema:'GI_I66_SCOPED_FUNCTION_JOURNEY_CURSOR_V1',claim:report.claim,executionBuildId:build.id,planSha256:digest(p)},'JOURNEY_RETAINED_ACTIVE_CURSOR');
  equal(report.executionCursor.uri,'gs://'+C.bucket+'/'+functionalJourneyPrefix(p)+p.phase+'-journey-current.json','JOURNEY_CURSOR_URI');
  return build;
}
async function verifyFunctionalJourneyCleanup(p,report){
  const token=readGcloud(['auth','print-access-token']).toString().trim(),stem='https://firestore.googleapis.com/v1/projects/'+C.projectId+'/databases/(default)/documents/tenants/'+FUNCTIONAL_JOURNEY.tenant+'/';
  for(const t of report.cleanup.targets){need(/^(?:data\/(?:clientes|polizas|recibosEsperados|cobros)\/items|(?:previewReconciliation|reconciliation)(?:Events|Requests))$/.test(t.collection)&&/^[A-Za-z0-9_-]{1,180}$/.test(t.id),'JOURNEY_CLEANUP_PATH');const r=await fetch(stem+t.collection+'/'+t.id,{headers:{Authorization:'Bearer '+token}});equal(r.status,404,'JOURNEY_SERVER_CLEANUP_ABSENCE');}
  for(const j of report.journeys){
    const actor=j.serverReadback.documents.event.actor,member=await fetch(stem+'members/'+encodeURIComponent(actor.uid),{headers:{Authorization:'Bearer '+token}});need(member.ok,'JOURNEY_CURRENT_MEMBER');const m=firestoreFields((await member.json()).fields);equal(functionalJourneyMember(m,j.role),{activeRole:j.serverReadback.actor.activeRole,memberDigest:j.serverReadback.actor.memberDigest},'JOURNEY_MEMBERSHIP_PRESERVED');
  }
}
async function acceptRetainedFunctionalJourney(phase,buildId,ref,report,io=gcloudReadIo()){
  const p=report.plan;validateFunctionalJourneyPlan(p);equal([p.phase,p.facts.buildId],[phase,buildId],'JOURNEY_REQUESTED_PHASE_PACKAGE');await validateRetainedFunctionalJourney(p,report,ref,io);
  const current=json(C.control),binding=json(UNIT_FILE),adopted=adoptedFunctionalJourney(current,binding,phase,buildId,ref);
  if(adopted){equal(readFunctionSnapshot(binding.targets[phase],binding.targets.region).revision,adopted.revision,'JOURNEY_ADOPT_PHYSICAL_REVISION');return adopted;}
  equal(await operationalClaimReader().findClaim(functionalJourneyPrefix(p)+phase+'-journey-current.json'),report.executionCursor,'JOURNEY_CURRENT_CURSOR_BEFORE_ACCEPT');
  equal(scopedCandidate(),p.binding,'JOURNEY_FRESH_CANDIDATE');equal(functionalFacts(readFunctionalPackage(buildId)),p.facts,'JOURNEY_FRESH_PACKAGE');
  equal(current.i66ScopedFunctionRelease.providerStages[phase.toUpperCase()+'_DEPLOYED'],p.deployment,'JOURNEY_FRESH_DEPLOYMENT');await verifyFunctionalJourneyCleanup(p,report);
  equal(readFunctionSnapshot(p.snapshot.target,p.snapshot.region),p.snapshot,'JOURNEY_FRESH_PHYSICAL_REVISION');equal(await verifyScopedHosting(binding),p.hosting,'JOURNEY_FRESH_LIVE_HOSTING');await functionalUiHosting(phase,binding,p.hosting,current,p.uiHosting);checkedBranch();
  return writeFunctionalStage(phase.toUpperCase()+'_VERIFIED',{...p.facts,...(p.deployment.publication?{publication:p.deployment.publication}:{}),target:p.snapshot.target,revision:p.snapshot.revision,trafficPercent:100,roles:p.binding.roles,journeys:ref});
}
async function runFunctionalJourneys(phase,buildId,out){
  need(PHASES.includes(phase)&&uuid(buildId),'JOURNEY_RUN_ARGS');checkedBranch();const control=json(C.control),binding=json(UNIT_FILE),prior=control.i66ScopedFunctionRelease.providerStages?.[phase.toUpperCase()+'_VERIFIED'];
  // Adoption precedes scopedCandidate: LIVE acceptance intentionally advances
  // the epoch. An exact lost ACK must not authorize another old-epoch attempt.
  if(prior){const ref=prior.journeys,io=gcloudReadIo(),report=JSON.parse((await io.object(ref)).data);if(report.schema===FUNCTIONAL_JOURNEY.reportSchema)return acceptRetainedFunctionalJourney(phase,buildId,ref,report,io);return adoptedFunctionalJourney(control,binding,phase,buildId,ref);}
  const pkgFacts=control.i66ScopedFunctionRelease.providerStages?.PACKAGE_CERTIFIED;equal(pkgFacts?.buildId,buildId,'JOURNEY_CURRENT_PACKAGE_ID');
  const base='i66/functional/'+binding.unit+'/'+pkgFacts.sourceSha+'/'+buildId+'/',reader=operationalClaimReader();
  if(phase==='live')need(!await reader.findClaim(base+'live-rollback-intent.json'),'JOURNEY_COMPENSATION_PENDING');
  async function reconcile(){
    const cursor=await reader.findClaim(base+phase+'-journey-current.json');if(!cursor)return null;
    const pointer=JSON.parse((await reader.object(cursor)).data),ref=pointer.claim,claim=JSON.parse((await reader.object(ref)).data);
    equal([pointer.schema,pointer.executionBuildId,pointer.planSha256],['GI_I66_SCOPED_FUNCTION_JOURNEY_CURSOR_V1',claim.executionBuildId,claim.planSha256],'JOURNEY_EXISTING_CURSOR');
    equal([claim.schema,claim.phase,claim.packageBuildId],['GI_I66_SCOPED_FUNCTION_JOURNEY_CLAIM_V1',phase,buildId],'JOURNEY_EXISTING_CLAIM');need(uuid(claim.executionBuildId),'JOURNEY_EXISTING_BUILD');
    const b=await reader.build(claim.executionBuildId);if(['PENDING','QUEUED','WORKING'].includes(b.status))return{status:'ATTEMPT_RUNNING',buildId:b.id};
    if(b.status!=='SUCCESS'){
      need(['FAILURE','TIMEOUT','CANCELLED','EXPIRED','INTERNAL_ERROR'].includes(b.status),'JOURNEY_TERMINAL_PROVIDER_STATUS');
      const hold=await reader.findClaim(base+phase+'-journey-holds/'+b.id+'.json');need(hold,'JOURNEY_TERMINAL_HOLD_READBACK_REQUIRED');
      const previousAttempt={cursor,claim:ref,hold,executionBuildId:b.id},prior=JSON.parse((await reader.object(hold)).data);
      const retryPlan={...prior.plan,authorityHead:checkedBranch(),previousAttempt};await verifyPreviousFunctionalJourney(retryPlan,reader);
      return{status:'READY_FOR_SAFE_JOURNEY_RETRY',previousAttempt};
    }
    const proof=await reader.findClaim(base+phase+'-role-journeys/'+b.id+'.json');need(proof,'JOURNEY_SUCCESS_RECEIPT_REQUIRED');const report=JSON.parse((await reader.object(proof)).data);equal(report.claim,ref,'JOURNEY_EXACT_CLAIM_READBACK');equal(report.executionCursor,cursor,'JOURNEY_EXACT_CURSOR_READBACK');
    fs.mkdirSync(out,{recursive:true});const referenceFile=path.join(out,'journey-reference.json');if(fs.existsSync(referenceFile))equal(json(referenceFile),proof,'JOURNEY_LOCAL_REFERENCE_PREIMAGE');else write(referenceFile,proof);
    return acceptRetainedFunctionalJourney(phase,buildId,proof,report,reader);
  }
  const existing=await reconcile();if(existing&&existing.status!=='READY_FOR_SAFE_JOURNEY_RETRY')return existing;
  if(phase==='preview'&&fs.existsSync(require('./gravicentra-i66-frontend-control.cjs').DIRECT_LIVE_PUBLICATION.decisionPath))throw Error('I66_NATIVE_OPERATIONAL_DIRECT_LIVE_OWNER_INSTRUCTION_REQUIRES_LIVE');
  const plan=await makeFunctionalJourneyPlan(phase,buildId,existing?.previousAttempt||null),attemptOut=path.join(out,digest(plan));fs.mkdirSync(attemptOut,{recursive:true});
  for(const [name,value] of [['plan.json',plan],['cloudbuild.json',functionalJourneyConfig(plan)]]){const file=path.join(attemptOut,name);if(fs.existsSync(file))equal(json(file),value,'JOURNEY_LOCAL_PLAN_PREIMAGE');else write(file,value);}const config=path.join(attemptOut,'cloudbuild.json');
  let failure;try{execFileSync('gcloud',['builds','submit',C.repositoryUrl,'--git-source-revision='+plan.authorityHead,'--region='+C.region,'--project='+C.projectId,'--config='+path.resolve(config),'--quiet'],{stdio:'inherit'});}catch(error){failure=error;}
  const result=await reconcile();if(result)return result;if(failure)throw failure;throw Error('I66_SCOPED_JOURNEY_CLAIM_UNCONFIRMED_NO_AUTOMATIC_RESUBMIT');
}

async function acceptFunctionalJourney(phase,buildId,refFile){
  need(phase==='preview'||phase==='live','FUNCTIONAL_ACCEPT_PHASE');
  checkedBranch();const suppliedRef=json(refFile),suppliedIo=gcloudReadIo(),suppliedReport=JSON.parse((await suppliedIo.object(suppliedRef)).data);
  if(suppliedReport.schema===FUNCTIONAL_JOURNEY.reportSchema)return acceptRetainedFunctionalJourney(phase,buildId,suppliedRef,suppliedReport,suppliedIo);
  const already=adoptedFunctionalJourney(json(C.control),json(UNIT_FILE),phase,buildId,suppliedRef);if(already)return already;
  const b=scopedCandidate(),pkg=readFunctionalPackage(buildId),facts=functionalFacts(pkg),target=b.targets[phase];
  const stages=json(C.control).i66ScopedFunctionRelease.providerStages||{},deployed=stages[phase==='preview'?'PREVIEW_DEPLOYED':'LIVE_DEPLOYED'];
  need(!deployed?.publication,'DIRECT_LIVE_REQUIRES_RETAINED_SIGNED_JOURNEY');
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
function validateDirectRollbackOwnership({head,control,binding,facts,claim,receipt,ref,scopePreserved,live,rollback,archiveDigest,publication}){
  verifyClaimIdentity(claim);
  const stages=control.i66ScopedFunctionRelease.providerStages;
  equal(stages.PACKAGE_CERTIFIED,facts,'RECOVERY_CERTIFIED_PACKAGE');
  need(!control.i66ScopedFunctionRelease.accepted&&!Object.keys(stages).some(key=>['LIVE_VERIFIED','LIVE_ROLLED_BACK','LIVE_HOLD'].includes(key)),'RECOVERY_NONTERMINAL_UNIT');
  equal(claim.publication,publication,'RECOVERY_CLAIM_METHOD');
  equal(receipt.publication,publication,'RECOVERY_RECEIPT_METHOD');
  for(const record of [claim,receipt]){
    for(const key of Object.keys(facts))equal(record[key],facts[key],'RECOVERY_PACKAGE_'+key);
    equal([record.target,record.phase],[binding.targets.live,'live'],'RECOVERY_EXACT_TARGET');
  }
  const before=claim.before,after=receipt.after;
  equal(receipt.before,before,'RECOVERY_BEFORE');
  equal([before.target,before.region,before.service,before.revision],
    [binding.targets.live,binding.targets.region,binding.targets.live.toLowerCase(),binding.predecessor.revision],'RECOVERY_PREDECESSOR');
  equal([after.target,after.region,after.service,after.configurationDigest],
    [before.target,before.region,before.service,before.configurationDigest],'RECOVERY_CONFIGURATION');
  need(after.revision!==before.revision,'RECOVERY_DISTINCT_REVISION');
  equal(receipt.trafficPercent,100,'RECOVERY_EXCLUSIVE_TRAFFIC');
  equal(archiveDigest,facts.packageSha256,'RECOVERY_SERVING_ARCHIVE');
  equal(after,live,'RECOVERY_EXACT_SERVING_POSTIMAGE');
  equal([claim.rollbackProof,receipt.rollbackProof],[rollback,rollback],'RECOVERY_PHYSICAL_ROLLBACK_PROOF');
  need(rollback.ready&&rollback.revision===before.revision,'RECOVERY_PREDECESSOR_READY');
  need(sha40(claim.authorityHead)&&sha40(head)&&scopePreserved,'RECOVERY_AUTHORITY_PREIMAGE');
  const deployment={...facts,publication,target:binding.targets.live,revision:after.revision,trafficPercent:100,receipt:ref,
    rollbackRevision:before.revision,rollbackProof:rollback};
  if(stages.LIVE_DEPLOYED)equal(stages.LIVE_DEPLOYED,deployment,'RECOVERY_SIGNED_DEPLOYMENT');
  return deployment;
}

async function checkDirectRollback(buildId,options={}){
  const head=checkedBranch(),binding=scopedCandidate(),facts=functionalFacts(readFunctionalPackage(buildId));
  const owner=require('./gravicentra-i66-frontend-control.cjs'),publication=owner.directLivePublication();
  const control=json(C.control),prefix='i66/functional/'+binding.unit+'/'+facts.sourceSha+'/'+buildId+'/live-';
  const reader=operationalClaimReader();
  const [claimRef,ref,hold,rollbackRef]=await Promise.all(['claim','deployment','hold','rollback'].map(suffix=>reader.findClaim(prefix+suffix+'.json')));
  need(claimRef&&ref&&!hold&&(!rollbackRef||options.intent),'RECOVERY_ORIGINAL_NONTERMINAL_RECEIPTS');
  const claim=JSON.parse((await reader.object(claimRef)).data),receipt=JSON.parse((await reader.object(ref)).data);
  need(sha40(claim.authorityHead),'RECOVERY_ORIGINAL_PARENT');
  git(process.cwd(),'merge-base','--is-ancestor',claim.authorityHead,head);
  const paths=[UNIT_FILE,publication.decisionPath,owner.P.transport];
  if(!control.i66ScopedFunctionRelease.providerStages.LIVE_DEPLOYED)paths.push(owner.P.cp,owner.P.state);
  const scopePreserved=paths.every(p=>git(process.cwd(),'rev-parse',claim.authorityHead+':'+p)===git(process.cwd(),'rev-parse',head+':'+p));
  const live=readFunctionSnapshot(binding.targets.live,binding.targets.region,options.restoredTraffic),src=live.source;
  const rollback=verifyFunctionalRollback(claim.before,binding,'live');
  const archiveDigest=sha(scopedArchive('gs://'+src.bucket+'/'+src.object,src.generation));
  const deployment=validateDirectRollbackOwnership({head,control,binding,facts,claim,receipt,ref,scopePreserved,live,rollback,archiveDigest,publication});
  equal(checkedBranch(),head,'RECOVERY_FINAL_AUTHORITY');
  return {status:'PHYSICAL_OWNERSHIP_VERIFIED_READONLY',head,claim:claimRef,deployment,trafficWrites:0};
}

function singleRollbackRoute(row,target,region){
  const meta=row.metadata,traffic=row.status?.traffic,service=target.toLowerCase();
  equal([row.kind,row.apiVersion,meta?.name],['Service','serving.knative.dev/v1',service],'ROLLBACK_SERVICE_IDENTITY');
  need([C.projectId,'646761409743'].includes(meta.namespace)&&uuid(meta.uid),'ROLLBACK_PROJECT_UID');
  need(meta.labels?.['cloud.googleapis.com/location']===region,'ROLLBACK_REGION');
  need(typeof meta.resourceVersion==='string'&&meta.resourceVersion.length>0,'ROLLBACK_RESOURCE_VERSION');
  need(/^[1-9][0-9]*$/.test(String(meta.generation))&&String(meta.generation)===String(row.status.observedGeneration),'ROLLBACK_OBSERVED_GENERATION');
  need(row.status.conditions?.some(c=>c.type==='Ready'&&c.status==='True'),'ROLLBACK_SERVICE_READY');
  need(Array.isArray(traffic)&&traffic.length===1&&traffic[0].percent===100&&!traffic[0].tag,'ROLLBACK_EXCLUSIVE_ROUTE');
  need(row.spec?.template&&row.spec.traffic?.length===1&&!row.spec.traffic[0].tag&&row.spec.traffic[0].percent===100,'ROLLBACK_EXACT_DESIRED_ROUTE');
  const revision=traffic[0].revisionName;
  need(typeof revision==='string'&&revision.startsWith(service+'-'),'ROLLBACK_REVISION_SCOPE');
  equal(row.spec.traffic[0].latestRevision?row.status.latestReadyRevisionName:row.spec.traffic[0].revisionName,revision,'ROLLBACK_DESIRED_AND_SERVING');
  return {uid:meta.uid,generation:String(meta.generation),resourceVersion:meta.resourceVersion,revision};
}
function directRollbackRequest(row,proof,region){
  const deployment=proof.deployment,route=singleRollbackRoute(row,deployment.target,region);
  equal(route.revision,deployment.revision,'ROLLBACK_OWNED_POSTIMAGE');
  equal([row.status.latestCreatedRevisionName,row.status.latestReadyRevisionName],[route.revision,route.revision],'ROLLBACK_NEWER_REVISION_PENDING');
  const request=structuredClone(row);delete request.status;
  request.spec.traffic=[{revisionName:deployment.rollbackRevision,percent:100}];
  const intent={head:proof.head,claim:proof.claim,deployment:deployment.receipt,route,
    currentRevision:deployment.revision,rollbackRevision:deployment.rollbackRevision,requestDigest:digest(request),restoredSpecDigest:digest(request.spec)};
  return {request,intent};
}
function verifyRestoredRoute(row,intent,target,region){
  const current=singleRollbackRoute(row,target,region);
  equal(current.uid,intent.route.uid,'ROLLBACK_COMPENSATION_SAME_SERVICE');
  equal(BigInt(current.generation),BigInt(intent.route.generation)+1n,'ROLLBACK_EXACT_SUCCESSOR_GENERATION');
  equal([current.revision,digest(row.spec),row.status.latestCreatedRevisionName,row.status.latestReadyRevisionName],
    [intent.rollbackRevision,intent.restoredSpecDigest,intent.currentRevision,intent.currentRevision],'ROLLBACK_EXACT_COMPENSATION');
  return current;
}
async function recoverDirectRollback(buildId,checkOnly){
  const head=checkedBranch(),binding=scopedCandidate(),control=json(C.control),stages=control.i66ScopedFunctionRelease.providerStages;
  const pkg=stages.PACKAGE_CERTIFIED;equal(pkg?.buildId,buildId,'ROLLBACK_CERTIFIED_BUILD');
  const prefix='i66/functional/'+binding.unit+'/'+pkg.sourceSha+'/'+buildId+'/live-',reader=operationalClaimReader();
  let intentRef=await reader.findClaim(prefix+'rollback-intent.json');
  const receiptRef=await reader.findClaim(prefix+'rollback.json');
  if(stages.LIVE_ROLLED_BACK){
    equal(stages.LIVE_ROLLED_BACK.receipt,receiptRef,'ROLLBACK_CANONICAL_RECEIPT');
    await reader.object(receiptRef);return {status:'NOOP_ALREADY_RECONCILED',receipt:receiptRef};
  }
  need(!receiptRef||intentRef,'ROLLBACK_ORPHAN_RECEIPT');
  async function requireIdleJourney(){
    const cursor=await reader.findClaim(prefix+'journey-current.json');
    if(!cursor)return;
    const pointer=JSON.parse((await reader.object(cursor)).data);
    need(uuid(pointer.executionBuildId),'ROLLBACK_JOURNEY_ID');
    const build=await reader.build(pointer.executionBuildId);
    need(build.id===pointer.executionBuildId&&['FAILURE','CANCELLED','TIMEOUT','EXPIRED'].includes(build.status),'COMPLETED_OR_RUNNING_JOURNEY_REQUIRES_RECONCILIATION');
  }
  await requireIdleJourney();
  const oldIntent=intentRef?JSON.parse((await reader.object(intentRef)).data):null;
  const region=binding.targets.region,target=binding.targets.live;
  const url='https://'+region+'-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/'+C.projectId+'/services/'+target.toLowerCase();
  const token=readGcloud(['auth','print-access-token']).toString().trim();
  async function api(method,body,dryRun=false){
    const response=await fetch(url+(dryRun?'?dryRun=all':''),{method,redirect:'error',signal:AbortSignal.timeout(30000),
      headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    need(response.ok,'ROLLBACK_PROVIDER_HTTP_'+response.status);return response.json();
  }
  const row=await api('GET'),route=singleRollbackRoute(row,target,region);
  const restored=!!oldIntent&&route.revision===oldIntent.rollbackRevision;
  if(restored)verifyRestoredRoute(row,oldIntent,target,region);
  const proof=await checkDirectRollback(buildId,{intent:intentRef,restoredTraffic:restored?route.revision:undefined});
  equal(proof.head,head,'ROLLBACK_AUTHORITY_CHANGED');
  const deployment=proof.deployment;
  if(oldIntent){
    equal([oldIntent.head,oldIntent.claim,oldIntent.deployment,oldIntent.currentRevision,oldIntent.rollbackRevision],
      [head,proof.claim,deployment.receipt,deployment.revision,deployment.rollbackRevision],'ROLLBACK_ORIGINAL_INTENT');
  }
  let observed=restored?route:null;
  if(!restored){
    const {request,intent}=directRollbackRequest(row,proof,region);
    if(oldIntent)equal(oldIntent,intent,'ROLLBACK_INTENT_DRIFT');
    const preflight=await api('PUT',request,true);
    equal([preflight.metadata?.uid,preflight.spec?.traffic],[route.uid,request.spec.traffic],'ROLLBACK_PROVIDER_VALIDATION');
    equal(singleRollbackRoute(await api('GET'),target,region),route,'ROLLBACK_DRY_RUN_PRESERVED_TRAFFIC');
    equal(checkedBranch(),head,'ROLLBACK_FRESH_AUTHORITY');
    if(checkOnly)return {...proof,status:'PROVIDER_DRY_RUN_VERIFIED',resourceVersion:route.resourceVersion};
    if(!intentRef)intentRef=await retainedFunctionRecord(prefix+'rollback-intent.json',intent);
    await requireIdleJourney();
    equal(checkedBranch(),head,'ROLLBACK_AUTHORITY_BEFORE_CAS');
    let failure;
    try{await api('PUT',request);}catch(e){failure=e;}
    // A timeout or lost response permits readback, never an unguarded second PUT.
    for(let attempt=0;attempt<12;attempt++){
      const next=await api('GET');
      if(next.status?.traffic?.[0]?.revisionName===deployment.rollbackRevision&&String(next.status?.observedGeneration)===String(next.metadata?.generation)){
        observed=verifyRestoredRoute(next,intent,target,region);break;
      }
      if(failure)throw failure;
      await new Promise(resolve=>setTimeout(resolve,1500));
    }
    need(observed,'ROLLBACK_RECEIPT_PENDING_REREAD');
  }else if(checkOnly)return {...proof,status:'COMPENSATION_ALREADY_OBSERVED',trafficWrites:0};
  const facts={...pkg,publication:deployment.publication,phase:'live',target,revision:deployment.rollbackRevision,
    trafficPercent:100,rolledBackRevision:deployment.revision,recovery:{claim:proof.claim,deployment:deployment.receipt,intent:intentRef}};
  const postimage={uid:observed.uid,generation:observed.generation,revision:observed.revision,specDigest:(oldIntent||directRollbackRequest(row,proof,region).intent).restoredSpecDigest};
  const receipt=await retainedFunctionRecord(prefix+'rollback.json',{...facts,postimage});
  equal(checkedBranch(),head,'ROLLBACK_REGISTRATION_AUTHORITY_CHANGED');
  return writeFunctionalStage('LIVE_ROLLED_BACK',{...facts,receipt},stages.LIVE_DEPLOYED?undefined:deployment);
}

async function rollbackFunctionalPhase(phase,buildId){
  need(['preview','live'].includes(phase),'FUNCTIONAL_ROLLBACK_PHASE');
  checkedBranch();const b=scopedCandidate(),pkg=readFunctionalPackage(buildId),c=json(C.control);
  const stages=c.i66ScopedFunctionRelease.providerStages||{},deployed=stages[phase==='preview'?'PREVIEW_DEPLOYED':'LIVE_DEPLOYED'];
  if(phase==='live'&&(!deployed||deployed.publication)&&fs.existsSync(require('./gravicentra-i66-frontend-control.cjs').DIRECT_LIVE_PUBLICATION.decisionPath)){
    return recoverDirectRollback(buildId,false);
  }
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
  const facts={...functionalFacts(pkg),...(deployed.publication?{publication:deployed.publication}:{}),phase,target,revision:before.revision,trafficPercent:100,rolledBackRevision:snapshot.revision};
  const receipt=await retainedFunctionRecord('i66/functional/'+b.unit+'/'+pkg.sourceSha+'/'+buildId+'/'+phase+'-rollback.json',facts);
  return writeFunctionalStage(phase.toUpperCase()+'_ROLLED_BACK',{...facts,receipt});
}

async function main(args=process.argv.slice(2)){
  if(args[0]==='bind'&&args.length===4){const binding=bindingFromHosting(process.cwd(),json(args[1]),json(args[2]),git(process.cwd(),'rev-parse','HEAD'));write(args[3],binding);console.log('I66_NATIVE_BINDING_PREPARED_NOT_AUTHORIZED');return binding;}
  if(args[0]==='run-functional-journeys'&&args.length===4){const result=await runFunctionalJourneys(args[1],args[2],args[3]);console.log(JSON.stringify(result));return result;}
  if(args[0]==='functional-journey-worker'&&args.length===2)return functionalJourneyWorker(JSON.parse(args[1]));
  if(args[0]==='verify-functional-journey'&&args.length===4){const result=await acceptFunctionalJourney(args[1],args[2],args[3]);console.log(JSON.stringify(result));return result;}
  if(args[0]==='check-functional-rollback'&&args[1]==='live'&&args.length===3){const result=await recoverDirectRollback(args[2],true);console.log(JSON.stringify(result));return result;}
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
module.exports={recoverDirectRollback,protectOverlappingLiveDeploy,directRollbackRequest,verifyRestoredRoute,validateDirectRollbackOwnership,FUNCTIONAL_JOURNEY,FUNCTIONAL_JOURNEY_PINS,validateFunctionalJourneyPlan,functionalJourneyConfig,validateFunctionalJourneyBuild,verifyFunctionalJourneyPins,functionalUiHosting,makeFunctionalJourneyPlan,functionalJourneyTargets,functionalServerTime,functionalMemberValue,functionalJourneyMember,validateFunctionalJourneyWitness,captureFunctionalJourneyWitness,validateFunctionalJourneyReport,functionalJourneyCleanupProof,functionalCleanupAbsent,validateFunctionalJourneyRetryEvidence,verifyPreviousFunctionalJourney,acquireFunctionalJourneyClaim,functionalJourneyWorker,adoptedFunctionalJourney,validateRetainedFunctionalJourney,verifyFunctionalJourneyCleanup,acceptRetainedFunctionalJourney,runFunctionalJourneys,missingOperationalClaim,readFunctionSnapshot,checkServingSnapshot,verifyScopedHosting,readFunctionalPackage,scopedPhysical,assertCompositeFresh,scopedCandidate,packageFunctionalUnit,functionalBuildConfig,observeOperationalClaim,reconcileBeforeExecution,operationalClaimReader,C,F,MECHANISM_PATHS,PRODUCT_PATHS,PHASES,ACTIONS,native,provider,uuid,executionId,artifactRef,validateMechanism,validateBinding,verifyPinnedOwners,ensureHistory,fetchAuthorityHead,validatePlan,prefix,configFor,validateBuild,sdkHeaders,verifyRuntimeAuthority,blockNames,workflowBlocks,workflowTimeoutMs,deploymentTimeoutMs,runtimeBlocks,mechanismManifest,bindingFromHosting,makePlan,validatePackageMetadata,planFromBuild,validatePreviewMetadata,readPreviewAcceptance,readNativeFiles,verifiedPackage,admitRuntime,packageTarForBinding,signedCasIo,candidateAt,mandatoryChecks,validateOperationalProof,readFinancialPreview,lockName,ENV_OUTPUTS,consumeNativeEnv,branchGuard,retainMake,worker,gcloudReadIo,verify,main,validatePreviousLive,packageTarForCandidate,RETRY_READBACK,validateRetryReadback,readRetryReadback,currentRetryState,verifyRetryRuntime};
if(require.main===module)Promise.resolve().then(()=>main()).catch(error=>{console.error(String(error.message||'I66_NATIVE_OPERATIONAL_HOLD').split('\n')[0]);process.exitCode=1;});
