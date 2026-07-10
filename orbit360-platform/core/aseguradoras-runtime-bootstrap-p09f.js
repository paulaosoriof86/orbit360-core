/* ============================================================
   Orbit 360 · P0.9f/P0.9g/P0.9h/P0.9i/P0.9j · Bootstrap seguro
   Fecha: 2026-07-10

   Carga contratos aditivos solo en Firestore LAB para A&S. No modifica
   backend protegido, no registra secretos y no habilita módulos.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var VERSION = 'p09j-v1';
  var REQUIRED = [
    { src: 'core/document-source-contract-p04.js', global: 'documentSourceContractP04' },
    { src: 'core/cotizacion-esquema-aseguradora-p0.js', global: 'cotizacionEsquemaAseguradoraP0' },
    { src: 'core/tariff-rule-proposal-p06.js', global: 'tariffRuleProposalP06' },
    { src: 'core/excel-rule-proposal-adapter-p06b.js', global: 'excelRuleProposalAdapterP06b' },
    { src: 'core/pdf-quote-adapter-p07.js', global: 'pdfQuoteAdapterP07' },
    { src: 'core/tariff-quote-reconciliation-p06c.js', global: 'tariffQuoteReconciliationP06c' },
    { src: 'core/knowledge-binding-gate-p08.js', global: 'knowledgeBindingGateP08' },
    { src: 'core/knowledge-binding-policy-p08.js', global: 'knowledgeBindingPolicyP08', optionalGlobal: true },
    { src: 'core/tenant-insurer-config-p10.js', global: 'tenantInsurerConfigP10' },
    { src: 'data/tenant-alianzas-soluciones-insurers-p10.js', dataOnly: true },
    { src: 'core/tenant-source-batch-adapter-p10.js', global: 'tenantSourceBatchAdapterP10' },
    { src: 'core/tenant-binding-plan-p10c.js', global: 'tenantBindingPlanP10c' },
    { src: 'data/tenant-alianzas-soluciones-binding-plan-p10c.js', dataOnly: true },
    { src: 'data/tenant-alianzas-soluciones-first-source-p09f.js', dataOnly: true },
    { src: 'data/tenant-alianzas-soluciones-source-batch-p09g.js', dataOnly: true },
    { src: 'core/document-provider-registry-p09.js', global: 'documentProviderRegistryP09' },
    { src: 'core/document-provider-bridge-p09b.js', global: 'documentProviderBridgeP09b' },
    { src: 'core/aseguradoras-knowledge-runtime-p09.js', global: 'aseguradorasKnowledgeRuntimeP09' },
    { src: 'core/aseguradoras-lab-collections-p09e.js', global: 'aseguradorasLabCollectionsP09e' },
    { src: 'core/aseguradoras-lab-persistence-p09e.js', global: 'aseguradorasLabPersistenceP09e' },
    { src: 'modules/aseguradoras-knowledge-p09.js', service: 'aseguradorasKnowledgeP09' },
    { src: 'core/aseguradoras-first-source-orchestrator-p09f.js', global: 'aseguradorasFirstSourceP09f' },
    { src: 'core/aseguradoras-batch-orchestrator-p09g.js', global: 'aseguradorasBatchOrchestratorP09g' },
    { src: 'core/aseguradoras-batch-history-p09h.js', global: 'aseguradorasBatchHistoryP09h' },
    { src: 'core/aseguradoras-batch-admin-actions-p09i.js', global: 'aseguradorasBatchAdminActionsP09i' },
    { src: 'core/aseguradoras-source-reference-broker-p09j.js', global: 'aseguradorasSourceReferenceBrokerP09j' },
    { src: 'modules/aseguradoras-knowledge-panel-p09f.js', global: 'aseguradorasKnowledgePanelP09f' },
    { src: 'modules/aseguradoras-batch-admin-form-p09j.js', global: 'aseguradorasBatchAdminFormP09j' }
  ];

  var state = {
    version: VERSION, status: 'idle', startedAt: '', completedAt: '',
    loaded: [], skipped: [], errors: [], bridge: null,
    tenantId: '', mode: '', promise: null
  };

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (error) { return value; } }
  function backend() { return window.OrbitBackend || window.ORBIT_BACKEND || {}; }
  function params() { try { return new URLSearchParams(window.location && window.location.search || ''); } catch (error) { return new URLSearchParams(''); } }
  function runtimeContext() {
    var query = params(), b = backend();
    return {
      mode: clean(query.get('orbitBackend') || b.mode),
      tenantId: clean(query.get('tenant') || b.tenantId || b.tenant)
    };
  }
  function pathOnly(value) {
    return clean(value).replace(/^https?:\/\/[^/]+\//i, '').split('?')[0].replace(/^\.\//, '');
  }
  function hasScript(src) {
    var wanted = pathOnly(src);
    return Array.prototype.some.call(document.querySelectorAll('script[src]'), function (script) {
      return pathOnly(script.getAttribute('src') || script.src) === wanted;
    });
  }
  function requirementReady(item) {
    if (item.dataOnly) return hasScript(item.src);
    if (item.service) return !!(Orbit.services && Orbit.services[item.service]);
    if (item.global) return !!Orbit[item.global];
    return hasScript(item.src);
  }
  function emit(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: Object.assign({ version: VERSION }, detail || {}) })); } catch (error) {}
  }
  function loadScript(item) {
    return new Promise(function (resolve, reject) {
      if (requirementReady(item)) {
        state.skipped.push(item.src);
        resolve({ src: item.src, status: 'already_ready' });
        return;
      }
      if (hasScript(item.src)) {
        var started = Date.now();
        (function wait() {
          if (requirementReady(item) || item.dataOnly || item.optionalGlobal) {
            state.skipped.push(item.src);
            resolve({ src: item.src, status: 'existing_script_ready' });
            return;
          }
          if (Date.now() - started > 8000) {
            reject(new Error('SCRIPT_GLOBAL_TIMEOUT:' + item.src));
            return;
          }
          setTimeout(wait, 80);
        })();
        return;
      }
      var script = document.createElement('script');
      script.src = item.src + (item.src.indexOf('?') >= 0 ? '&' : '?') + 'orbitP09f=' + encodeURIComponent(VERSION);
      script.async = false;
      script.dataset.orbitP09f = VERSION;
      script.onload = function () {
        if (!requirementReady(item) && !item.dataOnly && !item.optionalGlobal) {
          reject(new Error('SCRIPT_GLOBAL_MISSING:' + item.src));
          return;
        }
        state.loaded.push(item.src);
        resolve({ src: item.src, status: 'loaded' });
      };
      script.onerror = function () { reject(new Error('SCRIPT_LOAD_FAILED:' + item.src)); };
      (document.head || document.documentElement).appendChild(script);
    });
  }
  function preflight() {
    var ctx = runtimeContext(), b = backend(), s = Orbit.store, errors = [], labStatus = {};
    try { if (s && typeof s._labStatus === 'function') labStatus = s._labStatus() || {}; } catch (error) {}
    if (ctx.mode !== 'firestore-lab') errors.push('FIRESTORE_LAB_REQUIRED');
    if (ctx.tenantId !== 'alianzas-soluciones') errors.push('LAB_TENANT_NOT_ALLOWED');
    if (!s || s.__firestoreLabExplicit !== true) errors.push('EXPLICIT_LAB_STORE_REQUIRED');
    if (!b.securityGuard || b.securityGuard.installed !== true) errors.push('BACKEND_SECURITY_GUARD_REQUIRED');
    if (!labStatus.snapshotAttached) errors.push('BASE_SNAPSHOTS_REQUIRED');
    var brokerStatus = Orbit.aseguradorasSourceReferenceBrokerP09j && typeof Orbit.aseguradorasSourceReferenceBrokerP09j.status === 'function'
      ? Orbit.aseguradorasSourceReferenceBrokerP09j.status() : {};
    return {
      ok: errors.length === 0, errors: errors, mode: ctx.mode, tenantId: ctx.tenantId,
      storeReady: !!(s && s.__firestoreLabExplicit),
      securityGuardReady: !!(b.securityGuard && b.securityGuard.installed),
      baseSnapshotsReady: labStatus.snapshotAttached === true,
      knowledgeSnapshotsReady: !!(Orbit.aseguradorasLabCollectionsP09e && Orbit.aseguradorasLabCollectionsP09e.status().installed),
      batchRuntimeReady: !!Orbit.aseguradorasBatchOrchestratorP09g,
      batchHistoryReady: !!(Orbit.aseguradorasBatchHistoryP09h && Orbit.aseguradorasBatchHistoryP09h.status().installed),
      batchAdminActionsReady: !!Orbit.aseguradorasBatchAdminActionsP09i,
      sourceReferenceBrokerReady: !!Orbit.aseguradorasSourceReferenceBrokerP09j,
      sourceReferenceBackendReady: brokerStatus.backendMethodAvailable === true,
      batchAdminFormReady: !!Orbit.aseguradorasBatchAdminFormP09j,
      bridgeStatus: clone(state.bridge), enablesCotizador: false, enablesComparativo: false
    };
  }
  async function registerBridge() {
    var api = Orbit.documentProviderBridgeP09b;
    if (!api || typeof api.registerAvailable !== 'function') return { ok: false, code: 'PROVIDER_BRIDGE_REQUIRED', status: 'backend_required' };
    state.bridge = clone(await api.registerAvailable());
    return state.bridge;
  }
  async function executeStart() {
    var ctx = runtimeContext();
    state.mode = ctx.mode;
    state.tenantId = ctx.tenantId;
    state.startedAt = new Date().toISOString();
    state.completedAt = '';
    state.status = 'loading';
    state.loaded = [];
    state.skipped = [];
    state.errors = [];
    if (ctx.mode !== 'firestore-lab' || ctx.tenantId !== 'alianzas-soluciones') {
      state.status = 'blocked_context';
      state.errors = [ctx.mode !== 'firestore-lab' ? 'FIRESTORE_LAB_REQUIRED' : 'LAB_TENANT_NOT_ALLOWED'];
      return status();
    }
    emit('orbit:aseguradoras:knowledge-loading', { tenantId: ctx.tenantId });
    for (var i = 0; i < REQUIRED.length; i += 1) {
      try { await loadScript(REQUIRED[i]); }
      catch (error) {
        state.errors.push(clean(error && error.message || error));
        state.status = 'load_failed';
        emit('orbit:aseguradoras:knowledge-error', { error: state.errors[state.errors.length - 1] });
        return status();
      }
    }
    try {
      if (Orbit.aseguradorasLabCollectionsP09e && typeof Orbit.aseguradorasLabCollectionsP09e.install === 'function') Orbit.aseguradorasLabCollectionsP09e.install();
    } catch (error) { state.errors.push('KNOWLEDGE_SNAPSHOT_INSTALL_FAILED'); }
    try {
      if (Orbit.aseguradorasBatchHistoryP09h && typeof Orbit.aseguradorasBatchHistoryP09h.install === 'function') Orbit.aseguradorasBatchHistoryP09h.install();
    } catch (error) { state.errors.push('BATCH_HISTORY_INSTALL_FAILED'); }
    await registerBridge();
    var check = preflight();
    state.completedAt = new Date().toISOString();
    state.status = check.ok ? 'ready' : 'requires_runtime_preflight';
    emit('orbit:aseguradoras:knowledge-ready', { status: state.status, preflight: check });
    try { if (Orbit.aseguradorasKnowledgePanelP09f) Orbit.aseguradorasKnowledgePanelP09f.schedule(); } catch (error) {}
    try { if (Orbit.aseguradorasBatchAdminFormP09j) Orbit.aseguradorasBatchAdminFormP09j.schedule(); } catch (error) {}
    return status();
  }
  function start() {
    if (!state.promise) state.promise = executeStart();
    return state.promise;
  }
  function retry() {
    if (state.status === 'loading' && state.promise) return state.promise;
    state.promise = null;
    return start();
  }
  function resetForTest() {
    state.promise = null; state.status = 'idle'; state.startedAt = ''; state.completedAt = '';
    state.loaded = []; state.skipped = []; state.errors = []; state.bridge = null;
  }
  function status() {
    return {
      version: VERSION, status: state.status, mode: state.mode, tenantId: state.tenantId,
      startedAt: state.startedAt, completedAt: state.completedAt,
      loaded: state.loaded.slice(), skipped: state.skipped.slice(), errors: state.errors.slice(),
      bridge: clone(state.bridge), requiredScripts: REQUIRED.map(function (item) { return item.src; }),
      enablesCotizador: false, enablesComparativo: false, writesDirectly: false
    };
  }

  Orbit.aseguradorasRuntimeBootstrapP09f = {
    VERSION: VERSION, REQUIRED: clone(REQUIRED), runtimeContext: runtimeContext,
    preflight: preflight, start: start, retry: retry, status: status, resetForTest: resetForTest
  };

  setTimeout(function () {
    var ctx = runtimeContext();
    if (ctx.mode === 'firestore-lab' && ctx.tenantId === 'alianzas-soluciones') start();
  }, 0);
})();