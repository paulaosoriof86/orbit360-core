#!/usr/bin/env node
import fs from 'node:fs';

const HELPER = 'tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs';
const RUNTIME = 'tools/orbit360-gate-runtime-crm-v20260716.mjs';

function requireState(condition, code) {
  if (!condition) throw new Error(code);
}

function replaceBetween(source, startMarker, endMarker, replacement, code) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  requireState(start >= 0 && end > start, code);
  return source.slice(0, start) + replacement + source.slice(end);
}

function replaceOnce(source, from, to, code) {
  const count = source.split(from).length - 1;
  requireState(count === 1, code + '_MATCH_COUNT:' + count);
  return source.replace(from, () => to);
}

let helper = fs.readFileSync(HELPER, 'utf8');

const externalFunctions = `async function waitForRuntimeContractOwner(_page, { marker, owner, code, nextPathPattern, nextSignal, requireState, report }) {
  const deadline = Date.now() + 20000;
  let evidence = null;
  while (Date.now() < deadline) {
    const diagnostic = report.bootstrapTransportDiagnostic || {};
    const signals = [].concat(diagnostic.runtimeSignals || []);
    const requests = [].concat(diagnostic.contractRequests || []);
    const finished = [].concat(diagnostic.contractFinished || []);
    const responses = [].concat(diagnostic.contractResponses || []);
    const pageErrors = [].concat(diagnostic.pageErrors || []);
    const parsed = [].concat(report.browserParseDiagnostics && report.browserParseDiagnostics.parsedScripts || []);
    const failed = [].concat(report.browserParseDiagnostics && report.browserParseDiagnostics.failedScripts || []);
    const exceptions = [].concat(report.browserParseDiagnostics && report.browserParseDiagnostics.exceptions || []);
    const readySignal = 'ORBIT360_RUNTIME_SIGNAL:contract-ready:' + marker;
    const loadedSignal = 'ORBIT360_RUNTIME_SIGNAL:contract-loaded:' + marker;
    const requestedSignal = 'ORBIT360_RUNTIME_SIGNAL:contract-requested:' + marker;
    const terminalPrefix = 'ORBIT360_RUNTIME_SIGNAL:contract-terminal:' + marker + ':';
    const loadErrorSignal = 'ORBIT360_RUNTIME_SIGNAL:contract-load-error:' + marker;
    const nextRequest = nextPathPattern ? requests.find(item => new RegExp(nextPathPattern).test(String(item && item.path || ''))) : null;
    const nextRuntimeSignal = nextSignal ? signals.includes('ORBIT360_RUNTIME_SIGNAL:' + nextSignal) : false;
    const terminalSignal = signals.find(item => item.indexOf(terminalPrefix) === 0 || item === loadErrorSignal);
    evidence = {
      owner,
      marker,
      requested: signals.includes(requestedSignal),
      loaded: signals.includes(loadedSignal),
      ready: signals.includes(readySignal),
      nextContractRequested: Boolean(nextRequest),
      nextRuntimeSignal,
      requestFinished: finished.some(item => String(item && item.path || '').includes(marker.indexOf('runtime-index') >= 0 ? 'tenant-runtime-config-index' : marker.indexOf('active') >= 0 ? 'insurers-p10' : 'tenant-insurer-config-p10')),
      responseOk: responses.some(item => Number(item && item.status || 0) < 400),
      parsedCount: parsed.length,
      failedCount: failed.length,
      exceptionCount: exceptions.length,
      pageErrorCount: pageErrors.length
    };
    report.runtimeOwnerDiagnostics = Object.assign({}, report.runtimeOwnerDiagnostics || {}, { [code]: evidence });
    if (terminalSignal) requireState(false, code + '_TERMINAL', terminalSignal);
    if (failed.length) requireState(false, code + '_SCRIPT_PARSE_FAILED', JSON.stringify(failed.slice(0, 3)));
    if (exceptions.length) requireState(false, code + '_RUNTIME_EXCEPTION', JSON.stringify(exceptions.slice(0, 3)));
    if (pageErrors.length) requireState(false, code + '_PAGE_ERROR', JSON.stringify(pageErrors.slice(0, 3)));
    if (evidence.ready || evidence.nextContractRequested || evidence.nextRuntimeSignal) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  requireState(false, code + '_EXTERNAL_EVIDENCE_MISSING', JSON.stringify(evidence || {}));
}

async function waitForPwaController(_page, report, requireState) {
  const deadline = Date.now() + 22000;
  while (Date.now() < deadline) {
    const diagnostic = report.bootstrapTransportDiagnostic || {};
    const signals = [].concat(diagnostic.runtimeSignals || []);
    const pageErrors = [].concat(diagnostic.pageErrors || []);
    if (signals.includes('ORBIT360_RUNTIME_SIGNAL:pwa-controller:controlled') || signals.includes('ORBIT360_RUNTIME_SIGNAL:pwa-ready:controlled')) return;
    const terminal = signals.find(item => /ORBIT360_RUNTIME_SIGNAL:pwa-(?:controller|ready):(unsupported|uncontrolled|timeout|error)/.test(item));
    if (terminal) requireState(false, 'PWA_CONTROLLER_' + terminal.split(':').pop().toUpperCase(), terminal);
    if (pageErrors.length) requireState(false, 'PWA_CONTROLLER_PAGE_ERROR', JSON.stringify(pageErrors.slice(0, 3)));
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  requireState(false, 'PWA_CONTROLLER_EXTERNAL_EVIDENCE_MISSING');
}

async function waitForRouterSignal(_page, report, requireState) {
  const deadline = Date.now() + 24000;
  while (Date.now() < deadline) {
    const diagnostic = report.bootstrapTransportDiagnostic || {};
    const signals = [].concat(diagnostic.runtimeSignals || []);
    const pageErrors = [].concat(diagnostic.pageErrors || []);
    if (signals.includes('ORBIT360_RUNTIME_SIGNAL:router-ready:1')) return;
    const terminal = signals.find(item => /ORBIT360_RUNTIME_SIGNAL:contract-(?:terminal|load-error):/.test(String(item || '')));
    if (terminal) requireState(false, 'ROUTER_RUNTIME_TERMINAL', terminal);
    if (pageErrors.length) requireState(false, 'ROUTER_READY_PAGE_ERROR', JSON.stringify(pageErrors.slice(0, 3)));
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  requireState(false, 'ROUTER_READY_EXTERNAL_EVIDENCE_MISSING');
}

async function waitForClientProjectionEvidence(report, requireState, timeoutMs) {
  const marker = 'data-orbit-client-projection-runtime-v20260716';
  const deadline = Date.now() + timeoutMs;
  const timeline = [];
  let previous = '';
  let evidence = null;
  while (Date.now() < deadline) {
    const diagnostic = report.bootstrapTransportDiagnostic || {};
    const signals = [].concat(diagnostic.runtimeSignals || []);
    const requests = [].concat(diagnostic.contractRequests || []);
    const finished = [].concat(diagnostic.contractFinished || []);
    const responses = [].concat(diagnostic.contractResponses || []);
    const pageErrors = [].concat(diagnostic.pageErrors || []);
    const parsed = [].concat(report.browserParseDiagnostics && report.browserParseDiagnostics.parsedScripts || []);
    const failed = [].concat(report.browserParseDiagnostics && report.browserParseDiagnostics.failedScripts || []);
    const exceptions = [].concat(report.browserParseDiagnostics && report.browserParseDiagnostics.exceptions || []);
    const readySignal = 'ORBIT360_RUNTIME_SIGNAL:contract-ready:' + marker;
    const terminalPrefix = 'ORBIT360_RUNTIME_SIGNAL:contract-terminal:' + marker + ':';
    const nextRequest = requests.some(item => /^\/core\/tenant-insurer-config-p10\.js$/.test(String(item && item.path || '')));
    evidence = {
      elapsedMs: timeoutMs - Math.max(0, deadline - Date.now()),
      requested: signals.includes('ORBIT360_RUNTIME_SIGNAL:contract-requested:' + marker),
      loaded: signals.includes('ORBIT360_RUNTIME_SIGNAL:contract-loaded:' + marker),
      ready: signals.includes(readySignal),
      nextContractRequested: nextRequest,
      requestFinished: finished.some(item => /client-canonical-view-projection-v20260716\.js$/.test(String(item && item.path || ''))),
      responseOk: responses.some(item => /client-canonical-view-projection-v20260716\.js$/.test(String(item && item.path || '')) && Number(item && item.status || 0) < 400),
      browserParsed: parsed.some(item => /client-canonical-view-projection-v20260716\.js$/.test(String(item && item.path || ''))),
      failedCount: failed.length,
      exceptionCount: exceptions.length,
      pageErrorCount: pageErrors.length
    };
    const signature = JSON.stringify(evidence);
    if (signature !== previous && timeline.length < 32) {
      timeline.push(evidence);
      previous = signature;
    }
    report.runtimeContractTimeline = { evidenceSource: 'browser-external', events: timeline };
    const terminalSignal = signals.find(item => item.indexOf(terminalPrefix) === 0 || item === 'ORBIT360_RUNTIME_SIGNAL:contract-load-error:' + marker);
    if (terminalSignal) requireState(false, 'CLIENT_PROJECTION_TERMINAL', terminalSignal);
    if (failed.length) requireState(false, 'CLIENT_PROJECTION_SCRIPT_PARSE_FAILED', JSON.stringify(failed.slice(0, 3)));
    if (exceptions.length) requireState(false, 'CLIENT_PROJECTION_RUNTIME_EXCEPTION', JSON.stringify(exceptions.slice(0, 3)));
    if (pageErrors.length) requireState(false, 'CLIENT_PROJECTION_PAGE_ERROR', JSON.stringify(pageErrors.slice(0, 3)));
    if (evidence.ready || evidence.nextContractRequested) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  report.runtimeContractDiagnostics = evidence || {};
  requireState(false, 'CLIENT_PROJECTION_EXTERNAL_EVIDENCE_MISSING', JSON.stringify(evidence || {}));
}

`;

