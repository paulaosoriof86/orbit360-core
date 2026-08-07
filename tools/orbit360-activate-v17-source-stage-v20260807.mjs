#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const EXPECTED = '20260807.17-two-phase-runtime';
const REQUEST = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const OVERLAY = 'tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json';
const EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/v17-advisor-cache-route-readiness-rootfix-source-sanitized-v20260807.json';
const RELAY = '.github/workflows/orbit360-registered-relay-v17-route-readiness-v20260807.yml';
const OLD_RELAY = '.github/workflows/orbit360-registered-relay-v16-hydration-v20260807.yml';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
const request = read(REQUEST);
const lifecycle = read(LIFECYCLE);
const overlay = read(OVERLAY);
const evidence = read(EVIDENCE);

if (request.requestVersion !== '20260807.16-two-phase-runtime' || request.consumed !== true || request.authorizationFrozen !== true || request.allowedExecutions !== 0 || request.replayAllowed !== false) {
  throw new Error('STOP_V17_SOURCE_ACTIVATION_PRIOR_REQUEST_NOT_CLOSED');
}
if (!evidence.ok || evidence.status !== 'PASS_V17_ADVISOR_CACHE_ROUTE_READINESS_ROOTFIX_SOURCE_ONLY') {
  throw new Error('STOP_V17_SOURCE_ACTIVATION_ROOTFIX_NOT_PASS');
}
if (!fs.existsSync(RELAY) || fs.existsSync(OLD_RELAY)) {
  throw new Error('STOP_V17_SOURCE_ACTIVATION_RELAY_STATE_INVALID');
}
if (lifecycle.stopRetryActive !== true || lifecycle.executionAuthorized !== false || overlay.runtimeAllowed !== false) {
  throw new Error('STOP_V17_SOURCE_ACTIVATION_FAIL_CLOSED_BASE_INVALID');
}

const noCapabilities = {
  secrets: false,
  firestoreRead: false,
  writes: false,
  runtime: false,
  browser: false,
  deploy: false,
  functionsDeploy: false,
  rulesDeploy: false,
  production: false
};

