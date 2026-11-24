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
// The historical 3-function contract stays sealed. The current Ops/Leads
// successor additionally deploys its own canonical Preview/LIVE callable.
const COMPOSITE_TARGETS = Object.freeze({
  preview: Object.freeze([...TARGETS.preview, {name:'orbit360OpsLeadsCommandPreview',region:'us-east1'}]),
  live: Object.freeze([...TARGETS.live, {name:'orbit360OpsLeadsCommand',region:'us-central1'}])
});
const makeScope=require('./gravicentra-i66-make-release-scope.cjs');
const MAKE_TARGETS=Object.freeze({preview:Object.freeze([...COMPOSITE_TARGETS.preview,makeScope.ADDED.preview]),
  live:Object.freeze([...COMPOSITE_TARGETS.live,makeScope.ADDED.live])});
const targetsForCandidate=(p,phase)=>makeScope.isMake(p)?MAKE_TARGETS[phase]:p&&p.opsLeadsComposite===true?COMPOSITE_TARGETS[phase]:TARGETS[phase];
const DRIVERS = Object.freeze([
  'tools/gravicentra-i66-privileged-role-signed-ui-permissions-readonly.cjs',
  'tools/gravicentra-i6-6-carlos-real-signed-synthetic-preview-uat.cjs',
  'tools/gravicentra-i6-6-advisor-payables-signed-uat.cjs',
  'tools/gravicentra-i6-6-proposal-application-signed-uat.cjs'
]);
const DIRECT_FORMS_DRIVER='tools/gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs';
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
  'artifacts/orbit360-recovery/release-control/I6_6_EFFECTIVE_CANCELLATION_DIRECT_OR_OPS_CAUSAL_SOURCE_20261124.json',
  'tools/gravicentra-i6-6-effective-cancellation-direct-form.test.cjs',
  'artifacts/orbit360-recovery/release-control/I6_6_R51_DOCUMENTARY_PAYMENT_FINANCIAL_RECOVERY_SOURCE_20261124.json',
  'tools/gravicentra-i6-6-frontend-preview-authority.cjs',
  'tools/gravicentra-i6-6-composite-preview-admission.test.cjs',
  'tools/gravicentra-i6-6-proposal-application-signed-uat.test.cjs',
  'functions','orbit360-platform','firebase.json','firestore.rules','storage.rules',
  ...DRIVERS,DIRECT_FORMS_DRIVER,'tools/gravicentra-i6-6-direct-forms-signed-driver.test.cjs',
  'tools/gravicentra-i6-6-carlos-paula-live-synthetic-ops-leads-uat.cjs',
  'tools/gravicentra-i6-6-startup-readiness-diagnostics.cjs',
  'tools/gravicentra-i6-6-startup-readiness-diagnostics.test.cjs',
  'tools/gravicentra-i6-6-advisor-startup-diagnostics.test.cjs',
  'tools/gravicentra-i6-6-direction-preview-legal-acceptance.cjs',
  'tools/gravicentra-i6-6-direction-preview-i66-consent-scope.test.cjs',
  'tools/gravicentra-i6-6-direction-live-legal-acceptance.test.cjs',
  'artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_LIVE_V2_SCOPE_PROPOSAL_20261117.json',
  'artifacts/orbit360-recovery/release-control/I6_6_DIRECTION_PREVIEW_V2_SCOPE_AUTHORIZATION_20261116.json',
  'tools/gravicentra-i6-6-preview-channel-reuse-guard.cjs',
  'tools/gravicentra-i6-6-technical-preview-rollover.test.cjs',
  'artifacts/orbit360-recovery/release-control/I6_6_CURRENT_TECHNICAL_PREVIEW_ROLLOVER_20261116.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_ROLLOVER_CAUSAL_RETRY_20261116.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_OBSERVABILITY_REBUILD_20261116.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_DIAGNOSTIC_RETENTION_REBUILD_20261117.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_HYDRATION_AND_BALANCE_REBUILD_20261117.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_DOCUMENTED_SOURCE_AND_TRANSPORT_REBUILD_20261117.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_SOURCE_INTAKE_PRECISION_REBUILD_20261117.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_SOURCE_INTAKE_RELOAD_REBUILD_20261117.json',
  'artifacts/orbit360-recovery/release-control/I6_6_TECHNICAL_PREVIEW_NETWORK_DIAGNOSTIC_REBUILD_20261117.json',
  'artifacts/orbit360-recovery/release-control/I6_6_CURRENT_PHYSICAL_PREVIEW_V24_ROLLOVER_20261124.json',
  'artifacts/orbit360-recovery/release-control/I6_6_CURRENT_PHYSICAL_PREVIEW_V24_ROLLOVER_V2_20261124.json',
  'artifacts/orbit360-recovery/release-control/I6_6_CURRENT_PHYSICAL_PREVIEW_V27_RESIDUAL_ROLLOVER_V3_20261124.json',
  'artifacts/orbit360-recovery/release-control/I6_6_CURRENT_PHYSICAL_PREVIEW_V28_ROLLOVER_V4_20261124.json',
  'artifacts/orbit360-recovery/release-control/I6_6_MAKE_PREVIEW_TRAFFIC_ROLLBACK_CAUSAL_CORRECTION_20261124.json',
  'artifacts/orbit360-recovery/release-control/I6_6_V28_IMMUTABLE_BUILD_RECEIPT_20261124.json',
  'artifacts/orbit360-recovery/release-control/I6_6_V27_UNACCEPTED_PREVIEW_BACKUP_ONLY_20261124.json',
  'tools/gravicentra-i6-6-source-intake-readiness.test.cjs',
  'artifacts/orbit360-recovery/release-control/I6_6_DAILY_PLAN_FREEZE_AND_SOURCE_INTAKE_RELOAD_20261117.json',
  'tools/gravicentra-i6-6-operational-live-acceptance.test.cjs',
  'tools/gravicentra-governance-preflight-v1.mjs',
  'artifacts/orbit360-recovery/release-control/I6_6_SOURCE_INTAKE_V2_PRECISION_CAUSAL_SOURCE_QA_20261117.json',
  'tools/gravicentra-i6-6-policy-preview-money-precision.test.cjs',
  'tools/gravicentra-i6-6-source-intake-v2.test.cjs',
  'tools/gravicentra-i6-6-source-intake-ui.test.cjs',
  'tools/gravicentra-i6-6-source-intake-preview-transport.test.cjs',
  'tools/gravicentra-i6-6-live-proof-artifact-layout.test.cjs',
  'tools/gravicentra-i6-6-documented-premium-terms.test.cjs',
  'tools/gravicentra-i6-6-r51-payment-application-preservation.test.cjs',
  'tools/gravicentra-i6-6-r51-documentary-variance.test.cjs',
  'tools/gravicentra-i6-6-documentary-payment-ui.test.cjs',
  'tools/gravicentra-i6-6-cobros-payment-failure-category.test.cjs',
  'tools/gravicentra-i6-6-documented-terms-signed-check.cjs',
  'tools/gravicentra-i6-6-documented-terms-signed-check.test.cjs',
  'tools/gravicentra-i6-6-cobros-visible-snapshot-performance.test.cjs',
  'tools/gravicentra-i66-live-performance-readonly.mjs',
  '.github/workflows/gravicentra-i66-preview-performance-readonly.yml',
  '.github/workflows/gravicentra-i66-live-performance-readonly.yml',
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
  'tools/gravicentra-i66-make-release-scope.cjs',
  'tools/gravicentra-i66-make-release-scope.test.cjs',
  'tools/gravicentra-i66-make-lead-ingress-config.cjs',
  'tools/gravicentra-i66-make-lead-ingress-scenario.cjs',
  'tools/gravicentra-i66-make-lead-ingress-scenario.test.cjs',
  'tools/gravicentra-i66-make-lead-runtime-access.cjs',
  'tools/gravicentra-i66-make-lead-runtime-access.test.cjs',
  'tools/gravicentra-i66-greenapi-existing-config-readonly.cjs',
  'tools/gravicentra-i66-greenapi-provider-readiness.test.cjs',
  'tools/gravicentra-i66-make-lead-protected-executor.cjs',
  'tools/gravicentra-i66-make-lead-protected-executor.test.cjs',
  'tools/gravicentra-i66-make-firebase-project-iam-guard.cjs',
  'tools/gravicentra-i66-make-lead-ingress.test.cjs',
  'tools/gravicentra-i6-6-make-lead-ingress-release.test.cjs',
  makeScope.CONTRACT_PATH,makeScope.COMMUNICATION_DECISION_PATH,makeScope.RUNTIME_RECEIPT_PATH,makeScope.META_RECEIPT_PATH,makeScope.BALANCE_RECEIPT_PATH,
  'tools/gravicentra-i6-6-financial-page-read-efficiency.test.cjs',
  'tools/gravicentra-i6-6-delta-guard.mjs',
  'tools/gravicentra-i6-6-delta-test-revisions.cjs',
  'tools/gravicentra-i6-6-source-lineage-preview-transport.test.cjs',
  'tools/gravicentra-i6-6-frontend-preview-authority.cjs',
  'tools/gravicentra-i6-6-composite-preview-admission.test.cjs',
  'tools/gravicentra-i6-6-preview-package-readback.cjs',
  'tools/gravicentra-i6-6-preview-package-readback.test.cjs',
  'tools/gravicentra-i6-6-workflow-candidate-resolution.test.cjs',
  'tools/gravicentra-i6-6-readonly-observer-authority.test.cjs',
  'tools/gravicentra-i6-6-five-role-assigned-selection.test.cjs',
  'tools/gravicentra-i6-6-performance-first-route-source-timeline.test.cjs',
  'tools/gravicentra-i6-6-six-existing-receipts-ui-readonly.test.cjs',
  'tools/gravicentra-i6-6-current-live-five-role-route-readonly.cjs',
  '.github/workflows/gravicentra-i66-current-exact-preview-cross-module-uat-20261119.yml',
  'tools/gravicentra-i66-frontend-control.cjs',
  'tools/gravicentra-i66-frontend-hosting-io.cjs',
  'tools/gravicentra-i66-frontend-control.test.cjs',
  'tools/gravicentra-i66-frontend-promotion-owner.cjs',
  'tools/gravicentra-i66-frontend-promotion-transaction.cjs',
  'tools/gravicentra-i66-frontend-promotion-transaction.test.cjs',
  'tools/gravicentra-i66-composite-acceptance.test.cjs',
  '.github/workflows/gravicentra-i66-privileged-role-parity-source-qa.yml',
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
  if(p.financialRecoveryQa!==undefined)
    require('./gravicentra-i6-6-proposal-application-signed-uat.cjs').validateDocumentaryPaymentQaBinding(p.financialRecoveryQa);
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
    // The LIVE workflow rechecks its approved Preview before touching LIVE.
    // Validate the complete canonical authorization independently of which of
    // those two exact origins this read-only invocation observes.
    const authorizationPhase=control?.status==='OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED'?'live':
      control?.status==='OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED'||
      (control?.status==='OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED'&&
       ['APPROVED_FOUR_FUNCTION_PREVIEW_SYNTHETIC_ONLY',makeScope.PREVIEW_STATUS].includes(control?.scopedBackendPreviewI66?.status))
        ?'preview':null;
    assert.ok(authorizationPhase,'I66_SIGNED_MATRIX_CONTROL_PHASE_UNAUTHORIZED');
    const p=candidateForPhase(control,authorizationPhase),phase=origin===LIVE?'live':'preview';
    if(phase==='live')assert.equal(authorizationPhase,'live','I66_SIGNED_MATRIX_LIVE_ORIGIN_NOT_AUTHORIZED');
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
  // Preview-only exception inside the existing I6.6 gate. The canonical
  // production lock remains immutable while the scoped four-function QA
  // validates this one exact signed, synthetic-only artifact. The temporary
  // effective view never writes or replaces the physical control plane.
  const scoped=control.scopedBackendPreviewI66;
  if(scoped){
    assert.equal(phase,'preview','I66_SCOPED_AUTHORIZATION_CANNOT_DEPLOY_LIVE');
    assert.equal(control.status,'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED','I66_SCOPED_CANONICAL_PRODUCTION_LOCK_DRIFT');
    for(const [key,value] of Object.entries({
      forbidBackendFunctionDeploy:true,backendFunctionPreviewOnly:false,
      forbidBackendLiveFunctionDeploy:true,forbidFirestoreRulesDataAuthWrites:true,
      livePromotionAuthorized:false,previewApproved:false,noHostingPromotion:true
    }))assert.equal(control[key],value,'I66_SCOPED_LOCK_'+key);
    assert.equal(control.operationalReleaseCandidate,undefined,'I66_SCOPED_MUST_NOT_REOPEN_OLD_RELEASE');
    assert.equal(scoped.schema,'GI_I66_SCOPED_BACKEND_PREVIEW_AUTHORIZATION_V1');
    const makeIngress=makeScope.isMake(scoped.candidate);
    assert.equal(scoped.status,makeIngress?makeScope.PREVIEW_STATUS:'APPROVED_FOUR_FUNCTION_PREVIEW_SYNTHETIC_ONLY');
    assert.equal(scoped.approvedByDirection,true);
    assert.equal(scoped.noLiveOrFinancialWrites,true);
    assert.equal(scoped.noRulesAuthIamWrites,!makeIngress);
    if(makeIngress){assert.equal(scoped.noRulesAuthMembershipWrites,true);assert.equal(scoped.onlyExactSecretIamDeltaAllowed,true);}
    assert.equal(scoped.sameImmutableArtifactOnly,true);
    assert.equal(scoped.currentPhysicalLiveSourceSha,control.currentPhysicalHostingRelease?.sourceSha);
    assert.equal(scoped.currentPhysicalLiveArtifactDigest,control.currentPhysicalHostingRelease?.artifactDigest);
    assert.equal(scoped.candidate?.sourceSha,scoped.sourceSha);
    assert.equal(scoped.candidate?.artifactDigest,scoped.artifactDigest);
    assert.equal(scoped.candidate?.opsLeadsComposite,true);
    control={...control,status:'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED',
      forbidBackendFunctionDeploy:false,backendFunctionPreviewOnly:true,
      forbidBackendLiveFunctionDeploy:true,livePromotionAuthorized:false,
      previewApproved:false,noHostingPromotion:true,operationalReleaseCandidate:scoped.candidate};
  }
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
  if(p.financialRecoveryQa!==undefined)
    require('./gravicentra-i6-6-proposal-application-signed-uat.cjs').validateDocumentaryPaymentQaBinding(p.financialRecoveryQa);
  if(control.frontendPreviewRequest?.financialRecovery!==undefined){
    require('./gravicentra-i6-6-proposal-application-signed-uat.cjs').validateDocumentaryPaymentQaBinding(control.frontendPreviewRequest.financialRecoveryQa);
    assert.deepEqual(p.financialRecoveryQa,control.frontendPreviewRequest.financialRecoveryQa,'I66_FINANCIAL_REQUIRED_UI_QA_REMOVED');
  }
  if(control.frontendPreviewRequest?.cancellationRecovery!==undefined){
    assert.equal(p.cancellationQa,true,'I66_CANCELLATION_REQUIRED_UI_QA_REMOVED');
    assert.deepEqual(p.cancellationRecoveryQa,control.frontendPreviewRequest.cancellationRecoveryQa,'I66_CANCELLATION_QA_BINDING_DRIFT');
  }
  if(p.cancellationQa!==undefined){
    assert.equal(p.cancellationQa,true,'I66_CANCELLATION_QA_PROFILE_INVALID');
    assert.equal(p.directFormsQa,true,'I66_CANCELLATION_DIRECT_FORMS_QA_REQUIRED');
    const authority=require('./gravicentra-i6-6-frontend-preview-authority.cjs');
    assert.deepEqual(Object.keys(p.cancellationRecoveryQa||{}).sort(),['profile','receiptBlob','receiptPath'],'I66_CANCELLATION_EXACT_QA_BINDING_REQUIRED');
    assert.equal(p.cancellationRecoveryQa.profile,authority.CANCELLATION_QA_PROFILE,'I66_CANCELLATION_QA_PROFILE_DRIFT');
    assert.equal(p.cancellationRecoveryQa.receiptPath,authority.CANCELLATION_RECEIPT_PATH,'I66_CANCELLATION_QA_RECEIPT_DRIFT');
    checkSha(p.cancellationRecoveryQa.receiptBlob,'I66_CANCELLATION_QA_RECEIPT_BLOB');
  }else assert.equal(p.cancellationRecoveryQa,undefined,'I66_CANCELLATION_QA_FLAG_REQUIRED');
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
  const composite=p.opsLeadsComposite===true,makeIngress=makeScope.isMake(p);
  assert.deepEqual(p.targets,makeIngress?MAKE_TARGETS:composite?COMPOSITE_TARGETS:TARGETS,'I66_OPERATIONAL_TARGET_SCOPE_DRIFT');
  if(makeIngress)makeScope.validateCandidate(p,phase);
  if(composite&&!makeIngress){
    assert.equal(p.compositeVersion,1,'I66_OPS_COMPOSITE_VERSION');
    assert.equal(p.opsLeadsBackendPath,'functions/product-ops-leads-domain.js','I66_OPS_BACKEND_OWNER');
    assert.equal(p.opsLeadsBackendBlobSha,'b7921ca88343ced65bdad4cd9de26fa120647083','I66_OPS_BACKEND_BLOB');
    assert.equal(p.rollbackFourBackendRevisionsAndHosting,true,'I66_OPS_FOUR_FUNCTION_ROLLBACK');
    assert.equal(p.currentPhysicalLive?.sourceSha,control.currentPhysicalHostingRelease?.sourceSha,'I66_OPS_PHYSICAL_LIVE_SOURCE_DRIFT');
    assert.equal(p.currentPhysicalLive?.artifactDigest,control.currentPhysicalHostingRelease?.artifactDigest,'I66_OPS_PHYSICAL_LIVE_ARTIFACT_DRIFT');
    assert.notEqual(p.sourceSha,p.currentPhysicalLive.sourceSha,'I66_OPS_ALREADY_LIVE');
  }
  if(makeIngress){
    assert.equal(p.currentPhysicalLive?.sourceSha,control.currentPhysicalHostingRelease?.sourceSha,'I66_MAKE_PHYSICAL_LIVE_SOURCE_DRIFT');
    assert.equal(p.currentPhysicalLive?.artifactDigest,control.currentPhysicalHostingRelease?.artifactDigest,'I66_MAKE_PHYSICAL_LIVE_ARTIFACT_DRIFT');
    assert.notEqual(p.sourceSha,p.currentPhysicalLive.sourceSha,'I66_MAKE_ALREADY_LIVE');
  }
  assert.deepEqual(p.requiredPreviewDrivers,DRIVERS,'I66_OPERATIONAL_QA_DRIVER_SCOPE_DRIFT');
  if(p.directFormsQa!==undefined)assert.equal(p.directFormsQa,true,'I66_DIRECT_FORMS_QA_PROFILE_INVALID');
  assert.equal(p.sameImmutableArtifactOnly,true);
  assert.equal(p.syntheticRecordsOnly,true);
  assert.equal(p.noRealFinancialOrCustomerWrites,true);
  assert.equal(p.noRulesAuthIamWrites,!makeIngress);
  assert.equal(p.rollbackThreeBackendRevisionsAndHosting,true);
  assert.equal(p.expectedSiteFileCount,p.opsLeadsComposite===true?224:223,'I66_OPERATIONAL_SITE_FILE_COUNT_PIN');
  // Existing staff/tenant only, with an isolated synthetic namespace. No new
  // membership, IAM, rules or mutation of the operational control/active pointer.
  assert.deepEqual(p.syntheticQaIsolation,PROPOSAL_QA_ISOLATION,'I66_OPERATIONAL_QA_NAMESPACE_ISOLATION_DRIFT');
  assert.deepEqual(p.advisorPayableQaIsolation,ADVISOR_QA_ISOLATION,'I66_OPERATIONAL_ADVISOR_QA_NAMESPACE_ISOLATION_DRIFT');
  const current=(p.opsLeadsComposite===true?control.currentPhysicalHostingRelease:control.currentExactHostingRelease)||{},backup=p.currentLive||{};
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
  assert.deepEqual(proof.targets,targetsForCandidate(p,'preview'));assert.deepEqual(proof.signedDrivers,DRIVERS);
  assert.equal(proof.realFinancialOrCustomerWrites,0);assert.equal(proof.syntheticRestoreComplete,true);
  assert.equal(proof.liveHostingUnchanged,true);assert.equal(proof.liveBackendUnchanged,true);
  if(makeScope.isMake(p))makeScope.validatePreviewProof(p,proof.makeIngress);
  if(p.financialRecoveryQa!==undefined)validateFinancialRecoverySummary(p,'PREVIEW',proof.focusedReports?.proposalApplication?.documentaryPayments);
  assert.deepEqual(Object.keys(proof.focusedReports||{}).sort(),p.directFormsQa===true?['advisorPayables','directForms','proposalApplication']:['advisorPayables','proposalApplication']);
  for(const report of Object.values(proof.focusedReports)){
    assert.equal(report.status,'PASS');assert.equal(report.cleanup,'PASS');
    assert.ok(Number.isSafeInteger(report.checks)&&report.checks>0);
    checkDigest(report.digest,'I66_OPERATIONAL_FOCUSED_REPORT_DIGEST_REQUIRED');
  }
  if(p.directFormsQa===true){
    assert.equal(proof.focusedReports.directForms.phase,'PREVIEW');
    assert.equal(proof.focusedReports.directForms.coverage,p.cancellationQa===true?'SIGNED_PUBLIC_ENTRIES_AND_CANCELLATION_READONLY':'SIGNED_PUBLIC_ENTRIES_READONLY');
    if(p.cancellationQa===true)assert.equal(proof.focusedReports.directForms.checks,63,'I66_CANCELLATION_PREVIEW_CHECKS_REQUIRED');
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
function validateFinancialRecoverySummary(p,phase,summary){
  const owner=require('./gravicentra-i6-6-proposal-application-signed-uat.cjs');owner.validateDocumentaryPaymentQaBinding(p.financialRecoveryQa);
  assert.deepEqual(Object.keys(summary||{}).sort(),['profile','status','phase','sourceSha','buildId','receiptBlob','sources','cases','syntheticPayments','replayAdditionalPayments','realFinancialWrites','remaining','proofDigest'].sort(),'I66_FINANCIAL_UI_SUMMARY_REQUIRED');
  assert.deepEqual(Object.fromEntries(Object.entries(summary).filter(([k])=>k!=='proofDigest')),
    {profile:owner.DOCUMENTARY_PAYMENT_QA_PROFILE,status:'PASS',phase,sourceSha:p.sourceSha,buildId:p.buildId,receiptBlob:p.financialRecoveryQa.receiptBlob,
      sources:[...owner.DOCUMENTARY_PAYMENT_SOURCES],cases:2,syntheticPayments:2,replayAdditionalPayments:0,realFinancialWrites:0,remaining:0},'I66_FINANCIAL_UI_SUMMARY_DRIFT');
  checkDigest(summary.proofDigest,'I66_FINANCIAL_UI_PROOF_DIGEST_REQUIRED');return summary;
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
  if(p.financialRecoveryQa!==undefined)
    require('./gravicentra-i6-6-proposal-application-signed-uat.cjs').validateDocumentaryPaymentUiEvidence(proposal.documentaryPayments,
      {phase,sourceSha:p.sourceSha,buildId:p.buildId,binding:p.financialRecoveryQa});
  signedObservabilityReports(p,advisor,proposal);
  if(phase==='LIVE'){
    const {validateLiveAcceptanceProof}=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
    for(const report of [advisor,proposal])validateLiveAcceptanceProof(report.directionLiveLegalAcceptance,p);
    for(const key of ['actorUidSha256','scopeSha256','receiptSha256'])assert.equal(advisor.directionLiveLegalAcceptance[key],proposal.directionLiveLegalAcceptance[key],'I66_OPERATIONAL_LIVE_LEGAL_SIGNED_ACTOR_SCOPE_DRIFT');
  }
  if(phase==='PREVIEW'&&p.legalAcceptance){
    const {validateAcceptanceProof}=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
    for(const report of [advisor,proposal])validateAcceptanceProof(report.directionLegalAcceptance,p);
    for(const key of ['actorUidSha256','scopeSha256'])assert.equal(advisor.directionLegalAcceptance[key],proposal.directionLegalAcceptance[key],'I66_OPERATIONAL_LEGAL_SIGNED_ACTOR_SCOPE_DRIFT');
  }
}
function assertDirectFormsPersonalAuthority(p,phase,readCurrent){
  assert.ok(['PREVIEW','LIVE'].includes(phase));
  if(p.directFormsQa!==true)return null;
  const driver=require('./gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs');
  const read=readCurrent||driver.readCurrentPersonalLegalAuthority;
  return read({cfg:{phase,source:p.sourceSha,origin:phase==='LIVE'?LIVE:p.previewUrl},candidate:p});
}
function focusedReportsFromDisk(p,phase,env=process.env){
  const personalAuthority=assertDirectFormsPersonalAuthority(p,phase);
  assert.ok(['PREVIEW','LIVE'].includes(phase));
  const paths={advisorPayables:env.I66_ADVISOR_PAYABLE_UAT_REPORT||path.join(env.RUNNER_TEMP,'gravicentra-i66-advisor-payables-signed-uat-'+phase.toLowerCase()+'.json'),
    proposalApplication:path.join(env.I66_PACKAGE_ROOT,'evidence','i66-proposal-application-signed-uat-'+phase.toLowerCase()+'.json')};
  const bytes=Object.fromEntries(Object.entries(paths).map(([k,file])=>[k,fs.readFileSync(file)]));
  const reports=Object.fromEntries(Object.entries(bytes).map(([k,b])=>[k,JSON.parse(b)]));
  validateFocusedReports(p,phase,reports.advisorPayables,reports.proposalApplication);
  const observability=signedObservabilityReports(p,reports.advisorPayables,reports.proposalApplication);
  const focused=Object.fromEntries(Object.entries(reports).map(([key,r])=>[key,{status:r.status,cleanup:r.cleanup.status,checks:r.checks.length,digest:'sha256:'+crypto.createHash('sha256').update(bytes[key]).digest('hex'),...(observability?{observability:observability[key]}:{})}]));
  if(p.financialRecoveryQa!==undefined)focused.proposalApplication.documentaryPayments=
    require('./gravicentra-i6-6-proposal-application-signed-uat.cjs').validateDocumentaryPaymentUiEvidence(reports.proposalApplication.documentaryPayments,
      {phase,sourceSha:p.sourceSha,buildId:p.buildId,binding:p.financialRecoveryQa});
  if(p.directFormsQa===true){
    const raw=fs.readFileSync(path.join(env.RUNNER_TEMP,'gi-i66-direct-forms-'+phase.toLowerCase()+'.json'));
    const direct=JSON.parse(raw);
    const verified=require('./gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs').validateSignedReport(direct,{phase,sourceSha:p.sourceSha,buildId:p.buildId,personalAuthority,cancellationQa:p.cancellationQa===true});
    focused.directForms={status:'PASS',cleanup:'PASS',checks:verified.checks,
      digest:'sha256:'+crypto.createHash('sha256').update(raw).digest('hex'),phase,
      coverage:p.cancellationQa===true?'SIGNED_'+verified.coverage:phase==='PREVIEW'?'SIGNED_PUBLIC_ENTRIES_READONLY':'SIGNED_NORMAL_UI_SAVE_READBACK_RELOAD_REPLAY_RESTORE'};
  }
  return focused;
}
function verifyPinnedOwners(p) {
  if(p.cancellationQa===true){
    const binding=p.cancellationRecoveryQa;
    for(const ref of [p.sourceSha,'HEAD'])assert.equal(execFileSync('git',['rev-parse',ref+':'+binding.receiptPath],{encoding:'utf8'}).trim(),binding.receiptBlob,'I66_CANCELLATION_CAUSAL_RECEIPT_SOURCE_DRIFT');
  }
  if(p.financialRecoveryQa!==undefined){
    const binding=require('./gravicentra-i6-6-proposal-application-signed-uat.cjs').validateDocumentaryPaymentQaBinding(p.financialRecoveryQa);
    for(const ref of [p.sourceSha,'HEAD'])assert.equal(execFileSync('git',['rev-parse',ref+':'+binding.receiptPath],{encoding:'utf8'}).trim(),binding.receiptBlob,'I66_FINANCIAL_CAUSAL_RECEIPT_SOURCE_DRIFT');
  }
  if(makeScope.isMake(p))makeScope.verifySourcePins(p);
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
  I66_DIRECT_FORMS_QA:String(p.directFormsQa===true),I66_CANCELLATION_QA:p.cancellationQa===true?'1':'0',I66_LIVE_ORIGIN:LIVE,
  I66_MAKE_INGRESS:String(makeScope.isMake(p)),I66_MAKE_TRIGGER_PREVIOUS_STATE:makeScope.isMake(p)?p.makeIngress.targetBefore.live.state:'',
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
  const p=candidateForPhase(control,phase);
  assertDirectFormsPersonalAuthority(p,phase.toUpperCase()); // Before any backend/Make deployment.
  verifyPinnedOwners(p);
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
// A completed operational successor is accepted only through durable evidence.
// This reads evidence and checks concordance; it grants no deployment or writes.
const ACCEPTANCE_KEY='i66OperationalExactLiveAcceptance20261117';
const ACCEPTANCE_RECEIPT='artifacts/orbit360-recovery/release-control/I6_6_OPERATIONAL_EXACT_LIVE_ACCEPTANCE_20261117.json';
const ACCEPTANCE_PROOF='artifacts/orbit360-recovery/release-control/I6_6_OPERATIONAL_EXACT_LIVE_PROOF_20261117.json';
const R11_RECEIPT='artifacts/orbit360-recovery/release-control/I6_6_R11_RENEWAL_DRIVE_EXACT_LIVE_RECEIPT_20261113.json';
const R11_RECEIPT_SHA256='d92c3e24dbbc4a8636fa8293e4615ad9e1646fe4af29e5718c5f85cda4115d85';
const LIVE_WORKFLOW='.github/workflows/gravicentra-i66-privileged-role-exact-live-promotion.yml';
const LIVE_SIGNED_STATUS='SAME_ARTIFACT_THREE_FUNCTIONS_SIGNED_LIVE_READBACK_RELOAD_RESTORE_PASS';
const ACCEPTED_STATUS='CURRENT_OPERATIONAL_EXACT_SIGNED_LIVE_PASS_FULL_I66_HOLD';
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
function validateLiveProof(p,proof){
  assert.equal(proof.schema,'I66_FIVE_PRIVILEGED_ROLES_IMMUTABLE_LIVE_TRANSPORT_V1');
  assert.equal(proof.status,makeScope.isMake(p)?makeScope.LIVE_STATUS:p.opsLeadsComposite===true?'SAME_ARTIFACT_FOUR_FUNCTIONS_SIGNED_LIVE_READBACK_RELOAD_RESTORE_PASS':LIVE_SIGNED_STATUS,'I66_OPERATIONAL_LIVE_NOT_ACCEPTED');
  for(const key of ['sourceSha','buildId','buildRunId','artifactId','artifactDigest'])assert.equal(proof[key],p[key],'I66_OPERATIONAL_LIVE_IDENTITY_'+key);
  checkBuildId(proof.buildId,p.sourceSha,'I66_OPERATIONAL_LIVE_BUILD_ID');
  checkId(proof.runId,'I66_OPERATIONAL_LIVE_RUN_ID');checkSha(proof.headSha,'I66_OPERATIONAL_LIVE_RUN_HEAD');
  assert.equal(proof.previewChannel,p.previewChannelId);
  assert.deepEqual(proof.previewQa,p.previewQa,'I66_OPERATIONAL_LIVE_PREVIEW_PROOF_IDENTITY');
  assert.deepEqual(proof.previousLive,p.currentLive,'I66_OPERATIONAL_LIVE_ROLLBACK_IDENTITY');
  assert.equal(proof.previousHostingVersion,p.currentLive.hostingVersion);
  assert.match(String(proof.liveHostingVersion||''),/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/);
  assert.equal(proof.liveHostingVersion,proof.previewHostingVersion);
  assert.notEqual(proof.liveHostingVersion,proof.previousHostingVersion);
  for(const key of ['previewFiles','liveSiteFiles','customSiteFiles'])assert.equal(proof[key],p.expectedSiteFileCount,'I66_OPERATIONAL_LIVE_READBACK_'+key);
  assert.deepEqual(proof.targets,targetsForCandidate(p,'live'),'I66_OPERATIONAL_LIVE_TARGETS');
  assert.deepEqual(proof.signedDrivers,['privileged-role-permissions','carlos-paula-ops-leads','advisor-payables','proposal-application']);
  for(const key of ['syntheticRestoreComplete','sameImmutableArtifact','liveBackendSameArtifact','functionsInventoryUnchangedExceptTargets','rollbackSnapshotReady'])assert.equal(proof[key],true,'I66_OPERATIONAL_LIVE_REQUIRED_'+key);
  for(const key of ['realCustomerWrites','realFinancialOrCustomerWrites','firestoreRuleOrAuthWrites'])assert.equal(proof[key],0,'I66_OPERATIONAL_LIVE_FORBIDDEN_'+key);
  assert.equal(proof.fullI66ProductionAccepted,false,'I66_OPERATIONAL_LIVE_SCOPE_OVERCLAIM');
  assert.equal(proof.rollback,'OUTER_FUNCTION_ROLLBACK_GUARD_ACTIVE');
  assert.ok(Array.isArray(proof.backendRevisions));assert.equal(proof.backendRevisions.length,targetsForCandidate(p,'live').length);
  assert.deepEqual(proof.backendRevisions.map(({name,region})=>({name,region})),targetsForCandidate(p,'live'));
  for(const row of proof.backendRevisions){
    assert.match(row.service,/^[a-z][a-z0-9-]+$/);
    const created=makeScope.isMake(p)&&row.name===makeScope.ADDED.live.name&&p.makeIngress.targetBefore.live.state==='ABSENT';
    for(const key of created?['currentRevision']:['previousRevision','currentRevision'])assert.ok(typeof row[key]==='string'&&row[key].startsWith(row.service+'-'),'I66_OPERATIONAL_LIVE_REVISION_MISSING');
    if(created)assert.equal(row.previousRevision,null,'I66_MAKE_ABSENT_PREVIOUS_REVISION_FORBIDDEN');
    assert.notEqual(row.previousRevision,row.currentRevision);assert.equal(row.trafficPercent,100);assert.equal(row.ready,true);
  }
  if(makeScope.isMake(p))makeScope.validateLiveProof(p,proof);
  const focus=proof.focusedReports||{};
  assert.deepEqual(Object.keys(focus).sort(),p.directFormsQa===true?['advisorPayables','directForms','proposalApplication']:['advisorPayables','proposalApplication']);
  for(const report of Object.values(focus)){
    assert.equal(report.status,'PASS');assert.equal(report.cleanup,'PASS');
    assert.ok(Number.isSafeInteger(report.checks)&&report.checks>0);checkDigest(report.digest,'I66_OPERATIONAL_LIVE_FOCUSED_DIGEST');
  }
  if(p.directFormsQa===true){
    assert.equal(focus.directForms.phase,'LIVE');
    assert.equal(focus.directForms.coverage,p.cancellationQa===true?'SIGNED_NORMAL_UI_RENEWAL_ENDORSEMENT_CANCELLATION_READBACK_RELOAD_REPLAY':'SIGNED_NORMAL_UI_SAVE_READBACK_RELOAD_REPLAY_RESTORE');
    if(p.cancellationQa===true)assert.equal(focus.directForms.checks,113,'I66_CANCELLATION_LIVE_CHECKS_REQUIRED');
  }
  if(p.financialRecoveryQa!==undefined)validateFinancialRecoverySummary(p,'LIVE',focus.proposalApplication?.documentaryPayments);
  assert.equal(p.signedObservabilityProfile,SIGNED_OBSERVABILITY_PROFILE);
  assert.deepEqual(focus.advisorPayables.observability,{profile:SIGNED_OBSERVABILITY_PROFILE,status:'PASS',unexpectedConsoleErrors:0,unexpectedHttpErrors:0,pageErrorCount:0,telemetryFailures:0});
  assert.equal(focus.proposalApplication.observability?.profile,SIGNED_OBSERVABILITY_PROFILE);
  assert.equal(focus.proposalApplication.observability.status,'PASS');
  assert.ok(['UI_RESPONSE_CAPTURED_EXACT','UI_REQUEST_RELOAD_DURABLE_READBACK_EXACT'].includes(focus.proposalApplication.observability.mode));
  const intake=proof.sourceIntake||{};
  assert.equal(intake.status,'PASS');assert.equal(intake.stage,'SOURCE_INTAKE_COMPLETE');
  for(const key of ['syntheticOnly','sourceFileHashVerified','sourceMetadataDigestVerified','normalUiRequest','normalUiResponseConfirmed','readbackAfterReload','signedActorPreserved','realLedgerPointerUnchanged','countsExact','qaAuthorityExact','normalUiIdempotentReplay'])assert.equal(intake[key],true,'I66_OPERATIONAL_LIVE_INTAKE_'+key);
  for(const key of ['financialWrites','holds','replayIntakeWrites','consoleErrors','pageErrors','httpErrors'])assert.equal(intake[key],0,'I66_OPERATIONAL_LIVE_INTAKE_'+key);
  assert.equal(intake.sourceRows,1);assert.equal(intake.proposals,1);
  const legal=proof.directionLiveLegalAcceptance||{},owner=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
  assert.deepEqual(Object.keys(legal).sort(),['advisorPayables','proposalApplication'],'I66_OPERATIONAL_LIVE_LEGAL_PROOFS_REQUIRED');
  for(const entry of Object.values(legal))owner.validateLiveAcceptanceProof(entry,p);
  for(const key of ['actorUidSha256','scopeSha256','receiptSha256'])assert.equal(legal.advisorPayables[key],legal.proposalApplication[key],'I66_OPERATIONAL_LIVE_LEGAL_PROOFS_DIFFER');
  return proof;
}
function acceptedForPreflight(control,state,transport,latest,io=fs){
  if(control.i66FrontendReleaseHead || transport.frontendReleaseSequence || control.currentExecutionDecisionPointer==='i66FrontendReleaseHead'){
    const owner=require('./gravicentra-i66-frontend-control.cjs');
    const head=owner.physicalGuard(control,state,transport,io);
    const archive=io.readFileSync(owner.P.legacy,'utf8');
    assert.equal(owner.blob(archive),control.i66PreversionedControlViewBlob,'I66_LEGACY_CONTROL_SNAPSHOT_DRIFT');
    return {status:head.status,sourceSha:head.sourceSha,receipt:head.receiptPath};
  }
  // Replaying pre-versioned acceptance remains available on its own original controls.
  const summary=control[ACCEPTANCE_KEY];assert.ok(summary,'I66_OPERATIONAL_ACCEPTANCE_SUMMARY_MISSING');
  assert.equal(summary.status,ACCEPTED_STATUS);assert.equal(summary.receipt,ACCEPTANCE_RECEIPT);
  const text=io.readFileSync(ACCEPTANCE_RECEIPT,'utf8');
  assert.equal(sha256(text),summary.receiptSha256,'I66_OPERATIONAL_ACCEPTANCE_RECEIPT_DIGEST');
  const receipt=JSON.parse(text);
  assert.equal(receipt.schema,'GI_I66_OPERATIONAL_EXACT_LIVE_ACCEPTANCE_V1');
  assert.equal(receipt.status,'SIGNED_LIVE_ACCEPTED_FULL_I66_HOLD');
  assert.equal(receipt.gate,'I6.6');assert.equal(receipt.fullI66ProductionAccepted,false);assert.equal(receipt.realFinancialWrites,0);
  assert.equal(receipt.liveProof?.path,ACCEPTANCE_PROOF);
  const proofText=io.readFileSync(ACCEPTANCE_PROOF,'utf8');assert.equal(sha256(proofText),receipt.liveProof.sha256,'I66_OPERATIONAL_ACCEPTANCE_PROOF_DIGEST');
  const proof=JSON.parse(proofText),p=receipt.candidate;
  const r11Text=io.readFileSync(R11_RECEIPT,'utf8');assert.equal(sha256(r11Text),R11_RECEIPT_SHA256,'I66_OPERATIONAL_ACCEPTANCE_R11_HISTORY_DRIFT');
  const r11=JSON.parse(r11Text),previous=receipt.previousExactHostingRelease;
  for(const [key,value] of Object.entries({sourceSha:r11.sourceSha,buildId:r11.immutableBuildId,artifactId:r11.immutableArtifactId,artifactDigest:r11.immutableArtifactDigest,previewRunId:r11.immutableBuildRunId,liveCloneRunId:r11.liveSignedUatRunId,liveHostingVersion:r11.hostingVersion,receipt:R11_RECEIPT}))assert.equal(previous?.[key],value,'I66_OPERATIONAL_ACCEPTANCE_R11_BACKUP_'+key);
  assert.deepEqual(transport.previousExactHostingReleaseR11,previous,'I66_OPERATIONAL_ACCEPTANCE_PREVIOUS_TRANSPORT');
  assert.equal(control.i66R11RenewalDriveExactLiveRelease20261113?.status,'PREVIOUS_R11_RENEWAL_DRIVE_EXACT_LIVE_PRESERVED');
  for(const [key,value] of Object.entries({sourceSha:r11.sourceSha,artifactId:r11.immutableArtifactId,artifactDigest:r11.immutableArtifactDigest,hostingVersion:r11.hostingVersion,receipt:R11_RECEIPT}))assert.equal(control.i66R11RenewalDriveExactLiveRelease20261113[key],value,'I66_OPERATIONAL_ACCEPTANCE_R11_SUMMARY_'+key);
  const liveControl={gate:'I6.6',historicalClosedGate:'B4-007',status:'OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED',forbidBackendFunctionDeploy:false,forbidFirestoreRulesDataAuthWrites:true,backendFunctionPreviewOnly:false,forbidBackendLiveFunctionDeploy:false,livePromotionAuthorized:true,previewApproved:true,noHostingPromotion:false,currentExactHostingRelease:previous,operationalReleaseCandidate:p};
  candidateForPhase(liveControl,'live');
  require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs').readLiveScopeAuthorization(liveControl,p,io);
  validateArtifact(p,receipt.buildRun,receipt.buildArtifact);validatePreviewQa(p,receipt.previewRun,receipt.previewArtifact);
  validateProof(p,receipt.signedPreviewProof);validateLiveProof(p,proof);
  assert.equal(receipt.signedPreviewProof.runId,p.previewQa.runId);assert.equal(receipt.signedPreviewProof.headSha,p.previewQa.headSha);
  const runs=[['build',receipt.buildRun,BUILD_WORKFLOW,'immutable-package'],['preview',receipt.previewRun,PREVIEW_WORKFLOW,'exact-preview-only'],['live',receipt.liveRun,LIVE_WORKFLOW,'exact-role-live']];
  for(const [key,run,workflow,jobName] of runs){
    assert.equal(run?.status,'completed');assert.equal(run.conclusion,'success');assert.equal(run.path,workflow);assert.equal(run.head_branch,'recovery/fase-a-clean-20260831');
    checkSha(run.head_sha,'I66_OPERATIONAL_ACCEPTANCE_RUN_HEAD');
    const job=receipt.jobs?.[key];assert.equal(job?.name,jobName);checkId(job.id,'I66_OPERATIONAL_ACCEPTANCE_JOB_ID');
    assert.equal(job.run_id,run.id);assert.equal(job.status,'completed');assert.equal(job.conclusion,'success','I66_OPERATIONAL_ACCEPTANCE_SKIPPED_OR_FAILED_JOB');
  }
  assert.equal(receipt.liveRun.id,proof.runId);assert.equal(receipt.liveRun.head_sha,proof.headSha);
  const artifact=receipt.liveArtifact;checkId(artifact?.id,'I66_OPERATIONAL_ACCEPTANCE_LIVE_ARTIFACT');checkDigest(artifact.digest,'I66_OPERATIONAL_ACCEPTANCE_LIVE_ARTIFACT_DIGEST');
  assert.equal(artifact.expired,false);assert.equal(artifact.name,'gi-i66-role-exact-live-proof-'+proof.runId);
  assert.equal(artifact.workflow_run?.id,proof.runId);assert.equal(artifact.workflow_run?.head_sha,proof.headSha);
  const facts={sourceSha:p.sourceSha,buildId:p.buildId,buildRunId:p.buildRunId,artifactId:p.artifactId,artifactDigest:p.artifactDigest,liveRunId:proof.runId,liveEvidenceArtifactId:artifact.id,liveEvidenceArtifactDigest:artifact.digest,hostingVersion:proof.liveHostingVersion,receipt:ACCEPTANCE_RECEIPT};
  for(const [key,value] of Object.entries(facts)){
    assert.equal(summary[key],value,'I66_OPERATIONAL_ACCEPTANCE_CP_'+key);
    assert.equal(state.currentLiveSuccessorAcceptance?.[key],value,'I66_OPERATIONAL_ACCEPTANCE_STATE_'+key);
  }
  const currentPayment=control.i66LatestPhysicalFrontendLive20261120||null;
  const currentKey=currentPayment?'i66LatestPhysicalFrontendLive20261120':ACCEPTANCE_KEY;
  assert.equal(control.currentExecutionDecisionPointer,currentKey,'I66_CURRENT_PHYSICAL_LIVE_POINTER_DRIFT');
  assert.equal(state.currentExecutionDecisionPointer,'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json#'+currentKey,'I66_CURRENT_PHYSICAL_STATE_POINTER_DRIFT');
  const work=control.i66OperationalContinuation20261115;
  assert.equal(work?.activeGate,'I6.6');assert.equal(work.closedHistoricalGate,'B4-007');assert.equal(work.latestProvenLiveSource,currentPayment?.sourceSha||p.sourceSha,'I66_CURRENT_PHYSICAL_LIVE_WORK_SOURCE_DRIFT');assert.equal(work.newLiveAcceptanceClaimed,true);
  assert.equal(transport.status,'OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED');
  for(const [key,value] of Object.entries({livePromotionAuthorized:false,previewApproved:false,forbidBackendFunctionDeploy:true,backendFunctionPreviewOnly:false,forbidBackendLiveFunctionDeploy:true,noHostingPromotion:true,forbidFirestoreRulesDataAuthWrites:true}))assert.equal(transport[key],value,'I66_OPERATIONAL_ACCEPTANCE_LOCK_'+key);
  assert.equal(transport.operationalReleaseCandidate,undefined,'I66_OPERATIONAL_ACCEPTANCE_UNCONSUMED_AUTHORIZATION');
  const live=transport.currentExactHostingRelease;
  assert.equal(live?.status,'PUBLISHED_EXACT_OPERATIONAL_223_FILES_THREE_FUNCTIONS_SIGNED_LIVE_PARTIAL');
  for(const [key,target] of Object.entries({sourceSha:'sourceSha',buildId:'buildId',buildRunId:'previewRunId',artifactId:'artifactId',artifactDigest:'artifactDigest',liveRunId:'liveCloneRunId',hostingVersion:'liveHostingVersion',receipt:'receipt'}))assert.equal(live[target],facts[key],'I66_OPERATIONAL_ACCEPTANCE_TRANSPORT_'+key);
  assert.equal(live.readbackEachOrigin,223);
  // The old 17-Nov three-function LIVE acceptance remains independently sealed.
  // The 20-Nov Hosting-only successor is separately pinned to physical bytes,
  // current LIVE marker UAT and transport, never flattened into that older proof.
  if(currentPayment){
    const path='artifacts/orbit360-recovery/release-control/I6_6_DIRECT_PAYMENT_OPTIONAL_DOCUMENT_LIVE_READBACK_20261120.json';
    const raw=io.readFileSync(path,'utf8');
    const blob=crypto.createHash('sha1').update('blob '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex');
    assert.equal(currentPayment.receiptPath,path,'I66_PAYMENT_FRONTEND_RECEIPT_PATH');
    assert.equal(currentPayment.receiptGitBlobSha,blob,'I66_PAYMENT_FRONTEND_RECEIPT_SHA_DRIFT');
    const r=JSON.parse(raw);
    assert.equal(r.schema,'GRAVICENTRA_I6_6_DIRECT_PAYMENT_OPTIONAL_DOCUMENT_LIVE_RECEIPT_V1');
    assert.equal(currentPayment.status,'CURRENT_SIGNED_PHYSICAL_FRONTEND_LIVE_224_FILES_FULL_I66_HOLD');
    assert.equal(currentPayment.gate,'I6.6');
    for(const [key,value] of Object.entries({sourceSha:r.sourceSha,buildId:r.buildId,buildRunId:r.buildRunId,artifactId:r.artifactId,artifactDigest:r.artifactDigest,previewUrl:r.previewUrl,signedPreviewUatRunId:r.signedPreviewUatRunId,liveCloneRunId:r.liveCloneRunId,hostingVersion:r.physicalLiveHostingVersion,liveReadbackArtifactId:r.liveReadbackArtifactId,liveReadbackArtifactDigest:r.liveReadbackArtifactDigest}))
      assert.equal(currentPayment[key],value,'I66_CURRENT_LIVE_FRONTEND_FIELD_'+key);
    for(const key of ['preview','firebaseLive','customDomainLive'])assert.equal(r.exactFiles[key],224,'I66_PAYMENT_LIVE_224_FILES_'+key);
    assert.equal(currentPayment.hostedFilesEachOrigin,224);
    assert.equal(currentPayment.currentMarkerRealRoleUatRunId,45064138268,'I66_CURRENT_LIVE_MARKER_TEST_ID');
    assert.equal(currentPayment.currentMarkerGovernanceRunId,45064138325,'I66_CURRENT_LIVE_MARKER_GUARD_ID');
    assert.equal(r.signedPreviewUatResult,'SUCCESS');assert.equal(r.liveCloneRunResult,'SUCCESS');
    assert.equal(r.tests.oneStepActualCustomerWithAttachedInvoice,'NOT_CERTIFIED','I66_DO_NOT_FAKE_REAL_INVOICE_ACCEPTANCE');
    assert.equal(r.tests.liveRealCustomerPaymentAttempt,'NOT_REPRODUCED');
    assert.equal(r.dataWrites,0);assert.equal(r.backendDeployments,0);assert.equal(r.fullI66ProductionAccepted,false);
    for(const key of ['fullI66ProductionAccepted','realFinancialWrites','backendDeployments'])
      assert.equal(currentPayment[key],key==='fullI66ProductionAccepted'?false:0,'I66_PAYMENT_SCOPE_'+key);
    assert.equal(currentPayment.oldThreeFunctionLiveAcceptancePreserved,ACCEPTANCE_KEY);
    assert.deepEqual(state.currentPhysicalFrontendLive20261120,currentPayment,'I66_CURRENT_FRONTEND_STATE_MISMATCH');
    const h=transport.currentPhysicalHostingRelease||{};
    for(const [key,value] of Object.entries({sourceSha:r.sourceSha,buildId:r.buildId,artifactId:r.artifactId,artifactDigest:r.artifactDigest,previewRunId:r.buildRunId,signedPreviewRunId:r.signedPreviewUatRunId,liveCloneRunId:r.liveCloneRunId,liveHostingVersion:r.physicalLiveHostingVersion,readbackEachOrigin:224,receipt:path,backendFunctionsChanged:0,fullI66ProductionAccepted:false}))
      assert.equal(h[key],value,'I66_PAYMENT_LATEST_TRANSPORT_'+key);
    assert.equal(h.status,'PUBLISHED_SIGNED_224_FRONTEND_HOSTING_ONLY_FULL_I66_HOLD');
    const prev=transport.previousPhysicalHostingReleaseBeforePaymentDirect20261120||{};
    assert.equal(prev.sourceSha,r.sourceSha==='f1eb5bc6397f0b159079be516a521dd7b1e5d9ba'?'431892dcfefaa7eaad6faec3ab281dca25d6b2b1':'INVALID','I66_PAYMENT_PREVIOUS_HOSTING_ID');
    assert.equal(prev.liveHostingVersion,r.previousHostingVersion,'I66_PAYMENT_ROLLBACK_HOSTING');
    assert.equal(transport.latestSignedPhysicalFrontendLivePointer20261122?.receiptGitBlobSha,blob,'I66_PAYMENT_TRANSPORT_RECEIPT_BLOB');
    assert.equal(work.latestPhysicalFrontendLiveReceipt,path,'I66_PAYMENT_CONTINUATION_RECEIPT');
    assert.ok(String(control.nextAction||'').includes(r.buildId),'I66_PAYMENT_NEXT_ACTION_STALE');
  }
  assert.equal(latest.status,'LATEST_OPERATIONAL_EXACT_SIGNED_LIVE_PASS_FULL_I66_HOLD');assert.equal(latest.fullI66ProductionAccepted,false);
  for(const [key,target] of Object.entries({sourceSha:'currentLiveSourceSha',buildId:'currentLiveBuildId',buildRunId:'currentLiveImmutableBuildRunId',artifactId:'currentLiveArtifactId',artifactDigest:'currentLiveArtifactDigest',liveRunId:'currentLiveDeployAndSignedQaRunId',liveEvidenceArtifactId:'currentLiveEvidenceArtifactId',liveEvidenceArtifactDigest:'currentLiveEvidenceArtifactDigest',hostingVersion:'currentLiveHostingVersion',receipt:'currentLiveReceipt'}))assert.equal(latest[target],facts[key],'I66_OPERATIONAL_ACCEPTANCE_LATEST_'+key);
  assert.equal(latest.previousLiveVersionForRollback,r11.hostingVersion);
  return {status:ACCEPTED_STATUS,sourceSha:p.sourceSha,receipt:ACCEPTANCE_RECEIPT};
}
module.exports={CONTROL,SITE,PREVIEW,CHANNEL,LIVE,TARGETS,COMPOSITE_TARGETS,MAKE_TARGETS,targetsForCandidate,DRIVERS,PROPOSAL_QA_ISOLATION,ADVISOR_QA_ISOLATION,PINNED_OWNER_PATHS,SIGNED_OBSERVABILITY_PROFILE,previewIdentity,validateBuildMarker,signedMatrixBinding,candidateForPhase,continuationForPreflight,validateArtifact,validatePreviewQa,validateProof,validateFocusedReports,validateFinancialRecoverySummary,signedObservabilityReports,focusedReportsFromDisk,assertDirectFormsPersonalAuthority,envFor,ACCEPTANCE_KEY,ACCEPTANCE_RECEIPT,ACCEPTANCE_PROOF,ACCEPTED_STATUS,LIVE_SIGNED_STATUS,validateLiveProof,acceptedForPreflight};
if(require.main===module)main().catch(error=>{console.error(String(error.message||error));process.exitCode=1;});
