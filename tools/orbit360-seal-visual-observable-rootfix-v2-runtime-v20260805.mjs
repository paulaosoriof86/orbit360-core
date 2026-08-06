#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const PREFLIGHT = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const PRECHECK = process.env.ORBIT360_PRECHECK_EVIDENCE;
const MATRIX = process.env.ORBIT360_MATRIX_EVIDENCE;
const FINAL = process.env.ORBIT360_FINAL_EVIDENCE;
const LIFECYCLE = process.env.ORBIT360_LIFECYCLE;
const CLOSURE = process.env.ORBIT360_CLOSURE;
const read = file => file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
const preflight = read(PREFLIGHT);
const precheck = read(PRECHECK);
const matrix = read(MATRIX);
const lifecycle = read(LIFECYCLE);
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
const precheckPass = outcomes.precheck === 'success' && precheck && precheck.ok === true && precheck.stage === 'PASS_VISUAL_BROWSER_PRECHECK';
const matrixPass = outcomes.matrix === 'success' && matrix && matrix.ok === true
  && matrix.stage === 'PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX'
  && matrix.snapshotIntegrity === 'VERIFIED_UNCHANGED'
  && matrix.totalRoleFailures === 0;
const pass = preflight && preflight.status === 'GO_GATE_CONTRACT'
  && outcomes.registration === 'success'
  && outcomes.preflight === 'success'
  && outcomes.credential === 'success'
  && outcomes.runtimeInstall === 'success'
  && outcomes.backup === 'success'
  && outcomes.deploy === 'success'
  && precheckPass && matrixPass;
const rollbackRequired = deployAttempted && !pass;
const rollbackRestored = rollbackRequired && outcomes.rollback === 'success';

function failure() {
  if (pass) return { checkpoint: 'MATRIX_COMPLETE', classification: 'PASS_VISUAL_POST_AUTH' };
  if (outcomes.registration !== 'success') return { checkpoint: 'GATE_REGISTRATION_NOT_PASS', classification: 'VALIDATOR_STALE' };
  if (outcomes.preflight !== 'success' || !preflight || preflight.status !== 'GO_GATE_CONTRACT') {
    return { checkpoint: preflight && preflight.status || 'GO_GATE_CONTRACT_NOT_PASS', classification: preflight && preflight.classification || 'DATA_CONTRACT_FAILURE' };
  }
  if (outcomes.credential !== 'success') return { checkpoint: 'LAB_CREDENTIAL_RESOLUTION_FAILED', classification: 'ENVIRONMENT_FAILURE' };
  if (outcomes.runtimeInstall !== 'success') return { checkpoint: 'RUNTIME_INSTALL_FAILED', classification: 'ENVIRONMENT_FAILURE' };
  if (outcomes.backup !== 'success') return { checkpoint: 'HOSTING_BACKUP_FAILED', classification: 'PIPELINE_MECHANISM_FAILURE' };
  if (outcomes.deploy !== 'success') {
    return rollbackRequired && !rollbackRestored
      ? { checkpoint: 'HOSTING_DEPLOY_FAILED_ROLLBACK_FAILED', classification: 'PIPELINE_MECHANISM_FAILURE' }
      : { checkpoint: 'HOSTING_DEPLOY_FAILED', classification: 'PIPELINE_MECHANISM_FAILURE' };
  }
  if (!precheckPass) {
    if (rollbackRequired && !rollbackRestored) return { checkpoint: 'PRECHECK_FAILED_ROLLBACK_FAILED', classification: 'PIPELINE_MECHANISM_FAILURE' };
    return {
      checkpoint: precheck && (precheck.checkpoint || precheck.currentCheckpoint) || 'OBSERVABLE_PRECHECK_FAILED',
      classification: precheck && precheck.classification || 'ENVIRONMENT_FAILURE'
    };
  }
  if (!matrixPass) {
    if (rollbackRequired && !rollbackRestored) return { checkpoint: 'MATRIX_FAILED_ROLLBACK_FAILED', classification: 'PIPELINE_MECHANISM_FAILURE' };
    return {
      checkpoint: matrix && (matrix.currentCheckpoint || matrix.checkpoint) || 'VISUAL_MATRIX_FAILED',
      classification: matrix && matrix.classification || 'FUNCTIONAL_DEFECT'
    };
  }
  return { checkpoint: 'PIPELINE_UNKNOWN', classification: 'PIPELINE_MECHANISM_FAILURE' };
}

