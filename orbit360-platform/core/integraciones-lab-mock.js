/* ============================================================
   Orbit 360 · Integraciones LAB Mock
   Simula ciclo de entrega sin llamadas externas, sin secretos y sin producción.
   Uso futuro: cargar solo en demo/LAB para probar estados de eventos.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.integracionesLabMock = (function () {
  const VERSION = 'v0.1-lab-mock-no-network';
  function S() { return Orbit.store; }
  function nowIso() { return new Date().toISOString(); }
  function safeId(id) { return String(id || '').trim(); }
  function getEvento(id) {
    try { return S().get('eventosIntegracion', safeId(id)); }
    catch (e) { return null; }
  }
  function mark(id, patch) {
    if (!Orbit.integraciones || !Orbit.integraciones.mark) return null;
    return Orbit.integraciones.mark(id, Object.assign({ updatedAt: nowIso() }, patch || {}));
  }
  function enviar(id, opts) {
    opts = opts || {};
    const ev = getEvento(id);
    if (!ev) return { ok: false, error: 'evento_no_encontrado', id: safeId(id), version: VERSION };
    if (ev.estado === 'pendiente_configuracion' && !opts.forzar) {
      return { ok: false, error: 'pendiente_configuracion', id: ev.id, estado: ev.estado, version: VERSION };
    }
    const correlationId = 'lab_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8);
    const patch = {
      estado: 'enviado',
      error: '',
      correlationId,
      responseResumen: {
        modo: 'lab_mock',
        proveedor: ev.proveedor || 'make',
        mensaje: 'Evento simulado en LAB. No se envio a ningun proveedor externo.',
        enviadoAt: nowIso()
      }
    };
    mark(ev.id, patch);
    return { ok: true, id: ev.id, estado: 'enviado', correlationId, version: VERSION };
  }
  function confirmar(id, extra) {
    const ev = getEvento(id);
    if (!ev) return { ok: false, error: 'evento_no_encontrado', id: safeId(id), version: VERSION };
    mark(ev.id, {
      estado: 'confirmado',
      error: '',
      responseResumen: Object.assign({}, ev.responseResumen || {}, {
        modo: 'lab_mock',
        confirmadoAt: nowIso(),
        resultado: 'confirmado_sin_envio_real'
      }, extra || {})
    });
    return { ok: true, id: ev.id, estado: 'confirmado', version: VERSION };
  }
  function fallar(id, mensaje) {
    const ev = getEvento(id);
    if (!ev) return { ok: false, error: 'evento_no_encontrado', id: safeId(id), version: VERSION };
    mark(ev.id, {
      estado: 'error',
      error: mensaje || 'Error simulado en LAB',
      responseResumen: Object.assign({}, ev.responseResumen || {}, {
        modo: 'lab_mock',
        errorAt: nowIso()
      })
    });
    return { ok: true, id: ev.id, estado: 'error', version: VERSION };
  }
  function ciclo(id, opts) {
    const sent = enviar(id, Object.assign({ forzar: true }, opts || {}));
    if (!sent.ok) return sent;
    if (opts && opts.error) return fallar(id, opts.error === true ? 'Error simulado en LAB' : opts.error);
    return confirmar(id, { cicloCompleto: true });
  }
  function ultimos(filter) {
    if (!Orbit.integraciones || !Orbit.integraciones.list) return [];
    return Orbit.integraciones.list(Object.assign({ limit: 10 }, filter || {}));
  }
  return { version: VERSION, enviar, confirmar, fallar, ciclo, ultimos };
})();
