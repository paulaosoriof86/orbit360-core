#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block-auth-foundation-roster-resolution-and-runtime-v20260805';
const VERSION = '13.8.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-foundation-roster-resolution-and-runtime-v20260805.json';
const PRIOR_LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-foundation-all-team-runtime-v20260805.json';
const PRIOR_REQUEST = '.github/orbit360-requests/auth-foundation-all-team-runtime-v20260805.json';
const PRIOR_REQUEST_BLOB = '72f5280625d6f760076d529a14eadfc15209d169';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/auth-foundation-roster-resolution-and-runtime-v20260805.json';
const OWNER = 'tools/orbit360-auth-foundation-dynamic-team-runtime-v20260805.mjs';
const SOURCEFIX = 'tools/orbit360-apply-dynamic-team-authority-sourcefix-v20260805.mjs';
const RUNTIMEFIX = 'tools/orbit360-apply-dynamic-team-runtime-rootfix-v20260805.mjs';
const TEST = 'tools/orbit360-test-auth-foundation-dynamic-team-runtime-source-v20260805.mjs';
const STORE = 'orbit360-platform/data/store-firestore-lab.local.js';
const INIT = 'orbit360-platform/core/backend-lab-init.js';
const BRIDGE = 'orbit360-platform/core/backend-lab-advisor-write-bridge.js';
const CATALOG = 'orbit360-platform/core/backend-lab-advisor-catalog.js';
const ONBOARDING = 'functions/user-onboarding.js';
const TEAM_BRIDGE = 'orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js';
const WORKFLOW = '.github/workflows/orbit360-auth-foundation-roster-resolution-and-runtime-v20260805.yml';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const CAP = Object.freeze({ secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false });
const TEAM_FIELDS = ['authUid','accessProvisioned','accessState','onboardingState','invitacionEstado','membershipStatus','accessErrorCode','accessLastAttemptAt','accessOnboardingVersion'];

const checks = [];
const add = (id, ok, detail='') => checks.push({ id, ok:Boolean(ok), detail:String(detail || '').slice(0,900) });
const rel = file => path.join(ROOT, file);
const exists = file => fs.existsSync(rel(file));
const read = file => JSON.parse(fs.readFileSync(rel(file), 'utf8'));
const text = file => fs.readFileSync(rel(file), 'utf8');
const git = args => execFileSync('git', args, { cwd:ROOT, encoding:'utf8' }).trim();
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);

