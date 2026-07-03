/* ============================================================
   Orbit 360 · Integraciones
   Helper seguro para emitir eventos de integracion por tenant.
   Demo/LAB: registra trazabilidad en Orbit.store. No envia secretos,
   no llama APIs externas desde modulos y no toca localStorage.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.integraciones = (function () {
  const API_VERSION = 'v0.7-configurar-tenant-contract';
  const STRUCT_VERSION = 37;
  let panelLoading = false;
  let labMockLoading = false;

  function extendSeed() {
    const seed = Orbit.SEED;
    if (!seed || seed.__integracionesSeedApplied) return;
    seed.integraciones = seed.integraciones || [
      { id: 'int_make_demo', tenantId: 'demo', proveedor: 'make', nombre: 'Make · Puente de automatizaciones', estado: 'pendiente_configuracion', modo: 'webhook', eventos: ['marketing_programar_publicacion', 'marketing_generar_pieza', 'marketing_sync_sheets', 'marketing_campana_email', 'marketing_whatsapp_broadcast', 'marketing_metricas_actualizadas'], webhookRef: '', scopes: [], paises: ['GT', 'CO'], modulos: ['marketing'], ultimaPruebaAt: '', ultimoError: '', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'int_metricool_demo', tenantId: 'demo', proveedor: 'metricool', nombre: 'Metricool · Programación y métricas', estado: 'pendiente_configuracion', modo: 'externo', eventos: ['marketing_programar_publicacion', 'marketing_publicacion_programada', 'marketing_metricas_actualizadas'], webhookRef: '', scopes: [], paises: ['GT', 'CO'], modulos: ['marketing'], ultimaPruebaAt: '', ultimoError: '', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'int_canva_demo', tenantId: 'demo', proveedor: 'canva', nombre: 'Canva · Piezas visuales', estado: 'pendiente_configuracion', modo: 'externo', eventos: ['marketing_generar_pieza'], webhookRef: '', scopes: [], paises: ['GT', 'CO'], modulos: ['marketing'], ultimaPruebaAt: '', ultimoError: '', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'int_sheets_demo', tenantId: 'demo', proveedor: 'google_sheets', nombre: 'Google Sheets · Calendario de contenidos', estado: 'pendiente_configuracion', modo: 'externo', eventos: ['marketing_sync_sheets'], webhookRef: '', scopes: [], paises: ['GT', 'CO'], modulos: ['marketing'], ultimaPruebaAt: '', ultimoError: '', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
    ];
    seed.eventosIntegracion = seed.eventosIntegracion || [];
    seed.campanas = seed.campanas || [
      { id: 'cmp_demo_1', tenantId: 'demo', nombre: 'Educación y confianza · Riesgos cotidianos', objetivo: 'educación', pais: 'GT', segmento: 'familias y profesionales', ramo: 'Auto / Vida / Hogar', estado: 'activa', fechaInicio: '2026-01-01', fechaFin: '2026-01-31', presupuesto: 0, responsable: 'Equipo Marketing', tags: ['educativo', 'confianza'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'cmp_demo_2', tenantId: 'demo', nombre: 'Renovaciones con valor', objetivo: 'retención', pais: 'CO', segmento: 'clientes con póliza por vencer', ramo: 'Renovaciones', estado: 'planificada', fechaInicio: '2026-01-01', fechaFin: '2026-02-15', presupuesto: 0, responsable: 'Equipo Comercial', tags: ['renovacion', 'retencion'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
    ];
    seed.piezas = seed.piezas || [];
    seed.metricasMarketing = seed.metricasMarketing || [];
    if (Array.isArray(seed.contenidos)) {
      seed.contenidos.forEach((c, idx) => {
        if (!c.tenantId) c.tenantId = 'demo';
        if (!c.campanaId) c.campanaId = idx % 2 === 0 ? 'cmp_demo_1' : 'cmp_demo_2';
        if (!c.objetivo) c.objetivo = c.estado === 'Publicado' ? 'confianza' : 'educación';
        if (!c.publico) c.publico = idx % 2 === 0 ? 'familias' : 'empresas';
        if (!c.pais) c.pais = idx % 2 === 0 ? 'GT' : 'CO';
        if (!Array.isArray(c.piezaIds)) c.piezaIds = [];
        if (!c.programacion) c.programacion = { proveedor: 'metricool', estado: c.estado === 'Programado' ? 'pendiente_configuracion' : '', fecha: c.fecha, hora: c.hora };
        if (c.stats) {
          const mid = 'mkm_' + c.id;
          if (!seed.metricasMarketing.find(m => m.id === mid)) seed.metricasMarketing.push({ id: mid, tenantId: 'demo', contenidoId: c.id, piezaId: '', campanaId: c.campanaId, canal: c.canal, fecha: c.fecha, alcance: c.stats.alcance || 0, impresiones: c.stats.impresiones || c.stats.alcance || 0, interacciones: c.stats.interac || 0, clics: c.stats.clics || 0, leads: c.stats.leads || 0, conversiones: 0, fuente: 'demo', raw: {}, createdAt: c.fecha + 'T00:00:00.000Z' });
        }
        if (idx < 4) {
          const pid = 'pieza_' + c.id;
          if (!seed.piezas.find(p => p.id === pid)) {
            c.piezaIds.push(pid);
            seed.piezas.push({ id: pid, tenantId: 'demo', contenidoId: c.id, campanaId: c.campanaId, tipo: c.tipo, canal: c.canal, formato: c.tipo, titulo: c.titulo, copy: c.copy, urlCanva: '', urlDrive: '', assetUrl: '', estado: c.estado === 'Publicado' ? 'publicada' : 'pendiente_diseno', responsable: c.responsable || 'Equipo Marketing', createdAt: c.fecha + 'T00:00:00.000Z', updatedAt: c.fecha + 'T00:00:00.000Z' });
          }
        }
      });
    }
    seed.__v = Math.max(seed.__v || 0, STRUCT_VERSION);
    seed.__integracionesSeedApplied = true;
  }

  extendSeed();
  installSafePrefGuard();

  function S() { return Orbit.store; }
  function nowIso() {
    try {
      if (Orbit.ui && Orbit.ui.nowIso) return Orbit.ui.nowIso();
      if (Orbit.ui && Orbit.ui.today) return Orbit.ui.today() + 'T00:00:00.000Z';
    } catch (e) {}
    return new Date().toISOString();
  }
  function id(prefix) { return (prefix || 'evt') + '_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8); }
  function tenantId() {
    try {
      if (window.OrbitBackend && OrbitBackend.status) return OrbitBackend.status().tenantId || 'demo';
    } catch (e) {}
    try {
      if (Orbit.tenant && Orbit.tenant.get) return Orbit.tenant.get().id || Orbit.tenant.get().tenantId || 'demo';
    } catch (e) {}
    return (window.Orbit && Orbit.tenantId) || 'demo';
  }
  function safe(obj) {
    const banned = /password|pass|secret|token|apikey|api_key|authorization|bearer|credential|private/i;
    function clean(v, k) {
      if (banned.test(k || '')) return '[redacted]';
      if (Array.isArray(v)) return v.map(x => clean(x, ''));
      if (v && typeof v === 'object') {
        const out = {};
        Object.keys(v).forEach(key => { out[key] = clean(v[key], key); });
        return out;
      }
      return v;
    }
    return clean(obj || {}, '');
  }
  function providerId(x) { return String(x || 'make').toLowerCase().replace(/[^a-z0-9_\-]/g, '_').replace(/^_+|_+$/g, '') || 'make'; }
  function sensitiveInput(v) { return !!(v && (v.key || v.url || v.token || v.oauthUrl || v.endpoint)); }
  function sanitizeIntegrationPref(prefKey, value) {
    const v = value && typeof value === 'object' ? value : {};
    const hasInput = !!(v.key || v.url || v.user || v.activa || v.token || v.oauthUrl || v.endpoint);
    return {
      id: String(prefKey || '').replace(/^integ_/, ''),
      activa: !!v.activa,
      configured: hasInput,
      estado: v.activa ? 'pendiente_backend' : 'pendiente_configuracion',
      userRef: v.user ? 'capturado_no_sensible' : '',
      credentialRef: sensitiveInput(v) ? 'backend_required' : '',
      webhookRef: (v.url || v.endpoint) ? 'backend_required' : '',
      updatedAt: new Date().toISOString(),
      note: 'Configuracion sanitizada: no se guardan credenciales ni endpoints reales en frontend.'
    };
  }
  function installSafePrefGuard() {
    try {
      if (!Orbit.store || !Orbit.store.setPref || Orbit.__integracionesPrefGuard) return;
      const original = Orbit.store.setPref.bind(Orbit.store);
      Orbit.store.setPref = function (key, value) {
        if (/^integ_/.test(String(key || ''))) value = sanitizeIntegrationPref(key, value);
        return original(key, value);
      };
      Orbit.__integracionesPrefGuard = true;
    } catch (e) {}
  }
  function integrationId(tid, proveedor) { return 'intcfg_' + providerId(tid) + '_' + providerId(proveedor); }
  function upsertIntegration(row) {
    try {
      const rows = S().all('integraciones') || [];
      const found = rows.find(x => x && (x.id === row.id || (x.tenantId === row.tenantId && x.proveedor === row.proveedor)));
      if (found) return S().update('integraciones', found.id, Object.assign({}, found, row, { updatedAt: nowIso() }));
      return S().insert('integraciones', row);
    } catch (e) { return row; }
  }
  function configurar(proveedor, datos, opts) {
    opts = opts || {};
    datos = datos || {};
    const p = providerId(proveedor || datos.proveedor || opts.proveedor || 'make');
    const tid = opts.tenantId || datos.tenantId || tenantId();
    const hasSensitive = sensitiveInput(datos);
    const activa = !!(datos.activa || opts.activa);
    const row = {
      id: opts.id || integrationId(tid, p),
      tenantId: tid,
      proveedor: p,
      nombre: datos.nombre || opts.nombre || p,
      estado: activa ? 'pendiente_backend' : 'pendiente_configuracion',
      modo: datos.modo || opts.modo || 'backend_seguro',
      eventos: Array.isArray(datos.eventos) ? datos.eventos : (Array.isArray(opts.eventos) ? opts.eventos : []),
      scopes: Array.isArray(datos.scopes) ? datos.scopes : [],
      paises: Array.isArray(datos.paises) ? datos.paises : [],
      modulos: Array.isArray(datos.modulos) ? datos.modulos : [],
      activa,
      configured: !!(hasSensitive || datos.user || activa),
      credentialRef: hasSensitive ? 'backend_required' : '',
      webhookRef: (datos.url || datos.endpoint) ? 'backend_required' : '',
      userRef: datos.user ? 'capturado_no_sensible' : '',
      backendRequired: true,
      lastConfigAttemptAt: nowIso(),
      ultimoError: activa ? 'Pendiente backend seguro para persistencia tenant-wide.' : '',
      createdAt: datos.createdAt || nowIso(),
      updatedAt: nowIso(),
      apiVersion: API_VERSION
    };
    const saved = upsertIntegration(row);
    try { if (S() && S()._emit) S()._emit('integraciones'); } catch (e) {}
    return safe(Object.assign({}, saved || row, { inputCaptured: hasSensitive, inputPersistedInFrontend: false }));
  }
  function findAutomation(evento) {
    try {
      return (S().all('automatizaciones') || []).find(a => a && a.evento === evento && a.activo !== false) || null;
    } catch (e) { return null; }
  }
  function findIntegration(proveedor, evento) {
    try {
      const rows = S().all('integraciones') || [];
      return rows.find(i => {
        if (!i || i.estado === 'inactivo') return false;
        if (proveedor && i.proveedor !== proveedor) return false;
        if (Array.isArray(i.eventos) && evento && !i.eventos.includes(evento)) return false;
        return true;
      }) || null;
    } catch (e) { return null; }
  }
  function insertEvento(row) {
    try { return S().insert('eventosIntegracion', row); }
    catch (e) {
      try { console.warn('[Orbit.integraciones] no se pudo registrar evento', e, row); } catch (_) {}
      return row;
    }
  }
  function emit(evento, payload, opts) {
    opts = opts || {};
    if (!evento) throw new Error('Orbit.integraciones.emit requiere evento');
    const automation = findAutomation(evento);
    const proveedor = opts.proveedorPreferido || opts.proveedor || (automation && automation.proveedorPreferido) || (payload && payload.proveedorPreferido) || 'make';
    const integration = findIntegration(proveedor, evento);
    const tid = opts.tenantId || (payload && payload.tenantId) || tenantId();
    const row = {
      id: id('int'),
      tenantId: tid,
      evento,
      modulo: opts.modulo || (payload && payload.modulo) || 'general',
      entidad: opts.entidad || (payload && payload.entidad) || '',
      entidadId: opts.entidadId || (payload && payload.entidadId) || '',
      proveedor,
      estado: integration ? 'pendiente' : 'pendiente_configuracion',
      requestResumen: safe(payload || {}),
      responseResumen: null,
      error: integration ? '' : 'Integracion no configurada para ' + proveedor + ' / ' + evento,
      apiVersion: API_VERSION,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    insertEvento(row);
    try { document.dispatchEvent(new CustomEvent('orbit:integracion', { detail: row })); } catch (e) {}
    try { if (S() && S()._emit) S()._emit('eventosIntegracion'); } catch (e) {}
    return row;
  }
  function list(filter) {
    filter = filter || {};
    let rows = [];
    try { rows = (S().all('eventosIntegracion') || []).slice(); } catch (e) { rows = []; }
    if (filter.modulo) rows = rows.filter(r => r.modulo === filter.modulo);
    if (filter.evento) rows = rows.filter(r => r.evento === filter.evento);
    if (filter.proveedor) rows = rows.filter(r => r.proveedor === filter.proveedor);
    if (filter.estado) rows = rows.filter(r => r.estado === filter.estado);
    if (filter.entidad) rows = rows.filter(r => r.entidad === filter.entidad);
    if (filter.entidadId) rows = rows.filter(r => r.entidadId === filter.entidadId);
    rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const limit = Number(filter.limit || 50);
    return rows.slice(0, limit).map(r => safe(Object.assign({}, r)));
  }
  function resumen() {
    const rows = list({ limit: 10000 });
    const byEstado = {}, byProveedor = {}, byEvento = {}, byModulo = {};
    rows.forEach(r => {
      byEstado[r.estado || 'sin_estado'] = (byEstado[r.estado || 'sin_estado'] || 0) + 1;
      byProveedor[r.proveedor || 'sin_proveedor'] = (byProveedor[r.proveedor || 'sin_proveedor'] || 0) + 1;
      byEvento[r.evento || 'sin_evento'] = (byEvento[r.evento || 'sin_evento'] || 0) + 1;
      byModulo[r.modulo || 'general'] = (byModulo[r.modulo || 'general'] || 0) + 1;
    });
    return { apiVersion: API_VERSION, tenantId: tenantId(), total: rows.length, byEstado, byProveedor, byEvento, byModulo, ultimos: rows.slice(0, 10) };
  }
  function status() {
    const r = resumen();
    const pendientes = (r.byEstado.pendiente || 0) + (r.byEstado.pendiente_configuracion || 0);
    const errores = (r.byEstado.error || 0) + r.ultimos.filter(x => x.error).length;
    return { apiVersion: API_VERSION, tenantId: tenantId(), eventos: r.total, pendientes, errores };
  }
  function diagnostico(filter) {
    return { status: status(), resumen: resumen(), eventos: list(filter || { limit: 25 }) };
  }
  function ensurePanel(cb) {
    if (Orbit.integracionesPanel && Orbit.integracionesPanel.open) { if (cb) cb(); return; }
    if (panelLoading) { setTimeout(() => ensurePanel(cb), 180); return; }
    panelLoading = true;
    const s = document.createElement('script');
    s.src = 'core/integraciones-panel.js?v1296';
    s.onload = function () { panelLoading = false; if (cb) cb(); };
    s.onerror = function () { panelLoading = false; try { Orbit.ui.toast('No se pudo cargar el panel de integraciones.'); } catch (e) {} };
    document.head.appendChild(s);
  }
  function openPanel(filter) {
    ensurePanel(function () {
      if (Orbit.integracionesPanel && Orbit.integracionesPanel.open) Orbit.integracionesPanel.open(filter || {});
    });
  }
  function ensureLabMock(cb) {
    if (Orbit.integracionesLabMock) { if (cb) cb(Orbit.integracionesLabMock); return; }
    if (labMockLoading) { setTimeout(() => ensureLabMock(cb), 180); return; }
    labMockLoading = true;
    const s = document.createElement('script');
    s.src = 'core/integraciones-lab-mock.js?v1296';
    s.onload = function () { labMockLoading = false; if (cb) cb(Orbit.integracionesLabMock); };
    s.onerror = function () { labMockLoading = false; try { Orbit.ui.toast('No se pudo cargar la simulación LAB.'); } catch (e) {} };
    document.head.appendChild(s);
  }
  function labMock(action, idEvento, opts) {
    ensureLabMock(function (mock) {
      if (!mock) return;
      const fn = mock[action || 'ciclo'];
      if (typeof fn === 'function') fn(idEvento, opts || {});
    });
  }
  function mark(idEvento, patch) {
    patch = patch || {};
    patch.updatedAt = nowIso();
    try { return S().update('eventosIntegracion', idEvento, patch); }
    catch (e) { return null; }
  }
  return { emit, configurar, status, list, resumen, diagnostico, openPanel, ensureLabMock, labMock, mark, extendSeed, sanitizeIntegrationPref, version: API_VERSION };
})();
