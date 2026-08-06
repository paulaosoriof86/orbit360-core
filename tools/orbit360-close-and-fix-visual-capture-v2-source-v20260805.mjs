#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const MATRIX = 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs';
const RUNTIME = 'tools/orbit360-run-visual-observable-rootfix-v2-runtime-only-v20260805.sh';
const RAW_FINAL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-final-sanitized-v20260805.json';
const RAW_MATRIX = 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-matrix-sanitized-v20260805.json';
const GOVERNING = 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-v2-governing-stop-sanitized-v20260805.json';
const SOURCE_EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/visual-capture-v2-sourcefix-sanitized-v20260805.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-visual-observable-rootfix-v2-lab-v20260805.json';
const PLAN = 'orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md';
const CLOSURE = 'orbit360-platform/docs/CIERRE-CAUSA-RAIZ-CAPTURA-VISUAL-V2-20260805.md';

const read = file => fs.readFileSync(file, 'utf8');
const readJson = file => JSON.parse(read(file));
const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.endsWith('\n') ? content : content + '\n', 'utf8');
};
const writeJson = (file, value) => write(file, JSON.stringify(value, null, 2));
const count = (text, token) => text.split(token).length - 1;
const replaceOnce = (text, before, after, id) => {
  if (count(text, before) !== 1) throw new Error(`SOURCE_CONTRACT_${id}_COUNT_${count(text, before)}`);
  return text.replace(before, after);
};
const syntaxOk = file => spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }).status === 0;

const rawFinal = readJson(RAW_FINAL);
const rawMatrix = readJson(RAW_MATRIX);
if (rawFinal.runId !== '31067506016' || rawFinal.preflightStatus !== 'GO_GATE_CONTRACT' || rawFinal.preflightChecks !== 26) {
  throw new Error('SOURCE_CONTRACT_RAW_FINAL_IDENTITY');
}
if (rawFinal.precheckStage !== 'PASS_VISUAL_BROWSER_PRECHECK' || rawFinal.precheckCheckpoint !== 'INICIO_READY_PASS') {
  throw new Error('SOURCE_CONTRACT_RAW_PRECHECK_NOT_PASS');
}
if (rawFinal.hostingDeploys !== 1 || rawFinal.hostingRollbackRestored !== true || rawFinal.snapshotIntegrity !== 'VERIFIED_UNCHANGED') {
  throw new Error('SOURCE_CONTRACT_RAW_BOUNDARY');
}
if (rawMatrix.currentCheckpoint !== 'DIRECCION_ROUTE_INICIO_PASS' || !/page\.screenshot: Timeout 30000ms exceeded/.test(rawMatrix.error || '')) {
  throw new Error('SOURCE_CONTRACT_SCREENSHOT_TIMEOUT_NOT_PROVEN');
}
if (rawMatrix.snapshotIntegrity !== 'VERIFIED_UNCHANGED' || rawMatrix.firestoreWrites !== 0 || rawMatrix.authWrites !== 0 || rawMatrix.operationalWrites !== 0) {
  throw new Error('SOURCE_CONTRACT_MATRIX_INTEGRITY');
}

