/* ============================================================
   Orbit 360 · Plantillas de mensajes
   Biblioteca de plantillas WhatsApp / Correo / PDF con variables,
   CRUD completo, preview con datos reales y "Usar" (resuelve
   variables + enruta a WhatsApp o redacción de correo).
   Persiste en Orbit.store('plantillas') — la capa de datos única
   (el backend hereda la colección sin tocar el módulo).
   Variables: {nombre} {poliza} {monto} {vence} {pendientes}
              {ramo} {aseguradora} {asesor} {placa}
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.plantillas = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;

  const SEED = [
    { id: 'pl-prop', icon: '📄', nombre: 'Envío de propuesta', canal: 'Ambos', cat: 'Comercial', asunto: 'Propuesta de {ramo} · {aseguradora}', texto: 'Hola {nombre}, te comparto la propuesta de {ramo} que preparamos con {aseguradora}. Incluye coberturas y prima. ¿La revisamos juntos?' },
    { id: 'pl-prima', icon: '💳', nombre: 'Prima pendiente', canal: 'WhatsApp', cat: 'Cobranza', asunto: 'Cuota pendiente · póliza {poliza}', texto: 'Hola {nombre}, tu póliza {poliza} tiene una cuota pendiente de {monto} con vencimiento {vence}. ¿Coordinamos el pago?' },
    { id: 'pl-datos', icon: '🩺', nombre: 'Actualización de datos', canal: 'Ambos', cat: 'Calidad', asunto: 'Actualización de tu expediente', texto: 'Hola {nombre}, para mantener tu póliza al día necesitamos actualizar: {pendientes}. ¿Nos ayudás respondiendo este mensaje?' },
    { id: 'pl-renov', icon: '🔄', nombre: 'Aviso de renovación', canal: 'WhatsApp', cat: 'Retención', asunto: 'Renovación de tu póliza {poliza}', texto: 'Hola {nombre}, tu póliza {poliza} de {ramo} vence el {vence}. Preparamos tu renovación para que no quedes sin cobertura. ¿La confirmamos?' },
    { id: 'pl-bienv', icon: '👋', nombre: 'Bienvenida', canal: 'Ambos', cat: 'Onboarding', asunto: '¡Bienvenido/a a tu nuevo seguro!', texto: '¡Bienvenido/a {nombre}! Soy {asesor}, tu asesor en seguros. Cualquier duda sobre tu póliza {poliza}, estoy para ayudarte.' },
    { id: 'pl-pago-ok', icon: '✅', nombre: 'Confirmación de pago', canal: 'Ambos', cat: 'Cobranza', asunto: 'Recibimos tu pago · póliza {poliza}', texto: 'Hola {nombre}, confirmamos la recepción de tu pago de {monto} para la póliza {poliza}. ¡Gracias por tu confianza!' }
  ];

  const VARS = [
    ['{nombre}', 'Nombre del cliente'], ['{poliza}', 'Número de póliza'], ['{monto}', 'Monto / cuota'],
    ['{vence}', 'Fecha de vencimiento'], ['{pendientes}', 'Datos faltantes'], ['{ramo}', 'Ramo'],
    ['{aseguradora}', 'Aseguradora'], ['{asesor}', 'Asesor asignado'], ['{placa}', 'Placa vehículo']
  ];
  const CANALES = ['Ambos', 'WhatsApp', 'Correo', 'PDF'];
  const CATS = ['Comercial', 'Cobranza', 'Retención', 'Calidad', 'Onboarding', 'Siniestros', 'General'];

  // ---- store bootstrap: siembra la colección si está vacía (migra localStorage viejo) ----
  function boot() {
    if (S().all('plantillas').length) return;
    let old = null; try { const r = localStorage.getItem('orbit360_plantillas'); if (r) old = JSON.parse(r); } catch (e) {}
    (old && old.length ? old : SEED).forEach(p => S().insert('plantillas', Object.assign({ canal: 'Ambos', cat: 'General', asunto: '' }, p)));
  }

  let filtroCanal = '', filtroCat = '', q = '';

  function lista() {
    return S().all('plantillas').filter(p =>
      (!filtroCanal || p.canal === filtroCanal || (filtroCanal !== 'PDF' && p.canal === 'Ambos')) &&
      (!filtroCat || p.cat === filtroCat) &&
      (!q || (p.nombre + ' ' + p.texto).toLowerCase().includes(q.toLowerCase())));
  }

  function render(host) {
    boot();
    const all = S().all('plantillas');
    const porCanal = c => all.filter(p => p.canal === c || (c !== 'PDF' && p.canal === 'Ambos')).length;
    host.innerHTML = `<div class="page">
      ${K.bannerFor('plantillas', `<button class="btn primary" onclick="Orbit.modules.plantillas.editar(null)">+ Nueva plantilla</button>`)}
      ${K.kpis([
        { label: 'Plantillas', val: all.length, color: 'var(--red)', foot: CATS.filter(c => all.some(p => p.cat === c)).length + ' categorías', onclick: "Orbit.modules.plantillas.setCanal('')" },
        { label: 'WhatsApp', val: porCanal('WhatsApp'), color: 'var(--ok)', foot: 'canal directo', onclick: "Orbit.modules.plantillas.setCanal('WhatsApp')" },
        { label: 'Correo', val: porCanal('Correo'), color: 'var(--info)', foot: 'con asunto', onclick: "Orbit.modules.plantillas.setCanal('Correo')" },
        { label: 'PDF', val: porCanal('PDF'), color: 'var(--warn)', foot: 'documento', onclick: "Orbit.modules.plantillas.setCanal('PDF')" }
      ])}
      <div class="cfg-note" style="margin:4px 0 16px">✉ Plantillas reutilizables. Las variables <span class="mono">{nombre} {poliza} {monto} {vence} {ramo} {aseguradora} {asesor}</span> se completan con los datos reales del cliente. Alimentan las <b>automatizaciones</b> por cadencia. Clic en un KPI filtra por canal.</div>
      <div class="card pad" style="margin-bottom:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="pl-q" class="o-sel" style="flex:1;min-width:180px" placeholder="🔎 Buscar plantilla…" value="${U.esc(q)}">
        <select id="pl-fcanal" class="o-sel" style="width:auto"><option value="">Todos los canales</option>${CANALES.map(c => `<option ${filtroCanal === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <select id="pl-fcat" class="o-sel" style="width:auto"><option value="">Todas las categorías</option>${CATS.map(c => `<option ${filtroCat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      </div>
      <div class="pl-grid">
        ${lista().map(p => `<div class="pl-card">
          <div class="pl-h"><span class="pl-ico">${p.icon || '✉'}</span><div style="flex:1"><b>${U.esc(p.nombre)}</b><div class="pl-meta"><span class="badge ${p.canal === 'WhatsApp' ? 'ok' : p.canal === 'Correo' ? 'info' : p.canal === 'PDF' ? 'warn' : 'neutral'}">${p.canal}</span> <span class="badge neutral">${p.cat}</span></div></div></div>
          ${p.canal !== 'WhatsApp' && p.asunto ? `<div style="font-size:11.5px;color:var(--muted);margin:2px 0 6px"><b>Asunto:</b> ${U.esc(p.asunto)}</div>` : ''}
          <div class="pl-body">${U.esc(p.texto)}</div>
          <div class="pl-actions">
            <button class="btn ghost sm" data-copy="${p.id}">⧉ Copiar</button>
            <button class="btn ghost sm" onclick="Orbit.modules.plantillas.editar('${p.id}')">✎ Editar</button>
            <button class="btn ghost sm" onclick="Orbit.modules.plantillas.duplicar('${p.id}')" title="Duplicar">⧉+</button>
            <button class="btn primary sm" onclick="Orbit.modules.plantillas.usar('${p.id}')">Usar</button>
          </div>
        </div>`).join('') || '<div class="muted" style="padding:30px;text-align:center;grid-column:1/-1">Sin plantillas para el filtro. Crea una nueva.</div>'}
      </div>
    </div>`;
    const qi = host.querySelector('#pl-q'); if (qi) qi.addEventListener('input', () => { q = qi.value; const g = host.querySelector('.pl-grid'); if (g) redrawGrid(g); });
    const fc = host.querySelector('#pl-fcanal'); if (fc) fc.addEventListener('change', () => { filtroCanal = fc.value; render(host); });
    const ft = host.querySelector('#pl-fcat'); if (ft) ft.addEventListener('change', () => { filtroCat = ft.value; render(host); });
    host.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
      const p = S().get('plantillas', b.dataset.copy);
      if (navigator.clipboard) navigator.clipboard.writeText(p.texto);
      b.textContent = '✓ Copiado'; setTimeout(() => b.textContent = '⧉ Copiar', 1200);
    }));
  }
  function redrawGrid(g) {
    g.innerHTML = lista().map(p => `<div class="pl-card">
      <div class="pl-h"><span class="pl-ico">${p.icon || '✉'}</span><div style="flex:1"><b>${U.esc(p.nombre)}</b><div class="pl-meta"><span class="badge ${p.canal === 'WhatsApp' ? 'ok' : p.canal === 'Correo' ? 'info' : p.canal === 'PDF' ? 'warn' : 'neutral'}">${p.canal}</span> <span class="badge neutral">${p.cat}</span></div></div></div>
      ${p.canal !== 'WhatsApp' && p.asunto ? `<div style="font-size:11.5px;color:var(--muted);margin:2px 0 6px"><b>Asunto:</b> ${U.esc(p.asunto)}</div>` : ''}
      <div class="pl-body">${U.esc(p.texto)}</div>
      <div class="pl-actions"><button class="btn ghost sm" onclick="(function(){var t='${p.id}';var p=Orbit.store.get('plantillas',t);navigator.clipboard&&navigator.clipboard.writeText(p.texto);})()">⧉ Copiar</button>
        <button class="btn ghost sm" onclick="Orbit.modules.plantillas.editar('${p.id}')">✎ Editar</button>
        <button class="btn ghost sm" onclick="Orbit.modules.plantillas.duplicar('${p.id}')">⧉+</button>
        <button class="btn primary sm" onclick="Orbit.modules.plantillas.usar('${p.id}')">Usar</button></div>
    </div>`).join('') || '<div class="muted" style="padding:30px;text-align:center;grid-column:1/-1">Sin plantillas para el filtro.</div>';
  }

  // ---- editor completo (crear / editar) ----
  function editar(id) {
    const p = id ? S().get('plantillas', id) : { icon: '✉', nombre: '', canal: 'Ambos', cat: 'General', asunto: '', texto: 'Hola {nombre}, ' };
    let back = document.getElementById('pl-ed'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'pl-ed'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(620px,96vw);max-height:94vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:16px">${id ? '✎ Editar plantilla' : '+ Nueva plantilla'}</b><button class="imp-x" id="pl-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <div class="cgrid" style="grid-template-columns:64px 1fr">
          <label class="ce-l">Emoji<input id="pe-icon" class="o-sel" maxlength="2" value="${U.esc(p.icon || '✉')}" style="text-align:center;font-size:18px"></label>
          <label class="ce-l">Nombre<input id="pe-nombre" class="o-sel" value="${U.esc(p.nombre)}" placeholder="Ej. Aviso de renovación"></label>
        </div>
        <div class="cgrid">
          <label class="ce-l">Canal<select id="pe-canal" class="o-sel">${CANALES.map(c => `<option ${p.canal === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="ce-l">Categoría<select id="pe-cat" class="o-sel">${CATS.map(c => `<option ${p.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        </div>
        <label class="ce-l" id="pe-asunto-w" style="${p.canal === 'WhatsApp' ? 'display:none' : ''}">Asunto (correo / PDF)<input id="pe-asunto" class="o-sel" value="${U.esc(p.asunto || '')}" placeholder="Ej. Renovación de tu póliza {poliza}"></label>
        <label class="ce-l">Mensaje<textarea id="pe-texto" class="o-sel" style="min-height:120px;resize:vertical">${U.esc(p.texto)}</textarea></label>
        <div><div style="font-size:11.5px;color:var(--muted);margin-bottom:6px">Insertar variable (clic para añadir al mensaje):</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${VARS.map(v => `<button class="btn ghost sm" data-var="${v[0]}" title="${v[1]}" style="font-family:var(--f-mono);font-size:11px">${v[0]}</button>`).join('')}</div></div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:space-between">
        ${id ? '<button class="btn ghost" id="pe-del" style="color:var(--danger)">🗑 Eliminar</button>' : '<span></span>'}
        <div style="display:flex;gap:8px"><button class="btn ghost" id="pe-cancel">Cancelar</button><button class="btn primary" id="pe-ok">Guardar</button></div>
      </div></div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s); const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#pl-x').addEventListener('click', close); $('#pe-cancel').addEventListener('click', close);
    $('#pe-canal').addEventListener('change', () => { $('#pe-asunto-w').style.display = $('#pe-canal').value === 'WhatsApp' ? 'none' : ''; });
    back.querySelectorAll('[data-var]').forEach(b => b.addEventListener('click', () => {
      const ta = $('#pe-texto'); const v = b.dataset.var;
      const s = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, s) + v + ta.value.slice(ta.selectionEnd || s); ta.focus();
    }));
    if ($('#pe-del')) $('#pe-del').addEventListener('click', () => { if (confirm('¿Eliminar esta plantilla?')) { S().remove('plantillas', id); close(); render(document.getElementById('host')); } });
    $('#pe-ok').addEventListener('click', () => {
      const data = { icon: $('#pe-icon').value || '✉', nombre: $('#pe-nombre').value || 'Plantilla', canal: $('#pe-canal').value, cat: $('#pe-cat').value, asunto: $('#pe-asunto').value, texto: $('#pe-texto').value };
      if (id) S().update('plantillas', id, data);
      else S().insert('plantillas', Object.assign({ id: 'pl-' + Date.now().toString().slice(-8) }, data));
      close(); render(document.getElementById('host'));
    });
  }

  function duplicar(id) {
    const p = S().get('plantillas', id); if (!p) return;
    S().insert('plantillas', Object.assign({}, p, { id: 'pl-' + Date.now().toString().slice(-8), nombre: p.nombre + ' (copia)' }));
    render(document.getElementById('host'));
  }

  // ---- resolver variables con un cliente real ----
  function resolver(txt, cli) {
    if (!txt) return '';
    const pol = cli ? S().where('polizas', p => p.clienteId === cli.id)[0] : null;
    const aseg = pol ? S().get('aseguradoras', pol.aseguradoraId) : null;
    const asesor = cli && cli.asesorId ? S().get('asesores', cli.asesorId) : null;
    const rec = pol ? S().where('cobros', c => c.polizaId === pol.id && (c.estado === 'Pendiente' || c.estado === 'Vencido'))[0] : null;
    const map = {
      '{nombre}': cli ? cli.nombre : '{nombre}', '{poliza}': pol ? pol.numero : '{poliza}',
      '{ramo}': pol ? (pol.ramo || '') : '{ramo}', '{aseguradora}': aseg ? aseg.nombre : '{aseguradora}',
      '{asesor}': asesor ? asesor.nombre : '{asesor}', '{placa}': (pol && pol.placa) || '{placa}',
      '{monto}': rec ? U.money(rec.monto, rec.moneda) : '{monto}', '{vence}': rec ? U.fmtDate(rec.vence) : '{vence}',
      '{pendientes}': '{pendientes}'
    };
    return txt.replace(/\{[a-z]+\}/g, m => map[m] !== undefined ? map[m] : m);
  }

  // ---- usar: elegir cliente + resolver + enrutar ----
  function usar(id) {
    const p = S().get('plantillas', id); if (!p) return;
    const clientes = S().all('clientes').slice(0, 400);
    let back = document.getElementById('pl-use'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'pl-use'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(560px,95vw);padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <div><div class="crumb" style="margin-bottom:2px">Usar plantilla</div><b style="font-family:var(--f-display);font-size:16px">${p.icon || '✉'} ${U.esc(p.nombre)}</b></div>
        <button class="imp-x" id="pu-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <label class="ce-l">Cliente<select id="pu-cli" class="o-sel"><option value="">— Elegir cliente —</option>${clientes.map(c => `<option value="${c.id}">${U.esc(c.nombre)}</option>`).join('')}</select></label>
        ${p.canal !== 'WhatsApp' && p.asunto ? `<div id="pu-asunto" style="font-size:12.5px;background:var(--soft);padding:8px 11px;border-radius:8px"><b>Asunto:</b> <span>${U.esc(p.asunto)}</span></div>` : ''}
        <div id="pu-prev" style="white-space:pre-wrap;font-size:13.5px;background:var(--soft);padding:12px 13px;border-radius:8px;line-height:1.5;border:1px solid var(--line)">${U.esc(p.texto)}</div>
        <div class="cfg-note">La vista previa se completa con los datos reales del cliente al seleccionarlo.</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        <button class="btn ghost" id="pu-copy">⧉ Copiar</button>
        ${p.canal !== 'Correo' && p.canal !== 'PDF' ? '<button class="btn ghost" id="pu-wa">💬 WhatsApp</button>' : ''}
        ${p.canal !== 'WhatsApp' ? '<button class="btn primary" id="pu-mail">✉ Redactar correo</button>' : ''}
      </div></div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s); const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#pu-x').addEventListener('click', close);
    const cur = () => { const cid = $('#pu-cli').value; return cid ? S().get('clientes', cid) : null; };
    const refresh = () => {
      const cli = cur();
      $('#pu-prev').textContent = resolver(p.texto, cli);
      const asu = $('#pu-asunto'); if (asu) asu.querySelector('span').textContent = resolver(p.asunto, cli);
    };
    $('#pu-cli').addEventListener('change', refresh);
    $('#pu-copy').addEventListener('click', () => { if (navigator.clipboard) navigator.clipboard.writeText($('#pu-prev').textContent); $('#pu-copy').textContent = '✓ Copiado'; setTimeout(() => $('#pu-copy').textContent = '⧉ Copiar', 1200); });
    if ($('#pu-wa')) $('#pu-wa').addEventListener('click', () => {
      const cli = cur(); const tel = cli && (cli.telefono || cli.whatsapp) ? String(cli.telefono || cli.whatsapp).replace(/[^0-9]/g, '') : '';
      window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent($('#pu-prev').textContent), '_blank'); close();
    });
    if ($('#pu-mail')) $('#pu-mail').addEventListener('click', () => {
      const cli = cur();
      close();
      if (Orbit.modules.correo && Orbit.modules.correo.redactar) {
        Orbit.modules.correo.redactar({ para: cli ? (cli.email || '') : '', clienteId: cli ? cli.id : '', asunto: resolver(p.asunto || p.nombre, cli), cuerpo: resolver(p.texto, cli) });
      } else { location.hash = '#/correo'; }
    });
  }

  function setCanal(c) { filtroCanal = c; const h = document.getElementById('host'); if (h) render(h); }
  // compat con llamadas antiguas
  function nueva() { editar(null); }

  return { render, editar, duplicar, usar, setCanal, nueva, resolver };
})();
