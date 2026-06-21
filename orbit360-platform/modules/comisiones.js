/* ============================================================
   Orbit 360 · CRM · Comisiones (vista global)  — NÚCLEO
   Comisiones generadas, por asesor / aseguradora / periodo.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.comisiones = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let vista = 'asesor'; // asesor | aseguradora | periodo

  function render(host) {
    const all = S().all('comisiones');
    const tot = all.reduce((s, c) => s + q.norm(c.monto, c.moneda), 0);
    const liq = all.filter(c => c.estado === 'Liquidada').reduce((s, c) => s + q.norm(c.monto, c.moneda), 0);

    const campo = vista === 'asesor' ? 'asesorId' : vista === 'aseguradora' ? 'aseguradoraId' : 'periodo';
    const agg = q.comisionesPor(campo);
    const entries = Object.entries(agg).sort((a, b) => vista === 'periodo' ? b[0].localeCompare(a[0]) : b[1].total - a[1].total);
    const max = Math.max(...entries.map(e => e[1].total), 1);

    function labelOf(k) {
      if (vista === 'asesor') { const a = q.asesor(k); return a ? `<span style="display:flex;align-items:center;gap:8px">${U.avatar(a.nombre, a.color, 'sm')}${U.esc(a.nombre)}</span>` : k; }
      if (vista === 'aseguradora') { const a = q.aseguradora(k); return a ? `<span style="display:flex;align-items:center;gap:8px"><span class="dot-s" style="background:${a.color}"></span>${U.esc(a.nombre)}</span>` : k; }
      return `<span class="mono">${k}</span>`;
    }

    host.innerHTML = `<div class="page">
      ${K.bannerFor('comisiones', '')}
      ${K.kpis([
        { label: 'Comisión generada', val: U.moneyShort(tot, 'GTQ'), color: 'var(--red)', foot: 'total cartera' },
        { label: 'Liquidada', val: U.moneyShort(liq, 'GTQ'), color: 'var(--ok)', foot: 'pagada', footTone: 'up' },
        { label: 'Por liquidar', val: U.moneyShort(tot - liq, 'GTQ'), color: 'var(--warn)', foot: 'devengada' },
        { label: 'Registros', val: all.length, color: 'var(--info)', foot: 'cuotas con comisión' }
      ])}

      <div class="tabs" style="max-width:420px;margin-bottom:16px">
        ${[['asesor', 'Por asesor'], ['aseguradora', 'Por aseguradora'], ['periodo', 'Por periodo']].map(v =>
          `<div class="tab ${vista === v[0] ? 'active' : ''}" data-v="${v[0]}">${v[1]}</div>`).join('')}
      </div>

      <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
        <thead><tr><th>${vista === 'asesor' ? 'Asesor' : vista === 'aseguradora' ? 'Aseguradora' : 'Periodo'}</th><th></th><th class="num">Liquidada</th><th class="num">Por liquidar</th><th class="num">Total</th></tr></thead>
        <tbody>${entries.map(([k, v]) => `<tr>
          <td style="min-width:180px">${labelOf(k)}</td>
          <td style="width:38%"><div class="bar"><i style="width:${v.total / max * 100}%"></i></div></td>
          <td class="num" style="color:var(--ok)">${U.moneyShort(v.liquidada, 'GTQ')}</td>
          <td class="num" style="color:var(--warn)">${U.moneyShort(v.devengada, 'GTQ')}</td>
          <td class="num"><b>${U.money(v.total, 'GTQ')}</b></td>
        </tr>`).join('')}</tbody>
      </table></div></div></div>`;

    host.querySelectorAll('.tab[data-v]').forEach(el => el.addEventListener('click', () => { vista = el.dataset.v; render(host); }));
  }
  return { render };
})();
