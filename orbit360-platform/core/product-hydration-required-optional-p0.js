/* ============================================================
   Orbit 360 · Product hydration required/optional P0
   Fecha: 2026-08-14

   Adaptador aditivo read-only para el store productivo P0.
   Reutiliza el contrato materializado en la configuracion publica:
   - required gobierna readiness;
   - optional/legacy puede degradarse sin bloquear;
   - asesores se proyecta en lectura cuando la fuente legacy falta;
   - cero escrituras y cero fallback.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};
  var VERSION = 'p0-20260902-authoritative-required-optional-3';
  var MARKER = 'PRODUCT_HYDRATION_AUTHORITATIVE_REQUIRED_OPTIONAL_P0';
  var originalCreate = window.Orbit.createFirestoreProductReadOnlyStoreP0;

  function text(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value && typeof value === 'object' ? Object.assign({}, value) : value; } }
  function unique(values) { var out = []; (Array.isArray(values) ? values : []).forEach(function (value) { var clean = text(value); if (clean && out.indexOf(clean) < 0) out.push(clean); }); return out; }
  function contract() {
    var cfg = window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__ || {};
    var required = unique(cfg.requiredCollections);
    var optional = unique(cfg.optionalCollections).filter(function (name) { return required.indexOf(name) < 0; });
    if (!required.length) throw new Error('product_required_hydration_contract_missing');
    return { version: text(cfg.hydrationContractVersion) || 'unversioned', source: text(cfg.hydrationContractSource) || 'public-runtime-config', required: required, optional: optional, all: required.concat(optional) };
  }
  function rowId(row) { return row && (row.id || row.uid || row.codigo || row.numero || row.key); }

  function wrapStore(base, hydration) {
    var baseStatus = base._productStatus.bind(base), baseAttach = base._attachSnapshots.bind(base), baseRaw = base.raw.bind(base), baseAll = base.all.bind(base), baseGet = base.get.bind(base), baseWhere = base.where.bind(base), baseFind = base.find.bind(base);
    var advisorProjectionCache = null;
    var advisorProjectionSources = ['clientes', 'polizas', 'cobros', 'recibosEsperados', 'carteraPrimas'];

    function status() {
      var raw = baseStatus() || {};
      var observed = unique(raw.observedCollections || raw.attachedCollections);
      var confirmed = unique(raw.serverConfirmedCollections);
      var cacheOnly = unique(raw.cacheOnlyCollections);
      var denied = unique(raw.deniedCollections);
      var errors = raw.snapshotErrors && typeof raw.snapshotErrors === 'object' ? raw.snapshotErrors : {};
      var requiredFailed = hydration.required.filter(function (name) { return !!errors[name] || denied.indexOf(name) >= 0; });
      var requiredMissing = hydration.required.filter(function (name) { return confirmed.indexOf(name) < 0 && requiredFailed.indexOf(name) < 0; });
      var requiredObservedButUnconfirmed = requiredMissing.filter(function (name) { return observed.indexOf(name) >= 0 || cacheOnly.indexOf(name) >= 0; });
      var optionalFailed = hydration.optional.filter(function (name) { return !!errors[name] || denied.indexOf(name) >= 0; });
      var optionalMissing = hydration.optional.filter(function (name) { return confirmed.indexOf(name) < 0 && optionalFailed.indexOf(name) < 0; });
      var ready = requiredMissing.length === 0 && requiredFailed.length === 0;
      var hardBlocked = ['blocked-tenant', 'blocked-no-collections', 'blocked-no-database', 'detached'].indexOf(text(raw.status)) >= 0;
      var normalizedStatus = hardBlocked ? text(raw.status) : requiredFailed.length ? (text(raw.status) === 'snapshot-error' ? 'snapshot-error' : 'attach-error') : ready ? 'ready-read-only' : 'waiting-snapshots';
      return Object.assign({}, raw, {
        version: VERSION,
        hydrationContractVersion: hydration.version,
        hydrationContractSource: hydration.source,
        requiredCollections: hydration.required.slice(),
        optionalCollections: hydration.optional.slice(),
        requiredMissing: requiredMissing,
        requiredObservedButUnconfirmed: requiredObservedButUnconfirmed,
        requiredFailed: requiredFailed,
        serverConfirmedCollections: confirmed,
        cacheOnlyCollections: cacheOnly,
        optionalMissing: optionalMissing,
        optionalFailed: optionalFailed,
        optionalDegraded: optionalMissing.length > 0 || optionalFailed.length > 0,
        ready: ready && !hardBlocked,
        status: ready && !hardBlocked ? 'ready-read-only' : normalizedStatus,
        noFallback: true,
        writeEnabled: false,
        writeAuthorized: false,
        requiredReadinessAuthority: MARKER,
        authoritativeServerSnapshotRequired: true,
        authoritativeFirstReadRequired: true
      });
    }

    base._attachSnapshots = function () { baseAttach(); var s = status(); return s.requiredFailed.length === 0 && ['blocked-tenant', 'blocked-no-collections', 'blocked-no-database'].indexOf(s.status) < 0; };
    base._productStatus = status;
    base.raw = function () { var out = baseRaw() || {}; out.__backend = status(); return out; };

    function invalidateAdvisorProjection(collection) {
      if (!collection || collection === '*' || collection === 'asesores' || advisorProjectionSources.indexOf(collection) >= 0) advisorProjectionCache = null;
    }

    function advisorProjection() {
      var durable = baseAll('asesores') || [];
      if (durable.length) return durable.map(clone);
      if (advisorProjectionCache) return advisorProjectionCache.map(clone);
      var map = {};
      function add(id, name, extra) { id = text(id); if (!id) return; var prior = map[id] || {}; var label = text(name || prior.nombre) || 'Asesor asignado'; map[id] = Object.assign({}, prior, extra || {}, { id: id, nombre: label, name: label, displayName: label, projectionOnly: true, projectionSource: 'active-membership-and-canonical-relations', activo: true, estado: 'activo' }); }
      try { var active = window.Orbit.auth && window.Orbit.auth.productUser || {}; if (active.advisorId) add(active.advisorId, active.nombre, { email: active.email, roles: active.roles || [], rol: active.activeRole || active.rol || 'Asesor' }); } catch (error) {}
      advisorProjectionSources.forEach(function (collection) { (baseAll(collection) || []).forEach(function (row) { add(row && (row.asesorId || row.advisorId || row.vendedorId || row.responsableId), row && (row.asesorNombre || row.advisorName || row.vendedorNombre || row.responsableNombre), {}); }); });
      advisorProjectionCache = Object.keys(map).map(function (id) { return clone(map[id]); });
      return advisorProjectionCache.map(clone);
    }

    if (typeof base.on === 'function') {
      base.on('*', function (collection) { invalidateAdvisorProjection(collection); });
    }
    base.all = function (collection) { return collection === 'asesores' ? advisorProjection() : baseAll(collection); };
    base.get = function (collection, id) { if (collection !== 'asesores') return baseGet(collection, id); return advisorProjection().find(function (row) { return rowId(row) === id; }) || null; };
    base.where = function (collection, fieldOrPredicate, opOrValue, maybeValue) { if (collection !== 'asesores') return baseWhere.apply(null, arguments); var rows = advisorProjection(); if (typeof fieldOrPredicate === 'function') return rows.filter(fieldOrPredicate); if (fieldOrPredicate && typeof fieldOrPredicate === 'object') return rows.filter(function (row) { return Object.keys(fieldOrPredicate).every(function (key) { return row[key] === fieldOrPredicate[key]; }); }); var op = arguments.length >= 4 ? opOrValue : '=='; var value = arguments.length >= 4 ? maybeValue : opOrValue; return rows.filter(function (row) { return (op === '==' || op === '=') ? row[fieldOrPredicate] === value : op === '!=' ? row[fieldOrPredicate] !== value : false; }); };
    base.find = function (collection, predicate) { if (collection !== 'asesores') return baseFind(collection, predicate); return typeof predicate === 'function' ? (advisorProjection().find(predicate) || null) : null; };
    base.__productHydrationRequiredOptionalP0 = Object.freeze({ version: VERSION, marker: MARKER, writes: 0, noFallback: true, authoritativeServerSnapshotRequired: true, authoritativeFirstReadRequired: true, advisorProjectionMemoized: true });
    return base;
  }

  if (typeof originalCreate !== 'function') throw new Error('product_readonly_store_factory_missing');
  window.Orbit.createFirestoreProductReadOnlyStoreP0 = function (deps, options) {
    var hydration = contract();
    var next = Object.assign({}, options || {}, {
      collections: hydration.all.slice(),
      requiredCollections: hydration.required.slice(),
      authoritativeFirstReadRequired: true
    });
    return wrapStore(originalCreate(deps, next), hydration);
  };
  window.Orbit.productHydrationRequiredOptionalP0 = Object.freeze({ VERSION: VERSION, MARKER: MARKER, contract: contract, writesAuthorized: false, noFallback: true, authoritativeServerSnapshotRequired: true, authoritativeFirstReadRequired: true, advisorProjectionMemoized: true });
})();
