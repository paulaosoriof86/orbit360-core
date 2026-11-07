'use strict';
// Read-only Cloud Functions v2 source provenance and deployed byte comparison.
// Never prints credentials, members, business data or archive contents.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {GoogleAuth}=require(path.join(process.env.GI_DEPS_DIR,'google-auth-library'));
const phase=process.argv[2],tmp=process.env.RUNNER_TEMP,project=process.env.PROJECT_ID;
if(!['before','after','rollback'].includes(phase)||project!=='ays-orbit-360-lab'||!tmp)throw Error('EXACT_PROJECT_AND_PHASE_REQUIRED');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const roster='orbit360AssignableAdvisorRoster',writer='orbit360ProductOperationalCommand';
const reader='orbit360ScopedPolicyRead';
const target=process.env.GI_TARGET_FUNCTION||roster;
if(![roster,writer,reader].includes(target))throw Error('ONLY_THREE_EXACT_B4003_BACKEND_TARGETS_ALLOWED');
const READER_FILES=['bootstrap.js','package.json','package-lock.json','b4-003-scoped-policy-callable.js','b4-003-scoped-bootstrap-reader.js','b4-003-scoped-access-boundary.js','b4-003-scoped-policy-reader.js','b4-003-scoped-related-reader.js','b4-003-client-country-authority.js','b4-003-client-country-list-projection.js'];
const READER_BOOTSTRAP_SUFFIX="\n// B4-003: stage reader exports; deploy only LIVE target.\nObject.assign(module.exports,require('./b4-003-scoped-policy-callable'));\n";
const sourceManifest=files=>sha(JSON.stringify(Object.keys(files).sort().map(file=>[file,files[file].sha256])));

