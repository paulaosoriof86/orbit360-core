#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block12-operational-runtime-lab-v20260804';
const VERSION = '12.0.10';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix9-resume-v20260804.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const WORKFLOW = '.github/workflows/orbit360-block12-visual-reactivation-lab-v20260804.yml';
const VISUAL = 'tools/orbit360-block12-cumulative-visual-v20260804.mjs';
const VIDEO_EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/block12-video-frame-synthetic.json';
const SOURCE_EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/block12-video-visual-contract-source-v20260804.json';
const PRIOR_FUNCTIONAL = 'orbit360-platform/runtime-gate-crm-v20260716/block12-functional-pass-before-visual-rootfix-v20260804.json';
const REQUIRED = [
  LIFECYCLE,
  REQUEST,
  WORKFLOW,
  VISUAL,
  VIDEO_EVIDENCE,
  SOURCE_EVIDENCE,
  PRIOR_FUNCTIONAL,
  'tools/orbit360-block12-visual-readonly-integrity-v20260804.mjs',
  'tools/orbit360-validar-video-frame-sintetico-v20260804.mjs',
  'functions/ops-leads-domain.js',
  'functions/ops-advisor-inbox.js',
  'functions/cobros-reconciliation-domain.js',
  'functions/recurring-insurance-import.js',
  'functions/bootstrap.js',
  'functions/package.json',
  'functions/package-lock.json',
  'tools/orbit360-validar-functions-runtime-dependencies-v20260804.mjs',
  'orbit360-platform/runtime-gate-crm-v20260716/functions-dependency-rootfix-source-v20260804.json',
  'orbit360-platform/core/backend-lab-init.js',
  'orbit360-platform/core/backend-lab-loader.js',
  'orbit360-platform/core/runtime-verification-center-v20260804.js',
  'orbit360-platform/index.html'
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
const hasGateVersion = (node, gateId, version, engine) => {
  if (!node || typeof node !== 'object') return false;
  if (node.gateId === gateId && (node.contractVersion === version || node.gateContractVersion === version) && (!engine || node.engine === engine)) return true;
  return Object.values(node).some(value => hasGateVersion(value, gateId, version, engine));
};
let result;
try {
  const lifecycle = readJson(LIFECYCLE);
  const request = readJson(REQUEST);
  const capabilities = lifecycle.executionProfile && lifecycle.executionProfile.capabilities || {};
  const scope = lifecycle.scope || {};
  const forbidden = lifecycle.forbidden || {};
  const workflow = readText(WORKFLOW);
  const visual = readText(VISUAL);
  const loader = readText('orbit360-platform/core/backend-lab-loader.js');
  const index = readText('orbit360-platform/index.html');
  const backend = readText('orbit360-platform/core/backend-lab-init.js');
  const center = readText('orbit360-platform/core/runtime-verification-center-v20260804.js');
  const videoEvidence = readJson(VIDEO_EVIDENCE);
  const sourceEvidence = readJson(SOURCE_EVIDENCE);
  const priorFunctional = readJson(PRIOR_FUNCTIONAL);
  const dependencyEvidence = readJson('orbit360-platform/runtime-gate-crm-v20260716/functions-dependency-rootfix-source-v20260804.json');
  const functionSources = ['functions/ops-leads-domain.js','functions/ops-advisor-inbox.js','functions/cobros-reconciliation-domain.js','functions/recurring-insurance-import.js'].map(readText).join('\n');
  const recurringSource = readText('functions/recurring-insurance-import.js');
  const registry = readJson('tools/orbit360-gate-contract-registry-v20260717.json');
  const router = readText('tools/orbit360-validar-gate-contracts-v20260717.mjs');
  const expectedEngine = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-video-lab-v20260804.mjs';

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_ACTIVE', lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_VISUAL_VIDEO_READY' && lifecycle.singleGate === true && lifecycle.macroClosure === true);
  add('CAPABILITIES_EXACT', lifecycle.executionProfile.phase === 'OPERATIONAL_RUNTIME_LAB_VISUAL_REACTIVATION' && capabilities.secrets === true && capabilities.firestoreRead === true && capabilities.writes === false && capabilities.runtime === false && capabilities.browser === true && capabilities.deploy === true && capabilities.functionsDeploy === true && capabilities.rulesDeploy === false && capabilities.production === false);
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-block12-operational-runtime-lab-visual-video-request-v1' && request.status === 'AUTHORIZED_VISUAL_VIDEO_REACTIVATION_AFTER_SYNTHETIC_PASS' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && request.previousRuntimeRunId === 30962756387 && request.previousFunctionalStatus === 'PASS' && request.previousFunctionalPassed === 18 && request.previousFunctionalFailed === 0 && request.previousVisualRunId === 30968795206 && request.previousVisualFailureFamily === 'SCREENSHOT_API_BLOCKED' && request.stopRetryApplied === true && request.replacementMechanism === 'PLAYWRIGHT_RECORD_VIDEO_PLUS_FFMPEG_STATIC_FRAME' && request.videoSyntheticRunId === 30969402434 && request.videoSyntheticStatus === 'VIDEO_FRAME_SYNTHETIC_PASS' && request.functionalReplayForbidden === true && request.authorizationRef === lifecycle.authorization.source);
  add('REQUEST_BINDING', request.branch === scope.branch && request.pullRequest === scope.pullRequest && request.projectId === scope.projectId && request.gateId === GATE && request.contractVersion === VERSION && request.parentHead === git(['rev-parse', 'HEAD^']));
  add('READONLY_BOUNDARY', request.scope.syntheticTenant === false && request.scope.syntheticAuthUsers === 0 && request.scope.syntheticMemberships === 0 && request.scope.realTenantWrites === false && request.scope.realDataReimport === false && request.scope.functionalScenarioReplay === false);
  add('FUNCTION_ALLOWLIST', equal([].concat(request.scope.functionNames || []).sort(), EXPECTED_FUNCTIONS.slice().sort()) && equal([].concat(scope.exactFunctionNames || []).sort(), EXPECTED_FUNCTIONS.slice().sort()));
  add('HOSTING_BOUNDARY', request.scope.hostingPreviewOnly === true && request.scope.hostingChannel === scope.hostingChannel && request.scope.productionHosting === false);
  add('FORBIDDEN_BOUNDARY', forbidden.rulesDeploy === true && forbidden.realTenantWrites === true && forbidden.realDataReimport === true && forbidden.syntheticTenant === true && forbidden.syntheticAuthUsers === true && forbidden.functionalScenarioReplay === true && forbidden.production === true && forbidden.main === true && forbidden.merge === true && request.scope.rules === false && request.scope.production === false && request.scope.main === false && request.scope.merge === false);
  add('EVIDENCE_AND_INTEGRITY', scope.snapshotBeforeAfter === true && scope.readonlyIntegrityBeforeAfter === true && scope.priorFunctionalPassEvidenceRequired === true && scope.functionalReplayForbidden === true && scope.sanitizedEvidence === true && scope.cumulativeVisualCandidate === true);
  add('VIDEO_SYNTHETIC_PASS', videoEvidence.status === 'VIDEO_FRAME_SYNTHETIC_PASS' && videoEvidence.classification === 'GO_PIPELINE_MECHANISM' && videoEvidence.captureEngine === 'playwright-record-video-plus-ffmpeg-static-frame' && videoEvidence.ffmpegSource === 'npm-ffmpeg-static' && videoEvidence.screenshotApiUsed === false && videoEvidence.cdpScreenshotUsed === false && videoEvidence.firebaseCommandsExecuted === false && videoEvidence.deployExecuted === false && videoEvidence.ok === true);
  add('VIDEO_VISUAL_HARNESS', scope.visualVideoRecordingRequired === true && scope.ffmpegStaticRequired === true && scope.screenshotApisForbidden === true && visual.includes('recordVideo:') && visual.includes("import ffmpegPath from 'ffmpeg-static'") && visual.includes('video.path()') && visual.includes("captureEngine: 'playwright-record-video-plus-ffmpeg-static-frame'") && !visual.includes('page.screenshot(') && !visual.includes('Page.captureScreenshot') && !visual.includes('newCDPSession(') && visual.includes('VIDEO_CONTEXT_CLOSE_TIMEOUT') && visual.includes('VIDEO_FRAME_${item.route}_INVALID_PNG'));
  add('SOURCE_CONTRACT_PASS', sourceEvidence.status === 'VIDEO_VISUAL_CONTRACT_SOURCE_PASS' && sourceEvidence.contractVersion === VERSION && sourceEvidence.engine === expectedEngine && sourceEvidence.videoSyntheticRunId === 30969402434 && sourceEvidence.ok === true);
  add('DEPLOY_PIPELINE', scope.artifactCleanupPolicyAutomatic === true && scope.postDeployFunctionVerificationRequired === true && workflow.includes('firebase deploy') && workflow.includes('--force') && workflow.includes('test "$VERIFIED" = 4') && workflow.includes('VISUAL_READONLY_INTEGRITY_PASS') && workflow.includes('functions:delete') && workflow.includes('hosting:channel:delete') && workflow.includes('ffmpeg-static@5.2.0'));
  add('REAL_TENANT_LOADER', loader.includes("var allowedTenants = ['alianzas-soluciones']") && loader.includes('isOperationalVerificationPreviewHost') && loader.includes("requestedTenant = params.get('tenant') || 'alianzas-soluciones'") && index.includes('backend-lab-loader.js?v=20260804-operational-rootfix9'));
  add('FUNCTIONS_SDK_CONTRACT', scope.firebaseFunctionsCompatSdkRequired === true && loader.includes('firebase-functions-compat.js') && center.includes("typeof firebase.functions !== 'function'"));
  add('FUNCTIONS_DEPENDENCY_PASS', scope.functionsPackageLockRequired === true && scope.functionsBootstrapLoadPassRequired === true && dependencyEvidence.status === 'FUNCTIONS_BOOTSTRAP_LOAD_PASS' && dependencyEvidence.requiredFunctionExports === true && dependencyEvidence.broadV2AggregatorLoaded === false && dependencyEvidence.unusedDatabaseProviderLoaded === false && dependencyEvidence.lockfileVersion >= 3 && dependencyEvidence.ok === true);
  add('REQUIRED_FILES', REQUIRED.every(exists), REQUIRED.filter(rel => !exists(rel)).join(','));
  add('FUNCTION_EXPORTS_PRESENT', EXPECTED_FUNCTIONS.every(name => functionSources.includes(`exports.${name}`)));
  add('IMPORT_IDEMPOTENCY_RESPONSE', !recurringSource.includes('Object.assign({ reused: true }, priorReq.data().result || {})') && recurringSource.includes('Object.assign({}, priorReq.data().result || {}, { reused: true })'));
  add('PREVIOUS_FUNCTIONAL_PASS', priorFunctional.sourceRunId === 30962756387 && priorFunctional.runtime.status === 'OPERATIONAL_RUNTIME_BROWSER_PASS' && priorFunctional.runtime.passed === 18 && priorFunctional.runtime.failed === 0 && priorFunctional.cleanup.rollbackExact === true && priorFunctional.cleanup.realTenantUnchanged === true && priorFunctional.ok === true);
  add('REGISTRY_ROUTER_SYNC', hasGateVersion(registry, GATE, VERSION, expectedEngine) && router.includes(`"${GATE}":{contractVersion:"${VERSION}",lifecycle:"${LIFECYCLE}",engine:"${expectedEngine}"}`));
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
    status: ok ? 'GO_GATE_CONTRACT' : 'VALIDATOR_STALE',
    classification: ok ? 'OPERATIONAL_RUNTIME_LAB_VIDEO_VISUAL_READY' : 'VALIDATOR_STALE',
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
    visualOnlyAuthorized: false,
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
fs.writeFileSync(OUT, JSON.stringify({
  ...result,
  canonicalEntrypoint: 'tools/orbit360-validar-gate-contracts-v20260717.mjs',
  canonicalEngine: 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-video-lab-v20260804.mjs',
  canonicalLifecycleContract: LIFECYCLE,
  canonicalLifecycleComposition: 'phase-capability-contract-v1',
  engineEvidenceSource: 'sync-file-evidence-not-stdout-v1',
  engineStdoutParsed: false,
  sourceTransformed: false,
  operationalWrites: 0,
  evidenceWrites: 1,
  secretsRead: false,
  rulesApplied: false
}, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'GO_GATE_CONTRACT') process.exitCode = 42;
