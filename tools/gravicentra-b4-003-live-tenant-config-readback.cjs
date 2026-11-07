'use strict';
// Exact source/config/IAM readback for the single canonical LIVE catalog callable.
// Network operations here are GET only. No callable invocation, Firestore or IAM writes.
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const isolated=require('./gravicentra-b4-003-isolated-tenant-config-package.cjs');
const {TARGET,REGION,PROJECT,sha,blob,manifest}=isolated;
const ROOT='artifacts/orbit360-recovery/release-control/';
const ACTIVATION=ROOT+'I6_5_B4_003_LIVE_TENANT_CONFIG_DEPLOY_ACTIVATION_20261107.json';
const BASE='f1321d6bea245411fd09e9ae414d58510551ef3b';
const FRONTEND='e5030ec5ba9854f0c576fd905c2f510766347ffa';
const BEFORE={sourceGitBlobSha:'e4b602b4abb26fcd3d9413b1ab9bb67998be78dd',archiveSha256:'4c3ed1a442c31f8e094e4c66e168fa8cc622c076bc6d6e68bf9c0c30ab2acf0e',revision:'orbit360tenantdomainconfig-00019-mar'};
const EXPECTED='f7f250d16687b6282cc170a40aa502bea3268b1a6301e5821be8eaa1e233d1bf';
const READ_SUBJECT='test(b4-003): exact LIVE tenant catalogs source readback';
const DEPLOY_SUBJECT='deploy(b4-003): exact isolated LIVE tenant catalogs canonical successor';
const requestedMode=message=>message===DEPLOY_SUBJECT?'deploy':message===READ_SUBJECT||String(message).startsWith(READ_SUBJECT+'\n')?'readback':null;
const TOOL_PATHS=['.github/workflows/gravicentra-b4-003-executor.yml','tools/gravicentra-b4-003-isolated-tenant-config-package.cjs','tools/gravicentra-b4-003-live-tenant-config-readback.cjs','tools/gravicentra-b4-003-live-tenant-config-transport.test.cjs','tools/gravicentra-b4-003-tenant-config-functional.test.cjs'];
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const digest=x=>sha(JSON.stringify(stable(x)));
const need=(ok,why)=>{if(!ok)throw Error('TENANT_CONFIG_'+why);};
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function inventorySummary(data){
 const raw=data.result??data,value=typeof raw==='string'?JSON.parse(raw):raw;
 const rows=Array.isArray(value)?value:Array.isArray(value.functions)?value.functions:[];
 const identity=r=>String(r.id||r.name||r.function||'').split('/').pop();
 need(rows.length>0&&rows.filter(r=>identity(r)===TARGET).length===1,'EXACT_EXISTING_INVENTORY_TARGET');
 const keys=rows.map(r=>String(r.region||'')+'/'+identity(r));need(new Set(keys).size===keys.length,'DUPLICATE_INVENTORY_TARGET');
 const others=rows.filter(r=>identity(r)!==TARGET).map(r=>({key:String(r.region||'')+'/'+identity(r),sha256:digest(r)})).sort((a,b)=>a.key.localeCompare(b.key));
 return{functionCount:rows.length,nonTargetFunctions:others,nonTargetInventorySha256:digest(others)};
}
function metadataIdentity(meta){
 const name=`projects/${PROJECT}/locations/${REGION}/functions/${TARGET}`;
 need(meta.name===name&&meta.environment==='GEN_2'&&meta.state==='ACTIVE'&&meta.buildConfig?.entryPoint===TARGET,'EXACT_FUNCTION_IDENTITY');
 const s=meta.serviceConfig||{},b=meta.buildConfig||{},source=b.sourceProvenance?.resolvedStorageSource||b.source?.storageSource;
 need(source?.bucket&&source?.object&&source?.generation,'EXACT_SOURCE_GENERATION');
 need(typeof s.service==='string'&&/^projects\/(?:ays-orbit-360-lab|646761409743)\/locations\/us-central1\/services\/orbit360tenantdomainconfig$/.test(s.service),'RUN_SERVICE_IDENTITY');
 return{name:meta.name,runtime:b.runtime,entryPoint:b.entryPoint,revision:s.revision||null,updateTime:meta.updateTime||null,sourceStorage:source,
  service:s.service,uri:s.uri||null,serviceAccountEmail:s.serviceAccountEmail||null,ingressSettings:s.ingressSettings||null,
  environmentVariablesSha256:digest(s.environmentVariables||{}),secretEnvironmentVariablesSha256:digest(s.secretEnvironmentVariables||[]),
  serviceConfigNonRevisionSha256:digest(Object.fromEntries(Object.entries(s).filter(([k])=>k!=='revision')))};
}
function iamIdentity(policy){
 return{status:'READ',policySha256:digest({version:policy.version||0,bindings:(policy.bindings||[]).map(b=>({...b,members:(b.members||[]).slice().sort()})).sort((a,b)=>JSON.stringify(stable(a)).localeCompare(JSON.stringify(stable(b))))})};
}
function sourceArchive(archive){
 const names=execFileSync('unzip',['-Z1',archive],{encoding:'utf8'}).trim().split('\n');
 const primary=names.filter(n=>n==='tenant-domain-config.js'||n.endsWith('/tenant-domain-config.js'));
 need(primary.length===1,'ARCHIVE_OWNER_CARDINALITY');const prefix=primary[0].slice(0,-'tenant-domain-config.js'.length),files={};
 for(const entry of names.filter(n=>!n.endsWith('/'))){
  need(entry.startsWith(prefix)&&!entry.startsWith('/')&&!entry.split('/').includes('..'),'ARCHIVE_UNSAFE_PATH');
  const relative=entry.slice(prefix.length);need(relative&&!Object.hasOwn(files,relative),'ARCHIVE_DUPLICATE_FILE');
  const bytes=execFileSync('unzip',['-p',archive,entry],{maxBuffer:10000000});
  files[relative]={sha256:sha(bytes),gitBlobSha:blob(bytes),bytes:bytes.length};
 }
 need(files['package.json']&&files['package-lock.json']&&files['bootstrap.js'],'PREDECESSOR_PACKAGE_INCOMPLETE');
 return{sourceFiles:files,sourceManifestSha256:manifest(files),sourceGitBlobSha:files['tenant-domain-config.js'].gitBlobSha};
}
function validateSnapshot(snapshot){
 need(snapshot.target===TARGET&&snapshot.region===REGION&&snapshot.project===PROJECT,'SNAPSHOT_IDENTITY');
 need(snapshot.identity?.entryPoint===TARGET&&snapshot.identity?.runtime==='nodejs22','SNAPSHOT_RUNTIME');
 need(snapshot.iam?.status==='READ'&&/^[a-f0-9]{64}$/.test(snapshot.iam.policySha256||''),'IAM_READBACK_REQUIRED');
 need(/^[a-f0-9]{64}$/.test(snapshot.sourceManifestSha256||'')&&snapshot.inventory?.functionCount>0,'SNAPSHOT_MANIFEST');
}
function compare(phase,before,after,expected){
 need(['after','rollback'].includes(phase),'COMPARE_PHASE');validateSnapshot(before);validateSnapshot(after);
 need(before.inventory.functionCount===after.inventory.functionCount&&before.inventory.nonTargetInventorySha256===after.inventory.nonTargetInventorySha256,'NON_TARGET_FUNCTION_CHANGED');
 for(const key of ['runtime','entryPoint','service','uri','serviceAccountEmail','ingressSettings','environmentVariablesSha256','secretEnvironmentVariablesSha256','serviceConfigNonRevisionSha256'])need(before.identity[key]===after.identity[key],'NON_SOURCE_CONFIGURATION_CHANGED:'+key);
 need(before.iam.policySha256===after.iam.policySha256,'IAM_CHANGED');
 if(phase==='after'){
  need(after.sourceManifestSha256===expected&&Object.keys(after.sourceFiles).length===5,'COMPLETE_DEPLOYED_PACKAGE_MISMATCH');
  need(before.identity.revision!==after.identity.revision,'REVISION_DID_NOT_MOVE');
 }else need(before.sourceManifestSha256===after.sourceManifestSha256,'ROLLBACK_SOURCE_NOT_RESTORED');
 return{status:phase==='after'?'EXACT_CATALOG_BYTES_CONFIG_IAM_PASS_SIGNED_UI_PENDING':'EXACT_CATALOG_PREDECESSOR_RESTORED',target:TARGET,region:REGION,sourceManifestSha256:after.sourceManifestSha256,revision:after.identity.revision,nonTargetInventoryUnchanged:true,serviceConfigurationUnchanged:true,iamUnchanged:true,businessWrites:0,hostingChanged:false,rulesChanged:false,productionAccepted:false};
}
function validateGrant(grant,files){
 need(grant?.schema==='GRAVICENTRA_LIVE_TENANT_CONFIG_TRANSPORT_SUCCESSOR_V1'&&grant.sourceBaseHead===BASE&&grant.preservedFrontendSource===FRONTEND,'AUTHORITY_BASE');
 need(grant.target===TARGET&&grant.region===REGION&&grant.project===PROJECT&&grant.deployAuthorized===true&&grant.requiresActivationReceipt===true&&grant.activationPath===ACTIVATION,'AUTHORITY_IDENTITY');
 need(grant.businessWrites===0&&grant.hostingDeployAuthorized===false&&grant.otherFunctionsDeployAuthorized===false&&grant.readerGrantExpanded===false&&grant.sourceChanged===false,'AUTHORITY_BOUNDARY');
 need(grant.expectedSourceManifestSha256===EXPECTED&&grant.packageFiles===5&&grant.singleExport===TARGET,'AUTHORITY_PACKAGE');
 need(grant.before?.sourceGitBlobSha===BEFORE.sourceGitBlobSha&&grant.before.archiveSha256===BEFORE.archiveSha256&&grant.before.revision===BEFORE.revision,'AUTHORITY_PREDECESSOR');
 need(Array.isArray(grant.changes)&&JSON.stringify(grant.changes.map(x=>x.path).sort())===JSON.stringify(TOOL_PATHS.slice().sort()),'AUTHORITY_EXACT_PATHS');
 for(const c of grant.changes)need(files[c.path]!=null&&blob(Buffer.from(files[c.path]))===c.blobSha&&sha(Buffer.from(files[c.path]))===c.sha256,'AUTHORITY_EXECUTABLE_PIN');
 return grant;
}
function validateActivation(activation,grant,before){
 validateSnapshot(before);
 need(activation?.schema==='GRAVICENTRA_LIVE_TENANT_CONFIG_ACTIVATION_V1'&&activation.status==='AUTHORIZED_EXACT_SINGLE_CATALOG_DEPLOY','ACTIVATION_SCHEMA');
 need(activation.target===TARGET&&activation.region===REGION&&activation.project===PROJECT&&activation.preservedFrontendSource===FRONTEND,'ACTIVATION_IDENTITY');
 need(activation.reviewedReadbackConclusion==='success'&&Number.isSafeInteger(activation.reviewedReadbackRunId)&&activation.reviewedReadbackRunId>42401330631&&/^[a-f0-9]{40}$/.test(activation.reviewedSourceHead||''),'ACTIVATION_FRESH_READBACK');
 need(activation.realBusinessWritesAuthorized===false&&activation.otherFunctionsDeployAuthorized===false&&activation.hostingDeployAuthorized===false&&activation.readerGrantExpanded===false,'ACTIVATION_BOUNDARY');
 need(before.sourceGitBlobSha===BEFORE.sourceGitBlobSha&&before.archiveSha256===BEFORE.archiveSha256&&before.identity.revision===BEFORE.revision,'ACTUAL_PREDECESSOR_CHANGED');
 const bindings={beforeArchiveSha256:before.archiveSha256,beforeSourceManifestSha256:before.sourceManifestSha256,beforeRevision:before.identity.revision,beforeServiceConfigSha256:before.identity.serviceConfigNonRevisionSha256,beforeEnvironmentSha256:before.identity.environmentVariablesSha256,beforeIamPolicySha256:before.iam.policySha256,beforeNonTargetInventorySha256:before.inventory.nonTargetInventorySha256,expectedSourceManifestSha256:grant.expectedSourceManifestSha256};
 for(const [key,value] of Object.entries(bindings))need(activation[key]===value,'ACTIVATION_EXACT_BINDING:'+key);
 return true;
}
async function capture({client,phase,tmp,inventory}){
 need(['before','after','rollback'].includes(phase),'READBACK_PHASE');
 const {data:meta}=await client.request({url:`https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/functions/${TARGET}`});
 const identity=metadataIdentity(meta),src=identity.sourceStorage;
 let iam;try{const {data}=await client.request({url:'https://run.googleapis.com/v2/'+identity.service+':getIamPolicy'});iam=iamIdentity(data);}catch(error){iam={status:'UNAVAILABLE',policySha256:null,httpStatus:Number(error.response?.status||0)};}
 const url='https://storage.googleapis.com/storage/v1/b/'+encodeURIComponent(src.bucket)+'/o/'+encodeURIComponent(src.object)+'?alt=media&generation='+encodeURIComponent(src.generation);
 const {data}=await client.request({url,responseType:'arraybuffer'}),bytes=Buffer.from(data);need(bytes.length>1000,'SOURCE_ARCHIVE_SIZE');
 const archive=path.join(tmp,'gi-b4003-tenant-config-'+phase+'.zip');fs.writeFileSync(archive,bytes);
 const source=sourceArchive(archive),expected=isolated.plan('functions');
 need(expected.sourceManifestSha256===EXPECTED,'EXPECTED_PACKAGE_PIN');
 return{schema:'GRAVICENTRA_LIVE_TENANT_CONFIG_SOURCE_SNAPSHOT_V1',phase,head:process.env.GITHUB_SHA||null,observedAtUtc:new Date().toISOString(),target:TARGET,region:REGION,project:PROJECT,identity,iam,...source,archiveSha256:sha(bytes),inventory:inventorySummary(inventory),expectedSourceManifestSha256:expected.sourceManifestSha256,sourceMatchesCurrent:source.sourceManifestSha256===expected.sourceManifestSha256,readyForActivation:identity.runtime==='nodejs22'&&iam.status==='READ',networkMethods:['GET'],businessWrites:0,deployAuthorized:false};
}
function readAuthority(){
 const cp=json(ROOT+'CONTROL_PLANE.json'),bytes=fs.readFileSync(cp.ownerDecisionFreeze20261107.path);
 need(blob(bytes)===cp.ownerDecisionFreeze20261107.blobSha,'CURRENT_OWNER_RECORD_HASH');
 const freeze=JSON.parse(bytes);return validateGrant(freeze.catalogTransportSuccessor,Object.fromEntries(TOOL_PATHS.map(p=>[p,fs.readFileSync(p)])));
}
async function main(){
 const phase=process.argv[2],tmp=process.env.RUNNER_TEMP;
 need(process.env.PROJECT_ID===PROJECT&&tmp,'PROJECT_OR_TEMP');
 const grant=readAuthority();
 if(phase==='authority'){need(['readback','deploy'].includes(process.env.CATALOG_MODE),'MODE');return;}
 if(phase==='assess'){
  const before=json(path.join(tmp,'gi-b4003-tenant-config-before.json'));let deploy=false;
  if(process.env.CATALOG_MODE==='deploy'){
   const activation=json(ACTIVATION);validateActivation(activation,grant,before);
   const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();git('merge-base','--is-ancestor',activation.reviewedSourceHead,'HEAD');
   need(!git('diff','--name-only',activation.reviewedSourceHead,'HEAD','--','functions','orbit360-platform',':(exclude)orbit360-platform/docs/**',...TOOL_PATHS),'SOURCE_CHANGED_AFTER_REVIEW');deploy=!before.sourceMatchesCurrent;
  }else need(process.env.CATALOG_MODE==='readback','MODE');
  fs.appendFileSync(process.env.GITHUB_OUTPUT,'needs_deploy='+deploy+'\n');
  fs.writeFileSync(path.join(tmp,'gi-b4003-tenant-config-result.json'),JSON.stringify({status:deploy?'EXACT_CATALOG_DEPLOY_PREPARED':'CATALOG_READBACK_ONLY',head:process.env.GITHUB_SHA,target:TARGET,readyForActivation:before.readyForActivation,productDeployed:false,businessWrites:0,productionAccepted:false},null,2)+'\n');return;
 }
 const {GoogleAuth}=require(path.join(process.env.GI_DEPS_DIR,'google-auth-library')),client=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
 const snapshot=await capture({client,phase,tmp,inventory:json(process.env.GI_CATALOG_INVENTORY_PATH)});
 fs.writeFileSync(path.join(tmp,'gi-b4003-tenant-config-'+phase+'.json'),JSON.stringify(snapshot,null,2)+'\n');
 if(phase!=='before'){
  const before=json(path.join(tmp,'gi-b4003-tenant-config-before.json')),result=compare(phase,before,snapshot,grant.expectedSourceManifestSha256);
  fs.writeFileSync(path.join(tmp,'gi-b4003-tenant-config-result.json'),JSON.stringify({...result,head:process.env.GITHUB_SHA},null,2)+'\n');
 }
 console.log(JSON.stringify({target:TARGET,phase,sourceManifestSha256:snapshot.sourceManifestSha256,sourceMatchesCurrent:snapshot.sourceMatchesCurrent,readyForActivation:snapshot.readyForActivation,iam:snapshot.iam.status,runtime:snapshot.identity.runtime}));
}
module.exports={ROOT,ACTIVATION,BASE,FRONTEND,BEFORE,EXPECTED,READ_SUBJECT,DEPLOY_SUBJECT,requestedMode,TOOL_PATHS,stable,digest,inventorySummary,metadataIdentity,iamIdentity,sourceArchive,validateSnapshot,compare,validateGrant,validateActivation,capture};
if(require.main===module)main().catch(e=>{console.error(String(e.message||e));process.exitCode=42;});
