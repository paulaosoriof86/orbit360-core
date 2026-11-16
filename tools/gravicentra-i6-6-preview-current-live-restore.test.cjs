'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const restore=require('./gravicentra-i6-6-preview-current-live-restore.cjs');
const {AUTHORIZATION:A,FAILED:F,DIAGNOSTIC:D,CURRENT:C,CHANNEL,PREVIEW,LIVE_ORIGINS}=restore;
const clone=value=>JSON.parse(JSON.stringify(value));
const BUILD='.github/workflows/gravicentra-release-delta-66-package.yml';
const BRANCH='recovery/fase-a-clean-20260831';
const stamp='2026-11-15T16:40:18.1624532Z ';
// Exact sanitized artifact14182616271, independently retrieved and hashed.
// Contains no actor, credential, business row, raw error or URL.
const diagnosticBytes=Buffer.from('UEsDBBQACAAIAAKvb10AAAAAAAAAAAAAAAAjAAAAaTY2LXByZXZpZXctZmFpbHVyZS1kaWFnbm9zdGljLmpzb27lVU1v2kAQvfMrLJ9DxacduFngNJYoRrahSqvIGi+DvY3ZtXbXpCjKf6/WEAyGqvfmsod5b2bn443mrWUYpiQZbsEcG6ZnxVa8CNyV536Pp57zde6HkTeJ/fnsKV51zbuKrkCVUtMfHG/mTuO5H8XOZOIuInd6oIiSeWtzbAz6tmV1hn27ax9ceSkIhln1WW9oW6Mhdkf2YAQD7N5v+vcJjuxe0rcTKxnYSa/XG8LmGBILLpT+9mfLMAzjrXov0nn0Z4f/K3uRgURtPtZTIxugeSkwVJBWhAdv7swnbrz04senaeBEnj+/Yk8yJC+a7YShG2hK7AdxsJxH3jc31p1YBu61Vw6yyk2z/GUUu0HgB1e0GSegKGfm+FSXBmle5ZcK2FGCTAloU6tttWG9o5KLdgF7SHKUbUlThut2CeoL+SVP4Q3DzCnTMYY968xIeF5u9WfW8Gh8rzOiDBjBJZ1SSBmXihJ5mVaCG64ro1U/akDPgkEhM67C00wmziJaBu70LCc9TF6quvU/nPASVpBMeMmUOTa61wBjSBRqeSlRYhNfUUmTqm+3UJfpht30FUhUox7DMH/rHDpD6+7SvNfm+37D+krXKtNIv9dAMqRppsP3B2fA+0UCesIoPLai+Kq1frsEkaIKkCDdoVxwql3MsbGBXDaYvIgg1T2eeiuzCVXbyco8bwKVYLFesxO2FvCKop0AeTEbxfECmXlmer4ImmMKub9DkcN+IVAiu1nZOc1RUVXnv3i3RbLla8hvQ1CqLECpuKAs/WjbiXA2DpOzh8Nqfg6J23bnEyr8fxAqEH04IKE5VfumWItD+zz9ECyOJ+Yq1TUqINltzTCuar1dD4FxVQvuJhwq+JszL5WkazyTQ6POq+tE9BXWsxvWphyBlUW9jwsnrJfNFLgFyg5d7LQ+oj633lt/AFBLBwjf+Hy5ugIAAPwIAABQSwECLQMUAAgACAACr29d3/h8uboCAAD8CAAAIwAAAAAAAAAAACAApIEAAAAAaTY2LXByZXZpZXctZmFpbHVyZS1kaWFnbm9zdGljLmpzb25QSwUGAAAAAAEAAQBRAAAACwMAAAAA','base64');
function run(id,head,path=BUILD,conclusion='success'){
  return {id,head_sha:head,head_branch:BRANCH,path,status:'completed',conclusion};
}
function artifact(x){return {id:x.artifactId,name:'gi-i66-immutable-'+x.sourceSha,expired:false,digest:x.artifactDigest,
  workflow_run:{id:x.buildRunId,head_sha:x.sourceSha}};}
