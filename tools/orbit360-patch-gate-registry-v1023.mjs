#!/usr/bin/env node
import fs from 'node:fs';

const REGISTRY = 'tools/orbit360-gate-contract-registry-v20260717.json';
const DOC = 'orbit360-platform/docs/BLOQUE1-CAUSA-RAIZ-PWA-CONTROL-RUNTIME-SIGNALS-20260718.md';
const HELPER = 'tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs';
const RUNTIME = 'tools/orbit360-gate-runtime-crm-v20260716.mjs';
const PATCH = 'tools/orbit360-patch-external-contract-observer-v1023.mjs';
const SELF = 'tools/orbit360-patch-gate-registry-v1023.mjs';
const WORKFLOW = '.github/workflows/orbit360-apply-external-contract-observer-v1023.yml';
const GATE_ID = 'block1-client360-insurers-lab-v20260717';

function requireState(condition, code) {
  if (!condition) throw new Error(code);
}

const unique = values => [...new Set([].concat(values || []))];
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const gate = [].concat(registry.gates || []).find(item => item.gateId === GATE_ID);
requireState(gate, 'GATE_NOT_FOUND');
requireState(gate.contractVersion === '1.0.22', 'UNEXPECTED_SOURCE_CONTRACT:' + gate.contractVersion);

gate.contractVersion = '1.0.23';
gate.diagnosticRevision = 'external-only-contract-observer-v1';
gate.status = 'ACTIVE_PIPELINE_MECHANISM_FIX';
gate.diagnosticRule = 'Observe PWA, Router and runtime contracts only through browser-external requests, responses, requestfinished events, console runtime signals and Debugger parse events. Never accumulate uncancelled Runtime.evaluate calls while waiting for the same page thread to execute a contract.';
gate.executionBudget.evidence = {
  sourceContractVersion: '1.0.22',
  passedStages: [
    'canonical_auth_ui_ready',
    'canonical_owner_handoff_ready',
    'canonical_pwa_controller_ready',
    'canonical_runtime_scripts_syntax_ready',
    'canonical_runtime_contract_loader_started',
    'canonical_client_projection_ready'
  ],
  failedStage: 'canonical_tenant_insurer_core_ready',
  tenantCoreRequestedSignal: true,
  tenantCoreHttpStatus: 200,
  tenantCoreRequestFinished: true,
  tenantCoreStaticSyntax: true,
  tenantCoreBrowserParsed: false,
  tenantCoreLoadedSignal: false,
  nextContractRequested: false,
  runtimeOwnerDiagnostic: 'evaluationTimeout:true',
  pageErrors: 0,
  mechanismFinding: 'waitForRuntimeContractOwner launched a new page.evaluate every 250 ms after Promise.race returned its one-second timeout. The timed-out evaluations were not cancelled. The client projection, PWA, Router and loader observers used the same pattern, allowing a backlog of Runtime.evaluate commands to compete with the page thread that needed to execute the downloaded contract.'
};
gate.executionBudget.interpretation = 'Product code remains frozen at the architecturally valid 1.0.22 Router ownership fix. Version 1.0.23 changes only the gate observer and preserves the 900000 ms watchdog, the 450000 ms client projection budget and every existing fail-closed condition.';
gate.executionBudget.exhaustionPolicy = 'Execute 1.0.23 once after GO_GATE_CONTRACT. If canonical_tenant_insurer_core_ready fails again, stop all retries and inspect only browser-external requests, responses, requestfinished events, runtime signals and Debugger parse evidence. Do not add page evaluators or modify product, Store, Auth, Router, data, rules or renderers.';
gate.executionBudget.acceptancePolicy = 'Only a sanitized result with ok:true closes M1.';
gate.executionBudget.externalObserverPollingMs = 100;
gate.executionBudget.runtimeEvaluateBacklogAllowed = 0;

gate.reconciliation = {
  date: '2026-07-18',
  classifications: ['PIPELINE_MECHANISM_FAILURE'],
  scope: 'Bootstrap observer and runtime-contract readiness mechanism only',
  rootCause: 'Promise.race bounded the caller but did not cancel page.evaluate. Repeated polling accumulated unresolved Runtime.evaluate commands on the same browser thread that had to execute the runtime contracts. The validator could therefore create or amplify the starvation it reported.',
  corrections: [
    'freeze product at the accepted 1.0.22 Router ownership and async contract queue correction',
    'remove repeated page.evaluate fallbacks from PWA, Router, loader-start, client-projection and runtime-owner observers',
    'use only browser-external requests, responses, requestfinished, runtime signals and Debugger parse evidence for bootstrap contracts',
    'retain fail-closed behavior for terminal signals, script parse failures, runtime exceptions and page errors',
    'derive bootstrap stability from previously approved milestones plus router-ready signal',
    'preserve watchdog and all stage budgets without extension',
    'run the binding preflight first and the same gate once'
  ],
  openEvidence: ['1.0.23 sanitized ok:true across Dirección desktop, Operativo tablet and Asesor móvil'],
  preserved: [
    'Orbit.store API',
    'core/auth.js',
    'core/router.js 1.0.22 ownership fix',
    'backend-lab-canonical-view-sync 1.0.22 ownership fix',
    'Firestore rules',
    'Cliente 360 renderer',
    'Aseguradoras renderer',
    '414 clientes',
    '26 aseguradoras',
    '7 asesores'
  ]
};

registry.retiredRuntimeArtifacts = unique(registry.retiredRuntimeArtifacts.concat([PATCH, SELF, WORKFLOW]));

function contract(path) {
  const item = [].concat(gate.runtimeVersionContracts || []).find(entry => entry.path === path);
  requireState(item, 'RUNTIME_CONTRACT_ENTRY_MISSING:' + path);
  return item;
}

