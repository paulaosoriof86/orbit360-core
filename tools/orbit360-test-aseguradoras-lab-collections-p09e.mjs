import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) { if (!condition) throw new Error(message); }
const orbit = {};
const rowsByCollection = {};
const listeners = {};
const originalStore = {
  __firestoreLabExplicit: true,
  all(collection) { return rowsByCollection[collection] || []; },
  get(collection, id) { return (this.all(collection) || []).find(row => row.id === id) || null; },
  where(collection, field, value) { return this.all(collection).filter(row => row[field] === value); },
  find(collection, predicate) { return this.all(collection).find(predicate) || null; },
  raw() { return { legacy: true }; },
  insert() { return { ok: true }; }, update() { return { ok: true }; }, remove() { return true; },
  _emit() {}
};
const fakeDb = {
  collection() {
    return {
      doc() {
        return {
          collection(name) {
            return {
              onSnapshot(next) {
                listeners[name] = next;
                next({ forEach(callback) { callback({ id: `${name}-1`, data: () => ({ tenantId: 'alianzas-soluciones', kind: name }) }); } });
                return () => { delete listeners[name]; };
              }
            };
          }
        };
      }
    };
  },
  doc() {}
};
const backend = { mode: 'firestore-lab', tenantId: 'alianzas-soluciones' };
const context = {
  window: {
    Orbit: orbit,
    OrbitBackend: backend,
    ORBIT_BACKEND: backend,
    firebase: { firestore: () => fakeDb },
    dispatchEvent() {}
  },
  Orbit: orbit,
  console, Date, Math, Set, Array, String, Object, JSON, Number, Promise,
  CustomEvent: function CustomEvent(name, init) { this.type = name; this.detail = init && init.detail; },
  setTimeout(fn) { fn(); return 1; }
};
context.window.window = context.window;
orbit.store = originalStore;
vm.createContext(context);
vm.runInContext(fs.readFileSync('orbit360-platform/core/aseguradoras-lab-collections-p09e.js', 'utf8'), context);
const api = orbit.aseguradorasLabCollectionsP09e;
const status = api.status();
assert(status.installed, 'adapter LAB debe instalarse');
assert(status.snapshotAttachedCount === 6, 'debe adjuntar seis colecciones profundas');
assert(orbit.store.all('aseguradora_manifiestos').length === 1, 'snapshot debe alimentar lectura');
assert(orbit.store.get('aseguradora_bindings', 'aseguradora_bindings-1').kind === 'aseguradora_bindings', 'get debe leer cache profunda');
assert(orbit.store.all('clientes') === rowsByCollection.clientes || Array.isArray(orbit.store.all('clientes')), 'colecciones legacy siguen delegadas');
assert(orbit.store.insert === originalStore.insert, 'adapter no debe reemplazar escrituras');
assert(orbit.store.raw().__aseguradorasKnowledgeLab.snapshotAttached, 'raw debe exponer estado sanitizado');
api.detach();
assert(!api.status().installed, 'detach debe cerrar snapshots');
console.log('OK orbit360-test-aseguradoras-lab-collections-p09e');