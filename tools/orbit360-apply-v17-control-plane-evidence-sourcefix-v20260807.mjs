#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const REQUEST = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const OVERLAY = 'tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json';
const SEALER = 'tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');

const request = readJson(REQUEST);
const lifecycle = readJson(LIFECYCLE);
const overlay = readJson(OVERLAY);

if (request.requestVersion !== '20260807.16-two-phase-runtime' || request.consumed !== true || request.authorizationFrozen !== true || request.allowedExecutions !== 0 || request.replayAllowed !== false) {
  throw new Error('PIPELINE_MECHANISM_FAILURE_V16_NOT_FAIL_CLOSED_BEFORE_V17_SOURCEFIX');
}
if (lifecycle.stopRetryActive !== true || lifecycle.executionAuthorized !== false || overlay.runtimeAllowed !== false) {
  throw new Error('PIPELINE_MECHANISM_FAILURE_V16_LIFECYCLE_NOT_FAIL_CLOSED');
}

request.executionResult = Object.assign({}, request.executionResult || {}, {
  browserExecuted: true,
  hostingTouched: true,
  hostingRollbackRestored: true,
  snapshotIntegrity: 'VERIFIED_UNCHANGED'
});
request.sourceValidation = Object.assign({}, request.sourceValidation || {}, {
  v16EvidenceCorrectionSourceOnly: 'BROWSER_EXECUTED_TRUE_CONFIRMED_BY_MATRIX_AND_WATCHDOG',
  v16DeepRootCause: 'FUNCTIONAL_DEFECT_READ_ONLY_ADVISOR_PROJECTION_REBUILD_AMPLIFICATION',
  v16SecondaryRootCause: 'PIPELINE_MECHANISM_FAILURE_GENERIC_ROUTE_READINESS_OBSCURED_RENDER_STALL'
});
writeJson(REQUEST, request);

lifecycle.ownerVersion = '20260807.44-v17-source-rootfix-pending-runtime-validation';
lifecycle.sourcePrerequisites = Object.assign({}, lifecycle.sourcePrerequisites || {}, {
  v16RuntimeRunId: 31191340443,
  v16RuntimeCheckpoint: 'DIRECCION_ROUTE_CLIENTE360_TIMEOUT',
  v16Precheck: 'PASS_INICIO_READY',
  v16DeepRootCause: 'FUNCTIONAL_DEFECT_READ_ONLY_ADVISOR_PROJECTION_REBUILD_AMPLIFICATION',
  v16SecondaryRootCause: 'PIPELINE_MECHANISM_FAILURE_GENERIC_ROUTE_READINESS_OBSCURED_RENDER_STALL',
  v17AdvisorProjectionCacheRequired: true,
  v17UnifiedReadinessAuthority: 'OrbitHydrationContractDiagnostics',
  v17PerRouteCheckpointsRequired: ['REQUIRED_HYDRATION_PASS', 'RENDER_READY_PASS'],
  v17SourceRootfixRuntimeValidated: false
});
lifecycle.runtimeResult = Object.assign({}, lifecycle.runtimeResult || {}, {
  browserExecuted: true,
  hostingDeploys: 1,
  rollbackRestored: true,
  snapshotIntegrity: 'VERIFIED_UNCHANGED'
});
lifecycle.protectedState = Object.assign({}, lifecycle.protectedState || {}, {
  hostingState: 'ROLLBACK_RESTORED_AFTER_V16_STOP',
  currentLabRestoredToPreviousVersion: true,
  correctedRootfixHostingLive: false,
  passVisualPostAuth: false,
  snapshotIntegrity: 'VERIFIED_UNCHANGED'
});
writeJson(LIFECYCLE, lifecycle);

overlay.rootCauseResolved = 'V15_HYDRATION_RUNTIME_COMPOSITION_AND_STOP_CONSUMER_STATE_DRIFT_CORRECTED; V16_ADVISOR_PROJECTION_AMPLIFICATION_DIAGNOSED_SOURCE_ONLY';
overlay.sourceRootfixRuntimeValidated = false;
overlay.historicalRuntimeEvidence = {
  runId: '31191340443',
  browserExecuted: true,
  hostingTouched: true,
  hostingDeploys: 1,
  rollbackRestored: true,
  snapshotIntegrity: 'VERIFIED_UNCHANGED',
  writes: 0
};
writeJson(OVERLAY, overlay);

let sealer = fs.readFileSync(SEALER, 'utf8');
if (!sealer.includes('const browserExecuted =')) {
  sealer = sealer.replace(
    "const rollbackRestored = rollbackRequired && outcomes.rollback === 'success';\n",
    "const rollbackRestored = rollbackRequired && outcomes.rollback === 'success';\nconst browserExecuted = outcomes.precheck !== 'skipped' || outcomes.matrix !== 'skipped' || Boolean(matrix && matrix.currentCheckpoint && matrix.currentCheckpoint !== 'BOOT');\n"
  );
}
if (!sealer.includes('  browserExecuted,\n  secretAccessed:')) {
  sealer = sealer.replace(
    "  replayAllowed: false,\n  secretAccessed:",
    "  replayAllowed: false,\n  browserExecuted,\n  secretAccessed:"
  );
}
if (!sealer.includes('    browserExecuted: final.browserExecuted,')) {
  sealer = sealer.replace(
    "    captureWarnings: captureWarnings.length\n  };",
    "    captureWarnings: captureWarnings.length,\n    browserExecuted: final.browserExecuted\n  };"
  );
}
if (!sealer.includes("lifecycle.protectedState.hostingState =")) {
  sealer = sealer.replace(
    "lifecycle.protectedState.snapshotIntegrity = snapshotIntegrity;\n",
    "lifecycle.protectedState.snapshotIntegrity = snapshotIntegrity;\nlifecycle.protectedState.hostingState = rollbackRestored ? 'ROLLBACK_RESTORED_AFTER_CURRENT_STOP' : (pass ? 'ROOTFIX_HOSTING_LIVE' : lifecycle.protectedState.hostingState);\n"
  );
}
if (!sealer.includes('    browserExecuted: final.browserExecuted,\n    hostingTouched: final.hostingDeployAttempted,')) {
  sealer = sealer.replace(
    "    hostingDeploys: final.hostingDeploys,\n",
    "    hostingDeploys: final.hostingDeploys,\n    browserExecuted: final.browserExecuted,\n    hostingTouched: final.hostingDeployAttempted,\n"
  );
}
if (!sealer.includes('const browserExecuted =') || !sealer.includes('browserExecuted: final.browserExecuted')) {
  throw new Error('PIPELINE_MECHANISM_FAILURE_V17_SEALER_BROWSER_EVIDENCE_PATCH_NOT_APPLIED');
}
fs.writeFileSync(SEALER, sealer, 'utf8');

console.log(JSON.stringify({
  status: 'PASS_V17_CONTROL_PLANE_EVIDENCE_SOURCEFIX_APPLIED',
  requestVersion: request.requestVersion,
  requestConsumed: request.consumed,
  requestFrozen: request.authorizationFrozen,
  v16BrowserExecutedCorrected: request.executionResult.browserExecuted === true,
  lifecycleHostingState: lifecycle.protectedState.hostingState,
  relayV16Expected: 'DELETED_ON_SOURCEFIX_BRANCH',
  runtimeEffects: 0,
  writesToProductData: 0,
  ok: true
}, null, 2));
