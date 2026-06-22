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
            return `<tr class="clickable" onclick="Orbit.modules.cancelaciones.detalle('${c.id}')">
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

  /* ---- Detalle de cancelación (deriva días activa y comisión generada en vivo) ---- */
  function detalle(canId) {
    const c = S().get('cancelaciones', canId); if (!c) return;
    const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId);
    const asg = p ? q.aseguradora(p.aseguradoraId) : null, ase = q.asesor((p && p.asesorId) || (cli && cli.asesorId));
    const cur = (cli && cli.moneda) || 'GTQ';
    const ini = c.fechaInicio || (p && p.vigenciaInicio);
    const diasActiva = c.diasActiva || (ini ? Math.max(15, Math.round((new Date(c.fecha) - new Date(ini)) / 86400000)) : null);
    const meses = diasActiva ? (diasActiva / 30).toFixed(1) : '—';
    const comGen = c.comisionGenerada != null ? c.comisionGenerada : S().where('comisiones', x => x.polizaId === c.polizaId).reduce((s, x) => s + (+x.monto || 0), 0);
    const recOpts = ['Pendiente de contacto', 'Llamada de retención agendada', 'Oferta de mejora enviada', 'En negociación', 'Recuperada', 'No recuperable'];
    let back = document.getElementById('c360-edit'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'c360-edit'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(640px,95vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:18px 20px;background:linear-gradient(120deg,#7e1220,#b5253b);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.82)">Cancelación · ${U.fmtDate(c.fecha)}</div>
          <b style="font-family:var(--f-display);font-size:18px;color:#fff">${cli ? U.esc(cli.nombre) : '—'}</b>
          <div class="mono" style="font-size:12.5px;margin-top:3px;color:rgba(255,255,255,.85)">${p ? p.numero + ' · ' + p.ramo : '—'}</div></div>
        <button class="imp-x" id="cx-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button>
      </div>
      <div style="padding:18px 20px;display:grid;gap:16px">
        <div class="cx-kpis">
          <div class="cx-kpi"><span>Tiempo activa</span><b>${diasActiva || '—'} d</b><small>${meses} meses</small></div>
          <div class="cx-kpi"><span>Valor perdido</span><b style="color:var(--danger)">${U.money(c.valorPerdido, cur)}</b><small>prima anual</small></div>
          <div class="cx-kpi"><span>Comisión generada</span><b style="color:var(--info)">${U.money(comGen, cur)}</b><small>antes de baja</small></div>
        </div>
        <div class="vp-grid">
          <div class="vp-row"><span class="vp-l">Aseguradora</span><span class="vp-v">${asg ? U.esc(asg.nombre) : '—'}</span></div>
          <div class="vp-row"><span class="vp-l">Asesor</span><span class="vp-v">${ase ? U.esc(ase.nombre) : '—'}</span></div>
          <div class="vp-row"><span class="vp-l">Motivo</span><span class="vp-v"><span class="badge danger">${U.esc(c.motivo)}</span></span></div>
          <div class="vp-row"><span class="vp-l">Estado de póliza</span><span class="vp-v">${p ? p.estado : '—'}</span></div>
          <div class="vp-row"><span class="vp-l">Inicio de vigencia</span><span class="vp-v">${U.fmtDate(ini)}</span></div>
          <div class="vp-row"><span class="vp-l">Fecha de cancelación</span><span class="vp-v">${U.fmtDate(c.fecha)}</span></div>
        </div>
        <div class="vp-pay">
          <div class="vp-sec-t">♻ Acción de recuperación</div>
          <select id="cx-rec" class="o-sel">${recOpts.map(o => `<option ${o === (c.recuperacion || 'Pendiente de contacto') ? 'selected' : ''}>${o}</option>`).join('')}</select>
          <label class="ce-l" style="margin-top:10px">Nota de retención<textarea id="cx-nota" class="o-sel" style="min-height:54px;resize:vertical;padding:9px 11px" placeholder="Gestión de recuperación, oferta, resultado…">${U.esc(c.notaRecuperacion || '')}</textarea></label>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        ${p ? `<button class="btn ghost" onclick="Orbit.modules.cliente360.verPoliza('${c.polizaId}')">📑 Ver póliza</button>` : ''}
        <button class="btn primary" id="cx-save">Guardar</button>
      </div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#cx-x').addEventListener('click', close);
    back.querySelector('#cx-save').addEventListener('click', () => {
      const rec = back.querySelector('#cx-rec').value;
      S().update('cancelaciones', canId, { recuperacion: rec, recuperada: rec === 'Recuperada', notaRecuperacion: back.querySelector('#cx-nota').value.trim() });
      close();
    });
  }

  return { render, detalle };
})();
