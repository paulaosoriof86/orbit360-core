#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(ROOT, rel), value, 'utf8');
function replaceExact(source, before, after, code) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`PIPELINE_MECHANISM_FAILURE:${code}`);
  return source.replace(before, after);
}

{
  const rel = 'orbit360-platform/core/backend-lab-init.js';
  let source = read(rel);
  source = replaceExact(
    source,
    "firebaseInitVersion: 'v1.127-operational-runtime-lab',",
    "firebaseInitVersion: 'v1.128-browser-harness-rootfix',",
    'BACKEND_INIT_VERSION'
  );
  source = replaceExact(
    source,
    "  if (/^(1|auto)$/i.test(params.get('orbitVerify') || '')) {\n    afterWindowLoad(function(){ loadScriptOnce('core/runtime-verification-center-v20260804.js?v=20260804-1', 'runtime-verification-center'); });\n  }",
    "  if (/^(1|auto)$/i.test(params.get('orbitVerify') || '')) {\n    loadScriptOnce('core/runtime-verification-center-v20260804.js?v=20260804-2', 'runtime-verification-center');\n  }",
    'RUNTIME_CENTER_IMMEDIATE_LOAD'
  );
  write(rel, source);
}

{
  const rel = 'orbit360-platform/core/runtime-verification-center-v20260804.js';
  let source = read(rel);
  source = replaceExact(
    source,
    "  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));",
    "  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));\n  const withTimeout = (promise, ms, code) => Promise.race([\n    promise,\n    new Promise((_, reject) => setTimeout(() => reject(new Error(`ENVIRONMENT_FAILURE:${code}:TIMEOUT_${ms}MS`)), ms))\n  ]);",
    'CENTER_TIMEOUT_HELPER'
  );
  source = replaceExact(
    source,
    "  async function call(name, payload) {\n    const response = await callable(name)(payload);\n    return response && response.data ? response.data : response;\n  }",
    "  async function call(name, payload) {\n    const response = await withTimeout(callable(name)(payload), 30000, `CALLABLE_${name}`);\n    return response && response.data ? response.data : response;\n  }",
    'CENTER_CALL_TIMEOUT'
  );
  source = replaceExact(
    source,
    "  async function signIn(token) {\n    if (!token) throw new Error('Identidad sintética no disponible');\n    await firebase.auth().signOut().catch(() => {});\n    await firebase.auth().signInWithCustomToken(token);\n    await sleep(150);\n  }",
    "  async function signIn(token) {\n    if (!token) throw new Error('Identidad sintética no disponible');\n    await withTimeout(firebase.auth().signOut().catch(() => {}), 10000, 'AUTH_SIGNOUT');\n    await withTimeout(firebase.auth().signInWithCustomToken(token), 30000, 'AUTH_SIGNIN');\n    await sleep(150);\n  }",
    'CENTER_AUTH_TIMEOUT'
  );
  write(rel, source);
}

