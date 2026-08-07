#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync as nodeSpawnSync } from 'node:child_process';

export const V24_HANDOFF_SCHEMA = 'orbit360-canonical-preflight-evidence-handoff-v24';
export const GATE_ID = 'block1-client360-insurers-lab-v20260717';
export const CONTRACT_VERSION = '1.0.41';
export const CANONICAL_OWNER_SCOPE = 'v23_native_overlay_replace_historical_css_owner';
export const CANONICAL_ENGINE = 'tools/orbit360-validar-gate-contracts-engine-block1-v23-native-v20260807.mjs';
export const CANONICAL_RUNTIME_ARTIFACT = 'tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs';
export const CANONICAL_EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
export const SOURCE_PHASE = 'SOURCE_ONLY_NATIVE_MATRIX_VALIDATION';
export const RUNTIME_PHASE = 'BLOCK1_NATIVE_MATRIX_RUNTIME_V23';

const SOURCE_EXPECTED = Object.freeze({
  status: 'PASS_GATE_CONTRACT_SOURCE_V23',
  phase: SOURCE_PHASE,
  executionAuthorized: false,
  secretAccessAuthorized: false,
  firestoreReadAuthorized: false,
  writeAuthorized: false,
  runtimeAuthorized: false,
  browserAuthorized: false,
  hostingDeployAuthorized: false,
  functionsDeployAuthorized: false,
  rulesDeployAuthorized: false,
  productionAuthorized: false
});

const RUNTIME_EXPECTED = Object.freeze({
  status: 'GO_GATE_CONTRACT',
  phase: RUNTIME_PHASE,
  executionAuthorized: true,
  secretAccessAuthorized: true,
  firestoreReadAuthorized: true,
  writeAuthorized: false,
  runtimeAuthorized: true,
  browserAuthorized: true,
  hostingDeployAuthorized: true,
  functionsDeployAuthorized: false,
  rulesDeployAuthorized: false,
  productionAuthorized: false
});

export class CanonicalEvidenceError extends Error {
  constructor(code, detail = '') {
    super(`${code}${detail ? `: ${detail}` : ''}`);
    this.name = 'CanonicalEvidenceError';
    this.code = code;
    this.detail = detail;
  }
}

function required(condition, code, detail = '') {
  if (!condition) throw new CanonicalEvidenceError(code, detail);
}

