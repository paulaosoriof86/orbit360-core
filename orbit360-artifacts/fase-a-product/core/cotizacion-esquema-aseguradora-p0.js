/* ============================================================
   Orbit 360 · Esquema de presentación y fuentes por aseguradora P0
   Fecha: 2026-07-10

   Capa pura y reusable. Conserva títulos, orden, secciones y campos
   propios de la fuente. Admite múltiples documentos por combinación
   de país/producto/segmento/tipo de riesgo sin escribir datos.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  const SOURCE_TYPES = [
    'cotizador_excel_salida',
    'cotizacion_pdf_oficial',
    'tarifario_excel',
    'tarifario_pdf',
    'poliza_ejemplo',
    'condiciones',
    'circular',
    'ajuste_validado',
    'cotizador_linea_asistido',
    'formulario',
    'documento_comercial',
    'otro'
  ];

  const SOURCE_USES = [
    'tarifas',
    'reglas_calculo',
    'presentacion_cotizacion',
    'extraccion_comparativo',
    'condiciones_beneficios',
    'casos_prueba',
    'entrenamiento_extraccion',
    'emision'
  ];

  const STANDARD_SECTION_KEYS = [
    'datos_generales',
    'seccion_1',
    'seccion_2',
    'seccion_3',
    'coberturas_adicionales',
    'beneficios_adicionales',
    'beneficios_particulares',
    'exclusiones',
    'condiciones',
    'formas_pago',
    'notas',
    'anexos',
    'otra'
  ];

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function slug(value) {
    return clean(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function unique(values) {
    return Array.from(new Set((values || []).filter(Boolean)));
  }

  function normalizeDimensions(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    return {
      pais: clean(input.pais || ctx.pais).toUpperCase(),
      moneda: clean(input.moneda || ctx.moneda).toUpperCase(),
      ramo: clean(input.ramo || ctx.ramo),
      producto: clean(input.producto || ctx.producto),
      familiaProducto: clean(input.familiaProducto || input.familia || ctx.familiaProducto),
      subtipoProducto: clean(input.subtipoProducto || input.subtipo || ctx.subtipoProducto),
      segmento: clean(input.segmento || ctx.segmento),
      tipoRiesgo: clean(input.tipoRiesgo || ctx.tipoRiesgo),
      tipoVehiculo: clean(input.tipoVehiculo || ctx.tipoVehiculo),
      usoVehiculo: clean(input.usoVehiculo || ctx.usoVehiculo),
      plan: clean(input.plan || ctx.plan)
    };
  }

  function dimensionKey(input, ctx) {
    const d = normalizeDimensions(input, ctx);
    return [
      d.pais,
      d.ramo,
      d.producto,
      d.familiaProducto,
      d.subtipoProducto,
      d.segmento,
      d.tipoRiesgo,
      d.tipoVehiculo,
      d.usoVehiculo,
      d.plan
    ].map(function (value) { return slug(value) || '*'; }).join('|');
  }

  function normalizeField(field, index) {
    field = field || {};
    return {
      id: clean(field.id) || 'campo_' + (index + 1),
      claveCanonica: clean(field.claveCanonica || field.clave || field.key),
      etiquetaFuente: clean(field.etiquetaFuente || field.etiqueta || field.label),
      valorFuente: field.valorFuente != null ? field.valorFuente : (field.valor != null ? field.valor : ''),
      valorCanonico: field.valorCanonico != null ? field.valorCanonico : null,
      tipo: clean(field.tipo || 'texto'),
      moneda: clean(field.moneda).toUpperCase(),
      unidad: clean(field.unidad),
      incluido: field.incluido === true,
      orden: Number(field.orden != null ? field.orden : index),
      confianza: Number(field.confianza || 0),
      sourceLocation: clone(field.sourceLocation || {}),
      observaciones: clean(field.observaciones)
    };
  }

  function normalizeSection(section, index) {
    section = section || {};
    const title = clean(section.tituloFuente || section.titulo || section.nombre || ('Sección ' + (index + 1)));
    const requestedKey = slug(section.clave || section.key || title);
    const key = STANDARD_SECTION_KEYS.indexOf(requestedKey) >= 0 ? requestedKey : (requestedKey || 'otra');
    const fields = Array.isArray(section.campos || section.items)
      ? (section.campos || section.items).map(normalizeField).sort(function (a, b) { return a.orden - b.orden; })
      : [];
    return {
      id: clean(section.id) || 'seccion_' + (index + 1),
      clave: key,
      claveFuente: requestedKey,
      tituloFuente: title,
      subtituloFuente: clean(section.subtituloFuente || section.subtitulo),
      orden: Number(section.orden != null ? section.orden : index),
      visible: section.visible !== false,
      repetible: section.repetible === true,
      estiloFuente: clone(section.estiloFuente || {}),
      campos: fields,
      sourceLocation: clone(section.sourceLocation || {}),
      observaciones: clean(section.observaciones)
    };
  }

  function normalizePresentation(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    const dimensions = normalizeDimensions(input, ctx);
    const sections = Array.isArray(input.secciones)
      ? input.secciones.map(normalizeSection).sort(function (a, b) { return a.orden - b.orden; })
      : [];
    return {
      id: clean(input.id) || 'pres_cot_' + Date.now().toString(36),
      tenantId: clean(input.tenantId || ctx.tenantId),
      aseguradoraId: clean(input.aseguradoraId || ctx.aseguradoraId),
      pais: dimensions.pais,
      ramo: dimensions.ramo,
      producto: dimensions.producto,
      plan: dimensions.plan,
      dimensiones: dimensions,
      nombreFormatoFuente: clean(input.nombreFormatoFuente),
      documentoFuenteId: clean(input.documentoFuenteId),
      cotizadorFuenteId: clean(input.cotizadorFuenteId),
      versionFuente: clean(input.versionFuente),
      plantillaVersion: clean(input.plantillaVersion || 'v1'),
      conservarTitulosFuente: input.conservarTitulosFuente !== false,
      conservarOrdenFuente: input.conservarOrdenFuente !== false,
      conservarCamposNoCanonicos: input.conservarCamposNoCanonicos !== false,
      brandingTenant: input.brandingTenant !== false,
      secciones: sections,
      encabezado: clone(input.encabezado || {}),
      pie: clone(input.pie || {}),
      advertencias: Array.isArray(input.advertencias) ? input.advertencias.slice() : [],
      estado: clean(input.estado || 'requiere_validacion'),
      confianza: Number(input.confianza || 0),
      trazabilidad: clone(input.trazabilidad || {}),
      createdAt: clean(input.createdAt) || new Date().toISOString()
    };
  }

  function validatePresentation(profile) {
    const errors = [];
    if (!profile.aseguradoraId) errors.push('aseguradora');
    if (!profile.pais) errors.push('pais');
    if (!profile.producto) errors.push('producto');
    if (!profile.documentoFuenteId && !profile.cotizadorFuenteId) errors.push('fuente_presentacion');
    if (!profile.secciones.length) errors.push('secciones');
    profile.secciones.forEach(function (section, index) {
      if (!section.tituloFuente) errors.push('titulo_seccion_' + index);
      if (!section.campos.length) errors.push('campos_seccion_' + index);
    });
    return { valid: errors.length === 0, errors: errors };
  }

  function inspectTrainingSource(input) {
    input = input || {};
    const sourceType = clean(input.tipoFuente || input.sourceType);
    const supported = SOURCE_TYPES.indexOf(sourceType) >= 0;
    const hasGeneratedOutput = input.contieneHojaSalida === true || input.contieneFormatoCotizacion === true || input.contieneAreaImpresion === true;
    const hasRates = input.contieneTarifas === true;
    const hasRules = input.contieneReglasCalculo === true;
    const officialQuote = sourceType === 'cotizacion_pdf_oficial';
    const excelCalculator = sourceType === 'cotizador_excel_salida';
    const policyExample = sourceType === 'poliza_ejemplo';
    const conditionsSource = sourceType === 'condiciones' || sourceType === 'circular';
    const tariffSource = sourceType === 'tarifario_excel' || sourceType === 'tarifario_pdf';

    const sirveParaTarifas = hasRates || tariffSource || excelCalculator || sourceType === 'ajuste_validado';
    const sirveParaReglas = hasRules || excelCalculator || sourceType === 'ajuste_validado';
    const sirveParaPresentacion = officialQuote || (excelCalculator && hasGeneratedOutput) || (sourceType === 'cotizador_linea_asistido' && hasGeneratedOutput);
    const sirveParaComparativo = officialQuote || policyExample || conditionsSource || sirveParaPresentacion;
    const sirveParaCondiciones = policyExample || conditionsSource || officialQuote;
    const sirveParaCasosPrueba = officialQuote || policyExample || (excelCalculator && hasGeneratedOutput);
    const sirveParaEntrenamiento = supported && sourceType !== 'documento_comercial' && sourceType !== 'formulario';
    const requiereEjemploCotizacion = (sirveParaTarifas || sirveParaReglas) && !sirveParaPresentacion;

    const usos = unique([].concat(
      Array.isArray(input.usos) ? input.usos.filter(function (use) { return SOURCE_USES.indexOf(use) >= 0; }) : [],
      sirveParaTarifas ? ['tarifas'] : [],
      sirveParaReglas ? ['reglas_calculo'] : [],
      sirveParaPresentacion ? ['presentacion_cotizacion'] : [],
      sirveParaComparativo ? ['extraccion_comparativo'] : [],
      sirveParaCondiciones ? ['condiciones_beneficios'] : [],
      sirveParaCasosPrueba ? ['casos_prueba'] : [],
      sirveParaEntrenamiento ? ['entrenamiento_extraccion'] : []
    ));

    return {
      tipoFuente: sourceType,
      soportado: supported,
      usos: usos,
      sirveParaTarifas: sirveParaTarifas,
      sirveParaReglas: sirveParaReglas,
      sirveParaPresentacion: sirveParaPresentacion,
      sirveParaComparativo: sirveParaComparativo,
      sirveParaCondiciones: sirveParaCondiciones,
      sirveParaCasosPrueba: sirveParaCasosPrueba,
      sirveParaEntrenamiento: sirveParaEntrenamiento,
      sirveParaExtraccion: supported,
      requiereEjemploCotizacion: requiereEjemploCotizacion,
      prioridadPresentacion: excelCalculator && hasGeneratedOutput ? 1 : (officialQuote ? 2 : 9),
      prioridadTarifa: excelCalculator ? 1 : (sourceType === 'tarifario_excel' ? 2 : (sourceType === 'tarifario_pdf' ? 3 : 9)),
      observaciones: requiereEjemploCotizacion ? 'La fuente permite conocer tarifas o reglas, pero no garantiza el formato completo de cotización para esta combinación.' : ''
    };
  }

  function normalizeTrainingSource(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    const dimensions = normalizeDimensions(input, ctx);
    const normalized = {
      id: clean(input.id) || 'src_' + (slug(clean(input.nombre || input.archivo || 'fuente') + '_' + clean(input.version || 'v1')) || Date.now().toString(36)),
      tenantId: clean(input.tenantId || ctx.tenantId),
      aseguradoraId: clean(input.aseguradoraId || ctx.aseguradoraId),
      nombre: clean(input.nombre || input.archivo),
      tipoFuente: clean(input.tipoFuente || input.sourceType),
      documentoFuenteId: clean(input.documentoFuenteId),
      cotizadorFuenteId: clean(input.cotizadorFuenteId),
      archivoRef: clean(input.archivoRef || input.documentRef || input.driveUrl || input.url),
      version: clean(input.version || 'v1'),
      dimensiones: dimensions,
      pais: dimensions.pais,
      ramo: dimensions.ramo,
      producto: dimensions.producto,
      plan: dimensions.plan,
      contieneTarifas: input.contieneTarifas === true,
      contieneReglasCalculo: input.contieneReglasCalculo === true,
      contieneHojaSalida: input.contieneHojaSalida === true,
      contieneFormatoCotizacion: input.contieneFormatoCotizacion === true,
      contieneAreaImpresion: input.contieneAreaImpresion === true,
      usosDeclarados: Array.isArray(input.usos) ? input.usos.slice() : [],
      estado: clean(input.estado || 'inventario_fuentes'),
      vigenciaDesde: clean(input.vigenciaDesde),
      vigenciaHasta: clean(input.vigenciaHasta),
      trazabilidad: clone(input.trazabilidad || {})
    };
    normalized.evaluacion = inspectTrainingSource(Object.assign({}, input, normalized));
    normalized.usos = normalized.evaluacion.usos.slice();
    normalized.claveCobertura = dimensionKey(dimensions);
    return normalized;
  }

  function summarizeSourceGroup(sources, dimensions) {
    const list = sources || [];
    const evals = list.map(function (source) { return source.evaluacion || inspectTrainingSource(source); });
    const counts = {};
    list.forEach(function (source) { counts[source.tipoFuente] = (counts[source.tipoFuente] || 0) + 1; });
    const tieneFuenteTarifa = evals.some(function (e) { return e.sirveParaTarifas; });
    const tieneFuenteReglas = evals.some(function (e) { return e.sirveParaReglas; });
    const tieneFuentePresentacion = evals.some(function (e) { return e.sirveParaPresentacion; });
    const cantidadCotizacionesEjemplo = list.filter(function (s) { return s.tipoFuente === 'cotizacion_pdf_oficial'; }).length;
    const cantidadPolizasEjemplo = list.filter(function (s) { return s.tipoFuente === 'poliza_ejemplo'; }).length;
    const cantidadCotizadoresExcel = list.filter(function (s) { return s.tipoFuente === 'cotizador_excel_salida'; }).length;
    return {
      claveCobertura: dimensionKey(dimensions || (list[0] && list[0].dimensiones) || {}),
      dimensiones: normalizeDimensions(dimensions || (list[0] && list[0].dimensiones) || {}),
      fuentes: list,
      cantidadFuentes: list.length,
      cantidadesPorTipo: counts,
      cantidadCotizacionesEjemplo: cantidadCotizacionesEjemplo,
      cantidadPolizasEjemplo: cantidadPolizasEjemplo,
      cantidadCotizadoresExcel: cantidadCotizadoresExcel,
      tieneFuenteTarifa: tieneFuenteTarifa,
      tieneFuenteReglas: tieneFuenteReglas,
      tieneFuentePresentacion: tieneFuentePresentacion,
      tieneCasosPrueba: evals.some(function (e) { return e.sirveParaCasosPrueba; }),
      tieneCondicionesBeneficios: evals.some(function (e) { return e.sirveParaCondiciones; }),
      requiereEjemploCotizacion: (tieneFuenteTarifa || tieneFuenteReglas) && !tieneFuentePresentacion,
      estadoCobertura: (tieneFuenteTarifa || tieneFuenteReglas) && tieneFuentePresentacion ? 'fuentes_completas_requiere_validacion' : (list.length ? 'fuentes_incompletas' : 'sin_fuentes')
    };
  }

  function createTrainingProfile(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    const dimensions = normalizeDimensions(input, ctx);
    const sourceCtx = Object.assign({}, ctx, input, { aseguradoraId: input.aseguradoraId || ctx.aseguradoraId });
    const sources = Array.isArray(input.fuentes) ? input.fuentes.map(function (source) {
      return normalizeTrainingSource(source, sourceCtx);
    }) : [];
    const summary = summarizeSourceGroup(sources, dimensions);
    return {
      id: clean(input.id) || 'train_asg_' + Date.now().toString(36),
      tenantId: clean(input.tenantId || ctx.tenantId),
      aseguradoraId: clean(input.aseguradoraId || ctx.aseguradoraId),
      pais: dimensions.pais,
      ramo: dimensions.ramo,
      producto: dimensions.producto,
      dimensiones: dimensions,
      fuentes: sources,
      cantidadFuentes: summary.cantidadFuentes,
      cantidadesPorTipo: summary.cantidadesPorTipo,
      tieneFuenteTarifa: summary.tieneFuenteTarifa,
      tieneFuenteReglas: summary.tieneFuenteReglas,
      tieneFuentePresentacion: summary.tieneFuentePresentacion,
      requiereEjemploCotizacion: summary.requiereEjemploCotizacion,
      estado: clean(input.estado || summary.estadoCobertura || 'inventario_fuentes'),
      version: clean(input.version || 'v1'),
      trazabilidad: clone(input.trazabilidad || {})
    };
  }

  function createKnowledgeInventory(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    const baseCtx = Object.assign({}, ctx, {
      tenantId: input.tenantId || ctx.tenantId,
      aseguradoraId: input.aseguradoraId || ctx.aseguradoraId,
      pais: input.pais || ctx.pais
    });
    const sources = Array.isArray(input.fuentes) ? input.fuentes.map(function (source) {
      return normalizeTrainingSource(source, baseCtx);
    }) : [];
    const grouped = {};
    sources.forEach(function (source) {
      const key = source.claveCobertura;
      grouped[key] = grouped[key] || [];
      grouped[key].push(source);
    });
    const groups = Object.keys(grouped).map(function (key) {
      return summarizeSourceGroup(grouped[key], grouped[key][0].dimensiones);
    });
    return {
      id: clean(input.id) || 'inv_asg_' + Date.now().toString(36),
      tenantId: clean(input.tenantId || ctx.tenantId),
      aseguradoraId: clean(input.aseguradoraId || ctx.aseguradoraId),
      fuentes: sources,
      grupos: groups,
      cantidadFuentes: sources.length,
      cantidadGrupos: groups.length,
      gruposCompletos: groups.filter(function (g) { return g.estadoCobertura === 'fuentes_completas_requiere_validacion'; }).length,
      gruposIncompletos: groups.filter(function (g) { return g.estadoCobertura !== 'fuentes_completas_requiere_validacion'; }).length,
      requiereEjemplos: groups.filter(function (g) { return g.requiereEjemploCotizacion; }).map(function (g) { return g.claveCobertura; }),
      trazabilidad: clone(input.trazabilidad || {})
    };
  }

  function sourcesForCombination(inventory, query) {
    const wanted = normalizeDimensions(query || {});
    return (inventory && inventory.fuentes || []).filter(function (source) {
      const d = source.dimensiones || {};
      return Object.keys(wanted).every(function (key) {
        return !wanted[key] || clean(d[key]) === clean(wanted[key]);
      });
    });
  }

  function attachPresentationToQuote(quote, presentation) {
    const out = clone(quote || {}) || {};
    out.presentacionAseguradora = clone(presentation || {});
    out.presentacionVersion = clean(presentation && presentation.plantillaVersion);
    out.documentoPresentacionFuenteId = clean(presentation && presentation.documentoFuenteId);
    out.cotizadorPresentacionFuenteId = clean(presentation && presentation.cotizadorFuenteId);
    return out;
  }

  function flattenCanonicalFields(presentation) {
    const out = {};
    (presentation && presentation.secciones || []).forEach(function (section) {
      (section.campos || []).forEach(function (field) {
        if (field.claveCanonica) out[field.claveCanonica] = field.valorCanonico != null ? field.valorCanonico : field.valorFuente;
      });
    });
    return out;
  }

  window.Orbit.cotizacionEsquemaAseguradoraP0 = {
    SOURCE_TYPES: SOURCE_TYPES,
    SOURCE_USES: SOURCE_USES,
    STANDARD_SECTION_KEYS: STANDARD_SECTION_KEYS,
    normalizeDimensions: normalizeDimensions,
    dimensionKey: dimensionKey,
    normalizeField: normalizeField,
    normalizeSection: normalizeSection,
    normalizePresentation: normalizePresentation,
    validatePresentation: validatePresentation,
    inspectTrainingSource: inspectTrainingSource,
    normalizeTrainingSource: normalizeTrainingSource,
    summarizeSourceGroup: summarizeSourceGroup,
    createTrainingProfile: createTrainingProfile,
    createKnowledgeInventory: createKnowledgeInventory,
    sourcesForCombination: sourcesForCombination,
    attachPresentationToQuote: attachPresentationToQuote,
    flattenCanonicalFields: flattenCanonicalFields
  };
})();
