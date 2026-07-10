import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }
const attempts = Object.create(null);
let persistCalls = 0;
const events = [];

const Orbit = {
  tenantSourceBatchAdapterP10: {
    resolveBatchSources(input) {
      const sources = (input.sources || []).map(source => ({
        ...source,
        aseguradoraId: `ins_${String(source.aseguradoraNombre || '').toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
      }));
      return {
        ok: true,
        code: 'TENANT_SOURCE_BATCH_RESOLVED',
        tenantId: input.tenantId,
        sources,
        rows: sources.map(source => ({ resolvedSource: source, errors: [] })),
        errors: []
      };
    }
  },
  aseguradorasFirstSourceP09f: {
    async prepare(input) {
      const docId = input.plan.source.documentId;
      attempts[docId] = (attempts[docId] || 0) + 1;
      if (docId === 'ays_bam_vehiculos_2025_v1' && attempts[docId] === 1) {
        return { ok: false, code: 'PROVIDER_EXECUTION_FAILED', errors: ['transient'] };
      }
      const isPdf = /pdf/i.test(input.plan.source.tipoFuente || '');
      const isAseGuateTariff = docId === 'ays_aseguate_tarifario_2026_v1';
      const isAseGuateQuote = docId.includes('ays_aseguate_cotizacion_');
      return {
        ok: true,
        inspection: {
          manifest: { documentId: docId },
          proposals: isPdf ? [] : [{ id: `proposal_${docId}` }],
          tariffRules: isAseGuateTariff ? [{ id: 'rule_aseguate_vehicle' }] : [],
          presentations: isPdf ? [{ id: `presentation_${docId}` }] : [],
          bindings: [],
          reconciliations: isAseGuateQuote ? [{ id: `reconciliation_${docId}` }] : []
        },
        persistencePlan: {
          ok: true,
          planId: `plan_${docId}`,
          operations: [],
          enablesCotizador: false,
          enablesComparativo: false
        }
      };
    },
    async persist() {
      persistCalls += 1;
      return { ok: true, persisted: true, code: 'METADATA_PERSISTED_PENDING_ENABLEMENT' };
    },
    verify() {
      return { ok: true, code: 'FIRST_SOURCE_VISIBLE_IN_READ_MODEL', sourceVisible: true, manifestVisible: true };
    }
  }
};
const window = {
  Orbit,
  OrbitSourceBatchesP09g: [],
  dispatchEvent(event) { events.push(event); }
};
window.window = window;
const context = {
  window, Orbit, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise,
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options && options.detail; } }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/data/tenant-alianzas-soluciones-source-batch-p09g.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/aseguradoras-batch-orchestrator-p09g.js', 'utf8'), context);

const api = Orbit.aseguradorasBatchOrchestratorP09g;
const batches = api.listBatches('alianzas-soluciones');
assert(batches.length === 1, 'debe registrar un lote tenant');
assert(batches[0].totalSources === 11, 'debe contener once fuentes');
assert(batches[0].totalInsurers === 6, 'debe agrupar seis aseguradoras');
assert(batches[0].totalExcel === 8 && batches[0].totalPdf === 3, 'debe clasificar ocho Excel y tres PDF');

const batch = api.getBatch('alianzas-soluciones', 'ays_aseguradoras_knowledge_batch_2026_v1');
const refs = Object.fromEntries(batch.sources.map(item => [item.source.documentId, `backend-ref://alianzas-soluciones/${item.source.documentId}`]));
const actor = { id: 'actor-admin', tenantId: 'alianzas-soluciones', activeRole: 'AdminTenant', roles: ['AdminTenant'] };
const common = {
  tenantId: 'alianzas-soluciones',
  batchId: batch.id,
  sourceRefs: refs,
  actor,
  reason: 'Validar lote documental A&S',
  skipBootstrap: true
};

const dry = await api.run({ ...common, mode: 'dry_run' });
assert(dry.ok && dry.code === 'BATCH_DRY_RUN_COMPLETE', 'dry-run completo debe cerrar correctamente');
assert(dry.summary.total === 11 && dry.summary.dryRunReady === 11, 'las once fuentes deben quedar listas en dry-run');
assert(persistCalls === 0, 'dry-run no debe persistir');
assert(attempts.ays_bam_vehiculos_2025_v1 === 2, 'fallo transitorio debe reintentarse');
const autoBinding = dry.bindingSets.find(row => row.id === 'ays_aseguate_auto_binding_set_v1');
const microBinding = dry.bindingSets.find(row => row.id === 'ays_aseguate_microbus_binding_set_v1');
const universales = dry.bindingSets.find(row => row.id === 'ays_universales_riesgo_plus_binding_set_v1');
assert(autoBinding.status === 'ready_for_binding_review', 'AseGuate automóvil debe quedar listo para revisión de binding');
assert(microBinding.status === 'ready_for_binding_review', 'AseGuate microbús debe quedar listo para revisión de binding');
assert(universales.status === 'incomplete_known_missing_knowledge' && universales.missingKnowledge.includes('tariff_rule'), 'Universales debe conservar tarifa faltante');
assert(dry.enablesCotizador === false && dry.enablesComparativo === false, 'lote nunca habilita módulos');
assert(!JSON.stringify(dry).includes('backend-ref://'), 'estado público no debe exponer referencias backend');

const missingRefs = { ...refs };
delete missingRefs.ays_columna_vehiculos_2026_v14;
const partial = await api.run({ ...common, sourceRefs: missingRefs, mode: 'dry_run' });
assert(!partial.ok && partial.summary.waitingReference === 1, 'referencia faltante debe dejar lote incompleto');
assert(partial.results.find(row => row.documentId === 'ays_columna_vehiculos_2026_v14').code === 'BACKEND_SOURCE_REFERENCE_REQUIRED', 'debe conservar código exacto de referencia faltante');

const deniedPersist = await api.run({ ...common, mode: 'persist' });
assert(!deniedPersist.ok && deniedPersist.code === 'BATCH_PERSISTENCE_CONFIRMATION_REQUIRED', 'persistencia requiere confirmación del lote');
assert(persistCalls === 0, 'confirmación faltante no debe llamar persistencia');

const persisted = await api.run({
  ...common,
  mode: 'persist',
  confirmBatchPersistence: true,
  confirmAllPersistence: true
});
assert(persisted.ok && persisted.code === 'BATCH_PERSISTENCE_COMPLETE', 'persistencia confirmada debe completar lote sintético');
assert(persisted.summary.verified === 11 && persistCalls === 11, 'cada fuente debe pasar por persistencia y verificación');
assert(events.some(event => event.type === 'orbit:aseguradoras:batch-state'), 'debe emitir estado de lote');

const source = fs.readFileSync('orbit360-platform/core/aseguradoras-batch-orchestrator-p09g.js', 'utf8');
assert(!/Orbit\.store\.(?:insert|update|remove)|localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(source), 'orquestador no debe escribir store ni usar red/almacenamiento local');
assert(!/enabledCotizador\s*:\s*true|enabledComparativo\s*:\s*true|enablesCotizador\s*:\s*true|enablesComparativo\s*:\s*true/.test(source), 'orquestador no debe habilitar módulos');
console.log('OK orbit360-test-aseguradoras-batch-orchestrator-p09g');