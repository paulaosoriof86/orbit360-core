import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }
let executeInput = null;
const events = [];
const Orbit = {
  aseguradorasBatchAdminActionsP09i: {
    preview(input) {
      return {
        ok: true,
        code: 'BATCH_ADMIN_PREVIEW_READY',
        tenantId: input.tenantId,
        batchId: input.batchId,
        documentIds: input.documentIds,
        actor: input.actor,
        reason: input.reason,
        fingerprint: 'fp-1',
        requiredConfirmation: 'EJECUTAR DRY-RUN',
        referenceContract: {
          provided: Object.keys(input.sourceRefs || {}).length,
          missing: input.documentIds.filter(id => !(input.sourceRefs || {})[id])
        }
      };
    },
    async execute(plan, input) {
      executeInput = input;
      return {
        ok: true,
        code: 'BATCH_DRY_RUN_COMPLETE',
        tenantId: plan.tenantId,
        batchId: plan.batchId,
        documentIds: plan.documentIds,
        run: { runId: 'run-1', summary: { total: plan.documentIds.length } },
        knowledgePersisted: false,
        historyPersisted: false,
        enablesCotizador: false,
        enablesComparativo: false
      };
    }
  }
};
const bridge = {
  async resolveBatchReferences(request) {
    return {
      connected: true,
      code: 'SOURCE_REFERENCES_RESOLVED',
      references: Object.fromEntries(request.documentIds.map(id => [id, `backend-ref://tenant/${id}`]))
    };
  }
};
const window = {
  Orbit,
  OrbitBackendDocumentBridge: bridge,
  dispatchEvent(event) { events.push(event); }
};
window.window = window;
const context = {
  window, Orbit, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise,
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options && options.detail; } }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/aseguradoras-source-reference-broker-p09j.js', 'utf8'), context);

const api = Orbit.aseguradorasSourceReferenceBrokerP09j;
const actor = { id: 'op-1', tenantId: 'alianzas-soluciones', activeRole: 'Operativo' };
const prepared = await api.prepare({
  tenantId: 'alianzas-soluciones',
  batchId: 'batch-1',
  action: 'dry_run',
  documentIds: ['doc-a', 'doc-b'],
  actor,
  reason: 'Validar lote'
});
assert(prepared.ok && prepared.executable, 'broker conectado debe preparar preview ejecutable');
assert(prepared.ticket.availability.provided === 2 && prepared.ticket.availability.missing.length === 0, 'debe reportar disponibilidad');
assert(!JSON.stringify(prepared).includes('backend-ref://'), 'resultado público no debe exponer referencias');
assert(prepared.preview.referenceContract.provided === 2, 'preview debe recibir referencias internamente');

const execution = await api.execute(prepared.ticket.ticketId, prepared.preview, {
  actor,
  reason: prepared.preview.reason,
  expectedFingerprint: prepared.preview.fingerprint,
  confirmExecution: true,
  confirmationText: 'EJECUTAR DRY-RUN'
});
assert(execution.ok && execution.code === 'BATCH_DRY_RUN_COMPLETE', 'ticket válido debe ejecutar');
assert(executeInput && executeInput.sourceRefs['doc-a'], 'broker debe inyectar referencias solo al contrato interno');
assert(!JSON.stringify(execution).includes('backend-ref://'), 'ejecución pública no debe exponer referencias');
const reused = await api.execute(prepared.ticket.ticketId, prepared.preview, { actor });
assert(!reused.ok && reused.code === 'SOURCE_REFERENCE_TICKET_CONSUMED', 'ticket consumido no debe reutilizarse');

api.resetForTest();
delete window.OrbitBackendDocumentBridge;
const pending = await api.prepare({
  tenantId: 'alianzas-soluciones',
  batchId: 'batch-1',
  action: 'dry_run',
  documentIds: ['doc-a'],
  actor,
  reason: 'Validar sin backend'
});
assert(pending.preview.ok && !pending.executable, 'sin backend debe permitir preview pero bloquear ejecución');
assert(pending.ticket.code === 'BACKEND_REQUIRED' && pending.ticket.availability.missing.includes('doc-a'), 'debe mostrar backend pendiente');
assert(events.some(event => event.type === 'orbit:aseguradoras:source-reference-state'), 'debe emitir estado sanitizado');
const source = fs.readFileSync('orbit360-platform/core/aseguradoras-source-reference-broker-p09j.js', 'utf8');
assert(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|Orbit\.store\.(?:insert|update|remove)/.test(source), 'broker no debe usar red directa ni storage');
assert(!/(enabledCotizador|enabledComparativo|enablesCotizador|enablesComparativo)\s*:\s*true/.test(source), 'broker no debe habilitar módulos');
console.log('OK orbit360-test-aseguradoras-source-reference-broker-p09j');