import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const mustContain = (text, needle, label) => assert.ok(text.includes(needle), `${label}: missing ${needle}`);
const mustNotContain = (text, needle, label) => assert.ok(!text.includes(needle), `${label}: forbidden ${needle}`);

const firebase = JSON.parse(read('firebase.json'));
assert.equal(firebase.hosting && firebase.hosting.public, 'orbit360-platform', 'HOSTING_PUBLIC_ROOT_MISMATCH');
const hostingIgnore = Array.isArray(firebase.hosting && firebase.hosting.ignore) ? firebase.hosting.ignore : [];
const forbiddenHostingSurfaces = [
  'ays-lab-preview.html',
  'product-readonly.html',
  'rollback-safe/**',
  'runtime-gate-crm-v20260716/**',
  'runtime-incident-importer-20260721/**',
  'tools/**',
  'data/seed.js',
  'data/store.js',
  'data/store-firestore-lab.local.js'
];
for (const surface of forbiddenHostingSurfaces) {
  assert.ok(hostingIgnore.includes(surface), `HOSTING_HISTORICAL_SURFACE_NOT_EXCLUDED:${surface}`);
}

const index = read('orbit360-platform/index.html');
mustContain(index, 'core/access-role-session-owner-v20260728.js', 'INDEX_CANONICAL_ROLE_OWNER');
mustContain(index, 'data/store-firestore-product-readonly-p0.js', 'INDEX_PRODUCT_READ_STORE');
mustContain(index, 'data/store-firestore-product-operational-p0.js', 'INDEX_PRODUCT_WRITE_FACADE');
mustContain(index, 'core/product-app-p0.js', 'INDEX_PRODUCT_APP');
mustContain(index, 'core/pwa.js', 'INDEX_PWA');
for (const forbidden of [
  'core/session-multirol-visibility-v20260716.js',
  'data/store.js',
  'data/seed.js',
  'data/store-firestore-lab.local.js',
  'ays-lab-preview.html',
  'product-readonly.html'
]) {
  mustNotContain(index, forbidden, 'INDEX_CLEAN_ENTRYPOINT');
}
assert.ok(index.lastIndexOf('core/pwa.js') > index.indexOf('core/product-app-p0.js'), 'PWA_MUST_LOAD_AFTER_PRODUCT_APP_OWNER');

const sw = read('orbit360-platform/sw.js');
mustContain(sw, '/core/access-role-session-owner-v20260728.js', 'SW_CANONICAL_ROLE_OWNER');
mustNotContain(sw, '/core/session-multirol-visibility-v20260716.js', 'SW_STALE_ROLE_OWNER');
mustContain(sw, 'orbit360-v20260905-recovery-i2-canonical-role-owner-1', 'SW_CACHE_ROTATION');

const pwa = read('orbit360-platform/core/pwa.js');
mustContain(pwa, 'window.OrbitPwaWorkerReady = registerServiceWorker();', 'PWA_ASYNC_REGISTRATION');
mustNotContain(pwa, 'await navigator.serviceWorker', 'PWA_BLOCKING_AWAIT');

const productApp = read('orbit360-platform/core/product-app-p0.js');
mustContain(productApp, 'serviceWorkerBlocking:false', 'PRODUCT_APP_SW_NONBLOCKING');
mustContain(productApp, 'snapshotTimeoutMs:20000', 'PRODUCT_APP_BOUNDED_AUTHORITATIVE_HYDRATION');
mustNotContain(productApp, 'OrbitPwaWorkerReady', 'PRODUCT_APP_MUST_NOT_WAIT_PWA');

const auth = read('orbit360-platform/core/auth-product-runtime-p0.js');
const backendBootstrap = read('orbit360-platform/core/backend-product-readonly-bootstrap-p0.js');
for (const [label, source] of [
  ['PRODUCT_APP', productApp],
  ['AUTH', auth],
  ['BACKEND_BOOTSTRAP', backendBootstrap],
  ['PWA', pwa]
]) {
  assert.ok(!/(^|\D)(30000|120000)(\D|$)/.test(source), `${label}_FORBIDDEN_30_120_SECOND_SUCCESS_TIMEOUT`);
}

const runtimeConfigSource = read('orbit360-platform/product-runtime-config.js');
const runtimeContext = { window: {} };
vm.runInNewContext(runtimeConfigSource, runtimeContext, { filename: 'product-runtime-config.js' });
const runtimeConfig = runtimeContext.window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__;
assert.ok(runtimeConfig, 'PRODUCT_RUNTIME_CONFIG_MISSING');
assert.equal(JSON.stringify(Array.from(runtimeConfig.requiredCollections || [])), JSON.stringify(['clientes','polizas','cobros','aseguradoras']), 'PRODUCT_REQUIRED_COLLECTIONS_DRIFT');
const optionalCollections = Array.from(runtimeConfig.optionalCollections || []);
for (const requiredOptional of ['vehiculos','recibosEsperados','carteraPrimas','negocios','gestiones']) {
  assert.ok(optionalCollections.includes(requiredOptional), `PRODUCT_OPTIONAL_COLLECTION_MISSING:${requiredOptional}`);
}
for (const nestedLedgerInternal of ['pagosReportados','evidenciasCobro','propuestasConciliacion','conciliacionHolds','cobrosLedgerRuns','cobrosLedgerControl']) {
  assert.ok(!optionalCollections.includes(nestedLedgerInternal), `PRODUCT_NESTED_LEDGER_INTERNAL_EXPOSED:${nestedLedgerInternal}`);
}

const readStore = read('orbit360-platform/data/store-firestore-product-readonly-p0.js');
mustContain(readStore, 'writeEnabled: false', 'READ_STORE_WRITE_DISABLED');
for (const blockedMethod of ['insert: fail', 'update: fail', 'remove: fail', 'setPref: fail', 'reseed: fail']) {
  mustContain(readStore, blockedMethod, 'READ_STORE_MUTATION_FAIL_CLOSED');
}

const writeFacade = read('orbit360-platform/data/store-firestore-product-operational-p0.js');
for (const contract of [
  "var GENERAL_COMMAND='orbit360ProductOperationalCommand'",
  "var WORKFLOW_COMMAND='orbit360OpsLeadsCommand'",
  "serverWriteTransport!=='firebase-functions'",
  'browserFirestoreWriteAuthorized:false',
  'noFallback:true',
  'activeRole:m.activeRole'
]) {
  mustContain(writeFacade, contract, 'PRODUCT_WRITE_SERVER_BOUNDARY');
}
mustNotContain(writeFacade, 'firebase.firestore()', 'PRODUCT_WRITE_WEB_SDK_DIRECT_WRITE');

const bootstrap = read('functions/bootstrap.js');
for (const owner of [
  "require('./product-ops-leads-domain')",
  "require('./cobros-reconciliation-domain')",
  "require('./product-operational-domain')",
  "require('./product-insurer-credentials')"
]) {
  mustContain(bootstrap, owner, 'FUNCTIONS_BOOTSTRAP_PRODUCT_OWNER');
}

console.log('I2_COMPOSITION_STARTUP_WRITE_BOUNDARY_PASS');
