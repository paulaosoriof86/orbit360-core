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
  const stagedByRef = new Map();
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
      ? { status: 'orbit360DocumentDriveStatusPreview', upload: 'orbit360DocumentDriveUploadPreview', read: 'orbit360DocumentDriveReadPreview', download: 'orbit360DocumentDriveDownloadPreview', finalize: 'orbit360DocumentDriveFinalizePreview', quarantine: 'orbit360DocumentDriveQuarantinePreview', bootstrap: 'orbit360DocumentDriveBootstrapPreview', region: 'us-east1' }
      : { status: 'orbit360DocumentDriveStatus', upload: 'orbit360DocumentDriveUpload', read: 'orbit360DocumentDriveRead', download: 'orbit360DocumentDriveDownload', finalize: 'orbit360DocumentDriveFinalize', quarantine: 'orbit360DocumentDriveQuarantine', bootstrap: 'orbit360DocumentDriveBootstrap', region: 'us-central1' };
  }
  function requestBase(extra) {
    return {
      tenantId: tenantId(),
      activeRole: activeRole(),
      entidad: String(extra && extra.entidad || 'cliente'),
      entidadId: String(extra && extra.entidadId || ''),
      clienteId: String(extra && (extra.clienteId || extra.clientId) || ''),
      polizaId: String(extra && (extra.polizaId || extra.policyId) || ''),
      receiptId: String(extra && (extra.receiptId || extra.reciboId) || ''),
      sourceModule: String(extra && extra.sourceModule || ''),
      documentType: String(extra && extra.documentType || ''),
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
        if (state.status.bootstrapRequired === true && state.status.bootstrapClientId) setTimeout(() => loadGoogleIdentity().catch(() => {}), 0);
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

  let gisPromise = null;
  function loadGoogleIdentity() {
    if (window.google && google.accounts && google.accounts.oauth2 && typeof google.accounts.oauth2.initCodeClient === 'function') return Promise.resolve(window.google);
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-orbit-google-identity]');
      const ready = () => {
        if (window.google && google.accounts && google.accounts.oauth2 && typeof google.accounts.oauth2.initCodeClient === 'function') resolve(window.google);
        else reject(new Error('DRIVE_BOOTSTRAP_GIS_UNAVAILABLE'));
      };
      if (existing) {
        existing.addEventListener('load', ready, { once: true });
        existing.addEventListener('error', () => reject(new Error('DRIVE_BOOTSTRAP_GIS_LOAD_FAILED')), { once: true });
        if (window.google && google.accounts && google.accounts.oauth2) ready();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.orbitGoogleIdentity = '1';
      script.onload = ready;
      script.onerror = () => reject(new Error('DRIVE_BOOTSTRAP_GIS_LOAD_FAILED'));
      document.head.appendChild(script);
    }).catch(error => { gisPromise = null; throw error; });
    return gisPromise;
  }

  async function bootstrap() {
    if (state.bootstrapping) return state.bootstrapping;
    state.bootstrapping = (async () => {
      const status = state.status && state.status.bootstrapRequired === true ? state.status : await probe(true);
      const clientId = String(status && status.bootstrapClientId || '').trim();
      if (!clientId) return { ok: false, status: 'bootstrap_client_unavailable', message: 'No está disponible la configuración segura de Google Drive.' };
      const g = await loadGoogleIdentity();
      const names = callableNames();
      return new Promise(resolve => {
        let settled = false;
        const done = value => { if (!settled) { settled = true; resolve(value); } };
        const client = g.accounts.oauth2.initCodeClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive',
          include_granted_scopes: true,
          ux_mode: 'popup',
          select_account: true,
          callback: async response => {
            if (!response || response.error || !response.code) {
              done({ ok: false, status: 'bootstrap_google_denied', message: 'Google no completó la autorización de Drive.', code: String(response && (response.error || response.error_description) || '') });
              return;
            }
            try {
              const out = await call(names.bootstrap, {
                tenantId: tenantId(),
                activeRole: activeRole(),
                authorizationCode: String(response.code),
                redirectUri: location.origin
              }, names.region);
              state.probed = false;
              await probe(true);
              done(Object.assign({ ok: true }, out || {}));
            } catch (error) {
              done({ ok: false, status: 'bootstrap_failed', message: 'No fue posible configurar Drive de forma persistente.', code: String(error && (error.code || error.message) || '') });
            }
          },
          error_callback: error => done({ ok: false, status: 'bootstrap_popup_failed', message: 'No fue posible abrir la autorización segura de Google Drive.', code: String(error && (error.type || error.message) || '') })
        });
        client.requestCode();
      });
    })().catch(error => ({ ok: false, status: 'bootstrap_failed', message: 'No fue posible configurar Drive de forma persistente.', code: String(error && (error.code || error.message) || '') }))
      .finally(() => { state.bootstrapping = null; });
    return state.bootstrapping;
  }

  async function upload(file, extra) {
    const names = callableNames();
    let base64;
    try { base64 = await toBase64(file); }
    catch (error) { return { ok: false, status: /TOO_LARGE/.test(String(error && error.message)) ? 'archivo_demasiado_grande' : 'lectura_fallida', message: /TOO_LARGE/.test(String(error && error.message)) ? 'El archivo supera el límite de 15 MB.' : 'No fue posible leer el archivo.' }; }
    const autoStage = !!(extra && String(extra.sourceModule || '').toLowerCase() === 'cobros');
    const payload = Object.assign(requestBase(extra), { name: file.name || (extra && extra.nombre) || 'Documento', mimeType: file.type || 'application/octet-stream', size: file.size || 0, base64, provisional: !!(extra && extra.provisional) || autoStage });
    try {
      const out = await call(names.upload, payload, names.region);
      if (!out || out.ok !== true || !(out.documentRef || out.driveUrl || out.externalUrl)) return Object.assign({ ok: false, status: 'sin_readback', message: 'Drive no confirmó el documento.' }, out || {});
      const ref = driveFileId(out);
      if (ref && out.provisional === true) stagedByRef.set(ref, Object.assign({}, extra || {}, { clientFolderId: out.clientFolderId || '', stagingFolderId: out.stagingFolderId || out.folderId || '', documentRef: ref }));
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

  function lifecycleExtra(ref, extra) {
    const id = driveFileId(ref), staged = id ? stagedByRef.get(id) : null;
    return Object.assign({}, staged || {}, extra || {});
  }
  async function finalize(ref, extra) {
    const id = driveFileId(ref);
    if (!id) return { ok: false, status: 'sin_referencia' };
    const ctx = lifecycleExtra(id, extra), names = callableNames();
    try {
      const out = await call(names.finalize, Object.assign(requestBase(ctx), { documentRef: id, clientFolderId: String(ctx.clientFolderId || ''), stagingFolderId: String(ctx.stagingFolderId || '') }), names.region);
      if (out && out.ok === true) stagedByRef.delete(id);
      return out;
    } catch (error) {
      return { ok: false, status: 'finalize_failed', code: String(error && (error.code || error.message) || '') };
    }
  }
  async function quarantine(ref, extra) {
    const id = driveFileId(ref);
    if (!id) return { ok: true, status: 'nothing_to_quarantine' };
    const ctx = lifecycleExtra(id, extra), names = callableNames();
    try {
      const out = await call(names.quarantine, Object.assign(requestBase(ctx), { documentRef: id, clientFolderId: String(ctx.clientFolderId || ''), stagingFolderId: String(ctx.stagingFolderId || '') }), names.region);
      if (out && out.ok === true) stagedByRef.delete(id);
      return out;
    } catch (error) {
      return { ok: false, status: 'quarantine_failed', code: String(error && (error.code || error.message) || '') };
    }
  }
  function pendingDocument(ref) {
    const id=driveFileId(ref); return id && stagedByRef.has(id) ? Object.assign({}, stagedByRef.get(id)) : null;
  }

  const provider = {
    resolve, download, upload, finalize, quarantine, pendingDocument, connect, bootstrap,
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
    VERSION: 'b3-004-r10-20260930.3-payment-staged-lifecycle',
    connect, bootstrap, probe, upload, finalize, quarantine, pendingDocument, resolve, download,
    status: () => Object.assign({}, state.status),
    previewIsolated: isPreview(),
    oauthDelegated: false,
    backendPersistent: true,
    tokenPersistence: 'backend_secret_manager',
    repository: 'Google Drive'
  });
})();
