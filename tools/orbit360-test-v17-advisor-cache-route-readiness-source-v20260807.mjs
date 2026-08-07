#!/usr/bin/env node
'use strict';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const HYDRATION = 'orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js';
const ROOTFIX = 'orbit360-platform/core/visual-runtime-rootfix-v20260805.js';
const MATRIX_WRAPPER = 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs';
const SEALER = 'tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs';
const REQUEST = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const OVERLAY = 'tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json';
const V16_RELAY = '.github/workflows/orbit360-registered-relay-v16-hydration-v20260807.yml';

const checks = [];
function check(id, fn) {
  try {
    fn();
    checks.push({ id, ok: true });
  } catch (error) {
    checks.push({ id, ok: false, error: String(error && error.message || error) });
  }
}
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const json = file => JSON.parse(read(file));

const hydrationSource = read(HYDRATION);
const rootfixSource = read(ROOTFIX);
const matrixSource = read(MATRIX_WRAPPER);
const sealerSource = read(SEALER);

check('v16-relay-disarmed', () => assert.equal(fs.existsSync(V16_RELAY), false));
check('hydration-cache-source-markers', () => {
  assert.match(hydrationSource, /advisorProjectionCache/);
  assert.match(hydrationSource, /advisorProjectionBuilds/);
  assert.match(hydrationSource, /advisorProjectionInvalidations/);
  assert.match(hydrationSource, /ADVISOR_PROJECTION_SOURCES/);
  assert.match(hydrationSource, /readinessAuthority: 'OrbitHydrationContractDiagnostics'/);
});
check('matrix-required-then-render-checkpoints-source', () => {
  const required = matrixSource.indexOf("_REQUIRED_HYDRATION', 35000");
  const render = matrixSource.indexOf("_RENDER_READY', 35000");
  assert.ok(required > 0 && render > required);
  assert.match(matrixSource, /OrbitHydrationContractDiagnostics/);
});
check('sealer-browser-evidence-source', () => {
  assert.match(sealerSource, /const browserExecuted =/);
  assert.match(sealerSource, /browserExecuted: final\.browserExecuted/);
  assert.match(sealerSource, /ROLLBACK_RESTORED_AFTER_CURRENT_STOP/);
});

