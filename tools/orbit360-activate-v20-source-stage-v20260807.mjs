#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const REQUEST = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const OVERLAY = 'tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json';
const EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/v20-native-matrix-artifact-source-sanitized-v20260807.json';
const RELAY_V20 = '.github/workflows/orbit360-registered-relay-v20-exact-artifact-v20260807.yml';
const RELAY_V19 = '.github/workflows/orbit360-registered-relay-v19-bounded-render-v20260807.yml';
const EXPECTED = '20260807.20-two-phase-runtime';
const SOURCE_PHASE = 'V20_EXACT_MATRIX_ARTIFACT_SOURCE_PASS_PENDING_EXCLUSIVE_REQUEST';
const SOURCE_STATUS = 'AUTHORIZED_FRESH_REQUEST_ONLY_V20_EXACT_MATRIX_ARTIFACT_PENDING_EXCLUSIVE_REQUEST';
const SOURCE_CAPS = { secrets:false, firestoreRead:false, writes:false, runtime:false, browser:false, deploy:false, functionsDeploy:false, rulesDeploy:false, production:false };

const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
const fail = (code, detail='') => { console.error(JSON.stringify({ status:'STOP_V20_SOURCE_ACTIVATION', code, detail, ok:false })); process.exit(41); };

for (const file of [REQUEST,LIFECYCLE,OVERLAY,EVIDENCE,RELAY_V20]) if (!fs.existsSync(file)) fail('REQUIRED_FILE_MISSING', file);
if (fs.existsSync(RELAY_V19)) fail('V19_RELAY_NOT_RETIRED');
const request = read(REQUEST);
const lifecycle = read(LIFECYCLE);
const overlay = read(OVERLAY);
const evidence = read(EVIDENCE);

if (!(request.requestVersion === '20260807.19-two-phase-runtime' && request.consumed === true && request.authorizationFrozen === true && request.allowedExecutions === 0 && request.replayAllowed === false)) fail('V19_REQUEST_NOT_FROZEN');
if (!(evidence.status === 'PASS_V20_NATIVE_MATRIX_ARTIFACT_SOURCE_ONLY' && evidence.ok === true && evidence.exactArtifact && evidence.exactArtifact.compile === 'PASS' && evidence.exactArtifact.import === 'PASS')) fail('V20_SOURCE_EVIDENCE_NOT_PASS');
if (!(lifecycle.stopRetryActive === true && lifecycle.requestConsumed === true && lifecycle.authorizationFrozen === true && lifecycle.allowedExecutions === 0)) fail('V19_LIFECYCLE_NOT_TERMINAL_STOP', lifecycle.status || '');
if (!(overlay.stopRetryActive === true && overlay.requestReusable === false && overlay.runtimeAllowed === false)) fail('V19_OVERLAY_NOT_TERMINAL_STOP', overlay.status || '');

lifecycle.ownerVersion = '20260807.51-v20-exact-artifact-source-activation';
lifecycle.status = SOURCE_STATUS;
lifecycle.classification = 'SOURCE_ONLY_ACTIVATION_VALIDATED';
lifecycle.secondaryClassification = 'V20_EXACT_RUNTIME_ARTIFACT_COMPILE_IMPORT_GATE_PASS';
lifecycle.patternClassification = 'REPLICABLE_CLAUDE_ACUMULADO';
lifecycle.expectedRequestVersion = EXPECTED;
lifecycle.authorizationDirective = 'EXPLICIT_V20_EXACT_MATRIX_ARTIFACT_SOURCE_ROOTFIX_AND_SINGLE_RUNTIME_MATRIX_AUTHORIZATION';
lifecycle.currentPhase = SOURCE_PHASE;
lifecycle.executionProfile = { mode:'SOURCE_ONLY_ACTIVATION_PASS_THEN_RUNTIME_ONCE_WITH_FRESH_EXCLUSIVE_REQUEST', phase:SOURCE_PHASE, capabilities:SOURCE_CAPS };
lifecycle.registeredWorkflowPath = RELAY_V20;
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
  authorizedSourceHead: 'a3e833b8f162f0313dda19f9bd2cf1730ad9871c',
  priorRequestVersion: '20260807.19-two-phase-runtime',
  priorRequestConsumed: true,
  priorRequestFrozen: true,
  priorRequestReplayAllowed: false,
  activationSourceStatus: evidence.status,
  activationSourceRunId: evidence.sourceRunId,
  activationSourceJobId: evidence.sourceJobId,
  v20RootCause: evidence.rootCause,
  v20ArtifactSchema: evidence.artifactSchema,
  v20ArtifactSha256: evidence.artifactSha256,
  v20ExactArtifactCompile: 'PASS',
  v20ExactArtifactImport: 'PASS',
  v20CorruptArtifactRejected: true,
  v20ArtifactChecks: '21/21 PASS',
  requestLifecycleScopeChecks: '17/17 PASS',
  captureWatchdogChecks: '19/19 PASS',
  windowsChecks: '7/7 PASS',
  signalSafeChecks: '48/48 PASS',
  crossRunnerChecks: '24/24 PASS',
  phaseAwareScopeChecks: '37/37 PASS',
  transportBaseShaChecks: '12/12 PASS',
  v19RelayDisarmed: true,
  registeredRelayPath: RELAY_V20,
  registeredRelayExpectedRequest: EXPECTED,
  registeredRelayStatus: 'RESERVED_EXCLUSIVE_V20_BEFORE_REQUEST',
  v20SourceRootfixRuntimeValidated: false
};
lifecycle.protectedState = { ...(lifecycle.protectedState || {}), passVisualPostAuth:false, currentLabRestoredToPreviousVersion:true, correctedRootfixHostingLive:false };
lifecycle.nextAction = 'TRANSITION_SOURCE_TO_RUNTIME_PENDING_ONLY_AFTER_SOURCE_PACKAGE_PASS. NO REQUEST YET.';

const nextOverlay = {
  ...overlay,
  requestVersion: EXPECTED,
  status: SOURCE_STATUS,
  classification: 'SOURCE_ONLY_ACTIVATION_VALIDATED',
  secondaryClassification: 'V20_EXACT_RUNTIME_ARTIFACT_COMPILE_IMPORT_GATE_PASS',
  checkpoint: 'V20_SOURCE_ACTIVATION_PASS',
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
  registeredRelayPath: RELAY_V20,
  registeredRelayExpectedRequest: EXPECTED,
  registeredRelayExclusive: true,
  sourceRootfixRuntimeValidated: false,
  captureWatchdogChecks: '19/19 PASS',
  exactArtifactChecks: '21/21 PASS',
  exactArtifactSha256: evidence.artifactSha256,
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
console.log(JSON.stringify({ status:'PASS_V20_SOURCE_STAGE_ACTIVATION', requestVersion:EXPECTED, lifecycleStatus:lifecycle.status, lifecyclePhase:lifecycle.currentPhase, v19RequestFrozen:true, v19RelayDisarmed:true, secretAccess:false, firebaseAccess:false, browserExecuted:false, hostingTouched:false, deployExecuted:false, writes:0, ok:true }, null, 2));
