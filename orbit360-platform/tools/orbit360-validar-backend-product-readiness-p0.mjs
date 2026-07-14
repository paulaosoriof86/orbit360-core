import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const files = [
  'core/tenant-canonical-paths-contract-p0.js',
  'core/backend-product-readiness-contract-p0.js',
].map((file) => path.join(root, file));
const context = { window: { Orbit: {} }, console };
vm.createContext(context);
for (const file of files) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });

const contract = context.window.Orbit.backendProductReadinessP0;
assert.ok(contract, 'contract_loaded');

const methods = ['all', 'get', 'where', 'insert', 'update', 'remove', '_emit', 'on', 'pref', 'setPref', 'init', 'raw'];
const productStore = Object.fromEntries(methods.map((method) => [method, () => method === 'raw' ? {} : null]));
const base = {
  mode: 'product',
  tenantId: 'tenant-ejemplo',
  firebaseConfigInfo: {
    projectId: 'present', authDomain: 'present', appId: 'present', hasApiKey: true,
    environmentRef: 'runtime:firebase-product'
  },
  authUser: { uid: 'uid-001', email: 'usuario@empresa.test', emailVerified: true, disabled: false },
  membership: {
    uid: 'uid-001', tenantId: 'tenant-ejemplo', roles: ['Operativo', 'Asesor'], activeRole: 'Operativo',
    status: 'active', countries: ['GT'], dataScopes: { default: 'all', modules: {} }
  },
  store: productStore,
  storeMetadata: { mode: 'product', tenantId: 'tenant-ejemplo', source: 'data/store-product.js', noFallback: true, apiVersion: 'v1' },
  pathContractVersion: 'p0-20260713',
  accessPolicyVersion: 'p0-20260713'
};

const ready = contract.readiness(base);
assert.equal(ready.ok, true);
assert.equal(ready.ready, true);
assert.equal(ready.status, 'ready');
assert.equal(ready.writeAuthorized, false);
assert.equal(JSON.stringify(ready).includes('runtime:firebase-product'), false);
const plan = contract.bootstrapPlan(base);
assert.equal(plan.readyForBootstrap, true);
assert.equal(plan.bootstrapExecuted, false);
assert.equal(plan.hardGuards.writeDisabledUntilSmoke, true);

assert.equal(contract.readiness({ ...base, mode: 'firestore-lab' }).ok, false);
assert.equal(contract.readiness({ ...base, authUser: { ...base.authUser, email: 'orbit.lab@demo.com' } }).ok, false);
assert.equal(contract.readiness({ ...base, authUser: { ...base.authUser, emailVerified: false } }).ok, false);
assert.equal(contract.readiness({ ...base, membership: { ...base.membership, status: 'suspended' } }).ok, false);
assert.equal(contract.readiness({ ...base, membership: { ...base.membership, activeRole: 'Dirección' } }).ok, false);
assert.equal(contract.readiness({ ...base, membership: { ...base.membership, tenantId: 'otro-tenant' } }).ok, false);
assert.equal(contract.readiness({ ...base, storeMetadata: { ...base.storeMetadata, noFallback: false } }).ok, false);
assert.equal(contract.readiness({ ...base, storeMetadata: { ...base.storeMetadata, source: 'data/store-firestore-lab.local.js' } }).ok, false);
assert.equal(contract.readiness({ ...base, store: { ...productStore, remove: undefined } }).ok, false);
assert.equal(contract.readiness({ ...base, firebaseConfigInfo: { ...base.firebaseConfigInfo, apiKey: 'secret-value' } }).ok, false);
assert.equal(contract.readiness({ ...base, pathContractVersion: '' }).ok, false);
assert.equal(contract.readiness({ ...base, accessPolicyVersion: '' }).ok, false);
assert.equal(typeof contract.start, 'undefined');
assert.equal(typeof contract.write, 'undefined');
assert.equal(typeof contract.initializeFirebase, 'undefined');

console.log(JSON.stringify({
  ok: true,
  tests: 21,
  version: contract.VERSION,
  readiness: ready.status,
  guards: {
    productModeOnly: 'PASS',
    noDemoIdentity: 'PASS',
    activeMembership: 'PASS',
    tenantMatch: 'PASS',
    exactStoreApi: 'PASS',
    noFallback: 'PASS',
    secretSanitization: 'PASS',
    writeDisabledUntilSmoke: 'PASS'
  }
}, null, 2));
