#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block7.14-rc12-normal-onboarding-close-v20260804';
const VERSION = '7.14.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-rc12-normal-onboarding-close-v20260804.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/rc12-normal-onboarding-close-v20260804.json';
const AUDIT = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-forensic-module-audit.json';
const PRIOR = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-rootcause-cumulative-closure-final.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const BASELINE = '27cb7dfcda8568280ebef15993a953364304f29b';
const CANDIDATE = 'b699ba329960cd830121b57452ce558399aa84fb';
const RELEASE_BRANCH = 'release/gravicentra-insurance-rc1-2-membership-auth-20260803';
const LIVE_BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const REQUIRED = [
  LIFECYCLE,
  REQUEST,
  AUDIT,
  PRIOR,
  'tools/orbit360-onboarding-normal-rc12-v20260804.mjs',
  'tools/orbit360-rc12-normal-onboarding-close-macro-v20260804.sh',
  'tools/orbit360-gravicentra-rc12-membership-runtime-v20260803.mjs',
  'tools/orbit360-gravicentra-rc12-browser-membership-smoke-v20260803.mjs',
  'tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs'
];

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail: String(detail || '').slice(0, 500) });
const read = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let result;
try {
  const lifecycle = read(LIFECYCLE);
  const request = read(REQUEST);
  const audit = read(AUDIT);
  const prior = read(PRIOR);
  const cap = lifecycle.executionProfile?.capabilities || {};
  const boundary = lifecycle.onboardingBoundary || {};
  const scope = request.scope || {};

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_STATUS', lifecycle.status === 'RC12_NORMAL_ONBOARDING_CLOSURE_AUTHORIZED' && lifecycle.singleGate === true && lifecycle.macroClosure === true);
  add('PHASE_CAPABILITIES', lifecycle.executionProfile?.phase === 'GRAVICENTRA_RC12_NORMAL_ONBOARDING_CLOSURE' && cap.secrets === true && cap.firestoreRead === true && cap.writes === true && cap.runtime === true && cap.browser === true && cap.deploy === true && cap.functionsDeploy === false && cap.rulesDeploy === false && cap.production === true);
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-rc12-normal-onboarding-close-request-v1' && request.status === 'AUTHORIZED_SINGLE_MACRO' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.retryAuthorized === false);
  add('REQUEST_BINDING', request.branch === LIVE_BRANCH && request.pullRequest === 5 && request.releaseBranch === RELEASE_BRANCH && request.releaseCommit === CANDIDATE && request.baseline === BASELINE && request.projectId === 'ays-orbit-360-lab' && request.tenantId === 'alianzas-soluciones');
  add('BOUNDARY_EXACT', boundary.maximumDocumentsWritten === 3 && boundary.maximumDocumentsCreated === 3 && same(boundary.exactProfiles, ['direccion','operativo','asesor']) && boundary.authWritesAllowed === 0 && boundary.userCreatesAllowed === 0 && boundary.userUpdatesAllowed === 0 && boundary.atomic === true && boundary.idempotent === true && boundary.rollbackRequired === true);
  add('SCOPE_POSITIVE', scope.authCensusReadOnly === true && scope.reconcileMemberships === true && scope.createExactlyThreeMembershipsConditional === true && scope.atomic === true && scope.idempotent === true && scope.snapshotBeforeAfter === true && scope.rollbackMemberships === true && scope.gate713AfterMemberships === true && scope.hostingDeployConditional === true && scope.browserSmokeThreeProfiles === true && scope.validate430Clients === true && scope.rollbackHosting === true);
  add('SCOPE_NEGATIVE', scope.authWrites === false && scope.userCreates === false && scope.userUpdates === false && scope.emailChanges === false && scope.providerChanges === false && scope.passwordReads === false && scope.passwordWrites === false && scope.reimport === false && scope.rules === false && scope.functions === false && scope.main === false && scope.merge === false && scope.gate711 === false && scope.generalPredeploy === false);
  add('PRIOR_CLOSED', prior.authorizationConsumed === true && prior.membershipForwardWrites === 0 && prior.authWrites === 0 && prior.productionMaintained === false && prior.ok === false);
  add('AUDIT_STILL_VALID', audit.decision === 'GO_STATIC_CUMULATIVE_MODULE_PARITY_WITH_MATURITY_GAPS' && audit.ok === true && audit.candidate === CANDIDATE && audit.counts?.routes === 31 && audit.counts?.failedModules === 0 && audit.guarantees?.moduleTreeParityBaseline === true && audit.guarantees?.moduleTreeParityLive === true);
  add('REQUIRED_FILES', REQUIRED.every(exists), REQUIRED.filter(x => !exists(x)).join(','));

  git(['cat-file','-e',`${BASELINE}^{commit}`]);
  git(['cat-file','-e',`${CANDIDATE}^{commit}`]);
  add('CANDIDATE_LINEAGE', git(['merge-base', BASELINE, CANDIDATE]) === BASELINE);
  git(['fetch','--no-tags','origin',RELEASE_BRANCH,LIVE_BRANCH]);
  add('RELEASE_IMMUTABLE', git(['rev-parse',`origin/${RELEASE_BRANCH}`]) === CANDIDATE);
  add('NO_MODULE_DELTA', git(['diff','--name-only',`${BASELINE}..${CANDIDATE}`,'--','orbit360-platform/modules']) === '');

  const failed = checks.filter(x => !x.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion: 'orbit360-rc12-normal-onboarding-close-contract-v1',
    gateId: GATE,
    contractVersion: VERSION,
    status: ok ? 'GO_GATE_CONTRACT' : 'VALIDATOR_STALE',
    classification: ok ? 'RC12_NORMAL_ONBOARDING_CLOSURE_READY' : 'VALIDATOR_STALE',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    failedCheckIds: failed.map(x => x.id),
    checks,
    executionAuthorized: ok,
    secretAccessAuthorized: ok,
    firestoreReadAuthorized: ok,
    writeAuthorized: ok,
    maximumFirestoreDocumentsWritten: ok ? 3 : 0,
    maximumFirestoreDocumentsCreated: ok ? 3 : 0,
    authWriteAuthorized: false,
    runtimeAuthorized: ok,
    browserAuthorized: ok,
    deployAuthorized: ok,
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
    runtimeExecuted: false,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false
  };
} catch (error) {
  result = {
    schemaVersion: 'orbit360-rc12-normal-onboarding-close-contract-v1',
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
    rulesDeployAuthorized: false,
    functionsDeployAuthorized: false,
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
