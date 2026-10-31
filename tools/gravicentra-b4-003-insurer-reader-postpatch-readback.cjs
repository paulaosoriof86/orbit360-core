'use strict';
// Read-only adjudication of the one previously submitted environment operation.
// This helper never calls the existing repair() entry point. Every remote
// request is an allowlisted GET; source bytes remain a separate mandatory gate.
// https://docs.cloud.google.com/functions/docs/reference/rest/v2/projects.locations.operations
// https://docs.cloud.google.com/functions/docs/reference/rest/v2/projects.locations.functions
// https://docs.cloud.google.com/run/docs/reference/rest/v2/projects.locations.services.revisions/get
const fs=require('node:fs'),path=require('node:path');
const {PIN,PROJECT,REGION,TARGET,NAME,SERVICE,FUNCTION_URL,hash,svcHash,iamHash,strictMap,validateSnapshots,revisionData}=require('./gravicentra-b4-003-insurer-reader-env-repair.cjs');
const PROOF=Object.freeze({
 patchReportFileSha256:'f674cfb499a98bf0f3a6e75cdf2e5d40c4c51d86b25b64f68593200f0499d60e',
 manifestFileSha256:'508cbecd62cba2facd22484a94482ac1fb081fde1e2c3d42fb17fa1d35ba0526',
 operationName:'projects/ays-orbit-360-lab/locations/us-east1/operations/operation-1793408711390-65f18812df446-eb3d2d80-cd121490',
 sourceSha:'bcb54435788e1ace50325f347d1d9c0ee4a222e5',sourceRunId:41150545623,patchRunId:41153515829,
 expectedBackendFileCount:33,
 signatureVariableValueSha256:'e0603c499aae47eb89343ad0ef3178e044c62e70ae2309b35591d1d49a3211ec'
});
const OPERATION_URL='https://cloudfunctions.googleapis.com/v2/'+PROOF.operationName;
const IAM_URL='https://run.googleapis.com/v2/'+SERVICE+':getIamPolicy';
const REVISION_URL_PREFIX='https://run.googleapis.com/v2/'+SERVICE+'/revisions/';
const hold=code=>{const e=new Error(code);e.safeCode=code;throw e;};
const requireThat=(condition,code)=>{if(!condition)hold(code);};
const same=(a,b)=>a===undefined||b===undefined?a===b:hash(a)===hash(b);
const sourceStorage=f=>f?.buildConfig?.sourceProvenance?.resolvedStorageSource||f?.buildConfig?.source?.storageSource||null;
const typeOf=v=>v===null?'null':Array.isArray(v)?'array':typeof v;
function safeString(value,pattern){
 if(typeof value!=='string')return {type:typeOf(value),present:value!==undefined};
 if(value.length<=512&&pattern.test(value))return value;
 return {type:'string',length:value.length,sha256:hash(value),valueRedacted:true};
}
const resourceName=/^projects\/[a-z0-9-]+\/locations\/[a-z0-9-]+\/(?:functions|services|builds)\/[A-Za-z0-9_-]+$/;
const sourceShape=s=>Boolean(s&&typeof s==='object'&&!Array.isArray(s)&&s.bucket===PIN.sourceStorage.bucket&&s.object===PIN.sourceStorage.object&&typeof s.generation==='string'&&/^[1-9][0-9]{0,24}$/.test(s.generation)&&Object.keys(s).every(k=>['bucket','object','generation'].includes(k)));
const safeStorage=s=>sourceShape(s)?{bucket:s.bucket,object:s.object,generation:s.generation}:{type:typeOf(s),sha256:hash(s),valueRedacted:true};
const buildNameInScope=value=>typeof value==='string'&&new RegExp('^projects/(?:'+PROJECT+'|646761409743)/locations/'+REGION+'/builds/[A-Za-z0-9_-]+$').test(value);
function validateInputs(before,after,patchReport,manifest,pin=PIN,proof=PROOF){
 const pair=validateSnapshots(before,after,pin);
 requireThat(patchReport?.schema==='gravicentra-insurer-reader-env-restoration-v1'&&patchReport.target===TARGET&&patchReport.project===PROJECT&&patchReport.region===REGION&&patchReport.sourceRunId===proof.sourceRunId,'PATCH_REPORT_IDENTITY_MISMATCH');
 requireThat(patchReport.status==='HOLD'&&patchReport.failureCode==='CURRENT_FUNCTION_SOURCE_CHANGED'&&patchReport.patchAttempted===true&&patchReport.patchRequests===1&&patchReport.updateMask==='serviceConfig.environmentVariables'&&patchReport.operationName===proof.operationName,'PATCH_REPORT_OPERATION_MISMATCH');
 requireThat(patchReport.reconstruction?.verifiedEnvironmentSha256===pin.previousEnvSha256&&patchReport.projectedServiceConfigNonRevisionSha256===pin.previousServiceSha256&&patchReport.currentEnvironmentSha256===pin.deployedEnvSha256&&patchReport.currentServiceConfigNonRevisionSha256===pin.deployedServiceSha256,'PATCH_REPORT_BASELINE_PROOF_MISMATCH');
 requireThat(same(patchReport.functionEnvironmentChanges,[{name:'FUNCTION_SIGNATURE_TYPE',beforeSha256:null,afterSha256:proof.signatureVariableValueSha256}]),'PATCH_REPORT_DELTA_MISMATCH');
 requireThat(manifest?.sourceSha===proof.sourceSha&&manifest.region===REGION&&manifest.stageMatchesImmutableBuilder===true&&same(manifest.targets,['orbit360ProductOperationalCommandPreview',TARGET])&&Array.isArray(manifest.files)&&manifest.files.length===proof.expectedBackendFileCount,'MANIFEST_IDENTITY_MISMATCH');
 const paths=new Set();
 for(const f of manifest.files){requireThat(f&&typeof f.path==='string'&&/^functions\/[A-Za-z0-9_./-]+$/.test(f.path)&&!f.path.split('/').some(x=>['.','..',''].includes(x))&&!paths.has(f.path)&&/^[a-f0-9]{64}$/.test(f.sha256)&&Number.isSafeInteger(f.bytes)&&f.bytes>0,'MANIFEST_FILE_INVALID');paths.add(f.path);}
 return pair;
}
function validateInputFiles(buffers,pin=PIN,proof=PROOF){
 requireThat(Array.isArray(buffers)&&buffers.length===4,'FOUR_INPUT_FILES_REQUIRED');
 const expected=[pin.beforeFileSha256,pin.afterFileSha256,proof.patchReportFileSha256,proof.manifestFileSha256];
 buffers.forEach((b,i)=>requireThat(Buffer.isBuffer(b)&&hash(b)===expected[i],'IMMUTABLE_INPUT_FILE_DIGEST_MISMATCH_'+i));
 let docs;try{docs=buffers.map(b=>JSON.parse(b));}catch(_error){hold('IMMUTABLE_INPUT_JSON_INVALID');}
 validateInputs(...docs,pin,proof);return docs;
}
function functionEvidence(f,pair,pin=PIN){
 const build=f?.buildConfig||{},svc=f?.serviceConfig||{},storage=sourceStorage(f),env=svc.environmentVariables;
 const expected=pair.after.identity;
 const checks={
  name:f?.name===NAME,environment:f?.environment==='GEN_2',stateActive:f?.state==='ACTIVE',runtime:build.runtime==='nodejs22',entryPoint:build.entryPoint===TARGET,service:svc.service===SERVICE,
  codeHash:f?.labels?.['firebase-functions-hash']===pin.codeHash,labels:same(f?.labels||{},expected.labels||{}),
  baselineEnvironment:hash(env||{})===pin.previousEnvSha256,baselineServiceConfig:svcHash(f||{})===pin.previousServiceSha256,
  secretReferences:hash(svc.secretEnvironmentVariables||[])===expected.secretEnvironmentVariablesSha256,
  buildInScope:buildNameInScope(build.build),storageInScope:sourceShape(storage),revisionInScope:typeof svc.revision==='string'&&/^orbit360scopedpolicyreadpreview-[a-z0-9-]+$/.test(svc.revision),
  buildUnchanged:build.build===pin.build,storageUnchanged:same(storage,pin.sourceStorage)
 };
 const identity={name:safeString(f?.name,resourceName),state:safeString(f?.state,/^(ACTIVE|UPDATING|DEPLOYING|FAILED|DELETING|UNKNOWN|STATE_UNSPECIFIED)$/),environment:safeString(f?.environment,/^GEN_[12]$/),runtime:safeString(build.runtime,/^[a-z][a-z0-9]{0,31}$/),entryPoint:safeString(build.entryPoint,/^[A-Za-z][A-Za-z0-9_]{0,127}$/),codeHash:safeString(f?.labels?.['firebase-functions-hash'],/^[a-f0-9]{40}$/),build:safeString(build.build,resourceName),sourceStorage:safeStorage(storage),revision:safeString(svc.revision,/^orbit360scopedpolicyreadpreview-[a-z0-9-]+$/),labelsSha256:hash(f?.labels||{}),environmentVariablesSha256:hash(env||{}),serviceConfigNonRevisionSha256:svcHash(f||{}),buildConfigSha256:hash(build),updateTime:safeString(f?.updateTime,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/)};
 return {checks,identity};
}
function requireFunction(evidence){
 for(const field of ['name','environment','stateActive','runtime','entryPoint','service','codeHash','labels','baselineEnvironment','baselineServiceConfig','secretReferences','buildInScope','storageInScope','revisionInScope'])requireThat(evidence.checks[field],'FUNCTION_REQUIREMENT_FAILED_'+field.toUpperCase());
}
function responseBinding(response,current){
 const responsePresent=Boolean(response&&typeof response==='object'&&!Array.isArray(response));
 const responseTypeValid=responsePresent&&(response['@type']===undefined||response['@type']==='type.googleapis.com/google.cloud.functions.v2.Function');
 const comparisons={};
 for(const key of ['name','state','environment','buildConfig','serviceConfig','labels'])comparisons[key]=responsePresent&&same(response[key],current?.[key]);
 // A completed operation is a snapshot; the provider may advance updateTime
 // before a subsequent GET even when the complete functional resource is stable.
 const timestamp=value=>{
  if(typeof value!=='string')return null;
  const parts=/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?Z$/.exec(value);
  if(!parts||!Number.isFinite(Date.parse(value)))return null;
  return parts[1]+'.'+(parts[2]||'').padEnd(9,'0')+'Z';
 };
 const responseAt=timestamp(response?.updateTime),currentAt=timestamp(current?.updateTime);
 comparisons.updateTime=responsePresent&&responseAt!==null&&currentAt!==null&&responseAt<=currentAt;
 const stableResource=value=>value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='@type'&&key!=='updateTime')):null;
 comparisons.completeFunction=responsePresent&&same(stableResource(response),stableResource(current));
 return {responsePresent,responseTypeValid,comparisons,bindsCurrent:responsePresent&&responseTypeValid&&Object.values(comparisons).every(Boolean)};
}
function imageIdentity(value){
 const pattern=new RegExp('^'+REGION+'-docker\\.pkg\\.dev/(?:'+PROJECT+'|646761409743)/[a-z0-9._/-]+(?:@sha256:[a-f0-9]{64}|:[A-Za-z0-9_.-]+)$');
 requireThat(typeof value==='string'&&value.length<=512&&pattern.test(value),'REVISION_IMAGE_OUT_OF_SCOPE');return value;
}
async function readback({client,before,after,patchReport,manifest,pin=PIN,proof=PROOF,persist=()=>{},wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,maxWaitMs=120000,pollIntervalMs=10000}){
 const report={schema:'gravicentra-insurer-reader-postpatch-readback-v1',status:'HOLD',target:TARGET,project:PROJECT,region:REGION,sourceRunId:proof.sourceRunId,patchRunId:proof.patchRunId,startedAt:new Date().toISOString(),operationName:proof.operationName,operationDone:false,operationResponseBindsCurrent:false,patchRequests:0,remoteMutationRequests:0,envValuesExported:false,secretManagerValuesRead:false,sourceBytesProofRequired:true,sourceBytesProofCompleted:false,manifestSha256:proof.manifestFileSha256,expectedBackendFileCount:proof.expectedBackendFileCount};
 const save=()=>persist(JSON.parse(JSON.stringify(report)));
 const operationUrl='https://cloudfunctions.googleapis.com/v2/'+PROOF.operationName;
 const allowed=url=>url===FUNCTION_URL||url===IAM_URL||url===operationUrl||url.startsWith(REVISION_URL_PREFIX)&&/^orbit360scopedpolicyreadpreview-[a-z0-9-]+$/.test(url.slice(REVISION_URL_PREFIX.length));
 const get=async(url,code,timeout=45000)=>{requireThat(allowed(url),'READ_URL_OUT_OF_SCOPE');try{return(await client.request({url,method:'GET',timeout:Math.max(1,Math.min(45000,timeout)),retry:false})).data;}catch(error){if(error.safeCode)throw error;hold(code+'_HTTP_'+Number(error.response?.status||0));}};
 const readRevision=async(shortName,stage)=>revisionData(await get(REVISION_URL_PREFIX+shortName,'REVISION_READ_FAILED'),shortName,identity=>{(report.revisionIdentityReads||=[]).push({stage,...identity});save();});
 try{
  requireThat(proof.operationName===PROOF.operationName,'FIXED_OPERATION_REQUIRED');
  const pair=validateInputs(before,after,patchReport,manifest,pin,proof);
  const budget=Math.min(120000,Math.max(1,maxWaitMs)),deadline=now()+budget,delay=Math.min(10000,Math.max(1,pollIntervalMs));
  let operation=null;
  for(let n=0;n<121;n++){
   const remaining=deadline-now();requireThat(remaining>0,'KNOWN_OPERATION_NOT_DONE_WITHIN_BUDGET');
   operation=await get(operationUrl,'OPERATION_READ_FAILED',remaining);
   const operationIdentityMatches=operation?.name===PROOF.operationName;
   const metadataTargetMatches=operation?.metadata?.target===undefined||operation.metadata.target===NAME;
   const metadataVerbMatches=operation?.metadata?.verb===undefined||operation.metadata.verb==='update';
   report.operationPollCount=n+1;report.operationDone=operation?.done===true;
   report.operationRead={identityMatches:operationIdentityMatches,metadataTargetMatches,metadataVerbMatches,responsePresent:Boolean(operation?.response&&typeof operation.response==='object'),errorPresent:Boolean(operation?.error),errorCode:operation?.error?Number(operation.error.code||0):null};save();
   requireThat(operationIdentityMatches,'OPERATION_IDENTITY_CHANGED');requireThat(metadataTargetMatches&&metadataVerbMatches,'OPERATION_METADATA_OUT_OF_SCOPE');
   if(operation.done===true)break;
   requireThat(!operation.error&&!operation.response,'PENDING_OPERATION_CONTAINS_RESULT');
   const left=deadline-now();requireThat(left>0&&n+1<121,'KNOWN_OPERATION_NOT_DONE_WITHIN_BUDGET');await wait(Math.min(delay,left));
  }
  requireThat(operation?.done===true,'KNOWN_OPERATION_NOT_DONE_WITHIN_BUDGET');
  let current=await get(FUNCTION_URL,'FUNCTION_READ_FAILED');
  let currentEvidence=functionEvidence(current,pair,pin);report.currentFunctionIdentity=currentEvidence.identity;report.currentFunctionComparisons=currentEvidence.checks;
  const binding=responseBinding(operation.response,current);report.operationResponseBinding=binding;report.operationResponseBindsCurrent=binding.bindsCurrent;
  if(binding.responsePresent){const responseEvidence=functionEvidence(operation.response,pair,pin);report.operationResponseFunctionIdentity=responseEvidence.identity;report.operationResponseFunctionComparisons=responseEvidence.checks;}
  save();requireThat(!operation.error,'KNOWN_OPERATION_FAILED');requireThat(binding.responsePresent,'OPERATION_FUNCTION_RESPONSE_MISSING');requireThat(binding.responseTypeValid,'OPERATION_RESPONSE_TYPE_MISMATCH');
  requireFunction(currentEvidence);requireFunction(functionEvidence(operation.response,pair,pin));requireThat(binding.bindsCurrent,'OPERATION_RESPONSE_DOES_NOT_BIND_CURRENT');strictMap(current.serviceConfig.environmentVariables||{});
  const deployed=await readRevision(pin.deployedRevision,'DEPLOYED_SOURCE');const active=await readRevision(current.serviceConfig.revision,'OPERATION_RESULT');
  report.deployedImage=imageIdentity(deployed.image);report.currentImage=imageIdentity(active.image);
  report.imageComparisonBasis='IMAGE_REFERENCE_COMPARISON; DIGEST_IDENTITY_WHEN_PRESENT';
  report.deployedRevisionEnvironmentSha256=hash(deployed.map);report.currentRevisionEnvironmentSha256=hash(active.map);
  requireThat(hash(deployed.map)===pin.deployedEnvSha256,'DEPLOYED_REVISION_ENVIRONMENT_CHANGED');requireThat(hash(active.map)===pin.previousEnvSha256,'CURRENT_REVISION_ENVIRONMENT_NOT_BASELINE');
  report.platformBuildChanged=current.buildConfig.build!==pin.build;report.platformStorageChanged=!same(sourceStorage(current),pin.sourceStorage);report.platformImageChanged=active.image!==deployed.image;
  report.platformMetadataUnchanged=!report.platformBuildChanged&&!report.platformStorageChanged&&!report.platformImageChanged;
  report.metadataAttribution='EXACT_COMPLETED_OPERATION_RESPONSE_BINDS_CURRENT_FUNCTION_AND_REVISION';
  report.iamSha256=iamHash(await get(IAM_URL,'IAM_READ_FAILED'));report.iamUnchanged=report.iamSha256===pin.iamSha256;save();requireThat(report.iamUnchanged,'CURRENT_IAM_CHANGED');
  const fresh=await get(FUNCTION_URL,'FUNCTION_READ_FAILED'),freshEvidence=functionEvidence(fresh,pair,pin);
  report.finalFunctionIdentity=freshEvidence.identity;report.finalFunctionComparisons=freshEvidence.checks;report.functionStableDuringReadback=same(current,fresh);report.finalOperationResponseBindsCurrent=responseBinding(operation.response,fresh).bindsCurrent;save();
  requireFunction(freshEvidence);requireThat(report.functionStableDuringReadback&&report.finalOperationResponseBindsCurrent,'FUNCTION_CHANGED_DURING_READBACK');
  requireThat(iamHash(await get(IAM_URL,'IAM_READ_FAILED'))===pin.iamSha256,'IAM_CHANGED_DURING_READBACK');
  report.status='EXPECTED_METADATA_PASS_SOURCE_BYTES_PENDING';report.finalEnvironmentSha256=hash(fresh.serviceConfig.environmentVariables||{});report.finalServiceConfigNonRevisionSha256=svcHash(fresh);report.finalRevision=fresh.serviceConfig.revision;report.finishedAt=new Date().toISOString();save();return report;
 }catch(error){report.status='HOLD';report.failureCode=error.safeCode||'UNEXPECTED_INTERNAL_FAILURE';report.finishedAt=new Date().toISOString();save();const safe=new Error(report.failureCode);safe.safeCode=report.failureCode;throw safe;}
}
async function main(){
 requireThat(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='paulaosoriof86/orbit360-core'&&process.env.GITHUB_REF_NAME==='recovery/fase-a-clean-20260831','EXISTING_CANONICAL_RUNNER_REQUIRED');
 requireThat(process.env.PROJECT_ID===PROJECT&&process.env.TARGET_REGION===REGION&&process.env.GI_READER_POSTPATCH_READBACK_AUTHORIZATION==='READ_KNOWN_OPERATION_AND_CONFIGURATION_ONLY','EXACT_READBACK_AUTHORITY_REQUIRED');
 const [beforePath,afterPath,patchPath,manifestPath,out]=process.argv.slice(2);requireThat(beforePath&&afterPath&&patchPath&&manifestPath&&out&&process.argv.slice(2).length===5,'FIVE_PATH_ARGUMENTS_REQUIRED');
 const [before,after,patchReport,manifest]=validateInputFiles([beforePath,afterPath,patchPath,manifestPath].map(p=>fs.readFileSync(p)));
 requireThat(process.env.BACKEND_ROOT&&process.env.RUNNER_TEMP&&path.resolve(out).startsWith(path.resolve(process.env.RUNNER_TEMP)+path.sep),'RUNNER_OUTPUT_PATH_REQUIRED');
 let client;try{const {GoogleAuth}=require(path.resolve(process.env.BACKEND_ROOT,'functions/node_modules/google-auth-library'));client=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();}catch(_error){hold('EXISTING_RUNNER_AUTH_UNAVAILABLE');}
 const report=await readback({client,before,after,patchReport,manifest,persist:r=>fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{mode:0o600})});
 console.log(JSON.stringify({status:report.status,target:TARGET,remoteMutationRequests:0,operationResponseBindsCurrent:report.operationResponseBindsCurrent,finalEnvironmentSha256:report.finalEnvironmentSha256,finalRevision:report.finalRevision,sourceBytesProofRequired:true}));
}
module.exports={PROOF,OPERATION_URL,IAM_URL,REVISION_URL_PREFIX,validateInputs,validateInputFiles,functionEvidence,requireFunction,responseBinding,readback};
if(require.main===module)main().catch(error=>{console.error('INSURER_READER_POSTPATCH_READBACK_HOLD:'+(error.safeCode||'UNEXPECTED_INTERNAL_FAILURE'));process.exitCode=1;});
