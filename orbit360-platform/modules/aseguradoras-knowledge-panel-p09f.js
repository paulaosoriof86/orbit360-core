/* ============================================================
   Orbit 360 · P0.9f/P0.9g/P0.9h/P0.9i · Panel aditivo de conocimiento
   Fecha: 2026-07-10

   Muestra provider, snapshots, conocimiento, lote, historial y estado admin.
   No escribe store, no ejecuta lotes y no habilita Cotizador/Comparativo.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var PANEL_ID = 'asg-knowledge-p09f';
  var scheduled = null;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function esc(value) {
    var ui = Orbit.ui;
    return ui && typeof ui.esc === 'function' ? ui.esc(clean(value)) : clean(value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function all(collection) {
    try { return Orbit.store && typeof Orbit.store.all === 'function' ? Orbit.store.all(collection) || [] : []; }
    catch (error) { return []; }
  }
  function tenantId() {
    var backend = window.OrbitBackend || window.ORBIT_BACKEND || {};
    return clean(backend.tenantId || backend.tenant || '');
  }
  function countTenant(collection, tenant) {
    return all(collection).filter(function (row) { return !row || !row.tenantId || clean(row.tenantId) === tenant; }).length;
  }
  function batchState(tenant) {
    var api = Orbit.aseguradorasBatchOrchestratorP09g;
    if (!api) return { batches: [], latest: null };
    var batches = typeof api.listBatches === 'function' ? api.listBatches(tenant) : [];
    var first = batches[0] || null;
    var latest = first && typeof api.latest === 'function' ? api.latest(tenant, first.id) : null;
    return { batches: batches, latest: latest };
  }
  function historyState(tenant, batch) {
    var api = Orbit.aseguradorasBatchHistoryP09h;
    var first = batch && batch.batches && batch.batches[0];
    if (!api || typeof api.readModel !== 'function' || !first) {
      return { runs: [], items: [], latest: null, latestItems: [], resumableDocumentIds: [] };
    }
    return api.readModel(tenant, first.id);
  }
  function adminState() {
    var api = Orbit.aseguradorasBatchAdminActionsP09i;
    if (!api || typeof api.status !== 'function') return {
      version: '', lastPlan: null, lastExecution: null,
      knowledgePersistenceAllowed: false, referencesExposed: false
    };
    return api.status();
  }
  function state() {
    var tenant = tenantId();
    var bootstrap = Orbit.aseguradorasRuntimeBootstrapP09f;
    var boot = bootstrap && typeof bootstrap.status === 'function' ? bootstrap.status() : { status: 'not_loaded', bridge: null };
    var preflight = bootstrap && typeof bootstrap.preflight === 'function' ? bootstrap.preflight() : { ok: false, errors: ['BOOTSTRAP_NOT_LOADED'] };
    var knowledge = Orbit.aseguradorasLabCollectionsP09e;
    var snapshots = knowledge && typeof knowledge.status === 'function' ? knowledge.status() : { installed: false, snapshotAttachedCount: 0, collections: [] };
    var firstSource = Orbit.aseguradorasFirstSourceP09f;
    var firstPlans = firstSource && typeof firstSource.listPlans === 'function' ? firstSource.listPlans(tenant) : [];
    var provider = boot.bridge || { ok: false, code: 'BACKEND_REQUIRED', status: 'backend_required' };
    var sources = all('aseguradoras').filter(function (insurer) {
      return !insurer || !insurer.tenantId || clean(insurer.tenantId) === tenant;
    }).reduce(function (total, insurer) {
      return total + [].concat(insurer && insurer.docs || []).length;
    }, 0);
    var batch = batchState(tenant);
    return {
      tenantId: tenant, bootstrap: boot, preflight: preflight, provider: provider,
      snapshots: snapshots, firstPlans: firstPlans, batch: batch,
      history: historyState(tenant, batch), admin: adminState(),
      counts: {
        sources: sources,
        manifests: countTenant('aseguradora_manifiestos', tenant),
        proposals: countTenant('aseguradora_propuestas', tenant),
        rules: countTenant('aseguradora_reglas_tarifarias', tenant),
        presentations: countTenant('aseguradora_presentaciones', tenant),
        bindings: countTenant('aseguradora_bindings', tenant),
        reviews: countTenant('aseguradora_revisiones', tenant),
        batchRuns: countTenant('aseguradora_batch_runs', tenant),
        batchItems: countTenant('aseguradora_batch_items', tenant)
      }
    };
  }
  function badge(label, ok, detail) {
    return '<span class="badge ' + (ok ? 'ok' : 'warn') + '" title="' + esc(detail || '') + '">' + (ok ? '✓ ' : '⚠ ') + esc(label) + '</span>';
  }
  function metric(label, value) {
    return '<div style="min-width:92px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--surface)">' +
      '<div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.05em">' + esc(label) + '</div>' +
      '<b style="font-size:18px">' + esc(value) + '</b></div>';
  }
  function bindingRows(latest) {
    var rows = latest && latest.bindingSets || [];
    if (!rows.length) return '<div class="muted" style="font-size:11px">Bindings: pendientes de ejecutar el dry-run documental.</div>';
    return '<div style="display:grid;gap:5px">' + rows.map(function (row) {
      var ready = row.status === 'ready_for_binding_review';
      var missing = [].concat(row.missingKnowledge || []).join(', ');
      return '<div style="display:flex;gap:7px;align-items:center;justify-content:space-between;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface)">' +
        '<span style="font-size:11px"><b>' + esc(row.insurerName || row.id) + '</b> · ' + esc(row.variant && (row.variant.tipoVehiculo || row.variant.plan || row.variant.producto) || 'variante') + '</span>' +
        '<span class="badge ' + (ready ? 'ok' : 'warn') + '" title="' + esc(missing) + '">' + esc(row.status) + '</span>' +
      '</div>';
    }).join('') + '</div>';
  }
  function historyHtml(model) {
    var history = model.history || {}, latest = history.latest || null;
    var resumable = [].concat(history.resumableDocumentIds || []);
    return '<div style="margin-top:9px;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:var(--surface)">' +
      '<div style="display:flex;gap:7px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap">' +
        '<div><b style="font-size:11.5px">Historial del lote</b><div class="muted" style="font-size:10.5px;margin-top:2px">Runs e ítems metadata-only, sin referencias backend.</div></div>' +
        '<span class="badge neutral">' + esc(latest && latest.status || 'sin historial persistido') + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px">' +
        metric('Runs', model.counts.batchRuns) + metric('Ítems históricos', model.counts.batchItems) + metric('Reanudables', resumable.length) +
      '</div>' +
      (resumable.length ? '<div class="muted" style="font-size:10.5px;margin-top:7px">Pendientes para reanudar: ' + esc(resumable.join(', ')) + '</div>' : '') +
    '</div>';
  }
  function adminHtml(model) {
    var admin = model.admin || {}, plan = admin.lastPlan || null, execution = admin.lastExecution || null;
    var refs = plan && plan.referenceContract || {};
    var documents = [].concat(plan && plan.documents || []);
    var ready = !!(plan && plan.ok);
    return '<div style="margin-top:9px;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:var(--surface)">' +
      '<div style="display:flex;gap:7px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap">' +
        '<div><b style="font-size:11.5px">Acción administrativa</b><div class="muted" style="font-size:10.5px;margin-top:2px">Preview y ejecución separados de la persistencia del historial.</div></div>' +
        '<span class="badge ' + (ready ? 'ok' : 'neutral') + '">' + esc(plan && plan.code || 'sin preview') + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px">' +
        metric('Documentos', documents.length) + metric('Refs disponibles', Number(refs.provided || 0)) + metric('Refs faltantes', [].concat(refs.missing || []).length) +
      '</div>' +
      (plan ? '<div class="muted" style="font-size:10.5px;margin-top:7px">Acción: ' + esc(plan.action) + ' · Confirmación requerida: ' + esc(plan.requiredConfirmation) + '</div>' : '') +
      (execution ? '<div class="muted" style="font-size:10.5px;margin-top:5px">Última ejecución: ' + esc(execution.code) + ' · Conocimiento persistido: no · Historial persistido: ' + esc(execution.historyPersisted === true ? 'sí' : 'no') + '</div>' : '') +
      '<div class="muted" style="font-size:10.5px;margin-top:7px">Solo lectura. Ejecutar requiere actor, motivo, fingerprint y confirmación reforzada; guardar historial exige una segunda confirmación administrativa.</div>' +
    '</div>';
  }
  function batchHtml(model) {
    var summary = model.batch && model.batch.batches && model.batch.batches[0];
    var latest = model.batch && model.batch.latest;
    if (!summary) return '<div style="margin-top:10px;padding:9px 10px;border-radius:9px;background:var(--surface);font-size:11.5px"><b>Lote inicial:</b> no cargado.</div>';
    var runSummary = latest && latest.summary || {};
    var incompleteBindings = latest ? Number(runSummary.bindingsIncomplete || 0) : Number(summary.bindingSets || 0);
    return '<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px">' +
      '<div style="display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:8px">' +
        '<div style="flex:1;min-width:220px"><b style="font-size:11.5px">Lote inicial A&S</b><div class="muted" style="font-size:11px">' +
          esc(summary.totalSources) + ' fuentes · ' + esc(summary.totalInsurers) + ' aseguradoras · ' + esc(summary.totalExcel) + ' Excel · ' + esc(summary.totalPdf) + ' PDF</div></div>' +
        '<span class="badge neutral">' + esc(latest && latest.status || 'sin ejecutar') + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px">' +
        metric('Dry-run listo', runSummary.dryRunReady || 0) +
        metric('Persistidas', runSummary.persisted || 0) +
        metric('Sin referencia', runSummary.waitingReference || 0) +
        metric('Fallidas', runSummary.failed || 0) +
        metric('Bindings listos', runSummary.bindingsReadyForReview || 0) +
        metric('Bindings incompletos', incompleteBindings) +
      '</div>' + bindingRows(latest) + historyHtml(model) + adminHtml(model) +
      '<div class="muted" style="font-size:10.5px;margin-top:7px">El panel es solo lectura. Ejecutar, reanudar o persistir requiere referencias backend, actor, motivo y confirmaciones administrativas.</div>' +
    '</div>';
  }
  function html(model) {
    var providerReady = model.provider && model.provider.ok === true;
    var snapshotReady = model.snapshots && model.snapshots.installed === true;
    var preflightReady = model.preflight && model.preflight.ok === true;
    var adminReady = !!Orbit.aseguradorasBatchAdminActionsP09i;
    var firstPlan = model.firstPlans[0] || null;
    return '<section id="' + PANEL_ID + '" style="margin:0 0 14px;border:1px solid var(--line);border-radius:12px;padding:13px;background:var(--card)">' +
      '<div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
        '<div style="flex:1;min-width:240px"><div style="font-size:12px;font-weight:800">Conocimiento documental de Aseguradoras</div>' +
        '<div class="muted" style="font-size:11.5px;margin-top:3px">Fuentes, manifiestos, reglas, presentaciones, bindings e historial separados por tenant. Registrar metadata no habilita Cotizador ni Comparativo.</div></div>' +
        '<button class="btn ghost" type="button" data-p09f-refresh>Actualizar estado</button>' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0">' +
        badge('Runtime ' + clean(model.bootstrap.status || 'pendiente'), model.bootstrap.status === 'ready', (model.bootstrap.errors || []).join(', ')) +
        badge('Provider ' + clean(model.provider.code || model.provider.status || 'pendiente'), providerReady, 'El backend debe confirmar capacidades reales') +
        badge('Snapshots ' + Number(model.snapshots.snapshotAttachedCount || 0) + '/' + Number((model.snapshots.collections || []).length), snapshotReady, 'Colecciones profundas') +
        badge('Preflight LAB', preflightReady, (model.preflight.errors || []).join(', ')) +
        badge('Acciones admin', adminReady, 'Preview, dry-run y persistencia separada del historial') +
      '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap">' +
        metric('Fuentes', model.counts.sources) + metric('Manifiestos', model.counts.manifests) + metric('Propuestas', model.counts.proposals) +
        metric('Reglas', model.counts.rules) + metric('Presentaciones', model.counts.presentations) + metric('Bindings', model.counts.bindings) + metric('Revisiones', model.counts.reviews) +
      '</div>' +
      '<div style="margin-top:10px;padding:9px 10px;border-radius:9px;background:var(--surface);font-size:11.5px">' +
        '<b>Primera fuente LAB:</b> ' + esc(firstPlan && firstPlan.source && firstPlan.source.nombre || 'Plan no cargado') + ' · ' +
        '<span class="muted">' + esc(firstPlan ? 'requiere referencia backend y validación humana' : 'pendiente') + '</span>' +
      '</div>' + batchHtml(model) +
    '</section>';
  }
  function mount() {
    if (!window.location || clean(window.location.hash).indexOf('#/aseguradoras') !== 0) return false;
    var host = document.querySelector('#host .page');
    if (!host) return false;
    var existing = document.getElementById(PANEL_ID);
    var markup = html(state());
    if (existing) existing.outerHTML = markup;
    else {
      var anchor = host.querySelector('.cfg-note') || host.firstElementChild;
      if (anchor && anchor.insertAdjacentHTML) anchor.insertAdjacentHTML('afterend', markup);
      else host.insertAdjacentHTML('afterbegin', markup);
    }
    var panel = document.getElementById(PANEL_ID);
    var refresh = panel && panel.querySelector('[data-p09f-refresh]');
    if (refresh) refresh.addEventListener('click', function () {
      var bootstrap = Orbit.aseguradorasRuntimeBootstrapP09f;
      var action = bootstrap && typeof bootstrap.retry === 'function' ? bootstrap.retry() : (bootstrap && typeof bootstrap.start === 'function' ? bootstrap.start() : null);
      Promise.resolve(action).then(schedule);
    });
    return true;
  }
  function schedule() {
    if (scheduled) clearTimeout(scheduled);
    scheduled = setTimeout(function retry(attempt) {
      if (mount() || attempt >= 20) return;
      scheduled = setTimeout(function () { retry(attempt + 1); }, 120);
    }.bind(null, 0), 0);
  }

  Orbit.aseguradorasKnowledgePanelP09f = { mount: mount, schedule: schedule, state: state };
  window.addEventListener('hashchange', schedule);
  window.addEventListener('orbit:aseguradoras:knowledge-ready', schedule);
  window.addEventListener('orbit:aseguradoras:lab-snapshot', schedule);
  window.addEventListener('orbit:aseguradoras:batch-state', schedule);
  window.addEventListener('orbit:aseguradoras:batch-item', schedule);
  window.addEventListener('orbit:aseguradoras:batch-admin-state', schedule);
  document.addEventListener('orbit:store', schedule);
  schedule();
})();