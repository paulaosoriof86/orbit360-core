'use strict';
// Real store, hydration adapter and bootstrap waiter with a deterministic clock.
// No Firebase connection, credentials, customer data or business writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, 'orbit360-platform', p), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function harness(provider, { optional = [], required = ['clientes'] } = {}) {
  let now = 0, sequence = 0, selectedRole = 'Operativo';
  const timers = new Map(), events = new Map(), calls = [], snapshots = [];
  const timeout = (fn, delay) => { const id = ++sequence; timers.set(id, { at: now + Number(delay || 0), fn }); return id; };
  const clear = id => timers.delete(id);
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const flush = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };
  const advance = async milliseconds => {
    const end = now + milliseconds;
    await flush();
    for (;;) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      timers.delete(next[0]); now = next[1].at; next[1].fn(); await flush();
    }
    now = end; await flush();
  };
  const tenant = 'qa-startup-retry';
  const membership = { uid: 'qa-operator', tenantId: tenant, activeRole: 'Operativo', roles: ['Operativo', 'Dirección'], countries: ['GT'] };
  const Orbit = {
    session: { rol: () => selectedRole },
    tenantCanonicalPathsP0: { validateTenantId: id => ({ ok: id === tenant, tenantId: id }) },
    tenantAccessPolicyProductP0: {
      queryConstraints: collection => ({ ok: collection !== 'asesores', scope: collection === 'asesores' ? 'none' : 'all', module: collection }),
      moduleVisible: () => true
    }
  };
  const window = { Orbit, location: { hash: '#inicio' }, dispatchEvent() {},
    __ORBIT360_PRODUCT_PUBLIC_CONFIG__: { requiredCollections: required, optionalCollections: optional } };
  const document = { addEventListener: (key, fn) => events.set(key, fn), removeEventListener: key => events.delete(key) };
  const context = vm.createContext({ window, document, console, Map, Set, Promise, structuredClone,
    Date: ClockDate, setTimeout: timeout, clearTimeout: clear, CustomEvent: function (type, options) { this.type = type; this.detail = options?.detail; } });
  for (const file of ['data/store-firestore-product-readonly-p0.js', 'core/product-hydration-required-optional-p0.js', 'core/backend-product-readonly-bootstrap-p0.js'])
    vm.runInContext(read(file), context, { filename: file });
  const reply = request => ({ ok: true, serverScoped: true, collection: request.collection, country: request.country,
    rows: [{ id: 'qa-' + request.collection, tenantId: tenant, pais: 'GT', nombre: 'Synthetic row' }], nextCursor: null });
  const store = Orbit.createFirestoreProductReadOnlyStoreP0({ protectedReadPage: request => {
    calls.push({ ...request, time: now });
    return provider(request, calls.filter(x => x.collection === request.collection).length, reply);
  } }, { tenantId: tenant, membership, protectedReadCandidate: true,
    queryPlanner: () => ({ ok: true, constraints: [{ field: 'tenantId', op: '==', value: tenant }] }) });
  store.on('*', () => snapshots.push(plain(store._productStatus())));
  function wait(timeoutMs = 20000) {
    const outcome = { settled: false, ok: false, error: '' };
    const promise = Orbit.backendProductReadOnlyBootstrapP0.waitForStoreReady(store, timeoutMs)
      .then(status => { outcome.settled = true; outcome.ok = true; outcome.status = plain(status); }, error => {
        outcome.settled = true; outcome.error = error.message;
        // Same teardown that the actual bootstrap.start catch performs.
        store._detachSnapshots();
      });
    return { outcome, promise };
  }
  return { store, calls, snapshots, reply, flush, advance, wait, timers,
    roleChange(role) { selectedRole = role; events.get('orbit:active-role-changed')?.(); } };
}
const transient = code => Object.assign(new Error('synthetic transport unavailable'), { code });

for (const code of ['functions/unavailable', 'functions/deadline-exceeded', 'functions/resource-exhausted']) {
  test('bootstrap keeps its single scheduled recovery alive: ' + code, async () => {
    const h = harness((request, attempt, reply) => attempt === 1 ? Promise.reject(transient(code)) : Promise.resolve(reply(request)));
    assert.equal(h.store._attachSnapshots(), true);
    const w = h.wait();
    await h.advance(100);
    assert.equal(w.outcome.settled, false, 'the 100ms inspection must not detach a valid 1200ms recovery');
    assert.equal(h.store._productStatus().ready, false);
    assert.equal(h.store.all('clientes').length, 0, 'no fallback rows before an authoritative response');
    assert.deepEqual(plain(h.store._productStatus().requiredRecovering), ['clientes']);
    await h.advance(1100); await w.promise;
    assert.equal(w.outcome.ok, true);
    assert.equal(h.calls.filter(x => x.collection === 'clientes').length, 2);
    assert.equal(h.calls[1].time, 1200);
    assert.deepEqual(plain(h.store._productStatus().requiredRecovering), []);
    assert.equal(h.store._productStatus().snapshotErrors.clientes, undefined);
    assert.equal(h.store.get('clientes', 'qa-clientes').nombre, 'Synthetic row');
  });
}

