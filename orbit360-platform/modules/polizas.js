/* ============================================================
   Orbit 360 · CRM · Pólizas (vista global)  — NÚCLEO
   Cartera completa de pólizas con filtros y desglose.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.polizas = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let st = { fq: '', framo: '', fasg: '', fase: '', fest: '', sort: 'vence' };

  const FDEFS = () => [
    { id: 'fq', type: 'search', ph: 'Buscar póliza, cliente, placa, vehículo…' },
    { id: 'framo', type: 'select', ph: 'Ramo', options: K.ramoOptions() },
    { id: 'fasg', type: 'select', ph: 'Aseguradora', options: K.aseguradoraOptions() },
    { id: 'fase', type: 'select', ph: 'Asesor', options: K.asesorOptions() },
    { id: 'fest', type: 'select', ph: 'Estado', options: ['Vigente', 'Por renovar', 'Vencida', 'Cancelada', 'Anulada', 'Rechazada', 'Requiere validación'].map(v => ({ v, t: v })) }
  ];

  function rows() {
    return S().all('polizas').filter(p => {
      const cli = S().get('clientes', p.clienteId);
      const veh = S().all('vehiculos').find(v => v.polizaId === p.id);
      const placa = (veh && veh.placa) || p.placa || '';
      const txt = (p.numero + ' ' + p.producto + ' ' + (cli ? cli.nombre : '') + ' ' + placa + ' ' + (veh ? (veh.marca + ' ' + veh.linea) : '')).toLowerCase();
      return (!st.fq || txt.includes(st.fq.toLowerCase())) &&
        (!st.framo || p.ramo === st.framo) &&
        (!st.fasg || p.aseguradoraId === st.fasg) &&
        (!st.fase || p.asesorId === st.fase) &&
        (!st.fest || p.estado === st.fest);
    }).sort((a, b) => st.sort === 'prima' ? ((b.prima || 0) - (a.prima || 0)) : String(a.vigenciaFin || '').localeCompare(String(b.vigenciaFin || '')));
  }

  function render(host) {
    const all = S().all('polizas');
    const vig = all.filter(p => p.estado === 'Vigente' || p.estado === 'Por renovar');
    const primaVig = vig.reduce((s, p) => s + q.norm(p.prima, p.moneda), 0);
    const r = rows();
    st.__count = r.length + ' de ' + all.length;

    host.innerHTML = `<div class="page">
      ${K.bannerFor('polizas', `<button class="btn primary" onclick="Orbit.modules.cliente360.nuevaPoliza()">+ Nueva póliza</button>`)}
      ${K.kpis([
        { label: 'Pólizas vigentes', val: vig.length + ' <small>/ ' + all.length + '</small>', color: 'var(--red)', foot: 'activas en cartera', onclick: "Orbit.modules.polizas.filtrarEstado('Vigente')" },
        { label: 'Prima vigente', val: U.moneyShort(primaVig, Orbit.q.monedaPais()), color: 'var(--ok)', foot: 'anualizada', onclick: "Orbit.modules.polizas.filtrarEstado('Vigente')" },
        { label: 'Por renovar ≤45 d', val: all.filter(p => p.estado === 'Por renovar').length, color: 'var(--warn)', foot: 'requieren gestión', onclick: "Orbit.modules.polizas.filtrarEstado('Por renovar')" },
        { label: 'Histórico / sin cartera', onclick: "Orbit.modules.polizas.filtrarEstado('Cancelada')", val: all.filter(p => ['Cancelada', 'Vencida', 'Anulada', 'Rechazada'].includes(p.estado)).length, color: 'var(--danger)', foot: 'cancel./venc./anul./rech.' }
      ])}
      <div class="card" style="overflow:hidden">
        ${K.filterBar(FDEFS(), st)}
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Póliza</th><th>Cliente</th><th>Ramo / Producto</th><th>Aseguradora</th><th>Asesor</th><th class="num">Prima</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
          <tbody>${r.map(p => `<tr class="clickable" onclick="Orbit.modules.cliente360.verPoliza('${p.id}')">
            <td><span class="mono" style="font-size:12.5px;font-weight:600">${p.numero}</span><div class="muted" style="font-size:11px">${p.forma}</div></td>
            <td>${K.clienteCell(p.clienteId)}</td>
            <td><b>${p.ramo}</b><div class="muted" style="font-size:12px">${p.producto}</div></td>
            <td>${K.aseguradoraCell(p.aseguradoraId)}</td>
            <td>${K.asesorCell(p.asesorId)}</td>
            <td class="num">${U.money(p.prima, p.moneda)}</td>
            <td style="font-size:12.5px">${U.fmtDate(p.vigenciaFin)}</td>
            <td>${U.estadoBadge(p.estado)}</td>
            <td style="text-align:right;color:var(--ink-3)"><button class="btn ghost sm" onclick="event.stopPropagation();Orbit.modules.polizas.verDesglose('${p.id}')" title="Desglose de prima y recibos">Desglose</button> ›</td></tr>`).join('') || emptyRow(9)}</tbody>
        </table></div>
      </div></div>`;

    K.wireFilters(FDEFS(), st, (id, live) => {
      if (live) { const a = document.activeElement, v = a.value; render(host); const i = document.getElementById('fq'); if (i) { i.focus(); i.value = v; i.setSelectionRange(v.length, v.length); } }
      else render(host);
    });
  }
  function emptyRow(n) { return `<tr><td colspan="${n}" class="muted" style="text-align:center;padding:30px">Sin resultados.</td></tr>`; }
  function filtrarEstado(e) { st.fest = st.fest === e ? '' : e; const host = document.getElementById('host'); if (host) render(host); }

  /* P0-03: desglose visible de prima (neta/gastos/IVA/total), frecuencia, forma de pago,
     recibos generados, fuente de importación y estado de validación. */
  function verDesglose(id) {
    const p = S().get('polizas', id); if (!p) return;
    const cli = S().get('clientes', p.clienteId) || {};
    const asg = q.aseguradora(p.aseguradoraId) || {};
    const cur = p.moneda || cli.moneda || Orbit.q.monedaPais();
    const M = (n) => (n == null || n === '') ? '—' : U.money(n, cur);
    const neta = p.primaNeta != null ? p.primaNeta : p.prima;
    const gastos = (p.gastosEmision || 0) + (p.gastosFinan || 0) + (p.otros || 0);
    const iva = p.iva != null ? p.iva : p.impuestos;
    const total = p.primaTotal != null ? p.primaTotal : (p.prima || 0);
    const recibos = S().all('cobros').filter(c => c.polizaId === id);
    const genera = (p.estado === 'Vigente' || p.estado === 'Por renovar');
    const req = p.requiereValidacion || !p.pais || !p.moneda || p.estado === 'Requiere validación';
    const fuente = p.sourceRef || p._origenHoja || (p.importado ? 'Importación' : 'Carga manual');
    const filaFuente = p._numeroFila ? (' · fila ' + p._numeroFila) : '';
    const row = (k, v, extra) => `<div class="pt-det" style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line)"><span class="muted">${k}</span><b style="${extra||''}">${v}</b></div>`;
    let back = document.getElementById('pol-desg'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'pol-desg'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 120;
    back.innerHTML = `<div class="card" style="width:min(560px,96vw);max-height:90vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <div><b style="font-family:var(--f-display);font-size:16px">Póliza ${U.esc(p.numero || '')}</b><div class="muted" style="font-size:12px">${U.esc(p.ramo || '')}${p.producto ? ' · ' + U.esc(p.producto) : ''} · ${U.esc(asg.nombre || '')}</div></div>
        <button class="imp-x" id="pd-x">✕</button></div>
      <div style="padding:16px 20px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${U.estadoBadge(p.estado)} ${req ? '<span class="badge warn">⚠ Requiere validación</span>' : '<span class="badge ok">✓ Validada</span>'} <span class="badge ${genera ? 'ok' : 'neutral'}">${genera ? 'Genera cartera' : 'Histórico (sin cartera)'}</span></div>
        <div style="font-family:var(--f-display);font-weight:800;font-size:13px;margin:4px 0 6px">💰 Desglose de prima (${cur})</div>
        ${row('Prima neta', M(neta))}
        ${row('Gastos (emisión + financieros + otros)', M(gastos))}
        ${row('IVA / impuestos', M(iva))}
        ${row('Prima total', M(total), 'color:var(--red)')}
        <div style="font-family:var(--f-display);font-weight:800;font-size:13px;margin:14px 0 6px">🗓 Condiciones</div>
        ${row('Frecuencia', U.esc(p.frecuencia || p.forma || '—'))}
        ${row('Forma de pago', U.esc(p.formaPago || p.conducto || '—'))}
        ${row('Vigencia', (p.vigenciaIni || p.vigenciaInicio || '—') + ' → ' + (p.vigenciaFin || '—'))}
        ${row('Suma asegurada', M(p.sumaAsegurada))}
        <div style="font-family:var(--f-display);font-weight:800;font-size:13px;margin:14px 0 6px">🧾 Recibos generados (${recibos.length})</div>
        ${recibos.length ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Cuota</th><th class="num">Monto</th><th>Vence</th><th>Estado</th></tr></thead><tbody>${recibos.slice(0,12).map(c => `<tr><td>${c.cuota || '—'}</td><td class="num">${U.money(c.montoTotal != null ? c.montoTotal : c.monto, c.moneda || cur)}</td><td>${U.fmtDate(c.vence)}</td><td><span class="badge ${/pag|concil/i.test(c.estado||'')?'ok':/venc/i.test(c.estado||'')?'danger':'warn'}">${U.esc(c.estado || 'Pendiente')}</span></td></tr>`).join('')}</tbody></table></div>` : `<div class="muted" style="font-size:12.5px">Sin recibos en cartera${genera ? '.' : ' (póliza histórica).'}</div>`}
        <div style="font-family:var(--f-display);font-weight:800;font-size:13px;margin:14px 0 6px">📄 Origen</div>
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
  return { render, filtrarEstado, verDesglose };
})();
