#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const VERSION = '12.0.9';
const GATE = 'block12-operational-runtime-lab-v20260804';
const VISUAL = 'tools/orbit360-block12-cumulative-visual-v20260804.mjs';
const RUNTIME = 'tools/orbit360-block12-operational-runtime-lab-v20260804.mjs';
const ROUTER = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const ENGINE = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs';
const REGISTRY = 'tools/orbit360-gate-contract-registry-v20260717.json';
const OUT = 'orbit360-platform/runtime-gate-crm-v20260716/block12-visual-rootfix-source-v20260804.json';

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(ROOT, rel), value, 'utf8');
const occurrences = (source, token) => source.split(token).length - 1;
const replaceOnce = (source, before, after, label) => {
  const found = occurrences(source, before);
  if (found !== 1) throw new Error(`PIPELINE_MECHANISM_FAILURE:${label}_EXPECTED_1_FOUND_${found}`);
  return source.replace(before, after);
};
const replaceLine = (source, marker, replacement, label) => {
  const lines = source.split('\n');
  const indexes = lines.map((line, index) => line.includes(marker) ? index : -1).filter(index => index >= 0);
  if (indexes.length !== 1) throw new Error(`PIPELINE_MECHANISM_FAILURE:${label}_EXPECTED_1_FOUND_${indexes.length}`);
  lines[indexes[0]] = replacement;
  return lines.join('\n');
};

const visual = read(VISUAL);
const visualChecks = {
  viewportCapture: visual.includes('fullPage: false'),
  animationsDisabled: visual.includes("animations: 'disabled'"),
  reducedMotion: visual.includes("reducedMotion: 'reduce'"),
  routeFailureCode: visual.includes('VISUAL_SCREENSHOT_${route}'),
  pageCloseFinally: visual.includes('if (page) await page.close().catch'),
  browserCloseFinally: visual.includes('if (browser) await browser.close().catch'),
  schemaV2: visual.includes("schemaVersion: 'orbit360-block12-cumulative-visual-v2'")
};
const visualFailed = Object.entries(visualChecks).filter(([, ok]) => !ok).map(([id]) => id);
if (visualFailed.length) throw new Error(`PIPELINE_MECHANISM_FAILURE:VISUAL_ROOTFIX_INCOMPLETE:${visualFailed.join(',')}`);

let runtime = read(RUNTIME);
runtime = replaceOnce(runtime, "contractVersion: '12.0.7'", `contractVersion: '${VERSION}'`, 'RUNTIME_FINAL_CONTRACT_VERSION');
write(RUNTIME, runtime);

let router = read(ROUTER);
router = replaceOnce(router, `"${GATE}":{contractVersion:"12.0.8"`, `"${GATE}":{contractVersion:"${VERSION}"`, 'ROUTER_GATE_VERSION');
if (!router.includes('"OPERATIONAL_RUNTIME_LAB_VISUAL_REACTIVATION"')) {
  router = replaceOnce(
    router,
    '  "OPERATIONAL_RUNTIME_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:true,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},\n  "RUNTIME_HANG_RESCUE_LAB_EXECUTION"',
    '  "OPERATIONAL_RUNTIME_LAB_EXECUTION":{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:true,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},\n  "OPERATIONAL_RUNTIME_LAB_VISUAL_REACTIVATION":{secrets:true,firestoreRead:true,writes:false,runtime:false,browser:true,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false},\n  "RUNTIME_HANG_RESCUE_LAB_EXECUTION"',
    'ROUTER_VISUAL_PHASE_PROFILE'
  );
}
write(ROUTER, router);

const registry = JSON.parse(read(REGISTRY));
let registryMatches = 0;
const visit = node => {
  if (!node || typeof node !== 'object') return;
  if (node.gateId === GATE) {
    if ('gateContractVersion' in node) node.gateContractVersion = VERSION;
    if ('contractVersion' in node) node.contractVersion = VERSION;
    if (!('gateContractVersion' in node) && !('contractVersion' in node)) node.contractVersion = VERSION;
    node.lifecycle = 'tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json';
    node.engine = ENGINE;
    registryMatches += 1;
  }
  for (const value of Object.values(node)) visit(value);
};
visit(registry);
if (!registryMatches) {
  registry.runtimeGateExtensions = [].concat(registry.runtimeGateExtensions || []).filter(item => item.gateId !== GATE);
  registry.runtimeGateExtensions.push({
    gateId: GATE,
    contractVersion: VERSION,
    lifecycle: 'tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json',
    engine: ENGINE,
    status: 'OPERATIONAL_RUNTIME_LAB_VISUAL_ROOTFIX_READY'
  });
  registryMatches = 1;
}
write(REGISTRY, JSON.stringify(registry, null, 2) + '\n');

