'use strict';
// One exact failed I6.6 Preview -> the proven R11 version, within the existing
// build workflow. This is not an alternate release path or a LIVE promotion.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const reuse=require('./gravicentra-i6-6-preview-channel-reuse-guard.cjs');
const REPO='paulaosoriof86/orbit360-core',BRANCH='recovery/fase-a-clean-20260831',SITE='ays-orbit-360-lab';
const CHANNEL='gi-i66-rc-42868854629',PREVIEW='https://ays-orbit-360-lab--'+CHANNEL+'-abj14q6n.web.app';
const LIVE_ORIGINS=Object.freeze(['https://ays-orbit-360-lab.web.app','https://app.aysseguros.com']);
const BUILD_WORKFLOW='.github/workflows/gravicentra-release-delta-66-package.yml';
const CONTROL='artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json';
const FAILED=Object.freeze({sourceSha:'257695e19749a4e18f38be972b37b6b47b2225af',buildRunId:43765252188,
  artifactId:14181847038,artifactDigest:'sha256:3159ae024a6a119b11cb3f9521bd9819b0663198a1cffcd340eac4fdb91d9bf2',
  // Observed, not inferred: inventory run43758700651 attempt2/job133658728277.
  // The final old-source marker assertion failed; channel inventory itself was read-only and exact.
  hostingVersion:'sites/ays-orbit-360-lab/versions/1cccc93a6136f6f8',qaRunId:43766053717,
  qaHeadSha:'588a759a7063e8d70be26ca2c7e04bda40a7596c',qaJobId:132971308790});
const DIAGNOSTIC=Object.freeze({artifactId:14182616271,
  artifactDigest:'sha256:c998b365fad780bcadff0f8b773139b4d6f30af272c7dd24d61d00dada056b4b',
  artifactName:'gi-i66-preview-failure-diagnostic-43766053717',archiveSize:882,
  entryName:'i66-preview-failure-diagnostic.json',
  entrySha256:'f35aff0a6344248d4bebf0e92c896345a4837be8e710e183b05604706727f88d'});
const CURRENT=Object.freeze({sourceSha:'84769378eb2014addebfefdbdd63091bddc4b817',buildRunId:43503721126,
  artifactId:14075022275,artifactDigest:'sha256:b0f3bacb68511cdfc91ac934602c51f55afec5c1d6428d886d13a72a706ee283',
  hostingVersion:'sites/ays-orbit-360-lab/versions/0766db29b338befc',liveRunId:43506971214,
  liveHeadSha:'2a733fd4a28294bf57f3136b44501981a38c0c92'});
