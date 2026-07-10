function clean(value) { return String(value == null ? '' : value).trim(); }
function norm(value) { return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
function sourceTask(source) {
  const type = norm(source && (source.tipoFuente || source.sourceType));
  const name = clean(source && (source.nombre || source.fileName)).toLowerCase();
  if (type.includes('excel') || /\.(xlsx|xlsm)$/.test(name)) return 'excel_manifest';
  if (type.includes('pdf') || /\.pdf$/.test(name)) return 'pdf_manifest';
  return '';
}
function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
function validateSource(source, tenantId) {
  const errors = [];
  if (!clean(source && source.id)) errors.push('DOCUMENT_REQUIRED');
  if (!clean(source && source.aseguradoraId)) errors.push('INSURER_REQUIRED');
  if (!clean(source && source.fileRef)) errors.push('FILE_REF_REQUIRED');
  if (!clean(source && (source.versionFuente || source.version))) errors.push('VERSION_REQUIRED');
  if (!clean(source && source.pais)) errors.push('COUNTRY_REQUIRED');
  if (!clean(source && source.moneda)) errors.push('CURRENCY_REQUIRED');
  if (!sourceTask(source)) errors.push('SOURCE_TYPE_UNSUPPORTED');
  if (clean(source && source.tenantId) && clean(source.tenantId) !== clean(tenantId)) errors.push('SOURCE_TENANT_MISMATCH');
  return unique(errors);
}
export function buildDocumentBatchPlanP09d(input = {}) {
  const tenantId = clean(input.tenantId);
  const sources = [].concat(input.sources || []);
  const errors = [];
  if (!tenantId) errors.push('TENANT_REQUIRED');
  if (!sources.length) errors.push('SOURCES_REQUIRED');
  const seenDocuments = new Set(); const seenRefs = new Set();
  const items = sources.map((source, index) => {
    const itemErrors = validateSource(source, tenantId);
    const docKey = [tenantId, clean(source.aseguradoraId), clean(source.id), clean(source.versionFuente || source.version)].map(norm).join('|');
    const refKey = [tenantId, clean(source.fileRef)].map(norm).join('|');
    if (seenDocuments.has(docKey)) itemErrors.push('DUPLICATE_DOCUMENT_VERSION'); else seenDocuments.add(docKey);
    if (seenRefs.has(refKey)) itemErrors.push('DUPLICATE_FILE_REFERENCE'); else seenRefs.add(refKey);
    return {
      order: index + 1,
      tenantId,
      aseguradoraId: clean(source.aseguradoraId),
      documentId: clean(source.id),
      fileRef: clean(source.fileRef),
      sourceType: clean(source.tipoFuente || source.sourceType),
      task: sourceTask(source),
      versionFuente: clean(source.versionFuente || source.version),
      dimensiones: {
        pais: clean(source.pais).toUpperCase(), moneda: clean(source.moneda).toUpperCase(),
        ramo: clean(source.ramo), producto: clean(source.producto), tipoVehiculo: clean(source.tipoVehiculo),
        usoVehiculo: clean(source.usoVehiculo), tipoRiesgo: clean(source.tipoRiesgo), plan: clean(source.plan)
      },
      errors: unique(itemErrors),
      status: itemErrors.length ? 'blocked' : 'ready_for_dry_run',
      writeAllowed: false,
      enabledCotizador: false,
      enabledComparativo: false
    };
  });
  const groups = {};
  items.forEach(item => { const key = item.aseguradoraId || 'sin_aseguradora'; groups[key] = groups[key] || []; groups[key].push(item); });
  return {
    ok: errors.length === 0 && items.every(item => !item.errors.length),
    code: errors.length || items.some(item => item.errors.length) ? 'BATCH_REQUIRES_CORRECTION' : 'BATCH_READY_FOR_DRY_RUN',
    tenantId, items, errors: unique(errors),
    summary: {
      total: items.length,
      ready: items.filter(item => item.status === 'ready_for_dry_run').length,
      blocked: items.filter(item => item.status === 'blocked').length,
      insurers: Object.keys(groups).length,
      excel: items.filter(item => item.task === 'excel_manifest').length,
      pdf: items.filter(item => item.task === 'pdf_manifest').length
    },
    groups: Object.keys(groups).map(aseguradoraId => ({ aseguradoraId, items: groups[aseguradoraId].map(item => item.documentId) })),
    applyAllowed: false,
    requiresHumanValidation: true,
    enablesCotizador: false,
    enablesComparativo: false
  };
}

export async function executeDocumentBatchDryRunP09d(plan, options = {}) {
  if (!plan || plan.code !== 'BATCH_READY_FOR_DRY_RUN') return { ok: false, code: 'VALID_BATCH_PLAN_REQUIRED', results: [], writeAllowed: false };
  if (typeof options.inspect !== 'function') return { ok: false, code: 'INSPECT_FUNCTION_REQUIRED', results: [], writeAllowed: false };
  const results = [];
  for (const item of plan.items) {
    try {
      const result = await options.inspect(item);
      results.push({ documentId: item.documentId, aseguradoraId: item.aseguradoraId, ok: result && result.ok === true, code: clean(result && result.code), result: result || null });
    } catch (error) {
      results.push({ documentId: item.documentId, aseguradoraId: item.aseguradoraId, ok: false, code: clean(error && (error.code || error.message) || 'INSPECTION_FAILED') });
      if (options.stopOnError !== false) break;
    }
  }
  return {
    ok: results.length === plan.items.length && results.every(row => row.ok),
    code: results.length === plan.items.length && results.every(row => row.ok) ? 'BATCH_DRY_RUN_COMPLETE' : 'BATCH_DRY_RUN_INCOMPLETE',
    tenantId: plan.tenantId,
    results,
    summary: { total: plan.items.length, executed: results.length, ok: results.filter(row => row.ok).length, failed: results.filter(row => !row.ok).length },
    writeAllowed: false,
    applyAllowed: false,
    requiresHumanValidation: true,
    enablesCotizador: false,
    enablesComparativo: false
  };
}
