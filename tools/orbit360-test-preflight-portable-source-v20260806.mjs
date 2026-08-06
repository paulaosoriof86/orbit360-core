#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const rel = name => path.join(ROOT, name);
const files = {
  router: rel('tools/orbit360-validar-gate-contracts-v20260717.mjs'),
  preflight: rel('tools/orbit360-preflight-visual-matrix-runtime-relay-v8-v20260806.sh'),
  guard: rel('tools/orbit360-json-guard-visual-matrix-runtime-v20260806.mjs'),
  workflow: rel('.github/workflows/orbit360-claude-paquete-reconciliado-v1205.yml'),
  overlay: rel('tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json')
};
const read = file => fs.readFileSync(file, 'utf8');
const router = read(files.router);
const preflight = read(files.preflight);
const workflow = read(files.workflow);
const overlay = JSON.parse(read(files.overlay));
const checks = {};

checks.filesExist = Object.values(files).every(fs.existsSync);
checks.routerPropagatesRequest = router.includes('ORBIT360_REQUEST_FILE: requestFile');
checks.routerGuardsFileType = router.includes('fs.statSync(requestAbs).isFile()');
checks.routerRequiresFreshVersion = router.includes('FRESH_AUTHORIZATION_NOT_REGISTERED') && router.includes('CANONICAL_REQUEST_VERSION_MISMATCH');
checks.routerHonorsStopOverlay = router.includes('STOP_RETRY_ACTIVE_FRESH_AUTHORIZATION_REQUIRED');
checks.preflightNoJq = !/\bjq\b/.test(preflight);
checks.workflowNoJq = !/\bjq\b/.test(workflow);
checks.preflightUsesGuard = preflight.includes('orbit360-json-guard-visual-matrix-runtime-v20260806.mjs');
checks.workflowUsesGuard = workflow.includes('detect-active-request');
checks.workflowRequiresFreshVersion = workflow.includes('20260806.9-portable-preflight-runtime');
checks.overlayClosesV8 = overlay.stopRetryActive === true && overlay.requestReusable === false;
checks.overlayNoRuntime = overlay.runtimeAllowed === false && overlay.hostingAllowed === false && overlay.productionAllowed === false;
checks.overlayFreshAuth = overlay.freshAuthorizationRequired === true && overlay.expectedNextRequestVersion === '20260806.9-portable-preflight-runtime';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-preflight-source-'));
const syntheticRequest = {
  schemaVersion: 'orbit360-visual-matrix-corrected-post-auth-request-v1',
  requestVersion: '20260806.9-portable-preflight-runtime',
  gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  contractVersion: '2.7.8',
  status: 'AUTHORIZED_ONCE',
  approved: true,
  allowedExecutions: 1,
  consumed: false,
  authorizationFrozen: false,
  replayAllowed: false,
  parentHead: 'a'.repeat(40),
  scope: {
    registeredWorkflowRelayRequired: true,
    restorePriorV6BackupBeforeRuntime: true,
    restorePriorV6BackupChannel: 'visual-matrix-corrected-backup-31116830824',
    hostingDeploysMaximum: 1,
    functionsDeploy: false,
    rulesDeploy: false,
    firestoreWrites: false,
    authWrites: false,
    operationalWrites: false,
    reimport: false,
    production: false,
    main: false,
    merge: false
  }
};
const requestPath = path.join(tmp, 'request.json');
fs.writeFileSync(requestPath, JSON.stringify(syntheticRequest), 'utf8');
checks.guardDetectPass = spawnSync(process.execPath, [files.guard, 'detect-active-request', requestPath, syntheticRequest.requestVersion]).status === 0;
checks.guardValidateRequestPass = spawnSync(process.execPath, [files.guard, 'validate-request', requestPath, syntheticRequest.parentHead, syntheticRequest.requestVersion]).status === 0;

const go = {
  status: 'GO_GATE_CONTRACT',
  contractVersion: '2.7.8',
  failed: 0,
  ok: true,
  executionAuthorized: true,
  secretAccessAuthorized: true,
  firestoreReadAuthorized: true,
  writeAuthorized: false,
  runtimeAuthorized: true,
  browserAuthorized: true,
  hostingDeployAuthorized: true,
  hostingDeploysMaximum: 1,
  functionsDeployAuthorized: false,
  rulesDeployAuthorized: false,
  productionAuthorized: false,
  secretAccess: false,
  runtimeExecuted: false,
  browserExecuted: false,
  deployExecuted: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0
};
const goPath = path.join(tmp, 'go.json');
fs.writeFileSync(goPath, JSON.stringify(go), 'utf8');
checks.guardValidateGoPass = spawnSync(process.execPath, [files.guard, 'validate-go', goPath]).status === 0;

const stopPath = path.join(tmp, 'stop.json');
const emit = spawnSync(process.execPath, [files.guard, 'emit-failure', stopPath, 'gate', 'CHECK', 'detail', '41']);
const stop = JSON.parse(fs.readFileSync(stopPath, 'utf8'));
checks.guardEmitStop = emit.status === 41 && stop.status === 'STOP_PREFLIGHT_RELAY' && stop.ok === false;

const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-preflight-portable-source-test-v2',
  generatedAt: '2026-08-06T18:35:00-06:00',
  gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  status: failedCheckIds.length ? 'STOP_SOURCE_TEST' : 'PASS_SOURCE_ONLY_PORTABLE_PREFLIGHT_ROOTFIX',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'PIPELINE_MECHANISM_FAILURE_CORRECTED_SOURCE_ONLY',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  secretsRead: false,
  firebaseAccess: false,
  firestoreReads: 0,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  ok: failedCheckIds.length === 0
};
const out = rel('orbit360-platform/runtime-gate-crm-v20260716/preflight-portable-source-test-sanitized-v20260806.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 41);
