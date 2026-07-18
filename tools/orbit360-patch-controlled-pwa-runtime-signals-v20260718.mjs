#!/usr/bin/env node
import fs from 'node:fs';

const paths = {
  pwa: 'orbit360-platform/core/pwa.js',
  router: 'orbit360-platform/core/router.js',
  sw: 'orbit360-platform/sw.js',
  helper: 'tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs',
  executor: 'tools/orbit360-gate-runtime-crm-v20260716.mjs'
};
const files = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, fs.readFileSync(path, 'utf8')]));

function replaceExact(fileKey, label, from, to) {
  const count = files[fileKey].split(from).length - 1;
  if (count !== 1) throw new Error(`${fileKey}:${label}_MATCH_COUNT:${count}`);
  files[fileKey] = files[fileKey].replace(from, to);
}

replaceExact('sw', 'DYNAMIC_RUNTIME_CONTRACT', `function isRuntimeContract(pathname) {
  return RUNTIME_CONTRACT_PATHS.indexOf(pathname) >= 0;
}`, `function isRuntimeContract(pathname) {
  return RUNTIME_CONTRACT_PATHS.indexOf(pathname) >= 0 || /^\\/data\\/tenant-[^/]+-insurers-p10\\.js$/i.test(pathname);
}`);

replaceExact('pwa', 'CONTROLLED_WORKER', `  var RUNTIME_BUILD = '20260717-2';

  function waitForWorkerActivation(registration) {
    var worker = registration && (registration.installing || registration.waiting);
    if (!worker || worker.state === 'activated') return Promise.resolve(registration);
    return new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(finish, 15000);
      function finish() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(registration);
      }
      worker.addEventListener('statechange', function () {
        if (worker.state === 'activated' || worker.state === 'redundant') finish();
      });
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    try {
      return navigator.serviceWorker.register('sw.js?v=' + RUNTIME_BUILD).then(function (registration) {
        return registration.update().catch(function () { return registration; }).then(function () {
          return waitForWorkerActivation(registration);
        });
      }).catch(function () { return null; });
    } catch (error) {
      return Promise.resolve(null);
    }
  }

  window.OrbitPwaWorkerReady = registerServiceWorker();`, `  var RUNTIME_BUILD = '20260717-2';
  var workerState = window.OrbitPwaWorkerState = {
    runtimeBuild: RUNTIME_BUILD,
    status: 'registering',
    controlled: false,
    scriptPath: ''
  };

  function workerPath(worker) {
    try { return worker && worker.scriptURL ? new URL(worker.scriptURL).pathname + new URL(worker.scriptURL).search : ''; } catch (e) { return ''; }
  }

  function controllerMatches(registration) {
    var controller = navigator.serviceWorker && navigator.serviceWorker.controller;
    var active = registration && registration.active;
    if (!controller || !active) return false;
    return workerPath(controller) === workerPath(active) && workerPath(controller).indexOf('v=' + RUNTIME_BUILD) >= 0;
  }

  function signalWorker(status) {
    workerState.status = status;
    workerState.controlled = status === 'controlled';
    try { console.log('ORBIT360_RUNTIME_SIGNAL:pwa-controller:' + status); } catch (e) {}
  }

  function waitForWorkerActivation(registration) {
    var worker = registration && (registration.installing || registration.waiting);
    if (!worker || worker.state === 'activated') return Promise.resolve(registration);
    return new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(finish, 15000);
      function finish() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(registration);
      }
      worker.addEventListener('statechange', function () {
        if (worker.state === 'activated' || worker.state === 'redundant') finish();
      });
    });
  }

  function waitForWorkerControl(registration) {
    if (controllerMatches(registration)) return Promise.resolve(registration);
    return new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(finish, 10000);
      function finish() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener('controllerchange', check);
        resolve(registration);
      }
      function check() { if (controllerMatches(registration)) finish(); }
      navigator.serviceWorker.addEventListener('controllerchange', check);
      check();
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      signalWorker('unsupported');
      return Promise.resolve(workerState);
    }
    try {
      return navigator.serviceWorker.register('sw.js?v=' + RUNTIME_BUILD).then(function (registration) {
        return registration.update().catch(function () { return registration; }).then(function () {
          return waitForWorkerActivation(registration);
        }).then(function () {
          return waitForWorkerControl(registration);
        }).then(function () {
          workerState.scriptPath = workerPath(navigator.serviceWorker.controller || registration.active);
          signalWorker(controllerMatches(registration) ? 'controlled' : 'uncontrolled');
          return workerState;
        });
      }).catch(function () {
        signalWorker('error');
        return workerState;
      });
    } catch (error) {
      signalWorker('error');
      return Promise.resolve(workerState);
    }
  }

  window.OrbitPwaWorkerReady = registerServiceWorker();`);

