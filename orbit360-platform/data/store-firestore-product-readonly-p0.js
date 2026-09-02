/* ============================================================
   Orbit 360 · Store Firestore productivo read-only P0
   Fecha: 2026-07-13

   Factory aditiva para el primer smoke productivo de solo lectura.
   No se auto-instala, no contiene configuración, no usa fallback y
   bloquea insert/update/remove/setPref/reseed de forma explícita.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var VERSION = 'p0-20260902-authoritative-first-read-2';
  var WRITE_ERROR = 'WRITE_BLOCKED_PRODUCT_READ_ONLY_P0';
  function text(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value && typeof value === 'object' ? Object.assign({}, value) : value; } }
  function unique(values) { var out = []; (Array.isArray(values) ? values : []).forEach(function (value) { var clean = text(value); if (clean && out.indexOf(clean) < 0) out.push(clean); }); return out; }
  function rowId(row) { return row && (row.id || row.uid || row.codigo || row.numero || row.key); }
  function createStore(deps, options) {
    deps = deps || {}; options = options || {};
    var paths = options.paths || window.Orbit.tenantCanonicalPathsP0;
    var tenantCheck = paths && paths.validateTenantId ? paths.validateTenantId(options.tenantId) : { ok: false, errors: ['contrato_rutas_faltante'] };
    var collections = unique(options.collections), requestedRequired = unique(options.requiredCollections).filter(function (name) { return collections.indexOf(name) >= 0; });
    var startupCollections = requestedRequired.length ? requestedRequired.slice() : collections.slice();
    var deferredCollections = collections.filter(function (name) { return startupCollections.indexOf(name) < 0; });
    var authoritativeFirstReadRequired = options.authoritativeFirstReadRequired === true;
    var listeners = [], unsubscribers = [], cache = {}, prefs = clone(options.initialPrefs || {}), deferredAttached = false, deferredScheduled = false;
    var state = { version: VERSION, mode: 'product', tenantId: tenantCheck.tenantId || text(options.tenantId), source: 'data/store-firestore-product-readonly-p0.js', noFallback: true, writeEnabled: false, ready: false, status: 'created', attachedCollections: [], observedCollections: [], serverConfirmedCollections: [], cacheOnlyCollections: [], snapshotSources: {}, deniedCollections: [], snapshotErrors: {}, quarantinedRows: {}, queryPlans: {}, lastSnapshotAt: null, requiredStartupCollections: startupCollections.slice(), deferredCollections: deferredCollections.slice(), deferredAttached: false, authoritativeFirstRead: authoritativeFirstReadRequired };
    collections.forEach(function (collection) { cache[collection] = []; state.quarantinedRows[collection] = []; });
    function fail(message) { var error = new Error(message || WRITE_ERROR); error.code = WRITE_ERROR; throw error; }
    function emit(collection) { var changed = collection || '*'; listeners.slice().forEach(function (listener) { try { listener(changed); } catch (e) {} }); try { window.dispatchEvent(new CustomEvent('orbit:store:emit', { detail: { collection: changed, mode: 'product', tenantId: state.tenantId, readOnly: true } })); } catch (e) {} }
    function database() { return deps.db || (typeof deps.getDb === 'function' ? deps.getDb() : null); }
    function compatCollection(path) { var db = database(); return db && typeof db.collection === 'function' ? db.collection(path) : null; }
    function modularCollection(path) { var db = database(); return db && typeof deps.collection === 'function' ? deps.collection(db, path) : null; }
    function applyConstraint(ref, constraint) { if (!constraint || constraint.field === '__deny__') return ref; if (ref && typeof ref.where === 'function') return ref.where(constraint.field, constraint.op, constraint.value); if (typeof deps.query === 'function' && typeof deps.where === 'function') return deps.query(ref, deps.where(constraint.field, constraint.op, constraint.value)); throw new Error('query_constraint_api_unavailable'); }
    function queryPlan(collection) { if (typeof options.queryPlanner !== 'function') return { ok: false, hardError: true, collection: collection, constraints: [], errors: ['query_planner_faltante'] }; var plan = options.queryPlanner(collection) || {}, constraints = Array.isArray(plan.constraints) ? plan.constraints.slice() : []; if (constraints.some(function (item) { return item && item.field === '__deny__'; })) return { ok: false, denied: true, collection: collection, constraints: constraints, errors: ['scope_none'] }; if (!constraints.some(function (item) { return item && item.field === 'tenantId' && item.op === '==' && item.value === state.tenantId; })) return { ok: false, hardError: true, collection: collection, constraints: constraints, errors: ['tenant_constraint_faltante'] }; return { ok: plan.ok !== false, hardError: plan.ok === false, collection: collection, constraints: constraints, errors: plan.errors || [] }; }
    function queryRef(collection) { if (!paths || typeof paths.dataCollectionPath !== 'function') throw new Error('contrato_rutas_faltante'); var path = paths.dataCollectionPath(state.tenantId, collection), ref = compatCollection(path) || modularCollection(path); if (!ref) throw new Error('firestore_collection_api_unavailable'); var plan = queryPlan(collection); state.queryPlans[collection] = clone(plan); if (plan.hardError) throw new Error((plan.errors || ['query_plan_invalido']).join('|')); if (plan.denied) return { denied: true, ref: null, plan: plan, path: path }; plan.constraints.forEach(function (constraint) { ref = applyConstraint(ref, constraint); }); return { denied: false, ref: ref, plan: plan, path: path }; }
    function docRows(snapshot) { var rows = []; if (!snapshot) return rows; if (typeof snapshot.forEach === 'function') { snapshot.forEach(function (doc) { var data = typeof doc.data === 'function' ? doc.data() : doc.data || {}; rows.push(Object.assign({}, data, { id: data.id || doc.id })); }); return rows; } (snapshot.docs || []).forEach(function (doc) { var data = typeof doc.data === 'function' ? doc.data() : doc.data || {}; rows.push(Object.assign({}, data, { id: data.id || doc.id })); }); return rows; }
    function requiredConfirmed() { return startupCollections.every(function (name) { return state.serverConfirmedCollections.indexOf(name) >= 0; }); }
    function recordError(collection, error, phase) { state.snapshotErrors[collection] = String(error && (error.message || error) || error); state.status = phase === 'attach' ? 'attach-error' : 'snapshot-error'; }
    function subscribeBuilt(collection, built) {
      var unsubscribe = subscribeRef(built.ref, function (snapshot) { var meta = snapshot && snapshot.metadata ? { fromCache: snapshot.metadata.fromCache === true } : { fromCache: false }; acceptRows(collection, docRows(snapshot), meta); }, function (error) { recordError(collection, error, 'snapshot'); });
      if (typeof unsubscribe === 'function') unsubscribers.push(unsubscribe);
    }
    function maybeAttachDeferred() {
      if (deferredAttached || deferredScheduled || !requiredConfirmed()) return;
      deferredScheduled = true;
      setTimeout(function () {
        deferredScheduled = false;
        if (deferredAttached) return;
        deferredAttached = true;
        state.deferredAttached = true;
        deferredCollections.forEach(function (collection) { attachCollection(collection, false); });
      }, 0);
    }
    function acceptRows(collection, rows, snapshotMeta) { var accepted = [], quarantined = [], fromCache = !!(snapshotMeta && snapshotMeta.fromCache === true); (rows || []).forEach(function (row) { var normalized = Object.assign({}, row); if (!normalized.tenantId) normalized.tenantId = state.tenantId; if (normalized.tenantId !== state.tenantId || !rowId(normalized)) quarantined.push(normalized); else accepted.push(normalized); }); cache[collection] = accepted; state.quarantinedRows[collection] = quarantined.map(function (row) { return { id: rowId(row) || '', reason: row.tenantId !== state.tenantId ? 'tenant_mismatch' : 'id_missing' }; }); if (state.observedCollections.indexOf(collection) < 0) state.observedCollections.push(collection); if (state.attachedCollections.indexOf(collection) < 0) state.attachedCollections.push(collection); state.snapshotSources[collection] = fromCache ? 'cache' : 'server'; if (fromCache) { if (state.serverConfirmedCollections.indexOf(collection) < 0 && state.cacheOnlyCollections.indexOf(collection) < 0) state.cacheOnlyCollections.push(collection); } else { if (state.serverConfirmedCollections.indexOf(collection) < 0) state.serverConfirmedCollections.push(collection); state.cacheOnlyCollections = state.cacheOnlyCollections.filter(function (name) { return name !== collection; }); } state.ready = state.serverConfirmedCollections.length > 0; state.status = state.ready ? 'authoritative-snapshots-progress' : 'waiting-authoritative-snapshots'; state.lastSnapshotAt = new Date().toISOString(); emit(collection); maybeAttachDeferred(); }
    function subscribeRef(ref, onNext, onError) { if (ref && typeof ref.onSnapshot === 'function') return ref.onSnapshot(onNext, onError); if (typeof deps.onSnapshot === 'function') return deps.onSnapshot(ref, onNext, onError); throw new Error('firestore_snapshot_api_unavailable'); }
    function attachCollection(collection, authoritativeFirst) {
      var built;
      try {
        built = queryRef(collection);
        if (built.denied) { if (state.deniedCollections.indexOf(collection) < 0) state.deniedCollections.push(collection); cache[collection] = []; emit(collection); return false; }
        if (authoritativeFirst) {
          if (typeof deps.getDocsFromServer !== 'function') {
            if (authoritativeFirstReadRequired) throw new Error('firestore_authoritative_read_api_unavailable');
            subscribeBuilt(collection, built); return true;
          }
          Promise.resolve(deps.getDocsFromServer(built.ref)).then(function (snapshot) {
            acceptRows(collection, docRows(snapshot), { fromCache: false });
            subscribeBuilt(collection, built);
          }).catch(function (error) { recordError(collection, error, 'snapshot'); });
          return true;
        }
        subscribeBuilt(collection, built);
        return true;
      } catch (error) { recordError(collection, error, 'attach'); return false; }
    }
    function attach() {
      if (!tenantCheck.ok) { state.status = 'blocked-tenant'; return false; }
      if (!collections.length || !startupCollections.length) { state.status = 'blocked-no-collections'; return false; }
      if (!database()) { state.status = 'blocked-no-database'; return false; }
      if (authoritativeFirstReadRequired && typeof deps.getDocsFromServer !== 'function') { state.status = 'attach-error'; state.snapshotErrors.__startup = 'firestore_authoritative_read_api_unavailable'; return false; }
      state.status = 'attaching';
      startupCollections.forEach(function (collection) { attachCollection(collection, authoritativeFirstReadRequired); });
      state.ready = requiredConfirmed();
      if (!state.ready && state.status === 'attaching') state.status = 'waiting-authoritative-snapshots';
      return startupCollections.every(function (name) { return !state.snapshotErrors[name] && state.deniedCollections.indexOf(name) < 0; });
    }
    function detach() { unsubscribers.splice(0).forEach(function (unsubscribe) { try { unsubscribe(); } catch (e) {} }); state.attachedCollections = []; state.observedCollections = []; state.serverConfirmedCollections = []; state.cacheOnlyCollections = []; state.snapshotSources = {}; state.ready = false; state.status = 'detached'; deferredAttached = false; deferredScheduled = false; state.deferredAttached = false; }
    function all(collection) { return (cache[collection] || []).map(clone); }
    function get(collection, id) { var row = (cache[collection] || []).find(function (item) { return rowId(item) === id; }); return row ? clone(row) : null; }
    function where(collection, fieldOrPredicate, opOrValue, maybeValue) { var source = cache[collection] || [], matches; if (typeof fieldOrPredicate === 'function') matches = source.filter(fieldOrPredicate); else if (fieldOrPredicate && typeof fieldOrPredicate === 'object') matches = source.filter(function (row) { return Object.keys(fieldOrPredicate).every(function (key) { return row[key] === fieldOrPredicate[key]; }); }); else { var field = fieldOrPredicate, op = arguments.length >= 4 ? opOrValue : '==', value = arguments.length >= 4 ? maybeValue : opOrValue; matches = source.filter(function (row) { if (op === '==' || op === '=') return row[field] === value; if (op === '!=') return row[field] !== value; if (op === '>') return row[field] > value; if (op === '>=') return row[field] >= value; if (op === '<') return row[field] < value; if (op === '<=') return row[field] <= value; if (op === 'array-contains') return Array.isArray(row[field]) && row[field].indexOf(value) >= 0; return false; }); } return matches.map(clone); }
    function find(collection, predicate) { var source = cache[collection] || [], row = null; if (typeof predicate === 'function') row = source.find(predicate) || null; else if (predicate && typeof predicate === 'object') row = source.find(function (item) { return Object.keys(predicate).every(function (key) { return item[key] === predicate[key]; }); }) || null; return row ? clone(row) : null; }
    function on(collection, callback) { if (typeof collection === 'function') { callback = collection; collection = '*'; } var listener = function (changed) { if (collection === '*' || collection === changed || changed === '*') callback(changed); }; listeners.push(listener); return function () { listeners = listeners.filter(function (item) { return item !== listener; }); }; }
    function pref(key, defaultValue) { return Object.prototype.hasOwnProperty.call(prefs, key) ? clone(prefs[key]) : defaultValue; }
    function raw() { var out = {}; collections.forEach(function (collection) { out[collection] = all(collection); }); out.__prefs = clone(prefs); out.__backend = Object.assign({}, state, { quarantinedRows: clone(state.quarantinedRows), queryPlans: clone(state.queryPlans) }); return out; }
    var api = { all: all, get: get, where: where, find: find, insert: fail, update: fail, remove: fail, on: on, _emit: emit, pref: pref, setPref: fail, init: function () { return api; }, reseed: fail, raw: raw, subscribe: on, _subscribe: on, _attachSnapshots: attach, _detachSnapshots: detach, _productStatus: function () { return Object.assign({}, state, { quarantinedRows: clone(state.quarantinedRows), queryPlans: clone(state.queryPlans) }); }, __productReadOnlyP0: true };
    return api;
  }
  window.Orbit.createFirestoreProductReadOnlyStoreP0 = createStore;
  window.Orbit.firestoreProductReadOnlyStoreP0 = Object.freeze({ VERSION: VERSION, WRITE_ERROR: WRITE_ERROR, create: createStore, authoritativeFirstReadSupported: true });
})();