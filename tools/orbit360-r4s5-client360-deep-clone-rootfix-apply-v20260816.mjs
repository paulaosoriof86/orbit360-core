import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const CORE = 'orbit360-platform/core/client-insurer-visual-contract-v20260720.js';
const CLIENT = 'orbit360-platform/modules/cliente360.js';
const EXPECTED_CORE_BLOB = '573f210b81a8e219e056fe82d3f79ad6622d83f8';
const EXPECTED_CLIENT_BLOB = '4834b696cf5335b2bce478248aed60d5b59a2de8';

function fail(message) { throw new Error(message); }
function blob(path) { return execFileSync('git', ['hash-object', path], { encoding: 'utf8' }).trim(); }
function sha256(path) { return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'); }
function replaceOnce(source, pattern, replacement, label) {
  const matches = source.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')) || [];
  if (matches.length !== 1) fail(`${label}: expected 1 match, got ${matches.length}`);
  return source.replace(pattern, replacement);
}

if (blob(CORE) !== EXPECTED_CORE_BLOB) fail(`CORE_BASE_BLOB_MISMATCH:${blob(CORE)}`);
if (blob(CLIENT) !== EXPECTED_CLIENT_BLOB) fail(`CLIENT_BASE_BLOB_MISMATCH:${blob(CLIENT)}`);

let core = fs.readFileSync(CORE, 'utf8');
core = replaceOnce(
  core,
  /if \(Orbit\.clientInsurerVisualContractV20260720 && Orbit\.clientInsurerVisualContractV20260720\.version === '20260720\.2' && Orbit\.clientInsurerVisualContractV20260720\.visualRemediationRevision === '20260722\.1'\) return;/,
  "if (Orbit.clientInsurerVisualContractV20260720 && Orbit.clientInsurerVisualContractV20260720.version === '20260720.2' && Orbit.clientInsurerVisualContractV20260720.visualRemediationRevision === '20260722.1' && Orbit.clientInsurerVisualContractV20260720.clientProjectionReadCacheRevision === '20260816.2') return;",
  'core idempotence guard'
);

core = replaceOnce(
  core,
  /  function buildSegmentationContext\(readAll\) \{[\s\S]*?\n  \}\n  function segmentFor/,
`  var segmentationContextCache = { epoch: 0, threshold: null, context: null, builds: 0, hits: 0, invalidations: 0, batchReads: 0 };
  function invalidateSegmentationContext() {
    segmentationContextCache.epoch += 1;
    segmentationContextCache.threshold = null;
    segmentationContextCache.context = null;
    segmentationContextCache.invalidations += 1;
  }
  function buildSegmentationContext(readAll, preloaded) {
    var threshold = premiumThreshold(), policies = [], collections = [], policiesByClient = new Map(), collectedByClient = new Map(), collectionsComplete = false;
    try { policies = preloaded && Array.isArray(preloaded.polizas) ? preloaded.polizas : (typeof readAll === 'function' ? (readAll('polizas') || []) : rawRows('polizas')); } catch (e) { policies = []; }
    policies.forEach(function (p) {
      if (!p || p.clienteId == null) return;
      var rows = policiesByClient.get(p.clienteId);
      if (!rows) { rows = []; policiesByClient.set(p.clienteId, rows); }
      rows.push(p);
    });
    if (threshold > 0) {
      try { collections = preloaded && Array.isArray(preloaded.cobros) ? preloaded.cobros : (typeof readAll === 'function' ? (readAll('cobros') || []) : rawRows('cobros')); } catch (e2) { collections = []; }
      collectionsComplete = true;
      collections.forEach(function (c) {
        if (!c || c.clienteId == null || c.estado !== 'Pagado' || c.conciliado !== true) return;
        collectedByClient.set(c.clienteId, (collectedByClient.get(c.clienteId) || 0) + (+c.neta || 0));
      });
    }
    return { batched: true, threshold: threshold, policiesByClient: policiesByClient, collectedByClient: collectedByClient, policyRowCount: policies.length, collectionRowCount: collections.length, policies: policies, collections: collections, collectionsComplete: collectionsComplete };
  }
  function segmentFor`,
  'segmentation context cache helpers'
);

core = replaceOnce(
  core,
  /  function installClientReadProjection\(\) \{[\s\S]*?\n  \}\n  installClientReadProjection\(\);/,
`  function installClientReadProjection() {
    var store = Orbit.store; if (!store) return;
    var previous = store.__clientCanonicalReadProjectionV20260720;
    if (previous && previous.version === '20260720.2' && previous.segmentationBatchRevision === '20260816.2') return;
    var nativeAll = previous && previous.nativeAll || store.all.bind(store);
    var nativeWhere = previous && previous.nativeWhere || store.where && store.where.bind(store);
    var nativeFind = previous && previous.nativeFind || store.find && store.find.bind(store);
    var activeReadBatch = null;
    function cachedSegmentationContext() {
      var threshold = premiumThreshold();
      if (segmentationContextCache.context && segmentationContextCache.threshold === threshold) {
        segmentationContextCache.hits += 1;
        return segmentationContextCache.context;
      }
      if (segmentationContextCache.context && segmentationContextCache.threshold !== threshold) invalidateSegmentationContext();
      var context = buildSegmentationContext(nativeAll);
      segmentationContextCache.threshold = threshold;
      segmentationContextCache.context = context;
      segmentationContextCache.builds += 1;
      return context;
    }
    function projectedAll(collection) {
      if (activeReadBatch && Object.prototype.hasOwnProperty.call(activeReadBatch.rows, collection)) return activeReadBatch.rows[collection].slice();
      var rows = nativeAll(collection) || [];
      if (collection !== 'clientes') return rows;
      var segmentationContext = cachedSegmentationContext();
      return rows.map(function (row) { return projectClient(row, segmentationContext); });
    }
    function evaluate(rows,args) {
      var f=args[1], ov=args[2], mv=args[3];
      if (typeof f === 'function') return rows.filter(function(r){ try{return !!f(r);}catch(e){return false;} });
      if (f && typeof f === 'object') return rows.filter(function(r){return Object.keys(f).every(function(k){return r&&r[k]===f[k];});});
      var op=args.length>=4?ov:'==', value=args.length>=4?mv:ov;
      return rows.filter(function(r){if(!r)return false;if(op==='=='||op==='=')return r[f]===value;if(op==='!=')return r[f]!==value;if(op==='>')return r[f]>value;if(op==='>=')return r[f]>=value;if(op==='<')return r[f]<value;if(op==='<=')return r[f]<=value;if(op==='array-contains')return Array.isArray(r[f])&&r[f].indexOf(value)>=0;return r[f]===value;});
    }
    function withReadBatch(collections, callback) {
      if (typeof callback !== 'function') throw new Error('CLIENT_PROJECTION_READ_BATCH_CALLBACK_REQUIRED');
      if (activeReadBatch) return callback(activeReadBatch.rows);
      var requested = Array.from(new Set((Array.isArray(collections) ? collections : []).concat(['clientes'])));
      var context = cachedSegmentationContext(), rows = {};
      requested.forEach(function (collection) {
        if (collection === 'clientes') {
          rows.clientes = (nativeAll('clientes') || []).map(function (row) { return projectClient(row, context); });
        } else if (collection === 'polizas') {
          rows.polizas = context.policies;
        } else if (collection === 'cobros' && context.collectionsComplete) {
          rows.cobros = context.collections;
        } else {
          rows[collection] = nativeAll(collection) || [];
        }
      });
      activeReadBatch = { rows: rows };
      segmentationContextCache.batchReads += 1;
      try {
        var result = callback(rows);
        if (result && typeof result.then === 'function') throw new Error('CLIENT_PROJECTION_READ_BATCH_MUST_BE_SYNC');
        return result;
      } finally { activeReadBatch = null; }
    }
    function performanceState() {
      return { revision:'20260816.2', epoch:segmentationContextCache.epoch, builds:segmentationContextCache.builds, hits:segmentationContextCache.hits, invalidations:segmentationContextCache.invalidations, batchReads:segmentationContextCache.batchReads, threshold:segmentationContextCache.threshold };
    }
    store.all=function(collection){return projectedAll(collection);};
    if(nativeWhere) store.where=function(){return arguments[0]==='clientes'?evaluate(projectedAll('clientes'),arguments):nativeWhere.apply(store,arguments);};
    if(nativeFind) store.find=function(collection,predicate){if(collection!=='clientes')return nativeFind.apply(store,arguments);if(typeof predicate==='function')return projectedAll('clientes').find(predicate)||null;if(predicate&&typeof predicate==='object')return evaluate(projectedAll('clientes'),[collection,predicate])[0]||null;return null;};
    if (typeof store.on === 'function') {
      try { store.on(function (collection) { if (collection === '*' || collection === 'polizas' || collection === 'cobros') invalidateSegmentationContext(); }); } catch (e) {}
    }
    store.__clientCanonicalReadProjectionV20260720={version:'20260720.2',writesStore:false,reimportsData:false,nativeAll:nativeAll,nativeWhere:nativeWhere,nativeFind:nativeFind,segmentationBatchRevision:'20260816.2',withReadBatch:withReadBatch,performanceState:performanceState};
  }
  installClientReadProjection();`,
  'client projection install'
);

core = replaceOnce(
  core,
  /  Orbit\.clientProjection=\{version:'20260720\.2',project:projectClient,get:function\(id\)\{return projectClient\(Orbit\.store&&Orbit\.store\.get\?Orbit\.store\.get\('clientes',id\):null\);\},normalizeType:normalizeType,normalizeCountry:normalizeCountry,normalizeDate:normalizeDate,writesStore:false,reimportsData:false,createsRelations:false\};/,
  "  Orbit.clientProjection={version:'20260720.2',project:projectClient,get:function(id){return projectClient(Orbit.store&&Orbit.store.get?Orbit.store.get('clientes',id):null);},normalizeType:normalizeType,normalizeCountry:normalizeCountry,normalizeDate:normalizeDate,withReadBatch:function(collections,callback){var meta=Orbit.store&&Orbit.store.__clientCanonicalReadProjectionV20260720;return meta&&typeof meta.withReadBatch==='function'?meta.withReadBatch(collections,callback):callback({});},readPerformanceState:function(){var meta=Orbit.store&&Orbit.store.__clientCanonicalReadProjectionV20260720;return meta&&typeof meta.performanceState==='function'?meta.performanceState():{revision:'unavailable'};},writesStore:false,reimportsData:false,createsRelations:false};",
  'client projection public batch helper'
);

core = replaceOnce(
  core,
  /clientProjectionBatchRevision:'20260816\.1',writesStore:false/,
  "clientProjectionBatchRevision:'20260816.2',clientProjectionReadCacheRevision:'20260816.2',writesStore:false",
  'contract revision marker'
);

let client = fs.readFileSync(CLIENT, 'utf8');
client = replaceOnce(
  client,
  /  function lista\(\) \{\n    const clientes = S\(\)\.all\('clientes'\);\n    const asesores = S\(\)\.all\('asesores'\);\n    const f = filtros;\n    const renderStartedAt = perfNow\(\);\n    const summaryStartedAt = perfNow\(\);\n    const summaryIndex = q\.clientesResumenIndex \? q\.clientesResumenIndex\(\) : null;\n    const summaryCacheMs = perfNow\(\) - summaryStartedAt;/,
`  function lista() {
    const f = filtros;
    const renderStartedAt = perfNow();
    const summaryStartedAt = perfNow();
    const batchRunner = Orbit.clientProjection && typeof Orbit.clientProjection.withReadBatch === 'function' ? Orbit.clientProjection.withReadBatch : null;
    const summaryBatch = q.clientesResumenIndex && batchRunner ? batchRunner(['clientes', 'polizas', 'cobros', 'comisiones'], source => ({ summaryIndex: q.clientesResumenIndex(), clientes: source.clientes || [], polizas: source.polizas || [] })) : null;
    const summaryIndex = summaryBatch ? summaryBatch.summaryIndex : (q.clientesResumenIndex ? q.clientesResumenIndex() : null);
    const clientes = summaryBatch ? summaryBatch.clientes : S().all('clientes');
    const policiesForList = summaryBatch ? summaryBatch.polizas : null;
    const asesores = S().all('asesores');
    const summaryCacheMs = perfNow() - summaryStartedAt;`,
  'cliente360 list batch prelude'
);

client = replaceOnce(
  client,
  /    const totPrima = clientes\.reduce\(\(s, c\) => \{ const r = resumenDe\(c\); return s \+ \(r\.moneda === 'COP' \? r\.primaAnual \/ 1000 : r\.primaAnual\); \}, 0\);\n    const summaryAggregateMs = perfNow\(\) - summaryAggregateStartedAt;/,
`    const totPrima = clientes.reduce((s, c) => { const r = resumenDe(c); return s + (r.moneda === 'COP' ? r.primaAnual / 1000 : r.primaAnual); }, 0);
    const activePolicyCount = policiesForList ? policiesForList.filter(esRenovable).length : S().where('polizas', p => p.estado === 'Vigente' || p.estado === 'Por renovar').length;
    const totalPolicyCount = policiesForList ? policiesForList.length : S().all('polizas').length;
    const renewals45Count = policiesForList ? policiesForList.filter(p => { const d = U.daysFromNow(p.vigenciaFin); return esRenovable(p) && d != null && d >= 0 && d <= 45; }).length : q.renovacionesProximas(45).length;
    const summaryAggregateMs = perfNow() - summaryAggregateStartedAt;`,
  'cliente360 list aggregate reuse'
);

client = replaceOnce(client, /\$\{S\(\)\.where\('polizas', p => p\.estado === 'Vigente' \|\| p\.estado === 'Por renovar'\)\.length\}/, '${activePolicyCount}', 'cliente360 active policy KPI');
client = replaceOnce(client, /\$\{S\(\)\.all\('polizas'\)\.length\}/, '${totalPolicyCount}', 'cliente360 total policy KPI');
client = replaceOnce(client, /\$\{q\.renovacionesProximas\(45\)\.length\}/, '${renewals45Count}', 'cliente360 renewal KPI');
client = replaceOnce(client, /version: '20260807\.19-bounded-list-render'/, "version: '20260816.20-bounded-list-batch-read'", 'cliente360 diagnostics revision');
client = replaceOnce(client, /list: \{ bounded: true, pageSize:/, 'list: { bounded: true, batchRead: !!summaryBatch, pageSize:', 'cliente360 diagnostics batch marker');

fs.writeFileSync(CORE, core, 'utf8');
fs.writeFileSync(CLIENT, client, 'utf8');

const result = {
  ok: true,
  status: 'R4S5_CLIENT360_DEEP_CLONE_ROOTFIX_APPLIED_SOURCE_ONLY',
  files: [
    { path: CORE, beforeBlob: EXPECTED_CORE_BLOB, afterBlob: blob(CORE), sha256: sha256(CORE) },
    { path: CLIENT, beforeBlob: EXPECTED_CLIENT_BLOB, afterBlob: blob(CLIENT), sha256: sha256(CLIENT) }
  ],
  productStoreModified: false,
  browserExecuted: false,
  runtimeExecuted: false,
  deployExecuted: false,
  productionTouched: false
};
console.log(JSON.stringify(result, null, 2));
