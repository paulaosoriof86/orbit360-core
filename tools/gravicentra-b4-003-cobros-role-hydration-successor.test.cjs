'use strict';
// I6.5/B4-003: actual protected store + Queries + Cobros owners, synthetic only.
// No network, credentials, Firestore writes, security changes or fixed timeouts.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const storeSource = read('orbit360-platform/data/store-firestore-product-readonly-p0.js');
const querySource = read('orbit360-platform/core/queries.js');
const cobrosSource = read('orbit360-platform/modules/cobros.js');
const finance = ['clientes', 'polizas', 'cobros', 'recibosEsperados', 'carteraPrimas'];
const allCollections = ['aseguradoras', 'metas', ...finance];
const settle = async () => { for (let n = 0; n < 80; n += 1) await Promise.resolve(); };
const native = value => JSON.parse(JSON.stringify(value));

function storeHarness({ startup = 'aseguradoras', denied = [], hardErrors = [], reply } = {}) {
  const actor = { role: 'Dirección' }, calls = [], timers = [], events = {};
  let direct = 0;
  const window = { Orbit: { session: { rol: () => actor.role }, route: { key: 'cobros' } }, dispatchEvent() {} };
  const document = {
    addEventListener: (name, fn) => { (events[name] || (events[name] = [])).push(fn); },
    removeEventListener: (name, fn) => { events[name] = (events[name] || []).filter(f => f !== fn); }
  };
  vm.runInNewContext(storeSource, {
    window, document, Promise, Map, Set, Date, console, CustomEvent: function () {},
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout() {}
  }, { filename: 'store-firestore-product-readonly-p0.js' });
  const response = (request, id) => ({
    ok: true, serverScoped: true, collection: request.collection, country: request.country,
    rows: [{ id: id || request.collection + '-' + request.activeRole, canonicalDocumentId: id || request.collection + '-' + request.activeRole,
      tenantId: request.tenantId, pais: request.country, ownerUid: request.fixtureUid }], nextCursor: null
  });
  function createStore(tenantId = 'synthetic-tenant-A', uid = 'synthetic-uid-A') {
    const directCall = () => { direct += 1; throw new Error('DIRECT_FIRESTORE_FORBIDDEN'); };
    return window.Orbit.createFirestoreProductReadOnlyStoreP0({
      collection: directCall, onSnapshot: directCall, getDocsFromServer: directCall,
      protectedReadPage: async request => {
        const captured = { ...request, fixtureUid: uid };
        calls.push(captured);
        return reply ? reply(captured, response) : response(captured);
      }
    }, {
      tenantId, collections: allCollections, requiredCollections: [startup],
      membership: { uid, tenantId, activeRole: 'Dirección', roles: ['Dirección', 'Asesor'], countries: ['GT'] },
      protectedReadCandidate: true,
      paths: { validateTenantId: id => ({ ok: id === tenantId, tenantId: id }), dataCollectionPath: directCall },
      queryPlanner: collection => ({
        ok: !(actor.role === 'Asesor' && hardErrors.includes(collection)),
        constraints: [{ field: 'tenantId', op: '==', value: tenantId },
          ...(actor.role === 'Asesor' && denied.includes(collection) ? [{ field: '__deny__', op: '==', value: true }] : [])]
      })
    });
  }
  const store = createStore();
  const changeRole = role => { actor.role = role; (events['orbit:active-role-changed'] || []).slice().forEach(fn => fn()); };
  return { actor, store, createStore, changeRole, calls, timers, response, direct: () => direct };
}

function confirmed(store, collections = finance) {
  const status = store._productStatus();
  for (const collection of collections) assert.ok(status.serverConfirmedCollections.includes(collection), collection + '_MUST_HYDRATE_IN_NEW_SCOPE');
}

test('role switch drains allowed Cobros sources behind a now-denied historical startup', async () => {
  const h = storeHarness({ denied: ['aseguradoras'] });
  h.store._attachSnapshots(); h.store._ensureCollections(finance); await settle(); confirmed(h.store);
  h.changeRole('Asesor');
  assert.equal(h.store.all('cobros').length, 0, 'PRIOR_ROLE_BYTES_INVALIDATED_SYNCHRONOUSLY');
  h.store._ensureCollections(finance); await settle(); confirmed(h.store);
  const status = h.store._productStatus();
  assert.ok(status.deniedCollections.includes('aseguradoras'));
  assert.ok(!status.serverConfirmedCollections.includes('aseguradoras'));
  assert.equal(h.store.all('aseguradoras').length, 0);
  assert.equal(h.calls.filter(r => r.activeRole === 'Asesor' && r.collection === 'aseguradoras').length, 0, 'DENIED_SOURCE_IS_NEVER_FETCHED');
  assert.equal(h.store.all('cobros')[0].id, 'cobros-Asesor'); assert.equal(h.direct(), 0);
});

