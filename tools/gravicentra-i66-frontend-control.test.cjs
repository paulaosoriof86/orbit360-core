'use strict';
const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');
const owner=require('./gravicentra-i66-frontend-control.cjs');
const candidate=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const {P,genName,physicalGuard,blob}=owner;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const serial=value=>JSON.stringify(value,null,2)+'\n';

function nativeContinuationFixture(){
  const evidencePath='artifacts/orbit360-recovery/release-control/I6_6_NATIVE_PROGRESS_TEST.json';
  const ref=fragment=>({path:evidencePath,fragment});
  const sourceSha='1'.repeat(40),sourceQaHead='2'.repeat(40);
  const request={version:7,sourceQaHead,sourceQaRunId:101,guardRunId:102};
  const artifact={uri:'gs://example-private-evidence/packages/immutable.tar.gz',generation:'100',sha256:'3'.repeat(64),bytes:1234};
  const packaged={provider:'GOOGLE_CLOUD_BUILD',scope:'PACKAGE_ONLY',requestVersion:7,sourceSha,
    buildId:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',status:'SUCCESS',finalResultObserved:true,
    artifactCreated:true,artifactReadbackVerified:true,artifact,previewAccepted:false,liveAccepted:false,releaseAcceptance:false};
  const hosting={provider:'GOOGLE_CLOUD_BUILD',scope:'EXISTING_HOSTING_PREVIEW_ONLY_SIGNED_QA_AND_LIVE_PENDING',
    requestVersion:7,sourceSha,buildId:'11111111-2222-3333-4444-555555555555',status:'SUCCESS',
    finalResultObserved:true,hostingReadbackVerified:true,hostingVersion:'sites/example/versions/retained',
    packageBuildId:packaged.buildId,packageArtifact:structuredClone(artifact),packageEvidence:ref('nativePackageEvidence'),
    samePackageArtifactRequired:true,signedFunctionalPreviewAccepted:false,backendDeploys:0,liveDeploys:0,businessWrites:0};
  const p={shockObjectives:{items:[{id:'OPEN_FLOW',title:'Operational flow',
    status:'V7_PROVIDER_BILLING_HOLD_SIGNED_RUNTIME_PENDING',evidence:'Retained request and provider proof',
    next:'Complete exact signed runtime gates.',passForShock:false}]},
    pendingImmutableBuild:{...request,sourceSha,provider:'GOOGLE_CLOUD_BUILD',providerBuildId:packaged.buildId,
      providerStatus:'SUCCESS',nativeExecutionEvidence:ref('nativePackageEvidence'),hostingPreviewContinuation:ref('nativeHostingEvidence')},
    currentSuccessorPlan:{...request,plannedRequestVersion:7,sourceSha,providerExecution:ref('nativePackageEvidence'),
      artifactIdentity:ref('nativePackageEvidence.artifact'),hostingPreviewExecution:ref('nativeHostingEvidence'),
      signedPreviewAccepted:false,signedLiveAccepted:false},
    nativePackageEvidence:packaged,nativeHostingEvidence:hosting,
    historicalBillingReceipt:{status:'V7_PROVIDER_BILLING_HOLD_SIGNED_RUNTIME_PENDING',provider:'GITHUB_ACTIONS'}};
  const cp={i66ActiveRecoveryCursor:{currentEvidencePath:evidencePath}},transport={frontendPreviewRequest:request};
  const files=new Map();
  const io={readdirSync:()=>[],readFileSync:path=>{
    if(path===P.transport)return serial(transport);
    assert.ok(files.has(path),'UNEXPECTED_NATIVE_FIXTURE_READ:'+path);return files.get(path);
  }};
  const bind=()=>{const bytes=serial(p);files.set(cp.i66ActiveRecoveryCursor.currentEvidencePath,bytes);
    cp.i66ActiveRecoveryCursor.currentEvidenceBlobSha=blob(bytes);};
  owner.synchronizeExecutionProgress(p);bind();
  const reconcile=()=>{p.shockObjectives.items[0].status='NATIVE_TRANSPORT_CERTIFIED_SIGNED_RUNTIME_PENDING';
    owner.synchronizeExecutionProgress(p);bind();};
  return {cp,p,transport,files,io,bind,reconcile,resolve:()=>owner.resolveNativeExecutionProgress(cp,p,io),
    verify:()=>owner.assertExecutionProgress(cp,p,io)};
}
test('native continuation rejects a stale billing blocker even when all copied projections agree',()=>{
  const f=nativeContinuationFixture(),before=serial({cp:f.cp,p:f.p});
  assert.deepEqual(f.p.remainingExecutionLanes,owner.executionProgressProjection(f.p).remainingExecutionLanes);
  const derived=f.resolve();
  assert.equal(derived.package.readbackCertified,true);assert.equal(derived.hostingPreview.readbackCertified,true);
  assert.equal(derived.signedFunctionalAcceptanceEstablished,false);assert.equal(derived.liveAcceptanceEstablished,false);
  assert.throws(f.verify,/I66_NATIVE_PROGRESS_STALE_PROVIDER_BILLING_objective.OPEN_FLOW/);
  assert.equal(serial({cp:f.cp,p:f.p}),before);
});
test('native continuation accepts the corrected pending state without changing proof or advancing acceptance',()=>{
  const f=nativeContinuationFixture(),proof=serial([f.p.nativePackageEvidence,f.p.nativeHostingEvidence,f.p.historicalBillingReceipt]);
  f.reconcile();const before=serial(f.p);assert.doesNotThrow(f.verify);
  assert.equal(serial(f.p),before);assert.equal(f.p.shockObjectives.items[0].passForShock,false);
  assert.equal(f.p.currentSuccessorPlan.signedPreviewAccepted,false);assert.equal(f.p.currentSuccessorPlan.signedLiveAccepted,false);
  assert.equal(serial([f.p.nativePackageEvidence,f.p.nativeHostingEvidence,f.p.historicalBillingReceipt]),proof);
});
test('native continuation preserves a distinct request billing hold and an unrelated unbound Actions lane',()=>{
  const f=nativeContinuationFixture();f.reconcile();
  f.p.parallelLanes=[{id:'OTHER_REQUEST',status:'V8_PROVIDER_BILLING_HOLD_SIGNED_RUNTIME_PENDING'},
    {id:'FINANCIAL_WRITER',provider:'GITHUB_ACTIONS',status:'PROVIDER_BILLING_HOLD_PROTECTED_FINANCIAL_WRITER_PENDING'}];
  f.p.shockObjectives.items.push({id:'OTHER_FLOW',title:'Independent provider operation',
    status:'V8_PROVIDER_BILLING_HOLD_SIGNED_RUNTIME_PENDING',evidence:'Separate request evidence',
    next:'Keep the independent provider hold.',passForShock:false});
  owner.synchronizeExecutionProgress(f.p);f.bind();const before=serial(f.p);
  assert.doesNotThrow(f.verify);assert.equal(serial(f.p),before);
  f.p.parallelLanes[0].status='V7_PROVIDER_BILLING_HOLD_SIGNED_RUNTIME_PENDING';f.bind();
  assert.throws(f.verify,/I66_NATIVE_PROGRESS_STALE_PROVIDER_BILLING_parallel.OTHER_REQUEST/);
});
test('native continuation rejects request source and immutable package substitutions independently',()=>{
  const mutations=[
    [f=>f.p.nativePackageEvidence.requestVersion++,/REQUEST_DRIFT_PACKAGE/],
    [f=>f.transport.frontendPreviewRequest.version++,/REQUEST_DRIFT/],
    [f=>f.p.nativePackageEvidence.sourceSha='4'.repeat(40),/SOURCE_DRIFT_PACKAGE/],
    [f=>f.p.nativeHostingEvidence.sourceSha='4'.repeat(40),/SOURCE_DRIFT_HOSTING/],
    [f=>f.p.nativeHostingEvidence.requestVersion++,/REQUEST_DRIFT_HOSTING/],
    [f=>f.p.nativeHostingEvidence.packageArtifact.sha256='5'.repeat(64),/HOSTING_ARTIFACT_DRIFT/],
    [f=>f.p.nativeHostingEvidence.packageArtifact.generation='101',/HOSTING_ARTIFACT_DRIFT/],
    [f=>f.p.nativeHostingEvidence.packageBuildId='66666666-7777-8888-9999-aaaaaaaaaaaa',/HOSTING_PACKAGE_BUILD_DRIFT/],
    [f=>f.p.currentSuccessorPlan.sourceSha='4'.repeat(40),/PLAN_SOURCE_DRIFT/],
    [f=>f.p.currentSuccessorPlan.sourceQaHead='4'.repeat(40),/REQUEST_BINDING_DRIFT_sourceQaHead/]
  ];
  for(const [mutate,error] of mutations){const f=nativeContinuationFixture();f.reconcile();mutate(f);f.bind();assert.throws(f.verify,error);}
});
test('native continuation requires the exact active cursor and safe pinned fragment references',()=>{
  for(const [mutate,error] of [
    [f=>f.cp.i66ActiveRecoveryCursor.currentEvidenceBlobSha='0'.repeat(40),/CURSOR_BLOB_DRIFT/],
    [f=>{f.p.pendingImmutableBuild.nativeExecutionEvidence.fragment='nativeHostingEvidence';f.bind();},/REFERENCE_FRAGMENT_DRIFT_PACKAGE/],
    [f=>{f.p.pendingImmutableBuild.nativeExecutionEvidence.path='../other.json';f.bind();},/REFERENCE_PATH_DRIFT_PACKAGE/],
    [f=>{f.p.pendingImmutableBuild.nativeExecutionEvidence.gitBlobSha='0'.repeat(40);f.bind();},/REFERENCE_BLOB_DRIFT_PACKAGE/],
    [f=>{f.p.currentSuccessorPlan.artifactIdentity.fragment='constructor.prototype';f.bind();},/REFERENCE_FRAGMENT_INVALID_ARTIFACT/],
    [f=>{f.p.currentSuccessorPlan.artifactIdentity={path:f.cp.i66ActiveRecoveryCursor.currentEvidencePath,fragment:'nativeHostingEvidence.packageArtifact'};
      f.p.nativeHostingEvidence.packageArtifact.sha256='6'.repeat(64);f.bind();},/PLAN_ARTIFACT_DRIFT/]
  ]){const f=nativeContinuationFixture();f.reconcile();mutate(f);assert.throws(f.verify,error);}
});
test('native continuation reads immutable prior evidence by its pinned path and rejects edited historical bytes',()=>{
  const f=nativeContinuationFixture(),priorPath=f.cp.i66ActiveRecoveryCursor.currentEvidencePath;
  const priorBytes=f.files.get(priorPath),priorBlob=blob(priorBytes);
  f.cp.i66ActiveRecoveryCursor.currentEvidencePath=priorPath.replace('_TEST.json','_SUCCESSOR_TEST.json');
  f.p.previousEvidencePath=priorPath;f.p.previousEvidenceBlobSha=priorBlob;f.reconcile();
  assert.doesNotThrow(f.verify);assert.equal(f.files.get(priorPath),priorBytes);
  f.files.set(priorPath,priorBytes+' ');assert.throws(f.verify,/REFERENCE_BLOB_DRIFT_PACKAGE/);
});
test('native continuation rejects a false functional acceptance or undeclared hosting effects in transport-only proof',()=>{
  for(const [mutate,error] of [
    [f=>f.p.nativePackageEvidence.liveAccepted=true,/PACKAGE_ACCEPTANCE_SCOPE_liveAccepted/],
    [f=>f.p.nativeHostingEvidence.signedFunctionalPreviewAccepted=true,/HOSTING_ACCEPTANCE_SCOPE/],
    [f=>f.p.nativeHostingEvidence.businessWrites=1,/HOSTING_EFFECT_SCOPE_businessWrites/]
  ]){const f=nativeContinuationFixture();f.reconcile();mutate(f);f.bind();assert.throws(f.verify,error);}
});
test('native continuation does not infer certification from a submitted or unread package',()=>{
  const f=nativeContinuationFixture();
  Object.assign(f.p.nativePackageEvidence,{status:'WORKING',finalResultObserved:false,artifactCreated:false,artifactReadbackVerified:false});
  f.p.pendingImmutableBuild.providerStatus='WORKING';delete f.p.nativePackageEvidence.artifact;
  delete f.p.currentSuccessorPlan.artifactIdentity;delete f.p.currentSuccessorPlan.hostingPreviewExecution;
  delete f.p.pendingImmutableBuild.hostingPreviewContinuation;f.bind();
  const result=f.resolve();assert.equal(result.package.readbackCertified,false);assert.equal(result.hostingPreview,null);
  assert.equal(result.liveAcceptanceEstablished,false);assert.doesNotThrow(f.verify);
});
test('native continuation leaves legacy and unrelated archived provider evidence unchanged',()=>{
  const cp={},p={priorNativeExecution:{provider:'GOOGLE_CLOUD_BUILD',status:'SUCCESS'},
    pendingImmutableBuild:{provider:'GITHUB_ACTIONS',version:8}};
  const before=serial({cp,p});
  assert.equal(owner.resolveNativeExecutionProgress(cp,p,{readFileSync:()=>assert.fail('LEGACY_MUST_NOT_READ_NATIVE_AUTHORITY')}),null);
  assert.equal(serial({cp,p}),before);
});
function consumeNativeFixture(f){
  const request=structuredClone(f.transport.frontendPreviewRequest);
  f.transport.lastConsumedFrontendPreviewRequest=request;
  f.transport.lastConsumedFrontendRelease={generation:4,previewRequestVersion:request.version,
    sourceSha:f.p.pendingImmutableBuild.sourceSha,artifactDigest:'sha256:'+f.p.nativePackageEvidence.artifact.sha256,
    receiptPath:genName(4,'RECEIPT')};
  f.cp.i66FrontendReleaseHead=structuredClone(f.transport.lastConsumedFrontendRelease);
  f.p.consumedPreviewRequest=structuredClone(request);delete f.transport.frontendPreviewRequest;f.bind();
}
test('native continuation recognizes exact consumed request history without blocking composite closure or transferring PASS',()=>{
  const f=nativeContinuationFixture();consumeNativeFixture(f);
  const result=f.resolve();assert.equal(result.disposition,'CONSUMED_EXACT_RELEASE_HISTORY');
  assert.equal(result.liveAcceptanceEstablished,false);assert.doesNotThrow(f.verify);
  assert.equal(f.p.shockObjectives.items[0].passForShock,false);
  assert.equal(f.p.shockObjectives.items[0].status,'V7_PROVIDER_BILLING_HOLD_SIGNED_RUNTIME_PENDING');
});
test('native continuation rejects consumed request history for another source digest or release head',()=>{
  for(const [mutate,error] of [
    [f=>f.transport.lastConsumedFrontendRelease.sourceSha='4'.repeat(40),/CONSUMED_SOURCE_DRIFT/],
    [f=>f.transport.lastConsumedFrontendRelease.artifactDigest='sha256:'+'5'.repeat(64),/CONSUMED_ARTIFACT_DRIFT/],
    [f=>f.cp.i66FrontendReleaseHead.generation++,/CONSUMED_HEAD_DRIFT_generation/],
    [f=>f.transport.lastConsumedFrontendPreviewRequest.version++,/REQUEST_DRIFT/],
    [f=>delete f.transport.lastConsumedFrontendRelease,/REQUEST_REQUIRED/]
  ]){const f=nativeContinuationFixture();consumeNativeFixture(f);mutate(f);f.bind();assert.throws(f.verify,error);}
});