function fixture(){
  const current={status:'PUBLISHED_EXACT_R11_223_FILES_SIGNED_FRONTEND_HOSTING_ONLY_PARTIAL',sourceSha:C.sourceSha,
    artifactId:C.artifactId,artifactDigest:C.artifactDigest,previewRunId:C.buildRunId,liveCloneRunId:C.liveRunId,
    liveHostingVersion:C.hostingVersion,readbackEachOrigin:223};
  const control={schema:'GRAVICENTRA_I6_6_SINGLE_ARTIFACT_RELEASE_TRANSPORT_V1',gate:'I6.6',historicalClosedGate:'B4-007',
    status:'PREVIEW_BUILD_REQUESTED',livePromotionAuthorized:false,previewApproved:false,forbidBackendFunctionDeploy:true,
    forbidBackendLiveFunctionDeploy:true,noHostingPromotion:true,forbidFirestoreRulesDataAuthWrites:true,currentExactHostingRelease:current,
    previewChannelReuseAuthorization:{status:'CURRENT_LIVE_BACKED_SINGLE_PREVIEW_REUSE_AUTHORIZED',approvedByDirection:true,
      authorizedChannelId:CHANNEL,expectedPreviewUrl:PREVIEW,expectedSourceSha:C.sourceSha,expectedHostingVersion:C.hostingVersion,
      recoverableBuildRunId:C.buildRunId,recoverableArtifactId:C.artifactId,recoverableArtifactDigest:C.artifactDigest,
      noLiveChanges:true,noBusinessDataWrites:true,noChannelDeletion:true,stopOnIdentityDrift:true,failedCandidateRestore:clone(A)}};
  const initial={status:'success',result:[
    {channelId:CHANNEL,createTime:A.expectedChannelCreatedAt,release:{version:{name:F.hostingVersion}}},
    {channelId:'live',createTime:'2026-06-10T19:54:28.008180884Z',release:{version:{name:C.hostingVersion}}},
    {channelId:'untouched-preview',release:{version:{name:'sites/ays-orbit-360-lab/versions/unrelated'}}}
  ]};
  const after=clone(initial);after.result[0].release.version.name=C.hostingVersion;
  const qaReceipt={checks:5,cleanup:'PASS',remaining:0,realCustomerWritesRequested:0,bankMovements:0,financialPayments:0,authOrMembershipMutations:0,
    failureClass:'TIMEOUT_ERROR',failureStage:'FINANCE_UI_HYDRATION',failureCheck:'ASSERTION_OR_RUNTIME_FAILURE',
    failureLocation:{file:'gravicentra-i6-6-advisor-payables-signed-uat.cjs',line:526,column:65}};
  const qaLog=[stamp+'I66_SOURCE_SHA: '+F.sourceSha,stamp+'SOURCE_PACKAGE_RUN: '+F.buildRunId,
    stamp+'SOURCE_ARTIFACT_ID: '+F.artifactId,stamp+'I66_PREVIEW_BACKEND_ONLY_ZERO_LIVE_HOSTING_CHANGES_PASS',
    stamp+'I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_HOLD '+JSON.stringify(qaReceipt).replace(/^\{/,'***').replace('"failureLocation":{','"failureLocation":***').replace(/\}\}$/,'***')].join('\n');
  const diagnostic={schema:'I6_6_PREVIEW_DIAGNOSTIC_ONLY_V1',status:'FAILED_NOT_ACCEPTED',runId:F.qaRunId,sourceSha:F.sourceSha,
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
  const diagnosticText=JSON.stringify(diagnostic,null,2)+'\n';
  const meta={failedRun:run(F.buildRunId,F.sourceSha),failedArtifact:artifact(F),liveBuildRun:run(C.buildRunId,C.sourceSha),liveArtifact:artifact(C),
    liveRun:run(C.liveRunId,C.liveHeadSha,'.github/workflows/gravicentra-i66-r11-renewal-drive-frontend-exact-live-promotion.yml'),
    inventoryRun:{...run(A.inventoryRunId,A.inventoryHeadSha,'.github/workflows/gravicentra-i66-preview-channel-inventory-readonly.yml'),run_attempt:A.inventoryRunAttempt},
    failedQaRun:run(F.qaRunId,F.qaHeadSha,'.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml','failure'),
    failedQaJob:{id:F.qaJobId,run_id:F.qaRunId,name:'exact-preview-only',status:'completed',conclusion:'failure'},failedQaLog:qaLog,
    failedQaDiagnosticArtifact:{id:D.artifactId,name:D.artifactName,digest:D.artifactDigest,size_in_bytes:D.archiveSize,expired:false,
      workflow_run:{id:F.qaRunId,head_sha:F.qaHeadSha,head_branch:BRANCH}}};
  const report={status:'HOLD',checks:[],previewClonePerformed:false,previewCloneRequested:false,productAccepted:false};
  return {control,initial,after,meta,report,qaReceipt,diagnosticText};
}
function ioFixture(f){
  const events=[];let inventories=0;
  const io={async metadata(){events.push('metadata');return f.meta;},
    async diagnostic(){events.push('diagnostic');return {bytes:Buffer.from(diagnosticBytes),text:f.diagnosticText};},
    async backup(expected,label){events.push('backup:'+label);return {marker:{sourceSha:expected.sourceSha,gate:'I6.6'},label};},
    async readback(origin,bundle){events.push('readback:'+origin+':'+bundle.label);},
    async waitForPreview(bundle){events.push('wait-exact:'+bundle.label);},
    async inventory(){events.push('inventory');return clone(inventories++===0?f.initial:f.after);},
    async clone(){events.push('clone-exact-preview');}};
  return {io,events};
}

