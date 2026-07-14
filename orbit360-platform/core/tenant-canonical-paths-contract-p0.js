/* ============================================================
   Orbit 360 · Contrato P0 de rutas canónicas multi-tenant
   Fecha: 2026-07-13

   Capa pura y aditiva. Normaliza y valida rutas/envelopes.
   No reemplaza Orbit.store, Auth ni reglas y no escribe datos.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-20260713';
  var COUNTRY_CURRENCY = Object.freeze({ GT: 'GTQ', CO: 'COP' });
  var RESERVED_TENANT_IDS = Object.freeze([
    'admin', 'api', 'app', 'auth', 'backend', 'demo', 'firebase', 'firestore',
    'lab', 'main', 'null', 'orbit', 'orbit360', 'prod', 'production', 'public',
    'root', 'system', 'tenants', 'undefined'
  ]);
  var SECRET_KEYS = Object.freeze([
    'password', 'pass', 'pwd', 'contrasena', 'clave', 'secret', 'token',
    'apikey', 'api_key', 'access_token', 'refresh_token', 'credentialvalue',
    'credential_value', 'privatekey', 'private_key', 'clientsecret', 'client_secret'
  ]);
  var BLOCKED_COLLECTIONS = Object.freeze([
    'secrets', 'credenciales', 'credentials', 'passwords', 'tokens', 'privateKeys'
  ]);
  var SYSTEM_COLLECTIONS = Object.freeze([
    'members', 'auditEvents', 'importBatches', 'credentialRefs', 'academyProgress'
  ]);

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (e) { return value && typeof value === 'object' ? Object.assign({}, value) : value; }
  }

  function normalizeTenantId(value) {
    return text(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  function validateTenantId(value) {
    var raw = text(value);
    var normalized = normalizeTenantId(raw);
    var errors = [];
    if (!raw) errors.push('tenant_faltante');
    if (raw !== normalized) errors.push('tenant_no_canonico');
    if (normalized.length < 3 || normalized.length > 63) errors.push('tenant_longitud_invalida');
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(normalized)) errors.push('tenant_formato_invalido');
    if (RESERVED_TENANT_IDS.indexOf(normalized) >= 0) errors.push('tenant_reservado');
    return { ok: errors.length === 0, tenantId: normalized, errors: errors };
  }

  function normalizeCollection(value) {
    return text(value).replace(/[^A-Za-z0-9_]/g, '');
  }

  function validateCollection(value) {
    var raw = text(value);
    var normalized = normalizeCollection(raw);
    var errors = [];
    if (!raw) errors.push('coleccion_faltante');
    if (raw !== normalized) errors.push('coleccion_no_canonica');
    if (!/^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(normalized)) errors.push('coleccion_formato_invalido');
    if (BLOCKED_COLLECTIONS.indexOf(normalized) >= 0) errors.push('coleccion_bloqueada');
    return { ok: errors.length === 0, collection: normalized, errors: errors };
  }

  function normalizeDocumentId(value) {
    return text(value);
  }

  function validateDocumentId(value) {
    var id = normalizeDocumentId(value);
    var errors = [];
    if (!id) errors.push('documento_id_faltante');
    if (id.length > 256) errors.push('documento_id_muy_largo');
    if (id === '.' || id === '..' || /[\/\\]/.test(id)) errors.push('documento_id_invalido');
    return { ok: errors.length === 0, id: id, errors: errors };
  }

  function must(check) {
    if (!check.ok) throw new Error(check.errors.join('|'));
    return check;
  }

  function tenantDocumentPath(tenantId) {
    var t = must(validateTenantId(tenantId)).tenantId;
    return 'tenants/' + t;
  }

  function tenantConfigDocumentPath(tenantId) {
    return tenantDocumentPath(tenantId) + '/system/config';
  }

  function membershipDocumentPath(tenantId, uid) {
    var u = must(validateDocumentId(uid)).id;
    return tenantDocumentPath(tenantId) + '/members/' + u;
  }

  function dataCollectionPath(tenantId, collection) {
    var c = must(validateCollection(collection)).collection;
    return tenantDocumentPath(tenantId) + '/data/' + c + '/items';
  }

  function dataDocumentPath(tenantId, collection, documentId) {
    var id = must(validateDocumentId(documentId)).id;
    return dataCollectionPath(tenantId, collection) + '/' + id;
  }

  function auditDocumentPath(tenantId, eventId) {
    var id = must(validateDocumentId(eventId)).id;
    return tenantDocumentPath(tenantId) + '/auditEvents/' + id;
  }

  function importBatchDocumentPath(tenantId, batchId) {
    var id = must(validateDocumentId(batchId)).id;
    return tenantDocumentPath(tenantId) + '/importBatches/' + id;
  }

  function credentialRefDocumentPath(tenantId, refId) {
    var id = must(validateDocumentId(refId)).id;
    return tenantDocumentPath(tenantId) + '/credentialRefs/' + id;
  }

  function academyProgressDocumentPath(tenantId, uid) {
    var id = must(validateDocumentId(uid)).id;
    return tenantDocumentPath(tenantId) + '/academyProgress/' + id;
  }

  function parseDataDocumentPath(path) {
    var match = /^tenants\/([^/]+)\/data\/([^/]+)\/items\/([^/]+)$/.exec(text(path));
    if (!match) return { ok: false, errors: ['ruta_datos_invalida'] };
    var tenant = validateTenantId(match[1]);
    var collection = validateCollection(match[2]);
    var documentId = validateDocumentId(match[3]);
    var errors = tenant.errors.concat(collection.errors, documentId.errors);
    return {
      ok: errors.length === 0,
      tenantId: tenant.tenantId,
      collection: collection.collection,
      documentId: documentId.id,
      errors: errors
    };
  }

  function normalizeCountry(value) {
    return text(value).toUpperCase();
  }

  function normalizeCurrency(value) {
    return text(value).toUpperCase();
  }

  function secretPaths(input) {
    var found = [];
    function walk(value, path) {
      if (!value || typeof value !== 'object') return;
      Object.keys(value).forEach(function (key) {
        var normalized = String(key).toLowerCase().replace(/[-_]/g, '');
        var current = path ? path + '.' + key : key;
        if (SECRET_KEYS.map(function (item) { return item.replace(/[-_]/g, ''); }).indexOf(normalized) >= 0) {
          if (value[key] !== null && value[key] !== undefined && text(value[key]) !== '') found.push(current);
        }
        if (value[key] && typeof value[key] === 'object') walk(value[key], current);
      });
    }
    walk(input, '');
    return found;
  }

  function validateRecordEnvelope(record, expected) {
    expected = expected || {};
    var row = clone(record || {});
    var errors = [];
    var warnings = [];
    var tenant = validateTenantId(row.tenantId);
    var collection = validateCollection(expected.collection || row.collection || '');
    var id = validateDocumentId(row.id || expected.documentId || '');
    var country = normalizeCountry(row.country || row.pais);
    var currency = normalizeCurrency(row.currency || row.moneda);
    var secrets = secretPaths(row);

    if (!tenant.ok) errors.push.apply(errors, tenant.errors);
    if (!collection.ok) errors.push.apply(errors, collection.errors);
    if (!id.ok) errors.push.apply(errors, id.errors);
    if (expected.tenantId && tenant.tenantId !== normalizeTenantId(expected.tenantId)) errors.push('tenant_no_coincide');
    if (expected.documentId && id.id !== text(expected.documentId)) errors.push('documento_id_no_coincide');
    if (secrets.length) errors.push('material_secreto_no_permitido:' + secrets.join(','));

    if (country || currency) {
      if (!country) errors.push('pais_faltante');
      if (!currency) errors.push('moneda_faltante');
      if (country && !COUNTRY_CURRENCY[country]) errors.push('pais_no_configurado:' + country);
      if (country && currency && COUNTRY_CURRENCY[country] && COUNTRY_CURRENCY[country] !== currency) {
        errors.push('pais_moneda_inconsistente');
      }
    }
    if (!row.trace && !row.sourceTrace && !row.importBatchId) warnings.push('trazabilidad_faltante');

    return {
      ok: errors.length === 0,
      writeAuthorized: false,
      tenantId: tenant.tenantId,
      collection: collection.collection,
      documentId: id.id,
      path: errors.length ? '' : dataDocumentPath(tenant.tenantId, collection.collection, id.id),
      record: row,
      errors: errors,
      warnings: warnings
    };
  }

  function routeDescriptor(kind, tenantId, options) {
    options = options || {};
    var routes = {
      tenant: function () { return tenantDocumentPath(tenantId); },
      config: function () { return tenantConfigDocumentPath(tenantId); },
      member: function () { return membershipDocumentPath(tenantId, options.uid); },
      data: function () { return dataDocumentPath(tenantId, options.collection, options.documentId); },
      audit: function () { return auditDocumentPath(tenantId, options.eventId); },
      importBatch: function () { return importBatchDocumentPath(tenantId, options.batchId); },
      credentialRef: function () { return credentialRefDocumentPath(tenantId, options.refId); },
      academyProgress: function () { return academyProgressDocumentPath(tenantId, options.uid); }
    };
    if (!routes[kind]) return { ok: false, writeAuthorized: false, errors: ['tipo_ruta_invalido'] };
    try {
      return { ok: true, writeAuthorized: false, kind: kind, tenantId: normalizeTenantId(tenantId), path: routes[kind](), errors: [] };
    } catch (e) {
      return { ok: false, writeAuthorized: false, kind: kind, tenantId: normalizeTenantId(tenantId), path: '', errors: [String(e && e.message || e)] };
    }
  }

  window.Orbit.tenantCanonicalPathsP0 = Object.freeze({
    VERSION: VERSION,
    COUNTRY_CURRENCY: COUNTRY_CURRENCY,
    BLOCKED_COLLECTIONS: BLOCKED_COLLECTIONS,
    SYSTEM_COLLECTIONS: SYSTEM_COLLECTIONS,
    normalizeTenantId: normalizeTenantId,
    validateTenantId: validateTenantId,
    validateCollection: validateCollection,
    validateDocumentId: validateDocumentId,
    tenantDocumentPath: tenantDocumentPath,
    tenantConfigDocumentPath: tenantConfigDocumentPath,
    membershipDocumentPath: membershipDocumentPath,
    dataCollectionPath: dataCollectionPath,
    dataDocumentPath: dataDocumentPath,
    auditDocumentPath: auditDocumentPath,
    importBatchDocumentPath: importBatchDocumentPath,
    credentialRefDocumentPath: credentialRefDocumentPath,
    academyProgressDocumentPath: academyProgressDocumentPath,
    parseDataDocumentPath: parseDataDocumentPath,
    secretPaths: secretPaths,
    validateRecordEnvelope: validateRecordEnvelope,
    routeDescriptor: routeDescriptor
  });
})();
