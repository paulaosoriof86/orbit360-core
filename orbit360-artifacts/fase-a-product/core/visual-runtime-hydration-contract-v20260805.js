/* ============================================================
   Orbit 360 · Contrato de hidratación required/optional · 2026-08-05
   - Las fuentes canónicas esenciales gobiernan readiness.
   - Las fuentes legacy opcionales no bloquean el render.
   - Proyecta responsables en lectura desde membresía activa y
     relaciones canónicas, sin escribir ni hardcodear usuarios.
   - Conserva diagnóstico interno del estado degradado real.
   - Revalida el owner Orbit.store para evitar drift de composición.
   - v17: cachea la proyección read-only de responsables e instala
     OrbitHydrationContractDiagnostics como autoridad única de readiness.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (Orbit.__visualHydrationContractV20260805) return;
  Orbit.__visualHydrationContractV20260805 = true;

  var VERSION = '20260807.4-transactional-owner-reentrant-readiness';
  var OPTIONAL_LEGACY = ['asesores', 'metas', 'negocios', 'gestiones', 'comisiones', 'cancelaciones'];
  var ADVISOR_PROJECTION_SOURCES = ['asesores', 'clientes', 'polizas', 'cobros', 'recibosEsperados', 'carteraPrimas'];
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
  var installedStore = null;
  var boundStore = null;
  var storeOwnerGeneration = 0;
  var listenersBound = false;
  var projectionListenerBound = false;
  var originalStatus = null;
  var originalStore = null;
  var observer = null;
  var lastActualStatus = null;
  var advisorProjectionCache = null;
  var advisorProjectionIndex = null;
  var advisorProjectionBuilds = 0;
  var advisorProjectionInvalidations = 0;
  var advisorProjectionAuthSignature = '';
  var unifiedModuleWrapState = {};
  var routeWaiters = {};

  function text(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) {
    if (!value || typeof value !== 'object') return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return Array.isArray(value) ? value.slice() : Object.assign({}, value); }
  }
  function routeKey() {
    try { return text(Orbit.route && Orbit.route.key); }
    catch (error) { return ''; }
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

  function activeAdvisorSignature() {
    try {
      var active = Orbit.auth && typeof Orbit.auth.user === 'function' ? Orbit.auth.user() || {} : {};
      return JSON.stringify({
        advisorId: text(active.advisorId),
        nombre: text(active.nombre),
        email: text(active.email),
        rol: text(active.rol),
        roles: Array.isArray(active.roles) ? active.roles.slice() : [],
        countries: Array.isArray(active.countries) ? active.countries.slice() : [],
        dataScopes: active.dataScopes || {}
      });
    } catch (error) { return ''; }
  }
  function invalidateAdvisorProjection() {
    if (advisorProjectionCache !== null || advisorProjectionIndex !== null) advisorProjectionInvalidations += 1;
    advisorProjectionCache = null;
    advisorProjectionIndex = null;
  }
  function buildAdvisorProjection(signature) {
    if (!originalStore) return [];
    advisorProjectionBuilds += 1;
    var durable = originalStore.all('asesores') || [];
    var rows;
    if (durable.length) {
      rows = durable;
    } else {
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
      rows = Array.from(map.values());
    }
    advisorProjectionCache = rows;
    advisorProjectionIndex = new Map(rows.map(function (row) { return [text(row.id), row]; }));
    advisorProjectionAuthSignature = signature;
    return advisorProjectionCache;
  }
  function advisorProjectionRows() {
    if (!originalStore) return [];
    var signature = activeAdvisorSignature();
    if (advisorProjectionCache !== null && signature !== advisorProjectionAuthSignature) invalidateAdvisorProjection();
    return advisorProjectionCache !== null ? advisorProjectionCache : buildAdvisorProjection(signature);
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

  function originalStoreReady() {
    return !!(originalStore && ['all', 'get', 'where', 'find'].every(function (name) { return typeof originalStore[name] === 'function'; }));
  }
  function originalStatusReady() { return typeof originalStatus === 'function'; }
  function ownerValid() {
    return !!(boundStore && boundStore === Orbit.store && originalStoreReady() && originalStatusReady());
  }
  function resetBoundOwnerForStoreChange() {
    installed = false;
    installedStore = null;
    originalStatus = null;
    originalStore = null;
    lastActualStatus = null;
    projectionListenerBound = false;
    invalidateAdvisorProjection();
    advisorProjectionAuthSignature = '';
    unifiedModuleWrapState = {};
    routeWaiters = {};
  }
  function bindStoreOwner() {
    if (!Orbit.store || typeof Orbit.store.all !== 'function' || typeof Orbit.store.get !== 'function' || typeof Orbit.store.where !== 'function' || typeof Orbit.store.find !== 'function' || typeof Orbit.store._labStatus !== 'function') return false;
    if (boundStore === Orbit.store && originalStoreReady() && originalStatusReady()) return true;
    if (boundStore && boundStore !== Orbit.store) resetBoundOwnerForStoreChange();
    if (boundStore === Orbit.store && (!originalStoreReady() || !originalStatusReady())) return false;
    if (Orbit.store.__advisorProjectionV20260805 || Orbit.store.__visualHydrationContractV20260805) return false;
    boundStore = Orbit.store;
    originalStore = {
      all: Orbit.store.all.bind(Orbit.store),
      get: Orbit.store.get.bind(Orbit.store),
      where: Orbit.store.where.bind(Orbit.store),
      find: Orbit.store.find.bind(Orbit.store)
    };
    originalStatus = Orbit.store._labStatus.bind(Orbit.store);
    storeOwnerGeneration += 1;
    return ownerValid();
  }

  function installAdvisorProjection() {
    if (!Orbit.store || !ownerValid()) return false;
    if (Orbit.store.__advisorProjectionV20260805) return originalStoreReady();
    Orbit.store.all = function (collection) {
      return collection === 'asesores' ? advisorProjectionRows().map(clone) : originalStore.all(collection);
    };
    Orbit.store.get = function (collection, id) {
      if (collection !== 'asesores') return originalStore.get(collection, id);
      advisorProjectionRows();
      var found = advisorProjectionIndex && advisorProjectionIndex.get(text(id));
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
      invalidate: invalidateAdvisorProjection,
      status: function () {
        var rows = advisorProjectionRows();
        return {
          count: rows.length,
          durable: rows.some(function (row) { return !row.projectionOnly; }),
          cacheValid: advisorProjectionCache !== null,
          builds: advisorProjectionBuilds,
          invalidations: advisorProjectionInvalidations,
          writes: 0
        };
      }
    };
    if (!projectionListenerBound && Orbit.store && typeof Orbit.store.on === 'function') {
      projectionListenerBound = true;
      Orbit.store.on('*', function (collection) {
        if (collection === '*' || ADVISOR_PROJECTION_SOURCES.indexOf(collection) >= 0) invalidateAdvisorProjection();
      });
    }
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
    var activeContract = split(CONTRACTS[routeKey()] || { required: [], optional: [] }, status);
    output.visualHydrationContract = {
      version: VERSION,
      requiredCanonicalReady: activeContract.ready,
      optionalLegacyDegraded: degraded.length > 0,
      optionalLegacyUnavailableCount: degraded.length,
      storeBound: boundStore === Orbit.store && ownerValid(),
      ownerValid: ownerValid(),
      storeOwnerGeneration: storeOwnerGeneration,
      readinessAuthority: 'OrbitHydrationContractDiagnostics',
      advisorProjectionBuilds: advisorProjectionBuilds,
      advisorProjectionInvalidations: advisorProjectionInvalidations,
      writes: 0
    };
    return output;
  }

  function installStatusContract() {
    if (!Orbit.store || !ownerValid()) return false;
    if (Orbit.store.__visualHydrationContractV20260805) return originalStatusReady();
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

  function readinessLoadingHtml(moduleName, state) {
    var required = state.required || { total: 0, seen: [], missing: [], failed: [] };
    var pct = required.total ? Math.round(required.seen.length / required.total * 100) : 0;
    var blocked = required.failed.length > 0;
    return '<div class="page orbit-load-state"><div class="card orbit-load-card"><div class="orbit-load-spin"></div><div class="crumb">' + text(moduleName) + '</div><h2 style="margin:0;font-family:var(--f-display)">' + (blocked ? 'No fue posible completar la carga' : 'Preparando datos del módulo') + '</h2><p class="muted">' + (blocked ? 'Una fuente requerida no respondió.' : 'La vista aparecerá cuando las fuentes requeridas estén listas.') + '</p><div class="orbit-load-progress"><i style="width:' + pct + '%"></i></div><div class="muted" style="font-size:12px">' + required.seen.length + ' de ' + required.total + ' fuentes requeridas listas</div></div></div>';
  }
  function requestUnifiedRouteRefresh(moduleName) {
    if (routeWaiters[moduleName]) return;
    var started = Date.now();
    var unsub = Orbit.store && typeof Orbit.store.on === 'function' ? Orbit.store.on('*', function () {
      if (routeKey() !== moduleName) return;
      var state = split(CONTRACTS[moduleName] || { required: [], optional: [] }, actualStatus());
      if (state.ready || state.required.failed.length || Date.now() - started > 20000) {
        if (typeof unsub === 'function') unsub();
        delete routeWaiters[moduleName];
        try { window.dispatchEvent(new HashChangeEvent('hashchange')); }
        catch (error) { window.dispatchEvent(new Event('hashchange')); }
      }
    }) : null;
    routeWaiters[moduleName] = unsub || true;
    setTimeout(function () {
      if (!routeWaiters[moduleName]) return;
      if (typeof unsub === 'function') unsub();
      delete routeWaiters[moduleName];
      try { window.dispatchEvent(new HashChangeEvent('hashchange')); }
      catch (error) { window.dispatchEvent(new Event('hashchange')); }
    }, 20500);
  }
  function installUnifiedModuleReadiness() {
    if (!Orbit.modules) return false;
    var names = Object.keys(CONTRACTS);
    var wrapped = 0;
    names.forEach(function (moduleName) {
      var registry = Orbit.modules;
      var mod = registry[moduleName];
      if (!mod || typeof mod.render !== 'function') return;
      if (mod.__visualHydrationReadinessV17) {
        unifiedModuleWrapState[moduleName] = 'existing';
        wrapped += 1;
        return;
      }
      var original = mod.render.bind(mod);
      var wrappedRender = function (host) {
        var state = split(CONTRACTS[moduleName] || { required: [], optional: [] }, actualStatus());
        window.OrbitRuntimeDiagnostics = window.OrbitRuntimeDiagnostics || {};
        OrbitRuntimeDiagnostics[moduleName] = Object.assign({}, OrbitRuntimeDiagnostics[moduleName] || {}, {
          hydrationContractVersion: VERSION,
          readinessAuthority: 'OrbitHydrationContractDiagnostics',
          requiredReady: state.ready,
          requiredMissing: state.required.missing.slice(),
          requiredFailed: state.required.failed.slice(),
          optionalDegraded: state.degraded,
          writes: 0
        });
        if (!state.ready) {
          host.innerHTML = readinessLoadingHtml(moduleName, state);
          requestUnifiedRouteRefresh(moduleName);
          return;
        }
        return original(host);
      };
      try {
        var renderDescriptor = Object.getOwnPropertyDescriptor(mod, 'render');
        var moduleMutable = !Object.isFrozen(mod) && (!renderDescriptor || renderDescriptor.writable !== false || typeof renderDescriptor.set === 'function');
        if (moduleMutable) {
          mod.render = wrappedRender;
          mod.__visualHydrationReadinessV17 = { version: VERSION, authority: 'OrbitHydrationContractDiagnostics', original: original };
          unifiedModuleWrapState[moduleName] = 'direct';
          wrapped += 1;
          return;
        }
        var registryDescriptor = Object.getOwnPropertyDescriptor(registry, moduleName);
        var registryMutable = !Object.isFrozen(registry) && (!registryDescriptor || registryDescriptor.writable !== false || typeof registryDescriptor.set === 'function' || registryDescriptor.configurable === true);
        if (registryMutable) {
          var replacement = Object.create(mod);
          Object.defineProperty(replacement, 'render', { value: wrappedRender, writable: true, configurable: true, enumerable: true });
          Object.defineProperty(replacement, '__visualHydrationReadinessV17', { value: { version: VERSION, authority: 'OrbitHydrationContractDiagnostics', original: original }, writable: false, configurable: false, enumerable: false });
          registry[moduleName] = replacement;
          unifiedModuleWrapState[moduleName] = 'registry-proxy';
          wrapped += 1;
        }
      } catch (error) {
        unifiedModuleWrapState[moduleName] = 'failed';
      }
    });
    return names.every(function (name) {
      var mod = Orbit.modules && Orbit.modules[name];
      return !!(mod && mod.__visualHydrationReadinessV17);
    });
  }

  function injectStyle() {
    if (document.getElementById('orbit-hydration-contract-v20260805-css')) return;
    var style = document.createElement('style');
    style.id = 'orbit-hydration-contract-v20260805-css';
    style.textContent = '.orbit-hydration-degraded-note{margin:10px 0 14px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);font-size:12.5px;color:var(--ink-2)}.orbit-hydration-degraded-note b{color:var(--ink)}';
    document.head.appendChild(style);
  }

  function paintDegradedState() {
    if (!installed || installedStore !== Orbit.store || document.body.classList.contains('pre-auth')) return;
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
      readinessAuthority: 'OrbitHydrationContractDiagnostics',
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
      mounted: function () {
        var modulesReady = Object.keys(CONTRACTS).every(function (name) {
          var mod = Orbit.modules && Orbit.modules[name];
          return !!(mod && mod.__visualHydrationReadinessV17);
        });
        return !!(installed && installedStore === Orbit.store && boundStore === Orbit.store && ownerValid() && Orbit.store && Orbit.store.__visualHydrationContractV20260805 && Orbit.store.__advisorProjectionV20260805 && modulesReady);
      },
      ownerValid: function () { return ownerValid(); },
      storeOwner: function () {
        return { valid: ownerValid(), generation: storeOwnerGeneration, bound: boundStore === Orbit.store, originalStoreReady: originalStoreReady(), originalStatusReady: originalStatusReady(), writes: 0 };
      },
      unifiedReadinessMounted: function () {
        return Object.keys(CONTRACTS).every(function (name) {
          var mod = Orbit.modules && Orbit.modules[name];
          return !!(mod && mod.__visualHydrationReadinessV17);
        });
      },
      status: function (moduleName) {
        return split(CONTRACTS[moduleName] || { required: [], optional: [] }, actualStatus());
      },
      advisorProjection: function () {
        return Orbit.store && Orbit.store.__advisorProjectionV20260805
          ? Orbit.store.__advisorProjectionV20260805.status()
          : { count: 0, durable: false, cacheValid: false, builds: 0, invalidations: 0, writes: 0 };
      },
      readinessAuthority: 'OrbitHydrationContractDiagnostics'
    };
  }

  function bindUiObserversOnce() {
    if (listenersBound) return;
    listenersBound = true;
    observer = new MutationObserver(function () { setTimeout(paintDegradedState, 0); });
    var host = document.getElementById('host');
    if (host) observer.observe(host, { childList: true, subtree: true });
    window.addEventListener('hashchange', function () { setTimeout(paintDegradedState, 0); });
    window.addEventListener('orbit:store:emit', function () { setTimeout(paintDegradedState, 0); });
  }

  function install() {
    if (!window.Orbit || !Orbit.store) return false;
    if (!bindStoreOwner()) return false;
    exposeDiagnostics();
    if (!Orbit.q || !Orbit.modules) return false;
    if (!installAdvisorProjection()) return false;
    if (!installStatusContract()) return false;
    exposeDiagnostics();
    if (!installUnifiedModuleReadiness()) return false;
    injectStyle();
    installed = true;
    installedStore = Orbit.store;
    exposeDiagnostics();
    bindUiObserversOnce();
    document.body.dataset.visualHydrationContractV20260805 = VERSION;
    document.body.dataset.visualHydrationContractStoreBound = 'true';
    document.body.dataset.visualHydrationOwnerValid = ownerValid() ? 'true' : 'false';
    document.body.dataset.visualReadinessAuthority = 'OrbitHydrationContractDiagnostics';
    setTimeout(paintDegradedState, 0);
    return true;
  }

  (function boot(attempt) {
    install();
    if (attempt >= 500) return;
    setTimeout(function () { boot(attempt + 1); }, installed ? 100 : 20);
  })(0);
})();
