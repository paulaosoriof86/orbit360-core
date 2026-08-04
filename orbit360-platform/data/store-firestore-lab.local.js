/* ============================================================
   Orbit 360 · Store Firestore por membresía v1.80
   Propietario único de datos para runtime multi-tenant.

   - Preserva API: all/get/where/find/insert/update/remove/on/_emit,
     pref/setPref/init/reseed/raw y snapshots.
   - Autoriza por Firebase Auth + membresía activa del tenant.
   - No contiene usuarios técnicos, UID fijos ni fallback a seed.
   - Mantiene rutas canónicas y legacy por colección.
   ============================================================ */
(function () {
  'use strict';

  const w = window;
  w.Orbit = w.Orbit || {};

  const params = new URLSearchParams(w.location.search || '');
  const mode = params.get('orbitBackend') || (w.OrbitBackend && w.OrbitBackend.mode) || '';
  const tenantId = params.get('tenant') || (w.OrbitBackend && (w.OrbitBackend.tenantId || w.OrbitBackend.tenant)) || '';
  if (mode !== 'firestore-lab' || !tenantId) return;

  const CANONICAL_COLLECTIONS = [
    'clientes', 'aseguradoras', 'polizas', 'vehiculos',
    'recibosEsperados', 'carteraPrimas', 'cobros'
  ];
  const CANONICAL_SET = new Set(CANONICAL_COLLECTIONS);
  const COLLECTIONS = [
    'clientes', 'polizas', 'cobros', 'comisiones', 'reclamos', 'gestiones', 'negocios', 'finmovs',
    'contenidos', 'cursos', 'aseguradoras', 'asesores', 'vehiculos', 'recibosEsperados', 'carteraPrimas',
    'acreedores', 'facturas', 'documentos', 'actividades', 'metas', 'presupuesto', 'plantillas',
    'reportes_prog', 'notifs', 'avisos', 'correos', 'cancelaciones', 'novedades', 'tareas'
  ];
  const SEALED_CANONICAL_DIGEST = '19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b';

  const cache = {};
  let prefs = {};
  let listeners = [];
  let unsubscribers = [];
  let attachStarted = false;

  COLLECTIONS.forEach((name) => { cache[name] = []; });

  const state = {
    mode: 'firestore-lab',
    tenantId,
    tenant: tenantId,
    authAuthority: 'tenant-membership',
    membershipRequired: true,
    apiVersion: 'v1.80-membership-auth-owner',
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
    canonicalCollections: CANONICAL_COLLECTIONS.slice(),
    canonicalSnapshotDigest: SEALED_CANONICAL_DIGEST,
    collectionPaths: {},
    collectionAuthorities: {},
    rawCounts: {},
    operationalCounts: {},
    excludedSeedCounts: {},
    snapshotAttached: false,
    snapshotAttachedCount: 0,
    snapshotErrors: {},
    auth: null,
    membership: null,
    authGatedSnapshots: true,
    noFallback: true,
    singleReadOwner: true,
    cache
  };

  function text(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) {
    if (!value || typeof value !== 'object') return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return Array.isArray(value) ? value.slice() : Object.assign({}, value); }
  }
  function db() {
    try { return w.firebase && typeof w.firebase.firestore === 'function' ? w.firebase.firestore() : null; }
    catch (error) { return null; }
  }
  function authUser() {
    try { return w.firebase && typeof w.firebase.auth === 'function' ? w.firebase.auth().currentUser : null; }
    catch (error) { return null; }
  }
  function membershipProjection(user) {
    try {
      const projection = w.Orbit && Orbit.auth && Orbit.auth.productUser;
      const status = text(projection && projection.status).toLowerCase();
      if (!user || !projection || projection.__labMembershipProjection !== true || projection.productReadOnly !== true) return null;
      if (text(projection.uid) !== text(user.uid)) return null;
      if (text(projection.tenantId) !== tenantId) return null;
      if (status !== 'active' && status !== 'activo') return null;
      if (!Array.isArray(projection.roles) || !projection.roles.length) return null;
      if (!projection.activeRole || projection.roles.indexOf(projection.activeRole) < 0) return null;
      return projection;
    } catch (error) { return null; }
  }
  function authorizedUser() {
    const user = authUser();
    const membership = membershipProjection(user);
    state.auth = user ? { uid: text(user.uid), email: text(user.email) } : null;
    state.membership = membership ? {
      uid: text(membership.uid),
      tenantId: text(membership.tenantId),
      activeRole: text(membership.activeRole),
      advisorId: text(membership.advisorId),
      roles: (membership.roles || []).slice()
    } : null;
    return user && membership ? user : null;
  }
  function setError(message, extra) {
    state.lastError = message || 'unknown';
    state.lastExtra = extra ? text(extra.message || extra) : null;
    try { console.warn('[Orbit Store Membership]', state.lastError, state.lastExtra || ''); } catch (error) {}
  }
  function emitBackendEvent(name, detail) {
    try {
      w.dispatchEvent(new CustomEvent(name, {
        detail: Object.assign({ mode, tenantId }, detail || {})
      }));
    } catch (error) {}
  }
  function collectionAuthority(collection) {
    return CANONICAL_SET.has(collection) ? 'canonical-v79' : 'legacy-unmigrated';
  }
  function collectionPath(collection) {
    return CANONICAL_SET.has(collection)
      ? `tenants/${tenantId}/data/${collection}/items`
      : `tenantId/${tenantId}/${collection}`;
  }
  function collectionRef(collection) {
    const database = db();
    if (!database) return null;
    if (CANONICAL_SET.has(collection)) {
      return database.collection('tenants').doc(tenantId)
        .collection('data').doc(collection).collection('items');
    }
    return database.collection('tenantId').doc(tenantId).collection(collection);
  }
  function prefsDocRef() {
    const database = db();
    return database ? database.collection('tenantId').doc(tenantId).collection('_prefs').doc('orbit360') : null;
  }
  function normalize(row, id) {
    const out = row && typeof row === 'object' ? Object.assign({}, row) : {};
    if (!out.id && id) out.id = id;
    if (!out.tenantId) out.tenantId = tenantId;
    return out;
  }
  function rowId(row) {
    return row && (row.id || row.uid || row.codigo || row.numero || row.poliza || row.key);
  }
  function boolish(value) {
    if (value === true || value === false) return value;
    const clean = text(value).toLowerCase();
    if (['true', 'si', 'sí', 'yes', '1'].includes(clean)) return true;
    if (['false', 'no', '0'].includes(clean)) return false;
    return null;
  }
  function seedLike(row) {
    if (!row || typeof row !== 'object') return false;
    const marker = [row._loadedBy, row.origen, row.sourceType, row.origenRegistro]
      .map((value) => text(value)).join(' ').toLowerCase();
    return boolish(row._seed) === true || /(seed|demo|prototype|prototipo|bootstrap|sample|mock)/.test(marker);
  }
  function ensure(collection) {
    if (!cache[collection]) cache[collection] = [];
    return cache[collection];
  }
  function operationalRows(collection) {
    const rows = ensure(collection);
    return CANONICAL_SET.has(collection) ? rows.filter((row) => !seedLike(row)) : rows;
  }
  function refreshCounts(collection) {
    const raw = ensure(collection).length;
    const operational = operationalRows(collection).length;
    state.rawCounts[collection] = raw;
    state.operationalCounts[collection] = operational;
    state.excludedSeedCounts[collection] = raw - operational;
  }
  function emit(collection) {
    const changed = collection || '*';
    listeners.slice().forEach((listener) => { try { listener(changed); } catch (error) {} });
    try {
      w.dispatchEvent(new CustomEvent('orbit:store:emit', {
        detail: {
          collection: changed,
          mode,
          tenantId,
          authority: changed === '*' ? 'mixed-by-collection' : collectionAuthority(changed)
        }
      }));
      document.dispatchEvent(new CustomEvent('orbit:store', { detail: { collection: changed } }));
    } catch (error) {}
  }
  function upsertCache(collection, row) {
    const rows = ensure(collection);
    const id = rowId(row);
    const index = rows.findIndex((item) => rowId(item) === id);
    if (index >= 0) rows[index] = row;
    else rows.push(row);
    refreshCounts(collection);
    emit(collection);
  }
  function removeCache(collection, id) {
    cache[collection] = ensure(collection).filter((row) => rowId(row) !== id);
    refreshCounts(collection);
    emit(collection);
  }
  function all(collection) { return operationalRows(collection).map(clone); }
  function get(collection, id) {
    const found = operationalRows(collection).find((row) => rowId(row) === id);
    return found ? clone(found) : null;
  }
  function where(collection, fieldOrPredicate, opOrValue, maybeValue) {
    const rows = operationalRows(collection);
    if (typeof fieldOrPredicate === 'function') {
      return rows.filter((row) => { try { return !!fieldOrPredicate(row); } catch (error) { return false; } }).map(clone);
    }
    if (fieldOrPredicate && typeof fieldOrPredicate === 'object') {
      return rows.filter((row) => Object.keys(fieldOrPredicate).every((key) => row && row[key] === fieldOrPredicate[key])).map(clone);
    }
    const field = fieldOrPredicate;
    const op = arguments.length >= 4 ? opOrValue : '==';
    const value = arguments.length >= 4 ? maybeValue : opOrValue;
    return rows.filter((row) => {
      if (!row) return false;
      if (op === '==' || op === '=') return row[field] === value;
      if (op === '!=') return row[field] !== value;
      if (op === '>') return row[field] > value;
      if (op === '>=') return row[field] >= value;
      if (op === '<') return row[field] < value;
      if (op === '<=') return row[field] <= value;
      if (op === 'array-contains') return Array.isArray(row[field]) && row[field].includes(value);
      return row[field] === value;
    }).map(clone);
  }
  function find(collection, predicate) {
    const rows = where(collection, predicate);
    return rows.length ? rows[0] : null;
  }
  function on(collection, callback) {
    if (typeof collection === 'function') { callback = collection; collection = '*'; }
    const listener = (changed) => {
      if (collection === '*' || changed === '*' || changed === collection) {
        try { callback(changed); } catch (error) {}
      }
    };
    listeners.push(listener);
    return () => { listeners = listeners.filter((item) => item !== listener); };
  }
  function writeKey(collection, id, op) { return [collection || '_', id || '_', op || '_'].join('::'); }
  function markPending(collection, id, op) {
    const at = new Date().toISOString();
    const key = writeKey(collection, id, op);
    state.lastWriteAt = at;
    state.writeQueue = state.writeQueue.filter((item) => item.key !== key);
    state.writeQueue.push({ key, collection, id, op, status: 'pending', at });
    emitBackendEvent('orbit:backend:write-pending', { collection, id, op, at });
  }
  function markSynced(collection, id, op) {
    const at = new Date().toISOString();
    const key = writeKey(collection, id, op);
    state.lastWriteOkAt = at;
    state.writeQueue = state.writeQueue.filter((item) => item.key !== key);
    emitBackendEvent('orbit:backend:write-ok', { collection, id, op, at });
  }
  function markFailed(collection, id, op, error) {
    const at = new Date().toISOString();
    const key = writeKey(collection, id, op);
    const message = text(error && (error.message || error));
    state.lastWriteErrorAt = at;
    state.writeQueue = state.writeQueue.filter((item) => item.key !== key);
    state.writeErrors.push({ key, collection, id, op, status: 'failed', at, error: message });
    if (state.writeErrors.length > 100) state.writeErrors = state.writeErrors.slice(-100);
    setError(`${op} failed: ${collection}`, error);
    emitBackendEvent('orbit:backend:write-error', { collection, id, op, at, error: message });
  }
  function requireWriteUser() {
    const user = authorizedUser();
    if (!user) {
      const error = new Error('MEMBERSHIP_AUTH_REQUIRED');
      error.code = 'MEMBERSHIP_AUTH_REQUIRED';
      throw error;
    }
    return user;
  }
  function safeId(collection) {
    const ref = collectionRef(collection);
    return ref && typeof ref.doc === 'function'
      ? ref.doc().id
      : `${collection}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  function cleanForWrite(row) {
    const out = clone(row) || {};
    delete out._syncStatus;
    delete out._syncOp;
    delete out._syncError;
    delete out._syncAt;
    return out;
  }
  function insert(collection, payload) {
    const user = requireWriteUser();
    const row = normalize(clone(payload) || {});
    if (!row.id) row.id = safeId(collection);
    const now = new Date().toISOString();
    row.createdAt = row.createdAt || now;
    row.updatedAt = now;
    row.ownerUid = row.ownerUid || text(user.uid);
    row.ownerEmail = row.ownerEmail || text(user.email);
    row._syncStatus = 'pending'; row._syncOp = 'insert'; row._syncAt = now;
    upsertCache(collection, row);
    markPending(collection, row.id, 'insert');
    const ref = collectionRef(collection);
    if (!ref) { markFailed(collection, row.id, 'insert', new Error('firestore-not-ready')); return clone(row); }
    ref.doc(row.id).set(cleanForWrite(row), { merge: true })
      .then(() => markSynced(collection, row.id, 'insert'))
      .catch((error) => markFailed(collection, row.id, 'insert', error));
    return clone(row);
  }
  function update(collection, id, patch) {
    const user = requireWriteUser();
    const row = Object.assign({}, get(collection, id) || { id, tenantId }, clone(patch) || {});
    row.id = id;
    row.tenantId = row.tenantId || tenantId;
    row.updatedAt = new Date().toISOString();
    row.updatedByUid = text(user.uid);
    row.updatedByEmail = text(user.email);
    row._syncStatus = 'pending'; row._syncOp = 'update'; row._syncAt = row.updatedAt;
    upsertCache(collection, row);
    markPending(collection, id, 'update');
    const ref = collectionRef(collection);
    if (!ref) { markFailed(collection, id, 'update', new Error('firestore-not-ready')); return clone(row); }
    ref.doc(id).set(cleanForWrite(row), { merge: true })
      .then(() => markSynced(collection, id, 'update'))
      .catch((error) => markFailed(collection, id, 'update', error));
    return clone(row);
  }
  function remove(collection, id) {
    requireWriteUser();
    const previous = get(collection, id);
    markPending(collection, id, 'remove');
    removeCache(collection, id);
    const ref = collectionRef(collection);
    if (!ref) { if (previous) upsertCache(collection, previous); markFailed(collection, id, 'remove', new Error('firestore-not-ready')); return false; }
    ref.doc(id).delete()
      .then(() => markSynced(collection, id, 'remove'))
      .catch((error) => { if (previous) upsertCache(collection, previous); markFailed(collection, id, 'remove', error); });
    return true;
  }
  function pref(key, fallback) {
    return Object.prototype.hasOwnProperty.call(prefs, key) ? prefs[key] : fallback;
  }
  function setPref(key, value) {
    requireWriteUser();
    prefs[key] = value;
    emit('__prefs');
    const ref = prefsDocRef();
    if (!ref) return value;
    const payload = { tenantId, updatedAt: new Date().toISOString() };
    payload[key] = value;
    ref.set(payload, { merge: true }).catch((error) => setError('setPref failed', error));
    return value;
  }
  function attachCollectionSnapshot(collection) {
    const ref = collectionRef(collection);
    if (!ref || typeof ref.onSnapshot !== 'function') return false;
    state.collectionPaths[collection] = collectionPath(collection);
    state.collectionAuthorities[collection] = collectionAuthority(collection);
    const unsubscribe = ref.onSnapshot((snapshot) => {
      const rows = [];
      snapshot.forEach((doc) => rows.push(normalize(doc.data() || {}, doc.id)));
      cache[collection] = rows;
      refreshCounts(collection);
      state.status = 'ready';
      emit(collection);
    }, (error) => {
      state.snapshotErrors[collection] = text(error && (error.message || error));
      setError(`snapshot failed: ${collection}`, error);
    });
    unsubscribers.push(unsubscribe);
    state.snapshotAttachedCount += 1;
    return true;
  }
  function attachPrefsSnapshot() {
    const ref = prefsDocRef();
    if (!ref || typeof ref.onSnapshot !== 'function') return false;
    const unsubscribe = ref.onSnapshot((documentSnapshot) => {
      const data = documentSnapshot && documentSnapshot.exists ? documentSnapshot.data() || {} : {};
      Object.keys(data).forEach((key) => {
        if (!['tenantId', 'updatedAt', 'createdAt'].includes(key)) prefs[key] = data[key];
      });
      emit('__prefs');
    }, (error) => {
      state.snapshotErrors.__prefs = text(error && (error.message || error));
      setError('prefs snapshot failed', error);
    });
    unsubscribers.push(unsubscribe);
    return true;
  }
  function attachSnapshots() {
    if (!authorizedUser()) {
      state.status = 'waiting-membership';
      state.snapshotAttached = false;
      state.snapshotAttachedCount = 0;
      return false;
    }
    if (attachStarted && state.snapshotAttached) return true;
    const database = db();
    if (!database) { state.status = 'waiting-firestore'; return false; }
    detachSnapshots();
    attachStarted = true;
    state.snapshotAttachedCount = 0;
    COLLECTIONS.forEach(attachCollectionSnapshot);
    attachPrefsSnapshot();
    state.snapshotAttached = state.snapshotAttachedCount === COLLECTIONS.length;
    state.status = state.snapshotAttached ? 'ready' : 'waiting-snapshots';
    if (!state.snapshotAttached) setError(`Incomplete Firestore snapshot ownership: ${state.snapshotAttachedCount}/${COLLECTIONS.length}`);
    return state.snapshotAttached;
  }
  function detachSnapshots() {
    unsubscribers.splice(0).forEach((unsubscribe) => { try { if (typeof unsubscribe === 'function') unsubscribe(); } catch (error) {} });
    state.snapshotAttached = false;
    state.snapshotAttachedCount = 0;
    attachStarted = false;
  }
  function init() {
    state.status = authorizedUser() ? 'waiting-firestore' : 'waiting-membership';
    if (authorizedUser()) setTimeout(attachSnapshots, 0);
    return api;
  }
  function reseed() {
    COLLECTIONS.forEach((collection) => { cache[collection] = []; refreshCounts(collection); });
    prefs = {};
    state.writeQueue = [];
    state.writeErrors = [];
    emit('*');
    return api;
  }
  function raw() {
    const out = {};
    COLLECTIONS.forEach((collection) => { out[collection] = all(collection); });
    out.__prefs = clone(prefs);
    out.__backend = Object.assign({}, state, { cache: undefined });
    return out;
  }
  function bindMembershipLifecycle() {
    w.addEventListener('orbit:membership-projection', (event) => {
      const detail = event && event.detail || {};
      if (detail.ready === true && detail.tenantBound === true) attachSnapshots();
      else if (detail.status === 'blocked' || detail.status === 'waiting-auth') detachSnapshots();
    });
    let attempts = 0;
    (function bindAuth() {
      try {
        const auth = w.firebase && typeof firebase.auth === 'function' ? firebase.auth() : null;
        if (auth && typeof auth.onAuthStateChanged === 'function') {
          auth.onAuthStateChanged((user) => {
            if (!user) detachSnapshots();
            else setTimeout(attachSnapshots, 150);
          });
          return;
        }
      } catch (error) {}
      attempts += 1;
      if (attempts < 120) setTimeout(bindAuth, 100);
    })();
  }

  const api = {
    all, get, where, find, insert, update, remove,
    on, _emit: emit, pref, setPref, init, reseed, raw,
    subscribe: on, _subscribe: on,
    _labStatus: () => { authorizedUser(); return Object.assign({}, state, { cache: undefined }); },
    _attachSnapshots: attachSnapshots,
    _detachSnapshots: detachSnapshots,
    _collectionPath: collectionPath,
    _collectionAuthority: collectionAuthority,
    _isOperationalRow: (collection, row) => !CANONICAL_SET.has(collection) || !seedLike(row),
    __firestoreLabExplicit: true,
    __authGatedSnapshots: true,
    __membershipAuthRequired: true,
    __canonicalReadModelV79: true,
    __singleReadOwner: true
  };

  w.Orbit.store = api;
  w.OrbitBackend = Object.assign({}, w.OrbitBackend || {}, {
    mode,
    tenantId,
    tenant: tenantId,
    noFallback: true,
    ready: true,
    source: 'data/store-firestore-lab.local.js',
    apiVersion: 'v1.80-membership-auth-owner',
    authAuthority: 'tenant-membership',
    membershipRequired: true,
    collections: COLLECTIONS.slice(),
    canonicalCollections: CANONICAL_COLLECTIONS.slice(),
    canonicalSnapshotDigest: SEALED_CANONICAL_DIGEST,
    collectionPaths: state.collectionPaths,
    collectionAuthorities: state.collectionAuthorities,
    attachLabSnapshots: attachSnapshots,
    detachLabSnapshots: detachSnapshots,
    authGatedSnapshots: true,
    membershipAuthRequired: true,
    singleReadOwner: true,
    status: () => { authorizedUser(); return Object.assign({}, state, { cache: undefined }); }
  });
  w.ORBIT_BACKEND = w.OrbitBackend;
  w.ORBIT_LAB_COLLECTIONS = COLLECTIONS.slice();
  w.Orbit.__labStore = state;
  bindMembershipLifecycle();
})();
