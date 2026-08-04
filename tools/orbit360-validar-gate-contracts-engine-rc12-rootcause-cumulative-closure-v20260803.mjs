#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block7.13-rc12-membership-rootcause-cumulative-closure-v20260803';
const VERSION = '7.13.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-rc12-rootcause-cumulative-closure-v20260803.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/rc12-rootcause-cumulative-closure-v20260803.json';
const AUDIT = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-forensic-module-audit.json';
const AUTH_GATE = 'tools/orbit360-validar-auth-membership-antiregression-v20260803.mjs';
const DIAGNOSTIC = 'tools/orbit360-diagnosticar-memberships-normales-v20260803.mjs';
const NORMALIZER = 'tools/orbit360-normalizar-membership-direccion-rc12-v20260803.mjs';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const BASELINE = '27cb7dfcda8568280ebef15993a953364304f29b';
const CANDIDATE = 'b699ba329960cd830121b57452ce558399aa84fb';
const RELEASE_BRANCH = 'release/gravicentra-insurance-rc1-2-membership-auth-20260803';
const LIVE_BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const REQUIRED_RUNTIME = ['cliente360','aseguradoras','polizas','cobros','ops','leads'];

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok:Boolean(ok), detail:String(detail || '').slice(0,600) });
const read = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const git = args => execFileSync('git', args, { cwd:ROOT, encoding:'utf8' }).trim();
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const write = payload => {
  fs.mkdirSync(path.dirname(OUT), { recursive:true });
  fs.writeFileSync(OUT, JSON.stringify({ ...payload, containsPII:false, containsSecrets:false }, null, 2) + '\n', 'utf8');
};

