/* ============================================================
   Orbit 360 · Orbit Ops  — BETA (kanban operativo)
   Gestiones operativas del intermediario (NO prospectos — eso
   vive en Leads). Listas personalizables, tarjetas clickeables,
   enlace con Leads (una cotización puede nacer de un lead).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.ops = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  const COLS = ['Gestiones Admin', 'Cotizaciones', 'Inspecciones', 'Emisiones', 'Renovaciones / Modif.'];
  const COLOR = { 'Gestiones Admin': '#1f3a5f', 'Cotizaciones': '#C5162E', 'Inspecciones': '#c9821b', 'Emisiones': '#1f8a4c', 'Renovaciones / Modif.': '#6b4ea0' };

  function render(host) {
    const ges = S().all('gestiones');
    host.innerHTML = `<div class="page">
      ${K.bannerFor('ops', `<button class="btn primary" onclick="alert('Demo: nueva gestión operativa')">+ Nueva gestión</button>`)}
      <div class="cfg-note" style="margin-bottom:14px">🗂 Tablero operativo (kanban). Las <b>listas son personalizables</b> por el cliente. <b>No incluye prospectos</b> — esos viven en <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/leads'">Orbit Leads</a>, enlazado con Ops.</div>
      <div class="kanban">
        ${COLS.map(col => {
          const items = ges.filter(g => g.lista === col);
          return `<div class="kcol">
            <div class="kcol-h" style="border-top:3px solid ${COLOR[col]}">
              <b>${col}</b><span class="kcount">${items.length}</span>
            </div>
            <div class="kcol-body">
              ${items.map(g => card(g)).join('') || '<div class="kempty">Sin gestiones</div>'}
              <button class="kadd" onclick="alert('Demo: agregar a ${col}')">+ Agregar</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
    host.querySelectorAll('[data-ges]').forEach(el => el.addEventListener('click', () => {
      const g = S().get('gestiones', el.dataset.ges);
      if (g && g.clienteId) location.hash = '#/cliente360?c=' + g.clienteId;
    }));
  }

  function card(g) {
    const cli = S().get('clientes', g.clienteId), ase = q.asesor(g.asesorId), asg = q.aseguradora(g.aseguradoraId);
    const d = U.daysFromNow(g.vence);
    const pr = { Alta: 'danger', Media: 'warn', Baja: 'neutral' }[g.prioridad];
    return `<div class="kcard" data-ges="${g.id}">
      <div class="kcard-top"><span class="badge ${pr}">${g.prioridad}</span>${g.leadId ? '<span class="badge info" title="Originada en un lead">🔗 Lead</span>' : ''}</div>
      <div class="kcard-t">${U.esc(g.titulo)}</div>
      <div class="kcard-cli">${cli ? U.esc(cli.nombre) : '—'}</div>
      <div class="kcard-meta">
        <span style="display:flex;align-items:center;gap:5px"><span class="dot-s" style="background:${asg ? asg.color : '#999'}"></span>${asg ? U.esc(asg.nombre) : ''}</span>
      </div>
      <div class="kcard-foot">
        <span title="${U.esc(ase ? ase.nombre : '')}">${U.avatar(ase ? ase.nombre : '?', ase ? ase.color : '#999', 'sm')}</span>
        <span class="kchk">✓ ${g.checklist}/${g.checklistTotal}</span>
        <span class="kvence ${d < 0 ? 'over' : ''}">${d < 0 ? (-d) + 'd' : d + 'd'}</span>
      </div>
    </div>`;
  }
  return { render };
})();
