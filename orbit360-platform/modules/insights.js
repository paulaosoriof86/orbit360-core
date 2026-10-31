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
  const M = (n) => U.moneyShort(n, Orbit.q.monedaPais());
  const MM = (n) => U.money(n, Orbit.q.monedaPais());
  const YEAR = 2026, PREV = 2025;
  const MES0 = U.NOW ? new Date(U.NOW).getMonth() : 5; // mes actual
  let mesSel = MES0;           // mes seleccionado (acumulado Ene→mesSel)
  let criterio = 'general';    // comparativo: general | asesor | ramo | aseguradora
  let topOrden = 'volumen';    // top clientes: volumen | cantidad | nuevos | antiguos
  let renovCrit = 'aseguradora'; // renovaciones: aseguradora | asesor | ramo
  let asesorSel = '';           // filtro global por asesor ('' = todos)
  function aseOK(asId) { return !asesorSel || asId === asesorSel; }
  const MES = MES0;            // compat: algunos cálculos usan el mes actual base

  /* ---- país + accesos ---- */
  // Country is verified at the policy/financial-parent boundary. Never send
  // orphan records to GT or include unverified parents in TODOS.
  function paisClave(value) { const c = String(value == null ? '' : value).trim().toUpperCase(); return (c === 'GT' || c === 'CO') ? c : ''; }
  function paisOK(value) { const c = paisClave(value), p = String(Orbit.pais || '').trim().toUpperCase(); return !!c && (!p || p === 'TODOS' || p === c); }
  function clientePais(cliId) { const c = S().get('clientes', cliId); return paisClave(c && c.pais); }
  function polizaPais(p) { if (!p) return ''; const own = String(p.pais == null ? '' : p.pais).trim(); return own ? paisClave(own) : clientePais(p.clienteId); }
  function registroPais(row) { return row && typeof q.policyLinkedCountry === 'function' ? paisClave(q.policyLinkedCountry(row)) : ''; }
  function polizas() { return S().all('polizas').filter(p => p && paisOK(polizaPais(p)) && aseOK(p.asesorId)); }
  function vigentes() { return polizas().filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar'); }
  function cobros() { return S().all('cobros').filter(c => paisOK(registroPais(c)) && aseOK(c.asesorId)); }
  function comisiones() { return S().all('comisiones').filter(c => paisOK(registroPais(c)) && aseOK(c.asesorId)); }
  function negocios() { return (Orbit.ciclo ? Orbit.ciclo.negocios({ ignoreRol: true }) : []); }
  function cancelaciones() { return S().all('cancelaciones').filter(c => paisOK(registroPais(c))); }
  function clientes() { return S().all('clientes').filter(c => paisOK(c.pais)); }
  const esNueva = p => !(p.contadorRenovaciones > 0);
  const netaDe = p => norm(p.primaNeta != null ? p.primaNeta : p.prima, p.moneda);

  // Presentation only: the recovered Queries owner remains the authority for
  // obligations, confirmed payments, calendar dates and verified amounts.
  function inInsightsScope(fn) {
    return Orbit.access && typeof Orbit.access.withScope === 'function'
      ? Orbit.access.withScope('insights', fn) : fn();
  }
  function financeNumber(value) {
    if (value == null || String(value).trim() === '') return null;
    const n = U.finiteNumber ? U.finiteNumber(value) : Number(value);
    return n != null && Number.isFinite(n) ? n : null;
  }
  function financialReadiness() {
    const store = S();
    if (!store || store.__productReadOnlyP0 !== true || typeof store._productStatus !== 'function') return 'ready';
    const status = store._productStatus() || {};
    const names = ['clientes', 'polizas', 'carteraPrimas', 'recibosEsperados', 'cobros'];
    const confirmed = status.serverConfirmedCollections || [], denied = status.deniedCollections || [];
    const failed = Object.keys(status.snapshotErrors || {});
    if (names.some(name => denied.includes(name) || failed.includes(name))) return 'unavailable';
    return names.every(name => confirmed.includes(name)) ? 'ready' : 'pending';
  }
  function financialSnapshot() {
    return inInsightsScope(() => {
      const readiness = financialReadiness();
      const result = { readiness, pending: [], overdue: [], confirmed: [] };
      if (readiness !== 'ready') return result;
      // Construct proof context BEFORE local country/adviser filters. Filtering
      // here would hide duplicate receipt links and invalidate amount provenance.
      const context = q.portfolioAmountContext();
      const project = (row, kind) => {
        const policy = context.policiesById.get(String(row.polizaId || ''));
        const clientId = policy && policy.clienteId || row.clienteId || '';
        const client = clientId && S().get('clientes', clientId);
        const adviser = row.asesorId || policy && policy.asesorId || client && client.asesorId || '';
        if (!paisOK(registroPais(row)) || !aseOK(adviser)) return null;
        const key = String(row.reciboId || row.receiptId || '').trim();
        const linked = key && !context.duplicates.has(key) ? context.receiptsById.get(key) : null;
        const receipt = linked && String(linked.polizaId || linked.policyId || '') === String(row.polizaId || '') &&
          (!linked.clienteId || String(linked.clienteId) === String(clientId)) ? linked : null;
        const fromRow = String(row.moneda || '').trim().toUpperCase();
        const fromPolicy = String(policy && (policy.moneda || policy.divisa) || '').trim().toUpperCase();
        const fromSource = String(row.sourceMoneda || '').trim().toUpperCase();
        const conflict = row.currencyValidation === 'REQUIERE_VALIDACION' ||
          fromRow && fromPolicy && fromRow !== fromPolicy || fromSource && fromPolicy && fromSource !== fromPolicy;
        const currency = conflict ? 'SIN_MONEDA' : (fromPolicy || fromRow || 'SIN_MONEDA');
        const classification = q.portfolioClassification(row);
        const proof = kind === 'portfolio' ? q.portfolioAmountProof(row, context) : { value: financeNumber(row.monto), source: 'CONFIRMED_PAYMENT' };
        return {
          id: row.id, kind, clienteId: clientId, polizaId: row.polizaId, asesorId: adviser,
          cuota: row.cuota != null ? row.cuota : row.secuencia != null ? row.secuencia : row.serie != null ? row.serie :
            receipt && (receipt.cuota != null ? receipt.cuota : receipt.secuencia != null ? receipt.secuencia : receipt.serie) != null ?
              (receipt.cuota != null ? receipt.cuota : receipt.secuencia != null ? receipt.secuencia : receipt.serie) : '—',
          monto: proof.value, moneda: currency, vence: q.portfolioDue(row),
          fechaPago: kind === 'payment' ? (row.fechaPago || row.paidDate || '') : '',
          estado: kind === 'payment' ? 'Pagado' : classification.overdue ? 'Vencido' : classification.unknownDate ? 'Fecha pendiente de validación' : 'Pendiente',
          daysOverdue: classification.daysOverdue, source: proof.source, row
        };
      };
      result.pending = q.carteraPendienteRows().map(row => project(row, 'portfolio')).filter(Boolean);
      result.overdue = q.carteraVencidaRows().map(row => project(row, 'portfolio')).filter(Boolean)
        .sort((a, b) => b.daysOverdue - a.daysOverdue || String(a.id).localeCompare(String(b.id)));
      result.confirmed = q.cobrosConfirmadosRows().map(row => project(row, 'payment')).filter(Boolean);
      return result;
    });
  }
  function financeSums(rows) {
    const sums = {};
    rows.forEach(row => {
      if (row.monto == null || row.moneda === 'SIN_MONEDA' || !row.moneda) return;
      sums[row.moneda] = (sums[row.moneda] || 0) + row.monto;
    });
    return sums;
  }
  function financeRateRows(snapshot) {
    const all = snapshot.confirmed.concat(snapshot.pending, snapshot.overdue);
    const unknownCurrency = all.filter(row => row.moneda === 'SIN_MONEDA' || !row.moneda).length;
    const confirmed = financeSums(snapshot.confirmed), pending = financeSums(snapshot.pending), overdue = financeSums(snapshot.overdue);
    return [...new Set(all.map(row => row.moneda).filter(cur => cur && cur !== 'SIN_MONEDA'))].sort().map(moneda => {
      const missing = unknownCurrency + all.filter(row => row.moneda === moneda && row.monto == null).length;
      const paid = confirmed[moneda] || 0, pend = pending[moneda] || 0, venc = overdue[moneda] || 0;
      const denominator = paid + pend + venc;
      return { moneda, confirmed: paid, pending: pend, overdue: venc, missing,
        rate: missing || denominator <= 0 ? null : Math.round(paid / denominator * 100) };
    });
  }
  function financeValue(rows, full) {
    const sums = financeSums(rows), entries = Object.entries(sums).sort();
    if (!entries.length) return rows.length ? 'Sin monto verificado' : 'Sin registros';
    return entries.map(([cur, value]) => `<span style="display:block">${full ? U.money(value, cur) : U.moneyShort(value, cur)} <small>${U.esc(cur)}</small></span>`).join('');
  }
  function financeRateText(snapshot) {
    const rates = financeRateRows(snapshot);
    return rates.length ? rates.map(r => `${U.esc(r.moneda)}: ${r.rate == null ? 'por validar' : r.rate + '%'}`).join(' · ') : 'Sin base para calcular';
  }
  function financeWarning(rows) {
    const missing = rows.filter(r => r.monto == null).length;
    const currency = rows.filter(r => r.moneda === 'SIN_MONEDA').length;
    const dates = rows.filter(r => r.kind === 'portfolio' && !r.vence).length;
    const warnings = [missing ? missing + ' sin monto fuente' : '', currency ? currency + ' con moneda por validar' : '', dates ? dates + ' sin vencimiento validado' : ''].filter(Boolean);
    return warnings.length ? `<div class="cfg-note" data-insights-finance-warning="1">Importes verificados parciales: ${warnings.join(' · ')}. Los registros siguen visibles; no se sustituyen por cero ni se inventan fechas.</div>` : '';
  }
  function financePending(readiness) {
    return readiness === 'unavailable' ? 'Información no disponible para este acceso.' : 'Esperando confirmación del servidor…';
  }
  function financialRowsTable(rows) {
    return `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Cliente</th><th>Cuota</th><th class="num">Monto</th><th>Vence / fecha de pago</th><th>Estado</th></tr></thead><tbody>${rows.map(row => {
      const client = S().get('clientes', row.clienteId);
      const href = '#/cliente360?c=' + encodeURIComponent(row.clienteId) + '&t=recibos';
      const value = row.moneda === 'SIN_MONEDA' ? 'Moneda por validar' : row.monto == null ? 'Sin monto fuente' : U.money(row.monto, row.moneda) + ' ' + row.moneda;
      const due = row.kind === 'payment' ? row.fechaPago : row.vence;
      return `<tr><td><a href="${U.esc(href)}" onclick="document.getElementById('ins-drawer')?.remove()">${U.esc(client && client.nombre || row.clienteId || '—')}</a></td><td>${U.esc(String(row.cuota))}</td><td class="num">${U.esc(value)}</td><td>${due ? U.fmtDate(due) : 'Sin fecha validada'}</td><td>${U.esc(row.estado)}</td></tr>`;
    }).join('') || '<tr><td colspan="5" class="muted">Sin registros.</td></tr>'}</tbody></table></div>`;
  }
  function financeBars(rows, keyOf, empty) {
    const currencies = Object.keys(financeSums(rows)).sort();
    return currencies.map(cur => {
      const entries = topAgg(rows.filter(row => row.moneda === cur && row.monto != null), keyOf, row => row.monto, key => U.esc(key || 'Sin dato'), 12);
      return `<div style="margin-bottom:14px"><b>${U.esc(cur)}</b>${barsH(entries, { money: true, currency: cur })}</div>`;
    }).join('') || `<div class="muted">${empty || 'Sin importes verificados.'}</div>`;
  }

  /* ---- micro-gráficos ---- */
  function barsH(rows, opts) {
    opts = opts || {};
    const max = Math.max(1, ...rows.map(r => r.val));
    return `<div class="ins-bars">${rows.map(r => `
      <div class="ins-bar-row ${r.onclick ? 'clickable' : ''}" ${r.onclick ? `onclick="${r.onclick}"` : ''}>
        <div class="ins-bar-lbl">${r.label}</div>
        <div class="ins-bar-track"><i style="width:${Math.max(2, r.val / max * 100)}%;background:${r.color || 'var(--red)'}"></i></div>
        <div class="ins-bar-val">${opts.money ? (opts.currency ? U.moneyShort(r.val, opts.currency) : M(r.val)) : (opts.fmt ? opts.fmt(r.val) : r.val)}</div>
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
      const k = kpiStore[+el.dataset.kpi]; if (k && k.detail) inInsightsScope(() => insDrawer(k.detail.title, k.detail.sub, typeof k.detail.html === 'function' ? k.detail.html() : k.detail.html));
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
    const production = vig.map(p => ({ row: p, monto: financeNumber(p.primaNeta != null ? p.primaNeta : p.prima), moneda: String(p.moneda || p.divisa || 'SIN_MONEDA').toUpperCase() }));
    const commissions = comisiones().map(c => {
      const policy = S().get('polizas', c.polizaId), own = String(c.moneda || '').toUpperCase(), parent = String(policy && (policy.moneda || policy.divisa) || '').toUpperCase();
      return { row: c, monto: financeNumber(c.monto), moneda: own && parent && own !== parent ? 'SIN_MONEDA' : parent || own || 'SIN_MONEDA' };
    });
    const financial = financialSnapshot(), ready = financial.readiness === 'ready';
    const { confirmed: pagados, pending: pend, overdue: venc } = financial;
    const debt = venc.concat(pend), rates = financeRateRows(financial);
    const waiting = financePending(financial.readiness);
    const nuevas = vig.filter(esNueva), renov = vig.filter(p => !esNueva(p));
    return insKpis([
      { label: 'Prima neta vigente', val: financeValue(production), color: 'var(--red)', foot: vig.length + ' pólizas activas · moneda original', detail: { title: 'Pólizas vigentes', sub: vig.length + ' pólizas · importes sin conversión', html: () => tablaPolizas(vig) } },
      { label: 'Recaudado', val: ready ? financeValue(pagados) : '—', color: 'var(--ok)', foot: ready ? pagados.length + ' pagos confirmados' : waiting, detail: ready ? { title: 'Cobros confirmados', sub: 'Pagos realizados; no obligaciones esperadas', html: () => { const s = financialSnapshot(); return s.readiness === 'ready' ? financialRowsTable(s.confirmed) : financePending(s.readiness); } } : null },
      { label: 'Por cobrar', val: ready ? financeValue(debt) : '—', color: 'var(--warn)', foot: ready ? debt.length + ' obligaciones · ' + venc.length + ' vencidas' : waiting, detail: ready ? { title: 'Cartera por cobrar', sub: 'Cartera Primas · pendiente y vencida', html: () => { const s = financialSnapshot(); return s.readiness === 'ready' ? financialRowsTable(s.overdue.concat(s.pending)) : financePending(s.readiness); } } : null },
      { label: 'Nuevas vs renovadas', val: nuevas.length + ' / ' + renov.length, color: 'var(--info)', foot: 'pólizas vigentes', detail: { title: 'Producción por tipo', sub: 'Nuevas ' + nuevas.length + ' · Renovadas ' + renov.length, html: () => tablaPolizas(vig.slice().sort((a, b) => esNueva(b) - esNueva(a))) } }
    ]) + (ready ? financeWarning(debt.concat(pagados)) : `<div class="cfg-note" data-insights-finance-readiness="${financial.readiness}">${waiting}</div>`) + `
    <div class="ins-grid-2">
      ${card('Prima neta vigente por ramo', financeBars(production, r => r.row.ramo), 'por moneda de origen')}
      ${card('Estado de la cartera', ready ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Moneda</th><th>Confirmado</th><th>Pendiente</th><th>Vencido</th><th>Recaudo</th></tr></thead><tbody>${rates.map(r => `<tr><td>${U.esc(r.moneda)}</td><td>${U.money(r.confirmed, r.moneda)}</td><td>${U.money(r.pending, r.moneda)}</td><td>${U.money(r.overdue, r.moneda)}</td><td>${r.rate == null ? 'Por validar' : r.rate + '%'}</td></tr>`).join('') || '<tr><td colspan="5">Sin registros.</td></tr>'}</tbody></table></div>` : waiting, 'confirmado / (confirmado + cartera abierta); no mezcla monedas')}
    </div>
    <div class="ins-grid-2">
      ${card('Top aseguradoras por prima neta', financeBars(production, r => (q.aseguradora(r.row.aseguradoraId) || {}).nombre || r.row.aseguradoraId), 'por moneda de origen')}
      ${card('Comisión generada', `<div style="text-align:center;padding:8px 0"><div style="font-family:var(--f-display);font-weight:800;font-size:26px">${financeValue(commissions, true)}</div><div class="muted">devengada en la cartera · ${clientes().length} clientes</div></div>` + financeBars(commissions, r => (q.aseguradora(r.row.aseguradoraId) || {}).nombre || r.row.aseguradoraId))}
    </div>`;
  }

  function topAgg(items, keyFn, valFn, labelFn, n) {
    const m = aggBy(items, keyFn, valFn);
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n || 8).map((e, i) => ({ label: labelFn(e[0]), val: e[1], color: palette[i % palette.length] }));
  }

  /* ---- METAS: producción nueva vs renovada con metas separadas ---- */
  function vMetas() {
    const mesKey = YEAR + '-' + String(mesSel + 1).padStart(2, '0');
    const country=String(Orbit.pais||'').toUpperCase();
    if(!['GT','CO'].includes(country)) return '<div class="cfg-note" data-insights-goal-country-required="1">Selecciona Guatemala o Colombia para consultar el cumplimiento de metas sin mezclar monedas.</div>';
    const users=S().all('asesores')||[];
    const st=S()._productStatus&&S()._productStatus()||{};
    const confirmed=['asesores','metas','polizas'].every(c=>(st.serverConfirmedCollections||[]).includes(c));
    const relevant=users.filter(a=>a&&!a.inactivo&&a.activo!==false&&a.estado!=='inactivo'&&([].concat(a.paises||a.pais||[])).includes(country)&&([].concat(a.roles||a.rol||[])).some(role=>['Asesor','Comercial'].includes(role)));
    const pending=relevant.some(a=>!['interno','freelance'].includes(a.tipoVinculacion));
    const eligible=relevant.filter(a=>(!asesorSel||a.id===asesorSel)&&(a.tipoVinculacion==='interno'||(a.tipoVinculacion==='freelance'&&a.participaMetas===true)));
    const eligibleIds=new Set(eligible.map(a=>a.id));
    const ready=confirmed&&!pending;
    const vig = vigentes().filter(p=>String(p.vigenciaInicio||'').slice(0,7)===mesKey&&eligibleIds.has(p.asesorId));
    const nuevas = vig.filter(esNueva), renov = vig.filter(p => !esNueva(p));
    const netaNueva = nuevas.reduce((s, p) => s + netaDe(p), 0);
    const netaRenov = renov.reduce((s, p) => s + netaDe(p), 0);
    // metas (autoadministrables) — lee la colección 'metas' del mes seleccionado (empresa); fallback al split por asesor
    const metasCol = (S().all('metas') || []).filter(mm => (mm.mes || '') === mesKey && mm.pais===country && !mm.asesorId);
    const gMeta = (tipo) => { const r = metasCol.find(mm => mm.tipo === tipo); return r && r.valor ? +r.valor : null; };
    const explicitAdvisorGoal=tipo=>{
      const rows=S().all('metas')||[];
      if(!eligible.length)return null;
      const amounts=eligible.map(a=>rows.find(m=>String(m.asesorId||'')===String(a.id)&&String(m.mes||'')===mesKey&&m.pais===country&&m.tipo===tipo));
      return amounts.every(Boolean)&&amounts.every(m=>Number.isFinite(Number(m.valor))&&Number(m.valor)>=0)
        ?amounts.reduce((sum,m)=>sum+Number(m.valor),0):null;
    };
    const metaNueva=!asesorSel&&gMeta('nueva')!=null?gMeta('nueva'):explicitAdvisorGoal('nueva');
    const metaRenov=!asesorSel&&gMeta('renovada')!=null?gMeta('renovada'):explicitAdvisorGoal('renovada');
    const metaAuto=metasCol.length>0;
    const pctN=ready&&metaNueva>0?Math.round(netaNueva/metaNueva*100):null,pctR=ready&&metaRenov>0?Math.round(netaRenov/metaRenov*100):null;
    // series mensuales nueva/renov para acumulado y mes seleccionado
    const sN = serieAnual(YEAR, 'nueva').arr, sR = serieAnual(YEAR, 'renov').arr;
    const mesN = sN[mesSel] || 0, mesR = sR[mesSel] || 0, acN = acumHasta(sN, mesSel), acR = acumHasta(sR, mesSel);
    const metaBar = (label, val, meta, pct, color) => `
      <div class="ins-meta-block">
        <div class="ins-meta-top"><b>${label}</b><span class="mono">${MM(val)} <span class="muted">/ ${meta==null?'Meta pendiente':MM(meta)}</span></span></div>
        <div class="ins-meta-bar big"><i style="width:${pct==null?0:Math.min(100,pct)}%;background:${pct != null&&pct >= 100 ? 'var(--ok)' : pct != null&&pct >= 70 ? 'var(--warn)' : color}"></i><span>${pct==null?'—':pct+'%'}</span></div>
      </div>`;
    // nuevas vs renovadas por ramo (comparación real)
    const ramos = [...new Set(vig.map(p => p.ramo))];
    const nByR = aggBy(nuevas, p => p.ramo, p => netaDe(p)), rByR = aggBy(renov, p => p.ramo, p => netaDe(p));
    const ramoOrd = ramos.map(r => ({ r, t: (nByR[r] || 0) + (rByR[r] || 0) })).sort((a, b) => b.t - a.t).slice(0, 8).map(x => x.r);
    return insKpis([
      { label: 'PN NUEVA · ' + MESES[mesSel], val: M(mesN), color: 'var(--ok)', foot: 'acum. ' + M(acN), footTone: 'up', detail: { title: 'Pólizas nuevas (vigentes)', sub: nuevas.length + ' pólizas · ' + MM(netaNueva), html: () => tablaPolizas(nuevas.slice().sort((a, b) => netaDe(b) - netaDe(a))) } },
      { label: 'PN RENOVADA · ' + MESES[mesSel], val: M(mesR), color: 'var(--info)', foot: 'acum. ' + M(acR), detail: { title: 'Pólizas renovadas (vigentes)', sub: renov.length + ' pólizas · ' + MM(netaRenov), html: () => tablaPolizas(renov.slice().sort((a, b) => netaDe(b) - netaDe(a))) } },
      { label: 'Cumplimiento nuevas', val: pctN==null?'—':pctN+'%', color: 'var(--red)', foot: pctN==null?'Clasificación o meta por validar':'mes vs meta', footTone: pctN==null?'neutral':pctN>=100?'up':'down' },
      { label: 'Cumplimiento renov.', val: pctR==null?'—':pctR+'%', color: 'var(--warn)', foot: pctR==null?'Clasificación o meta por validar':'mes vs meta', footTone: pctR==null?'neutral':pctR>=100?'up':'down' }
    ]) + card('Avance de metas (acumulado del año · prima neta)', `<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn primary sm" onclick="Orbit.modules.insights.sugerirMeta()">✨ Sugerir metas del próximo mes</button></div>` + metaBar('Producción NUEVA', netaNueva, metaNueva, pctN, 'var(--red)') + metaBar('Producción RENOVADA', netaRenov, metaRenov, pctR, 'var(--red)'), (ready?(metaAuto?'Metas institucionales explícitas por país':'Metas individuales explícitas · sin reparto sintético'):'Porcentaje pendiente hasta confirmar clasificaciones y lectura de servidor') + ' · se asignan en Equipo y permisos / Configuración') +
      card('Producción mensual ' + YEAR + ' · nuevas vs renovadas', colsDual(MESES, sN, sR, 'Nuevas', 'Renovadas'), 'prima neta por mes · clic en Mes para acumular') +
      `<div class="ins-grid-2">
      ${card('Meta por asesor (prima neta)', `<table class="tbl"><thead><tr><th>Asesor</th><th>Avance</th><th class="num">Neta</th><th class="num">Meta</th></tr></thead><tbody>${asesorMetaRows()}</tbody></table>`)}
      ${card('Nuevas vs renovadas por ramo', colsDual(ramoOrd, ramoOrd.map(r => nByR[r] || 0), ramoOrd.map(r => rByR[r] || 0), 'Nuevas', 'Renovadas'), 'prima neta por ramo')}
    </div>`;
  }
  function asesorMetaRows() {
    const country=String(Orbit.pais||'').toUpperCase(),mk=YEAR+'-'+String(mesSel+1).padStart(2,'0');
    const st=S()._productStatus&&S()._productStatus()||{};
    const ready=['asesores','metas','polizas'].every(c=>(st.serverConfirmedCollections||[]).includes(c))
      &&(S().all('asesores')||[]).filter(a=>a&&!a.inactivo&&a.activo!==false&&([].concat(a.paises||a.pais||[])).includes(country)&&([].concat(a.roles||a.rol||[])).some(role=>['Asesor','Comercial'].includes(role))).every(a=>['interno','freelance'].includes(a.tipoVinculacion));
    return S().all('asesores').filter(a=>([].concat(a.paises||a.pais||[])).includes(country)&&([].concat(a.roles||a.rol||[])).some(role=>['Asesor','Comercial'].includes(role))).map(a => {
      const pol = vigentes().filter(p => p.asesorId === a.id&&String(p.vigenciaInicio||'').slice(0,7)===mk);
      const neta = pol.reduce((s, p) => s + netaDe(p), 0);
      const participa=a.tipoVinculacion==='interno'||(a.tipoVinculacion==='freelance'&&a.participaMetas===true);
      const metas=(S().all('metas')||[]).filter(m=>m.asesorId===a.id&&m.pais===country&&m.mes===mk&&['nueva','renovada'].includes(m.tipo));
      const goal=metas.length===2?metas.reduce((sum,m)=>sum+Number(m.valor||0),0):null;
      const pct=ready&&participa&&goal>0?Math.min(140,Math.round(neta/goal*100)):null;
      return `<tr><td style="min-width:150px"><span style="display:flex;align-items:center;gap:8px">${U.avatar(a.nombre, a.color, 'sm')}${U.esc(a.nombre)}</span></td>
        <td style="width:40%"><div class="ins-meta-bar"><i style="width:${pct==null?0:Math.min(100,pct)}%;background:${pct != null&&pct >= 100 ? 'var(--ok)' : pct != null&&pct >= 70 ? 'var(--warn)' : 'var(--red)'}"></i><span>${pct==null?(a.tipoVinculacion==='sin_clasificar'||!a.tipoVinculacion?'Sin clasificar':!participa?'No participa':'—'):pct+'%'}</span></div></td>
        <td class="num"><b>${M(neta)}</b></td><td class="num muted">${goal==null?'—':M(goal)}</td></tr>`;
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
    const financial = financialSnapshot(), ready = financial.readiness === 'ready';
    const venc = financial.overdue, pend = financial.pending, debt = venc.concat(pend);
    const critical = venc.filter(row => row.daysOverdue > 90);
    const porConc = financial.confirmed.filter(row => row.row.conciliado !== true);
    const waiting = financePending(financial.readiness);
    const detail = (title, key) => ready ? { title, sub: 'Consulta de la fuente canónica; sin escrituras', html: () => {
      const snapshot = financialSnapshot();
      const rows = key === 'unreconciled' ? snapshot.confirmed.filter(row => row.row.conciliado !== true) : snapshot[key];
      return snapshot.readiness === 'ready' ? financialRowsTable(rows) : financePending(snapshot.readiness);
    } } : null;
    const currencies = Object.keys(financeSums(venc)).sort();
    const aging = currencies.map(cur => {
      const buckets = { '1–30': 0, '31–60': 0, '61–90': 0, '90+': 0 };
      venc.filter(row => row.moneda === cur && row.monto != null).forEach(row => {
        const key = row.daysOverdue <= 30 ? '1–30' : row.daysOverdue <= 60 ? '31–60' : row.daysOverdue <= 90 ? '61–90' : '90+';
        buckets[key] += row.monto;
      });
      return `<div style="margin-bottom:14px"><b>${U.esc(cur)}</b>${barsH(Object.entries(buckets).map(([key, value], i) => ({ label: key + ' días', val: value, color: ['#c9821b', '#e0701a', '#C5162E', '#7f1020'][i] })), { money: true, currency: cur })}</div>`;
    }).join('') || '<div class="muted">Sin importes vencidos verificados.</div>';
    return insKpis([
      { label: 'Cartera vencida', val: ready ? financeValue(venc) : '—', color: 'var(--red)', foot: ready ? venc.length + ' obligaciones' : waiting, detail: detail('Cartera vencida', 'overdue') },
      { label: 'Tramo crítico 90+', val: ready ? financeValue(critical) : '—', color: 'var(--danger)', foot: ready ? critical.length + ' obligaciones' : waiting },
      { label: 'Pendiente por cobrar', val: ready ? financeValue(pend) : '—', color: 'var(--warn)', foot: ready ? pend.length + ' obligaciones no vencidas' : waiting, detail: detail('Cartera pendiente', 'pending') },
      { label: 'Por conciliar', val: ready ? porConc.length : '—', color: 'var(--info)', foot: ready ? 'pagos confirmados no conciliados' : waiting, detail: detail('Pagos por conciliar', 'unreconciled') }
    ]) + (ready ? financeWarning(debt.concat(financial.confirmed)) : `<div class="cfg-note" data-insights-finance-readiness="${financial.readiness}">${waiting}</div>`) + `<div class="ins-grid-2">
      ${card('Aging de cartera vencida', ready ? aging : waiting, 'misma cartera y alcance que el detalle; moneda original')}
      ${card('Saldo por forma de pago', ready ? financeBars(debt, row => (S().get('polizas', row.polizaId) || {}).formaPago || 'Sin forma de pago') : waiting, 'pendiente + vencido, sin conversión')}
    </div>` + card('Cartera vencida prioritaria', ready ? financialRowsTable(venc.slice(0, 14)) : waiting, ready ? '14 primeras de ' + venc.length + '; KPI abre el detalle completo' : 'Confirmación del servidor pendiente');
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
    const nPol26 = s26.cnt.slice(0, mesSel + 1).reduce((s, v) => s + v, 0);
    const nPol25 = s25.cnt.slice(0, mesSel + 1).reduce((s, v) => s + v, 0);
    const mesAct = s26.arr[mesSel], mesAnt = mesSel > 0 ? s26.arr[mesSel - 1] : 0;
    const varMes = mesAnt > 0 ? Math.round((mesAct - mesAnt) / mesAnt * 100) : 0;
    const rows = compBucket(criterio, mesSel);
    const trend = (vp) => '<span style="color:' + (vp >= 0 ? 'var(--ok)' : 'var(--danger)') + ';font-weight:700">' + (vp >= 0 ? '▲' : '▼') + ' ' + Math.abs(vp) + '%</span>';
    const seg = '<div class="ins-seg">' + [['general','General'],['asesor','Por asesor'],['ramo','Por ramo'],['aseguradora','Por aseguradora']].map(o => '<button class="ins-seg-b ' + (criterio === o[0] ? 'active' : '') + '" data-crit="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>';

    // New vs Renovated breakdown
    const polizasDelAno = polizas().filter(p => p && p.vigenciaInicio && p.vigenciaInicio.startsWith(YEAR+''));
    const nuevas26 = polizasDelAno.filter(p => !p.contadorRenovaciones || p.contadorRenovaciones === 0);
    const renov26 = polizasDelAno.filter(p => p.contadorRenovaciones && p.contadorRenovaciones > 0);
    const primaNuevas = nuevas26.reduce((s, p) => s + (p.primaTotal || p.prima || 0), 0);
    const primaRenov = renov26.reduce((s, p) => s + (p.primaTotal || p.prima || 0), 0);

    // 12-month comparison table
    const tbl12 = '<table class="tbl" style="margin-top:12px"><thead><tr><th>Mes</th><th class="num">' + PREV + '</th><th class="num">' + YEAR + '</th><th class="num">Var %</th><th>Tendencia</th><th class="num">Pólizas</th></tr></thead><tbody>'
      + MESES.map((m, i) => {
        const v25 = s25.arr[i] || 0, v26 = s26.arr[i] || 0;
        const vp = v25 > 0 ? Math.round((v26 - v25) / v25 * 100) : (v26 > 0 ? 100 : 0);
        const np = s26.cnt[i] || 0;
        const esAct = i === mesSel;
        return '<tr class="clickable" style="' + (esAct ? 'background:rgba(197,22,46,.05)' : '') + '" data-drill-mes="' + i + '">'
          + '<td><b' + (esAct ? ' style="color:var(--red)"' : '') + '>' + m + (esAct ? ' ←' : '') + '</b></td>'
          + '<td class="num muted">' + M(v25) + '</td>'
          + '<td class="num"><b>' + M(v26) + '</b></td>'
          + '<td class="num">' + trend(vp) + '</td>'
          + '<td style="width:22%"><div class="ins-meta-bar"><i style="width:' + Math.min(100, Math.abs(vp)) + '%;background:' + (vp >= 0 ? 'var(--ok)' : 'var(--danger)') + '"></i></div></td>'
          + '<td class="num muted">' + np + '</td>'
          + '</tr>';
      }).join('') + '</tbody></table>';

    return insKpis([
      { label: 'PN acum. ' + YEAR, val: M(acum26), color: 'var(--red)', foot: 'Ene→' + MESES[mesSel], detail: { titulo: 'Prima acumulada ' + YEAR, rows: MESES.map((m,i) => [m, M(s26.arr[i]||0)]) } },
      { label: 'vs ' + PREV, val: (varPct >= 0 ? '+' : '') + varPct + '%', color: varPct >= 0 ? 'var(--ok)' : 'var(--danger)', foot: M(acum25) + ' en ' + PREV, footTone: varPct >= 0 ? 'up' : 'down', detail: { titulo: 'Comparativo ' + PREV + ' vs ' + YEAR, rows: MESES.map((m,i) => [m, M(s25.arr[i]||0), M(s26.arr[i]||0)]) } },
      { label: 'Nuevas ' + YEAR, val: nuevas26.length, color: 'var(--info)', foot: M(primaNuevas) + ' prima', detail: { titulo: 'Pólizas nuevas ' + YEAR, rows: nuevas26.slice(0,20).map(p => [p.numero||'—', p.ramo||'—', M(p.primaTotal||p.prima||0)]) } },
      { label: 'Renovadas ' + YEAR, val: renov26.length, color: 'var(--ok)', foot: M(primaRenov) + ' prima', footTone: 'up', detail: { titulo: 'Pólizas renovadas ' + YEAR, rows: renov26.slice(0,20).map(p => [p.numero||'—', p.ramo||'—', M(p.primaTotal||p.prima||0)]) } }
    ])
    + card('📅 Comparativo mensual ' + PREV + ' vs ' + YEAR + ' (clic en fila para ver el mes)', tbl12, 'todos los meses · haz clic en una fila para desglose')
    + card('🔀 Desglose acumulado Ene→' + MESES[mesSel], seg
      + '<table class="tbl" style="margin-top:12px"><thead><tr><th>' + (criterio === 'general' ? 'Total' : criterio[0].toUpperCase()+criterio.slice(1)) + '</th><th class="num">' + PREV + '</th><th class="num">' + YEAR + '</th><th class="num">Var %</th><th>Tendencia</th></tr></thead><tbody>'
      + (rows.map(r => '<tr class="clickable" data-drill-label="' + U.esc(r.label) + '" data-drill-crit="' + criterio + '">'
        + '<td><span style="display:flex;align-items:center;gap:7px"><span class="dot-s" style="background:' + r.color + '"></span>' + U.esc(r.label) + '</span></td>'
        + '<td class="num muted">' + M(r.v25) + '</td><td class="num"><b>' + M(r.v26) + '</b></td><td class="num">' + trend(r.var) + '</td>'
        + '<td style="width:24%"><div class="ins-meta-bar"><i style="width:' + Math.min(100,Math.abs(r.var)) + '%;background:' + (r.var >= 0 ? 'var(--ok)' : 'var(--danger)') + '"></i></div></td></tr>'
      ).join('') || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">Sin datos.</td></tr>')
      + '</tbody></table>', 'de lo general a lo particular · haz clic en una fila')
    + card('🆕 Nueva vs Renovada ' + YEAR, '<div class="grid2" style="margin-bottom:14px"><div class="ins-block"><div class="ins-block-t">🆕 Pólizas nuevas</div><div class="ins-block-v">' + nuevas26.length + '</div><div class="ins-block-sub">' + M(primaNuevas) + ' prima neta</div></div><div class="ins-block"><div class="ins-block-t">🔄 Pólizas renovadas</div><div class="ins-block-v">' + renov26.length + '</div><div class="ins-block-sub">' + M(primaRenov) + ' prima neta</div></div></div>'
      + colsDual(['Nuevas','Renovadas'], [primaNuevas], [primaRenov], 'Nueva', 'Renov.'), 'producción por tipo');
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
    const prox = q.renovacionesProximas(60).filter(p => paisOK(polizaPais(p)) && aseOK(p.asesorId));
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
    const financial = financialSnapshot(), ready = financial.readiness === 'ready';
    const rates = financeRateRows(financial);
    const lowCollection = rates.filter(r => r.rate != null && r.rate < 80);
    const incompleteCollection = rates.some(r => r.missing > 0) || financial.pending.concat(financial.overdue, financial.confirmed).some(r => r.moneda === 'SIN_MONEDA');
    const cancel = cancelaciones(); const pols = polizas().filter(p => p.estado !== 'Cancelada');
    const tasaCancel = pols.length ? Math.round(cancel.length / (pols.length + cancel.length) * 100) : 0;
    const venc30 = q.renovacionesProximas(30).filter(p => paisOK(polizaPais(p)) && aseOK(p.asesorId));
    const vencPrima = venc30.reduce((s, p) => s + netaDe(p), 0);
    // concentración por aseguradora + vendedor con menor índice de recaudo (hallazgos tipo Finanzas)
    const asgAgg = Object.entries(aggBy(vig, p => (q.aseguradora(p.aseguradoraId) || {}).nombre || '—', p => netaDe(p))).sort((a, b) => b[1] - a[1]);
    const asgTot = asgAgg.reduce((s, e) => s + e[1], 0) || 1;
    const asgTop = asgAgg[0]; const asgConc = asgTop ? Math.round(asgTop[1] / asgTot * 100) : 0;
    const alerts = [];
    if (varPct < 0) alerts.push({ t: 'danger', txt: `Caída del ${Math.abs(varPct)}% en prima neta vs mismo período ${PREV} — ${MM(netaAcum25 - netaAcum26)} menos.` });
    if (tasaCancel > 8) alerts.push({ t: 'warn', txt: `Tasa de cancelación del ${tasaCancel}% — por encima del umbral saludable (8%). Revisar causas por aseguradora.` });
    if (!ready) alerts.push({ t: 'warn', txt: financePending(financial.readiness) + ' No se calcula recaudo con lecturas incompletas.' });
    if (ready && !rates.length) alerts.push({ t: 'warn', txt: 'Sin base financiera verificada para calcular una tasa de recaudo.' });
    if (incompleteCollection) alerts.push({ t: 'warn', txt: 'Cartera con importes o monedas por validar; no se acredita una tasa de recaudo completa.' });
    rates.filter(r => r.rate != null && r.rate < 70).forEach(r => alerts.push({ t: 'danger', txt: `Recaudo ${U.esc(r.moneda)}: ${r.rate}% — gestionar cartera pendiente y vencida de esa moneda.` }));
    if (asgTop && asgConc >= 35) alerts.push({ t: 'warn', txt: `Concentración en ${asgTop[0]}: ${asgConc}% de la prima vigente — riesgo de dependencia, conviene diversificar aseguradoras.` });
    if (venc30.length) alerts.push({ t: 'warn', txt: `${venc30.length} pólizas vencen en los próximos 30 días (${M(vencPrima)} de prima neta expuesta).` });
    if (!alerts.length) alerts.push({ t: 'ok', txt: 'Indicadores dentro de rangos saludables para el período analizado.' });
    const recs = [];
    if (venc30.length) recs.push(`Activar campaña de renovación para las ${venc30.length} pólizas que vencen este mes.`);
    if (tasaCancel > 8) recs.push('Revisar causas de cancelación por aseguradora y activar retención proactiva.');
    lowCollection.forEach(r => recs.push(`Gestionar la cartera ${U.esc(r.moneda)} — ${U.money(r.pending + r.overdue, r.moneda)} de importe verificado por recuperar.`));
    const topAse = q.leaderboard()[0];
    if (topAse) recs.push(`Replicar prácticas del asesor líder (${topAse.asesor.nombre}) en el resto del equipo.`);
    if (asgTop && asgConc >= 35) recs.push(`Diversificar cartera: ${asgTop[0]} concentra ${asgConc}% — abrir producción con otras aseguradoras para reducir dependencia.`);
    const ramoParts = Object.entries(aggBy(vig, p => p.ramo, p => netaDe(p))).sort((a, b) => b[1] - a[1]).map((e, i) => ({ label: e[0], val: e[1], color: RAMO_COLORS[e[0]] || palette[i % palette.length] }));
    return insKpis([
      { label: 'Prima neta acum.', val: M(netaAcum26), color: 'var(--red)', foot: (varPct >= 0 ? '▲ ' : '▼ ') + Math.abs(varPct) + '% vs ' + PREV, footTone: varPct >= 0 ? 'up' : 'down' },
      { label: 'Tasa de recaudo', val: ready ? financeRateText(financial) : '—', color: !ready || incompleteCollection || lowCollection.length ? 'var(--warn)' : 'var(--ok)', foot: ready ? 'por moneda · confirmado / (confirmado + cartera)' : financePending(financial.readiness) },
      { label: 'Tasa de cancelación', val: tasaCancel + '%', color: tasaCancel > 8 ? 'var(--danger)' : 'var(--ok)', foot: cancel.length + ' pólizas' },
      { label: 'Vencen ≤30 d', val: venc30.length, color: 'var(--warn)', foot: M(vencPrima) + ' expuesto', detail: { title: 'Pólizas que vencen en 30 días', sub: venc30.length + ' pólizas', html: () => tablaPolizas(venc30) } }
    ]) + card('⚠ Alertas detectadas (' + alerts.filter(a => a.t !== 'ok').length + ')',
      `<div class="ins-alerts">${alerts.map(a => `<div class="ins-alert ${a.t}"><span class="dot-s" style="background:${a.t === 'danger' ? 'var(--danger)' : a.t === 'warn' ? 'var(--warn)' : 'var(--ok)'}"></span>${a.txt}</div>`).join('')}</div>`) +
      card('💡 Recomendaciones por área', `<ol class="ins-recs">${recs.map(r => `<li>${r}</li>`).join('')}</ol>`) +
      `<div class="ins-grid-2">${card('Composición de cartera (prima neta)', donut(ramoParts.map(p => ({ ...p, pct: Math.round(p.val / (ramoParts.reduce((s, x) => s + x.val, 0) || 1) * 100) })), ramoParts.length, 'ramos'))}${card('Producción mensual ' + YEAR, barsH(serieAnual(YEAR).arr.slice(0, MES + 1).map((v, i) => ({ label: MESES[i], val: v, color: 'var(--red)' })), { money: true }))}</div>`;
  }

  /* ---- META INTELIGENTE: sugiere metas del próximo mes por tendencia y las guarda ---- */
  function sugerirMeta() {
    const sTot = serieAnual(YEAR).arr, sN = serieAnual(YEAR, 'nueva').arr, sR = serieAnual(YEAR, 'renov').arr;
    const idxs = [mesSel, mesSel - 1, mesSel - 2].filter(i => i >= 0);
    const avg = arr => { const v = idxs.map(i => arr[i] || 0).filter(x => x > 0); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; };
    const baseTot = avg(sTot), baseN = avg(sN), baseR = avg(sR), growth = 1.10;
    const nextIdx = mesSel < 11 ? mesSel + 1 : 0, nextYear = mesSel < 11 ? YEAR : YEAR + 1;
    const nextKey = nextYear + '-' + String(nextIdx + 1).padStart(2, '0');
    const sug = { prima: Math.round(baseTot * growth), nueva: Math.round(baseN * growth), renovada: Math.round(baseR * growth) };
    sug.recaudo = Math.round(sug.prima * 0.85);
    let back = document.getElementById('ins-sug'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'ins-sug'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 97;
    const row = (l, k, v) => `<label class="ce-l">${l}<input id="sug-${k}" class="o-sel" type="number" value="${v}"></label>`;
    back.innerHTML = `<div class="card" style="width:min(500px,95vw);padding:0">
      <div style="padding:17px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.8)">Meta inteligente</div>
          <b style="font-family:var(--f-display);font-size:17px;color:#fff">✨ Metas sugeridas · ${MESES[nextIdx]} ${nextYear}</b>
          <div style="font-size:12px;margin-top:3px;color:rgba(255,255,255,.85)">Promedio de los últimos ${idxs.length} meses +10% de crecimiento. Ajusta y guarda.</div></div>
        <button class="imp-x" id="sug-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <div class="cgrid">${row('Prima neta total', 'prima', sug.prima)}${row('Recaudo (85%)', 'recaudo', sug.recaudo)}</div>
        <div class="cgrid">${row('Producción NUEVA', 'nueva', sug.nueva)}${row('Producción RENOVADA', 'renovada', sug.renovada)}</div>
        <div class="cfg-note">Se guardan en la colección de metas del mes (editables luego en Equipo). Base: prom. ${M(baseTot)} → objetivo ${M(sug.prima)}.</div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="sug-cancel">Cancelar</button><button class="btn primary" id="sug-ok">Guardar metas de ${MESES[nextIdx]}</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#sug-x').addEventListener('click', close);
    back.querySelector('#sug-cancel').addEventListener('click', close);
    back.querySelector('#sug-ok').addEventListener('click', () => {
      ['prima', 'recaudo', 'nueva', 'renovada'].forEach(tipo => {
        const val = +back.querySelector('#sug-' + tipo).value || 0;
        const ex = (S().all('metas') || []).find(mm => mm.mes === nextKey && mm.tipo === tipo && !mm.asesorId);
        if (ex) S().update('metas', ex.id, { valor: val });
        else S().insert('metas', { id: 'meta' + Date.now().toString().slice(-7) + tipo.slice(0, 2), mes: nextKey, tipo, valor: val });
      });
      close();
      const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = '✓ Metas de ' + MESES[nextIdx] + ' guardadas'; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
      if (nextYear === YEAR) mesSel = nextIdx;
      draw();
    });
  }

  const VISTAS = [['resumen', '📊 Resumen'], ['metas', '🎯 Metas'], ['produccion', '📈 Producción'], ['cartera', '💳 Cartera'], ['comparativo', '🔀 Comparativo'], ['topclientes', '🏆 Top clientes'], ['pipeline', '🎲 Pipeline'], ['renovaciones', '🔄 Renovaciones'], ['critico', '🔎 Análisis crítico']];
  const FN = { resumen: vResumen, metas: vMetas, produccion: vProduccion, cartera: vCartera, comparativo: vComparativo, topclientes: vTopClientes, pipeline: vPipeline, renovaciones: vRenovaciones, critico: vCritico };

  function draw() { return inInsightsScope(drawScoped); }
  function drawScoped() {
    const body = (FN[vista] || vResumen)();
    const paisLbl = (Orbit.PAISES.find(p => p.id === Orbit.pais) || {}).label || 'Todos los países';
    const showMes = ['metas', 'comparativo', 'critico'].includes(vista);
    const showTop = vista === 'topclientes';
    host.innerHTML = `<div class="page">
      ${K.bannerFor('insights', `<div class="ins-controls">
        <select id="ins-pais" class="ins-ctl" title="País">${Orbit.PAISES.map(p => `<option value="${p.id}" ${p.id === (Orbit.pais || 'TODOS') ? 'selected' : ''}>🌎 ${p.label}</option>`).join('')}</select>
        <select id="ins-ase" class="ins-ctl" title="Asesor"><option value="">👥 Todos los asesores</option>${S().all('asesores').map(a => `<option value="${a.id}" ${a.id === asesorSel ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select>
        ${showMes ? `<select id="ins-mes" class="ins-ctl" title="Mes (acumulado Ene→mes)">${MESES.map((m, i) => `<option value="${i}" ${i === mesSel ? 'selected' : ''}>${m} ${YEAR}</option>`).join('')}</select>` : ''}
        ${showTop ? `<select id="ins-top" class="ins-ctl" title="Ordenar por">${[['volumen', 'Por volumen de prima'], ['cantidad', 'Por cantidad de pólizas'], ['nuevos', 'Clientes nuevos'], ['antiguos', 'Clientes antiguos']].map(o => `<option value="${o[0]}" ${o[0] === topOrden ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>` : ''}
      </div>`)}
      <div class="ins-tabs">${VISTAS.map(v => `<button class="ins-tab ${vista === v[0] ? 'active' : ''}" data-v="${v[0]}">${v[1]}</button>`).join('')}</div>
      ${body}
      <div class="ins-note">${['resumen', 'cartera'].includes(vista) ? 'Importes por moneda de origen, sin conversión. Cartera Primas aporta obligaciones; Cobros aporta pagos confirmados.' : 'Cartera y tasas de recaudo usan moneda original. Las series históricas de producción conservan su metodología de comparación.'} Cada vista respeta el país y el acceso efectivo. KPIs <b>clicables</b> (⤢) abren el detalle. Datos del CRM en vivo.</div>
    </div>`;
    host.querySelectorAll('.ins-tab').forEach(b => b.addEventListener('click', () => { vista = b.dataset.v; draw(); }));
    const pSel = host.querySelector('#ins-pais'); if (pSel) pSel.addEventListener('change', () => { Orbit.pais = pSel.value; document.dispatchEvent(new CustomEvent('orbit:pais')); draw(); });
    const aSel = host.querySelector('#ins-ase'); if (aSel) aSel.addEventListener('change', () => { asesorSel = aSel.value; draw(); });
    const mSel = host.querySelector('#ins-mes'); if (mSel) mSel.addEventListener('change', () => { mesSel = +mSel.value; draw(); });
    const tSel = host.querySelector('#ins-top'); if (tSel) tSel.addEventListener('change', () => { topOrden = tSel.value; draw(); });
    host.querySelectorAll('[data-crit]').forEach(b => b.addEventListener('click', () => { criterio = b.dataset.crit; draw(); }));
    host.querySelectorAll('[data-drill-mes]').forEach(b => b.addEventListener('click', () => Orbit.modules.insights._drillMes(+b.dataset.drillMes)));
    host.querySelectorAll('[data-drill-label]').forEach(b => b.addEventListener('click', () => Orbit.modules.insights._drillRow(b.dataset.drillLabel, b.dataset.drillCrit)));
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
  return { render, cliente, sugerirMeta,
    _drillMes: function(i) {
      const s26 = serieAnual(YEAR); const s25 = serieAnual(PREV);
      const m = MESES[i]; const v26 = s26.arr[i]||0; const v25 = s25.arr[i]||0;
      const vp = v25>0 ? Math.round((v26-v25)/v25*100) : 0;
      const pols = polizas().filter(p => p && p.vigenciaInicio && p.vigenciaInicio.startsWith(YEAR+'-'+String(i+1).padStart(2,'0')));
      const rows = pols.slice(0,30).map(p => { const c=S().get('clientes',p.clienteId)||{}; return [p.numero||'—',U.esc(c.nombre||'—'),p.ramo||'—',U.money(p.primaTotal||p.prima||0,p.moneda||'GTQ')]; });
      openKpiDetail({ titulo: m+' '+YEAR+' — Detalle de prima neta', rows, headers: ['Póliza','Cliente','Ramo','Prima'] });
    },
    _drillRow: function(label, crit) {
      const pols = polizas().filter(p => {
        if (!p||!p.vigenciaInicio||!p.vigenciaInicio.startsWith(YEAR+'')) return false;
        if (crit==='asesor') { const a=S().get('asesores',p.asesorId)||{}; return (a.nombre||'—')===label; }
        if (crit==='ramo') return (p.ramo||'—')===label;
        if (crit==='aseguradora') { const a=S().all('aseguradoras').find(x=>x&&x.id===p.aseguradoraId)||{}; return (a.nombre||'—')===label; }
        return true;
      });
      const rows = pols.slice(0,30).map(p => { const c=S().get('clientes',p.clienteId)||{}; return [p.numero||'—',U.esc(c.nombre||'—'),p.ramo||'—',U.money(p.primaTotal||p.prima||0,p.moneda||'GTQ')]; });
      openKpiDetail({ titulo: label+' · '+YEAR+' ('+crit+')', rows, headers: ['Póliza','Cliente','Ramo','Prima'] });
    }
  };
})();
