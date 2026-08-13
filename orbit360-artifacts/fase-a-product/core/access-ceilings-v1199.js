/* ============================================================
   Orbit 360 · Límites duros de acciones por rol v1.199
   Visibilidad de módulo y alcance de datos no equivalen a permiso
   para modificar pólizas, cobros, conciliaciones o datos críticos.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  const A = Orbit.access;
  if (!A || A.__ceilingsV1199 || typeof A.can !== 'function') return;
  const originalCan = A.can.bind(A);
  const BLOCKED_ADVISOR_MODULES = new Set([
    'polizas','cobros','conciliaciones','comisiones','finanzas',
    'configuracion','equipo','aseguradoras','renovaciones','cancelaciones'
  ]);
  const WRITE_ACTIONS = new Set([
    'edit','create','delete','remove','apply','validate','reconcile',
    'manage','manage_documents','change_state','reassign'
  ]);
  function advisorRole() {
    const r = A.activeRole ? A.activeRole() : '';
    return /Asesor/i.test(r) || r === 'Comercial';
  }
  A.can = function (moduleKey, action) {
    action = action || 'view';
    if (advisorRole()) {
      if (action === 'view') return originalCan(moduleKey, action);
      if ((moduleKey === 'cliente360' || moduleKey === 'calidad') && action === 'complete') {
        return originalCan(moduleKey, action);
      }
      if (moduleKey === 'cliente360' && WRITE_ACTIONS.has(action)) return false;
      if (BLOCKED_ADVISOR_MODULES.has(moduleKey) && (WRITE_ACTIONS.has(action) || action !== 'view')) return false;
      if (action === 'manage_documents') return false;
    }
    return originalCan(moduleKey, action);
  };
  A.__ceilingsV1199 = {
    originalCan,
    blockedAdvisorModules: Array.from(BLOCKED_ADVISOR_MODULES),
    writeActions: Array.from(WRITE_ACTIONS)
  };
})();