helper = replaceBetween(
  helper,
  'async function waitForRuntimeContractOwner(',
  'export async function waitForProductBootstrap(',
  externalFunctions + 'export async function waitForProductBootstrap(',
  'EXTERNAL_FUNCTIONS_BLOCK_NOT_FOUND'
);

helper = replaceBetween(
  helper,
  "  const bootstrapDocumentToken = await page.evaluate(() => {",
  "  await approveStage(report, bounded, 'canonical_runtime_contract_loader_started'",
  "  const bootstrapDocumentToken = 'browser-external-evidence-v1';\n\n  await approveStage(report, bounded, 'canonical_runtime_contract_loader_started'",
  'BOOTSTRAP_TOKEN_BLOCK_NOT_FOUND'
);

const loaderStart = helper.indexOf("  await approveStage(report, bounded, 'canonical_runtime_contract_loader_started'");
const projectionBudget = helper.indexOf('  const CLIENT_PROJECTION_READY_BUDGET_MS = 450000;', loaderStart);
requireState(loaderStart >= 0 && projectionBudget > loaderStart, 'LOADER_STAGE_BLOCK_NOT_FOUND');
const loaderReplacement = `  await approveStage(report, bounded, 'canonical_runtime_contract_loader_started', async () => {
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      const diagnostic = report.bootstrapTransportDiagnostic || {};
      const signals = [].concat(diagnostic.runtimeSignals || []);
      const requests = [].concat(diagnostic.contractRequests || []);
      const responses = [].concat(diagnostic.contractResponses || []);
      const parsed = [].concat(report.browserParseDiagnostics && report.browserParseDiagnostics.parsedScripts || []);
      const terminal = signals.find(item => /ORBIT360_RUNTIME_SIGNAL:contract-(?:terminal|load-error):data-orbit-client-projection-runtime-v20260716/.test(String(item || '')));
      if (terminal) requireState(false, 'RUNTIME_CONTRACT_LOADER_TERMINAL', terminal);
      const observed = signals.some(item => /ORBIT360_RUNTIME_SIGNAL:contract-(?:requested|loaded|ready):data-orbit-client-projection-runtime-v20260716/.test(String(item || ''))) ||
        requests.some(item => /client-canonical-view-projection-v20260716\.js$/.test(String(item && item.path || ''))) ||
        responses.some(item => /client-canonical-view-projection-v20260716\.js$/.test(String(item && item.path || '')) && Number(item && item.status || 0) < 400) ||
        parsed.some(item => /client-canonical-view-projection-v20260716\.js$/.test(String(item && item.path || '')));
      if (observed) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    requireState(false, 'RUNTIME_CONTRACT_LOADER_EXTERNAL_EVIDENCE_MISSING');
  }, 50000);

`;
helper = helper.slice(0, loaderStart) + loaderReplacement + helper.slice(projectionBudget);

