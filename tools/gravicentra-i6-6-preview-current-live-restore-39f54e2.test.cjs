'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const owner=require('./gravicentra-i6-6-preview-current-live-restore.cjs');
const restore=owner.activeRestore;
const {AUTHORIZATION:A,FAILED:F,DIAGNOSTIC:D,CURRENT:C,CHANNEL,PREVIEW,LIVE_ORIGINS}=restore;
const clone=value=>JSON.parse(JSON.stringify(value));
const BUILD='.github/workflows/gravicentra-release-delta-66-package.yml';
const BRANCH='recovery/fase-a-clean-20260831';
const stamp='2026-11-16T23:28:11.2847573Z ';
// Exact sanitized artifact14283479018 from failed39; no raw business rows or errors.
const diagnosticBytes=Buffer.from('UEsDBBQACAAIACq/cF0AAAAAAAAAAAAAAAAjAAAAaTY2LXByZXZpZXctZmFpbHVyZS1kaWFnbm9zdGljLmpzb26lU01vozAQvfMrLJ97CAGyITcEdBcpSlCgWe2uKuQ4E7DqmMg27VZV/ntl0nxAE3Wlvfjw3puPN555sxDCilawJXiCcDIqRkW6iJdJ/LOIkuD7bJ7lSVjMZ9NfxdLGd61cE90oI78PkmkcFbN5XgRhGKd5HB0kshHJGk+Q6/jjoT8cjwbOIbRuJIWsaos5/sZzYeiC5/tjh3g++UZ94tq+PYQBwNr2XNgQe/yREna11KbsHwshhN7at9NOGmRZK27xXUUUtPDBz5nZMEEEhQcWMVKKWmlGTfwxI0J4BZtaQsgZfeoQppwgO1XVOjuVDYM0f1h8WD/pZN3otvx9Mgtmv4OsS2uyCutGaDxB9mdCCKAazAS1bKDPL5liKw432FiQFb8eK4Hqnh+E8F/Tw8Ab3XXhVwOPnR76wta6Mowz7DEVsLIy6R33gth3GqAgNMhELBm8mO+8bkGWoBdAgT2DSmtmQq4K611OSjPiKFniPtXun2g47xMhJ0rBeZEuZ4cvkMdOIIeS8PkzSE5eUwkK2q/bEK7gpi7QeevlS+FxEwYdxbZeE36dIo2uFqB0LZkoj+lPgr3Vmz2mFdAnY9n2zhgHIppdduN8JGwJE4f0A+si3ZXD+zGfRv9yeKc2nP/owkLo0dpb71BLBwjjT8Hm6AEAALoEAABQSwECLQMUAAgACAAqv3Bd40/B5ugBAAC6BAAAIwAAAAAAAAAAACAApIEAAAAAaTY2LXByZXZpZXctZmFpbHVyZS1kaWFnbm9zdGljLmpzb25QSwUGAAAAAAEAAQBRAAAAOQIAAAAA','base64');
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
  const payableReceipt={checks:15,cleanup:'PASS',remaining:0,realCustomerWritesRequested:0,bankMovements:0,financialPayments:0,authOrMembershipMutations:0};
  const proposalReceipt={sourceSha:F.sourceSha,phase:'PREVIEW',status:'HOLD',checks:3,
    cleanup:{status:'PASS',remaining:0,removedOwnedTargets:8,errors:[]},realControlUnchanged:true};
  const payableJson=JSON.stringify(payableReceipt),proposalJson=JSON.stringify(proposalReceipt);
  const qaLog=[stamp+'I66_SOURCE_SHA: '+F.sourceSha,stamp+'SOURCE_PACKAGE_RUN: '+F.buildRunId,
    stamp+'SOURCE_ARTIFACT_ID: '+F.artifactId,stamp+'I66_PREVIEW_BACKEND_ONLY_ZERO_LIVE_HOSTING_CHANGES_PASS',
    stamp+'I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_PASS '+payableJson.replace(/^\{/,'***').replace(/\}$/,'***'),
    stamp+'I66_PROPOSAL_UAT_CHECK=EXACT_BUILD_AND_UI_BYTES',
    stamp+'I66_PROPOSAL_UAT_CHECK=EXPLICIT_DIRECTION_PREVIEW_LEGAL_DECISION_APPLIED_BY_NORMAL_UI',
    stamp+'I66_PROPOSAL_UAT_CHECK=ISOLATED_SYNTHETIC_STAGE_NO_REAL_POINTER_CHANGE',
    stamp+proposalJson.replace(/^\{/,'***').replace('"cleanup":{','"cleanup":***').replace('},"realControlUnchanged"','***,"realControlUnchanged"').replace(/\}$/,'***'),
    stamp+'I66_PROPOSAL_SIGNED_UAT_HOLD ERR_ASSERTION'].join('\n');
  const diagnostic={"schema":"I6_6_PREVIEW_DIAGNOSTIC_ONLY_V1","status":"FAILED_NOT_ACCEPTED","runId":43982928603,"sourceSha":"39f54e24e59983a59a7c9a41912e0eed154efa18","reports":[{"status":"PASS","phase":"PREVIEW","financeUiDiagnostics":{"beforeClick":{"snapshotStatus":"CAPTURED","route":"FINANZAS","tabCount":1,"tabConnected":true,"tabVisible":true,"tabEnabled":true,"rect":{"x":1056,"y":183,"width":132,"height":34},"centerInViewport":true,"targetReceivesPointer":true,"topTag":"DIV","topId":null,"topClasses":["tab"],"legalOverlayPresent":false,"legalOverlayAtTarget":false,"legalOverlayCount":0,"modalCount":0,"authRestoring":false}},"checks":15,"cleanupStatus":"PASS","remaining":0},{"status":"HOLD","phase":"PREVIEW","checks":3,"cleanupStatus":"PASS","remaining":0}]};
  const diagnosticText=JSON.stringify(diagnostic,null,2)+'\n';
  const meta={failedRun:run(F.buildRunId,F.sourceSha),failedArtifact:artifact(F),liveBuildRun:run(C.buildRunId,C.sourceSha),liveArtifact:artifact(C),
    liveRun:run(C.liveRunId,C.liveHeadSha,'.github/workflows/gravicentra-i66-r11-renewal-drive-frontend-exact-live-promotion.yml'),
    inventoryRun:{...run(A.inventoryRunId,A.inventoryHeadSha,'.github/workflows/gravicentra-i66-preview-channel-inventory-readonly.yml'),run_attempt:A.inventoryRunAttempt},
    failedQaRun:run(F.qaRunId,F.qaHeadSha,'.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml','failure'),
    failedQaJob:{id:F.qaJobId,run_id:F.qaRunId,name:'exact-preview-only',status:'completed',conclusion:'failure'},failedQaLog:qaLog,
    failedQaDiagnosticArtifact:{id:D.artifactId,name:D.artifactName,digest:D.artifactDigest,size_in_bytes:D.archiveSize,expired:false,
      workflow_run:{id:F.qaRunId,head_sha:F.qaHeadSha,head_branch:BRANCH}}};
  const report={status:'HOLD',checks:[],previewClonePerformed:false,previewCloneRequested:false,productAccepted:false};
  return {control,initial,after,meta,report,payableReceipt,proposalReceipt,diagnosticText};
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