let engine = read(ENGINE);
engine = replaceOnce(engine, "const VERSION = '12.0.8';", `const VERSION = '${VERSION}';`, 'ENGINE_VERSION');
engine = replaceLine(engine, "add('LIFECYCLE_ACTIVE'", "  add('LIFECYCLE_ACTIVE', lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_VISUAL_ROOTFIX_READY' && lifecycle.singleGate === true && lifecycle.macroClosure === true);", 'ENGINE_LIFECYCLE_ACTIVE');
engine = replaceLine(engine, "add('CAPABILITIES_EXACT'", "  add('CAPABILITIES_EXACT', lifecycle.executionProfile.phase === 'OPERATIONAL_RUNTIME_LAB_VISUAL_REACTIVATION' && capabilities.secrets === true && capabilities.firestoreRead === true && capabilities.writes === false && capabilities.runtime === false && capabilities.browser === true && capabilities.deploy === true && capabilities.functionsDeploy === true && capabilities.rulesDeploy === false && capabilities.production === false);", 'ENGINE_CAPABILITIES');
engine = replaceLine(engine, "add('REQUEST_ACTIVE'", "  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-block12-operational-runtime-lab-visual-rootfix-request-v1' && request.status === 'AUTHORIZED_VISUAL_REACTIVATION_AFTER_FUNCTIONAL_PASS' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && request.previousRuntimeRunId === 30962756387 && request.previousFunctionalStatus === 'PASS' && request.previousFunctionalPassed === 18 && request.previousFunctionalFailed === 0 && request.previousVisualStatus === 'FAIL' && request.previousVisualClassification === 'PIPELINE_MECHANISM_FAILURE' && request.previousVisualFailureCode === 'VISUAL_SCREENSHOT_FULLPAGE_TIMEOUT' && request.previousRollbackExact === true && request.previousRealTenantUnchanged === true && request.functionalReplayForbidden === true && request.authorizationRef === lifecycle.authorization.source);", 'ENGINE_REQUEST_ACTIVE');
engine = replaceLine(engine, "add('SYNTHETIC_BOUNDARY'", "  add('READONLY_REACTIVATION_BOUNDARY', request.scope.syntheticTenant === false && request.scope.syntheticAuthUsers === 0 && request.scope.syntheticMemberships === 0 && request.scope.realTenantWrites === false && request.scope.realDataReimport === false && request.scope.functionalScenarioReplay === false);", 'ENGINE_READONLY_BOUNDARY');
engine = replaceLine(engine, "add('EVIDENCE_AND_ROLLBACK'", "  add('EVIDENCE_AND_INTEGRITY', scope.snapshotBeforeAfter === true && scope.readonlyIntegrityBeforeAfter === true && scope.priorFunctionalPassEvidenceRequired === true && scope.functionalReplayForbidden === true && scope.sanitizedEvidence === true && scope.cumulativeVisualCandidate === true);", 'ENGINE_EVIDENCE_INTEGRITY');
engine = replaceLine(engine, 'const rootfixWorkflow =', "  const rootfixWorkflow = readText('.github/workflows/orbit360-block12-visual-reactivation-lab-v20260804.yml');", 'ENGINE_WORKFLOW_PATH');
engine = replaceLine(
  engine,
  "add('BROWSER_HARNESS_ROOTFIX'",
  "  const visualHarness = readText('tools/orbit360-block12-cumulative-visual-v20260804.mjs');\n  add('VISUAL_HARNESS_ROOTFIX', scope.visualViewportCaptureRequired === true && scope.visualAnimationsDisabledRequired === true && scope.visualBrowserCloseFinallyRequired === true && visualHarness.includes('fullPage: false') && visualHarness.includes(\"animations: 'disabled'\") && visualHarness.includes(\"reducedMotion: 'reduce'\") && visualHarness.includes('VISUAL_SCREENSHOT_${route}') && visualHarness.includes('if (page) await page.close().catch') && visualHarness.includes('if (browser) await browser.close().catch') && rootfixWorkflow.includes('timeout --signal=TERM --kill-after=15s 240s'));",
  'ENGINE_VISUAL_HARNESS'
);
engine = replaceLine(engine, "add('FUNCTIONS_SDK_CONTRACT'", "  add('FUNCTIONS_SDK_CONTRACT', scope.firebaseFunctionsCompatSdkRequired === true && loader.includes('firebase-functions-compat.js') && readText('orbit360-platform/core/runtime-verification-center-v20260804.js').includes(\"typeof firebase.functions !== 'function'\"));", 'ENGINE_FUNCTIONS_SDK');
engine = replaceOnce(
  engine,
  "  'orbit360-platform/runtime-gate-crm-v20260716/functions-dependency-rootfix-source-v20260804.json'\n];",
  "  'orbit360-platform/runtime-gate-crm-v20260716/functions-dependency-rootfix-source-v20260804.json',\n  'orbit360-platform/runtime-gate-crm-v20260716/block12-functional-pass-before-visual-rootfix-v20260804.json',\n  'tools/orbit360-block12-cumulative-visual-v20260804.mjs',\n  'tools/orbit360-block12-visual-readonly-integrity-v20260804.mjs',\n  'tools/orbit360-materializar-block12-visual-rootfix-v20260804.mjs',\n  '.github/workflows/orbit360-block12-visual-reactivation-lab-v20260804.yml',\n  'orbit360-platform/docs/CIERRE-BLOQUE12-RUNTIME-FUNCIONAL-Y-ROOTFIX-VISUAL-20260804.md'\n];",
  'ENGINE_REQUIRED_FILES'
);
if (!engine.includes('const hasGateVersion =')) {
  engine = replaceOnce(
    engine,
    'const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);',
    "const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);\nconst hasGateVersion = (node, gateId, version) => {\n  if (!node || typeof node !== 'object') return false;\n  if (node.gateId === gateId && (node.contractVersion === version || node.gateContractVersion === version)) return true;\n  return Object.values(node).some(value => hasGateVersion(value, gateId, version));\n};",
    'ENGINE_GATE_VERSION_HELPER'
  );
}
const newChecks = [
  "  add('IMPORT_IDEMPOTENCY_RESPONSE', !recurringSource.includes('Object.assign({ reused: true }, priorReq.data().result || {})') && recurringSource.includes('Object.assign({}, priorReq.data().result || {}, { reused: true })'));",
  "  const priorFunctional = readJson('orbit360-platform/runtime-gate-crm-v20260716/block12-functional-pass-before-visual-rootfix-v20260804.json');",
  "  add('PREVIOUS_FUNCTIONAL_PASS', priorFunctional.sourceRunId === 30962756387 && priorFunctional.runtime.status === 'OPERATIONAL_RUNTIME_BROWSER_PASS' && priorFunctional.runtime.passed === 18 && priorFunctional.runtime.failed === 0 && priorFunctional.cleanup.rollbackExact === true && priorFunctional.cleanup.realTenantUnchanged === true && priorFunctional.visual.failureCode === 'VISUAL_SCREENSHOT_FULLPAGE_TIMEOUT' && priorFunctional.ok === true);",
  "  add('FINAL_CONTRACT_VERSION', readText('tools/orbit360-block12-operational-runtime-lab-v20260804.mjs').includes(\"contractVersion: '12.0.9'\"));",
  "  const registryState = readJson('tools/orbit360-gate-contract-registry-v20260717.json');",
  "  const routerState = readText('tools/orbit360-validar-gate-contracts-v20260717.mjs');",
  "  add('REGISTRY_VERSION_SYNC', hasGateVersion(registryState, GATE, VERSION) && routerState.includes('block12-operational-runtime-lab-v20260804') && routerState.includes('contractVersion:\"12.0.9\"'));"
].join('\n');
engine = replaceOnce(
  engine,
  "  add('IMPORT_IDEMPOTENCY_RESPONSE', !recurringSource.includes('Object.assign({ reused: true }, priorReq.data().result || {})') && recurringSource.includes('Object.assign({}, priorReq.data().result || {}, { reused: true })'));",
  newChecks,
  'ENGINE_NEW_CHECKS'
);
engine = replaceOnce(
  engine,
  '    writeAuthorized: ok,\n    authWriteAuthorized: ok,\n    maximumSyntheticAuthUsers: ok ? 3 : 0,\n    maximumSyntheticMemberships: ok ? 3 : 0,\n    runtimeAuthorized: ok,',
  '    writeAuthorized: false,\n    authWriteAuthorized: false,\n    maximumSyntheticAuthUsers: 0,\n    maximumSyntheticMemberships: 0,\n    runtimeAuthorized: false,\n    visualOnlyAuthorized: ok,',
  'ENGINE_OUTPUT_CAPABILITIES'
);
write(ENGINE, engine);

