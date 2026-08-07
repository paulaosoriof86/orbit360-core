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

const request = readJson(requestPath);
const lifecycle = readJson(lifecyclePath);
const overlay = readJson(overlayPath);
const evidence = readJson(evidencePath, false);

if (request.consumed === true && request.allowedExecutions === 0 && request.authorizationFrozen === true) {
  console.log(JSON.stringify({ status: 'PASS_STOP_REQUEST_ALREADY_CONSUMED', requestVersion: request.requestVersion, ok: true }, null, 2));
  process.exit(0);
}
if (request.status !== 'AUTHORIZED_ONCE' || request.allowedExecutions !== 1 || request.consumed !== false || request.replayAllowed !== false) {
  console.error(JSON.stringify({ status: 'STOP_REQUEST_CONSUMPTION_INVALID_ACTIVE_STATE', requestVersion: request.requestVersion, ok: false }, null, 2));
  process.exit(41);
}

const evidenceCode = evidence.error || evidence.relayCheckpoint || (Array.isArray(evidence.failedCheckIds) && evidence.failedCheckIds[0]) || 'RUNTIME_STOP';
const failureCode = safeCode(evidenceCode);
const classification = evidence.status === 'VALIDATOR_STALE' ? 'VALIDATOR_STALE' : String(evidence.classification || 'PIPELINE_MECHANISM_FAILURE');
const runId = String(process.env.GITHUB_RUN_ID || '');
const attempt = Number(process.env.GITHUB_RUN_ATTEMPT || 1);
const consumedAt = new Date().toISOString();

const stoppedRequest = {
  ...request,
  status: `CONSUMED_STOP_RETRY_${failureCode}`,
  allowedExecutions: 0,
  consumed: true,
  authorizationFrozen: true,
  replayAllowed: false,
  capabilities: {
    secrets: false,
    firestoreRead: false,
    writes: false,
    runtime: false,
    browser: false,
    deploy: false,
    functionsDeploy: false,
    rulesDeploy: false,
    production: false
  },
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
    decision: 'STOP_RETRY',
    classification,
    failureCode,
    checkpoint: String(evidence.relayCheckpoint || evidence.failedCheckIds?.[0] || 'CANONICAL_PREFLIGHT_ENTRYPOINT'),
    runId,
    attempt,
    goGateContract: evidence.status === 'GO_GATE_CONTRACT' ? 'GRANTED' : 'NOT_GRANTED',
    secretAccessed: Boolean(evidence.secretAccess),
    firebaseAccessed: false,
    hostingTouched: Boolean(evidence.hostingTouched),
    browserExecuted: Boolean(evidence.browserExecuted),
    deployExecuted: Boolean(evidence.deployExecuted),
    firestoreWrites: Number(evidence.firestoreWrites || 0),
    authWrites: Number(evidence.authWrites || 0),
    operationalWrites: Number(evidence.operationalWrites || 0),
    productionTouched: Boolean(evidence.productionTouched)
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
  secondaryClassification: 'AUTOMATIC_STOP_CONSUMPTION_APPLIED',
  currentPhase: `STOP_RETRY_${failureCode}`,
  executionProfile: {
    mode: 'STOP_RETRY_NO_RUNTIME',
    phase: `STOP_RETRY_${failureCode}`,
    capabilities: {
      secrets: false,
      firestoreRead: false,
      writes: false,
      runtime: false,
      browser: false,
      deploy: false,
      functionsDeploy: false,
      rulesDeploy: false,
      production: false
    }
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
  lastAutomaticStop: { runId, attempt, failureCode, classification, consumedAt },
  nextAction: 'DIAGNOSE_AND_VALIDATE_SOURCE_ONLY. DO_NOT REPLAY THIS REQUEST.'
};

const stoppedOverlay = {
  ...overlay,
  status: `STOP_RETRY_${failureCode}`,
  classification,
  checkpoint: String(evidence.relayCheckpoint || evidence.failedCheckIds?.[0] || 'CANONICAL_PREFLIGHT_ENTRYPOINT'),
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
  hostingDeploys: 0,
  ok: false
};

writeJson(requestPath, stoppedRequest);
writeJson(lifecyclePath, stoppedLifecycle);
writeJson(overlayPath, stoppedOverlay);
console.log(JSON.stringify({
  status: 'PASS_AUTOMATIC_STOP_REQUEST_CONSUMPTION',
  requestVersion: request.requestVersion,
  failureCode,
  classification,
  runId,
  allowedExecutions: 0,
  consumed: true,
  authorizationFrozen: true,
  replayAllowed: false,
  runtimeAllowed: false,
  secretAccess: false,
  hostingTouchedByConsumer: false,
  browserExecutedByConsumer: false,
  deployExecutedByConsumer: false,
  writesByConsumer: 0,
  ok: true
}, null, 2));
