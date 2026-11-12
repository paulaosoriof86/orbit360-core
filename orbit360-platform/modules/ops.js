/* ============================================================
   Orbit 360 · Orbit Ops — tablero operativo (kanban)
   Proyecta el ciclo comercial (Cotizaciones/Inspecciones/Emisiones)
   + gestiones administrativas. Sincronizado EN VIVO con Orbit Leads.
   Dirección/Operativo ven su alcance configurado; el Asesor ve
   exclusivamente los procesos relacionados con su cartera.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.ops = (function () {
  const U = Orbit.ui, K = Orbit.kit, C = () => Orbit.ciclo;
  let host, unsub;
  const st = { q: '', fAseg: '', fAse: '', showAllTasks: false };

  function isAdvisor() {
    return !!(Orbit.session && Orbit.session.esAsesor && Orbit.session.esAsesor());
  }

  function render(h) {
    host = h;
    draw();
    if (!unsub) {
      const re = () => { if (Orbit.route && Orbit.route.key === 'ops' && document.body.contains(host)) draw(); };
      const u1 = Orbit.store.on(re);
      const f = () => re();
      document.addEventListener('orbit:ciclo', f);
      document.addEventListener('orbit:pais', f);
      document.addEventListener('orbit:session', f);
       document.addEventListener('orbit:inbox-state', f);
      unsub = () => { u1(); document.removeEventListener('orbit:ciclo', f); document.removeEventListener('orbit:pais', f); document.removeEventListener('orbit:session', f); document.removeEventListener('orbit:inbox-state', f); };
      // Reconcile a server snapshot that could have arrived between first draw and subscription.
      Promise.resolve().then(re);
    }
  }

  function draw() {
    const advisor = isAdvisor();
    let board = C().opsBoard();
    const actionRanks=C().actionQueueRanks?C().actionQueueRanks('ops'):{};
    // A Leads handoff is an authorized collaboration event on the SAME negocio.
    // If the opportunity remains in a commercial stage, the regular Ops columns
    // do not include it. Project the pending handoff here without creating a
    // second gestion or moving the opportunity to an incorrect pipeline stage.
    const onBoard=new Set(board.flatMap(col=>(col.items||[]).filter(it=>it.kind==='negocio').map(it=>String(it.rec.id))));
    let incoming=C().negocios({surface:'ops'}).filter(n=>{
      if(onBoard.has(String(n.id)))return false;
      const state=C().collaborationState(n,'ops');
      // Do not show unconfirmed or previously resolved inbox notifications as
      // current tasks. The signed inbox projection owns resolution state.
      return state.noticeKnown===true&&state.needsAction===true;
    }).map(rec=>({kind:'negocio',rec}));
    if (Orbit.access && Orbit.access.canView) {
      board = board.map(col => Object.assign({}, col, {
        items: (col.items || []).filter(it => Orbit.access.canView(it.kind === 'negocio' ? 'negocios' : 'gestiones', it.rec, 'ops'))
      }));
      incoming=incoming.filter(it=>Orbit.access.canView('negocios',it.rec,'ops'));
    }
    const matchesFilters=it=>{
      const r=it.rec,cli=r.clienteId?Orbit.store.get('clientes',r.clienteId):null;
      const asg=r.aseguradoraId?Orbit.store.get('aseguradoras',r.aseguradoraId):null;
      const txt=[(cli&&cli.nombre)||r.titulo||r.nombre||'',r.numero||'',(asg&&asg.nombre)||''].join(' ').toLowerCase();
      return (!st.q||txt.includes(st.q.toLowerCase()))&&(!st.fAseg||r.aseguradoraId===st.fAseg)&&
        (advisor||!st.fAse||r.asesorId===st.fAse);
    };
    if (st.q || st.fAseg || (!advisor && st.fAse)) {
      board = board.map(col=>Object.assign({},col,{items:col.items.filter(matchesFilters)}));
      incoming=incoming.filter(matchesFilters);
    }
    // Cronograma's protected 'tareas' records are NOT gestiones. Project
    // their signed, country-scoped snapshot here without copying or converting
    // the underlying record; creation/completion retains one durable owner.
    const taskCanRead=!!(Orbit.access&&Orbit.access.can&&Orbit.access.can('ops','view'));
    const taskRows=taskCanRead?(Orbit.store.all('tareas')||[]):[];
    const taskVisible=task=>task&&task.id&&task.pais&&
      Orbit.access.canView&&Orbit.access.canView('tareas',task,'ops')&&
      (!st.q||String(task.t||'').toLowerCase().includes(st.q.toLowerCase()))&&
      (!st.fAse||String(task.asesorId||'')===st.fAse)&&!st.fAseg;
    const tasks=taskRows.filter(taskVisible).sort((a,b)=>
      Number(!!a.done)-Number(!!b.done)||String(a.fecha||'9999').localeCompare(String(b.fecha||'9999'))||
      String(a.id).localeCompare(String(b.id)));
    const shownTasks=st.showAllTasks?tasks:tasks.slice(0,8);
    const totNeg = board.filter(c => c.def.kind === 'negocio').reduce((s, c) => s + c.items.length, 0);
    const totGes = board.filter(c => c.def.kind === 'gestion').reduce((s, c) => s + c.items.length, 0);
    const asegs = Orbit.store.all('aseguradoras').filter(a => a.vinculada !== false);
    // Signed role/country roster is the authority for display names and filter labels.
    const roster=Orbit.assignableAdvisorRoster;
    const advisorRows=roster&&typeof roster.peek==='function'?
      ['GT','CO'].flatMap(country=>roster.peek(country)):[];
    const seenAdvisors=new Set();
    const ases=advisorRows.filter(a=>{
      if(!a||!a.id||!a.nombre||seenAdvisors.has(a.id))return false;
      seenAdvisors.add(a.id);return a.activo!==false;
    });
    const actions = advisor ? '' : '<button class="btn ghost" id="op-lists">⚙ Listas</button><button class="btn ghost" id="op-new-task">+ Tarea</button><button class="btn ghost" id="op-new-ges">+ Gestión</button><button class="btn primary" id="op-new-neg">+ Nuevo ingreso</button>';
    host.innerHTML = `<div class="page">
      ${K.bannerFor('ops', actions)}
      ${advisor ? '<div class="cfg-note" style="margin-bottom:12px"><b>Tu operación.</b> Solo aparecen clientes, pólizas, cotizaciones, inspecciones, emisiones y gestiones dentro de tu alcance propio.</div>' : ''}
      <div class="ops-toolbar">
        <input id="op-q" class="o-sel ops-search" placeholder="🔎 Buscar cliente, póliza o aseguradora…" value="${U.esc(st.q || '')}">
        <select id="op-faseg" class="o-sel"><option value="">Todas las aseguradoras</option>${asegs.map(a => `<option value="${a.id}" ${st.fAseg === a.id ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select>
        ${advisor ? '' : `<select id="op-fase" class="o-sel"><option value="">Todos los responsables</option>${ases.map(a => `<option value="${a.id}" ${st.fAse === a.id ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select>`}
        ${(st.q || st.fAseg || (!advisor && st.fAse)) ? '<button class="btn ghost sm" id="op-clear">✕ Limpiar</button>' : ''}
      </div>
      <div class="ops-legend">
        <span class="muted">${advisor ? 'Tu operación' : 'Tablero operativo en vivo'} · <b>${totNeg}</b> negocios en flujo · <b>${totGes}</b> gestiones</span>
        <span class="ops-sync">🔁 Sincronizado con Orbit Leads</span>
        <button class="btn ghost sm" id="op-shared-inbox" type="button">📥 Tareas compartidas</button>
      </div>
      ${incoming.length?`<section class="card pad" aria-label="Solicitudes de Leads pendientes" style="margin-bottom:14px"><b>📥 Solicitudes de Leads pendientes · ${incoming.length}</b><div class="muted" style="margin:4px 0 11px">Misma oportunidad, sin duplicarla ni cambiar su etapa comercial. Abre la tarjeta para responder en la ficha colaborativa.</div><div class="kanban" style="grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:10px">${incoming.map(it=>C().cardNegocio(it.rec,{board:'ops',actionRank:actionRanks[it.rec.id]||0})).join('')}</div></section>`:''}
      <section class="card pad" aria-label="Tareas de agenda en Ops" style="margin-bottom:14px">
        <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><b>📌 Tareas de agenda · ${tasks.length}</b><span class="muted" style="font-size:12px">Cronograma y Ops comparten los mismos registros</span></div>
        ${shownTasks.length?`<div style="display:grid;gap:7px;margin-top:10px">${shownTasks.map(task=>`
          <div class="card" style="display:flex;gap:10px;align-items:center;padding:10px 12px;min-width:0">
            <button class="btn ghost sm" type="button" data-ops-task-toggle="${U.esc(task.id)}" aria-label="${task.done?'Reabrir':'Completar'} tarea" ${advisor?'disabled':''}>${task.done?'✓':'○'}</button>
            <div style="min-width:0;flex:1"><div style="overflow-wrap:anywhere;${task.done?'text-decoration:line-through;opacity:.65;':''}">${U.esc(task.t||'Tarea sin título')}</div><div class="muted" style="font-size:11px">${U.esc(task.pais)} · ${U.esc(task.fecha||'Sin fecha')}</div></div>
          </div>`).join('')}</div>`:'<div class="muted" style="margin-top:10px;font-size:12px">No hay tareas de agenda en el alcance y filtros actuales.</div>'}
        ${tasks.length>8?`<button type="button" class="btn ghost sm" id="op-show-tasks" style="margin-top:8px">${st.showAllTasks?'Mostrar menos':'Mostrar las '+tasks.length+' tareas'}</button>`:''}
      </section>
      <div class="kanban">${board.map(col => kcol(col, advisor, actionRanks)).join('')}</div>
    </div>`;
    C().wireCards(host);
    const lists = host.querySelector('#op-lists'); if (lists) lists.addEventListener('click', () => C().gestionarListas('opsListas'));
    const newManagement = host.querySelector('#op-new-ges'); if (newManagement) newManagement.addEventListener('click', () => C().nuevaGestion());
    const newTask = host.querySelector('#op-new-task'); if(newTask)newTask.addEventListener('click',()=>Orbit.modules.cronograma&&Orbit.modules.cronograma.nuevaTarea&&Orbit.modules.cronograma.nuevaTarea());
    const newBusiness = host.querySelector('#op-new-neg'); if (newBusiness) newBusiness.addEventListener('click', () => C().nuevoNegocio());
    const sharedInbox=host.querySelector('#op-shared-inbox');if(sharedInbox)sharedInbox.addEventListener('click',()=>document.getElementById('ops-inbox-bell')?.click());
    const showTasks=host.querySelector('#op-show-tasks');if(showTasks)showTasks.addEventListener('click',()=>{st.showAllTasks=!st.showAllTasks;draw();});
    host.querySelectorAll('[data-ops-task-toggle]').forEach(button=>button.addEventListener('click',()=>{
      const taskId=button.getAttribute('data-ops-task-toggle');
      if(Orbit.modules.cronograma&&Orbit.modules.cronograma.toggleTarea)
        Orbit.modules.cronograma.toggleTarea(taskId);
    }));
    const qi = host.querySelector('#op-q'); if (qi) { qi.addEventListener('input', () => { st.q = qi.value; const pos = qi.selectionStart; draw(); const nq = host.querySelector('#op-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } }); }
    const fa = host.querySelector('#op-faseg'); if (fa) fa.addEventListener('change', () => { st.fAseg = fa.value; draw(); });
    const fs = host.querySelector('#op-fase'); if (fs) fs.addEventListener('change', () => { st.fAse = fs.value; draw(); });
    const cl = host.querySelector('#op-clear'); if (cl) cl.addEventListener('click', () => { st.q = ''; st.fAseg = ''; st.fAse = ''; draw(); });
    if (!advisor) host.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => { b.dataset.add === 'gestion' ? C().nuevaGestion() : C().nuevoNegocio(); }));
  }

  function kcol(col, advisor, actionRanks) {
    const L = col.def;
    const cards = col.items.map(it => it.kind === 'negocio' ? C().cardNegocio(it.rec, { board: 'ops', actionRank:(actionRanks||{})[it.rec.id]||0 }) : C().cardGestion(it.rec)).join('');
    return `<div class="kcol">
      <div class="kcol-h2" style="--lc:${L.color}"><span class="kcol-emoji">${L.emoji}</span><b>${L.nombre}</b><span class="kcount">${col.items.length}</span></div>
      <div class="kcol-body">${cards || '<div class="kempty">Sin tarjetas</div>'}${advisor ? '' : `<button class="kadd" data-add="${L.kind}">+ ${L.kind === 'gestion' ? 'Gestión' : 'Ingreso'}</button>`}</div>
    </div>`;
  }

  return { render };
})();
