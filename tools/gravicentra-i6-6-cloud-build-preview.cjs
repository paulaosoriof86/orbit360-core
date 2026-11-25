'use strict';
// Provider adapter for the next EXISTING I6.6 gate. This executor only replaces
// the authorized current Hosting Preview from an already retained package.
// It never builds a package, creates/deletes a channel, deploys a function,
// touches LIVE, or claims signed functional acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync,spawnSync}=require('node:child_process');
const crypto=require('node:crypto');
const pkg=require('./gravicentra-i6-6-cloud-build-package.cjs');
const reuse=require('./gravicentra-i6-6-preview-channel-reuse-guard.cjs').technicalRollover;
const readback=require('./gravicentra-i6-6-preview-package-readback.cjs');
const C=Object.freeze({...pkg.C,
  tool:'tools/gravicentra-i6-6-cloud-build-preview.cjs',test:'tools/gravicentra-i6-6-cloud-build-preview.test.cjs',
  readback:'tools/gravicentra-i6-6-preview-package-readback.cjs',readbackTest:'tools/gravicentra-i6-6-preview-package-readback.test.cjs',
  reuse:'tools/gravicentra-i6-6-preview-channel-reuse-guard.cjs',
  rollover:'artifacts/orbit360-recovery/release-control/I6_6_CURRENT_PHYSICAL_PREVIEW_V34_ROLLOVER_V7_20261125.json',
  rolloverSha256:'a9f70d459a6152aaae60cec0683818956a39c564acbcd76efc40e2f76a013bf7',
  inventorySha256:'719b9d677c0973ed237c3b2318ca1a7819bf01e86edd82182e5e608b5b5c1f75',
  stepId:'i66-existing-preview-exact-artifact',scope:'EXISTING_HOSTING_PREVIEW_ONLY_SIGNED_QA_AND_LIVE_PENDING',
  planSchema:'GI_I66_CLOUD_BUILD_EXISTING_PREVIEW_PLAN_V1',proofSchema:'GI_I66_CLOUD_BUILD_EXISTING_PREVIEW_PROOF_V1',
  receiptSchema:'GI_I66_CLOUD_BUILD_EXISTING_PREVIEW_RECEIPT_V1',
  mode:'EXPLICIT_EXISTING_CHANNEL_CONTINUATION_NO_NEW_CHANNEL_ATTEMPT',
  channel:'gi-i66-rc-45518809761',origin:'https://ays-orbit-360-lab--gi-i66-rc-45518809761-eiytd3a3.web.app'
});
const F=Object.freeze({proof:'gi-i66-cloud-preview-proof.json',before:'gi-i66-cloud-preview-before.json',
  after:'gi-i66-cloud-preview-after.json',readback:'gi-i66-preview-package-readback.json',
  evidence:'gi-i66-cloud-preview-private-evidence.tar.gz',mechanism:'gi-i66-cloud-preview-mechanism.log',
  deploy:'gi-i66-cloud-preview-deploy.log'});