let result;
try {
  const lifecycle = read(LIFECYCLE);
  const request = read(REQUEST);
  const audit = read(AUDIT);
  const phase = lifecycle.executionProfile?.phase;
  const capabilities = lifecycle.executionProfile?.capabilities || {};

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_AUTHORIZED', lifecycle.status === 'RC12_ROOTCAUSE_CUMULATIVE_CLOSURE_AUTHORIZED' && lifecycle.singleGate === true && lifecycle.macroClosure === true);
  add('PHASE_CAPABILITIES', phase === 'GRAVICENTRA_RC12_ROOTCAUSE_CUMULATIVE_AUDIT_CLOSURE' && capabilities.secrets === true && capabilities.firestoreRead === true && capabilities.writes === true && capabilities.runtime === true && capabilities.browser === true && capabilities.deploy === true && capabilities.functionsDeploy === false && capabilities.rulesDeploy === false && capabilities.production === true);
  add('AUTHORIZATION_ACTIVE', lifecycle.authorization?.requiredForExecution === true && lifecycle.authorization?.activeRequest === true && lifecycle.authorization?.allowedExecutions === 1 && lifecycle.authorization?.request === REQUEST && lifecycle.authorization?.replayAllowed === false);
  add('REQUEST_SCHEMA', request.schemaVersion === 'orbit360-rc12-rootcause-cumulative-closure-request-v1' && request.status === 'AUTHORIZED_SINGLE_MACRO' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.retryAuthorized === false);
  add('REQUEST_BINDING', request.branch === LIVE_BRANCH && request.pullRequest === 5 && request.releaseBranch === RELEASE_BRANCH && request.releaseCommit === CANDIDATE && request.baseline === BASELINE && request.projectId === 'ays-orbit-360-lab' && request.tenantId === 'alianzas-soluciones');
  add('REQUEST_ORDER', request.scope?.forensicAuditBeforeSecrets === true && request.scope?.authAntiregressionBeforeSecrets === true && request.scope?.diagnosticBeforeWrite === true && request.scope?.exactlyOneDirectionCandidateRequired === true && request.scope?.normalizationConditional === true && request.scope?.threeProfilesBeforeDeploy === true && request.scope?.hostingDeployConditional === true && request.scope?.browserSmokeThreeProfiles === true && request.scope?.snapshotBeforeAfter === true && request.scope?.rollbackMembership === true && request.scope?.rollbackHosting === true);
  add('REQUEST_NEGATIVE_SCOPE', request.scope?.authWrites === false && request.scope?.userCreates === false && request.scope?.userUpdates === false && request.scope?.passwordReads === false && request.scope?.passwordWrites === false && request.scope?.reimport === false && request.scope?.rules === false && request.scope?.functions === false && request.scope?.main === false && request.scope?.merge === false && request.scope?.gate711 === false && request.scope?.generalPredeploy === false);
  add('AUDIT_DECISION', audit.decision === 'GO_STATIC_CUMULATIVE_MODULE_PARITY_WITH_MATURITY_GAPS' && audit.ok === true && audit.baseline === BASELINE && audit.candidate === CANDIDATE && audit.counts?.routes === 31 && audit.counts?.failedModules === 0);
  add('AUDIT_GUARANTEES', audit.guarantees?.candidateDescendsFromBaseline === true && audit.guarantees?.moduleTreeParityBaseline === true && audit.guarantees?.moduleTreeParityLive === true && audit.guarantees?.noPostBaselineModuleChangesInLive === true && audit.guarantees?.candidateOnlyChangesAllowedRuntimeOwners === true && audit.guarantees?.allActiveModulesSyntaxAndRegistration === true);
  add('NORMALIZATION_BOUNDARY', lifecycle.normalizationBoundary?.maximumDocumentsWritten === 1 && same(lifecycle.normalizationBoundary?.allowedFields, ['tenantId','status','roles','defaultRole','activeRole']) && lifecycle.normalizationBoundary?.authWritesAllowed === 0 && lifecycle.normalizationBoundary?.userCreatesAllowed === 0 && lifecycle.normalizationBoundary?.userUpdatesAllowed === 0 && lifecycle.normalizationBoundary?.advisorIdChangesAllowed === false && lifecycle.normalizationBoundary?.scopeChangesAllowed === false && lifecycle.normalizationBoundary?.emailChangesAllowed === false && lifecycle.normalizationBoundary?.providerChangesAllowed === false && lifecycle.normalizationBoundary?.uidChangesAllowed === false && lifecycle.normalizationBoundary?.atomic === true && lifecycle.normalizationBoundary?.idempotent === true && lifecycle.normalizationBoundary?.rollbackRequired === true);
  add('RUNTIME_MODULES', same(lifecycle.requiredRuntimeModules, REQUIRED_RUNTIME));
  add('GUARDS', lifecycle.guards?.diagnosticBeforeWrite === true && lifecycle.guards?.exactlyOneDirectionCandidateRequired === true && lifecycle.guards?.forensicAuditPassBeforeSecrets === true && lifecycle.guards?.authAntiregressionPassBeforeSecrets === true && lifecycle.guards?.hostingDeployOnlyAfterThreeProfilesPass === true && lifecycle.guards?.snapshotBeforeAfterRequired === true && lifecycle.guards?.rollbackHostingOnSmokeFailure === true && lifecycle.guards?.rollbackMembershipOnDownstreamFailure === true && lifecycle.guards?.reimportAllowed === false && lifecycle.guards?.firestoreRulesDeployAllowed === false && lifecycle.guards?.functionsDeployAllowed === false && lifecycle.guards?.mainAllowed === false && lifecycle.guards?.mergeAllowed === false && lifecycle.guards?.repeatGate711Allowed === false && lifecycle.guards?.openGeneralPredeployAllowed === false);
  add('REQUIRED_FILES', [LIFECYCLE,REQUEST,AUDIT,AUTH_GATE,DIAGNOSTIC,NORMALIZER].every(exists));

  git(['cat-file','-e',`${BASELINE}^{commit}`]);
  git(['cat-file','-e',`${CANDIDATE}^{commit}`]);
  add('CANDIDATE_LINEAGE', git(['merge-base',BASELINE,CANDIDATE]) === BASELINE);
  git(['fetch','--no-tags','origin',RELEASE_BRANCH,LIVE_BRANCH]);
  add('RELEASE_BRANCH_IMMUTABLE', git(['rev-parse',`origin/${RELEASE_BRANCH}`]) === CANDIDATE);
  const moduleDiff = git(['diff','--name-only',`${BASELINE}..${CANDIDATE}`,'--','orbit360-platform/modules']).split(/\r?\n/).filter(Boolean);
  add('NO_MODULE_DELTA_FROM_BASELINE', moduleDiff.length === 0, moduleDiff.join(','));

  const failed = checks.filter(item => !item.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion:'orbit360-rc12-rootcause-cumulative-closure-contract-v1',
    gateId:GATE,
    contractVersion:VERSION,
    status:ok ? 'GO_GATE_CONTRACT' : 'VALIDATOR_STALE',
    classification:ok ? 'RC12_ROOTCAUSE_CUMULATIVE_CLOSURE_EXECUTION_READY' : 'VALIDATOR_STALE',
    total:checks.length,
    passed:checks.length - failed.length,
    failed:failed.length,
    failedCheckIds:failed.map(item => item.id),
    checks,
    executionAuthorized:ok,
    secretAccessAuthorized:ok,
    firestoreReadAuthorized:ok,
    writeAuthorized:ok,
    maximumFirestoreDocumentsWritten:ok ? 1 : 0,
    authWriteAuthorized:false,
    runtimeAuthorized:ok,
    browserAuthorized:ok,
    deployAuthorized:ok,
    rulesDeployAuthorized:false,
    functionsDeployAuthorized:false,
    productionAuthorized:ok,
    baseline:BASELINE,
    releaseBranch:RELEASE_BRANCH,
    releaseCommit:CANDIDATE,
    liveBranch:LIVE_BRANCH,
    requiredRuntimeModules:REQUIRED_RUNTIME,
    forensicAuditDecision:audit.decision,
    forensicAuditRoutes:audit.counts?.routes || 0,
    dataAccess:false,
    secretAccess:false,
    firestoreRead:false,
    firestoreWrites:0,
    authWrites:0,
    runtimeExecuted:false,
    browserExecuted:false,
    deployExecuted:false,
    productionTouched:false
  };
} catch (error) {
  result = {
    schemaVersion:'orbit360-rc12-rootcause-cumulative-closure-contract-v1',
    gateId:GATE,
    contractVersion:VERSION,
    status:'VALIDATOR_STALE',
    classification:'PIPELINE_MECHANISM_FAILURE',
    failed:1,
    failedCheckIds:['RC12_ROOTCAUSE_CONTRACT_ENGINE_EXCEPTION'],
    error:String(error?.message || error).replace(/[\r\n]+/g,' ').slice(0,700),
    executionAuthorized:false,
    secretAccessAuthorized:false,
    firestoreReadAuthorized:false,
    writeAuthorized:false,
    authWriteAuthorized:false,
    runtimeAuthorized:false,
    browserAuthorized:false,
    deployAuthorized:false,
    rulesDeployAuthorized:false,
    functionsDeployAuthorized:false,
    productionAuthorized:false,
    dataAccess:false,
    secretAccess:false,
    firestoreRead:false,
    firestoreWrites:0,
    authWrites:0,
    runtimeExecuted:false,
    browserExecuted:false,
    deployExecuted:false,
    productionTouched:false
  };
}
write(result);
console.log(JSON.stringify(result,null,2));
process.exit(result.status === 'GO_GATE_CONTRACT' ? 0 : 41);
