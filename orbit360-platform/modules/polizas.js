/* ============================================================
   Orbit 360 · CRM · Pólizas (vista global) — owner productivo
   Cartera completa con filtros, paginación e índices de lectura.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.polizas = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  const PAGE_SIZE = 100;
  const PC = id => (window.Orbit && Orbit.clientProjection && Orbit.clientProjection.get(id)) || S().get('clientes', id);
  let st = { fq: '', framo: '', fasg: '', fase: '', fest: '', sort: 'vence', page: 0 };

  const numberOrNull = v => {
    if (v == null || String(v).trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const policyPremiumTotal = p => numberOrNull(p && (p.primaTotal != null ? p.primaTotal : p.prima));
  const policyPremiumNet = p => numberOrNull(p && (p.primaNeta != null ? p.primaNeta : p.prima));
  const M = (v, cur) => { const n = numberOrNull(v); return n == null ? 'Pendiente de completar' : U.money(n, cur); };

  const FDEFS = () => [
    { id: 'fq', type: 'search', ph: 'Buscar póliza, cliente, placa, vehículo…' },
    { id: 'framo', type: 'select', ph: 'Ramo', options: K.ramoOptions() },
    { id: 'fasg', type: 'select', ph: 'Aseguradora', options: K.aseguradoraOptions() },
    { id: 'fase', type: 'select', ph: 'Asesor', options: K.asesorOptions() },
    { id: 'fest', type: 'select', ph: 'Estado', options: ['Vigente', 'Por renovar', 'Vencida', 'Cancelada', 'Anulada', 'Rechazada', 'Requiere validación'].map(v => ({ v, t: v })) }
  ];

  function buildIndexes() {
    const clientsById = new Map();
    (S().all('clientes') || []).forEach(c => clientsById.set(c.id, (Orbit.clientProjection && Orbit.clientProjection.project) ? Orbit.clientProjection.project(c) : c));
    const vehiclesByPolicy = new Map();
    (S().all('vehiculos') || []).forEach(v => { if (v && v.polizaId && !vehiclesByPolicy.has(v.polizaId)) vehiclesByPolicy.set(v.polizaId, v); });
    return { clientsById, vehiclesByPolicy };
  }

  function rows(I) {
    return (S().all('polizas') || []).filter(p => {
      const cli = I.clientsById.get(p.clienteId) || null;
      const veh = I.vehiclesByPolicy.get(p.id) || null;
      const placa = (veh && (veh.placa || veh.placaNormalizada || veh.placaFuente)) || p.placa || '';
      const clienteTxt = cli ? [cli.nombre, cli.identificacion, cli.email, cli.telefono].filter(Boolean).join(' ') : '';
      const txt = [p.numero, p.producto, p.subramo, clienteTxt, placa, veh && veh.marca, veh && veh.linea].filter(Boolean).join(' ').toLowerCase();
      return (!st.fq || txt.includes(st.fq.toLowerCase())) &&
        (!st.framo || p.ramo === st.framo) &&
        (!st.fasg || p.aseguradoraId === st.fasg) &&
        (!st.fase || p.asesorId === st.fase) &&
        (!st.fest || p.estado === st.fest);
    }).sort((a, b) => st.sort === 'prima' ? ((policyPremiumTotal(b) || 0) - (policyPremiumTotal(a) || 0)) : String(a.vigenciaFin || '').localeCompare(String(b.vigenciaFin || '')));
  }

  function render(host) {
    const all = S().all('polizas') || [];
    const I = buildIndexes();
    const vig = all.filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar');
    const primaVig = vig.reduce((s, p) => s + q.norm((policyPremiumNet(p) || 0), p.moneda), 0);
    const r = rows(I);
    const pages = Math.max(1, Math.ceil(r.length / PAGE_SIZE));
    if (st.page >= pages) st.page = 0;
    const start = st.page * PAGE_SIZE;
    const shown = r.slice(start, start + PAGE_SIZE).slice(0, PAGE_SIZE);
    st.__count = r.length + ' de ' + all.length;

    host.innerHTML = `<div class="page">
      ${K.bannerFor('polizas', `<button class="btn primary" onclick="Orbit.modules.cliente360.nuevaPoliza()">+ Nueva póliza</button>`)}
      ${K.kpis([
        { label: 'Pólizas vigentes', val: vig.length + ' <small>/ ' + all.length + '</small>', color: 'var(--red)', foot: 'activas en cartera', onclick: "Orbit.modules.polizas.filtrarEstado('Vigente')" },
        { label: 'Prima neta vigente', val: U.moneyShort(primaVig, Orbit.q.monedaPais()), color: 'var(--ok)', foot: 'anualizada · no producción', onclick: "Orbit.modules.polizas.filtrarEstado('Vigente')" },
        { label: 'Por renovar ≤45 d', val: all.filter(p => p.estado === 'Por renovar').length, color: 'var(--warn)', foot: 'requieren gestión', onclick: "Orbit.modules.polizas.filtrarEstado('Por renovar')" },
        { label: 'Histórico / sin cartera', onclick: "Orbit.modules.polizas.filtrarEstado('Cancelada')", val: all.filter(p => ['Cancelada', 'Vencida', 'Anulada', 'Rechazada'].includes(p.estado)).length, color: 'var(--danger)', foot: 'cancel./venc./anul./rech.' }
      ])}
      <div class="card" style="overflow:hidden">
        ${K.filterBar(FDEFS(), st)}
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Póliza</th><th>Cliente</th><th>Ramo / Producto</th><th>Aseguradora</th><th>Asesor</th><th class="num">Prima total</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
          <tbody>${shown.map(p => `<tr class="clickable" onclick="Orbit.modules.cliente360.verPoliza('${p.id}')">
            <td><span class="mono" style="font-size:12.5px;font-weight:600">${U.esc(p.numero || '')}</span><div class="muted" style="font-size:11px">${U.esc(p.formaPago || p.forma || p.frecuencia || '—')}</div></td>
            <td>${K.clienteCell(p.clienteId)}</td>
            <td><b>${U.esc(p.ramo || '—')}</b><div class="muted" style="font-size:12px">${U.esc(p.producto || p.subramo || '—')}</div></td>
            <td>${K.aseguradoraCell(p.aseguradoraId)}</td>
            <td>${K.asesorCell(p.asesorId)}</td>
            <td class="num">${M(policyPremiumTotal(p), p.moneda)}</td>
            <td style="font-size:12.5px">${U.fmtDate(p.vigenciaFin)}</td>
            <td>${U.estadoBadge(p.estado)}</td>
            <td style="text-align:right;color:var(--ink-3)"><button class="btn ghost sm" onclick="event.stopPropagation();Orbit.modules.polizas.verDesglose('${p.id}')" title="Desglose de prima y recibos">Desglose</button> ›</td></tr>`).join('') || emptyRow(9)}</tbody>
        </table></div>
        <div style="padding:10px 14px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <span class="muted" style="font-size:12px">Mostrando ${r.length ? start + 1 : 0}–${Math.min(start + PAGE_SIZE, r.length)} de ${r.length}. Usa filtros para acotar la cartera.</span>
          <div style="display:flex;gap:8px"><button class="btn ghost sm" ${st.page <= 0 ? 'disabled' : ''} onclick="Orbit.modules.polizas.pagina(-1)">Anterior</button><span class="badge neutral">${st.page + 1} / ${pages}</span><button class="btn ghost sm" ${st.page >= pages - 1 ? 'disabled' : ''} onclick="Orbit.modules.polizas.pagina(1)">Siguiente</button></div>
        </div>
      </div></div>`;

    K.wireFilters(FDEFS(), st, (id, live) => {
      st.page = 0;
      if (live) { const a = document.activeElement, v = a && a.value || ''; render(host); const i = document.getElementById('fq'); if (i) { i.focus(); i.value = v; i.setSelectionRange(v.length, v.length); } }
      else render(host);
    });
  }
  function emptyRow(n) { return `<tr><td colspan="${n}" class="muted" style="text-align:center;padding:30px">Sin resultados.</td></tr>`; }
  function filtrarEstado(e) { st.fest = st.fest === e ? '' : e; st.page = 0; const host = document.getElementById('host'); if (host) render(host); }
  function pagina(delta) { st.page = Math.max(0, st.page + delta); const host = document.getElementById('host'); if (host) render(host); }

  function receiptBreakdown(id) {
    const receipts = (S().all('recibosEsperados') || []).filter(r => r.polizaId === id);
    const sum = key => {
      const vals = receipts.map(r => numberOrNull(r[key])).filter(v => v != null);
      return vals.length ? vals.reduce((a,b)=>a+b,0) : null;
    };
    return { receipts, net:sum('primaNeta'), expedition:sum('gastosExpedicion'), finance:sum('gastosFinanciamiento'), sourceAdjustment:sum('descuento'), iva:sum('impuestosIVA'), total:sum('primaTotal') };
  }

  function verDesglose(id) {
    const p = S().get('polizas', id); if (!p) return;
    const cli = PC(p.clienteId) || {};
    const asg = q.aseguradora(p.aseguradoraId) || {};
    const cur = p.moneda || cli.moneda || Orbit.q.monedaPais();
    const rb = receiptBreakdown(id);
    const neta = policyPremiumNet(p);
    const total = policyPremiumTotal(p);
    const exped = numberOrNull(p.gastosEmision != null ? p.gastosEmision : p.gastosExpedicion);
    const finan = numberOrNull(p.gastosFinan != null ? p.gastosFinan : p.gastosFinanciamiento);
    const iva = numberOrNull(p.ivaMonto != null ? p.ivaMonto : (p.iva != null ? p.iva : p.impuestosIVA));
    const sourceAdjustment = numberOrNull(p.descuento);
    const recibos = rb.receipts;
    const genera = (p.estado === 'Vigente' || p.estado === 'Por renovar');
    const req = p.requiereValidacion || !p.pais || !p.moneda || p.estado === 'Requiere validación' || neta == null || total == null;
    const fuente = p.sourceRef || p._origenHoja || (p.importado ? 'Importación' : 'Carga manual');
    const filaFuente = p._numeroFila ? (' · fila ' + p._numeroFila) : '';
    const row = (k, v, extra) => `<div class="pt-det" style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line)"><span class="muted">${k}</span><b style="${extra||''}">${v}</b></div>`;
    let back = document.getElementById('pol-desg'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'pol-desg'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 120;
    back.innerHTML = `<div class="card" style="width:min(620px,96vw);max-height:90vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <div><b style="font-family:var(--f-display);font-size:16px">Póliza ${U.esc(p.numero || '')}</b><div class="muted" style="font-size:12px">${U.esc(p.ramo || '')}${p.producto ? ' · ' + U.esc(p.producto) : ''} · ${U.esc(asg.nombre || '')}</div></div>
        <button class="imp-x" id="pd-x">✕</button></div>
      <div style="padding:16px 20px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${U.estadoBadge(p.estado)} ${req ? '<span class="badge warn">Información parcial / requiere validación</span>' : '<span class="badge ok">Datos principales validados</span>'} <span class="badge ${genera ? 'ok' : 'neutral'}">${genera ? 'Genera calendario' : 'Histórico'}</span></div>
        <div style="font-family:var(--f-display);font-weight:800;font-size:13px;margin:4px 0 6px">Desglose de prima (${cur})</div>
        ${row('Prima neta de póliza', M(neta,cur))}
        ${row('Gastos de expedición', M(exped != null ? exped : rb.expedition,cur))}
        ${row('Gastos financieros', M(finan != null ? finan : rb.finance,cur))}
        ${row('Descuento / ajuste (campo fuente)', M(sourceAdjustment != null ? sourceAdjustment : rb.sourceAdjustment,cur))}
        ${row('IVA / impuestos', M(iva != null ? iva : rb.iva,cur))}
        ${row('Prima total de póliza', M(total,cur), 'color:var(--red)')}
        ${recibos.length ? row('Total calendario de recibos', M(rb.total,cur)) : ''}
        <div class="muted" style="font-size:11.5px;margin-top:6px">Los componentes tomados del calendario son informativos y no se inventan cuando la fuente no los trae. Una diferencia entre póliza y calendario queda pendiente de conciliación de fuente.</div>
        <div style="font-family:var(--f-display);font-weight:800;font-size:13px;margin:14px 0 6px">Condiciones</div>
        ${row('Frecuencia', U.esc(p.frecuencia || p.forma || '—'))}
        ${row('Forma de pago', U.esc(p.formaPago || p.conductoPago || p.conducto || '—'))}
        ${row('Vigencia', (p.vigenciaIni || p.vigenciaInicio || '—') + ' → ' + (p.vigenciaFin || '—'))}
        ${row('Suma asegurada', M(p.sumaAsegurada,cur))}
        <div style="font-family:var(--f-display);font-weight:800;font-size:13px;margin:14px 0 6px">Recibos esperados (${recibos.length})</div>
        ${recibos.length ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Cuota</th><th class="num">Neta</th><th class="num">Total</th><th>Vence</th><th>Estado</th></tr></thead><tbody>${recibos.slice(0,24).map(c => `<tr class="clickable" onclick="document.getElementById('pol-desg').remove();Orbit.receiptsPortfolioProjectionV910&&Orbit.receiptsPortfolioProjectionV910.openReceiptDetail&&Orbit.receiptsPortfolioProjectionV910.openReceiptDetail('${c.id}','${p.clienteId}')"><td>${U.esc(c.serie || c.cuota || '—')}</td><td class="num">${M(c.primaNeta,c.moneda||cur)}</td><td class="num">${M(c.primaTotal != null ? c.primaTotal : c.montoTotal,c.moneda||cur)}</td><td>${U.fmtDate(c.fechaLimite || c.vence)}</td><td>${U.esc(c.estadoVisual || c.estadoOperativo || 'Pendiente')}</td></tr>`).join('')}</tbody></table></div>` : `<div class="muted" style="font-size:12.5px">${genera ? 'No hay calendario de recibos disponible para esta póliza.' : 'Histórico sin calendario de recibos disponible.'}</div>`}
        <div style="font-family:var(--f-display);font-weight:800;font-size:13px;margin:14px 0 6px">Origen</div>
        ${row('Fuente', U.esc(fuente) + filaFuente)}
      </div>
      <div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn ghost" id="pd-close">Cerrar</button>
        <button class="btn primary" onclick="document.getElementById('pol-desg').remove();Orbit.modules.cliente360.verPoliza('${p.id}')">Abrir en Cliente 360</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#pd-x').onclick = close; back.querySelector('#pd-close').onclick = close;
  }
  return { render, filtrarEstado, pagina, verDesglose, buildIndexes, PAGE_SIZE };
})();
