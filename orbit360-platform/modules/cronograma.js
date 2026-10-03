/* ============================================================
   Orbit 360 · Cronograma (agenda día / semana / mes)
   Reúne en un calendario las obligaciones reales de cartera,
   renovaciones, gestiones + tareas manuales editables. Cada
   ítem es clicable y abre su detalle o ficha. Datos en vivo.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.cronograma = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store, q = Orbit.q;
  let host, vista = 'mes', ref;
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  function paisOK(cid, idx) { const c = idx && idx.clientById ? idx.clientById.get(String(cid || '')) : S().get('clientes', cid); return !Orbit.pais || Orbit.pais === 'TODOS' || (c && c.pais === Orbit.pais); }
  function relationIndex() {
    const clientById=new Map(),policyById=new Map();
    (S().all('clientes')||[]).forEach(c=>{if(c&&c.id!=null)clientById.set(String(c.id),c);});
    (S().all('polizas')||[]).forEach(p=>{if(p&&p.id!=null)policyById.set(String(p.id),p);});
    return {clientById,policyById};
  }
  function portfolioAdapter() { return Orbit.cobrosCarteraProjectionAdapter || null; }
  function obligationsReady() {
    const a = portfolioAdapter();
    try { return !!(a && typeof a.confirmed === 'function' && a.confirmed() && q && typeof q.recibosEsperadosDe === 'function'); }
    catch (e) { return false; }
  }
  function receiptIndex() {
    const byId=new Map(), byPolicySeq=new Map(), idsByClient=new Map();
    (S().all('recibosEsperados')||[]).forEach(r=>{
      if(!r)return;
      const id=String(r.id||''),pid=String(r.polizaId||''),seq=String(r.secuencia||r.cuota||''),cid=String(r.clienteId||'');
      if(id)byId.set(id,r);
      if(pid&&!byPolicySeq.has(pid+'|'+seq))byPolicySeq.set(pid+'|'+seq,r);
      if(cid&&id){let set=idsByClient.get(cid);if(!set){set=new Set();idsByClient.set(cid,set);}set.add(id);}
    });
    return {byId,byPolicySeq,idsByClient};
  }
  function linkedReceipt(row, index) {
    if (!row) return null;
    const idx=index||receiptIndex();
    const rid = String(row.reciboId || row.receiptId || '').trim();
    if (rid) return idx.byId.get(rid) || null;
    const pid = String(row.polizaId || '').trim(), seq = String(row.secuencia || row.cuota || '').trim();
    if (!pid) return null;
    return idx.byPolicySeq.get(pid+'|'+seq) || idx.byPolicySeq.get(pid+'|') || null;
  }
  function pendingObligations(index) {
    const a = portfolioAdapter(), idx=index||receiptIndex();
    if (!obligationsReady() || !a || typeof a.portfolioRows !== 'function') return [];
    return (a.portfolioRows('') || []).filter(row => {
      const rec = linkedReceipt(row,idx), cid = String((row && row.clienteId) || (rec && rec.clienteId) || '').trim();
      if (!rec || !cid || !paisOK(cid)) return false;
      const ids=idx.idsByClient.get(cid);
      return !!(ids && ids.has(String(rec.id||'')));
    });
  }
  function obligationDue(row) {
    const rp = Orbit.receiptsPortfolioProjectionV920 || Orbit.receiptsPortfolioProjection || {};
    if (rp && typeof rp.dueDate === 'function') return rp.dueDate(row);
    return row && (row.fechaLimite || row.vence || row.fechaVencimiento) || '';
  }
  function openObligation(row) {
    const rec = linkedReceipt(row), cid = String((row && row.clienteId) || (rec && rec.clienteId) || '').trim();
    if (!rec || !rec.id || !cid) { try { U.toast('No fue posible abrir el recibo vinculado.'); } catch (e) {} return; }
    window.location.hash = '#/cliente360?c=' + encodeURIComponent(cid) + '&t=recibos&r=' + encodeURIComponent(rec.id);
  }

  /* eventos del CRM + tareas manuales, por fecha YYYY-MM-DD */
  function eventos() {
    const ev = {}, receiptIdx=receiptIndex(), rel=relationIndex();
    const add = (fecha, e) => { if (!fecha) return; (ev[fecha] = ev[fecha] || []).push(e); };
    pendingObligations(receiptIdx).forEach(row => {
      const rec = linkedReceipt(row,receiptIdx), cid = String(row.clienteId || (rec && rec.clienteId) || '').trim();
      const client = rel.clientById.get(cid) || {}, policy = rel.policyById.get(String(row.polizaId || (rec && rec.polizaId) || '')) || {};
      const label = 'Recibo pendiente · ' + (client.nombre || 'Cliente') + (policy.numero ? ' · ' + policy.numero : '');
      add(obligationDue(row), { tipo: 'recibo', icon: '🧾', color: '#c9821b', t: label, go: () => openObligation(row) });
    });
    (q.renovacionesProximas ? q.renovacionesProximas(90) : []).filter(p => paisOK(p.clienteId,rel)).forEach(p => add(p.vigenciaFin, { tipo: 'renov', icon: '🔄', color: '#0f766e', t: 'Renueva ' + p.numero, go: () => Orbit.modules.cliente360.verPoliza(p.id) }));
    S().all('gestiones').filter(g => !g.archivado).forEach(g => add(g.vence, { tipo: 'gestion', icon: '🗂', color: '#1f3a5f', t: (g.titulo || g.tipo), go: () => Orbit.ciclo && Orbit.ciclo.openGestion && Orbit.ciclo.openGestion(g.id) }));
    S().all('tareas').forEach(tk => add(tk.fecha, { tipo: 'tarea', icon: tk.done ? '✅' : '📌', color: '#C5162E', t: tk.t, go: () => toggleTarea(tk.id), id: tk.id }));
    return ev;
  }
  function toggleTarea(id) { const t = S().get('tareas', id); if (t) { S().update('tareas', id, { done: !t.done }); draw(); } }

  function render(h) { host = h; if (!ref) ref = new Date(U.NOW || Date.now()); draw(); }

  function draw() {
    const ev = eventos();
    host.innerHTML = `<div class="page" data-cronograma-ready="1">
      ${K.banner({ icon: '📅', title: 'Cronograma', sub: 'Agenda de renovaciones, recibos, gestiones y tareas del equipo', features: [], actions: `<button class="btn primary" id="cr-new" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">+ Tarea</button>` })}
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
    flat.forEach(el => { const f = el.dataset.ev, d = el.dataset.d; const e = (ev[d] || []).slice().sort(eventPriority)[+f]; if (e) el.addEventListener('click', e.go); });
    host.querySelectorAll('[data-more-date]').forEach(el=>el.addEventListener('click',()=>{vista='dia';ref=new Date(el.dataset.moreDate+'T12:00:00');draw();}));
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

  function eventPriority(a,b) {
    const rank={renov:0,recibo:1,gestion:2,tarea:3};
    return (rank[a&&a.tipo]??9)-(rank[b&&b.tipo]??9) || String(a&&a.t||'').localeCompare(String(b&&b.t||''));
  }

  function vMes(ev) {
    const y = ref.getFullYear(), m = ref.getMonth();
    const first = new Date(y, m, 1); let off = first.getDay() - 1; if (off < 0) off = 6;
    const days = new Date(y, m + 1, 0).getDate();
    const hoy = iso(new Date(U.NOW || Date.now()));
    let cells = '';
    for (let i = 0; i < off; i++) cells += '<div class="mk-cell empty"></div>';
    for (let d = 1; d <= days; d++) {
      const fecha = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const items = (ev[fecha] || []).slice().sort(eventPriority);
      cells += `<div class="mk-cell ${fecha === hoy ? 'today' : ''}">
        <div class="mk-d">${fecha === hoy ? '<span class="mk-today">' + d + '</span>' : d}${items.length ? `<span class="mk-count">${items.length}</span>` : ''}</div>
        ${items.slice(0, 3).map((e, i) => `<div class="mk-chip" data-ev="${i}" data-d="${fecha}" title="${U.esc(e.t)}" style="--enf:${e.color}"><span class="mk-chip-em">${e.icon}</span><span class="mk-chip-t">${U.esc(e.t)}</span></div>`).join('')}
        ${items.length > 3 ? `<button type="button" class="mk-more" data-more-date="${fecha}">+${items.length - 3} · ver día</button>` : ''}
      </div>`;
    }
    return `<div class="mk-cal"><div class="mk-week">${DIAS.map(d => `<div class="mk-dh">${d}</div>`).join('')}</div><div class="mk-grid">${cells}</div></div>`;
  }
  function vLista(ev, n) {
    const start = n === 7 ? startOfWeek(ref) : new Date(ref); start.setHours(0, 0, 0, 0);
    let out = '';
    for (let i = 0; i < n; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i); const fecha = iso(d);
      const items = (ev[fecha] || []).slice().sort(eventPriority);
      out += `<div class="cr-day"><div class="cr-day-h">${d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })}${fecha === iso(new Date(U.NOW || Date.now())) ? ' <span class="badge danger" style="font-size:9px">Hoy</span>' : ''}</div>
        ${items.length ? items.map((e, j) => `<div class="cr-ev" data-ev="${j}" data-d="${fecha}"><span class="cr-ev-ic" style="background:${e.color}">${e.icon}</span><b>${U.esc(e.t)}</b><span class="muted" style="margin-left:auto;font-size:11px;text-transform:capitalize">${e.tipo}</span></div>`).join('') : '<div class="muted" style="font-size:12px;padding:4px 0">Sin pendientes.</div>'}
      </div>`;
    }
    return `<div class="cr-list">${out}</div>`;
  }

  async function nuevaTarea() {
    const f = await U.prompt('Tarea para hoy (o escribe la fecha como AAAA-MM-DD al inicio):', { title: 'Nueva tarea' });
    if (!f) return;
    let fecha = iso(new Date(U.NOW || Date.now())), txt = f;
    const m = f.match(/^(\d{4}-\d{2}-\d{2})\s+(.*)$/); if (m) { fecha = m[1]; txt = m[2]; }
    S().insert('tareas', { id: 'tk' + Date.now(), t: txt, fecha, done: false });
    draw();
  }

  return { render, __b3007: Object.freeze({ obligationsReady, pendingObligations, linkedReceipt, openObligation }) };
})();
