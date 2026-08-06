#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  GATE_ID,
  CONTRACT_VERSION,
  REQUEST_REL,
  FROZEN_STATUS,
  ACTIVE_STATUS,
  SOURCE_PASS,
  activateLifecycle,
  buildSyntheticRequest,
  validateActivatedLifecycle,
  validateFrozenLifecycle,
  validateRequestBinding
} from './orbit360-visual-matrix-lifecycle-sequence-v20260806.mjs';

const ROOT = process.cwd();
const LIFECYCLE_REL = 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const FIXTURE_REL = 'tools/fixtures/orbit360-visual-matrix-lifecycle-sequence-fixture-v20260806.json';
const PREFLIGHT_REL = 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json';
const EVIDENCE_REL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-lifecycle-sequence-source-test-sanitized-v20260806.json';
const ROUTER_REL = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';

const abs = rel => path.join(ROOT, rel);
const readJson = rel => JSON.parse(fs.readFileSync(abs(rel), 'utf8'));
const writeJson = (rel, value) => {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), JSON.stringify(value, null, 2) + '\n', 'utf8');
};

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: options.env || process.env,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
}

function runGit(cwd, args) {
  const result = run('git', args, { cwd });
  if (result.status !== 0) {
    throw new Error(`GIT_${args[0]}_FAILED:${String(result.stderr || result.stdout || '').trim().slice(0, 500)}`);
  }
  return String(result.stdout || '').trim();
}

const checks = {};
function check(id, condition) {
  checks[id] = Boolean(condition);
  if (!condition) throw new Error(id);
}

const lifecycleOriginalText = fs.readFileSync(abs(LIFECYCLE_REL), 'utf8');
const preflightOriginalExists = fs.existsSync(abs(PREFLIGHT_REL));
const preflightOriginalText = preflightOriginalExists ? fs.readFileSync(abs(PREFLIGHT_REL), 'utf8') : '';
const requestOriginalExists = fs.existsSync(abs(REQUEST_REL));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-lifecycle-sequence-'));
let unexpectedError = '';
let negativeEvidence = null;
let positiveEvidence = null;
let baseHead = '';
let activationHead = '';
let requestHead = '';

