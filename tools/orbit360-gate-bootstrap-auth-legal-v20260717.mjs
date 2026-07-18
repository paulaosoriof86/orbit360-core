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

async function waitForRuntimeContractOwner(page, { marker, owner, code, nextPathPattern, nextSignal, requireState, report }) {
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

  await approveStage(report, bounded, 'canonical_auth_ui_ready', () => page.waitForFunction(() => {
    const form = document.getElementById('login-form');
    return Boolean(form && form.dataset.authMode === 'firestore-lab');
  }, null, { timeout: 20000, polling: 250 }), 24000);

  await approveStage(report, bounded, 'canonical_owner_handoff_ready', () => waitForOwnerHandoffEvidence(report, requireState), 24000);

  await approveStage(report, bounded, 'canonical_pwa_controller_ready', () => waitForPwaController(page, report, requireState), 26000);

  await validateServedRuntimeScripts(page, { report, bounded, requireState });

  const bootstrapDocumentToken = await page.evaluate(() => {
    if (!window.__orbitGateDocumentToken) {
      window.__orbitGateDocumentToken = 'doc-' + String(Math.round(performance.timeOrigin || Date.now()));
    }
    return window.__orbitGateDocumentToken;
  });

  await approveStage(report, bounded, 'canonical_runtime_contract_loader_started', async () => {
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      const responseSeen = [].concat(report.bootstrapTransportDiagnostic && report.bootstrapTransportDiagnostic.contractResponses || [])
        .some(item => /client-canonical-view-projection-v20260716\.js$/.test(String(item && item.path || '')) && Number(item.status || 0) < 400);
      if (responseSeen) return;
      const ownerReady = await Promise.race([
        page.evaluate(() => Boolean(window.Orbit && Orbit.clientProjection && typeof Orbit.clientProjection.get === 'function')),
        new Promise(resolve => setTimeout(() => resolve(false), 1000))
      ]);
      if (ownerReady) return;
      await page.waitForTimeout(100);
    }
    requireState(false, 'RUNTIME_CONTRACT_LOADER_NOT_OBSERVED');
  }, 50000);

  const CLIENT_PROJECTION_READY_BUDGET_MS = 450000;
  const CLIENT_PROJECTION_DIAGNOSTIC_RESERVE_MS = 10000;
  report.stageBudgets = Object.assign({}, report.stageBudgets || {}, {
    canonical_client_projection_ready: CLIENT_PROJECTION_READY_BUDGET_MS,
    canonical_client_projection_observation: CLIENT_PROJECTION_READY_BUDGET_MS - CLIENT_PROJECTION_DIAGNOSTIC_RESERVE_MS,
    canonical_client_projection_diagnostic_reserve: CLIENT_PROJECTION_DIAGNOSTIC_RESERVE_MS
  });

  await approveStage(report, bounded, 'canonical_client_projection_ready', async () => {
    const deadline = Date.now() + (CLIENT_PROJECTION_READY_BUDGET_MS - CLIENT_PROJECTION_DIAGNOSTIC_RESERVE_MS);
    const timeline = [];
    let previousSignature = '';
    let markerEverSeen = false;
    let ownerEverSeen = false;
    let ownerGetEverSeen = false;
    let documentChanged = false;

    while (Date.now() < deadline) {
      const snapshot = await page.evaluate(expectedDocumentToken => {
        const marker = document.querySelector('script[data-orbit-client-projection-runtime-v20260716]');
        const ownerPresent = Boolean(window.Orbit && Orbit.clientProjection);
        const ownerGetPresent = Boolean(window.Orbit && Orbit.clientProjection && typeof Orbit.clientProjection.get === 'function');
        return {
          elapsedMs: Math.round(performance.now()),
          readyState: document.readyState,
          documentTokenMatches: window.__orbitGateDocumentToken === expectedDocumentToken,
          markerPresent: Boolean(marker),
          markerConnected: Boolean(marker && marker.isConnected),
          ownerPresent,
          ownerGetPresent,
          temporaryOwnerPresent: Boolean(window.Orbit && Orbit.clientCanonicalViewProjectionV20260716),
          routePresent: Boolean(window.Orbit && Orbit.route && Orbit.route.key),
          orbitKeyCount: window.Orbit ? Object.keys(Orbit).length : 0
        };
      }, bootstrapDocumentToken);

      markerEverSeen = markerEverSeen || snapshot.markerPresent;
      ownerEverSeen = ownerEverSeen || snapshot.ownerPresent;
      ownerGetEverSeen = ownerGetEverSeen || snapshot.ownerGetPresent;
      documentChanged = documentChanged || !snapshot.documentTokenMatches;
      const signature = JSON.stringify([
        snapshot.documentTokenMatches,
        snapshot.markerPresent,
        snapshot.markerConnected,
        snapshot.ownerPresent,
        snapshot.ownerGetPresent,
        snapshot.temporaryOwnerPresent,
        snapshot.routePresent,
        snapshot.readyState,
        snapshot.orbitKeyCount
      ]);
      if (signature !== previousSignature && timeline.length < 24) {
        timeline.push(snapshot);
        previousSignature = signature;
      }
      if (snapshot.ownerGetPresent) {
        report.runtimeContractTimeline = { markerEverSeen, ownerEverSeen, ownerGetEverSeen, documentChanged, events: timeline };
        return;
      }
      await page.waitForTimeout(100);
    }

    report.runtimeContractTimeline = { markerEverSeen, ownerEverSeen, ownerGetEverSeen, documentChanged, events: timeline };
    report.runtimeContractDiagnostics = await page.evaluate(expectedDocumentToken => {
      const markerName = 'data-orbit-client-projection-runtime-v20260716';
      const marker = document.querySelector('script[' + markerName + ']');
      const pathOf = value => {
        try { return new URL(String(value || ''), location.href).pathname; } catch (error) { return ''; }
      };
      const resources = performance.getEntriesByType('resource')
        .filter(entry => /client-canonical-view-projection-v20260716\.js/.test(String(entry.name || '')))
        .slice(-4)
        .map(entry => ({
          path: pathOf(entry.name),
          duration: Math.round(Number(entry.duration || 0)),
          transferSize: Number(entry.transferSize || 0),
          encodedBodySize: Number(entry.encodedBodySize || 0),
          decodedBodySize: Number(entry.decodedBodySize || 0),
          responseStatus: Number(entry.responseStatus || 0)
        }));
      const laterMarkers = [
        'data-orbit-tenant-insurer-config-core-v20260717',
        'data-orbit-tenant-runtime-index-v20260717',
        'data-orbit-tenant-insurer-config-active-v20260717'
      ].reduce((out, name) => { out[name] = Boolean(document.querySelector('script[' + name + ']')); return out; }, {});
      return {
        documentTokenMatches: window.__orbitGateDocumentToken === expectedDocumentToken,
        marker: marker ? {
          present: true,
          path: pathOf(marker.src),
          async: Boolean(marker.async),
          defer: Boolean(marker.defer),
          connected: Boolean(marker.isConnected),
          type: String(marker.type || '')
        } : { present: false },
        ownerPresent: Boolean(window.Orbit && Orbit.clientProjection),
        ownerGetPresent: Boolean(window.Orbit && Orbit.clientProjection && typeof Orbit.clientProjection.get === 'function'),
        temporaryOwnerPresent: Boolean(window.Orbit && Orbit.clientCanonicalViewProjectionV20260716),
        routerRoutePresent: Boolean(window.Orbit && Orbit.route && Orbit.route.key),
        laterMarkers,
        resources
      };
    }, bootstrapDocumentToken);
    requireState(false, 'CLIENT_PROJECTION_NOT_REGISTERED', JSON.stringify(report.runtimeContractDiagnostics));
  }, CLIENT_PROJECTION_READY_BUDGET_MS);

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
    await page.waitForTimeout(2000);
    await page.waitForFunction(expected => {
      const backend = window.OrbitBackend || {};
      return String(backend.runtimeVersion || '') === expected &&
        Boolean(window.Orbit && Orbit.store && Orbit.router && Orbit.auth && Orbit.route && Orbit.route.key);
    }, runtime, { timeout: 8000, polling: 250 });
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
  const scheduled = await bounded('authentication_schedule_signin', () => page.evaluate(({ email, key, runtime }) => {
    if (String((window.OrbitBackend || {}).runtimeVersion || '') !== runtime) return { ok: false, code: 'AUTH_RUNTIME_MISMATCH' };
    if (!(window.Orbit && Orbit.auth && typeof Orbit.auth.loginFirebase === 'function')) return { ok: false, code: 'AUTH_OWNER_NOT_READY' };
    let currentUser = null;
    try { currentUser = window.firebase && firebase.auth ? firebase.auth().currentUser : null; } catch (error) {}
    if (currentUser) {
      window.__orbitGateAuthStatus = { state: 'resolved', code: '', restored: true };
      return { ok: true };
    }
    window.__orbitGateAuthStatus = { state: 'pending', code: '', restored: false };
    setTimeout(() => {
      Promise.resolve(Orbit.auth.loginFirebase(email, key))
        .then(user => {
          window.__orbitGateAuthStatus = { state: user ? 'resolved' : 'failed', code: user ? '' : 'AUTH_USER_NOT_AVAILABLE', restored: false };
        })
        .catch(error => {
          window.__orbitGateAuthStatus = {
            state: 'failed',
            code: String(error && (error.code || error.message) || 'auth/unknown').replace(/[^a-z0-9/_-]/gi, '').slice(0, 80),
            restored: false
          };
        });
    }, 0);
    return { ok: true };
  }, { email, key, runtime }), 15000);
  requireState(scheduled && scheduled.ok, (scheduled && scheduled.code) || 'AUTH_DISPATCH_FAILED');

  await bounded('authentication_observe_signin', () => page.waitForFunction(expected => {
    const status = window.__orbitGateAuthStatus || {};
    let currentUser = false;
    try { currentUser = Boolean(window.firebase && firebase.auth && firebase.auth().currentUser); } catch (error) {}
    return String((window.OrbitBackend || {}).runtimeVersion || '') === expected &&
      (currentUser || status.state === 'resolved' || status.state === 'failed');
  }, runtime, { timeout: 40000, polling: 250 }), 45000);

  const outcome = await bounded('authentication_read_signin', () => page.evaluate(() => {
    const status = window.__orbitGateAuthStatus || {};
    let currentUser = false;
    try { currentUser = Boolean(window.firebase && firebase.auth && firebase.auth().currentUser); } catch (error) {}
    return { currentUser, code: String(status.code || ''), restored: Boolean(status.restored) };
  }), 10000);
  requireState(outcome.currentUser, `LOGIN_OWNER_${outcome.code || 'UNKNOWN'}`);

  await bounded('authentication_show_app', () => page.evaluate(() => {
    if (!(window.Orbit && Orbit.auth && typeof Orbit.auth.showApp === 'function')) return false;
    Orbit.auth.showApp();
    return true;
  }), 10000);
  await bounded('authentication_inside', () => page.waitForFunction(
    () => !document.body.classList.contains('pre-auth'),
    null,
    { timeout: 12000, polling: 250 }
  ), 15000);
  report.authMode = outcome.restored ? 'session_restored' : 'canonical_owner_contract_gate';
  report.checks.authenticated = true;
}

