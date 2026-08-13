/* ============================================================
   Orbit 360 · Contratos de recursos seguros v1.197
   Carril B — interfaces no destructivas para documentos y credenciales.
   No implementa proveedores, OAuth, bóveda ni secretos. Los adaptadores
   reales se registran desde backend autorizado y conservan Orbit.store.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.secureResources = (function () {
  let documentProvider = null;
  let credentialProvider = null;

  function role() {
    try { if (Orbit.session && Orbit.session.rol) return Orbit.session.rol(); } catch (e) {}
    try { const u = Orbit.auth && Orbit.auth.user && Orbit.auth.user(); return (u && u.rol) || 'Asesor'; } catch (e) {}
    return 'Asesor';
  }

  function actor() {
    try {
      const u = Orbit.auth && Orbit.auth.user && Orbit.auth.user();
      return { id: (u && (u.id || u.uid || u.email)) || '', nombre: (u && (u.nombre || u.email)) || 'usuario', rol: role() };
    } catch (e) { return { id: '', nombre: 'usuario', rol: role() }; }
  }

  function context(extra) {
    let tenantId = '';
    try { tenantId = (Orbit.tenant && (Orbit.tenant.id || Orbit.tenant.tenantId)) || ''; } catch (e) {}
    let asesorId = '';
    try { asesorId = Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId(); } catch (e) {}
    return Object.assign({ tenantId, asesorId, actor: actor(), rolActivo: role() }, extra || {});
  }

  function audit(action, target, result, detail) {
    const row = {
      id: 'secres_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      ts: new Date().toISOString(),
      tipo: 'recurso_seguro',
      action,
      target: String(target || ''),
      result: String(result || ''),
      actor: actor(),
      detail: Object.assign({}, detail || {})
    };
    try {
      if (Orbit.store && Orbit.store.insert) Orbit.store.insert('auditLog', row);
    } catch (e) {
      try {
        if (Orbit.store && Orbit.store.insert) Orbit.store.insert('actividades', {
          id: row.id, tipo: 'admin', icon: '🔐', fecha: row.ts.slice(0, 10),
          titulo: 'Acceso a recurso seguro', detalle: action + ' · ' + result
        });
      } catch (ignore) {}
    }
    try { document.dispatchEvent(new CustomEvent('orbit:secure-resource-audit', { detail: row })); } catch (e) {}
    return row;
  }

  function normalizeStatus(raw, fallback) {
    raw = raw || {};
    return {
      status: raw.status || fallback || 'pendiente_conexion',
      available: raw.available === true,
      previewAvailable: raw.previewAvailable === true,
      downloadAvailable: raw.downloadAvailable === true,
      revealAvailable: raw.revealAvailable === true,
      copyAvailable: raw.copyAvailable === true,
      requiresReauth: raw.requiresReauth !== false,
      message: raw.message || ''
    };
  }

  function registerDocumentProvider(provider) {
    if (!provider || typeof provider.resolve !== 'function') throw new Error('Proveedor documental inválido');
    documentProvider = provider;
    return true;
  }

  function registerCredentialProvider(provider) {
    if (!provider || (typeof provider.copy !== 'function' && typeof provider.reveal !== 'function')) throw new Error('Proveedor de credenciales inválido');
    credentialProvider = provider;
    return true;
  }

  function documentStatus(ref, extra) {
    if (!ref) return normalizeStatus({}, 'sin_referencia');
    if (!documentProvider) return normalizeStatus({ message: 'Pendiente de conexión documental' }, 'pendiente_conexion');
    try {
      const out = typeof documentProvider.status === 'function' ? documentProvider.status(ref, context(extra)) : { available: true };
      return normalizeStatus(out, 'disponible');
    } catch (e) {
      return normalizeStatus({ message: 'No fue posible consultar el documento' }, 'no_disponible');
    }
  }

  function credentialStatus(ref, extra) {
    if (!ref) return normalizeStatus({}, 'sin_credencial');
    if (!credentialProvider) return normalizeStatus({ message: 'Pendiente de conexión segura' }, 'pendiente_conexion');
    try {
      const out = typeof credentialProvider.status === 'function' ? credentialProvider.status(ref, context(extra)) : { available: true, copyAvailable: true };
      return normalizeStatus(out, 'disponible');
    } catch (e) {
      return normalizeStatus({ message: 'No fue posible consultar el acceso' }, 'no_disponible');
    }
  }

  async function resolveDocument(ref, extra) {
    if (!documentProvider) {
      audit('document.resolve', ref, 'pendiente_conexion');
      return { status: 'pendiente_conexion', message: 'Pendiente de conexión documental' };
    }
    try {
      const out = await documentProvider.resolve(ref, context(extra));
      audit('document.resolve', ref, 'ok', { hasPreview: !!(out && (out.previewUrl || out.embedUrl)) });
      return Object.assign({ status: 'disponible' }, out || {});
    } catch (e) {
      audit('document.resolve', ref, 'error', { code: e && e.code ? e.code : '' });
      return { status: 'no_disponible', message: 'No fue posible abrir el documento' };
    }
  }

  async function downloadDocument(ref, extra) {
    if (!documentProvider || typeof documentProvider.download !== 'function') {
      audit('document.download', ref, 'pendiente_conexion');
      return { ok: false, status: 'pendiente_conexion' };
    }
    try {
      const out = await documentProvider.download(ref, context(extra));
      audit('document.download', ref, 'ok');
      return Object.assign({ ok: true }, out || {});
    } catch (e) {
      audit('document.download', ref, 'error');
      return { ok: false, status: 'no_disponible' };
    }
  }

  async function revealCredential(ref, extra) {
    if (!credentialProvider || typeof credentialProvider.reveal !== 'function') {
      audit('credential.reveal', ref, 'pendiente_conexion');
      return { ok: false, status: 'pendiente_conexion', message: 'Pendiente de conexión segura' };
    }
    try {
      const out = await credentialProvider.reveal(ref, context(extra));
      audit('credential.reveal', ref, out && out.ok === false ? 'denegado' : 'ok');
      return Object.assign({ ok: true, expiresInMs: 6000 }, out || {});
    } catch (e) {
      audit('credential.reveal', ref, 'error');
      return { ok: false, status: 'no_disponible', message: 'No fue posible recuperar el acceso' };
    }
  }

  async function copyCredential(ref, extra) {
    if (!credentialProvider || typeof credentialProvider.copy !== 'function') {
      audit('credential.copy', ref, 'pendiente_conexion');
      return { ok: false, status: 'pendiente_conexion', message: 'Pendiente de conexión segura' };
    }
    try {
      const out = await credentialProvider.copy(ref, context(extra));
      audit('credential.copy', ref, out && out.ok === false ? 'denegado' : 'ok');
      return Object.assign({ ok: true }, out || {});
    } catch (e) {
      audit('credential.copy', ref, 'error');
      return { ok: false, status: 'no_disponible', message: 'No fue posible copiar el acceso' };
    }
  }

  function selfTest() {
    const d = documentStatus('doc_test');
    const c = credentialStatus('cred_test');
    return {
      ok: !!(d && c),
      documentProvider: !!documentProvider,
      credentialProvider: !!credentialProvider,
      documentStatus: d.status,
      credentialStatus: c.status
    };
  }

  return {
    registerDocumentProvider,
    registerCredentialProvider,
    documentStatus,
    credentialStatus,
    resolveDocument,
    downloadDocument,
    revealCredential,
    copyCredential,
    context,
    audit,
    selfTest
  };
})();
