/* ============================================================
   Orbit 360 · Orbit Insights — analítica integral del CRM
   Lee Cliente 360, Pólizas, Cobros, Comisiones, Cancelaciones y
   el pipeline (negocios del ciclo). Vistas: Resumen · Producción ·
   Cartera · Pipeline · Renovaciones. Respeta el filtro de país.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.insights = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let vista = 'resumen', host, unsub;
  const norm = (m, cur) => q.norm(m, cur);
  const M = (n) => U.moneyShort(n, 'GTQ');

  /* ---- helpers de país ---- */
  function paisOK(p) { return !Orbit.pais || Orbit.pais === 'TODOS' || p === Orbit.pais; }
  function clientePais(cliId) { const c = S().get('clientes', cliId); return c ? c.pais : 'GT'; }
  function polizas() { return S().all('polizas').filter(p => paisOK(clientePais(p.clienteId))); }
  function vigentes() { return polizas().filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar'); }
  function cobros() { return S().all('cobros').filter(c => paisOK(clientePais(c.clienteId))); }
  function comisiones() { return S().all('comisiones').filter(c => paisOK(clientePais(c.clienteId))); }
  function negocios() { return (Orbit.ciclo ? Orbit.ciclo.negocios({ ignoreRol: true }) : []); }
  function cancelaciones() { return S().all('cancelaciones').filter(c => paisOK(clientePais(c.clienteId))); }

  /* ---- micro-gráficos (CSS, sin libs) ---- */
  function barsH(rows, opts) {
    opts = opts || {};
    const max = Math.max(1, ...rows.map(r => r.val));
    return `<div class="ins-bars">${rows.map(r => `
      <div class="ins-bar-row">
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
  function card(title, body, sub) {
    return `<div class="card pad ins-card"><div class="ins-h"><b>${title}</b>${sub ? `<span class="muted">${sub}</span>` : ''}</div>${body}</div>`;
  }

  /* ---- agregaciones ---- */
  function aggBy(items, keyFn, valFn) {
    const m = {};
    items.forEach(it => { const k = keyFn(it); if (k == null) return; m[k] = (m[k] || 0) + valFn(it); });
    return m;
  }
  const RAMO_COLORS = { Auto: '#C5162E', Vida: '#1f8a4c', 'Gastos Médicos': '#2563a8', Hogar: '#c9821b', Daños: '#6b4ea0', RC: '#0f766e', Fianzas: '#7c3aed', Transporte: '#0e7490', Accidentes: '#be185d' };
  const palette = ['#C5162E', '#1f3a5f', '#c9821b', '#0f766e', '#6b4ea0', '#2563a8', '#15803d', '#b45309', '#be185d', '#0e7490'];

  /* ===================== VISTAS ===================== */
  function vResumen() {
    const vig = vigentes();
    const primaVig = vig.reduce((s, p) => s + norm(p.prima, p.moneda), 0);
    const cob = cobros();
    const recaudado = cob.filter(c => c.estado === 'Pagado').reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const pend = cob.filter(c => c.estado === 'Pendiente').reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const venc = cob.filter(c => c.estado === 'Vencido').reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const com = comisiones().reduce((s, c) => s + norm(c.monto, c.moneda), 0);
    const nClientes = S().all('clientes').filter(c => paisOK(c.pais)).length;
    const tasaRecaudo = recaudado + pend + venc > 0 ? Math.round(recaudado / (recaudado + pend + venc) * 100) : 0;

    // mix por ramo (prima vigente)
    const ramoAgg = aggBy(vig, p => p.ramo, p => norm(p.prima, p.moneda));
    const ramoParts = Object.entries(ramoAgg).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: RAMO_COLORS[e[0]] || palette[i % palette.length] }));
    // cartera por estado
    const estParts = [
      { label: 'Al día', val: recaudado, color: '#1f8a4c' },
      { label: 'Pendiente', val: pend, color: '#c9821b' },
      { label: 'Vencido', val: venc, color: '#C5162E' }
    ];

    return `${K.kpis([
      { label: 'Prima vigente', val: M(primaVig), color: 'var(--red)', foot: vig.length + ' pólizas activas' },
      { label: 'Recaudado', val: M(recaudado), color: 'var(--ok)', foot: tasaRecaudo + '% de la cartera', footTone: 'up' },
      { label: 'Por cobrar', val: M(pend + venc), color: 'var(--warn)', foot: M(venc) + ' vencido' },
      { label: 'Comisión generada', val: M(com), color: 'var(--info)', foot: nClientes + ' clientes' }
    ])}
    <div class="ins-grid-2">
      ${card('Prima vigente por ramo', donut(ramoParts.map(p => ({ ...p, pct: Math.round(p.val / (primaVig || 1) * 100) })), ramoParts.length, 'ramos'), 'distribución de cartera')}
      ${card('Estado de la cartera', donut(estParts.map(p => ({ ...p, pct: Math.round(p.val / ((recaudado + pend + venc) || 1) * 100) })), tasaRecaudo + '%', 'recaudo'), 'pagado vs pendiente vs vencido')}
    </div>
    <div class="ins-grid-2">
      ${card('Top aseguradoras por prima', barsH(topAgg(vig, p => p.aseguradoraId, p => norm(p.prima, p.moneda), id => { const a = q.aseguradora(id); return a ? a.nombre : id; }, 6), { money: true }))}
      ${card('Producción por canal', barsH(canalRows(), { money: true }), 'prima estimada de negocios')}
    </div>`;
  }

  function topAgg(items, keyFn, valFn, labelFn, n) {
    const m = aggBy(items, keyFn, valFn);
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n || 8).map((e, i) => ({ label: labelFn(e[0]), val: e[1], color: palette[i % palette.length] }));
  }
  function canalRows() {
    const m = aggBy(negocios().filter(n => n.etapa !== 'perdido'), n => n.canal, n => norm(n.primaEst, n.moneda));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map((e, i) => ({ label: e[0], val: e[1], color: palette[i % palette.length] }));
  }

  function vProduccion() {
    const lb = q.leaderboard();
    const vig = vigentes();
    const ramoRows = Object.entries(aggBy(vig, p => p.ramo, p => norm(p.prima, p.moneda))).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: RAMO_COLORS[e[0]] || palette[i % palette.length] }));
    const prodRows = Object.entries(aggBy(vig, p => p.producto, p => norm(p.prima, p.moneda))).sort((a, b) => b[1] - a[1]).slice(0, 8).map((e, i) => ({ label: e[0], val: e[1], color: palette[i % palette.length] }));
    return `${card('Avance por asesor · prima vigente vs meta',
      `<table class="tbl"><thead><tr><th>Asesor</th><th>Avance de meta</th><th class="num">Prima</th><th class="num">Comisión</th></tr></thead>
      <tbody>${lb.map(r => `<tr>
        <td style="min-width:170px"><span style="display:flex;align-items:center;gap:8px">${U.avatar(r.asesor.nombre, r.asesor.color, 'sm')}${U.esc(r.asesor.nombre)}</span></td>
        <td style="width:42%"><div class="ins-meta-bar"><i style="width:${Math.min(100, r.pct)}%;background:${r.pct >= 100 ? 'var(--ok)' : r.pct >= 70 ? 'var(--warn)' : 'var(--red)'}"></i><span>${r.pct}%</span></div></td>
        <td class="num"><b>${M(r.prima)}</b></td>
        <td class="num" style="color:var(--info)">${M(r.comision)}</td></tr>`).join('')}</tbody></table>`)}
    <div class="ins-grid-2">
      ${card('Prima por ramo', barsH(ramoRows, { money: true }))}
      ${card('Top productos', barsH(prodRows, { money: true }))}
    </div>`;
  }

  function vCartera() {
    const aging = q.agingVencido();
    const agingRows = Object.entries(aging).map(([k, v], i) => ({ label: k + ' días', val: v, color: ['#c9821b', '#e0701a', '#C5162E', '#7f1020'][i] }));
    const cob = cobros();
    const formaRows = Object.entries(aggBy(cob.filter(c => c.estado !== 'Pagado'), c => c.forma || '—', c => norm(c.monto, c.moneda))).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: palette[i % palette.length] }));
    const venc = q.cobrosVencidos().filter(c => paisOK(clientePais(c.clienteId))).slice(0, 12);
    const totVenc = Object.values(aging).reduce((s, v) => s + v, 0);
    return `${K.kpis([
      { label: 'Cartera vencida', val: M(totVenc), color: 'var(--red)', foot: q.cobrosVencidos().length + ' recibos' },
      { label: 'Tramo crítico 90+', val: M(aging['90+']), color: 'var(--danger)', foot: 'mayor riesgo' },
      { label: 'Pendiente por cobrar', val: M(cob.filter(c => c.estado === 'Pendiente').reduce((s, c) => s + norm(c.monto, c.moneda), 0)), color: 'var(--warn)', foot: 'aún no vencido' }
    ])}
    <div class="ins-grid-2">
      ${card('Aging de cartera vencida', barsH(agingRows, { money: true }), 'por antigüedad')}
      ${card('Saldo por forma de pago', barsH(formaRows, { money: true }), 'pendiente + vencido')}
    </div>
    ${card('Recibos vencidos prioritarios', `<table class="tbl"><thead><tr><th>Cliente</th><th>Cuota</th><th class="num">Monto</th><th>Venció</th><th></th></tr></thead>
      <tbody>${venc.map(c => `<tr class="clickable" onclick="location.hash='#/cliente360?c=${c.clienteId}'">
        <td>${K.clienteCell(c.clienteId)}</td><td>${c.cuota || '—'}</td><td class="num">${U.money(c.monto, c.moneda)}</td>
        <td style="color:var(--red);font-size:12.5px">hace ${-U.daysFromNow(c.vence)} d</td><td style="text-align:right;color:var(--ink-3)">›</td></tr>`).join('') || '<tr><td colspan="5" class="muted" style="text-align:center;padding:22px">Sin recibos vencidos.</td></tr>'}</tbody></table>`)}`;
  }

  function vPipeline() {
    const ng = negocios();
    const FL = Orbit.ciclo.FLUJO;
    const porEtapa = {};
    FL.forEach(e => porEtapa[e] = { n: 0, val: 0 });
    ng.forEach(n => { if (porEtapa[n.etapa]) { porEtapa[n.etapa].n++; porEtapa[n.etapa].val += norm(n.primaEst, n.moneda); } });
    const maxN = Math.max(1, ...FL.map(e => porEtapa[e].n));
    const activos = ng.filter(n => n.etapa !== 'perdido' && n.etapa !== 'emitido');
    const tot = activos.reduce((s, n) => s + norm(n.primaEst, n.moneda), 0);
    const pond = activos.reduce((s, n) => s + norm(n.primaEst, n.moneda) * n.prob / 100, 0);
    const ganados = ng.filter(n => n.etapa === 'emitido').length;
    const perdidos = ng.filter(n => n.etapa === 'perdido').length;
    const conv = (ganados + perdidos) > 0 ? Math.round(ganados / (ganados + perdidos) * 100) : 0;
    const funnel = FL.map((e, i) => {
      const inf = Orbit.ciclo.etapaInfo(e);
      return `<div class="ins-funnel-row">
        <div class="ins-funnel-lbl">${inf.emoji} ${inf.leads}</div>
        <div class="ins-funnel-bar"><i style="width:${Math.max(6, porEtapa[e].n / maxN * 100)}%;background:${inf.color}"><span>${porEtapa[e].n}</span></i></div>
        <div class="ins-funnel-val">${M(porEtapa[e].val)}</div>
      </div>`;
    }).join('');
    // por canal y ramo
    const canalRowsP = Object.entries(aggBy(activos, n => n.canal, n => norm(n.primaEst, n.moneda))).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: palette[i % palette.length] }));
    return `${K.kpis([
      { label: 'Negocios activos', val: activos.length, color: 'var(--red)', foot: 'en pipeline' },
      { label: 'Prima potencial', val: M(tot), color: 'var(--info)', foot: 'sin ponderar' },
      { label: 'Pronóstico ponderado', val: M(pond), color: 'var(--ok)', foot: 'por probabilidad', footTone: 'up' },
      { label: 'Tasa de conversión', val: conv + '%', color: 'var(--warn)', foot: ganados + ' ganados · ' + perdidos + ' perdidos' }
    ])}
    ${card('Embudo comercial', `<div class="ins-funnel">${funnel}</div>`, 'negocios por etapa del ciclo')}
    ${card('Pipeline activo por canal', barsH(canalRowsP, { money: true }))}`;
  }

  function vRenovaciones() {
    const pols = polizas().filter(p => p.estado !== 'Cancelada' && p.vigenciaFin);
    // próximos 6 meses
    const meses = {};
    const base = U.NOW || new Date();
    for (let i = 0; i < 6; i++) { const d = new Date(base.getFullYear(), base.getMonth() + i, 1); meses[d.toISOString().slice(0, 7)] = { label: d.toLocaleDateString('es', { month: 'short', year: '2-digit' }), n: 0, val: 0 }; }
    pols.forEach(p => { const k = (p.vigenciaFin || '').slice(0, 7); if (meses[k]) { meses[k].n++; meses[k].val += norm(p.prima, p.moneda); } });
    const rows = Object.values(meses).map((m, i) => ({ label: m.label + ' · ' + m.n, val: m.val, color: palette[i % palette.length] }));
    const prox = q.renovacionesProximas(60).filter(p => paisOK(clientePais(p.clienteId))).slice(0, 12);
    const cancel = cancelaciones();
    const fuga = cancel.reduce((s, c) => { const cli = S().get('clientes', c.clienteId); return s + norm(c.valorPerdido || 0, (cli && cli.moneda) || 'GTQ'); }, 0);
    const motivoRows = Object.entries(aggBy(cancel, c => c.motivo || 'Sin motivo', () => 1)).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: palette[i % palette.length] }));
    return `${K.kpis([
      { label: 'Por renovar (60 d)', val: q.renovacionesProximas(60).filter(p => paisOK(clientePais(p.clienteId))).length, color: 'var(--warn)', foot: 'pólizas' },
      { label: 'Prima en renovación', val: M(rows.reduce((s, r) => s + r.val, 0)), color: 'var(--info)', foot: 'próximos 6 meses' },
      { label: 'Cancelaciones', val: cancel.length, color: 'var(--red)', foot: M(fuga) + ' de fuga' }
    ])}
    <div class="ins-grid-2">
      ${card('Prima a renovar por mes', barsH(rows, { money: true }), 'próximos 6 meses')}
      ${card('Motivos de cancelación', motivoRows.length ? barsH(motivoRows, { fmt: v => v + (v === 1 ? ' caso' : ' casos') }) : '<div class="muted" style="font-size:13px">Sin cancelaciones registradas.</div>')}
    </div>
    ${card('Renovaciones inminentes', `<table class="tbl"><thead><tr><th>Cliente</th><th>Póliza</th><th>Ramo</th><th class="num">Prima</th><th>Vence</th><th></th></tr></thead>
      <tbody>${prox.map(p => `<tr class="clickable" onclick="Orbit.modules.cliente360.verPoliza('${p.id}')">
        <td>${K.clienteCell(p.clienteId)}</td><td class="mono" style="font-size:12px">${p.numero}</td><td>${p.ramo}</td>
        <td class="num">${U.money(p.prima, p.moneda)}</td><td style="font-size:12.5px;color:var(--warn)">en ${U.daysFromNow(p.vigenciaFin)} d</td>
        <td style="text-align:right;color:var(--ink-3)">›</td></tr>`).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:22px">Sin renovaciones próximas.</td></tr>'}</tbody></table>`)}`;
  }

  const VISTAS = [['resumen', '📊 Resumen'], ['produccion', '📈 Producción'], ['cartera', '💳 Cartera'], ['pipeline', '🎯 Pipeline'], ['renovaciones', '🔄 Renovaciones']];

  function draw() {
    const body = { resumen: vResumen, produccion: vProduccion, cartera: vCartera, pipeline: vPipeline, renovaciones: vRenovaciones }[vista]();
    const paisLbl = (Orbit.PAISES.find(p => p.id === Orbit.pais) || {}).label || 'Todos los países';
    host.innerHTML = `<div class="page">
      ${K.bannerFor('insights', `<span class="ins-paisbadge">🌎 ${paisLbl}</span>`)}
      <div class="ins-tabs">${VISTAS.map(v => `<button class="ins-tab ${vista === v[0] ? 'active' : ''}" data-v="${v[0]}">${v[1]}</button>`).join('')}</div>
      ${body}
      <div class="ins-note">Cifras normalizadas a base GTQ para comparación entre países; cada vista respeta el selector de país de la barra superior. Analítica sobre datos del CRM en vivo.</div>
    </div>`;
    host.querySelectorAll('.ins-tab').forEach(b => b.addEventListener('click', () => { vista = b.dataset.v; draw(); }));
  }

  function render(h) {
    host = h; draw();
    if (!unsub) {
      const re = () => { if (Orbit.route && Orbit.route.key === 'insights' && document.body.contains(host)) draw(); };
      const u1 = Orbit.store.on(re);
      const f = () => re();
      document.addEventListener('orbit:pais', f);
      document.addEventListener('orbit:ciclo', f);
      unsub = () => { u1(); document.removeEventListener('orbit:pais', f); document.removeEventListener('orbit:ciclo', f); };
    }
  }
  return { render };
})();
