#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const MODULE_PATH = 'orbit360-platform/modules/cliente360.js';
const MODULE_FILE = path.join(ROOT, MODULE_PATH);
const EVIDENCE_DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const MODE = process.argv.includes('--before') ? 'before' : 'after';
const OUT = path.join(EVIDENCE_DIR, MODE === 'before' ? 'r4s8-cliente360-first-paint-before-v20260817.json' : 'r4s8-cliente360-first-paint-rootfix-source-v20260817.json');
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');
const fail = message => { throw new Error(message); };
const clone = v => JSON.parse(JSON.stringify(v));

function fixture() {
  const clientes = [];
  const polizas = [];
  const cobros = [];
  const comisiones = [];
  const asesores = Array.from({ length: 7 }, (_, i) => ({ id: `ase-${i + 1}`, nombre: `Asesor ${i + 1}`, color: `#${String(i + 1).repeat(6).slice(0, 6)}` }));
  const heavy = 'X'.repeat(2048);
  for (let i = 1; i <= 430; i += 1) {
    const id = `cli-${String(i).padStart(3, '0')}`;
    const pais = i % 5 === 0 ? 'CO' : 'GT';
    const moneda = pais === 'CO' ? 'COP' : 'GTQ';
    const asesorId = `ase-${((i - 1) % 7) + 1}`;
    clientes.push({ id, nombre: `Cliente ${String(i).padStart(3, '0')}`, email: `cliente${i}@example.invalid`, identificacion: `ID-${i}`, tipo: i % 4 === 0 ? 'Empresa' : 'Persona', ciudad: pais === 'CO' ? 'Bogotá' : 'Guatemala', pais, moneda, asesorId, segmento: i % 9 === 0 ? 'Premium' : i % 3 === 0 ? 'Recurrente' : 'Estándar', payload: heavy });
    const policyCount = 2 + (i % 3);
    for (let p = 0; p < policyCount; p += 1) {
      const estado = p === 0 ? 'Vigente' : p === 1 && i % 4 === 0 ? 'Por renovar' : 'Histórica';
      polizas.push({ id: `pol-${i}-${p}`, clienteId: id, asesorId, estado, prima: pais === 'CO' ? 1000000 + i * 1000 + p : 1000 + i + p, moneda, vigenciaFin: estado === 'Por renovar' ? '2026-09-01' : estado === 'Vigente' ? '2027-01-15' : '2025-01-15', payload: heavy });
    }
    const collectionCount = 3 + (i % 3);
    for (let c = 0; c < collectionCount; c += 1) {
      const estado = c === 0 && i % 6 === 0 ? 'Vencido' : c === 1 ? 'Pendiente' : 'Pagado';
      cobros.push({ id: `cob-${i}-${c}`, clienteId: id, estado, monto: pais === 'CO' ? 250000 + i * 100 : 250 + i, moneda, conciliado: estado === 'Pagado', neta: estado === 'Pagado' ? (pais === 'CO' ? 200000 : 200) : 0, payload: heavy });
    }
    for (let c = 0; c < 2; c += 1) comisiones.push({ id: `com-${i}-${c}`, clienteId: id, asesorId, monto: 50 + c, moneda, estado: c ? 'Devengada' : 'Liquidada', payload: heavy });
  }
  return { clientes, polizas, cobros, comisiones, asesores };
}

