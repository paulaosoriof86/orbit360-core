/* Orbit 360 · contrato canónico de preparación de sesión · 2026-07-20
   Observa identidad, rol activo, tenant y gate legal antes de cualquier acción operativa.
   No acepta acuerdos, no hace clics, no escribe datos y no contiene configuración de tenant. */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Orbit = root.Orbit || {};
  root.Orbit.sessionReadinessContractV20260720 = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var VERSION = '20260720.1';
  var SCHEMA = 'orbit360-session-readiness-contract-v1';
  var lastSignature = '';
  var observer = null;
  var timer = null;

  function clean(value, max) {
    return String(value == null ? '' : value).trim().slice(0, max || 180);
  }
  function orbit() { return root.Orbit || {}; }
  function currentUser() {
    try { return orbit().auth && orbit().auth.user ? orbit().auth.user() : null; }
    catch (error) { return null; }
  }
  function authReady() {
    try { return Boolean(orbit().auth && orbit().auth.authed && orbit().auth.authed()); }
    catch (error) { return false; }
  }
  function activeRole(user) {
    try {
      var role = orbit().session && orbit().session.rol ? orbit().session.rol() : '';
      return clean(role || (user && user.rol), 80);
    } catch (error) { return clean(user && user.rol, 80); }
  }
  function tenantId() {
    try {
      var accessTenant = orbit().access && orbit().access.tenantId ? orbit().access.tenantId() : '';
      if (accessTenant) return clean(accessTenant, 120);
    } catch (error) {}
    try {
      var params = new URLSearchParams(root.location && root.location.search || '');
      var queryTenant = params.get('tenant');
      if (queryTenant) return clean(queryTenant, 120);
    } catch (error) {}
    try {
      var tenant = orbit().tenant && orbit().tenant.get ? orbit().tenant.get() : null;
      return clean(tenant && (tenant.id || tenant.tenantId), 120);
    } catch (error) { return ''; }
  }
  function scopeFor(user) {
    return 'user:' + clean(user && user.email || 'demo', 160).toLowerCase();
  }
  function legalApiReady() {
    return Boolean(orbit().legal && typeof orbit().legal.yaAcepto === 'function');
  }
  function legacyLegalAccepted() {
    try { return Boolean(root.localStorage && root.localStorage.getItem('orbit360_confidencialidad')); }
    catch (error) { return false; }
  }
  function legalAccepted(scope) {
    try {
      if (legalApiReady()) return orbit().legal.yaAcepto(scope) === true;
    } catch (error) {}
    return legacyLegalAccepted();
  }
  function legalOverlay(scope) {
    try {
      var all = Array.prototype.slice.call(root.document.querySelectorAll('[data-legal-gate]'));
      var scoped = all.find(function (node) { return node.getAttribute('data-legal-gate') === scope; });
      if (scoped) return scoped;
      if (all.length) return all[0];
      var legacy = root.document.getElementById('conf-chk');
      return legacy && legacy.closest ? legacy.closest('.drawer-back.open') : null;
    } catch (error) { return null; }
  }
  function authStage() {
    try { return clean(root.document.body && root.document.body.dataset && root.document.body.dataset.authStage, 80); }
    catch (error) { return ''; }
  }
  function snapshot() {
    var user = currentUser();
    var scope = scopeFor(user);
    var overlay = legalOverlay(scope);
    var accepted = legalAccepted(scope);
    var role = activeRole(user);
    var tenant = tenantId();
    var authenticated = authReady() && Boolean(clean(user && user.uid || user && user.email, 180));
    var legalSatisfied = accepted && !overlay;
    var stage = authStage();
    var appVisible = stage === 'inside' || stage === 'authenticated' || stage === '';
    var ready = authenticated && Boolean(role) && Boolean(tenant) && legalSatisfied && appVisible;
    var blockingCode = '';
    if (!authenticated) blockingCode = 'AUTH_NOT_READY';
    else if (!role) blockingCode = 'ACTIVE_ROLE_UNRESOLVED';
    else if (!tenant) blockingCode = 'TENANT_UNRESOLVED';
    else if (!legalSatisfied) blockingCode = 'LEGAL_GATE_PENDING';
    else if (!appVisible) blockingCode = 'APP_NOT_READY';
    return {
      schemaVersion: SCHEMA,
      contractVersion: VERSION,
      ready: ready,
      predicates: {
        browserAuthReady: authenticated,
        activeRoleResolved: Boolean(role),
        tenantResolved: Boolean(tenant),
        legalApiReady: legalApiReady(),
        legalAcceptanceRecorded: accepted,
        legalOverlayOpen: Boolean(overlay),
        legalGateSatisfied: legalSatisfied,
        appVisible: appVisible
      },
      blockingCode: blockingCode,
      authStage: stage,
      containsPII: false,
      containsSecrets: false
    };
  }
  function sanitized(value) {
    value = value || snapshot();
    return {
      schemaVersion: value.schemaVersion || SCHEMA,
      contractVersion: value.contractVersion || VERSION,
      ready: value.ready === true,
      predicates: Object.assign({}, value.predicates || {}),
      blockingCode: clean(value.blockingCode, 100),
      authStage: clean(value.authStage, 80),
      containsPII: false,
      containsSecrets: false
    };
  }
  function waitForReady(options) {
    options = options || {};
    var timeoutMs = Math.max(1000, Number(options.timeoutMs) || 30000);
    var pollMs = Math.max(50, Number(options.pollMs) || 150);
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      (function poll() {
        var current = snapshot();
        if (current.ready) return resolve(current);
        if (Date.now() - started >= timeoutMs) {
          var error = new Error(current.blockingCode || 'SESSION_READINESS_TIMEOUT');
          error.code = current.blockingCode || 'SESSION_READINESS_TIMEOUT';
          error.evidence = sanitized(current);
          return reject(error);
        }
        setTimeout(poll, pollMs);
      })();
    });
  }
  function publish() {
    var safe = sanitized(snapshot());
    root.OrbitSessionReadinessState = safe;
    var signature = JSON.stringify(safe);
    if (signature === lastSignature) return safe;
    lastSignature = signature;
    try {
      root.dispatchEvent(new CustomEvent('orbit:session-readiness-changed', { detail: safe }));
    } catch (error) {}
    return safe;
  }
  function start() {
    if (timer || observer) return publish();
    publish();
    timer = setInterval(publish, 250);
    try {
      if (root.MutationObserver && root.document && root.document.documentElement) {
        observer = new MutationObserver(publish);
        observer.observe(root.document.documentElement, { childList: true, subtree: true, attributes: true });
      }
    } catch (error) { observer = null; }
    return root.OrbitSessionReadinessState;
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    if (observer) observer.disconnect();
    observer = null;
  }

  var api = Object.freeze({
    version: VERSION,
    schemaVersion: SCHEMA,
    requiresAuthBeforeActionableClick: true,
    requiresActiveRoleBeforeActionableClick: true,
    requiresTenantBeforeActionableClick: true,
    requiresLegalGateBeforeActionableClick: true,
    neverMutatesLegalAcceptance: true,
    neverClicksOperationalUi: true,
    writesStore: false,
    snapshot: snapshot,
    sanitized: sanitized,
    waitForReady: waitForReady,
    start: start,
    stop: stop
  });

  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
  return api;
});
