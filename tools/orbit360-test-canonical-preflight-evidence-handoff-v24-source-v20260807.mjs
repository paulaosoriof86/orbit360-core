#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  runCanonicalAndReadEvidence,
  readFreshCanonicalEvidence,
  validateCanonicalEvidence,
  CanonicalEvidenceError,
  CANONICAL_EVIDENCE_REL,
  GATE_ID,
  CONTRACT_VERSION,
  CANONICAL_OWNER_SCOPE,
  CANONICAL_ENGINE,
  CANONICAL_RUNTIME_ARTIFACT,
  SOURCE_PHASE
} from './orbit360-canonical-preflight-evidence-handoff-v24.mjs';

const wrapperPath = 'tools/orbit360-preflight-block1-v23-native-v20260807.mjs';
const wrapper = fs.readFileSync(wrapperPath, 'utf8');
const helper = fs.readFileSync('tools/orbit360-canonical-preflight-evidence-handoff-v24.mjs', 'utf8');
const checks = {};
const failures = [];

function record(id, ok, detail = '') {
  checks[id] = !!ok;
  if (!ok) failures.push({ id, detail: String(detail).slice(0, 300) });
}
function expectCode(id, fn, code) {
  try { fn(); record(id, false, 'did not throw'); }
  catch (error) { record(id, error instanceof CanonicalEvidenceError && error.code === code, `${error && error.code}:${error && error.message}`); }
}
function validSourcePayload(overrides = {}) {
  return {
    schemaVersion: 'orbit360-gate-contract-preflight-v23-native-block1',
    gateId: GATE_ID,
    contractVersion: CONTRACT_VERSION,
    executionPhase: SOURCE_PHASE,
    status: 'PASS_GATE_CONTRACT_SOURCE_V23',
    classification: 'VALIDATOR_STALE_CORRECTED_SOURCE_ONLY',
    canonicalOwnerScope: CANONICAL_OWNER_SCOPE,
    canonicalEngine: CANONICAL_ENGINE,
    nativeRuntimeArtifact: CANONICAL_RUNTIME_ARTIFACT,
    engineEvidenceSource: 'sync-file-evidence-not-stdout-v1',
    sourceTransformed: false,
    requestPresent: false,
    executionAuthorized: false,
    secretAccessAuthorized: false,
    firestoreReadAuthorized: false,
    writeAuthorized: false,
    runtimeAuthorized: false,
    browserAuthorized: false,
    hostingDeployAuthorized: false,
    hostingDeploysMaximum: 0,
    functionsDeployAuthorized: false,
    rulesDeployAuthorized: false,
    productionAuthorized: false,
    ok: true,
    ...overrides
  };
}
function withTemp(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-v24-handoff-'));
  try { return fn(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
function writeEvidence(root, value) {
  const abs = path.join(root, CANONICAL_EVIDENCE_REL);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (typeof value === 'string') fs.writeFileSync(abs, value, 'utf8');
  else fs.writeFileSync(abs, JSON.stringify(value, null, 2) + '\n', 'utf8');
  return abs;
}

withTemp(root => {
  const prettyStdout = JSON.stringify(validSourcePayload(), null, 2) + '\n';
  const handoff = runCanonicalAndReadEvidence({
    root,
    canonicalPreflight: 'fake-canonical.mjs',
    mode: 'source',
    spawnSyncFn: () => {
      writeEvidence(root, validSourcePayload());
      return { status: 0, stdout: prettyStdout, stderr: '' };
    }
  });
  record('prettyMultilineStdoutEndingBraceIgnored', handoff.payload.status === 'PASS_GATE_CONTRACT_SOURCE_V23' && prettyStdout.trim().endsWith('}') && handoff.stdoutIgnoredForDecision === true);
});

withTemp(root => expectCode('missingEvidenceFailsClosed', () => runCanonicalAndReadEvidence({ root, canonicalPreflight: 'fake.mjs', mode: 'source', spawnSyncFn: () => ({ status: 0, stdout: '{\n  "ok": true\n}\n', stderr: '' }) }), 'V24_CANONICAL_EVIDENCE_MISSING'));
withTemp(root => expectCode('invalidJsonFailsClosed', () => runCanonicalAndReadEvidence({ root, canonicalPreflight: 'fake.mjs', mode: 'source', spawnSyncFn: () => { writeEvidence(root, '{ invalid'); return { status: 0, stdout: 'pretty\n}\n', stderr: '' }; } }), 'V24_CANONICAL_EVIDENCE_JSON_INVALID'));
expectCode('wrongGateFailsClosed', () => validateCanonicalEvidence(validSourcePayload({ gateId: 'wrong-gate' }), 'source'), 'V24_CANONICAL_GATE_ID_MISMATCH');
expectCode('wrongVersionFailsClosed', () => validateCanonicalEvidence(validSourcePayload({ contractVersion: '1.0.40' }), 'source'), 'V24_CANONICAL_CONTRACT_VERSION_MISMATCH');
expectCode('wrongPhaseFailsClosed', () => validateCanonicalEvidence(validSourcePayload({ executionPhase: 'OTHER_PHASE' }), 'source'), 'V24_CANONICAL_PHASE_MISMATCH');
expectCode('nonPassStatusFailsClosed', () => validateCanonicalEvidence(validSourcePayload({ status: 'VALIDATOR_STALE' }), 'source'), 'V24_CANONICAL_STATUS_NOT_PASS');
expectCode('wrongOwnerFailsClosed', () => validateCanonicalEvidence(validSourcePayload({ canonicalOwnerScope: 'legacy-owner' }), 'source'), 'V24_CANONICAL_OWNER_MISMATCH');
expectCode('wrongArtifactFailsClosed', () => validateCanonicalEvidence(validSourcePayload({ nativeRuntimeArtifact: 'other.mjs' }), 'source'), 'V24_CANONICAL_RUNTIME_ARTIFACT_MISMATCH');
expectCode('wrongCapabilityFailsClosed', () => validateCanonicalEvidence(validSourcePayload({ secretAccessAuthorized: true }), 'source'), 'V24_CANONICAL_CAPABILITY_MISMATCH_secretAccessAuthorized');

withTemp(root => {
  const abs = writeEvidence(root, validSourcePayload());
  const old = new Date(Date.now() - 120000);
  fs.utimesSync(abs, old, old);
  expectCode('staleEvidenceFailsClosed', () => readFreshCanonicalEvidence({ root, invocationStartedAtMs: Date.now(), mode: 'source', freshnessToleranceMs: 0 }), 'V24_CANONICAL_EVIDENCE_STALE');
});

record('wrapperHasNoStdoutJsonParse', !wrapper.includes('canonical.stdout') && !wrapper.includes('.split(/\\r?\\n/)') && !wrapper.includes('.pop()'));
record('helperDoesNotUseStdoutForDecision', !helper.includes('run.stdout') && !helper.includes('JSON.parse(run') && helper.includes('stdoutIgnoredForDecision: true'));
record('wrapperUsesStructuredEvidenceAuthority', wrapper.includes('runCanonicalAndReadEvidence') && wrapper.includes('CANONICAL_EVIDENCE_REL') && wrapper.includes('stdoutUsedForDecision: false'));
record('ownerAndArtifactRemainPinned', wrapper.includes("const CONTRACT_VERSION = '1.0.41'") && wrapper.includes("tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs") && helper.includes(CANONICAL_OWNER_SCOPE));

const output = {
  schemaVersion: 'orbit360-v24-canonical-preflight-evidence-handoff-source-fixtures-v1',
  status: failures.length ? 'STOP_V24_HANDOFF_SOURCE_FIXTURES' : 'PASS_V24_HANDOFF_SOURCE_FIXTURES',
  classification: failures.length ? 'PIPELINE_MECHANISM_FAILURE' : 'PIPELINE_MECHANISM_FAILURE_CORRECTED_SOURCE_ONLY',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failures.length,
  failures,
  checks,
  prettyStdoutDecisionAuthority: false,
  canonicalEvidenceDecisionAuthority: true,
  secretsRead: false,
  firebaseAccess: false,
  browserExecuted: false,
  hostingTouched: false,
  writes: 0,
  productionTouched: false,
  ok: failures.length === 0
};
console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 41);