replaceExact('router', 'TENANT_CORE_READY_CONTRACT', `    { src: 'core/tenant-insurer-config-p10.js?v=20260717-1', marker: 'data-orbit-tenant-insurer-config-core-v20260717', ready: () => Orbit.tenantInsurerConfigP10 },`, `    { src: 'core/tenant-insurer-config-p10.js?v=20260717-1', marker: 'data-orbit-tenant-insurer-config-core-v20260717', ready: () => Orbit.tenantInsurerConfigP10 && typeof Orbit.tenantInsurerConfigP10.registerTenantConfig === 'function' },`);

replaceExact('router', 'RUNTIME_SIGNAL_HELPER', `  function contractReady(item) {
    try { return !item.ready || !!item.ready(); } catch (e) { return false; }
  }

  function loadRuntimeContracts(done) {`, `  function contractReady(item) {
    try { return !item.ready || !!item.ready(); } catch (e) { return false; }
  }

  function runtimeSignal(code, detail) {
    try { console.log('ORBIT360_RUNTIME_SIGNAL:' + code + (detail ? ':' + detail : '')); } catch (e) {}
  }

  function loadRuntimeContracts(done) {`);

replaceExact('router', 'INITIAL_CONTRACT_SIGNALS', `      if (state.ready) { state.status = 'ready'; state.finishedAt = Date.now(); next(); return; }
      if (!src) { state.status = 'no-source'; state.finishedAt = Date.now(); next(); return; }`, `      if (state.ready) {
        state.status = 'ready'; state.finishedAt = Date.now();
        runtimeSignal('contract-ready', item.marker);
        next(); return;
      }
      if (!src) {
        state.status = 'no-source'; state.finishedAt = Date.now();
        runtimeSignal('contract-terminal', item.marker + ':no-source');
        next(); return;
      }`);

replaceExact('router', 'FINISH_CONTRACT_SIGNAL', `        state.status = status;
        state.ready = contractReady(item);
        state.finishedAt = Date.now();
        next();`, `        state.status = status;
        state.ready = contractReady(item);
        state.finishedAt = Date.now();
        runtimeSignal(state.ready ? 'contract-ready' : 'contract-terminal', item.marker + (state.ready ? '' : ':' + status));
        next();`);

replaceExact('router', 'ROUTER_READY_SIGNAL', `    window.addEventListener('hashchange', onHash);
    onHash();
  }`, `    window.addEventListener('hashchange', onHash);
    onHash();
    runtimeSignal('router-ready', '1');
  }`);

replaceExact('router', 'WAIT_FOR_PWA_CONTROL', `  function init() {
    host = document.getElementById('host');
    sidebar = document.getElementById('sidebar');
    loadRuntimeContracts(start);
  }`, `  function init() {
    host = document.getElementById('host');
    sidebar = document.getElementById('sidebar');
    let started = false;
    function begin() {
      if (started) return;
      started = true;
      loadRuntimeContracts(start);
    }
    const pwaReady = window.OrbitPwaWorkerReady;
    if (!pwaReady || typeof pwaReady.then !== 'function') {
      runtimeContractState.__pwa = { status: 'unavailable', controlled: false };
      runtimeSignal('pwa-ready', 'unavailable');
      begin();
      return;
    }
    Promise.race([
      pwaReady,
      new Promise(resolve => setTimeout(() => resolve({ status: 'timeout', controlled: false }), 20000))
    ]).then(function (state) {
      const status = state && state.controlled ? 'controlled' : String(state && state.status || 'uncontrolled');
      runtimeContractState.__pwa = { status: status, controlled: status === 'controlled' };
      runtimeSignal('pwa-ready', status);
      begin();
    }).catch(function () {
      runtimeContractState.__pwa = { status: 'error', controlled: false };
      runtimeSignal('pwa-ready', 'error');
      begin();
    });
  }`);

