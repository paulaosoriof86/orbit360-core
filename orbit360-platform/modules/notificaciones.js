/* ============================================================
   Orbit 360 · Notificaciones WhatsApp
   Centro de mensajería saliente: plantillas, envíos por lote,
   registro vinculado a clientes. WhatsApp Web (wa.me) + API.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.notificaciones = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  let host, tab = 'enviar';

  const PLANTILLAS = [
    { id: 'cobro', icon: '💳', nombre: 'Recordatorio de cobro', txt: 'Hola {nombre} 👋, te recordamos que tu recibo de la póliza {poliza} vence el {fecha}. Para mantener tu cobertura activa, puedes pagar por {medios}. ¡Gracias!' },
    { id: 'renov', icon: '🔄', nombre: 'Aviso de renovación', txt: 'Hola {nombre} 👋, tu póliza {poliza} de {ramo} vence el {fecha}. Ya preparamos tu propuesta de renovación. ¿Te la comparto? 📋' },
    { id: 'bienvenida', icon: '🎉', nombre: 'Bienvenida', txt: '¡Bienvenido/a {nombre}! 🎉 Tu póliza {poliza} fue emitida con éxito. Cualquier consulta, estoy a tu servicio. ¡Gracias por tu confianza!' },
    { id: 'pago', icon: '✅', nombre: 'Confirmación de pago', txt: 'Hola {nombre} ✅, confirmamos la recepción de tu pago de {monto}. Tu cobertura está al día. ¡Gracias!' },
    { id: 'seguimiento', icon: '🎯', nombre: 'Seguimiento de propuesta', txt: 'Hola {nombre} 👋, ¿pudiste revisar la propuesta de {ramo} que te envié? Quedo atento a tus comentarios. 😊' },
    { id: 'cumple', icon: '🎂', nombre: 'Felicitación de cumpleaños', txt: '¡Feliz cumpleaños {nombre}! 🎂🎉 De parte de todo el equipo, te deseamos un día maravilloso.' }
  ];

  function getLog() { return Orbit.store.pref('wa_log', []) || []; }
  function addLog(e) { const l = getLog(); l.unshift(e); if (l.length > 80) l.pop(); Orbit.store.setPref('wa_log', l); }

  function countryCode(value) { return String(value == null ? '' : value).trim().toUpperCase(); }
  function activeCountry() { const p = countryCode(Orbit.pais); return p && p !== 'TODOS' ? p : ''; }
  function inCountry(value) {
    const p = countryCode(value), active = activeCountry();
    return (p === 'GT' || p === 'CO') && (!active || p === active);
  }
  function scopedRows(collection) {
    const rows = S().all(collection) || [];
    return Orbit.access && typeof Orbit.access.filter === 'function'
      ? Orbit.access.filter(collection, rows, 'notificaciones') : [];
  }
  function clientesElegibles() {
    return scopedRows('clientes').filter(c => c && c.id && c.telefono && inCountry(c.pais));
  }
  function polizasElegibles(cli) {
    if (!cli || !inCountry(cli.pais)) return [];
    const pais = countryCode(cli.pais);
    return scopedRows('polizas').filter(p => p && p.id && String(p.clienteId) === String(cli.id)
      && (!p.pais || countryCode(p.pais) === pais)
      && (!p.country || countryCode(p.country) === pais));
  }

  function render(h) {
    host = h;
    const log = getLog();
    const hoy = log.filter(l => l.fecha === new Date().toISOString().slice(0, 10)).length;
    host.innerHTML = '<div class="page">'
      + K.banner({ icon: '💬', title: 'Notificaciones WhatsApp', sub: 'Mensajería saliente · plantillas, envíos por lote y registro', features: [] })
      + K.kpis([
          { label: 'Preparados hoy', val: hoy, color: 'var(--ok)', foot: 'chats/eventos', onclick: "Orbit.modules.notificaciones&&0" },
          { label: 'Total registrados', val: log.length, color: 'var(--info)', foot: 'historial' },
          { label: 'Plantillas', val: PLANTILLAS.length, color: 'var(--red)', foot: 'disponibles' },
          { label: 'Canal', val: 'wa.me / API', color: 'var(--warn)', foot: 'Web abierto / Cloud pendiente' }
        ])
      + '<div class="tabs" style="max-width:420px;margin-bottom:16px">'
      +   '<div class="tab' + (tab === 'enviar' ? ' active' : '') + '" data-t="enviar">✍️ Enviar</div>'
      +   '<div class="tab' + (tab === 'plantillas' ? ' active' : '') + '" data-t="plantillas">📋 Plantillas</div>'
      +   '<div class="tab' + (tab === 'historial' ? ' active' : '') + '" data-t="historial">🗂 Historial</div>'
      + '</div>'
      + '<div id="wa-body">' + (tab === 'enviar' ? vEnviar() : tab === 'plantillas' ? vPlantillas() : vHistorial(log)) + '</div>'
      + '</div>';

    host.querySelectorAll('.tab[data-t]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.t; render(host); }));
    wire();
  }

  function vEnviar() {
    const clientes = clientesElegibles();
    return '<div class="card pad">'
      + '<div class="cgrid">'
      +   '<label class="ce-l">Plantilla<select id="wa-tpl" class="o-sel"><option value="">— Mensaje libre —</option>'
      +     PLANTILLAS.map(p => '<option value="' + p.id + '">' + p.icon + ' ' + p.nombre + '</option>').join('') + '</select></label>'
      +   '<label class="ce-l">Destinatario<select id="wa-cli" class="o-sel"><option value="">— Seleccionar cliente —</option>'
      +     clientes.map(c => '<option value="' + U.esc(c.id) + '">' + U.esc(c.nombre) + ' · ' + U.esc(c.telefono) + '</option>').join('') + '</select></label>'
      + '</div>'
      + '<label class="ce-l" style="margin-top:12px">Póliza del mensaje<select id="wa-pol" class="o-sel"><option value="">— Selecciona primero el destinatario —</option></select></label>'
      + '<label class="ce-l" style="margin-top:12px">Mensaje<textarea id="wa-msg" class="o-sel" style="min-height:120px;resize:vertical;padding:11px 13px;line-height:1.6" placeholder="Escribe el mensaje o elige una plantilla..."></textarea></label>'
      + '<div class="muted" style="font-size:11.5px;margin-top:6px">Variables: {nombre} {poliza} {ramo} {fecha} {monto} {medios}. Si hay varias pólizas, selecciona la correcta. Comprueba manualmente fecha y monto del recibo y medios de pago; los campos sin fuente verificada no se completan automáticamente.</div>'
      + '<div style="display:flex;gap:8px;margin-top:14px">'
      +   '<button class="btn primary" id="wa-send">💬 Abrir en WhatsApp Web</button>'
      +   '<button class="btn ghost" id="wa-api">📡 Registrar para API</button>'
      + '</div></div>';
  }

  function vPlantillas() {
    return '<div class="ase-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">'
      + PLANTILLAS.map(p => '<div class="card pad">'
        + '<div style="font-size:22px;margin-bottom:6px">' + p.icon + '</div>'
        + '<b style="font-family:var(--f-display);font-size:14px">' + p.nombre + '</b>'
        + '<p class="muted" style="font-size:12.5px;margin-top:6px;line-height:1.5">' + U.esc(p.txt) + '</p>'
        + '<button class="btn ghost sm" style="margin-top:10px" data-usetpl="' + p.id + '">Usar plantilla →</button>'
        + '</div>').join('')
      + '</div>';
  }

  function vHistorial(log) {
    if (!log.length) return '<div class="card pad" style="text-align:center;color:var(--ink-3)">Sin mensajes preparados todavía. Prepara tu primer mensaje desde la pestaña "Enviar".</div>';
    return '<div class="card" style="overflow:hidden"><table class="tbl"><thead><tr><th>Fecha</th><th>Cliente</th><th>Plantilla</th><th>Mensaje</th><th>Canal</th></tr></thead><tbody>'
      + log.map(l => '<tr>'
        + '<td class="mono" style="font-size:11.5px">' + U.esc(l.fecha) + '</td>'
        + '<td style="font-size:12.5px"><b>' + U.esc(l.cliente || '—') + '</b></td>'
        + '<td><span class="badge info" style="font-size:10px">' + U.esc(l.tpl || 'libre') + '</span></td>'
        + '<td style="font-size:12px;color:var(--ink-2);max-width:280px">' + U.esc((l.msg || '').slice(0, 70)) + '…</td>'
        + '<td><span class="badge" style="font-size:10px">' + U.esc(l.canal || 'wa.me abierto') + '</span></td>'
        + '</tr>').join('')
      + '</tbody></table></div>';
  }

  function resolverMsg(txt, cli, pol, plantillaId) {
    if (!cli) return txt;
    return txt
      .replace(/{nombre}/g, (cli.nombre || '').split(' ')[0])
      .replace(/{poliza}/g, pol && pol.numero ? pol.numero : '{poliza}')
      .replace(/{ramo}/g, pol && pol.ramo ? pol.ramo : '{ramo}')
      // La fecha de la póliza NO es el vencimiento de un recibo.
      .replace(/{fecha}/g, plantillaId === 'renov' && pol && pol.vigenciaFin ? U.fmtDate(pol.vigenciaFin) : '{fecha}');
  }

  function wire() {
    const $ = s => host.querySelector(s);
    const tplSel = $('#wa-tpl'), cliSel = $('#wa-cli'), polSel = $('#wa-pol'), msgBox = $('#wa-msg');
    const client = () => clientesElegibles().find(c => String(c.id) === String(cliSel && cliSel.value));
    const policy = cli => polizasElegibles(cli).find(p => String(p.id) === String(polSel && polSel.value));
    const updatePolicies = () => {
      if (!polSel) return;
      const cli = client(), pols = polizasElegibles(cli);
      polSel.innerHTML = '<option value="">— Seleccionar póliza —</option>'
        + pols.map(p => '<option value="' + U.esc(p.id) + '">' + U.esc(p.numero || p.producto || p.id) + ' · ' + U.esc(p.ramo || 'Ramo pendiente') + '</option>').join('');
      polSel.value = pols.length === 1 ? String(pols[0].id) : '';
    };
    const updateTemplate = () => {
      const p = PLANTILLAS.find(x => x.id === (tplSel && tplSel.value));
      if (p && msgBox) { const cli = client(); msgBox.value = resolverMsg(p.txt, cli, policy(cli), p.id); }
    };
    if (tplSel) tplSel.addEventListener('change', updateTemplate);
    if (cliSel) cliSel.addEventListener('change', () => { updatePolicies(); updateTemplate(); });
    if (polSel) polSel.addEventListener('change', updateTemplate);
    updatePolicies();
    const send = $('#wa-send');
    if (send) send.addEventListener('click', () => doSend('wa.me'));
    const api = $('#wa-api');
    if (api) api.addEventListener('click', () => doSend('API'));
    host.querySelectorAll('[data-usetpl]').forEach(b => b.addEventListener('click', () => {
      const p = PLANTILLAS.find(x => x.id === b.dataset.usetpl);
      tab = 'enviar'; render(host);
      setTimeout(() => { const t = host.querySelector('#wa-tpl'); if (t) { t.value = p.id; t.dispatchEvent(new Event('change')); } }, 50);
    }));
  }

  function doSend(canal) {
    const $ = s => host.querySelector(s);
    const cliEl = $('#wa-cli'), polEl = $('#wa-pol'), msgEl = $('#wa-msg'), tplEl = $('#wa-tpl');
    if (!cliEl || !msgEl) return; // form no montado
    const cli = clientesElegibles().find(c => String(c.id) === String(cliEl.value));
    const msg = (msgEl.value || '').trim();
    const tplId = tplEl ? tplEl.value : '';
    if (!msg) { Orbit.ui.toast('Escribe un mensaje primero.'); return; }
    if (!cli) { Orbit.ui.toast('Destinatario no disponible en tu país o ámbito actual.'); return; }
    const tpl = PLANTILLAS.find(p => p.id === tplId);
    if (tpl && /\{(?:poliza|ramo)\}/.test(tpl.txt) && !polizasElegibles(cli).some(p => String(p.id) === String(polEl && polEl.value))) {
      Orbit.ui.toast('Selecciona la póliza correcta para este mensaje.'); return;
    }
    if (/\{(?:nombre|poliza|ramo|fecha|monto|medios)\}/i.test(msg)) {
      Orbit.ui.toast('Completa y verifica las variables pendientes antes de abrir WhatsApp.'); return;
    }
    const canalLog = canal === 'API' ? 'API pendiente de conexión' : 'wa.me abierto';
    addLog({ fecha: new Date().toISOString().slice(0, 10), cliente: cli.nombre, tpl: tplId || 'libre', msg, canal: canalLog });
    // registrar en historial del cliente sin afirmar entrega confirmada
    S().insert('actividades', { id: 'act' + Date.now(), clienteId: cli.id, asesorId: cli.asesorId, tipo: 'whatsapp', icon: '💬', fecha: new Date().toISOString().slice(0, 10), titulo: 'Mensaje de WhatsApp preparado', detalle: msg.slice(0, 80) });
    if (canal === 'wa.me') {
      const tel = (cli.telefono || '').replace(/\D/g, '');
      window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(msg), '_blank');
      Orbit.ui.toast('Chat abierto en WhatsApp Web; confirma el envío en WhatsApp.');
    } else {
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = 'WhatsApp API pendiente de conexión. Evento registrado para integración.'; document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
    }
    tab = 'historial'; render(host);
  }

  return { render };
})();