let result;
try {
  const lifecycle = read(LIFECYCLE);
  const prior = read(PRIOR_LIFECYCLE);
  const request = read(REQUEST);
  const owner = text(OWNER);
  const store = text(STORE);
  const init = text(INIT);
  const bridge = text(BRIDGE);
  const catalog = text(CATALOG);
  const onboarding = text(ONBOARDING);
  const teamBridge = text(TEAM_BRIDGE);
  const workflow = text(WORKFLOW);
  const changed = git(['diff-tree','--no-commit-id','--name-only','-r','HEAD']).split(/\r?\n/).filter(Boolean);
  const parent = git(['rev-parse','HEAD^']);
  const priorBlob = git(['hash-object',PRIOR_REQUEST]);
  const scope = request.scope || {};

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_AUTHORIZED_ONCE', lifecycle.status === 'AUTH_FOUNDATION_DYNAMIC_TEAM_RUNTIME_AUTHORIZED_ONCE' && lifecycle.authorization?.activeRequest === true && lifecycle.authorization?.allowedExecutions === 1 && lifecycle.authorization?.consumed === false && lifecycle.authorization?.replayAllowed === false);
  add('RUNTIME_CAPABILITIES_EXACT', same(lifecycle.executionProfile?.capabilities || {}, CAP));
  add('PRIOR_RUNTIME_CONSUMED_STOP', prior.status === 'AUTH_FOUNDATION_ALL_TEAM_RUNTIME_CONSUMED_STOP_RETRY' && prior.executionResult?.errorCode === 'TEAM_ROSTER_NOT_READY' && prior.authorization?.consumed === true && prior.authorization?.allowedExecutions === 0 && prior.authorization?.replayAllowed === false);
  add('PRIOR_REQUEST_IMMUTABLE', priorBlob === PRIOR_REQUEST_BLOB, priorBlob);
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-auth-foundation-roster-resolution-and-runtime-request-v1' && request.gateId === GATE && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false);
  add('REQUEST_BINDING', request.rcId === 'RC-AYS-LAB-CANONICA-01' && request.branch === 'ays/backend-tenant-lab-v99-20260703' && request.pullRequest === 5 && request.projectId === 'ays-orbit-360-lab' && request.tenantId === 'alianzas-soluciones' && request.parentHead === parent);
  add('REQUEST_SINGLE_FILE_COMMIT', changed.length === 1 && changed[0] === REQUEST, changed.join(','));
  add('REQUEST_DYNAMIC_SCOPE', scope.authoritativeEquipoSource === true && scope.dynamicActiveUserCount === true && scope.allActiveValidUsers === true && scope.aliasRoutesDiagnosticOnly === true && scope.noExactExpectedCount === true && scope.adminSdkBootstrap === true && scope.createOrLinkMissingIdentities === true && scope.reconcileDynamicMemberships === true && scope.linkDynamicTeamRecords === true && scope.sendDynamicPasswordEmails === true && scope.verifyDynamicSessions === true && scope.verifyObservedFunctionalProfiles === true && scope.deployOnlyOnboardingFunctionIfAbsent === true && scope.verifyFutureOnboardingReadiness === true && scope.crmSnapshotIntegrity === true && scope.exactRollback === true);
  add('REQUEST_PROHIBITIONS', scope.syntheticUsers === false && scope.hardcodedPeople === false && scope.exactBusinessUserCount === false && scope.temporaryPasswords === false && scope.otherFunctions === false && scope.hosting === false && scope.rules === false && scope.reimport === false && scope.crmWrites === false && scope.production === false && scope.main === false && scope.merge === false);
  add('LIFECYCLE_DYNAMIC_COUNT', lifecycle.authorityContract?.teamSource === 'tenantId/{tenantId}/asesores' && lifecycle.authorityContract?.activeCountMode === 'DYNAMIC_AT_RUNTIME' && lifecycle.authorityContract?.exactExpectedUserCount === null && lifecycle.authorityContract?.allActiveValidUsersRequireAccess === true && lifecycle.authorityContract?.aliasRoutesDiagnosticOnly === true);
  add('TECHNICAL_BOUND_NOT_BUSINESS_COUNT', lifecycle.authorityContract?.minimumActiveUsers === 1 && lifecycle.authorityContract?.technicalMaximumActiveUsers === 100 && lifecycle.runtimeBoundary?.passwordEmailsRequired === 'N_ACTIVE_VALID_USERS' && lifecycle.runtimeBoundary?.sessionsRequired === 'N_ACTIVE_VALID_USERS');
  add('STORE_AUTHORITY', store.includes("'asesores'") && store.includes("return CANONICAL_SET.has(collection)\n      ? `tenants/${tenantId}/data/${collection}/items`\n      : `tenantId/${tenantId}/${collection}`") && !/CANONICAL_COLLECTIONS\s*=\s*\[[\s\S]*?'asesores'/.test(store));
  add('INITIAL_OVERLAY_REMOVED', !init.includes("loadScriptOnce('core/backend-lab-advisor-write-bridge.js"));
  add('INITIAL_BRIDGES_EXPLICIT_MIGRATION_ONLY', bridge.includes("orbitInitialAdvisorMigration') === '1'") && catalog.includes("orbitInitialAdvisorMigration') === '1'"));
  add('FIXED_SEVEN_REMOVED', !bridge.includes('config.advisors.length !== 7') && !catalog.includes('config.advisors.length !== 7'));
  add('OWNER_AUTHORITY_EXACT', owner.includes("collection('tenantId').doc(TENANT).collection('asesores')") && owner.includes("authorityPathClass: 'tenantId/{tenantId}/asesores'"));
  add('OWNER_DYNAMIC_COUNT', owner.includes("activeUserCountRule: 'DYNAMIC_FROM_EQUIPO_AUTHORITY'") && owner.includes('activeCount:targets.length') && !/expectedActiveCount\s*:\s*(7|9)/.test(owner) && !/EXPECTED\s*=\s*(7|9)/.test(owner));
  add('OWNER_NO_EXACT_COUNT_BRANCH', !/===\s*(7|9)\b/.test(owner) && !/!==\s*(7|9)\b/.test(owner));
  add('OWNER_ALIASES_DIAGNOSTIC_ONLY', owner.includes('ALIAS_SOURCES') && owner.includes('legacyAliasesIgnoredAsUsers') && owner.includes('const activeRows = authority.filter'));
  add('OWNER_HASHED_DIAGNOSTICS', ['teamIdHash','emailHash','sourceClass','uidHash','advisorIdHash','activeComputed','contractErrors','aliasGroup'].every(field => owner.includes(field)));
  add('OWNER_GENERIC_NO_PERSON_HARDCODE', !/(Paula|Carlos|Samuel|Fernando)/i.test(owner));
  add('OWNER_NO_TEMP_PASSWORD', !/createUser\(\{[^}]*password\s*:/s.test(owner));
  add('OWNER_ADMIN_SDK_BOOTSTRAP', owner.includes('auth.createUser({ email:item.normalized.email'));
  add('OWNER_READ_ALL_VALIDATE_ALL_WRITE_ALL', owner.includes("transactionStrategy:'READ_ALL_VALIDATE_ALL_WRITE_ALL'") && owner.indexOf('memberSnaps.push(await tx.get(ref))') < owner.indexOf('tx.set(memberRefs[index]') && owner.indexOf('teamSnaps.push(await tx.get(ref))') < owner.indexOf('tx.set(teamRefs[index]'));
  add('OWNER_IDEMPOTENT_DIFF', owner.includes('function diffPatch') && owner.includes('idempotentDiffWrites:true'));
  add('OWNER_DYNAMIC_EMAILS_SESSIONS', owner.includes('state.emailsSent.length === state.activeCount') && owner.includes('checks.length === state.activeCount') && owner.includes("requestType:'PASSWORD_RESET'") && owner.includes('auth.createCustomToken') && owner.includes('auth.verifyIdToken'));
  add('FUNCTIONAL_PROFILES_NONBLOCKING', !owner.includes("profiles.size === 3 && crmIntegrity") && owner.includes('functionalProfilesVerified:profiles.size'));
  add('OWNER_ROLLBACK', owner.includes('async function restoreState') && owner.includes('async function rollback') && owner.includes('auth.deleteUser(uid)') && owner.includes('auth.updateUser(uid'));
  add('OWNER_CRM_INTEGRITY', ['clientes','polizas','vehiculos','recibos','cartera','cobros','comisiones','gestiones','leads'].every(token => owner.includes(`'${token}'`)) && owner.includes("'VERIFIED_UNCHANGED'") && owner.includes("'VERIFIED_CHANGED'") && owner.includes("'NOT_POSTVERIFIED'"));
  add('NORMAL_ONBOARDING_DYNAMIC', onboarding.includes('executeProvision') && teamBridge.includes("if (!active(after) && hadAccess) return 'deactivate'") && teamBridge.includes("return 'reactivate'") && teamBridge.includes("if (hadAccess) return 'sync'") && teamBridge.includes("return forceProvision ? 'provision' : ''"));
  add('FUNCTION_ALLOWLIST_EXACT', lifecycle.runtimeBoundary?.allowedFunction === 'orbit360ProvisionTeamAccess' && lifecycle.runtimeBoundary?.maximumAuthCreates === 100 && lifecycle.runtimeBoundary?.maximumMembershipWrites === 100 && lifecycle.runtimeBoundary?.maximumTeamLinkWrites === 100);
  add('TEAM_FIELD_ALLOWLIST', same(lifecycle.runtimeBoundary?.allowedTeamPatchFields, TEAM_FIELDS));
  add('WORKFLOW_REQUEST_PATH', workflow.includes(".github/orbit360-requests/auth-foundation-roster-resolution-and-runtime-v20260805.json"));
  add('WORKFLOW_FULL_HISTORY', workflow.includes('fetch-depth: 0'));
  add('WORKFLOW_GATE_BEFORE_SECRET', workflow.indexOf('Gate canónico antes de secretos') >= 0 && workflow.indexOf('Gate canónico antes de secretos') < workflow.indexOf('Resolver credencial LAB'));
  add('WORKFLOW_FUNCTION_ONLY', workflow.includes('functions:orbit360ProvisionTeamAccess') && !/functions:[A-Za-z0-9_-]+,functions:/.test(workflow));
  add('WORKFLOW_NO_HOSTING_RULES', !workflow.includes('firebase deploy --only hosting') && !workflow.includes('firebase deploy --only firestore:rules'));
  add('WORKFLOW_SINGLE_ATTEMPT_ROLLBACK', workflow.includes('GITHUB_RUN_ATTEMPT') && workflow.includes('Rollback exacto ante cualquier fallo'));

  let fixture;
  try { fixture = JSON.parse(execFileSync(process.execPath, [TEST], { cwd:ROOT, encoding:'utf8' }).trim()); }
  catch (error) { fixture = { ok:false,error:String(error?.stderr || error?.message || error).slice(0,800) }; }
  add('SOURCE_FIXTURES_PASS', fixture?.ok === true && same(fixture?.testedActiveCounts,[1,3,5,7,9,10]) && fixture?.operationalCapabilitiesUsed === 0, JSON.stringify(fixture));

  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion:'orbit360-auth-foundation-dynamic-team-runtime-gate-v1',
    gateId:GATE,
    contractVersion:VERSION,
    status:ok ? 'GO_GATE_CONTRACT' : 'STOP_RETRY',
    classification:ok ? 'AUTH_FOUNDATION_DYNAMIC_TEAM_RUNTIME_READY' : 'PIPELINE_MECHANISM_FAILURE',
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
    authoritativeTeamSource:'tenantId/{tenantId}/asesores',
    activeCountMode:'DYNAMIC_AT_RUNTIME',
    exactExpectedUserCount:null,
    minimumActiveUsers:1,
    technicalMaximumActiveUsers:100,
    identityCoverageRequired:'N/N_ACTIVE_VALID_USERS',
    passwordEmailsRequired:'N_ACTIVE_VALID_USERS',
    sessionsRequired:'N_ACTIVE_VALID_USERS',
    functionalProfilesAreCoverageNotAccessGate:true,
    aliasRoutesDiagnosticOnly:true,
    transactionStrategy:'READ_ALL_VALIDATE_ALL_WRITE_ALL',
    allowedTeamPatchFields:TEAM_FIELDS,
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
    schemaVersion:'orbit360-auth-foundation-dynamic-team-runtime-gate-v1',
    gateId:GATE,
    contractVersion:VERSION,
    status:'STOP_RETRY',
    classification:'PIPELINE_MECHANISM_FAILURE',
    error:String(error?.message || error).replace(/[\r\n]+/g,' ').replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,900),
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