try {
  const fixture = readJson(FIXTURE_REL);
  const frozenLifecycle = JSON.parse(lifecycleOriginalText);

  check('fixtureSchema', fixture.schemaVersion === 'orbit360-visual-matrix-lifecycle-sequence-fixture-v1');
  check('fixtureGate', fixture.gateId === GATE_ID);
  check('fixtureContract', fixture.contractVersion === CONTRACT_VERSION);
  check('fixtureFrozenStatus', fixture.frozenStatus === FROZEN_STATUS);
  check('fixtureActiveStatus', fixture.activeStatus === ACTIVE_STATUS);
  check('fixtureSourcePass', fixture.sourcePass === SOURCE_PASS);
  check('fixtureRequestPath', fixture.requestPath === REQUEST_REL);
  check('runtimeRequestAbsentBeforeTest', requestOriginalExists === false);
  check('frozenLifecycleValid', validateFrozenLifecycle(frozenLifecycle) === true);

  runGit(tempRoot, ['init']);
  runGit(tempRoot, ['config', 'user.name', 'Orbit360 Source Test']);
  runGit(tempRoot, ['config', 'user.email', 'source-test@orbit360.invalid']);

  const tempLifecyclePath = path.join(tempRoot, LIFECYCLE_REL);
  const tempRequestPath = path.join(tempRoot, REQUEST_REL);
  fs.mkdirSync(path.dirname(tempLifecyclePath), { recursive: true });
  fs.writeFileSync(tempLifecyclePath, lifecycleOriginalText, 'utf8');
  runGit(tempRoot, ['add', LIFECYCLE_REL]);
  runGit(tempRoot, ['commit', '-m', 'fixture: frozen lifecycle']);
  baseHead = runGit(tempRoot, ['rev-parse', 'HEAD']);
  check('baseHeadSha40', /^[a-f0-9]{40}$/.test(baseHead));

  const activatedLifecycle = activateLifecycle(frozenLifecycle, { sourceHead: baseHead });
  check('activatedLifecycleValid', validateActivatedLifecycle(activatedLifecycle) === true);
  fs.writeFileSync(tempLifecyclePath, JSON.stringify(activatedLifecycle, null, 2) + '\n', 'utf8');
  runGit(tempRoot, ['add', LIFECYCLE_REL]);
  runGit(tempRoot, ['commit', '-m', 'fixture: explicit lifecycle activation parent']);
  activationHead = runGit(tempRoot, ['rev-parse', 'HEAD']);
  check('activationHeadSha40', /^[a-f0-9]{40}$/.test(activationHead));
  check('activationParentIsBase', runGit(tempRoot, ['rev-parse', 'HEAD^']) === baseHead);
  check('activationCommitOnlyLifecycle', runGit(tempRoot, ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']) === LIFECYCLE_REL);

  const syntheticRequest = buildSyntheticRequest({ parentHead: activationHead });
  check('requestBindingValid', validateRequestBinding(syntheticRequest, activationHead) === true);
  fs.mkdirSync(path.dirname(tempRequestPath), { recursive: true });
  fs.writeFileSync(tempRequestPath, JSON.stringify(syntheticRequest, null, 2) + '\n', 'utf8');
  runGit(tempRoot, ['add', REQUEST_REL]);
  runGit(tempRoot, ['commit', '-m', 'fixture: sole-file request child']);
  requestHead = runGit(tempRoot, ['rev-parse', 'HEAD']);
  check('requestHeadSha40', /^[a-f0-9]{40}$/.test(requestHead));
  check('requestParentIsActivation', runGit(tempRoot, ['rev-parse', 'HEAD^']) === activationHead);
  check('requestCommitOnlyRequest', runGit(tempRoot, ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']) === REQUEST_REL);
  check('requestFileParentBinding', JSON.parse(fs.readFileSync(tempRequestPath, 'utf8')).parentHead === activationHead);

  const safeEnv = {
    PATH: process.env.PATH || '',
    HOME: process.env.HOME || tempRoot,
    LANG: 'C.UTF-8',
    ORBIT360_REQUEST_FILE: REQUEST_REL,
    ORBIT360_BRANCH: 'ays/backend-tenant-lab-v99-20260703'
  };

  fs.writeFileSync(abs(REQUEST_REL), JSON.stringify(syntheticRequest, null, 2) + '\n', 'utf8');
  fs.writeFileSync(abs(LIFECYCLE_REL), lifecycleOriginalText, 'utf8');
  const negative = run(process.execPath, [ROUTER_REL, GATE_ID], { env: safeEnv });
  negativeEvidence = readJson(PREFLIGHT_REL);
  check('prematureRequestBlocked', negative.status === 41);
  check('prematureRequestStatusStop', negativeEvidence.status === 'STOP_GATE_CONTRACT');
  check('prematureRequestNotOk', negativeEvidence.ok === false);
  check('prematureRequestAuthorizationCheckFailed', Array.isArray(negativeEvidence.failedCheckIds) && negativeEvidence.failedCheckIds.includes('authorizationReserved'));
  check('prematureRequestBoundaryCheckFailed', Array.isArray(negativeEvidence.failedCheckIds) && negativeEvidence.failedCheckIds.includes('executionBoundaries'));
  check('prematureRequestNoSecrets', negativeEvidence.secretsRead === false && negativeEvidence.secretAccess === false);
  check('prematureRequestNoRuntime', negativeEvidence.runtimeExecuted === false && negativeEvidence.browserExecuted === false && negativeEvidence.deployExecuted === false);

  fs.writeFileSync(abs(LIFECYCLE_REL), JSON.stringify(activatedLifecycle, null, 2) + '\n', 'utf8');
  const positive = run(process.execPath, [ROUTER_REL, GATE_ID], { env: safeEnv });
  positiveEvidence = readJson(PREFLIGHT_REL);
  check('activatedSequenceRouterExitZero', positive.status === 0);
  check('activatedSequenceGoGate', positiveEvidence.status === 'GO_GATE_CONTRACT');
  check('activatedSequenceOk', positiveEvidence.ok === true && positiveEvidence.failed === 0);
  check('activatedSequenceCanonicalRouter', positiveEvidence.canonicalEntrypoint === ROUTER_REL);
  check('activatedSequenceNoSecrets', positiveEvidence.secretsRead === false && positiveEvidence.secretAccess === false);
  check('activatedSequenceNoFirestore', positiveEvidence.firestoreRead === false && positiveEvidence.firestoreWrites === 0);
  check('activatedSequenceNoAuthOrOperationalWrites', positiveEvidence.authWrites === 0 && positiveEvidence.operationalWrites === 0);
  check('activatedSequenceNoRuntime', positiveEvidence.runtimeExecuted === false && positiveEvidence.browserExecuted === false);
  check('activatedSequenceNoDeploy', positiveEvidence.deployExecuted === false && positiveEvidence.productionTouched === false);
  check('retiredRequestNotReused', syntheticRequest.retiredRequestsReused === false);
  check('retiredRunsNotReused', syntheticRequest.retiredRunsReused === false);
  check('syntheticRequestNeverRuntime', syntheticRequest.syntheticOnly === true && syntheticRequest.persistAsRuntimeRequest === false);
} catch (error) {
  unexpectedError = String(error && error.message || error).slice(0, 1000);
  checks.unexpectedException = false;
} finally {
  fs.writeFileSync(abs(LIFECYCLE_REL), lifecycleOriginalText, 'utf8');
  if (!requestOriginalExists && fs.existsSync(abs(REQUEST_REL))) fs.rmSync(abs(REQUEST_REL), { force: true });
  if (preflightOriginalExists) fs.writeFileSync(abs(PREFLIGHT_REL), preflightOriginalText, 'utf8');
  else if (fs.existsSync(abs(PREFLIGHT_REL))) fs.rmSync(abs(PREFLIGHT_REL), { force: true });
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

if (!Object.prototype.hasOwnProperty.call(checks, 'unexpectedException')) checks.unexpectedException = true;
const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-visual-matrix-lifecycle-sequence-source-test-v1',
  gateId: GATE_ID,
  contractVersion: CONTRACT_VERSION,
  status: failedCheckIds.length === 0 ? SOURCE_PASS : 'STOP_LIFECYCLE_SEQUENCE_SOURCE_TEST',
  classification: failedCheckIds.length === 0 ? 'PIPELINE_MECHANISM_FAILURE_CLOSED_SOURCE_ONLY' : 'PIPELINE_MECHANISM_FAILURE',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  sequence: {
    baseHead,
    activationHead,
    requestHead,
    activationParentCommitExplicit: checks.activationCommitOnlyLifecycle === true,
    requestChildCommitExclusive: checks.requestCommitOnlyRequest === true,
    exactParentBinding: checks.requestParentIsActivation === true && checks.requestFileParentBinding === true,
    prematureRequestBlocked: checks.prematureRequestBlocked === true,
    canonicalSyntheticGoGate: checks.activatedSequenceGoGate === true
  },
  negativePath: negativeEvidence ? {
    status: negativeEvidence.status,
    failedCheckIds: negativeEvidence.failedCheckIds,
    secretsRead: negativeEvidence.secretsRead,
    runtimeExecuted: negativeEvidence.runtimeExecuted,
    browserExecuted: negativeEvidence.browserExecuted,
    deployExecuted: negativeEvidence.deployExecuted
  } : null,
  positivePath: positiveEvidence ? {
    status: positiveEvidence.status,
    failed: positiveEvidence.failed,
    ok: positiveEvidence.ok,
    canonicalEntrypoint: positiveEvidence.canonicalEntrypoint,
    secretsRead: positiveEvidence.secretsRead,
    firestoreRead: positiveEvidence.firestoreRead,
    firestoreWrites: positiveEvidence.firestoreWrites,
    authWrites: positiveEvidence.authWrites,
    operationalWrites: positiveEvidence.operationalWrites,
    runtimeExecuted: positiveEvidence.runtimeExecuted,
    browserExecuted: positiveEvidence.browserExecuted,
    deployExecuted: positiveEvidence.deployExecuted,
    productionTouched: positiveEvidence.productionTouched
  } : null,
  runtimeRequestPersisted: false,
  currentLifecycleActivated: false,
  secretsRead: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  runtimeExecuted: false,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  error: unexpectedError,
  ok: failedCheckIds.length === 0
};

writeJson(EVIDENCE_REL, output);
console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 41);
