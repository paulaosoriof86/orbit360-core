#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE_ID = process.argv[2] || 'block1-client360-insurers-lab-v20260717';
const NEW_GATE_ID = 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805';
const LEGACY_ROUTER = 'tools/orbit360-validar-gate-contracts-legacy-v20260717.mjs';
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_PATH = path.join(ROOT, EVIDENCE_REL);
const DEFAULT_REQUEST_REL = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const CANONICAL_LIFECYCLE_COMPOSITION = 'phase-capability-contract-v1';
const NEW_GATE_CONFIG = Object.freeze({
  "block2.7-visual-matrix-corrected-post-auth-lab-v20260805":{contractVersion:"2.7.8",lifecycle:"tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json",engine:"tools/orbit360-validar-gate-contracts-engine-visual-matrix-corrected-post-auth-lab-v20260805.mjs"}
});
const NEW_PHASE_PROFILES = Object.freeze({
  "VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:true,functionsDeploy:false,rulesDeploy:false,production:false}
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

if (GATE_ID !== NEW_GATE_ID) {
  const legacyPath = path.join(ROOT, LEGACY_ROUTER);
  if (!fs.existsSync(legacyPath)) {
    writeEvidence({
      schemaVersion: 'orbit360-gate-contract-preflight-canonical-router-v2',
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
    });
    process.exit(41);
  }
  const legacy = spawnSync(process.execPath, [legacyPath, ...process.argv.slice(2)], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit'
  });
  process.exit(Number.isInteger(legacy.status) ? legacy.status : 41);
}

let output;
let exitCode = 41;
try {
  const config = NEW_GATE_CONFIG[GATE_ID];
  if (!config) throw new Error('CANONICAL_GATE_NOT_REGISTERED_IN_ENTRYPOINT');
  if (!fs.existsSync(path.join(ROOT, config.lifecycle))) throw new Error('CANONICAL_LIFECYCLE_CONTRACT_MISSING');
  if (!fs.existsSync(path.join(ROOT, config.engine))) throw new Error('CANONICAL_ENGINE_MISSING');
  const lifecycle = readJson(config.lifecycle);
  if (lifecycle.gateId !== GATE_ID) throw new Error('CANONICAL_GATE_MISMATCH');
  if (lifecycle.gateContractVersion !== config.contractVersion) throw new Error('CANONICAL_GATE_VERSION_MISMATCH');
  if (lifecycle.validatorLifecycleRevision !== CANONICAL_LIFECYCLE_COMPOSITION) throw new Error('CANONICAL_LIFECYCLE_REVISION_MISMATCH');
  const profile = lifecycle.executionProfile || {};
  const expected = NEW_PHASE_PROFILES[String(profile.phase || '')];
  if (!expected) throw new Error('CANONICAL_LIFECYCLE_PHASE_MISMATCH');
  if (!exactCapabilities(profile.capabilities || {}, expected)) throw new Error('CANONICAL_LIFECYCLE_CAPABILITY_MISMATCH');

  const requestFile = process.env.ORBIT360_REQUEST_FILE || DEFAULT_REQUEST_REL;
  const requestAbs = path.join(ROOT, requestFile);
  if (!fs.existsSync(requestAbs) || !fs.statSync(requestAbs).isFile()) throw new Error('CANONICAL_REQUEST_FILE_UNAVAILABLE');

  const run = spawnSync(process.execPath, [config.engine, GATE_ID], {
    cwd: ROOT,
    env: {
      ...process.env,
      ORBIT360_BRANCH: 'ays/backend-tenant-lab-v99-20260703',
      ORBIT360_REQUEST_FILE: requestFile
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
    canonicalRouterVersion: 'v3-request-path-propagation-portable',
    legacyDelegate: LEGACY_ROUTER,
    legacyDelegateBlob: '03d1c45db555a3e482afb4be6aaf8d29c74a79dc',
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
  const config = NEW_GATE_CONFIG[GATE_ID] || {};
  output = {
    schemaVersion: 'orbit360-gate-contract-preflight-canonical-router-v3',
    gateId: GATE_ID,
    contractVersion: config.contractVersion || '',
    status: 'VALIDATOR_STALE',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    failed: 1,
    failedCheckIds: ['CANONICAL_PREFLIGHT_ENTRYPOINT'],
    error: String(error && error.message || error),
    canonicalLifecycleComposition: CANONICAL_LIFECYCLE_COMPOSITION,
    canonicalEngine: config.engine || '',
    canonicalRouterVersion: 'v3-request-path-propagation-portable',
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
  exitCode = 41;
}
writeEvidence(output);
console.log(JSON.stringify(output, null, 2));
process.exit(exitCode);
