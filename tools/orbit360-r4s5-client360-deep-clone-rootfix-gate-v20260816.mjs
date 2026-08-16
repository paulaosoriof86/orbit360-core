import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const ROOT = process.cwd();
const PUBLIC_SOURCE = '5474a1a9af64c018e6dcc71b4ad0cdfe57ce0484';
const CORE = 'orbit360-platform/core/client-insurer-visual-contract-v20260720.js';
const CLIENT = 'orbit360-platform/modules/cliente360.js';
const QUERIES = 'orbit360-platform/core/queries.js';
const OUT = process.env.ORBIT360_CLIENT360_DEEP_CLONE_GATE_OUT || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/r4s5-client360-deep-clone-rootfix-source-v20260816.json');
const EXPECTED_PUBLIC_CORE_SHA256 = 'ad6fa96614d4eefe29880fac26a1c349ae24940adc2d8ff75ad04d991595b067';
const EXPECTED_QUERIES_SHA256 = 'b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b';
const TODAY = new Date('2026-08-16T12:00:00Z');

function assert(condition, message) { if (!condition) throw new Error(message); }
function shaText(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function shaFile(file) { return shaText(fs.readFileSync(file)); }
function gitShow(ref, file) { return execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }); }
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function payload(prefix, i) {
  return {
    source: `${prefix}-${i}`,
    trace: { file: `f-${i % 11}.xlsx`, sheet: `s-${i % 4}`, row: i + 2, country: i % 2 ? 'CO' : 'GT', currency: i % 2 ? 'COP' : 'GTQ' },
    notes: [`nota-${i}`, `control-${i % 9}`, 'representative-object-payload'],
    attributes: { channel: i % 3 ? 'broker' : 'direct', quality: 80 + (i % 20), flags: [i % 5 === 0 ? 'review' : 'ok'] }
  };
}
function makeData() {
  const recent = '2026-08-01', old = '2025-01-01', renewal = '2026-09-01';
  const clientes = Array.from({ length: 430 }, (_, i) => ({
    id: `c${i}`, nombreCompleto: `Cliente ${i}`, email: `cliente${i}@example.test`, identificacion: `ID-${100000 + i}`,
    tipoPersona: i % 7 === 0 ? 'Jurídica' : 'Natural', paisCodigo: i % 2 === 0 ? 'GT' : 'CO', ciudad: `Ciudad ${i % 12}`,
    asesorId: `a${i % 7}`, segmento: `origen-${i}`, etiquetas: i % 3 === 0 ? ['control', `grupo-${i % 5}`] : [],
    contacto: { telefono: `555${String(i).padStart(5, '0')}`, preferencia: i % 2 ? 'correo' : 'telefono' }, payload: payload('cliente', i)
  }));
  const polizas = [];
  let policySeq = 0;
  function addPolicy(clientIndex, estado, extra = {}) {
    const i = policySeq++;
    polizas.push({ id: `p${i}`, clienteId: `c${clientIndex}`, asesorId: `a${clientIndex % 7}`, estado, vigenciaIni: extra.vigenciaIni || old, vigenciaFin: extra.vigenciaFin || renewal,
      prima: 1000 + (i % 500), moneda: clientIndex % 2 ? 'COP' : 'GTQ', coberturas: [{ codigo: 'BAS', limite: 10000 + i }, { codigo: 'RC', limite: 5000 + i }], payload: payload('poliza', i), ...extra });
  }
  for (let i = 50; i < 100; i += 1) addPolicy(i, 'Vigente', { vigenciaIni: recent });
  for (let i = 100; i < 150; i += 1) addPolicy(i, 'Vigente', { vigenciaIni: old });
  for (let i = 150; i < 200; i += 1) addPolicy(i, 'Cancelada', { vigenciaIni: old });
  for (let i = 200; i < 250; i += 1) { addPolicy(i, 'Vigente', { vigenciaIni: old }); addPolicy(i, 'Por renovar', { vigenciaIni: old }); }
  for (let i = 250; i < 300; i += 1) addPolicy(i, 'Vigente', { vigenciaIni: old, esRenovacion: true });
  for (let i = 300; i < 430; i += 1) addPolicy(i, 'Vigente', { vigenciaIni: old });
  while (polizas.length < 1375) {
    const i = 200 + ((polizas.length - 430) % 230);
    addPolicy(i, 'Cancelada', { vigenciaIni: old, vigenciaFin: '2025-12-31' });
  }
  assert(polizas.length === 1375, 'fixture polizas != 1375');
  const cobros = Array.from({ length: 1900 }, (_, i) => ({ id: `co${i}`, clienteId: `c${i % 430}`, estado: i % 6 === 0 ? 'Vencido' : 'Pendiente', conciliado: false,
    neta: 100 + (i % 30), monto: 120 + (i % 30), moneda: i % 2 ? 'COP' : 'GTQ', vence: i % 4 ? '2026-08-30' : '2026-07-15', payload: payload('cobro', i) }));
  for (let i = 0; i < 5; i += 1) cobros[i] = { ...cobros[i], clienteId: 'c300', estado: 'Pagado', conciliado: true, neta: 250, monto: 300 };
  const comisiones = Array.from({ length: 900 }, (_, i) => ({ id: `cm${i}`, clienteId: `c${i % 430}`, asesorId: `a${i % 7}`, monto: 25 + (i % 10), moneda: i % 2 ? 'COP' : 'GTQ', estado: i % 2 ? 'Liquidada' : 'Devengada', payload: payload('comision', i) }));
  const asesores = Array.from({ length: 7 }, (_, i) => ({ id: `a${i}`, nombre: `Asesor ${i}`, color: `#${String(111111 + i * 12345).slice(0,6)}`, meta: payload('asesor', i) }));
  const aseguradoras = Array.from({ length: 30 }, (_, i) => ({ id: `ins${i}`, nombre: `Aseguradora ${i}`, pais: i % 2 ? 'CO' : 'GT', meta: payload('aseguradora', i) }));
  return { clientes, polizas, cobros, comisiones, asesores, aseguradoras };
}

