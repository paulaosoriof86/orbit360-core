/* Orbit 360 · Renovaciones v1.200 · guard de acción sin segundo render */
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
  mod.__renewalsPermissionV1200 = { originalCampaign };
})();
