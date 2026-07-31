/* ============================================================
   Orbit 360 · Identidad/upsert transversal para importadores y altas
   Fecha: 2026-07-31
   Contrato: identidad exacta -> update blank-safe; probable -> HOLD;
             nueva -> insert. Sin PII hardcodeada ni lógica tenant específica.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  if (Orbit.importaIdentityUpsertV20260731) return;

  const VERSION = '20260731.1';
  const GUARDED = new Set([
    'clientes', 'aseguradoras', 'polizas', 'vehiculos', 'bienesAsegurados',
    'recibosEsperados', 'recibosFuenteExterna', 'recibosAseguradora',
    'estadosCuentaAseguradora', 'carteraPrimas'
  ]);

  function text(v) { return String(v == null ? '' : v).trim(); }
  function norm(v) {
    return text(v).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9@.+ -]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function dateYMD(v) {
    const raw = text(v);
    if (!raw) return '';
    let m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    return m ? `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}` : raw.slice(0, 10);
  }
  function isBlank(v) {
    if (v == null || v === '' || v === 'REQUIERE_VALIDACION') return true;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'object') return Object.keys(v).length === 0;
    return false;
  }
  function first(rec, keys) {
    for (const k of keys) if (!isBlank(rec && rec[k])) return rec[k];
    return '';
  }
  function country(rec) { return norm(first(rec, ['pais','country','codigoPais'])); }
  function tenant(rec) {
    const explicit = norm(first(rec, ['tenantId','tenant']));
    if (explicit) return explicit;
    try {
      const t = Orbit.tenant && Orbit.tenant.get ? Orbit.tenant.get() : Orbit.tenant;
      return norm(t && (t.id || t.tenantId) || '');
    } catch (e) { return ''; }
  }
  function scoped(parts, rec) {
    const t = tenant(rec);
    return [t || 'tenant', ...parts.map(norm)].join('|');
  }
  function personName(rec) {
    return first(rec, ['nombre','nombreCompleto','razonSocial','clienteNombre','aseguradoNombre','contratanteNombre','tomadorNombre']);
  }
  function clientExact(rec) {
    const c = country(rec);
    const doc = first(rec, ['numeroDocumento','documento','nit','dpi','cedula','cedulaJuridica','rut','rtu','identificacion']);
    if (doc && c) return scoped(['cliente','doc',c,doc], rec);
    const name = personName(rec), email = first(rec, ['correo','email']), phone = first(rec, ['whatsapp','telefono','telefonoAlterno','contactoPrincipalTelefono']);
    if (name && email && c) return scoped(['cliente','name_email',c,name,email], rec);
    if (name && phone && c) return scoped(['cliente','name_phone',c,name,phone], rec);
    return '';
  }
  function clientProbable(rec) {
    const c = country(rec);
    const doc = first(rec, ['numeroDocumento','documento','nit','dpi','cedula','cedulaJuridica','rut','rtu','identificacion']);
    if (doc && !c) return scoped(['cliente','doc_unscoped',doc], rec);
    const name = personName(rec);
    const city = first(rec, ['ciudadMunicipio','ciudad','canton','municipio']);
    return name ? scoped(['cliente','prob',c || 'sin_pais',name,city || 'sin_ciudad'], rec) : '';
  }
  function insurerExact(rec) {
    const c = country(rec);
    if (!c) return '';
    const tax = first(rec, ['nit','numeroDocumento','identificacionFiscal','taxId']);
    if (tax) return scoped(['aseguradora','tax',c,tax], rec);
    const name = first(rec, ['nombre','razonSocial','aseguradoraNombre','aseguradora']);
    return name ? scoped(['aseguradora','name',c,name], rec) : '';
  }
  function insurerProbable(rec) {
    const name = first(rec, ['nombre','razonSocial','aseguradoraNombre','aseguradora']);
    return name ? scoped(['aseguradora','prob',name], rec) : '';
  }
  function policyParty(rec) {
    return first(rec, ['clienteId','aseguradoId','contratanteId','tomadorId','numeroDocumento','identificacion','clienteNombre','aseguradoNombre','contratanteNombre','tomadorNombre']);
  }
  function policyBase(rec) {
    const c = country(rec);
    const ins = first(rec, ['aseguradoraId','aseguradoraNombre','aseguradora']);
    const num = first(rec, ['numero','numeroPoliza','poliza']);
    const party = policyParty(rec);
    if (!c || !ins || !num || !party) return '';
    return scoped(['poliza',c,ins,num,party], rec);
  }
  function policyExact(rec) {
    const explicit = first(rec, ['_sourceVersionKey','sourceVersionKey']);
    if (explicit) return scoped(['poliza_version',explicit], rec);
    const base = policyBase(rec);
    const start = dateYMD(first(rec, ['vigenciaIni','vigenciaInicio','desde']));
    const end = dateYMD(first(rec, ['vigenciaFin','vigenciaFinal','hasta','vencimiento']));
    return base && start && end ? [base,start,end].join('|') : '';
  }
  function policyProbable(rec) {
    const base = policyBase(rec);
    return base && !policyExact(rec) ? base + '|vigencia_pendiente' : '';
  }
  function vehiclePolicy(rec) { return first(rec, ['polizaId','policyId','polizaNumero','numeroPoliza','poliza']); }
  function vehicleExact(rec) {
    const p = vehiclePolicy(rec);
    if (!p) return '';
    const plate = first(rec, ['placa','matricula']);
    if (plate) return scoped(['vehiculo','placa',p,plate], rec);
    const vin = first(rec, ['vin','chasis','numeroChasis']);
    return vin ? scoped(['vehiculo','vin',p,vin], rec) : '';
  }
  function receiptPolicy(rec) { return first(rec, ['polizaId','policyId','polizaNumero','numeroPoliza','poliza']); }
  function amountKey(rec) {
    const v = first(rec, ['monto','total','primaTotal','saldo','valor']);
    if (isBlank(v)) return '';
    const n = Number(String(v).replace(/[^0-9,.\-]/g,'').replace(/,(?=\d{1,2}$)/,'.').replace(/,/g,''));
    return Number.isFinite(n) ? n.toFixed(2) : norm(v);
  }
  function receiptExact(rec) {
    const source = first(rec, ['_sourceKey','sourceKey','sourceReceiptKey']);
    if (source) return scoped(['recibo','source',source], rec);
    const p = receiptPolicy(rec);
    if (!p) return '';
    const num = first(rec, ['reciboNumero','numeroRecibo','requerimiento','serie','numero']);
    const due = dateYMD(first(rec, ['vence','fechaVencimiento','fechaLimite']));
    const amount = amountKey(rec);
    const cuota = first(rec, ['cuota','n','numeroCuota']);
    if (num) return scoped(['recibo','numero',p,num], rec);
    return due && (amount || cuota) ? scoped(['recibo','calendario',p,due,cuota || amount], rec) : '';
  }
  function statementExact(rec) {
    const source = first(rec, ['_sourceKey','sourceKey']);
    if (source) return scoped(['estado_cuenta','source',source], rec);
    const id = first(rec, ['id']);
    return id ? scoped(['estado_cuenta','id',id], rec) : '';
  }
  function portfolioExact(rec) {
    const source = first(rec, ['_sourceKey','sourceKey','reciboAseguradoraId','reciboEsperadoId']);
    return source ? scoped(['cartera','source',source], rec) : receiptExact(rec);
  }
  function identityKey(collection, rec) {
    if (!rec) return '';
    if (collection === 'clientes') return clientExact(rec);
    if (collection === 'aseguradoras') return insurerExact(rec);
    if (collection === 'polizas') return policyExact(rec);
    if (collection === 'vehiculos' || collection === 'bienesAsegurados') return vehicleExact(rec);
    if (collection === 'recibosEsperados' || collection === 'recibosFuenteExterna' || collection === 'recibosAseguradora') return receiptExact(rec);
    if (collection === 'estadosCuentaAseguradora') return statementExact(rec);
    if (collection === 'carteraPrimas') return portfolioExact(rec);
    return '';
  }
  function probableKey(collection, rec) {
    if (collection === 'clientes') return clientProbable(rec);
    if (collection === 'aseguradoras') return insurerProbable(rec);
    if (collection === 'polizas') return policyProbable(rec);
    return '';
  }
  function mergeNonBlank(existing, incoming) {
    const patch = {};
    Object.keys(incoming || {}).forEach(function (k) {
      if (k === 'id') return;
      const v = incoming[k];
      if (!isBlank(v)) patch[k] = v;
    });
    patch._identityUpsertVersion = VERSION;
    patch._identityUpsertAction = 'update';
    return patch;
  }
  function all(collection) {
    try { return Orbit.store && Orbit.store.all ? Orbit.store.all(collection) || [] : []; }
    catch (e) { return []; }
  }
  function findExact(collection, rec, excludeId) {
    const key = identityKey(collection, rec);
    if (!key) return null;
    return all(collection).find(function (row) {
      return String(row && row.id || '') !== String(excludeId || '') && identityKey(collection, row) === key;
    }) || null;
  }
  function findProbable(collection, rec, excludeId) {
    const key = probableKey(collection, rec);
    if (!key) return null;
    return all(collection).find(function (row) {
      return String(row && row.id || '') !== String(excludeId || '') && probableKey(collection, row) === key;
    }) || null;
  }
  function getCurrent(collection, id) {
    try { return id && Orbit.store && Orbit.store.get ? Orbit.store.get(collection, id) : null; }
    catch (e) { return null; }
  }
  function mergedForIdentity(current, incoming) {
    return Object.assign({}, current || {}, mergeNonBlank(current || {}, incoming || {}));
  }
  function resolveOperation(collection, data, options) {
    const requestedAction = options && options.requestedAction || 'insert';
    const requestedId = options && options.id || '';
    if (!GUARDED.has(collection)) {
      return { action: requestedAction, collection, id: requestedId, data: Object.assign({}, data || {}), identityStatus: 'not_guarded' };
    }
    if (requestedAction === 'update' && requestedId) {
      const current = getCurrent(collection, requestedId) || {};
      const candidate = mergedForIdentity(current, data || {});
      const collision = findExact(collection, candidate, requestedId);
      if (collision) return {
        action: 'hold', collection, id: requestedId, data: Object.assign({}, data || {}),
        identityStatus: 'exact_collision', candidateId: collision.id || '', reason: 'identity_collision'
      };
      return {
        action: 'update', collection, id: requestedId, data: mergeNonBlank(current, data || {}),
        identityStatus: 'update_existing', identityKey: identityKey(collection, candidate)
      };
    }
    const exact = findExact(collection, data || {}, '');
    if (exact) return {
      action: 'update', collection, id: exact.id || '', data: mergeNonBlank(exact, data || {}),
      identityStatus: 'exact_match', identityKey: identityKey(collection, data || {})
    };
    const probable = findProbable(collection, data || {}, '');
    if (probable) return {
      action: 'hold', collection, id: '', data: Object.assign({}, data || {}),
      identityStatus: 'probable_match', candidateId: probable.id || '', reason: 'probable_duplicate_requires_validation',
      probableKey: probableKey(collection, data || {})
    };
    return {
      action: 'insert', collection, id: '', data: Object.assign({}, data || {}, {
        _identityUpsertVersion: VERSION, _identityUpsertAction: 'insert'
      }),
      identityStatus: 'new', identityKey: identityKey(collection, data || {})
    };
  }
  function emitHold(decision) {
    try {
      document.dispatchEvent(new CustomEvent('orbit:identity-hold', { detail: {
        collection: decision.collection, reason: decision.reason, candidateId: decision.candidateId || ''
      }}));
    } catch (e) {}
  }
  function installStoreGuard() {
    if (!Orbit.store || typeof Orbit.store.insert !== 'function' || typeof Orbit.store.update !== 'function') return false;
    if (Orbit.store.__identityUpsertV20260731) return true;
    const originalInsert = Orbit.store.insert.bind(Orbit.store);
    const originalUpdate = Orbit.store.update.bind(Orbit.store);

    Orbit.store.insert = function (collection, rec) {
      if (!GUARDED.has(collection)) return originalInsert(collection, rec);
      const decision = resolveOperation(collection, rec || {}, { requestedAction: 'insert' });
      if (decision.action === 'update') return originalUpdate(collection, decision.id, decision.data);
      if (decision.action === 'hold') {
        emitHold(decision);
        return Object.assign({}, rec || {}, {
          _identityHold: true, _identityReason: decision.reason,
          _identityCandidateId: decision.candidateId || '', _identityUpsertVersion: VERSION
        });
      }
      return originalInsert(collection, decision.data);
    };

    Orbit.store.update = function (collection, id, patch) {
      if (!GUARDED.has(collection)) return originalUpdate(collection, id, patch);
      const decision = resolveOperation(collection, patch || {}, { requestedAction: 'update', id });
      if (decision.action === 'hold') {
        emitHold(decision);
        const current = getCurrent(collection, id) || {};
        return Object.assign({}, current, {
          _identityHold: true, _identityReason: decision.reason,
          _identityCandidateId: decision.candidateId || '', _identityUpsertVersion: VERSION
        });
      }
      return originalUpdate(collection, id, decision.data);
    };

    Orbit.store.__identityUpsertV20260731 = true;
    Orbit.store.__identityUpsertVersion = VERSION;
    return true;
  }

  Orbit.importaIdentityUpsertV20260731 = Object.freeze({
    VERSION, GUARDED, isBlank, norm, dateYMD, identityKey, probableKey,
    mergeNonBlank, findExact, findProbable, resolveOperation, installStoreGuard
  });

  if (!installStoreGuard()) {
    try { document.addEventListener('orbit:store', installStoreGuard, { once: true }); } catch (e) {}
    setTimeout(installStoreGuard, 250);
  }
})();
