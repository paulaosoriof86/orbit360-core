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

  var VERSION = 'p0-20260713';
  var WRITE_ERROR = 'WRITE_BLOCKED_PRODUCT_READ_ONLY_P0';

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (e) { return value && typeof value === 'object' ? Object.assign({}, value) : value; }
  }

  function unique(values) {
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var clean = text(value);
      if (clean && out.indexOf(clean) < 0) out.push(clean);
    });
    return out;
  }

  function rowId(row) {
    return row && (row.id || row.uid || row.codigo || row.numero || row.key);
  }

  function createStore(deps, options) {
    deps = deps || {};
    options = options || {};

    var paths = options.paths || window.Orbit.tenantCanonicalPathsP0;
    var tenantCheck = paths && paths.validateTenantId ? paths.validateTenantId(options.tenantId) : { ok: false, errors: ['contrato_rutas_faltante'] };
    var collections = unique(options.collections);
    var listeners = [];
    var unsubscribers = [];
    var cache = {};
    var prefs = clone(options.initialPrefs || {});
    var state = {
      version: VERSION,
      mode: 'product',
      tenantId: tenantCheck.tenantId || text(options.tenantId),
      source: 'data/store-firestore-product-readonly-p0.js',
      noFallback: true,
      writeEnabled: false,
      ready: false,
      status: 'created',
      attachedCollections: [],
      deniedCollections: [],
      snapshotErrors: {},
      quarantinedRows: {},
      queryPlans: {},
      lastSnapshotAt: null
    };

    collections.forEach(function (collection) {
      cache[collection] = [];
      state.quarantinedRows[collection] = [];
    });

    function fail(message) {
      var error = new Error(message || WRITE_ERROR);
      error.code = WRITE_ERROR;
      throw error;
    }

    function emit(collection) {
      var changed = collection || '*';
      listeners.slice().forEach(function (listener) {
        try { listener(changed); } catch (e) {}
      });
      try {
        window.dispatchEvent(new CustomEvent('orbit:store:emit', {
          detail: { collection: changed, mode: 'product', tenantId: state.tenantId, readOnly: true }
        }));
      } catch (e) {}
    }

    function database() {
      return deps.db || (typeof deps.getDb === 'function' ? deps.getDb() : null);
    }

    function compatCollection(path) {
      var db = database();
      if (db && typeof db.collection === 'function') return db.collection(path);
      return null;
    }

    function modularCollection(path) {
      var db = database();
      if (db && typeof deps.collection === 'function') return deps.collection(db, path);
      return null;
    }

    function applyConstraint(ref, constraint) {
      if (!constraint || constraint.field === '__deny__') return ref;
      if (ref && typeof ref.where === 'function') return ref.where(constraint.field, constraint.op, constraint.value);
      if (typeof deps.query === 'function' && typeof deps.where === 'function') {
        return deps.query(ref, deps.where(constraint.field, constraint.op, constraint.value));
      }
      throw new Error('query_constraint_api_unavailable');
    }

    function queryPlan(collection) {
      if (typeof options.queryPlanner !== 'function') {
        return { ok: false, hardError: true, collection: collection, constraints: [], errors: ['query_planner_faltante'] };
      }
      var plan = options.queryPlanner(collection) || {};
      var constraints = Array.isArray(plan.constraints) ? plan.constraints.slice() : [];
      if (constraints.some(function (item) { return item && item.field === '__deny__'; })) {
        return { ok: false, denied: true, collection: collection, constraints: constraints, errors: ['scope_none'] };
      }
      if (!constraints.some(function (item) { return item && item.field === 'tenantId' && item.op === '==' && item.value === state.tenantId; })) {
        return { ok: false, hardError: true, collection: collection, constraints: constraints, errors: ['tenant_constraint_faltante'] };
      }
      return { ok: plan.ok !== false, hardError: plan.ok === false, collection: collection, constraints: constraints, errors: plan.errors || [] };
    }

    function queryRef(collection) {
      if (!paths || typeof paths.dataCollectionPath !== 'function') throw new Error('contrato_rutas_faltante');
      var path = paths.dataCollectionPath(state.tenantId, collection);
      var ref = compatCollection(path) || modularCollection(path);
      if (!ref) throw new Error('firestore_collection_api_unavailable');
      var plan = queryPlan(collection);
      state.queryPlans[collection] = clone(plan);
      if (plan.hardError) throw new Error((plan.errors || ['query_plan_invalido']).join('|'));
      if (plan.denied) return { denied: true, ref: null, plan: plan, path: path };
      plan.constraints.forEach(function (constraint) { ref = applyConstraint(ref, constraint); });
      return { denied: false, ref: ref, plan: plan, path: path };
    }

    function docRows(snapshot) {
      var rows = [];
      if (!snapshot) return rows;
      if (typeof snapshot.forEach === 'function') {
        snapshot.forEach(function (doc) {
          var data = typeof doc.data === 'function' ? doc.data() : doc.data || {};
          rows.push(Object.assign({}, data, { id: data.id || doc.id }));
        });
        return rows;
      }
      (snapshot.docs || []).forEach(function (doc) {
        var data = typeof doc.data === 'function' ? doc.data() : doc.data || {};
        rows.push(Object.assign({}, data, { id: data.id || doc.id }));
      });
      return rows;
    }

    function acceptRows(collection, rows) {
      var accepted = [];
      var quarantined = [];
      (rows || []).forEach(function (row) {
        var normalized = Object.assign({}, row);
        if (!normalized.tenantId) normalized.tenantId = state.tenantId;
        if (normalized.tenantId !== state.tenantId || !rowId(normalized)) quarantined.push(normalized);
        else accepted.push(normalized);
      });
      cache[collection] = accepted;
      state.quarantinedRows[collection] = quarantined.map(function (row) {
        return { id: rowId(row) || '', reason: row.tenantId !== state.tenantId ? 'tenant_mismatch' : 'id_missing' };
      });
      state.lastSnapshotAt = new Date().toISOString();
      emit(collection);
    }

    function subscribeRef(ref, onNext, onError) {
      if (ref && typeof ref.onSnapshot === 'function') return ref.onSnapshot(onNext, onError);
      if (typeof deps.onSnapshot === 'function') return deps.onSnapshot(ref, onNext, onError);
      throw new Error('firestore_snapshot_api_unavailable');
    }

    function attachCollection(collection) {
      var built;
      try {
        built = queryRef(collection);
        if (built.denied) {
          if (state.deniedCollections.indexOf(collection) < 0) state.deniedCollections.push(collection);
          cache[collection] = [];
          emit(collection);
          return false;
        }
        var unsubscribe = subscribeRef(built.ref, function (snapshot) {
          acceptRows(collection, docRows(snapshot));
          if (state.attachedCollections.indexOf(collection) < 0) state.attachedCollections.push(collection);
          state.ready = state.attachedCollections.length > 0;
          state.status = state.ready ? 'ready-read-only' : 'waiting-snapshots';
        }, function (error) {
          state.snapshotErrors[collection] = String(error && (error.message || error) || error);
          state.status = 'snapshot-error';
        });
        if (typeof unsubscribe === 'function') unsubscribers.push(unsubscribe);
        return true;
      } catch (error) {
        state.snapshotErrors[collection] = String(error && (error.message || error) || error);
        state.status = 'attach-error';
        return false;
      }
    }

    function attach() {
      if (!tenantCheck.ok) {
        state.status = 'blocked-tenant';
        return false;
      }
      if (!collections.length) {
        state.status = 'blocked-no-collections';
        return false;
      }
      if (!database()) {
        state.status = 'blocked-no-database';
        return false;
      }
      state.status = 'attaching';
      collections.forEach(attachCollection);
      state.ready = state.attachedCollections.length > 0;
      if (!state.ready && state.status === 'attaching') state.status = 'waiting-snapshots';
      return state.ready || Object.keys(state.snapshotErrors).length === 0;
    }

    function detach() {
      unsubscribers.splice(0).forEach(function (unsubscribe) {
        try { unsubscribe(); } catch (e) {}
      });
      state.attachedCollections = [];
      state.ready = false;
      state.status = 'detached';
    }

    function all(collection) {
      return (cache[collection] || []).map(clone);
    }

    function get(collection, id) {
      return all(collection).find(function (row) { return rowId(row) === id; }) || null;
    }

    function where(collection, fieldOrPredicate, opOrValue, maybeValue) {
      var rows = all(collection);
      if (typeof fieldOrPredicate === 'function') return rows.filter(fieldOrPredicate);
      if (fieldOrPredicate && typeof fieldOrPredicate === 'object') {
        return rows.filter(function (row) {
          return Object.keys(fieldOrPredicate).every(function (key) { return row[key] === fieldOrPredicate[key]; });
        });
      }
      var field = fieldOrPredicate;
      var op = arguments.length >= 4 ? opOrValue : '==';
      var value = arguments.length >= 4 ? maybeValue : opOrValue;
      return rows.filter(function (row) {
        if (op === '==' || op === '=') return row[field] === value;
        if (op === '!=') return row[field] !== value;
        if (op === '>') return row[field] > value;
        if (op === '>=') return row[field] >= value;
        if (op === '<') return row[field] < value;
        if (op === '<=') return row[field] <= value;
        if (op === 'array-contains') return Array.isArray(row[field]) && row[field].indexOf(value) >= 0;
        return false;
      });
    }

    function find(collection, predicate) {
      return typeof predicate === 'function' ? (all(collection).find(predicate) || null) : (where(collection, predicate)[0] || null);
    }

    function on(collection, callback) {
      if (typeof collection === 'function') {
        callback = collection;
        collection = '*';
      }
      var listener = function (changed) {
        if (collection === '*' || collection === changed || changed === '*') callback(changed);
      };
      listeners.push(listener);
      return function () { listeners = listeners.filter(function (item) { return item !== listener; }); };
    }

    function pref(key, defaultValue) {
      return Object.prototype.hasOwnProperty.call(prefs, key) ? clone(prefs[key]) : defaultValue;
    }

    function raw() {
      var out = {};
      collections.forEach(function (collection) { out[collection] = all(collection); });
      out.__prefs = clone(prefs);
      out.__backend = Object.assign({}, state, { quarantinedRows: clone(state.quarantinedRows), queryPlans: clone(state.queryPlans) });
      return out;
    }

    var api = {
      all: all,
      get: get,
      where: where,
      find: find,
      insert: fail,
      update: fail,
      remove: fail,
      on: on,
      _emit: emit,
      pref: pref,
      setPref: fail,
      init: function () { return api; },
      reseed: fail,
      raw: raw,
      subscribe: on,
      _subscribe: on,
      _attachSnapshots: attach,
      _detachSnapshots: detach,
      _productStatus: function () { return Object.assign({}, state, { quarantinedRows: clone(state.quarantinedRows), queryPlans: clone(state.queryPlans) }); },
      __productReadOnlyP0: true
    };

    return api;
  }

  window.Orbit.createFirestoreProductReadOnlyStoreP0 = createStore;
  window.Orbit.firestoreProductReadOnlyStoreP0 = Object.freeze({
    VERSION: VERSION,
    WRITE_ERROR: WRITE_ERROR,
    create: createStore
  });
})();