for (const file of [VISUAL, RUNTIME, ROUTER, ENGINE, 'tools/orbit360-block12-visual-readonly-integrity-v20260804.mjs']) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, file)], { stdio: 'inherit' });
}

const payload = {
  schemaVersion: 'orbit360-block12-visual-rootfix-source-v1',
  status: 'VISUAL_ROOTFIX_SOURCE_PASS',
  classification: 'PIPELINE_MECHANISM_FAILURE_CORRECTED',
  gateId: GATE,
  contractVersion: VERSION,
  visualChecks,
  runtimeFinalVersionAligned: read(RUNTIME).includes("contractVersion: '12.0.9'"),
  routerVersionAligned: read(ROUTER).includes(`\"${GATE}\":{contractVersion:\"${VERSION}\"`),
  routerPhaseRegistered: read(ROUTER).includes('"OPERATIONAL_RUNTIME_LAB_VISUAL_REACTIVATION"'),
  registryMatches,
  engineVersionAligned: read(ENGINE).includes("const VERSION = '12.0.9'"),
  secretsRead: false,
  firebaseCommandsExecuted: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  deployExecuted: false,
  productionTouched: false,
  mainTouched: false,
  mergeExecuted: false,
  containsPII: false,
  containsSecrets: false,
  ok: true
};
fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
write(OUT, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify(payload, null, 2));
