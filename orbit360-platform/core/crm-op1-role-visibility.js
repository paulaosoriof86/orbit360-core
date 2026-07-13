/* ============================================================
   Orbit 360 · CRM OP-1 · visibilidad reusable por rol v1.216
   Calidad forma parte de la atención de cartera del Asesor, siempre
   filtrada por access-scope. No amplía permisos críticos ni scopes.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  if (Orbit.__crmOp1RoleVisibilityV1216) return;
  Orbit.__crmOp1RoleVisibilityV1216 = true;

  function ensure(roleName, modules) {
    const role = Orbit.ROLES && Orbit.ROLES[roleName];
    if (!role) return false;
    role.modulos = Array.isArray(role.modulos) ? role.modulos.slice() : [];
    modules.forEach(moduleKey => { if (!role.modulos.includes(moduleKey)) role.modulos.push(moduleKey); });
    return true;
  }

  ensure('Asesor', ['calidad']);
  Orbit.crmOp1RoleVisibility = {
    version: 'v1.216',
    advisorQualityVisible: !!(Orbit.ROLES && Orbit.ROLES.Asesor && Orbit.ROLES.Asesor.modulos.includes('calidad')),
    dataScopeUnchanged: true,
    criticalPermissionsUnchanged: true
  };
})();
