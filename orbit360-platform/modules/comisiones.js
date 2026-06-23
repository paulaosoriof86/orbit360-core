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
      ${K.bannerFor('comisiones', `<button class="btn ghost" onclick="location.hash='#/equipo'" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.2)">⚙ Tarifas y % (en Equipo)</button>`)}
      ${K.kpis([
        { label: 'Comisión generada', val: U.moneyShort(tot, 'GTQ'), color: 'var(--red)', foot: 'total cartera' },
        { label: 'Liquidada', val: U.moneyShort(liq, 'GTQ'), color: 'var(--ok)', foot: 'pagada', footTone: 'up' },
        { label: 'Por liquidar', val: U.moneyShort(tot - liq, 'GTQ'), color: 'var(--warn)', foot: 'devengada' },
        { label: 'Registros', val: all.length, color: 'var(--info)', foot: 'cuotas con comisión' }
      ])}

      <div class="tabs" style="max-width:440px;margin-bottom:16px">
        ${[['asesor', 'Por asesor'], ['aseguradora', 'Por aseguradora'], ['periodo', 'Por periodo']].map(v =>
          `<div class="tab ${vista === v[0] ? 'active' : ''}" data-v="${v[0]}">${v[1]}</div>`).join('')}
      </div>

      <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
        <thead><tr><th>${vista === 'asesor' ? 'Asesor' : vista === 'aseguradora' ? 'Aseguradora' : 'Periodo'}</th><th></th><th class="num">Liquidada</th><th class="num">Por liquidar</th><th class="num">Total</th><th></th></tr></thead>
        <tbody>${entries.map(([k, v]) => `<tr class="clickable" onclick="Orbit.modules.comisiones.detalle('${campo}','${k}')">
          <td style="min-width:180px">${labelOf(k)}</td>
          <td style="width:34%"><div class="bar"><i style="width:${v.total / max * 100}%"></i></div></td>
          <td class="num" style="color:var(--ok)">${U.moneyShort(v.liquidada, 'GTQ')}</td>
          <td class="num" style="color:var(--warn)">${U.moneyShort(v.devengada, 'GTQ')}</td>
          <td class="num"><b>${U.money(v.total, 'GTQ')}</b></td>
          <td style="text-align:right;color:var(--ink-3)">›</td>
        </tr>`).join('')}</tbody>
      </table></div></div>
      <div class="cfg-note" style="margin-top:12px">Clic en una fila para ver el <b>detalle de comisiones</b> (cuota por cuota). La configuración de <b>tarifas y % por asesor</b> se administra en <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/equipo'">Equipo y permisos</a>.</div>
    </div>`;

    host.querySelectorAll('.tab[data-v]').forEach(el => el.addEventListener('click', () => { vista = el.dataset.v; render(host); }));
  }

  /* ---- Detalle de comisiones de un grupo (asesor/aseguradora/periodo) ---- */
  function detalle(campo, key) {
    const regs = S().all('comisiones').filter(c => (campo === 'asesorId' ? c.asesorId : campo === 'aseguradoraId' ? c.aseguradoraId : c.periodo) === key)
      .sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''));
    let titulo = key;
    if (campo === 'asesorId') { const a = q.asesor(key); titulo = a ? a.nombre : key; }
    else if (campo === 'aseguradoraId') { const a = q.aseguradora(key); titulo = a ? a.nombre : key; }
    const tot = regs.reduce((s, c) => s + q.norm(c.monto, c.moneda), 0);
    const liq = regs.filter(c => c.estado === 'Liquidada').reduce((s, c) => s + q.norm(c.monto, c.moneda), 0);
    let back = document.getElementById('com-det'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'com-det'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    back.innerHTML = `<div class="card" style="width:min(720px,95vw);max-height:92vh;display:flex;flex-direction:column;padding:0">
      <div style="padding:17px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.8)">Detalle de comisiones</div>
          <b style="font-family:var(--f-display);font-size:18px;color:#fff">${U.esc(titulo)}</b>
          <div style="font-size:12.5px;margin-top:3px;color:rgba(255,255,255,.85)">${regs.length} registros · ${U.money(tot, 'GTQ')} total · ${U.money(liq, 'GTQ')} liquidada</div></div>
        <button class="imp-x" id="cd-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button>
      </div>
      <div style="overflow:auto;flex:1"><table class="tbl">
        <thead><tr><th>Periodo</th><th>Cliente</th><th>Póliza</th><th class="num">Base neta</th><th class="num">%</th><th class="num">Comisión</th><th>Estado</th></tr></thead>
        <tbody>${regs.map(c => { const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId); return `<tr class="clickable" onclick="${p ? `document.getElementById('com-det').remove();Orbit.modules.cliente360.verPoliza('${c.polizaId}')` : ''}">
          <td class="mono" style="font-size:11.5px">${c.periodo || '—'}</td>
          <td style="font-size:12.5px">${cli ? U.esc(cli.nombre) : '—'}</td>
          <td class="mono" style="font-size:11.5px">${p ? p.numero : '—'}</td>
          <td class="num">${U.money(c.base, c.moneda)}</td>
          <td class="num">${c.pct}%</td>
          <td class="num"><b>${U.money(c.monto, c.moneda)}</b></td>
          <td><span class="badge ${c.estado === 'Liquidada' ? 'ok' : 'warn'}">${c.estado}</span></td></tr>`; }).join('') || '<tr><td colspan="7" class="muted" style="text-align:center;padding:20px">Sin registros.</td></tr>'}</tbody>
      </table></div>
      <div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end"><button class="btn primary" id="cd-ok">Cerrar</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#cd-x').addEventListener('click', close);
    back.querySelector('#cd-ok').addEventListener('click', close);
  }

  return { render, detalle };
})();
