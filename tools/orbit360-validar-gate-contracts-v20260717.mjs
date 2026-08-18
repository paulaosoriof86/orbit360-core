#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE_ID = process.argv[2] || 'block1-client360-insurers-lab-v20260717';
const BLOCK1_GATE_ID = 'block1-client360-insurers-lab-v20260717';
const VISUAL_LEGACY_GATE_ID = 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805';
const COBROS_10102_GATE_ID = 'block10.10-cobros-full-ledger-write-lab-v20260805';
const FASE_A_OPS_LEADS_CRM_GATE_ID = 'fase-a-ops-leads-crm-release-lab-v20260812';
const COBROS_10102_RUNTIME_PROFILE = 'cobros-10102-runtime';
const V28_PROFILE = 'v28-focal-provenance-universe';
const V29_PROFILE = 'v29-identity-reconciliation-universe';
const V30_PROFILE = 'v30-retained26-psi-universe';
const V33_PROFILE = 'v33-two-client-cloud-audit';
const V33_RUNTIME_PROFILE = 'v33-two-client-cloud-audit-runtime';
const LEGACY_ROUTER = 'tools/orbit360-validar-gate-contracts-legacy-v20260717.mjs';
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_PATH = path.join(ROOT, EVIDENCE_REL);
const DEFAULT_VISUAL_REQUEST_REL = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const DEFAULT_BLOCK1_V23_REQUEST_REL = '.github/orbit360-requests/block1-client360-insurers-v23-authorization.json';
const DEFAULT_BLOCK1_V28_REQUEST_REL = '.github/orbit360-requests/block1-client360-insurers-v28-focal-provenance-universe-authorization.json';
const DEFAULT_BLOCK1_V29_REQUEST_REL = '.github/orbit360-requests/block1-client360-insurers-v29-identity-reconciliation-universe-authorization.json';
const DEFAULT_BLOCK1_V30_REQUEST_REL = '.github/orbit360-requests/block1-client360-insurers-v30-retained26-encrypted-export-authorization.json';
const DEFAULT_BLOCK1_V33_REQUEST_REL = '.github/orbit360-requests/block1-client360-insurers-v33-two-client-cloud-audit-authorization.json';
const STOP_OVERLAY_REL = 'tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json';
const CANONICAL_LIFECYCLE_COMPOSITION = 'phase-capability-contract-v1';
const ROUTER_VERSION = 'v10.2-fase-a-release-evidence';