function retiredContinuationFixture(){
  const cp=read(P.cp),progress=read('artifacts/orbit360-recovery/release-control/I6_6_CURRENT_EXECUTION_PROGRESS_20261124_R60.json');
  return {cp,progress,verify:()=>owner.assertRetiredReleaseContinuation(cp,progress)};
}
test('current R60 continuation preserves retired Preview28 evidence without directing its execution',()=>{
  const f=retiredContinuationFixture(),before=serial(f);assert.doesNotThrow(f.verify);assert.equal(serial(f),before);
});
test('R59 A12 retry is rejected even after its objective, remaining lane and nextIncomplete are synchronized',()=>{
  const f=retiredContinuationFixture(),old=read('artifacts/orbit360-recovery/release-control/I6_6_CURRENT_EXECUTION_PROGRESS_20261124_R59.json');
  f.progress.shockObjectives.items.find(x=>x.id==='A12').next=old.shockObjectives.items.find(x=>x.id==='A12').next;
  owner.synchronizeExecutionProgress(f.progress);
  assert.deepEqual(f.progress.remainingExecutionLanes,owner.executionProgressProjection(f.progress).remainingExecutionLanes);
  assert.throws(()=>owner.assertExecutionProgress(f.cp,f.progress,fs),/I66_PROGRESS_RETIRED_NEXT_TARGET_objective.A12/);
});
test('a built but retired target cannot reappear as the pending immutable build',()=>{
  const old=read('artifacts/orbit360-recovery/release-control/I6_6_CURRENT_EXECUTION_PROGRESS_20261124_R59.json');
  const f=retiredContinuationFixture();f.progress.pendingImmutableBuild=structuredClone(old.pendingImmutableBuild);
  assert.throws(f.verify,/I66_PROGRESS_RETIRED_PENDING_VERSION/);
  for(const key of ['sourceSha','buildId','artifactId','artifactDigest']){
    const changed=retiredContinuationFixture();changed.progress.pendingImmutableBuild[key]=changed.progress.latestImmutableBuild[key];
    assert.throws(changed.verify,new RegExp('I66_PROGRESS_RETIRED_PENDING_TARGET_'+key));
  }
});
test('active execution aliases independently reject a retired retry; an archived old next step remains historical',()=>{
  for(const mutate of [
    f=>{f.progress.immediateExecution.financialFocal='Execute exact Preview on immutable v28.';},
    f=>{f.progress.frontendBalanceCorrection.next='Promote artifact '+f.progress.latestImmutableBuild.artifactId+'.';},
    f=>{f.progress.parallelLanes[0].next='Run Preview28 now.';},
    f=>{f.cp.i66ActiveRecoveryCursor.next='Publicar v28 en producción.';},
    f=>{f.cp.nextAction='Deploy '+f.progress.latestImmutableBuild.sourceSha+'.';},
    f=>{f.cp.i66OperationalContinuation20261115.currentWork='Reintentar v28.';}
  ]){const f=retiredContinuationFixture();mutate(f);assert.throws(f.verify,/I66_PROGRESS_RETIRED_NEXT_TARGET_/);}
  const historical=retiredContinuationFixture();
  historical.progress.continuationBeforeR60.extraOldNext='Execute exact Preview on immutable v28.';
  historical.progress.shockObjectives.items.find(x=>x.id==='A12').evidence+=' Historical instruction: promote v28.';
  assert.doesNotThrow(historical.verify);
});
test('retired prohibitions and a distinct successor are allowed, but a contradictory appended retry is rejected',()=>{
  for(const next of ['Do not execute or promote failed Preview28. Execute exact Preview v29.',
    'No ejecutar v28; publicar v29 después de pruebas.',
    'Never rerun v28. Preserve its failed proof.',
    'Promote the verified v29 artifact after exact Preview.']){
    const f=retiredContinuationFixture();f.progress.next=next;assert.doesNotThrow(f.verify);
  }
  for(const next of ['Do not execute v28; promote v28.',
    'Never rerun v28, but deploy v28.',
    'No ejecutar Preview28. Publicar Preview28.']){
    const f=retiredContinuationFixture();f.progress.next=next;assert.throws(f.verify,/I66_PROGRESS_RETIRED_NEXT_TARGET_next/);
  }
});

