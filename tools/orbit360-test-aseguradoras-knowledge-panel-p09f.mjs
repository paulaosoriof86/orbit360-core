import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }
let markup = '';
const listeners = [];
const refreshButton = { addEventListener(type, handler) { listeners.push({ type, handler }); } };
const panel = { querySelector(selector) { return selector === '[data-p09f-refresh]' ? refreshButton : null; }, outerHTML: '' };
const anchor = { insertAdjacentHTML(position, html) { markup = html; } };
const host = {
  firstElementChild: anchor,
  querySelector(selector) { return selector === '.cfg-note' ? anchor : null; },
  insertAdjacentHTML(position, html) { markup = html; }
};
const rows = {
  aseguradoras: [{ id: 'a1', tenantId: 'alianzas-soluciones', docs: [{ id: 'd1' }, { id: 'd2' }] }],
  aseguradora_manifiestos: [{ id: 'm1', tenantId: 'alianzas-soluciones' }],
  aseguradora_propuestas: [{ id: 'p1', tenantId: 'alianzas-soluciones' }],
  aseguradora_reglas_tarifarias: [{ id: 'r1', tenantId: 'alianzas-soluciones' }, { id: 'r2', tenantId: 'otro' }],
  aseguradora_presentaciones: [{ id: 'q1', tenantId: 'alianzas-soluciones' }],
  aseguradora_bindings: [],
  aseguradora_revisiones: [{ id: 'v1', tenantId: 'alianzas-soluciones' }],
  aseguradora_batch_runs: [{ id: 'run-1', tenantId: 'alianzas-soluciones', batchId: 'batch-a', status: 'incomplete' }],
  aseguradora_batch_items: [
    { id: 'item-1', tenantId: 'alianzas-soluciones', batchId: 'batch-a', runId: 'run-1', documentId: 'doc-pendiente', status: 'failed', retryEligible: true },
    { id: 'item-2', tenantId: 'otro', batchId: 'batch-a', runId: 'run-x', documentId: 'otro', status: 'failed', retryEligible: true }
  ]
};
const Orbit = {
  ui: { esc: value => String(value) },
  store: { all: collection => rows[collection] || [] },
  aseguradorasRuntimeBootstrapP09f: {
    status: () => ({ status: 'ready', bridge: { ok: false, code: 'BACKEND_REQUIRED' }, errors: [] }),
    preflight: () => ({ ok: true, errors: [] }),
    retry: async () => ({ status: 'ready' })
  },
  aseguradorasLabCollectionsP09e: {
    status: () => ({ installed: true, snapshotAttachedCount: 8, collections: ['a','b','c','d','e','f','g','h'] })
  },
  aseguradorasFirstSourceP09f: {
    listPlans: () => [{ source: { nombre: 'Tasas ejemplo.xlsx' } }]
  },
  aseguradorasBatchOrchestratorP09g: {
    listBatches: () => [{ id: 'batch-a', totalSources: 11, totalInsurers: 6, totalExcel: 8, totalPdf: 3, bindingSets: 3 }],
    latest: () => ({
      status: 'incomplete',
      summary: {
        dryRunReady: 9, persisted: 0, waitingReference: 2, failed: 0,
        bindingsReadyForReview: 1, bindingsIncomplete: 2
      },
      bindingSets: [
        { id: 'b1', insurerName: 'Compañía Alfa', variant: { tipoVehiculo: 'Automóvil' }, status: 'ready_for_binding_review', missingKnowledge: [] },
        { id: 'b2', insurerName: 'Compañía Beta', variant: { plan: 'Plan demo' }, status: 'documents_ready_knowledge_incomplete', missingKnowledge: ['tariff_rule'] }
      ]
    })
  },
  aseguradorasBatchHistoryP09h: {
    readModel: () => ({
      runs: [rows.aseguradora_batch_runs[0]],
      items: [rows.aseguradora_batch_items[0]],
      latest: rows.aseguradora_batch_runs[0],
      latestItems: [rows.aseguradora_batch_items[0]],
      resumableDocumentIds: ['doc-pendiente']
    })
  }
};
const document = {
  querySelector(selector) { return selector === '#host .page' ? host : null; },
  getElementById(id) { return id === 'asg-knowledge-p09f' && markup ? panel : null; },
  addEventListener() {}
};
const window = {
  Orbit,
  OrbitBackend: { tenantId: 'alianzas-soluciones' },
  location: { hash: '#/aseguradoras' },
  addEventListener() {},
  dispatchEvent() {}
};
window.window = window;
const context = { window, document, Orbit, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise, setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/modules/aseguradoras-knowledge-panel-p09f.js', 'utf8'), context);

const api = Orbit.aseguradorasKnowledgePanelP09f;
const state = api.state();
assert(state.counts.sources === 2, 'debe contar fuentes visibles');
assert(state.counts.manifests === 1 && state.counts.rules === 1, 'debe filtrar colecciones por tenant');
assert(state.counts.batchRuns === 1 && state.counts.batchItems === 1, 'debe contar historial por tenant');
assert(state.history.resumableDocumentIds.includes('doc-pendiente'), 'debe exponer documento reanudable');
assert(state.provider.code === 'BACKEND_REQUIRED', 'provider no conectado debe mostrarse honestamente');
assert(state.batch.batches[0].totalSources === 11, 'debe exponer lote de once fuentes');
assert(state.batch.latest.summary.waitingReference === 2, 'debe exponer referencias pendientes');
assert(api.mount() === true, 'panel debe montarse en ruta Aseguradoras');
assert(markup.includes('Conocimiento documental de Aseguradoras'), 'panel debe mostrar título');
assert(markup.includes('BACKEND_REQUIRED'), 'panel debe mostrar provider pendiente');
assert(markup.includes('Tasas ejemplo.xlsx'), 'panel debe mostrar primera fuente planificada');
assert(markup.includes('11 fuentes') && markup.includes('6 aseguradoras'), 'panel debe mostrar resumen del lote');
assert(markup.includes('ready_for_binding_review'), 'panel debe mostrar estado de binding');
assert(markup.includes('documents_ready_knowledge_incomplete'), 'panel debe mostrar conocimiento incompleto');
assert(markup.includes('Historial del lote') && markup.includes('doc-pendiente'), 'panel debe mostrar historial y reanudables');
assert(listeners.some(item => item.type === 'click'), 'botón de actualización debe ser funcional');
const source = fs.readFileSync('orbit360-platform/modules/aseguradoras-knowledge-panel-p09f.js', 'utf8');
assert(!/\.insert\(|\.update\(|\.remove\(|setPref\(/.test(source), 'panel no debe escribir Orbit.store');
assert(!/aseguradorasBatchOrchestratorP09g\.run\(/.test(source), 'panel no debe ejecutar lote');
assert(!/aseguradorasBatchOrchestratorP09g\.resume\(/.test(source), 'panel no debe reanudar lote');
console.log('OK orbit360-test-aseguradoras-knowledge-panel-p09f');