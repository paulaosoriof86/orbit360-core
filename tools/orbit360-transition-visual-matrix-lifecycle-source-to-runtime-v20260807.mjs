#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const [lifecyclePath, overlayPath, priorRequestPath, expectedRequestVersion] = process.argv.slice(2);
const RUNTIME_PHASE = 'VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION';
const RUNTIME_STATUS = 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST';
const RUNTIME_CAPABILITIES = {
  secrets: true,
  firestoreRead: true,
  writes: false,
  runtime: true,
  browser: true,
  deploy: true,
  functionsDeploy: false,
  rulesDeploy: false,
  production: false
};

function fail(code, detail) {
  console.error(JSON.stringify({ status: 'STOP_LIFECYCLE_TRANSITION', code, detail, ok: false }));
  process.exit(41);
}
function readJson(file, label) {
  if (!file) fail(`${label}_PATH_MISSING`, '');
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) fail(`${label}_FILE_MISSING`, file);
  try { return JSON.parse(fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, '')); }
  catch (error) { fail(`${label}_JSON_INVALID`, String(error && error.message || error)); }
}
function writeJson(file, value) {
  fs.writeFileSync(path.resolve(file), JSON.stringify(value, null, 2) + '\n', 'utf8');
}

if (!expectedRequestVersion || expectedRequestVersion === 'NONE_PENDING_FRESH_AUTHORIZATION') {
  fail('EXPECTED_REQUEST_VERSION_INVALID', expectedRequestVersion || '');
}

const lifecycle = readJson(lifecyclePath, 'LIFECYCLE');
const overlay = readJson(overlayPath, 'OVERLAY');
const priorRequest = readJson(priorRequestPath, 'PRIOR_REQUEST');

const sourceStageOk =
  lifecycle.schemaVersion === 'orbit360-validator-lifecycle-contract-v1' &&
  lifecycle.validatorLifecycleRevision === 'phase-capability-contract-v1' &&
  lifecycle.gateId === 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805' &&
  lifecycle.gateContractVersion === '2.7.8' &&
  /^AUTHORIZED_FRESH_REQUEST_ONLY_/.test(String(lifecycle.status || '')) &&
  /_PENDING_EXCLUSIVE_REQUEST$/.test(String(lifecycle.status || '')) &&
  lifecycle.classification === 'SOURCE_ONLY_ACTIVATION_VALIDATED' &&
  lifecycle.stopRetryActive === false &&
  lifecycle.authorizationReserved === true &&
  lifecycle.authorizationFrozen === false &&
  lifecycle.allowedExecutions === 1 &&
  lifecycle.executionAuthorized === false &&
  lifecycle.secretAccessAuthorized === false &&
  lifecycle.firestoreReadAuthorized === false &&
  lifecycle.writeAuthorized === false &&
  lifecycle.browserAuthorized === false &&
  lifecycle.hostingDeployAuthorized === false &&
  lifecycle.productionAuthorized === false &&
  lifecycle.sourcePrerequisites &&
  /^PASS_/.test(String(lifecycle.sourcePrerequisites.activationSourceStatus || ''));
if (!sourceStageOk) fail('SOURCE_ACTIVATION_NOT_VALIDATED', String(lifecycle.status || ''));

const priorRequestClosed =
  priorRequest.consumed === true &&
  priorRequest.allowedExecutions === 0 &&
  priorRequest.authorizationFrozen === true &&
  priorRequest.replayAllowed === false;
if (!priorRequestClosed) fail('PRIOR_REQUEST_NOT_CLOSED', String(priorRequest.requestVersion || ''));

if (overlay.stopRetryActive === true || overlay.runtimeAllowed !== true || overlay.runtimeAllowedOnlyWithFreshExclusiveRequest !== true) {
  fail('SOURCE_OVERLAY_NOT_TRANSITIONABLE', String(overlay.status || ''));
}
if (lifecycle.expectedRequestVersion !== expectedRequestVersion || overlay.expectedNextRequestVersion !== expectedRequestVersion) {
  fail('REQUEST_VERSION_NOT_RESERVED_BY_SOURCE_STAGE', expectedRequestVersion);
}
if (lifecycle.hostingDeploysMaximum !== 1 || lifecycle.hostingBackupCloneAuthorized !== true || lifecycle.hostingRollbackCloneAuthorizedOnFailure !== true) {
  fail('HOSTING_BOUNDARY_INVALID', '');
}
if (!lifecycle.priorHostingRestoreChannel || !lifecycle.priorHostingRestoreScript) fail('BASELINE_CONTRACT_INCOMPLETE', '');

const transitionedLifecycle = {
  ...lifecycle,
  ownerVersion: String(lifecycle.ownerVersion || '') + '-runtime-pending',
  status: RUNTIME_STATUS,
  classification: 'RUNTIME_PENDING_EXCLUSIVE_REQUEST_SOURCE_VALIDATED',
  secondaryClassification: 'TWO_PHASE_LIFECYCLE_TRANSITION_APPLIED',
  currentPhase: RUNTIME_PHASE,
  executionProfile: {
    mode: 'RUNTIME_ONCE_ONLY_WITH_FRESH_EXCLUSIVE_REQUEST',
    phase: RUNTIME_PHASE,
    capabilities: RUNTIME_CAPABILITIES
  },
  activeRequest: false,
  requestRetired: false,
  requestConsumed: false,
  authorizationReserved: true,
  authorizationFrozen: false,
  replayAllowed: false,
  allowedExecutions: 1,
  executionAuthorized: true,
  secretAccessAuthorized: true,
  firestoreReadAuthorized: true,
  writeAuthorized: false,
  browserAuthorized: true,
  hostingDeployAuthorized: true,
  functionsDeployAuthorized: false,
  rulesDeployAuthorized: false,
  productionAuthorized: false,
  mainAuthorized: false,
  mergeAuthorized: false,
  stopRetryActive: false,
  nextAction: 'CREATE_EXACTLY_ONE_EXCLUSIVE_IMMUTABLE_REQUEST_COMMIT_BOUND_TO_THIS_RUNTIME_PENDING_LIFECYCLE.'
};

const transitionedOverlay = {
  ...overlay,
  status: RUNTIME_STATUS,
  classification: 'RUNTIME_PENDING_EXCLUSIVE_REQUEST_SOURCE_VALIDATED',
  checkpoint: 'SOURCE_TO_RUNTIME_LIFECYCLE_TRANSITION_PASS',
  stopRetryActive: false,
  requestReusable: false,
  freshAuthorizationRequired: false,
  expectedNextRequestVersion: expectedRequestVersion,
  runtimeAllowed: true,
  runtimeAllowedOnlyWithFreshExclusiveRequest: true,
  browserAllowed: true,
  hostingAllowed: true,
  productionAllowed: false,
  writesAllowed: false,
  functionsAllowed: false,
  rulesAllowed: false,
  reimportAllowed: false,
  ok: true
};

writeJson(lifecyclePath, transitionedLifecycle);
writeJson(overlayPath, transitionedOverlay);
console.log(JSON.stringify({
  status: 'PASS_SOURCE_TO_RUNTIME_LIFECYCLE_TRANSITION',
  requestVersion: expectedRequestVersion,
  lifecycleStatus: transitionedLifecycle.status,
  lifecyclePhase: transitionedLifecycle.currentPhase,
  runtimeCapabilities: transitionedLifecycle.executionProfile.capabilities,
  priorRequestClosed: true,
  secretAccess: false,
  runtimeExecuted: false,
  browserExecuted: false,
  hostingTouched: false,
  deployExecuted: false,
  writes: 0,
  ok: true
}, null, 2));
