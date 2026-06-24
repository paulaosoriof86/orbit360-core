/* ============================================================
   Orbit 360 · Correo (bandeja integrada)
   Lista recibidos/enviados/destacados, lectura, redacción y
   vínculo a entidades. Usa la capa Orbit.correo.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.correo = (function () {
  const U = Orbit.ui, K = Orbit.kit, C = () => Orbit.correo, S = () => Orbit.store;
  let carpeta = 'recibidos', selId = null, host;

  function render(h) {
    host = h;
    const cfg = C().getCfg();
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '✉', title: 'Correo', sub: 'Bandeja integrada · vincula correos a clientes, pólizas y gestiones', features: [], actions: `<button class="btn primary" id="cr-new" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">✏ Redactar</button>` })}
      ${cfg.conectado
        ? `<div class="cfg-note" style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><span>🔗 Conectado a <b>${U.esc(cfg.proveedor)}</b> · ${U.esc(cfg.cuenta)}</span><button class="btn ghost sm" id="cr-disc">Desconectar</button></div>`
        : `<div class="cfg-note" style="margin-bottom:14px;border-left:3px solid var(--warn);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><span>📭 Bandeja en <b>modo demo</b>. Conecta tu cuenta para sincronizar correos reales.</span><button class="btn primary sm" id="cr-conn">Conectar Outlook / Gmail</button></div>`}
      <div class="mail-wrap">
        <div class="mail-side">
          ${[['recibidos', '📥 Recibidos'], ['enviados', '📤 Enviados'], ['destacados', '⭐ Destacados']].map(f => `<button class="mail-folder ${carpeta === f[0] ? 'on' : ''}" data-f="${f[0]}">${f[1]}${f[0] === 'recibidos' ? `<span class="mail-badge">${C().noLeidos() || ''}</span>` : ''}</button>`).join('')}
        </div>
        <div class="mail-list" id="mail-list"></div>
        <div class="mail-read" id="mail-read"></div>
      </div>
    </div>`;
    host.querySelectorAll('.mail-folder').forEach(b => b.addEventListener('click', () => { carpeta = b.dataset.f; selId = null; paint(); }));
    host.querySelector('#cr-new').addEventListener('click', () => redactar({}));
    const cc = host.querySelector('#cr-conn'); if (cc) cc.addEventListener('click', conectar);
    const cd = host.querySelector('#cr-disc'); if (cd) cd.addEventListener('click', () => { C().desconectar(); render(host); });
    paint();
    // compose pendiente (p. ej. desde la ficha del cliente)
    if (window.__orbitCompose) { const pre = window.__orbitCompose; window.__orbitCompose = null; setTimeout(() => redactar(pre), 60); }
  }

  function lista() {
    let arr = C().all();
    if (carpeta === 'destacados') arr = arr.filter(c => c.destacado);
    else arr = arr.filter(c => c.carpeta === carpeta);
    return arr.sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  }

  function paint() {
    const arr = lista();
    const list = document.getElementById('mail-list');
    list.innerHTML = arr.map(c => `<div class="mail-item ${c.leido ? '' : 'unread'} ${selId === c.id ? 'sel' : ''}" data-id="${c.id}">
      <div class="mail-item-top"><b>${U.esc(c.remitenteNombre || c.de)}</b><span class="mail-date">${U.fmtDate(c.fecha)}</span></div>
      <div class="mail-subj">${c.destacado ? '⭐ ' : ''}${U.esc(c.asunto)}</div>
      <div class="mail-snippet">${U.esc((c.cuerpo || '').slice(0, 64))}…</div>
      ${c.vinculo ? `<span class="mail-link">🔗 ${U.esc(c.vinculo.label)}</span>` : '<span class="mail-link off">sin vincular</span>'}
    </div>`).join('') || '<div class="muted" style="padding:24px;text-align:center">Sin correos en esta carpeta.</div>';
    list.querySelectorAll('.mail-item').forEach(el => el.addEventListener('click', () => { selId = el.dataset.id; C().marcarLeido(selId); paint(); }));
    leer();
  }

  function leer() {
    const read = document.getElementById('mail-read');
    if (!selId) { read.innerHTML = '<div class="mail-empty">Selecciona un correo para leerlo.</div>'; return; }
    const c = S().get('correos', selId); if (!c) { read.innerHTML = ''; return; }
    read.innerHTML = `
      <div class="mail-read-h">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <b style="font-family:var(--f-display);font-size:17px">${U.esc(c.asunto)}</b>
          <button class="btn ghost sm" id="mr-star">${c.destacado ? '⭐' : '☆'}</button>
        </div>
        <div class="mail-meta"><b>${U.esc(c.remitenteNombre || c.de)}</b> &lt;${U.esc(c.de)}&gt; · ${U.fmtDate(c.fecha)} ${c.hora}</div>
        <div class="mail-meta">para ${U.esc(c.para)}</div>
        <div class="mail-vinc">
          ${c.vinculo ? `🔗 Vinculado a <b>${U.esc(c.vinculo.label)}</b> ${linkAbrir(c.vinculo)}` : '<span class="muted">Sin vincular</span>'}
          <button class="btn ghost sm" id="mr-link">${c.vinculo ? 'Cambiar' : '🔗 Vincular'}</button>
        </div>
      </div>
      <div class="mail-body">${U.esc(c.cuerpo)}</div>
      ${(c.adjuntos || []).length ? `<div class="mail-adj">${c.adjuntos.map(a => `<span class="mail-chip">📎 ${U.esc(a)}</span>`).join('')}</div>` : ''}
      <div class="mail-actions">
        <button class="btn primary sm" id="mr-reply">↩ Responder</button>
        ${c.clienteId ? `<button class="btn ghost sm" onclick="location.hash='#/cliente360?c=${c.clienteId}'">🧑‍💼 Ver cliente</button>` : ''}
      </div>`;
    read.querySelector('#mr-star').addEventListener('click', () => { C().destacar(selId); paint(); });
    read.querySelector('#mr-link').addEventListener('click', () => vincularUI(c));
    read.querySelector('#mr-reply').addEventListener('click', () => redactar({ para: c.de, asunto: 'RE: ' + c.asunto, clienteId: c.clienteId, vinculo: c.vinculo }));
  }
  function linkAbrir(v) {
    if (v.tipo === 'poliza') return `<a style="color:var(--red);cursor:pointer" onclick="Orbit.modules.cliente360.verPoliza('${v.id}')">abrir →</a>`;
    if (v.tipo === 'cliente') return `<a style="color:var(--red);cursor:pointer" onclick="location.hash='#/cliente360?c=${v.id}'">abrir →</a>`;
    return '';
  }

  function vincularUI(c) {
    const tipoActual = (c.vinculo && c.vinculo.tipo) || 'cliente';
    const opciones = {
      cliente: S().all('clientes').map(x => [x.id, x.nombre]),
      poliza: S().all('polizas').map(p => [p.id, p.numero + ' · ' + p.ramo]),
      gestion: S().all('gestiones').map(g => [g.id, (g.titulo || g.tipo) + (g.clienteId ? ' · ' + ((S().get('clientes', g.clienteId) || {}).nombre || '') : '')]),
      reclamo: S().all('reclamos').map(r => [r.id, r.numero + ' · ' + r.tipo]),
      aseguradora: S().all('aseguradoras').map(a => [a.id, a.nombre])
    };
    function optsHtml(tipo) { return [['', '— ninguno —']].concat(opciones[tipo] || []).map(o => `<option value="${o[0]}" ${c.vinculo && c.vinculo.id === o[0] ? 'selected' : ''}>${U.esc(o[1])}</option>`).join(''); }
    const html = `<label class="ce-l">Tipo de vínculo
        <select id="vl-tipo" class="o-sel">${[['cliente', '🧑‍💼 Cliente'], ['poliza', '📑 Póliza'], ['gestion', '🗂 Gestión'], ['reclamo', '🚨 Reclamo'], ['aseguradora', '🏢 Aseguradora']].map(t => `<option value="${t[0]}" ${t[0] === tipoActual ? 'selected' : ''}>${t[1]}</option>`).join('')}</select></label>
      <label class="ce-l" style="margin-top:10px">Registro<select id="vl-id" class="o-sel">${optsHtml(tipoActual)}</select></label>
      <div class="cfg-note" style="margin-top:10px">Vincula el correo al registro para que aparezca en su ficha (cliente, póliza, gestión, reclamo o aseguradora).</div>`;
    const back = drawer('🔗 Vincular correo', html, () => {
      const tipo = back.querySelector('#vl-tipo').value, id = back.querySelector('#vl-id').value;
      if (!id) { C().vincular(c.id, null); back.remove(); paint(); return; }
      const label = (opciones[tipo].find(o => o[0] === id) || [, ''])[1];
      C().vincular(c.id, { tipo, id, label });
      // si es cliente o se puede derivar el cliente, set clienteId
      if (tipo === 'cliente') S().update('correos', c.id, { clienteId: id });
      else { const rec = S().get(tipo === 'poliza' ? 'polizas' : tipo === 'gestion' ? 'gestiones' : tipo === 'reclamo' ? 'reclamos' : 'aseguradoras', id); if (rec && rec.clienteId) S().update('correos', c.id, { clienteId: rec.clienteId }); }
      back.remove(); paint();
    });
    back.querySelector('#vl-tipo').addEventListener('change', () => { back.querySelector('#vl-id').innerHTML = optsHtml(back.querySelector('#vl-tipo').value); });
  }

  function redactar(pre) {
    // asunto por patrón para envío a aseguradora si viene de un cliente sin asunto
    let asuntoDef = pre.asunto || '';
    if (!asuntoDef && pre.vinculo && pre.vinculo.tipo === 'cliente') asuntoDef = 'Gestión · ' + pre.vinculo.label + (pre.poliza ? ' · Póliza ' + pre.poliza : '');
    const docs = pre.clienteId ? (Orbit.store.where('documentos', d => d.clienteId === pre.clienteId) || []) : [];
    const html = `<div class="cgrid">
        <label class="ce-l">Para<input id="rd-para" class="o-sel" value="${U.esc(pre.para || '')}"></label>
        <label class="ce-l">Asunto<input id="rd-asunto" class="o-sel" value="${U.esc(asuntoDef)}"></label>
      </div>
      <label class="ce-l" style="margin-top:11px">Mensaje<textarea id="rd-cuerpo" class="o-sel" style="min-height:120px;resize:vertical;padding:9px 11px"></textarea></label>
      <div class="ce-l" style="margin-top:11px">📎 Adjuntos
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:5px">
          <label class="btn ghost sm" style="cursor:pointer">⬆ Desde el PC<input type="file" id="rd-file" multiple style="display:none"></label>
          ${pre.clienteId ? `<button type="button" class="btn ghost sm" id="rd-docs">📁 Documentos del cliente${docs.length ? ' (' + docs.length + ')' : ''}</button>` : ''}
        </div>
        <div id="rd-adj" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div>
      </div>
      ${pre.vinculo ? `<div class="cfg-note" style="margin-top:10px">🔗 Se vinculará a <b>${U.esc(pre.vinculo.label)}</b> · queda en el expediente.</div>` : ''}
      <div class="muted" style="font-size:11px;margin-top:8px">El editor de diseño completo es el de tu proveedor (Outlook/Gmail) al conectar la cuenta; aquí redactas y adjuntas, asociado al expediente.</div>`;
    const back = drawer('✏ Redactar correo', html, () => {
      C().enviar({ para: back.querySelector('#rd-para').value, asunto: back.querySelector('#rd-asunto').value, cuerpo: back.querySelector('#rd-cuerpo').value, clienteId: pre.clienteId, vinculo: pre.vinculo, adjuntos: adj.slice() });
      back.remove(); carpeta = 'enviados'; selId = null; render(host);
    }, 'Enviar');
    const adj = [];
    function paintAdj() { back.querySelector('#rd-adj').innerHTML = adj.map((a, i) => `<span class="mail-chip">📎 ${U.esc(a)} <span data-rm="${i}" style="cursor:pointer;color:var(--danger)">✕</span></span>`).join(''); back.querySelectorAll('[data-rm]').forEach(x => x.addEventListener('click', () => { adj.splice(+x.dataset.rm, 1); paintAdj(); })); }
    back.querySelector('#rd-file').addEventListener('change', e => { [...e.target.files].forEach(f => adj.push(f.name)); paintAdj(); });
    const dbtn = back.querySelector('#rd-docs');
    if (dbtn) dbtn.addEventListener('click', () => {
      if (!docs.length) { adj.push('(sin documentos en el expediente)'); paintAdj(); return; }
      const pick = prompt('Documentos del cliente:\n' + docs.map((d, i) => (i + 1) + '. ' + (d.nombre || d.tipo)).join('\n') + '\n\nEscribe el número a adjuntar:', '1');
      const idx = parseInt(pick, 10) - 1; if (docs[idx]) { adj.push(docs[idx].nombre || docs[idx].tipo); paintAdj(); }
    });
  }

  function conectar() {
    const html = `<label class="ce-l">Proveedor<select id="cn-prov" class="o-sel"><option>Outlook (Microsoft 365)</option><option>Gmail (Google Workspace)</option></select></label>
      <label class="ce-l" style="margin-top:11px">Cuenta de correo<input id="cn-cuenta" class="o-sel" placeholder="tucorreo@empresa.com"></label>
      <div class="cfg-note" style="margin-top:11px">Esta es la versión comercializable: la UI queda lista y, al personalizar, se conecta la cuenta real vía OAuth en Configuración › Integraciones.</div>`;
    const back = drawer('🔗 Conectar correo', html, () => {
      C().conectar(back.querySelector('#cn-prov').value, back.querySelector('#cn-cuenta').value || 'cuenta@empresa.com');
      back.remove(); render(host);
    }, 'Conectar');
  }

  function drawer(titulo, bodyHtml, onOk, okLabel) {
    let back = document.getElementById('cr-drawer'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cr-drawer'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    back.innerHTML = `<div class="card" style="width:min(560px,94vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">${titulo}</b><button class="imp-x" id="dr-x">✕</button></div>
      <div style="padding:18px 20px">${bodyHtml}</div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="dr-cancel">Cancelar</button><button class="btn primary" id="dr-ok">${okLabel || 'Guardar'}</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#dr-x').addEventListener('click', close);
    back.querySelector('#dr-cancel').addEventListener('click', close);
    back.querySelector('#dr-ok').addEventListener('click', onOk);
    return back;
  }

  return { render, redactar: (pre) => redactar(pre || {}) };
})();
