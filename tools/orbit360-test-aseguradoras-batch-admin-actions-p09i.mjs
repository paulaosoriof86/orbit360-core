import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }
let runCalls = 0;
let resumeCalls = 0;
let historyPersistCalls = 0;
let lastRunInput = null;
let lastResumeInput = null;

const batch = {
  id: 'ays_aseguradoras_knowledge_batch_2026_v1',
  tenantId: 'alianzas-soluciones',
  version: '2026-v1',
  sources: [
    { order: 10, insurerName: 'Compañía Alfa', source: { documentId: 'doc-excel', nombre: 'Tarifario demo.xlsx', tipoFuente: 'tarifario_excel', pais: 'GT', moneda: 'GTQ', producto: 'Vehículos', version: 'v1' } },
    { order: 20, insurerName: 'Compañía Alfa', source: { documentId: 'doc-pdf', nombre: 'Cotización demo.pdf', tipoFuente: 'cotizacion_pdf_oficial', pais: 'GT', moneda: 'GTQ', producto: 'Vehículos', version: 'v1' } },
    { order: 30, insurerName: 'Compañía Beta', source: { documentId: 'doc-pendiente', nombre: 'Salud demo.xlsx', tipoFuente: 'cotizador_excel_salida', pais: 'GT', moneda: 'GTQ', producto: 'Salud', version: 'v1' } }
  ]
};
const Orbit = {
  aseguradorasBatchOrchestratorP09g: {
    getBatch(tenantId, batchId) { return tenantId === batch.tenantId && batchId === batch.id ? JSON.parse(JSON.stringify(batch)) : null; },
    async run(input) {
      runCalls += 1;
      lastRunInput = input;
      return {
        ok: true, code: 'BATCH_DRY_RUN_COMPLETE', runId: 'run-dry-1', batchId: batch.id,
        tenantId: batch.tenantId, mode: 'dry_run', status: 'dry_run_complete',
        startedAt: '2026-07-10T12:00:00Z', completedAt: '2026-07-10T12:01:00Z',
        results: input.onlyDocumentIds.map(documentId => ({ documentId, status: 'dry_run_ready', code: 'SOURCE_DRY_RUN_READY', attempts: 1, outputs: { manifest: 1 } })),
        summary: { total: input.onlyDocumentIds.length, dryRunReady: input.onlyDocumentIds.length },
        bindingSets: [], errors: [], enablesCotizador: false, enablesComparativo: false
      };
    },
    async resume(input) {
      resumeCalls += 1;
      lastResumeInput = input;
      return {
        ok: true, code: 'BATCH_DRY_RUN_COMPLETE', runId: 'run-resume-1', batchId: batch.id,
        tenantId: batch.tenantId, mode: 'dry_run', status: 'dry_run_complete',
        startedAt: '2026-07-10T13:00:00Z', completedAt: '2026-07-10T13:01:00Z',
        resumedFromRunId: input.resumedFromRunId,
        results: input.onlyDocumentIds.map(documentId => ({ documentId, status: 'dry_run_ready', code: 'SOURCE_DRY_RUN_READY', attempts: 1, outputs: { manifest: 1 } })),
        summary: { total: input.onlyDocumentIds.length, dryRunReady: input.onlyDocumentIds.length },
        bindingSets: [], errors: [], enablesCotizador: false, enablesComparativo: false
      };
    }
  },
  aseguradorasBatchHistoryP09h: {
    buildReferenceContract(batchInput, refs) {
      return {
        tenantId: batchInput.tenantId,
        batchId: batchInput.id,
        requirements: batchInput.sources.map(item => ({
          documentId: item.source.documentId,
          insurerName: item.insurerName,
          task: /pdf/i.test(item.source.tipoFuente) ? 'pdf_manifest' : 'excel_manifest',
          required: true,
          provided: !!refs[item.source.documentId],
          referenceValueExposed: false
        })),
        containsReferences: false,
        containsPaths: false,
        writeAllowed: false
      };
    },
    resumeDocumentIds() { return ['doc-pendiente']; },
    buildHistoryPlan(input) {
      return {
        ok: true, code: 'BATCH_HISTORY_PLAN_READY', planId: 'history-plan-1',
        tenantId: input.run.tenantId, batchId: input.run.batchId, runId: input.run.runId,
        operations: [{ type: 'upsert', collection: 'aseguradora_batch_runs', id: input.run.runId, row: { id: input.run.runId } }],
        expectedItems: input.run.results.length, reason: input.reason, actor: input.actor,
        confirmed: input.confirmed === true, metadataOnly: true, writeAllowed: false,
        enablesCotizador: false, enablesComparativo: false
      };
    },
    async persistHistory(plan) {
      historyPersistCalls += 1;
      return {
        ok: true, persisted: true, code: 'BATCH_HISTORY_PERSISTED',
        applied: plan.operations, enablesCotizador: false, enablesComparativo: false,
        writeAllowed: false
      };
    }
  }
};
const window = { Orbit, dispatchEvent() {} };
window.window = window;
const context = {
  window, Orbit, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/aseguradoras-batch-admin-actions-p09i.js', 'utf8'), context);

const api = Orbit.aseguradorasBatchAdminActionsP09i;
const operativo = { id: 'op-1', tenantId: 'alianzas-soluciones', activeRole: 'Operativo', roles: ['Operativo'] };
const admin = { id: 'admin-1', tenantId: 'alianzas-soluciones', activeRole: 'AdminTenant', roles: ['AdminTenant'] };
const asesor = { id: 'asesor-1', tenantId: 'alianzas-soluciones', activeRole: 'Asesor', roles: ['Asesor'] };
const refs = {
  'doc-excel': 'backend-ref://alianzas-soluciones/doc-excel',
  'doc-pdf': 'backend-ref://alianzas-soluciones/doc-pdf'
};

const denied = api.preview({ tenantId: batch.tenantId, batchId: batch.id, action: 'dry_run', actor: asesor, reason: 'Revisar fuentes', sourceRefs: refs });
assert(!denied.ok && denied.errors.includes('ACTIVE_ROLE_NOT_AUTHORIZED'), 'Asesor no debe preparar acción administrativa');

const preview = api.preview({ tenantId: batch.tenantId, batchId: batch.id, action: 'dry_run', actor: operativo, reason: 'Revisar lote documental', sourceRefs: refs });
assert(preview.ok && preview.code === 'BATCH_ADMIN_PREVIEW_READY', 'Operativo debe poder preparar preview');
assert(preview.documents.length === 3 && preview.referenceContract.provided === 2, 'preview debe resumir documentos y referencias');
assert(preview.referenceContract.missing.includes('doc-pendiente'), 'preview debe identificar referencia faltante');
assert(!JSON.stringify(preview).includes('backend-ref://'), 'preview no debe exponer referencias');
assert(preview.requiredConfirmation === 'EJECUTAR DRY-RUN', 'dry-run debe exigir frase reforzada');

const noConfirm = await api.execute(preview, { actor: operativo, expectedFingerprint: preview.fingerprint, reason: preview.reason });
assert(!noConfirm.ok && noConfirm.code === 'EXECUTION_CONFIRMATION_REQUIRED', 'ejecución requiere confirmación');
const wrongPhrase = await api.execute(preview, {
  actor: operativo, expectedFingerprint: preview.fingerprint, reason: preview.reason,
  confirmExecution: true, confirmationText: 'CONFIRMAR'
});
assert(!wrongPhrase.ok && wrongPhrase.code === 'REINFORCED_CONFIRMATION_MISMATCH', 'frase incorrecta debe bloquear');

const execution = await api.execute(preview, {
  actor: operativo, expectedFingerprint: preview.fingerprint, reason: preview.reason,
  confirmExecution: true, confirmationText: 'EJECUTAR DRY-RUN', sourceRefs: refs,
  skipBootstrap: true
});
assert(execution.ok && execution.code === 'BATCH_DRY_RUN_COMPLETE', 'confirmación correcta debe ejecutar dry-run');
assert(runCalls === 1 && lastRunInput.mode === 'dry_run', 'acción debe llamar solo dry-run');
assert(lastRunInput.persistHistory === false && lastRunInput.confirmHistoryPlan === false, 'ejecución no debe persistir historial automáticamente');
assert(execution.knowledgePersisted === false && execution.historyPersisted === false, 'ejecución no debe persistir conocimiento ni historial');
assert(!JSON.stringify(execution).includes('backend-ref://'), 'estado de ejecución no debe exponer referencias');

const resumePreview = api.preview({ tenantId: batch.tenantId, batchId: batch.id, action: 'resume', actor: operativo, reason: 'Reanudar pendientes', sourceRefs: { 'doc-pendiente': 'backend-ref://alianzas-soluciones/doc-pendiente' } });
assert(resumePreview.ok && resumePreview.documentIds.length === 1 && resumePreview.documentIds[0] === 'doc-pendiente', 'resume debe seleccionar solo reanudables');
assert(resumePreview.requiredConfirmation === 'REANUDAR DRY-RUN', 'resume debe exigir frase propia');
const resumed = await api.execute(resumePreview, {
  actor: operativo, expectedFingerprint: resumePreview.fingerprint, reason: resumePreview.reason,
  confirmExecution: true, confirmationText: 'REANUDAR DRY-RUN',
  sourceRefs: { 'doc-pendiente': 'backend-ref://alianzas-soluciones/doc-pendiente' },
  resumedFromRunId: 'run-anterior', skipBootstrap: true
});
assert(resumed.ok && resumeCalls === 1, 'resume debe usar orquestador reanudable');
assert(lastResumeInput.onlyDocumentIds.length === 1 && lastResumeInput.resumedFromRunId === 'run-anterior', 'resume debe conservar selección y origen');

const deniedHistory = api.buildHistoryPlan(execution, { actor: operativo, reason: preview.reason, tenantId: batch.tenantId, batchId: batch.id, confirmHistoryPlan: true });
assert(!deniedHistory.ok && deniedHistory.code === 'ACTIVE_ROLE_NOT_AUTHORIZED', 'Operativo no debe persistir historial global');
const doubleConfirmMissing = await api.persistHistory(execution, { actor: admin, reason: preview.reason, tenantId: batch.tenantId, batchId: batch.id, confirmHistoryPlan: true });
assert(!doubleConfirmMissing.ok && doubleConfirmMissing.code === 'HISTORY_DOUBLE_CONFIRMATION_REQUIRED', 'historial requiere doble confirmación');
const historyResult = await api.persistHistory(execution, {
  actor: admin, reason: preview.reason, tenantId: batch.tenantId, batchId: batch.id,
  confirmHistoryPlan: true, confirmHistoryPersistence: true
});
assert(historyResult.ok && historyResult.persisted && historyPersistCalls === 1, 'Admin debe persistir solo historial confirmado');
assert(historyResult.knowledgePersisted === false && historyResult.historyPersisted === true, 'persistencia debe limitarse al historial');

const status = api.status();
assert(status.referencesExposed === false && status.knowledgePersistenceAllowed === false, 'estado debe mantener referencias y conocimiento bloqueados');
assert(!JSON.stringify(status).includes('backend-ref://'), 'status no debe exponer referencias');
const source = fs.readFileSync('orbit360-platform/core/aseguradoras-batch-admin-actions-p09i.js', 'utf8');
assert(!/Orbit\.store\.(?:insert|update|remove)|localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(source), 'acciones admin no deben escribir store ni usar red/almacenamiento directo');
assert(!/enabledCotizador\s*:\s*true|enabledComparativo\s*:\s*true|enablesCotizador\s*:\s*true|enablesComparativo\s*:\s*true/.test(source), 'acciones admin no deben habilitar módulos');
console.log('OK orbit360-test-aseguradoras-batch-admin-actions-p09i');