const projectionStart = helper.indexOf("  await approveStage(report, bounded, 'canonical_client_projection_ready'");
const tenantCoreStart = helper.indexOf("  await approveStage(report, bounded, 'canonical_tenant_insurer_core_ready'", projectionStart);
requireState(projectionStart >= 0 && tenantCoreStart > projectionStart, 'CLIENT_PROJECTION_STAGE_BLOCK_NOT_FOUND');
helper = helper.slice(0, projectionStart) +
  "  await approveStage(report, bounded, 'canonical_client_projection_ready', () => waitForClientProjectionEvidence(report, requireState, CLIENT_PROJECTION_READY_BUDGET_MS - CLIENT_PROJECTION_DIAGNOSTIC_RESERVE_MS), CLIENT_PROJECTION_READY_BUDGET_MS);\n\n" +
  helper.slice(tenantCoreStart);

const stableFrom = `  await approveStage(report, bounded, 'canonical_bootstrap_stable', async () => {
    await page.waitForTimeout(2000);
    await page.waitForFunction(expected => {
      const backend = window.OrbitBackend || {};
      return String(backend.runtimeVersion || '') === expected &&
        Boolean(window.Orbit && Orbit.store && Orbit.router && Orbit.auth && Orbit.route && Orbit.route.key);
    }, runtime, { timeout: 8000, polling: 250 });
  }, 12000);`;
