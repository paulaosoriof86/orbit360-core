import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }

const queued = [];
let submitted = null;
let formState = { hasPreview: true, hasExecution: true, historyPersisted: true };
let adminState = {
  lastPlan: { ok: true, fingerprint: 'control-safe', referenceContract: { provided: 1, missing: [] } },
  lastExecution: { ok: true, code: 'BATCH_DRY_RUN_COMPLETE', historyPersisted: true }
};
const visibleElement = (text, controls = {}) => ({
  textContent: text,
  getBoundingClientRect: () => ({ width: 900, height: 320 }),
  querySelectorAll(selector) {
    if (selector === 'button') return { length: controls.buttons || 0 };
    if (selector === 'input,select,textarea') return { length: controls.inputs || 0 };
    if (selector === 'button:disabled,input:disabled,select:disabled,textarea:disabled') return { length: controls.disabled || 0 };
    return { length: 0 };
  }
});
const panel = visibleElement('Motor documental Conexión de archivos Sincronización Preparación');
const form = visibleElement('Operación controlada Vista previa lista Lectura terminada Historial guardado', { buttons: 3, inputs: 8, disabled: 1 });

const rows = {
  aseguradoras: [{ id: 'a1', tenantId: 'alianzas-soluciones', docs: [{ id: 'd1' }, { id: 'd2' }] }],
  aseguradora_manifiestos: [{ id: 'm1', tenantId: 'alianzas-soluciones' }],
  aseguradora_propuestas: [{ id: 'p1', tenantId: 'alianzas-soluciones' }],
  aseguradora_reglas_tarifarias: [],
  aseguradora_presentaciones: [],
  aseguradora_bindings: [],
  aseguradora_revisiones: [{ id: 'r1', tenantId: 'alianzas-soluciones' }],
  aseguradora_batch_runs: [{ id: 'run1', tenantId: 'alianzas-soluciones', status: 'completed' }],
  aseguradora_batch_items: [{ id: 'item1', tenantId: 'alianzas-soluciones', runId: 'run1', status: 'dry_run_ready' }]
};
const historyModel = () => ({
  runs: rows.aseguradora_batch_runs,
  items: rows.aseguradora_batch_items,
  latest: rows.aseguradora_batch_runs[0],
  latestItems: rows.aseguradora_batch_items,
  resumableDocumentIds: []
});
const Orbit = {
  tenant: { get: () => ({ id: 'alianzas-soluciones' }) },
  auth: { user: () => ({ id: 'user-private', email: 'private@example.test', tenantId: 'alianzas-soluciones', activeRole: 'Dirección', roles: ['Dirección', 'Asesor'] }) },
  store: { all: collection => rows[collection] || [] },
  aseguradorasRuntimeBootstrapP09f: {
    status: () => ({ status: 'ready', errors: [] }),
    preflight: () => ({ ok: true, sourceReferenceBackendReady: true, knowledgeSnapshotsReady: true })
  },
  aseguradorasSourceReferenceBrokerP09j: { status: () => ({ backendMethodAvailable: true }) },
  aseguradorasLabCollectionsP09e: { status: () => ({ installed: true }) },
  aseguradorasBatchAdminFormP09j: { status: () => formState },
  aseguradorasBatchAdminActionsP09i: { status: () => adminState },
  aseguradorasBatchHistoryP09h: { readModel: historyModel }
};
const document = {
  documentElement: { clientWidth: 1280, clientHeight: 800, scrollWidth: 1280 },
  getElementById(id) {
    if (id === 'asg-knowledge-p09f') return panel;
    if (id === 'asg-batch-admin-form-p09j') return form;
    return null;
  },
  addEventListener() {}
};
const window = {
  Orbit,
  OrbitBackend: { tenantId: 'alianzas-soluciones' },
  location: { hash: '#/aseguradoras' },
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
  performance: { getEntriesByType: () => [{ type: 'reload' }] },
  getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
  addEventListener() {},
  dispatchEvent() {},
  OrbitBackendDocumentBridge: {
    async submitRuntimeReport(report) {
      submitted = JSON.parse(JSON.stringify(report));
      return { ok: true, accepted: true, code: 'RUNTIME_REPORT_ACCEPTED', reportId: 'safe-report-id' };
    }
  }
};
window.window = window;
const context = {
  window, document, Orbit,
  performance: window.performance,
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options && options.detail; } },
  console, Date, Math, Set, Array, String, Object, JSON, Number, Promise,
  setTimeout(fn, delay) { queued.push({ fn, delay }); return queued.length; },
  clearTimeout() {}
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/aseguradoras-runtime-observer-p09n.js', 'utf8'), context);

const api = Orbit.aseguradorasRuntimeObserverP09n;
assert(api, 'observador P09n debe registrarse');
api.resetForTest();
const report = api.capture('synthetic_visual_check');
assert(report.runtime.bootstrapReady && report.runtime.sourceConnectionReady, 'debe capturar runtime y conexión');
assert(report.actor.userPresent && report.actor.activeRoleAssigned && report.actor.tenantMatch, 'debe confirmar rol activo sin exponer identidad');
assert(report.ui.panelVisible && report.ui.formVisible, 'debe confirmar panel y formulario visibles');
assert(report.ui.forbiddenVisibleCount === 0, 'no debe detectar copy técnico en UI limpia');
assert(report.viewport.horizontalOverflow === false, 'no debe reportar overflow inexistente');
assert(report.flow.previewGenerated && report.flow.executionOk && report.flow.historyPersisted, 'debe capturar progresión real');
assert(report.navigationReloaded === true, 'debe reconocer recarga');
assert(report.counts.sources === 2, 'debe contar documentos fuente, no solo aseguradoras');
assert(report.counts.manifests === 1 && report.counts.reviews === 1, 'debe contar read model por tenant');
assert(report.gates.find(item => item.id === 'history_after_reload').state === 'approved', 'historial tras recarga debe aprobarse');
assert(report.gates.find(item => item.id === 'module_boundary').state === 'pending', 'frontera visual no debe aprobarse automáticamente');
assert(report.claudeGate.ready === false && report.claudeGate.pending.includes('module_boundary'), 'Claude debe continuar pendiente');
const serialized = JSON.stringify(report);
assert(!serialized.includes('private@example.test') && !serialized.includes('user-private'), 'reporte no debe exponer identidad');
assert(report.containsPii === false && report.containsLocalPaths === false && report.containsReferences === false, 'flags de seguridad deben permanecer cerrados');

formState = { hasPreview: false, hasExecution: false, historyPersisted: false };
adminState = { lastPlan: null, lastExecution: null };
const reloadedReport = api.capture('reload_rebuild');
assert(reloadedReport.flow.historyPersisted === true, 'debe reconstruir historial desde runs persistidos');
assert(reloadedReport.flow.executionCompleted === true && reloadedReport.flow.executionOk === true, 'debe reconstruir lectura desde latest/latestItems');
assert(reloadedReport.gates.find(item => item.id === 'read_model').state === 'approved', 'read model persistido debe aprobarse tras recarga');

const response = await api.submit('synthetic_submit');
assert(response.accepted === true && submitted, 'debe enviar el reporte por bridge');
assert(!JSON.stringify(submitted).includes('private@example.test'), 'bridge no debe recibir PII');
assert(api.status().hasSubmission === true && api.status().enablesCotizador === false, 'status debe ser seguro');
console.log('OK orbit360-test-aseguradoras-runtime-observer-p09n');