/* ============================================================
   Orbit 360 · Orbit Aseguradoras (directorio operativo) — editable
   Directorio GT/CO buscable y filtrable; ficha por pestañas con
   DRAFT real: editar → revisar → motivo → Guardar/Cancelar (cancelar
   nunca escribe al store). Rol activo vía Orbit.session.rol().
   Catálogo de documentos y conocimiento por aseguradora (_fuentes)
   con dimensiones extendidas y capacidades por documento (tarifas/
   reglas/presentación/comparativo/condiciones/casos de prueba). Gate
   Cotizador/Comparativo default-deny: un ramo solo se ofrece si fue
   HABILITADO explícitamente.
   Seguridad: nunca contraseñas reales — credentialRef:'backend_required'
   + estado honesto. Logo nunca se persiste como Data URL nueva.
   Borrado: normal = desactivar con motivo; borrado físico solo si
   cero vínculos y deja auditoría externa antes de eliminar.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.aseguradoras = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  let host, q = '', fPais = 'TODOS', fRamo = '', fEstado = 'TODAS', orderMode = 'country', knowledgeSummaryLoading = false;
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) { return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function tenantId() {
    try {
      const backend = window.OrbitBackend || window.ORBIT_BACKEND || {};
      const tenant = Orbit.tenant && Orbit.tenant.get ? (Orbit.tenant.get() || {}) : {};
      return clean(backend.tenantId || backend.tenant || tenant.tenantId || tenant.id || tenant.slug);
    } catch (e) { return ''; }
  }
  function tenantInsurerConfig() {
    const id = tenantId();
    return [].concat(window.OrbitTenantInsurerConfigsP10 || []).find(item => clean(item && item.tenantId) === id) || {};
  }
  function preferredCountries() {
    const configured = [].concat(tenantInsurerConfig().preferredInsurerCountryOrder || []).map(item => clean(item).toUpperCase()).filter(Boolean);
    if (configured.length) return configured;
    return [].concat(Orbit.PAISES || []).map(item => clean(item && item.id).toUpperCase()).filter(id => id && id !== 'TODOS');
  }
  function saveOrder(value) { orderMode = value || 'country'; }
  function countryRank(country) { const idx = preferredCountries().indexOf(clean(country).toUpperCase()); return idx >= 0 ? idx : 999; }
  function recentValue(row) { const value = row && (row.updatedAt || row.conocimientoActualizadoAt || row.ultimaRevision || row.fuenteFecha || row.createdAt); const time = value ? Date.parse(value) : 0; return Number.isFinite(time) ? time : 0; }
  function compareInsurers(a, b) {
    if (orderMode === 'name') return clean(a.nombre).localeCompare(clean(b.nombre), 'es');
    if (orderMode === 'active') return Number(b.vinculada !== false) - Number(a.vinculada !== false) || countryRank(a.pais) - countryRank(b.pais) || clean(a.nombre).localeCompare(clean(b.nombre), 'es');
    if (orderMode === 'recent') return recentValue(b) - recentValue(a) || clean(a.nombre).localeCompare(clean(b.nombre), 'es');
    return countryRank(a.pais) - countryRank(b.pais) || clean(a.nombre).localeCompare(clean(b.nombre), 'es');
  }
  function paisOK(p) { return !Orbit.pais || Orbit.pais === 'TODOS' || p === Orbit.pais; }
  function up(id, patch) { return S().update('aseguradoras', id, patch); }
  function reload() { if (host) render(host); }
  function roleKey(value) { return norm(value).replace(/\s+/g, ''); }
  function isFirestoreLabStore() {
    try { const raw = S().raw && S().raw(); return !!(raw && raw.__backend && raw.__backend.mode === 'firestore-lab'); } catch (e) { return false; }
  }
  function waitBackendWrite(collection, id, op, timeoutMs) {
    if (!isFirestoreLabStore()) return Promise.resolve({ ok: true, local: true });
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (error, detail) => {
        if (done) return; done = true;
        clearTimeout(timer);
        window.removeEventListener('orbit:backend:write-ok', onOk);
        window.removeEventListener('orbit:backend:write-error', onError);
        error ? reject(error) : resolve(detail || { ok: true });
      };
      const matches = event => event && event.detail && event.detail.collection === collection && event.detail.id === id && event.detail.op === op;
      const onOk = event => { if (matches(event)) finish(null, event.detail); };
      const onError = event => { if (matches(event)) finish(new Error(event.detail.error || 'WRITE_REJECTED')); };
      const timer = setTimeout(() => finish(new Error('WRITE_ACK_TIMEOUT')), timeoutMs || 20000);
      window.addEventListener('orbit:backend:write-ok', onOk);
      window.addEventListener('orbit:backend:write-error', onError);
    });
  }
  const ACCESO_ESTADOS = ['Sin verificar', 'Acceso disponible', 'Requiere actualización', 'Sin acceso registrado'];
  const ACCESO_TONE = { 'Sin verificar': 'warn', 'Acceso disponible': 'ok', 'Requiere actualización': 'danger', 'Sin acceso registrado': 'neutral' };

  /* ---- Rol ACTIVO (no el rol base de Auth): usa Orbit.session.rol() si existe ---- */
  function activeRole() {
    try { if (Orbit.session && Orbit.session.rol) return Orbit.session.rol(); } catch (e) {}
    try { if (Orbit.auth && Orbit.auth.user && Orbit.auth.user()) return Orbit.auth.user().rol || 'Asesor'; } catch (e) {}
    return 'Asesor';
  }
  function actorNombre() { const u = (Orbit.auth && Orbit.auth.user && Orbit.auth.user()) || {}; return u.nombre || 'usuario'; }
  /* Extras/restricciones granulares por asesor (además del rol activo): un asesor puede
     tener 'aseguradoras_editar' en permisosExtra (extra) o en restricciones (revoca aunque
     el rol activo lo permitiría). No requiere tocar core/config.js — vive en el registro
     del asesor vinculado a la sesión activa. */
  function asesorActivo() {
    try { const asesorId = Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId(); return asesorId ? (S().get('asesores', asesorId) || {}) : {}; } catch (e) { return {}; }
  }
  function canEdit() {
    const a = asesorActivo();
    if ((a.restricciones || []).indexOf('aseguradoras_editar') >= 0) return false;
    if ((a.permisosExtra || []).indexOf('aseguradoras_editar') >= 0) return true;
    try { if (Orbit.access && Orbit.access.can && Orbit.access.can('aseguradoras', 'edit') === true) return true; } catch (e) {}
    return ['direccion', 'admin', 'superadmin', 'superadministrador', 'operativo'].indexOf(roleKey(activeRole())) >= 0;
  }
  function canManageCredentials() { return canEdit(); }
  function log(a, entrada) {
    const hist = (a.actividad || []).slice();
    hist.unshift(Object.assign({ fecha: new Date().toISOString(), responsable: actorNombre() + ' · ' + activeRole() }, entrada));
    return hist.slice(0, 60);
  }
  /* auditoría EXTERNA (sobrevive aunque se borre la entidad) */
  function auditExterna(entrada) {
    try { S().insert('auditoriaAsegExterna', Object.assign({ id: 'audasg' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fecha: new Date().toISOString(), responsable: actorNombre() + ' · ' + activeRole() }, entrada)); } catch (e) {}
  }

  /* ===================== MOTOR DE FUENTES/CONOCIMIENTO (Tarifas) ===================== */
  const SOURCE_TYPES = ['tarifario', 'cotizacion_ejemplo', 'poliza_ejemplo', 'formulario', 'manual', 'circular'];
  const SOURCE_STATES = ['Documento recibido', 'Mapeado', 'Persistido', 'Requiere validación', 'Validado', 'Conocimiento incompleto', 'Listo para habilitar', 'Habilitado para Cotizador', 'Habilitado para Comparativo'];
  // dimensiones extendidas — no todas se capturan en la UI de docs aún (país/moneda/ramo sí);
  // el resto queda disponible en el contrato para consumidores/importadores futuros.
  const DIMENSION_KEYS = ['pais', 'moneda', 'ramo', 'producto', 'familiaProducto', 'subtipoProducto', 'segmento', 'tipoRiesgo', 'tipoVehiculo', 'usoVehiculo', 'plan'];
  const CAT_TO_TYPE = { 'Cotización ejemplo': 'cotizacion_ejemplo', 'Póliza ejemplo': 'poliza_ejemplo', 'Formulario': 'formulario', 'Clausulado': 'formulario', 'Condiciones': 'formulario', 'Manual': 'manual', 'Circular': 'circular' };
  function legacyType(cat) { return CAT_TO_TYPE[cat] || 'tarifario'; }
  function normalizarFuente(d, a) {
    return Object.assign({
      id: d.id, // estable: se asigna en alta, NUNCA en render (ver addDoc)
      nombre: d.nombre || 'Documento', cat: d.cat || 'Formulario', tipo: d.tipo || legacyType(d.cat),
      pais: d.pais || a.pais, moneda: d.moneda || (a.pais === 'GT' ? 'GTQ' : 'COP'),
      ramo: d.ramo || '', producto: d.producto || '', familiaProducto: d.familiaProducto || '', subtipoProducto: d.subtipoProducto || '',
      segmento: d.segmento || '', tipoRiesgo: d.tipoRiesgo || '', tipoVehiculo: d.tipoVehiculo || '', usoVehiculo: d.usoVehiculo || '', plan: d.plan || '',
      estado: d.estado || 'Documento recibido', version: d.version || 1, vigencia: d.vigencia || ''
    }, {});
  }
  function sourceDimensions(d) { const o = {}; DIMENSION_KEYS.forEach(k => { if (d[k]) o[k] = d[k]; }); return o; }
  function sourceCombinationKey(d) { return DIMENSION_KEYS.map(k => d[k] || '—').join(' · '); }
  function groupLabel(key) { return key; }
  function sourceIdentity(item) { return clean(item && (item.documentId || item.sourceDocumentId || item.id || item.nombre || item.fileName || item.archivo)).toLowerCase(); }
  function visibleState(value) {
    const key = norm(value).replace(/ /g, '_');
    if (/habilitado.*cotizador/.test(key)) return 'Habilitado para Cotizador';
    if (/habilitado.*comparativo/.test(key)) return 'Habilitado para Comparativo';
    if (/requiere.*valid|requires.*valid/.test(key)) return 'Requiere validación';
    if (/validado|validated/.test(key)) return 'Validado';
    if (/persist|metadata_persisted/.test(key)) return 'Persistido';
    if (/mapeado|mapped|lectura_preparada|propuesta_lista/.test(key)) return 'Mapeado';
    if (/incomplet|conflict|error/.test(key)) return 'Conocimiento incompleto';
    return clean(value) || 'Documento recibido';
  }
  function tenantKnowledgeSummary() {
    const id = tenantId();
    return [].concat(window.OrbitTenantInsurerKnowledgeSummaries || []).find(item => clean(item && item.tenantId) === id) || null;
  }
  function insurerNames(row) { return [row && row.nombre, row && row.canonicalName, row && row.displayName].concat(row && row.aliases || []).map(norm).filter(Boolean); }
  function mappedSummaryFor(row) {
    const registry = tenantKnowledgeSummary();
    if (!registry) return null;
    const names = insurerNames(row);
    return [].concat(registry.insurers || []).find(item => [item && item.insurerName].concat(item && item.aliases || []).map(norm).filter(Boolean).some(name => names.indexOf(name) >= 0)) || null;
  }
  function mappedSummaryRows(row) {
    const summary = mappedSummaryFor(row);
    return [].concat(summary && summary.sources || []).map(item => Object.assign({}, item, {
      id: clean(item.id || item.documentId || item.sourceDocumentId),
      nombre: clean(item.nombre || item.fileName || item.archivo || item.documentId) || 'Fuente mapeada',
      estado: visibleState(item.estado || item.status || 'Mapeado'),
      sourceOrigin: 'Mapeado'
    }));
  }
  function persistedKnowledgeRows(row) {
    try {
      const service = Orbit.services && Orbit.services.aseguradorasKnowledgeP09;
      const result = service && typeof service.read === 'function' ? service.read({ tenantId: tenantId(), aseguradoraId: row.id }) : null;
      if (!result || result.ok === false) return [];
      return [].concat(result.sources || []).map(item => Object.assign({}, item, { estado: visibleState(item.estado || item.status || 'Persistido'), sourceOrigin: 'Persistido' }));
    } catch (e) { return []; }
  }
  function knowledgeSources(row) {
    const map = Object.create(null), order = [];
    [mappedSummaryRows(row), persistedKnowledgeRows(row), [].concat(row.docs || []).map(item => Object.assign({}, item, { sourceOrigin: 'Ficha' }))].forEach(group => {
      group.forEach(item => {
        const key = sourceIdentity(item) || ('source_' + order.length);
        if (!map[key]) { map[key] = {}; order.push(key); }
        map[key] = Object.assign({}, map[key], item, { estado: visibleState(item.estado || item.status) });
      });
    });
    return order.map(key => map[key]);
  }
  function configuredKnowledgeSummarySrc() { return clean(tenantInsurerConfig().knowledgeSummarySrc); }
  function refreshOwnerView() {
    const open = document.getElementById('asg-ficha');
    if (open && open.dataset.id && S().get('aseguradoras', open.dataset.id)) ficha(open.dataset.id);
    else reload();
  }
  function ensureKnowledgeSummaryLoaded() {
    if (tenantKnowledgeSummary() || knowledgeSummaryLoading) return;
    const src = configuredKnowledgeSummarySrc();
    if (!src || document.querySelector('script[data-orbit-insurer-summary-owner]')) return;
    knowledgeSummaryLoading = true;
    const script = document.createElement('script');
    script.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=20260717-owner';
    script.async = false;
    script.setAttribute('data-orbit-insurer-summary-owner', tenantId() || 'tenant');
    script.onload = function () { knowledgeSummaryLoading = false; refreshOwnerView(); };
    script.onerror = function () { knowledgeSummaryLoading = false; };
    document.head.appendChild(script);
  }
  function extraKnowledgeHtml(row) {
    const rows = knowledgeSources(row).filter(item => item.sourceOrigin !== 'Ficha');
    if (!rows.length) return '<div class="cfg-note" style="margin-top:10px">Sin conocimiento adicional mapeado o persistido para esta aseguradora.</div>';
    return '<div class="asg-sec-t" style="margin-top:14px">🧠 Fuentes mapeadas y persistidas</div><div style="display:grid;gap:7px">' + rows.map(item => {
      const nd = normalizarFuente(item, row), ev = evaluarFuente(nd);
      const dims = [nd.pais, nd.moneda, nd.ramo, nd.producto].filter(Boolean).join(' · ') || 'Dimensiones pendientes';
      return '<div class="asg-row" style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px"><span style="flex:1"><b>' + U.esc(nd.nombre || 'Fuente') + '</b><small class="muted" style="display:block">' + U.esc(item.sourceOrigin || 'Conocimiento') + ' · ' + U.esc(dims) + '</small></span><span class="badge ' + (ev.estado.indexOf('Habilitado') === 0 ? 'ok' : ev.estado === 'Conocimiento incompleto' ? 'danger' : 'neutral') + '">' + U.esc(ev.estado) + '</span></div>';
    }).join('') + '</div>';
  }
  /* Evalúa una fuente y devuelve estado + capacidades de consumo (no solo texto).
     Suficiencia mínima: país + moneda + ramo. Sin eso, "Conocimiento incompleto"
     sin importar el estado que el usuario haya declarado — y NINGUNA capacidad. */
  function evaluarFuente(d) {
    const completa = !!(d.pais && d.moneda && d.ramo);
    const estado = completa ? (d.estado || 'Documento recibido') : 'Conocimiento incompleto';
    const habCot = completa && estado === 'Habilitado para Cotizador';
    const habComp = completa && estado === 'Habilitado para Comparativo';
    return {
      estado,
      sirveParaTarifas: habCot || habComp,
      sirveParaReglas: completa && d.tipo === 'tarifario' && (habCot || habComp),
      sirveParaPresentacion: completa && (d.tipo === 'cotizacion_ejemplo' || d.tipo === 'poliza_ejemplo'),
      sirveParaComparativo: habComp,
      sirveParaCondiciones: completa && ['formulario', 'manual', 'circular'].indexOf(d.tipo) >= 0,
      sirveParaCasosPrueba: completa && d.tipo === 'cotizacion_ejemplo',
      requiereEjemploCotizacion: d.tipo === 'tarifario' && !completa,
      habilitadoCotizador: habCot
    };
  }
  function resumenFuentes(a) {
    const docs = knowledgeSources(a).map(d => normalizarFuente(d, a));
    const out = {}; SOURCE_STATES.concat(['Conocimiento incompleto']).forEach(s => out[s] = 0);
    docs.forEach(d => { const e = evaluarFuente(d).estado; out[e] = (out[e] || 0) + 1; });
    return out;
  }
  function resumenGrupos(a) {
    const docs = knowledgeSources(a).map(d => normalizarFuente(d, a));
    const g = {};
    docs.forEach(d => { const k = sourceCombinationKey(d); (g[k] = g[k] || []).push(d); });
    return Object.keys(g).map(k => {
      const evs = g[k].map(evaluarFuente);
      const incompleto = evs.some(e => e.estado === 'Conocimiento incompleto');
      // habilitado de grupo exige CONJUNTO suficiente: al menos una fuente con tarifas/reglas Y ninguna incompleta
      const habilitado = !incompleto && evs.some(e => e.habilitadoCotizador || e.sirveParaComparativo);
      return { key: k, label: groupLabel(k), docs: g[k], estado: incompleto ? 'Conocimiento incompleto' : (habilitado ? 'Habilitado' : 'Pendiente') };
    });
  }

  /* ===================== DIRECTORIO ===================== */
  function render(h) {
    host = h;
    ensureKnowledgeSummaryLoaded();
    const todas = S().all('aseguradoras');
    let all = todas.filter(a => paisOK(a.pais));
    if (fPais !== 'TODOS') all = all.filter(a => a.pais === fPais);
    if (fRamo) all = all.filter(a => (a.ramos || []).includes(fRamo));
    if (fEstado === 'ACTIVAS') all = all.filter(a => a.vinculada !== false);
    if (fEstado === 'INACTIVAS') all = all.filter(a => a.vinculada === false);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      all = all.filter(a => (a.nombre || '').toLowerCase().includes(t) || (a.nit || '').toLowerCase().includes(t)
        || (a.contactos || []).some(c => (c.nombre || '').toLowerCase().includes(t))
        || (a.ramos || []).some(r => r.toLowerCase().includes(t)));
    }
    all = all.slice().sort(compareInsurers);
    const ramosAll = Array.from(new Set(todas.reduce((acc, a) => acc.concat(a.ramos || []), []))).sort();
    const base = todas.filter(a => paisOK(a.pais));
    const vinc = base.filter(a => a.vinculada !== false);
    const conContactoPpal = base.filter(a => (a.contactos || []).some(c => c.principal));
    const conAcceso = base.filter(a => (a.portales || []).some(p => p.estadoAcceso === 'Acceso disponible'));
    const conDocs = base.filter(a => (a.docs || []).length);
    const pendActualizar = base.filter(a => (a.portales || []).some(p => p.estadoAcceso === 'Requiere actualización'));
    const puedeEditar = canEdit();

    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '🏢', title: 'Orbit Aseguradoras', sub: 'Directorio de aseguradoras vinculadas', features: [], actions: `${puedeEditar ? `<button class="btn ghost" id="asg-imp" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">✨ Importar</button>` : ''}${puedeEditar ? '<button class="btn primary" id="asg-new" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">+ Aseguradora</button>' : ''}` })}
      ${K.kpis([
        { label: 'Activas', val: vinc.length, color: 'var(--ok)', foot: 'de ' + base.length + ' en directorio', footTone: 'up', onclick: "Orbit.modules.aseguradoras.kpi('activas')" },
        { label: 'Con contacto principal', val: conContactoPpal.length, color: 'var(--red)', foot: 'marcado como principal', onclick: "Orbit.modules.aseguradoras.kpi('contacto')" },
        { label: 'Con acceso disponible', val: conAcceso.length, color: 'var(--info)', foot: 'según último registro', onclick: "Orbit.modules.aseguradoras.kpi('acceso')" },
        { label: 'Con documentación', val: conDocs.length, color: 'var(--ink-3)', foot: 'con documentos cargados', onclick: "Orbit.modules.aseguradoras.kpi('docs')" },
        { label: 'Requieren actualización', val: pendActualizar.length, color: 'var(--warn)', foot: 'revisar acceso', footTone: pendActualizar.length ? 'down' : undefined, onclick: "Orbit.modules.aseguradoras.kpi('pend')" }
      ])}
      ${!puedeEditar ? `<div class="cfg-note" style="margin-bottom:14px">Vista de solo lectura para tu rol (<b>${U.esc(activeRole())}</b>).</div>` : ''}
      <div class="card pad" style="margin-bottom:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="asg-q" class="o-sel" style="flex:1.5;min-width:200px" placeholder="🔎 Buscar por nombre, NIT, contacto o ramo…" value="${U.esc(q)}">
        <select id="asg-fpais" class="o-sel" style="width:120px"><option value="TODOS" ${fPais === 'TODOS' ? 'selected' : ''}>Todo país</option><option value="GT" ${fPais === 'GT' ? 'selected' : ''}>GT</option><option value="CO" ${fPais === 'CO' ? 'selected' : ''}>CO</option></select>
        <select id="asg-fram" class="o-sel" style="width:160px"><option value="">Todo ramo</option>${ramosAll.map(r => `<option ${r === fRamo ? 'selected' : ''}>${r}</option>`).join('')}</select>
        <select id="asg-fest" class="o-sel" style="width:140px"><option value="TODAS" ${fEstado === 'TODAS' ? 'selected' : ''}>Todas</option><option value="ACTIVAS" ${fEstado === 'ACTIVAS' ? 'selected' : ''}>Activas</option><option value="INACTIVAS" ${fEstado === 'INACTIVAS' ? 'selected' : ''}>Inactivas</option></select>
        <select id="asg-order" class="o-sel" style="width:190px"><option value="country" ${orderMode === 'country' ? 'selected' : ''}>País preferido primero</option><option value="name" ${orderMode === 'name' ? 'selected' : ''}>Nombre A–Z</option><option value="active" ${orderMode === 'active' ? 'selected' : ''}>Activas primero</option><option value="recent" ${orderMode === 'recent' ? 'selected' : ''}>Actualización reciente</option></select>
      </div>
      <div class="asg-grid">${all.map(a => card(a)).join('') || '<div class="muted" style="padding:16px">Sin resultados para este filtro.</div>'}</div>
    </div>`;
    if (host.querySelector('#asg-new')) host.querySelector('#asg-new').addEventListener('click', nueva);
    if (host.querySelector('#asg-imp')) host.querySelector('#asg-imp').addEventListener('click', () => { if (!canEdit()) { U.toast('Solo Dirección, Superadmin, Admin u Operativo puede importar.'); return; } Orbit.importa.open('directorio-aseguradoras', { onDone: reload }); });
    host.querySelector('#asg-q').addEventListener('input', e => { q = e.target.value; render(host); });
    host.querySelector('#asg-fpais').addEventListener('change', e => { fPais = e.target.value; render(host); });
    host.querySelector('#asg-fram').addEventListener('change', e => { fRamo = e.target.value; render(host); });
    host.querySelector('#asg-fest').addEventListener('change', e => { fEstado = e.target.value; render(host); });
    host.querySelector('#asg-order').addEventListener('change', e => { saveOrder(e.target.value); render(host); });
    host.querySelectorAll('[data-asg]').forEach(el => el.addEventListener('click', e => { if (e.target.closest('.asg-switch') || e.target.closest('[data-act]')) return; ficha(el.dataset.asg); }));
    host.querySelectorAll('[data-toggle]').forEach(t => t.addEventListener('change', async e => {
      e.stopPropagation();
      if (!canEdit()) { e.target.checked = !e.target.checked; U.toast('Solo Dirección, Superadmin, Admin u Operativo puede cambiar la vinculación.'); return; }
      const id = t.dataset.toggle, next = t.checked;
      const motivo = await U.prompt('Motivo del cambio de vinculación:', { title: next ? 'Activar aseguradora' : 'Desactivar aseguradora' });
      if (motivo == null) { e.target.checked = !next; return; }
      const cur = S().get('aseguradoras', id);
      up(id, { vinculada: next, actividad: log(cur, { cambio: (next ? 'Activada' : 'Desactivada') + ' la vinculación', motivo }) });
      render(host);
    }));
    host.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const [act, id] = [b.dataset.act, b.dataset.id];
      const a = S().get('aseguradoras', id); if (!a) return;
      if (act === 'contactar') { ficha(id); setTimeout(() => selectTab('contactos'), 0); }
      if (act === 'plataforma') { ficha(id); setTimeout(() => selectTab('plataformas'), 0); }
      if (act === 'drive') { if (a.drive) window.open(a.drive.match(/^https?:/) ? a.drive : 'https://' + a.drive, '_blank', 'noopener'); }
    }));
    const deepId = Orbit.route && Orbit.route.params && Orbit.route.params.ficha;
    if (deepId && S().get('aseguradoras', deepId)) ficha(deepId);
  }

  function card(a) {
    const on = a.vinculada !== false;
    const nPol = S().where('polizas', p => p.aseguradoraId === a.id).length;
    const contactoP = (a.contactos || []).find(c => c.principal) || (a.contactos || [])[0];
    const portales = a.portales || [];
    const estAcc = portales.length ? (portales.some(p => p.estadoAcceso === 'Acceso disponible') ? 'Acceso disponible' : portales.some(p => p.estadoAcceso === 'Requiere actualización') ? 'Requiere actualización' : 'Pendiente de conexión segura') : 'Sin acceso registrado';
    const estDoc = (a.docs || []).length ? ((a.docs || []).length + ' documentos') : 'Sin documentos';
    const productos = (a.ramos || []).slice(0, 3);
    const logo = a.logo ? `<span class="asg-dot" style="padding:0;overflow:hidden"><img src="${a.logo}" style="width:100%;height:100%;object-fit:contain"></span>` : `<span class="asg-dot" style="background:${a.color}">${U.esc(a.nombre[0])}</span>`;
    return `<div class="asg-card ${on ? '' : 'off'}" data-asg="${a.id}">
      <div class="asg-card-h">
        ${logo}
        <div style="flex:1;min-width:0"><b>${U.esc(a.nombre)}</b><div class="muted" style="font-size:11.5px">${a.pais} · ${(a.ramos || []).length} ramos · ${nPol} pólizas</div></div>
        <label class="asg-switch" title="Vinculación" onclick="event.stopPropagation()"><input type="checkbox" data-toggle="${a.id}" ${on ? 'checked' : ''} ${canEdit() ? '' : 'disabled'}><span></span></label>
      </div>
      <div class="asg-card-tags">${productos.map(r => `<span class="badge neutral">${r}</span>`).join('')}</div>
      <div style="font-size:11.5px;color:var(--ink-2);margin-top:8px;display:grid;gap:3px">
        <div>👤 ${contactoP ? U.esc(contactoP.nombre || contactoP.area) + (contactoP.tel ? ' · ' + U.esc(contactoP.tel) : '') : 'Sin contacto registrado'}</div>
        <div>🔗 <span class="badge ${ACCESO_TONE[estAcc] || 'neutral'}" style="font-size:10.5px">${estAcc}</span> · 📎 ${estDoc}</div>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
        <button class="btn ghost sm" data-act="contactar" data-id="${a.id}">👤 Contactar</button>
        <button class="btn ghost sm" data-act="plataforma" data-id="${a.id}">🔗 Plataforma</button>
        ${a.drive ? `<button class="btn ghost sm" data-act="drive" data-id="${a.id}">📁 Drive</button>` : ''}
      </div>
    </div>`;
  }

  function nueva() {
    if (!canEdit()) { U.toast('Solo Dirección, Superadmin, Admin u Operativo puede crear aseguradoras.'); return; }
    const pais = (Orbit.pais && Orbit.pais !== 'TODOS') ? Orbit.pais : 'GT';
    const id = 'asg' + Date.now().toString().slice(-6);
    const ent = {
      id, nombre: 'Nueva aseguradora', color: '#1f3a5f', pais, ramos: [], comisionDefault: 12, comisiones: {}, comisionesProd: {}, ramosHabilitados: {}, ramosDetalle: {},
      vinculada: true, contactos: [], cuentas: [], portales: [], docs: [], docsRequeridos: [], productos: [], facturacion: {}, actividad: [], creadaEnSesion: true
    };
    ent.actividad = log(ent, { cambio: 'Aseguradora creada' });
    S().insert('aseguradoras', ent);
    ficha(id, true);
  }

  /* ===================== FICHA POR PESTAÑAS (DRAFT REAL) ===================== */
  const TABS = [
    ['resumen', '📋 Resumen'], ['contactos', '👤 Contactos'], ['plataformas', '🔗 Plataformas'],
    ['bancos', '🏦 Bancos y pagos'], ['productos', '📦 Productos y planes'], ['documentos', '📁 Documentos y Drive'],
    ['tarifas', '🧮 Tarifas y conocimiento'], ['actividad', '🕒 Actividad']
  ];
  // por-id: { tab, editing, draft } — draft es una copia editable; SOLO se escribe al store en "Guardar cambios"
  const fichaState = {};
  function cloneEnt(a) { return JSON.parse(JSON.stringify(a)); }

  function selectTab(t) {
    const back = document.getElementById('asg-ficha'); if (!back) return;
    const id = back.dataset.id;
    const currentState = fichaState[id];
    if (currentState && currentState.editing && currentState.tab !== t && typeof currentState.snapshotCurrent === 'function') currentState.snapshotCurrent();
    fichaState[id].tab = t;
    back.querySelectorAll('[data-tab]').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    const body = back.querySelector('#af-body');
    const st = fichaState[id]; const data = st.editing ? st.draft : S().get('aseguradoras', id);
    if (!data || !body) return;
    body.innerHTML = tabBody(data, t, st.editing);
    wireBody(back, data, t);
  }

  function ficha(id, startEdit) {
    ensureKnowledgeSummaryLoaded();
    const a = S().get('aseguradoras', id); if (!a) return;
    const wantEdit = !!startEdit && canEdit();
    if ((Orbit.route && Orbit.route.params && Orbit.route.params.ficha) !== id) { history.replaceState(null, '', '#/aseguradoras?ficha=' + id); if (Orbit.route) Orbit.route.params = Object.assign({}, Orbit.route.params, { ficha: id }); }
    const priorState = fichaState[id] || {};
    fichaState[id] = { tab: priorState.tab || 'resumen', editing: wantEdit, draft: wantEdit ? cloneEnt(a) : null, credentialDrafts: wantEdit ? {} : (priorState.credentialDrafts || {}), snapshotCurrent: null, saving: false };
    const st = fichaState[id];
    const data = st.editing ? st.draft : a;
    host.innerHTML = `<div class="page" id="asg-ficha" data-id="${id}">
      <div class="crumb" style="margin-bottom:14px"><a style="cursor:pointer;color:var(--red)" onclick="location.hash='#/aseguradoras'">‹ Aseguradoras</a> / ${U.esc(a.nombre)}</div>
      <div class="card" style="overflow:hidden;padding:0;display:flex;flex-direction:column">
        <div style="padding:20px 24px;background:linear-gradient(120deg,${a.color},#10141a);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div style="display:flex;gap:13px;align-items:center">
            <span class="asg-logo">${a.logo ? `<img src="${a.logo}">` : '<span>🏢<br><small>logo</small></span>'}</span>
            <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.8)">Aseguradora · ${a.pais}</div>
              <div style="font-family:var(--f-display);font-weight:800;font-size:20px;color:#fff">${U.esc(a.nombre)}</div>
              <div style="font-size:12px;margin-top:5px;color:rgba(255,255,255,.85)">${a.vinculada !== false ? '✓ Vinculada' : 'Sin vincular'}${st.editing ? ' · <b>Editando</b>' : ''}</div></div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            ${canEdit() ? (st.editing ? '' : `<button class="btn ghost sm" id="af-editar" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);color:#fff">✏ Editar</button>`) : '<span class="badge neutral" style="background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.3)">Solo lectura</span>'}
          </div>
        </div>
        <div class="asg-tabbar" role="tablist">${TABS.map(([k, l]) => `<button class="asg-tab ${k === st.tab ? 'active' : ''}" role="tab" aria-selected="${k === st.tab}" data-tab="${k}">${l}</button>`).join('')}</div>
        <div id="af-body" role="tabpanel" style="padding:18px 22px">${tabBody(data, st.tab, st.editing)}</div>
        <div style="padding:12px 22px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap">
          ${st.editing
            ? `<div style="display:flex;gap:8px"><button class="btn primary" id="af-guardar">💾 Guardar cambios</button><button class="btn ghost" id="af-cancelar">✕ Cancelar</button></div>`
            : (canEdit() ? '<button class="btn ghost" id="af-del" style="color:var(--danger)">🗑 Borrar / desactivar</button>' : '<span></span>')}
          <button class="btn ghost" onclick="location.hash='#/aseguradoras'">‹ Volver al directorio</button>
        </div>
      </div>
    </div>`;
    const back = document.getElementById('asg-ficha');
    Orbit.vault.wire(back);
    back.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => selectTab(b.dataset.tab)));
    if (back.querySelector('#af-editar')) back.querySelector('#af-editar').addEventListener('click', () => ficha(id, true));
    if (back.querySelector('#af-guardar')) back.querySelector('#af-guardar').addEventListener('click', () => guardarDraft(id, back));
    if (back.querySelector('#af-cancelar')) back.querySelector('#af-cancelar').addEventListener('click', () => { fichaState[id].editing = false; fichaState[id].draft = null; fichaState[id].credentialDrafts = {}; ficha(id); });
    if (back.querySelector('#af-del')) back.querySelector('#af-del').addEventListener('click', () => borrarOdesactivar(id, back));
    wireBody(back, data, st.tab);
  }

  function credentialChanges(st, draft) {
    return Object.keys(st && st.credentialDrafts || {}).map(key => st.credentialDrafts[key]).filter(item => item && item.password);
  }
  async function secureSourceHash(value) {
    if (!window.crypto || !window.crypto.subtle || typeof TextEncoder === 'undefined') throw new Error('SECURE_HASH_UNAVAILABLE');
    const bytes = new TextEncoder().encode(String(value || ''));
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function persistSecureCredentialChanges(insurerId, st) {
    const changes = credentialChanges(st, st.draft);
    if (!changes.length) return 0;
    if (!canManageCredentials()) throw new Error('CREDENTIAL_PERMISSION_DENIED');
    if (!Orbit.secureImport || typeof Orbit.secureImport.importInsurerDirectory !== 'function') throw new Error('SECURE_CREDENTIAL_PROVIDER_UNAVAILABLE');
    const sourceHash = await secureSourceHash(insurerId + ':' + Date.now());
    const result = await Orbit.secureImport.importInsurerDirectory({
      sourceHash,
      items: changes.map(item => ({ type: 'credential', insurerId, portalId: item.portalId, resourceId: item.portalId, credentialRef: item.credentialRef || '', username: item.username || '', password: item.password }))
    });
    const mappings = [].concat(result && result.mappings || []);
    if (mappings.length < changes.length) throw new Error('SECURE_CREDENTIAL_MAPPING_INCOMPLETE');
    mappings.forEach(mapping => {
      const portalId = clean(mapping.portalId || mapping.resourceId);
      const index = (st.draft.portales || []).findIndex((portal, idx) => clean(portal.id || String(idx)) === portalId);
      if (index < 0) return;
      st.draft.portales[index] = Object.assign({}, st.draft.portales[index], {
        credentialRef: clean(mapping.credentialRef) || st.draft.portales[index].credentialRef || 'backend_required',
        estadoCredencial: mapping.available === false ? 'requiere_actualizacion' : 'registrada',
        estadoAcceso: mapping.usernameAvailable === false || mapping.passwordAvailable === false ? 'Requiere actualización' : 'Acceso disponible',
        credencialActualizadaAt: new Date().toISOString()
      });
    });
    changes.forEach(item => { item.password = ''; });
    st.credentialDrafts = {};
    return mappings.length;
  }

  /* ---- diff simple (top-level) para trazabilidad antes/después ---- */
  function diffResumen(before, after) {
    const claves = ['nombre', 'nit', 'codigoIntermediario', 'web', 'responsable', 'telGeneral', 'emergencia', 'ultimaRevision', 'observaciones', 'drive', 'facturacion', 'contactos', 'portales', 'cuentas', 'ramos', 'comisiones', 'ramosHabilitados', 'ramosDetalle', 'docsRequeridos', 'docs', 'vinculada', 'cotTasas', 'cotTasasValidadas'];
    const cambios = [];
    claves.forEach(k => { const b = JSON.stringify(before[k]), a2 = JSON.stringify(after[k]); if (b !== a2) cambios.push(k); });
    return cambios;
  }

  async function guardarDraft(id, back) {
    const st = fichaState[id]; if (!st || !st.draft || st.saving) return;
    if (typeof st.snapshotCurrent === 'function') st.snapshotCurrent();
    const before = S().get('aseguradoras', id); if (!before) return;
    let cambios = diffResumen(before, st.draft);
    const secureCount = credentialChanges(st, st.draft).length;
    if (!cambios.length && !secureCount) { st.editing = false; st.draft = null; st.credentialDrafts = {}; ficha(id); return; }
    const summary = cambios.concat(secureCount ? ['credenciales_seguras'] : []);
    const motivo = await U.prompt('Se detectaron cambios en: ' + summary.join(', ') + '.\n\nMotivo del cambio:', { title: 'Guardar cambios' });
    if (motivo == null) return;
    const saveButton = back && back.querySelector('#af-guardar');
    st.saving = true;
    if (saveButton) { saveButton.disabled = true; saveButton.textContent = 'Guardando…'; }
    try {
      if (secureCount) await persistSecureCredentialChanges(id, st);
      cambios = diffResumen(before, st.draft);
      if (cambios.length) {
        const patch = Object.assign({}, st.draft, { actividad: log(before, { cambio: 'Actualización de ficha (' + cambios.join(', ') + ')', motivo, camposCambiados: cambios }) });
        delete patch.id;
        const ack = waitBackendWrite('aseguradoras', id, 'update', 20000);
        up(id, patch);
        await ack;
        if (cambios.indexOf('cotTasas') >= 0 || cambios.indexOf('cotTasasValidadas') >= 0) tarifaValidacionAudit(id, before, st.draft, motivo);
      }
      st.editing = false; st.draft = null; st.credentialDrafts = {}; st.snapshotCurrent = null; st.saving = false;
      U.toast('Cambios guardados correctamente.');
      ficha(id); reload();
    } catch (error) {
      st.saving = false;
      if (saveButton) { saveButton.disabled = false; saveButton.textContent = '💾 Guardar cambios'; }
      U.toast('No fue posible guardar. La edición continúa abierta para corregir o reintentar.');
      try { console.warn('[Orbit Aseguradoras] SAVE_FAILED', error && (error.code || error.message) || error); } catch (e) {}
    }
  }
  /* Auditoría externa de cambios en tarifas/validación tarifaria — nombre estable: tarifaValidacionAudit */
  function tarifaValidacionAudit(id, before, after, motivo) {
    const ramos = Array.from(new Set(Object.keys(after.cotTasas || {}).concat(Object.keys(before.cotTasas || {})).concat(Object.keys(after.cotTasasValidadas || {})).concat(Object.keys(before.cotTasasValidadas || {}))));
    ramos.forEach(ramo => {
      const antesVal = !!(before.cotTasasValidadas && before.cotTasasValidadas[ramo]);
      const despuesVal = !!(after.cotTasasValidadas && after.cotTasasValidadas[ramo]);
      const antesCfg = (before.cotTasas && before.cotTasas[ramo]) || null;
      const despuesCfg = (after.cotTasas && after.cotTasas[ramo]) || null;
      if (JSON.stringify(antesCfg) === JSON.stringify(despuesCfg) && antesVal === despuesVal) return;
      auditExterna({ cambio: (despuesVal && !antesVal) ? 'Tarifa activada (validada) para ' + ramo : (!despuesVal && antesVal) ? 'Tarifa desactivada (invalidada) para ' + ramo : 'Tabla de tasas modificada para ' + ramo, aseguradoraId: id, ramo, motivo, antes: { tramos: antesCfg, validada: antesVal }, despues: { tramos: despuesCfg, validada: despuesVal } });
    });
  }

  /* ---- borrado seguro: normal = SOLO desactivar; borrado físico exige cero vínculos + auditoría externa previa ---- */
  function vinculos(id) {
    return {
      polizas: S().where('polizas', p => p.aseguradoraId === id).length,
      cobros: S().where('cobros', c => { const p = S().get('polizas', c.polizaId); return p && p.aseguradoraId === id; }).length,
      comisiones: (S().all('comisiones') || []).filter(c => c.aseguradoraId === id).length,
      reclamos: (S().all('reclamos') || []).filter(r => r.aseguradoraId === id).length,
      gestiones: (S().all('gestiones') || []).filter(g => g.aseguradoraId === id).length,
      negocios: (S().all('negocios') || []).filter(n => n.aseguradoraId === id).length
    };
  }
  async function borrarOdesactivar(id, back) {
    const a = S().get('aseguradoras', id); if (!a) return;
    const v = vinculos(id);
    const total = Object.keys(v).reduce((s, k) => s + v[k], 0);
    if (total > 0) {
      const detalle = Object.keys(v).filter(k => v[k] > 0).map(k => v[k] + ' ' + k).join(', ');
      const motivo = await U.prompt(`Esta aseguradora tiene vínculos activos: ${detalle}. No se ofrece borrado — solo desactivar (conserva histórico).\n\nMotivo de la desactivación:`, { title: 'Desactivar aseguradora' });
      if (motivo == null) return;
      up(id, { vinculada: false, actividad: log(a, { cambio: 'Desactivada (tiene vínculos activos)', motivo, antes: v }) });
      back.remove(); reload(); return;
    }
    // sin vínculos: aun así, por defecto solo se ofrece desactivar. Borrado físico requiere confirmación reforzada explícita.
    const opcion = await U.confirm('Sin vínculos activos. ¿Querés desactivar (recomendado, reversible) o borrar físicamente (irreversible)?', { title: 'Sin vínculos', ok: 'Desactivar', cancel: 'Borrar físicamente…' });
    const motivo = await U.prompt('Motivo:', { title: opcion ? 'Desactivar' : 'Borrar físicamente' });
    if (motivo == null) return;
    if (opcion) { up(id, { vinculada: false, actividad: log(a, { cambio: 'Desactivada (sin vínculos)', motivo }) }); back.remove(); reload(); return; }
    if (!(await U.confirm('Esta acción es irreversible y no se puede deshacer. ¿Confirmás el borrado físico de "' + a.nombre + '"?', { title: 'Confirmación reforzada', ok: 'Sí, borrar físicamente' }))) return;
    // auditoría EXTERNA antes de eliminar (sobrevive al borrado de la entidad)
    auditExterna({ cambio: 'Borrado físico de aseguradora', aseguradoraId: id, nombre: a.nombre, motivo, snapshot: { pais: a.pais, ramos: a.ramos, nit: a.nit } });
    S().remove('aseguradoras', id);
    back.remove(); reload();
  }

  function tabBody(a, t, editing) {
    if (t === 'resumen') return tabResumen(a, editing);
    if (t === 'contactos') return tabContactos(a, editing);
    if (t === 'plataformas') return tabPlataformas(a, editing);
    if (t === 'bancos') return tabBancos(a, editing);
    if (t === 'productos') return tabProductos(a, editing);
    if (t === 'documentos') return tabDocumentos(a, editing);
    if (t === 'tarifas') return tabTarifas(a, editing);
    if (t === 'actividad') return tabActividad(a);
    return '';
  }

  /* ---- Resumen ---- */
  function tabResumen(a, editing) {
    const f = a.facturacion || {};
    const ro = editing ? '' : 'disabled';
    return `<div class="asg-sec"><div class="asg-sec-t">Identidad</div>
      <div class="cgrid">
        <label class="ce-l">Nombre comercial<input id="af-nombre" class="o-sel" value="${U.esc(a.nombre || '')}" ${ro}></label>
        <label class="ce-l">Razón social<input id="af-rs" class="o-sel" value="${U.esc(f.razonSocial || '')}" ${ro}></label>
        <label class="ce-l">NIT / identificación fiscal<input id="af-nit" class="o-sel" value="${U.esc(a.nit || '')}" ${ro}></label>
        <label class="ce-l">Código de intermediario<input id="af-cod" class="o-sel" value="${U.esc(a.codigoIntermediario || '')}" ${ro}></label>
        <label class="ce-l">Sitio web / app<input id="af-web" class="o-sel" value="${U.esc(a.web || '')}" ${ro}></label>
        <label class="ce-l">Responsable interno<input id="af-resp" class="o-sel" value="${U.esc(a.responsable || '')}" ${ro}></label>
      </div>
      <div class="cgrid" style="margin-top:10px">
        <label class="ce-l">Dirección / oficina<input id="af-dir" class="o-sel" value="${U.esc(f.dirFiscal || '')}" ${ro}></label>
        <label class="ce-l">Teléfono general<input id="af-tel" class="o-sel" value="${U.esc(a.telGeneral || '')}" ${ro}></label>
        <label class="ce-l">Emergencia / asistencia<input id="af-emer" class="o-sel" value="${U.esc(a.emergencia || '')}" ${ro}></label>
        <label class="ce-l">Última revisión<input id="af-rev" class="o-sel" type="date" value="${a.ultimaRevision || ''}" ${ro}></label>
      </div>
      <label class="ce-l" style="margin-top:10px">Observaciones<textarea id="af-obs" class="o-sel" rows="2" ${ro}>${U.esc(a.observaciones || '')}</textarea></label>
      ${editing ? '<div class="cfg-note" style="margin-top:10px">Los cambios de esta y todas las pestañas se aplican al pulsar <b>Guardar cambios</b> abajo (con motivo). <b>Cancelar</b> descarta todo sin tocar el registro.</div>' : ''}
    </div>`;
  }

  /* ---- Contactos ---- */
  const AREAS = ['Comercial', 'Cotizaciones', 'Emisiones', 'Inspecciones', 'Endosos/modificaciones', 'Renovaciones', 'Cobros', 'Aplicación de pagos', 'Siniestros', 'Facturación', 'Comisiones', 'Soporte de plataforma'];
  function tabContactos(a, editing) {
    const cont = a.contactos || [];
    return `<div class="asg-sec">
      <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">Contactos ${editing ? '<button class="btn ghost sm" id="af-add-cont">+ Contacto</button>' : ''}</div>
      <div id="af-contactos">${cont.map((c, i) => contRow(c, i, editing)).join('') || '<div class="muted" style="font-size:12px">Sin contactos registrados.</div>'}</div>
    </div>`;
  }
  function contRow(c, i, editing) {
    const ro = editing ? '' : 'disabled';
    return `<div class="asg-row" data-cont="${i}" style="flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:4px;font-size:11px" title="Contacto principal"><input type="checkbox" data-cppal ${c.principal ? 'checked' : ''} ${ro}>Ppal.</label>
      <input class="o-sel" data-cn placeholder="Nombre" value="${U.esc(c.nombre || '')}" style="flex:1" ${ro}>
      <select class="o-sel" data-ca style="flex:1" ${ro}>${AREAS.map(ar => `<option ${ar === c.area ? 'selected' : ''}>${ar}</option>`).join('')}</select>
      <input class="o-sel" data-ce placeholder="Correo" value="${U.esc(c.email || '')}" style="flex:1.2" ${ro}>
      <input class="o-sel" data-cl placeholder="Celular" value="${U.esc(c.tel || '')}" style="flex:1" ${ro}>
      <input class="o-sel" data-cext placeholder="Ext." value="${U.esc(c.ext || '')}" style="width:60px" ${ro}>
      <input class="o-sel" data-cargo placeholder="Cargo" value="${U.esc(c.cargo || '')}" style="flex:1" ${ro}>
      <select class="o-sel" data-cpais style="width:70px" ${ro}><option ${c.pais === 'GT' ? 'selected' : ''}>GT</option><option ${c.pais === 'CO' ? 'selected' : ''}>CO</option></select>
      <select class="o-sel" data-cchan style="width:110px" ${ro}><option ${c.canal === 'Correo' ? 'selected' : ''}>Correo</option><option ${c.canal === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option><option ${c.canal === 'Teléfono' ? 'selected' : ''}>Teléfono</option></select>
      <select class="o-sel" data-cvig style="width:100px" ${ro}><option ${c.vigencia === 'Vigente' || !c.vigencia ? 'selected' : ''}>Vigente</option><option ${c.vigencia === 'Por confirmar' ? 'selected' : ''}>Por confirmar</option><option ${c.vigencia === 'Dado de baja' ? 'selected' : ''}>Dado de baja</option></select>
      <input class="o-sel" data-cgest placeholder="Gestión preferida" value="${U.esc(c.gestionPreferida || '')}" style="flex:1" ${ro}>
      ${editing ? `<button class="asg-del" data-del="contactos:${i}">✕</button>` : ''}
    </div>`;
  }

  /* ---- Plataformas y accesos (sin contraseñas) ---- */
  function tabPlataformas(a, editing) {
    const portales = a.portales && a.portales.length ? a.portales : (a.portal ? [{ nombre: 'Portal principal', url: a.portal, estadoAcceso: 'Sin verificar', credentialRef: 'backend_required' }] : []);
    return `<div class="asg-sec">
      <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">Plataformas y accesos ${editing ? '<button class="btn ghost sm" id="af-add-portal">+ Portal</button>' : ''}</div>
      <div class="cfg-note" style="margin-bottom:9px">El usuario se guarda como dato operativo. Dirección, Superadmin, Admin y Operativo pueden cambiar la contraseña mediante el proveedor seguro; la contraseña nunca se escribe en la ficha.</div>
      <div id="af-portales">${portales.map((p, i) => portalRow(p, i, editing)).join('') || '<div class="muted" style="font-size:12px">Sin plataformas registradas.</div>'}</div>
      <label class="ce-l" style="margin-top:9px">📁 Drive / repositorio<input id="af-drive" class="o-sel" value="${U.esc(a.drive || '')}" ${editing ? '' : 'disabled'}></label>
    </div>`;
  }
  function portalRow(p, i, editing) {
    const ro = editing ? '' : 'disabled';
    const estado = p.estadoAcceso || 'Sin verificar';
    const resourceId = clean(p.id || String(i));
    return `<div class="asg-row" data-portal="${i}" data-resource-id="${U.esc(resourceId)}" style="flex-wrap:wrap">
      <input class="o-sel" data-pn placeholder="Producto / sistema" value="${U.esc(p.nombre || '')}" style="flex:1.1" ${ro}>
      <select class="o-sel" data-ptipo style="width:110px" ${ro}><option ${p.tipo === 'Cotizador' ? 'selected' : ''}>Cotizador</option><option ${p.tipo === 'Emisión' ? 'selected' : ''}>Emisión</option><option ${p.tipo === 'Cobros' ? 'selected' : ''}>Cobros</option><option ${p.tipo === 'Siniestros' ? 'selected' : ''}>Siniestros</option><option ${p.tipo === 'Portal general' || !p.tipo ? 'selected' : ''}>Portal general</option></select>
      <input class="o-sel" data-pu placeholder="https://…" value="${U.esc(p.url || '')}" style="flex:1.2" ${ro}>
      <input class="o-sel" data-puser placeholder="Usuario" value="${U.esc(p.usuario || p.user || p.login || '')}" style="flex:1" ${ro}>
      ${editing && canManageCredentials() ? '<input class="o-sel" data-ppass type="password" autocomplete="new-password" placeholder="Nueva contraseña (vacío = conservar)" style="flex:1">' : ''}
      <select class="o-sel" data-ppais style="width:70px" ${ro}><option ${p.pais === 'GT' ? 'selected' : ''}>GT</option><option ${p.pais === 'CO' ? 'selected' : ''}>CO</option><option ${p.pais === 'Ambos' || !p.pais ? 'selected' : ''}>Ambos</option></select>
      <select class="o-sel" data-pest style="flex:1" ${ro}>${ACCESO_ESTADOS.map(e => `<option ${e === estado ? 'selected' : ''}>${e}</option>`).join('')}</select>
      <input class="o-sel" data-presp placeholder="Responsable" value="${U.esc(p.responsable || '')}" style="flex:1" ${ro}>
      <input class="o-sel" data-pver type="date" title="Última verificación" value="${p.ultimaVerificacion || ''}" style="width:130px" ${ro}>
      <span class="badge ${ACCESO_TONE[estado] || 'neutral'}" style="align-self:center">${estado}</span>
      ${p.url ? `<button class="btn ghost sm" type="button" data-open-portal="${U.esc(p.url)}">↗ Abrir</button>` : ''}
      ${editing ? `<button class="asg-del" type="button" data-del="portales:${i}">✕</button>` : ''}
    </div>`;
  }

  /* ---- Bancos y pagos ---- */
  function tabBancos(a, editing) {
    const cuentas = a.cuentas || [];
    return `<div class="asg-sec">
      <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">Bancos y pagos ${editing ? '<button class="btn ghost sm" type="button" id="af-add-cta">+ Cuenta</button>' : ''}</div>
      <div class="cfg-note" style="margin-bottom:9px">Directorio dinámico: las cuentas se leen y actualizan desde Orbit.store. Los cambios requieren permiso, motivo, confirmación del backend y auditoría.</div>
      <div id="af-cuentas">${cuentas.map((c, i) => ctaRow(c, i, editing)).join('') || '<div class="muted" style="font-size:12px">Sin cuentas registradas.</div>'}</div>
    </div>`;
  }
  function ctaRow(c, i, editing) {
    if (!editing) {
      return `<div class="asg-row" data-cta="${i}" style="flex-wrap:wrap;align-items:center">
        <span style="flex:1.2;font-size:12.5px">${U.esc(c.banco || '—')}</span>
        <span style="flex:1;font-size:12.5px">${U.esc(c.tipo || '—')}</span>
        <span style="flex:1">${Orbit.vault.field(c.numero || '', { mask: 'right4' })}</span>
        <span style="width:70px;font-size:12.5px">${U.esc(c.moneda || '—')}</span>
        <span style="flex:1;font-size:12.5px">${U.esc(c.titular || '—')}</span>
        <span style="flex:1;font-size:11.5px" class="muted">${c.linkPago ? '🔗 link de pago' : ''}</span>
        <span style="width:130px;font-size:11.5px" class="muted">${c.ultimaVerificacion ? U.fmtDate(c.ultimaVerificacion) : 'sin verificar'}</span>
      </div>`;
    }
    const ro = '';
    return `<div class="asg-row" data-cta="${i}" style="flex-wrap:wrap">
      <input class="o-sel" data-cb placeholder="Banco" value="${U.esc(c.banco || '')}" style="flex:1.2" ${ro}>
      <input class="o-sel" data-ctt placeholder="Tipo de cuenta" value="${U.esc(c.tipo || '')}" style="flex:1" ${ro}>
      <input class="o-sel" data-ccn placeholder="Número de cuenta" value="${U.esc(c.numero || '')}" style="flex:1" ${ro}>
      <input class="o-sel" data-cm placeholder="Moneda" value="${U.esc(c.moneda || '')}" style="width:70px" ${ro}>
      <input class="o-sel" data-ctit placeholder="Titular" value="${U.esc(c.titular || '')}" style="flex:1" ${ro}>
      <input class="o-sel" data-clink placeholder="Link de pago (opcional)" value="${U.esc(c.linkPago || '')}" style="flex:1" ${ro}>
      <input class="o-sel" data-cver type="date" title="Última verificación" value="${c.ultimaVerificacion || ''}" style="width:130px" ${ro}>
      ${editing ? `<button class="asg-del" data-del="cuentas:${i}">✕</button>` : ''}
    </div>`;
  }

  /* ---- Productos y planes ---- */
  function tabProductos(a, editing) {
    const ramos = a.ramos || [];
    return `<div class="asg-sec">
      <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">Productos, ramos y planes ${editing ? '<button class="btn ghost sm" id="af-add-ramo">+ Ramo</button>' : ''}</div>
      <div class="ct-grid">${ramos.map((r, i) => ramoRow(a, r, i, editing)).join('') || '<div class="muted" style="font-size:12px">Sin ramos habilitados.</div>'}</div>
      <div class="cfg-note" style="margin-top:9px">Un ramo NO se ofrece en Cotizador hasta que lo marqués explícitamente "Habilitado p/ Cotizador" aquí. La ausencia de configuración significa <b>no disponible</b>, no lo contrario.</div>
      <div class="asg-sec-t" style="margin-top:16px">Documentos requeridos para emisión ${editing ? '<button class="btn ghost sm" id="af-add-req">+ Requisito</button>' : ''}</div>
      <div id="af-reqs">${(a.docsRequeridos || []).map((r, i) => reqRow(r, i, editing)).join('') || '<div class="muted" style="font-size:12px">Sin requisitos registrados.</div>'}</div>
    </div>`;
  }
  function ramoRow(a, r, i, editing) {
    const pct = (a.comisiones && a.comisiones[r] != null) ? a.comisiones[r] : (a.comisionDefault || 12);
    const hab = !!(a.ramosHabilitados && a.ramosHabilitados[r] && a.ramosHabilitados[r].cotizador === true);
    const det = (a.ramosDetalle && a.ramosDetalle[r]) || {};
    return `<div class="ct-cell"><span>${U.esc(r)}</span><div class="ct-inp"><input type="number" min="0" max="100" step="0.5" data-ramopct="${U.esc(r)}" value="${pct}" ${editing ? '' : 'disabled'}><span>%</span></div>
      <input class="o-sel" data-ramoseg="${U.esc(r)}" placeholder="Segmento (Individual/Flota/Colectivo)" value="${U.esc(det.segmento || '')}" style="font-size:11px;margin-top:4px" ${editing ? '' : 'disabled'}>
      <input class="o-sel" data-ramoplan="${U.esc(r)}" placeholder="Plan (Básico/Amplio/Premium)" value="${U.esc(det.plan || '')}" style="font-size:11px;margin-top:4px" ${editing ? '' : 'disabled'}>
      <label style="display:flex;align-items:center;gap:4px;font-size:10.5px;margin-top:4px"><input type="checkbox" data-ramohab="${U.esc(r)}" ${hab ? 'checked' : ''} ${editing ? '' : 'disabled'}><b>${hab ? 'Habilitado' : 'NO habilitado'}</b> p/ Cotizador</label></div>`;
  }
  function reqRow(r, i, editing) {
    const ro = editing ? '' : 'disabled';
    return `<div class="asg-row" data-req="${i}">
      <input class="o-sel" data-rp placeholder="Producto" value="${U.esc(r.producto || '')}" style="flex:1" ${ro}>
      <input class="o-sel" data-ri placeholder="Requisitos" value="${U.esc(r.items || '')}" style="flex:2.2" ${ro}>
      ${editing ? `<button class="asg-del" data-del="docsRequeridos:${i}">✕</button>` : ''}
    </div>`;
  }

  /* ---- Documentos y Drive ---- */
  const CATS_DOC = ['Formulario', 'Clausulado', 'Condiciones', 'Póliza ejemplo', 'Cotización ejemplo', 'Anexo', 'Manual', 'Circular'];
  function tabDocumentos(a, editing) {
    const docs = a.docs || [];
    return `<div class="asg-sec">
      <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">Documentos y Drive ${editing ? '<button class="btn ghost sm" id="af-add-doc">+ Documento</button>' : ''}</div>
      <div id="af-docs">${docs.map((d, i) => docRow(d, i, editing, a)).join('') || '<div class="muted" style="font-size:12px">Sin documentos cargados.</div>'}</div>
      ${editing ? '<button class="btn ghost sm" id="af-imp-doc" style="margin-top:9px">✨ Importar documentos (mapeo inteligente)</button>' : ''}
    </div>`;
  }
  function docRow(d, i, editing, a) {
    const ro = editing ? '' : 'disabled';
    const nd = normalizarFuente(Object.assign({ id: d.id || ('doc' + i) }, d), a);
    const ev = evaluarFuente(nd);
    return `<div class="asg-row" data-doc="${i}" style="flex-wrap:wrap">
      <span style="font-size:14px">📎</span>
      <input class="o-sel" data-dn value="${U.esc(d.nombre || '')}" style="flex:1.1" ${ro}>
      <select class="o-sel" data-dc style="flex:1" ${ro}>${CATS_DOC.map(c => `<option ${c === d.cat ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select class="o-sel" data-dr style="width:100px" ${ro}><option value="">Ramo…</option>${(a.ramos || []).map(r => `<option ${r === d.ramo ? 'selected' : ''}>${r}</option>`).join('')}</select>
      <select class="o-sel" data-dpais style="width:65px" ${ro}><option ${(d.pais || a.pais) === 'GT' ? 'selected' : ''}>GT</option><option ${(d.pais || a.pais) === 'CO' ? 'selected' : ''}>CO</option></select>
      <select class="o-sel" data-dmon style="width:75px" ${ro}><option ${(d.moneda || nd.moneda) === 'GTQ' ? 'selected' : ''}>GTQ</option><option ${(d.moneda || nd.moneda) === 'COP' ? 'selected' : ''}>COP</option><option ${(d.moneda || nd.moneda) === 'USD' ? 'selected' : ''}>USD</option></select>
      <input class="o-sel" data-dseg placeholder="Segmento" value="${U.esc(d.segmento || '')}" style="width:110px" ${ro}>
      <span class="badge ${ev.estado.indexOf('incompleto') >= 0 ? 'danger' : ev.estado.indexOf('Habilitado') === 0 ? 'ok' : 'neutral'}" style="font-size:10px">${ev.estado}</span>
      ${editing ? `<button class="asg-del" data-del="docs:${i}">✕</button>` : ''}
    </div>`;
  }

  /* ---- Tarifas y conocimiento (secundaria, motor real) ---- */
  function tabTarifas(a, editing) {
    const resumen = resumenFuentes(a);
    const grupos = resumenGrupos(a);
    const ramos = a.ramos || [];
    const id = a.id;
    tarifaRamoSel[id] = tarifaRamoSel[id] || ramos[0] || '';
    const ramoSel = tarifaRamoSel[id];
    return `<div class="asg-sec">
      <div class="asg-sec-t">🧮 Tarifas y conocimiento — sección administrativa avanzada</div>
      <div class="cfg-note" style="margin-bottom:9px">Cada documento se organiza por país/moneda/ramo/producto (+segmento/plan/tipo de riesgo cuando aplica) y define qué puede hacerse con él (tarifas, reglas, presentación, comparativo, condiciones, casos de prueba). <b>Procesar un documento nunca habilita automáticamente</b> Cotizador/Comparativo.</div>
      <div class="asg-tarifas-est">${Object.keys(resumen).filter(k => resumen[k] > 0).map(k => `<span class="badge ${k.indexOf('incompleto') >= 0 ? 'danger' : k.indexOf('Habilitado') === 0 ? 'ok' : 'neutral'}" style="font-size:10.5px">${k} (${resumen[k]})</span>`).join('') || '<span class="muted" style="font-size:12px">Sin fuentes cargadas todavía.</span>'}</div>
      <div style="margin-top:12px;display:grid;gap:8px">
        ${grupos.map(g => `<div class="asg-row" style="background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px"><span style="flex:1;font-size:12px">${U.esc(g.label)}</span><span class="badge ${g.estado === 'Conocimiento incompleto' ? 'danger' : g.estado === 'Habilitado' ? 'ok' : 'neutral'}" style="font-size:10px">${g.estado}</span><span class="muted" style="font-size:11px">${g.docs.length} doc(s)</span></div>`).join('') || ''}
      </div>
      ${extraKnowledgeHtml(a)}
      ${editing ? '<button class="btn ghost sm" id="af-imp-doc2" style="margin-top:12px">✨ Importar documento tarifario</button>' : ''}
      ${ramos.length ? tablaTasasRamo(a, ramoSel, editing) : '<div class="cfg-note" style="margin-top:12px">Agregá al menos un ramo en la pestaña Productos y planes para configurar su tabla de tasas automáticas.</div>'}
    </div>`;
  }
  /* ---- Tabla de tasas automáticas del Cotizador, POR RAMO — sin esto, calcTasas() del Cotizador siempre queda bloqueado (nunca se usa un valor genérico) ---- */
  const tarifaRamoSel = {};
  /* valida tramos antes de habilitar el cálculo automático */
  function tramosValidos(tramos) {
    if (!tramos || !tramos.length) return false;
    const tasaPositiva = tramos.every(r => r.tasa > 0);
    const minimoNoNegativo = tramos.every(r => r.min >= 0);
    const rangoEnOrden = tramos.every((r, i) => i === 0 || r.hasta > tramos[i - 1].hasta);
    return tasaPositiva && minimoNoNegativo && rangoEnOrden;
  }
  function tablaTasasRamo(a, ramo, editing) {
    const cfg = (a.cotTasas && a.cotTasas[ramo]) || {};
    const tramos = cfg.auto || [];
    const validada = !!(a.cotTasasValidadas && a.cotTasasValidadas[ramo]);
    const puedeValidar = tramos.length > 0 && !!cfg.fuenteDocumentoId && !!cfg.version && !!cfg.vigencia && tramosValidos(tramos);
    return `<div class="asg-sec-t" style="margin-top:16px">📊 Tabla de tasas automáticas · Cotizador</div>
      <div class="cfg-note" style="margin-bottom:9px">Sin esta tabla <b>validada</b>, el Cotizador nunca calcula automático para esta aseguradora/ramo — el asesor solo puede usar modo ✍️ Manual con la prima que le den. Cada ramo tiene su propia tabla.</div>
      <label class="ce-l" style="max-width:260px">Ramo a configurar<select id="tf-ramo" class="o-sel" ${editing ? '' : 'disabled'}>${(a.ramos || []).map(r => `<option ${r === ramo ? 'selected' : ''}>${U.esc(r)}</option>`).join('')}</select></label>
      <div style="overflow-x:auto;margin-top:8px"><table class="tbl" id="tf-tabla"><thead><tr><th>Hasta (valor asegurado)</th><th>Tasa %</th><th>Prima mínima</th><th></th></tr></thead><tbody>
        ${tramos.map((r, i) => `<tr data-tftr="${i}"><td><input class="o-sel" type="number" data-tf-hasta value="${r.hasta || 0}" ${editing ? '' : 'disabled'}></td><td><input class="o-sel" type="number" step="0.01" data-tf-tasa value="${r.tasa || 0}" ${editing ? '' : 'disabled'}></td><td><input class="o-sel" type="number" data-tf-min value="${r.min || 0}" ${editing ? '' : 'disabled'}></td><td>${editing ? `<button class="asg-del" data-tf-del="${i}">✕</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="4" class="muted" style="text-align:center;padding:10px">Sin tramos — ${editing ? 'agregá el primero' : 'sin configurar'}</td></tr>`}
      </tbody></table></div>
      ${editing ? '<button class="btn ghost sm" id="tf-add" style="margin-top:8px">➕ Tramo</button>' : ''}
      <div class="cgrid" style="margin-top:14px">
        <label class="ce-l">Recargo fraccionamiento — 2 pagos %<input class="o-sel" type="number" step="0.1" id="tf-rf2" value="${(cfg.recargoFraccPct && cfg.recargoFraccPct[2]) || 0}" ${editing ? '' : 'disabled'}></label>
        <label class="ce-l">4 pagos %<input class="o-sel" type="number" step="0.1" id="tf-rf4" value="${(cfg.recargoFraccPct && cfg.recargoFraccPct[4]) || 0}" ${editing ? '' : 'disabled'}></label>
        <label class="ce-l">6 pagos %<input class="o-sel" type="number" step="0.1" id="tf-rf6" value="${(cfg.recargoFraccPct && cfg.recargoFraccPct[6]) || 0}" ${editing ? '' : 'disabled'}></label>
        <label class="ce-l">12 pagos %<input class="o-sel" type="number" step="0.1" id="tf-rf12" value="${(cfg.recargoFraccPct && cfg.recargoFraccPct[12]) || 0}" ${editing ? '' : 'disabled'}></label>
        ${ramo === 'Auto' ? `<label class="ce-l">Recargo por antigüedad — año límite<input class="o-sel" type="number" id="tf-ra-anio" value="${(cfg.recargoAntiguedad && cfg.recargoAntiguedad.anioLimite) || ''}" placeholder="Ej. 2015" ${editing ? '' : 'disabled'}></label><label class="ce-l">% recargo si es anterior<input class="o-sel" type="number" step="0.1" id="tf-ra-pct" value="${(cfg.recargoAntiguedad && cfg.recargoAntiguedad.pct) || ''}" ${editing ? '' : 'disabled'}></label>` : ''}
        <label class="ce-l">Gastos de emisión GT %<input class="o-sel" type="number" step="0.1" id="tf-ge-gt" value="${(cfg.gastosEmisionPct && cfg.gastosEmisionPct.GT) || 0}" ${editing ? '' : 'disabled'}></label>
        <label class="ce-l">Gastos de emisión CO %<input class="o-sel" type="number" step="0.1" id="tf-ge-co" value="${(cfg.gastosEmisionPct && cfg.gastosEmisionPct.CO) || 0}" ${editing ? '' : 'disabled'}></label>
        <label class="ce-l">Documento fuente (referencia)<input class="o-sel" id="tf-fuente" value="${U.esc(cfg.fuenteDocumentoId || '')}" placeholder="Ej. Tarifario Auto 2026" ${editing ? '' : 'disabled'}></label>
        <label class="ce-l">Versión<input class="o-sel" id="tf-version" value="${U.esc(cfg.version || '')}" placeholder="v2026-1" ${editing ? '' : 'disabled'}></label>
        <label class="ce-l">Vigencia<input class="o-sel" id="tf-vigencia" value="${U.esc(cfg.vigencia || '')}" placeholder="2026-01 a 2026-12" ${editing ? '' : 'disabled'}></label>
      </div>
      <label class="ce-l ck" style="margin-top:10px"><input type="checkbox" id="tf-validada" ${validada ? 'checked' : ''} ${editing && puedeValidar ? '' : 'disabled'}> Tabla validada y habilitada para cálculo automático de ${U.esc(ramo)}</label>
      ${!puedeValidar && editing ? '<div class="cfg-note" style="margin-top:6px">Agregá al menos un tramo con tasas y mínimos válidos, en orden ascendente, y completá documento fuente + versión + vigencia antes de poder validar.</div>' : ''}`;
  }

  /* ---- Actividad ---- */
  function tabActividad(a) {
    const hist = a.actividad || [];
    return `<div class="asg-sec">
      <div class="asg-sec-t">🕒 Actividad</div>
      <div class="cfg-note" style="margin-bottom:9px">Cambios visibles de esta ficha, con actor real y motivo. Existe además un registro de auditoría interno que se conserva aunque la aseguradora se elimine.</div>
      ${hist.length ? hist.map(h => `<div style="font-size:12px;padding:7px 0;border-bottom:1px dashed var(--line-2)"><b>${U.esc(h.cambio || 'Actualización')}</b> · ${U.esc(h.responsable || 'equipo')} · <span class="muted">${h.fecha ? new Date(h.fecha).toLocaleString() : ''}</span>${h.motivo ? '<div class="muted">Motivo: ' + U.esc(h.motivo) + '</div>' : ''}${h.camposCambiados ? '<div class="muted">Campos: ' + h.camposCambiados.join(', ') + '</div>' : ''}</div>`).join('') : '<div class="muted" style="font-size:12px">Sin actividad registrada.</div>'}
    </div>`;
  }

  /* ---- wiring: todo muta el DRAFT en memoria; nada llama up() salvo Guardar cambios ---- */
  function wireBody(back, data, t) {
    const body = back.querySelector('#af-body');
    const id = back.dataset.id;
    const st = fichaState[id];
    const editing = st.editing;
    const draft = st.draft; // objeto mutable cuando editing=true

    body.querySelectorAll('[data-open-portal]').forEach(b => b.addEventListener('click', () => window.open(b.dataset.openPortal.match(/^https?:/) ? b.dataset.openPortal : 'https://' + b.dataset.openPortal, '_blank', 'noopener')));

    if (!editing) return; // en modo vista no hay nada que mutar

    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const [key, idx] = b.dataset.del.split(':');
      draft[key] = (draft[key] || []).slice(); draft[key].splice(+idx, 1);
      selectTab(t);
    }));
    const syncField = () => { /* no-op: se lee directamente del DOM al guardar la pestaña vía snapshot() abajo */ };

    function snapshotTab() {
      // vuelca lo que hay en el DOM de esta pestaña hacia el draft ANTES de repintar/cambiar de tab
      if (t === 'resumen') {
        const g = s => (body.querySelector(s) || {}).value || '';
        Object.assign(draft, { nombre: g('#af-nombre') || draft.nombre, nit: g('#af-nit'), codigoIntermediario: g('#af-cod'), web: g('#af-web'), responsable: g('#af-resp'), telGeneral: g('#af-tel'), emergencia: g('#af-emer'), ultimaRevision: g('#af-rev'), observaciones: g('#af-obs') });
        draft.facturacion = Object.assign({}, draft.facturacion, { razonSocial: g('#af-rs'), dirFiscal: g('#af-dir') });
      }
      if (t === 'contactos') {
        draft.contactos = [...body.querySelectorAll('[data-cont]')].map(r => ({ nombre: r.querySelector('[data-cn]').value, area: r.querySelector('[data-ca]').value, email: r.querySelector('[data-ce]').value, tel: r.querySelector('[data-cl]').value, ext: r.querySelector('[data-cext]').value, cargo: r.querySelector('[data-cargo]').value, pais: r.querySelector('[data-cpais]').value, canal: r.querySelector('[data-cchan]').value, vigencia: r.querySelector('[data-cvig]').value, gestionPreferida: r.querySelector('[data-cgest]').value, principal: r.querySelector('[data-cppal]').checked }));
      }
      if (t === 'plataformas') {
        const previous = draft.portales || [];
        draft.portales = [...body.querySelectorAll('[data-portal]')].map((r, idx) => {
          const prior = previous[idx] || {};
          const resourceId = clean(prior.id || r.dataset.resourceId || String(idx));
          const portal = Object.assign({}, prior, { id: prior.id || (resourceId.indexOf('portal_') === 0 ? resourceId : undefined), nombre: r.querySelector('[data-pn]').value, tipo: r.querySelector('[data-ptipo]').value, url: r.querySelector('[data-pu]').value, usuario: r.querySelector('[data-puser]').value, pais: r.querySelector('[data-ppais]').value, estadoAcceso: r.querySelector('[data-pest]').value, responsable: r.querySelector('[data-presp]').value, ultimaVerificacion: r.querySelector('[data-pver]').value, credentialRef: prior.credentialRef || 'backend_required' });
          const password = r.querySelector('[data-ppass]');
          if (password && password.value) st.credentialDrafts[resourceId] = { portalId: resourceId, credentialRef: portal.credentialRef, username: portal.usuario, password: password.value };
          return portal;
        });
        draft.drive = (body.querySelector('#af-drive') || {}).value || draft.drive || '';
      }
      if (t === 'bancos') {
        const previous = draft.cuentas || [];
        draft.cuentas = [...body.querySelectorAll('[data-cta]')].map((r, idx) => Object.assign({}, previous[idx] || {}, { banco: r.querySelector('[data-cb]').value, tipo: r.querySelector('[data-ctt]').value, numero: r.querySelector('[data-ccn]').value, moneda: r.querySelector('[data-cm]').value, titular: r.querySelector('[data-ctit]').value, linkPago: r.querySelector('[data-clink]').value, ultimaVerificacion: r.querySelector('[data-cver]').value }));
      }
      if (t === 'productos') {
        body.querySelectorAll('[data-ramopct]').forEach(inp => { draft.comisiones = draft.comisiones || {}; draft.comisiones[inp.dataset.ramopct] = +inp.value || 0; });
        body.querySelectorAll('[data-ramoseg],[data-ramoplan]').forEach(inp => {
          const r = inp.dataset.ramoseg || inp.dataset.ramoplan; draft.ramosDetalle = draft.ramosDetalle || {}; draft.ramosDetalle[r] = draft.ramosDetalle[r] || {};
        });
        (draft.ramos || []).forEach(r => {
          const segEl = body.querySelector(`[data-ramoseg="${CSS.escape(r)}"]`), planEl = body.querySelector(`[data-ramoplan="${CSS.escape(r)}"]`), habEl = body.querySelector(`[data-ramohab="${CSS.escape(r)}"]`);
          draft.ramosDetalle = draft.ramosDetalle || {}; draft.ramosDetalle[r] = draft.ramosDetalle[r] || {};
          if (segEl) draft.ramosDetalle[r].segmento = segEl.value; if (planEl) draft.ramosDetalle[r].plan = planEl.value;
          draft.ramosHabilitados = draft.ramosHabilitados || {}; draft.ramosHabilitados[r] = Object.assign({}, draft.ramosHabilitados[r], { cotizador: habEl ? habEl.checked : false });
        });
        draft.docsRequeridos = [...body.querySelectorAll('[data-req]')].map(r => ({ producto: r.querySelector('[data-rp]').value, items: r.querySelector('[data-ri]').value }));
      }
      if (t === 'documentos') {
        const prevDocs = draft.docs || [];
        draft.docs = [...body.querySelectorAll('[data-doc]')].map((r, idx) => Object.assign({}, prevDocs[idx] || {}, { nombre: r.querySelector('[data-dn]').value, cat: r.querySelector('[data-dc]').value, ramo: r.querySelector('[data-dr]').value, pais: r.querySelector('[data-dpais]').value, moneda: r.querySelector('[data-dmon]').value, segmento: r.querySelector('[data-dseg]').value }));
      }
      if (t === 'tarifas') {
        const ramo = tarifaRamoSel[draft.id] || (draft.ramos || [])[0];
        if (ramo) {
          const tramos = [...body.querySelectorAll('[data-tftr]')].map(r => ({ hasta: +r.querySelector('[data-tf-hasta]').value || 0, tasa: +r.querySelector('[data-tf-tasa]').value || 0, min: +r.querySelector('[data-tf-min]').value || 0 }));
          const g = s => { const el = body.querySelector(s); return el ? el.value : ''; };
          draft.cotTasas = draft.cotTasas || {};
          draft.cotTasas[ramo] = {
            auto: tramos,
            recargoFraccPct: { 1: 0, 2: +g('#tf-rf2') || 0, 4: +g('#tf-rf4') || 0, 6: +g('#tf-rf6') || 0, 12: +g('#tf-rf12') || 0 },
            recargoAntiguedad: { anioLimite: +g('#tf-ra-anio') || 0, pct: +g('#tf-ra-pct') || 0 },
            gastosEmisionPct: { GT: +g('#tf-ge-gt') || 0, CO: +g('#tf-ge-co') || 0 },
            fuenteDocumentoId: g('#tf-fuente'), version: g('#tf-version'), vigencia: g('#tf-vigencia')
          };
          const chk = body.querySelector('#tf-validada');
          draft.cotTasasValidadas = draft.cotTasasValidadas || {};
          const puedeValidarAhora = tramosValidos(tramos) && !!draft.cotTasas[ramo].fuenteDocumentoId && !!draft.cotTasas[ramo].version && !!draft.cotTasas[ramo].vigencia;
          if (chk) draft.cotTasasValidadas[ramo] = chk.checked && puedeValidarAhora;
        }
      }
    }
    st.snapshotCurrent = snapshotTab;

    // cualquier cambio de input actualiza el draft; Guardar fuerza además el snapshot de la pestaña visible.
    body.querySelectorAll('input,select,textarea').forEach(el => { el.addEventListener('change', snapshotTab); el.addEventListener('input', snapshotTab); });

    if (t === 'contactos') { const add = body.querySelector('#af-add-cont'); if (add) add.addEventListener('click', () => { snapshotTab(); draft.contactos = (draft.contactos || []).concat([{ id: 'contact_' + Date.now().toString(36), nombre: '', area: 'Comercial', email: '', tel: '', cargo: '', canal: 'Correo', principal: false }]); selectTab('contactos'); }); }
    if (t === 'plataformas') { const add = body.querySelector('#af-add-portal'); if (add) add.addEventListener('click', () => { snapshotTab(); draft.portales = (draft.portales || []).concat([{ id: 'portal_' + Date.now().toString(36), nombre: '', url: '', usuario: '', estadoAcceso: 'Sin verificar', credentialRef: 'backend_required' }]); selectTab('plataformas'); }); }
    if (t === 'bancos') { const add = body.querySelector('#af-add-cta'); if (add) add.addEventListener('click', () => { snapshotTab(); draft.cuentas = (draft.cuentas || []).concat([{ id: 'account_' + Date.now().toString(36), banco: '', tipo: 'Monetaria', numero: '', moneda: draft.pais === 'GT' ? 'GTQ' : 'COP', titular: '', linkPago: '', ultimaVerificacion: '' }]); selectTab('bancos'); }); }
    if (t === 'productos') {
      const addRamo = body.querySelector('#af-add-ramo'); if (addRamo) addRamo.addEventListener('click', async () => { const r = await Orbit.ui.prompt('Nombre del ramo:', { title: 'Agregar ramo' }); if (!r) return; snapshotTab(); const rr = (draft.ramos || []).slice(); if (rr.indexOf(r) < 0) rr.push(r); draft.ramos = rr; draft.comisiones = Object.assign({}, draft.comisiones); draft.comisiones[r] = draft.comisionDefault || 12; selectTab('productos'); });
      const addReq = body.querySelector('#af-add-req'); if (addReq) addReq.addEventListener('click', () => { snapshotTab(); draft.docsRequeridos = (draft.docsRequeridos || []).concat([{ producto: '', items: '' }]); selectTab('productos'); });
      const impCom = body.querySelector('#af-imp-com'); if (impCom) impCom.addEventListener('click', () => { if (!canEdit()) return; document.getElementById('asg-ficha').remove(); Orbit.importa.open('planillas-comision', { onDone: reload }); });
    }
    if (t === 'documentos') {
      const add = body.querySelector('#af-add-doc'); if (add) add.addEventListener('click', () => { snapshotTab(); draft.docs = (draft.docs || []).concat([{ id: 'doc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nombre: 'Documento.pdf', cat: 'Formulario', estado: 'Documento recibido', pais: draft.pais, moneda: draft.pais === 'GT' ? 'GTQ' : 'COP', ramo: '' }]); selectTab('documentos'); });
      const imp = body.querySelector('#af-imp-doc'); if (imp) imp.addEventListener('click', () => { if (!canEdit()) return; document.getElementById('asg-ficha').remove(); Orbit.importa.open('docs-aseguradora', { onDone: reload }); });
    }
    if (t === 'tarifas') {
      const imp = body.querySelector('#af-imp-doc2'); if (imp) imp.addEventListener('click', () => { if (!canEdit()) return; document.getElementById('asg-ficha').remove(); Orbit.importa.open('docs-aseguradora', { onDone: reload }); });
      const sel = body.querySelector('#tf-ramo'); if (sel) sel.addEventListener('change', () => { snapshotTab(); tarifaRamoSel[id] = sel.value; selectTab('tarifas'); });
      const add = body.querySelector('#tf-add'); if (add) add.addEventListener('click', () => { snapshotTab(); const ramo = tarifaRamoSel[id] || (draft.ramos || [])[0]; draft.cotTasas = draft.cotTasas || {}; draft.cotTasas[ramo] = draft.cotTasas[ramo] || { auto: [] }; draft.cotTasas[ramo].auto = (draft.cotTasas[ramo].auto || []).concat([{ hasta: 0, tasa: 0, min: 0 }]); selectTab('tarifas'); });
      body.querySelectorAll('[data-tf-del]').forEach(b => b.addEventListener('click', () => { snapshotTab(); const ramo = tarifaRamoSel[id] || (draft.ramos || [])[0]; if (draft.cotTasas && draft.cotTasas[ramo]) draft.cotTasas[ramo].auto.splice(+b.dataset.tfDel, 1); selectTab('tarifas'); }));
    }
  }

  /* ===================== KPI CON DETALLE ===================== */
  function kpi(tipo) {
    const base = S().all('aseguradoras').filter(a => paisOK(a.pais));
    let title = '', rows = [];
    if (tipo === 'activas') {
      title = 'Aseguradoras activas';
      rows = base.filter(a => a.vinculada !== false).map(a => ({ a, detalle: `${a.pais} · ${(a.ramos || []).length} ramos` }));
    } else if (tipo === 'contacto') {
      title = 'Con contacto principal';
      rows = base.map(a => { const c = (a.contactos || []).find(x => x.principal); return { a, detalle: c ? `👤 ${U.esc(c.nombre || c.area)}` : '⚠ Sin contacto principal — requiere asignar', falta: !c }; });
      rows.sort((x, y) => (x.falta === y.falta) ? 0 : (x.falta ? -1 : 1));
    } else if (tipo === 'acceso') {
      title = 'Con acceso disponible';
      base.forEach(a => (a.portales || []).forEach(p => rows.push({ a, detalle: `${U.esc(p.nombre || 'Plataforma')} · <span class="badge ${ACCESO_TONE[p.estadoAcceso] || 'neutral'}" style="font-size:10.5px">${p.estadoAcceso || 'Sin registrar'}</span> · última verificación: ${p.ultimaVerificacion || 'sin registrar'}` })));
      if (!rows.length) title += ' — sin plataformas registradas';
    } else if (tipo === 'docs') {
      title = 'Con documentación';
      base.forEach(a => (a.docs || []).forEach(d => rows.push({ a, detalle: `${U.esc(d.nombre || d.tipo || 'Documento')} · ${d.tipo || ''} · v${d.version || '1'} · vigencia: ${d.vigencia || 'sin definir'} · ${d.estado || 'pendiente'}` })));
    } else if (tipo === 'pend') {
      title = 'Requieren actualización';
      base.forEach(a => (a.portales || []).filter(p => p.estadoAcceso === 'Requiere actualización').forEach(p => rows.push({ a, detalle: `${U.esc(p.nombre || 'Plataforma')} · acción recomendada: reverificar acceso y actualizar credencial` })));
    }
    let back = document.getElementById('asg-kpi'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'asg-kpi'; back.className = 'drawer-back open'; back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(640px,94vw);max-height:86vh;overflow:auto;padding:20px 22px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:16px">${title}</b><button class="btn ghost sm" data-close>✕</button></div>
      <div class="muted" style="font-size:12px;margin-bottom:12px">${rows.length} registro(s) · país: ${Orbit.pais && Orbit.pais !== 'TODOS' ? Orbit.pais : 'todos'}</div>
      <div style="display:grid;gap:8px">${rows.length ? rows.map(r => `<div class="card pad" style="cursor:pointer" data-goto="${r.a.id}"><b>${U.esc(r.a.nombre)}</b><div class="muted" style="font-size:12px;margin-top:3px">${r.detalle}</div></div>`).join('') : '<div class="muted" style="padding:16px;text-align:center">Sin registros para este filtro.</div>'}</div>
    </div>`;
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) back.remove(); });
    back.querySelectorAll('[data-goto]').forEach(el => el.addEventListener('click', () => { back.remove(); ficha(el.dataset.goto); }));
  }

  return {
    render, ficha, kpi,
    __ownerKnowledgeV20260717: true,
    __tenantOrderV20260717: true,
    __consumerGatesSeparatedV20260717: true,
    _fuentes: { SOURCE_TYPES, SOURCE_STATES, DIMENSION_KEYS, normalizarFuente, evaluarFuente, resumenFuentes, resumenGrupos, knowledgeSources, sourceDimensions, sourceCombinationKey, groupLabel, legacyType }
  };
})();
