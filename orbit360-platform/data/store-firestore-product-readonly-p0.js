/* ============================================================
   Orbit 360 · Store Firestore productivo read-only P0
   Fecha: 2026-07-13

   Factory aditiva para el primer smoke productivo de solo lectura.
   No se auto-instala, no contiene configuración, no usa fallback y
   bloquea insert/update/remove/setPref/reseed de forma explícita.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var VERSION = 'p0-20261002-b3008r4-indexed-relations';
  var WRITE_ERROR = 'WRITE_BLOCKED_PRODUCT_READ_ONLY_P0';
  function text(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value && typeof value === 'object' ? Object.assign({}, value) : value; } }
  function unique(values) { var out = []; (Array.isArray(values) ? values : []).forEach(function (value) { var clean = text(value); if (clean && out.indexOf(clean) < 0) out.push(clean); }); return out; }
  function rowId(row) { return row && (row.id || row.uid || row.codigo || row.numero || row.key); }
  function createStore(deps, options) {
    deps = deps || {}; options = options || {};
    var paths = options.paths || window.Orbit.tenantCanonicalPathsP0;
    var tenantCheck = paths && paths.validateTenantId ? paths.validateTenantId(options.tenantId) : { ok: false, errors: ['contrato_rutas_faltante'] };
    var collections = unique(options.collections), requestedRequired = unique(options.requiredCollections).filter(function (name) { return collections.indexOf(name) >= 0; });
    var startupCollections = requestedRequired.length ? requestedRequired.slice() : collections.slice();
    var deferredCollections = collections.filter(function (name) { return startupCollections.indexOf(name) < 0; });
    var authoritativeFirstReadRequired = options.authoritativeFirstReadRequired === true;
    var protectedMode=options.protectedReadCandidate===true,protectedEpoch=0,protectedPoliciesPromise=null;
    var listeners = [], unsubscribers = [], cache = {}, prefs = clone(options.initialPrefs || {}), deferredAttached = false, deferredScheduled = false, deferredCursor = 0, deferredPauseUntil = 0, attachStarted = {};
    var state = { version: VERSION, mode: 'product', tenantId: tenantCheck.tenantId || text(options.tenantId), source: 'data/store-firestore-product-readonly-p0.js', noFallback: true, writeEnabled: false, ready: false, status: 'created', attachedCollections: [], observedCollections: [], serverConfirmedCollections: [], cacheOnlyCollections: [], snapshotSources: {}, deniedCollections: [], snapshotErrors: {}, quarantinedRows: {}, queryPlans: {}, lastSnapshotAt: null, requiredStartupCollections: startupCollections.slice(), deferredCollections: deferredCollections.slice(), deferredAttached: false, authoritativeFirstRead: authoritativeFirstReadRequired };
    collections.forEach(function (collection) { cache[collection] = []; state.quarantinedRows[collection] = []; });
    function fail(message) { var error = new Error(message || WRITE_ERROR); error.code = WRITE_ERROR; throw error; }
    function emit(collection) { var changed = collection || '*'; listeners.slice().forEach(function (listener) { try { listener(changed); } catch (e) {} }); try { window.dispatchEvent(new CustomEvent('orbit:store:emit', { detail: { collection: changed, mode: 'product', tenantId: state.tenantId, readOnly: true } })); } catch (e) {} }
    function database() { return deps.db || (typeof deps.getDb === 'function' ? deps.getDb() : null); }
    function compatCollection(path) { var db = database(); return db && typeof db.collection === 'function' ? db.collection(path) : null; }
    function modularCollection(path) { var db = database(); return db && typeof deps.collection === 'function' ? deps.collection(db, path) : null; }
    function applyConstraint(ref, constraint) { if (!constraint || constraint.field === '__deny__') return ref; if (constraint.field === 'tenantId') return ref; if (String(constraint.field || '').indexOf('__relation_') === 0) return ref; if (ref && typeof ref.where === 'function') return ref.where(constraint.field, constraint.op, constraint.value); if (typeof deps.query === 'function' && typeof deps.where === 'function') return deps.query(ref, deps.where(constraint.field, constraint.op, constraint.value)); throw new Error('query_constraint_api_unavailable'); }
    function queryPlan(collection) { if (typeof options.queryPlanner !== 'function') return { ok: false, hardError: true, collection: collection, constraints: [], errors: ['query_planner_faltante'] }; var plan = options.queryPlanner(collection) || {}, constraints = Array.isArray(plan.constraints) ? plan.constraints.slice() : []; if (constraints.some(function (item) { return item && item.field === '__deny__'; })) return { ok: false, denied: true, collection: collection, constraints: constraints, errors: ['scope_none'] }; if (!constraints.some(function (item) { return item && item.field === 'tenantId' && item.op === '==' && item.value === state.tenantId; })) return { ok: false, hardError: true, collection: collection, constraints: constraints, errors: ['tenant_constraint_faltante'] }; return { ok: plan.ok !== false, hardError: plan.ok === false, collection: collection, constraints: constraints, errors: plan.errors || [] }; }
    function queryRef(collection) { if (!paths || typeof paths.dataCollectionPath !== 'function') throw new Error('contrato_rutas_faltante'); var path = paths.dataCollectionPath(state.tenantId, collection), ref = compatCollection(path) || modularCollection(path); if (!ref) throw new Error('firestore_collection_api_unavailable'); var plan = queryPlan(collection); state.queryPlans[collection] = clone(plan); if (plan.hardError) throw new Error((plan.errors || ['query_plan_invalido']).join('|')); if (plan.denied) return { denied: true, ref: null, plan: plan, path: path }; plan.constraints.forEach(function (constraint) { ref = applyConstraint(ref, constraint); }); return { denied: false, ref: ref, plan: plan, path: path }; }
    function docRows(snapshot) { var rows = []; function add(doc) { var data = typeof doc.data === 'function' ? doc.data() : doc.data || {}, physicalId = String(doc.id || '').trim(), legacyId = String(data.id || '').trim(); rows.push(Object.assign({}, data, { id: legacyId || physicalId, canonicalDocumentId: physicalId, legacyDataId: legacyId })); } if (!snapshot) return rows; if (typeof snapshot.forEach === 'function') { snapshot.forEach(add); return rows; } (snapshot.docs || []).forEach(add); return rows; }
    function requiredConfirmed() { return startupCollections.every(function (name) { return state.serverConfirmedCollections.indexOf(name) >= 0; }); }
    function recordError(collection, error, phase) { state.snapshotErrors[collection] = String(error && (error.code || error.message || error) || error); state.status = phase === 'attach' ? 'attach-error' : 'snapshot-error'; emit(collection); }
    function subscribeBuilt(collection, built) {
      var unsubscribe = subscribeRef(built.ref, function (snapshot) { var meta = snapshot && snapshot.metadata ? { fromCache: snapshot.metadata.fromCache === true } : { fromCache: false }; acceptRows(collection, docRows(snapshot), meta); }, function (error) { recordError(collection, error, 'snapshot'); });
      if (typeof unsubscribe === 'function') unsubscribers.push(unsubscribe);
    }
    function scheduleDeferredNext() {
      if (deferredAttached || deferredScheduled || !requiredConfirmed()) return;
      var pauseMs = Math.max(0, deferredPauseUntil - Date.now());
      if (pauseMs > 0) {
        deferredScheduled = true;
        setTimeout(function () { deferredScheduled = false; scheduleDeferredNext(); }, pauseMs);
        return;
      }
      while (deferredCursor < deferredCollections.length && attachStarted[deferredCollections[deferredCursor]]) deferredCursor += 1;
      if (deferredCursor >= deferredCollections.length) { deferredAttached = true; state.deferredAttached = true; return; }
      deferredScheduled = true;
      var run = function () {
        deferredScheduled = false;
        if (deferredAttached || !requiredConfirmed()) return;
        while (deferredCursor < deferredCollections.length && attachStarted[deferredCollections[deferredCursor]]) deferredCursor += 1;
        if (deferredCursor >= deferredCollections.length) { deferredAttached = true; state.deferredAttached = true; return; }
        var collection = deferredCollections[deferredCursor++];
        attachCollection(collection, false);
        scheduleDeferredNext();
      };
      if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 450 });
      else setTimeout(run, 90);
    }
    function maybeAttachDeferred() {
      if (deferredAttached || !requiredConfirmed()) return;
      scheduleDeferredNext();
    }
    function sameRows(a, b) { if (a === b) return true; if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false; for (var i = 0; i < a.length; i += 1) { if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false; } return true; }
    function acceptRows(collection, rows, snapshotMeta) { var accepted = [], quarantined = [], fromCache = !!(snapshotMeta && snapshotMeta.fromCache === true), alreadyServerConfirmed = state.serverConfirmedCollections.indexOf(collection) >= 0; if (fromCache && authoritativeFirstReadRequired && alreadyServerConfirmed) { state.snapshotSources[collection] = 'server'; return; } (rows || []).forEach(function (row) { var normalized = Object.assign({}, row); if (!normalized.tenantId) normalized.tenantId = state.tenantId; if (normalized.tenantId !== state.tenantId || !rowId(normalized)) quarantined.push(normalized); else accepted.push(normalized); }); var dataChanged = !sameRows(cache[collection] || [], accepted); cache[collection] = accepted; state.quarantinedRows[collection] = quarantined.map(function (row) { return { id: rowId(row) || '', reason: row.tenantId !== state.tenantId ? 'tenant_mismatch' : 'id_missing' }; }); if (state.observedCollections.indexOf(collection) < 0) state.observedCollections.push(collection); if (state.attachedCollections.indexOf(collection) < 0) state.attachedCollections.push(collection); state.snapshotSources[collection] = fromCache ? 'cache' : 'server'; if (fromCache) { if (state.serverConfirmedCollections.indexOf(collection) < 0 && state.cacheOnlyCollections.indexOf(collection) < 0) state.cacheOnlyCollections.push(collection); } else { if (state.serverConfirmedCollections.indexOf(collection) < 0) state.serverConfirmedCollections.push(collection); state.cacheOnlyCollections = state.cacheOnlyCollections.filter(function (name) { return name !== collection; }); } state.ready = state.serverConfirmedCollections.length > 0; state.status = state.ready ? 'authoritative-snapshots-progress' : 'waiting-authoritative-snapshots'; state.lastSnapshotAt = new Date().toISOString(); if (!alreadyServerConfirmed || dataChanged) emit(collection); maybeAttachDeferred(); }
    function subscribeRef(ref, onNext, onError) { if (ref && typeof ref.onSnapshot === 'function') return ref.onSnapshot(onNext, onError); if (typeof deps.onSnapshot === 'function') return deps.onSnapshot(ref, onNext, onError); throw new Error('firestore_snapshot_api_unavailable'); }

    function role(){
      var m=options.membership||{},r=text(m.activeRole);
      try{var ss=window.Orbit&&window.Orbit.session;if(ss&&typeof ss.rol==='function')r=text(ss.rol())||r;}catch(_){}
      var norm=function(x){return text(x).normalize('NFD').toLowerCase().replace(/[^a-z0-9]+/g,'_');};
      if(!r||![].concat(m.roles||[]).some(function(x){return norm(x)===norm(r);}))
        throw new Error('PROTECTED_READ_ROLE_NOT_ASSIGNED');
      return r;
    }
    function protectedLoad(collection,policyId,epoch,selectedCountry,policyIds){
      if(typeof deps.protectedReadPage!=='function')return Promise.reject(new Error('PROTECTED_READ_PROVIDER_MISSING'));
      var countries=unique(options.membership&&options.membership.countries||[]).map(function(x){return x.toUpperCase();});
      if(!countries.length||countries.some(function(x){return x!=='GT'&&x!=='CO';}))
        return Promise.reject(new Error('PROTECTED_READ_COUNTRY_DENIED'));
      if(selectedCountry){
        if(countries.indexOf(selectedCountry)<0)return Promise.reject(new Error('PROTECTED_READ_COUNTRY_DENIED'));
        countries=[selectedCountry];
      }
      var initialRole=role(),rows=[],seen=new Set();
      return countries.reduce(function(pr,country){return pr.then(function(){
        var cursor='',pages=0,countrySeen=new Set();
        function next(){
          if(epoch!==protectedEpoch||role()!==initialRole)throw new Error('PROTECTED_READ_CONTEXT_CHANGED');
          if(++pages>100)throw new Error('PROTECTED_READ_PAGE_LIMIT');
          return Promise.resolve(deps.protectedReadPage({tenantId:state.tenantId,activeRole:initialRole,
            country:country,collection:collection,mode:'list',policyId:policyId||'',policyIds:Array.isArray(policyIds)?policyIds:undefined,pageSize:50,cursor:cursor})).then(function(r){
              if(!r||r.ok!==true||r.serverScoped!==true||r.collection!==collection||
                 r.country!==country||!Array.isArray(r.rows)||r.rows.length>50)
                throw new Error('PROTECTED_READ_RESPONSE_INVALID');
              r.rows.forEach(function(x){
                var id=text(x&&x.canonicalDocumentId||x&&x.id);
                if(!id||countrySeen.has(id)||(seen.has(id)&&collection!=='asesores'))
                  throw new Error('PROTECTED_READ_DUPLICATE_OR_MISSING_ID');
                if(text(x.tenantId)&&text(x.tenantId)!==state.tenantId)
                  throw new Error('PROTECTED_READ_TENANT_MISMATCH');
                if(text(x.pais||x.country).toUpperCase()!==country)
                  throw new Error('PROTECTED_READ_COUNTRY_MISMATCH');
                countrySeen.add(id);
                if(seen.has(id))return; // One advisor may serve both authorized countries.
                seen.add(id);rows.push(x);
              });
              if(!r.nextCursor)return;
              if(!r.rows.length||r.nextCursor===cursor)throw new Error('PROTECTED_READ_CURSOR_INVALID');
              cursor=r.nextCursor;return next();
            });
        }
        return next();
      });},Promise.resolve()).then(function(){
        if(epoch!==protectedEpoch||role()!==initialRole)throw new Error('PROTECTED_READ_CONTEXT_CHANGED');
        return rows;
      });
    }
    function protectedRelatedUniverse(collection,epoch){
      if(collection==='cobros')return protectedLoad('cobros','',epoch);
      // Do not cache partially hydrated global views. Server verifies every batch.
      if(!protectedPoliciesPromise)protectedPoliciesPromise=protectedLoad('polizas','',epoch);
      return protectedPoliciesPromise.then(function(policies){
        if(epoch!==protectedEpoch)throw new Error('PROTECTED_READ_CONTEXT_CHANGED');
        var batches=[],rows=[],seenIds=new Set(),seenPolicies=new Set();
        ['GT','CO'].forEach(function(country){
          var mine=policies.filter(function(p){return text(p.pais||p.country).toUpperCase()===country;});
          for(var i=0;i<mine.length;i+=10){
            var ids=mine.slice(i,i+10).map(function(p){
              var id=text(p.canonicalDocumentId||p.id);
              if(!id||seenPolicies.has(id))throw new Error('PROTECTED_READ_POLICY_DUPLICATE');
              seenPolicies.add(id);return id;
            });
            batches.push({country:country,ids:ids});
          }
        });
        var offset=0;
        function worker(){
          if(epoch!==protectedEpoch)throw new Error('PROTECTED_READ_CONTEXT_CHANGED');
          if(offset>=batches.length)return Promise.resolve();
          var batch=batches[offset++];
          return protectedLoad(collection,'',epoch,batch.country,batch.ids).then(function(items){
            items.forEach(function(item){
              var id=text(item&&item.canonicalDocumentId||item&&item.id);
              if(!id||seenIds.has(id))throw new Error('PROTECTED_READ_RELATED_DUPLICATE');
              if(batch.ids.indexOf(text(item.polizaId||item.policyId))<0)
                throw new Error('PROTECTED_READ_RELATED_POLICY_MISMATCH');
              seenIds.add(id);rows.push(item);
            });
            return worker();
          });
        }
        return Promise.all(Array.from({length:Math.min(3,batches.length)},function(){return worker();}))
          .then(function(){
            if(epoch!==protectedEpoch)throw new Error('PROTECTED_READ_CONTEXT_CHANGED');
            return rows.sort(function(a,b){return text(a.canonicalDocumentId||a.id).localeCompare(text(b.canonicalDocumentId||b.id));});
          });
      });
    }
    function protectedAttach(collection){
      var plan=queryPlan(collection);state.queryPlans[collection]=clone(plan);
      if(plan.hardError)throw new Error('PROTECTED_READ_PLAN_DENIED');
      if(plan.denied){if(state.deniedCollections.indexOf(collection)<0)state.deniedCollections.push(collection);return false;}
      var related=['vehiculos','recibosEsperados','carteraPrimas','cobros'].indexOf(collection)>=0;
      if(!related&&collection!=='clientes'&&collection!=='polizas'&&collection!=='aseguradoras'&&collection!=='asesores'&&collection!=='negocios'&&collection!=='gestiones'&&collection!=='actividades'&&collection!=='metas')
        throw new Error('PROTECTED_READ_COLLECTION_UNSUPPORTED_'+collection);
      var epoch=protectedEpoch;
      Promise.resolve().then(function(){return related?protectedRelatedUniverse(collection,epoch):protectedLoad(collection,'',epoch);})
        .then(function(rows){if(epoch===protectedEpoch)acceptRows(collection,rows,{fromCache:false});})
        .catch(function(e){if(epoch===protectedEpoch)recordError(collection,e,'snapshot');});
      return true;
    }
    function roleChanged(){
      if(!protectedMode)return;
      var names=Object.keys(attachStarted).filter(function(k){return !!attachStarted[k];});
      ++protectedEpoch;protectedPoliciesPromise=null;attachStarted={};collections.forEach(function(k){cache[k]=[];});
      state.serverConfirmedCollections=[];state.attachedCollections=[];state.observedCollections=[];
      state.snapshotErrors={};state.deniedCollections=[];state.ready=false;state.status='waiting-protected-role';
      emit('*');names.forEach(function(k){attachCollection(k,true);});
    }

    function attachCollection(collection, authoritativeFirst) {
      if (attachStarted[collection]) return true;
      attachStarted[collection] = true;
      if(protectedMode){try{return protectedAttach(collection);}catch(e){recordError(collection,e,'attach');return false;}}
      var built;
      try {
        built = queryRef(collection);
        if (built.denied) { if (state.deniedCollections.indexOf(collection) < 0) state.deniedCollections.push(collection); cache[collection] = []; emit(collection); return false; }
        if (authoritativeFirst) {
          if (typeof deps.getDocsFromServer !== 'function') {
            if (authoritativeFirstReadRequired) throw new Error('firestore_authoritative_read_api_unavailable');
            subscribeBuilt(collection, built); return true;
          }
          Promise.resolve(deps.getDocsFromServer(built.ref)).then(function (snapshot) {
            acceptRows(collection, docRows(snapshot), { fromCache: false });
            subscribeBuilt(collection, built);
          }).catch(function (error) { recordError(collection, error, 'snapshot'); });
          return true;
        }
        subscribeBuilt(collection, built);
        return true;
      } catch (error) { recordError(collection, error, 'attach'); return false; }
    }
    function ensureCollections(names) {
      deferredPauseUntil = Math.max(deferredPauseUntil, Date.now() + 2500);
      var requested = unique(names).filter(function (name) { return collections.indexOf(name) >= 0; });
      requested.forEach(function (name) { if (!attachStarted[name]) attachCollection(name, authoritativeFirstReadRequired); });
      return requested;
    }
    function attach() {
      if (!tenantCheck.ok) { state.status = 'blocked-tenant'; return false; }
      if (!collections.length || !startupCollections.length) { state.status = 'blocked-no-collections'; return false; }
      if (!protectedMode && !database()) { state.status = 'blocked-no-database'; return false; }
      if(protectedMode&&typeof deps.protectedReadPage!=='function'){state.status='attach-error';return false;}
      // Preflight the complete required collection set before fetching any
      // protected data. A six-of-eight bootstrap is never an accepted startup.
      if(protectedMode){
        var supported=new Set(['clientes','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','aseguradoras','asesores','negocios','gestiones','actividades','metas']);
        var unsupported=startupCollections.filter(function(name){return !supported.has(name);});
        if(unsupported.length){
          state.status='blocked-protected-incomplete';
          state.snapshotErrors.__startup='PROTECTED_READ_REQUIRED_COLLECTIONS_UNSUPPORTED:'+unsupported.join(',');
          return false;
        }
      }
      if (!protectedMode && authoritativeFirstReadRequired && typeof deps.getDocsFromServer !== 'function') { state.status = 'attach-error'; state.snapshotErrors.__startup = 'firestore_authoritative_read_api_unavailable'; return false; }
      state.status = 'attaching';
      startupCollections.forEach(function (collection) { attachCollection(collection, authoritativeFirstReadRequired); });
      state.ready = requiredConfirmed();
      if (!state.ready && state.status === 'attaching') state.status = 'waiting-authoritative-snapshots';
      return startupCollections.every(function (name) { return !state.snapshotErrors[name] && state.deniedCollections.indexOf(name) < 0; });
    }
    function detach() { ++protectedEpoch; protectedPoliciesPromise=null; if(protectedMode&&typeof document!=='undefined'&&document.removeEventListener)document.removeEventListener('orbit:active-role-changed',roleChanged); unsubscribers.splice(0).forEach(function (unsubscribe) { try { unsubscribe(); } catch (e) {} }); state.attachedCollections = []; state.observedCollections = []; state.serverConfirmedCollections = []; state.cacheOnlyCollections = []; state.snapshotSources = {}; state.ready = false; state.status = 'detached'; deferredAttached = false; deferredScheduled = false; deferredCursor = 0; deferredPauseUntil = 0; attachStarted = {}; state.deferredAttached = false; }
    if(protectedMode&&typeof document!=='undefined'&&document.addEventListener)document.addEventListener('orbit:active-role-changed',roleChanged);
    function buildRelationIndexes() {
      var policyById = new Map(), clientById = new Map();
      (cache.polizas || []).forEach(function (p) { var id = text(rowId(p)); if (id) policyById.set(id, p); });
      (cache.clientes || []).forEach(function (c) { var id = text(rowId(c)); if (id) clientById.set(id, c); });
      return { policyById: policyById, clientById: clientById };
    }
    function indexedRelationValue(kind, row, indexes) {
      var pid = text(row && (row.polizaId || row.policyId));
      var policy = pid ? indexes.policyById.get(pid) || null : null;
      var cid = text(row && row.clienteId) || text(policy && policy.clienteId);
      var client = cid ? indexes.clientById.get(cid) || null : null;
      if (kind === 'country') return text(row && (row.pais || row.country)) || text(policy && (policy.pais || policy.country)) || text(client && (client.pais || client.country));
      if (kind === 'advisor') return text(row && (row.asesorId || row.advisorId || row.ownerAdvisorId)) || text(policy && (policy.asesorId || policy.advisorId || policy.ownerAdvisorId)) || text(client && (client.asesorId || client.advisorId || client.ownerAdvisorId));
      if (kind === 'team') return text(row && (row.equipoId || row.teamId)) || text(policy && (policy.equipoId || policy.teamId)) || text(client && (client.equipoId || client.teamId));
      return '';
    }
    function indexedRelationConstraintMatches(row, constraint, indexes) {
      var field = text(constraint && constraint.field), kind = field === '__relation_country__' ? 'country' : field === '__relation_advisor__' ? 'advisor' : field === '__relation_team__' ? 'team' : '';
      if (!kind) return true;
      var value = indexedRelationValue(kind, row, indexes);
      if (!value) return false;
      if (constraint.op === '==') return value === text(constraint.value);
      if (constraint.op === 'in') return Array.isArray(constraint.value) && constraint.value.map(text).indexOf(value) >= 0;
      if (constraint.op === 'array-contains') return Array.isArray(value) && value.indexOf(constraint.value) >= 0;
      return false;
    }
    function logicalRows(collection) {
      var source = cache[collection] || [], plan = state.queryPlans[collection] || {}, constraints = (plan.constraints || []).filter(function (item) { return String(item && item.field || '').indexOf('__relation_') === 0; });
      if (!constraints.length) return source;
      var indexes = buildRelationIndexes();
      return source.filter(function (row) { return constraints.every(function (constraint) { return indexedRelationConstraintMatches(row, constraint, indexes); }); });
    }
    // R26 B4-003: a scoped collection must have the same visibility through every
    // store accessor. The previous get/where/find bypassed __relation_advisor__
    // and __relation_team__ filters, even though all() enforced them.
    // This is only a client-cache consistency guard; server security is separate.
    function scopedRows(collection) {
      if (state.deniedCollections.indexOf(collection) >= 0) return [];
      return logicalRows(collection);
    }
    function all(collection) { return scopedRows(collection).map(clone); }
    function get(collection, id) { var row = scopedRows(collection).find(function (item) { return rowId(item) === id; }); return row ? clone(row) : null; }
    function where(collection, fieldOrPredicate, opOrValue, maybeValue) {
      var source = scopedRows(collection), matches;
      if (typeof fieldOrPredicate === 'function') matches = source.filter(fieldOrPredicate);
      else if (fieldOrPredicate && typeof fieldOrPredicate === 'object') matches = source.filter(function (row) {
        return Object.keys(fieldOrPredicate).every(function (key) { return row[key] === fieldOrPredicate[key]; });
      });
      else {
        var field = fieldOrPredicate, op = arguments.length >= 4 ? opOrValue : '==',
          value = arguments.length >= 4 ? maybeValue : opOrValue;
        matches = source.filter(function (row) {
          if (op === '==' || op === '=') return row[field] === value;
          if (op === '!=') return row[field] !== value;
          if (op === '>') return row[field] > value;
          if (op === '>=') return row[field] >= value;
          if (op === '<') return row[field] < value;
          if (op === '<=') return row[field] <= value;
          if (op === 'array-contains') return Array.isArray(row[field]) && row[field].indexOf(value) >= 0;
          return false;
        });
      }
      return matches.map(clone);
    }
    function find(collection, predicate) {
      var source = scopedRows(collection), row = null;
      if (typeof predicate === 'function') row = source.find(predicate) || null;
      else if (predicate && typeof predicate === 'object') row = source.find(function (item) {
        return Object.keys(predicate).every(function (key) { return item[key] === predicate[key]; });
      }) || null;
      return row ? clone(row) : null;
    }
    function on(collection, callback) { if (typeof collection === 'function') { callback = collection; collection = '*'; } var listener = function (changed) { if (collection === '*' || collection === changed || changed === '*') callback(changed); }; listeners.push(listener); return function () { listeners = listeners.filter(function (item) { return item !== listener; }); }; }
    function pref(key, defaultValue) { return Object.prototype.hasOwnProperty.call(prefs, key) ? clone(prefs[key]) : defaultValue; }
    function raw() { var out = {}; collections.forEach(function (collection) { out[collection] = all(collection); }); out.__prefs = clone(prefs); out.__backend = Object.assign({}, state, { quarantinedRows: clone(state.quarantinedRows), queryPlans: clone(state.queryPlans) }); return out; }
    var api = { all: all, get: get, where: where, find: find, insert: fail, update: fail, remove: fail, on: on, _emit: emit, pref: pref, setPref: fail, init: function () { return api; }, reseed: fail, raw: raw, subscribe: on, _subscribe: on, _attachSnapshots: attach, _detachSnapshots: detach, _ensureCollections: ensureCollections, _productStatus: function () { return Object.assign({}, state, { quarantinedRows: clone(state.quarantinedRows), queryPlans: clone(state.queryPlans) }); }, __productReadOnlyP0: true };
    if(protectedMode){
      api._protectedReadRelated=function(collection,policyId){
        if(!['vehiculos','recibosEsperados','carteraPrimas','cobros'].includes(collection)||!text(policyId))
          return Promise.reject(new Error('PROTECTED_READ_POLICY_ANCHOR_REQUIRED'));
        return protectedLoad(collection,text(policyId),protectedEpoch).then(function(rows){return rows.map(clone);});
      };
      api._protectedCandidate=true;
    }
    return api;
  }
  window.Orbit.createFirestoreProductReadOnlyStoreP0 = createStore;
  window.Orbit.firestoreProductReadOnlyStoreP0 = Object.freeze({ VERSION: VERSION, WRITE_ERROR: WRITE_ERROR, create: createStore, authoritativeFirstReadSupported: true });
})();