function makeStore(data, metrics) {
  const listeners = [];
  function cloneRows(rows) {
    metrics.cloneRows += rows.length;
    let bytes = 0;
    rows.forEach(row => { bytes += Buffer.byteLength(JSON.stringify(row)); });
    metrics.cloneBytes += bytes;
    return deepClone(rows);
  }
  const store = {
    all(collection) { metrics.allCalls += 1; return cloneRows(data[collection] || []); },
    get(collection, id) { return this.all(collection).find(row => row && row.id === id) || null; },
    where(collection, predicate) { const rows = this.all(collection); return typeof predicate === 'function' ? rows.filter(predicate) : rows; },
    find(collection, predicate) { const rows = this.all(collection); return typeof predicate === 'function' ? (rows.find(predicate) || null) : null; },
    on(collection, callback) {
      if (typeof collection === 'function') { callback = collection; collection = '*'; }
      const item = { collection: collection || '*', callback }; listeners.push(item);
      return () => { const idx = listeners.indexOf(item); if (idx >= 0) listeners.splice(idx, 1); };
    },
    _emit(collection) { listeners.slice().forEach(item => { if (item.collection === '*' || item.collection === collection || collection === '*') { try { item.callback(collection); } catch {} } }); },
    pref(_key, def) { return def; },
    insert() { metrics.writes += 1; throw new Error('write forbidden'); },
    update() { metrics.writes += 1; throw new Error('write forbidden'); },
    remove() { metrics.writes += 1; throw new Error('write forbidden'); },
    setPref() { metrics.writes += 1; throw new Error('write forbidden'); },
    reseed() { metrics.writes += 1; throw new Error('write forbidden'); }
  };
  return store;
}

function makeUi() {
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
  return {
    esc,
    avatar(name) { return `<span class="avatar">${esc(String(name || '').slice(0, 2))}</span>`; },
    money(value, currency) { return `${currency || ''} ${Number(value || 0).toFixed(2)}`; },
    moneyShort(value, currency) { return `${currency || ''} ${Math.round(Number(value || 0))}`; },
    daysFromNow(value) { const t = new Date(String(value || '') + 'T00:00:00Z').getTime(); return Number.isNaN(t) ? null : Math.floor((t - TODAY.getTime()) / 86400000); },
    toast() {}
  };
}

