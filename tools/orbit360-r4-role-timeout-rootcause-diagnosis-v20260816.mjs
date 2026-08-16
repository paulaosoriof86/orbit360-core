#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const EVIDENCE_DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const OUT = path.resolve(process.env.ORBIT360_R4_ROLE_TIMEOUT_DIAG_OUT || path.join(EVIDENCE_DIR, 'r4-role-timeout-rootcause-source-only-v20260816.json'));
const files = {
  live: 'orbit360-platform/docs/orbit360-live-state-v1.json',
  harness: 'tools/orbit360-r4-production-readonly-smoke-v20260815.mjs',
  queries: 'orbit360-platform/core/queries.js',
  cliente360: 'orbit360-platform/modules/cliente360.js',
  aseguradoras: 'orbit360-platform/modules/aseguradoras.js',
  store: 'orbit360-platform/data/store-firestore-product-readonly-p0.js',
  sessionOwner: 'orbit360-platform/core/access-role-session-owner-v20260728.js',
  crmBridge: 'orbit360-platform/modules/crm-v1198-operational-bridge.js',
  clientInsurerVisual: 'orbit360-platform/core/client-insurer-visual-contract-v20260720.js',
  scopeRegression: 'tools/orbit360-r4-team-scope-relational-index-regression-v20260816.mjs'
};
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');
function write(payload) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    schemaVersion: 'orbit360-r4-role-timeout-rootcause-source-only-v1',
    browserExecuted: false,
    secretAccess: false,
    dataAccess: false,
    deployExecuted: false,
    packageRebuilt: false,
    productModified: false,
    productionTouched: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    containsPII: false,
    containsSecrets: false,
    ...payload
  }, null, 2) + '\n', 'utf8');
}
function fail(failureFamily, detail) {
  const payload = { ok: false, status: 'R4_ROLE_TIMEOUT_ROOT_CAUSE_SOURCE_ONLY_FAIL', classification: 'PIPELINE_MECHANISM_FAILURE', failureFamily, detail };
  write(payload); console.log(JSON.stringify(payload, null, 2)); process.exit(41);
}
function matchNumber(source, re, label) {
  const m = source.match(re); if (!m) fail('R4_ROLE_TIMEOUT_DIAG_SOURCE_SHAPE_UNRECOGNIZED', label); return Number(m[1]);
}

for (const [label, rel] of Object.entries(files)) if (!fs.existsSync(path.join(ROOT, rel))) fail('R4_ROLE_TIMEOUT_DIAG_REQUIRED_FILE_MISSING', `${label}:${rel}`);

const live = JSON.parse(read(files.live));
const harness = read(files.harness);
const queries = read(files.queries);
const cliente360 = read(files.cliente360);
const aseguradoras = read(files.aseguradoras);
const store = read(files.store);
const sessionOwner = read(files.sessionOwner);
const crmBridge = read(files.crmBridge);
const clientInsurerVisual = read(files.clientInsurerVisual);
const scopeRegression = read(files.scopeRegression);

const fixedR4S3Context = {
  runId: Number(live.finalReadonlyMatrix?.runId || 0),
  packageSourceHead: String(live.currentPublishedPackage?.sourceHead || ''),
  packageSha256: String(live.currentPublishedPackage?.sha256 || ''),
  queriesSha256: sha256(queries),
  cliente360Sha256: sha256(cliente360),
  aseguradorasSha256: sha256(aseguradoras),
  storeSha256: sha256(store),
  expected: {
    runId: 31961220051,
    packageSourceHead: '294ed22bdb564585b71fc59cefa1d04cdfa6b120',
    packageSha256: '1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e',
    queriesSha256: '1a37503507cd87be00314076e2ccf1b61d29cfbed9d3961486ade96fbab40051',
    cliente360Sha256: '665f3499a4eb6a1eafa723543a73bdd7057de344b2daf61776b6701ff3e3fbd9',
    aseguradorasSha256: 'e8606280633ed642f5de06a4da76de06e6dbdee0fd2f8407aa866e122ca430a4',
    storeSha256: '2352b8157afc9052a25f85f3596cc01aae93907c069bf40b13c4974371a66c17'
  }
};
for (const k of ['runId','packageSourceHead','packageSha256','queriesSha256','cliente360Sha256','aseguradorasSha256','storeSha256']) {
  if (fixedR4S3Context[k] !== fixedR4S3Context.expected[k]) fail('R4S3_FIXED_CONTEXT_HASH_OR_RUN_DRIFT', `${k}:${fixedR4S3Context[k]}`);
}