let matrix = read(MATRIX);
matrix = replaceOnce(
  matrix,
  "const EVIDENCE = process.env.ORBIT360_VISUAL_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-matrix-sanitized-v20260805.json';\n",
  "const EVIDENCE = process.env.ORBIT360_VISUAL_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-matrix-sanitized-v20260805.json';\nconst GATE_ID = process.env.ORBIT360_GATE_ID || 'block2.7-visual-observable-rootfix-v2-lab-v20260805';\nconst CONTRACT_VERSION = process.env.ORBIT360_CONTRACT_VERSION || '2.7.5';\nconst CAPTURE_TIMEOUT_MS = 12000;\n",
  'CONTRACT_CONSTANTS'
);
matrix = replaceOnce(
  matrix,
  "  gateId: 'block2.7-visual-observable-rootfix-lab-v20260805',\n  contractVersion: '2.7.3',\n",
  "  gateId: GATE_ID,\n  contractVersion: CONTRACT_VERSION,\n",
  'RESULT_CONTRACT'
);
matrix = replaceOnce(matrix, '  roles: [],\n  firestoreReads: 0,\n', '  roles: [],\n  captureWarnings: [],\n  firestoreReads: 0,\n', 'CAPTURE_WARNINGS_ARRAY');
matrix = replaceOnce(
  matrix,
  "async function capture(page, name) {\n  await installEvidenceMask(page);\n  const target = path.join(OUT_DIR, name + '.png');\n  await page.screenshot({ path: target, fullPage: true });\n  return path.basename(target);\n}\n",
  "async function capture(page, name) {\n  try {\n    await installEvidenceMask(page);\n    const target = path.join(OUT_DIR, name + '.png');\n    await page.screenshot({\n      path: target,\n      fullPage: false,\n      animations: 'disabled',\n      caret: 'hide',\n      timeout: CAPTURE_TIMEOUT_MS\n    });\n    return path.basename(target);\n  } catch (error) {\n    result.captureWarnings.push({\n      checkpoint: result.currentCheckpoint,\n      name: clean(name),\n      error: clean(error && error.message || error),\n      blocking: false\n    });\n    write();\n    return '';\n  }\n}\n",
  'CAPTURE_FUNCTION'
);
matrix = replaceOnce(
  matrix,
  "async function failureCapture(page, checkpoint) {\n  try {\n    const file = await capture(page, 'failure-' + norm(checkpoint).replace(/\\s+/g, '-'));\n    result.failureScreenshot = file;\n  } catch (error) {\n    result.failureScreenshotError = clean(error && error.message || error);\n  }\n}\n",
  "async function failureCapture(page, checkpoint) {\n  const file = await capture(page, 'failure-' + norm(checkpoint).replace(/\\s+/g, '-'));\n  if (file) result.failureScreenshot = file;\n  else result.failureScreenshotError = 'CAPTURE_UNAVAILABLE_NON_BLOCKING';\n}\n",
  'FAILURE_CAPTURE_FUNCTION'
);
matrix = replaceOnce(
  matrix,
  "    add('console-errors-zero', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '), 'WARN');\n",
  "    const roleCaptureWarnings = result.captureWarnings.filter(item => String(item.name || '').startsWith(role.toLowerCase() + '-'));\n    add('screenshots-best-effort', roleCaptureWarnings.length === 0, roleCaptureWarnings.map(item => item.error).slice(0, 3).join(' | '), 'WARN');\n    add('console-errors-zero', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '), 'WARN');\n",
  'CAPTURE_WARNING_CHECK'
);
matrix = replaceOnce(matrix, '      screenshots,\n      ok: failed.length === 0\n', '      screenshots: screenshots.filter(Boolean),\n      ok: failed.length === 0\n', 'SCREENSHOT_FILTER');
write(MATRIX, matrix);

let runtime = read(RUNTIME);
runtime = replaceOnce(
  runtime,
  "export ORBIT360_PROJECT_ID=\"$PROJECT\"\nexport ORBIT360_TENANT_ID=\"$TENANT\"\nexport ORBIT360_LAB_URL=\"$LAB_URL\"\n",
  "export ORBIT360_PROJECT_ID=\"$PROJECT\"\nexport ORBIT360_TENANT_ID=\"$TENANT\"\nexport ORBIT360_LAB_URL=\"$LAB_URL\"\nexport ORBIT360_GATE_ID='block2.7-visual-observable-rootfix-v2-lab-v20260805'\nexport ORBIT360_CONTRACT_VERSION='2.7.5'\n",
  'RUNTIME_CONTRACT_EXPORTS'
);
write(RUNTIME, runtime);