const failed = failure();
const roleResults = matrix && Array.isArray(matrix.roles) ? matrix.roles.map(role => ({
  role: role.role,
  viewport: role.viewport,
  membershipHash: role.membershipHash,
  loginMs: role.loginMs,
  initialReadyMs: role.initialReadyMs,
  routeTimings: role.routeTimings,
  failed: role.failed,
  warnings: role.warnings,
  checks: role.checks,
  screenshots: role.screenshots,
  ok: role.ok
})) : [];
const final = {
  schemaVersion: 'orbit360-visual-observable-rootfix-v2-final-v1',
  gateId: 'block2.7-visual-observable-rootfix-v2-lab-v20260805',
  contractVersion: '2.7.5',
  runId: process.env.GITHUB_RUN_ID || '',
  attempt: Number(process.env.GITHUB_RUN_ATTEMPT || 1),
  stage: pass ? 'PASS_VISUAL_OBSERVABLE_ROOTFIX_LIVE' : 'STOP_RETRY_VISUAL_OBSERVABLE_ROOTFIX',
  decision: pass ? 'PASS_VISUAL_POST_AUTH' : 'STOP_RETRY',
  classification: failed.classification,
  checkpoint: failed.checkpoint,
  preflightStatus: preflight && preflight.status || 'MISSING',
  preflightChecks: preflight && preflight.total || 0,
  outcomes,
  authorizationConsumed: true,
  secretAccessed: outcomes.credential !== 'skipped',
  hostingBackupClone: outcomes.backup === 'success',
  hostingDeployAttempted: deployAttempted,
  hostingDeploys: outcomes.deploy === 'success' ? 1 : 0,
  hostingRollbackRequired: rollbackRequired,
  hostingRollbackRestored: rollbackRestored,
  precheckStage: precheck && precheck.stage || 'NOT_EXECUTED',
  precheckCheckpoint: precheck && (precheck.checkpoint || precheck.currentCheckpoint) || 'NOT_EXECUTED',
  precheckObservedState: precheck && precheck.observedState || null,
  matrixStage: matrix && matrix.stage || 'NOT_EXECUTED',
  matrixCheckpoint: matrix && (matrix.currentCheckpoint || matrix.checkpoint) || 'NOT_EXECUTED',
  matrixObservedState: matrix && matrix.observedState || null,
  roleResults,
  totalRoleFailures: matrix && matrix.totalRoleFailures != null ? matrix.totalRoleFailures : null,
  totalWarnings: matrix && matrix.totalWarnings != null ? matrix.totalWarnings : null,
  snapshotIntegrity: matrix && matrix.snapshotIntegrity || (precheck && precheck.snapshotIntegrity) || 'NOT_VERIFIED',
  firestoreReads: Number((precheck && precheck.firestoreReads) || 0) + Number((matrix && matrix.firestoreReads) || 0),
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  functionsDeploys: 0,
  rulesDeploys: 0,
  reimports: 0,
  productionTouched: false,
  mainTouched: false,
  mergeExecuted: false,
  hydrationOverlayRequired: true,
  hydrationSourcePass: true,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: pass
};
fs.mkdirSync(path.dirname(FINAL), { recursive: true });
fs.writeFileSync(FINAL, JSON.stringify(final, null, 2) + '\n', 'utf8');
if (!lifecycle) throw new Error('PIPELINE_MECHANISM_FAILURE_LIFECYCLE_MISSING');
lifecycle.ownerVersion = '20260805.5-runtime-consumed-exact-checkpoint';
lifecycle.status = pass ? 'CONSUMED_PASS' : 'CONSUMED_STOP_RETRY';
lifecycle.classification = final.classification;
lifecycle.currentPhase = pass ? 'LIVE_VISUAL_VERIFIED' : 'CONSUMED_STOP_RETRY';
lifecycle.activeRequest = false;
lifecycle.requestConsumed = true;
lifecycle.authorizationReserved = false;
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
lifecycle.runtimeResult = {
  runId: final.runId,
  attempt: final.attempt,
  result: pass ? 'PASS' : 'STOP_RETRY',
  classification: final.classification,
  checkpoint: final.checkpoint,
  hostingDeployAttempted: final.hostingDeployAttempted,
  hostingDeploys: final.hostingDeploys,
  rollbackRestored: final.hostingRollbackRestored,
  snapshotIntegrity: final.snapshotIntegrity,
  totalRoleFailures: final.totalRoleFailures
};
lifecycle.protectedState.currentLabRestoredToPreviousVersion = rollbackRestored;
lifecycle.protectedState.rootfixHostingLive = pass;
lifecycle.protectedState.passVisualPostAuth = pass;
lifecycle.nextAction = pass
  ? 'PREPARE_PLATFORM_NATIVE_CRUD_GATE_AND_RESUME_COBROS_4_1'
  : 'CLOSE_EXACT_CHECKPOINT_ROOT_CAUSE_WITHOUT_RETRY';
fs.writeFileSync(LIFECYCLE, JSON.stringify(lifecycle, null, 2) + '\n', 'utf8');
const lines = [
  '# CIERRE VISUAL OBSERVABLE ROOTFIX V2 LAB — 2026-08-05', '',
  '```text',
  'run: ' + final.runId,
  'stage: ' + final.stage,
  'classification: ' + final.classification,
  'checkpoint: ' + final.checkpoint,
  'preflight: ' + final.preflightStatus + ' · ' + final.preflightChecks + ' checks',
  'Hosting deploy attempted: ' + final.hostingDeployAttempted,
  'Hosting deploys: ' + final.hostingDeploys,
  'rollback required: ' + final.hostingRollbackRequired,
  'rollback restored: ' + final.hostingRollbackRestored,
  'precheck: ' + final.precheckStage + ' · ' + final.precheckCheckpoint,
  'matrix: ' + final.matrixStage + ' · ' + final.matrixCheckpoint,
  'snapshot: ' + final.snapshotIntegrity,
  'role failures: ' + String(final.totalRoleFailures),
  'Firestore/Auth/operational writes: 0',
  'Functions/Rules deploys: 0',
  'production/main/merge: 0',
  '```', '',
  pass ? 'Salida: `PASS_VISUAL_POST_AUTH`.' : 'Salida: `STOP_RETRY`; no se repite la ejecución.'
];
fs.writeFileSync(CLOSURE, lines.join('\n') + '\n', 'utf8');
console.log(JSON.stringify(final, null, 2));
