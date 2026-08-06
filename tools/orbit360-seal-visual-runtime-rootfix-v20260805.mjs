#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const LIVE = process.env.ORBIT360_LIVE_EVIDENCE;
const FINAL = process.env.ORBIT360_FINAL_EVIDENCE;
const PREFLIGHT = path.join(process.env.ORBIT360_EVIDENCE_DIR || '', 'preflight-sanitizado.json');
const LIFECYCLE = process.env.ORBIT360_LIFECYCLE;
const CLOSURE = process.env.ORBIT360_CLOSURE;

const read = file => file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
const live = read(LIVE);
const pre = read(PREFLIGHT);
const lifecycle = read(LIFECYCLE);
if (!lifecycle) throw new Error('PIPELINE_MECHANISM_FAILURE_LIFECYCLE_MISSING');

const pass = process.env.LIVE_OUTCOME === 'success'
  && live && live.ok === true
  && live.stage === 'PASS_VISUAL_RUNTIME_ROOTFIX_LIVE'
  && live.snapshotIntegrity === 'VERIFIED_UNCHANGED';
const rollbackRequired = process.env.DEPLOY_OUTCOME === 'success' && !pass;
const rollbackRestored = !rollbackRequired || process.env.ROLLBACK_OUTCOME === 'success';
const classification = pass
  ? 'PASS_VISUAL_POST_AUTH'
  : !rollbackRestored
    ? 'PIPELINE_MECHANISM_FAILURE'
    : (live && live.classification) || 'ENVIRONMENT_FAILURE';

const final = {
  schemaVersion: 'orbit360-visual-runtime-rootfix-final-v1',
  gateId: 'block2.7-visual-runtime-rootfix-lab-v20260805',
  contractVersion: '2.7.2',
  runId: process.env.GITHUB_RUN_ID || '',
  attempt: Number(process.env.GITHUB_RUN_ATTEMPT || 1),
  stage: pass ? 'PASS_VISUAL_RUNTIME_ROOTFIX_LIVE' : 'STOP_RETRY_VISUAL_RUNTIME_ROOTFIX',
  decision: pass ? 'PASS_VISUAL_POST_AUTH' : 'STOP_RETRY',
  classification,
  preflightStatus: pre && pre.status || 'MISSING',
  preflightChecks: pre && pre.total || 0,
  hostingBackupClone: process.env.BACKUP_OUTCOME === 'success',
  hostingDeploys: process.env.DEPLOY_OUTCOME === 'success' ? 1 : 0,
  hostingRollbackRequired: rollbackRequired,
  hostingRollbackRestored: rollbackRequired && process.env.ROLLBACK_OUTCOME === 'success',
  liveTestOutcome: process.env.LIVE_OUTCOME || 'skipped',
  roleResults: live && Array.isArray(live.roles) ? live.roles.map(role => ({
    role: role.role,
    viewport: role.viewport,
    loginMs: role.loginMs,
    initialReadyMs: role.initialReadyMs,
    failed: role.failed,
    warnings: role.warnings,
    routeTimings: role.routeTimings,
    checks: role.checks,
    screenshots: role.screenshots,
    ok: role.ok
  })) : [],
  totalRoleFailures: live && live.totalRoleFailures != null ? live.totalRoleFailures : null,
  totalWarnings: live && live.totalWarnings != null ? live.totalWarnings : null,
  snapshotIntegrity: live && live.snapshotIntegrity || 'NOT_VERIFIED',
  firestoreReads: live && live.firestoreReads || 0,
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

lifecycle.ownerVersion = '20260805.5-runtime-consumed';
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
  hostingDeploys: final.hostingDeploys,
  rollbackRestored: final.hostingRollbackRestored,
  snapshotIntegrity: final.snapshotIntegrity,
  totalRoleFailures: final.totalRoleFailures
};
lifecycle.nextAction = pass
  ? 'PREPARE_PLATFORM_NATIVE_CRUD_GATE_AND_RESUME_COBROS_4_1'
  : 'CLOSE_ROOT_CAUSE_FROM_CURRENT_RUN_WITHOUT_RETRY';
fs.writeFileSync(LIFECYCLE, JSON.stringify(lifecycle, null, 2) + '\n', 'utf8');

const lines = [
  '# CIERRE VISUAL RUNTIME ROOTFIX LAB — 2026-08-05',
  '',
  '```text',
  `run: ${final.runId}`,
  `stage: ${final.stage}`,
  `classification: ${final.classification}`,
  `preflight: ${final.preflightStatus} · ${final.preflightChecks} checks`,
  `Hosting deploys: ${final.hostingDeploys}`,
  `rollback restored: ${final.hostingRollbackRestored}`,
  `snapshot: ${final.snapshotIntegrity}`,
  `role failures: ${String(final.totalRoleFailures)}`,
  'Firestore/Auth/operational writes: 0',
  'Functions/Rules deploys: 0',
  'production/main/merge: 0',
  '```',
  '',
  pass
    ? 'Salida: `PASS_VISUAL_POST_AUTH`.'
    : 'Salida: `STOP_RETRY`; no se autoriza otro deploy hasta cerrar la causa exacta del run.'
];
fs.writeFileSync(CLOSURE, lines.join('\n') + '\n', 'utf8');
console.log(JSON.stringify(final, null, 2));
