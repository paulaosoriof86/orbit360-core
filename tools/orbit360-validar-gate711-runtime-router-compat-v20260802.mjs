#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/gate711-runtime-router-compat-v20260802.json');
const TEMPLATE = 'tools/orbit360-gate711-release-critical-runtime-lifecycle-template-v20260802.json';
const ROUTER = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const WORKFLOW = '.github/workflows/orbit360-gate711-release-critical-runtime-v20260802.yml';
const EXPECTED_CAPABILITIES = {
  secrets: true,
  firestoreRead: true,
  writes: false,
  runtime: true,
  browser: true,
  deploy: false,
  functionsDeploy: false,
  rulesDeploy: false,
  production: false
};

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail });
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));
const exactObject = (actual, expected) => {
  const actualKeys = Object.keys(actual || {}).sort();
  const expectedKeys = Object.keys(expected).sort();
  return JSON.stringify(actualKeys) === JSON.stringify(expectedKeys) && expectedKeys.every(key => actual[key] === expected[key]);
};

try {
  [TEMPLATE, ROUTER, WORKFLOW].forEach(rel => add('FILE_' + path.basename(rel).replace(/\W+/g, '_').toUpperCase(), fs.existsSync(path.join(ROOT, rel)), rel));
  if (checks.some(check => !check.ok)) throw new Error('PIPELINE_MECHANISM_FAILURE:MISSING_FILE');

  const template = readJson(TEMPLATE);
  const router = read(ROUTER);
  const workflow = read(WORKFLOW);
  const profile = template.intendedExecutionProfileAfterAuthorization || {};

  add('ROUTER_CANONICAL_REVISION', router.includes("const CANONICAL_LIFECYCLE_COMPOSITION='phase-capability-contract-v1'"));
  add('ROUTER_EXACT_CAPABILITIES', router.includes('function exactCapabilities(actual,expected)'));
  add('TEMPLATE_REVISION', template.validatorLifecycleRevision === 'phase-capability-contract-v1');
  add('TEMPLATE_PHASE', profile.phase === 'LAB_RUNTIME_GATE');
  add('TEMPLATE_CAPABILITIES_EXACT', exactObject(profile.capabilities, EXPECTED_CAPABILITIES));
  add('TEMPLATE_NO_CREDENTIALREAD_ALIAS', !Object.prototype.hasOwnProperty.call(profile.capabilities || {}, 'credentialRead'));
  add('WORKFLOW_CANONICAL_ENTRYPOINT', workflow.includes('node tools/orbit360-validar-gate-contracts-v20260717.mjs "$ORBIT360_GATE_ID"'));
  add('WORKFLOW_PREFLIGHT_BEFORE_SECRET_STEP', workflow.indexOf('Gate contractual obligatorio antes de secrets') >= 0 && workflow.indexOf('Resolver identidad de servicio LAB') > workflow.indexOf('Gate contractual obligatorio antes de secrets'));
  add('WORKFLOW_STOP_RETRY', workflow.includes('STOP_RETRY'));

  const failed = checks.filter(check => !check.ok);
  const result = {
    schemaVersion: 'orbit360-gate711-runtime-router-compat-evidence-v1',
    gateId: 'block7-canonical-runtime-cumulative-visual-lab-v20260801',
    status: failed.length ? 'GATE711_RUNTIME_ROUTER_COMPAT_FAIL' : 'GATE711_RUNTIME_ROUTER_COMPAT_PASS',
    classification: failed.length ? 'VALIDATOR_STALE' : 'GO_STATIC_RUNTIME_ROUTER_COMPAT',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    failedCheckIds: failed.map(check => check.id),
    checks,
    priorRuntimeFailure: {
      run: 30772737476,
      job: 91562610825,
      artifact: 8841039787,
      artifactDigest: 'sha256:faedbb562500ed403746818bfb0e77ff13adb15000fe38c545e4ee59be3e6664',
      failedStage: 'CANONICAL_PREFLIGHT_ENTRYPOINT',
      error: 'CANONICAL_LIFECYCLE_REVISION_MISMATCH',
      secretsRead: false,
      firestoreRead: false,
      runtimeExecuted: false,
      browserExecuted: false,
      operationalWrites: 0,
      replayAllowed: false
    },
    productFilesChanged: 0,
    secretsAccessed: false,
    firestoreReads: 0,
    firestoreWrites: 0,
    operationalWrites: 0,
    runtimeExecuted: false,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    ok: failed.length === 0
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result, null, 2));
  process.exit(failed.length ? 41 : 0);
} catch (error) {
  const failed = checks.filter(check => !check.ok);
  const result = {
    schemaVersion: 'orbit360-gate711-runtime-router-compat-evidence-v1',
    gateId: 'block7-canonical-runtime-cumulative-visual-lab-v20260801',
    status: 'GATE711_RUNTIME_ROUTER_COMPAT_FAIL',
    classification: String(error && error.message || error).split(':')[0] || 'PIPELINE_MECHANISM_FAILURE',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: Math.max(1, failed.length),
    failedCheckIds: failed.map(check => check.id),
    error: String(error && error.message || error).slice(0, 500),
    secretsAccessed: false,
    firestoreReads: 0,
    firestoreWrites: 0,
    operationalWrites: 0,
    runtimeExecuted: false,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    ok: false
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result, null, 2));
  process.exit(41);
}
