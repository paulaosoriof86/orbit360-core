#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block-auth-access-recovery-lab-v20260805';
const VERSION = '13.0.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v20260805.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/auth-access-recovery-lab-v20260805.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const FUNCTION = 'orbit360ProvisionTeamAccess';

const REQUIRED = [
  LIFECYCLE,
  REQUEST,
  'functions/user-onboarding.js',
  'functions/bootstrap.js',
  'orbit360-platform/core/user-onboarding.js',
  'orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js',
  'tools/orbit360-auth-access-recovery-lab-v20260805.mjs',
  '.github/workflows/orbit360-auth-access-recovery-lab-v20260805.yml'
];

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail: String(detail || '').slice(0, 500) });
const read = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const text = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const exact = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let result;
try {
  const lifecycle = read(LIFECYCLE);
  const request = read(REQUEST);
  const cap = lifecycle.executionProfile?.capabilities || {};
  const boundary = lifecycle.accessBoundary || {};
  const scope = request.scope || {};
  const userOnboarding = text('functions/user-onboarding.js');
  const bootstrap = text('functions/bootstrap.js');
  const client = text('orbit360-platform/core/user-onboarding.js');
  const bridge = text('orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js');

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_STATUS', lifecycle.status === 'AUTH_ACCESS_RECOVERY_AUTHORIZED_ONCE' && lifecycle.singleGate === true && lifecycle.macroClosure === true);
  add('PHASE_CAPABILITIES', lifecycle.executionProfile?.phase === 'AUTH_ACCESS_RECOVERY_LAB' && exact(cap, {
    secrets: true,
    firestoreRead: true,
    writes: true,
    runtime: true,
    browser: false,
    deploy: true,
    functionsDeploy: true,
    rulesDeploy: false,
    production: false
  }));
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-auth-access-recovery-request-v1' && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false);
  add('REQUEST_BINDING', request.branch === BRANCH && request.pullRequest === 5 && request.projectId === 'ays-orbit-360-lab' && request.tenantId === 'alianzas-soluciones' && request.gateId === GATE && request.parentHead === git(['rev-parse', 'HEAD^']));
  add('REQUEST_SCOPE_POSITIVE', scope.authCensusReadOnly === true && scope.advisorCensusReadOnly === true && scope.membershipCensusReadOnly === true && scope.deployOnboardingFunctionOnlyIfAbsent === true && scope.createOrLinkConfiguredRealUsers === true && scope.syncMembershipRolesScopes === true && scope.sendPasswordEstablishmentOrReset === true && scope.verifyIdentityMembershipContract === true && scope.rollbackOnFailure === true);
  add('REQUEST_SCOPE_NEGATIVE', scope.syntheticUsers === false && scope.syntheticMemberships === false && scope.hardcodedUsers === false && scope.temporaryPasswords === false && scope.otherFunctions === false && scope.hosting === false && scope.rules === false && scope.reimport === false && scope.crmWrites === false && scope.production === false && scope.main === false && scope.merge === false);
  add('BOUNDARY_EXACT', boundary.maximumTargetPeople === 3 && boundary.maximumAuthUsersCreated === 3 && boundary.maximumMembershipsCreated === 3 && exact(boundary.allowedFunctionDeploys, [FUNCTION]) && boundary.passwordReadAllowed === false && boundary.temporaryPasswordAllowed === false && boundary.actionLinkInEvidenceAllowed === false && boundary.fullEmailInEvidenceAllowed === false && boundary.syntheticUsersAllowed === false && boundary.rollbackRequired === true && boundary.idempotent === true);
  add('SOURCE_EXPORT', /exports\.orbit360ProvisionTeamAccess\s*=\s*onCall/.test(userOnboarding));
  add('BOOTSTRAP_EXPORT', /require\(['"]\.\/user-onboarding['"]\)/.test(bootstrap));
  add('CLIENT_RESET_FLOW', /sendPasswordResetEmail/.test(client) && /requiresPasswordSetup/.test(client));
  add('EQUIPO_BRIDGE', /Crear o vincular acceso/.test(bridge) && /Auth \+ membresía/.test(bridge));
  add('REQUIRED_FILES', REQUIRED.every(exists), REQUIRED.filter(item => !exists(item)).join(','));

  const changed = git(['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']).split(/\r?\n/).filter(Boolean);
  add('ONLY_REQUEST_TRIGGERED', changed.length === 1 && changed[0] === REQUEST, changed.join(','));

  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion: 'orbit360-auth-access-recovery-preflight-v1',
    gateId: GATE,
    contractVersion: VERSION,
    status: ok ? 'GO_GATE_CONTRACT' : 'VALIDATOR_STALE',
    classification: ok ? 'AUTH_ACCESS_RECOVERY_READY' : 'VALIDATOR_STALE',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    failedCheckIds: failed.map(item => item.id),
    checks,
    executionAuthorized: ok,
    secretAccessAuthorized: ok,
    firestoreReadAuthorized: ok,
    writeAuthorized: ok,
    maximumAuthUsersCreated: ok ? 3 : 0,
    maximumAuthUsersUpdated: ok ? 3 : 0,
    maximumMembershipsCreated: ok ? 3 : 0,
    maximumMembershipsUpdated: ok ? 3 : 0,
    authWriteAuthorized: ok,
    runtimeAuthorized: ok,
    browserAuthorized: false,
    deployAuthorized: ok,
    functionsDeployAuthorized: ok,
    allowedFunctions: ok ? [FUNCTION] : [],
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
    containsPII: false,
    containsSecrets: false
  };
} catch (error) {
  result = {
    schemaVersion: 'orbit360-auth-access-recovery-preflight-v1',
    gateId: GATE,
    contractVersion: VERSION,
    status: 'VALIDATOR_STALE',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    error: String(error?.message || error).replace(/[\r\n]+/g, ' ').slice(0, 700),
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
    authReads: 0,
    authWrites: 0,
    runtimeExecuted: false,
    browserExecuted: false,
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
