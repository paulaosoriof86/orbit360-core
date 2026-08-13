/* ============================================================
   Orbit 360 · Aseguradoras OP-2 · política de acceso operativo v1.218
   - cuentas bancarias: visibles/copiables para todo usuario que pueda
     consultar Aseguradoras;
   - usuarios y contraseñas de portales: Dirección/Admin/Operativo o
     permiso extra explícito, respetando restricciones;
   - los valores completos permanecen en proveedor seguro, no en store.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.aseguradorasOperationalAccess = (function () {
  const A = Orbit.access || {};
  const ADMIN_ROLES = new Set(['Dirección','SuperAdmin','AdminTenant','Admin','Operativo']);

  function role() {
    try { if (A.activeRole) return A.activeRole(); } catch (e) {}
    try { return Orbit.session && Orbit.session.rol ? Orbit.session.rol() : 'Sin rol'; } catch (e) {}
    return 'Sin rol';
  }
  function advisor() {
    try { return A.actorAdvisor ? (A.actorAdvisor() || {}) : {}; } catch (e) { return {}; }
  }
  function list(value) { return Array.isArray(value) ? value : (value ? [value] : []); }
  function restricted(key) {
    const row = advisor();
    return list(row.restricciones).includes(key) || list(row.restricciones).includes('aseguradoras');
  }
  function extra(key) {
    const row = advisor();
    return list(row.permisosExtra || row.extras).includes(key);
  }
  function canViewModule() {
    if (restricted('aseguradoras_ver')) return false;
    try { return A.can ? A.can('aseguradoras','view') : false; } catch (e) { return false; }
  }
  function canViewBankAccounts() {
    return canViewModule() && !restricted('aseguradoras_cuentas_ver');
  }
  function canCopyBankAccounts() {
    return canViewBankAccounts() && !restricted('aseguradoras_cuentas_copiar');
  }
  function canViewCredentials() {
    if (!canViewModule() || restricted('aseguradoras_datos_sensibles') || restricted('aseguradoras_credenciales_ver')) return false;
    return ADMIN_ROLES.has(role()) || extra('aseguradoras_datos_sensibles') || extra('aseguradoras_credenciales_ver');
  }
  function canCopyCredentials() {
    return canViewCredentials() && !restricted('aseguradoras_credenciales_copiar');
  }
  function bankContext(extraContext) {
    return Object.assign({
      module:'aseguradoras', fieldType:'bank_account', accessClass:'operational_all_viewers',
      requiredPermission:'aseguradoras:view', allowedByUi:canViewBankAccounts()
    }, extraContext || {});
  }
  function credentialContext(extraContext) {
    return Object.assign({
      module:'aseguradoras', fieldType:'portal_credential', accessClass:'administrative_operational',
      allowedRoles:Array.from(ADMIN_ROLES), allowedByUi:canViewCredentials()
    }, extraContext || {});
  }
  function status() {
    return {
      version:'v1.218', activeRole:role(), moduleVisible:canViewModule(),
      bankAccountsVisible:canViewBankAccounts(), bankAccountsCopyable:canCopyBankAccounts(),
      credentialsVisible:canViewCredentials(), credentialsCopyable:canCopyCredentials(),
      bankValuesPersistedInStore:false, credentialValuesPersistedInStore:false
    };
  }
  return {
    canViewModule, canViewBankAccounts, canCopyBankAccounts,
    canViewCredentials, canCopyCredentials, bankContext, credentialContext, status
  };
})();
