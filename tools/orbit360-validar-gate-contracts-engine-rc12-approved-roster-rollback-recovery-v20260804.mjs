#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block7.15.2-rc12-approved-roster-rollback-recovery-v20260804';
const VERSION = '7.15.2';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-rc12-approved-roster-rollback-recovery-v20260804.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/rc12-approved-roster-rollback-recovery-v20260804.json';
const CLEANUP = 'tools/orbit360-recuperar-rollback-roster-rc12-v20260804.mjs';
const PROVISIONER = 'tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs';
const GATE713 = 'tools/orbit360-validar-gate-contracts-engine-rc12-rootcause-cumulative-closure-v20260803.mjs';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const RELEASE = 'b699ba329960cd830121b57452ce558399aa84fb';
const LIVE_BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const checks = [];
const add = (id, ok, detail='') => checks.push({ id, ok:Boolean(ok), detail:String(detail||'').slice(0,600) });
const read = rel => JSON.parse(fs.readFileSync(path.isAbsolute(rel) ? rel : path.join(ROOT, rel), 'utf8'));
const exists = rel => fs.existsSync(path.isAbsolute(rel) ? rel : path.join(ROOT, rel));
const git = args => execFileSync('git', args, { cwd:ROOT, encoding:'utf8' }).trim();

let result;
try {
  const lifecycle = read(LIFECYCLE);
  const request = read(REQUEST);
  const boundary = lifecycle.rollbackBoundary || {};
  const capabilities = lifecycle.executionProfile?.capabilities || {};
  const cleanup = fs.readFileSync(path.join(ROOT, CLEANUP), 'utf8');
  const provisioner = fs.readFileSync(path.join(ROOT, PROVISIONER), 'utf8');
  const gate713 = fs.readFileSync(path.join(ROOT, GATE713), 'utf8');

  add('GATE_ID_VERSION', process.argv[2] === GATE && lifecycle.gateId === GATE && lifecycle.gateContractVersion === VERSION);
  add('LIFECYCLE_AUTHORIZED', lifecycle.status === 'RC12_APPROVED_ROSTER_ROLLBACK_RECOVERY_AUTHORIZED' && lifecycle.singleGate === true && lifecycle.macroClosure === true);
  add('PHASE_CAPABILITIES', lifecycle.executionProfile?.phase === 'GRAVICENTRA_RC12_APPROVED_ROSTER_ROLLBACK_RECOVERY' && capabilities.secrets === true && capabilities.firestoreRead === true && capabilities.writes === true && capabilities.runtime === false && capabilities.browser === false && capabilities.deploy === false && capabilities.functionsDeploy === false && capabilities.rulesDeploy === false && capabilities.production === false);
  add('REQUEST_ACTIVE', request.schemaVersion === 'orbit360-rc12-approved-roster-rollback-recovery-request-v1' && request.status === 'AUTHORIZED_ROLLBACK_RECOVERY_ONLY' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false);
  add('REQUEST_BINDING', request.branch === LIVE_BRANCH && request.pullRequest === 5 && request.releaseCommit === RELEASE && request.projectId === 'ays-orbit-360-lab' && request.tenantId === 'alianzas-soluciones' && request.failedRun === 30910775651 && request.failedJob === 91996692820 && request.artifact === 8892990988 && request.artifactDigest === 'sha256:4984ec2d39f8f1647f76dfdbb5d69a8fb849e8ce6d273289193467e0c7148281');
  add('INCIDENT_EXACT', lifecycle.incident?.failedRun === 30910775651 && lifecycle.incident?.authUsersCreated === 3 && lifecycle.incident?.membershipsCreated === 3 && lifecycle.incident?.hostingDeployAttempted === false && lifecycle.incident?.gate713Failure === 'ABSOLUTE_REQUEST_PATH_JOINED_TO_ROOT' && lifecycle.incident?.rollbackFailure === 'FIRESTORE_TRANSACTION_READ_AFTER_WRITE');
  add('DELETE_BOUNDARY', boundary.maximumMembershipDocumentsDeleted === 3 && boundary.maximumAuthUsersDeleted === 3 && boundary.authUsersCreatedAllowed === 0 && boundary.authUsersUpdatedAllowed === 0 && boundary.membershipDocumentsCreatedAllowed === 0 && boundary.membershipDocumentsUpdatedAllowed === 0 && boundary.passwordReadsAllowed === 0 && boundary.passwordWritesAllowed === 0 && boundary.hostingDeployAllowed === false && boundary.hostingRollbackRequired === false);
  add('OWNERSHIP_GUARDS', boundary.exactOnboardingRunId === '30910775651' && boundary.exactOnboardingVersion === 'rc12-approved-roster-final-v1' && boundary.creationWindowStart === '2026-08-04T12:49:45.000Z' && boundary.creationWindowEnd === '2026-08-04T12:50:15.000Z' && boundary.approvedRosterDigestRequired === true && boundary.technicalIdentityExcluded === true && boundary.preReadAllMembershipsBeforeDelete === true);
  add('REQUEST_SCOPE', request.scope?.deleteExactlyThreeOwnedMemberships === true && request.scope?.deleteExactlyThreeOwnedAuthUsers === true && request.scope?.verifyCreationWindow === true && request.scope?.verifyOnboardingRunId === true && request.scope?.verifyApprovedRosterDigest === true && request.scope?.excludeTechnicalIdentity === true && request.scope?.authCreates === false && request.scope?.authUpdates === false && request.scope?.membershipCreates === false && request.scope?.membershipUpdates === false && request.scope?.hostingDeploy === false && request.scope?.browser === false && request.scope?.reimport === false && request.scope?.rules === false && request.scope?.functions === false && request.scope?.main === false && request.scope?.merge === false && request.scope?.gate711 === false);
  add('CLEANUP_OWNER_GUARDS', cleanup.includes("const FAILED_RUN_ID = '30910775651'") && cleanup.includes("const ONBOARDING_VERSION = 'rc12-approved-roster-final-v1'") && cleanup.includes("const WINDOW_START = Date.parse('2026-08-04T12:49:45.000Z')") && cleanup.includes("const WINDOW_END = Date.parse('2026-08-04T12:50:15.000Z')") && cleanup.includes('sourceDigestMatchesContract') && cleanup.includes('technicalIdentityExcluded') && cleanup.includes('batch.delete') && cleanup.includes('auth.deleteUsers'));
  add('ROLLBACK_OWNER_FIXED', provisioner.includes('const owned = [];') && provisioner.includes('for (const entry of owned) tx.delete(entry.ref);'));
  add('GATE713_ABSOLUTE_PATH_FIXED', gate713.includes('path.isAbsolute(rel) ? rel : path.join(ROOT, rel)'));
  add('REQUIRED_FILES', [LIFECYCLE,REQUEST,CLEANUP,PROVISIONER,GATE713].every(exists));
  git(['cat-file','-e',`${RELEASE}^{commit}`]);
  add('RELEASE_EXISTS', true);

  const failed = checks.filter(x=>!x.ok);
  const ok = failed.length === 0;
  result = {
    schemaVersion:'orbit360-rc12-approved-roster-rollback-recovery-contract-v1',
    gateId:GATE,
    contractVersion:VERSION,
    status:ok?'GO_GATE_CONTRACT':'VALIDATOR_STALE',
    classification:ok?'RC12_APPROVED_ROSTER_ROLLBACK_RECOVERY_READY':'VALIDATOR_STALE',
    total:checks.length,
    passed:checks.length-failed.length,
    failed:failed.length,
    failedCheckIds:failed.map(x=>x.id),
    checks,
    executionAuthorized:ok,
    secretAccessAuthorized:ok,
    firestoreReadAuthorized:ok,
    membershipDeletesAuthorized:ok?3:0,
    authReadAuthorized:ok,
    authDeletesAuthorized:ok?3:0,
    authCreatesAuthorized:0,
    authUpdatesAuthorized:0,
    membershipCreatesAuthorized:0,
    membershipUpdatesAuthorized:0,
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
    authRead:false,
    authWrites:0,
    deployExecuted:false,
    productionTouched:false,
    containsPII:false,
    containsSecrets:false
  };
} catch (error) {
  result = {schemaVersion:'orbit360-rc12-approved-roster-rollback-recovery-contract-v1',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',error:String(error?.message||error).replace(/[\r\n]+/g,' ').slice(0,700),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,membershipDeletesAuthorized:0,authReadAuthorized:false,authDeletesAuthorized:0,authCreatesAuthorized:0,authUpdatesAuthorized:0,runtimeAuthorized:false,browserAuthorized:false,deployAuthorized:false,productionAuthorized:false,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authRead:false,authWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
}
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');
console.log(JSON.stringify(result,null,2));
process.exit(result.status==='GO_GATE_CONTRACT'?0:41);
