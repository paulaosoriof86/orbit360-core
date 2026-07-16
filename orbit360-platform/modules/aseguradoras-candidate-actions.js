/* Orbit 360 · acciones aditivas de la candidata aprobada.
   No renderiza el módulo ni observa/reemplaza su DOM. */
(function () {
  'use strict';
  let attempts = 0;

  function loadMultirolContract() {
    if (window.Orbit && Orbit.session && Orbit.session.__multirolVisibilityV20260716) return;
    if (document.querySelector('script[data-orbit-multirol-v20260716]')) return;
    const script = document.createElement('script');
    script.src = 'core/session-multirol-visibility-v20260716.js?v=20260716-1';
    script.async = false;
    script.dataset.orbitMultirolV20260716 = '1';
    document.head.appendChild(script);
  }

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function canManage() {
    try { return ['Dirección', 'Admin'].includes(clean(Orbit.session && Orbit.session.rol && Orbit.session.rol())); }
    catch (e) { return false; }
  }
  function current() {
    const root = document.getElementById('asg-ficha');
    if (!root || !root.dataset.id || !window.Orbit || !Orbit.store) return null;
    const row = Orbit.store.get('aseguradoras', root.dataset.id);
    return row ? { root, row } : null;
  }
  async function changeLogo(row) {
    const url = await Orbit.ui.prompt('Pega una URL HTTPS autorizada para el logo. Déjala vacía para retirar el logo. No se guardan archivos ni Data URLs en el navegador.', { title: 'Cambiar logo de aseguradora' });
    if (url == null) return;
    const value = clean(url);
    if (value && !/^https:\/\//i.test(value)) { Orbit.ui.toast('El logo debe usar una URL HTTPS autorizada.'); return; }
    const reason = await Orbit.ui.prompt('Motivo del cambio de logo:', { title: 'Registrar cambio' });
    if (!clean(reason)) return;
    const activity = (row.actividad || []).slice();
    activity.unshift({ fecha: new Date().toISOString(), responsable: 'Usuario entorno de validación · Dirección', cambio: value ? 'Logo actualizado por referencia segura' : 'Logo retirado', motivo: clean(reason) });
    Orbit.store.update('aseguradoras', row.id, { logo: value, actividad: activity.slice(0, 60) });
    setTimeout(function () { Orbit.modules.aseguradoras.ficha(row.id); }, 250);
  }
  function enhance() {
    const state = current();
    if (!state) return false;
    const actions = state.root.querySelector('.card>div:first-child>div:last-child');
    if (!actions) return false;
    if (!actions.querySelector('[data-asg-knowledge]') && Orbit.aseguradorasKnowledgeCatalog) {
      const button = document.createElement('button');
      button.className = 'btn ghost sm';
      button.dataset.asgKnowledge = '1';
      button.style.cssText = 'background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);color:#fff';
      button.textContent = '🧠 Fuentes mapeadas';
      button.addEventListener('click', function () {
        Orbit.aseguradorasKnowledgeCatalog.load().then(function () { Orbit.aseguradorasKnowledgeCatalog.open(state.row); });
      });
      actions.prepend(button);
    }
    if (canManage() && !actions.querySelector('[data-asg-logo]')) {
      const button = document.createElement('button');
      button.className = 'btn ghost sm';
      button.dataset.asgLogo = '1';
      button.style.cssText = 'background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);color:#fff';
      button.textContent = '🖼 Logo';
      button.addEventListener('click', function () { changeLogo(state.row); });
      actions.prepend(button);
    }
    return true;
  }
  function schedule() { setTimeout(enhance, 0); setTimeout(enhance, 180); }
  document.addEventListener('click', function (event) {
    if (event.target && event.target.closest && event.target.closest('[data-asg],[data-act],[data-tab]')) schedule();
  }, true);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('orbit:store:emit', schedule);
  loadMultirolContract();
  (function wait() {
    if (window.Orbit && Orbit.modules && Orbit.modules.aseguradoras && Orbit.aseguradorasKnowledgeCatalog) { schedule(); return; }
    attempts += 1;
    if (attempts < 100) setTimeout(wait, 100);
  })();
})();
