/* ============================================================
   Orbit 360 · P0.9b · Bridge backend de providers documentales
   Fecha: 2026-07-10

   Registra capacidades reales inyectadas por backend. No contiene
   endpoints, credenciales ni llamadas de red. Sin bridge confirmado,
   conserva BACKEND_REQUIRED.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var PROVIDER_ID = 'orbit-backend-document-bridge';
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function registry() { return Orbit.documentProviderRegistryP09; }
  function defaultBridge() { return window.OrbitBackendDocumentBridge || Orbit.backendDocumentBridge || null; }
  function methodFor(bridge, task) {
    if (!bridge) return null;
    if (typeof bridge.execute === 'function') return function (request) { return bridge.execute(task, request); };
    var names = {
      pdf_manifest: ['extractPdfManifest', 'inspectPdf'],
      pdf_ocr: ['ocrPdf', 'ocr'],
      pdf_semantic: ['analyzePdf', 'analyzeSemantic'],
      excel_manifest: ['extractExcelManifest', 'inspectExcel'],
      excel_semantic: ['analyzeExcel', 'analyzeSemantic'],
      entity_matching: ['matchEntity', 'match'],
      consultative_reasoning: ['reason', 'analyze']
    };
    var name = (names[task] || []).find(function (candidate) { return typeof bridge[candidate] === 'function'; });
    return name ? function (request) { return bridge[name](request); } : null;
  }
  function normalizeStatus(value) {
    value = value || {};
    var tasks = unique([].concat(value.tasks || value.capabilities || []).map(clean));
    return {
      connected: value.connected === true,
      status: value.connected === true ? (clean(value.status) || 'connected') : 'backend_required',
      tasks: tasks,
      region: clean(value.region),
      externalAi: value.externalAi === true,
      deterministic: value.deterministic === true,
      version: clean(value.version),
      name: clean(value.name || 'Orbit backend document bridge')
    };
  }
  async function inspectBridge(bridge) {
    bridge = bridge || defaultBridge();
    if (!bridge) return { connected: false, status: 'backend_required', tasks: [], code: 'BACKEND_REQUIRED' };
    try {
      var status = typeof bridge.status === 'function' ? await bridge.status() : (bridge.capabilities || {});
      var normalized = normalizeStatus(status);
      normalized.tasks = normalized.tasks.filter(function (task) { return !!methodFor(bridge, task); });
      if (!normalized.tasks.length) normalized.connected = false;
      normalized.status = normalized.connected ? 'connected' : 'backend_required';
      normalized.code = normalized.connected ? 'BRIDGE_READY' : 'BACKEND_REQUIRED';
      return normalized;
    } catch (error) {
      return { connected: false, status: 'backend_required', tasks: [], code: clean(error && error.code) || 'BRIDGE_STATUS_FAILED' };
    }
  }
  async function registerAvailable(options) {
    options = options || {};
    var reg = options.registry || registry(), bridge = options.bridge || defaultBridge();
    if (!reg || typeof reg.register !== 'function') return { ok: false, code: 'PROVIDER_REGISTRY_REQUIRED', status: 'backend_required' };
    var status = await inspectBridge(bridge);
    if (!status.connected) {
      if (typeof reg.unregister === 'function') reg.unregister(PROVIDER_ID);
      return { ok: false, code: status.code || 'BACKEND_REQUIRED', status: 'backend_required', tasks: [] };
    }
    var provider = {
      execute: async function (task, request) {
        var method = methodFor(bridge, task);
        if (!method) { var error = new Error('TASK_NOT_AVAILABLE'); error.code = 'TASK_NOT_AVAILABLE'; throw error; }
        return method(Object.assign({}, request, {
          returnRawBytes: false, returnBase64: false, returnTokens: false,
          executeEmbeddedContent: false
        }));
      }
    };
    var registered = reg.register(PROVIDER_ID, provider, {
      name: status.name, tasks: status.tasks, status: 'connected', region: status.region,
      externalAi: status.externalAi, deterministic: status.deterministic,
      version: status.version, notes: 'Backend-injected capabilities only'
    });
    return { ok: true, code: 'BRIDGE_REGISTERED', provider: registered, tasks: status.tasks };
  }
  function unregister() {
    var reg = registry();
    if (reg && typeof reg.unregister === 'function') reg.unregister(PROVIDER_ID);
    return { ok: true, code: 'BRIDGE_UNREGISTERED' };
  }

  Orbit.documentProviderBridgeP09b = {
    PROVIDER_ID: PROVIDER_ID,
    methodFor: methodFor,
    normalizeStatus: normalizeStatus,
    inspectBridge: inspectBridge,
    registerAvailable: registerAvailable,
    unregister: unregister
  };
})();