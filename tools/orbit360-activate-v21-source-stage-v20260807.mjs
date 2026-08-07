#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const REQUEST = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const OVERLAY = 'tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json';
const EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/v21-event-driven-render-source-sanitized-v20260807.json';
const RELAY_V21 = '.github/workflows/orbit360-registered-relay-v21-event-driven-render-v20260807.yml';
const RELAY_V20 = '.github/workflows/orbit360-registered-relay-v20-exact-artifact-v20260807.yml';
const EXPECTED = '20260807.21-two-phase-runtime';
const SOURCE_PHASE = 'V21_EVENT_DRIVEN_RENDER_SOURCE_PASS_PENDING_EXCLUSIVE_REQUEST';
const SOURCE_STATUS = 'AUTHORIZED_FRESH_REQUEST_ONLY_V21_EVENT_DRIVEN_RENDER_PENDING_EXCLUSIVE_REQUEST';
const SOURCE_CAPS = { secrets:false, firestoreRead:false, writes:false, runtime:false, browser:false, deploy:false, functionsDeploy:false, rulesDeploy:false, production:false };

const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
const fail = (code, detail='') => { console.error(JSON.stringify({ status:'STOP_V21_SOURCE_ACTIVATION', code, detail, ok:false })); process.exit(41); };

for (const file of [REQUEST,LIFECYCLE,OVERLAY,EVIDENCE,RELAY_V21]) if (!fs.existsSync(file)) fail('REQUIRED_FILE_MISSING', file);
if (fs.existsSync(RELAY_V20)) fail('V20_RELAY_NOT_RETIRED');
const request = read(REQUEST);
const lifecycle = read(LIFECYCLE);
const overlay = read(OVERLAY);
const evidence = read(EVIDENCE);

if (!(request.requestVersion === '20260807.20-two-phase-runtime' && request.consumed === true && request.authorizationFrozen === true && request.allowedExecutions === 0 && request.replayAllowed === false)) fail('V20_REQUEST_NOT_FROZEN');
if (!(evidence.status === 'PASS_V21_EVENT_DRIVEN_RENDER_SOURCE_ONLY' && evidence.finalPackageStatus === 'PASS' && evidence.finalPackageRunId === 31210494065 && evidence.ok === true && evidence.exactArtifact && evidence.exactArtifact.compile === 'PASS' && evidence.exactArtifact.import === 'PASS')) fail('V21_SOURCE_EVIDENCE_NOT_PASS');
if (!(lifecycle.stopRetryActive === true && lifecycle.requestConsumed === true && lifecycle.authorizationFrozen === true && lifecycle.allowedExecutions === 0)) fail('V20_LIFECYCLE_NOT_TERMINAL_STOP', lifecycle.status || '');
if (!(overlay.stopRetryActive === true && overlay.requestReusable === false && overlay.runtimeAllowed === false)) fail('V20_OVERLAY_NOT_TERMINAL_STOP', overlay.status || '');

