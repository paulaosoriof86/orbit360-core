#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const MODE = process.argv[2] || 'check-rootfix';
const BASE = '43f5b2c23fd004abcb0f3a49b55044906e0db3be';
const REQUEST_VERSION = '20260807.16-two-phase-runtime';
const PRIOR_REQUEST_VERSION = '20260807.15-two-phase-runtime';
const RUNTIME_PHASE = 'VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION';
const REQUEST = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const OVERLAY = 'tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json';
const RELAY = '.github/workflows/orbit360-claude-paquete-reconciliado-v1205.yml';
const PRECHECK = 'tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs';
const HYDRATION = 'orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js';
const ROOTFIX_EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/v15-inicio-hydration-stop-consumer-rootfix-source-sanitized-v20260807.json';
const OUT = 'orbit360-platform/runtime-gate-crm-v20260716/v16-source-activation-hydration-sequence-sanitized-v20260807.json';

const read = file => fs.readFileSync(path.resolve(file), 'utf8').replace(/^\uFEFF/, '');
const json = file => JSON.parse(read(file));
const writeJson = (file, value) => fs.writeFileSync(path.resolve(file), JSON.stringify(value, null, 2) + '\n', 'utf8');
const fail = (code, detail = '') => {
  console.error(JSON.stringify({ status: 'STOP_V16_SOURCE_ACTIVATION', code, detail, mode: MODE, ok: false }, null, 2));
  process.exit(41);
};
const assert = (condition, code, detail = '') => { if (!condition) fail(code, detail); };

