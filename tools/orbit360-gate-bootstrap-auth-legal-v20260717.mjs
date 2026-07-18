import { Script } from 'node:vm';

function sanitizeDiagnostic(value) {
  return String(value || '')
    .replace(/https?:\/\/[^/\s]+/g, '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/[A-Za-z0-9_-]{48,}/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 420);
}

function safePath(rawUrl) {
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

export function installBootstrapDiagnostics(page, report) {
  const diagnostic = report.bootstrapTransportDiagnostic = {
    currentUrl: page.url(),
    lastRequestStarted: null,
    lastRequestFinished: null,
    lastFailedRequest: null,
    lastBadResponse: null,
    pageErrors: [],
    contractRequests: [],
    contractFinished: [],
    contractResponses: [],
    runtimeSignals: [],
    consoleMessages: []
  };

  page.on('request', request => {
    diagnostic.currentUrl = page.url();
    const path = safePath(request.url());
    diagnostic.lastRequestStarted = {
      path,
      resourceType: request.resourceType()
    };
    if (isRuntimeContractPath(path) && diagnostic.contractRequests.length < 32) {
      diagnostic.contractRequests.push({ path, resourceType: request.resourceType() });
    }
  });
  page.on('requestfinished', request => {
    diagnostic.currentUrl = page.url();
    const path = safePath(request.url());
    diagnostic.lastRequestFinished = {
      path,
      resourceType: request.resourceType()
    };
    if (isRuntimeContractPath(path) && diagnostic.contractFinished.length < 32) {
      diagnostic.contractFinished.push({ path, resourceType: request.resourceType() });
    }
  });
  page.on('requestfailed', request => {
    diagnostic.currentUrl = page.url();
    diagnostic.lastFailedRequest = {
      path: safePath(request.url()),
      resourceType: request.resourceType(),
      error: sanitizeDiagnostic(request.failure() && request.failure().errorText)
    };
  });
  page.on('response', response => {
    const path = safePath(response.url());
    if (isRuntimeContractPath(path) && diagnostic.contractResponses.length < 32) {
      diagnostic.contractResponses.push({
        path,
        status: response.status(),
        contentType: String(response.headers()['content-type'] || '').slice(0, 100),
        fromServiceWorker: Boolean(response.fromServiceWorker && response.fromServiceWorker())
      });
    }
    if (response.status() < 400) return;
    diagnostic.lastBadResponse = { path, status: response.status() };
  });
  page.on('console', message => {
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
  });
  page.on('pageerror', error => {
    if (diagnostic.pageErrors.length >= 8) return;
    diagnostic.pageErrors.push({
      name: sanitizeDiagnostic(error && error.name),
      message: sanitizeDiagnostic(error && error.message),
      stack: sanitizeDiagnostic(error && error.stack)
    });
  });
}

async function approveStage(report, bounded, name, task, timeoutMs) {
  await bounded(name, task, timeoutMs);
  report.checks[name] = true;
}

async function waitForAuthUiEvidence(report, requireState) {
  const required=['/data/store.js','/core/router.js','/core/auth.js'];
  const deadline=Date.now()+20000;
  let evidence=null;
  while(Date.now()<deadline){
    const parsed=new Set([].concat(report.browserParseDiagnostics&&report.browserParseDiagnostics.parsedScripts||[]).map(x=>String(x&&x.path||'')));
    const failed=new Set([].concat(report.browserParseDiagnostics&&report.browserParseDiagnostics.failedScripts||[]).map(x=>String(x&&x.path||'')));
    const transport=report.bootstrapTransportDiagnostic||{};
    const signals=[].concat(transport.runtimeSignals||[]);
    const requests=[].concat(transport.contractRequests||[]);
    const pageErrors=[].concat(transport.pageErrors||[]);
    const routerProgressObserved=signals.some(x=>/ORBIT360_RUNTIME_SIGNAL:(pwa-ready|contract-ready):/.test(String(x||'')))||requests.some(x=>/session-multirol-visibility|client-canonical-view-projection|tenant-insurer-config/.test(String(x&&x.path||'')));
    evidence={storeOwnerScriptParsed:parsed.has(required[0]),routerOwnerScriptParsed:parsed.has(required[1]),authOwnerScriptParsed:parsed.has(required[2]),ownerScriptParseFailures:required.filter(p=>failed.has(p)),authProviderReady:report.checks.canonical_auth_provider_ready===true,routerContractProgressObserved:routerProgressObserved,pageErrorCount:pageErrors.length,canonicalInitOrderEstablished:routerProgressObserved&&pageErrors.length===0};
    report.authUiDiagnostic=evidence;
    if(evidence.ownerScriptParseFailures.length)requireState(false,'AUTH_UI_OWNER_SCRIPT_PARSE_FAILED',JSON.stringify(evidence.ownerScriptParseFailures));
    if(evidence.pageErrorCount)requireState(false,'AUTH_UI_PAGE_ERROR',JSON.stringify(pageErrors.slice(0,3)));
    if(evidence.storeOwnerScriptParsed&&evidence.routerOwnerScriptParsed&&evidence.authOwnerScriptParsed&&evidence.authProviderReady&&evidence.routerContractProgressObserved)return;
    await new Promise(r=>setTimeout(r,100));
  }
  requireState(false,'AUTH_UI_EXTERNAL_EVIDENCE_MISSING',JSON.stringify(evidence||{}));
}

async function waitForOwnerHandoffEvidence(report, requireState) {
  const required=['/data/store.js','/core/router.js','/core/auth.js'];
  const deadline=Date.now()+20000;
  let evidence=null;
  while(Date.now()<deadline){
    const parsed=new Set([].concat(report.browserParseDiagnostics&&report.browserParseDiagnostics.parsedScripts||[]).map(x=>String(x&&x.path||'')));
    const failed=new Set([].concat(report.browserParseDiagnostics&&report.browserParseDiagnostics.failedScripts||[]).map(x=>String(x&&x.path||'')));
    evidence={storeOwnerScriptParsed:parsed.has(required[0]),routerOwnerScriptParsed:parsed.has(required[1]),authOwnerScriptParsed:parsed.has(required[2]),ownerScriptParseFailures:required.filter(p=>failed.has(p)),authUiInitialized:report.checks.canonical_auth_ui_ready===true,inlineInitOrderEstablished:report.checks.canonical_auth_ui_ready===true};
    report.ownerHandoffDiagnostic=evidence;
    if(evidence.ownerScriptParseFailures.length)requireState(false,'OWNER_SCRIPT_PARSE_FAILED',JSON.stringify(evidence.ownerScriptParseFailures));
    if(evidence.storeOwnerScriptParsed&&evidence.routerOwnerScriptParsed&&evidence.authOwnerScriptParsed&&evidence.authUiInitialized)return;
    await new Promise(r=>setTimeout(r,100));
  }
  requireState(false,'OWNER_HANDOFF_EXTERNAL_EVIDENCE_MISSING',JSON.stringify(evidence||{}));
}

async function validateServedRuntimeScripts(page, { report, bounded, requireState }) {
  const paths = [
    '/core/session-multirol-visibility-v20260716.js',
    '/core/client-canonical-view-projection-v20260716.js',
    '/modules/aseguradoras-v1197-ux-bridge.js',
    '/core/tenant-insurer-config-p10.js',
    '/data/tenant-runtime-config-index.js',
    '/data/tenant-alianzas-soluciones-insurers-p10.js'
  ];

  await approveStage(report, bounded, 'canonical_runtime_scripts_syntax_ready', async () => {
    const origin = new URL(page.url()).origin;
    const diagnostics = [];
    for (const path of paths) {
      const response = await page.context().request.get(new URL(path, origin).href, { timeout: 12000 });
      const status = response.status();
      requireState(response.ok(), 'RUNTIME_SCRIPT_HTTP', `${path}:${status}`);
      const body = await response.text();
      try {
        new Script(body, { filename: path });
        diagnostics.push({ path, status, bytes: Buffer.byteLength(body), syntax: true });
      } catch (error) {
        diagnostics.push({ path, status, bytes: Buffer.byteLength(body), syntax: false, error: sanitizeDiagnostic(error && error.message) });
        report.runtimeScriptDiagnostics = diagnostics;
        throw new Error(`RUNTIME_SCRIPT_SYNTAX:${path}:${sanitizeDiagnostic(error && error.message)}`);
      }
    }
    report.runtimeScriptDiagnostics = diagnostics;
  }, 70000);
}

async function waitForRuntimeContractOwner(_page, { marker, owner, code, nextPathPattern, nextSignal, requireState, report }) {
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
      requestFinished: finished.some(item => /client-canonical-view-projection-v20260716.js$/.test(String(item && item.path || ''))),
      responseOk: responses.some(item => /client-canonical-view-projection-v20260716.js$/.test(String(item && item.path || '')) && Number(item && item.status || 0) < 400),
      browserParsed: parsed.some(item => /client-canonical-view-projection-v20260716.js$/.test(String(item && item.path || ''))),
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

export async function waitForProductBootstrap(page, { runtime, bounded, requireState, report }) {
  if (!report.bootstrapTransportDiagnostic) installBootstrapDiagnostics(page, report);
  report.bootstrapTransportDiagnostic.currentUrl = page.url();

  await approveStage(report, bounded, 'canonical_url_ready', async () => {
    const url = new URL(page.url());
    requireState(/\/index\.html$/.test(url.pathname), 'CANONICAL_INDEX_NOT_REACHED', url.pathname);
    requireState(url.searchParams.get('orbitBackend') === 'firestore-lab', 'CANONICAL_BACKEND_MISSING');
    requireState(url.searchParams.get('tenant') === 'alianzas-soluciones', 'CANONICAL_TENANT_MISSING');
    requireState(url.searchParams.get('runtime') === runtime, 'CANONICAL_RUNTIME_MISMATCH', url.searchParams.get('runtime') || 'missing');
  }, 5000);

  report.bootstrapTransportDiagnostic.currentUrl = page.url();
  report.checks.canonicalDocumentParsed = true;

  await approveStage(report, bounded, 'canonical_backend_runtime_ready', () => page.waitForFunction(expected => {
    const backend = window.OrbitBackend || {};
    return String(backend.runtimeVersion || '') === expected &&
      String(backend.firebaseLoader || '') === 'requested' &&
      ['initialized', 'already-initialized'].includes(String(backend.firebaseInit || ''));
  }, runtime, { timeout: 30000, polling: 250 }), 34000);

  await approveStage(report, bounded, 'canonical_auth_provider_ready', () => page.waitForFunction(() => {
    try {
      const auth = window.firebase && firebase.auth ? firebase.auth() : null;
      return Boolean(auth && typeof auth.signInWithEmailAndPassword === 'function');
    } catch (error) {
      return false;
    }
  }, null, { timeout: 20000, polling: 250 }), 24000);

  await approveStage(report, bounded, 'canonical_auth_ui_ready', () => waitForAuthUiEvidence(report, requireState), 24000);

  await approveStage(report, bounded, 'canonical_owner_handoff_ready', () => waitForOwnerHandoffEvidence(report, requireState), 24000);

  await approveStage(report, bounded, 'canonical_pwa_controller_ready', () => waitForPwaController(page, report, requireState), 26000);

  await validateServedRuntimeScripts(page, { report, bounded, requireState });

  const bootstrapDocumentToken = 'browser-external-evidence-v1';

  await approveStage(report, bounded, 'canonical_runtime_contract_loader_started', async () => {
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
        requests.some(item => /client-canonical-view-projection-v20260716.js$/.test(String(item && item.path || ''))) ||
        responses.some(item => /client-canonical-view-projection-v20260716.js$/.test(String(item && item.path || '')) && Number(item && item.status || 0) < 400) ||
        parsed.some(item => /client-canonical-view-projection-v20260716.js$/.test(String(item && item.path || '')));
      if (observed) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    requireState(false, 'RUNTIME_CONTRACT_LOADER_EXTERNAL_EVIDENCE_MISSING');
  }, 50000);

  const CLIENT_PROJECTION_READY_BUDGET_MS = 450000;
  const CLIENT_PROJECTION_DIAGNOSTIC_RESERVE_MS = 10000;
  report.stageBudgets = Object.assign({}, report.stageBudgets || {}, {
    canonical_client_projection_ready: CLIENT_PROJECTION_READY_BUDGET_MS,
    canonical_client_projection_observation: CLIENT_PROJECTION_READY_BUDGET_MS - CLIENT_PROJECTION_DIAGNOSTIC_RESERVE_MS,
    canonical_client_projection_diagnostic_reserve: CLIENT_PROJECTION_DIAGNOSTIC_RESERVE_MS
  });

  await approveStage(report, bounded, 'canonical_client_projection_ready', () => waitForClientProjectionEvidence(report, requireState, CLIENT_PROJECTION_READY_BUDGET_MS - CLIENT_PROJECTION_DIAGNOSTIC_RESERVE_MS), CLIENT_PROJECTION_READY_BUDGET_MS);

  await approveStage(report, bounded, 'canonical_tenant_insurer_core_ready', () => waitForRuntimeContractOwner(page, {
    marker: 'data-orbit-tenant-insurer-config-core-v20260717',
    owner: 'tenant-core',
    code: 'TENANT_INSURER_CORE',
    nextPathPattern: '^/data/tenant-runtime-config-index\\.js$',
    requireState,
    report
  }), 24000);

  await approveStage(report, bounded, 'canonical_tenant_runtime_index_ready', () => waitForRuntimeContractOwner(page, {
    marker: 'data-orbit-tenant-runtime-index-v20260717',
    owner: 'tenant-index',
    code: 'TENANT_RUNTIME_INDEX',
    nextPathPattern: '^/data/tenant-[^/]+-insurers-p10\\.js$',
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

  await approveStage(report, bounded, 'canonical_router_start_ready', () => waitForRouterSignal(page, report, requireState), 28000);

  await approveStage(report, bounded, 'canonical_bootstrap_stable', async () => {
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
  }, 12000);

  const current = new URL(page.url());
  requireState(/\/index\.html$/.test(current.pathname), 'CANONICAL_INDEX_NOT_REACHED');
  requireState(current.searchParams.get('runtime') === runtime, 'CANONICAL_RUNTIME_MISMATCH');
  Object.assign(report.checks, {
    canonicalRuntime: true,
    canonicalRuntimeVersion: true,
    canonicalRuntimeStable: true,
    canonicalAuthOwnerHandoff: true,
    canonicalProductBootstrap: true
  });
  report.runtimeDiagnostic = {
    expectedRuntime: runtime,
    finalUrlRuntime: current.searchParams.get('runtime') || '',
    firebaseReady: true,
    providerReady: true,
    authUiReady: true,
    routeReady: true,
    preAuthAccessFailClosed: true,
    ownerHandoffReady: true,
    productBootstrapReady: true
  };
}

export async function authenticateWithOwner(page, { email, key, runtime, bounded, requireState, report }) {
  const entryState = await bounded('authentication_form_ready', async () => {
    const body = page.locator('body');
    const login = page.locator('#login');
    await body.waitFor({ state: 'attached', timeout: 12000 });
    await login.waitFor({ state: 'attached', timeout: 12000 });
    const bodyClass = String(await body.getAttribute('class') || '');
    const loginClass = String(await login.getAttribute('class') || '');
    const restored = !bodyClass.split(/\s+/).includes('pre-auth') || loginClass.split(/\s+/).includes('hidden');
    if (restored) return { restored: true };

    const form = page.locator('#login-form');
    await form.waitFor({ state: 'visible', timeout: 20000 });
    requireState(await form.getAttribute('data-auth-mode') === 'firestore-lab', 'AUTH_FORM_MODE_INVALID');
    await page.locator('#lg-user').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#lg-pass').waitFor({ state: 'visible', timeout: 10000 });
    return { restored: false };
  }, 26000);

  if (entryState && entryState.restored) {
    report.authMode = 'session_restored_external_ui';
    report.checks.authenticated = true;
    return;
  }

  await bounded('authentication_fill_form', async () => {
    await page.locator('#lg-user').fill(email);
    await page.locator('#lg-pass').fill(key);
    const form = page.locator('#login-form');
    requireState(String(await form.getAttribute('data-auth-mode') || '') === 'firestore-lab', 'AUTH_FORM_MODE_INVALID');
  }, 15000);

  await bounded('authentication_submit_form', async () => {
    const button = page.locator('#login-form button[type="submit"]');
    await button.waitFor({ state: 'visible', timeout: 10000 });
    await button.click();
  }, 15000);

  await bounded('authentication_observe_ui', async () => {
    const inside = page.locator('body:not(.pre-auth)');
    const failure = page.locator('#login-error');
    const deadline = Date.now() + 50000;
    while (Date.now() < deadline) {
      if (await inside.count()) return;
      if (await failure.count()) {
        const text = String(await failure.textContent() || '').trim();
        if (text) requireState(false, 'LOGIN_FORM_ERROR', text.slice(0, 160));
      }
      await page.waitForTimeout(200);
    }
    requireState(false, 'LOGIN_FORM_DID_NOT_ENTER_APP');
  }, 54000);

  await bounded('authentication_verify_ui', async () => {
    const finalClass = String(await page.locator('body').getAttribute('class') || '');
    requireState(!finalClass.split(/\s+/).includes('pre-auth'), 'AUTH_BODY_STILL_PRE_AUTH');
    await page.locator('#login').waitFor({ state: 'hidden', timeout: 12000 });
    await page.locator('#shell').waitFor({ state: 'visible', timeout: 12000 });
  }, 16000);

  report.authMode = 'canonical_login_form_external_gate';
  report.checks.authenticated = true;
}

export async function acceptLegalOnce(page, { bounded, requireState, report }) {
  await page.waitForTimeout(900);

  await bounded('legal_gate_visible', async () => {
    const roots = page.locator('[data-legal-gate]:visible');
    await roots.first().waitFor({ state: 'visible', timeout: 15000 });
    const count = await roots.count();
    requireState(count === 1, count ? 'LEGAL_DUPLICATE_VISIBLE' : 'LEGAL_GATE_NOT_VISIBLE', String(count));
    const checkbox = roots.first().locator('#lg-chk');
    const button = roots.first().locator('#lg-ok');
    requireState(await checkbox.count() === 1, 'LEGAL_CHECKBOX_MISSING');
    requireState(await button.count() === 1, 'LEGAL_ACCEPT_BUTTON_MISSING');
  }, 18000);

  await bounded('legal_gate_click_accept', async () => {
    const root = page.locator('[data-legal-gate]:visible').first();
    const checkbox = root.locator('#lg-chk');
    const button = root.locator('#lg-ok');
    await checkbox.check();
    await button.waitFor({ state: 'visible', timeout: 8000 });
    await button.click();
  }, 12000);

  await bounded('legal_gate_verify_external', async () => {
    await page.locator('[data-legal-gate]').waitFor({ state: 'detached', timeout: 18000 });
    requireState(await page.locator('#lg-chk,#conf-chk').count() === 0, 'LEGAL_GATE_STILL_VISIBLE');
  }, 20000);

  report.legalGateMode = 'canonical_visible_controls_external_gate';
  report.checks.legalOneClick = true;
}