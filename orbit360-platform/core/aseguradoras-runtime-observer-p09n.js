/* ============================================================
   Orbit 360 · P0.9n · Observador sanitizado de runtime Aseguradoras
   Fecha: 2026-07-10

   Captura únicamente estructura, estados, conteos y checklist visual.
   No captura texto de documentos, PII, rutas, referencias ni valores.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var VERSION = 'p09n-v1';
  var FORBIDDEN_VISIBLE = [
    'BACKEND_REQUIRED', 'Firestore', 'Firebase', 'Preflight LAB',
    'Provider', 'Snapshots', 'metadata-only', 'fileRef', 'sourceRef', 'localPath'
  ];
  var state = {
    lastReport: null,
    lastSubmission: null,
    lastFingerprint: '',
    scheduled: null,
    submitting: false,
    captures: 0
  };

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (error) { return value; }
  }
  function bool(value) { return value === true; }
  function number(value) { var n = Number(value); return Number.isFinite(n) && n >= 0 ? n : 0; }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function safeCall(fn, fallback) {
    try { return typeof fn === 'function' ? fn() : fallback; }
    catch (error) { return fallback; }
  }
  function tenantId() {
    var backend = window.OrbitBackend || window.ORBIT_BACKEND || {};
    var tenant = safeCall(function () { return Orbit.tenant && Orbit.tenant.get && Orbit.tenant.get(); }, {}) || {};
    return clean(backend.tenantId || backend.tenant || tenant.tenantId || tenant.id || tenant.slug || 'alianzas-soluciones');
  }
  function actorState() {
    var user = safeCall(function () { return Orbit.auth && Orbit.auth.user && Orbit.auth.user(); }, {}) || {};
    var activeRole = clean(user.activeRole || user.rolActivo || user.role || user.rol);
    var roles = [].concat(user.roles || user.rolesAsignados || user.assignedRoles || []).map(clean).filter(Boolean);
    if (!roles.length && activeRole) roles = [activeRole];
    var tenant = clean(user.tenantId || user.tenant || tenantId());
    return {
      userPresent: !!clean(user.id || user.uid || user.userId || user.email),
      activeRole: activeRole,
      activeRoleAssigned: !!activeRole && roles.map(norm).indexOf(norm(activeRole)) >= 0,
      tenantMatch: !tenant || tenant === tenantId(),
      roleCount: roles.length
    };
  }
  function elementVisible(element) {
    if (!element || typeof element.getBoundingClientRect !== 'function') return false;
    var rect = element.getBoundingClientRect();
    var style = safeCall(function () { return window.getComputedStyle && window.getComputedStyle(element); }, {}) || {};
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity == null ? 1 : style.opacity) !== 0;
  }
  function rootText(element) {
    return clean(element && element.textContent).slice(0, 50000);
  }
  function visibleTerms(panel, form) {
    var text = rootText(panel) + '\n' + rootText(form);
    return FORBIDDEN_VISIBLE.filter(function (term) { return text.toLowerCase().indexOf(term.toLowerCase()) >= 0; });
  }
  function navigationReloaded() {
    try {
      var entry = window.performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (entry && entry.type) return entry.type === 'reload';
      return !!(window.performance && performance.navigation && performance.navigation.type === 1);
    } catch (error) { return false; }
  }
  function viewportState() {
    var width = number(window.innerWidth || document.documentElement && document.documentElement.clientWidth);
    var height = number(window.innerHeight || document.documentElement && document.documentElement.clientHeight);
    var root = document.documentElement || {};
    return {
      width: width,
      height: height,
      bucket: width < 640 ? 'mobile' : (width < 1024 ? 'tablet' : 'desktop'),
      devicePixelRatio: Math.min(number(window.devicePixelRatio || 1), 8),
      horizontalOverflow: number(root.scrollWidth) > width + 2
    };
  }
  function countStore(collection) {
    var rows = safeCall(function () { return Orbit.store && Orbit.store.all && Orbit.store.all(collection); }, []) || [];
    return [].concat(rows).filter(function (row) { return !row || !row.tenantId || clean(row.tenantId) === tenantId(); }).length;
  }
  function flowState() {
    var form = Orbit.aseguradorasBatchAdminFormP09j;
    var formStatus = safeCall(function () { return form && form.status && form.status(); }, {}) || {};
    var admin = Orbit.aseguradorasBatchAdminActionsP09i;
    var adminStatus = safeCall(function () { return admin && admin.status && admin.status(); }, {}) || {};
    var history = Orbit.aseguradorasBatchHistoryP09h;
    var historyModel = safeCall(function () {
      return history && history.readModel && history.readModel({ tenantId: tenantId(), batchId: 'ays_aseguradoras_knowledge_batch_2026_v1' });
    }, {}) || {};
    var preview = adminStatus.lastPlan || {};
    var execution = adminStatus.lastExecution || {};
    return {
      previewGenerated: bool(formStatus.hasPreview) || !!preview.fingerprint,
      previewExecutable: bool(preview.ok) && number(preview.referenceContract && preview.referenceContract.missing && preview.referenceContract.missing.length) === 0,
      executionCompleted: bool(formStatus.hasExecution) || !!clean(execution.code),
      executionOk: execution.ok === true || clean(execution.code) === 'BATCH_DRY_RUN_COMPLETE',
      historyPersisted: bool(formStatus.historyPersisted) || bool(execution.historyPersisted),
      historyRuns: number(historyModel.runs && historyModel.runs.length) || countStore('aseguradora_batch_runs'),
      historyItems: number(historyModel.items && historyModel.items.length) || countStore('aseguradora_batch_items'),
      resumableDocuments: number(historyModel.resumableDocumentIds && historyModel.resumableDocumentIds.length),
      knowledgePersisted: false,
      cotizadorEnabled: false,
      comparativoEnabled: false
    };
  }
  function runtimeState() {
    var bootstrap = Orbit.aseguradorasRuntimeBootstrapP09f;
    var status = safeCall(function () { return bootstrap && bootstrap.status && bootstrap.status(); }, {}) || {};
    var preflight = safeCall(function () { return bootstrap && bootstrap.preflight && bootstrap.preflight(); }, {}) || {};
    var broker = Orbit.aseguradorasSourceReferenceBrokerP09j;
    var brokerStatus = safeCall(function () { return broker && broker.status && broker.status(); }, {}) || {};
    var collections = Orbit.aseguradorasLabCollectionsP09e;
    var collectionStatus = safeCall(function () { return collections && collections.status && collections.status(); }, {}) || {};
    return {
      bootstrapReady: clean(status.status) === 'ready',
      preflightReady: bool(preflight.ok),
      sourceConnectionReady: bool(preflight.sourceReferenceBackendReady) || bool(brokerStatus.backendMethodAvailable),
      snapshotsReady: bool(preflight.knowledgeSnapshotsReady) || bool(collectionStatus.installed),
      errorCount: number(status.errors && status.errors.length),
      writesDirectly: false,
      cotizadorEnabled: false,
      comparativoEnabled: false
    };
  }
  function controlsState(form) {
    if (!form || typeof form.querySelectorAll !== 'function') return { buttons: 0, inputs: 0, disabled: 0 };
    var buttons = form.querySelectorAll('button');
    var inputs = form.querySelectorAll('input,select,textarea');
    var disabled = form.querySelectorAll('button:disabled,input:disabled,select:disabled,textarea:disabled');
    return { buttons: number(buttons.length), inputs: number(inputs.length), disabled: number(disabled.length) };
  }
  function gate(id, approved, pendingReason) {
    return { id: id, state: approved ? 'approved' : 'pending', reason: approved ? '' : clean(pendingReason) };
  }
  function capture(reason) {
    var panel = document.getElementById('asg-knowledge-p09f');
    var form = document.getElementById('asg-batch-admin-form-p09j');
    var runtime = runtimeState();
    var actor = actorState();
    var flow = flowState();
    var viewport = viewportState();
    var forbidden = visibleTerms(panel, form);
    var ui = {
      routeAseguradoras: clean(window.location && window.location.hash).indexOf('#/aseguradoras') === 0,
      panelMounted: !!panel,
      formMounted: !!form,
      panelVisible: elementVisible(panel),
      formVisible: elementVisible(form),
      forbiddenVisibleTerms: forbidden,
      forbiddenVisibleCount: forbidden.length,
      controls: controlsState(form)
    };
    var reloaded = navigationReloaded();
    var historyAfterReload = reloaded && flow.historyRuns > 0 && flow.historyItems > 0;
    var readModelReady = runtime.snapshotsReady && flow.historyRuns >= 0 && flow.historyItems >= 0;
    var gates = [
      gate('runtime_ready', runtime.bootstrapReady && runtime.preflightReady, 'runtime_pending'),
      gate('panel_mounted', ui.panelMounted && ui.panelVisible, 'panel_pending'),
      gate('form_mounted', ui.formMounted && ui.formVisible, 'form_pending'),
      gate('auth_role', actor.userPresent && actor.activeRoleAssigned && actor.tenantMatch, 'auth_or_role_pending'),
      gate('source_connection', runtime.sourceConnectionReady, 'source_connection_pending'),
      gate('preview', flow.previewGenerated, 'preview_pending'),
      gate('training_read', flow.executionCompleted && flow.executionOk, 'training_read_pending'),
      gate('history_persisted', flow.historyPersisted && flow.historyRuns > 0, 'history_pending'),
      gate('history_after_reload', historyAfterReload, 'reload_verification_pending'),
      gate('read_model', readModelReady, 'read_model_pending'),
      gate('responsive_structure', !viewport.horizontalOverflow && ui.panelVisible && ui.formVisible, 'responsive_check_pending'),
      gate('copy_clean', forbidden.length === 0, 'technical_copy_visible'),
      gate('module_boundary', false, 'visual_boundary_review_pending')
    ];
    var pending = gates.filter(function (item) { return item.state !== 'approved'; }).map(function (item) { return item.id; });
    var report = {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      reason: clean(reason || 'capture'),
      tenantId: tenantId(),
      route: 'aseguradoras',
      runtime: runtime,
      actor: actor,
      viewport: viewport,
      ui: ui,
      flow: flow,
      navigationReloaded: reloaded,
      counts: {
        sources: countStore('aseguradoras'),
        manifests: countStore('aseguradora_manifiestos'),
        proposals: countStore('aseguradora_propuestas'),
        rules: countStore('aseguradora_reglas_tarifarias'),
        presentations: countStore('aseguradora_presentaciones'),
        bindings: countStore('aseguradora_bindings'),
        reviews: countStore('aseguradora_revisiones')
      },
      gates: gates,
      claudeGate: {
        ready: pending.length === 0,
        status: pending.length === 0 ? 'ready_for_super_accumulated_claude_package' : 'not_ready',
        pending: pending,
        packageMode: 'super_accumulated_from_candidate_20260708'
      },
      containsPii: false,
      containsDocumentText: false,
      containsLocalPaths: false,
      containsReferences: false,
      containsSecrets: false,
      writeAllowed: false,
      enablesCotizador: false,
      enablesComparativo: false
    };
    state.lastReport = clone(report);
    state.captures += 1;
    try { window.dispatchEvent(new CustomEvent('orbit:aseguradoras:runtime-observed', { detail: { version: VERSION, claudeGate: clone(report.claudeGate) } })); } catch (error) {}
    return clone(report);
  }
  function fingerprint(report) {
    try { return JSON.stringify({ reason: report.reason, runtime: report.runtime, actor: report.actor, viewport: report.viewport, ui: report.ui, flow: report.flow, counts: report.counts, pending: report.claudeGate.pending }); }
    catch (error) { return String(Date.now()); }
  }
  function reportBridge() {
    return window.OrbitBackendDocumentBridge || Orbit.backendDocumentBridge || {};
  }
  async function submit(reason) {
    if (state.submitting) return clone(state.lastSubmission || { ok: false, code: 'REPORT_SUBMISSION_BUSY' });
    var report = capture(reason || 'submit');
    var key = fingerprint(report);
    if (key === state.lastFingerprint && state.lastSubmission) return clone(state.lastSubmission);
    var bridge = reportBridge();
    if (!bridge || typeof bridge.submitRuntimeReport !== 'function') {
      state.lastSubmission = { ok: false, code: 'RUNTIME_REPORT_BRIDGE_PENDING', accepted: false };
      return clone(state.lastSubmission);
    }
    state.submitting = true;
    try {
      var response = await bridge.submitRuntimeReport(report);
      state.lastFingerprint = key;
      state.lastSubmission = clone(response || { ok: false, code: 'RUNTIME_REPORT_EMPTY_RESPONSE' });
      return clone(state.lastSubmission);
    } catch (error) {
      state.lastSubmission = { ok: false, code: clean(error && (error.code || error.message || error)) || 'RUNTIME_REPORT_FAILED', accepted: false };
      return clone(state.lastSubmission);
    } finally { state.submitting = false; }
  }
  function schedule(reason) {
    if (state.scheduled) clearTimeout(state.scheduled);
    state.scheduled = setTimeout(function () {
      state.scheduled = null;
      if (clean(window.location && window.location.hash).indexOf('#/aseguradoras') === 0) submit(reason || 'event');
    }, 450);
    return true;
  }
  function status() {
    return {
      version: VERSION,
      captures: state.captures,
      hasReport: !!state.lastReport,
      hasSubmission: !!state.lastSubmission,
      submitting: state.submitting,
      claudeGate: clone(state.lastReport && state.lastReport.claudeGate),
      referencesExposed: false,
      containsPii: false,
      writeAllowed: false,
      enablesCotizador: false,
      enablesComparativo: false
    };
  }
  function resetForTest() {
    if (state.scheduled) clearTimeout(state.scheduled);
    state.lastReport = null; state.lastSubmission = null; state.lastFingerprint = ''; state.scheduled = null; state.submitting = false; state.captures = 0;
  }

  Orbit.aseguradorasRuntimeObserverP09n = {
    VERSION: VERSION,
    capture: capture,
    submit: submit,
    schedule: schedule,
    status: status,
    resetForTest: resetForTest
  };

  ['hashchange', 'load', 'orbit:aseguradoras:knowledge-ready', 'orbit:aseguradoras:source-reference-state',
    'orbit:aseguradoras:batch-admin-state', 'orbit:aseguradoras:batch-state', 'orbit:aseguradoras:runtime-observed']
    .forEach(function (name) { if (name !== 'orbit:aseguradoras:runtime-observed') window.addEventListener(name, function () { schedule(name); }); });
  document.addEventListener('orbit:store', function () { schedule('store'); });
  schedule('initial');
})();