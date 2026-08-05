#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block-auth-foundation-all-team-runtime-v20260805';
const VERSION = '13.7.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-foundation-all-team-runtime-v20260805.json';
const SOURCE_LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-foundation-all-team-source-only-v20260805.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/auth-foundation-all-team-runtime-v20260805.json';
const OWNER = 'tools/orbit360-auth-foundation-all-team-runtime-v20260805.mjs';
const PLAN = 'tools/orbit360-auth-foundation-all-team-plan-v20260805.mjs';
const TEST = 'tools/orbit360-test-auth-foundation-all-team-runtime-source-v20260805.mjs';
const FUNCTION = 'functions/user-onboarding.js';
const WORKFLOW = '.github/workflows/orbit360-auth-foundation-all-team-runtime-v20260805.yml';
const OLD_V7 = '.github/orbit360-requests/auth-access-recovery-lab-v7-20260805.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const CAP = Object.freeze({ secrets:true, firestoreRead:true, writes:true, runtime:true, browser:false, deploy:true, functionsDeploy:true, rulesDeploy:false, production:false });
const ALLOWED_FIELDS = ['authUid','accessProvisioned','accessState','onboardingState','invitacionEstado','membershipStatus','accessErrorCode','accessLastAttemptAt','accessOnboardingVersion'];

const checks = [];
const add = (id, ok, detail='') => checks.push({ id, ok:Boolean(ok), detail:String(detail || '').slice(0,700) });
const rel = file => path.join(ROOT, file);
const exists = file => fs.existsSync(rel(file));
const read = file => JSON.parse(fs.readFileSync(rel(file), 'utf8'));
const text = file => fs.readFileSync(rel(file), 'utf8');
const git = args => execFileSync('git', args, { cwd:ROOT, encoding:'utf8' }).trim();
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);