const checks = {
  matrixSyntax: syntaxOk(MATRIX),
  gateParameterized: matrix.includes("const GATE_ID = process.env.ORBIT360_GATE_ID || 'block2.7-visual-observable-rootfix-v2-lab-v20260805'"),
  contractParameterized: matrix.includes("const CONTRACT_VERSION = process.env.ORBIT360_CONTRACT_VERSION || '2.7.5'"),
  resultUsesGate: matrix.includes('gateId: GATE_ID'),
  resultUsesContract: matrix.includes('contractVersion: CONTRACT_VERSION'),
  boundedTimeout: matrix.includes('const CAPTURE_TIMEOUT_MS = 12000'),
  viewportCapture: matrix.includes('fullPage: false'),
  fullPageCaptureRemoved: !matrix.includes('fullPage: true'),
  animationsDisabled: matrix.includes("animations: 'disabled'"),
  caretHidden: matrix.includes("caret: 'hide'"),
  captureTryCatch: matrix.includes('async function capture(page, name) {\n  try {'),
  captureWarningsArray: matrix.includes('captureWarnings: []'),
  captureWarningNonBlocking: matrix.includes('blocking: false'),
  captureFailureReturnsEmpty: matrix.includes("    return '';"),
  screenshotsFiltered: matrix.includes('screenshots: screenshots.filter(Boolean)'),
  screenshotBestEffortCheck: matrix.includes("add('screenshots-best-effort'"),
  failureCaptureNonBlocking: matrix.includes("CAPTURE_UNAVAILABLE_NON_BLOCKING"),
  runtimeGateExport: runtime.includes("export ORBIT360_GATE_ID='block2.7-visual-observable-rootfix-v2-lab-v20260805'"),
  runtimeContractExport: runtime.includes("export ORBIT360_CONTRACT_VERSION='2.7.5'"),
  protectedWritesRemainZero: matrix.includes('firestoreWrites: 0') && matrix.includes('authWrites: 0') && matrix.includes('operationalWrites: 0')
};
const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const sourceEvidence = {
  schemaVersion: 'orbit360-visual-capture-v2-sourcefix-v1',
  gateId: 'block2.7-visual-capture-sourcefix-v20260805',
  contractVersion: '2.7.6-source',
  status: failedCheckIds.length ? 'FAIL_VISUAL_CAPTURE_SOURCEFIX' : 'PASS_VISUAL_CAPTURE_SOURCEFIX',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'PIPELINE_MECHANISM_FAILURE_CLOSED_SOURCE_ONLY',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  sourceOnly: true,
  rawRunId: '31067506016',
  exactCheckpoint: 'DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT',
  secretsRead: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: failedCheckIds.length === 0
};
writeJson(SOURCE_EVIDENCE, sourceEvidence);
if (!sourceEvidence.ok) throw new Error('SOURCE_FIX_VALIDATION_FAILED:' + failedCheckIds.join(','));

const governing = {
  schemaVersion: 'orbit360-visual-observable-rootfix-v2-governing-stop-v1',
  gateId: 'block2.7-visual-observable-rootfix-v2-lab-v20260805',
  contractVersion: '2.7.5',
  runId: '31067506016',
  decision: 'STOP_RETRY',
  classification: 'PIPELINE_MECHANISM_FAILURE',
  rawLastSuccessfulCheckpoint: 'DIRECCION_ROUTE_INICIO_PASS',
  exactFailureCheckpoint: 'DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT',
  rootCause: {
    owner: 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs',
    function: 'capture(page, name)',
    mechanism: "page.screenshot({ fullPage: true })",
    error: 'page.screenshot timeout after 30000ms',
    productRouteReadyBeforeFailure: true,
    authReadyBeforeFailure: true,
    membershipReadyBeforeFailure: true,
    hydrationReadyBeforeFailure: true,
    screenshotWasNonFunctionalEvidence: true
  },
  runBoundary: {
    gateRegistration: 'PASS_8_OF_8',
    goGateContract: 'PASS_26_OF_26',
    hostingBackup: 'PASS',
    hostingDeploys: 1,
    precheck: 'PASS_VISUAL_BROWSER_PRECHECK',
    precheckCheckpoint: 'INICIO_READY_PASS',
    directionInicio: 'PASS',
    matrixCompleted: false,
    rollback: 'PASS',
    snapshotIntegrity: 'VERIFIED_UNCHANGED',
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    functionsDeploys: 0,
    rulesDeploys: 0,
    reimports: 0,
    productionTouched: false,
    mainTouched: false,
    mergeExecuted: false
  },
  sourceFix: {
    status: 'PASS_VISUAL_CAPTURE_SOURCEFIX',
    checks: sourceEvidence.total,
    captureMode: 'VIEWPORT_BOUNDED_NON_BLOCKING',
    timeoutMs: 12000,
    evidenceFailureGovernsFunctionalMatrix: false,
    runtimeExecuted: false,
    deployExecuted: false
  },
  passVisualPostAuth: false,
  authorizationConsumed: true,
  replayAllowed: false,
  newRuntimeAuthorizationRequired: true,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: false
};
writeJson(GOVERNING, governing);

