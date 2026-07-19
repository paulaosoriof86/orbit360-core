/* ============================================================
   Orbit 360 · integridad visual reusable M1 · 2026-07-19

   Reparación aditiva, sin renderer alterno y sin escritura de datos:
   - controles responsive visibles;
   - estados honestos cuando no hay pólizas/cartera;
   - reemplazo de fechas inválidas y copy técnico visible;
   - recuperación de la vista si un importador se cierra sin resultado.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (Orbit.m1VisualIntegrity && Orbit.m1VisualIntegrity.version === '20260719.1') return;

  var hostObserver = null;
  var bodyObserver = null;
  var renderRecoveryTimer = null;

  function text(value) { return String(value == null ? '' : value); }
  function routeKey() {
    try { return Orbit.route && Orbit.route.key ? String(Orbit.route.key) : ''; }
    catch (error) { return ''; }
  }
  function currentClient() {
    try {
      var id = Orbit.route && Orbit.route.params && Orbit.route.params.c;
      return id && Orbit.clientProjection && Orbit.clientProjection.get ? Orbit.clientProjection.get(id) : null;
    } catch (error) { return null; }
  }
  function policyCount(clientId) {
    try { return (Orbit.store.where('polizas', function (row) { return row.clienteId === clientId; }) || []).length; }
    catch (error) { return 0; }
  }
  function replaceTextNodes(root, pattern, replacement) {
    if (!root || !window.NodeFilter) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (pattern.test(text(node.nodeValue))) node.nodeValue = text(node.nodeValue).replace(pattern, replacement);
    });
  }
  function injectStyle() {
    if (document.getElementById('orbit-m1-visual-integrity-style')) return;
    var style = document.createElement('style');
    style.id = 'orbit-m1-visual-integrity-style';
    style.textContent = [
      '@media (max-width:980px){',
      '.topbar{flex-wrap:wrap;height:auto;min-height:64px;padding-bottom:8px}',
      '.tb-search{display:flex!important;order:20;width:min(100%,520px);margin-left:52px;flex:1 1 320px}',
      '.tb-rol{display:flex!important;order:12}',
      '#rol-sel{max-width:132px}',
      '#host #f-q{display:block!important;min-width:180px}',
      '}',
      '@media (max-width:600px){',
      '.tb-search{margin-left:0;order:30;width:100%;flex-basis:100%}',
      '.tb-search input{min-width:0;width:100%}',
      '.tb-rol{margin-left:auto}',
      '.tb-switch{display:none}',
      '.fh-salud-in [data-pending-quality]{font-size:11px!important;line-height:1.1}',
      '}',
      '.orbit-m1-pending{color:var(--ink-2)!important}',
      '.orbit-m1-no-data{background:#f4f1ec!important;color:var(--ink-2)!important}',
      '.orbit-m1-filter-note{font-size:11px;color:var(--ink-3);margin-left:auto}',
      '.orbit-m1-recovery{min-height:240px;display:grid;place-items:center;color:var(--ink-3)}'
    ].join('');
    document.head.appendChild(style);
  }
  function patchTechnicalCopy(root) {
    root = root || document;
    replaceTextNodes(root, /Usuario entorno de validación/gi, 'Usuario del equipo');
    replaceTextNodes(root, /usuario entorno de validación autorizado para ejecutar el dry-run/gi, 'usuario autorizado por administración');
    replaceTextNodes(root, /ejecutar el dry-run/gi, 'continuar con el acceso');
    replaceTextNodes(root, /dry-run/gi, 'revisión previa');
  }
  function patchClientList(host) {
    var rows = host.querySelectorAll('table.tbl tbody tr.clickable');
    rows.forEach(function (row) {
      var cells = row.querySelectorAll('td');
      if (!cells.length) return;
      var policies = 0;
      cells.forEach(function (cell) {
        var m = text(cell.textContent).match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
        if (m) policies = Math.max(policies, +m[1], +m[2]);
      });
      if (policies !== 0) return;
      cells.forEach(function (cell) {
        if (/^\s*Al día\s*$/i.test(text(cell.textContent))) {
          cell.textContent = 'Sin cartera cargada';
          cell.classList.add('orbit-m1-pending');
        }
        var health = cell.querySelector('.badge, .progress, [class*="salud"]');
        if (health && /\b70\b/.test(text(cell.textContent))) {
          cell.textContent = 'Pendiente';
          cell.classList.add('orbit-m1-pending');
        }
      });
    });
  }
  function patchClientDetail(host) {
    var client = currentClient();
    if (!client || policyCount(client.id) > 0) return;
    var health = host.querySelector('.fh-salud');
    if (health) {
      health.style.background = 'conic-gradient(#c9c4bb 360deg,#ececec 0deg)';
      var values = health.querySelectorAll('.fh-salud-in div');
      if (values[0]) {
        values[0].textContent = 'Pendiente';
        values[0].setAttribute('data-pending-quality', '1');
        values[0].style.fontSize = '12px';
        values[0].style.color = 'var(--ink-2)';
      }
      if (values[1]) values[1].textContent = 'Calidad de datos';
    }
    host.querySelectorAll('.fh-kpi').forEach(function (cell) {
      var label = cell.querySelector('.fh-kpi-lab');
      var value = cell.querySelector('.fh-kpi-val');
      if (!label || !value) return;
      var labelText = text(label.textContent).trim();
      if (/Prima anual/i.test(labelText)) value.textContent = 'Sin datos';
      if (/Cartera al día/i.test(labelText)) {
        label.childNodes[label.childNodes.length - 1].nodeValue = ' Cartera no cargada';
        value.textContent = 'Pendiente';
      }
      if (/Cartera vencida/i.test(labelText)) {
        label.childNodes[label.childNodes.length - 1].nodeValue = ' Cartera no cargada';
        value.textContent = '—';
      }
      if (/Comisión generada/i.test(labelText)) value.textContent = 'Sin datos';
    });
    replaceTextNodes(host, /Sin renovaciones próximas/gi, 'Sin pólizas cargadas');
    replaceTextNodes(host, /Sin cobros pendientes/gi, 'Cartera aún no disponible');
    replaceTextNodes(host, /Cartera al día/gi, 'Información pendiente');
  }
  function patchRoleAndSearch() {
    var roleWrap = document.getElementById('tb-rol');
    var roleSelect = document.getElementById('rol-sel');
    if (roleWrap) roleWrap.setAttribute('aria-label', 'Cambiar rol activo');
    if (roleSelect) roleSelect.setAttribute('aria-label', 'Rol activo');
    var search = document.querySelector('.tb-search input');
    if (search) search.setAttribute('placeholder', 'Buscar cliente, póliza o cobro…');
    var moduleSearch = document.getElementById('f-q');
    if (moduleSearch) moduleSearch.setAttribute('placeholder', 'Buscar cliente por nombre, identificación, teléfono o correo…');
  }
  function patchHost() {
    var host = document.getElementById('host');
    if (!host) return;
    patchTechnicalCopy(host);
    replaceTextNodes(host, /InvalidDate/gi, 'Fecha no disponible');
    if (routeKey() === 'cliente360') {
      patchClientList(host);
      patchClientDetail(host);
    }
    patchRoleAndSearch();
  }
  function recoverEmptyHost() {
    clearTimeout(renderRecoveryTimer);
    renderRecoveryTimer = setTimeout(function () {
      var host = document.getElementById('host');
      if (!host || host.children.length || text(host.textContent).trim()) return;
      if (document.querySelector('.drawer-back.open,.imp-drawer,.imp-back')) return;
      var key = routeKey();
      if (['cliente360', 'aseguradoras'].indexOf(key) < 0) return;
      var mod = Orbit.modules && Orbit.modules[key];
      if (!mod || typeof mod.render !== 'function') return;
      host.innerHTML = '<div class="orbit-m1-recovery">Recuperando la vista…</div>';
      setTimeout(function () { try { mod.render(host); } catch (error) {} }, 0);
    }, 320);
  }
  function observe() {
    var host = document.getElementById('host');
    if (host && !hostObserver && window.MutationObserver) {
      var queued = false;
      hostObserver = new MutationObserver(function () {
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () {
          queued = false;
          patchHost();
          recoverEmptyHost();
        });
      });
      hostObserver.observe(host, { childList: true, subtree: true });
    }
    if (!bodyObserver && document.body && window.MutationObserver) {
      bodyObserver = new MutationObserver(function () {
        patchTechnicalCopy(document.body);
        patchRoleAndSearch();
        recoverEmptyHost();
      });
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
  }
  function loadAcademia() {
    if (window.Orbit && Orbit.ACADEMIA_V1221_M1_VISUAL) return;
    if (document.querySelector('script[data-orbit-academia-m1-visual]')) return;
    var script = document.createElement('script');
    script.src = 'data/academia-v1221-m1-visual-integrity.js?v=20260719-1';
    script.async = false;
    script.dataset.orbitAcademiaM1Visual = '1';
    (document.head || document.documentElement).appendChild(script);
  }
  function start() {
    loadAcademia();
    injectStyle();
    patchTechnicalCopy(document);
    patchRoleAndSearch();
    patchHost();
    observe();
  }

  Orbit.m1VisualIntegrity = {
    version: '20260719.1',
    writesStore: false,
    replacesRenderer: false,
    patch: patchHost,
    recoverEmptyHost: recoverEmptyHost
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener('hashchange', function () { setTimeout(patchHost, 60); });
  document.addEventListener('orbit:session', function () { setTimeout(patchHost, 60); });
})();
