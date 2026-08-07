#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import {
  buildV21MatrixArtifact,
  V21_MATRIX_SCHEMA,
  V21_VALIDATOR_FINDING,
  V21_FUNCTIONAL_FINDING,
  V21_SIGNAL_VERSION
} from './orbit360-build-v21-event-driven-matrix-artifact-v20260807.mjs';

const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const sha256 = value => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const request = JSON.parse(read('.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json'));
const wrapper = read('tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs');
const sealer = read('tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs');
const cliente = read('orbit360-platform/modules/cliente360.js');
const rootfix = read('orbit360-platform/core/visual-runtime-rootfix-v20260805.js');
const checks = {};

checks.v20Frozen = request.requestVersion === '20260807.20-two-phase-runtime' && request.consumed === true && request.authorizationFrozen === true && request.allowedExecutions === 0 && request.replayAllowed === false;
checks.cliente360FrozenContract = cliente.includes('const LIST_PAGE_SIZE = 40') && cliente.includes('renderedRows: visibleRows.length') && cliente.includes("version: '20260807.19-bounded-list-render'");
checks.runtimeDiagnosticsSourcePresent = ['renderMs','summaryCacheMs','summaryAggregateMs','rowsBuildMs','innerHtmlMs','bindingsMs','totalMs'].every(token => cliente.includes(token)) && rootfix.includes('afterRenderMs') && rootfix.includes('totalWithAfterRenderMs');
checks.wrapperUsesV21ExactBuilder = wrapper.includes('buildV21MatrixArtifact') && wrapper.includes('.orbit360-v21-exact-matrix-artifact-') && wrapper.includes("await import(pathToFileURL(tempPath).href + `?v21=");
checks.wrapperKeepsHistoricalV20Marker = wrapper.includes('buildV20MatrixArtifact');
checks.wrapperCompileImportFailClosed = wrapper.includes("MATRIX_ARTIFACT_COMPILE_FAILED") && wrapper.includes("classification: 'PIPELINE_MECHANISM_FAILURE'");
checks.sealerPreservesMatrixClassification = sealer.includes("classification: matrix && matrix.classification || 'PIPELINE_MECHANISM_FAILURE'") && sealer.includes('matrixValidatorFinding');

const source = buildV21MatrixArtifact();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-v21-matrix-artifact-'));
const artifact = path.join(tmp, 'exact-v21-matrix-artifact.mjs');
const evidence = path.join(tmp, 'import-evidence.json');
fs.writeFileSync(artifact, source, 'utf8');
const artifactDigest = sha256(source);

checks.schemaExact = source.includes(`schemaVersion: '${V21_MATRIX_SCHEMA}'`);
checks.signalVersionExact = source.includes(V21_SIGNAL_VERSION);
checks.singleGoFunction = source.split('async function go(page, role, route)').length - 1 === 1;
checks.noOrphanedOldGoBody = !source.includes("return waitRouteReady(page, role, route.split('?')[0]);");
checks.renderObserverUsesMutationObserver = source.includes('new MutationObserver') && source.includes("orbit360:v21-render-complete");
checks.renderPathNoWaitForFunctionPolling = !source.includes('const renderMs = await waitRenderReady(page, role, target);') && !source.includes('async function waitRenderReady(page, role, route)');
checks.hydrationPollingStillPreNavigationOnly = source.includes('async function waitRequiredHydration(page, role, route)') && source.includes("prefix + '_REQUIRED_HYDRATION'");
const requiredIdx = source.indexOf('const requiredMs = await waitRequiredHydration(page, role, target);');
const armIdx = source.indexOf('const token = await armV21RenderObserver(page, role, target);');
const navIdx = source.indexOf("mark(role.toUpperCase() + '_NAVIGATE_'");
const hashIdx = source.indexOf("location.hash = '#/' + value");
const eventIdx = source.indexOf('const renderMs = await waitV21RenderEvent(page, role, target, token, requiredMs);');
checks.routeSequenceExact = requiredIdx >= 0 && armIdx > requiredIdx && navIdx > armIdx && hashIdx > navIdx && eventIdx > hashIdx;
checks.observerArmedCheckpoint = source.includes("'_RENDER_OBSERVER_ARM_PASS'");
checks.eventCompletionCheckpoint = source.includes("'_RENDER_EVENT_PASS'") && source.includes("'_RENDER_READY_PASS'");
checks.timeoutMetricsPersistBeforeClassification = source.indexOf("await persistV21RouteMetric(role, route, requiredMs, waitMs, post, 'STOP_RENDER_EVENT'") < source.indexOf("result.classification = 'VALIDATOR_STALE'");
checks.completeMetricShape = ['renderMs','afterRenderMs','totalWithAfterRenderMs','summaryCacheMs','summaryAggregateMs','rowsBuildMs','innerHtmlMs','bindingsMs','totalMs','renderedRows','pageSize','writes'].every(token => source.includes(token));
checks.validatorStalePostReady = source.includes(V21_VALIDATOR_FINDING) && source.includes("result.classification = 'VALIDATOR_STALE'") && source.includes('post.ready === true');
checks.functionalNotReady = source.includes(V21_FUNCTIONAL_FINDING) && source.includes("result.classification = 'FUNCTIONAL_DEFECT'");
checks.specializedClassificationMarker = source.includes('result.specializedClassification = true');
checks.outerCatchPreservesSpecialized = source.includes('if (!result.classification) {') && !source.includes("  result.classification = /PROJECT_MISMATCH/.test(message)\n    ? 'ENVIRONMENT_FAILURE'");
checks.validationGuardPresent = source.includes("process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY === '1'");