{
  const rel = 'tools/orbit360-block12-operational-runtime-lab-v20260804.mjs';
  let source = read(rel);
  if (!source.includes("schemaVersion: 'orbit360-block12-browser-v2'")) {
    const start = source.indexOf('async function browserPhase() {');
    const end = source.indexOf('async function cleanup(app) {');
    if (start < 0 || end <= start) throw new Error('PIPELINE_MECHANISM_FAILURE:BROWSER_PHASE_BOUNDARIES');
    const replacement = `async function browserPhase() {
  const state = readState();
  const { chromium } = await import('playwright');
  let browser = null;
  let page = null;
  const pageErrors = [], consoleErrors = [];
  const bootstrap = { stages: [], fallbackInjectionUsed: false };
  const mark = (stage, detail = {}) => bootstrap.stages.push({ stage, at: new Date().toISOString(), detail });
  const diagnostics = async () => {
    if (!page) return {};
    try {
      return await page.evaluate(() => ({
        href: location.href.replace(/[?#].*$/, ''),
        readyState: document.readyState,
        hasFirebase: !!window.firebase,
        firebaseApps: window.firebase && Array.isArray(firebase.apps) ? firebase.apps.length : -1,
        hasOrbit: !!window.Orbit,
        hasRuntimeVerification: !!(window.Orbit && Orbit.runtimeVerification),
        backendMode: window.OrbitBackend && OrbitBackend.mode || '',
        firebaseInit: window.OrbitBackend && OrbitBackend.firebaseInit || '',
        firebaseInitError: window.OrbitBackend && OrbitBackend.firebaseInitError || '',
        runtimeScriptPresent: !!document.querySelector('script[data-orbit-lab-addon="runtime-verification-center"]'),
        runtimeScriptLoaded: !!document.querySelector('script[data-orbit-lab-addon="runtime-verification-center"][data-loaded="1"]')
      }));
    } catch (error) { return { diagnosticError: safe(error) }; }
  };
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => pageErrors.push(safe(error)));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(safe(message.text())); });
    const base = text(process.env.ORBIT360_PREVIEW_URL);
    if (!base) throw new Error('ENVIRONMENT_FAILURE:PREVIEW_URL_REQUIRED');
    const url = \`${'${base.replace(/#.*$/, "").replace(/\\?$/, "")}${base.includes("?") ? "&" : "?"}'}orbitBackend=firestore-lab&tenant=${'${encodeURIComponent(state.tenantId)}'}&orbitVerify=auto#/inicio\`;
    mark('NAVIGATION_START');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    mark('DOM_CONTENT_LOADED', await diagnostics());
    await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 30000 });
    mark('WINDOW_LOAD_COMPLETE', await diagnostics());
    await page.waitForFunction(() => window.OrbitBackend && OrbitBackend.mode === 'firestore-lab' && OrbitBackend.firebaseInit && OrbitBackend.firebaseInit !== 'pending', null, { timeout: 30000 });
    const backendState = await diagnostics();
    mark('BACKEND_INIT_TERMINAL', backendState);
    if (!['initialized', 'already-initialized'].includes(backendState.firebaseInit)) throw new Error(\`ENVIRONMENT_FAILURE:FIREBASE_INIT_${'${backendState.firebaseInit || "UNKNOWN"}'}:${'${backendState.firebaseInitError || ""}'}\`);
    await page.waitForFunction(() => window.firebase && Array.isArray(firebase.apps) && firebase.apps.length > 0, null, { timeout: 30000 });
    mark('FIREBASE_APP_READY', await diagnostics());
    try {
      await page.waitForFunction(() => window.Orbit && Orbit.runtimeVerification, null, { timeout: 20000 });
    } catch (error) {
      bootstrap.fallbackInjectionUsed = true;
      mark('RUNTIME_CENTER_PRIMARY_LOAD_TIMEOUT', await diagnostics());
      await page.addScriptTag({ url: new URL('core/runtime-verification-center-v20260804.js?v=20260804-2', base.endsWith('/') ? base : base + '/').href });
      await page.waitForFunction(() => window.Orbit && Orbit.runtimeVerification, null, { timeout: 20000 });
    }
    mark('RUNTIME_CENTER_READY', await diagnostics());
    const context = { tenantId: state.tenantId, tokens: { direction: state.users.direction.token, advisorA: state.users.advisorA.token, advisorB: state.users.advisorB.token }, ids: state.ids, sourceHash: state.sourceHash };
    await page.evaluate(ctx => window.dispatchEvent(new CustomEvent('orbit:verification-context', { detail: ctx })), context);
    mark('CONTEXT_DISPATCHED');
    await page.waitForFunction(() => { const s = Orbit.runtimeVerification.state(); return !!s.finishedAt && s.running === false; }, null, { timeout: 300000 });
    const result = await page.evaluate(() => { const value = Orbit.runtimeVerification.state(); delete value.context; return value; });
    mark('SCENARIOS_FINISHED', { resultCount: (result.results || []).length });
    await page.screenshot({ path: SCREENSHOT, fullPage: true });
    const failed = (result.results || []).filter(item => item.status === 'FAIL');
    const integrationOk = bootstrap.fallbackInjectionUsed === false;
    save(BROWSER_OUT, { schemaVersion: 'orbit360-block12-browser-v2', status: failed.length || !integrationOk ? 'OPERATIONAL_RUNTIME_BROWSER_FAIL' : 'OPERATIONAL_RUNTIME_BROWSER_PASS', classification: failed.length ? (failed[0].classification || 'FUNCTIONAL_DEFECT') : (!integrationOk ? 'PIPELINE_MECHANISM_FAILURE' : 'GO_LAB_IN_PLATFORM_RUNTIME'), verdict: failed.length || !integrationOk ? 'FAIL' : 'PASS', passed: (result.results || []).filter(item => item.status === 'PASS').length, failed: failed.length + (integrationOk ? 0 : 1), results: result.results || [], bootstrap, pageErrors, consoleErrors, screenshot: path.relative(ROOT, SCREENSHOT), browserExecuted: true, realTenantWrites: 0, containsTokens: false, ok: failed.length === 0 && pageErrors.length === 0 && integrationOk });
    if (failed.length || pageErrors.length || !integrationOk) process.exitCode = 42;
  } catch (error) {
    const finalDiagnostics = await diagnostics();
    mark('BROWSER_PHASE_ERROR', finalDiagnostics);
    if (page) await page.screenshot({ path: SCREENSHOT, fullPage: true }).catch(() => {});
    save(BROWSER_OUT, { schemaVersion: 'orbit360-block12-browser-v2', status: 'OPERATIONAL_RUNTIME_BROWSER_FAIL', classification: safe(error).split(':')[0] || 'PIPELINE_MECHANISM_FAILURE', verdict: 'FAIL', error: safe(error), passed: 0, failed: 1, results: [], bootstrap, pageErrors, consoleErrors, screenshot: fs.existsSync(SCREENSHOT) ? path.relative(ROOT, SCREENSHOT) : '', browserExecuted: true, realTenantWrites: 0, containsTokens: false, ok: false });
    process.exitCode = 42;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
`;
    source = source.slice(0, start) + replacement + source.slice(end);
  }
  write(rel, source);
}

