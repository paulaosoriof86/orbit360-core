/* ============================================================
   Orbit 360 · Orbit Ops — tablero operativo (kanban, vista equipo)
   Proyecta el ciclo comercial (Cotizaciones/Inspecciones/Emisiones)
   + gestiones administrativas. Sincronizado EN VIVO con Orbit Leads.
   El asesor NO ve este tablero (vista interna del equipo).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.ops = (function () {
  const U = Orbit.ui, K = Orbit.kit, C = () => Orbit.ciclo;
  let host, unsub;

  function render(h) {
    host = h;
    // multi-rol: el asesor no accede a Ops
    if (Orbit.session && Orbit.session.esAsesor && Orbit.session.esAsesor()) { restricted(); return; }
    draw();
    if (!unsub) {
      const re = () => { if (Orbit.route && Orbit.route.key === 'ops' && document.body.contains(host)) { if (Orbit.session && Orbit.session.esAsesor && Orbit.session.esAsesor()) restricted(); else draw(); } };
      const u1 = Orbit.store.on(re);
      const f = () => re();
      document.addEventListener('orbit:ciclo', f);
      document.addEventListener('orbit:pais', f);
      unsub = () => { u1(); document.removeEventListener('orbit:ciclo', f); document.removeEventListener('orbit:pais', f); };
    }
  }

  function restricted() {
    host.innerHTML = `<div class="page">${K.bannerFor('ops', '')}
      <div class="modstate"><div class="ms-ico">🔒</div>
        <h2>Tablero interno del equipo</h2>
        <p>Orbit Ops concentra la operación técnica del intermediario. Con el rol <b>Asesor</b> das seguimiento a tus gestiones desde <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/leads'">Orbit Leads</a>, que refleja en vivo las etapas operativas (cotización, inspección, emisión).</p>
        <button class="btn primary" style="margin-top:14px" onclick="location.hash='#/leads'">Ir a Orbit Leads →</button>
      </div></div>`;
  }

  function draw() {
    const board = C().opsBoard();
    const totNeg = board.filter(c => c.def.kind === 'negocio').reduce((s, c) => s + c.items.length, 0);
    const totGes = board.filter(c => c.def.kind === 'gestion').reduce((s, c) => s + c.items.length, 0);
    host.innerHTML = `<div class="page">
      ${K.bannerFor('ops', `<button class="btn ghost" id="op-lists">⚙ Listas</button><button class="btn ghost" id="op-new-ges">+ Gestión</button><button class="btn primary" id="op-new-neg">+ Nuevo ingreso</button>`)}
      <div class="ops-legend">
        <span class="muted">Tablero operativo en vivo · <b>${totNeg}</b> negocios en flujo · <b>${totGes}</b> gestiones</span>
        <span class="ops-sync">🔁 Sincronizado con Orbit Leads</span>
      </div>
      <div class="kanban">
        ${board.map(col => kcol(col)).join('')}
      </div>
    </div>`;
    C().wireCards(host);
    host.querySelector('#op-lists').addEventListener('click', () => C().gestionarListas('opsListas'));
    host.querySelector('#op-new-ges').addEventListener('click', () => C().nuevaGestion());
    host.querySelector('#op-new-neg').addEventListener('click', () => C().nuevoNegocio());
    host.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
      b.dataset.add === 'gestion' ? C().nuevaGestion() : C().nuevoNegocio();
    }));
  }

  function kcol(col) {
    const L = col.def;
    const cards = col.items.map(it => it.kind === 'negocio' ? C().cardNegocio(it.rec, { board: 'ops' }) : C().cardGestion(it.rec)).join('');
    return `<div class="kcol">
      <div class="kcol-h2" style="--lc:${L.color}">
        <span class="kcol-emoji">${L.emoji}</span><b>${L.nombre}</b><span class="kcount">${col.items.length}</span>
      </div>
      <div class="kcol-body">
        ${cards || '<div class="kempty">Sin tarjetas</div>'}
        <button class="kadd" data-add="${L.kind}">+ ${L.kind === 'gestion' ? 'Gestión' : 'Ingreso'}</button>
      </div>
    </div>`;
  }

  return { render };
})();
