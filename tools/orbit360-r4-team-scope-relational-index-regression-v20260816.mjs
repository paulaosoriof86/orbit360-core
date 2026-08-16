#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ACCESS_PATH = path.join(ROOT, 'orbit360-platform/core/access-scope.js');
const OUT = process.env.ORBIT360_R4_TEAM_SCOPE_REGRESSION_OUT || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/r4-team-scope-relational-index-regression-v20260816.json');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));

function makeFixture() {
  const advisors = [
    { id: 'adv-dir', nombre: 'Dir', equipoId: 'team-a' },
    { id: 'adv-op', nombre: 'Op', equipoId: 'team-a', equipoAsesorIds: ['adv-a', 'adv-b'] },
    { id: 'adv-a', nombre: 'A', equipoId: 'team-a' },
    { id: 'adv-b', nombre: 'B', equipoId: 'team-a' },
    { id: 'adv-c', nombre: 'C', equipoId: 'team-b' },
    { id: 'adv-d', nombre: 'D', equipoId: 'team-b' }
  ];
  const ownerIds = ['adv-a', 'adv-b', 'adv-c', 'adv-d'];
  const clientes = Array.from({ length: 430 }, (_, i) => ({ id: `c${i + 1}`, pais: i % 11 === 0 ? 'CO' : 'GT', asesorId: ownerIds[i % ownerIds.length] }));
  const polizas = Array.from({ length: 1375 }, (_, i) => ({ id: `p${i + 1}`, clienteId: `c${(i * 7) % 430 + 1}`, pais: i % 13 === 0 ? 'CO' : 'GT', ...(i % 5 === 0 ? { asesorId: ownerIds[(i * 3) % ownerIds.length] } : {}) }));
  const vehiculos = Array.from({ length: 700 }, (_, i) => ({ id: `v${i + 1}`, polizaId: `p${(i * 11) % 1375 + 1}`, pais: i % 17 === 0 ? 'CO' : 'GT' }));
  const cobros = Array.from({ length: 1900 }, (_, i) => i % 3 === 0 ? ({ id: `co${i + 1}`, clienteId: `c${(i * 5) % 430 + 1}`, pais: i % 19 === 0 ? 'CO' : 'GT' }) : ({ id: `co${i + 1}`, polizaId: `p${(i * 13) % 1375 + 1}`, pais: i % 19 === 0 ? 'CO' : 'GT' }));
  const comisiones = Array.from({ length: 900 }, (_, i) => i % 4 === 0 ? ({ id: `m${i + 1}`, clienteId: `c${(i * 9) % 430 + 1}`, pais: i % 23 === 0 ? 'CO' : 'GT' }) : ({ id: `m${i + 1}`, polizaId: `p${(i * 17) % 1375 + 1}`, pais: i % 23 === 0 ? 'CO' : 'GT' }));
  return { asesores: advisors, clientes, polizas, vehiculos, cobros, comisiones };
}

function makeStore(seed) {
  const metrics = { allCalls: 0, getCalls: 0, cloneRows: 0 };
  const data = clone(seed);
  const store = {
    all(col) { const rows = data[col] || []; metrics.allCalls++; metrics.cloneRows += rows.length; return clone(rows); },
    get(col, id) { metrics.getCalls++; return (store.all(col) || []).find(x => String(x.id) === String(id)) || null; },
    where(col, fn) { return store.all(col).filter(fn); },
    insert() { throw new Error('WRITE_FORBIDDEN'); },
    update() { throw new Error('WRITE_FORBIDDEN'); },
    remove() { throw new Error('WRITE_FORBIDDEN'); },
    _emit() {}
  };
  return { store, metrics };
}