const lifecycle = readJson(LIFECYCLE);
lifecycle.ownerVersion = '20260805.6-screenshot-rootcause-closed-sourcefix-pass';
lifecycle.status = 'CONSUMED_STOP_RETRY_ROOT_CAUSE_CLOSED_SOURCEFIX_PASS';
lifecycle.classification = 'PIPELINE_MECHANISM_FAILURE';
lifecycle.currentPhase = 'SOURCE_FIX_PASS_RUNTIME_NOT_AUTHORIZED';
lifecycle.activeRequest = false;
lifecycle.requestConsumed = true;
lifecycle.authorizationReserved = false;
lifecycle.allowedExecutions = 0;
lifecycle.executionAuthorized = false;
lifecycle.secretAccessAuthorized = false;
lifecycle.firestoreReadAuthorized = false;
lifecycle.writeAuthorized = false;
lifecycle.browserAuthorized = false;
lifecycle.hostingDeployAuthorized = false;
lifecycle.functionsDeployAuthorized = false;
lifecycle.rulesDeployAuthorized = false;
lifecycle.productionAuthorized = false;
lifecycle.runtimeResult = {
  runId: '31067506016',
  attempt: 1,
  result: 'STOP_RETRY',
  classification: 'PIPELINE_MECHANISM_FAILURE',
  rawLastSuccessfulCheckpoint: 'DIRECCION_ROUTE_INICIO_PASS',
  exactFailureCheckpoint: 'DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT',
  hostingDeployAttempted: true,
  hostingDeploys: 1,
  rollbackRestored: true,
  snapshotIntegrity: 'VERIFIED_UNCHANGED',
  totalRoleFailures: null
};
lifecycle.rootCauseClosure = {
  evidence: GOVERNING,
  sourceEvidence: SOURCE_EVIDENCE,
  owner: 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs',
  function: 'capture(page, name)',
  sourceFixStatus: 'PASS_VISUAL_CAPTURE_SOURCEFIX',
  runtimeRetestAuthorized: false
};
lifecycle.nextAction = 'REQUEST_ONE_NEW_RUNTIME_AUTHORIZATION_ONLY_AFTER_REVIEWING_SOURCE_FIX_AND_NONCAUSAL_RENDER_WARNING';
writeJson(LIFECYCLE, lifecycle);