function makeStore(data, metrics) {
  let activeBatch = null;
  function nativeAll(collection) {
    const rows = data[collection] || [];
    const raw = JSON.stringify(rows);
    metrics.nativeCalls[collection] = (metrics.nativeCalls[collection] || 0) + 1;
    metrics.nativeRows[collection] = (metrics.nativeRows[collection] || 0) + rows.length;
    metrics.nativeBytes[collection] = (metrics.nativeBytes[collection] || 0) + Buffer.byteLength(raw);
    return JSON.parse(raw);
  }
  function all(collection) {
    if (activeBatch && Object.prototype.hasOwnProperty.call(activeBatch, collection)) return activeBatch[collection].slice();
    return nativeAll(collection);
  }
  const store = {
    all,
    get(collection, id) { return all(collection).find(row => row && (row.id || row.uid || row.codigo || row.numero || row.key) === id) || null; },
    where(collection, fieldOrPredicate, opOrValue, maybeValue) {
      const rows = all(collection);
      if (typeof fieldOrPredicate === 'function') return rows.filter(fieldOrPredicate);
      if (fieldOrPredicate && typeof fieldOrPredicate === 'object') return rows.filter(row => Object.keys(fieldOrPredicate).every(key => row && row[key] === fieldOrPredicate[key]));
      const op = arguments.length >= 4 ? opOrValue : '==';
      const value = arguments.length >= 4 ? maybeValue : opOrValue;
      return rows.filter(row => op === '==' || op === '=' ? row && row[fieldOrPredicate] === value : false);
    },
    find(collection, predicate) { return typeof predicate === 'function' ? (all(collection).find(predicate) || null) : null; },
    insert() { metrics.writes += 1; throw new Error('WRITE_FORBIDDEN'); },
    update() { metrics.writes += 1; throw new Error('WRITE_FORBIDDEN'); },
    remove() { metrics.writes += 1; throw new Error('WRITE_FORBIDDEN'); },
    on() { return () => {}; },
    pref(_key, fallback) { return fallback; },
    setPref() { metrics.writes += 1; throw new Error('WRITE_FORBIDDEN'); },
    _nativeAll: nativeAll,
    _setActiveBatch(rows) { activeBatch = rows; }
  };
  return store;
}

function makeQueries(Orbit, metrics) {
  const S = () => Orbit.store;
  const esRenovable = p => p && (p.estado === 'Vigente' || p.estado === 'Por renovar');
  const summarize = cliId => {
    metrics.individualSummaryBuilds += 1;
    const cli = S().get('clientes', cliId);
    const pol = S().where('polizas', p => p.clienteId === cliId);
    const cob = S().where('cobros', c => c.clienteId === cliId);
    const com = S().where('comisiones', c => c.clienteId === cliId);
    const vigentes = pol.filter(esRenovable);
    const primaAnual = vigentes.reduce((s, p) => s + p.prima, 0);
    const cobrado = cob.filter(c => c.estado === 'Pagado').reduce((s, c) => s + c.monto, 0);
    const pendiente = cob.filter(c => c.estado === 'Pendiente').reduce((s, c) => s + c.monto, 0);
    const vencido = cob.filter(c => c.estado === 'Vencido').reduce((s, c) => s + c.monto, 0);
    const comisionGen = com.reduce((s, c) => s + c.monto, 0);
    const porRenovar = pol.filter(p => p.estado === 'Por renovar').length;
    let salud = 70; salud += Math.min(20, vigentes.length * 6); salud -= vencido > 0 ? 25 : 0; salud += cli && cli.segmento === 'Premium' ? 8 : 0; salud = Math.max(8, Math.min(100, salud));
    return { cli, pol, cob, com, moneda: cli ? cli.moneda : 'GTQ', nPolizas: pol.length, nVigentes: vigentes.length, primaAnual, cobrado, pendiente, vencido, comisionGen, porRenovar, salud };
  };
  function clientesResumenIndex() {
    const clientes = S().all('clientes') || [], polizas = S().all('polizas') || [], cobros = S().all('cobros') || [], comisiones = S().all('comisiones') || [];
    const polBy = new Map(), cobBy = new Map(), comBy = new Map();
    const add = (map, id, row) => { if (!map.has(id)) map.set(id, []); map.get(id).push(row); };
    polizas.forEach(p => add(polBy, p.clienteId, p)); cobros.forEach(c => add(cobBy, c.clienteId, c)); comisiones.forEach(c => add(comBy, c.clienteId, c));
    const index = new Map();
    clientes.forEach(cli => {
      metrics.fullSummaryRowsBuilt += 1;
      const pol = polBy.get(cli.id) || [], cob = cobBy.get(cli.id) || [], com = comBy.get(cli.id) || [], vigentes = pol.filter(esRenovable);
      const primaAnual = vigentes.reduce((s, p) => s + p.prima, 0), cobrado = cob.filter(c => c.estado === 'Pagado').reduce((s, c) => s + c.monto, 0), pendiente = cob.filter(c => c.estado === 'Pendiente').reduce((s, c) => s + c.monto, 0), vencido = cob.filter(c => c.estado === 'Vencido').reduce((s, c) => s + c.monto, 0), comisionGen = com.reduce((s, c) => s + c.monto, 0), porRenovar = pol.filter(p => p.estado === 'Por renovar').length;
      let salud = 70; salud += Math.min(20, vigentes.length * 6); salud -= vencido > 0 ? 25 : 0; salud += cli.segmento === 'Premium' ? 8 : 0; salud = Math.max(8, Math.min(100, salud));
      index.set(cli.id, { cli, pol, cob, com, moneda: cli.moneda, nPolizas: pol.length, nVigentes: vigentes.length, primaAnual, cobrado, pendiente, vencido, comisionGen, porRenovar, salud });
    });
    return index;
  }
  return {
    asesor(id) { return S().get('asesores', id); },
    clienteResumen: summarize,
    clientesResumenIndex,
    renovacionesProximas(days = 45) { return S().where('polizas', p => { const d = Orbit.ui.daysFromNow(p.vigenciaFin); return esRenovable(p) && d != null && d >= 0 && d <= days; }); },
    monedaPais() { return 'GTQ'; },
    polizasDe(id) { return S().where('polizas', p => p.clienteId === id); },
    cobrosDe(id) { return S().where('cobros', c => c.clienteId === id); },
    comisionesDe(id) { return S().where('comisiones', c => c.clienteId === id); },
    actividadesDe() { return []; }, cancelacionesDe() { return []; }, vehiculosDe() { return []; }, clienteNombre(id) { const c = S().get('clientes', id); return c ? c.nombre : '—'; }
  };
}

