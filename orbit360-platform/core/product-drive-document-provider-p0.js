/* ============================================================
   Gravicentra Insurance · Google Drive document provider P0
   B2 R84 · tenant-persistent backend authority
   - Routine users never authorize/select a Google account.
   - Drive refresh token lives only in backend Secret Manager.
   - Gravicentra role/scope authorizes each document operation.
   - Preview writes remain isolated to synthetic B2 folders.
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
    bootstrapping: null,
    lastProbeAt: 0,
    status: { available: false, configured: false, backendPersistent: true, status: 'checking', message: 'Verificando repositorio documental.' }
  };

  function call(name, data, region) {
    const r = runtime();
    if (!r || typeof r.callFunction !== 'function') return Promise.reject(new Error('PRODUCT_RUNTIME_CALLABLE_UNAVAILABLE'));
    return r.callFunction(name, data, region);
  }
  function callableNames() {
    return isPreview()
      ? { status: 'orbit360DocumentDriveStatusPreview', upload: 'orbit360DocumentDriveUploadPreview', read: 'orbit360DocumentDriveReadPreview', download: 'orbit360DocumentDriveDownloadPreview', bootstrap: 'orbit360DocumentDriveBootstrapPreview', region: 'us-east1' }
      : { status: 'orbit360DocumentDriveStatus', upload: 'orbit360DocumentDriveUpload', read: 'orbit360DocumentDriveRead', download: 'orbit360DocumentDriveDownload', bootstrap: 'orbit360DocumentDriveBootstrap', region: 'us-central1' };
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
  function bytesFromBase64(base64, mimeType) {
    const raw = atob(String(base64 || ''));
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    return new Blob([bytes], { type: String(mimeType || 'application/octet-stream') });
  }
  function driveFileId(ref) {
    const raw = typeof ref === 'object' && ref ? ref : { documentRef: ref };
    const direct = String(raw.documentRef || raw.fileId || raw.archivoRef || '').trim();
    if (/^[A-Za-z0-9_-]{20,}$/.test(direct)) return direct;
    const url = String(raw.driveUrl || raw.externalUrl || raw.url || '').trim();
    const m = url.match(/\/d\/([A-Za-z0-9_-]{20,})/) || url.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
    return m ? m[1] : '';
  }
  function probe(force) {
    if (state.probing && !force) return state.probing;
    if (state.probed && !force) return Promise.resolve(state.status);
    const names = callableNames();
    state.lastProbeAt = Date.now();
    state.probing = call(names.status, { tenantId: tenantId(), activeRole: activeRole() }, names.region)
      .then(out => {
        state.probed = true;
        state.status = Object.assign({ available: false, configured: false, backendPersistent: true, status: 'no_disponible' }, out || {});
        return state.status;
      })
      .catch(error => {
        state.status = { available: false, configured: false, backendPersistent: true, status: 'no_disponible', message: 'No fue posible verificar el repositorio documental.', code: String(error && (error.code || error.message) || '') };
        return state.status;
      })
      .finally(() => { state.probing = null; });
    return state.probing;
  }
  function connect() { return probe(true); }

  async function bootstrap() {
    if (state.bootstrapping) return state.bootstrapping;
    const r = runtime();
    if (!r || typeof r.initialize !== 'function') return { ok: false, status: 'runtime_unavailable', message: 'No está disponible la configuración segura de Drive.' };
    state.bootstrapping = r.initialize().then(async ctx => {
      const authMod = ctx && ctx.modules && ctx.modules.auth;
      const appMod = ctx && ctx.modules && ctx.modules.app;
      if (!authMod || !appMod || typeof authMod.GoogleAuthProvider !== 'function' || typeof authMod.signInWithPopup !== 'function') throw new Error('DRIVE_BOOTSTRAP_FIREBASE_AUTH_UNAVAILABLE');
      const publicConfig = window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__ || {};
      const secondaryName = 'orbit360-drive-admin-bootstrap';
      let secondaryApp = (appMod.getApps ? appMod.getApps() : []).find(a => a && a.name === secondaryName);
      if (!secondaryApp) secondaryApp = appMod.initializeApp({ apiKey: publicConfig.apiKey, authDomain: publicConfig.authDomain, projectId: publicConfig.projectId, appId: publicConfig.appId }, secondaryName);
      const secondaryAuth = authMod.getAuth(secondaryApp);
      if (typeof authMod.setPersistence === 'function' && authMod.inMemoryPersistence) await authMod.setPersistence(secondaryAuth, authMod.inMemoryPersistence);
      if (secondaryAuth.currentUser && typeof authMod.signOut === 'function') { try { await authMod.signOut(secondaryAuth); } catch (_) {} }
      const provider = new authMod.GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive');
      provider.setCustomParameters({ prompt: 'consent', access_type: 'offline', include_granted_scopes: 'true' });
      const result = await authMod.signInWithPopup(secondaryAuth, provider);
      const tr = result && result._tokenResponse ? result._tokenResponse : {};
      const oauthRefreshToken = String(tr.oauthRefreshToken || tr.oauth_refresh_token || '').trim();
      try { if (typeof authMod.signOut === 'function') await authMod.signOut(secondaryAuth); } catch (_) {}
      if (!oauthRefreshToken) return { ok: false, status: 'bootstrap_refresh_token_missing', message: 'Google no entregó autorización persistente. La conexión no se guardó.' };
      const names = callableNames();
      const out = await call(names.bootstrap, { tenantId: tenantId(), activeRole: activeRole(), oauthRefreshToken }, names.region);
      state.probed = false;
      await probe(true);
      return Object.assign({ ok: true }, out || {});
    }).catch(error => ({ ok: false, status: 'bootstrap_failed', message: 'No fue posible configurar Drive de forma persistente.', code: String(error && (error.code || error.message) || '') }))
      .finally(() => { state.bootstrapping = null; });
    return state.bootstrapping;
  }

  async function upload(file, extra) {
    const names = callableNames();
    let base64;
    try { base64 = await toBase64(file); }
    catch (error) { return { ok: false, status: /TOO_LARGE/.test(String(error && error.message)) ? 'archivo_demasiado_grande' : 'lectura_fallida', message: /TOO_LARGE/.test(String(error && error.message)) ? 'El archivo supera el límite de 15 MB.' : 'No fue posible leer el archivo.' }; }
    const payload = Object.assign(requestBase(extra), { name: file.name || (extra && extra.nombre) || 'Documento', mimeType: file.type || 'application/octet-stream', size: file.size || 0, base64 });
    try {
      const out = await call(names.upload, payload, names.region);
      if (!out || out.ok !== true || !(out.documentRef || out.driveUrl || out.externalUrl)) return Object.assign({ ok: false, status: 'sin_readback', message: 'Drive no confirmó el documento.' }, out || {});
      return out;
    } catch (error) {
      const raw = String(error && (error.code || error.message) || '');
      return { ok: false, status: /permission-denied/i.test(raw) ? 'sin_permiso' : /not-found/i.test(raw) ? 'sin_referencia' : /SETUP_REQUIRED/i.test(raw) ? 'tenant_setup_required' : 'no_disponible', message: 'No fue posible guardar el documento en Drive.', code: raw };
    }
  }
  async function resolve(ref, extra) {
    const id = driveFileId(ref);
    if (!id) return { ok: false, status: 'sin_referencia', message: 'Documento sin referencia Drive.', downloadAvailable: false };
    const names = callableNames();
    try {
      const out = await call(names.read, Object.assign(requestBase(extra), { documentRef: id }), names.region);
      if (!out || out.ok !== true || !out.base64) return Object.assign({ ok: false, status: 'sin_readback', downloadAvailable: false }, out || {});
      const blob = bytesFromBase64(out.base64, out.mimeType);
      const blobUrl = URL.createObjectURL(blob);
      return Object.assign({}, out, { ok: true, status: 'disponible', previewUrl: out.previewAvailable === true ? blobUrl : '', downloadAvailable: true, backendPersistent: true });
    } catch (error) {
      return { ok: false, status: 'no_disponible', message: 'No fue posible abrir el documento.', downloadAvailable: false, code: String(error && (error.code || error.message) || '') };
    }
  }
  async function download(ref, extra) {
    const id = driveFileId(ref);
    if (!id) return { ok: false, status: 'sin_referencia', message: 'Documento sin referencia Drive.' };
    const names = callableNames();
    try {
      const out = await call(names.download, Object.assign(requestBase(extra), { documentRef: id }), names.region);
      if (!out || out.ok !== true || !out.base64) return Object.assign({ ok: false, status: 'sin_readback' }, out || {});
      const blob = bytesFromBase64(out.base64, out.mimeType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = String(out.nombre || 'documento'); a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} try { a.remove(); } catch (_) {} }, 2000);
      return { ok: true, status: 'descargado', downloaded: true, fileName: a.download, mimeType: out.mimeType || blob.type || '', backendPersistent: true };
    } catch (error) {
      return { ok: false, status: 'no_disponible', message: 'No fue posible descargar el documento.', code: String(error && (error.code || error.message) || '') };
    }
  }

  const provider = {
    resolve, download, upload, connect, bootstrap,
    uploadStatus: () => {
      const stale = Date.now() - state.lastProbeAt > 30000;
      if (!state.probing && (!state.probed || stale)) setTimeout(() => probe(true), 0);
      return Object.assign({}, state.status);
    },
    probe,
    status: () => Object.assign({}, state.status),
    repository: 'Google Drive',
    oauthDelegated: false,
    backendPersistent: true,
    tokenPersistence: 'backend_secret_manager',
    maxBytes: 15 * 1024 * 1024,
    previewIsolated: isPreview()
  };
  function register() {
    if (!Orbit.secureResources || typeof Orbit.secureResources.registerDocumentProvider !== 'function') return false;
    Orbit.secureResources.registerDocumentProvider(provider);
    setTimeout(() => probe(false), 0);
    return true;
  }
  if (!register()) {
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (register() || attempts > 80) clearInterval(timer); }, 100);
  }
  document.addEventListener('orbit:active-role-changed', () => { state.probed = false; probe(true); });

  Orbit.productDriveDocumentProviderP0 = Object.freeze({
    VERSION: 'b2-r84-20260927.1-tenant-persistent',
    connect, bootstrap, probe, upload, resolve, download,
    status: () => Object.assign({}, state.status),
    previewIsolated: isPreview(),
    oauthDelegated: false,
    backendPersistent: true,
    tokenPersistence: 'backend_secret_manager',
    repository: 'Google Drive'
  });
})();
