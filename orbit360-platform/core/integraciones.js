/* ============================================================
   Orbit 360 · Integraciones
   Helper seguro para emitir eventos de integracion por tenant.
   Demo/LAB: registra trazabilidad en Orbit.store. No envia secretos,
   no llama APIs externas desde modulos y no toca localStorage.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.integraciones = (function () {
  const API_VERSION = 'v0.1-demo-event-log';

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
  function status() {
    let eventos = 0, pendientes = 0, errores = 0;
    try {
      const rows = S().all('eventosIntegracion') || [];
      eventos = rows.length;
      pendientes = rows.filter(r => r.estado === 'pendiente' || r.estado === 'pendiente_configuracion').length;
      errores = rows.filter(r => r.estado === 'error' || r.error).length;
    } catch (e) {}
    return { apiVersion: API_VERSION, tenantId: tenantId(), eventos, pendientes, errores };
  }
  function mark(idEvento, patch) {
    patch = patch || {};
    patch.updatedAt = nowIso();
    try { return S().update('eventosIntegracion', idEvento, patch); }
    catch (e) { return null; }
  }
  return { emit, status, mark, version: API_VERSION };
})();
