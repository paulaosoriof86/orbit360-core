import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }

const collections = {
  aseguradora_bindings: [{
    id: 'binding-source-1', tenantId: 'alianzas-soluciones', aseguradoraId: 'ins-1',
    status: 'complete_requires_gate', version: 'v1',
    dimensiones: { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil' },
    ruleIds: ['rule-1'], profileId: 'profile-1', presentationDocumentId: 'doc-present', tariffDocumentIds: ['doc-rate'],
    requiresSecondGateForEnablement: true
  }],
  actividades: []
};
const clone = value => JSON.parse(JSON.stringify(value));
const store = {
  __firestoreLabExplicit: true,
  all(collection) { return (collections[collection] || []).map(clone); },
  get(collection, id) { const row = (collections[collection] || []).find(item => item.id === id); return row ? clone(row) : null; },
  insert(collection, row) { collections[collection] = collections[collection] || []; collections[collection].push(clone(row)); return clone(row); },
  update(collection, id, patch) {
    collections[collection] = collections[collection] || [];
    const index = collections[collection].findIndex(item => item.id === id);
    if (index < 0) throw new Error('ROW_NOT_FOUND');
    collections[collection][index] = { ...collections[collection][index], ...clone(patch) };
    return clone(collections[collection][index]);
  },
  remove(collection, id) { collections[collection] = (collections[collection] || []).filter(item => item.id !== id); },
  _labStatus() {
    return {
      mode: 'firestore-lab', tenantId: 'alianzas-soluciones', snapshotAttached: true, snapshotAttachedCount: 20,
      expectedUid: 'user-1', expectedEmail: 'user@example.com', auth: { uid: 'user-1', email: 'user@example.com' },
      writeQueue: [], writeErrors: []
    };
  }
};
function fingerprint(binding) { return binding ? `fp:${binding.id}:${binding.version}` : ''; }
const gate = {
  bindingFingerprint: fingerprint,
  buildEnablementPlan(binding, decision, actor) {
    if (!binding || decision.confirmed !== true || !decision.reason) return { ok: false, errors: ['REJECTED'] };
    return {
      ok: true,
      plan: {
        bindingId: binding.id, target: decision.target, enabled: decision.enabled !== false,
        expectedBindingFingerprint: fingerprint(binding), actorId: actor.id,
        approvedAt: '2026-07-12T05:00:00.000Z', reason: decision.reason
      },
      evaluation: { ready: true, errors: [], requiresSecondGateForEnablement: true }
    };
  },
  buildRuntimePackage(bindings, plans) {
    const binding = bindings[0], plan = plans[0];
    return {
      ok: true, errors: [], records: [{
        id: `runtime:${binding.id}:${plan.target}`, tenantId: binding.tenantId, aseguradoraId: binding.aseguradoraId,
        bindingId: binding.id, target: plan.target, enabled: plan.enabled === true,
        dimensiones: clone(binding.dimensiones), ruleIds: clone(binding.ruleIds), profileId: binding.profileId,
        presentationDocumentId: binding.presentationDocumentId, tariffDocumentIds: clone(binding.tariffDocumentIds),
        approvedBy: plan.actorId, approvedAt: plan.approvedAt, reason: plan.reason, status: 'ready_for_external_write'
      }]
    };
  }
};
const Orbit = {
  store,
  knowledgeBindingGateP08: gate,
  knowledgeBindingPolicyP08: {
    buildEnablementPlan: gate.buildEnablementPlan,
    buildRuntimePackage: gate.buildRuntimePackage
  },
  aseguradorasLabCollectionsP09e: {
    status: () => ({ installed: true, collections: ['a','b','c','d','e','f'], snapshotAttachedCount: 6 })
  }
};
const backend = {
  mode: 'firestore-lab', tenantId: 'alianzas-soluciones', expectedUid: 'user-1', expectedEmail: 'user@example.com',
  securityGuard: { installed: true }, status: () => store._labStatus()
};
const window = { Orbit, OrbitBackend: backend, location: { search: '?orbitBackend=firestore-lab&tenant=alianzas-soluciones' } };
window.window = window;
const context = { window, Orbit, URLSearchParams, console, Date, Math, Set, Array, String, Object, JSON, Number, Promise, setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/aseguradoras-binding-enablement-lab-v1208.js', 'utf8'), context);

const api = Orbit.aseguradorasBindingEnablementLabV1208;
assert(api, 'writer debe registrarse');
const admin = { id: 'user-1', tenantId: 'alianzas-soluciones', activeRole: 'direccion', assignedRoles: ['direccion'] };
const advisor = { id: 'advisor-1', tenantId: 'alianzas-soluciones', activeRole: 'asesor', assignedRoles: ['asesor'] };

assert(!api.buildPlan({ bindingId: 'binding-source-1', target: 'cotizador_automatico', reason: 'Validación completa', confirmed: true, actor: advisor }).ok, 'asesor no puede aprobar segundo gate');
assert(!api.buildPlan({ bindingId: 'binding-source-1', target: 'cotizador_automatico', reason: 'Validación completa', confirmed: false, actor: admin }).ok, 'confirmación reforzada es obligatoria');
assert(!api.buildPlan({ bindingId: 'missing', target: 'cotizador_automatico', reason: 'Validación completa', confirmed: true, actor: admin }).ok, 'binding inexistente debe bloquearse');

const built = api.buildPlan({ bindingId: 'binding-source-1', target: 'cotizador_automatico', enabled: true, reason: 'Fuente y presentación reconciliadas', confirmed: true, actor: admin, tenantConfig: {} });
assert(built.ok && built.plan, 'plan autorizado debe construirse');
assert(built.plan.writeAllowed === false && built.plan.requiresExternalWriter === true, 'constructor nunca escribe directamente');
assert(built.plan.runtimeRecord.enabled === true && built.plan.runtimeRecord.runtimeEnablementRecord === true, 'registro runtime debe representar aprobación explícita');
assert(api.preflight(built.plan, admin).ok, 'preflight LAB debe aceptar plan íntegro');

const sourceBefore = store.get('aseguradora_bindings', 'binding-source-1');
const persisted = await api.persist(built.plan, admin, { timeoutMs: 100, readModelTimeoutMs: 100 });
assert(persisted.persisted === true && persisted.code === 'BINDING_TARGET_ENABLED_CONFIRMED', 'persistencia debe confirmar habilitación en read model');
const runtime = store.get('aseguradora_bindings', 'runtime:binding-source-1:cotizador_automatico');
assert(runtime && runtime.enabled === true && runtime.sourceBindingId === 'binding-source-1', 'registro runtime debe quedar separado del binding fuente');
assert(store.get('aseguradora_bindings', 'binding-source-1').version === sourceBefore.version, 'binding fuente no debe mutarse');
assert(collections.actividades.some(row => row.tipo === 'aseguradora_binding_habilitado' && row.motivo === 'Fuente y presentación reconciliadas'), 'habilitación debe auditar motivo y acción');

const disableBuilt = api.buildPlan({ bindingId: 'binding-source-1', target: 'cotizador_automatico', enabled: false, reason: 'Suspensión controlada', confirmed: true, actor: admin });
assert(disableBuilt.ok, 'deshabilitación debe pasar por el mismo gate');
const disabled = await api.persist(disableBuilt.plan, admin, { timeoutMs: 100, readModelTimeoutMs: 100 });
assert(disabled.persisted && disabled.enabled === false, 'deshabilitación debe confirmarse');
assert(store.get('aseguradora_bindings', 'runtime:binding-source-1:cotizador_automatico').enabled === false, 'registro runtime debe reflejar deshabilitación');

const stale = api.buildPlan({ bindingId: 'binding-source-1', target: 'comparativo', enabled: true, reason: 'Comparativo validado', confirmed: true, actor: admin });
assert(stale.ok, 'plan previo debe construirse');
collections.aseguradora_bindings[0].version = 'v2';
const staleCheck = api.preflight(stale.plan, admin);
assert(!staleCheck.ok && staleCheck.errors.includes('BINDING_CAMBIO_REEJECUTAR_GATE'), 'cambio de huella debe obligar a reevaluar');
collections.aseguradora_bindings[0].version = 'v1';

const otherTenantActor = { ...admin, tenantId: 'otro-tenant' };
assert(!api.preflight(built.plan, otherTenantActor).ok, 'actor de otro tenant debe bloquearse');
assert(api.planSafe({}) === false, 'plan vacío nunca es seguro');
console.log('OK orbit360-test-binding-enablement-lab-v1208');
