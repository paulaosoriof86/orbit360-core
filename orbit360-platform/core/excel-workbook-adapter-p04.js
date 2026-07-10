/* ============================================================
   Orbit 360 · Adapter Excel P0.4
   Fecha: 2026-07-10

   Recibe un snapshot estructural sanitizado de XLS/XLSX/XLSM/XLSB.
   No abre archivos, no ejecuta fórmulas/macros, no escribe y no aprueba tarifas.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var SHEET_ROLES = [
    'entrada', 'tarifas', 'reglas_calculo', 'salida_cotizacion', 'catalogos',
    'condiciones_beneficios', 'instrucciones', 'calculo_interno', 'otra'
  ];
  var ROLE_PATTERNS = {
    salida_cotizacion: /cotizaci[oó]n|propuesta|impresi[oó]n|salida|resumen|quote|car[aá]tula|formato/i,
    tarifas: /tarifa|tasa|prima|minim|rate|precio|plan|cuota/i,
    reglas_calculo: /c[aá]lculo|formula|recargo|fraccion|gasto|impuesto|iva|deducible|factor|par[aá]metro/i,
    entrada: /entrada|datos|cotizador|formulario|input|captura|veh[ií]culo|asegurado|solicitud/i,
    catalogos: /lista|cat[aá]logo|marca|l[ií]nea|modelo|departamento|ciudad|municipio|dropdown|validaci[oó]n/i,
    condiciones_beneficios: /condici[oó]n|beneficio|cobertura|exclusi[oó]n|asistencia|cl[aá]usula|anexo/i,
    instrucciones: /instrucci[oó]n|ayuda|manual|readme|gu[ií]a/i,
    calculo_interno: /motor|intern|ocult|helper|auxiliar|tabla|lookup/i
  };
  var VOLATILE_FUNCTIONS = ['NOW', 'TODAY', 'RAND', 'RANDBETWEEN', 'OFFSET', 'INDIRECT', 'CELL', 'INFO'];
  var EXTERNAL_FUNCTIONS = ['WEBSERVICE', 'HYPERLINK', 'RTD', 'CUBE', 'STOCKHISTORY'];

  function C() { return Orbit.documentSourceContractP04 || null; }
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function safeArray(value, limit) { return Array.isArray(value) ? value.slice(0, limit || 200) : []; }
  function bool(value) { return value === true; }
  function number(value) { var n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
  function visibility(value) {
    var n = norm(value || 'visible');
    if (n === 'veryhidden' || n === 'very_hidden') return 'veryHidden';
    if (n === 'hidden' || n === 'oculta' || n === 'oculto') return 'hidden';
    return 'visible';
  }
  function normalizeFormulaFunctions(values) {
    return unique(safeArray(values, 200).map(function (value) { return clean(value).toUpperCase(); }).filter(Boolean));
  }
  function keywordScore(text, pattern) {
    var matches = clean(text).match(pattern);
    return matches ? Math.min(50, matches.length * 18) : 0;
  }

  function classifySheet(sheet) {
    sheet = sheet || {};
    var text = [sheet.name, sheet.title, sheet.purpose].concat(sheet.labels || [], sheet.namedRanges || []).join(' ');
    var scores = {};
    Object.keys(ROLE_PATTERNS).forEach(function (role) { scores[role] = keywordScore(text, ROLE_PATTERNS[role]); });
    if (number(sheet.printAreaCount) || (sheet.print && safeArray(sheet.print.areas, 20).length)) scores.salida_cotizacion += 35;
    if (number(sheet.dataValidationCount) > 0) { scores.entrada += 15; scores.catalogos += 12; }
    if (number(sheet.formulaCount) > 0) scores.reglas_calculo += Math.min(30, Math.ceil(number(sheet.formulaCount) / 10));
    if (visibility(sheet.visibility) !== 'visible') scores.calculo_interno += 18;
    if (number(sheet.numericConstantCount) > 20) scores.tarifas += 12;
    if (safeArray(sheet.sectionLabels, 100).some(function (label) { return /secci[oó]n\s*[123]|beneficio|exclusi[oó]n|cobertura/i.test(label); })) {
      scores.condiciones_beneficios += 25;
      scores.salida_cotizacion += 15;
    }
    var ranked = Object.keys(scores).map(function (role) { return { role: role, score: scores[role] }; })
      .sort(function (a, b) { return b.score - a.score || a.role.localeCompare(b.role); });
    var selected = ranked[0] && ranked[0].score >= 18 ? ranked[0].role : 'otra';
    return {
      role: SHEET_ROLES.indexOf(selected) >= 0 ? selected : 'otra',
      score: ranked[0] ? ranked[0].score : 0,
      alternatives: ranked.slice(1, 4).filter(function (item) { return item.score > 0; })
    };
  }

  function normalizePrintProfile(input) {
    input = input || {};
    return {
      areas: safeArray(input.areas || input.printAreas, 50).map(clean).filter(Boolean),
      titlesRows: clean(input.titlesRows || input.repeatRows),
      titlesColumns: clean(input.titlesColumns || input.repeatColumns),
      orientation: clean(input.orientation),
      paperSize: clean(input.paperSize),
      fitToWidth: number(input.fitToWidth),
      fitToHeight: number(input.fitToHeight),
      scale: number(input.scale),
      margins: C() ? C().sanitize(input.margins || {}, {}, 0) : {},
      header: clean(input.header),
      footer: clean(input.footer),
      centerHorizontally: bool(input.centerHorizontally),
      centerVertically: bool(input.centerVertically)
    };
  }

  function normalizeSheet(input, index) {
    input = input || {};
    var functions = normalizeFormulaFunctions(input.formulaFunctions || input.functions);
    var print = normalizePrintProfile(input.print || {});
    var normalized = {
      id: clean(input.id) || 'sheet_' + (index + 1),
      index: number(input.index != null ? input.index : index),
      name: clean(input.name || input.nombre || ('Hoja ' + (index + 1))),
      visibility: visibility(input.visibility || input.estado),
      usedRange: clean(input.usedRange || input.rangoUsado),
      rowCount: number(input.rowCount || input.rows),
      columnCount: number(input.columnCount || input.columns),
      formulaCount: number(input.formulaCount),
      numericConstantCount: number(input.numericConstantCount),
      textConstantCount: number(input.textConstantCount),
      blankCellCount: number(input.blankCellCount),
      formulaFunctions: functions,
      formulaFingerprint: clean(input.formulaFingerprint),
      formulaErrorCount: number(input.formulaErrorCount),
      circularReferenceCount: number(input.circularReferenceCount),
      dataValidationCount: number(input.dataValidationCount),
      conditionalFormatCount: number(input.conditionalFormatCount),
      mergedRanges: safeArray(input.mergedRanges, 100).map(clean).filter(Boolean),
      tableNames: safeArray(input.tableNames || input.tables, 100).map(function (item) { return clean(item.name || item); }).filter(Boolean),
      namedRanges: safeArray(input.namedRanges, 100).map(function (item) { return clean(item.name || item); }).filter(Boolean),
      labels: safeArray(input.labels || input.sampleLabels, 100).map(function (item) { return C() ? C().redactSample(item) : clean(item); }).filter(Boolean),
      sectionLabels: safeArray(input.sectionLabels, 100).map(clean).filter(Boolean),
      print: print,
      printAreaCount: print.areas.length,
      hasExternalReferences: bool(input.hasExternalReferences),
      protected: bool(input.protected),
      roleProposal: null,
      sourceLocation: { sheet: clean(input.name || input.nombre || ('Hoja ' + (index + 1))), index: number(input.index != null ? input.index : index) }
    };
    normalized.roleProposal = classifySheet(normalized);
    return normalized;
  }

  function normalizeDefinedName(input, index) {
    input = input || {};
    return {
      id: clean(input.id) || 'name_' + (index + 1),
      name: clean(input.name),
      scopeSheet: clean(input.scopeSheet),
      refersTo: clean(input.refersTo),
      hidden: bool(input.hidden),
      externalReference: bool(input.externalReference) || /\[[^\]]+\]/.test(clean(input.refersTo))
    };
  }

  function normalizeWorkbookSnapshot(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var sheets = safeArray(input.worksheets || input.sheets, 500).map(normalizeSheet);
    var definedNames = safeArray(input.definedNames || input.names, 500).map(normalizeDefinedName);
    return {
      format: clean(input.format || input.extension).toLowerCase(),
      workbookFingerprint: clean(input.workbookFingerprint || input.fingerprint),
      dateSystem: clean(input.dateSystem || '1900'),
      calculationMode: clean(input.calculationMode || input.calcMode || 'unknown'),
      worksheetCount: sheets.length,
      worksheets: sheets,
      definedNames: definedNames,
      definedNameCount: definedNames.length,
      hasMacros: bool(input.hasMacros || input.vbaProjectPresent),
      macrosExecuted: false,
      formulasExecuted: false,
      externalLinks: safeArray(input.externalLinks, 100).map(function (item) { return clean(item.name || item.target || item); }).filter(Boolean),
      externalLinkCount: number(input.externalLinkCount || safeArray(input.externalLinks, 100).length),
      connectionCount: number(input.connectionCount || safeArray(input.connections, 100).length),
      protectedWorkbook: bool(input.protectedWorkbook),
      customXmlCount: number(input.customXmlCount),
      warningsFromParser: safeArray(input.warnings, 100).map(clean).filter(Boolean),
      parser: {
        provider: clean(input.parser && input.parser.provider || ctx.parserProvider),
        version: clean(input.parser && input.parser.version || ctx.parserVersion),
        generatedAt: clean(input.parser && input.parser.generatedAt || input.generatedAt)
      }
    };
  }

  function workbookWarnings(workbook) {
    var warnings = safeArray(workbook.warningsFromParser, 100).slice();
    if (workbook.hasMacros) warnings.push('MACROS_DETECTADAS_NO_EJECUTADAS');
    if (workbook.externalLinkCount) warnings.push('VINCULOS_EXTERNOS_REQUIEREN_VALIDACION');
    if (workbook.connectionCount) warnings.push('CONEXIONES_EXTERNAS_REQUIEREN_VALIDACION');
    if (workbook.protectedWorkbook) warnings.push('LIBRO_PROTEGIDO');
    if (workbook.worksheets.some(function (sheet) { return sheet.visibility === 'veryHidden'; })) warnings.push('HOJAS_MUY_OCULTAS_REQUIEREN_REVISION');
    if (workbook.worksheets.some(function (sheet) { return sheet.circularReferenceCount > 0; })) warnings.push('REFERENCIAS_CIRCULARES_DETECTADAS');
    if (workbook.worksheets.some(function (sheet) { return sheet.formulaErrorCount > 0; })) warnings.push('ERRORES_DE_FORMULA_DETECTADOS');
    if (workbook.definedNames.some(function (name) { return name.externalReference; })) warnings.push('NOMBRES_CON_REFERENCIA_EXTERNA');
    return unique(warnings);
  }

  function summarizeRoles(workbook) {
    var counts = {};
    workbook.worksheets.forEach(function (sheet) {
      var role = sheet.roleProposal.role;
      counts[role] = (counts[role] || 0) + 1;
    });
    return counts;
  }

  function proposeCapabilities(workbook) {
    var roles = summarizeRoles(workbook);
    var functions = unique([].concat.apply([], workbook.worksheets.map(function (sheet) { return sheet.formulaFunctions; })));
    var formulaCount = workbook.worksheets.reduce(function (sum, sheet) { return sum + sheet.formulaCount; }, 0);
    var validations = workbook.worksheets.reduce(function (sum, sheet) { return sum + sheet.dataValidationCount; }, 0);
    var printAreas = workbook.worksheets.reduce(function (sum, sheet) { return sum + sheet.printAreaCount; }, 0);
    var hasRates = !!roles.tarifas;
    var hasRules = !!roles.reglas_calculo || formulaCount > 10 || workbook.definedNameCount > 3;
    var hasInput = !!roles.entrada || validations > 0;
    var hasOutput = !!roles.salida_cotizacion || printAreas > 0;
    var hasCatalogs = !!roles.catalogos || validations > 2;
    var hasConditions = !!roles.condiciones_beneficios;
    var sourceType = 'otro';
    if (hasRates && hasOutput && (hasRules || hasInput)) sourceType = 'cotizador_excel_salida';
    else if (hasRates) sourceType = 'tarifario_excel';
    else if (hasOutput && hasInput && hasRules) sourceType = 'cotizador_excel_salida';
    var confidence = sourceType === 'cotizador_excel_salida' ? 85 : sourceType === 'tarifario_excel' ? 75 : 35;
    if (workbook.hasMacros || workbook.externalLinkCount || workbook.connectionCount) confidence -= 10;
    return {
      sourceTypeProposal: sourceType,
      confidence: Math.max(0, Math.min(100, confidence)),
      containsRatesProposal: hasRates,
      containsCalculationRulesProposal: hasRules,
      containsInputFormProposal: hasInput,
      containsOutputSheetProposal: hasOutput,
      containsPrintAreaProposal: printAreas > 0,
      containsPresentationProposal: hasOutput && printAreas > 0,
      containsCatalogsProposal: hasCatalogs,
      containsConditionsProposal: hasConditions,
      requiresExampleQuote: (hasRates || hasRules) && !(hasOutput && printAreas > 0),
      formulaCount: formulaCount,
      dataValidationCount: validations,
      printAreaCount: printAreas,
      formulaFunctions: functions,
      volatileFunctions: functions.filter(function (fn) { return VOLATILE_FUNCTIONS.indexOf(fn) >= 0; }),
      externalFunctions: functions.filter(function (fn) { return EXTERNAL_FUNCTIONS.indexOf(fn) >= 0; }),
      roles: roles,
      requiresHumanValidation: true,
      approved: false
    };
  }

  function buildPresentationProposal(workbook, envelope) {
    var outputSheets = workbook.worksheets.filter(function (sheet) {
      return sheet.roleProposal.role === 'salida_cotizacion' || sheet.printAreaCount > 0;
    });
    return {
      aseguradoraId: envelope.aseguradoraId,
      pais: envelope.pais,
      moneda: envelope.moneda,
      documentoFuenteId: envelope.id,
      versionFuente: envelope.version.label,
      nombreFormatoFuente: outputSheets.map(function (sheet) { return sheet.name; }).join(' / '),
      conservarTitulosFuente: true,
      conservarOrdenFuente: true,
      conservarCamposNoCanonicos: true,
      brandingTenant: true,
      outputSheets: outputSheets.map(function (sheet) {
        return {
          sheet: sheet.name,
          role: sheet.roleProposal.role,
          print: sheet.print,
          sectionLabels: sheet.sectionLabels.slice(),
          sourceLocation: sheet.sourceLocation
        };
      }),
      estado: outputSheets.length ? 'requiere_validacion' : 'sin_presentacion_detectada',
      approved: false
    };
  }

  function buildTrainingSourceProposal(workbook, envelope, capabilities) {
    var proposal = {
      id: 'src_' + envelope.id,
      tenantId: envelope.tenantId,
      aseguradoraId: envelope.aseguradoraId,
      nombre: envelope.file.name,
      tipoFuente: capabilities.sourceTypeProposal,
      documentoFuenteId: envelope.id,
      archivoRef: envelope.file.fileRef,
      version: envelope.version.label,
      pais: envelope.pais,
      moneda: envelope.moneda,
      dimensiones: envelope.dimensiones,
      contieneTarifas: capabilities.containsRatesProposal,
      contieneReglasCalculo: capabilities.containsCalculationRulesProposal,
      contieneHojaSalida: capabilities.containsOutputSheetProposal,
      contieneFormatoCotizacion: capabilities.containsPresentationProposal,
      contieneAreaImpresion: capabilities.containsPrintAreaProposal,
      usos: unique([].concat(
        capabilities.containsRatesProposal ? ['tarifas'] : [],
        capabilities.containsCalculationRulesProposal ? ['reglas_calculo'] : [],
        capabilities.containsPresentationProposal ? ['presentacion_cotizacion'] : [],
        capabilities.containsConditionsProposal ? ['condiciones_beneficios'] : [],
        capabilities.containsOutputSheetProposal ? ['casos_prueba'] : [],
        ['entrenamiento_extraccion']
      )),
      estado: 'requiere_validacion',
      approved: false,
      trazabilidad: { documentId: envelope.id, adapter: 'excel_workbook_p04', workbookFingerprint: workbook.workbookFingerprint }
    };
    var schema = Orbit.cotizacionEsquemaAseguradoraP0;
    return schema && typeof schema.normalizeTrainingSource === 'function'
      ? schema.normalizeTrainingSource(proposal, proposal)
      : proposal;
  }

  function sheetMap(workbook) {
    return (workbook && workbook.worksheets || []).reduce(function (out, sheet) { out[norm(sheet.name)] = sheet; return out; }, {});
  }
  function compareWorkbookSnapshots(current, previous) {
    if (!previous) return { action: 'create_version_proposed', changes: [], sameStructure: false, requiresHumanConfirmation: true };
    var changes = [], currentMap = sheetMap(current), previousMap = sheetMap(previous);
    Object.keys(currentMap).forEach(function (key) {
      var now = currentMap[key], old = previousMap[key];
      if (!old) { changes.push({ type: 'sheet_added', sheet: now.name, status: 'requires_validation' }); return; }
      if (now.visibility !== old.visibility) changes.push({ type: 'sheet_visibility_changed', sheet: now.name, before: old.visibility, after: now.visibility, status: 'requires_validation' });
      if (now.formulaFingerprint && old.formulaFingerprint && now.formulaFingerprint !== old.formulaFingerprint) changes.push({ type: 'formula_fingerprint_changed', sheet: now.name, status: 'requires_validation' });
      if (JSON.stringify(now.print) !== JSON.stringify(old.print)) changes.push({ type: 'print_profile_changed', sheet: now.name, status: 'requires_validation' });
      if (now.dataValidationCount !== old.dataValidationCount) changes.push({ type: 'data_validation_count_changed', sheet: now.name, before: old.dataValidationCount, after: now.dataValidationCount, status: 'requires_validation' });
      if (now.roleProposal.role !== old.roleProposal.role) changes.push({ type: 'sheet_role_proposal_changed', sheet: now.name, before: old.roleProposal.role, after: now.roleProposal.role, status: 'requires_validation' });
    });
    Object.keys(previousMap).forEach(function (key) {
      if (!currentMap[key]) changes.push({ type: 'sheet_removed', sheet: previousMap[key].name, status: 'requires_validation' });
    });
    if (current.hasMacros !== previous.hasMacros) changes.push({ type: 'macro_presence_changed', before: previous.hasMacros, after: current.hasMacros, status: 'requires_validation' });
    if (current.externalLinkCount !== previous.externalLinkCount) changes.push({ type: 'external_link_count_changed', before: previous.externalLinkCount, after: current.externalLinkCount, status: 'requires_validation' });
    if (current.definedNameCount !== previous.definedNameCount) changes.push({ type: 'defined_name_count_changed', before: previous.definedNameCount, after: current.definedNameCount, status: 'requires_validation' });
    var sameFingerprint = !!(current.workbookFingerprint && previous.workbookFingerprint && current.workbookFingerprint === previous.workbookFingerprint);
    return {
      action: sameFingerprint && !changes.length ? 'omit_same_version' : 'new_version_proposed',
      changes: changes,
      sameStructure: !changes.length,
      sameFingerprint: sameFingerprint,
      replaceAllowed: false,
      requiresHumanConfirmation: !(sameFingerprint && !changes.length)
    };
  }

  function buildDryRun(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var contract = C();
    if (!contract) return { ok: false, code: 'DOCUMENT_CONTRACT_REQUIRED', writeAllowed: false };
    var envelope = contract.createEnvelope(Object.assign({}, input, {
      adapterType: 'excel_workbook', adapterVersion: 'p04', mediaKind: 'spreadsheet'
    }), ctx);
    var validation = contract.validateEnvelope(envelope);
    var workbook = normalizeWorkbookSnapshot(input.workbook || input.snapshot || {}, ctx);
    var previousWorkbook = input.previousWorkbook ? normalizeWorkbookSnapshot(input.previousWorkbook, ctx) : null;
    var warnings = workbookWarnings(workbook);
    var capabilities = proposeCapabilities(workbook);
    var sourceProposal = buildTrainingSourceProposal(workbook, envelope, capabilities);
    var presentationProposal = buildPresentationProposal(workbook, envelope);
    var versionProposal = compareWorkbookSnapshots(workbook, previousWorkbook);
    var issues = validation.errors.concat(validation.warnings, warnings);
    if (!workbook.worksheetCount) issues.push('LIBRO_SIN_HOJAS_INVENTARIADAS');
    if (!capabilities.containsRatesProposal && !capabilities.containsCalculationRulesProposal && !capabilities.containsOutputSheetProposal) issues.push('CAPACIDAD_NO_DETERMINADA');
    if (!envelope.pais || !envelope.moneda) issues.push('PAIS_MONEDA_REQUIEREN_VALIDACION');
    return {
      ok: validation.valid && workbook.worksheetCount > 0,
      code: validation.valid ? 'DRY_RUN_READY' : 'REQUIRES_VALIDATION',
      envelope: envelope,
      workbook: workbook,
      capabilities: capabilities,
      sourceProposal: sourceProposal,
      presentationProposal: presentationProposal,
      versionProposal: versionProposal,
      warnings: unique(warnings),
      validationIssues: unique(issues),
      summary: {
        worksheets: workbook.worksheetCount,
        hiddenWorksheets: workbook.worksheets.filter(function (sheet) { return sheet.visibility !== 'visible'; }).length,
        definedNames: workbook.definedNameCount,
        formulaCount: capabilities.formulaCount,
        printAreas: capabilities.printAreaCount,
        sourceTypeProposal: capabilities.sourceTypeProposal,
        requiresExampleQuote: capabilities.requiresExampleQuote,
        macrosDetected: workbook.hasMacros,
        externalLinksDetected: workbook.externalLinkCount > 0
      },
      writeAllowed: false,
      approved: false,
      requiresHumanValidation: true
    };
  }

  function provider(explicit) { return explicit || window.OrbitExcelParserProvider || Orbit.excelParserProvider || null; }
  async function inspectWithProvider(input, ctx) {
    input = input || {};
    var source = provider(input.provider);
    var inspect = source && (source.inspectWorkbook || source.inventoryWorkbook || source.profileWorkbook);
    if (typeof inspect !== 'function') return { ok: false, code: 'BACKEND_REQUIRED', message: 'Conexión de lectura Excel pendiente.', writeAllowed: false };
    try {
      var snapshot = await inspect({
        tenantId: clean(input.tenantId || ctx && ctx.tenantId),
        aseguradoraId: clean(input.aseguradoraId || ctx && ctx.aseguradoraId),
        fileRef: clean(input.fileRef || input.archivoRef || input.file && input.file.fileRef),
        sourceHash: clean(input.sourceHash || input.file && input.file.hash),
        executeMacros: false,
        calculateFormulas: false,
        includeCellValues: false
      });
      return buildDryRun(Object.assign({}, input, { workbook: snapshot }), ctx);
    } catch (error) {
      return { ok: false, code: clean(error && error.code) || 'EXCEL_INSPECTION_FAILED', message: 'No fue posible inventariar el libro de forma segura.', writeAllowed: false };
    }
  }

  window.Orbit.excelWorkbookAdapterP04 = {
    SHEET_ROLES: SHEET_ROLES.slice(),
    classifySheet: classifySheet,
    normalizeSheet: normalizeSheet,
    normalizeWorkbookSnapshot: normalizeWorkbookSnapshot,
    workbookWarnings: workbookWarnings,
    proposeCapabilities: proposeCapabilities,
    buildPresentationProposal: buildPresentationProposal,
    buildTrainingSourceProposal: buildTrainingSourceProposal,
    compareWorkbookSnapshots: compareWorkbookSnapshots,
    buildDryRun: buildDryRun,
    inspectWithProvider: inspectWithProvider
  };
})();