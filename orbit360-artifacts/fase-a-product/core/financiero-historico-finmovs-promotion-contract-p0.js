/* ============================================================
   Orbit 360 · Contrato P0 promoción financiero_historico → finmovs
   Fecha: 2026-07-13

   Capa pura y aditiva. Propone promociones; nunca escribe.
   Requiere movimiento realizado, fecha exacta, país/moneda válidos,
   trazabilidad completa y ausencia de duplicado.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-20260713';
  var SOURCE_COLLECTION = 'financiero_historico';
  var TARGET_COLLECTION = 'finmovs';
  var COUNTRY_CURRENCY = Object.freeze({ GT: 'GTQ', CO: 'COP' });
  var ELIGIBLE_STATUSES = Object.freeze(['REALIZADO']);
  var ELIGIBLE_CANDIDATES = Object.freeze([
    'LISTO_FINMOVS',
    'LISTO_FINMOVS_NATURE_FINANCING'
  ]);
  var BLOCKED_NATURES = Object.freeze(['opening_balance']);
  var NEVER_CREATE = Object.freeze(['clientes', 'polizas', 'carteraPrimas', 'cobros']);

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isoDate(value) {
    var raw = text(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
    var parsed = new Date(raw + 'T00:00:00Z');
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10) === raw ? raw : '';
  }

  function dateFromPeriodAndDay(periodo, day) {
    var p = text(periodo);
    var d = Number(day);
    if (!/^\d{4}-\d{2}$/.test(p) || !Number.isInteger(d) || d < 1 || d > 31) return '';
    return isoDate(p + '-' + String(d).padStart(2, '0'));
  }

  function resolvedDate(row) {
    return isoDate(row && (row.fecha || row.fechaMovimiento || row.fechaFuente)) ||
      dateFromPeriodAndDay(row && row.periodo, row && row.diaFuente);
  }

  function sourceId(row) {
    return text(row && (row.id || row.idDryRun || row.sourceRecordId));
  }

  function traceComplete(row) {
    return !!(
      row && sourceId(row) && row.tenantId && row.sourceFile && row.sourceSheet &&
      row.sourceRow && row.sourceBlock && row.traceHash
    );
  }

  function fnv1a(input) {
    var hash = 2166136261;
    var str = String(input || '');
    for (var i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function fingerprint(row) {
    var date = resolvedDate(row);
    return 'finmov_' + fnv1a([
      text(row && row.tenantId),
      text(row && row.pais),
      text(row && row.moneda),
      date,
      text(row && row.direccion),
      text(row && row.categoriaCanonica),
      text(row && row.contraparteRef),
      String(row && row.montoCajaEstimado != null ? row.montoCajaEstimado : row && row.montoFuente),
      sourceId(row),
      text(row && row.traceHash)
    ].join('|'));
  }

  function validate(row) {
    var errors = [];
    var warnings = [];
    var pais = text(row && row.pais).toUpperCase();
    var moneda = text(row && row.moneda).toUpperCase();
    var status = text(row && row.estadoFuente).toUpperCase();
    var candidate = text(row && row.candidatoFinmovs).toUpperCase();
    var nature = text(row && row.nature) || 'operating';
    var amount = row && finiteNumber(row.montoCajaEstimado) ? row.montoCajaEstimado : row && row.montoFuente;
    var date = resolvedDate(row || {});

    if (!row || typeof row !== 'object') return { ok: false, errors: ['fila_invalida'], warnings: [], fecha: '' };
    if (!row.tenantId) errors.push('tenant_faltante');
    if (!sourceId(row)) errors.push('source_id_faltante');
    if (!COUNTRY_CURRENCY[pais]) errors.push('pais_no_soportado');
    if (COUNTRY_CURRENCY[pais] && moneda !== COUNTRY_CURRENCY[pais]) errors.push('moneda_no_corresponde_pais');
    if (ELIGIBLE_STATUSES.indexOf(status) < 0) errors.push('estado_no_realizado');
    if (ELIGIBLE_CANDIDATES.indexOf(candidate) < 0) errors.push('candidato_no_elegible');
    if (!date) errors.push('fecha_exacta_requerida');
    if (!finiteNumber(amount) || amount === 0) errors.push('monto_caja_invalido');
    if (['ingreso', 'egreso'].indexOf(text(row.direccion)) < 0) errors.push('direccion_invalida');
    if (BLOCKED_NATURES.indexOf(nature) >= 0) errors.push('saldo_apertura_no_promovible');
    if (!traceComplete(row)) errors.push('trazabilidad_incompleta');
    if (row.esCobro === true || row.esCobro === 'SI') errors.push('no_promover_como_cobro');
    if (row.esCartera === true || row.esCartera === 'SI') errors.push('no_promover_como_cartera');
    if (row.esPoliza === true || row.esPoliza === 'SI') errors.push('no_promover_como_poliza');
    if (row.esCliente === true || row.esCliente === 'SI') errors.push('no_promover_como_cliente');
    if (row.isPremiumCollection === true) errors.push('comision_no_es_recaudo_prima');

    if (nature === 'financing') warnings.push('naturaleza_financing_preservada');
    if (!row.contraparteRef) warnings.push('contraparte_requiere_validacion');

    return { ok: errors.length === 0, errors: errors, warnings: warnings, fecha: date };
  }

  function targetRecord(row, check) {
    var amount = finiteNumber(row.montoCajaEstimado) ? row.montoCajaEstimado : row.montoFuente;
    var id = fingerprint(row);
    var source = sourceId(row);

    return {
      id: id,
      tenantId: row.tenantId,
      pais: text(row.pais).toUpperCase(),
      moneda: text(row.moneda).toUpperCase(),
      fecha: check.fecha,
      periodo: row.periodo || check.fecha.slice(0, 7),
      direccion: row.direccion,
      categoria: row.categoriaCanonica || 'otro',
      contraparteRef: row.contraparteRef || '',
      contraparteTipo: row.contraparteTipo || 'REQUIERE_VALIDACION',
      monto: amount,
      iva: finiteNumber(row.ivaFuente) ? row.ivaFuente : 0,
      retencion: finiteNumber(row.isrRetenidoFuente) ? row.isrRetenidoFuente : 0,
      nature: row.nature === 'financing' ? 'financing' : 'operating',
      isOperatingIncome: row.nature === 'financing' ? false : row.isOperatingIncome === true,
      isPremiumCollection: false,
      sourceCollection: SOURCE_COLLECTION,
      sourceRecordId: source,
      sourceTraceHash: row.traceHash,
      importBatchId: row.importBatchId || '',
      promotionStatus: 'propuesta',
      validationStatus: 'dry_run'
    };
  }

  function existingIndex(rows) {
    var index = Object.create(null);
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      var id = text(row && row.id);
      var source = text(row && row.sourceRecordId);
      var trace = text(row && row.sourceTraceHash);
      if (id) index['id:' + id] = true;
      if (source) index['source:' + source] = true;
      if (trace) index['trace:' + trace] = true;
    });
    return index;
  }

  function duplicateReason(target, index) {
    if (index['id:' + target.id]) return 'duplicado_id';
    if (index['source:' + target.sourceRecordId]) return 'duplicado_source_record';
    if (index['trace:' + target.sourceTraceHash]) return 'duplicado_trace_hash';
    return '';
  }

  function propose(rows, existingFinmovs) {
    var index = existingIndex(existingFinmovs);
    var result = {
      ok: true,
      version: VERSION,
      sourceCollection: SOURCE_COLLECTION,
      targetCollection: TARGET_COLLECTION,
      writeAuthorized: false,
      neverCreate: NEVER_CREATE.slice(),
      counts: { total: 0, create: 0, omit: 0, requiresValidation: 0 },
      operations: []
    };

    (Array.isArray(rows) ? rows : []).forEach(function (row, position) {
      var check = validate(row);
      result.counts.total += 1;

      if (!check.ok) {
        result.counts.requiresValidation += 1;
        result.ok = false;
        result.operations.push({
          position: position,
          action: 'requires_validation',
          sourceRecordId: sourceId(row),
          errors: check.errors.slice(),
          warnings: check.warnings.slice()
        });
        return;
      }

      var target = targetRecord(row, check);
      var duplicate = duplicateReason(target, index);
      if (duplicate) {
        result.counts.omit += 1;
        result.operations.push({
          position: position,
          action: 'omit',
          reason: duplicate,
          sourceRecordId: target.sourceRecordId,
          targetId: target.id
        });
        return;
      }

      result.counts.create += 1;
      result.operations.push({
        position: position,
        action: 'create',
        collection: TARGET_COLLECTION,
        sourceRecordId: target.sourceRecordId,
        targetId: target.id,
        record: target,
        warnings: check.warnings.slice()
      });
      index['id:' + target.id] = true;
      index['source:' + target.sourceRecordId] = true;
      index['trace:' + target.sourceTraceHash] = true;
    });

    return result;
  }

  window.Orbit.financieroHistoricoFinmovsPromotionP0 = Object.freeze({
    VERSION: VERSION,
    SOURCE_COLLECTION: SOURCE_COLLECTION,
    TARGET_COLLECTION: TARGET_COLLECTION,
    COUNTRY_CURRENCY: COUNTRY_CURRENCY,
    ELIGIBLE_STATUSES: ELIGIBLE_STATUSES,
    ELIGIBLE_CANDIDATES: ELIGIBLE_CANDIDATES,
    NEVER_CREATE: NEVER_CREATE,
    resolvedDate: resolvedDate,
    fingerprint: fingerprint,
    validate: validate,
    targetRecord: targetRecord,
    propose: propose
  });
})();
