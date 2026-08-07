#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import vm from 'node:vm';

const files = {
  hydration: 'orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js',
  precheck: 'tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs',
  runner: 'tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v3-cross-runner-v20260806.sh',
  sealer: 'tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs',
  request: '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json'
};
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const request = JSON.parse(read(files.request));
const hydrationSource = read(files.hydration);
const precheckSource = read(files.precheck);
const runnerSource = read(files.runner);
const sealerSource = read(files.sealer);
const checks = {};

checks.v17Frozen = request.requestVersion === '20260807.17-two-phase-runtime' && request.consumed === true && request.authorizationFrozen === true && request.allowedExecutions === 0 && request.replayAllowed === false;
checks.transactionalOwnerSource = hydrationSource.includes('function bindStoreOwner()') && hydrationSource.includes('boundStore === Orbit.store') && hydrationSource.includes('originalStoreReady()') && hydrationSource.includes('originalStatusReady()') && hydrationSource.includes("visualHydrationOwnerValid");
checks.mountedRequiresOwner = hydrationSource.includes('installedStore === Orbit.store && boundStore === Orbit.store && ownerValid()') && hydrationSource.includes('ownerValid: function () { return ownerValid(); }');
checks.precheckOwnerCheckpoint = precheckSource.includes("'HYDRATION_OWNER_VALID'") && precheckSource.includes("rootCauseHint = 'HYDRATION_PARTIAL_INSTALL_REENTRANCY_STATE_LOSS'");
checks.runEvidenceReset = runnerSource.includes('reset_run_evidence()') && runnerSource.includes('rm -f "$PRECHECK" "$MATRIX" "$SUPERVISOR" "$FINAL"') && runnerSource.indexOf('reset_run_evidence\nwrite_runtime_state') < runnerSource.indexOf('SERVICE_ACCOUNT=');
checks.sealerIgnoresSkippedMatrix = sealerSource.includes("outcomes.matrix === 'skipped' ? 'NOT_EXECUTED'") && sealerSource.includes("outcomes.matrix === 'skipped' ? [] : roles") && sealerSource.includes("outcomes.matrix === 'skipped' ? 0 : Number(matrix && matrix.firestoreReads || 0)");

const timers = [];
const storeListeners = [];
let writes = 0;
const rows = {
  asesores: [],
  clientes: Array.from({ length: 430 }, (_, i) => ({ id: `c${i}`, asesorId: `a${i % 7}`, asesorNombre: `Asesor ${i % 7}` })),
  polizas: Array.from({ length: 120 }, (_, i) => ({ id: `p${i}`, asesorId: `a${i % 7}` })),
  cobros: Array.from({ length: 7 }, (_, i) => ({ id: `co${i}`, asesorId: `a${i}` })),
  recibosEsperados: Array.from({ length: 100 }, (_, i) => ({ id: `r${i}`, asesorId: `a${i % 7}` })),
  carteraPrimas: Array.from({ length: 80 }, (_, i) => ({ id: `cp${i}`, asesorId: `a${i % 7}` })),
  aseguradoras: Array.from({ length: 26 }, (_, i) => ({ id: `ins${i}` })),
  vehiculos: Array.from({ length: 40 }, (_, i) => ({ id: `v${i}` })),
  metas: [], negocios: [], gestiones: [], comisiones: [], cancelaciones: []
};
const canonicalStatus = {
  status: 'ready',
  snapshotAttached: true,
  snapshotAttachedCount: 29,
  rawCounts: { clientes:430, polizas:120, cobros:7, aseguradoras:26, vehiculos:40, recibosEsperados:100, carteraPrimas:80 },
  operationalCounts: { clientes:430, polizas:120, cobros:7, aseguradoras:26, vehiculos:40, recibosEsperados:100, carteraPrimas:80 },
  snapshotErrors: {}
};
const clone = value => JSON.parse(JSON.stringify(value));
const store = {
  all(collection) { return clone(rows[collection] || []); },
  get(collection, id) { return clone((rows[collection] || []).find(row => String(row.id) === String(id)) || null); },
  where(collection, fieldOrPredicate, opOrValue, maybeValue) {
    const source = rows[collection] || [];
    if (typeof fieldOrPredicate === 'function') return clone(source.filter(fieldOrPredicate));
    const value = arguments.length >= 4 ? maybeValue : opOrValue;
    return clone(source.filter(row => row[fieldOrPredicate] === value));
  },
  find(collection, predicate) { return clone((rows[collection] || []).find(predicate) || null); },
  on(collection, callback) { storeListeners.push(callback); return () => {}; },
  _labStatus() { return clone(canonicalStatus); },
  insert() { writes += 1; }, update() { writes += 1; }, remove() { writes += 1; }
};
const classList = { contains() { return false; }, add() {}, remove() {}, toggle() {} };
const document = {
  body: { classList, dataset: {}, style: {} },
  head: { appendChild() {} },
  createElement() { return { id:'', className:'', textContent:'', style:{}, setAttribute() {}, appendChild() {}, remove() {}, children:[] }; },
  getElementById() { return null; },
  querySelector() { return null; }
};
const context = {
  console,
  document,
  MutationObserver: class { observe() {} disconnect() {} },
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
  Event: class { constructor(type) { this.type = type; } },
  HashChangeEvent: class { constructor(type) { this.type = type; } },
  setTimeout(fn) { timers.push(fn); return timers.length; },
  clearTimeout() {},
  addEventListener() {},
  dispatchEvent() {},
  location: { hash: '#/inicio' },
  Orbit: {
    store,
    q: { leaderboard() { return []; } },
    auth: { user() { return { advisorId:'a0', nombre:'Asesor 0', email:'', rol:'Direccion', roles:['Direccion'], countries:['GT'], dataScopes:{} }; } },
    route: { key:'inicio' },
    modules: { inicio: { render() { return 'inicio'; } } }
  }
};
context.window = context;
vm.createContext(context);
vm.runInContext(hydrationSource, context, { filename: files.hydration });

