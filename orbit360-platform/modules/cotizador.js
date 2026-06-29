/* ============================================================
   Orbit 360 · 🧮 Cotizador  (versión comercializable)
   Flujo: 1) cotizar con tus aseguradoras (motor por tasas con
   rangos por valor, prima mínima, recargo por fraccionamiento,
   gastos de emisión e IVA por país) o ingreso MANUAL · 2) cada
   cotización se imprime en su formato · 3) las elegidas pasan al
   Comparativo. Tarifas configurables por aseguradora (las tuyas).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.cotizador = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store, q = Orbit.q;
  let host;
  const TASAS_DEF = { auto: [{ hasta: 50000, tasa: 3.1, min: 2500 }, { hasta: 150000, tasa: 3.0, min: 2600 }, { hasta: 300000, tasa: 2.7, min: 2600 }, { hasta: 600000, tasa: 2.5, min: 2600 }, { hasta: 1e12, tasa: 2.3, min: 2600 }] };
  const RECARGO_FRACC = { 1: 0, 2: 6.5, 4: 9.5, 6: 10.5, 12: 13.5 };
  let st = { pais: 'GT', ramo: 'Auto', valor: 120000, anio: 2022, fracc: 12, cliente: '', clienteId: '', asesorId: '', marca: '', linea: '', filas: [] };
  // Catálogo marca → líneas (genérico, editable por cliente en migración)
  const VEH = {
    'Toyota': ['Corolla', 'Hilux', 'RAV4', 'Yaris', 'Land Cruiser', 'Prado', 'Fortuner'],
    'Hyundai': ['Tucson', 'Accent', 'Elantra', 'Santa Fe', 'Creta', 'i10'],
    'Kia': ['Sportage', 'Rio', 'Picanto', 'Sorento', 'Seltos'],
    'Nissan': ['Sentra', 'Frontier', 'Versa', 'Kicks', 'X-Trail'],
    'Mazda': ['Mazda 3', 'CX-5', 'CX-30', 'Mazda 2', 'BT-50'],
    'Chevrolet': ['Spark', 'Onix', 'Tracker', 'Captiva', 'D-Max'],
    'Mitsubishi': ['L200', 'Montero', 'Outlander', 'ASX'],
    'Honda': ['Civic', 'CR-V', 'HR-V', 'Fit'],
    'Volkswagen': ['Jetta', 'Tiguan', 'Gol', 'Amarok', 'T-Cross'],
    'Ford': ['Ranger', 'Escape', 'Explorer', 'F-150'],
    'Suzuki': ['Swift', 'Vitara', 'Jimny', 'Baleno'],
    'Otra': ['—']
  };
  let tabCot = 'cotizar';
  const COT_LOG_KEY = 'orbit360_cot_hist';
  function getCotLog(){ try{ return JSON.parse(localStorage.getItem(COT_LOG_KEY)||'[]'); }catch(e){ return []; } }
  function saveCotLog(l){ try{ localStorage.setItem(COT_LOG_KEY, JSON.stringify(l)); }catch(e){} }


  function camposPorRamo(ramo) {
    if (ramo === 'Auto') {
      const marcas = Object.keys(VEH);
      const lineas = VEH[st.marca] || [];
      const subramo = st.pais === 'CO'
        ? ['Todo riesgo', 'RC / SOAT+', 'Pérdidas totales', 'Pérdidas parciales', 'Por kilómetros', 'Pesado']
        : ['Liviano', 'Responsabilidad Civil', 'Pesado', 'Pick-up / Comercial', 'Motocicleta', 'Grúa'];
      return `<label class="ce-l">📅 Año<input id="cz-anio" class="o-sel" type="number" value="${st.anio}" min="1990" max="2026"></label>`
        + `<label class="ce-l">🚙 Tipo / Subramo<select id="cz-sub" class="o-sel">${subramo.map(x => `<option ${x === st.sub ? 'selected' : ''}>${x}</option>`).join('')}</select></label>`
        + `<label class="ce-l">🚗 Marca<select id="cz-marca" class="o-sel"><option value="">— Marca —</option>${marcas.map(m => `<option ${m === st.marca ? 'selected' : ''}>${m}</option>`).join('')}</select></label>`
        + `<label class="ce-l">🔻 Línea<select id="cz-linea" class="o-sel" ${lineas.length ? '' : 'disabled'}><option value="">${lineas.length ? '— Línea —' : 'Elige marca primero'}</option>${lineas.map(l => `<option ${l === st.linea ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`
        + `<label class="ce-l">🔢 Placa<input id="cz-placa" class="o-sel" value="${U.esc(st.placa || '')}" placeholder="P-123ABC"></label>`;
    }
    if (ramo === 'Vida') return `<label class="ce-l">🎂 Edad del asegurado<input id="cz-edad" class="o-sel" type="number" value="${st.edad||35}" min="18" max="80"></label><label class="ce-l">💰 Suma asegurada<input id="cz-suma" class="o-sel" type="number" value="${st.suma||100000}"></label>`;
    if (ramo === 'Gastos Médicos') return `<label class="ce-l">👨‍👩‍👧 Tipo<select id="cz-gm-tipo" class="o-sel"><option ${st.gmTipo==='Individual'?'selected':''}>Individual</option><option ${st.gmTipo==='Familiar'?'selected':''}>Familiar</option></select></label><label class="ce-l">🎂 Edad<input id="cz-edad" class="o-sel" type="number" value="${st.edad||35}"></label><label class="ce-l">🏥 Suma máxima<input id="cz-suma" class="o-sel" type="number" value="${st.suma||500000}"></label>`;
    if (ramo === 'Hogar') return `<label class="ce-l">🏠 Tipo de inmueble<select class="o-sel"><option>Residencia</option><option>Apartamento</option><option>Local comercial</option></select></label><label class="ce-l">📐 M² construidos<input id="cz-m2" class="o-sel" type="number" value="${st.m2||120}"></label>`;
    if (ramo === 'Daños') return `<label class="ce-l">🏭 Giro / Actividad<input id="cz-giro" class="o-sel" value="${U.esc(st.giro||'')}" placeholder="Comercio, industria..."></label><label class="ce-l">📦 Bienes a asegurar<input id="cz-bienes" class="o-sel" value="${U.esc(st.bienes||'')}" placeholder="Inventario, maquinaria..."></label>`;
    return '';
  }
  function vCotHistorial() {
    const log = getCotLog();
    if (!log.length) return '<div class="card pad" style="text-align:center;color:var(--ink-3);margin-bottom:16px">Sin cotizaciones guardadas aún.</div>';
    return '<div class="card" style="overflow:hidden;margin-bottom:16px"><table class="tbl"><thead><tr><th>Fecha</th><th>Cliente</th><th>Ramo</th><th>País</th><th>Aseg.</th><th>Estado</th><th></th></tr></thead><tbody>'
      + log.map(l => '<tr><td class="mono" style="font-size:11.5px">' + (l.fecha||'—') + '</td><td>' + U.esc(l.cliente||'—') + '</td><td><span class="badge info" style="font-size:10px">' + U.esc(l.ramo||'—') + '</span></td><td>' + U.esc(l.pais||'—') + '</td><td>' + (l.aseg||0) + '</td><td><span class="badge ' + (l.estado==='Emitida'?'ok':'warn') + '" style="font-size:10px">' + U.esc(l.estado||'Guardada') + '</span></td><td><button class="btn ghost sm" data-chl="' + U.esc(l.id) + '">Cargar →</button></td></tr>'
      ).join('') + '</tbody></table></div>';
  }
  function cargarHistorial(id) { const log = getCotLog(); const e = log.find(x => x.id === id); if (e && e.state) { Object.assign(st, e.state); tabCot = 'cotizar'; render(host); } }

  function asegElegibles() { return S().all('aseguradoras').filter(a => a.vinculada !== false && (!st.pais || a.pais === st.pais)); }
  function ivaPais(p) { return (Orbit.primas && Orbit.primas.cfgPais) ? Orbit.primas.cfgPais(p).iva : (p === 'CO' ? 19 : 12); }
  function cotsGuardadas() { return Orbit._cots = Orbit._cots || []; }

  function render(h) {
    host = h;
    const asg = asegElegibles();
    if (!st.filas.length) st.filas = asg.slice(0, 3).map(a => ({ id: a.id, modo: 'tasas', prima: 0, sel: true, res: null }));
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '🧮', title: 'Cotizador', sub: 'Cotiza con tus aseguradoras y arma el comparativo', features: [] })}
      <div class="tabs" style="max-width:380px;margin-bottom:16px"><div class="tab ${tabCot==='cotizar'?'active ':''}tab" data-czt="cotizar">🧮 Cotizador</div><div class="tab ${tabCot==='historial'?'active ':''}tab" data-czt="historial">📋 Historial</div></div>${tabCot === 'historial' ? vCotHistorial() : ''}<div class="cz-grid" style="${tabCot==='historial'?'display:none':''}">
        <div class="card pad">
          <div class="asg-sec-t">📋 1 · Datos del riesgo</div>
          <div class="cgrid">
            <label class="ce-l">🌎 País<select id="cz-pais" class="o-sel"><option ${st.pais === 'GT' ? 'selected' : ''}>GT</option><option ${st.pais === 'CO' ? 'selected' : ''}>CO</option></select></label>
            <label class="ce-l">🛡️ Ramo<select id="cz-ramo" class="o-sel">${['Auto', 'Vida', 'Gastos Médicos', 'Hogar', 'Daños'].map(r => `<option ${r === st.ramo ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
            <label class="ce-l">💰 Valor asegurado<input id="cz-valor" class="o-sel" type="number" value="${st.valor}"></label>
            ${camposPorRamo(st.ramo)}
            <label class="ce-l">💳 Pagos<select id="cz-fracc" class="o-sel">${[1, 2, 4, 6, 12].map(f => `<option value="${f}" ${f === st.fracc ? 'selected' : ''}>${f === 1 ? 'Contado' : f + ' pagos'}</option>`).join('')}</select></label>
            <label class="ce-l">🧑 Cliente<select id="cz-cliid" class="o-sel"><option value="">— Prospecto nuevo —</option>${S().all('clientes').map(c => `<option value="${c.id}" ${c.id === st.clienteId ? 'selected' : ''}>${U.esc(c.nombre)}</option>`).join('')}</select></label>
            <label class="ce-l" id="cz-clinom-wrap" style="${st.clienteId ? 'display:none' : ''}">✍️ Nombre del prospecto<input id="cz-cliente" class="o-sel" value="${U.esc(st.cliente)}" placeholder="Nombre del prospecto"></label>
            <label class="ce-l">🧑‍💼 Asesor<select id="cz-ase" class="o-sel"><option value="">— Asignar —</option>${S().all('asesores').filter(a => !a.inactivo).map(a => `<option value="${a.id}" ${a.id === st.asesorId ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select></label>
          </div>
          <div class="asg-sec-t" style="margin-top:16px">🏢 2 · Aseguradoras</div>
          <div class="muted" style="font-size:11.5px;margin-bottom:9px">Modo <b>📊 tasas</b> calcula con tu tabla; <b>✍️ manual</b> ingresas la prima recibida. Marca ✅ las que quieras llevar al comparativo.</div>
          <div id="cz-asgs"></div>
          <button class="btn ghost sm" id="cz-add" style="margin-top:9px">➕ Aseguradora</button>
          <button class="btn primary" id="cz-gen" style="margin-top:14px;width:100%">⚡ Cotizar</button>
        </div>
        <div class="card pad" id="cz-out"><div class="muted" style="text-align:center;padding:40px 0">🧮 Las cotizaciones aparecerán aquí.</div></div>
      </div>
    </div>`;
    bind(); paintAsgs();
  }
  function bind() {
    const set = (id, k, num) => { const el = host.querySelector(id); if (el) el.addEventListener('change', () => { st[k] = num ? +el.value : el.value; if (k === 'pais') { st.filas = []; render(host); } else if (k === 'ramo') { render(host); } }); };
    set('#cz-pais', 'pais'); set('#cz-ramo', 'ramo'); set('#cz-valor', 'valor', true); set('#cz-anio', 'anio', true); set('#cz-fracc', 'fracc', true); set('#cz-cliente', 'cliente');
    set('#cz-sub', 'sub'); set('#cz-ase', 'asesorId');
    // marca → recarga líneas
    const mk = host.querySelector('#cz-marca'); if (mk) mk.addEventListener('change', () => { st.marca = mk.value; st.linea = ''; render(host); });
    const ln = host.querySelector('#cz-linea'); if (ln) ln.addEventListener('change', () => { st.linea = ln.value; });
    // cliente existente → oculta nombre manual y precarga
    const cli = host.querySelector('#cz-cliid'); if (cli) cli.addEventListener('change', () => { st.clienteId = cli.value; const c = cli.value ? S().get('clientes', cli.value) : null; if (c) { st.cliente = c.nombre; if (c.asesorId) st.asesorId = c.asesorId; if (c.pais) st.pais = c.pais; } render(host); });
    host.querySelectorAll('[data-czt]').forEach(b => b.addEventListener('click', () => { tabCot = b.dataset.czt; render(host); }));
    host.querySelectorAll('[data-chl]').forEach(b => b.addEventListener('click', () => cargarHistorial(b.dataset.chl)));
    host.querySelector('#cz-add').addEventListener('click', () => { const a = asegElegibles().find(x => !st.filas.some(f => f.id === x.id)); if (a) { st.filas.push({ id: a.id, modo: 'tasas', prima: 0, sel: true }); paintAsgs(); } else { const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = 'Ya agregaste todas las aseguradoras de ' + st.pais; document.body.appendChild(t); setTimeout(() => t.remove(), 2400); } });
    host.querySelector('#cz-gen').addEventListener('click', cotizar);
  }
  function paintAsgs() {
    const asg = asegElegibles();
    host.querySelector('#cz-asgs').innerHTML = st.filas.map((row, i) => `<div class="asg-row" data-r="${i}">
      <input type="checkbox" data-asel ${row.sel ? 'checked' : ''} title="Incluir en comparativo">
      <select class="o-sel" data-aid style="flex:1.3">${asg.map(a => `<option value="${a.id}" ${a.id === row.id ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select>
      <select class="o-sel" data-amodo style="flex:.9">${[['tasas', '📊 Tasas'], ['manual', '✍️ Manual']].map(m => `<option value="${m[0]}" ${m[0] === row.modo ? 'selected' : ''}>${m[1]}</option>`).join('')}</select>
      <input class="o-sel" data-aprima type="number" placeholder="Prima" value="${row.prima || ''}" style="width:96px;display:${row.modo === 'manual' ? '' : 'none'}">
      <button class="asg-del" data-adel="${i}">✕</button></div>`).join('');
    host.querySelectorAll('[data-r]').forEach((r, i) => {
      r.querySelector('[data-asel]').addEventListener('change', e => st.filas[i].sel = e.target.checked);
      r.querySelector('[data-aid]').addEventListener('change', e => st.filas[i].id = e.target.value);
      r.querySelector('[data-amodo]').addEventListener('change', e => { st.filas[i].modo = e.target.value; paintAsgs(); });
      const pr = r.querySelector('[data-aprima]'); if (pr) pr.addEventListener('change', e => st.filas[i].prima = +e.target.value);
    });
    host.querySelectorAll('[data-adel]').forEach(b => b.addEventListener('click', () => { st.filas.splice(+b.dataset.adel, 1); paintAsgs(); }));
  }
  function calcTasas(asgId) {
    const a = S().get('aseguradoras', asgId);
    const tabla = (a && a.cotTasas && a.cotTasas.auto) ? a.cotTasas.auto : TASAS_DEF.auto;
    const rango = tabla.find(r => st.valor <= r.hasta) || tabla[tabla.length - 1];
    let neta = Math.max(rango.min, st.valor * rango.tasa / 100);
    if (st.ramo === 'Auto' && st.anio < 2015) neta *= 1.08;
    const recargo = (RECARGO_FRACC[st.fracc] || 0) / 100 * neta;
    const gastosEm = st.pais === 'GT' ? neta * 0.05 : 0;
    const base = neta + recargo + gastosEm, iva = base * ivaPais(st.pais) / 100;
    return { neta, recargo, gastosEm, iva, total: base + iva, tasaPct: rango.tasa };
  }
  function cotizar() {
    const cur = st.pais === 'CO' ? 'COP' : 'GTQ';
    st.filas.forEach(row => {
      const a = S().get('aseguradoras', row.id);
      row.res = row.modo === 'manual'
        ? (() => { const neta = +row.prima || 0, iva = neta * ivaPais(st.pais) / 100; return { neta, recargo: 0, gastosEm: 0, iva, total: neta + iva, tasaPct: null }; })()
        : calcTasas(row.id);
      row.nombre = a ? a.nombre : ''; row.color = a ? a.color : '#999';
    });
    const con = st.filas.filter(f => f.res);
    host.querySelector('#cz-out').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <b style="font-family:var(--f-display);font-size:16px">🧾 Cotizaciones · ${st.ramo}</b>
        <button class="btn primary sm" id="cz-comp">📋 Generar comparativo →</button>
      </div>
      <div class="cz-cards">${con.map((f, i) => `
        <div class="cz-card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="dot-s" style="background:${f.color};width:11px;height:11px"></span><b style="font-family:var(--f-display);flex:1">${U.esc(f.nombre)}</b><label style="font-size:11px;display:flex;gap:4px;align-items:center"><input type="checkbox" data-csel="${i}" ${f.sel ? 'checked' : ''}>✅</label></div>
          <div class="cz-total">${U.money(f.res.total, cur)}</div>
          <div class="muted" style="font-size:11.5px">💵 prima total${st.fracc > 1 ? ' · ' + U.money(f.res.total / st.fracc, cur) + '/pago' : ''}</div>
          <table class="vp-dtbl" style="margin-top:10px">
            <tr><td>Prima neta</td><td class="num">${U.money(f.res.neta, cur)}</td></tr>
            ${f.res.recargo ? `<tr><td>Recargo fracc.</td><td class="num">${U.money(f.res.recargo, cur)}</td></tr>` : ''}
            ${f.res.gastosEm ? `<tr><td>Gastos emisión</td><td class="num">${U.money(f.res.gastosEm, cur)}</td></tr>` : ''}
            <tr><td>IVA (${ivaPais(st.pais)}%)</td><td class="num">${U.money(f.res.iva, cur)}</td></tr>
          </table>
          <button class="btn ghost sm" style="margin-top:9px;width:100%" data-cprint="${i}">🖨 Imprimir cotización</button>
        </div>`).join('')}</div>
      <div class="cfg-note" style="margin-top:13px">📊 Cálculo con rangos por valor, prima mínima, recargo por fraccionamiento, gastos e IVA por país. Las <b>tasas son configurables por aseguradora</b> — ajusta a las tuyas.</div>`;
    host.querySelectorAll('[data-csel]').forEach(c => c.addEventListener('change', e => con[+c.dataset.csel].sel = e.target.checked));
    host.querySelectorAll('[data-cprint]').forEach(b => b.addEventListener('click', () => imprimirCot(con[+b.dataset.cprint], cur)));
    host.querySelector('#cz-comp').addEventListener('click', () => { Orbit._cots = con.filter(f => f.sel).map(f => ({ nombre: f.nombre, color: f.color, total: f.res.total, neta: f.res.neta, iva: f.res.iva, cur, ramo: st.ramo, cliente: st.cliente, fracc: st.fracc })); location.hash = '#/comparativo'; });
  }
  function imprimirCot(f, cur) {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html><head><title>Cotización ${f.nombre}</title><style>@page{size:A4 portrait;margin:14mm}body{font-family:system-ui,sans-serif;color:#1E2227}h1{color:#C5162E;font-size:20px}.r{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee}.tot{font-size:24px;font-weight:800;margin-top:10px;color:#C5162E}</style></head><body>
      <h1>🧾 Cotización · ${f.nombre}</h1><p>${st.ramo} · ${st.cliente || 'Prospecto'} · valor ${U.money(st.valor, cur)} · ${st.fracc === 1 ? 'contado' : st.fracc + ' pagos'}</p><hr>
      <div class="r"><span>Prima neta</span><b>${U.money(f.res.neta, cur)}</b></div>
      ${f.res.recargo ? `<div class="r"><span>Recargo fraccionamiento</span><b>${U.money(f.res.recargo, cur)}</b></div>` : ''}
      ${f.res.gastosEm ? `<div class="r"><span>Gastos de emisión</span><b>${U.money(f.res.gastosEm, cur)}</b></div>` : ''}
      <div class="r"><span>IVA</span><b>${U.money(f.res.iva, cur)}</b></div>
      <div class="tot">Prima total: ${U.money(f.res.total, cur)}</div>
      <p style="margin-top:24px;color:#888;font-size:12px">Documento informativo. Coberturas sujetas a condiciones de la póliza vigente.</p></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 350);
  }
  return { render };
})();
