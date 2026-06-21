/* ============================================================
   Orbit 360 · Novedades / Incentivos  — BETA
   Todo el equipo crea novedades (incentivos, producto, avisos).
   - Modal grande al ingresar (1 vez por día) con las no leídas.
   - Tablón con contador de no leídas (campana del topbar).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.novedades = (function () {
  const U = Orbit.ui, S = () => Orbit.store;
  const RKEY = 'orbit360_nov_leidas';
  const MKEY = 'orbit360_nov_modal';

  function leidas() { try { return JSON.parse(localStorage.getItem(RKEY) || '[]'); } catch (e) { return []; } }
  function marcarLeida(id) { const l = new Set(leidas()); l.add(id); try { localStorage.setItem(RKEY, JSON.stringify([...l])); } catch (e) {} actualizarContador(); }
  function noLeidas() { const l = leidas(); return S().all('novedades').filter(n => !l.includes(n.id)); }

  const ICON = { incentivo: '🏆', producto: '🆕', aviso: '📢' };

  function actualizarContador() {
    const n = noLeidas().length;
    const dot = document.querySelector('#nov-bell .dot');
    const cnt = document.getElementById('nov-count');
    if (dot) dot.style.display = n ? 'block' : 'none';
    if (cnt) { cnt.textContent = n; cnt.style.display = n ? 'grid' : 'none'; }
  }

  // ---- modal grande al ingresar ----
  function maybeWelcome() {
    const hoy = '2026-06-21';
    let last = null; try { last = localStorage.getItem(MKEY); } catch (e) {}
    const nl = noLeidas();
    if (last === hoy || !nl.length) { actualizarContador(); return; }
    try { localStorage.setItem(MKEY, hoy); } catch (e) {}
    welcome(nl);
  }
  function welcome(items) {
    const back = document.createElement('div');
    back.className = 'drawer-back open'; back.style.cssText = 'display:grid;place-items:center;z-index:150';
    back.innerHTML = `<div class="nov-modal">
      <div class="nov-modal-h">
        <div><div class="nov-eyebrow">Tablón de novedades</div><h2>Hola — esto es nuevo para el equipo</h2></div>
        <button class="imp-x" id="nov-x">✕</button>
      </div>
      <div class="nov-modal-body">
        ${items.map(n => cardBig(n)).join('')}
      </div>
      <div class="nov-modal-f">
        <button class="btn ghost" id="nov-later">Ver luego</button>
        <button class="btn primary" id="nov-allread">Marcar todas como leídas</button>
      </div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.querySelector('#nov-x').addEventListener('click', close);
    back.querySelector('#nov-later').addEventListener('click', close);
    back.querySelector('#nov-allread').addEventListener('click', () => { items.forEach(n => marcarLeida(n.id)); close(); });
    back.addEventListener('click', e => { if (e.target === back) close(); });
  }
  function cardBig(n) {
    return `<div class="nov-big ${n.prioridad ? 'pri' : ''}">
      <span class="nov-big-ico">${ICON[n.tipo] || '📣'}</span>
      <div><b>${U.esc(n.titulo)}</b><p>${U.esc(n.detalle)}</p>
      <span class="nov-meta">${U.esc(n.autor)} · ${U.fmtDate(n.fecha)}</span></div>
    </div>`;
  }

  // ---- drawer tablón (desde la campana) ----
  function abrirTablon() {
    let dr = document.getElementById('nov-drawer'), back = document.getElementById('nov-back');
    if (!dr) {
      back = document.createElement('div'); back.id = 'nov-back'; back.className = 'drawer-back';
      dr = document.createElement('div'); dr.id = 'nov-drawer'; dr.className = 'drawer';
      document.body.appendChild(back); document.body.appendChild(dr);
      back.addEventListener('click', () => { back.classList.remove('open'); dr.classList.remove('open'); });
    }
    const l = leidas();
    const items = S().all('novedades').sort((a, b) => b.fecha.localeCompare(a.fecha));
    dr.innerHTML = `<div class="imp-head"><div><div class="imp-eyebrow">Comunicación interna</div><div class="imp-title">📣 Tablón de novedades</div></div><button class="imp-x" id="nov-dx">✕</button></div>
      <div class="imp-body">
        <button class="btn primary" style="width:100%;margin-bottom:14px" id="nov-new">+ Publicar novedad</button>
        <div style="display:grid;gap:11px">
          ${items.map(n => `<div class="nov-item ${l.includes(n.id) ? '' : 'unread'}" data-nov="${n.id}">
            <span class="nov-big-ico" style="width:38px;height:38px;font-size:18px">${ICON[n.tipo] || '📣'}</span>
            <div style="flex:1"><b>${U.esc(n.titulo)}</b><p>${U.esc(n.detalle)}</p>
            <span class="nov-meta">${U.esc(n.autor)} · ${U.fmtDate(n.fecha)}</span></div>
            ${l.includes(n.id) ? '' : '<span class="nov-dot"></span>'}
          </div>`).join('')}
        </div>
      </div>`;
    back.classList.add('open'); dr.classList.add('open');
    dr.querySelector('#nov-dx').addEventListener('click', () => { back.classList.remove('open'); dr.classList.remove('open'); });
    dr.querySelector('#nov-new').addEventListener('click', publicar);
    dr.querySelectorAll('[data-nov]').forEach(el => el.addEventListener('click', () => { marcarLeida(el.dataset.nov); el.classList.remove('unread'); const d = el.querySelector('.nov-dot'); if (d) d.remove(); }));
  }
  function publicar() {
    const titulo = prompt('Título de la novedad (incentivo, producto, aviso):'); if (!titulo) return;
    const detalle = prompt('Detalle:') || '';
    const yo = (Orbit.auth && Orbit.auth.user()) || { nombre: 'Equipo' };
    S().insert('novedades', { id: 'nov' + Date.now(), tipo: 'aviso', titulo, detalle, autor: yo.nombre, fecha: '2026-06-21', prioridad: false });
    abrirTablon(); actualizarContador();
  }

  function init() {
    const bell = document.getElementById('nov-bell');
    if (bell) bell.addEventListener('click', abrirTablon);
    actualizarContador();
    setTimeout(maybeWelcome, 600);
  }
  return { init, abrirTablon, actualizarContador };
})();