test('settled startup error remains an error, not a grant or completed source', async () => {
  const h = storeHarness({ hardErrors: ['aseguradoras'] });
  h.store._attachSnapshots(); await settle(); h.changeRole('Asesor');
  h.store._ensureCollections(finance); await settle(); confirmed(h.store);
  const status = h.store._productStatus();
  assert.match(status.snapshotErrors.aseguradoras, /PROTECTED_READ_PLAN_DENIED/);
  assert.ok(!status.deniedCollections.includes('aseguradoras'), 'PLAN_ERROR_NOT_RECLASSIFIED_AS_PERMISSION_DENIAL');
  assert.ok(!status.serverConfirmedCollections.includes('aseguradoras'));
  assert.equal(h.store.all('aseguradoras').length, 0); assert.equal(h.direct(), 0);
});

test('dependencies requested during synchronous role notification drain after startup denial', async () => {
  const h = storeHarness({ denied: ['aseguradoras'] });
  h.store._attachSnapshots(); await settle();
  h.store.subscribe(collection => {
    if (collection === '*') h.store._ensureCollections(finance);
  });
  h.changeRole('Asesor'); await settle(); confirmed(h.store);
  const status = h.store._productStatus();
  assert.ok(status.deniedCollections.includes('aseguradoras'));
  assert.ok(!status.serverConfirmedCollections.includes('aseguradoras'));
  assert.equal(h.direct(), 0);
});

for (const errorCode of ['functions/permission-denied', 'PROTECTED_READ_RESPONSE_INVALID']) {
  test('asynchronous startup failure releases independent queue without erasing ' + errorCode, async () => {
    const h = storeHarness({ reply: async (request, response) => {
      if (request.activeRole === 'Asesor' && request.collection === 'aseguradoras') throw Object.assign(new Error(errorCode), { code: errorCode });
      return response(request);
    } });
    h.store._attachSnapshots(); await settle(); h.changeRole('Asesor');
    h.store._ensureCollections(finance); await settle(); confirmed(h.store);
    const status = h.store._productStatus();
    assert.equal(status.snapshotErrors.aseguradoras, errorCode);
    assert.ok(!status.serverConfirmedCollections.includes('aseguradoras'));
    assert.ok(!status.deniedCollections.includes('aseguradoras'));
    assert.equal(h.store.all('aseguradoras').length, 0);
    assert.equal(h.timers.filter(timer => timer.ms === 1200).length, 0, 'TERMINAL_FAILURE_NOT_RETRIED');
    assert.equal(h.direct(), 0);
  });
}

test('queued denied collections release both bounded slots for allowed collections', async () => {
  const h = storeHarness({ startup: 'clientes', denied: ['metas', 'aseguradoras'] });
  h.store._attachSnapshots(); await settle(); h.changeRole('Asesor');
  h.store._ensureCollections(['metas', 'aseguradoras', ...finance]); await settle(); confirmed(h.store);
  for (const name of ['metas', 'aseguradoras']) {
    assert.ok(h.store._productStatus().deniedCollections.includes(name));
    assert.equal(h.calls.filter(r => r.activeRole === 'Asesor' && r.collection === name).length, 0);
  }
});

test('queued hard-error and denied plans do not leak slots or become confirmed', async () => {
  const h = storeHarness({ startup: 'clientes', denied: ['metas'], hardErrors: ['aseguradoras'] });
  h.store._attachSnapshots(); await settle(); h.changeRole('Asesor');
  h.store._ensureCollections(['metas', 'aseguradoras', ...finance]); await settle(); confirmed(h.store);
  const status = h.store._productStatus();
  assert.ok(status.deniedCollections.includes('metas'));
  assert.match(status.snapshotErrors.aseguradoras, /PROTECTED_READ_PLAN_DENIED/);
  assert.ok(!status.serverConfirmedCollections.includes('metas') && !status.serverConfirmedCollections.includes('aseguradoras'));
});

test('a still-pending allowed startup preserves the existing bounded priority', async () => {
  let finish;
  const h = storeHarness({ startup: 'clientes', reply: async (request, response) => {
    if (request.activeRole === 'Asesor' && request.collection === 'clientes') return new Promise(resolve => { finish = () => resolve(response(request)); });
    return response(request);
  } });
  h.store._attachSnapshots(); await settle(); h.changeRole('Asesor'); h.store._ensureCollections(finance); await settle();
  assert.equal(h.calls.filter(r => r.activeRole === 'Asesor' && r.collection === 'cobros').length, 0);
  assert.equal(h.store._productStatus().serverConfirmedCollections.length, 0);
  finish(); await settle(); confirmed(h.store);
});

