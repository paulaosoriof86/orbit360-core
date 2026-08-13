/* ============================================================
   Orbit 360 · Aseguradoras OP-2 · guard de entradas v1.217
   La ausencia de un botón no sustituye el permiso. Protege llamadas
   directas al editor, alta e importación usando Orbit.access.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
(function () {
  const mod = Orbit.modules.aseguradoras;
  const A = Orbit.access || {};
  const U = Orbit.ui || {};
  if (!mod || Orbit.__aseguradorasOp2PermissionGuardV1217) return;
  Orbit.__aseguradorasOp2PermissionGuardV1217 = true;

  function allowed(action) {
    return A.can ? A.can('aseguradoras', action) : false;
  }
  function deny(message) {
    try { if (U.toast) U.toast(message); } catch (e) {}
    return false;
  }

  if (typeof mod.ficha === 'function') {
    const previousFicha = mod.ficha.bind(mod);
    mod.ficha = function (id, startEdit) {
      if (startEdit && !allowed('edit')) return deny('Tu rol activo puede consultar la ficha, pero no editar Aseguradoras.');
      return previousFicha(id, startEdit);
    };
    mod.__op2PreviousFichaV1217 = previousFicha;
  }

  if (typeof mod.nuevaAseguradora === 'function') {
    const previousNew = mod.nuevaAseguradora.bind(mod);
    mod.nuevaAseguradora = function () {
      if (!allowed('create')) return deny('Tu rol activo no puede crear Aseguradoras.');
      return previousNew.apply(mod, arguments);
    };
    mod.__op2PreviousNewV1217 = previousNew;
  }

  if (typeof mod.importarDirectorio === 'function') {
    const previousImport = mod.importarDirectorio.bind(mod);
    mod.importarDirectorio = function () {
      if (!allowed('create') && !allowed('manage_documents')) return deny('Tu rol activo no puede importar directorios de Aseguradoras.');
      return previousImport.apply(mod, arguments);
    };
    mod.__op2PreviousImportV1217 = previousImport;
  }
})();
