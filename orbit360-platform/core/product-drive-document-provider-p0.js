/* ============================================================
   Gravicentra Insurance · Google Drive document provider P0
   B2 R15/R15A
   - Drive remains the documentary repository.
   - Browser never receives service-account credentials.
   - All uploads use authenticated Firebase callable functions.
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
    status: { available: false, status: 'pendiente_conexion', message: 'Verificando conexión con Drive…' }
  };

  function call(name, data, region) {
    const r = runtime();
    if (!r || typeof r.callFunction !== 'function') return Promise.reject(new Error('PRODUCT_RUNTIME_CALLABLE_UNAVAILABLE'));
    return r.callFunction(name, data, region);
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
    if (state.probing && !force) return state.probing;
    if (state.probed && !force) return Promise.resolve(state.status);
    const names = callableNames();
    const payload = { tenantId: tenantId(), activeRole: activeRole() };
    state.probing = call(names.status, payload, names.region)
      .then(out => {
        state.probed = true;
        state.status = Object.assign(
          { available: false, status: 'pendiente_conexion', message: 'Drive no disponible.' },
          out || {}
        );
        return state.status;
      })
      .catch(error => {
        state.probed = true;
        state.status = {
          available: false,
          status: 'pendiente_conexion',
          message: 'No fue posible verificar la conexión de Drive.',
          code: String(error && (error.code || error.message) || '')
        };
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
      base64
    });
    try {
      const out = await call(names.upload, payload, names.region);
      if (!out || out.ok !== true || !(out.documentRef || out.driveUrl || out.externalUrl)) {
        return Object.assign({ ok: false, status: 'sin_readback', message: 'Drive no confirmó el documento.' }, out || {});
      }
      return out;
    } catch (error) {
      const raw = String(error && (error.code || error.message) || '');
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
    uploadStatus: () => Object.assign({}, state.status),
    probe,
    repository: 'Google Drive',
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
    const timer = setInterval(() => {
      attempts += 1;
      if (register() || attempts > 80) clearInterval(timer);
    }, 100);
  }

  document.addEventListener('orbit:active-role-changed', () => probe(true));
  window.addEventListener('focus', () => { if (!state.probed) probe(false); });

  Orbit.productDriveDocumentProviderP0 = Object.freeze({
    VERSION: 'b2-r15-20260927.1',
    probe,
    upload,
    status: () => Object.assign({}, state.status),
    previewIsolated: isPreview(),
    repository: 'Google Drive'
  });
})();