test('execution snapshot tracks request, scoped Preview and operational candidate without mutable aliases',()=>{
  const transport={status:'PREVIEW_AUTHORIZED',frontendPreviewRequest:{version:12,sourceQaHead:'source-a',sourceQaRunId:101,guardRunId:102},
    scopedBackendPreviewI66:{sourceSha:'source-a',artifactDigest:'digest-a'},
    operationalReleaseCandidate:{status:'LIVE_AUTHORIZED',sourceSha:'source-a',artifactDigest:'digest-a',previewQa:{runId:103}}};
  const snapshot=owner.executionSnapshot(transport);
  assert.deepEqual(snapshot,{transportStatus:'PREVIEW_AUTHORIZED',previewRequest:{version:12,sourceQaHead:'source-a',sourceQaRunId:101,guardRunId:102},
    scopedPreview:{sourceSha:'source-a',artifactDigest:'digest-a'},
    operationalCandidate:{status:'LIVE_AUTHORIZED',sourceSha:'source-a',artifactDigest:'digest-a',previewQaRunId:103}});
  for(const mutate of [t=>t.status='LOCKED',t=>t.frontendPreviewRequest.version++,t=>t.frontendPreviewRequest.sourceQaHead='source-b',
    t=>t.frontendPreviewRequest.sourceQaRunId++,t=>t.frontendPreviewRequest.guardRunId++,t=>t.scopedBackendPreviewI66.sourceSha='source-b',
    t=>t.scopedBackendPreviewI66.artifactDigest='digest-b',t=>t.operationalReleaseCandidate.status='CONSUMED',
    t=>t.operationalReleaseCandidate.sourceSha='source-b',t=>t.operationalReleaseCandidate.artifactDigest='digest-b',
    t=>t.operationalReleaseCandidate.previewQa.runId++]){
    const changed=structuredClone(transport);mutate(changed);assert.notDeepEqual(owner.executionSnapshot(changed),snapshot);
  }
  transport.frontendPreviewRequest.version++;transport.scopedBackendPreviewI66.sourceSha='later';
  transport.operationalReleaseCandidate.previewQa.runId++;
  assert.equal(snapshot.previewRequest.version,12);assert.equal(snapshot.scopedPreview.sourceSha,'source-a');
  assert.equal(snapshot.operationalCandidate.previewQaRunId,103);
  assert.deepEqual(owner.executionSnapshot({status:'LOCKED'}),{transportStatus:'LOCKED',previewRequest:null,scopedPreview:null,operationalCandidate:null});
});

