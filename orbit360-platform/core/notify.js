/* ============================================================
   Orbit 360 · Notify — capa transversal de notificación al cliente
   Un solo punto para avisar al cliente por WhatsApp / correo y dejar
   traza en su expediente (actividades). Lo usan: aplicación de pagos,
   respuestas de gestión, envío de comparativo/cotización, renovaciones.
   No implementa backend: en WhatsApp abre wa.me; en correo abre el
   compositor Orbit (o mailto de respaldo). El backend puede sustituir
   `_deliver` por envío real sin tocar los llamadores.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.notify = (function () {
  const S = () => Orbit.store;

  function _tel(cli) { return String(cli.telefono || cli.whatsapp || '').replace(/[^0-9]/g, ''); }

  /* Entrega real (swappable por backend). Devuelve el canal usado. */
  function _deliver(cli, canal, asunto, mensaje, adjunto) {
    if (canal === 'whatsapp') {
      window.open('https://wa.me/' + _tel(cli) + '?text=' + encodeURIComponent(mensaje), '_blank');
      return 'WhatsApp';
    }
    // correo: usa el compositor Orbit si existe
    if (Orbit.modules && Orbit.modules.correo && Orbit.modules.correo.redactar) {
      Orbit.modules.correo.redactar({ para: cli.email || '', clienteId: cli.id, asunto: asunto || '', cuerpo: mensaje, adjunto: adjunto || '' });
      return 'Correo';
    }
    window.open('mailto:' + (cli.email || '') + '?subject=' + encodeURIComponent(asunto || '') + '&body=' + encodeURIComponent(mensaje), '_blank');
    return 'Correo';
  }

  /* Notifica al cliente y registra en su expediente.
     opts: { canal:'whatsapp'|'correo'|'auto', asunto, mensaje, tipo, icon, adjunto, silent } */
  function cliente(clienteId, opts) {
    opts = opts || {};
    const cli = S().get('clientes', clienteId);
    if (!cli) { Orbit.ui && Orbit.ui.toast && Orbit.ui.toast('Cliente no encontrado'); return null; }
    let canal = opts.canal || 'auto';
    if (canal === 'auto') canal = _tel(cli) ? 'whatsapp' : 'correo';
    const usado = _deliver(cli, canal, opts.asunto, opts.mensaje || '', opts.adjunto);
    // traza en expediente
    S().insert('actividades', {
      id: 'act' + Date.now() + Math.floor(Math.random() * 99),
      clienteId: cli.id, asesorId: cli.asesorId || '',
      tipo: canal === 'whatsapp' ? 'whatsapp' : 'correo',
      icon: opts.icon || (canal === 'whatsapp' ? '💬' : '✉'),
      fecha: (Orbit.ui && Orbit.ui.today) ? Orbit.ui.today() : new Date().toISOString().slice(0, 10),
      titulo: opts.tipo || 'Comunicación preparada',
      detalle: '(preparado, no confirmado) ' + (opts.asunto ? opts.asunto + ' · ' : '') + (opts.mensaje || '').slice(0, 120)
    });
    if (!opts.silent && Orbit.ui && Orbit.ui.toast) Orbit.ui.toast('✓ Mensaje preparado y abierto por ' + usado + ' — confirma con el cliente cuando lo reciba.');
    return { canal: usado };
  }

  /* Abre un pequeño selector de canal + preview antes de enviar.
     Útil para acciones donde el usuario quiere revisar el mensaje.
     opts igual que cliente() + { onSent } */
  function pedir(clienteId, opts) {
    opts = opts || {};
    const U = Orbit.ui, cli = S().get('clientes', clienteId);
    if (!cli) { U.toast('Cliente no encontrado'); return; }
    const tieneTel = !!_tel(cli), tieneMail = !!cli.email;
    let back = document.getElementById('notif-cli'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'notif-cli'; back.className = 'drawer-back open';
    back.style.cssText = 'display:grid;place-items:center;z-index:9550';
    back.innerHTML = `<div class="card" style="width:min(500px,95vw);padding:0">
      <div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph,#1E2227),#10141a);display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,255,255,.7)">Notificar al cliente</div>
          <b style="font-family:var(--f-display);font-size:16px;color:#fff">${U.esc(cli.nombre)}</b></div>
        <button class="imp-x" id="nc-x" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:#fff">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <div style="display:flex;gap:8px">
          <label class="nc-ch ${tieneTel ? '' : 'off'}" style="flex:1"><input type="radio" name="nc-canal" value="whatsapp" ${tieneTel ? 'checked' : 'disabled'} style="margin-right:6px">💬 WhatsApp ${tieneTel ? '' : '<span class="muted">(sin teléfono)</span>'}</label>
          <label class="nc-ch ${tieneMail ? '' : 'off'}" style="flex:1"><input type="radio" name="nc-canal" value="correo" ${!tieneTel && tieneMail ? 'checked' : ''} ${tieneMail ? '' : 'disabled'} style="margin-right:6px">✉ Correo ${tieneMail ? '' : '<span class="muted">(sin correo)</span>'}</label>
        </div>
        <label class="ce-l" id="nc-asunto-w" style="${!tieneMail ? 'display:none' : ''}">Asunto<input id="nc-asunto" class="o-sel" value="${U.esc(opts.asunto || '')}"></label>
        <label class="ce-l">Mensaje<textarea id="nc-msg" class="o-sel" style="min-height:110px;resize:vertical">${U.esc(opts.mensaje || '')}</textarea></label>
        ${opts.adjunto ? `<div class="cfg-note">📎 Adjunto: ${U.esc(opts.adjunto)}</div>` : ''}
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn ghost" id="nc-cancel">Cancelar</button><button class="btn primary" id="nc-send">Enviar</button></div>
    </div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s), close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#nc-x').addEventListener('click', close); $('#nc-cancel').addEventListener('click', close);
    back.querySelectorAll('[name="nc-canal"]').forEach(r => r.addEventListener('change', () => { $('#nc-asunto-w').style.display = $('#nc-msg') && back.querySelector('[name="nc-canal"]:checked').value === 'correo' ? '' : 'none'; }));
    $('#nc-send').addEventListener('click', () => {
      const canal = (back.querySelector('[name="nc-canal"]:checked') || {}).value || 'whatsapp';
      const res = cliente(clienteId, { canal, asunto: $('#nc-asunto') ? $('#nc-asunto').value : opts.asunto, mensaje: $('#nc-msg').value, tipo: opts.tipo, icon: opts.icon, adjunto: opts.adjunto });
      close(); if (opts.onSent) opts.onSent(res);
    });
  }

  return { cliente, pedir };
})();
