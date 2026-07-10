/* ============================================================
   Orbit 360 · P0.5 · Wire metadata-only de fuentes documentales
   Fecha: 2026-07-10

   Orquesta referencia documental → inspector/adaptador → dry-run → plan.
   No recibe bytes/tokens, no escribe en Orbit.store y no habilita tarifas.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var READ_ROLES = ['superadmin', 'super_admin', 'direccion', 'admin', 'admintenant', 'admin_tenant', 'operativo'];
  var CONFIRM_ROLES = ['superadmin', 'super_admin', 'direccion', 'admin', 'admintenant', 'admin_tenant'];
  var SUPPORTED_EXCEL = ['xlsx', 'xlsm'];

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function stableId(prefix, parts) {
    var text = (parts || []).map(norm).join('|'), hash = 0;
    for (var i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return prefix + '_' + Math.abs(hash).toString(36);
  }
  function sanitize(value) {
    var C = Orbit.documentSourceContractP04;
    return C && typeof C.sanitize === 'function' ? C.sanitize(value, { redactSamples: true }, 0) : clone(value || {});
  }
  function extension(name) {
    var parts = clean(name).toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
  }
  function actor(explicit) {
    if (explicit) {
      var roles = [].concat(explicit.roles || []);
      roles.push(explicit.rol, explicit.role);
      return {
        id: clean(explicit.id || explicit.uid),
        email: clean(explicit.email || explicit.correo),
        nombre: clean(explicit.nombre || explicit.name),
        activeRole: clean(explicit.activeRole || explicit.rol || explicit.role || roles[0]),
        assignedRoles: Array.from(new Set(roles.map(norm).filter(Boolean)))
      };
    }
    var authUser = {}, activeRole = '', advisor = {};
    try { authUser = Orbit.auth && typeof Orbit.auth.user === 'function' ? (Orbit.auth.user() || {}) : {}; } catch (e) {}
    try { activeRole = Orbit.session && typeof Orbit.session.rol === 'function' ? Orbit.session.rol() : ''; } catch (e) {}
    try {
      var advisorId = Orbit.session && typeof Orbit.session.asesorId === 'function' ? Orbit.session.asesorId() : '';
      advisor = advisorId && Orbit.store && typeof Orbit.store.get === 'function' ? (Orbit.store.get('asesores', advisorId) || {}) : {};
    } catch (e) {}
    var assigned = [].concat(advisor.roles || [], authUser.roles || []);
    assigned.push(advisor.rol, advisor.role, authUser.rol, authUser.role);
    return {
      id: clean(authUser.id || authUser.uid || advisor.id),
      email: clean(authUser.email || authUser.correo || advisor.email || advisor.correo),
      nombre: clean(authUser.nombre || authUser.name || advisor.nombre || advisor.name),
      activeRole: clean(activeRole || authUser.activeRole || advisor.rol || authUser.rol),
      assignedRoles: Array.from(new Set(assigned.map(norm).filter(Boolean)))
    };
  }
  function allowed(identity, roles) {
    identity = actor(identity);
    var active = norm(identity.activeRole);
    if (!active) return false;
    if (identity.assignedRoles.length && identity.assignedRoles.indexOf(active) < 0) return false;
    return roles.indexOf(active) >= 0;
  }
  function canRead(identity) { return allowed(identity, READ_ROLES); }
  function canConfirm(identity) { return allowed(identity, CONFIRM_ROLES); }
  function fingerprint(value) {
    var text = JSON.stringify(sanitize(value || [])), hash = 0;
    for (var i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return Math.abs(hash).toString(36);
  }
  function sourceIdentity(source) {
    source = source || {};
    return [
      clean(source.aseguradoraId), clean(source.pais), clean(source.ramo), clean(source.producto),
      clean(source.familiaProducto), clean(source.subtipoProducto), clean(source.segmento),
      clean(source.tipoRiesgo), clean(source.tipoVehiculo), clean(source.usoVehiculo),
      clean(source.plan), clean(source.tipoFuente), clean(source.version)
    ].map(norm).join('|');
  }
  function auditEvent(input) {
    input = input || {};
    var identity = actor(input.actor);
    return {
      id: clean(input.id) || stableId('audit_doc_p05', [input.documentId, input.action, new Date().toISOString()]),
      fecha: clean(input.fecha) || new Date().toISOString(),
      tenantId: clean(input.tenantId),
      modulo: 'aseguradoras',
      categoria: 'lectura_fuente_documental',
      accion: clean(input.action),
      resultado: clean(input.result || input.resultado || 'solicitado'),
      aseguradoraId: clean(input.aseguradoraId),
      documentId: clean(input.documentId),
      fileRef: clean(input.fileRef),
      sourceHash: clean(input.sourceHash),
      actorId: identity.id,
      actorEmail: identity.email,
      actorNombre: identity.nombre,
      rolActivo: identity.activeRole,
      motivo: clean(input.reason || input.motivo),
      metadata: sanitize(input.metadata || {}),
      containsBytes: false,
      containsBase64: false,
      containsSecrets: false,
      containsCustomerPayload: false
    };
  }
  function writeAudit(store, event) {
    try { if (store && typeof store.insert === 'function') store.insert('auditoria', event); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('orbit:audit', { detail: event })); } catch (e) {}
    return event;
  }
  function buildReadRequest(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var file = input.file || {};
    var name = clean(file.name || input.sourceFileName || input.nombreArchivo);
    return {
      tenantId: clean(input.tenantId || ctx.tenantId),
      aseguradoraId: clean(input.aseguradoraId || ctx.aseguradoraId),
      file: {
        name: name,
        extension: clean(file.extension || extension(name)),
        fileRef: clean(file.fileRef || input.fileRef || input.archivoRef),
        hash: clean(file.hash || input.sourceHash),
        mimeType: clean(file.mimeType || input.mimeType)
      },
      pais: clean(input.pais || ctx.pais).toUpperCase(),
      moneda: clean(input.moneda || ctx.moneda).toUpperCase(),
      dimensiones: sanitize(input.dimensiones || ctx.dimensiones || {}),
      version: clean(input.version || 'v1'),
      previousDocumentId: clean(input.previousDocumentId),
      previousHash: clean(input.previousHash),
      reason: clean(input.reason || input.motivo),
      includeCellValues: false,
      includeBinaryPayload: false,
      includeCustomerPayload: false,
      includeSecrets: false,
      executeMacros: false,
      calculateFormulas: false
    };
  }
  function validateReadRequest(request, identity) {
    var errors = [], warnings = [];
    if (!canRead(identity)) errors.push('FORBIDDEN_ROLE');
    if (!request.tenantId) errors.push('TENANT_REQUERIDO');
    if (!request.aseguradoraId) errors.push('ASEGURADORA_REQUERIDA');
    if (!request.file.name) errors.push('ARCHIVO_REQUERIDO');
    if (!request.file.fileRef && !request.file.hash) errors.push('REFERENCIA_O_HASH_REQUERIDO');
    if (!request.pais) errors.push('PAIS_REQUIERE_VALIDACION');
    if (!request.moneda) warnings.push('MONEDA_REQUIERE_VALIDACION');
    if (request.file.extension && SUPPORTED_EXCEL.indexOf(request.file.extension) < 0) warnings.push('FORMATO_REQUIERE_ADAPTER');
    if (!request.reason) warnings.push('MOTIVO_RECOMENDADO');
    return { valid: errors.length === 0, errors: errors, warnings: warnings };
  }
  async function inspectMetadata(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var identity = actor(input.actor);
    var request = buildReadRequest(input, ctx);
    var validation = validateReadRequest(request, identity);
    var store = input.store || Orbit.store;
    var started = auditEvent({
      tenantId: request.tenantId, aseguradoraId: request.aseguradoraId,
      fileRef: request.file.fileRef, sourceHash: request.file.hash,
      action: validation.valid ? 'solicitar_inventario_documental' : 'denegar_inventario_documental',
      result: validation.valid ? 'solicitado' : 'denegado', actor: identity,
      reason: request.reason, metadata: { fileName: request.file.name, extension: request.file.extension, validationErrors: validation.errors }
    });
    writeAudit(store, started);
    if (!validation.valid) return { ok: false, code: validation.errors[0] || 'REQUIRES_VALIDATION', request: request, validation: validation, audit: [started], writeAllowed: false };
    var adapter = Orbit.excelWorkbookAdapterP04;
    if (!adapter || typeof adapter.inspectWithProvider !== 'function') {
      var missing = auditEvent({ tenantId: request.tenantId, aseguradoraId: request.aseguradoraId, fileRef: request.file.fileRef, sourceHash: request.file.hash, action: 'inventariar_fuente_documental', result: 'adapter_no_disponible', actor: identity, reason: request.reason });
      writeAudit(store, missing);
      return { ok: false, code: 'EXCEL_ADAPTER_REQUIRED', request: request, validation: validation, audit: [started, missing], writeAllowed: false };
    }
    var result = await adapter.inspectWithProvider(Object.assign({}, request, { provider: input.provider }), ctx);
    var completed = auditEvent({
      tenantId: request.tenantId, aseguradoraId: request.aseguradoraId,
      documentId: result && result.envelope && result.envelope.id,
      fileRef: request.file.fileRef, sourceHash: request.file.hash,
      action: 'inventariar_fuente_documental', result: result && result.ok ? 'dry_run_listo' : clean(result && result.code || 'error'),
      actor: identity, reason: request.reason,
      metadata: {
        fileName: request.file.name,
        sourceTypeProposal: result && result.summary && result.summary.sourceTypeProposal,
        worksheets: result && result.summary && result.summary.worksheets,
        macrosDetected: result && result.summary && result.summary.macrosDetected,
        externalLinksDetected: result && result.summary && result.summary.externalLinksDetected
      }
    });
    writeAudit(store, completed);
    return Object.assign({}, result || {}, { request: request, validation: validation, audit: [started, completed], actor: identity, writeAllowed: false });
  }
  function documentRecord(inspection) {
    inspection = inspection || {};
    var envelope = inspection.envelope || {};
    var workbook = inspection.workbook || {};
    var summary = inspection.summary || {};
    var source = inspection.sourceProposal || {};
    var dims = source.dimensiones || {};
    return {
      id: clean(envelope.id),
      tenantId: clean(envelope.tenantId),
      entidad: 'aseguradora',
      entidadId: clean(envelope.aseguradoraId),
      aseguradoraId: clean(envelope.aseguradoraId),
      nombre: clean(envelope.file && envelope.file.name),
      tipo: 'fuente_conocimiento_aseguradora',
      tipoFuente: clean(source.tipoFuente || summary.sourceTypeProposal || envelope.sourceType),
      pais: clean(envelope.pais),
      moneda: clean(envelope.moneda),
      ramo: clean(source.ramo || dims.ramo),
      producto: clean(source.producto || dims.producto),
      familiaProducto: clean(source.familiaProducto || dims.familiaProducto),
      subtipoProducto: clean(source.subtipoProducto || dims.subtipoProducto),
      segmento: clean(source.segmento || dims.segmento),
      tipoRiesgo: clean(source.tipoRiesgo || dims.tipoRiesgo),
      tipoVehiculo: clean(source.tipoVehiculo || dims.tipoVehiculo),
      usoVehiculo: clean(source.usoVehiculo || dims.usoVehiculo),
      plan: clean(source.plan || dims.plan),
      dimensiones: sanitize(dims),
      version: clean(envelope.version && envelope.version.label),
      archivoRef: clean(envelope.file && envelope.file.fileRef),
      sourceHash: clean(envelope.file && envelope.file.hash),
      estado: 'requiere_validacion',
      inventario: {
        worksheetCount: Number(workbook.worksheetCount || summary.worksheets || 0),
        hiddenWorksheets: Number(summary.hiddenWorksheets || 0),
        definedNameCount: Number(workbook.definedNameCount || summary.definedNames || 0),
        formulaCount: Number(summary.formulaCount || 0),
        printAreaCount: Number(summary.printAreas || 0),
        hasMacros: workbook.hasMacros === true,
        externalLinkCount: Number(workbook.externalLinkCount || 0),
        workbookFingerprint: clean(workbook.workbookFingerprint),
        parser: sanitize(workbook.parser || {})
      },
      capacidadesPropuestas: sanitize(inspection.capabilities || {}),
      validacionPendiente: true,
      habilitadoCotizador: false,
      habilitadoComparativo: false,
      contieneBytes: false,
      contieneBase64: false,
      contieneSecretos: false,
      trazabilidad: {
        adapter: 'excel_workbook_p04',
        wire: 'document_source_wire_p05',
        createdAt: new Date().toISOString()
      }
    };
  }
  function sourceRow(inspection) {
    inspection = inspection || {};
    var source = sanitize(inspection.sourceProposal || {});
    source.estado = 'requiere_validacion';
    source.approved = false;
    source.habilitadoCotizador = false;
    source.habilitadoComparativo = false;
    return source;
  }
  function versionAction(inspection, existingDocuments) {
    var envelope = inspection && inspection.envelope || {};
    var hash = clean(envelope.file && envelope.file.hash);
    var sameHash = (existingDocuments || []).find(function (doc) {
      return clean(doc.aseguradoraId || doc.entidadId) === clean(envelope.aseguradoraId) && hash && clean(doc.sourceHash) === hash;
    });
    if (sameHash) return { action: 'omit_same_hash', existingDocumentId: clean(sameHash.id), requiresHumanConfirmation: false };
    var identity = sourceIdentity(sourceRow(inspection));
    var sameIdentity = (existingDocuments || []).filter(function (doc) {
      return sourceIdentity(doc) === identity;
    }).sort(function (a, b) { return clean(b.version).localeCompare(clean(a.version)); })[0];
    return {
      action: sameIdentity ? 'new_version_proposed' : 'create_document_proposed',
      existingDocumentId: clean(sameIdentity && sameIdentity.id),
      requiresHumanConfirmation: true
    };
  }
  function buildPersistenceDryRun(input) {
    input = input || {};
    var inspection = input.inspection || {};
    var insurer = input.aseguradoraActual || input.currentInsurer || {};
    var existingDocs = input.documentosActuales || input.existingDocuments || [];
    var currentSources = Array.isArray(insurer.docs) ? insurer.docs.slice() : [];
    if (!inspection.ok) return { ok: false, code: 'INSPECTION_REQUIRED', operations: [], writeAllowed: false };
    var action = versionAction(inspection, existingDocs);
    if (action.action === 'omit_same_hash') {
      return { ok: true, code: 'OMIT_SAME_HASH', versionAction: action, operations: [], writeAllowed: false, requiresHumanConfirmation: false };
    }
    var doc = documentRecord(inspection);
    var source = sourceRow(inspection);
    var nextSources = currentSources.filter(function (item) { return clean(item.id) !== clean(source.id); }).concat([source]);
    var operations = [
      {
        action: 'insert', collection: 'documentos', data: doc,
        preconditions: { documentIdAbsent: doc.id, sourceHashAbsent: doc.sourceHash }
      },
      {
        action: 'update', collection: 'aseguradoras', id: clean(insurer.id || inspection.envelope.aseguradoraId),
        patch: { docs: nextSources },
        preconditions: { currentDocsFingerprint: fingerprint(currentSources), expectedInsurerId: clean(insurer.id || inspection.envelope.aseguradoraId) }
      }
    ];
    return {
      ok: true,
      code: 'PERSISTENCE_PLAN_READY',
      versionAction: action,
      documentRecord: doc,
      sourceRow: source,
      operations: operations,
      summary: { documentsToCreate: 1, insurersToPatch: 1, sourcesBefore: currentSources.length, sourcesAfter: nextSources.length },
      writeAllowed: false,
      approved: false,
      requiresHumanConfirmation: true,
      requiresCurrentStateRecheck: true
    };
  }
  function buildConfirmedPlan(dryRun, confirmation) {
    dryRun = dryRun || {};
    confirmation = confirmation || {};
    var identity = actor(confirmation.actor);
    var errors = [];
    if (!dryRun.ok) errors.push('DRY_RUN_INVALIDO');
    if (!canConfirm(identity)) errors.push('FORBIDDEN_ROLE');
    if (!clean(confirmation.reason || confirmation.motivo)) errors.push('MOTIVO_REQUERIDO');
    if (confirmation.confirmed !== true) errors.push('CONFIRMACION_REQUERIDA');
    if (dryRun.requiresCurrentStateRecheck && clean(confirmation.currentDocsFingerprint) !== clean(dryRun.operations[1] && dryRun.operations[1].preconditions.currentDocsFingerprint)) errors.push('ESTADO_ACTUAL_CAMBIO_REEJECUTAR_DRY_RUN');
    return {
      ok: errors.length === 0,
      operations: errors.length ? [] : clone(dryRun.operations || []),
      actor: identity,
      reason: clean(confirmation.reason || confirmation.motivo),
      errors: errors,
      writeAllowed: false,
      applyFunctionProvided: false,
      requiresExternalWriter: true,
      enabledCotizador: false,
      enabledComparativo: false
    };
  }

  Orbit.documentSourceWireP05 = {
    READ_ROLES: READ_ROLES.slice(),
    CONFIRM_ROLES: CONFIRM_ROLES.slice(),
    actor: actor,
    canRead: canRead,
    canConfirm: canConfirm,
    fingerprint: fingerprint,
    buildReadRequest: buildReadRequest,
    validateReadRequest: validateReadRequest,
    auditEvent: auditEvent,
    inspectMetadata: inspectMetadata,
    documentRecord: documentRecord,
    sourceRow: sourceRow,
    versionAction: versionAction,
    buildPersistenceDryRun: buildPersistenceDryRun,
    buildConfirmedPlan: buildConfirmedPlan
  };
})();
