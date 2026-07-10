/* ============================================================
   Orbit 360 · Contrato documental P0.4
   Fecha: 2026-07-10

   Contrato puro y reusable para fuentes documentales. No conserva bytes,
   base64, secretos ni valores de clientes; no escribe en Orbit.store.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var BLOCKED_KEYS = [
    'bytes', 'bytearray', 'arraybuffer', 'buffer', 'binary', 'blob', 'base64',
    'filecontent', 'rawcontent', 'contentbytes', 'password', 'pass', 'contrasena',
    'secret', 'token', 'credentialvalue', 'credentials', 'apikey', 'api_key', 'authorization'
  ];
  var SAFE_REFERENCE_KEYS = ['credentialref', 'secretref', 'fileref', 'documentref', 'archivoref', 'accountref'];
  var COUNTRY_CURRENCY = { GT: 'GTQ', CO: 'COP' };

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function normalizeCountry(value) {
    var n = norm(value);
    if (n === 'gt' || n === 'guatemala' || n === 'guate') return 'GT';
    if (n === 'co' || n === 'colombia') return 'CO';
    return clean(value).toUpperCase();
  }
  function defaultCurrency(country) { return COUNTRY_CURRENCY[normalizeCountry(country)] || ''; }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function stableId(prefix, parts) {
    var text = (parts || []).map(norm).join('|'), hash = 0;
    for (var i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return prefix + '_' + Math.abs(hash).toString(36);
  }
  function blockedKey(key) {
    var n = norm(key).replace(/_/g, '');
    if (SAFE_REFERENCE_KEYS.some(function (safe) { return n === safe; })) return false;
    return BLOCKED_KEYS.some(function (item) { return n.indexOf(item.replace(/_/g, '')) >= 0; });
  }
  function redactSample(value) {
    var text = clean(value);
    if (!text) return '';
    if (/^data:/i.test(text) || text.length > 500) return '[contenido_omitido]';
    text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo_oculto]');
    text = text.replace(/\+?\d[\d\s().-]{7,}\d/g, '[numero_oculto]');
    return text;
  }
  function sanitize(value, options, depth) {
    options = options || {};
    depth = depth || 0;
    if (depth > 6 || value == null) return value == null ? null : '[profundidad_omitida]';
    if (Array.isArray(value)) return value.slice(0, options.maxArray || 100).map(function (item) { return sanitize(item, options, depth + 1); });
    if (typeof value === 'object') {
      var out = {};
      Object.keys(value).forEach(function (key) {
        if (blockedKey(key)) return;
        var item = value[key];
        if (typeof item === 'function' || typeof item === 'undefined') return;
        out[key] = sanitize(item, options, depth + 1);
      });
      return out;
    }
    if (typeof value === 'string' && options.redactSamples) return redactSample(value);
    if (['string', 'number', 'boolean'].indexOf(typeof value) >= 0) return value;
    return clean(value);
  }
  function extension(name) {
    var parts = clean(name).toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
  }

  function createEnvelope(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var file = input.file || {};
    var name = clean(file.name || input.sourceFileName || input.nombreArchivo);
    var country = normalizeCountry(input.pais || input.country || ctx.pais || ctx.country);
    var currency = clean(input.moneda || input.currency || ctx.moneda || ctx.currency || defaultCurrency(country)).toUpperCase();
    var entityId = clean(input.aseguradoraId || input.entityId || ctx.aseguradoraId || ctx.entityId);
    var hash = clean(file.hash || input.sourceHash || input.hash);
    return {
      id: clean(input.id) || stableId('docsrc', [entityId, name, hash, input.version || 'v1']),
      tenantId: clean(input.tenantId || ctx.tenantId),
      entityType: clean(input.entityType || ctx.entityType || 'aseguradora'),
      entityId: entityId,
      aseguradoraId: entityId,
      mediaKind: clean(input.mediaKind || 'spreadsheet'),
      sourceType: clean(input.sourceType || input.tipoFuente || 'otro'),
      file: {
        name: name,
        extension: clean(file.extension || extension(name)),
        mimeType: clean(file.mimeType || input.mimeType),
        sizeBytes: Number(file.sizeBytes || input.sizeBytes || 0),
        hash: hash,
        fileRef: clean(file.fileRef || input.fileRef || input.archivoRef || input.documentRef),
        containsBytes: false,
        containsBase64: false
      },
      pais: country,
      moneda: currency,
      dimensiones: sanitize(input.dimensiones || ctx.dimensiones || {}, {}, 0),
      version: {
        label: clean(input.version || 'v1'),
        previousDocumentId: clean(input.previousDocumentId),
        previousHash: clean(input.previousHash),
        status: clean(input.versionStatus || 'propuesta')
      },
      adapter: {
        type: clean(input.adapterType || 'document_source'),
        version: clean(input.adapterVersion || 'p04')
      },
      estado: clean(input.estado || 'inventario_fuente'),
      writeAllowed: false,
      requiresHumanValidation: true,
      trace: sanitize(input.trace || input.trazabilidad || {}, {}, 0),
      flags: {
        containsSecrets: false,
        containsAccessToken: false,
        containsCustomerPayload: false,
        macrosExecuted: false,
        formulasExecuted: false
      }
    };
  }

  function validateEnvelope(envelope) {
    envelope = envelope || {};
    var errors = [], warnings = [];
    if (!envelope.tenantId) errors.push('TENANT_REQUERIDO');
    if (!envelope.entityId) errors.push('ENTIDAD_REQUERIDA');
    if (!envelope.file || !envelope.file.name) errors.push('ARCHIVO_REQUERIDO');
    if (!envelope.file || (!envelope.file.fileRef && !envelope.file.hash)) warnings.push('REFERENCIA_O_HASH_REQUERIDO');
    if (!envelope.pais) errors.push('PAIS_REQUIERE_VALIDACION');
    if (!envelope.moneda) errors.push('MONEDA_REQUIERE_VALIDACION');
    if (envelope.file && !['xls', 'xlsx', 'xlsm', 'xlsb', 'csv', 'pdf', 'png', 'jpg', 'jpeg'].includes(envelope.file.extension)) warnings.push('EXTENSION_NO_CLASIFICADA');
    return { valid: errors.length === 0, errors: errors, warnings: warnings };
  }

  function buildVersionProposal(current, previous) {
    current = current || {};
    previous = previous || null;
    var sameHash = !!(previous && current.file && previous.file && current.file.hash && current.file.hash === previous.file.hash);
    return {
      action: sameHash ? 'omit_same_version' : (previous ? 'new_version_proposed' : 'create_version_proposed'),
      currentDocumentId: clean(current.id),
      previousDocumentId: clean(previous && previous.id),
      currentHash: clean(current.file && current.file.hash),
      previousHash: clean(previous && previous.file && previous.file.hash),
      sameHash: sameHash,
      replaceAllowed: false,
      requiresHumanConfirmation: !sameHash
    };
  }

  function buildAuditEvent(input) {
    input = input || {};
    return {
      id: clean(input.id) || stableId('audit_doc', [input.documentId, input.action, new Date().toISOString()]),
      fecha: clean(input.fecha) || new Date().toISOString(),
      tenantId: clean(input.tenantId),
      modulo: clean(input.modulo || 'aseguradoras'),
      categoria: 'fuente_documental',
      accion: clean(input.action || input.accion || 'inventariar_fuente'),
      documentId: clean(input.documentId),
      entityId: clean(input.entityId),
      actorId: clean(input.actorId),
      rolActivo: clean(input.rolActivo),
      resultado: clean(input.resultado || 'propuesto'),
      motivo: clean(input.motivo),
      metadata: sanitize(input.metadata || {}, { redactSamples: true }, 0),
      containsBytes: false,
      containsBase64: false,
      containsSecrets: false,
      containsCustomerPayload: false
    };
  }

  function buildDiff(before, after, keys) {
    before = before || {};
    after = after || {};
    var fields = keys && keys.length ? keys : unique(Object.keys(before).concat(Object.keys(after)));
    return fields.filter(function (key) { return !blockedKey(key); }).reduce(function (out, key) {
      var left = sanitize(before[key], { redactSamples: true }, 0);
      var right = sanitize(after[key], { redactSamples: true }, 0);
      if (JSON.stringify(left) !== JSON.stringify(right)) out.push({ field: key, before: left, after: right, status: 'requires_validation' });
      return out;
    }, []);
  }

  window.Orbit.documentSourceContractP04 = {
    normalizeCountry: normalizeCountry,
    defaultCurrency: defaultCurrency,
    sanitize: sanitize,
    redactSample: redactSample,
    createEnvelope: createEnvelope,
    validateEnvelope: validateEnvelope,
    buildVersionProposal: buildVersionProposal,
    buildAuditEvent: buildAuditEvent,
    buildDiff: buildDiff
  };
})();