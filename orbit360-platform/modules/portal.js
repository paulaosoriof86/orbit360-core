/* ============================================================
   Orbit 360 · Portal del Cliente (responsive · self-service)
   Vista del cliente final con sincronía real al expediente:
   pólizas, pagos (reportar soporte), siniestros, documentos
   (ver + añadir), aprendizaje, notificaciones reales (campana),
   asistente de chat y soporte directo al asesor. Las acciones
   notifican al equipo y dejan trazabilidad en el expediente.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.portal = (function () {
  const U = Orbit.ui, S = () => Orbit.store, q = Orbit.q;
  let host, clienteId, tab = 'inicio';
  // Localización: término por país del cliente activo
  function TT(k) { try { const c = S().get('clientes', clienteId) || {}; return (Orbit.termino ? Orbit.termino(k, c.pais) : k); } catch (e) { return k; } }

  function clientes() { return S().all('clientes'); }
  function notifsDe(cid) { return S().where('notifs', n => n.clienteId === cid).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')); }
  function noLeidas(cid) { return notifsDe(cid).filter(n => !n.leida).length; }

  function render(h) {
    host = h;
    if (!clienteId) clienteId = (clientes()[0] || {}).id;
    const cli = S().get('clientes', clienteId);
    if (!cli) { host.innerHTML = '<div class="page"><div class="modstate"><div class="ms-ico">🔒</div><h2>Portal del Cliente</h2><p>Sin clientes para previsualizar.</p></div></div>'; return; }
    // cláusula mutua de confidencialidad + tratamiento de datos al primer ingreso del cliente
    if (Orbit.legal && Orbit.legal.gate) Orbit.legal.gate('cliente', 'cliente:' + clienteId);
    const nl = noLeidas(clienteId);
    host.innerHTML = `<div class="page">
      <div class="pt-preview">👁 Vista previa del <b>Portal del Cliente</b> · viendo a
        <select id="pt-cli" class="o-sel" style="display:inline-block;width:auto;padding:4px 8px;margin:0 4px">${clientes().map(c => `<option value="${c.id}" ${c.id === clienteId ? 'selected' : ''}>${U.esc(c.nombre)}</option>`).join('')}</select>
        <button class="btn ghost sm" id="pt-admin" style="margin-left:8px">📢 Enviar notificación (admin)</button>
        <span style="float:right;color:var(--ink-3)">El portal real es <b>responsive</b> (móvil y escritorio)</span></div>
      <div class="pt-shell">
        <div class="pt-top">
          <div style="display:flex;align-items:center;gap:12px">
            <span class="pt-logo">🏢</span>
            <div><b style="font-family:var(--f-display);font-size:16px;color:#fff">Mi Portal</b><div style="font-size:11.5px;color:rgba(255,255,255,.7)">Hola, ${U.esc(cli.nombre.split(' ')[0])} 👋</div></div>
          </div>
          <button class="pt-bell" id="pt-bell">🔔${nl ? `<span class="pt-bell-c">${nl}</span>` : ''}</button>
        </div>
        <div class="pt-tabs">${[['inicio', '🏠 Inicio'], ['polizas', '📑 Pólizas'], ['recibos', '💳 Pagos'], ['siniestros', '🚨 Siniestros'], ['docs', '📁 Documentos'], ['aprende', '🎓 Aprende']].map(t => `<button class="pt-tab ${tab === t[0] ? 'on' : ''}" data-pt="${t[0]}">${t[1]}</button>`).join('')}</div>
        <div class="pt-body" id="pt-body"></div>
        <button class="pt-fab" id="pt-chat" title="Asistente">💬</button>
      </div>
    </div>`;
    const cob = q.cobrosDe(clienteId);
    const pols = q.polizasDe(clienteId).filter(p => p.estado !== 'Cancelada');
    const pend = cob.filter(c => c.estado === 'Pendiente' || c.estado === 'Vencido');
    const recl = S().where('reclamos', r => r.clienteId === clienteId);
    const body = document.getElementById('pt-body');
    if (tab === 'inicio') body.innerHTML = vInicio(cli, pols, pend, recl);
    else if (tab === 'polizas') body.innerHTML = vPolizas(pols);
    else if (tab === 'recibos') body.innerHTML = vRecibos(cob);
    else if (tab === 'siniestros') body.innerHTML = vSiniestros(recl);
    else if (tab === 'docs') body.innerHTML = vDocs(cli);
    else body.innerHTML = vAprende();
    // wiring
    host.querySelector('#pt-cli').addEventListener('change', e => { clienteId = e.target.value; tab = 'inicio'; render(host); });
    host.querySelector('#pt-admin').addEventListener('click', adminNotif);
    host.querySelector('#pt-bell').addEventListener('click', verNotifs);
    host.querySelector('#pt-chat').addEventListener('click', () => chat(cli));
    host.querySelectorAll('.pt-tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.pt; render(host); }));
    host.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.go; render(host); }));
    host.querySelectorAll('[data-sol]').forEach(b => b.addEventListener('click', () => solicitar(b.dataset.sol)));
    host.querySelectorAll('[data-pago]').forEach(b => b.addEventListener('click', () => reportarPago(b.dataset.pago)));
    host.querySelectorAll('[data-soporte]').forEach(b => b.addEventListener('click', () => soporteAsesor(cli)));
    host.querySelectorAll('[data-adddoc]').forEach(b => b.addEventListener('click', subirDoc));
    host.querySelectorAll('[data-doc]').forEach(b => b.addEventListener('click', () => verDocPortal(b.dataset.doc)));
    host.querySelectorAll('[data-curso]').forEach(b => b.addEventListener('click', () => verCursoPortal(b.dataset.curso)));
    host.querySelectorAll('[data-glos]').forEach(b => b.addEventListener('click', () => { if (Orbit.modules.academia && Orbit.glosarioPortal) Orbit.glosarioPortal(); else verCursoPortal('demo'); }));
    host.querySelectorAll('[data-pol]').forEach(b => b.addEventListener('click', () => detPoliza(b.dataset.pol)));
    host.querySelectorAll('[data-rec]').forEach(b => b.addEventListener('click', () => detRecibo(b.dataset.rec)));
    host.querySelectorAll('[data-sin]').forEach(b => b.addEventListener('click', () => detSiniestro(b.dataset.sin)));
    host.querySelectorAll('[data-glos]').forEach(b => b.addEventListener('click', glosario));
  }

  function vInicio(cli, pols, pend, recl) {
    return `<div class="pt-cards">
      <button class="pt-kpi" data-go="polizas"><span style="font-size:22px">📑</span><b style="font-size:24px;color:var(--info)">${pols.length}</b><span class="muted" style="font-size:11.5px">Pólizas activas</span></button>
      <button class="pt-kpi" data-go="recibos"><span style="font-size:22px">💳</span><b style="font-size:24px;color:${pend.length ? 'var(--warn)' : 'var(--ok)'}">${pend.length}</b><span class="muted" style="font-size:11.5px">Pagos pendientes</span></button>
      <button class="pt-kpi" data-go="siniestros"><span style="font-size:22px">🚨</span><b style="font-size:24px;color:var(--red)">${recl.length}</b><span class="muted" style="font-size:11.5px">Siniestros</span></button>
    </div>
    <div class="pt-quick">
      <button class="pt-action" data-sol="">🗂 Solicitar una gestión</button>
      <button class="pt-action" data-soporte="1">🧑‍💼 Hablar con mi asesor</button>
      <button class="pt-action" data-go="docs">📁 Completar mi expediente</button>
    </div>
    ${pend.length ? `<div class="pt-alert">⏰ Tienes <b>${pend.length}</b> pago(s) pendiente(s). <button class="pt-link" data-go="recibos">Ver mis pagos →</button></div>` : '<div class="pt-ok">✓ Estás al día con tus pagos. ¡Gracias!</div>'}`;
  }
  function vPolizas(pols) {
    return (pols.map(p => `<div class="pt-row pt-click" data-pol="${p.id}">
      <span class="pt-row-ic">${p.ramo === 'Auto' ? '🚗' : p.ramo === 'Vida' ? '❤️' : p.ramo === 'Hogar' ? '🏠' : '🛡️'}</span>
      <div style="flex:1"><b>${U.esc(p.producto || p.ramo)}</b><div class="muted" style="font-size:11.5px">${p.numero} · ${(q.aseguradora(p.aseguradoraId) || {}).nombre || ''}</div></div>
      <div style="text-align:right"><div style="font-family:var(--f-display);font-weight:700;font-size:13px">${U.money(p.prima, p.moneda)}</div><div class="muted" style="font-size:11px">vence ${U.fmtDate(p.vigenciaFin)} ›</div></div>
    </div>`).join('') || '<div class="pt-empty">No tienes pólizas activas.</div>') + '<button class="pt-action" style="margin-top:12px" data-sol="Consulta de cobertura">❓ Consultar una cobertura</button>';
  }
  function vRecibos(cob) {
    return (cob.filter(c => c.estado !== 'Anulado').sort((a, b) => (a.vence || '').localeCompare(b.vence || '')).map(c => {
      const tone = c.estado === 'Pagado' ? 'ok' : c.estado === 'Vencido' ? 'danger' : 'warn';
      const rep = c.reportado ? '<span class="badge info" style="font-size:9px">Reportado</span>' : '';
      return `<div class="pt-row pt-click" data-rec="${c.id}">
        <span class="pt-row-ic">${c.estado === 'Pagado' ? '✅' : '💳'}</span>
        <div style="flex:1"><b>Cuota ${c.cuota}</b><div class="muted" style="font-size:11.5px">vence ${U.fmtDate(c.vence)} ${rep}</div></div>
        <div style="text-align:right"><div style="font-family:var(--f-display);font-weight:700;font-size:13px">${U.money(c.monto, c.moneda)}</div>
          ${(c.estado === 'Pendiente' || c.estado === 'Vencido') && !c.reportado ? `<button class="pt-mini" data-pago="${c.id}" onclick="event.stopPropagation()">📤 Reportar pago</button>` : `<span class="badge ${tone}" style="font-size:10px">${c.estado}</span>`}</div>
      </div>`;
    }).join('') || '<div class="pt-empty">Sin pagos registrados.</div>');
  }
  function vSiniestros(recl) {
    return (recl.length ? recl.map(r => `<div class="pt-row pt-click" data-sin="${r.id}">
      <span class="pt-row-ic">🚨</span>
      <div style="flex:1"><b>${U.esc(r.tipo)}</b><div class="muted" style="font-size:11.5px">${r.numero} · ${U.fmtDate(r.fecha)} ›</div></div>
      <span class="badge ${['Pagado', 'Aprobado'].includes(r.estado) ? 'ok' : r.estado === 'Rechazado' ? 'danger' : 'info'}">${r.estado}</span>
    </div>`).join('') : '<div class="pt-empty">No tienes siniestros reportados.</div>') + '<button class="pt-action" style="margin-top:12px" data-sol="Reclamo / Siniestro">🚨 Reportar un siniestro</button>';
  }
  function vDocs(cli) {
    const docs = S().where('documentos', d => d.clienteId === cli.id);
    const faltan = !cli.identificacion || !cli.email;
    const rows = docs.length
      ? docs.map(d => `<div class="pt-row pt-click" data-doc="${d.id}"><span class="pt-row-ic">📄</span><div style="flex:1"><b>${U.esc(d.nombre || d.tipo)}</b><div class="muted" style="font-size:11.5px">${U.esc(d.tipo || 'documento')} ›</div></div><span class="muted" style="font-size:11px">${U.fmtDate(d.fecha)}</span></div>`).join('')
      : `<div class="pt-empty">Aún no tienes documentos en tu expediente.</div>`;
    return `${faltan ? `<div class="pt-alert">📋 Completa tu expediente para agilizar tus trámites. <button class="pt-link" data-adddoc="1">Subir documento →</button></div>` : ''}
      ${rows}
      <button class="pt-action" style="margin-top:12px" data-adddoc="1">⬆ Añadir un documento</button>`;
  }
  function vAprende() {
    const cursos = (S().all('cursos') || []).filter(c => c.cat === 'Producto' || c.cat === 'Educativo' || c.cat === 'Técnico').slice(0, 4);
    return `<div class="pt-empty" style="text-align:left;color:var(--ink-2);padding:0 0 12px">📚 Recursos para entender mejor tus seguros:</div>
      ${(cursos.length ? cursos : [{ emoji: '🛡️', titulo: 'Conoce tu seguro', desc: 'Coberturas, deducible y cómo usarlo.' }, { emoji: '🚗', titulo: 'Tu seguro de Auto', desc: 'Qué hacer ante un choque o robo.' }]).map(c => `<div class="pt-row pt-click" ${c.id ? `data-curso="${c.id}"` : 'data-curso="demo"'}><span class="pt-row-ic">${c.emoji || '📘'}</span><div style="flex:1"><b>${U.esc(c.titulo)}</b><div class="muted" style="font-size:11.5px">${U.esc(c.desc || '')}</div></div><button class="btn ghost sm">Ver ›</button></div>`).join('')}
      <button class="pt-action" style="margin-top:12px" data-glos="1">📖 Ver glosario de seguros</button>`;
  }

  /* ---- Notificaciones (campana) ---- */
  function verNotifs() {
    const cli = S().get('clientes', clienteId);
    const arr = notifsDe(clienteId);
    arr.forEach(n => { if (!n.leida) S().update('notifs', n.id, { leida: true }); });
    drawer('🔔 Notificaciones', arr.length ? arr.map(n => `<div class="pt-row pt-click" data-ntf="${n.id}"><span class="pt-row-ic">${n.tipo === 'cobro' ? '💳' : n.tipo === 'renovacion' ? '🔄' : '📢'}</span><div style="flex:1"><b>${U.esc(n.titulo)}</b><div class="muted" style="font-size:11.5px">${U.esc((n.cuerpo || '').slice(0, 70))}${(n.cuerpo || '').length > 70 ? '…' : ''}</div><div class="muted" style="font-size:10.5px;margin-top:3px">${U.fmtDate(n.fecha)} ›</div></div></div>`).join('') : '<div class="pt-empty">Sin notificaciones.</div>', null, 'Cerrar', () => render(host));
    setTimeout(() => { document.querySelectorAll('[data-ntf]').forEach(b => b.addEventListener('click', () => { const n = S().get('notifs', b.dataset.ntf); if (n) verNotifDetalle(n); })); }, 40);
  }
  function verNotifDetalle(n) {
    const icon = n.tipo === 'cobro' ? '💳' : n.tipo === 'renovacion' ? '🔄' : '📢';
    const html = `<div style="text-align:center;font-size:40px">${icon}</div>
      <h3 style="font-family:var(--f-display);text-align:center;margin:6px 0 2px">${U.esc(n.titulo)}</h3>
      <div class="muted" style="text-align:center;font-size:12px;margin-bottom:14px">${U.fmtDate(n.fecha)} · ${n.tipo}</div>
      <p style="line-height:1.65;font-size:14px;white-space:pre-wrap">${U.esc(n.cuerpo || '')}</p>`;
    drawer('Notificación', html, null, 'Cerrar');
  }
  /* ---- Admin: enviar notificación a uno o a todos ---- */
  function adminNotif() {
    const html = `<label class="ce-l">Destinatario<select id="an-dest" class="o-sel"><option value="__all">📢 Todos los clientes</option>${clientes().map(c => `<option value="${c.id}">${U.esc(c.nombre)}</option>`).join('')}</select></label>
      <label class="ce-l" style="margin-top:10px">Título<input id="an-tit" class="o-sel" placeholder="Ej. Aviso importante"></label>
      <label class="ce-l" style="margin-top:10px">Mensaje<textarea id="an-msg" class="o-sel" style="min-height:64px;resize:vertical;padding:9px 11px"></textarea></label>
      <div class="cfg-note" style="margin-top:10px">La notificación aparece en el portal del cliente y se envía por WhatsApp/correo.</div>`;
    const back = drawer('📢 Enviar notificación', html, () => {
      const dest = back.querySelector('#an-dest').value, tit = back.querySelector('#an-tit').value || 'Aviso', msg = back.querySelector('#an-msg').value;
      const dests = dest === '__all' ? clientes() : [S().get('clientes', dest)];
      dests.forEach(c => { if (!c) return; S().insert('notifs', { id: 'ntf' + Date.now() + Math.floor(Math.random() * 999), clienteId: c.id, titulo: tit, cuerpo: msg, tipo: 'admin', fecha: Orbit.ui.today(), leida: false }); });
      back.remove(); toast('✓ Notificación enviada a ' + (dest === '__all' ? 'todos' : '1 cliente')); render(host);
    }, 'Enviar');
  }

  /* ---- Reportar pago (sube soporte → notifica al equipo) ---- */
  function reportarPago(cobroId) {
    const c = S().get('cobros', cobroId); if (!c) return;
    const cli = S().get('clientes', clienteId);
    const html = `<div class="cfg-note">Reporta tu pago de la cuota <b>${c.cuota}</b> por <b>${U.money(c.monto, c.moneda)}</b>. El equipo lo valida y te confirma.</div>
      <label class="ce-l" style="margin-top:10px">Fecha del pago<input id="rp-fecha" class="o-sel" type="date" value="${Orbit.ui.today()}"></label>
      <label class="ce-l" style="margin-top:10px">Soporte de pago (comprobante)<input id="rp-file" type="file" class="o-sel" accept="image/*,application/pdf"></label>
      <label class="ce-l" style="margin-top:10px">Nota<input id="rp-nota" class="o-sel" placeholder="Banco, referencia…"></label>`;
    const back = drawer('📤 Reportar pago', html, () => {
      const f = back.querySelector('#rp-file').files[0];
      S().update('cobros', cobroId, { reportado: Orbit.ui.today(), soporteNombre: f ? f.name : '', notaReporte: back.querySelector('#rp-nota').value });
      S().insert('actividades', { id: 'act' + Date.now(), clienteId, asesorId: (S().get('polizas', c.polizaId) || {}).asesorId || cli.asesorId, tipo: 'sistema', icon: '📤', fecha: Orbit.ui.today(), titulo: 'Pago reportado por el cliente', detalle: 'Cuota ' + c.cuota + ' · ' + U.money(c.monto, c.moneda) + (f ? ' · soporte: ' + f.name : '') + ' · pendiente de validar' });
      if (Orbit.ciclo && Orbit.ciclo.crearGestion) Orbit.ciclo.crearGestion({ lista: 'Gestiones Admin', tipo: 'Validar pago reportado', titulo: 'Validar pago · ' + cli.nombre, clienteId, polizaId: c.polizaId, asesorId: cli.asesorId, prioridad: 'Alta', vence: '2026-06-26', nota: 'El cliente reportó el pago de la cuota ' + c.cuota, origen: 'Portal del cliente' });
      back.remove(); toast('✓ Pago reportado · el equipo lo validará'); render(host);
    }, 'Enviar reporte');
  }

  /* ---- Soporte directo al asesor ---- */
  function soporteAsesor(cli) {
    const ase = q.asesor(cli.asesorId);
    const wa = (cli.telefono || '').replace(/\D/g, '');
    drawer('🧑‍💼 Tu asesor', `<div style="text-align:center;padding:8px 0">
      <div style="width:60px;height:60px;border-radius:50%;margin:0 auto;background:${ase ? ase.color : '#999'};display:grid;place-items:center;color:#fff;font-family:var(--f-display);font-weight:800;font-size:22px">${ase ? ase.iniciales : '?'}</div>
      <b style="display:block;margin-top:10px;font-family:var(--f-display);font-size:16px">${ase ? U.esc(ase.nombre) : 'Tu asesor'}</b>
      <div class="muted" style="font-size:12.5px">${ase ? ase.rol : ''}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:14px">
        <a class="btn primary sm" href="https://wa.me/${wa}" target="_blank" rel="noopener">💬 WhatsApp</a>
        ${ase && ase.email ? `<a class="btn ghost sm" href="mailto:${ase.email}?subject=Consulta%20desde%20mi%20portal" target="_blank" rel="noopener">✉ Correo</a>` : ''}
      </div></div>`, null, 'Cerrar');
  }

  /* ---- Subir documento al expediente ---- */
  function subirDoc() {
    const cli = S().get('clientes', clienteId);
    const html = `<label class="ce-l">Tipo de documento<select id="sd-tipo" class="o-sel">${['DPI / Cédula', 'RTU / RUT', 'Licencia', 'Comprobante de domicilio', 'Otro'].map(t => `<option>${t}</option>`).join('')}</select></label>
      <label class="ce-l" style="margin-top:10px">Archivo<input id="sd-file" type="file" class="o-sel"></label>
      <div class="cfg-note" style="margin-top:10px">Tu documento se guarda en tu expediente y el equipo lo verá al instante.</div>`;
    const back = drawer('⬆ Añadir documento', html, () => {
      const f = back.querySelector('#sd-file').files[0]; const tipo = back.querySelector('#sd-tipo').value;
      S().insert('documentos', { id: 'doc' + Date.now(), clienteId, tipo, nombre: f ? f.name : tipo, fecha: Orbit.ui.today(), origen: 'Portal del cliente' });
      S().insert('actividades', { id: 'act' + Date.now(), clienteId, asesorId: cli.asesorId, tipo: 'sistema', icon: '📁', fecha: Orbit.ui.today(), titulo: 'Documento subido por el cliente', detalle: tipo + (f ? ' · ' + f.name : '') });
      back.remove(); toast('✓ Documento añadido a tu expediente'); render(host);
    }, 'Subir');
  }

  /* ---- Asistente de chat (no se menciona IA) ---- */
  function chat(cli) {
    const nombre = cli.nombre.split(' ')[0];
    const botName = 'Asistente de ' + nombre;
    let back = document.getElementById('pt-chatw'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'pt-chatw'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(420px,94vw);height:min(560px,90vh);display:flex;flex-direction:column;padding:0">
      <div style="padding:14px 18px;background:linear-gradient(120deg,var(--red),#8f1020);color:#fff;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:9px"><span style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center">💬</span><div><b style="font-family:var(--f-display);font-size:14px">${botName}</b><div style="font-size:10.5px;color:rgba(255,255,255,.8)">en línea · te ayudo al instante</div></div></div>
        <button class="imp-x" id="pc-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button></div>
      <div class="pt-chatbody" id="pc-body"></div>
      <div style="padding:10px 12px;border-top:1px solid var(--line);display:flex;gap:7px"><input id="pc-in" class="o-sel" placeholder="Escribe tu consulta…" style="flex:1"><button class="btn primary sm" id="pc-send">➤</button></div>
    </div>`;
    document.body.appendChild(back);
    const bd = back.querySelector('#pc-body');
    function add(who, txt) { const d = document.createElement('div'); d.className = 'pc-msg ' + who; d.textContent = txt; bd.appendChild(d); bd.scrollTop = bd.scrollHeight; }
    add('bot', '¡Hola ' + nombre + '! 👋 Soy tu asistente. Puedo ayudarte con tus pólizas, pagos, siniestros o conectarte con tu asesor. ¿Qué necesitas?');
    function responder(q2) {
      const t = q2.toLowerCase();
      if (/pago|cuota|recibo|deuda/.test(t)) return 'Puedes ver y reportar tus pagos en la pestaña 💳 Pagos. Si ya pagaste, usa "Reportar pago" y adjunta tu comprobante; el equipo lo valida.';
      if (/p[oó]liza|cobertura|cubre/.test(t)) return 'En 📑 Pólizas ves tus coberturas y vigencias. Si tienes dudas de qué cubre, puedo crear una consulta para tu asesor.';
      if (/siniestro|choque|robo|reclam/.test(t)) return 'Lamento lo ocurrido. En 🚨 Siniestros puedes reportarlo y darle seguimiento. ¿Quieres que abra el reporte ahora?';
      if (/asesor|humano|persona|hablar/.test(t)) return 'Te conecto con tu asesor: usa el botón "🧑‍💼 Hablar con mi asesor" en el inicio. ¿Quieres que le envíe un aviso?';
      if (/renov/.test(t)) return 'Tu asesor te enviará la propuesta de renovación. Si quieres, registro tu interés para que te contacten pronto.';
      return 'Gracias, ' + nombre + '. Lo registro para tu asesor y te darán seguimiento. ¿Algo más en lo que te ayude?';
    }
    function send() { const v = back.querySelector('#pc-in').value.trim(); if (!v) return; add('me', v); back.querySelector('#pc-in').value = ''; setTimeout(() => add('bot', responder(v)), 500); }
    back.querySelector('#pc-send').addEventListener('click', send);
    back.querySelector('#pc-in').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#pc-x').addEventListener('click', close);
  }

  /* ---- Solicitud del cliente → Ops + notifica ---- */
  function solicitar(tipoPre) {
    const cli = S().get('clientes', clienteId); if (!cli) return;
    const tipos = ['Actualizar mis datos', 'Solicitar copia de póliza', 'Consulta de cobertura', 'Reclamo / Siniestro', 'Cancelar póliza', 'Otra solicitud'];
    const html = `<label class="ce-l">Tipo de solicitud<select id="ps-tipo" class="o-sel">${tipos.map(t => `<option ${t === tipoPre ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="ce-l" style="margin-top:10px">Detalle<textarea id="ps-det" class="o-sel" style="min-height:70px;resize:vertical;padding:9px 11px" placeholder="Cuéntanos qué necesitas…"></textarea></label>
      <div class="cfg-note" style="margin-top:10px">Tu solicitud llega al equipo (Orbit Ops) y te avisaremos por WhatsApp/correo.</div>`;
    const back = drawer('🗂 Solicitar una gestión', html, () => {
      const tipo = back.querySelector('#ps-tipo').value, det = back.querySelector('#ps-det').value.trim();
      const esSiniestro = /reclamo|siniestro/i.test(tipo);
      let reclamoId = '';
      if (esSiniestro) {
        // Alta CANÓNICA del reclamo en el store (aparece en módulo Siniestros + ficha Cliente360)
        const pol = q.polizasDe(clienteId).filter(p => p.estado !== 'Cancelada')[0];
        reclamoId = 'rcl' + Date.now();
        const num = 'SIN-' + new Date().getFullYear() + '-' + String(S().all('reclamos').length + 1).padStart(4, '0');
        S().insert('reclamos', {
          id: reclamoId, numero: num, clienteId, polizaId: pol ? pol.id : '', aseguradoraId: pol ? pol.aseguradoraId : '',
          tipo: 'Reclamo reportado', estado: 'Reportado', prioridad: 'Media', origen: 'portal',
          fecha: Orbit.ui.today(), responsable: cli.asesorId || '', montoReclamado: 0, montoAprobado: 0,
          descripcion: det, bitacora: [{ ts: Orbit.ui.today(), t: 'Reportado por el cliente desde el Portal', quien: cli.nombre }]
        });
      }
      if (Orbit.ciclo && Orbit.ciclo.crearGestion) Orbit.ciclo.crearGestion({ lista: 'Gestiones Admin', tipo, titulo: tipo + ' · ' + cli.nombre, clienteId, asesorId: cli.asesorId, prioridad: esSiniestro ? 'Alta' : 'Media', vence: Orbit.ui.today(), nota: det, origen: 'Portal del cliente', reclamoId, checklist: [{ t: 'Solicitud recibida', done: true }, { t: 'En gestión', done: false }] });
      S().insert('actividades', { id: 'act' + Date.now(), clienteId, asesorId: cli.asesorId, tipo: esSiniestro ? 'siniestro' : 'sistema', icon: esSiniestro ? '🚨' : '🙋', fecha: Orbit.ui.today(), titulo: esSiniestro ? 'Siniestro reportado por el cliente' : ('Solicitud del cliente: ' + tipo), detalle: det + ' · Portal → Ops' + (reclamoId ? ' + Siniestros' : ''), reclamoId });
      back.remove(); toast(esSiniestro ? '✓ Siniestro reportado · el equipo le dará seguimiento' : '✓ Solicitud enviada al equipo'); render(host);
    }, 'Enviar solicitud');
  }

  /* ---- Detalles amplios para el cliente ---- */
  function detPoliza(polId) {
    const p = S().get('polizas', polId); if (!p) return;
    const asg = q.aseguradora(p.aseguradoraId), veh = (S().where('vehiculos', v => v.polizaId === polId) || [])[0];
    drawer('📑 ' + (p.producto || p.ramo), `
      <div class="pt-det-grid">
        <div class="pt-det"><span>N.º de ${TT('poliza').toLowerCase()}</span><b>${p.numero}</b></div>
        <div class="pt-det"><span>Aseguradora</span><b>${asg ? U.esc(asg.nombre) : '—'}</b></div>
        <div class="pt-det"><span>Ramo</span><b>${p.ramo}${p.subramo ? ' · ' + p.subramo : ''}</b></div>
        <div class="pt-det"><span>Suma asegurada</span><b>${U.money(p.sumaAsegurada || 0, p.moneda)}</b></div>
        <div class="pt-det"><span>${TT('prima')} total</span><b>${U.money(p.prima, p.moneda)}</b></div>
        <div class="pt-det"><span>Forma de pago</span><b>${p.formaPago || p.frecuencia || '—'}</b></div>
        <div class="pt-det"><span>Vigencia</span><b>${U.fmtDate(p.vigenciaInicio)} → ${U.fmtDate(p.vigenciaFin)}</b></div>
        <div class="pt-det"><span>Estado</span><b>${p.estado}</b></div>
      </div>
      ${veh ? `<div class="cfg-note" style="margin-top:12px">🚗 <b>${U.esc(veh.marca)} ${U.esc(veh.linea || '')} ${veh.anio || ''}</b>${veh.placa ? ' · placa ' + veh.placa : ''}</div>` : ''}
      <div style="display:flex;gap:8px;margin-top:12px"><button class="btn ghost sm" data-x-sol="Solicitar copia de póliza">📄 Solicitar copia</button><button class="btn ghost sm" data-x-sol="Consulta de cobertura">❓ Dudas de cobertura</button></div>`, null, 'Cerrar');
    document.querySelectorAll('[data-x-sol]').forEach(b => b.addEventListener('click', () => { document.getElementById('pt-dr').remove(); solicitar(b.dataset.xSol); }));
  }
  function detRecibo(cobId) {
    const c = S().get('cobros', cobId); if (!c) return;
    const p = S().get('polizas', c.polizaId);
    drawer('💳 ' + TT('recibo') + ' · cuota ' + c.cuota, `
      <div class="pt-det-grid">
        <div class="pt-det"><span>${TT('poliza')}</span><b>${p ? p.numero : '—'}</b></div>
        <div class="pt-det"><span>Monto</span><b>${U.money(c.monto, c.moneda)}</b></div>
        <div class="pt-det"><span>Vence</span><b>${U.fmtDate(c.vence)}</b></div>
        <div class="pt-det"><span>Estado</span><b>${c.estado}</b></div>
        ${c.neta != null ? `<div class="pt-det"><span>${TT('prima_neta')}</span><b>${U.money(c.neta, c.moneda)}</b></div><div class="pt-det"><span>IVA</span><b>${U.money(c.iva || 0, c.moneda)}</b></div>` : ''}
        ${c.fechaPago ? `<div class="pt-det"><span>Pagado el</span><b>${U.fmtDate(c.fechaPago)}</b></div>` : ''}
        ${c.reportado ? `<div class="pt-det"><span>Reportado</span><b>${U.fmtDate(c.reportado)}</b></div>` : ''}
      </div>
      ${(c.estado === 'Pendiente' || c.estado === 'Vencido') && !c.reportado ? '<button class="btn primary sm" style="margin-top:12px" data-x-pago="' + c.id + '">📤 Reportar mi pago</button>' : ''}`, null, 'Cerrar');
    document.querySelectorAll('[data-x-pago]').forEach(b => b.addEventListener('click', () => { document.getElementById('pt-dr').remove(); reportarPago(b.dataset.xPago); }));
  }
  function detSiniestro(id) {
    const r = S().get('reclamos', id); if (!r) return;
    drawer('🚨 ' + r.tipo, `
      <div class="pt-det-grid">
        <div class="pt-det"><span>N.º</span><b>${r.numero}</b></div>
        <div class="pt-det"><span>Estado</span><b>${r.estado}</b></div>
        <div class="pt-det"><span>Reportado</span><b>${U.fmtDate(r.fecha)}</b></div>
        <div class="pt-det"><span>Monto reclamado</span><b>${U.money(r.montoReclamado, (S().get('clientes', clienteId) || {}).moneda || Orbit.q.monedaPais())}</b></div>
      </div>
      <div class="asg-sec-t" style="margin-top:14px">Seguimiento</div>
      <div class="pol-hist">${(r.bitacora || []).slice().reverse().map(b => `<div class="pol-hev"><div class="pol-hev-i">📌</div><div><div class="pol-hev-t">${U.esc(b.t)}</div><div class="pol-hev-d">${U.esc(b.ts || '')}</div></div></div>`).join('') || '<div class="muted" style="font-size:12px">Sin movimientos aún.</div>'}</div>`, null, 'Cerrar');
  }

  /* ---- Glosario propio del cliente ---- */
  function glosario() {
    const terms = (Orbit.GLOSARIO || []).slice();
    drawer('📖 Glosario de seguros', `<input id="gl-q" class="o-sel" placeholder="Buscar término…" style="margin-bottom:10px">
      <div id="gl-list">${terms.map(t => `<div class="pt-row" style="cursor:default"><div style="flex:1"><b>${U.esc(t.t)}</b><div class="muted" style="font-size:11.5px">${U.esc(t.d)}</div></div></div>`).join('')}</div>`, null, 'Cerrar');
    const dr = document.getElementById('pt-dr'); const inp = dr.querySelector('#gl-q');
    inp.addEventListener('input', () => { const v = inp.value.toLowerCase(); dr.querySelector('#gl-list').innerHTML = terms.filter(t => (t.t + t.d).toLowerCase().includes(v)).map(t => `<div class="pt-row" style="cursor:default"><div style="flex:1"><b>${U.esc(t.t)}</b><div class="muted" style="font-size:11.5px">${U.esc(t.d)}</div></div></div>`).join(''); });
  }

  function verDocPortal(docId) {
    const d = S().get('documentos', docId); if (!d) return;
    const src = d.src || d.url || d.iframeSrc || '';
    let visor;
    if (src && /^data:image|\.(png|jpe?g|webp|gif)/i.test(src)) visor = `<img src="${src}" style="max-width:100%;border-radius:8px">`;
    else if (src) visor = `<div style="position:relative;width:100%;height:60vh;border-radius:8px;overflow:hidden;background:#f4f3ee"><iframe src="${src}" style="width:100%;height:100%;border:0"></iframe></div>`;
    else visor = `<div style="text-align:center;padding:30px;color:var(--ink-3)"><div style="font-size:48px">📄</div><div style="margin-top:10px;font-weight:600">${U.esc(d.nombre || d.tipo)}</div><div style="font-size:12px;margin-top:6px">${U.esc(d.tipo || 'documento')} · ${U.fmtDate(d.fecha)}</div><div style="font-size:11.5px;margin-top:8px;color:var(--ink-3)">La vista previa se mostrará al conectar el almacenamiento (Drive/servidor).</div></div>`;
    drawer('📄 ' + U.esc(d.nombre || d.tipo), visor, null, 'Cerrar');
  }
  function pmd(md) {
    let s = U.esc(String(md || ''));
    s = s.replace(/^## (.*)$/gm, '<h3 style="font-family:var(--f-display);font-size:16px;margin:14px 0 6px">$1</h3>');
    s = s.replace(/^# (.*)$/gm, '<h2 style="font-family:var(--f-display);font-size:18px;margin:8px 0 8px">$1</h2>');
    s = s.replace(/^\s*---\s*$/gm, '<hr style="border:0;border-top:1px solid var(--line);margin:12px 0">');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    s = s.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
    return '<p style="line-height:1.7;font-size:14px">' + s + '</p>';
  }
  function verCursoPortal(cursoId) {
    const c = cursoId !== 'demo' ? S().get('cursos', cursoId) : null;
    const titulo = c ? c.titulo : 'Conoce tu seguro';
    const lecs = (c && c.lecciones) ? c.lecciones : [{ t: 'Qué cubre tu póliza', tipo: 'lectura', texto: 'Tu póliza protege contra los riesgos detallados en la carátula. Revisá coberturas, deducible y vigencia.' }, { t: 'Cómo usar tu seguro', tipo: 'lectura', texto: 'Ante un siniestro, contactá a tu asesor, reuní la documentación y reportá el reclamo desde tu portal.' }];
    const body = `<div style="display:grid;gap:14px">${lecs.map((l, i) => {
      let inner;
      if (l.secciones && l.secciones.length) inner = l.secciones.map(sx => `<div style="border-left:4px solid ${sx.color || 'var(--red)'};padding:8px 0 8px 12px;margin-bottom:8px"><div style="font-family:var(--f-display);font-weight:700;font-size:14px;color:${sx.color || 'var(--red)'}">${U.esc(sx.icon || '▸')} ${U.esc(sx.t || '')}</div><div style="font-size:13.5px;line-height:1.65;color:var(--ink-2);white-space:pre-wrap;margin-top:3px">${U.esc(sx.d || '')}</div></div>`).join('');
      else if (l.tipo === 'video' && l.url) inner = `<div class="ac-video" style="border-radius:8px;overflow:hidden"><iframe src="${l.url}" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0"></iframe></div>`;
      else inner = pmd(l.texto || 'Contenido del curso.');
      return `<div><div style="font-family:var(--f-display);font-weight:800;font-size:15px;color:var(--red);margin-bottom:6px">${i + 1}. ${U.esc(l.t)}</div>${inner}</div>`;
    }).join('')}</div>`;
    drawer('🎓 ' + U.esc(titulo), body, null, 'Cerrar');
  }

  /* ---- helper drawer ---- */
  function drawer(titulo, bodyHtml, onOk, okLabel, onClose) {
    let back = document.getElementById('pt-dr'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'pt-dr'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(460px,94vw);max-height:90vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:15px">${titulo}</b><button class="imp-x" id="dr-x">✕</button></div>
      <div style="padding:18px 20px">${bodyHtml}</div>
      <div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">${onOk ? '<button class="btn ghost" id="dr-cancel">Cancelar</button>' : ''}<button class="btn primary" id="dr-ok">${okLabel || 'Cerrar'}</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => { back.remove(); if (onClose) onClose(); };
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#dr-x').addEventListener('click', close);
    const cc = back.querySelector('#dr-cancel'); if (cc) cc.addEventListener('click', close);
    back.querySelector('#dr-ok').addEventListener('click', () => { if (onOk) onOk(); else close(); });
    return back;
  }
  function toast(msg) { const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

  return { render };
})();
