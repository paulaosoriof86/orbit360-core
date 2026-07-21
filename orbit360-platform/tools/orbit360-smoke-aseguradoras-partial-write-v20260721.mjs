import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const source = fs.readFileSync(path.join(root, 'core/backend-lab-aseguradoras-partial-write-v20260721.js'), 'utf8');

const rows = {
  aseguradoras: [{
    id: 'asg_1',
    tenantId: 'alianzas-soluciones',
    nombre: 'Aseguradora prueba',
    contactos: [{ id: 'c1', principal: true }],
    portales: [{ id: 'p1', credentialRef: 'backend_required' }],
    cuentas: [{ id: 'a1', accountRef: 'acct_0123456789abcdef0123456789abcdef' }]
  }],
  actividades: []
};

let remotePayload = null;
let remoteOptions = null;
let emitted = [];
let otherCollectionDelegated = false;

const store = {
  all(collection) { return rows[collection] || []; },
  get(collection, id) { return (rows[collection] || []).find((row) => row.id === id) || null; },
  raw() { return rows; },
  _emit(collection) { emitted.push(collection); },
  update(collection, id, patch) {
    otherCollectionDelegated = collection !== 'aseguradoras';
    const row = this.get(collection, id) || { id };
    Object.assign(row, patch || {});
    return row;
  }
};

const firestore = {
  collection(name) {
    assert.equal(name, 'tenantId');
    return {
      doc(tenantId) {
        assert.equal(tenantId, 'alianzas-soluciones');
        return {
          collection(collection) {
            assert.equal(collection, 'aseguradoras');
            return {
              doc(id) {
                assert.equal(id, 'asg_1');
                return {
                  set(payload, options) {
                    remotePayload = JSON.parse(JSON.stringify(payload));
                    remoteOptions = options;
                    return Promise.resolve();
                  }
                };
              }
            };
          }
        };
      }
    };
  }
};

const Orbit = { store };
const events = [];
const windowObject = {
  Orbit,
  OrbitBackend: { mode: 'firestore-lab', tenantId: 'alianzas-soluciones' },
  location: { search: '?orbitBackend=firestore-lab&tenant=alianzas-soluciones' },
  firebase: { firestore: () => firestore },
  dispatchEvent(event) { events.push(event); }
};

const sandbox = {
  window: windowObject,
  Orbit,
  OrbitBackend: windowObject.OrbitBackend,
  firebase: windowObject.firebase,
  URLSearchParams,
  CustomEvent: class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init && init.detail; }
  },
  Date,
  JSON,
  Promise,
  console,
  setTimeout,
  clearTimeout
};

vm.runInNewContext(source, sandbox, { filename: 'backend-lab-aseguradoras-partial-write-v20260721.js' });

assert.ok(Orbit.store.__aseguradorasPartialWriteV20260721, 'Debe instalar el contrato parcial');
assert.equal(Orbit.store.__aseguradorasPartialWriteV20260721.remoteWritesPatchOnly, true);

const nextPortals = [{ id: 'p1', credentialRef: 'cred_0123456789abcdef0123456789abcdef' }];
const returned = Orbit.store.update('aseguradoras', 'asg_1', {
  portales: nextPortals,
  sensitiveImportStatus: { status: 'stored_securely' }
});

await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(returned._syncOp, 'update-partial');
assert.deepEqual(rows.aseguradoras[0].portales, nextPortals, 'La caché debe reflejar el patch');
assert.equal(rows.aseguradoras[0].cuentas[0].accountRef, 'acct_0123456789abcdef0123456789abcdef', 'La caché debe preservar cuentas');
assert.equal(rows.aseguradoras[0].contactos[0].id, 'c1', 'La caché debe preservar contactos');
assert.ok(remotePayload, 'Debe existir payload remoto');
assert.deepEqual(remotePayload.portales, nextPortals);
assert.equal(remotePayload.sensitiveImportStatus.status, 'stored_securely');
assert.equal(remotePayload.id, 'asg_1');
assert.equal(remotePayload.tenantId, 'alianzas-soluciones');
assert.ok(remotePayload.updatedAt);
assert.equal(Object.prototype.hasOwnProperty.call(remotePayload, 'cuentas'), false, 'El payload remoto no debe reescribir cuentas');
assert.equal(Object.prototype.hasOwnProperty.call(remotePayload, 'contactos'), false, 'El payload remoto no debe reescribir contactos');
assert.deepEqual(remoteOptions, { merge: true });
assert.ok(emitted.includes('aseguradoras'));
assert.ok(events.some((event) => event.type === 'orbit:backend:write-ok'));

Orbit.store.update('actividades', 'act_1', { titulo: 'Prueba' });
assert.equal(otherCollectionDelegated, true, 'Otras colecciones deben conservar el owner original');

console.log('ORBIT360 ASEGURADORAS PARTIAL WRITE: OK');
console.log('- caché fusionada');
console.log('- payload remoto limitado al patch');
console.log('- cuentas y contactos preservados');
console.log('- otras colecciones delegadas al store original');