function progressModel(progressPath='artifacts/orbit360-recovery/release-control/I6_6_CURRENT_EXECUTION_PROGRESS_20261124_R23.json'){
  // Keep this causal fixture bound to its immutable observed result. A later
  // legitimate role, batch or objective completion must not be forced back to
  // today's 140 checks or today's twelve open lanes by a historical test.
  const progress=read(progressPath);
  const observations=progress.postAcceptanceObserverResults,receipt=read(observations.receiptPath);
  const {fiveRoles:role,performance,financialSixReceiptUi:financial}=observations;
  const cp={i66FrontendReleaseHead:structuredClone(receipt.target),i66ActiveRecoveryCursor:{
    lastObserverResultsReceipt:observations.receiptPath,lastObserverResultsReceiptGitBlobSha:observations.receiptGitBlobSha,
    lastFiveRoleMatrixRunId:role.runId,lastFiveRoleMatrixStatus:role.status,lastFiveRoleMatrixArtifactId:role.artifactId,
    lastFiveRoleMatrixArtifactDigest:role.artifactDigest,lastPerformanceRunId:performance.runId,
    lastPerformanceEvidenceArtifactId:performance.artifactId,lastFinancialUiReadbackRunId:financial.runId,
    lastFinancialUiReadbackStatus:financial.status},
    i66OperationalContinuation20261115:{postAcceptanceGovernanceQa:{observers:{performance:{qaPins:{prior:'retained until source QA passes'}}}}}};
  // A valid starting projection is generated by the same existing publication
  // owner. The tests then reproduce the independently observed stale fields.
  owner.synchronizeExecutionProgress(progress);
  return {cp,progress,verify:()=>owner.assertExecutionProgress(cp,progress,fs)};
}
test('progress projection preserves the actual scoped results without advancing an unproved full gate',()=>{
  const f=progressModel(),before=structuredClone(f.progress.shockObjectives);
  const projection=f.verify();
  assert.deepEqual(f.progress.shockObjectives,before);
  assert.equal(projection.remainingExecutionLanes.length,12);
  assert.equal(f.progress.postAcceptanceObserverResults.fiveRoles.routeChecks,140);
  assert.equal(f.progress.postAcceptanceObserverResults.fiveRoles.fullA04Accepted,false);
  assert.equal(f.progress.postAcceptanceObserverResults.financialSixReceiptUi.fullA12Passed,false);
});
test('progress reproduces and rejects the old Chrome and performance lane statuses',()=>{
  const previous=read('artifacts/orbit360-recovery/release-control/I6_6_CURRENT_EXECUTION_PROGRESS_20261124_R22.json');
  for(const id of ['A03','A14']){
    const f=progressModel(),old=previous.remainingExecutionLanes.find(row=>row.id===id);
    Object.assign(f.progress.remainingExecutionLanes.find(row=>row.id===id),{status:old.status,next:old.next});
    assert.throws(f.verify,/I66_PROGRESS_REMAINING_LANES_DRIFT/);
  }
});
test('progress rejects a lane with a stale proof even if its status still matches',()=>{
  const f=progressModel();f.progress.remainingExecutionLanes.find(row=>row.id==='A04').evidence='45074429319 / 112 route checks';
  assert.throws(f.verify,/I66_PROGRESS_REMAINING_LANES_DRIFT/);
});
test('progress rejects obsolete Preview work after the composite artifact is already LIVE accepted',()=>{
  const f=progressModel(),old=read('artifacts/orbit360-recovery/release-control/I6_6_CURRENT_EXECUTION_PROGRESS_20261124_R22.json');
  f.progress.updateDiscipline.nextIncomplete=old.updateDiscipline.nextIncomplete;
  assert.throws(f.verify,/I66_PROGRESS_NEXT_INCOMPLETE_DRIFT/);
});
test('progress rejects completion or reordering that only edits the derived remaining list',()=>{
  for(const mutate of [p=>p.remainingExecutionLanes.shift(),p=>p.remainingExecutionLanes.reverse()]){
    const f=progressModel();mutate(f.progress);assert.throws(f.verify,/I66_PROGRESS_REMAINING_LANES_DRIFT/);
  }
});
test('progress rejects the old four-role cursor after the five-role result was recorded',()=>{
  const f=progressModel();f.cp.i66ActiveRecoveryCursor.lastFiveRoleMatrixRunId=45074429319;
  assert.throws(f.verify,/I66_PROGRESS_ROLE_RUN_DRIFT/);
});
test('progress rejects stale performance and financial cursors independently',()=>{
  const p=progressModel();p.cp.i66ActiveRecoveryCursor.lastPerformanceRunId=45294264139;
  assert.throws(p.verify,/I66_PROGRESS_PERFORMANCE_RUN_DRIFT/);
  const f=progressModel();f.cp.i66ActiveRecoveryCursor.lastFinancialUiReadbackStatus='PASS';
  assert.throws(f.verify,/I66_PROGRESS_FINANCIAL_UI_STATUS_DRIFT/);
});
test('progress does not turn scoped read-only success into full A04 or A12 or A14 acceptance',()=>{
  for(const id of ['A04','A12','A14']){
    const f=progressModel();f.progress.shockObjectives.items.find(row=>row.id===id).passForShock=true;
    owner.synchronizeExecutionProgress(f.progress);
    assert.throws(f.verify,new RegExp('I66_PROGRESS_PARTIAL_OBSERVER_FALSE_FULL_PASS_'+id));
  }
});
test('progress refuses an observer receipt pinned to another deployed artifact',()=>{
  const f=progressModel();f.cp.i66FrontendReleaseHead.artifactId++;
  assert.throws(f.verify,/I66_PROGRESS_OBSERVER_TARGET_DRIFT_artifactId/);
});
test('progress rejects deletion or edited summary of the pinned observer results',()=>{
  const missing=progressModel();delete missing.progress.postAcceptanceObserverResults;
  assert.throws(missing.verify,/I66_PROGRESS_OBSERVER_RESULTS_REMOVED/);
  const edited=progressModel();edited.progress.postAcceptanceObserverResults.financialSixReceiptUi.status='PASS';
  assert.throws(edited.verify,/I66_PROGRESS_OBSERVER_RESULT_DRIFT_financialSixReceiptUi/);
});
test('progress guard reads neither staged observer source nor its previous QA pins',()=>{
  const f=progressModel(),before=structuredClone(f.cp.i66OperationalContinuation20261115.postAcceptanceGovernanceQa);
  f.verify();
  assert.deepEqual(f.cp.i66OperationalContinuation20261115.postAcceptanceGovernanceQa,before);
  f.cp.i66OperationalContinuation20261115.postAcceptanceGovernanceQa={observers:{performance:{qaPins:{prior:'retained until source QA passes'}}}};
  assert.doesNotThrow(f.verify);
});
function successorModel(){
  const f=progressModel(),oldTarget=structuredClone(f.cp.i66FrontendReleaseHead);
  const target={...oldTarget,generation:oldTarget.generation+1,sourceSha:'a'.repeat(40),sourceTree:'b'.repeat(40),
    compositionBlob:'c'.repeat(40),manifestBlob:'d'.repeat(40),artifactId:oldTarget.artifactId+1,
    artifactDigest:'sha256:'+'e'.repeat(64),hostingVersion:'sites/test/versions/successor',buildId:'successor-build',
    files:224,previewUrl:'https://successor.invalid',buildRunId:9001};
  const cursor=f.cp.i66ActiveRecoveryCursor,continuation=f.cp.i66OperationalContinuation20261115;
  cursor.currentEvidencePath='artifacts/orbit360-recovery/release-control/I6_6_CURRENT_EXECUTION_PROGRESS_20261124_R23.json';
  cursor.currentEvidenceBlobSha=blob(serial(f.progress));cursor.next=f.progress.next;
  continuation.postAcceptanceObserverResults20261124={receiptPath:f.progress.postAcceptanceObserverResults.receiptPath};
  continuation.postAcceptanceGovernanceQa.observers={fiveRoles:{target:oldTarget,qaPins:{old:'historical'}},
    performance:{target:oldTarget,qaPins:{old:'historical'}}};
  continuation.acceptedLivePerformanceRequest20261124={...oldTarget,mode:'EXISTING_LIVE_READONLY_DRIVER'};
  const journal={generation:target.generation,request:{target,previous:{hostingVersion:oldTarget.hostingVersion},approvalBlob:'f'.repeat(40)}};
  const body={phase:'COMMITTED',receipt:{blob:'1'.repeat(40),commit:'2'.repeat(40),runId:9002}};
  const inputs=new Map([[P.cp,f.cp],[P.transport,{currentPhysicalHostingRelease:{liveHostingVersion:oldTarget.hostingVersion}}],
    [P.state,{}],[P.ledger,{}],[cursor.currentEvidencePath,f.progress]]);
  return {...f,oldTarget,target,journal,body,close:()=>owner.closeFiles(p=>structuredClone(inputs.has(p)?inputs.get(p):read(p)),journal,body)};
}
test('progress publication E3 to E4 archives the old proof and admits a pending successor without transferring PASS',()=>{
  const f=successorModel(),before=structuredClone(f.progress),receiptPath=f.progress.postAcceptanceObserverResults.receiptPath;
  const originalReceipt=fs.readFileSync(receiptPath,'utf8');
  f.cp.i66FrontendReleaseHead=structuredClone(f.target);
  assert.throws(f.verify,/I66_PROGRESS_OBSERVER_TARGET_DRIFT_generation/);
  f.cp.i66FrontendReleaseHead=structuredClone(f.oldTarget);
  const changes=f.close(),cp=changes[P.cp],progress=changes[genName(f.target.generation,'FOCAL_PROGRESS')];
  assert.doesNotThrow(()=>owner.assertExecutionProgress(cp,progress,fs));
  assert.equal(progress.currentObserverStatus.acceptanceTransferred,false);
  assert.equal(progress.currentObserverStatus.target.generation,4);
  assert.equal(progress.postAcceptanceObserverResults,undefined);
  assert.equal(cp.i66ActiveRecoveryCursor.lastFiveRoleMatrixStatus,undefined);
  assert.equal(cp.i66OperationalContinuation20261115.postAcceptanceObserverResults20261124,undefined);
  assert.deepEqual(cp.i66OperationalContinuation20261115.postAcceptanceGovernanceQa.observers,{});
  const archived=progress.priorPostAcceptanceObserverResults.at(-1);
  assert.deepEqual(archived.results,before.postAcceptanceObserverResults);
  assert.equal(archived.results.fiveRoles.routeChecks,140);
  assert.equal(archived.acceptanceScope,'HISTORICAL_ORIGINAL_ARTIFACT_ONLY');
  assert.equal(archived.observerAuthorities.fiveRoles.qaPins.old,'historical');
  assert.equal(archived.observerRequests.acceptedLivePerformanceRequest20261124.generation,3);
  assert.deepEqual(f.progress,before);
  assert.equal(fs.readFileSync(receiptPath,'utf8'),originalReceipt);
  for(const id of ['A04','A12','A14']){
    const objective=progress.shockObjectives.items.find(row=>row.id===id);
    assert.equal(objective.passForShock,false);
    assert.equal(objective.status,'CURRENT_ARTIFACT_OBSERVER_PENDING_PRIOR_RESULT_HISTORICAL');
  }
  const closedBefore=before.shockObjectives.items.filter(row=>row.passForShock===true);
  assert.deepEqual(progress.shockObjectives.items.filter(row=>row.passForShock===true),closedBefore);
  assert.equal(cp.i66ActiveRecoveryCursor.currentEvidenceBlobSha,blob(serial(progress)));
});
test('progress same-artifact reconciliation preserves its scoped proof and prior observer QA pins',()=>{
  const f=successorModel(),before=structuredClone({cp:f.cp,progress:f.progress});
  assert.equal(owner.archiveExecutionObservers(f.cp,f.progress,f.oldTarget,read),null);
  assert.deepEqual({cp:f.cp,progress:f.progress},before);
  assert.doesNotThrow(f.verify);
});
test('progress observer history transitions on generation source or digest and does not duplicate on resume',()=>{
  for(const key of ['generation','sourceSha','artifactDigest']){
    const f=successorModel(),head={...f.oldTarget,[key]:f.target[key]};
    f.cp.i66FrontendReleaseHead=head;
    assert.ok(owner.archiveExecutionObservers(f.cp,f.progress,head,read));
    assert.equal(owner.archiveExecutionObservers(f.cp,f.progress,head,read),null);
    assert.equal(f.progress.priorPostAcceptanceObserverResults.length,1);
    assert.doesNotThrow(f.verify);
  }
});
test('progress pending successor rejects a stale current observer summary or pointer reintroduced from E3',()=>{
  for(const mutate of [
    (cp,p,f)=>p.currentSignedRoleMatrix20261124=f.progress.currentSignedRoleMatrix20261124,
    (cp,p)=>cp.i66ActiveRecoveryCursor.lastPerformanceRunId=45299330794,
    (cp,p)=>p.currentObserverStatus.target.generation=3,
    (cp,p)=>p.currentObserverStatus.acceptanceTransferred=true
  ]){
    const f=successorModel(),changes=f.close(),cp=changes[P.cp],p=changes[genName(f.target.generation,'FOCAL_PROGRESS')];
    mutate(cp,p,f);assert.throws(()=>owner.assertExecutionProgress(cp,p,fs),/I66_PROGRESS_/);
  }
});
test('progress successor retains a separately prepared observer authority for its exact new target',()=>{
  const f=successorModel(),continuation=f.cp.i66OperationalContinuation20261115;
  continuation.postAcceptanceGovernanceQa.observers.performance={target:structuredClone(f.target),qaPins:{new:'not inspected until dispatch'}};
  continuation.acceptedLivePerformanceTimelineRequest20261124={target:structuredClone(f.target),mode:'performance'};
  const changes=f.close(),next=changes[P.cp].i66OperationalContinuation20261115;
  assert.deepEqual(next.postAcceptanceGovernanceQa.observers.performance,continuation.postAcceptanceGovernanceQa.observers.performance);
  assert.deepEqual(next.acceptedLivePerformanceTimelineRequest20261124,continuation.acceptedLivePerformanceTimelineRequest20261124);
  assert.equal(next.postAcceptanceGovernanceQa.observers.fiveRoles,undefined);
});
test('progress another publication before the pending observer completes advances its target without duplicating the old proof',()=>{
  const f=successorModel(),changes=f.close(),cp=changes[P.cp],p=changes[genName(f.target.generation,'FOCAL_PROGRESS')];
  const pendingTarget=structuredClone(p.currentObserverStatus.target);
  cp.i66OperationalContinuation20261115.postAcceptanceGovernanceQa.observers.fiveRoles={target:pendingTarget,qaPins:{four:'pending'}};
  cp.i66FrontendReleaseHead={...cp.i66FrontendReleaseHead,generation:5,sourceSha:'3'.repeat(40),artifactDigest:'sha256:'+'4'.repeat(64)};
  assert.ok(owner.archiveExecutionObservers(cp,p,cp.i66FrontendReleaseHead,read));
  assert.equal(p.priorPostAcceptanceObserverResults.length,1);
  assert.deepEqual(p.priorPendingObserverTransitions[0].previousUnobservedTarget,pendingTarget);
  assert.equal(p.priorPendingObserverTransitions[0].observerAuthorities.fiveRoles.qaPins.four,'pending');
  assert.equal(p.currentObserverStatus.target.generation,5);
  assert.doesNotThrow(()=>owner.assertExecutionProgress(cp,p,fs));
  assert.equal(owner.archiveExecutionObservers(cp,p,cp.i66FrontendReleaseHead,read),null);
  assert.equal(p.priorPendingObserverTransitions.length,1);
});
test('progress incorporating a matching observed result retires the prior pending marker without bypassing target validation',()=>{
  const f=progressModel();
  f.progress.currentObserverStatus={status:'PENDING_READONLY_OBSERVATION_ON_CURRENT_ACCEPTED_ARTIFACT',
    target:structuredClone(f.cp.i66FrontendReleaseHead),acceptanceTransferred:false};
  const pending=structuredClone(f.progress.currentObserverStatus);
  assert.throws(f.verify,/I66_PROGRESS_STALE_PENDING_MARKER_WITH_CURRENT_OBSERVER_RESULTS/);
  owner.synchronizeExecutionProgress(f.progress);
  assert.equal(f.progress.currentObserverStatus,undefined);
  assert.deepEqual(f.progress.previousPendingObserverStatus,pending);
  assert.doesNotThrow(f.verify);
  f.cp.i66FrontendReleaseHead.generation++;
  assert.throws(f.verify,/I66_PROGRESS_OBSERVER_TARGET_DRIFT_generation/);
});
test('canonical preflight keeps the active progress check after composite E3 becomes frontend E4',()=>{
  const preflight=fs.readFileSync(P.guard,'utf8');
  const gate=preflight.match(/if\(control\.i66FrontendReleaseHead\)\s*frontendControl\.assertExecutionProgress\(control,p,fs\);/);
  assert.ok(gate,'ACTIVE_VERSIONED_CURSOR_REQUIRED');
  const f=successorModel(),changes=f.close(),control=changes[P.cp],p=changes[genName(f.target.generation,'FOCAL_PROGRESS')];
  assert.notEqual(control.i66FrontendReleaseHead.scope,'COMPOSITE');
  const run=()=>require('node:vm').runInNewContext(gate[0],{control,p,frontendControl:owner,fs});
  assert.doesNotThrow(run);p.remainingExecutionLanes[0].evidence='obsolete E3 summary';
  assert.throws(run,/I66_PROGRESS_REMAINING_LANES_DRIFT/);
});
function observedNativeProgressFixture(){
  // Preserve the physically observed R84 regression independently of any later
  // request or release. Only the in-memory successor is corrected by this test.
  const evidencePath='artifacts/orbit360-recovery/release-control/I6_6_CURRENT_EXECUTION_PROGRESS_20261124_R84.json';
  const f=progressModel(evidencePath),transport={frontendPreviewRequest:structuredClone(f.progress.executionSynchronization.previewRequest)};
  const bind=()=>{f.cp.i66ActiveRecoveryCursor.currentEvidencePath=evidencePath;
    f.cp.i66ActiveRecoveryCursor.currentEvidenceBlobSha=blob(serial(f.progress));};
  const io={readdirSync:()=>[],readFileSync:(p,enc)=>p===evidencePath?serial(f.progress):p===P.transport?serial(transport):fs.readFileSync(p,enc)};
  bind();return {...f,io,bind,evidencePath,verify:()=>owner.assertExecutionProgress(f.cp,f.progress,io)};
}
test('native continuation reproduces the pinned R84 provider drift despite internally consistent projections',()=>{
  const f=observedNativeProgressFixture(),before=fs.readFileSync(f.evidencePath,'utf8');
  const current=owner.resolveNativeExecutionProgress(f.cp,f.progress,f.io);
  assert.equal(current.requestVersion,35);assert.equal(current.package.readbackCertified,true);
  assert.equal(current.hostingPreview.readbackCertified,true);
  assert.deepEqual(f.progress.remainingExecutionLanes,owner.executionProgressProjection(f.progress).remainingExecutionLanes);
  assert.throws(f.verify,/I66_NATIVE_PROGRESS_STALE_PROVIDER_BILLING_objective.A03/);
  assert.equal(fs.readFileSync(f.evidencePath,'utf8'),before);
});
test('native continuation R84 correction changes four pending statuses and preserves all acceptance and historical proof',()=>{
  const f=observedNativeProgressFixture(),before=structuredClone(f.progress),disk=fs.readFileSync(f.evidencePath,'utf8');
  const ids=['A03','A08','A12','A14'];
  for(const id of ids){
    const row=f.progress.shockObjectives.items.find(x=>x.id===id);
    assert.equal(row.status,'V35_PROVIDER_BILLING_HOLD_SIGNED_RUNTIME_PENDING');
    row.status='NATIVE_PACKAGE_AND_HOSTING_VERIFIED_SIGNED_RUNTIME_PENDING';
  }
  owner.synchronizeExecutionProgress(f.progress);f.bind();assert.doesNotThrow(f.verify);
  for(const key of ['officialProgress','nativePackageExecution20261125','nativeHostingPreviewExecution20261125',
    'financialWork','releasedFrontend','releasedBackend','v35ProviderBillingHold'])assert.deepEqual(f.progress[key],before[key]);
  for(const id of ids)assert.equal(f.progress.shockObjectives.items.find(x=>x.id===id).passForShock,false);
  assert.equal(f.progress.currentSuccessorPlan.signedPreviewAccepted,false);
  assert.equal(f.progress.currentSuccessorPlan.signedLiveAccepted,false);
  assert.equal(fs.readFileSync(f.evidencePath,'utf8'),disk);
});
function multihopNativeProgressFixture(){
  const evidencePath='artifacts/orbit360-recovery/release-control/I6_6_CURRENT_EXECUTION_PROGRESS_20261124_R84.json';
  const original=fs.readFileSync(evidencePath,'utf8'),originalBlob=blob(original),f=progressModel(evidencePath);
  const p=f.progress,transport={frontendPreviewRequest:structuredClone(p.executionSynchronization.previewRequest)};
  const files=new Map([[evidencePath,original]]),reads=[];
  const io={readdirSync:()=>[],readFileSync:(path,enc)=>{reads.push(path);
    return path===P.transport?serial(transport):files.has(path)?files.get(path):fs.readFileSync(path,enc);}};
  const refs={packagePending:p.pendingImmutableBuild.nativeExecutionEvidence,packagePlan:p.currentSuccessorPlan.providerExecution,
    hostingPending:p.pendingImmutableBuild.hostingPreviewContinuation,hostingPlan:p.currentSuccessorPlan.hostingPreviewExecution,
    artifact:p.currentSuccessorPlan.artifactIdentity};
  for(const ref of Object.values(refs)){
    assert.equal(ref.path,evidencePath);ref.gitBlobSha=originalBlob;
  }
  for(const row of p.shockObjectives.items.filter(row=>['A03','A08','A12','A14'].includes(row.id)))
    row.status='NATIVE_PACKAGE_AND_HOSTING_VERIFIED_SIGNED_RUNTIME_PENDING';
  owner.synchronizeExecutionProgress(p);
  Object.assign(f.cp.i66ActiveRecoveryCursor,{currentEvidencePath:evidencePath,currentEvidenceBlobSha:originalBlob});
  const bind=()=>{const bytes=serial(p);files.set(f.cp.i66ActiveRecoveryCursor.currentEvidencePath,bytes);
    f.cp.i66ActiveRecoveryCursor.currentEvidenceBlobSha=blob(bytes);};
  const advance=path=>{p.previousEvidencePath=f.cp.i66ActiveRecoveryCursor.currentEvidencePath;
    p.previousEvidenceBlobSha=f.cp.i66ActiveRecoveryCursor.currentEvidenceBlobSha;
    f.cp.i66ActiveRecoveryCursor.currentEvidencePath=path;bind();};
  const intermediatePath=evidencePath.replace('_R84.json','_R85_IN_MEMORY_TEST.json');advance(intermediatePath);
  const consume=()=>{
    const request=structuredClone(transport.frontendPreviewRequest),generation=f.cp.i66FrontendReleaseHead.generation+1;
    const head={...f.cp.i66FrontendReleaseHead,generation,sourceSha:p.pendingImmutableBuild.sourceSha,
      artifactDigest:'sha256:'+p.nativePackageExecution20261125.artifact.sha256,receiptPath:genName(generation,'RECEIPT')};
    owner.archiveExecutionObservers(f.cp,p,head,path=>JSON.parse(io.readFileSync(path,'utf8')));
    f.cp.i66FrontendReleaseHead=head;
    transport.lastConsumedFrontendPreviewRequest=request;
    transport.lastConsumedFrontendRelease={generation,previewRequestVersion:request.version,sourceSha:head.sourceSha,
      artifactDigest:head.artifactDigest,receiptPath:head.receiptPath};
    p.consumedPreviewRequest=structuredClone(request);delete transport.frontendPreviewRequest;
    advance(genName(generation,'FOCAL_PROGRESS'));
  };
  return {...f,io,refs,files,reads,evidencePath,original,originalBlob,intermediatePath,bind,consume,
    verify:()=>owner.assertExecutionProgress(f.cp,p,io),resolve:()=>owner.resolveNativeExecutionProgress(f.cp,p,io)};
}
test('native continuation keeps pinned R84 proof through two checkpoints and exact consumed closure',()=>{
  const f=multihopNativeProgressFixture();assert.doesNotThrow(f.verify);
  assert.equal(f.resolve().disposition,'CURRENT_REQUEST');f.consume();assert.doesNotThrow(f.verify);
  assert.equal(f.progress.previousEvidencePath,f.intermediatePath);
  assert.equal(f.resolve().disposition,'CONSUMED_EXACT_RELEASE_HISTORY');
  for(const ref of Object.values(f.refs))assert.equal(ref.gitBlobSha,f.originalBlob);
  for(const key of ['nativePackageExecution20261125','nativeHostingPreviewExecution20261125'])
    assert.deepEqual(f.progress[key],JSON.parse(f.original)[key]);
  for(const id of ['A03','A08','A12','A14'])assert.equal(f.progress.shockObjectives.items.find(row=>row.id===id).passForShock,false);
  assert.equal(f.progress.currentObserverStatus.acceptanceTransferred,false);
  assert.equal(f.resolve().signedFunctionalAcceptanceEstablished,false);assert.equal(f.resolve().liveAcceptanceEstablished,false);
  assert.equal(f.files.get(f.evidencePath),f.original);assert.equal(fs.readFileSync(f.evidencePath,'utf8'),f.original);
});
test('native continuation requires pins for every external proof group without traversing older checkpoints',()=>{
  for(const [keys,label] of [[['packagePending','packagePlan'],'PACKAGE'],[['hostingPending','hostingPlan'],'HOSTING'],[['artifact'],'ARTIFACT']]){
    const f=multihopNativeProgressFixture();f.consume();
    for(const key of keys)delete f.refs[key].gitBlobSha;
    f.bind();f.reads.length=0;
    assert.throws(f.verify,new RegExp('I66_NATIVE_PROGRESS_REFERENCE_PIN_REQUIRED_'+label));
    assert.equal(f.reads.includes(f.intermediatePath),false,'DO_NOT_SEARCH_PREVIOUS_CHECKPOINT_FOR_MISSING_PIN');
  }
});
test('native continuation shares a matching explicit pin before resolving the unpinned side',()=>{
  const f=multihopNativeProgressFixture();f.consume();
  delete f.refs.packagePending.gitBlobSha;delete f.refs.hostingPending.gitBlobSha;f.bind();
  assert.doesNotThrow(f.verify);assert.equal(f.resolve().disposition,'CONSUMED_EXACT_RELEASE_HISTORY');
  assert.equal(JSON.parse(f.original).nativeHostingPreviewExecution20261125.packageEvidence.gitBlobSha,undefined);
});
test('native continuation rejects conflicting multi-checkpoint pins even for already cached R84 proof',()=>{
  for(const [key,label] of [['packagePending','PIN_DRIFT_PACKAGE'],['hostingPending','PIN_DRIFT_HOSTING'],['artifact','BLOB_DRIFT_ARTIFACT']]){
    const f=multihopNativeProgressFixture();f.consume();f.refs[key].gitBlobSha='0'.repeat(40);f.bind();
    assert.throws(f.verify,new RegExp('I66_NATIVE_PROGRESS_REFERENCE_'+label));
  }
});
function currentFinancialProjectionFixture(){
  const cp=read(P.cp),progress=read(cp.i66ActiveRecoveryCursor.currentEvidencePath);
  const planPath=cp.i66OperationalContinuation20261115.canonicalPlan,plan=read(planPath);
  const io={readFileSync:(p,encoding)=>p===planPath?serial(plan):fs.readFileSync(p,encoding)};
  return {cp,progress,plan,io,verify:()=>owner.assertActiveFinancialAndPlanProjections(cp,progress,io)};
}
test('current financial completion and canonical plan redirect agree without rewriting historical evidence',()=>{
  const f=currentFinancialProjectionFixture(),before=serial({cp:f.cp,progress:f.progress,plan:f.plan});
  assert.doesNotThrow(f.verify);assert.equal(serial({cp:f.cp,progress:f.progress,plan:f.plan}),before);
  assert.match(f.plan.nextActionBeforeExecutionRedirect20261124.value,/1B65A7_ARTIFACT_14373955326/);
  assert.notEqual(f.plan.lastProvenLive.sourceSha,f.cp.i66FrontendReleaseHead.sourceSha);
});
test('the stale Control Plane PENDING_APPLICATION copy is rejected against the applied receipt',()=>{
  const f=currentFinancialProjectionFixture();
  f.cp.i66OperationalContinuation20261115.currentFinancialDataExecution20261124.historicalPayments.applicationState='PENDING_APPLICATION';
  assert.throws(f.verify,/I66_CURRENT_FINANCIAL_EXECUTION_PROJECTION_DRIFT/);
});
test('synchronizing two stale financial summaries cannot undo sealed payment application',()=>{
  for(const mutate of [
    x=>x.historicalPayments.applicationState='PENDING_APPLICATION',
    x=>x.historicalPayments.applied*=2,
    x=>delete x.historicalPayments.applicationCompletion,
    x=>x.historicalPayments.applicationCompletion.currency='USD',
    x=>x.historicalPayments.applicationCompletion.insurerReconciliationProven=true,
    x=>x.historicalPayments.applicationCompletion.all155SinglePostCompletionCensusClaimed=true
  ]){
    const f=currentFinancialProjectionFixture();mutate(f.progress.financialWork.currentExecution20261124);
    f.cp.i66OperationalContinuation20261115.currentFinancialDataExecution20261124=structuredClone(f.progress.financialWork.currentExecution20261124);
    assert.throws(f.verify,/I66_APPLIED_PAYMENT_(STATE_REGRESSION|COUNT_DRIFT|COMPLETION_MISSING|COMPLETION_CURRENCY_DRIFT|INSURER_RECONCILIATION_DRIFT|SINGLE_POST_COMPLETION_CENSUS_DRIFT)/);
  }
});
test('canonical plan cannot resume the old release or point outside the active cursor',()=>{
  for(const mutate of [
    p=>p.nextAction=p.nextActionBeforeExecutionRedirect20261124.value,
    p=>p.currentExecutionAuthority.cursorPointer='historical/old-cursor',
    p=>delete p.recordScope
  ]){const f=currentFinancialProjectionFixture();mutate(f.plan);assert.throws(f.verify,/I66_CANONICAL_PLAN_/);}
});
test('payment application proof must retain its pinned bytes',()=>{
  const f=currentFinancialProjectionFixture(),pin=f.progress.financialWork.currentExecution20261124.historicalPayments.applicationCompletion.receipt;
  const old=f.io.readFileSync;f.io.readFileSync=(p,encoding)=>p===pin.path?old(p,encoding)+' ':old(p,encoding);
  assert.throws(f.verify,/I66_APPLIED_PAYMENT_RECEIPT_BLOB_DRIFT/);
});
test('the active state mirror archives the entire former mixed summary and rejects stale source evidence or next action',()=>{
  const control=read(P.cp),transport=read(P.transport),state=read(P.state),prior=structuredClone(state.i66OwnerPlanContinuation20261115);
  const before=serial(prior);owner.synchronizeOwnerPlanContinuation(control,state,transport);
  assert.doesNotThrow(()=>owner.assertOwnerPlanContinuation(control,state,transport));
  if(prior?.schema!=='GI_I66_ACTIVE_OWNER_PLAN_CONTINUATION_V1'){
    assert.equal(serial(state.priorI66OwnerPlanContinuations.at(-1).prior),before);
    assert.equal(state.priorI66OwnerPlanContinuations.at(-1).priorGitBlobSha,blob(before));
  }
  const history=serial(state.priorI66OwnerPlanContinuations);owner.synchronizeOwnerPlanContinuation(control,state,transport);
  assert.equal(serial(state.priorI66OwnerPlanContinuations),history);
  for(const mutate of [s=>s.i66OwnerPlanContinuation20261115.latestProvenLiveSource='1'.repeat(40),
    s=>s.i66OwnerPlanContinuation20261115.evidenceGitBlobSha='2'.repeat(40),s=>s.i66OwnerPlanContinuation20261115.nextAction='36 old writes',
    s=>s.nextAction='old work',s=>s.currentOperationalWorkPointer='old pointer']){
    const changed=structuredClone(state);mutate(changed);assert.throws(()=>owner.assertOwnerPlanContinuation(control,changed,transport),/I66_OWNER_PLAN_/);
  }
});
test('frontend E4 closure always installs the active mirror and cannot keep or delete the old resume summary',()=>{
  const f=successorModel(),changes=f.close(),control=changes[P.cp],state=changes[P.state],transport=changes[P.transport];
  assert.doesNotThrow(()=>owner.assertOwnerPlanContinuation(control,state,transport));
  assert.equal(state.i66OwnerPlanContinuation20261115.evidenceGitBlobSha,control.i66ActiveRecoveryCursor.currentEvidenceBlobSha);
  delete state.i66OwnerPlanContinuation20261115;
  assert.throws(()=>owner.assertOwnerPlanContinuation(control,state,transport),/I66_OWNER_PLAN_ACTIVE_SUMMARY_DRIFT/);
});
test('E4 consumes its request and advances only current frontend views while retaining financial and backend proofs',()=>{
  const f=successorModel();f.journal.request.scope='FRONTEND_ONLY';f.journal.request.scopeId='SIX_RECEIPT_CURRENT_BALANCE_READONLY';
  f.cp.i66OperationalContinuation20261115.latestProvenLiveSource=f.oldTarget.sourceSha;
  f.cp.i66OperationalContinuation20261115.latestProvenLiveSourceScope='COMPOSITE_FRONTEND_AND_FOUR_BACKEND_FUNCTIONS_SAME_IMMUTABLE_SIGNED_PROOF';
  f.progress.financialWork.currentExecution20261124={paid:148,source:'independent financial proof'};
  f.progress.releasedBackend={generation:3,scope:'COMPOSITE',sourceSha:f.oldTarget.sourceSha};
  const before=structuredClone(f.progress),changes=f.close(),cp=changes[P.cp],p=changes[genName(f.target.generation,'FOCAL_PROGRESS')],tr=changes[P.transport];
  assert.equal(p.releaseScope,'FRONTEND_ONLY');assert.equal(p.notTouched.productSource,false);
  assert.equal(p.currentExecutionMutations.businessWrites,false);assert.equal(p.currentExecutionMutations.hostingDeploy,true);
  assert.deepEqual(p.financialWork.currentExecution20261124,before.financialWork.currentExecution20261124);
  assert.deepEqual(p.releasedBackend,before.releasedBackend);
  assert.deepEqual(p.priorReleaseExecutionViews.at(-1).view.releaseExecution,before.releaseExecution);
  assert.equal(p.priorReleaseExecutionViews.at(-1).priorLiveSourceScope.sourceSha,f.oldTarget.sourceSha);
  assert.equal(p.priorReleaseExecutionViews.at(-1).priorLiveSourceScope.scope,'COMPOSITE_FRONTEND_AND_FOUR_BACKEND_FUNCTIONS_SAME_IMMUTABLE_SIGNED_PROOF');
  assert.equal(p.shockObjectives.items.find(r=>r.id==='A12').passForShock,false);
  assert.equal(p.shockObjectives.items.find(r=>r.id==='A12').status,'SIX_RECEIPT_PREVIEW_LIVE_SCOPED_UI_PASS_FULL_A12_OPEN');
  assert.doesNotThrow(()=>owner.assertActiveReleaseProgress(cp,p,tr));assert.doesNotThrow(()=>owner.assertExecutionProgress(cp,p,fs));
  const wrongScope=structuredClone(cp);wrongScope.i66OperationalContinuation20261115.latestProvenLiveSourceScope='COMPOSITE_FRONTEND_AND_FOUR_BACKEND_FUNCTIONS_SAME_IMMUTABLE_SIGNED_PROOF';
  assert.throws(()=>owner.assertActiveReleaseProgress(wrongScope,p,tr),/I66_ACTIVE_FRONTEND_SOURCE_SCOPE_DRIFT/);
  for(const mutate of [x=>x.releaseScope='COMPOSITE',x=>x.releaseExecution.sourceSha=f.oldTarget.sourceSha,
    x=>x.notTouched.productSource=true,x=>x.currentExecutionMutations.businessWrites=true]){
    const wrong=structuredClone(p);mutate(wrong);assert.throws(()=>owner.assertActiveReleaseProgress(cp,wrong,tr));
  }
});

