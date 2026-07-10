/* ============================================================
   Orbit 360 · P0.8b · Router de inteligencia documental
   Fecha: 2026-07-10

   Orquesta parsers determinísticos, OCR y análisis semántico mediante
   providers inyectados. No contiene API keys, no llama red directamente,
   no escribe en Orbit.store y no habilita conocimiento.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var TASKS = [
    'pdf_manifest', 'pdf_ocr', 'pdf_semantic',
    'excel_manifest', 'excel_semantic', 'entity_matching',
    'consultative_reasoning'
  ];
  var SECRET_KEYS = ['key', 'apikey', 'api_key', 'secret', 'token', 'password', 'credential', 'authorization'];
  var SUPPORTED_MEDIA = ['pdf', 'spreadsheet'];

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function secretKey(key) {
    var value = norm(key).replace(/_/g, '');
    if (value === 'key') return true;
    return [
      'apikey', 'secret', 'token', 'password', 'credential', 'authorization'
    ].some(function (item) {
      return value === item || value.endsWith(item) || value.indexOf(item) >= 0;
    });
  }
  function sanitize(value, depth) {
    depth = depth || 0;
    if (value == null) return null;
    if (depth > 7) return '[profundidad_omitida]';
    if (Array.isArray(value)) return value.slice(0, 250).map(function (item) { return sanitize(item, depth + 1); });
    if (typeof value === 'object') {
      return Object.keys(value).reduce(function (out, key) {
        if (secretKey(key)) return out;
        if (typeof value[key] === 'function' || typeof value[key] === 'undefined') return out;
        out[key] = sanitize(value[key], depth + 1);
        return out;
      }, {});
    }
    if (typeof value === 'string' && value.length > 20000) return '[contenido_omitido]';
    return value;
  }
  function extension(input) {
    var name = clean(input && (input.fileName || input.sourceFileName || input.file && input.file.name));
    var ext = clean(input && (input.extension || input.file && input.file.extension));
    if (ext) return ext.replace(/^\./, '').toLowerCase();
    var parts = name.toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
  }
  function mediaKind(input) {
    var explicit = norm(input && (input.mediaKind || input.tipoMedio));
    if (explicit === 'pdf') return 'pdf';
    if (explicit === 'spreadsheet' || explicit === 'excel') return 'spreadsheet';
    var ext = extension(input);
    if (ext === 'pdf') return 'pdf';
    if (['xls', 'xlsx', 'xlsm', 'xlsb', 'csv'].indexOf(ext) >= 0) return 'spreadsheet';
    return explicit;
  }
  function tenantConfig(input, config) {
    return sanitize(config || input && input.tenantConfig || {}, 0) || {};
  }
  function taskConfig(task, config) {
    config = config || {};
    var byTask = config.iaPorTarea || config.aiByTask || config.documentIntelligence || {};
    var row = byTask[task] || {};
    if (typeof row === 'string') row = { providerId: row };
    return sanitize(row, 0) || {};
  }
  function providerId(task, config, fallback) {
    var row = taskConfig(task, config);
    return clean(row.providerId || row.provider || row.proveedor || fallback);
  }
  function dataPolicy(input, config) {
    var purpose = clean(input && input.purpose || 'training');
    var row = sanitize(config && (config.dataPolicy || config.politicaDatos) || {}, 0) || {};
    return {
      purpose: purpose === 'operational' ? 'operational' : 'training',
      includeSensitiveValues: purpose === 'operational' && input && input.includeSensitiveValues === true,
      allowExternalAi: row.allowExternalAi !== false,
      allowOcr: row.allowOcr !== false,
      retainProviderPayload: false,
      storePrompts: false,
      storeProviderResponses: false,
      region: clean(row.region),
      maxPages: Number(row.maxPages || 350),
      maxCostUsd: Number(row.maxCostUsd || 0),
      containsSecrets: false
    };
  }
  function buildReadRequest(input, config) {
    input = input || {};
    var kind = mediaKind(input), policy = dataPolicy(input, config);
    return {
      tenantId: clean(input.tenantId),
      documentId: clean(input.documentId),
      aseguradoraId: clean(input.aseguradoraId),
      fileRef: clean(input.fileRef || input.archivoRef || input.documentRef),
      sourceHash: clean(input.sourceHash || input.hash),
      fileName: clean(input.fileName || input.sourceFileName || input.file && input.file.name),
      extension: extension(input),
      mediaKind: kind,
      purpose: policy.purpose,
      includeSensitiveValues: policy.includeSensitiveValues,
      includeText: true,
      includeLayout: kind === 'pdf',
      includeTables: true,
      includeImages: kind === 'pdf',
      includeCellValues: false,
      includeBinaryPayload: false,
      returnRawBytes: false,
      returnBase64: false,
      returnTokens: false,
      executeEmbeddedContent: false,
      executeMacros: false,
      calculateFormulas: false,
      followExternalLinks: false,
      dimensiones: sanitize(input.dimensiones || {}, 0),
      reason: clean(input.reason || input.motivo),
      policy: policy
    };
  }
  function validateRequest(request) {
    var errors = [], warnings = [];
    if (!request.tenantId) errors.push('TENANT_REQUERIDO');
    if (!request.documentId) errors.push('DOCUMENTO_REQUERIDO');
    if (!request.fileRef && !request.sourceHash) errors.push('REFERENCIA_O_HASH_REQUERIDO');
    if (SUPPORTED_MEDIA.indexOf(request.mediaKind) < 0) errors.push('FORMATO_NO_SOPORTADO');
    if (!request.reason) warnings.push('MOTIVO_RECOMENDADO');
    if (request.purpose === 'operational' && request.includeSensitiveValues && !request.reason) errors.push('MOTIVO_REQUERIDO_PARA_PII');
    return { valid: errors.length === 0, errors: errors, warnings: warnings };
  }
  function buildPlan(input, config) {
    input = input || {};
    config = tenantConfig(input, config);
    var request = buildReadRequest(input, config), validation = validateRequest(request);
    var tasks = [];
    if (request.mediaKind === 'pdf') {
      tasks.push({ task: 'pdf_manifest', providerId: providerId('pdf_manifest', config, 'deterministic_pdf_p07b'), required: true, mode: 'deterministic' });
      tasks.push({ task: 'pdf_ocr', providerId: providerId('pdf_ocr', config, ''), required: false, mode: 'conditional' });
      tasks.push({ task: 'pdf_semantic', providerId: providerId('pdf_semantic', config, ''), required: false, mode: 'conditional' });
    } else if (request.mediaKind === 'spreadsheet') {
      tasks.push({ task: 'excel_manifest', providerId: providerId('excel_manifest', config, 'deterministic_excel_p04'), required: true, mode: 'deterministic' });
      tasks.push({ task: 'excel_semantic', providerId: providerId('excel_semantic', config, ''), required: false, mode: 'conditional' });
    }
    tasks.push({ task: 'entity_matching', providerId: providerId('entity_matching', config, 'directory_match'), required: true, mode: 'deterministic_or_semantic' });
    return {
      request: request,
      validation: validation,
      tasks: tasks,
      status: validation.valid ? 'plan_ready' : 'plan_blocked',
      writeAllowed: false,
      containsSecrets: false
    };
  }
  function manifestSignals(manifest) {
    manifest = manifest || {};
    var pages = manifest.pages || [];
    var warnings = [].concat(manifest.warnings || []);
    var contentPages = pages.filter(function (page) { return page && page.blank !== true; }).length;
    var textChars = pages.reduce(function (sum, page) { return sum + Number(page && page.contentChars || 0); }, 0);
    var topCandidate = manifest.insurerCandidates && manifest.insurerCandidates[0];
    var dimensions = manifest.dimensiones || {};
    return {
      confidence: Number(manifest.confidence || 0),
      contentPages: contentPages,
      textChars: textChars,
      hasInsurer: !!(topCandidate && Number(topCandidate.confidence || 0) >= 85),
      hasProduct: !!clean(dimensions.producto),
      hasSections: !!(manifest.sections && manifest.sections.length),
      hasTables: pages.some(function (page) { return Number(page && page.tableCount || 0) > 0; }),
      warnings: warnings,
      parserOcrExecuted: !!(manifest.parser && manifest.parser.ocrExecuted)
    };
  }
  function decideFallback(manifest, request, config) {
    var signals = manifestSignals(manifest), policy = request.policy || dataPolicy(request, config);
    var ocrRecommended = request.mediaKind === 'pdf' && !signals.parserOcrExecuted && (signals.contentPages === 0 || signals.textChars < 120);
    var semanticRecommended = (
      signals.confidence < 85 || !signals.hasInsurer || !signals.hasProduct || !signals.hasSections ||
      signals.warnings.indexOf('ASEGURADORA_REQUIERE_VALIDACION') >= 0 ||
      signals.warnings.indexOf('PRODUCTO_REQUIERE_VALIDACION') >= 0 ||
      signals.warnings.indexOf('SECCIONES_REQUIEREN_VALIDACION') >= 0
    );
    var needOcr = policy.allowOcr && ocrRecommended;
    var needSemantic = policy.allowExternalAi && semanticRecommended;
    return {
      needOcr: needOcr,
      needSemantic: needSemantic,
      ocrRecommended: ocrRecommended,
      semanticRecommended: semanticRecommended,
      signals: signals,
      reasons: unique([].concat(
        ocrRecommended ? ['TEXTO_INSUFICIENTE_REQUIERE_OCR'] : [],
        ocrRecommended && !policy.allowOcr ? ['OCR_BLOQUEADO_POR_POLITICA'] : [],
        !signals.hasInsurer ? ['ASEGURADORA_REQUIERE_MATCHING'] : [],
        !signals.hasProduct ? ['PRODUCTO_REQUIERE_ANALISIS'] : [],
        !signals.hasSections ? ['SECCIONES_REQUIEREN_ANALISIS'] : [],
        signals.confidence < 85 ? ['CONFIANZA_INSUFICIENTE'] : [],
        semanticRecommended && !policy.allowExternalAi ? ['ANALISIS_SEMANTICO_BLOQUEADO_POR_POLITICA'] : []
      )),
      writeAllowed: false
    };
  }
  function resolveProvider(registry, id, methods) {
    registry = registry || {};
    var provider = registry[id] || registry.providers && registry.providers[id];
    if (!provider) return null;
    var method = methods.find(function (name) { return typeof provider[name] === 'function'; });
    return method ? { provider: provider, method: method } : null;
  }
  function mergeManifest(base, addition, stage) {
    base = sanitize(base || {}, 0) || {};
    addition = sanitize(addition || {}, 0) || {};
    var merged = Object.assign({}, base, addition);
    ['pages', 'sections', 'insurerCandidates', 'dimensiones'].forEach(function (key) {
      if (addition[key] != null) merged[key] = addition[key];
    });
    if (addition.confidence != null) merged.confidence = Math.max(Number(base.confidence || 0), Number(addition.confidence || 0));
    merged.warnings = unique([].concat(base.warnings || [], addition.warnings || []));
    merged.pipeline = [].concat(base.pipeline || [], [{ stage: stage, providerId: clean(addition.providerId), completedAt: new Date().toISOString() }]);
    merged.flags = Object.assign({}, base.flags || {}, addition.flags || {}, {
      containsRawPayload: false, containsSecrets: false, embeddedContentExecuted: false
    });
    merged.writeAllowed = false;
    merged.requiresHumanValidation = true;
    return merged;
  }
  async function invoke(resolved, request, context) {
    if (!resolved) return { ok: false, code: 'PROVIDER_REQUIRED' };
    try {
      var result = await resolved.provider[resolved.method](sanitize(request, 0), sanitize(context || {}, 0));
      return { ok: true, result: sanitize(result || {}, 0) };
    } catch (error) {
      return { ok: false, code: clean(error && error.code) || 'PROVIDER_FAILED', message: clean(error && error.message) };
    }
  }
  async function run(input, registry, config) {
    input = input || {}; registry = registry || {}; config = tenantConfig(input, config);
    var plan = buildPlan(input, config), request = plan.request;
    if (!plan.validation.valid) return { ok: false, code: plan.validation.errors[0], plan: plan, writeAllowed: false };
    var deterministicTask = request.mediaKind === 'pdf' ? 'pdf_manifest' : 'excel_manifest';
    var deterministicId = providerId(deterministicTask, config, request.mediaKind === 'pdf' ? 'deterministic_pdf_p07b' : 'deterministic_excel_p04');
    var deterministic = resolveProvider(registry, deterministicId, ['inspect', 'extractManifest', 'extract', 'run']);
    var first = await invoke(deterministic, request, { task: deterministicTask });
    if (!first.ok) return { ok: false, code: first.code, plan: plan, stages: [{ task: deterministicTask, ok: false, code: first.code }], writeAllowed: false };
    var manifest = mergeManifest({}, Object.assign({}, first.result, { providerId: deterministicId }), deterministicTask);
    var fallback = decideFallback(manifest, request, config), stages = [{ task: deterministicTask, providerId: deterministicId, ok: true }];

    if (fallback.needOcr) {
      var ocrId = providerId('pdf_ocr', config, '');
      var ocr = resolveProvider(registry, ocrId, ['ocr', 'extract', 'run']);
      var ocrResult = await invoke(ocr, request, { task: 'pdf_ocr', manifest: manifest });
      stages.push({ task: 'pdf_ocr', providerId: ocrId, ok: ocrResult.ok, code: ocrResult.code || '' });
      if (ocrResult.ok) manifest = mergeManifest(manifest, Object.assign({}, ocrResult.result, { providerId: ocrId }), 'pdf_ocr');
      else manifest.warnings = unique([].concat(manifest.warnings || [], ['OCR_PROVIDER_NO_DISPONIBLE']));
    }

    fallback = decideFallback(manifest, request, config);
    if (fallback.needSemantic) {
      var semanticTask = request.mediaKind === 'pdf' ? 'pdf_semantic' : 'excel_semantic';
      var semanticId = providerId(semanticTask, config, '');
      var semantic = resolveProvider(registry, semanticId, ['analyze', 'extract', 'run']);
      var semanticResult = await invoke(semantic, request, { task: semanticTask, manifest: manifest });
      stages.push({ task: semanticTask, providerId: semanticId, ok: semanticResult.ok, code: semanticResult.code || '' });
      if (semanticResult.ok) manifest = mergeManifest(manifest, Object.assign({}, semanticResult.result, { providerId: semanticId }), semanticTask);
      else manifest.warnings = unique([].concat(manifest.warnings || [], ['SEMANTIC_PROVIDER_NO_DISPONIBLE']));
    }

    var finalFallback = decideFallback(manifest, request, config);
    return {
      ok: true,
      code: finalFallback.reasons.length ? 'MANIFEST_REQUIRES_VALIDATION' : 'MANIFEST_READY_FOR_REVIEW',
      plan: plan,
      stages: stages,
      manifest: manifest,
      fallback: finalFallback,
      approved: false,
      enabled: false,
      writeAllowed: false,
      requiresHumanValidation: true,
      requiresSecondGateForEnablement: true
    };
  }

  Orbit.documentIntelligenceRouterP08 = {
    TASKS: TASKS.slice(), sanitize: sanitize, mediaKind: mediaKind,
    taskConfig: taskConfig, providerId: providerId, dataPolicy: dataPolicy,
    buildReadRequest: buildReadRequest, validateRequest: validateRequest,
    buildPlan: buildPlan, manifestSignals: manifestSignals,
    decideFallback: decideFallback, mergeManifest: mergeManifest,
    run: run
  };
})();