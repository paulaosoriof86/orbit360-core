/* ============================================================
   Orbit 360 - Store Firestore LAB v1.74
   Backend-only hook for index.html when ?orbitBackend=firestore-lab.
   No modules touched. No seed/localStorage fallback as source of truth.
   API contract:
   all, get, where, find, insert, update, remove, on, _emit,
   pref, setPref, init, reseed, raw.
   ============================================================ */
(function(){
  'use strict';

  var w = window;
  w.Orbit = w.Orbit || {};

  var params = new URLSearchParams(w.location.search || '');
  var mode = params.get('orbitBackend') || (w.OrbitBackend && w.OrbitBackend.mode) || '';
  var tenantId = params.get('tenant') || (w.OrbitBackend && (w.OrbitBackend.tenantId || w.OrbitBackend.tenant)) || 'alianzas-soluciones';

  if (mode !== 'firestore-lab' || tenantId !== 'alianzas-soluciones') return;

  var COLLECTIONS = [
    'clientes','polizas','cobros','comisiones','reclamos','gestiones','negocios','finmovs',
    'contenidos','cursos','aseguradoras','asesores','vehiculos','acreedores','facturas',
    'documentos','actividades','metas','presupuesto','plantillas','reportes_prog','notifs',
    'avisos','correos','cancelaciones','novedades','tareas'
  ];

  var EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
  var EXPECTED_EMAIL = 'orbit.lab@demo.com';

  var cache = {};
  var prefs = {};
  var listeners = [];
  var unsubscribers = [];
  var attachStarted = false;
  var attachCompleted = false;

  COLLECTIONS.forEach(function(name){ cache[name] = []; });

  var state = {
    mode: 'firestore-lab',
    tenantId: tenantId,
    tenant: tenantId,
    expectedUid: EXPECTED_UID,
    expectedEmail: EXPECTED_EMAIL,
    apiVersion: 'v1.74-firestore-lab-write-status',
    source: 'data/store-firestore-lab.local.js',
    ready: true,
    status: 'booting',
    lastError: null,
    lastExtra: null,
    lastWriteAt: null,
    lastWriteOkAt: null,
    lastWriteErrorAt: null,
    writeQueue: [],
    writeErrors: [],
    collections: COLLECTIONS.slice(),
    collectionPaths: {},
    snapshotAttached: false,
    snapshotAttachedCount: 0,
    snapshotErrors: {},
    auth: null,
    noFallback: true,
    cache: cache
  };

  function log(){
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[Orbit Firestore LAB v1.74]');
      console.log.apply(console, args);
    } catch(e) {}
  }

  function setError(message, extra){
    state.lastError = message || 'unknown';
    if (extra) state.lastExtra = String(extra && (extra.message || extra) || extra);
    try { console.warn('[Orbit Firestore LAB v1.74]', message, extra || ''); } catch(e) {}
  }

  function emitBackendEvent(name, detail){
    try {
      w.dispatchEvent(new CustomEvent(name, {
        detail: Object.assign({ mode: mode, tenantId: tenantId }, detail || {})
      }));
    } catch(e) {}
  }

  function writeKey(collection, id, op){
    return [collection || '_', id || '_', op || '_'].join('::');
  }

  function markRowSync(collection, id, patch){
    if (!collection || !id) return;
    var row = get(collection, id);
    if (!row || typeof row !== 'object') return;
    Object.keys(patch || {}).forEach(function(k){
      if (patch[k] === undefined) delete row[k];
      else row[k] = patch[k];
    });
    emit(collection);
  }

  function markPending(collection, id, op){
    var now = new Date().toISOString();
    var key = writeKey(collection, id, op);
    state.lastWriteAt = now;
    state.writeQueue = state.writeQueue.filter(function(item){ return item.key !== key; });
    state.writeQueue.push({ key: key, collection: collection, id: id, op: op, status: 'pending', at: now });
    markRowSync(collection, id, { _syncStatus: 'pending', _syncOp: op, _syncError: undefined, _syncAt: now });
    emitBackendEvent('orbit:backend:write-pending', { collection: collection, id: id, op: op, at: now });
  }

  function markSynced(collection, id, op){
    var now = new Date().toISOString();
    var key = writeKey(collection, id, op);
    state.lastWriteOkAt = now;
    state.writeQueue = state.writeQueue.filter(function(item){ return item.key !== key; });
    markRowSync(collection, id, { _syncStatus: 'synced', _syncOp: op, _syncError: undefined, _syncAt: now });
    emitBackendEvent('orbit:backend:write-ok', { collection: collection, id: id, op: op, at: now });
  }

  function markWriteFailed(collection, id, op, error){
    var now = new Date().toISOString();
    var key = writeKey(collection, id, op);
    var message = String(error && (error.message || error) || error || 'unknown');
    state.lastWriteErrorAt = now;
    state.writeQueue = state.writeQueue.filter(function(item){ return item.key !== key; });
    state.writeErrors.push({ key: key, collection: collection, id: id, op: op, status: 'failed', at: now, error: message });
    if (state.writeErrors.length > 100) state.writeErrors = state.writeErrors.slice(-100);
    markRowSync(collection, id, { _syncStatus: 'failed', _syncOp: op, _syncError: message, _syncAt: now });
    setError(op + ' failed: ' + collection, error);
    emitBackendEvent('orbit:backend:write-error', { collection: collection, id: id, op: op, at: now, error: message });
  }

  function cleanForWrite(row){
    var out = clone(row) || {};
    delete out._syncStatus;
    delete out._syncOp;
    delete out._syncError;
    delete out._syncAt;
    return out;
  }

  function db(){
    try {
      if (w.firebase && typeof w.firebase.firestore === 'function') return w.firebase.firestore();
    } catch(e) {}
    try {
      if (w.db) return w.db;
    } catch(e) {}
    return null;
  }

  function authUser(){
    try {
      if (w.firebase && typeof w.firebase.auth === 'function') {
        return w.firebase.auth().currentUser || null;
      }
    } catch(e) {}
    try {
      if (w.auth && w.auth.currentUser) return w.auth.currentUser;
    } catch(e) {}
    return null;
  }

  function updateAuthState(){
    var u = authUser();
    state.auth = u ? { uid: u.uid || '', email: u.email || '' } : null;
    return u;
  }

  function canonicalCollectionPath(collection){
    return 'tenantId/' + tenantId + '/' + collection;
  }

  function collectionRef(collection){
    var database = db();
    if (!database) return null;

    try {
      if (database.collection && database.doc) {
        return database.collection('tenantId').doc(tenantId).collection(collection);
      }
    } catch(e) {}

    try {
      if (typeof w.collection === 'function') {
        return w.collection(database, 'tenantId', tenantId, collection);
      }
    } catch(e) {}

    return null;
  }

  function prefsDocRef(){
    var database = db();
    if (!database) return null;

    try {
      if (database.collection && database.doc) {
        return database.collection('tenantId').doc(tenantId).collection('_prefs').doc('orbit360');
      }
    } catch(e) {}

    try {
      if (typeof w.doc === 'function') {
        return w.doc(database, 'tenantId', tenantId, '_prefs', 'orbit360');
      }
    } catch(e) {}

    return null;
  }

  function normalize(row, id){
    var out = {};
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(function(k){ out[k] = row[k]; });
    }
    if (!out.id && id) out.id = id;
    if (!out.tenantId) out.tenantId = tenantId;
    return out;
  }

  function rowId(row){
    return row && (row.id || row.uid || row.codigo || row.numero || row.poliza || row.key);
  }

  function clone(row){
    if (!row || typeof row !== 'object') return row;
    try { return JSON.parse(JSON.stringify(row)); } catch(e) { return Object.assign({}, row); }
  }

  function ensure(collection){
    if (!cache[collection]) cache[collection] = [];
    return cache[collection];
  }

  function emit(collection){
    var changed = collection || '*';

    listeners.slice().forEach(function(listener){
      try { listener(changed); } catch(e) {}
    });

    try {
      w.dispatchEvent(new CustomEvent('orbit:store:emit', {
        detail: { collection: changed, mode: mode, tenantId: tenantId }
      }));
    } catch(e) {}
  }

  function upsertCache(collection, row){
    var rows = ensure(collection);
    var id = rowId(row);
    var idx = rows.findIndex(function(r){ return rowId(r) === id; });
    if (idx >= 0) rows[idx] = row;
    else rows.push(row);
    emit(collection);
  }

  function removeCache(collection, id){
    var rows = ensure(collection);
    var before = rows.length;
    cache[collection] = rows.filter(function(row){ return rowId(row) !== id; });
    if (cache[collection].length !== before) emit(collection);
  }

  function safeId(collection){
    try {
      var ref = collectionRef(collection);
      if (ref && typeof ref.doc === 'function') return ref.doc().id;
    } catch(e) {}
    return collection + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function all(collection){
    return ensure(collection);
  }

  function get(collection, id){
    return all(collection).find(function(row){ return rowId(row) === id; }) || null;
  }

  function where(collection, fieldOrPredicate, opOrValue, maybeValue){
    var rows = all(collection);

    if (typeof fieldOrPredicate === 'function') {
      return rows.filter(function(row){
        try { return !!fieldOrPredicate(row); } catch(e) { return false; }
      });
    }

    if (fieldOrPredicate && typeof fieldOrPredicate === 'object') {
      return rows.filter(function(row){
        return Object.keys(fieldOrPredicate).every(function(key){
          return row && row[key] === fieldOrPredicate[key];
        });
      });
    }

    var field = fieldOrPredicate;
    var op = arguments.length >= 4 ? opOrValue : '==';
    var value = arguments.length >= 4 ? maybeValue : opOrValue;

    return rows.filter(function(row){
      if (!row) return false;
      if (op === '==' || op === '=') return row[field] === value;
      if (op === '!=') return row[field] !== value;
      if (op === '>') return row[field] > value;
      if (op === '>=') return row[field] >= value;
      if (op === '<') return row[field] < value;
      if (op === '<=') return row[field] <= value;
      if (op === 'array-contains') return Array.isArray(row[field]) && row[field].indexOf(value) >= 0;
      return row[field] === value;
    });
  }

  function find(collection, predicate){
    if (typeof predicate === 'function') {
      return all(collection).find(function(row){
        try { return !!predicate(row); } catch(e) { return false; }
      }) || null;
    }

    if (predicate && typeof predicate === 'object') {
      return where(collection, predicate)[0] || null;
    }

    return null;
  }

  function insert(collection, payload){
    var row = normalize(clone(payload) || {});
    if (!row.id) row.id = safeId(collection);
    row.tenantId = row.tenantId || tenantId;
    row.createdAt = row.createdAt || new Date().toISOString();
    row.updatedAt = new Date().toISOString();

    var u = updateAuthState();
    if (u) {
      row.ownerUid = row.ownerUid || u.uid || '';
      row.ownerEmail = row.ownerEmail || u.email || EXPECTED_EMAIL;
    }

    row._syncStatus = 'pending';
    row._syncOp = 'insert';
    row._syncAt = new Date().toISOString();
    upsertCache(collection, row);
    markPending(collection, row.id, 'insert');

    try {
      var ref = collectionRef(collection);
      if (!ref || typeof ref.doc !== 'function') throw new Error('firestore-not-ready');
      ref.doc(row.id).set(cleanForWrite(row), { merge: true }).then(function(){
        markSynced(collection, row.id, 'insert');
      }).catch(function(e){
        markWriteFailed(collection, row.id, 'insert', e);
      });
    } catch(e) {
      markWriteFailed(collection, row.id, 'insert', e);
    }

    return row;
  }

  function update(collection, id, patch){
    var current = get(collection, id) || { id: id, tenantId: tenantId };
    var row = Object.assign({}, current, clone(patch) || {});
    row.id = id;
    row.tenantId = row.tenantId || tenantId;
    row.updatedAt = new Date().toISOString();
    row._syncStatus = 'pending';
    row._syncOp = 'update';
    row._syncAt = new Date().toISOString();

    upsertCache(collection, row);
    markPending(collection, id, 'update');

    try {
      var ref = collectionRef(collection);
      if (!ref || typeof ref.doc !== 'function') throw new Error('firestore-not-ready');
      ref.doc(id).set(cleanForWrite(row), { merge: true }).then(function(){
        markSynced(collection, id, 'update');
      }).catch(function(e){
        markWriteFailed(collection, id, 'update', e);
      });
    } catch(e) {
      markWriteFailed(collection, id, 'update', e);
    }

    return row;
  }

  function remove(collection, id){
    var previous = clone(get(collection, id));
    markPending(collection, id, 'remove');
    removeCache(collection, id);

    try {
      var ref = collectionRef(collection);
      if (!ref || typeof ref.doc !== 'function') throw new Error('firestore-not-ready');
      ref.doc(id).delete().then(function(){
        markSynced(collection, id, 'remove');
      }).catch(function(e){
        if (previous) {
          previous._syncStatus = 'failed';
          previous._syncOp = 'remove';
          previous._syncError = String(e && (e.message || e) || e);
          previous._syncAt = new Date().toISOString();
          upsertCache(collection, previous);
        }
        markWriteFailed(collection, id, 'remove', e);
      });
    } catch(e) {
      if (previous) {
        previous._syncStatus = 'failed';
        previous._syncOp = 'remove';
        previous._syncError = String(e && (e.message || e) || e);
        previous._syncAt = new Date().toISOString();
        upsertCache(collection, previous);
      }
      markWriteFailed(collection, id, 'remove', e);
    }

    return true;
  }

  function on(collection, callback){
    if (typeof collection === 'function') {
      callback = collection;
      collection = '*';
    }

    var listener = function(changed){
      if (collection === '*' || collection === changed || changed === '*') {
        try { callback(changed); } catch(e) {}
      }
    };

    listeners.push(listener);

    return function(){
      listeners = listeners.filter(function(item){ return item !== listener; });
    };
  }

  function pref(key, def){
    return Object.prototype.hasOwnProperty.call(prefs, key) ? prefs[key] : def;
  }

  function setPref(key, value){
    prefs[key] = value;
    markPending('__prefs', key, 'setPref');
    emit('__prefs');

    try {
      var ref = prefsDocRef();
      if (!ref) throw new Error('firestore-not-ready');
      var payload = {};
      payload[key] = value;
      payload.updatedAt = new Date().toISOString();
      payload.tenantId = tenantId;
      ref.set(payload, { merge: true }).then(function(){
        markSynced('__prefs', key, 'setPref');
      }).catch(function(e){
        markWriteFailed('__prefs', key, 'setPref', e);
      });
    } catch(e) {
      markWriteFailed('__prefs', key, 'setPref', e);
    }

    return value;
  }

  function init(){
    state.status = state.snapshotAttached ? 'ready' : 'waiting-firestore';
    return api;
  }

  function reseed(){
    COLLECTIONS.forEach(function(c){ cache[c] = []; });
    prefs = {};
    state.writeQueue = [];
    state.writeErrors = [];
    emit('*');
    return api;
  }

  function raw(){
    var out = {};
    COLLECTIONS.forEach(function(c){ out[c] = cache[c]; });
    out.__prefs = prefs;
    out.__backend = Object.assign({}, state, { cache: undefined });
    return out;
  }

  function attachCollectionSnapshot(collection){
    var ref = collectionRef(collection);
    if (!ref) return false;

    state.collectionPaths[collection] = canonicalCollectionPath(collection);

    try {
      var unsub = ref.onSnapshot(function(snap){
        var rows = [];
        try {
          snap.forEach(function(docSnap){
            rows.push(normalize(docSnap.data() || {}, docSnap.id));
          });
        } catch(e) {
          setError('snapshot parse failed: ' + collection, e);
        }

        cache[collection] = rows;
        state.status = 'ready';
        emit(collection);
      }, function(error){
        state.snapshotErrors[collection] = String(error && (error.message || error) || error);
        setError('snapshot failed: ' + collection, error);
      });

      unsubscribers.push(unsub);
      state.snapshotAttachedCount += 1;
      return true;
    } catch(e) {
      state.snapshotErrors[collection] = String(e && (e.message || e) || e);
      return false;
    }
  }

  function attachPrefsSnapshot(){
    var ref = prefsDocRef();
    if (!ref || typeof ref.onSnapshot !== 'function') return false;

    try {
      var unsub = ref.onSnapshot(function(docSnap){
        var data = {};
        try {
          if (docSnap && docSnap.exists) data = docSnap.data() || {};
        } catch(e) {}

        Object.keys(data).forEach(function(k){
          if (k !== 'tenantId' && k !== 'updatedAt' && k !== 'createdAt') prefs[k] = data[k];
        });

        emit('__prefs');
      }, function(error){
        state.snapshotErrors.__prefs = String(error && (error.message || error) || error);
        setError('prefs snapshot failed', error);
      });

      unsubscribers.push(unsub);
      return true;
    } catch(e) {
      state.snapshotErrors.__prefs = String(e && (e.message || e) || e);
      return false;
    }
  }

  function attachSnapshots(){
    if (attachStarted) return state.snapshotAttached;
    attachStarted = true;

    var database = db();
    if (!database) {
      attachStarted = false;
      state.status = 'waiting-firebase';
      setError('Firebase SDK not ready');
      return false;
    }

    state.snapshotAttachedCount = 0;
    COLLECTIONS.forEach(attachCollectionSnapshot);
    attachPrefsSnapshot();

    attachCompleted = state.snapshotAttachedCount > 0;
    state.snapshotAttached = attachCompleted;
    state.status = attachCompleted ? 'ready' : 'waiting-snapshots';

    if (attachCompleted) {
      log('onSnapshot listeners attached', tenantId, state.snapshotAttachedCount);
    } else {
      setError('No Firestore snapshots attached');
    }

    return attachCompleted;
  }

  function detachSnapshots(){
    unsubscribers.splice(0).forEach(function(unsub){
      try { if (typeof unsub === 'function') unsub(); } catch(e) {}
    });
    state.snapshotAttached = false;
    state.snapshotAttachedCount = 0;
    attachStarted = false;
    attachCompleted = false;
  }

  var api = {
    all: all,
    get: get,
    where: where,
    find: find,
    insert: insert,
    update: update,
    remove: remove,
    on: on,
    _emit: emit,
    pref: pref,
    setPref: setPref,
    init: init,
    reseed: reseed,
    raw: raw,
    subscribe: on,
    _subscribe: on,
    _labStatus: function(){ updateAuthState(); return Object.assign({}, state, { cache: undefined }); },
    _attachSnapshots: attachSnapshots,
    _detachSnapshots: detachSnapshots,
    __firestoreLabExplicit: true
  };

  w.Orbit.store = api;

  w.OrbitBackend = Object.assign({}, w.OrbitBackend || {}, {
    mode: mode,
    tenantId: tenantId,
    tenant: tenantId,
    noFallback: true,
    ready: true,
    source: 'data/store-firestore-lab.local.js',
    apiVersion: 'v1.74-firestore-lab-write-status',
    collections: COLLECTIONS.slice(),
    collectionPaths: state.collectionPaths,
    expectedUid: EXPECTED_UID,
    expectedEmail: EXPECTED_EMAIL,
    attachLabSnapshots: attachSnapshots,
    detachLabSnapshots: detachSnapshots,
    status: function(){ updateAuthState(); return Object.assign({}, state, { cache: undefined }); }
  });

  w.ORBIT_BACKEND = w.OrbitBackend;
  w.ORBIT_LAB_COLLECTIONS = COLLECTIONS.slice();
  w.Orbit.__labStore = state;

  state.status = 'installed';
  updateAuthState();

  setTimeout(attachSnapshots, 0);
  setTimeout(attachSnapshots, 1200);
  setTimeout(attachSnapshots, 3500);

  log('Store Firestore LAB v1.74 instalado. Tenant:', tenantId);
})();
