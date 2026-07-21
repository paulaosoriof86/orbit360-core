/* Orbit 360 · Barrera de estabilidad visual Cliente/Aseguradoras.
   Owner de carga: core/router-tenant-config-bootstrap.js.
   No renderiza, no escribe store y no sustituye módulos.
   Mantiene oculta la ficha únicamente mientras se resuelve el resumen de
   conocimiento que puede provocar un rerender completo; después invoca el
   contrato visual canónico y libera la vista en el mismo ciclo estable. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (window.Orbit.__clientInsurerVisualStabilityBarrierV20260721) return;

  var root = document.documentElement;
  var pendingClass = 'orbit-insurer-knowledge-pending';
  var style = document.createElement('style');
  style.setAttribute('data-orbit-insurer-visual-stability-style', '1');
  style.textContent = 'html.' + pendingClass + ' #asg-ficha{visibility:hidden!important;pointer-events:none!important}';
  document.head.appendChild(style);

  function enhanceCanonicalOwner() {
    try {
      var owner = window.Orbit && window.Orbit.clientInsurerVisualContractV20260720;
      if (owner && typeof owner.enhance === 'function') owner.enhance();
    } catch (error) {}
  }

  function releaseStableView(script, status) {
    if (script) script.dataset.orbitKnowledgeSettled = status || 'settled';
    requestAnimationFrame(function () {
      enhanceCanonicalOwner();
      requestAnimationFrame(function () {
        enhanceCanonicalOwner();
        root.classList.remove(pendingClass);
        window.Orbit.__clientInsurerVisualStabilityState = {
          version: '20260721.1',
          status: status || 'settled',
          knowledgeSettledBeforeVisible: true,
          canonicalOwnerReapplied: true,
          writesStore: false
        };
        try {
          document.dispatchEvent(new CustomEvent('orbit:aseguradoras:visual-stable', {
            detail: { version: '20260721.1', status: status || 'settled' }
          }));
        } catch (error) {}
      });
    });
  }

  function bindKnowledgeScript(script) {
    if (!script || script.dataset.orbitVisualStabilityBound === '1') return;
    script.dataset.orbitVisualStabilityBound = '1';
    root.classList.add(pendingClass);
    window.Orbit.__clientInsurerVisualStabilityState = {
      version: '20260721.1',
      status: 'waiting-knowledge',
      knowledgeSettledBeforeVisible: false,
      canonicalOwnerReapplied: false,
      writesStore: false
    };
    script.addEventListener('load', function () { releaseStableView(script, 'loaded'); }, { once: true });
    script.addEventListener('error', function () { releaseStableView(script, 'load-error-honest'); }, { once: true });
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches && node.matches('script[data-orbit-insurer-summary-owner]')) bindKnowledgeScript(node);
    if (node.querySelectorAll) node.querySelectorAll('script[data-orbit-insurer-summary-owner]').forEach(bindKnowledgeScript);
  }

  document.querySelectorAll('script[data-orbit-insurer-summary-owner]').forEach(bindKnowledgeScript);
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      Array.prototype.forEach.call(record.addedNodes || [], scan);
    });
  }).observe(document.head, { childList: true, subtree: true });

  window.Orbit.__clientInsurerVisualStabilityBarrierV20260721 = {
    version: '20260721.1',
    owner: 'core/router-tenant-config-bootstrap.js',
    canonicalVisualOwner: 'core/client-insurer-visual-contract-v20260720.js',
    knowledgeSettledBeforeVisible: true,
    writesStore: false,
    reimportsData: false,
    exposesSecrets: false
  };
})();
