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
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const router = read(files.router);
const preflight = read(files.preflight);
const workflow = read(files.workflow);
const overlay = JSON.parse(read(files.overlay));
const checks = {};

const isStopPhase =
  overlay.stopRetryActive === true &&
  overlay.freshAuthorizationRequired === true &&
  overlay.runtimeAllowed === false &&
  overlay.hostingAllowed === false;
const isAuthorizedPhase =
  overlay.stopRetryActive === false &&
  overlay.freshAuthorizationRequired === false &&
  overlay.runtimeAllowed === true &&
  overlay.runtimeAllowedOnlyWithFreshExclusiveRequest === true &&
  overlay.hostingAllowed === true;

checks.filesExist = Object.values(files).every(fs.existsSync);
checks.routerPropagatesRequest = router.includes('ORBIT360_REQUEST_FILE: requestFile');
checks.routerGuardsFileType = router.includes('fs.statSync(requestAbs).isFile()');
checks.routerRequiresFreshVersion = router.includes('FRESH_AUTHORIZATION_NOT_REGISTERED') && router.includes('CANONICAL_REQUEST_VERSION_MISMATCH');
checks.routerHonorsStopOverlay = router.includes('STOP_RETRY_ACTIVE_FRESH_AUTHORIZATION_REQUIRED');
checks.preflightNoJq = !/\bjq\b/.test(preflight);
checks.workflowNoJq = !/\bjq\b/.test(workflow);
checks.preflightUsesGuard = preflight.includes('orbit360-json-guard-visual-matrix-runtime-v20260806.mjs');
checks.preflightBindsLifecycle = preflight.includes('validate-request "$REQUEST" "$PARENT" "$EXPECTED_REQUEST_VERSION" "$LIFECYCLE"');
checks.workflowUsesGuard = workflow.includes('detect-active-request');
checks.workflowHasFailClosedVersion = workflow.includes('ORBIT360_EXPECTED_REQUEST_VERSION');
checks.overlayPhaseRecognized = isStopPhase || isAuthorizedPhase;
checks.overlayNeverReusesPriorRequest = overlay.requestReusable === false;
checks.overlayRiskBoundariesMatchPhase =
  overlay.productionAllowed === false &&
  overlay.writesAllowed === false &&
  overlay.functionsAllowed === false &&
  overlay.rulesAllowed === false &&
  overlay.reimportAllowed === false &&
  (isStopPhase || isAuthorizedPhase);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-preflight-source-'));
const version = '20260806.synthetic-portable-preflight-runtime';
const baselineChannel = 'visual-matrix-corrected-backup-synthetic-current';
const baselineScript = 'tools/orbit360-restore-visual-matrix-synthetic-current.sh';
const syntheticRequest = {
  schemaVersion: 'orbit360-visual-matrix-corrected-post-auth-request-v1',
  requestVersion: version,
  gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  contractVersion: '2.7.8',
  status: 'AUTHORIZED_ONCE',
  approved: true,
  allowedExecutions: 1,
  consumed: false,
  authorizationFrozen: false,
  replayAllowed: false,
  branch: 'ays/backend-tenant-lab-v99-20260703',
  projectId: 'ays-orbit-360-lab',
  tenantId: 'alianzas-soluciones',
  parentHead: 'a'.repeat(40),
  authorizedBaseHead: 'a'.repeat(40),
  capabilities: {
    secrets: true,
    firestoreRead: true,
    writes: false,
    runtime: true,
    browser: true,
    deploy: true,
    functionsDeploy: false,
    rulesDeploy: false,
    production: false
  },
  scope: {
    registeredWorkflowRelayRequired: true,
    restorePriorBaselineBeforeRuntime: true,
    restorePriorBaselineChannel: baselineChannel,
    restorePriorBaselineScript: baselineScript,
    hostingOnly: true,
    hostingDeploysMaximum: 1,
    hostingBackupClone: true,
    hostingRollbackCloneOnFailure: true,
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
const syntheticLifecycle = {
  schemaVersion: 'orbit360-validator-lifecycle-contract-v1',
  gateId: syntheticRequest.gateId,
  gateContractVersion: syntheticRequest.contractVersion,
  status: 'AUTHORIZED_FRESH_REQUEST_ONLY_SYNTHETIC_PENDING_EXCLUSIVE_REQUEST',
  expectedRequestVersion: version,
  branch: syntheticRequest.branch,
  projectId: syntheticRequest.projectId,
  tenantId: syntheticRequest.tenantId,
  priorHostingRestoreChannel: baselineChannel,
  priorHostingRestoreScript: baselineScript,
  hostingDeploysMaximum: 1,
  hostingBackupCloneAuthorized: true,
  hostingRollbackCloneAuthorizedOnFailure: true,
  stopRetryActive: false,
  authorizationReserved: true,
  authorizationFrozen: false,
  allowedExecutions: 1,
  executionAuthorized: false,
  secretAccessAuthorized: false,
  browserAuthorized: false,
  hostingDeployAuthorized: false,
  executionProfile: { capabilities: { writes: false, functionsDeploy: false, rulesDeploy: false, production: false } }
};
const requestPath = path.join(tmp, 'request.json');
const lifecyclePath = path.join(tmp, 'lifecycle.json');
fs.writeFileSync(requestPath, JSON.stringify(syntheticRequest), 'utf8');
fs.writeFileSync(lifecyclePath, JSON.stringify(syntheticLifecycle), 'utf8');
checks.guardDetectPass = spawnSync(process.execPath, [files.guard, 'detect-active-request', requestPath, version]).status === 0;
checks.guardValidateRequestPass = spawnSync(process.execPath, [files.guard, 'validate-request', requestPath, syntheticRequest.parentHead, version, lifecyclePath]).status === 0;

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
  schemaVersion: 'orbit360-preflight-portable-source-test-v4-lifecycle-baseline-aware',
  generatedAt: '2026-08-06T20:40:00-06:00',
  gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  status: failedCheckIds.length ? 'STOP_SOURCE_TEST' : 'PASS_SOURCE_ONLY_PHASE_AWARE_PREFLIGHT_VALIDATOR',
  classification: failedCheckIds.length ? 'VALIDATOR_STALE' : 'VALIDATOR_STALE_CORRECTED_SOURCE_ONLY',
  observedOverlayStatus: String(overlay.status || ''),
  observedLifecyclePhase: isStopPhase ? 'STOP_RETRY' : isAuthorizedPhase ? 'AUTHORIZED_FRESH_REQUEST_ONLY' : 'UNRECOGNIZED',
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