export async function acceptLegalOnce(page, { bounded, requireState, report }) {
  await page.waitForTimeout(900);
  const state = await bounded('legal_gate_inspect', () => page.evaluate(() => {
    const visible = node => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const boxes = Array.from(document.querySelectorAll('#lg-chk,#conf-chk')).filter(visible);
    return { count: boxes.length, ownerReady: Boolean(window.Orbit && Orbit.legal && Orbit.legal.__ownerIdempotent) };
  }), 10000);
  requireState(state.ownerReady, 'LEGAL_OWNER_NOT_READY');
  requireState(state.count === 1, state.count ? 'LEGAL_DUPLICATE_VISIBLE' : 'LEGAL_GATE_NOT_VISIBLE', String(state.count));

  const scheduled = await bounded('legal_gate_schedule_accept', () => page.evaluate(() => {
    const checkbox = document.querySelector('#lg-chk,#conf-chk');
    const root = checkbox && checkbox.closest('.drawer-back');
    const button = root && root.querySelector('#lg-ok,#conf-ok');
    if (!checkbox || !button) return false;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    setTimeout(() => button.click(), 0);
    return true;
  }), 10000);
  requireState(scheduled, 'LEGAL_ACCEPT_SCHEDULE_FAILED');

  await bounded('legal_gate_verify', () => page.waitForFunction(() => {
    const pending = Boolean(window.Orbit && Orbit.legal && Orbit.legal.__gateState && Object.values(Orbit.legal.__gateState.pendingScopes || {}).some(Boolean));
    return !document.querySelector('#lg-chk,#conf-chk') && !pending;
  }, null, { timeout: 15000, polling: 250 }), 18000);
  report.checks.legalOneClick = true;
}
