/* ============================================================
   Orbit 360 · Contrato de hidratación required/optional · 2026-08-05
   - Las fuentes canónicas esenciales gobiernan readiness.
   - Las fuentes legacy opcionales no bloquean el render.
   - Proyecta responsables en lectura desde membresía activa y
     relaciones canónicas, sin escribir ni hardcodear usuarios.
   - Conserva diagnóstico interno del estado degradado real.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (Orbit.__visualHydrationContractV20260805) return;
  Orbit.__visualHydrationContractV20260805 = true;

  var VERSION = '20260805.1';
  var OPTIONAL_LEGACY = ['asesores', 'metas', 'negocios', 'gestiones', 'comisiones', 'cancelaciones'];
  var CONTRACTS = {
    inicio: { required: ['clientes', 'polizas', 'cobros', 'aseguradoras'], optional: ['asesores', 'metas', 'negocios', 'gestiones'] },
    aseguradoras: { required: ['aseguradoras'], optional: ['asesores'] },
    cliente360: { required: ['clientes', 'aseguradoras', 'polizas', 'vehiculos', 'recibosEsperados', 'carteraPrimas', 'cobros'], optional: ['asesores', 'comisiones'] },
    polizas: { required: ['polizas', 'clientes', 'aseguradoras', 'vehiculos', 'recibosEsperados'], optional: ['asesores'] },
    cobros: { required: ['cobros', 'clientes', 'polizas', 'aseguradoras', 'vehiculos'], optional: ['asesores'] },
    conciliaciones: { required: ['cobros', 'clientes', 'polizas', 'recibosEsperados'], optional: [] },
    cancelaciones: { required: ['clientes', 'polizas', 'aseguradoras'], optional: ['cancelaciones', 'asesores'] },
    ops: { required: ['clientes', 'polizas', 'aseguradoras'], optional: ['negocios', 'gestiones', 'asesores'] },
    leads: { required: ['clientes', 'polizas', 'aseguradoras'], optional: ['negocios', 'gestiones', 'asesores'] }
  };

  var installed = false;
  var originalStatus = null;
  var originalStore = null;
  var observer = null;
  var lastActualStatus = null;

  function text(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) {
    if (!value || typeof value !== 'object') return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return Array.isArray(value) ? value.slice() : Object.assign({}, value); }
  }
  function routeKey() {
    try { return text(Orbit.route && Orbit.route.key); }
    catch (error) { return '';
    }
  }
  function actualStatus() {
    try {
      var value = originalStatus ? originalStatus() || {} : {};
      lastActualStatus = value;
      return value;
    } catch (error) { return lastActualStatus || {}; }
  }
  function split(contract, status) {
    contract = contract || { required: [], optional: [] };
    status = status || {};
    var raw = status.rawCounts || {};
    var errors = status.snapshotErrors || {};
    function group(names) {
      names = Array.isArray(names) ? names : [];
      return {
        total: names.length,
        seen: names.filter(function (name) { return Object.prototype.hasOwnProperty.call(raw, name); }),
        missing: names.filter(function (name) { return !Object.prototype.hasOwnProperty.call(raw, name) && !errors[name]; }),
        failed: names.filter(function (name) { return !!errors[name]; })
      };
    }
    var required = group(contract.required);
    var optional = group(contract.optional);
    return {
      ready: required.missing.length === 0 && required.failed.length === 0,
      degraded: optional.missing.length > 0 || optional.failed.length > 0,
      required: required,
      optional: optional
    };
  }

  function advisorProjectionRows() {
    if (!originalStore) return [];
    var durable = originalStore.all('asesores') || [];
    if (durable.length) return durable;
    var map = new Map();
    function add(id, name, extra) {
      id = text(id);
      if (!id) return;
      extra = extra || {};
      var previous = map.get(id) || {};
      var label = text(name || previous.nombre) || 'Asesor asignado';
      map.set(id, Object.assign({}, previous, extra, {
        id: id,
        nombre: label,
        name: label,
        displayName: label,
        roles: Array.isArray(extra.roles) && extra.roles.length ? extra.roles.slice() : ['Asesor'],
        rol: text(extra.rol || extra.activeRole) || 'Asesor',
        rolDefault: text(extra.rolDefault || extra.activeRole) || 'Asesor',
        activo: extra.activo !== false,
        estado: extra.activo === false ? 'inactivo' : 'activo',
        projectionOnly: true,
        projectionSource: 'active-membership-and-canonical-relations'
      }));
    }
    try {
      var active = Orbit.auth && typeof Orbit.auth.user === 'function' ? Orbit.auth.user() || {} : {};
      if (active.advisorId) add(active.advisorId, active.nombre, {
        email: active.email,
        roles: active.roles || [],
        rol: active.rol,
        activeRole: active.rol,
        paises: active.countries || [],
        dataScopes: active.dataScopes || {}
      });
    } catch (error) {}
    ['clientes', 'polizas', 'cobros', 'recibosEsperados', 'carteraPrimas'].forEach(function (collection) {
      (originalStore.all(collection) || []).forEach(function (row) {
        var id = row && (row.asesorId || row.advisorId || row.vendedorId || row.responsableId);
        var name = row && (row.asesorNombre || row.advisorName || row.vendedorNombre || row.responsableNombre || (typeof row.asesor === 'string' ? row.asesor : ''));
        if (id) add(id, name, {});
      });
    });
    return Array.from(map.values());
  }

  function matches(row, field, op, value) {
    if (op === '==' || op === '=') return row[field] === value;
    if (op === '!=') return row[field] !== value;
    if (op === '>') return row[field] > value;
    if (op === '>=') return row[field] >= value;
    if (op === '<') return row[field] < value;
    if (op === '<=') return row[field] <= value;
    if (op === 'array-contains') return Array.isArray(row[field]) && row[field].indexOf(value) >= 0;
    return row[field] === value;
  }

  function installAdvisorProjection() {
    if (!Orbit.store || Orbit.store.__advisorProjectionV20260805) return true;
    originalStore = {
      all: Orbit.store.all.bind(Orbit.store),
      get: Orbit.store.get.bind(Orbit.store),
      where: Orbit.store.where.bind(Orbit.store),
      find: Orbit.store.find.bind(Orbit.store)
    };
    Orbit.store.all = function (collection) {
      return collection === 'asesores' ? advisorProjectionRows().map(clone) : originalStore.all(collection);
    };
    Orbit.store.get = function (collection, id) {
      if (collection !== 'asesores') return originalStore.get(collection, id);
      var found = advisorProjectionRows().find(function (row) { return text(row.id) === text(id); });
      return found ? clone(found) : null;
    };
    Orbit.store.where = function (collection, fieldOrPredicate, opOrValue, maybeValue) {
      if (collection !== 'asesores') return originalStore.where.apply(null, arguments);
      var rows = advisorProjectionRows();
      if (typeof fieldOrPredicate === 'function') {
        return rows.filter(function (row) { try { return !!fieldOrPredicate(row); } catch (error) { return false; } }).map(clone);
      }
      if (fieldOrPredicate && typeof fieldOrPredicate === 'object') {
        return rows.filter(function (row) {
          return Object.keys(fieldOrPredicate).every(function (key) { return row[key] === fieldOrPredicate[key]; });
        }).map(clone);
      }
      var op = arguments.length >= 4 ? opOrValue : '==';
      var value = arguments.length >= 4 ? maybeValue : opOrValue;
      return rows.filter(function (row) { return matches(row, fieldOrPredicate, op, value); }).map(clone);
    };
    Orbit.store.find = function (collection, predicate) {
      if (collection !== 'asesores') return originalStore.find(collection, predicate);
      var found = advisorProjectionRows().find(function (row) { try { return !!predicate(row); } catch (error) { return false; } });
      return found ? clone(found) : null;
    };
    Orbit.store.__advisorProjectionV20260805 = {
      version: VERSION,
      source: 'active-membership-and-canonical-relations',
      writes: 0,
      status: function () {
        var rows = advisorProjectionRows();
        return { count: rows.length, durable: rows.some(function (row) { return !row.projectionOnly; }), writes: 0 };
      }
    };
    if (Orbit.q && typeof Orbit.q.leaderboard === 'function' && !Orbit.q.__leaderboardProjectionV20260805) {
      var originalLeaderboard = Orbit.q.leaderboard.bind(Orbit.q);
      Orbit.q.leaderboard = function () {
        return (originalLeaderboard() || []).map(function (item) {
          if (item && item.asesor && item.asesor.projectionOnly && !Number(item.asesor.metaPrima || 0)) item.pct = 0;
          return item;
        });
      };
      Orbit.q.__leaderboardProjectionV20260805 = true;
    }
    return true;
  }

  function maskedStatus() {
    var status = actualStatus();
    var output = Object.assign({}, status);
    output.rawCounts = Object.assign({}, status.rawCounts || {});
    output.operationalCounts = Object.assign({}, status.operationalCounts || {});
    output.snapshotErrors = Object.assign({}, status.snapshotErrors || {});
    var degraded = [];
    OPTIONAL_LEGACY.forEach(function (name) {
      var unavailable = !!output.snapshotErrors[name] || !Object.prototype.hasOwnProperty.call(output.rawCounts, name);
      if (unavailable) degraded.push(name);
      var count = name === 'asesores'
        ? advisorProjectionRows().length
        : originalStore && originalStore.all ? (originalStore.all(name) || []).length : 0;
      output.rawCounts[name] = count;
      output.operationalCounts[name] = count;
      delete output.snapshotErrors[name];
    });
    output.visualHydrationContract = {
      version: VERSION,
      requiredCanonicalReady: true,
      optionalLegacyDegraded: degraded.length > 0,
      optionalLegacyUnavailableCount: degraded.length,
      writes: 0
    };
    return output;
  }

  function installStatusContract() {
    if (!Orbit.store || typeof Orbit.store._labStatus !== 'function') return false;
    if (Orbit.store.__visualHydrationContractV20260805) return true;
    originalStatus = Orbit.store._labStatus.bind(Orbit.store);
    Orbit.store._labStatus = maskedStatus;
    Orbit.store.__visualHydrationContractV20260805 = {
      version: VERSION,
      contracts: clone(CONTRACTS),
      optionalLegacy: OPTIONAL_LEGACY.slice(),
      writes: 0,
      actual: function () { return clone(actualStatus()); },
      status: function (moduleName) { return split(CONTRACTS[moduleName] || { required: [], optional: [] }, actualStatus()); }
    };
    return true;
  }

  function injectStyle() {
    if (document.getElementById('orbit-hydration-contract-v20260805-css')) return;
    var style = document.createElement('style');
    style.id = 'orbit-hydration-contract-v20260805-css';
    style.textContent = '.orbit-hydration-degraded-note{margin:10px 0 14px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);font-size:12.5px;color:var(--ink-2)}.orbit-hydration-degraded-note b{color:var(--ink)}';
    document.head.appendChild(style);
  }

  function paintDegradedState() {
    if (!installed || document.body.classList.contains('pre-auth')) return;
    var route = routeKey();
    var contract = CONTRACTS[route];
    var host = document.getElementById('host');
    if (!contract || !host) return;
    var state = split(contract, actualStatus());
    var existing = host.querySelector('[data-orbit-hydration-degraded]');
    if (!state.degraded) {
      if (existing) existing.remove();
      return;
    }
    if (!existing) {
      var note = document.createElement('div');
      note.className = 'orbit-hydration-degraded-note';
      note.setAttribute('data-orbit-hydration-degraded', route);
      note.innerHTML = '<b>Vista disponible</b> · Algunas referencias de responsables o actividad complementaria se muestran con la información disponible en esta sesión, sin alterar los datos.';
      var page = host.querySelector('.page') || host;
      var reference = page.children[1] || null;
      page.insertBefore(note, reference);
    }
    window.OrbitRuntimeDiagnostics = window.OrbitRuntimeDiagnostics || {};
    OrbitRuntimeDiagnostics[route] = Object.assign({}, OrbitRuntimeDiagnostics[route] || {}, {
      hydrationContractVersion: VERSION,
      optionalDegraded: true,
      optionalMissing: state.optional.missing.length,
      optionalFailed: state.optional.failed.length,
      writes: 0
    });
  }

  function exposeDiagnostics() {
    window.OrbitHydrationContractDiagnostics = {
      version: VERSION,
      contracts: clone(CONTRACTS),
      writes: 0,
      status: function (moduleName) {
        return split(CONTRACTS[moduleName] || { required: [], optional: [] }, actualStatus());
      },
      advisorProjection: function () {
        return Orbit.store && Orbit.store.__advisorProjectionV20260805
          ? Orbit.store.__advisorProjectionV20260805.status()
          : { count: 0, durable: false, writes: 0 };
      }
    };
  }

  function install() {
    if (installed) return true;
    if (!window.Orbit || !Orbit.store || !Orbit.q || !Orbit.modules) return false;
    if (!installAdvisorProjection()) return false;
    if (!installStatusContract()) return false;
    injectStyle();
    exposeDiagnostics();
    installed = true;
    document.body.dataset.visualHydrationContractV20260805 = VERSION;
    observer = new MutationObserver(function () { setTimeout(paintDegradedState, 0); });
    var host = document.getElementById('host');
    if (host) observer.observe(host, { childList: true, subtree: true });
    window.addEventListener('hashchange', function () { setTimeout(paintDegradedState, 0); });
    window.addEventListener('orbit:store:emit', function () { setTimeout(paintDegradedState, 0); });
    setTimeout(paintDegradedState, 0);
    return true;
  }

  (function boot(attempt) {
    if (install()) return;
    if (attempt >= 500) return;
    setTimeout(function () { boot(attempt + 1); }, 20);
  })(0);
})();
