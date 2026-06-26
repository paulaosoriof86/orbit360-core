/* ============================================================
   Orbit 360 · Router + Shell wiring
   - Construye el sidebar desde Orbit.NAV
   - Navegación por hash (#/route)
   - Despacha a Orbit.modules[route].render(host) o a un placeholder
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};

Orbit.router = (function () {
  const U = Orbit.ui;
  let host, sidebar, current = null;

  // ---- estado de badges ----
  function badgeHtml(estado) {
    if (!estado) return '';
    const txt = { core: 'NÚCLEO', beta: 'BETA', road: 'PRÓX.' }[estado] || '';
    return `<span class="nav-badge ${estado}">${txt}</span>`;
  }

  // ---- sidebar ----
  function buildSidebar() {
    let h = '';
    const active = (r) => (!(Orbit.tenant && Orbit.tenant.isActive) || Orbit.tenant.isActive(r)) && (!(Orbit.session && Orbit.session.canSee) || Orbit.session.canSee(r));
    Orbit.NAV.forEach(blk => {
      if (blk.type === 'home') {
        if (!active(blk.route)) return;
        h += `<div class="nav-home"><div class="nav-link" data-route="${blk.route}">
          <span class="nav-ico">${blk.icon}</span><span class="nav-txt">${blk.label}</span></div></div>`;
      } else {
        const items = blk.items.filter(it => active(it.route));
        if (!items.length) return;
        const gid = 'g-' + blk.label.replace(/\s+/g, '');
        const col = blk.open ? '' : 'collapsed';
        h += `<div class="nav-group">
          <div class="nav-toggle" data-grp="${gid}">
            <span class="nav-label">${blk.label}</span>
            <span class="nav-arrow ${col}" id="${gid}-arr">▾</span>
          </div>
          <div class="nav-links ${col}" id="${gid}">`;
        items.forEach(it => {
          h += `<div class="nav-link" data-route="${it.route}">
            <span class="nav-ico">${it.icon}</span>
            <span class="nav-txt">${it.label}</span>
            ${badgeHtml(it.estado)}
          </div>`;
        });
        h += `</div></div>`;
      }
    });
    h += `<hr class="nav-divider">
      <div class="nav-foot">
        Marca de producto <b style="color:#fff">Orbit 360</b>.
        <div class="pwa"><span>📲</span><span>Instalable como <b>app (PWA)</b></span></div>
      </div>`;
    sidebar.innerHTML = h;

    sidebar.querySelectorAll('.nav-link').forEach(el =>
      el.addEventListener('click', () => go(el.dataset.route)));
    sidebar.querySelectorAll('.nav-toggle').forEach(el =>
      el.addEventListener('click', () => {
        const id = el.dataset.grp;
        document.getElementById(id).classList.toggle('collapsed');
        document.getElementById(id + '-arr').classList.toggle('collapsed');
      }));
  }

  function setActive(route) {
    sidebar.querySelectorAll('.nav-link').forEach(el =>
      el.classList.toggle('active', el.dataset.route === route));
  }

  // ---- placeholder para módulos no construidos ----
  function placeholder(route) {
    const m = Orbit.MODULE_META[route];
    if (!m) return `<div class="page"><div class="modstate"><div class="ms-ico">🚧</div>
      <h2>Módulo no encontrado</h2><p>La ruta <code>${U.esc(route)}</code> no existe.</p></div></div>`;
    const tag = { core: 'Núcleo', beta: 'En estabilización (Beta)', road: 'En roadmap' }[m.estado];
    return `<div class="page">
      <div class="page-head"><div>
        <div class="crumb"><b>Orbit 360</b> / ${U.esc(m.title)}</div>
        <div class="page-title">${m.icon} ${U.esc(m.title)}</div>
      </div><span class="badge ${m.estado === 'beta' ? 'info' : 'neutral'}">${tag}</span></div>
      <div class="modstate">
        <div class="ms-ico">${m.icon}</div>
        <h2>${U.esc(m.title)}</h2>
        <p>${U.esc(m.desc)}</p>
        <ul class="scope">${m.scope.map(s => `<li>${U.esc(s)}</li>`).join('')}</ul>
        <p style="margin-top:20px;font-size:13px" class="muted">Módulo en construcción según el plan del producto; el núcleo CRM está activo.</p>
      </div></div>`;
  }

  // ---- navegación ----
  function go(route) {
    if (!route) route = 'inicio';
    if (location.hash !== '#/' + route) { location.hash = '#/' + route; return; }
    render(route);
    closeMobile();
  }
  function parseQuery(qs) {
    const out = {};
    (qs || '').split('&').forEach(kv => { if (!kv) return; const [k, v] = kv.split('='); out[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return out;
  }
  function render(raw) {
    const [route, qs] = String(raw).split('?');
    Orbit.route = { key: route, params: parseQuery(qs) };
    current = route;
    setActive(route);
    const mod = Orbit.modules[route];
    host.scrollTop = 0;
    if (mod && typeof mod.render === 'function') {
      host.innerHTML = '';
      mod.render(host);
    } else {
      host.innerHTML = placeholder(route);
    }
    window.scrollTo(0, 0);
  }
  function onHash() {
    const r = (location.hash || '').replace(/^#\/?/, '') || 'inicio';
    render(r);
  }

  // ---- mobile ----
  function openMobile() { sidebar.classList.add('open'); document.querySelector('.sb-overlay').classList.add('show'); }
  function closeMobile() { sidebar.classList.remove('open'); document.querySelector('.sb-overlay').classList.remove('show'); }

  function init() {
    host = document.getElementById('host');
    sidebar = document.getElementById('sidebar');
    buildSidebar();
    try { if (Orbit.applyBrand) Orbit.applyBrand(); } catch (e) {}
    document.getElementById('burger').addEventListener('click', openMobile);
    document.querySelector('.sb-overlay').addEventListener('click', closeMobile);
    document.querySelectorAll('[data-home]').forEach(el => el.addEventListener('click', () => go('inicio')));
    window.addEventListener('hashchange', onHash);
    onHash();
  }
  return { init, go, rebuildSidebar: () => { try { buildSidebar(); setActive((Orbit.route && Orbit.route.key) || 'inicio'); } catch (e) {} } };
})();
