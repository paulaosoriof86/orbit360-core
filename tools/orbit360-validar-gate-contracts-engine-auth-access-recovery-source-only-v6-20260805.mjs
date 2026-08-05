#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block-auth-access-recovery-source-only-v6-20260805';
const VERSION = '13.5.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-source-only-v6-20260805.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/auth-access-recovery-source-only-v6-20260805.json';
const WORKFLOW = '.github/workflows/orbit360-auth-access-recovery-lab-v3-20260805.yml';
const ACTOR = 'tools/orbit360-auth-access-actor-parity-precheck-v6-20260805.mjs';
const CALLABLE = 'tools/orbit360-auth-callable-error-contract-v6-20260805.mjs';
const PATCHER = 'tools/orbit360-patch-auth-callable-error-propagation-v6-20260805.mjs';
const PERSISTER = 'tools/orbit360-auth-access-evidence-safe-persist-v6-20260805.mjs';
const TEST = 'tools/orbit360-test-auth-source-only-v6-20260805.mjs';
const RECOVERY = 'tools/orbit360-auth-access-recovery-lab-v20260805.mjs';
const FUNCTION = 'functions/user-onboarding.js';
const V5_LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v5-20260805.json';
const V5_DUAL = 'orbit360-platform/runtime-gate-crm-v20260716/auth-access-v5-dual-rootcause-sanitized-v20260805.json';
const FUTURE_RUNTIME = '.github/orbit360-requests/auth-access-recovery-lab-v7-20260805.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const ZERO = Object.freeze({ secrets:false, firestoreRead:false, writes:false, runtime:false, browser:false, deploy:false, functionsDeploy:false, rulesDeploy:false, production:false });
const PRIOR = Object.freeze([
  ['.github/orbit360-requests/auth-access-recovery-lab-v20260805.json', 'fffef59bd6065390d1e8b28128754a06d94340b5', 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v20260805.json'],
  ['.github/orbit360-requests/auth-access-recovery-lab-v2-20260805.json', 'fd5963242de542105dd764371cf501f6814481e6', 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v2-20260805.json'],
  ['.github/orbit360-requests/auth-access-recovery-lab-v3-20260805.json', 'f8363197646dc4046fda1933af535110270703ae', 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v3-20260805.json'],
  ['.github/orbit360-requests/auth-access-recovery-source-only-v4-20260805.json', 'ad16d2b1fe41c88929eab59a6f92a6bdface08ad', 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-source-only-v4-20260805.json'],
  ['.github/orbit360-requests/auth-access-recovery-lab-v5-20260805.json', 'e4112b831cb6aec65c9232cdcc5c73c88b07c27f', V5_LIFECYCLE]
]);

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok:Boolean(ok), detail:String(detail || '').slice(0, 700) });
const rel = value => path.join(ROOT, value);
const exists = value => fs.existsSync(rel(value));
const read = value => JSON.parse(fs.readFileSync(rel(value), 'utf8'));
const text = value => fs.readFileSync(rel(value), 'utf8');
const git = args => execFileSync('git', args, { cwd:ROOT, encoding:'utf8' }).trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let result;
try {
  const lifecycle = read(LIFECYCLE);
  const request = read(REQUEST);
  const workflow = text(WORKFLOW);
  const actor = text(ACTOR);
  const callable = text(CALLABLE);
  const persister = text(PERSISTER);
  const recovery = text(RECOVERY);
  const onboarding = text(FUNCTION);
  const v5Lifecycle = read(V5_LIFECYCLE);
  const v5Dual = read(V5_DUAL);
  const cap = lifecycle.executionProfile?.capabilities || {};
  const scope = request.scope || {};
  const changed = git(['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']).split(/\r?\n/).filter(Boolean);
  const parent = git(['rev-parse', 'HEAD^']);

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_AUTHORIZED_ONCE', lifecycle.status === 'AUTH_ACCESS_RECOVERY_SOURCE_ONLY_V6_AUTHORIZED_ONCE' && lifecycle.authorization?.activeRequest === true && lifecycle.authorization?.allowedExecutions === 1 && lifecycle.authorization?.consumed === false && lifecycle.authorization?.replayAllowed === false);
  add('ZERO_CAPABILITIES', same(cap, ZERO));
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-auth-access-recovery-source-only-request-v6' && request.gateId === GATE && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false);
  add('REQUEST_BINDING', request.rcId === 'RC-AYS-LAB-CANONICA-01' && request.branch === 'ays/backend-tenant-lab-v99-20260703' && request.pullRequest === 5 && request.parentHead === parent);
  add('REQUEST_SINGLE_FILE_COMMIT', changed.length === 1 && changed[0] === REQUEST, changed.join(','));
  add('SOURCE_SCOPE_POSITIVE', scope.validateRequest === true && scope.validateProvenance === true && scope.validateCanonicalPreflight === true && scope.validateActorAuthorizationParity === true && scope.validateOnboardingErrorCodePropagation === true && scope.validateConditionalEvidencePersistence === true && scope.validateTriStateIntegrity === true && scope.validateSourceFixtures === true);
  add('SOURCE_SCOPE_NEGATIVE', scope.secrets === false && scope.firebase === false && scope.firestore === false && scope.auth === false && scope.functions === false && scope.hosting === false && scope.browser === false && scope.deploy === false && scope.rules === false && scope.reimport === false && scope.crm === false && scope.production === false && scope.main === false && scope.merge === false);

  let priorOk = true;
  const priorDetails = [];
  for (const [file, expectedBlob, lifecycleFile] of PRIOR) {
    const actualBlob = git(['hash-object', file]);
    const priorLifecycle = read(lifecycleFile);
    const consumed = priorLifecycle.authorization?.consumed === true && priorLifecycle.authorization?.allowedExecutions === 0 && priorLifecycle.authorization?.replayAllowed === false;
    priorOk = priorOk && actualBlob === expectedBlob && consumed;
    priorDetails.push(`${path.basename(file)}:${actualBlob}:${consumed}`);
  }
  add('PRIOR_REQUESTS_IMMUTABLE_AND_CONSUMED', priorOk, priorDetails.join('|'));
  add('V5_STOP_RETRY_PREREQUISITE', v5Lifecycle.status === 'AUTH_ACCESS_RECOVERY_V5_CONSUMED_STOP_RETRY' && v5Lifecycle.executionResult?.onboardingCallPassed === false && v5Lifecycle.authorization?.consumed === true && v5Lifecycle.authorization?.replayAllowed === false);
  add('V5_DUAL_ROOTCAUSE_PRESENT', v5Dual.primaryRootCause?.classification === 'FUNCTIONAL_DEFECT' && v5Dual.secondaryRootCause?.classification === 'PIPELINE_MECHANISM_FAILURE' && v5Dual.authorization?.rerunExecuted === false);
  add('FUTURE_RUNTIME_REQUEST_ABSENT', !exists(FUTURE_RUNTIME));

  const bannedWorkflow = ['${{ secrets.', 'firebase deploy', 'firebase functions:list', 'GOOGLE_APPLICATION_CREDENTIALS', 'firebase-admin', 'google-auth-library', 'playwright', 'curl ', 'wget ', 'gcloud ', 'npm install', 'npm ci'];
  add('WORKFLOW_REUSED_V6_PATH', workflow.includes(".github/orbit360-requests/auth-access-recovery-source-only-v6-20260805.json") && !workflow.includes("paths:\n      - '.github/orbit360-requests/auth-access-recovery-lab-v5-20260805.json'"));
  add('WORKFLOW_ZERO_CAPABILITIES', bannedWorkflow.every(token => !workflow.includes(token)), bannedWorkflow.filter(token => workflow.includes(token)).join(','));
  add('WORKFLOW_FULL_HISTORY', workflow.includes('fetch-depth: 0'));
  add('WORKFLOW_CANONICAL_GATE', workflow.includes('node tools/orbit360-validar-gate-contracts-v20260717.mjs "$ORBIT360_GATE_ID"'));
  add('WORKFLOW_NO_REQUEST_MUTATION', !workflow.includes('git add "$ORBIT360_REQUEST_FILE"') && !workflow.includes('git add .github/orbit360-requests'));

  const required = [ACTOR, CALLABLE, PATCHER, PERSISTER, TEST, RECOVERY, FUNCTION, LIFECYCLE, V5_DUAL, WORKFLOW];
  add('REQUIRED_FILES_PRESENT', required.every(exists), required.filter(file => !exists(file)).join(','));

  const actorChecks = ['tenantMatch', 'statusActive', 'activeRoleAssigned', 'roleOrPermissionAuthorized', 'actorIdentityPresent'];
  add('ACTOR_PARITY_EXACT', actorChecks.every(token => actor.includes(token)) && actor.includes("PRIVILEGED_ROLES") && actor.includes("MANAGE_PERMISSIONS") && actor.includes("activeRoleAssigned") && actor.includes("tenantMatch && statusActive && activeRoleAssigned && (roleAuthorized || permissionAuthorized) && actorIdentityPresent"));
  add('ACTOR_PARITY_MATCHES_CALLABLE', onboarding.includes("text(member.tenantId, 160) !== tenantId") && onboarding.includes("!['active', 'activo'].includes(normalized(member.status, 40))") && onboarding.includes('!assigned.includes(activeRole)') && onboarding.includes('if (!roleAllowed && !permissionAllowed)'));

  add('CALLABLE_HTTP_STATUS_PROPAGATION', callable.includes('httpStatus') && callable.includes('Number(httpStatus)') && recovery.includes('throw buildOnboardingCallFailure(response.status, body);'));
  add('CALLABLE_STATUS_PROPAGATION', callable.includes('callableStatus') && callable.includes('responseBody?.error?.status') && recovery.includes('callableStatus: callableFailure.callableStatus'));
  add('CALLABLE_ERROR_CODE_PROPAGATION', callable.includes('errorCode') && callable.includes('ONBOARDING_CALL_FAILED_') && recovery.includes('errorCode: callableFailure.errorCode'));
  add('CALLABLE_SANITIZATION', callable.includes("replace(/[\\w.+-]+@[\\w.-]+/g, '[email]')") && callable.includes("replace(/https?:\\/\\/\\S+/g, '[url]')"));

  add('CONDITIONAL_EVIDENCE_READS', persister.includes("fs.existsSync(file) ? JSON.parse") && persister.includes('optionalEvidencePresent'));
  add('CONDITIONAL_EVIDENCE_PERSIST_LIST', persister.includes('filesToPersist') && persister.includes("filter(file => file && fs.existsSync(file))"));
  add('TRISTATE_INTEGRITY', ['VERIFIED_UNCHANGED', 'VERIFIED_CHANGED', 'NOT_POSTVERIFIED'].every(token => persister.includes(token)));
  add('MISSING_SCOPE_NOT_FALSE_CHANGE', persister.includes("auth?.protectedCrmDataUnchanged === false ? 'VERIFIED_CHANGED' : 'NOT_POSTVERIFIED'"));
  add('LIFECYCLE_CONSUMPTION_SAFE', persister.includes("lifecycle.authorization.allowedExecutions = 0") && persister.includes('lifecycle.authorization.consumed = true'));

  let testResult = null;
  try {
    testResult = JSON.parse(execFileSync(process.execPath, [TEST], { cwd:ROOT, encoding:'utf8' }).trim());
  } catch (error) {
    testResult = { ok:false, error:String(error?.stderr || error?.message || error).slice(0,500) };
  }
  add('SOURCE_FIXTURES_PASS', testResult?.ok === true && testResult?.actorParityCases === 2 && testResult?.callableErrorPropagationCases === 1 && testResult?.evidencePersistenceCases === 3, JSON.stringify(testResult));
  add('TRISTATE_FIXTURES_PASS', same(testResult?.integrityStatesVerified, ['VERIFIED_UNCHANGED','VERIFIED_CHANGED','NOT_POSTVERIFIED']));
  add('SOURCE_FIXTURES_ZERO_CAPABILITIES', testResult?.operationalCapabilitiesUsed === 0);

  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion:'orbit360-auth-access-recovery-source-only-gate-v6',
    gateId:GATE,
    contractVersion:VERSION,
    status:ok ? 'GO_GATE_CONTRACT' : 'STOP_RETRY',
    classification:ok ? 'AUTH_ACCESS_SOURCE_ONLY_V6_READY' : 'PIPELINE_MECHANISM_FAILURE',
    total:checks.length,
    passed:checks.length - failed.length,
    failed:failed.length,
    failedCheckIds:failed.map(item => item.id),
    checks,
    executionAuthorized:false,
    secretAccessAuthorized:false,
    firestoreReadAuthorized:false,
    writeAuthorized:false,
    authWriteAuthorized:false,
    runtimeAuthorized:false,
    browserAuthorized:false,
    deployAuthorized:false,
    functionsDeployAuthorized:false,
    hostingDeployAuthorized:false,
    rulesDeployAuthorized:false,
    productionAuthorized:false,
    dataAccess:false,
    secretAccess:false,
    firestoreRead:false,
    firestoreWrites:0,
    authReads:0,
    authWrites:0,
    runtimeExecuted:false,
    browserExecuted:false,
    deployExecuted:false,
    productionTouched:false,
    priorRequestsVerified:5,
    actorAuthorizationParityValidated:checks.find(item => item.id === 'ACTOR_PARITY_EXACT')?.ok === true && checks.find(item => item.id === 'ACTOR_PARITY_MATCHES_CALLABLE')?.ok === true,
    callableErrorPropagationValidated:checks.find(item => item.id === 'CALLABLE_HTTP_STATUS_PROPAGATION')?.ok === true && checks.find(item => item.id === 'CALLABLE_STATUS_PROPAGATION')?.ok === true && checks.find(item => item.id === 'CALLABLE_ERROR_CODE_PROPAGATION')?.ok === true,
    conditionalEvidencePersistenceValidated:checks.find(item => item.id === 'CONDITIONAL_EVIDENCE_READS')?.ok === true && checks.find(item => item.id === 'CONDITIONAL_EVIDENCE_PERSIST_LIST')?.ok === true,
    triStateIntegrityValidated:checks.find(item => item.id === 'TRISTATE_FIXTURES_PASS')?.ok === true,
    futureRuntimeRequestAbsent:!exists(FUTURE_RUNTIME),
    sourceFixtures:testResult,
    containsPII:false,
    containsSecrets:false,
    ok
  };
} catch (error) {
  result = {
    schemaVersion:'orbit360-auth-access-recovery-source-only-gate-v6',
    gateId:GATE,
    contractVersion:VERSION,
    status:'STOP_RETRY',
    classification:'PIPELINE_MECHANISM_FAILURE',
    error:String(error?.message || error).replace(/[\r\n]+/g,' ').replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,700),
    executionAuthorized:false,
    secretAccessAuthorized:false,
    firestoreReadAuthorized:false,
    writeAuthorized:false,
    authWriteAuthorized:false,
    runtimeAuthorized:false,
    browserAuthorized:false,
    deployAuthorized:false,
    functionsDeployAuthorized:false,
    hostingDeployAuthorized:false,
    rulesDeployAuthorized:false,
    productionAuthorized:false,
    dataAccess:false,
    secretAccess:false,
    firestoreRead:false,
    firestoreWrites:0,
    authReads:0,
    authWrites:0,
    runtimeExecuted:false,
    browserExecuted:false,
    deployExecuted:false,
    productionTouched:false,
    containsPII:false,
    containsSecrets:false,
    ok:false
  };
}

fs.mkdirSync(path.dirname(OUT), { recursive:true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'GO_GATE_CONTRACT' ? 0 : 41);
