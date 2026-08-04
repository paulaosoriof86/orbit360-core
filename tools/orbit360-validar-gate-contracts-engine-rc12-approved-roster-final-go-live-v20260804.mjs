#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block7.15-rc12-approved-roster-final-go-live-v20260804';
const VERSION = '7.15.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-rc12-approved-roster-final-go-live-v20260804.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/rc12-approved-roster-final-go-live-v20260804.json';
const MANIFEST = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json';
const UNIFICATION = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-validation.json';
const AUDIT = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-forensic-module-audit.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const BASELINE = '27cb7dfcda8568280ebef15993a953364304f29b';
const CANDIDATE = 'b699ba329960cd830121b57452ce558399aa84fb';
const RELEASE_BRANCH = 'release/gravicentra-insurance-rc1-2-membership-auth-20260803';
const LIVE_BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const REQUIRED = [
  LIFECYCLE,
  REQUEST,
  MANIFEST,
  UNIFICATION,
  AUDIT,
  'tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs',
  'tools/orbit360-rc12-approved-roster-final-go-live-macro-v20260804.sh',
  'tools/orbit360-gravicentra-rc12-membership-runtime-v20260803.mjs',
  'tools/orbit360-gravicentra-rc12-browser-membership-smoke-v20260803.mjs',
  'tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs',
  'tools/orbit360-validar-auth-membership-antiregression-rootfix-v20260803.mjs',
  'tools/orbit360-validator-lifecycle-contract-rc12-rootcause-cumulative-closure-v20260803.json',
  'tools/orbit360-validar-gate-contracts-engine-rc12-rootcause-cumulative-closure-v20260803.mjs'
];

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail: String(detail || '').slice(0, 700) });
const read = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let result;
try {
  const lifecycle = read(LIFECYCLE);
  const request = read(REQUEST);
  const manifest = read(MANIFEST);
  const unification = read(UNIFICATION);
  const audit = read(AUDIT);
  const capabilities = lifecycle.executionProfile?.capabilities || {};
  const boundary = lifecycle.provisioningBoundary || {};
  const scope = request.scope || {};
  const roster = manifest.approvedRoster || {};

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_AUTHORIZED', lifecycle.status === 'RC12_APPROVED_ROSTER_FINAL_GO_LIVE_AUTHORIZED' && lifecycle.singleGate === true && lifecycle.macroClosure === true);
  add('PHASE_CAPABILITIES', lifecycle.executionProfile?.phase === 'GRAVICENTRA_RC12_APPROVED_ROSTER_FINAL_GO_LIVE' && capabilities.secrets === true && capabilities.firestoreRead === true && capabilities.writes === true && capabilities.runtime === true && capabilities.browser === true && capabilities.deploy === true && capabilities.functionsDeploy === false && capabilities.rulesDeploy === false && capabilities.production === true);
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-rc12-approved-roster-final-go-live-request-v1' && request.status === 'AUTHORIZED_SINGLE_MACRO' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === false);
  add('REQUEST_BINDING', request.branch === LIVE_BRANCH && request.pullRequest === 5 && request.releaseBranch === RELEASE_BRANCH && request.releaseCommit === CANDIDATE && request.baseline === BASELINE && request.projectId === 'ays-orbit-360-lab' && request.tenantId === 'alianzas-soluciones');
  add('UNIFIED_CANDIDATE_PASS', unification.decision === 'CANDIDATE_UNIFICATION_STATIC_PASS' && unification.classification === 'GO_STATIC_CUMULATIVE_PRODUCT_DATA_BINDING' && unification.releaseCommit === CANDIDATE && unification.baseline === BASELINE && unification.passed === 22 && unification.failed === 0 && unification.ok === true && unification.reimportExecuted === false && unification.gate711Repeated === false);
  add('MANIFEST_BOUND', manifest.candidateId === 'gravicentra-insurance-rc1.2-unified' && manifest.releaseCommit === CANDIDATE && manifest.data?.reimportRequired === false && manifest.data?.dataLossObserved === false && manifest.access?.dataAbsent === false && manifest.store?.membershipRequired === true);
  add('APPROVED_ROSTER_EXACT', same(Object.keys(roster).sort(), ['advisor','direction','operations']) && Object.values(roster).every(item => item?.personRef && /^[a-f0-9]{64}$/.test(item?.emailSha256 || '')) && roster.advisor?.advisorIdSource === 'existing canonical advisor record');
  add('AUDIT_STILL_VALID', audit.decision === 'GO_STATIC_CUMULATIVE_MODULE_PARITY_WITH_MATURITY_GAPS' && audit.ok === true && audit.candidate === CANDIDATE && audit.counts?.routes === 31 && audit.counts?.failedModules === 0 && audit.guarantees?.moduleTreeParityBaseline === true && audit.guarantees?.moduleTreeParityLive === true && audit.guarantees?.noPostBaselineModuleChangesInLive === true);
  add('PROVISIONING_BOUNDARY', boundary.maximumAuthUsersCreated === 3 && boundary.maximumAuthUsersUpdated === 0 && boundary.maximumMembershipDocumentsWritten === 3 && boundary.maximumMembershipDocumentsCreated === 3 && boundary.maximumPasswordWrites === 3 && boundary.passwordReadsAllowed === 0 && boundary.maximumCustomTokensCreated === 3 && boundary.tokenPersistenceAllowed === false && boundary.existingUserMutationsAllowed === false && boundary.temporaryCredentialsExposedAllowed === false && boundary.temporaryCredentialsSentAllowed === false && boundary.atomicMembershipWrite === true && boundary.idempotentMembershipWrite === true && boundary.rollbackUsersCreated === true && boundary.rollbackMembershipsCreated === true && boundary.rollbackHosting === true);
  add('SCOPE_POSITIVE', scope.reconcileApprovedRosterByDigest === true && scope.readAllAuthUsers === true && scope.readCanonicalAdvisors === true && scope.createMissingApprovedUsersOnly === true && scope.temporaryRandomCredentials === true && scope.credentialsNotExposed === true && scope.credentialsNotSent === true && scope.createOrValidateExactlyThreeMemberships === true && scope.resolveSamuelAdvisorIdFromCanonicalRecord === true && scope.gate713AfterMemberships === true && scope.snapshotBeforeAfter === true && scope.hostingDeployOnly === true && scope.browserSmokeThreeProfiles === true && scope.validate430ClientsAndRealModules === true && scope.rollbackUsersMembershipsAndHosting === true);
  add('SCOPE_NEGATIVE', scope.modifyExistingUsers === false && scope.modifyTechnicalIdentity === false && scope.emailChangesToExistingUsers === false && scope.providerChangesToExistingUsers === false && scope.passwordChangesToExistingUsers === false && scope.reimport === false && scope.rules === false && scope.functions === false && scope.main === false && scope.merge === false && scope.gate711 === false && scope.generalPredeploy === false);
  add('REQUIRED_FILES', REQUIRED.every(exists), REQUIRED.filter(file => !exists(file)).join(','));

  git(['cat-file', '-e', `${BASELINE}^{commit}`]);
  git(['cat-file', '-e', `${CANDIDATE}^{commit}`]);
  add('CANDIDATE_LINEAGE', git(['merge-base', BASELINE, CANDIDATE]) === BASELINE);
  git(['fetch', '--no-tags', 'origin', RELEASE_BRANCH, LIVE_BRANCH]);
  add('RELEASE_IMMUTABLE', git(['rev-parse', `origin/${RELEASE_BRANCH}`]) === CANDIDATE);
  add('NO_MODULE_DELTA', git(['diff', '--name-only', `${BASELINE}..${CANDIDATE}`, '--', 'orbit360-platform/modules']) === '');

  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion: 'orbit360-rc12-approved-roster-final-go-live-contract-v1',
    gateId: GATE,
    contractVersion: VERSION,
    status: ok ? 'GO_GATE_CONTRACT' : 'VALIDATOR_STALE',
    classification: ok ? 'RC12_APPROVED_ROSTER_FINAL_GO_LIVE_READY' : 'VALIDATOR_STALE',
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
    maximumAuthUsersUpdated: 0,
    maximumMembershipDocumentsWritten: ok ? 3 : 0,
    maximumMembershipDocumentsCreated: ok ? 3 : 0,
    maximumPasswordWrites: ok ? 3 : 0,
    passwordReadsAuthorized: 0,
    customTokensAuthorized: ok ? 3 : 0,
    authWriteAuthorized: ok,
    runtimeAuthorized: ok,
    browserAuthorized: ok,
    deployAuthorized: ok,
    hostingDeployOnly: ok,
    rulesDeployAuthorized: false,
    functionsDeployAuthorized: false,
    productionAuthorized: ok,
    releaseCommit: CANDIDATE,
    baseline: BASELINE,
    dataAccess: false,
    secretAccess: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authReads: 0,
    authWrites: 0,
    userCreates: 0,
    runtimeExecuted: false,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false
  };
} catch (error) {
  result = {
    schemaVersion: 'orbit360-rc12-approved-roster-final-go-live-contract-v1',
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
    hostingDeployOnly: false,
    rulesDeployAuthorized: false,
    functionsDeployAuthorized: false,
    productionAuthorized: false,
    dataAccess: false,
    secretAccess: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    userCreates: 0,
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
