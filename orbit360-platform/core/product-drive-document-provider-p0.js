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
      const appMod = ctx && ctx.modules && ctx.modules.app;
      const mainUser = ctx && ctx.auth && ctx.auth.currentUser;
      if (!authMod || !appMod || !mainUser || typeof authMod.GoogleAuthProvider !== 'function') throw new Error('DRIVE_FIREBASE_AUTH_UNAVAILABLE');

      const provider = new authMod.GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive');
      provider.setCustomParameters({ prompt: 'consent', include_granted_scopes: 'true' });

      const publicConfig = window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__ || {};
      const secondaryName = 'orbit360-drive-oauth-session';
      let secondaryApp = (appMod.getApps ? appMod.getApps() : []).find(a => a && a.name === secondaryName);
      if (!secondaryApp) {
        secondaryApp = appMod.initializeApp({
          apiKey: publicConfig.apiKey,
          authDomain: publicConfig.authDomain,
          projectId: publicConfig.projectId,
          appId: publicConfig.appId
        }, secondaryName);
      }
      const secondaryAuth = authMod.getAuth(secondaryApp);
      if (typeof authMod.setPersistence === 'function' && authMod.inMemoryPersistence) {
        await authMod.setPersistence(secondaryAuth, authMod.inMemoryPersistence);
      }
      if (secondaryAuth.currentUser && typeof authMod.signOut === 'function') {
        try { await authMod.signOut(secondaryAuth); } catch (_) {}
      }
      if (typeof authMod.signInWithPopup !== 'function') throw new Error('DRIVE_GOOGLE_POPUP_UNAVAILABLE');
      const result = await authMod.signInWithPopup(secondaryAuth, provider);
      const credential = authMod.GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential && credential.accessToken ? String(credential.accessToken) : '';
      if (!accessToken) throw new Error('DRIVE_GOOGLE_ACCESS_TOKEN_MISSING');
      state.accessToken = accessToken;
      state.tokenIssuedAt = Date.now();
      state.probed = false;
      try { if (typeof authMod.signOut === 'function') await authMod.signOut(secondaryAuth); } catch (_) {}
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

  function driveFileId(ref) {
    const raw = typeof ref === 'object' && ref ? ref : { documentRef: ref };
    const direct = String(raw.documentRef || raw.fileId || raw.archivoRef || '').trim();
    if (/^[A-Za-z0-9_-]{20,}$/.test(direct)) return direct;
    const url = String(raw.driveUrl || raw.externalUrl || raw.url || '').trim();
    const m = url.match(/\/d\/([A-Za-z0-9_-]{20,})/) || url.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
    return m ? m[1] : '';
  }

  function resolve(ref, extra) {
    const raw = typeof ref === 'object' && ref ? ref : { documentRef: ref };
    const url = String(raw.driveUrl || raw.externalUrl || raw.url || '').trim();
    const id = driveFileId(raw);
    const downloadAvailable = !!(id && tokenFresh());
    if (/^https:\/\/[^\s]+$/i.test(url)) return Promise.resolve({ ok: true, status: 'disponible', externalUrl: url, url, downloadAvailable });
    if (id) {
      const driveUrl = 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view';
      return Promise.resolve({ ok: true, status: 'disponible', externalUrl: driveUrl, url: driveUrl, downloadAvailable });
    }
    return Promise.resolve({ ok: false, status: 'sin_referencia', message: 'Documento sin referencia Drive.', downloadAvailable: false });
  }

  async function download(ref) {
    if (!tokenFresh()) return { ok: false, status: 'oauth_required', message: 'Conecta Drive antes de descargar documentos.' };
    const id = driveFileId(ref);
    if (!id) return { ok: false, status: 'sin_referencia', message: 'Documento sin referencia Drive.' };
    try {
      const headers = { Authorization: 'Bearer ' + state.accessToken };
      const metaUrl = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?fields=id,name,mimeType,size,capabilities(canDownload)&supportsAllDrives=true';
      const metaResp = await fetch(metaUrl, { headers });
      if (!metaResp.ok) {
        const code = metaResp.status;
        return { ok: false, status: code === 403 ? 'sin_permiso' : code === 404 ? 'sin_referencia' : 'no_disponible', message: 'Drive no autorizó la descarga.' };
      }
      const meta = await metaResp.json();
      if (meta && meta.capabilities && meta.capabilities.canDownload === false) {
        return { ok: false, status: 'sin_permiso', message: 'Drive no permite descargar este documento.' };
      }
      if (/^application\/vnd\.google-apps\./i.test(String(meta && meta.mimeType || ''))) {
        return { ok: false, status: 'solo_drive', message: 'Este archivo nativo de Google debe abrirse en Drive.' };
      }
      const mediaUrl = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media&supportsAllDrives=true';
      const mediaResp = await fetch(mediaUrl, { headers });
      if (!mediaResp.ok) {
        const code = mediaResp.status;
        return { ok: false, status: code === 403 ? 'sin_permiso' : code === 404 ? 'sin_referencia' : 'no_disponible', message: 'No fue posible descargar el archivo desde Drive.' };
      }
      const blob = await mediaResp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = String(meta && meta.name || 'documento');
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { URL.revokeObjectURL(blobUrl); } catch (_) {} try { a.remove(); } catch (_) {} }, 1500);
      return { ok: true, status: 'descargado', downloaded: true, fileName: a.download, mimeType: String(meta && meta.mimeType || blob.type || '') };
    } catch (error) {
      const raw = String(error && (error.code || error.message) || '');
      if (/oauth|token|401|unauthenticated/i.test(raw)) clearToken({ available: false, status: 'oauth_expired', message: 'La autorización de Google Drive venció. Vuelve a conectar Drive.', code: raw });
      return { ok: false, status: 'no_disponible', message: 'No fue posible descargar el documento desde Drive.', code: raw };
    }
  }

  const provider = {
    resolve,
    download,
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
    VERSION: 'b2-r15b-20260927.4-drive-download',
    connect,
    disconnect: () => clearToken(),
    probe,
    upload,
    download,
    status: () => Object.assign({}, state.status, { connected: tokenFresh(), driveUserEmail: state.driveUserEmail }),
    previewIsolated: isPreview(),
    oauthDelegated: true,
    tokenPersistence: 'memory_only',
    repository: 'Google Drive'
  });
})();
