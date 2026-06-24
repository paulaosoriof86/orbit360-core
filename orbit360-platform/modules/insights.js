/* ============================================================
   Orbit 360 · Orbit Insights — analítica integral y profunda
   Vistas: Resumen · Metas (nuevas vs renovadas) · Producción ·
   Cartera · Comparativo (interanual/intermensual) · Top clientes ·
   Pipeline · Renovaciones · Análisis crítico.
   KPIs CLICABLES (abren detalle). Datos reales del CRM, en vivo.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.insights = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let vista = 'resumen', host, unsub;
  const norm = (m, cur) => q.norm(m, cur);
  const M = (n) => U.moneyShort(n, 'GTQ');
  const MM = (n) => U.money(n, 'GTQ');
  const YEAR = 2026, PREV = 2025;
  const MES0 = U.NOW ? new Date(U.NOW).getMonth() : 5; // mes actual
  let mesSel = MES0;           // mes seleccionado (acumulado Ene→mesSel)
  let criterio = 'general';    // comparativo: general | asesor | ramo | aseguradora
  let topOrden = 'volumen';    // top clientes: volumen | cantidad | nuevos | antiguos
  let renovCrit = 'aseguradora'; // renovaciones: aseguradora | asesor | ramo
  const MES = MES0;            // compat: algunos cálculos usan el mes actual base

  /* ---- país + accesos ---- */
  function paisOK(p) { return !Orbit.pais || Orbit.pais === 'TODOS' || p === Orbit.pais; }
  function clientePais(cliId) { const c = S().get('clientes', cliId); return c ? c.pais : 'GT'; }
  function polizas() { return S().all('polizas').filter(p => paisOK(clientePais(p.clienteId))); }
  function vigentes() { return polizas().filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar'); }
  function cobros() { return S().all('cobros').filter(c => paisOK(clientePais(c.clienteId))); }
  function comisiones() { return S().all('comisiones').filter(c => paisOK(clientePais(c.clienteId))); }
  function negocios() { return (Orbit.ciclo ? Orbit.ciclo.negocios({ ignoreRol: true }) : []); }
  function cancelaciones() { return S().all('cancelaciones').filter(c => paisOK(clientePais(c.clienteId))); }
  function clientes() { return S().all('clientes').filter(c => paisOK(c.pais)); }
  const esNueva = p => !(p.contadorRenovaciones > 0);
  const netaDe = p => norm(p.primaNeta != null ? p.primaNeta : p.prima, p.moneda);

  /* ---- micro-gráficos ---- */
  function barsH(rows, opts) {
    opts = opts || {};
    const max = Math.max(1, ...rows.map(r => r.val));
    return `<div class="ins-bars">${rows.map(r => `
      <div class="ins-bar-row ${r.onclick ? 'clickable' : ''}" ${r.onclick ? `onclick="${r.onclick}"` : ''}>
        <div class="ins-bar-lbl">${r.label}</div>
        <div class="ins-bar-track"><i style="width:${Math.max(2, r.val / max * 100)}%;background:${r.color || 'var(--red)'}"></i></div>
        <div class="ins-bar-val">${opts.money ? M(r.val) : (opts.fmt ? opts.fmt(r.val) : r.val)}</div>
      </div>`).join('')}</div>`;
  }
  function donut(parts, centerTop, centerSub) {
    const tot = parts.reduce((s, p) => s + p.val, 0) || 1;
    let acc = 0;
    const segs = parts.map(p => { const a = acc / tot * 360, b = (acc + p.val) / tot * 360; acc += p.val; return `${p.color} ${a}deg ${b}deg`; }).join(',');
    return `<div class="ins-donut-wrap">
      <div class="ins-donut" style="background:conic-gradient(${segs})"><div class="ins-donut-hole"><b>${centerTop}</b><span>${centerSub || ''}</span></div></div>
      <div class="ins-legend">${parts.map(p => `<div><span class="dot-s" style="background:${p.color}"></span>${p.label} <b>${p.pct != null ? p.pct + '%' : M(p.val)}</b></div>`).join('')}</div>
    </div>`;
  }
  // barras verticales agrupadas (2 series por mes) — comparativo interanual
  function colsDual(labels, a, b, la, lb) {
    const max = Math.max(1, ...a, ...b);
    return `<div class="ins-vcols">${labels.map((lab, i) => `
      <div class="ins-vcol">
        <div class="ins-vbars">
          <i class="va" style="height:${a[i] / max * 100}%" title="${la}: ${M(a[i])}"></i>
          <i class="vb" style="height:${b[i] / max * 100}%" title="${lb}: ${M(b[i])}"></i>
        </div>
        <span class="ins-vlbl">${lab}</span>
      </div>`).join('')}</div>
    <div class="ins-vlegend"><span><i class="va"></i> ${la}</span><span><i class="vb"></i> ${lb}</span></div>`;
  }
  function card(title, body, sub) {
    return `<div class="card pad ins-card"><div class="ins-h"><b>${title}</b>${sub ? `<span class="muted">${sub}</span>` : ''}</div>${body}</div>`;
  }
  function aggBy(items, keyFn, valFn) {
    const m = {}; items.forEach(it => { const k = keyFn(it); if (k == null) return; m[k] = (m[k] || 0) + valFn(it); }); return m;
  }
  const RAMO_COLORS = { Auto: '#C5162E', Automóviles: '#C5162E', Vida: '#1f8a4c', 'Gastos Médicos': '#2563a8', Salud: '#2563a8', Hogar: '#c9821b', Daños: '#6b4ea0', RC: '#0f766e', 'Responsabilidad Civil': '#0f766e', Fianzas: '#7c3aed', Cumplimiento: '#7c3aed', Transporte: '#0e7490', Accidentes: '#be185d' };
  const palette = ['#C5162E', '#1f3a5f', '#c9821b', '#0f766e', '#6b4ea0', '#2563a8', '#15803d', '#b45309', '#be185d', '#0e7490'];

  /* ===================== KPIs CLICABLES ===================== */
  // items: { label, val, color, foot, footTone, detail: {title, sub, html} }
  let kpiStore = [];
  function insKpis(items) {
    kpiStore = items;
    return `<div class="kpi-row ins-kpi-row">${items.map((k, i) => `
      <div class="kpi ${k.detail ? 'kpi-click' : ''}" ${k.detail ? `data-kpi="${i}"` : ''}>
        <div class="k-accent" style="background:${k.color || 'var(--red)'}"></div>
        <div class="k-label">${k.label}${k.detail ? ' <span class="kpi-mag">⤢</span>' : ''}</div>
        <div class="k-val">${k.val}</div>
        <div class="k-foot ${k.footTone || 'muted'}">${k.foot || ''}</div>
      </div>`).join('')}</div>`;
  }
  function wireKpis() {
    host.querySelectorAll('[data-kpi]').forEach(el => el.addEventListener('click', () => {
      const k = kpiStore[+el.dataset.kpi]; if (k && k.detail) insDrawer(k.detail.title, k.detail.sub, typeof k.detail.html === 'function' ? k.detail.html() : k.detail.html);
    }));
  }
  function insDrawer(title, sub, html) {
    let back = document.getElementById('ins-drawer'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ins-drawer'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(720px,96vw);max-height:90vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;position:sticky;top:0;background:var(--card);z-index:2">
        <div><b style="font-family:var(--f-display);font-size:17px">${title}</b>${sub ? `<div class="muted" style="font-size:12.5px;margin-top:2px">${sub}</div>` : ''}</div>
        <button class="imp-x" id="ins-x">✕</button>
      </div>
      <div style="padding:14px 20px">${html}</div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#ins-x').addEventListener('click', close);
  }
  // tabla genérica de detalle (lista de pólizas/cobros/clientes)
  function tablaPolizas(pols) {
    return `<table class="tbl"><thead><tr><th>Cliente</th><th>Póliza</th><th>Ramo</th><th class="num">Prima neta</th><th>Tipo</th><th></th></tr></thead>
      <tbody>${pols.map(p => `<tr class="clickable" onclick="document.getElementById('ins-drawer').remove();Orbit.modules.cliente360.verPoliza('${p.id}')">
        <td>${K.clienteCell(p.clienteId)}</td><td class="mono" style="font-size:12px">${p.numero}</td><td>${p.ramo}</td>
        <td class="num">${U.money(p.primaNeta != null ? p.primaNeta : p.prima, p.moneda)}</td>
        <td>${esNueva(p) ? '<span class="badge ok">Nueva</span>' : '<span class="badge info">Renovada</span>'}</td>
        <td style="text-align:right;color:var(--ink-3)">›</td></tr>`).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:20px">Sin registros.</td></tr>'}</tbody></table>`;
  }
  function tablaCobros(cobs) {
    return `<table class="tbl"><thead><tr><th>Cliente</th><th>Cuota</th><th class="num">Monto</th><th>Vence</th><th>Estado</th></tr></thead>
      <tbody>${cobs.map(c => `<tr class="clickable" onclick="document.getElementById('ins-drawer').remove();Orbit.modules.cobros.detalle('${c.id}')">
        <td>${K.clienteCell(c.clienteId)}</td><td>${c.cuota}</td><td class="num">${U.money(c.monto, c.moneda)}</td>
        <td style="font-size:12.5px">${U.fmtDate(c.vence)}</td><td>${U.estadoBadge(c.estado)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">Sin registros.</td></tr>'}</tbody></table>`;
  }

  /* ===================== series temporales (reales) ===================== */
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  // producción mensual por año (prima neta) desde vigenciaInicio
  function serieAnual(year, filtroNueva) {
    const arr = new Array(12).fill(0); const cnt = new Array(12).fill(0);
    polizas().forEach(p => {
      if (!p.vigenciaInicio) return;
      const dt = new Date(p.vigenciaInicio);
      if (dt.getFullYear() !== year) return;
      if (filtroNueva === 'nueva' && !esNueva(p)) return;
      if (filtroNueva === 'renov' && esNueva(p)) return;
      arr[dt.getMonth()] += netaDe(p); cnt[dt.getMonth()]++;
    });
    return { arr, cnt };
  }
  function acumHasta(serie, mes) { return serie.slice(0, mes + 1).reduce((s, v) => s + v, 0); }

  /* ===================== VISTAS ===================== */
  function vResumen() {
    const vig = vigentes();
    const primaVig = vig.reduce((s, p) => s + norm(p.prima, p.moneda), 0);
    const netaVig = vig.reduce((s, p) => s + netaDe(p), 0);
    const cob = cobros();
    const pagados = cob.filter(c => c.estado === 'Pagado');
    const recaudado = pagados.reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const pend = cob.filter(c => c.estado === 'Pendiente'); const pendV = pend.reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const venc = cob.filter(c => c.estado === 'Vencido'); const vencV = venc.reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const com = comisiones().reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const nuevas = vig.filter(esNueva), renov = vig.filter(p => !esNueva(p));
    const tasaRecaudo = recaudado + pendV + vencV > 0 ? Math.round(recaudado / (recaudado + pendV + vencV) * 100) : 0;
    const ramoAgg = aggBy(vig, p => p.ramo, p => netaDe(p));
    const ramoParts = Object.entries(ramoAgg).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: RAMO_COLORS[e[0]] || palette[i % palette.length] }));
    const estParts = [{ label: 'Recaudado', val: recaudado, color: '#1f8a4c' }, { label: 'Pendiente', val: pendV, color: '#c9821b' }, { label: 'Vencido', val: vencV, color: '#C5162E' }];
    return insKpis([
      { label: 'Prima neta vigente', val: M(netaVig), color: 'var(--red)', foot: vig.length + ' pólizas activas', detail: { title: 'Pólizas vigentes', sub: vig.length + ' pólizas · prima neta ' + MM(netaVig), html: () => tablaPolizas(vig.slice().sort((a, b) => netaDe(b) - netaDe(a))) } },
      { label: 'Recaudado', val: M(recaudado), color: 'var(--ok)', foot: tasaRecaudo + '% de la cartera', footTone: 'up', detail: { title: 'Recibos pagados', sub: pagados.length + ' recibos', html: () => tablaCobros(pagados.slice(0, 60)) } },
      { label: 'Por cobrar', val: M(pendV + vencV), color: 'var(--warn)', foot: M(vencV) + ' vencido', detail: { title: 'Cartera por cobrar', sub: (pend.length + venc.length) + ' recibos', html: () => tablaCobros(venc.concat(pend).slice(0, 80)) } },
      { label: 'Nuevas vs renovadas', val: nuevas.length + ' / ' + renov.length, color: 'var(--info)', foot: 'pólizas vigentes', detail: { title: 'Producción por tipo', sub: 'Nuevas ' + nuevas.length + ' · Renovadas ' + renov.length, html: () => tablaPolizas(vig.slice().sort((a, b) => esNueva(b) - esNueva(a))) } }
    ]) + `
    <div class="ins-grid-2">
      ${card('Prima neta vigente por ramo', donut(ramoParts.map(p => ({ ...p, pct: Math.round(p.val / (netaVig || 1) * 100) })), ramoParts.length, 'ramos'), 'distribución de cartera')}
      ${card('Estado de la cartera', donut(estParts.map(p => ({ ...p, pct: Math.round(p.val / ((recaudado + pendV + vencV) || 1) * 100) })), tasaRecaudo + '%', 'recaudo'), 'pagado / pendiente / vencido')}
    </div>
    <div class="ins-grid-2">
      ${card('Top aseguradoras por prima neta', barsH(topAgg(vig, p => p.aseguradoraId, p => netaDe(p), id => { const a = q.aseguradora(id); return a ? a.nombre : id; }, 7), { money: true }))}
      ${card('Comisión generada', `<div style="text-align:center;padding:8px 0"><div style="font-family:var(--f-display);font-weight:800;font-size:30px">${MM(com)}</div><div class="muted" style="font-size:12.5px">devengada en la cartera · ${clientes().length} clientes</div></div>` + barsH(topAgg(comisiones(), c => c.aseguradoraId, c => norm(c.monto, c.moneda), id => { const a = q.aseguradora(id); return a ? a.nombre : id; }, 5), { money: true }))}
    </div>`;
  }

  function topAgg(items, keyFn, valFn, labelFn, n) {
    const m = aggBy(items, keyFn, valFn);
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n || 8).map((e, i) => ({ label: labelFn(e[0]), val: e[1], color: palette[i % palette.length] }));
  }

  /* ---- METAS: producción nueva vs renovada con metas separadas ---- */
  function vMetas() {
    const vig = vigentes();
    const nuevas = vig.filter(esNueva), renov = vig.filter(p => !esNueva(p));
    const netaNueva = nuevas.reduce((s, p) => s + netaDe(p), 0);
    const netaRenov = renov.reduce((s, p) => s + netaDe(p), 0);
    // metas (configurables) — derivadas de metas por asesor, split nueva/renov
    const metaTotal = S().all('asesores').reduce((s, a) => s + (a.metaPrima || 0), 0);
    const metaNueva = Math.round(metaTotal * 0.45), metaRenov = Math.round(metaTotal * 0.55);
    const pctN = Math.round(netaNueva / (metaNueva || 1) * 100), pctR = Math.round(netaRenov / (metaRenov || 1) * 100);
    // series mensuales nueva/renov para acumulado y mes seleccionado
    const sN = serieAnual(YEAR, 'nueva').arr, sR = serieAnual(YEAR, 'renov').arr;
    const mesN = sN[mesSel] || 0, mesR = sR[mesSel] || 0, acN = acumHasta(sN, mesSel), acR = acumHasta(sR, mesSel);
    const metaBar = (label, val, meta, pct, color) => `
      <div class="ins-meta-block">
        <div class="ins-meta-top"><b>${label}</b><span class="mono">${MM(val)} <span class="muted">/ ${MM(meta)}</span></span></div>
        <div class="ins-meta-bar big"><i style="width:${Math.min(100, pct)}%;background:${pct >= 100 ? 'var(--ok)' : pct >= 70 ? 'var(--warn)' : color}"></i><span>${pct}%</span></div>
      </div>`;
    // nuevas vs renovadas por ramo (comparación real)
    const ramos = [...new Set(vig.map(p => p.ramo))];
    const nByR = aggBy(nuevas, p => p.ramo, p => netaDe(p)), rByR = aggBy(renov, p => p.ramo, p => netaDe(p));
    const ramoOrd = ramos.map(r => ({ r, t: (nByR[r] || 0) + (rByR[r] || 0) })).sort((a, b) => b.t - a.t).slice(0, 8).map(x => x.r);
    return insKpis([
      { label: 'PN NUEVA · ' + MESES[mesSel], val: M(mesN), color: 'var(--ok)', foot: 'acum. ' + M(acN), footTone: 'up', detail: { title: 'Pólizas nuevas (vigentes)', sub: nuevas.length + ' pólizas · ' + MM(netaNueva), html: () => tablaPolizas(nuevas.slice().sort((a, b) => netaDe(b) - netaDe(a))) } },
      { label: 'PN RENOVADA · ' + MESES[mesSel], val: M(mesR), color: 'var(--info)', foot: 'acum. ' + M(acR), detail: { title: 'Pólizas renovadas (vigentes)', sub: renov.length + ' pólizas · ' + MM(netaRenov), html: () => tablaPolizas(renov.slice().sort((a, b) => netaDe(b) - netaDe(a))) } },
      { label: 'Cumplimiento nuevas', val: pctN + '%', color: 'var(--red)', foot: 'acum. vs meta', footTone: pctN >= 100 ? 'up' : 'down' },
      { label: 'Cumplimiento renov.', val: pctR + '%', color: 'var(--warn)', foot: 'acum. vs meta', footTone: pctR >= 100 ? 'up' : 'down' }
    ]) + card('Avance de metas (acumulado del año · prima neta)', metaBar('Producción NUEVA', netaNueva, metaNueva, pctN, 'var(--red)') + metaBar('Producción RENOVADA', netaRenov, metaRenov, pctR, 'var(--red)'), 'metas separadas — se asignan en Equipo y permisos / Configuración') +
      card('Producción mensual ' + YEAR + ' · nuevas vs renovadas', colsDual(MESES, sN, sR, 'Nuevas', 'Renovadas'), 'prima neta por mes · clic en Mes para acumular') +
      `<div class="ins-grid-2">
      ${card('Meta por asesor (prima neta)', `<table class="tbl"><thead><tr><th>Asesor</th><th>Avance</th><th class="num">Neta</th><th class="num">Meta</th></tr></thead><tbody>${asesorMetaRows()}</tbody></table>`)}
      ${card('Nuevas vs renovadas por ramo', colsDual(ramoOrd, ramoOrd.map(r => nByR[r] || 0), ramoOrd.map(r => rByR[r] || 0), 'Nuevas', 'Renovadas'), 'prima neta por ramo')}
    </div>`;
  }
  function asesorMetaRows() {
    return S().all('asesores').map(a => {
      const pol = vigentes().filter(p => p.asesorId === a.id);
      const neta = pol.reduce((s, p) => s + netaDe(p), 0);
      const pct = Math.min(140, Math.round(neta / (a.metaPrima || 1) * 100));
      return `<tr><td style="min-width:150px"><span style="display:flex;align-items:center;gap:8px">${U.avatar(a.nombre, a.color, 'sm')}${U.esc(a.nombre)}</span></td>
        <td style="width:40%"><div class="ins-meta-bar"><i style="width:${Math.min(100, pct)}%;background:${pct >= 100 ? 'var(--ok)' : pct >= 70 ? 'var(--warn)' : 'var(--red)'}"></i><span>${pct}%</span></div></td>
        <td class="num"><b>${M(neta)}</b></td><td class="num muted">${M(a.metaPrima)}</td></tr>`;
    }).join('');
  }
  function ramoNuevaRenov() {
    const m = aggBy(vigentes().filter(esNueva), p => p.ramo, p => netaDe(p));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map((e, i) => ({ label: e[0], val: e[1], color: palette[i % palette.length] }));
  }

  function vProduccion() {
    const lb = q.leaderboard();
    const vig = vigentes();
    const ramoRows = Object.entries(aggBy(vig, p => p.ramo, p => netaDe(p))).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: RAMO_COLORS[e[0]] || palette[i % palette.length] }));
    const prodRows = Object.entries(aggBy(vig, p => p.producto, p => netaDe(p))).sort((a, b) => b[1] - a[1]).slice(0, 8).map((e, i) => ({ label: e[0], val: e[1], color: palette[i % palette.length] }));
    // tabla asesor × aseguradora
    const asgs = S().all('aseguradoras').filter(a => vig.some(p => p.aseguradoraId === a.id));
    const matriz = `<table class="tbl ins-matrix"><thead><tr><th>Asesor</th>${asgs.map(a => `<th class="num">${U.esc(a.nombre.split(' ')[0])}</th>`).join('')}<th class="num">Total</th></tr></thead>
      <tbody>${S().all('asesores').map(ase => {
        const pol = vig.filter(p => p.asesorId === ase.id);
        if (!pol.length) return '';
        const tot = pol.reduce((s, p) => s + netaDe(p), 0);
        return `<tr><td><span style="display:flex;align-items:center;gap:7px">${U.avatar(ase.nombre, ase.color, 'sm')}${U.esc(ase.nombre)}</span></td>${asgs.map(a => { const v = pol.filter(p => p.aseguradoraId === a.id).reduce((s, p) => s + netaDe(p), 0); return `<td class="num">${v ? M(v) : '<span class="muted">—</span>'}</td>`; }).join('')}<td class="num"><b>${M(tot)}</b></td></tr>`;
      }).join('')}</tbody></table>`;
    return card('Avance por asesor · prima neta vigente vs meta',
      `<table class="tbl"><thead><tr><th>Asesor</th><th>Avance de meta</th><th class="num">Prima neta</th><th class="num">Comisión</th></tr></thead>
      <tbody>${lb.map(r => { const neta = vig.filter(p => p.asesorId === r.asesor.id).reduce((s, p) => s + netaDe(p), 0); return `<tr>
        <td style="min-width:170px"><span style="display:flex;align-items:center;gap:8px">${U.avatar(r.asesor.nombre, r.asesor.color, 'sm')}${U.esc(r.asesor.nombre)}</span></td>
        <td style="width:40%"><div class="ins-meta-bar"><i style="width:${Math.min(100, r.pct)}%;background:${r.pct >= 100 ? 'var(--ok)' : r.pct >= 70 ? 'var(--warn)' : 'var(--red)'}"></i><span>${r.pct}%</span></div></td>
        <td class="num"><b>${M(neta)}</b></td><td class="num" style="color:var(--info)">${M(r.comision)}</td></tr>`; }).join('')}</tbody></table>`) +
      `<div class="ins-grid-2">${card('Prima neta por ramo', barsH(ramoRows, { money: true }))}${card('Top productos', barsH(prodRows, { money: true }))}</div>` +
      card('Producción por asesor y aseguradora', matriz, 'prima neta vigente');
  }

  function vCartera() {
    const aging = q.agingVencido();
    const agingRows = Object.entries(aging).map(([k, v], i) => ({ label: k + ' días', val: v, color: ['#c9821b', '#e0701a', '#C5162E', '#7f1020'][i] }));
    const cob = cobros();
    const formaRows = Object.entries(aggBy(cob.filter(c => c.estado !== 'Pagado'), c => (S().get('polizas', c.polizaId) || {}).formaPago || '—', c => norm(c.monto, c.moneda))).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: palette[i % palette.length] }));
    const venc = q.cobrosVencidos().filter(c => paisOK(clientePais(c.clienteId)));
    const totVenc = Object.values(aging).reduce((s, v) => s + v, 0);
    const pend = cob.filter(c => c.estado === 'Pendiente');
    const porConc = cob.filter(c => c.estado === 'Pagado' && !c.conciliado);
    return insKpis([
      { label: 'Cartera vencida', val: M(totVenc), color: 'var(--red)', foot: venc.length + ' recibos', detail: { title: 'Recibos vencidos', sub: venc.length + ' recibos · ' + MM(totVenc), html: () => tablaCobros(venc) } },
      { label: 'Tramo crítico 90+', val: M(aging['90+']), color: 'var(--danger)', foot: 'mayor riesgo' },
      { label: 'Pendiente por cobrar', val: M(pend.reduce((s, c) => s + norm(c.monto, c.moneda), 0)), color: 'var(--warn)', foot: pend.length + ' recibos', detail: { title: 'Recibos pendientes', sub: pend.length + ' recibos', html: () => tablaCobros(pend.slice(0, 80)) } },
      { label: 'Por conciliar', val: porConc.length, color: 'var(--info)', foot: 'pagos sin aplicar', detail: { title: 'Pagos por conciliar', sub: porConc.length + ' recibos pagados sin conciliar', html: () => tablaCobros(porConc.slice(0, 80)) } }
    ]) + `<div class="ins-grid-2">
      ${card('Aging de cartera vencida', barsH(agingRows, { money: true }), 'por antigüedad')}
      ${card('Saldo por forma de pago', barsH(formaRows, { money: true }), 'pendiente + vencido')}
    </div>` + card('Recibos vencidos prioritarios', tablaCobros(venc.slice(0, 14)));
  }

  /* ---- COMPARATIVO interanual + intermensual (por concepto) ---- */
  function compBucket(crit, mes) {
    const keyFn = { general: () => 'Total', asesor: p => p.asesorId, ramo: p => p.ramo, aseguradora: p => p.aseguradoraId }[crit] || (() => 'Total');
    const labelFn = { asesor: id => (q.asesor(id) || {}).nombre || id, aseguradora: id => (q.aseguradora(id) || {}).nombre || id }[crit];
    const m = {};
    polizas().forEach(p => { if (!p.vigenciaInicio) return; const dt = new Date(p.vigenciaInicio), y = dt.getFullYear(); if ((y !== YEAR && y !== PREV) || dt.getMonth() > mes) return; const k = keyFn(p); m[k] = m[k] || { a: 0, b: 0 }; if (y === YEAR) m[k].b += netaDe(p); else m[k].a += netaDe(p); });
    return Object.entries(m).map(([k, v], i) => ({ key: k, label: labelFn ? labelFn(k) : k, color: crit === 'ramo' ? (RAMO_COLORS[k] || palette[i % palette.length]) : palette[i % palette.length], v25: v.a, v26: v.b, var: v.a > 0 ? Math.round((v.b - v.a) / v.a * 100) : (v.b > 0 ? 100 : 0) })).sort((x, y) => y.v26 - x.v26);
  }
  function vComparativo() {
    const s26 = serieAnual(YEAR), s25 = serieAnual(PREV);
    const acum26 = acumHasta(s26.arr, mesSel), acum25 = acumHasta(s25.arr, mesSel);
    const varPct = acum25 > 0 ? Math.round((acum26 - acum25) / acum25 * 100) : 0;
    const nPol26 = s26.cnt.slice(0, mesSel + 1).reduce((s, v) => s + v, 0), nPol25 = s25.cnt.slice(0, mesSel + 1).reduce((s, v) => s + v, 0);
    const mesAct = s26.arr[mesSel], mesAnt = mesSel > 0 ? s26.arr[mesSel - 1] : 0;
    const varMes = mesAnt > 0 ? Math.round((mesAct - mesAnt) / mesAnt * 100) : 0;
    const rows = compBucket(criterio, mesSel);
    const trend = (vp) => `<span style="color:${vp >= 0 ? 'var(--ok)' : 'var(--danger)'};font-weight:700">${vp >= 0 ? '▲' : '▼'} ${Math.abs(vp)}%</span>`;
    const seg = `<div class="ins-seg">${[['general', 'General'], ['asesor', 'Por asesor'], ['ramo', 'Por ramo'], ['aseguradora', 'Por aseguradora']].map(o => `<button class="ins-seg-b ${criterio === o[0] ? 'active' : ''}" data-crit="${o[0]}">${o[1]}</button>`).join('')}</div>`;
    return insKpis([
      { label: 'PN acum. ' + YEAR, val: M(acum26), color: 'var(--red)', foot: 'Ene→' + MESES[mesSel] },
      { label: 'vs ' + PREV, val: (varPct >= 0 ? '+' : '') + varPct + '%', color: varPct >= 0 ? 'var(--ok)' : 'var(--danger)', foot: M(acum25) + ' en ' + PREV, footTone: varPct >= 0 ? 'up' : 'down' },
      { label: 'Pólizas ' + YEAR, val: nPol26, color: 'var(--info)', foot: nPol25 + ' en ' + PREV + ' (mismos meses)' },
      { label: 'Intermensual', val: (varMes >= 0 ? '+' : '') + varMes + '%', color: 'var(--warn)', foot: MESES[mesSel] + ' vs ' + (mesSel > 0 ? MESES[mesSel - 1] : '—'), footTone: varMes >= 0 ? 'up' : 'down' }
    ]) + card('Comparativo de prima neta mensual · ' + PREV + ' vs ' + YEAR, colsDual(MESES, s25.arr, s26.arr, PREV + '', YEAR + ''), 'por mes') +
      card('Comparativo ' + PREV + ' vs ' + YEAR + ' · acumulado Ene→' + MESES[mesSel], seg +
        `<table class="tbl" style="margin-top:12px"><thead><tr><th>${criterio === 'general' ? 'Total' : criterio[0].toUpperCase() + criterio.slice(1)}</th><th class="num">${PREV}</th><th class="num">${YEAR}</th><th class="num">Var %</th><th>Tendencia</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td><span style="display:flex;align-items:center;gap:7px"><span class="dot-s" style="background:${r.color}"></span>${U.esc(r.label)}</span></td>
          <td class="num muted">${M(r.v25)}</td><td class="num"><b>${M(r.v26)}</b></td><td class="num">${trend(r.var)}</td>
          <td style="width:24%"><div class="ins-meta-bar"><i style="width:${Math.min(100, Math.abs(r.var))}%;background:${r.var >= 0 ? 'var(--ok)' : 'var(--danger)'}"></i></div></td></tr>`).join('') || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">Sin datos del período.</td></tr>'}</tbody></table>`, 'de lo general a lo particular');
  }

  /* ---- TOP CLIENTES con modal de detalle ---- */
  function vTopClientes() {
    const rows = clientes().map(c => {
      const pol = q.polizasDe(c.id).filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar');
      const neta = pol.reduce((s, p) => s + netaDe(p), 0);
      const esNuevo = (c.segmento === 'Nuevo') || pol.every(esNueva);
      return { c, pol, neta, n: pol.length, esNuevo };
    }).filter(r => r.neta > 0);
    let lista = rows.slice();
    if (topOrden === 'cantidad') lista.sort((a, b) => b.n - a.n);
    else if (topOrden === 'nuevos') lista = lista.filter(r => r.esNuevo).sort((a, b) => b.neta - a.neta);
    else if (topOrden === 'antiguos') lista = lista.filter(r => !r.esNuevo).sort((a, b) => b.neta - a.neta);
    else lista.sort((a, b) => b.neta - a.neta);
    const total = rows.reduce((s, r) => s + r.neta, 0) || 1;
    const top10 = rows.slice().sort((a, b) => b.neta - a.neta).slice(0, 10);
    const concentracion = Math.round(top10.reduce((s, r) => s + r.neta, 0) / total * 100);
    const ordLbl = { volumen: 'volumen de prima neta', cantidad: 'cantidad de pólizas', nuevos: 'clientes nuevos', antiguos: 'clientes antiguos' }[topOrden];
    // distribución por ramo / aseguradora / asesor de la cartera de clientes
    const vig = vigentes();
    const porRamo = topAgg(vig, p => p.ramo, p => netaDe(p), x => x, 6);
    const porAsg = topAgg(vig, p => p.aseguradoraId, p => netaDe(p), id => (q.aseguradora(id) || {}).nombre || id, 6);
    return insKpis([
      { label: 'Clientes activos', val: rows.length, color: 'var(--red)', foot: 'con cartera vigente' },
      { label: 'Clientes nuevos', val: rows.filter(r => r.esNuevo).length, color: 'var(--ok)', foot: 'sin renovaciones aún' },
      { label: 'Concentración top-10', val: concentracion + '%', color: concentracion > 60 ? 'var(--danger)' : 'var(--warn)', foot: 'de la prima neta' },
      { label: 'Ticket promedio', val: M(total / (rows.length || 1)), color: 'var(--info)', foot: 'prima neta por cliente' }
    ]) + card('Clientes · ordenados por ' + ordLbl,
      `<table class="tbl"><thead><tr><th>#</th><th>Cliente</th><th>Asesor</th><th class="num">Pólizas</th><th class="num">Prima neta</th><th class="num">% total</th><th></th></tr></thead>
      <tbody>${lista.slice(0, 25).map((r, i) => `<tr class="clickable" onclick="Orbit.modules.insights.cliente('${r.c.id}')">
        <td style="color:var(--red);font-weight:700">${i + 1}</td>
        <td><b>${U.esc(r.c.nombre)}</b> ${r.esNuevo ? '<span class="badge ok" style="font-size:9px">Nuevo</span>' : ''}<div class="muted" style="font-size:11px">${(r.pol[0] || {}).ramo || ''}</div></td>
        <td style="font-size:12px">${U.esc((q.asesor(r.c.asesorId) || {}).nombre || '—')}</td>
        <td class="num">${r.n}</td><td class="num"><b>${MM(r.neta)}</b></td>
        <td class="num">${(r.neta / total * 100).toFixed(1)}%</td><td style="text-align:right;color:var(--ink-3)">›</td></tr>`).join('') || '<tr><td colspan="7" class="muted" style="text-align:center;padding:20px">Sin clientes en este criterio.</td></tr>'}</tbody></table>`,
      'concentración: top-10 = ' + concentracion + '% de la cartera') +
      `<div class="ins-grid-2">${card('Cartera de clientes por ramo', barsH(porRamo, { money: true }))}${card('Cartera de clientes por aseguradora', barsH(porAsg, { money: true }))}</div>`;
  }
  // modal de detalle de cliente desde Top clientes
  function cliente(cid) {
    const r = q.clienteResumen(cid); if (!r.cli) return;
    const pol = r.pol.filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar');
    const neta = pol.reduce((s, p) => s + netaDe(p), 0);
    const html = `<div class="cx-kpis" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">
        <div class="cx-kpi"><span>Pólizas</span><b>${r.nVigentes}</b><small>vigentes</small></div>
        <div class="cx-kpi"><span>Prima neta</span><b>${M(neta)}</b><small>vigente</small></div>
        <div class="cx-kpi"><span>Pendiente</span><b style="color:var(--warn)">${U.money(r.pendiente, r.moneda)}</b><small>por cobrar</small></div>
        <div class="cx-kpi"><span>Por renovar</span><b>${r.porRenovar}</b><small>pólizas</small></div>
      </div>${tablaPolizas(pol)}
      <div style="margin-top:12px;text-align:right"><button class="btn primary" onclick="document.getElementById('ins-drawer').remove();location.hash='#/cliente360?c=${cid}'">Ver expediente 360 →</button></div>`;
    insDrawer('🧑‍💼 ' + U.esc(r.cli.nombre), (q.asesor(r.cli.asesorId) || {}).nombre + ' · ' + r.cli.pais, html);
  }

  function vPipeline() {
    const ng = negocios();
    const FL = Orbit.ciclo.FLUJO;
    const porEtapa = {}; FL.forEach(e => porEtapa[e] = { n: 0, val: 0 });
    ng.forEach(n => { if (porEtapa[n.etapa]) { porEtapa[n.etapa].n++; porEtapa[n.etapa].val += norm(n.primaEst, n.moneda); } });
    const maxN = Math.max(1, ...FL.map(e => porEtapa[e].n));
    const activos = ng.filter(n => n.etapa !== 'perdido' && n.etapa !== 'emitido');
    const tot = activos.reduce((s, n) => s + norm(n.primaEst, n.moneda), 0);
    const pond = activos.reduce((s, n) => s + norm(n.primaEst, n.moneda) * n.prob / 100, 0);
    const ganados = ng.filter(n => n.etapa === 'emitido').length, perdidos = ng.filter(n => n.etapa === 'perdido').length;
    const conv = (ganados + perdidos) > 0 ? Math.round(ganados / (ganados + perdidos) * 100) : 0;
    const funnel = FL.map(e => { const inf = Orbit.ciclo.etapaInfo(e); return `<div class="ins-funnel-row"><div class="ins-funnel-lbl">${inf.emoji} ${inf.leads}</div><div class="ins-funnel-bar"><i style="width:${Math.max(6, porEtapa[e].n / maxN * 100)}%;background:${inf.color}"><span>${porEtapa[e].n}</span></i></div><div class="ins-funnel-val">${M(porEtapa[e].val)}</div></div>`; }).join('');
    const canalRowsP = Object.entries(aggBy(activos, n => n.canal, n => norm(n.primaEst, n.moneda))).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: palette[i % palette.length] }));
    return insKpis([
      { label: 'Negocios activos', val: activos.length, color: 'var(--red)', foot: 'en pipeline' },
      { label: 'Prima potencial', val: M(tot), color: 'var(--info)', foot: 'sin ponderar' },
      { label: 'Pronóstico ponderado', val: M(pond), color: 'var(--ok)', foot: 'por probabilidad', footTone: 'up' },
      { label: 'Conversión', val: conv + '%', color: 'var(--warn)', foot: ganados + ' ganados · ' + perdidos + ' perdidos' }
    ]) + card('Embudo comercial', `<div class="ins-funnel">${funnel}</div>`, 'negocios por etapa') + card('Pipeline activo por canal', barsH(canalRowsP, { money: true }));
  }

  function vRenovaciones() {
    const pols = polizas().filter(p => p.estado !== 'Cancelada' && p.vigenciaFin);
    const meses = {}; const base = U.NOW || new Date();
    for (let i = 0; i < 6; i++) { const d = new Date(base.getFullYear(), base.getMonth() + i, 1); meses[d.toISOString().slice(0, 7)] = { label: d.toLocaleDateString('es', { month: 'short', year: '2-digit' }), n: 0, val: 0 }; }
    pols.forEach(p => { const k = (p.vigenciaFin || '').slice(0, 7); if (meses[k]) { meses[k].n++; meses[k].val += netaDe(p); } });
    const rows = Object.values(meses).map((m, i) => ({ label: m.label + ' · ' + m.n, val: m.val, color: palette[i % palette.length] }));
    const prox = q.renovacionesProximas(60).filter(p => paisOK(clientePais(p.clienteId)));
    const cancel = cancelaciones();
    const fuga = cancel.reduce((s, c) => { const cli = S().get('clientes', c.clienteId); return s + norm(c.valorPerdido || 0, (cli && cli.moneda) || 'GTQ'); }, 0);
    const tasaCancel = pols.length ? Math.round(cancel.length / (pols.length + cancel.length) * 100) : 0;
    const motivoRows = Object.entries(aggBy(cancel, c => c.motivo || 'Sin motivo', () => 1)).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: palette[i % palette.length] }));
    return insKpis([
      { label: 'Por renovar (60 d)', val: prox.length, color: 'var(--warn)', foot: 'pólizas', detail: { title: 'Renovaciones próximas (60 d)', sub: prox.length + ' pólizas', html: () => tablaPolizas(prox) } },
      { label: 'Prima a renovar', val: M(rows.reduce((s, r) => s + r.val, 0)), color: 'var(--info)', foot: 'próx. 6 meses' },
      { label: 'Tasa de cancelación', val: tasaCancel + '%', color: tasaCancel > 8 ? 'var(--danger)' : 'var(--ok)', foot: cancel.length + ' canceladas' },
      { label: 'Fuga de prima', val: M(fuga), color: 'var(--red)', foot: 'valor perdido', footTone: 'down' }
    ]) + `<div class="ins-grid-2">${card('Prima neta a renovar por mes', barsH(rows, { money: true }), 'próximos 6 meses')}${card('Motivos de cancelación', motivoRows.length ? barsH(motivoRows, { fmt: v => v + (v === 1 ? ' caso' : ' casos') }) : '<div class="muted">Sin cancelaciones.</div>')}</div>` +
      (function () {
        const keyFn = { aseguradora: p => (q.aseguradora(p.aseguradoraId) || {}).nombre || '—', asesor: p => (q.asesor(p.asesorId) || {}).nombre || '—', ramo: p => p.ramo }[renovCrit] || (p => p.ramo);
        const rr = Object.entries(aggBy(prox, keyFn, p => netaDe(p))).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: palette[i % palette.length] }));
        const seg = `<div class="ins-seg">${[['aseguradora', 'Aseguradora'], ['asesor', 'Asesor'], ['ramo', 'Ramo']].map(o => `<button class="ins-seg-b ${renovCrit === o[0] ? 'active' : ''}" data-renovcrit="${o[0]}">${o[1]}</button>`).join('')}</div>`;
        return card('Renovaciones próximas por ' + renovCrit, seg + '<div style="margin-top:12px">' + (rr.length ? barsH(rr, { money: true }) : '<div class="muted">Sin renovaciones próximas.</div>') + '</div>', 'de lo general a lo particular');
      })() +
      card('Renovaciones inminentes', tablaPolizas(prox.slice(0, 14)));
  }

  /* ---- ANÁLISIS CRÍTICO: alertas + recomendaciones ---- */
  function vCritico() {
    const vig = vigentes();
    const netaAcum26 = acumHasta(serieAnual(YEAR).arr, MES), netaAcum25 = acumHasta(serieAnual(PREV).arr, MES);
    const varPct = netaAcum25 > 0 ? Math.round((netaAcum26 - netaAcum25) / netaAcum25 * 100) : 0;
    const cob = cobros();
    const recaudado = cob.filter(c => c.estado === 'Pagado').reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const totalCart = cob.reduce((s, c) => s + norm(c.monto, c.moneda), 0) || 1;
    const tasaRecaudo = Math.round(recaudado / totalCart * 100);
    const cancel = cancelaciones(); const pols = polizas().filter(p => p.estado !== 'Cancelada');
    const tasaCancel = pols.length ? Math.round(cancel.length / (pols.length + cancel.length) * 100) : 0;
    const venc30 = q.renovacionesProximas(30).filter(p => paisOK(clientePais(p.clienteId)));
    const vencPrima = venc30.reduce((s, p) => s + netaDe(p), 0);
    const alerts = [];
    if (varPct < 0) alerts.push({ t: 'danger', txt: `Caída del ${Math.abs(varPct)}% en prima neta vs mismo período ${PREV} — ${MM(netaAcum25 - netaAcum26)} menos.` });
    if (tasaCancel > 8) alerts.push({ t: 'warn', txt: `Tasa de cancelación del ${tasaCancel}% — por encima del umbral saludable (8%). Revisar causas por aseguradora.` });
    if (tasaRecaudo < 70) alerts.push({ t: 'danger', txt: `Recaudo en ${tasaRecaudo}% de la cartera — gestionar cobros pendientes y vencidos.` });
    if (venc30.length) alerts.push({ t: 'warn', txt: `${venc30.length} pólizas vencen en los próximos 30 días (${M(vencPrima)} de prima neta expuesta).` });
    if (!alerts.length) alerts.push({ t: 'ok', txt: 'Indicadores dentro de rangos saludables para el período analizado.' });
    const recs = [];
    if (venc30.length) recs.push(`Activar campaña de renovación para las ${venc30.length} pólizas que vencen este mes.`);
    if (tasaCancel > 8) recs.push('Revisar causas de cancelación por aseguradora y activar retención proactiva.');
    if (tasaRecaudo < 80) recs.push(`Gestionar la cartera pendiente — ${MM(totalCart - recaudado)} por recuperar.`);
    const topAse = q.leaderboard()[0];
    if (topAse) recs.push(`Replicar prácticas del asesor líder (${topAse.asesor.nombre}) en el resto del equipo.`);
    const ramoParts = Object.entries(aggBy(vig, p => p.ramo, p => netaDe(p))).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: RAMO_COLORS[e[0]] || palette[i % palette.length] }));
    return insKpis([
      { label: 'Prima neta acum.', val: M(netaAcum26), color: 'var(--red)', foot: (varPct >= 0 ? '▲ ' : '▼ ') + Math.abs(varPct) + '% vs ' + PREV, footTone: varPct >= 0 ? 'up' : 'down' },
      { label: 'Tasa de recaudo', val: tasaRecaudo + '%', color: tasaRecaudo >= 80 ? 'var(--ok)' : 'var(--danger)', foot: 'de la cartera' },
      { label: 'Tasa de cancelación', val: tasaCancel + '%', color: tasaCancel > 8 ? 'var(--danger)' : 'var(--ok)', foot: cancel.length + ' pólizas' },
      { label: 'Vencen ≤30 d', val: venc30.length, color: 'var(--warn)', foot: M(vencPrima) + ' expuesto', detail: { title: 'Pólizas que vencen en 30 días', sub: venc30.length + ' pólizas', html: () => tablaPolizas(venc30) } }
    ]) + card('⚠ Alertas detectadas (' + alerts.filter(a => a.t !== 'ok').length + ')',
      `<div class="ins-alerts">${alerts.map(a => `<div class="ins-alert ${a.t}"><span class="dot-s" style="background:${a.t === 'danger' ? 'var(--danger)' : a.t === 'warn' ? 'var(--warn)' : 'var(--ok)'}"></span>${a.txt}</div>`).join('')}</div>`) +
      card('💡 Recomendaciones por área', `<ol class="ins-recs">${recs.map(r => `<li>${r}</li>`).join('')}</ol>`) +
      `<div class="ins-grid-2">${card('Composición de cartera (prima neta)', donut(ramoParts.map(p => ({ ...p, pct: Math.round(p.val / (ramoParts.reduce((s, x) => s + x.val, 0) || 1) * 100) })), ramoParts.length, 'ramos'))}${card('Producción mensual ' + YEAR, barsH(serieAnual(YEAR).arr.slice(0, MES + 1).map((v, i) => ({ label: MESES[i], val: v, color: 'var(--red)' })), { money: true }))}</div>`;
  }

  const VISTAS = [['resumen', '📊 Resumen'], ['metas', '🎯 Metas'], ['produccion', '📈 Producción'], ['cartera', '💳 Cartera'], ['comparativo', '🔀 Comparativo'], ['topclientes', '🏆 Top clientes'], ['pipeline', '🎲 Pipeline'], ['renovaciones', '🔄 Renovaciones'], ['critico', '🔎 Análisis crítico']];
  const FN = { resumen: vResumen, metas: vMetas, produccion: vProduccion, cartera: vCartera, comparativo: vComparativo, topclientes: vTopClientes, pipeline: vPipeline, renovaciones: vRenovaciones, critico: vCritico };

  function draw() {
    const body = (FN[vista] || vResumen)();
    const paisLbl = (Orbit.PAISES.find(p => p.id === Orbit.pais) || {}).label || 'Todos los países';
    const showMes = ['metas', 'comparativo', 'critico'].includes(vista);
    const showTop = vista === 'topclientes';
    host.innerHTML = `<div class="page">
      ${K.bannerFor('insights', `<div class="ins-controls">
        <select id="ins-pais" class="ins-ctl" title="País">${Orbit.PAISES.map(p => `<option value="${p.id}" ${p.id === (Orbit.pais || 'TODOS') ? 'selected' : ''}>🌎 ${p.label}</option>`).join('')}</select>
        ${showMes ? `<select id="ins-mes" class="ins-ctl" title="Mes (acumulado Ene→mes)">${MESES.map((m, i) => `<option value="${i}" ${i === mesSel ? 'selected' : ''}>${m} ${YEAR}</option>`).join('')}</select>` : ''}
        ${showTop ? `<select id="ins-top" class="ins-ctl" title="Ordenar por">${[['volumen', 'Por volumen de prima'], ['cantidad', 'Por cantidad de pólizas'], ['nuevos', 'Clientes nuevos'], ['antiguos', 'Clientes antiguos']].map(o => `<option value="${o[0]}" ${o[0] === topOrden ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>` : ''}
      </div>`)}
      <div class="ins-tabs">${VISTAS.map(v => `<button class="ins-tab ${vista === v[0] ? 'active' : ''}" data-v="${v[0]}">${v[1]}</button>`).join('')}</div>
      ${body}
      <div class="ins-note">Cifras normalizadas a base GTQ para comparar países; cada vista respeta el selector de país. Comisión y producción sobre <b>prima neta</b>. KPIs <b>clicables</b> (⤢) abren el detalle. Datos del CRM en vivo.</div>
    </div>`;
    host.querySelectorAll('.ins-tab').forEach(b => b.addEventListener('click', () => { vista = b.dataset.v; draw(); }));
    const pSel = host.querySelector('#ins-pais'); if (pSel) pSel.addEventListener('change', () => { Orbit.pais = pSel.value; document.dispatchEvent(new CustomEvent('orbit:pais')); draw(); });
    const mSel = host.querySelector('#ins-mes'); if (mSel) mSel.addEventListener('change', () => { mesSel = +mSel.value; draw(); });
    const tSel = host.querySelector('#ins-top'); if (tSel) tSel.addEventListener('change', () => { topOrden = tSel.value; draw(); });
    host.querySelectorAll('[data-crit]').forEach(b => b.addEventListener('click', () => { criterio = b.dataset.crit; draw(); }));
    host.querySelectorAll('[data-renovcrit]').forEach(b => b.addEventListener('click', () => { renovCrit = b.dataset.renovcrit; draw(); }));
    wireKpis();
  }

  function render(h) {
    host = h; draw();
    if (!unsub) {
      const re = () => { if (Orbit.route && Orbit.route.key === 'insights' && document.body.contains(host)) draw(); };
      const u1 = Orbit.store.on(re); const f = () => re();
      document.addEventListener('orbit:pais', f); document.addEventListener('orbit:ciclo', f);
      unsub = () => { u1(); document.removeEventListener('orbit:pais', f); document.removeEventListener('orbit:ciclo', f); };
    }
  }
  return { render, cliente };
})();
