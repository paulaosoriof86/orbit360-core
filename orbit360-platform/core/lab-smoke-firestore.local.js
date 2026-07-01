/* ============================================================
   Orbit 360 - Firestore LAB Smoke automatico
   Uso: solo index-dev-firestore.html con orbitBackend=firestore-lab.
   No escribe en Firestore. No usa secretos. No muestra UI productiva.
   Ejecuta lectura de seed lab_ solo cuando exista Firebase Auth LAB.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  var EXPECTED_TENANT = 'alianzas-soluciones';
  var EXPECTED_EMAIL = 'orbit.lab@demo.com';
  var FALLBACK_DOCS = [
    { collection: 'clientes', id: 'lab_cliente_logistica_gt' },
    { collection: 'clientes', id: 'lab_cliente_familia_co' },
    { collection: 'asesores', id: 'lab_asesor_paula' },
    { collection: 'asesores', id: 'lab_asesor_diego' },
    { collection: 'aseguradoras', id: 'lab_aseg_atlas_gt' },
    { collection: 'aseguradoras', id: 'lab_aseg_andina_co' },
    { collection: 'vehiculos', id: 'lab_vehiculo_gt_001' },
    { collection: 'polizas', id: 'lab_poliza_auto_gt' },
    { collection: 'polizas', id: 'lab_poliza_hogar_co' },
    { collection: 'cobros', id: 'lab_cobro_auto_gt_001' },
    { collection: 'cobros', id: 'lab_cobro_hogar_co_001' },
    { collection: 'finmovs', id: 'lab_finmov_gt_001' },
    { collection: 'comisiones', id: 'lab_comision_gt_001' },
    { collection: 'reclamos', id: 'lab_reclamo_gt_001' },
    { collection: 'negocios', id: 'lab_negocio_gt_001' },
    { collection: 'gestiones', id: 'lab_gestion_gt_001' },
    { collection: 'actividades', id: 'lab_actividad_gt_001' },
    { collection: 'metas', id: 'lab_meta_gt_202607' }
  ];

  var state = {
    installedAt: new Date().toISOString(),
    ran: false,
    running: false,
    lastResult: null,
    lastReason: null
  };

  function params() {
    try { return new URLSearchParams(window.location.search || ''); } catch (e) { return new URLSearchParams(''); }
  }

  function isLabMode() {
    var p = params();
    var mode = p.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
    var tenant = p.get('tenant') || (window.OrbitBackend && window.OrbitBackend.tenantId) || '';
    return mode === 'firestore-lab' && tenant === EXPECTED_TENANT;
  }

  function log() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[Orbit LAB Smoke]');
      console.log.apply(console, args);
    } catch (e) {}
  }

  function warn() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[Orbit LAB Smoke]');
      console.warn.apply(console, args);
    } catch (e) {}
  }

  function firebaseUser() {
    try {
      if (window.firebase && firebase.auth) return firebase.auth().currentUser || null;
    } catch (e) {}
    return null;
  }

  function apiStatus() {
    var store = window.Orbit && window.Orbit.store;
    var required = ['all', 'get', 'where', 'insert', 'update', 'remove', '_emit'];
    return {
      ok: required.every(function (name) { return store && typeof store[name] === 'function'; }),
      missing: required.filter(function (name) { return !store || typeof store[name] !== 'function'; }),
      keys: store ? Object.keys(store).sort() : []
    };
  }

  async function loadExpectedDocs() {
    try {
      var res = await fetch('docs/SEED-FICTICIO-FIRESTORE-LAB.json?ts=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return FALLBACK_DOCS.slice();
      var json = await res.json();
      var root = json.collections || json.data || json;
      var docs = [];

      if (Array.isArray(root.documents)) {
        root.documents.forEach(function (d) {
          if (d.collection && d.id) docs.push({ collection: String(d.collection), id: String(d.id) });
          if (d.path && typeof d.path === 'string') {
            var parts = d.path.split('/').filter(Boolean);
            if (parts.length >= 2) docs.push({ collection: parts[parts.length - 2], id: parts[parts.length - 1] });
          }
        });
      }

      Object.keys(root).forEach(function (k) {
        if (Array.isArray(root[k])) {
          root[k].forEach(function (row) {
            if (row && row.id) docs.push({ collection: String(k), id: String(row.id) });
          });
        }
      });

      var seen = {};
      var unique = [];
      docs.forEach(function (d) {
        var key = d.collection + '/' + d.id;
        if (!seen[key]) {
          seen[key] = true;
          unique.push(d);
        }
      });

      return unique.length ? unique : FALLBACK_DOCS.slice();
    } catch (e) {
      return FALLBACK_DOCS.slice();
    }
  }

  async function snapshotCollections(expectedDocs) {
    var store = window.Orbit.store;
    var map = {};
    expectedDocs.forEach(function (d) { map[d.collection] = true; });

    var result = {};
    var collections = Object.keys(map);

    for (var i = 0; i < collections.length; i++) {
      var col = collections[i];
      try {
        var rows = await Promise.resolve(store.all(col));
        var safeRows = Array.isArray(rows) ? rows : [];
        result[col] = {
          count: safeRows.length,
          sampleIds: safeRows.slice(0, 10).map(function (x) { return x && x.id; }).filter(Boolean)
        };
      } catch (e) {
        result[col] = { error: e && e.message ? e.message : String(e) };
      }
    }

    return result;
  }

  async function findMissingDocs(expectedDocs) {
    var store = window.Orbit.store;
    var missing = [];

    for (var i = 0; i < expectedDocs.length; i++) {
      var d = expectedDocs[i];
      var found = null;
      try { found = await Promise.resolve(store.get(d.collection, d.id)); } catch (e) {}
      if (!found) missing.push(d);
    }

    return missing;
  }

  async function runLabSmoke(reason) {
    if (!isLabMode()) {
      state.lastReason = 'not-lab-mode';
      return { ok: false, skipped: true, reason: 'not-lab-mode' };
    }

    if (state.running) {
      return { ok: false, skipped: true, reason: 'already-running' };
    }

    var user = firebaseUser();
    var api = apiStatus();

    if (!user) {
      state.lastReason = 'auth-required';
      var authRequired = { ok: false, skipped: true, reason: 'auth-required', expectedEmail: EXPECTED_EMAIL, api: api };
      state.lastResult = authRequired;
      warn('Pendiente de Firebase Auth LAB. Smoke no ejecutado.', authRequired);
      return authRequired;
    }

    if (!api.ok) {
      state.lastReason = 'api-incomplete';
      var apiResult = { ok: false, skipped: true, reason: 'api-incomplete', api: api };
      state.lastResult = apiResult;
      warn('Orbit.store API incompleta. Smoke no ejecutado.', apiResult);
      return apiResult;
    }

    state.running = true;

    try {
      var expected = await loadExpectedDocs();
      var collections = await snapshotCollections(expected);
      var missing = await findMissingDocs(expected);

      var result = {
        ok: missing.length === 0,
        skipped: false,
        reason: reason || 'manual-or-auto',
        createdAt: new Date().toISOString(),
        auth: { uid: user.uid, email: user.email || '' },
        tenantId: EXPECTED_TENANT,
        expectedDocs: expected.length,
        missingDocs: missing,
        collections: collections,
        api: api,
        backend: window.OrbitBackend || null
      };

      state.ran = true;
      state.lastResult = result;
      state.lastReason = result.ok ? 'ok' : 'missing-docs';

      if (result.ok) log('OK. Seed LAB visible desde Orbit.store.', result);
      else warn('FALLA. Seed LAB no visible completo desde Orbit.store.', result);

      try {
        window.dispatchEvent(new CustomEvent('orbit:lab-smoke:done', { detail: result }));
      } catch (e) {}

      return result;
    } finally {
      state.running = false;
    }
  }

  function scheduleAutoSmoke() {
    if (!isLabMode()) return;

    var attempts = 0;
    var maxAttempts = 240;

    var timer = setInterval(function () {
      attempts += 1;

      if (state.ran || state.running) {
        clearInterval(timer);
        return;
      }

      var user = firebaseUser();
      var api = apiStatus();

      if (user && api.ok) {
        clearInterval(timer);
        runLabSmoke('auto-auth-ready');
        return;
      }

      if (attempts === 1 || attempts % 30 === 0) {
        log('Esperando Auth LAB + Orbit.store API completa.', { attempts: attempts, hasUser: !!user, api: api });
      }

      if (attempts >= maxAttempts) {
        clearInterval(timer);
        state.lastReason = 'timeout-auth-or-api';
        warn('Timeout esperando Auth LAB + API completa. No se ejecuta smoke.', { api: api, hasUser: !!user });
      }
    }, 1000);
  }

  window.Orbit.__labSmoke = state;
  window.Orbit.runLabSmoke = runLabSmoke;

  if (isLabMode()) {
    log('Smoke instalado. Se ejecutara automaticamente cuando exista Firebase Auth LAB.');
    scheduleAutoSmoke();
  }
})();
