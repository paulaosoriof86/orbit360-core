/* Orbit 360 · Credenciales autoadministrables */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  function text(value) { return String(value == null ? '' : value).trim(); }
  function tenantId() {
    try { return text(window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)); }
    catch (error) { return ''; }
  }
  function activeRole() {
    try {
      var user = Orbit.auth && typeof Orbit.auth.user === 'function' ? Orbit.auth.user() || {} : {};
      return text(user.rol || user.activeRole);
    } catch (error) { return ''; }
  }
  function owner() {
    if (!Orbit.userOnboarding || typeof Orbit.userOnboarding._call !== 'function') return null;
    return Orbit.userOnboarding;
  }
  async function setTemporaryPassword(options) {
    options = options || {};
    var adapter = owner();
    if (!adapter) throw Object.assign(new Error('CREDENTIAL_BACKEND_UNAVAILABLE'), { code: 'CREDENTIAL_BACKEND_UNAVAILABLE' });
    return adapter._call({
      tenantId: tenantId(),
      advisorId: text(options.advisorId),
      operation: 'set_temporary_password',
      temporaryPassword: String(options.temporaryPassword || ''),
      reason: text(options.reason),
      activeRole: activeRole()
    });
  }
  async function completePasswordChange() {
    var adapter = owner();
    if (!adapter) throw Object.assign(new Error('CREDENTIAL_BACKEND_UNAVAILABLE'), { code: 'CREDENTIAL_BACKEND_UNAVAILABLE' });
    return adapter._call({
      tenantId: tenantId(),
      operation: 'complete_password_change'
    });
  }
  function passwordValid(value) {
    var password = String(value || '');
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
  }
  Orbit.credentialSelfService = {
    setTemporaryPassword: setTemporaryPassword,
    completePasswordChange: completePasswordChange,
    passwordValid: passwordValid
  };
})();
