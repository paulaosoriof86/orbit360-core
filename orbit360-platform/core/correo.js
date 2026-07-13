/* ============================================================
   Orbit 360 · Capa de correo (transversal)
   Bandeja integrada (Outlook/Gmail) + vínculo de correos a
   entidades (cliente, póliza, cobro, gestión, reclamo, aseguradora).
   Conector configurable: hoy opera sobre datos demo del store;
   al conectar la cuenta real, esta capa es el único punto a cablear.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.correo = (function () {
  const S = () => Orbit.store;
  const KEY = 'orbit360_correo_cfg';
  let cfg = { proveedor: '', cuenta: '', conectado: false };
  try { const r = localStorage.getItem(KEY); if (r) cfg = JSON.parse(r); } catch (e) {}
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }

  function all(carpeta) { return S().all('correos').filter(c => !carpeta || c.carpeta === carpeta); }
  /** Correos vinculados a una entidad (por tipo+id o por clienteId). */
  function deEntidad(tipo, id, clienteId) {
    return S().all('correos').filter(c => {
      if (c.vinculo && c.vinculo.tipo === tipo && c.vinculo.id === id) return true;
      if (clienteId && c.clienteId === clienteId && (tipo === 'cliente')) return true;
      return false;
    });
  }
  function deCliente(clienteId) { return S().all('correos').filter(c => c.clienteId === clienteId); }

  function marcarLeido(id, v) { S().update('correos', id, { leido: v !== false }); }
  function destacar(id) { const c = S().get('correos', id); if (c) S().update('correos', id, { destacado: !c.destacado }); }
  function vincular(id, vinculo) { S().update('correos', id, { vinculo }); }

  /** Redacta/registra un correo saliente vinculado a una entidad. */
  function enviar({ para, asunto, cuerpo, clienteId, vinculo, adjuntos }) {
    const c = {
      id: 'eml' + Date.now().toString().slice(-7),
      asunto: asunto || '(sin asunto)', de: cfg.cuenta || 'equipo@democorredores.com', para: para || '',
      remitenteNombre: 'Equipo Orbit', direccion: 'saliente',
      fecha: (Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10)), hora: new Date().toTimeString().slice(0, 5),
      leido: true, destacado: false, cuerpo: cuerpo || '', clienteId: clienteId || '',
      adjuntos: adjuntos || [], vinculo: vinculo || null, carpeta: 'preparados'
    };
    S().insert('correos', c);
    if (clienteId) S().insert('actividades', { id: 'act' + Date.now(), clienteId, asesorId: '', tipo: 'sistema', icon: '✉', fecha: (Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10)), titulo: 'Correo preparado: ' + c.asunto, detalle: 'Para ' + c.para + ' · pendiente de confirmación de entrega' });
    return c;
  }

  function getCfg() { return cfg; }
  function conectar(proveedor, cuenta) { cfg = { proveedor, cuenta, conectado: true }; saveCfg(); document.dispatchEvent(new CustomEvent('orbit:correo')); }
  function desconectar() { cfg = { proveedor: '', cuenta: '', conectado: false }; saveCfg(); document.dispatchEvent(new CustomEvent('orbit:correo')); }
  function noLeidos() { return S().all('correos').filter(c => c.carpeta === 'recibidos' && !c.leido).length; }

  return { all, deEntidad, deCliente, marcarLeido, destacar, vincular, enviar, getCfg, conectar, desconectar, noLeidos };
})();
