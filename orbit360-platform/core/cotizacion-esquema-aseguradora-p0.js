/* ============================================================
   Orbit 360 · Esquema de presentación de cotización por aseguradora P0
   Fecha: 2026-07-10

   Capa pura y reusable. Conserva títulos, orden, secciones y campos
   propios de la cotización fuente sin mezclar datos reales ni escribir.
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
    'ajuste_validado'
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
    const sections = Array.isArray(input.secciones)
      ? input.secciones.map(normalizeSection).sort(function (a, b) { return a.orden - b.orden; })
      : [];
    return {
      id: clean(input.id) || 'pres_cot_' + Date.now().toString(36),
      tenantId: clean(input.tenantId || ctx.tenantId),
      aseguradoraId: clean(input.aseguradoraId),
      pais: clean(input.pais || ctx.pais).toUpperCase(),
      ramo: clean(input.ramo),
      producto: clean(input.producto),
      plan: clean(input.plan),
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
    const hasRateRules = input.contieneTarifas === true || input.contieneReglasCalculo === true;
    const presentationComplete = sourceType === 'cotizacion_pdf_oficial' || (sourceType === 'cotizador_excel_salida' && hasGeneratedOutput);
    const needsQuoteExample = !presentationComplete && (sourceType === 'tarifario_excel' || sourceType === 'tarifario_pdf' || hasRateRules);
    return {
      tipoFuente: sourceType,
      soportado: supported,
      sirveParaTarifas: hasRateRules || sourceType === 'cotizador_excel_salida' || sourceType === 'ajuste_validado',
      sirveParaPresentacion: presentationComplete,
      sirveParaExtraccion: supported,
      requiereEjemploCotizacion: needsQuoteExample,
      prioridadPresentacion: sourceType === 'cotizador_excel_salida' && hasGeneratedOutput ? 1 : (sourceType === 'cotizacion_pdf_oficial' ? 2 : 9),
      prioridadTarifa: sourceType === 'cotizador_excel_salida' ? 1 : (sourceType === 'tarifario_excel' ? 2 : (sourceType === 'tarifario_pdf' ? 3 : 9)),
      observaciones: needsQuoteExample ? 'La fuente permite conocer tarifas o reglas, pero no garantiza el formato completo de cotización.' : ''
    };
  }

  function createTrainingProfile(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    const sources = Array.isArray(input.fuentes) ? input.fuentes.map(function (source) {
      return Object.assign({}, source, { evaluacion: inspectTrainingSource(source) });
    }) : [];
    return {
      id: clean(input.id) || 'train_asg_' + Date.now().toString(36),
      tenantId: clean(input.tenantId || ctx.tenantId),
      aseguradoraId: clean(input.aseguradoraId),
      pais: clean(input.pais || ctx.pais).toUpperCase(),
      ramo: clean(input.ramo),
      producto: clean(input.producto),
      fuentes: sources,
      tieneFuenteTarifa: sources.some(function (s) { return s.evaluacion.sirveParaTarifas; }),
      tieneFuentePresentacion: sources.some(function (s) { return s.evaluacion.sirveParaPresentacion; }),
      requiereEjemploCotizacion: sources.some(function (s) { return s.evaluacion.requiereEjemploCotizacion; }) && !sources.some(function (s) { return s.evaluacion.sirveParaPresentacion; }),
      estado: clean(input.estado || 'inventario_fuentes'),
      version: clean(input.version || 'v1'),
      trazabilidad: clone(input.trazabilidad || {})
    };
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
    STANDARD_SECTION_KEYS: STANDARD_SECTION_KEYS,
    normalizeField: normalizeField,
    normalizeSection: normalizeSection,
    normalizePresentation: normalizePresentation,
    validatePresentation: validatePresentation,
    inspectTrainingSource: inspectTrainingSource,
    createTrainingProfile: createTrainingProfile,
    attachPresentationToQuote: attachPresentationToQuote,
    flattenCanonicalFields: flattenCanonicalFields
  };
})();