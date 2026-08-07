#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import {
  runCanonicalAndReadEvidence,
  CANONICAL_EVIDENCE_REL,
  CanonicalEvidenceError
} from './orbit360-canonical-preflight-evidence-handoff-v24.mjs';

const ROOT = process.cwd();
const MODE = process.argv[2] || process.env.ORBIT360_V23_PREFLIGHT_MODE || 'source';
const GATE_ID = 'block1-client360-insurers-lab-v20260717';
const CONTRACT_VERSION = '1.0.41';
const REQUEST_VERSION = '20260807.23-native-block1-runtime';
const AUTHORIZATION_GENERATION = 'v24-canonical-evidence-handoff';
const OVERLAY = 'tools/orbit360-gate-contract-block1-v23-native-v20260807.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-block1-v23-native-v20260807.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block1-client360-insurers-v24-authorization.json';
const EVIDENCE = process.env.ORBIT360_V23_PREFLIGHT_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v24-block1-preflight-sanitized-v20260807.json';
const CANONICAL_PREFLIGHT = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const CANONICAL_ENGINE = 'tools/orbit360-validar-gate-contracts-engine-block1-v23-native-v20260807.mjs';
const MATRIX = 'tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs';
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
    schemaVersion: 'orbit360-v24-canonical-evidence-handoff-preflight-v1', gateId: GATE_ID, contractVersion: CONTRACT_VERSION,
    authorizationGeneration: AUTHORIZATION_GENERATION, mode: MODE, status: 'VALIDATOR_STALE', classification: 'VALIDATOR_STALE', failed: 1,
    failedCheckIds: [code], detail: String(detail || '').slice(0, 600), canonicalPreflightStatus: canonicalStatus,
    canonicalEvidenceAuthority: CANONICAL_EVIDENCE_REL, stdoutUsedForDecision: false,
    executionAuthorized: false, secretAccessAuthorized: false, firestoreReadAuthorized: false, writeAuthorized: false,
    runtimeAuthorized: false, browserAuthorized: false, hostingDeployAuthorized: false, hostingDeploysMaximum: 0,
    functionsDeployAuthorized: false, rulesDeployAuthorized: false, productionAuthorized: false,
    secretsRead: false, firestoreRead: false, runtimeExecuted: false, browserExecuted: false, deployExecuted: false,
    writes: 0, productionTouched: false, containsPII: false, containsSecrets: false, ok: false
  };
  write(output); console.log(JSON.stringify(output, null, 2)); process.exit(41);
}

for (const file of [OVERLAY, LIFECYCLE, CANONICAL_PREFLIGHT, CANONICAL_ENGINE, MATRIX, OBSERVER, ADJUDICATOR, SOURCE_TEST, 'tools/orbit360-canonical-preflight-evidence-handoff-v24.mjs']) {
  if (!exists(file)) fail('V24_REQUIRED_FILE_MISSING', file);
}

let canonicalHandoff;
try {
  canonicalHandoff = runCanonicalAndReadEvidence({
    root: ROOT,
    canonicalPreflight: CANONICAL_PREFLIGHT,
    gateId: GATE_ID,
    evidenceRel: CANONICAL_EVIDENCE_REL,
    mode: MODE === 'runtime' ? 'runtime' : 'source',
    env: process.env
  });
} catch (error) {
  const code = error instanceof CanonicalEvidenceError ? error.code : 'V24_CANONICAL_EVIDENCE_HANDOFF_FAILED';
  fail(code, error && error.detail || error && error.message || error, 'FAILED');
}
const canonicalPayload = canonicalHandoff.payload;

const overlay = read(OVERLAY);
const lifecycle = read(LIFECYCLE);
if (overlay.gateId !== GATE_ID || overlay.contractVersion !== CONTRACT_VERSION || overlay.predecessorContractVersion !== '1.0.40' || overlay.block !== 1) fail('V24_GATE_OVERLAY_MISMATCH', 'gate/version/predecessor/block', canonicalPayload.status);
if (!overlay.mechanism || overlay.mechanism.nativeRuntimeArtifact !== MATRIX || overlay.mechanism.canonicalEngine !== CANONICAL_ENGINE || overlay.mechanism.generatedFromPriorArtifact !== false || overlay.mechanism.textualTransform !== false || overlay.mechanism.sourceSurgery !== false) fail('V24_NATIVE_MECHANISM_CONTRACT_INVALID', '', canonicalPayload.status);
if (!exactArray(overlay.blockingRoutes, ['inicio','cliente360','aseguradoras'])) fail('V24_BLOCKING_SCOPE_INVALID', JSON.stringify(overlay.blockingRoutes), canonicalPayload.status);
if (!overlay.universe || overlay.universe.executeAfterGoBeforeHosting !== true || overlay.universe.expected.clientes !== 414 || overlay.universe.expected.aseguradoras !== 26 || overlay.universe.expected.asesores !== 7 || overlay.universe.requiresValidationExcluded !== false) fail('V24_UNIVERSE_CONTRACT_INVALID', '', canonicalPayload.status);
if (lifecycle.gateId !== GATE_ID || lifecycle.gateContractVersion !== CONTRACT_VERSION || lifecycle.expectedRequestVersion !== REQUEST_VERSION || lifecycle.nativeMatrix !== MATRIX) fail('V24_LIFECYCLE_IDENTITY_MISMATCH', '', canonicalPayload.status);

