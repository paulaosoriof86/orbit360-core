#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import vm from 'node:vm';

const files = {
  cliente: 'orbit360-platform/modules/cliente360.js',
  rootfix: 'orbit360-platform/core/visual-runtime-rootfix-v20260805.js',
  matrix: 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs',
  sealer: 'tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs',
  request: '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json'
};
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const clienteSource = read(files.cliente);
const rootfixSource = read(files.rootfix);
const matrixSource = read(files.matrix);
const sealerSource = read(files.sealer);
const request = JSON.parse(read(files.request));
const checks = {};

checks.v18Frozen = request.requestVersion === '20260807.18-two-phase-runtime' && request.consumed === true && request.authorizationFrozen === true && request.allowedExecutions === 0 && request.replayAllowed === false;
checks.boundedSource = clienteSource.includes('const LIST_PAGE_SIZE = 40') && clienteSource.includes('const visibleRows = rows.slice(pageStart, pageStart + LIST_PAGE_SIZE)') && clienteSource.includes('renderedRows: visibleRows.length') && clienteSource.includes('c360-pagination');
checks.filtersResetPage = clienteSource.includes("const reb = () => { tab = 'resumen'; listPage = 1; lista(); }") && clienteSource.includes('listPage = 1;\n    lista();');
checks.deepLinkPreserved = clienteSource.includes("location.hash='#/cliente360?c=${c.id}'");
checks.instrumentationSource = ['summaryCacheMs','summaryAggregateMs','rowsBuildMs','innerHtmlMs','bindingsMs','totalMs'].every(token => clienteSource.includes(token));
checks.afterRenderInstrumentation = rootfixSource.includes('afterRenderMs') && rootfixSource.includes('totalWithAfterRenderMs') && rootfixSource.includes('Object.assign({}, OrbitRuntimeDiagnostics[moduleName] || {}');
checks.requiredBeforeNavigation = matrixSource.includes('async function waitRequiredHydration') && matrixSource.includes('await waitRequiredHydration(page, role, target)') && matrixSource.indexOf('await waitRequiredHydration(page, role, target)') < matrixSource.indexOf("mark(role.toUpperCase() + '_NAVIGATE_'");
checks.renderOnlyAfterNavigation = matrixSource.includes('const renderMs = await waitRenderReady(page, role, target)') && matrixSource.indexOf("location.hash = '#/' + value") < matrixSource.indexOf('const renderMs = await waitRenderReady(page, role, target)');
checks.validatorClassifier = matrixSource.includes("result.validatorFinding = 'VALIDATOR_STALE_RENDER_PROBE_BLOCKED'") && matrixSource.includes("result.classification = 'VALIDATOR_STALE'");
checks.sealerPersistsMetrics = sealerSource.includes('matrixValidatorFinding') && sealerSource.includes('routeMetrics');

let writes = 0;
let summaryIndexCalls = 0;
let fallbackSummaryCalls = 0;
const advisors = Array.from({ length: 7 }, (_, i) => ({ id: `a${i}`, nombre: `Asesor ${i}`, color: '#555' }));
const clients = Array.from({ length: 430 }, (_, i) => ({
  id: `c${i}`, nombre: `Cliente ${i}`, email: `cliente${i}@example.test`, identificacion: `ID${i}`,
  tipo: i % 3 === 0 ? 'Empresa' : 'Persona', pais: 'GT', ciudad: 'Guatemala', asesorId: `a${i % 7}`,
  segmento: i % 2 ? 'Estándar' : 'Premium', moneda: 'GTQ'
}));
const policies = Array.from({ length: 1375 }, (_, i) => ({ id:`p${i}`, clienteId:`c${i % 430}`, estado:i % 9 === 0 ? 'Por renovar' : 'Vigente', prima:1000 + i, moneda:'GTQ' }));
const summaries = new Map(clients.map((c, i) => [c.id, { cli:c, moneda:'GTQ', primaAnual:1000 + i, nVigentes:1, nPolizas:3, vencido:0, pendiente:0, salud:88 }]));
const rows = { clientes:clients, asesores:advisors, polizas:policies };
const clone = value => JSON.parse(JSON.stringify(value));
const store = {
  all(collection) { return clone(rows[collection] || []); },
  get(collection, id) { return clone((rows[collection] || []).find(row => row.id === id) || null); },
  where(collection, fieldOrPredicate, opOrValue) {
    const source = rows[collection] || [];
    if (typeof fieldOrPredicate === 'function') return clone(source.filter(fieldOrPredicate));
    return clone(source.filter(row => row[fieldOrPredicate] === opOrValue));
  },
  find(collection, predicate) { return clone((rows[collection] || []).find(predicate) || null); },
  insert() { writes += 1; }, update() { writes += 1; }, remove() { writes += 1; }
};
const q = {
  clientesResumenIndex() { summaryIndexCalls += 1; return summaries; },
  clienteResumen(id) { fallbackSummaryCalls += 1; return summaries.get(id); },
  asesor(id) { return advisors.find(a => a.id === id) || null; },
  renovacionesProximas() { return policies.filter(p => p.estado === 'Por renovar').slice(0, 20); },
  monedaPais() { return 'GTQ'; },
  actividadesDe() { return []; }, aseguradora() { return null; }, vehiculosDe() { return []; }
};
const ui = {
  esc(v) { return String(v == null ? '' : v); },
  money(v) { return 'Q ' + Math.round(Number(v || 0)); }, moneyShort(v) { return 'Q ' + Math.round(Number(v || 0)); },
  avatar(name) { return `<span>${String(name).slice(0,2)}</span>`; }, fmtDate(v) { return String(v || ''); }, today() { return '2026-08-07'; }
};
const document = {
  activeElement: null,
  getElementById() { return null; },
  querySelector() { return null; },
  createElement() { return { style:{}, addEventListener(){}, appendChild(){}, remove(){}, querySelector(){return null;}, querySelectorAll(){return [];} }; },
  body: { appendChild(){}, classList:{ contains(){return false;} }, style:{} }
};
const host = { _html:'', set innerHTML(v) { this._html = String(v); }, get innerHTML() { return this._html; }, querySelectorAll(){return [];}, querySelector(){return null;} };
const context = {
  console,
  document,
  performance: { now: (() => { let n = 0; return () => (n += 0.25); })() },
  OrbitRuntimeDiagnostics: {},
  Orbit: {
    modules:{}, ui, q, store,
    route:{ key:'cliente360', params:{} },
    session:{ rol(){ return 'Dirección'; } }, auth:{ user(){ return { rol:'Dirección' }; } },
    kit:{ bannerFor(){ return '<div class="banner">Cliente 360</div>'; } },
    kpi(){}, pais:'GT'
  }
};
context.window = context;
vm.createContext(context);
vm.runInContext(clienteSource, context, { filename: files.cliente });
context.Orbit.modules.cliente360.render(host);