function model(){
  const cp=read(P.cp),state=read(P.state),transport=read(P.transport);
  const head=cp.i66FrontendReleaseHead,receipt=read(head.receiptPath);
  const journalPath=genName(head.generation,'JOURNAL'),journal=read(journalPath),ledger=read(P.ledger);
  const f={cp,state,transport,head,receipt,journal,ledger};
  f.verify=()=>{
    const receiptBytes=serial(receipt);
    head.receiptGitBlobSha=journal.receipt.blob=blob(receiptBytes);
    state.currentPhysicalFrontend=transport.latestSignedPhysicalFrontendLivePointer20261122=ledger.frontendReleaseHead=head;
    const snapshots=new Map([[head.receiptPath,receiptBytes],[journalPath,serial(journal)],[P.ledger,serial(ledger)]]);
    const io={readFileSync:(p,enc)=>snapshots.has(p)?snapshots.get(p):fs.readFileSync(p,enc)};
    return candidate.acceptedForPreflight(cp,state,transport,undefined,io);
  };
  return f;
}
test('the checked-out physical receipt agrees with the active control, ledger and transport',()=>{
  physicalGuard(read(P.cp),read(P.state),read(P.transport),fs);
});
test('frontend file counts remain versioned and composite counts remain tied to their signed proof',()=>{
  const f=model(),count=f.receipt.target.files+1;
  f.receipt.target.files=f.journal.request.target.files=f.receipt.preview.files=count;
  f.receipt.physical.custom=f.receipt.physical.firebase=f.head.hostedFilesEachOrigin=f.transport.currentPhysicalHostingRelease.readbackEachOrigin=count;
  delete f.cp[candidate.ACCEPTANCE_KEY];
  if(f.receipt.scope==='COMPOSITE')assert.throws(f.verify,/COMPOSITE_FILE_COUNT/);
  else assert.equal(f.verify().sourceSha,f.head.sourceSha);
});
for(const [field,mutate] of [
  ['control count',f=>f.head.hostedFilesEachOrigin++],
  ['transport count',f=>f.transport.currentPhysicalHostingRelease.readbackEachOrigin++],
  ['Preview count',f=>f.receipt.preview.files++],
  ['manifest',f=>f.head.manifestBlob='0'.repeat(40)],
  ['artifact',f=>f.transport.currentPhysicalHostingRelease.artifactId++],
  ['generation',f=>f.transport.frontendReleaseSequence++],
  ['versioned head removal',f=>delete f.cp.i66FrontendReleaseHead]
])test('rejects drift in '+field,()=>{const f=model();mutate(f);assert.throws(f.verify);});

