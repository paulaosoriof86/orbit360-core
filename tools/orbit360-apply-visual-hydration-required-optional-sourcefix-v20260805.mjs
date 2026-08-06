#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const ROOTFIX_REL = 'orbit360-platform/core/visual-runtime-rootfix-v20260805.js';
const LOADER_REL = 'orbit360-platform/core/backend-lab-loader.js';
const INDEX_REL = 'orbit360-platform/index.html';
const OUT_REL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-hydration-required-optional-source-apply-sanitized-v20260805.json';

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function write(rel, content) { fs.writeFileSync(path.join(ROOT, rel), content, 'utf8'); }
function count(text, token) { return text.split(token).length - 1; }
function replaceOnce(source, search, replacement, label) {
  const matches = typeof search === 'string' ? count(source, search) : (source.match(search) || []).length;
  if (matches !== 1) throw new Error(`${label}_MATCHES_${matches}`);
  return source.replace(search, replacement);
}
function syntaxOk(rel) {
  return spawnSync(process.execPath, ['--check', path.join(ROOT, rel)], { encoding: 'utf8' }).status === 0;
}
function persist(payload) {
  const target = path.join(ROOT, OUT_REL);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

try {
  let source = read(ROOTFIX_REL);
  source = replaceOnce(source, "  var VERSION = '20260805.1';", "  var VERSION = '20260805.2';", 'VERSION');

  source = replaceOnce(
    source,
    /  var MODULE_DEPS = \{[\s\S]*?\n  \};\n\n  function text/,
    `  var MODULE_CONTRACTS = {\n    inicio: { required: ['clientes', 'polizas', 'cobros', 'aseguradoras'], optional: ['asesores', 'metas', 'negocios', 'gestiones'] },\n    aseguradoras: { required: ['aseguradoras'], optional: ['asesores'] },\n    cliente360: { required: ['clientes', 'aseguradoras', 'polizas', 'vehiculos', 'recibosEsperados', 'carteraPrimas', 'cobros'], optional: ['asesores', 'comisiones'] },\n    polizas: { required: ['polizas', 'clientes', 'aseguradoras', 'vehiculos', 'recibosEsperados'], optional: ['asesores'] },\n    cobros: { required: ['cobros', 'clientes', 'polizas', 'aseguradoras', 'vehiculos'], optional: ['asesores'] },\n    conciliaciones: { required: ['cobros', 'clientes', 'polizas', 'recibosEsperados'], optional: [] },\n    cancelaciones: { required: ['clientes', 'polizas', 'aseguradoras'], optional: ['cancelaciones', 'asesores'] },\n    ops: { required: ['clientes', 'polizas', 'aseguradoras'], optional: ['negocios', 'gestiones', 'asesores'] },\n    leads: { required: ['clientes', 'polizas', 'aseguradoras'], optional: ['negocios', 'gestiones', 'asesores'] }\n  };\n\n  function text`,
    'MODULE_CONTRACTS'
  );

  source = replaceOnce(
    source,
    /  function hydrationStatus\(deps\) \{[\s\S]*?\n  \}\n  function loadingHtml/,
    `  function hydrationStatus(contract) {\n    contract = contract || {};\n    var required = Array.isArray(contract.required) ? contract.required : [];\n    var optional = Array.isArray(contract.optional) ? contract.optional : [];\n    var status = labStatus();\n    var raw = status.rawCounts || {};\n    var errors = status.snapshotErrors || {};\n    function split(names) {\n      var seen = names.filter(function (name) { return Object.prototype.hasOwnProperty.call(raw, name); });\n      var missing = names.filter(function (name) { return !Object.prototype.hasOwnProperty.call(raw, name) && !errors[name]; });\n      var failed = names.filter(function (name) { return !!errors[name]; });\n      return { seen: seen, missing: missing, failed: failed, total: names.length };\n    }\n    var essential = split(required);\n    var supplementary = split(optional);\n    return {\n      ready: essential.missing.length === 0 && essential.failed.length === 0,\n      degraded: supplementary.missing.length > 0 || supplementary.failed.length > 0,\n      seen: essential.seen, missing: essential.missing, failed: essential.failed, total: essential.total,\n      required: essential, optional: supplementary\n    };\n  }\n  function loadingHtml`,
    'HYDRATION_STATUS'
  );

  source = replaceOnce(
    source,
    /  function loadingHtml\(route, state\) \{[\s\S]*?\n  \}\n  function requestRouteRefresh/,
    `  function loadingHtml(route, state) {\n    var pct = state.total ? Math.round(state.seen.length / state.total * 100) : 0;\n    var title = state.failed.length ? 'No fue posible completar la carga' : 'Preparando datos del módulo';\n    var detail = state.failed.length\n      ? 'Una fuente esencial no respondió. La vista se mantiene protegida para evitar mostrar cifras incompletas.'\n      : 'La vista aparecerá una sola vez cuando la información esencial esté completa.';\n    return '<div class="page orbit-load-state"><div class="card orbit-load-card"><div class="orbit-load-spin"></div><div class="crumb">' + esc(route) + '</div><h2 style="margin:0;font-family:var(--f-display)">' + title + '</h2><p class="muted">' + detail + '</p><div class="orbit-load-progress"><i style="width:' + pct + '%"></i></div><div class="muted" style="font-size:12px">' + state.seen.length + ' de ' + state.total + ' fuentes esenciales listas</div></div></div>';\n  }\n  function requestRouteRefresh`,
    'LOADING_HTML'
  );

  source = source.replaceAll('hydrationStatus(MODULE_DEPS[moduleName] || [])', 'hydrationStatus(MODULE_CONTRACTS[moduleName] || {})');
  if (count(source, 'MODULE_DEPS') !== 0) throw new Error('MODULE_DEPS_REMAINS');

  const projection = `\n  function installAdvisorProjection() {\n    if (!Orbit.store || Orbit.store.__advisorProjectionV20260805) return;\n    var original = {\n      all: Orbit.store.all.bind(Orbit.store),\n      get: Orbit.store.get.bind(Orbit.store),\n      where: Orbit.store.where.bind(Orbit.store),\n      find: Orbit.store.find.bind(Orbit.store)\n    };\n    function clone(value) {\n      try { return JSON.parse(JSON.stringify(value)); }\n      catch (error) { return value && typeof value === 'object' ? Object.assign({}, value) : value; }\n    }\n    function rows() {\n      var durable = original.all('asesores') || [];\n      if (durable.length) return durable;\n      var projected = new Map();\n      function add(id, name, extra) {\n        id = text(id);\n        if (!id) return;\n        extra = extra || {};\n        var current = projected.get(id) || {};\n        var label = text(name || current.nombre) || 'Asesor asignado';\n        projected.set(id, Object.assign({}, current, extra, {\n          id: id, nombre: label, name: label, displayName: label,\n          roles: Array.isArray(extra.roles) && extra.roles.length ? extra.roles.slice() : ['Asesor'],\n          rol: text(extra.rol || extra.activeRole) || 'Asesor',\n          rolDefault: text(extra.rolDefault || extra.activeRole) || 'Asesor',\n          activo: extra.activo !== false, estado: extra.activo === false ? 'inactivo' : 'activo',\n          projectionOnly: true, projectionSource: 'membership-and-canonical-relations'\n        }));\n      }\n      try {\n        var active = Orbit.auth && typeof Orbit.auth.user === 'function' ? Orbit.auth.user() || {} : {};\n        if (active.advisorId) add(active.advisorId, active.nombre, {\n          email: active.email, roles: active.roles || [], rol: active.rol, activeRole: active.rol,\n          paises: active.countries || [], dataScopes: active.dataScopes || {}\n        });\n      } catch (error) {}\n      ['clientes', 'polizas', 'cobros', 'recibosEsperados', 'carteraPrimas'].forEach(function (collection) {\n        (original.all(collection) || []).forEach(function (row) {\n          var id = row && (row.asesorId || row.advisorId || row.vendedorId || row.responsableId);\n          var name = row && (row.asesorNombre || row.advisorName || row.vendedorNombre || row.responsableNombre || (typeof row.asesor === 'string' ? row.asesor : ''));\n          if (id) add(id, name, {});\n        });\n      });\n      return Array.from(projected.values());\n    }\n    function matches(row, field, op, value) {\n      if (op === '==' || op === '=') return row[field] === value;\n      if (op === '!=') return row[field] !== value;\n      if (op === '>') return row[field] > value;\n      if (op === '>=') return row[field] >= value;\n      if (op === '<') return row[field] < value;\n      if (op === '<=') return row[field] <= value;\n      if (op === 'array-contains') return Array.isArray(row[field]) && row[field].indexOf(value) >= 0;\n      return row[field] === value;\n    }\n    Orbit.store.all = function (collection) {\n      return collection === 'asesores' ? rows().map(clone) : original.all(collection);\n    };\n    Orbit.store.get = function (collection, id) {\n      if (collection !== 'asesores') return original.get(collection, id);\n      var found = rows().find(function (row) { return text(row.id) === text(id); });\n      return found ? clone(found) : null;\n    };\n    Orbit.store.where = function (collection, fieldOrPredicate, opOrValue, maybeValue) {\n      if (collection !== 'asesores') return original.where.apply(null, arguments);\n      var sourceRows = rows();\n      if (typeof fieldOrPredicate === 'function') return sourceRows.filter(function (row) { try { return !!fieldOrPredicate(row); } catch (error) { return false; } }).map(clone);\n      if (fieldOrPredicate && typeof fieldOrPredicate === 'object') return sourceRows.filter(function (row) { return Object.keys(fieldOrPredicate).every(function (key) { return row[key] === fieldOrPredicate[key]; }); }).map(clone);\n      var op = arguments.length >= 4 ? opOrValue : '==';\n      var value = arguments.length >= 4 ? maybeValue : opOrValue;\n      return sourceRows.filter(function (row) { return matches(row, fieldOrPredicate, op, value); }).map(clone);\n    };\n    Orbit.store.find = function (collection, predicate) {\n      if (collection !== 'asesores') return original.find(collection, predicate);\n      var found = rows().find(function (row) { try { return !!predicate(row); } catch (error) { return false; } });\n      return found ? clone(found) : null;\n    };\n    Orbit.store.__advisorProjectionV20260805 = {\n      version: VERSION, source: 'active-membership-and-canonical-relations', writes: 0,\n      status: function () { var list = rows(); return { count: list.length, durable: list.some(function (row) { return !row.projectionOnly; }), writes: 0 }; }\n    };\n    if (Orbit.q && typeof Orbit.q.leaderboard === 'function' && !Orbit.q.__leaderboardProjectionV20260805) {\n      var originalLeaderboard = Orbit.q.leaderboard.bind(Orbit.q);\n      Orbit.q.leaderboard = function () {\n        return (originalLeaderboard() || []).map(function (item) {\n          if (item && item.asesor && item.asesor.projectionOnly && !Number(item.asesor.metaPrima || 0)) item.pct = 0;\n          return item;\n        });\n      };\n      Orbit.q.__leaderboardProjectionV20260805 = true;\n    }\n  }\n\n  function addDegradedNotice(moduleName, host, state) {\n    if (!host || !state || !state.degraded || host.querySelector('[data-orbit-degraded]')) return;\n    var note = document.createElement('div');\n    note.setAttribute('data-orbit-degraded', moduleName);\n    note.className = 'cfg-note';\n    note.style.margin = '10px 0 14px';\n    note.innerHTML = '<b>Vista disponible</b><div class="muted" style="margin-top:4px">Algunas referencias de responsables o actividad complementaria se muestran con la información disponible en esta sesión, sin alterar los datos.</div>';\n    var page = host.querySelector('.page') || host;\n    var reference = page.children[1] || null;\n    page.insertBefore(note, reference);\n  }\n`;
  source = replaceOnce(source, '\n  function buildSummaryCache() {', projection + '\n  function buildSummaryCache() {', 'ADVISOR_PROJECTION_INSERT');

  source = replaceOnce(
    source,
    /    add\('Hidratación',[\s\S]*?\n    add\('Backend de dominio'/,
    `    add('Hidratación esencial', hydration.ready, hydration.ready ? hydration.total + '/' + hydration.total + ' fuentes esenciales listas' : 'La información esencial aún no está completa');\n    add('Información complementaria', !hydration.degraded, hydration.degraded ? 'Disponible con alcance parcial y sin escrituras' : 'Completa', hydration.degraded ? 'WARN' : 'PASS');\n    add('Backend de dominio'`,
    'DIAGNOSTIC_HYDRATION'
  );

  source = replaceOnce(
    source,
    /  function afterRender\(moduleName, host\) \{[\s\S]*?\n  \}\n\n  function wrapModule\(moduleName, deps\) \{[\s\S]*?\n  \}\n\n  function install\(\) \{[\s\S]*?\n  \}\n/,
    `  function afterRender(moduleName, host, state) {\n    addDegradedNotice(moduleName, host, state);\n    enhanceExplicitDetails(host);\n    if (moduleName === 'cliente360') enhanceVehicleDetails(host);\n    if (moduleName === 'ops' || moduleName === 'leads') enhanceDiagnostics(moduleName, host);\n    if (moduleName === 'conciliaciones' || moduleName === 'cancelaciones') explainEmptyStates(moduleName, host);\n  }\n\n  function wrapModule(moduleName, contract) {\n    var mod = Orbit.modules && Orbit.modules[moduleName];\n    if (!mod || typeof mod.render !== 'function' || mod.__visualRootfixV20260805) return false;\n    var originalRender = mod.render.bind(mod);\n    mod.render = function (host) {\n      var state = hydrationStatus(contract || {});\n      if (!state.ready) {\n        host.innerHTML = loadingHtml(moduleName, state);\n        requestRouteRefresh(moduleName);\n        return;\n      }\n      var started = performance && performance.now ? performance.now() : Date.now();\n      var output = originalRender(host);\n      var elapsed = Math.round((performance && performance.now ? performance.now() : Date.now()) - started);\n      window.OrbitRuntimeDiagnostics = window.OrbitRuntimeDiagnostics || {};\n      OrbitRuntimeDiagnostics[moduleName] = {\n        version: VERSION, renderMs: elapsed, at: new Date().toISOString(), hydrated: true,\n        degraded: state.degraded, optionalMissing: state.optional.missing.length, optionalFailed: state.optional.failed.length\n      };\n      afterRender(moduleName, host, state);\n      setTimeout(function () { afterRender(moduleName, host, state); }, 0);\n      return output;\n    };\n    mod.__visualRootfixV20260805 = {\n      version: VERSION, original: originalRender,\n      required: (contract.required || []).slice(), optional: (contract.optional || []).slice()\n    };\n    return true;\n  }\n\n  function install() {\n    injectStyles(); enhanceLogin(); patchFirebasePersistence();\n    if (!Orbit.store || !Orbit.q || !Orbit.modules) return false;\n    installAdvisorProjection();\n    patchClientSummary();\n    var wrapped = 0;\n    Object.keys(MODULE_CONTRACTS).forEach(function (name) { if (wrapModule(name, MODULE_CONTRACTS[name])) wrapped += 1; });\n    if (wrapped && document.body && !document.body.dataset.visualRootfixV20260805) {\n      document.body.dataset.visualRootfixV20260805 = VERSION;\n      setTimeout(function () {\n        if (document.body.classList.contains('pre-auth')) return;\n        try { window.dispatchEvent(new HashChangeEvent('hashchange')); }\n        catch (error) { window.dispatchEvent(new Event('hashchange')); }\n      }, 50);\n    }\n    return wrapped > 0;\n  }\n`,
    'WRAP_INSTALL'
  );

  write(ROOTFIX_REL, source);

  let loader = read(LOADER_REL);
  loader = replaceOnce(loader, "loaderVersion: 'v1.115-visual-hydration-rootfix'", "loaderVersion: 'v1.116-required-optional-hydration'", 'LOADER_VERSION');
  loader = replaceOnce(loader, "write('core/visual-runtime-rootfix-v20260805.js?v=20260805-1');", "write('core/visual-runtime-rootfix-v20260805.js?v=20260805-2');", 'ROOTFIX_CACHE_BUST');
  write(LOADER_REL, loader);

  let index = read(INDEX_REL);
  index = replaceOnce(index, 'core/backend-lab-loader.js?v=20260804-operational-rootfix9', 'core/backend-lab-loader.js?v=20260805-hydration-contract2', 'INDEX_CACHE_BUST');
  write(INDEX_REL, index);

  const checks = {
    rootfixSyntax: syntaxOk(ROOTFIX_REL),
    loaderSyntax: syntaxOk(LOADER_REL),
    versionAdvanced: source.includes("var VERSION = '20260805.2'"),
    contractsPresent: source.includes('var MODULE_CONTRACTS = {'),
    noModuleDeps: !source.includes('MODULE_DEPS'),
    requiredOptionalStatus: source.includes('degraded: supplementary.missing.length > 0 || supplementary.failed.length > 0'),
    advisorProjectionReadOnly: source.includes("projectionSource: 'membership-and-canonical-relations'") && source.includes('writes: 0'),
    storeWritesUntouched: !source.includes("Orbit.store.insert =") && !source.includes("Orbit.store.update =") && !source.includes("Orbit.store.remove ="),
    loaderAdvanced: loader.includes('v1.116-required-optional-hydration') && loader.includes('v=20260805-2'),
    indexAdvanced: index.includes('v=20260805-hydration-contract2')
  };
  const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
  const output = {
    schemaVersion: 'orbit360-visual-hydration-required-optional-source-apply-v1',
    status: failedCheckIds.length ? 'FAIL_SOURCE_APPLY' : 'PASS_SOURCE_APPLY',
    classification: failedCheckIds.length ? 'DATA_CONTRACT_FAILURE' : 'DATA_CONTRACT_FAILURE_SOURCE_FIXED',
    total: Object.keys(checks).length,
    passed: Object.values(checks).filter(Boolean).length,
    failed: failedCheckIds.length,
    failedCheckIds,
    checks,
    filesChanged: [ROOTFIX_REL, LOADER_REL, INDEX_REL],
    secretsRead: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: failedCheckIds.length === 0
  };
  persist(output);
  console.log(JSON.stringify(output, null, 2));
  process.exit(output.ok ? 0 : 41);
} catch (error) {
  const output = {
    schemaVersion: 'orbit360-visual-hydration-required-optional-source-apply-v1',
    status: 'FAIL_SOURCE_APPLY',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    error: String(error && error.message || error).slice(0, 900),
    secretsRead: false, firestoreRead: false, firestoreWrites: 0, authWrites: 0,
    operationalWrites: 0, browserExecuted: false, deployExecuted: false, productionTouched: false,
    containsPII: false, containsSecrets: false, containsPasswords: false, ok: false
  };
  persist(output);
  console.error(JSON.stringify(output, null, 2));
  process.exit(41);
}
