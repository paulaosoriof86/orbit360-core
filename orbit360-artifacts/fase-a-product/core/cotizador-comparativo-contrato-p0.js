/* ============================================================
   Orbit 360 · Contrato P0 Cotizador / Comparativo
   Fecha: 2026-07-10

   Capa pura y reusable. No escribe datos, no contiene datos reales,
   no llama proveedores externos y no depende de Firebase.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  const QUOTE_ORIGINS = [
    'tarifa_validada',
    'pdf_externo',
    'cotizador_excel',
    'cotizador_linea_asistido',
    'ajuste_manual_versionado'
  ];

  const HISTORY_ACTIONS = ['ver', 'retomar', 'duplicar', 'editar', 'archivar'];
  const PRIVILEGED_ROLES = ['superadmin', 'admin', 'admintenant', 'direccion', 'operativo'];

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function norm(value) {
    return clean(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_ ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function rolesOf(user) {
    const out = [];
    if (!user) return out;
    if (Array.isArray(user.roles)) out.push.apply(out, user.roles);
    if (user.rol) out.push(user.rol);
    if (user.role) out.push(user.role);
    if (user.rolActivo) out.push(user.rolActivo);
    return out.map(norm);
  }

  function hasPrivilegedRole(user) {
    return rolesOf(user).some(function (role) {
      return PRIVILEGED_ROLES.some(function (allowed) {
        return role === allowed || role.indexOf(allowed) >= 0;
      });
    });
  }

  function recommendationEnabled(config) {
    if (!config) return true;
    if (config.recomendacionConsultiva === false) return false;
    if (config.modules && config.modules.comparativo && config.modules.comparativo.recomendacionConsultiva === false) return false;
    return true;
  }

  function defaultCurrency(country) {
    const c = clean(country).toUpperCase();
    if (c === 'GT') return 'GTQ';
    if (c === 'CO') return 'COP';
    return '';
  }

  function normalizeMoney(input, country) {
    const out = Object.assign({
      primaNeta: 0,
      gastosEmision: 0,
      asistencia: 0,
      recargoFraccionamiento: 0,
      impuestos: 0,
      primaTotal: 0,
      moneda: defaultCurrency(country),
      numeroPagos: 1,
      valorCuota: 0
    }, input || {});
    Object.keys(out).forEach(function (key) {
      if (['moneda'].indexOf(key) < 0) out[key] = Number(out[key] || 0);
    });
    if (!out.primaTotal) {
      out.primaTotal = out.primaNeta + out.gastosEmision + out.asistencia + out.recargoFraccionamiento + out.impuestos;
    }
    if (!out.valorCuota && out.numeroPagos > 0) out.valorCuota = out.primaTotal / out.numeroPagos;
    out.moneda = clean(out.moneda || defaultCurrency(country)).toUpperCase();
    return out;
  }

  function normalizeQuote(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    const country = clean(input.pais || ctx.pais || ctx.defaultCountry).toUpperCase();
    const origin = clean(input.origen || 'pdf_externo');
    const quote = {
      id: clean(input.id) || 'cot_' + Date.now().toString(36),
      tenantId: clean(input.tenantId || ctx.tenantId),
      pais: country,
      moneda: clean(input.moneda || defaultCurrency(country)).toUpperCase(),
      aseguradoraId: clean(input.aseguradoraId),
      aseguradoraNombre: clean(input.aseguradoraNombre || input.aseguradora || input.nombre),
      ramo: clean(input.ramo),
      producto: clean(input.producto),
      plan: clean(input.plan),
      clienteId: clean(input.clienteId),
      prospectoNombre: clean(input.prospectoNombre || input.cliente),
      asesorId: clean(input.asesorId || ctx.asesorId),
      origen: QUOTE_ORIGINS.indexOf(origin) >= 0 ? origin : 'pdf_externo',
      documentoFuenteId: clean(input.documentoFuenteId),
      versionFuente: clean(input.versionFuente),
      cotizadorFuenteId: clean(input.cotizadorFuenteId),
      valores: normalizeMoney(input.valores || input, country),
      coberturas: Array.isArray(input.coberturas) ? input.coberturas.slice() : [],
      deducibles: Array.isArray(input.deducibles) ? input.deducibles.slice() : [],
      condiciones: Array.isArray(input.condiciones) ? input.condiciones.slice() : [],
      exclusiones: Array.isArray(input.exclusiones) ? input.exclusiones.slice() : [],
      formasPago: Array.isArray(input.formasPago) ? input.formasPago.slice() : [],
      datosRiesgo: Object.assign({}, input.datosRiesgo || {}),
      confianzaExtraccion: Number(input.confianzaExtraccion || 0),
      estadoLectura: clean(input.estadoLectura || 'lectura_completada'),
      estadoValidacion: clean(input.estadoValidacion || 'requiere_validacion'),
      estado: clean(input.estado || 'borrador'),
      trazabilidad: Object.assign({}, input.trazabilidad || {}),
      createdAt: clean(input.createdAt) || nowIso(),
      updatedAt: clean(input.updatedAt) || nowIso()
    };
    quote.moneda = quote.valores.moneda || quote.moneda;
    return quote;
  }

  function validateQuote(quote) {
    const errors = [];
    if (!quote.pais) errors.push('pais');
    if (!quote.moneda) errors.push('moneda');
    if (!quote.aseguradoraId && !quote.aseguradoraNombre) errors.push('aseguradora');
    if (!quote.ramo) errors.push('ramo');
    if (!quote.producto) errors.push('producto');
    if (!quote.valores || !quote.valores.primaTotal) errors.push('prima_total');
    if (quote.origen === 'pdf_externo' && !quote.documentoFuenteId) errors.push('documento_fuente');
    if (quote.origen === 'tarifa_validada' && !quote.versionFuente) errors.push('version_tarifa');
    if (quote.origen === 'ajuste_manual_versionado' && !(quote.trazabilidad && quote.trazabilidad.motivo)) errors.push('motivo_ajuste_manual');
    return { valid: errors.length === 0, errors: errors };
  }

  function normalizeComparative(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    return {
      id: clean(input.id) || 'cmp_' + Date.now().toString(36),
      tenantId: clean(input.tenantId || ctx.tenantId),
      pais: clean(input.pais || ctx.pais).toUpperCase(),
      moneda: clean(input.moneda || defaultCurrency(input.pais || ctx.pais)).toUpperCase(),
      ramo: clean(input.ramo),
      producto: clean(input.producto),
      clienteId: clean(input.clienteId),
      prospectoNombre: clean(input.prospectoNombre),
      asesorId: clean(input.asesorId || ctx.asesorId),
      cotizacionIds: Array.isArray(input.cotizacionIds) ? input.cotizacionIds.slice() : [],
      criterio: clean(input.criterio || 'costo_beneficio'),
      recomendacionHabilitada: input.recomendacionHabilitada !== false,
      recomendacion: Object.assign({}, input.recomendacion || {}),
      esquemaProductoVersion: clean(input.esquemaProductoVersion),
      estado: clean(input.estado || 'borrador'),
      trazabilidad: Object.assign({}, input.trazabilidad || {}),
      createdAt: clean(input.createdAt) || nowIso(),
      updatedAt: clean(input.updatedAt) || nowIso()
    };
  }

  function createHistoryRecord(kind, entity, ctx) {
    ctx = ctx || {};
    return {
      id: 'hist_' + Date.now().toString(36),
      tipo: kind === 'comparativo' ? 'comparativo' : 'cotizacion',
      entityId: clean(entity && entity.id),
      tenantId: clean((entity && entity.tenantId) || ctx.tenantId),
      clienteId: clean(entity && entity.clienteId),
      asesorId: clean((entity && entity.asesorId) || ctx.asesorId),
      pais: clean(entity && entity.pais).toUpperCase(),
      moneda: clean(entity && entity.moneda).toUpperCase(),
      ramo: clean(entity && entity.ramo),
      producto: clean(entity && entity.producto),
      estado: clean(entity && entity.estado || 'borrador'),
      snapshot: JSON.parse(JSON.stringify(entity || {})),
      archivado: false,
      eliminadoLogico: false,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
  }

  function canAccessHistory(user, record) {
    if (!user || !record) return false;
    if (hasPrivilegedRole(user)) return true;
    const userId = clean(user.id || user.usuarioId);
    const advisorId = clean(user.asesorId || userId);
    const scope = norm(user.scopeDatos || user.dataScope || 'propios');
    if (scope === 'todos') return true;
    if (scope === 'ninguno') return false;
    if (scope === 'equipo' && Array.isArray(user.equipoAsesorIds)) {
      return user.equipoAsesorIds.map(clean).indexOf(clean(record.asesorId)) >= 0 || clean(record.asesorId) === advisorId;
    }
    return clean(record.asesorId) === advisorId;
  }

  function allowedHistoryActions(user, record) {
    if (!canAccessHistory(user, record)) return [];
    const actions = HISTORY_ACTIONS.slice();
    if (hasPrivilegedRole(user)) actions.push('reasignar');
    return actions;
  }

  function archiveHistory(record, actor, reason) {
    const out = Object.assign({}, record || {});
    out.archivado = true;
    out.eliminadoLogico = true;
    out.updatedAt = nowIso();
    out.archivoAudit = {
      actorId: clean(actor && (actor.id || actor.usuarioId)),
      motivo: clean(reason),
      fecha: out.updatedAt
    };
    return out;
  }

  function duplicateEntity(entity, actor) {
    const out = JSON.parse(JSON.stringify(entity || {}));
    out.id = (out.id && out.id.indexOf('cmp_') === 0 ? 'cmp_' : 'cot_') + Date.now().toString(36);
    out.estado = 'borrador';
    out.createdAt = nowIso();
    out.updatedAt = out.createdAt;
    out.duplicadoDe = clean(entity && entity.id);
    out.duplicadoPor = clean(actor && (actor.id || actor.usuarioId));
    return out;
  }

  function createTariffVersion(input, ctx) {
    input = input || {};
    ctx = ctx || {};
    const sourceType = clean(input.tipoFuente || input.sourceType || 'excel');
    return {
      id: clean(input.id) || 'tar_v_' + Date.now().toString(36),
      tenantId: clean(input.tenantId || ctx.tenantId),
      aseguradoraId: clean(input.aseguradoraId),
      pais: clean(input.pais || ctx.pais).toUpperCase(),
      moneda: clean(input.moneda || defaultCurrency(input.pais || ctx.pais)).toUpperCase(),
      ramo: clean(input.ramo),
      producto: clean(input.producto),
      tipoFuente: sourceType,
      documentoFuenteId: clean(input.documentoFuenteId),
      cotizadorFuenteId: clean(input.cotizadorFuenteId),
      versionAnteriorId: clean(input.versionAnteriorId),
      baseVersionId: clean(input.baseVersionId),
      reglas: Array.isArray(input.reglas) ? input.reglas.slice() : [],
      ajustes: Array.isArray(input.ajustes) ? input.ajustes.slice() : [],
      vigenciaDesde: clean(input.vigenciaDesde),
      vigenciaHasta: clean(input.vigenciaHasta),
      motivo: clean(input.motivo),
      estado: clean(input.estado || 'requiere_validacion'),
      confianza: Number(input.confianza || 0),
      trazabilidad: Object.assign({}, input.trazabilidad || {}),
      createdAt: clean(input.createdAt) || nowIso()
    };
  }

  function validateTariffVersion(version) {
    const errors = [];
    if (!version.aseguradoraId) errors.push('aseguradora');
    if (!version.pais) errors.push('pais');
    if (!version.moneda) errors.push('moneda');
    if (!version.ramo) errors.push('ramo');
    if (!version.producto) errors.push('producto');
    if (!version.documentoFuenteId && !version.cotizadorFuenteId && version.tipoFuente !== 'ajuste_manual_versionado') errors.push('fuente');
    if (version.tipoFuente === 'ajuste_manual_versionado') {
      if (!version.baseVersionId) errors.push('version_base');
      if (!version.motivo) errors.push('motivo');
      if (!version.ajustes.length) errors.push('ajustes');
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function printProfile(input) {
    input = input || {};
    return {
      modo: clean(input.modo || 'fidelidad_aseguradora_en_marca_tenant'),
      aseguradoraId: clean(input.aseguradoraId),
      pais: clean(input.pais).toUpperCase(),
      producto: clean(input.producto),
      plantillaVersion: clean(input.plantillaVersion),
      documentoOriginalId: clean(input.documentoOriginalId),
      conservarCamposMateriales: input.conservarCamposMateriales !== false,
      conservarOrdenSecciones: input.conservarOrdenSecciones !== false,
      brandingTenant: input.brandingTenant !== false,
      requiereRevision: input.requiereRevision !== false
    };
  }

  function whatsappTemplatePolicy() {
    return {
      aprobacionPublicacion: ['admin', 'direccion'],
      dobleAprobacion: true,
      recomendacionIncluida: true,
      editableAntesDeEnviar: true,
      envioRealSoloConIntegracionActiva: true
    };
  }

  function resolveAIRoute(task, config) {
    config = config || {};
    const routes = config.routes || {};
    const deterministicFirst = config.deterministicFirst !== false;
    return {
      task: clean(task),
      deterministicFirst: deterministicFirst,
      provider: clean(routes[task] || routes.default),
      fallbackProviders: Array.isArray(config.fallbackProviders) ? config.fallbackProviders.slice() : [],
      requireStructuredOutput: task !== 'ocr_preproceso',
      requireHumanValidation: true,
      benchmarkProfileId: clean(config.benchmarkProfileId)
    };
  }

  function onlineCalculatorStrategy(input) {
    input = input || {};
    return {
      aseguradoraId: clean(input.aseguradoraId),
      pais: clean(input.pais).toUpperCase(),
      producto: clean(input.producto),
      metodo: clean(input.metodo || 'captura_asistida_autorizada'),
      requiereUsuarioAutenticado: input.requiereUsuarioAutenticado !== false,
      permiteAutomatizacion: input.permiteAutomatizacion === true,
      terminosVerificados: input.terminosVerificados === true,
      captchaNoEvadir: true,
      fuenteSalida: clean(input.fuenteSalida || 'pdf_exportado_o_captura_resultado'),
      casosCalibracion: Array.isArray(input.casosCalibracion) ? input.casosCalibracion.slice() : [],
      estado: clean(input.estado || 'requiere_validacion')
    };
  }

  window.Orbit.cotizadorComparativoP0 = {
    QUOTE_ORIGINS: QUOTE_ORIGINS,
    HISTORY_ACTIONS: HISTORY_ACTIONS,
    recommendationEnabled: recommendationEnabled,
    defaultCurrency: defaultCurrency,
    normalizeMoney: normalizeMoney,
    normalizeQuote: normalizeQuote,
    validateQuote: validateQuote,
    normalizeComparative: normalizeComparative,
    createHistoryRecord: createHistoryRecord,
    canAccessHistory: canAccessHistory,
    allowedHistoryActions: allowedHistoryActions,
    archiveHistory: archiveHistory,
    duplicateEntity: duplicateEntity,
    createTariffVersion: createTariffVersion,
    validateTariffVersion: validateTariffVersion,
    printProfile: printProfile,
    whatsappTemplatePolicy: whatsappTemplatePolicy,
    resolveAIRoute: resolveAIRoute,
    onlineCalculatorStrategy: onlineCalculatorStrategy
  };
})();