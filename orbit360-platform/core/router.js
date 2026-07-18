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
  let host, sidebar, current = null, storeRefreshTimer = null, storeRefreshUnsub = null;
  const REACTIVE_COLLECTIONS = {
    cliente360: ['clientes', 'asesores', 'polizas', 'cobros', 'vehiculos'],
    aseguradoras: ['aseguradoras', 'asesores'],
    polizas: ['polizas', 'clientes', 'aseguradoras', 'vehiculos'],
    cobros: ['cobros', 'clientes', 'polizas'],
    conciliaciones: ['cobros', 'polizas', 'clientes', 'finmovs'],
    renovaciones: ['polizas', 'clientes', 'gestiones'],
    comisiones: ['comisiones', 'polizas', 'clientes'],
    calidad: ['clientes', 'polizas', 'asesores']
  };

  // ---- estado de badges ----
  function badgeHtml(estado) {
    if (!estado) return '';
    // Modo cliente/implementación: ocultar badges técnicos (NÚCLEO/BETA/PRÓX.)
    let hide = false; try { hide = !!(Orbit.tenant && Orbit.tenant.get && Orbit.tenant.get().hideTechnicalBadges); } catch (e) {}
    if (hide) return '';
    const txt = { core: 'NÚCLEO', beta: 'BETA', road: 'PRÓX.' }[estado] || '';
    return `<span class="nav-badge ${estado}">${txt}</span>`;
  }

  // ---- sidebar ----
  function buildSidebar() {
    let h = '';
    const active = (r) => (window.Orbit && Orbit.access && Orbit.access.can) ? Orbit.access.can(r, 'view') : ((window.Orbit && Orbit.accessScope && Orbit.accessScope.puedeVerModulo) ? Orbit.accessScope.puedeVerModulo(r) : ((!(Orbit.tenant && Orbit.tenant.isActive) || Orbit.tenant.isActive(r)) && (!(Orbit.session && Orbit.session.canSee) || Orbit.session.canSee(r))));
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
  }
  function parseQuery(qs) {
    const out = {};
    (qs || '').split('&').forEach(kv => { if (!kv) return; const [k, v] = kv.split('='); out[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return out;
  }
  function render(raw, options) {
    const [route, qs] = String(raw).split('?');
    Orbit.route = { key: route, params: parseQuery(qs) };
    current = route;
    setActive(route);
    closeMobile(); // toda navegación real (tap de un item del menú en móvil) debe cerrar el overlay
    const active = (r) => (window.Orbit && Orbit.access && Orbit.access.can) ? Orbit.access.can(r, 'view') : ((window.Orbit && Orbit.accessScope && Orbit.accessScope.puedeVerModulo) ? Orbit.accessScope.puedeVerModulo(r) : ((!(Orbit.tenant && Orbit.tenant.isActive) || Orbit.tenant.isActive(r)) && (!(Orbit.session && Orbit.session.canSee) || Orbit.session.canSee(r))));
    const preserveScroll = options && options.preserveScroll;
    const previousScroll = preserveScroll ? window.scrollY : 0;
    host.scrollTop = 0;
    if (route !== 'inicio' && !active(route)) {
      host.innerHTML = `<div class="page"><div class="modstate"><div class="ms-ico">🔒</div>
        <h2>No tienes acceso con el rol activo</h2>
        <p>Tu rol activo no incluye este módulo. Si crees que deberías tenerlo, pedile a Dirección/Admin que lo habilite desde Configuración → Usuarios y permisos.</p>
        <button class="btn primary" style="margin-top:14px" onclick="location.hash='#/inicio'">‹ Volver a Inicio</button>
      </div></div>`;
      return;
    }
    const mod = Orbit.modules[route];
    if (mod && typeof mod.render === 'function') {
      host.innerHTML = '';
      mod.render(host);
    } else {
      host.innerHTML = placeholder(route);
    }
    if (preserveScroll) window.scrollTo(0, previousScroll);
    else window.scrollTo(0, 0);
  }
  function onHash() {
    const r = (location.hash || '').replace(/^#\/?/, '') || 'inicio';
    render(r);
  }

  function wireStoreRefresh() {
    if (storeRefreshUnsub || !Orbit.store || typeof Orbit.store.on !== 'function') return;
    storeRefreshUnsub = Orbit.store.on('*', function (collection) {
      const routeAtEvent = current;
      const deps = REACTIVE_COLLECTIONS[routeAtEvent];
      if (!deps) return;
      if (collection && collection !== '*' && deps.indexOf(collection) < 0) return;
      if (storeRefreshTimer) clearTimeout(storeRefreshTimer);
      storeRefreshTimer = setTimeout(function () {
        storeRefreshTimer = null;
        if (routeAtEvent !== current) return;
        render((location.hash || '').replace(/^#\/?/, '') || 'inicio', { preserveScroll: true });
      }, 140);
    });
  }

  // ---- mobile owner ----
  function isMobile() { return !!(window.matchMedia && window.matchMedia('(max-width:980px)').matches); }
  function paintMobile(open) {
    const overlay = document.querySelector('.sb-overlay');
    if (!sidebar || !overlay) return;
    sidebar.classList.toggle('open', !!open);
    overlay.classList.toggle('show', !!open);
    document.body.classList.toggle('sb-open', !!open);
    const burger = document.getElementById('burger');
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function openMobile() { if (isMobile()) paintMobile(true); }
  function closeMobile() { paintMobile(false); }
  function toggleMobile() { if (isMobile()) paintMobile(!sidebar.classList.contains('open')); }

  const runtimeContractState = {};
  const RUNTIME_CONTRACTS = [
    { src: 'core/session-multirol-visibility-v20260716.js?v=20260716-2', marker: 'data-orbit-multirol-runtime-v20260716', ready: () => Orbit.session && Orbit.session.__multirolVisibilityV20260716 },
    { src: 'core/client-canonical-view-projection-v20260716.js?v=20260717-2', marker: 'data-orbit-client-projection-runtime-v20260716', ready: () => Orbit.clientProjection && Orbit.clientProjection.get },
    { src: 'core/tenant-insurer-config-p10.js?v=20260717-1', marker: 'data-orbit-tenant-insurer-config-core-v20260717', ready: () => Orbit.tenantInsurerConfigP10 && typeof Orbit.tenantInsurerConfigP10.registerTenantConfig === 'function' },
    { src: 'data/tenant-runtime-config-index.js?v=20260717-1', marker: 'data-orbit-tenant-runtime-index-v20260717', ready: () => window.OrbitTenantRuntimeConfigIndex },
    {
      src: () => {
        let tenantId = '';
        try {
          const cfg = Orbit.tenant && Orbit.tenant.get ? (Orbit.tenant.get() || {}) : {};
          tenantId = String((window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)) || cfg.tenantId || cfg.id || '').trim();
        } catch (e) {}
        const index = window.OrbitTenantRuntimeConfigIndex || {};
        return index[tenantId] && index[tenantId].insurerConfigSrc || '';
      },
      marker: 'data-orbit-tenant-insurer-config-active-v20260717',
      ready: () => {
        let tenantId = '';
        try {
          const cfg = Orbit.tenant && Orbit.tenant.get ? (Orbit.tenant.get() || {}) : {};
          tenantId = String((window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)) || cfg.tenantId || cfg.id || '').trim();
        } catch (e) {}
        return [].concat(window.OrbitTenantInsurerConfigsP10 || []).some(item => item && item.tenantId === tenantId);
      }
    }
  ];

  function contractReady(item) {
    try { return !item.ready || !!item.ready(); } catch (e) { return false; }
  }

  function runtimeSignal(code, detail) {
    try { console.log('ORBIT360_RUNTIME_SIGNAL:' + code + (detail ? ':' + detail : '')); } catch (e) {}
  }

  function loadRuntimeContracts(done) {
    let pos = 0;
    function next() {
      if (pos >= RUNTIME_CONTRACTS.length) { done(); return; }
      const item = RUNTIME_CONTRACTS[pos++];
      const src = typeof item.src === 'function' ? item.src() : item.src;
      const state = runtimeContractState[item.marker] = {
        src: src || '',
        status: 'pending',
        ready: contractReady(item),
        startedAt: Date.now()
      };
      if (state.ready) {
        state.status = 'ready'; state.finishedAt = Date.now();
        runtimeSignal('contract-ready', item.marker);
        next(); return;
      }
      if (!src) {
        state.status = 'no-source'; state.finishedAt = Date.now();
        runtimeSignal('contract-terminal', item.marker + ':no-source');
        next(); return;
      }

      let settled = false;
      let poll = null;
      let cutoff = null;
      let markerNode = document.querySelector('script[' + item.marker + ']');
      function finish(status) {
        if (settled) return;
        settled = true;
        if (poll) clearInterval(poll);
        if (cutoff) clearTimeout(cutoff);
        state.status = status;
        state.ready = contractReady(item);
        state.finishedAt = Date.now();
        runtimeSignal(state.ready ? 'contract-ready' : 'contract-terminal', item.marker + (state.ready ? '' : ':' + status));
        next();
      }
      function checkReady() {
        if (contractReady(item)) finish('ready');
      }
      function ensureMarker() {
        if (markerNode) return markerNode;
        markerNode = document.createElement('script');
        markerNode.type = 'application/json';
        markerNode.setAttribute(item.marker, '1');
        markerNode.setAttribute('data-orbit-runtime-owner', 'router');
        markerNode.textContent = '{}';
        document.head.appendChild(markerNode);
        return markerNode;
      }
      function loadDeterministically() {
        const target = new URL(src, window.location.href);
        if (target.origin !== window.location.origin) {
          state.errorCode = 'cross-origin';
          runtimeSignal('contract-load-error', item.marker);
          finish('cross-origin');
          return;
        }
        ensureMarker();
        state.status = 'importing';
        state.executionMode = 'dynamic-import';
        runtimeSignal('contract-requested', item.marker);
        import(target.href).then(function () {
          if (settled) return;
          state.loadEvent = true;
          runtimeSignal('contract-loaded', item.marker);
          checkReady();
        }).catch(function (error) {
          if (settled) return;
          state.errorEvent = true;
          state.errorCode = String(error && (error.name || error.message) || 'load-error').replace(/[^a-z0-9_-]/gi, '').slice(0, 80);
          runtimeSignal('contract-load-error', item.marker);
          finish('error');
        });
      }

      poll = setInterval(checkReady, 100);
      cutoff = setTimeout(function () {
        finish(contractReady(item) ? 'ready' : 'timeout');
      }, 15000);
      loadDeterministically();
      checkReady();
    }
    next();
  }

  function start() {
    buildSidebar();
    try { if (Orbit.applyBrand) Orbit.applyBrand(); } catch (e) {}
    const burger = document.getElementById('burger');
    const overlay = document.querySelector('.sb-overlay');
    if (burger) burger.addEventListener('click', function (event) {
      if (!isMobile()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleMobile();
    }, true);
    if (overlay) overlay.addEventListener('click', function (event) {
      if (!isMobile()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMobile();
    }, true);
    document.querySelectorAll('[data-home]').forEach(el => el.addEventListener('click', () => go('inicio')));
    wireGlobalSearch();
    wireStoreRefresh();
    window.addEventListener('resize', function () { if (!isMobile()) closeMobile(); });
    window.addEventListener('hashchange', onHash);
    onHash();
    runtimeSignal('router-ready', '1');
  }

  function init() {
    host = document.getElementById('host');
    sidebar = document.getElementById('sidebar');
    let started = false;
    function begin() {
      if (started) return;
      started = true;
      loadRuntimeContracts(start);
    }
    const pwaReady = window.OrbitPwaWorkerReady;
    if (!pwaReady || typeof pwaReady.then !== 'function') {
      runtimeContractState.__pwa = { status: 'unavailable', controlled: false };
      runtimeSignal('pwa-ready', 'unavailable');
      begin();
      return;
    }
    Promise.race([
      pwaReady,
      new Promise(resolve => setTimeout(() => resolve({ status: 'timeout', controlled: false }), 20000))
    ]).then(function (state) {
      const status = state && state.controlled ? 'controlled' : String(state && state.status || 'uncontrolled');
      runtimeContractState.__pwa = { status: status, controlled: status === 'controlled' };
      runtimeSignal('pwa-ready', status);
      begin();
    }).catch(function () {
      runtimeContractState.__pwa = { status: 'error', controlled: false };
      runtimeSignal('pwa-ready', 'error');
      begin();
    });
  }

  function wireGlobalSearch() {
    const box = document.querySelector('.tb-search'); if (!box) return;
    const inp = box.querySelector('input'); if (!inp) return;
    let dd = document.getElementById('tb-search-dd');
    if (!dd) { dd = document.createElement('div'); dd.id = 'tb-search-dd'; dd.className = 'tb-search-dd'; box.appendChild(dd); }
    const S = Orbit.store, U = Orbit.ui;
    const clientView = id => (Orbit.clientProjection && Orbit.clientProjection.get ? Orbit.clientProjection.get(id) : S.get('clientes', id));
    function buscar(qstr) {
      const t = qstr.trim().toLowerCase(); if (t.length < 2) { dd.classList.remove('open'); dd.innerHTML = ''; return; }
      const res = [];
      S.all('clientes').forEach(raw => { const c = Orbit.clientProjection && Orbit.clientProjection.project ? Orbit.clientProjection.project(raw) : raw; if (((c.nombre || '') + ' ' + (c.identificacion || '') + ' ' + (c.email || '') + ' ' + (c.telefono || '')).toLowerCase().includes(t)) res.push({ ic: '🧑', t: c.nombre || 'Cliente', s: 'Cliente · ' + (c.identificacion || c.tipo || ''), go: '#/cliente360?c=' + c.id }); });
      S.all('polizas').forEach(p => { const veh = S.all('vehiculos').find(v => v.polizaId === p.id); const placa = (veh && veh.placa) || p.placa || ''; const cli = clientView(p.clienteId); if ((p.numero + ' ' + p.producto + ' ' + placa + ' ' + (cli ? cli.nombre : '') + ' ' + (veh ? veh.marca + ' ' + veh.linea : '')).toLowerCase().includes(t)) res.push({ ic: '📑', t: p.numero + (placa ? ' · ' + placa : ''), s: 'Póliza · ' + p.ramo + (cli ? ' · ' + cli.nombre : ''), go: '#/cliente360?c=' + p.clienteId }); });
      S.all('vehiculos').forEach(v => { if (((v.placa || '') + ' ' + (v.marca || '') + ' ' + (v.linea || '')).toLowerCase().includes(t)) { const cli = clientView(v.clienteId); res.push({ ic: '🚗', t: (v.placa || (v.marca + ' ' + v.linea)), s: 'Vehículo · ' + v.marca + ' ' + v.linea + (cli ? ' · ' + cli.nombre : ''), go: '#/cliente360?c=' + v.clienteId }); } });
      S.all('cobros').forEach(cb => { const cli = clientView(cb.clienteId); if (((cli ? cli.nombre : '') + ' ' + (cb.numeroRecibo || '')).toLowerCase().includes(t)) res.push({ ic: '💳', t: (cb.numeroRecibo || 'Recibo') + ' · ' + U.money(cb.monto || 0, cb.moneda), s: 'Cobro · ' + cb.estado + (cli ? ' · ' + cli.nombre : ''), go: '#/cliente360?c=' + cb.clienteId }); });
      S.all('aseguradoras').forEach(a => { if ((a.nombre || '').toLowerCase().includes(t)) res.push({ ic: '🏛️', t: a.nombre, s: 'Aseguradora · ' + (a.pais || ''), go: '#/aseguradoras' }); });
      const top = res.slice(0, 12);
      dd.innerHTML = top.length ? top.map(r => `<button class="tb-sr" data-go="${r.go}"><span>${r.ic}</span><span class="tb-sr-t">${U.esc(r.t)}<small>${U.esc(r.s)}</small></span></button>`).join('') + (res.length > 12 ? `<div class="tb-sr-more">+${res.length - 12} más…</div>` : '') : '<div class="tb-sr-empty">Sin resultados para "' + U.esc(qstr) + '"</div>';
      dd.classList.add('open');
      dd.querySelectorAll('[data-go]').forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); location.hash = b.dataset.go; dd.classList.remove('open'); inp.value = ''; }));
    }
    inp.addEventListener('input', () => buscar(inp.value));
    inp.addEventListener('focus', () => { if (inp.value.trim().length >= 2) buscar(inp.value); });
    inp.addEventListener('blur', () => setTimeout(() => dd.classList.remove('open'), 180));
  }
  return { init, go, loadRuntimeContracts, runtimeContractState, rebuildSidebar: () => { try { buildSidebar(); setActive((Orbit.route && Orbit.route.key) || 'inicio'); } catch (e) {} } };
})();
