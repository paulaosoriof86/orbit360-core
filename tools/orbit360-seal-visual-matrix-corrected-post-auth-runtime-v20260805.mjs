#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const read = file => file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
const PREFLIGHT = process.env.ORBIT360_PREFLIGHT_EVIDENCE;
const PRECHECK = process.env.ORBIT360_PRECHECK_EVIDENCE;
const MATRIX = process.env.ORBIT360_MATRIX_EVIDENCE;
const FINAL = process.env.ORBIT360_FINAL_EVIDENCE;
const LIFECYCLE = process.env.ORBIT360_LIFECYCLE;
const OVERLAY = process.env.ORBIT360_OVERLAY;
const CLOSURE = process.env.ORBIT360_CLOSURE;

const preflight = read(PREFLIGHT);
const precheck = read(PRECHECK);
const matrix = read(MATRIX);
const lifecycle = read(LIFECYCLE);
const overlay = read(OVERLAY);
const outcomes = {
  registration: process.env.REGISTRATION_OUTCOME || 'skipped',
  preflight: process.env.PREFLIGHT_OUTCOME || 'skipped',
  credential: process.env.CREDENTIAL_OUTCOME || 'skipped',
  runtimeInstall: process.env.RUNTIME_OUTCOME || 'skipped',
  backup: process.env.BACKUP_OUTCOME || 'skipped',
  deploy: process.env.DEPLOY_OUTCOME || 'skipped',
  precheck: process.env.PRECHECK_OUTCOME || 'skipped',
  matrix: process.env.MATRIX_OUTCOME || 'skipped',
  rollback: process.env.ROLLBACK_OUTCOME || 'skipped'
};
const deployAttempted = process.env.DEPLOY_ATTEMPTED === '1';
const precheckPass =
  outcomes.precheck === 'success' &&
  precheck &&
  precheck.ok === true &&
  precheck.stage === 'PASS_VISUAL_BROWSER_PRECHECK';
const matrixPass =
  outcomes.matrix === 'success' &&
  matrix &&
  matrix.ok === true &&
  matrix.stage === 'PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX' &&
  matrix.snapshotIntegrity === 'VERIFIED_UNCHANGED' &&
  matrix.totalRoleFailures === 0;
const pass =
  preflight &&
  preflight.status === 'GO_GATE_CONTRACT' &&
  outcomes.registration === 'success' &&
  outcomes.preflight === 'success' &&
  outcomes.credential === 'success' &&
  outcomes.runtimeInstall === 'success' &&
  outcomes.backup === 'success' &&
  outcomes.deploy === 'success' &&
  precheckPass &&
  matrixPass;
const rollbackRequired = deployAttempted && !pass;
const rollbackRestored = rollbackRequired && outcomes.rollback === 'success';
const browserExecuted = outcomes.precheck !== 'skipped' || outcomes.matrix !== 'skipped' || Boolean(matrix && matrix.currentCheckpoint && matrix.currentCheckpoint !== 'BOOT');

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
function failure() {
  if (pass) return { checkpoint: 'MATRIX_COMPLETE', classification: 'PASS_VISUAL_POST_AUTH' };
  if (outcomes.registration !== 'success') return { checkpoint: 'GATE_REGISTRATION_NOT_PASS', classification: 'VALIDATOR_STALE' };
  if (outcomes.preflight !== 'success' || !preflight || preflight.status !== 'GO_GATE_CONTRACT') {
    return {
      checkpoint: preflight && preflight.status || 'GO_GATE_CONTRACT_NOT_PASS',
      classification: preflight && preflight.classification || 'DATA_CONTRACT_FAILURE'
    };
  }
  if (outcomes.credential !== 'success') return { checkpoint: 'LAB_CREDENTIAL_RESOLUTION_FAILED', classification: 'ENVIRONMENT_FAILURE' };
  if (outcomes.runtimeInstall !== 'success') return { checkpoint: 'RUNTIME_INSTALL_FAILED', classification: 'ENVIRONMENT_FAILURE' };
  if (outcomes.backup !== 'success') return { checkpoint: 'HOSTING_BACKUP_FAILED', classification: 'PIPELINE_MECHANISM_FAILURE' };
  if (outcomes.deploy !== 'success') {
    return {
      checkpoint: rollbackRequired && !rollbackRestored ? 'HOSTING_DEPLOY_FAILED_ROLLBACK_FAILED' : 'HOSTING_DEPLOY_FAILED',
      classification: 'PIPELINE_MECHANISM_FAILURE'
    };
  }
  if (!precheckPass) {
    return {
      checkpoint: rollbackRequired && !rollbackRestored
        ? 'PRECHECK_FAILED_ROLLBACK_FAILED'
        : precheck && (precheck.checkpoint || precheck.currentCheckpoint) || 'OBSERVABLE_PRECHECK_FAILED',
      classification: precheck && precheck.classification || 'ENVIRONMENT_FAILURE'
    };
  }
  if (!matrixPass) {
    return {
      checkpoint: rollbackRequired && !rollbackRestored
        ? 'MATRIX_FAILED_ROLLBACK_FAILED'
        : matrix && (matrix.currentCheckpoint || matrix.checkpoint) || 'VISUAL_MATRIX_FAILED',
      classification: matrix && matrix.classification || 'FUNCTIONAL_DEFECT'
    };
  }
  return { checkpoint: 'PIPELINE_UNKNOWN', classification: 'PIPELINE_MECHANISM_FAILURE' };
}

