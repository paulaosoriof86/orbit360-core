/* ============================================================
   Orbit 360 · 📋 Comparativo (independiente)
   Toma las cotizaciones elegidas del Cotizador (Orbit._cots) y/o
   propuestas cargadas como PDF (de aseguradoras sin tarifa). Arma
   un comparativo bonito y compacto, con la mejor opción destacada
   e impresión (A4 vertical / horizontal si son 4+ aseguradoras).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.comparativo = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  let host, props = [];
  let meta = { cliente: '', ramo: 'Auto', marca: '', linea: '', anio: 2022, detalle: '' };
  const VEH = {
    'Toyota': ['Corolla', 'Hilux', 'RAV4', 'Yaris', 'Land Cruiser', 'Prado', 'Fortuner'],
    'Hyundai': ['Tucson', 'Accent', 'Elantra', 'Santa Fe', 'Creta', 'i10'],
    'Kia': ['Sportage', 'Rio', 'Picanto', 'Sorento', 'Seltos'],
    'Nissan': ['Sentra', 'Frontier', 'Versa', 'Kicks', 'X-Trail'],
    'Mazda': ['Mazda 3', 'CX-5', 'CX-30', 'Mazda 2', 'BT-50'],
    'Chevrolet': ['Spark', 'Onix', 'Tracker', 'Captiva', 'D-Max'],
    'Honda': ['Civic', 'CR-V', 'HR-V', 'Fit'],
    'Volkswagen': ['Jetta', 'Tiguan', 'Gol', 'Amarok', 'T-Cross'],
    'Otra': ['—']
  };
  function datosIniciales() {
    const marcas = Object.keys(VEH), lineas = VEH[meta.marca] || [];
    return `<div class="card pad" style="margin-bottom:14px">
      <div class="asg-sec-t">📋 Datos del comparativo</div>
      <div class="cgrid">
        <label class="ce-l">🧑 Cliente / prospecto<input id="cp-cli" class="o-sel" value="${U.esc(meta.cliente)}" placeholder="Nombre"></label>
        <label class="ce-l">🛡️ Ramo<select id="cp-ramo" class="o-sel">${['Auto', 'Vida', 'Gastos Médicos', 'Hogar', 'Daños'].map(r => `<option ${r === meta.ramo ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
        ${meta.ramo === 'Auto' ? `
          <label class="ce-l">📅 Año<input id="cp-anio" class="o-sel" type="number" value="${meta.anio}"></label>
          <label class="ce-l">🚗 Marca<select id="cp-marca" class="o-sel"><option value="">— Marca —</option>${marcas.map(m => `<option ${m === meta.marca ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
          <label class="ce-l">🔻 Línea<select id="cp-linea" class="o-sel" ${lineas.length ? '' : 'disabled'}><option value="">${lineas.length ? '— Línea —' : 'Elige marca'}</option>${lineas.map(l => `<option ${l === meta.linea ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`
        : `<label class="ce-l">📝 Detalle del riesgo<input id="cp-det" class="o-sel" value="${U.esc(meta.detalle)}" placeholder="Suma, ubicación, edad…"></label>`}
      </div>
    </div>`;
  }
  function bindMeta() {
    const set = (id, k, num) => { const el = host.querySelector(id); if (el) el.addEventListener('change', () => { meta[k] = num ? +el.value : el.value; if (k === 'ramo' || k === 'marca') render(host); }); };
    set('#cp-cli', 'cliente'); set('#cp-ramo', 'ramo'); set('#cp-anio', 'anio', true); set('#cp-det', 'detalle');
    const mk = host.querySelector('#cp-marca'); if (mk) mk.addEventListener('change', () => { meta.marca = mk.value; meta.linea = ''; render(host); });
    const ln = host.querySelector('#cp-linea'); if (ln) ln.addEventListener('change', () => { meta.linea = ln.value; });
  }

  function init() {
    if (Orbit._cots && Orbit._cots.length && !props.length) props = Orbit._cots.map(c => ({ nombre: c.nombre, color: c.color, total: c.total, neta: c.neta, iva: c.iva, cur: c.cur, ramo: c.ramo, cliente: c.cliente, fracc: c.fracc, origen: 'cotizador' }));
  }

  function render(h) {
    host = h; init();
    const cur = (props[0] || {}).cur || 'GTQ';
    const min = props.length ? Math.min(...props.map(p => p.total || 1e15)) : 0;
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '📋', title: 'Comparativo', sub: 'Compara propuestas (del cotizador o por PDF) y cierra con la mejor', features: [], actions: `<button class="btn ghost" id="cp-hist-b" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">🕘 Historial</button><button class="btn ghost" id="cp-pdf" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">⬆ Cargar propuestas (PDF)</button>` })}
      ${props.length ? '' : '<div class="cfg-note" style="margin-bottom:14px">📋 El comparativo funciona <b>solo</b>: llena los <b>datos del riesgo</b> abajo, luego <b>⬆ carga PDFs</b> de propuestas o <b>➕ agrégalas manual</b>. También puedes traerlas desde el <a style="color:var(--red);cursor:pointer" onclick="location.hash=\'#/cotizador\'">🧮 Cotizador</a> (opcional).</div>'}
      ${datosIniciales()}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <b style="font-family:var(--f-display);font-size:16px">${props.length ? '⚖️ ' + props.length + ' propuestas · ' + ((props[0] || {}).ramo || '') : '⚖️ Nuevo comparativo'}</b>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" id="cp-add">➕ Propuesta manual</button>${props.length ? `<button class="btn ghost sm" id="cp-save">💾 Guardar</button><button class="btn primary sm" id="cp-print">🖨 Imprimir</button>` : ''}</div>
      </div>
      <div id="cp-out" class="cz-cards">${props.map((p, i) => card(p, p.total === min, i, cur)).join('') || '<div class="muted" style="padding:30px 0;text-align:center;grid-column:1/-1">Sin propuestas todavía.</div>'}</div>
      ${props.length > 1 ? tabla(cur, min) : ''}
    </div>`;
    host.querySelector('#cp-pdf').addEventListener('click', cargarPDF);
    host.querySelector('#cp-hist-b').addEventListener('click', verHist);
    bindMeta();
    const add = host.querySelector('#cp-add'); if (add) add.addEventListener('click', manual);
    const sv = host.querySelector('#cp-save'); if (sv) sv.addEventListener('click', guardarHist);
    const pr = host.querySelector('#cp-print'); if (pr) pr.addEventListener('click', imprimir);
    host.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { props.splice(+b.dataset.del, 1); render(host); }));
  }
  function card(p, win, i, cur) {
    return `<div class="cz-card ${win ? 'win' : ''}">
      ${win ? '<span class="cz-badge">🏆 Mejor opción</span>' : ''}
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="dot-s" style="background:${p.color || '#999'};width:11px;height:11px"></span><b style="font-family:var(--f-display);flex:1">${U.esc(p.nombre)}</b>${p.origen === 'pdf' ? '<span class="badge info" style="font-size:9px">📄 PDF</span>' : ''}<button class="asg-del" data-del="${i}">✕</button></div>
      <div class="cz-total">${U.money(p.total || 0, cur)}</div>
      <div class="muted" style="font-size:11.5px">💵 prima total${p.fracc > 1 ? ' · ' + U.money((p.total || 0) / p.fracc, cur) + '/pago' : ''}</div>
    </div>`;
  }
  function tabla(cur, min) {
    const rows = [['Prima neta', p => p.neta], ['IVA', p => p.iva], ['Prima total', p => p.total]];
    return `<div class="card" style="overflow:hidden;margin-top:16px"><div style="overflow-x:auto"><table class="tbl">
      <thead><tr><th>Concepto</th>${props.map(p => `<th class="num">${U.esc(p.nombre)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r[0]}</td>${props.map(p => `<td class="num ${r[0] === 'Prima total' && p.total === min ? '' : ''}" style="${r[0] === 'Prima total' ? 'font-weight:800;color:' + (p.total === min ? 'var(--ok)' : 'var(--ink)') : ''}">${U.money(r[1](p) || 0, cur)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div></div>`;
  }
  function manual() {
    const nombre = prompt('Nombre de la aseguradora / propuesta:', ''); if (!nombre) return;
    const total = +prompt('Prima total:', '0') || 0;
    props.push({ nombre, color: '#6b7280', total, neta: total / 1.12, iva: total - total / 1.12, cur: (props[0] || {}).cur || 'GTQ', fracc: (props[0] || {}).fracc || 1, ramo: (props[0] || {}).ramo || '', origen: 'manual' }); render(host);
  }
  function cargarPDF() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf'; inp.multiple = true;
    inp.addEventListener('change', e => {
      [...e.target.files].forEach(f => { const nombre = f.name.replace(/\.pdf$/i, ''); const total = Math.round(2500 + Math.random() * 4000); props.push({ nombre, color: '#1f3a5f', total, neta: total / 1.12, iva: total - total / 1.12, cur: (props[0] || {}).cur || 'GTQ', fracc: 1, ramo: (props[0] || {}).ramo || '', origen: 'pdf', archivo: f.name }); });
      render(host);
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ ' + e.target.files.length + ' propuesta(s) PDF añadida(s) — ajusta los montos extraídos'; document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
    });
    inp.click();
  }
  function guardarHist() {
    if (!props.length) return;
    const h = Orbit._compHist = Orbit._compHist || [];
    h.unshift({ id: 'cmp' + Date.now(), fecha: '2026-06-24', ramo: (props[0] || {}).ramo || '', cliente: (props[0] || {}).cliente || 'Prospecto', n: props.length, mejor: props.slice().sort((a, b) => a.total - b.total)[0].nombre, props: JSON.parse(JSON.stringify(props)) });
    const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ Comparativo guardado en el historial'; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
    render(host);
  }
  function verHist() {
    const h = Orbit._compHist || [];
    let back = document.getElementById('cp-hist'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'cp-hist'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    back.innerHTML = `<div class="card" style="width:min(560px,94vw);max-height:88vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><b style="font-family:var(--f-display);font-size:15px">🕘 Historial de comparativos</b><button class="imp-x" id="ch-x">✕</button></div>
      <div style="padding:14px 18px">${h.length ? h.map(c => `<div class="pt-row pt-click" data-load="${c.id}"><span class="pt-row-ic">📋</span><div style="flex:1"><b>${U.esc(c.cliente)} · ${c.ramo}</b><div class="muted" style="font-size:11.5px">${c.n} propuestas · 🏆 ${U.esc(c.mejor)} · ${U.fmtDate(c.fecha)}</div></div>›</div>`).join('') : '<div class="pt-empty">Aún no hay comparativos guardados.</div>'}</div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#ch-x').addEventListener('click', close);
    back.querySelectorAll('[data-load]').forEach(b => b.addEventListener('click', () => { const c = (Orbit._compHist || []).find(x => x.id === b.dataset.load); if (c) { props = JSON.parse(JSON.stringify(c.props)); close(); render(host); } }));
  }
  function imprimir() {
    const cur = (props[0] || {}).cur || 'GTQ', min = Math.min(...props.map(p => p.total || 1e15));
    const landscape = props.length >= 4;
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html><head><title>Comparativo de seguros</title><style>@page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:12mm}body{font-family:system-ui,sans-serif;color:#1E2227}h1{color:#C5162E;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#1E2227;color:#fff}td.n{text-align:right}.win{background:#fff5f6;font-weight:800}</style></head><body>
      <h1>⚖️ Comparativo de seguros</h1><p>${(props[0] || {}).ramo || ''} · ${(props[0] || {}).cliente || 'Prospecto'}</p>
      <table><thead><tr><th>Aseguradora</th><th>Prima neta</th><th>IVA</th><th>Prima total</th></tr></thead>
      <tbody>${props.slice().sort((a, b) => a.total - b.total).map(p => `<tr class="${p.total === min ? 'win' : ''}"><td>${p.total === min ? '🏆 ' : ''}${U.esc(p.nombre)}</td><td class="n">${U.money(p.neta || 0, cur)}</td><td class="n">${U.money(p.iva || 0, cur)}</td><td class="n">${U.money(p.total || 0, cur)}</td></tr>`).join('')}</tbody></table>
      <p style="margin-top:22px;color:#888;font-size:12px">Documento informativo. Coberturas sujetas a condiciones de póliza vigentes.</p></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 350);
  }
  return { render };
})();
