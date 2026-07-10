/* ============================================================
   Orbit 360 · P0.9f/P0.9g · Panel aditivo de conocimiento en Aseguradoras
   Fecha: 2026-07-10

   Muestra provider, snapshots, conocimiento y lote por tenant. No escribe
   store, no ejecuta lotes y no habilita Cotizador/Comparativo.
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
    return {
      tenantId: tenant, bootstrap: boot, preflight: preflight, provider: provider,
      snapshots: snapshots, firstPlans: firstPlans, batch: batchState(tenant),
      counts: {
        sources: sources,
        manifests: countTenant('aseguradora_manifiestos', tenant),
        proposals: countTenant('aseguradora_propuestas', tenant),
        rules: countTenant('aseguradora_reglas_tarifarias', tenant),
        presentations: countTenant('aseguradora_presentaciones', tenant),
        bindings: countTenant('aseguradora_bindings', tenant),
        reviews: countTenant('aseguradora_revisiones', tenant)
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
      '</div>' + bindingRows(latest) +
      '<div class="muted" style="font-size:10.5px;margin-top:7px">El panel es solo lectura. Ejecutar o persistir requiere referencias backend, actor, motivo y confirmaciones administrativas.</div>' +
    '</div>';
  }
  function html(model) {
    var providerReady = model.provider && model.provider.ok === true;
    var snapshotReady = model.snapshots && model.snapshots.installed === true;
    var preflightReady = model.preflight && model.preflight.ok === true;
    var firstPlan = model.firstPlans[0] || null;
    return '<section id="' + PANEL_ID + '" style="margin:0 0 14px;border:1px solid var(--line);border-radius:12px;padding:13px;background:var(--card)">' +
      '<div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
        '<div style="flex:1;min-width:240px"><div style="font-size:12px;font-weight:800">Conocimiento documental de Aseguradoras</div>' +
        '<div class="muted" style="font-size:11.5px;margin-top:3px">Fuentes, manifiestos, reglas, presentaciones y bindings separados por tenant. Registrar metadata no habilita Cotizador ni Comparativo.</div></div>' +
        '<button class="btn ghost" type="button" data-p09f-refresh>Actualizar estado</button>' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0">' +
        badge('Runtime ' + clean(model.bootstrap.status || 'pendiente'), model.bootstrap.status === 'ready', (model.bootstrap.errors || []).join(', ')) +
        badge('Provider ' + clean(model.provider.code || model.provider.status || 'pendiente'), providerReady, 'El backend debe confirmar capacidades reales') +
        badge('Snapshots ' + Number(model.snapshots.snapshotAttachedCount || 0) + '/' + Number((model.snapshots.collections || []).length), snapshotReady, 'Colecciones profundas') +
        badge('Preflight LAB', preflightReady, (model.preflight.errors || []).join(', ')) +
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
  document.addEventListener('orbit:store', schedule);
  schedule();
})();