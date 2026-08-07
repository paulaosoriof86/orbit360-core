#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { patchChromiumCaptureWatchdog } from './orbit360-playwright-capture-watchdog-lib-v20260806.mjs';

const ROOT = process.cwd();
const wrapperPath = path.join(ROOT, 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs');
const auditedPath = path.join(ROOT, 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v1-audited-20260805.mjs');
const builderPath = path.join(ROOT, 'tools/orbit360-build-v21-event-driven-matrix-artifact-v20260807.mjs');
const helperPath = path.join(ROOT, 'tools/orbit360-playwright-capture-watchdog-lib-v20260806.mjs');
const wrapper = fs.readFileSync(wrapperPath, 'utf8');
const builder = fs.readFileSync(builderPath, 'utf8');
const helper = fs.readFileSync(helperPath, 'utf8');

function makeHarness(mode) {
  const calls = { contextClose: 0, browserClose: 0, detach: 0, screenshot: 0, evaluateAfter: 0 };
  const page = {
    context: () => context,
    evaluate: async () => { calls.evaluateAfter += 1; return true; },
    screenshot: async () => { throw new Error('UNPATCHED_SCREENSHOT_CALLED'); }
  };
  const session = {
    send: async command => {
      if (command === 'Runtime.evaluate') return { result: { value: true } };
      if (command === 'Page.captureScreenshot') {
        calls.screenshot += 1;
        if (mode === 'hang') return new Promise(() => {});
        if (mode === 'failure') throw new Error('SYNTHETIC_CAPTURE_FAILURE');
        return { data: Buffer.from('synthetic-png').toString('base64') };
      }
      throw new Error('UNEXPECTED_CDP_COMMAND:' + command);
    },
    detach: async () => { calls.detach += 1; }
  };
  const context = {
    newPage: async () => page,
    newCDPSession: async candidate => {
      if (candidate !== page) throw new Error('WRONG_PAGE');
      return session;
    },
    close: async () => { calls.contextClose += 1; }
  };
  const browser = {
    newContext: async () => context,
    close: async () => { calls.browserClose += 1; }
  };
  const chromium = { launch: async () => browser };
  return { chromium, browser, context, page, calls };
}

function evidenceFile(dir, name) {
  const file = path.join(dir, name + '.json');
  fs.writeFileSync(file, JSON.stringify({ currentCheckpoint: 'START', checkpoints: [] }, null, 2) + '\n');
  return file;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-capture-watchdog-'));
const checks = {};

checks.filesExist = [wrapperPath, auditedPath, builderPath, helperPath].every(fs.existsSync);
checks.wrapperImportsHelper = wrapper.includes('patchChromiumCaptureWatchdog');
checks.wrapperDelegatesAuditedV1 = wrapper.includes('buildV21MatrixArtifact') && builder.includes('orbit360-visual-runtime-rootfix-observable-matrix-v1-audited-20260805.mjs');
checks.wrapperExactArtifactGate = wrapper.includes("spawnSync(process.execPath, ['--check', tempPath]") && wrapper.includes('MATRIX_ARTIFACT_COMPILE_FAILED') && wrapper.includes('PIPELINE_MECHANISM_FAILURE');
checks.wrapperNoProductLogic = !wrapper.includes('canonicalRef(') && !wrapper.includes('testRole(') && !wrapper.includes('protectedSnapshot(');
checks.builderNoProductDataLogic = !builder.includes('canonicalRef(') && !builder.includes('protectedSnapshot(') && builder.includes('buildV21MatrixArtifact');
checks.builderEventDrivenRender = builder.includes('new MutationObserver') && builder.includes('orbit360:v21-render-complete') && builder.includes('armV21RenderObserver');
checks.builderPreservesSpecializedClassifier = builder.includes('if (!result.classification)') && builder.includes('VALIDATOR_STALE_RENDER_SIGNAL_POST_READY');
checks.helperUsesCDP = helper.includes("Page.captureScreenshot") && helper.includes("Runtime.evaluate");
checks.helperHasHardTimeout = helper.includes('CAPTURE_HARD_TIMEOUT_') && helper.includes('Promise.race');
checks.helperHasUniqueHeartbeats = helper.includes("_HEARTBEAT_") && helper.includes('heartbeatSequence += 1');
checks.helperDoesNotCloseFunctionalContext = !helper.includes('context.close(') && !helper.includes('browser.close(');

const successEvidence = evidenceFile(tmp, 'success');
const success = makeHarness('success');
patchChromiumCaptureWatchdog({ chromium: success.chromium, evidencePath: successEvidence, hardTimeoutMs: 200, heartbeatMs: 20, detachTimeoutMs: 20 });
const successBrowser = await success.chromium.launch();
const successContext = await successBrowser.newContext();
const successPage = await successContext.newPage();
const successTarget = path.join(tmp, 'direccion-inicio.png');
const successBuffer = await successPage.screenshot({ path: successTarget });
const successJson = JSON.parse(fs.readFileSync(successEvidence, 'utf8'));
checks.successReturnsBuffer = Buffer.isBuffer(successBuffer) && successBuffer.toString() === 'synthetic-png';
checks.successWritesFile = fs.existsSync(successTarget) && fs.readFileSync(successTarget).toString() === 'synthetic-png';
checks.successCheckpoints = successJson.checkpoints.some(x => x.checkpoint === 'DIRECCION_INICIO_CAPTURE_START') && successJson.checkpoints.some(x => x.checkpoint === 'DIRECCION_INICIO_CAPTURE_PASS');
checks.successDetachesOnly = success.calls.detach === 1 && success.calls.contextClose === 0 && success.calls.browserClose === 0;

const timeoutEvidence = evidenceFile(tmp, 'timeout');
const timeout = makeHarness('hang');
patchChromiumCaptureWatchdog({ chromium: timeout.chromium, evidencePath: timeoutEvidence, hardTimeoutMs: 350, heartbeatMs: 250, detachTimeoutMs: 15 });
const timeoutBrowser = await timeout.chromium.launch();
const timeoutContext = await timeoutBrowser.newContext();
const timeoutPage = await timeoutContext.newPage();
const timeoutStarted = Date.now();
let timeoutMessage = '';
try {
  await timeoutPage.screenshot({ path: path.join(tmp, 'direccion-timeout.png') });
} catch (error) {
  timeoutMessage = String(error && error.message || error);
}
const timeoutElapsed = Date.now() - timeoutStarted;
const timeoutJson = JSON.parse(fs.readFileSync(timeoutEvidence, 'utf8'));
const pageStillUsable = await timeoutPage.evaluate(() => true);
checks.timeoutIsBounded = /CAPTURE_HARD_TIMEOUT_350MS/.test(timeoutMessage) && timeoutElapsed < 1000;
checks.timeoutHasHeartbeat = timeoutJson.checkpoints.some(x => /DIRECCION_TIMEOUT_CAPTURE_HEARTBEAT_\d+/.test(x.checkpoint));
checks.timeoutHasTerminalCheckpoint = timeoutJson.checkpoints.some(x => x.checkpoint === 'DIRECCION_TIMEOUT_CAPTURE_TIMEOUT');
checks.timeoutLeavesPageUsable = pageStillUsable === true && timeout.calls.contextClose === 0 && timeout.calls.browserClose === 0;
checks.timeoutDetachesSession = timeout.calls.detach === 1;

const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-capture-watchdog-source-test-v3-v21-exact-artifact-aware',
  generatedAt: new Date().toISOString(),
  status: failedCheckIds.length ? 'STOP_CAPTURE_WATCHDOG_SOURCE_TEST' : 'PASS_CAPTURE_WATCHDOG_SOURCE_ONLY',
  classification: failedCheckIds.length ? 'VALIDATOR_STALE' : 'VALIDATOR_STALE_CORRECTED_SOURCE_ONLY',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  synthetic: {
    successDetachCalls: success.calls.detach,
    timeoutElapsedMs: timeoutElapsed,
    timeoutDetachCalls: timeout.calls.detach,
    timeoutContextCloseCalls: timeout.calls.contextClose,
    timeoutBrowserCloseCalls: timeout.calls.browserClose,
    pageStillUsable
  },
  exactArtifactOwner: 'tools/orbit360-build-v21-event-driven-matrix-artifact-v20260807.mjs',
  priorExactArtifactOwner: 'tools/orbit360-build-v20-route-aware-matrix-artifact-v20260807.mjs',
  auditedMatrixSource: 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v1-audited-20260805.mjs',
  secretAccess: false,
  firebaseAccess: false,
  firestoreReads: 0,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  browserExecuted: false,
  hostingTouched: false,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  ok: failedCheckIds.length === 0
};
const out = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/capture-watchdog-source-test-sanitized-v20260806.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
process.exit(output.ok ? 0 : 41);
