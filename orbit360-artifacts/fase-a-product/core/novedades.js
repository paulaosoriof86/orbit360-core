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
    const hoy = (Orbit.ui && Orbit.ui.now ? Orbit.ui.now() : new Date()).toISOString().slice(0, 10);
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
    const items = S().all('novedades').sort((a, b) => String(b.fecha||'').localeCompare(String(a.fecha||'')));
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
    let back = document.getElementById('nov-pub-back'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'nov-pub-back'; back.className = 'drawer-back open';
    back.style.cssText = 'display:grid;place-items:center;z-index:210';
    const EMOJIS = ['🏆','🆕','📢','⭐','🎉','🔥','💡','📌','✅','⚠️','🚨','📅','👏','🎯','💰','📣','🧑‍💼','🌟'];
    back.innerHTML = `<div class="card" style="width:min(580px,95vw);max-height:90vh;overflow:auto;padding:0">
      <div style="padding:16px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;align-items:center">
        <b style="font-family:var(--f-display);font-size:16px;color:#fff">📣 Publicar novedad</b>
        <button class="imp-x" id="npb-x" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.2);color:#fff">✕</button></div>
      <div style="padding:18px 20px;display:grid;gap:12px">
        <label class="ce-l">Tipo<select id="npb-tipo" class="o-sel">
          <option value="aviso">📢 Aviso general</option>
          <option value="incentivo">🏆 Incentivo</option>
          <option value="producto">🆕 Producto / novedad</option>
        </select></label>
        <label class="ce-l">Título *<input id="npb-titulo" class="o-sel" placeholder="Escribe el título de la novedad..." maxlength="80"></label>
        <label class="ce-l">Detalle / contenido
          <div style="border:1px solid var(--line);border-radius:8px;overflow:hidden">
            <div style="padding:6px 10px;background:var(--surface);display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--line)">
              <button type="button" class="npb-fmt" data-cmd="bold" title="Negrita" style="font-weight:700">B</button>
              <button type="button" class="npb-fmt" data-cmd="italic" title="Cursiva" style="font-style:italic">I</button>
              <button type="button" class="npb-fmt" data-cmd="underline" title="Subrayado" style="text-decoration:underline">U</button>
              <span style="width:1px;background:var(--line);margin:2px 4px"></span>
              ${EMOJIS.map(e => '<button type="button" class="npb-emoji" title="' + e + '" style="background:none;border:none;cursor:pointer;font-size:18px;padding:2px 4px">' + e + '</button>').join('')}
            </div>
            <div id="npb-body" contenteditable="true" spellcheck="true" style="min-height:120px;padding:12px;font-size:14px;outline:none;line-height:1.6" placeholder="Escribe el detalle aquí..."></div>
          </div>
        </label>
        <label class="ce-l ck" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="npb-pri"> Marcar como prioritaria ⭐</label>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end">
        <button class="btn ghost" id="npb-cancel">Cancelar</button>
        <button class="btn primary" id="npb-ok">📣 Publicar</button>
      </div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#npb-x').addEventListener('click', close);
    back.querySelector('#npb-cancel').addEventListener('click', close);
    // Formatting buttons
    back.querySelectorAll('.npb-fmt').forEach(b => b.addEventListener('click', () => { document.execCommand(b.dataset.cmd); back.querySelector('#npb-body').focus(); }));
    back.querySelectorAll('.npb-emoji').forEach(b => b.addEventListener('click', () => {
      const ed = back.querySelector('#npb-body'); ed.focus();
      document.execCommand('insertText', false, b.title);
    }));
    back.querySelector('#npb-ok').addEventListener('click', () => {
      const titulo = back.querySelector('#npb-titulo').value.trim(); if (!titulo) { back.querySelector('#npb-titulo').focus(); return; }
      const detalle = back.querySelector('#npb-body').innerText.trim();
      const tipo = back.querySelector('#npb-tipo').value;
      const prioridad = back.querySelector('#npb-pri').checked;
      const yo = (Orbit.auth && Orbit.auth.user()) || { nombre: 'Equipo' };
      S().insert('novedades', { id: 'nov' + Date.now(), tipo, titulo, detalle, autor: yo.nombre, fecha: new Date().toISOString().slice(0,10), prioridad });
      close(); abrirTablon(); actualizarContador();
    });
  }

  function init() {
    const bell = document.getElementById('nov-bell');
    if (bell) bell.addEventListener('click', abrirTablon);
    actualizarContador();
    setTimeout(maybeWelcome, 600);
  }
  return { init, abrirTablon, actualizarContador };
})();
