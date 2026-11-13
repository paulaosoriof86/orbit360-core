import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const allowedModes=new Set(['governance','i2','i3','i4a','i4b','i5','i6','certified']);
const arg=process.argv.find(x=>x.startsWith('--mode='));
const mode=arg?arg.slice('--mode='.length):'governance';
if(!allowedModes.has(mode)) throw new Error('GRAVICENTRA_PREFLIGHT_MODE_INVALID:'+mode);

function run(cmd,args){
  const r=spawnSync(cmd,args,{stdio:'inherit',env:process.env});
  if(r.error) throw r.error;
  if(r.status!==0) throw new Error('GRAVICENTRA_PREFLIGHT_COMMAND_FAILED:'+cmd+' '+args.join(' ')+':'+String(r.status));
}

// Preserve a universal governance trigger. A path-filter here silently skipped
// Inicio/Equipo changes while allowing older release proof to look current.
const workflowTrigger=fs.readFileSync('.github/workflows/gravicentra-release-lock-sync.yml','utf8').split(/^permissions:/m)[0];
const canonicalPush='  push:\n    branches:\n      - recovery/fase-a-clean-20260831\n';
if(!workflowTrigger.includes(canonicalPush)||/^    paths(?:-ignore)?:/m.test(workflowTrigger))
  throw new Error('GRAVICENTRA_CANONICAL_GUARD_PUSH_PATH_FILTER_FORBIDDEN');

