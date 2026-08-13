/* ============================================================
   Orbit 360 · Campos sensibles por referencia v1.202
   Extiende Orbit.secureResources para cuentas bancarias y valores
   operativos sensibles distintos de contraseñas.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  const R = Orbit.secureResources;
  if (!R || R.__fieldsV1202) return;
  let fieldProvider = null;

  function normalize(raw, fallback) {
    raw = raw || {};
    return {
      status: raw.status || fallback || 'pendiente_conexion',
      available: raw.available === true,
      revealAvailable: raw.revealAvailable === true,
      copyAvailable: raw.copyAvailable === true,
      requiresReauth: raw.requiresReauth !== false,
      message: raw.message || ''
    };
  }
  function registerFieldProvider(provider) {
    if (!provider || (typeof provider.copy !== 'function' && typeof provider.reveal !== 'function')) throw new Error('Proveedor de campos sensibles inválido');
    fieldProvider = provider;
    return true;
  }
  function fieldStatus(ref, extra) {
    if (!ref) return normalize({}, 'sin_referencia');
    if (!fieldProvider) return normalize({ message: 'Pendiente de conexión segura' }, 'pendiente_conexion');
    try {
      const out = typeof fieldProvider.status === 'function' ? fieldProvider.status(ref, R.context(extra)) : { available: true, revealAvailable: true, copyAvailable: true };
      return normalize(out, 'disponible');
    } catch (e) {
      return normalize({ message: 'No fue posible consultar el campo sensible' }, 'no_disponible');
    }
  }
  async function revealField(ref, extra) {
    if (!fieldProvider || typeof fieldProvider.reveal !== 'function') {
      R.audit('field.reveal', ref, 'pendiente_conexion', { fieldType: extra && extra.fieldType || '' });
      return { ok: false, status: 'pendiente_conexion', message: 'Pendiente de conexión segura' };
    }
    try {
      const out = await fieldProvider.reveal(ref, R.context(extra));
      R.audit('field.reveal', ref, out && out.ok === false ? 'denegado' : 'ok', { fieldType: extra && extra.fieldType || '' });
      return Object.assign({ ok: true, expiresInMs: 6000 }, out || {});
    } catch (e) {
      R.audit('field.reveal', ref, 'error', { fieldType: extra && extra.fieldType || '' });
      return { ok: false, status: 'no_disponible', message: 'No fue posible recuperar el dato' };
    }
  }
  async function copyField(ref, extra) {
    if (!fieldProvider || typeof fieldProvider.copy !== 'function') {
      R.audit('field.copy', ref, 'pendiente_conexion', { fieldType: extra && extra.fieldType || '' });
      return { ok: false, status: 'pendiente_conexion', message: 'Pendiente de conexión segura' };
    }
    try {
      const out = await fieldProvider.copy(ref, R.context(extra));
      R.audit('field.copy', ref, out && out.ok === false ? 'denegado' : 'ok', { fieldType: extra && extra.fieldType || '' });
      return Object.assign({ ok: true }, out || {});
    } catch (e) {
      R.audit('field.copy', ref, 'error', { fieldType: extra && extra.fieldType || '' });
      return { ok: false, status: 'no_disponible', message: 'No fue posible copiar el dato' };
    }
  }

  R.registerFieldProvider = registerFieldProvider;
  R.fieldStatus = fieldStatus;
  R.revealField = revealField;
  R.copyField = copyField;
  R.__fieldsV1202 = { provider: () => fieldProvider };
})();