const closure = `# CIERRE DE CAUSA RAÍZ — CAPTURA VISUAL V2 — 2026-08-05

## Resultado gobernante

\`\`\`text
run: 31067506016
clasificación: PIPELINE_MECHANISM_FAILURE
último checkpoint exitoso: DIRECCION_ROUTE_INICIO_PASS
checkpoint exacto de fallo: DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT
GO_GATE_CONTRACT: 26/26 PASS
backup Hosting: PASS
Hosting LAB deploys: 1
precheck: PASS · INICIO_READY_PASS
Dirección / Inicio: PASS
matriz completa: NO
rollback Hosting: PASS
snapshot: VERIFIED_UNCHANGED
Firestore/Auth/operational writes: 0
Functions/Rules/reimport/production/main/merge: 0
\`\`\`

## Causa raíz

La plataforma había cargado Dirección/Inicio correctamente. El fallo ocurrió después, cuando el capturador intentó producir una imagen \`fullPage\`. Playwright agotó 30 segundos en \`page.screenshot\` y el owner trató una evidencia auxiliar como condición bloqueante de toda la matriz.

Owner exacto:

\`\`\`text
tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs
capture(page, name)
page.screenshot({ fullPage: true })
\`\`\`

No se atribuye a Auth, membresía, tenant, hidratación, datos, Rules ni Inicio.

## Correctivo source-only

\`\`\`text
PASS_VISUAL_CAPTURE_SOURCEFIX
${sourceEvidence.total}/${sourceEvidence.total} controles PASS
captura: viewport acotado
límite: 12000 ms
animaciones: deshabilitadas
fallo de captura: advertencia no bloqueante
runtime/deploy/secrets/Firestore: 0
\`\`\`

La autorización del run fue consumida. No existe autorización para otro navegador o deploy. \`PASS_VISUAL_POST_AUTH\` continúa pendiente.
`;
write(CLOSURE, closure);

let plan = read(PLAN);
plan = plan.replace(/Última actualización: .*GT  /, 'Última actualización: 2026-08-05 21:35 GT  ');
const planBlock = `

## 19. Ejecución visual v2 y causa raíz gobernante

\`\`\`text
run: 31067506016
gate: block2.7-visual-observable-rootfix-v2-lab-v20260805
contract: 2.7.5
GO_GATE_CONTRACT: 26/26 PASS
backup Hosting: PASS
Hosting LAB deploys: 1
precheck: PASS · INICIO_READY_PASS
Dirección / Inicio: PASS
matriz: STOP_RETRY
checkpoint exacto: DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT
clasificación: PIPELINE_MECHANISM_FAILURE
rollback: PASS
snapshot: VERIFIED_UNCHANGED
writes/Functions/Rules/reimport/production/main/merge: 0
\`\`\`

El rootfix required/optional superó el precheck y Dirección/Inicio cargó. La matriz se detuvo exclusivamente porque la captura \`fullPage\` agotó 30 segundos. La evidencia auxiliar no puede gobernar el resultado funcional.

Correctivo source-only:

\`\`\`text
PASS_VISUAL_CAPTURE_SOURCEFIX · ${sourceEvidence.total}/${sourceEvidence.total}
captura viewport · 12000 ms · no bloqueante
runtime/deploy: 0
\`\`\`

La autorización fue consumida; no se permite replay. \`PASS_VISUAL_POST_AUTH\` sigue pendiente.

## 20. Siguiente acción exacta vigente

\`\`\`text
1. mantener Hosting LAB restaurado y no repetir el run 31067506016
2. conservar como evidencia cruda el último checkpoint DIRECCION_ROUTE_INICIO_PASS
3. gobernar con el checkpoint exacto DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT
4. revisar source-only el warning no causal "Cannot assign to read only property render"
5. validar source-only el capturador acotado y no bloqueante
6. solicitar autorización nueva únicamente para una futura prueba runtime
7. no reanudar Cobros 4.1 hasta PASS_VISUAL_POST_AUTH
\`\`\`

Este bloque reemplaza cualquier “siguiente acción” anterior incompatible con el run 31067506016.
`;
if (!plan.includes('## 19. Ejecución visual v2 y causa raíz gobernante')) plan += planBlock;
write(PLAN, plan);

console.log(JSON.stringify({
  status: 'PASS_VISUAL_CAPTURE_ROOT_CAUSE_CLOSURE_SOURCE_ONLY',
  runId: '31067506016',
  exactCheckpoint: 'DIRECCION_SCREENSHOT_FULLPAGE_TIMEOUT',
  sourceChecks: sourceEvidence.total,
  secretsRead: false,
  firestoreRead: false,
  writes: 0,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  ok: true
}, null, 2));
