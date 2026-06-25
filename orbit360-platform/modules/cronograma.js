/* ============================================================
   Orbit 360 · Cronograma (agenda día / semana / mes)
   Reúne en un calendario los vencimientos del CRM (cobros,
   renovaciones, gestiones) + tareas manuales editables. Cada
   ítem es clicable y abre su detalle o ficha. Datos en vivo.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.cronograma = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store, q = Orbit.q;
  let host, vista = 'mes', ref;
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  function paisOK(cid) { const c = S().get('clientes', cid); return !Orbit.pais || Orbit.pais === 'TODOS' || (c && c.pais === Orbit.pais); }

  /* eventos del CRM + tareas manuales, por fecha YYYY-MM-DD */
  function eventos() {
    const ev = {};
    const add = (fecha, e) => { if (!fecha) return; (ev[fecha] = ev[fecha] || []).push(e); };
    S().all('cobros').filter(c => (c.estado === 'Pendiente' || c.estado === 'Vencido') && paisOK(c.clienteId)).forEach(c => add(c.vence, { tipo: 'cobro', icon: '💳', color: '#c9821b', t: 'Cobro · ' + ((S().get('clientes', c.clienteId) || {}).nombre || ''), go: () => Orbit.modules.cobros.detalle(c.id) }));
    (q.renovacionesProximas ? q.renovacionesProximas(90) : []).filter(p => paisOK(p.clienteId)).forEach(p => add(p.vigenciaFin, { tipo: 'renov', icon: '🔄', color: '#0f766e', t: 'Renueva ' + p.numero, go: () => Orbit.modules.cliente360.verPoliza(p.id) }));
    S().all('gestiones').filter(g => !g.archivado).forEach(g => add(g.vence, { tipo: 'gestion', icon: '🗂', color: '#1f3a5f', t: (g.titulo || g.tipo), go: () => Orbit.ciclo && Orbit.ciclo.openGestion && Orbit.ciclo.openGestion(g.id) }));
    S().all('tareas').forEach(tk => add(tk.fecha, { tipo: 'tarea', icon: tk.done ? '✅' : '📌', color: '#C5162E', t: tk.t, go: () => toggleTarea(tk.id), id: tk.id }));
    return ev;
  }
  function toggleTarea(id) { const t = S().get('tareas', id); if (t) { S().update('tareas', id, { done: !t.done }); draw(); } }

  function render(h) { host = h; if (!ref) ref = new Date(U.NOW || Date.now()); draw(); }

  function draw() {
    const ev = eventos();
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '📅', title: 'Cronograma', sub: 'Agenda de vencimientos y tareas del equipo', features: [], actions: `<button class="btn primary" id="cr-new" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">+ Tarea</button>` })}
      <div class="cr-bar">
        <div class="mk-nav"><button class="mk-navb" id="cr-prev">‹</button><b id="cr-title" style="font-family:var(--f-display);font-size:17px;min-width:200px;text-align:center">${titulo()}</b><button class="mk-navb" id="cr-next">›</button></div>
        <button class="btn ghost sm" id="cr-hoy">Hoy</button>
        <div class="ins-seg" style="margin-left:auto">${[['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']].map(v => `<button class="ins-seg-b ${vista === v[0] ? 'active' : ''}" data-v="${v[0]}">${v[1]}</button>`).join('')}</div>
      </div>
      ${vista === 'mes' ? vMes(ev) : vista === 'semana' ? vLista(ev, 7) : vLista(ev, 1)}
    </div>`;
    host.querySelector('#cr-prev').addEventListener('click', () => { shift(-1); draw(); });
    host.querySelector('#cr-next').addEventListener('click', () => { shift(1); draw(); });
    host.querySelector('#cr-hoy').addEventListener('click', () => { ref = new Date(U.NOW || Date.now()); draw(); });
    host.querySelector('#cr-new').addEventListener('click', () => nuevaTarea());
    host.querySelectorAll('.ins-seg-b').forEach(b => b.addEventListener('click', () => { vista = b.dataset.v; draw(); }));
    host.querySelectorAll('[data-ev]').forEach((el, i) => el.addEventListener('click', () => { const fn = el._go; if (fn) fn(); }));
    // attach handlers
    let idx = 0; const flat = host.querySelectorAll('[data-ev]');
    flat.forEach(el => { const f = el.dataset.ev, d = el.dataset.d; const e = (ev[d] || [])[+f]; if (e) el.addEventListener('click', e.go); });
  }
  function titulo() {
    if (vista === 'mes') return MESES[ref.getMonth()] + ' ' + ref.getFullYear();
    if (vista === 'dia') return ref.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
    const wk = startOfWeek(ref); const end = new Date(wk); end.setDate(end.getDate() + 6);
    return wk.getDate() + ' – ' + end.getDate() + ' ' + MESES[end.getMonth()];
  }
  function shift(d) { if (vista === 'mes') ref.setMonth(ref.getMonth() + d); else if (vista === 'dia') ref.setDate(ref.getDate() + d); else ref.setDate(ref.getDate() + d * 7); ref = new Date(ref); }
  function startOfWeek(d) { const x = new Date(d); let off = x.getDay() - 1; if (off < 0) off = 6; x.setDate(x.getDate() - off); x.setHours(0, 0, 0, 0); return x; }
  function iso(d) { return d.toISOString().slice(0, 10); }

  function vMes(ev) {
    const y = ref.getFullYear(), m = ref.getMonth();
    const first = new Date(y, m, 1); let off = first.getDay() - 1; if (off < 0) off = 6;
    const days = new Date(y, m + 1, 0).getDate();
    const hoy = iso(new Date(U.NOW || Date.now()));
    let cells = '';
    for (let i = 0; i < off; i++) cells += '<div class="mk-cell empty"></div>';
    for (let d = 1; d <= days; d++) {
      const fecha = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const items = ev[fecha] || [];
      cells += `<div class="mk-cell ${fecha === hoy ? 'today' : ''}">
        <div class="mk-d">${fecha === hoy ? '<span class="mk-today">' + d + '</span>' : d}${items.length ? `<span class="mk-count">${items.length}</span>` : ''}</div>
        ${items.slice(0, 3).map((e, i) => `<div class="mk-chip" data-ev="${i}" data-d="${fecha}" title="${U.esc(e.t)}" style="--enf:${e.color}"><span class="mk-chip-em">${e.icon}</span><span class="mk-chip-t">${U.esc(e.t)}</span></div>`).join('')}
        ${items.length > 3 ? `<div class="mk-more">+${items.length - 3}</div>` : ''}
      </div>`;
    }
    return `<div class="mk-cal"><div class="mk-week">${DIAS.map(d => `<div class="mk-dh">${d}</div>`).join('')}</div><div class="mk-grid">${cells}</div></div>`;
  }
  function vLista(ev, n) {
    const start = n === 7 ? startOfWeek(ref) : new Date(ref); start.setHours(0, 0, 0, 0);
    let out = '';
    for (let i = 0; i < n; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i); const fecha = iso(d);
      const items = ev[fecha] || [];
      out += `<div class="cr-day"><div class="cr-day-h">${d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })}${fecha === iso(new Date(U.NOW || Date.now())) ? ' <span class="badge danger" style="font-size:9px">Hoy</span>' : ''}</div>
        ${items.length ? items.map((e, j) => `<div class="cr-ev" data-ev="${j}" data-d="${fecha}"><span class="cr-ev-ic" style="background:${e.color}">${e.icon}</span><b>${U.esc(e.t)}</b><span class="muted" style="margin-left:auto;font-size:11px;text-transform:capitalize">${e.tipo}</span></div>`).join('') : '<div class="muted" style="font-size:12px;padding:4px 0">Sin pendientes.</div>'}
      </div>`;
    }
    return `<div class="cr-list">${out}</div>`;
  }

  function nuevaTarea() {
    const f = prompt('Tarea para hoy (o escribe la fecha como AAAA-MM-DD al inicio):', '');
    if (!f) return;
    let fecha = iso(new Date(U.NOW || Date.now())), txt = f;
    const m = f.match(/^(\d{4}-\d{2}-\d{2})\s+(.*)$/); if (m) { fecha = m[1]; txt = m[2]; }
    S().insert('tareas', { id: 'tk' + Date.now(), t: txt, fecha, done: false });
    draw();
  }

  return { render };
})();