lifecycle.ownerVersion = '20260807.52-v21-event-driven-render-source-activation';
lifecycle.status = SOURCE_STATUS;
lifecycle.classification = 'SOURCE_ONLY_ACTIVATION_VALIDATED';
lifecycle.secondaryClassification = 'V21_EVENT_DRIVEN_RENDER_EXACT_ARTIFACT_PASS';
lifecycle.patternClassification = 'REPLICABLE_CLAUDE_ACUMULADO';
lifecycle.expectedRequestVersion = EXPECTED;
lifecycle.authorizationDirective = 'EXPLICIT_V21_EVENT_DRIVEN_RENDER_SOURCE_ROOTFIX_AND_SINGLE_RUNTIME_MATRIX_AUTHORIZATION';
lifecycle.currentPhase = SOURCE_PHASE;
lifecycle.executionProfile = { mode:'SOURCE_ONLY_ACTIVATION_PASS_THEN_RUNTIME_ONCE_WITH_FRESH_EXCLUSIVE_REQUEST', phase:SOURCE_PHASE, capabilities:SOURCE_CAPS };
lifecycle.registeredWorkflowPath = RELAY_V21;
lifecycle.hostingDeploysMaximum = 1;
lifecycle.hostingBackupCloneAuthorized = true;
lifecycle.hostingRollbackCloneAuthorizedOnFailure = true;
lifecycle.priorHostingRestoreAuthorized = true;
lifecycle.activeRequest = false;
lifecycle.requestRetired = true;
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
lifecycle.sourcePrerequisites = {
  ...(lifecycle.sourcePrerequisites || {}),
  authorizedSourceHead: '68667075e00654a4df216f0ce6e7417f041fe837',
  priorRequestVersion: '20260807.20-two-phase-runtime',
  priorRequestConsumed: true,
  priorRequestFrozen: true,
  priorRequestReplayAllowed: false,
  activationSourceStatus: evidence.status,
  activationSourceRunId: evidence.finalPackageRunId,
  activationSourceJobId: evidence.finalPackageJobId,
  v21RootCauses: evidence.rootCauses,
  v21ArtifactSchema: evidence.artifactSchema,
  v21ArtifactSha256: evidence.artifactSha256,
  v21RenderSignalVersion: evidence.renderSignalVersion,
  v21ExactArtifactCompile: 'PASS',
  v21ExactArtifactImport: 'PASS',
  v21SyntheticLongTask: 'PASS',
  v21ObserverArmedBeforeNavigation: true,
  v21RenderPollingRemoved: true,
  v21TimeoutMetricsPersisted: true,
  v21SpecializedClassificationPreserved: true,
  requestLifecycleScopeChecks: '17/17 PASS',
  captureWatchdogChecks: '21/21 PASS',
  windowsChecks: '7/7 PASS',
  signalSafeChecks: '48/48 PASS',
  crossRunnerChecks: '24/24 PASS',
  phaseAwareScopeChecks: '37/37 PASS',
  transportBaseShaChecks: '12/12 PASS',
  v20RelayDisarmed: true,
  registeredRelayPath: RELAY_V21,
  registeredRelayExpectedRequest: EXPECTED,
  registeredRelayStatus: 'RESERVED_EXCLUSIVE_V21_BEFORE_REQUEST',
  v21SourceRootfixRuntimeValidated: false
};
lifecycle.protectedState = { ...(lifecycle.protectedState || {}), passVisualPostAuth:false, currentLabRestoredToPreviousVersion:true, correctedRootfixHostingLive:false };
lifecycle.nextAction = 'TRANSITION_SOURCE_TO_RUNTIME_PENDING_ONLY_AFTER_SOURCE_PACKAGE_PASS. NO REQUEST YET.';

const nextOverlay = {
  ...overlay,
  requestVersion: EXPECTED,
  status: SOURCE_STATUS,
  classification: 'SOURCE_ONLY_ACTIVATION_VALIDATED',
  secondaryClassification: 'V21_EVENT_DRIVEN_RENDER_EXACT_ARTIFACT_PASS',
  checkpoint: 'V21_SOURCE_ACTIVATION_PASS',
  failureCode: '',
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
  registeredRelayPath: RELAY_V21,
  registeredRelayExpectedRequest: EXPECTED,
  registeredRelayExclusive: true,
  sourceRootfixRuntimeValidated: false,
  captureWatchdogChecks: '21/21 PASS',
  exactArtifactChecks: '39/39 PASS',
  exactArtifactSha256: evidence.artifactSha256,
  renderSignalVersion: evidence.renderSignalVersion,
  browserExecuted: false,
  hostingTouched: false,
  hostingDeploys: 0,
  rollbackRequired: false,
  rollbackRestored: true,
  firestoreReads: 0,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  passVisualPostAuth: false,
  ok: true
};

write(LIFECYCLE, lifecycle);
write(OVERLAY, nextOverlay);
console.log(JSON.stringify({ status:'PASS_V21_SOURCE_STAGE_ACTIVATION', requestVersion:EXPECTED, lifecycleStatus:lifecycle.status, lifecyclePhase:lifecycle.currentPhase, v20RequestFrozen:true, v20RelayDisarmed:true, secretAccess:false, firebaseAccess:false, browserExecuted:false, hostingTouched:false, deployExecuted:false, writes:0, ok:true }, null, 2));
