/* ============================================================
   Orbit 360 · Rootfix visual/runtime post-Auth · 2026-08-05
   - Mantiene sesión sin almacenar contraseñas.
   - Evita renders parciales durante la hidratación inicial.
   - Indexa Cliente 360 para eliminar barridos repetidos.
   - Añade detalles explícitos de vehículos, recibos y cobros.
   - Explica estados vacíos de Conciliaciones y Cancelaciones.
   - Añade diagnóstico read-only de Ops/Leads.
   - Corrige responsive transversal de títulos y KPI.
   Solo runtime Firestore. Sin escrituras automáticas ni datos tenant.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (Orbit.__visualRuntimeRootfixV20260805) return;
  Orbit.__visualRuntimeRootfixV20260805 = true;

  var VERSION = '20260805.1';
  var waiters = {};
  var installAttempts = 0;
  var summaryCache = null;
  var summaryCacheBuiltAt = 0;
  var SUMMARY_COLLECTIONS = ['clientes', 'polizas', 'cobros', 'comisiones'];
  var MODULE_DEPS = {
    inicio: ['clientes', 'polizas', 'cobros', 'asesores', 'aseguradoras'],
    aseguradoras: ['aseguradoras', 'asesores'],
    cliente360: ['clientes', 'asesores', 'aseguradoras', 'polizas', 'vehiculos', 'recibosEsperados', 'carteraPrimas', 'cobros', 'comisiones'],
    polizas: ['polizas', 'clientes', 'aseguradoras', 'asesores', 'vehiculos', 'recibosEsperados'],
    cobros: ['cobros', 'clientes', 'polizas', 'aseguradoras', 'asesores', 'vehiculos'],
    conciliaciones: ['cobros', 'clientes', 'polizas', 'recibosEsperados'],
    cancelaciones: ['cancelaciones', 'clientes', 'polizas', 'aseguradoras', 'asesores'],
    ops: ['negocios', 'gestiones', 'clientes', 'polizas', 'aseguradoras', 'asesores'],
    leads: ['negocios', 'gestiones', 'clientes', 'polizas', 'aseguradoras', 'asesores']
  };

  function text(value) { return String(value == null ? '' : value).trim(); }
  function esc(value) {
    try { return Orbit.ui && Orbit.ui.esc ? Orbit.ui.esc(text(value)) : text(value); }
    catch (error) { return text(value); }
  }
  function isFirestoreRuntime() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      return params.get('orbitBackend') === 'firestore-lab' || !!(window.OrbitBackend && /firestore/i.test(text(OrbitBackend.mode)));
    } catch (error) { return false; }
  }
  if (!isFirestoreRuntime()) return;

  function injectStyles() {
    if (document.getElementById('orbit-visual-rootfix-v20260805-css')) return;
    var style = document.createElement('style');
    style.id = 'orbit-visual-rootfix-v20260805-css';
    style.textContent = [
      '.lg-remember{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-2);cursor:pointer;user-select:none;margin:-2px 0 2px}',
      '.lg-remember input{width:16px;height:16px;accent-color:var(--red)}',
      '.orbit-load-state{min-height:280px;display:grid;place-items:center;padding:30px}',
      '.orbit-load-card{width:min(620px,94vw);padding:24px;text-align:center}',
      '.orbit-load-spin{width:34px;height:34px;border:3px solid var(--line);border-top-color:var(--red);border-radius:50%;animation:orbitRootfixSpin .8s linear infinite;margin:0 auto 13px}',
      '@keyframes orbitRootfixSpin{to{transform:rotate(360deg)}}',
      '.orbit-load-progress{height:7px;background:var(--surface);border-radius:99px;overflow:hidden;margin:14px auto 8px;max-width:340px}',
      '.orbit-load-progress i{display:block;height:100%;background:linear-gradient(90deg,var(--red),var(--red-700));border-radius:inherit}',
      '.orbit-explicit-detail{margin-left:6px}',
      '.orbit-vehicle-detail-card{cursor:pointer;transition:transform .14s ease,border-color .14s ease}',
      '.orbit-vehicle-detail-card:hover{transform:translateY(-1px);border-color:var(--red-line)}',
      '.orbit-diagnostic-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:11px 13px;margin:0 0 14px;border:1px solid var(--line);border-radius:12px;background:var(--card)}',
      '.orbit-diag-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}',
      '.orbit-diag-item{padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface)}',
      '.orbit-diag-item small{display:block;color:var(--ink-3);margin-top:3px}',
      '.orbit-empty-explained{padding:22px;text-align:center;border:1px dashed var(--line);border-radius:12px;background:var(--surface);margin:14px}',
      '@media(max-width:1100px){.page{padding:22px 18px 52px}.page-head{align-items:flex-start}.page-head>div{min-width:0;flex:1 1 320px}.page-title{font-size:clamp(21px,3vw,27px);min-width:0;overflow-wrap:anywhere}.page-sub{max-width:100%}.kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))!important}.tb-search{min-width:180px;margin-left:4px}}',
      '@media(max-width:760px){.page{padding:18px 12px 44px}.page-head{gap:10px}.page-title{font-size:20px;line-height:1.15}.page-title::before{height:22px}.kpi-row{grid-template-columns:1fr!important}.orbit-diag-grid{grid-template-columns:1fr}.tb-search{display:none}.lg-card{max-width:100%}}',
      '@media(max-width:520px){.page{padding-left:8px;padding-right:8px}.card{max-width:100%}.page-head .btn{width:100%}.orbit-diagnostic-bar .btn{width:100%}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function enhanceLogin() {
    var form = document.getElementById('login-form');
    if (!form) return;
    var dead = document.getElementById('lg-reset');
    if (dead) dead.remove();
    if (!document.getElementById('lg-remember')) {
      var submit = form.querySelector('button[type="submit"]');
      var label = document.createElement('label');
      label.className = 'lg-remember';
      label.innerHTML = '<input id="lg-remember" type="checkbox"> <span>Mantener sesión iniciada en este dispositivo</span>';
      if (submit) form.insertBefore(label, submit);
      else form.appendChild(label);
      var input = label.querySelector('input');
      try { input.checked = localStorage.getItem('orbit360_remember_session') === '1'; } catch (error) {}
      input.addEventListener('change', function () {
        try { localStorage.setItem('orbit360_remember_session', input.checked ? '1' : '0'); } catch (error) {}
      });
    }
  }

  function patchFirebasePersistence() {
    try {
      if (!window.firebase || typeof firebase.auth !== 'function' || !firebase.auth.Auth || !firebase.auth.Auth.Persistence) return false;
      var auth = firebase.auth();
      if (!auth || auth.__orbitRememberSessionV20260805 || typeof auth.setPersistence !== 'function') return !!(auth && auth.__orbitRememberSessionV20260805);
      var original = auth.setPersistence.bind(auth);
      auth.setPersistence = function () {
        var remember = false;
        var checkbox = document.getElementById('lg-remember');
        try { remember = checkbox ? checkbox.checked : localStorage.getItem('orbit360_remember_session') === '1'; } catch (error) {}
        var P = firebase.auth.Auth.Persistence;
        return original(remember ? P.LOCAL : P.SESSION);
      };
      auth.__orbitRememberSessionV20260805 = true;
      return true;
    } catch (error) { return false; }
  }

  function labStatus() {
    try { return Orbit.store && typeof Orbit.store._labStatus === 'function' ? (Orbit.store._labStatus() || {}) : {}; }
    catch (error) { return {}; }
  }
  function hydrationStatus(deps) {
    var status = labStatus();
    var raw = status.rawCounts || {};
    var errors = status.snapshotErrors || {};
    var seen = deps.filter(function (name) { return Object.prototype.hasOwnProperty.call(raw, name); });
    var missing = deps.filter(function (name) { return !Object.prototype.hasOwnProperty.call(raw, name); });
    var failed = deps.filter(function (name) { return !!errors[name]; });
    return { ready: missing.length === 0 && failed.length === 0, seen: seen, missing: missing, failed: failed, total: deps.length };
  }
  function loadingHtml(route, state) {
    var pct = state.total ? Math.round(state.seen.length / state.total * 100) : 0;
    var title = state.failed.length ? 'No fue posible completar la carga' : 'Preparando datos del módulo';
    var detail = state.failed.length
      ? 'Hay una colección que no respondió. Cierra sesión y vuelve a ingresar; si continúa, el diagnóstico debe corregir el acceso.'
      : 'La vista aparecerá una sola vez cuando sus datos estén completos. Así evitamos cifras parciales o cambiantes.';
    return '<div class="page orbit-load-state"><div class="card orbit-load-card"><div class="orbit-load-spin"></div><div class="crumb">' + esc(route) + '</div><h2 style="margin:0;font-family:var(--f-display)">' + title + '</h2><p class="muted">' + detail + '</p><div class="orbit-load-progress"><i style="width:' + pct + '%"></i></div><div class="muted" style="font-size:12px">' + state.seen.length + ' de ' + state.total + ' fuentes listas' + (state.missing.length ? ' · faltan ' + esc(state.missing.join(', ')) : '') + '</div></div></div>';
  }
  function requestRouteRefresh(moduleName) {
    if (waiters[moduleName]) return;
    var start = Date.now();
    var unsub = Orbit.store && typeof Orbit.store.on === 'function' ? Orbit.store.on('*', function () {
      var route = Orbit.route && Orbit.route.key;
      if (route !== moduleName) return;
      var state = hydrationStatus(MODULE_DEPS[moduleName] || []);
      if (state.ready || state.failed.length || Date.now() - start > 20000) {
        if (typeof unsub === 'function') unsub();
        delete waiters[moduleName];
        try { window.dispatchEvent(new HashChangeEvent('hashchange')); }
        catch (error) { window.dispatchEvent(new Event('hashchange')); }
      }
    }) : null;
    waiters[moduleName] = unsub || true;
    setTimeout(function () {
      if (!waiters[moduleName]) return;
      if (typeof unsub === 'function') unsub();
      delete waiters[moduleName];
      try { window.dispatchEvent(new HashChangeEvent('hashchange')); }
      catch (error) { window.dispatchEvent(new Event('hashchange')); }
    }, 20500);
  }

  function buildSummaryCache() {
    var clients = Orbit.store.all('clientes') || [];
    var policies = Orbit.store.all('polizas') || [];
    var payments = Orbit.store.all('cobros') || [];
    var commissions = Orbit.store.all('comisiones') || [];
    var polBy = new Map(), payBy = new Map(), comBy = new Map();
    function add(map, key, row) { if (!map.has(key)) map.set(key, []); map.get(key).push(row); }
    policies.forEach(function (row) { add(polBy, row.clienteId, row); });
    payments.forEach(function (row) { add(payBy, row.clienteId, row); });
    commissions.forEach(function (row) { add(comBy, row.clienteId, row); });
    var map = new Map();
    clients.forEach(function (cli) {
      var pol = polBy.get(cli.id) || [], cob = payBy.get(cli.id) || [], com = comBy.get(cli.id) || [];
      var vigentes = pol.filter(function (p) { return p.estado === 'Vigente' || p.estado === 'Por renovar'; });
      var primaAnual = vigentes.reduce(function (s, p) { return s + Number(p.prima || p.primaNeta || 0); }, 0);
      var cobrado = cob.filter(function (c) { return c.estado === 'Pagado'; }).reduce(function (s, c) { return s + Number(c.monto || 0); }, 0);
      var pendiente = cob.filter(function (c) { return c.estado === 'Pendiente'; }).reduce(function (s, c) { return s + Number(c.monto || 0); }, 0);
      var vencido = cob.filter(function (c) { return c.estado === 'Vencido'; }).reduce(function (s, c) { return s + Number(c.monto || 0); }, 0);
      var comisionGen = com.reduce(function (s, c) { return s + Number(c.monto || 0); }, 0);
      var salud = 70 + Math.min(20, vigentes.length * 6) - (vencido > 0 ? 25 : 0) + (cli.segmento === 'Premium' ? 8 : 0);
      map.set(cli.id, {
        cli: cli, pol: pol, cob: cob, com: com, moneda: cli.moneda || 'GTQ',
        nPolizas: pol.length, nVigentes: vigentes.length, primaAnual: primaAnual,
        cobrado: cobrado, pendiente: pendiente, vencido: vencido, comisionGen: comisionGen,
        porRenovar: pol.filter(function (p) { return p.estado === 'Por renovar'; }).length,
        salud: Math.max(8, Math.min(100, salud))
      });
    });
    summaryCache = map;
    summaryCacheBuiltAt = Date.now();
    return map;
  }
  function patchClientSummary() {
    if (!Orbit.q || Orbit.q.__summaryIndexV20260805) return;
    var original = Orbit.q.clienteResumen;
    Orbit.q.clienteResumen = function (clientId) {
      if (!summaryCache) buildSummaryCache();
      return summaryCache.get(clientId) || (typeof original === 'function' ? original(clientId) : null);
    };
    Orbit.q.clientesResumenIndex = function () { return summaryCache || buildSummaryCache(); };
    Orbit.q.__summaryIndexV20260805 = { version: VERSION, builtAt: function () { return summaryCacheBuiltAt; } };
    if (Orbit.store && typeof Orbit.store.on === 'function') {
      Orbit.store.on('*', function (collection) {
        if (collection === '*' || SUMMARY_COLLECTIONS.indexOf(collection) >= 0) summaryCache = null;
      });
    }
  }

  function openVehicleDetail(vehicleId) {
    var v = Orbit.store.get('vehiculos', vehicleId);
    if (!v) { if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast('No fue posible encontrar el vehículo seleccionado.'); return; }
    var p = Orbit.store.get('polizas', v.polizaId) || {};
    var c = Orbit.store.get('clientes', v.clienteId || p.clienteId) || {};
    var asg = Orbit.q && Orbit.q.aseguradora ? Orbit.q.aseguradora(p.aseguradoraId) || {} : {};
    var old = document.getElementById('orbit-vehicle-detail-v20260805'); if (old) old.remove();
    var back = document.createElement('div');
    back.id = 'orbit-vehicle-detail-v20260805'; back.className = 'drawer-back open'; back.style.cssText = 'display:grid;place-items:center;z-index:240';
    function row(label, value) { return '<div class="vp-row"><span class="vp-l">' + esc(label) + '</span><span class="vp-v">' + esc(value || '—') + '</span></div>'; }
    back.innerHTML = '<div class="card" style="width:min(660px,95vw);max-height:92vh;overflow:auto;padding:0"><div style="padding:18px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;gap:12px"><div><div class="crumb" style="color:rgba(255,255,255,.75)">Vehículo asegurado</div><b style="color:#fff;font-family:var(--f-display);font-size:19px">' + esc([v.marca, v.linea].filter(Boolean).join(' ') || 'Vehículo') + '</b><div class="mono" style="color:rgba(255,255,255,.82);margin-top:3px">' + esc(v.placa || 'Sin placa') + ' · ' + esc(v.anio || '—') + '</div></div><button class="imp-x" data-close style="color:#fff">✕</button></div><div style="padding:18px 20px"><div class="vp-grid">' + row('Cliente', c.nombre) + row('Póliza', p.numero) + row('Aseguradora', asg.nombre) + row('Estado', p.estado) + row('Marca', v.marca) + row('Línea', v.linea) + row('Modelo / año', v.anio) + row('Color', v.color) + row('Uso', v.uso) + row('Placa', v.placa) + row('Chasis (VIN)', v.chasis) + row('Motor', v.motor) + '</div></div><div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" data-close>Cerrar</button>' + (p.id ? '<button class="btn primary" data-policy="' + esc(p.id) + '">Ver póliza</button>' : '') + '</div></div>';
    document.body.appendChild(back);
    function close() { back.remove(); }
    back.querySelectorAll('[data-close]').forEach(function (button) { button.addEventListener('click', close); });
    back.addEventListener('click', function (event) { if (event.target === back) close(); });
    var policy = back.querySelector('[data-policy]');
    if (policy) policy.addEventListener('click', function () { close(); if (Orbit.modules.cliente360 && Orbit.modules.cliente360.verPoliza) Orbit.modules.cliente360.verPoliza(policy.dataset.policy); });
  }

  function enhanceVehicleDetails(host) {
    if (!host || !Orbit.route || Orbit.route.key !== 'cliente360' || !(Orbit.route.params && Orbit.route.params.c)) return;
    if (Orbit.modules.cliente360 && !Orbit.modules.cliente360.verVehiculo) Orbit.modules.cliente360.verVehiculo = openVehicleDetail;
    var vehicles = Orbit.q && Orbit.q.vehiculosDe ? Orbit.q.vehiculosDe(Orbit.route.params.c) || [] : [];
    var cards = Array.prototype.slice.call(host.querySelectorAll('.card.pad')).filter(function (card) { return /Chasis \(VIN\)/i.test(card.textContent || ''); });
    cards.forEach(function (card) {
      if (card.dataset.vehicleDetailBound === '1') return;
      var match = vehicles.find(function (v) { return v.placa && (card.textContent || '').indexOf(v.placa) >= 0; });
      if (!match) return;
      card.dataset.vehicleDetailBound = '1'; card.classList.add('orbit-vehicle-detail-card');
      var button = document.createElement('button'); button.type = 'button'; button.className = 'btn primary sm'; button.textContent = 'Ver detalle';
      button.addEventListener('click', function (event) { event.stopPropagation(); openVehicleDetail(match.id); });
      var action = Array.prototype.slice.call(card.querySelectorAll('div')).find(function (node) { return /Ver póliza/i.test(node.textContent || ''); });
      (action || card).appendChild(button);
      card.addEventListener('click', function (event) { if (!event.target.closest('button,a,input,select,textarea')) openVehicleDetail(match.id); });
    });
  }

  function enhanceExplicitDetails(host) {
    if (!host) return;
    host.querySelectorAll('tr.clickable[onclick*="Orbit.modules.cobros.detalle"]').forEach(function (row) {
      if (row.dataset.explicitCobroDetail === '1') return;
      var raw = row.getAttribute('onclick') || '';
      var match = raw.match(/cobros\.detalle\(['\"]([^'\"]+)['\"]\)/);
      if (!match) return;
      row.dataset.explicitCobroDetail = '1';
      var cell = row.lastElementChild || document.createElement('td');
      if (!row.lastElementChild) row.appendChild(cell);
      var button = document.createElement('button'); button.type = 'button'; button.className = 'btn ghost sm orbit-explicit-detail'; button.textContent = 'Ver detalle';
      button.addEventListener('click', function (event) { event.preventDefault(); event.stopPropagation(); if (Orbit.modules.cobros && Orbit.modules.cobros.detalle) Orbit.modules.cobros.detalle(match[1]); });
      cell.appendChild(button);
    });
  }

  function explainEmptyStates(moduleName, host) {
    if (!host) return;
    if (moduleName === 'conciliaciones') {
      var body = host.querySelector('tbody');
      var noRows = !body || body.querySelectorAll('tr').length === 0 || /Sin propuestas|Sin conciliaciones/i.test(body.textContent || '');
      if (noRows && !host.querySelector('[data-orbit-conc-empty]')) {
        var note = document.createElement('div'); note.setAttribute('data-orbit-conc-empty', '1'); note.className = 'orbit-empty-explained';
        note.innerHTML = '<b>No hay conciliaciones activas para revisión</b><div class="muted" style="margin-top:6px">Los pagos reportados que todavía no tienen una relación única con un recibo permanecen protegidos y no se muestran como cobros confirmados.</div><button class="btn ghost sm" style="margin-top:12px" onclick="location.hash=\'#/cobros\'">Ver cobros y cartera</button>';
        var page = host.querySelector('.page') || host; page.appendChild(note);
      }
    }
    if (moduleName === 'cancelaciones') {
      var rows = Orbit.store.all('cancelaciones') || [];
      if (!rows.length && !host.querySelector('[data-orbit-cancel-empty]')) {
        var note2 = document.createElement('div'); note2.setAttribute('data-orbit-cancel-empty', '1'); note2.className = 'orbit-empty-explained';
        note2.innerHTML = '<b>No hay cancelaciones registradas en el corte activo</b><div class="muted" style="margin-top:6px">El módulo está disponible y mostrará el histórico cuando existan registros de cancelación vinculados a pólizas.</div>';
        var banner = host.querySelector('.page'); if (banner) banner.appendChild(note2);
      }
    }
  }

  function diagnosticResult(moduleName) {
    var checks = [];
    function add(id, ok, detail, level) { checks.push({ id: id, ok: !!ok, detail: detail, level: level || (ok ? 'PASS' : 'FAIL') }); }
    var status = Orbit.workflowDomain && Orbit.workflowDomain.status ? Orbit.workflowDomain.status() : {};
    var bridge = Orbit.opsLeadsDomainBridge && Orbit.opsLeadsDomainBridge.status ? Orbit.opsLeadsDomainBridge.status() : {};
    var businesses = Orbit.store.all('negocios') || [];
    var managements = Orbit.store.all('gestiones') || [];
    var clients = new Set((Orbit.store.all('clientes') || []).map(function (row) { return text(row.id); }));
    var advisors = new Set((Orbit.store.all('asesores') || []).map(function (row) { return text(row.id); }));
    var duplicateBusinesses = businesses.length - new Set(businesses.map(function (row) { return text(row.id); })).size;
    var duplicateManagements = managements.length - new Set(managements.map(function (row) { return text(row.id); })).size;
    var orphanClients = businesses.concat(managements).filter(function (row) { return row.clienteId && !clients.has(text(row.clienteId)); }).length;
    var orphanAdvisors = businesses.concat(managements).filter(function (row) { return row.asesorId && !advisors.has(text(row.asesorId)); }).length;
    var boardOk = false, boardCount = 0;
    try {
      var board = moduleName === 'ops' ? Orbit.ciclo.opsBoard() : Orbit.ciclo.leadsBoard();
      boardCount = (board || []).reduce(function (sum, col) { return sum + ((col && col.items) || []).length; }, 0);
      boardOk = Array.isArray(board);
    } catch (error) {}
    var hydration = hydrationStatus(MODULE_DEPS[moduleName] || []);
    var syncErrors = (window.OrbitBackend && Array.isArray(OrbitBackend.workflowSyncErrors)) ? OrbitBackend.workflowSyncErrors.length : 0;
    add('Hidratación', hydration.ready, hydration.ready ? hydration.total + '/' + hydration.total + ' fuentes listas' : 'Faltan: ' + hydration.missing.join(', '));
    add('Backend de dominio', status.available === true, status.available ? 'Callable disponible' : 'No disponible en esta sesión', status.available ? 'PASS' : 'WARN');
    add('Bridge de sincronización', bridge.primed === true, bridge.primed ? 'Inicializado · pendientes ' + Number(bridge.pending || 0) : 'No inicializado');
    add('Proyección del tablero', boardOk, boardCount + ' tarjetas proyectadas');
    add('IDs únicos', duplicateBusinesses === 0 && duplicateManagements === 0, duplicateBusinesses + duplicateManagements + ' duplicados');
    add('Referencias de clientes', orphanClients === 0, orphanClients + ' referencias sin cliente', orphanClients ? 'WARN' : 'PASS');
    add('Referencias de responsables', orphanAdvisors === 0, orphanAdvisors + ' referencias sin responsable', orphanAdvisors ? 'WARN' : 'PASS');
    add('Errores de sincronización', syncErrors === 0, syncErrors + ' errores registrados', syncErrors ? 'WARN' : 'PASS');
    var failures = checks.filter(function (c) { return c.level === 'FAIL'; }).length;
    var warnings = checks.filter(function (c) { return c.level === 'WARN'; }).length;
    return { checks: checks, failures: failures, warnings: warnings, businesses: businesses.length, managements: managements.length, boardCount: boardCount, writes: 0 };
  }

  function showDiagnostic(moduleName) {
    var result = diagnosticResult(moduleName);
    var old = document.getElementById('orbit-live-diagnostic-v20260805'); if (old) old.remove();
    var back = document.createElement('div'); back.id = 'orbit-live-diagnostic-v20260805'; back.className = 'drawer-back open'; back.style.cssText = 'display:grid;place-items:center;z-index:250';
    var headline = result.failures ? 'Requiere corrección' : result.warnings ? 'Operativo con advertencias' : 'Prueba aprobada';
    var tone = result.failures ? 'danger' : result.warnings ? 'warn' : 'ok';
    back.innerHTML = '<div class="card" style="width:min(760px,95vw);max-height:92vh;overflow:auto;padding:0"><div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px"><div><div class="crumb">Prueba en vivo · ' + esc(moduleName === 'ops' ? 'Orbit Ops' : 'Orbit Leads') + '</div><b style="font-family:var(--f-display);font-size:18px">' + headline + '</b></div><button class="imp-x" data-close>✕</button></div><div style="padding:18px 20px"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><span class="badge ' + tone + '">' + (result.failures ? result.failures + ' fallos' : result.warnings ? result.warnings + ' advertencias' : 'PASS') + '</span><span class="badge neutral">Negocios ' + result.businesses + '</span><span class="badge neutral">Gestiones ' + result.managements + '</span><span class="badge neutral">Tarjetas ' + result.boardCount + '</span></div><div class="orbit-diag-grid">' + result.checks.map(function (check) { var cls = check.level === 'FAIL' ? 'danger' : check.level === 'WARN' ? 'warn' : 'ok'; return '<div class="orbit-diag-item"><span class="badge ' + cls + '">' + check.level + '</span><b style="display:block;margin-top:7px">' + esc(check.id) + '</b><small>' + esc(check.detail) + '</small></div>'; }).join('') + '</div><div class="cfg-note" style="margin-top:14px"><b>Prueba read-only:</b> se verificaron datos, referencias, proyección, bridge y disponibilidad. Escrituras realizadas: 0.</div></div><div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;justify-content:flex-end"><button class="btn primary" data-close>Cerrar</button></div></div>';
    document.body.appendChild(back);
    function close() { back.remove(); }
    back.querySelectorAll('[data-close]').forEach(function (button) { button.addEventListener('click', close); });
    back.addEventListener('click', function (event) { if (event.target === back) close(); });
  }

  function enhanceDiagnostics(moduleName, host) {
    if (!host || (moduleName !== 'ops' && moduleName !== 'leads') || host.querySelector('[data-orbit-live-diagnostic]')) return;
    var bar = document.createElement('div'); bar.className = 'orbit-diagnostic-bar'; bar.setAttribute('data-orbit-live-diagnostic', moduleName);
    bar.innerHTML = '<div><b>Prueba operativa</b><div class="muted" style="font-size:12px">Valida datos, referencias, sincronización y proyección sin crear registros.</div></div><button class="btn primary" type="button">▶ Ejecutar prueba en vivo</button>';
    var page = host.querySelector('.page') || host;
    var reference = page.children[1] || null;
    page.insertBefore(bar, reference);
    bar.querySelector('button').addEventListener('click', function () { showDiagnostic(moduleName); });
  }

  function afterRender(moduleName, host) {
    enhanceExplicitDetails(host);
    if (moduleName === 'cliente360') enhanceVehicleDetails(host);
    if (moduleName === 'ops' || moduleName === 'leads') enhanceDiagnostics(moduleName, host);
    if (moduleName === 'conciliaciones' || moduleName === 'cancelaciones') explainEmptyStates(moduleName, host);
  }

  function wrapModule(moduleName, deps) {
    var mod = Orbit.modules && Orbit.modules[moduleName];
    if (!mod || typeof mod.render !== 'function' || mod.__visualRootfixV20260805) return false;
    var original = mod.render.bind(mod);
    mod.render = function (host) {
      var state = hydrationStatus(deps || []);
      if (!state.ready) {
        host.innerHTML = loadingHtml(moduleName, state);
        requestRouteRefresh(moduleName);
        return;
      }
      var started = performance && performance.now ? performance.now() : Date.now();
      var output = original(host);
      var elapsed = Math.round((performance && performance.now ? performance.now() : Date.now()) - started);
      window.OrbitRuntimeDiagnostics = window.OrbitRuntimeDiagnostics || {};
      OrbitRuntimeDiagnostics[moduleName] = { version: VERSION, renderMs: elapsed, at: new Date().toISOString(), hydrated: true };
      afterRender(moduleName, host);
      setTimeout(function () { afterRender(moduleName, host); }, 0);
      return output;
    };
    mod.__visualRootfixV20260805 = { version: VERSION, original: original, deps: deps.slice() };
    return true;
  }

  function install() {
    injectStyles(); enhanceLogin(); patchFirebasePersistence();
    if (!Orbit.store || !Orbit.q || !Orbit.modules) return false;
    patchClientSummary();
    var wrapped = 0;
    Object.keys(MODULE_DEPS).forEach(function (name) { if (wrapModule(name, MODULE_DEPS[name])) wrapped += 1; });
    if (wrapped && document.body && !document.body.dataset.visualRootfixV20260805) {
      document.body.dataset.visualRootfixV20260805 = VERSION;
      setTimeout(function () {
        if (document.body.classList.contains('pre-auth')) return;
        try { window.dispatchEvent(new HashChangeEvent('hashchange')); }
        catch (error) { window.dispatchEvent(new Event('hashchange')); }
      }, 50);
    }
    return wrapped > 0;
  }

  injectStyles(); enhanceLogin();
  var observer = new MutationObserver(function () { enhanceLogin(); patchFirebasePersistence(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  (function boot() {
    installAttempts += 1;
    var done = install();
    if (!done || installAttempts < 180) setTimeout(boot, done ? 500 : 100);
  })();
})();
