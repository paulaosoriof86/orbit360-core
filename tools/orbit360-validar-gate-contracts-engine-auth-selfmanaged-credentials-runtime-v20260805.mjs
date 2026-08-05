#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block-auth-selfmanaged-credentials-runtime-v20260805';
const VERSION = '13.9.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-selfmanaged-credentials-runtime-v20260805.json';
const PRIOR_LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-foundation-roster-resolution-and-runtime-v20260805.json';
const PRIOR_REQUEST = '.github/orbit360-requests/auth-foundation-roster-resolution-and-runtime-v20260805.json';
const PRIOR_BLOB = '67948651701480cf5dcc1c0b903cf6f6c77b6ee5';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/auth-selfmanaged-credentials-runtime-v20260805.json';
const CONFIG = 'orbit360-platform/data/tenant-config/alianzas-soluciones.auth-identity-overrides-v20260805.json';
const FUNCTION = 'functions/user-onboarding.js';
const HELPER = 'functions/user-credential-selfservice.js';
const PROJECTION = 'orbit360-platform/core/access-role-session-owner-v20260728.js';
const INDEX = 'orbit360-platform/index.html';
const ADAPTER = 'orbit360-platform/core/user-credential-selfservice-v20260805.js';
const FORCED = 'orbit360-platform/core/auth-password-change-v20260805.js';
const EQUIPO = 'orbit360-platform/modules/equipo-credential-admin-v20260805-bridge.js';
const RUNTIME = 'tools/orbit360-auth-selfmanaged-credentials-runtime-v20260805.mjs';
const DYNAMIC = 'tools/orbit360-auth-foundation-dynamic-team-runtime-v20260805.mjs';
const CONTAIN = 'tools/orbit360-auth-selfmanaged-credentials-containment-v20260805.mjs';
const TEST = 'tools/orbit360-test-auth-selfmanaged-credentials-source-v20260805.mjs';
const OWNER = 'tools/orbit360-auth-selfmanaged-source-stage-owner-v20260805.mjs';
const SEALER = 'tools/orbit360-auth-selfmanaged-final-sealer-v20260805.mjs';
const WORKFLOW = '.github/workflows/orbit360-auth-selfmanaged-credentials-runtime-v20260805.yml';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const CAP = Object.freeze({ secrets:true, firestoreRead:true, writes:true, runtime:true, browser:false, deploy:true, functionsDeploy:true, rulesDeploy:false, production:false });

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok:Boolean(ok), detail:String(detail || '').slice(0,900) });
const rel = file => path.join(ROOT, file);
const json = file => JSON.parse(fs.readFileSync(rel(file), 'utf8'));
const text = file => fs.readFileSync(rel(file), 'utf8');
const git = args => execFileSync('git', args, { cwd:ROOT, encoding:'utf8' }).trim();
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const deployLines = source => source.split(/\r?\n/).map(line => line.trim()).filter(line => /(?:npx\s+)?firebase\s+deploy\b/.test(line));
const projectIsLab = line => /--project\s+["']?\$ORBIT360_PROJECT_ID["']?/.test(line) || /--project\s+["']?ays-orbit-360-lab["']?/.test(line);
const hasForbiddenDestination = line => /--project\s+["']?[^\s"']*(?:prod|production)[^\s"']*/i.test(line) || /--only\s+["']?(?:firestore:rules|storage|database)/i.test(line);

let result;
try {
  const lifecycle = json(LIFECYCLE);
  const prior = json(PRIOR_LIFECYCLE);
  const request = json(REQUEST);
  const config = json(CONFIG);
  const fn = text(FUNCTION);
  const helper = text(HELPER);
  const projection = text(PROJECTION);
  const index = text(INDEX);
  const adapter = text(ADAPTER);
  const forced = text(FORCED);
  const equipo = text(EQUIPO);
  const runtime = text(RUNTIME);
  const dynamic = text(DYNAMIC);
  const contain = text(CONTAIN);
  const owner = text(OWNER);
  const sealer = text(SEALER);
  const workflow = text(WORKFLOW);
  const parent = git(['rev-parse','HEAD^']);
  const changed = git(['diff-tree','--no-commit-id','--name-only','-r','HEAD']).split(/\r?\n/).filter(Boolean);
  const scope = request.scope || {};
  const deploys = deployLines(workflow);
  const functionDeploys = deploys.filter(line => line.includes('functions:orbit360ProvisionTeamAccess'));
  const hostingDeploys = deploys.filter(line => /--only\s+["']?hosting["']?(?:\s|$)/.test(line));

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_AUTHORIZED_ONCE', lifecycle.status === 'AUTH_SELFMANAGED_CREDENTIALS_RUNTIME_AUTHORIZED_ONCE' && lifecycle.authorization?.activeRequest === true && lifecycle.authorization?.allowedExecutions === 1 && lifecycle.authorization?.consumed === false && lifecycle.authorization?.replayAllowed === false);
  add('CAPABILITIES_EXACT', same(lifecycle.executionProfile?.capabilities || {}, CAP));
  add('PRIOR_RUNTIME_CONSUMED', prior.status === 'AUTH_FOUNDATION_DYNAMIC_TEAM_RUNTIME_CONSUMED_STOP_RETRY' && prior.executionResult?.errorCode === 'AUTHORITATIVE_TEAM_NOT_READY' && prior.authorization?.consumed === true && prior.authorization?.allowedExecutions === 0 && prior.authorization?.replayAllowed === false);
  add('PRIOR_REQUEST_IMMUTABLE', git(['hash-object',PRIOR_REQUEST]) === PRIOR_BLOB, git(['hash-object',PRIOR_REQUEST]));
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-auth-selfmanaged-credentials-runtime-request-v1' && request.gateId === GATE && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false);
  add('REQUEST_BINDING', request.rcId === 'RC-AYS-LAB-CANONICA-01' && request.branch === 'ays/backend-tenant-lab-v99-20260703' && request.pullRequest === 5 && request.projectId === 'ays-orbit-360-lab' && request.tenantId === 'alianzas-soluciones' && request.parentHead === parent);
  add('REQUEST_SINGLE_FILE_COMMIT', changed.length === 1 && changed[0] === REQUEST, changed.join(','));
  add('REQUEST_SCOPE', scope.completeFourIdentityRecords === true && scope.dynamicAllActiveUsers === true && scope.assignTemporaryPasswordPattern === true && scope.forceChangeOnFirstLogin === true && scope.verifyPasswordLoginForEveryActiveUser === true && scope.enableAdminNameEmailPasswordManagement === true && scope.deployOnlyOnboardingFunction === true && scope.deployLabHostingForCredentialUi === true && scope.crmSnapshotIntegrity === true);
  add('REQUEST_PROHIBITIONS', scope.syntheticUsers === false && scope.passwordsInRepository === false && scope.passwordsInEvidence === false && scope.currentPasswordRetrieval === false && scope.otherFunctions === false && scope.rules === false && scope.reimport === false && scope.crmWrites === false && scope.production === false && scope.main === false && scope.merge === false);

  add('CONFIG_EXACT', config.tenantId === 'alianzas-soluciones' && config.identityOverrides?.length === 4 && config.temporaryPasswordPolicy?.strategy === 'FIRST_NAME_123_STAR' && config.temporaryPasswordPolicy?.forceChangeOnFirstLogin === true && config.containsPasswords === false);
  add('CONFIG_BRAULIO_CONFIRMED', config.identityOverrides.some(item => item.matchName === 'Braulio Hernández' && item.email === 'braulio.hernandez@aysseguros.com'));
  add('CONFIG_UNIQUE_EMAILS', new Set(config.identityOverrides.map(item => item.email)).size === 4);

  add('FUNCTION_OPERATIONS', fn.includes("'set_temporary_password'") && fn.includes("'complete_password_change'") && fn.includes("require('./user-credential-selfservice')"));
  add('FUNCTION_EMAIL_SYNC', fn.includes('authResolution.emailChanged === true') && fn.includes('email: authBefore.email || undefined'));
  add('HELPER_ADMIN_AND_SELF', helper.includes('async function setTemporaryPassword') && helper.includes('async function completePasswordChange') && helper.includes('mustChangePassword: true') && helper.includes('mustChangePassword: false'));
  add('HELPER_NO_PASSWORD_OUTPUT', helper.includes('containsPassword: false') && helper.includes('containsTemporaryPassword: false'));
  add('PROJECTION_FORCE_FLAG', projection.includes('mustChangePassword: data.mustChangePassword === true') && projection.includes('mustChangePassword: source.mustChangePassword === true'));
  add('INDEX_LOADS_OWNERS', index.includes('user-credential-selfservice-v20260805.js') && index.includes('auth-password-change-v20260805.js') && index.includes('equipo-credential-admin-v20260805-bridge.js'));
  add('FRONTEND_ADMIN_RESET', adapter.includes('setTemporaryPassword') && equipo.includes('Asignar contraseña temporal'));
  add('FRONTEND_FORCED_CHANGE', forced.includes('updatePassword(password)') && forced.includes('completePasswordChange()') && forced.includes('La nueva contraseña no puede conservar el patrón temporal'));
  add('CURRENT_PASSWORD_NOT_READABLE', lifecycle.credentialPolicy?.currentPasswordReadable === false && equipo.includes('La contraseña actual nunca se muestra'));

  add('RUNTIME_DYNAMIC_N', runtime.includes('activeRows.length') && runtime.includes('dynamic.activeCount') && !/expectedActiveCount\s*:\s*(7|9)/.test(runtime));
  add('RUNTIME_PATTERN', runtime.includes("+ '123*'") && runtime.includes("passwordPolicy:'FIRST_NAME_123_STAR'"));
  add('RUNTIME_PASSWORD_LOGIN', runtime.includes('accounts:signInWithPassword') && runtime.includes('passwordLoginsVerified'));
  add('RUNTIME_NO_PASSWORD_PERSIST', runtime.includes('plaintextPasswordsPersisted:0') && runtime.includes('passwordHashesPersisted:0') && runtime.includes('containsTemporaryPassword:false'));
  add('RUNTIME_FORCE_FLAG', runtime.includes('mustChangePassword:true') && runtime.includes("credentialState:'temporary'"));
  add('RUNTIME_CRM_INTEGRITY', ['clientes','polizas','vehiculos','recibos','cartera','cobros','comisiones','gestiones','leads'].every(name => runtime.includes(`'${name}'`)) && runtime.includes("'VERIFIED_UNCHANGED'"));
  add('DYNAMIC_FOUNDATION_PRESENT', dynamic.includes("authorityPathClass: 'tenantId/{tenantId}/asesores'") && dynamic.includes("transactionStrategy:'READ_ALL_VALIDATE_ALL_WRITE_ALL'"));
  add('CONTAINMENT_PRESENT', contain.includes("status:'blocked_recovery'") && contain.includes('passwordRollbackExact:false'));
  add('SELF_ADMIN_CONTRACT', lifecycle.selfAdministration?.nameEditableFromEquipo === true && lifecycle.selfAdministration?.emailEditableFromEquipo === true && lifecycle.selfAdministration?.emailSyncsToAuth === true && lifecycle.selfAdministration?.temporaryPasswordReplaceableFromEquipo === true && lifecycle.selfAdministration?.firstLoginPasswordChangeRequired === true);

  add('SOURCE_OWNER_PRESENT', owner.includes('staleEvidenceInvalidated: true') && owner.includes("status: 'started'") && owner.includes("step.status = 'pass'") && owner.includes("step.status = 'fail'") && owner.includes('failedStepId'));
  add('WORKFLOW_REQUEST_PATTERN', workflow.includes("auth-selfmanaged-credentials-runtime-*.json") && workflow.includes('ORBIT360_REQUEST_FILE=$REQUEST_FILE'));
  add('WORKFLOW_FULL_HISTORY', workflow.includes('fetch-depth: 0'));
  add('WORKFLOW_SOURCE_OWNER_BEFORE_SECRET', workflow.indexOf('Ejecutar owner source-only con ledger') >= 0 && workflow.indexOf('Ejecutar owner source-only con ledger') < workflow.indexOf('Resolver credencial LAB'));
  add('WORKFLOW_CURRENT_RUN_LEDGER_GUARD', sealer.includes("ledger?.runId === runId") && sealer.includes('staleEvidenceRejected:!currentRun') && workflow.includes('orbit360-auth-selfmanaged-final-sealer-v20260805.mjs'));
  add('WORKFLOW_FUNCTION_ONLY', functionDeploys.length === 1 && projectIsLab(functionDeploys[0]) && !hasForbiddenDestination(functionDeploys[0]), functionDeploys.join(' | '));
  add('WORKFLOW_LAB_HOSTING_ONLY', hostingDeploys.length === 1 && projectIsLab(hostingDeploys[0]) && !hasForbiddenDestination(hostingDeploys[0]), hostingDeploys.join(' | '));
  add('WORKFLOW_NO_OTHER_DEPLOYS', deploys.length === 2 && deploys.every(line => projectIsLab(line) && !hasForbiddenDestination(line)), deploys.join(' | '));
  add('WORKFLOW_PASSWORDS_AFTER_FOUNDATION', workflow.indexOf('Asignar y verificar contraseñas temporales') > workflow.indexOf('Aplicar Fundación Auth dinámica'));
  add('WORKFLOW_CONTAINMENT', workflow.includes('Contener cualquier fallo posterior a la rotación'));
  add('WORKFLOW_SINGLE_ATTEMPT', workflow.includes('GITHUB_RUN_ATTEMPT') && workflow.includes("test \"$GITHUB_RUN_ATTEMPT\" = '1'"));

  let fixture;
  try { fixture = JSON.parse(execFileSync(process.execPath, [TEST], { cwd:ROOT, encoding:'utf8' }).trim()); }
  catch (error) { fixture = { ok:false, error:String(error?.stderr || error?.message || error).slice(0,900) }; }
  add('SOURCE_FIXTURES_PASS', fixture?.ok === true && fixture?.identityOverrides === 4 && fixture?.usersInPatternFixture === 7 && fixture?.operationalCapabilitiesUsed === 0, JSON.stringify(fixture));

  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion:'orbit360-auth-selfmanaged-credentials-runtime-gate-v1',
    gateId:GATE,
    contractVersion:VERSION,
    status:ok?'GO_GATE_CONTRACT':'STOP_RETRY',
    classification:ok?'AUTH_SELFMANAGED_CREDENTIALS_RUNTIME_READY':'PIPELINE_MECHANISM_FAILURE',
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
    hostingDeployAuthorized:ok,
    hostingTarget:'ays-orbit-360-lab',
    hostingDeploysMaximum:1,
    rulesDeployAuthorized:false,
    productionAuthorized:false,
    identityOverridesRequired:4,
    activeUserCountMode:'DYNAMIC_AT_RUNTIME',
    temporaryPasswordPolicy:'FIRST_NAME_123_STAR',
    forceChangeOnFirstLogin:true,
    currentPasswordReadable:false,
    passwordRollbackExact:false,
    failureContainmentRequired:true,
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
    containsPasswords:false,
    ok
  };
} catch (error) {
  result = {
    schemaVersion:'orbit360-auth-selfmanaged-credentials-runtime-gate-v1',
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
    containsPasswords:false,
    ok:false
  };
}

fs.mkdirSync(path.dirname(OUT), { recursive:true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'GO_GATE_CONTRACT' ? 0 : 41);
