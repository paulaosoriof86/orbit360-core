/* ============================================================
   Orbit 360 · Contrato P0 de directorios de aseguradoras
   Fecha: 2026-07-13

   Capa pura/aditiva para:
   - normalizar aseguradoras, aliados, contactos, plataformas,
     cuentas, documentos y relaciones;
   - exigir país, moneda y trazabilidad;
   - bloquear secretos y valores de credenciales;
   - producir únicamente dry-run (sin escritura).

   No toca Orbit.store, backend protegido ni datos reales.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var COLLECTIONS = Object.freeze([
    'aseguradoras',
    'contactosAseguradora',
    'plataformasAseguradora',
    'cuentasBancariasAseguradora',
    'documentosAseguradora',
    'relacionesAseguradoraAliado',
    'calidadDatos',
    'auditoriaImportaciones'
  ]);

  var COUNTRY_CURRENCY = Object.freeze({ GT: 'GTQ', CO: 'COP' });
  var ENTITY_TYPES = Object.freeze(['aseguradora', 'aliado_acceso_agrupador']);
  var ALLOWED_ACTIONS = Object.freeze(['create', 'update', 'omit', 'validate']);
  var ALLOWED_VISIBILITY = Object.freeze([
    'direccion', 'superadmin', 'admin_tenant', 'administracion', 'operativo', 'asesor'
  ]);

  var FORBIDDEN_SECRET_KEYS = Object.freeze([
    'password', 'pass', 'pwd', 'contrasena', 'clave', 'secret', 'token',
    'apikey', 'api_key', 'access_token', 'refresh_token', 'credentialvalue',
    'credential_value', 'username', 'usuario', 'user_name'
  ]);

  function plain(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (e) { return value; }
  }

  function normKey(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '');
  }

  function nonEmpty(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  function hasForbiddenSecret(value, path, findings) {
    path = path || '';
    findings = findings || [];

    if (Array.isArray(value)) {
      value.forEach(function (item, index) {
        hasForbiddenSecret(item, path + '[' + index + ']', findings);
      });
      return findings;
    }

    if (!plain(value)) return findings;

    Object.keys(value).forEach(function (key) {
      var normalized = normKey(key);
      var childPath = path ? path + '.' + key : key;
      if (FORBIDDEN_SECRET_KEYS.indexOf(normalized) >= 0 && nonEmpty(value[key])) {
        findings.push(childPath);
      }
      hasForbiddenSecret(value[key], childPath, findings);
    });

    return findings;
  }

  function validateTrace(trace) {
    var errors = [];
    if (!plain(trace)) return ['sourceTrace_faltante'];
    if (!nonEmpty(trace.fileName)) errors.push('sourceTrace_fileName_faltante');
    if (!nonEmpty(trace.fileHash)) errors.push('sourceTrace_fileHash_faltante');
    if (!nonEmpty(trace.sheet)) errors.push('sourceTrace_sheet_faltante');
    if (!nonEmpty(trace.row) && !nonEmpty(trace.block)) errors.push('sourceTrace_row_o_block_faltante');
    return errors;
  }

  function validateCountryCurrency(record) {
    var errors = [];
    var country = record.country || record.pais;
    var currency = record.currency || record.moneda;
    if (!COUNTRY_CURRENCY[country]) errors.push('country_requiere_validacion');
    if (!nonEmpty(currency)) errors.push('currency_faltante');
    if (COUNTRY_CURRENCY[country] && currency !== COUNTRY_CURRENCY[country]) {
      errors.push('country_currency_inconsistente:' + country + ':' + currency);
    }
    return errors;
  }

  function validateCommon(record) {
    var errors = [];
    if (!plain(record)) return ['record_invalido'];
    if (!nonEmpty(record.tenantId)) errors.push('tenantId_faltante');
    errors = errors.concat(validateCountryCurrency(record));
    errors = errors.concat(validateTrace(record.sourceTrace));

    var secrets = hasForbiddenSecret(record);
    if (secrets.length) errors.push('secretos_prohibidos:' + secrets.join(','));

    if (record.credentialRef && !nonEmpty(record.credentialStatus)) {
      errors.push('credentialStatus_faltante');
    }
    if (record.credentialStatus && record.credentialStatus !== 'backend_required' && record.credentialStatus !== 'connected') {
      errors.push('credentialStatus_invalido');
    }
    return errors;
  }

  function validateAseguradora(record) {
    var errors = [];
    if (!nonEmpty(record.canonicalName)) errors.push('canonicalName_faltante');
    if (record.entityType !== 'aseguradora') errors.push('entityType_aseguradora_requerido');
    if (record.aliases && !Array.isArray(record.aliases)) errors.push('aliases_debe_ser_array');
    return errors;
  }

  function validateContacto(record) {
    var errors = [];
    if (!nonEmpty(record.aseguradoraId)) errors.push('aseguradoraId_faltante');
    if (!nonEmpty(record.name) && !nonEmpty(record.nombre) && !nonEmpty(record.role) && !nonEmpty(record.cargo)) {
      errors.push('contacto_identidad_faltante');
    }
    return errors;
  }

  function validatePlataforma(record) {
    var errors = [];
    if (!nonEmpty(record.aseguradoraId) && !nonEmpty(record.aliadoId)) errors.push('aseguradoraId_o_aliadoId_faltante');
    if (!nonEmpty(record.name) && !nonEmpty(record.nombre)) errors.push('plataforma_nombre_faltante');
    if (record.sensitiveSourceDetected === true && !nonEmpty(record.credentialRef)) {
      errors.push('credentialRef_requerido_por_fuente_sensible');
    }
    if (record.visibilityPolicy) {
      if (!Array.isArray(record.visibilityPolicy)) errors.push('visibilityPolicy_debe_ser_array');
      else record.visibilityPolicy.forEach(function (role) {
        if (ALLOWED_VISIBILITY.indexOf(role) < 0) errors.push('visibilityPolicy_rol_invalido:' + role);
      });
    }
    return errors;
  }

  function validateCuenta(record) {
    var errors = [];
    if (!nonEmpty(record.aseguradoraId)) errors.push('aseguradoraId_faltante');
    if (!nonEmpty(record.bankName) && !nonEmpty(record.banco)) errors.push('banco_faltante');
    if (!nonEmpty(record.accountNumber) && !nonEmpty(record.numeroCuenta)) errors.push('numero_cuenta_faltante');
    return errors;
  }

  function validateDocumento(record) {
    var errors = [];
    if (!nonEmpty(record.aseguradoraId) && !nonEmpty(record.aliadoId)) errors.push('aseguradoraId_o_aliadoId_faltante');
    if (!nonEmpty(record.documentType) && !nonEmpty(record.tipoDocumento)) errors.push('tipo_documento_faltante');
    if (!nonEmpty(record.documentRef) && !nonEmpty(record.url) && !nonEmpty(record.fileRef)) errors.push('referencia_documento_faltante');
    return errors;
  }

  function validateRelation(record) {
    var errors = [];
    if (!nonEmpty(record.aliadoId)) errors.push('aliadoId_faltante');
    if (!nonEmpty(record.aseguradoraId)) errors.push('aseguradoraId_faltante');
    if (!nonEmpty(record.relationType)) errors.push('relationType_faltante');
    return errors;
  }

  function validateQuality(record) {
    var errors = [];
    if (!nonEmpty(record.entityId)) errors.push('entityId_faltante');
    if (!nonEmpty(record.issueCode)) errors.push('issueCode_faltante');
    if (!nonEmpty(record.status)) errors.push('status_faltante');
    return errors;
  }

  function validateAudit(record) {
    var errors = [];
    if (!nonEmpty(record.batchId)) errors.push('batchId_faltante');
    if (!nonEmpty(record.action)) errors.push('action_faltante');
    return errors;
  }

  function validateRecord(collection, record) {
    var errors = [];
    if (COLLECTIONS.indexOf(collection) < 0) return ['collection_no_permitida:' + collection];
    errors = errors.concat(validateCommon(record));

    if (collection === 'aseguradoras') errors = errors.concat(validateAseguradora(record));
    else if (collection === 'contactosAseguradora') errors = errors.concat(validateContacto(record));
    else if (collection === 'plataformasAseguradora') errors = errors.concat(validatePlataforma(record));
    else if (collection === 'cuentasBancariasAseguradora') errors = errors.concat(validateCuenta(record));
    else if (collection === 'documentosAseguradora') errors = errors.concat(validateDocumento(record));
    else if (collection === 'relacionesAseguradoraAliado') errors = errors.concat(validateRelation(record));
    else if (collection === 'calidadDatos') errors = errors.concat(validateQuality(record));
    else if (collection === 'auditoriaImportaciones') errors = errors.concat(validateAudit(record));

    return Array.from(new Set(errors));
  }

  function normalizeRecord(collection, record, defaults) {
    defaults = defaults || {};
    var out = Object.assign({}, clone(record) || {});
    out.tenantId = out.tenantId || defaults.tenantId || '';
    out.country = out.country || out.pais || defaults.country || '';
    out.currency = out.currency || out.moneda || defaults.currency || COUNTRY_CURRENCY[out.country] || '';
    delete out.pais;
    delete out.moneda;

    if (collection === 'aseguradoras') {
      out.entityType = 'aseguradora';
      out.aliases = Array.isArray(out.aliases) ? out.aliases.filter(nonEmpty) : [];
    }

    if (collection === 'plataformasAseguradora' && out.sensitiveSourceDetected === true) {
      out.credentialStatus = out.credentialStatus || 'backend_required';
    }

    out.validationStatus = out.validationStatus || 'pendiente';
    out.writeAllowed = false;
    return out;
  }

  function validateItem(item, defaults) {
    var errors = [];
    if (!plain(item)) return { ok: false, errors: ['item_invalido'], normalized: null };
    var collection = item.collection;
    var action = item.action || 'validate';
    if (COLLECTIONS.indexOf(collection) < 0) errors.push('collection_no_permitida:' + collection);
    if (ALLOWED_ACTIONS.indexOf(action) < 0) errors.push('action_no_permitida:' + action);

    var normalized = normalizeRecord(collection, item.record || item.data || {}, defaults);
    errors = errors.concat(validateRecord(collection, normalized));

    if (action === 'update' && !nonEmpty(item.id) && !nonEmpty(normalized.id)) errors.push('id_requerido_update');
    if (normalized.validationStatus === 'requiere_validacion' && action !== 'validate') {
      errors.push('accion_debe_ser_validate');
    }
    if (normalized.status === 'BLOQUEADO' && action !== 'omit' && action !== 'validate') {
      errors.push('registro_bloqueado_no_escribible');
    }

    return {
      ok: errors.length === 0,
      errors: Array.from(new Set(errors)),
      normalized: normalized,
      collection: collection,
      action: action,
      id: item.id || normalized.id || null
    };
  }

  function buildDryRun(input) {
    input = input || {};
    var defaults = {
      tenantId: input.tenantId || '',
      country: input.country || '',
      currency: input.currency || ''
    };
    var items = Array.isArray(input.items) ? input.items : [];
    var results = items.map(function (item, index) {
      var result = validateItem(item, defaults);
      result.index = index;
      return result;
    });

    var summary = { create: 0, update: 0, omit: 0, validate: 0, invalid: 0 };
    results.forEach(function (result) {
      if (!result.ok) summary.invalid += 1;
      if (Object.prototype.hasOwnProperty.call(summary, result.action)) summary[result.action] += 1;
    });

    return {
      schemaVersion: 'orbit360.insurer-directory-dry-run.v1',
      batchId: input.batchId || '',
      tenantId: defaults.tenantId,
      sourceType: input.sourceType || 'configuracion_catalogo_aseguradoras',
      mode: 'dry_run_only',
      writeAllowed: false,
      hasBlockingErrors: results.some(function (result) { return !result.ok; }),
      summary: summary,
      results: results
    };
  }

  window.Orbit.importaDirectorioAseguradorasP0 = Object.freeze({
    COLLECTIONS: COLLECTIONS,
    COUNTRY_CURRENCY: COUNTRY_CURRENCY,
    ENTITY_TYPES: ENTITY_TYPES,
    ALLOWED_ACTIONS: ALLOWED_ACTIONS,
    FORBIDDEN_SECRET_KEYS: FORBIDDEN_SECRET_KEYS,
    hasForbiddenSecret: hasForbiddenSecret,
    validateTrace: validateTrace,
    validateCountryCurrency: validateCountryCurrency,
    validateRecord: validateRecord,
    validateItem: validateItem,
    normalizeRecord: normalizeRecord,
    buildDryRun: buildDryRun
  });
})();
