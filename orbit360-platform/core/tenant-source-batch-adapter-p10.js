/* ============================================================
   Orbit 360 · P0.10 · Adapter de fuentes a lote por tenant
   Fecha: 2026-07-10

   Resuelve cada fuente contra aliases/configuración/directorio antes de
   construir el lote documental. No inventa fileRef, no escribe y no habilita.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }

  function sourceName(source) {
    source = source || {};
    return clean(source.nombre || source.fileName || source.sourceName || source.archivoNombre);
  }
  function insurerName(source) {
    source = source || {};
    return clean(source.aseguradoraNombre || source.insurerName || source.aseguradora || source.insurer);
  }
  function resolveSource(source, input, index) {
    source = source || {}; input = input || {};
    var api = Orbit.tenantInsurerConfigP10;
    var tenantId = clean(source.tenantId || input.tenantId);
    var errors = [];
    if (!api || typeof api.resolveInsurer !== 'function') errors.push('TENANT_INSURER_CONFIG_REQUIRED');
    if (!tenantId) errors.push('TENANT_REQUIRED');
    if (!sourceName(source)) errors.push('SOURCE_NAME_REQUIRED');
    if (errors.length) return {
      order: index + 1, source: clone(source), resolvedSource: null,
      status: 'blocked', errors: errors, resolution: null
    };
    var resolution = api.resolveInsurer({
      tenantId: tenantId,
      aseguradoraId: clean(source.aseguradoraId || source.insurerId),
      name: insurerName(source),
      fileName: sourceName(source),
      sourceName: clean(source.sourceName),
      aliases: [].concat(source.aseguradoraAliases || source.insurerAliases || []),
      pais: clean(source.pais || source.country),
      directory: input.directory || []
    });
    if (!resolution.resolved) errors.push(clean(resolution.code || 'INSURER_NOT_RESOLVED'));
    var resolved = resolution.resolved ? Object.assign({}, clone(source), {
      tenantId: tenantId,
      aseguradoraId: clean(resolution.insurerId),
      aseguradoraCanonicalKey: clean(resolution.canonicalKey),
      aseguradoraNombreCanonico: clean(resolution.canonicalName || resolution.displayName),
      aseguradoraNombreVisible: clean(resolution.displayName || resolution.canonicalName),
      aseguradoraDirectoryId: clean(resolution.directoryId),
      aseguradoraInternalId: clean(resolution.internalId),
      aseguradoraResolutionCode: clean(resolution.code),
      requiresDirectoryWrite: resolution.requiresDirectoryWrite === true
    }) : null;
    if (resolved) {
      resolved.enabled = false;
      resolved.enabledCotizador = false;
      resolved.enabledComparativo = false;
      resolved.writeAllowed = false;
      resolved.requiresHumanValidation = true;
    }
    return {
      order: index + 1,
      source: clone(source),
      resolvedSource: resolved,
      status: errors.length ? 'blocked' : 'ready_for_batch_plan',
      errors: unique(errors),
      resolution: clone(resolution)
    };
  }
  function resolveBatchSources(input) {
    input = input || {};
    var sources = [].concat(input.sources || []), topErrors = [];
    if (!clean(input.tenantId)) topErrors.push('TENANT_REQUIRED');
    if (!sources.length) topErrors.push('SOURCES_REQUIRED');
    var rows = sources.map(function (source, index) { return resolveSource(source, input, index); });
    var resolvedSources = rows.filter(function (row) { return row.resolvedSource && !row.errors.length; })
      .map(function (row) { return row.resolvedSource; });
    var insurerIds = unique(resolvedSources.map(function (source) { return clean(source.aseguradoraId); }));
    var internalPending = resolvedSources.filter(function (source) { return source.requiresDirectoryWrite === true; }).length;
    return {
      ok: topErrors.length === 0 && rows.every(function (row) { return !row.errors.length; }),
      code: topErrors.length || rows.some(function (row) { return row.errors.length; })
        ? 'TENANT_SOURCE_BATCH_REQUIRES_CORRECTION'
        : 'TENANT_SOURCE_BATCH_RESOLVED',
      tenantId: clean(input.tenantId),
      rows: rows,
      sources: resolvedSources,
      errors: unique(topErrors.concat.apply(topErrors, rows.map(function (row) { return row.errors || []; }))),
      summary: {
        total: rows.length,
        resolved: resolvedSources.length,
        blocked: rows.filter(function (row) { return row.errors.length; }).length,
        insurers: insurerIds.length,
        directoryMatched: resolvedSources.filter(function (source) { return !!source.aseguradoraDirectoryId; }).length,
        internalIdPendingDirectory: internalPending
      },
      writeAllowed: false,
      applyAllowed: false,
      enablesCotizador: false,
      enablesComparativo: false,
      requiresHumanValidation: true
    };
  }

  Orbit.tenantSourceBatchAdapterP10 = {
    sourceName: sourceName,
    insurerName: insurerName,
    resolveSource: resolveSource,
    resolveBatchSources: resolveBatchSources
  };
})();