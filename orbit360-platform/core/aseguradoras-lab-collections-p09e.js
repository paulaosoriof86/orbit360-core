/* ============================================================
   Orbit 360 · P0.9e · Colecciones profundas Aseguradoras en Firestore LAB
   Fecha: 2026-07-10

   Extensión aditiva del store LAB. No reemplaza data/store.js ni
   data/store-firestore-lab.local.js. Solo añade lectura/snapshots para las
   colecciones de conocimiento que no forman parte del listado histórico.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var COLLECTIONS = [
    'aseguradora_manifiestos',
    'aseguradora_propuestas',
    'aseguradora_reglas_tarifarias',
    'aseguradora_presentaciones',
    'aseguradora_bindings',
    'aseguradora_revisiones'
  ];
  var state = {
    version: 'p09e-v1', installed: false, installing: false,
    mode: '', tenantId: '', snapshotAttached: false,
    snapshotAttachedCount: 0, snapshotErrors: {}, cache: {}, unsubscribers: []
  };
  COLLECTIONS.forEach(function (name) { state.cache[name] = []; });

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (error) { return value; }
  }
  function rowId(row) { return row && (row.id || row.uid || row.codigo || row.key); }
  function backend() { return window.OrbitBackend || window.ORBIT_BACKEND || {}; }
  function store() { return window.Orbit && window.Orbit.store; }
  function isManaged(collection) { return COLLECTIONS.indexOf(clean(collection)) >= 0; }
  function emit(collection) {
    try {
      if (store() && typeof store()._emit === 'function') store()._emit(collection);
      window.dispatchEvent(new CustomEvent('orbit:aseguradoras:lab-snapshot', {
        detail: { collection: collection, tenantId: state.tenantId, version: state.version }
      }));
    } catch (error) {}
  }
  function database() {
    try {
      if (window.firebase && typeof window.firebase.firestore === 'function') return window.firebase.firestore();
    } catch (error) {}
    try { if (window.db) return window.db; } catch (error) {}
    return null;
  }
  function collectionRef(collection) {
    var db = database();
    if (!db) return null;
    try {
      if (db.collection && db.doc) return db.collection('tenantId').doc(state.tenantId).collection(collection);
    } catch (error) {}
    return null;
  }
  function snapshotRows(snapshot) {
    var rows = [];
    try {
      snapshot.forEach(function (doc) {
        var row = Object.assign({}, doc.data() || {});
        if (!row.id) row.id = doc.id;
        if (!row.tenantId) row.tenantId = state.tenantId;
        rows.push(row);
      });
    } catch (error) {}
    return rows;
  }
  function patchReads() {
    var s = store();
    if (!s || s.__aseguradorasKnowledgeCollectionsP09e) return;
    var original = {
      all: s.all, get: s.get, where: s.where, find: s.find, raw: s.raw
    };
    s.all = function (collection) {
      if (isManaged(collection)) return state.cache[collection] || [];
      return original.all.call(s, collection);
    };
    s.get = function (collection, id) {
      if (isManaged(collection)) return (state.cache[collection] || []).find(function (row) { return rowId(row) === id; }) || null;
      return original.get.call(s, collection, id);
    };
    s.where = function (collection, fieldOrPredicate, opOrValue, maybeValue) {
      if (!isManaged(collection)) return original.where.apply(s, arguments);
      var rows = state.cache[collection] || [];
      if (typeof fieldOrPredicate === 'function') return rows.filter(function (row) { try { return !!fieldOrPredicate(row); } catch (error) { return false; } });
      if (fieldOrPredicate && typeof fieldOrPredicate === 'object') return rows.filter(function (row) {
        return Object.keys(fieldOrPredicate).every(function (key) { return row && row[key] === fieldOrPredicate[key]; });
      });
      var field = fieldOrPredicate;
      var op = arguments.length >= 4 ? opOrValue : '==';
      var value = arguments.length >= 4 ? maybeValue : opOrValue;
      return rows.filter(function (row) {
        if (!row) return false;
        if (op === '!=' ) return row[field] !== value;
        if (op === '>') return row[field] > value;
        if (op === '>=') return row[field] >= value;
        if (op === '<') return row[field] < value;
        if (op === '<=') return row[field] <= value;
        if (op === 'array-contains') return Array.isArray(row[field]) && row[field].indexOf(value) >= 0;
        return row[field] === value;
      });
    };
    s.find = function (collection, predicate) {
      if (!isManaged(collection)) return original.find.call(s, collection, predicate);
      if (typeof predicate === 'function') return (state.cache[collection] || []).find(predicate) || null;
      if (predicate && typeof predicate === 'object') return s.where(collection, predicate)[0] || null;
      return null;
    };
    if (typeof original.raw === 'function') {
      s.raw = function () {
        var out = original.raw.call(s) || {};
        COLLECTIONS.forEach(function (collection) { out[collection] = clone(state.cache[collection] || []); });
        out.__aseguradorasKnowledgeLab = status();
        return out;
      };
    }
    s.__aseguradorasKnowledgeCollectionsP09e = true;
  }
  function attach(collection) {
    var ref = collectionRef(collection);
    if (!ref || typeof ref.onSnapshot !== 'function') {
      state.snapshotErrors[collection] = 'firestore-reference-not-ready';
      return false;
    }
    try {
      var unsubscribe = ref.onSnapshot(function (snapshot) {
        state.cache[collection] = snapshotRows(snapshot);
        emit(collection);
      }, function (error) {
        state.snapshotErrors[collection] = clean(error && (error.message || error));
      });
      state.unsubscribers.push(unsubscribe);
      state.snapshotAttachedCount += 1;
      return true;
    } catch (error) {
      state.snapshotErrors[collection] = clean(error && (error.message || error));
      return false;
    }
  }
  function preflight() {
    var b = backend(), s = store(), errors = [];
    var mode = clean(b.mode), tenant = clean(b.tenantId || b.tenant);
    if (mode !== 'firestore-lab') errors.push('FIRESTORE_LAB_REQUIRED');
    if (tenant !== 'alianzas-soluciones') errors.push('LAB_TENANT_NOT_ALLOWED');
    if (!s || s.__firestoreLabExplicit !== true) errors.push('EXPLICIT_LAB_STORE_REQUIRED');
    if (!database()) errors.push('FIRESTORE_NOT_READY');
    return { ok: errors.length === 0, errors: errors, mode: mode, tenantId: tenant };
  }
  function install() {
    if (state.installed || state.installing) return status();
    var check = preflight();
    if (!check.ok) return Object.assign(status(), { errors: check.errors });
    state.installing = true;
    state.mode = check.mode;
    state.tenantId = check.tenantId;
    patchReads();
    state.snapshotAttachedCount = 0;
    state.snapshotErrors = {};
    COLLECTIONS.forEach(attach);
    state.snapshotAttached = state.snapshotAttachedCount === COLLECTIONS.length;
    state.installed = state.snapshotAttached;
    state.installing = false;
    window.OrbitBackend = Object.assign({}, backend(), {
      aseguradorasKnowledgeCollectionsP09e: status()
    });
    return status();
  }
  function detach() {
    state.unsubscribers.splice(0).forEach(function (unsubscribe) {
      try { if (typeof unsubscribe === 'function') unsubscribe(); } catch (error) {}
    });
    state.snapshotAttached = false;
    state.snapshotAttachedCount = 0;
    state.installed = false;
    return status();
  }
  function status() {
    return {
      version: state.version,
      installed: state.installed,
      mode: state.mode,
      tenantId: state.tenantId,
      collections: COLLECTIONS.slice(),
      snapshotAttached: state.snapshotAttached,
      snapshotAttachedCount: state.snapshotAttachedCount,
      snapshotErrors: clone(state.snapshotErrors),
      containsSecrets: false,
      writesDirectly: false
    };
  }

  Orbit.aseguradorasLabCollectionsP09e = {
    COLLECTIONS: COLLECTIONS.slice(), preflight: preflight,
    install: install, detach: detach, status: status
  };

  setTimeout(install, 0);
  setTimeout(install, 1200);
  setTimeout(install, 3500);
})();