lifecycle.ownerVersion = '20260807.45-v17-source-activation';
lifecycle.status = 'AUTHORIZED_FRESH_REQUEST_ONLY_V17_ADVISOR_CACHE_ROUTE_READINESS_PENDING_EXCLUSIVE_REQUEST';
lifecycle.classification = 'SOURCE_ONLY_ACTIVATION_VALIDATED';
lifecycle.secondaryClassification = 'V17_ROOTFIX_SOURCE_VALIDATED_RUNTIME_NOT_EXECUTED';
lifecycle.authorizationDirective = 'EXPLICIT_V17_SOURCE_ROOTFIX_AND_SINGLE_RUNTIME_MATRIX_AUTHORIZATION';
lifecycle.expectedRequestVersion = EXPECTED;
lifecycle.currentPhase = 'SOURCE_ONLY_ACTIVATION_PENDING_RUNTIME_TRANSITION';
lifecycle.executionProfile = {
  mode: 'SOURCE_ONLY_ACTIVATION_NO_RUNTIME',
  phase: 'SOURCE_ONLY_ACTIVATION_PENDING_RUNTIME_TRANSITION',
  capabilities: noCapabilities
};
lifecycle.activeRequest = false;
lifecycle.requestRetired = false;
lifecycle.requestConsumed = false;
lifecycle.authorizationReserved = true;
lifecycle.authorizationFrozen = false;
lifecycle.replayAllowed = false;
lifecycle.allowedExecutions = 1;
lifecycle.executionAuthorized = false;
lifecycle.secretAccessAuthorized = false;
lifecycle.firestoreReadAuthorized = false;
lifecycle.writeAuthorized = false;
lifecycle.browserAuthorized = false;
lifecycle.hostingDeployAuthorized = false;
lifecycle.functionsDeployAuthorized = false;
lifecycle.rulesDeployAuthorized = false;
lifecycle.productionAuthorized = false;
lifecycle.mainAuthorized = false;
lifecycle.mergeAuthorized = false;
lifecycle.stopRetryActive = false;
lifecycle.hostingDeploysMaximum = 1;
lifecycle.hostingBackupCloneAuthorized = true;
lifecycle.hostingRollbackCloneAuthorizedOnFailure = true;
lifecycle.priorHostingRestoreAuthorized = true;
lifecycle.priorHostingRestoreChannel = 'visual-matrix-corrected-backup-31135532118';
lifecycle.priorHostingRestoreScript = 'tools/orbit360-restore-visual-matrix-v13-baseline-before-runtime-v20260807.sh';
lifecycle.registeredWorkflowPath = RELAY;
lifecycle.sourcePrerequisites = Object.assign({}, lifecycle.sourcePrerequisites || {}, {
  activationSourceStatus: 'PASS_V17_ADVISOR_CACHE_ROUTE_READINESS_ROOTFIX_SOURCE_ONLY',
  activationSourceRunId: Number(evidence.runId || 0),
  activationSourceJob: 'source-v17-advisor-cache-route-readiness',
  authorizedSourceHead: 'ad6f2e16305c7f519dcd213e26997695637621b8',
  priorRequestVersion: request.requestVersion,
  priorRequestConsumed: true,
  priorRequestFrozen: true,
  priorRequestReplayAllowed: false,
  v17AdvisorFixture: '430_LOOKUPS_ONE_BUILD_BEFORE_INVALIDATION',
  v17ReadinessAuthority: 'OrbitHydrationContractDiagnostics',
  v17RouteCheckpointOrder: ['REQUIRED_HYDRATION_PASS', 'RENDER_READY_PASS'],
  registeredRelayStatus: 'RESERVED_EXCLUSIVE_V17_BEFORE_REQUEST',
  registeredRelayPath: RELAY,
  registeredRelayExpectedRequest: EXPECTED,
  v16RelayDisarmed: true,
  v17SourceRootfixRuntimeValidated: false
});
lifecycle.nextAction = 'TRANSITION_SOURCE_TO_RUNTIME_PENDING_WITHOUT_SECRETS_OR_RUNTIME.';
write(LIFECYCLE, lifecycle);

const nextOverlay = Object.assign({}, overlay, {
  requestVersion: EXPECTED,
  status: 'AUTHORIZED_FRESH_REQUEST_ONLY_V17_ADVISOR_CACHE_ROUTE_READINESS_PENDING_EXCLUSIVE_REQUEST',
  classification: 'SOURCE_ONLY_ACTIVATION_VALIDATED',
  secondaryClassification: 'V17_ROOTFIX_SOURCE_VALIDATED_RUNTIME_NOT_EXECUTED',
  checkpoint: 'V17_SOURCE_ACTIVATION_PASS',
  stopRetryActive: false,
  requestReusable: false,
  freshAuthorizationRequired: false,
  expectedNextRequestVersion: EXPECTED,
  runtimeAllowed: true,
  runtimeAllowedOnlyWithFreshExclusiveRequest: true,
  browserAllowed: false,
  hostingAllowed: false,
  productionAllowed: false,
  writesAllowed: false,
  functionsAllowed: false,
  rulesAllowed: false,
  reimportAllowed: false,
  registeredRelayPath: RELAY,
  registeredRelayExclusive: true,
  sourceRootfixRuntimeValidated: false,
  ok: true
});
write(OVERLAY, nextOverlay);

console.log(JSON.stringify({
  status: 'PASS_V17_SOURCE_ACTIVATION_RESERVED',
  requestVersion: EXPECTED,
  priorRequestClosed: true,
  rootfixSourcePass: true,
  relayV17Present: true,
  relayV16Absent: true,
  lifecycleExecutionAuthorized: false,
  secretsRead: false,
  firebaseAccess: false,
  browserExecuted: false,
  hostingTouched: false,
  deployExecuted: false,
  writes: 0,
  ok: true
}, null, 2));
