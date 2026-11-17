'use strict';
// Offline contract fixtures. They create no release receipt and authorize no work.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm');
const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const legal=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
const clone=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const R11='artifacts/orbit360-recovery/release-control/I6_6_R11_RENEWAL_DRIVE_EXACT_LIVE_RECEIPT_20261113.json';
const POINTER='artifacts/orbit360-recovery/release-control/I6_6_LATEST_EXACT_LIVE_POINTER_20261113.json';
function fixture(){
 const historicalText=fs.readFileSync(R11,'utf8'),r11=JSON.parse(historicalText),pin=require('./gravicentra-i6-6-preview-channel-reuse-guard.cjs').technicalRolloverCandidatePin();
 const previous={status:'PUBLISHED_EXACT_R11_223_FILES_SIGNED_FRONTEND_HOSTING_ONLY_PARTIAL',sourceSha:r11.sourceSha,buildId:r11.immutableBuildId,artifactId:r11.immutableArtifactId,artifactDigest:r11.immutableArtifactDigest,previewRunId:r11.immutableBuildRunId,liveCloneRunId:r11.liveSignedUatRunId,liveHostingVersion:r11.hostingVersion,receipt:R11,readbackEachOrigin:223};
 const p={schema:'I6_6_OPERATIONAL_EXACT_RELEASE_V1',approvedByDirection:true,status:'EXACT_PREVIEW_SIGNED_LIVE_AUTHORIZED',sourceSha:'9'.repeat(40),buildId:'gi-i66-'+ '9'.repeat(12)+'-57f234755dc1',buildRunId:201,artifactId:202,artifactDigest:'sha256:'+'b'.repeat(64),previewUrl:pin.origin,previewChannelId:pin.channel,previewRollover:pin,signedObservabilityProfile:g.SIGNED_OBSERVABILITY_PROFILE,targets:clone(g.TARGETS),requiredPreviewDrivers:[...g.DRIVERS],sameImmutableArtifactOnly:true,syntheticRecordsOnly:true,noRealFinancialOrCustomerWrites:true,noRulesAuthIamWrites:true,rollbackThreeBackendRevisionsAndHosting:true,expectedSiteFileCount:223,syntheticQaIsolation:clone(g.PROPOSAL_QA_ISOLATION),advisorPayableQaIsolation:clone(g.ADVISOR_QA_ISOLATION),currentLive:{sourceSha:previous.sourceSha,buildId:previous.buildId,artifactId:previous.artifactId,artifactDigest:previous.artifactDigest,buildRunId:previous.previewRunId,liveRunId:previous.liveCloneRunId,hostingVersion:previous.liveHostingVersion},previewQa:{runId:301,headSha:'c'.repeat(40),receiptArtifactId:302,receiptArtifactDigest:'sha256:'+'d'.repeat(64),status:'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS'}};
 const liveLegalReceipt=legal.buildLiveReviewContext(p,{actorUidSha256:'a'.repeat(64)});
 liveLegalReceipt.schema=legal.LIVE_SCOPE.schema;liveLegalReceipt.status='AUTHORIZED_BY_EXPLICIT_OWNER_RESPONSE';
 Object.assign(liveLegalReceipt.decision,{status:'EXPLICIT_BOUNDED_SCOPE_AUTHORIZATION',response:'Autorizo el alcance LIVE propuesto',normalizedResponse:'AUTORIZO EL ALCANCE LIVE PROPUESTO',receivedLocalDate:'2026-11-17',timezone:'America/Guatemala'});
 p.liveLegalAcceptance=legal.liveScopeCandidatePin(p,sha(JSON.stringify(liveLegalReceipt,null,2)+'\n'),liveLegalReceipt);
 const obs={profile:g.SIGNED_OBSERVABILITY_PROFILE,status:'PASS',unexpectedConsoleErrors:0,unexpectedHttpErrors:0,pageErrorCount:0,telemetryFailures:0};
 const focusedReports={advisorPayables:{status:'PASS',cleanup:'PASS',checks:16,digest:'sha256:'+'1'.repeat(64),observability:obs},proposalApplication:{status:'PASS',cleanup:'PASS',checks:19,digest:'sha256:'+'2'.repeat(64),observability:{profile:g.SIGNED_OBSERVABILITY_PROFILE,status:'PASS',mode:'UI_RESPONSE_CAPTURED_EXACT'}}};
 const preview={schema:'I6_6_OPERATIONAL_SIGNED_PREVIEW_PROOF_V1',status:p.previewQa.status,runId:301,headSha:p.previewQa.headSha,sourceSha:p.sourceSha,buildId:p.buildId,buildRunId:p.buildRunId,artifactId:p.artifactId,artifactDigest:p.artifactDigest,previewUrl:p.previewUrl,previewChannelId:p.previewChannelId,targets:clone(g.TARGETS.preview),signedDrivers:[...g.DRIVERS],realFinancialOrCustomerWrites:0,syntheticRestoreComplete:true,liveHostingUnchanged:true,liveBackendUnchanged:true,focusedReports:clone(focusedReports)};
 const intake={status:'PASS',stage:'SOURCE_INTAKE_COMPLETE',sourceRows:1,proposals:1};
 for(const k of ['syntheticOnly','sourceFileHashVerified','sourceMetadataDigestVerified','normalUiRequest','normalUiResponseConfirmed','readbackAfterReload','signedActorPreserved','realLedgerPointerUnchanged','countsExact','qaAuthorityExact','normalUiIdempotentReplay'])intake[k]=true;
 for(const k of ['financialWrites','holds','replayIntakeWrites','consoleErrors','pageErrors','httpErrors'])intake[k]=0;
 const proof={schema:'I66_FIVE_PRIVILEGED_ROLES_IMMUTABLE_LIVE_TRANSPORT_V1',status:g.LIVE_SIGNED_STATUS,runId:401,headSha:'e'.repeat(40),sourceSha:p.sourceSha,buildId:p.buildId,buildRunId:p.buildRunId,artifactId:p.artifactId,artifactDigest:p.artifactDigest,previewChannel:p.previewChannelId,previewQa:clone(p.previewQa),previousLive:clone(p.currentLive),previousHostingVersion:previous.liveHostingVersion,previewHostingVersion:'sites/ays-orbit-360-lab/versions/fixture-new',liveHostingVersion:'sites/ays-orbit-360-lab/versions/fixture-new',previewFiles:223,liveSiteFiles:223,customSiteFiles:223,targets:clone(g.TARGETS.live),signedDrivers:['privileged-role-permissions','carlos-paula-ops-leads','advisor-payables','proposal-application'],syntheticRestoreComplete:true,sameImmutableArtifact:true,liveBackendSameArtifact:true,functionsInventoryUnchangedExceptTargets:true,rollbackSnapshotReady:true,realCustomerWrites:0,realFinancialOrCustomerWrites:0,firestoreRuleOrAuthWrites:0,fullI66ProductionAccepted:false,rollback:'OUTER_FUNCTION_ROLLBACK_GUARD_ACTIVE',backendRevisions:g.TARGETS.live.map(({name,region})=>({name,region,service:name.toLowerCase(),previousRevision:name.toLowerCase()+'-previous',currentRevision:name.toLowerCase()+'-next',trafficPercent:100,ready:true})),focusedReports,sourceIntake:intake};
 const liveLegalProof={status:'EXPLICIT_OWNER_DECISION_APPLIED_BY_NORMAL_UI',phase:'LIVE',decisionId:legal.LIVE_SCOPE.decisionId,authorizationScope:legal.LIVE_SCOPE.authorizationScope,gate:'I6.6',sourceSha:p.sourceSha,buildId:p.buildId,authorizationSourceBaseHead:p.liveLegalAcceptance.sourceBaseHead,origin:legal.LIVE_SCOPE.origin,receiptSha256:p.liveLegalAcceptance.receiptSha256,advisorId:legal.ADVISOR,actorRole:'direccion',tenantId:legal.TENANT,country:'GT',version:legal.VERSION,clauseIds:[...legal.CLAUSES],termsProjectionSha256:legal.TERMS_SHA256,actorUidSha256:p.liveLegalAcceptance.actorUidSha256,scopeSha256:'b'.repeat(64),acceptedAt:'2026-11-17T23:00:00Z',immediateReadback:true,reloadReadback:true,reloadActorVerified:true,acceptedForOtherActors:false,liveAcceptance:true,storageSeeded:false,gateBypassed:false};
 proof.directionLiveLegalAcceptance={advisorPayables:clone(liveLegalProof),proposalApplication:clone(liveLegalProof)};
 const run=(id,head,path)=>({id,head_sha:head,head_branch:'recovery/fase-a-clean-20260831',path,status:'completed',conclusion:'success'});
 const artifact=(id,name,digest,runId,head)=>({id,name,digest,expired:false,workflow_run:{id:runId,head_sha:head}});
 const receipt={schema:'GI_I66_OPERATIONAL_EXACT_LIVE_ACCEPTANCE_V1',status:'SIGNED_LIVE_ACCEPTED_FULL_I66_HOLD',gate:'I6.6',fullI66ProductionAccepted:false,realFinancialWrites:0,candidate:p,previousExactHostingRelease:clone(previous),liveProof:{path:g.ACCEPTANCE_PROOF,sha256:''},buildRun:run(201,p.sourceSha,'.github/workflows/gravicentra-release-delta-66-package.yml'),previewRun:run(301,p.previewQa.headSha,'.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml'),liveRun:run(401,proof.headSha,'.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml'),buildArtifact:artifact(202,'gi-i66-immutable-'+p.sourceSha,p.artifactDigest,201,p.sourceSha),previewArtifact:artifact(302,'gi-i66-operational-preview-proof-301',p.previewQa.receiptArtifactDigest,301,p.previewQa.headSha),liveArtifact:artifact(402,'gi-i66-role-exact-live-proof-401','sha256:'+'f'.repeat(64),401,proof.headSha),signedPreviewProof:preview,jobs:{}};
 for(const [i,key,name,id] of [[0,'build','immutable-package',201],[1,'preview','exact-preview-only',301],[2,'live','exact-role-live',401]])receipt.jobs[key]={id:501+i,name,run_id:id,status:'completed',conclusion:'success'};
 const facts={sourceSha:p.sourceSha,buildId:p.buildId,buildRunId:p.buildRunId,artifactId:p.artifactId,artifactDigest:p.artifactDigest,liveRunId:401,liveEvidenceArtifactId:402,liveEvidenceArtifactDigest:receipt.liveArtifact.digest,hostingVersion:proof.liveHostingVersion,receipt:g.ACCEPTANCE_RECEIPT};
 const summary={status:g.ACCEPTED_STATUS,...facts,receiptSha256:''};
 const control={status:'PRODUCTION_ACCEPTED',i6Execution:{authorized:true},gateState:{gates:{I6:{status:'I6_6_COBROS_CARTERA_CONTROLLED_REFRESH_ACTIVE',activeSubgate:'I6.6'}}},[g.ACCEPTANCE_KEY]:summary,currentExecutionDecisionPointer:g.ACCEPTANCE_KEY,i66R11RenewalDriveExactLiveRelease20261113:{status:'PREVIOUS_R11_RENEWAL_DRIVE_EXACT_LIVE_PRESERVED',sourceSha:r11.sourceSha,artifactId:r11.immutableArtifactId,artifactDigest:r11.immutableArtifactDigest,hostingVersion:r11.hostingVersion,receipt:R11},i66OperationalContinuation20261115:{activeGate:'I6.6',closedHistoricalGate:'B4-007',latestProvenLiveSource:p.sourceSha,newLiveAcceptanceClaimed:true}};
 const state={currentExecutionDecisionPointer:'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json#'+g.ACCEPTANCE_KEY,currentLiveSuccessorAcceptance:clone(facts)};
 const transport={status:'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED',livePromotionAuthorized:false,previewApproved:false,forbidBackendFunctionDeploy:true,backendFunctionPreviewOnly:false,forbidBackendLiveFunctionDeploy:true,noHostingPromotion:true,forbidFirestoreRulesDataAuthWrites:true,previousExactHostingReleaseR11:clone(previous),currentExactHostingRelease:{status:'PUBLISHED_EXACT_OPERATIONAL_223_FILES_THREE_FUNCTIONS_SIGNED_LIVE_PARTIAL',sourceSha:p.sourceSha,buildId:p.buildId,previewRunId:p.buildRunId,artifactId:p.artifactId,artifactDigest:p.artifactDigest,liveCloneRunId:401,liveHostingVersion:proof.liveHostingVersion,receipt:g.ACCEPTANCE_RECEIPT,readbackEachOrigin:223}};
 const latest={status:'LATEST_OPERATIONAL_EXACT_SIGNED_LIVE_PASS_FULL_I66_HOLD',fullI66ProductionAccepted:false,currentLiveSourceSha:p.sourceSha,currentLiveBuildId:p.buildId,currentLiveImmutableBuildRunId:201,currentLiveArtifactId:202,currentLiveArtifactDigest:p.artifactDigest,currentLiveDeployAndSignedQaRunId:401,currentLiveEvidenceArtifactId:402,currentLiveEvidenceArtifactDigest:receipt.liveArtifact.digest,currentLiveHostingVersion:proof.liveHostingVersion,currentLiveReceipt:g.ACCEPTANCE_RECEIPT,previousLiveVersionForRollback:previous.liveHostingVersion};
 return {control,state,transport,latest,receipt,proof,historicalText,liveLegalReceipt};
}
function sealed(f){
 const proofText=JSON.stringify(f.proof,null,2)+'\n';f.receipt.liveProof.sha256=sha(proofText);
 const receiptText=JSON.stringify(f.receipt,null,2)+'\n';f.control[g.ACCEPTANCE_KEY].receiptSha256=sha(receiptText);
 const map=new Map([[legal.LIVE_SCOPE.authorizationPath,JSON.stringify(f.liveLegalReceipt,null,2)+'\n'],[g.ACCEPTANCE_PROOF,proofText],[g.ACCEPTANCE_RECEIPT,receiptText],[R11,f.historicalText],[g.CONTROL,JSON.stringify(f.transport)],[POINTER,JSON.stringify(f.latest)],['artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json',JSON.stringify(f.control)],['orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json',JSON.stringify(f.state)]]);
 return {...f,io:{readFileSync:(file,encoding)=>map.has(file)?map.get(file):fs.readFileSync(file,encoding),existsSync:file=>map.has(file)||fs.existsSync(file)}};
}
function verify(f){const s=sealed(f);return g.acceptedForPreflight(s.control,s.state,s.transport,s.latest,s.io);}
test('complete offline terminal fixture validates exact durable identity and frozen I6.6 scope',()=>{assert.equal(verify(fixture()).status,g.ACCEPTED_STATUS);});
const invalid=[
 ['candidate source',f=>f.receipt.candidate.sourceSha='7'.repeat(40)],
 ['source reused as prior LIVE',f=>f.receipt.candidate.sourceSha=f.receipt.previousExactHostingRelease.sourceSha],
 ['immutable artifact digest',f=>f.proof.artifactDigest='sha256:'+'0'.repeat(64)],
 ['build ID',f=>f.proof.buildId='gi-i66-777777777777-57f234755dc1'],
 ['missing signed Preview proof',f=>delete f.receipt.signedPreviewProof],
 ['Preview receipt artifact',f=>f.receipt.previewArtifact.id++],
 ['Preview QA head',f=>f.proof.previewQa.headSha='0'.repeat(40)],
 ['failed workflow',f=>f.receipt.liveRun.conclusion='failure'],
 ['skipped substantive job',f=>f.receipt.jobs.live.conclusion='skipped'],
 ['wrong workflow',f=>f.receipt.liveRun.path='.github/workflows/other.yml'],
 ['wrong branch',f=>f.receipt.liveRun.head_branch='main'],
 ['live proof artifact origin',f=>f.receipt.liveArtifact.workflow_run.id++],
 ['expired artifact',f=>f.receipt.liveArtifact.expired=true],
 ['missing driver',f=>f.proof.signedDrivers.pop()],
 ['wrong function region',f=>f.proof.targets[0].region='us-east1'],
 ['missing revision',f=>f.proof.backendRevisions.pop()],
 ['unchanged revision',f=>f.proof.backendRevisions[0].currentRevision=f.proof.backendRevisions[0].previousRevision],
 ['partial backend traffic',f=>f.proof.backendRevisions[0].trafficPercent=50],
 ['missing rollback snapshot',f=>f.proof.rollbackSnapshotReady=false],
 ['different Hosting version',f=>f.proof.liveHostingVersion+='drift'],
 ['incomplete byte readback',f=>f.proof.customSiteFiles=222],
 ['missing cleanup',f=>f.proof.syntheticRestoreComplete=false],
 ['focused helper HOLD',f=>f.proof.focusedReports.proposalApplication.status='HOLD'],
 ['missing focused digest',f=>delete f.proof.focusedReports.advisorPayables.digest],
 ['source intake replay missing',f=>f.proof.sourceIntake.normalUiIdempotentReplay=null],
 ['source intake pageerror',f=>f.proof.sourceIntake.pageErrors=1],
 ['real financial writes',f=>f.proof.realFinancialOrCustomerWrites=1],
 ['global acceptance overclaim',f=>f.proof.fullI66ProductionAccepted=true],
 ['LIVE legal proof missing',f=>delete f.proof.directionLiveLegalAcceptance],
 ['LIVE legal reload absent',f=>f.proof.directionLiveLegalAcceptance.advisorPayables.reloadReadback=false],
 ['Preview consent reused for LIVE',f=>f.proof.directionLiveLegalAcceptance.proposalApplication.liveAcceptance=false],
 ['LIVE legal actor changed',f=>f.proof.directionLiveLegalAcceptance.proposalApplication.actorUidSha256='0'.repeat(64)],
 ['LIVE authorization quote changed',f=>f.liveLegalReceipt.decision.response='No autorizo'],
 ['changed historic R11 bytes',f=>f.historicalText+='\n'],
 ['previous R11 version drift',f=>f.receipt.previousExactHostingRelease.liveHostingVersion+='x'],
 ['R11 still labelled current',f=>f.control.i66R11RenewalDriveExactLiveRelease20261113.status='CURRENT_R11_RENEWAL_DRIVE_EXACT_LIVE_SIGNED_PASS_FULL_I66_HOLD'],
 ['Control Plane source drift',f=>f.control[g.ACCEPTANCE_KEY].sourceSha='0'.repeat(40)],
 ['compatibility state source drift',f=>f.state.currentLiveSuccessorAcceptance.sourceSha='0'.repeat(40)],
 ['transport artifact drift',f=>f.transport.currentExactHostingRelease.artifactId++],
 ['latest pointer source drift',f=>f.latest.currentLiveSourceSha='0'.repeat(40)],
 ['decision pointer stale',f=>f.control.currentExecutionDecisionPointer='i66R11RenewalDriveExactLiveRelease20261113'],
 ['unconsumed deployment permission',f=>f.transport.livePromotionAuthorized=true],
 ['candidate not retired',f=>f.transport.operationalReleaseCandidate=f.receipt.candidate],
 ['source-intake failed proof hidden by outer green',f=>f.proof.status='HOLD']
];
for(const [label,mutate] of invalid)test('rejects '+label,()=>{const f=fixture();mutate(f);assert.throws(()=>verify(f));});
test('receipt/proof byte edits fail even when all parsed identities otherwise match',()=>{
 for(const target of [g.ACCEPTANCE_RECEIPT,g.ACCEPTANCE_PROOF]){const s=sealed(fixture()),read=s.io.readFileSync;s.io.readFileSync=(file,enc)=>read(file,enc)+(file===target?'\n':'');assert.throws(()=>g.acceptedForPreflight(s.control,s.state,s.transport,s.latest,s.io));}
});
test('canonical governance resolves the accepted successor and rejects stale LIVE pointers',()=>{
 const source=fs.readFileSync('tools/gravicentra-governance-preflight-v1.mjs','utf8').split('const activeGuard=')[0].replace(/^import .*;\n/gm,'');
 const run=f=>{const s=sealed(f);return vm.runInNewContext(source,{JSON,fs:s.io,process:{argv:['node','preflight','--mode=i6'],execPath:process.execPath},operationalRelease:g,spawnSync(){throw Error('UNEXPECTED_PROCESS');}});};
 assert.doesNotThrow(()=>run(fixture()));const f=fixture();f.latest.currentLiveSourceSha=f.receipt.previousExactHostingRelease.sourceSha;assert.throws(()=>run(f));
});
test('acceptance code and test are pinned and the same test runs before build, Preview and LIVE',()=>{
 for(const owner of ['tools/gravicentra-governance-preflight-v1.mjs','tools/gravicentra-i6-6-operational-live-acceptance.test.cjs'])assert.equal(g.PINNED_OWNER_PATHS.filter(p=>p===owner).length,1);
 for(const file of ['.github/workflows/gravicentra-release-delta-66-package.yml','.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml','.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml'])assert.equal(fs.readFileSync(file,'utf8').split('node --test tools/gravicentra-i6-6-operational-live-acceptance.test.cjs').length-1,1);
});