function patchSource(source) {
  const start = source.indexOf('  function filter(collection, rows, moduleKey) {');
  const end = source.indexOf('  function filtrarPorAsesor(', start);
  if (start < 0 || end < 0) throw new Error('FILTER_ANCHOR_NOT_FOUND');
  const candidate = `  function filter(collection, rows, moduleKey) {\n    var list = Array.isArray(rows) ? rows : [];\n    if (!list.length) return [];\n    try {\n      // v20260816 candidate: resolve invariant role/scope plus relational advisor indexes once per filter call.\n      var role = activeRole();\n      if (SENSITIVE.indexOf(collection) >= 0 && ALL_ROLES.indexOf(role) < 0) return [];\n      var effectiveModule = moduleKey || OP_COLLS[collection] || collection;\n      if (!puedeVerModulo(effectiveModule)) return [];\n      var allowedCountries = permittedCountries();\n      var scope = dataScope(effectiveModule);\n      if (scope === 'none') return [];\n      function countryOk(rec) {\n        var pais = clean(rec && rec.pais);\n        return !allowedCountries.length || !pais || allowedCountries.indexOf(pais) >= 0;\n      }\n      if (scope === 'all') {\n        if (!allowedCountries.length) return list.slice();\n        return list.filter(countryOk);\n      }\n      var ownAdvisorId = actorAdvisorId();\n      var teamSet = new Set(scope === 'team' ? teamAdvisorIds() : []);\n      var currentStore = S();\n      var rawStore = currentStore && Object.prototype.hasOwnProperty.call(currentStore, '_scopedFor') ? Object.getPrototypeOf(currentStore) : currentStore;\n      var clientRows = collection === 'clientes' ? list : ((rawStore && rawStore.all && rawStore.all('clientes')) || []);\n      var clientExists = new Set();\n      var clientAdvisor = new Map();\n      clientRows.forEach(function (c) {\n        if (!c || c.id == null) return;\n        var id = clean(c.id);\n        clientExists.add(id);\n        clientAdvisor.set(id, clean(c.asesorId));\n      });\n      var policyRows = collection === 'polizas' ? list : ((rawStore && rawStore.all && rawStore.all('polizas')) || []);\n      var policyAdvisor = new Map();\n      policyRows.forEach(function (p) {\n        if (!p || p.id == null) return;\n        var advisor = clean(p.asesorId);\n        if (!advisor && p.clienteId != null) {\n          var cid = clean(p.clienteId);\n          advisor = clientExists.has(cid) ? clean(clientAdvisor.get(cid)) : '';\n        }\n        policyAdvisor.set(clean(p.id), advisor);\n      });\n      function indexedAdvisorId(rec) {\n        if (!rec) return '';\n        if (rec.asesorId) return clean(rec.asesorId);\n        if (rec.clienteId != null) {\n          var cid = clean(rec.clienteId);\n          if (clientExists.has(cid)) return clean(clientAdvisor.get(cid));\n        }\n        if (rec.polizaId != null) {\n          var pid = clean(rec.polizaId);\n          if (policyAdvisor.has(pid)) return clean(policyAdvisor.get(pid));\n        }\n        if (collection === 'clientes') return clean(rec.asesorId);\n        return '';\n      }\n      return list.filter(function (rec) {\n        if (!rec || !countryOk(rec)) return false;\n        var advisorId = indexedAdvisorId(rec);\n        if (!advisorId) return false;\n        if (scope === 'own') return advisorId === ownAdvisorId;\n        if (scope === 'team') return teamSet.has(advisorId);\n        return false;\n      });\n    } catch (e) { return []; }\n  }\n`;
  const patched = source.slice(0, start) + candidate + source.slice(end);
  if (patched === source) throw new Error('FILTER_PATCH_FAILED');
  return patched;
}

function makeContext(source, role, candidate) {
  const seed = makeFixture();
  const { store, metrics } = makeStore(seed);
  const actorId = role === 'Dirección' ? 'adv-dir' : role === 'Operativo' ? 'adv-op' : 'adv-a';
  const modules = ['cliente360', 'polizas', 'cobros', 'comisiones', 'ops', 'negocios', 'renovaciones', 'siniestros', 'correo'];
  const roles = {
    Dirección: { nivel: 10, modulos: modules, scopes: { cliente360: 'all' } },
    Operativo: { nivel: 6, modulos: modules, scopes: { cliente360: 'team' } },
    Asesor: { nivel: 4, modulos: modules, scopes: { cliente360: 'own' } }
  };
  const sandbox = { console, window: {}, setTimeout, clearTimeout, Date, JSON, Object, Array, Set, Map, String, Number, RegExp };
  sandbox.window.window = sandbox.window;
  sandbox.window.Orbit = {
    store, ROLES: roles,
    tenant: { isActive: () => true, get: () => ({}) },
    session: { rol: () => role, asesorId: () => actorId, rolesAsignados: () => [role], canSee: () => true },
    auth: { user: () => ({ uid: 'u', email: 'synthetic@example.invalid', rol: role }) },
    cat: { all: () => ({}) }, ui: { today: () => '2026-08-16' }
  };
  sandbox.Orbit = sandbox.window.Orbit;
  vm.createContext(sandbox);
  vm.runInContext(candidate ? patchSource(source) : source, sandbox, { filename: candidate ? 'access-scope-candidate.js' : 'access-scope-current.js' });
  return { Orbit: sandbox.window.Orbit, metrics, seed };
}

