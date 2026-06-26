/* ============================================================
   Orbit 360 · CRM · Historial y actividades (vista global) — NÚCLEO
   Feed cronológico de todas las interacciones de la cartera.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.historial = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let st = { fq: '', ftipo: '', fase: '' };

  const TIPOS = { llamada: 'Llamada', whatsapp: 'WhatsApp', email: 'Correo', reunion: 'Reunión', nota: 'Nota', sistema: 'Sistema' };
  const FDEFS = () => [
    { id: 'fq', type: 'search', ph: 'Buscar en el historial…' },
    { id: 'ftipo', type: 'select', ph: 'Tipo', options: Object.entries(TIPOS).map(([v, t]) => ({ v, t })) },
    { id: 'fase', type: 'select', ph: 'Asesor', options: K.asesorOptions() }
  ];

  function rows() {
    return S().all('actividades').filter(a => {
      const cli = S().get('clientes', a.clienteId);
      const txt = (a.titulo + ' ' + a.detalle + ' ' + (cli ? cli.nombre : '')).toLowerCase();
      return (!st.fq || txt.includes(st.fq.toLowerCase())) &&
        (!st.ftipo || a.tipo === st.ftipo) &&
        (!st.fase || a.asesorId === st.fase);
    }).sort((a, b) => String(b.fecha||'').localeCompare(String(a.fecha||'')));
  }

  function render(host) {
    const all = S().all('actividades');
    const r = rows();
    st.__count = r.length + ' interacciones';
    // por tipo
    const porTipo = {};
    all.forEach(a => porTipo[a.tipo] = (porTipo[a.tipo] || 0) + 1);

    // agrupar por fecha
    const groups = {};
    r.forEach(a => { (groups[a.fecha] = groups[a.fecha] || []).push(a); });

    host.innerHTML = `<div class="page">
      ${K.bannerFor('historial', '')}
      ${K.kpis([
        { label: 'Interacciones', val: all.length, color: 'var(--red)', foot: 'registradas', onclick: "location.hash='#/historial'" },
        { label: 'Llamadas', val: porTipo.llamada || 0, color: 'var(--info)', foot: 'telefónicas', onclick: "location.hash='#/historial'" },
        { label: 'WhatsApp', val: porTipo.whatsapp || 0, color: 'var(--ok)', foot: 'mensajes', onclick: "location.hash='#/historial'" },
        { label: 'Reuniones', val: porTipo.reunion || 0, color: 'var(--warn)', foot: 'asesorías', onclick: "location.hash='#/historial'" }
      ])}
      <div class="card" style="overflow:hidden">
        ${K.filterBar(FDEFS(), st)}
        <div style="padding:18px 20px">
          ${Object.entries(groups).map(([fecha, items]) => `
            <div style="margin-bottom:18px">
              <div style="font-family:var(--f-mono);font-size:11px;letter-spacing:.06em;color:var(--ink-3);text-transform:uppercase;margin-bottom:10px">${U.fmtDate(fecha)} · ${U.ago(fecha)}</div>
              <div style="display:grid;gap:9px">
                ${items.map(a => {
                  const cli = S().get('clientes', a.clienteId), ase = q.asesor(a.asesorId);
                  return `<div class="clickable" onclick="Orbit.modules.historial.detalle('${a.id}')" style="display:flex;gap:12px;align-items:flex-start;padding:11px 13px;border:1px solid var(--line);border-radius:var(--r-sm);cursor:pointer;background:var(--card)">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--surface);border:1px solid var(--line);display:grid;place-items:center;flex-shrink:0">${a.icon}</div>
                    <div style="flex:1;min-width:0">
                      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
                        <b style="font-size:13.5px">${U.esc(a.titulo)}</b>
                        <span class="badge neutral" style="font-size:10.5px">${TIPOS[a.tipo] || a.tipo}</span>
                      </div>
                      <div class="muted" style="font-size:12.5px;margin-top:3px">${U.esc(a.detalle)}</div>
                      <div style="display:flex;align-items:center;gap:10px;margin-top:7px;flex-wrap:wrap">
                        <span style="display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:var(--ink-2)">🧑‍💼 ${U.esc(cli ? cli.nombre : 'Sin cliente')}</span>
                        <span style="display:flex;align-items:center;gap:5px"><span class="dot-s" style="background:${ase ? ase.color : '#999'}"></span><span class="muted" style="font-size:11px">${U.esc(ase ? ase.nombre : '')}</span></span>
                      </div>
                    </div>
                    <span style="color:var(--ink-3);align-self:center">›</span>
                  </div>`;
                }).join('')}
              </div>
            </div>`).join('') || `<div class="muted" style="text-align:center;padding:34px">Sin actividades para los filtros aplicados.</div>`}
        </div>
      </div></div>`;

    K.wireFilters(FDEFS(), st, (id, live) => {
      if (live) { const a = document.activeElement, v = a.value; render(host); const i = document.getElementById('fq'); if (i) { i.focus(); i.value = v; i.setSelectionRange(v.length, v.length); } }
      else render(host);
    });
  }
  /* ---- Detalle de la interacción (drawer) ---- */
  function detalle(actId) {
    const a = S().get('actividades', actId); if (!a) return;
    const cli = S().get('clientes', a.clienteId), ase = q.asesor(a.asesorId);
    let back = document.getElementById('hist-det'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'hist-det'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center'; back.style.zIndex = 96;
    back.innerHTML = `<div class="card" style="width:min(520px,94vw);padding:0">
      <div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:16px">${a.icon} ${U.esc(a.titulo)}</b><button class="imp-x" id="hd-x">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:13px">
        <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge neutral">${TIPOS[a.tipo] || a.tipo}</span><span class="badge info">${U.fmtDate(a.fecha)} · ${U.ago(a.fecha)}</span></div>
        <div class="vp-grid">
          <div class="vp-row"><span class="vp-l">Cliente</span><span class="vp-v">${U.esc(cli ? cli.nombre : 'Sin cliente')}</span></div>
          <div class="vp-row"><span class="vp-l">Responsable</span><span class="vp-v">${U.esc(ase ? ase.nombre : '—')}</span></div>
        </div>
        <div><div class="vp-l" style="margin-bottom:4px">Detalle</div><div style="font-size:13.5px;line-height:1.55">${U.esc(a.detalle || '—')}</div></div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">
        ${a.clienteId ? `<button class="btn ghost" onclick="document.getElementById('hist-det').remove();location.hash='#/cliente360?c=${a.clienteId}'">🧑‍💼 Ver expediente</button>` : ''}
        <button class="btn primary" id="hd-ok">Cerrar</button></div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#hd-x').addEventListener('click', close);
    back.querySelector('#hd-ok').addEventListener('click', close);
  }

  return { render, detalle };
})();
