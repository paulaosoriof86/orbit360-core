'use strict';
// Parametrization of the existing I6.6 exact-artifact transport, not a new gate.
// All authority comes from the canonical control. Targets and proof owners are
// deliberately closed here; no arbitrary function, script, origin or project.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const CONTROL = 'artifacts/orbit360-recovery/release-control/I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json';
const SITE = 'ays-orbit-360-lab';
const PREVIEW = 'https://ays-orbit-360-lab--gi-i66-rc-42868854629-abj14q6n.web.app';
const CHANNEL = 'gi-i66-rc-42868854629';
const LIVE = 'https://app.aysseguros.com';
const PREVIEW_WORKFLOW = '.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml';
const BUILD_WORKFLOW = '.github/workflows/gravicentra-release-delta-66-package.yml';
const SIGNED_OBSERVABILITY_PROFILE = 'I66_SIGNED_BROWSER_OBSERVABILITY_V1';
const TARGETS = Object.freeze({
  preview: [
    {name:'orbit360ProductOperationalCommandPreview',region:'us-east1'},
    {name:'orbit360CobrosReconciliationCommandPreview',region:'us-central1'},
    {name:'orbit360ScopedPolicyReadPreview',region:'us-east1'}
  ],
  live: [
    {name:'orbit360ProductOperationalCommand',region:'us-central1'},
    {name:'orbit360CobrosReconciliationCommand',region:'us-central1'},
    {name:'orbit360ScopedPolicyRead',region:'us-east1'}
  ]
});
const DRIVERS = Object.freeze([
  'tools/gravicentra-i66-privileged-role-signed-ui-permissions-readonly.cjs',
  'tools/gravicentra-i6-6-carlos-real-signed-synthetic-preview-uat.cjs',
  'tools/gravicentra-i6-6-advisor-payables-signed-uat.cjs',
  'tools/gravicentra-i6-6-proposal-application-signed-uat.cjs'
]);
const PROPOSAL_QA_ISOLATION = Object.freeze({
  tenantId:'alianzas-soluciones',runIdPrefix:'cobledgerqa_',entityIdPrefix:'b3005qa_',
  runCollection:'cobrosLedgerQaRuns',controlCollection:'cobrosLedgerQaControl',
  requireSameQaRunId:true,requireSyntheticMarker:true,
  allowRealControlPointerMutation:false,restoreAllSyntheticRecords:true
});
const ADVISOR_QA_ISOLATION = Object.freeze({
  tenantId:'alianzas-soluciones',runIdPrefix:'b4003qa_i66_cxp_',
  payableIdPrefix:'b4003qa_cxpase_',commissionIdPrefix:'b4003qa_comsrc_',
  requireSameQaRunId:true,requireSyntheticMarker:true,restoreAllSyntheticRecords:true,
  financialPayments:0,bankMovements:0,authOrMembershipMutations:0
});
const PINNED_OWNER_PATHS = Object.freeze([
  'functions','orbit360-platform','firebase.json','firestore.rules','storage.rules',
  ...DRIVERS,'tools/gravicentra-i6-6-carlos-paula-live-synthetic-ops-leads-uat.cjs',
  'tools/gravicentra-i6-6-direction-preview-legal-acceptance.cjs',
  'tools/gravicentra-i6-6-direction-preview-i66-consent-scope.test.cjs',
  'artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_PREVIEW_V2_SCOPE_AUTHORIZATION_20261116.json',
  'tools/gravicentra-i6-6-preview-channel-reuse-guard.cjs',
  'tools/gravicentra-i6-6-technical-preview-rollover.test.cjs',
  'artifacts/orbit360-recovery/release-control/I6_6_CURRENT_TECHNICAL_PREVIEW_ROLLOVER_20261116.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_ROLLOVER_CAUSAL_RETRY_20261116.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_OBSERVABILITY_REBUILD_20261116.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_DIAGNOSTIC_RETENTION_REBUILD_20261117.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_HYDRATION_AND_BALANCE_REBUILD_20261117.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_DOCUMENTED_SOURCE_AND_TRANSPORT_REBUILD_20261117.json',
  'tools/gravicentra-i6-6-live-proof-artifact-layout.test.cjs',
  'tools/gravicentra-i6-6-documented-premium-terms.test.cjs',
  'tools/gravicentra-i6-6-documented-terms-signed-check.cjs',
  'tools/gravicentra-i6-6-documented-terms-signed-check.test.cjs',
  'artifacts/orbit360-recovery/release-control/I6_6_DOCUMENTED_PREMIUM_CALENDAR_SOURCE_QA_20261117.json',
  'tools/gravicentra-i6-6-advisor-browser-observability.test.cjs',
  'tools/gravicentra-i6-6-preview-failure-diagnostics-retention.test.cjs',
  'tools/gravicentra-i6-6-receipt-edit-safe-diagnostics.test.cjs',
  'tools/gravicentra-i6-6-receipt-current-balance.test.cjs',
  'tools/gravicentra-i6-6-protected-role-policy-hydration.test.cjs',
  'tools/gravicentra-b4-003-protected-hydration.test.cjs',
  'tools/gravicentra-b4-003-post-auth-bootstrap-diagnostic.test.cjs',
  'tools/gravicentra-i66-cartera-a1-a4-readonly.cjs',
  'tools/gravicentra-i66-cartera-a1-a4-readonly.test.cjs',
  // Preserve the exact QA-only navigation retry and its restore proof after build.
  'tools/gravicentra-i6-6-preview-current-live-restore.cjs',
  '.github/workflows/gravicentra-release-delta-66-package.yml',
  'tools/gravicentra-i6-6-assignment-detail-navigation.test.cjs',
  'tools/gravicentra-i6-6-direction-preview-qa-navigation-retry.test.cjs',
  'tools/gravicentra-i6-6-preview-current-live-restore-47f4.test.cjs',
  'artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_PREVIEW_QA_NAVIGATION_RETRY_20261116.json',
  'artifacts/orbit360-recovery/release-control/I6_6_QA_NAVIGATION_CAUSAL_RETRY_20261116.json',
  // Proposal diagnostics change QA evidence only; their exact bytes remain pinned.
  'tools/gravicentra-i6-6-proposal-uat-diagnostics.cjs',
  'tools/gravicentra-i6-6-proposal-uat-diagnostics.test.cjs',
  'tools/gravicentra-i6-6-direction-preview-proposal-diagnostic-retry.test.cjs',
  'tools/gravicentra-i6-6-preview-current-live-restore-39f54e2.test.cjs',
  'artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_PREVIEW_PROPOSAL_DIAGNOSTIC_RETRY_20261117.json',
  'artifacts/orbit360-recovery/release-control/I6_6_PROPOSAL_DIAGNOSTIC_CAUSAL_RETRY_20261117.json',
  'tools/gravicentra-i6-6-operational-release-candidate.cjs',
  'tools/gravicentra-i6-6-preview-candidate-binding.test.cjs',
  'tools/gravicentra-i66-privileged-role-exact-live-transport.mjs',
  PREVIEW_WORKFLOW,'.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml',
  // Same sole governance exception as the canonical delta guard. Recording
  // build/QA evidence in state is not a product or test-source mutation.
  ':(exclude)orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json'
]);
const checkSha = (v,label) => assert.match(String(v||''),/^[0-9a-f]{40}$/,label);
const checkDigest = (v,label) => assert.match(String(v||''),/^sha256:[0-9a-f]{64}$/,label);
const checkId = (v,label) => assert.ok(Number.isSafeInteger(v)&&v>0,label);
const checkBuildId = (v,source,label) => {
  assert.equal(typeof v,'string',label);assert.equal(v.trim(),v,label);
  assert.match(v,new RegExp('^gi-i66-'+source.slice(0,12)+'-[a-f0-9]{12}$'),label);
};
function previewIdentity(p) {
  checkId(p.buildRunId,'I66_OPERATIONAL_BUILD_RUN_PIN');
  checkSha(p.sourceSha,'I66_OPERATIONAL_SOURCE_PIN');
  // Retain the historical channel and permit only the separately source-pinned
  // current-task rollover. Otherwise a new endpoint belongs to this build run.
  const historical=p.previewUrl===PREVIEW&&p.previewChannelId===CHANNEL;
  if(!historical){
    if(p.previewRollover!==undefined){
      require('./gravicentra-i6-6-preview-channel-reuse-guard.cjs').validateTechnicalRolloverCandidate(p);
    }else assert.equal(p.previewChannelId,'gi-i66-rc-'+p.buildRunId,'I66_OPERATIONAL_PREVIEW_CHANNEL_RUN_DRIFT');
    assert.match(String(p.previewUrl||''),new RegExp('^https://'+SITE+'--'+p.previewChannelId+'-[a-z0-9]+\\.web\\.app$'),'I66_OPERATIONAL_PREVIEW_ORIGIN_DRIFT');
    checkBuildId(p.buildId,p.sourceSha,'I66_OPERATIONAL_BUILD_ID_PIN');
  }
  // An exact origin rejects even default-port spelling, trailing paths and
  // URL normalization. No userinfo, query, fragment or encoded hostname.
  const url=new URL(p.previewUrl);
  assert.equal(url.origin,p.previewUrl,'I66_OPERATIONAL_PREVIEW_NOT_LITERAL_ORIGIN');
  assert.equal(url.protocol,'https:');assert.equal(url.username,'');assert.equal(url.password,'');
  assert.equal(url.port,'');assert.equal(url.pathname,'/');assert.equal(url.search,'');assert.equal(url.hash,'');
  return {origin:p.previewUrl,channelId:p.previewChannelId,historical};
}
function validateBuildMarker(p,marker,packageMarker) {
  previewIdentity(p);
  assert.ok(marker&&typeof marker==='object'&&!Array.isArray(marker),'I66_OPERATIONAL_BUILD_MARKER_REQUIRED');
  assert.equal(marker.sourceSha,p.sourceSha,'I66_OPERATIONAL_BUILD_MARKER_SOURCE_DRIFT');
  assert.equal(marker.gate,'I6.6','I66_OPERATIONAL_BUILD_MARKER_GATE_DRIFT');
  assert.equal(marker.product,'Gravicentra Insurance','I66_OPERATIONAL_BUILD_MARKER_PRODUCT_DRIFT');
  checkBuildId(marker.buildId,p.sourceSha,'I66_OPERATIONAL_BUILD_MARKER_ID_DRIFT');
  if(p.buildId!==undefined)assert.equal(marker.buildId,p.buildId,'I66_OPERATIONAL_BUILD_MARKER_ID_DRIFT');
  if(packageMarker!==undefined){
    validateBuildMarker(p,packageMarker);
    assert.deepEqual(marker,packageMarker,'I66_OPERATIONAL_HOSTED_PACKAGE_MARKER_DRIFT');
  }
  return marker;
}
function signedMatrixBinding(env,control) {
  if(env.I66_OPERATIONAL_CANDIDATE==='true'){
    const origin=String(env.I66_SIGNED_MATRIX_ORIGIN||'');
    const phase=origin===LIVE?'live':'preview',p=candidateForPhase(control,phase);
    assert.equal(origin,phase==='live'?LIVE:p.previewUrl,'I66_SIGNED_MATRIX_CANDIDATE_ORIGIN_DRIFT');
    assert.equal(env.I66_SOURCE_SHA,p.sourceSha,'I66_SIGNED_MATRIX_CANDIDATE_SOURCE_DRIFT');
    assert.equal(env.I66_PREVIEW_ORIGIN,p.previewUrl,'I66_SIGNED_MATRIX_PREVIEW_ENV_DRIFT');
    assert.equal(env.I66_SIGNED_QA_CHANNEL_ID,p.previewChannelId,'I66_SIGNED_MATRIX_CHANNEL_ENV_DRIFT');
    return {origin,preview:p.previewUrl,phase,candidate:p};
  }
  const origin=env.I66_SIGNED_MATRIX_ORIGIN||PREVIEW;
  assert.ok(origin===PREVIEW||origin===LIVE,'I66_SIGNED_MATRIX_UNKNOWN_ORIGIN');
  return {origin,preview:PREVIEW,phase:origin===LIVE?'live':'preview',candidate:null};
}
function candidateForPhase(control,phase) {
  assert.ok(['preview','live'].includes(phase),'I66_OPERATIONAL_PHASE_INVALID');
  assert.equal(control.gate,'I6.6');
  assert.equal(control.historicalClosedGate,'B4-007');
  assert.equal(control.status,phase==='preview'?'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED':'OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED');
  assert.equal(control.forbidBackendFunctionDeploy,false);
  assert.equal(control.forbidFirestoreRulesDataAuthWrites,true);
  assert.equal(control.backendFunctionPreviewOnly,phase==='preview');
  assert.equal(control.forbidBackendLiveFunctionDeploy,phase==='preview');
  assert.equal(control.livePromotionAuthorized,phase==='live');
  assert.equal(control.previewApproved,phase==='live');
  assert.equal(control.noHostingPromotion,phase==='preview');
  const p=control.operationalReleaseCandidate;
  assert.ok(p,'I66_OPERATIONAL_CANDIDATE_MISSING');
  assert.equal(p.schema,'I6_6_OPERATIONAL_EXACT_RELEASE_V1');
  assert.equal(p.approvedByDirection,true);
  assert.equal(p.status,phase==='preview'?'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED':'EXACT_PREVIEW_SIGNED_LIVE_AUTHORIZED');
  checkSha(p.sourceSha,'I66_OPERATIONAL_SOURCE_PIN');
  checkId(p.buildRunId,'I66_OPERATIONAL_BUILD_RUN_PIN');
  checkId(p.artifactId,'I66_OPERATIONAL_ARTIFACT_PIN');
  checkDigest(p.artifactDigest,'I66_OPERATIONAL_DIGEST_PIN');
  previewIdentity(p);
  if(p.previewRollover!==undefined)
    assert.equal(p.signedObservabilityProfile,SIGNED_OBSERVABILITY_PROFILE,'I66_OPERATIONAL_SIGNED_OBSERVABILITY_PROFILE_REQUIRED');
  if(p.signedObservabilityProfile!==undefined)
    assert.equal(p.signedObservabilityProfile,SIGNED_OBSERVABILITY_PROFILE,'I66_OPERATIONAL_SIGNED_OBSERVABILITY_PROFILE_UNKNOWN');
  assert.deepEqual(p.targets,TARGETS,'I66_OPERATIONAL_TARGET_SCOPE_DRIFT');
  assert.deepEqual(p.requiredPreviewDrivers,DRIVERS,'I66_OPERATIONAL_QA_DRIVER_SCOPE_DRIFT');
  assert.equal(p.sameImmutableArtifactOnly,true);
  assert.equal(p.syntheticRecordsOnly,true);
  assert.equal(p.noRealFinancialOrCustomerWrites,true);
  assert.equal(p.noRulesAuthIamWrites,true);
  assert.equal(p.rollbackThreeBackendRevisionsAndHosting,true);
  assert.equal(p.expectedSiteFileCount,223);
  // Existing staff/tenant only, with an isolated synthetic namespace. No new
  // membership, IAM, rules or mutation of the operational control/active pointer.
  assert.deepEqual(p.syntheticQaIsolation,PROPOSAL_QA_ISOLATION,'I66_OPERATIONAL_QA_NAMESPACE_ISOLATION_DRIFT');
  assert.deepEqual(p.advisorPayableQaIsolation,ADVISOR_QA_ISOLATION,'I66_OPERATIONAL_ADVISOR_QA_NAMESPACE_ISOLATION_DRIFT');
  const current=control.currentExactHostingRelease||{},backup=p.currentLive||{};
  for(const [field,source] of Object.entries({sourceSha:'sourceSha',buildId:'buildId',artifactId:'artifactId',artifactDigest:'artifactDigest',buildRunId:'previewRunId',liveRunId:'liveCloneRunId',hostingVersion:'liveHostingVersion'}))
    assert.equal(backup[field],current[source],'I66_OPERATIONAL_LIVE_BACKUP_DRIFT_'+field);
  checkSha(backup.sourceSha,'I66_OPERATIONAL_BACKUP_SOURCE');
  checkDigest(backup.artifactDigest,'I66_OPERATIONAL_BACKUP_DIGEST');
  for(const id of ['artifactId','buildRunId','liveRunId'])checkId(backup[id],'I66_OPERATIONAL_BACKUP_'+id);
  assert.match(String(backup.buildId||''),new RegExp('^gi-i66-'+backup.sourceSha.slice(0,12)+'-'));
  assert.match(String(backup.hostingVersion||''),/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/);
  assert.notEqual(p.sourceSha,backup.sourceSha,'I66_OPERATIONAL_ALREADY_LIVE_SOURCE');
  if(phase==='live'){
    const q=p.previewQa||{};
    checkId(q.runId,'I66_OPERATIONAL_PREVIEW_QA_RUN');
    checkSha(q.headSha,'I66_OPERATIONAL_PREVIEW_QA_HEAD');
    checkId(q.receiptArtifactId,'I66_OPERATIONAL_PREVIEW_QA_RECEIPT');
    checkDigest(q.receiptArtifactDigest,'I66_OPERATIONAL_PREVIEW_QA_RECEIPT_DIGEST');
    assert.equal(q.status,'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS');
  }
  return p;
}
function continuationForPreflight(control,state,transport) {
  if(transport.status==='R11_RENEWAL_DRIVE_EXACT_LIVE_ACCEPTED_LOCKED')return null;
  const phases={PREVIEW_BUILD_REQUESTED:'build',OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED:'preview',OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED:'live'};
  const phase=phases[transport.status];
  assert.ok(phase,'I66_OPERATIONAL_PREFLIGHT_PHASE_NOT_AUTHORIZED');
  const work=control.i66OperationalContinuation20261115;
  assert.ok(work,'I66_OPERATIONAL_PREFLIGHT_CONTINUATION_REQUIRED');
  assert.equal(work.status,'EXECUTING_SOURCE_QA_NOT_NEW_LIVE_ACCEPTANCE');
  assert.equal(work.canonicalPlan,'artifacts/orbit360-recovery/release-control/I6_6_OPERATIONAL_CONTINUATION_20261115.json');
  assert.equal(work.activeGate,'I6.6');assert.equal(work.closedHistoricalGate,'B4-007');
  assert.equal(work.latestProvenLiveSource,transport.currentExactHostingRelease?.sourceSha);
  assert.equal(work.newFinancialWrites,0);assert.equal(work.newLiveAcceptanceClaimed,false);
  assert.equal(state.currentOperationalWorkPointer,'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json#i66OperationalContinuation20261115');
  // Historical acceptance and current work must remain separate even while
  // Preview/production transport is explicitly authorized for a successor.
  assert.equal(control.currentExecutionDecisionPointer,'i66R11RenewalDriveExactLiveRelease20261113');
  assert.equal(state.currentExecutionDecisionPointer,'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json#i66R11RenewalDriveExactLiveRelease20261113');
  if(phase==='build'){
    require('./gravicentra-i6-6-preview-channel-reuse-guard.cjs').validateAuthorization(transport);
    assert.equal(transport.backendFunctionPreviewOnly,false);
    assert.equal(transport.operationalReleaseCandidate,undefined,'I66_OPERATIONAL_BUILD_MUST_NOT_REUSE_PRIOR_CANDIDATE');
  }else{
    // Same validators used by the protected workflow before artifact download,
    // signed QA and exact promotion. Preflight itself grants no deployment.
    candidateForPhase(transport,phase);
  }
  return phase;
}
function validateArtifact(p,run,artifact) {
  assert.equal(run.id,p.buildRunId);assert.equal(run.conclusion,'success');
  assert.equal(run.head_sha,p.sourceSha);assert.equal(run.path,BUILD_WORKFLOW);
  assert.equal(artifact.id,p.artifactId);assert.equal(artifact.expired,false);
  assert.equal(artifact.digest,p.artifactDigest);assert.equal(artifact.workflow_run?.id,p.buildRunId);
  assert.equal(artifact.workflow_run?.head_sha,p.sourceSha);
  assert.equal(artifact.name,'gi-i66-immutable-'+p.sourceSha);
}
function validatePreviewQa(p,run,artifact) {
  const q=p.previewQa;
  assert.equal(run.id,q.runId);assert.equal(run.conclusion,'success');
  assert.equal(run.path,PREVIEW_WORKFLOW);assert.equal(run.head_sha,q.headSha);
  assert.equal(artifact.id,q.receiptArtifactId);assert.equal(artifact.expired,false);
  assert.equal(artifact.digest,q.receiptArtifactDigest);assert.equal(artifact.workflow_run?.id,q.runId);
  assert.equal(artifact.name,'gi-i66-operational-preview-proof-'+q.runId);
}
function validateProof(p,proof) {
  assert.equal(proof.schema,'I6_6_OPERATIONAL_SIGNED_PREVIEW_PROOF_V1');
  assert.equal(proof.status,'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS');
  for(const key of ['sourceSha','buildRunId','artifactId','artifactDigest','previewUrl','previewChannelId'])assert.equal(proof[key],p[key]);
  if(p.buildId!==undefined)assert.equal(proof.buildId,p.buildId,'I66_OPERATIONAL_PROOF_BUILD_ID_DRIFT');
  assert.deepEqual(proof.targets,TARGETS.preview);assert.deepEqual(proof.signedDrivers,DRIVERS);
  assert.equal(proof.realFinancialOrCustomerWrites,0);assert.equal(proof.syntheticRestoreComplete,true);
  assert.equal(proof.liveHostingUnchanged,true);assert.equal(proof.liveBackendUnchanged,true);
  assert.deepEqual(Object.keys(proof.focusedReports||{}).sort(),['advisorPayables','proposalApplication']);
  for(const report of Object.values(proof.focusedReports)){
    assert.equal(report.status,'PASS');assert.equal(report.cleanup,'PASS');
    assert.ok(Number.isSafeInteger(report.checks)&&report.checks>0);
    checkDigest(report.digest,'I66_OPERATIONAL_FOCUSED_REPORT_DIGEST_REQUIRED');
  }
  if(p.signedObservabilityProfile===SIGNED_OBSERVABILITY_PROFILE){
    assert.deepEqual(proof.focusedReports.advisorPayables.observability,
      {profile:SIGNED_OBSERVABILITY_PROFILE,status:'PASS',unexpectedConsoleErrors:0,
        unexpectedHttpErrors:0,pageErrorCount:0,telemetryFailures:0},'I66_OPERATIONAL_BROWSER_ERROR_ATTRIBUTION_PROOF_REQUIRED');
    const ui=proof.focusedReports.proposalApplication.observability;
    assert.equal(ui?.profile,SIGNED_OBSERVABILITY_PROFILE,'I66_OPERATIONAL_UI_OBSERVABILITY_PROFILE_REQUIRED');
    assert.equal(ui.status,'PASS','I66_OPERATIONAL_UI_OBSERVABILITY_NOT_PASS');
    assert.ok(['UI_RESPONSE_CAPTURED_EXACT','UI_REQUEST_RELOAD_DURABLE_READBACK_EXACT'].includes(ui.mode),
      'I66_OPERATIONAL_UI_APPLICATION_CAUSAL_PROOF_REQUIRED');
  }
}
function signedObservabilityReports(p,advisor,proposal){
  if(p.signedObservabilityProfile===undefined)return null; // Preserve historical proof interpretation.
  assert.equal(p.signedObservabilityProfile,SIGNED_OBSERVABILITY_PROFILE,'I66_OPERATIONAL_SIGNED_OBSERVABILITY_PROFILE_UNKNOWN');
  const {validateBrowserObservability}=require('./gravicentra-i6-6-advisor-payables-signed-uat.cjs');
  validateBrowserObservability(advisor.browserObservability);
  const ui=proposal.uiApplicationConfirmation;
  assert.ok(ui,'I66_OPERATIONAL_UI_APPLICATION_CONFIRMATION_REQUIRED');
  const {validateUiApplicationEvidence}=require('./gravicentra-i6-6-proposal-uat-diagnostics.cjs');
  assert.deepEqual(ui,validateUiApplicationEvidence(ui.observation,ui.causalEvidence),
    'I66_OPERATIONAL_UI_APPLICATION_CONFIRMATION_DRIFT');
  return {
    advisorPayables:{profile:SIGNED_OBSERVABILITY_PROFILE,status:'PASS',unexpectedConsoleErrors:0,
      unexpectedHttpErrors:0,pageErrorCount:0,telemetryFailures:0},
    proposalApplication:{profile:SIGNED_OBSERVABILITY_PROFILE,status:'PASS',mode:ui.mode}
  };
}
function validateFocusedReports(p,phase,advisor,proposal){
  for(const report of [advisor,proposal]){
    assert.equal(report.sourceSha,p.sourceSha);assert.equal(report.phase,phase);
    assert.equal(report.status,'PASS');assert.equal(report.cleanup?.status,'PASS');assert.equal(report.cleanup?.remaining,0);
    assert.ok(Array.isArray(report.checks)&&report.checks.length>0,'I66_OPERATIONAL_EMPTY_SIGNED_DRIVER');
    for(const check of report.checks)assert.ok(typeof check==='string'||check?.status==='PASS','I66_OPERATIONAL_FOCUSED_CHECK_NOT_PASS');
  }
  for(const field of ['realCustomerWritesRequested','bankMovements','financialPayments','authOrMembershipMutations'])assert.equal(advisor[field],0);
  assert.equal(proposal.syntheticOnly,true);assert.equal(proposal.realControlUnchanged,true);
  signedObservabilityReports(p,advisor,proposal);
  if(phase==='PREVIEW'&&p.legalAcceptance){
    const {validateAcceptanceProof}=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
    for(const report of [advisor,proposal])validateAcceptanceProof(report.directionLegalAcceptance,p);
    for(const key of ['actorUidSha256','scopeSha256'])assert.equal(advisor.directionLegalAcceptance[key],proposal.directionLegalAcceptance[key],'I66_OPERATIONAL_LEGAL_SIGNED_ACTOR_SCOPE_DRIFT');
  }
}
function focusedReportsFromDisk(p,phase,env=process.env){
  assert.ok(['PREVIEW','LIVE'].includes(phase));
  const paths={advisorPayables:env.I66_ADVISOR_PAYABLE_UAT_REPORT||path.join(env.RUNNER_TEMP,'gravicentra-i66-advisor-payables-signed-uat-'+phase.toLowerCase()+'.json'),
    proposalApplication:path.join(env.I66_PACKAGE_ROOT,'evidence','i66-proposal-application-signed-uat-'+phase.toLowerCase()+'.json')};
  const bytes=Object.fromEntries(Object.entries(paths).map(([k,file])=>[k,fs.readFileSync(file)]));
  const reports=Object.fromEntries(Object.entries(bytes).map(([k,b])=>[k,JSON.parse(b)]));
  validateFocusedReports(p,phase,reports.advisorPayables,reports.proposalApplication);
  const observability=signedObservabilityReports(p,reports.advisorPayables,reports.proposalApplication);
  return Object.fromEntries(Object.entries(reports).map(([key,r])=>[key,{status:r.status,cleanup:r.cleanup.status,checks:r.checks.length,digest:'sha256:'+crypto.createHash('sha256').update(bytes[key]).digest('hex'),...(observability?{observability:observability[key]}:{})}]));
}
function verifyPinnedOwners(p) {
  execFileSync('git',['merge-base','--is-ancestor',p.sourceSha,'HEAD'],{stdio:'pipe'});
  assert.equal(execFileSync('git',['diff','--name-only',p.sourceSha,'HEAD','--',...PINNED_OWNER_PATHS],{encoding:'utf8'}).trim(),'','I66_OPERATIONAL_SOURCE_OR_QA_OWNER_DRIFT');
  if(p.previewQa?.headSha){
    execFileSync('git',['merge-base','--is-ancestor',p.previewQa.headSha,'HEAD'],{stdio:'pipe'});
    assert.equal(execFileSync('git',['diff','--name-only',p.sourceSha,p.previewQa.headSha,'--',...PINNED_OWNER_PATHS],{encoding:'utf8'}).trim(),'','I66_OPERATIONAL_SIGNED_QA_TESTED_DIFFERENT_SOURCE');
  }
}
async function fetchJson(url){
  const r=await fetch(url,{headers:{Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json','User-Agent':'GI-I66-Operational-Exact'},signal:AbortSignal.timeout(30000)});
  assert.ok(r.ok,'I66_OPERATIONAL_PROOF_API_UNAVAILABLE');return r.json();
}
function envFor(p){return {
  I66_OPERATIONAL_CANDIDATE:'true',SOURCE_SHA:p.sourceSha,I66_SOURCE_SHA:p.sourceSha,
  SOURCE_PACKAGE_RUN:p.buildRunId,SOURCE_ARTIFACT_ID:p.artifactId,SOURCE_ARTIFACT_DIGEST:p.artifactDigest,
  I66_ROLE_SOURCE_SHA:p.sourceSha,I66_ROLE_BUILD_RUN:p.buildRunId,I66_ROLE_ARTIFACT_ID:p.artifactId,I66_ROLE_ARTIFACT_DIGEST:p.artifactDigest,
  I66_PREVIEW_ORIGIN:p.previewUrl,I66_ROLE_PREVIEW_ORIGIN:p.previewUrl,I66_SIGNED_MATRIX_ORIGIN:p.previewUrl,I66_SIGNED_QA_CHANNEL_ID:p.previewChannelId,I66_ROLE_PREVIEW_CHANNEL:p.previewChannelId,
  I66_EXPECTED_BUILD_ID:p.buildId||'',
  I66_APPROVED_LIVE_SOURCE_SHA:p.sourceSha,I66_PREVIOUS_SOURCE_SHA:p.currentLive.sourceSha,I66_PREVIOUS_BUILD_ID:p.currentLive.buildId,
  I66_PREVIOUS_HOSTING_VERSION:p.currentLive.hostingVersion,I66_EXPECTED_SITE_FILE_COUNT:p.expectedSiteFileCount,
  I66_PREVIEW_QA_ARTIFACT_ID:p.previewQa?.receiptArtifactId||'',I66_PREVIEW_QA_RUN_ID:p.previewQa?.runId||''
};}
async function main(){
  const phase=process.argv[2],control=JSON.parse(fs.readFileSync(CONTROL,'utf8'));
  const p=candidateForPhase(control,phase);verifyPinnedOwners(p);
  const api='https://api.github.com/repos/paulaosoriof86/orbit360-core/actions/';
  const [run,artifact]=await Promise.all([fetchJson(api+'runs/'+p.buildRunId),fetchJson(api+'artifacts/'+p.artifactId)]);
  validateArtifact(p,run,artifact);
  if(phase==='live'){
    const [qr,qa]=await Promise.all([fetchJson(api+'runs/'+p.previewQa.runId),fetchJson(api+'artifacts/'+p.previewQa.receiptArtifactId)]);
    validatePreviewQa(p,qr,qa);
  }
  assert.ok(process.env.GITHUB_ENV,'I66_OPERATIONAL_GITHUB_ENV_REQUIRED');
  fs.appendFileSync(process.env.GITHUB_ENV,Object.entries(envFor(p)).map(([k,v])=>k+'='+v).join('\n')+'\n');
  console.log('I66_OPERATIONAL_'+phase.toUpperCase()+'_SOURCE_ARTIFACT_AUTHORITY_PASS');
}
module.exports={CONTROL,SITE,PREVIEW,CHANNEL,LIVE,TARGETS,DRIVERS,PROPOSAL_QA_ISOLATION,ADVISOR_QA_ISOLATION,PINNED_OWNER_PATHS,SIGNED_OBSERVABILITY_PROFILE,previewIdentity,validateBuildMarker,signedMatrixBinding,candidateForPhase,continuationForPreflight,validateArtifact,validatePreviewQa,validateProof,validateFocusedReports,signedObservabilityReports,focusedReportsFromDisk,envFor};
if(require.main===module)main().catch(error=>{console.error(String(error.message||error));process.exitCode=1;});