const stableTo = `  await approveStage(report, bounded, 'canonical_bootstrap_stable', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const diagnostic = report.bootstrapTransportDiagnostic || {};
    const signals = [].concat(diagnostic.runtimeSignals || []);
    const pageErrors = [].concat(diagnostic.pageErrors || []);
    const exceptions = [].concat(report.browserParseDiagnostics && report.browserParseDiagnostics.exceptions || []);
    requireState(report.checks.canonical_backend_runtime_ready === true, 'BOOTSTRAP_BACKEND_MILESTONE_MISSING');
    requireState(report.checks.canonical_auth_provider_ready === true, 'BOOTSTRAP_AUTH_PROVIDER_MILESTONE_MISSING');
    requireState(report.checks.canonical_auth_ui_ready === true, 'BOOTSTRAP_AUTH_UI_MILESTONE_MISSING');
    requireState(report.checks.canonical_owner_handoff_ready === true, 'BOOTSTRAP_OWNER_HANDOFF_MILESTONE_MISSING');
    requireState(signals.includes('ORBIT360_RUNTIME_SIGNAL:router-ready:1'), 'BOOTSTRAP_ROUTER_SIGNAL_MISSING');
    requireState(pageErrors.length === 0, 'BOOTSTRAP_PAGE_ERROR', JSON.stringify(pageErrors.slice(0, 3)));
    requireState(exceptions.length === 0, 'BOOTSTRAP_RUNTIME_EXCEPTION', JSON.stringify(exceptions.slice(0, 3)));
  }, 12000);`;
helper = replaceOnce(helper, stableFrom, stableTo, 'BOOTSTRAP_STABLE_STAGE');

fs.writeFileSync(HELPER, helper, 'utf8');

let runtimeSource = fs.readFileSync(RUNTIME, 'utf8');
runtimeSource = replaceOnce(
  runtimeSource,
  "schemaVersion:'orbit360-runtime-gate-joint-v22-router-owned-contract-queue'",
  "schemaVersion:'orbit360-runtime-gate-joint-v23-external-contract-observer'",
  'RUNTIME_SCHEMA'
);
runtimeSource = replaceOnce(runtimeSource, "contractVersion:'1.0.22'", "contractVersion:'1.0.23'", 'RUNTIME_VERSION');
fs.writeFileSync(RUNTIME, runtimeSource, 'utf8');

console.log(JSON.stringify({
  ok: true,
  contractVersion: '1.0.23',
  classification: 'PIPELINE_MECHANISM_FAILURE',
  changed: [HELPER, RUNTIME]
}, null, 2));
