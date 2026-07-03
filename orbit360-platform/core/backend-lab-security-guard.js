/* ============================================================
   Orbit 360 - Backend LAB Security Guard v1.104
   Runtime guard for Firestore LAB mode.

   Purpose:
   - block frontend persistence of secrets/API keys/webhooks/tokens.
   - scrub sensitive fields before store writes.
   - block LAB writes if auth identity is not the expected LAB user.

   This is not the final production secrets layer. Production secrets must
   live in backend/secret manager and be accessed through scoped endpoints.
   ============================================================ */
(function(){
  'use strict';

  var w = window;
  var params = new URLSearchParams(w.location.search || '');
  var mode = params.get('orbitBackend') || (w.OrbitBackend && w.OrbitBackend.mode) || '';
  var tenant = params.get('tenant') || (w.OrbitBackend && (w.OrbitBackend.tenantId || w.OrbitBackend.tenant)) || 'alianzas-soluciones';
  var EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
  var EXPECTED_EMAIL = 'orbit.lab@demo.com';
  var VERSION = 'v1.104-backend-lab-security-guard';
  var SENSITIVE_KEY_RE = /(api[_-]?key|apikey|secret|token|webhook|hookurl|hook|password|pwd|bearer|credential|client[_-]?secret|private[_-]?key|anthropic|openai|gemini|greenapi|green_api|make[_\.:-]?webhook|ia[_\.:-]?key|firebase[_\.:-]?config)/i;

  if (mode !== 'firestore-lab' || tenant !== 'alianzas-soluciones') return;

  var guardState = {
    version: VERSION,
    installed: false,
    attempts: 0,
    blockedWrites: [],
    blockedSensitive: [],
    lastError: null
  };

  function emit(name, detail){
    try {
      w.dispatchEvent(new CustomEvent(name, { detail: Object.assign({ mode: mode, tenantId: tenant, guardVersion: VERSION }, detail || {}) }));
    } catch(e) {}
  }

  function isSensitiveKey(key){ return SENSITIVE_KEY_RE.test(String(key || '')); }

  function record(listName, item){
    var list = guardState[listName] || (guardState[listName] = []);
    list.push(Object.assign({ at: new Date().toISOString() }, item || {}));
    if (list.length > 100) guardState[listName] = list.slice(-100);
  }

  function scrub(value, path, depth){
    path = path || '';
    depth = depth || 0;
    if (depth > 8) return null;
    if (value == null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(function(item, idx){ return scrub(item, path + '[' + idx + ']', depth + 1); });
    var out = {};
    Object.keys(value).forEach(function(key){
      var childPath = path ? path + '.' + key : key;
      if (isSensitiveKey(key)) {
        record('blockedSensitive', { path: childPath, reason: 'sensitive-field' });
        emit('orbit:backend:sensitive-blocked', { path: childPath, reason: 'sensitive-field' });
        return;
      }
      out[key] = scrub(value[key], childPath, depth + 1);
    });
    return out;
  }

  function authUser(){
    try { if (w.firebase && typeof w.firebase.auth === 'function') return w.firebase.auth().currentUser || null; } catch(e) {}
    try { if (w.auth && w.auth.currentUser) return w.auth.currentUser; } catch(e) {}
    return null;
  }

  function authOk(){
    var u = authUser();
    return !!(u && (u.uid === EXPECTED_UID || String(u.email || '').toLowerCase() === EXPECTED_EMAIL));
  }

  function blockAuth(collection, id, op){
    var u = authUser();
    var item = { collection: collection, id: id || '', op: op, reason: u ? 'auth-mismatch' : 'auth-required', auth: u ? { uid: u.uid || '', email: u.email || '' } : null };
    record('blockedWrites', item);
    emit('orbit:backend:auth-blocked', item);
    return null;
  }

  function patchStore(){
    guardState.attempts += 1;
    var orbit = w.Orbit || {};
    var store = orbit.store;

    if (!store || store.__securityGuardV104) {
      if (!store && guardState.attempts < 80) return setTimeout(patchStore, 100);
      return;
    }

    var original = {
      insert: store.insert,
      update: store.update,
      remove: store.remove,
      setPref: store.setPref,
      raw: store.raw
    };

    if (typeof original.insert === 'function') {
      store.insert = function(collection, row){
        var clean = scrub(row || {}, collection || 'row', 0);
        if (!authOk()) return blockAuth(collection, clean && (clean.id || clean.uid || clean.codigo), 'insert');
        return original.insert.call(store, collection, clean);
      };
    }

    if (typeof original.update === 'function') {
      store.update = function(collection, id, patch){
        var clean = scrub(patch || {}, collection + '.' + id, 0);
        if (!authOk()) return blockAuth(collection, id, 'update');
        return original.update.call(store, collection, id, clean);
      };
    }

    if (typeof original.remove === 'function') {
      store.remove = function(collection, id){
        if (!authOk()) return blockAuth(collection, id, 'remove');
        return original.remove.call(store, collection, id);
      };
    }

    if (typeof original.setPref === 'function') {
      store.setPref = function(key, value){
        if (isSensitiveKey(key)) {
          var item = { path: '__prefs.' + key, reason: 'sensitive-pref' };
          record('blockedSensitive', item);
          emit('orbit:backend:sensitive-blocked', item);
          return value;
        }
        return original.setPref.call(store, key, scrub(value, '__prefs.' + key, 0));
      };
    }

    if (typeof original.raw === 'function') {
      store.raw = function(){
        var out = original.raw.call(store);
        try { out.__backendSecurityGuard = Object.assign({}, guardState); } catch(e) {}
        return out;
      };
    }

    store.__securityGuardV104 = true;
    guardState.installed = true;
    w.OrbitBackend = Object.assign({}, w.OrbitBackend || {}, { securityGuard: guardState, securityGuardVersion: VERSION });
    emit('orbit:backend:security-guard-installed', { installed: true });
  }

  w.OrbitBackend = Object.assign({}, w.OrbitBackend || {}, { securityGuard: guardState, securityGuardVersion: VERSION });
  setTimeout(patchStore, 0);
  setTimeout(patchStore, 600);
  setTimeout(patchStore, 1500);
})();