replaceExact('helper', 'CONTRACT_PATH_HELPER', `function safePath(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.pathname.slice(0, 180);
  } catch (error) {
    return '';
  }
}

export function installBootstrapDiagnostics(page, report) {`, `function safePath(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.pathname.slice(0, 180);
  } catch (error) {
    return '';
  }
}

function isRuntimeContractPath(path) {
  return /client-canonical-view-projection|tenant-insurer-config|tenant-runtime-config-index|session-multirol-visibility|tenant-[^/]+-insurers-p10/.test(String(path || ''));
}

export function installBootstrapDiagnostics(page, report) {`);

replaceExact('helper', 'DIAGNOSTIC_ARRAYS', `    pageErrors: [],
    contractResponses: [],
    consoleMessages: []`, `    pageErrors: [],
    contractRequests: [],
    contractFinished: [],
    contractResponses: [],
    runtimeSignals: [],
    consoleMessages: []`);

replaceExact('helper', 'REQUEST_DIAGNOSTIC', `  page.on('request', request => {
    diagnostic.currentUrl = page.url();
    diagnostic.lastRequestStarted = {
      path: safePath(request.url()),
      resourceType: request.resourceType()
    };
  });`, `  page.on('request', request => {
    diagnostic.currentUrl = page.url();
    const path = safePath(request.url());
    diagnostic.lastRequestStarted = {
      path,
      resourceType: request.resourceType()
    };
    if (isRuntimeContractPath(path) && diagnostic.contractRequests.length < 32) {
      diagnostic.contractRequests.push({ path, resourceType: request.resourceType() });
    }
  });`);

replaceExact('helper', 'REQUEST_FINISHED_DIAGNOSTIC', `  page.on('requestfinished', request => {
    diagnostic.currentUrl = page.url();
    diagnostic.lastRequestFinished = {
      path: safePath(request.url()),
      resourceType: request.resourceType()
    };
  });`, `  page.on('requestfinished', request => {
    diagnostic.currentUrl = page.url();
    const path = safePath(request.url());
    diagnostic.lastRequestFinished = {
      path,
      resourceType: request.resourceType()
    };
    if (isRuntimeContractPath(path) && diagnostic.contractFinished.length < 32) {
      diagnostic.contractFinished.push({ path, resourceType: request.resourceType() });
    }
  });`);

replaceExact('helper', 'RESPONSE_PATH_MATCHER', `    if (/client-canonical-view-projection|tenant-insurer-config|tenant-runtime-config-index|session-multirol-visibility/.test(path) && diagnostic.contractResponses.length < 16) {`, `    if (isRuntimeContractPath(path) && diagnostic.contractResponses.length < 32) {`);

replaceExact('helper', 'CONSOLE_RUNTIME_SIGNALS', `  page.on('console', message => {
    if (!['error', 'warning'].includes(message.type()) || diagnostic.consoleMessages.length >= 12) return;
    diagnostic.consoleMessages.push({
      type: message.type(),
      text: sanitizeDiagnostic(message.text())
    });
  });`, `  page.on('console', message => {
    const text = sanitizeDiagnostic(message.text());
    if (text.indexOf('ORBIT360_RUNTIME_SIGNAL:') === 0) {
      if (diagnostic.runtimeSignals.length < 64) diagnostic.runtimeSignals.push(text);
      return;
    }
    if (!['error', 'warning'].includes(message.type()) || diagnostic.consoleMessages.length >= 12) return;
    diagnostic.consoleMessages.push({
      type: message.type(),
      text
    });
  });`);

