import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }

const calls = { inspect: 0, buildPlan: 0, persist: 0, read: 0 };
const Orbit = {
  aseguradorasRuntimeBootstrapP09f: {
    start: async () => ({ status: 'ready' }),
    status: () => ({ status: 'ready' }),
    preflight: () => ({ ok: true })
  },
  services: {
    aseguradorasKnowledgeP09: {
      inspect: async input => {
        calls.inspect += 1;
        if (input.forceBackendRequired) return { ok: false, code: 'BACKEND_REQUIRED', errors: ['BACKEND_REQUIRED'] };
        return {
          ok: true,
          code: 'KNOWLEDGE_INSPECTION_READY_FOR_REVIEW',
          context: {
            tenantId: input.tenantId,
            aseguradoraId: 'dir-aseguate',
            insurer: { id: 'dir-aseguate', nombre: 'Aseguradora Guatemalteca', pais: 'GT' },
            source: input.source,
            purpose: input.purpose
          },
          manifest: { document: { documentId: input.source.documentId }, flags: { containsCustomerPayload: false, containsSecrets: false } },
          proposals: [{ id: 'mapping-demo', estado: 'requiere_validacion' }],
          tariffRules: [], presentations: [], bindings: [],
          enablesCotizador: false, enablesComparativo: false
        };
      },
      buildPlan: (inspection, review) => {
        calls.buildPlan += 1;
        return {
          ok: true,
          confirmed: true,
          metadataOnly: true,
          tenantId: inspection.context.tenantId,
          aseguradoraId: inspection.context.aseguradoraId,
          sourceDocumentId: inspection.context.source.documentId,
          actor: { id: review.actor.id, activeRole: review.actor.activeRole },
          operations: [{ type: 'upsert', row: { id: 'manifest-demo', enabled: false } }],
          enablesCotizador: false,
          enablesComparativo: false
        };
      },
      read: () => {
        calls.read += 1;
        return {
          insurer: { docs: [{ id: 'ays_aseguate_tarifario_2026_v1' }] },
          manifests: [{ documentId: 'ays_aseguate_tarifario_2026_v1' }]
        };
      }
    }
  },
  aseguradorasLabPersistenceP09e: {
    persist: async plan => {
      calls.persist += 1;
      assert(plan.metadataOnly === true, 'gate solo recibe plan metadata-only');
      return {
        ok: true, persisted: true, code: 'LAB_METADATA_PERSISTED_PENDING_VALIDATION',
        model: { insurer: { docs: [{ id: plan.sourceDocumentId }] }, manifests: [{ documentId: plan.sourceDocumentId }] },
        enablesCotizador: false, enablesComparativo: false
      };
    }
  }
};
const window = { Orbit, OrbitFirstSourcePlansP09f: [] };
window.window = window;
const context = { window, Orbit, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise };
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/data/tenant-alianzas-soluciones-first-source-p09f.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/aseguradoras-first-source-orchestrator-p09f.js', 'utf8'), context);

const api = Orbit.aseguradorasFirstSourceP09f;
const actor = { id: 'admin-demo', tenantId: 'alianzas-soluciones', activeRole: 'Admin', roles: ['Admin'] };
const base = {
  tenantId: 'alianzas-soluciones',
  planId: 'ays_aseguate_tarifario_first_source_v1',
  sourceRef: 'backend-ref://alianzas-soluciones/aseguate-tarifario-v1',
  reason: 'Registrar metadata inicial para revisión',
  confirmedPlan: true,
  actor
};

const prepared = await api.prepare(base);
assert(prepared.ok && prepared.code === 'FIRST_SOURCE_PLAN_READY_METADATA_ONLY', 'debe preparar primera fuente');
assert(prepared.persistencePlan.metadataOnly === true, 'plan debe ser metadata-only');
assert(prepared.source.archivoRef.startsWith('backend-ref://'), 'debe usar referencia backend, no ruta');
assert(prepared.enablesCotizador === false && prepared.enablesComparativo === false, 'preparar no habilita módulos');
assert(calls.inspect === 1 && calls.buildPlan === 1 && calls.persist === 0, 'prepare no debe persistir');

const dryRun = await api.run(base);
assert(dryRun.ok && dryRun.persisted === false && dryRun.code === 'FIRST_SOURCE_DRY_RUN_READY', 'run sin confirmPersistence debe ser dry-run');
assert(calls.persist === 0, 'dry-run no escribe');

const persisted = await api.run({ ...base, confirmPersistence: true });
assert(persisted.persisted === true && persisted.code === 'LAB_METADATA_PERSISTED_PENDING_VALIDATION', 'confirmación explícita debe pasar por gate LAB');
assert(calls.persist === 1, 'debe invocar una sola persistencia confirmada');
assert(persisted.enablesCotizador === false && persisted.enablesComparativo === false, 'persistencia no habilita módulos');

const verified = api.verify({ ...base });
assert(verified.ok && verified.sourceVisible && verified.manifestVisible, 'verify debe confirmar fuente y manifiesto');

const missingRef = await api.prepare({ ...base, sourceRef: '' });
assert(!missingRef.ok && missingRef.errors.includes('BACKEND_SOURCE_REFERENCE_REQUIRED'), 'referencia backend es obligatoria');
const missingReason = await api.prepare({ ...base, reason: '' });
assert(!missingReason.ok && missingReason.errors.includes('REASON_REQUIRED'), 'motivo es obligatorio');
const noConfirmation = await api.prepare({ ...base, confirmedPlan: false });
assert(!noConfirmation.ok && noConfirmation.errors.includes('PLAN_CONFIRMATION_REQUIRED'), 'confirmación del plan es obligatoria');

Orbit.services.aseguradorasKnowledgeP09.inspect = async () => ({ ok: false, code: 'BACKEND_REQUIRED', errors: ['BACKEND_REQUIRED'] });
const backendRequired = await api.prepare(base);
assert(!backendRequired.ok && backendRequired.code === 'BACKEND_REQUIRED', 'provider ausente debe propagarse honestamente');
console.log('OK orbit360-test-aseguradoras-first-source-p09f');