function objectLiteral(source, variableName) {
  const marker = `var ${variableName} = `;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${variableName} missing`);
  const bodyStart = source.indexOf('{', start + marker.length);
  let depth = 0;
  let quote = '';
  let escape = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return vm.runInNewContext('(' + source.slice(bodyStart, i + 1) + ')');
    }
  }
  throw new Error(`${variableName} literal not closed`);
}

check('rootfix-deps-subset-of-hydration-contract-authority', () => {
  const deps = objectLiteral(rootfixSource, 'MODULE_DEPS');
  const contracts = objectLiteral(hydrationSource, 'CONTRACTS');
  for (const [route, list] of Object.entries(deps)) {
    assert.ok(contracts[route], `missing contract for ${route}`);
    const allowed = new Set([...(contracts[route].required || []), ...(contracts[route].optional || [])]);
    for (const dep of list) assert.ok(allowed.has(dep), `${route} hidden dependency outside contract: ${dep}`);
  }
});

const active = {
  value: { advisorId: 'adv-1', nombre: 'Responsable 1', email: 'r1@example.invalid', roles: ['asesor'], rol: 'Asesor', countries: ['GT'], dataScopes: { clientes: 'todos' } }
};
const rows = {
  asesores: [],
  clientes: Array.from({ length: 430 }, (_, i) => ({ id: `c-${i + 1}`, asesorId: `adv-${(i % 7) + 1}`, asesorNombre: `Responsable ${(i % 7) + 1}` })),
  aseguradoras: Array.from({ length: 30 }, (_, i) => ({ id: `a-${i + 1}` })),
  polizas: Array.from({ length: 1375 }, (_, i) => ({ id: `p-${i + 1}`, clienteId: `c-${(i % 430) + 1}`, asesorId: `adv-${(i % 7) + 1}` })),
  vehiculos: Array.from({ length: 1033 }, (_, i) => ({ id: `v-${i + 1}`, clienteId: `c-${(i % 430) + 1}` })),
  recibosEsperados: Array.from({ length: 1294 }, (_, i) => ({ id: `r-${i + 1}`, clienteId: `c-${(i % 430) + 1}`, asesorId: `adv-${(i % 7) + 1}` })),
  carteraPrimas: Array.from({ length: 673 }, (_, i) => ({ id: `cp-${i + 1}`, clienteId: `c-${(i % 430) + 1}`, asesorId: `adv-${(i % 7) + 1}` })),
  cobros: Array.from({ length: 7 }, (_, i) => ({ id: `co-${i + 1}`, clienteId: `c-${i + 1}`, asesorId: `adv-${i + 1}` })),
  comisiones: [], metas: [], negocios: [], gestiones: [], cancelaciones: []
};
const snapshotErrors = { asesores: { code: 'legacy-unavailable' }, comisiones: { code: 'legacy-unavailable' }, metas: { code: 'legacy-unavailable' }, negocios: { code: 'legacy-unavailable' }, gestiones: { code: 'legacy-unavailable' }, cancelaciones: { code: 'legacy-unavailable' } };
const storeListeners = [];
let originalRenders = 0;
const modules = Object.fromEntries(['inicio', 'aseguradoras', 'cliente360', 'polizas', 'cobros', 'conciliaciones', 'cancelaciones', 'ops', 'leads'].map(name => [name, { render(host) { originalRenders += 1; host.innerHTML = `<div class="page">rendered-${name}</div>`; } }]));
const baseStore = {
  all(collection) { return (rows[collection] || []).map(row => ({ ...row })); },
  get(collection, id) { const row = (rows[collection] || []).find(item => item.id === id); return row ? { ...row } : null; },
  where(collection, fieldOrPredicate, opOrValue, maybeValue) {
    const list = (rows[collection] || []);
    if (typeof fieldOrPredicate === 'function') return list.filter(fieldOrPredicate).map(row => ({ ...row }));
    const value = arguments.length >= 4 ? maybeValue : opOrValue;
    return list.filter(row => row[fieldOrPredicate] === value).map(row => ({ ...row }));
  },
  find(collection, predicate) { const row = (rows[collection] || []).find(predicate); return row ? { ...row } : null; },
  on(collection, callback) { storeListeners.push(callback); return () => {}; },
  _labStatus() {
    const rawCounts = {};
    for (const [name, list] of Object.entries(rows)) {
      if (!snapshotErrors[name]) rawCounts[name] = list.length;
    }
    return { status: 'ready', snapshotAttached: true, snapshotAttachedCount: Object.keys(rows).length, rawCounts, operationalCounts: { ...rawCounts }, snapshotErrors: { ...snapshotErrors } };
  }
};
const host = {
  innerHTML: '',
  querySelector() { return null; }
};
const body = { dataset: {}, classList: { contains() { return false; } }, style: {} };
const documentStub = {
  body,
  head: { appendChild() {} },
  documentElement: {},
  getElementById(id) { if (id === 'host') return host; return null; },
  createElement() { return { id: '', className: '', style: {}, dataset: {}, setAttribute() {}, appendChild() {}, insertBefore() {}, querySelector() { return null; }, innerHTML: '' }; }
};
class MutationObserverStub { constructor(callback) { this.callback = callback; } observe() {} }
class EventStub { constructor(type) { this.type = type; } }
const context = {
  console,
  Map,
  Set,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Math,
  Date,
  URLSearchParams,
  window: null,
  document: documentStub,
  MutationObserver: MutationObserverStub,
  Event: EventStub,
  HashChangeEvent: EventStub,
  CustomEvent: EventStub,
  setTimeout() { return 1; },
  clearTimeout() {},
  Orbit: {
    store: baseStore,
    q: { leaderboard() { return []; } },
    modules,
    route: { key: 'cliente360' },
    auth: { user() { return active.value; } }
  }
};
context.window = context;
context.window.addEventListener = function () {};
context.window.dispatchEvent = function () {};
context.performance = { now: () => Date.now() };
vm.createContext(context);
vm.runInContext(hydrationSource, context, { filename: HYDRATION });

check('hydration-mounted-with-unified-module-authority', () => {
  assert.equal(context.OrbitHydrationContractDiagnostics.mounted(), true);
  assert.equal(context.OrbitHydrationContractDiagnostics.unifiedReadinessMounted(), true);
  assert.equal(context.document.body.dataset.visualReadinessAuthority, 'OrbitHydrationContractDiagnostics');
});

check('430-advisor-lookups-one-projection-build', () => {
  for (let i = 0; i < 430; i += 1) context.Orbit.store.get('asesores', `adv-${(i % 7) + 1}`);
  const status = context.OrbitHydrationContractDiagnostics.advisorProjection();
  assert.equal(status.builds, 1);
  assert.equal(status.invalidations, 0);
  assert.equal(status.count, 7);
  assert.equal(status.cacheValid, true);
});

check('source-collection-invalidation-causes-exactly-one-rebuild', () => {
  storeListeners.forEach(listener => listener('clientes'));
  for (let i = 0; i < 430; i += 1) context.Orbit.store.get('asesores', `adv-${(i % 7) + 1}`);
  const status = context.OrbitHydrationContractDiagnostics.advisorProjection();
  assert.equal(status.builds, 2);
  assert.equal(status.invalidations, 1);
});

check('membership-signature-change-causes-exactly-one-rebuild', () => {
  active.value = { ...active.value, advisorId: 'adv-2', nombre: 'Responsable 2' };
  for (let i = 0; i < 430; i += 1) context.Orbit.store.get('asesores', `adv-${(i % 7) + 1}`);
  const status = context.OrbitHydrationContractDiagnostics.advisorProjection();
  assert.equal(status.builds, 3);
  assert.equal(status.invalidations, 2);
});

check('cliente360-required-contract-ready-with-optional-degraded', () => {
  const status = context.OrbitHydrationContractDiagnostics.status('cliente360');
  assert.equal(status.ready, true);
  assert.equal(status.required.missing.length, 0);
  assert.equal(status.required.failed.length, 0);
  assert.equal(status.degraded, true);
});

check('unified-module-wrapper-blocks-only-required-failure', () => {
  snapshotErrors.polizas = { code: 'required-failure' };
  host.innerHTML = '';
  const before = originalRenders;
  context.Orbit.modules.cliente360.render(host);
  assert.equal(originalRenders, before);
  assert.match(host.innerHTML, /orbit-load-state/);
  delete snapshotErrors.polizas;
  host.innerHTML = '';
  context.Orbit.modules.cliente360.render(host);
  assert.equal(originalRenders, before + 1);
  assert.match(host.innerHTML, /rendered-cliente360/);
  assert.equal(context.OrbitRuntimeDiagnostics.cliente360.readinessAuthority, 'OrbitHydrationContractDiagnostics');
});

check('v16-request-evidence-corrected-but-still-frozen', () => {
  const request = json(REQUEST);
  assert.equal(request.requestVersion, '20260807.16-two-phase-runtime');
  assert.equal(request.consumed, true);
  assert.equal(request.authorizationFrozen, true);
  assert.equal(request.allowedExecutions, 0);
  assert.equal(request.replayAllowed, false);
  assert.equal(request.executionResult.browserExecuted, true);
});

check('v16-lifecycle-rollback-state-corrected-and-fail-closed', () => {
  const lifecycle = json(LIFECYCLE);
  assert.equal(lifecycle.protectedState.hostingState, 'ROLLBACK_RESTORED_AFTER_V16_STOP');
  assert.equal(lifecycle.runtimeResult.browserExecuted, true);
  assert.equal(lifecycle.stopRetryActive, true);
  assert.equal(lifecycle.executionAuthorized, false);
  assert.equal(lifecycle.browserAuthorized, false);
  assert.equal(lifecycle.hostingDeployAuthorized, false);
});

check('overlay-remains-fail-closed-with-historical-runtime-evidence', () => {
  const overlay = json(OVERLAY);
  assert.equal(overlay.runtimeAllowed, false);
  assert.equal(overlay.hostingAllowed, false);
  assert.equal(overlay.freshAuthorizationRequired, true);
  assert.equal(overlay.historicalRuntimeEvidence.browserExecuted, true);
  assert.equal(overlay.historicalRuntimeEvidence.rollbackRestored, true);
  assert.equal(overlay.historicalRuntimeEvidence.writes, 0);
});

const failed = checks.filter(item => !item.ok);
console.log(JSON.stringify({
  status: failed.length ? 'FAIL_V17_ADVISOR_CACHE_ROUTE_READINESS_SOURCE_ONLY' : 'PASS_V17_ADVISOR_CACHE_ROUTE_READINESS_SOURCE_ONLY',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  runtimeEffects: 0,
  secrets: 0,
  firebase: 0,
  hosting: 0,
  browser: 0,
  productWrites: 0,
  ok: failed.length === 0
}, null, 2));
process.exit(failed.length ? 41 : 0);