test('active profile is only observed failed39; historical 2d4/47 exports retain their identities',()=>{
  assert.equal(F.sourceSha,'39f54e24e59983a59a7c9a41912e0eed154efa18');
  assert.equal(F.buildRunId,43982177239);assert.equal(F.artifactId,14283796218);
  assert.equal(F.artifactDigest,'sha256:ba90d53bd4bafdea75748df779539e8efab75e75bf93845215dd20ba8c34e0d8');
  assert.equal(F.hostingVersion,'sites/ays-orbit-360-lab/versions/e05fb7764246f298');
  assert.equal(F.qaRunId,43982928603);assert.equal(F.qaHeadSha,'3076026cdfd900cf8e99037c3220682b3be68943');
  assert.equal(F.qaJobId,133703764371);assert.equal(owner.ACTIVE_AUTHORIZATION,A);
  assert.equal(owner.activeMain,restore.main);assert.equal(owner.main,owner.currentRestore.main);
  assert.notEqual(owner.activeMain,owner.main);assert.equal(owner.CURRENT_FAILED.sourceSha,'47f4d2de26e02d1792f31563288a64819e4b64d1');
  assert.equal(owner.FAILED.sourceSha,'2d4e2d007d42560ca0ed0e7ce4108c889b416539');
  assert.equal(owner.exactRestoreImplementation,undefined);assert.equal(owner.validateProposalQaReceipts,undefined);
});
test('source39 authority accepts only its observed Preview or exact current R11',()=>{
  const f=fixture();assert.deepEqual(restore.validateAuthorization(f.control),A);
  assert.equal(restore.assessInventory(f.control,f.initial),'RESTORE_EXACT_FAILED_PREVIEW');
  assert.equal(restore.assessInventory(f.control,f.after),'ALREADY_CURRENT_LIVE');
  for(const wrong of [owner.FAILED.hostingVersion,owner.CURRENT_FAILED.hostingVersion,F.hostingVersion+'other']){
    const x=fixture();x.initial.result[0].release.version.name=wrong;
    assert.throws(()=>restore.assessInventory(x.control,x.initial),/I66_RESTORE_UNAPPROVED_PREVIEW_VERSION/);
  }
  for(const old of [owner.AUTHORIZATION,owner.CURRENT_AUTHORIZATION]){
    const x=fixture();x.control.previewChannelReuseAuthorization.failedCandidateRestore=clone(old);
    assert.throws(()=>restore.validateAuthorization(x.control),/I66_RESTORE_EXACT_AUTHORIZATION_REQUIRED/);
  }
  assert.throws(()=>owner.validateAuthorization(f.control),/I66_RESTORE_EXACT_AUTHORIZATION_REQUIRED/);
  assert.throws(()=>owner.currentRestore.validateAuthorization(f.control),/I66_RESTORE_EXACT_AUTHORIZATION_REQUIRED/);
});
for(const field of ['sourceSha','buildRunId','artifactId','artifactDigest','hostingVersion','qaRunId','qaHeadSha','qaJobId'])
  test('new authority denies candidate pin drift '+field,()=>{
    const f=fixture();f.control.previewChannelReuseAuthorization.failedCandidateRestore.failedCandidate[field]='arbitrary';
    assert.throws(()=>restore.validateAuthorization(f.control),/I66_RESTORE_EXACT_AUTHORIZATION_REQUIRED/);
  });
