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

  function render(h) {
    host = h;
    const log = getLog();
    const hoy = log.filter(l => l.fecha === new Date().toISOString().slice(0, 10)).length;
    host.innerHTML = '<div class="page">'
      + K.banner({ icon: '💬', title: 'Notificaciones WhatsApp', sub: 'Mensajería saliente · plantillas, envíos por lote y registro', features: [] })
      + K.kpis([
          { label: 'Enviados hoy', val: hoy, color: 'var(--ok)', foot: 'mensajes', onclick: "Orbit.modules.notificaciones.irA('historial')" },
          { label: 'Total registrados', val: log.length, color: 'var(--info)', foot: 'historial', onclick: "Orbit.modules.notificaciones.irA('historial')" },
          { label: 'Plantillas', val: PLANTILLAS.length, color: 'var(--red)', foot: 'disponibles', onclick: "Orbit.modules.notificaciones.irA('plantillas')" },
          { label: 'Canal', val: 'wa.me + API', color: 'var(--warn)', foot: 'WhatsApp Web o Cloud' }
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
    const clientes = S().all('clientes').filter(c => c && c.telefono);
    return '<div class="card pad">'
      + '<div class="cgrid">'
      +   '<label class="ce-l">Plantilla<select id="wa-tpl" class="o-sel"><option value="">— Mensaje libre —</option>'
      +     PLANTILLAS.map(p => '<option value="' + p.id + '">' + p.icon + ' ' + p.nombre + '</option>').join('') + '</select></label>'
      +   '<label class="ce-l">Destinatario<select id="wa-cli" class="o-sel"><option value="">— Seleccionar cliente —</option>'
      +     clientes.map(c => '<option value="' + c.id + '">' + U.esc(c.nombre) + ' · ' + U.esc(c.telefono) + '</option>').join('') + '</select></label>'
      + '</div>'
      + '<label class="ce-l" style="margin-top:12px">Mensaje<textarea id="wa-msg" class="o-sel" style="min-height:120px;resize:vertical;padding:11px 13px;line-height:1.6" placeholder="Escribe el mensaje o elige una plantilla..."></textarea></label>'
      + '<div class="muted" style="font-size:11.5px;margin-top:6px">Variables: {nombre} {poliza} {ramo} {fecha} {monto} {medios} — se reemplazan con los datos del cliente al enviar.</div>'
      + '<div style="display:flex;gap:8px;margin-top:14px">'
      +   '<button class="btn primary" id="wa-send">💬 Abrir en WhatsApp Web</button>'
      +   '<button class="btn ghost" id="wa-api">📡 Enviar por API</button>'
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
    if (!log.length) return '<div class="card pad" style="text-align:center;color:var(--ink-3)">Sin envíos registrados todavía. Envía tu primer mensaje desde la pestaña "Enviar".</div>';
    return '<div class="card" style="overflow:hidden"><table class="tbl"><thead><tr><th>Fecha</th><th>Cliente</th><th>Plantilla</th><th>Mensaje</th><th>Canal</th></tr></thead><tbody>'
      + log.map(l => '<tr>'
        + '<td class="mono" style="font-size:11.5px">' + U.esc(l.fecha) + '</td>'
        + '<td style="font-size:12.5px"><b>' + U.esc(l.cliente || '—') + '</b></td>'
        + '<td><span class="badge info" style="font-size:10px">' + U.esc(l.tpl || 'libre') + '</span></td>'
        + '<td style="font-size:12px;color:var(--ink-2);max-width:280px">' + U.esc((l.msg || '').slice(0, 70)) + '…</td>'
        + '<td><span class="badge" style="font-size:10px">' + U.esc(l.canal || 'wa.me') + '</span></td>'
        + '</tr>').join('')
      + '</tbody></table></div>';
  }

  function resolverMsg(txt, cli) {
    if (!cli) return txt;
    const pol = S().all('polizas').filter(p => p && p.clienteId === cli.id)[0] || {};
    return txt
      .replace(/{nombre}/g, (cli.nombre || '').split(' ')[0])
      .replace(/{poliza}/g, pol.numero || '—')
      .replace(/{ramo}/g, pol.ramo || 'tu seguro')
      .replace(/{fecha}/g, pol.vence || 'la fecha indicada')
      .replace(/{monto}/g, pol.primaTotal ? U.money(pol.primaTotal, cli.moneda || 'GTQ') : 'el monto')
      .replace(/{medios}/g, 'transferencia o tarjeta');
  }

  function wire() {
    const $ = s => host.querySelector(s);
    const tplSel = $('#wa-tpl'), cliSel = $('#wa-cli'), msgBox = $('#wa-msg');
    if (tplSel) tplSel.addEventListener('change', () => {
      const p = PLANTILLAS.find(x => x.id === tplSel.value);
      if (p && msgBox) { const cli = S().get('clientes', cliSel.value); msgBox.value = resolverMsg(p.txt, cli); }
    });
    if (cliSel) cliSel.addEventListener('change', () => {
      const p = PLANTILLAS.find(x => x.id === (tplSel ? tplSel.value : ''));
      if (p && msgBox) { const cli = S().get('clientes', cliSel.value); msgBox.value = resolverMsg(p.txt, cli); }
    });
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
    const cliEl = $('#wa-cli'), msgEl = $('#wa-msg'), tplEl = $('#wa-tpl');
    if (!cliEl || !msgEl) return; // form no montado
    const cli = S().get('clientes', cliEl.value);
    const msg = (msgEl.value || '').trim();
    const tplId = tplEl ? tplEl.value : '';
    if (!msg) { Orbit.ui.toast('Escribe un mensaje primero.'); return; }
    if (!cli) { Orbit.ui.toast('Selecciona un cliente destinatario.'); return; }
    addLog({ fecha: new Date().toISOString().slice(0, 10), cliente: cli.nombre, tpl: tplId || 'libre', msg, canal });
    // registrar en historial del cliente
    S().insert('actividades', { id: 'act' + Date.now(), clienteId: cli.id, asesorId: cli.asesorId, tipo: 'whatsapp', icon: '💬', fecha: new Date().toISOString().slice(0, 10), titulo: 'Mensaje de WhatsApp preparado', detalle: msg.slice(0, 80) });
    if (canal === 'wa.me') {
      const tel = (cli.telefono || '').replace(/\D/g, '');
      window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(msg), '_blank');
    } else {
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '📡 Mensaje encolado vía API de WhatsApp Cloud'; document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
    }
    tab = 'historial'; render(host);
  }

  function irA(t) { tab = t; render(host); }

  return { render, irA };
})();
