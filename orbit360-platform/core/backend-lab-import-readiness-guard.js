/* ============================================================
   Orbit 360 · Readiness guard para carga inicial Firestore LAB
   Sincroniza Firebase Auth con el estado expuesto por Orbit.store y
   espera snapshots antes de permitir dry-run, escritura o rollback.
   No contiene datos reales ni secretos.
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (window.OrbitBackend.tenantId || window.OrbitBackend.tenant)) || '';
  var EXPECTED_EMAIL = String((window.OrbitBackend && window.OrbitBackend.expectedEmail) || 'orbit.lab@demo.com').toLowerCase();
  var EXPECTED_UID = String((window.OrbitBackend && window.OrbitBackend.expectedUid) || '');
  var patched = false;
  var reattaching = false;

  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones') return;

  function firebaseUser() {
    try {
      if (window.firebase && typeof window.firebase.auth === 'function') {
        return window.firebase.auth().currentUser || null;
      }
    } catch (e) {}
    return null;
  }

  function canonicalUser() {
    var user = firebaseUser();
    if (!user) return null;
    var email = String(user.email || '').toLowerCase();
    if (email !== EXPECTED_EMAIL) return null;
    if (EXPECTED_UID && String(user.uid || '') !== EXPECTED_UID) return null;
    return user;
  }

  function rawStatus() {
    try {
      if (window.Orbit && Orbit.store && typeof Orbit.store._labStatus === 'function') {
        return Orbit.store._labStatus() || {};
      }
    } catch (e) {}
    try {
      if (window.OrbitBackend && typeof OrbitBackend.status === 'function') {
        return OrbitBackend.status() || {};
      }
    } catch (e) {}
    return {};
  }

  function mergeCanonicalAuth(status) {
    var out = Object.assign({}, status || {});
    var user = canonicalUser();
    if (user) out.auth = { uid: user.uid || '', email: user.email || '' };
    else out.auth = null;
    return out;
  }

  function patchStatusContracts() {
    if (patched || !window.Orbit || !Orbit.store) return false;
    var originalStoreStatus = typeof Orbit.store._labStatus === 'function' ? Orbit.store._labStatus.bind(Orbit.store) : null;
    if (!originalStoreStatus) return false;

    Orbit.store._labStatus = function () {
      var state = {};
      try { state = originalStoreStatus() || {}; } catch (e) {}
      return mergeCanonicalAuth(state);
    };

    if (window.OrbitBackend && typeof OrbitBackend.status === 'function') {
      var originalBackendStatus = OrbitBackend.status.bind(OrbitBackend);
      OrbitBackend.status = function () {
        var state = {};
        try { state = originalBackendStatus() || {}; } catch (e) {}
        return mergeCanonicalAuth(state);
      };
    }

    patched = true;
    return true;
  }

  function setModalStatus(text, bad) {
    var modal = document.querySelector('[data-ays-initial-modal]');
    var el = modal && modal.querySelector('[data-status]');
    if (!el) return;
    el.textContent = text;
    el.style.borderColor = bad ? 'var(--danger,#C5162E)' : 'var(--line,#ddd)';
  }

  function forceLogin(message) {
    try {
      if (window.OrbitLabAuthGuard && typeof OrbitLabAuthGuard.forceRealLogin === 'function') {
        OrbitLabAuthGuard.forceRealLogin(message || 'Inicia sesión con el usuario LAB autorizado.');
        return;
      }
    } catch (e) {}
    var modal = document.querySelector('[data-ays-initial-modal]');
    if (modal) modal.remove();
    try {
      if (window.Orbit && Orbit.auth && typeof Orbit.auth.showLogin === 'function') Orbit.auth.showLogin();
    } catch (e) {}
  }

  function ensureSnapshots() {
    if (reattaching || !window.Orbit || !Orbit.store) return;
    var state = mergeCanonicalAuth(rawStatus());
    if (!state.auth || state.snapshotAttached) return;
    reattaching = true;
    try {
      if (typeof Orbit.store._detachSnapshots === 'function') Orbit.store._detachSnapshots();
    } catch (e) {}
    setTimeout(function () {
      try {
        if (typeof Orbit.store._attachSnapshots === 'function') Orbit.store._attachSnapshots();
      } catch (e) {}
      reattaching = false;
    }, 120);
  }

  function readiness(timeoutMs) {
    var start = Date.now();
    return new Promise(function (resolve, reject) {
      (function tick() {
        patchStatusContracts();
        var user = canonicalUser();
        if (!user) {
          reject(new Error('AUTH_REQUIRED'));
          return;
        }
        ensureSnapshots();
        var state = mergeCanonicalAuth(rawStatus());
        if (state.auth && state.auth.uid && state.snapshotAttached) {
          resolve(state);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          reject(new Error('SNAPSHOTS_NOT_READY'));
          return;
        }
        setTimeout(tick, 250);
      })();
    });
  }

  document.addEventListener('click', function (event) {
    var button = event.target && event.target.closest ? event.target.closest('[data-ays-initial-modal] [data-dry],[data-ays-initial-modal] [data-write],[data-ays-initial-modal] [data-rollback]') : null;
    if (!button) return;
    if (button.dataset.labReadyBypass === '1') {
      delete button.dataset.labReadyBypass;
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();

    if (!canonicalUser()) {
      forceLogin('La sesión LAB no está activa. Inicia sesión nuevamente para continuar.');
      return;
    }

    button.disabled = true;
    setModalStatus('Validando sesión y sincronizando datos del entorno de validación…', false);
    readiness(15000).then(function () {
      button.disabled = false;
      button.dataset.labReadyBypass = '1';
      button.click();
    }).catch(function (error) {
      button.disabled = false;
      if (error && error.message === 'AUTH_REQUIRED') {
        forceLogin('La sesión LAB no está activa. Inicia sesión nuevamente para continuar.');
      } else {
        setModalStatus('Los datos del entorno aún no terminaron de sincronizar. Espera unos segundos y vuelve a pulsar el botón.', true);
      }
    });
  }, true);

  (function install() {
    if (patchStatusContracts()) {
      ensureSnapshots();
      return;
    }
    setTimeout(install, 125);
  })();

  window.OrbitLabImportReadiness = {
    canonicalUser: canonicalUser,
    status: function () { return mergeCanonicalAuth(rawStatus()); },
    readiness: readiness,
    ensureSnapshots: ensureSnapshots
  };
})();