const diagPartial = context.OrbitHydrationContractDiagnostics;
const partialStatus = context.Orbit.store._labStatus();
checks.partialOwnerSurvives = !!diagPartial && diagPartial.ownerValid() === true && diagPartial.mounted() === false && partialStatus.status === 'ready' && partialStatus.snapshotAttached === true && partialStatus.snapshotAttachedCount === 29 && ['clientes','polizas','cobros','aseguradoras'].every(name => Object.prototype.hasOwnProperty.call(partialStatus.rawCounts || {}, name));

['aseguradoras','cliente360','polizas','cobros','conciliaciones','cancelaciones','ops','leads'].forEach(name => { context.Orbit.modules[name] = { render() { return name; } }; });
let spins = 0;
while (timers.length && spins < 40 && !context.OrbitHydrationContractDiagnostics.mounted()) {
  const fn = timers.shift();
  if (typeof fn === 'function') fn();
  spins += 1;
}
const diag = context.OrbitHydrationContractDiagnostics;
const finalStatus = context.Orbit.store._labStatus();
const inicio = diag.status('inicio');
checks.progressiveInstallCompletes = diag.mounted() === true && diag.ownerValid() === true && diag.storeOwner().originalStoreReady === true && diag.storeOwner().originalStatusReady === true && diag.storeOwner().generation === 1 && inicio.ready === true && finalStatus.status === 'ready' && finalStatus.snapshotAttached === true && finalStatus.snapshotAttachedCount === 29;

for (let i = 0; i < 430; i += 1) context.Orbit.store.get('asesores', `a${i % 7}`);
const projectionBefore = diag.advisorProjection();
checks.cacheSingleBuild = projectionBefore.builds === 1 && projectionBefore.cacheValid === true && projectionBefore.count === 7;
storeListeners.forEach(listener => listener('clientes'));
context.Orbit.store.get('asesores', 'a0');
const projectionAfter = diag.advisorProjection();
checks.cacheOneRebuildAfterInvalidation = projectionAfter.builds === 2 && projectionAfter.invalidations >= 1 && projectionAfter.count === 7;
checks.zeroWritesFixture = writes === 0;

const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-v18-hydration-transactional-run-evidence-source-v1',
  generatedAt: new Date().toISOString(),
  gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  status: failedCheckIds.length ? 'STOP_V18_TRANSACTIONAL_HYDRATION_SOURCE' : 'PASS_V18_TRANSACTIONAL_HYDRATION_RUN_EVIDENCE_SOURCE_ONLY',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'PIPELINE_MECHANISM_FAILURE_CORRECTED_SOURCE_ONLY',
  rootCause: 'HYDRATION_PARTIAL_INSTALL_REENTRANCY_STATE_LOSS',
  fixture: {
    progressiveModules: true,
    ownerGeneration: diag && diag.storeOwner ? diag.storeOwner().generation : null,
    canonicalSnapshotAttached: finalStatus.snapshotAttached === true,
    advisorLookups: 430,
    projectionBuildsBeforeInvalidation: projectionBefore.builds,
    projectionBuildsAfterInvalidation: projectionAfter.builds,
    writes
  },
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  runtimeExecuted: false,
  secretsRead: false,
  firebaseAccess: false,
  hostingTouched: false,
  browserExecuted: false,
  deployExecuted: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  ok: failedCheckIds.length === 0
};
fs.mkdirSync('orbit360-platform/runtime-gate-crm-v20260716', { recursive: true });
fs.writeFileSync('orbit360-platform/runtime-gate-crm-v20260716/v18-hydration-transactional-run-evidence-source-sanitized-v20260807.json', JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 41);