/* ============================================================
   Orbit 360 · Aseguradoras LAB · escritura parcial segura v20260721
   -----------------------------------------------------------------
   Evita que un patch de portales, cuentas o contactos vuelva a
   persistir la fila completa desde una caché anterior.

   - La caché local conserva la fila fusionada para compatibilidad.
   - Firestore recibe únicamente el patch solicitado + metadatos.
   - El guard sanea por sí mismo campos sensibles sin depender del
     orden de otros wrappers.
   - Falla cerrado si la conexión remota no está disponible.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || (window.OrbitBackend && OrbitBackend.mode) || '';
  var tenantId = params.get('tenant') || (window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)) || '';
  var TENANT_ID = 'alianzas-soluciones';
  var VERSION = '20260721.2';

  if (mode !== 'firestore-lab' || tenantId !== TENANT_ID) return;
  if (!Orbit.store || Orbit.store.__aseguradorasPartialWriteV20260721) return;

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return Object.assign({}, value || {}); }
  }
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function now() { return new Date().toISOString(); }
  function maskRight(value, visible) {
    var text = clean(value).replace(/\s+/g, '');
    if (!text) return '';
    var size = Math.max(2, Number(visible || 4));
    return text.length <= size ? '••••' : '•••• ' + text.slice(-size);
  }
  function maskUser(value) {
    var text = clean(value);
    if (!text) return '';
    if (text.indexOf('@') >= 0) {
      var parts = text.split('@');
      var left = parts[0] || '';
      var domain = parts[1] || '';
      return (left.slice(0, 2) || '**') + '***@' + domain.replace(/^(.{2}).*(\.[^.]+)$/, '$1***$2');
    }
    return maskRight(text, 3);
  }
  function sanitizePortal(row) {
    var out = clone(row || {});
    var rawUser = clean(out.usuario || out.user || '');
    var rawSecret = clean(out.password || out.pass || out.contrasena || '');
    var reference = clean(out.credentialRef || out.secureAccessRef || '');
    if ((rawUser || rawSecret) && !reference) reference = 'backend_required';
    if (rawUser && !out.usuarioHint) out.usuarioHint = maskUser(rawUser);
    if (reference) out.credentialRef = reference;
    out.secretoExpuesto = false;
    delete out.usuario; delete out.user; delete out.password; delete out.pass;
    delete out.contrasena; delete out.secureAccessRef;
    return out;
  }
  function sanitizeAccount(row) {
    var out = clone(row || {});
    var rawNumber = clean(out.numero || out.accountNumber || '');
    var reference = clean(out.accountRef || out.secureAccountRef || '');
    if (rawNumber && !reference) reference = 'backend_required';
    if (rawNumber && !out.numeroHint) out.numeroHint = maskRight(rawNumber, 4);
    if (reference) out.accountRef = reference;
    out.secretoExpuesto = false;
    delete out.numero; delete out.accountNumber; delete out.secureAccountRef;
    return out;
  }
  function sanitizePatch(value) {
    var out = clone(value || {});
    if (Array.isArray(out.portales)) out.portales = out.portales.map(sanitizePortal);
    if (Array.isArray(out.cuentas)) out.cuentas = out.cuentas.map(sanitizeAccount);
    return out;
  }
  function cleanForRemote(value) {
    var out = sanitizePatch(value || {});
    delete out._syncStatus; delete out._syncOp; delete out._syncError; delete out._syncAt;
    return out;
  }
  function database() {
    try { if (window.firebase && typeof firebase.firestore === 'function') return firebase.firestore(); } catch (error) {}
    try { return window.db || null; } catch (error) { return null; }
  }
  function collectionRef(collection) {
    var db = database();
    if (!db || typeof db.collection !== 'function') return null;
    return db.collection('tenantId').doc(TENANT_ID).collection(collection);
  }
  function emit(collection) {
    try { if (Orbit.store && typeof Orbit.store._emit === 'function') Orbit.store._emit(collection); } catch (error) {}
  }
  function backendEvent(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: Object.assign({ mode: 'firestore-lab', tenantId: TENANT_ID }, detail || {}) }));
    } catch (error) {}
  }
  function replaceCacheRow(collection, id, row) {
    var raw = Orbit.store && typeof Orbit.store.raw === 'function' ? Orbit.store.raw() : null;
    var rows = raw && raw[collection];
    if (!Array.isArray(rows)) return false;
    var index = rows.findIndex(function (item) { return item && String(item.id || '') === String(id || ''); });
    if (index >= 0) rows[index] = row; else rows.push(row);
    emit(collection);
    return true;
  }

  var originalUpdate = Orbit.store.update.bind(Orbit.store);

  function updateAseguradora(id, patch) {
    var safePatch = cleanForRemote(patch || {});
    var current = Orbit.store.get('aseguradoras', id) || { id: id, tenantId: TENANT_ID };
    var timestamp = now();
    var localRow = Object.assign({}, current, clone(safePatch), {
      id: id, tenantId: current.tenantId || TENANT_ID, updatedAt: timestamp,
      _syncStatus: 'pending', _syncOp: 'update-partial', _syncAt: timestamp
    });

    replaceCacheRow('aseguradoras', id, localRow);
    backendEvent('orbit:backend:write-pending', { collection: 'aseguradoras', id: id, op: 'update-partial', at: timestamp });

    var ref = collectionRef('aseguradoras');
    if (!ref || typeof ref.doc !== 'function') {
      localRow._syncStatus = 'failed'; localRow._syncError = 'firestore-not-ready'; localRow._syncAt = now();
      replaceCacheRow('aseguradoras', id, localRow);
      backendEvent('orbit:backend:write-error', { collection: 'aseguradoras', id: id, op: 'update-partial', error: 'firestore-not-ready' });
      return localRow;
    }

    var remotePatch = Object.assign({}, safePatch, { id: id, tenantId: localRow.tenantId, updatedAt: timestamp });
    ref.doc(id).set(remotePatch, { merge: true }).then(function () {
      var latest = Orbit.store.get('aseguradoras', id) || localRow;
      replaceCacheRow('aseguradoras', id, Object.assign({}, latest, {
        _syncStatus: 'synced', _syncOp: 'update-partial', _syncError: undefined, _syncAt: now()
      }));
      backendEvent('orbit:backend:write-ok', { collection: 'aseguradoras', id: id, op: 'update-partial' });
    }).catch(function (error) {
      var latest = Orbit.store.get('aseguradoras', id) || localRow;
      var failed = Object.assign({}, latest, {
        _syncStatus: 'failed', _syncOp: 'update-partial',
        _syncError: String(error && (error.message || error) || 'write-failed'), _syncAt: now()
      });
      replaceCacheRow('aseguradoras', id, failed);
      backendEvent('orbit:backend:write-error', { collection: 'aseguradoras', id: id, op: 'update-partial', error: failed._syncError });
    });
    return localRow;
  }

  Orbit.store.update = function (collection, id, patch) {
    if (collection === 'aseguradoras') return updateAseguradora(id, patch);
    return originalUpdate(collection, id, patch);
  };
  Orbit.store.updatePartial = function (collection, id, patch) {
    if (collection !== 'aseguradoras') throw new Error('PARTIAL_WRITE_COLLECTION_NOT_ALLOWED');
    return updateAseguradora(id, patch);
  };
  Orbit.store.__aseguradorasPartialWriteV20260721 = {
    version: VERSION,
    remoteWritesPatchOnly: true,
    cacheMergesPatch: true,
    sanitizesSensitiveFields: true,
    failClosed: true,
    sanitizePatch: sanitizePatch,
    originalUpdate: originalUpdate
  };
})();
