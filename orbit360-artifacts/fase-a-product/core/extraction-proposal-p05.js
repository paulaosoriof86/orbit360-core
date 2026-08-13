/* ============================================================
   Orbit 360 · P0.5 · Propuestas semánticas y diff documental
   Fecha: 2026-07-10

   Contrato puro/reusable. Normaliza hechos extraídos con evidencia,
   detecta conflictos y construye decisiones humanas. No escribe ni habilita.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var CONCEPTS = [
    'tasa', 'factor', 'rango', 'prima_minima', 'prima_neta', 'prima_total',
    'recargo_fraccionamiento', 'gasto_emision', 'gasto_expedicion', 'iva',
    'impuesto', 'numero_cuotas', 'cuota', 'plazo', 'forma_pago', 'visa_cuotas',
    'asistencia', 'catalogo', 'tipo_vehiculo', 'uso_vehiculo', 'edad', 'sexo',
    'maternidad', 'cobertura', 'limite', 'deducible', 'beneficio', 'exclusion',
    'condicion', 'regla_calculo', 'seccion_presentacion', 'otro'
  ];
  var STATUSES = [
    'propuesto', 'requiere_validacion', 'conflicto', 'confirmado',
    'corregido', 'rechazado', 'sin_evidencia', 'reemplazado_por_version'
  ];

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function stableId(prefix, parts) {
    var text = (parts || []).map(norm).join('|'), hash = 0;
    for (var i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return prefix + '_' + Math.abs(hash).toString(36);
  }
  function sanitize(value) {
    var C = Orbit.documentSourceContractP04;
    return C && typeof C.sanitize === 'function' ? C.sanitize(value, { redactSamples: true }, 0) : clone(value || {});
  }
  function dimensions(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var d = input.dimensiones || input.dimensions || {};
    var fallback = ctx.dimensiones || ctx.dimensions || {};
    return {
      pais: clean(input.pais || d.pais || ctx.pais || fallback.pais).toUpperCase(),
      moneda: clean(input.moneda || d.moneda || ctx.moneda || fallback.moneda).toUpperCase(),
      ramo: clean(input.ramo || d.ramo || ctx.ramo || fallback.ramo),
      producto: clean(input.producto || d.producto || ctx.producto || fallback.producto),
      familiaProducto: clean(input.familiaProducto || d.familiaProducto || d.familia || ctx.familiaProducto || fallback.familiaProducto),
      subtipoProducto: clean(input.subtipoProducto || d.subtipoProducto || d.subtipo || ctx.subtipoProducto || fallback.subtipoProducto),
      segmento: clean(input.segmento || d.segmento || ctx.segmento || fallback.segmento),
      tipoRiesgo: clean(input.tipoRiesgo || d.tipoRiesgo || ctx.tipoRiesgo || fallback.tipoRiesgo),
      tipoVehiculo: clean(input.tipoVehiculo || d.tipoVehiculo || ctx.tipoVehiculo || fallback.tipoVehiculo),
      usoVehiculo: clean(input.usoVehiculo || d.usoVehiculo || ctx.usoVehiculo || fallback.usoVehiculo),
      plan: clean(input.plan || d.plan || ctx.plan || fallback.plan)
    };
  }
  function qualifiers(input) {
    input = input || {};
    var source = input.calificadores || input.qualifiers || {};
    var out = {};
    Object.keys(source).sort().forEach(function (key) {
      var value = source[key];
      if (value == null || value === '') return;
      if (['string', 'number', 'boolean'].indexOf(typeof value) >= 0) out[norm(key) || key] = value;
    });
    return out;
  }
  function normalizeEvidence(input) {
    input = input || {};
    var media = clean(input.mediaKind || input.tipo || 'spreadsheet');
    return {
      mediaKind: media,
      documentId: clean(input.documentId || input.documentoFuenteId),
      fileRef: clean(input.fileRef || input.archivoRef),
      sheet: clean(input.sheet || input.hoja),
      range: clean(input.range || input.rango),
      formulaRef: clean(input.formulaRef || input.formula),
      page: Number(input.page || input.pagina || 0),
      block: clean(input.block || input.bloque),
      parserMethod: clean(input.parserMethod || input.metodo || 'deterministic'),
      evidenceHash: clean(input.evidenceHash || input.hashEvidencia),
      excerpt: clean(input.excerpt || input.extracto) ? '[extracto_sanitizado_disponible]' : '',
      containsRawPayload: false,
      containsCustomerPayload: false
    };
  }
  function evidenceValid(evidence) {
    if (!evidence || !evidence.documentId) return false;
    if (evidence.mediaKind === 'spreadsheet') return !!(evidence.sheet && evidence.range);
    if (evidence.mediaKind === 'pdf' || evidence.mediaKind === 'image') return !!(evidence.page || evidence.block);
    return !!(evidence.sheet || evidence.range || evidence.page || evidence.block);
  }
  function proposalKey(input, ctx) {
    var d = dimensions(input, ctx);
    var q = qualifiers(input);
    return [
      clean(input.aseguradoraId || ctx && ctx.aseguradoraId), d.pais, d.ramo, d.producto,
      d.familiaProducto, d.subtipoProducto, d.segmento, d.tipoRiesgo,
      d.tipoVehiculo, d.usoVehiculo, d.plan, clean(input.concepto || input.concept),
      clean(input.nombre || input.name), JSON.stringify(q)
    ].map(norm).join('|');
  }
  function normalizeProposal(input, ctx, index) {
    input = input || {};
    ctx = ctx || {};
    var concept = clean(input.concepto || input.concept || 'otro');
    if (CONCEPTS.indexOf(concept) < 0) concept = 'otro';
    var d = dimensions(input, ctx);
    var evidence = normalizeEvidence(Object.assign({}, input.evidencia || input.evidence || {}, {
      documentId: input.documentoFuenteId || input.documentId || ctx.documentId,
      fileRef: input.archivoRef || input.fileRef || ctx.fileRef,
      mediaKind: input.mediaKind || ctx.mediaKind
    }));
    var key = proposalKey(Object.assign({}, input, { concepto: concept, dimensiones: d }), ctx);
    var status = clean(input.estado || input.status || 'propuesto');
    if (STATUSES.indexOf(status) < 0) status = 'propuesto';
    return {
      id: clean(input.id) || stableId('extract', [ctx.documentId, key, index || 0]),
      tenantId: clean(input.tenantId || ctx.tenantId),
      aseguradoraId: clean(input.aseguradoraId || ctx.aseguradoraId),
      documentoFuenteId: clean(input.documentoFuenteId || input.documentId || ctx.documentId),
      versionFuente: clean(input.versionFuente || input.sourceVersion || ctx.versionFuente || 'v1'),
      clave: key,
      concepto: concept,
      nombre: clean(input.nombre || input.name || concept),
      dimensiones: d,
      calificadores: qualifiers(input),
      valor: sanitize(input.valor != null ? input.valor : input.value),
      valorTipo: clean(input.valorTipo || input.valueType || typeof (input.valor != null ? input.valor : input.value)),
      unidad: clean(input.unidad || input.unit),
      moneda: clean(input.moneda || d.moneda).toUpperCase(),
      vigenciaDesde: clean(input.vigenciaDesde),
      vigenciaHasta: clean(input.vigenciaHasta),
      confianza: Math.max(0, Math.min(100, Number(input.confianza || input.confidence || 0))),
      evidencia: evidence,
      estado: evidenceValid(evidence) ? status : 'sin_evidencia',
      requiereValidacion: true,
      aprobado: false,
      observaciones: clean(input.observaciones || input.notes),
      createdAt: clean(input.createdAt) || new Date().toISOString()
    };
  }
  function validateProposal(proposal) {
    proposal = proposal || {};
    var errors = [], warnings = [];
    if (!proposal.tenantId) errors.push('TENANT_REQUERIDO');
    if (!proposal.aseguradoraId) errors.push('ASEGURADORA_REQUERIDA');
    if (!proposal.documentoFuenteId) errors.push('DOCUMENTO_REQUERIDO');
    if (!proposal.dimensiones || !proposal.dimensiones.pais) errors.push('PAIS_REQUIERE_VALIDACION');
    if (!proposal.dimensiones || !proposal.dimensiones.producto) warnings.push('PRODUCTO_REQUIERE_VALIDACION');
    if (!proposal.concepto) errors.push('CONCEPTO_REQUERIDO');
    if (!evidenceValid(proposal.evidencia)) errors.push('EVIDENCIA_REQUERIDA');
    if (proposal.confianza < 60) warnings.push('CONFIANZA_BAJA');
    if (proposal.valor == null || proposal.valor === '') warnings.push('VALOR_VACIO');
    return { valid: errors.length === 0, errors: errors, warnings: warnings };
  }
  function valuesEqual(a, b) {
    return JSON.stringify(sanitize(a)) === JSON.stringify(sanitize(b));
  }
  function detectConflicts(proposals) {
    var grouped = {};
    (proposals || []).forEach(function (proposal) {
      grouped[proposal.clave] = grouped[proposal.clave] || [];
      grouped[proposal.clave].push(proposal);
    });
    return Object.keys(grouped).filter(function (key) {
      var values = unique(grouped[key].map(function (item) { return JSON.stringify(sanitize(item.valor)); }));
      return values.length > 1;
    }).map(function (key) {
      return {
        clave: key,
        proposalIds: grouped[key].map(function (item) { return item.id; }),
        values: grouped[key].map(function (item) { return sanitize(item.valor); }),
        status: 'conflicto',
        requiresHumanDecision: true
      };
    });
  }
  function normalizeCurrent(item) {
    item = item || {};
    return {
      id: clean(item.id),
      clave: clean(item.clave || item.key),
      valor: sanitize(item.valor != null ? item.valor : item.value),
      versionFuente: clean(item.versionFuente || item.sourceVersion),
      estado: clean(item.estado || item.status),
      raw: sanitize(item)
    };
  }
  function buildDiff(currentItems, proposals) {
    var currentMap = {};
    (currentItems || []).map(normalizeCurrent).forEach(function (item) { if (item.clave) currentMap[item.clave] = item; });
    var normalized = (proposals || []).map(function (item, index) {
      return item && item.clave ? item : normalizeProposal(item, {}, index);
    });
    var conflicts = detectConflicts(normalized);
    var conflictKeys = new Set(conflicts.map(function (item) { return item.clave; }));
    var rows = normalized.map(function (proposal) {
      var before = currentMap[proposal.clave] || null;
      var validation = validateProposal(proposal);
      var action = 'create_proposed';
      if (conflictKeys.has(proposal.clave)) action = 'conflict_requires_validation';
      else if (!validation.valid) action = 'invalid_requires_validation';
      else if (before && valuesEqual(before.valor, proposal.valor)) action = 'omit_same_value';
      else if (before) action = 'update_proposed';
      return {
        id: 'diff_' + proposal.id,
        clave: proposal.clave,
        action: action,
        before: before ? before.raw : null,
        after: proposal,
        validation: validation,
        requiresHumanDecision: action !== 'omit_same_value',
        writeAllowed: false
      };
    });
    return {
      rows: rows,
      conflicts: conflicts,
      summary: {
        total: rows.length,
        createProposed: rows.filter(function (row) { return row.action === 'create_proposed'; }).length,
        updateProposed: rows.filter(function (row) { return row.action === 'update_proposed'; }).length,
        omitSameValue: rows.filter(function (row) { return row.action === 'omit_same_value'; }).length,
        invalid: rows.filter(function (row) { return row.action === 'invalid_requires_validation'; }).length,
        conflicts: conflicts.length
      },
      writeAllowed: false,
      approved: false,
      requiresHumanValidation: true
    };
  }
  function decisionMap(decisions) {
    var map = {};
    (decisions || []).forEach(function (item) { if (item && item.proposalId) map[item.proposalId] = item; });
    return map;
  }
  function buildConfirmedKnowledgePlan(diff, decisions, ctx) {
    ctx = ctx || {};
    var map = decisionMap(decisions);
    var errors = [], records = [], audit = [];
    (diff && diff.rows || []).forEach(function (row) {
      if (row.action === 'omit_same_value') return;
      var proposal = row.after;
      var decision = map[proposal.id];
      if (!decision) { errors.push({ proposalId: proposal.id, code: 'DECISION_REQUERIDA' }); return; }
      var action = clean(decision.action || decision.accion);
      var reason = clean(decision.reason || decision.motivo);
      if (!reason) { errors.push({ proposalId: proposal.id, code: 'MOTIVO_REQUERIDO' }); return; }
      if (action === 'reject') {
        audit.push({ proposalId: proposal.id, action: 'rechazar_propuesta', motivo: reason, containsRawPayload: false });
        return;
      }
      if (action !== 'confirm' && action !== 'correct') {
        errors.push({ proposalId: proposal.id, code: 'ACCION_INVALIDA' });
        return;
      }
      var value = action === 'correct' ? sanitize(decision.value) : proposal.valor;
      records.push({
        id: clean(decision.recordId) || stableId('knowledge', [proposal.clave, proposal.versionFuente, value]),
        tenantId: proposal.tenantId,
        aseguradoraId: proposal.aseguradoraId,
        clave: proposal.clave,
        concepto: proposal.concepto,
        nombre: proposal.nombre,
        dimensiones: clone(proposal.dimensiones),
        calificadores: clone(proposal.calificadores),
        valor: value,
        valorTipo: proposal.valorTipo,
        unidad: proposal.unidad,
        moneda: proposal.moneda,
        documentoFuenteId: proposal.documentoFuenteId,
        versionFuente: proposal.versionFuente,
        evidencia: clone(proposal.evidencia),
        confianzaOriginal: proposal.confianza,
        estado: 'validado_pendiente_habilitacion',
        habilitadoCotizador: false,
        habilitadoComparativo: false,
        decision: action === 'correct' ? 'corregido' : 'confirmado',
        motivo: reason,
        actorId: clean(ctx.actorId),
        rolActivo: clean(ctx.rolActivo),
        confirmedAt: clean(ctx.confirmedAt) || new Date().toISOString()
      });
      audit.push({ proposalId: proposal.id, action: action === 'correct' ? 'corregir_propuesta' : 'confirmar_propuesta', motivo: reason, containsRawPayload: false });
    });
    var groupedRecords = {};
    records.forEach(function (record) {
      groupedRecords[record.clave] = groupedRecords[record.clave] || [];
      groupedRecords[record.clave].push(record);
    });
    Object.keys(groupedRecords).forEach(function (key) {
      var values = unique(groupedRecords[key].map(function (record) { return JSON.stringify(sanitize(record.valor)); }));
      if (values.length > 1) errors.push({ clave: key, code: 'CONFLICTO_NO_RESUELTO' });
    });
    if (errors.length) records = [];
    return {
      ok: errors.length === 0,
      records: records,
      audit: audit,
      errors: errors,
      writeAllowed: false,
      requiresSecondGateForEnablement: true,
      enabled: false
    };
  }
  function buildExtractionRequest(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    return {
      tenantId: clean(input.tenantId || ctx.tenantId),
      aseguradoraId: clean(input.aseguradoraId || ctx.aseguradoraId),
      documentId: clean(input.documentId || input.documentoFuenteId || ctx.documentId),
      fileRef: clean(input.fileRef || input.archivoRef || ctx.fileRef),
      sourceHash: clean(input.sourceHash || ctx.sourceHash),
      mediaKind: clean(input.mediaKind || ctx.mediaKind || 'spreadsheet'),
      versionFuente: clean(input.versionFuente || ctx.versionFuente || 'v1'),
      dimensiones: dimensions(input, ctx),
      concepts: unique((input.concepts || CONCEPTS).filter(function (item) { return CONCEPTS.indexOf(item) >= 0; })),
      includeRawCells: false,
      includeWorkbookPayload: false,
      includeCustomerPayload: false,
      includeSecrets: false,
      executeMacros: false,
      calculateFormulas: false,
      requiresEvidence: true
    };
  }
  async function extractWithProvider(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var source = input.provider || window.OrbitDocumentExtractionProviderP05 || Orbit.documentExtractionProviderP05;
    var extract = source && (source.extractFacts || source.extractKnowledge || source.proposeFacts);
    if (typeof extract !== 'function') return { ok: false, code: 'BACKEND_REQUIRED', proposals: [], writeAllowed: false };
    var request = buildExtractionRequest(input, ctx);
    try {
      var response = await extract(request);
      var items = Array.isArray(response) ? response : (response && (response.proposals || response.items) || []);
      var proposals = items.map(function (item, index) { return normalizeProposal(item, request, index); });
      return {
        ok: true,
        code: 'PROPOSALS_READY',
        request: request,
        proposals: proposals,
        validations: proposals.map(validateProposal),
        conflicts: detectConflicts(proposals),
        writeAllowed: false,
        approved: false,
        requiresHumanValidation: true
      };
    } catch (error) {
      return { ok: false, code: clean(error && error.code) || 'EXTRACTION_FAILED', proposals: [], writeAllowed: false };
    }
  }

  Orbit.documentExtractionProposalP05 = {
    CONCEPTS: CONCEPTS.slice(),
    STATUSES: STATUSES.slice(),
    dimensions: dimensions,
    normalizeEvidence: normalizeEvidence,
    evidenceValid: evidenceValid,
    proposalKey: proposalKey,
    normalizeProposal: normalizeProposal,
    validateProposal: validateProposal,
    detectConflicts: detectConflicts,
    buildDiff: buildDiff,
    buildConfirmedKnowledgePlan: buildConfirmedKnowledgePlan,
    buildExtractionRequest: buildExtractionRequest,
    extractWithProvider: extractWithProvider
  };
})();