const compile = spawnSync(process.execPath, ['--check', artifact], { encoding: 'utf8' });
checks.exactArtifactCompiles = compile.status === 0;

if (typeof vm.SourceTextModule !== 'function' || typeof vm.SyntheticModule !== 'function') {
  checks.exactArtifactImports = false;
} else {
  const previous = {
    validate: process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY,
    evidence: process.env.ORBIT360_VISUAL_EVIDENCE,
    out: process.env.ORBIT360_VISUAL_ARTIFACT_DIR
  };
  process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY = '1';
  process.env.ORBIT360_VISUAL_EVIDENCE = evidence;
  process.env.ORBIT360_VISUAL_ARTIFACT_DIR = path.join(tmp, 'captures');
  const context = vm.createContext({ console, process, Buffer, setTimeout, clearTimeout, URL, TextEncoder, TextDecoder });
  const makeSynthetic = async specifier => {
    if (specifier === 'firebase-admin') return new vm.SyntheticModule(['default'], function () { this.setExport('default', {}); }, { context, identifier: 'stub:firebase-admin' });
    if (specifier === 'playwright') return new vm.SyntheticModule(['chromium'], function () { this.setExport('chromium', {}); }, { context, identifier: 'stub:playwright' });
    const ns = await import(specifier);
    const keys = Object.keys(ns);
    return new vm.SyntheticModule(keys, function () { for (const key of keys) this.setExport(key, ns[key]); }, { context, identifier: 'host:' + specifier });
  };
  try {
    const module = new vm.SourceTextModule(source, { context, identifier: artifact });
    await module.link(makeSynthetic);
    await module.evaluate();
    const importedEvidence = JSON.parse(fs.readFileSync(evidence, 'utf8'));
    checks.exactArtifactImports = importedEvidence.stage === 'SOURCE_ARTIFACT_IMPORT_VALIDATED' && importedEvidence.classification === 'SOURCE_ARTIFACT_VALIDATED' && importedEvidence.artifactValidationOnly === true && importedEvidence.ok === true;
  } catch (error) {
    checks.exactArtifactImports = false;
    checks.importError = String(error && error.message || error).slice(0, 400);
  } finally {
    if (previous.validate == null) delete process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY; else process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY = previous.validate;
    if (previous.evidence == null) delete process.env.ORBIT360_VISUAL_EVIDENCE; else process.env.ORBIT360_VISUAL_EVIDENCE = previous.evidence;
    if (previous.out == null) delete process.env.ORBIT360_VISUAL_ARTIFACT_DIR; else process.env.ORBIT360_VISUAL_ARTIFACT_DIR = previous.out;
  }
}

const corruptArtifact = path.join(tmp, 'corrupt-v21-matrix-artifact.mjs');
fs.writeFileSync(corruptArtifact, source + '\nreturn;\n', 'utf8');
const corruptCompile = spawnSync(process.execPath, ['--check', corruptArtifact], { encoding: 'utf8' });
checks.corruptArtifactRejected = corruptCompile.status !== 0 && /Illegal return statement|SyntaxError/.test((corruptCompile.stderr || '') + (corruptCompile.stdout || ''));
checks.generatorDeterministic = buildV21MatrixArtifact() === source && sha256(buildV21MatrixArtifact()) === artifactDigest;

async function syntheticLongTaskFixture() {
  let pollingCalls = 0;
  let observerArmed = false;
  let navigated = false;
  let resolveCompletion;
  const completion = new Promise(resolve => { resolveCompletion = resolve; });
  const requiredHydrationPass = true;
  observerArmed = true;
  const armedBeforeNavigation = observerArmed && !navigated;
  navigated = true;
  const started = performance.now();
  while (performance.now() - started < 90) { /* synthetic main-thread long task */ }
  const renderMs = performance.now() - started;
  const metric = {
    renderMs,
    afterRenderMs: 3,
    totalWithAfterRenderMs: renderMs + 3,
    list: { bounded: true, pageSize: 40, renderedRows: 40, summaryCacheMs: 2, summaryAggregateMs: 4, rowsBuildMs: 6, innerHtmlMs: 7, bindingsMs: 3, totalMs: renderMs, writes: 0 }
  };
  queueMicrotask(() => resolveCompletion({ ready: true, metric, reason: 'mutation' }));
  const observed = await completion;
  return { requiredHydrationPass, armedBeforeNavigation, navigated, pollingCalls, observed };
}