function rootfixChecks() {
  const request = json(REQUEST);
  const lifecycle = json(LIFECYCLE);
  const overlay = json(OVERLAY);
  const evidence = json(ROOTFIX_EVIDENCE);
  const precheck = read(PRECHECK);
  const hydration = read(HYDRATION);
  const mounted = precheck.indexOf("'HYDRATION_CONTRACT_MOUNTED'");
  const required = precheck.indexOf("'INICIO_REQUIRED_HYDRATION'");
  const ready = precheck.indexOf("'INICIO_READY'");
  const inicioContract = "inicio: { required: ['clientes', 'polizas', 'cobros', 'aseguradoras'], optional: ['asesores', 'metas', 'negocios', 'gestiones'] }";
  const checks = {
    priorRequestVersion: request.requestVersion === PRIOR_REQUEST_VERSION,
    priorRequestConsumedFrozen: request.consumed === true && request.allowedExecutions === 0 && request.authorizationFrozen === true && request.replayAllowed === false,
    lifecycleFailClosed: lifecycle.stopRetryActive === true && lifecycle.allowedExecutions === 0 && lifecycle.executionAuthorized === false,
    overlayFailClosed: overlay.stopRetryActive === true && overlay.runtimeAllowed === false && overlay.hostingAllowed === false,
    v15RootfixEvidencePass: evidence.ok === true && evidence.status === 'PASS_V15_INICIO_HYDRATION_STOP_CONSUMER_ROOTFIX_SOURCE_ONLY',
    hydrationContractCanonicalRequiredOptional: hydration.includes(inicioContract),
    hydrationMountedDiagnosticPresent: hydration.includes('mounted: function ()'),
    precheckMountedCheckpointPresent: mounted >= 0,
    precheckRequiredCheckpointPresent: required >= 0,
    precheckReadyCheckpointPresent: ready >= 0,
    sequenceMountedBeforeRequired: mounted >= 0 && required > mounted,
    sequenceRequiredBeforeReady: required >= 0 && ready > required,
    mountedFailureClassifiedPipeline: precheck.includes("result.checkpoint.startsWith('HYDRATION_CONTRACT_MOUNTED')") && precheck.includes("result.classification = 'PIPELINE_MECHANISM_FAILURE'"),
    requiredFailureClassifiedDataContract: precheck.includes("result.checkpoint.startsWith('INICIO_REQUIRED_HYDRATION')") && precheck.includes("result.classification = 'DATA_CONTRACT_FAILURE'")
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
  assert(failed.length === 0, 'V15_ROOTFIX_SEQUENCE_NOT_PROVEN', failed.join(','));
  return checks;
}

function writeEvidence(stage, checks, extra = {}) {
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
  const out = {
    schemaVersion: 'orbit360-v16-source-activation-hydration-sequence-v1',
    gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
    requestVersion: REQUEST_VERSION,
    sourceAuthorizationBaseHead: BASE,
    status: stage,
    classification: 'SOURCE_ONLY_ACTIVATION_VALIDATED',
    sequence: ['HYDRATION_CONTRACT_MOUNTED', 'INICIO_REQUIRED_HYDRATION', 'INICIO_READY'],
    total: Object.keys(checks).length,
    passed: Object.keys(checks).length - failed.length,
    failed: failed.length,
    failedCheckIds: failed,
    checks,
    ...extra,
    secretsRead: false,
    firebaseAccess: false,
    firestoreReads: 0,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    hostingTouched: false,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: failed.length === 0
  };
  writeJson(OUT, out);
  return out;
}

function prepareSourceStage() {
  const checks = rootfixChecks();
  const lifecycle = json(LIFECYCLE);
  const overlay = json(OVERLAY);
  let relay = read(RELAY);

  const capabilities = {
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

  lifecycle.ownerVersion = '20260807.45-v16-source-activation-hydration-sequence';
  lifecycle.status = 'AUTHORIZED_FRESH_REQUEST_ONLY_V16_PENDING_EXCLUSIVE_REQUEST';
  lifecycle.classification = 'SOURCE_ONLY_ACTIVATION_VALIDATED';
  lifecycle.secondaryClassification = 'V15_HYDRATION_ROOTFIX_REUSED_SOURCE_VALIDATED';
  lifecycle.authorizedBaseHead = BASE;
  lifecycle.expectedRequestVersion = REQUEST_VERSION;
  lifecycle.authorizationDirective = 'EXPLICIT_SINGLE_SOURCE_ONLY_ACTIVATION_AND_RUNTIME_V16_HYDRATION_SEQUENCE_HOSTING_LAB_READONLY_MATRIX';
  lifecycle.currentPhase = 'SOURCE_ONLY_ACTIVATION';
  lifecycle.executionProfile = { mode: 'SOURCE_ONLY_ACTIVATION', phase: 'SOURCE_ONLY_ACTIVATION', capabilities };
  lifecycle.hostingDeploysMaximum = 1;
  lifecycle.hostingBackupCloneAuthorized = true;
  lifecycle.hostingRollbackCloneAuthorizedOnFailure = true;
  lifecycle.priorHostingRestoreAuthorized = true;
  lifecycle.priorHostingRestoreChannel = 'visual-matrix-corrected-backup-31135532118';
  lifecycle.priorHostingRestoreScript = 'tools/orbit360-restore-visual-matrix-v13-baseline-before-runtime-v20260807.sh';
  lifecycle.activeRequest = false;
  lifecycle.requestRetired = true;
  lifecycle.requestConsumed = true;
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
    authorizedSourceHead: BASE,
    priorRequestVersion: PRIOR_REQUEST_VERSION,
    priorRequestConsumed: true,
    priorRequestReplayAllowed: false,
    v15InicioHydrationStopConsumerRootfixStatus: 'PASS_V15_INICIO_HYDRATION_STOP_CONSUMER_ROOTFIX_SOURCE_ONLY',
    v16HydrationSequenceRequired: ['HYDRATION_CONTRACT_MOUNTED', 'INICIO_REQUIRED_HYDRATION', 'INICIO_READY'],
    v16HydrationSequenceSourceCheck: 'PASS',
    v16PriorRequestClosed: true,
    activationSourceStatus: 'PASS_V16_ACTIVATION_SOURCE_ONLY_HYDRATION_SEQUENCE_AWARE',
    activationSourceRunId: Number(process.env.GITHUB_RUN_ID || 0),
    activationSourceJob: 'source-v16-hydration-sequence'
  };
  lifecycle.nextAction = 'EXPLICIT_SOURCE_TO_RUNTIME_TRANSITION_ONLY_AFTER_V16_SOURCE_VALIDATION_PASS.';

  overlay.requestVersion = REQUEST_VERSION;
  overlay.status = 'AUTHORIZED_FRESH_REQUEST_ONLY_V16_PENDING_EXCLUSIVE_REQUEST';
  overlay.classification = 'SOURCE_ONLY_ACTIVATION_VALIDATED';
  overlay.secondaryClassification = 'V15_HYDRATION_ROOTFIX_REUSED_SOURCE_VALIDATED';
  overlay.checkpoint = 'SOURCE_ACTIVATION_VALIDATED_HYDRATION_SEQUENCE';
  overlay.failureCode = '';
  overlay.rootCauseResolved = 'V15_HYDRATION_RUNTIME_COMPOSITION_AND_STOP_CONSUMER_STATE_DRIFT_CORRECTED_SOURCE_ONLY';
  overlay.authorizedSourceHead = BASE;
  overlay.stopRetryActive = false;
  overlay.requestReusable = false;
  overlay.freshAuthorizationRequired = false;
  overlay.expectedNextRequestVersion = REQUEST_VERSION;
  overlay.runtimeAllowed = true;
  overlay.runtimeAllowedOnlyWithFreshExclusiveRequest = true;
  overlay.browserAllowed = false;
  overlay.hostingAllowed = false;
  overlay.productionAllowed = false;
  overlay.writesAllowed = false;
  overlay.functionsAllowed = false;
  overlay.rulesAllowed = false;
  overlay.reimportAllowed = false;
  overlay.secretsRead = false;
  overlay.firebaseAccess = false;
  overlay.hostingTouched = false;
  overlay.hostingDeploys = 0;
  overlay.rollbackRequired = false;
  overlay.rollbackRestored = false;
  overlay.snapshotIntegrity = 'VERIFIED_UNCHANGED_V15_ROLLBACK';
  overlay.firestoreReads = 0;
  overlay.firestoreWrites = 0;
  overlay.authWrites = 0;
  overlay.operationalWrites = 0;
  overlay.passVisualPostAuth = false;
  overlay.ok = true;

  assert(relay.includes('ORBIT360_EXPECTED_REQUEST_VERSION: NONE_PENDING_FRESH_AUTHORIZATION'), 'RELAY_NOT_FAIL_CLOSED_BEFORE_V16');
  relay = relay.replace('ORBIT360_EXPECTED_REQUEST_VERSION: NONE_PENDING_FRESH_AUTHORIZATION', `ORBIT360_EXPECTED_REQUEST_VERSION: ${REQUEST_VERSION}`);
  relay = relay.replace('visual-matrix-v15-prior-hosting-restore-sanitized-v20260807.json', 'visual-matrix-v16-prior-hosting-restore-sanitized-v20260807.json');

  writeJson(LIFECYCLE, lifecycle);
  writeJson(OVERLAY, overlay);
  fs.writeFileSync(path.resolve(RELAY), relay, 'utf8');
  writeEvidence('PASS_V16_SOURCE_PREPARED_PENDING_EXPLICIT_TRANSITION', checks, { sourceStagePrepared: true, runtimePending: false });
}

function validateSourceStage() {
  const checks = rootfixChecks();
  const lifecycle = json(LIFECYCLE);
  const overlay = json(OVERLAY);
  const relay = read(RELAY);
  const stage = {
    lifecycleStatus: lifecycle.status === 'AUTHORIZED_FRESH_REQUEST_ONLY_V16_PENDING_EXCLUSIVE_REQUEST',
    lifecycleClassification: lifecycle.classification === 'SOURCE_ONLY_ACTIVATION_VALIDATED',
    lifecycleExpectedVersion: lifecycle.expectedRequestVersion === REQUEST_VERSION,
    lifecycleReservedOnce: lifecycle.authorizationReserved === true && lifecycle.allowedExecutions === 1 && lifecycle.authorizationFrozen === false,
    lifecycleNoRuntimeYet: lifecycle.executionAuthorized === false && lifecycle.secretAccessAuthorized === false && lifecycle.browserAuthorized === false && lifecycle.hostingDeployAuthorized === false,
    hostingBoundaryPrepared: lifecycle.hostingDeploysMaximum === 1 && lifecycle.hostingBackupCloneAuthorized === true && lifecycle.hostingRollbackCloneAuthorizedOnFailure === true,
    restoreBaselinePrepared: lifecycle.priorHostingRestoreAuthorized === true && lifecycle.priorHostingRestoreChannel === 'visual-matrix-corrected-backup-31135532118',
    overlayTransitionable: overlay.stopRetryActive === false && overlay.runtimeAllowed === true && overlay.runtimeAllowedOnlyWithFreshExclusiveRequest === true,
    overlayNoBrowserHostingYet: overlay.browserAllowed === false && overlay.hostingAllowed === false,
    overlayExpectedVersion: overlay.expectedNextRequestVersion === REQUEST_VERSION,
    relayExpectedVersion: relay.includes(`ORBIT360_EXPECTED_REQUEST_VERSION: ${REQUEST_VERSION}`),
    relayV16RestoreEvidence: relay.includes('visual-matrix-v16-prior-hosting-restore-sanitized-v20260807.json')
  };
  const all = { ...checks, ...stage };
  const failed = Object.entries(all).filter(([, ok]) => !ok).map(([id]) => id);
  assert(failed.length === 0, 'V16_SOURCE_STAGE_INVALID', failed.join(','));
  writeEvidence('PASS_V16_ACTIVATION_SOURCE_ONLY_HYDRATION_SEQUENCE_AWARE', all, { sourceStagePrepared: true, runtimePending: false });
}

function validateRuntimePending() {
  const checks = rootfixChecks();
  const lifecycle = json(LIFECYCLE);
  const overlay = json(OVERLAY);
  const relay = read(RELAY);
  const runtime = {
    lifecycleRuntimePending: lifecycle.status === 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST' && lifecycle.currentPhase === RUNTIME_PHASE,
    lifecycleExpectedVersion: lifecycle.expectedRequestVersion === REQUEST_VERSION,
    lifecycleRuntimeOnce: lifecycle.allowedExecutions === 1 && lifecycle.executionAuthorized === true && lifecycle.secretAccessAuthorized === true && lifecycle.browserAuthorized === true && lifecycle.hostingDeployAuthorized === true,
    lifecycleWritesDenied: lifecycle.writeAuthorized === false && lifecycle.functionsDeployAuthorized === false && lifecycle.rulesDeployAuthorized === false && lifecycle.productionAuthorized === false && lifecycle.mainAuthorized === false && lifecycle.mergeAuthorized === false,
    overlayRuntimePending: overlay.status === 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST' && overlay.runtimeAllowed === true && overlay.browserAllowed === true && overlay.hostingAllowed === true,
    overlayWritesDenied: overlay.writesAllowed === false && overlay.functionsAllowed === false && overlay.rulesAllowed === false && overlay.reimportAllowed === false && overlay.productionAllowed === false,
    overlayExpectedVersion: overlay.expectedNextRequestVersion === REQUEST_VERSION,
    priorRequestStillConsumedFrozen: json(REQUEST).requestVersion === PRIOR_REQUEST_VERSION && json(REQUEST).consumed === true && json(REQUEST).allowedExecutions === 0 && json(REQUEST).authorizationFrozen === true && json(REQUEST).replayAllowed === false,
    relayExpectedVersion: relay.includes(`ORBIT360_EXPECTED_REQUEST_VERSION: ${REQUEST_VERSION}`),
    relayV16RestoreEvidence: relay.includes('visual-matrix-v16-prior-hosting-restore-sanitized-v20260807.json')
  };
  const all = { ...checks, ...runtime };
  const failed = Object.entries(all).filter(([, ok]) => !ok).map(([id]) => id);
  assert(failed.length === 0, 'V16_RUNTIME_PENDING_INVALID', failed.join(','));
  writeEvidence('PASS_V16_SOURCE_TO_RUNTIME_PENDING_HYDRATION_SEQUENCE_AWARE', all, {
    sourceStagePrepared: true,
    runtimePending: true,
    transitionStatus: 'PASS_SOURCE_TO_RUNTIME_LIFECYCLE_TRANSITION',
    requestCreated: false
  });
}

if (MODE === 'check-rootfix') {
  const checks = rootfixChecks();
  console.log(JSON.stringify({ status: 'PASS_V16_ROOTFIX_SEQUENCE_SOURCE_PRECONDITION', checks, ok: true }, null, 2));
} else if (MODE === 'prepare') {
  prepareSourceStage();
  console.log(JSON.stringify({ status: 'PASS_V16_SOURCE_STAGE_PREPARED', requestVersion: REQUEST_VERSION, ok: true }, null, 2));
} else if (MODE === 'validate-source-stage') {
  validateSourceStage();
  console.log(JSON.stringify({ status: 'PASS_V16_SOURCE_STAGE_VALIDATED', requestVersion: REQUEST_VERSION, ok: true }, null, 2));
} else if (MODE === 'validate-runtime-pending') {
  validateRuntimePending();
  console.log(JSON.stringify({ status: 'PASS_V16_RUNTIME_PENDING_VALIDATED', requestVersion: REQUEST_VERSION, ok: true }, null, 2));
} else {
  fail('MODE_INVALID', MODE);
}
