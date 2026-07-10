function clean(value) { return String(value == null ? '' : value).trim(); }
function norm(value) { return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
function unique(values) { return Array.from(new Set((values || []).filter(Boolean))); }
function parseTime(value) { const n = Date.parse(clean(value)); return Number.isFinite(n) ? n : null; }
const ALLOWED_STATUS = ['ready', 'mounted', 'available'];
const ALLOWED_TASKS = ['excel_manifest', 'pdf_manifest', 'pdf_ocr', 'pdf_semantic', 'excel_semantic'];
const ALLOWED_PURPOSES = ['training', 'operational'];

function validateRequest(input) {
  const errors = [];
  if (!clean(input && input.tenantId)) errors.push('TENANT_REQUIRED');
  if (!clean(input && input.aseguradoraId)) errors.push('INSURER_REQUIRED');
  if (!clean(input && input.documentId)) errors.push('DOCUMENT_REQUIRED');
  if (!clean(input && input.fileRef)) errors.push('FILE_REF_REQUIRED');
  if (!ALLOWED_TASKS.includes(clean(input && input.task))) errors.push('TASK_UNSUPPORTED');
  if (!ALLOWED_PURPOSES.includes(clean(input && input.purpose || 'training'))) errors.push('PURPOSE_INVALID');
  if (clean(input && input.localPath || input && input.path)) errors.push('CLIENT_PATH_FORBIDDEN');
  return { valid: errors.length === 0, errors };
}
function validateRecord(record, request, nowMs) {
  const errors = [];
  if (!record) return { valid: false, errors: ['SOURCE_REFERENCE_NOT_FOUND'] };
  if (clean(record.fileRef) !== clean(request.fileRef)) errors.push('REFERENCE_MISMATCH');
  if (clean(record.tenantId) !== clean(request.tenantId)) errors.push('REFERENCE_TENANT_MISMATCH');
  if (clean(record.aseguradoraId) && clean(record.aseguradoraId) !== clean(request.aseguradoraId)) errors.push('REFERENCE_INSURER_MISMATCH');
  if (clean(record.documentId) && clean(record.documentId) !== clean(request.documentId)) errors.push('REFERENCE_DOCUMENT_MISMATCH');
  if (!ALLOWED_STATUS.includes(norm(record.status))) errors.push('REFERENCE_NOT_READY');
  if (!clean(record.localPath || record.path)) errors.push('REFERENCE_LOCAL_PATH_REQUIRED');
  const expires = parseTime(record.expiresAt);
  if (expires != null && expires <= nowMs) errors.push('REFERENCE_EXPIRED');
  const tasks = unique([].concat(record.tasks || record.capabilities || []).map(clean));
  if (tasks.length && !tasks.includes(clean(request.task))) errors.push('REFERENCE_TASK_NOT_ALLOWED');
  const purposes = unique([].concat(record.purposes || []).map(clean));
  if (purposes.length && !purposes.includes(clean(request.purpose || 'training'))) errors.push('REFERENCE_PURPOSE_NOT_ALLOWED');
  if (record.singleUse === true && record.usedAt) errors.push('REFERENCE_ALREADY_USED');
  if (request.purpose === 'operational' && request.includeSensitiveValues === true) {
    if (record.allowSensitiveValues !== true) errors.push('REFERENCE_SENSITIVE_ACCESS_NOT_ALLOWED');
    if (!clean(record.sensitiveAccessReason || request.reason)) errors.push('REFERENCE_SENSITIVE_REASON_REQUIRED');
  }
  return { valid: errors.length === 0, errors };
}
function audit(request, record, code, nowIso) {
  return {
    eventType: 'document_source_reference_resolution',
    tenantId: clean(request && request.tenantId),
    aseguradoraId: clean(request && request.aseguradoraId),
    documentId: clean(request && request.documentId),
    fileRef: clean(request && request.fileRef),
    task: clean(request && request.task),
    purpose: clean(request && request.purpose || 'training'),
    referenceId: clean(record && record.id),
    code,
    resolvedAt: nowIso,
    containsLocalPath: false,
    containsRawPayload: false,
    containsSecrets: false
  };
}

export function createDocumentSourceResolverP09d(options = {}) {
  const lookup = options.lookupReference;
  const markUsed = options.markReferenceUsed;
  const clock = options.clock || (() => new Date());
  const allowedTenants = unique([].concat(options.allowedTenants || []).map(clean));
  return async function resolveSource(request) {
    request = request || {};
    const requestValidation = validateRequest(request);
    const now = clock(); const nowMs = now.getTime(); const nowIso = now.toISOString();
    if (!requestValidation.valid) return { ok: false, code: requestValidation.errors[0], errors: requestValidation.errors, audit: audit(request, null, requestValidation.errors[0], nowIso) };
    if (allowedTenants.length && !allowedTenants.includes(clean(request.tenantId))) {
      return { ok: false, code: 'TENANT_NOT_ALLOWED', errors: ['TENANT_NOT_ALLOWED'], audit: audit(request, null, 'TENANT_NOT_ALLOWED', nowIso) };
    }
    if (typeof lookup !== 'function') return { ok: false, code: 'REFERENCE_LOOKUP_REQUIRED', errors: ['REFERENCE_LOOKUP_REQUIRED'], audit: audit(request, null, 'REFERENCE_LOOKUP_REQUIRED', nowIso) };
    const record = await lookup({ tenantId: clean(request.tenantId), fileRef: clean(request.fileRef), documentId: clean(request.documentId) });
    const validation = validateRecord(record, request, nowMs);
    if (!validation.valid) return { ok: false, code: validation.errors[0], errors: validation.errors, audit: audit(request, record, validation.errors[0], nowIso) };
    if (record.singleUse === true && typeof markUsed === 'function') await markUsed({ id: clean(record.id), tenantId: clean(record.tenantId), usedAt: nowIso });
    return {
      ok: true,
      code: 'SOURCE_REFERENCE_RESOLVED',
      localPath: clean(record.localPath || record.path),
      fileRef: clean(record.fileRef),
      sourceHash: clean(record.sourceHash),
      authorization: request.purpose === 'operational' && request.includeSensitiveValues === true ? {
        allowSensitiveValues: record.allowSensitiveValues === true,
        reason: clean(record.sensitiveAccessReason || request.reason)
      } : undefined,
      audit: audit(request, record, 'SOURCE_REFERENCE_RESOLVED', nowIso)
    };
  };
}

export const documentSourceResolverP09d = { ALLOWED_STATUS: ALLOWED_STATUS.slice(), ALLOWED_TASKS: ALLOWED_TASKS.slice(), ALLOWED_PURPOSES: ALLOWED_PURPOSES.slice(), validateRequest, validateRecord, createDocumentSourceResolverP09d };
