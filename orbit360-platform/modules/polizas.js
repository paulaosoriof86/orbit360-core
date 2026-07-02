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
    { id: 'fest', type: 'select', ph: 'Estado', options: ['Vigente', 'Por renovar', 'Vencida', 'Cancelada'].map(v => ({ v, t: v })) }
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
        { label: 'Prima vigente', val: U.moneyShort(primaVig, 'GTQ'), color: 'var(--ok)', foot: 'anualizada', onclick: "Orbit.modules.polizas.filtrarEstado('Vigente')" },
        { label: 'Por renovar ≤45 d', val: all.filter(p => p.estado === 'Por renovar').length, color: 'var(--warn)', foot: 'requieren gestión', onclick: "Orbit.modules.polizas.filtrarEstado('Por renovar')" },
        { label: 'Canceladas', onclick: "Orbit.modules.polizas.filtrarEstado('Cancelada')", val: all.filter(p => p.estado === 'Cancelada').length, color: 'var(--danger)', foot: 'histórico' }
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
            <td style="text-align:right;color:var(--ink-3)">›</td></tr>`).join('') || emptyRow(9)}</tbody>
        </table></div>
      </div></div>`;

    K.wireFilters(FDEFS(), st, (id, live) => {
      if (live) { const a = document.activeElement, v = a.value; render(host); const i = document.getElementById('fq'); if (i) { i.focus(); i.value = v; i.setSelectionRange(v.length, v.length); } }
      else render(host);
    });
  }
  function emptyRow(n) { return `<tr><td colspan="${n}" class="muted" style="text-align:center;padding:30px">Sin resultados.</td></tr>`; }
  function filtrarEstado(e) { st.fest = st.fest === e ? '' : e; const host = document.getElementById('host'); if (host) render(host); }
  return { render, filtrarEstado };
})();
