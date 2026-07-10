import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }

const scripts = [];
const events = [];
const Orbit = {
  store: {
    __firestoreLabExplicit: true,
    _labStatus: () => ({ snapshotAttached: true, snapshotAttachedCount: 10 })
  }
};
const backend = {
  mode: 'firestore-lab', tenantId: 'alianzas-soluciones',
  securityGuard: { installed: true }
};
const pathOnly = value => String(value || '').replace(/^https?:\/\/[^/]+\//, '').split('?')[0].replace(/^\.\//, '');
const globalByPath = {
  'core/document-source-contract-p04.js': ['documentSourceContractP04', {}],
  'core/cotizacion-esquema-aseguradora-p0.js': ['cotizacionEsquemaAseguradoraP0', {}],
  'core/tariff-rule-proposal-p06.js': ['tariffRuleProposalP06', {}],
  'core/excel-rule-proposal-adapter-p06b.js': ['excelRuleProposalAdapterP06b', {}],
  'core/pdf-quote-adapter-p07.js': ['pdfQuoteAdapterP07', {}],
  'core/tariff-quote-reconciliation-p06c.js': ['tariffQuoteReconciliationP06c', {}],
  'core/knowledge-binding-gate-p08.js': ['knowledgeBindingGateP08', {}],
  'core/knowledge-binding-policy-p08.js': ['knowledgeBindingPolicyP08', {}],
  'core/tenant-insurer-config-p10.js': ['tenantInsurerConfigP10', {}],
  'core/tenant-source-batch-adapter-p10.js': ['tenantSourceBatchAdapterP10', {}],
  'core/tenant-binding-plan-p10c.js': ['tenantBindingPlanP10c', {}],
  'core/document-provider-registry-p09.js': ['documentProviderRegistryP09', {}],
  'core/document-provider-bridge-p09b.js': ['documentProviderBridgeP09b', { registerAvailable: async () => ({ ok: false, code: 'BACKEND_REQUIRED', status: 'backend_required' }) }],
  'core/aseguradoras-knowledge-runtime-p09.js': ['aseguradorasKnowledgeRuntimeP09', {}],
  'core/aseguradoras-lab-collections-p09e.js': ['aseguradorasLabCollectionsP09e', { install: () => ({ installed: true }), status: () => ({ installed: true, collections: ['a','b','c','d','e','f','g','h'], snapshotAttachedCount: 8 }) }],
  'core/aseguradoras-lab-persistence-p09e.js': ['aseguradorasLabPersistenceP09e', {}],
  'core/aseguradoras-first-source-orchestrator-p09f.js': ['aseguradorasFirstSourceP09f', {}],
  'core/aseguradoras-batch-orchestrator-p09g.js': ['aseguradorasBatchOrchestratorP09g', { run: async () => ({}) }],
  'core/aseguradoras-batch-history-p09h.js': ['aseguradorasBatchHistoryP09h', { install: () => true, status: () => ({ installed: true }) }],
  'core/aseguradoras-batch-admin-actions-p09i.js': ['aseguradorasBatchAdminActionsP09i', {}],
  'core/aseguradoras-source-reference-broker-p09j.js': ['aseguradorasSourceReferenceBrokerP09j', { status: () => ({ backendMethodAvailable: false }) }],
  'modules/aseguradoras-knowledge-panel-p09f.js': ['aseguradorasKnowledgePanelP09f', { schedule: () => true }],
  'modules/aseguradoras-batch-admin-form-p09j.js': ['aseguradorasBatchAdminFormP09j', { schedule: () => true }],
  'core/aseguradoras-runtime-observer-p09n.js': ['aseguradorasRuntimeObserverP09n', { schedule: () => true }]
};
const document = {
  head: {
    appendChild(script) {
      scripts.push(script);
      const src = pathOnly(script.src);
      const row = globalByPath[src];
      if (row) Orbit[row[0]] = row[1];
      if (src === 'modules/aseguradoras-knowledge-p09.js') {
        Orbit.services = Orbit.services || {};
        Orbit.services.aseguradorasKnowledgeP09 = {};
      }
      Promise.resolve().then(() => script.onload && script.onload());
      return script;
    }
  },
  documentElement: { appendChild() {} },
  createElement() {
    return {
      dataset: {}, async: true, src: '', onload: null, onerror: null,
      getAttribute(name) { return name === 'src' ? this.src : ''; }
    };
  },
  querySelectorAll(selector) { return selector === 'script[src]' ? scripts : []; }
};
const window = {
  Orbit, OrbitBackend: backend,
  location: { search: '?orbitBackend=firestore-lab&tenant=alianzas-soluciones' },
  dispatchEvent(event) { events.push(event); }
};
window.window = window;
const context = {
  window, document, Orbit, URLSearchParams, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options && options.detail; } },
  console, Date, Math, Set, Array, String, Object, JSON, Number, Promise,
  setTimeout, clearTimeout, encodeURIComponent
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/aseguradoras-runtime-bootstrap-p09f.js', 'utf8'), context);

const api = Orbit.aseguradorasRuntimeBootstrapP09f;
assert(api, 'bootstrap debe registrarse');
const result = await api.start();
assert(result.status === 'ready', `bootstrap LAB debe quedar ready: ${JSON.stringify(result.errors)}`);
assert(result.requiredScripts.length === 29, 'debe declarar observador, broker, formulario y contratos previos');
assert(result.loaded.includes('core/aseguradoras-batch-history-p09h.js'), 'debe cargar historial P09h');
assert(result.loaded.includes('core/aseguradoras-batch-admin-actions-p09i.js'), 'debe cargar acciones P09i');
assert(result.loaded.includes('core/aseguradoras-source-reference-broker-p09j.js'), 'debe cargar broker P09j');
assert(result.loaded.includes('modules/aseguradoras-batch-admin-form-p09j.js'), 'debe cargar formulario P09j');
assert(result.loaded.includes('core/aseguradoras-runtime-observer-p09n.js'), 'debe cargar observador P09n al final');
assert(result.bridge && result.bridge.code === 'BACKEND_REQUIRED', 'provider ausente debe permanecer honesto');
const preflight = api.preflight();
assert(preflight.ok && preflight.batchRuntimeReady && preflight.batchHistoryReady, 'preflight debe incluir lote e historial');
assert(preflight.batchAdminActionsReady && preflight.sourceReferenceBrokerReady && preflight.batchAdminFormReady, 'preflight debe incluir P09i/P09j');
assert(preflight.runtimeObserverReady === true, 'preflight debe confirmar observador P09n');
assert(preflight.sourceReferenceBackendReady === false, 'backend de referencias pendiente no debe mostrarse listo');
const firstCount = scripts.length;
await api.start();
assert(scripts.length === firstCount, 'segunda llamada no debe duplicar scripts');
const retried = await api.retry();
assert(retried.status === 'ready' && scripts.length === firstCount, 'retry debe reevaluar sin duplicar scripts');
assert(events.some(event => event.type === 'orbit:aseguradoras:knowledge-ready'), 'debe emitir evento ready');

api.resetForTest();
window.location.search = '?orbitBackend=none&tenant=alianzas-soluciones';
const blocked = await api.start();
assert(blocked.status === 'blocked_context' && blocked.errors.includes('FIRESTORE_LAB_REQUIRED'), 'fuera de LAB debe bloquearse');
assert(blocked.enablesCotizador === false && blocked.enablesComparativo === false, 'bootstrap nunca habilita módulos');
console.log('OK orbit360-test-aseguradoras-runtime-bootstrap-p09f');