const failed = failure();
const roles = matrix && Array.isArray(matrix.roles) ? matrix.roles : [];
const captureWarnings = matrix && Array.isArray(matrix.captureWarnings) ? matrix.captureWarnings : [];
const snapshotIntegrity = matrix && matrix.snapshotIntegrity || precheck && precheck.snapshotIntegrity || 'NOT_VERIFIED';
const final = {
  schemaVersion: 'orbit360-visual-matrix-corrected-post-auth-final-v2',
  gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  contractVersion: '2.7.8',
  runId: process.env.GITHUB_RUN_ID || '',
  attempt: Number(process.env.GITHUB_RUN_ATTEMPT || 1),
  stage: pass ? 'PASS_VISUAL_MATRIX_CORRECTED_POST_AUTH_LIVE' : 'STOP_RETRY_VISUAL_MATRIX_CORRECTED_POST_AUTH',
  decision: pass ? 'PASS_VISUAL_POST_AUTH' : 'STOP_RETRY',
  classification: failed.classification,
  checkpoint: failed.checkpoint,
  preflightStatus: preflight && preflight.status || 'MISSING',
  preflightChecks: preflight && preflight.total || 0,
  outcomes,
  authorizationConsumed: true,
  authorizationFrozen: true,
  replayAllowed: false,
  browserExecuted,
  secretAccessed: outcomes.credential !== 'skipped',
  hostingBackupClone: outcomes.backup === 'success',
  hostingDeployAttempted: deployAttempted,
  hostingDeploys: outcomes.deploy === 'success' ? 1 : 0,
  hostingRollbackRequired: rollbackRequired,
  hostingRollbackRestored: rollbackRestored,
  precheckStage: precheck && precheck.stage || 'NOT_EXECUTED',
  precheckCheckpoint: precheck && (precheck.checkpoint || precheck.currentCheckpoint) || 'NOT_EXECUTED',
  matrixStage: outcomes.matrix === 'skipped' ? 'NOT_EXECUTED' : matrix && matrix.stage || 'NOT_EXECUTED',
  matrixCheckpoint: outcomes.matrix === 'skipped' ? 'NOT_EXECUTED' : matrix && (matrix.currentCheckpoint || matrix.checkpoint) || 'NOT_EXECUTED',
  matrixValidatorFinding: outcomes.matrix === 'skipped' ? '' : matrix && matrix.validatorFinding || '',
  routeMetrics: outcomes.matrix === 'skipped' ? [] : matrix && Array.isArray(matrix.routeMetrics) ? matrix.routeMetrics : [],
  roleResults: outcomes.matrix === 'skipped' ? [] : roles,
  totalRoleFailures: outcomes.matrix === 'skipped' ? null : matrix && matrix.totalRoleFailures != null ? matrix.totalRoleFailures : null,
  totalWarnings: outcomes.matrix === 'skipped' ? 0 : matrix && matrix.totalWarnings != null ? matrix.totalWarnings : captureWarnings.length,
  captureWarnings: outcomes.matrix === 'skipped' ? [] : captureWarnings,
  snapshotIntegrity,
  firestoreReads: Number(precheck && precheck.firestoreReads || 0) + (outcomes.matrix === 'skipped' ? 0 : Number(matrix && matrix.firestoreReads || 0)),
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  functionsDeploys: 0,
  rulesDeploys: 0,
  reimports: 0,
  productionTouched: false,
  mainTouched: false,
  mergeExecuted: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: pass
};

if (!FINAL) throw new Error('FINAL_EVIDENCE_PATH_MISSING');
fs.mkdirSync(path.dirname(FINAL), { recursive: true });
write(FINAL, final);

