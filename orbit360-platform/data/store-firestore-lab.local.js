/* ============================================================
   Orbit 360 - Store Firestore LAB explícito
   Uso: solo index-dev-firestore.html con ?orbitBackend=firestore-lab
   Regla: en LAB no usar seed/localStorage/demo como fuente de datos.
   Mantiene API Orbit.store: all/get/where/insert/update/remove/_emit.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') ||
    (window.OrbitBackend && window.OrbitBackend.mode) ||
    '';

  var tenantId = params.get('tenant') ||
    (window.OrbitBackend && window.OrbitBackend.tenantId) ||
    'alianzas-soluciones';

  if (mode !== 'firestore-lab' || tenantId !== 'alianzas-soluciones') return;

  var EXPECTED_UID = 'woJlxR1iFEeiQZvTscPj4qQ5Qc73';
  var EXPECTED_EMAIL = 'orbit.lab@demo.com';

  var state = {
    mode: 'firestore-lab',
    tenantId: tenantId,
    expectedUid: EXPECTED_UID,
    expectedEmail: EXPECTED_EMAIL,
    status: 'booting',
    lastError: null,
    pathByCollection: {},
    listeners: [],
    _cache: {}
  };

  function log() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[Orbit LAB Store]');
      console.log.apply(console, args);
    } catch (e) {}
  }

  function err(message, extra) {
    state.lastError = message || 'unknown';
    if (extra) state.lastExtra = extra;
    log('ERROR:', message, extra || '');
  }

  function db() {
    try {
      if (window.firebase && firebase.firestore) return firebase.firestore();
    } catch (e) {}
    return null;
  }

  function authUser() {
    try {
      if (window.firebase && firebase.auth) return firebase.auth().currentUser || null;
    } catch (e) {}
    return null;
  }

  function hasLabAuth() {
    var u = authUser();
    return !!(u && u.uid === EXPECTED_UID);
  }

  function normalizeId(row, fallbackId) {
    if (!row) return row;
    if (!row.id && fallbackId) row.id = fallbackId;
    return row;
  }

  function isTenantRow(row, id) {
    if (!row) return false;
    if (String(id || row.id || '').indexOf('lab_') === 0) return true;
    if (row.tenantId === tenantId) return true;
    if (row.tenant === tenantId) return true;
    if (row.orbitTenant === tenantId) return true;
    if (row.tenant_id === tenantId) return true;
    return false;
  }

  function candidateTemplates() {
    return [
      'tenants/{tenant}/{collection}',
      'tenantId/{tenant}/{collection}',
      'orbitTenants/{tenant}/{collection}',
      'orbit/{tenant}/{collection}',
      'clientesOrbit/{tenant}/{collection}',
      '{collection}'
    ];
  }

  function pathFromTemplate(template, collection) {
    return template
      .replace('{tenant}', tenantId)
      .replace('{collection}', collection);
  }

  function safeCollection(path) {
    var database = db();
    if (!database) return null;

    try {
      var segments = String(path).split('/').filter(Boolean);
      if (segments.length % 2 === 0) return null;
      return database.collection(path);
    } catch (e) {
      return null;
    }
  }

  async function tryGetDoc(collection, id, template) {
    var path = pathFromTemplate(template, collection);
    var ref = safeCollection(path);
    if (!ref) return null;

    try {
      var snap = await ref.doc(id).get();
      if (!snap.exists) return null;

      var data = normalizeId(snap.data() || {}, snap.id);

      if (template === '{collection}' && !isTenantRow(data, snap.id)) {
        return null;
      }

      return { path: path, template: template, data: data };
    } catch (e) {
      return null;
    }
  }

  async function tryAllDocs(collection, template) {
    var path = pathFromTemplate(template, collection);
    var ref = safeCollection(path);
    if (!ref) return null;

    try {
      var query = ref.limit ? ref.limit(500) : ref;
      var snap = await query.get();

      var rows = [];
      snap.forEach(function (doc) {
        var data = normalizeId(doc.data() || {}, doc.id);
        if (template !== '{collection}' || isTenantRow(data, doc.id)) {
          rows.push(data);
        }
      });

      return { path: path, template: template, rows: rows };
    } catch (e) {
      return null;
    }
  }

  async function resolveTemplate(collection, id) {
    if (state.pathByCollection[collection]) return state.pathByCollection[collection];

    var templates = candidateTemplates();

    if (id) {
      for (var i = 0; i < templates.length; i++) {
        var hit = await tryGetDoc(collection, id, templates[i]);
        if (hit) {
          state.pathByCollection[collection] = hit.template;
          log('Ruta detectada para', collection, '=>', hit.path);
          return hit.template;
        }
      }
    }

    for (var j = 0; j < templates.length; j++) {
      var all = await tryAllDocs(collection, templates[j]);
      if (all && all.rows && all.rows.length > 0) {
        state.pathByCollection[collection] = all.template;
        log('Ruta detectada para', collection, '=>', all.path, 'rows:', all.rows.length);
        return all.template;
      }
    }

    state.pathByCollection[collection] = 'tenants/{tenant}/{collection}';
    return state.pathByCollection[collection];
  }

  function refFor(collection, template) {
    var path = pathFromTemplate(template || state.pathByCollection[collection] || 'tenants/{tenant}/{collection}', collection);
    return safeCollection(path);
  }

  function emit(collection) {
    try {
      state.listeners.forEach(function (listener) {
        try { listener(collection || '*'); } catch (e) {}
      });
    } catch (e) {}

    try {
      window.dispatchEvent(new CustomEvent('orbit:store:emit', {
        detail: { collection: collection || '*', mode: 'firestore-lab', tenantId: tenantId }
      }));
    } catch (e) {}
  }

  function authRequiredEmpty(kind, collection) {
    state.status = 'auth-required';
    state.lastError = 'Firebase Auth LAB requerido para ' + kind + '(' + collection + ')';
    return true;
  }

  async function all(collection) {
    if (!hasLabAuth()) {
      authRequiredEmpty('all', collection);
      return [];
    }

    var template = await resolveTemplate(collection);
    var found = await tryAllDocs(collection, template);

    if (!found) {
      err('No se pudo leer colección Firestore LAB: ' + collection);
      return [];
    }

    state.status = 'ready';
    state._cache[collection] = found.rows || [];
    return found.rows || [];
  }

  async function get(collection, id) {
    if (!hasLabAuth()) {
      authRequiredEmpty('get', collection);
      return null;
    }

    var template = await resolveTemplate(collection, id);
    var hit = await tryGetDoc(collection, id, template);

    if (!hit) {
      var templates = candidateTemplates();
      for (var i = 0; i < templates.length; i++) {
        hit = await tryGetDoc(collection, id, templates[i]);
        if (hit) {
          state.pathByCollection[collection] = hit.template;
          break;
        }
      }
    }

    state.status = 'ready';
    return hit ? hit.data : null;
  }

  async function where(collection, fieldOrPredicate, opOrValue, maybeValue) {
    var rows = await all(collection);

    if (typeof fieldOrPredicate === 'function') {
      return rows.filter(function (row) {
        try { return !!fieldOrPredicate(row); } catch (e) { return false; }
      });
    }

    if (fieldOrPredicate && typeof fieldOrPredicate === 'object') {
      return rows.filter(function (row) {
        return Object.keys(fieldOrPredicate).every(function (key) {
          return row && row[key] === fieldOrPredicate[key];
        });
      });
    }

    var field = fieldOrPredicate;
    var value = arguments.length >= 4 ? maybeValue : opOrValue;
    var op = arguments.length >= 4 ? opOrValue : '==';

    return rows.filter(function (row) {
      if (!row) return false;
      if (op === '==' || op === '=') return row[field] === value;
      if (op === '!=') return row[field] !== value;
      if (op === '>') return row[field] > value;
      if (op === '>=') return row[field] >= value;
      if (op === '<') return row[field] < value;
      if (op === '<=') return row[field] <= value;
      if (op === 'array-contains') return Array.isArray(row[field]) && row[field].indexOf(value) >= 0;
      return row[field] === value;
    });
  }

  async function insert(collection, payload) {
    if (!hasLabAuth()) throw new Error('auth-required');

    var database = db();
    if (!database) throw new Error('firestore-not-ready');

    var user = authUser();
    var row = Object.assign({}, payload || {});
    var id = row.id || database.collection('_ids').doc().id;
    row.id = id;
    row.tenantId = tenantId;
    row.createdAt = row.createdAt || new Date().toISOString();
    row.updatedAt = new Date().toISOString();
    row.ownerUid = row.ownerUid || user.uid;
    row.ownerEmail = row.ownerEmail || user.email || EXPECTED_EMAIL;

    var template = await resolveTemplate(collection);
    var ref = refFor(collection, template);
    if (!ref) throw new Error('invalid-firestore-path');

    await ref.doc(id).set(row, { merge: true });
    emit(collection);
    return row;
  }

  async function update(collection, id, patch) {
    if (!hasLabAuth()) throw new Error('auth-required');

    var row = Object.assign({}, patch || {});
    row.id = id;
    row.tenantId = row.tenantId || tenantId;
    row.updatedAt = new Date().toISOString();

    var template = await resolveTemplate(collection, id);
    var ref = refFor(collection, template);
    if (!ref) throw new Error('invalid-firestore-path');

    await ref.doc(id).set(row, { merge: true });
    emit(collection);
    return await get(collection, id);
  }

  async function remove(collection, id) {
    if (!hasLabAuth()) throw new Error('auth-required');

    var template = await resolveTemplate(collection, id);
    var ref = refFor(collection, template);
    if (!ref) throw new Error('invalid-firestore-path');

    await ref.doc(id).delete();
    emit(collection);
    return true;
  }

  function on(collection, callback) {
    if (typeof collection === 'function') {
      callback = collection;
      collection = '*';
    }

    var listener = function (changed) {
      if (collection === '*' || collection === changed || changed === '*') {
        callback(changed);
      }
    };

    state.listeners.push(listener);

    return function () {
      state.listeners = state.listeners.filter(function (x) { return x !== listener; });
    };
  }

  function status() {
    return Object.assign({}, state, {
      authed: hasLabAuth(),
      firebaseUser: authUser() ? { uid: authUser().uid, email: authUser().email || '' } : null
    });
  }

  var api = {
    all: all,
    get: get,
    where: where,
    insert: insert,
    update: update,
    remove: remove,
    _emit: emit,
    on: on,
    subscribe: on,
    _subscribe: on,
    _labStatus: status,
    __firestoreLabExplicit: true
  };

  window.Orbit.store = api;
  window.Orbit.__labStore = state;
  window.OrbitBackend = window.OrbitBackend || {};
  window.OrbitBackend.mode = 'firestore-lab';
  window.OrbitBackend.tenantId = tenantId;
  window.OrbitBackend.noFallback = true;

  state.status = hasLabAuth() ? 'ready' : 'auth-required';
  log('Store Firestore LAB explícito instalado. Tenant:', tenantId, 'Auth:', hasLabAuth());
})();

/* ============================================================
   Orbit 360 - Firestore LAB collection registry + onSnapshot
   Backend-only patch. No modules touched.
   ============================================================ */
