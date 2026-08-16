#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const Q_PATH = path.join(ROOT, 'orbit360-platform/core/queries.js');
const C360_PATH = path.join(ROOT, 'orbit360-platform/modules/cliente360.js');
const STORE_PATH = path.join(ROOT, 'orbit360-platform/data/store-firestore-product-readonly-p0.js');
const OUT = path.resolve(process.env.ORBIT360_R4_C360_BOUNDEDNESS_OUT || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/r4-cliente360-summary-boundedness-gate-v20260816.json'));
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');
const clone = v => JSON.parse(JSON.stringify(v));

function write(payload) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    schemaVersion: 'orbit360-r4-cliente360-summary-boundedness-gate-v1',
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
function stop(payload, code = 42) { write(payload); console.log(JSON.stringify(payload, null, 2)); process.exitCode = code; }

const queries = fs.readFileSync(Q_PATH, 'utf8');
const cliente360 = fs.readFileSync(C360_PATH, 'utf8');
const storeSource = fs.readFileSync(STORE_PATH, 'utf8');

const fixedContext = {
  cliente360Sha256: sha256(cliente360),
  storeSha256: sha256(storeSource),
  expectedCliente360Sha256: '665f3499a4eb6a1eafa723543a73bdd7057de344b2daf61776b6701ff3e3fbd9',
  expectedStoreSha256: '2352b8157afc9052a25f85f3596cc01aae93907c069bf40b13c4974371a66c17'
};
if (fixedContext.cliente360Sha256 !== fixedContext.expectedCliente360Sha256 || fixedContext.storeSha256 !== fixedContext.expectedStoreSha256) {
  stop({ ok: false, status: 'CLIENTE360_SUMMARY_BOUNDEDNESS_GATE_BASELINE_DRIFT', classification: 'ENVIRONMENT_FAILURE', failureFamily: 'R4S3_FIXED_CONTEXT_HASH_DRIFT', fixedContext }, 43);
} else {
  const structural = {
    cliente360RequestsBatchIndex: /q\.clientesResumenIndex\s*\?\s*q\.clientesResumenIndex\(\)/.test(cliente360),
    cliente360HasPerClientFallback: /\|\|\s*q\.clienteResumen\(c\.id\)/.test(cliente360),
    queriesExportsBatchIndex: /\bclientesResumenIndex\b/.test(queries) && /return\s*\{[\s\S]*clientesResumenIndex/.test(queries),
    storeAllDeepClones: /function\s+all\(collection\)[\s\S]*\.map\(clone\)/.test(storeSource),
    storeGetClonesThroughAll: /function\s+get\(collection,\s*id\)[\s\S]*return\s+all\(collection\)\.find/.test(storeSource),
    storeWhereClonesThroughAll: /function\s+where\(collection[\s\S]*var\s+rows\s*=\s*all\(collection\)/.test(storeSource)
  };

  if (!structural.cliente360RequestsBatchIndex || !structural.cliente360HasPerClientFallback || !structural.storeAllDeepClones || !structural.storeGetClonesThroughAll || !structural.storeWhereClonesThroughAll) {
    stop({ ok: false, status: 'CLIENTE360_SUMMARY_BOUNDEDNESS_GATE_CONTRACT_UNRECOGNIZED', classification: 'PIPELINE_MECHANISM_FAILURE', failureFamily: 'CLIENTE360_BOUNDEDNESS_GATE_SOURCE_SHAPE_UNRECOGNIZED', structural, querySha256: sha256(queries) }, 44);
  } else if (!structural.queriesExportsBatchIndex) {
    stop({
      ok: false,
      status: 'CLIENTE360_SUMMARY_BOUNDEDNESS_GATE_FAIL',
      classification: 'FUNCTIONAL_DEFECT',
      failureFamily: 'CLIENTE360_BATCH_SUMMARY_CONTRACT_MISSING',
      owner: 'orbit360-platform/core/queries.js',
      structural,
      querySha256: sha256(queries),
      gateRequirement: 'Orbit.q.clientesResumenIndex must exist and return a Map of 430 client summaries using bounded full-collection scans; Cliente360 list mode must not fall back to one full-collection summary traversal per client.'
    });
  } else {
    const seed = {
      clientes: Array.from({ length: 430 }, (_, i) => ({ id: `c${i+1}`, moneda: i % 9 ? 'GTQ' : 'COP', segmento: i % 10 ? 'Estándar' : 'Premium' })),
      polizas: Array.from({ length: 1375 }, (_, i) => ({ id: `p${i+1}`, clienteId: `c${(i*7)%430+1}`, estado: i%7===0 ? 'Por renovar' : 'Vigente', prima: 1000 + (i%31), moneda: 'GTQ' })),
      cobros: Array.from({ length: 1900 }, (_, i) => ({ id: `co${i+1}`, clienteId: `c${(i*5)%430+1}`, estado: ['Pagado','Pendiente','Vencido'][i%3], monto: 100 + (i%17), moneda: 'GTQ' })),
      comisiones: Array.from({ length: 900 }, (_, i) => ({ id: `m${i+1}`, clienteId: `c${(i*9)%430+1}`, monto: 20 + (i%13), moneda: 'GTQ' })),
      actividades: [], cancelaciones: [], vehiculos: [], asesores: [], aseguradoras: []
    };
    const metrics = { allCalls: 0, getCalls: 0, whereCalls: 0, cloneRows: 0 };
    const store = {
      all(col) { const rows = seed[col] || []; metrics.allCalls++; metrics.cloneRows += rows.length; return clone(rows); },
      get(col, id) { metrics.getCalls++; return store.all(col).find(r => String(r.id) === String(id)) || null; },
      where(col, pred) { metrics.whereCalls++; return store.all(col).filter(pred); },
      find(col, pred) { return store.all(col).find(pred) || null; }
    };
    const sandbox = { console, window: {}, Map, Set, Date, JSON, Object, Array, String, Number, Math };
    sandbox.window.window = sandbox.window;
    sandbox.window.Orbit = { store, ui: { daysFromNow: () => 1 } };
    sandbox.Orbit = sandbox.window.Orbit;
    vm.createContext(sandbox);
    vm.runInContext(queries, sandbox, { filename: 'queries.js' });
    const before = { ...metrics };
    const index = sandbox.Orbit.q.clientesResumenIndex();
    const boundedMetrics = { allCalls: metrics.allCalls-before.allCalls, getCalls: metrics.getCalls-before.getCalls, whereCalls: metrics.whereCalls-before.whereCalls, cloneRows: metrics.cloneRows-before.cloneRows };
    const sample = index instanceof Map ? [...index.values()].slice(0, 5) : [];
    const shapeOk = index instanceof Map && index.size === 430 && sample.every(r => r && Number.isFinite(Number(r.nPolizas)) && Number.isFinite(Number(r.nVigentes)) && Number.isFinite(Number(r.primaAnual)) && Number.isFinite(Number(r.pendiente)) && Number.isFinite(Number(r.vencido)) && Number.isFinite(Number(r.salud)));
    const bounded = boundedMetrics.allCalls <= 8 && boundedMetrics.getCalls <= 10 && boundedMetrics.cloneRows <= 20000;
    const ok = shapeOk && bounded;
    stop({
      ok,
      status: ok ? 'CLIENTE360_SUMMARY_BOUNDEDNESS_GATE_PASS' : 'CLIENTE360_SUMMARY_BOUNDEDNESS_GATE_FAIL',
      classification: ok ? 'PASS' : 'FUNCTIONAL_DEFECT',
      failureFamily: ok ? '' : 'CLIENTE360_BATCH_SUMMARY_NOT_BOUNDED',
      owner: 'orbit360-platform/core/queries.js',
      structural,
      querySha256: sha256(queries),
      syntheticFixture: { clientes: 430, polizas: 1375, cobros: 1900, comisiones: 900 },
      boundedMetrics,
      thresholds: { allCallsMax: 8, getCallsMax: 10, cloneRowsMax: 20000 },
      shapeOk
    }, ok ? 0 : 42);
  }
}