const AUTHORIZATION=Object.freeze({schema:'GI_I66_EXACT_FAILED_PREVIEW_RESTORE_V1',
  status:'EXACT_FAILED_PREVIEW_TO_R11_PREVIEW_RESTORE_AUTHORIZED',approvedByDirection:true,
  channelId:CHANNEL,previewUrl:PREVIEW,failedCandidate:FAILED,failedQaDiagnostic:DIAGNOSTIC,currentLive:CURRENT,
  inventoryRunId:43758700651,inventoryHeadSha:'ce176e1244d74c55a5453559d3f11f7b9822a0e6',inventoryRunAttempt:1,
  inventoryEvidenceUse:'ARCHIVED_READONLY_WORKFLOW_PROVENANCE_NOT_CURRENT_CHANNEL_STATE',
  expectedChannelCreatedAt:'2026-11-10T17:50:59.307316958Z',
  expectedSiteFileCount:223,backupBeforeOverwrite:true,readbackBeforeAndAfter:true,
  noLiveChanges:true,noBusinessDataWrites:true,noBackendChanges:true,noRulesAuthIamChanges:true,noChannelDeletion:true});
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function validateAuthorization(control){
  reuse.validateAuthorization(control);
  const a=control.previewChannelReuseAuthorization.failedCandidateRestore;
  assert.deepEqual(a,AUTHORIZATION,'I66_RESTORE_EXACT_AUTHORIZATION_REQUIRED');
  const c=control.currentExactHostingRelease;
  for(const [key,field] of Object.entries({sourceSha:'sourceSha',buildRunId:'previewRunId',artifactId:'artifactId',artifactDigest:'artifactDigest',hostingVersion:'liveHostingVersion',liveRunId:'liveCloneRunId'}))
    assert.equal(c[field],CURRENT[key],'I66_RESTORE_CURRENT_LIVE_POINTER_DRIFT');
  return a;
}
function inventoryRows(inventory){
  const rows=Array.isArray(inventory?.result)?inventory.result:inventory?.result?.channels;
  assert.ok(Array.isArray(rows)&&rows.length>0,'I66_RESTORE_INVENTORY_MISSING');return rows;
}
const channelId=row=>String(row.channelId||row.name||'').split('/').pop();
function version(row){
  const raw=String(row.release?.version?.name||''),prefix='projects/'+SITE+'/';
  const v=raw.startsWith(prefix)?raw.slice(prefix.length):raw;
  assert.match(v,/^sites\/ays-orbit-360-lab\/versions\/[a-zA-Z0-9_-]+$/,'I66_RESTORE_VERSION_SCOPE_DENIED');return v;
}
function assessInventory(control,inventory){
  validateAuthorization(control);const rows=inventoryRows(inventory);
  const target=rows.filter(row=>channelId(row)===CHANNEL),live=rows.filter(row=>channelId(row)==='live');
  assert.equal(target.length,1,'I66_RESTORE_TARGET_NOT_UNIQUE');assert.equal(live.length,1,'I66_RESTORE_LIVE_NOT_UNIQUE');
  assert.equal(target[0].createTime,AUTHORIZATION.expectedChannelCreatedAt,'I66_RESTORE_CHANNEL_IDENTITY_DRIFT');
  assert.equal(version(live[0]),CURRENT.hostingVersion,'I66_RESTORE_LIVE_CHANGED_STOP');
  const actual=version(target[0]);
  assert.ok([FAILED.hostingVersion,CURRENT.hostingVersion].includes(actual),'I66_RESTORE_UNAPPROVED_PREVIEW_VERSION');
  return actual===CURRENT.hostingVersion?'ALREADY_CURRENT_LIVE':'RESTORE_EXACT_FAILED_PREVIEW';
}
function validateRun(run,{id,head,path:workflow,conclusion='success'}){
  assert.equal(run?.id,id,'I66_RESTORE_RUN_ID_DRIFT');assert.equal(run.head_sha,head,'I66_RESTORE_RUN_SOURCE_DRIFT');
  assert.equal(run.head_branch,BRANCH,'I66_RESTORE_RUN_BRANCH_DRIFT');assert.equal(run.path,workflow,'I66_RESTORE_RUN_WORKFLOW_DRIFT');
  assert.equal(run.status,'completed','I66_RESTORE_RUN_INCOMPLETE');assert.equal(run.conclusion,conclusion,'I66_RESTORE_RUN_CONCLUSION_DRIFT');
}
function validateArtifact(run,artifact,expected){
  validateRun(run,{id:expected.buildRunId,head:expected.sourceSha,path:BUILD_WORKFLOW});
  assert.equal(artifact?.id,expected.artifactId,'I66_RESTORE_ARTIFACT_ID_DRIFT');
  assert.equal(artifact.name,'gi-i66-immutable-'+expected.sourceSha,'I66_RESTORE_ARTIFACT_NAME_DRIFT');
  assert.equal(artifact.expired,false,'I66_RESTORE_ARTIFACT_EXPIRED');
  assert.equal(artifact.digest,expected.artifactDigest,'I66_RESTORE_ARTIFACT_DIGEST_DRIFT');
  assert.equal(artifact.workflow_run?.id,expected.buildRunId,'I66_RESTORE_ARTIFACT_RUN_DRIFT');
  assert.equal(artifact.workflow_run?.head_sha,expected.sourceSha,'I66_RESTORE_ARTIFACT_SOURCE_DRIFT');
}
function validateFailedQa(run,job,log){
  validateRun(run,{id:FAILED.qaRunId,head:FAILED.qaHeadSha,path:'.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml',conclusion:'failure'});
  assert.equal(job?.id,FAILED.qaJobId,'I66_RESTORE_QA_JOB_DRIFT');assert.equal(job.run_id,FAILED.qaRunId,'I66_RESTORE_QA_JOB_RUN_DRIFT');
  assert.equal(job.name,'exact-preview-only','I66_RESTORE_QA_JOB_NAME_DRIFT');assert.equal(job.status,'completed','I66_RESTORE_QA_JOB_INCOMPLETE');
  assert.equal(job.conclusion,'failure','I66_RESTORE_QA_JOB_NOT_FAILED');
  const text=String(log||'');
  for(const value of ['I66_SOURCE_SHA: '+FAILED.sourceSha,'SOURCE_PACKAGE_RUN: '+FAILED.buildRunId,
    'SOURCE_ARTIFACT_ID: '+FAILED.artifactId])
    assert.ok(text.includes(value),'I66_RESTORE_QA_SOURCE_OR_LIVE_PROOF_MISSING');
  assert.match(text,/(?:^|\n)\d{4}-\d\d-\d\dT[\d:.]+Z I66_PREVIEW_BACKEND_ONLY_ZERO_LIVE_HOSTING_CHANGES_PASS(?:\r?\n|$)/,
    'I66_RESTORE_QA_LIVE_PROOF_EXECUTION_MISSING');
  const lines=text.split(/\r?\n/).filter(line=>line.includes('I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_HOLD '));
  assert.equal(lines.length,1,'I66_RESTORE_QA_CLEANUP_RECEIPT_NOT_UNIQUE');
  // The observed nested receipt is GitHub-masked. Never repair or partially
  // parse it. Accept only the two complete, exact serializations of this
  // pinned failure; structured cleanup is additionally required below.
  const receipt=lines[0].match(/^\d{4}-\d\d-\d\dT[\d:.]+Z I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_HOLD (.+)$/)?.[1];
  assert.ok(receipt,'I66_RESTORE_QA_CLEANUP_EXECUTION_MISSING');
  const expected={checks:5,cleanup:'PASS',remaining:0,realCustomerWritesRequested:0,bankMovements:0,financialPayments:0,authOrMembershipMutations:0,
    failureClass:'TIMEOUT_ERROR',failureStage:'FINANCE_UI_HYDRATION',failureCheck:'ASSERTION_OR_RUNTIME_FAILURE',
    failureLocation:{file:'gravicentra-i6-6-advisor-payables-signed-uat.cjs',line:526,column:65}};
  const json=JSON.stringify(expected);
  const observedMasked=json.replace(/^\{/,'***').replace('"failureLocation":{','"failureLocation":***').replace(/\}\}$/,'***');
  assert.ok(receipt===json||receipt===observedMasked,'I66_RESTORE_QA_ZERO_EFFECT_RECEIPT_NOT_EXACT');
  assert.ok(!text.includes('I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_PASS '),'I66_RESTORE_FAILED_QA_MISREPRESENTED');
  return sha(text);
}
function validateDiagnosticArtifact(artifact){
  assert.equal(artifact?.id,DIAGNOSTIC.artifactId,'I66_RESTORE_DIAGNOSTIC_ARTIFACT_ID_DRIFT');
  assert.equal(artifact.name,DIAGNOSTIC.artifactName,'I66_RESTORE_DIAGNOSTIC_ARTIFACT_NAME_DRIFT');
  assert.equal(artifact.digest,DIAGNOSTIC.artifactDigest,'I66_RESTORE_DIAGNOSTIC_ARTIFACT_DIGEST_DRIFT');
  assert.equal(artifact.size_in_bytes,DIAGNOSTIC.archiveSize,'I66_RESTORE_DIAGNOSTIC_ARTIFACT_SIZE_DRIFT');
  assert.equal(artifact.expired,false,'I66_RESTORE_DIAGNOSTIC_ARTIFACT_EXPIRED');
  assert.equal(artifact.workflow_run?.id,FAILED.qaRunId,'I66_RESTORE_DIAGNOSTIC_RUN_DRIFT');
  assert.equal(artifact.workflow_run?.head_sha,FAILED.qaHeadSha,'I66_RESTORE_DIAGNOSTIC_SOURCE_DRIFT');
  assert.equal(artifact.workflow_run?.head_branch,BRANCH,'I66_RESTORE_DIAGNOSTIC_BRANCH_DRIFT');
}
function validateDiagnosticBytes(bytes){
  assert.ok(Buffer.isBuffer(bytes)&&bytes.length===DIAGNOSTIC.archiveSize,'I66_RESTORE_DIAGNOSTIC_ARCHIVE_SIZE_DRIFT');
  assert.equal('sha256:'+sha(bytes),DIAGNOSTIC.artifactDigest,'I66_RESTORE_DIAGNOSTIC_ARCHIVE_BYTES_DRIFT');
}
function validateStructuredCleanup(artifact,bytes,text){
  validateDiagnosticArtifact(artifact);validateDiagnosticBytes(bytes);
  assert.equal(typeof text,'string','I66_RESTORE_DIAGNOSTIC_CONTENT_MISSING');
  assert.equal(sha(text),DIAGNOSTIC.entrySha256,'I66_RESTORE_DIAGNOSTIC_CONTENT_BYTES_DRIFT');
  let parsed;try{parsed=JSON.parse(text);}catch(_){assert.fail('I66_RESTORE_DIAGNOSTIC_JSON_INVALID');}
  const expected={schema:'I6_6_PREVIEW_DIAGNOSTIC_ONLY_V1',status:'FAILED_NOT_ACCEPTED',runId:FAILED.qaRunId,sourceSha:FAILED.sourceSha,
    reports:[{status:'HOLD',phase:'PREVIEW',failureStage:'FINANCE_UI_HYDRATION',failureCheck:'ASSERTION_OR_RUNTIME_FAILURE',
      failureClass:'TIMEOUT_ERROR',failureLocation:{file:'gravicentra-i6-6-advisor-payables-signed-uat.cjs',line:526,column:65},
      financeUiDiagnostics:{
        beforeClick:{snapshotStatus:'CAPTURED',route:'FINANZAS',tabCount:1,tabConnected:true,tabVisible:true,tabEnabled:true,
          rect:{x:1056,y:183,width:132,height:34},centerInViewport:true,targetReceivesPointer:false,topTag:'DIV',topId:null,topClasses:['drawer-back','open'],
          legalOverlayPresent:true,legalOverlayAtTarget:true,legalOverlayCount:1,modalCount:1,authRestoring:false},
        onFailure:{snapshotStatus:'CAPTURED',route:'FINANZAS',tabCount:1,tabConnected:true,tabVisible:true,tabEnabled:true,
          rect:{x:770,y:183,width:132,height:34},centerInViewport:true,targetReceivesPointer:false,topTag:'DIV',topId:null,topClasses:[],
          legalOverlayPresent:true,legalOverlayAtTarget:true,legalOverlayCount:1,modalCount:1,authRestoring:false},
        actionability:{pointerInterception:true,detached:true,notVisible:false,notEnabled:false,notStable:false,outsideViewport:false}},
      checks:5,cleanupStatus:'PASS',remaining:0}]};
  assert.deepEqual(parsed,expected,'I66_RESTORE_DIAGNOSTIC_CLEANUP_NOT_PROVEN');
  return {artifactId:DIAGNOSTIC.artifactId,artifactDigest:DIAGNOSTIC.artifactDigest,entrySha256:DIAGNOSTIC.entrySha256,
    status:'FAILED_NOT_ACCEPTED',cleanupStatus:'PASS',remaining:0};
}
function parseManifest(text){
  const lines=String(text).trim().split(/\r?\n/),seen=new Set();
  assert.equal(lines.length,223,'I66_RESTORE_SITE_FILE_COUNT_DRIFT');
  return lines.map(line=>{const match=line.match(/^([a-f0-9]{64})  ([A-Za-z0-9_./-]+)$/);
    assert.ok(match,'I66_RESTORE_MANIFEST_ENTRY_INVALID');const [,hash,relative]=match;
    assert.ok(!relative.startsWith('/')&&!relative.split('/').includes('..')&&!seen.has(relative),'I66_RESTORE_MANIFEST_PATH_DENIED');
    seen.add(relative);return {hash,relative};});
}
function cloneArguments(cli){
  assert.ok(typeof cli==='string'&&path.isAbsolute(cli),'I66_RESTORE_PINNED_CLI_REQUIRED');
  return [cli,'hosting:clone',SITE+'@0766db29b338befc',SITE+':'+CHANNEL,'--project',SITE,'--non-interactive','--json'];
}
function unchangedOtherChannels(before,after){
  const other=inventory=>inventoryRows(inventory).filter(row=>channelId(row)!==CHANNEL).sort((a,b)=>channelId(a).localeCompare(channelId(b)));
  assert.deepEqual(other(after),other(before),'I66_RESTORE_UNRELATED_CHANNEL_CHANGED');
}
async function restorePreview(control,initial,io,report){
  report.stage='EXACT_AUTHORIZATION_AND_CURRENT_CHANNELS';
  const state=assessInventory(control,initial);
  if(state==='ALREADY_CURRENT_LIVE'){
    reuse.validateChannels(control,initial);report.status='ALREADY_R11_NO_RESTORE_NEEDED';return report;
  }
  report.stage='IMMUTABLE_ARTIFACTS_AND_FAILED_QA_CLEANUP';const meta=await io.metadata();
  validateArtifact(meta.failedRun,meta.failedArtifact,FAILED);validateArtifact(meta.liveBuildRun,meta.liveArtifact,CURRENT);
  validateRun(meta.liveRun,{id:CURRENT.liveRunId,head:CURRENT.liveHeadSha,path:'.github/workflows/gravicentra-i66-r11-renewal-drive-frontend-exact-live-promotion.yml'});
  // Attempt-specific archived provenance survives later read-only reruns.
  // It never substitutes for initial/fresh inventory or full current byte proof.
  validateRun(meta.inventoryRun,{id:AUTHORIZATION.inventoryRunId,head:AUTHORIZATION.inventoryHeadSha,path:'.github/workflows/gravicentra-i66-preview-channel-inventory-readonly.yml'});
  assert.equal(meta.inventoryRun.run_attempt,AUTHORIZATION.inventoryRunAttempt,'I66_RESTORE_ARCHIVED_INVENTORY_ATTEMPT_DRIFT');
  report.failedQaLogSha256=validateFailedQa(meta.failedQaRun,meta.failedQaJob,meta.failedQaLog);
  validateDiagnosticArtifact(meta.failedQaDiagnosticArtifact);
  const diagnostic=await io.diagnostic(meta.failedQaDiagnosticArtifact);
  report.failedQaStructuredCleanup=validateStructuredCleanup(meta.failedQaDiagnosticArtifact,diagnostic.bytes,diagnostic.text);
  report.checks.push('BOTH_IMMUTABLE_ARTIFACTS_AND_FAILED_QA_CLEANUP_IDENTIFIED');
  report.stage='RECOVERABLE_ARCHIVE_BACKUP';const failed=await io.backup(FAILED,'failed'),live=await io.backup(CURRENT,'r11');
  assert.equal(failed.marker.sourceSha,FAILED.sourceSha,'I66_RESTORE_FAILED_BACKUP_SOURCE_DRIFT');
  assert.equal(live.marker.sourceSha,CURRENT.sourceSha,'I66_RESTORE_R11_BACKUP_SOURCE_DRIFT');
  report.checks.push('BOTH_ARCHIVES_DIGEST_VERIFIED_AND_RECOVERABLE');
  report.stage='BEFORE_RESTORE_ALL_THREE_ORIGINS_READBACK';await io.readback(PREVIEW,failed);
  for(const origin of LIVE_ORIGINS)await io.readback(origin,live);
  report.checks.push('FAILED_PREVIEW_AND_BOTH_LIVE_ORIGINS_223_FILES_EXACT_BEFORE');
  // Re-read just before the single mutation. A changed channel stops, never
  // silently overwrites a concurrent release or a different candidate.
  report.stage='CONCURRENT_CHANGE_GUARD';const fresh=await io.inventory();
  const ordered=inventory=>inventoryRows(inventory).slice().sort((a,b)=>channelId(a).localeCompare(channelId(b)));
  assert.deepEqual(ordered(fresh),ordered(initial),'I66_RESTORE_PRECLONE_INVENTORY_CHANGED');
  assert.equal(assessInventory(control,fresh),'RESTORE_EXACT_FAILED_PREVIEW');
  report.stage='EXACT_R11_VERSION_TO_PREVIEW_CLONE';report.previewCloneRequested=true;await io.clone();report.previewClonePerformed=true;
  report.stage='AFTER_RESTORE_CHANNEL_AND_ALL_ORIGIN_READBACK';
  const after=await io.inventory();reuse.validateChannels(control,after);unchangedOtherChannels(initial,after);
  await io.waitForPreview(live);
  await io.readback(PREVIEW,live);
  for(const origin of LIVE_ORIGINS)await io.readback(origin,live);
  reuse.validateRecoverableArtifact(control,{buildRun:meta.liveBuildRun,artifact:meta.liveArtifact,previewBuild:live.marker,liveRun:meta.liveRun});
  report.checks.push('R11_PREVIEW_AND_UNCHANGED_LIVE_223_FILES_EXACT_AFTER_EXISTING_REUSE_GUARD_PASS');
  report.status='EXACT_R11_PREVIEW_RESTORED_VERIFIED_NOT_PRODUCT_ACCEPTANCE';report.stage='COMPLETE';return report;
}
function runtimeIo(env,root){
  assert.ok(env.GH_TOKEN,'I66_RESTORE_CONFIGURED_GITHUB_CREDENTIAL_REQUIRED');
  const headers={Authorization:'Bearer '+env.GH_TOKEN,Accept:'application/vnd.github+json','User-Agent':'GI-I66-Exact-Preview-Restore'};
  const api='https://api.github.com/repos/'+REPO+'/actions/';
  const get=async(url,options={})=>{const response=await fetch(url,{...options,signal:AbortSignal.timeout(30000)});assert.ok(response.ok,'I66_RESTORE_READ_UNAVAILABLE');return response;};
  const json=async suffix=>(await get(api+suffix,{headers})).json();
  const cli=env.FIREBASE_CLI_BIN;cloneArguments(cli);
  const inventory=()=>JSON.parse(execFileSync(process.execPath,[cli,'hosting:channel:list','--project',SITE,'--non-interactive','--json'],{encoding:'utf8',stdio:'pipe',maxBuffer:5*1024*1024}));
  return {
    async metadata(){
      const values=await Promise.all([json('runs/'+FAILED.buildRunId),json('artifacts/'+FAILED.artifactId),json('runs/'+CURRENT.buildRunId),json('artifacts/'+CURRENT.artifactId),
        json('runs/'+CURRENT.liveRunId),json('runs/'+FAILED.qaRunId),json('jobs/'+FAILED.qaJobId),
        get(api+'jobs/'+FAILED.qaJobId+'/logs',{headers}).then(r=>r.text()),json('runs/'+AUTHORIZATION.inventoryRunId+'/attempts/'+AUTHORIZATION.inventoryRunAttempt),json('artifacts/'+DIAGNOSTIC.artifactId)]);
      return Object.fromEntries(['failedRun','failedArtifact','liveBuildRun','liveArtifact','liveRun','failedQaRun','failedQaJob','failedQaLog','inventoryRun','failedQaDiagnosticArtifact'].map((key,i)=>[key,values[i]]));
    },
    async diagnostic(artifact){
      validateDiagnosticArtifact(artifact);
      const bytes=Buffer.from(await (await get(api+'artifacts/'+DIAGNOSTIC.artifactId+'/zip',{headers})).arrayBuffer());
      validateDiagnosticBytes(bytes);
      const dir=path.join(root,'failed-qa');fs.mkdirSync(dir,{mode:0o700});
      const zip=path.join(dir,'verified-diagnostic.zip');fs.writeFileSync(zip,bytes,{flag:'wx',mode:0o600});
      const entries=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',stdio:'pipe',maxBuffer:65536}).trim().split(/\r?\n/);
      assert.deepEqual(entries,[DIAGNOSTIC.entryName],'I66_RESTORE_DIAGNOSTIC_ZIP_ENTRIES_DENIED');
      const text=execFileSync('unzip',['-p',zip,DIAGNOSTIC.entryName],{encoding:'utf8',stdio:'pipe',maxBuffer:65536});
      validateStructuredCleanup(artifact,bytes,text);
      fs.writeFileSync(path.join(dir,DIAGNOSTIC.entryName),text,{flag:'wx',mode:0o600});
      return {bytes,text};
    },
    async backup(expected,label){
      const dir=path.join(root,label);fs.mkdirSync(dir,{mode:0o700});
      const bytes=Buffer.from(await (await get(api+'artifacts/'+expected.artifactId+'/zip',{headers})).arrayBuffer());
      assert.ok(bytes.length>0&&bytes.length<50*1024*1024,'I66_RESTORE_ARCHIVE_SIZE_INVALID');
      assert.equal('sha256:'+sha(bytes),expected.artifactDigest,'I66_RESTORE_ARCHIVE_BYTES_DRIFT');
      const zip=path.join(dir,'verified-backup.zip');fs.writeFileSync(zip,bytes,{flag:'wx',mode:0o600});
      const entries=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',stdio:'pipe'}).trim().split(/\r?\n/).sort();
      assert.deepEqual(entries,['gi-i66-exact-package.sha256','gi-i66-exact-package.tar.gz'],'I66_RESTORE_ZIP_ENTRIES_DENIED');
      execFileSync('unzip',['-q',zip,'-d',dir],{stdio:'pipe'});
      const tar=path.join(dir,'gi-i66-exact-package.tar.gz'),sum=fs.readFileSync(path.join(dir,'gi-i66-exact-package.sha256'),'utf8').match(/^([a-f0-9]{64})\s+/)?.[1];
      assert.ok(sum,'I66_RESTORE_TAR_DIGEST_MISSING');assert.equal(sha(fs.readFileSync(tar)),sum,'I66_RESTORE_TAR_BYTES_DRIFT');
      const listing=execFileSync('tar',['-tzf',tar],{encoding:'utf8',stdio:'pipe'}).trim().split(/\r?\n/);
      assert.ok(listing.length>223&&listing.length<2000&&listing.every(p=>/^(?:bundle|evidence)(?:\/|$)/.test(p)&&!p.split('/').includes('..')),'I66_RESTORE_TAR_PATH_DENIED');
      const types=execFileSync('tar',['-tvzf',tar],{encoding:'utf8',stdio:'pipe'}).trim().split(/\r?\n/);
      assert.ok(types.every(line=>/^[d-]/.test(line)),'I66_RESTORE_TAR_LINK_DENIED');
      execFileSync('tar',['-xzf',tar,'--no-same-owner','--no-same-permissions','-C',dir],{stdio:'pipe'});
      const site=path.join(dir,'bundle/site'),manifest=parseManifest(fs.readFileSync(path.join(dir,'evidence/site-manifest.sha256'),'utf8'));
      for(const file of manifest)assert.equal(sha(fs.readFileSync(path.join(site,file.relative))),file.hash,'I66_RESTORE_LOCAL_SITE_BYTES_DRIFT');
      const marker=JSON.parse(fs.readFileSync(path.join(site,'__recovery__/build.json'),'utf8'));
      assert.equal(marker.sourceSha,expected.sourceSha,'I66_RESTORE_BACKUP_SOURCE_DRIFT');assert.equal(marker.gate,'I6.6','I66_RESTORE_BACKUP_GATE_DRIFT');
      return {site,manifest,marker};
    },
    async readback(origin,bundle){
      assert.ok([PREVIEW,...LIVE_ORIGINS].includes(origin),'I66_RESTORE_READBACK_ORIGIN_DENIED');
      for(let start=0;start<bundle.manifest.length;start+=8)await Promise.all(bundle.manifest.slice(start,start+8).map(async file=>{
        const response=await get(origin+'/'+file.relative,{headers:{'cache-control':'no-cache'}}),bytes=Buffer.from(await response.arrayBuffer());
        assert.equal(sha(bytes),file.hash,'I66_RESTORE_HOSTED_FILE_HASH_DRIFT');
      }));
    },
    async waitForPreview(bundle){
      const expected=bundle.manifest.find(file=>file.relative==='__recovery__/build.json');
      assert.ok(expected,'I66_RESTORE_BUILD_MARKER_MISSING');
      // Bounded propagation wait for exact bytes, never a fallback source.
      for(let attempt=0;attempt<20;attempt++){
        try{const response=await get(PREVIEW+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}});
          if(sha(Buffer.from(await response.arrayBuffer()))===expected.hash)return;
        }catch(_){}
        if(attempt<19)await new Promise(resolve=>setTimeout(resolve,2000));
      }
      assert.fail('I66_RESTORE_EXACT_PREVIEW_MARKER_NOT_VISIBLE');
    },
    inventory,
    async clone(){execFileSync(process.execPath,cloneArguments(cli),{encoding:'utf8',stdio:'pipe',maxBuffer:5*1024*1024});}
  };
}
async function main(env=process.env){
  assert.equal(env.GITHUB_ACTIONS,'true','I66_RESTORE_WORKFLOW_ONLY');assert.equal(env.GITHUB_REPOSITORY,REPO,'I66_RESTORE_REPOSITORY_DENIED');
  assert.equal(env.GITHUB_REF,'refs/heads/'+BRANCH,'I66_RESTORE_BRANCH_DENIED');
  assert.equal(env.GITHUB_WORKFLOW,'Gravicentra I6.6 Build Immutable Release Package','I66_RESTORE_EXISTING_BUILD_WORKFLOW_REQUIRED');
  assert.ok(env.RUNNER_TEMP&&path.isAbsolute(env.RUNNER_TEMP),'I66_RESTORE_RUNNER_TEMP_REQUIRED');
  const repo=path.resolve(__dirname,'..'),control=JSON.parse(fs.readFileSync(path.join(repo,CONTROL),'utf8'));
  const initial=JSON.parse(fs.readFileSync(path.join(env.RUNNER_TEMP,'gi-i66-reuse-before.json'),'utf8'));
  if(!control.previewChannelReuseAuthorization?.failedCandidateRestore){reuse.validateChannels(control,initial);console.log('I66_PREVIEW_RESTORE_NOT_REQUESTED_CURRENT_LIVE_REUSE_GUARD_PASS');return;}
  const root=fs.mkdtempSync(path.join(env.RUNNER_TEMP,'gi-i66-preview-restore-'));
  const report={schema:'GI_I66_PREVIEW_RESTORE_RECEIPT_V1',status:'HOLD',channelId:CHANNEL,failedSourceSha:FAILED.sourceSha,
    currentLiveSourceSha:CURRENT.sourceSha,previewCloneRequested:false,previewClonePerformed:false,checks:[],liveWrites:0,backendWrites:0,businessDataWrites:0,authIamWrites:0,channelDeletions:0,productAccepted:false};
  try{await restorePreview(control,initial,runtimeIo(env,root),report);}
  catch(error){report.failureCode=String(error?.message||'').match(/\bI66_(?:RESTORE|REUSE|QUOTA_RECOVERY)_[A-Z0-9_]+\b/)?.[0]||'ASSERTION_OR_RUNTIME_FAILURE';throw error;}
  finally{fs.writeFileSync(path.join(root,'restore-receipt.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
    if(report.status==='HOLD')console.error('I66_PREVIEW_RESTORE_HOLD_STAGE '+String(report.stage||'RUNTIME_SETUP')+' CODE '+String(report.failureCode||'UNCLASSIFIED'));}
  console.log('I66_PREVIEW_RESTORE_RESULT '+JSON.stringify(report));
}
module.exports={FAILED,DIAGNOSTIC,CURRENT,AUTHORIZATION,PREVIEW,CHANNEL,LIVE_ORIGINS,validateAuthorization,assessInventory,validateArtifact,validateFailedQa,validateDiagnosticArtifact,validateDiagnosticBytes,validateStructuredCleanup,parseManifest,cloneArguments,unchangedOtherChannels,restorePreview,main};
if(require.main===module)main().catch(()=>{console.error('I66_PREVIEW_RESTORE_HOLD_FAIL_CLOSED');process.exitCode=1;});
