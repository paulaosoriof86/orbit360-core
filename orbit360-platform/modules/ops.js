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
  const st = { q: '', fAseg: '', fAse: '' };

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
    let board = C().opsBoard();
    // aplicar búsqueda + filtros
    if (st.q || st.fAseg || st.fAse) {
      const ql = (st.q || '').toLowerCase();
      board = board.map(col => {
        const items = col.items.filter(it => {
          const r = it.rec;
          const cli = r.clienteId ? Orbit.store.get('clientes', r.clienteId) : null;
          const asg = r.aseguradoraId ? Orbit.store.get('aseguradoras', r.aseguradoraId) : null;
          const txt = [(cli && cli.nombre) || r.titulo || r.nombre || '', r.numero || '', (asg && asg.nombre) || ''].join(' ').toLowerCase();
          if (ql && txt.indexOf(ql) < 0) return false;
          if (st.fAseg && r.aseguradoraId !== st.fAseg) return false;
          if (st.fAse && r.asesorId !== st.fAse) return false;
          return true;
        });
        return Object.assign({}, col, { items });
      });
    }
    const totNeg = board.filter(c => c.def.kind === 'negocio').reduce((s, c) => s + c.items.length, 0);
    const totGes = board.filter(c => c.def.kind === 'gestion').reduce((s, c) => s + c.items.length, 0);
    const asegs = Orbit.store.all('aseguradoras').filter(a => a.vinculada !== false);
    const ases = Orbit.store.all('asesores').filter(a => !a.inactivo);
    host.innerHTML = `<div class="page">
      ${K.bannerFor('ops', `<button class="btn ghost" id="op-lists">⚙ Listas</button><button class="btn ghost" id="op-new-ges">+ Gestión</button><button class="btn primary" id="op-new-neg">+ Nuevo ingreso</button>`)}
      <div class="ops-toolbar">
        <input id="op-q" class="o-sel ops-search" placeholder="🔎 Buscar cliente, póliza o aseguradora…" value="${U.esc(st.q || '')}">
        <select id="op-faseg" class="o-sel"><option value="">Todas las aseguradoras</option>${asegs.map(a => `<option value="${a.id}" ${st.fAseg === a.id ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select>
        <select id="op-fase" class="o-sel"><option value="">Todos los responsables</option>${ases.map(a => `<option value="${a.id}" ${st.fAse === a.id ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select>
        ${(st.q || st.fAseg || st.fAse) ? '<button class="btn ghost sm" id="op-clear">✕ Limpiar</button>' : ''}
      </div>
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
    const qi = host.querySelector('#op-q'); if (qi) { qi.addEventListener('input', () => { st.q = qi.value; const pos = qi.selectionStart; draw(); const nq = host.querySelector('#op-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } }); }
    const fa = host.querySelector('#op-faseg'); if (fa) fa.addEventListener('change', () => { st.fAseg = fa.value; draw(); });
    const fs = host.querySelector('#op-fase'); if (fs) fs.addEventListener('change', () => { st.fAse = fs.value; draw(); });
    const cl = host.querySelector('#op-clear'); if (cl) cl.addEventListener('click', () => { st.q = ''; st.fAseg = ''; st.fAse = ''; draw(); });
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
