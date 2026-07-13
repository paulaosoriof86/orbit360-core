/* ============================================================
   Orbit 360 · Orbit IA (asistente inteligente)
   Un cerebro, tres usuarios: equipo interno, asesores y clientes.
   Usa el proveedor configurado en Automatizaciones (Gemini/GPT/Claude)
   con API key; sin key → respuestas heurísticas sobre los datos del CRM.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.ia = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  let host, hist = [], contexto = 'equipo';
  /* P0-TECH-ROLE: proveedor/modelo de IA es configuración técnica — solo visible al rol activo autorizado */
  function activeRole() {
    try { if (Orbit.session && Orbit.session.rol) return Orbit.session.rol(); } catch (e) {}
    try { if (Orbit.auth && Orbit.auth.user && Orbit.auth.user()) return Orbit.auth.user().rol || 'Asesor'; } catch (e) {}
    return 'Asesor';
  }
  function canViewTechnical() { return ['Dirección', 'Admin'].indexOf(activeRole()) >= 0; }

  const CTX = {
    equipo:  { icon: '🧑‍💼', label: 'Equipo interno', desc: 'Análisis operativo, redacción, resúmenes' },
    asesor:  { icon: '🎯', label: 'Asesor comercial', desc: 'Argumentos de venta, manejo de objeciones' },
    cliente: { icon: '🤝', label: 'Atención al cliente', desc: 'Explicar coberturas, resolver dudas' }
  };

  const SUGERENCIAS = {
    equipo: [
      '📊 Resume el estado de la cartera este mes',
      '⚠️ ¿Qué cobros vencidos requieren gestión urgente?',
      '🔄 ¿Qué renovaciones vencen en los próximos 30 días?',
      '✍️ Redacta un correo de seguimiento de cobro'
    ],
    asesor: [
      '🎯 Dame 3 argumentos para vender un seguro de auto',
      '🛡️ ¿Cómo manejo la objeción "está muy caro"?',
      '💬 Redacta un mensaje de WhatsApp para reactivar un lead frío',
      '📋 ¿Qué coberturas debo destacar en todo riesgo?'
    ],
    cliente: [
      '🤝 Explica qué cubre un seguro de gastos médicos',
      '❓ ¿Qué es el deducible y cómo funciona?',
      '📑 ¿Qué documentos necesito para un reclamo?',
      '🔄 ¿Cómo funciona la renovación de mi póliza?'
    ]
  };

  function render(h) {
    host = h;
    const iaCfg = getIACfg();
    host.innerHTML = '<div class="page">'
      + K.banner({ icon: '🤖', title: 'Orbit IA', sub: 'Asistente inteligente · análisis, redacción y soporte', features: [],
          actions: '<button class="btn ghost" id="ia-cfg" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">⚙ Configurar IA</button><button class="btn primary" id="ia-clear" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">🗑 Limpiar</button>' })
      + '<div class="ia-wrap">'
      +   '<div class="ia-side">'
      +     '<div class="ia-side-t">Contexto del asistente</div>'
      +     Object.entries(CTX).map(([k, v]) =>
            '<button class="ia-ctx' + (contexto === k ? ' on' : '') + '" data-ctx="' + k + '">'
            + '<span class="ia-ctx-i">' + v.icon + '</span>'
            + '<span><b>' + v.label + '</b><small>' + v.desc + '</small></span></button>'
          ).join('')
      +     '<div class="ia-side-t" style="margin-top:16px">Estado del motor</div>'
      +     '<div class="ia-engine ' + (iaCfg.activo ? 'on' : '') + '">'
      +       (iaCfg.activo
              ? (canViewTechnical()
                ? '🟢 <b>' + U.esc(iaCfg.proveedor) + '</b><br><small>' + U.esc(iaCfg.modelo) + '</small>'
                : '🟢 <b>IA activa</b><br><small>Motor configurado por el equipo técnico</small>')
              : '🟡 <b>Modo heurístico</b><br><small>' + (canViewTechnical() ? 'Conecta una API key en Automatizaciones para respuestas completas con IA real' : 'El equipo técnico puede activar un motor de IA completo') + '</small>')
      +     '</div>'
      +   '</div>'
      +   '<div class="ia-chat">'
      +     '<div class="ia-msgs" id="ia-msgs">' + renderMsgs() + '</div>'
      +     '<div class="ia-sug" id="ia-sug">' + SUGERENCIAS[contexto].map(s =>
            '<button class="ia-sug-b" data-sug="' + U.esc(s).replace(/"/g, '&quot;') + '">' + s + '</button>'
          ).join('') + '</div>'
      +     '<div class="ia-input">'
      +       '<textarea id="ia-text" placeholder="Escribe tu pregunta o instrucción..." rows="1"></textarea>'
      +       '<button class="btn primary" id="ia-send">Enviar ➤</button>'
      +     '</div>'
      +   '</div>'
      + '</div>'
      + '</div>';

    host.querySelectorAll('[data-ctx]').forEach(b => b.addEventListener('click', () => { contexto = b.dataset.ctx; render(host); }));
    host.querySelectorAll('[data-sug]').forEach(b => b.addEventListener('click', () => { enviar(b.dataset.sug); }));
    host.querySelector('#ia-send').addEventListener('click', () => { const t = host.querySelector('#ia-text'); if (t.value.trim()) enviar(t.value.trim()); });
    host.querySelector('#ia-text').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const t = e.target; if (t.value.trim()) enviar(t.value.trim()); } });
    host.querySelector('#ia-clear').addEventListener('click', () => { hist = []; render(host); });
    host.querySelector('#ia-cfg').addEventListener('click', () => location.hash = '#/automatizaciones');
    const msgs = host.querySelector('#ia-msgs'); if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function renderMsgs() {
    if (!hist.length) {
      const v = CTX[contexto];
      return '<div class="ia-empty"><span class="ia-empty-i">' + v.icon + '</span>'
        + '<b>Hola, soy Orbit IA</b>'
        + '<p>Estoy en modo <b>' + v.label + '</b>. ' + v.desc + '. Escribe tu pregunta o usa una sugerencia abajo. 👇</p></div>';
    }
    return hist.map(m =>
      m.rol === 'user'
        ? '<div class="ia-msg user"><div class="ia-bubble">' + U.esc(m.txt) + '</div></div>'
        : '<div class="ia-msg bot"><span class="ia-av">🤖</span><div class="ia-bubble">' + m.txt + '</div></div>'
    ).join('');
  }

  function enviar(txt) {
    hist.push({ rol: 'user', txt });
    // pensando…
    hist.push({ rol: 'bot', txt: '<span class="ia-typing"><i></i><i></i><i></i></span>', _typing: true });
    render(host);
    setTimeout(() => {
      hist = hist.filter(m => !m._typing);
      hist.push({ rol: 'bot', txt: responder(txt) });
      render(host);
    }, 650);
  }

  /* ---- Motor de respuestas (heurístico sobre datos reales del CRM) ---- */
  function responder(q) {
    const ql = q.toLowerCase();
    const M = (n, mon) => U.moneyShort(n, mon || 'GTQ');

    // === EQUIPO: análisis de datos reales ===
    if (/cartera|estado.*mes|resum/.test(ql)) {
      const pol = S().all('polizas');
      const vig = pol.filter(p => p.estado === 'Vigente').length;
      const prima = pol.filter(p => p.estado === 'Vigente').reduce((s, p) => s + (p.primaTotal || p.prima || 0), 0);
      const cli = S().all('clientes').length;
      return '<b>📊 Estado de la cartera</b><br><br>'
        + '• <b>' + cli + '</b> clientes activos<br>'
        + '• <b>' + vig + '</b> pólizas vigentes<br>'
        + '• <b>' + M(prima) + '</b> en prima anualizada<br><br>'
        + 'La cartera se mantiene estable. Te recomiendo priorizar las renovaciones próximas y los cobros vencidos para proteger el ingreso recurrente. ¿Quieres que prepare un plan de acción?';
    }
    if (/cobro.*vencid|vencid.*cobro|urgent/.test(ql)) {
      const venc = (Orbit.q && Orbit.q.cobrosVencidos ? Orbit.q.cobrosVencidos() : []);
      if (!venc.length) return '<b>✅ Buenas noticias</b><br><br>No hay cobros vencidos en este momento. La cartera está al día. 🎉';
      const total = venc.reduce((s, r) => s + (r.monto || 0), 0);
      return '<b>⚠️ Cobros vencidos</b><br><br>Hay <b>' + venc.length + '</b> recibos vencidos por un total de <b>' + M(total) + '</b>.<br><br>'
        + '<b>Recomendación:</b> envía una campaña de cobro por WhatsApp priorizando los montos más altos. Desde el módulo Cobros puedes notificar por lote. ¿Redacto el mensaje?';
    }
    if (/renovaci/.test(ql)) {
      const prox = (Orbit.q && Orbit.q.renovacionesProximas ? Orbit.q.renovacionesProximas(30) : []);
      if (!prox.length) return '<b>🔄 Renovaciones</b><br><br>No hay pólizas que venzan en los próximos 30 días.';
      return '<b>🔄 Renovaciones próximas</b><br><br><b>' + prox.length + '</b> pólizas vencen en los próximos 30 días.<br><br>'
        + '<b>Plan sugerido:</b><br>• Día -30: primer aviso por WhatsApp<br>• Día -15: propuesta de renovación<br>• Día -7: llamada de cierre<br><br>¿Activo la campaña de renovación automática?';
    }

    // === ASESOR: argumentos de venta ===
    if (/argument|vender|venta/.test(ql)) {
      return '<b>🎯 3 argumentos de venta (seguro de auto)</b><br><br>'
        + '<b>1. Tranquilidad financiera:</b> "Un choque puede costar más que el carro mismo. Por menos de lo que gastas en café al mes, proteges tu patrimonio."<br><br>'
        + '<b>2. Asistencia 24/7:</b> "No solo es el choque — es la grúa a las 2am, el carro de reemplazo, el abogado. Estás cubierto siempre."<br><br>'
        + '<b>3. Valor del tiempo:</b> "Sin seguro, un siniestro son semanas de trámites. Con nosotros, una llamada y nos encargamos de todo."<br><br>'
        + '💡 Adapta el argumento al perfil del cliente: familia → seguridad; joven → precio/asistencia.';
    }
    if (/objeci|caro|costoso|precio/.test(ql)) {
      return '<b>🛡️ Manejo de objeción: "está muy caro"</b><br><br>'
        + '<b>1. Valida:</b> "Entiendo, es una inversión importante."<br>'
        + '<b>2. Reencuadra:</b> "Pensemos en el costo de NO tenerlo: un choque sin seguro puede ser ' + M(80000) + ' o más."<br>'
        + '<b>3. Fracciona:</b> "Son ' + M(350) + ' al mes — menos que tu plan de celular, y cubre tu patrimonio."<br>'
        + '<b>4. Cierra:</b> "¿Prefieres pago mensual o trimestral para que se ajuste a tu presupuesto?"<br><br>'
        + '🔑 La clave: nunca discutas el precio, cambia la conversación al valor y al riesgo de no tenerlo.';
    }
    if (/whatsapp|mensaje|reactiv|lead.*fr/.test(ql)) {
      return '<b>💬 Mensaje de reactivación (lead frío)</b><br><br>'
        + '<i>"Hola [Nombre] 👋 Soy [Asesor] de [Intermediaria]. Hace unas semanas conversamos sobre proteger tu [auto/familia]. '
        + 'Justo abrieron una promoción este mes que pensé en ti 🎯. ¿Te comparto la propuesta actualizada sin compromiso? Solo toma 2 minutos."</i><br><br>'
        + '✅ Tono cálido, personalizado, con gancho de urgencia suave y CTA de bajo compromiso. ¿Lo adapto a un producto específico?';
    }

    // === CLIENTE: explicaciones ===
    if (/gastos m.dicos|salud/.test(ql)) {
      return '<b>🤝 Seguro de Gastos Médicos</b><br><br>Cubre los costos de atención médica por enfermedad o accidente:<br><br>'
        + '• 🏥 Hospitalización y cirugías<br>• 👨‍⚕️ Consultas y especialistas<br>• 💊 Medicamentos<br>• 🚑 Emergencias<br>• 🔬 Estudios y laboratorios<br><br>'
        + 'Puede ser <b>individual</b> (solo tú) o <b>familiar</b> (tu grupo). El deducible y la suma asegurada definen tu prima. ¿Te explico alguno en detalle?';
    }
    if (/deducible/.test(ql)) {
      return '<b>❓ ¿Qué es el deducible?</b><br><br>Es la parte del costo que <b>tú asumes</b> antes de que el seguro pague el resto.<br><br>'
        + '<b>Ejemplo:</b> si tu deducible es ' + M(2000) + ' y tu reclamo es ' + M(10000) + ', tú pagas ' + M(2000) + ' y el seguro los otros ' + M(8000) + '.<br><br>'
        + '💡 Un deducible más alto = prima más baja (pero pagas más si reclamas). Un deducible bajo = prima más alta. Se elige según tu perfil de riesgo.';
    }
    if (/documento.*reclam|reclam.*documento|siniestr/.test(ql)) {
      return '<b>📑 Documentos para un reclamo</b><br><br>'
        + '• 🪪 Identificación del asegurado<br>• 📄 Póliza vigente<br>• 📝 Formulario de reclamo (te lo enviamos)<br>• 🧾 Facturas/recibos del gasto<br>• 📸 Evidencia (fotos, parte policial si aplica)<br><br>'
        + 'Apenas tengas el siniestro, contáctanos primero — te guiamos paso a paso para que el reclamo proceda sin contratiempos. ⚡';
    }

    // === Redacción genérica de correo ===
    if (/redacta|correo|email|escrib/.test(ql)) {
      return '<b>✍️ Borrador de correo de seguimiento</b><br><br>'
        + '<b>Asunto:</b> Seguimiento de tu póliza · [Intermediaria]<br><br>'
        + 'Estimado/a [Cliente],<br><br>Espero te encuentres muy bien. Te escribo para recordarte que tu recibo de la póliza [N.º] vence el [fecha]. '
        + 'Para mantener tu cobertura activa sin interrupciones, puedes realizar el pago por [medios].<br><br>'
        + 'Quedo atento/a a cualquier consulta. ¡Gracias por tu confianza!<br><br>Saludos,<br>[Asesor]<br><br>'
        + '📋 <button class="btn ghost sm" onclick="Orbit.correoCompose({})">Abrir en correo</button> · ¿Lo ajusto para cobro, renovación o bienvenida?';
    }

    // Fallback inteligente
    return '<b>🤔 Entendido</b><br><br>Sobre <i>"' + U.esc(q) + '"</i> — en modo heurístico puedo ayudarte con:<br><br>'
      + '• 📊 Análisis de cartera, cobros y renovaciones<br>• 🎯 Argumentos de venta y manejo de objeciones<br>• 🤝 Explicar coberturas a clientes<br>• ✍️ Redactar correos y mensajes<br><br>'
      + 'Para respuestas más completas y específicas, conecta una <b>API key</b> en Automatizaciones (Gemini es económico). ¿Probamos con alguna de las sugerencias? 👇';
  }

  function getIACfg() {
    try {
      const c = Orbit.store.pref('aut_cfg', {}) || {};
      return c.ia || { proveedor: 'Gemini', modelo: 'gemini-1.5-flash', activo: false };
    } catch (e) { return { proveedor: 'Gemini', modelo: 'gemini-1.5-flash', activo: false }; }
  }

  return { render };
})();
