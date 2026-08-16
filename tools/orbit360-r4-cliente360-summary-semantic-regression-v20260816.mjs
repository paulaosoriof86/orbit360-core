#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const Q_PATH = path.join(ROOT, 'orbit360-platform/core/queries.js');
const OUT = path.resolve(process.env.ORBIT360_R4_C360_SEMANTIC_OUT || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/r4-cliente360-summary-semantic-regression-v20260816.json'));
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');
const clone = v => JSON.parse(JSON.stringify(v));

function write(payload) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    schemaVersion: 'orbit360-r4-cliente360-summary-semantic-regression-v1',
    browserExecuted: false,
    secretAccess: false,
    dataAccess: false,
    deployExecuted: false,
    packageRebuilt: false,
    productionTouched: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    containsPII: false,
    containsSecrets: false,
    ...payload
  }, null, 2) + '\n', 'utf8');
}

const queries = fs.readFileSync(Q_PATH, 'utf8');
const seed = {
  clientes: Array.from({ length: 430 }, (_, i) => ({
    id: `c${i + 1}`,
    nombre: `Cliente ${i + 1}`,
    moneda: i % 11 === 0 ? 'COP' : 'GTQ',
    segmento: i % 10 === 0 ? 'Premium' : 'Estándar'
  })),
  polizas: Array.from({ length: 1375 }, (_, i) => ({
    id: `p${i + 1}`,
    clienteId: `c${(i * 7) % 430 + 1}`,
    estado: ['Vigente', 'Por renovar', 'Cancelada', 'Vencida'][i % 4],
    prima: 1000 + (i % 31),
    moneda: i % 13 === 0 ? 'COP' : 'GTQ'
  })),
  cobros: Array.from({ length: 1900 }, (_, i) => ({
    id: `co${i + 1}`,
    clienteId: `c${(i * 5) % 430 + 1}`,
    estado: ['Pagado', 'Pendiente', 'Vencido', 'Bloqueado'][i % 4],
    monto: 100 + (i % 17),
    moneda: 'GTQ'
  })),
  comisiones: Array.from({ length: 900 }, (_, i) => ({
    id: `m${i + 1}`,
    clienteId: `c${(i * 9) % 430 + 1}`,
    monto: 20 + (i % 13),
    moneda: 'GTQ'
  })),
  actividades: [], cancelaciones: [], vehiculos: [], asesores: [], aseguradoras: []
};

const metrics = { allCalls: 0, getCalls: 0, whereCalls: 0 };
const store = {
  all(col) { metrics.allCalls++; return clone(seed[col] || []); },
  get(col, id) { metrics.getCalls++; return store.all(col).find(r => r.id === id) || null; },
  where(col, pred) { metrics.whereCalls++; return store.all(col).filter(pred); },
  find(col, pred) { return store.all(col).find(pred) || null; }
};
const sandbox = { console, window: {}, Map, Set, Date, JSON, Object, Array, String, Number, Math };
sandbox.window.window = sandbox.window;
sandbox.window.Orbit = { store, ui: { daysFromNow: () => 1 } };
sandbox.Orbit = sandbox.window.Orbit;
vm.createContext(sandbox);
vm.runInContext(queries, sandbox, { filename: 'queries.js' });

if (!sandbox.Orbit.q || typeof sandbox.Orbit.q.clienteResumen !== 'function' || typeof sandbox.Orbit.q.clientesResumenIndex !== 'function') {
  write({ ok: false, status: 'CLIENTE360_SUMMARY_SEMANTIC_REGRESSION_FAIL', classification: 'FUNCTIONAL_DEFECT', failureFamily: 'CLIENTE360_SUMMARY_API_CONTRACT_MISSING', querySha256: sha256(queries) });
  process.exit(42);
}

const fields = ['moneda', 'nPolizas', 'nVigentes', 'primaAnual', 'cobrado', 'pendiente', 'vencido', 'comisionGen', 'porRenovar', 'salud'];
function ids(rows) { return (rows || []).map(r => r && r.id); }
function comparable(r) {
  return {
    cliId: r && r.cli && r.cli.id,
    polIds: ids(r && r.pol),
    cobIds: ids(r && r.cob),
    comIds: ids(r && r.com),
    ...Object.fromEntries(fields.map(k => [k, r && r[k]]))
  };
}

const legacy = new Map();
for (const cli of seed.clientes) legacy.set(cli.id, comparable(sandbox.Orbit.q.clienteResumen(cli.id)));
const legacyMetrics = { ...metrics };
const beforeBatch = { ...metrics };
const batch = sandbox.Orbit.q.clientesResumenIndex();
const batchMetrics = {
  allCalls: metrics.allCalls - beforeBatch.allCalls,
  getCalls: metrics.getCalls - beforeBatch.getCalls,
  whereCalls: metrics.whereCalls - beforeBatch.whereCalls
};

const mismatches = [];
for (const cli of seed.clientes) {
  const expected = legacy.get(cli.id);
  const actual = comparable(batch.get(cli.id));
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    mismatches.push({ id: cli.id, expected, actual });
    if (mismatches.length >= 5) break;
  }
}
const apiPreserved = typeof sandbox.Orbit.q.clienteResumen === 'function';
const mapShape = batch instanceof Map && batch.size === seed.clientes.length;
const semanticEqual = mismatches.length === 0;
const boundedCallShape = batchMetrics.allCalls === 4 && batchMetrics.getCalls === 0 && batchMetrics.whereCalls === 0;
const ok = apiPreserved && mapShape && semanticEqual && boundedCallShape;

write({
  ok,
  status: ok ? 'CLIENTE360_SUMMARY_SEMANTIC_REGRESSION_PASS' : 'CLIENTE360_SUMMARY_SEMANTIC_REGRESSION_FAIL',
  classification: ok ? 'PASS' : 'FUNCTIONAL_DEFECT',
  failureFamily: ok ? '' : 'CLIENTE360_BATCH_SUMMARY_SEMANTIC_MISMATCH',
  owner: 'orbit360-platform/core/queries.js',
  querySha256: sha256(queries),
  fixture: { clientes: 430, polizas: 1375, cobros: 1900, comisiones: 900 },
  apiPreserved,
  mapShape,
  semanticEqual,
  mismatchCount: mismatches.length,
  mismatches,
  legacyMetrics,
  batchMetrics,
  boundedCallShape
});
if (!ok) process.exit(42);
