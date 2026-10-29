'use strict';
// Regressions that survive a server-side write readback but disappear after reload:
// the optional collection must exist in the configured store universe AND in
// the protected client query policy. Synthetic, source-only; no Firebase calls.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const window = { Orbit: {} };
const context = vm.createContext({ window, Object, Array, Set, Map });

for (const file of [
  'orbit360-platform/product-runtime-config.js',
  'orbit360-platform/core/tenant-access-policy-contract-p0.js',
  'orbit360-platform/core/tenant-access-policy-effective-p0.js',
  'orbit360-platform/core/tenant-access-policy-product-p0.js',
  'orbit360-platform/core/product-query-planner-contract-p0.js'
]) vm.runInContext(read(file), context, { filename: file });

const cfg = window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__;
const membership = {
  uid: 'synthetic_uat', tenantId: 'alianzas-soluciones',
  status: 'active', roles: ['Operativo'], activeRole: 'Operativo',
  countries: ['CO'], advisorId: 'adv_co',
  dataScopes: { default: 'all' },
  modulesVisible: ['cronograma', 'ops', 'conciliaciones', 'finanzas']
};
const planner = window.Orbit.productQueryPlannerP0;
const clientPolicy = window.Orbit.tenantAccessPolicyProductP0;

test('Cronograma and Conciliaciones have every route-required durable collection in the configured universe', () => {
  const optional = Array.from(cfg.optionalCollections);
  for (const collection of ['tareas', 'finmovs']) {
    assert.ok(optional.includes(collection), `${collection}: absent from product config; _ensureCollections cannot hydrate it after reload`);
  }
  const router = read('orbit360-platform/core/router.js');
  assert.match(router, /cronograma:\s*\[[^\]]*'tareas'/);
  assert.match(router, /conciliaciones:\s*\[[^\]]*'finmovs'/);
});

test('every previously exposed reactive route can hydrate its declared collections after reload', () => {
  const source = read('orbit360-platform/core/router.js');
  const match = source.match(/const REACTIVE_COLLECTIONS = (\{[\s\S]*?\});/);
  assert.ok(match, 'router dependencies must remain observable by the release contract');
  const byRoute = vm.runInNewContext(`(${match[1]})`, {}, { timeout: 1000 });
  const configured = new Set([...Array.from(cfg.requiredCollections), ...Array.from(cfg.optionalCollections)]);
  assert.ok(Object.keys(byRoute).length >= 15, 'a previously working route was silently removed');
  for (const [route, dependencies] of Object.entries(byRoute)) {
    for (const collection of dependencies) {
      assert.ok(configured.has(collection), `${route}: required ${collection} but hydration silently ignores it`);
    }
  }
});

test('the approved 31-route navigation and 15 frozen core lineages remain intact', () => {
  const navigation = read('orbit360-platform/core/config.js')
    .split('Orbit.NAV = [')[1].split('];')[0];
  const observed = [...navigation.matchAll(/route:\s*'([^']+)'/g)].map(match => match[1]);
  const approved = [
    'inicio', 'cronograma', 'ops', 'leads', 'aseguradoras', 'cotizador', 'comparativo',
    'cliente360', 'polizas', 'cobros', 'conciliaciones', 'renovaciones',
    'cancelaciones', 'siniestros', 'historial', 'comisiones', 'importar',
    'calidad', 'plantillas', 'reportes', 'ia', 'academia', 'insights', 'correo',
    'automatizaciones', 'notificaciones', 'marketing', 'portal', 'finanzas',
    'equipo', 'configuracion'
  ];
  assert.deepEqual(observed, approved, 'all previously exposed navigation destinations must be reconciled, not removed');
  const lock = JSON.parse(read('artifacts/orbit360-recovery/release-control/CAPABILITY_LINEAGE_LOCK.json'));
  assert.equal(lock.status, 'FROZEN');
  assert.equal(lock.capabilityCount, 15);
  assert.equal(lock.capabilities.length, 15);
});

test('each of the 31 approved menu routes still has a physically reachable module implementation', () => {
  const navigation = read('orbit360-platform/core/config.js')
    .split('Orbit.NAV = [')[1].split('];')[0];
  const routes = [...navigation.matchAll(/route:\s*'([^']+)'/g)].map(match => match[1]);
  const files = fs.readdirSync(path.join(root, 'orbit360-platform/modules'))
    .filter(name => name.endsWith('.js'))
    .map(name => ({ relative: `modules/${name}`, source: read(`orbit360-platform/modules/${name}`) }));
  const index = read('orbit360-platform/index.html');
  for (const route of routes) {
    const registration = new RegExp(`Orbit\\.modules(?:\\.${route}\\b|\\[['\"]${route}['\"]\\])`);
    const registered = files.filter(file => registration.test(file.source));
    assert.ok(registered.length, `${route}: sidebar entry without a module implementation`);
    assert.ok(registered.some(file => index.includes(file.relative)), `${route}: implementation no longer reachable from product HTML`);
  }
});

