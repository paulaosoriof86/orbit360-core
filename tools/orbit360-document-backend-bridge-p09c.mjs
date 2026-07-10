import { runAuthorizedDocumentTask, runnerStatus } from './orbit360-document-backend-runner-p09c.mjs';

function clean(value) { return String(value == null ? '' : value).trim(); }
function sanitizeReferenceResult(value) {
  if (!value || typeof value !== 'object') return value;
  return {
    ok: value.ok !== false,
    code: clean(value.code),
    errors: Array.isArray(value.errors) ? value.errors.map(clean).filter(Boolean) : [],
    audit: value.audit && typeof value.audit === 'object' ? value.audit : undefined,
    localPath: clean(value.localPath || value.path),
    fileRef: clean(value.fileRef),
    sourceHash: clean(value.sourceHash),
    authorization: value.authorization && {
      allowSensitiveValues: value.authorization.allowSensitiveValues === true,
      reason: clean(value.authorization.reason)
    }
  };
}

export function createDocumentBackendBridgeP09c(options = {}) {
  const resolver = options.resolveSource;
  const status = runnerStatus(options);
  return {
    async status() {
      return {
        connected: status.connected && typeof resolver === 'function',
        tasks: status.tasks,
        deterministic: true,
        externalAi: false,
        region: status.region,
        version: status.version,
        metadataOnly: true,
        writeAllowed: false,
        code: typeof resolver === 'function' ? (status.connected ? 'RUNNER_READY' : 'EXTRACTORS_REQUIRED') : 'SOURCE_RESOLVER_REQUIRED'
      };
    },
    async execute(task, request) {
      if (typeof resolver !== 'function') return { ok: false, code: 'SOURCE_RESOLVER_REQUIRED', writeAllowed: false };
      const resolved = sanitizeReferenceResult(await resolver({
        tenantId: clean(request && request.tenantId),
        aseguradoraId: clean(request && request.aseguradoraId),
        documentId: clean(request && request.documentId),
        fileRef: clean(request && request.fileRef),
        purpose: clean(request && request.purpose || 'training'),
        task: clean(task)
      }));
      if (resolved && resolved.ok === false) {
        const error = new Error(resolved.code || 'SOURCE_REFERENCE_NOT_RESOLVED');
        error.code = resolved.code || 'SOURCE_REFERENCE_NOT_RESOLVED';
        error.details = resolved.errors || [];
        error.audit = resolved.audit;
        throw error;
      }
      if (!resolved || !resolved.localPath) return { ok: false, code: 'SOURCE_REFERENCE_NOT_RESOLVED', writeAllowed: false };
      const outcome = await runAuthorizedDocumentTask(Object.assign({}, request || {}, {
        task: clean(task),
        localPath: resolved.localPath,
        fileRef: resolved.fileRef || clean(request && request.fileRef),
        sourceHash: resolved.sourceHash || clean(request && request.sourceHash),
        authorization: resolved.authorization || request && request.authorization
      }), options);
      if (!outcome.ok) {
        const error = new Error(outcome.code || 'DOCUMENT_RUNNER_FAILED');
        error.code = outcome.code || 'DOCUMENT_RUNNER_FAILED';
        error.details = outcome.errors || [];
        throw error;
      }
      return Object.assign({}, outcome.result || {}, {
        runnerExecution: {
          code: outcome.code,
          task: outcome.task,
          sourceHash: outcome.sourceHash,
          sourceSizeBytes: outcome.sourceSizeBytes,
          audit: outcome.audit,
          writeAllowed: false,
          requiresHumanValidation: true
        }
      });
    }
  };
}
