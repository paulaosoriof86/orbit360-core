'use strict';
// One existing LAB reader only. No source deployment, IAM/Auth/Rules change,
// Secret Manager call, function invocation or business-data operation.
// Run 41152465200 stopped before PATCH without recording the returned revision
// identity. A short Revision.service is an interoperability hypothesis, not a
// diagnosed runtime cause; the next read records bounded identity diagnostics.
// Primary API contracts:
// https://docs.cloud.google.com/functions/docs/reference/rest/v2/projects.locations.functions/patch
// https://docs.cloud.google.com/run/docs/reference/rest/v2/projects.locations.services.revisions/get
// https://docs.cloud.google.com/functions/docs/reference/rest/v2/projects.locations.operations/get
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PROJECT='ays-orbit-360-lab',REGION='us-east1',TARGET='orbit360ScopedPolicyReadPreview';
const NAME=`projects/${PROJECT}/locations/${REGION}/functions/${TARGET}`;
const SERVICE=`projects/${PROJECT}/locations/${REGION}/services/orbit360scopedpolicyreadpreview`;
const SERVICE_SHORT_NAME='orbit360scopedpolicyreadpreview';
const FUNCTION_URL='https://cloudfunctions.googleapis.com/v2/'+NAME;
const MASK='serviceConfig.environmentVariables';
const PIN=Object.freeze({
 beforeFileSha256:'d2867dec1adc78290de19bcfb541e7cff3bd6d9e03bc16bab4c85aa9d830b2f3',
 afterFileSha256:'3c2f7839fed90ec11846750aef00a08415b7df7ab41a2d96798e9d10164827f4',
 previousRevision:'orbit360scopedpolicyreadpreview-00066-rur',deployedRevision:'orbit360scopedpolicyreadpreview-00067-pib',
 previousEnvSha256:'1e10a234c2e389484714e5f55f394f0ec816d146180dbcee1e34dfae4cce069b',
 deployedEnvSha256:'36ca53029bfbf51b6b7053a22426acc64622dcc4b3bdb1b72b50620b2d9641e6',
 previousServiceSha256:'9cf40283fe806e06350ae094bca9c4e3611311ee098589ab5aed8ffffe6019fc',
 deployedServiceSha256:'20bb4aba5674f0d09cba92a30f6d8708e702eafbc6e693921419ca57b16164e9',
 codeHash:'dc40ebe72b3ea545313ff3771b9d6dae71b11c5b',
 build:'projects/646761409743/locations/us-east1/builds/dfc20065-31dd-4dd7-a80f-54fac47bb9d9',
 sourceStorage:{bucket:'gcf-v2-sources-646761409743-us-east1',object:'orbit360ScopedPolicyReadPreview/function-source.zip',generation:'1793406873066093'},
 iamSha256:'b9a6087bad291d0bb96d7e1784d459b1521d258707c63f93933d3148c60391cb'
});
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const hash=x=>crypto.createHash('sha256').update(Buffer.isBuffer(x)?x:typeof x==='string'?x:JSON.stringify(stable(x))).digest('hex');
const same=(a,b)=>hash(a)===hash(b);
const hold=code=>{const error=new Error(code);error.safeCode=code;throw error;};
const requireThat=(condition,code)=>{if(!condition)hold(code);};
const svcHash=f=>hash(Object.fromEntries(Object.entries(f.serviceConfig||{}).filter(([key])=>key!=='revision')));
const sourceStorage=f=>f.buildConfig?.sourceProvenance?.resolvedStorageSource||f.buildConfig?.source?.storageSource||null;
const iamHash=p=>hash({version:p.version||0,bindings:(p.bindings||[]).map(b=>({...b,members:(b.members||[]).slice().sort()})).sort((a,b)=>JSON.stringify(stable(a)).localeCompare(JSON.stringify(stable(b))))});
function strictMap(value){
 requireThat(value&&typeof value==='object'&&!Array.isArray(value),'ENV_MAP_INVALID');
 const entries=Object.entries(value);requireThat(entries.length<=128,'ENV_MAP_BOUND_EXCEEDED');
 for(const [name,v]of entries)requireThat(/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(name)&&!['__proto__','constructor','prototype'].includes(name)&&typeof v==='string','ENV_MAP_ENTRY_INVALID');
 return Object.fromEntries(entries);
}
function validateSnapshots(before,after,pin=PIN){
 requireThat(before?.phase==='before'&&after?.phase==='after','SNAPSHOT_PHASE_MISMATCH');
 const select=s=>{const rows=(s.targets||[]).filter(x=>x.target===TARGET);requireThat(rows.length===1,'SNAPSHOT_TARGET_CARDINALITY');return rows[0];};
 const b=select(before),a=select(after);
 for(const target of [b,a])requireThat(target.identity?.name===NAME&&target.identity.service===SERVICE&&target.identity.entryPoint===TARGET&&target.identity.runtime==='nodejs22'&&target.identity.environment==='GEN_2'&&target.identity.state==='ACTIVE','SNAPSHOT_IDENTITY_MISMATCH');
 requireThat(b.identity.revision===pin.previousRevision&&a.identity.revision===pin.deployedRevision,'SNAPSHOT_REVISION_MISMATCH');
 requireThat(b.identity.environmentVariablesSha256===pin.previousEnvSha256&&a.identity.environmentVariablesSha256===pin.deployedEnvSha256,'SNAPSHOT_ENV_HASH_MISMATCH');
 requireThat(b.identity.serviceConfigNonRevisionSha256===pin.previousServiceSha256&&a.identity.serviceConfigNonRevisionSha256===pin.deployedServiceSha256,'SNAPSHOT_SERVICE_HASH_MISMATCH');
 requireThat(a.identity.codeHash===pin.codeHash&&a.identity.build===pin.build&&same(a.identity.sourceStorage,pin.sourceStorage),'SNAPSHOT_NEW_SOURCE_MISMATCH');
 requireThat(b.iam?.status==='READ'&&a.iam?.status==='READ'&&b.iam.policySha256===pin.iamSha256&&a.iam.policySha256===pin.iamSha256,'SNAPSHOT_IAM_MISMATCH');
 for(const field of ['serviceAccountEmail','ingressSettings','secretEnvironmentVariablesSha256','service','uri'])requireThat(b.identity[field]===a.identity[field],'SNAPSHOT_SECOND_CONFIGURATION_DRIFT');
 return {before:b,after:a};
}
function validateFunction(f,pair,pin=PIN){
 const expected=pair.after.identity,svc=f.serviceConfig||{},build=f.buildConfig||{};
 requireThat(f.name===NAME&&f.environment==='GEN_2'&&build.entryPoint===TARGET&&build.runtime==='nodejs22'&&svc.service===SERVICE,'CURRENT_FUNCTION_IDENTITY_MISMATCH');
 requireThat(f.labels?.['firebase-functions-hash']===pin.codeHash&&build.build===pin.build&&same(sourceStorage(f),pin.sourceStorage),'CURRENT_FUNCTION_SOURCE_CHANGED');
 requireThat(same(f.labels||{},expected.labels||{}),'CURRENT_FUNCTION_LABELS_CHANGED');
 for(const field of ['serviceAccountEmail','ingressSettings','uri'])requireThat((svc[field]||null)===expected[field],'CURRENT_FUNCTION_OTHER_CONFIGURATION_CHANGED');
 requireThat(hash(svc.secretEnvironmentVariables||[])===expected.secretEnvironmentVariablesSha256,'CURRENT_SECRET_REFERENCES_CHANGED');
 strictMap(svc.environmentVariables||{});
}
function identityField(value){
 const type=value===null?'null':Array.isArray(value)?'array':typeof value;
 if(type!=='string')return {type,present:value!==undefined};
 const diagnostic={type,length:value.length,sha256:hash(value)};
 // Only resource-name-shaped strings may leave memory. Malformed responses,
 // arbitrary error text and objects are represented by type/length/digest only.
 const resource=/^projects\/[a-z0-9-]{1,63}\/locations\/[a-z0-9-]{1,63}\/services\/[a-z0-9-]{1,63}(?:\/revisions\/[a-z0-9-]{1,63})?$/;
 if(resource.test(value)){diagnostic.format='RESOURCE_NAME';diagnostic.value=value;}
 else if(/^[a-z][a-z0-9-]{0,62}$/.test(value)){diagnostic.format='SHORT_NAME';diagnostic.value=value;}
 else diagnostic.format='UNRECOGNIZED_REDACTED';
 return diagnostic;
}
function revisionIdentity(revision,shortName){
 // The GET URI and returned Revision.name retain the complete pinned resource
 // identity. Only its already-known project-number alias is normalized.
 const canonical=value=>typeof value==='string'?value.replace(/^projects\/646761409743\//,'projects/'+PROJECT+'/'):value;
 const requestedResourceName=SERVICE+'/revisions/'+shortName;
 return {requestedResourceName,expectedServiceResourceName:SERVICE,expectedServiceShortName:SERVICE_SHORT_NAME,
  observedName:identityField(revision?.name),observedService:identityField(revision?.service),
  nameMatchesExactResource:canonical(revision?.name)===requestedResourceName,
  serviceMatchesExactResource:canonical(revision?.service)===SERVICE,
  serviceMatchesExactShortName:revision?.service===SERVICE_SHORT_NAME,
  deleteTimePresent:revision?.deleteTime!==undefined,deleteTimePopulated:Boolean(revision?.deleteTime)};
}
function revisionData(revision,shortName,recordIdentity=()=>{}){
 requireThat(/^orbit360scopedpolicyreadpreview-[a-z0-9-]+$/.test(shortName),'REVISION_NAME_INVALID');
 const identity=revisionIdentity(revision,shortName);recordIdentity(identity);
 // Revision.service is the parent service name. Accept its exact short name as
 // well as the full resource name, but never relax the complete Revision.name.
 requireThat(identity.nameMatchesExactResource&&(identity.serviceMatchesExactResource||identity.serviceMatchesExactShortName)&&!identity.deleteTimePopulated,'REVISION_IDENTITY_MISMATCH');
 requireThat(Array.isArray(revision.containers)&&revision.containers.length===1,'REVISION_CONTAINER_CARDINALITY');
 const container=revision.containers[0],entries=container.env||[],names=new Set(),map={};
 requireThat(Array.isArray(entries)&&entries.length<=128&&typeof container.image==='string'&&container.image.length>0,'REVISION_CONTAINER_INVALID');
 for(const row of entries){
  requireThat(row&&/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(row.name)&&!['__proto__','constructor','prototype'].includes(row.name)&&!names.has(row.name),'REVISION_ENV_NAME_INVALID_OR_DUPLICATE');
  names.add(row.name);
  // Both pinned snapshots declare zero secret env references. Do not resolve
  // secret sources or guess how to transform them into literal values.
  requireThat(row.valueSource===undefined,'REVISION_SECRET_SOURCE_UNEXPECTED');
  requireThat(row.value===undefined||typeof row.value==='string','REVISION_ENV_VALUE_INVALID');
  map[row.name]=row.value===undefined?'':row.value;
 }
 return {map:strictMap(map),image:container.image,name:revision.name};
}
function reconstruct(oldMap,deployedRevisionMap,currentFunctionMap,expectedHash){
 oldMap=strictMap(oldMap);deployedRevisionMap=strictMap(deployedRevisionMap);currentFunctionMap=strictMap(currentFunctionMap);
 for(const [name,value]of Object.entries(currentFunctionMap))requireThat(Object.hasOwn(deployedRevisionMap,name)&&deployedRevisionMap[name]===value,'CURRENT_REVISION_FUNCTION_ENV_MISMATCH');
 const platformNames=Object.keys(deployedRevisionMap).filter(k=>!Object.hasOwn(currentFunctionMap,k));
 // Candidates use values from the immutable old revision only. No value is
 // inferred, synthesized, trimmed, JSON-reformatted or copied from another service.
 const candidates=[
  ['OLD_MINUS_PROVEN_CURRENT_PLATFORM_NAMES',Object.fromEntries(Object.entries(oldMap).filter(([k])=>!platformNames.includes(k)))],
  ['OLD_CURRENT_FUNCTION_NAMES_ONLY',Object.fromEntries(Object.entries(oldMap).filter(([k])=>Object.hasOwn(currentFunctionMap,k)))],
  ['OLD_COMPLETE_LITERAL_MAP',oldMap]
 ];
 const matches=candidates.filter(([,map])=>hash(map)===expectedHash);
 requireThat(matches.length>0,'PREVIOUS_ENV_MAP_NOT_HASH_PROVEN');
 requireThat(matches.every(([,map])=>same(map,matches[0][1])),'PREVIOUS_ENV_MAP_AMBIGUOUS');
 return {map:matches[0][1],method:matches.map(([name])=>name),platformNames:platformNames.sort(),candidateHashes:candidates.map(([method,map])=>({method,sha256:hash(map),names:Object.keys(map).sort()}))};
}
function changes(before,after){
 return [...new Set([...Object.keys(before),...Object.keys(after)])].sort().filter(k=>!Object.hasOwn(before,k)||!Object.hasOwn(after,k)||before[k]!==after[k]).map(name=>({name,beforeSha256:Object.hasOwn(before,name)?hash(before[name]):null,afterSha256:Object.hasOwn(after,name)?hash(after[name]):null}));
}
async function repair({client,before,after,pin=PIN,persist=()=>{},wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),maxPolls=90}){
 const report={schema:'gravicentra-insurer-reader-env-restoration-v1',status:'HOLD',target:TARGET,project:PROJECT,region:REGION,sourceRunId:41150545623,startedAt:new Date().toISOString(),patchAttempted:false,patchRequests:0,updateMask:MASK,envValuesExported:false,literalEnvironmentValuesUsedInMemory:true,secretManagerValuesRead:false,secretEnvironmentSourcesResolved:false,sourceRedeployed:false,iamMutated:false,authMutated:false,rulesMutated:false,businessDataMutated:false};
 const save=()=>persist(JSON.parse(JSON.stringify(report)));
 const get=async(url,code)=>{try{return(await client.request({url,method:'GET',timeout:45000,retry:false})).data;}catch(error){hold(code+'_HTTP_'+Number(error.response?.status||0));}};
 const getFunction=()=>get(FUNCTION_URL,'FUNCTION_READ_FAILED');
 const getPolicy=()=>get('https://run.googleapis.com/v2/'+SERVICE+':getIamPolicy','IAM_READ_FAILED');
 const getRevision=shortName=>get('https://run.googleapis.com/v2/'+SERVICE+'/revisions/'+shortName,'REVISION_READ_FAILED');
 const readRevision=async(shortName,stage)=>revisionData(await getRevision(shortName),shortName,identity=>{(report.revisionIdentityReads||=[]).push({stage,...identity});save();});
 try{
  const pair=validateSnapshots(before,after,pin);
  let current=await getFunction();validateFunction(current,pair,pin);
  requireThat(current.state==='ACTIVE','CURRENT_FUNCTION_NOT_ACTIVE');
  const policyBefore=await getPolicy();requireThat(iamHash(policyBefore)===pin.iamSha256,'CURRENT_IAM_CHANGED');
  const oldRevision=await readRevision(pin.previousRevision,'PREVIOUS_BASELINE');
  const deployedRevision=await readRevision(pin.deployedRevision,'DEPLOYED_SOURCE');
  report.previousRevision=pin.previousRevision;report.deployedRevision=pin.deployedRevision;report.observedRevision=current.serviceConfig.revision;
  report.previousRevisionEnvironmentNames=Object.keys(oldRevision.map).sort();report.deployedRevisionEnvironmentNames=Object.keys(deployedRevision.map).sort();
  report.revisionEnvironmentChanges=changes(oldRevision.map,deployedRevision.map);
  report.currentEnvironmentSha256=hash(current.serviceConfig.environmentVariables||{});
  report.currentServiceConfigNonRevisionSha256=svcHash(current);report.newCodeHash=pin.codeHash;report.newSourceStorage=pin.sourceStorage;report.newBuild=pin.build;
  // A repeated run may only observe restoration already completed. It does not
  // issue another PATCH or require the pre-restoration revision to be current.
  if(report.currentEnvironmentSha256===pin.previousEnvSha256){
   requireThat(svcHash(current)===pin.previousServiceSha256,'ALREADY_RESTORED_OTHER_CONFIG_CHANGED');
   const active=await readRevision(current.serviceConfig.revision,'ALREADY_RESTORED');
   requireThat(active.image===deployedRevision.image,'ALREADY_RESTORED_IMAGE_CHANGED');
   for(const [key,value]of Object.entries(current.serviceConfig.environmentVariables||{}))requireThat(active.map[key]===value,'ALREADY_RESTORED_REVISION_ENV_MISMATCH');
   report.status='BASELINE_ENV_ALREADY_RESTORED_NOOP';report.finalRevision=current.serviceConfig.revision;report.finalEnvironmentSha256=pin.previousEnvSha256;report.finalServiceConfigNonRevisionSha256=svcHash(current);report.iamUnchanged=true;report.sourcePreserved=true;report.containerImageUnchanged=true;report.finishedAt=new Date().toISOString();save();return report;
  }
  requireThat(report.currentEnvironmentSha256===pin.deployedEnvSha256&&svcHash(current)===pin.deployedServiceSha256&&current.serviceConfig.revision===pin.deployedRevision,'CURRENT_ENV_OR_REVISION_DRIFT');
  const reconstructed=reconstruct(oldRevision.map,deployedRevision.map,current.serviceConfig.environmentVariables||{},pin.previousEnvSha256);
  report.reconstruction={methods:reconstructed.method,platformNames:reconstructed.platformNames,candidateHashes:reconstructed.candidateHashes,verifiedEnvironmentSha256:hash(reconstructed.map)};
  report.functionEnvironmentChanges=changes(reconstructed.map,current.serviceConfig.environmentVariables||{});
  const projected={...current,serviceConfig:{...current.serviceConfig,environmentVariables:reconstructed.map}};
  requireThat(svcHash(projected)===pin.previousServiceSha256,'RESTORED_FULL_SERVICE_CONFIG_NOT_BASELINE');
  report.projectedServiceConfigNonRevisionSha256=svcHash(projected);save();
  // Re-read immediately before the mutation. No stale read or changed IAM/source
  // is silently accepted. The API has no function etag precondition field.
  const fresh=await getFunction();validateFunction(fresh,pair,pin);
  requireThat(hash(fresh)===hash(current)&&fresh.state==='ACTIVE','FUNCTION_CHANGED_DURING_PREFLIGHT');
  requireThat(iamHash(await getPolicy())===pin.iamSha256,'IAM_CHANGED_DURING_PREFLIGHT');
  const originalBuildHash=hash(current.buildConfig),originalLabelsHash=hash(current.labels||{});
  const body={name:NAME,serviceConfig:{environmentVariables:reconstructed.map}};
  let operation=null,responseLost=false;
  report.patchAttempted=true;report.patchRequests=1;report.status='PATCH_SUBMITTED_READBACK_PENDING';save();
  try{
   operation=(await client.request({url:FUNCTION_URL+'?updateMask='+MASK,method:'PATCH',data:body,timeout:45000,retry:false,retryConfig:{retry:0}})).data;
  }catch(error){responseLost=true;report.patchResponseLost=true;report.patchHttpStatus=Number(error.response?.status||0);report.patchDefinitivelyRejected=report.patchHttpStatus>=400&&report.patchHttpStatus<500&&![408,429].includes(report.patchHttpStatus);save();}
  if(operation){
   requireThat(typeof operation.name==='string'&&new RegExp('^projects/(?:'+PROJECT+'|646761409743)/locations/'+REGION+'/operations/[A-Za-z0-9_-]+$').test(operation.name),'OPERATION_NAME_OUT_OF_SCOPE');
   report.operationName=operation.name;
  }
  let complete=false;
  for(let n=0;n<maxPolls;n++){
   report.pollCount=n+1;
   if(operation&&!operation.done){operation=await get('https://cloudfunctions.googleapis.com/v2/'+report.operationName,'OPERATION_READ_FAILED');requireThat(operation.name===report.operationName,'OPERATION_IDENTITY_CHANGED');}
   if(operation?.done&&operation.error){report.operationErrorCode=Number(operation.error.code||0);hold('RESTORE_OPERATION_FAILED');}
   current=await getFunction();validateFunction(current,pair,pin);
   if(current.state==='ACTIVE'&&hash(current.serviceConfig.environmentVariables||{})===pin.previousEnvSha256&&(!operation||operation.done===true)){
    requireThat(svcHash(current)===pin.previousServiceSha256,'RESTORED_SERVICE_CONFIG_MISMATCH');
    requireThat(hash(current.buildConfig)===originalBuildHash&&hash(current.labels||{})===originalLabelsHash,'RESTORE_CHANGED_BACKEND_BUILD_OR_LABELS');
    complete=true;break;
   }
   if(current.state==='ACTIVE'&&hash(current.serviceConfig.environmentVariables||{})!==pin.deployedEnvSha256&&hash(current.serviceConfig.environmentVariables||{})!==pin.previousEnvSha256)hold('UNEXPECTED_ENV_DURING_RESTORE');
   if(report.patchDefinitivelyRejected&&current.state==='ACTIVE')hold('PATCH_REJECTED_HTTP_'+report.patchHttpStatus);
   if(n+1<maxPolls)await wait(10000);
  }
  requireThat(complete,responseLost?'PATCH_RESPONSE_LOST_RESTORATION_NOT_PROVEN':'RESTORATION_READBACK_TIMEOUT');
  const finalRevision=await readRevision(current.serviceConfig.revision,'FINAL_READBACK');
  requireThat(finalRevision.image===deployedRevision.image,'RESTORATION_CONTAINER_IMAGE_CHANGED');
  for(const [key,value]of Object.entries(reconstructed.map))requireThat(finalRevision.map[key]===value,'RESTORATION_REVISION_ENV_MISMATCH');
  requireThat(iamHash(await getPolicy())===pin.iamSha256,'RESTORATION_IAM_CHANGED');
  report.status=responseLost?'BASELINE_ENV_RESTORED_RESPONSE_LOST_READBACK_PASS':'BASELINE_ENV_RESTORED_EXACT_READBACK_PASS';report.finalRevision=current.serviceConfig.revision;report.finalEnvironmentSha256=hash(current.serviceConfig.environmentVariables||{});report.finalServiceConfigNonRevisionSha256=svcHash(current);report.iamUnchanged=true;report.sourcePreserved=true;report.containerImageUnchanged=true;report.finishedAt=new Date().toISOString();save();return report;
 }catch(error){report.status='HOLD';report.failureCode=error.safeCode||'UNEXPECTED_INTERNAL_FAILURE';report.finishedAt=new Date().toISOString();save();const safe=new Error(report.failureCode);safe.safeCode=report.failureCode;throw safe;}
}
async function main(){
 requireThat(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='paulaosoriof86/orbit360-core'&&process.env.GITHUB_REF_NAME==='recovery/fase-a-clean-20260831','EXISTING_CANONICAL_RUNNER_REQUIRED');
 requireThat(process.env.PROJECT_ID===PROJECT&&process.env.TARGET_REGION===REGION&&process.env.GI_READER_ENV_REPAIR_AUTHORIZATION==='RESTORE_PROVEN_BASELINE_ENV_ONLY','EXACT_RESTORATION_AUTHORITY_REQUIRED');
 const [beforePath,afterPath,out]=process.argv.slice(2);requireThat(beforePath&&afterPath&&out,'THREE_PATH_ARGUMENTS_REQUIRED');
 const bb=fs.readFileSync(beforePath),ab=fs.readFileSync(afterPath);requireThat(hash(bb)===PIN.beforeFileSha256&&hash(ab)===PIN.afterFileSha256,'IMMUTABLE_SNAPSHOT_FILE_DIGEST_MISMATCH');
 const before=JSON.parse(bb),after=JSON.parse(ab);validateSnapshots(before,after);
 requireThat(process.env.BACKEND_ROOT&&process.env.RUNNER_TEMP&&path.resolve(out).startsWith(path.resolve(process.env.RUNNER_TEMP)+path.sep),'RUNNER_OUTPUT_PATH_REQUIRED');
 let client;try{const {GoogleAuth}=require(path.resolve(process.env.BACKEND_ROOT,'functions/node_modules/google-auth-library'));client=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();}catch(_error){hold('EXISTING_RUNNER_AUTH_UNAVAILABLE');}
 const report=await repair({client,before,after,persist:r=>fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{mode:0o600})});
 console.log(JSON.stringify({status:report.status,target:TARGET,patchRequests:report.patchRequests,finalEnvironmentSha256:report.finalEnvironmentSha256,finalRevision:report.finalRevision,valuesExported:false}));
}
module.exports={PIN,PROJECT,REGION,TARGET,NAME,SERVICE,SERVICE_SHORT_NAME,FUNCTION_URL,MASK,stable,hash,svcHash,iamHash,strictMap,validateSnapshots,validateFunction,identityField,revisionIdentity,revisionData,reconstruct,repair};
if(require.main===module)main().catch(error=>{console.error('INSURER_READER_ENV_REPAIR_HOLD:'+(error.safeCode||'UNEXPECTED_INTERNAL_FAILURE'));process.exitCode=1;});
