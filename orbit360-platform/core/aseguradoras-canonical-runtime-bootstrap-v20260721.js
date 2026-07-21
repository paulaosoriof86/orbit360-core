/* ============================================================
   Orbit 360 · Bootstrap canónico Aseguradoras/importador · 20260721
   -----------------------------------------------------------------
   Owner único del grafo runtime para el directorio real:
   1. bloquea el modal anterior;
   2. instala escritura parcial de Aseguradoras;
   3. carga contratos P0 y listener controlado;
   4. carga guard de identidad y lectura fresca;
   5. instala la UI canónica de una confirmación/una escritura;
   6. falla cerrado ante cualquier dependencia incompleta.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)) || '';
  var TENANT_ID = 'alianzas-soluciones';
  var VERSION = '20260721.1';

  if (mode !== 'firestore-lab' || tenant !== TENANT_ID) return;
  if (window.OrbitAseguradorasCanonicalRuntimeV20260721) return;

  var state = window.OrbitAseguradorasCanonicalRuntimeV20260721 = {
    version: VERSION,
    owner: 'core/aseguradoras-canonical-runtime-bootstrap-v20260721.js',
    tenantId: TENANT_ID,
    status: 'waiting-base-importer',
    ready: false,
    failClosed: true,
    loaded: [],
    errorCode: ''
  };

  function clean(value, max) {
    return String(value == null ? '' : value).trim().slice(0, max || 180);
  }

  function toast(message) {
    try {
      if (Orbit.ui && Orbit.ui.toast) Orbit.ui.toast(message);
    } catch (error) {}
  }

  function sameOriginScript(src) {
    var url;
    try { url = new URL(src, window.location.href); }
    catch (error) { return null; }
    if (url.origin !== window.location.origin || !/^\/core\/[a-z0-9._-]+\.js$/i.test(url.pathname)) return null;
    return url.pathname + url.search;
  }

  function scriptLoaded(key) {
    return document.querySelector('script[data-orbit-canonical-importer="' + key + '"][data-loaded="1"]');
  }

  function loadScript(src, key, predicate) {
    return new Promise(function (resolve, reject) {
      if (predicate && predicate()) {
        state.loaded.push(key + ':existing');
        resolve(true);
        return;
      }
      var safe = sameOriginScript(src);
      if (!safe) {
        reject(new Error('RUNTIME_SOURCE_BLOCKED:' + key));
        return;
      }
      var existing = document.querySelector('script[data-orbit-canonical-importer="' + key + '"]');
      if (existing) {
        if (scriptLoaded(key) || (predicate && predicate())) {
          resolve(true);
          return;
        }
        existing.addEventListener('load', function () { resolve(true); }, { once: true });
        existing.addEventListener('error', function () { reject(new Error('RUNTIME_LOAD_FAILED:' + key)); }, { once: true });
        return;
      }
      var script = document.createElement('script');
      script.src = safe;
      script.async = false;
      script.setAttribute('data-orbit-canonical-importer', key);
      script.onload = function () {
        script.dataset.loaded = '1';
        if (predicate && !predicate()) {
          reject(new Error('RUNTIME_OWNER_NOT_READY:' + key));
          return;
        }
        state.loaded.push(key);
        resolve(true);
      };
      script.onerror = function () { reject(new Error('RUNTIME_LOAD_FAILED:' + key)); };
      document.head.appendChild(script);
    });
  }

  function waitFor(predicate, code, timeoutMs) {
    var started = Date.now();
    return new Promise(function (resolve, reject) {
      (function check() {
        try { if (predicate()) { resolve(true); return; } } catch (error) {}
        if (Date.now() - started >= timeoutMs) {
          reject(new Error(code));
          return;
        }
        setTimeout(check, 80);
      })();
    });
  }

  function blockLegacyOpen() {
    var D = Orbit.insurerDirectoryImport;
    if (!D || typeof D.open !== 'function') return false;
    if (!D.__legacyOpenBeforeCanonicalV20260721) D.__legacyOpenBeforeCanonicalV20260721 = D.open.bind(D);
    var pending = function () {
      toast('El importador seguro se está preparando. Reabre esta opción en unos segundos.');
      return { ok: false, status: 'canonical_runtime_preparing' };
    };
    pending.__canonicalRuntimePending20260721 = true;
    D.open = pending;
    return true;
  }

  function verifyFinalGraph() {
    var D = Orbit.insurerDirectoryImport;
    return !!(
      D &&
      D.open && D.open.__canonicalDirectoryExecution20260720 === true &&
      D.canonicalExecutionVersion === '20260721.1' &&
      D.__op2SourceGuardV1220 &&
      D.__backendWriteGuardV1220 &&
      D.__freshReadGuardV20260721 &&
      Orbit.importaWriteP0 &&
      Orbit.importerControlledWriteContractV20260721 &&
      Orbit.importerControlledWriteContractV20260721.version === '20260721.2' &&
      Orbit.importaDryRunP0Wire &&
      Orbit.store && Orbit.store.__aseguradorasPartialWriteV20260721 &&
      Orbit.store.__aseguradorasPartialWriteV20260721.remoteWritesPatchOnly === true
    );
  }

  async function bootstrap() {
    await waitFor(function () {
      return Orbit.insurerDirectoryImport && typeof Orbit.insurerDirectoryImport.open === 'function' && Orbit.store;
    }, 'BASE_IMPORTER_NOT_READY', 20000);

    blockLegacyOpen();
    state.status = 'loading-contracts';

    await loadScript('core/backend-lab-aseguradoras-partial-write-v20260721.js?v=20260721-1', 'partial-write', function () {
      return Orbit.store && Orbit.store.__aseguradorasPartialWriteV20260721;
    });
    await loadScript('core/importa-write-p0.js?v=20260721-1', 'write-p0', function () {
      return Orbit.importaWriteP0 && typeof Orbit.importaWriteP0.writeBatch === 'function';
    });
    await loadScript('core/importer-controlled-write-contract-v20260721.js?v=20260721-2', 'controlled-write-contract', function () {
      return Orbit.importerControlledWriteContractV20260721 && Orbit.importerControlledWriteContractV20260721.version === '20260721.2';
    });
    await loadScript('core/importa-dryrun-p0-wire.js?v=20260721-2', 'p0-wire', function () {
      return Orbit.importaDryRunP0Wire && Orbit.store && Orbit.store.__p0DryRunWireContractVersion === '20260721.2';
    });
    await loadScript('core/aseguradoras-op2-source-guard.js?v=20260721-1', 'source-guard', function () {
      return Orbit.insurerDirectoryImport && Orbit.insurerDirectoryImport.__op2SourceGuardV1220;
    });
    await loadScript('core/aseguradoras-op2-fresh-read-guard-v20260721.js?v=20260721-1', 'fresh-read', function () {
      return Orbit.insurerDirectoryImport && Orbit.insurerDirectoryImport.__freshReadGuardV20260721;
    });
    await loadScript('core/aseguradoras-op2-import-ui-guard.js?v=20260721-2', 'canonical-ui', function () {
      return Orbit.insurerDirectoryImport && Orbit.insurerDirectoryImport.open && Orbit.insurerDirectoryImport.open.__canonicalDirectoryExecution20260720 === true;
    });

    await waitFor(verifyFinalGraph, 'CANONICAL_GRAPH_INCOMPLETE', 20000);
    state.status = 'ready';
    state.ready = true;
    state.errorCode = '';
    try { window.dispatchEvent(new CustomEvent('orbit:insurer-directory-canonical-ready', { detail: { version: VERSION, ready: true } })); } catch (error) {}
  }

  bootstrap().catch(function (error) {
    state.status = 'blocked';
    state.ready = false;
    state.errorCode = clean(error && (error.code || error.message) || 'CANONICAL_BOOTSTRAP_FAILED').replace(/[^A-Za-z0-9_.:-]/g, '_');
    blockLegacyOpen();
    try { window.dispatchEvent(new CustomEvent('orbit:insurer-directory-canonical-blocked', { detail: { version: VERSION, ready: false, errorCode: state.errorCode } })); } catch (eventError) {}
  });
})();
