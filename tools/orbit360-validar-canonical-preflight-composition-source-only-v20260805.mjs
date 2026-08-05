#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const GATE = 'block12-operational-runtime-lab-v20260804';
const SOURCE_BASELINE = '548cffa50cddfd93ad2118f5a06e9bb420699bde';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/microblock22-canonical-preflight-composition-source-only.json');
const PREFLIGHT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const OUTER = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const ENGINE = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-layoutfree-lab-v20260804.mjs';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json';
const EXTENSION = 'tools/orbit360-gate-contract-registry-extension-block12-isolated-visual-v20260805.json';
const FIXTURE = 'tools/fixtures/orbit360-block12-go-lab-candidate-visible-source-only-fixture-v20260805.json';
const BUILDER = 'tools/orbit360-build-go-lab-candidate-visible-decision-v20260805.mjs';
const CONSUMED_REQUEST = '.github/orbit360-requests/block12-operational-runtime-layoutfree-lab-v20260804.json';
const FUTURE_REQUEST = '.github/orbit360-requests/block12-go-lab-candidate-visible-v3.json';
const LEDGER = 'orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-ledger-v20260804.json';
const WORKFLOW = '.github/workflows/orbit360-block12-visual-layoutfree-reactivation-lab-v20260804.yml';

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail: String(detail || '').slice(0, 700) });
const rel = file => path.join(ROOT, file);
const exists = file => fs.existsSync(rel(file));
const readJson = file => JSON.parse(fs.readFileSync(rel(file), 'utf8'));
const readText = file => fs.readFileSync(rel(file), 'utf8');
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

let outerExitCode = 99;
let outerStderr = '';
let innerReached = false;
let preflight = null;
let builderProbe = null;
let errorMessage = '';