test('late prior-role response cannot repopulate the new-role cache or poison readiness', async () => {
  let finish;
  const h = storeHarness({ startup: 'clientes', reply: async (request, response) => {
    if (request.activeRole === 'Dirección' && request.collection === 'clientes') return new Promise(resolve => { finish = () => resolve(response(request, 'old-role-secret')); });
    return response(request);
  } });
  h.store._attachSnapshots(); await settle(); h.changeRole('Asesor'); h.store._ensureCollections(finance); await settle(); confirmed(h.store);
  finish(); await settle();
  assert.deepEqual(Array.from(h.store.all('clientes'), row => row.id), ['clientes-Asesor']);
  assert.ok(!h.store._productStatus().snapshotErrors.clientes); assert.equal(h.direct(), 0);
});

test('detach and new tenant/UID store cannot receive old-identity in-flight bytes', async () => {
  let finish;
  const h = storeHarness({ startup: 'clientes', reply: async (request, response) => {
    if (request.fixtureUid === 'synthetic-uid-A') return new Promise(resolve => { finish = () => resolve(response(request, 'old-identity-secret')); });
    return response(request, 'new-identity-row');
  } });
  h.store._attachSnapshots(); await settle(); h.store._detachSnapshots();
  const next = h.createStore('synthetic-tenant-B', 'synthetic-uid-B'); next._attachSnapshots(); await settle();
  finish(); await settle();
  assert.equal(h.store.all('clientes').length, 0);
  assert.equal(next.all('clientes')[0].tenantId, 'synthetic-tenant-B');
  assert.equal(next.all('clientes')[0].ownerUid, 'synthetic-uid-B');
  assert.equal(next.all('clientes')[0].id, 'new-identity-row'); assert.equal(h.direct(), 0);
});

test('foreign tenant response after role reset remains quarantined and unconfirmed', async () => {
  const h = storeHarness({ startup: 'clientes', reply: async (request, response) => {
    const result = response(request);
    if (request.activeRole === 'Asesor' && request.collection === 'cobros') result.rows[0].tenantId = 'foreign-tenant';
    return result;
  } });
  h.store._attachSnapshots(); await settle(); h.changeRole('Asesor'); h.store._ensureCollections(finance); await settle();
  assert.equal(h.store.all('cobros').length, 0);
  assert.match(h.store._productStatus().snapshotErrors.cobros, /TENANT_MISMATCH/);
  assert.ok(!h.store._productStatus().serverConfirmedCollections.includes('cobros'));
  assert.equal(h.direct(), 0);
});

function cobrosHarness({ receiptCurrency = 'GTQ', policyCurrency = 'GTQ', country = 'GT' } = {}) {
  const data = {
    clientes: [{ id: 'c', pais: 'GT', moneda: 'GTQ', nombre: 'Cliente sintético', asesorId: 'a' }],
    polizas: [{ id: 'p', clienteId: 'c', pais: 'GT', moneda: policyCurrency, estado: 'Vigente', numero: 'QA-SYNTHETIC', asesorId: 'a' }],
    recibosEsperados: [{ id: 'r', polizaId: 'p', clienteId: 'c', pais: 'GT', moneda: receiptCurrency, primaTotal: 147, secuencia: '1/10', fechaLimite: '2026-01-01', estado: 'Pendiente', estadoOperativo: 'pendiente_vencido' }],
    carteraPrimas: [{ id: 'd', reciboId: 'r', polizaId: 'p', clienteId: 'c', pais: 'GT', moneda: receiptCurrency, fechaLimite: '2026-01-01', estado: 'Pendiente', estadoOperativo: 'pendiente_vencido', carteraActiva: true }],
    cobros: [], asesores: [], vehiculos: [], comisiones: []
  };
  const status = { serverConfirmedCollections: [...finance], deniedCollections: [], snapshotErrors: {} };
  const actor = { role: 'Dirección', uid: 'direction-uid', tenantId: 'tenant-A' }, calls = { writes: 0, queries: 0 };
  const forbidden = () => { calls.writes += 1; throw new Error('NO_WRITES'); };
  const store = { all: k => data[k] || [], get: (k, id) => (data[k] || []).find(row => row.id === id) || null,
    where: (k, p) => (data[k] || []).filter(p), find: (k, p) => (data[k] || []).find(p),
    _ensureCollections() {}, _productStatus: () => status, insert: forbidden, update: forbidden, remove: forbidden };
  const U = { finiteNumber: v => v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null,
    daysFromNow: () => -30, esc: v => String(v ?? ''), money: (v, c) => c + ' ' + v, moneyShort: (v, c) => c + ' ' + v,
    fmtDate: v => v || '—', text: (v, fallback) => v == null || v === '' ? fallback || '' : String(v), today: () => '2026-10-29' };
  const Orbit = { store, ui: U, modules: {}, pais: country, route: { key: 'cobros', params: {} },
    session: { rol: () => actor.role, asesorId: () => 'a' },
    auth: { get productUser() { return { uid: actor.uid, tenantId: actor.tenantId }; }, user() { return this.productUser; } },
    tenant: { get: () => ({ tenantId: actor.tenantId }) },
    kit: { bannerFor: () => '', kpis: cards => cards.map(c => c.label + ': ' + c.val).join(' | '), filterBar: () => '',
      asesorOptions: () => [], wireFilters() {}, clienteCell: id => id }
  };
  const context = vm.createContext({ window: { Orbit }, Orbit, console, Map, Set, Date,
    document: { getElementById: () => null }, location: { hostname: 'localhost' }, setTimeout() {}, clearTimeout() {} });
  vm.runInContext(querySource, context, { filename: 'queries.js' });
  const original = Orbit.q.carteraGlobalPorMoneda;
  Orbit.q.carteraGlobalPorMoneda = () => { calls.queries += 1; return original(); };
  vm.runInContext(cobrosSource, context, { filename: 'cobros.js' });
  const host = { innerHTML: '', querySelectorAll: () => [] };
  return { data, status, actor, calls, Orbit, host, render: reuse => Orbit.modules.cobros.render(host, reuse) };
}