replaceExact('helper', 'OWNER_WAIT_EXTERNAL_SIGNALS', `async function waitForRuntimeContractOwner(page, { marker, owner, code, requireState, report }) {
  const terminal = ['error', 'timeout', 'no-source'];
  const deadline = Date.now() + 20000;
  let last = null;
  while (Date.now() < deadline) {
    last = await page.evaluate(({ marker, owner }) => {
      const router = window.Orbit && Orbit.router;
      const contract = router && router.runtimeContractState ? router.runtimeContractState[marker] || null : null;
      let ready = false;
      if (owner === 'tenant-core') {
        ready = Boolean(window.Orbit && Orbit.tenantInsurerConfigP10 && typeof Orbit.tenantInsurerConfigP10.registerTenantConfig === 'function');
      } else if (owner === 'tenant-index') {
        ready = Boolean(window.OrbitTenantRuntimeConfigIndex && window.OrbitTenantRuntimeConfigIndex['alianzas-soluciones']);
      } else if (owner === 'tenant-active') {
        ready = [].concat(window.OrbitTenantInsurerConfigsP10 || []).some(item => item && item.tenantId === 'alianzas-soluciones');
      }
      return {
        ready,
        status: String(contract && contract.status || ''),
        contractReady: Boolean(contract && contract.ready),
        srcPresent: Boolean(contract && contract.src),
        loadEvent: Boolean(contract && contract.loadEvent),
        errorEvent: Boolean(contract && contract.errorEvent)
      };
    }, { marker, owner });
    if (last.ready) return;
    if (terminal.includes(last.status)) {
      report.runtimeOwnerDiagnostics = Object.assign({}, report.runtimeOwnerDiagnostics || {}, { [code]: last });
      requireState(false, code + '_' + last.status.toUpperCase(), JSON.stringify(last));
    }
    await page.waitForTimeout(250);
  }
  report.runtimeOwnerDiagnostics = Object.assign({}, report.runtimeOwnerDiagnostics || {}, { [code]: last });
  requireState(false, code + '_NOT_READY', JSON.stringify(last || {}));
}`, `async function waitForRuntimeContractOwner(page, { marker, owner, code, nextPathPattern, nextSignal, requireState, report }) {
  const terminal = ['error', 'timeout', 'no-source'];
  const deadline = Date.now() + 20000;
  let last = null;
  while (Date.now() < deadline) {
    const diagnostic = report.bootstrapTransportDiagnostic || {};
    const signals = [].concat(diagnostic.runtimeSignals || []);
    const readySignal = 'ORBIT360_RUNTIME_SIGNAL:contract-ready:' + marker;
    const terminalPrefix = 'ORBIT360_RUNTIME_SIGNAL:contract-terminal:' + marker + ':';
    const transitionBySignal = signals.includes(readySignal) || (nextSignal && signals.includes('ORBIT360_RUNTIME_SIGNAL:' + nextSignal));
    const transitionByRequest = nextPathPattern && [].concat(diagnostic.contractRequests || []).some(item => new RegExp(nextPathPattern).test(String(item && item.path || '')));
    if (transitionBySignal || transitionByRequest) {
      report.runtimeOwnerDiagnostics = Object.assign({}, report.runtimeOwnerDiagnostics || {}, {
        [code]: { ready: true, evidence: transitionBySignal ? 'runtime-signal' : 'next-contract-request' }
      });
      return;
    }
    const terminalSignal = signals.find(item => item.indexOf(terminalPrefix) === 0);
    if (terminalSignal) {
      const status = terminalSignal.slice(terminalPrefix.length) || 'error';
      requireState(false, code + '_' + status.toUpperCase(), terminalSignal);
    }

    last = await Promise.race([
      page.evaluate(({ marker, owner }) => {
        const router = window.Orbit && Orbit.router;
        const contract = router && router.runtimeContractState ? router.runtimeContractState[marker] || null : null;
        let ready = false;
        if (owner === 'tenant-core') {
          ready = Boolean(window.Orbit && Orbit.tenantInsurerConfigP10 && typeof Orbit.tenantInsurerConfigP10.registerTenantConfig === 'function');
        } else if (owner === 'tenant-index') {
          ready = Boolean(window.OrbitTenantRuntimeConfigIndex && window.OrbitTenantRuntimeConfigIndex['alianzas-soluciones']);
        } else if (owner === 'tenant-active') {
          ready = [].concat(window.OrbitTenantInsurerConfigsP10 || []).some(item => item && item.tenantId === 'alianzas-soluciones');
        }
        return {
          ready,
          status: String(contract && contract.status || ''),
          contractReady: Boolean(contract && contract.ready),
          srcPresent: Boolean(contract && contract.src),
          loadEvent: Boolean(contract && contract.loadEvent),
          errorEvent: Boolean(contract && contract.errorEvent)
        };
      }, { marker, owner }),
      new Promise(resolve => setTimeout(() => resolve({ evaluationTimeout: true }), 1000))
    ]);
    if (last && last.ready) return;
    if (last && terminal.includes(last.status)) {
      report.runtimeOwnerDiagnostics = Object.assign({}, report.runtimeOwnerDiagnostics || {}, { [code]: last });
      requireState(false, code + '_' + last.status.toUpperCase(), JSON.stringify(last));
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  report.runtimeOwnerDiagnostics = Object.assign({}, report.runtimeOwnerDiagnostics || {}, { [code]: last });
  requireState(false, code + '_NOT_READY', JSON.stringify(last || {}));
}

async function waitForPwaController(page, report, requireState) {
  const deadline = Date.now() + 22000;
  let last = null;
  while (Date.now() < deadline) {
    const signals = [].concat(report.bootstrapTransportDiagnostic && report.bootstrapTransportDiagnostic.runtimeSignals || []);
    if (signals.includes('ORBIT360_RUNTIME_SIGNAL:pwa-controller:controlled') || signals.includes('ORBIT360_RUNTIME_SIGNAL:pwa-ready:controlled')) return;
    const terminal = signals.find(item => /ORBIT360_RUNTIME_SIGNAL:pwa-(?:controller|ready):(unsupported|uncontrolled|timeout|error)/.test(item));
    if (terminal) requireState(false, 'PWA_CONTROLLER_' + terminal.split(':').pop().toUpperCase(), terminal);
    last = await Promise.race([
      page.evaluate(() => window.OrbitPwaWorkerState || null),
      new Promise(resolve => setTimeout(() => resolve({ evaluationTimeout: true }), 1000))
    ]);
    if (last && last.controlled === true) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  requireState(false, 'PWA_CONTROLLER_NOT_READY', JSON.stringify(last || {}));
}

async function waitForRouterSignal(page, report, requireState) {
  const deadline = Date.now() + 24000;
  while (Date.now() < deadline) {
    const signals = [].concat(report.bootstrapTransportDiagnostic && report.bootstrapTransportDiagnostic.runtimeSignals || []);
    if (signals.includes('ORBIT360_RUNTIME_SIGNAL:router-ready:1')) return;
    const state = await Promise.race([
      page.evaluate(() => Boolean(window.Orbit && Orbit.route && Orbit.route.key)),
      new Promise(resolve => setTimeout(() => resolve(false), 1000))
    ]);
    if (state) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  requireState(false, 'ROUTER_READY_SIGNAL_MISSING');
}`);

