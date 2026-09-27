/* ============================================================
   Gravicentra Insurance · Google Drive document provider P0
   B2 R15/R15A
   - Drive remains the documentary repository.
   - Google OAuth access token remains only in browser memory for the active session.
   - All uploads use authenticated Firebase callable functions and delegated Drive OAuth.
   - Preview is isolated to synthetic B2 client folders.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  const runtime = () => Orbit.productRuntimeBrowserProvidersP0;
  const tenantId = () => String((window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__ || {}).tenantHint || '').trim();
  const activeRole = () => {
    try { return Orbit.session && Orbit.session.rol ? String(Orbit.session.rol() || '').trim() : ''; }
    catch (_) { return ''; }
  };
  const isPreview = () => /--/.test(String(location.hostname || ''));
  const state = {
    probed: false,
    probing: null,
    connecting: null,
    lastProbeAt: 0,
    accessToken: '',
    tokenIssuedAt: 0,
    driveUserEmail: '',
    status: { available: false, status: 'oauth_required', message: 'Conecta una cuenta Google con acceso al Drive de A&S.' }
  };

  function call(name, data, region) {
    const r = runtime();
    if (!r || typeof r.callFunction !== 'function') return Promise.reject(new Error('PRODUCT_RUNTIME_CALLABLE_UNAVAILABLE'));
    return r.callFunction(name, data, region);
  }

  function tokenFresh() {
    return !!state.accessToken && (Date.now() - state.tokenIssuedAt) < 45 * 60 * 1000;
  }

  function clearToken(status) {
    state.accessToken = '';
    state.tokenIssuedAt = 0;
    state.driveUserEmail = '';
    state.probed = false;
    state.status = status || { available: false, status: 'oauth_required', message: 'Conecta una cuenta Google con acceso al Drive de A&S.' };
  }

  async function connect() {
    if (state.connecting) return state.connecting;
    const r = runtime();
    if (!r || typeof r.initialize !== 'function') {
      state.status = { available: false, status: 'runtime_unavailable', message: 'No está disponible la conexión segura con Google.' };
      return state.status;
    }
    state.connecting = r.initialize().then(async ctx => {
      const authMod = ctx && ctx.modules && ctx.modules.auth;
      const auth = ctx && ctx.auth;
      const user = auth && auth.currentUser;
      if (!authMod || !user || typeof authMod.GoogleAuthProvider !== 'function') throw new Error('DRIVE_FIREBASE_AUTH_UNAVAILABLE');
      const provider = new authMod.GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive');
      provider.setCustomParameters({ prompt: 'consent', include_granted_scopes: 'true' });
      const linked = Array.isArray(user.providerData) && user.providerData.some(p => p && p.providerId === 'google.com');
      let result;
      if (linked && typeof authMod.reauthenticateWithPopup === 'function') result = await authMod.reauthenticateWithPopup(user, provider);
      else if (typeof authMod.linkWithPopup === 'function') result = await authMod.linkWithPopup(user, provider);
      else throw new Error('DRIVE_GOOGLE_POPUP_UNAVAILABLE');
      const credential = authMod.GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential && credential.accessToken ? String(credential.accessToken) : '';
      if (!accessToken) throw new Error('DRIVE_GOOGLE_ACCESS_TOKEN_MISSING');
      state.accessToken = accessToken;
      state.tokenIssuedAt = Date.now();
      state.probed = false;
      return probe(true);
    }).catch(error => {
      const raw = String(error && (error.code || error.message) || '');
      const popupClosed = /popup-closed|cancelled-popup|popup_closed/i.test(raw);
      const providerDisabled = /operation-not-allowed|provider-disabled/i.test(raw);
      clearToken({
        available: false,
        status: popupClosed ? 'oauth_cancelled' : providerDisabled ? 'google_provider_disabled' : 'oauth_failed',
        message: popupClosed
          ? 'La conexión con Google fue cancelada.'
          : providerDisabled
            ? 'El proveedor Google de Firebase Auth no está habilitado para esta plataforma.'
            : 'No fue posible conectar la cuenta Google con Drive.',
        code: raw
      });
      return state.status;
    }).finally(() => { state.connecting = null; });
    return state.connecting;
  }

  function callableNames() {
    return isPreview()
      ? { status: 'orbit360DocumentDriveStatusPreview', upload: 'orbit360DocumentDriveUploadPreview', region: 'us-east1' }
      : { status: 'orbit360DocumentDriveStatus', upload: 'orbit360DocumentDriveUpload', region: 'us-central1' };
  }

  function requestBase(extra) {
    return {
      tenantId: tenantId(),
      activeRole: activeRole(),
      entidad: String(extra && extra.entidad || 'cliente'),
      entidadId: String(extra && extra.entidadId || ''),
      clienteId: String(extra && (extra.clienteId || extra.clientId) || ''),
      polizaId: String(extra && (extra.polizaId || extra.policyId) || ''),
      categoria: String(extra && extra.categoria || ''),
      nombre: String(extra && extra.nombre || '')
    };
  }

  function probe(force) {
    if (!tokenFresh()) {
      if (state.accessToken) clearToken({ available: false, status: 'oauth_expired', message: 'La autorización de Google Drive venció. Vuelve a conectar Drive.' });
      else if (!state.status || !/^oauth_|google_provider/.test(String(state.status.status || ''))) {
        state.status = { available: false, status: 'oauth_required', message: 'Conecta una cuenta Google con acceso al Drive de A&S.' };
      }
      return Promise.resolve(state.status);
    }
    if (state.probing && !force) return state.probing;
    if (state.probed && !force) return Promise.resolve(state.status);
    const names = callableNames();
    const payload = { tenantId: tenantId(), activeRole: activeRole(), googleAccessToken: state.accessToken };
    state.lastProbeAt = Date.now();
    state.probing = call(names.status, payload, names.region)
      .then(out => {
        state.probed = true;
        state.status = Object.assign(
          { available: false, status: 'sin_permiso_drive', message: 'Drive no disponible para esta cuenta Google.' },
          out || {}
        );
        state.driveUserEmail = String(state.status.driveUserEmail || '');
        if (state.status.status === 'oauth_expired') clearToken(state.status);
        return state.status;
      })
      .catch(error => {
        const raw = String(error && (error.code || error.message) || '');
        if (/unauthenticated|oauth|token|401/i.test(raw)) clearToken({ available: false, status: 'oauth_expired', message: 'La autorización de Google Drive venció. Vuelve a conectar Drive.', code: raw });
        else state.status = { available: false, status: 'sin_permiso_drive', message: 'No fue posible validar el acceso al Drive de A&S.', code: raw };
        return state.status;
      })
      .finally(() => { state.probing = null; });
    return state.probing;
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('DOCUMENT_FILE_REQUIRED'));
      if (file.size > 15 * 1024 * 1024) return reject(new Error('DOCUMENT_FILE_TOO_LARGE'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('DOCUMENT_FILE_READ_FAILED'));
      reader.onload = () => {
        const value = String(reader.result || '');
        const comma = value.indexOf(',');
        resolve(comma >= 0 ? value.slice(comma + 1) : value);
      };
      reader.readAsDataURL(file);
    });
  }

  async function upload(file, extra) {
    if (!tokenFresh()) return { ok: false, status: 'oauth_required', message: 'Conecta Drive antes de cargar documentos.' };
    const status = await probe(true);
    if (!status || status.available !== true) {
      return {
        ok: false,
        status: status && status.status || 'pendiente_conexion',
        message: status && status.message || 'Drive no está conectado.'
      };
    }
    const names = callableNames();
    let base64;
    try { base64 = await toBase64(file); }
    catch (error) {
      return {
        ok: false,
        status: /TOO_LARGE/.test(String(error && error.message)) ? 'archivo_demasiado_grande' : 'lectura_fallida',
        message: /TOO_LARGE/.test(String(error && error.message)) ? 'El archivo supera el límite de 15 MB.' : 'No fue posible leer el archivo.'
      };
    }
    const payload = Object.assign(requestBase(extra), {
      name: file.name || (extra && extra.nombre) || 'Documento',
      mimeType: file.type || 'application/octet-stream',
      size: file.size || 0,
      base64,
      googleAccessToken: state.accessToken
    });
    try {
      const out = await call(names.upload, payload, names.region);
      if (!out || out.ok !== true || !(out.documentRef || out.driveUrl || out.externalUrl)) {
        return Object.assign({ ok: false, status: 'sin_readback', message: 'Drive no confirmó el documento.' }, out || {});
      }
      return out;
    } catch (error) {
      const raw = String(error && (error.code || error.message) || '');
      if (/oauth|token|401|unauthenticated/i.test(raw)) clearToken({ available: false, status: 'oauth_expired', message: 'La autorización de Google Drive venció. Vuelve a conectar Drive.', code: raw });
      return {
        ok: false,
        status: /permission-denied/i.test(raw) ? 'sin_permiso' : /not-found/i.test(raw) ? 'sin_referencia' : 'no_disponible',
        message: /PREVIEW|permission-denied/i.test(raw)
          ? 'La carga no está autorizada para este registro en el entorno actual.'
          : 'No fue posible guardar el documento en Drive.',
        code: raw
      };
    }
  }

  function resolve(ref, extra) {
    const raw = typeof ref === 'object' && ref ? ref : { documentRef: ref };
    const url = String(raw.driveUrl || raw.externalUrl || raw.url || '').trim();
    if (/^https:\/\/[^\s]+$/i.test(url)) return Promise.resolve({ ok: true, status: 'disponible', externalUrl: url, url });
    const id = String(raw.documentRef || raw.fileId || '').trim();
    if (/^[A-Za-z0-9_-]{20,}$/.test(id)) {
      const driveUrl = 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view';
      return Promise.resolve({ ok: true, status: 'disponible', externalUrl: driveUrl, url: driveUrl });
    }
    return Promise.resolve({ ok: false, status: 'sin_referencia', message: 'Documento sin referencia Drive.' });
  }

  const provider = {
    resolve,
    upload,
    connect,
    disconnect: () => clearToken(),
    uploadStatus: () => {
      const stale = Date.now() - state.lastProbeAt > 30000;
      if (tokenFresh() && !state.probing && (!state.probed || (state.status.available !== true && stale))) setTimeout(() => probe(true), 0);
      return Object.assign({}, state.status, { connected: tokenFresh(), driveUserEmail: state.driveUserEmail });
    },
    probe,
    repository: 'Google Drive',
    oauthDelegated: true,
    tokenPersistence: 'memory_only',
    maxBytes: 15 * 1024 * 1024,
    previewIsolated: isPreview()
  };

  function register() {
    if (!Orbit.secureResources || typeof Orbit.secureResources.registerDocumentProvider !== 'function') return false;
    Orbit.secureResources.registerDocumentProvider(provider);
    if (tokenFresh()) setTimeout(() => probe(false), 0);
    return true;
  }

  if (!register()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (register() || attempts > 80) clearInterval(timer);
    }, 100);
  }

  document.addEventListener('orbit:active-role-changed', () => probe(true));
  window.addEventListener('focus', () => { if (tokenFresh() && !state.probed) probe(false); });

  Orbit.productDriveDocumentProviderP0 = Object.freeze({
    VERSION: 'b2-r15-20260927.2-oauth',
    connect,
    disconnect: () => clearToken(),
    probe,
    upload,
    status: () => Object.assign({}, state.status, { connected: tokenFresh(), driveUserEmail: state.driveUserEmail }),
    previewIsolated: isPreview(),
    oauthDelegated: true,
    tokenPersistence: 'memory_only',
    repository: 'Google Drive'
  });
})();
