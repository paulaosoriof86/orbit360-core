/* ============================================================
   Orbit 360 · CRM · Cancelaciones (vista global)  — NÚCLEO
   Pólizas dadas de baja: motivos, valor perdido, tendencia.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.cancelaciones = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let st = { fmot: '', fase: '' };

  const FDEFS = () => [
    { id: 'fmot', type: 'select', ph: 'Motivo', options: [...new Set(S().all('cancelaciones').map(c => c.motivo))].map(v => ({ v, t: v })) },
    { id: 'fase', type: 'select', ph: 'Asesor', options: K.asesorOptions() }
  ];

  function render(host) {
    const all = S().all('cancelaciones');
    // motivos
    const porMotivo = {};
    all.forEach(c => { porMotivo[c.motivo] = (porMotivo[c.motivo] || 0) + 1; });
    const motTot = all.length || 1;
    const perdido = all.reduce((s, c) => s + q.norm(c.valorPerdido, (S().get('clientes', c.clienteId) || {}).moneda || 'GTQ'), 0);
    const motCols = ['#7e1220', '#b5253b', '#c9821b', '#6b4ea0', '#1f3a5f'];

    const rows = all.filter(c => {
      const p = S().get('polizas', c.polizaId);
      return (!st.fmot || c.motivo === st.fmot) && (!st.fase || (p && p.asesorId === st.fase));
    }).sort((a, b) => b.fecha.localeCompare(a.fecha));
    st.__count = rows.length + ' de ' + all.length;

    host.innerHTML = `<div class="page">
      ${K.bannerFor('cancelaciones', '')}
      ${K.kpis([
        { label: 'Canceladas', val: all.length, color: 'var(--danger)', foot: 'histórico' },
        { label: 'Valor perdido', val: U.moneyShort(perdido, 'GTQ'), color: 'var(--danger)', foot: 'prima anual', footTone: 'down' },
        { label: 'Motivo principal', val: '<span style="font-size:16px">' + (Object.entries(porMotivo).sort((a, b) => b[1] - a[1])[0] || ['—'])[0] + '</span>', color: 'var(--warn)', foot: 'más frecuente' },
        { label: 'Tasa de fuga', val: Math.round(all.length / (S().all('polizas').length || 1) * 100) + '%', color: 'var(--info)', foot: 'sobre cartera total' }
      ])}

      <div class="card pad" style="margin-bottom:16px">
        <b style="font-family:var(--f-display);font-size:15px">Motivos de cancelación</b>
        <div style="margin-top:14px;display:grid;gap:10px">
          ${Object.entries(porMotivo).sort((a, b) => b[1] - a[1]).map(([m, n], i) => `
            <div style="display:flex;align-items:center;gap:12px">
              <span style="width:150px;font-size:13px;font-weight:600">${m}</span>
              <div class="bar" style="flex:1"><i style="width:${n / motTot * 100}%;background:${motCols[i % motCols.length]}"></i></div>
              <span class="mono" style="font-size:12px;width:60px;text-align:right">${n} · ${Math.round(n / motTot * 100)}%</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="card" style="overflow:hidden">
        ${K.filterBar(FDEFS(), st)}
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Fecha</th><th>Cliente</th><th>Póliza</th><th>Ramo</th><th>Motivo</th><th class="num">Valor perdido</th></tr></thead>
          <tbody>${rows.map(c => {
            const p = S().get('polizas', c.polizaId);
            return `<tr>
              <td style="font-size:12.5px">${U.fmtDate(c.fecha)}</td>
              <td>${K.clienteCell(c.clienteId)}</td>
              <td><span class="mono" style="font-size:12px">${p ? p.numero : '—'}</span></td>
              <td>${p ? p.ramo : '—'}</td>
              <td><span class="badge danger">${U.esc(c.motivo)}</span></td>
              <td class="num">${U.money(c.valorPerdido, (S().get('clientes', c.clienteId) || {}).moneda || 'GTQ')}</td>
            </tr>`;
          }).join('') || `<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">Sin cancelaciones.</td></tr>`}</tbody>
        </table></div>
      </div></div>`;

    K.wireFilters(FDEFS(), st, () => render(host));
  }
  return { render };
})();
