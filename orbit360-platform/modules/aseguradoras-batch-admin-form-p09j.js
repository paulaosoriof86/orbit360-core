/* ============================================================
   Orbit 360 · P0.9j · Formulario administrativo del lote Aseguradoras
   Fecha: 2026-07-10

   UI aditiva para preview, dry-run/reanudación y persistencia separada del
   historial. No muestra referencias, no persiste conocimiento y no habilita
   Cotizador o Comparativo.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var FORM_ID = 'asg-batch-admin-form-p09j';
  var state = {
    action: 'dry_run',
    selected: [],
    reason: '',
    confirmationText: '',
    historyConfirmationText: '',
    confirmHistoryPlan: false,
    confirmHistoryPersistence: false,
    previewResult: null,
    execution: null,
    historyResult: null,
    busy: false,
    message: '',
    scheduled: null
  };

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function esc(value) {
    var ui = Orbit.ui;
    return ui && typeof ui.esc === 'function' ? ui.esc(clean(value)) : clean(value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (error) { return value; }
  }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function backend() { return window.OrbitBackend || window.ORBIT_BACKEND || {}; }
  function tenantId() {
    var b = backend(), tenant = {};
    try { if (Orbit.tenant && typeof Orbit.tenant.get === 'function') tenant = Orbit.tenant.get() || {}; } catch (error) {}
    return clean(b.tenantId || b.tenant || tenant.tenantId || tenant.id || tenant.slug || 'alianzas-soluciones');
  }
  function authUser() {
    try { return Orbit.auth && typeof Orbit.auth.user === 'function' ? Orbit.auth.user() || {} : {}; }
    catch (error) { return {}; }
  }
  function currentActor() {
    var user = authUser(), b = backend();
    var activeRole = clean(user.activeRole || user.rolActivo || user.role || user.rol);
    var roles = unique([].concat(user.roles || user.rolesAsignados || user.assignedRoles || []).map(clean).filter(Boolean));
    if (!roles.length && activeRole) roles = [activeRole];
    return {
      id: clean(user.id || user.uid || user.userId || user.email || b.expectedUid || b.expectedEmail),
      uid: clean(user.uid),
      email: clean(user.email),
      tenantId: tenantId(),
      activeRole: activeRole,
      roles: roles
    };
  }
  function batchApi() { return Orbit.aseguradorasBatchOrchestratorP09g; }
  function adminApi() { return Orbit.aseguradorasBatchAdminActionsP09i; }
  function brokerApi() { return Orbit.aseguradorasSourceReferenceBrokerP09j; }
  function batch() {
    var api = batchApi();
    return api && typeof api.getBatch === 'function'
      ? api.getBatch(tenantId(), 'ays_aseguradoras_knowledge_batch_2026_v1')
      : null;
  }
  function resumableIds() {
    var history = Orbit.aseguradorasBatchHistoryP09h;
    return history && typeof history.resumeDocumentIds === 'function'
      ? history.resumeDocumentIds({ tenantId: tenantId(), batchId: 'ays_aseguradoras_knowledge_batch_2026_v1' })
      : [];
  }
  function sourceId(item) { return clean(item && item.source && (item.source.documentId || item.source.id)); }
  function eligibleSources(currentBatch) {
    var rows = [].concat(currentBatch && currentBatch.sources || []);
    if (state.action !== 'resume') return rows;
    var allowed = Object.create(null);
    resumableIds().forEach(function (id) { allowed[clean(id)] = true; });
    return rows.filter(function (item) { return allowed[sourceId(item)]; });
  }
  function initializeSelection(rows) {
    var eligible = rows.map(sourceId).filter(Boolean);
    var current = state.selected.filter(function (id) { return eligible.indexOf(id) >= 0; });
    state.selected = current.length ? current : eligible;
  }
  function roleAllowed(actor, roles) {
    var active = norm(actor && actor.activeRole);
    return [].concat(roles || []).map(norm).indexOf(active) >= 0;
  }
  function model() {
    var currentBatch = batch(), actor = currentActor(), admin = adminApi(), broker = brokerApi();
    var rows = eligibleSources(currentBatch);
    initializeSelection(rows);
    var previewRoles = admin && admin.PREVIEW_ROLES || [];
    var adminRoles = admin && admin.ADMIN_ROLES || [];
    return {
      tenantId: tenantId(),
      batch: currentBatch,
      actor: actor,
      rows: rows,
      previewAuthorized: roleAllowed(actor, previewRoles),
      historyAuthorized: roleAllowed(actor, adminRoles),
      broker: broker && typeof broker.status === 'function' ? broker.status() : { backendMethodAvailable: false },
      preview: state.previewResult,
      execution: state.execution,
      historyResult: state.historyResult,
      busy: state.busy,
      message: state.message
    };
  }
  function referenceByDocument(previewResult) {
    var out = Object.create(null);
    var items = previewResult && previewResult.ticket && previewResult.ticket.availability && previewResult.ticket.availability.items || [];
    items.forEach(function (item) { out[clean(item.documentId)] = item.provided === true; });
    return out;
  }
  function statusBadge(label, ok) {
    return '<span class="badge ' + (ok ? 'ok' : 'warn') + '">' + esc(label) + '</span>';
  }
  function sourceRowsHtml(view) {
    var refMap = referenceByDocument(view.preview);
    if (!view.rows.length) return '<div class="muted" style="font-size:11px">No existen documentos reanudables para la selección actual.</div>';
    return '<div style="display:grid;gap:6px;max-height:260px;overflow:auto">' + view.rows.map(function (item) {
      var source = item.source || {}, id = sourceId(item), checked = state.selected.indexOf(id) >= 0;
      var refKnown = Object.prototype.hasOwnProperty.call(refMap, id);
      var refLabel = refKnown ? (refMap[id] ? 'Referencia disponible' : 'Referencia pendiente') : 'Sin consultar';
      return '<label style="display:flex;align-items:flex-start;gap:8px;padding:8px;border:1px solid var(--line);border-radius:9px;background:var(--surface)">' +
        '<input type="checkbox" data-p09j-document value="' + esc(id) + '" ' + (checked ? 'checked' : '') + '>' +
        '<span style="flex:1;min-width:0"><b style="font-size:11.5px">' + esc(source.nombre || source.fileName) + '</b>' +
        '<span class="muted" style="display:block;font-size:10.5px;margin-top:2px">' + esc(item.insurerName) + ' · ' + esc(source.producto) + ' · ' + esc(source.pais) + '/' + esc(source.moneda) + ' · ' + esc(source.version) + '</span></span>' +
        '<span class="badge ' + (refKnown && refMap[id] ? 'ok' : 'neutral') + '">' + esc(refLabel) + '</span>' +
      '</label>';
    }).join('') + '</div>';
  }
  function previewHtml(view) {
    var result = view.preview, preview = result && result.preview;
    if (!preview) return '';
    var ticket = result.ticket || {}, refs = ticket.availability || {};
    return '<div style="margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--surface)">' +
      '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
        statusBadge(preview.code || 'Preview', preview.ok === true) +
        statusBadge(ticket.code || 'Referencias', result.executable === true) +
      '</div>' +
      '<div class="muted" style="font-size:10.5px;margin-top:7px">Fingerprint: <code>' + esc(preview.fingerprint) + '</code></div>' +
      '<div class="muted" style="font-size:10.5px;margin-top:3px">Referencias disponibles: ' + esc(refs.provided || 0) + '/' + esc(refs.total || 0) + '. Valores técnicos ocultos.</div>' +
      '<div style="margin-top:8px"><label style="font-size:11px;font-weight:700">Escribe exactamente: ' + esc(preview.requiredConfirmation) + '</label>' +
        '<input class="input" data-p09j-confirmation value="' + esc(state.confirmationText) + '" autocomplete="off" style="width:100%;margin-top:5px" ' + (result.executable ? '' : 'disabled') + '></div>' +
      '<button class="btn primary" type="button" data-p09j-execute style="margin-top:8px" ' + (result.executable && !view.busy ? '' : 'disabled') + '>Ejecutar sin persistir conocimiento</button>' +
    '</div>';
  }
  function executionHtml(view) {
    var execution = view.execution;
    if (!execution) return '';
    var summary = execution.run && execution.run.summary || {};
    return '<div style="margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--surface)">' +
      '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' + statusBadge(execution.code || 'Ejecución', execution.ok === true) +
      '<span class="badge neutral">Conocimiento persistido: no</span></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:11px">' +
        '<span>Procesados: <b>' + esc(summary.total || execution.documentIds && execution.documentIds.length || 0) + '</b></span>' +
        '<span>Listos: <b>' + esc(summary.dryRunReady || 0) + '</b></span>' +
        '<span>Fallidos: <b>' + esc(summary.failed || 0) + '</b></span>' +
        '<span>Sin referencia: <b>' + esc(summary.waitingReference || 0) + '</b></span>' +
      '</div>' +
      historyHtml(view) +
    '</div>';
  }
  function historyHtml(view) {
    if (!view.execution) return '';
    if (!view.historyAuthorized) return '<div class="muted" style="font-size:10.5px;margin-top:8px">El rol activo puede revisar el dry-run, pero no persistir el historial global.</div>';
    return '<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:9px">' +
      '<b style="font-size:11.5px">Guardar únicamente el historial</b>' +
      '<label style="display:block;font-size:10.5px;margin-top:7px"><input type="checkbox" data-p09j-history-plan ' + (state.confirmHistoryPlan ? 'checked' : '') + '> Confirmo el plan metadata-only.</label>' +
      '<label style="display:block;font-size:10.5px;margin-top:5px"><input type="checkbox" data-p09j-history-persist ' + (state.confirmHistoryPersistence ? 'checked' : '') + '> Confirmo la persistencia separada del historial.</label>' +
      '<label style="display:block;font-size:10.5px;font-weight:700;margin-top:7px">Escribe exactamente: GUARDAR HISTORIAL</label>' +
      '<input class="input" data-p09j-history-confirmation value="' + esc(state.historyConfirmationText) + '" autocomplete="off" style="width:100%;margin-top:5px">' +
      '<button class="btn" type="button" data-p09j-history-save style="margin-top:8px" ' + (view.busy ? 'disabled' : '') + '>Guardar historial</button>' +
      (view.historyResult ? '<div class="muted" style="font-size:10.5px;margin-top:6px">Resultado: ' + esc(view.historyResult.code) + '</div>' : '') +
    '</div>';
  }
  function html(view) {
    if (!view.batch) return '<section id="' + FORM_ID + '" style="margin:0 0 14px;border:1px solid var(--line);border-radius:12px;padding:13px;background:var(--card)"><b>Operación documental</b><div class="muted">Lote no disponible.</div></section>';
    return '<section id="' + FORM_ID + '" style="margin:0 0 14px;border:1px solid var(--line);border-radius:12px;padding:13px;background:var(--card)">' +
      '<div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap"><div style="flex:1;min-width:240px"><div style="font-size:12px;font-weight:800">Operación controlada del lote documental</div>' +
      '<div class="muted" style="font-size:11.5px;margin-top:3px">Genera preview y dry-run. No guarda conocimiento ni activa Cotizador o Comparativo.</div></div>' +
      statusBadge('Rol activo: ' + (view.actor.activeRole || 'sin rol'), view.previewAuthorized) + '</div>' +
      (!view.previewAuthorized ? '<div class="hint error" style="margin-top:10px">El rol activo no está autorizado para operar este lote.</div>' :
      '<div style="display:grid;grid-template-columns:minmax(180px,.35fr) minmax(260px,1fr);gap:10px;margin-top:11px">' +
        '<div><label style="font-size:11px;font-weight:700">Acción</label><select class="input" data-p09j-action style="width:100%;margin-top:5px"><option value="dry_run" ' + (state.action === 'dry_run' ? 'selected' : '') + '>Dry-run del lote</option><option value="resume" ' + (state.action === 'resume' ? 'selected' : '') + '>Reanudar pendientes</option></select>' +
        '<label style="display:block;font-size:11px;font-weight:700;margin-top:10px">Motivo obligatorio</label><textarea class="input" data-p09j-reason rows="5" style="width:100%;margin-top:5px" placeholder="Describe por qué se revisará este lote">' + esc(state.reason) + '</textarea>' +
        '<button class="btn" type="button" data-p09j-preview style="margin-top:8px" ' + (view.busy ? 'disabled' : '') + '>Generar vista previa</button>' +
        '<div class="muted" style="font-size:10.5px;margin-top:7px">El backend resuelve las referencias. No debes copiar rutas ni IDs.</div></div>' +
        '<div><label style="font-size:11px;font-weight:700">Documentos incluidos (' + esc(state.selected.length) + ')</label><div style="margin-top:5px">' + sourceRowsHtml(view) + '</div></div>' +
      '</div>' + previewHtml(view) + executionHtml(view)) +
      (view.message ? '<div class="hint ' + (view.message.indexOf('OK:') === 0 ? 'success' : 'error') + '" style="margin-top:9px">' + esc(view.message) + '</div>' : '') +
    '</section>';
  }
  function readInputs(root) {
    var action = root.querySelector('[data-p09j-action]');
    var reason = root.querySelector('[data-p09j-reason]');
    var confirmation = root.querySelector('[data-p09j-confirmation]');
    var historyConfirmation = root.querySelector('[data-p09j-history-confirmation]');
    if (action) state.action = clean(action.value || 'dry_run');
    if (reason) state.reason = clean(reason.value);
    if (confirmation) state.confirmationText = clean(confirmation.value);
    if (historyConfirmation) state.historyConfirmationText = clean(historyConfirmation.value);
    state.selected = Array.prototype.map.call(root.querySelectorAll('[data-p09j-document]:checked'), function (el) { return clean(el.value); }).filter(Boolean);
    var hp = root.querySelector('[data-p09j-history-plan]');
    var hs = root.querySelector('[data-p09j-history-persist]');
    state.confirmHistoryPlan = !!(hp && hp.checked);
    state.confirmHistoryPersistence = !!(hs && hs.checked);
  }
  async function generatePreview() {
    var view = model(), broker = brokerApi();
    if (!broker || typeof broker.prepare !== 'function') { state.message = 'BACKEND_REQUIRED: broker de referencias no disponible.'; return schedule(); }
    if (!state.reason) { state.message = 'El motivo es obligatorio.'; return schedule(); }
    state.busy = true; state.message = ''; state.execution = null; state.historyResult = null; state.confirmationText = '';
    schedule();
    try {
      state.previewResult = await broker.prepare({
        tenantId: view.tenantId,
        batchId: view.batch.id,
        action: state.action,
        documentIds: state.selected.slice(),
        onlyDocumentIds: state.selected.slice(),
        actor: view.actor,
        reason: state.reason,
        purpose: 'training'
      });
      state.message = state.previewResult && state.previewResult.executable
        ? 'OK: vista previa lista para confirmación.'
        : 'Vista previa generada; el backend aún no resolvió todas las referencias.';
    } catch (error) { state.message = clean(error && (error.message || error)) || 'No se pudo generar el preview.'; }
    state.busy = false; schedule();
  }
  async function executePreview() {
    var view = model(), broker = brokerApi(), result = state.previewResult, preview = result && result.preview;
    if (!broker || !preview) { state.message = 'Primero genera una vista previa válida.'; return schedule(); }
    if (state.confirmationText !== clean(preview.requiredConfirmation)) { state.message = 'La frase de confirmación no coincide.'; return schedule(); }
    state.busy = true; state.message = ''; schedule();
    try {
      state.execution = await broker.execute(result.ticket && result.ticket.ticketId, preview, {
        actor: view.actor,
        reason: state.reason,
        expectedFingerprint: preview.fingerprint,
        confirmExecution: true,
        confirmationText: state.confirmationText
      });
      state.message = state.execution && state.execution.ok ? 'OK: dry-run completado sin persistir conocimiento.' : clean(state.execution && state.execution.code || 'Ejecución bloqueada.');
    } catch (error) { state.message = clean(error && (error.message || error)) || 'No se pudo ejecutar el dry-run.'; }
    state.busy = false; schedule();
  }
  async function persistHistory() {
    var view = model(), admin = adminApi();
    if (!view.historyAuthorized) { state.message = 'El rol activo no puede persistir el historial.'; return schedule(); }
    if (!state.execution || !state.execution.ok) { state.message = 'Se requiere una ejecución terminada.'; return schedule(); }
    if (!state.confirmHistoryPlan || !state.confirmHistoryPersistence || state.historyConfirmationText !== 'GUARDAR HISTORIAL') {
      state.message = 'Debes completar las dos confirmaciones y escribir GUARDAR HISTORIAL.'; return schedule();
    }
    state.busy = true; state.message = ''; schedule();
    try {
      state.historyResult = await admin.persistHistory(state.execution, {
        actor: view.actor,
        reason: state.reason,
        tenantId: view.tenantId,
        batchId: view.batch.id,
        confirmHistoryPlan: true,
        confirmHistoryPersistence: true
      });
      state.message = state.historyResult && state.historyResult.persisted ? 'OK: historial metadata-only persistido.' : clean(state.historyResult && state.historyResult.code || 'Historial bloqueado.');
    } catch (error) { state.message = clean(error && (error.message || error)) || 'No se pudo persistir el historial.'; }
    state.busy = false; schedule();
  }
  function bind(root) {
    if (!root || root.dataset.p09jBound === 'true') return;
    root.dataset.p09jBound = 'true';
    root.addEventListener('change', function (event) {
      readInputs(root);
      if (event.target && event.target.matches('[data-p09j-action]')) {
        state.selected = [];
        state.previewResult = null;
        state.execution = null;
        state.historyResult = null;
        state.confirmationText = '';
      }
      schedule();
    });
    root.addEventListener('input', function () { readInputs(root); });
    root.addEventListener('click', function (event) {
      var target = event.target;
      if (!target) return;
      readInputs(root);
      if (target.matches('[data-p09j-preview]')) generatePreview();
      else if (target.matches('[data-p09j-execute]')) executePreview();
      else if (target.matches('[data-p09j-history-save]')) persistHistory();
    });
  }
  function mount() {
    if (!window.location || clean(window.location.hash).indexOf('#/aseguradoras') !== 0) return false;
    var panel = document.getElementById('asg-knowledge-p09f');
    if (!panel || !panel.insertAdjacentHTML) return false;
    var existing = document.getElementById(FORM_ID);
    var markup = html(model());
    if (existing) existing.outerHTML = markup;
    else panel.insertAdjacentHTML('afterend', markup);
    bind(document.getElementById(FORM_ID));
    return true;
  }
  function schedule() {
    if (state.scheduled) clearTimeout(state.scheduled);
    state.scheduled = setTimeout(function retry(attempt) {
      if (mount() || attempt >= 20) return;
      state.scheduled = setTimeout(function () { retry(attempt + 1); }, 120);
    }.bind(null, 0), 0);
    return true;
  }
  function publicStatus() {
    return {
      version: 'p09j-v1',
      action: state.action,
      selectedCount: state.selected.length,
      hasPreview: !!state.previewResult,
      hasExecution: !!state.execution,
      historyPersisted: !!(state.historyResult && state.historyResult.persisted),
      busy: state.busy,
      referencesExposed: false,
      knowledgePersistenceAllowed: false,
      enablesCotizador: false,
      enablesComparativo: false
    };
  }
  function resetForTest() {
    state.action = 'dry_run'; state.selected = []; state.reason = ''; state.confirmationText = '';
    state.historyConfirmationText = ''; state.confirmHistoryPlan = false; state.confirmHistoryPersistence = false;
    state.previewResult = null; state.execution = null; state.historyResult = null; state.busy = false; state.message = '';
  }

  Orbit.aseguradorasBatchAdminFormP09j = {
    mount: mount,
    schedule: schedule,
    model: model,
    html: html,
    currentActor: currentActor,
    generatePreview: generatePreview,
    executePreview: executePreview,
    persistHistory: persistHistory,
    status: publicStatus,
    resetForTest: resetForTest
  };

  window.addEventListener('hashchange', schedule);
  window.addEventListener('orbit:aseguradoras:knowledge-ready', schedule);
  window.addEventListener('orbit:aseguradoras:source-reference-state', schedule);
  window.addEventListener('orbit:aseguradoras:batch-admin-state', schedule);
  window.addEventListener('orbit:aseguradoras:batch-state', schedule);
  document.addEventListener('orbit:store', schedule);
  schedule();
})();