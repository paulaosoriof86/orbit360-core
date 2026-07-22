/* Orbit 360 · Barrera de estabilidad visual Cliente/Aseguradoras.
   Owner de carga: core/router-tenant-config-bootstrap.js.
   No renderiza, no escribe store y no sustituye módulos.
   Mantiene oculta la ficha durante cualquier transición que pueda reemplazar
   el DOM canónico y solo libera la vista cuando el contrato visual está completo. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var registryContract = { version: '20260721.2' };
  var CRITICAL_RELEASE = 'block1-critical-runtime-20260721-4';
  var previous = window.Orbit.__clientInsurerVisualStabilityBarrierV20260721;
  if (previous && previous.version === '20260721.4') return;

  var root = document.documentElement;
  var pendingClass = 'orbit-insurer-knowledge-pending';
  var scheduled = false;
  var settling = false;
  var passId = 0;
  var maxPasses = 30;
  var style = document.querySelector('style[data-orbit-insurer-visual-stability-style]');
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('data-orbit-insurer-visual-stability-style', '1');
    style.textContent = 'html.' + pendingClass + ' #asg-ficha{visibility:hidden!important;pointer-events:none!important}';
    document.head.appendChild(style);
  }

  function routeActive() { return String(window.location && window.location.hash || '').indexOf('#/aseguradoras') === 0; }
  function ficha() { return document.getElementById('asg-ficha'); }
  function directory() { return document.querySelector('#host .asg-grid'); }
  function activeTab(view) { var tab = view && view.querySelector('.asg-tab.on[data-tab],.asg-tab.active[data-tab]'); return tab && String(tab.getAttribute('data-tab') || '').trim() || ''; }
  function count(view, selector) { return view ? view.querySelectorAll(selector).length : 0; }

  function directoryReady(grid) {
    if (!grid) return false;
    var inactive = grid.querySelectorAll('.asg-card.off[data-asg]');
    if (!inactive.length) return true;
    return Array.prototype.every.call(inactive, function (card) {
      var reason = card.querySelector('.m1-inactive-reason');
      return Boolean(reason && /Inactiva:/i.test(String(reason.textContent || '')));
    });
  }

  function expectedReady(view) {
    if (!routeActive()) return true;
    if (!view) return directoryReady(directory());
    if (!view.classList.contains('m1-asg-ficha')) return false;
    var tab = activeTab(view);
    if (tab === 'contactos') { var contactRows = count(view, '#af-contactos .asg-row[data-cont]'); return contactRows === 0 || count(view, '.m1-contact-card') >= contactRows; }
    if (tab === 'plataformas') { var portalRows = count(view, '#af-portales .asg-row[data-portal]'); return portalRows === 0 || (count(view, '.m1-portal-card') >= portalRows && count(view, '.m1-credential-box') >= portalRows); }
    if (tab === 'bancos') { var bankRows = count(view, '#af-cuentas .asg-row[data-cta]'); return bankRows === 0 || count(view, '.m1-bank-card') >= bankRows; }
    if (tab === 'tarifas') return Boolean(view.querySelector('#af-body .m1-knowledge-summary'));
    return true;
  }

  function publish(status, reason, ready, passes) {
    window.Orbit.__clientInsurerVisualStabilityState = { version: '20260721.4', registryVersion: registryContract.version, criticalRelease: CRITICAL_RELEASE, status: status, reason: reason || '', activeTab: activeTab(ficha()), directoryReady: directoryReady(directory()), expectedReady: ready === true, passes: passes || 0, knowledgeSettledBeforeVisible: ready === true, canonicalOwnerReapplied: ready === true, eventDriven: true, domMutationGuard: true, directoryStructuralTrigger: true, writesStore: false };
  }
  function markPending(reason) { if (!routeActive()) return; root.classList.add(pendingClass); publish('waiting-stable-dom', reason, false, 0); }
  function enhanceCanonicalOwner() { try { var owner = window.Orbit && window.Orbit.clientInsurerVisualContractV20260720; if (owner && typeof owner.enhance === 'function') owner.enhance(); } catch (error) {} }
  function releaseStableView(reason, passes) { root.classList.remove(pendingClass); publish('stable', reason, true, passes); try { document.dispatchEvent(new CustomEvent('orbit:aseguradoras:visual-stable', { detail: { version: '20260721.4', registryVersion: registryContract.version, criticalRelease: CRITICAL_RELEASE, status: 'stable', reason: reason || '', passes: passes || 0 } })); } catch (error) {} }

  function runStablePass(reason) {
    var currentPassId = ++passId, passes = 0; settling = true; markPending(reason);
    function pass() {
      if (currentPassId !== passId) return;
      if (!routeActive()) { settling = false; root.classList.remove(pendingClass); publish('inactive-route', reason, true, passes); return; }
      passes += 1; enhanceCanonicalOwner();
      requestAnimationFrame(function () {
        if (currentPassId !== passId) return; enhanceCanonicalOwner();
        requestAnimationFrame(function () {
          if (currentPassId !== passId) return;
          var ready = expectedReady(ficha());
          if (ready) { settling = false; releaseStableView(reason, passes); return; }
          if (passes >= maxPasses) { settling = false; publish('blocked-incomplete-dom', reason, false, passes); return; }
          setTimeout(pass, 40);
        });
      });
    }
    pass();
  }

  function scheduleStablePass(reason) {
    if (!routeActive()) { root.classList.remove(pendingClass); return; }
    markPending(reason); if (scheduled) return; scheduled = true;
    setTimeout(function () { scheduled = false; runStablePass(reason || 'scheduled'); }, 0);
  }

  function touchesAseguradoras(records) {
    return Array.prototype.some.call(records || [], function (record) {
      var target = record.target;
      if (target && target.nodeType === 1 && (target.id === 'asg-ficha' || target.classList && target.classList.contains('asg-grid') || target.closest && target.closest('#asg-ficha,.asg-grid'))) return true;
      return Array.prototype.some.call(record.addedNodes || [], function (node) {
        return node && node.nodeType === 1 && (node.id === 'asg-ficha' || node.classList && node.classList.contains('asg-grid') || node.matches && node.matches('.asg-card.off[data-asg]') || node.querySelector && node.querySelector('#asg-ficha,.asg-grid,.asg-card.off[data-asg]'));
      });
    });
  }

  if (window.MutationObserver) new MutationObserver(function (records) { if (!routeActive() || settling || !touchesAseguradoras(records)) return; if (!expectedReady(ficha())) scheduleStablePass(ficha() ? 'ficha-dom-replaced' : 'directory-dom-replaced'); }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', function (event) { var tab = event.target && event.target.closest && event.target.closest('#asg-ficha [data-tab]'); if (!tab) return; scheduleStablePass('tab-transition:' + String(tab.getAttribute('data-tab') || 'unknown')); }, true);
  window.addEventListener('hashchange', function () { scheduleStablePass('hashchange'); });
  window.addEventListener('orbit:aseguradoras:knowledge-loading', function () { scheduleStablePass('knowledge-loading'); });
  window.addEventListener('orbit:aseguradoras:knowledge-ready', function () { scheduleStablePass('knowledge-ready'); });
  window.addEventListener('orbit:aseguradoras:knowledge-error', function () { scheduleStablePass('knowledge-error'); });
  window.addEventListener('orbit:aseguradoras:tenant-runtime-linked', function () { scheduleStablePass('tenant-runtime-linked'); });
  window.addEventListener('orbit:aseguradoras:runtime-controlled', function () { scheduleStablePass('runtime-controlled'); });
  window.addEventListener('orbit:store:emit', function () { if (routeActive() && !expectedReady(ficha())) scheduleStablePass('store-emit'); });
  document.addEventListener('orbit:store', function () { if (routeActive() && !expectedReady(ficha())) scheduleStablePass('store-event'); });

  window.Orbit.__clientInsurerVisualStabilityBarrierV20260721 = { version: '20260721.4', registryVersion: registryContract.version, criticalRelease: CRITICAL_RELEASE, owner: 'core/router-tenant-config-bootstrap.js', canonicalVisualOwner: 'core/client-insurer-visual-contract-v20260720.js', knowledgeSettledBeforeVisible: true, eventDriven: true, domMutationGuard: true, directoryStructuralTrigger: true, scheduleStablePass: scheduleStablePass, expectedReady: expectedReady, writesStore: false, reimportsData: false, exposesSecrets: false };
  scheduleStablePass('bootstrap');
})();
