'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const owner=require('./gravicentra-i6-6-preview-current-live-restore.cjs');
const restore=owner.currentRestore;
const {AUTHORIZATION:A,FAILED:F,DIAGNOSTIC:D,CURRENT:C,CHANNEL,PREVIEW,LIVE_ORIGINS}=restore;
const clone=value=>JSON.parse(JSON.stringify(value));
const BUILD='.github/workflows/gravicentra-release-delta-66-package.yml';
const BRANCH='recovery/fase-a-clean-20260831';
const stamp='2026-11-16T23:28:11.2847573Z ';
// Exact sanitized artifact14282532244, independently retrieved and hashed.
// Contains no actor, credential, business row, raw error or URL.
const diagnosticBytes=Buffer.from('UEsDBBQACAAIAIW7cF0AAAAAAAAAAAAAAAAjAAAAaTY2LXByZXZpZXctZmFpbHVyZS1kaWFnbm9zdGljLmpzb26FU11vmzAUfc+vQDwvUxIooX1DQDukFCI+MnVThRy4AW+OHdkmXVXlv0920pCvaS8InXPuved++GNgGKaoWlgj88EwI6d0ynkaLqLwexlE3lOcZHnkl0k8eykXY/OLlkskO6Hkj140C4MyTvLS8/1wnofBXsI7GtXmg2Fb91PXdabu1NqHso5XkLW6mD1d2fWkhokDo0k9nt5PVtb4zrEmrosc2x3fg7107PpQlcOGcanK/hwYhmF86O+ZnW/JbF9f45sWCVDwoZ+eWSFMOg6ZRI0WeFkWPcXPYZyXQeIX6sdLX8oiugrxW6h+H0LCNI+SuEzSMi3iPHoOSzWOIg2vowgS2qBSJUVehmmapFeyGauQxIyaD8fmFImJNtlwtMUVUMnREDtDZ4jqLRaMDzfoHS0JiKHADYV62CH5tfoljukNwySYqhx3d84JWDHSrVWxsTU+oLveEqaIVlDgAKOGMiFxJc59LWHFVGtYD6Qn1EYo2oiWyey4Gd+b50UaBiem1EpZJ3Vvj1HsxT+87JyWaOmzjkpl8ZqgFCoJ6sgk7+CSX2CBl3pwt9iQqondjOVQyYt+DMP8ozyMTsen4XcFu9YF+oZr2eq5Ti6YFnDTqvSWfULszgyoFQOP6ALDm7r42y3wBmQKFeAtiDnDKuSmkG1y1KgRB9HCvKT0E6UdIZeEPljo39rp7MwT5PUskECDSLIFTtD7nIMAvboVIgL+qfNkrnv5r/DzEkZnijWrEblNoU62KQjJOKbNZ/qjYHd18ZV62qplp4cIINpt+jOee1l/oyaHNcJ0n300+Mz6OtgN/gJQSwcI0105fGQCAABWBQAAUEsBAi0DFAAIAAgAhbtwXdNdOXxkAgAAVgUAACMAAAAAAAAAAAAgAKSBAAAAAGk2Ni1wcmV2aWV3LWZhaWx1cmUtZGlhZ25vc3RpYy5qc29uUEsFBgAAAAABAAEAUQAAALUCAAAAAA==','base64');
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
  const qaReceipt={"checks":6,"cleanup":"PASS","remaining":0,"realCustomerWritesRequested":0,"bankMovements":0,"financialPayments":0,"authOrMembershipMutations":0,"failureClass":"TIMEOUT_ERROR","failureStage":"ASSIGNMENT_DOCUMENTARY_UI","failureCheck":"ASSERTION_OR_RUNTIME_FAILURE","failureLocation":{"file":"gravicentra-i6-6-advisor-payables-signed-uat.cjs","line":556,"column":131}};
  const qaLog=[stamp+'I66_SOURCE_SHA: '+F.sourceSha,stamp+'SOURCE_PACKAGE_RUN: '+F.buildRunId,
    stamp+'SOURCE_ARTIFACT_ID: '+F.artifactId,stamp+'I66_PREVIEW_BACKEND_ONLY_ZERO_LIVE_HOSTING_CHANGES_PASS',
    stamp+'I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_HOLD '+JSON.stringify(qaReceipt).replace(/^\{/,'***').replace('"failureLocation":{','"failureLocation":***').replace(/\}\}$/,'***')].join('\n');
  const diagnostic={"schema":"I6_6_PREVIEW_DIAGNOSTIC_ONLY_V1","status":"FAILED_NOT_ACCEPTED","runId":43978867873,"sourceSha":"47f4d2de26e02d1792f31563288a64819e4b64d1","reports":[{"status":"HOLD","phase":"PREVIEW","failureStage":"ASSIGNMENT_DOCUMENTARY_UI","failureCheck":"ASSERTION_OR_RUNTIME_FAILURE","failureClass":"TIMEOUT_ERROR","failureLocation":{"file":"gravicentra-i6-6-advisor-payables-signed-uat.cjs","line":556,"column":131},"financeUiDiagnostics":{"beforeClick":{"snapshotStatus":"CAPTURED","route":"FINANZAS","tabCount":1,"tabConnected":true,"tabVisible":true,"tabEnabled":true,"rect":{"x":1056,"y":183,"width":132,"height":34},"centerInViewport":true,"targetReceivesPointer":true,"topTag":"DIV","topId":null,"topClasses":["tab"],"legalOverlayPresent":false,"legalOverlayAtTarget":false,"legalOverlayCount":0,"modalCount":0,"authRestoring":false}},"checks":6,"cleanupStatus":"PASS","remaining":0}]};
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


