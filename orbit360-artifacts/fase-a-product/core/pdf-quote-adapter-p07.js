/* ============================================================
   Orbit 360 · P0.7 · Adapter reusable de cotizaciones PDF
   Fecha: 2026-07-10

   Convierte extracción PDF estructurada en perfiles de presentación,
   variantes y propuestas de conocimiento. Preserva orden, títulos,
   tablas y layout; no contiene aseguradoras hardcodeadas, no escribe
   en Orbit.store y no habilita Cotizador ni Comparativo.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var PURPOSES = ['training', 'operational'];
  var BLOCK_KINDS = ['heading', 'field', 'table', 'paragraph', 'note', 'icon_grid', 'image', 'other'];
  var SECTION_RULES = [
    { key: 'datos_generales', patterns: ['datos personales', 'datos del cliente', 'datos de servicio', 'datos del vehiculo', 'datos del vehículo', 'datos del riesgo', 'general data', 'vehicle data'] },
    { key: 'formas_pago', patterns: ['formas de pago', 'opciones de pago', 'payment options', 'payment methods'] },
    { key: 'seccion_1', patterns: ['seccion i', 'sección i', 'seccion 1', 'sección 1'] },
    { key: 'seccion_2', patterns: ['seccion ii', 'sección ii', 'seccion 2', 'sección 2'] },
    { key: 'seccion_3', patterns: ['seccion iii', 'sección iii', 'seccion 3', 'sección 3'] },
    { key: 'coberturas_principales', patterns: ['coberturas principales', 'main coverages'] },
    { key: 'coberturas_adicionales', patterns: ['coberturas adicionales', 'additional coverages'] },
    { key: 'beneficios_adicionales', patterns: ['beneficios adicionales', 'additional benefits'] },
    { key: 'asistencia', patterns: ['asistencia vial', 'beneficios de asistencia', 'roadside assistance'] },
    { key: 'exclusiones', patterns: ['exclusiones', 'exclusions'] },
    { key: 'condiciones', patterns: ['condiciones', 'importante', 'important', 'terms and conditions'] },
    { key: 'pasos_contratacion', patterns: ['pasos para contratar', 'como contratar', 'how to purchase'] },
    { key: 'notas', patterns: ['observaciones', 'notas', 'notes'] },
    { key: 'vigencia_agente', patterns: ['cotizacion valida', 'cotización válida', 'datos agente', 'agent data', 'valid until'] }
  ];
  var SENSITIVE_LABEL_PATTERNS = [
    'cliente', 'nombre', 'correo', 'email', 'telefono', 'teléfono', 'documento', 'dpi', 'cedula', 'cédula',
    'nit', 'placa', 'intermediario', 'agente', 'direccion', 'dirección', 'fecha de nacimiento'
  ];

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function slug(value) { return norm(value).replace(/\s+/g, '_'); }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function stableId(prefix, parts) {
    var text = (parts || []).map(norm).join('|'), hash = 0;
    for (var i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return prefix + '_' + Math.abs(hash).toString(36);
  }
  function structuralSanitize(value) {
    var contract = Orbit.documentSourceContractP04;
    return contract && typeof contract.sanitize === 'function'
      ? contract.sanitize(value, { redactSamples: false, maxArray: 250 }, 0)
      : clone(value || {});
  }
  function isSensitiveLabel(label) {
    var value = norm(label);
    return SENSITIVE_LABEL_PATTERNS.some(function (pattern) { return value.indexOf(norm(pattern)) >= 0; });
  }
  function redactSensitive(value) {
    if (value == null || value === '') return value;
    return '[valor_sensible_omitido]';
  }
  function bbox(input) {
    input = input || {};
    return {
      x: Number(input.x || 0), y: Number(input.y || 0),
      width: Number(input.width || input.w || 0), height: Number(input.height || input.h || 0)
    };
  }
  function sourceLocation(input, pageNumber, index) {
    input = input || {};
    return {
      mediaKind: 'pdf',
      page: Number(input.page || pageNumber || 0),
      block: clean(input.block || input.id || ('block_' + (index + 1))),
      bbox: bbox(input.bbox || input.box || {}),
      order: Number(input.order != null ? input.order : index),
      textHash: clean(input.textHash || input.hash || ''),
      parserMethod: clean(input.parserMethod || input.method || 'provider_structured_pdf'),
      containsRawPayload: false,
      containsCustomerPayload: false
    };
  }
  function classifySection(title, customRules) {
    var value = norm(title);
    var rules = Array.isArray(customRules) && customRules.length ? customRules : SECTION_RULES;
    for (var i = 0; i < rules.length; i += 1) {
      var patterns = rules[i].patterns || [];
      for (var j = 0; j < patterns.length; j += 1) {
        if (value.indexOf(norm(patterns[j])) >= 0) return clean(rules[i].key || 'otra');
      }
    }
    return slug(title) || 'otra';
  }
  function normalizeField(input, ctx, index) {
    input = input || {};
    ctx = ctx || {};
    var label = clean(input.label || input.etiqueta || input.name || input.nombre || 'Campo');
    var value = input.value != null ? input.value : (input.valor != null ? input.valor : input.text);
    var sensitive = input.sensitive === true || isSensitiveLabel(label);
    var purpose = clean(ctx.purpose || 'training');
    if (purpose === 'training' && sensitive) value = redactSensitive(value);
    return {
      id: clean(input.id) || stableId('pdf_field', [ctx.documentId, ctx.page, ctx.sectionId, label, index || 0]),
      claveCanonica: clean(input.canonicalKey || input.claveCanonica || input.key),
      etiquetaFuente: label,
      valorFuente: structuralSanitize(value),
      valorCanonico: structuralSanitize(input.canonicalValue != null ? input.canonicalValue : input.valorCanonico),
      tipo: clean(input.valueType || input.tipo || 'texto'),
      moneda: clean(input.currency || input.moneda).toUpperCase(),
      unidad: clean(input.unit || input.unidad),
      incluido: input.included === true || input.incluido === true,
      orden: Number(input.order != null ? input.order : index),
      confianza: Math.max(0, Math.min(100, Number(input.confidence || input.confianza || 0))),
      sensible: sensitive,
      sourceLocation: sourceLocation(input.sourceLocation || input, ctx.page, index),
      observaciones: clean(input.notes || input.observaciones)
    };
  }
  function fieldsFromTable(table, ctx, baseOrder) {
    table = table || {};
    var rows = Array.isArray(table.rows) ? table.rows : [];
    var out = [];
    rows.forEach(function (row, rowIndex) {
      if (Array.isArray(row)) {
        var label = clean(row[0]);
        var value = row.length > 2 ? row.slice(1) : row[1];
        out.push(normalizeField({
          label: label || ('Fila ' + (rowIndex + 1)),
          value: value,
          tipo: 'fila_tabla',
          order: baseOrder + rowIndex,
          sourceLocation: Object.assign({}, table.sourceLocation || {}, { block: clean(table.id) || 'table_row_' + (rowIndex + 1) })
        }, ctx, baseOrder + rowIndex));
      } else if (row && typeof row === 'object') {
        out.push(normalizeField(Object.assign({}, row, {
          order: row.order != null ? row.order : baseOrder + rowIndex,
          sourceLocation: Object.assign({}, table.sourceLocation || {}, row.sourceLocation || {})
        }), ctx, baseOrder + rowIndex));
      }
    });
    return out;
  }
  function normalizeBlock(input, ctx, index) {
    input = input || {};
    ctx = ctx || {};
    var kind = clean(input.kind || input.type || 'other');
    if (BLOCK_KINDS.indexOf(kind) < 0) kind = 'other';
    return {
      id: clean(input.id) || stableId('pdf_block', [ctx.documentId, ctx.page, index || 0, input.text || input.title]),
      kind: kind,
      title: clean(input.title || input.heading || input.label),
      text: clean(input.text || input.paragraph || input.content),
      fields: Array.isArray(input.fields) ? input.fields.map(function (field, fieldIndex) {
        return normalizeField(field, Object.assign({}, ctx, { sectionId: input.id }), fieldIndex);
      }) : [],
      tableFields: kind === 'table' ? fieldsFromTable(input, Object.assign({}, ctx, { sectionId: input.id }), index * 100) : [],
      layout: structuralSanitize(input.layout || input.style || {}),
      sourceLocation: sourceLocation(input.sourceLocation || input, ctx.page, index),
      order: Number(input.order != null ? input.order : index),
      confidence: Math.max(0, Math.min(100, Number(input.confidence || 0)))
    };
  }
  function normalizePage(input, ctx, index) {
    input = input || {};
    ctx = ctx || {};
    var number = Number(input.number || input.page || index + 1);
    var blocks = (input.blocks || []).map(function (block, blockIndex) {
      return normalizeBlock(block, Object.assign({}, ctx, { page: number }), blockIndex);
    }).sort(function (a, b) { return a.order - b.order; });
    var contentLength = blocks.reduce(function (sum, block) {
      return sum + clean(block.title).length + clean(block.text).length + block.fields.length + block.tableFields.length;
    }, 0);
    return {
      number: number,
      width: Number(input.width || 0),
      height: Number(input.height || 0),
      orientation: clean(input.orientation),
      blocks: blocks,
      blank: input.blank === true || contentLength === 0,
      backgroundStyle: structuralSanitize(input.backgroundStyle || {}),
      sourceLocation: { mediaKind: 'pdf', page: number, block: '', bbox: bbox({ x: 0, y: 0, width: input.width, height: input.height }) }
    };
  }
  function sectionFromInput(input, ctx, index) {
    input = input || {};
    ctx = ctx || {};
    var title = clean(input.title || input.titulo || input.heading || ('Sección ' + (index + 1)));
    var key = clean(input.key || input.clave || classifySection(title, ctx.sectionRules));
    var fields = [];
    (input.fields || input.campos || []).forEach(function (field, fieldIndex) {
      fields.push(normalizeField(field, Object.assign({}, ctx, { sectionId: input.id, page: input.page }), fieldIndex));
    });
    (input.tables || []).forEach(function (table, tableIndex) {
      fields = fields.concat(fieldsFromTable(table, Object.assign({}, ctx, { sectionId: input.id, page: input.page }), (tableIndex + 1) * 100));
    });
    return {
      id: clean(input.id) || stableId('pdf_section', [ctx.documentId, title, index || 0]),
      clave: key,
      tituloFuente: title,
      subtituloFuente: clean(input.subtitle || input.subtitulo),
      orden: Number(input.order != null ? input.order : index),
      visible: input.visible !== false,
      repetible: input.repeatable === true || input.repetible === true,
      estiloFuente: structuralSanitize(input.style || input.estiloFuente || {}),
      campos: fields.sort(function (a, b) { return a.orden - b.orden; }),
      sourceLocation: sourceLocation(input.sourceLocation || input, input.page, index),
      observaciones: clean(input.notes || input.observaciones)
    };
  }
  function sectionsFromPages(pages, ctx) {
    var sections = [], active = null, sectionOrder = 0;
    function ensureSection(block, page) {
      if (active) return active;
      active = sectionFromInput({
        title: 'Contenido general', key: 'datos_generales', page: page.number,
        sourceLocation: block.sourceLocation, order: sectionOrder++
      }, ctx, sectionOrder);
      sections.push(active);
      return active;
    }
    pages.forEach(function (page) {
      if (page.blank) return;
      page.blocks.forEach(function (block, blockIndex) {
        if (block.kind === 'heading' && (block.title || block.text)) {
          active = sectionFromInput({
            id: block.id,
            title: block.title || block.text,
            key: classifySection(block.title || block.text, ctx.sectionRules),
            page: page.number,
            style: block.layout,
            sourceLocation: block.sourceLocation,
            order: sectionOrder++
          }, ctx, sectionOrder);
          sections.push(active);
          return;
        }
        var section = ensureSection(block, page);
        var blockCtx = Object.assign({}, ctx, { sectionId: section.id, page: page.number });
        if (block.kind === 'field') {
          section.campos = section.campos.concat(block.fields.length ? block.fields : [normalizeField({
            label: block.title || 'Campo', value: block.text, order: blockIndex,
            sourceLocation: block.sourceLocation
          }, blockCtx, blockIndex)]);
        } else if (block.kind === 'table') {
          section.campos = section.campos.concat(block.tableFields);
        } else if (block.kind === 'paragraph' || block.kind === 'note' || block.kind === 'icon_grid' || block.kind === 'other') {
          section.campos.push(normalizeField({
            label: block.title || (block.kind === 'note' ? 'Nota' : 'Contenido'),
            value: block.text,
            tipo: block.kind,
            order: blockIndex,
            sourceLocation: block.sourceLocation
          }, blockCtx, blockIndex));
        }
      });
    });
    return sections.map(function (section) {
      section.campos.sort(function (a, b) { return a.orden - b.orden; });
      return section;
    }).filter(function (section) { return section.campos.length || section.tituloFuente; });
  }
  function normalizeInsurerCandidate(input, index) {
    input = input || {};
    return {
      id: clean(input.id || input.directoryId || input.aseguradoraId),
      name: clean(input.name || input.nombre),
      normalizedName: norm(input.name || input.nombre),
      confidence: Math.max(0, Math.min(100, Number(input.confidence || input.confianza || 0))),
      source: clean(input.source || input.fuente || 'provider'),
      evidence: structuralSanitize(input.evidence || input.evidencia || {}),
      order: index
    };
  }
  function resolveInsurer(candidates) {
    var list = (candidates || []).map(normalizeInsurerCandidate).filter(function (item) { return item.id || item.name; })
      .sort(function (a, b) { return b.confidence - a.confidence; });
    var top = list[0] || null, second = list[1] || null;
    var accepted = !!(top && top.confidence >= 85 && (!second || top.confidence - second.confidence >= 5));
    return {
      status: accepted ? 'proposed_high_confidence' : (top ? 'requires_validation' : 'not_detected'),
      candidate: accepted ? top : null,
      topCandidate: top,
      candidates: list,
      requiresHumanValidation: !accepted
    };
  }
  function normalizeDimensions(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var schema = Orbit.cotizacionEsquemaAseguradoraP0;
    if (schema && typeof schema.normalizeDimensions === 'function') return schema.normalizeDimensions(input, ctx);
    return {
      pais: clean(input.pais || ctx.pais).toUpperCase(), moneda: clean(input.moneda || ctx.moneda).toUpperCase(),
      ramo: clean(input.ramo || ctx.ramo), producto: clean(input.producto || ctx.producto),
      familiaProducto: clean(input.familiaProducto || ctx.familiaProducto), subtipoProducto: clean(input.subtipoProducto || ctx.subtipoProducto),
      segmento: clean(input.segmento || ctx.segmento), tipoRiesgo: clean(input.tipoRiesgo || ctx.tipoRiesgo),
      tipoVehiculo: clean(input.tipoVehiculo || ctx.tipoVehiculo), usoVehiculo: clean(input.usoVehiculo || ctx.usoVehiculo),
      plan: clean(input.plan || ctx.plan)
    };
  }
  function buildProviderRequest(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var purpose = clean(input.purpose || ctx.purpose || 'training');
    if (PURPOSES.indexOf(purpose) < 0) purpose = 'training';
    return {
      tenantId: clean(input.tenantId || ctx.tenantId),
      entityType: 'aseguradora',
      aseguradoraId: clean(input.aseguradoraId || ctx.aseguradoraId),
      documentId: clean(input.documentId || ctx.documentId),
      fileRef: clean(input.fileRef || input.archivoRef || ctx.fileRef),
      sourceHash: clean(input.sourceHash || ctx.sourceHash),
      purpose: purpose,
      mediaKind: 'pdf',
      includeText: true,
      includeLayout: true,
      includeTables: true,
      includeImages: true,
      detectLogos: true,
      detectBlankPages: true,
      preserveReadingOrder: true,
      preserveOriginalLabels: true,
      includeSensitiveValues: purpose === 'operational' && input.includeSensitiveValues === true,
      returnRawBytes: false,
      returnBase64: false,
      returnTokens: false,
      executeEmbeddedContent: false,
      requiresPageBlockEvidence: true
    };
  }
  function buildQuoteProfile(extraction, ctx) {
    extraction = extraction || {};
    ctx = ctx || {};
    var request = buildProviderRequest(extraction, ctx);
    var documentId = clean(extraction.documentId || request.documentId || stableId('pdf_quote', [request.fileRef, request.sourceHash]));
    var pages = (extraction.pages || []).map(function (page, index) {
      return normalizePage(page, { documentId: documentId, purpose: request.purpose }, index);
    }).sort(function (a, b) { return a.number - b.number; });
    var dimensions = normalizeDimensions(extraction.dimensiones || extraction, ctx);
    var insurer = resolveInsurer(extraction.insurerCandidates || extraction.aseguradoraCandidates || []);
    var sections = Array.isArray(extraction.sections) && extraction.sections.length
      ? extraction.sections.map(function (section, index) {
        return sectionFromInput(section, { documentId: documentId, purpose: request.purpose, sectionRules: extraction.sectionRules }, index);
      }).sort(function (a, b) { return a.orden - b.orden; })
      : sectionsFromPages(pages, { documentId: documentId, purpose: request.purpose, sectionRules: extraction.sectionRules });
    var insurerId = clean(extraction.aseguradoraId || ctx.aseguradoraId || insurer.candidate && insurer.candidate.id);
    var presentationInput = {
      id: clean(extraction.presentationId) || stableId('pdf_presentation', [documentId, insurerId, dimensions.producto, dimensions.tipoVehiculo, dimensions.plan]),
      tenantId: clean(extraction.tenantId || ctx.tenantId),
      aseguradoraId: insurerId,
      pais: dimensions.pais,
      moneda: dimensions.moneda,
      ramo: dimensions.ramo,
      producto: dimensions.producto,
      familiaProducto: dimensions.familiaProducto,
      subtipoProducto: dimensions.subtipoProducto,
      segmento: dimensions.segmento,
      tipoRiesgo: dimensions.tipoRiesgo,
      tipoVehiculo: dimensions.tipoVehiculo,
      usoVehiculo: dimensions.usoVehiculo,
      plan: dimensions.plan,
      nombreFormatoFuente: clean(extraction.formatName || extraction.nombreFormatoFuente || 'Cotización PDF'),
      documentoFuenteId: documentId,
      versionFuente: clean(extraction.versionFuente || extraction.version || 'v1'),
      plantillaVersion: clean(extraction.plantillaVersion || 'v1'),
      conservarTitulosFuente: true,
      conservarOrdenFuente: true,
      conservarCamposNoCanonicos: true,
      brandingTenant: true,
      secciones: sections,
      encabezado: structuralSanitize(extraction.header || extraction.encabezado || {}),
      pie: structuralSanitize(extraction.footer || extraction.pie || {}),
      advertencias: [],
      estado: 'requiere_validacion',
      confianza: Math.max(0, Math.min(100, Number(extraction.confidence || extraction.confianza || 0))),
      trazabilidad: {
        adapter: 'pdf_quote_adapter_p07',
        documentId: documentId,
        pageCount: pages.length,
        blankPages: pages.filter(function (page) { return page.blank; }).map(function (page) { return page.number; }),
        sourceHash: request.sourceHash,
        fileRef: request.fileRef,
        purpose: request.purpose
      }
    };
    var schema = Orbit.cotizacionEsquemaAseguradoraP0;
    var presentation = schema && typeof schema.normalizePresentation === 'function'
      ? schema.normalizePresentation(presentationInput, ctx)
      : presentationInput;
    var warnings = [];
    if (!insurerId) warnings.push('ASEGURADORA_REQUIERE_VALIDACION');
    if (!dimensions.producto) warnings.push('PRODUCTO_REQUIERE_VALIDACION');
    if (!sections.length) warnings.push('SECCIONES_REQUIEREN_VALIDACION');
    if (pages.some(function (page) { return page.blank; })) warnings.push('PAGINAS_VACIAS_DETECTADAS');
    if (request.purpose === 'training' && request.includeSensitiveValues) warnings.push('SENSITIVE_VALUES_FORCED_OFF');
    presentation.advertencias = unique((presentation.advertencias || []).concat(warnings));
    return {
      id: clean(extraction.id) || stableId('pdf_quote_profile', [documentId, insurerId, dimensions.producto, dimensions.tipoVehiculo, dimensions.plan]),
      tenantId: clean(extraction.tenantId || ctx.tenantId),
      documentId: documentId,
      sourceType: 'cotizacion_pdf_oficial',
      purpose: request.purpose,
      insurerResolution: insurer,
      dimensiones: dimensions,
      pages: pages,
      presentation: presentation,
      documentUses: ['presentacion_cotizacion', 'extraccion_comparativo', 'condiciones_beneficios', 'casos_prueba', 'entrenamiento_extraccion'],
      renderingPolicy: {
        preserveOriginalOrder: true,
        preserveOriginalLabels: true,
        preserveNonCanonicalFields: true,
        preserveTablesAndIconGroups: true,
        tenantBrandingOverlay: true,
        sourceStyleReference: true,
        pixelCopyRequired: false
      },
      warnings: warnings,
      estado: 'requiere_validacion',
      approved: false,
      enabledCotizador: false,
      enabledComparativo: false,
      writeAllowed: false,
      requiresHumanValidation: true,
      requiresSecondGateForEnablement: true
    };
  }
  function validateQuoteProfile(profile) {
    profile = profile || {};
    var errors = [], warnings = [];
    if (!profile.tenantId) errors.push('TENANT_REQUERIDO');
    if (!profile.documentId) errors.push('DOCUMENTO_REQUERIDO');
    if (!profile.dimensiones || !profile.dimensiones.pais) errors.push('PAIS_REQUIERE_VALIDACION');
    if (!profile.dimensiones || !profile.dimensiones.producto) errors.push('PRODUCTO_REQUIERE_VALIDACION');
    if (!profile.insurerResolution || !profile.insurerResolution.candidate) errors.push('ASEGURADORA_REQUIERE_VALIDACION');
    if (!profile.presentation || !Array.isArray(profile.presentation.secciones) || !profile.presentation.secciones.length) errors.push('SECCIONES_REQUERIDAS');
    if (profile.pages && profile.pages.filter(function (page) { return !page.blank; }).length === 0) errors.push('PDF_SIN_CONTENIDO');
    if (profile.pages && profile.pages.some(function (page) { return page.blank; })) warnings.push('PAGINAS_VACIAS_DETECTADAS');
    if (profile.presentation && profile.presentation.secciones) {
      profile.presentation.secciones.forEach(function (section, index) {
        if (!section.tituloFuente) errors.push('TITULO_SECCION_REQUERIDO:' + index);
        if (!section.campos || !section.campos.length) warnings.push('SECCION_SIN_CAMPOS:' + index);
      });
    }
    return { valid: errors.length === 0, errors: unique(errors), warnings: unique(warnings) };
  }
  function profileSignature(profile) {
    profile = profile || {};
    var sections = profile.presentation && profile.presentation.secciones || [];
    return sections.map(function (section) {
      return slug(section.clave || section.tituloFuente) + ':' + section.campos.map(function (field) { return slug(field.etiquetaFuente); }).join(',');
    }).join('|');
  }
  function familyKey(profile) {
    profile = profile || {};
    var d = profile.dimensiones || {};
    var insurer = profile.insurerResolution && (profile.insurerResolution.candidate || profile.insurerResolution.topCandidate) || {};
    return [profile.tenantId, insurer.id || insurer.normalizedName, d.pais, d.ramo, d.producto].map(slug).join('|');
  }
  function variantKey(profile) {
    profile = profile || {};
    var d = profile.dimensiones || {};
    return [d.familiaProducto, d.subtipoProducto, d.segmento, d.tipoRiesgo, d.tipoVehiculo, d.usoVehiculo, d.plan].map(function (value) { return slug(value) || '*'; }).join('|');
  }
  function buildTemplateFamily(profiles) {
    var validProfiles = (profiles || []).filter(Boolean);
    var grouped = {};
    validProfiles.forEach(function (profile) {
      var key = familyKey(profile);
      grouped[key] = grouped[key] || [];
      grouped[key].push(profile);
    });
    return Object.keys(grouped).map(function (key) {
      var list = grouped[key];
      var sectionPresence = {};
      list.forEach(function (profile) {
        var keys = unique((profile.presentation && profile.presentation.secciones || []).map(function (section) { return clean(section.clave || section.tituloFuente); }));
        keys.forEach(function (sectionKey) { sectionPresence[sectionKey] = (sectionPresence[sectionKey] || 0) + 1; });
      });
      return {
        familyKey: key,
        profiles: list.map(function (profile) { return profile.id; }),
        variants: list.map(function (profile) {
          return { profileId: profile.id, variantKey: variantKey(profile), dimensiones: clone(profile.dimensiones), signature: profileSignature(profile) };
        }),
        commonSections: Object.keys(sectionPresence).filter(function (sectionKey) { return sectionPresence[sectionKey] === list.length; }),
        variableSections: Object.keys(sectionPresence).filter(function (sectionKey) { return sectionPresence[sectionKey] !== list.length; }),
        requiresVariantRouting: unique(list.map(variantKey)).length > 1,
        mergeProfiles: false,
        requiresHumanValidation: true
      };
    });
  }
  function buildProfileDiff(before, after) {
    before = before || {};
    after = after || {};
    var contract = Orbit.documentSourceContractP04;
    var left = {
      insurer: before.insurerResolution && before.insurerResolution.topCandidate,
      dimensiones: before.dimensiones,
      presentation: before.presentation,
      pages: before.pages && before.pages.map(function (page) { return { number: page.number, blank: page.blank }; })
    };
    var right = {
      insurer: after.insurerResolution && after.insurerResolution.topCandidate,
      dimensiones: after.dimensiones,
      presentation: after.presentation,
      pages: after.pages && after.pages.map(function (page) { return { number: page.number, blank: page.blank }; })
    };
    return contract && typeof contract.buildDiff === 'function'
      ? contract.buildDiff(left, right, ['insurer', 'dimensiones', 'presentation', 'pages'])
      : [{ field: 'profile', before: structuralSanitize(left), after: structuralSanitize(right), status: 'requires_validation' }];
  }
  async function extractWithProvider(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var provider = input.provider || window.OrbitPdfQuoteExtractionProviderP07 || Orbit.pdfQuoteExtractionProviderP07;
    var extract = provider && (provider.extractQuote || provider.extractDocument || provider.extractPdf);
    if (typeof extract !== 'function') return { ok: false, code: 'BACKEND_REQUIRED', profile: null, writeAllowed: false };
    var request = buildProviderRequest(input, ctx);
    try {
      var response = await extract(request);
      var profile = buildQuoteProfile(Object.assign({}, response || {}, {
        tenantId: request.tenantId,
        documentId: request.documentId,
        fileRef: request.fileRef,
        sourceHash: request.sourceHash,
        purpose: request.purpose,
        aseguradoraId: request.aseguradoraId
      }), ctx);
      var validation = validateQuoteProfile(profile);
      return {
        ok: true,
        code: validation.valid ? 'PDF_QUOTE_PROFILE_READY' : 'PDF_QUOTE_REQUIRES_VALIDATION',
        request: request,
        profile: profile,
        validation: validation,
        writeAllowed: false,
        approved: false,
        requiresHumanValidation: true,
        requiresSecondGateForEnablement: true
      };
    } catch (error) {
      return { ok: false, code: clean(error && error.code) || 'PDF_EXTRACTION_FAILED', profile: null, writeAllowed: false };
    }
  }

  Orbit.pdfQuoteAdapterP07 = {
    PURPOSES: PURPOSES.slice(),
    BLOCK_KINDS: BLOCK_KINDS.slice(),
    SECTION_RULES: clone(SECTION_RULES),
    classifySection: classifySection,
    isSensitiveLabel: isSensitiveLabel,
    normalizeField: normalizeField,
    normalizeBlock: normalizeBlock,
    normalizePage: normalizePage,
    resolveInsurer: resolveInsurer,
    buildProviderRequest: buildProviderRequest,
    buildQuoteProfile: buildQuoteProfile,
    validateQuoteProfile: validateQuoteProfile,
    profileSignature: profileSignature,
    familyKey: familyKey,
    variantKey: variantKey,
    buildTemplateFamily: buildTemplateFamily,
    buildProfileDiff: buildProfileDiff,
    extractWithProvider: extractWithProvider
  };
})();