test('the isolated Preview builder preserves the exact source hydration contract', () => {
  const builder = read('tools/gravicentra-i6-1-preview-package.mjs');
  assert.match(builder, /const canonicalOptional=collect\('optionalCollections'\)/);
  assert.match(builder, /const runtimeOptional=canonicalOptional\.filter/);
  assert.match(builder, /optionalCollections:runtimeOptional/);
  for (const collection of ['tareas', 'finmovs']) {
    assert.ok(!/separateSecureService=new Set\([^\n]*'tareas'/.test(builder), 'tasks cannot be excluded from the protected product reader');
    assert.ok(!/separateSecureService=new Set\([^\n]*'finmovs'/.test(builder), 'financial movements cannot be excluded from the protected reader');
    assert.ok(Array.from(cfg.optionalCollections).includes(collection));
  }
});

test('protected frontend query plans agree with backend module owners, without widening scopes', () => {
  for (const [collection, moduleKey] of [['tareas', 'ops'], ['finmovs', 'conciliaciones']]) {
    const plan = planner.compile(collection, membership, { accessPolicy: clientPolicy });
    assert.equal(plan.ok, true, `${collection}: ${JSON.stringify(Array.from(plan.errors || []))}`);
    assert.equal(plan.module, moduleKey, `${collection}: frontend/backend module owner drift`);
    assert.ok(plan.constraints.some(c => c.field === 'tenantId' && c.value === membership.tenantId));
    assert.ok(plan.constraints.some(c => c.field === 'pais' && c.value === 'CO'));
  }
  const server = read('functions/b4-003-scoped-access-boundary.js');
  const writer = read('functions/product-operational-domain.js');
  assert.match(server, /finmovs:'conciliaciones',tareas:'ops'/);
  assert.match(writer, /tareas:\s*'ops'/);
});

test('the protected reader, write adapter, and route agree on canonical collection names', () => {
  const browser = read('orbit360-platform/core/product-runtime-browser-providers-p0.js');
  const reader = read('functions/b4-003-scoped-related-reader.js');
  const store = read('orbit360-platform/data/store-firestore-product-operational-p0.js');
  for (const collection of ['tareas', 'finmovs']) {
    assert.ok(browser.includes(`'${collection}'`));
    assert.ok(reader.includes(`'${collection}'`));
    assert.ok(store.includes(`${collection}:'${collection === 'tareas' ? 'ops' : 'conciliaciones'}'`));
  }
  assert.match(reader, /const scopedOperationalCollections=new Set\(\[[^\]]*'tareas'/);
});

test('cross-module read/write ownership drift is explicitly inventoried rather than silently granting access', () => {
  function parseMap(source, marker) {
    const expression = source.match(marker);
    assert.ok(expression, 'a protected collection owner map disappeared');
    return vm.runInNewContext(`(${expression[1]})`, {}, { timeout: 1000 });
  }
  const reader = parseMap(
    read('functions/b4-003-scoped-access-boundary.js'),
    /const modules=(\{[^;]+\});/
  );
  const writer = parseMap(
    read('functions/product-operational-domain.js'),
    /const COLLECTION_MODULE = Object\.freeze\((\{[\s\S]*?\})\);/
  );
  const client = window.Orbit.tenantAccessPolicyP0.COLLECTION_POLICY;
  const discrepancies = [];
  const common = Object.keys(reader).filter(collection => Object.hasOwn(writer, collection));
  assert.ok(common.length >= 15, 'read/write cross-module reconciliation coverage reduced');
  for (const collection of common) {
    if (reader[collection] !== writer[collection]) {
      discrepancies.push(`${collection}:reader=${reader[collection]},writer=${writer[collection]}`);
    }
    if (client[collection] && client[collection].module !== reader[collection]) {
      discrepancies.push(`${collection}:client=${client[collection].module},reader=${reader[collection]}`);
    }
  }
  // These source-level drifts require owner adjudication under the existing
  // gates. This regression freezes visibility of the exceptions; it is NOT
  // approval to widen reader/writer permissions or redefine module ownership.
  assert.deepEqual(discrepancies.sort(), [
    'actividades:reader=historial,writer=cliente360',
    'metas:reader=inicio,writer=equipo',
    'reclamos:client=siniestros,reader=cliente360',
    'reclamos:reader=cliente360,writer=siniestros'
  ]);
});
