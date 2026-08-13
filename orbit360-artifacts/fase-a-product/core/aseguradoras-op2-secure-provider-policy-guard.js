/* ============================================================
   Orbit 360 · Aseguradoras OP-2 · guard del proveedor seguro v1.218
   La UI no es el límite de seguridad: protege también llamadas directas
   a reveal/copy de cuentas y credenciales usando la política central.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  const R = Orbit.secureResources;
  const P = Orbit.aseguradorasOperationalAccess;
  if (!R || !P || Orbit.__aseguradorasOp2SecureProviderGuardV1218) return;
  Orbit.__aseguradorasOp2SecureProviderGuardV1218 = true;

  function isInsurerContext(extra) {
    return extra && extra.module === 'aseguradoras';
  }
  function deny(action, ref, message, extra) {
    try { if (R.audit) R.audit(action, ref, 'denegado_politica_op2', { module:'aseguradoras', fieldType:extra && extra.fieldType || '' }); } catch (e) {}
    return Promise.resolve({ ok:false, status:'denegado', message });
  }

  const originalRevealField = typeof R.revealField === 'function' ? R.revealField.bind(R) : null;
  const originalCopyField = typeof R.copyField === 'function' ? R.copyField.bind(R) : null;
  const originalRevealCredential = typeof R.revealCredential === 'function' ? R.revealCredential.bind(R) : null;
  const originalCopyCredential = typeof R.copyCredential === 'function' ? R.copyCredential.bind(R) : null;

  if (originalRevealField) R.revealField = function (ref, extra) {
    if (isInsurerContext(extra) && extra.fieldType === 'bank_account' && !P.canViewBankAccounts()) {
      return deny('field.reveal', ref, 'Tu rol activo no puede consultar esta cuenta.', extra);
    }
    return originalRevealField(ref, extra);
  };
  if (originalCopyField) R.copyField = function (ref, extra) {
    if (isInsurerContext(extra) && extra.fieldType === 'bank_account' && !P.canCopyBankAccounts()) {
      return deny('field.copy', ref, 'Tu rol activo no puede copiar esta cuenta.', extra);
    }
    return originalCopyField(ref, extra);
  };
  if (originalRevealCredential) R.revealCredential = function (ref, extra) {
    if (isInsurerContext(extra) && !P.canViewCredentials()) {
      return deny('credential.reveal', ref, 'Las credenciales están disponibles únicamente para Dirección, Administración y Operativo.', extra);
    }
    return originalRevealCredential(ref, extra);
  };
  if (originalCopyCredential) R.copyCredential = function (ref, extra) {
    if (isInsurerContext(extra) && !P.canCopyCredentials()) {
      return deny('credential.copy', ref, 'Tu rol activo no puede copiar credenciales de portales.', extra);
    }
    return originalCopyCredential(ref, extra);
  };

  Orbit.aseguradorasOp2SecureProviderGuard = {
    version:'v1.218',
    accountsPolicy:'all_module_viewers',
    credentialsPolicy:'administrative_operational',
    originalRevealField, originalCopyField, originalRevealCredential, originalCopyCredential
  };
})();
