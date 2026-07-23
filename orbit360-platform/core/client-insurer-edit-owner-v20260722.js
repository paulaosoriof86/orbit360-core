/* Orbit 360 · Compatibilidad de edición Aseguradoras · 2026-07-23
   El CRUD y el borrador pertenecen al módulo canónico. Este owner solo añade
   clases semánticas y nunca reemplaza controles, intercepta Orbit.store ni
   manipula contraseñas. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var Orbit = window.Orbit;
  var VERSION = '20260723.2';
  function addSemanticClasses(root) {
    if (!root) return;
    var hero = root.querySelector(':scope > .card > div:first-child');
    if (hero) {
      hero.classList.add('od-insurer-hero');
      var title = hero.querySelector('div[style*="font-size:20px"]') || hero.querySelector('div[style*="font-weight:800"]');
      if (title) title.classList.add('od-page-title');
    }
    root.querySelectorAll('.asg-sec-t').forEach(function (title) { title.classList.add('od-section-title'); });
    if (root.querySelector('#af-guardar')) root.classList.add('od-edit-mode-ready');
  }
  function enhance() { addSemanticClasses(document.getElementById('asg-ficha')); }
  var scheduled = false;
  function schedule() { if (scheduled) return; scheduled = true; requestAnimationFrame(function () { scheduled = false; enhance(); }); }
  if (window.MutationObserver) new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('orbit:store:emit', schedule);
  document.addEventListener('orbit:session', schedule);
  Orbit.clientInsurerEditOwnerV20260722 = {
    version: VERSION,
    delegatesCrudToCanonicalModule: true,
    replacesEditableDom: false,
    wrapsStore: false,
    passwordInputForbidden: false,
    securePasswordMutationRequired: true,
    operationalValuesInCode: false,
    enhance: enhance
  };
  schedule();
})();
