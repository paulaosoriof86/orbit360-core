/* ============================================================
   Orbit 360 · Aseguradoras · proyección frontend inteligente
   Fecha: 2026-07-16

   Fix aditivo y reversible:
   - conserva el renderer canónico del prototipo;
   - agrega orden configurable con Guatemala primero;
   - proyecta en la ficha el conocimiento ya persistido/mapeado;
   - no reextrae documentos, no habilita Cotizador/Comparativo;
   - no toca Orbit.store, Auth, reglas ni backend protegido.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  Orbit.modules = Orbit.modules || {};

  var VERSION = '20260716.1';
  var ORDER_KEY = 'orbit360_aseguradoras_order';
  var state = { order: readOrder(), patched: false };

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
    return clean(backend.tenantId || backend.tenant || tenant.tenantId || tenant.id || tenant.slug || 'alianzas-soluciones');
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
    if (value === 'GT') return 0;
    if (value === 'CO') return 1;
    return 9;
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
      '<option value="country">Guatemala primero</option>' +
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
  function readKnowledge(row) {
    var service = Orbit.services && Orbit.services.aseguradorasKnowledgeP09;
    if (service && typeof service.read === 'function') {
      try {
        var model = service.read({ tenantId: tenantId(), aseguradoraId: row.id });
        if (model && model.ok) return model;
      } catch (error) {}
    }
    var catalogSources = sourceCatalog(row).map(function (item) {
      var source = item && item.source || {};
      return Object.assign({}, source, {
        estado: source.estado || 'mapeado_pendiente_proyeccion',
        usos: [].concat(source.usos || []),
        documentId: source.documentId || source.id
      });
    });
    var catalogBindings = bindingCatalog(row).map(function (item) {
      return Object.assign({}, item, { estado: item.estado || 'requiere_validacion' });
    });
    return {
      ok: true,
      tenantId: tenantId(),
      aseguradoraId: row.id,
      insurer: row,
      sources: [].concat(row.docs || [], catalogSources),
      manifests: [], proposals: [], tariffRules: [], presentations: [], bindings: catalogBindings, reviews: [],
      summary: {
        sources: [].concat(row.docs || [], catalogSources).length,
        manifests: 0, proposals: 0, tariffRules: 0, presentations: 0,
        bindings: catalogBindings.length, pendingValidation: catalogSources.length + catalogBindings.length,
        enabledCotizador: 0, enabledComparativo: 0
      },
      projectionFallback: true
    };
  }
  function statusLabel(value) {
    var key = norm(value).replace(/ /g, '_');
    var labels = {
      requiere_validacion: 'Requiere validación', requires_validation: 'Requiere validación',
      lectura_pendiente: 'Lectura pendiente', mapeado_pendiente_proyeccion: 'Mapeado · pendiente de sincronización',
      metadata_persisted_pending_validation: 'Mapeado · pendiente de validación',
      ready_for_binding_review: 'Listo para revisión de relación', habilitado: 'Habilitado', enabled: 'Habilitado'
    };
    return labels[key] || clean(value).replace(/_/g, ' ') || 'Pendiente';
  }
  function tone(value, enabled) {
    if (enabled) return 'ok';
    var key = norm(value);
    if (/bloque|error|conflict|incomplet/.test(key)) return 'danger';
    if (/valid|pend|review|lectura/.test(key)) return 'warn';
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
    var candidates = [item.descripcion, item.description, item.formula, item.regla, item.condicion, item.summary, item.detalle];
    var text = candidates.map(clean).find(Boolean);
    if (text) return text.slice(0, 240);
    var counts = item.counts || {};
    var parts = [];
    Object.keys(counts).slice(0, 5).forEach(function (key) { parts.push(key.replace(/_/g, ' ') + ': ' + counts[key]); });
    return parts.join(' · ');
  }
  function metric(label, value) {
    return '<div class="asg-km"><small>' + esc(label) + '</small><b>' + esc(value) + '</b></div>';
  }
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
  function knowledgeHtml(row, model) {
    var summary = model.summary || {};
    var sources = [].concat(model.sources || []);
    var rules = [].concat(model.tariffRules || []);
    var presentations = [].concat(model.presentations || []);
    var bindings = [].concat(model.bindings || []);
    var proposals = [].concat(model.proposals || []);
    var mappedButNotProjected = model.projectionFallback || (sources.length && !rules.length && !presentations.length);
    return '<section id="asg-knowledge-projection-v20260716" class="asg-k-projection">' +
      '<header><div><small>Conocimiento de la aseguradora</small><h3>Tarifas, reglas y formatos vinculados</h3>' +
      '<p>Proyección de lo ya mapeado para Cotizador y Comparativo. Esta vista no vuelve a procesar archivos ni habilita cálculos por sí sola.</p></div>' +
      '<span class="badge ' + (mappedButNotProjected ? 'warn' : 'ok') + '">' +
      (mappedButNotProjected ? 'Mapeo localizado · sincronización pendiente' : 'Conocimiento proyectado') + '</span></header>' +
      '<div class="asg-k-metrics">' + metric('Fuentes', summary.sources != null ? summary.sources : sources.length) +
      metric('Reglas tarifarias', summary.tariffRules != null ? summary.tariffRules : rules.length) +
      metric('Formatos / presentación', summary.presentations != null ? summary.presentations : presentations.length) +
      metric('Relaciones', summary.bindings != null ? summary.bindings : bindings.length) +
      metric('Pendientes de validación', summary.pendingValidation != null ? summary.pendingValidation : 0) + '</div>' +
      (mappedButNotProjected ? '<div class="cfg-note asg-k-warning"><b>No se pierde ni se repite el mapeo:</b> las fuentes están relacionadas con ' + esc(row.nombre) + ', pero las colecciones de reglas/presentaciones todavía no están expuestas completamente a esta ficha. El siguiente paso es sincronizar la proyección, no volver a mapear.</div>' : '') +
      '<details open><summary>Archivos y fuentes (' + sources.length + ')</summary>' + rowsHtml(sources, 'source', 'No hay fuentes vinculadas a esta aseguradora.') + '</details>' +
      '<details open><summary>Reglas tarifarias y de cálculo (' + rules.length + ')</summary>' + rowsHtml(rules, 'Regla tarifaria', 'Las reglas no están proyectadas en esta colección para la ficha actual.') + '</details>' +
      '<details><summary>Mapeos y propuestas (' + proposals.length + ')</summary>' + rowsHtml(proposals, 'Mapeo', 'Sin propuestas visibles para esta aseguradora.') + '</details>' +
      '<details open><summary>Presentación y lectura para Comparativo (' + presentations.length + ')</summary>' + rowsHtml(presentations, 'Formato de cotización', 'Los formatos y reglas de lectura no están proyectados en esta colección para la ficha actual.') + '</details>' +
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
    enhanceDirectory(document.getElementById('host'));
    enhanceFicha();
    mod.__frontendProjectionV20260716 = { version: VERSION, canonicalRendererPreserved: true, writesKnowledge: false, enablesCotizador: false, enablesComparativo: false };
    return true;
  }
  function schedule(attempt) {
    if (patch()) return;
    if ((attempt || 0) >= 30) return;
    setTimeout(function () { schedule((attempt || 0) + 1); }, 120);
  }

  schedule(0);
})();
