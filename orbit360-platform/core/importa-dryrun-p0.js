/* ============================================================
   Orbit 360 · P0 dry-run sanitizado por fuente separada
   Fecha: 2026-07-09

   Construye reportes de dry-run sin escribir datos reales.
   La salida puede alimentar la UI de confirmacion reforzada solo
   despues de revision humana y aprobacion explicita.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  const SOURCE_CONTRACTS = {
    clientes: {
      allowed: ['clientes', 'contactosCliente', 'calidadDatos', 'gestiones'],
      forbidden: ['polizas', 'recibosEsperados', 'cobros', 'finmovs', 'cxcComisiones', 'cxpAsesores'],
      required: ['nombre'],
      blocking: ['pais', 'moneda']
    },
    polizas: {
      allowed: ['polizas', 'bienesAsegurados', 'recibosEsperados', 'calidadDatos', 'gestiones'],
      forbidden: ['cobros', 'finmovs', 'cxcComisiones', 'cxpAsesores'],
      required: ['numero', 'aseguradoraNombre', 'vigenciaIni', 'vigenciaFin'],
      blocking: ['pais', 'moneda', 'formaPago']
    },
    vehiculos: {
      allowed: ['bienesAsegurados', 'calidadDatos', 'gestiones'],
      forbidden: ['polizas', 'cobros', 'finmovs'],
      required: ['identificador'],
      blocking: []
    },
    recibos_fuente_externa: {
      allowed: ['recibosFuenteExterna', 'conciliacionesPrimas', 'calidadDatos', 'gestiones'],
      forbidden: ['finmovs', 'cxcComisiones', 'cxpAsesores'],
      required: ['monto'],
      blocking: ['pais', 'moneda']
    },
    estado_cuenta_aseguradora: {
      allowed: ['estadosCuentaAseguradora', 'recibosAseguradora', 'carteraPrimas', 'conciliacionesPrimas', 'gestiones'],
      forbidden: ['cobros', 'finmovs', 'cxcComisiones', 'cxpAsesores'],
      required: ['aseguradoraNombre', 'monto'],
      blocking: ['pais', 'moneda']
    },
    planilla_comisiones: {
      allowed: ['planillasComisiones', 'comisionesDevengadas', 'conciliacionesComisiones', 'gestiones'],
      forbidden: ['carteraPrimas', 'recibosEsperados', 'finmovs', 'cxpAsesores'],
      required: ['aseguradoraNombre', 'montoComision'],
      blocking: ['pais', 'moneda', 'periodo']
    },
    factura_comision: {
      allowed: ['facturasComisiones', 'cxcComisiones', 'conciliacionesComisiones', 'documentos', 'gestiones'],
      forbidden: ['carteraPrimas', 'recibosEsperados', 'finmovs', 'cxpAsesores'],
      required: ['numeroFactura', 'montoTotal'],
      blocking: ['moneda']
    },
    estado_cuenta_bancario: {
      allowed: ['movimientosBanco', 'conciliacionBancaria', 'gestiones'],
      forbidden: ['finmovs', 'cobros', 'clientes', 'polizas'],
      required: ['fecha', 'monto'],
      blocking: ['moneda']
    },
    directorio_aseguradoras: {
      allowed: ['aseguradoras', 'contactosAseguradora', 'configuracionCatalogo', 'documentos', 'gestiones'],
      forbidden: ['clientes', 'polizas', 'cobros', 'recibosEsperados', 'carteraPrimas', 'finmovs', 'cxcComisiones', 'cxpAsesores', 'usuarios', 'roles', 'permisos', 'secrets', 'credenciales'],
      required: ['nombre'],
      blocking: ['pais']
    },
    calendario_marketing: {
      allowed: ['contenidos', 'campanasMarketing', 'gestiones'],
      forbidden: ['clientes', 'polizas', 'cobros', 'recibosEsperados', 'carteraPrimas', 'finmovs', 'cxcComisiones', 'cxpAsesores', 'usuarios', 'roles', 'permisos', 'secrets', 'credenciales'],
      required: ['codigoContenido', 'fechaProgramada', 'tema'],
      blocking: []
    },
    configuracion_catalogo: {
      allowed: ['configuracionCatalogo', 'gestiones'],
      forbidden: ['clientes', 'polizas', 'cobros', 'finmovs', 'usuarios', 'roles', 'permisos', 'secrets', 'credenciales'],
      required: ['clave'],
      blocking: ['tenantId']
    }
  };

  const SENSITIVE_KEYS = /nombre|razon|correo|email|telefono|whatsapp|direccion|dpi|cedula|nit|documento|placa|chasis|motor|cuenta|iban|token|password|secret|credential/i;
  const CREDENTIAL_KEYS = /password|contraseña|contrasena|token|secret|credential|credencial|usuarioSistema|claveAcceso|accessKey|apiKey/i;

  function nowIso() { return new Date().toISOString(); }

  function hashText(text) {
    let h = 0;
    const s = String(text || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
  }

  function mask(value) {
    if (value == null || value === '') return value;
    const s = String(value);
    if (s.length <= 4) return '***';
    return s.slice(0, 2) + '***' + s.slice(-2);
  }

  function sanitizeValue(key, value) {
    if (SENSITIVE_KEYS.test(key)) return mask(value);
    return value;
  }

  function sanitizeRecord(record) {
    const out = {};
    Object.keys(record || {}).forEach(function (k) {
      const v = record[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = sanitizeRecord(v);
      else if (Array.isArray(v)) out[k] = v.map(function (x) { return x && typeof x === 'object' ? sanitizeRecord(x) : sanitizeValue(k, x); });
      else out[k] = sanitizeValue(k, v);
    });
    return out;
  }

  function isBlank(v) { return v == null || v === '' || v === 'REQUIERE_VALIDACION'; }

  function hasRawCredential(data) {
    let found = false;
    function walk(obj) {
      if (!obj || found) return;
      Object.keys(obj).forEach(function (k) {
        if (found) return;
        const v = obj[k];
        if (CREDENTIAL_KEYS.test(k) && !isBlank(v)) { found = true; return; }
        if (v && typeof v === 'object') walk(v);
      });
    }
    walk(data || {});
    return found;
  }

  function validateOperation(sourceType, op) {
    const c = SOURCE_CONTRACTS[sourceType];
    const errors = [];
    const warnings = [];
    if (!c) errors.push('sourceType_no_soportado:' + sourceType);
    if (!op || typeof op !== 'object') errors.push('operacion_invalida');
    const coll = op && op.collection;
    const data = op && (op.data || op.record || {});
    if (c && coll && !c.allowed.includes(coll)) errors.push('collection_no_permitida_para_fuente:' + coll);
    if (c && coll && c.forbidden.includes(coll)) errors.push('collection_prohibida_para_fuente:' + coll);
    if (op && !['insert', 'update', undefined, null].includes(op.action)) errors.push('accion_no_permitida:' + op.action);
    if (op && op.action === 'update' && !op.id) errors.push('id_requerido_update');
    (c ? c.required : []).forEach(function (k) { if (isBlank(data[k])) warnings.push('campo_recomendado_faltante:' + k); });
    (c ? c.blocking : []).forEach(function (k) { if (isBlank(data[k])) errors.push('campo_bloqueante_faltante:' + k); });
    if (hasRawCredential(data)) errors.push('credencial_no_importable_usar_credentialRef_backend_required');
    if (data.requiereValidacion) errors.push('registro_requiere_validacion');
    if (data.validationStatus && data.validationStatus !== 'validado') errors.push('validationStatus_no_validado');
    if (data.estado === 'requiere_validacion') errors.push('estado_requiere_validacion');
    return { errors, warnings };
  }

  function buildDryRun(input) {
    const sourceType = input && input.sourceType;
    const operations = Array.isArray(input && input.operations) ? input.operations : [];
    const reportId = 'dry_p0_' + hashText([sourceType, input && input.sourceFileName, nowIso()].join('|'));
    const out = {
      reportId,
      batchId: input && input.batchId ? input.batchId : reportId,
      sourceType,
      tenantId: input && input.tenantId || '',
      sourceFileName: input && input.sourceFileName || '',
      sourceHash: input && input.sourceHash || '',
      createdAt: nowIso(),
      status: 'dry_run_pendiente_revision',
      hasBlockingErrors: false,
      totals: { operations: operations.length, insert: 0, update: 0, blocked: 0, warnings: 0 },
      byCollection: {},
      operations: [],
      sanitizedPreview: [],
      blockers: [],
      warnings: []
    };

    operations.forEach(function (op, index) {
      const action = op.action || 'insert';
      const data = op.data || op.record || {};
      const v = validateOperation(sourceType, op);
      if (action === 'insert') out.totals.insert += 1;
      if (action === 'update') out.totals.update += 1;
      out.byCollection[op.collection || 'sin_collection'] = (out.byCollection[op.collection || 'sin_collection'] || 0) + 1;
      if (v.errors.length) { out.totals.blocked += 1; out.hasBlockingErrors = true; }
      out.totals.warnings += v.warnings.length;
      v.errors.forEach(function (e) { out.blockers.push({ index, code: e, collection: op.collection || '' }); });
      v.warnings.forEach(function (w) { out.warnings.push({ index, code: w, collection: op.collection || '' }); });
      out.operations.push({
        index,
        action,
        collection: op.collection || '',
        id: op.id || '',
        blocked: v.errors.length > 0,
        warnings: v.warnings,
        errors: v.errors,
        data: sanitizeRecord(data)
      });
    });

    out.sanitizedPreview = out.operations.slice(0, 20);
    return out;
  }

  function approveDryRun(report, confirmation) {
    if (!report || report.hasBlockingErrors) return Object.assign({}, report || {}, { status: 'dry_run_no_aprobable' });
    if (!confirmation || confirmation.approved !== true || confirmation.phrase !== 'CONFIRMO DRY RUN') {
      return Object.assign({}, report, { status: 'dry_run_pendiente_confirmacion' });
    }
    return Object.assign({}, report, {
      status: 'dry_run_aprobado',
      approvedBy: confirmation.userId || '',
      approvedReason: confirmation.reason || '',
      approvedAt: nowIso()
    });
  }

  window.Orbit.importaDryRunP0 = {
    SOURCE_CONTRACTS,
    sanitizeRecord,
    validateOperation,
    buildDryRun,
    approveDryRun
  };
})();
