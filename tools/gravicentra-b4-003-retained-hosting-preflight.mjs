#!/usr/bin/env node
/**
 * B4-003 retained Hosting preflight. Hosting operations are GET only.
 * The existing executor supplies immutable, evidence-bound candidate variables.
 * No build, deployment, release creation, Firestore access, Auth configuration,
 * Functions operation, CP update or acceptance transition is implemented here.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';

const env=process.env;
const out=path.resolve(env.B4_PREFLIGHT_OUT || path.join(env.RUNNER_TEMP || '.', 'gi-b4003-retained-preflight'));
fs.mkdirSync(out,{recursive:true});
const receipt={
  schema:'B4_003_RETAINED_HOSTING_PREFLIGHT_V1',
  status:'IN_PROGRESS',
  startedAtUtc:new Date().toISOString(),
  runId:env.GITHUB_RUN_ID || null,
  runnerCommit:env.GITHUB_SHA || null,
  checks:[],
  scope:{remoteReadsOnly:true,buildExecuted:false,hostingMutation:false,
    functionsDeployment:false,rulesChanged:false,authConfigurationChanged:false,
    dataWrites:0,controlPlaneUpdated:false},
  formalPreviewAcceptanceGranted:false,
  productionPromotionAuthorizedByThisReceipt:false,
  b4003Closed:false
};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=(code)=>{throw new Error(code);};
const requireValue=(condition,code)=>{if(!condition)fail(code);};
const writeJson=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
const writeReceipt=()=>writeJson('preflight.json',receipt);
const safeCode=e=>String(e?.message || 'PREFLIGHT_ERROR').replace(/[^A-Z0-9_.:-]/gi,'_').slice(0,180);
let issues=0;
async function check(name,fn){
  const startedAtUtc=new Date().toISOString();
  try{
    const evidence=await fn();
    receipt.checks.push({name,status:'PASS',startedAtUtc,finishedAtUtc:new Date().toISOString(),evidence});
    writeReceipt();
    return evidence;
  }catch(e){
    issues++;
    receipt.checks.push({name,status:'FAIL',startedAtUtc,finishedAtUtc:new Date().toISOString(),code:safeCode(e)});
    writeReceipt();
    return undefined;
  }
}
const requiredEnv=name=>{
  const value=String(env[name] || '').trim();
  requireValue(value.length>0,'MISSING_ENV_'+name);
  return value;
};
const exact=(actual,want,code)=>requireValue(actual===want,code);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function relativePath(value){
  requireValue(typeof value==='string','HOSTING_PATH_NOT_STRING');
  const result=value.startsWith('/')?value.slice(1):value;
  requireValue(result && !result.startsWith('/') && !result.includes('\\') &&
    !result.includes('\n') && !result.includes('\r') &&
    result.split('/').every(p=>p && p!=='.' && p!=='..'),'HOSTING_PATH_INVALID');
  return result;
}
function localManifest(root){
  const files=[];
  function walk(dir){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const p=path.join(dir,entry.name);
      if(entry.isDirectory()){if(entry.name!=='node_modules')walk(p);}
      else if(entry.isFile())files.push(p);
      else fail('BUNDLE_NON_REGULAR_ENTRY');
    }
  }
  walk(root);
  files.sort();
  const rows=files.map(p=>({path:relativePath(path.relative(root,p).split(path.sep).join('/')),sha256:sha(fs.readFileSync(p))}));
  const text=rows.map(r=>r.sha256+'  '+r.path).join('\n')+'\n';
  return {rows,text,fileCount:rows.length,digest:sha(text)};
}
function previewFileContract(version,files,manifest){
  // Firebase Hosting supplies these two SDK auto-configuration resources.
  // https://firebase.google.com/docs/hosting/reserved-urls#sdk_auto-configuration
  // Diagnostic 42315518247 observed exactly this pair outside the retained TAR.
  // No other reserved URL or product path is excluded from exact comparison.
  const managedInitPaths=['__/firebase/init.js','__/firebase/init.json'];
  const paths=files.map(r=>r.path);
  const retainedPaths=manifest.rows.map(r=>r.path);
  const metadataFileCount=Number(version.fileCount);
  requireValue(Number.isSafeInteger(metadataFileCount) && metadataFileCount>0,'PREVIEW_METADATA_FILE_COUNT_INVALID');
  exact(metadataFileCount,files.length,'PREVIEW_METADATA_LIST_COUNT_MISMATCH');
  exact(new Set(paths).size,paths.length,'PREVIEW_DUPLICATE_HOSTING_PATH');
  exact(manifest.fileCount,retainedPaths.length,'PREVIEW_RETAINED_COUNT_MISMATCH');
  exact(new Set(retainedPaths).size,retainedPaths.length,'PREVIEW_DUPLICATE_RETAINED_PATH');
  requireValue(retainedPaths.every(p=>!managedInitPaths.includes(p)),'PREVIEW_RETAINED_MANAGED_INIT_COLLISION');
  const managedInitFiles=files.filter(r=>managedInitPaths.includes(r.path));
  const productFiles=files.filter(r=>!managedInitPaths.includes(r.path));
  exact(JSON.stringify(managedInitFiles.map(r=>r.path).sort()),JSON.stringify(managedInitPaths),'PREVIEW_MANAGED_INIT_PATH_SET_MISMATCH');
  exact(productFiles.length,manifest.fileCount,'PREVIEW_PRODUCT_FILE_COUNT_MISMATCH');
  exact(JSON.stringify(productFiles.map(r=>r.path).sort()),JSON.stringify([...retainedPaths].sort()),'PREVIEW_PRODUCT_PATH_SET_MISMATCH');
  return {productFiles,managedInitFiles,metadataFileCount,listedFileCount:files.length,
    retainedProductFileCount:manifest.fileCount,managedInitFileCount:managedInitFiles.length,
    managedInitPaths,managedInitDocumentation:'https://firebase.google.com/docs/hosting/reserved-urls#sdk_auto-configuration',
    productManifestDigest:manifest.digest,anyOtherPathExcluded:false};
}
async function publicRead(base,rel,nonce){
  const origin=new URL(base).origin;
  const url=base.replace(/\/$/,'')+'/'+rel.split('/').map(encodeURIComponent).join('/')+
    '?b4retained='+encodeURIComponent(nonce);
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const response=await fetch(url,{
        headers:{'Accept-Encoding':'identity','Cache-Control':'no-cache, no-store','Pragma':'no-cache'},
        redirect:'follow',signal:AbortSignal.timeout(20000)
      });
      requireValue(new URL(response.url).origin===origin,'PUBLIC_READ_REDIRECTED_ORIGIN');
      const bytes=Buffer.from(await response.arrayBuffer());
      if(response.status>=500 && attempt<2)continue;
      return {status:response.status,sha256:sha(bytes),byteCount:bytes.length,bytes};
    }catch(e){
      if(attempt===2)throw new Error('PUBLIC_READ_FAILED:'+rel);
    }
  }
  fail('PUBLIC_READ_FAILED:'+rel);
}
async function readManifest(base,paths,expectedRows,label,nonce,expectedDigest){
  const rows=new Array(paths.length);
  const expected=expectedRows?new Map(expectedRows.map(r=>[r.path,r.sha256])):null;
  let marker;
  let lastBad=[];
  let lastDigest;
  for(let attempt=1;attempt<=3;attempt++){
    // Preview retries only discrepant paths. For rollback only the complete
    // certified digest is known, so a retry must reconstruct its full manifest.
    const indices=paths.map((_,i)=>i).filter(i=>!expected || !rows[i]?.exact);
    let cursor=0;
    await Promise.all(Array.from({length:Math.min(8,indices.length)},async()=>{
      while(true){
        const slot=cursor++;
        if(slot>=indices.length)return;
        const i=indices[slot],rel=paths[i];
        try{
          const response=await publicRead(base,rel,nonce+'-attempt-'+attempt);
          const want=expected?.get(rel);
          rows[i]={path:rel,status:response.status,sha256:response.sha256,
            byteCount:response.byteCount,...(want?{expectedSha256:want}:{}),
            exact:response.status===200 && (!expected || response.sha256===want)};
          if(rel==='__recovery__/build.json' && response.status===200){
            try{
              const parsed=JSON.parse(response.bytes.toString('utf8'));
              marker={sourceSha:parsed.sourceSha,buildId:parsed.buildId,gate:parsed.gate};
            }catch{marker={parseError:true};}
          }
        }catch{
          rows[i]={path:rel,status:'READ_ERROR',exact:false};
        }
      }
    }));
    const ordered=[...rows].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
    lastBad=ordered.filter(r=>!r.exact);
    const text=ordered.filter(r=>r.status===200).map(r=>r.sha256+'  '+r.path).join('\n')+'\n';
    lastDigest=sha(text);
    writeJson(label+'-attempt-'+attempt+'-files.json',ordered);
    writeJson(label+'-files.json',ordered);
    fs.writeFileSync(path.join(out,label+'-manifest.sha256'),text);
    if(lastBad.length===0 && lastDigest===expectedDigest){
      return {fileCount:ordered.length,digest:lastDigest,marker,attempts:attempt,
        manifestFile:label+'-manifest.sha256',filesEvidence:label+'-files.json'};
    }
    if(attempt<3)await new Promise(resolve=>setTimeout(resolve,1500));
  }
  if(lastBad.length)fail(label.toUpperCase()+'_BYTES_MISMATCH_'+lastBad.length);
  fail(label.toUpperCase()+'_MANIFEST_DIGEST_MISMATCH');
}
let binding,cp,cursor,manifest,authClient,previewChannel,rollbackChannel,liveBefore;
const apiRoot='https://firebasehosting.googleapis.com/v1beta1/';
async function hostingGet(resource,query={}){
  // Fixed host, fixed API prefix, GET only; no arbitrary outbound URL is accepted.
  requireValue(/^(projects\/-\/sites\/[a-z0-9-]+\/channels\/[a-z0-9-]+|sites\/[a-z0-9-]+\/versions\/[A-Za-z0-9_-]+(?:\/files)?)$/.test(resource) ||
    resource==='sites/'+binding.site+'/channels/live/releases',
    'HOSTING_RESOURCE_OUTSIDE_READ_ALLOWLIST');
  const url=new URL(apiRoot+resource);
  for(const [k,v] of Object.entries(query))url.searchParams.set(k,String(v));
  try{
    const response=await authClient.request({url:url.toString(),method:'GET',timeout:30000,retry:false});
    return response.data;
  }catch(e){
    // Never serialize gaxios config, request headers, credentials or tokens.
    throw new Error('HOSTING_GET_'+String(e?.response?.status || e?.code || 'ERROR')+':'+resource);
  }
}
async function getChannel(id){
  const channel=await hostingGet('projects/-/sites/'+binding.site+'/channels/'+id);
  const version=channel?.release?.version;
  // Preserve only safe response fields before the strict version parser.
  writeJson('hosting-channel-'+id+'-observed.json',{
    requestedSite:binding.site,requestedChannelId:id,
    name:typeof channel?.name==='string'?channel.name:null,
    url:typeof channel?.url==='string'?channel.url:null,
    release:{
      name:typeof channel?.release?.name==='string'?channel.release.name:null,
      versionType:version===null?'null':Array.isArray(version)?'array':typeof version,
      versionName:typeof version==='string'?version:typeof version?.name==='string'?version.name:null
    }
  });
  return channel;
}
function versionName(channel){
  const raw=channel?.release?.version?.name;
  let name=raw;
  // Observed in diagnostic 42314060136: Firebase returns project-qualified
  // names. Normalize only the observed project and the already pinned site.
  const qualified=typeof raw==='string'?/^projects\/([^/]+)\/(sites\/([^/]+)\/versions\/[A-Za-z0-9_-]+)$/.exec(raw):null;
  if(qualified){
    exact(qualified[1],'646761409743','HOSTING_VERSION_PROJECT_MISMATCH');
    exact(qualified[3],binding.site,'HOSTING_VERSION_SITE_MISMATCH');
    requireValue(typeof channel?.name==='string' &&
      channel.name.startsWith('projects/646761409743/sites/'+binding.site+'/channels/'),
      'HOSTING_CHANNEL_PROJECT_OR_SITE_MISMATCH');
    name=qualified[2];
  }
  requireValue(typeof name==='string' &&
    new RegExp('^sites/'+binding.site+'/versions/[A-Za-z0-9_-]+$').test(name),'HOSTING_VERSION_NAME_MISSING_OR_WRONG_SITE');
  return name;
}
function compactChannel(channel){
  return {name:channel.name,url:channel.url,versionName:versionName(channel),
    releaseName:channel.release?.name,releaseTime:channel.release?.releaseTime,
    expireTime:channel.expireTime || null};
}
async function listFiles(version){
  const rows=[];
  const seenTokens=new Set();
  let token='';
  do{
    const page=await hostingGet(version+'/files',{status:'ACTIVE',pageSize:1000,...(token?{pageToken:token}:{})});
    requireValue(Array.isArray(page.files || []),'HOSTING_FILES_RESPONSE_INVALID');
    for(const file of page.files || []){
      requireValue(file.status==='ACTIVE','HOSTING_FILE_NOT_ACTIVE');
      rows.push({path:relativePath(file.path),hostingHash:file.hash,status:file.status});
    }
    token=page.nextPageToken || '';
    requireValue(!token || !seenTokens.has(token),'HOSTING_FILES_PAGINATION_LOOP');
    if(token)seenTokens.add(token);
    requireValue(rows.length<=20000,'HOSTING_FILES_UNEXPECTED_COUNT');
  }while(token);
  rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  requireValue(new Set(rows.map(r=>r.path)).size===rows.length,'HOSTING_DUPLICATE_PATH');
  return rows;
}
async function observeCertifiedLiveReleaseHistoryFirstPage(){
  const evidence={
    schema:'B4_003_CERTIFIED_LIVE_RELEASE_HISTORY_READONLY_V1',
    status:'READ_IN_PROGRESS',
    sourceRunId:35416730679,
    sourceJobId:105826717920,
    certifiedSourceSha:cp.certifiedCandidate.sourceSha,
    certifiedBuildId:cp.certifiedCandidate.buildId,
    certifiedPayloadDigest:cp.certifiedCandidate.hostedPayloadDigest,
    observedCloneSuccessAtUtc:'2026-09-19T02:50:49.187Z',
    windowStartUtc:'2026-09-19T02:50:00.000Z',
    windowEndUtc:'2026-09-19T02:51:00.000Z',
    request:{method:'GET',resource:'sites/'+binding.site+'/channels/live/releases',pageSize:100},
    pageRequests:0,
    paginationFollowed:false,
    rollbackCertifiedByThisProbe:false,
    certificateChanged:false,
    hostingMutation:false
  };
  try{
    evidence.pageRequests=1;
    // Official sites.channels.releases.list route. Exactly one page; no token follow-up.
    const page=await hostingGet(evidence.request.resource,{pageSize:100});
    requireValue(Array.isArray(page.releases || []),'LIVE_RELEASE_HISTORY_INVALID_RESPONSE');
    requireValue((page.releases || []).length<=100,'LIVE_RELEASE_HISTORY_PAGE_LIMIT_EXCEEDED');
    const text=v=>typeof v==='string'?v:null;
    evidence.releases=(page.releases || []).map(r=>({
      name:text(r.name),releaseTime:text(r.releaseTime),type:text(r.type),
      version:{
        name:typeof r.version==='string'?r.version:text(r.version?.name),
        status:text(r.version?.status),
        fileCount:r.version?.fileCount===undefined?null:r.version.fileCount
      }
    }));
    evidence.returnedCount=evidence.releases.length;
    evidence.hasNextPage=Boolean(page.nextPageToken);
    const start=Date.parse(evidence.windowStartUtc),end=Date.parse(evidence.windowEndUtc);
    evidence.windowCandidates=evidence.releases.filter(r=>{
      const time=Date.parse(r.releaseTime || '');
      return Number.isFinite(time) && time>=start && time<=end;
    });
    evidence.windowCandidateCount=evidence.windowCandidates.length;
    evidence.status='READ_ONLY_FIRST_PAGE_COMPLETE_NO_CERTIFICATION';
    // Only the already observed exact I5 release/version may receive two GETs.
    // Counts and API hashes cannot establish the certified raw-byte manifest.
    const candidate=evidence.windowCandidates[0];
    if(evidence.windowCandidateCount===1 &&
      candidate.name==='sites/'+binding.site+'/channels/live/releases/1789786248527000' &&
      candidate.releaseTime==='2026-09-19T02:50:48.527Z' &&
      candidate.version.name==='sites/'+binding.site+'/versions/5d35a2bd0b326e75'){
      await observeCertifiedVersionCandidate(candidate);
    }
  }catch(error){
    evidence.status='READ_ONLY_FIRST_PAGE_FAILED';
    evidence.code=safeCode(error);
  }finally{
    evidence.observedAtUtc=new Date().toISOString();
    writeJson('live-release-history-first-page.json',evidence);
    receipt.liveReleaseHistoryProbeFile='live-release-history-first-page.json';
  }
}
async function observeCertifiedVersionCandidate(candidate){
  const versionName='sites/'+binding.site+'/versions/5d35a2bd0b326e75';
  const evidence={schema:'B4_003_CERTIFIED_VERSION_CANDIDATE_READONLY_V1',
    status:'READ_IN_PROGRESS',candidateRelease:candidate,candidateVersionName:versionName,
    certifiedSourceSha:cp.certifiedCandidate.sourceSha,certifiedBuildId:cp.certifiedCandidate.buildId,
    certifiedProductFileCount:Number(cp.certifiedCandidate.hostedFileCount),
    certifiedProductDigest:cp.certifiedCandidate.hostedPayloadDigest,
    requests:[],paginationFollowed:false,hostingMutation:false,
    sourceIdentityVerified:false,rawPayloadDigestVerified:false,
    rollbackCertifiedByThisProbe:false,certificateChanged:false};
  try{
    evidence.requests.push({method:'GET',resource:versionName});
    const version=await hostingGet(versionName);
    evidence.version=version;
    exact(version.name,versionName,'CANDIDATE_VERSION_NAME_MISMATCH');
    exact(version.status,'FINALIZED','CANDIDATE_VERSION_NOT_FINALIZED');
    evidence.requests.push({method:'GET',resource:versionName+'/files',status:'ACTIVE',pageSize:1000});
    const page=await hostingGet(versionName+'/files',{status:'ACTIVE',pageSize:1000});
    requireValue(Array.isArray(page.files),'CANDIDATE_FILES_INVALID');
    evidence.hasNextPage=Boolean(page.nextPageToken);
    evidence.files=page.files.map(f=>({path:relativePath(f.path),hostingHash:f.hash,status:f.status}))
      .sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
    evidence.listedFileCount=evidence.files.length;
    evidence.metadataFileCount=version.fileCount ?? null;
    requireValue(!evidence.hasNextPage,'CANDIDATE_REQUIRES_UNAPPROVED_PAGINATION');
    requireValue(evidence.files.every(f=>f.status==='ACTIVE'),'CANDIDATE_FILE_NOT_ACTIVE');
    exact(new Set(evidence.files.map(f=>f.path)).size,evidence.files.length,'CANDIDATE_DUPLICATE_PATH');
    exact(Number(version.fileCount),evidence.files.length,'CANDIDATE_METADATA_LIST_COUNT_MISMATCH');
    const initPaths=['__/firebase/init.js','__/firebase/init.json'];
    evidence.managedInitFiles=evidence.files.filter(f=>initPaths.includes(f.path));
    evidence.productFiles=evidence.files.filter(f=>!initPaths.includes(f.path));
    evidence.productFileCount=evidence.productFiles.length;
    exact(JSON.stringify(evidence.managedInitFiles.map(f=>f.path)),JSON.stringify(initPaths),'CANDIDATE_MANAGED_INIT_PATH_SET_MISMATCH');
    exact(evidence.productFileCount,evidence.certifiedProductFileCount,'CANDIDATE_PRODUCT_COUNT_MISMATCH');
    evidence.status='READ_ONLY_CANDIDATE_LISTING_COMPLETE_NOT_CERTIFIED';
  }catch(error){
    evidence.status='READ_ONLY_CANDIDATE_LISTING_FAILED_NOT_CERTIFIED';
    evidence.code=safeCode(error);
  }finally{
    evidence.observedAtUtc=new Date().toISOString();
    writeJson('certified-version-candidate-observed.json',evidence);
    receipt.certifiedVersionCandidateProbeFile='certified-version-candidate-observed.json';
  }
}
async function liveSnapshot(nonce){
  const origins=[];
  for(const base of binding.liveUrls){
    const probes=[];
    for(const rel of ['index.html','__recovery__/build.json']){
      const r=await publicRead(base,rel,nonce);
      let marker;
      if(rel==='__recovery__/build.json' && r.status===200){
        try{
          const parsed=JSON.parse(r.bytes.toString('utf8'));
          marker={sourceSha:parsed.sourceSha,buildId:parsed.buildId,gate:parsed.gate};
        }catch{marker={parseError:true};}
      }
      probes.push({path:rel,status:r.status,sha256:r.sha256,byteCount:r.byteCount,...(marker?{marker}:{})});
    }
    origins.push({base,probes});
  }
  // A metadata-format failure must not suppress independently read public bytes.
  writeJson('live-public-probes-'+(nonce.startsWith('before-')?'before':'after')+'.json',{origins});
  const channel=compactChannel(await getChannel('live'));
  return {channel,origins};
}
writeReceipt();
try{
  const local=await check('exact_candidate_and_archive',async()=>{
    binding={
      sourceSha:requiredEnv('RETAINED_SOURCE_SHA'),buildId:requiredEnv('RETAINED_BUILD_ID'),
      runId:Number(requiredEnv('RETAINED_RUN_ID')),artifactId:Number(requiredEnv('RETAINED_ARTIFACT_ID')),
      artifactZipSha256:requiredEnv('RETAINED_ZIP_SHA256'),archiveSha256:requiredEnv('RETAINED_TAR_SHA256'),
      site:requiredEnv('HOSTING_SITE'),projectId:requiredEnv('PROJECT_ID'),
      previewChannelId:requiredEnv('RETAINED_PREVIEW_CHANNEL'),previewUrl:requiredEnv('RETAINED_PREVIEW_URL'),
      liveUrls:['https://ays-orbit-360-lab.web.app','https://app.aysseguros.com']
    };
    exact(env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core','WRONG_REPOSITORY');
    exact(env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831','WRONG_BRANCH');
    exact(binding.site,'ays-orbit-360-lab','WRONG_SITE');
    exact(binding.projectId,binding.site,'WRONG_PROJECT');
    requireValue(/^[a-f0-9]{40}$/.test(binding.sourceSha),'BAD_SOURCE_SHA');
    for(const key of ['artifactZipSha256','archiveSha256'])requireValue(/^[a-f0-9]{64}$/.test(binding[key]),'BAD_'+key);
    requireValue(Number.isSafeInteger(binding.runId)&&binding.runId>0&&Number.isSafeInteger(binding.artifactId)&&binding.artifactId>0,'BAD_ARTIFACT_IDENTIFIERS');
    exact(git('rev-parse','HEAD'),env.GITHUB_SHA,'RUNNER_CHECKOUT_MISMATCH');
    const control=requiredEnv('CONTROL');
    const bytes=fs.readFileSync(control);
    cp=JSON.parse(bytes);
    cursor=cp[requiredEnv('B4_CURSOR_KEY')];
    requireValue(cursor && typeof cursor==='object','ACTIVE_CURSOR_MISSING');
    exact(cursor.activeSourceSha,binding.sourceSha,'ACTIVE_SOURCE_MISMATCH');
    exact(cursor.activeBuildId,binding.buildId,'ACTIVE_BUILD_MISMATCH');
    exact(Number(cursor.activeImmutableArtifactId),binding.artifactId,'ACTIVE_ARTIFACT_MISMATCH');
    const matchingProofs=Object.entries(cursor).filter(([key,v])=>/^immutableSuccessor\d+PreviewReadback/.test(key) &&
      v && Number(v.artifactId)===binding.artifactId && v.sourceSha===binding.sourceSha);
    exact(matchingProofs.length,1,'EXACT_IMMUTABLE_READBACK_BINDING_REQUIRED');
    const [proofKey,proof]=matchingProofs[0];
    for(const key of ['sourceSha','buildId','artifactZipSha256','archiveSha256','previewChannelId','previewUrl'])
      exact(proof[key],binding[key],'CURSOR_PROOF_MISMATCH_'+key);
    exact(Number(proof.runId),binding.runId,'CURSOR_RUN_MISMATCH');
    exact(proof.workflowConclusion,'success','SOURCE_WORKFLOW_NOT_SUCCESS');
    requireValue(proof.exactServedReadbackPassed===true,'PRIOR_IMMUTABLE_READBACK_NOT_PASS');
    receipt.binding=binding;
    receipt.control={path:control,blobSha:git('rev-parse','HEAD:'+control),sha256:sha(bytes),
      cursorKey:env.B4_CURSOR_KEY,immutableProofKey:proofKey,
      recordedPromotionAuthorization:cursor.productionPromotionAuthorized===true,
      recordedB4003Closed:cursor.b4003Closed===true};
    // The workflow SHA is documentary/executor provenance, not the product source.
    const artifactDir=requiredEnv('RETAINED_ARCHIVE_DIR');
    const archive=path.join(artifactDir,'gi-b4003-immutable-release-bundle.tar.gz');
    exact(sha(fs.readFileSync(archive)),binding.archiveSha256,'RETAINED_TAR_HASH_MISMATCH');
    const sidecar=fs.readFileSync(path.join(artifactDir,'gi-b4003-immutable-release-bundle.sha256'),'utf8').trim().split(/\s+/)[0];
    exact(sidecar,binding.archiveSha256,'RETAINED_SIDECAR_MISMATCH');
    const entries=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n');
    requireValue(entries.length>0 && entries.every(p=>/^bundle(?:\/|$)/.test(p) && !p.split('/').includes('..') && !p.includes('\\')),
      'UNEXPECTED_TAR_ENTRY');
    const expanded=path.join(out,'expanded');
    fs.mkdirSync(expanded,{recursive:true});
    execFileSync('tar',['--no-same-owner','-xzf',archive,'-C',expanded],{stdio:['ignore','pipe','pipe']});
    const root=path.join(expanded,'bundle');
    const config=JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8'));
    exact(Object.keys(config).join(','),'hosting','BUNDLE_NOT_HOSTING_ONLY');
    exact(config.hosting.site,binding.site,'BUNDLE_HOSTING_SITE_MISMATCH');
    exact(config.hosting.public,'site','BUNDLE_PUBLIC_ROOT_MISMATCH');
    const marker=JSON.parse(fs.readFileSync(path.join(root,'site','__recovery__','build.json'),'utf8'));
    exact(marker.sourceSha,binding.sourceSha,'BUNDLE_SOURCE_MISMATCH');
    exact(marker.buildId,binding.buildId,'BUNDLE_BUILD_MISMATCH');
    exact(marker.gate,'I6.5-B4-003','BUNDLE_GATE_MISMATCH');
    manifest=localManifest(path.join(root,'site'));
    fs.writeFileSync(path.join(out,'retained-site-manifest.sha256'),manifest.text);
    writeJson('retained-hosting-config.json',config);
    return {artifactId:binding.artifactId,archiveSha256:binding.archiveSha256,
      sourceSha:binding.sourceSha,buildId:binding.buildId,hostedFileCount:manifest.fileCount,
      hostedPayloadDigest:manifest.digest,manifestFile:'retained-site-manifest.sha256'};
  });
  if(!local)fail('LOCAL_BINDING_FAILED_NO_HOSTING_READS_ATTEMPTED');

  await check('artifact_run_metadata',async()=>{
    const token=requiredEnv('GH_TOKEN');
    async function githubGet(suffix){
      const response=await fetch('https://api.github.com/repos/paulaosoriof86/orbit360-core/'+suffix,{
        headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
        redirect:'error',signal:AbortSignal.timeout(30000)
      });
      requireValue(response.ok,'GITHUB_METADATA_HTTP_'+response.status);
      return response.json();
    }
    const artifact=await githubGet('actions/artifacts/'+binding.artifactId);
    const run=await githubGet('actions/runs/'+binding.runId);
    exact(artifact.id,binding.artifactId,'ARTIFACT_ID_MISMATCH');
    exact(artifact.name,'gi-b4003-immutable-release-bundle-'+binding.runId,'ARTIFACT_NAME_MISMATCH');
    exact(artifact.expired,false,'ARTIFACT_EXPIRED');
    exact(artifact.digest,'sha256:'+binding.artifactZipSha256,'ARTIFACT_ZIP_DIGEST_MISMATCH');
    exact(artifact.workflow_run?.id,binding.runId,'ARTIFACT_ORIGIN_RUN_MISMATCH');
    exact(artifact.workflow_run?.head_sha,binding.sourceSha,'ARTIFACT_ORIGIN_SOURCE_MISMATCH');
    exact(run.id,binding.runId,'SOURCE_RUN_ID_MISMATCH');
    exact(run.head_sha,binding.sourceSha,'SOURCE_RUN_SHA_MISMATCH');
    exact(run.head_branch,'recovery/fase-a-clean-20260831','SOURCE_RUN_BRANCH_MISMATCH');
    exact(run.conclusion,'success','SOURCE_RUN_NOT_SUCCESS');
    const evidence={artifactId:artifact.id,name:artifact.name,zipDigest:artifact.digest,
      expired:artifact.expired,expiresAt:artifact.expires_at,runId:run.id,sourceSha:run.head_sha,conclusion:run.conclusion};
    writeJson('artifact-origin.json',evidence);
    return evidence;
  });
  const auth=await check('reuse_existing_service_account_for_gets',async()=>{
    const cliPackage=requiredEnv('FIREBASE_CLI_PACKAGE');
    const requireCli=createRequire(cliPackage);
    const {GoogleAuth}=requireCli('google-auth-library');
    const account=JSON.parse(fs.readFileSync(requiredEnv('GOOGLE_APPLICATION_CREDENTIALS'),'utf8'));
    exact(account.type,'service_account','CREDENTIAL_TYPE_MISMATCH');
    exact(account.project_id,binding.projectId,'CREDENTIAL_PROJECT_MISMATCH');
    authClient=await new GoogleAuth({keyFile:env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes:['https://www.googleapis.com/auth/firebase.hosting.readonly']}).getClient();
    return {projectId:account.project_id,googleApiMethod:'GET',hostingEndpoint:apiRoot};
  });
  if(!auth)fail('READONLY_AUTH_SETUP_FAILED');

  liveBefore=await check('live_before_snapshot',async()=>{
    const snapshot=await liveSnapshot('before-'+env.GITHUB_RUN_ID);
    writeJson('live-before.json',snapshot);
    return snapshot;
  });
  await check('preview_version_and_all_served_bytes',async()=>{
    previewChannel=await getChannel(binding.previewChannelId);
    exact(previewChannel.url,binding.previewUrl,'PREVIEW_URL_MISMATCH');
    const compact=compactChannel(previewChannel);
    const version=await hostingGet(compact.versionName);
    exact(version.status,'FINALIZED','PREVIEW_VERSION_NOT_FINALIZED');
    const files=await listFiles(compact.versionName);
    // Persist actual metadata and path counts before any comparison can fail.
    writeJson('preview-hosting-version-observed.json',{channel:compact,version,files,
      metadataFileCount:version.fileCount ?? null,listedFileCount:files.length,
      retainedSiteFileCount:manifest.fileCount});
    const transportContract=previewFileContract(version,files,manifest);
    writeJson('preview-hosting-version.json',{channel:compact,version,files,transportContract});
    const readback=await readManifest(binding.previewUrl,transportContract.productFiles.map(r=>r.path),manifest.rows,'preview',
      binding.archiveSha256.slice(0,16)+'-'+env.GITHUB_RUN_ID,manifest.digest);
    exact(readback.digest,manifest.digest,'PREVIEW_MANIFEST_DIGEST_MISMATCH');
    exact(readback.marker?.sourceSha,binding.sourceSha,'PREVIEW_MARKER_SOURCE_MISMATCH');
    exact(readback.marker?.buildId,binding.buildId,'PREVIEW_MARKER_BUILD_MISMATCH');
    exact(versionName(await getChannel(binding.previewChannelId)),compact.versionName,'PREVIEW_CHANNEL_MOVED_DURING_READBACK');
    receipt.previewVersionName=compact.versionName;
    return {...compact,...readback,immutableArtifactId:binding.artifactId,
      hostingFileCount:transportContract.metadataFileCount,
      hostingManagedInitFileCount:transportContract.managedInitFileCount,
      hostingManagedInitPaths:transportContract.managedInitPaths,
      transportContractEvidence:'preview-hosting-version.json'};
  });
  await check('certified_rollback_version_and_all_served_bytes',async()=>{
    const cert=cp.certifiedCandidate;
    requireValue(cert && typeof cert==='object','CERTIFIED_CANDIDATE_MISSING');
    exact(cert.sourceSha,requiredEnv('ROLLBACK_SOURCE_SHA'),'ROLLBACK_SOURCE_NOT_EXPECTED_CERTIFIED');
    exact(cert.buildId,requiredEnv('ROLLBACK_BUILD_ID'),'ROLLBACK_BUILD_NOT_EXPECTED_CERTIFIED');
    exact(cert.previewChannelId,requiredEnv('ROLLBACK_CHANNEL'),'ROLLBACK_CHANNEL_NOT_EXPECTED_CERTIFIED');
    exact(Number(cert.hostedFileCount),Number(requiredEnv('ROLLBACK_FILE_COUNT')),'ROLLBACK_FILE_COUNT_NOT_CERTIFIED');
    exact(cert.hostedPayloadDigest,requiredEnv('ROLLBACK_PAYLOAD_SHA256'),'ROLLBACK_DIGEST_NOT_CERTIFIED');
    try{
      rollbackChannel=await getChannel(cert.previewChannelId);
    }catch(originalError){
      if(String(originalError?.message)==='HOSTING_GET_404:projects/-/sites/'+binding.site+'/channels/'+cert.previewChannelId){
        try{await observeCertifiedLiveReleaseHistoryFirstPage();}
        catch(probeError){receipt.liveReleaseHistoryProbeError=safeCode(probeError);}
      }
      throw originalError; // Preserve the original rollback failure and seven-check contract.
    }
    exact(rollbackChannel.url,cert.previewUrl,'ROLLBACK_URL_MISMATCH');
    const compact=compactChannel(rollbackChannel);
    const version=await hostingGet(compact.versionName);
    exact(version.status,'FINALIZED','ROLLBACK_VERSION_NOT_FINALIZED');
    const files=await listFiles(compact.versionName);
    exact(Number(version.fileCount),Number(cert.hostedFileCount),'ROLLBACK_VERSION_FILE_COUNT_MISMATCH');
    exact(files.length,Number(cert.hostedFileCount),'ROLLBACK_PATH_COUNT_MISMATCH');
    writeJson('rollback-hosting-version.json',{channel:compact,version,files});
    // Hosting API hashes are not assumed to equal hashes of raw served bytes.
    // Reconstruct the same raw-file manifest used by the certified packager.
    const readback=await readManifest(cert.previewUrl,files.map(r=>r.path),null,'rollback','rollback-'+env.GITHUB_RUN_ID,cert.hostedPayloadDigest);
    exact(readback.digest,cert.hostedPayloadDigest,'ROLLBACK_CERTIFIED_PAYLOAD_DIGEST_MISMATCH');
    exact(readback.marker?.sourceSha,cert.sourceSha,'ROLLBACK_MARKER_SOURCE_MISMATCH');
    exact(readback.marker?.buildId,cert.buildId,'ROLLBACK_MARKER_BUILD_MISMATCH');
    exact(versionName(await getChannel(cert.previewChannelId)),compact.versionName,'ROLLBACK_CHANNEL_MOVED_DURING_READBACK');
    receipt.rollbackVersionName=compact.versionName;
    return {...compact,...readback,certifiedSourceSha:cert.sourceSha,certifiedBuildId:cert.buildId};
  });
  await check('live_unchanged_after_readonly_preflight',async()=>{
    requireValue(liveBefore,'LIVE_BEFORE_SNAPSHOT_REQUIRED');
    const after=await liveSnapshot('after-'+env.GITHUB_RUN_ID);
    writeJson('live-after.json',after);
    exact(after.channel.versionName,liveBefore.channel.versionName,'LIVE_VERSION_CHANGED_DURING_PREFLIGHT');
    exact(JSON.stringify(after.origins),JSON.stringify(liveBefore.origins),'LIVE_BYTES_CHANGED_DURING_PREFLIGHT');
    receipt.liveVersionName=after.channel.versionName;
    return {versionName:after.channel.versionName,origins:after.origins,
      note:'Observed LIVE bytes are a stability snapshot, not a certified rollback binding.'};
  });
}catch(e){
  receipt.terminalCode=safeCode(e);
  issues++;
}finally{
  receipt.finishedAtUtc=new Date().toISOString();
  receipt.status=issues===0?'EXACT_RETAINED_ARTIFACT_HOSTING_PREFLIGHT_PASS':'EXACT_RETAINED_ARTIFACT_HOSTING_PREFLIGHT_FAIL';
  receipt.failedCheckCount=receipt.checks.filter(x=>x.status==='FAIL').length;
  writeReceipt();
  // The retained artifact already preserves product bytes; evidence contains only
  // manifests, metadata, receipts, and Hosting config. Remove temporary expansion.
  fs.rmSync(path.join(out,'expanded'),{recursive:true,force:true});
  console.log(JSON.stringify({status:receipt.status,checks:receipt.checks.map(c=>({name:c.name,status:c.status,code:c.code})),
    evidenceDirectory:out,previewVersionName:receipt.previewVersionName,
    rollbackVersionName:receipt.rollbackVersionName,liveVersionName:receipt.liveVersionName}));
  process.exitCode=issues===0?0:1;
}