test('current runtime has one observed failed47 context; historical exported fixtures are not active',()=>{
  assert.equal(F.sourceSha,'47f4d2de26e02d1792f31563288a64819e4b64d1');
  assert.equal(F.buildRunId,43978039744);assert.equal(F.artifactId,14282155921);
  assert.equal(F.artifactDigest,'sha256:b35146189da52846bc03580cb3d5b6fdc82bdc5b51e2c6574474c53d97c39a32');
  assert.equal(F.hostingVersion,'sites/ays-orbit-360-lab/versions/bcc2259b8a2d7d5b');
  assert.equal(F.qaRunId,43978867873);assert.equal(F.qaHeadSha,'b9bf7ffaff28124dbae4c67b7a255b8f2326cf16');
  assert.equal(F.qaJobId,133689959216);
  assert.equal(owner.main,restore.main);assert.equal(owner.exactRestoreImplementation,undefined);
  assert.notEqual(owner.main,undefined);assert.notEqual(owner.FAILED.sourceSha,F.sourceSha);
  assert.equal(owner.FAILED.sourceSha,'2d4e2d007d42560ca0ed0e7ce4108c889b416539');
  const source=fs.readFileSync('tools/gravicentra-i6-6-preview-current-live-restore.cjs','utf8');
  assert.match(source,/if\(require\.main===module\)ACTIVE_RESTORE\.main\(\)/);
  assert.doesNotMatch(source,/if\(require\.main===module\)HISTORICAL_RESTORE/);
});
test('observed current inventory accepts only failed47 or exact R11',()=>{
  const f=fixture();assert.deepEqual(restore.validateAuthorization(f.control),A);
  assert.equal(restore.assessInventory(f.control,f.initial),'RESTORE_EXACT_FAILED_PREVIEW');
  assert.equal(restore.assessInventory(f.control,f.after),'ALREADY_CURRENT_LIVE');
  for(const wrong of [owner.FAILED.hostingVersion,'sites/ays-orbit-360-lab/versions/1cccc93a6136f6f8','sites/ays-orbit-360-lab/versions/77f99c0f0893d8d5']){
    const x=fixture();x.initial.result[0].release.version.name=wrong;
    assert.throws(()=>restore.assessInventory(x.control,x.initial),/I66_RESTORE_UNAPPROVED_PREVIEW_VERSION/);
  }
});
test('old authorization cannot authorize current runtime or observed failed47 through historical functions',()=>{
  const f=fixture();f.control.previewChannelReuseAuthorization.failedCandidateRestore=clone(owner.AUTHORIZATION);
  assert.throws(()=>restore.validateAuthorization(f.control),/I66_RESTORE_EXACT_AUTHORIZATION_REQUIRED/);
  assert.throws(()=>owner.assessInventory(f.control,f.initial),/I66_RESTORE_UNAPPROVED_PREVIEW_VERSION/);
  const c=fixture().control;
  assert.throws(()=>owner.validateAuthorization(c),/I66_RESTORE_EXACT_AUTHORIZATION_REQUIRED/);
});
for(const field of ['sourceSha','buildRunId','artifactId','artifactDigest','hostingVersion','qaRunId','qaHeadSha','qaJobId'])
  test('current authority denies failed candidate drift '+field,()=>{
    const f=fixture();f.control.previewChannelReuseAuthorization.failedCandidateRestore.failedCandidate[field]='arbitrary';
    assert.throws(()=>restore.validateAuthorization(f.control),/I66_RESTORE_EXACT_AUTHORIZATION_REQUIRED/);
  });
