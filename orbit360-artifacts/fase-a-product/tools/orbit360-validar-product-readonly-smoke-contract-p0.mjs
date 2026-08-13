import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const contractPath = new URL('../core/product-readonly-smoke-contract-p0.js', import.meta.url);
const code = fs.readFileSync(contractPath, 'utf8');
const context = { window: { Orbit: {} }, console, CustomEvent: class CustomEvent {} };
vm.createContext(context);
vm.runInContext(code, context, { filename: 'product-readonly-smoke-contract-p0.js' });
const smoke = context.window.Orbit.productReadOnlySmokeP0;

let tests = 0;
const test = (name, fn) => { fn(); tests += 1; console.log('PASS', name); };

const readiness = {
  ok: true,
  ready: true,
  writeAuthorized: false,
  version: 'p0-20260713',
  mode: 'product',
  tenantId: 'tenant-seguro',
  nextStep: 'habilitar_smoke_read_only',
  auth: { uid: 'uid-real-123', email: 'usuario@empresa.com', emailVerified: true },
  membership: {
    uid: 'uid-real-123', tenantId: 'tenant-seguro', roles: ['Asesor', 'Operativo'],
    activeRole: 'Asesor', status: 'active', countries: ['GT']
  }
};

const planOwn = {
  ok: true, scope: 'own', constraints: [
    { field: 'tenantId', op: '==', value: 'tenant-seguro' },
    { field: 'advisorId', op: '==', value: 'asesor-1' }
  ]
};
const planNone = { ok: false, denied: true, scope: 'none', constraints: [{ field: '__deny__', op: '==', value: true }] };
const storeStatus = {
  mode: 'product', tenantId: 'tenant-seguro', source: 'data/store-firestore-product-readonly-p0.js',
  version: 'p0-20260713', noFallback: true, writeEnabled: false, ready: true,
  status: 'ready-read-only', attachedCollections: ['clientes'], deniedCollections: ['finmovs'],
  snapshotErrors: {}, quarantinedRows: { clientes: [], finmovs: [] },
  queryPlans: { clientes: planOwn, finmovs: planNone }, lastSnapshotAt: '2026-07-13T20:00:00.000Z'
};
const base = {
  readiness,
  storeStatus,
  requiredCollections: ['clientes', 'finmovs'],
  expectedTenantId: 'tenant-seguro',
  storeMarker: { __productReadOnlyP0: true, writeErrorCode: 'WRITE_BLOCKED_PRODUCT_READ_ONLY_P0' },
  writeProbeExecuted: false,
  source: { branch: 'ays/backend-tenant-lab-v99-20260703', commit: 'abc123', candidateVersion: 'v1.233', generatedAt: '2026-07-13' }
};

test('contract exists', () => assert.equal(typeof smoke.buildManifest, 'function'));
test('valid readiness passes', () => assert.equal(smoke.validateReadiness(readiness).ok, true));
test('non-product blocked', () => assert.equal(smoke.validateReadiness({ ...readiness, mode: 'demo' }).ok, false));
test('write authorization blocked', () => assert.equal(smoke.validateReadiness({ ...readiness, writeAuthorized: true }).ok, false));
test('demo marker blocked', () => assert.equal(smoke.validateReadiness({ ...readiness, note: 'firestore-lab' }).ok, false));
test('identity sanitized', () => assert.match(smoke.validateIdentity(readiness).details.userRef, /^usr_/));
test('identity email not exposed', () => assert.equal('email' in smoke.validateIdentity(readiness).details, false));
test('active membership required', () => assert.equal(smoke.validateIdentity({ ...readiness, membership: { ...readiness.membership, status: 'suspended' } }).ok, false));
test('store read-only passes', () => assert.equal(smoke.validateStoreStatus(storeStatus, 'tenant-seguro').ok, true));
test('store tenant mismatch blocked', () => assert.equal(smoke.validateStoreStatus(storeStatus, 'otro-tenant').ok, false));
test('store fallback blocked', () => assert.equal(smoke.validateStoreStatus({ ...storeStatus, noFallback: false }, 'tenant-seguro').ok, false));
test('store write enabled blocked', () => assert.equal(smoke.validateStoreStatus({ ...storeStatus, writeEnabled: true }, 'tenant-seguro').ok, false));
test('store not ready blocked', () => assert.equal(smoke.validateStoreStatus({ ...storeStatus, ready: false }, 'tenant-seguro').ok, false));
test('attached and denied collections pass', () => assert.equal(smoke.validateCollections(base, 'tenant-seguro').ok, true));
test('missing tenant constraint blocked', () => {
  const broken = structuredClone(base);
  broken.storeStatus.queryPlans.clientes.constraints = [{ field: 'advisorId', op: '==', value: 'asesor-1' }];
  assert.equal(smoke.validateCollections(broken, 'tenant-seguro').ok, false);
});
test('missing attachment blocked', () => {
  const broken = structuredClone(base);
  broken.storeStatus.attachedCollections = [];
  assert.equal(smoke.validateCollections(broken, 'tenant-seguro').ok, false);
});
test('snapshot error blocked', () => {
  const broken = structuredClone(base);
  broken.storeStatus.snapshotErrors = { clientes: 'permission-denied' };
  assert.equal(smoke.validateCollections(broken, 'tenant-seguro').ok, false);
});
test('cross tenant quarantine blocked', () => {
  const broken = structuredClone(base);
  broken.storeStatus.quarantinedRows = { clientes: [{ id: 'x', reason: 'tenant_mismatch' }] };
  assert.equal(smoke.validateIsolation(broken, 'tenant-seguro').ok, false);
});
test('missing id quarantine is reported but not cross-tenant fail', () => {
  const changed = structuredClone(base);
  changed.storeStatus.quarantinedRows = { clientes: [{ id: '', reason: 'id_missing' }] };
  const result = smoke.validateIsolation(changed, 'tenant-seguro');
  assert.equal(result.ok, true);
  assert.equal(result.details.missingIdQuarantineCount, 1);
});
test('write lock passes', () => assert.equal(smoke.validateWriteLock(base).ok, true));
test('write probe forbidden', () => assert.equal(smoke.validateWriteLock({ ...base, writeProbeExecuted: true }).ok, false));
test('read-only marker required', () => assert.equal(smoke.validateWriteLock({ ...base, storeMarker: {} }).ok, false));
test('valid manifest passes', () => {
  const manifest = smoke.buildManifest(base);
  assert.equal(manifest.ok, true);
  assert.equal(manifest.status, 'PASS');
  assert.equal(manifest.writeAuthorized, false);
  assert.equal(manifest.deployAuthorized, false);
});
test('manifest contains no raw uid', () => assert.equal(JSON.stringify(smoke.buildManifest(base)).includes('uid-real-123'), false));
test('manifest blocks demo source', () => {
  const broken = structuredClone(base);
  broken.source.note = 'backend-lab';
  assert.equal(smoke.buildManifest(broken).ok, false);
});
test('manifest blocks secrets', () => {
  const broken = structuredClone(base);
  broken.source.apiKey = 'secret-value';
  assert.equal(smoke.buildManifest(broken).ok, false);
});
test('manifest hard guards remain enabled', () => {
  const manifest = smoke.buildManifest(base);
  Object.values(manifest.hardGuards).forEach(value => assert.equal(value, true));
});
test('manifest next step does not enable writes', () => assert.match(smoke.buildManifest(base).nextStep, /revision_humana/));

console.log(JSON.stringify({ ok: true, tests, contractVersion: smoke.VERSION }, null, 2));
