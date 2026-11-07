#!/usr/bin/env node
/**
 * B4-003: certify the retained I5 version through the existing Preview only.
 * No build, upload, new version/channel, LIVE release, backend or data mutation.
 * Default is no action: exactly --certify or --restore-only is required.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const PIN=Object.freeze({
  repository:'paulaosoriof86/orbit360-core',branch:'recovery/fase-a-clean-20260831',
  site:'ays-orbit-360-lab',projectNumber:'646761409743',
  channel:'gi-i65-b4-rc-41765742748',
  url:'https://ays-orbit-360-lab--gi-i65-b4-rc-41765742748-neoi3u7r.web.app',
  currentVersion:'sites/ays-orbit-360-lab/versions/c5e1ae001fae793b',
  rollbackVersion:'sites/ays-orbit-360-lab/versions/5d35a2bd0b326e75',
  liveVersion:'sites/ays-orbit-360-lab/versions/3087fabd2db9b639',
  source:'857f1222f360a42a06e012810a1c01bce155a26f',build:'gi-i65-b4-857f1222f360-57f234755dc1',
  artifactId:13549460562,productCount:218,
  productDigest:'308b669105c380294177f1a8d2350216af95fec31f800955d611e607542b42da',
  archiveDigest:'5af8e1e6e98e861c5c1a2e25324841ac9dfb07fffae0524c1cabc1a6282ad338',
  rollbackSource:'4bf67a3738751fe2432a130fd23254a6f1c7d16e',
  rollbackBuild:'gi-i65-4bf67a373875-57f234755dc1',rollbackCount:209,
  rollbackDigest:'84a74f46498618ca36c142ff844dbfe670df5a64501a1ceca22d5cd069e62767',
  trigger:'test(b4-003): certify retained rollback in existing Preview',
  evidenceOrigin:{runId:42318956784,artifactId:13551768280,
    zipSha256:'8222a261719bb4c39695aa76460e206fcc7263f0c059658d19bc275102f3d37a'},
  managedInitPaths:['__/firebase/init.js','__/firebase/init.json']
});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const eq=(a,b,code)=>need(a===b,code);
const safe=e=>String(e?.message || 'ERROR').replace(/[^A-Z0-9_.:-]/gi,'_').slice(0,200);
const clone=v=>JSON.parse(JSON.stringify(v));
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const sortedPaths=rows=>rows.map(r=>r.path).sort();
const canonicalName=value=>{
  need(typeof value==='string','RESOURCE_NAME_NOT_STRING');
  return value.startsWith('projects/'+PIN.projectNumber+'/')?
    value.slice(('projects/'+PIN.projectNumber+'/').length):value;
};
function channelVersion(channel){
  eq(canonicalName(channel.name),'sites/'+PIN.site+'/channels/'+channel.name.split('/').pop(),'CHANNEL_WRONG_PROJECT_OR_SITE');
  const value=canonicalName(channel.release?.version?.name);
  need([PIN.currentVersion,PIN.rollbackVersion,PIN.liveVersion].includes(value),'UNEXPECTED_CHANNEL_VERSION');
  return value;
}
export function partitionFiles(version,rows,count){
  need([PIN.currentVersion,PIN.rollbackVersion].includes(canonicalName(version.name)),'VERSION_NAME_INVALID');
  need(Array.isArray(rows),'FILES_REQUIRED');
  eq(Number(version.fileCount),rows.length,'METADATA_LIST_COUNT_MISMATCH');
  const files=rows.map(f=>{
    need(typeof f.path==='string','PATH_REQUIRED');
    const p=f.path.replace(/^\//,'');
    need(p && !p.startsWith('/') && !p.includes('\\') && !/[\r\n]/.test(p) &&
      p.split('/').every(x=>x && x!=='.' && x!=='..'),'INVALID_PATH');
    eq(f.status,'ACTIVE','FILE_NOT_ACTIVE');
    return {path:p,hostingHash:f.hash ?? f.hostingHash,status:f.status};
  }).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  eq(new Set(files.map(f=>f.path)).size,files.length,'DUPLICATE_PATH');
  const managed=files.filter(f=>PIN.managedInitPaths.includes(f.path));
  const product=files.filter(f=>!PIN.managedInitPaths.includes(f.path));
  eq(JSON.stringify(sortedPaths(managed)),JSON.stringify(PIN.managedInitPaths),'MANAGED_INIT_SET_MISMATCH');
  eq(product.length,count,'PRODUCT_COUNT_MISMATCH');
  return {files,managed,product};
}
export function validatePrecheck(pre,observed,previewRows,env){
  eq(pre.runnerCommit,env.GITHUB_SHA,'PRECHECK_COMMIT_MISMATCH');
  eq(String(pre.runId),String(env.GITHUB_RUN_ID),'PRECHECK_NOT_SAME_RUN');
  eq(pre.checks?.length,7,'SEVEN_PRECHECKS_REQUIRED');
  const names=['exact_candidate_and_archive','artifact_run_metadata','reuse_existing_service_account_for_gets',
    'live_before_snapshot','preview_version_and_all_served_bytes','certified_rollback_version_and_all_served_bytes',
    'live_unchanged_after_readonly_preflight'];
  eq(JSON.stringify(pre.checks.map(c=>c.name)),JSON.stringify(names),'PRECHECK_NAMES_MISMATCH');
  for(const c of pre.checks){
    if(c.name===names[5]){
      eq(c.status,'FAIL','EXPECTED_ONLY_OLD_CHANNEL_404');
      eq(c.code,'HOSTING_GET_404:projects_-_sites_ays-orbit-360-lab_channels_gi-i5-rb-34723814583','UNEXPECTED_ROLLBACK_PRECHECK_FAILURE');
    }else eq(c.status,'PASS','PRECHECK_NOT_PASS_'+c.name);
  }
  eq(pre.previewVersionName,PIN.currentVersion,'PRECHECK_PREVIEW_MOVED');
  eq(pre.liveVersionName,PIN.liveVersion,'PRECHECK_LIVE_MOVED');
  eq(pre.binding?.sourceSha,PIN.source,'PRECHECK_SOURCE_MISMATCH');
  eq(pre.binding?.buildId,PIN.build,'PRECHECK_BUILD_MISMATCH');
  eq(Number(pre.binding?.artifactId),PIN.artifactId,'PRECHECK_ARTIFACT_MISMATCH');
  eq(pre.binding?.archiveSha256,PIN.archiveDigest,'PRECHECK_ARCHIVE_MISMATCH');
  eq(observed.status,'READ_ONLY_CANDIDATE_LISTING_COMPLETE_NOT_CERTIFIED','CANDIDATE_OBSERVATION_REQUIRED');
  eq(observed.candidateVersionName,PIN.rollbackVersion,'CANDIDATE_VERSION_MISMATCH');
  eq(observed.certifiedSourceSha,PIN.rollbackSource,'CANDIDATE_SOURCE_BINDING_MISMATCH');
  eq(observed.certifiedBuildId,PIN.rollbackBuild,'CANDIDATE_BUILD_BINDING_MISMATCH');
  eq(observed.certifiedProductDigest,PIN.rollbackDigest,'CANDIDATE_DIGEST_BINDING_MISMATCH');
  eq(observed.productFileCount,PIN.rollbackCount,'CANDIDATE_COUNT_BINDING_MISMATCH');
  eq(previewRows.length,PIN.productCount,'PREVIEW_ROWS_COUNT');
  need(previewRows.every(r=>r.status===200 && r.exact===true && r.sha256===r.expectedSha256),'PREVIEW_RAW_EVIDENCE_NOT_EXACT');
  const rows=previewRows.map(r=>({path:r.path,sha256:r.sha256})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  eq(new Set(rows.map(r=>r.path)).size,rows.length,'DUPLICATE_PREVIEW_RAW_PATH');
  eq(sha(rows.map(r=>r.sha256+'  '+r.path).join('\n')+'\n'),PIN.productDigest,'PREVIEW_RAW_MANIFEST_MISMATCH');
  return rows;
}
export function validateControl(control,env){
const cursor=control[env.B4_CURSOR_KEY];
eq(cursor?.activeSourceSha,PIN.source,'CP_CURRENT_SOURCE_MISMATCH');
eq(cursor?.activeBuildId,PIN.build,'CP_CURRENT_BUILD_MISMATCH');
eq(Number(cursor?.activeImmutableArtifactId),PIN.artifactId,'CP_CURRENT_ARTIFACT_MISMATCH');
eq(cursor?.b4003Closed,false,'CP_ALREADY_CLOSED');
eq(cursor?.productionPromotionAuthorized,false,'CP_PROMOTION_SCOPE_CHANGED');
const authorization=cursor.retainedRollbackTemporaryCertificationAuthorization20261107;
const authorizationPins={status:'AUTHORIZED_EXISTING_PREVIEW_ONLY',
  authorizationId:'B4-003-RB5D35-C42-20261107',previewChannelId:PIN.channel,
  temporaryVersionName:PIN.rollbackVersion,restoreVersionName:PIN.currentVersion,
  expectedLiveVersionName:PIN.liveVersion,triggerMessage:PIN.trigger,
  evidenceRunId:PIN.evidenceOrigin.runId,evidenceArtifactId:PIN.evidenceOrigin.artifactId,
  sameRunnerCommitAsControlRequired:true,firstRunAttemptOnly:true,
  productionPromotionAuthorized:false,newChannelAllowed:false,newVersionAllowed:false,artifactRebuildAllowed:false};
for(const [key,value] of Object.entries(authorizationPins))eq(authorization?.[key],value,'CP_TEMPORARY_AUTHORIZATION_MISMATCH_'+key);
const cert=control.certifiedCandidate;
eq(cert?.sourceSha,PIN.rollbackSource,'CP_CERTIFIED_SOURCE_MISMATCH');
eq(cert?.buildId,PIN.rollbackBuild,'CP_CERTIFIED_BUILD_MISMATCH');
eq(Number(cert?.hostedFileCount),PIN.rollbackCount,'CP_CERTIFIED_COUNT_MISMATCH');
eq(cert?.hostedPayloadDigest,PIN.rollbackDigest,'CP_CERTIFIED_DIGEST_MISMATCH');
  return clone(authorizationPins);
}
// Arm is durable before the POST. Even an ambiguous/failed POST restores in finally.
export async function temporaryPreviewProbe(actions){
  await actions.guard();
  await actions.arm();
  try{
    await actions.activate();
    return await actions.verifyRollback();
  }finally{
    await actions.restore();
  }
}
export function releaseRequest(version,runId){
  need([PIN.rollbackVersion,PIN.currentVersion].includes(version),'RELEASE_VERSION_OUTSIDE_TWO_PINS');
  return {resource:'sites/'+PIN.site+'/channels/'+PIN.channel+'/releases',
    query:{versionName:version},data:{message:'B4-003 retained rollback raw certification; run '+runId+
      (version===PIN.currentVersion?'; restore exact candidate 42':'; temporary I5 verification')}};
}

export async function main(){
  const env=process.env,mode=process.argv[2];
  need(process.argv.length===3 && ['--certify','--restore-only'].includes(mode),'EXACT_MODE_REQUIRED');
  const out=path.resolve(env.B4_ROLLBACK_CERTIFY_OUT || '.b4-preflight-temp/rollback-certify');
  const preDir=path.resolve(env.B4_PREFLIGHT_OUT || '.b4-preflight-temp/evidence');
  fs.mkdirSync(out,{recursive:true});
  const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
  const journalPath=path.join(out,'rollback-certification-journal.json');
  if(mode==='--restore-only' && !fs.existsSync(journalPath)){
    console.log(JSON.stringify({status:'NO_ARMED_PREVIEW_MUTATION_TO_RESTORE'}));return;
  }
  eq(env.GITHUB_REPOSITORY,PIN.repository,'WRONG_REPOSITORY');
  eq(env.GITHUB_REF,'refs/heads/'+PIN.branch,'WRONG_BRANCH');
  if(mode==='--certify')eq(String(env.GITHUB_RUN_ATTEMPT),'1','ONLY_FIRST_WORKFLOW_ATTEMPT_AUTHORIZED');
  const checkout=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  eq(checkout,env.GITHUB_SHA,'CHECKOUT_MISMATCH');
  const requireCli=createRequire(env.FIREBASE_CLI_PACKAGE);
  const {GoogleAuth}=requireCli('google-auth-library');
  const account=readJson(env.GOOGLE_APPLICATION_CREDENTIALS);
  eq(account.project_id,PIN.site,'CREDENTIAL_PROJECT_MISMATCH');
  eq(account.type,'service_account','CREDENTIAL_TYPE_MISMATCH');
  const client=await new GoogleAuth({keyFile:env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes:['https://www.googleapis.com/auth/firebase.hosting']}).getClient();
  let journal=fs.existsSync(journalPath)?readJson(journalPath):null;
  if(journal){
    eq(journal.runnerCommit,env.GITHUB_SHA,'JOURNAL_COMMIT_MISMATCH');
    eq(String(journal.runId),String(env.GITHUB_RUN_ID),'JOURNAL_RUN_MISMATCH');
    eq(journal.previewVersionToRestore,PIN.currentVersion,'JOURNAL_RESTORE_TARGET_MISMATCH');
    eq(journal.previewChannel,PIN.channel,'JOURNAL_CHANNEL_MISMATCH');
  }
  async function get(resource,query={}){
    const channels=['projects/-/sites/'+PIN.site+'/channels/live','projects/-/sites/'+PIN.site+'/channels/'+PIN.channel];
    const versions=[PIN.currentVersion,PIN.rollbackVersion];
    need(channels.includes(resource) || versions.some(v=>resource===v || resource===v+'/files'),'GET_OUTSIDE_FIXED_RESOURCES');
    const url=new URL('https://firebasehosting.googleapis.com/v1beta1/'+resource);
    for(const [k,v] of Object.entries(query))url.searchParams.set(k,String(v));
    try{return (await client.request({url:url.toString(),method:'GET',timeout:20000,retry:false})).data;}
    catch(e){throw new Error('HOSTING_GET_'+String(e?.response?.status || e?.code || 'ERROR'));}
  }
  const getChannel=id=>get('projects/-/sites/'+PIN.site+'/channels/'+id);
  async function filesOf(version,count){
    const meta=await get(version);
    eq(canonicalName(meta.name),version,'VERSION_METADATA_WRONG_NAME');
    eq(meta.status,'FINALIZED','VERSION_NOT_FINALIZED');
    const page=await get(version+'/files',{status:'ACTIVE',pageSize:1000});
    need(!page.nextPageToken,'UNEXPECTED_FILES_PAGINATION');
    return {version:meta,...partitionFiles(meta,page.files,count)};
  }
  async function publicRead(base,rel,nonce,timeoutMs=20000){
    const url=base+'/'+rel.split('/').map(encodeURIComponent).join('/')+'?b4rollback='+encodeURIComponent(nonce);
    const r=await fetch(url,{headers:{'Accept-Encoding':'identity','Cache-Control':'no-cache, no-store','Pragma':'no-cache'},
      redirect:'follow',signal:AbortSignal.timeout(timeoutMs)});
    eq(new URL(r.url).origin,new URL(base).origin,'PUBLIC_READ_REDIRECTED_ORIGIN');
    const bytes=Buffer.from(await r.arrayBuffer());
    return {status:r.status,sha256:sha(bytes),byteCount:bytes.length,bytes};
  }
  async function readAll(paths,expectedRows,label,digest){
    const deadline=Date.now()+90000;
    const expected=expectedRows?new Map(expectedRows.map(r=>[r.path,r.sha256])):null;
    let marker,rows=[];
    for(let attempt=1;attempt<=3;attempt++){
      const results=new Array(paths.length);let cursor=0;
      await Promise.all(Array.from({length:8},async()=>{
        while(cursor<paths.length){
          const i=cursor++,rel=paths[i];
          try{
            const remaining=deadline-Date.now();
            need(remaining>0,'READBACK_BUDGET_EXHAUSTED');
            const r=await publicRead(PIN.url,rel,env.GITHUB_RUN_ID+'-'+label+'-'+attempt,Math.min(20000,remaining));
            results[i]={path:rel,status:r.status,sha256:r.sha256,byteCount:r.byteCount,
              exact:r.status===200 && (!expected || expected.get(rel)===r.sha256)};
            if(rel==='__recovery__/build.json' && r.status===200){
              try{const b=JSON.parse(r.bytes.toString('utf8'));marker={sourceSha:b.sourceSha,buildId:b.buildId};}
              catch{marker={parseError:true};}
            }
          }catch(e){results[i]={path:rel,status:'READ_ERROR',exact:false,code:safe(e)};}
        }
      }));
      rows=results.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
      const text=rows.filter(r=>r.status===200).map(r=>r.sha256+'  '+r.path).join('\n')+'\n';
      const actualDigest=sha(text);
      save(label+'-attempt-'+attempt+'-files.json',rows);save(label+'-files.json',rows);
      fs.writeFileSync(path.join(out,label+'-manifest.sha256'),text);
      if(rows.every(r=>r.exact) && actualDigest===digest)return {
        fileCount:rows.length,digest:actualDigest,marker,attempts:attempt,
        rawPayloadDigestVerified:true,filesEvidence:label+'-files.json',manifestFile:label+'-manifest.sha256'};
      need(Date.now()<deadline,label.toUpperCase()+'_READBACK_BUDGET_EXHAUSTED');
      if(attempt<3)await delay(1000);
    }
    throw new Error(label.toUpperCase()+'_RAW_BYTES_OR_DIGEST_MISMATCH');
  }
  async function liveSnapshot(label){
    const channel=await getChannel('live');
    eq(channelVersion(channel),PIN.liveVersion,'LIVE_VERSION_MOVED');
    const origins=[];
    for(const base of ['https://ays-orbit-360-lab.web.app','https://app.aysseguros.com']){
      const probes=[];
      for(const rel of ['index.html','__recovery__/build.json']){
        const r=await publicRead(base,rel,env.GITHUB_RUN_ID+'-'+label);
        probes.push({path:rel,status:r.status,sha256:r.sha256,byteCount:r.byteCount});
      }
      origins.push({base,probes});
    }
    const result={versionName:PIN.liveVersion,origins};save(label+'.json',result);return result;
  }
  async function freshHead(){
    need(env.GH_TOKEN,'GH_TOKEN_REQUIRED');
    const response=await fetch('https://api.github.com/repos/'+PIN.repository+'/git/ref/heads/'+PIN.branch,{
      headers:{Authorization:'Bearer '+env.GH_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
      redirect:'error',signal:AbortSignal.timeout(20000)});
    eq(response.status,200,'HEAD_GET_FAILED');
    eq((await response.json()).object?.sha,env.GITHUB_SHA,'BRANCH_HEAD_MOVED');
  }
  async function waitVersion(want){
    for(let i=0;i<10;i++){
      if(channelVersion(await getChannel(PIN.channel))===want)return;
      await delay(1000);
    }
    throw new Error('PREVIEW_RELEASE_READBACK_TIMEOUT');
  }
  async function postRelease(version){
    need(journal?.armed===true,'DURABLE_ARM_REQUIRED');
    const req=releaseRequest(version,env.GITHUB_RUN_ID);
    const url=new URL('https://firebasehosting.googleapis.com/v1beta1/'+req.resource);
    url.searchParams.set('versionName',req.query.versionName);
    journal.releaseAttempts.push({versionName:version,attemptedAtUtc:new Date().toISOString()});
    save('rollback-certification-journal.json',journal);
    try{
      const data=(await client.request({url:url.toString(),method:'POST',data:req.data,
        headers:{'Content-Type':'application/json'},timeout:20000,retry:false})).data;
      save(version===PIN.currentVersion?'preview-42-restore-release.json':'rollback-temporary-release.json',data);
    }catch(e){throw new Error('HOSTING_RELEASE_POST_'+String(e?.response?.status || e?.code || 'ERROR'));}
    await waitVersion(version);
  }
  async function restore(){
    need(journal?.armed===true,'RESTORE_JOURNAL_REQUIRED');
    // Restoration must still run when HEAD moved or activation returned an ambiguous error.
    let lastError;
    for(let attempt=1;attempt<=2;attempt++){
      try{
        const current=await getChannel(PIN.channel);
        eq(current.url,PIN.url,'RESTORE_CHANNEL_URL_MISMATCH');
        const active=channelVersion(current);
        need(active===PIN.currentVersion || active===PIN.rollbackVersion,'UNEXPECTED_PREVIEW_WRITER_DURING_RESTORE');
        if(active!==PIN.currentVersion)await postRelease(PIN.currentVersion);
        await waitVersion(PIN.currentVersion);
        const currentFiles=await filesOf(PIN.currentVersion,PIN.productCount);
        eq(JSON.stringify(sortedPaths(currentFiles.product)),JSON.stringify(journal.previewRows.map(r=>r.path)),'RESTORED_PATH_SET_MISMATCH');
        const restored=await readAll(journal.previewRows.map(r=>r.path),journal.previewRows,'restored-preview',PIN.productDigest);
        eq(restored.marker?.sourceSha,PIN.source,'RESTORE_SOURCE_MISMATCH');
        eq(restored.marker?.buildId,PIN.build,'RESTORE_BUILD_MISMATCH');
        eq(channelVersion(await getChannel(PIN.channel)),PIN.currentVersion,'PREVIEW_MOVED_AFTER_RESTORE_READBACK');
        const liveAfter=await liveSnapshot('live-after-restore');
        eq(JSON.stringify(liveAfter),JSON.stringify(journal.liveBefore),'LIVE_CHANGED_DURING_CERTIFICATION');
        journal.preview42RestoredVerified=true;journal.liveUnchanged=true;journal.restoredAtUtc=new Date().toISOString();
        save('rollback-certification-journal.json',journal);
        return {...restored,versionName:PIN.currentVersion,preview42RestoredVerified:true,liveUnchanged:true};
      }catch(e){lastError=e;save('restore-attempt-'+attempt+'-error.json',{code:safe(e)});}
    }
    throw lastError;
  }
  if(mode==='--restore-only'){
    const recovery=await restore();
    save('rollback-certification-recovery.json',{status:'EXACT_PREVIEW_42_RESTORED_AND_LIVE_UNCHANGED',...recovery,
      runId:env.GITHUB_RUN_ID,runnerCommit:env.GITHUB_SHA,rollbackCertifiedByThisRecovery:false});
    console.log(JSON.stringify({status:'EXACT_PREVIEW_42_RESTORED_AND_LIVE_UNCHANGED'}));return;
  }
  need(!journal,'EXISTING_JOURNAL_REQUIRES_RESTORE_ONLY');
  const result={schema:'B4_003_RETAINED_ROLLBACK_TEMPORARY_PREVIEW_CERTIFICATION_V1',
    status:'IN_PROGRESS',runId:env.GITHUB_RUN_ID,runnerCommit:env.GITHUB_SHA,startedAtUtc:new Date().toISOString(),
    historicalObservation:PIN.evidenceOrigin,rollbackCertified:false,
    preview42RestoredVerified:false,liveUnchanged:false,
    scope:{existingPreviewTemporaryReleaseOnly:true,newChannel:false,newVersion:false,artifactRebuilt:false,
      liveRelease:false,backendDeployment:false,rulesOrAuthChange:false,dataWrites:0},
    productionPromotionAuthorizedByThisReceipt:false,b4003Closed:false};
  save('rollback-certification.json',result);
  try{
    const pre=readJson(path.join(preDir,'preflight.json'));
    const started=readJson(path.join(preDir,'job-started-at.json'));
    eq(String(started.runId),String(env.GITHUB_RUN_ID),'JOB_START_RUN_MISMATCH');
    eq(started.runnerCommit,env.GITHUB_SHA,'JOB_START_COMMIT_MISMATCH');
    function requireRestorationWindow(){
      const elapsed=Date.now()-Date.parse(started.startedAtUtc);
      need(Number.isFinite(elapsed) && elapsed>=0 && elapsed<15*60*1000,'INSUFFICIENT_RESERVED_RESTORATION_WINDOW');
    }
    requireRestorationWindow();
    const candidate=readJson(path.join(preDir,'certified-version-candidate-observed.json'));
    const previewRows=validatePrecheck(pre,candidate,readJson(path.join(preDir,'preview-files.json')),env);
    result.authorization=validateControl(readJson(env.CONTROL),env);
    result.controlSha256=sha(fs.readFileSync(env.CONTROL));
    const commitMessage=execFileSync('git',['log','-1','--format=%B'],{encoding:'utf8'}).trim();
    eq(commitMessage,PIN.trigger,'WRONG_EXACT_TRIGGER');
    let rollbackFiles,liveBefore;
    const proof=await temporaryPreviewProbe({
      guard:async()=>{
        await freshHead();
        const preview=await getChannel(PIN.channel);
        eq(preview.url,PIN.url,'PREVIEW_URL_MISMATCH');
        eq(channelVersion(preview),PIN.currentVersion,'PREVIEW_NOT_EXPECTED_42');
        const current=await filesOf(PIN.currentVersion,PIN.productCount);
        eq(JSON.stringify(sortedPaths(current.product)),JSON.stringify(previewRows.map(r=>r.path)),'CURRENT_PREVIEW_PATH_SET_MISMATCH');
        rollbackFiles=await filesOf(PIN.rollbackVersion,PIN.rollbackCount);
        eq(JSON.stringify(rollbackFiles.files),JSON.stringify(candidate.files),'RETAINED_CANDIDATE_LISTING_CHANGED');
        liveBefore=await liveSnapshot('live-before-temporary-release');
        const previous=pre.checks.find(c=>c.name==='live_unchanged_after_readonly_preflight').evidence;
        const priorOrigins=previous.origins.map(o=>({base:o.base,probes:o.probes.map(p=>({path:p.path,status:p.status,sha256:p.sha256,byteCount:p.byteCount}))}));
        eq(JSON.stringify(liveBefore.origins),JSON.stringify(priorOrigins),'LIVE_BYTES_CHANGED_SINCE_PRECHECK');
      },
      arm:async()=>{
        journal={schema:'B4_003_PREVIEW_RESTORE_JOURNAL_V1',runId:env.GITHUB_RUN_ID,runnerCommit:env.GITHUB_SHA,
          previewChannel:PIN.channel,previewVersionToRestore:PIN.currentVersion,temporaryVersion:PIN.rollbackVersion,
          armed:true,previewRows,liveBefore,releaseAttempts:[],preview42RestoredVerified:false,liveUnchanged:false,
          precheckSha256:sha(fs.readFileSync(path.join(preDir,'preflight.json')))};
        save('rollback-certification-journal.json',journal);
      },
      activate:async()=>{
        requireRestorationWindow();
        await freshHead();
        eq(channelVersion(await getChannel(PIN.channel)),PIN.currentVersion,'PREVIEW_MOVED_BEFORE_POST');
        eq(channelVersion(await getChannel('live')),PIN.liveVersion,'LIVE_MOVED_BEFORE_POST');
        await postRelease(PIN.rollbackVersion);
      },
      verifyRollback:async()=>{
        eq(channelVersion(await getChannel(PIN.channel)),PIN.rollbackVersion,'TEMPORARY_VERSION_NOT_ACTIVE');
        const rb=await readAll(rollbackFiles.product.map(f=>f.path),null,'rollback',PIN.rollbackDigest);
        eq(rb.marker?.sourceSha,PIN.rollbackSource,'ROLLBACK_RAW_SOURCE_MISMATCH');
        eq(rb.marker?.buildId,PIN.rollbackBuild,'ROLLBACK_RAW_BUILD_MISMATCH');
        eq(channelVersion(await getChannel(PIN.channel)),PIN.rollbackVersion,'ROLLBACK_CHANNEL_MOVED_DURING_READBACK');
        const evidence={...rb,versionName:PIN.rollbackVersion,certifiedSourceSha:PIN.rollbackSource,
          certifiedBuildId:PIN.rollbackBuild,sourceIdentityVerified:true,runId:env.GITHUB_RUN_ID,
          runnerCommit:env.GITHUB_SHA,servedViaExistingPreview:PIN.channel};
        result.check={name:'certified_rollback_version_and_all_served_bytes',status:'PASS',evidence};
        save('rollback-certification.json',result);return evidence;
      },
      restore:async()=>{
        result.restoration=await restore();result.preview42RestoredVerified=true;result.liveUnchanged=true;
        save('rollback-certification.json',result);
      }
    });
    result.status='RETAINED_ROLLBACK_RAW_CERTIFIED_PREVIEW_42_RESTORED_LIVE_UNCHANGED';
    result.rollbackCertified=true;result.check.evidence.preview42RestoredVerified=true;
    result.check.evidence.liveUnchanged=true;result.check.evidence.rollbackCertified=true;
    result.proof=proof;
  }catch(e){
    result.status='RETAINED_ROLLBACK_CERTIFICATION_FAILED';
    result.code=safe(e);process.exitCode=1;
  }finally{
    result.finishedAtUtc=new Date().toISOString();save('rollback-certification.json',result);
    console.log(JSON.stringify({status:result.status,code:result.code,rollbackCertified:result.rollbackCertified,
      preview42RestoredVerified:result.preview42RestoredVerified,liveUnchanged:result.liveUnchanged}));
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(e=>{console.error(safe(e));process.exitCode=1;});
}