test('actual new diagnostic ZIP and JSON bytes prove six checks, zero residues and exact failure without claiming acceptance',()=>{
  const f=fixture(),proof=restore.validateStructuredCleanup(f.meta.failedQaDiagnosticArtifact,diagnosticBytes,f.diagnosticText);
  assert.equal(diagnosticBytes.length,796);assert.equal(proof.artifactId,14282532244);
  assert.equal(proof.cleanupStatus,'PASS');assert.equal(proof.remaining,0);assert.equal(proof.status,'FAILED_NOT_ACCEPTED');
  assert.equal(proof.entrySha256,'20155e29e65291632b664d4d4267d442cbf783276df64c82d8e8c5aaae505e36');
  assert.match(restore.validateFailedQa(f.meta.failedQaRun,f.meta.failedQaJob,f.meta.failedQaLog),/^[a-f0-9]{64}$/);
  const unmasked=f.meta.failedQaLog.replace(/HOLD .+$/,'HOLD '+JSON.stringify(f.qaReceipt));
  assert.match(restore.validateFailedQa(f.meta.failedQaRun,f.meta.failedQaJob,unmasked),/^[a-f0-9]{64}$/);
});
for(const [name,change] of [
  ['remaining',s=>s.replace('"remaining":0','"remaining":1')],
  ['wrong checks',s=>s.replace('"checks":6','"checks":4')],
  ['wrong failure location',s=>s.replace('"line":556','"line":557')],
  ['missing masking boundary',s=>s.replace('"failureLocation":***','"failureLocation":****')],
  ['no executed cleanup',s=>s.replace('Z I66_ADVISOR_PAYABLE','Z echo I66_ADVISOR_PAYABLE')],
  ['invented PASS',s=>s+'\n'+stamp+'I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_PASS {}']
])test('new observed QA receipt rejects '+name,()=>{
  const f=fixture();assert.throws(()=>restore.validateFailedQa(f.meta.failedQaRun,f.meta.failedQaJob,change(f.meta.failedQaLog)));
});
test('diagnostic facts cannot be weakened, masked away or replaced by previous failure',()=>{
  const f=fixture();
  assert.throws(()=>restore.validateStructuredCleanup(f.meta.failedQaDiagnosticArtifact,diagnosticBytes,f.diagnosticText.replace('"checks": 6','"checks": 4')));
  assert.throws(()=>restore.validateDiagnosticBytes(Buffer.from(diagnosticBytes.subarray(0,795))));
  const mutated=Buffer.from(diagnosticBytes);mutated[200]^=1;
  assert.throws(()=>restore.validateDiagnosticBytes(mutated));
  assert.throws(()=>owner.validateStructuredCleanup(f.meta.failedQaDiagnosticArtifact,diagnosticBytes,f.diagnosticText));
});
test('new current context keeps backups, fresh inventory, one exact Preview clone and all three full readbacks in order',async()=>{
  const f=fixture(),{io,events}=ioFixture(f);await restore.restorePreview(f.control,f.initial,io,f.report);
  assert.deepEqual(events,['metadata','diagnostic','backup:failed','backup:r11','readback:'+PREVIEW+':failed',
    ...LIVE_ORIGINS.map(x=>'readback:'+x+':r11'),'inventory','clone-exact-preview','inventory','wait-exact:r11',
    'readback:'+PREVIEW+':r11',...LIVE_ORIGINS.map(x=>'readback:'+x+':r11')]);
  assert.equal(f.report.status,'EXACT_R11_PREVIEW_RESTORED_VERIFIED_NOT_PRODUCT_ACCEPTANCE');
  assert.equal(f.report.previewClonePerformed,true);assert.equal(f.report.productAccepted,false);
});
test('current context at already exact R11 performs no requests or clone',async()=>{
  const f=fixture(),{io,events}=ioFixture(f);await restore.restorePreview(f.control,f.after,io,f.report);
  assert.deepEqual(events,[]);assert.equal(f.report.previewClonePerformed,false);assert.equal(f.report.productAccepted,false);
});
for(const [name,change] of [
  ['failed cleanup',f=>f.meta.failedQaLog=f.meta.failedQaLog.replace('"remaining":0','"remaining":1')],
  ['wrong diagnostic artifact',f=>f.meta.failedQaDiagnosticArtifact.id++],
  ['LIVE changed',f=>f.initial.result[1].release.version.name=F.hostingVersion],
  ['Preview changed',f=>f.initial.result[0].release.version.name+='other']
])test('no clone on '+name,async()=>{
  const f=fixture();change(f);const {io,events}=ioFixture(f);
  await assert.rejects(restore.restorePreview(f.control,f.initial,io,f.report));
  assert.ok(!events.includes('clone-exact-preview'));assert.equal(f.report.previewCloneRequested,false);assert.equal(f.report.productAccepted,false);
});
test('actual main rejects stale authorization before output directory, credentials, I/O or mutation',async()=>{
  const f=fixture();f.control.previewChannelReuseAuthorization.failedCandidateRestore=clone(owner.AUTHORIZATION);
  const code=fs.readFileSync('tools/gravicentra-i6-6-preview-current-live-restore.cjs','utf8');
  const box={exports:{}},events=[];
  const shim={...fs,readFileSync(file){
    const p=String(file);
    if(p.endsWith('I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'))return JSON.stringify(f.control);
    if(p.endsWith('gi-i66-reuse-before.json'))return JSON.stringify(f.initial);
    throw Error('UNEXPECTED_READ');
  },mkdtempSync(){events.push('output-created');throw Error('UNEXPECTED_OUTPUT');}};
  Function('module','exports','require','__dirname',code)(box,box.exports,
    name=>name==='node:fs'?shim:require(name),__dirname);
  const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'paulaosoriof86/orbit360-core',
    GITHUB_REF:'refs/heads/'+BRANCH,GITHUB_WORKFLOW:'Gravicentra I6.6 Build Immutable Release Package',RUNNER_TEMP:'/tmp/qa-restore-no-io'};
  await assert.rejects(box.exports.main(env),/I66_RESTORE_EXACT_AUTHORIZATION_REQUIRED/);
  assert.deepEqual(events,[]);assert.equal(box.exports.main,box.exports.currentRestore.main);
});
