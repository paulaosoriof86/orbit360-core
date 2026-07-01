/* ============================================================
   Orbit 360 · Orbit Aseguradoras (directorio operativo) — editable
   Directorio GT/CO habilitable; ficha editable: logo, accesos
   múltiples con usuario/contraseña, contactos por tipo, cuentas,
   facturación (NIT/patrón), documentos (tarifas/cotizaciones/PDF
   que alimentan IA y Cotizador), docs requeridos por producto,
   comisiones por ramo. Importador inteligente + documental. Borrar.
   La visibilidad por rol se controla en Equipo y permisos.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.aseguradoras = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  let host;
  function paisOK(p) { return !Orbit.pais || Orbit.pais === 'TODOS' || p === Orbit.pais; }
  function up(id, patch) { S().update('aseguradoras', id, patch); }
  function reload() { if (host) render(host); }

  function render(h) {
    host = h;
    const all = S().all('aseguradoras').filter(a => paisOK(a.pais));
    const vinc = all.filter(a => a.vinculada !== false);
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '🏢', title: 'Orbit Aseguradoras', sub: 'Directorio, contactos, accesos, cuentas y documentos', features: [], actions: `<button class="btn ghost" id="asg-imp" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">✨ Importar</button><button class="btn primary" id="asg-new" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">+ Aseguradora</button>` })}
      ${K.kpis([
        { label: 'En directorio', val: all.length, color: 'var(--red)', foot: 'GT + CO', onclick: "location.hash='#/aseguradoras'" },
        { label: 'Vinculadas', val: vinc.length, color: 'var(--ok)', foot: 'con vinculación activa', footTone: 'up', onclick: "location.hash='#/aseguradoras'" },
        { label: 'Sin vincular', val: all.length - vinc.length, color: 'var(--ink-3)', foot: 'disponibles', onclick: "location.hash='#/aseguradoras'" }
      ])}
      <div class="cfg-note" style="margin-bottom:14px">Habilita/deshabilita cada aseguradora según las <b>vinculaciones</b> del intermediario (las deshabilitadas no aparecen al cotizar/emitir). <b>Importar</b> agrega o actualiza el directorio de forma inteligente, o solo almacena documentos. Quién puede ver este módulo se define en <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/equipo'">Equipo y permisos</a>.</div>
      <div class="asg-grid">${all.map(a => card(a)).join('')}</div>
    </div>`;
    host.querySelector('#asg-new').addEventListener('click', nueva);
    host.querySelector('#asg-imp').addEventListener('click', () => Orbit.importa.open('directorio-aseguradoras', { onDone: reload }));
    host.querySelectorAll('[data-asg]').forEach(el => el.addEventListener('click', e => { if (e.target.closest('.asg-switch')) return; ficha(el.dataset.asg); }));
    host.querySelectorAll('[data-toggle]').forEach(t => t.addEventListener('change', e => { e.stopPropagation(); up(t.dataset.toggle, { vinculada: t.checked }); render(host); }));
  }

  function card(a) {
    const on = a.vinculada !== false;
    const nPol = S().where('polizas', p => p.aseguradoraId === a.id).length;
    const logo = a.logo ? `<span class="asg-dot" style="padding:0;overflow:hidden"><img src="${a.logo}" style="width:100%;height:100%;object-fit:contain"></span>` : `<span class="asg-dot" style="background:${a.color}">${U.esc(a.nombre[0])}</span>`;
    return `<div class="asg-card ${on ? '' : 'off'}" data-asg="${a.id}">
      <div class="asg-card-h">
        ${logo}
        <div style="flex:1;min-width:0"><b>${U.esc(a.nombre)}</b><div class="muted" style="font-size:11.5px">${a.pais} · ${(a.ramos || []).length} ramos · ${nPol} pólizas</div></div>
        <label class="asg-switch" title="Vinculación" onclick="event.stopPropagation()"><input type="checkbox" data-toggle="${a.id}" ${on ? 'checked' : ''}><span></span></label>
      </div>
      <div class="asg-card-tags">${(a.ramos || []).slice(0, 4).map(r => `<span class="badge neutral">${r}</span>`).join('')}</div>
    </div>`;
  }

  function nueva() {
    const pais = (Orbit.pais && Orbit.pais !== 'TODOS') ? Orbit.pais : 'GT';
    const id = 'asg' + Date.now().toString().slice(-6);
    S().insert('aseguradoras', { id, nombre: 'Nueva aseguradora', color: '#1f3a5f', pais, ramos: [], comisionDefault: 12, comisiones: {}, comisionesProd: {}, vinculada: false, contactos: [], cuentas: [], portales: [], docs: [], docsRequeridos: [], facturacion: {} });
    ficha(id);
  }

  /* ===================== FICHA EDITABLE ===================== */
  function ficha(id, startEdit) {
    const a = S().get('aseguradoras', id); if (!a) return;
    const f = a.facturacion || {};
    const cont = a.contactos || [], cuentas = a.cuentas || [];
    // portales: migrar el portal único viejo a array
    const portales = a.portales && a.portales.length ? a.portales : (a.portal ? [{ nombre: 'Portal principal', url: a.portal, usuario: '', pass: '' }] : []);
    const docs = a.docs || [], reqs = a.docsRequeridos || [];
    const ramos = a.ramos || [];
    const toneTipo = { 'Comercial / Técnico': 'info', 'Comercial': 'info', 'Técnico': 'info', 'Administrativo': 'neutral', 'Siniestros': 'danger' };
    const catTone = { 'Tarifas': 'warn', 'Cotización ejemplo': 'info', 'Póliza ejemplo': 'ok', 'Formularios': 'neutral', 'Comercial': 'neutral' };
    let back = document.getElementById('asg-ficha'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'asg-ficha'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(860px,96vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:20px 24px;background:linear-gradient(120deg,${a.color},#10141a);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="display:flex;gap:13px;align-items:center">
          <label class="asg-logo" title="Cargar logo">${a.logo ? `<img src="${a.logo}">` : '<span>🏢<br><small>logo</small></span>'}<input type="file" id="af-logo" accept="image/*" style="display:none"></label>
          <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.8)">Aseguradora · ${a.pais}</div>
            <input id="af-nombre" value="${U.esc(a.nombre)}" style="font-family:var(--f-display);font-weight:800;font-size:20px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:8px;color:#fff;padding:4px 10px">
            <div style="font-size:12px;margin-top:5px;color:rgba(255,255,255,.85)">${a.vinculada !== false ? '✓ Vinculada' : 'Sin vincular'}</div></div>
        </div>
        <button class="imp-x" id="af-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button>
      </div>
      <div style="padding:18px 22px;display:grid;gap:16px">

        <div class="asg-sec">
          <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">🔗 Accesos / portales <button class="btn ghost sm" id="af-add-portal">+ Portal</button></div>
          <div id="af-portales">${portales.map((p, i) => portalRow(p, i)).join('') || '<div class="muted" style="font-size:12px">Sin portales. Algunas aseguradoras tienen varios — agrégalos arriba.</div>'}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:9px;align-items:flex-end"><label class="ce-l" style="flex:1">📁 Drive / repositorio<input id="af-drive" class="o-sel" value="${U.esc(a.drive || '')}"></label>${a.drive ? `<a class="asg-link" href="${a.drive.match(/^https?:/) ? a.drive : 'https://' + a.drive}" target="_blank" rel="noopener" title="Abrir Drive">↗ Abrir</a>` : ''}</div>
        </div>

        <div class="asg-sec">
          <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">👤 Contactos <button class="btn ghost sm" id="af-add-cont">+ Contacto</button></div>
          <div id="af-contactos">${cont.map((c, i) => contRow(c, i, toneTipo)).join('') || '<div class="muted" style="font-size:12px">Sin contactos.</div>'}</div>
        </div>

        <div class="asg-grid2">
          <div class="asg-sec">
            <div class="asg-sec-t">🧾 Datos de facturación</div>
            <label class="ce-l">NIT<input id="af-nit" class="o-sel" value="${U.esc(a.nit || '')}"></label>
            <label class="ce-l" style="margin-top:8px">Razón social<input id="af-rs" class="o-sel" value="${U.esc(f.razonSocial || '')}"></label>
            <label class="ce-l" style="margin-top:8px">Patrón de concepto<input id="af-patron" class="o-sel" value="${U.esc(f.patronConcepto || '')}"></label>
            <label class="ce-l" style="margin-top:8px">Dirección fiscal<input id="af-dir" class="o-sel" value="${U.esc(f.dirFiscal || '')}"></label>
          </div>
          <div class="asg-sec">
            <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">🏦 Cuentas <button class="btn ghost sm" id="af-add-cta">+ Cuenta</button></div>
            <div id="af-cuentas">${cuentas.map((c, i) => ctaRow(c, i)).join('') || '<div class="muted" style="font-size:12px">Sin cuentas.</div>'}</div>
          </div>
        </div>

        <div class="asg-sec">
          <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">📎 Documentos <button class="btn ghost sm" id="af-add-doc">+ Documento</button></div>
          <div class="muted" style="font-size:11.5px;margin-bottom:9px">Tarifas, cotizaciones de ejemplo y PDFs de pólizas <b>alimentan la IA, el Cotizador y el Comparativo</b>.</div>
          <div id="af-docs">${docs.map((d, i) => docRow(d, i, catTone)).join('') || '<div class="muted" style="font-size:12px">Sin documentos.</div>'}</div>
          <button class="btn ghost sm" style="margin-top:9px" id="af-imp-doc">✨ Importar documentos (mapeo inteligente)</button>
        </div>

        <div class="asg-sec">
          <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">💵 Comisiones por ramo <button class="btn ghost sm" id="af-add-ramo">+ Ramo</button></div>
          <div class="muted" style="font-size:11.5px;margin-bottom:9px">Editable a mano o por <b>importación de la planilla de comisiones</b>.</div>
          <div id="af-ramos" class="ct-grid">${ramos.map((r, i) => ramoRow(a, r, i)).join('') || '<div class="muted" style="font-size:12px">Sin ramos.</div>'}</div>
          <button class="btn ghost sm" style="margin-top:9px" id="af-imp-com">⬇ Importar planilla de comisiones</button>
        </div>

        <div class="asg-sec">
          <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">📋 Documentos requeridos para emisión (por producto) <button class="btn ghost sm" id="af-add-req">+ Requisito</button></div>
          <div id="af-reqs">${reqs.map((r, i) => reqRow(r, i)).join('') || '<div class="muted" style="font-size:12px">Sin requisitos.</div>'}</div>
        </div>
      </div>
      <div style="padding:14px 22px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap;position:sticky;bottom:0;background:var(--card)">
        <button class="btn ghost" id="af-del" style="color:var(--danger)">🗑 Borrar aseguradora</button>
        <div style="display:flex;gap:8px"><button class="btn ghost" data-close>Cerrar</button><button class="btn ghost" id="af-editar">✏ Editar</button><button class="btn primary" id="af-save" style="display:none">Guardar cambios</button></div>
      </div>
    </div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s);
    const close = () => back.remove();
    // modo vista por defecto: deshabilita controles y oculta botones de edición
    const card = back.querySelector('.card');
    function setEdit(on) {
      back.querySelectorAll('input, select, textarea').forEach(el => { if (el.type !== 'file') el.disabled = !on; });
      back.querySelectorAll('.btn.sm, .asg-del, #af-add-portal, #af-add-cont, #af-add-cta, #af-add-doc, #af-add-req, #af-add-ramo').forEach(b => b.style.display = on ? '' : 'none');
      $('#af-save').style.display = on ? '' : 'none';
      $('#af-editar').style.display = on ? 'none' : '';
      $('#af-del').style.visibility = on ? '' : 'hidden';
      card.classList.toggle('asg-view', !on);
    }
    $('#af-editar').addEventListener('click', () => setEdit(true));
    setEdit(!!startEdit);
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#af-x').addEventListener('click', close); back.querySelector('[data-close]').addEventListener('click', close);

    // logo
    $('#af-logo').addEventListener('change', e => { const file = e.target.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = () => { up(id, { logo: rd.result }); ficha(id); reload(); }; rd.readAsDataURL(file); });
    // add-rows (persisten y reabren la ficha)
    // snapshot: guarda lo escrito en el formulario ANTES de re-renderizar (evita perder filas no guardadas)
    function snapshot() {
      const g = s => (back.querySelector(s) || {}).value || '';
      const portalesNew = [...back.querySelectorAll('[data-portal]')].map(row => ({ nombre: row.querySelector('[data-pn]').value, url: row.querySelector('[data-pu]').value, usuario: row.querySelector('[data-pus]').value, pass: row.querySelector('[data-pp]').value }));
      const contNew = [...back.querySelectorAll('[data-cont]')].map(row => ({ tipo: row.querySelector('[data-ct]').value, nombre: row.querySelector('[data-cn]').value, email: row.querySelector('[data-ce]').value, tel: row.querySelector('[data-cl]').value }));
      const ctaNew = [...back.querySelectorAll('[data-cta]')].map(row => ({ banco: row.querySelector('[data-cb]').value, tipo: row.querySelector('[data-ctt]').value, numero: row.querySelector('[data-ccn]').value, moneda: row.querySelector('[data-cm]').value }));
      const docNew = [...back.querySelectorAll('[data-doc]')].map(row => ({ nombre: row.querySelector('[data-dn]').value, cat: row.querySelector('[data-dc]').value }));
      const reqNew = [...back.querySelectorAll('[data-req]')].map(row => ({ producto: row.querySelector('[data-rp]').value, items: row.querySelector('[data-ri]').value }));
      const comNew = Object.assign({}, S().get('aseguradoras', id).comisiones);
      back.querySelectorAll('[data-ramopct]').forEach(inp => { comNew[inp.dataset.ramopct] = +inp.value || 0; });
      up(id, { nombre: g('#af-nombre') || a.nombre, drive: g('#af-drive'), nit: g('#af-nit'), facturacion: { razonSocial: g('#af-rs'), patronConcepto: g('#af-patron'), dirFiscal: g('#af-dir') }, portales: portalesNew, contactos: contNew, cuentas: ctaNew, docs: docNew, docsRequeridos: reqNew, comisiones: comNew });
    }
    const push = (key, obj) => { snapshot(); const arr = (S().get('aseguradoras', id)[key] || []).slice(); arr.push(obj); up(id, { [key]: arr }); ficha(id, true); };
    $('#af-add-portal').addEventListener('click', () => push('portales', { nombre: 'Portal', url: '', usuario: '', pass: '' }));
    $('#af-add-cont').addEventListener('click', () => push('contactos', { tipo: 'Comercial / Técnico', nombre: '', email: '', tel: '' }));
    $('#af-add-cta').addEventListener('click', () => push('cuentas', { banco: '', tipo: 'Monetaria', numero: '', moneda: a.pais === 'GT' ? 'GTQ' : 'COP' }));
    $('#af-add-doc').addEventListener('click', () => push('docs', { nombre: 'Documento.pdf', cat: 'Tarifas' }));
    $('#af-add-req').addEventListener('click', () => push('docsRequeridos', { producto: '', items: '' }));
    $('#af-add-ramo').addEventListener('click', async () => { const r = await Orbit.ui.prompt('Nombre del ramo:', { title: 'Agregar ramo' }); if (!r) return; const rr = (S().get('aseguradoras', id).ramos || []).slice(); if (rr.indexOf(r) < 0) rr.push(r); const com = Object.assign({}, S().get('aseguradoras', id).comisiones); com[r] = a.comisionDefault || 12; up(id, { ramos: rr, comisiones: com }); ficha(id, true); });
    // delete-row buttons
    back.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const [key, idx] = b.dataset.del.split(':'); const arr = (S().get('aseguradoras', id)[key] || []).slice(); arr.splice(+idx, 1); up(id, { [key]: arr }); ficha(id, true);
    }));
    // importers
    $('#af-imp-doc').addEventListener('click', () => { close(); Orbit.importa.open('docs-aseguradora', { onDone: reload }); });
    $('#af-imp-com').addEventListener('click', () => { close(); Orbit.importa.open('planillas-comision', { onDone: reload }); });
    // delete aseguradora
    $('#af-del').addEventListener('click', async () => { if (!(await U.confirm('¿Borrar esta aseguradora del directorio?', { title: 'Eliminar aseguradora', ok: 'Eliminar' }))) return; S().remove('aseguradoras', id); close(); reload(); });
    // save
    $('#af-save').addEventListener('click', () => {
      const g = s => (back.querySelector(s) || {}).value || '';
      const portalesNew = [...back.querySelectorAll('[data-portal]')].map(row => ({ nombre: row.querySelector('[data-pn]').value, url: row.querySelector('[data-pu]').value, usuario: row.querySelector('[data-pus]').value, pass: row.querySelector('[data-pp]').value }));
      const contNew = [...back.querySelectorAll('[data-cont]')].map(row => ({ tipo: row.querySelector('[data-ct]').value, nombre: row.querySelector('[data-cn]').value, email: row.querySelector('[data-ce]').value, tel: row.querySelector('[data-cl]').value }));
      const ctaNew = [...back.querySelectorAll('[data-cta]')].map(row => ({ banco: row.querySelector('[data-cb]').value, tipo: row.querySelector('[data-ctt]').value, numero: row.querySelector('[data-ccn]').value, moneda: row.querySelector('[data-cm]').value }));
      const docNew = [...back.querySelectorAll('[data-doc]')].map(row => ({ nombre: row.querySelector('[data-dn]').value, cat: row.querySelector('[data-dc]').value }));
      const reqNew = [...back.querySelectorAll('[data-req]')].map(row => ({ producto: row.querySelector('[data-rp]').value, items: row.querySelector('[data-ri]').value }));
      const comNew = Object.assign({}, S().get('aseguradoras', id).comisiones);
      back.querySelectorAll('[data-ramopct]').forEach(inp => { comNew[inp.dataset.ramopct] = +inp.value || 0; });
      up(id, {
        nombre: g('#af-nombre') || a.nombre, drive: g('#af-drive'), nit: g('#af-nit'),
        facturacion: { razonSocial: g('#af-rs'), patronConcepto: g('#af-patron'), dirFiscal: g('#af-dir') },
        portales: portalesNew, contactos: contNew, cuentas: ctaNew, docs: docNew, docsRequeridos: reqNew, comisiones: comNew
      });
      close(); reload();
    });
  }

  /* ---- filas editables ---- */
  function portalRow(p, i) {
    return `<div class="asg-row" data-portal="${i}">
      <input class="o-sel" data-pn placeholder="Nombre del portal" value="${U.esc(p.nombre || '')}" style="flex:1.2">
      <input class="o-sel" data-pu placeholder="https://…" value="${U.esc(p.url || '')}" style="flex:1.5">
      <input class="o-sel" data-pus placeholder="Usuario" value="${U.esc(p.usuario || '')}" style="flex:1">
      <input class="o-sel" data-pp type="password" placeholder="Contraseña" value="${U.esc(p.pass || '')}" style="flex:1">
      ${p.url ? `<a class="asg-link" href="${p.url.match(/^https?:/) ? p.url : 'https://' + p.url}" target="_blank" rel="noopener" title="Abrir portal">↗</a>` : ''}
      <button class="asg-del" data-del="portales:${i}" title="Quitar">✕</button></div>`;
  }
  function contRow(c, i, tone) {
    const tipos = ['Comercial / Técnico', 'Administrativo', 'Siniestros', 'Cobranzas', 'Dirección'];
    return `<div class="asg-row" data-cont="${i}">
      <select class="o-sel" data-ct style="flex:1">${tipos.map(t => `<option ${t === c.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <input class="o-sel" data-cn placeholder="Nombre" value="${U.esc(c.nombre || '')}" style="flex:1">
      <input class="o-sel" data-ce placeholder="Correo" value="${U.esc(c.email || '')}" style="flex:1.3">
      <input class="o-sel" data-cl placeholder="Teléfono" value="${U.esc(c.tel || '')}" style="flex:1">
      <button class="asg-del" data-del="contactos:${i}">✕</button></div>`;
  }
  function ctaRow(c, i) {
    return `<div class="asg-row" data-cta="${i}">
      <input class="o-sel" data-cb placeholder="Banco" value="${U.esc(c.banco || '')}" style="flex:1.3">
      <input class="o-sel" data-ctt placeholder="Tipo" value="${U.esc(c.tipo || '')}" style="flex:1">
      <input class="o-sel" data-ccn placeholder="N.º cuenta" value="${U.esc(c.numero || '')}" style="flex:1">
      <input class="o-sel" data-cm placeholder="Moneda" value="${U.esc(c.moneda || '')}" style="width:64px">
      <button class="asg-del" data-del="cuentas:${i}">✕</button></div>`;
  }
  function docRow(d, i, tone) {
    const cats = ['Tarifas', 'Cotización ejemplo', 'Póliza ejemplo', 'Formularios', 'Comercial'];
    return `<div class="asg-row" data-doc="${i}">
      <span style="font-size:14px">📎</span>
      <input class="o-sel" data-dn value="${U.esc(d.nombre || '')}" style="flex:1.5">
      <select class="o-sel" data-dc style="flex:1">${cats.map(c => `<option ${c === d.cat ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <button class="asg-del" data-del="docs:${i}">✕</button></div>`;
  }
  function reqRow(r, i) {
    return `<div class="asg-row" data-req="${i}">
      <input class="o-sel" data-rp placeholder="Producto" value="${U.esc(r.producto || '')}" style="flex:1">
      <input class="o-sel" data-ri placeholder="Requisitos" value="${U.esc(r.items || '')}" style="flex:2.2">
      <button class="asg-del" data-del="docsRequeridos:${i}">✕</button></div>`;
  }
  function ramoRow(a, r, i) {
    const pct = (a.comisiones && a.comisiones[r] != null) ? a.comisiones[r] : (a.comisionDefault || 12);
    return `<div class="ct-cell"><span>${U.esc(r)}</span><div class="ct-inp"><input type="number" min="0" max="100" step="0.5" data-ramopct="${U.esc(r)}" value="${pct}"><span>%</span></div></div>`;
  }

  return { render, ficha };
})();