const GATE_CONFIG = Object.freeze({
  [BLOCK1_GATE_ID]: {
    contractVersion: '1.0.41',
    lifecycle: 'tools/orbit360-validator-lifecycle-block1-v23-native-v20260807.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-block1-v23-native-v20260807.mjs',
    defaultRequest: DEFAULT_BLOCK1_V23_REQUEST_REL,
    sourcePhase: 'SOURCE_ONLY_NATIVE_MATRIX_VALIDATION'
  },
  [COBROS_10102_GATE_ID]: {
    contractVersion: '10.10.2',
    lifecycle: 'tools/orbit360-validator-lifecycle-contract-cobros-full-ledger-write-lab-v20260805.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-cobros-full-ledger-write-v20260811.mjs',
    defaultRequest: '.github/orbit360-requests/cobros-full-ledger-write-lab-v20260811.json',
    sourcePhase: 'STATIC_PREFLIGHT_PASS'
  },
  [FASE_A_OPS_LEADS_CRM_GATE_ID]: {
    contractVersion: '1.0.0',
    lifecycle: 'tools/orbit360-validator-lifecycle-fase-a-ops-leads-crm-release-v20260812.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-fase-a-ops-leads-crm-release-v20260812.mjs',
    defaultRequest: '.github/orbit360-requests/fase-a-ops-leads-crm-release-v20260812-authorization.json',
    sourcePhase: 'SOURCE_ONLY_FASE_A_OPS_LEADS_CRM_RELEASE'
  },
  ['block-auth-paula-password-reset-lab-v20260817']: {
    contractVersion: '14.0.0',
    lifecycle: 'tools/orbit360-validator-lifecycle-contract-auth-paula-password-reset-lab-v20260817.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-auth-paula-password-reset-lab-v20260817.mjs',
    defaultRequest: '.github/orbit360-requests/auth-paula-password-reset-lab-v20260817.json',
    sourcePhase: ''
  },
  ['block-auth-paula-reset-link-handoff-lab-v20260817']: {
    contractVersion: '14.1.0',
    lifecycle: 'tools/orbit360-validator-lifecycle-contract-auth-paula-reset-link-handoff-lab-v20260817.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-auth-paula-reset-link-handoff-lab-v20260817.mjs',
    defaultRequest: '.github/orbit360-requests/auth-paula-reset-link-handoff-lab-v20260817.json',
    sourcePhase: ''
  },
  ['block-auth-paula-membership-readonly-reconcile-lab-v20260817']: {
    contractVersion: '14.2.0',
    lifecycle: 'tools/orbit360-validator-lifecycle-contract-auth-paula-membership-readonly-reconcile-lab-v20260817.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-auth-paula-membership-readonly-reconcile-lab-v20260817.mjs',
    defaultRequest: '.github/orbit360-requests/auth-paula-membership-readonly-reconcile-lab-v20260817.json',
    sourcePhase: ''
  },
  ['block-auth-paula-membership-readonly-reconcile-v2-lab-v20260817']: {
    contractVersion: '14.3.0',
    lifecycle: 'tools/orbit360-validator-lifecycle-contract-auth-paula-membership-readonly-reconcile-v2-lab-v20260817.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-auth-paula-membership-readonly-reconcile-v2-lab-v20260817.mjs',
    defaultRequest: '.github/orbit360-requests/auth-paula-membership-readonly-reconcile-v2-lab-v20260817.json',
    sourcePhase: ''
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
const BLOCK1_V29_CONFIG = Object.freeze({
  contractVersion: '1.0.41',
  lifecycle: 'tools/orbit360-validator-lifecycle-block1-identity-reconciliation-universe-v29-v20260807.json',
  engine: 'tools/orbit360-validar-gate-contracts-engine-block1-identity-reconciliation-universe-v29-v20260807.mjs',
  defaultRequest: DEFAULT_BLOCK1_V29_REQUEST_REL,
  sourcePhase: 'SOURCE_ONLY_IDENTITY_RECONCILIATION_UNIVERSE_V29'
});
const BLOCK1_V30_CONFIG = Object.freeze({
  contractVersion: '1.0.41',
  lifecycle: 'tools/orbit360-validator-lifecycle-block1-retained26-psi-v30-v20260807.json',
  engine: 'tools/orbit360-validar-gate-contracts-engine-block1-retained26-psi-v30-v20260807.mjs',
  defaultRequest: DEFAULT_BLOCK1_V30_REQUEST_REL,
  sourcePhase: 'SOURCE_ONLY_RETAINED26_PSI_V30'
});
const BLOCK1_V33_CONFIG = Object.freeze({
  contractVersion: '1.0.41',
  lifecycle: 'tools/orbit360-validator-lifecycle-block1-two-client-cloud-audit-v33-v20260807.json',
  engine: 'tools/orbit360-validar-gate-contracts-engine-block1-two-client-cloud-audit-v33-v20260807.mjs',
  defaultRequest: DEFAULT_BLOCK1_V33_REQUEST_REL,
  sourcePhase: 'SOURCE_ONLY_TWO_CLIENT_CLOUD_AUDIT_V33',
  allowHistoricalConsumedRequest: true
});
const BLOCK1_V33_RUNTIME_CONFIG = Object.freeze({
  contractVersion: '1.0.41',
  lifecycle: 'tools/orbit360-validator-lifecycle-block1-two-client-cloud-audit-runtime-v33-v20260810.json',
  engine: 'tools/orbit360-validar-gate-contracts-engine-block1-two-client-cloud-audit-runtime-v33-v20260810.mjs',
  defaultRequest: DEFAULT_BLOCK1_V33_REQUEST_REL,
  sourcePhase: ''
});

const COBROS_10102_RUNTIME_CONFIG = Object.freeze({
  contractVersion: '10.10.2',
  lifecycle: 'tools/orbit360-validator-lifecycle-contract-cobros-full-ledger-write-runtime-v20260811.json',
  engine: 'tools/orbit360-validar-gate-contracts-engine-cobros-full-ledger-write-v20260811.mjs',
  defaultRequest: '.github/orbit360-requests/cobros-full-ledger-write-lab-v20260811.json',
  sourcePhase: ''
});

const PHASE_PROFILES = Object.freeze({
  STATIC_PREFLIGHT_PASS: {secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  COBROS_FULL_LEDGER_WRITE_RUNTIME: {secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  SOURCE_ONLY_NATIVE_MATRIX_VALIDATION: {secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  BLOCK1_NATIVE_MATRIX_RUNTIME_V23: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false},
  SOURCE_ONLY_FOCAL_PROVENANCE_UNIVERSE_V28: {secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  BLOCK1_FOCAL_PROVENANCE_UNIVERSE_READONLY_V28: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  SOURCE_ONLY_IDENTITY_RECONCILIATION_UNIVERSE_V29: {secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  BLOCK1_IDENTITY_RECONCILIATION_UNIVERSE_READONLY_V29: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  SOURCE_ONLY_RETAINED26_PSI_V30: {secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  BLOCK1_RETAINED26_ENCRYPTED_EXPORT_READONLY_V30: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  SOURCE_ONLY_TWO_CLIENT_CLOUD_AUDIT_V33: {secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  BLOCK1_TWO_CLIENT_CLOUD_AUDIT_READONLY_V33: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  SOURCE_ONLY_FASE_A_OPS_LEADS_CRM_RELEASE: {secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  AUTH_PAULA_PASSWORD_RESET_LAB: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  AUTH_PAULA_RESET_LINK_HANDOFF_LAB: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  AUTH_PAULA_MEMBERSHIP_READONLY_RECONCILIATION_LAB: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  AUTH_PAULA_MEMBERSHIP_READONLY_RECONCILIATION_V2_LAB: {secrets:true,firestoreRead:true,writes:false,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
  AUTH_PAULA_MEMBERSHIP_SCOPE_CANONICAL_REPAIR_LAB: {secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},
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
function isFrozenHistoricalRequest(request) {
  return request &&
    ['CONSUMED', 'CONSUMED_STOP_RETRY'].includes(String(request.status || '')) &&
    request.allowedExecutions === 0 &&
    request.consumed === true &&
    request.authorizationFrozen === true &&
    request.replayAllowed === false;
}
function failOutput(config, error) {
  return {
    schemaVersion: 'orbit360-gate-contract-preflight-canonical-router-v10.1-profile-aware',
    gateId: GATE_ID,
    contractVersion: config && config.contractVersion || '',
    status: 'VALIDATOR_STALE',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    failed: 1,
    failedCheckIds: ['CANONICAL_PREFLIGHT_ENTRYPOINT'],
    error: String(error && error.message || error),
    canonicalLifecycleComposition: CANONICAL_LIFECYCLE_COMPOSITION,
    canonicalEngine: config && config.engine || '',
    canonicalRouterVersion: ROUTER_VERSION,
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
const config = GATE_ID === COBROS_10102_GATE_ID && gateProfile === COBROS_10102_RUNTIME_PROFILE ? COBROS_10102_RUNTIME_CONFIG
  : GATE_ID === BLOCK1_GATE_ID && gateProfile === V33_RUNTIME_PROFILE ? BLOCK1_V33_RUNTIME_CONFIG
  : GATE_ID === BLOCK1_GATE_ID && gateProfile === V33_PROFILE ? BLOCK1_V33_CONFIG
  : GATE_ID === BLOCK1_GATE_ID && gateProfile === V30_PROFILE ? BLOCK1_V30_CONFIG
  : GATE_ID === BLOCK1_GATE_ID && gateProfile === V29_PROFILE ? BLOCK1_V29_CONFIG
  : GATE_ID === BLOCK1_GATE_ID && gateProfile === V28_PROFILE ? BLOCK1_V28_CONFIG
  : GATE_CONFIG[GATE_ID];

if (!config) {
  const legacyPath = path.join(ROOT, LEGACY_ROUTER);
  if (!fs.existsSync(legacyPath)) {
    const missing = {
      schemaVersion: 'orbit360-gate-contract-preflight-canonical-router-v10.1-profile-aware',
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
    const requestAbs = path.join(ROOT, requestFile);
    if (fs.existsSync(requestAbs)) {
      if (config.allowHistoricalConsumedRequest !== true) throw new Error('SOURCE_PHASE_REQUEST_MUST_BE_ABSENT');
      const request = readJson(requestFile);
      if (!isFrozenHistoricalRequest(request)) throw new Error('SOURCE_PHASE_REQUEST_NOT_FROZEN_HISTORICAL');
    }
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
    canonicalRouterVersion: ROUTER_VERSION,
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