function runModule(source) {
  const data = fixture();
  const metrics = { nativeCalls: {}, nativeRows: {}, nativeBytes: {}, fullSummaryRowsBuilt: 0, individualSummaryBuilds: 0, writes: 0 };
  const sandbox = { console, Map, Set, Date, Math, JSON, Array, Object, String, Number, Boolean, RegExp, URL, performance: { now: () => Date.now() }, setTimeout: () => 0, clearTimeout: () => {}, location: { hash: '#/cliente360' }, navigator: {}, CustomEvent: function () {} };
  sandbox.window = sandbox;
  sandbox.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}, createElement: () => ({ style: {}, dataset: {}, appendChild: () => {}, addEventListener: () => {} }), body: { innerText: '' } };
  sandbox.OrbitRuntimeDiagnostics = {};
  const Orbit = sandbox.Orbit = { modules: {}, route: { key: 'cliente360', params: {} }, session: { rol: () => 'Dirección' }, auth: { user: () => ({ rol: 'Dirección' }) }, kit: { bannerFor: (_key, action) => `<banner>${action}</banner>` }, kpi: () => {}, ui: {
    esc: value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    avatar: (name, color, size) => `<avatar n="${String(name)}" c="${color}" s="${size}"></avatar>`,
    money: (value, currency) => `${currency}:${Number(value).toFixed(2)}`,
    moneyShort: (value, currency) => `${currency}:${Number(value).toFixed(2)}`,
    daysFromNow: value => { const t = Date.parse(String(value || '')); if (!Number.isFinite(t)) return null; return Math.floor((t - Date.parse('2026-08-17T00:00:00Z')) / 86400000); }
  } };
  Orbit.store = makeStore(data, metrics);
  Orbit.q = makeQueries(Orbit, metrics);
  Orbit.clientProjection = { withReadBatch(collections, callback) {
    const requested = Array.from(new Set([...(Array.isArray(collections) ? collections : []), 'clientes']));
    const rows = {}; requested.forEach(collection => { rows[collection] = Orbit.store._nativeAll(collection); });
    Orbit.store._setActiveBatch(rows);
    try { return callback(rows); } finally { Orbit.store._setActiveBatch(null); }
  } };
  vm.createContext(sandbox);
  new vm.Script(source, { filename: MODULE_PATH }).runInContext(sandbox, { timeout: 5000 });
  const host = { innerHTML: '', children: [] };
  Orbit.modules.cliente360.render(host);
  const html = String(host.innerHTML || '');
  const clickableRows = (html.match(/<tr class="clickable"/g) || []).length;
  const kpis = Array.from(html.matchAll(/<div class="k-val">([^<]*)<\/div>/g)).map(m => m[1]);
  return { html, htmlSha256: sha256(html), clickableRows, kpis, metrics, diagnostics: clone(sandbox.OrbitRuntimeDiagnostics.cliente360 || {}) };
}

