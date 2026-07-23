#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE_ID = process.argv[2] || 'block1-client360-insurers-lab-v20260717';
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_PATH = path.join(ROOT, EVIDENCE_REL);
const CANONICAL_LIFECYCLE_COMPOSITION = 'phase-capability-contract-v1';
const GATE_CONFIG = Object.freeze({
  'block1-client360-insurers-lab-v20260717': {
    contractVersion: '1.0.40',
    lifecycle: 'tools/orbit360-validator-lifecycle-contract-v20260722.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-capabilities-v20260722.mjs'
  },
  'block2-product-readonly-bootstrap-v20260723': {
    contractVersion: '2.0.0',
    lifecycle: 'tools/orbit360-validator-lifecycle-contract-m2-v20260723.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-m2-v20260723.mjs'
  },
  'block2-product-readonly-runtime-v20260723': {
    contractVersion: '2.1.0',
    lifecycle: 'tools/orbit360-validator-lifecycle-contract-m2-runtime-v20260723.json',
    engine: 'tools/orbit360-validar-gate-contracts-engine-m2-runtime-v20260723.mjs'
  }
});
const PHASE_PROFILES = Object.freeze({
  STATIC_PREFLIGHT: { secrets:false, firestoreRead:false, writes:false, runtime:false, browser:false, deploy:false, functionsDeploy:false, rulesDeploy:false, production:false },
  LAB_DATA_CONTRACT_REPAIR_DRYRUN: { secrets:true, firestoreRead:true, writes:false, runtime:false, browser:false, deploy:false, functionsDeploy:false, rulesDeploy:false, production:false },
  LAB_DATA_CONTRACT_REPAIR_APPLY: { secrets:true, firestoreRead:true, writes:true, runtime:false, browser:false, deploy:false, functionsDeploy:false, rulesDeploy:false, production:false },
  LAB_HOSTING_DELIVERY: { secrets:true, firestoreRead:false, writes:false, runtime:false, browser:false, deploy:true, functionsDeploy:false, rulesDeploy:false, production:false },
  LAB_RUNTIME_GATE: { secrets:true, firestoreRead:true, writes:false, runtime:true, browser:true, deploy:false, functionsDeploy:false, rulesDeploy:false, production:false },
  PRODUCT_READONLY_RUNTIME: { secrets:true, firestoreRead:true, writes:true, runtime:true, browser:false, deploy:false, functionsDeploy:false, rulesDeploy:true, production:true }
});

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function exactCapabilities(actual, expected) {
  const actualKeys = Object.keys(actual || {}).sort();
  const expectedKeys = Object.keys(expected || {}).sort();
  return JSON.stringify(actualKeys) === JSON.stringify(expectedKeys) && expectedKeys.every(key => actual[key] === expected[key]);
}

function writeEvidence(payload) {
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

let output;
let exitCode = 41;
try {
  const config = GATE_CONFIG[GATE_ID];
  if (!config) throw new Error('CANONICAL_GATE_NOT_REGISTERED_IN_ENTRYPOINT');
  if (!fs.existsSync(path.join(ROOT, config.lifecycle))) throw new Error('CANONICAL_LIFECYCLE_CONTRACT_MISSING');
  if (!fs.existsSync(path.join(ROOT, config.engine))) throw new Error('CANONICAL_ENGINE_MISSING');

  const lifecycle = readJson(config.lifecycle);
  if (lifecycle.gateId !== GATE_ID) throw new Error('CANONICAL_GATE_MISMATCH');
  if (lifecycle.gateContractVersion !== config.contractVersion) throw new Error('CANONICAL_GATE_VERSION_MISMATCH');
  if (lifecycle.validatorLifecycleRevision !== CANONICAL_LIFECYCLE_COMPOSITION) throw new Error('CANONICAL_LIFECYCLE_REVISION_MISMATCH');
  const profile = lifecycle.executionProfile || {};
  const expected = PHASE_PROFILES[String(profile.phase || '')];
  if (!expected) throw new Error('CANONICAL_LIFECYCLE_PHASE_MISMATCH');
  if (!exactCapabilities(profile.capabilities || {}, expected)) throw new Error('CANONICAL_LIFECYCLE_CAPABILITY_MISMATCH');

  const run = spawnSync(process.execPath, [config.engine, GATE_ID], {
    cwd: ROOT,
    env: { ...process.env, ORBIT360_BRANCH: 'ays/backend-tenant-lab-v99-20260703' },
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
  const config = GATE_CONFIG[GATE_ID] || {};
  output = {
    schemaVersion: 'orbit360-gate-contract-preflight-canonical-router-v1',
    gateId: GATE_ID,
    contractVersion: config.contractVersion || '',
    status: 'VALIDATOR_STALE',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    failed: 1,
    failedCheckIds: ['CANONICAL_PREFLIGHT_ENTRYPOINT'],
    error: String(error && error.message || error),
    canonicalLifecycleComposition: CANONICAL_LIFECYCLE_COMPOSITION,
    canonicalEngine: config.engine || '',
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
  exitCode = 41;
}

writeEvidence(output);
console.log(JSON.stringify(output, null, 2));
process.exit(exitCode);
