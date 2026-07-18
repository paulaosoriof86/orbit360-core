#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const patchPath = 'tools/orbit360-patch-controlled-pwa-runtime-signals-v20260718.mjs';
const registryPath = 'tools/orbit360-gate-contract-registry-v20260717.json';
const docPath = 'orbit360-platform/docs/BLOQUE1-CAUSA-RAIZ-PWA-CONTROL-RUNTIME-SIGNALS-20260718.md';
const closeScriptPath = 'tools/orbit360-close-controlled-pwa-runtime-signals-v20260718.mjs';
const workflowPath = '.github/workflows/orbit360-apply-controlled-pwa-runtime-signals-v20260718.yml';
const gateId = 'block1-client360-insurers-lab-v20260717';

function requireState(condition, code) {
  if (!condition) throw new Error(code);
}

function unique(values) {
  return [...new Set(values)];
}

requireState(fs.existsSync(patchPath), 'PATCH_SCRIPT_MISSING');
requireState(fs.existsSync(registryPath), 'GATE_REGISTRY_MISSING');

const patch = spawnSync(process.execPath, [patchPath], { encoding: 'utf8' });
if (patch.status !== 0) {
  process.stderr.write(patch.stdout || '');
  process.stderr.write(patch.stderr || '');
  process.exit(patch.status || 1);
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const gate = registry.gates.find(item => item.gateId === gateId);
requireState(gate, 'GATE_NOT_FOUND');
requireState(gate.contractVersion === '1.0.18', 'UNEXPECTED_SOURCE_CONTRACT:' + gate.contractVersion);

const pwaOwner = registry.canonicalOwners.find(item => item.id === 'pwa');
const routerOwner = registry.canonicalOwners.find(item => item.id === 'router');
requireState(pwaOwner && routerOwner, 'CANONICAL_OWNER_MISSING');
pwaOwner.requiredTokens = unique(pwaOwner.requiredTokens.concat([
  'waitForWorkerControl',
  'OrbitPwaWorkerState',
  'controllerMatches',
  'pwa-controller:'
]));
routerOwner.requiredTokens = unique(routerOwner.requiredTokens.concat([
  'runtimeSignal',
  'OrbitPwaWorkerReady',
  "runtimeSignal('router-ready', '1')",
  "runtimeSignal('pwa-ready', status)"
]));

registry.retiredRuntimeArtifacts = unique(registry.retiredRuntimeArtifacts.concat([
  patchPath,
  closeScriptPath,
  workflowPath
]));

gate.contractVersion = '1.0.19';
gate.diagnosticRevision = 'controlled-pwa-external-runtime-signals-v1';
gate.status = 'ACTIVE_ROOT_CAUSE_FIX';
gate.diagnosticRule = 'Require the current Service Worker to control the page before Router runtime contracts start, expose contract transitions outside the congested page evaluator, and accept owner progression only from functional readiness, terminal Router state, explicit runtime signal or the next canonical contract request.';

gate.executionBudget.workerControlTimeoutMs = 10000;
gate.executionBudget.pwaControllerGateMs = 22000;
gate.executionBudget.routerSignalWaitMs = 24000;
gate.executionBudget.evidence = {
  sourceContractVersion: '1.0.18',
  projectionStagePassed: true,
  tenantCoreResponseObserved: true,
  tenantCoreResponseStatus: 200,
  tenantCoreFromServiceWorker: true,
  tenantCoreRequestFinished: true,
  tenantCoreParseObserved: true,
  tenantCoreOwnerPresent: true,
  tenantCoreOwnerGetPresent: true,
  tenantRuntimeIndexRequestStarted: true,
  routerRuntimeContractsCaptured: false,
  routePresentAtDiagnostic: false,
  failedStage: 'canonical_tenant_insurer_core_ready',
  firstError: 'PIPELINE_STEP_TIMEOUT:canonical_tenant_insurer_core_ready',
  watchdogExceeded: false,
  derivation: 'Contract 1.0.18 corrected the Service Worker event lifetime: the tenant core returned HTTP 200, the request completed and the browser parsed the script. The same artifact also observed the canonical owner and its get/register API, plus the next tenant runtime index request. The gate nevertheless expired because repeated page.evaluate calls could remain unresolved while Router state was not externally observable, and the page was not required to be controlled by the newly activated worker before Router began loading contracts. The remaining blocker is therefore the bootstrap/observation mechanism, not Cliente 360, Aseguradoras, Firestore counts or the canonical projection.'
};
gate.executionBudget.interpretation = 'The global watchdog remains 900000 ms and canonical_client_projection_ready remains 450000 ms. Contract 1.0.19 does not increase acceptance thresholds; it makes the current PWA controller and Router contract transitions observable and bounded.';
gate.executionBudget.exhaustionPolicy = 'If contract 1.0.19 fails, do not retry, create another patch or modify another module. Diagnose only the first failureStage together with pwa controller state, runtimeSignals, contractRequests, contractFinished, runtimeOwnerDiagnostics and routerRuntimeContracts from the same sanitized artifact.';
gate.executionBudget.acceptancePolicy = 'Only a sanitized result with ok:true closes the gate.';

gate.reconciliation = {
  date: '2026-07-18',
  classifications: ['PIPELINE_MECHANISM_FAILURE'],
  scope: 'PWA controller handoff and externally observable Router runtime-contract progression',
  rootCause: 'The product contract was already present and parsed, but the gate depended mainly on page.evaluate while the page bootstrap could be congested and Router state was not externally signaled. In addition, activation of a new Service Worker was awaited without proving that the same worker controlled the current page before Router requested runtime contracts. This produced a false blocking symptom after the canonical owner and next request were already observed.',
  corrections: [
    'retain watchdog 900000 ms and canonical client projection budget 450000 ms',
    'preserve Service Worker synchronous waitUntil fix and authentication-gated Firestore snapshots',
    'support the dynamic tenant insurer configuration path in the runtime contract cache matcher',
    'record active/controller identity and require controlled PWA state before Router contract loading',
    'emit sanitized runtime signals for PWA, each contract transition and Router readiness',
    'record contract request-start and request-finished evidence separately',
    'bound every page.evaluate diagnostic with an external one-second timeout',
    'allow canonical progression evidence from the next contract request or explicit Router signal',
    'retain functional owner checks and fail on terminal error, timeout or no-source states',
    'remove temporary patch and workflow in the same closure commit',
    'execute the same gate once after GO_GATE_CONTRACT'
  ],
  openEvidence: ['contract 1.0.19 must produce sanitized ok:true and complete Dirección desktop, Operativo tablet and Asesor móvil in one execution'],
  preserved: ['Orbit.store API','Firestore rules','core/auth.js','core/legal.js','core/access-scope.js','auth-gated snapshots','Cliente 360 renderer','Aseguradoras renderer','414 clientes','26 aseguradoras','7 asesores']
};

gate.requiredFiles = unique(gate.requiredFiles.concat([docPath]));

function contract(path) {
  const item = gate.runtimeVersionContracts.find(entry => entry.path === path);
  requireState(item, 'RUNTIME_CONTRACT_ENTRY_MISSING:' + path);
  return item;
}

contract('orbit360-platform/sw.js').requiredTokens = unique(contract('orbit360-platform/sw.js').requiredTokens.concat([
  'tenant-[^/]+-insurers-p10'
]));
contract('orbit360-platform/core/pwa.js').requiredTokens = unique(contract('orbit360-platform/core/pwa.js').requiredTokens.concat([
  'waitForWorkerControl',
  'OrbitPwaWorkerState',
  'controllerMatches',
  'pwa-controller:'
]));
contract('orbit360-platform/core/router.js').requiredTokens = unique(contract('orbit360-platform/core/router.js').requiredTokens.concat([
  'runtimeSignal',
  "runtimeSignal('router-ready', '1')",
  "runtimeSignal('pwa-ready', status)",
  'window.OrbitPwaWorkerReady'
]));
contract('tools/orbit360-gate-runtime-crm-v20260716.mjs').requiredTokens = contract('tools/orbit360-gate-runtime-crm-v20260716.mjs').requiredTokens.map(token => token === "contractVersion:'1.0.18'" ? "contractVersion:'1.0.19'" : token);
contract('tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs').requiredTokens = unique(contract('tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs').requiredTokens.concat([
  'contractRequests',
  'contractFinished',
  'runtimeSignals',
  'waitForPwaController',
  'waitForRouterSignal',
  'nextPathPattern',
  'evaluationTimeout',
  'canonical_pwa_controller_ready'
]));

const doc = `# BLOQUE 1 · CAUSA RAÍZ Y CIERRE CONTROLADO 1.0.19\n\nFecha: 2026-07-18  \nGate: \\`${gateId}\\`  \nRama: \\`ays/backend-tenant-lab-v99-20260703\\`  \nPR: #5 draft/open  \nProducción: no autorizada\n\n## Clasificación\n\n\\`PIPELINE_MECHANISM_FAILURE\\`\n\nNo se clasificó como defecto funcional de Cliente 360 ni de Aseguradoras. El resultado 1.0.18 confirmó 414 clientes, 26 aseguradoras, 7 asesores, proyección canónica lista, respuesta HTTP 200, finalización y parseo del contrato de aseguradoras, y presencia del owner funcional.\n\n## Primera etapa real fallida\n\n\\`canonical_tenant_insurer_core_ready\\` con \\`PIPELINE_STEP_TIMEOUT\\`.\n\nEl artefacto observó simultáneamente:\n\n- owner canónico presente;\n- API funcional presente;\n- solicitud del siguiente contrato \\`tenant-runtime-config-index.js\\`;\n- ausencia de error de página;\n- Router no observable desde el evaluador al agotarse la etapa.\n\n## Causa raíz\n\nEl gate dependía de evaluaciones dentro de una página cuyo bootstrap podía estar congestionado y no exigía que el Service Worker recién activado controlara esa misma página antes de iniciar Router. Por eso podía existir progreso real sin que el evaluador devolviera la señal a tiempo.\n\n## Corrección 1.0.19\n\n1. Confirmar controlador PWA actual antes de cargar contratos runtime.\n2. Emitir señales sanitizadas de PWA, contratos y Router.\n3. Registrar por separado request, requestfinished, response y parse.\n4. Limitar cada evaluación del navegador con timeout externo.\n5. Reconocer transición canónica por owner funcional, señal explícita o solicitud del siguiente contrato.\n6. Mantener fail-closed ante estados terminales.\n7. Conservar watchdog global 900000 ms y presupuesto de proyección 450000 ms.\n\n## Carriles\n\n- Carril A: renderers de Cliente 360 y Aseguradoras preservados; no rediseño ni reimportación.\n- Carril B: corrección limitada a PWA, Router y observabilidad del gate; backend protegido y reglas preservados.\n- Carril C: se preservan 414 clientes, 26 aseguradoras y 7 asesores; no se escriben pólizas, vehículos, cobros ni cartera.\n\n## Claude y Academia\n\n- Clasificación Claude: \\`BACKEND_PROTEGIDO_NO_CLAUDE\\` para el mecanismo PWA/gate.\n- Patrón reusable: la UI solo debe renderizar estados funcionales cuando los owners canónicos estén listos; nunca mostrar copy técnico de bootstrap.\n- Academia: documentar la diferencia entre defecto funcional y fallo del pipeline/validador; no cambia contenido operativo visible hasta cerrar el gate.\n\n## Regla de salida\n\nEjecutar el mismo gate una sola vez después de \\`GO_GATE_CONTRACT\\`. Aceptar exclusivamente evidencia sanitizada con \\`ok:true\\`. Si falla 1.0.19, detener reintentos y diagnosticar únicamente la primera etapa real con la evidencia de esa corrida.\n`;

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n', 'utf8');
fs.writeFileSync(docPath, doc, 'utf8');

const requiredFiles = [
  'orbit360-platform/core/pwa.js',
  'orbit360-platform/core/router.js',
  'orbit360-platform/sw.js',
  'tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs',
  'tools/orbit360-gate-runtime-crm-v20260716.mjs',
  registryPath,
  docPath
];
for (const path of requiredFiles) requireState(fs.existsSync(path), 'OUTPUT_MISSING:' + path);

console.log(JSON.stringify({
  ok: true,
  gateId,
  contractVersion: gate.contractVersion,
  classification: gate.reconciliation.classifications[0],
  files: requiredFiles
}, null, 2));