const renderedRows = (host.innerHTML.match(/<tr class="clickable"/g) || []).length;
const diag = context.OrbitRuntimeDiagnostics.cliente360 || {};
const list = diag.list || {};
checks.fixtureFirstFrameBounded = renderedRows === 40 && list.renderedRows === 40 && list.pageSize === 40 && list.totalRows === 430 && list.filteredRows === 430 && list.pageCount === 11 && list.bounded === true;
checks.fixtureUsesSummaryIndex = summaryIndexCalls === 1 && fallbackSummaryCalls === 0;
checks.fixtureMetricsPresent = ['summaryCacheMs','summaryAggregateMs','rowsBuildMs','innerHtmlMs','bindingsMs','totalMs'].every(k => Number.isFinite(Number(list[k]))) && Number(list.totalMs) >= 0;
checks.fixturePaginationVisible = /Página 1 de 11/.test(host.innerHTML) && /Mostrando 1–40 de 430/.test(host.innerHTML);
checks.fixtureDeepLinksVisible = /#\/cliente360\?c=c0/.test(host.innerHTML);
checks.zeroWritesFixture = writes === 0 && Number(list.writes || 0) === 0;

const failedCheckIds = Object.entries(checks).filter(([,ok]) => !ok).map(([id]) => id);
const output = {
  schemaVersion:'orbit360-v19-cliente360-bounded-render-source-v1',
  generatedAt:'2026-08-07T10:44:00-06:00',
  gateId:'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  status: failedCheckIds.length ? 'STOP_V19_CLIENTE360_BOUNDED_RENDER_SOURCE' : 'PASS_V19_CLIENTE360_BOUNDED_RENDER_SOURCE_ONLY',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'FUNCTIONAL_DEFECT_CORRECTED_SOURCE_ONLY',
  rootCauses:['CLIENTE360_SYNCHRONOUS_RENDER_MAIN_THREAD_STALL','REQUIRED_HYDRATION_PROBE_COUPLED_TO_TARGET_RENDER'],
  validatorClassification:'VALIDATOR_STALE_RENDER_PROBE_BLOCKED',
  fixture:{ clients:430, policies:1375, firstFrameRows:renderedRows, pageSize:Number(list.pageSize || 0), pageCount:Number(list.pageCount || 0), summaryIndexCalls, fallbackSummaryCalls, writes },
  total:Object.keys(checks).length,
  passed:Object.values(checks).filter(Boolean).length,
  failed:failedCheckIds.length,
  failedCheckIds,
  checks,
  secretsRead:false,
  firebaseAccess:false,
  hostingTouched:false,
  browserExecuted:false,
  deployExecuted:false,
  firestoreWrites:0,
  authWrites:0,
  operationalWrites:0,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false,
  ok:failedCheckIds.length === 0
};
fs.mkdirSync('orbit360-platform/runtime-gate-crm-v20260716', { recursive:true });
fs.writeFileSync('orbit360-platform/runtime-gate-crm-v20260716/v19-cliente360-bounded-render-source-sanitized-v20260807.json', JSON.stringify(output,null,2) + '\n', 'utf8');
console.log(JSON.stringify(output,null,2));
process.exit(output.ok ? 0 : 41);
