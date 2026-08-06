#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const PREFLIGHT = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const PRECHECK = process.env.ORBIT360_PRECHECK_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-precheck-sanitized-v20260805.json';
const MATRIX = process.env.ORBIT360_MATRIX_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-matrix-sanitized-v20260805.json';
const FINAL = process.env.ORBIT360_FINAL_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-final-sanitized-v20260805.json';
const LIFECYCLE = process.env.ORBIT360_LIFECYCLE || 'tools/orbit360-validator-lifecycle-contract-visual-observable-rootfix-lab-v20260805.json';
const CLOSURE = process.env.ORBIT360_CLOSURE || 'orbit360-platform/docs/CIERRE-VISUAL-OBSERVABLE-ROOTFIX-LAB-20260805.md';

const read = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
const preflight = read(PREFLIGHT);
const precheck = read(PRECHECK);
const matrix = read(MATRIX);
const lifecycle = read(LIFECYCLE);
const outcomes = {
  preflight: process.env.PREFLIGHT_OUTCOME || 'skipped',
  credential: process.env.CREDENTIAL_OUTCOME || 'skipped',
  runtimeInstall: process.env.RUNTIME_OUTCOME || 'skipped',
  backup: process.env.BACKUP_OUTCOME || 'skipped',
  deploy: process.env.DEPLOY_OUTCOME || 'skipped',
  precheck: process.env.PRECHECK_OUTCOME || 'skipped',
  matrix: process.env.MATRIX_OUTCOME || 'skipped',
  rollback: process.env.ROLLBACK_OUTCOME || 'skipped'
};
const precheckPass = outcomes.precheck === 'success' && precheck && precheck.ok === true && precheck.stage === 'PASS_VISUAL_BROWSER_PRECHECK';
const matrixPass = outcomes.matrix === 'success' && matrix && matrix.ok === true
  && matrix.stage === 'PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX'
  && matrix.snapshotIntegrity === 'VERIFIED_UNCHANGED'
  && matrix.totalRoleFailures === 0;
const pass = preflight && preflight.status === 'GO_GATE_CONTRACT'
  && outcomes.deploy === 'success' && precheckPass && matrixPass;
const rollbackRequired = outcomes.deploy === 'success' && !pass;
const rollbackRestored = rollbackRequired && outcomes.rollback === 'success';
const failureSource = !precheckPass ? precheck : matrix;
const checkpoint = pass ? 'MATRIX_COMPLETE' : (failureSource && (failureSource.checkpoint || failureSource.currentCheckpoint)) || (preflight && preflight.status) || 'PIPELINE_UNKNOWN';
const classification = pass
  ? 'PASS_VISUAL_POST_AUTH'
  : rollbackRequired && !rollbackRestored
    ? 'PIPELINE_MECHANISM_FAILURE'
    : (failureSource && failureSource.classification) || (preflight && preflight.classification) || 'PIPELINE_MECHANISM_FAILURE';
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
  schemaVersion: 'orbit360-visual-observable-rootfix-final-v1',
  gateId: 'block2.7-visual-observable-rootfix-lab-v20260805',
  contractVersion: '2.7.3',
  runId: process.env.GITHUB_RUN_ID || '',
  attempt: Number(process.env.GITHUB_RUN_ATTEMPT || 1),
  stage: pass ? 'PASS_VISUAL_OBSERVABLE_ROOTFIX_LIVE' : 'STOP_RETRY_VISUAL_OBSERVABLE_ROOTFIX',
  decision: pass ? 'PASS_VISUAL_POST_AUTH' : 'STOP_RETRY',
  classification,
  checkpoint,
  preflightStatus: preflight && preflight.status || 'MISSING',
  preflightChecks: preflight && preflight.total || 0,
  outcomes,
  hostingBackupClone: outcomes.backup === 'success',
  hostingDeploys: outcomes.deploy === 'success' ? 1 : 0,
  hostingRollbackRequired: rollbackRequired,
  hostingRollbackRestored: rollbackRestored,
  precheckStage: precheck && precheck.stage || 'NOT_EXECUTED',
  precheckCheckpoint: precheck && precheck.checkpoint || 'NOT_EXECUTED',
  precheckObservedState: precheck && precheck.observedState || null,
  matrixStage: matrix && matrix.stage || 'NOT_EXECUTED',
  matrixCheckpoint: matrix && matrix.currentCheckpoint || 'NOT_EXECUTED',
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
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: pass
};
fs.mkdirSync(path.dirname(FINAL), { recursive: true });
fs.writeFileSync(FINAL, JSON.stringify(final, null, 2) + '\n', 'utf8');

if (!lifecycle) throw new Error('PIPELINE_MECHANISM_FAILURE_LIFECYCLE_MISSING');
lifecycle.ownerVersion = '20260805.2-runtime-consumed';
lifecycle.status = pass ? 'CONSUMED_PASS' : 'CONSUMED_STOP_RETRY';
lifecycle.classification = classification;
lifecycle.currentPhase = pass ? 'LIVE_VISUAL_VERIFIED' : 'CONSUMED_STOP_RETRY';
lifecycle.activeRequest = false;
lifecycle.requestConsumed = true;
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
  classification,
  checkpoint,
  hostingDeploys: final.hostingDeploys,
  rollbackRestored: final.hostingRollbackRestored,
  snapshotIntegrity: final.snapshotIntegrity,
  totalRoleFailures: final.totalRoleFailures
};
lifecycle.nextAction = pass
  ? 'PREPARE_PLATFORM_NATIVE_CRUD_GATE_AND_RESUME_COBROS_4_1'
  : 'CLOSE_EXACT_CHECKPOINT_ROOT_CAUSE_WITHOUT_RETRY';
fs.writeFileSync(LIFECYCLE, JSON.stringify(lifecycle, null, 2) + '\n', 'utf8');

const lines = [
  '# CIERRE VISUAL OBSERVABLE ROOTFIX LAB — 2026-08-05', '',
  '```text',
  'run: ' + final.runId,
  'stage: ' + final.stage,
  'classification: ' + final.classification,
  'checkpoint: ' + final.checkpoint,
  'preflight: ' + final.preflightStatus + ' · ' + final.preflightChecks + ' checks',
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
  pass
    ? 'Salida: `PASS_VISUAL_POST_AUTH`.'
    : 'Salida: `STOP_RETRY`; no se autoriza otra ejecución hasta cerrar la causa exacta del checkpoint indicado.'
];
fs.writeFileSync(CLOSURE, lines.join('\n') + '\n', 'utf8');
console.log(JSON.stringify(final, null, 2));