export function validateCanonicalEvidence(payload, mode = 'source') {
  const expected = mode === 'runtime' ? RUNTIME_EXPECTED : mode === 'source' ? SOURCE_EXPECTED : null;
  required(expected, 'V24_HANDOFF_MODE_INVALID', mode);
  required(payload && typeof payload === 'object' && !Array.isArray(payload), 'V24_CANONICAL_EVIDENCE_NOT_OBJECT');
  required(payload.gateId === GATE_ID, 'V24_CANONICAL_GATE_ID_MISMATCH', String(payload.gateId || ''));
  required(payload.contractVersion === CONTRACT_VERSION, 'V24_CANONICAL_CONTRACT_VERSION_MISMATCH', String(payload.contractVersion || ''));
  required(payload.executionPhase === expected.phase, 'V24_CANONICAL_PHASE_MISMATCH', String(payload.executionPhase || ''));
  required(payload.status === expected.status, 'V24_CANONICAL_STATUS_NOT_PASS', String(payload.status || ''));
  required(payload.ok === true, 'V24_CANONICAL_OK_FALSE');
  required(payload.canonicalOwnerScope === CANONICAL_OWNER_SCOPE, 'V24_CANONICAL_OWNER_MISMATCH', String(payload.canonicalOwnerScope || ''));
  required(payload.canonicalEngine === CANONICAL_ENGINE, 'V24_CANONICAL_ENGINE_MISMATCH', String(payload.canonicalEngine || ''));
  required(payload.nativeRuntimeArtifact === CANONICAL_RUNTIME_ARTIFACT, 'V24_CANONICAL_RUNTIME_ARTIFACT_MISMATCH', String(payload.nativeRuntimeArtifact || ''));
  required(payload.engineEvidenceSource === 'sync-file-evidence-not-stdout-v1', 'V24_CANONICAL_EVIDENCE_SOURCE_MISMATCH', String(payload.engineEvidenceSource || ''));
  required(payload.sourceTransformed === false, 'V24_CANONICAL_SOURCE_TRANSFORMED');
  for (const [key, value] of Object.entries(expected)) {
    if (key === 'status' || key === 'phase') continue;
    required(payload[key] === value, `V24_CANONICAL_CAPABILITY_MISMATCH_${key}`, String(payload[key]));
  }
  if (mode === 'source') {
    required(payload.requestPresent === false, 'V24_SOURCE_REQUEST_PRESENT');
    required(Number(payload.hostingDeploysMaximum || 0) === 0, 'V24_SOURCE_HOSTING_DEPLOY_MAX_INVALID', String(payload.hostingDeploysMaximum));
  } else {
    required(Number(payload.hostingDeploysMaximum) === 1, 'V24_RUNTIME_HOSTING_DEPLOY_MAX_INVALID', String(payload.hostingDeploysMaximum));
    required(payload.universeAdjudicationRequiredBeforeHosting === true, 'V24_RUNTIME_UNIVERSE_GATE_MISSING');
    required(Number(payload.firestoreWritesAuthorized || 0) === 0, 'V24_RUNTIME_FIRESTORE_WRITES_AUTHORIZED');
    required(Number(payload.authWritesAuthorized || 0) === 0, 'V24_RUNTIME_AUTH_WRITES_AUTHORIZED');
    required(Number(payload.operationalWritesAuthorized || 0) === 0, 'V24_RUNTIME_OPERATIONAL_WRITES_AUTHORIZED');
  }
  return payload;
}

export function readFreshCanonicalEvidence({ root = process.cwd(), evidenceRel = CANONICAL_EVIDENCE_REL, invocationStartedAtMs, mode = 'source', freshnessToleranceMs = 1500 }) {
  const abs = path.join(root, evidenceRel);
  required(fs.existsSync(abs), 'V24_CANONICAL_EVIDENCE_MISSING', evidenceRel);
  const stat = fs.statSync(abs);
  if (Number.isFinite(invocationStartedAtMs)) {
    required(stat.mtimeMs + freshnessToleranceMs >= invocationStartedAtMs, 'V24_CANONICAL_EVIDENCE_STALE', `${stat.mtimeMs}<${invocationStartedAtMs}`);
  }
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new CanonicalEvidenceError('V24_CANONICAL_EVIDENCE_JSON_INVALID', String(error && error.message || error));
  }
  return validateCanonicalEvidence(payload, mode);
}

export function runCanonicalAndReadEvidence({
  root = process.cwd(),
  canonicalPreflight,
  gateId = GATE_ID,
  evidenceRel = CANONICAL_EVIDENCE_REL,
  mode = 'source',
  env = process.env,
  spawnSyncFn = nodeSpawnSync,
  beforeSpawn
}) {
  const abs = path.join(root, evidenceRel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
  const invocationStartedAtMs = Date.now();
  if (typeof beforeSpawn === 'function') beforeSpawn({ abs, invocationStartedAtMs });
  const run = spawnSyncFn(process.execPath, [canonicalPreflight, gateId], {
    cwd: root,
    env,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  required(run && run.status === 0, 'V24_CANONICAL_PREFLIGHT_PROCESS_FAILED', String(run && run.status));
  const payload = readFreshCanonicalEvidence({ root, evidenceRel, invocationStartedAtMs, mode });
  return {
    schemaVersion: V24_HANDOFF_SCHEMA,
    payload,
    stdoutIgnoredForDecision: true,
    stderrIgnoredForDecision: true,
    processStatus: run.status,
    evidenceRel,
    invocationStartedAtMs
  };
}
