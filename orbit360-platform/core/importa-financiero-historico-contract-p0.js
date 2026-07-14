/* ============================================================
   Orbit 360 · Contrato P0 de financiero histórico GT/CO
   Fecha: 2026-07-13

   Capa pura y aditiva para normalizar movimientos históricos.
   - Dry-run únicamente.
   - No escribe en Orbit.store.
   - No infiere clientes, pólizas, cartera ni cobros.
   - Separa GT/GTQ y CO/COP.
   - Financiamientos no son ingreso operativo.
   ============================================================ */
(function () {
  'use strict';

  window.Orbit = window.Orbit || {};

  var VERSION = 'p0-20260713';
  var TARGET_COLLECTION = 'financiero_historico';
  var COUNTRY_CURRENCY = Object.freeze({ GT: 'GTQ', CO: 'COP' });
  var DIRECTIONS = Object.freeze(['ingreso', 'egreso']);
  var STATUSES = Object.freeze([
    'REALIZADO',
    'PENDIENTE',
    'PARCIAL',
    'FACTURADO_PENDIENTE_COBRO',
    'NO_FACTURADO',
    'SALDO_APERTURA',
    'LEGACY_SIN_ESTADO'
  ]);
  var CANDIDATES = Object.freeze([
    'LISTO_FINMOVS',
    'LISTO_FINMOVS_NATURE_FINANCING',
    'LISTO_HISTORICO_FINMOVS_REQUIERE_FECHA',
    'VALIDACION_MENSUAL_AGRUPADA',
    'REQUIERE_VALIDACION_INDIVIDUAL',
    'SOLO_FINANCIERO_HISTORICO',
    'SOLO_SALDO_APERTURA'
  ]);
  var NEVER_INFER = Object.freeze(['clientes', 'polizas', 'carteraPrimas', 'cobros']);
  var FINANCING_CATEGORIES = Object.freeze(['financiamiento_recibido', 'devolucion_financiamiento']);

  function norm(value) {
    return String(value == null ? '' : value)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function traceIsComplete(row) {
    return !!(
      row && row.sourceFile && row.sourceSheet && row.sourceRow &&
      row.sourceBlock && row.periodo && row.traceHash
    );
  }

  function validate(row) {
    var errors = [];
    var warnings = [];

    if (!row || typeof row !== 'object') return { ok: false, errors: ['fila_invalida'], warnings: [] };
    if (!COUNTRY_CURRENCY[row.pais]) errors.push('pais_no_soportado');
    if (COUNTRY_CURRENCY[row.pais] && row.moneda !== COUNTRY_CURRENCY[row.pais]) errors.push('moneda_no_corresponde_pais');
    if (!/^\d{4}-\d{2}$/.test(String(row.periodo || ''))) errors.push('periodo_invalido');
    if (DIRECTIONS.indexOf(row.direccion) < 0) errors.push('direccion_invalida');
    if (!finiteNumber(row.montoFuente) || row.montoFuente === 0) errors.push('monto_invalido');
    if (row.estadoFuente && STATUSES.indexOf(row.estadoFuente) < 0) errors.push('estado_no_soportado');
    if (row.candidatoFinmovs && CANDIDATES.indexOf(row.candidatoFinmovs) < 0) errors.push('candidato_no_soportado');
    if (!traceIsComplete(row)) errors.push('trazabilidad_incompleta');
    if (row.destino && row.destino !== TARGET_COLLECTION) errors.push('destino_no_permitido');
    if (row.esCobro === true || row.esCobro === 'SI') errors.push('movimiento_no_puede_ser_cobro');
    if (row.esCartera === true || row.esCartera === 'SI') errors.push('movimiento_no_puede_ser_cartera');
    if (row.esPoliza === true || row.esPoliza === 'SI') errors.push('movimiento_no_puede_ser_poliza');
    if (row.esCliente === true || row.esCliente === 'SI') errors.push('movimiento_no_puede_crear_cliente');

    if (!row.diaFuente) warnings.push('fecha_exacta_pendiente');
    if (row.estadoFuente === 'LEGACY_SIN_ESTADO') warnings.push('validacion_mensual_requerida');
    if (row.categoriaCanonica === 'otro') warnings.push('categoria_individual_requerida');

    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  function normalize(row, context) {
    context = context || {};
    row = row || {};

    var pais = String(row.pais || context.pais || '').toUpperCase();
    var moneda = String(row.moneda || context.moneda || COUNTRY_CURRENCY[pais] || '').toUpperCase();
    var categoria = norm(row.categoriaCanonica || row.categoria || 'otro').replace(/[^a-z0-9_]+/g, '_');
    var financing = FINANCING_CATEGORIES.indexOf(categoria) >= 0;
    var saldo = categoria === 'saldo_apertura';
    var ingresoOperativo = row.direccion === 'ingreso' && !financing && !saldo;

    return {
      idDryRun: row.idDryRun || '',
      tenantId: row.tenantId || context.tenantId || '',
      pais: pais,
      moneda: moneda,
      periodo: row.periodo || context.periodo || '',
      direccion: row.direccion || '',
      categoriaCanonica: categoria,
      contraparteRef: row.contraparteRef || '',
      contraparteTipo: row.contraparteTipo || 'REQUIERE_VALIDACION',
      diaFuente: row.diaFuente || null,
      montoFuente: finiteNumber(row.montoFuente) ? row.montoFuente : null,
      ivaFuente: finiteNumber(row.ivaFuente) ? row.ivaFuente : 0,
      isrRetenidoFuente: finiteNumber(row.isrRetenidoFuente) ? row.isrRetenidoFuente : 0,
      montoCajaEstimado: finiteNumber(row.montoCajaEstimado) ? row.montoCajaEstimado : row.montoFuente,
      pendienteFuente: finiteNumber(row.pendienteFuente) ? row.pendienteFuente : 0,
      estadoFuente: row.estadoFuente || 'LEGACY_SIN_ESTADO',
      destino: TARGET_COLLECTION,
      candidatoFinmovs: row.candidatoFinmovs || 'REQUIERE_VALIDACION_INDIVIDUAL',
      nature: financing ? 'financing' : (saldo ? 'opening_balance' : 'operating'),
      isOperatingIncome: ingresoOperativo,
      isPremiumCollection: false,
      esCobro: false,
      esCartera: false,
      esPoliza: false,
      esCliente: false,
      sourceFile: row.sourceFile || context.sourceFile || '',
      sourceSheet: row.sourceSheet || '',
      sourceRow: row.sourceRow || null,
      sourceBlock: row.sourceBlock || row.direccion || '',
      traceHash: row.traceHash || '',
      validationStatus: 'dry_run'
    };
  }

  function buildDryRun(rows, context) {
    var result = {
      ok: true,
      version: VERSION,
      writeAuthorized: false,
      targetCollection: TARGET_COLLECTION,
      neverInfer: NEVER_INFER.slice(),
      rows: [],
      counts: { total: 0, valid: 0, invalid: 0, warnings: 0 },
      errors: []
    };

    (Array.isArray(rows) ? rows : []).forEach(function (raw, index) {
      var item = normalize(raw, context);
      var check = validate(item);
      result.counts.total += 1;
      if (check.ok) result.counts.valid += 1;
      else {
        result.counts.invalid += 1;
        result.ok = false;
        result.errors.push({ index: index, idDryRun: item.idDryRun, errors: check.errors.slice() });
      }
      result.counts.warnings += check.warnings.length;
      result.rows.push({ record: item, validation: check });
    });

    return result;
  }

  window.Orbit.importaFinancieroHistoricoP0 = Object.freeze({
    VERSION: VERSION,
    TARGET_COLLECTION: TARGET_COLLECTION,
    COUNTRY_CURRENCY: COUNTRY_CURRENCY,
    DIRECTIONS: DIRECTIONS,
    STATUSES: STATUSES,
    CANDIDATES: CANDIDATES,
    NEVER_INFER: NEVER_INFER,
    normalize: normalize,
    validate: validate,
    buildDryRun: buildDryRun
  });
})();
