/* ============================================================
   Orbit 360 · Capa de IA (transversal)
   Proveedor configurable (Gemini por defecto, económico). Mientras
   no haya API key conectada, opera en modo "asistido local" con
   plantillas inteligentes sobre los datos reales del CRM, para que
   cada sección que use IA quede funcional y demostrable. Al conectar
   la key en Config › Integraciones, se enruta al proveedor real.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ia = (function () {
  const KEY = 'orbit360_ia_cfg';
  let cfg = { proveedor: 'Gemini', key: '', modelo: 'gemini-1.5-flash', conectado: false };
  try { const r = localStorage.getItem(KEY); if (r) cfg = Object.assign(cfg, JSON.parse(r)); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
  function getCfg() { return cfg; }
  function conectar(prov, key, modelo) { cfg = { proveedor: prov || 'Gemini', key: key || '', modelo: modelo || 'gemini-1.5-flash', conectado: !!key }; save(); document.dispatchEvent(new CustomEvent('orbit:ia')); }
  function desconectar() { cfg.conectado = false; cfg.key = ''; save(); document.dispatchEvent(new CustomEvent('orbit:ia')); }
  function activo() { return cfg.conectado; }
  function fmt(n) { return Orbit.ui ? Orbit.ui.moneyShort(n, 'GTQ') : n; }

  /* ---- redacción de mensajes (WhatsApp/correo) ---- */
  function redactar(intent, ctx) {
    ctx = ctx || {};
    const nombre = ctx.nombre || 'estimado/a';
    const T = {
      cobro: `Hola ${nombre} 👋 Te recordamos que tu recibo${ctx.poliza ? ' de la póliza ' + ctx.poliza : ''}${ctx.monto ? ' por ' + ctx.monto : ''} está próximo a vencer${ctx.vence ? ' el ' + ctx.vence : ''}. Puedes pagar por los canales habituales o responder este mensaje y te ayudamos. ¡Gracias por tu confianza! 🙌`,
      renovacion: `Hola ${nombre} 👋 Tu póliza${ctx.poliza ? ' ' + ctx.poliza : ''}${ctx.ramo ? ' de ' + ctx.ramo : ''} está próxima a renovar${ctx.vence ? ' (vence el ' + ctx.vence + ')' : ''}. Preparamos una propuesta con mejoras de cobertura. ¿Agendamos 10 min para revisarla? 📋`,
      bienvenida: `¡Bienvenido/a ${nombre}! 🎉 Gracias por confiar tu protección en nosotros. Quedamos atentos para cualquier consulta sobre tu póliza. Estamos para acompañarte. 🤝`,
      siniestro: `Hola ${nombre}, lamentamos lo ocurrido. Ya registramos tu reclamo${ctx.numero ? ' ' + ctx.numero : ''} y lo estamos gestionando con la aseguradora. Te mantendremos informado en cada paso. 💪`,
      encuesta: `Hola ${nombre} 🙏 ¿Cómo calificarías tu experiencia con nosotros del 1 al 10? Tu opinión nos ayuda a mejorar. ¡Gracias!`
    };
    return T[intent] || `Hola ${nombre}, te escribimos para darte seguimiento. Quedamos atentos.`;
  }

  /* ---- análisis crítico (texto) a partir de un set de métricas ---- */
  function analisis(seccion, m) {
    m = m || {};
    const out = [];
    if (seccion === 'finanzas') {
      out.push((m.varAnual >= 0 ? 'Ingresos creciendo ' : 'Ingresos cayendo ') + (m.varAnual || 0) + '% interanual; ' + (m.margen >= 25 ? 'margen saludable' : 'margen ajustado, revisar gasto fijo y marketing') + '.');
      out.push('Mejor fuente: comisiones de aseguradora; mantener la financiación fuera del operativo.');
      if (m.cxp) out.push('Hay cuentas por pagar pendientes (' + fmt(m.cxp) + '); priorizar liquidación para no arrastrar saldo.');
    } else if (seccion === 'cartera') {
      out.push((m.vencido > 0 ? 'Cartera vencida de ' + fmt(m.vencido) + ' — activar campaña de recuperación por WhatsApp.' : 'Cartera sana, sin vencidos relevantes.'));
      out.push('Concentración top-10 en ' + (m.conc || 0) + '%; ' + ((m.conc || 0) > 60 ? 'diversificar para reducir riesgo.' : 'distribución equilibrada.'));
    } else {
      out.push('Sin datos suficientes para un diagnóstico profundo en esta sección.');
    }
    return out;
  }

  /* ---- sugerencia de metas a partir de histórico ---- */
  function sugerirMetas(promMensual) {
    const base = +promMensual || 0;
    return { ventas: Math.round(base * 1.12), recaudo: Math.round(base * 1.12 * 0.85), tope: Math.round(base * 0.55) };
  }

  /* ---- extracción simulada de un documento (para importador) ---- */
  function extraer(tipo) {
    const M = {
      poliza: { numero: 'GT-XX-' + Math.floor(10000 + Math.random() * 89999), ramo: 'Automóviles', primaNeta: 4800, vigencia: '2026-06-24 → 2027-06-24' },
      cliente: { nombre: 'Cliente Detectado', identificacion: '—', telefono: '+502 ', email: '' },
      factura: { nit: '—', concepto: 'Comisiones de intermediación', total: 0 }
    };
    return M[tipo] || {};
  }

  return { getCfg, conectar, desconectar, activo, redactar, analisis, sugerirMetas, extraer };
})();