test('actual diagnostic ZIP and exact two reports prove cleanup without inventing the Proposal failure location',()=>{
  const f=fixture(),proof=restore.validateStructuredCleanup(f.meta.failedQaDiagnosticArtifact,diagnosticBytes,f.diagnosticText);
  assert.equal(diagnosticBytes.length,672);assert.equal(proof.artifactId,14283479018);
  assert.equal(proof.entrySha256,'07ec4b5e86ed64cbd66970f61712319040c6d0af34a22b511da2366823c72bfe');
  assert.equal(proof.status,'FAILED_NOT_ACCEPTED');assert.equal(proof.cleanupStatus,'PASS');assert.equal(proof.remaining,0);
  const reports=JSON.parse(f.diagnosticText).reports;
  assert.deepEqual(reports.map(r=>[r.status,r.checks,r.cleanupStatus,r.remaining]),[['PASS',15,'PASS',0],['HOLD',3,'PASS',0]]);
  for(const key of ['failureStage','failureCheck','failureClass','failureLocation'])assert.equal(reports[1][key],undefined);
  assert.match(restore.validateFailedQa(f.meta.failedQaRun,f.meta.failedQaJob,f.meta.failedQaLog),/^[a-f0-9]{64}$/);
  const unmasked=f.meta.failedQaLog.replace(/I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_PASS .+/,()=>
    'I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_PASS '+JSON.stringify(f.payableReceipt))
    .replace(/\*\*\*"sourceSha".+/,()=>JSON.stringify(f.proposalReceipt));
  assert.match(restore.validateFailedQa(f.meta.failedQaRun,f.meta.failedQaJob,unmasked),/^[a-f0-9]{64}$/);
});
for(const [name,change] of [
  ['CxP remaining',s=>s.replace('"remaining":0','"remaining":1')],
  ['CxP checks',s=>s.replace('"checks":15','"checks":14')],
  ['CxP real writes',s=>s.replace('"realCustomerWritesRequested":0','"realCustomerWritesRequested":1')],
  ['CxP masked delimiter',s=>s.replace('PASS ***"checks"','PASS ****"checks"')],
  ['CxP script echo',s=>s.replace('Z I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_PASS','Z echo I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_PASS')],
  ['CxP status conflict',s=>s+'\n'+stamp+'I66_ADVISOR_PAYABLE_SIGNED_PREVIEW_HOLD {}'],
  ['Proposal remaining',s=>s.replace('"remaining":0,"removedOwnedTargets"','"remaining":1,"removedOwnedTargets"')],
  ['Proposal checks',s=>s.replace('"checks":3','"checks":4')],
  ['Proposal cleanup HOLD',s=>s.replace('"cleanup":***"status":"PASS"','"cleanup":***"status":"HOLD"')],
  ['Proposal removed count',s=>s.replace('"removedOwnedTargets":8','"removedOwnedTargets":7')],
  ['Proposal errors',s=>s.replace('"errors":[]','"errors":["unexpected"]')],
  ['Proposal real pointer change',s=>s.replace('"realControlUnchanged":true','"realControlUnchanged":false')],
  ['Proposal script echo',s=>s.replace('Z ***"sourceSha"','Z echo ***"sourceSha"')],
  ['Proposal missing observed check',s=>s.replace(/[^\n]*I66_PROPOSAL_UAT_CHECK=ISOLATED_SYNTHETIC_STAGE_NO_REAL_POINTER_CHANGE\n/,'')],
  ['Proposal error code',s=>s.replace('I66_PROPOSAL_SIGNED_UAT_HOLD ERR_ASSERTION','I66_PROPOSAL_SIGNED_UAT_HOLD TIMEOUT_ERROR')],
  ['Proposal invented success',s=>s+'\n'+stamp+'I66_PROPOSAL_SIGNED_UAT_PASS {}'],
  ['signed workflow invented success',s=>s+'\n'+stamp+'I66_ROLE_PREVIEW_SIGNED_CARLOS_PAULA_SYNTHETIC_FUNCTIONAL_UAT_PASS_ZERO_REAL_CUSTOMER_WRITES'],
  ['Proposal duplicate HOLD',s=>s+'\n'+stamp+'I66_PROPOSAL_SIGNED_UAT_HOLD ERR_ASSERTION'],
  ['Proposal duplicate summary',s=>s+'\n'+s.split('\n').find(line=>line.includes('"realControlUnchanged"'))],
  ['LIVE proof echo',s=>s.replace('Z I66_PREVIEW_BACKEND_ONLY_ZERO_LIVE_HOSTING_CHANGES_PASS','Z echo I66_PREVIEW_BACKEND_ONLY_ZERO_LIVE_HOSTING_CHANGES_PASS')]
])test('failed39 evidence rejects '+name,()=>{
  const f=fixture();assert.throws(()=>restore.validateFailedQa(f.meta.failedQaRun,f.meta.failedQaJob,change(f.meta.failedQaLog)));
});
test('wrong QA lineage and diagnostic archive cannot satisfy source39 cleanup',()=>{
  const f=fixture();
  for(const field of ['id','head_sha','head_branch','path','conclusion']){
    const run={...f.meta.failedQaRun,[field]:'wrong'};assert.throws(()=>restore.validateFailedQa(run,f.meta.failedQaJob,f.meta.failedQaLog));
  }
  for(const field of ['id','run_id','name','status','conclusion']){
    const job={...f.meta.failedQaJob,[field]:'wrong'};assert.throws(()=>restore.validateFailedQa(f.meta.failedQaRun,job,f.meta.failedQaLog));
  }
  for(const change of [x=>x.workflow_run.head_branch='main',x=>x.workflow_run.head_sha=owner.CURRENT_FAILED.qaHeadSha,
    x=>x.workflow_run.id=owner.CURRENT_FAILED.qaRunId,x=>x.id=owner.CURRENT_DIAGNOSTIC.artifactId,
    x=>x.digest=owner.CURRENT_DIAGNOSTIC.artifactDigest,x=>x.size_in_bytes++,x=>x.expired=true]){
    const artifact=clone(f.meta.failedQaDiagnosticArtifact);change(artifact);
    assert.throws(()=>restore.validateStructuredCleanup(artifact,diagnosticBytes,f.diagnosticText));
  }
  for(const text of [f.diagnosticText+' ',f.diagnosticText.replace('"remaining": 0','"remaining": 1'),
    f.diagnosticText.replace('"checks": 3','"checks": 4'),f.diagnosticText.replace('"status": "HOLD"','"status": "PASS"')])
    assert.throws(()=>restore.validateStructuredCleanup(f.meta.failedQaDiagnosticArtifact,diagnosticBytes,text));
  const mutated=Buffer.from(diagnosticBytes);mutated[200]^=1;
  assert.throws(()=>restore.validateDiagnosticBytes(mutated));
  assert.throws(()=>restore.validateDiagnosticBytes(diagnosticBytes.subarray(0,671)));
  assert.throws(()=>owner.currentRestore.validateStructuredCleanup(f.meta.failedQaDiagnosticArtifact,diagnosticBytes,f.diagnosticText));
});
test('source39 restore retains ordered backups, fresh inventory and only one exact R11 Preview clone',async()=>{
  const f=fixture(),{io,events}=ioFixture(f);await restore.restorePreview(f.control,f.initial,io,f.report);
  assert.deepEqual(events,['metadata','diagnostic','backup:failed','backup:r11','readback:'+PREVIEW+':failed',
    ...LIVE_ORIGINS.map(x=>'readback:'+x+':r11'),'inventory','clone-exact-preview','inventory','wait-exact:r11',
    'readback:'+PREVIEW+':r11',...LIVE_ORIGINS.map(x=>'readback:'+x+':r11')]);
  assert.equal(f.report.status,'EXACT_R11_PREVIEW_RESTORED_VERIFIED_NOT_PRODUCT_ACCEPTANCE');
  assert.equal(f.report.previewClonePerformed,true);assert.equal(f.report.productAccepted,false);
});
for(const [name,change] of [
  ['CxP cleanup',f=>f.meta.failedQaLog=f.meta.failedQaLog.replace('"remaining":0','"remaining":1')],
  ['Proposal cleanup',f=>f.meta.failedQaLog=f.meta.failedQaLog.replace('"remaining":0,"removedOwnedTargets"','"remaining":1,"removedOwnedTargets"')],
  ['diagnostic branch',f=>f.meta.failedQaDiagnosticArtifact.workflow_run.head_branch='main'],
  ['diagnostic id',f=>f.meta.failedQaDiagnosticArtifact.id++],
  ['LIVE version',f=>f.initial.result[1].release.version.name=F.hostingVersion],
  ['Preview version',f=>f.initial.result[0].release.version.name=owner.CURRENT_FAILED.hostingVersion]
])test('source39 never clones after drift in '+name,async()=>{
  const f=fixture();change(f);const {io,events}=ioFixture(f);
  await assert.rejects(restore.restorePreview(f.control,f.initial,io,f.report));
  assert.ok(!events.includes('clone-exact-preview'));assert.equal(f.report.previewCloneRequested,false);assert.equal(f.report.productAccepted,false);
});
test('already exact R11 does no metadata requests or clone under source39 authorization',async()=>{
  const f=fixture(),{io,events}=ioFixture(f);await restore.restorePreview(f.control,f.after,io,f.report);
  assert.deepEqual(events,[]);assert.equal(f.report.previewClonePerformed,false);assert.equal(f.report.productAccepted,false);
});
function entryHarness(authorization,{cli=false}={}){
  const f=fixture();f.control.previewChannelReuseAuthorization.failedCandidateRestore=clone(authorization);
  const code=fs.readFileSync('tools/gravicentra-i6-6-preview-current-live-restore.cjs','utf8'),box={exports:{}},events=[];
  const shim={...fs,readFileSync(file){
    const p=String(file);
    if(p.endsWith('I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json'))return JSON.stringify(f.control);
    if(p.endsWith('gi-i66-reuse-before.json'))return JSON.stringify(f.initial);
    throw Error('UNEXPECTED_READ');
  },mkdtempSync(){events.push('output-boundary');throw Error('INTENTIONAL_OUTPUT_BOUNDARY');}};
  const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'paulaosoriof86/orbit360-core',
    GITHUB_REF:'refs/heads/'+BRANCH,GITHUB_WORKFLOW:'Gravicentra I6.6 Build Immutable Release Package',RUNNER_TEMP:'/tmp/synthetic-restore-boundary'};
  const fakeProcess={env,exitCode:0},fakeRequire=name=>name==='node:fs'?shim:require(name);
  if(cli)fakeRequire.main=box;
  Function('module','exports','require','__dirname','process','console',code)(box,box.exports,fakeRequire,__dirname,fakeProcess,
    {log(){throw Error('UNEXPECTED_SUCCESS_LOG');},error(message){events.push(message);}});
  return{api:box.exports,events,env,fakeProcess};
}
test('historical exported main47 refuses new39 authority before output, credentials or network',async()=>{
  const h=entryHarness(A);await assert.rejects(h.api.main(h.env),/I66_RESTORE_EXACT_AUTHORIZATION_REQUIRED/);
  assert.deepEqual(h.events,[]);assert.equal(h.api.main,h.api.currentRestore.main);
});
test('actual CLI39 refuses both historical authorizations before runtime I/O',async()=>{
  for(const old of [owner.AUTHORIZATION,owner.CURRENT_AUTHORIZATION]){
    const h=entryHarness(old,{cli:true});await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(h.events,['I66_PREVIEW_RESTORE_HOLD_FAIL_CLOSED']);assert.equal(h.fakeProcess.exitCode,1);
  }
});
test('actual CLI39 dispatch accepts new39 authority up to the synthetic output boundary only',async()=>{
  const h=entryHarness(A,{cli:true});await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(h.events,['output-boundary','I66_PREVIEW_RESTORE_HOLD_FAIL_CLOSED']);assert.equal(h.fakeProcess.exitCode,1);
  assert.equal(h.api.activeMain,h.api.activeRestore.main);assert.notEqual(h.api.activeMain,h.api.main);
});
