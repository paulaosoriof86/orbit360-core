#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const mode = process.argv[2] || '';

function fail(message, code = 41) {
  if (message) console.error(message);
  process.exit(code);
}
function readJson(file) {
  if (!file) fail('JSON_PATH_MISSING');
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) fail(`JSON_FILE_MISSING:${file}`);
  if (!fs.statSync(resolved).isFile()) fail(`JSON_PATH_NOT_FILE:${file}`);
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    fail(`JSON_PARSE_FAILED:${String(error && error.message || error)}`);
  }
}
function exact(actual, expected) {
  return actual === expected;
}
function writeJson(file, payload) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(path.resolve(file), JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

if (mode === 'emit-failure') {
  const [, , , out, gate, checkpoint, detail, exitCodeRaw] = process.argv;
  const exitCode = Number(exitCodeRaw || 41);
  const payload = {
    schemaVersion: 'orbit360-visual-matrix-runtime-relay-preflight-portable-v1',
    gateId: gate,
    contractVersion: '2.7.8',
    status: 'STOP_PREFLIGHT_RELAY',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    failed: 1,
    failedCheckIds: [checkpoint],
    relayCheckpoint: checkpoint,
    relayDetail: detail,
    relayExitCode: exitCode,
    dataAccess: false,
    secretAccess: false,
    secretsRead: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    runtimeExecuted: false,
    browserExecuted: false,
    backupExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: false
  };
  writeJson(out, payload);
  console.log(JSON.stringify(payload, null, 2));
  process.exit(Number.isInteger(exitCode) ? exitCode : 41);
}

if (mode === 'detect-active-request') {
  const file = process.argv[3];
  const expectedVersion = process.argv[4];
  if (!expectedVersion || expectedVersion === 'NONE_PENDING_FRESH_AUTHORIZATION') process.exit(1);
  const request = readJson(file);
  const ok =
    exact(request.schemaVersion, 'orbit360-visual-matrix-corrected-post-auth-request-v1') &&
    exact(request.requestVersion, expectedVersion) &&
    exact(request.status, 'AUTHORIZED_ONCE') &&
    request.approved === true &&
    request.allowedExecutions === 1 &&
    request.consumed === false &&
    request.authorizationFrozen === false &&
    request.replayAllowed === false &&
    request.scope &&
    request.scope.registeredWorkflowRelayRequired === true;
  process.exit(ok ? 0 : 1);
}

if (mode === 'validate-request') {
  const file = process.argv[3];
  const parent = process.argv[4];
  const expectedVersion = process.argv[5];
  const lifecycleFile = process.argv[6];
  const request = readJson(file);
  const lifecycle = readJson(lifecycleFile);
  const scope = request.scope || {};
  const capabilities = request.capabilities || {};
  const lifecycleCapabilities = lifecycle.executionProfile && lifecycle.executionProfile.capabilities || {};
  const lifecycleStatus = String(lifecycle.status || '');
  const baselineChannel = String(lifecycle.priorHostingRestoreChannel || '');
  const baselineScript = String(lifecycle.priorHostingRestoreScript || '');
  const lifecycleAuthorizedPhase =
    /^AUTHORIZED_FRESH_REQUEST_ONLY_/.test(lifecycleStatus) &&
    /PENDING_EXCLUSIVE_REQUEST$/.test(lifecycleStatus) &&
    lifecycle.stopRetryActive === false &&
    lifecycle.authorizationReserved === true &&
    lifecycle.authorizationFrozen === false &&
    lifecycle.allowedExecutions === 1 &&
    lifecycle.executionAuthorized === false &&
    lifecycle.secretAccessAuthorized === false &&
    lifecycle.browserAuthorized === false &&
    lifecycle.hostingDeployAuthorized === false;
  const ok =
    exact(request.schemaVersion, 'orbit360-visual-matrix-corrected-post-auth-request-v1') &&
    exact(request.requestVersion, expectedVersion) &&
    exact(request.gateId, 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805') &&
    exact(request.contractVersion, '2.7.8') &&
    exact(request.status, 'AUTHORIZED_ONCE') &&
    request.approved === true &&
    request.allowedExecutions === 1 &&
    request.consumed === false &&
    request.authorizationFrozen === false &&
    request.replayAllowed === false &&
    exact(request.parentHead, parent) &&
    exact(request.authorizedBaseHead, parent) &&
    capabilities.secrets === true &&
    capabilities.firestoreRead === true &&
    capabilities.writes === false &&
    capabilities.runtime === true &&
    capabilities.browser === true &&
    capabilities.deploy === true &&
    capabilities.functionsDeploy === false &&
    capabilities.rulesDeploy === false &&
    capabilities.production === false &&
    scope.registeredWorkflowRelayRequired === true &&
    scope.restorePriorBaselineBeforeRuntime === true &&
    baselineChannel.length > 0 &&
    baselineScript.length > 0 &&
    exact(scope.restorePriorBaselineChannel, baselineChannel) &&
    exact(scope.restorePriorBaselineScript, baselineScript) &&
    scope.hostingOnly === true &&
    scope.hostingDeploysMaximum === 1 &&
    scope.hostingBackupClone === true &&
    scope.hostingRollbackCloneOnFailure === true &&
    scope.functionsDeploy === false &&
    scope.rulesDeploy === false &&
    scope.firestoreWrites === false &&
    scope.authWrites === false &&
    scope.operationalWrites === false &&
    scope.reimport === false &&
    scope.production === false &&
    scope.main === false &&
    scope.merge === false &&
    exact(lifecycle.schemaVersion, 'orbit360-validator-lifecycle-contract-v1') &&
    exact(lifecycle.gateId, request.gateId) &&
    exact(lifecycle.gateContractVersion, request.contractVersion) &&
    exact(lifecycle.expectedRequestVersion, expectedVersion) &&
    exact(lifecycle.branch, request.branch) &&
    exact(lifecycle.projectId, request.projectId) &&
    exact(lifecycle.tenantId, request.tenantId) &&
    lifecycle.hostingDeploysMaximum === 1 &&
    lifecycle.hostingBackupCloneAuthorized === true &&
    lifecycle.hostingRollbackCloneAuthorizedOnFailure === true &&
    lifecycleAuthorizedPhase &&
    lifecycleCapabilities.writes === false &&
    lifecycleCapabilities.functionsDeploy === false &&
    lifecycleCapabilities.rulesDeploy === false &&
    lifecycleCapabilities.production === false;
  process.exit(ok ? 0 : 41);
}

if (mode === 'validate-go') {
  const output = readJson(process.argv[3]);
  const ok =
    output.status === 'GO_GATE_CONTRACT' &&
    output.contractVersion === '2.7.8' &&
    output.failed === 0 &&
    output.ok === true &&
    output.executionAuthorized === true &&
    output.secretAccessAuthorized === true &&
    output.firestoreReadAuthorized === true &&
    output.writeAuthorized === false &&
    output.runtimeAuthorized === true &&
    output.browserAuthorized === true &&
    output.hostingDeployAuthorized === true &&
    output.hostingDeploysMaximum === 1 &&
    output.functionsDeployAuthorized === false &&
    output.rulesDeployAuthorized === false &&
    output.productionAuthorized === false &&
    output.secretAccess === false &&
    output.runtimeExecuted === false &&
    output.browserExecuted === false &&
    output.deployExecuted === false &&
    output.firestoreWrites === 0 &&
    output.authWrites === 0 &&
    output.operationalWrites === 0;
  process.exit(ok ? 0 : 41);
}

fail(`UNSUPPORTED_MODE:${mode}`);
