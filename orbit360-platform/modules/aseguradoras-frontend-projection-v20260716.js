/* ============================================================
   Orbit 360 · Aseguradoras · proyección frontend inteligente
   Fecha: 2026-07-16

   Fix aditivo y reversible:
   - conserva el renderer canónico del prototipo;
   - agrega orden configurable con país preferido del tenant;
   - proyecta conocimiento persistido y resumen sanitizado ya mapeado;
   - no reextrae documentos ni habilita Cotizador/Comparativo;
   - no toca Orbit.store, Auth, reglas ni backend protegido.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  Orbit.modules = Orbit.modules || {};

  var VERSION = '20260716.2';
  var ORDER_KEY = 'orbit360_aseguradoras_order';
  var state = { order: readOrder(), patched: false, summaryLoading: false, summaryRetries: 0 };

  function loadProjectionStyle() {
    if (document.querySelector('link[data-asg-front-projection-style]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/aseguradoras-frontend-projection-v20260716.css?v=' + encodeURIComponent(VERSION);
    link.setAttribute('data-asg-front-projection-style', VERSION);
    document.head.appendChild(link);
  }

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function esc(value) {
    try { return Orbit.ui && Orbit.ui.esc ? Orbit.ui.esc(clean(value)) : clean(value); }
    catch (error) { return clean(value); }
  }
  function all(collection) {
    try { return Orbit.store && Orbit.store.all ? Orbit.store.all(collection) || [] : []; }
    catch (error) { return []; }
  }
  function tenantId() {
    var backend = window.OrbitBackend || window.ORBIT_BACKEND || {};
    var tenant = {};
    try { tenant = Orbit.tenant && Orbit.tenant.get ? Orbit.tenant.get() || {} : {}; } catch (error) {}
    return clean(backend.tenantId || backend.tenant || tenant.tenantId || tenant.id || tenant.slug);
  }
  function tenantInsurerConfig() {
    var id = tenantId();
    return [].concat(window.OrbitTenantInsurerConfigsP10 || []).find(function (item) { return clean(item && item.tenantId) === id; }) || {};
  }
  function preferredCountries() {
    var configured = [].concat(tenantInsurerConfig().preferredInsurerCountryOrder || []);
    return configured.length ? configured.map(function (item) { return clean(item).toUpperCase(); }) : ['GT', 'CO'];
  }
  function readOrder() {
    try { return localStorage.getItem(ORDER_KEY) || 'country'; }
    catch (error) { return 'country'; }
  }
  function saveOrder(value) {
    state.order = value || 'country';
    try { localStorage.setItem(ORDER_KEY, state.order); } catch (error) {}
  }
  function countryRank(country) {
    var value = clean(country).toUpperCase();
    var order = preferredCountries();
    var index = order.indexOf(value);
    return index >= 0 ? index : 99;
  }
  function recentValue(row) {
    var value = row && (row.updatedAt || row.conocimientoActualizadoAt || row.ultimaRevision || row.fuenteFecha || row.createdAt);
    var time = value ? Date.parse(value) : 0;
    return Number.isFinite(time) ? time : 0;
  }
  function compareRows(a, b) {
    if (state.order === 'name') return clean(a.nombre).localeCompare(clean(b.nombre), 'es');
    if (state.order === 'active') {
      var activeDiff = Number(b.vinculada !== false) - Number(a.vinculada !== false);
      return activeDiff || countryRank(a.pais) - countryRank(b.pais) || clean(a.nombre).localeCompare(clean(b.nombre), 'es');
    }
    if (state.order === 'recent') return recentValue(b) - recentValue(a) || clean(a.nombre).localeCompare(clean(b.nombre), 'es');
    return countryRank(a.pais) - countryRank(b.pais) || clean(a.nombre).localeCompare(clean(b.nombre), 'es');
  }

  function ensureOrderControl(host) {
    if (!host || host.querySelector('#asg-order-v20260716')) return;
    var search = host.querySelector('#asg-q');
    var filters = search && search.closest('.card');
    if (!filters) return;
    var wrap = document.createElement('label');
    wrap.className = 'asg-order-v20260716';
    wrap.innerHTML = '<span>Orden</span><select id="asg-order-v20260716" class="o-sel">' +
      '<option value="country">País preferido primero</option>' +
      '<option value="name">Nombre A–Z</option>' +
      '<option value="active">Activas primero</option>' +
      '<option value="recent">Actualización reciente</option>' +
      '</select>';
    filters.appendChild(wrap);
    var select = wrap.querySelector('select');
    select.value = state.order;
    select.addEventListener('change', function () { saveOrder(select.value); reorderCards(host); });
  }
  function reorderCards(host) {
    if (!host) return;
    var grid = host.querySelector('.asg-grid');
    if (!grid) return;
    var directory = {};
    all('aseguradoras').forEach(function (row) { if (row && row.id) directory[row.id] = row; });
    Array.prototype.slice.call(grid.querySelectorAll('[data-asg]'))
      .sort(function (left, right) { return compareRows(directory[left.dataset.asg] || {}, directory[right.dataset.asg] || {}); })
      .forEach(function (node) { grid.appendChild(node); });
  }
  function enhanceDirectory(host) {
    ensureOrderControl(host);
    reorderCards(host);
    if (host) host.classList.add('asg-frontend-v20260716');
  }

  function summaryRegistry() {
    var id = tenantId();
    return [].concat(window.OrbitTenantInsurerKnowledgeSummaries || []).find(function (item) { return clean(item && item.tenantId) === id; }) || null;
  }
  function configuredSummarySrc() { return clean(tenantInsurerConfig().knowledgeSummarySrc); }
  function loadMappedSummary() {
    if (summaryRegistry() || state.summaryLoading) return;
    var src = configuredSummarySrc();
    if (!src) {
      if (state.summaryRetries < 40) {
        state.summaryRetries += 1;
        setTimeout(loadMappedSummary, 150);
      }
      return;
    }
    if (document.querySelector('script[data-orbit-insurer-summary]')) return;
    state.summaryLoading = true;
    var script = document.createElement('script');
    script.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(VERSION);
    script.async = false;
    script.setAttribute('data-orbit-insurer-summary', tenantId() || 'tenant');
    script.onload = function () {
      state.summaryLoading = false;
      window.dispatchEvent(new CustomEvent('orbit:aseguradoras:mapped-summary-ready', { detail: { tenantId: tenantId(), version: VERSION } }));
    };
    script.onerror = function () { state.summaryLoading = false; };
    document.head.appendChild(script);
  }
  function insurerNames(row) {
    return [row && row.nombre, row && row.canonicalName, row && row.displayName].concat(row && row.aliases || []).map(norm).filter(Boolean);
  }
  function summaryFor(row) {
    var registry = summaryRegistry();
    if (!registry) return null;
    var names = insurerNames(row);
    return [].concat(registry.insurers || []).find(function (item) {
      return [item && item.insurerName].concat(item && item.aliases || []).map(norm).filter(Boolean).some(function (name) { return names.indexOf(name) >= 0; });
    }) || null;
  }
  function mappedSummaryRows(row) {
    var summary = summaryFor(row);
    return [].concat(summary && summary.sources || []).map(function (item) {
      return Object.assign({}, item, {
        mappedSummary: true,
        estado: clean(item.estado) || 'mapeado_pendiente_sincronizacion',
        documentId: clean(item.documentId || item.id)
      });
    });
  }

  function sourceCatalog(row) {
    try {
      var api = Orbit.aseguradorasKnowledgeCatalog;
      return api && api.sourcesFor ? api.sourcesFor(row) || [] : [];
    } catch (error) { return []; }
  }
  function bindingCatalog(row) {
    try {
      var api = Orbit.aseguradorasKnowledgeCatalog;
      return api && api.bindingSetsFor ? api.bindingSetsFor(row) || [] : [];
    } catch (error) { return []; }
  }
  function itemIdentity(item) {
    return clean(item && (item.documentId || item.sourceDocumentId || item.id || item.nombre || item.fileName || item.archivo)).toLowerCase();
  }
  function mergeRows(groups) {
    var map = {}, order = [];
    [].concat.apply([], groups || []).forEach(function (item) {
      if (!item) return;
      var key = itemIdentity(item) || ('row_' + order.length);
      if (!map[key]) { map[key] = {}; order.push(key); }
      map[key] = Object.assign({}, map[key], item);
    });
    return order.map(function (key) { return map[key]; });
  }
  function catalogSourceRows(row) {
    return sourceCatalog(row).map(function (item) {
      var source = item && item.source || {};
      return Object.assign({}, source, {
        estado: source.estado || 'mapeado_pendiente_proyeccion',
        usos: [].concat(source.usos || []),
        documentId: source.documentId || source.id
      });
    });
  }
  function catalogBindingRows(row) {
    return bindingCatalog(row).map(function (item) { return Object.assign({}, item, { estado: item.estado || 'requiere_validacion' }); });
  }
  function upgradeSourceStates(sources, mapped) {
    var mappedById = {};
    mapped.forEach(function (item) { mappedById[itemIdentity(item)] = item; });
    return sources.map(function (item) {
      var evidence = mappedById[itemIdentity(item)];
      if (!evidence) return item;
      var current = norm(item.estado || item.status).replace(/ /g, '_');
      var next = current === 'lectura_pendiente' || current === 'documento_recibido' || !current ? evidence.estado : item.estado;
      return Object.assign({}, item, evidence, { estado: next || evidence.estado, mappedSummary: true });
    });
  }
  function readKnowledge(row) {
    var service = Orbit.services && Orbit.services.aseguradorasKnowledgeP09;
    var model = null;
    if (service && typeof service.read === 'function') {
      try {
        var result = service.read({ tenantId: tenantId(), aseguradoraId: row.id });
        if (result && result.ok) model = result;
      } catch (error) {}
    }
    model = Object.assign({
      ok: true, tenantId: tenantId(), aseguradoraId: row.id, insurer: row,
      sources: [], manifests: [], proposals: [], tariffRules: [], presentations: [], bindings: [], reviews: [], summary: {}
    }, model || {});

    var mapped = mappedSummaryRows(row);
    var sources = mergeRows([].concat(row.docs || [], model.sources || [], catalogSourceRows(row), mapped));
    sources = upgradeSourceStates(sources, mapped);
    var bindings = mergeRows([model.bindings || [], catalogBindingRows(row)]);
    model.sources = sources;
    model.bindings = bindings;
    model.mappedSummaries = mapped;
    model.summary = Object.assign({}, model.summary || {}, {
      sources: sources.length,
      manifests: [].concat(model.manifests || []).length,
      proposals: [].concat(model.proposals || []).length,
      tariffRules: [].concat(model.tariffRules || []).length,
      presentations: [].concat(model.presentations || []).length,
      bindings: bindings.length,
      mappedStructuralSources: mapped.length,
      pendingValidation: [].concat(model.manifests || [], model.proposals || [], model.tariffRules || [], model.presentations || [], bindings, sources)
        .filter(function (item) { return /pend|valid|review|lectura|incomplet|error|conflict/i.test(clean(item && (item.estado || item.status))); }).length
    });
    model.projectionFallback = mapped.length > 0 && !model.summary.tariffRules && !model.summary.presentations;
    return model;
  }

  function statusLabel(value) {
    var key = norm(value).replace(/ /g, '_');
    var labels = {
      requiere_validacion: 'Requiere validación', requires_validation: 'Requiere validación',
      lectura_pendiente: 'Lectura pendiente', mapeado_pendiente_proyeccion: 'Mapeado · pendiente de proyección',
      mapeado_pendiente_sincronizacion: 'Mapeado · pendiente de sincronización',
      mapeado_requiere_validacion: 'Mapeado · requiere validación',
      metadata_persisted_pending_validation: 'Mapeado · pendiente de validación',
      ready_for_binding_review: 'Listo para revisión de relación', habilitado: 'Habilitado', enabled: 'Habilitado'
    };
    return labels[key] || clean(value).replace(/_/g, ' ') || 'Pendiente';
  }
  function tone(value, enabled) {
    if (enabled) return 'ok';
    var key = norm(value);
    if (/bloque|error|conflict|incomplet/.test(key)) return 'danger';
    if (/valid|pend|review|lectura|mapeado/.test(key)) return 'warn';
    return 'neutral';
  }
  function dimensionText(item) {
    item = item || {};
    var dims = item.dimensiones || item.variant || {};
    return [item.pais || dims.pais, item.moneda || dims.moneda, item.ramo || dims.ramo, item.producto || dims.producto,
      item.tipoVehiculo || dims.tipoVehiculo, item.usoVehiculo || dims.usoVehiculo, item.plan || dims.plan]
      .map(clean).filter(Boolean).join(' · ') || 'Dimensiones pendientes de completar';
  }
  function sourceName(item) {
    return clean(item && (item.nombre || item.fileName || item.archivo || item.documentId || item.id)) || 'Fuente documental';
  }
  function itemTitle(item, fallback) {
    return clean(item && (item.nombre || item.titulo || item.producto || item.ramo || item.ruleName || item.profileName || item.id)) || fallback;
  }
  function itemDetail(item) {
    item = item || {};
    var candidates = [item.descripcion, item.description, item.formula, item.regla, item.condicion, item.summary, item.detalle, item.notes];
    var text = candidates.map(clean).find(Boolean);
    if (text) return text.slice(0, 320);
    var counts = item.counts || {};
    var parts = [];
    Object.keys(counts).slice(0, 5).forEach(function (key) { parts.push(key.replace(/_/g, ' ') + ': ' + counts[key]); });
    return parts.join(' · ');
  }
  function metric(label, value) { return '<div class="asg-km"><small>' + esc(label) + '</small><b>' + esc(value) + '</b></div>'; }
  function rowsHtml(items, kind, emptyText) {
    items = [].concat(items || []);
    if (!items.length) return '<div class="asg-k-empty">' + esc(emptyText) + '</div>';
    return '<div class="asg-k-list">' + items.map(function (item) {
      var enabled = item && (item.enabled === true || item.enabledCotizador === true || item.enabledComparativo === true || item.enabledCotizadorAutomatico === true);
      var status = clean(item && (item.estado || item.status)) || 'requiere_validacion';
      var detail = itemDetail(item);
      return '<article class="asg-k-row"><div><b>' + esc(kind === 'source' ? sourceName(item) : itemTitle(item, kind)) + '</b>' +
        '<small>' + esc(dimensionText(item)) + '</small>' + (detail ? '<p>' + esc(detail) + '</p>' : '') +
        (item && (item.version || item.versionFuente) ? '<small>Versión: ' + esc(item.version || item.versionFuente) + '</small>' : '') +
        '</div><span class="badge ' + tone(status, enabled) + '">' + esc(statusLabel(status)) + '</span></article>';
    }).join('') + '</div>';
  }
  function mappedRowsHtml(items) {
    items = [].concat(items || []);
    if (!items.length) return '<div class="asg-k-empty">No hay un resumen sanitizado de mapeo para esta aseguradora.</div>';
    return '<div class="asg-k-list">' + items.map(function (item) {
      var clusters = item.clusters || {};
      var clusterText = Object.keys(clusters).map(function (key) { return key.replace(/_/g, ' ') + ': ' + clusters[key]; }).join(' · ');
      var counts = [
        item.facts != null ? 'Hechos: ' + item.facts : '',
        item.numericFacts != null ? 'Numéricos: ' + item.numericFacts : '',
        item.candidateTables != null ? 'Tablas candidatas: ' + item.candidateTables : '',
        item.outputRoutes != null ? 'Rutas de salida: ' + item.outputRoutes : ''
      ].filter(Boolean).join(' · ');
      var warnings = [].concat(item.warnings || []);
      return '<article class="asg-k-row"><div><b>' + esc(sourceName(item)) + '</b><small>' + esc(dimensionText(item)) + '</small>' +
        (counts ? '<p>' + esc(counts) + '</p>' : '') + (clusterText ? '<p>' + esc(clusterText) + '</p>' : '') +
        (item.notes ? '<p>' + esc(item.notes) + '</p>' : '') +
        (warnings.length ? '<small>Alertas: ' + esc(warnings.join(' · ')) + '</small>' : '') +
        '</div><span class="badge ' + tone(item.estado, false) + '">' + esc(statusLabel(item.estado)) + '</span></article>';
    }).join('') + '</div>';
  }
  function knowledgeHtml(row, model) {
    var summary = model.summary || {};
    var sources = [].concat(model.sources || []);
    var rules = [].concat(model.tariffRules || []);
    var presentations = [].concat(model.presentations || []);
    var bindings = [].concat(model.bindings || []);
    var proposals = [].concat(model.proposals || []);
    var mapped = [].concat(model.mappedSummaries || []);
    var mappedButNotProjected = model.projectionFallback === true;
    return '<section id="asg-knowledge-projection-v20260716" class="asg-k-projection">' +
      '<header><div><small>Conocimiento de la aseguradora</small><h3>Tarifas, reglas y formatos vinculados</h3>' +
      '<p>Proyección del conocimiento ya mapeado para Cotizador y Comparativo. Esta vista no reprocesa archivos ni habilita cálculos por sí sola.</p></div>' +
      '<span class="badge ' + (mappedButNotProjected ? 'warn' : 'ok') + '">' +
      (mappedButNotProjected ? 'Mapeo localizado · sincronización operativa pendiente' : 'Conocimiento proyectado') + '</span></header>' +
      '<div class="asg-k-metrics">' + metric('Fuentes', summary.sources != null ? summary.sources : sources.length) +
      metric('Mapeos estructurales', summary.mappedStructuralSources != null ? summary.mappedStructuralSources : mapped.length) +
      metric('Reglas tarifarias', summary.tariffRules != null ? summary.tariffRules : rules.length) +
      metric('Formatos / presentación', summary.presentations != null ? summary.presentations : presentations.length) +
      metric('Relaciones', summary.bindings != null ? summary.bindings : bindings.length) +
      metric('Pendientes de validación', summary.pendingValidation != null ? summary.pendingValidation : 0) + '</div>' +
      (mappedButNotProjected ? '<div class="cfg-note asg-k-warning"><b>No se pierde ni se repite el mapeo:</b> existen resultados sanitizados asociados con ' + esc(row.nombre) + ', pero las reglas y presentaciones operativas todavía no están sincronizadas en las colecciones de la ficha. El siguiente paso es sincronizar y validar, no volver a mapear.</div>' : '') +
      '<details open><summary>Resumen sanitizado del mapeo ejecutado (' + mapped.length + ')</summary>' + mappedRowsHtml(mapped) + '</details>' +
      '<details open><summary>Archivos y fuentes (' + sources.length + ')</summary>' + rowsHtml(sources, 'source', 'No hay fuentes vinculadas a esta aseguradora.') + '</details>' +
      '<details open><summary>Reglas tarifarias y de cálculo persistidas (' + rules.length + ')</summary>' + rowsHtml(rules, 'Regla tarifaria', 'Las reglas operativas aún no están sincronizadas en esta colección.') + '</details>' +
      '<details><summary>Mapeos y propuestas persistidos (' + proposals.length + ')</summary>' + rowsHtml(proposals, 'Mapeo', 'Sin propuestas persistidas visibles para esta aseguradora.') + '</details>' +
      '<details open><summary>Presentación y lectura para Comparativo persistida (' + presentations.length + ')</summary>' + rowsHtml(presentations, 'Formato de cotización', 'Los formatos operativos aún no están sincronizados en esta colección.') + '</details>' +
      '<details open><summary>Relaciones documento → producto → Cotizador/Comparativo (' + bindings.length + ')</summary>' + rowsHtml(bindings, 'Relación', 'No hay relaciones visibles para esta aseguradora.') + '</details>' +
      '</section>';
  }
  function renderKnowledge(root, row) {
    if (!root || !row) return;
    var body = root.querySelector('#af-body');
    var active = root.querySelector('[data-tab="tarifas"].active');
    if (!body || !active) return;
    var previous = body.querySelector('#asg-knowledge-projection-v20260716');
    if (previous) previous.remove();
    body.insertAdjacentHTML('afterbegin', knowledgeHtml(row, readKnowledge(row)));
  }
  function enhanceFicha() {
    var root = document.getElementById('asg-ficha');
    if (!root) return;
    root.classList.add('asg-ficha-v20260716');
    root.dataset.mode = root.querySelector('#af-guardar') ? 'edit' : 'read';
    var row = Orbit.store && Orbit.store.get ? Orbit.store.get('aseguradoras', root.dataset.id) : null;
    if (!row) return;
    renderKnowledge(root, row);
    root.querySelectorAll('[data-tab]').forEach(function (button) {
      if (button.dataset.frontProjectionV20260716) return;
      button.dataset.frontProjectionV20260716 = '1';
      button.addEventListener('click', function () { setTimeout(enhanceFicha, 0); });
    });
  }

  function patch() {
    var mod = Orbit.modules.aseguradoras;
    if (!mod || !mod.render || state.patched) return false;
    state.patched = true;
    var originalRender = mod.render.bind(mod);
    var originalFicha = mod.ficha && mod.ficha.bind(mod);
    mod.render = function (host) {
      var out = originalRender(host);
      setTimeout(function () { enhanceDirectory(host); enhanceFicha(); }, 0);
      return out;
    };
    if (originalFicha) {
      mod.ficha = function () {
        var out = originalFicha.apply(null, arguments);
        setTimeout(enhanceFicha, 0);
        return out;
      };
    }
    document.addEventListener('orbit:store', function () { setTimeout(function () { enhanceDirectory(document.getElementById('host')); enhanceFicha(); }, 0); });
    window.addEventListener('orbit:aseguradoras:knowledge-ready', function () { setTimeout(enhanceFicha, 0); });
    window.addEventListener('orbit:aseguradoras:lab-snapshot', function () { setTimeout(enhanceFicha, 0); });
    window.addEventListener('orbit:aseguradoras:mapped-summary-ready', function () { setTimeout(enhanceFicha, 0); });
    enhanceDirectory(document.getElementById('host'));
    enhanceFicha();
    mod.__frontendProjectionV20260716 = { version: VERSION, canonicalRendererPreserved: true, writesKnowledge: false, enablesCotizador: false, enablesComparativo: false };
    return true;
  }
  function schedule(attempt) {
    loadProjectionStyle();
    loadMappedSummary();
    if (patch()) return;
    if ((attempt || 0) >= 40) return;
    setTimeout(function () { schedule((attempt || 0) + 1); }, 120);
  }

  Orbit.aseguradorasFrontendProjectionV20260716 = {
    version: VERSION,
    compareRows: compareRows,
    readKnowledge: readKnowledge,
    summaryFor: summaryFor,
    loadMappedSummary: loadMappedSummary,
    status: function () { return { version: VERSION, tenantId: tenantId(), order: state.order, patched: state.patched, summaryLoaded: !!summaryRegistry() }; }
  };
  schedule(0);
})();