replaceExact('helper', 'PWA_CONTROLLER_STAGE', `  await approveStage(report, bounded, 'canonical_owner_handoff_ready', () => page.waitForFunction(() => {
    return Boolean(window.Orbit && Orbit.store && Orbit.router && Orbit.auth &&
      typeof Orbit.auth.loginFirebase === 'function');
  }, null, { timeout: 20000, polling: 250 }), 24000);

  await validateServedRuntimeScripts(page, { report, bounded, requireState });`, `  await approveStage(report, bounded, 'canonical_owner_handoff_ready', () => page.waitForFunction(() => {
    return Boolean(window.Orbit && Orbit.store && Orbit.router && Orbit.auth &&
      typeof Orbit.auth.loginFirebase === 'function');
  }, null, { timeout: 20000, polling: 250 }), 24000);

  await approveStage(report, bounded, 'canonical_pwa_controller_ready', () => waitForPwaController(page, report, requireState), 26000);

  await validateServedRuntimeScripts(page, { report, bounded, requireState });`);

replaceExact('helper', 'OWNER_STAGE_ARGUMENTS', `  await approveStage(report, bounded, 'canonical_tenant_insurer_core_ready', () => waitForRuntimeContractOwner(page, {
    marker: 'data-orbit-tenant-insurer-config-core-v20260717',
    owner: 'tenant-core',
    code: 'TENANT_INSURER_CORE',
    requireState,
    report
  }), 24000);

  await approveStage(report, bounded, 'canonical_tenant_runtime_index_ready', () => waitForRuntimeContractOwner(page, {
    marker: 'data-orbit-tenant-runtime-index-v20260717',
    owner: 'tenant-index',
    code: 'TENANT_RUNTIME_INDEX',
    requireState,
    report
  }), 24000);

  await approveStage(report, bounded, 'canonical_tenant_insurer_active_ready', () => waitForRuntimeContractOwner(page, {
    marker: 'data-orbit-tenant-insurer-config-active-v20260717',
    owner: 'tenant-active',
    code: 'TENANT_INSURER_ACTIVE',
    requireState,
    report
  }), 24000);

  await approveStage(report, bounded, 'canonical_router_start_ready', () => page.waitForFunction(() => {
    return Boolean(window.Orbit && Orbit.route && Orbit.route.key);
  }, null, { timeout: 20000, polling: 250 }), 24000);`, `  await approveStage(report, bounded, 'canonical_tenant_insurer_core_ready', () => waitForRuntimeContractOwner(page, {
    marker: 'data-orbit-tenant-insurer-config-core-v20260717',
    owner: 'tenant-core',
    code: 'TENANT_INSURER_CORE',
    nextPathPattern: '^/data/tenant-runtime-config-index\\\\.js$',
    requireState,
    report
  }), 24000);

  await approveStage(report, bounded, 'canonical_tenant_runtime_index_ready', () => waitForRuntimeContractOwner(page, {
    marker: 'data-orbit-tenant-runtime-index-v20260717',
    owner: 'tenant-index',
    code: 'TENANT_RUNTIME_INDEX',
    nextPathPattern: '^/data/tenant-[^/]+-insurers-p10\\\\.js$',
    requireState,
    report
  }), 24000);

  await approveStage(report, bounded, 'canonical_tenant_insurer_active_ready', () => waitForRuntimeContractOwner(page, {
    marker: 'data-orbit-tenant-insurer-config-active-v20260717',
    owner: 'tenant-active',
    code: 'TENANT_INSURER_ACTIVE',
    nextSignal: 'router-ready:1',
    requireState,
    report
  }), 24000);

  await approveStage(report, bounded, 'canonical_router_start_ready', () => waitForRouterSignal(page, report, requireState), 28000);`);

replaceExact('executor', 'VERSION_1019', "contractVersion:'1.0.18'", "contractVersion:'1.0.19'");

const required = {
  pwa: ['waitForWorkerControl', 'OrbitPwaWorkerState', 'pwa-controller:', 'controllerMatches'],
  router: ['runtimeSignal', "runtimeSignal('router-ready', '1')", "runtimeSignal('pwa-ready', status)", 'window.OrbitPwaWorkerReady'],
  sw: ["tenant-[^/]+-insurers-p10"],
  helper: ['contractRequests', 'contractFinished', 'runtimeSignals', 'waitForPwaController', 'waitForRouterSignal', 'nextPathPattern', 'evaluationTimeout'],
  executor: ["contractVersion:'1.0.19'"]
};
for (const [key, tokens] of Object.entries(required)) {
  for (const token of tokens) if (!files[key].includes(token)) throw new Error(`${key}:TOKEN_MISSING:${token}`);
}

for (const [key, path] of Object.entries(paths)) fs.writeFileSync(path, files[key], 'utf8');
console.log(JSON.stringify({ ok: true, contractVersion: '1.0.19', files: Object.values(paths) }, null, 2));