test('exact failed Preview pair uses the unmodified R11 reuse authority',()=>{
  const f=fixture();assert.deepEqual(restore.validateAuthorization(f.control),A);
  assert.equal(restore.assessInventory(f.control,f.initial),'RESTORE_EXACT_FAILED_PREVIEW');
  assert.equal(restore.assessInventory(f.control,f.after),'ALREADY_CURRENT_LIVE');
  const g=clone(f.initial);for(const row of g.result)row.release.version.name='projects/ays-orbit-360-lab/'+row.release.version.name;
  assert.equal(restore.assessInventory(f.control,{result:{channels:g.result}}),'RESTORE_EXACT_FAILED_PREVIEW');
});
test('the current restore target is observed failed257, never the archived failed024 version',()=>{
  assert.equal(F.sourceSha,'257695e19749a4e18f38be972b37b6b47b2225af');
  assert.equal(F.artifactId,14181847038);assert.equal(F.qaRunId,43766053717);
  assert.equal(F.hostingVersion,'sites/ays-orbit-360-lab/versions/1cccc93a6136f6f8');
  const f=fixture();f.initial.result[0].release.version.name='sites/ays-orbit-360-lab/versions/77f99c0f0893d8d5';
  assert.throws(()=>restore.assessInventory(f.control,f.initial),/I66_RESTORE_UNAPPROVED_PREVIEW_VERSION/);
});
test('archived inventory attempt is provenance only and a later failed old-pin attempt cannot replace it',async()=>{
  assert.equal(A.inventoryRunAttempt,1);
  assert.equal(A.inventoryEvidenceUse,'ARCHIVED_READONLY_WORKFLOW_PROVENANCE_NOT_CURRENT_CHANNEL_STATE');
  for(const change of [r=>r.run_attempt=2,r=>r.conclusion='failure',r=>delete r.run_attempt]){
    const f=fixture();change(f.meta.inventoryRun);const {io,events}=ioFixture(f);
    await assert.rejects(restore.restorePreview(f.control,f.initial,io,f.report));
    assert.deepEqual(events,['metadata']);assert.equal(f.report.previewCloneRequested,false);
  }
  const owner=fs.readFileSync('tools/gravicentra-i6-6-preview-current-live-restore.cjs','utf8');
  assert.ok(owner.includes("json('runs/'+AUTHORIZATION.inventoryRunId+'/attempts/'+AUTHORIZATION.inventoryRunAttempt)"));
});
for(const key of Object.keys(A))test('exact restore authorization rejects missing/changed '+key,()=>{
  const f=fixture();delete f.control.previewChannelReuseAuthorization.failedCandidateRestore[key];
  assert.throws(()=>restore.validateAuthorization(f.control));
  const g=fixture();g.control.previewChannelReuseAuthorization.failedCandidateRestore[key]=false;
  assert.throws(()=>restore.validateAuthorization(g.control));
});
for(const owner of ['failedCandidate','failedQaDiagnostic','currentLive'])for(const key of Object.keys(A[owner]))test('rejects '+owner+' identity drift '+key,()=>{
  const f=fixture();f.control.previewChannelReuseAuthorization.failedCandidateRestore[owner][key]='different';
  assert.throws(()=>restore.validateAuthorization(f.control));
});
for(const flag of ['livePromotionAuthorized','previewApproved','forbidBackendFunctionDeploy','forbidBackendLiveFunctionDeploy','noHostingPromotion','forbidFirestoreRulesDataAuthWrites'])
  test('does not weaken existing release scope '+flag,()=>{const f=fixture();f.control[flag]=!f.control[flag];assert.throws(()=>restore.validateAuthorization(f.control));});