function runVariant(coreSource, clientSource, querySource) {
  const data = makeData();
  const metrics = { allCalls: 0, cloneRows: 0, cloneBytes: 0, writes: 0 };
  const host = { innerHTML: '' };
  const diagnostics = {};
  const documentStub = {
    activeElement: null,
    body: { innerText: '' },
    documentElement: { classList: { add() {} } },
    addEventListener() {},
    getElementById() { return null; },
    createElement() { return { classList: { add() {} }, dataset: {}, appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; } }; }
  };
  const Orbit = {
    store: null,
    modules: {},
    route: { params: {}, key: 'cliente360' },
    tenant: { segmentacion: { premiumPrimaNetaRecaudada: 1000 } },
    config: {}, pais: 'GT',
    ui: makeUi(),
    kit: { bannerFor() { return '<div class="banner">Cliente 360</div>'; } },
    session: { rol() { return 'Dirección'; } },
    auth: { user() { return { rol: 'Dirección' }; } },
    kpi() {}
  };
  Orbit.store = makeStore(data, metrics);
  const windowStub = { Orbit, OrbitRuntimeDiagnostics: diagnostics, addEventListener() {} };
  const context = vm.createContext({
    window: windowStub, Orbit, OrbitRuntimeDiagnostics: diagnostics, document: documentStub,
    location: { hash: '' }, navigator: { clipboard: null }, console, performance,
    requestAnimationFrame(callback) { callback(); return 1; }, cancelAnimationFrame() {}, setTimeout, clearTimeout,
    alert() {}, Date, Math, Map, Set, Array, Object, String, Number, Boolean, JSON
  });
  new vm.Script(querySource, { filename: QUERIES }).runInContext(context);
  new vm.Script(coreSource, { filename: CORE }).runInContext(context);
  new vm.Script(clientSource, { filename: CLIENT }).runInContext(context);

  const roleScope = Orbit.store.all('clientes');
  assert(roleScope.length === 430, 'role-scope clientes != 430');
  Orbit.modules.cliente360.render(host);
  const projected = Orbit.store.all('clientes').map(row => ({ id: row.id, nombre: row.nombre, tipo: row.tipo, pais: row.pais, moneda: row.moneda, segmento: row.segmento, asesorId: row.asesorId }));
  const perfState = Orbit.clientProjection && Orbit.clientProjection.readPerformanceState ? Orbit.clientProjection.readPerformanceState() : { revision: 'baseline' };
  return { data, metrics: { ...metrics }, hostHtml: host.innerHTML, projected, perfState, Orbit };
}

const currentCore = fs.readFileSync(CORE, 'utf8');
const currentClient = fs.readFileSync(CLIENT, 'utf8');
const queries = fs.readFileSync(QUERIES, 'utf8');
const baselineCore = gitShow(PUBLIC_SOURCE, CORE);
const baselineClient = gitShow(PUBLIC_SOURCE, CLIENT);

assert(shaText(baselineCore) === EXPECTED_PUBLIC_CORE_SHA256, 'public R4S5 core sha mismatch');
assert(shaFile(QUERIES) === EXPECTED_QUERIES_SHA256, 'queries.js changed from certified hash');
assert(currentCore.includes("segmentationBatchRevision:'20260816.2'"), 'candidate cache revision absent');
assert(currentCore.includes('withReadBatch:withReadBatch'), 'candidate withReadBatch metadata absent');
assert(currentClient.includes("version: '20260816.20-bounded-list-batch-read'"), 'cliente360 batch revision absent');
assert(currentClient.includes("batchRunner(['clientes', 'polizas', 'cobros', 'comisiones']"), 'cliente360 real batch sequence absent');

const baseline = runVariant(baselineCore, baselineClient, queries);
const candidate = runVariant(currentCore, currentClient, queries);
assert(JSON.stringify(candidate.projected) === JSON.stringify(baseline.projected), 'projected client semantics changed');
assert(candidate.hostHtml === baseline.hostHtml, 'cliente360 rendered HTML semantics changed');
assert(candidate.metrics.writes === 0 && baseline.metrics.writes === 0, 'write observed');
assert(candidate.metrics.cloneRows < baseline.metrics.cloneRows * 0.4, `clone-row reduction insufficient: ${candidate.metrics.cloneRows}/${baseline.metrics.cloneRows}`);
assert(candidate.metrics.cloneBytes < baseline.metrics.cloneBytes * 0.4, `clone-byte reduction insufficient: ${candidate.metrics.cloneBytes}/${baseline.metrics.cloneBytes}`);
assert(candidate.metrics.allCalls < baseline.metrics.allCalls * 0.5, `all-call reduction insufficient: ${candidate.metrics.allCalls}/${baseline.metrics.allCalls}`);
assert(candidate.perfState.revision === '20260816.2', 'candidate performance state revision mismatch');
assert(candidate.perfState.hits >= 1, 'segmentation context cache was not reused');
assert(candidate.perfState.batchReads >= 1, 'cliente360 batch read not observed');

