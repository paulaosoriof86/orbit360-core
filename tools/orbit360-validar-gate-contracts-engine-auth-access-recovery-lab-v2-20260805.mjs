#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block-auth-access-recovery-lab-v2-20260805';
const VERSION = '13.1.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v2-20260805.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/auth-access-recovery-lab-v2-20260805.json';
const PRIOR_REQUEST = '.github/orbit360-requests/auth-access-recovery-lab-v20260805.json';
const PRIOR_LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v20260805.json';
const CORRECTION_TOOL = 'tools/orbit360-auth-email-config-correction-lab-v2-20260805.mjs';
const RECOVERY_TOOL = 'tools/orbit360-auth-access-recovery-lab-v20260805.mjs';
const WORKFLOW = '.github/workflows/orbit360-auth-access-recovery-lab-v2-20260805.yml';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const EXPECTED_EMAIL_SHA256 = '9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f';
const PRIOR_REQUEST_BLOB = 'fffef59bd6065390d1e8b28128754a06d94340b5';
const BRANCH = 'ays/backend-tenant-lab-v99-20260703';

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail: String(detail || '').slice(0, 500) });
const read = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let result;
try {
  const lifecycle = read(LIFECYCLE);
  const request = read(REQUEST);
  const priorLifecycle = read(PRIOR_LIFECYCLE);
  const cap = lifecycle.executionProfile?.capabilities || {};
  const scope = request.scope || {};
  const email = String(request.officialAccessEmail || '').trim().toLowerCase();
  const parent = git(['rev-parse', 'HEAD^']);

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_AUTHORIZED_ONCE', lifecycle.status === 'AUTH_ACCESS_RECOVERY_V2_AUTHORIZED_ONCE' && lifecycle.singleGate === true && lifecycle.authorization?.activeRequest === true && lifecycle.authorization?.allowedExecutions === 1 && lifecycle.authorization?.consumed === false && lifecycle.authorization?.replayAllowed === false);
  add('PHASE_CAPABILITIES', lifecycle.executionProfile?.phase === 'AUTH_ACCESS_RECOVERY_LAB_V2' && same(cap, { secrets:true, firestoreRead:true, writes:true, runtime:true, browser:false, deploy:true, functionsDeploy:true, rulesDeploy:false, production:false }));
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-auth-access-recovery-request-v2' && request.gateId === GATE && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false);
  add('REQUEST_BINDING', request.rcId === 'RC-AYS-LAB-CANONICA-01' && request.branch === BRANCH && request.pullRequest === 5 && request.projectId === 'ays-orbit-360-lab' && request.tenantId === 'alianzas-soluciones' && request.parentHead === parent);
  add('OFFICIAL_EMAIL_DIGEST', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && sha(email) === EXPECTED_EMAIL_SHA256 && request.officialAccessEmailSha256 === EXPECTED_EMAIL_SHA256 && lifecycle.officialAccessEmail?.sha256 === EXPECTED_EMAIL_SHA256);
  add('TARGETS_EXACT', same(request.targetPeople, ['paula','carlos','samuel']));
  add('SCOPE_POSITIVE', scope.correctPaulaEmailOnly === true && scope.authCensusReadOnly === true && scope.advisorCensusReadOnly === true && scope.membershipCensusReadOnly === true && scope.deployOnboardingFunctionOnlyIfAbsent === true && scope.createOrLinkConfiguredRealUsers === true && scope.syncMembershipRolesScopes === true && scope.sendPasswordEstablishmentOrReset === true && scope.verifyIdentityMembershipContract === true && scope.rollbackAuthMembershipsOnFailure === true);
  add('SCOPE_NEGATIVE', scope.syntheticUsers === false && scope.syntheticMemberships === false && scope.hardcodedUsers === false && scope.temporaryPasswords === false && scope.otherFunctions === false && scope.hosting === false && scope.rules === false && scope.reimport === false && scope.crmWrites === false && scope.production === false && scope.main === false && scope.merge === false);
  add('FUNCTION_ALLOWLIST', same(lifecycle.accessBoundary?.allowedFunctionDeploys, ['orbit360ProvisionTeamAccess']) && lifecycle.accessBoundary?.maximumAdvisorConfigurationDocumentsUpdated === 1 && lifecycle.accessBoundary?.maximumAdvisorConfigurationFieldsUpdated === 1 && lifecycle.accessBoundary?.otherFunctionsDeployAllowed === false);
  add('PRIOR_CONSUMED', priorLifecycle.status === 'AUTH_ACCESS_RECOVERY_CONSUMED_STOP_RETRY' && priorLifecycle.authorization?.consumed === true && priorLifecycle.authorization?.allowedExecutions === 0 && priorLifecycle.authorization?.replayAllowed === false);
  add('PRIOR_REQUEST_IMMUTABLE', git(['hash-object', PRIOR_REQUEST]) === PRIOR_REQUEST_BLOB);
  add('REQUIRED_FILES', [LIFECYCLE, REQUEST, PRIOR_REQUEST, PRIOR_LIFECYCLE, CORRECTION_TOOL, RECOVERY_TOOL, WORKFLOW, 'functions/user-onboarding.js', 'functions/bootstrap.js'].every(exists));

  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion: 'orbit360-auth-access-recovery-gate-v2',
    gateId: GATE,
    contractVersion: VERSION,
    status: ok ? 'GO_GATE_CONTRACT' : 'VALIDATOR_STALE',
    classification: ok ? 'AUTH_ACCESS_RECOVERY_V2_READY' : 'VALIDATOR_STALE',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    failedCheckIds: failed.map(item => item.id),
    checks,
    executionAuthorized: ok,
    secretAccessAuthorized: ok,
    firestoreReadAuthorized: ok,
    writeAuthorized: ok,
    maximumAdvisorConfigurationDocumentsUpdated: ok ? 1 : 0,
    maximumAdvisorConfigurationFieldsUpdated: ok ? 1 : 0,
    authWriteAuthorized: ok,
    runtimeAuthorized: ok,
    browserAuthorized: false,
    deployAuthorized: ok,
    functionsDeployAuthorized: ok,
    allowedFunctions: ok ? ['orbit360ProvisionTeamAccess'] : [],
    hostingDeployAuthorized: false,
    rulesDeployAuthorized: false,
    productionAuthorized: false,
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
    officialAccessEmailSha256: EXPECTED_EMAIL_SHA256,
    fullEmailsExposed: 0,
    containsPII: false,
    containsSecrets: false
  };
} catch (error) {
  result = {
    schemaVersion: 'orbit360-auth-access-recovery-gate-v2',
    gateId: GATE,
    contractVersion: VERSION,
    status: 'VALIDATOR_STALE',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    error: String(error?.message || error).replace(/[\r\n]+/g, ' ').replace(/[\w.+-]+@[\w.-]+/g, '[email]').slice(0, 700),
    executionAuthorized: false,
    secretAccessAuthorized: false,
    firestoreReadAuthorized: false,
    writeAuthorized: false,
    authWriteAuthorized: false,
    runtimeAuthorized: false,
    browserAuthorized: false,
    deployAuthorized: false,
    functionsDeployAuthorized: false,
    hostingDeployAuthorized: false,
    rulesDeployAuthorized: false,
    productionAuthorized: false,
    dataAccess: false,
    secretAccess: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    deployExecuted: false,
    productionTouched: false,
    fullEmailsExposed: 0,
    containsPII: false,
    containsSecrets: false
  };
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'GO_GATE_CONTRACT' ? 0 : 41);
