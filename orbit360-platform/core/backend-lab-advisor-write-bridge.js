/* ============================================================
   Orbit 360 · Catálogo canónico de asesores para carga inicial LAB
   - Solo tenant alianzas-soluciones y adapter Firestore LAB explícito.
   - El dry-run usa configuración canónica en memoria y no escribe.
   - Antes de confirmar la carga verifica que los 7 asesores existan
     realmente en Firestore; si faltan, los sincroniza vía Orbit.store.
   - Los errores reales de escritura siguen siendo bloqueantes.
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && window.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (window.OrbitBackend.tenantId || window.OrbitBackend.tenant)) || '';
  var CONFIG_URL = 'data/tenant-config/alianzas-soluciones.asesores.json?v=20260715-6';
  var ready = false;
  var installing = false;
  var dryRunPhase = false;
  var bypassDry = false;
  var bypassWrite = false;
  var catalog = [];
  var byId = {};

  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones') return;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function currentUserId() {
    try {
      return window.firebase && firebase.auth && firebase.auth().currentUser
        ? firebase.auth().currentUser.uid
        : 'orbit-lab-user';
    } catch (error) {
      return 'orbit-lab-user';
    }
  }

  function statusElement(button) {
    var modal = button && button.closest('[data-ays-initial-modal]');
    return modal && modal.querySelector('[data-status]');
  }

  function setStatus(button, text, bad) {
    var element = statusElement(button);
    if (!element) return;
    element.textContent = text;
    element.style.borderColor = bad ? 'var(--danger,#C5162E)' : 'var(--line,#ddd)';
  }

  function validateConfig(config) {
    if (!config || config.schemaVersion !== 'orbit360.tenant-advisors.v1') throw new Error('Configuración de asesores inválida.');
    if (config.tenantId !== tenant) throw new Error('Tenant incorrecto en configuración de asesores.');
    if (!Array.isArray(config.advisors) || config.advisors.length !== 7) throw new Error('El catálogo debe contener siete asesores.');
    var ids = {};
    config.advisors.forEach(function (row) {
      if (!row || !row.id || !row.nombre || row.estado !== 'activo' || ids[row.id]) throw new Error('Registro de asesor inválido.');
      ids[row.id] = true;
    });
    return config;
  }

  function normalizedRow(row, config) {
    return {
      id: row.id,
      tenantId: tenant,
      nombre: row.nombre,
      name: row.nombre,
      displayName: row.nombre,
      aliases: Array.isArray(row.aliases) ? row.aliases.slice() : [],
      roles: Array.isArray(row.roles) ? row.roles.slice() : [],
      rol: row.rolDefault || 'Asesor',
      rolDefault: row.rolDefault || 'Asesor',
      scopeDatos: row.scopeDatos || 'propios',
      estado: 'activo',
      activo: true,
      configSource: 'configuracion_catalogo',
      configSchemaVersion: config.schemaVersion,
      configEffectiveDate: config.effectiveDate,
      accessProvisioned: false,
      labOnly: true,
      updatedBy: currentUserId()
    };
  }

  async function loadConfig() {
    var response = await fetch(CONFIG_URL, { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error('No fue posible leer la configuración de asesores.');
    var config = validateConfig(await response.json());
    catalog = config.advisors.map(function (row) { return normalizedRow(row, config); });
    byId = {};
    catalog.forEach(function (row) { byId[row.id] = row; });
  }

  function mergeRows(rows) {
    var merged = {};
    (rows || []).forEach(function (row) {
      if (row && row.id) merged[row.id] = row;
    });
    catalog.forEach(function (row) {
      merged[row.id] = Object.assign({}, row, merged[row.id] || {});
    });
    return Object.keys(merged).map(function (id) { return merged[id]; });
  }

  function rawStatus(store) {
    try { return store && store._labStatus ? store._labStatus() : {}; }
    catch (error) { return {}; }
  }

  function waitWrites(store, ids) {
    var expected = {};
    ids.forEach(function (id) { expected[id] = true; });
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      (function tick() {
        var state = rawStatus(store);
        var queue = Array.isArray(state.writeQueue) ? state.writeQueue : [];
        var errors = Array.isArray(state.writeErrors) ? state.writeErrors : [];
        var failed = errors.filter(function (item) {
          return item && item.collection === 'asesores' && expected[item.id];
        });
        if (failed.length) return reject(new Error(String(failed[0].error || 'escritura de asesor rechazada').slice(0, 180)));
        var pending = queue.filter(function (item) {
          return item && item.collection === 'asesores' && expected[item.id] && item.status === 'pending';
        });
        if (!pending.length) return resolve();
        if (Date.now() - started > 45000) return reject(new Error('Tiempo agotado al sincronizar asesores. Pendientes: ' + pending.length + '.'));
        setTimeout(tick, 250);
      })();
    });
  }

  async function readPersistedIds() {
    var db = window.firebase && typeof firebase.firestore === 'function' ? firebase.firestore() : null;
    if (!db) throw new Error('Firestore LAB no está disponible.');
    var snapshot = await db.collection('tenantId').doc(tenant).collection('asesores').get();
    var ids = {};
    snapshot.forEach(function (doc) {
      var data = doc.data() || {};
      ids[data.id || doc.id] = true;
    });
    return ids;
  }

  async function persistAndVerify(store, writeReal) {
    var ids = catalog.map(function (row) { return row.id; });
    var persisted = await readPersistedIds();
    var missing = ids.filter(function (id) { return !persisted[id]; });
    if (missing.length) {
      catalog.forEach(function (row) {
        if (!persisted[row.id]) writeReal('asesores', row.id, clone(row));
      });
      await waitWrites(store, missing);
    }
    var verified = await readPersistedIds();
    var stillMissing = ids.filter(function (id) { return !verified[id]; });
    if (stillMissing.length) throw new Error('Firestore no confirmó ' + stillMissing.length + ' asesores del catálogo.');
    return true;
  }

  async function install() {
    if (ready || installing) return;
    var store = window.Orbit && Orbit.store;
    if (!store || store.__firestoreLabExplicit !== true || typeof store.all !== 'function' || typeof store.get !== 'function' || typeof store.update !== 'function') {
      setTimeout(install, 100);
      return;
    }
    installing = true;
    try {
      await loadConfig();
      var originalAll = store.all.bind(store);
      var originalGet = store.get.bind(store);
      var originalUpdate = store.update.bind(store);

      store.all = function (collection) {
        var rows = originalAll(collection);
        return collection === 'asesores' ? mergeRows(rows) : rows;
      };

      store.get = function (collection, id) {
        var row = originalGet(collection, id);
        if (collection === 'asesores' && byId[id]) return Object.assign({}, byId[id], row || {});
        return row;
      };

      store.update = function (collection, id, patch) {
        if (dryRunPhase && (collection === 'asesores' || collection === 'configuracion_catalogo')) {
          if (collection === 'asesores' && byId[id]) return Object.assign({}, byId[id], patch || {});
          return Object.assign({ id: id, tenantId: tenant }, patch || {});
        }
        return originalUpdate(collection, id, patch);
      };

      store.__advisorWriteBridgeInstalled = true;
      window.OrbitLabAdvisorWriteBridge = {
        ready: true,
        storeSource: 'firestore-lab-explicit',
        advisorCount: catalog.length,
        persistAndVerify: function () { return persistAndVerify(store, originalUpdate); },
        status: function () {
          return {
            ready: ready,
            advisorCount: catalog.length,
            dryRunReadOnly: dryRunPhase,
            installedOnFirestoreLab: store.__firestoreLabExplicit === true
          };
        }
      };
      ready = true;
    } catch (error) {
      installing = false;
      window.OrbitLabAdvisorWriteBridge = { ready: false, error: String(error && error.message || error) };
      setTimeout(install, 1000);
    }
  }

  document.addEventListener('click', function (event) {
    var dryButton = event.target && event.target.closest && event.target.closest('[data-ays-initial-modal] [data-dry]');
    if (dryButton && !bypassDry) {
      event.preventDefault();
      event.stopImmediatePropagation();
      dryButton.disabled = true;
      setStatus(dryButton, 'Preparando dry-run de solo lectura…', false);
      (async function () {
        var started = Date.now();
        while (!ready && Date.now() - started < 15000) {
          await new Promise(function (resolve) { setTimeout(resolve, 100); });
        }
        if (!ready) throw new Error('No fue posible preparar el catálogo de asesores.');
        bypassDry = true;
        dryRunPhase = true;
        dryButton.disabled = false;
        try {
          await Promise.resolve(dryButton.onclick());
        } finally {
          dryRunPhase = false;
          bypassDry = false;
        }
      })().catch(function (error) {
        dryRunPhase = false;
        bypassDry = false;
        setStatus(dryButton, 'Dry-run no disponible: ' + error.message, true);
        dryButton.disabled = false;
      });
      return;
    }

    var writeButton = event.target && event.target.closest && event.target.closest('[data-ays-initial-modal] [data-write]');
    if (!writeButton || bypassWrite) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    writeButton.disabled = true;
    setStatus(writeButton, 'Verificando catálogo de asesores en Firestore…', false);
    (async function () {
      if (!ready || !window.OrbitLabAdvisorWriteBridge) throw new Error('Catálogo de asesores no disponible.');
      await window.OrbitLabAdvisorWriteBridge.persistAndVerify();
      bypassWrite = true;
      try {
        await Promise.resolve(writeButton.onclick());
      } finally {
        bypassWrite = false;
      }
    })().catch(function (error) {
      bypassWrite = false;
      setStatus(writeButton, 'Carga bloqueada: ' + String(error && error.message || error), true);
      writeButton.disabled = false;
    });
  }, true);

  install();
})();