if (MODE === 'source') {
  if (lifecycle.status !== 'SOURCE_VALIDATION_PENDING' || lifecycle.currentPhase !== 'SOURCE_ONLY_NATIVE_MATRIX_VALIDATION' || lifecycle.executionAuthorized !== false || lifecycle.executionProfile?.capabilities?.secrets !== false || lifecycle.executionProfile?.capabilities?.runtime !== false || lifecycle.executionProfile?.capabilities?.deploy !== false) fail('V24_SOURCE_LIFECYCLE_NOT_FAIL_CLOSED', lifecycle.status, canonicalPayload.status);
  if (exists(REQUEST)) fail('V24_REQUEST_MUST_NOT_EXIST_DURING_SOURCE', REQUEST, canonicalPayload.status);
  const output = {
    schemaVersion: 'orbit360-v24-canonical-evidence-handoff-preflight-v1', gateId: GATE_ID, contractVersion: CONTRACT_VERSION,
    authorizationGeneration: AUTHORIZATION_GENERATION, mode: MODE, status: 'PASS_V24_SOURCE_PREFLIGHT', classification: 'PIPELINE_MECHANISM_FAILURE_CORRECTED_SOURCE_ONLY', failed: 0,
    canonicalPreflightStatus: canonicalPayload.status, canonicalOwnerScope: canonicalPayload.canonicalOwnerScope || '', nativeRuntimeArtifact: MATRIX,
    canonicalEvidenceAuthority: CANONICAL_EVIDENCE_REL, canonicalEvidenceFresh: true, stdoutUsedForDecision: false, exactBlockingRoutes: ['inicio','cliente360','aseguradoras'],
    executionAuthorized: false, secretAccessAuthorized: false, firestoreReadAuthorized: false, writeAuthorized: false,
    runtimeAuthorized: false, browserAuthorized: false, hostingDeployAuthorized: false, hostingDeploysMaximum: 0,
    functionsDeployAuthorized: false, rulesDeployAuthorized: false, productionAuthorized: false,
    secretsRead: false, firestoreRead: false, runtimeExecuted: false, browserExecuted: false, deployExecuted: false,
    writes: 0, productionTouched: false, containsPII: false, containsSecrets: false, ok: true
  };
  write(output); console.log(JSON.stringify(output, null, 2)); process.exit(0);
}

if (MODE !== 'runtime') fail('V24_PREFLIGHT_MODE_INVALID', MODE, canonicalPayload.status);
if (!exists(REQUEST)) fail('V24_RUNTIME_REQUEST_MISSING', REQUEST, canonicalPayload.status);
const request = read(REQUEST);
const capabilities = lifecycle.executionProfile && lifecycle.executionProfile.capabilities || {};
if (lifecycle.status !== 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST' || lifecycle.currentPhase !== 'BLOCK1_NATIVE_MATRIX_RUNTIME_V23' || lifecycle.executionAuthorized !== true || lifecycle.allowedExecutions !== 1 || lifecycle.stopRetryActive !== false) fail('V24_RUNTIME_LIFECYCLE_INVALID', lifecycle.status, canonicalPayload.status);
if (!(capabilities.secrets === true && capabilities.firestoreRead === true && capabilities.writes === false && capabilities.runtime === true && capabilities.browser === true && capabilities.deploy === true && capabilities.functionsDeploy === false && capabilities.rulesDeploy === false && capabilities.production === false)) fail('V24_RUNTIME_CAPABILITIES_INVALID', JSON.stringify(capabilities), canonicalPayload.status);
if (!(request.requestVersion === REQUEST_VERSION && request.authorizationGeneration === AUTHORIZATION_GENERATION && request.gateId === GATE_ID && request.contractVersion === CONTRACT_VERSION && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.authorizationFrozen === false && request.replayAllowed === false)) fail('V24_RUNTIME_REQUEST_INVALID', request.status || '', canonicalPayload.status);
if (!(request.scope && request.scope.universeAdjudicationAfterGoBeforeHosting === true && request.scope.hostingDeploysMaximum === 1 && request.scope.firestoreWrites === false && request.scope.authWrites === false && request.scope.operationalWrites === false && request.scope.reimport === false && request.scope.production === false && request.scope.main === false && request.scope.merge === false)) fail('V24_RUNTIME_REQUEST_SCOPE_INVALID', '', canonicalPayload.status);

const output = {
  schemaVersion: 'orbit360-v24-canonical-evidence-handoff-preflight-v1', gateId: GATE_ID, contractVersion: CONTRACT_VERSION,
  authorizationGeneration: AUTHORIZATION_GENERATION, mode: MODE, status: 'GO_GATE_CONTRACT', classification: 'GO_NATIVE_BLOCK1_RUNTIME_V24', failed: 0,
  canonicalPreflightStatus: canonicalPayload.status, canonicalOwnerScope: canonicalPayload.canonicalOwnerScope || '', requestVersion: REQUEST_VERSION, nativeRuntimeArtifact: MATRIX,
  canonicalEvidenceAuthority: CANONICAL_EVIDENCE_REL, canonicalEvidenceFresh: true, stdoutUsedForDecision: false,
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
