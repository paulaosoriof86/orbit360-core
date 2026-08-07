#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const requestPath = process.argv[2] || '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const lifecyclePath = process.argv[3] || 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const overlayPath = process.argv[4] || 'tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json';
const evidencePath = process.argv[5] || 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-corrected-post-auth-preflight-sanitized-v20260805.json';

function readJson(file, required = true) {
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    if (!required) return {};
    throw new Error(`FILE_MISSING:${file}`);
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, ''));
}
function writeJson(file, value) {
  fs.writeFileSync(path.resolve(file), JSON.stringify(value, null, 2) + '\n', 'utf8');
}
function safeCode(value) {
  return String(value || 'RUNTIME_STOP')
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96) || 'RUNTIME_STOP';
}
function falseCapabilities() {
  return {
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
}

const request = readJson(requestPath);
const lifecycle = readJson(lifecyclePath);
const overlay = readJson(overlayPath);
const evidence = readJson(evidencePath, false);

const activeState =
  request.status === 'AUTHORIZED_ONCE' &&
  request.allowedExecutions === 1 &&
  request.consumed === false &&
  request.replayAllowed === false;
const partiallyOrFullyConsumedState =
  request.consumed === true &&
  request.allowedExecutions === 0 &&
  request.replayAllowed === false;
if (!activeState && !partiallyOrFullyConsumedState) {
  console.error(JSON.stringify({
    status: 'STOP_REQUEST_CONSUMPTION_INVALID_STATE',
    requestVersion: request.requestVersion,
    consumed: request.consumed,
    allowedExecutions: request.allowedExecutions,
    authorizationFrozen: request.authorizationFrozen,
    replayAllowed: request.replayAllowed,
    ok: false
  }, null, 2));
  process.exit(41);
}

const evidenceCode = evidence.checkpoint || evidence.error || evidence.relayCheckpoint ||
  (Array.isArray(evidence.failedCheckIds) && evidence.failedCheckIds[0]) ||
  (request.executionResult && request.executionResult.checkpoint) || 'RUNTIME_STOP';
const failureCode = safeCode(evidenceCode);
const classification = String(evidence.classification || request.executionResult?.classification || 'PIPELINE_MECHANISM_FAILURE');
const runId = String(process.env.GITHUB_RUN_ID || request.consumedByRunId || evidence.runId || '');
const attempt = Number(process.env.GITHUB_RUN_ATTEMPT || request.consumedByAttempt || evidence.attempt || 1);
const consumedAt = request.consumedAt || new Date().toISOString();
const checkpoint = String(evidence.checkpoint || evidence.relayCheckpoint || evidence.failedCheckIds?.[0] || request.executionResult?.checkpoint || 'CANONICAL_PREFLIGHT_ENTRYPOINT');
const secretAccessed = Boolean(evidence.secretAccessed ?? evidence.secretAccess ?? request.executionResult?.secretAccessed);
const firebaseAccessed = Boolean(evidence.firebaseAccessed ?? request.executionResult?.firebaseAccessed ?? secretAccessed);
const hostingTouched = Boolean(
  evidence.hostingTouched ?? evidence.hostingDeployAttempted ??
  request.executionResult?.hostingTouched ?? request.executionResult?.hostingDeploys
);
const browserExecuted = Boolean(evidence.browserExecuted ?? request.executionResult?.browserExecuted);
const deployExecuted = Boolean(evidence.deployExecuted ?? evidence.hostingDeployAttempted ?? request.executionResult?.deployExecuted ?? request.executionResult?.hostingDeploys);
const rollbackRestored = Boolean(evidence.hostingRollbackRestored ?? evidence.rollbackRestored ?? request.executionResult?.hostingRollbackRestored);
const snapshotIntegrity = String(evidence.snapshotIntegrity || request.executionResult?.snapshotIntegrity || 'NOT_VERIFIED');

const stoppedRequest = {
  ...request,
  status: `CONSUMED_STOP_RETRY_${failureCode}`,
  allowedExecutions: 0,
  consumed: true,
  authorizationFrozen: true,
  replayAllowed: false,
  capabilities: falseCapabilities(),
  scope: {
    ...(request.scope || {}),
    restorePriorBaselineBeforeRuntime: false,
    hostingDeploysMaximum: 0,
    hostingBackupClone: false,
    hostingRollbackCloneOnFailure: false,
    functionsDeploy: false,
    rulesDeploy: false,
    firestoreWrites: false,
    authWrites: false,
    operationalWrites: false,
    reimport: false,
    production: false,
    main: false,
    merge: false
  },
  executionResult: {
    ...(request.executionResult || {}),
    decision: 'STOP_RETRY',
    classification,
    failureCode,
    checkpoint,
    runId,
    attempt,
    goGateContract: evidence.preflightStatus === 'GO_GATE_CONTRACT' || evidence.status === 'GO_GATE_CONTRACT' || request.executionResult?.goGateContract === 'GRANTED' ? 'GRANTED' : 'NOT_GRANTED',
    secretAccessed,
    firebaseAccessed,
    hostingTouched,
    browserExecuted,
    deployExecuted,
    hostingRollbackRestored: rollbackRestored,
    snapshotIntegrity,
    firestoreWrites: Number(evidence.firestoreWrites ?? request.executionResult?.firestoreWrites ?? 0),
    authWrites: Number(evidence.authWrites ?? request.executionResult?.authWrites ?? 0),
    operationalWrites: Number(evidence.operationalWrites ?? request.executionResult?.operationalWrites ?? 0),
    productionTouched: Boolean(evidence.productionTouched ?? request.executionResult?.productionTouched)
  },
  freshAuthorizationRequiredForAnyFutureRuntime: true,
  consumedAt,
  consumedByRunId: runId,
  consumedByAttempt: attempt
};

const stoppedLifecycle = {
  ...lifecycle,
  status: `STOP_RETRY_${failureCode}`,
  classification,
  secondaryClassification: 'AUTOMATIC_STOP_CONSUMPTION_APPLIED_IDEMPOTENT',
  currentPhase: `STOP_RETRY_${failureCode}`,
  executionProfile: {
    mode: 'STOP_RETRY_NO_RUNTIME',
    phase: `STOP_RETRY_${failureCode}`,
    capabilities: falseCapabilities()
  },
  activeRequest: false,
  requestRetired: true,
  requestConsumed: true,
  authorizationReserved: false,
  authorizationFrozen: true,
  replayAllowed: false,
  allowedExecutions: 0,
  executionAuthorized: false,
  secretAccessAuthorized: false,
  firestoreReadAuthorized: false,
  writeAuthorized: false,
  browserAuthorized: false,
  hostingDeployAuthorized: false,
  functionsDeployAuthorized: false,
  rulesDeployAuthorized: false,
  productionAuthorized: false,
  mainAuthorized: false,
  mergeAuthorized: false,
  stopRetryActive: true,
  hostingDeploysMaximum: 0,
  hostingBackupCloneAuthorized: false,
  hostingRollbackCloneAuthorizedOnFailure: false,
  priorHostingRestoreAuthorized: false,
  protectedState: {
    ...(lifecycle.protectedState || {}),
    passVisualPostAuth: false,
    snapshotIntegrity,
    currentLabRestoredToPreviousVersion: rollbackRestored || lifecycle.protectedState?.currentLabRestoredToPreviousVersion === true
  },
  lastAutomaticStop: { runId, attempt, failureCode, classification, consumedAt, checkpoint },
  nextAction: 'DIAGNOSE_AND_VALIDATE_SOURCE_ONLY. DO NOT REPLAY THIS REQUEST.'
};

const stoppedOverlay = {
  ...overlay,
  status: `STOP_RETRY_${failureCode}`,
  classification,
  checkpoint,
  failureCode,
  stopRetryActive: true,
  requestReusable: false,
  freshAuthorizationRequired: true,
  expectedNextRequestVersion: 'NONE_PENDING_FRESH_AUTHORIZATION',
  runtimeAllowed: false,
  browserAllowed: false,
  hostingAllowed: false,
  productionAllowed: false,
  writesAllowed: false,
  functionsAllowed: false,
  rulesAllowed: false,
  reimportAllowed: false,
  hostingDeploys: Number(evidence.hostingDeploys || request.executionResult?.hostingDeploys || 0),
  rollbackRequired: false,
  rollbackRestored,
  snapshotIntegrity,
  firestoreWrites: Number(evidence.firestoreWrites ?? request.executionResult?.firestoreWrites ?? 0),
  authWrites: Number(evidence.authWrites ?? request.executionResult?.authWrites ?? 0),
  operationalWrites: Number(evidence.operationalWrites ?? request.executionResult?.operationalWrites ?? 0),
  passVisualPostAuth: false,
  ok: false
};

writeJson(requestPath, stoppedRequest);
writeJson(lifecyclePath, stoppedLifecycle);
writeJson(overlayPath, stoppedOverlay);
console.log(JSON.stringify({
  status: partiallyOrFullyConsumedState ? 'PASS_AUTOMATIC_STOP_COMPLETED_FROM_CONSUMED_STATE' : 'PASS_AUTOMATIC_STOP_REQUEST_CONSUMPTION',
  requestVersion: request.requestVersion,
  failureCode,
  classification,
  checkpoint,
  runId,
  allowedExecutions: 0,
  consumed: true,
  authorizationFrozen: true,
  replayAllowed: false,
  runtimeAllowed: false,
  lifecycleStopRetryActive: true,
  overlayStopRetryActive: true,
  rollbackRestored,
  snapshotIntegrity,
  writesByConsumer: 0,
  ok: true
}, null, 2));