const runtimeContract = contract(RUNTIME);
runtimeContract.requiredTokens = unique(runtimeContract.requiredTokens.map(token =>
  token === "contractVersion:'1.0.22'" ? "contractVersion:'1.0.23'" :
  token === 'orbit360-runtime-gate-joint-v22-router-owned-contract-queue' ? 'orbit360-runtime-gate-joint-v23-external-contract-observer' : token
));

const helperContract = contract(HELPER);
helperContract.requiredTokens = [
  'installBootstrapDiagnostics',
  'waitForRuntimeContractOwner',
  "code + '_EXTERNAL_EVIDENCE_MISSING'",
  'canonical_url_ready',
  'CANONICAL_INDEX_NOT_REACHED',
  'canonical_backend_runtime_ready',
  'canonical_auth_provider_ready',
  'canonical_auth_ui_ready',
  'canonical_owner_handoff_ready',
  'canonical_runtime_contract_loader_started',
  'RUNTIME_CONTRACT_LOADER_EXTERNAL_EVIDENCE_MISSING',
  'CLIENT_PROJECTION_READY_BUDGET_MS = 450000',
  'CLIENT_PROJECTION_DIAGNOSTIC_RESERVE_MS = 10000',
  'canonical_client_projection_ready: CLIENT_PROJECTION_READY_BUDGET_MS',
  'waitForClientProjectionEvidence',
  'CLIENT_PROJECTION_EXTERNAL_EVIDENCE_MISSING',
  "marker: 'data-orbit-tenant-insurer-config-core-v20260717'",
  "marker: 'data-orbit-tenant-runtime-index-v20260717'",
  "marker: 'data-orbit-tenant-insurer-config-active-v20260717'",
  'canonical_router_start_ready',
  'canonical_bootstrap_stable',
  'BOOTSTRAP_ROUTER_SIGNAL_MISSING',
  'bootstrapTransportDiagnostic',
  'stack: sanitizeDiagnostic',
  'preAuthAccessFailClosed',
  'contractRequests',
  'contractFinished',
  'contractResponses',
  'runtimeSignals',
  'waitForPwaController',
  'PWA_CONTROLLER_EXTERNAL_EVIDENCE_MISSING',
  'waitForRouterSignal',
  'ROUTER_READY_EXTERNAL_EVIDENCE_MISSING',
  'nextPathPattern',
  'canonical_pwa_controller_ready',
  'waitForOwnerHandoffEvidence',
  'ownerHandoffDiagnostic',
  'storeOwnerScriptParsed',
  'routerOwnerScriptParsed',
  'authOwnerScriptParsed',
  'inlineInitOrderEstablished',
  'OWNER_HANDOFF_EXTERNAL_EVIDENCE_MISSING',
  'waitForAuthUiEvidence',
  'authUiDiagnostic',
  'routerContractProgressObserved',
  'canonicalInitOrderEstablished',
  'AUTH_UI_EXTERNAL_EVIDENCE_MISSING',
  'AUTH_UI_OWNER_SCRIPT_PARSE_FAILED',
  'AUTH_UI_PAGE_ERROR',
  "const bootstrapDocumentToken = 'browser-external-evidence-v1'"
];

fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + '\n', 'utf8');

let doc = fs.readFileSync(DOC, 'utf8');
requireState(!doc.includes('## Reconciliación 1.0.23'), 'DOC_1023_ALREADY_PRESENT');
doc += `

## Reconciliación 1.0.23 · observador externo sin backlog

Clasificación: PIPELINE_MECHANISM_FAILURE.

La versión 1.0.22 conservó el avance de PWA, Auth UI, handoff, sintaxis, loader y proyección de 414 clientes. El contrato core de aseguradoras volvió a responder HTTP 200 y a finalizar su descarga, pero el diagnóstico del owner terminó como evaluationTimeout. La revisión del gate encontró que cada timeout de Promise.race liberaba al bucle sin cancelar el page.evaluate subyacente; el bucle lanzaba otra evaluación cada 250 ms. La cola acumulada competía con el mismo hilo de navegador que debía ejecutar el contrato.

La 1.0.23 congela producto y reemplaza únicamente observadores del gate. PWA, inicio del loader, proyección, owners runtime, Router y estabilidad del bootstrap se prueban mediante eventos externos: request, response, requestfinished, señales ORBIT360_RUNTIME_SIGNAL y Debugger.scriptParsed/scriptFailedToParse. No se acumulan evaluaciones dentro de la página. Se mantiene fail-closed ante señales terminales, errores de parseo, excepciones o pageErrors.

Carriles:
- A: Cliente 360 y Aseguradoras preservados; no cambian renderers ni UX.
- B: solo helper del gate, ejecutor, registro y evidencia; Store, Auth, Router 1.0.22 y reglas preservados.
- C: 414 clientes, 26 aseguradoras y 7 asesores sin reimportación ni escritura.

Claude: BACKEND_PROTEGIDO_NO_CLAUDE. Patrón reusable acumulado: un timeout de Promise.race no cancela Runtime.evaluate; los observadores de bootstrap deben usar señales externas o cancelar explícitamente su trabajo.

Academia: documentar la diferencia entre limitar la espera del caller y cancelar la operación subyacente, y cómo un validador puede causar la inanición que intenta medir.

Salida: preflight vinculante primero; mismo gate una sola vez; cierre exclusivamente con evidencia sanitizada ok:true.
`;
fs.writeFileSync(DOC, doc, 'utf8');

console.log(JSON.stringify({
  ok: true,
  gateId: GATE_ID,
  contractVersion: gate.contractVersion,
  classification: gate.reconciliation.classifications[0],
  changed: [REGISTRY, DOC]
}, null, 2));
