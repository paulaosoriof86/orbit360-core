#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import http from 'node:http';
import {spawnSync, spawn} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const REGISTRY='orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json';
const HANDLER='tools/orbit360-go-live-release-handler-v20260826.mjs';
const HOSTING_HELPER='tools/orbit360-fase-a-hosting-release-helper-v20260813.mjs';
const IDENTITY_HELPER='tools/orbit360-m6-resolve-smoke-identity-readonly-v20260730.mjs';
const INTEGRITY_SNAPSHOT='tools/orbit360-f2-data-integrity-readonly-v20260818.mjs';
const INTEGRITY_COMPARE='tools/orbit360-f2-compare-integrity-v20260818.mjs';
const BROWSER_SMOKE='tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs';
const FIREBASE_GO_LIVE='firebase.product-go-live.json';
const FIRESTORE_READONLY='firestore.product-readonly.rules';
const FIREBASE_ROLLBACK='firebase.product-rollback-safe.json';
const args=process.argv.slice(2);
const arg=n=>{const i=args.indexOf(n);return i>=0?String(args[i+1]||''):'';};
const has=n=>args.includes(n);
const A=p=>path.resolve(ROOT,p);
const j=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''));
const shaBuf=b=>crypto.createHash('sha256').update(b).digest('hex');
const shaFile=p=>shaBuf(fs.readFileSync(p));
const safe=v=>String(v==null?'':v).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig,'[email-redacted]').replace(/[A-Za-z0-9_\-]{48,}/g,'[redacted]').replace(/https?:\/\/[^/\s]+/g,'[url-redacted]').replace(/[\r\n]+/g,' ').slice(0,600);
const allowedClasses=new Set(['FUNCTIONAL_DEFECT','VALIDATOR_STALE','DATA_CONTRACT_FAILURE','ENVIRONMENT_FAILURE','PIPELINE_MECHANISM_FAILURE','SECURITY_FAILURE']);
const classify=e=>{const c=String(e?.message||e||'').split(':')[0];return allowedClasses.has(c)?c:'PIPELINE_MECHANISM_FAILURE';};
const fail=(code,detail='')=>{throw new Error(code+(detail?`:${detail}`:''));};
const mkdir=p=>fs.mkdirSync(p,{recursive:true});
const writeJson=(p,x)=>{mkdir(path.dirname(p));fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n','utf8');};
function run(cmd,argv,{cwd=ROOT,env=process.env,allowFail=false,stdio='pipe'}={}){
  const r=spawnSync(cmd,argv,{cwd,env,encoding:'utf8',stdio});
  if(r.error)fail('PIPELINE_MECHANISM_FAILURE:PROCESS_START_FAILED',`${cmd}:${safe(r.error.message)}`);
  if(!allowFail&&r.status!==0)fail('PIPELINE_MECHANISM_FAILURE:PROCESS_FAILED',`${cmd}:${r.status}:${safe(r.stderr||r.stdout)}`);
  return r;
}
function runAsync(cmd,argv,{cwd=ROOT,env=process.env}={}){
  return new Promise((resolve,reject)=>{const p=spawn(cmd,argv,{cwd,env,stdio:['ignore','pipe','pipe']});let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',code=>resolve({status:code,stdout:out,stderr:err}));});
}
function releasePlan(){return ['READ_ONLY_PREFLIGHT','CAS_CLAIM_EXTERNAL','PRIVILEGED_EDGE','EXACT_DEPLOY','READBACK','SMOKE','INTEGRITY','TERMINAL','ROLLBACK_IF_REQUIRED'];}
function staticContract(){
  for(const p of [LEDGER,REGISTRY,HANDLER,HOSTING_HELPER,IDENTITY_HELPER,INTEGRITY_SNAPSHOT,INTEGRITY_COMPARE,BROWSER_SMOKE,FIREBASE_GO_LIVE,FIRESTORE_READONLY,FIREBASE_ROLLBACK])if(!fs.existsSync(A(p)))fail('PIPELINE_MECHANISM_FAILURE:RELEASE_HANDLER_DEPENDENCY_MISSING',p);
  const L=j(LEDGER),R=j(REGISTRY),G=j(FIREBASE_GO_LIVE),RB=j(FIREBASE_ROLLBACK),s=R.executionTransitions?.GO_LIVE_RELEASE_WINDOW||{};
  if(R.sourceOfTruth!==LEDGER||s.handler!==HANDLER||s.handlerReady!==true||s.capabilityClass!=='RELEASE'||s.stateMutation!=='CLAIM_TERMINAL')fail('PIPELINE_MECHANISM_FAILURE:RELEASE_HANDLER_REGISTRY_BINDING_INVALID');
  if(!L.successorCandidate?.artifactId||!/^[a-f0-9]{40}$/.test(String(L.successorCandidate?.sourceHead||''))||!/^[a-f0-9]{64}$/.test(String(L.successorCandidate?.zipSha256||''))||!/^[a-f0-9]{64}$/.test(String(L.successorCandidate?.manifestSha256||'')))fail('DATA_CONTRACT_FAILURE:RELEASE_CANDIDATE_IDENTITY_INVALID');
  if(G.firestore?.rules!==FIRESTORE_READONLY||!G.hosting?.public)fail('SECURITY_FAILURE:PRODUCT_CONFIG_READONLY_CONTRACT_INVALID');
  if(!RB.hosting?.public||!RB.firestore?.rules)fail('SECURITY_FAILURE:ROLLBACK_CONFIG_CONTRACT_INVALID');
  const requiredScope={runtime:true,browser:true,secrets:true,firestoreRead:true,deploy:true,production:true,firestoreWrites:false,authWrites:false,operationalWrites:false,dataWrites:false,main:false,merge:false};
  for(const [k,v] of Object.entries(requiredScope))if(s.requiredScope?.[k]!==v)fail('SECURITY_FAILURE:RELEASE_SCOPE_CONTRACT_INVALID',k);
  const plan=releasePlan();
  if(plan.indexOf('READ_ONLY_PREFLIGHT')>plan.indexOf('PRIVILEGED_EDGE')||plan.indexOf('PRIVILEGED_EDGE')>plan.indexOf('EXACT_DEPLOY')||plan.indexOf('EXACT_DEPLOY')>plan.indexOf('READBACK')||plan.indexOf('READBACK')>plan.indexOf('SMOKE')||plan.indexOf('SMOKE')>plan.indexOf('INTEGRITY'))fail('PIPELINE_MECHANISM_FAILURE:RELEASE_STAGE_ORDER_INVALID');
  return {L,R,G,RB,s,plan};
}
function parsePublicConfig(candidateDir){
  const p=path.join(candidateDir,'product-runtime-config.js');if(!fs.existsSync(p))fail('DATA_CONTRACT_FAILURE:PRODUCT_RUNTIME_CONFIG_MISSING');
  const t=fs.readFileSync(p,'utf8'),m=t.match(/Object\.freeze\((\{[\s\S]*\})\)\s*;?\s*$/);if(!m)fail('DATA_CONTRACT_FAILURE:PRODUCT_RUNTIME_CONFIG_PARSE_FAILED');
  const c=JSON.parse(m[1]);if(c.enabled!==true||!c.projectId||!c.tenantHint||c.environmentRef!=='firebase-product-readonly')fail('DATA_CONTRACT_FAILURE:PRODUCT_RUNTIME_CONFIG_INVALID');return c;
}
async function fetchTo(url,out,headers={}){const r=await fetch(url,{headers,redirect:'follow'});if(!r.ok)fail('ENVIRONMENT_FAILURE:REMOTE_FETCH_FAILED',`${r.status}`);const b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(out,b);return b;}
async function materializeCandidate(tmp,contract){
  const L=contract.L,c=L.successorCandidate,outerZip=path.join(tmp,'artifact-outer.zip'),outerDir=path.join(tmp,'outer'),candidateDir=path.join(tmp,'candidate');mkdir(outerDir);mkdir(candidateDir);
  const localZip=String(process.env.ORBIT360_CANDIDATE_ZIP||'').trim();
  if(localZip){fs.copyFileSync(path.resolve(localZip),outerZip);}else{
    const token=String(process.env.GH_TOKEN||process.env.GITHUB_TOKEN||'').trim();if(!token)fail('PIPELINE_MECHANISM_FAILURE:GH_TOKEN_REQUIRED_FOR_CANDIDATE');
    const repo=String(process.env.GITHUB_REPOSITORY||L.repository||'').trim();if(!/^[^/]+\/[^/]+$/.test(repo))fail('PIPELINE_MECHANISM_FAILURE:GITHUB_REPOSITORY_INVALID');
    await fetchTo(`https://api.github.com/repos/${repo}/actions/artifacts/${Number(c.artifactId)}/zip`,outerZip,{authorization:`Bearer ${token}`,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28'});
  }
  run('unzip',['-q',outerZip,'-d',outerDir]);const top=fs.readdirSync(outerDir).filter(n=>fs.statSync(path.join(outerDir,n)).isFile());if(top.length!==1)fail('DATA_CONTRACT_FAILURE:CANDIDATE_OUTER_LAYOUT_INVALID',String(top.length));
  const inner=path.join(outerDir,top[0]);if(shaFile(inner)!==String(c.zipSha256))fail('DATA_CONTRACT_FAILURE:CANDIDATE_ZIP_SHA_MISMATCH');run('unzip',['-q',inner,'-d',candidateDir]);
  const manifestPath=path.join(candidateDir,'orbit360-package-manifest.json');if(!fs.existsSync(manifestPath))fail('DATA_CONTRACT_FAILURE:CANDIDATE_MANIFEST_MISSING');if(shaFile(manifestPath)!==String(c.manifestSha256))fail('DATA_CONTRACT_FAILURE:CANDIDATE_MANIFEST_SHA_MISMATCH');
  const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));if(String(m.sourceHead)!==String(c.sourceHead)||Number(m.fileCount)!==Number(c.fileCount)||!Array.isArray(m.files)||m.files.length!==Number(c.fileCount)||m.noLabRuntime!==true||m.noPrivateSecretMaterial!==true||m.containsPrivateSecrets!==false||m.deployExecuted!==false||m.productionTouched!==false)fail('DATA_CONTRACT_FAILURE:CANDIDATE_MANIFEST_IDENTITY_INVALID');
  for(const f of m.files){const p=path.join(candidateDir,String(f.path||''));if(!fs.existsSync(p)||shaFile(p)!==String(f.sha256||''))fail('DATA_CONTRACT_FAILURE:CANDIDATE_FULL_REHASH_FAIL',String(f.path||''));}
  for(const p of ['index.html','product-runtime-config.js','core/auth-product-runtime-p0.js','core/backend-product-readonly-bootstrap-p0.js','data/store-firestore-product-readonly-p0.js','core/product-app-p0.js','modules/cliente360.js','modules/aseguradoras.js','modules/ops.js','modules/leads.js'])if(!fs.existsSync(path.join(candidateDir,p)))fail('DATA_CONTRACT_FAILURE:CANDIDATE_CRITICAL_FILE_MISSING',p);
  const cfg=parsePublicConfig(candidateDir);return {candidateDir,manifest:m,manifestPath,publicConfig:cfg,artifactId:Number(c.artifactId),sourceHead:String(c.sourceHead),zipSha256:String(c.zipSha256),manifestSha256:String(c.manifestSha256),fileCount:Number(c.fileCount)};
}
function targetFrom(candidate,intent=null){
  const projectId=String(candidate.publicConfig.projectId),tenantId=String(candidate.publicConfig.tenantHint),requested=intent?.target||{},liveUrl=String(requested.liveUrl||`https://${projectId}.web.app`).replace(/\/$/,''),siteId=String(requested.siteId||projectId);
  if(String(requested.projectId||projectId)!==projectId||String(requested.tenantId||tenantId)!==tenantId)fail('SECURITY_FAILURE:RELEASE_TARGET_CANDIDATE_MISMATCH');
  if(!/^https:\/\//.test(liveUrl)||!siteId)fail('SECURITY_FAILURE:RELEASE_TARGET_INVALID');return {projectId,tenantId,liveUrl,siteId};
}
function validateIntent(intent,contract,candidate,target){
  const s=contract.s,L=contract.L;if(intent?.schemaVersion!=='orbit360-execution-intent-v1'||intent.transitionId!=='GO_LIVE_RELEASE_WINDOW')fail('PIPELINE_MECHANISM_FAILURE:RELEASE_INTENT_INVALID');
  if(Number(intent.candidateArtifactId)!==candidate.artifactId||String(intent.candidateSourceHead)!==candidate.sourceHead||String(intent.candidateManifestSha256||'')!==candidate.manifestSha256||String(intent.candidateZipSha256||'')!==candidate.zipSha256)fail('DATA_CONTRACT_FAILURE:RELEASE_INTENT_CANDIDATE_BINDING_INVALID');
  if(Number(intent.expectedLedgerRevision)!==Number(L.revision)&&L.executionClaim?.active!==true)fail('PIPELINE_MECHANISM_FAILURE:RELEASE_INTENT_LEDGER_REVISION_INVALID');
  for(const [k,v] of Object.entries(s.requiredScope||{}))if(intent.scope?.[k]!==v)fail('SECURITY_FAILURE:RELEASE_INTENT_SCOPE_INVALID',k);
  if(intent.explicitUserAuthorization!==true||!/^[a-f0-9]{64}$/.test(String(intent.authorizationDigest||'')))fail('SECURITY_FAILURE:RELEASE_AUTHORIZATION_BINDING_INVALID');
  if(String(intent.target?.projectId||'')!==target.projectId||String(intent.target?.tenantId||'')!==target.tenantId||String(intent.target?.liveUrl||'').replace(/\/$/,'')!==target.liveUrl)fail('SECURITY_FAILURE:RELEASE_TARGET_BINDING_INVALID');
}
function hostingIgnoreReason(rel,ignore=[]){
  const p=String(rel||'').replace(/^\/+/, '').replace(/\\/g,'/');
  const segments=p.split('/').filter(Boolean);
  for(const raw of ignore){
    const pattern=String(raw||'').replace(/\\/g,'/');
    if(!pattern)continue;
    if(pattern==='firebase.json'&&p==='firebase.json')return pattern;
    if(pattern==='**/.*'&&segments.some(s=>s.startsWith('.')))return pattern;
    if(pattern==='**/node_modules/**'&&segments.includes('node_modules'))return pattern;
    if(pattern.endsWith('/**')){const prefix=pattern.slice(0,-3).replace(/^\/+/, '');if(p===prefix||p.startsWith(prefix+'/'))return pattern;}
    if(pattern===p)return pattern;
  }
  return '';
}
function hostingManifestPartition(contract,candidate){
  const ignore=Array.isArray(contract.G?.hosting?.ignore)?contract.G.hosting.ignore:[];
  const publicFiles=[],excludedFiles=[];
  for(const f of candidate.manifest.files){const item={path:String(f.path||''),sha256:String(f.sha256||'')},reason=hostingIgnoreReason(item.path,ignore);if(reason)excludedFiles.push({...item,reason});else publicFiles.push(item);}
  const internalDocs=candidate.manifest.files.filter(f=>String(f.path||'').startsWith('docs/')).map(f=>String(f.path));
  const excludedSet=new Set(excludedFiles.map(f=>f.path));
  const partitionPass=publicFiles.length+excludedFiles.length===candidate.fileCount&&internalDocs.every(p=>excludedSet.has(p))&&ignore.includes('docs/**');
  if(!partitionPass)fail('SECURITY_FAILURE:RELEASE_HOSTING_MANIFEST_PARTITION_INVALID');
  return {ignore,publicFiles,excludedFiles,publicFileCount:publicFiles.length,excludedFileCount:excludedFiles.length,totalFileCount:candidate.fileCount,internalDocsProtected:true,partitionPass:true};
}
async function excludedNotPublicReadback(target,excludedFiles){
  let exposed='',unverified='';let i=0;
  async function worker(){while(i<excludedFiles.length&&!exposed&&!unverified){const f=excludedFiles[i++];try{const r=await fetch(`${target.liveUrl}/${f.path}?orbit360-excluded=${Date.now()}-${i}`,{headers:{'cache-control':'no-cache','pragma':'no-cache'},redirect:'follow'});if(r.ok){const b=Buffer.from(await r.arrayBuffer());if(shaBuf(b)===f.sha256){exposed=f.path;break;}}}catch{unverified=f.path;break;}}}
  await Promise.all(Array.from({length:Math.min(4,Math.max(1,excludedFiles.length))},worker));
  if(exposed)fail('SECURITY_FAILURE:RELEASE_EXCLUDED_ASSET_PUBLICLY_EXPOSED',exposed);
  if(unverified)fail('ENVIRONMENT_FAILURE:RELEASE_EXCLUDED_ASSET_NONPUBLIC_CHECK_FAILED',unverified);
  return {excludedNotPublic:true,excludedFileCount:excludedFiles.length};
}
async function publicReachability(target){
  const r=await fetch(`${target.liveUrl}/?orbit360-preflight=${Date.now()}`,{headers:{'cache-control':'no-cache','pragma':'no-cache'},redirect:'follow'}).catch(()=>null);
  return {reachable:Boolean(r&&r.status>=200&&r.status<500),status:r?.status||0};
}
function handlerSelftestOutput(base){const out=arg('--out')||process.env.ORBIT360_RELEASE_HANDLER_SELFTEST_OUT||'';if(out)writeJson(path.resolve(out),base);console.log(JSON.stringify(base,null,2));}
async function sourceOnlySelftest(){
  const contract=staticContract(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-p2-'));try{
    const candidate=await materializeCandidate(tmp,contract),target=targetFrom(candidate),reach=await publicReachability(target),plan=contract.plan,partition=hostingManifestPartition(contract,candidate),excludedCheck=await excludedNotPublicReadback(target,partition.excludedFiles);
    const helperSource=fs.readFileSync(A(HOSTING_HELPER),'utf8');
    const rollbackPreflightPass=helperSource.includes("if(mode==='before')")&&helperSource.includes("if(mode==='smoke')")&&helperSource.includes('ROLLBACK_ANCHOR_MISSING');
    const ok=candidate.artifactId===Number(contract.L.successorCandidate.artifactId)&&candidate.sourceHead===contract.L.successorCandidate.sourceHead&&candidate.fileCount===Number(contract.L.successorCandidate.fileCount)&&partition.partitionPass&&partition.internalDocsProtected&&partition.publicFileCount>0&&partition.excludedFileCount>0&&excludedCheck.excludedNotPublic&&rollbackPreflightPass&&plan.length===9&&reach.reachable;
    const p={schemaVersion:'orbit360-go-live-release-handler-selftest-v2-hosting-surface-aware',ok,status:ok?'GO_LIVE_RELEASE_HANDLER_SOURCE_ONLY_PASS':'GO_LIVE_RELEASE_HANDLER_SOURCE_ONLY_FAIL',classification:ok?'PASS':(reach.reachable?'PIPELINE_MECHANISM_FAILURE':'ENVIRONMENT_FAILURE'),handler:HANDLER,handlerReady:contract.s.handlerReady===true,candidateArtifactId:candidate.artifactId,candidateSourceHead:candidate.sourceHead,candidateManifestSha256:candidate.manifestSha256,candidateZipSha256:candidate.zipSha256,fileCount:candidate.fileCount,manifestStatus:candidate.manifest.status,fullRehashPass:true,hostingManifestPartitionPass:partition.partitionPass,hostingPublicFileCount:partition.publicFileCount,hostingExcludedFileCount:partition.excludedFileCount,hostingExcludedPaths:partition.excludedFiles.map(f=>f.path),internalDocsProtected:partition.internalDocsProtected,excludedFilesRemainNonPublicContract:excludedCheck.excludedNotPublic,targetDerivedFromCandidate:true,targetProjectBound:Boolean(target.projectId),targetTenantBound:Boolean(target.tenantId),publicEndpointReachable:reach.reachable,publicEndpointStatus:reach.status,releasePlan:plan,releasePlanPass:true,hostingOnlyDeploy:true,rulesDeploy:false,rollbackPreflightPass,rollbackAnchorCapturedBeforeRiskContract:true,providerReleaseIdentityDeferredToClaimedReadOnlyPreflight:true,authorizationConsumed:false,privilegedRiskObserved:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};handlerSelftestOutput(p);if(!ok)process.exitCode=41;
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
function bindServiceAccount(tmp,target){
  const raw=String(process.env.FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB||process.env.FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB||process.env.FIREBASE_SERVICE_ACCOUNT||'').trim();if(!raw)fail('ENVIRONMENT_FAILURE:RELEASE_PROVIDER_CREDENTIAL_MISSING');
  let s;try{s=JSON.parse(raw);}catch{fail('ENVIRONMENT_FAILURE:RELEASE_PROVIDER_CREDENTIAL_INVALID_JSON');}if(s.type!=='service_account'||String(s.project_id||'')!==target.projectId||!s.private_key||!s.client_email)fail('SECURITY_FAILURE:RELEASE_PROVIDER_IDENTITY_MISMATCH');
  const p=path.join(tmp,'provider.json');fs.writeFileSync(p,raw,{mode:0o600});process.env.GOOGLE_APPLICATION_CREDENTIALS=p;return p;
}
function installRuntimeDeps(){const r=run('npm',['install','--no-save','--package-lock=false','--ignore-scripts','firebase-admin@13','google-auth-library@9','playwright@1.52.0'],{allowFail:true});if(r.status!==0)fail('ENVIRONMENT_FAILURE:RELEASE_RUNTIME_DEPENDENCY_INSTALL_FAILED',safe(r.stderr));const fb=run('npx',['--yes','firebase-tools@15.19.1','--version'],{allowFail:true});if(fb.status!==0)fail('ENVIRONMENT_FAILURE:FIREBASE_CLI_NOT_READY',safe(fb.stderr));}
function baseEnv(target,runId,candidate){return {...process.env,ORBIT360_PRODUCT_PROJECT_ID:target.projectId,ORBIT360_PRODUCT_TENANT_ID:target.tenantId,ORBIT360_PRODUCT_URL:target.liveUrl,ORBIT360_PRODUCT_ARTIFACT:candidate.candidateDir,GITHUB_RUN_ID:String(runId),ORBIT360_F2_RUN_ID:String(runId),ORBIT360_CANDIDATE_ARTIFACT_ID:String(candidate.artifactId),ORBIT360_CANDIDATE_SOURCE_HEAD:candidate.sourceHead};}
function runTool(file,argv,env,code='PIPELINE_MECHANISM_FAILURE:RELEASE_HELPER_FAILED'){const r=run('node',[file,...argv],{env,allowFail:true});if(r.status!==0)fail(code,safe(r.stderr||r.stdout));return r;}
function resolveSmokeIdentity(tmp,env){const gh=path.join(tmp,'github-env'),out=path.join(tmp,'identity.json');fs.writeFileSync(gh,'');const e={...env,GITHUB_ENV:gh,ORBIT360_SMOKE_IDENTITY_EVIDENCE:out,ORBIT360_SMOKE_RUN_ID:env.GITHUB_RUN_ID,ORBIT360_SMOKE_TARGET_EMAIL_HASH:'',ORBIT360_SMOKE_TARGET_ADVISOR_ID:''};runTool(IDENTITY_HELPER,[],e,'DATA_CONTRACT_FAILURE:RELEASE_SMOKE_IDENTITY_NOT_READY');const text=fs.readFileSync(gh,'utf8'),line=text.split(/\r?\n/).find(x=>x.startsWith('ORBIT360_PRODUCT_SMOKE_EMAIL='));const email=line?line.slice('ORBIT360_PRODUCT_SMOKE_EMAIL='.length).trim():'';if(!email.includes('@'))fail('DATA_CONTRACT_FAILURE:RELEASE_SMOKE_EMAIL_NOT_RESOLVED');return {email,emailHash:crypto.createHash('sha256').update(email.toLowerCase().replace(/\s+/g,''),'utf8').digest('hex'),evidence:JSON.parse(fs.readFileSync(out,'utf8'))};}
function findBrowser(){for(const c of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=run('bash',['-lc',`command -v ${c} || true`],{allowFail:true});const p=String(r.stdout||'').trim();if(p&&fs.existsSync(p))return p;}fail('ENVIRONMENT_FAILURE:SYSTEM_BROWSER_NOT_AVAILABLE');}
function startProxy(remoteBase){const base=remoteBase.replace(/\/$/,'');const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url||'/',base+'/');const rr=await fetch(u,{method:'GET',headers:{'cache-control':'no-cache','pragma':'no-cache'},redirect:'follow'});res.statusCode=rr.status;for(const [k,v] of rr.headers){if(['content-encoding','transfer-encoding','content-length','connection'].includes(k.toLowerCase()))continue;res.setHeader(k,v);}res.end(Buffer.from(await rr.arrayBuffer()));}catch{res.statusCode=502;res.end('proxy failure');}});return new Promise((resolve,reject)=>{server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const a=server.address();resolve({server,url:`http://127.0.0.1:${a.port}/`});});});}
async function fullRemoteReadback(target,candidate,contract){
  const partition=hostingManifestPartition(contract,candidate),files=[...partition.publicFiles,{path:'orbit360-package-manifest.json',sha256:candidate.manifestSha256}];let i=0,failed='';
  async function worker(){while(i<files.length&&!failed){const f=files[i++];try{const r=await fetch(`${target.liveUrl}/${f.path}?orbit360-release=${Date.now()}-${i}`,{headers:{'cache-control':'no-cache','pragma':'no-cache'},redirect:'follow'});if(!r.ok){failed=`${f.path}:HTTP_${r.status}`;break;}const b=Buffer.from(await r.arrayBuffer());if(shaBuf(b)!==f.sha256){failed=`${f.path}:SHA_MISMATCH`;break;}}catch{failed=`${f.path}:FETCH_FAILED`;break;}}}
  await Promise.all(Array.from({length:8},worker));if(failed)fail('PIPELINE_MECHANISM_FAILURE:RELEASE_REMOTE_PUBLIC_REHASH_FAIL',failed);
  const excludedCheck=await excludedNotPublicReadback(target,partition.excludedFiles);
  return {candidateFileCount:candidate.fileCount,publicFileCount:partition.publicFileCount,excludedFileCount:partition.excludedFileCount,manifestReadbackIncluded:true,fullRemotePublicRehashPass:true,excludedNotPublic:excludedCheck.excludedNotPublic};
}
function buildDeployConfig(tmp,candidate){const base=j(FIREBASE_GO_LIVE),hosting={...(base.hosting||{}),public:candidate.candidateDir};const cfg={hosting};const p=path.join(tmp,'firebase-release.json');writeJson(p,cfg);return p;}
async function actualRelease(){
  const intentPath=arg('--intent'),runId=Number(arg('--run-id')),terminalOut=arg('--terminal-out');if(!intentPath||!Number.isInteger(runId)||runId<=0||!terminalOut)fail('PIPELINE_MECHANISM_FAILURE:RELEASE_HANDLER_ARGS_INVALID');
  const terminalPath=path.resolve(terminalOut),tmp=fs.mkdtempSync(path.join(os.tmpdir(),`orbit360-release-${runId}-`));let privileged=false,deployAttempted=false,rollbackRequired=false,rollbackExecuted=false,rollbackSucceeded=false,hostingBefore=null,target=null,candidate=null,hostingReadback=null,classification='PIPELINE_MECHANISM_FAILURE',failureCode='';
  const evidencePath=`actions-artifact:orbit360-single-state-${runId}/orbit360-terminal.json`;
  try{
    const contract=staticContract(),intent=JSON.parse(fs.readFileSync(path.resolve(intentPath),'utf8'));candidate=await materializeCandidate(tmp,contract);target=targetFrom(candidate,intent);validateIntent(intent,contract,candidate,target);
    bindServiceAccount(tmp,target);installRuntimeDeps();let env=baseEnv(target,runId,candidate);
    runTool(HOSTING_HELPER,['before'],env,'ENVIRONMENT_FAILURE:RELEASE_HOSTING_PREFLIGHT_FAILED');hostingBefore=j('orbit360-platform/runtime-gate-crm-v20260716/fase-a-product-hosting-before-v20260813.json');if(hostingBefore.ok!==true||!hostingBefore.rollbackAnchor)fail('ENVIRONMENT_FAILURE:RELEASE_ROLLBACK_ANCHOR_NOT_READY');
    runTool(INTEGRITY_SNAPSHOT,['before'],env,'DATA_CONTRACT_FAILURE:RELEASE_INTEGRITY_BEFORE_FAILED');const identity=resolveSmokeIdentity(tmp,env),browser=findBrowser(),deployConfig=buildDeployConfig(tmp,candidate);
    // Everything above is read-only. Authorization remains reserved until the next line.
    privileged=true;deployAttempted=true;
    const dep=run('npx',['--yes','firebase-tools@15.19.1','deploy','--only','hosting','--project',target.projectId,'--config',deployConfig,'--non-interactive','--json'],{env,allowFail:true});if(dep.status!==0)fail('ENVIRONMENT_FAILURE:RELEASE_EXACT_DEPLOY_FAILED',safe(dep.stderr||dep.stdout));
    runTool(HOSTING_HELPER,['smoke'],env,'PIPELINE_MECHANISM_FAILURE:RELEASE_HOSTING_READBACK_FAILED');hostingReadback=await fullRemoteReadback(target,candidate,contract);
    const proxy=await startProxy(target.liveUrl);try{
      const requestAdapter=path.join(tmp,'release-browser-request.json');writeJson(requestAdapter,{candidateArtifactId:candidate.artifactId,candidateSourceHead:candidate.sourceHead,candidate:{manifestStatus:candidate.manifest.status,fileCount:candidate.fileCount}});
      const browserOut=path.join(ROOT,`orbit360-platform/runtime-gate-crm-v20260716/f2-browser-run-${runId}.json`);
      const benv={...env,ORBIT360_F2_URL:proxy.url,ORBIT360_PRODUCT_SMOKE_EMAIL:identity.email,ORBIT360_TARGET_EMAIL_HASH:identity.emailHash,ORBIT360_SYSTEM_BROWSER_EXECUTABLE:browser,ORBIT360_F2_OUT:browserOut,ORBIT360_REQUEST_FILE:requestAdapter,GOOGLE_APPLICATION_CREDENTIALS:process.env.GOOGLE_APPLICATION_CREDENTIALS};
      const br=await runAsync('node',[BROWSER_SMOKE],{env:benv});if(br.status!==0)fail('FUNCTIONAL_DEFECT:RELEASE_PRODUCTION_BROWSER_SMOKE_FAILED',safe(br.stderr||br.stdout));
    }finally{await new Promise(r=>proxy.server.close(()=>r()));}
    env=baseEnv(target,runId,candidate);runTool(INTEGRITY_SNAPSHOT,['after'],env,'DATA_CONTRACT_FAILURE:RELEASE_INTEGRITY_AFTER_FAILED');runTool(INTEGRITY_COMPARE,[],env,'SECURITY_FAILURE:RELEASE_INTEGRITY_COMPARE_FAILED');
    const terminal={schemaVersion:'orbit360-go-live-release-terminal-v2-hosting-surface-aware',transitionId:'GO_LIVE_RELEASE_WINDOW',runId,ok:true,status:'PRODUCTION_SMOKE_PASS',classification:'PASS',failureCode:null,candidateArtifactId:candidate.artifactId,candidateSourceHead:candidate.sourceHead,candidateManifestSha256:candidate.manifestSha256,candidateZipSha256:candidate.zipSha256,target:{projectBound:true,tenantBound:true,siteBound:true},hostingReadback,privilegedRiskObserved:true,deployExecuted:true,productionTouched:true,productionSmokePass:true,rollbackRequired:false,rollbackExecuted:false,rollbackSucceeded:false,firestoreRead:true,firestoreWrites:0,authWrites:0,operationalWrites:0,rulesDeploy:false,dataWrites:false,containsPII:false,containsSecrets:false,evidencePath};writeJson(terminalPath,terminal);console.log(JSON.stringify(terminal,null,2));return;
  }catch(error){classification=classify(error);failureCode=safe(error?.message||error);rollbackRequired=privileged&&Boolean(hostingBefore?.rollbackAnchor);if(rollbackRequired){rollbackExecuted=true;try{const env=target&&candidate?baseEnv(target,runId,candidate):process.env;runTool(HOSTING_HELPER,['rollback'],env,'PIPELINE_MECHANISM_FAILURE:RELEASE_ROLLBACK_FAILED');const rb=j('orbit360-platform/runtime-gate-crm-v20260716/fase-a-product-hosting-rollback-v20260813.json');rollbackSucceeded=rb.ok===true&&rb.checks?.publicAssetsRestored===true;}catch(re){rollbackSucceeded=false;failureCode=`${failureCode}|ROLLBACK:${safe(re?.message||re)}`;classification='PIPELINE_MECHANISM_FAILURE';}}
    const terminal={schemaVersion:'orbit360-go-live-release-terminal-v2-hosting-surface-aware',transitionId:'GO_LIVE_RELEASE_WINDOW',runId,ok:false,status:rollbackSucceeded?'ROLLED_BACK_SAFE':'PRODUCTION_RELEASE_FAIL',classification,failureCode,candidateArtifactId:candidate?.artifactId||null,candidateSourceHead:candidate?.sourceHead||null,candidateManifestSha256:candidate?.manifestSha256||null,candidateZipSha256:candidate?.zipSha256||null,target:{projectBound:Boolean(target?.projectId),tenantBound:Boolean(target?.tenantId),siteBound:Boolean(target?.siteId)},hostingReadback,privilegedRiskObserved:privileged,deployExecuted:deployAttempted,productionTouched:privileged,productionSmokePass:false,rollbackRequired,rollbackExecuted,rollbackSucceeded,firestoreRead:Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS),firestoreWrites:0,authWrites:0,operationalWrites:0,rulesDeploy:false,dataWrites:false,containsPII:false,containsSecrets:false,evidencePath};writeJson(terminalPath,terminal);console.error(JSON.stringify(terminal,null,2));process.exitCode=41;
  }finally{try{fs.rmSync(tmp,{recursive:true,force:true});}catch{}}
}

try{
  if(has('--source-only-selftest'))await sourceOnlySelftest();
  else await actualRelease();
}catch(error){const p={schemaVersion:'orbit360-go-live-release-terminal-v2-hosting-surface-aware',transitionId:'GO_LIVE_RELEASE_WINDOW',runId:Number(arg('--run-id')||0)||0,ok:false,status:'RELEASE_HANDLER_PRE_ENTRY_FAIL',classification:classify(error),failureCode:safe(error?.message||error),privilegedRiskObserved:false,deployExecuted:false,productionTouched:false,productionSmokePass:false,rollbackRequired:false,rollbackExecuted:false,rollbackSucceeded:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,rulesDeploy:false,dataWrites:false,containsPII:false,containsSecrets:false,evidencePath:Number(arg('--run-id')||0)?`actions-artifact:orbit360-single-state-${arg('--run-id')}/orbit360-terminal.json`:''};const o=arg('--terminal-out');if(o)writeJson(path.resolve(o),p);console.error(JSON.stringify(p,null,2));process.exitCode=41;}
