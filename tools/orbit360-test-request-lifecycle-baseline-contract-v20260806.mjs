#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const guard = path.join(ROOT, 'tools/orbit360-json-guard-visual-matrix-runtime-v20260806.mjs');
const preflight = fs.readFileSync(path.join(ROOT, 'tools/orbit360-preflight-visual-matrix-runtime-relay-v8-v20260806.sh'), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-baseline-contract-'));
const parent = 'b'.repeat(40);
const version = '20260806.synthetic-baseline-runtime';
const channel = 'visual-matrix-corrected-backup-synthetic-current';
const script = 'tools/orbit360-restore-visual-matrix-synthetic-current.sh';

function baseRequest() {
  return {
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
    parentHead: parent,
    authorizedBaseHead: parent,
    capabilities: {
      secrets: true, firestoreRead: true, writes: false, runtime: true, browser: true, deploy: true,
      functionsDeploy: false, rulesDeploy: false, production: false
    },
    scope: {
      registeredWorkflowRelayRequired: true,
      restorePriorBaselineBeforeRuntime: true,
      restorePriorBaselineChannel: channel,
      restorePriorBaselineScript: script,
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
}
function baseLifecycle() {
  return {
    schemaVersion: 'orbit360-validator-lifecycle-contract-v1',
    gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
    gateContractVersion: '2.7.8',
    status: 'AUTHORIZED_FRESH_REQUEST_ONLY_SYNTHETIC_PENDING_EXCLUSIVE_REQUEST',
    expectedRequestVersion: version,
    branch: 'ays/backend-tenant-lab-v99-20260703',
    projectId: 'ays-orbit-360-lab',
    tenantId: 'alianzas-soluciones',
    priorHostingRestoreChannel: channel,
    priorHostingRestoreScript: script,
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
}
function run(request, lifecycle, expectedVersion = version) {
  const nonce = Math.random().toString(16).slice(2);
  const requestFile = path.join(tmp, `request-${nonce}.json`);
  const lifecycleFile = path.join(tmp, `lifecycle-${nonce}.json`);
  fs.writeFileSync(requestFile, JSON.stringify(request), 'utf8');
  fs.writeFileSync(lifecycleFile, JSON.stringify(lifecycle), 'utf8');
  return spawnSync(process.execPath, [guard, 'validate-request', requestFile, parent, expectedVersion, lifecycleFile], { encoding: 'utf8' }).status;
}

const checks = {};
checks.guardAndPreflightUseLifecycle = fs.existsSync(guard) && preflight.includes('"$LIFECYCLE"');
checks.currentBaselineAccepted = run(baseRequest(), baseLifecycle()) === 0;

const channelMismatch = baseRequest();
channelMismatch.scope.restorePriorBaselineChannel = 'visual-matrix-corrected-backup-obsolete';
checks.channelMismatchRejected = run(channelMismatch, baseLifecycle()) !== 0;

const scriptMismatch = baseRequest();
scriptMismatch.scope.restorePriorBaselineScript = 'tools/obsolete-restore.sh';
checks.scriptMismatchRejected = run(scriptMismatch, baseLifecycle()) !== 0;

const versionLifecycleMismatch = baseLifecycle();
versionLifecycleMismatch.expectedRequestVersion = '20260806.wrong-version';
checks.lifecycleVersionMismatchRejected = run(baseRequest(), versionLifecycleMismatch) !== 0;

const consumed = baseRequest();
consumed.status = 'CONSUMED';
consumed.consumed = true;
consumed.allowedExecutions = 0;
checks.consumedRequestRejected = run(consumed, baseLifecycle()) !== 0;

const stoppedLifecycle = baseLifecycle();
stoppedLifecycle.status = 'STOP_RETRY_SYNTHETIC';
stoppedLifecycle.stopRetryActive = true;
stoppedLifecycle.authorizationReserved = false;
stoppedLifecycle.authorizationFrozen = true;
stoppedLifecycle.allowedExecutions = 0;
checks.stopLifecycleRejected = run(baseRequest(), stoppedLifecycle) !== 0;

const writeEnabled = baseRequest();
writeEnabled.capabilities.writes = true;
checks.writeCapabilityRejected = run(writeEnabled, baseLifecycle()) !== 0;

const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-request-lifecycle-baseline-contract-source-test-v1',
  generatedAt: '2026-08-06T20:42:00-06:00',
  status: failedCheckIds.length ? 'STOP_REQUEST_LIFECYCLE_BASELINE_CONTRACT_SOURCE_TEST' : 'PASS_REQUEST_LIFECYCLE_BASELINE_CONTRACT_SOURCE_ONLY',
  classification: failedCheckIds.length ? 'VALIDATOR_STALE' : 'VALIDATOR_STALE_CORRECTED_SOURCE_ONLY',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  hardcodedLegacyBaselineAccepted: false,
  lifecycleBindingRequired: true,
  secretsRead: false,
  firebaseAccess: false,
  firestoreReads: 0,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  browserExecuted: false,
  hostingTouched: false,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  ok: failedCheckIds.length === 0
};
const out = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/request-lifecycle-baseline-contract-source-test-sanitized-v20260806.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 41);
