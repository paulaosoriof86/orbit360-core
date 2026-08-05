#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block-auth-access-recovery-lab-v5-20260805';
const VERSION = '13.4.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v5-20260805.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/auth-access-recovery-lab-v5-20260805.json';
const WORKFLOW = '.github/workflows/orbit360-auth-access-recovery-lab-v3-20260805.yml';
const ROOTFIX = 'tools/orbit360-auth-access-config-repair-lab-v3-20260805.mjs';
const SOURCE_LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-source-only-v4-20260805.json';
const SOURCE_EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/auth-access-source-only-v4-sanitized-v20260805.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const PRIOR = Object.freeze([
  ['.github/orbit360-requests/auth-access-recovery-lab-v20260805.json', 'fffef59bd6065390d1e8b28128754a06d94340b5', 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v20260805.json'],
  ['.github/orbit360-requests/auth-access-recovery-lab-v2-20260805.json', 'fd5963242de542105dd764371cf501f6814481e6', 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v2-20260805.json'],
  ['.github/orbit360-requests/auth-access-recovery-lab-v3-20260805.json', 'f8363197646dc4046fda1933af535110270703ae', 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v3-20260805.json'],
  ['.github/orbit360-requests/auth-access-recovery-source-only-v4-20260805.json', 'ad16d2b1fe41c88929eab59a6f92a6bdface08ad', SOURCE_LIFECYCLE]
]);
const EXPECTED_CAP = Object.freeze({ secrets:true, firestoreRead:true, writes:true, runtime:true, browser:false, deploy:true, functionsDeploy:true, rulesDeploy:false, production:false });
const FIELDS = ['email','roles','defaultRole','activeRole','countries','dataScopes'];
const PROTECTED = ['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const checks = [];
const add = (id, ok, detail='') => checks.push({ id, ok:Boolean(ok), detail:String(detail || '').slice(0,500) });
const rel = value => path.join(ROOT, value);
const exists = value => fs.existsSync(rel(value));
const read = value => JSON.parse(fs.readFileSync(rel(value), 'utf8'));
const text = value => fs.readFileSync(rel(value), 'utf8');
const git = args => execFileSync('git', args, { cwd:ROOT, encoding:'utf8' }).trim();
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);

let result;
try {
  const lifecycle = read(LIFECYCLE);
  const request = read(REQUEST);
  const workflow = text(WORKFLOW);
  const repair = text(ROOTFIX);
  const sourceLifecycle = read(SOURCE_LIFECYCLE);
  const sourceEvidence = read(SOURCE_EVIDENCE);
  const changed = git(['diff-tree','--no-commit-id','--name-only','-r','HEAD']).split(/\r?\n/).filter(Boolean);
  const parent = git(['rev-parse','HEAD^']);
  const scope = request.scope || {};

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_AUTHORIZED_ONCE', lifecycle.status === 'AUTH_ACCESS_RECOVERY_V5_AUTHORIZED_ONCE' && lifecycle.authorization?.activeRequest === true && lifecycle.authorization?.allowedExecutions === 1 && lifecycle.authorization?.consumed === false && lifecycle.authorization?.replayAllowed === false);
  add('PHASE_CAPABILITIES', lifecycle.executionProfile?.phase === 'AUTH_ACCESS_RECOVERY_LAB_V5' && same(lifecycle.executionProfile?.capabilities || {}, EXPECTED_CAP));
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-auth-access-recovery-request-v5' && request.gateId === GATE && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false);
  add('REQUEST_BINDING', request.rcId === 'RC-AYS-LAB-CANONICA-01' && request.branch === 'ays/backend-tenant-lab-v99-20260703' && request.pullRequest === 5 && request.projectId === 'ays-orbit-360-lab' && request.tenantId === 'alianzas-soluciones' && request.parentHead === parent);
  add('REQUEST_SINGLE_FILE_COMMIT', changed.length === 1 && changed[0] === REQUEST, changed.join(','));
  add('SCOPE_POSITIVE', scope.planApprovedAccessConfig === true && scope.applyApprovedAccessConfig === true && scope.authCensusReadOnly === true && scope.deployOnboardingFunctionOnlyIfAbsent === true && scope.createOrLinkApprovedRealUsers === true && scope.syncMembershipRolesCountriesScopes === true && scope.sendPasswordEstablishmentOrReset === true && scope.verifyIdentityMembershipContract === true && scope.rollbackAuthMembershipsOnFailure === true);
  add('SCOPE_NEGATIVE', scope.syntheticUsers === false && scope.syntheticMemberships === false && scope.hardcodedUsers === false && scope.temporaryPasswords === false && scope.otherFunctions === false && scope.hosting === false && scope.rules === false && scope.reimport === false && scope.crmWrites === false && scope.production === false && scope.main === false && scope.merge === false);

  let priorOk = true;
  const priorDetails = [];
  for (const [file, blob, lifecycleFile] of PRIOR) {
    const actual = git(['hash-object', file]);
    const priorLifecycle = read(lifecycleFile);
    const consumed = priorLifecycle.authorization?.consumed === true && priorLifecycle.authorization?.allowedExecutions === 0 && priorLifecycle.authorization?.replayAllowed === false;
    priorOk = priorOk && actual === blob && consumed;
    priorDetails.push(`${path.basename(file)}:${actual}:${consumed}`);
  }
  add('PRIOR_REQUESTS_IMMUTABLE_CONSUMED', priorOk, priorDetails.join('|'));
  add('SOURCE_ONLY_V4_PASS', sourceLifecycle.status === 'AUTH_ACCESS_RECOVERY_SOURCE_ONLY_V4_CONSUMED_PASS' && sourceEvidence.stage === 'AUTH_ACCESS_SOURCE_ONLY_V4_PASS' && sourceEvidence.checksPassed === 26 && sourceEvidence.checksFailed === 0 && sourceEvidence.ok === true);

  let ancestor = false;
  try { execFileSync('git', ['merge-base','--is-ancestor','38aae846477a35025950869a207bf10be9337cc1', parent], { cwd:ROOT, stdio:'ignore' }); ancestor = true; } catch {}
  add('ROOTFIX_PROVENANCE', ancestor && git(['hash-object', ROOTFIX]) === 'dda248ff0df08f69d95ac117d8a7262c055b1af6');
  add('ROOTFIX_STRATEGY', repair.includes('const snapshots = [];') && repair.includes('const pendingWrites = [];') && repair.includes('for (const { ref, patch } of pendingWrites) tx.update(ref, patch);'));
  add('ACCESS_CONFIG_BOUNDARY', lifecycle.accessConfigurationBoundary?.maximumAdvisorDocumentsUpdated === 3 && lifecycle.accessConfigurationBoundary?.maximumTargetPeople === 3 && same(lifecycle.accessConfigurationBoundary?.allowedFields, FIELDS) && same(lifecycle.accessConfigurationBoundary?.targetProfiles, ['paula','carlos','samuel']) && lifecycle.accessConfigurationBoundary?.crmWritesAllowed === false);
  add('FUNCTION_ALLOWLIST', same(lifecycle.onboardingBoundary?.allowedFunctionDeploys, ['orbit360ProvisionTeamAccess']) && lifecycle.onboardingBoundary?.maximumFunctionDeploys === 1 && lifecycle.onboardingBoundary?.deployOnlyIfAbsent === true && lifecycle.onboardingBoundary?.otherFunctionsDeployAllowed === false);
  add('PASSWORD_BOUNDARY', lifecycle.onboardingBoundary?.passwordEstablishmentEmailsRequired === 3 && lifecycle.onboardingBoundary?.passwordReadAllowed === false && lifecycle.onboardingBoundary?.temporaryPasswordAllowed === false && lifecycle.onboardingBoundary?.actionLinksInEvidenceAllowed === false);
  add('PROTECTED_CRM_BOUNDARY', same(lifecycle.protectedCrmCollections, PROTECTED) && lifecycle.prohibitions?.crmWrites === true);

  add('WORKFLOW_RUNTIME_V5_PATH', workflow.includes(".github/orbit360-requests/auth-access-recovery-lab-v5-20260805.json") && !workflow.includes("paths:\n      - '.github/orbit360-requests/auth-access-recovery-source-only-v4-20260805.json'"));
  add('WORKFLOW_FULL_HISTORY', workflow.includes('fetch-depth: 0'));
  add('WORKFLOW_GATE_BEFORE_SECRET', workflow.indexOf('Gate canónico antes de secretos') >= 0 && workflow.indexOf('Resolver credencial LAB') > workflow.indexOf('Gate canónico antes de secretos'));
  add('WORKFLOW_EXACT_FUNCTION', workflow.includes('--only "functions:$ORBIT360_FUNCTION"') && workflow.includes('ORBIT360_FUNCTION: orbit360ProvisionTeamAccess'));
  add('WORKFLOW_NO_FORBIDDEN_DEPLOY', !workflow.includes('firebase deploy --only hosting') && !workflow.includes('firestore:rules') && !workflow.includes('storage') && !workflow.includes('gcloud run deploy'));
  add('WORKFLOW_ORDER', workflow.indexOf('Planificar configuración aprobada de acceso') < workflow.indexOf('Aplicar configuración aprobada de acceso') && workflow.indexOf('Aplicar configuración aprobada de acceso') < workflow.indexOf('Censo Auth/memberships y snapshot CRM') && workflow.indexOf('Censo Auth/memberships y snapshot CRM') < workflow.indexOf('Desplegar exclusivamente onboarding si falta') && workflow.indexOf('Desplegar exclusivamente onboarding si falta') < workflow.indexOf('Crear o vincular identidades y memberships') && workflow.indexOf('Crear o vincular identidades y memberships') < workflow.indexOf('Verificar roles, países y scopes'));
  add('WORKFLOW_ROLLBACK', workflow.includes('Rollback Auth/memberships si falla postverificación') && workflow.includes('orbit360-auth-access-postverify-rollback-lab-v2-20260805.mjs'));
  add('WORKFLOW_STABLE_RESET_DOMAIN', workflow.includes('ORBIT360_PREVIEW_URL: https://ays-orbit-360-lab.web.app'));

  const required = [
    LIFECYCLE, REQUEST, WORKFLOW, ROOTFIX, SOURCE_LIFECYCLE, SOURCE_EVIDENCE,
    'tools/orbit360-auth-access-recovery-lab-v20260805.mjs',
    'tools/orbit360-auth-access-scope-postverify-lab-v2-20260805.mjs',
    'tools/orbit360-auth-access-postverify-rollback-lab-v2-20260805.mjs',
    'functions/user-onboarding.js', 'functions/bootstrap.js'
  ];
  add('REQUIRED_FILES', required.every(exists), required.filter(item => !exists(item)).join(','));

  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion:'orbit360-auth-access-recovery-gate-v5', gateId:GATE, contractVersion:VERSION,
    status:ok?'GO_GATE_CONTRACT':'STOP_RETRY', classification:ok?'AUTH_ACCESS_RECOVERY_V5_READY':'PIPELINE_MECHANISM_FAILURE',
    total:checks.length, passed:checks.length-failed.length, failed:failed.length, failedCheckIds:failed.map(item=>item.id), checks,
    executionAuthorized:ok, secretAccessAuthorized:ok, firestoreReadAuthorized:ok, writeAuthorized:ok,
    maximumAdvisorDocumentsUpdated:ok?3:0, allowedAdvisorFields:ok?FIELDS:[], authWriteAuthorized:ok,
    runtimeAuthorized:ok, browserAuthorized:false, deployAuthorized:ok, functionsDeployAuthorized:ok,
    allowedFunctions:ok?['orbit360ProvisionTeamAccess']:[], hostingDeployAuthorized:false,
    rulesDeployAuthorized:false, productionAuthorized:false, dataAccess:false, secretAccess:false,
    firestoreRead:false, firestoreWrites:0, authReads:0, authWrites:0, runtimeExecuted:false,
    browserExecuted:false, deployExecuted:false, productionTouched:false,
    rootFixStrategy:'READ_ALL_VALIDATE_ALL_WRITE_ALL', sourceOnlyPrerequisitePass:sourceEvidence.ok===true,
    priorRequestsVerified:4, protectedCrmCollections:PROTECTED,
    containsPII:false, containsSecrets:false, ok
  };
} catch (error) {
  result = {
    schemaVersion:'orbit360-auth-access-recovery-gate-v5', gateId:GATE, contractVersion:VERSION,
    status:'STOP_RETRY', classification:'PIPELINE_MECHANISM_FAILURE',
    error:String(error?.message||error).replace(/[\r\n]+/g,' ').replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,700),
    executionAuthorized:false, secretAccessAuthorized:false, firestoreReadAuthorized:false, writeAuthorized:false,
    authWriteAuthorized:false, runtimeAuthorized:false, browserAuthorized:false, deployAuthorized:false,
    functionsDeployAuthorized:false, hostingDeployAuthorized:false, rulesDeployAuthorized:false,
    productionAuthorized:false, dataAccess:false, secretAccess:false, firestoreRead:false,
    firestoreWrites:0, authReads:0, authWrites:0, runtimeExecuted:false, browserExecuted:false,
    deployExecuted:false, productionTouched:false, containsPII:false, containsSecrets:false, ok:false
  };
}
fs.mkdirSync(path.dirname(OUT), { recursive:true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'GO_GATE_CONTRACT' ? 0 : 41);
