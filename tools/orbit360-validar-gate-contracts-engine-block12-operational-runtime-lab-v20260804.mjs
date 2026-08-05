#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block12-operational-runtime-lab-v20260804';
const VERSION = '12.0.9';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix9-resume-v20260804.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const REQUIRED = [
  LIFECYCLE,
  REQUEST,
  'functions/ops-leads-domain.js',
  'functions/ops-advisor-inbox.js',
  'functions/cobros-reconciliation-domain.js',
  'functions/recurring-insurance-import.js',
  'functions/bootstrap.js',
  'functions/package.json',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/runtime-verification-center-v20260804.js',
  'tools/orbit360-block12-operational-runtime-lab-v20260804.mjs',
  '.github/workflows/orbit360-block12-operational-runtime-lab-rootfix9-v20260804.yml',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/index.html',
  'functions/package-lock.json',
  'tools/orbit360-validar-functions-runtime-dependencies-v20260804.mjs',
  'orbit360-platform/runtime-gate-crm-v20260716/functions-dependency-rootfix-source-v20260804.json',
  'orbit360-platform/runtime-gate-crm-v20260716/block12-functional-pass-before-visual-rootfix-v20260804.json',
  'tools/orbit360-block12-cumulative-visual-v20260804.mjs',
  'tools/orbit360-block12-visual-readonly-integrity-v20260804.mjs',
  'tools/orbit360-materializar-block12-visual-rootfix-v20260804.mjs',
  '.github/workflows/orbit360-block12-visual-reactivation-lab-v20260804.yml',
  'orbit360-platform/docs/CIERRE-BLOQUE12-RUNTIME-FUNCIONAL-Y-ROOTFIX-VISUAL-20260804.md',
  'tools/orbit360-validar-cdp-screenshot-sintetico-v20260804.mjs',
  'orbit360-platform/runtime-gate-crm-v20260716/block12-cdp-screenshot-synthetic.json',
  'orbit360-platform/runtime-gate-crm-v20260716/block12-visual-cdp-rootcause-v20260804.json'
];
const EXPECTED_FUNCTIONS = [
  'orbit360OpsLeadsCommandLabV20260804',
  'orbit360GetAdvisorOpsInboxLabV20260804',
  'orbit360CobrosReconciliationCommandLabV20260804',
  'orbit360RecurringInsuranceImportLabV20260804'
];
const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail: String(detail || '').slice(0, 700) });
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hasGateVersion = (node, gateId, version) => {
  if (!node || typeof node !== 'object') return false;
  if (node.gateId === gateId && (node.contractVersion === version || node.gateContractVersion === version)) return true;
  return Object.values(node).some(value => hasGateVersion(value, gateId, version));
};
let result;
try {
  const lifecycle = readJson(LIFECYCLE);
  const request = readJson(REQUEST);
  const capabilities = lifecycle.executionProfile && lifecycle.executionProfile.capabilities || {};
  const scope = lifecycle.scope || {};
  const forbidden = lifecycle.forbidden || {};
  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_ACTIVE', lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_VISUAL_ROOTFIX_READY' && lifecycle.singleGate === true && lifecycle.macroClosure === true);
  add('CAPABILITIES_EXACT', lifecycle.executionProfile.phase === 'OPERATIONAL_RUNTIME_LAB_VISUAL_REACTIVATION' && capabilities.secrets === true && capabilities.firestoreRead === true && capabilities.writes === false && capabilities.runtime === false && capabilities.browser === true && capabilities.deploy === true && capabilities.functionsDeploy === true && capabilities.rulesDeploy === false && capabilities.production === false);
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-block12-operational-runtime-lab-visual-rootfix-request-v1' && request.status === 'AUTHORIZED_VISUAL_REACTIVATION_AFTER_FUNCTIONAL_PASS' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && request.previousRuntimeRunId === 30962756387 && request.previousFunctionalStatus === 'PASS' && request.previousFunctionalPassed === 18 && request.previousFunctionalFailed === 0 && request.previousVisualStatus === 'FAIL' && request.previousVisualClassification === 'PIPELINE_MECHANISM_FAILURE' && request.previousVisualFailureCode === 'VISUAL_SCREENSHOT_FULLPAGE_TIMEOUT' && request.previousRollbackExact === true && request.previousRealTenantUnchanged === true && request.functionalReplayForbidden === true && request.authorizationRef === lifecycle.authorization.source);
  add('REQUEST_BINDING', request.branch === scope.branch && request.pullRequest === scope.pullRequest && request.projectId === scope.projectId && request.gateId === GATE && request.contractVersion === VERSION && request.parentHead === git(['rev-parse', 'HEAD^^']));
  add('READONLY_REACTIVATION_BOUNDARY', request.scope.syntheticTenant === false && request.scope.syntheticAuthUsers === 0 && request.scope.syntheticMemberships === 0 && request.scope.realTenantWrites === false && request.scope.realDataReimport === false && request.scope.functionalScenarioReplay === false);
  add('FUNCTION_ALLOWLIST', equal([].concat(request.scope.functionNames || []).sort(), EXPECTED_FUNCTIONS.slice().sort()) && equal([].concat(scope.exactFunctionNames || []).sort(), EXPECTED_FUNCTIONS.slice().sort()));
  add('HOSTING_BOUNDARY', request.scope.hostingPreviewOnly === true && request.scope.hostingChannel === scope.hostingChannel && request.scope.productionHosting === false);
  add('FORBIDDEN_BOUNDARY', forbidden.rulesDeploy === true && forbidden.realTenantWrites === true && forbidden.realDataReimport === true && forbidden.production === true && forbidden.main === true && forbidden.merge === true && request.scope.rules === false && request.scope.production === false && request.scope.main === false && request.scope.merge === false);
  add('EVIDENCE_AND_INTEGRITY', scope.snapshotBeforeAfter === true && scope.readonlyIntegrityBeforeAfter === true && scope.priorFunctionalPassEvidenceRequired === true && scope.functionalReplayForbidden === true && scope.sanitizedEvidence === true && scope.cumulativeVisualCandidate === true);
  const rootfixWorkflow = readText('.github/workflows/orbit360-block12-visual-reactivation-lab-v20260804.yml');
  add('VISUAL_DEPLOY_PIPELINE', scope.artifactCleanupPolicyAutomatic === true && scope.postDeployFunctionVerificationRequired === true && rootfixWorkflow.includes('firebase deploy') && rootfixWorkflow.includes('--force') && rootfixWorkflow.includes('test \"$VERIFIED\" = 4') && rootfixWorkflow.includes('VISUAL_READONLY_INTEGRITY_PASS') && rootfixWorkflow.includes('functions:delete') && rootfixWorkflow.includes('hosting:channel:delete'));
  const harness = readText('tools/orbit360-block12-operational-runtime-lab-v20260804.mjs');
  const visualHarness = readText('tools/orbit360-block12-cumulative-visual-v20260804.mjs');
  const cdpEvidence = readJson('orbit360-platform/runtime-gate-crm-v20260716/block12-cdp-screenshot-synthetic.json');
  add('CDP_VISUAL_HARNESS_ROOTFIX', scope.visualViewportCaptureRequired === true && scope.visualAnimationsDisabledRequired === true && scope.visualBrowserCloseFinallyRequired === true && visualHarness.includes('newCDPSession(page)') && visualHarness.includes('Page.captureScreenshot') && visualHarness.includes('captureBeyondViewport: false') && !visualHarness.includes('page.screenshot(') && visualHarness.includes('CDP_SCREENSHOT_${route}_TIMEOUT') && visualHarness.includes('isPng(png)') && visualHarness.includes('if (cdp) await cdp.detach().catch') && visualHarness.includes('if (browser) await browser.close().catch') && cdpEvidence.status === 'CDP_SCREENSHOT_SYNTHETIC_PASS' && cdpEvidence.classification === 'GO_PIPELINE_MECHANISM' && cdpEvidence.captureEngine === 'chromium-cdp' && cdpEvidence.deployExecuted === false && cdpEvidence.ok === true);
  const loader = readText('orbit360-platform/core/backend-lab-loader.js');
  const index = readText('orbit360-platform/index.html');
  add('REAL_TENANT_VISUAL_LOADER_CONTRACT', request.scope.syntheticTenant === false && forbidden.syntheticTenant === true && loader.includes("var allowedTenants = ['alianzas-soluciones']") && loader.includes('isOperationalVerificationPreviewHost') && loader.includes("requestedTenant = params.get('tenant') || 'alianzas-soluciones'") && index.includes('backend-lab-loader.js?v=20260804-operational-rootfix9'));
  const loaderMaterializer = readText('tools/orbit360-materializar-block12-synthetic-loader-rootfix-v20260804.mjs');
  const visualMaterializer = readText('tools/orbit360-materializar-block12-visual-rootfix-v20260804.mjs');
  add('VISUAL_MATERIALIZER_SAFE', visualMaterializer.includes('replaceOnce') && visualMaterializer.includes('replaceLine') && visualMaterializer.includes('execFileSync(process.execPath') && visualMaterializer.includes("const VERSION = '12.0.9'") && visualMaterializer.includes('engineAlreadyMaterialized'));
  add('FUNCTIONS_SDK_CONTRACT', scope.firebaseFunctionsCompatSdkRequired === true && loader.includes('firebase-functions-compat.js') && readText('orbit360-platform/core/runtime-verification-center-v20260804.js').includes("typeof firebase.functions !== 'function'"));
  const dependencyEvidence = readJson('orbit360-platform/runtime-gate-crm-v20260716/functions-dependency-rootfix-source-v20260804.json');
  add('FUNCTIONS_DEPENDENCY_PASS', scope.functionsPackageLockRequired === true && scope.functionsBootstrapLoadPassRequired === true && dependencyEvidence.status === 'FUNCTIONS_BOOTSTRAP_LOAD_PASS' && dependencyEvidence.classification === 'GO_SOURCE_REPRODUCIBLE_FUNCTIONS_RUNTIME' && dependencyEvidence.requiredFunctionExports === true && dependencyEvidence.broadV2AggregatorLoaded === false && dependencyEvidence.unusedDatabaseProviderLoaded === false && dependencyEvidence.lockfileVersion >= 3 && dependencyEvidence.ok === true);
  add('REQUIRED_FILES', REQUIRED.every(exists), REQUIRED.filter(rel => !exists(rel)).join(','));
  const functionSources = ['functions/ops-leads-domain.js','functions/ops-advisor-inbox.js','functions/cobros-reconciliation-domain.js','functions/recurring-insurance-import.js'].map(readText).join('\n');
  add('FUNCTION_EXPORTS_PRESENT', EXPECTED_FUNCTIONS.every(name => functionSources.includes(`exports.${name}`)));
  const recurringSource = readText('functions/recurring-insurance-import.js');
  add('IMPORT_IDEMPOTENCY_RESPONSE', !recurringSource.includes('Object.assign({ reused: true }, priorReq.data().result || {})') && recurringSource.includes('Object.assign({}, priorReq.data().result || {}, { reused: true })'));
  const priorFunctional = readJson('orbit360-platform/runtime-gate-crm-v20260716/block12-functional-pass-before-visual-rootfix-v20260804.json');
  add('PREVIOUS_FUNCTIONAL_PASS', priorFunctional.sourceRunId === 30962756387 && priorFunctional.runtime.status === 'OPERATIONAL_RUNTIME_BROWSER_PASS' && priorFunctional.runtime.passed === 18 && priorFunctional.runtime.failed === 0 && priorFunctional.cleanup.rollbackExact === true && priorFunctional.cleanup.realTenantUnchanged === true && priorFunctional.visual.failureCode === 'VISUAL_SCREENSHOT_FULLPAGE_TIMEOUT' && priorFunctional.ok === true);
  add('FINAL_CONTRACT_VERSION', readText('tools/orbit360-block12-operational-runtime-lab-v20260804.mjs').includes("contractVersion: '12.0.9'"));
  const registryState = readJson('tools/orbit360-gate-contract-registry-v20260717.json');
  const routerState = readText('tools/orbit360-validar-gate-contracts-v20260717.mjs');
  add('REGISTRY_VERSION_SYNC', hasGateVersion(registryState, GATE, VERSION) && routerState.includes('block12-operational-runtime-lab-v20260804') && routerState.includes('contractVersion:"12.0.9"'));
  const backend = readText('orbit360-platform/core/backend-lab-init.js');
  add('CLIENT_FLAGS_AND_CENTER', /opsLeadsDomainBackendActive:\s*true/.test(backend) && /cobrosReconciliationDomainActive:\s*true/.test(backend) && /recurringInsuranceImportActive:\s*true/.test(backend) && backend.includes('runtime-verification-center-v20260804.js'));
  const center = readText('orbit360-platform/core/runtime-verification-center-v20260804.js');
  add('IN_PLATFORM_SCENARIOS', ['OP-001','SEC-001','NTF-001','IMP-001','PAY-001','SYS-999','VEREDICTO'].every(token => center.includes(token)));
  add('NO_TENANT_DATA_IN_CENTER', !/AseGuate|El Roble|La Ceiba|Universales|Mapfre|Paula|Carlos|Samuel|Fernando|430 clientes|365|235/.test(center));
  add('BRANCH_PR_HEAD', String(process.env.GITHUB_REF_NAME || process.env.ORBIT360_BRANCH || '') === scope.branch && request.pullRequest === 5);
  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion: 'orbit360-block12-operational-runtime-lab-preflight-v1',
    gateId: GATE,
    contractVersion: VERSION,
    status: ok ? 'GO_GATE_CONTRACT' : 'VALIDATOR_STALE',
    classification: ok ? 'OPERATIONAL_RUNTIME_LAB_READY' : 'VALIDATOR_STALE',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    failedCheckIds: failed.map(item => item.id),
    checks,
    executionAuthorized: ok,
    secretAccessAuthorized: ok,
    firestoreReadAuthorized: ok,
    writeAuthorized: false,
    authWriteAuthorized: false,
    maximumSyntheticAuthUsers: 0,
    maximumSyntheticMemberships: 0,
    runtimeAuthorized: false,
    visualOnlyAuthorized: ok,
    browserAuthorized: ok,
    deployAuthorized: ok,
    functionsDeployAuthorized: ok,
    hostingPreviewAuthorized: ok,
    exactFunctionNames: ok ? EXPECTED_FUNCTIONS : [],
    rulesDeployAuthorized: false,
    productionAuthorized: false,
    realTenantWritesAuthorized: false,
    realDataReimportAuthorized: false,
    dataAccess: false,
    secretAccess: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authReads: 0,
    authWrites: 0,
    runtimeExecuted: false,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false
  };
} catch (error) {
  result = {
    schemaVersion: 'orbit360-block12-operational-runtime-lab-preflight-v1',
    gateId: GATE,
    contractVersion: VERSION,
    status: 'VALIDATOR_STALE',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    error: String(error && (error.message || error)).replace(/[\r\n]+/g, ' ').slice(0, 700),
    executionAuthorized: false,
    secretAccessAuthorized: false,
    firestoreReadAuthorized: false,
    writeAuthorized: false,
    authWriteAuthorized: false,
    runtimeAuthorized: false,
    browserAuthorized: false,
    deployAuthorized: false,
    functionsDeployAuthorized: false,
    hostingPreviewAuthorized: false,
    rulesDeployAuthorized: false,
    productionAuthorized: false,
    dataAccess: false,
    secretAccess: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false
  };
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'GO_GATE_CONTRACT' ? 0 : 41);
