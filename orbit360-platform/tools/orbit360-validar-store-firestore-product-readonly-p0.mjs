import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const context = {
  window: { Orbit: {}, dispatchEvent() {} },
  CustomEvent: class CustomEvent { constructor(name, options) { this.name = name; this.detail = options?.detail; } },
  console,
};
vm.createContext(context);
for (const file of ['core/tenant-canonical-paths-contract-p0.js', 'data/store-firestore-product-readonly-p0.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const pathsSeen = [];
const constraintsSeen = [];
const sourceRows = {
  clientes: [
    { id: 'cli-1', tenantId: 'tenant-ejemplo', country: 'GT', advisorId: 'adv-1', nombre: 'Cliente 1' },
    { id: 'cli-cross', tenantId: 'otro-tenant', country: 'GT', advisorId: 'adv-1', nombre: 'Cross tenant' },
    { tenantId: 'tenant-ejemplo', country: 'GT', advisorId: 'adv-1', nombre: 'Sin id' },
  ],
  polizas: [{ id: 'pol-1', tenantId: 'tenant-ejemplo', country: 'GT', advisorId: 'adv-1' }],
};

function collectionNameFromPath(value) {
  return value.split('/')[3];
}
function makeRef(pathValue, constraints = []) {
  return {
    where(field, op, value) {
      constraintsSeen.push({ path: pathValue, field, op, value });
      return makeRef(pathValue, constraints.concat([{ field, op, value }]));
    },
    onSnapshot(next) {
      const name = collectionNameFromPath(pathValue);
      const docs = (sourceRows[name] || []).filter((row) => constraints.every((c) => {
        if (c.op === '==') return row[c.field] === c.value;
        if (c.op === 'in') return c.value.includes(row[c.field]);
        return true;
      })).map((row) => ({ id: row.id, data: () => ({ ...row }) }));
      next({ forEach(fn) { docs.forEach(fn); } });
      return () => {};
    }
  };
}
const db = { collection(pathValue) { pathsSeen.push(pathValue); return makeRef(pathValue); } };
const planner = (collection) => ({
  ok: true,
  constraints: [
    { field: 'tenantId', op: '==', value: 'tenant-ejemplo' },
    { field: 'advisorId', op: '==', value: 'adv-1' },
  ],
  collection,
});

const store = context.window.Orbit.createFirestoreProductReadOnlyStoreP0({ db }, {
  tenantId: 'tenant-ejemplo', collections: ['clientes', 'polizas'], paths: context.window.Orbit.tenantCanonicalPathsP0,
  queryPlanner: planner, initialPrefs: { country: 'GT' }
});
assert.equal(store.__productReadOnlyP0, true);
assert.equal(store._attachSnapshots(), true);
assert.deepEqual(pathsSeen, [
  'tenants/tenant-ejemplo/data/clientes/items',
  'tenants/tenant-ejemplo/data/polizas/items',
]);
assert.equal(store.all('clientes').length, 1);
assert.equal(store.get('clientes', 'cli-1').nombre, 'Cliente 1');
assert.equal(store.where('clientes', { advisorId: 'adv-1' }).length, 1);
assert.equal(store.find('polizas', (row) => row.id === 'pol-1').id, 'pol-1');
assert.equal(store.pref('country'), 'GT');
assert.equal(store._productStatus().mode, 'product');
assert.equal(store._productStatus().noFallback, true);
assert.equal(store._productStatus().writeEnabled, false);
assert.equal(store.raw().__backend.quarantinedRows.clientes.length, 1);
assert.equal(store.raw().__backend.quarantinedRows.clientes[0].reason, 'id_missing');
assert.ok(constraintsSeen.some((item) => item.field === 'tenantId' && item.value === 'tenant-ejemplo'));
assert.ok(constraintsSeen.some((item) => item.field === 'advisorId' && item.value === 'adv-1'));

for (const call of [
  () => store.insert('clientes', {}),
  () => store.update('clientes', 'cli-1', {}),
  () => store.remove('clientes', 'cli-1'),
  () => store.setPref('country', 'CO'),
  () => store.reseed({}),
]) {
  assert.throws(call, (error) => error.code === 'WRITE_BLOCKED_PRODUCT_READ_ONLY_P0');
}

const denied = context.window.Orbit.createFirestoreProductReadOnlyStoreP0({ db }, {
  tenantId: 'tenant-ejemplo', collections: ['clientes'], paths: context.window.Orbit.tenantCanonicalPathsP0,
  queryPlanner: () => ({ ok: false, constraints: [{ field: '__deny__', op: '==', value: true }] })
});
assert.equal(denied._attachSnapshots(), true);
assert.equal(denied.all('clientes').length, 0);
assert.ok(denied._productStatus().deniedCollections.includes('clientes'));

const noTenantConstraint = context.window.Orbit.createFirestoreProductReadOnlyStoreP0({ db }, {
  tenantId: 'tenant-ejemplo', collections: ['clientes'], paths: context.window.Orbit.tenantCanonicalPathsP0,
  queryPlanner: () => ({ ok: true, constraints: [{ field: 'advisorId', op: '==', value: 'adv-1' }] })
});
assert.equal(noTenantConstraint._attachSnapshots(), false);
assert.ok(noTenantConstraint._productStatus().snapshotErrors.clientes.includes('tenant_constraint_faltante'));

console.log(JSON.stringify({
  ok: true,
  tests: 25,
  version: context.window.Orbit.firestoreProductReadOnlyStoreP0.VERSION,
  rowsVisible: { clientes: store.all('clientes').length, polizas: store.all('polizas').length },
  guards: {
    canonicalPaths: 'PASS',
    scopedQueries: 'PASS',
    crossTenantExcluded: 'PASS',
    noFallback: 'PASS',
    allWritesBlocked: 'PASS',
    denyScopeSupported: 'PASS',
    missingTenantConstraintBlocked: 'PASS'
  }
}, null, 2));
