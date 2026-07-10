import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }
const rows = { aseguradora_batch_runs: [], aseguradora_batch_items: [], actividades: [] };
let failCollection = '';
const store = {
  all(collection) { return rows[collection] || []; },
  get(collection, id) { return (rows[collection] || []).find(row => row.id === id) || null; },
  insert(collection, row) {
    if (collection === failCollection) throw new Error('synthetic-write-failure');
    rows[collection] = rows[collection] || [];
    rows[collection].push(JSON.parse(JSON.stringify(row)));
    return row;
  },
  update(collection, id, patch) {
    if (collection === failCollection) throw new Error('synthetic-write-failure');
    const index = (rows[collection] || []).findIndex(row => row.id === id);
    if (index < 0) throw new Error('missing-row');
    rows[collection][index] = { ...rows[collection][index], ...JSON.parse(JSON.stringify(patch)) };
    return rows[collection][index];
  },
  remove(collection, id) {
    rows[collection] = (rows[collection] || []).filter(row => row.id !== id);
    return true;
  }
};
let runCount = 0;
const Orbit = {
  store,
  aseguradorasLabPersistenceP09e: {
    preflight(plan) { return { ok: plan && plan.metadataOnly === true && plan.confirmed === true, errors: [] }; },
    async waitForSettlement() { return { ok: true, code: 'LAB_WRITES_SETTLED' }; }
  },
  aseguradorasBatchOrchestratorP09g: {
    getBatch() {
      return {
        id: 'batch-ays', tenantId: 'alianzas-soluciones',
        sources: [
          { insurerName: 'Aseguradora Alfa', source: { documentId: 'doc-excel', nombre: 'tarifas.xlsx', tipoFuente: 'tarifario_excel' } },
          { insurerName: 'Aseguradora Alfa', source: { documentId: 'doc-pdf', nombre: 'cotizacion.pdf', tipoFuente: 'cotizacion_pdf_oficial' } }
        ]
      };
    },
    async run() {
      runCount += 1;
      return {
        ok: false, code: 'BATCH_INCOMPLETE', runId: `run-${runCount}`,
        batchId: 'batch-ays', tenantId: 'alianzas-soluciones', mode: 'dry_run', status: 'incomplete',
        startedAt: `2026-07-10T10:0${runCount}:00Z`, completedAt: `2026-07-10T10:0${runCount}:30Z`,
        results: [
          { documentId: 'doc-excel', insurerName: 'Aseguradora Alfa', status: runCount === 1 ? 'failed' : 'dry_run_ready', code: runCount === 1 ? 'PROVIDER_EXECUTION_FAILED' : 'SOURCE_DRY_RUN_READY', attempts: runCount === 1 ? 2 : 1, outputs: runCount === 1 ? {} : { manifest: 1, tariffRules: 1 } },
          { documentId: 'doc-pdf', insurerName: 'Aseguradora Alfa', status: 'waiting_reference', code: 'BACKEND_SOURCE_REFERENCE_REQUIRED', attempts: 0, outputs: {} }
        ],
        bindingSets: [], summary: { failed: runCount === 1 ? 1 : 0, waitingReference: 1 }, errors: ['pending'],
        enablesCotizador: false, enablesComparativo: false
      };
    }
  }
};
const window = { Orbit, dispatchEvent() {} };
window.window = window;
const context = {
  window, Orbit, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise,
  setTimeout, clearTimeout, CustomEvent: class {}
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/aseguradoras-batch-history-p09h.js', 'utf8'), context);
const api = Orbit.aseguradorasBatchHistoryP09h;
assert(api.status().installed, 'historial debe envolver el orquestador');

const batch = Orbit.aseguradorasBatchOrchestratorP09g.getBatch();
const referenceContract = api.buildReferenceContract(batch, { 'doc-excel': 'backend-ref://secret/path' });
assert(referenceContract.requirements[0].provided === true, 'debe indicar referencia disponible');
assert(referenceContract.requirements[1].provided === false, 'debe indicar referencia faltante');
assert(!JSON.stringify(referenceContract).includes('backend-ref://'), 'contrato público no debe exponer referencia');

const actor = { id: 'admin-1', tenantId: 'alianzas-soluciones', activeRole: 'AdminTenant', roles: ['AdminTenant'] };
const first = await Orbit.aseguradorasBatchOrchestratorP09g.run({
  tenantId: 'alianzas-soluciones', batchId: 'batch-ays', actor,
  reason: 'Registrar historial sintético', persistHistory: true, confirmHistoryPersistence: true
});
assert(first.history.persisted && first.history.code === 'BATCH_HISTORY_PERSISTED', 'historial debe persistirse con confirmación');
assert(rows.aseguradora_batch_runs.length === 1 && rows.aseguradora_batch_items.length === 2, 'debe persistir run e items');
assert(rows.actividades.some(row => row.tipo === 'aseguradoras_lote_historial_persistido'), 'debe registrar auditoría sanitizada');
assert(rows.aseguradora_batch_items.every(row => row.containsReferences === false && row.enablesCotizador === false), 'items deben quedar sanitizados y deshabilitados');

const model = api.readModel('alianzas-soluciones', 'batch-ays');
assert(model.resumableDocumentIds.length === 2, 'fallida y sin referencia deben ser reanudables');
const resumed = await Orbit.aseguradorasBatchOrchestratorP09g.resume({
  tenantId: 'alianzas-soluciones', batchId: 'batch-ays', actor, reason: 'Reanudar pendientes'
});
assert(resumed.history && runCount === 2, 'resume debe ejecutar un nuevo run');

const secondPlan = api.buildHistoryPlan({
  run: resumed, batch, actor, reason: 'Comparar segundo run', confirmed: false
});
const excelItem = secondPlan.operations.find(operation => operation.collection === 'aseguradora_batch_items' && operation.row.documentId === 'doc-excel').row;
assert(excelItem.diff.some(diff => diff.field === 'status'), 'segundo run debe conservar diff de estado');
assert(excelItem.attemptSummary.retryOccurred === false, 'segundo run debe conservar resumen de intentos');

const denied = api.buildHistoryPlan({ run: resumed, batch, actor: { id: 'asesor', activeRole: 'Asesor', roles: ['Asesor'] }, reason: 'No autorizado' });
assert(!denied.ok && denied.errors.includes('ACTIVE_ROLE_NOT_AUTHORIZED'), 'Asesor no puede preparar persistencia global de historial');

const rollbackPlan = api.buildHistoryPlan({
  run: { ...resumed, runId: 'run-rollback' }, batch, actor, reason: 'Probar rollback', confirmed: true
});
const beforeRuns = rows.aseguradora_batch_runs.length;
const beforeItems = rows.aseguradora_batch_items.length;
failCollection = 'aseguradora_batch_items';
const rolledBack = await api.persistHistory(rollbackPlan, actor);
failCollection = '';
assert(!rolledBack.ok && rolledBack.code === 'HISTORY_WRITE_FAILED_ROLLED_BACK', 'falla intermedia debe activar rollback');
assert(rows.aseguradora_batch_runs.length === beforeRuns && rows.aseguradora_batch_items.length === beforeItems, 'rollback no debe dejar escrituras parciales');

const source = fs.readFileSync('orbit360-platform/core/aseguradoras-batch-history-p09h.js', 'utf8');
assert(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(source), 'historial no debe usar red o almacenamiento local');
assert(!/enabledCotizador\s*:\s*true|enabledComparativo\s*:\s*true|enablesCotizador\s*:\s*true|enablesComparativo\s*:\s*true/.test(source), 'historial no debe habilitar módulos');
console.log('OK orbit360-test-aseguradoras-batch-history-p09h');