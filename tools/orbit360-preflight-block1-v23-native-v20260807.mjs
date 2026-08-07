#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const MODE = process.argv[2] || process.env.ORBIT360_V23_PREFLIGHT_MODE || 'source';
const GATE_ID = 'block1-client360-insurers-lab-v20260717';
const CONTRACT_VERSION = '1.0.41';
const REQUEST_VERSION = '20260807.23-native-block1-runtime';
const OVERLAY = 'tools/orbit360-gate-contract-block1-v23-native-v20260807.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-block1-v23-native-v20260807.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block1-client360-insurers-v23-authorization.json';
const EVIDENCE = process.env.ORBIT360_V23_PREFLIGHT_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v23-block1-preflight-sanitized-v20260807.json';
const CANONICAL_PREFLIGHT = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const CANONICAL_ENGINE = 'tools/orbit360-validar-gate-contracts-engine-block1-v23-native-v20260807.mjs';
const MATRIX = 'tools/orbit360-block1-native-matrix-v23-v20260807.mjs';
const OBSERVER = 'tools/orbit360-event-driven-render-observer-v23.mjs';
const ADJUDICATOR = 'tools/orbit360-adjudicate-block1-universe-readonly-v23-v20260807.mjs';
const SOURCE_TEST = 'tools/orbit360-test-v23-native-block1-source-v20260807.mjs';

const read = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));
const exists = rel => fs.existsSync(path.join(ROOT, rel));
function write(payload) {
  const abs = path.join(ROOT, EVIDENCE);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}
function exactArray(a, b) { return JSON.stringify(a || []) === JSON.stringify(b || []); }
function fail(code, detail, canonicalStatus = '') {
  const output = {
    schemaVersion: 'orbit360-v23-native-block1-preflight-v2-canonical-owner-1.0.41', gateId: GATE_ID, contractVersion: CONTRACT_VERSION,
    mode: MODE, status: 'VALIDATOR_STALE', classification: 'VALIDATOR_STALE', failed: 1,
    failedCheckIds: [code], detail: String(detail || '').slice(0, 600), canonicalPreflightStatus: canonicalStatus,
    executionAuthorized: false, secretAccessAuthorized: false, firestoreReadAuthorized: false, writeAuthorized: false,
    runtimeAuthorized: false, browserAuthorized: false, hostingDeployAuthorized: false, hostingDeploysMaximum: 0,
    functionsDeployAuthorized: false, rulesDeployAuthorized: false, productionAuthorized: false,
    secretsRead: false, firestoreRead: false, runtimeExecuted: false, browserExecuted: false, deployExecuted: false,
    writes: 0, productionTouched: false, containsPII: false, containsSecrets: false, ok: false
  };
  write(output); console.log(JSON.stringify(output, null, 2)); process.exit(41);
}

for (const file of [OVERLAY, LIFECYCLE, CANONICAL_PREFLIGHT, CANONICAL_ENGINE, MATRIX, OBSERVER, ADJUDICATOR, SOURCE_TEST]) {
  if (!exists(file)) fail('V23_REQUIRED_FILE_MISSING', file);
}

