/* Orbit 360 · Catálogo controlado de asesores para A&S LAB */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (window.OrbitBackend.tenantId || window.OrbitBackend.tenant)) || '';
  var CONFIG_URL = 'data/tenant-config/alianzas-soluciones.asesores.json?v=20260715-1';
  var expectedEmail = String((window.OrbitBackend && window.OrbitBackend.expectedEmail) || 'orbit.lab@demo.com').toLowerCase();
  var running = null;
  var state = { ready: false, count: 0, error: null, syncedAt: '' };

  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones') return;

  function normalize(value) {
    return String(value == null ? '' : value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function canonicalUser() {
    try {
      var auth = window.firebase && typeof window.firebase.auth === 'function' ? window.firebase.auth() : null;
      var user = auth && auth.currentUser ? auth.currentUser : null;
      if (!user || String(user.email || '').toLowerCase() !== expectedEmail) return null;
      return user;
    } catch (e) { return null; }
  }

  function waitForSync(collection, ids) {
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      (function check() {
        var failed = [];
        var pending = [];
        ids.forEach(function (id) {
          var row = Orbit.store.get(collection, id);
          if (row && row._syncStatus === 'failed') failed.push(id);
          else if (!row || row._syncStatus !== 'synced') pending.push(id);
        });
        if (failed.length) return reject(new Error('CATALOGO_ASESORES_ESCRITURA_FALLIDA:' + failed.length));
        if (!pending.length) return resolve();
        if (Date.now() - started > 30000) return reject(new Error('CATALOGO_ASESORES_TIMEOUT:' + pending.length));
        setTimeout(check, 300);
      })();
    });
  }

  function validateConfig(config) {
    if (!config || config.schemaVersion !== 'orbit360.tenant-advisors.v1') throw new Error('CATALOGO_ASESORES_SCHEMA');
    if (config.tenantId !== tenant) throw new Error('CATALOGO_ASESORES_TENANT');
    if (!Array.isArray(config.advisors) || config.advisors.length !== 7) throw new Error('CATALOGO_ASESORES_CONTEO');
    var ids = {};
    var names = {};
    config.advisors.forEach(function (row) {
      var id = String(row && row.id || '').trim();
      var name = String(row && row.nombre || '').trim();
      if (!id || !name || row.estado !== 'activo') throw new Error('CATALOGO_ASESORES_REGISTRO');
      if (ids[id] || names[normalize(name)]) throw new Error('CATALOGO_ASESORES_DUPLICADO');
      ids[id] = true;
      names[normalize(name)] = true;
    });
    return config;
  }

  function identityPatch(row, user) {
    return {
      id: row.id,
      tenantId: tenant,
      nombre: row.nombre,
      name: row.nombre,
      displayName: row.nombre,
      aliases: Array.isArray(row.aliases) ? row.aliases : [],
      estado: 'activo',
      activo: true,
      configSource: 'configuracion_catalogo',
      configSchemaVersion: 'orbit360.tenant-advisors.v1',
      configEffectiveDate: '2026-07-15',
      accessProvisioned: false,
      labOnly: true,
      updatedBy: user.uid || 'orbit-lab-user'
    };
  }

  async function ensure(force) {
    if (!force && state.ready) return state;
    if (running) return running;
    running = (async function () {
      var user = canonicalUser();
      if (!user) throw new Error('AUTH_REQUIRED');
      if (!window.Orbit || !Orbit.store || typeof Orbit.store.update !== 'function') throw new Error('STORE_NOT_READY');

      var response = await fetch(CONFIG_URL, { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error('CATALOGO_ASESORES_CONFIG_HTTP_' + response.status);
      var config = validateConfig(await response.json());
      var ids = [];

      config.advisors.forEach(function (row) {
        Orbit.store.update('asesores', row.id, identityPatch(row, user));
        ids.push(row.id);
      });
      Orbit.store.update('configuracion_catalogo', 'asesores-activos', {
        id: 'asesores-activos',
        tenantId: tenant,
        schemaVersion: config.schemaVersion,
        source: config.source,
        effectiveDate: config.effectiveDate,
        advisorIds: ids.slice(),
        advisorCount: ids.length,
        status: 'active',
        labOnly: true,
        updatedBy: user.uid || 'orbit-lab-user'
      });

      await waitForSync('asesores', ids);
      state = { ready: true, count: ids.length, error: null, syncedAt: new Date().toISOString() };
      try {
        if (window.OrbitLabImportReadiness && typeof OrbitLabImportReadiness.loadCriticalCollections === 'function') {
          await OrbitLabImportReadiness.loadCriticalCollections(true);
        }
      } catch (e) {}
      return state;
    })().catch(function (error) {
      state = { ready: false, count: 0, error: String(error && (error.message || error) || error), syncedAt: '' };
      throw error;
    }).finally(function () { running = null; });
    return running;
  }

  function install() {
    if (!window.Orbit || !Orbit.store) return setTimeout(install, 125);
    var auth = null;
    try { auth = window.firebase && typeof window.firebase.auth === 'function' ? window.firebase.auth() : null; } catch (e) {}
    if (auth && typeof auth.onAuthStateChanged === 'function') {
      auth.onAuthStateChanged(function (user) {
        if (user && String(user.email || '').toLowerCase() === expectedEmail) ensure(false).catch(function () {});
        else state = { ready: false, count: 0, error: null, syncedAt: '' };
      });
    }
  }

  window.OrbitLabAdvisorCatalog = { ensure: ensure, status: function () { return Object.assign({}, state); } };
  install();
})();
