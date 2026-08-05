#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block12-operational-runtime-lab-v20260804';
const VERSION = '12.0.11';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-layoutfree-lab-v20260804.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const WORKFLOW = '.github/workflows/orbit360-block12-visual-layoutfree-reactivation-lab-v20260804.yml';
const VISUAL = 'tools/orbit360-block12-cumulative-visual-v20260804.mjs';
const ISOLATED_EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/block12-isolated-routes-synthetic.json';
const ROOTCAUSE_EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/block12-route-navigation-rootcause-v20260804.json';
const PRIOR_FUNCTIONAL = 'orbit360-platform/runtime-gate-crm-v20260716/block12-functional-pass-before-visual-rootfix-v20260804.json';
const REGISTRY_EXTENSION = 'tools/orbit360-gate-contract-registry-extension-block12-isolated-visual-v20260805.json';
const SOURCE_BASELINE = '548cffa50cddfd93ad2118f5a06e9bb420699bde';
const EXPECTED_FUNCTIONS = [
  'orbit360OpsLeadsCommandLabV20260804',
  'orbit360GetAdvisorOpsInboxLabV20260804',
  'orbit360CobrosReconciliationCommandLabV20260804',
  'orbit360RecurringInsuranceImportLabV20260804'
];
const EXPECTED_ROUTES = ['cliente360','aseguradoras','polizas','cobros','conciliaciones','ops','leads','importar'];
const REQUIRED = [
  LIFECYCLE, REQUEST, WORKFLOW, VISUAL, ISOLATED_EVIDENCE, ROOTCAUSE_EVIDENCE,
  PRIOR_FUNCTIONAL, REGISTRY_EXTENSION,
  'tools/orbit360-block12-visual-readonly-integrity-v20260804.mjs',
  'tools/orbit360-validar-rutas-aisladas-sintetico-v20260804.mjs',
  'functions/ops-leads-domain.js', 'functions/ops-advisor-inbox.js',
  'functions/cobros-reconciliation-domain.js', 'functions/recurring-insurance-import.js',
  'functions/bootstrap.js', 'functions/package.json', 'functions/package-lock.json',
  'tools/orbit360-validar-functions-runtime-dependencies-v20260804.mjs',
  'orbit360-platform/runtime-gate-crm-v20260716/functions-dependency-rootfix-source-v20260804.json',
  'orbit360-platform/core/backend-lab-init.js', 'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/runtime-verification-center-v20260804.js', 'orbit360-platform/index.html'
];

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail: String(detail || '').slice(0, 700) });
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const readText = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hasGateVersion = (node, gateId, version, engine) => {
  if (!node || typeof node !== 'object') return false;
  if (node.gateId === gateId && (node.contractVersion === version || node.gateContractVersion === version) && (!engine || node.engine === engine)) return true;
  return Object.values(node).some(value => hasGateVersion(value, gateId, version, engine));
};