test('Cobros shows a source-currency conflict without relabeling or mutating amounts', () => {
  const h = cobrosHarness({ receiptCurrency: 'COP' }), before = JSON.stringify(h.data);
  h.render();
  assert.match(h.host.innerHTML, /data-cobros-currency-source-conflict="1"/);
  assert.match(h.host.innerHTML, /data-row-country="GT"/);
  assert.match(h.host.innerHTML, /\$ 147/);
  assert.match(h.host.innerHTML, /COP/); assert.match(h.host.innerHTML, /GTQ/);
  assert.equal(JSON.stringify(h.data), before); assert.equal(h.calls.writes, 0);
});

test('a GT policy legitimately denominated in COP is not changed or hidden', () => {
  const h = cobrosHarness({ receiptCurrency: 'COP', policyCurrency: 'COP' }); h.render();
  assert.match(h.host.innerHTML, /data-row-country="GT"/);
  assert.match(h.host.innerHTML, /\$ 147/);
  assert.doesNotMatch(h.host.innerHTML, /data-cobros-currency-source-conflict=/);
  h.Orbit.pais = 'CO'; h.render(true);
  assert.doesNotMatch(h.host.innerHTML, /data-row-country="GT"/);
});

test('financial cache is reused only inside identical role UID tenant and country', () => {
  const h = cobrosHarness(); h.render(); assert.equal(h.calls.queries, 1);
  h.render(true); assert.equal(h.calls.queries, 1);
  h.actor.role = 'Asesor'; h.render(true); assert.equal(h.calls.queries, 2);
  h.actor.uid = 'advisor-uid'; h.render(true); assert.equal(h.calls.queries, 3);
  h.actor.tenantId = 'tenant-B'; h.render(true); assert.equal(h.calls.queries, 4);
  h.Orbit.pais = 'CO'; h.render(true); assert.equal(h.calls.queries, 5);
  assert.equal(h.calls.writes, 0);
});

test('Cobros stays pending on missing core, and becomes ready on confirmed source without reentry', () => {
  const h = cobrosHarness(); h.actor.role = 'Asesor'; h.status.serverConfirmedCollections = ['clientes'];
  h.render(); assert.match(h.host.innerHTML, /data-cobros-hydration-loading="1"/);
  assert.doesNotMatch(h.host.innerHTML, /data-cobros-confirmed-count=/);
  h.status.serverConfirmedCollections = [...finance]; h.render();
  assert.match(h.host.innerHTML, /data-cobros-financial-readiness="ready"/);
  assert.doesNotMatch(h.host.innerHTML, /data-cobros-hydration-loading=/);
  assert.equal(h.calls.writes, 0);
});

test('Cobros terminal read error stays explicit rather than a false zero', () => {
  const h = cobrosHarness(); h.status.serverConfirmedCollections = ['clientes', 'polizas'];
  h.status.snapshotErrors.cobros = 'functions/permission-denied'; h.render();
  assert.match(h.host.innerHTML, /No fue posible completar la carga/);
  assert.doesNotMatch(h.host.innerHTML, /data-cobros-confirmed-count=/);
  assert.deepEqual(native(h.status.snapshotErrors), { cobros: 'functions/permission-denied' });
});