function ids(rows) { return (rows || []).map(x => String(x.id)).sort(); }
function same(a, b) { return JSON.stringify(ids(a)) === JSON.stringify(ids(b)); }

function exercise(source, role, candidate) {
  const ctx = makeContext(source, role, candidate);
  const A = ctx.Orbit.access;
  const collections = ['clientes', 'polizas', 'vehiculos', 'cobros', 'comisiones'];
  const publicOut = {};
  for (const col of collections) publicOut[col] = A.filter(col, ctx.seed[col], 'cliente360');
  const publicMetrics = { ...ctx.metrics };
  const facadeOut = {};
  A.withScope('cliente360', () => { for (const col of collections) facadeOut[col] = ctx.Orbit.store.all(col); });
  const totalMetrics = { ...ctx.metrics };
  const facadeMetrics = {
    allCalls: totalMetrics.allCalls - publicMetrics.allCalls,
    getCalls: totalMetrics.getCalls - publicMetrics.getCalls,
    cloneRows: totalMetrics.cloneRows - publicMetrics.cloneRows
  };
  return { publicOut, facadeOut, publicMetrics, facadeMetrics };
}

const source = fs.readFileSync(ACCESS_PATH, 'utf8');
const result = {
  schemaVersion: 'orbit360-r4-team-scope-relational-index-regression-v1',
  sourcePath: 'orbit360-platform/core/access-scope.js',
  sourceSha256: sha256(source),
  fixture: { clientes: 430, polizas: 1375, vehiculos: 700, cobros: 1900, comisiones: 900 },
  roles: {},
  browserExecuted: false, secretAccess: false, dataAccess: false,
  firestoreWrites: 0, authWrites: 0, operationalWrites: 0,
  productionTouched: false, containsPII: false, containsSecrets: false
};
let ok = true;
for (const role of ['Dirección', 'Operativo', 'Asesor']) {
  const current = exercise(source, role, false);
  const candidate = exercise(source, role, true);
  const publicEqual = Object.keys(current.publicOut).every(k => same(current.publicOut[k], candidate.publicOut[k]));
  const facadeEqual = Object.keys(current.facadeOut).every(k => same(current.facadeOut[k], candidate.facadeOut[k]));
  const counts = {};
  for (const k of Object.keys(current.facadeOut)) counts[k] = { current: current.facadeOut[k].length, candidate: candidate.facadeOut[k].length };
  result.roles[role] = { publicEqual, facadeEqual, counts, current: { publicMetrics: current.publicMetrics, facadeMetrics: current.facadeMetrics }, candidate: { publicMetrics: candidate.publicMetrics, facadeMetrics: candidate.facadeMetrics } };
  if (!publicEqual || !facadeEqual) ok = false;
}
const op = result.roles.Operativo, adv = result.roles.Asesor, dir = result.roles.Dirección;
const opCloneRatio = op.current.facadeMetrics.cloneRows / Math.max(1, op.candidate.facadeMetrics.cloneRows);
const advCloneRatio = adv.current.facadeMetrics.cloneRows / Math.max(1, adv.candidate.facadeMetrics.cloneRows);
const opGetRatio = op.current.facadeMetrics.getCalls / Math.max(1, op.candidate.facadeMetrics.getCalls);
const advGetRatio = adv.current.facadeMetrics.getCalls / Math.max(1, adv.candidate.facadeMetrics.getCalls);
result.reduction = { operativoFacadeCloneRatio: opCloneRatio, asesorFacadeCloneRatio: advCloneRatio, operativoFacadeGetRatio: opGetRatio, asesorFacadeGetRatio: advGetRatio };
const guard = dir.publicEqual && dir.facadeEqual && op.publicEqual && op.facadeEqual && adv.publicEqual && adv.facadeEqual && opCloneRatio >= 50 && advCloneRatio >= 50 && opGetRatio >= 20 && advGetRatio >= 20 && op.candidate.facadeMetrics.getCalls < 100 && adv.candidate.facadeMetrics.getCalls < 100;
ok = ok && guard;
result.ok = ok;
result.status = ok ? 'R4_TEAM_SCOPE_RELATIONAL_INDEX_REGRESSION_PASS' : 'R4_TEAM_SCOPE_RELATIONAL_INDEX_REGRESSION_FAIL';
result.classification = ok ? 'FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_PROVEN' : 'FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_NOT_PROVEN';
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
if (!ok) process.exit(41);