{
  const rel = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
  let source = read(rel);
  source = replaceExact(
    source,
    '"block12-operational-runtime-lab-v20260804":{contractVersion:"12.0.2",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs"}',
    '"block12-operational-runtime-lab-v20260804":{contractVersion:"12.0.5",lifecycle:"tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs"}',
    'ROUTER_BLOCK12_1205'
  );
  write(rel, source);
}

{
  const rel = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs';
  let source = read(rel);
  source = replaceExact(source, "const VERSION = '12.0.2';", "const VERSION = '12.0.5';", 'ENGINE_VERSION_1205');
  source = replaceExact(
    source,
    "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix5-v20260804.json';",
    "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix6-v20260804.json';",
    'ENGINE_REQUEST_ROOTFIX6'
  );
  source = replaceExact(
    source,
    "  '.github/workflows/orbit360-block12-operational-runtime-lab-rootfix5-v20260804.yml',",
    "  '.github/workflows/orbit360-block12-operational-runtime-lab-rootfix6-v20260804.yml',",
    'ENGINE_WORKFLOW_ROOTFIX6'
  );
  source = replaceExact(
    source,
    "lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_ARTIFACT_POLICY_ROOTFIX_READY'",
    "lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_BROWSER_HARNESS_ROOTFIX_READY'",
    'ENGINE_LIFECYCLE_ROOTFIX6'
  );
  const oldRequest = "request.schemaVersion === 'orbit360-block12-operational-runtime-lab-rootfix5-request-v1' && request.status === 'AUTHORIZED_AFTER_ARTIFACT_POLICY_ROOTFIX' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && Array.isArray(request.previousRuntimeRunIds) && request.previousRuntimeRunIds.join(',') === '30945951133,30948708843,30949139231,30950465823' && request.dependencyValidationRunId === 30950155722 && request.dependencyValidationStatus === 'FUNCTIONS_BOOTSTRAP_LOAD_PASS' && request.previousFailureClassification === 'PIPELINE_MECHANISM_FAILURE' && request.previousFailureCode === 'FUNCTIONS_CREATED_ARTIFACT_CLEANUP_POLICY_EXIT_1' && request.previousFunctionsCreated === 4 && request.previousFunctionsDeletedByRollback === 4 && request.authorizationRef === lifecycle.authorization.source";
  const newRequest = "request.schemaVersion === 'orbit360-block12-operational-runtime-lab-rootfix6-request-v1' && request.status === 'AUTHORIZED_AFTER_BROWSER_HARNESS_ROOTFIX' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && request.previousRuntimeRunId === 30956309298 && request.previousRuntimeStatus === 'cancelled' && request.previousFailureClassification === 'PIPELINE_MECHANISM_FAILURE' && request.previousFailureCode === 'BROWSER_BOOTSTRAP_WAIT_TIMEOUT_WITHOUT_FINALLY_CLOSE' && request.previousScenariosPassed === 0 && request.previousScenariosFailed === 0 && request.previousRollbackExact === true && request.previousRealTenantUnchanged === true && request.rescueRunId === 30959450996 && request.rescueStatus === 'RUNTIME_HANG_RESCUE_PASS' && request.dependencyValidationRunId === 30950155722 && request.dependencyValidationStatus === 'FUNCTIONS_BOOTSTRAP_LOAD_PASS' && request.authorizationRef === lifecycle.authorization.source";
  source = replaceExact(source, oldRequest, newRequest, 'ENGINE_REQUEST_ACTIVE_ROOTFIX6');
  source = replaceExact(
    source,
    "  const rootfixWorkflow = readText('.github/workflows/orbit360-block12-operational-runtime-lab-rootfix5-v20260804.yml');",
    "  const rootfixWorkflow = readText('.github/workflows/orbit360-block12-operational-runtime-lab-rootfix6-v20260804.yml');",
    'ENGINE_WORKFLOW_READ_ROOTFIX6'
  );
  source = replaceExact(
    source,
    "  add('DEPLOY_PIPELINE_ROOTFIX', scope.artifactCleanupPolicyAutomatic === true && scope.postDeployFunctionVerificationRequired === true && rootfixWorkflow.includes('firebase deploy') && rootfixWorkflow.includes('--force') && rootfixWorkflow.includes('FUNCTIONS_VERIFIED_4_OF_4') && rootfixWorkflow.includes('rollback.exact == true') && rootfixWorkflow.includes('realTenant.unchanged == true'));",
    "  add('DEPLOY_PIPELINE_ROOTFIX', scope.artifactCleanupPolicyAutomatic === true && scope.postDeployFunctionVerificationRequired === true && rootfixWorkflow.includes('firebase deploy') && rootfixWorkflow.includes('--force') && rootfixWorkflow.includes('FUNCTIONS_VERIFIED_4_OF_4') && rootfixWorkflow.includes('rollback.exact == true') && rootfixWorkflow.includes('realTenant.unchanged == true'));\n  const harness = readText('tools/orbit360-block12-operational-runtime-lab-v20260804.mjs');\n  add('BROWSER_HARNESS_ROOTFIX', scope.browserBootstrapDiagnosticsRequired === true && scope.browserCloseFinallyRequired === true && scope.callTimeoutRequired === true && scope.hardProcessTimeoutRequired === true && harness.includes(\"schemaVersion: 'orbit360-block12-browser-v2'\") && harness.includes('BROWSER_PHASE_ERROR') && harness.includes('if (browser) await browser.close().catch') && center.includes('withTimeout') && rootfixWorkflow.includes('timeout --signal=TERM --kill-after=15s 420s'));",
    'ENGINE_HARNESS_ROOTFIX_CHECK'
  );
  write(rel, source);
}

