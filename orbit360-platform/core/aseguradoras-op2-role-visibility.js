/* ============================================================
   Orbit 360 · Aseguradoras OP-2 · visibilidad por rol v1.217
   Operativo y Asesor pueden consultar Aseguradoras según permisos;
   no amplía scopes de clientes ni acceso a recursos sensibles.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  if (Orbit.__aseguradorasOp2RoleVisibilityV1217) return;
  Orbit.__aseguradorasOp2RoleVisibilityV1217 = true;

  function ensure(roleName, modules) {
    const role = Orbit.ROLES && Orbit.ROLES[roleName];
    if (!role) return false;
    role.modulos = Array.isArray(role.modulos) ? role.modulos.slice() : [];
    modules.forEach(moduleKey => { if (!role.modulos.includes(moduleKey)) role.modulos.push(moduleKey); });
    return true;
  }

  ensure('Operativo', ['aseguradoras']);
  ensure('Asesor', ['aseguradoras']);

  Orbit.aseguradorasOp2RoleVisibility = {
    version: 'v1.217',
    operationalDirectoryVisible: !!(Orbit.ROLES && Orbit.ROLES.Operativo && Orbit.ROLES.Operativo.modulos.includes('aseguradoras')),
    advisorDirectoryVisible: !!(Orbit.ROLES && Orbit.ROLES.Asesor && Orbit.ROLES.Asesor.modulos.includes('aseguradoras')),
    clientDataScopeUnchanged: true,
    sensitiveAccessUnchanged: true,
    insurerWritePermissionUnchanged: true
  };
})();
