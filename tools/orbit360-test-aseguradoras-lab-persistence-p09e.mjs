import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }
const orbit = { services: {} };
let status = {
  mode: 'firestore-lab', tenantId: 'alianzas-soluciones', snapshotAttached: true,
  snapshotAttachedCount: 24, expectedUid: 'uid-lab', expectedEmail: 'lab@example.test',
  auth: { uid: 'uid-lab', email: 'lab@example.test' }, writeQueue: [], writeErrors: []
};
const backend = {
  mode: 'firestore-lab', tenantId: 'alianzas-soluciones', expectedUid: 'uid-lab', expectedEmail: 'lab@example.test',
  securityGuard: { installed: true }, status: () => status
};
const store = { __firestoreLabExplicit: true, _labStatus: () => status };
orbit.store = store;
orbit.aseguradorasLabCollectionsP09e = {
  status: () => ({ installed: true, snapshotAttachedCount: 6, collections: ['a','b','c','d','e','f'] })
};
const model = {
  insurer: { docs: [{ id: 'doc-1' }] },
  manifests: [{ documentId: 'doc-1' }]
};
orbit.services.aseguradorasKnowledgeP09 = {
  persist: () => ({ ok: true, code: 'METADATA_PERSISTED_PENDING_ENABLEMENT' }),
  read: () => model
};
const context = {
  window: { Orbit: orbit, OrbitBackend: backend, ORBIT_BACKEND: backend }, Orbit: orbit,
  console, Date, Math, Set, Array, String, Object, JSON, Number, Promise,
  setTimeout, clearTimeout
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/aseguradoras-lab-persistence-p09e.js', 'utf8'), context);
const api = orbit.aseguradorasLabPersistenceP09e;
const actor = { id: 'admin-1', tenantId: 'alianzas-soluciones', activeRole: 'AdminTenant', roles: ['AdminTenant','Asesor'] };
const plan = {
  ok: true, confirmed: true, metadataOnly: true, tenantId: 'alianzas-soluciones',
  aseguradoraId: 'ins-1', sourceDocumentId: 'doc-1', enablesCotizador: false, enablesComparativo: false,
  operations: [{ type: 'upsert', row: { id: 'm1', enabled: false, enabledCotizador: false, enabledComparativo: false } }]
};
const check = api.preflight(plan, actor);
assert(check.ok, `preflight debe pasar: ${check.errors}`);
const result = await api.persist(plan, actor, { timeoutMs: 200 });
assert(result.persisted && result.code === 'LAB_METADATA_PERSISTED_PENDING_VALIDATION', 'persistencia LAB debe confirmarse por read model');
assert(result.enablesCotizador === false && result.enablesComparativo === false, 'nunca debe habilitar módulos');
const unsafePlan = { ...plan, operations: [{ type: 'upsert', row: { enabledCotizador: true } }] };
assert(!api.preflight(unsafePlan, actor).ok, 'plan que habilita debe bloquearse');
status = { ...status, auth: { uid: 'otro', email: 'otro@example.test' } };
assert(api.preflight(plan, actor).errors.includes('LAB_AUTH_MISMATCH'), 'auth distinto debe bloquearse');
status = { ...status, auth: { uid: 'uid-lab', email: 'lab@example.test' } };
const advisor = { ...actor, activeRole: 'Asesor' };
assert(api.preflight(plan, advisor).errors.includes('ACTIVE_ROLE_NOT_AUTHORIZED'), 'rol activo Asesor debe bloquear persistencia global');
console.log('OK orbit360-test-aseguradoras-lab-persistence-p09e');