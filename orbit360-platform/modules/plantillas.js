/* ============================================================
   Orbit 360 · Plantillas de mensajes
   Biblioteca de plantillas WhatsApp / Correo / PDF con variables,
   CRUD completo, preview con datos reales y "Usar". Persiste en
   Orbit.store('plantillas'). WhatsApp Web abierto no equivale a
   mensaje entregado; se registra como comunicación preparada.
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
  const VARS = [['{nombre}', 'Nombre del cliente'], ['{poliza}', 'Número de póliza'], ['{monto}', 'Monto / cuota'], ['{vence}', 'Fecha de vencimiento'], ['{pendientes}', 'Datos faltantes'], ['{ramo}', 'Ramo'], ['{aseguradora}', 'Aseguradora'], ['{asesor}', 'Asesor asignado'], ['{placa}', 'Placa vehículo']];
  const CANALES = ['Ambos', 'WhatsApp', 'Correo', 'PDF'];
  const CATS = ['Comercial', 'Cobranza', 'Retención', 'Calidad', 'Onboarding', 'Siniestros', 'General'];
  let filtroCanal = '', filtroCat = '', q = '';

  let useLifecycleBound = false;
  // Only the read-only use dialog belongs to this cleanup. Never dismiss
  // unrelated drawers, legal gates or editors with unsaved changes.
  function closeUseDialog() {
    const back = document.getElementById('pl-use');
    if (back) back.remove();
  }
  function bindUseLifecycle() {
    if (useLifecycleBound) return;
    useLifecycleBound = true;
    document.addEventListener('orbit:route-ready', () => {
      if (!Orbit.route || Orbit.route.key !== 'plantillas') closeUseDialog();
    });
    document.addEventListener('orbit:pais', closeUseDialog);
    document.addEventListener('orbit:session', closeUseDialog);
    window.addEventListener('hashchange', () => {
      const route = String(window.location && window.location.hash || '').replace(/^#\/?/, '').split('?')[0];
      if (route !== 'plantillas') closeUseDialog();
    });
  }


  // El catálogo histórico puede leerse sin crear registros en el tenant.
  // En producto, el CRUD requiere un propietario de persistencia autorizado.
  function puedeEditar() { return !S().__productOperationalWriteP0; }
  function visibles() { const persisted = S().all('plantillas') || []; return persisted.length ? persisted : SEED.map(p => Object.assign({ __baseSoloLectura: true }, p)); }
  function obtener(id) { return S().get('plantillas', id) || SEED.find(p => p.id === id) || null; }
  function lista() { return visibles().filter(p => (!filtroCanal || p.canal === filtroCanal || (filtroCanal !== 'PDF' && p.canal === 'Ambos')) && (!filtroCat || p.cat === filtroCat) && (!q || (p.nombre + ' ' + p.texto).toLowerCase().includes(q.toLowerCase()))); }
  function toast(msg) { const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

  function render(host) {
    bindUseLifecycle();
    const all = visibles();
    const baseSoloLectura = all.some(p => p.__baseSoloLectura);
    const editorActivo = puedeEditar();
    const porCanal = c => all.filter(p => p.canal === c || (c !== 'PDF' && p.canal === 'Ambos')).length;
    host.innerHTML = `<div class="page">
      ${K.bannerFor('plantillas', editorActivo ? `<button class="btn primary" onclick="Orbit.modules.plantillas.editar(null)">+ Nueva plantilla</button>` : `<button class="btn ghost" disabled title="Requiere persistencia autorizada del servidor">+ Nueva plantilla · pendiente</button>`)}
      ${K.kpis([
        { label: 'Plantillas', val: all.length, color: 'var(--red)', foot: CATS.filter(c => all.some(p => p.cat === c)).length + ' categorías', onclick: "Orbit.modules.plantillas.setCanal('')" },
        { label: 'WhatsApp', val: porCanal('WhatsApp'), color: 'var(--ok)', foot: 'canal preparado', onclick: "Orbit.modules.plantillas.setCanal('WhatsApp')" },
        { label: 'Correo', val: porCanal('Correo'), color: 'var(--info)', foot: 'con asunto', onclick: "Orbit.modules.plantillas.setCanal('Correo')" },
        { label: 'PDF', val: porCanal('PDF'), color: 'var(--warn)', foot: 'documento', onclick: "Orbit.modules.plantillas.setCanal('PDF')" }
      ])}
      <div class="cfg-note" style="margin:4px 0 16px">✉ ${baseSoloLectura ? 'Se muestran seis plantillas del catálogo histórico en modo consulta: no son registros guardados. ' : ''}${!editorActivo ? 'Alta, edición y duplicación requieren el contrato seguro de persistencia del servidor. ' : ''}WhatsApp Web abre el chat, pero el envío real se confirma en WhatsApp/proveedor.</div>
      <div class="card pad" style="margin-bottom:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input id="pl-q" class="o-sel" style="flex:1;min-width:180px" placeholder="🔎 Buscar plantilla…" value="${U.esc(q)}"><select id="pl-fcanal" class="o-sel" style="width:auto"><option value="">Todos los canales</option>${CANALES.map(c => `<option ${filtroCanal === c ? 'selected' : ''}>${c}</option>`).join('')}</select><select id="pl-fcat" class="o-sel" style="width:auto"><option value="">Todas las categorías</option>${CATS.map(c => `<option ${filtroCat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="pl-grid">${cardsHtml()}</div>
    </div>`;
    const qi = host.querySelector('#pl-q'); if (qi) qi.addEventListener('input', () => { q = qi.value; const g = host.querySelector('.pl-grid'); if (g) g.innerHTML = cardsHtml(); });
    const fc = host.querySelector('#pl-fcanal'); if (fc) fc.addEventListener('change', () => { filtroCanal = fc.value; render(host); });
    const ft = host.querySelector('#pl-fcat'); if (ft) ft.addEventListener('change', () => { filtroCat = ft.value; render(host); });
    host.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => { const p = obtener(b.dataset.copy); if (p && navigator.clipboard) navigator.clipboard.writeText(p.texto); b.textContent = '✓ Copiado'; setTimeout(() => b.textContent = '⧉ Copiar', 1200); }));
  }

  function cardsHtml() {
    return lista().map(p => `<div class="pl-card"><div class="pl-h"><span class="pl-ico">${p.icon || '✉'}</span><div style="flex:1"><b>${U.esc(p.nombre)}</b><div class="pl-meta"><span class="badge ${p.canal === 'WhatsApp' ? 'ok' : p.canal === 'Correo' ? 'info' : p.canal === 'PDF' ? 'warn' : 'neutral'}">${p.canal}</span> <span class="badge neutral">${p.cat}</span>${p.__baseSoloLectura ? ' <span class="badge neutral">Base · consulta</span>' : ''}</div></div></div>${p.canal !== 'WhatsApp' && p.asunto ? `<div style="font-size:11.5px;color:var(--muted);margin:2px 0 6px"><b>Asunto:</b> ${U.esc(p.asunto)}</div>` : ''}<div class="pl-body">${U.esc(p.texto)}</div><div class="pl-actions"><button class="btn ghost sm" data-copy="${p.id}">⧉ Copiar</button>${puedeEditar() ? `<button class="btn ghost sm" onclick="Orbit.modules.plantillas.editar('${p.id}')">✎ Editar</button><button class="btn ghost sm" onclick="Orbit.modules.plantillas.duplicar('${p.id}')">⧉+</button>` : ''}<button class="btn primary sm" onclick="Orbit.modules.plantillas.usar('${p.id}')">Usar</button></div></div>`).join('') || '<div class="muted" style="padding:30px;text-align:center;grid-column:1/-1">Sin plantillas para el filtro. Crea una nueva.</div>';
  }

  function editar(id) {
    if (!puedeEditar()) { toast('Edición pendiente de contrato seguro de persistencia.'); return; }
    const p = id ? S().get('plantillas', id) : { icon: '✉', nombre: '', canal: 'Ambos', cat: 'General', asunto: '', texto: 'Hola {nombre}, ' };
    let back = document.getElementById('pl-ed'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'pl-ed'; back.className = 'drawer-back open'; back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(620px,96vw);max-height:94vh;overflow:auto;padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:16px">${id ? '✎ Editar plantilla' : '+ Nueva plantilla'}</b><button class="imp-x" id="pl-x">✕</button></div><div style="padding:18px 20px;display:grid;gap:12px"><div class="cgrid" style="grid-template-columns:64px 1fr"><label class="ce-l">Emoji<input id="pe-icon" class="o-sel" maxlength="2" value="${U.esc(p.icon || '✉')}" style="text-align:center;font-size:18px"></label><label class="ce-l">Nombre<input id="pe-nombre" class="o-sel" value="${U.esc(p.nombre)}" placeholder="Ej. Aviso de renovación"></label></div><div class="cgrid"><label class="ce-l">Canal<select id="pe-canal" class="o-sel">${CANALES.map(c => `<option ${p.canal === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label class="ce-l">Categoría<select id="pe-cat" class="o-sel">${CATS.map(c => `<option ${p.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div><label class="ce-l" id="pe-asunto-w" style="${p.canal === 'WhatsApp' ? 'display:none' : ''}">Asunto (correo / PDF)<input id="pe-asunto" class="o-sel" value="${U.esc(p.asunto || '')}" placeholder="Ej. Renovación de tu póliza {poliza}"></label><label class="ce-l">Mensaje<textarea id="pe-texto" class="o-sel" style="min-height:120px;resize:vertical">${U.esc(p.texto)}</textarea></label><div><div style="font-size:11.5px;color:var(--muted);margin-bottom:6px">Insertar variable:</div><div style="display:flex;flex-wrap:wrap;gap:6px">${VARS.map(v => `<button class="btn ghost sm" data-var="${v[0]}" title="${v[1]}" style="font-family:var(--f-mono);font-size:11px">${v[0]}</button>`).join('')}</div></div></div><div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:space-between">${id ? '<button class="btn ghost" id="pe-del" style="color:var(--danger)">🗑 Eliminar</button>' : '<span></span>'}<div style="display:flex;gap:8px"><button class="btn ghost" id="pe-cancel">Cancelar</button><button class="btn primary" id="pe-ok">Guardar</button></div></div></div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s), close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); }); $('#pl-x').addEventListener('click', close); $('#pe-cancel').addEventListener('click', close);
    $('#pe-canal').addEventListener('change', () => { $('#pe-asunto-w').style.display = $('#pe-canal').value === 'WhatsApp' ? 'none' : ''; });
    back.querySelectorAll('[data-var]').forEach(b => b.addEventListener('click', () => { const ta = $('#pe-texto'); ta.value = ta.value + ' ' + b.dataset.var; ta.focus(); }));
    if ($('#pe-del')) $('#pe-del').addEventListener('click', () => { S().remove('plantillas', id); close(); render(document.getElementById('host')); });
    $('#pe-ok').addEventListener('click', () => { const data = { icon: $('#pe-icon').value || '✉', nombre: $('#pe-nombre').value || 'Plantilla', canal: $('#pe-canal').value, cat: $('#pe-cat').value, asunto: $('#pe-asunto') ? $('#pe-asunto').value : '', texto: $('#pe-texto').value }; if (id) S().update('plantillas', id, data); else S().insert('plantillas', Object.assign({ id: 'pl' + Date.now().toString().slice(-7) }, data)); close(); render(document.getElementById('host')); });
  }

  function duplicar(id) { if (!puedeEditar()) { toast('Duplicación pendiente de contrato seguro.'); return; } const p = S().get('plantillas', id); if (!p) return; const cp = Object.assign({}, p, { id: 'pl' + Date.now().toString().slice(-7), nombre: p.nombre + ' (copia)' }); S().insert('plantillas', cp); render(document.getElementById('host')); }

  function policiesFor(cli) {
    return cli ? S().where('polizas', p => String(p.clienteId || '') === String(cli.id || '')) : [];
  }
  function rowKey(row) {
    return String(row && (row.id || row.reciboId || row.receiptId || row.cobroId || row.paymentId) || '').trim();
  }
  function policyFor(cli, policyId) {
    const rows = policiesFor(cli);
    if (policyId) return rows.find(p => String(p.id) === String(policyId)) || null;
    return rows.length === 1 ? rows[0] : null;
  }
  function obligationRows(cli, policyId) {
    if (!cli || !Orbit.q) return [];
    const rows = []
      .concat(typeof Orbit.q.carteraVencidaDe === 'function' ? Orbit.q.carteraVencidaDe(cli.id) : [])
      .concat(typeof Orbit.q.carteraPendienteDe === 'function' ? Orbit.q.carteraPendienteDe(cli.id) : []);
    return rows.filter(r => !policyId || String(r.polizaId || r.policyId || '') === String(policyId));
  }
  function confirmedRows(cli, policyId) {
    if (!cli || !Orbit.q || typeof Orbit.q.cobrosConfirmadosRows !== 'function') return [];
    const policies = new Map(policiesFor(cli).map(p => [String(p.id), p]));
    return Orbit.q.cobrosConfirmadosRows().filter(r => {
      const pid = String(r && (r.polizaId || r.policyId) || '');
      const clientId = String(r && r.clienteId || '');
      const belongs = clientId ? clientId === String(cli.id) : policies.has(pid);
      return belongs && (!policyId || pid === String(policyId));
    });
  }
  function uniqueSelectable(rows) {
    const keyed = rows.map(row => ({ row, key: rowKey(row) })).filter(x => x.key);
    const counts = new Map();
    keyed.forEach(x => counts.set(x.key, (counts.get(x.key) || 0) + 1));
    return keyed.filter(x => counts.get(x.key) === 1);
  }
  function resolveItem(rows, itemId) {
    const selectable = uniqueSelectable(rows);
    if (itemId) return (selectable.find(x => x.key === String(itemId)) || {}).row || null;
    return selectable.length === 1 && rows.length === 1 ? selectable[0].row : null;
  }
  function compatibleCurrency(row, pol) {
    const a = String(pol && (pol.moneda || pol.divisa) || '').trim().toUpperCase();
    const b = String(row && row.moneda || '').trim().toUpperCase();
    if (a && b && a !== b) return '';
    if (String(row && row.currencyValidation || '').toUpperCase() === 'REQUIERE_VALIDACION') return '';
    return a || b || '';
  }
  function financialContext(plantilla, cli, policyId, itemId) {
    const pol = policyFor(cli, policyId);
    if (!cli) return { pol: null, item: null, kind: '' };
    if (plantilla && plantilla.id === 'pl-prima') {
      const rows = obligationRows(cli, pol && pol.id);
      return { pol, item: resolveItem(rows, itemId), kind: 'obligation', rows };
    }
    if (plantilla && plantilla.id === 'pl-pago-ok') {
      const rows = confirmedRows(cli, pol && pol.id);
      return { pol, item: resolveItem(rows, itemId), kind: 'payment', rows };
    }
    return { pol, item: null, kind: '', rows: [] };
  }
  function resolver(txt, cli, opts) {
    if (!txt) return '';
    opts = opts || {};
    const plantilla = opts.plantilla || (opts.plantillaId ? obtener(opts.plantillaId) : null);
    const ctx = financialContext(plantilla, cli, opts.policyId, opts.itemId);
    const pol = ctx.pol;
    const aseg = pol ? S().get('aseguradoras', pol.aseguradoraId) : null;
    const asesor = cli && cli.asesorId ? S().get('asesores', cli.asesorId) : null;
    let amountText = '{monto}', dueText = '{vence}';
    if (ctx.kind === 'obligation' && ctx.item && pol && Orbit.q) {
      const proof = typeof Orbit.q.portfolioAmountProof === 'function'
        ? Orbit.q.portfolioAmountProof(ctx.item, typeof Orbit.q.portfolioAmountContext === 'function' ? Orbit.q.portfolioAmountContext() : undefined)
        : { value: null };
      const cur = compatibleCurrency(ctx.item, pol);
      if (proof && proof.value != null && cur) amountText = U.money(proof.value, cur);
      const due = typeof Orbit.q.portfolioDue === 'function' ? Orbit.q.portfolioDue(ctx.item) : (ctx.item.fechaLimite || ctx.item.fechaVencimiento || ctx.item.vence || '');
      if (due) dueText = U.fmtDate(due);
    } else if (ctx.kind === 'payment' && ctx.item && pol) {
      const n = Number(ctx.item.monto), cur = compatibleCurrency(ctx.item, pol);
      if (Number.isFinite(n) && cur) amountText = U.money(n, cur);
    } else if (pol && plantilla && plantilla.id === 'pl-renov') {
      const due = pol.vigenciaFin || pol.fechaFin || '';
      if (due) dueText = U.fmtDate(due);
    }
    const map = { '{nombre}': cli ? cli.nombre : '{nombre}', '{poliza}': pol ? pol.numero : '{poliza}', '{ramo}': pol ? (pol.ramo || '') : '{ramo}', '{aseguradora}': aseg ? aseg.nombre : '{aseguradora}', '{asesor}': asesor ? asesor.nombre : '{asesor}', '{placa}': (pol && pol.placa) || '{placa}', '{monto}': amountText, '{vence}': dueText, '{pendientes}': '{pendientes}' };
    return txt.replace(/\{[a-z]+\}/g, m => map[m] !== undefined ? map[m] : m);
  }

  function usar(id) {
    bindUseLifecycle();
    const p = obtener(id); if (!p) return;
    const clientes = Orbit.access && typeof Orbit.access.filter === 'function' ? Orbit.access.filter('clientes', S().all('clientes'), 'plantillas').slice(0, 400) : [];
    let back = document.getElementById('pl-use'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'pl-use'; back.className = 'drawer-back open'; back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    back.innerHTML = `<div class="card" style="width:min(560px,95vw);padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><div><div class="crumb" style="margin-bottom:2px">Usar plantilla</div><b style="font-family:var(--f-display);font-size:16px">${p.icon || '✉'} ${U.esc(p.nombre)}</b></div><button class="imp-x" id="pu-x">✕</button></div><div style="padding:18px 20px;display:grid;gap:12px"><label class="ce-l">Cliente<select id="pu-cli" class="o-sel"><option value="">— Elegir cliente —</option>${clientes.map(c => `<option value="${c.id}">${U.esc(c.nombre)}</option>`).join('')}</select></label><div id="pu-context" style="display:grid;gap:10px"></div>${p.canal !== 'WhatsApp' && p.asunto ? `<div id="pu-asunto" style="font-size:12.5px;background:var(--soft);padding:8px 11px;border-radius:8px"><b>Asunto:</b> <span>${U.esc(p.asunto)}</span></div>` : ''}<div id="pu-prev" style="white-space:pre-wrap;font-size:13.5px;background:var(--soft);padding:12px 13px;border-radius:8px;line-height:1.5;border:1px solid var(--line)">${U.esc(p.texto)}</div><div class="cfg-note">La vista previa se completa con datos del cliente. WhatsApp abre el chat; confirma el envío en WhatsApp.</div></div><div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn ghost" id="pu-copy">⧉ Copiar</button>${p.canal !== 'Correo' && p.canal !== 'PDF' ? '<button class="btn ghost" id="pu-wa">💬 WhatsApp</button>' : ''}${p.canal !== 'WhatsApp' ? '<button class="btn primary" id="pu-mail">✉ Redactar correo</button>' : ''}</div></div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s), close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); }); $('#pu-x').addEventListener('click', close);
    const cur = () => { const cid = $('#pu-cli').value; return cid ? S().get('clientes', cid) : null; };
    let selectedPolicyId = '', selectedItemId = '';
    const renderResolved = () => {
      const cli = cur(), opts = { plantilla: p, policyId: selectedPolicyId, itemId: selectedItemId };
      $('#pu-prev').textContent = resolver(p.texto, cli, opts);
      const asu = $('#pu-asunto'); if (asu) asu.querySelector('span').textContent = resolver(p.asunto, cli, opts);
    };
    const renderContext = () => {
      const cli = cur(), wrap = $('#pu-context'), policies = policiesFor(cli);
      if (!policies.some(x => String(x.id) === selectedPolicyId)) selectedPolicyId = policies.length === 1 ? String(policies[0].id) : '';
      const pol = policyFor(cli, selectedPolicyId);
      const finRows = !pol && policies.length > 1 ? [] : p.id === 'pl-prima' ? obligationRows(cli, pol && pol.id) : p.id === 'pl-pago-ok' ? confirmedRows(cli, pol && pol.id) : [];
      const selectable = uniqueSelectable(finRows);
      if (!selectable.some(x => x.key === selectedItemId)) selectedItemId = selectable.length === 1 && finRows.length === 1 ? selectable[0].key : '';
      const policyField = policies.length > 1
        ? '<label class="ce-l">Póliza<select id="pu-pol" class="o-sel"><option value="">— Elegir póliza —</option>'+policies.map(x=>'<option value="'+U.esc(String(x.id))+'" '+(String(x.id)===selectedPolicyId?'selected':'')+'>'+U.esc(String(x.numero||x.id))+' · '+U.esc(String(x.ramo||''))+'</option>').join('')+'</select></label>'
        : policies.length === 1 ? '<div class="cfg-note">Póliza: <b>'+U.esc(String(policies[0].numero||policies[0].id))+'</b></div>' : '';
      const itemLabel = p.id === 'pl-pago-ok' ? 'Pago confirmado' : 'Cuota / obligación';
      const itemField = finRows.length > 1
        ? '<label class="ce-l">'+itemLabel+'<select id="pu-item" class="o-sel"><option value="">— Elegir registro —</option>'+selectable.map(x=>{const r=x.row,d=p.id==='pl-pago-ok'?(r.fechaPago||r.paidDate||''):(Orbit.q&&Orbit.q.portfolioDue?Orbit.q.portfolioDue(r):(r.vence||r.fechaLimite||'')),n=Number(r.monto!=null?r.monto:r.saldo),polx=pol||S().get('polizas',r.polizaId),cur=compatibleCurrency(r,polx);return '<option value="'+U.esc(x.key)+'" '+(x.key===selectedItemId?'selected':'')+'>'+U.esc(String(d||'Sin fecha'))+(Number.isFinite(n)&&cur?' · '+U.esc(U.money(n,cur)):'')+'</option>';}).join('')+'</select></label>'
        : '';
      const unresolved = (p.id==='pl-prima'||p.id==='pl-pago-ok') && finRows.length > 1 && !selectedItemId
        ? '<div class="cfg-note" data-plantilla-financial-ambiguity="1">Hay más de un registro posible. Selecciona el correcto; no se completarán monto ni fecha por inferencia.</div>' : '';
      wrap.innerHTML = policyField + itemField + unresolved;
      const ps = $('#pu-pol'); if (ps) ps.addEventListener('change',()=>{selectedPolicyId=ps.value;selectedItemId='';renderContext();});
      const isel = $('#pu-item'); if (isel) isel.addEventListener('change',()=>{selectedItemId=isel.value;renderResolved();});
      renderResolved();
    };
    $('#pu-cli').addEventListener('change',()=>{selectedPolicyId='';selectedItemId='';renderContext();});
    renderContext();
    $('#pu-copy').addEventListener('click', () => { if (navigator.clipboard) navigator.clipboard.writeText($('#pu-prev').textContent); $('#pu-copy').textContent = '✓ Copiado'; setTimeout(() => $('#pu-copy').textContent = '⧉ Copiar', 1200); });
    if ($('#pu-wa')) $('#pu-wa').addEventListener('click', () => {
      const cli = cur(); if (!cli) { toast('Selecciona un cliente.'); return; }
      const tel = cli && (cli.telefono || cli.whatsapp) ? String(cli.telefono || cli.whatsapp).replace(/[^0-9]/g, '') : '';
      if (!tel) { toast('Cliente sin teléfono/WhatsApp configurado.'); return; }
      const msg = $('#pu-prev').textContent;
      S().insert('actividades', { id: 'act' + Date.now(), clienteId: cli.id, asesorId: cli.asesorId || '', tipo: 'whatsapp', icon: '💬', fecha: Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10), titulo: 'Mensaje de plantilla preparado', detalle: (p.nombre || 'Plantilla') + ' · WhatsApp Web abierto' });
      window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(msg), '_blank');
      toast('Chat abierto en WhatsApp Web; confirma el envío en WhatsApp.');
      close();
    });
    if ($('#pu-mail')) $('#pu-mail').addEventListener('click', () => { const cli = cur(), opts={plantilla:p,policyId:selectedPolicyId,itemId:selectedItemId}; close(); if (Orbit.modules.correo && Orbit.modules.correo.redactar) Orbit.modules.correo.redactar({ para: cli ? (cli.email || '') : '', clienteId: cli ? cli.id : '', asunto: resolver(p.asunto || p.nombre, cli, opts), cuerpo: resolver(p.texto, cli, opts) }); else location.hash = '#/correo'; });
  }

  function setCanal(c) { filtroCanal = c; const h = document.getElementById('host'); if (h) render(h); }
  function nueva() { editar(null); }
  return { render, editar, duplicar, usar, setCanal, nueva, resolver };
})();