if (!lifecycle || !LIFECYCLE) throw new Error('PIPELINE_MECHANISM_FAILURE_LIFECYCLE_MISSING');
const terminalStatus = pass ? 'CONSUMED_PASS' : `STOP_RETRY_${failed.checkpoint}`;
lifecycle.ownerVersion = '20260807.43-terminal-control-plane-fail-closed';
lifecycle.status = terminalStatus;
lifecycle.classification = final.classification;
lifecycle.currentPhase = pass ? 'LIVE_VISUAL_VERIFIED' : terminalStatus;
lifecycle.executionProfile = {
  mode: pass ? 'CONSUMED_PASS_NO_RUNTIME' : 'STOP_RETRY_NO_RUNTIME',
  phase: pass ? 'LIVE_VISUAL_VERIFIED' : terminalStatus,
  capabilities: falseCapabilities()
};
lifecycle.activeRequest = false;
lifecycle.requestRetired = true;
lifecycle.requestConsumed = true;
lifecycle.authorizationReserved = false;
lifecycle.authorizationFrozen = true;
lifecycle.replayAllowed = false;
lifecycle.allowedExecutions = 0;
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
lifecycle.stopRetryActive = !pass;
lifecycle.hostingDeploysMaximum = 0;
lifecycle.hostingBackupCloneAuthorized = false;
lifecycle.hostingRollbackCloneAuthorizedOnFailure = false;
lifecycle.priorHostingRestoreAuthorized = false;
lifecycle.runtimeResult = {
  runId: final.runId,
  attempt: final.attempt,
  result: pass ? 'PASS' : 'STOP_RETRY',
  classification: final.classification,
  checkpoint: final.checkpoint,
  hostingDeploys: final.hostingDeploys,
  rollbackRestored: final.hostingRollbackRestored,
  snapshotIntegrity: final.snapshotIntegrity,
  totalRoleFailures: final.totalRoleFailures,
  captureWarnings: captureWarnings.length
};
lifecycle.protectedState = lifecycle.protectedState || {};
lifecycle.protectedState.currentLabRestoredToPreviousVersion = rollbackRestored;
lifecycle.protectedState.correctedRootfixHostingLive = pass;
lifecycle.protectedState.passVisualPostAuth = pass;
lifecycle.protectedState.snapshotIntegrity = snapshotIntegrity;
lifecycle.protectedState.hostingState = rollbackRestored ? 'ROLLBACK_RESTORED_AFTER_CURRENT_STOP' : (pass ? 'ROOTFIX_HOSTING_LIVE' : lifecycle.protectedState.hostingState);
lifecycle.nextAction = pass
  ? 'RESUME_COBROS_4_1_AND_PREPARE_PLATFORM_NATIVE_CRUD_GATE'
  : 'CLOSE_EXACT_CHECKPOINT_ROOT_CAUSE_WITHOUT_RETRY';
write(LIFECYCLE, lifecycle);

if (OVERLAY) {
  const nextOverlay = Object.assign({}, overlay || {}, {
    status: terminalStatus,
    classification: final.classification,
    checkpoint: final.checkpoint,
    stopRetryActive: !pass,
    requestReusable: false,
    freshAuthorizationRequired: !pass,
    expectedNextRequestVersion: 'NONE_PENDING_FRESH_AUTHORIZATION',
    runtimeAllowed: false,
    browserAllowed: false,
    hostingAllowed: false,
    productionAllowed: false,
    writesAllowed: false,
    functionsAllowed: false,
    rulesAllowed: false,
    reimportAllowed: false,
    hostingDeploys: final.hostingDeploys,
    browserExecuted: final.browserExecuted,
    hostingTouched: final.hostingDeployAttempted,
    rollbackRequired: false,
    rollbackRestored,
    snapshotIntegrity,
    firestoreReads: final.firestoreReads,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    passVisualPostAuth: pass,
    ok: pass
  });
  write(OVERLAY, nextOverlay);
}

if (!CLOSURE) throw new Error('CLOSURE_PATH_MISSING');
const lines = [
  '# CIERRE MATRIZ VISUAL CORREGIDA POST-AUTH — 2026-08-05',
  '',
  '~~~text',
  'run: ' + final.runId,
  'stage: ' + final.stage,
  'classification: ' + final.classification,
  'checkpoint: ' + final.checkpoint,
  'preflight: ' + final.preflightStatus + ' · ' + final.preflightChecks,
  'Hosting deploys: ' + final.hostingDeploys,
  'rollback required: ' + final.hostingRollbackRequired,
  'rollback restored: ' + final.hostingRollbackRestored,
  'precheck: ' + final.precheckStage + ' · ' + final.precheckCheckpoint,
  'matrix: ' + final.matrixStage + ' · ' + final.matrixCheckpoint,
  'snapshot: ' + final.snapshotIntegrity,
  'role failures: ' + String(final.totalRoleFailures),
  'capture warnings: ' + String(captureWarnings.length),
  'request/lifecycle/overlay terminal fail-closed: true',
  'Firestore/Auth/operational writes: 0',
  'Functions/Rules/reimport/production/main/merge: 0',
  '~~~',
  '',
  pass ? 'Salida: PASS_VISUAL_POST_AUTH.' : 'Salida: STOP_RETRY; no se repite la ejecución.'
];
fs.mkdirSync(path.dirname(CLOSURE), { recursive: true });
fs.writeFileSync(CLOSURE, lines.join('\n') + '\n', 'utf8');
console.log(JSON.stringify(final, null, 2));