test('rejects authority expansion and changed published pointer',()=>{
  const f=fixture();f.control.previewChannelReuseAuthorization.failedCandidateRestore.otherChannelAllowed=true;
  assert.throws(()=>restore.validateAuthorization(f.control));
  const g=fixture();g.control.currentExactHostingRelease.liveCloneRunId++;
  assert.throws(()=>restore.validateAuthorization(g.control));
});
for(const [name,edit] of [
  ['different candidate version',f=>f.initial.result[0].release.version.name+='changed'],
  ['different LIVE version',f=>f.initial.result[1].release.version.name=F.hostingVersion],
  ['wrong project',f=>f.initial.result[0].release.version.name='projects/another/'+F.hostingVersion],
  ['wrong site',f=>f.initial.result[0].release.version.name=F.hostingVersion.replace('ays-orbit-360-lab','other')],
  ['changed channel create time',f=>f.initial.result[0].createTime='2026-11-10T00:00:00Z'],
  ['duplicate target',f=>f.initial.result.push(clone(f.initial.result[0]))],
  ['duplicate LIVE',f=>f.initial.result.push(clone(f.initial.result[1]))],
  ['missing target',f=>f.initial.result.shift()],
  ['missing LIVE',f=>f.initial.result.splice(1,1)]
])test('inventory denies '+name,()=>{const f=fixture();edit(f);assert.throws(()=>restore.assessInventory(f.control,f.initial));});

test('both exact successful immutable builds validate',()=>{const f=fixture();
  restore.validateArtifact(f.meta.failedRun,f.meta.failedArtifact,F);restore.validateArtifact(f.meta.liveBuildRun,f.meta.liveArtifact,C);});
for(const [name,edit] of [
  ['wrong source',f=>f.meta.failedRun.head_sha='0'.repeat(40)],
  ['wrong branch',f=>f.meta.failedRun.head_branch='main'],
  ['wrong workflow',f=>f.meta.failedRun.path='.github/workflows/alternate.yml'],
  ['failed build',f=>f.meta.failedRun.conclusion='failure'],
  ['incomplete build',f=>f.meta.failedRun.status='in_progress'],
  ['expired archive',f=>f.meta.failedArtifact.expired=true],
  ['wrong digest',f=>f.meta.failedArtifact.digest='sha256:'+'0'.repeat(64)],
  ['wrong artifact',f=>f.meta.failedArtifact.id++],
  ['wrong artifact source',f=>f.meta.failedArtifact.workflow_run.head_sha=C.sourceSha],
  ['wrong artifact run',f=>f.meta.failedArtifact.workflow_run.id++],
  ['wrong artifact name',f=>f.meta.failedArtifact.name='alternate']
])test('artifact denies '+name,()=>{const f=fixture();edit(f);assert.throws(()=>restore.validateArtifact(f.meta.failedRun,f.meta.failedArtifact,F));});

