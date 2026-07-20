/* ============================================================
   Orbit 360 · Proveedor seguro de credenciales Aseguradoras · LAB v1.0
   - usa callable HTTPS autenticado;
   - conserva solo referencias opacas en Orbit.store;
   - no registra ni persiste usuario/contraseña en el frontend;
   - integra SecureResources, Sensitive P0.2 y el importador especializado.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};
  if (Orbit.__insurerCredentialProviderLabV20260720) return;

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)) || '';
  var host = String(window.location.hostname || '').toLowerCase();
  var authorizedHost = /^ays-orbit-360-lab--orbit360-ays-lab-[a-z0-9-]+\.(?:web\.app|firebaseapp\.com)$/i.test(host);
  var TENANT_ID = 'alianzas-soluciones';
  var PROJECT_ID = 'ays-orbit-360-lab';
  var REGION = 'us-central1';
  var REF_RE = /^cred_[a-f0-9]{32}$/;
  var VIEW_ROLES = ['direccion', 'superadmin', 'super_admin', 'admin', 'admintenant', 'admin_tenant', 'operativo'];

  if (mode !== 'firestore-lab' || tenant !== TENANT_ID || !authorizedHost) return;

  var endpointBase = 'https://' + REGION + '-' + PROJECT_ID + '.cloudfunctions.net/';
  var state = {
    version: '20260720.1',
    tenantId: TENANT_ID,
    providerRegistered: false,
    importProviderRegistered: false,
    lastErrorCode: '',
    lastCallAt: '',
    noSecretPersistence: true
  };

  function clean(value, max) {
    return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max || 512);
  }

  function norm(value) {
    return clean(value, 120).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function activeRole() {
    try { return clean(Orbit.session && Orbit.session.rol && Orbit.session.rol(), 80); } catch (error) { return ''; }
  }

  function canView(role) {
    return VIEW_ROLES.indexOf(norm(role || activeRole())) >= 0;
  }

  function authUser() {
    try {
      if (window.firebase && typeof firebase.auth === 'function') return firebase.auth().currentUser || null;
    } catch (error) {}
    try { return window.auth && auth.currentUser || null; } catch (error) {}
    return null;
  }

  function providerError(code, message) {
    var error = new Error(clean(message || 'No fue posible completar la operación segura.', 240));
    error.code = clean(code || 'secure_provider_error', 80).toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    return error;
  }

  async function callable(name, data) {
    var user = authUser();
    if (!user || typeof user.getIdToken !== 'function') throw providerError('unauthenticated', 'La sesión segura no está disponible.');
    var token = await user.getIdToken();
    var response;
    try {
      response = await fetch(endpointBase + name, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ data: Object.assign({ tenantId: TENANT_ID, activeRole: activeRole() }, data || {}) }),
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
      });
    } catch (error) {
      state.lastErrorCode = 'network_unavailable';
      throw providerError('network_unavailable', 'No fue posible conectar con el servicio seguro.');
    }
    var body = {};
    try { body = await response.json(); } catch (error) {}
    if (!response.ok || body.error) {
      var statusCode = body && body.error && body.error.status || ('http_' + response.status);
      state.lastErrorCode = norm(statusCode) || 'secure_provider_error';
      throw providerError(state.lastErrorCode, body && body.error && body.error.message || 'La operación segura fue rechazada.');
    }
    state.lastCallAt = new Date().toISOString();
    state.lastErrorCode = '';
    return body.result !== undefined ? body.result : body.data !== undefined ? body.data : body.response;
  }

  function resolveTarget(ref, extra) {
    extra = extra || {};
    var insurerId = clean(extra.insurerId || extra.aseguradoraId, 160);
    var portalId = clean(extra.portalId || extra.resourceId, 160);
    if (insurerId && portalId) return { insurerId: insurerId, portalId: portalId };
    try {
      var insurers = Orbit.store && Orbit.store.all ? (Orbit.store.all('aseguradoras') || []) : [];
      for (var i = 0; i < insurers.length; i += 1) {
        var portals = insurers[i].portales || [];
        for (var j = 0; j < portals.length; j += 1) {
          if (clean(portals[j].credentialRef, 80) !== clean(ref, 80)) continue;
          return { insurerId: clean(insurers[i].id, 160), portalId: clean(portals[j].id || String(j), 160) };
        }
      }
    } catch (error) {}
    return { insurerId: insurerId, portalId: portalId };
  }

  function fieldFrom(extra, fallback) {
    var value = norm(extra && (extra.field || extra.fieldType || extra.campo) || fallback || 'password');
    return /user|usuario/.test(value) ? 'username' : 'password';
  }

  function status(ref, extra) {
    var target = resolveTarget(ref, extra);
    var available = canView(extra && (extra.rolActivo || extra.activeRole)) && REF_RE.test(clean(ref, 80)) && !!target.insurerId && !!target.portalId;
    return {
      status: available ? 'disponible' : (clean(ref, 80) === 'backend_required' ? 'pendiente_conexion' : 'sin_credencial'),
      available: available,
      revealAvailable: available,
      copyAvailable: available,
      requiresReauth: true,
      message: available ? 'Acceso protegido disponible' : 'Vinculación segura pendiente'
    };
  }

  async function reveal(ref, extra) {
    var target = resolveTarget(ref, extra);
    if (!REF_RE.test(clean(ref, 80)) || !target.insurerId || !target.portalId) {
      return { ok: false, status: 'sin_credencial', message: 'La credencial todavía no tiene referencia segura.' };
    }
    return callable('orbit360RevealInsurerCredential', {
      credentialRef: clean(ref, 80),
      insurerId: target.insurerId,
      portalId: target.portalId,
      field: fieldFrom(extra, 'password')
    });
  }

  async function copy(ref, extra) {
    var target = resolveTarget(ref, extra);
    if (!REF_RE.test(clean(ref, 80)) || !target.insurerId || !target.portalId) {
      return { ok: false, status: 'sin_credencial', message: 'La credencial todavía no tiene referencia segura.' };
    }
    var result = await callable('orbit360CopyInsurerCredential', {
      credentialRef: clean(ref, 80),
      insurerId: target.insurerId,
      portalId: target.portalId,
      field: fieldFrom(extra, 'password')
    });
    var copied = false;
    try {
      if (result && result.value && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(result.value);
        copied = true;
      }
    } catch (error) {}
    if (result && typeof result === 'object') delete result.value;
    return { ok: copied, status: copied ? 'copied' : 'clipboard_unavailable' };
  }

  async function resolveCredential(input) {
    input = input || {};
    var result = await reveal(input.credentialRef, input);
    if (!result || result.ok === false || !clean(result.value)) throw providerError(result && result.status || 'credential_unavailable', result && result.message || 'Credencial no disponible.');
    return result;
  }

  async function copyCredential(input) {
    input = input || {};
    return copy(input.credentialRef, input);
  }

  async function importInsurerDirectory(payload) {
    payload = payload || {};
    var sourceHash = clean(payload.sourceHash, 80).toLowerCase();
    var sourceItems = Array.isArray(payload.items) ? payload.items : [];
    var items = sourceItems.map(function (item) {
      return {
        insurerId: clean(item && item.insurerId, 160),
        portalId: clean(item && (item.portalId || item.resourceId), 160),
        credentialRef: REF_RE.test(clean(item && item.credentialRef, 80)) ? clean(item.credentialRef, 80) : '',
        username: clean(item && item.username, 320),
        password: clean(item && item.password, 512)
      };
    }).filter(function (item) { return item.insurerId && item.portalId && (item.username || item.password); });
    if (!items.length) return { ok: true, status: 'sin_sensibles', imported: 0, mappings: [] };
    try {
      return await callable('orbit360ImportInsurerCredentials', { sourceHash: sourceHash, items: items });
    } finally {
      items.forEach(function (item) { item.username = ''; item.password = ''; });
      sourceItems.forEach(function (item) {
        try { item.username = ''; item.password = ''; item.accountNumber = ''; } catch (error) {}
      });
    }
  }

  var resourceProvider = { status: status, reveal: reveal, copy: copy };
  if (Orbit.secureResources && typeof Orbit.secureResources.registerCredentialProvider === 'function') {
    Orbit.secureResources.registerCredentialProvider(resourceProvider);
    state.providerRegistered = true;
  }

  var sensitiveProvider = Object.assign({}, window.OrbitSensitiveProvider || {}, {
    resolveCredential: resolveCredential,
    getCredential: resolveCredential,
    copyCredential: copyCredential,
    credentialStatus: status,
    version: '20260720.1',
    tenantId: TENANT_ID,
    exposesSecretsInStore: false
  });
  window.OrbitSensitiveProvider = sensitiveProvider;
  if (!Orbit.secureSecrets) Orbit.secureSecrets = sensitiveProvider;

  Orbit.secureImport = Object.assign({}, Orbit.secureImport || {}, {
    importInsurerDirectory: importInsurerDirectory,
    version: '20260720.1',
    remoteConfirmationRequired: true,
    retainsSecretPayload: false
  });
  state.importProviderRegistered = true;

  Orbit.__insurerCredentialProviderLabV20260720 = state;
  try { window.dispatchEvent(new CustomEvent('orbit:insurer-credential-provider-ready', { detail: { version: state.version, tenantId: TENANT_ID } })); } catch (error) {}
})();