// Invalidation proof: relevant collection emission must rebuild and alter semantics when source data changes.
const beforeInvalidation = candidate.Orbit.store.all('clientes').find(row => row.id === 'c50');
assert(beforeInvalidation && beforeInvalidation.segmento === 'Nuevo', `expected c50 Nuevo before invalidation, got ${beforeInvalidation && beforeInvalidation.segmento}`);
candidate.data.polizas.push({ id:'p-invalidation', clienteId:'c50', asesorId:'a1', estado:'Cancelada', vigenciaIni:'2025-01-01', vigenciaFin:'2025-12-31', prima:10, moneda:'GTQ', payload:payload('invalidation',1) });
candidate.Orbit.store._emit('polizas');
const afterInvalidation = candidate.Orbit.store.all('clientes').find(row => row.id === 'c50');
assert(afterInvalidation && afterInvalidation.segmento === 'Recurrente', `cache invalidation failed, got ${afterInvalidation && afterInvalidation.segmento}`);
const afterPerf = candidate.Orbit.clientProjection.readPerformanceState();
assert(afterPerf.invalidations >= 1 && afterPerf.builds >= candidate.perfState.builds + 1, 'cache did not rebuild after polizas emit');

const evidence = {
  schemaVersion: 'orbit360-r4s5-client360-deep-clone-rootfix-source-v1',
  ok: true,
  status: 'R4S5_CLIENT360_DEEP_CLONE_COMPOSITION_ROOTFIX_SOURCE_PASS',
  classification: 'FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_PROVEN',
  failureFamily: 'CLIENT_VISUAL_PROJECTION_REBUILDS_DEEP_CLONE_BATCH_PER_READ_AND_CLIENTE360_DUPLICATES_GLOBAL_READS',
  publicBaselineSource: PUBLIC_SOURCE,
  fixture: { clientes:430, polizas:1375, cobros:1900, comisiones:900, asesores:7, aseguradoras:30, representativeNestedPayload:true, premiumThreshold:1000 },
  semanticEqual: true,
  renderedHtmlEqual: true,
  projectedClientsEqual: true,
  baseline: { allCalls: baseline.metrics.allCalls, cloneRows: baseline.metrics.cloneRows, cloneBytes: baseline.metrics.cloneBytes },
  candidate: { allCalls: candidate.metrics.allCalls, cloneRows: candidate.metrics.cloneRows, cloneBytes: candidate.metrics.cloneBytes, performanceState: candidate.perfState },
  reduction: {
    allCallRatio: +(baseline.metrics.allCalls / candidate.metrics.allCalls).toFixed(2),
    cloneRowRatio: +(baseline.metrics.cloneRows / candidate.metrics.cloneRows).toFixed(2),
    cloneByteRatio: +(baseline.metrics.cloneBytes / candidate.metrics.cloneBytes).toFixed(2),
    cloneRowsReductionPercent: +((1 - candidate.metrics.cloneRows / baseline.metrics.cloneRows) * 100).toFixed(2),
    cloneBytesReductionPercent: +((1 - candidate.metrics.cloneBytes / baseline.metrics.cloneBytes) * 100).toFixed(2)
  },
  invalidation: { polizasEmitRebuilt:true, beforeSegment:'Nuevo', afterSegment:'Recurrente', performanceState:afterPerf },
  coreSha256: shaFile(CORE),
  cliente360Sha256: shaFile(CLIENT),
  queriesSha256: shaFile(QUERIES),
  queriesSha256MatchesCertifiedR4S4: true,
  protectedStoreModified: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: candidate.metrics.writes,
  browserExecuted: false,
  runtimeExecuted: false,
  secretAccess: false,
  dataAccess: false,
  deployExecuted: false,
  productionTouched: false,
  packageRebuilt: false,
  containsPII: false,
  containsSecrets: false
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(evidence, null, 2));