const node=process.execPath;
const controlPath='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const control=JSON.parse(fs.readFileSync(controlPath,'utf8'));
const postI5=control.status==='PRODUCTION_ACCEPTED'||control.environmentState?.productionAccepted===true;
const i6Status=String(control.gateState?.gates?.I6?.status||'');
const i6Active=control.i6Execution?.authorized===true||(!['','HOLD_PENDING_EXPLICIT_AUTHORIZATION'].includes(i6Status));
const preI5Guard='tools/gravicentra-control-plane-guard-v2.mjs';
const postI5Guard='tools/gravicentra-post-i5-control-plane-guard-v1.mjs';
const i6Guard='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const i66Guard='tools/gravicentra-i6-6-delta-guard.mjs';
const i66Active=i6Active&&control.gateState?.gates?.I6?.activeSubgate==='I6.6';
// An immutable Hosting promotion and a separately authorized Preview-only
// backend reader are different operations. Keep their permission flags scoped,
// and fail closed if mutable release summaries disagree on actual LIVE bytes.
if(i66Active){
  const transport=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json','utf8'));
  // Release receipts are immutable historical snapshots. Resolve the current
  // pointer from the latest formally recorded LIVE successor, never from an
  // older hard-coded release date or a reusable deployment authorization.
  const stageRelease=control.i66LatestExactLiveRelease20261113;
  const stageCurrent=stageRelease?.status==='CURRENT_STAGE_READONLY_SIGNED_EXACT_LIVE_PASS_FINANCIAL_AND_FULL_I66_HOLD';
  const roleRelease=control.i66RolePermissionExactLiveRelease20261113;
  const roleCurrent=roleRelease?.status==='CURRENT_R8_ROLE_PERMISSIONS_EXACT_LIVE_SIGNED_SYNTHETIC_PASS_FULL_I66_HOLD';
  const r9Release=control.i66PaymentInvoicePolicyR9ExactLiveRelease20261113;
  const r9Current=r9Release?.status==='CURRENT_R9_PAYMENT_INVOICE_POLICY_DUAL_ORIGIN_SIGNED_LIVE_PASS_FULL_I66_HOLD';
  const r10Release=control.i66ConciliacionesHumanNamesR10ExactLiveRelease20261113;
  const r10Current=r10Release?.status==='CURRENT_R10_CONCILIACIONES_HUMAN_NAMES_EXACT_LIVE_PASS_FULL_I66_HOLD';
  const pointer=(r10Current||r9Current||roleCurrent||stageCurrent)
    ?'artifacts/orbit360-recovery/release-control/I6_6_LATEST_EXACT_LIVE_POINTER_20261113.json'
    :'artifacts/orbit360-recovery/release-control/I6_6_LATEST_EXACT_LIVE_POINTER_20261112.json';
  const latest=fs.existsSync(pointer)?JSON.parse(fs.readFileSync(pointer,'utf8')):
    control.i66LatestExactLiveRelease20261111;
  const live=transport.currentExactHostingRelease;
  const r4=transport.latestExactHostingPromotionR4;
  const previewReaderScope=['CONCILIACIONES_STAGE_READER_PREVIEW_AUTHORIZED',
    'CONCILIACIONES_STAGE_SIGNED_PREVIEW_UAT_REQUESTED'].includes(transport.status)&&
    transport.forbidBackendFunctionDeploy===false&&
    transport.forbidBackendLiveFunctionDeploy===true&&
    transport.backendFunctionPreviewOnly===true&&
    transport.i66ConciliacionesHumanNameReaderPreviewAuthorization20261113?.targetFunction==='orbit360ScopedPolicyReadPreview'&&
    transport.i66ConciliacionesHumanNameReaderPreviewAuthorization20261113?.dataWritesPermitted===false&&
    transport.noHostingPromotion===true&&transport.forbidFirestoreRulesDataAuthWrites===true;
  const guard='I6_6_EXACT_LIVE_RELEASE_POINTER_OR_READER_AUTHORIZATION_DRIFT';
  if(r10Current){
    const receipt=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_CONCILIACIONES_HUMAN_NAMES_R10_LIVE_RECEIPT_20261113.json','utf8'));
    const previousR9=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_PAYMENT_INVOICE_POLICY_R9_LIVE_RECEIPT_20261113.json','utf8'));
    const state=JSON.parse(fs.readFileSync('orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json','utf8'));
    const current=state.currentLiveSuccessorAcceptance||{};
    const exact=transport.i66ConciliacionesHumanNameExactLiveCompleted20261113||{};
    const prior=transport.previousExactHostingReleaseR9||{};
    const fields=[
      [latest.currentLiveSourceSha,r10Release.sourceSha],[latest.currentLiveSourceSha,receipt.sourceSha],
      [latest.currentLiveSourceSha,live?.sourceSha],[latest.currentLiveSourceSha,current.sourceSha],
      [latest.currentLiveArtifactId,r10Release.artifactId],[latest.currentLiveArtifactId,receipt.immutableArtifactId],
      [latest.currentLiveArtifactId,live?.artifactId],
      [latest.currentLiveArtifactDigest,r10Release.artifactDigest],[latest.currentLiveArtifactDigest,receipt.immutableArtifactDigest],
      [latest.currentLiveArtifactDigest,live?.artifactDigest],
      [latest.currentLiveHostingVersion,r10Release.hostingVersion],
      [latest.currentLiveHostingVersion,receipt.hostingVersion],[latest.currentLiveHostingVersion,live?.liveHostingVersion],
      [latest.currentLiveHostingVersion,exact.hostingVersion],
      [latest.currentLiveImmutableBuildRunId,r10Release.buildRunId],
      [latest.currentLiveImmutableBuildRunId,receipt.immutableBuildRunId],
      [latest.currentLiveDeployAndSignedQaRunId,r10Release.liveCloneRunId],
      [latest.currentLiveDeployAndSignedQaRunId,receipt.liveSignedUatRunId],
      [latest.currentLiveDeployAndSignedQaRunId,current.currentExactHostingRunId],
      [latest.currentLiveEvidenceArtifactId,receipt.liveEvidenceArtifactId],
      [latest.currentLiveReceipt,r10Release.receipt],[latest.currentLiveReceipt,live?.receipt],
      [latest.previousLiveVersionForRollback,previousR9.hostingVersion],
      [latest.previousLiveVersionForRollback,receipt.previousLiveVersionForRollback],
      [latest.previousLiveVersionForRollback,prior.liveHostingVersion],
      [latest.currentLiveSourceSha,exact.sourceSha],[latest.currentLiveArtifactId,exact.artifactId],
      [receipt.proposalsUniqueVisible,exact.uniqueHumanNamesVerified]
    ];
    if(fields.some(([a,b])=>a==null||b==null||a!==b)||
       control.currentExecutionDecisionPointer!=='i66ConciliacionesHumanNamesR10ExactLiveRelease20261113'||
       state.currentExecutionDecisionPointer!=='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json#i66ConciliacionesHumanNamesR10ExactLiveRelease20261113'||
       pointer!=='artifacts/orbit360-recovery/release-control/I6_6_LATEST_EXACT_LIVE_POINTER_20261113.json'||
       latest.status!=='LATEST_R10_CONCILIACIONES_HUMAN_NAMES_SIGNED_LIVE_PASS_I66_FULL_ACCEPTANCE_HOLD'||
       live?.status!=='PUBLISHED_EXACT_R10_223_FILES_SIGNED_HUMAN_NAMES_PARTIAL'||
       receipt.schema!=='GI_I66_CONCILIACIONES_HUMAN_CLIENT_NAMES_R10_LIVE_RECEIPT_V1'||
       receipt.status!=='PUBLISHED_EXACT_223_FILES_DUAL_ORIGIN_SIGNED_HUMAN_NAMES_LIVE_PASS'||
       receipt.immutableArtifactId!==14066487146||receipt.liveSignedUatRunId!==43498437664||
       receipt.liveEvidenceArtifactId!==14072713179||receipt.sameFiles.preview!==223||
       receipt.sameFiles.firebaseLive!==223||receipt.sameFiles.staffCustomDomain!==223||
       r10Release.sameFilesBothOrigins!==223||receipt.proposalsUniqueVisible!==52||
       receipt.ambiguousHold!==80||receipt.actualFinancialWrites!==0||
       receipt.fullI66ProductionAccepted!==false||r10Release.financialActualWrites!==0||
       latest.fullI66ProductionAccepted!==false||
       receipt.previousLiveSourceSha!==previousR9.sourceSha||
       r9Release?.status!=='PREVIOUS_R9_PAYMENT_INVOICE_POLICY_SIGNED_LIVE_PRESERVED'||
       previousR9.hostingVersion!=='sites/ays-orbit-360-lab/versions/1dd873081501d7fb'||
       receipt.previousLiveVersionForRollback!==previousR9.hostingVersion||
       transport.status!=='CONCILIACIONES_HUMAN_NAMES_R10_LIVE_ACCEPTED_LOCKED'||
       transport.livePromotionAuthorized!==false||transport.previewApproved!==false||
       transport.forbidBackendFunctionDeploy!==true||
       transport.forbidBackendLiveFunctionDeploy!==true||transport.noHostingPromotion!==true||
       transport.forbidFirestoreRulesDataAuthWrites!==true||
       current.currentR10HumanNamesSignedLiveReceipt!==r10Release.receipt)
      throw new Error(guard);
  }else if(r9Current){
    const receipt=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_PAYMENT_INVOICE_POLICY_R9_LIVE_RECEIPT_20261113.json','utf8'));
    const priorR8=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_ROLE_TRANSVERSAL_R8_LIVE_RECEIPT_20261113.json','utf8'));
    const state=JSON.parse(fs.readFileSync('orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json','utf8'));
    const s=state.currentLiveSuccessorAcceptance||{};
    const previous=transport.previousExactHostingReleaseR8||{};
    const fields=[
      [latest.currentLiveSourceSha,live?.sourceSha],
      [latest.currentLiveSourceSha,r9Release.sourceSha],
      [latest.currentLiveSourceSha,receipt.sourceSha],
      [latest.currentLiveSourceSha,s.sourceSha],
      [latest.currentLiveArtifactId,live?.artifactId],
      [latest.currentLiveArtifactId,r9Release.artifactId],
      [latest.currentLiveArtifactId,receipt.immutableArtifactId],
      [latest.currentLiveArtifactDigest,live?.artifactDigest],
      [latest.currentLiveArtifactDigest,r9Release.artifactDigest],
      [latest.currentLiveArtifactDigest,receipt.immutableArtifactDigest],
      [latest.currentLiveImmutableBuildRunId,live?.previewRunId],
      [latest.currentLiveImmutableBuildRunId,r9Release.buildRunId],
      [latest.currentLiveImmutableBuildRunId,receipt.immutableBuildRunId],
      [latest.currentLiveDeployAndSignedQaRunId,live?.liveCloneRunId],
      [latest.currentLiveDeployAndSignedQaRunId,r9Release.liveCloneRunId],
      [latest.currentLiveDeployAndSignedQaRunId,receipt.exactCloneAndSignedNewPolicyLiveRunId],
      [latest.currentLiveHostingVersion,live?.liveHostingVersion],
      [latest.currentLiveHostingVersion,r9Release.hostingVersion],
      [latest.currentLiveHostingVersion,receipt.hostingVersion],
      [latest.currentLiveReceipt,live?.receipt],
      [latest.currentLiveReceipt,r9Release.receipt],
      [latest.currentLiveReceipt,r9Release.currentPointer==='artifacts/orbit360-recovery/release-control/I6_6_LATEST_EXACT_LIVE_POINTER_20261113.json'?receipt&&r9Release.receipt:null],
      [latest.previousLiveVersionForRollback,previous.liveHostingVersion],
      [receipt.previousLiveVersionForRollback,previous.liveHostingVersion],
      [receipt.signedPaymentBackendLiveRunId,r9Release.signedBackendRunId],
      [receipt.signedPaymentUserInterfaceLiveRunId,r9Release.signedPaymentLiveUiRunId],
      [receipt.signedPaymentUserInterfaceLiveRunId,latest.currentR9SignedPaymentInvoicePolicyLiveAcceptance20261113?.paymentUserInterfaceSignedLiveRunId],
      [priorR8.liveHostingVersion,previous.liveHostingVersion],
      [priorR8.sourceSha,previous.sourceSha]
    ];
    if(fields.some(([a,b])=>a==null||b==null||a!==b)||
       control.currentExecutionDecisionPointer!=='i66PaymentInvoicePolicyR9ExactLiveRelease20261113'||
       state.currentExecutionDecisionPointer!=='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json#i66PaymentInvoicePolicyR9ExactLiveRelease20261113'||
       live?.status!=='PUBLISHED_EXACT_R9_223_FILES_SIGNED_PAYMENT_AND_NEW_POLICY_PARTIAL'||
       latest.status!=='LATEST_R9_PAYMENT_INVOICE_AND_POLICY_SIGNED_LIVE_PASS_I66_FULL_ACCEPTANCE_HOLD'||
       receipt.schema!=='GI_I66_PAYMENT_INVOICE_POLICY_R9_LIVE_RECEIPT_V1'||
       receipt.status!=='PUBLISHED_EXACT_ARTIFACT_SIGNED_CARLOS_PAULA_PAYMENT_AND_NEW_POLICY_LIVE_PASS_SCOPE_HOLD'||
       receipt.immutableArtifactId!==14057935092||receipt.exactCloneAndSignedNewPolicyLiveRunId!==43472800270||
       receipt.sameFiles.preview!==223||receipt.sameFiles.firebaseLive!==223||receipt.sameFiles.staffCustomDomain!==223||
       r9Release.sameFilesBothOrigins!==223||
       receipt.signedRoleAcceptance?.operativoCarlos?.syntheticFixturesRestored!==true||
       receipt.signedRoleAcceptance?.directionPaula?.syntheticFixturesRestored!==true||
       receipt.finance?.actualBusinessPaymentWritesThisRelease!==0||
       receipt.finance?.actualBusinessPolicyWritesThisRelease!==0||
       receipt.finance?.activeLedgerUniqueVisible!==52||receipt.finance?.activeLedgerAmbiguousHold!==80||
       receipt.finance?.actualInsurerInvoicePdfUploadRetrievalCertified!==false||
       r9Release.financialActualWrites!==0||latest.fullI66ProductionAccepted!==false||
       receipt.fullI66ProductionAccepted!==false||r9Release.fullI66ProductionAccepted!==false||
       priorR8.schema!=='GI_I66_ROLE_TRANSVERSAL_R8_LIVE_RECEIPT_V1'||
       priorR8.sourceSha!=='8a0e904500cbb3c961d83f16517caab69df88a2b'||
       stageRelease.sourceSha!=='e6183a9f1da68243cc935e222d98b2d21b5f17b8'||
       (transport.forbidBackendFunctionDeploy!==true&&!previewReaderScope)||transport.forbidBackendLiveFunctionDeploy!==true||
       transport.forbidFirestoreRulesDataAuthWrites!==true||transport.noHostingPromotion!==true)
      throw new Error(guard);
  }else if(roleCurrent){
    const receipt=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_ROLE_TRANSVERSAL_R8_LIVE_RECEIPT_20261113.json','utf8'));
    const currentState=JSON.parse(fs.readFileSync('orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json','utf8'));
    const historicStage=transport.i66ConciliacionesStageExactLiveCompleted20261113;
    const fields=[
      [latest.currentLiveSourceSha,live?.sourceSha],
      [latest.currentLiveSourceSha,roleRelease.sourceSha],
      [latest.currentLiveSourceSha,receipt.sourceSha],
      [latest.currentLiveSourceSha,currentState.currentLiveSuccessorAcceptance?.sourceSha],
      [latest.currentLiveArtifactId,live?.artifactId],
      [latest.currentLiveArtifactId,roleRelease.immutableArtifactId],
      [latest.currentLiveArtifactId,receipt.immutableArtifactId],
      [latest.currentLiveArtifactDigest,live?.artifactDigest],
      [latest.currentLiveArtifactDigest,roleRelease.immutableZipDigest],
      [latest.currentLiveArtifactDigest,receipt.immutableArtifactZipDigest],
      [latest.currentLiveDeployAndSignedQaRunId,live?.liveCloneRunId],
      [latest.currentLiveDeployAndSignedQaRunId,roleRelease.exactCloneRunId],
      [latest.currentLiveDeployAndSignedQaRunId,receipt.exactCloneRunId],
      [latest.currentLiveDeployAndSignedQaRunId,currentState.currentLiveSuccessorAcceptance?.currentExactHostingRunId],
      [latest.currentLiveHostingVersion,live?.liveHostingVersion],
      [latest.currentLiveHostingVersion,roleRelease.immutableLiveVersionBothOrigins],
      [latest.currentLiveHostingVersion,receipt.liveHostingVersion],
      [latest.currentLiveImmutableBuildRunId,live?.previewRunId],
      [latest.currentLiveImmutableBuildRunId,receipt.immutableBuildRunId],
      [latest.currentLiveReceipt,live?.receipt],
      [latest.currentLiveReceipt,roleRelease.signedReleaseReceipt],
      [latest.previousLiveVersionForRollback,receipt.previousLiveVersion],
      [stageRelease.immutableLiveVersionBothOrigins,receipt.previousLiveVersion],
      [pointer,roleRelease.currentPointer],
      [roleRelease.signedRealLiveRoleMatrixRunId,receipt.qa.live.signedRoleRunId]
    ];
    if(fields.some(([a,b])=>a==null||b==null||a!==b)||
       live?.status!=='PUBLISHED_EXACT_R8_223_FILES_SIGNED_ROLE_AND_SYNTHETIC_UAT_PARTIAL'||
       latest.status!=='LATEST_R8_TRANSVERSAL_PERMISSIONS_SIGNED_SYNTHETIC_LIVE_PASS_I66_FINANCIAL_ACCEPTANCE_HOLD'||
       receipt.schema!=='GI_I66_ROLE_TRANSVERSAL_R8_LIVE_RECEIPT_V1'||
       receipt.status!=='PUBLISHED_EXACT_ARTIFACT_SIGNED_LIVE_SYNTHETIC_PARTIAL_ACCEPTANCE'||
       receipt.sourceSha!=='8a0e904500cbb3c961d83f16517caab69df88a2b'||
       receipt.immutableArtifactId!==14048803073||
       receipt.exactCloneRunId!==43451818931||
       receipt.sameFiles.preview!==223||receipt.sameFiles.firebaseLive!==223||receipt.sameFiles.staffDomainLive!==223||
       receipt.qa.preview.roleMatrixCellsPassed!==35||receipt.qa.preview.roleMatrixCellsTotal!==35||
       receipt.qa.live.operativoVisibleCreateEdit.passed!==8||receipt.qa.live.direccionVisibleCreateEdit.passed!==10||
       receipt.qa.live.syntheticQaFixturesReverted!==true||receipt.qa.live.realCustomerWrites!==0||
       receipt.qa.hold.fullI66ProductionAccepted!==false||
       receipt.backendDeployments!==0||receipt.realDataWrites!==0||
       roleRelease.fullI66ProductionAccepted!==false||latest.fullI66ProductionAccepted!==false||
       stageRelease.sourceSha!=='e6183a9f1da68243cc935e222d98b2d21b5f17b8'||
       historicStage?.sourceSha!==stageRelease.sourceSha||
       historicStage?.uniqueRendered!==52||historicStage?.ambiguousHold!==80||
       stageRelease.realFinancialWritesInCurrentRelease!==0||
       transport.livePromotionAuthorized!==false||transport.previewApproved!==false||
       transport.forbidBackendFunctionDeploy!==true||transport.forbidBackendLiveFunctionDeploy!==true||
       transport.forbidFirestoreRulesDataAuthWrites!==true||transport.noHostingPromotion!==true)
      throw new Error(guard);
  }else if(stageCurrent){
    const receipt=transport.i66ConciliacionesStageExactLiveCompleted20261113;
    const currentState=JSON.parse(fs.readFileSync('orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json','utf8'));
    const preceding=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_LATEST_EXACT_LIVE_POINTER_20261112.json','utf8'));
    const fields=[
      [latest.currentLiveSourceSha,live?.sourceSha],
      [latest.currentLiveSourceSha,stageRelease.sourceSha],
      [latest.currentLiveSourceSha,receipt?.sourceSha],
      [latest.currentLiveSourceSha,currentState.currentLiveSuccessorAcceptance?.sourceSha],
      [latest.currentLiveArtifactId,live?.artifactId],
      [latest.currentLiveArtifactId,stageRelease.immutableArtifactId],
      [latest.currentLiveArtifactId,receipt?.immutableArtifactId],
      [latest.currentLiveArtifactDigest,live?.artifactDigest],
      [latest.currentLiveArtifactDigest,receipt?.immutableArtifactDigest],
      [latest.currentLiveDeployAndSignedQaRunId,live?.liveCloneRunId],
      [latest.currentLiveDeployAndSignedQaRunId,receipt?.signedLiveDeployAndQaRun],
      [latest.currentLiveHostingVersion,live?.liveHostingVersion],
      [latest.currentLiveHostingVersion,stageRelease.immutableLiveVersionBothOrigins],
      [latest.currentLiveHostingVersion,receipt?.effectiveLiveHostingVersion],
      [latest.currentLiveImmutableBuildRunId,live?.previewRunId],
      [latest.currentLiveReceipt,receipt?.receipt],
      [latest.currentLiveDeployAndSignedQaRunId,currentState.currentLiveSuccessorAcceptance?.currentExactHostingRunId],
      [pointer,live?.receipt],
      [preceding.deployedHostingVersion,receipt?.priorR7HostingRollback]
    ];
    if(fields.some(([a,b])=>a==null||b==null||a!==b)||
       live?.status!=='PUBLISHED_EXACT_STAGE_READONLY_SIGNED_DUAL_ORIGIN_NOT_FULL_FINANCIAL_UAT'||
       latest.status!=='LATEST_STAGE_READONLY_EXACT_ARTIFACT_DUAL_ORIGIN_SIGNED_LIVE_PASS_FULL_I66_FINANCIAL_ACCEPTANCE_HOLD'||
       latest.currentLiveArtifactId!==14018512857||latest.currentLiveDeployAndSignedQaRunId!==43388747480||
       receipt?.directionRealSignedLive!=='52_OF_52_UNIQUE_STAGE_PROPOSALS_UI_VISIBLE_READONLY_BOTH_ORIGINS_PASS'||
       receipt?.operativoCarlosRealSignedLive!=='CONCILIACIONES_UNASSIGNED_DENIED_BOTH_ORIGINS_PASS'||
       receipt?.stagedProposals!==132||receipt.uniqueRendered!==52||receipt.ambiguousHold!==80||
       receipt.financialWrites!==0||stageRelease.realFinancialWritesInCurrentRelease!==0||
       receipt.fullI66FinancialProductionAcceptance!==false||stageRelease.currentI66ProductionAccepted!==false||
       currentState.currentLiveSuccessorAcceptance?.currentSuccessorProductionAccepted!==false||
       latest.fullI66ProductionAccepted!==false||
       transport.livePromotionAuthorized!==false||transport.previewApproved!==false||
       transport.forbidBackendFunctionDeploy!==true||transport.forbidBackendLiveFunctionDeploy!==true||
       transport.forbidFirestoreRulesDataAuthWrites!==true||transport.noHostingPromotion!==true)
      throw new Error(guard);
  }else{
    const fields=[
      [latest?.latestProductSourceSha,live?.sourceSha],
      [latest?.latestProductBuildId,live?.buildId],
      [latest?.immutableArtifactId,live?.artifactId],
      [latest?.immutableArtifactZipSha256,live?.artifactDigest],
      [latest?.releaseRunId,live?.liveCloneRunId],
      [latest?.latestPreviewBuildRunId,live?.previewRunId],
      [latest?.latestReleaseReceipt,live?.receipt]
    ];
    if(!live||!['PUBLISHED_EXACT_NOT_FULL_FUNCTIONAL_UAT','PUBLISHED_EXACT_FUNCTIONAL_UAT_PASS'].includes(live.status)||
       fields.some(([a,b])=>!a||!b||a!==b)||
       (live.sourceSha===r4?.sourceSha&&
         (live.artifactId!==r4.artifactId||live.liveCloneRunId!==r4.liveCloneRunId))||
       transport.authorizationFlagScopeClarification20261111?.exactR4LiveHostingPromotionConfirmed!==true||
       (transport.scope==='I6_6_ACTIVE_READER_PREVIEW_AUTHORIZATION_FLAGS_WITH_HISTORICAL_EXACT_R4_LIVE_HOSTING_RECEIPT'&&
         (transport.livePromotionAuthorized!==false||transport.previewApproved!==false))||
       (live.status==='PUBLISHED_EXACT_NOT_FULL_FUNCTIONAL_UAT'&&latest.doNotClaimWholePlatformQaPass!==true))
      throw new Error(guard);
  }
}
const activeGuard=i66Active?i66Guard:(i6Active?i6Guard:(postI5?postI5Guard:preI5Guard));
const evergreenGuard='tools/gravicentra-evergreen-sources-invariant-v2.mjs';
const syntaxTargets=[
  preI5Guard,
  postI5Guard,
  i6Guard,
  i66Guard,
  'tools/gravicentra-mechanism-invariant-v2.mjs',
  evergreenGuard,
  'tools/gravicentra-i4a-proof-registry-guard-v1.mjs',
  'tools/gravicentra-i4a-preview-function-remediation-guard-v1.mjs',
  'tools/gravicentra-i4a-preview-remediation-invariant-v1.mjs'
];
for(const p of syntaxTargets) run(node,['--check',p]);

