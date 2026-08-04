#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const GATE715_ENGINE = 'tools/orbit360-validar-gate-contracts-engine-rc12-approved-roster-final-go-live-v20260804.mjs';
const GATE715_LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-rc12-approved-roster-final-go-live-v20260804.json';
const GATE713_ENGINE = 'tools/orbit360-validar-gate-contracts-engine-rc12-rootcause-cumulative-closure-v20260803.mjs';
const MACRO = 'tools/orbit360-rc12-approved-roster-final-go-live-macro-v20260804.sh';
const REQUEST = '.github/orbit360-requests/rc12-approved-roster-final-postrollback-v20260804.json';
const RECOVERY_EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-approved-roster-rollback-recovery-final.json';
const PROOF = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-final-postrollback-rootfix-static.json';
const AUTH_REF = 'user_authorizes_single_final_post_rollback_rc12_20260804T0734-0600';

function replaceOnce(source, before, after, id) {
  if (source.includes(after)) return source;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${id}_MATCH_COUNT_${count}`);
  return source.replace(before, after);
}

let lifecycle = JSON.parse(fs.readFileSync(GATE715_LIFECYCLE, 'utf8'));
lifecycle.status = 'RC12_APPROVED_ROSTER_FINAL_GO_LIVE_POST_ROLLBACK_AUTHORIZED';
lifecycle.authorization = {
  requiredForExecution: true,
  activeRequest: true,
  allowedExecutions: 1,
  request: REQUEST,
  replayAllowed: false,
  previousRun: 30911627137,
  previousDecision: 'APPROVED_ROSTER_ROLLBACK_RECOVERY_PASS',
  authorizationSource: AUTH_REF
};
lifecycle.postRollbackRecovery = {
  run: 30911627137,
  job: 91999553849,
  artifact: 8893311529,
  artifactDigest: 'sha256:8dc8bf7f5210e0c283032171d3ff4028eaa2be33060213dbd088e838621ad844',
  evidence: RECOVERY_EVIDENCE,
  remainingOwnedMemberships: 0,
  remainingOwnedUsers: 0,
  gate713AbsolutePathCorrected: true,
  rollbackReadBeforeWriteCorrected: true
};
lifecycle.guards = {
  ...(lifecycle.guards || {}),
  postRollbackRecoveryPassRequired: true,
  gate713AbsolutePathCorrected: true,
  rollbackReadBeforeWriteCorrected: true
};
fs.writeFileSync(GATE715_LIFECYCLE, JSON.stringify(lifecycle, null, 2) + '\n', 'utf8');

let gate715 = fs.readFileSync(GATE715_ENGINE, 'utf8');
gate715 = replaceOnce(
  gate715,
  "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/rc12-approved-roster-final-go-live-resume-v20260804.json';",
  `const REQUEST = process.env.ORBIT360_REQUEST_FILE || '${REQUEST}';`,
  'GATE715_REQUEST_DEFAULT'
);
gate715 = replaceOnce(
  gate715,
  "  'orbit360-platform/runtime-gate-crm-v20260716/rc12-approved-roster-reconciler-rootfix-static.json',",
  "  'orbit360-platform/runtime-gate-crm-v20260716/rc12-approved-roster-reconciler-rootfix-static.json',\n  'orbit360-platform/runtime-gate-crm-v20260716/rc12-approved-roster-rollback-recovery-final.json',",
  'GATE715_RECOVERY_REQUIRED'
);
gate715 = replaceOnce(
  gate715,
  "lifecycle.status === 'RC12_APPROVED_ROSTER_FINAL_GO_LIVE_POST_ROOTFIX_AUTHORIZED'",
  "lifecycle.status === 'RC12_APPROVED_ROSTER_FINAL_GO_LIVE_POST_ROLLBACK_AUTHORIZED'",
  'GATE715_LIFECYCLE_STATUS'
);
const oldActive = "request.schemaVersion === 'orbit360-rc12-approved-roster-final-go-live-request-v1' && request.status === 'AUTHORIZED_POST_ROOTFIX_RESUME' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && request.postStopRetry === true && request.priorRuns?.finalMacro === 30908259200 && request.priorRuns?.rootfixInitial === 30908742658 && request.priorRuns?.rootfixCorrective === 30908887853 && request.failureFamily === 'UNTRACKED_FILE_DELTA_ENUMERATION'";
const newActive = "request.schemaVersion === 'orbit360-rc12-approved-roster-final-go-live-request-v1' && request.status === 'AUTHORIZED_FINAL_POST_ROLLBACK' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === false && request.postRollbackFinal === true && request.authorizationRef === 'user_authorizes_single_final_post_rollback_rc12_20260804T0734-0600' && request.priorRollbackRecovery?.run === 30911627137 && request.priorRollbackRecovery?.decision === 'APPROVED_ROSTER_ROLLBACK_RECOVERY_PASS' && request.priorRollbackRecovery?.remainingOwnedMemberships === 0 && request.priorRollbackRecovery?.remainingOwnedUsers === 0";
gate715 = replaceOnce(gate715, oldActive, newActive, 'GATE715_REQUEST_ACTIVE');
const oldBinding = "lifecycle.authorization?.request === REQUEST && lifecycle.authorization?.previousRun === 30908259200 && lifecycle.rootFix?.evidence === 'orbit360-platform/runtime-gate-crm-v20260716/rc12-approved-roster-reconciler-rootfix-static.json'";
const newBinding = "lifecycle.authorization?.request === REQUEST && lifecycle.authorization?.previousRun === 30911627137 && lifecycle.authorization?.authorizationSource === 'user_authorizes_single_final_post_rollback_rc12_20260804T0734-0600' && lifecycle.rootFix?.evidence === 'orbit360-platform/runtime-gate-crm-v20260716/rc12-approved-roster-reconciler-rootfix-static.json' && lifecycle.postRollbackRecovery?.evidence === 'orbit360-platform/runtime-gate-crm-v20260716/rc12-approved-roster-rollback-recovery-final.json' && lifecycle.postRollbackRecovery?.remainingOwnedMemberships === 0 && lifecycle.postRollbackRecovery?.remainingOwnedUsers === 0";
gate715 = replaceOnce(gate715, oldBinding, newBinding, 'GATE715_LIFECYCLE_BINDING');
const oldScope = "scope.reconcileApprovedRosterByDigest === true && scope.readAllAuthUsers === true && scope.readCanonicalAdvisors === true && scope.createMissingApprovedUsersOnly === true && scope.temporaryRandomCredentials === true && scope.credentialsNotExposed === true && scope.credentialsNotSent === true && scope.createOrValidateExactlyThreeMemberships === true && scope.resolveSamuelAdvisorIdFromCanonicalRecord === true && scope.gate713AfterMemberships === true && scope.snapshotBeforeAfter === true && scope.hostingDeployOnly === true && scope.browserSmokeThreeProfiles === true && scope.validate430ClientsAndRealModules === true && scope.rollbackUsersMembershipsAndHosting === true";
const newScope = `${oldScope} && scope.postRollbackRecoveryVerified === true && scope.gate713AbsolutePathCorrected === true && scope.rollbackOwnersCorrected === true`;
gate715 = replaceOnce(gate715, oldScope, newScope, 'GATE715_SCOPE_POSITIVE');
fs.writeFileSync(GATE715_ENGINE, gate715, 'utf8');

let gate713 = fs.readFileSync(GATE713_ENGINE, 'utf8');
gate713 = replaceOnce(
  gate713,
  "const REQUIRED_RUNTIME = ['cliente360','aseguradoras','polizas','cobros','ops','leads'];",
  "const REQUIRED_RUNTIME = ['cliente360','aseguradoras','polizas','cobros','ops','leads'];\nconst EPHEMERAL_POST_MEMBERSHIP_REQUEST = path.isAbsolute(REQUEST) && path.basename(REQUEST) === 'rc12-gate713-post-approved-roster-request.json';",
  'GATE713_EPHEMERAL_CONST'
);
const oldAuth = "lifecycle.authorization?.requiredForExecution === true && lifecycle.authorization?.activeRequest === true && lifecycle.authorization?.allowedExecutions === 1 && lifecycle.authorization?.request === REQUEST && lifecycle.authorization?.replayAllowed === false";
const newAuth = "lifecycle.authorization?.requiredForExecution === true && lifecycle.authorization?.activeRequest === true && lifecycle.authorization?.allowedExecutions === 1 && (lifecycle.authorization?.request === REQUEST || EPHEMERAL_POST_MEMBERSHIP_REQUEST) && lifecycle.authorization?.replayAllowed === false";
gate713 = replaceOnce(gate713, oldAuth, newAuth, 'GATE713_AUTH_BINDING');
const oldSchema = "request.schemaVersion === 'orbit360-rc12-rootcause-cumulative-closure-request-v1' && request.status === 'AUTHORIZED_SINGLE_MACRO' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.retryAuthorized === false";
const newSchema = "request.schemaVersion === 'orbit360-rc12-rootcause-cumulative-closure-request-v1' && request.status === 'AUTHORIZED_SINGLE_MACRO' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.retryAuthorized === false && (!EPHEMERAL_POST_MEMBERSHIP_REQUEST || (request.postRollbackFinal === true && request.parentAuthorizationRef === 'user_authorizes_single_final_post_rollback_rc12_20260804T0734-0600' && request.rollbackRecoveryRun === 30911627137))";
gate713 = replaceOnce(gate713, oldSchema, newSchema, 'GATE713_REQUEST_SCHEMA');
fs.writeFileSync(GATE713_ENGINE, gate713, 'utf8');

let macro = fs.readFileSync(MACRO, 'utf8');
macro = replaceOnce(
  macro,
  '  "retryAuthorized":false,\n  "branch":"ays/backend-tenant-lab-v99-20260703",',
  '  "retryAuthorized":false,\n  "postRollbackFinal":true,\n  "parentAuthorizationRef":"user_authorizes_single_final_post_rollback_rc12_20260804T0734-0600",\n  "rollbackRecoveryRun":30911627137,\n  "branch":"ays/backend-tenant-lab-v99-20260703",',
  'MACRO_GATE713_BINDING'
);
fs.writeFileSync(MACRO, macro, 'utf8');

const checks = {
  gate715RequestBound: gate715.includes(`const REQUEST = process.env.ORBIT360_REQUEST_FILE || '${REQUEST}';`),
  gate715LifecyclePostRollback: gate715.includes('RC12_APPROVED_ROSTER_FINAL_GO_LIVE_POST_ROLLBACK_AUTHORIZED'),
  gate715AuthorizationRefBound: gate715.includes(AUTH_REF),
  gate715RecoveryEvidenceRequired: gate715.includes(RECOVERY_EVIDENCE),
  lifecycleRequestBound: lifecycle.authorization?.request === REQUEST,
  lifecycleRecoveryBound: lifecycle.postRollbackRecovery?.run === 30911627137 && lifecycle.postRollbackRecovery?.remainingOwnedUsers === 0 && lifecycle.postRollbackRecovery?.remainingOwnedMemberships === 0,
  gate713AbsolutePathPreserved: gate713.includes('path.isAbsolute(rel) ? rel : path.join(ROOT, rel)'),
  gate713EphemeralRequestBound: gate713.includes('EPHEMERAL_POST_MEMBERSHIP_REQUEST') && gate713.includes('request.rollbackRecoveryRun === 30911627137'),
  macroGate713RequestBound: macro.includes('"postRollbackFinal":true') && macro.includes('"rollbackRecoveryRun":30911627137'),
  rollbackReadBeforeWritePreserved: fs.readFileSync('tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs', 'utf8').includes('const owned = [];'),
  hostingOnlyPreserved: macro.includes('firebase deploy --only hosting --project "$ORBIT360_PROJECT_ID" --config firebase.json --non-interactive'),
  forbiddenOperationsAbsent: !/firebase deploy[^\n]*(functions|firestore|rules)/.test(macro)
};
const ok = Object.values(checks).every(Boolean);
fs.mkdirSync(path.dirname(PROOF), { recursive: true });
fs.writeFileSync(PROOF, JSON.stringify({
  schemaVersion: 'orbit360-rc12-final-postrollback-rootfix-static-v1',
  generatedAt: new Date().toISOString(),
  decision: ok ? 'RC12_FINAL_POSTROLLBACK_ROOTFIX_STATIC_PASS' : 'RC12_FINAL_POSTROLLBACK_ROOTFIX_STATIC_FAIL',
  classification: ok ? 'GO_STATIC_PIPELINE_ROOTFIX' : 'PIPELINE_MECHANISM_FAILURE',
  authorizationRef: AUTH_REF,
  request: REQUEST,
  recoveryRun: 30911627137,
  checks,
  secretAccess: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authRead: false,
  authWrites: 0,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  ok
}, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ decision: ok ? 'PASS' : 'FAIL', checks, ok }, null, 2));
process.exit(ok ? 0 : 41);
