/* ============================================================
   Orbit 360 · CRM · Comisiones (vista global)  — NÚCLEO
   Comisiones generadas, por asesor / aseguradora / periodo.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.comisiones = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let vista = 'asesor'; // asesor | aseguradora | periodo | tarifas

  function render(host) {
    if (vista === 'tarifas') return renderTarifas(host);
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

      <div class="tabs" style="max-width:560px;margin-bottom:16px">
        ${[['asesor', 'Por asesor'], ['aseguradora', 'Por aseguradora'], ['periodo', 'Por periodo'], ['tarifas', '⚙ Tarifas']].map(v =>
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

  /* ===== Tarifas de comisión (matriz editable por aseguradora × ramo + overrides por producto) ===== */
  function renderTarifas(host) {
    const asgs = S().all('aseguradoras');
    const asesores = S().all('asesores');
    host.innerHTML = `<div class="page">
      ${K.bannerFor('comisiones', `<button class="btn ghost" id="ct-import">⬇ Importar planilla</button>`)}
      <div class="card pad" style="margin-bottom:14px;border-left:3px solid var(--red)">
        <b style="font-family:var(--f-display);font-size:14px">¿Cómo se calculan las comisiones?</b>
        <div style="font-size:12.5px;color:var(--ink-2);margin-top:6px;line-height:1.55">
          La <b>comisión de la aseguradora</b> se calcula automáticamente como <b>prima neta × % por ramo</b> (con override por producto). La <b>comisión del vendedor</b> es la <b>participación %</b> que le asignamos sobre esa comisión; el resto queda como <b>comisión de la empresa</b>. Editá los porcentajes abajo, o <b>importá la planilla de comisiones</b> de la aseguradora para cargar automáticamente cuánto paga por producto.
        </div>
      </div>

      <div class="card pad" style="margin-bottom:16px">
        <b style="font-family:var(--f-display);font-size:15px">Comisión del vendedor por asesor</b>
        <div class="muted" style="font-size:12px;margin-top:3px">Cada asesor puede tener un modelo distinto: <b>% sobre la comisión</b> de la aseguradora, <b>% sobre prima neta</b>, o <b>monto fijo</b> por póliza.</div>
        <div class="ct-vend">${asesores.map(a => {
          const modo = a.comModo || 'comision';
          return `<div class="ct-vend-row" style="display:grid;grid-template-columns:1fr auto auto;gap:9px;align-items:center">
            <span style="display:flex;align-items:center;gap:8px;min-width:0">${U.avatar(a.nombre, a.color, 'sm')}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc(a.nombre)}</span></span>
            <select data-modo="${a.id}" class="o-sel" style="padding:5px 8px;font-size:12px">
              <option value="comision" ${modo === 'comision' ? 'selected' : ''}>% de la comisión</option>
              <option value="neta" ${modo === 'neta' ? 'selected' : ''}>% de prima neta</option>
              <option value="fijo" ${modo === 'fijo' ? 'selected' : ''}>Monto fijo</option>
            </select>
            <div class="ct-inp">${modo === 'fijo'
              ? `<input type="number" min="0" value="${a.comValor || 0}" data-vval="${a.id}" style="width:80px"><span>Q</span>`
              : `<input type="number" min="0" max="100" value="${a.shareCom != null ? a.shareCom : 50}" data-vend="${a.id}"><span>%</span>`}</div>
          </div>`;
        }).join('')}</div>
      </div>

      ${asgs.map(a => tarifaCard(a)).join('')}
    </div>`;

    host.querySelector('#ct-import').addEventListener('click', () => Orbit.importa.open('planillas-comision', { onDone: () => render(host) }));
    host.querySelectorAll('[data-vend]').forEach(inp => inp.addEventListener('change', () => Orbit.comeng.setVendShare(inp.dataset.vend, inp.value)));
    host.querySelectorAll('[data-vval]').forEach(inp => inp.addEventListener('change', () => Orbit.comeng.setVendValor(inp.dataset.vval, inp.value)));
    host.querySelectorAll('[data-modo]').forEach(sel => sel.addEventListener('change', () => { Orbit.comeng.setVendModo(sel.dataset.modo, sel.value); render(host); }));
    host.querySelectorAll('[data-ramo]').forEach(inp => inp.addEventListener('change', () => Orbit.comeng.setRamoPct(inp.dataset.asg, inp.dataset.ramo, inp.value)));
    host.querySelectorAll('[data-prod]').forEach(inp => inp.addEventListener('change', () => { Orbit.comeng.setProdPct(inp.dataset.asg, inp.dataset.prod, inp.value); }));
    host.querySelectorAll('.tab[data-v]').forEach(el => el.addEventListener('click', () => { vista = el.dataset.v; render(host); }));
  }

  function tarifaCard(a) {
    const ramos = a.ramos || [];
    const prods = a.comisionesProd || {};
    const prodKeys = Object.keys(prods);
    return `<div class="card pad ct-card">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:12px">
        <span class="dot-s" style="background:${a.color};width:12px;height:12px"></span>
        <b style="font-family:var(--f-display);font-size:15px">${U.esc(a.nombre)}</b>
        <span class="badge neutral" style="margin-left:auto">${a.pais}</span>
      </div>
      <div class="ct-tabs-h">% que paga por ramo (sobre prima neta)</div>
      <div class="ct-grid">${ramos.map(r => `
        <div class="ct-cell">
          <span>${U.esc(r)}</span>
          <div class="ct-inp"><input type="number" min="0" max="100" step="0.5" value="${(a.comisiones && a.comisiones[r] != null) ? a.comisiones[r] : (a.comisionDefault || 12)}" data-asg="${a.id}" data-ramo="${r}"><span>%</span></div>
        </div>`).join('')}</div>
      ${prodKeys.length ? `<div class="ct-tabs-h" style="margin-top:13px">Override por producto <span class="muted">(de la planilla)</span></div>
        <div class="ct-grid">${prodKeys.map(p => `
        <div class="ct-cell ct-cell-prod">
          <span>${U.esc(p)}</span>
          <div class="ct-inp"><input type="number" min="0" max="100" step="0.5" value="${prods[p]}" data-asg="${a.id}" data-prod="${U.esc(p)}"><span>%</span></div>
        </div>`).join('')}</div>` : ''}
    </div>`;
  }

  return { render };
})();
