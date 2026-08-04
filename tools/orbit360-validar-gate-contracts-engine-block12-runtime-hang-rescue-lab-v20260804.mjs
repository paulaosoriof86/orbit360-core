#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const GATE = 'block12-runtime-hang-rescue-lab-v20260804';
const VERSION = '12.0.4';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-block12-runtime-hang-rescue-lab-v20260804.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-runtime-hang-rescue-rootfix-lab-v20260804.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const EXPECTED_FUNCTIONS = [
  'orbit360OpsLeadsCommandLabV20260804',
  'orbit360GetAdvisorOpsInboxLabV20260804',
  'orbit360CobrosReconciliationCommandLabV20260804',
  'orbit360RecurringInsuranceImportLabV20260804'
];
const EXPECTED_USERS = [
  'zztest_block12_30956309298_direction',
  'zztest_block12_30956309298_advisorA',
  'zztest_block12_30956309298_advisorB'
];
const readJson = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail: String(detail || '').slice(0, 500) });
let result;
try {
  const lifecycle = readJson(LIFECYCLE);
  const request = readJson(REQUEST);
  const caps = lifecycle.executionProfile?.capabilities || {};
  const scope = lifecycle.scope || {};
  const forbidden = lifecycle.forbidden || {};
  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_ACTIVE', lifecycle.status === 'RUNTIME_HANG_RESCUE_LAB_ROOTFIX_READY' && lifecycle.singleGate === true);
  add('CAPABILITIES_EXACT', caps.secrets === true && caps.firestoreRead === true && caps.writes === true && caps.runtime === false && caps.browser === false && caps.deploy === true && caps.functionsDeploy === true && caps.rulesDeploy === false && caps.production === false && Object.keys(caps).length === 9);
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-block12-runtime-hang-rescue-rootfix-request-v1' && request.status === 'AUTHORIZED_RUNTIME_HANG_RESCUE_ROOTFIX' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.previousRescueRunId === 30959160007 && request.previousRescueStoppedBeforeSecrets === true && request.previousFailureCode === 'CANONICAL_LIFECYCLE_PHASE_MISMATCH' && request.authorizationRef === lifecycle.authorization.source);
  add('TARGET_RUN', request.targetRunId === 30956309298 && scope.targetRunId === 30956309298 && request.previousStatus === 'in_progress' && request.previousStep === 'Ejecutar pruebas dentro de Orbit 360');
  add('BRANCH_PROJECT', request.branch === scope.branch && request.projectId === scope.projectId && request.pullRequest === 5 && String(process.env.GITHUB_REF_NAME || process.env.ORBIT360_BRANCH || '') === scope.branch);
  add('SYNTHETIC_IDS', request.syntheticTenantId === scope.syntheticTenantId && scope.syntheticTenantId === 'verify-block12-30956309298' && equal([...(request.syntheticUserIds || [])].sort(), EXPECTED_USERS.slice().sort()) && equal([...(scope.syntheticUserIds || [])].sort(), EXPECTED_USERS.slice().sort()));
  add('FUNCTION_ALLOWLIST', equal([...(request.functionNames || [])].sort(), EXPECTED_FUNCTIONS.slice().sort()) && equal([...(scope.exactFunctionNames || [])].sort(), EXPECTED_FUNCTIONS.slice().sort()));
  add('HOSTING_BOUNDARY', request.hostingChannel === 'orbit360-operational-block12' && scope.hostingChannel === request.hostingChannel);
  add('CLEANUP_SCOPE', scope.cancelTargetRun === true && scope.snapshotRealTenantBeforeAfter === true && scope.cleanupSyntheticTenant === true && scope.cleanupSyntheticAuth === true && scope.cleanupFunctions === true && scope.cleanupHostingPreview === true && scope.sanitizedEvidence === true);
  add('FORBIDDEN_BOUNDARY', forbidden.rulesDeploy === true && forbidden.realTenantWrites === true && forbidden.realDataReimport === true && forbidden.production === true && forbidden.main === true && forbidden.merge === true && forbidden.browserExecution === true && forbidden.newFunctionalFixture === true && request.rules === false && request.realTenantWrites === false && request.realDataReimport === false && request.production === false && request.main === false && request.merge === false);
  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion: 'orbit360-block12-runtime-hang-rescue-preflight-v2', gateId: GATE, contractVersion: VERSION,
    status: ok ? 'GO_GATE_CONTRACT' : 'VALIDATOR_STALE', classification: ok ? 'RUNTIME_HANG_RESCUE_READY' : 'VALIDATOR_STALE',
    total: checks.length, passed: checks.length - failed.length, failed: failed.length, failedCheckIds: failed.map(item => item.id), checks,
    executionAuthorized: ok, secretAccessAuthorized: ok, firestoreReadAuthorized: ok, writeAuthorized: ok, authWriteAuthorized: ok,
    deployDeleteAuthorized: ok, runtimeAuthorized: false, browserAuthorized: false, rulesDeployAuthorized: false, productionAuthorized: false,
    realTenantWritesAuthorized: false, realDataReimportAuthorized: false, targetRunId: ok ? 30956309298 : null,
    exactFunctionNames: ok ? EXPECTED_FUNCTIONS : [], syntheticTenantId: ok ? scope.syntheticTenantId : '', syntheticUserIds: ok ? EXPECTED_USERS : [],
    dataAccess: false, secretAccess: false, firestoreRead: false, firestoreWrites: 0, authWrites: 0, deployExecuted: false,
    productionTouched: false, containsPII: false, containsSecrets: false
  };
} catch (error) {
  result = { schemaVersion: 'orbit360-block12-runtime-hang-rescue-preflight-v2', gateId: GATE, contractVersion: VERSION, status: 'VALIDATOR_STALE', classification: 'PIPELINE_MECHANISM_FAILURE', error: String(error?.message || error).replace(/[\r\n]+/g, ' ').slice(0, 500), executionAuthorized: false, secretAccessAuthorized: false, firestoreReadAuthorized: false, writeAuthorized: false, authWriteAuthorized: false, deployDeleteAuthorized: false, runtimeAuthorized: false, browserAuthorized: false, rulesDeployAuthorized: false, productionAuthorized: false, dataAccess: false, secretAccess: false, firestoreRead: false, firestoreWrites: 0, authWrites: 0, deployExecuted: false, productionTouched: false, containsPII: false, containsSecrets: false };
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'GO_GATE_CONTRACT' ? 0 : 41);
