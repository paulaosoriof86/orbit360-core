/* ============================================================
   Orbit 360 · Drive Folder Matcher P0.3
   Fecha: 2026-07-10

   Motor puro/reusable. Recibe entidades y metadata de carpetas, propone
   coincidencias y dry-run. No llama Google Drive, no escribe y no usa tokens.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var LEGAL_SUFFIXES = [
    'sa', 's_a', 's_a_s', 'sas', 'ltda', 'limitada', 'sociedad_anonima',
    'compania', 'cia', 'seguros', 'aseguradora', 'insurance', 'corredores'
  ];
  var COUNTRY_ALIASES = {
    GT: ['gt', 'guatemala', 'guate'],
    CO: ['co', 'colombia']
  };

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function normalize(value) {
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' y ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function words(value) { return unique(normalize(value).split('_').filter(function (part) { return part.length > 1; })); }

  function withoutLegalSuffixes(value, extraSuffixes) {
    var suffixes = LEGAL_SUFFIXES.concat(extraSuffixes || []).map(normalize);
    return normalize(value).split('_').filter(function (part) { return suffixes.indexOf(part) < 0; }).join('_');
  }

  function normalizeCountry(value) {
    var input = normalize(value);
    var keys = Object.keys(COUNTRY_ALIASES);
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (key.toLowerCase() === input || COUNTRY_ALIASES[key].indexOf(input) >= 0) return key;
    }
    return clean(value).toUpperCase();
  }

  function countryFromPath(path) {
    var normalizedPath = normalize(path);
    var keys = Object.keys(COUNTRY_ALIASES);
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      var aliases = COUNTRY_ALIASES[key];
      if (aliases.some(function (alias) { return normalizedPath.split('_').indexOf(alias) >= 0; })) return key;
    }
    return '';
  }

  function tokenSimilarity(left, right) {
    var a = words(left), b = words(right);
    if (!a.length || !b.length) return 0;
    var intersection = a.filter(function (item) { return b.indexOf(item) >= 0; }).length;
    var union = unique(a.concat(b)).length;
    return union ? intersection / union : 0;
  }

  function normalizeEntity(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var aliases = [].concat(input.aliases || [], input.nombresAlternos || [], input.marcas || []);
    if (input.razonSocial) aliases.push(input.razonSocial);
    var name = clean(input.nombre || input.name || input.razonSocial);
    return {
      id: clean(input.id || input.entityId),
      tipo: clean(input.tipo || ctx.tipo || 'aseguradora'),
      nombre: name,
      nombreNormalizado: normalize(name),
      nombreBase: withoutLegalSuffixes(name, ctx.legalSuffixes),
      aliases: unique(aliases.map(clean).filter(Boolean)),
      aliasesNormalizados: unique(aliases.map(function (alias) { return normalize(alias); }).filter(Boolean)),
      aliasesBase: unique(aliases.map(function (alias) { return withoutLegalSuffixes(alias, ctx.legalSuffixes); }).filter(Boolean)),
      pais: normalizeCountry(input.pais || ctx.pais),
      identificacion: normalize(input.identificacion || input.nit || input.taxId),
      driveFolderRef: clean(input.driveFolderRef || input.driveFolderId || input.folderId),
      driveUrl: clean(input.driveUrl || input.drive),
      locked: input.driveLinkLocked === true || input.locked === true,
      raw: clone(input)
    };
  }

  function normalizeFolder(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var path = clean(input.path || input.fullPath || input.ruta);
    var country = normalizeCountry(input.pais || input.country || countryFromPath(path));
    return {
      id: clean(input.id || input.folderId),
      nombre: clean(input.nombre || input.name),
      nombreNormalizado: normalize(input.nombre || input.name),
      nombreBase: withoutLegalSuffixes(input.nombre || input.name, ctx.legalSuffixes),
      path: path,
      pathNormalizado: normalize(path),
      pais: country,
      webViewLink: clean(input.webViewLink || input.url),
      parentId: clean(input.parentId),
      identificacion: normalize(input.identificacion || input.nit || input.taxId),
      mimeType: clean(input.mimeType || 'application/vnd.google-apps.folder'),
      raw: clone(input)
    };
  }

  function exactNameMatch(entity, folder) {
    var names = unique([entity.nombreNormalizado, entity.nombreBase].concat(entity.aliasesNormalizados, entity.aliasesBase));
    return names.indexOf(folder.nombreNormalizado) >= 0 || names.indexOf(folder.nombreBase) >= 0;
  }

  function bestNameSimilarity(entity, folder) {
    var names = unique([entity.nombreNormalizado, entity.nombreBase].concat(entity.aliasesNormalizados, entity.aliasesBase));
    return names.reduce(function (best, name) {
      return Math.max(best, tokenSimilarity(name, folder.nombreNormalizado), tokenSimilarity(name, folder.nombreBase));
    }, 0);
  }

  function scoreCandidate(entityInput, folderInput, ctx) {
    ctx = ctx || {};
    var entity = entityInput.nombreNormalizado ? entityInput : normalizeEntity(entityInput, ctx);
    var folder = folderInput.nombreNormalizado ? folderInput : normalizeFolder(folderInput, ctx);
    var score = 0, reasons = [], warnings = [];

    if (!entity.id) warnings.push('ENTIDAD_SIN_ID');
    if (!folder.id) warnings.push('CARPETA_SIN_ID');
    if (folder.mimeType && folder.mimeType !== 'application/vnd.google-apps.folder') warnings.push('NO_ES_CARPETA');

    if (entity.driveFolderRef && entity.driveFolderRef === folder.id) {
      score += 100;
      reasons.push('MISMA_REFERENCIA_EXISTENTE');
    }

    if (entity.identificacion && folder.identificacion && entity.identificacion === folder.identificacion) {
      score += 45;
      reasons.push('IDENTIFICACION_EXACTA');
    }

    if (exactNameMatch(entity, folder)) {
      score += 65;
      reasons.push('NOMBRE_O_ALIAS_EXACTO');
    } else {
      var similarity = bestNameSimilarity(entity, folder);
      score += Math.round(similarity * 45);
      if (similarity >= 0.8) reasons.push('NOMBRE_MUY_SIMILAR');
      else if (similarity >= 0.55) reasons.push('NOMBRE_PARCIAL');
    }

    if (entity.nombreBase && folder.pathNormalizado && folder.pathNormalizado.indexOf(entity.nombreBase) >= 0) {
      score += 15;
      reasons.push('NOMBRE_EN_RUTA');
    }

    if (entity.pais && folder.pais) {
      if (entity.pais === folder.pais) {
        score += 12;
        reasons.push('PAIS_COINCIDE');
      } else {
        score -= 45;
        warnings.push('PAIS_NO_COINCIDE');
      }
    } else if (entity.pais && !folder.pais) {
      warnings.push('CARPETA_SIN_PAIS');
    }

    if (entity.locked && entity.driveFolderRef && entity.driveFolderRef !== folder.id) {
      score -= 100;
      warnings.push('VINCULO_BLOQUEADO');
    }

    score = Math.max(0, Math.min(100, score));
    return {
      entityId: entity.id,
      folderId: folder.id,
      score: score,
      confidence: score >= 90 ? 'muy_alta' : score >= 78 ? 'alta' : score >= 58 ? 'media' : score >= 35 ? 'baja' : 'sin_coincidencia',
      reasons: reasons,
      warnings: warnings,
      entity: entity,
      folder: folder
    };
  }

  function rankCandidates(entityInput, folderInputs, ctx) {
    var entity = normalizeEntity(entityInput, ctx);
    return (folderInputs || []).map(function (folder) { return scoreCandidate(entity, normalizeFolder(folder, ctx), ctx); })
      .filter(function (candidate) { return candidate.folderId && candidate.warnings.indexOf('NO_ES_CARPETA') < 0; })
      .sort(function (a, b) { return b.score - a.score || a.folder.nombre.localeCompare(b.folder.nombre); });
  }

  function classifyProposal(ranked, options) {
    options = options || {};
    var high = Number(options.highThreshold || 82);
    var medium = Number(options.mediumThreshold || 58);
    var minDelta = Number(options.minDelta || 12);
    if (!ranked.length || ranked[0].score < medium) return { status: 'sin_coincidencia', selected: null, alternatives: ranked.slice(0, 5) };
    var first = ranked[0], second = ranked[1];
    var delta = second ? first.score - second.score : first.score;
    if (first.score >= high && delta >= minDelta && first.warnings.indexOf('PAIS_NO_COINCIDE') < 0) {
      return { status: 'propuesta_alta_confianza', selected: first, alternatives: ranked.slice(1, 5), delta: delta };
    }
    return { status: 'requiere_validacion', selected: first, alternatives: ranked.slice(1, 5), delta: delta };
  }

  function applyManualOverride(proposal, override, folderMap) {
    if (!override) return proposal;
    if (override.action === 'omit') return Object.assign({}, proposal, { status: 'omitido_manual', selected: null, manual: true, motivo: clean(override.motivo) });
    var folder = folderMap[clean(override.folderId)];
    if (!folder) return Object.assign({}, proposal, { status: 'requiere_validacion', manual: true, error: 'CARPETA_OVERRIDE_NO_EXISTE' });
    return Object.assign({}, proposal, {
      status: 'seleccion_manual',
      selected: { entityId: proposal.entity.id, folderId: folder.id, score: 100, confidence: 'manual', reasons: ['SELECCION_MANUAL'], warnings: [], entity: proposal.entity, folder: folder },
      manual: true,
      motivo: clean(override.motivo)
    });
  }

  function buildDryRun(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    var entities = (input.entidades || input.entities || []).map(function (entity) { return normalizeEntity(entity, ctx); });
    var folders = (input.carpetas || input.folders || []).map(function (folder) { return normalizeFolder(folder, ctx); });
    var folderMap = {};
    folders.forEach(function (folder) { folderMap[folder.id] = folder; });
    var overrides = input.overrides || {};

    var proposals = entities.map(function (entity) {
      var ranked = rankCandidates(entity, folders, ctx);
      var classified = classifyProposal(ranked, input.options);
      var proposal = Object.assign({ entity: entity, ranked: ranked.slice(0, 10) }, classified);
      return applyManualOverride(proposal, overrides[entity.id], folderMap);
    });

    var selectedByFolder = {};
    proposals.forEach(function (proposal) {
      if (!proposal.selected) return;
      var id = proposal.selected.folderId;
      selectedByFolder[id] = selectedByFolder[id] || [];
      selectedByFolder[id].push(proposal);
    });
    Object.keys(selectedByFolder).forEach(function (folderId) {
      var collisions = selectedByFolder[folderId];
      if (collisions.length < 2) return;
      collisions.forEach(function (proposal) {
        proposal.status = 'conflicto_carpeta_compartida';
        proposal.conflictEntityIds = collisions.map(function (item) { return item.entity.id; });
      });
    });

    var operations = proposals.map(function (proposal) {
      var entity = proposal.entity;
      var selected = proposal.selected;
      var action = 'requires_validation';
      if (proposal.status === 'sin_coincidencia') action = 'omit';
      if (proposal.status === 'omitido_manual') action = 'omit';
      if (proposal.status === 'conflicto_carpeta_compartida') action = 'requires_validation';
      if (selected && entity.driveFolderRef === selected.folderId) action = 'omit_existing';
      else if (selected && entity.driveFolderRef && entity.driveFolderRef !== selected.folderId) action = 'update_proposed';
      else if (selected && proposal.status === 'propuesta_alta_confianza') action = 'link_proposed';
      else if (selected && proposal.status === 'seleccion_manual') action = 'link_manual_proposed';
      return {
        entityId: entity.id,
        action: action,
        status: proposal.status,
        currentFolderId: entity.driveFolderRef,
        proposedFolderId: selected ? selected.folderId : '',
        proposedWebViewLink: selected ? selected.folder.webViewLink : '',
        confidence: selected ? selected.confidence : 'sin_coincidencia',
        score: selected ? selected.score : 0,
        reasons: selected ? selected.reasons.slice() : [],
        warnings: selected ? selected.warnings.slice() : [],
        requiresHumanConfirmation: action !== 'omit_existing' && action !== 'omit',
        trace: {
          source: clean(input.source || 'google_drive_folder_metadata'),
          parentFolderId: clean(input.parentFolderId),
          entityType: entity.tipo,
          country: entity.pais,
          generatedAt: clean(input.generatedAt) || new Date().toISOString()
        }
      };
    });

    var summary = {
      totalEntities: entities.length,
      totalFolders: folders.length,
      linkProposed: operations.filter(function (op) { return op.action === 'link_proposed'; }).length,
      linkManualProposed: operations.filter(function (op) { return op.action === 'link_manual_proposed'; }).length,
      updateProposed: operations.filter(function (op) { return op.action === 'update_proposed'; }).length,
      omitExisting: operations.filter(function (op) { return op.action === 'omit_existing'; }).length,
      omit: operations.filter(function (op) { return op.action === 'omit'; }).length,
      requiresValidation: operations.filter(function (op) { return op.action === 'requires_validation'; }).length,
      conflicts: proposals.filter(function (p) { return p.status === 'conflicto_carpeta_compartida'; }).length
    };

    return {
      source: clean(input.source || 'google_drive_folder_metadata'),
      parentFolderId: clean(input.parentFolderId),
      entities: entities,
      folders: folders,
      proposals: proposals,
      operations: operations,
      summary: summary,
      writeAllowed: false,
      requiresConfirmation: true
    };
  }

  function buildConfirmedLinks(dryRun, confirmedEntityIds) {
    var allowed = new Set(confirmedEntityIds || []);
    return (dryRun && dryRun.operations || []).filter(function (operation) {
      return allowed.has(operation.entityId) && operation.proposedFolderId && operation.action !== 'requires_validation';
    }).map(function (operation) {
      return {
        entityId: operation.entityId,
        driveFolder: {
          provider: 'google_drive',
          folderId: operation.proposedFolderId,
          webViewLink: operation.proposedWebViewLink,
          status: 'confirmed',
          matchedBy: operation.action === 'link_manual_proposed' ? 'manual' : 'matcher_p03',
          confidence: operation.confidence,
          score: operation.score,
          confirmedAt: new Date().toISOString()
        },
        audit: {
          action: 'confirm_drive_folder_link',
          entityId: operation.entityId,
          folderId: operation.proposedFolderId,
          source: operation.trace.source,
          parentFolderId: operation.trace.parentFolderId,
          containsFileBytes: false,
          containsAccessToken: false
        }
      };
    });
  }

  window.Orbit.driveFolderMatcherP03 = {
    normalize: normalize,
    withoutLegalSuffixes: withoutLegalSuffixes,
    normalizeCountry: normalizeCountry,
    tokenSimilarity: tokenSimilarity,
    normalizeEntity: normalizeEntity,
    normalizeFolder: normalizeFolder,
    scoreCandidate: scoreCandidate,
    rankCandidates: rankCandidates,
    classifyProposal: classifyProposal,
    buildDryRun: buildDryRun,
    buildConfirmedLinks: buildConfirmedLinks
  };
})();