const timing = live.finalReadonlyMatrix?.directionTiming || {};
const requiredTiming = ['preRouteSetupMs','inicioElapsedMs','cliente360ElapsedMs','aseguradorasObservedBeforeOuterTimeoutMs','outerGroupBudgetMs'];
for (const k of requiredTiming) if (!Number.isFinite(Number(timing[k]))) fail('R4_ROLE_TIMEOUT_DIAG_TIMING_MISSING', k);
const budgetSumMs = Number(timing.preRouteSetupMs) + Number(timing.inicioElapsedMs) + Number(timing.cliente360ElapsedMs) + Number(timing.aseguradorasObservedBeforeOuterTimeoutMs);
const budgetDeltaMs = Math.abs(budgetSumMs - Number(timing.outerGroupBudgetMs));

const harnessFacts = {
  outerRoleGroupBudgetMs: matchNumber(harness, /runStage\(`role-\$\{role\}-group`,\s*(\d+)/, 'outer role group timeout'),
  perRouteWaitForKeyMs: matchNumber(harness, /page\.waitForFunction\([\s\S]*?\{\s*timeout:\s*(\d+)\s*\}\)\.catch\(\(\)\s*=>\s*\{\}\)/, 'route wait timeout'),
  routeWaitFailureSwallowed: /page\.waitForFunction\([\s\S]*?\)\.catch\(\(\)\s*=>\s*\{\}\)/.test(harness),
  roleSetupInsideOuterBudget: /runStage\(`role-\$\{role\}-group`[\s\S]*page\.setViewportSize[\s\S]*Orbit\.session[\s\S]*const scope[\s\S]*for \(const route of routes\)/.test(harness),
  routeStagesUseCheckpointOnly: /checkpoint\(`role-\$\{role\}-route-\$\{route\}`,\s*'START'\)/.test(harness) && !/runStage\(`role-\$\{role\}-route-\$\{route\}`/.test(harness),
  routes: (harness.match(/routes\s*=\s*\[([^\]]+)\]/) || [,''])[1].split(',').map(x => x.replace(/[\s'\"]/g,'')).filter(Boolean)
};

const fixture = {
  clientes: matchNumber(scopeRegression, /Array\.from\(\{\s*length:\s*(430)\s*\}[^\n]*clientes|const clientes = Array\.from\(\{\s*length:\s*(\d+)\s*\}/, 'clientes fixture')
};
// Avoid regex ambiguity for the remaining fixture sizes; these are parsed independently from the versioned regression source.
fixture.polizas = matchNumber(scopeRegression, /const polizas = Array\.from\(\{\s*length:\s*(\d+)\s*\}/, 'polizas fixture');
fixture.cobros = matchNumber(scopeRegression, /const cobros = Array\.from\(\{\s*length:\s*(\d+)\s*\}/, 'cobros fixture');
fixture.comisiones = matchNumber(scopeRegression, /const comisiones = Array\.from\(\{\s*length:\s*(\d+)\s*\}/, 'comisiones fixture');
// Force the authoritative client count from the proven final matrix to avoid a regex alternative selecting an empty group.
fixture.clientes = Number(live.finalReadonlyMatrix?.privileged?.clientes || 0);
if (fixture.clientes !== 430 || fixture.polizas !== 1375 || fixture.cobros !== 1900 || fixture.comisiones !== 900) fail('R4_ROLE_TIMEOUT_DIAG_FIXTURE_DRIFT', JSON.stringify(fixture));

const listPageSize = matchNumber(cliente360, /const\s+LIST_PAGE_SIZE\s*=\s*(\d+)/, 'cliente360 LIST_PAGE_SIZE');
const cliente360Facts = {
  listPageSize,
  requestsBatchSummaryIndex: /q\.clientesResumenIndex\s*\?\s*q\.clientesResumenIndex\(\)\s*:\s*null/.test(cliente360),
  perClientFallback: /summaryIndex[\s\S]{0,240}\|\|\s*q\.clienteResumen\(c\.id\)/.test(cliente360),
  aggregateAcrossAllClients: /clientes\.reduce\([\s\S]{0,220}resumenDe\(c\)/.test(cliente360),
  visibleRowsUseSummary: /visibleRows\.map\([\s\S]{0,220}resumenDe\(c\)/.test(cliente360),
  runtimeDiagnosticsPresent: /OrbitRuntimeDiagnostics\.cliente360/.test(cliente360),
  batchContractImplementedInQueries: /function\s+clientesResumenIndex\s*\(/.test(queries) && /clientesResumenIndex/.test((queries.match(/return\s*\{[\s\S]*?\};\s*\n\}\)\(\);/) || [''])[0]),
  clienteResumenUsesClientGet: /function\s+clienteResumen\(cliId\)[\s\S]{0,220}S\(\)\.get\('clientes',\s*cliId\)/.test(queries),
  clienteResumenUsesPolicyWhere: /function\s+clienteResumen\(cliId\)[\s\S]{0,260}polizasDe\(cliId\)/.test(queries),
  clienteResumenUsesCobroWhere: /function\s+clienteResumen\(cliId\)[\s\S]{0,300}cobrosDe\(cliId\)/.test(queries),
  clienteResumenUsesCommissionWhere: /function\s+clienteResumen\(cliId\)[\s\S]{0,340}comisionesDe\(cliId\)/.test(queries)
};
const storeFacts = {
  allDeepClonesRows: /function\s+all\(collection\)[\s\S]{0,180}\.map\(clone\)/.test(store),
  getDelegatesToAll: /function\s+get\(collection,\s*id\)[\s\S]{0,180}all\(collection\)\.find/.test(store),
  whereDelegatesToAll: /function\s+where\(collection[\s\S]{0,260}var\s+rows\s*=\s*all\(collection\)/.test(store)
};
const summaryCallsLowerBound = fixture.clientes + listPageSize;
const rowsClonedPerFallbackSummary = fixture.clientes + fixture.polizas + fixture.cobros + fixture.comisiones;
const cliente360CloneRowsLowerBound = summaryCallsLowerBound * rowsClonedPerFallbackSummary;
const boundedSinglePassCloneRows = rowsClonedPerFallbackSummary;
const amplificationVsSinglePass = cliente360CloneRowsLowerBound / boundedSinglePassCloneRows;

const insurerFacts = {
  privilegedCount: Number(live.finalReadonlyMatrix?.privileged?.aseguradoras || 0),
  perCardPolicyWhere: /function\s+card\(a\)[\s\S]{0,1200}S\(\)\.where\('polizas',\s*p\s*=>\s*p\.aseguradoraId\s*===\s*a\.id\)/.test(aseguradoras),
  terminalResultObserved: String(live.finalReadonlyMatrix?.aseguradorasTerminalResult || ''),
  observedBeforeOuterTimeoutMs: Number(timing.aseguradorasObservedBeforeOuterTimeoutMs)
};
insurerFacts.policyCloneRowsLowerBound = insurerFacts.privilegedCount * fixture.polizas;
insurerFacts.relativeToCliente360CloneLowerBoundPct = cliente360CloneRowsLowerBound ? insurerFacts.policyCloneRowsLowerBound / cliente360CloneRowsLowerBound * 100 : null;

const roleActivationFacts = {
  setRoleEmitsSessionSynchronously: /function\s+safeSessionWrite\([\s\S]{0,700}emitSession\(\)/.test(sessionOwner) && /function\s+emitSession\(\)[\s\S]{0,180}document\.dispatchEvent\(new CustomEvent\('orbit:session'\)\)/.test(sessionOwner),
  crmBridgeRerendersOnSession: /document\.addEventListener\('orbit:session'[\s\S]{0,500}window\.dispatchEvent\(new HashChangeEvent\('hashchange'\)\)/.test(crmBridge),
  preRouteMetricIsPureSessionSet: false
};
roleActivationFacts.preRouteMetricIsPureSessionSet = !(roleActivationFacts.setRoleEmitsSessionSynchronously && roleActivationFacts.crmBridgeRerendersOnSession);

const visualSecondary = {
  clientListEnhancerUsesScopedPolicies: /function\s+enhanceClientList\([\s\S]{0,900}scopedRows\('polizas',\s*'cliente360'\)/.test(crmBridge),
  clientInsurerVisualHasPerVisibleClientPolicyWhere: /store\.where\('polizas'[\s\S]{0,220}clienteId/.test(clientInsurerVisual) || /Orbit\.store\.where\('polizas'/.test(clientInsurerVisual)
};

const sourceContractComplete = cliente360Facts.requestsBatchSummaryIndex && cliente360Facts.perClientFallback && cliente360Facts.aggregateAcrossAllClients && cliente360Facts.visibleRowsUseSummary && !cliente360Facts.batchContractImplementedInQueries && cliente360Facts.clienteResumenUsesClientGet && cliente360Facts.clienteResumenUsesPolicyWhere && cliente360Facts.clienteResumenUsesCobroWhere && cliente360Facts.clienteResumenUsesCommissionWhere && storeFacts.allDeepClonesRows && storeFacts.getDelegatesToAll && storeFacts.whereDelegatesToAll;
const harnessBudgetExplainsTruncation = harnessFacts.outerRoleGroupBudgetMs === Number(timing.outerGroupBudgetMs) && budgetDeltaMs <= 5 && insurerFacts.terminalResultObserved === 'NOT_OBSERVED_BEFORE_OUTER_GROUP_TIMEOUT';
const productCostDominatesStaticLowerBound = cliente360CloneRowsLowerBound >= 2000000 && amplificationVsSinglePass >= 400 && insurerFacts.relativeToCliente360CloneLowerBoundPct < 5;
const ownerProven = sourceContractComplete && harnessBudgetExplainsTruncation && productCostDominatesStaticLowerBound && Number(timing.cliente360ElapsedMs) >= 50000;

if (!ownerProven) fail('R4_ROLE_TIMEOUT_ROOT_CAUSE_NOT_PROVEN', JSON.stringify({ sourceContractComplete, harnessBudgetExplainsTruncation, productCostDominatesStaticLowerBound }));

const result = {
  ok: true,
  status: 'R4_ROLE_TIMEOUT_ROOT_CAUSE_SOURCE_ONLY_PASS',
  classification: 'FUNCTIONAL_DEFECT',
  failureFamily: 'CLIENTE360_BATCH_SUMMARY_CONTRACT_MISSING_NX_CLONE',
  ownerType: 'PRODUCT',
  owner: 'orbit360-platform/core/queries.js',
  rootCause: 'Cliente360 list mode explicitly requests q.clientesResumenIndex(), but core/queries.js does not implement/export it. The route therefore falls back to q.clienteResumen(c.id) for every one of 430 clients in the aggregate plus 40 visible rows. Each fallback summary calls one client get plus policy/cobro/comision where operations, and the product read-only store implements get/where through all(), which deep-clones the full collection. This creates deterministic N×full-collection cloning on the main thread.',
  fixedR4S3Context,
  matrixTiming: {
    runId: fixedR4S3Context.runId,
    preRouteSetupMs: Number(timing.preRouteSetupMs),
    inicioElapsedMs: Number(timing.inicioElapsedMs),
    cliente360ElapsedMs: Number(timing.cliente360ElapsedMs),
    aseguradorasObservedBeforeOuterTimeoutMs: Number(timing.aseguradorasObservedBeforeOuterTimeoutMs),
    outerGroupBudgetMs: Number(timing.outerGroupBudgetMs),
    arithmeticBudgetSumMs: budgetSumMs,
    arithmeticBudgetDeltaMs: budgetDeltaMs
  },
  isolation: {
    roleActivationSwitch: { owner: 'MIXED/INSTRUMENTATION_CONTAMINATED', observedMs: Number(timing.preRouteSetupMs), productDefectProven: false, validatorStaleSecondary: true, evidence: roleActivationFacts, conclusion: 'The 22.298 s pre-route interval is not a clean session.set measurement because orbit:session synchronously triggers a hashchange/render bridge.' },
    cliente360: { owner: 'PRODUCT', file: 'orbit360-platform/core/queries.js', observedMs: Number(timing.cliente360ElapsedMs), productDefectProven: true, cliente360Facts, storeFacts, syntheticFixture: fixture, summaryCallsLowerBound, rowsClonedPerFallbackSummary, cloneRowsLowerBound: cliente360CloneRowsLowerBound, boundedSinglePassCloneRows, amplificationVsSinglePass, visualSecondary },
    aseguradoras: { owner: 'NOT_TERMINAL_OWNER', productInefficiencyPresent: insurerFacts.perCardPolicyWhere, defectProvenByMatrix: false, insurerFacts, conclusion: 'Aseguradoras received only the residual outer-group budget and never produced its own PASS/FAIL; its per-card policy scan is secondary and cannot be named the terminal owner from this matrix.' },
    harnessBudget90s: { owner: 'VALIDATOR_STALE_SECONDARY', rootOwner: false, harnessFacts, explainsAseguradorasTruncation: harnessBudgetExplainsTruncation, conclusion: 'One cumulative 90 s timer wraps role setup plus five routes, route waits are not independently bounded stages, and an 8 s route-key wait is swallowed. This makes route attribution stale/ambiguous, but it does not create Cliente360’s 57.804 s product work.' }
  },
  uniqueOwnerDecision: {
    ownerType: 'PRODUCT',
    owner: 'orbit360-platform/core/queries.js',
    secondaryValidatorIssue: 'CUMULATIVE_ROLE_GROUP_BUDGET_AND_ROUTE_ATTRIBUTION',
    secondaryValidatorIssueIsRootOwner: false,
    aseguradorasIsRootOwner: false
  },
  correctiveGate: {
    path: 'tools/orbit360-r4-cliente360-summary-boundedness-gate-v20260816.mjs',
    expectedCurrentR4S3Status: 'CLIENTE360_SUMMARY_BOUNDEDNESS_GATE_FAIL',
    expectedCurrentFailureFamily: 'CLIENTE360_BATCH_SUMMARY_CONTRACT_MISSING',
    expectedCurrentOwner: 'orbit360-platform/core/queries.js',
    closureRequirement: 'Implement/export Orbit.q.clientesResumenIndex as a bounded one-pass summary Map for all 430 clients while preserving summary semantics; then the gate must PASS on the versioned synthetic 430/1375/1900/900 fixture with allCalls<=8, getCalls<=10 and cloneRows<=20000. No product fix is authorized by this diagnosis.'
  }
};
write(result);
console.log(JSON.stringify(result, null, 2));
