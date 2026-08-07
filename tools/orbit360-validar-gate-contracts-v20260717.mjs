#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE_ID = process.argv[2] || 'block1-client360-insurers-lab-v20260717';
const BLOCK1_V23_GATE_ID = 'block1-client360-insurers-lab-v20260717';
const VISUAL_LEGACY_GATE_ID = 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805';
const V28_PROFILE = 'v28-focal-provenance-universe';
const LEGACY_ROUTER = 'tools/orbit360-validar-gate-contracts-legacy-v20260717.mjs';
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_PATH = path.join(ROOT, EVIDENCE_REL);
const DEFAULT_VISUAL_REQUEST_REL = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const DEFAULT_BLOCK1_V23_REQUEST_REL = '.github/orbit360-requests/block1-client360-insurers-v23-authorization.json';
const DEFAULT_BLOCK1_V28_REQUEST_REL = '.github/orbit360-requests/block1-client360-insurers-v28-focal-provenance-universe-authorization.json';
const STOP_OVERLAY_REL = 'tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json';
const CANONICAL_LIFECYCLE_COMPOSITION = 'phase-capability-contract-v1';
const GATE_CONFIG = Object.freeze({
  [BLOCK1_V23_GATE_ID]: {
    contractVersion: '1.0.41',
    lifecycle: 'tools/orbit360-validator-lifecycle-block1-v23-native-v20260807.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-block1-v23-native-v20260807.mjs',
    defaultRequest: DEFAULT_BLOCK1_V23_REQUEST_REL,
    sourcePhase: 'SOURCE_ONLY_NATIVE_MATRIX_VALIDATION'
  },
  [VISUAL_LEGACY_GATE_ID]: {
    contractVersion: '2.7.8',
    lifecycle: 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-visual-matrix-corrected-post-auth-lab-v20260805.mjs',
    defaultRequest: DEFAULT_VISUAL_REQUEST_REL,
    sourcePhase: ''
  }
});
const BLOCK1_V28_CONFIG = Object.freeze({
  contractVersion: '1.0.41',
  lifecycle: 'tools/orbit360-validator-lifecycle-block1-focal-provenance-universe-v28-v20260807.json',
  engine: 'tools/orbit360-validar-gate-contracts-engine-block1-focal-provenance-universe-v28-v20260807.mjs',
  defaultRequest: DEFAULT_BLOCK1_V28_REQUEST_REL,
  sourcePhase: 'SOURCE_ONLY_FOCAL_PROVENANCE_UNIVERSE_V28'
});
const PHASE_PROFILES = Object.freeze({
  SOURCE_ONLY_NATIVE_MATRIX_VALIDATION: {secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  BLOCK1_NATIVE_MATRIX_RUNTIME_V23: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false},
  SOURCE_ONLY_FOCAL_PROVENANCE_UNIVERSE_V28: {secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  BLOCK1_FOCAL_PROVENANCE_UNIVERSE_READONLY_V28: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false}
});

function writeEvidence(payload) {
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}
function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));
}
function exactCapabilities(actual, expected) {
  const a = Object.keys(actual || {}).sort();
  const e = Object.keys(expected || {}).sort();
  return JSON.stringify(a) === JSON.stringify(e) && e.every(key => actual[key] === expected[key]);
}
function failOutput(config, error) {
  return {
    schemaVersion: 'orbit360-gate-contract-preflight-canonical-router-v6-profile-aware',
    gateId: GATE_ID,
    contractVersion: config && config.contractVersion || '',
    status: 'VALIDATOR_STALE',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    failed: 1,
    failedCheckIds: ['CANONICAL_PREFLIGHT_ENTRYPOINT'],
    error: String(error && error.message || error),
    canonicalLifecycleComposition: CANONICAL_LIFECYCLE_COMPOSITION,
    canonicalEngine: config && config.engine || '',
    canonicalRouterVersion: 'v6-profile-aware-block1-v28',
    canonicalStopOverlay: GATE_ID === VISUAL_LEGACY_GATE_ID ? STOP_OVERLAY_REL : '',
    gateProfile: process.env.ORBIT360_GATE_PROFILE || 'default',
    legacyDelegate: LEGACY_ROUTER,
    sourceTransformed: false,
    dataAccess: false,
    secretAccess: false,
    operationalWrites: 0,
    evidenceWrites: 1,
    secretsRead: false,
    firestoreRead: false,
    runtimeExecuted: false,
    browserExecuted: false,
    rulesApplied: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    ok: false
  };
}

const gateProfile = process.env.ORBIT360_GATE_PROFILE || '';
const config = GATE_ID === BLOCK1_V23_GATE_ID && gateProfile === V28_PROFILE ? BLOCK1_V28_CONFIG : GATE_CONFIG[GATE_ID];
if (!config) {
  const legacyPath = path.join(ROOT, LEGACY_ROUTER);
  if (!fs.existsSync(legacyPath)) {
    const missing = {
      schemaVersion: 'orbit360-gate-contract-preflight-canonical-router-v6-profile-aware',
      gateId: GATE_ID,
      status: 'VALIDATOR_STALE',
      classification: 'PIPELINE_MECHANISM_FAILURE',
      failed: 1,
      failedCheckIds: ['LEGACY_CANONICAL_ROUTER_MISSING'],
      legacyDelegate: LEGACY_ROUTER,
      dataAccess: false,
      secretAccess: false,
      secretsRead: false,
      firestoreRead: false,
      runtimeExecuted: false,
      browserExecuted: false,
      deployExecuted: false,
      productionTouched: false,
      containsPII: false,
      containsSecrets: false,
      ok: false
    };
    writeEvidence(missing);
    console.log(JSON.stringify(missing, null, 2));
    process.exit(41);
  }
  const legacy = spawnSync(process.execPath, [legacyPath, ...process.argv.slice(2)], { cwd: ROOT, env: process.env, stdio: 'inherit' });
  process.exit(Number.isInteger(legacy.status) ? legacy.status : 41);
}

