import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }
let markup = '';
let prepareCalls = 0;
let executeCalls = 0;
let historyCalls = 0;
const handlers = { change: [], input: [], click: [] };

const nodes = {
  action: { value: 'dry_run', matches: selector => selector === '[data-p09j-action]' },
  reason: { value: 'Validar lote documental A&S', matches: () => false },
  confirmation: { value: '', matches: () => false },
  historyConfirmation: { value: '', matches: () => false },
  historyPlan: { checked: false, matches: () => false },
  historyPersist: { checked: false, matches: () => false },
  docs: [
    { value: 'doc-a', checked: true, matches: () => false },
    { value: 'doc-b', checked: true, matches: () => false }
  ]
};
const form = {
  dataset: {},
  _outerHTML: '',
  set outerHTML(value) { this._outerHTML = value; markup = value; },
  get outerHTML() { return this._outerHTML; },
  addEventListener(type, handler) { handlers[type].push(handler); },
  querySelector(selector) {
    if (selector === '[data-p09j-action]') return nodes.action;
    if (selector === '[data-p09j-reason]') return nodes.reason;
    if (selector === '[data-p09j-confirmation]') return nodes.confirmation;
    if (selector === '[data-p09j-history-confirmation]') return nodes.historyConfirmation;
    if (selector === '[data-p09j-history-plan]') return nodes.historyPlan;
    if (selector === '[data-p09j-history-persist]') return nodes.historyPersist;
    return null;
  },
  querySelectorAll(selector) { return selector === '[data-p09j-document]:checked' ? nodes.docs.filter(row => row.checked) : []; }
};
const panel = { insertAdjacentHTML(position, html) { markup = html; } };

const batch = {
  id: 'ays_aseguradoras_knowledge_batch_2026_v1',
  tenantId: 'alianzas-soluciones',
  sources: [
    { order: 10, insurerName: 'Compañía Alfa', source: { documentId: 'doc-a', nombre: 'Tarifario demo.xlsx', producto: 'Vehículos', pais: 'GT', moneda: 'GTQ', version: 'v1' } },
    { order: 20, insurerName: 'Compañía Alfa', source: { documentId: 'doc-b', nombre: 'Cotización demo.pdf', producto: 'Vehículos', pais: 'GT', moneda: 'GTQ', version: 'v1' } }
  ]
};
const Orbit = {
  ui: { esc: value => String(value) },
  auth: { user: () => ({ uid: 'u-1', email: 'direccion@example.test', rol: 'Dirección' }) },
  tenant: { get: () => ({ tenantId: 'alianzas-soluciones' }) },
  aseguradorasBatchOrchestratorP09g: { getBatch: () => JSON.parse(JSON.stringify(batch)) },
  aseguradorasBatchHistoryP09h: { resumeDocumentIds: () => ['doc-b'] },
  aseguradorasBatchAdminActionsP09i: {
    PREVIEW_ROLES: ['direccion', 'operativo'],
    ADMIN_ROLES: ['direccion'],
    async persistHistory() {
      historyCalls += 1;
      return { ok: true, persisted: true, code: 'BATCH_HISTORY_PERSISTED', enablesCotizador: false, enablesComparativo: false };
    }
  },
  aseguradorasSourceReferenceBrokerP09j: {
    status: () => ({ backendMethodAvailable: true }),
    async prepare(input) {
      prepareCalls += 1;
      return {
        ok: true,
        code: 'BATCH_ADMIN_PREVIEW_READY',
        executable: true,
        ticket: {
          ticketId: 'ticket-1',
          code: 'SOURCE_REFERENCES_RESOLVED',
          availability: {
            total: input.documentIds.length,
            provided: input.documentIds.length,
            missing: [],
            items: input.documentIds.map(documentId => ({ documentId, provided: true, referenceValueExposed: false }))
          }
        },
        preview: {
          ok: true,
          code: 'BATCH_ADMIN_PREVIEW_READY',
          tenantId: input.tenantId,
          batchId: input.batchId,
          action: input.action,
          documentIds: input.documentIds,
          reason: input.reason,
          fingerprint: 'fp-demo',
          requiredConfirmation: 'EJECUTAR DRY-RUN'
        },
        referencesExposed: false
      };
    },
    async execute(ticketId, preview) {
      executeCalls += 1;
      return {
        ok: true,
        code: 'BATCH_DRY_RUN_COMPLETE',
        planId: 'plan-1',
        documentIds: preview.documentIds,
        run: { runId: 'run-1', summary: { total: preview.documentIds.length, dryRunReady: preview.documentIds.length, failed: 0, waitingReference: 0 } },
        knowledgePersisted: false,
        historyPersisted: false,
        referencesExposed: false,
        enablesCotizador: false,
        enablesComparativo: false
      };
    }
  }
};
const document = {
  getElementById(id) { if (id === 'asg-knowledge-p09f') return panel; if (id === 'asg-batch-admin-form-p09j') return form; return null; },
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
vm.runInContext(fs.readFileSync('orbit360-platform/modules/aseguradoras-batch-admin-form-p09j.js', 'utf8'), context);

const api = Orbit.aseguradorasBatchAdminFormP09j;
assert(api.currentActor().activeRole === 'Dirección', 'debe derivar rol activo desde Auth');
assert(api.mount(), 'formulario debe montarse en Aseguradoras');
assert(markup.includes('Operación controlada del lote documental'), 'debe mostrar formulario visible');
assert(markup.includes('Tarifario demo.xlsx') && markup.includes('Cotización demo.pdf'), 'debe listar documentos sin IDs manuales');
assert(!markup.includes('backend-ref://'), 'DOM no debe exponer referencias');

handlers.input.forEach(handler => handler({ target: nodes.reason }));
await api.generatePreview();
assert(prepareCalls === 1 && api.status().hasPreview, 'debe generar preview mediante broker');
api.mount();
assert(markup.includes('fp-demo') && markup.includes('EJECUTAR DRY-RUN'), 'preview debe mostrar fingerprint y frase');

nodes.confirmation.value = 'EJECUTAR DRY-RUN';
handlers.input.forEach(handler => handler({ target: nodes.confirmation }));
await api.executePreview();
assert(executeCalls === 1 && api.status().hasExecution, 'confirmación correcta debe ejecutar dry-run');
assert(api.status().historyPersisted === false, 'dry-run no debe persistir historial automáticamente');

nodes.historyPlan.checked = true;
nodes.historyPersist.checked = true;
nodes.historyConfirmation.value = 'GUARDAR HISTORIAL';
handlers.change.forEach(handler => handler({ target: nodes.historyPlan }));
handlers.input.forEach(handler => handler({ target: nodes.historyConfirmation }));
await api.persistHistory();
assert(historyCalls === 1 && api.status().historyPersisted, 'Dirección debe persistir solo historial con confirmaciones');
assert(!JSON.stringify(api.status()).includes('backend-ref://'), 'estado público no debe exponer referencias');

const source = fs.readFileSync('orbit360-platform/modules/aseguradoras-batch-admin-form-p09j.js', 'utf8');
assert(!/Orbit\.store\.(?:insert|update|remove)|localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(source), 'formulario no debe escribir store ni usar red directa');
assert(!/(enabledCotizador|enabledComparativo|enablesCotizador|enablesComparativo)\s*:\s*true/.test(source), 'formulario no debe habilitar módulos');
console.log('OK orbit360-test-aseguradoras-batch-admin-form-p09j');