const IMPORTS=Object.freeze({
  preview:{artifactId:14987684993,runId:45539669479,attempt:1,bytes:1852215,sha256:'08706bc64a5ca578fcf3fb305354adc1ba8a55347421f4226406f5092c3f46a0'},
  live:{artifactId:14873426438,runId:45287432665,attempt:2,bytes:1824240,sha256:'7cb782848a45083047c4899bc30c13bf5be46429607e42597d09342becfc9acc'},
  inventory:{artifactId:14992575452,runId:45454934099,attempt:6,bytes:6865,sha256:'6666fffe8223bdf7d90341c487bf9eeca2b614937b7e893c4d888bc81a5c36bb'}
});
const {sha,blob,digest}=pkg;
const equal=(a,b,c)=>assert.deepEqual(a,b,'I66_CLOUD_PREVIEW_'+c);
const need=(v,c)=>assert.ok(v,'I66_CLOUD_PREVIEW_'+c);
const uuid=v=>/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v||'');
const sha40=v=>/^[a-f0-9]{40}$/.test(v||''),sha64=v=>/^[a-f0-9]{64}$/.test(v||'');
const generation=v=>typeof v==='string'&&/^[1-9][0-9]{0,24}$/.test(v);
const write=(p,v)=>fs.writeFileSync(p,Buffer.isBuffer(v)||typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx',mode:0o600});
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(cwd,...a)=>execFileSync('git',a,{cwd,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const gitBytes=(cwd,ref,p)=>execFileSync('git',['show',ref+':'+p],{cwd,maxBuffer:64*1024*1024});
const productRoots=['orbit360-platform','functions','firebase.json','firestore.rules','storage.rules','database.rules.json',pkg.C.builder,':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json'];
const pins=()=>[C.tool,C.test,C.readback,C.readbackTest,C.reuse,pkg.C.tool,pkg.C.test];
function objectRef(ref){
  equal(Object.keys(ref||{}).sort(),['uri','generation','sha256','bytes'].sort(),'OBJECT_REF_KEYS');
  const prefix='gs://'+C.bucket+'/i66/';
  need(typeof ref.uri==='string'&&ref.uri.startsWith(prefix),'PRIVATE_BUCKET_OBJECT');
  need(/^[A-Za-z0-9_./-]+$/.test(ref.uri.slice(prefix.length))&&!ref.uri.slice(prefix.length).split('/').some(x=>!x||x==='.'||x==='..'),'OBJECT_NAME');
  need(generation(ref.generation)&&sha64(ref.sha256)&&Number.isSafeInteger(ref.bytes)&&ref.bytes>0&&ref.bytes<64*1024*1024,'OBJECT_GENERATION_HASH_SIZE');
  return ref;
}
function artifactIdentity(sourceSha,buildId,artifactId,artifactDigest){
  need(sha40(sourceSha)&&uuid(buildId),'CLOUD_ARTIFACT_SOURCE_UUID');
  const prefix='gs://'+C.bucket+'/i66/packages/request-';
  need(typeof artifactId==='string'&&artifactId.startsWith(prefix),'CLOUD_ARTIFACT_BUCKET');
  const tail=artifactId.slice(prefix.length),match=/^([1-9][0-9]*)\/([a-f0-9]{40})\/([a-f0-9-]{36})\/gi-i66-exact-package\.tar\.gz#([1-9][0-9]{0,24})$/.exec(tail);
  need(match&&Number.isSafeInteger(Number(match[1]))&&match[2]===sourceSha&&match[3]===buildId,'CLOUD_ARTIFACT_EXACT_IDENTITY');
  need(/^sha256:[a-f0-9]{64}$/.test(artifactDigest||''),'CLOUD_ARTIFACT_DIGEST');
  return {provider:C.provider,sourceSha,buildId,uri:artifactId.split('#')[0],generation:match[4],sha256:artifactDigest.slice(7),requestVersion:Number(match[1])};
}
function validatePlan(p){
  equal(p.schema,C.planSchema,'PLAN_SCHEMA');equal(p.provider,C.provider,'PROVIDER');equal(p.scope,C.scope,'SCOPE');equal(p.mode,C.mode,'EXISTING_CHANNEL_MODE');
  equal([p.repository,p.branch,p.projectId,p.projectNumber,p.region,p.serviceAccount,p.bucket],[C.repository,C.branch,C.projectId,C.projectNumber,C.region,C.serviceAccount,C.bucket],'EXECUTION_BOUNDARY');
  pkg.validatePlan(p.packagePlan);need(uuid(p.packageBuildId)&&sha40(p.mechanismSha),'EXACT_EXECUTION_SOURCE');
  equal(p.sourceSha,p.packagePlan.sourceSha,'SOURCE');equal(p.requestVersion,p.packagePlan.requestVersion,'REQUEST');
  equal(p.requestVersion,35,'CURRENT_AUTHORIZED_REQUEST');
  equal(p.rollover,{path:C.rollover,sha256:C.rolloverSha256,channelId:C.channel,origin:C.origin},'CURRENT_ROLLOVER');
  objectRef(p.packageArtifact);
  equal(artifactIdentity(p.sourceSha,p.packageBuildId,p.packageArtifact.uri+'#'+p.packageArtifact.generation,'sha256:'+p.packageArtifact.sha256).requestVersion,p.requestVersion,'PACKAGE_ARTIFACT_REQUEST');
  equal(Object.keys(p.imports||{}).sort(),Object.keys(IMPORTS).sort(),'THREE_HISTORICAL_BACKUPS');
  for(const [name,expected] of Object.entries(IMPORTS)){objectRef(p.imports[name]);equal([p.imports[name].sha256,p.imports[name].bytes],[expected.sha256,expected.bytes],'EXACT_IMPORT_'+name);}
  equal(Object.keys(p.pins||{}).sort(),pins().sort(),'EXACT_MECHANISM_PINS');
  for(const pin of Object.values(p.pins)){equal(Object.keys(pin).sort(),['blob','sha256'],'PIN_KEYS');need(sha40(pin.blob)&&sha64(pin.sha256),'PIN_HASH');}
  equal(p.constraints,{builds:0,newChannels:0,deletedChannels:0,liveWrites:0,backendWrites:0,businessWrites:0,authRulesIamWrites:0,signedFunctionalPass:false,productionAccepted:false},'NO_SCOPE_EXPANSION');
  equal(Object.keys(p).sort(),['schema','provider','scope','mode','repository','branch','projectId','projectNumber','region','serviceAccount','bucket','mechanismSha','sourceSha','requestVersion','packagePlan','packageBuildId','packageArtifact','rollover','imports','pins','constraints'].sort(),'UNKNOWN_PLAN_FIELD');
  return p;
}
function prefix(p,id){need(uuid(id)||id==='$BUILD_ID','EXECUTION_UUID');return 'i66/preview/request-'+p.requestVersion+'/'+p.sourceSha+'/'+id+'/';}
function lockName(p){return 'i66/preview-locks/request-'+p.requestVersion+'-'+p.sourceSha+'-'+p.packageArtifact.sha256+'.json';}
function configFor(p){
  validatePlan(p);
  return {steps:[{id:C.stepId,name:C.image,entrypoint:'node',args:[C.tool,'worker',JSON.stringify(p)],
    env:['GRAVICENTRA_BUILD_PROVIDER=$_I66_PROVIDER','GRAVICENTRA_CLOUD_BUILD_ID=$BUILD_ID','GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT='+C.serviceAccount,
      'I66_PRODUCT_SOURCE_SHA=$_I66_SOURCE_SHA','I66_MECHANISM_SOURCE_SHA=$_I66_MECHANISM_SHA','I66_REQUEST_VERSION=$_I66_REQUEST_VERSION','PROJECT_ID='+C.projectId,'TENANT_HINT=alianzas-soluciones']}],
    serviceAccount:'projects/'+C.projectId+'/serviceAccounts/'+C.serviceAccount,timeout:'1800s',logsBucket:'gs://'+C.bucket+'/i66/cloud-build-logs',
    options:{logging:'GCS_ONLY',sourceProvenanceHash:['SHA256'],machineType:'E2_STANDARD_2'},
    substitutions:{_I66_PROVIDER:C.provider,_I66_SOURCE_SHA:p.sourceSha,_I66_MECHANISM_SHA:p.mechanismSha,_I66_REQUEST_VERSION:String(p.requestVersion)},
    tags:['i66-existing-preview-only','i66-request-'+p.requestVersion],artifacts:{objects:{location:'gs://'+C.bucket+'/'+prefix(p,'$BUILD_ID'),paths:Object.values(F)}}};
}
function validateBuild(p,b,{finished=true}={}){
  validatePlan(p);need(uuid(b.id),'EXECUTION_UUID');need([C.projectId,C.projectNumber].some(id=>b.name==='projects/'+id+'/locations/'+C.region+'/builds/'+b.id),'BUILD_RESOURCE');
  equal(b.projectId,C.projectId,'BUILD_PROJECT');equal(b.status,finished?'SUCCESS':'WORKING','BUILD_STATUS');
  const c=configFor(p);for(const k of ['serviceAccount','timeout','logsBucket','substitutions','tags'])equal(b[k],c[k],'CONFIG_'+k);
  for(const k of ['logging','sourceProvenanceHash','machineType'])equal(b.options?.[k],c.options[k],'OPTIONS_'+k);
  for(const k of ['env','volumes','secretEnv'])need(!b.options?.[k]?.length,'NO_GLOBAL_OVERRIDE');
  need(!b.options?.pool?.name&&!b.options?.workerPool&&!b.options?.automapSubstitutions&&!b.options?.dynamicSubstitutions,'NO_EXECUTOR_OVERRIDE');
  need(!b.secrets?.length&&!b.availableSecrets&&!b.dependencies?.length&&!b.images?.length&&!b.gitConfig&&!b.buildTriggerId,'NO_ADDITIONAL_EXECUTOR_SCOPE');
  equal(Object.keys(b.source||{}),['gitSource'],'EXACT_SOURCE_KIND');equal([b.source.gitSource.url,b.source.gitSource.revision],[C.repositoryUrl,p.mechanismSha],'EXACT_MECHANISM_SOURCE');need(!b.source.gitSource.dir,'ROOT_CHECKOUT_REQUIRED');
  if(finished||b.sourceProvenance?.resolvedGitSource){const r=b.sourceProvenance?.resolvedGitSource;equal([r?.url,r?.revision],[C.repositoryUrl,p.mechanismSha],'RESOLVED_SOURCE');need(!r.dir,'RESOLVED_ROOT_REQUIRED');}
  equal(b.steps?.length,1,'ONE_REAL_STEP');const s=b.steps[0],e=c.steps[0];
  for(const k of ['id','name','entrypoint','args'])equal(s[k],e[k],'STEP_'+k);
  const env=e.env.map(v=>v.replace(/\$([A-Z_][A-Z0-9_]*)/g,(m,k)=>k==='BUILD_ID'?b.id:c.substitutions[k]??m));
  need(JSON.stringify(s.env)===JSON.stringify(e.env)||JSON.stringify(s.env)===JSON.stringify(env),'STEP_ENV');
  need(!s.allowFailure&&!s.allowExitCodes?.length&&!s.secretEnv?.length&&!s.script&&!s.dir&&!s.volumes?.length,'NO_STEP_BYPASS');
  equal(Object.keys(b.artifacts||{}),['objects'],'ONLY_NATIVE_ARTIFACTS');
  need([c.artifacts.objects.location,c.artifacts.objects.location.replace('$BUILD_ID',b.id)].includes(b.artifacts.objects.location),'ARTIFACT_PATH');equal(b.artifacts.objects.paths,Object.values(F),'EXACT_ARTIFACTS');
  need(Number.isFinite(Date.parse(b.startTime))&&Number.isFinite(Date.parse(b.createTime)),'ACTUAL_BUILD_TIME');
  if(finished){
    equal(s.status,'SUCCESS','EXECUTED_STEP_REQUIRED');need(Number.isFinite(Date.parse(b.finishTime))&&Date.parse(b.finishTime)>=Date.parse(b.startTime),'FINISH_TIME');
    need(Date.parse(s.timing?.startTime)>=Date.parse(b.startTime)&&Date.parse(s.timing?.endTime)>=Date.parse(s.timing?.startTime)&&Date.parse(s.timing?.endTime)<=Date.parse(b.finishTime),'STEP_TIME');
    equal(b.results?.buildStepImages?.length,1,'IMAGE_COUNT');need(/^sha256:[a-f0-9]{64}$/.test(b.results.buildStepImages[0]),'IMAGE_DIGEST');
    equal(Number(b.results.numArtifacts),Object.keys(F).length,'NATIVE_ARTIFACT_COUNT');
    const uri='gs://'+C.bucket+'/'+prefix(p,b.id)+'artifacts-'+b.id+'.json';need(b.results.artifactManifest===uri||(b.results.artifactManifest.startsWith(uri+'#')&&generation(b.results.artifactManifest.slice(uri.length+1))),'NATIVE_MANIFEST');
    need(typeof b.logUrl==='string'&&b.logUrl.startsWith('https://console.cloud.google.com/cloud-build/builds')&&b.logUrl.includes(b.id),'REAL_LOG_URL');
  }
  return b;
}
async function cloudIo(headers){
  async function response(url,options={}){const r=await fetch(url,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(60000)});need(r.ok,'PROVIDER_HTTP_'+r.status);return r;}
  // Reuse the bounded, diagnosed GET policy already proven in the package
  // executor. Uploads below remain single-attempt CAS POSTs.
  const api=async url=>pkg.requestJson(url,{headers},{operation:'PROVIDER_JSON',timeoutMs:60000});
  const metadata=async(name,gen)=>api('https://storage.googleapis.com/storage/v1/b/'+C.bucket+'/o/'+encodeURIComponent(name)+(gen?'?generation='+encodeURIComponent(gen):''));
  const bytes=async(name,gen)=>Buffer.from(await(await response('https://storage.googleapis.com/download/storage/v1/b/'+C.bucket+'/o/'+encodeURIComponent(name)+'?alt=media&generation='+encodeURIComponent(gen))).arrayBuffer());
  return {api,metadata,bytes,async object(ref){objectRef(ref);const name=ref.uri.slice(('gs://'+C.bucket+'/').length),meta=await metadata(name,ref.generation);
    equal([meta.bucket,meta.name,String(meta.generation),Number(meta.size)],[C.bucket,name,ref.generation,ref.bytes],'GCS_OBJECT_METADATA');
    need(!meta.acl?.some(x=>['allUsers','allAuthenticatedUsers'].includes(x.entity)),'PRIVATE_OBJECT');
    const data=await bytes(name,ref.generation);equal(data.length,ref.bytes,'GCS_OBJECT_SIZE');equal(sha(data),ref.sha256,'GCS_OBJECT_SHA256');return {meta,data};},
    async retain(name,data,type='application/octet-stream'){
      const r=await response('https://storage.googleapis.com/upload/storage/v1/b/'+C.bucket+'/o?uploadType=media&ifGenerationMatch=0&name='+encodeURIComponent(name),{method:'POST',headers:{'Content-Type':type},body:data});
      const m=await r.json();equal([m.bucket,m.name,Number(m.size)],[C.bucket,name,data.length],'RETAINED_OBJECT_METADATA');need(generation(String(m.generation)),'RETAINED_GENERATION');
      const read=await bytes(name,String(m.generation));equal(sha(read),sha(data),'DURABLE_RETENTION_READBACK');return {uri:'gs://'+C.bucket+'/'+name,generation:String(m.generation),sha256:sha(data),bytes:data.length};
    },
    async uploadClaim(name,value){const r=await response('https://storage.googleapis.com/upload/storage/v1/b/'+C.bucket+'/o?uploadType=media&ifGenerationMatch=0&name='+encodeURIComponent(name),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)+'\n'});return r.json();}};
}
async function readPackage(p,io,dir){
  fs.mkdirSync(dir,{recursive:false});
  const pp=p.packagePlan,id=p.packageBuildId;
  const b=await io.api('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+id);pkg.validateBuild(pp,b);
  write(path.join(dir,'build.json'),b);
  const name=pkg.artifactPrefix(pp,id)+'artifacts-'+id+'.json',providerGen=b.results.artifactManifest.split('#')[1],mm=await io.metadata(name,providerGen);
  pkg.validateObject(pp,id,mm,'artifacts-'+id+'.json');pkg.validateObjectTime(b,mm);if(providerGen)equal(String(mm.generation),providerGen,'PACKAGE_MANIFEST_GENERATION');
  const manifest=await io.bytes(name,String(mm.generation));equal(manifest.length,Number(mm.size),'PACKAGE_MANIFEST_SIZE');write(path.join(dir,'manifest.json'),manifest);
  const rows=pkg.artifactRows(pp,id,pkg.parseArtifactManifest(manifest)),files={},objects={};
  for(const [file,row] of rows){const meta=await io.metadata(pkg.artifactPrefix(pp,id)+file,row.generation);pkg.validateObject(pp,id,meta,file);equal(String(meta.generation),row.generation,'PACKAGE_OBJECT_GENERATION');
    const data=await io.bytes(meta.name,row.generation),hex=crypto.createHash('md5').update(data).digest('hex'),base64=Buffer.from(hex,'hex').toString('base64');
    need([hex,base64].includes(row.md5),'NATIVE_PACKAGE_HASH');if(meta.md5Hash)equal(meta.md5Hash,base64,'GCS_NATIVE_HASH');files[file]=data;objects[file]=meta;write(path.join(dir,file),data);}
  const proof=JSON.parse(files[pkg.F.proof]);pkg.validateWorkerProof(pp,b,proof,files,objects);
  const archive=objects[pkg.F.archive];equal({uri:'gs://'+C.bucket+'/'+archive.name,generation:String(archive.generation),sha256:sha(files[pkg.F.archive]),bytes:files[pkg.F.archive].length},p.packageArtifact,'SAME_RETAINED_PACKAGE');
  const lm=await io.metadata(pkg.lockName(pp),proof.lock.generation);equal([lm.bucket,lm.name,String(lm.generation)],[C.bucket,pkg.lockName(pp),proof.lock.generation],'PACKAGE_CLAIM_METADATA');pkg.validateObjectTime(b,lm);
  const claimBytes=await io.bytes(lm.name,proof.lock.generation),claim=JSON.parse(claimBytes);write(path.join(dir,'claim.json'),claimBytes);
  equal([claim.provider,claim.buildId,claim.sourceSha,claim.mechanismSha,claim.planSha256],[C.provider,id,p.sourceSha,pp.mechanismSha,digest(pp)],'PACKAGE_CLAIM_BINDING');
  // Native GCS build logs, read from the bucket and prefix in verified Build
  // metadata, bind the package hash to the actual completed worker execution.
  const logName=b.logsBucket.slice(('gs://'+C.bucket+'/').length).replace(/\/$/,'')+'/log-'+id+'.txt',logMeta=await io.metadata(logName);
  equal([logMeta.bucket,logMeta.name],[C.bucket,logName],'PACKAGE_LOG_LOCATION');need(generation(String(logMeta.generation)),'PACKAGE_LOG_GENERATION');
  const log=await io.bytes(logName,String(logMeta.generation));pkg.validateExecutionLog(pp,b,proof,log);write(path.join(dir,'execution.log'),log);
  return {build:b,proof,files,objects,manifest:{name,generation:String(mm.generation),sha256:sha(manifest)},log:{name:logName,generation:String(logMeta.generation),sha256:sha(log)}};
}
function safeUnpack(tar,dir){
  const listing=execFileSync('tar',['-tzf',tar],{encoding:'utf8',maxBuffer:4*1024*1024}).trim().split(/\r?\n/);
  need(listing.length>224&&listing.length<2500&&listing.every(p=>/^(?:bundle|evidence)(?:\/[A-Za-z0-9_.-]+)*\/?$/.test(p)&&!p.split('/').some(x=>x==='.'||x==='..')),'ARCHIVE_PATHS');
  equal(new Set(listing.map(p=>p.replace(/\/$/,''))).size,listing.length,'NO_ARCHIVE_DUPLICATES');
  const types=execFileSync('tar',['-tvzf',tar],{encoding:'utf8',maxBuffer:4*1024*1024}).trim().split(/\r?\n/);need(types.length===listing.length&&types.every(x=>/^[d-]/.test(x)),'NO_ARCHIVE_LINKS');
  execFileSync('tar',['-xzf',tar,'--no-same-owner','--no-same-permissions','-C',dir],{stdio:'pipe'});
}
function loadBundle(dir,expected){
  const raw=fs.readFileSync(path.join(dir,'evidence/site-manifest.sha256')),rows=reuse.parseManifest(raw.toString('utf8'),224),site=path.join(dir,'bundle/site'),actual=[];
  const walk=(folder,base='')=>{for(const name of fs.readdirSync(folder)){const file=path.join(folder,name),rel=base?base+'/'+name:name,st=fs.lstatSync(file);need(!st.isSymbolicLink(),'SITE_LINK');if(st.isDirectory())walk(file,rel);else{need(st.isFile(),'SITE_FILE');actual.push(rel);}}};walk(site);
  equal(actual.sort(),rows.map(r=>r.relative).sort(),'SITE_MANIFEST_COVERAGE');for(const row of rows)equal(sha(fs.readFileSync(path.join(site,row.relative))),row.hash,'LOCAL_FILE_HASH');
  const marker=reuse.validateMarker(json(path.join(site,'__recovery__/build.json')),expected);return {dir,site,manifest:rows,manifestSha256:sha(raw),marker};
}
function unpackHistorical(bytes,dir,expected){
  equal(bytes.length,IMPORTS[expected=== 'preview'?'preview':'live'].bytes,'BACKUP_SIZE');
  fs.mkdirSync(dir,{recursive:false});const zip=path.join(dir,'verified-backup.zip');write(zip,bytes);
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8'}).trim().split(/\r?\n/).sort();equal(names,[pkg.F.digest,pkg.F.archive].sort(),'EXACT_BACKUP_MEMBERS');
  for(const name of names)write(path.join(dir,name),execFileSync('unzip',['-p',zip,name],{maxBuffer:64*1024*1024}));
  const tar=fs.readFileSync(path.join(dir,pkg.F.archive)),sum=fs.readFileSync(path.join(dir,pkg.F.digest),'utf8').match(/^([a-f0-9]{64})\s+[^\r\n]+\r?\n?$/)?.[1];equal(sha(tar),sum,'BACKUP_TAR_HASH');safeUnpack(path.join(dir,pkg.F.archive),dir);return {zipSha256:sha(bytes),tarSha256:sum};
}
function inventoryFromZip(bytes,dir,a){
  const zip=path.join(dir,'verified-inventory.zip');write(zip,bytes);
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8'}).trim().split(/\r?\n/);
  need(names.length>0&&names.length<50&&new Set(names).size===names.length&&names.every(n=>/^[A-Za-z0-9_.\/-]+$/.test(n)&&!n.startsWith('/')&&!n.split('/').some(s=>s==='..'||s==='.')),'INVENTORY_ZIP_MEMBERS');
  const matches=[];
  for(const name of names.filter(n=>n.endsWith('.json'))){const data=execFileSync('unzip',['-p',zip,name],{maxBuffer:8*1024*1024});if(sha(data)===a.freshInventoryEvidence.rawInventorySha256)matches.push({name,data});}
  equal(matches.length,1,'EXACT_RAW_INVENTORY_MEMBER');const value=JSON.parse(matches[0].data);reuse.validateInventoryPreimage(value,a.freshInventoryEvidence);write(path.join(dir,'authorized-inventory.json'),matches[0].data);return {value,member:matches[0].name,sha256:sha(matches[0].data)};
}
async function readFiles(origin,bundle){
  need([C.origin,...readback.LIVE.map(r=>r.origin)].includes(origin),'READBACK_ORIGIN');
  for(let i=0;i<bundle.manifest.length;i+=8)await Promise.all(bundle.manifest.slice(i,i+8).map(async file=>{
    const url=new URL(origin+'/'+file.relative);url.searchParams.set('__gi_i66_provider',crypto.randomBytes(12).toString('hex'));
    const r=await fetch(url,{redirect:'error',cache:'no-store',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(30000)});need(r.ok,'READBACK_HTTP_'+r.status);equal(sha(Buffer.from(await r.arrayBuffer())),file.hash,'HOSTED_BYTES');}));
  return {origin,files:bundle.manifest.length,manifestSha256:bundle.manifestSha256,marker:bundle.marker};
}
async function github(suffix){const r=await fetch('https://api.github.com/repos/'+C.repository+'/actions/'+suffix,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},redirect:'error',signal:AbortSignal.timeout(30000)});need(r.ok,'GITHUB_READ_'+r.status);return r.json();}
async function validateHistoricalMetadata(a){
  const out={};
  for(const [label,expected] of [['preview',a.previousCandidate],['live',a.protectedLive]]){
    const [run,artifact]=await Promise.all([github('runs/'+expected.buildRunId+'/attempts/'+expected.buildRunAttempt),github('artifacts/'+expected.artifactId)]);
    reuse.validateArtifact(run,artifact,expected);equal(artifact.size_in_bytes,IMPORTS[label].bytes,'HISTORICAL_BYTES');out[label]={run,artifact};
  }
  const live=await github('runs/'+a.protectedLive.liveRunId+'/attempts/'+a.protectedLive.liveRunAttempt);
  equal([live.id,live.head_sha,live.head_branch,live.path,live.run_attempt,live.status,live.conclusion],[a.protectedLive.liveRunId,a.protectedLive.liveRunHeadSha,C.branch,a.protectedLive.liveWorkflowPath,a.protectedLive.liveRunAttempt,'completed','success'],'ACCEPTED_LIVE_RUN');out.acceptedLive=live;
  const e=a.freshInventoryEvidence,[run,artifact,jobs]=await Promise.all([github('runs/'+e.runId+'/attempts/'+e.runAttempt),github('artifacts/'+e.artifactId),github('runs/'+e.runId+'/attempts/'+e.runAttempt+'/jobs?per_page=100')]);
  equal([run.id,run.run_attempt,run.head_sha,run.head_branch,run.path,run.status,run.conclusion],[e.runId,e.runAttempt,e.workflowHeadSha,C.branch,e.workflowPath,'completed','failure'],'INVENTORY_HISTORICAL_RUN');
  equal([artifact.id,artifact.digest,artifact.size_in_bytes,artifact.expired,artifact.workflow_run?.id,artifact.workflow_run?.head_sha],[e.artifactId,e.artifactDigest,IMPORTS.inventory.bytes,false,e.runId,e.workflowHeadSha],'INVENTORY_ARTIFACT');
  const job=jobs.jobs?.find(j=>j.id===e.jobId),step=job?.steps?.find(s=>s.number===e.inventoryStepNumber);need(job&&step,'EXACT_INVENTORY_JOB_STEP');equal([job.run_id,step.status,step.conclusion],[e.runId,'completed','success'],'INVENTORY_READ_STEP');out.inventory={run,artifact,job};return out;
}
function validateProof(p,b,files,objects){
  validateBuild(p,b);equal(Object.keys(files).sort(),Object.values(F).sort(),'ALL_PROOF_FILES');
  equal(Object.keys(objects).sort(),Object.values(F).sort(),'ALL_NATIVE_OBJECT_METADATA');
  const proof=JSON.parse(files[F.proof]),before=JSON.parse(files[F.before]),after=JSON.parse(files[F.after]),rb=JSON.parse(files[F.readback]);
  equal([proof.schema,proof.provider,proof.scope,proof.status],[C.proofSchema,C.provider,C.scope,'EXACT_EXISTING_PREVIEW_READBACK_PASS_SIGNED_QA_PENDING'],'FINAL_PROOF_SCOPE');
  equal([proof.executionBuildId,proof.sourceSha,proof.requestVersion,proof.mechanismSha,proof.planSha256,proof.packageBuildId],[b.id,p.sourceSha,p.requestVersion,p.mechanismSha,digest(p),p.packageBuildId],'FINAL_PROOF_IDENTITY');
  equal(proof.artifact,p.packageArtifact,'PROOF_SAME_ARTIFACT');equal(proof.constraints,p.constraints,'PROOF_NO_SCOPE_EXPANSION');
  equal([proof.channelId,proof.previewUrl],[C.channel,C.origin],'PROOF_EXISTING_CHANNEL');
  equal([proof.previewFiles,proof.dualLiveFiles,proof.otherChannelsUnchanged],[224,[224,224],50],'ALL_READBACK_FILES');
  equal(Object.keys(proof.fileHashes||{}).sort(),Object.values(F).filter(n=>n!==F.proof).sort(),'ALL_FILE_HASHES');
  for(const [file,hash] of Object.entries(proof.fileHashes))equal(hash,sha(files[file]),'PROOF_FILE_HASH');
  equal(Object.keys(proof.checks||{}).sort(),['deploy','mechanism'],'EXECUTED_CHECKS');
  for(const [name,check] of Object.entries(proof.checks)){
    equal([check.status,check.exitCode],['PASS',0],'CHECK_REAL_PASS');
    need(Date.parse(check.startedAt)>=Date.parse(b.startTime)&&Date.parse(check.endedAt)>=Date.parse(check.startedAt)&&Date.parse(check.endedAt)<=Date.parse(b.finishTime),'CHECK_WITHIN_BUILD');
    need(files[F[name]].length>0,'NONEMPTY_CHECK_LOG');
  }
  equal([before.schema,before.status,before.provider,before.mode],['GI_I66_CLOUD_BUILD_EXISTING_PREVIEW_BEFORE_V1','PREPARED_READONLY_NOT_ACCEPTED',C.provider,C.mode],'BEFORE_SCOPE');
  equal([before.buildId,before.sourceSha,before.packageBuildId,before.channelId,before.previewUrl],[b.id,p.sourceSha,p.packageBuildId,C.channel,C.origin],'BEFORE_IDENTITY');
  equal(before.artifact,p.packageArtifact,'BEFORE_PACKAGE');equal(before.rollover,p.rollover,'BEFORE_ROLLOVER');
  equal(before.providerReuseBasis,reuseBasisRecord(),'EXPLICIT_PROVIDER_REUSE_BASIS');
  for(const k of ['previewWrites','liveWrites','backendWrites','businessWrites','authRulesIamWrites','channelDeletions'])equal(before[k],0,'BEFORE_NO_WRITES');equal(before.productAccepted,false,'BEFORE_NOT_ACCEPTED');
  equal(Object.keys(before.backups||{}).sort(),['live','preview'],'BOTH_BACKUPS');
  for(const label of ['live','preview']){const backup=before.backups[label];equal(backup.gcs,p.imports[label],'BACKUP_GENERATION_PIN');equal(backup.zipSha256,IMPORTS[label].sha256,'BACKUP_BYTES_PIN');need(sha64(backup.tarSha256)&&sha64(backup.manifestSha256),'BACKUP_MANIFEST_TAR');}
  equal(Object.keys(before.durablePreimages||{}).sort(),['before.json','historical-imports.json','inventory-before-fresh.json','inventory-before.json'],'BEFORE_RETAINED_DURABLY');
  const retainedPrefix='gs://'+C.bucket+'/i66/preview-attempts/request-'+p.requestVersion+'/'+p.sourceSha+'/'+b.id+'/';
  for(const [name,ref] of Object.entries(before.durablePreimages)){objectRef(ref);equal(ref.uri,retainedPrefix+name,'PREIMAGE_BUILD_PATH');}
  const origins=[C.origin,...readback.LIVE.map(x=>x.origin)];
  for(const report of [before,after]){
    equal(report.readbacks?.map(x=>x.origin),origins,'THREE_EXACT_ORIGINS');
    for(const row of report.readbacks){equal(row.files,224,'224_FILES_EACH');need(sha64(row.manifestSha256),'FULL_MANIFEST_HASH');}
  }
  equal(before.readbacks[0].marker.sourceSha,'a06e5b692595a863a6c6f6b223d895d874abb90e','PREVIOUS_PREVIEW_SOURCE');
  for(const row of before.readbacks.slice(1))equal(row.marker.sourceSha,'65c825b2808a615ca4195bdde6689dbdbe3193b2','ACCEPTED_LIVE_SOURCE');
  equal([after.schema,after.status,after.provider],['GI_I66_CLOUD_BUILD_EXISTING_PREVIEW_AFTER_V1','EXACT_PREVIEW_REPLACEMENT_READBACK_PASS_NOT_FUNCTIONAL_ACCEPTANCE',C.provider],'AFTER_SCOPE');
  equal([after.executionBuildId,after.sourceSha,after.packageBuildId,after.channelId,after.previewUrl],[b.id,p.sourceSha,p.packageBuildId,C.channel,C.origin],'AFTER_IDENTITY');equal(after.artifact,p.packageArtifact,'AFTER_PACKAGE');
  equal(after.providerReuseBasis,before.providerReuseBasis,'FINAL_EXPLICIT_REUSE_BASIS');equal(after.finalPredeployInventorySha256,before.inventorySha256,'FINAL_PREDEPLOY_INVENTORY_EXACT');
  equal(after.readbacks[0].marker.sourceSha,p.sourceSha,'NEW_PREVIEW_SOURCE');equal(after.readbacks.slice(1),before.readbacks.slice(1),'DUAL_LIVE_UNCHANGED');
  equal([after.previewDeployments,after.newChannels,after.deletedChannels,after.liveWrites,after.backendWrites,after.businessWrites,after.authRulesIamWrites],[1,0,0,0,0,0,0],'ONLY_EXISTING_PREVIEW_DEPLOY');
  equal([after.signedFunctionalPass,after.productionAccepted],[false,false],'NO_ACCEPTANCE_OVERCLAIM');
  equal([after.inventoryComparison?.otherChannelsUnchanged,after.inventoryComparison?.targetVersion],[50,after.hostingVersion],'INVENTORY_COMPARISON');
  need(/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(after.hostingVersion)&&after.hostingVersion!=='sites/ays-orbit-360-lab/versions/f5d719cc833e26f8','NEW_VERSION');equal(proof.hostingVersion,after.hostingVersion,'PROOF_VERSION');
  equal(after.packageReadbackSha256,sha(files[F.readback]),'READBACK_BYTES');
  equal([rb.status,rb.stage,rb.sourceSha,rb.executionProvider,rb.buildRunId,rb.artifactId,rb.artifactDigest,rb.previewUrl,rb.previewChannel,rb.verifiedFiles],['PASS','COMPLETE',p.sourceSha,C.provider,p.packageBuildId,p.packageArtifact.uri+'#'+p.packageArtifact.generation,'sha256:'+p.packageArtifact.sha256,C.origin,C.channel,224],'READBACK_EXACT_PACKAGE');
  equal(rb.files?.length,224,'ALL_224_READBACK_ROWS');need(rb.files.every(x=>x.status==='PASS'),'EVERY_READBACK_PASS');
  equal(rb.live?.length,2,'BOTH_LIVE_FINGERPRINTS');need(rb.live.every(x=>x.status==='PASS'&&x.beforeSha256===x.afterSha256),'LIVE_FINGERPRINTS_UNCHANGED');equal(rb.appStartupAcceptance,false,'READBACK_NOT_APP_ACCEPTANCE');
  equal(proof.claim?.bucket,C.bucket,'CLAIM_BUCKET');equal(proof.claim?.name,lockName(p),'CLAIM_NAME');need(generation(proof.claim?.generation),'CLAIM_GENERATION');
  for(const [name,meta] of Object.entries(objects)){
    equal([meta.bucket,meta.name,Number(meta.size)],[C.bucket,prefix(p,b.id)+name,files[name].length],'NATIVE_OBJECT_METADATA');need(generation(String(meta.generation)),'NATIVE_OBJECT_GENERATION');pkg.validateObjectTime(b,meta);
  }
  return {proof,before,after,readback:rb};
}
function assertOverwriteReady(p,before,claim){
  validatePlan(p);equal([before.status,before.provider,before.mode,before.sourceSha,before.packageBuildId,before.channelId,before.previewUrl],['PREPARED_READONLY_NOT_ACCEPTED',C.provider,C.mode,p.sourceSha,p.packageBuildId,C.channel,C.origin],'OVERWRITE_BEFORE_IDENTITY');need(uuid(before.buildId),'OVERWRITE_UUID');equal(before.artifact,p.packageArtifact,'OVERWRITE_PACKAGE');
  equal(before.readbacks?.map(r=>r.origin),[C.origin,...readback.LIVE.map(r=>r.origin)],'OVERWRITE_READBACK_ORIGINS');need(before.readbacks.every(r=>r.files===224&&sha64(r.manifestSha256)),'OVERWRITE_ALL_224');
  equal(Object.keys(before.durablePreimages||{}).sort(),['before.json','historical-imports.json','inventory-before-fresh.json','inventory-before.json'],'OVERWRITE_DURABLE_PREIMAGES');
  for(const [name,ref] of Object.entries(before.durablePreimages)){objectRef(ref);equal(ref.uri,'gs://'+C.bucket+'/i66/preview-attempts/request-'+p.requestVersion+'/'+p.sourceSha+'/'+before.buildId+'/'+name,'OVERWRITE_DURABLE_SCOPE');}
  equal([claim?.bucket,claim?.name],[C.bucket,lockName(p)],'OVERWRITE_CLAIM');need(generation(String(claim?.generation||'')),'OVERWRITE_CLAIM_GENERATION');
  return true;
}
function reuseBasisRecord(){
  return {schema:'GI_I66_EXPLICIT_PROVIDER_REUSE_BASIS_V1',mode:C.mode,
    authority:'EXISTING_I66_CONTINUE_CORRECT_AND_PUBLISH_SAME_REQUEST_WITHOUT_NEW_CHANNELS',
    rolloverReceiptSha256:C.rolloverSha256,channelId:C.channel,totalChannels:51,previewChannels:50,
    fullInventorySha256:C.inventorySha256,observedNewChannelHttp429ThisExecution:false,
    legacyHttp429GuardExecuted:false,newChannelCapacityClaimed:false,fullExactCurrentInventoryRequired:true};
}
function providerReuseBasis(p,authorization,inventory){
  validatePlan(p);
  equal(authorization.profile,'I66_CURRENT_PHYSICAL_E3_PREVIEW_V34_SUCCESSOR_V7','REUSE_BASIS_PROFILE');
  equal([authorization.channel?.id,authorization.channel?.origin],[C.channel,C.origin],'REUSE_BASIS_CHANNEL');
  equal(authorization.constraints?.onlyWhenNewChannelQuotaIsExhausted,true,'PRESERVE_LEGACY_QUOTA_CONSTRAINT');
  equal(authorization.successorRequirements?.noNewChannelOrGarbageCollectionAuthority,true,'NO_NEW_CHANNEL_AUTHORITY');
  equal([authorization.freshInventoryEvidence?.totalChannels,authorization.freshInventoryEvidence?.previewChannels,authorization.freshInventoryEvidence?.noFreeChannelCapacityClaim],[51,50,true],'PINNED_CAPACITY_BOUNDARY');
  const rows=Array.isArray(inventory?.result)?inventory.result:inventory?.result?.channels;
  need(Array.isArray(rows),'REUSE_FULL_INVENTORY');
  const ids=rows.map(r=>String(r.channelId||r.name||'').split('/').pop());
  equal([rows.length,new Set(ids).size,ids.filter(id=>id!=='live').length,ids.filter(id=>id==='live').length],[51,51,50,1],'EXACT_FIFTY_PREVIEW_BOUNDARY');
  need(ids.includes(C.channel),'EXISTING_TARGET_REQUIRED');
  // The entire immutable observed inventory is required, not a channel count
  // used to infer permission. The old receipt and its HTTP429 rule stay intact.
  reuse.validateInventoryPreimage(inventory,authorization.freshInventoryEvidence);
  equal(reuse.inventoryDigest(inventory),C.inventorySha256,'SEALED_INVENTORY_BOUNDARY');
  return reuseBasisRecord();
}
function finalPredeployGate({branchGuard,inventory,save,validate,deploy}){
  // Ordering is deliberate: all external preparation/claims precede this
  // final branch check and complete inventory. Only local validation/persist
  // occur between the last inventory response and the exact existing deploy.
  const branchHead=branchGuard(),raw=inventory();save(raw);const basis=validate(raw);
  return {branchHead,inventory:raw,basis,deployment:deploy()};
}
function deployExisting(cli,config,cwd,env,log){
  const startedAt=new Date().toISOString(),args=[cli,'hosting:channel:deploy',C.channel,'--config',config,'--project',C.projectId,'--expires','7d','--non-interactive','--json'];
  const r=spawnSync(process.execPath,args,{cwd,env,encoding:'utf8',maxBuffer:16*1024*1024,timeout:900000});
  write(log,(r.stdout||'')+(r.stderr||''));
  if(r.error||r.status!==0){console.error('I66_CLOUD_PREVIEW_DEPLOY_FAILED '+JSON.stringify({exitCode:r.status,signal:r.signal||null}));process.stderr.write(fs.readFileSync(log).subarray(-16384).toString('utf8').split(/\r?\n/).slice(-200).join('\n')+'\n');const e=Error('I66_CLOUD_PREVIEW_DEPLOY_FAILED');e.exitCode=Number.isInteger(r.status)&&r.status>0?r.status:1;throw e;}
  // stderr may contain CLI warnings; only stdout is the documented JSON result.
  const result=JSON.parse(r.stdout);need(result.status==='success'&&!result.error,'DEPLOY_RESULT');
  return {status:'PASS',exitCode:0,startedAt,endedAt:new Date().toISOString()};
}
function validateExecutionLog(p,b,proof,log){
  const marker='I66_CLOUD_BUILD_EXISTING_PREVIEW_READY_FOR_PROVIDER_RETENTION ',lines=log.toString('utf8').split(/\r?\n/).filter(x=>x.includes(marker));equal(lines.length,1,'UNIQUE_NATIVE_LOG_MARKER');
  equal(JSON.parse(lines[0].slice(lines[0].indexOf(marker)+marker.length)),{executionBuildId:b.id,packageBuildId:p.packageBuildId,sourceSha:p.sourceSha,archiveSha256:p.packageArtifact.sha256,hostingVersion:proof.hostingVersion,scope:C.scope},'NATIVE_LOG_BINDING');
  return true;
}
function verify(p,id,out){
  validatePlan(p);need(uuid(id),'VERIFY_UUID');fs.mkdirSync(out,{recursive:false});
  const gcloud=args=>JSON.parse(execFileSync('gcloud',[...args,'--project='+C.projectId,'--format=json'],{encoding:'utf8',maxBuffer:64*1024*1024}));
  const metadata=uri=>gcloud(['storage','objects','describe',uri,'--raw']);
  const download=(uri,file)=>{execFileSync('gcloud',['storage','cp',uri,file,'--project='+C.projectId,'--quiet'],{stdio:'inherit'});return fs.readFileSync(file);};
  const b=gcloud(['builds','describe',id,'--region='+C.region]);validateBuild(p,b);write(path.join(out,'cloud-build-metadata.json'),b);
  const manifestUri=b.results.artifactManifest,mm=metadata(manifestUri);equal([mm.bucket,mm.name],[C.bucket,prefix(p,id)+'artifacts-'+id+'.json'],'MANIFEST_PATH');need(generation(String(mm.generation)),'MANIFEST_GENERATION');pkg.validateObjectTime(b,mm);if(manifestUri.includes('#'))equal(String(mm.generation),manifestUri.split('#')[1],'MANIFEST_PROVIDER_GENERATION');
  const manifest=download('gs://'+C.bucket+'/'+mm.name+'#'+mm.generation,path.join(out,'artifact-manifest.json'));equal(manifest.length,Number(mm.size),'MANIFEST_SIZE');
  const decoded=pkg.parseArtifactManifest(manifest),rows=Array.isArray(decoded)?decoded:decoded?.artifacts;need(Array.isArray(rows),'NATIVE_MANIFEST_ROWS');equal(rows.length,Object.keys(F).length,'NATIVE_MEMBER_COUNT');
  const files={},objects={};
  for(const row of rows){const stem='gs://'+C.bucket+'/'+prefix(p,id);need(typeof row.location==='string'&&row.location.startsWith(stem),'NATIVE_MEMBER_PREFIX');const m=/^([^/#]+)#([1-9][0-9]{0,24})$/.exec(row.location.slice(stem.length));need(m&&Object.values(F).includes(m[1])&&!files[m[1]],'NATIVE_MEMBER_EXACT');
    const meta=metadata(row.location);equal(String(meta.generation),m[2],'NATIVE_MEMBER_GENERATION');const data=download(row.location,path.join(out,m[1])),hex=crypto.createHash('md5').update(data).digest('hex'),base64=Buffer.from(hex,'hex').toString('base64');need([hex,base64].includes(pkg.nativeArtifactMd5(row)),'NATIVE_MEMBER_MD5');if(meta.md5Hash)equal(meta.md5Hash,base64,'GCS_MEMBER_MD5');files[m[1]]=data;objects[m[1]]=meta;}
  const result=validateProof(p,b,files,objects);
  const logFile=path.join(out,'cloud-build-execution.log'),fd=fs.openSync(logFile,'wx',0o600);try{execFileSync('gcloud',['builds','log',id,'--region='+C.region,'--project='+C.projectId],{stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}const log=fs.readFileSync(logFile);validateExecutionLog(p,b,result.proof,log);
  const claimUri='gs://'+C.bucket+'/'+result.proof.claim.name+'#'+result.proof.claim.generation,cm=metadata(claimUri);pkg.validateObjectTime(b,cm);equal([cm.bucket,cm.name,String(cm.generation)],[C.bucket,lockName(p),result.proof.claim.generation],'CLAIM_METADATA_READBACK');const claim=JSON.parse(download(claimUri,path.join(out,'preview-claim.json')));equal([claim.provider,claim.executionBuildId,claim.packageBuildId,claim.sourceSha,claim.planSha256],[C.provider,id,p.packageBuildId,p.sourceSha,digest(p)],'CLAIM_READBACK');equal(claim.artifact,p.packageArtifact,'CLAIM_PACKAGE');
  const retained={};for(const [name,ref] of Object.entries(result.before.durablePreimages)){const meta=metadata(ref.uri+'#'+ref.generation);pkg.validateObjectTime(b,meta);equal([meta.bucket,meta.name,String(meta.generation),Number(meta.size)],[C.bucket,ref.uri.slice(('gs://'+C.bucket+'/').length),ref.generation,ref.bytes],'PREIMAGE_METADATA');need(Date.parse(meta.timeCreated)<=Date.parse(result.proof.checks.deploy.startedAt),'BACKUP_BEFORE_DEPLOY');const data=download(ref.uri+'#'+ref.generation,path.join(out,'retained-'+name));equal(sha(data),ref.sha256,'PREIMAGE_HASH_READBACK');retained[name]=JSON.parse(data);}
  equal(retained['historical-imports.json'],p.imports,'RETAINED_IMPORTS');const beforeWithoutRefs={...result.before};delete beforeWithoutRefs.durablePreimages;equal(retained['before.json'],beforeWithoutRefs,'DURABLE_BEFORE_REPORT');equal(digest(retained['inventory-before.json']),result.before.inventorySha256,'DURABLE_BEFORE_INVENTORY');equal(reuse.inventoryDigest(retained['inventory-before.json']),reuse.inventoryDigest(retained['inventory-before-fresh.json']),'DURABLE_FRESH_INVENTORY');
  const evidenceTar=path.join(out,F.evidence),names=execFileSync('tar',['-tzf',evidenceTar],{encoding:'utf8',maxBuffer:4*1024*1024}).trim().split(/\r?\n/);
  const retainedInventory=name=>{const member='./'+name;equal(names.filter(n=>n===member).length,1,'ONE_INVENTORY_EVIDENCE_MEMBER');return JSON.parse(execFileSync('tar',['-xOf',evidenceTar,member],{encoding:'utf8',maxBuffer:8*1024*1024}));};
  const initial=retainedInventory('inventory-before.json'),first=retainedInventory('inventory-after-first.json'),final=retainedInventory('inventory-after-final.json');
  const immediate=retainedInventory('inventory-before-deploy.json');equal(immediate,initial,'FINAL_PREDEPLOY_FULL_INVENTORY');equal(digest(immediate),result.after.finalPredeployInventorySha256,'FINAL_PREDEPLOY_INVENTORY_HASH');
  equal(initial,retained['inventory-before.json'],'NATIVE_AND_PREDEPLOY_INVENTORY_SAME');
  const authorityBytes=fs.readFileSync(path.join(__dirname,'..',C.rollover));equal(sha(authorityBytes),C.rolloverSha256,'VERIFIER_SEALED_ROLLOVER');const authority=JSON.parse(authorityBytes);
  reuse.validateInventoryPreimage(initial,authority.freshInventoryEvidence);
  equal(providerReuseBasis(p,authority,immediate),result.after.providerReuseBasis,'EXPLICIT_REUSE_BASIS_READBACK');
  equal(reuse.validateAfterInventories(initial,first,final,authority),result.after.inventoryComparison,'NATIVE_FULL_INVENTORIES_REVALIDATED');
  const artifact=objects[F.proof],receipt={schema:C.receiptSchema,provider:C.provider,status:'EXACT_EXISTING_PREVIEW_RETAINED_READBACK_PASS_SIGNED_QA_PENDING',scope:C.scope,sourceSha:p.sourceSha,mechanismSha:p.mechanismSha,requestVersion:p.requestVersion,packageBuildId:p.packageBuildId,packageArtifact:p.packageArtifact,executionBuildId:id,planSha256:digest(p),cloudBuild:{name:b.name,id,status:b.status,serviceAccount:b.serviceAccount,resolvedSource:b.sourceProvenance.resolvedGitSource,stepImages:b.results.buildStepImages,logUrl:b.logUrl,metadataSha256:digest(b),logSha256:sha(log)},proof:{uri:'gs://'+C.bucket+'/'+artifact.name,generation:String(artifact.generation),sha256:sha(files[F.proof]),bytes:files[F.proof].length},manifest:{uri:'gs://'+C.bucket+'/'+mm.name,generation:String(mm.generation),sha256:sha(manifest)},channelId:C.channel,previewUrl:C.origin,hostingVersion:result.after.hostingVersion,previewFiles:224,dualLiveFiles:[224,224],otherChannelsUnchanged:50,backendSignedQa:'PENDING',livePromotion:'NOT_AUTHORIZED_BY_THIS_RECEIPT',productionAccepted:false};
  write(path.join(out,'receipt.json'),receipt);write(path.join(out,'gcs-object-metadata.json'),objects);return receipt;
}
function makePlan(repo,packagePlan,packageReceipt,imports){
  pkg.validatePlan(packagePlan);equal(packageReceipt.schema,pkg.C.receiptSchema,'PACKAGE_RECEIPT_SCHEMA');equal(packageReceipt.status,'IMMUTABLE_PACKAGE_RETAINED_READBACK_PASS_NO_DEPLOY','PACKAGE_RECEIPT_STATUS');
  equal(packageReceipt.planSha256,digest(packagePlan),'PACKAGE_RECEIPT_PLAN');equal(packageReceipt.sourceSha,packagePlan.sourceSha,'PACKAGE_RECEIPT_SOURCE');
  const mechanismSha=git(repo,'rev-parse','HEAD');equal(git(repo,'status','--porcelain','--untracked-files=no'),'','CLEAN_MECHANISM');git(repo,'merge-base','--is-ancestor',packagePlan.mechanismSha,mechanismSha);
  equal(git(repo,'diff','--name-only',packagePlan.sourceSha,mechanismSha,'--',...productRoots),'','PRODUCT_CHANGED');
  equal(blob(gitBytes(repo,mechanismSha,C.transport)),packagePlan.transportBlob,'FROZEN_REQUEST_CHANGED');equal(git(repo,'rev-parse',mechanismSha+':'+C.manifest),packagePlan.manifestBlob,'MANIFEST_CHANGED');
  equal(sha(gitBytes(repo,mechanismSha,C.rollover)),C.rolloverSha256,'ROLLOVER_CHANGED');
  const mechanismPins=Object.fromEntries(pins().map(p=>{const bytes=gitBytes(repo,mechanismSha,p);equal(fs.readFileSync(path.join(repo,p)),bytes,'MECHANISM_WORKTREE');return[p,{blob:blob(bytes),sha256:sha(bytes)}];}));
  const a=packageReceipt.artifact;
  return validatePlan({schema:C.planSchema,provider:C.provider,scope:C.scope,mode:C.mode,repository:C.repository,branch:C.branch,projectId:C.projectId,projectNumber:C.projectNumber,region:C.region,serviceAccount:C.serviceAccount,bucket:C.bucket,
    mechanismSha,sourceSha:packagePlan.sourceSha,requestVersion:packagePlan.requestVersion,packagePlan,packageBuildId:packageReceipt.cloudBuild.id,packageArtifact:{uri:a.uri,generation:a.generation,sha256:a.sha256,bytes:a.bytes},
    rollover:{path:C.rollover,sha256:C.rolloverSha256,channelId:C.channel,origin:C.origin},imports,pins:mechanismPins,
    constraints:{builds:0,newChannels:0,deletedChannels:0,liveWrites:0,backendWrites:0,businessWrites:0,authRulesIamWrites:0,signedFunctionalPass:false,productionAccepted:false}});
}
async function worker(p){
  validatePlan(p);equal(process.versions.node.split('.')[0],'22','NODE_22');const root=process.cwd(),identity=await pkg.workerIdentity(),io=await cloudIo(identity.headers);
  const b=await io.api('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+identity.buildId);validateBuild(p,b,{finished:false});
  equal([process.env.I66_PRODUCT_SOURCE_SHA,process.env.I66_MECHANISM_SOURCE_SHA,process.env.I66_REQUEST_VERSION],[p.sourceSha,p.mechanismSha,String(p.requestVersion)],'RUNTIME_SUBSTITUTIONS');
  for(const [file,pin] of Object.entries(p.pins)){const bytes=fs.readFileSync(path.join(root,file));equal({blob:blob(bytes),sha256:sha(bytes)},pin,'MECHANISM_PIN');}
  const temp=path.join(root,'gi-i66-preview-'+identity.buildId),evidence=path.join(temp,'evidence');fs.mkdirSync(temp,{recursive:false});fs.mkdirSync(evidence);
  const source=path.join(temp,'source');execFileSync('git',['clone','--no-checkout','--branch',C.branch,C.repositoryUrl,source],{stdio:'inherit'});
  execFileSync('git',['checkout','--detach',p.sourceSha],{cwd:source,stdio:'inherit'});
  // Historical authority validation must use the complete source clone, not
  // the provider's possibly shallow mechanism checkout. The owner is unchanged.
  equal(blob(fs.readFileSync(path.join(source,C.reuse))),p.pins[C.reuse].blob,'SEALED_ROLLOVER_OWNER');
  const reuse=require(path.join(source,C.reuse)).technicalRollover;
  function branchGuard(){execFileSync('git',['fetch','--no-tags','--no-write-fetch-head','origin','refs/heads/'+C.branch+':refs/remotes/origin/'+C.branch],{cwd:source,stdio:'inherit'});const head=git(source,'rev-parse','refs/remotes/origin/'+C.branch);git(source,'merge-base','--is-ancestor',p.mechanismSha,head);equal(blob(gitBytes(source,head,C.transport)),p.packagePlan.transportBlob,'CURRENT_REQUEST_CHANGED');equal(git(source,'rev-parse',head+':'+C.manifest),p.packagePlan.manifestBlob,'CURRENT_MANIFEST_CHANGED');equal(git(source,'diff','--name-only',p.sourceSha,head,'--',...productRoots),'','CURRENT_PRODUCT_CHANGED');return head;}
  branchGuard();const control=json(path.join(source,C.transport)),receiptText=fs.readFileSync(path.join(source,C.rollover),'utf8');equal(sha(receiptText),C.rolloverSha256,'EXACT_ROLLOVER_RECEIPT');
  const authorization=reuse.validateAuthorization(control,receiptText);equal([authorization.channel.id,authorization.channel.origin],[C.channel,C.origin],'EXACT_CURRENT_CHANNEL');
  const mechanism=pkg.execLogged(process.execPath,['--test',C.test,C.readbackTest,pkg.C.test],{cwd:root,env:process.env,log:path.join(root,F.mechanism)});
  const packageDir=path.join(evidence,'certified-package'),packageEvidence=await readPackage(p,io,packageDir);
  const nextDir=path.join(temp,'gi-i66-package');fs.mkdirSync(nextDir);safeUnpack(path.join(packageDir,pkg.F.archive),nextDir);const next=loadBundle(nextDir,{sourceSha:p.sourceSha});
  const imported={};for(const [label,ref] of Object.entries(p.imports)){const item=await io.object(ref);imported[label]=item;}
  const historicalMetadata=await validateHistoricalMetadata(authorization);write(path.join(evidence,'historical-metadata.json'),historicalMetadata);
  const inventoryProof=inventoryFromZip(imported.inventory.data,evidence,authorization),backups={};
  for(const [label,expected] of [['preview',authorization.previousCandidate],['live',authorization.protectedLive]]){const dir=path.join(evidence,label);backups[label]={...unpackHistorical(imported[label].data,dir,label),...loadBundle(dir,expected),gcs:p.imports[label]};}
  const cliRoot=path.join(temp,'cli');execFileSync('npm',['install','--prefix',cliRoot,'--no-save','--ignore-scripts','--no-audit','--no-fund','firebase-tools@14.10.1'],{cwd:root,stdio:'inherit'});execFileSync(process.execPath,['tools/gravicentra-firebase-tools-empty-extensions-workaround-v1.mjs',cliRoot],{cwd:source,stdio:'inherit'});
  const cli=path.join(cliRoot,'node_modules/firebase-tools/lib/bin/firebase.js'),bundle=path.join(nextDir,'bundle'),config=path.join(bundle,'firebase.json');
  const inventory=()=>JSON.parse(execFileSync(process.execPath,[cli,'hosting:channel:list','--config',config,'--project',C.projectId,'--site',C.projectId,'--non-interactive','--json'],{cwd:bundle,encoding:'utf8',maxBuffer:8*1024*1024,timeout:30000}));
  const initial=inventory();reuse.validateChannels(control,receiptText,initial);equal(reuse.inventoryDigest(initial),reuse.inventoryDigest(inventoryProof.value),'FRESH_AUTHORIZED_INVENTORY');const reuseBasis=providerReuseBasis(p,authorization,initial);write(path.join(evidence,'inventory-before.json'),initial);
  const beforeReadbacks=[await readFiles(C.origin,backups.preview)];for(const live of readback.LIVE)beforeReadbacks.push(await readFiles(live.origin,backups.live));
  for(const live of readback.LIVE){const r=await fetch(live.origin,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000)});need(r.ok,'LIVE_FINGERPRINT');write(path.join(temp,live.beforeFile),sha(Buffer.from(await r.arrayBuffer()))+'  -\n');}
  const fresh=inventory();reuse.validateChannels(control,receiptText,fresh);equal(reuse.inventoryDigest(fresh),reuse.inventoryDigest(initial),'CONCURRENT_BEFORE_CHANGE');write(path.join(evidence,'inventory-before-fresh.json'),fresh);
  const branchHead=branchGuard(),before={schema:'GI_I66_CLOUD_BUILD_EXISTING_PREVIEW_BEFORE_V1',status:'PREPARED_READONLY_NOT_ACCEPTED',provider:C.provider,mode:C.mode,providerReuseBasis:reuseBasis,buildId:identity.buildId,sourceSha:p.sourceSha,packageBuildId:p.packageBuildId,artifact:p.packageArtifact,channelId:C.channel,previewUrl:C.origin,rollover:p.rollover,authorizedInventory:inventoryProof.sha256,inventorySha256:digest(initial),backups:Object.fromEntries(Object.entries(backups).map(([k,v])=>[k,{gcs:v.gcs,zipSha256:v.zipSha256,tarSha256:v.tarSha256,manifestSha256:v.manifestSha256,marker:v.marker}])),readbacks:beforeReadbacks,previewWrites:0,liveWrites:0,backendWrites:0,businessWrites:0,authRulesIamWrites:0,channelDeletions:0,productAccepted:false};
  const refreshed=await pkg.workerIdentity();equal(refreshed.buildId,identity.buildId,'RUNTIME_CHANGED');const writeIo=await cloudIo(refreshed.headers),claim={schema:'GI_I66_CLOUD_BUILD_EXISTING_PREVIEW_CLAIM_V1',provider:C.provider,executionBuildId:identity.buildId,packageBuildId:p.packageBuildId,sourceSha:p.sourceSha,artifact:p.packageArtifact,planSha256:digest(p),createdAt:new Date().toISOString()};
  // Native artifacts are uploaded only after SUCCESS. Persist and read back the
  // complete before-state NOW, so a failed deploy/readback cannot erase it.
  const retentionPrefix='i66/preview-attempts/request-'+p.requestVersion+'/'+p.sourceSha+'/'+identity.buildId+'/';
  const retained={};
  for(const [name,value] of Object.entries({'inventory-before.json':initial,'inventory-before-fresh.json':fresh,'before.json':before,'historical-imports.json':p.imports}))
    retained[name]=await writeIo.retain(retentionPrefix+name,Buffer.from(JSON.stringify(value,null,2)+'\n'),'application/json');
  before.durablePreimages=retained;write(path.join(root,F.before),before);
  console.log('I66_CLOUD_BUILD_EXISTING_PREVIEW_PREIMAGES_RETAINED '+JSON.stringify({executionBuildId:identity.buildId,sourceSha:p.sourceSha,retained}));
  const claimMeta=await writeIo.uploadClaim(lockName(p),claim);equal([claimMeta.bucket,claimMeta.name],[C.bucket,lockName(p)],'CLAIM_PATH');need(generation(String(claimMeta.generation)),'CLAIM_GENERATION');
  try{
  assertOverwriteReady(p,before,claimMeta);
  // The only provider mutation in this worker. The selected channel already
  // exists with exact version/createTime/full metadata, freshly revalidated.
  const finalGate=finalPredeployGate({branchGuard,inventory,
    save:raw=>write(path.join(evidence,'inventory-before-deploy.json'),raw),
    validate:raw=>{reuse.validateChannels(control,receiptText,raw);equal(reuse.inventoryDigest(raw),reuse.inventoryDigest(initial),'POST_RETENTION_PREIMAGE_DRIFT');return providerReuseBasis(p,authorization,raw);},
    deploy:()=>deployExisting(cli,config,bundle,process.env,path.join(root,F.deploy))});
  const deploy=finalGate.deployment;
  const rb=await readback.runReadback({packageRoot:nextDir,fingerprintRoot:temp,reportPath:path.join(root,F.readback),previewUrl:C.origin,previewChannel:C.channel,sourceSha:p.sourceSha,executionProvider:C.provider,buildRunId:p.packageBuildId,artifactId:p.packageArtifact.uri+'#'+p.packageArtifact.generation,artifactDigest:'sha256:'+p.packageArtifact.sha256});
  const first=inventory();write(path.join(evidence,'inventory-after-first.json'),first);
  const afterReadbacks=[await readFiles(C.origin,next)];for(const live of readback.LIVE)afterReadbacks.push(await readFiles(live.origin,backups.live));
  const final=inventory();write(path.join(evidence,'inventory-after-final.json'),final);const comparison=reuse.validateAfterInventories(initial,first,final,authorization);
  equal(sha(fs.readFileSync(path.join(packageDir,pkg.F.archive))),p.packageArtifact.sha256,'PACKAGE_STAYED_IMMUTABLE');loadBundle(nextDir,{sourceSha:p.sourceSha});
  for(const [label,ref] of Object.entries(p.imports))equal(sha(imported[label].data),ref.sha256,'BACKUP_STAYED_IMMUTABLE');
  const after={schema:'GI_I66_CLOUD_BUILD_EXISTING_PREVIEW_AFTER_V1',status:'EXACT_PREVIEW_REPLACEMENT_READBACK_PASS_NOT_FUNCTIONAL_ACCEPTANCE',provider:C.provider,executionBuildId:identity.buildId,sourceSha:p.sourceSha,packageBuildId:p.packageBuildId,artifact:p.packageArtifact,channelId:C.channel,previewUrl:C.origin,hostingVersion:comparison.targetVersion,inventoryComparison:comparison,finalPredeployInventorySha256:digest(finalGate.inventory),providerReuseBasis:finalGate.basis,readbacks:afterReadbacks,packageReadbackSha256:sha(fs.readFileSync(path.join(root,F.readback))),previewDeployments:1,newChannels:0,deletedChannels:0,liveWrites:0,backendWrites:0,businessWrites:0,authRulesIamWrites:0,signedFunctionalPass:false,productionAccepted:false};write(path.join(root,F.after),after);
  execFileSync('tar',['-czf',path.join(root,F.evidence),'-C',evidence,'.'],{stdio:'pipe'});
  const proof={schema:C.proofSchema,provider:C.provider,scope:C.scope,status:'EXACT_EXISTING_PREVIEW_READBACK_PASS_SIGNED_QA_PENDING',executionBuildId:identity.buildId,sourceSha:p.sourceSha,requestVersion:p.requestVersion,mechanismSha:p.mechanismSha,planSha256:digest(p),packageBuildId:p.packageBuildId,artifact:p.packageArtifact,channelId:C.channel,previewUrl:C.origin,hostingVersion:after.hostingVersion,observedBranchHead:branchHead,claim:{bucket:C.bucket,name:lockName(p),generation:String(claimMeta.generation)},checks:{mechanism,deploy},fileHashes:Object.fromEntries(Object.values(F).filter(n=>n!==F.proof).map(n=>[n,sha(fs.readFileSync(path.join(root,n)))])),previewFiles:rb.verifiedFiles,dualLiveFiles:afterReadbacks.slice(1).map(r=>r.files),otherChannelsUnchanged:comparison.otherChannelsUnchanged,constraints:p.constraints,packageEvidence:{metadataSha256:digest(packageEvidence.build),manifest:packageEvidence.manifest,log:packageEvidence.log}};
  write(path.join(root,F.proof),proof);console.log('I66_CLOUD_BUILD_EXISTING_PREVIEW_READY_FOR_PROVIDER_RETENTION '+JSON.stringify({executionBuildId:identity.buildId,packageBuildId:p.packageBuildId,sourceSha:p.sourceSha,archiveSha256:p.packageArtifact.sha256,hostingVersion:after.hostingVersion,scope:C.scope}));
  return proof;
  }catch(error){
    const code=String(error?.message||'I66_CLOUD_PREVIEW_HOLD').match(/I66_[A-Z0-9_]+/)?.[0]||'I66_CLOUD_PREVIEW_RUNTIME_HOLD';
    const failure={schema:'GI_I66_CLOUD_BUILD_EXISTING_PREVIEW_HOLD_V1',provider:C.provider,executionBuildId:identity.buildId,sourceSha:p.sourceSha,packageBuildId:p.packageBuildId,artifact:p.packageArtifact,channelId:C.channel,code,retainedPreimages:retained,claim:{name:claimMeta.name,generation:String(claimMeta.generation)},signedFunctionalPass:false,productionAccepted:false};
    console.error('I66_CLOUD_BUILD_EXISTING_PREVIEW_GATE_HOLD '+code);
    try{
      const failIdentity=await pkg.workerIdentity();equal(failIdentity.buildId,identity.buildId,'FAILURE_RUNTIME_CHANGED');const failIo=await cloudIo(failIdentity.headers);
      for(const [name,file] of [['deploy.log',path.join(root,F.deploy)],['readback.json',path.join(root,F.readback)],['inventory-before-deploy.json',path.join(evidence,'inventory-before-deploy.json')]])if(fs.existsSync(file))await failIo.retain(retentionPrefix+name,fs.readFileSync(file));
      const ref=await failIo.retain(retentionPrefix+'hold.json',Buffer.from(JSON.stringify(failure,null,2)+'\n'),'application/json');console.error('I66_CLOUD_BUILD_EXISTING_PREVIEW_HOLD_RETAINED '+JSON.stringify(ref));
    }catch(retentionError){console.error('I66_CLOUD_PREVIEW_FAILURE_RETENTION_HOLD '+String(retentionError?.message||'').match(/I66_[A-Z0-9_]+/)?.[0]);}
    throw error;
  }
}
function main(args=process.argv.slice(2)){
  if(args[0]==='prepare'&&args.length===5){const p=makePlan(process.cwd(),json(args[1]),json(args[2]),json(args[3]));fs.mkdirSync(args[4],{recursive:false});write(path.join(args[4],'plan.json'),p);write(path.join(args[4],'cloudbuild.json'),configFor(p));console.log('I66_CLOUD_PREVIEW_PREPARED_NO_EXECUTION '+digest(p));return p;}
  if(args[0]==='worker'&&args.length===2)return worker(JSON.parse(args[1]));
  if(args[0]==='verify'&&args.length===4)return verify(json(args[1]),args[2],args[3]);
  throw new Error('I66_CLOUD_PREVIEW_USE_PREPARE_WORKER_OR_VERIFY');
}
module.exports={C,F,IMPORTS,objectRef,artifactIdentity,validatePlan,prefix,lockName,configFor,validateBuild,cloudIo,readPackage,safeUnpack,loadBundle,unpackHistorical,inventoryFromZip,readFiles,validateHistoricalMetadata,validateProof,assertOverwriteReady,reuseBasisRecord,providerReuseBasis,finalPredeployGate,deployExisting,validateExecutionLog,makePlan,worker,verify,main};
if(require.main===module)Promise.resolve().then(()=>main()).catch(e=>{console.error(String(e?.message||'I66_CLOUD_PREVIEW_HOLD'));process.exitCode=1;});
