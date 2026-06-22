/* ============================================================
   Orbit 360 · CRM · Cobros y cartera (vista global)  — NÚCLEO
   Aging de cartera, conciliación y gestión de cobros.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.cobros = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let st = { fq: '', fest: '', fase: '', sort: 'vence' };

  const FDEFS = () => [
    { id: 'fq', type: 'search', ph: 'Buscar cliente o póliza…' },
    { id: 'fest', type: 'select', ph: 'Estado', options: ['Pagado', 'Pendiente', 'Vencido', 'Anulado'].map(v => ({ v, t: v })) },
    { id: 'fase', type: 'select', ph: 'Asesor', options: K.asesorOptions() }
  ];

  function rows() {
    return S().all('cobros').filter(c => {
      if (c.estado === 'Anulado' && st.fest !== 'Anulado') return false;
      const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId);
      const txt = ((cli ? cli.nombre : '') + ' ' + (p ? p.numero : '')).toLowerCase();
      return (!st.fq || txt.includes(st.fq.toLowerCase())) &&
        (!st.fest || c.estado === st.fest) &&
        (!st.fase || c.asesorId === st.fase);
    }).sort((a, b) => a.vence.localeCompare(b.vence));
  }

  function render(host) {
    const cart = q.carteraGlobal();
    const aging = q.agingVencido();
    const agingTot = Object.values(aging).reduce((s, v) => s + v, 0) || 1;
    const porConciliar = S().where('cobros', c => c.estado === 'Pagado' && !c.conciliado).length;
    const r = rows();
    st.__count = r.length + ' cobros';
    const agingCols = { '1-30': '#c9821b', '31-60': '#d9602e', '61-90': '#b5253b', '90+': '#7e1220' };

    host.innerHTML = `<div class="page">
      ${K.bannerFor('cobros', `<button class="btn ghost" onclick="alert('Demo: registrar pago')" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2)">Registrar pago</button>`)}
      ${K.kpis([
        { label: 'Cartera al día', val: U.moneyShort(cart.alDia, 'GTQ'), color: 'var(--ok)', foot: 'cobros aplicados', footTone: 'up' },
        { label: 'Pendiente', val: U.moneyShort(cart.pend, 'GTQ'), color: 'var(--warn)', foot: 'por vencer' },
        { label: 'Vencido', val: U.moneyShort(cart.venc, 'GTQ'), color: 'var(--danger)', foot: 'en gestión', footTone: 'down' },
        { label: 'Por conciliar', val: porConciliar, color: 'var(--info)', foot: 'pagos sin aplicar' }
      ])}

      <div class="card pad" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b style="font-family:var(--f-display);font-size:15px">Antigüedad de cartera vencida (aging)</b>
          <span class="muted" style="font-size:12px">total ${U.money(agingTot, 'GTQ')}</span>
        </div>
        <div style="height:13px;border-radius:99px;overflow:hidden;display:flex;margin:14px 0 12px">
          ${Object.entries(aging).map(([k, v]) => `<div title="${k} días" style="width:${v / agingTot * 100}%;background:${agingCols[k]}"></div>`).join('')}
        </div>
        <div style="display:flex;gap:18px;flex-wrap:wrap">
          ${Object.entries(aging).map(([k, v]) => `<span style="display:flex;align-items:center;gap:7px;font-size:12.5px"><span class="dot-s" style="background:${agingCols[k]}"></span>${k} d · <b>${U.money(v, 'GTQ')}</b></span>`).join('')}
        </div>
      </div>

      <div class="card" style="overflow:hidden">
        ${K.filterBar(FDEFS(), st)}
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Cliente</th><th>Póliza</th><th>Cuota</th><th class="num">Monto</th><th>Vence</th><th>Pago</th><th>Estado</th><th title="Conciliado con Finanzas">Concil.</th></tr></thead>
          <tbody>${r.map(c => {
            const p = S().get('polizas', c.polizaId);
            return `<tr class="clickable" onclick="${p ? `Orbit.modules.cliente360.verPoliza('${c.polizaId}')` : `location.hash='#/cliente360?c=${c.clienteId}'`}">
              <td>${K.clienteCell(c.clienteId)}</td>
              <td><span class="mono" style="font-size:12px">${p ? p.numero : '—'}</span></td>
              <td>${c.cuota}</td>
              <td class="num">${U.money(c.monto, c.moneda)}</td>
              <td style="font-size:12.5px">${U.fmtDate(c.vence)}</td>
              <td style="font-size:12.5px">${c.fechaPago ? U.fmtDate(c.fechaPago) : '<span class="muted">—</span>'}</td>
              <td>${U.estadoBadge(c.estado)}</td>
              <td>${c.estado === 'Pagado' ? (c.conciliado ? '<span style="color:var(--ok)" title="Aplicado a póliza">✓</span>' : '<span style="color:var(--warn)" title="Por conciliar">◷</span>') : '<span class="muted">—</span>'}</td>
            </tr>`;
          }).join('') || `<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">Sin cobros.</td></tr>`}</tbody>
        </table></div>
      </div></div>`;

    K.wireFilters(FDEFS(), st, (id, live) => {
      if (live) { const a = document.activeElement, v = a.value; render(host); const i = document.getElementById('fq'); if (i) { i.focus(); i.value = v; i.setSelectionRange(v.length, v.length); } }
      else render(host);
    });
  }
  return { render };
})();
