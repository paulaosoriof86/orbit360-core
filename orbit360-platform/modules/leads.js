/* ============================================================
   Orbit 360 · Orbit Leads — pipeline comercial (vista del asesor)
   Mismo ciclo que Ops, proyectado por etapa. Listas espejo de las
   etapas operativas (Cotizando/Inspección/Emisión) para que el
   asesor sepa el avance sin entrar a Ops. Cadencias automáticas.
   Sincronizado EN VIVO con Orbit Ops.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.leads = (function () {
  const U = Orbit.ui, K = Orbit.kit, C = () => Orbit.ciclo;
  let host, unsub;

  function render(h) {
    host = h;
    draw();
    if (!unsub) {
      const re = () => { if (Orbit.route && Orbit.route.key === 'leads' && document.body.contains(host)) draw(); };
      const u1 = Orbit.store.on(re);
      const f = () => re();
      document.addEventListener('orbit:ciclo', f);
      document.addEventListener('orbit:pais', f);
      document.addEventListener('orbit:session', f);
      unsub = () => { u1(); document.removeEventListener('orbit:ciclo', f); document.removeEventListener('orbit:pais', f); document.removeEventListener('orbit:session', f); };
    }
  }

  function draw() {
    const board = C().leadsBoard();
    const m = C().metricasLeads();
    const esAse = Orbit.session && Orbit.session.esAsesor && Orbit.session.esAsesor();
    host.innerHTML = `<div class="page">
      ${K.bannerFor('leads', `<button class="btn ghost" id="ld-lists">⚙ Listas</button><button class="btn primary" id="ld-new">+ Nuevo lead</button>`)}
      ${K.kpis([
        { label: 'Leads activos', val: m.activos, color: 'var(--red)', foot: esAse ? 'tu pipeline' : 'en pipeline', onclick: 'location.hash=\'#/leads\'' },
        { label: 'Prima estimada', val: U.moneyShort(m.tot, 'GTQ'), color: 'var(--info)', foot: 'potencial', onclick: 'location.hash=\'#/leads\'' },
        { label: 'Pronóstico ponderado', val: U.moneyShort(m.pond, 'GTQ'), color: 'var(--ok)', foot: 'por probabilidad', footTone: 'up', onclick: 'location.hash=\'#/leads\'' },
        { label: 'Ganados (emitidos)', val: m.ganados, color: 'var(--warn)', foot: 'cierre del mes', onclick: 'location.hash=\'#/cliente360\'' }
      ])}
      <div class="ops-legend">
        <span class="muted">🎯 Pipeline con <b>cadencias automáticas</b> al enviar propuesta · <span class="kmirror" style="position:static">🔗 en Ops</span> = el equipo lo está gestionando</span>
        <span class="ops-sync">🔁 Sincronizado con Orbit Ops</span>
      </div>
      <div class="kanban">
        ${board.map(col => kcol(col)).join('')}
      </div>
    </div>`;
    C().wireCards(host);
    const lb = host.querySelector('#ld-lists'); if (lb) lb.addEventListener('click', () => C().gestionarListas('leadsListas'));
    host.querySelector('#ld-new').addEventListener('click', () => C().nuevoNegocio());
    host.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => C().nuevoNegocio()));
  }

  function kcol(col) {
    const L = col.def, q = Orbit.q;
    const subt = col.items.reduce((s, it) => s + q.norm(it.rec.primaEst, it.rec.moneda), 0);
    const cards = col.items.map(it => C().cardNegocio(it.rec, { espejo: L.espejo, board: 'leads' })).join('');
    return `<div class="kcol ${L.espejo ? 'kcol-espejo' : ''}">
      <div class="kcol-h2" style="--lc:${L.color}">
        <span class="kcol-emoji">${L.emoji}</span><b>${L.nombre}</b><span class="kcount">${col.items.length}</span>
      </div>
      <div class="ksub">${U.moneyShort(subt, 'GTQ')}${L.espejo ? ' · <span style="color:var(--ink-3)">operativo</span>' : ''}</div>
      <div class="kcol-body">
        ${cards || '<div class="kempty">—</div>'}
        ${!L.espejo && L.etapa === 'nuevo' ? '<button class="kadd" data-add="neg">+ Nuevo lead</button>' : ''}
      </div>
    </div>`;
  }

  return { render };
})();