const assertions = [
  ['orbit360-platform/core/backend-lab-init.js', 'v1.128-browser-harness-rootfix'],
  ['orbit360-platform/core/runtime-verification-center-v20260804.js', 'withTimeout'],
  ['tools/orbit360-block12-operational-runtime-lab-v20260804.mjs', "schemaVersion: 'orbit360-block12-browser-v2'"],
  ['tools/orbit360-block12-operational-runtime-lab-v20260804.mjs', 'if (browser) await browser.close().catch'],
  ['tools/orbit360-validar-gate-contracts-v20260717.mjs', 'contractVersion:"12.0.5"'],
  ['tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs', "const VERSION = '12.0.5'"],
  ['tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs', 'BROWSER_HARNESS_ROOTFIX']
];
for (const [rel, token] of assertions) if (!read(rel).includes(token)) throw new Error(`PIPELINE_MECHANISM_FAILURE:ROOTFIX6_ASSERTION:${rel}:${token}`);
console.log(JSON.stringify({
  schemaVersion: 'orbit360-block12-browser-harness-rootfix-materialization-v1',
  status: 'BLOCK12_BROWSER_HARNESS_ROOTFIX_MATERIALIZED',
  gateContractVersion: '12.0.5',
  previousRuntimeRunId: 30956309298,
  previousFailure: 'BROWSER_BOOTSTRAP_WAIT_TIMEOUT_WITHOUT_FINALLY_CLOSE',
  browserBootstrapDiagnostics: true,
  browserCloseFinally: true,
  callableTimeoutMs: 30000,
  immediateVerificationCenterLoad: true,
  secretAccess: false,
  firestoreRead: false,
  deployExecuted: false,
  ok: true
}, null, 2));
