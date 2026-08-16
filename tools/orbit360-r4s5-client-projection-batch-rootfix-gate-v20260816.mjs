import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const TARGET = path.join(ROOT, 'orbit360-platform/core/client-insurer-visual-contract-v20260720.js');
const QUERIES = path.join(ROOT, 'orbit360-platform/core/queries.js');
const OUT = process.env.ORBIT360_CLIENT_PROJECTION_GATE_OUT || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/r4s5-client-projection-batch-rootfix-source-v20260816.json');
const EXPECTED_QUERIES_SHA256 = 'b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b';

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function clone(row) {
  return row && typeof row === 'object' ? { ...row } : row;
}

const day = 86400000;
const recent = new Date(Date.now() - 30 * day).toISOString().slice(0, 10);
const old = new Date(Date.now() - 365 * day).toISOString().slice(0, 10);
const clientes = Array.from({ length: 430 }, (_, i) => ({
  id: `c${i}`,
  nombreCompleto: `Cliente ${i}`,
  tipoPersona: i % 7 === 0 ? 'Jurídica' : 'Natural',
  paisCodigo: i % 2 === 0 ? 'GT' : 'CO',
  segmento: `origen-${i}`,
  etiquetas: i % 3 === 0 ? ['control'] : []
}));

const polizas = [];
let policySeq = 0;
function addPolicy(clientIndex, estado, extra = {}) {
  polizas.push({ id: `p${policySeq++}`, clienteId: `c${clientIndex}`, estado, vigenciaIni: extra.vigenciaIni || old, ...extra });
}
for (let i = 50; i < 100; i += 1) addPolicy(i, 'Vigente', { vigenciaIni: recent });
for (let i = 100; i < 150; i += 1) addPolicy(i, 'Vigente', { vigenciaIni: old });
for (let i = 150; i < 200; i += 1) addPolicy(i, 'Cancelada', { vigenciaIni: old });
for (let i = 200; i < 250; i += 1) { addPolicy(i, 'Vigente', { vigenciaIni: old }); addPolicy(i, 'Por renovar', { vigenciaIni: old }); }
for (let i = 250; i < 300; i += 1) addPolicy(i, 'Vigente', { vigenciaIni: old, esRenovacion: true });
for (let i = 300; i < 430; i += 1) addPolicy(i, 'Vigente', { vigenciaIni: old });
while (polizas.length < 1375) {
  const i = 200 + ((polizas.length - 430) % 230);
  addPolicy(i, 'Cancelada', { vigenciaIni: old });
}
assert(polizas.length === 1375, 'fixture polizas != 1375');

const cobros = Array.from({ length: 1900 }, (_, i) => ({
  id: `co${i}`,
  clienteId: `c${i % 430}`,
  estado: 'Pendiente',
  conciliado: false,
  neta: 100
}));
for (let i = 0; i < 5; i += 1) {
  cobros[i] = { id: `co${i}`, clienteId: 'c300', estado: 'Pagado', conciliado: true, neta: 250 };
}

const data = { clientes, polizas, cobros, aseguradoras: [] };
const metrics = { allCalls: 0, cloneRows: 0, writes: 0 };
const baseStore = {
  all(collection) {
    const rows = data[collection] || [];
    metrics.allCalls += 1;
    metrics.cloneRows += rows.length;
    return rows.map(clone);
  },
  get(collection, id) {
    const row = (data[collection] || []).find((item) => item && item.id === id);
    return row ? clone(row) : null;
  },
  where(collection, predicate) {
    const rows = this.all(collection);
    return typeof predicate === 'function' ? rows.filter(predicate) : rows;
  },
  find(collection, predicate) {
    const rows = this.all(collection);
    return typeof predicate === 'function' ? (rows.find(predicate) || null) : null;
  },
  insert() { metrics.writes += 1; throw new Error('write forbidden'); },
  update() { metrics.writes += 1; throw new Error('write forbidden'); },
  remove() { metrics.writes += 1; throw new Error('write forbidden'); }
};

const documentStub = {
  addEventListener() {},
  getElementById() { return null; },
  createElement() { return { classList: { add() {} }, dataset: {}, appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; } }; },
  documentElement: { classList: { add() {} } }
};
const windowStub = {
  Orbit: {
    store: baseStore,
    tenant: { segmentacion: { premiumPrimaNetaRecaudada: 1000 } },
    config: {},
    route: { params: {} }
  },
  addEventListener() {}
};
const context = vm.createContext({
  window: windowStub,
  document: documentStub,
  location: { hash: '' },
  requestAnimationFrame(callback) { callback(); return 1; },
  cancelAnimationFrame() {},
  setTimeout,
  clearTimeout,
  console,
  navigator: { clipboard: null },
  alert() {}
});