if(i6Active&&['i2','i3','i4a','i4b','i5'].includes(mode)) throw new Error('GRAVICENTRA_PRIOR_GATE_REENTRY_BLOCKED_DURING_I6:'+mode);
run(node,[activeGuard,'--mode=governance']);
run(node,['tools/gravicentra-i4a-proof-registry-guard-v1.mjs']);
run(node,['tools/gravicentra-mechanism-invariant-v2.mjs']);
run(node,[evergreenGuard]);
run(node,['tools/gravicentra-i4a-preview-remediation-invariant-v1.mjs']);
if(mode==='i6'){
  if(!i6Active) throw new Error('GRAVICENTRA_I6_MODE_BEFORE_I6_ACTIVE');
  run(node,[activeGuard,'--mode=i6']);
}else if(mode!=='governance'&&mode!=='certified'){
  run(node,[activeGuard,'--mode='+mode]);
}
run('git',['diff','--exit-code']);

console.log('GRAVICENTRA_GOVERNANCE_PREFLIGHT=PASS');
console.log('PREFLIGHT_MODE='+mode);
console.log('CONTROL_STATUS='+control.status);
console.log('ACTIVE_CONTROL_GUARD='+activeGuard);
console.log('I6_ACTIVE='+String(i6Active));
console.log('I6_6_ACTIVE='+String(i66Active));
console.log('SAME_HEAD_GOVERNANCE_AND_GATE_GUARD=true');
console.log('PRODUCT_SOURCE_MUTATION=false');
console.log('PRODUCTION_ACCEPTED='+String(control.environmentState?.productionAccepted===true));
console.log('PRODUCTION_TOUCHED='+String(control.environmentState?.productionTouchedByRecovery===true));
console.log('CONTROLLED_DATA_TOUCHED='+String(control.environmentState?.dataTouchedByRecovery===true));
console.log('AUGUST_REFRESH='+String(control.environmentState?.augustRefresh||''));
console.log('PROJECT_SOURCES='+String(control.projectSources?.activePackage||''));