test('exact masked or unmasked failed QA control receipt is checked without repairing JSON or inventing PASS',()=>{
  const f=fixture();assert.match(restore.validateFailedQa(f.meta.failedQaRun,f.meta.failedQaJob,f.meta.failedQaLog),/^[a-f0-9]{64}$/);
  const unmasked=f.meta.failedQaLog.replace(/HOLD .+$/,'HOLD '+JSON.stringify(f.qaReceipt));
  assert.match(restore.validateFailedQa(f.meta.failedQaRun,f.meta.failedQaJob,unmasked),/^[a-f0-9]{64}$/);
});
for(const key of ['remaining','realCustomerWritesRequested','bankMovements','financialPayments','authOrMembershipMutations'])
  for(const value of ['1','0.1','01','"0"'])test('QA cleanup rejects '+key+'='+value,()=>{
    const f=fixture();f.meta.failedQaLog=f.meta.failedQaLog.replace('"'+key+'":0','"'+key+'":'+value);
    assert.throws(()=>restore.validateFailedQa(f.meta.failedQaRun,f.meta.failedQaJob,f.meta.failedQaLog));
  });
for(const [name,edit] of [
  ['wrong QA run',f=>f.meta.failedQaRun.id++],
  ['wrong QA source',f=>f.meta.failedQaRun.head_sha=C.sourceSha],
  ['wrong QA job',f=>f.meta.failedQaJob.id++],
  ['wrong QA job run',f=>f.meta.failedQaJob.run_id++],
  ['unexpected success',f=>f.meta.failedQaJob.conclusion='success'],
  ['missing source proof',f=>f.meta.failedQaLog=f.meta.failedQaLog.replace(F.sourceSha,C.sourceSha)],
  ['no executed LIVE proof',f=>f.meta.failedQaLog=f.meta.failedQaLog.replace('Z I66_PREVIEW_BACKEND_ONLY','Z echo I66_PREVIEW_BACKEND_ONLY')],
  ['no executed cleanup',f=>f.meta.failedQaLog=f.meta.failedQaLog.replace('Z I66_ADVISOR_PAYABLE','Z echo I66_ADVISOR_PAYABLE')],
  ['cleanup failed',f=>f.meta.failedQaLog=f.meta.failedQaLog.replace('"cleanup":"PASS"','"cleanup":"HOLD"')],
  ['wrong checks',f=>f.meta.failedQaLog=f.meta.failedQaLog.replace('"checks":5','"checks":50')],
  ['wrong failure class',f=>f.meta.failedQaLog=f.meta.failedQaLog.replace('TIMEOUT_ERROR','OTHER')],
  ['wrong source location',f=>f.meta.failedQaLog=f.meta.failedQaLog.replace('"line":526','"line":527')],
  ['ambiguous masking',f=>f.meta.failedQaLog=f.meta.failedQaLog.replace('"failureLocation":***','"failureLocation":****')],
  ['duplicate cleanup',f=>f.meta.failedQaLog+='\n'+f.meta.failedQaLog.split('\n').pop()],
  ['duplicate field',f=>f.meta.failedQaLog=f.meta.failedQaLog.replace('"remaining":0','"remaining":1,"remaining":0')],
  ['invented PASS',f=>f.meta.failedQaLog+='\n'+stamp+'I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_PASS {}']
])test('QA evidence denies '+name,()=>{const f=fixture();edit(f);assert.throws(()=>restore.validateFailedQa(f.meta.failedQaRun,f.meta.failedQaJob,f.meta.failedQaLog));});

