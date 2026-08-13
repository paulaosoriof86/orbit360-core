/* Orbit 360 · Guard de campaña de renovaciones v1.200. */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.renovaciones;
  const A = Orbit.access;
  if (!mod || !A || mod.__renewalsPermissionV1200) return;
  const originalCampaign = mod.campana && mod.campana.bind(mod);
  if (originalCampaign) {
    mod.campana = function () {
      if (!A.can('renovaciones', 'edit')) {
        if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast('Tu rol activo no puede preparar campañas de renovación.');
        return;
      }
      return originalCampaign.apply(mod, arguments);
    };
  }
  const originalRender = mod.render && mod.render.bind(mod);
  if (originalRender) {
    mod.render = function (host) {
      const out = originalRender(host);
      setTimeout(() => {
        if (!host || A.can('renovaciones', 'edit')) return;
        Array.from(host.querySelectorAll('button')).forEach(b => {
          if (/Preparar campaña|Campaña de renovación/i.test(b.textContent || '')) b.remove();
        });
      }, 0);
      return out;
    };
  }
  mod.__renewalsPermissionV1200 = { originalCampaign, originalRender };
})();