const TERMINAL_BASE='bce6289b94db02c6cd5520c50dccfa3c280ab474';
const TERMINAL_PATH='artifacts/orbit360-recovery/release-control/I6_6_REQUEST35_PREVIEW_COMPENSATED_AND_DOCUMENT_PERSISTENCE_20261125.json';
const TERMINAL_NEXT='artifacts/orbit360-recovery/release-control/I6_6_CURRENT_EXECUTION_PROGRESS_20261124_R89.json';
function terminalFixture(){
  const {execFileSync}=require('node:child_process'),files=new Map();
  const gitBytes=file=>execFileSync('git',['show',TERMINAL_BASE+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024});
  for(const file of [P.cp,P.state,P.transport,TERMINAL_PATH])files.set(file,gitBytes(file));
  const initialControl=JSON.parse(files.get(P.cp)),evidencePath=initialControl.i66ActiveRecoveryCursor.currentEvidencePath;
  files.set(evidencePath,gitBytes(evidencePath));
  const basePaths=new Set(execFileSync('git',['ls-tree','-r','--name-only',TERMINAL_BASE,'--',require('node:path').dirname(P.cp)],{encoding:'utf8'})
    .trim().split('\n')),receiptNames=[...basePaths].map(p=>require('node:path').basename(p));
  const io={readFileSync:(file,encoding)=>files.has(file)?files.get(file):fs.readFileSync(file,encoding),
    readdirSync:()=>[...new Set([...receiptNames,...[...files.keys()].map(p=>require('node:path').basename(p))])],
    existsSync:file=>files.has(file)||(file.startsWith(require('node:path').dirname(P.cp)+'/')?basePaths.has(file):fs.existsSync(file))};
  const args={authorityHead:TERMINAL_BASE,receiptPath:TERMINAL_PATH,nextEvidencePath:TERMINAL_NEXT,recordedAtUtc:'2026-11-25T20:40:00.000Z'};
  const current=()=>{const control=JSON.parse(io.readFileSync(P.cp));return{control,state:JSON.parse(io.readFileSync(P.state)),
    transport:JSON.parse(io.readFileSync(P.transport)),progress:JSON.parse(io.readFileSync(control.i66ActiveRecoveryCursor.currentEvidencePath))};};
  return {files,io,args,initialControl,evidencePath,current,prepare:()=>owner.prepareTerminalAttemptReconciliation(args,io),
    apply:set=>{for(const [file,value] of Object.entries(set.changes))files.set(file,serial(value));},
    verify:()=>{const {control,progress}=current();return owner.assertExecutionProgress(control,progress,io);}};
}
test('terminal receipt reproduces the actual bce/R88 drift that the previous owner accepted',()=>{
  const f=terminalFixture(),before=serial([...f.files]),{control,progress}=f.current();
  const Module=require('node:module'),filename=require.resolve('./gravicentra-i66-frontend-control.cjs'),prior=new Module(filename,module);
  prior.filename=filename;prior.paths=Module._nodeModulePaths(require('node:path').dirname(filename));
  prior._compile(require('node:child_process').execFileSync('git',['show',TERMINAL_BASE+':tools/gravicentra-i66-frontend-control.cjs'],{encoding:'utf8'}),filename);
  assert.doesNotThrow(()=>prior.exports.assertExecutionProgress(control,progress,f.io));
  assert.throws(f.verify,/I66_TERMINAL_RECEIPT_NOT_RECONCILED/);
  assert.equal(serial([...f.files]),before);
});
test('terminal producer derives a complete atomic metadata correction from the real consumed claim',()=>{
  const f=terminalFixture(),before=f.current(),original=serial([...f.files]),set=f.prepare();
  assert.equal(set.status,'ATOMIC_METADATA_RECONCILIATION_PREPARED');assert.equal(set.expectedHeadOid,TERMINAL_BASE);
  assert.deepEqual(Object.keys(set.changes).sort(),[P.cp,P.state,TERMINAL_NEXT].sort());
  assert.equal(set.terminal.buildId,'9723b53c-8f8b-4f6e-80b6-960c2fcb8674');
  assert.equal(set.terminal.claimGeneration,'1795629238200879');
  assert.equal(set.terminal.receipt.gitBlobSha,'7fa7cfccd3cad9375c1b1c8bdd77502e8998631a');
  assert.equal(serial([...f.files]),original,'preparation has no writes');
  assert.equal(owner.assertTerminalAttemptChangeSetPreimages(set,{head:TERMINAL_BASE,...f.io}),true);
  f.apply(set);assert.doesNotThrow(f.verify);
  const after=f.current();assert.equal(after.progress.version,89);
  assert.equal(after.progress.previousEvidencePath,f.evidencePath);
  assert.equal(after.control.i66ActiveRecoveryCursor.currentEvidenceBlobSha,blob(serial(after.progress)));
  assert.deepEqual(after.transport,before.transport,'frozen transport and package retained');
  for(const key of ['officialProgress','financialWork','releasedFrontend','pendingImmutableBuild'])assert.deepEqual(after.progress[key],before.progress[key],key);
  assert.deepEqual(after.progress.shockObjectives.items.map(r=>r.passForShock),before.progress.shockObjectives.items.map(r=>r.passForShock));
  for(const key of ['opsNext','financeNext','leadsNext','emailNext'])assert.equal(after.progress.currentSuccessorPlan[key],before.progress.currentSuccessorPlan[key],key);
  for(const lane of before.progress.parallelLanes.filter(l=>l.next!==before.progress.currentSuccessorPlan.releaseNext))
    assert.deepEqual(after.progress.parallelLanes.find(l=>l.id===lane.id),lane,'independent lane '+lane.id);
  assert.equal(after.progress.lastTerminalOperationalAttempt.canReuseOriginalClaim,false);
  assert.equal(after.progress.lastTerminalOperationalAttempt.signedPreviewAccepted,false);
  assert.equal(after.progress.lastTerminalOperationalAttempt.livePromotion,false);
  assert.doesNotThrow(()=>owner.assertOwnerPlanContinuation(after.control,after.state,after.transport));
});
test('terminal reconciliation second execution is a true NOOP without another checkpoint',()=>{
  const f=terminalFixture();f.apply(f.prepare());const before=serial([...f.files]);
  const set=f.prepare();assert.equal(set.status,'NOOP_ALREADY_RECONCILED');assert.deepEqual(set.changes,{});
  assert.equal(serial([...f.files]),before);assert.doesNotThrow(f.verify);
});
test('terminal changeset rejects a moved writer HEAD or any concurrent authority preimage',()=>{
  const f=terminalFixture(),set=f.prepare(),before=serial([...f.files]);
  assert.throws(()=>owner.assertTerminalAttemptChangeSetPreimages(set,{head:'9'.repeat(40),...f.io}),/I66_TERMINAL_HEAD_CAS_CHANGED/);
  f.files.set(P.transport,f.files.get(P.transport)+' ');
  assert.throws(()=>owner.assertTerminalAttemptChangeSetPreimages(set,{head:TERMINAL_BASE,...f.io}),/I66_TERMINAL_PREIMAGE_CAS_CHANGED/);
  f.files.set(P.transport,JSON.parse(before).find(([file])=>file===P.transport)[1]);
  f.files.set(TERMINAL_NEXT,'{}\n');
  assert.throws(()=>owner.assertTerminalAttemptChangeSetPreimages(set,{head:TERMINAL_BASE,...f.io}),/I66_TERMINAL_PREIMAGE_CAS_CHANGED/);
});
test('a newly retained terminal receipt and its cursor projections are one prepared transaction',()=>{
  const f=terminalFixture(),bytes=f.files.get(TERMINAL_PATH),read=f.io.readFileSync,list=f.io.readdirSync,exists=f.io.existsSync;
  f.files.delete(TERMINAL_PATH);f.io.existsSync=file=>file===TERMINAL_PATH?false:exists(file);
  f.io.readdirSync=directory=>list(directory).filter(name=>name!==require('node:path').basename(TERMINAL_PATH));
  f.io.readFileSync=(file,encoding)=>{assert.notEqual(file,TERMINAL_PATH,'absent receipt must use provided verified bytes');return read(file,encoding);};
  const set=owner.prepareTerminalAttemptReconciliation({...f.args,receiptBytes:bytes},f.io);
  assert.deepEqual(Object.keys(set.changes).sort(),[TERMINAL_PATH,TERMINAL_NEXT,P.cp,P.state].sort());
  assert.equal(set.expectedPreimages[TERMINAL_PATH],null);assert.equal(set.expectedPreimages[TERMINAL_NEXT],null);
});
test('terminal receipt and active projections reject partial publication and renewed stale next actions',()=>{
  for(const mutate of [
    f=>{const cp=JSON.parse(f.files.get(P.cp));delete cp.i66ActiveRecoveryCursor.lastTerminalOperationalAttempt;f.files.set(P.cp,serial(cp));},
    f=>{const cp=JSON.parse(f.files.get(P.cp));cp.nextAction='Execute the old admitted Preview immediately';f.files.set(P.cp,serial(cp));}
  ]){const f=terminalFixture();f.apply(f.prepare());mutate(f);assert.throws(f.verify,/I66_TERMINAL_/);}
  const f=terminalFixture();f.apply(f.prepare());f.files.set(TERMINAL_PATH,f.files.get(TERMINAL_PATH)+' ');
  assert.throws(f.verify,/I66_TERMINAL_RECEIPT_NOT_RECONCILED/);
});
test('terminal reconciliation refuses unproved compensation and preserves a different request artifact',()=>{
  const f=terminalFixture(),receipt=JSON.parse(f.files.get(TERMINAL_PATH));receipt.request35.actualCompensation='NOT_VERIFIED';
  f.files.set(TERMINAL_PATH,serial(receipt));assert.throws(f.prepare,/I66_TERMINAL_COMPENSATION_UNPROVEN/);
  const other=terminalFixture(),unrelated=JSON.parse(other.files.get(TERMINAL_PATH));unrelated.frozenSource='7'.repeat(40);
  other.files.set(TERMINAL_PATH,serial(unrelated));assert.doesNotThrow(other.verify);
});
function advanceTerminalFixtureToRetry(f,status){
  f.apply(f.prepare());const {control,progress,transport}=f.current(),candidate=transport.scopedBackendPreviewI66.candidate;
  const terminal=progress.lastTerminalOperationalAttempt,retained=JSON.parse(f.files.get(TERMINAL_PATH)).request35;
  const ref={schema:'GI_I66_COMPENSATED_RETRY_REFERENCE_V1',phase:'preview',requestVersion:35,sourceSha:candidate.sourceSha,
    artifactId:candidate.artifactId,artifactDigest:candidate.artifactDigest,priorBuildId:terminal.buildId,
    priorClaim:{uri:'gs://ays-orbit360-firestore-private-backup-646761409743/i66/operational-locks/request-35-preview-'+candidate.sourceSha+'-'+candidate.artifactDigest.slice(7)+'.json',
      generation:terminal.claimGeneration,sha256:'a'.repeat(64),bytes:500},
    hold:{uri:'gs://'+retained.records.privateBucket+'/'+retained.records.prefix+'hold.json',...retained.records['hold.json']}};
  const receipt={schema:'GI_I66_COMPENSATED_RETRY_ADMISSION_V1',status:'EXACT_COMPENSATED_PREVIEW_RETRY_ADMITTED',recordedAtUtc:'2026-11-25T21:00:00.000Z',
    ...Object.fromEntries(Object.entries(ref).filter(([key])=>key!=='schema')),
    constraints:{productSourceChanges:0,rebuilds:0,livePromotion:false,claimReuse:false,realCustomerWrites:0,realFinancialWrites:0,externalMessagesSent:0}};
  const receiptPath='artifacts/orbit360-recovery/release-control/I6_6_COMPENSATED_RETRY_TEST_ADMISSION_20261125.json',bytes=serial(receipt);
  f.files.set(receiptPath,bytes);ref.admission={path:receiptPath,commit:'9'.repeat(40),blob:blob(bytes),sha256:require('node:crypto').createHash('sha256').update(bytes).digest('hex')};
  candidate.providerBinding.compensatedRetry=ref;
  const retryBuildId='eeeeeeee-1111-2222-3333-ffffffffffff';
  progress.request35OperationalPreviewAdmission={...progress.request35OperationalPreviewAdmission,status,
    ...(status==='PREVIEW_RETRY_ADMITTED'?{}:{buildId:retryBuildId})};
  progress.next=progress.immediateExecution.next=progress.currentSuccessorPlan.releaseNext='Continue the recorded successor attempt through the existing signed runtime gates.';
  control.nextAction=control.i66ActiveRecoveryCursor.next=control.i66ActiveRecoveryCursor.nextAction=control.i66OperationalContinuation20261115.currentWork=progress.next;
  if(status==='SIGNED_PREVIEW_PASS_LIVE_PENDING'){
    candidate.status='EXACT_PREVIEW_SIGNED_LIVE_AUTHORIZED';candidate.previewQa={executionProvider:'CLOUD_BUILD',runId:retryBuildId,status:'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS'};
    transport.operationalReleaseCandidate=candidate;delete transport.scopedBackendPreviewI66;
    const success=JSON.parse(f.files.get(TERMINAL_PATH));success.request35={phase:'preview',status:'SUCCESS',build:retryBuildId,signedPreviewAccepted:true};
    f.files.set('artifacts/orbit360-recovery/release-control/I6_6_REQUEST35_RETRY_SUCCESS_TEST_20261125.json',serial(success));
  }
  control.i66ActiveRecoveryCursor.currentEvidenceBlobSha=blob(serial(progress));
  f.files.set(control.i66ActiveRecoveryCursor.currentEvidencePath,serial(progress));
  f.files.set(P.cp,serial(control));f.files.set(P.transport,serial(transport));
  const state=JSON.parse(f.files.get(P.state));owner.synchronizeOwnerPlanContinuation(control,state,transport);f.files.set(P.state,serial(state));
  return {ref,receiptPath,retryBuildId};
}
for(const status of ['PREVIEW_RETRY_ADMITTED','PREVIEW_RETRY_RUNNING','SIGNED_PREVIEW_PASS_LIVE_PENDING'])
test('terminal history survives '+status+' without freezing the active retry on the failed build',()=>{
  const f=terminalFixture(),history=f.files.get(TERMINAL_PATH);advanceTerminalFixtureToRetry(f,status);
  assert.doesNotThrow(f.verify);assert.equal(f.files.get(TERMINAL_PATH),history);
  const before=serial([...f.files]),noop=f.prepare();assert.equal(noop.status,'NOOP_ALREADY_RECONCILED');
  assert.deepEqual(noop.changes,{});assert.equal(serial([...f.files]),before);
  assert.equal(f.current().progress.lastTerminalOperationalAttempt.buildId,'9723b53c-8f8b-4f6e-80b6-960c2fcb8674');
  assert.equal(f.current().progress.lastTerminalOperationalAttempt.canReuseOriginalClaim,false);
});
test('an arbitrary retry marker or edited retry admission cannot hide the terminal predecessor',()=>{
  const f=terminalFixture(),{receiptPath}=advanceTerminalFixtureToRetry(f,'PREVIEW_RETRY_RUNNING');
  f.files.set(receiptPath,f.files.get(receiptPath)+' ');assert.throws(f.verify,/I66_TERMINAL_RETRY_ADMISSION_BLOB_DRIFT/);
  const g=terminalFixture();advanceTerminalFixtureToRetry(g,'PREVIEW_RETRY_ADMITTED');
  const tr=JSON.parse(g.files.get(P.transport));tr.scopedBackendPreviewI66.candidate.providerBinding.compensatedRetry.priorBuildId='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  g.files.set(P.transport,serial(tr));assert.throws(g.verify,/I66_TERMINAL_RETRY_PREDECESSOR_DRIFT/);
});

