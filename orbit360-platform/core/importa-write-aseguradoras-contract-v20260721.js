/* ============================================================
   Orbit 360 · Contrato P0 de escritura de Aseguradoras · 20260721
   -----------------------------------------------------------------
   Extiende el escritor genérico únicamente para la fuente
   directorio_aseguradoras y mantiene el acceso fail-closed.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var W = Orbit.importaWriteP0;
  var VERSION = '20260721.1';
  var SOURCE = 'directorio_aseguradoras';
  var REF_KEYS = new Set(['password','pass','contrasena','usuario','user','numero','accountNumber']);

  if (!W || typeof W.writeBatch !== 'function' || W.__aseguradorasWriteContractV20260721) return;

  function clean(value) { return String(value == null ? '' : value).trim(); }

  function safePlaceholder(value) {
    var text = clean(value);
    return !text || text === 'backend_required' || /^[*•●xX\s-]+$/.test(text);
  }

  function hasPlaintextSensitive(data) {
    var found = false;
    function walk(value) {
      if (found || value == null) return;
      if (Array.isArray(value)) { value.forEach(walk); return; }
      if (typeof value !== 'object') return;
      Object.keys(value).forEach(function (key) {
        if (found) return;
        var child = value[key];
        if (REF_KEYS.has(key) && !safePlaceholder(child)) { found = true; return; }
        walk(child);
      });
    }
    walk(data || {});
    return found;
  }

  function validateInsurerOperation(op, batch) {
    var errors = [];
    var data = op && (op.data || op.record) || {};
    var trace = data.fuenteDirectorio || {};
    if (!op || op.collection !== 'aseguradoras') errors.push('collection_no_aseguradoras');
    if (!batch || batch.sourceType !== SOURCE) errors.push('sourceType_no_autorizado');
    if (!clean(batch && batch.sourceFileName)) errors.push('sourceFileName_faltante');
    if (!clean(trace.archivo) || !clean(trace.hoja)) errors.push('trazabilidad_archivo_hoja_faltante');
    if (!['GT','CO'].includes(clean(trace.pais))) errors.push('trazabilidad_pais_invalida');
    if (clean(trace.tipo) !== SOURCE) errors.push('trazabilidad_tipo_invalida');
    if (data.requiereValidacion === true) errors.push('registro_requiere_validacion');
    if (data.validationStatus !== 'validado') errors.push('validationStatus_no_validado');
    if (hasPlaintextSensitive(data)) errors.push('plaintext_sensitive_detected');
    if (!clean(data.nombre)) errors.push('nombre_faltante');
    return errors;
  }

  function validateInsurerBatch(batch) {
    var operations = [].concat(batch && batch.operations || []);
    var insurerOps = operations.filter(function (op) { return op && op.collection === 'aseguradoras'; });
    if (!insurerOps.length) return { applicable: false, errors: [] };
    var errors = [];
    if (insurerOps.length !== operations.length) errors.push('mixed_collection_batch_not_allowed');
    insurerOps.forEach(function (op, index) {
      validateInsurerOperation(op, batch).forEach(function (code) { errors.push('op_' + index + ':' + code); });
    });
    return { applicable: true, errors: errors };
  }

  if (Array.isArray(W.ALLOWED_COLLECTIONS) && !W.ALLOWED_COLLECTIONS.includes('aseguradoras')) {
    W.ALLOWED_COLLECTIONS.push('aseguradoras');
  }

  var originalWriteBatch = W.writeBatch.bind(W);
  W.writeBatch = function (batch, confirmation) {
    var validation = validateInsurerBatch(batch);
    if (validation.applicable && validation.errors.length) {
      return { ok: false, written: 0, errors: validation.errors, rollback: [], auditIds: [] };
    }
    return originalWriteBatch(batch, confirmation);
  };

  W.validateInsurerBatch = validateInsurerBatch;
  W.validateInsurerOperation = validateInsurerOperation;
  W.__aseguradorasWriteContractV20260721 = {
    version: VERSION,
    sourceType: SOURCE,
    failClosed: true,
    forbidsMixedCollections: true,
    forbidsPlaintextSensitive: true,
    originalWriteBatch: originalWriteBatch
  };
})();