let result;
try {
  const lifecycle = readJson(LIFECYCLE);
  const request = readJson(REQUEST);
  const workflow = readText(WORKFLOW);
  const visual = readText(VISUAL);
  const isolated = readJson(ISOLATED_EVIDENCE);
  const rootCause = readJson(ROOTCAUSE_EVIDENCE);
  const priorFunctional = readJson(PRIOR_FUNCTIONAL);
  const extension = readJson(REGISTRY_EXTENSION);
  const dependencyEvidence = readJson('orbit360-platform/runtime-gate-crm-v20260716/functions-dependency-rootfix-source-v20260804.json');
  const loader = readText('orbit360-platform/core/backend-lab-loader.js');
  const index = readText('orbit360-platform/index.html');
  const backend = readText('orbit360-platform/core/backend-lab-init.js');
  const center = readText('orbit360-platform/core/runtime-verification-center-v20260804.js');
  const recurringSource = readText('functions/recurring-insurance-import.js');
  const functionSources = ['functions/ops-leads-domain.js','functions/ops-advisor-inbox.js','functions/cobros-reconciliation-domain.js','functions/recurring-insurance-import.js'].map(readText).join('\n');
  const registry = readJson('tools/orbit360-gate-contract-registry-v20260717.json');
  const router = readText('tools/orbit360-validar-gate-contracts-v20260717.mjs');
  const capabilities = lifecycle.executionProfile?.capabilities || {};
  const scope = lifecycle.scope || {};
  const forbidden = lifecycle.forbidden || {};
  const expectedEngine = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-layoutfree-lab-v20260804.mjs';

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_ACTIVE', lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_ISOLATED_VISUAL_READY' && lifecycle.validatorLifecycleRevision === 'isolated-context-direct-url-v6' && lifecycle.singleGate === true && lifecycle.macroClosure === true);
  add('CAPABILITIES_EXACT', lifecycle.executionProfile?.phase === 'OPERATIONAL_RUNTIME_LAB_VISUAL_REACTIVATION' && capabilities.secrets === true && capabilities.firestoreRead === true && capabilities.writes === false && capabilities.runtime === false && capabilities.browser === true && capabilities.deploy === true && capabilities.functionsDeploy === true && capabilities.rulesDeploy === false && capabilities.production === false);
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-go-lab-candidate-visible-request-v2' && request.rcId === 'RC-AYS-LAB-CANONICA-01' && request.status === 'AUTHORIZED_GO_LAB_CANDIDATE_VISIBLE' && request.approved === true && request.allowedExecutions === 1 && request.replayAllowed === false && request.authorizationRef === lifecycle.authorization?.source && request.previousRuntimeRunId === 30962756387 && request.previousFunctionalPassed === 18 && request.previousFunctionalFailed === 0 && request.previousVisualRunId === 30971226259 && request.previousVisualFailureClassification === 'PIPELINE_MECHANISM_FAILURE' && request.previousVisualFailureCode === 'ROUTE_ASEGURADORAS_NAVIGATION_TIMEOUT' && request.isolatedSyntheticRunId === 30971707956 && request.isolatedSyntheticStatus === 'ISOLATED_ROUTES_SYNTHETIC_PASS' && request.replacementMechanism === 'ONE_ISOLATED_BROWSER_CONTEXT_AND_DIRECT_URL_PER_ROUTE' && request.functionalReplayForbidden === true && request.retainPreviewOnCaptureOnlyFailure === true);
  add('REQUEST_BINDING', request.branch === scope.branch && request.pullRequest === scope.pullRequest && request.projectId === scope.projectId && request.gateId === GATE && request.contractVersion === VERSION && request.sourceBaseline === SOURCE_BASELINE && request.parentHead === git(['rev-parse', 'HEAD^']));
  add('CORRECTIVE_CONTINUATION', request.correctiveContinuationOfRunId === 30974443335 && request.previousPreflightStatus === 'VALIDATOR_STALE' && equal([].concat(request.previousPreflightFailedChecks || []).sort(), ['REQUEST_ACTIVE','VIDEO_LAYOUTFREE_HARNESS'].sort()) && request.previousAttemptSecretAccess === false && request.previousAttemptFirestoreRead === false && request.previousAttemptDeploy === false && lifecycle.authorization?.correctiveContinuationAllowed === true && lifecycle.authorization?.preflightFailureRunId === 30974443335 && lifecycle.authorization?.previousAttemptSecretAccess === false && lifecycle.authorization?.previousAttemptFirestoreRead === false && lifecycle.authorization?.previousAttemptDeploy === false);
  add('READONLY_BOUNDARY', request.scope?.syntheticTenant === false && request.scope?.syntheticAuthUsers === 0 && request.scope?.syntheticMemberships === 0 && request.scope?.realTenantWrites === false && request.scope?.realDataReimport === false && request.scope?.functionalScenarioReplay === false);
  add('FUNCTION_ALLOWLIST', equal([].concat(request.scope?.functionNames || []).sort(), EXPECTED_FUNCTIONS.slice().sort()) && equal([].concat(scope.exactFunctionNames || []).sort(), EXPECTED_FUNCTIONS.slice().sort()));
  add('ROUTE_ALLOWLIST', equal([].concat(request.scope?.visualRoutes || []), EXPECTED_ROUTES) && equal([].concat(scope.visualRoutes || []), EXPECTED_ROUTES));
  add('HOSTING_BOUNDARY', request.scope?.hostingPreviewOnly === true && request.scope?.hostingChannel === scope.hostingChannel && request.scope?.productionHosting === false);
  add('FORBIDDEN_BOUNDARY', forbidden.rulesDeploy === true && forbidden.realTenantWrites === true && forbidden.realDataReimport === true && forbidden.syntheticTenant === true && forbidden.syntheticAuthUsers === true && forbidden.functionalScenarioReplay === true && forbidden.production === true && forbidden.main === true && forbidden.merge === true && forbidden.inPageHashNavigation === true && forbidden.newVisualWorkflowVariant === true && request.scope?.rules === false && request.scope?.production === false && request.scope?.main === false && request.scope?.merge === false);
  add('EVIDENCE_AND_INTEGRITY', scope.snapshotBeforeAfter === true && scope.readonlyIntegrityBeforeAfter === true && scope.priorFunctionalPassEvidenceRequired === true && scope.functionalReplayForbidden === true && scope.sanitizedJsonEvidence === true && scope.cumulativeVisualCandidate === true && scope.manualFrameReviewRequired === true);
  add('ISOLATED_SYNTHETIC_PASS', isolated.status === 'ISOLATED_ROUTES_SYNTHETIC_PASS' && isolated.classification === 'GO_PIPELINE_MECHANISM' && isolated.routeCount === 8 && isolated.navigationMechanism === 'one-isolated-browser-context-and-direct-url-per-route' && isolated.inPageHashNavigationUsed === false && isolated.screenshotApiUsed === false && isolated.cdpScreenshotUsed === false && isolated.networkAccess === false && isolated.firebaseCommandsExecuted === false && isolated.firestoreWrites === 0 && isolated.authWrites === 0 && isolated.deployExecuted === false && isolated.ok === true && isolated.routes.every(row => row.isolatedContext === true && row.directRouteUrlConfirmed === true && row.validPng === true && row.videoBytes > 1000 && row.frameBytes > 1000));
  add('ROOTCAUSE_BOUND', rootCause.sourceRunId === 30971226259 && rootCause.visual?.failureCode === 'ROUTE_ASEGURADORAS_NAVIGATION_TIMEOUT' && rootCause.visual?.failureOwner === 'in-page hash navigation on a long-lived SPA page' && rootCause.visual?.functionalRegressionDemonstrated === false && rootCause.integrity?.unchanged === true && rootCause.stopRetry?.activeForInPageHashNavigation === true && rootCause.stopRetry?.replacementMechanism === 'ONE_ISOLATED_BROWSER_CONTEXT_AND_DIRECT_URL_PER_ROUTE' && rootCause.ok === true);
  add('ISOLATED_ROUTE_HARNESS', scope.isolatedContextPerRouteRequired === true && scope.directRouteUrlRequired === true && scope.ephemeralCustomTokenPerRouteRequired === true && scope.inPageHashNavigationForbidden === true && visual.includes('browser.newContext({') && visual.includes('const routeUrl =') && visual.includes('currentPage.goto(routeUrl') && visual.includes('orbitBlock12Route: route') && visual.includes("schemaVersion: 'orbit360-block12-cumulative-visual-v6'") && visual.includes("navigationMechanism: 'one-isolated-browser-context-and-direct-url-per-route'") && visual.includes('inPageHashNavigationUsed: false') && visual.includes('customTokenEphemeralPerRoute: true') && !visual.includes('location.hash =') && !visual.includes('HashChangeEvent(') && !visual.includes('.innerText') && !visual.includes('getComputedStyle(') && !visual.includes('page.screenshot(') && !visual.includes('Page.captureScreenshot') && !visual.includes('newCDPSession('));
  add('RETENTION_POLICY', scope.retainPreviewOnProductIntegrityPass === true && scope.rollbackOnlyOnProductOrIntegrityFailure === true && workflow.includes('PRODUCT_OK') && workflow.includes('RETAIN') && workflow.includes('STOP_VISUAL_EVIDENCE_PREVIEW_RETAINED') && workflow.includes('hostingPreviewKept:$retain') && workflow.includes('functionsKept:$retain'));
  add('DEPLOY_PIPELINE', scope.postDeployFunctionVerificationRequired === true && workflow.includes('firebase deploy') && workflow.includes('--force') && workflow.includes('test "$VERIFIED" = 4') && workflow.includes('VISUAL_READONLY_INTEGRITY_PASS') && workflow.includes('functions:delete') && workflow.includes('hosting:channel:delete') && workflow.includes('ffmpeg-static@5.2.0'));
  add('REAL_TENANT_LOADER', loader.includes("var allowedTenants = ['alianzas-soluciones']") && loader.includes('isOperationalVerificationPreviewHost') && loader.includes("requestedTenant = params.get('tenant') || 'alianzas-soluciones'") && index.includes('backend-lab-loader.js?v=20260804-operational-rootfix9'));
  add('FUNCTIONS_SDK_CONTRACT', scope.firebaseFunctionsCompatSdkRequired === true && loader.includes('firebase-functions-compat.js') && center.includes("typeof firebase.functions !== 'function'"));
  add('FUNCTIONS_DEPENDENCY_PASS', scope.functionsPackageLockRequired === true && scope.functionsBootstrapLoadPassRequired === true && dependencyEvidence.status === 'FUNCTIONS_BOOTSTRAP_LOAD_PASS' && dependencyEvidence.requiredFunctionExports === true && dependencyEvidence.broadV2AggregatorLoaded === false && dependencyEvidence.unusedDatabaseProviderLoaded === false && dependencyEvidence.lockfileVersion >= 3 && dependencyEvidence.ok === true);
  add('REQUIRED_FILES', REQUIRED.every(exists), REQUIRED.filter(rel => !exists(rel)).join(','));
  add('FUNCTION_EXPORTS_PRESENT', EXPECTED_FUNCTIONS.every(name => functionSources.includes(`exports.${name}`)));
  add('IMPORT_IDEMPOTENCY_RESPONSE', !recurringSource.includes('Object.assign({ reused: true }, priorReq.data().result || {})') && recurringSource.includes('Object.assign({}, priorReq.data().result || {}, { reused: true })'));
  add('PREVIOUS_FUNCTIONAL_PASS', priorFunctional.sourceRunId === 30962756387 && priorFunctional.runtime?.status === 'OPERATIONAL_RUNTIME_BROWSER_PASS' && priorFunctional.runtime?.passed === 18 && priorFunctional.runtime?.failed === 0 && priorFunctional.cleanup?.rollbackExact === true && priorFunctional.cleanup?.realTenantUnchanged === true && priorFunctional.ok === true);
  add('REGISTRY_ROUTER_SYNC', hasGateVersion(registry, GATE, VERSION, expectedEngine) && router.includes(`"${GATE}":{contractVersion:"${VERSION}",lifecycle:"${LIFECYCLE}",engine:"${expectedEngine}"}`));
  add('REGISTRY_EXTENSION_SYNC', extension.gateId === GATE && extension.contractVersion === VERSION && extension.status === 'OPERATIONAL_RUNTIME_LAB_ISOLATED_VISUAL_READY' && extension.validatorRevision === 'isolated-context-direct-url-v6' && extension.engine === expectedEngine && extension.lifecycle === LIFECYCLE && extension.previousPreflightRunId === 30974443335 && extension.previousAttemptSecretAccess === false && extension.previousAttemptFirestoreRead === false && extension.previousAttemptDeploy === false && extension.correctiveContinuationAllowed === true);
  add('CLIENT_FLAGS_AND_CENTER', /opsLeadsDomainBackendActive:\s*true/.test(backend) && /cobrosReconciliationDomainActive:\s*true/.test(backend) && /recurringInsuranceImportActive:\s*true/.test(backend) && backend.includes('runtime-verification-center-v20260804.js'));
  add('IN_PLATFORM_SCENARIOS_PRESERVED', ['OP-001','SEC-001','NTF-001','IMP-001','PAY-001','SYS-999','VEREDICTO'].every(token => center.includes(token)));
  add('NO_TENANT_DATA_IN_CENTER', !/AseGuate|El Roble|La Ceiba|Universales|Mapfre|Paula|Carlos|Samuel|Fernando|430 clientes|365|235/.test(center));
  add('BRANCH_PR', String(process.env.GITHUB_REF_NAME || process.env.ORBIT360_BRANCH || '') === scope.branch && request.pullRequest === 5);

  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion: 'orbit360-block12-operational-runtime-lab-preflight-v1',
    gateId: GATE,
    contractVersion: VERSION,
    validatorRevision: 'isolated-context-direct-url-v6',
    status: ok ? 'GO_GATE_CONTRACT' : 'VALIDATOR_STALE',
    classification: ok ? 'OPERATIONAL_RUNTIME_LAB_ISOLATED_VISUAL_READY' : 'VALIDATOR_STALE',
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
    containsSecrets: false,
    canonicalEntrypoint: 'tools/orbit360-validar-gate-contracts-v20260717.mjs',
    canonicalEngine: expectedEngine,
    canonicalLifecycleContract: LIFECYCLE,
    canonicalLifecycleComposition: 'phase-capability-contract-v1',
    engineEvidenceSource: 'sync-file-evidence-not-stdout-v1',
    engineStdoutParsed: false,
    sourceTransformed: false,
    operationalWrites: 0,
    evidenceWrites: 1,
    secretsRead: false,
    rulesApplied: false
  };
} catch (error) {
  result = {
    schemaVersion: 'orbit360-block12-operational-runtime-lab-preflight-v1',
    gateId: GATE,
    contractVersion: VERSION,
    validatorRevision: 'isolated-context-direct-url-v6',
    status: 'VALIDATOR_STALE',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    error: String(error && (error.message || error)).replace(/[\r\n]+/g, ' ').slice(0, 700),
    executionAuthorized: false,
    secretAccessAuthorized: false,
    firestoreReadAuthorized: false,
    writeAuthorized: false,
    authWriteAuthorized: false,
    maximumSyntheticAuthUsers: 0,
    maximumSyntheticMemberships: 0,
    runtimeAuthorized: false,
    visualOnlyAuthorized: false,
    browserAuthorized: false,
    deployAuthorized: false,
    functionsDeployAuthorized: false,
    hostingPreviewAuthorized: false,
    exactFunctionNames: [],
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
    containsSecrets: false,
    operationalWrites: 0,
    evidenceWrites: 1,
    secretsRead: false,
    rulesApplied: false
  };
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'GO_GATE_CONTRACT') process.exit(42);