test('a successful first read has no added retry delay', async () => {
  const h = harness((request, _, reply) => Promise.resolve(reply(request)));
  h.store._attachSnapshots(); const w = h.wait(); await h.advance(100); await w.promise;
  assert.equal(w.outcome.ok, true); assert.equal(h.calls[0].time, 0);
  assert.equal(h.calls.filter(x => x.collection === 'clientes').length, 1);
});

test('a second transient failure is terminal; no third request', async () => {
  const h = harness(() => Promise.reject(transient('functions/unavailable')));
  h.store._attachSnapshots(); const w = h.wait(); await h.advance(1300); await w.promise;
  assert.equal(w.outcome.ok, false); assert.match(w.outcome.error, /product_store_blocked:snapshot-error/);
  await h.advance(30000);
  assert.equal(h.calls.filter(x => x.collection === 'clientes').length, 2);
  assert.equal(h.store._productStatus().status, 'detached');
});

for (const code of ['functions/permission-denied', 'functions/unauthenticated', 'functions/internal',
  'PROTECTED_READ_RESPONSE_INVALID', 'PROTECTED_READ_TENANT_MISMATCH', 'PROTECTED_READ_COUNTRY_MISMATCH',
  'PROTECTED_READ_CURSOR_INVALID', 'PROTECTED_READ_ROLE_NOT_ASSIGNED']) {
  test('terminal scope/integrity error never enters retry: ' + code, async () => {
    const h = harness(() => Promise.reject(transient(code)));
    h.store._attachSnapshots(); const w = h.wait(); await h.advance(100); await w.promise;
    assert.equal(w.outcome.ok, false); assert.match(w.outcome.error, /product_store_blocked:snapshot-error/);
    await h.advance(2000); assert.equal(h.calls.length, 1);
    assert.equal(h.store._productStatus().ready, false);
  });
}

test('the original total readiness budget is not reset by a retry', async () => {
  const h = harness(() => Promise.reject(transient('functions/unavailable')));
  h.store._attachSnapshots(); const w = h.wait(500); await h.advance(500); await w.promise;
  assert.equal(w.outcome.error, 'product_store_readiness_timeout');
  await h.advance(2000); assert.equal(h.calls.length, 1);
  assert.deepEqual(plain(h.store._productStatus().pendingSnapshotRetries), []);
});

test('explicit detach cancels scheduled recovery without another request', async () => {
  const h = harness(() => Promise.reject(transient('functions/unavailable')));
  h.store._attachSnapshots(); await h.advance(100); h.store._detachSnapshots();
  await h.advance(2000); assert.equal(h.calls.length, 1);
  assert.deepEqual(plain(h.store._productStatus().pendingSnapshotRetries), []);
});

test('role change cancels old recovery; only the current role can publish rows', async () => {
  const h = harness((request, _, reply) => request.activeRole === 'Operativo' ? Promise.reject(transient('functions/unavailable')) : Promise.resolve(reply(request)));
  h.store._attachSnapshots(); await h.advance(100); h.roleChange('Dirección');
  await h.advance(1400);
  assert.equal(h.calls.filter(x => x.activeRole === 'Operativo').length, 1);
  assert.equal(h.calls.filter(x => x.activeRole === 'Dirección' && x.collection === 'clientes').length, 1);
  assert.equal(h.store._productStatus().ready, true);
});

test('optional transient failure remains degraded without blocking required startup', async () => {
  const h = harness((request, _, reply) => request.collection === 'polizas' ? Promise.reject(transient('functions/unavailable')) : Promise.resolve(reply(request)), { optional: ['polizas'] });
  h.store._attachSnapshots(); const w = h.wait(); await h.advance(100); await w.promise;
  h.store._ensureCollections(['polizas']); await h.advance(100);
  assert.equal(w.outcome.ok, true); assert.equal(h.store._productStatus().ready, true);
  assert.equal(h.store._productStatus().optionalDegraded, true);
  assert.deepEqual(plain(h.store._productStatus().requiredRecovering), []);
});

test('a retry must still pass the real country/tenant response validator', async () => {
  const h = harness((request, attempt, reply) => {
    if (attempt === 1) return Promise.reject(transient('functions/unavailable'));
    const response = reply(request); response.rows[0].tenantId = 'foreign-tenant'; return Promise.resolve(response);
  });
  h.store._attachSnapshots(); const w = h.wait(); await h.advance(1300); await w.promise;
  assert.equal(w.outcome.ok, false); assert.equal(h.store.all('clientes').length, 0);
  assert.equal(h.calls.length, 2);
});