async function source(client,name){
 const region=name===reader?'us-east1':'us-central1';
 const functionId=`projects/${project}/locations/${region}/functions/${name}`;
 const {data:meta}=await client.request({url:'https://cloudfunctions.googleapis.com/v2/'+functionId});
 if(meta.name!==functionId||meta.state!=='ACTIVE'||meta.environment!=='GEN_2'||meta.buildConfig?.entryPoint!==name)throw Error('LIVE_FUNCTION_IDENTITY_INVALID:'+name);
 const src=meta.buildConfig?.sourceProvenance?.resolvedStorageSource||meta.buildConfig?.source?.storageSource;
 if(!src?.bucket||!src?.object)throw Error('DEPLOYED_SOURCE_OBJECT_MISSING:'+name);
 const srcUrl='https://storage.googleapis.com/storage/v1/b/'+encodeURIComponent(src.bucket)+'/o/'+encodeURIComponent(src.object)+'?alt=media'+(src.generation?'&generation='+encodeURIComponent(src.generation):'');
 const {data}=await client.request({url:srcUrl,responseType:'arraybuffer'}),buffer=Buffer.from(data);
 if(buffer.byteLength<1000)throw Error('DEPLOYED_ARCHIVE_TOO_SMALL:'+name);
 const archive=path.join(tmp,'gi-b4003-'+phase+'-'+name+'.zip');fs.writeFileSync(archive,buffer);
 const names=execFileSync('unzip',['-Z1',archive],{encoding:'utf8'}).trim().split('\n');
 const readOne=file=>{
  const matches=names.filter(n=>n===file||n.endsWith('/'+file));
  if(matches.length!==1)throw Error('DEPLOYED_SOURCE_FILE_CARDINALITY:'+name+':'+file+':'+matches.length);
  return execFileSync('unzip',['-p',archive,matches[0]],{maxBuffer:10_000_000});
 };
 const file=name===roster?'assignable-advisor-roster.js':name===reader?'b4-003-scoped-bootstrap-reader.js':'product-operational-domain.js';
 const sourceBytes=readOne(file);
 const goalBytes=name===writer?readOne('goal-participation-contract.js'):null;
 const gitBlob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\u0000'),b])).digest('hex');
 const sourceFiles=name===reader?Object.fromEntries(READER_FILES.map(file=>{
  // An older deployed reader may predate a dependency. Record that absence;
  // after still requires the complete current source manifest byte for byte.
  if(!names.some(n=>n===file||n.endsWith('/'+file)))return[file,{sha256:null,gitBlobSha:null,bytes:0,present:false}];
  const bytes=readOne(file);return[file,{sha256:sha(bytes),gitBlobSha:gitBlob(bytes),bytes:bytes.length}];
 })):null;
 return {name,region,sourceFiles,sourceManifestSha256:sourceFiles?sourceManifest(sourceFiles):null,archive,archiveSha256:sha(buffer),sourceSha256:sha(sourceBytes),sourceGitBlobSha:gitBlob(sourceBytes),
  goalParticipationContractSha256:goalBytes?sha(goalBytes):null,
  goalParticipationContractGitBlobSha:goalBytes?gitBlob(goalBytes):null,
  generation:src.generation||null,sourceBucket:src.bucket,sourceObject:src.object,revision:meta.serviceConfig?.revision||null,updateTime:meta.updateTime||null,
  deployedCodeHash:meta.labels?.['firebase-functions-hash']||null,bytes:sourceBytes.length};
}
async function readerFlow(client){
 const deployed=await Promise.all([roster,writer,reader].map(name=>source(client,name)));
 const current=deployed[2];
 const expectedFiles=Object.fromEntries(READER_FILES.map(file=>{
  let bytes=fs.readFileSync('functions/'+file);
  if(file==='bootstrap.js'){
   if(bytes.toString('utf8').includes("require('./b4-003-scoped-policy-callable')"))throw Error('READER_SOURCE_BOOTSTRAP_ALREADY_BOUND');
   bytes=Buffer.concat([bytes,Buffer.from(READER_BOOTSTRAP_SUFFIX)]);
  }
  return[file,{sha256:sha(bytes)}];
 }));
 const expectedManifest=sourceManifest(expectedFiles);
 const result={phase,target:reader,observedAtUtc:new Date().toISOString(),project,region:'us-east1',
  functions:deployed.map(({archive,...rest})=>rest),
  expectedReaderSourceManifestSha256:expectedManifest,
  readerSourceManifestSha256:current.sourceManifestSha256,
  readerSourceMatchesCurrent:current.sourceManifestSha256===expectedManifest,
  readOnly:true,noAuthIamOrDataWrites:true,noHostingRulesWrites:true};
 const beforePath=path.join(tmp,'gi-b4003-live-sources-before.json');
 if(phase!=='before'){
  const before=JSON.parse(fs.readFileSync(beforePath,'utf8'));
  if(before.target!==reader||before.region!=='us-east1'||before.functions?.length!==3)throw Error('READER_BEFORE_IDENTITY_REQUIRED');
  for(let index=0;index<2;index++){
   const prior=before.functions[index],now=deployed[index];
   if(prior.name!==now.name||prior.sourceSha256!==now.sourceSha256||prior.goalParticipationContractSha256!==now.goalParticipationContractSha256||prior.revision!==now.revision)throw Error('NON_TARGET_PRODUCTION_FUNCTION_CHANGED');
  }
  const prior=before.functions[2];
  if(prior.name!==reader||prior.region!=='us-east1')throw Error('READER_BEFORE_REGION_REQUIRED');
  if(phase==='after'){
   if(!result.readerSourceMatchesCurrent)throw Error('DEPLOYED_READER_DEPENDENCY_BYTES_MISMATCH');
   if(prior.revision===current.revision)throw Error('TARGET_REVISION_DID_NOT_MOVE');
  }else if(prior.sourceManifestSha256!==current.sourceManifestSha256)throw Error('ROLLBACK_READER_DEPENDENCY_BYTES_NOT_RESTORED');
 }
 fs.writeFileSync(path.join(tmp,'gi-b4003-live-sources-'+phase+'.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({phase,status:'DEPLOYED_READER_SOURCE_BYTES_READBACK',region:'us-east1',readerSourceMatchesCurrent:result.readerSourceMatchesCurrent,readerSourceManifestSha256:result.readerSourceManifestSha256,expectedReaderSourceManifestSha256:expectedManifest,readerBootstrapGitBlob:current.sourceGitBlobSha}));
}
(async()=>{
 const client=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
 if(target===reader){await readerFlow(client);return;}
 const deployed=await Promise.all([roster,writer].map(n=>source(client,n)));
 const local={roster:sha(fs.readFileSync('functions/assignable-advisor-roster.js')),writer:sha(fs.readFileSync('functions/product-operational-domain.js')),goalParticipationContract:sha(fs.readFileSync('functions/goal-participation-contract.js'))};
 const result={phase,target,observedAtUtc:new Date().toISOString(),project,region:'us-central1',functions:deployed.map(({archive,...rest})=>rest),
  expectedCurrentCodeSha256:local,rosterSourceMatchesCurrent:deployed[0].sourceSha256===local.roster,writerSourceMatchesCurrent:deployed[1].sourceSha256===local.writer,
  writerGoalParticipationContractMatchesCurrent:deployed[1].goalParticipationContractSha256===local.goalParticipationContract,
  readOnly:true,noAuthIamOrDataWrites:true,noHostingRulesWrites:true};
 const beforePath=path.join(tmp,'gi-b4003-live-sources-before.json');
 if(phase!=='before'){
  const before=JSON.parse(fs.readFileSync(beforePath,'utf8'));
  const changed=target===roster?0:1,untouched=1-changed;
  if(before.functions[untouched].sourceSha256!==deployed[untouched].sourceSha256||before.functions[untouched].revision!==deployed[untouched].revision)throw Error('NON_TARGET_PRODUCTION_FUNCTION_CHANGED');
  if(phase==='after'){
   if(changed===0&&!result.rosterSourceMatchesCurrent||changed===1&&(!result.writerSourceMatchesCurrent||!result.writerGoalParticipationContractMatchesCurrent))throw Error('DEPLOYED_TARGET_AND_GOAL_CONTRACT_BYTES_MISMATCH');
   if(before.functions[changed].revision===deployed[changed].revision)throw Error('TARGET_REVISION_DID_NOT_MOVE');
  } else if(before.functions[changed].sourceSha256!==deployed[changed].sourceSha256||before.functions[changed].goalParticipationContractSha256!==deployed[changed].goalParticipationContractSha256)throw Error('ROLLBACK_TARGET_SOURCE_OR_GOAL_CONTRACT_NOT_RESTORED');
 }
 const output=path.join(tmp,'gi-b4003-live-sources-'+phase+'.json');fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({phase,status:'DEPLOYED_BACKEND_SOURCE_BYTES_READBACK',rosterSourceMatchesCurrent:result.rosterSourceMatchesCurrent,writerSourceMatchesCurrent:result.writerSourceMatchesCurrent,writerGoalParticipationContractMatchesCurrent:result.writerGoalParticipationContractMatchesCurrent,rosterGitBlob:deployed[0].sourceGitBlobSha,writerGitBlob:deployed[1].sourceGitBlobSha,goalContractGitBlob:deployed[1].goalParticipationContractGitBlobSha}));
})().catch(e=>{console.error('B4_003_BACKEND_SOURCE_READBACK_HOLD:'+String(e.message||e));process.exitCode=41;});

