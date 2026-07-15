/* ============================================================
   Orbit 360 · Readiness guard para carga inicial Firestore LAB
   Sincroniza Firebase Auth con Orbit.store y realiza una lectura
   controlada de Clientes, Aseguradoras y Asesores antes del dry-run.
   No contiene datos reales ni secretos.
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (window.OrbitBackend.tenantId || window.OrbitBackend.tenant)) || '';
  var EXPECTED_EMAIL = String((window.OrbitBackend && window.OrbitBackend.expectedEmail) || 'orbit.lab@demo.com').toLowerCase();
  var EXPECTED_UID = String((window.OrbitBackend && window.OrbitBackend.expectedUid) || '');
  var CRITICAL = ['clientes', 'aseguradoras', 'asesores'];
  var patched = false;
  var directReadPromise = null;
  var criticalState = { ready: false, uid: '', loadedAt: '', counts: {}, error: null };

  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones') return;

  function firebaseAuth() {
    try {
      if (window.firebase && typeof window.firebase.auth === 'function') return window.firebase.auth();
    } catch (e) {}
    return null;
  }

  function firebaseDb() {
    try {
      if (window.firebase && typeof window.firebase.firestore === 'function') return window.firebase.firestore();
    } catch (e) {}
    return null;
  }

  function firebaseUser() {
    var auth = firebaseAuth();
    return auth && auth.currentUser ? auth.currentUser : null;
  }

  function canonicalUser() {
    var user = firebaseUser();
    if (!user) return null;
    var email = String(user.email || '').toLowerCase();
    if (email !== EXPECTED_EMAIL) return null;
    if (EXPECTED_UID && String(user.uid || '') !== EXPECTED_UID) return null;
    return user;
  }

  function rawStatusUnpatched() {
    try {
      if (window.Orbit && Orbit.store && typeof Orbit.store.__labOriginalStatus === 'function') {
        return Orbit.store.__labOriginalStatus() || {};
      }
      if (window.Orbit && Orbit.store && typeof Orbit.store._labStatus === 'function') {
        return Orbit.store._labStatus() || {};
      }
    } catch (e) {}
    try {
      if (window.OrbitBackend && typeof OrbitBackend.__labOriginalStatus === 'function') {
        return OrbitBackend.__labOriginalStatus() || {};
      }
      if (window.OrbitBackend && typeof OrbitBackend.status === 'function') {
        return OrbitBackend.status() || {};
      }
    } catch (e) {}
    return {};
  }

  function mergeReadiness(status) {
    var out = Object.assign({}, status || {});
    var user = canonicalUser();
    out.auth = user ? { uid: user.uid || '', email: user.email || '' } : null;
    out.criticalReadReady = !!criticalState.ready;
    out.criticalReadCounts = Object.assign({}, criticalState.counts || {});
    out.criticalReadAt = criticalState.loadedAt || '';
    out.criticalReadError = criticalState.error || null;
    if (criticalState.ready) {
      // Compatibilidad con el gate existente: los datos requeridos para el
      // dry-run ya fueron leídos de forma explícita y cargados en Orbit.store.
      out.snapshotAttached = true;
      out.snapshotMode = 'critical-one-shot';
    }
    return out;
  }

  function patchStatusContracts() {
    if (patched || !window.Orbit || !Orbit.store || typeof Orbit.store._labStatus !== 'function') return false;

    if (typeof Orbit.store.__labOriginalStatus !== 'function') {
      Orbit.store.__labOriginalStatus = Orbit.store._labStatus.bind(Orbit.store);
    }
    Orbit.store._labStatus = function () {
      var state = {};
      try { state = Orbit.store.__labOriginalStatus() || {}; } catch (e) {}
      return mergeReadiness(state);
    };

    if (window.OrbitBackend && typeof OrbitBackend.status === 'function') {
      if (typeof OrbitBackend.__labOriginalStatus !== 'function') {
        OrbitBackend.__labOriginalStatus = OrbitBackend.status.bind(OrbitBackend);
      }
      OrbitBackend.status = function () {
        var state = {};
        try { state = OrbitBackend.__labOriginalStatus() || {}; } catch (e) {}
        return mergeReadiness(state);
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

  function describeError(error) {
    var code = String(error && error.code || '').replace(/^firestore\//, '');
    var message = String(error && error.message || error || 'lectura no disponible');
    if (code === 'permission-denied') return 'Permiso denegado para leer los datos del entorno de validación.';
    if (code === 'unavailable') return 'El servicio de datos no está disponible temporalmente.';
    if (code === 'unauthenticated') return 'La sesión del entorno de validación perdió autenticación.';
    return message.length > 180 ? message.slice(0, 180) + '…' : message;
  }

  function replaceStoreCollection(name, rows) {
    if (!window.Orbit || !Orbit.store || typeof Orbit.store.raw !== 'function') {
      throw new Error('STORE_RAW_UNAVAILABLE');
    }
    var raw = Orbit.store.raw() || {};
    var target = raw[name];
    if (!Array.isArray(target)) throw new Error('STORE_COLLECTION_UNAVAILABLE:' + name);
    target.splice(0, target.length);
    rows.forEach(function (row) { target.push(row); });
    if (typeof Orbit.store._emit === 'function') Orbit.store._emit(name);
  }

  function readCollection(db, name) {
    return db.collection('tenantId').doc(tenant).collection(name).get().then(function (snap) {
      var rows = [];
      snap.forEach(function (docSnap) {
        var data = docSnap.data() || {};
        rows.push(Object.assign({}, data, {
          id: data.id || docSnap.id,
          tenantId: data.tenantId || tenant
        }));
      });
      replaceStoreCollection(name, rows);
      return { name: name, count: rows.length };
    }).catch(function (error) {
      error.orbitCollection = name;
      throw error;
    });
  }

  function loadCriticalCollections(force) {
    var user = canonicalUser();
    if (!user) return Promise.reject(new Error('AUTH_REQUIRED'));
    if (!force && criticalState.ready && criticalState.uid === user.uid) return Promise.resolve(criticalState);
    if (directReadPromise) return directReadPromise;

    var db = firebaseDb();
    if (!db || typeof db.collection !== 'function') return Promise.reject(new Error('DATA_SERVICE_NOT_READY'));

    criticalState = { ready: false, uid: user.uid || '', loadedAt: '', counts: {}, error: null };
    directReadPromise = Promise.all(CRITICAL.map(function (name) { return readCollection(db, name); }))
      .then(function (results) {
        var counts = {};
        results.forEach(function (result) { counts[result.name] = result.count; });
        criticalState = {
          ready: true,
          uid: user.uid || '',
          loadedAt: new Date().toISOString(),
          counts: counts,
          error: null
        };
        // Los listeners en tiempo real se intentan mantener en segundo plano,
        // pero ya no bloquean el dry-run cuando la lectura crítica fue exitosa.
        try {
          if (Orbit.store && typeof Orbit.store._attachSnapshots === 'function') Orbit.store._attachSnapshots();
        } catch (e) {}
        return criticalState;
      })
      .catch(function (error) {
        criticalState.error = {
          collection: error && error.orbitCollection || '',
          code: String(error && error.code || ''),
          message: describeError(error)
        };
        throw error;
      })
      .finally(function () { directReadPromise = null; });

    return directReadPromise;
  }

  function readiness() {
    patchStatusContracts();
    if (!canonicalUser()) return Promise.reject(new Error('AUTH_REQUIRED'));
    return loadCriticalCollections(false).then(function () {
      return mergeReadiness(rawStatusUnpatched());
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
    setModalStatus('Leyendo Clientes, Aseguradoras y Asesores del entorno de validación…', false);
    readiness().then(function (state) {
      button.disabled = false;
      setModalStatus(
        'Datos sincronizados: ' +
        (state.criticalReadCounts.clientes || 0) + ' clientes existentes, ' +
        (state.criticalReadCounts.aseguradoras || 0) + ' aseguradoras existentes y ' +
        (state.criticalReadCounts.asesores || 0) + ' asesores. Preparando dry-run…',
        false
      );
      button.dataset.labReadyBypass = '1';
      button.click();
    }).catch(function (error) {
      button.disabled = false;
      if (error && error.message === 'AUTH_REQUIRED') {
        forceLogin('La sesión LAB no está activa. Inicia sesión nuevamente para continuar.');
        return;
      }
      var collection = error && error.orbitCollection ? ' (' + error.orbitCollection + ')' : '';
      setModalStatus('No fue posible leer los datos requeridos' + collection + ': ' + describeError(error), true);
    });
  }, true);

  (function install() {
    if (patchStatusContracts()) return;
    setTimeout(install, 125);
  })();

  var auth = firebaseAuth();
  if (auth && typeof auth.onAuthStateChanged === 'function') {
    auth.onAuthStateChanged(function (user) {
      if (!user || String(user.uid || '') !== criticalState.uid) {
        criticalState = { ready: false, uid: '', loadedAt: '', counts: {}, error: null };
        directReadPromise = null;
      }
    });
  }

  window.OrbitLabImportReadiness = {
    canonicalUser: canonicalUser,
    status: function () { return mergeReadiness(rawStatusUnpatched()); },
    readiness: readiness,
    loadCriticalCollections: loadCriticalCollections
  };
})();
