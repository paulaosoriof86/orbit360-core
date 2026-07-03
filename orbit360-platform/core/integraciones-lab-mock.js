/* Orbit 360 · Mock LAB Integraciones. No llama servicios externos. */
window.Orbit = window.Orbit || {};
Orbit.integracionesLabMock = (function () {
  function nowIso() { try { return Orbit.ui && Orbit.ui.nowIso ? Orbit.ui.nowIso() : new Date().toISOString(); } catch (e) { return new Date().toISOString(); } }
  function mark(id, patch) { if (!id || !Orbit.integraciones || !Orbit.integraciones.mark) return null; return Orbit.integraciones.mark(id, patch || {}); }
  function buscar(id) { try { return (Orbit.store.all('eventosIntegracion') || []).find(x => x.id === id) || null; } catch (e) { return null; } }
  function enviar(id, opts) {
    opts = opts || {};
    const ev = buscar(id);
    if (!ev) return null;
    if (ev.estado === 'pendiente_configuracion' && !opts.forzar) return mark(id, { error: 'Pendiente configuracion. No se envio a ningun proveedor externo.', responseResumen: { lab: true, enviado: false } });
    return mark(id, { estado: 'enviado', error: '', responseResumen: { lab: true, mensaje: 'No se envio a ningun proveedor externo', proveedor: ev.proveedor || '', enviadoAt: nowIso() } });
  }
  function confirmar(id, extra) { return mark(id, { estado: 'confirmado', error: '', responseResumen: Object.assign({ lab: true, confirmadoAt: nowIso(), mensaje: 'Confirmacion simulada LAB' }, extra || {}) }); }
  function fallar(id, mensaje) { return mark(id, { estado: 'error', error: mensaje || 'Error simulado LAB', responseResumen: { lab: true, errorAt: nowIso() } }); }
  function ciclo(id, opts) { opts = opts || {}; enviar(id, opts); setTimeout(() => confirmar(id, { ciclo: true }), Number(opts.delay || 260)); }
  function ultimos(filter) { try { return Orbit.integraciones && Orbit.integraciones.list ? Orbit.integraciones.list(filter || { limit: 10 }) : []; } catch (e) { return []; } }
  return { enviar, confirmar, fallar, ciclo, ultimos, version: 'v0.1-lab-mock' };
})();