test('structured cleanup binds exact run, artifact metadata, archive bytes and private-free JSON bytes',()=>{
  const f=fixture(),proof=restore.validateStructuredCleanup(f.meta.failedQaDiagnosticArtifact,diagnosticBytes,f.diagnosticText);
  assert.equal(diagnosticBytes.length,882);assert.equal(proof.cleanupStatus,'PASS');assert.equal(proof.remaining,0);
  assert.equal(proof.status,'FAILED_NOT_ACCEPTED');assert.equal(proof.artifactId,14182616271);
  assert.equal(proof.entrySha256,D.entrySha256);
  assert.doesNotMatch(JSON.stringify(proof),/actor|email|token|scope|https?:/i);
});
for(const [name,edit] of [
  ['wrong artifact ID',a=>a.id++],['wrong artifact name',a=>a.name='other'],
  ['wrong artifact digest',a=>a.digest='sha256:'+'0'.repeat(64)],['wrong archive size',a=>a.size_in_bytes++],
  ['expired artifact',a=>a.expired=true],['wrong QA run',a=>a.workflow_run.id++],
  ['wrong QA head',a=>a.workflow_run.head_sha=C.sourceSha],['wrong branch',a=>a.workflow_run.head_branch='main']
])test('structured cleanup refuses '+name+' before download or clone',async()=>{
  const f=fixture();edit(f.meta.failedQaDiagnosticArtifact);
  assert.throws(()=>restore.validateStructuredCleanup(f.meta.failedQaDiagnosticArtifact,diagnosticBytes,f.diagnosticText));
  const {io,events}=ioFixture(f);await assert.rejects(restore.restorePreview(f.control,f.initial,io,f.report));
  assert.deepEqual(events,['metadata']);assert.equal(f.report.previewCloneRequested,false);
});
test('altered same-length archive and truncated archive cannot authorize restoration',async()=>{
  const changed=Buffer.from(diagnosticBytes);changed[100]^=1;
  for(const bytes of [changed,diagnosticBytes.subarray(0,diagnosticBytes.length-1)]){
    assert.throws(()=>restore.validateDiagnosticBytes(bytes));
    const f=fixture(),{io,events}=ioFixture(f);io.diagnostic=async()=>({bytes,text:f.diagnosticText});
    await assert.rejects(restore.restorePreview(f.control,f.initial,io,f.report));
    assert.deepEqual(events,['metadata']);assert.equal(f.report.previewCloneRequested,false);
  }
});
for(const [name,edit] of [
  ['positive remaining',s=>s.replace('"remaining": 0','"remaining": 1')],
  ['fractional remaining',s=>s.replace('"remaining": 0','"remaining": 0.1')],
  ['string remaining',s=>s.replace('"remaining": 0','"remaining": "0"')],
  ['duplicate overridden remaining',s=>s.replace('"remaining": 0','"remaining": 1, "remaining": 0')],
  ['changed failure phase',s=>s.replace('"phase": "PREVIEW"','"phase": "LIVE"')],
  ['substituted source',s=>s.replace(F.sourceSha,C.sourceSha)],
  ['new private field',s=>s.replace('"remaining": 0','"remaining": 0, "private": "SECRET_ACTOR_TOKEN"')],
  ['invented acceptance',s=>s.replace('FAILED_NOT_ACCEPTED','PASS')]
])test('structured cleanup rejects '+name+' even alongside the correct archive',async()=>{
  const f=fixture(),text=edit(f.diagnosticText);
  assert.throws(()=>restore.validateStructuredCleanup(f.meta.failedQaDiagnosticArtifact,diagnosticBytes,text));
  const {io,events}=ioFixture(f);io.diagnostic=async()=>({bytes:diagnosticBytes,text});
  await assert.rejects(restore.restorePreview(f.control,f.initial,io,f.report));
  assert.deepEqual(events,['metadata']);assert.equal(f.report.previewCloneRequested,false);
});