const source = fs.readFileSync(TARGET, 'utf8');
assert(source.includes('function buildSegmentationContext(readAll)'), 'batch context builder absent');
assert(source.includes("segmentationBatchRevision:'20260816.1'"), 'batch revision marker absent');
assert(source.includes('segmentFor(out, segmentationContext)'), 'projectClient not bound to batch context');
assert(source.includes('buildSegmentationContext(nativeAll)'), 'projectedAll does not build context from nativeAll');
assert(!source.includes("var policies = rawRows('polizas').filter(function (p) { return p && p.clienteId === row.id; });\n    if (!policies.length"), 'legacy per-client policy scan still primary segment path');
assert(sha256(QUERIES) === EXPECTED_QUERIES_SHA256, 'queries.js changed from certified R4S4 hash');

new vm.Script(source, { filename: TARGET }).runInContext(context);
const Orbit = windowStub.Orbit;
assert(Orbit.store.__clientCanonicalReadProjectionV20260720?.segmentationBatchRevision === '20260816.1', 'projection metadata missing batch revision');
assert(Orbit.clientProjection?.writesStore === false, 'client projection must remain read-only');
assert(Orbit.clientSegmentation?.writesStore === false, 'segmentation must remain read-only');

metrics.allCalls = 0; metrics.cloneRows = 0;
const projected = Orbit.store.all('clientes');
const allMetrics = { allCalls: metrics.allCalls, cloneRows: metrics.cloneRows };
assert(projected.length === 430, 'projected clientes != 430');
assert(allMetrics.allCalls === 3, `batched allCalls expected 3, got ${allMetrics.allCalls}`);
assert(allMetrics.cloneRows === 3705, `batched cloneRows expected 3705, got ${allMetrics.cloneRows}`);

const projectedById = new Map(projected.map((row) => [row.id, row.segmento]));
metrics.allCalls = 0; metrics.cloneRows = 0;
const fallbackSegments = clientes.map((row) => [row.id, Orbit.clientSegmentation.classify(row)]);
const fallbackMetrics = { allCalls: metrics.allCalls, cloneRows: metrics.cloneRows };
const mismatches = fallbackSegments.filter(([id, segment]) => projectedById.get(id) !== segment);
assert(mismatches.length === 0, `semantic mismatches: ${JSON.stringify(mismatches.slice(0, 5))}`);

const coverage = new Set(fallbackSegments.map(([, segment]) => segment));
for (const expected of ['Pendiente de clasificar','Nuevo','Recurrente','Estándar','Premium','Histórico']) {
  assert(coverage.has(expected), `semantic fixture missing segment ${expected}`);
}
assert(fallbackMetrics.allCalls > allMetrics.allCalls * 100, 'fixture does not prove N× call reduction');
assert(fallbackMetrics.cloneRows > allMetrics.cloneRows * 100, 'fixture does not prove N× clone reduction');

metrics.allCalls = 0; metrics.cloneRows = 0;
const whereRows = Orbit.store.where('clientes', (row) => row.segmento === 'Premium');
const whereMetrics = { allCalls: metrics.allCalls, cloneRows: metrics.cloneRows };
assert(whereRows.some((row) => row.id === 'c300'), 'where(clientes) lost Premium semantics');
assert(whereMetrics.allCalls === 3 && whereMetrics.cloneRows === 3705, 'where(clientes) not batch bounded');

metrics.allCalls = 0; metrics.cloneRows = 0;
const found = Orbit.store.find('clientes', (row) => row.id === 'c50');
const findMetrics = { allCalls: metrics.allCalls, cloneRows: metrics.cloneRows };
assert(found?.segmento === 'Nuevo', 'find(clientes) lost segment semantics');
assert(findMetrics.allCalls === 3 && findMetrics.cloneRows === 3705, 'find(clientes) not batch bounded');
assert(metrics.writes === 0, 'operational write observed');

const evidence = {
  schemaVersion: 'orbit360-r4s5-client-projection-batch-rootfix-source-v1',
  ok: true,
  status: 'R4S5_CLIENT_PROJECTION_BATCH_ROOTFIX_SOURCE_PASS',
  classification: 'FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_PROVEN',
  owner: 'orbit360-platform/core/client-insurer-visual-contract-v20260720.js',
  fixture: { clientes: 430, polizas: 1375, cobros: 1900, premiumThreshold: 1000 },
  semanticEqual: true,
  mismatchCount: 0,
  segmentCoverage: [...coverage].sort(),
  batch: { all: allMetrics, where: whereMetrics, find: findMetrics },
  legacyFallback: fallbackMetrics,
  reduction: {
    allCallRatio: +(fallbackMetrics.allCalls / allMetrics.allCalls).toFixed(2),
    cloneRowRatio: +(fallbackMetrics.cloneRows / allMetrics.cloneRows).toFixed(2)
  },
  targetSha256: sha256(TARGET),
  queriesSha256: sha256(QUERIES),
  queriesSha256MatchesCertifiedR4S4: true,
  writesStore: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: metrics.writes,
  browserExecuted: false,
  secretAccess: false,
  dataAccess: false,
  deployExecuted: false,
  productionTouched: false,
  packageRebuilt: false,
  containsPII: false,
  containsSecrets: false
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(evidence, null, 2));