test('a focal Hosting close consumes its own signed request and preserves the composite request and provider claim',()=>{
  const pkg=require('./gravicentra-i6-6-cloud-build-package.cjs');
  const {validateRequest}=require('./gravicentra-i66-frontend-promotion-transaction.cjs');
  const {execFileSync}=require('node:child_process');
  const initial='fe50904f073dfcdb3fb4b6eb8e42acaf3e6b2944';
  const readInitial=file=>JSON.parse(execFileSync('git',['show',initial+':'+file],{maxBuffer:16*1024*1024}));
  const tr=readInitial(P.transport),req=tr.focalHostingRequest;
  const original=readInitial(req.previousReceiptPath).target;
  const id='10000000-0000-4000-8000-000000000001';
  const focal={schema:req.schema,requestDigest:pkg.digest(req),generation:req.generation,compositionTree:'a'.repeat(40)};
  const target={...original,executionProvider:'CLOUD_BUILD',focalHosting:focal,compositionTree:focal.compositionTree,manifestBlob:req.manifestBlob,sourceSha:req.sourceSha,
    sourceTree:'b'.repeat(40),compositionBlob:'c'.repeat(40),artifactDigest:'sha256:'+'1'.repeat(64),buildId:'synthetic-focal',
    buildRunId:id,hostingVersion:'sites/ays-orbit-360-lab/versions/fixture',artifactId:'gs://'+pkg.C.bucket+'/i66/packages/focal-hosting/'+
      focal.requestDigest+'/'+req.sourceSha+'/'+id+'/'+pkg.F.archive+'#1'};
  const request={schema:'GI_I66_FRONTEND_PROMOTION_V1',gate:'I6.6',scope:'FRONTEND_ONLY',generation:req.generation,
    previousReceiptBlob:req.previousReceiptBlob,previous:original,target,guardBlob:'d'.repeat(40),approvalBlob:'e'.repeat(40)};
  const control={generation:req.generation-1,guardBlob:request.guardBlob,receiptBlob:req.previousReceiptBlob,
    physical:original,focalRequestDigest:focal.requestDigest,focalCompositionTree:focal.compositionTree};
  validateRequest(request,control);
  assert.throws(()=>validateRequest({...request,scope:'COMPOSITE'},control),/FOCAL_HOSTING_SCOPE/);
  assert.throws(()=>validateRequest(request,{...control,focalRequestDigest:'2'.repeat(64)}),/FOCAL_HOSTING_AUTHORITY/);
  assert.throws(()=>validateRequest({...request,target:{...target,artifactId:target.artifactId.replace('focal-hosting/'+focal.requestDigest,'request-35')}},control),
    /FOCAL_PACKAGE_GENERATION/);
  const journal={generation:req.generation,request};
  const body={...journal,phase:'COMMITTED',receipt:{blob:'3'.repeat(40),commit:'4'.repeat(40),runId:id},liveUi:{receiptBlob:'5'.repeat(40)}};
  const files=owner.closeFiles(readInitial,journal,body),next=files[P.transport],head=files[P.cp].i66FrontendReleaseHead;
  for(const k of ['frontendPreviewRequest','lastConsumedFrontendPreviewRequest','lastConsumedFrontendRelease','operationalReleaseCandidate','scopedBackendPreviewI66','status']){
    assert.equal(Object.hasOwn(next,k),Object.hasOwn(tr,k),k);
    assert.deepEqual(next[k],tr[k],k);
  }
  assert.deepEqual(next.lastConsumedFocalHostingRelease.request,req);
  assert.equal(head.compositionTree,focal.compositionTree);
  assert.equal(readInitial(genName(req.generation,'JOURNAL')).phase,'ROLLED_BACK');
  assert.equal(Object.hasOwn(files,genName(req.generation,'JOURNAL')),false);
  assert.equal(head.journalPath,genName(req.generation,'FOCAL_HOSTING_JOURNAL'));
  assert.deepEqual(files[head.journalPath],body);
  assert.equal(owner.releaseJournalPath(3,undefined),genName(3,'JOURNAL'));
  const progress=files[genName(req.generation,'FOCAL_PROGRESS')];
  assert.deepEqual(progress.releaseExecution.sourceQa,req.qa);
  assert.equal(Object.hasOwn(progress.releaseExecution,'frontendPreviewRequestVersion'),false);
  assert.throws(()=>owner.assertActiveReleaseProgress(files[P.cp],progress,{...next,lastConsumedFocalHostingRelease:undefined}),/CONSUMPTION_MISSING/);
  assert.throws(()=>owner.closeFiles(file=>file===P.transport?{...tr,focalHostingRequest:{...req,generation:9}}:readInitial(file),journal,body),/FOCAL_STALE_REQUEST/);
});