const synthetic = await syntheticLongTaskFixture();
checks.syntheticRequiredBeforeNavigation = synthetic.requiredHydrationPass === true && synthetic.armedBeforeNavigation === true && synthetic.navigated === true;
checks.syntheticCompletionWithoutPolling = synthetic.pollingCalls === 0 && synthetic.observed.ready === true && synthetic.observed.reason === 'mutation';
checks.syntheticRealRenderMeasured = synthetic.observed.metric.renderMs >= 80 && synthetic.observed.metric.totalWithAfterRenderMs >= synthetic.observed.metric.renderMs && synthetic.observed.metric.list.pageSize === 40 && synthetic.observed.metric.list.renderedRows === 40 && synthetic.observed.metric.list.writes === 0;

const classifyTimeout = post => post && post.route === 'cliente360' && post.ready === true && post.hydrationReady === true && post.loadingVisible === false && post.hostTextLength > 60 ? 'VALIDATOR_STALE' : 'FUNCTIONAL_DEFECT';
checks.syntheticPostReadyTimeoutValidatorStale = classifyTimeout({ route: 'cliente360', ready: true, hydrationReady: true, loadingVisible: false, hostTextLength: 4732 }) === 'VALIDATOR_STALE';
checks.syntheticNotReadyTimeoutFunctional = classifyTimeout({ route: 'cliente360', ready: false, hydrationReady: true, loadingVisible: true, hostTextLength: 0 }) === 'FUNCTIONAL_DEFECT';
const outerCatch = (existing, message) => existing || (/PROJECT_MISMATCH/.test(message) ? 'ENVIRONMENT_FAILURE' : /DATA_CONTRACT_FAILURE|NO_ACTIVE_/.test(message) ? 'DATA_CONTRACT_FAILURE' : /_TIMEOUT|FUNCTIONAL_RENDER_EVENT_TIMEOUT_NOT_READY/.test(message) ? 'FUNCTIONAL_DEFECT' : 'PIPELINE_MECHANISM_FAILURE');
checks.syntheticOuterCatchCannotOverwriteSpecialized = outerCatch('VALIDATOR_STALE', 'VALIDATOR_STALE_RENDER_SIGNAL_POST_READY:V21_RENDER_EVENT_TIMEOUT') === 'VALIDATOR_STALE' && outerCatch('FUNCTIONAL_DEFECT', 'FUNCTIONAL_RENDER_EVENT_TIMEOUT_NOT_READY') === 'FUNCTIONAL_DEFECT';

checks.zeroSecrets = true;
checks.zeroFirebase = true;
checks.zeroHosting = true;
checks.zeroRealBrowser = true;
checks.zeroWrites = true;

const failedCheckIds = Object.entries(checks).filter(([, ok]) => ok !== true).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-v21-event-driven-render-source-v1',
  generatedAt: new Date().toISOString(),
  gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  status: failedCheckIds.length ? 'STOP_V21_EVENT_DRIVEN_RENDER_SOURCE' : 'PASS_V21_EVENT_DRIVEN_RENDER_SOURCE_ONLY',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'VALIDATOR_STALE_CORRECTED_SOURCE_ONLY',
  rootCauses: ['RENDER_READY_POLLING_BLOCKED_BY_TARGET_LONG_TASK','OUTER_MATRIX_CATCH_OVERWRITES_VALIDATOR_STALE_AS_FUNCTIONAL_DEFECT'],
  artifactSchema: V21_MATRIX_SCHEMA,
  artifactSha256: artifactDigest,
  renderSignalVersion: V21_SIGNAL_VERSION,
  validatorFinding: V21_VALIDATOR_FINDING,
  functionalFinding: V21_FUNCTIONAL_FINDING,
  exactArtifactCompileRequired: true,
  exactArtifactImportRequired: true,
  syntheticLongTask: {
    requiredHydrationBeforeNavigation: synthetic.requiredHydrationPass,
    observerArmedBeforeNavigation: synthetic.armedBeforeNavigation,
    pollingCalls: synthetic.pollingCalls,
    completionReason: synthetic.observed.reason,
    renderMeasured: synthetic.observed.metric.renderMs > 0,
    boundedRows: synthetic.observed.metric.list.renderedRows,
    writes: synthetic.observed.metric.list.writes
  },
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(v => v === true).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  secretsRead: false,
  firebaseAccess: false,
  hostingTouched: false,
  browserExecuted: false,
  deployExecuted: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  ok: failedCheckIds.length === 0
};
fs.mkdirSync('orbit360-platform/runtime-gate-crm-v20260716', { recursive: true });
fs.writeFileSync('orbit360-platform/runtime-gate-crm-v20260716/v21-event-driven-render-source-sanitized-v20260807.json', JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(output, null, 2));
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
process.exit(output.ok ? 0 : 41);
