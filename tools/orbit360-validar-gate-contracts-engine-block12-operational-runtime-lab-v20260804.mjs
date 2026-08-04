#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block12-operational-runtime-lab-v20260804';
const VERSION = '12.0.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-v20260804.json';
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
  '.github/workflows/orbit360-block12-operational-runtime-lab-v20260804.yml'
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
let result;
try {
  const lifecycle = readJson(LIFECYCLE);
  const request = readJson(REQUEST);
  const capabilities = lifecycle.executionProfile && lifecycle.executionProfile.capabilities || {};
  const scope = lifecycle.scope || {};
  const forbidden = lifecycle.forbidden || {};
  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_ACTIVE', lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_AUTHORIZED' && lifecycle.singleGate === true && lifecycle.macroClosure === true);
  add('CAPABILITIES_EXACT', lifecycle.executionProfile.phase === 'OPERATIONAL_RUNTIME_LAB_EXECUTION' && capabilities.secrets === true && capabilities.firestoreRead === true && capabilities.writes === true && capabilities.runtime === true && capabilities.browser === true && capabilities.deploy === true && capabilities.functionsDeploy === true && capabilities.rulesDeploy === false && capabilities.production === false);
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-block12-operational-runtime-lab-request-v1' && request.status === 'AUTHORIZED' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.authorizationRef === lifecycle.authorization.source);
  add('REQUEST_BINDING', request.branch === scope.branch && request.pullRequest === scope.pullRequest && request.projectId === scope.projectId && request.gateId === GATE && request.contractVersion === VERSION && request.parentHead === git(['rev-parse', 'HEAD^']));
  add('SYNTHETIC_BOUNDARY', request.scope.syntheticTenantOnly === true && request.scope.maximumSyntheticAuthUsers === 3 && request.scope.maximumSyntheticMemberships === 3 && request.scope.realTenantWrites === false && request.scope.realDataReimport === false);
  add('FUNCTION_ALLOWLIST', equal([].concat(request.scope.functionNames || []).sort(), EXPECTED_FUNCTIONS.slice().sort()) && equal([].concat(scope.exactFunctionNames || []).sort(), EXPECTED_FUNCTIONS.slice().sort()));
  add('HOSTING_BOUNDARY', request.scope.hostingPreviewOnly === true && request.scope.hostingChannel === scope.hostingChannel && request.scope.productionHosting === false);
  add('FORBIDDEN_BOUNDARY', forbidden.rulesDeploy === true && forbidden.realTenantWrites === true && forbidden.realDataReimport === true && forbidden.production === true && forbidden.main === true && forbidden.merge === true && request.scope.rules === false && request.scope.production === false && request.scope.main === false && request.scope.merge === false);
  add('EVIDENCE_AND_ROLLBACK', scope.snapshotBeforeAfter === true && scope.rollbackSyntheticTenant === true && scope.rollbackSyntheticAuth === true && scope.inPlatformVerificationCenter === true && scope.autoRunSupported === true && scope.sanitizedEvidence === true && scope.cumulativeVisualCandidate === true);
  add('REQUIRED_FILES', REQUIRED.every(exists), REQUIRED.filter(rel => !exists(rel)).join(','));
  const functionSources = ['functions/ops-leads-domain.js','functions/ops-advisor-inbox.js','functions/cobros-reconciliation-domain.js','functions/recurring-insurance-import.js'].map(readText).join('\n');
  add('FUNCTION_EXPORTS_PRESENT', EXPECTED_FUNCTIONS.every(name => functionSources.includes(`exports.${name}`)));
  const backend = readText('orbit360-platform/core/backend-lab-init.js');
  add('CLIENT_FLAGS_AND_CENTER', /opsLeadsDomainBackendActive:\s*true/.test(backend) && /cobrosReconciliationDomainActive:\s*true/.test(backend) && /recurringInsuranceImportActive:\s*true/.test(backend) && backend.includes('runtime-verification-center-v20260804.js'));
  const center = readText('orbit360-platform/core/runtime-verification-center-v20260804.js');
  add('IN_PLATFORM_SCENARIOS', ['OP-001','SEC-001','NTF-001','IMP-001','PAY-001','SYS-999','VEREDICTO'].every(token => center.includes(token)));
  add('NO_TENANT_DATA_IN_CENTER', !/AseGuate|El Roble|La Ceiba|Universales|Mapfre|Paula|Carlos|Samuel|Fernando|430 clientes|365|235/.test(center));
  add('BRANCH_PR_HEAD', git(['rev-parse', '--abbrev-ref', 'HEAD']) === scope.branch && request.pullRequest === 5);
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
    writeAuthorized: ok,
    authWriteAuthorized: ok,
    maximumSyntheticAuthUsers: ok ? 3 : 0,
    maximumSyntheticMemberships: ok ? 3 : 0,
    runtimeAuthorized: ok,
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