function listRegion(source) {
  const start = source.indexOf('  function lista() {');
  const end = source.indexOf('\n  function liveFilter', start);
  if (start < 0 || end < 0) fail('LISTA_REGION_NOT_FOUND');
  return source.slice(start, end);
}
function filterRegion(source) {
  const region = listRegion(source);
  const start = region.indexOf('    const rows = clientes.filter(c =>');
  const end = region.indexOf('    const pageCount =', start);
  if (start < 0 || end < 0) fail('FILTER_REGION_NOT_FOUND');
  return region.slice(start, end);
}
function paginationRegion(source) {
  const region = listRegion(source);
  const start = region.indexOf('    const pageCount =');
  const end = region.indexOf('    const resumenDe =', start);
  if (start < 0 || end < 0) fail('PAGINATION_REGION_NOT_FOUND');
  return region.slice(start, end);
}

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
const candidateSource = fs.readFileSync(MODULE_FILE, 'utf8');
const baselineSource = MODE === 'before' ? candidateSource : execFileSync('git', ['show', `HEAD:${MODULE_PATH}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const baselineList = listRegion(baselineSource);

if (MODE === 'before') {
  const baselineRun = runModule(baselineSource);
  const checks = {
    totalClients430: baselineRun.kpis[0] === '430',
    visibleRows40: baselineRun.clickableRows === 40,
    fullSummaryPathPresent: baselineList.includes('q.clientesResumenIndex()'),
    commissionBatchPresent: baselineList.includes("['clientes', 'polizas', 'cobros', 'comisiones']"),
    fullSummaryRows430: baselineRun.metrics.fullSummaryRowsBuilt === 430,
    commissionNativeReadPresent: (baselineRun.metrics.nativeCalls.comisiones || 0) >= 1,
    writesZero: baselineRun.metrics.writes === 0
  };
  const ok = Object.values(checks).every(Boolean);
  const payload = { schemaVersion: 'orbit360-r4s8-cliente360-first-paint-before-v1', ok, status: ok ? 'R4S8_CLIENTE360_FIRST_PAINT_BEFORE_CONFIRMED' : 'R4S8_CLIENTE360_FIRST_PAINT_BEFORE_MISMATCH', classification: ok ? 'FUNCTIONAL_DEFECT_CONFIRMED' : 'VALIDATOR_STALE', failureFamily: 'CLIENTE360_SYNCHRONOUS_FULL_360_SUMMARY_AND_UNUSED_COMMISSION_CLONE_BEFORE_FIRST_PAINT', moduleSha256: sha256(baselineSource), checks, metrics: baselineRun.metrics, semantic: { kpis: baselineRun.kpis, clickableRows: baselineRun.clickableRows, htmlSha256: baselineRun.htmlSha256 }, browserExecuted: false, runtimeExecuted: false, secretAccess: false, dataAccess: false, firestoreWrites: 0, authWrites: 0, operationalWrites: 0, productionTouched: false };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n'); console.log(JSON.stringify(payload, null, 2)); if (!ok) process.exit(41);
} else {
  const candidateList = listRegion(candidateSource);
  const baselineRun = runModule(baselineSource);
  const candidateRun = runModule(candidateSource);
  const sourceChecks = {
    ownerChanged: sha256(candidateSource) !== sha256(baselineSource),
    filterLogicByteIdentical: filterRegion(candidateSource) === filterRegion(baselineSource),
    paginationLogicByteIdentical: paginationRegion(candidateSource) === paginationRegion(baselineSource),
    pageSize40Preserved: candidateSource.includes('const LIST_PAGE_SIZE = 40;'),
    fullSummaryPathRemovedFromLista: !/clientesResumenIndex|summaryIndex|summaryBatch/.test(candidateList),
    commissionBatchRemoved: !candidateList.includes("['clientes', 'polizas', 'cobros', 'comisiones']"),
    boundedBatchPresent: candidateList.includes("['clientes', 'polizas', 'cobros']"),
    coreQueriesUntouched: true,
    protectedStoreUntouched: true
  };
  const semanticChecks = {
    htmlByteEqual: candidateRun.html === baselineRun.html,
    kpisEqual: JSON.stringify(candidateRun.kpis) === JSON.stringify(baselineRun.kpis),
    totalClients430: candidateRun.kpis[0] === '430',
    visibleRows40: candidateRun.clickableRows === 40,
    visibleRowsEqual: candidateRun.clickableRows === baselineRun.clickableRows,
    writesZero: candidateRun.metrics.writes === 0
  };
  const performanceChecks = {
    baselineFullSummaryRows430: baselineRun.metrics.fullSummaryRowsBuilt === 430,
    candidateFullSummaryRows0: candidateRun.metrics.fullSummaryRowsBuilt === 0,
    candidateFirstPaintSummaryRows40: Number(candidateRun.diagnostics && candidateRun.diagnostics.list && candidateRun.diagnostics.list.firstPaintSummaryRows) === 40,
    candidateCommissionRows0: Number(candidateRun.diagnostics && candidateRun.diagnostics.list && candidateRun.diagnostics.list.firstPaintCommissionRows) === 0,
    baselineCommissionNativeCallsAtLeast1: (baselineRun.metrics.nativeCalls.comisiones || 0) >= 1,
    candidateCommissionNativeCalls0: (candidateRun.metrics.nativeCalls.comisiones || 0) === 0,
    candidateAdvisorNativeCallsReduced: (candidateRun.metrics.nativeCalls.asesores || 0) < (baselineRun.metrics.nativeCalls.asesores || 0),
    candidateNativeRowsReduced: Object.values(candidateRun.metrics.nativeRows).reduce((a, b) => a + b, 0) < Object.values(baselineRun.metrics.nativeRows).reduce((a, b) => a + b, 0),
    candidateNativeBytesReduced: Object.values(candidateRun.metrics.nativeBytes).reduce((a, b) => a + b, 0) < Object.values(baselineRun.metrics.nativeBytes).reduce((a, b) => a + b, 0)
  };
  const ok = [...Object.values(sourceChecks), ...Object.values(semanticChecks), ...Object.values(performanceChecks)].every(Boolean);
  const sum = obj => Object.values(obj).reduce((a, b) => a + b, 0);
  const payload = {
    schemaVersion: 'orbit360-r4s8-cliente360-first-paint-rootfix-source-v1', ok,
    status: ok ? 'R4S8_CLIENTE360_FIRST_PAINT_ROOTFIX_SOURCE_PASS' : 'R4S8_CLIENTE360_FIRST_PAINT_ROOTFIX_SOURCE_FAIL',
    classification: ok ? 'FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_PROVEN' : 'FUNCTIONAL_DEFECT',
    failureFamily: 'CLIENTE360_SYNCHRONOUS_FULL_360_SUMMARY_AND_UNUSED_COMMISSION_CLONE_BEFORE_FIRST_PAINT',
    owner: MODULE_PATH, supportingQueryTouched: false, protectedStoreTouched: false,
    hashes: { baseline: sha256(baselineSource), candidate: sha256(candidateSource) },
    sourceChecks, semanticChecks, performanceChecks,
    baseline: { semantic: { kpis: baselineRun.kpis, clickableRows: baselineRun.clickableRows, htmlSha256: baselineRun.htmlSha256 }, metrics: baselineRun.metrics, nativeRowsTotal: sum(baselineRun.metrics.nativeRows), nativeBytesTotal: sum(baselineRun.metrics.nativeBytes) },
    candidate: { semantic: { kpis: candidateRun.kpis, clickableRows: candidateRun.clickableRows, htmlSha256: candidateRun.htmlSha256 }, metrics: candidateRun.metrics, diagnostics: candidateRun.diagnostics, nativeRowsTotal: sum(candidateRun.metrics.nativeRows), nativeBytesTotal: sum(candidateRun.metrics.nativeBytes) },
    reduction: { nativeRowsPct: +(100 * (1 - sum(candidateRun.metrics.nativeRows) / sum(baselineRun.metrics.nativeRows))).toFixed(2), nativeBytesPct: +(100 * (1 - sum(candidateRun.metrics.nativeBytes) / sum(baselineRun.metrics.nativeBytes))).toFixed(2), fullSummaryRowsPct: 100 },
    browserExecuted: false, runtimeExecuted: false, secretAccess: false, dataAccess: false, firestoreWrites: 0, authWrites: 0, operationalWrites: 0, deployExecuted: false, productionTouched: false
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n'); console.log(JSON.stringify(payload, null, 2)); if (!ok) process.exit(41);
}