const manifest=()=>Array.from({length:223},(_,i)=>'a'.repeat(64)+'  core/test-'+i+'.js').join('\n')+'\n';
test('exact 223-file manifest and fixed CLI command only',()=>{
  assert.equal(restore.parseManifest(manifest()).length,223);
  assert.deepEqual(restore.cloneArguments('/tmp/cli/firebase.js'),['/tmp/cli/firebase.js','hosting:clone','ays-orbit-360-lab@0766db29b338befc',
    'ays-orbit-360-lab:gi-i66-rc-42868854629','--project','ays-orbit-360-lab','--non-interactive','--json']);
  assert.throws(()=>restore.cloneArguments('firebase'));
});
for(const [name,change] of [
  ['wrong count',s=>s.split('\n').slice(1).join('\n')],['duplicate',s=>s.replace('core/test-1.js','core/test-0.js')],
  ['traversal',s=>s.replace('core/test-1.js','core/../secret.js')],['absolute',s=>s.replace('core/test-1.js','/tmp/secret.js')],
  ['URL',s=>s.replace('core/test-1.js','https://other/file')],['invalid hash',s=>s.replace(/^a/,'z')]
])test('manifest denies '+name,()=>assert.throws(()=>restore.parseManifest(change(manifest()))));

test('restore sequence backs up both before one exact clone, then verifies all origins and unchanged reuse guard',async()=>{
  const f=fixture(),{io,events}=ioFixture(f);await restore.restorePreview(f.control,f.initial,io,f.report);
  assert.deepEqual(events,['metadata','diagnostic','backup:failed','backup:r11','readback:'+PREVIEW+':failed',
    ...LIVE_ORIGINS.map(x=>'readback:'+x+':r11'),'inventory','clone-exact-preview','inventory','wait-exact:r11',
    'readback:'+PREVIEW+':r11',...LIVE_ORIGINS.map(x=>'readback:'+x+':r11')]);
  assert.equal(f.report.previewClonePerformed,true);assert.equal(f.report.productAccepted,false);
  assert.deepEqual(f.report.failedQaStructuredCleanup,{artifactId:D.artifactId,artifactDigest:D.artifactDigest,entrySha256:D.entrySha256,
    status:'FAILED_NOT_ACCEPTED',cleanupStatus:'PASS',remaining:0});
  assert.equal(f.report.status,'EXACT_R11_PREVIEW_RESTORED_VERIFIED_NOT_PRODUCT_ACCEPTANCE');
});
test('already R11 does not clone, fetch artifacts or mutate anything',async()=>{
  const f=fixture(),{io,events}=ioFixture(f);await restore.restorePreview(f.control,f.after,io,f.report);
  assert.deepEqual(events,[]);assert.equal(f.report.previewClonePerformed,false);assert.equal(f.report.productAccepted,false);
  assert.equal(f.report.status,'ALREADY_R11_NO_RESTORE_NEEDED');
});
for(const [name,edit] of [
  ['metadata failed',io=>io.metadata=async()=>{throw Error('metadata unavailable');}],
  ['structured cleanup download failed',io=>io.diagnostic=async()=>{throw Error('diagnostic unavailable');}],
  ['backup failed',io=>io.backup=async()=>{throw Error('archive drift');}],
  ['readback failed',io=>io.readback=async()=>{throw Error('hash drift');}],
  ['concurrent channel changed',io=>io.inventory=async()=>{const f=fixture();f.initial.result[0].release.version.name+='changed';return f.initial;}]
])test('no clone when '+name,async()=>{
  const f=fixture(),{io,events}=ioFixture(f);edit(io);await assert.rejects(restore.restorePreview(f.control,f.initial,io,f.report));
  assert.ok(!events.includes('clone-exact-preview'));assert.equal(f.report.previewClonePerformed,false);assert.equal(f.report.productAccepted,false);
});
test('failed QA cleanup aborts before all backups, reads and clone',async()=>{
  const f=fixture();f.meta.failedQaLog=f.meta.failedQaLog.replace('"remaining":0','"remaining":1');
  const {io,events}=ioFixture(f);await assert.rejects(restore.restorePreview(f.control,f.initial,io,f.report));
  assert.deepEqual(events,['metadata']);
});
test('inventory ordering changes do not invent a drift or broaden target scope',async()=>{
  const f=fixture(),{io}=ioFixture(f);let calls=0;
  io.inventory=async()=>{const data=clone(calls++===0?f.initial:f.after);data.result.reverse();return data;};
  await restore.restorePreview(f.control,f.initial,io,f.report);assert.equal(f.report.previewClonePerformed,true);
});
for(const [name,edit] of [
  ['LIVE drift',f=>f.after.result[1].release.version.name=F.hostingVersion],
  ['unrelated channel drift',f=>f.after.result[2].release.version.name+='changed'],
  ['candidate not restored',f=>f.after.result[0].release.version.name=F.hostingVersion]
])test('post-clone '+name+' cannot become PASS',async()=>{
  const f=fixture();edit(f);const {io}=ioFixture(f);
  await assert.rejects(restore.restorePreview(f.control,f.initial,io,f.report));
  assert.equal(f.report.status,'HOLD');assert.equal(f.report.previewClonePerformed,true);assert.equal(f.report.productAccepted,false);
});
test('failed exact marker/readback after clone remains HOLD',async()=>{
  const f=fixture(),{io}=ioFixture(f);io.waitForPreview=async()=>{throw Error('marker drift');};
  await assert.rejects(restore.restorePreview(f.control,f.initial,io,f.report));
  assert.equal(f.report.status,'HOLD');assert.equal(f.report.previewClonePerformed,true);assert.equal(f.report.productAccepted,false);
});
test('a CLI failure does not falsely certify completed restoration',async()=>{
  const f=fixture(),{io}=ioFixture(f);io.clone=async()=>{throw Error('clone failed');};
  await assert.rejects(restore.restorePreview(f.control,f.initial,io,f.report));
  assert.equal(f.report.previewCloneRequested,true);assert.equal(f.report.previewClonePerformed,false);assert.equal(f.report.status,'HOLD');
});
test('local/direct execution is refused before credentials, I/O or mutation',async()=>{
  await assert.rejects(restore.main({}),/I66_RESTORE_WORKFLOW_ONLY/);
  await assert.rejects(restore.main({GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'other'}),/I66_RESTORE_REPOSITORY_DENIED/);
  await assert.rejects(restore.main({GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'paulaosoriof86/orbit360-core',GITHUB_REF:'refs/heads/main'}),/I66_RESTORE_BRANCH_DENIED/);
});
test('only the existing build workflow invokes restoration before the unchanged guard and preserves failure evidence',()=>{
  const source=fs.readFileSync(BUILD,'utf8');
  const invocation='node "$GITHUB_WORKSPACE/candidate/tools/gravicentra-i6-6-preview-current-live-restore.cjs"';
  assert.ok(source.includes('node --test tools/gravicentra-i6-6-preview-current-live-restore.test.cjs'));
  const call=source.indexOf(invocation),guard=source.indexOf('const a=validateChannels(control,j);');
  assert.ok(call>0&&guard>call);assert.ok(source.slice(call,guard).includes('hosting:channel:list'));
  assert.match(source,/name: Preserve exact Preview restore backups and receipt even on failure\n\s+if: always\(\)/);
  assert.ok(source.includes('gi-i66-preview-restore-*/restore-receipt.json'));
  assert.ok(source.includes('gi-i66-preview-restore-*/failed-qa/verified-diagnostic.zip'));
  assert.ok(source.includes('gi-i66-preview-restore-*/failed-qa/i66-preview-failure-diagnostic.json'));
  assert.ok(source.includes('gi-i66-preview-restore-*/failed/verified-backup.zip'));
  assert.ok(source.includes('gi-i66-preview-restore-*/r11/verified-backup.zip'));
});