const canonical = spawnSync(process.execPath, [CANONICAL_PREFLIGHT, GATE_ID], { cwd: ROOT, env: process.env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
if (canonical.status !== 0) fail('CANONICAL_BLOCK1_PREFLIGHT_FAILED', (canonical.stderr || canonical.stdout || '').slice(-1000), 'FAILED');
let canonicalPayload = {};
try { canonicalPayload = JSON.parse((canonical.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() || '{}'); } catch {}

const overlay = read(OVERLAY);
const lifecycle = read(LIFECYCLE);
if (overlay.gateId !== GATE_ID || overlay.contractVersion !== CONTRACT_VERSION || overlay.predecessorContractVersion !== '1.0.40' || overlay.block !== 1) fail('V23_GATE_OVERLAY_MISMATCH', 'gate/version/predecessor/block', 'PASS');
if (!overlay.mechanism || overlay.mechanism.nativeRuntimeArtifact !== MATRIX || overlay.mechanism.canonicalEngine !== CANONICAL_ENGINE || overlay.mechanism.generatedFromPriorArtifact !== false || overlay.mechanism.textualTransform !== false || overlay.mechanism.sourceSurgery !== false) fail('V23_NATIVE_MECHANISM_CONTRACT_INVALID', '', 'PASS');
if (!exactArray(overlay.blockingRoutes, ['inicio','cliente360','aseguradoras'])) fail('V23_BLOCKING_SCOPE_INVALID', JSON.stringify(overlay.blockingRoutes), 'PASS');
if (!overlay.universe || overlay.universe.executeAfterGoBeforeHosting !== true || overlay.universe.expected.clientes !== 414 || overlay.universe.expected.aseguradoras !== 26 || overlay.universe.expected.asesores !== 7 || overlay.universe.requiresValidationExcluded !== false) fail('V23_UNIVERSE_CONTRACT_INVALID', '', 'PASS');
if (lifecycle.gateId !== GATE_ID || lifecycle.gateContractVersion !== CONTRACT_VERSION || lifecycle.expectedRequestVersion !== REQUEST_VERSION) fail('V23_LIFECYCLE_IDENTITY_MISMATCH', '', 'PASS');

if (MODE === 'source') {
  if (canonicalPayload.status !== 'PASS_GATE_CONTRACT_SOURCE_V23' || canonicalPayload.contractVersion !== CONTRACT_VERSION || canonicalPayload.ok !== true) fail('V23_CANONICAL_SOURCE_OWNER_NOT_PASS', canonicalPayload.status || '', 'PASS');
  if (lifecycle.status !== 'SOURCE_VALIDATION_PENDING' || lifecycle.currentPhase !== 'SOURCE_ONLY_NATIVE_MATRIX_VALIDATION' || lifecycle.executionAuthorized !== false || lifecycle.executionProfile?.capabilities?.secrets !== false || lifecycle.executionProfile?.capabilities?.runtime !== false || lifecycle.executionProfile?.capabilities?.deploy !== false) fail('V23_SOURCE_LIFECYCLE_NOT_FAIL_CLOSED', lifecycle.status, 'PASS');
  if (exists(REQUEST)) fail('V23_REQUEST_MUST_NOT_EXIST_DURING_SOURCE', REQUEST, 'PASS');
  const output = {
    schemaVersion: 'orbit360-v23-native-block1-preflight-v2-canonical-owner-1.0.41', gateId: GATE_ID, contractVersion: CONTRACT_VERSION,
    mode: MODE, status: 'PASS_V23_SOURCE_PREFLIGHT', classification: 'VALIDATOR_STALE_CORRECTED_SOURCE_ONLY', failed: 0,
    canonicalPreflightStatus: canonicalPayload.status, canonicalOwnerScope: canonicalPayload.canonicalOwnerScope || '', nativeRuntimeArtifact: MATRIX, exactBlockingRoutes: ['inicio','cliente360','aseguradoras'],
    executionAuthorized: false, secretAccessAuthorized: false, firestoreReadAuthorized: false, writeAuthorized: false,
    runtimeAuthorized: false, browserAuthorized: false, hostingDeployAuthorized: false, hostingDeploysMaximum: 0,
    functionsDeployAuthorized: false, rulesDeployAuthorized: false, productionAuthorized: false,
    secretsRead: false, firestoreRead: false, runtimeExecuted: false, browserExecuted: false, deployExecuted: false,
    writes: 0, productionTouched: false, containsPII: false, containsSecrets: false, ok: true
  };
  write(output); console.log(JSON.stringify(output, null, 2)); process.exit(0);
}

if (MODE !== 'runtime') fail('V23_PREFLIGHT_MODE_INVALID', MODE, 'PASS');
if (!exists(REQUEST)) fail('V23_RUNTIME_REQUEST_MISSING', REQUEST, 'PASS');
const request = read(REQUEST);
const capabilities = lifecycle.executionProfile && lifecycle.executionProfile.capabilities || {};
if (canonicalPayload.status !== 'GO_GATE_CONTRACT' || canonicalPayload.contractVersion !== CONTRACT_VERSION || canonicalPayload.ok !== true) fail('V23_CANONICAL_RUNTIME_GO_NOT_GRANTED', canonicalPayload.status || '', 'FAILED');
if (lifecycle.status !== 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST' || lifecycle.currentPhase !== 'BLOCK1_NATIVE_MATRIX_RUNTIME_V23' || lifecycle.executionAuthorized !== true || lifecycle.allowedExecutions !== 1 || lifecycle.stopRetryActive !== false) fail('V23_RUNTIME_LIFECYCLE_INVALID', lifecycle.status, 'PASS');
if (!(capabilities.secrets === true && capabilities.firestoreRead === true && capabilities.writes === false && capabilities.runtime === true && capabilities.browser === true && capabilities.deploy === true && capabilities.functionsDeploy === false && capabilities.rulesDeploy === false && capabilities.production === false)) fail('V23_RUNTIME_CAPABILITIES_INVALID', JSON.stringify(capabilities), 'PASS');
if (!(request.requestVersion === REQUEST_VERSION && request.gateId === GATE_ID && request.contractVersion === CONTRACT_VERSION && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.authorizationFrozen === false && request.replayAllowed === false)) fail('V23_RUNTIME_REQUEST_INVALID', request.status || '', 'PASS');
if (!(request.scope && request.scope.universeAdjudicationAfterGoBeforeHosting === true && request.scope.hostingDeploysMaximum === 1 && request.scope.firestoreWrites === false && request.scope.authWrites === false && request.scope.operationalWrites === false && request.scope.reimport === false && request.scope.production === false && request.scope.main === false && request.scope.merge === false)) fail('V23_RUNTIME_REQUEST_SCOPE_INVALID', '', 'PASS');

const output = {
  schemaVersion: 'orbit360-v23-native-block1-preflight-v2-canonical-owner-1.0.41', gateId: GATE_ID, contractVersion: CONTRACT_VERSION,
  mode: MODE, status: 'GO_GATE_CONTRACT', classification: 'GO_NATIVE_BLOCK1_RUNTIME_V23', failed: 0,
  canonicalPreflightStatus: canonicalPayload.status, canonicalOwnerScope: canonicalPayload.canonicalOwnerScope || '', requestVersion: REQUEST_VERSION, nativeRuntimeArtifact: MATRIX,
  executionAuthorized: true, secretAccessAuthorized: true, firestoreReadAuthorized: true, writeAuthorized: false,
  runtimeAuthorized: true, browserAuthorized: true, hostingDeployAuthorized: true, hostingDeploysMaximum: 1,
  hostingBackupCloneAuthorized: true, hostingRollbackCloneAuthorizedOnFailure: true,
  functionsDeployAuthorized: false, rulesDeployAuthorized: false, productionAuthorized: false,
  firestoreWritesAuthorized: 0, authWritesAuthorized: 0, operationalWritesAuthorized: 0,
  universeAdjudicationRequiredBeforeHosting: true,
  secretsRead: false, firestoreRead: false, runtimeExecuted: false, browserExecuted: false, deployExecuted: false,
  writes: 0, productionTouched: false, containsPII: false, containsSecrets: false, ok: true
};
write(output); console.log(JSON.stringify(output, null, 2)); process.exit(0);