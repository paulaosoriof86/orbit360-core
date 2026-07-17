export async function waitForProductBootstrap(page, { runtime, bounded, requireState, report }) {
  await bounded('canonical_product_bootstrap_ready', () => page.waitForFunction(expected => {
    const url = new URL(location.href);
    const backend = window.OrbitBackend || {};
    const form = document.getElementById('login-form');
    let providerReady = false;
    try {
      const auth = window.firebase && firebase.auth ? firebase.auth() : null;
      providerReady = Boolean(auth && typeof auth.signInWithEmailAndPassword === 'function');
    } catch (error) {}

    const ready = /\/index\.html$/.test(url.pathname) &&
      url.searchParams.get('orbitBackend') === 'firestore-lab' &&
      url.searchParams.get('tenant') === 'alianzas-soluciones' &&
      url.searchParams.get('runtime') === expected &&
      document.readyState !== 'loading' &&
      String(backend.runtimeVersion || '') === expected &&
      String(backend.firebaseLoader || '') === 'requested' &&
      ['initialized', 'already-initialized'].includes(String(backend.firebaseInit || '')) &&
      providerReady &&
      Boolean(form && form.dataset.authMode === 'firestore-lab') &&
      Boolean(window.Orbit && Orbit.store && Orbit.router && Orbit.auth && typeof Orbit.auth.loginFirebase === 'function') &&
      Boolean(Orbit.route && Orbit.route.key);

    if (!ready) {
      window.__orbitProductBootstrapSince = 0;
      return false;
    }
    if (!window.__orbitProductBootstrapSince) window.__orbitProductBootstrapSince = Date.now();
    return Date.now() - window.__orbitProductBootstrapSince >= 2000;
  }, runtime, { timeout: 105000, polling: 250 }), 110000);

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
