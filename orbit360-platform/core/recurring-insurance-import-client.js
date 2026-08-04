/* Orbit 360 · Cliente de importaciones recurrentes de seguros
   Contrato reusable: staging, dry-run, confirmación y rollback.
   No parsea secretos ni escribe directamente en Orbit.store. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  const VERSION = 'orbit360-recurring-insurance-import-client-v1';
  const SOURCE_TYPES = Object.freeze([
    'receipt_schedule',
    'reported_payments',
    'insurer_payment_report',
    'portfolio_statement',
    'commission_statement',
    'bank_statement',
    'supporting_document'
  ]);

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function tenantId() {
    try {
      const cfg = Orbit.tenant && Orbit.tenant.get ? Orbit.tenant.get() : {};
      return clean((window.OrbitBackend && (OrbitBackend.tenantId || OrbitBackend.tenant)) || cfg.tenantId || cfg.id || cfg.slug);
    } catch (e) { return ''; }
  }
  function callable(name) {
    if (Orbit.backendLab && typeof Orbit.backendLab.call === 'function') return payload => Orbit.backendLab.call(name, payload);
    if (Orbit.backend && typeof Orbit.backend.call === 'function') return payload => Orbit.backend.call(name, payload);
    throw new Error('El servicio de importación todavía no está activo.');
  }
  async function command(operation, payload, options) {
    options = options || {};
    const tid = clean(options.tenantId || tenantId());
    if (!tid) throw new Error('No se pudo resolver el tenant activo.');
    const fn = callable('orbit360RecurringInsuranceImport');
    return fn({
      tenantId: tid,
      operation,
      payload: payload || {},
      reason: clean(options.reason || options.motivo || 'Operación gestionada desde Importar'),
      requestId: clean(options.requestId)
    });
  }
  function validateSourceType(type) {
    if (SOURCE_TYPES.indexOf(type) < 0) throw new Error('Tipo de fuente no soportado.');
    return type;
  }
  async function createBatch(input, options) {
    input = Object.assign({}, input || {});
    input.sourceType = validateSourceType(input.sourceType);
    if (!clean(input.sourceFileHash)) throw new Error('Se requiere hash de la fuente para garantizar idempotencia.');
    return command('create_batch', input, options);
  }
  async function stageRows(batchId, rows, options) {
    if (!clean(batchId)) throw new Error('Se requiere batchId.');
    if (!Array.isArray(rows) || !rows.length) throw new Error('No hay filas para preparar.');
    return command('stage_rows', { batchId, rows, offset: Number(options && options.offset || 0) }, options);
  }
  async function preview(batchId, options) {
    return command('preview_batch', { batchId }, options);
  }
  async function confirm(batchId, options) {
    options = options || {};
    return command('confirm_batch', {
      batchId,
      confirmValidationOverride: options.confirmValidationOverride === true
    }, options);
  }
  async function rollback(batchId, options) {
    return command('rollback_batch', { batchId }, options);
  }
  async function getBatch(batchId, options) {
    return command('get_batch', { batchId }, options);
  }

  Orbit.recurringImport = Object.freeze({
    VERSION,
    SOURCE_TYPES,
    createBatch,
    stageRows,
    preview,
    confirm,
    rollback,
    getBatch,
    writesStoreDirectly: false,
    requiresHumanConfirmation: true,
    bankCreatesCobrosDirectly: false,
    financeMovementsCreatedAutomatically: false
  });
})();