let output;
let exitCode = 41;
try {
  if (!fs.existsSync(path.join(ROOT, config.lifecycle))) throw new Error('CANONICAL_LIFECYCLE_CONTRACT_MISSING');
  if (!fs.existsSync(path.join(ROOT, config.engine))) throw new Error('CANONICAL_ENGINE_MISSING');

  if (GATE_ID === VISUAL_LEGACY_GATE_ID && fs.existsSync(path.join(ROOT, STOP_OVERLAY_REL))) {
    const overlay = readJson(STOP_OVERLAY_REL);
    if (overlay.stopRetryActive === true || overlay.freshAuthorizationRequired === true) throw new Error('STOP_RETRY_ACTIVE_FRESH_AUTHORIZATION_REQUIRED');
  }

  const lifecycle = readJson(config.lifecycle);
  if (lifecycle.gateId !== GATE_ID) throw new Error('CANONICAL_GATE_MISMATCH');
  if (lifecycle.gateContractVersion !== config.contractVersion) throw new Error('CANONICAL_GATE_VERSION_MISMATCH');
  const lifecycleRevision = lifecycle.validatorLifecycleRevision || 'phase-capability-contract-v1';
  if (lifecycleRevision !== CANONICAL_LIFECYCLE_COMPOSITION) throw new Error('CANONICAL_LIFECYCLE_REVISION_MISMATCH');
  const profile = lifecycle.executionProfile || {};
  const phase = String(lifecycle.currentPhase || profile.phase || '');
  const expected = PHASE_PROFILES[phase];
  if (!expected) throw new Error('CANONICAL_LIFECYCLE_PHASE_MISMATCH');
  if (!exactCapabilities(profile.capabilities || {}, expected)) throw new Error('CANONICAL_LIFECYCLE_CAPABILITY_MISMATCH');

  const isSourcePhase = !!config.sourcePhase && phase === config.sourcePhase;
  const expectedRequestVersion = process.env.ORBIT360_EXPECTED_REQUEST_VERSION || 'NONE_PENDING_FRESH_AUTHORIZATION';
  const requestFile = process.env.ORBIT360_REQUEST_FILE || config.defaultRequest;
  if (isSourcePhase) {
    if (expectedRequestVersion !== 'NONE_PENDING_FRESH_AUTHORIZATION') throw new Error('SOURCE_PHASE_UNEXPECTED_REQUEST_VERSION');
    if (fs.existsSync(path.join(ROOT, requestFile))) throw new Error('SOURCE_PHASE_REQUEST_MUST_BE_ABSENT');
  } else {
    if (expectedRequestVersion === 'NONE_PENDING_FRESH_AUTHORIZATION') throw new Error('FRESH_AUTHORIZATION_NOT_REGISTERED');
    const requestAbs = path.join(ROOT, requestFile);
    if (!fs.existsSync(requestAbs) || !fs.statSync(requestAbs).isFile()) throw new Error('CANONICAL_REQUEST_FILE_UNAVAILABLE');
    const request = readJson(requestFile);
    if (request.requestVersion !== expectedRequestVersion) throw new Error('CANONICAL_REQUEST_VERSION_MISMATCH');
    if (request.status !== 'AUTHORIZED_ONCE' || request.allowedExecutions !== 1 || request.consumed !== false || request.authorizationFrozen !== false || request.replayAllowed !== false) throw new Error('CANONICAL_REQUEST_NOT_ACTIVE');
  }

  const run = spawnSync(process.execPath, [config.engine, GATE_ID], {
    cwd: ROOT,
    env: {
      ...process.env,
      ORBIT360_BRANCH: isSourcePhase ? '' : 'ays/backend-tenant-lab-v99-20260703',
      ORBIT360_REQUEST_FILE: requestFile,
      ORBIT360_EXPECTED_REQUEST_VERSION: expectedRequestVersion
    },
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  exitCode = Number.isInteger(run.status) ? run.status : 41;
  if (run.error) throw run.error;
  if (!fs.existsSync(EVIDENCE_PATH)) throw new Error('CANONICAL_ENGINE_EVIDENCE_MISSING');
  const parsed = readJson(EVIDENCE_REL);
  output = {
    ...parsed,
    canonicalEntrypoint: 'tools/orbit360-validar-gate-contracts-v20260717.mjs',
    canonicalEngine: config.engine,
    canonicalLifecycleContract: config.lifecycle,
    canonicalLifecycleComposition: CANONICAL_LIFECYCLE_COMPOSITION,
    canonicalRouterVersion: 'v6-profile-aware-block1-v28',
    canonicalStopOverlay: GATE_ID === VISUAL_LEGACY_GATE_ID ? STOP_OVERLAY_REL : '',
    gateProfile: gateProfile || 'default',
    legacyDelegate: LEGACY_ROUTER,
    engineEvidenceSource: 'sync-file-evidence-not-stdout-v1',
    engineStdoutParsed: false,
    sourceTransformed: false,
    dataAccess: false,
    secretAccess: false,
    operationalWrites: 0,
    evidenceWrites: 1,
    secretsRead: false,
    firestoreRead: false,
    runtimeExecuted: false,
    browserExecuted: false,
    rulesApplied: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false
  };
  if (run.stderr) output.stderrSanitized = String(run.stderr).trim().slice(0, 2000);
} catch (error) {
  output = failOutput(config, error);
  exitCode = 41;
}
writeEvidence(output);
console.log(JSON.stringify(output, null, 2));
process.exit(exitCode);