let result;
try {
  const lifecycle = read(LIFECYCLE);
  const sourceLifecycle = read(SOURCE_LIFECYCLE);
  const request = read(REQUEST);
  const owner = text(OWNER);
  const plan = text(PLAN);
  const workflow = text(WORKFLOW);
  const onboarding = text(FUNCTION);
  const changed = git(['diff-tree','--no-commit-id','--name-only','-r','HEAD']).split(/\r?\n/).filter(Boolean);
  const parent = git(['rev-parse','HEAD^']);
  const scope = request.scope || {};

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_AUTHORIZED_ONCE', lifecycle.status === 'AUTH_FOUNDATION_ALL_TEAM_RUNTIME_AUTHORIZED_ONCE' && lifecycle.authorization?.activeRequest === true && lifecycle.authorization?.allowedExecutions === 1 && lifecycle.authorization?.consumed === false && lifecycle.authorization?.replayAllowed === false);
  add('RUNTIME_CAPABILITIES_EXACT', same(lifecycle.executionProfile?.capabilities || {}, CAP));
  add('SOURCE_ONLY_PREREQUISITE_PASS', sourceLifecycle.status === 'AUTH_FOUNDATION_ALL_TEAM_SOURCE_ONLY_CONSUMED_PASS' && sourceLifecycle.executionResult?.decision === 'GO_AUTH_FOUNDATION_ALL_TEAM_CONTROL_PLANE' && sourceLifecycle.executionResult?.ok === true && sourceLifecycle.authorization?.consumed === true && sourceLifecycle.authorization?.replayAllowed === false);
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-auth-foundation-all-team-runtime-request-v1' && request.gateId === GATE && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false);
  add('REQUEST_BINDING', request.rcId === 'RC-AYS-LAB-CANONICA-01' && request.branch === 'ays/backend-tenant-lab-v99-20260703' && request.pullRequest === 5 && request.projectId === 'ays-orbit-360-lab' && request.tenantId === 'alianzas-soluciones' && request.parentHead === parent);
  add('REQUEST_SINGLE_FILE_COMMIT', changed.length === 1 && changed[0] === REQUEST, changed.join(','));
  add('OLD_RECOVERY_V7_ABSENT', !exists(OLD_V7));
  add('REQUEST_SCOPE_POSITIVE', scope.realCensusAllActiveTeam === true && scope.requireExactlySeven === true && scope.adminSdkBootstrap === true && scope.createOrLinkMissingIdentities === true && scope.reconcileSevenMemberships === true && scope.linkSevenTeamRecords === true && scope.sendSevenPasswordEmails === true && scope.verifySevenSessions === true && scope.verifyThreeFunctionalProfiles === true && scope.deployOnlyOnboardingFunctionIfAbsent === true && scope.verifyFutureOnboardingReadiness === true && scope.crmSnapshotIntegrity === true && scope.exactRollback === true);
  add('REQUEST_SCOPE_NEGATIVE', scope.syntheticUsers === false && scope.hardcodedPeople === false && scope.temporaryPasswords === false && scope.otherFunctions === false && scope.hosting === false && scope.rules === false && scope.reimport === false && scope.crmWrites === false && scope.production === false && scope.main === false && scope.merge === false);
  add('COVERAGE_SEVEN', lifecycle.coverageContract?.currentActiveTeamExpected === 7 && lifecycle.coverageContract?.currentIdentityCoverageRequired === '7/7');
  add('FUNCTIONAL_PROFILES_THREE', same(lifecycle.coverageContract?.functionalRoleProfilesRequired, ['direccion','operativo','asesor']) && lifecycle.coverageContract?.functionalProfileCoverageRequired === '3/3');
  add('OWNER_GENERIC_NO_PERSON_HARDCODE', !/(Paula|Carlos|Samuel|Fernando)/i.test(owner));
  add('OWNER_EXACT_SEVEN_GUARD', owner.includes('ORBIT360_EXPECTED_TEAM_USERS || 7') && owner.includes('targets.length === EXPECTED') && owner.includes('new Set(state.targets.map(item => item.uid)).size !== EXPECTED'));
  add('OWNER_DYNAMIC_TEAM_SOURCES', ['canonical','legacy_tenantId_asesores','legacy_tenants_asesores'].every(token => owner.includes(token)));
  add('OWNER_ADMIN_SDK_BOOTSTRAP', owner.includes('auth.createUser({ email: item.normalized.email') && !owner.includes('orbit360ProvisionTeamAccess'));
  add('OWNER_NO_TEMP_PASSWORD', !/createUser\(\{[^}]*password\s*:/s.test(owner));
  add('OWNER_READ_ALL_VALIDATE_ALL_WRITE_ALL', owner.includes("transactionStrategy: 'READ_ALL_VALIDATE_ALL_WRITE_ALL'") && owner.indexOf('memberSnaps.push(await tx.get(ref))') < owner.indexOf('tx.set(memberRefs[index]') && owner.indexOf('teamSnaps.push(await tx.get(ref))') < owner.indexOf('tx.set(teamRefs[index]'));
  add('OWNER_ALLOWED_TEAM_FIELDS', ALLOWED_FIELDS.every(field => owner.includes(`'${field}'`)) && same(lifecycle.runtimeBoundary?.allowedTeamPatchFields, ALLOWED_FIELDS));
  add('OWNER_PASSWORD_EMAILS', owner.includes('accounts:sendOobCode') && owner.includes("requestType: 'PASSWORD_RESET'") && owner.includes('state.emailsSent.length === EXPECTED'));
  add('OWNER_SEVEN_SESSIONS', owner.includes('auth.createCustomToken') && owner.includes('accounts:signInWithCustomToken') && owner.includes('auth.verifyIdToken') && owner.includes('checks.length === EXPECTED'));
  add('OWNER_ROLLBACK', owner.includes('async function restoreState') && owner.includes('async function rollback') && owner.includes('auth.deleteUser(uid)'));
  add('OWNER_CRM_INTEGRITY', ['clientes','polizas','vehiculos','recibos','cartera','cobros','comisiones','gestiones','leads'].every(token => owner.includes(`['${token}']`) || owner.includes(`'${token}'`)) && owner.includes("'VERIFIED_UNCHANGED'") && owner.includes("'VERIFIED_CHANGED'") && owner.includes("'NOT_POSTVERIFIED'"));
  add('NORMAL_ONBOARDING_SOURCE_PRESENT', onboarding.includes('exports.orbit360ProvisionTeamAccess') || onboarding.includes('onCall') && onboarding.includes('executeProvision'));
  add('FUNCTION_ALLOWLIST_EXACT', lifecycle.runtimeBoundary?.allowedFunction === 'orbit360ProvisionTeamAccess' && lifecycle.runtimeBoundary?.maximumAuthCreates === 7 && lifecycle.runtimeBoundary?.maximumMembershipWrites === 7 && lifecycle.runtimeBoundary?.maximumTeamLinkWrites === 7);
  add('WORKFLOW_REQUEST_PATH', workflow.includes(".github/orbit360-requests/auth-foundation-all-team-runtime-v20260805.json"));
  add('WORKFLOW_FULL_HISTORY', workflow.includes('fetch-depth: 0'));
  add('WORKFLOW_GATE_BEFORE_SECRET', workflow.indexOf('Gate canónico antes de secretos') >= 0 && workflow.indexOf('Gate canónico antes de secretos') < workflow.indexOf('Resolver credencial LAB'));
  add('WORKFLOW_FUNCTION_ONLY', workflow.includes('functions:orbit360ProvisionTeamAccess') && !/functions:[A-Za-z0-9_-]+,functions:/.test(workflow));
  add('WORKFLOW_NO_HOSTING_RULES', !workflow.includes('firebase deploy --only hosting') && !workflow.includes('firebase deploy --only firestore:rules'));
  add('WORKFLOW_STOP_RETRY', workflow.includes('Rollback exacto ante cualquier fallo') && workflow.includes('GITHUB_RUN_ATTEMPT') && workflow.includes("test \"$GITHUB_RUN_ATTEMPT\" = '1'"));

  let fixture = null;
  try { fixture = JSON.parse(execFileSync(process.execPath, [TEST], { cwd:ROOT, encoding:'utf8' }).trim()); }
  catch (error) { fixture = { ok:false, error:String(error?.stderr || error?.message || error).slice(0,500) }; }
  add('SOURCE_FIXTURES_PASS', fixture?.ok === true && fixture?.usersCovered === 7 && fixture?.functionalProfilesCovered === 3 && fixture?.operationalCapabilitiesUsed === 0, JSON.stringify(fixture));

  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion:'orbit360-auth-foundation-all-team-runtime-gate-v1',
    gateId:GATE,
    contractVersion:VERSION,
    status:ok ? 'GO_GATE_CONTRACT' : 'STOP_RETRY',
    classification:ok ? 'AUTH_FOUNDATION_ALL_TEAM_RUNTIME_READY' : 'PIPELINE_MECHANISM_FAILURE',
    total:checks.length,
    passed:checks.length - failed.length,
    failed:failed.length,
    failedCheckIds:failed.map(item => item.id),
    checks,
    executionAuthorized:ok,
    secretAccessAuthorized:ok,
    firestoreReadAuthorized:ok,
    writeAuthorized:ok,
    authWriteAuthorized:ok,
    runtimeAuthorized:ok,
    browserAuthorized:false,
    deployAuthorized:ok,
    functionsDeployAuthorized:ok,
    allowedFunctions:['orbit360ProvisionTeamAccess'],
    hostingDeployAuthorized:false,
    rulesDeployAuthorized:false,
    productionAuthorized:false,
    expectedCurrentUsers:7,
    expectedIdentityCoverage:'7/7',
    expectedFunctionalProfiles:'3/3',
    maximumAuthCreates:7,
    maximumMembershipWrites:7,
    maximumTeamLinkWrites:7,
    passwordEmailsRequired:7,
    sessionsRequired:7,
    transactionStrategy:'READ_ALL_VALIDATE_ALL_WRITE_ALL',
    allowedTeamPatchFields:ALLOWED_FIELDS,
    sourceOnlyPrerequisitePass:checks.find(item => item.id === 'SOURCE_ONLY_PREREQUISITE_PASS')?.ok === true,
    dataAccess:false,
    secretAccess:false,
    firestoreReads:0,
    firestoreWrites:0,
    authReads:0,
    authWrites:0,
    runtimeExecuted:false,
    deployExecuted:false,
    productionTouched:false,
    fixture,
    containsPII:false,
    containsSecrets:false,
    ok
  };
} catch (error) {
  result = {
    schemaVersion:'orbit360-auth-foundation-all-team-runtime-gate-v1',
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
    deployAuthorized:false,
    functionsDeployAuthorized:false,
    hostingDeployAuthorized:false,
    rulesDeployAuthorized:false,
    productionAuthorized:false,
    dataAccess:false,
    secretAccess:false,
    firestoreReads:0,
    firestoreWrites:0,
    authReads:0,
    authWrites:0,
    runtimeExecuted:false,
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
