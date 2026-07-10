/* ============================================================
   Orbit 360 · P0.9l · Bridge documental same-origin
   Fecha: 2026-07-10

   Cliente LAB para el host local controlado. No contiene endpoints externos,
   credenciales, rutas, referencias persistidas ni habilitaciones.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var VERSION = 'p09l-v1';
  var BASE = '/__orbit360';

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function sanitize(value, depth) {
    depth = depth || 0;
    if (depth > 14 || value == null) return value == null ? value : '[depth_limited]';
    if (Array.isArray(value)) return value.slice(0, 5000).map(function (item) { return sanitize(item, depth + 1); });
    if (typeof value !== 'object') return value;
    var out = {};
    Object.keys(value).forEach(function (key) {
      if (!/^(?:localPath|path|mountedPath|raw|rawBytes|bytes|binary|base64|apiKey|token|secret|password|credential|authorization)$/i.test(key)) {
        out[key] = sanitize(value[key], depth + 1);
      }
    });
    return out;
  }
  async function parseResponse(response) {
    var text = await response.text();
    var payload = {};
    try { payload = text ? JSON.parse(text) : {}; }
    catch (error) { payload = { ok: false, code: 'HOST_RESPONSE_INVALID' }; }
    payload = sanitize(payload || {});
    if (!response.ok) {
      var err = new Error(clean(payload.code) || ('HOST_HTTP_' + response.status));
      err.code = clean(payload.code) || ('HOST_HTTP_' + response.status);
      err.details = payload.errors || [];
      throw err;
    }
    return payload;
  }
  async function request(method, path, body) {
    var options = {
      method: method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Accept': 'application/json', 'X-Orbit-P09L': VERSION }
    };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body || {});
    }
    return parseResponse(await fetch(BASE + path, options));
  }
  async function status() {
    try {
      var value = await request('GET', '/status');
      return Object.assign({}, value, {
        connected: value && value.connected === true,
        status: value && value.connected === true ? 'connected' : 'backend_required',
        code: clean(value && value.code) || 'BACKEND_REQUIRED',
        sameOrigin: true,
        version: clean(value && value.version) || VERSION,
        containsLocalPaths: false,
        containsSecrets: false,
        writeAllowed: false
      });
    } catch (error) {
      return {
        connected: false,
        status: 'backend_required',
        code: clean(error && error.code) || 'BACKEND_REQUIRED',
        tasks: [],
        sameOrigin: true,
        version: VERSION,
        containsLocalPaths: false,
        containsSecrets: false,
        writeAllowed: false
      };
    }
  }
  async function execute(task, requestBody) {
    return request('POST', '/run', { task: clean(task), request: requestBody || {} });
  }
  async function resolveBatchReferences(input) {
    return request('POST', '/references', input || {});
  }
  function loadCopyHotfix() {
    if (Orbit.aseguradorasBatchAdminCopyP09l) return;
    var wanted = 'modules/aseguradoras-batch-admin-copy-p09l.js';
    var exists = Array.prototype.some.call(document.querySelectorAll('script[src]'), function (script) {
      return clean(script.getAttribute('src') || script.src).split('?')[0].replace(/^https?:\/\/[^/]+\//i, '') === wanted;
    });
    if (exists) return;
    var script = document.createElement('script');
    script.src = wanted + '?v=' + encodeURIComponent(VERSION);
    script.async = false;
    script.dataset.orbitP09lCopy = VERSION;
    (document.head || document.documentElement).appendChild(script);
  }

  var bridge = {
    VERSION: VERSION,
    status: status,
    execute: execute,
    resolveBatchReferences: resolveBatchReferences,
    prepareBatchReferences: resolveBatchReferences,
    resolveSourceReferences: resolveBatchReferences,
    referencesForBatch: resolveBatchReferences,
    sameOrigin: true,
    containsLocalPaths: false,
    containsSecrets: false,
    writeAllowed: false
  };

  window.OrbitBackendDocumentBridge = bridge;
  Orbit.backendDocumentBridge = bridge;
  loadCopyHotfix();
})();