(function(){
  window.Orbit = window.Orbit || {};
  window.OrbitBackend = window.OrbitBackend || {};

  var params = new URLSearchParams(window.location.search || '');
  var mode = params.get('orbitBackend') || window.OrbitBackend.mode || '';
  var tenantId = params.get('tenant') || window.OrbitBackend.tenantId || 'alianzas-soluciones';

  var ORBIT_LAB_COLLECTIONS = [
    'clientes',
    'polizas',
    'cobros',
    'comisiones',
    'reclamos',
    'gestiones',
    'negocios',
    'finmovs',
    'contenidos',
    'cursos',
    'aseguradoras',
    'asesores',
    'vehiculos',
    'acreedores',
    'facturas',
    'documentos',
    'actividades'
  ];

  window.OrbitBackend.collections = ORBIT_LAB_COLLECTIONS.slice();

  function emitCollection(collection){
    try {
      if (window.Orbit && window.Orbit.store && typeof window.Orbit.store._emit === 'function') {
        window.Orbit.store._emit(collection || '*');
      }
    } catch(e) {
      console.warn('[orbit-firestore-lab] emit failed', e);
    }
  }

  function compatFirestore(){
    try {
      if (window.firebase && typeof window.firebase.firestore === 'function') {
        return window.firebase.firestore();
      }
    } catch(e) {}
    return null;
  }

  function attachCompatSnapshots(){
    var db = compatFirestore();
    if (!db) return false;
    window.OrbitBackend._labUnsubscribers = window.OrbitBackend._labUnsubscribers || [];
    ORBIT_LAB_COLLECTIONS.forEach(function(collection){
      try {
        var ref = db.collection('tenantId').doc(tenantId).collection(collection);
        var unsub = ref.onSnapshot(function(){
          emitCollection(collection);
        }, function(err){
          console.warn('[orbit-firestore-lab] onSnapshot error', collection, err);
        });
        window.OrbitBackend._labUnsubscribers.push(unsub);
      } catch(e) {
        console.warn('[orbit-firestore-lab] compat snapshot failed', collection, e);
      }
    });
    return true;
  }

  function attachModularSnapshots(){
    try {
      if (typeof window.onSnapshot !== 'function') return false;
      if (typeof window.collection !== 'function') return false;
      if (!window.db) return false;
      window.OrbitBackend._labUnsubscribers = window.OrbitBackend._labUnsubscribers || [];
      ORBIT_LAB_COLLECTIONS.forEach(function(collectionName){
        try {
          var ref = window.collection(window.db, 'tenantId', tenantId, collectionName);
          var unsub = window.onSnapshot(ref, function(){
            emitCollection(collectionName);
          }, function(err){
            console.warn('[orbit-firestore-lab] onSnapshot error', collectionName, err);
          });
          window.OrbitBackend._labUnsubscribers.push(unsub);
        } catch(e) {
          console.warn('[orbit-firestore-lab] modular snapshot failed', collectionName, e);
        }
      });
      return true;
    } catch(e) {
      return false;
    }
  }

  function attachLabSnapshots(){
    if (mode !== 'firestore-lab') return;
    if (tenantId !== 'alianzas-soluciones') return;
    if (window.OrbitBackend._snapshotsAttached) return;

    var ok = attachCompatSnapshots() || attachModularSnapshots();
    window.OrbitBackend._snapshotsAttached = !!ok;

    if (ok) {
      console.info('[orbit-firestore-lab] onSnapshot listeners attached', tenantId, ORBIT_LAB_COLLECTIONS.length);
    } else {
      console.warn('[orbit-firestore-lab] onSnapshot not attached: Firebase SDK not detected yet.');
    }
  }

  window.OrbitBackend.attachLabSnapshots = attachLabSnapshots;
  setTimeout(attachLabSnapshots, 0);
  setTimeout(attachLabSnapshots, 1200);
})();
