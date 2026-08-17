#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const ROOT = process.cwd();
const OWNER = 'orbit360-platform/core/client-insurer-visual-contract-v20260720.js';
const MODULE = 'orbit360-platform/modules/cliente360.js';
const STORE = 'orbit360-platform/data/store-firestore-product-readonly-p0.js';
const HARNESS = 'tools/orbit360-r4-role-route-attribution-wrapper-v20260816.mjs';
const BASELINE = '395f15d9c2e1fac2949763947834b88a9b521207';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/r4s6-client-projection-consecutive-read-rootfix-source-v20260817.json');
const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--verify') ? 'verify' : 'diagnose';
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');
const count = (h, n) => h.split(n).length - 1;
const fail = m => { throw new Error(m); };
const write = payload => { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8'); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const gitShow = (sha, p) => execFileSync('git', ['show', `${sha}:${p}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

function replaceOnce(source, from, to, label) {
  const n = count(source, from);
  if (n !== 1) fail(`${label}_COUNT_${n}`);
  return source.replace(from, to);
}

function applyRootfix(source) {
  if (source.includes("clientProjectionReadCacheRevision === '20260817.1'")) return source;
  let out = source;
  out = replaceOnce(out,
    "clientProjectionReadCacheRevision === '20260816.2'",
    "clientProjectionReadCacheRevision === '20260817.1'",
    'GUARD_REVISION');

  out = replaceOnce(out,
`  var segmentationContextCache = { epoch: 0, threshold: null, context: null, builds: 0, hits: 0, invalidations: 0, batchReads: 0 };
  function invalidateSegmentationContext() {
    segmentationContextCache.epoch += 1;
    segmentationContextCache.threshold = null;
    segmentationContextCache.context = null;
    segmentationContextCache.invalidations += 1;
  }`,
`  var segmentationContextCache = { epoch: 0, threshold: null, context: null, builds: 0, hits: 0, invalidations: 0, batchReads: 0 };
  var CLIENT_PROJECTION_CACHE_TTL_MS = 5000;
  var clientProjectionRowsCache = { epoch: 0, threshold: null, rows: null, builtAt: 0, builds: 0, hits: 0, invalidations: 0, shallowCloneRows: 0, lastInvalidationReason: '' };
  function invalidateClientProjectionRows(reason) {
    clientProjectionRowsCache.epoch += 1;
    clientProjectionRowsCache.threshold = null;
    clientProjectionRowsCache.rows = null;
    clientProjectionRowsCache.builtAt = 0;
    clientProjectionRowsCache.invalidations += 1;
    clientProjectionRowsCache.lastInvalidationReason = clean(reason || 'unspecified');
  }
  function invalidateSegmentationContext(reason) {
    segmentationContextCache.epoch += 1;
    segmentationContextCache.threshold = null;
    segmentationContextCache.context = null;
    segmentationContextCache.invalidations += 1;
    invalidateClientProjectionRows(reason || 'segmentation');
  }`,
    'CACHE_DECLARATION');

  out = replaceOnce(out,
`      if (segmentationContextCache.context && segmentationContextCache.threshold !== threshold) invalidateSegmentationContext();`,
`      if (segmentationContextCache.context && segmentationContextCache.threshold !== threshold) invalidateSegmentationContext('threshold');`,
    'THRESHOLD_INVALIDATION');

  out = replaceOnce(out,
`    function projectedAll(collection) {
      if (activeReadBatch && Object.prototype.hasOwnProperty.call(activeReadBatch.rows, collection)) return activeReadBatch.rows[collection].slice();
      var rows = nativeAll(collection) || [];
      if (collection !== 'clientes') return rows;
      var segmentationContext = cachedSegmentationContext();
      return rows.map(function (row) { return projectClient(row, segmentationContext); });
    }`,
`    function cloneProjectedClients(rows) {
      var source = Array.isArray(rows) ? rows : [];
      clientProjectionRowsCache.shallowCloneRows += source.length;
      return source.map(function (row) {
        var out = clone(row);
        if (out && Array.isArray(row && row.etiquetas)) out.etiquetas = row.etiquetas.slice();
        return out;
      });
    }
    function projectedClients(segmentationContext) {
      var threshold = premiumThreshold();
      var now = Date.now();
      if (clientProjectionRowsCache.rows && clientProjectionRowsCache.threshold !== threshold) invalidateSegmentationContext('threshold');
      if (clientProjectionRowsCache.rows && (now - clientProjectionRowsCache.builtAt) <= CLIENT_PROJECTION_CACHE_TTL_MS) {
        clientProjectionRowsCache.hits += 1;
        return cloneProjectedClients(clientProjectionRowsCache.rows);
      }
      if (clientProjectionRowsCache.rows) invalidateClientProjectionRows('ttl');
      var context = segmentationContext || cachedSegmentationContext();
      var projected = (nativeAll('clientes') || []).map(function (row) { return projectClient(row, context); });
      clientProjectionRowsCache.rows = projected;
      clientProjectionRowsCache.threshold = threshold;
      clientProjectionRowsCache.builtAt = Date.now();
      clientProjectionRowsCache.builds += 1;
      return cloneProjectedClients(projected);
    }
    function projectedAll(collection) {
      if (activeReadBatch && Object.prototype.hasOwnProperty.call(activeReadBatch.rows, collection)) return activeReadBatch.rows[collection].slice();
      if (collection === 'clientes') return projectedClients();
      return nativeAll(collection) || [];
    }`,
    'PROJECTED_ALL');

  out = replaceOnce(out,
`          rows.clientes = (nativeAll('clientes') || []).map(function (row) { return projectClient(row, context); });`,
`          rows.clientes = projectedClients(context);`,
    'BATCH_CLIENTS');

  out = replaceOnce(out,
`      return { revision:'20260816.2', epoch:segmentationContextCache.epoch, builds:segmentationContextCache.builds, hits:segmentationContextCache.hits, invalidations:segmentationContextCache.invalidations, batchReads:segmentationContextCache.batchReads, threshold:segmentationContextCache.threshold };`,
`      return { revision:'20260817.1', epoch:segmentationContextCache.epoch, builds:segmentationContextCache.builds, hits:segmentationContextCache.hits, invalidations:segmentationContextCache.invalidations, batchReads:segmentationContextCache.batchReads, threshold:segmentationContextCache.threshold, clientProjection:{ epoch:clientProjectionRowsCache.epoch, builds:clientProjectionRowsCache.builds, hits:clientProjectionRowsCache.hits, invalidations:clientProjectionRowsCache.invalidations, shallowCloneRows:clientProjectionRowsCache.shallowCloneRows, ttlMs:CLIENT_PROJECTION_CACHE_TTL_MS, cachedRows:clientProjectionRowsCache.rows ? clientProjectionRowsCache.rows.length : 0, ageMs:clientProjectionRowsCache.builtAt ? Math.max(0,Date.now()-clientProjectionRowsCache.builtAt) : null, lastInvalidationReason:clientProjectionRowsCache.lastInvalidationReason } };`,
    'PERFORMANCE_STATE');

  out = replaceOnce(out,
`      try { store.on(function (collection) { if (collection === '*' || collection === 'polizas' || collection === 'cobros') invalidateSegmentationContext(); }); } catch (e) {}`,
`      try { store.on(function (collection) { if (collection === 'clientes') invalidateClientProjectionRows('store:clientes'); else if (collection === '*' || collection === 'polizas' || collection === 'cobros') invalidateSegmentationContext('store:' + collection); }); } catch (e) {}`,
    'STORE_INVALIDATION');

  out = replaceOnce(out,
`store.__clientCanonicalReadProjectionV20260720={version:'20260720.2',writesStore:false,reimportsData:false,nativeAll:nativeAll,nativeWhere:nativeWhere,nativeFind:nativeFind,segmentationBatchRevision:'20260816.2',withReadBatch:withReadBatch,performanceState:performanceState};`,
`store.__clientCanonicalReadProjectionV20260720={version:'20260720.2',writesStore:false,reimportsData:false,nativeAll:nativeAll,nativeWhere:nativeWhere,nativeFind:nativeFind,segmentationBatchRevision:'20260816.2',clientProjectionReadCacheRevision:'20260817.1',withReadBatch:withReadBatch,performanceState:performanceState};`,
    'STORE_META');

  out = replaceOnce(out,
`clientProjectionBatchRevision:'20260816.2',clientProjectionReadCacheRevision:'20260816.2'`,
`clientProjectionBatchRevision:'20260816.2',clientProjectionReadCacheRevision:'20260817.1'`,
    'CONTRACT_REVISION');
  return out;
}

function projectionSlice(source) {
  const start = source.indexOf('(function () {');
  const end = source.indexOf("  if (Orbit.q && typeof Orbit.q.clienteResumen");
  if (start < 0 || end < 0 || end <= start) fail('PROJECTION_SLICE_MARKERS_INVALID');
  return source.slice(start, end) + '\n})();\n';
}

function makeRows() {
  const heavy = 'X'.repeat(24576);
  const clients = Array.from({ length: 430 }, (_, i) => ({
    id: `c${i+1}`, nombre: `Cliente ${i+1}`, tipo: i % 5 === 0 ? 'Empresa' : 'Persona', pais: i % 3 === 0 ? 'CO' : 'GT', moneda: i % 3 === 0 ? 'COP' : 'GTQ', asesorId: `a${(i % 7)+1}`, identificacion: `ID${i+1}`, email: `cliente${i+1}@example.invalid`, etiquetas: ['migrado','activo'], payload: { ficha: heavy, trazabilidad: [{ hoja:'Clientes', fila:i+2, bloque:'A&S' }], extra: { uno: heavy.slice(0,4096), dos: [1,2,3,4] } }
  }));
  const policies = Array.from({ length: 1375 }, (_, i) => ({ id:`p${i+1}`, clienteId:`c${(i%430)+1}`, estado:i%4===0?'Histórico':'Vigente', prima:1000+i, moneda:i%3===0?'COP':'GTQ', vigenciaIni:'2026-07-01' }));
  const cobros = Array.from({ length: 1900 }, (_, i) => ({ id:`b${i+1}`, clienteId:`c${(i%430)+1}`, estado:i%3===0?'Pagado':'Pendiente', conciliado:i%6===0, neta:100+i, monto:120+i }));
  const comisiones = Array.from({ length: 900 }, (_, i) => ({ id:`m${i+1}`, clienteId:`c${(i%430)+1}`, monto:10+i }));
  const asesores = Array.from({ length: 7 }, (_, i) => ({ id:`a${i+1}`, nombre:`Asesor ${i+1}` }));
  return { clientes:clients, polizas:policies, cobros, comisiones, asesores };
}

function createStore(seed) {
  const listeners = [];
  const metrics = { calls:{}, rows:{}, bytes:{} };
  function cloneCollection(collection) {
    const rows = seed[collection] || [];
    metrics.calls[collection] = (metrics.calls[collection] || 0) + 1;
    metrics.rows[collection] = (metrics.rows[collection] || 0) + rows.length;
    let bytes = 0;
    const out = rows.map(row => { const s = JSON.stringify(row); bytes += Buffer.byteLength(s); return JSON.parse(s); });
    metrics.bytes[collection] = (metrics.bytes[collection] || 0) + bytes;
    return out;
  }
  const api = {
    all: cloneCollection,
    where(collection, predicate) { return cloneCollection(collection).filter(predicate); },
    find(collection, predicate) { return cloneCollection(collection).find(predicate) || null; },
    get(collection, id) { return cloneCollection(collection).find(row => row.id === id) || null; },
    on(collection, callback) { if (typeof collection === 'function') { callback = collection; collection = '*'; } const item={collection,callback}; listeners.push(item); return () => {}; },
    _emit(collection) { listeners.forEach(item => { if (item.collection === '*' || item.collection === collection || collection === '*') item.callback(collection); }); },
    _metrics: metrics
  };
  return api;
}

function runProjection(source) {
  const seed = makeRows();
  const store = createStore(seed);
  const Orbit = { store, tenant:{ segmentacion:{ premiumPrimaNetaRecaudada:1000 } }, config:{}, ui:{ esc:v=>String(v ?? '') } };
  const sandbox = { window:{ Orbit }, Orbit, console, Date, Map, Set, Array, Object, String, Number, Math, JSON, RegExp, Error, Buffer, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  const code = projectionSlice(source);
  const t0 = performance.now();
  vm.runInContext(code, sandbox, { timeout: 20000 });
  const roleRows = Orbit.store.all('clientes');
  const roleScoped = roleRows.slice();
  const batch = Orbit.clientProjection.withReadBatch(['clientes','polizas','cobros','comisiones'], rows => ({ clientes: Orbit.store.all('clientes'), polizas: Orbit.store.all('polizas'), cobros: Orbit.store.all('cobros'), comisiones: Orbit.store.all('comisiones'), sourceClientes: rows.clientes }));
  const enhancerRows = Orbit.store.all('clientes');
  const elapsedMs = performance.now() - t0;
  const semantic = sha256(JSON.stringify({
    role: roleScoped.map(x => [x.id,x.tipo,x.pais,x.moneda,x.segmento,x.nombre]),
    batch: batch.clientes.map(x => [x.id,x.tipo,x.pais,x.moneda,x.segmento,x.nombre]),
    enhancer: enhancerRows.map(x => [x.id,x.tipo,x.pais,x.moneda,x.segmento,x.nombre])
  }));
  const beforeIsolation = Orbit.store.all('clientes');
  beforeIsolation[0].nombre = 'MUTATED_LOCAL';
  beforeIsolation[0].etiquetas.push('MUTATED_LOCAL');
  const afterIsolation = Orbit.store.all('clientes');
  const topLevelIsolation = afterIsolation[0].nombre !== 'MUTATED_LOCAL' && !afterIsolation[0].etiquetas.includes('MUTATED_LOCAL');
  return { Orbit, store, elapsedMs, semantic, counts:{ role:roleRows.length, scoped:roleScoped.length, batch:batch.clientes.length, enhancer:enhancerRows.length }, topLevelIsolation };
}

function snapshot(result) {
  const perf = result.Orbit.clientProjection.readPerformanceState();
  return { elapsedMs:+result.elapsedMs.toFixed(2), semantic:result.semantic, counts:result.counts, topLevelIsolation:result.topLevelIsolation, nativeAll:{ calls:{...result.store._metrics.calls}, rows:{...result.store._metrics.rows}, bytes:{...result.store._metrics.bytes} }, projection:perf };
}

function staticDiagnosis(source, moduleSource, harnessSource) {
  return {
    roleScopeReadsClients: harnessSource.includes("const raw = Orbit.store.all('clientes'), scoped = Orbit.access.filter('clientes', raw, 'cliente360')"),
    cliente360UsesReadBatch: moduleSource.includes("typeof Orbit.clientProjection.withReadBatch === 'function'") && moduleSource.includes("batchRunner(['clientes', 'polizas', 'cobros', 'comisiones']"),
    batchDirectlyNativeReadsClients: source.includes("rows.clientes = (nativeAll('clientes') || []).map(function (row) { return projectClient(row, context); });"),
    projectedAllNativeReadsBeforeClientBranch: source.includes("var rows = nativeAll(collection) || [];\n      if (collection !== 'clientes') return rows;"),
    enhancerReadsClientsAgain: source.includes("var clients=Orbit.store&&Orbit.store.all?Orbit.store.all('clientes'):[]"),
    clientStoreInvalidationAbsent: source.includes("collection === '*' || collection === 'polizas' || collection === 'cobros'") && !source.includes("collection === 'clientes') invalidateClientProjectionRows"),
    cacheRevisionBaseline: source.includes("clientProjectionReadCacheRevision:'20260816.2'")
  };
}

function verifyInvalidations(currentSource) {
  const run = runProjection(currentSource);
  const store = run.store;
  const Orbit = run.Orbit;
  const events = [];
  function step(kind, mutate) {
    const before = Orbit.clientProjection.readPerformanceState();
    if (mutate) mutate();
    else store._emit(kind);
    Orbit.store.all('clientes');
    const after = Orbit.clientProjection.readPerformanceState();
    events.push({ kind, buildsBefore:before.clientProjection?.builds ?? null, buildsAfter:after.clientProjection?.builds ?? null, invalidationsBefore:before.clientProjection?.invalidations ?? null, invalidationsAfter:after.clientProjection?.invalidations ?? null, lastReason:after.clientProjection?.lastInvalidationReason || '' });
  }
  step('clientes');
  step('polizas');
  step('cobros');
  step('*');
  step('threshold', () => { Orbit.tenant.segmentacion.premiumPrimaNetaRecaudada = 2000; });
  return { events, pass: events.every(e => Number(e.buildsAfter) === Number(e.buildsBefore) + 1 && Number(e.invalidationsAfter) >= Number(e.invalidationsBefore) + 1) };
}

const baselineSource = gitShow(BASELINE, OWNER);
const moduleSource = gitShow(BASELINE, MODULE);
const harnessSource = read(HARNESS);
const currentSource = read(OWNER);
const storeSource = read(STORE);
const diagnosis = staticDiagnosis(baselineSource, moduleSource, harnessSource);
const diagnosisPass = Object.values(diagnosis).every(Boolean);

if (mode === 'apply') {
  if (!diagnosisPass) fail('ROOT_CAUSE_DIAGNOSIS_NOT_CLOSED');
  if (sha256(currentSource) !== sha256(baselineSource)) fail('OWNER_NOT_EXACT_R4S6_SOURCE_BASELINE_BEFORE_APPLY');
  const patched = applyRootfix(currentSource);
  fs.writeFileSync(path.join(ROOT, OWNER), patched, 'utf8');
  const payload = { schemaVersion:'orbit360-r4s6-client-projection-consecutive-read-rootfix-v1', ok:true, status:'R4S6_CLIENT_PROJECTION_ROOTFIX_APPLIED_SOURCE_ONLY', classification:'FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_CANDIDATE', failureFamily:'CLIENT_PROJECTION_FULL_CLIENT_NATIVE_CLONE_REPEATS_ACROSS_ROLE_SCOPE_CLIENTE360_BATCH_AND_VISUAL_ENHANCER', owner:OWNER, ownerBeforeSha256:sha256(currentSource), ownerAfterSha256:sha256(patched), diagnosis, browserExecuted:false, runtimeExecuted:false, secretAccess:false, dataAccess:false, firestoreWrites:0, authWrites:0, operationalWrites:0, storeModified:false, moduleModified:false, productionTouched:false };
  write(payload); console.log(JSON.stringify(payload, null, 2)); process.exit(0);
}

if (mode === 'diagnose') {
  const baseline = snapshot(runProjection(baselineSource));
  const tripleReadReproduced = (baseline.nativeAll.calls.clientes || 0) >= 5;
  const payload = { schemaVersion:'orbit360-r4s6-client-projection-consecutive-read-rootfix-v1', ok:diagnosisPass && tripleReadReproduced, status:diagnosisPass && tripleReadReproduced?'R4S6_CLIENT_PROJECTION_ROOT_CAUSE_DIAGNOSIS_SOURCE_PASS':'R4S6_CLIENT_PROJECTION_ROOT_CAUSE_DIAGNOSIS_SOURCE_FAIL', classification:diagnosisPass && tripleReadReproduced?'FUNCTIONAL_DEFECT_ROOT_CAUSE_CONFIRMED':'PIPELINE_MECHANISM_FAILURE', failureFamily:'CLIENT_PROJECTION_FULL_CLIENT_NATIVE_CLONE_REPEATS_ACROSS_ROLE_SCOPE_CLIENTE360_BATCH_AND_VISUAL_ENHANCER', owner:OWNER, diagnosis, baseline, tripleReadReproduced, storeSha256:sha256(storeSource), browserExecuted:false, runtimeExecuted:false, secretAccess:false, dataAccess:false, firestoreWrites:0, authWrites:0, operationalWrites:0, storeModified:false, moduleModified:false, productionTouched:false };
  write(payload); console.log(JSON.stringify(payload, null, 2)); if(!payload.ok) process.exit(41); process.exit(0);
}

const candidateSource = currentSource;
if (!candidateSource.includes("clientProjectionReadCacheRevision:'20260817.1'")) fail('CANDIDATE_REVISION_MISSING');
const baselineRun = snapshot(runProjection(baselineSource));
const candidateRun = snapshot(runProjection(candidateSource));
const baselineCalls = baselineRun.nativeAll.calls.clientes || 0;
const candidateCalls = candidateRun.nativeAll.calls.clientes || 0;
const baselineRows = baselineRun.nativeAll.rows.clientes || 0;
const candidateRows = candidateRun.nativeAll.rows.clientes || 0;
const baselineBytes = baselineRun.nativeAll.bytes.clientes || 0;
const candidateBytes = candidateRun.nativeAll.bytes.clientes || 0;
const rowReductionPct = baselineRows ? +((1-candidateRows/baselineRows)*100).toFixed(2) : 0;
const byteReductionPct = baselineBytes ? +((1-candidateBytes/baselineBytes)*100).toFixed(2) : 0;
const callReductionPct = baselineCalls ? +((1-candidateCalls/baselineCalls)*100).toFixed(2) : 0;
const timeReductionPct = baselineRun.elapsedMs ? +((1-candidateRun.elapsedMs/baselineRun.elapsedMs)*100).toFixed(2) : 0;
const invalidation = verifyInvalidations(candidateSource);
const candidatePerf = candidateRun.projection.clientProjection || {};
const semanticEqual = baselineRun.semantic === candidateRun.semantic;
const countsEqual = JSON.stringify(baselineRun.counts) === JSON.stringify(candidateRun.counts);
const pass = semanticEqual && countsEqual && candidateRun.topLevelIsolation === true && baselineCalls >= 5 && candidateCalls <= 2 && callReductionPct >= 60 && rowReductionPct >= 60 && byteReductionPct >= 60 && Number(candidatePerf.builds) === 1 && Number(candidatePerf.hits) >= 4 && invalidation.pass && candidateSource.includes("collection === 'clientes') invalidateClientProjectionRows('store:clientes')") && candidateSource.includes("collection === '*' || collection === 'polizas' || collection === 'cobros'") && candidateSource.includes("invalidateSegmentationContext('threshold')");
const payload = { schemaVersion:'orbit360-r4s6-client-projection-consecutive-read-rootfix-v1', ok:pass, status:pass?'R4S6_CLIENT_PROJECTION_CONSECUTIVE_READ_ROOTFIX_SOURCE_PASS':'R4S6_CLIENT_PROJECTION_CONSECUTIVE_READ_ROOTFIX_SOURCE_FAIL', classification:pass?'FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_PROVEN':'FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_NOT_PROVEN', failureFamily:'CLIENT_PROJECTION_FULL_CLIENT_NATIVE_CLONE_REPEATS_ACROSS_ROLE_SCOPE_CLIENTE360_BATCH_AND_VISUAL_ENHANCER', owner:OWNER, baselineSha256:sha256(baselineSource), candidateSha256:sha256(candidateSource), diagnosis, semanticEqual, countsEqual, topLevelIsolation:candidateRun.topLevelIsolation, baseline:baselineRun, candidate:candidateRun, reduction:{ callReductionPct,rowReductionPct,byteReductionPct,timeReductionPct }, invalidation, protectedStoreSha256:sha256(storeSource), protectedStoreModified:false, moduleModified:false, browserExecuted:false, runtimeExecuted:false, secretAccess:false, dataAccess:false, firestoreWrites:0, authWrites:0, operationalWrites:0, productionTouched:false };
write(payload); console.log(JSON.stringify(payload, null, 2)); if(!pass) process.exit(41);