try {
  [OUTER, ENGINE, LIFECYCLE, EXTENSION, FIXTURE, BUILDER, CONSUMED_REQUEST, LEDGER, WORKFLOW].forEach(file => add(`FILE_${file}`, exists(file), file));
  if (checks.some(item => !item.ok)) throw new Error('DATA_CONTRACT_FAILURE:REQUIRED_SOURCE_ONLY_FILES_MISSING');

  const lifecycle = readJson(LIFECYCLE);
  const extension = readJson(EXTENSION);
  const fixture = readJson(FIXTURE);
  const consumed = readJson(CONSUMED_REQUEST);
  const ledger = readJson(LEDGER);
  const outerSource = readText(OUTER);
  const engineSource = readText(ENGINE);
  const builderSource = readText(BUILDER);
  const workflowSource = readText(WORKFLOW);

  add('BRANCH_EXACT', String(process.env.GITHUB_REF_NAME || process.env.ORBIT360_BRANCH || BRANCH) === BRANCH);
  add('CANONICAL_LIFECYCLE_COMPOSITION', lifecycle.validatorLifecycleRevision === 'phase-capability-contract-v1' && lifecycle.visualHarnessRevision === 'isolated-context-direct-url-v6' && lifecycle.controlPlaneRevision === 'canonical-preflight-composition-source-only-v1');
  add('OUTER_ROUTER_EXPECTS_CANONICAL_COMPOSITION', outerSource.includes("const CANONICAL_LIFECYCLE_COMPOSITION='phase-capability-contract-v1'") && outerSource.includes('CANONICAL_LIFECYCLE_REVISION_MISMATCH'));
  add('INNER_ENGINE_SEPARATES_REVISIONS', engineSource.includes("validatorLifecycleRevision === 'phase-capability-contract-v1'") && engineSource.includes("visualHarnessRevision === 'isolated-context-direct-url-v6'") && engineSource.includes('ORBIT360_SOURCE_ONLY_COMPOSITION_TEST'));
  add('RUNTIME_AUTHORIZATION_CONSUMED', lifecycle.runtimeActivationState === 'STOPPED_AWAITING_NEW_EXPLICIT_AUTHORIZATION' && lifecycle.authorization?.allowedExecutions === 0 && lifecycle.authorization?.consumed === true && lifecycle.authorization?.newExplicitAuthorizationRequired === true && ledger.authorization?.consumed === true && ledger.authorization?.allowedExecutionsRemaining === 0);
  add('CONSUMED_REQUEST_IMMUTABLE', consumed.status === 'CONSUMED_STOP_RETRY_DEFINITIVE' && consumed.allowedExecutions === 0 && consumed.replayAllowed === false && consumed.thirdRequestForbidden === true && lifecycle.authorization?.consumedRequest === CONSUMED_REQUEST && lifecycle.authorization?.triggerRequestImmutable === true);
  add('REQUEST_AND_LEDGER_SEPARATED', lifecycle.authorization?.consumptionLedger === LEDGER && extension.consumptionLedger === LEDGER && extension.triggerRequestImmutable === true && fixture.sourceOnlyCompositionTest === true && !FIXTURE.startsWith('.github/orbit360-requests/'));
  add('FUTURE_RUNTIME_REQUEST_ABSENT', lifecycle.authorization?.futureRuntimeRequestTemplate === FUTURE_REQUEST && extension.futureRuntimeRequestTemplate === FUTURE_REQUEST && !exists(FUTURE_REQUEST));
  add('SOURCE_ONLY_FIXTURE_NON_OPERATIONAL', fixture.status === 'SOURCE_ONLY_COMPOSITION_FIXTURE' && fixture.runtimeExecutionAuthorized === false && fixture.approved === false && fixture.allowedExecutions === 0 && fixture.replayAllowed === false && fixture.parentHead === 'SOURCE_ONLY_NOT_RUNTIME_BOUND');
  add('OBSERVED_EVIDENCE_COUNTERS', builderSource.includes('process.env.FUNCTIONS_VERIFIED') && builderSource.includes('Number.parseInt') && builderSource.includes('observedCountersOnly: true') && !builderSource.includes('functionsVerified: 4') && !builderSource.includes('functionsVerified:4'));
  add('OLD_RUNTIME_WORKFLOW_BLOCKED', workflowSource.includes(CONSUMED_REQUEST) && consumed.status !== 'AUTHORIZED_GO_LAB_CANDIDATE_VISIBLE' && consumed.allowedExecutions === 0);
  add('SOURCE_ONLY_EXTENSION_SYNC', extension.status === 'CONTROL_PLANE_SOURCE_ONLY_REDESIGN_READY' && extension.validatorLifecycleRevision === 'phase-capability-contract-v1' && extension.visualHarnessRevision === 'isolated-context-direct-url-v6' && extension.sourceOnlyGate === 'PASS_CANONICAL_PREFLIGHT_COMPOSITION' && extension.sourceOnlyRuntimeAuthorized === false);

  [OUTER, ENGINE, BUILDER, 'tools/orbit360-validar-canonical-preflight-composition-source-only-v20260805.mjs'].forEach(file => {
    execFileSync(process.execPath, ['--check', rel(file)], { cwd: ROOT, stdio: 'pipe' });
    add(`SYNTAX_${file}`, true);
  });

  execFileSync('git', ['diff', '--quiet', SOURCE_BASELINE, 'HEAD', '--',
    'orbit360-platform/index.html', 'orbit360-platform/core', 'orbit360-platform/modules',
    'orbit360-platform/styles', 'orbit360-platform/data', 'functions', 'firebase.json', 'firestore.rules'
  ], { cwd: ROOT, stdio: 'pipe' });
  add('PRODUCT_BASELINE_UNCHANGED', true);

  const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-evidence-builder-probe-'));
  const probeOut = path.join(probeDir, 'decision.json');
  execFileSync(process.execPath, [rel(BUILDER)], {
    cwd: ROOT,
    env: {
      ...process.env,
      ORBIT360_DECISION_OUT: probeOut,
      FUNCTIONS_VERIFIED: '0',
      FUNCTIONS_EXPECTED: '4',
      FUNCTIONS_DEPLOY_ATTEMPTED: 'false',
      FUNCTIONS_KEPT: 'false',
      HOSTING_DEPLOY_ATTEMPTED: 'false',
      PREVIEW_RETAINED: 'false',
      PRODUCT_AND_INTEGRITY_PASS: 'false',
      VISUAL_EVIDENCE_PASS: 'false',
      INTEGRITY_PASS: 'false',
      MANUAL_FRAME_REVIEW_REQUIRED: 'false',
      AUTHORIZATION_CONSUMED: 'false',
      ALLOWED_EXECUTIONS_REMAINING: '0',
      OK: 'false'
    },
    stdio: 'pipe'
  });
  builderProbe = JSON.parse(fs.readFileSync(probeOut, 'utf8'));
  add('EVIDENCE_BUILDER_ZERO_OBSERVED', builderProbe.functionsVerified === 0 && builderProbe.functionsExpected === 4 && builderProbe.functionsDeployAttempted === false && builderProbe.observedCountersOnly === true && builderProbe.ok === false);
  fs.rmSync(probeDir, { recursive: true, force: true });

  const outerRun = spawnSync(process.execPath, [rel(OUTER), GATE], {
    cwd: ROOT,
    env: {
      ...process.env,
      ORBIT360_BRANCH: BRANCH,
      GITHUB_REF_NAME: BRANCH,
      ORBIT360_REQUEST_FILE: FIXTURE,
      ORBIT360_SOURCE_ONLY_COMPOSITION_TEST: '1'
    },
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  outerExitCode = Number.isInteger(outerRun.status) ? outerRun.status : 99;
  outerStderr = String(outerRun.stderr || '').trim().slice(0, 1000);
  if (!fs.existsSync(PREFLIGHT)) throw new Error('PIPELINE_MECHANISM_FAILURE:SOURCE_ONLY_PREFLIGHT_EVIDENCE_MISSING');
  preflight = JSON.parse(fs.readFileSync(PREFLIGHT, 'utf8'));
  innerReached = preflight.canonicalEngine === ENGINE && preflight.canonicalEntrypoint === OUTER;
  add('OUTER_AND_INNER_EXECUTED_TOGETHER', outerExitCode === 0 && innerReached === true);
  add('COMPOSITION_GATE_PASS', preflight.status === 'PASS_CANONICAL_PREFLIGHT_COMPOSITION' && preflight.classification === 'SOURCE_ONLY_CONTROL_PLANE_COMPOSITION_PASS' && preflight.failed === 0 && preflight.ok === true);
  add('SOURCE_ONLY_ZERO_CAPABILITIES', preflight.executionAuthorized === false && preflight.secretAccessAuthorized === false && preflight.firestoreReadAuthorized === false && preflight.browserAuthorized === false && preflight.deployAuthorized === false && preflight.functionsDeployAuthorized === false && preflight.hostingPreviewAuthorized === false && preflight.rulesDeployAuthorized === false && preflight.productionAuthorized === false);
  add('SOURCE_ONLY_ZERO_EXECUTION', preflight.secretAccess === false && preflight.firestoreRead === false && preflight.firestoreWrites === 0 && preflight.authWrites === 0 && preflight.runtimeExecuted === false && preflight.browserExecuted === false && preflight.deployExecuted === false && preflight.productionTouched === false);
} catch (error) {
  errorMessage = String(error && (error.message || error)).replace(/[\r\n]+/g, ' ').slice(0, 1000);
}

const failed = checks.filter(item => !item.ok);
const ok = !errorMessage && failed.length === 0;
const result = {
  schemaVersion: 'orbit360-microblock22-canonical-preflight-composition-source-only-v1',
  generatedAt: new Date().toISOString(),
  rcId: 'RC-AYS-LAB-CANONICA-01',
  microblock: '2.2',
  gate: 'PASS_CANONICAL_PREFLIGHT_COMPOSITION',
  sourceBaseline: SOURCE_BASELINE,
  branch: BRANCH,
  status: ok ? 'PASS_CANONICAL_PREFLIGHT_COMPOSITION' : 'STOP_SOURCE_ONLY_CONTROL_PLANE',
  classification: ok ? 'GO_SOURCE_ONLY_CONTROL_PLANE' : (errorMessage.startsWith('DATA_CONTRACT_FAILURE') ? 'DATA_CONTRACT_FAILURE' : 'PIPELINE_MECHANISM_FAILURE'),
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failedCheckIds: failed.map(item => item.id),
  checks,
  error: errorMessage,
  outerRouterExitCode: outerExitCode,
  outerRouter: OUTER,
  innerEngine: ENGINE,
  innerEngineReached: innerReached,
  innerPreflightStatus: preflight?.status || '',
  observedBuilderProbe: builderProbe ? {
    functionsExpected: builderProbe.functionsExpected,
    functionsVerified: builderProbe.functionsVerified,
    observedCountersOnly: builderProbe.observedCountersOnly
  } : null,
  runtimeAuthorized: false,
  secretAccess: false,
  firebaseCommandsExecuted: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  browserExecuted: false,
  deployExecuted: false,
  rulesDeployed: false,
  realDataReimported: false,
  productionTouched: false,
  mainTouched: false,
  mergeExecuted: false,
  functionalReplayExecuted: false,
  nextRuntimeAuthorizationRequired: true,
  outerStderrSanitized: outerStderr,
  containsPII: false,
  containsSecrets: false,
  ok
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
if (!ok) process.exit(42);
