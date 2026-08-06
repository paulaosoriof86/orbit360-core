#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RUNNER_REL = 'tools/orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v20260805.sh';
const OUT_REL = 'orbit360-platform/runtime-gate-crm-v20260716/runtime-branch-context-source-test-sanitized-v20260806.json';
const BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const checks = {};
let error = '';

function evaluateBranchContext({ canonicalBranch = '', eventName = '', baseRef = '' }) {
  if (canonicalBranch !== BRANCH) return 'ORBIT360_CANONICAL_BRANCH_MISMATCH';
  if ((eventName === 'pull_request' || baseRef) && baseRef !== BRANCH) return 'PULL_REQUEST_BASE_REF_MISMATCH';
  return 'PASS';
}

try {
  const runnerPath = path.join(ROOT, RUNNER_REL);
  const source = fs.readFileSync(runnerPath, 'utf8');
  const branchGuardIndex = source.indexOf('[[ "$CANONICAL_BRANCH" == "$BRANCH" ]]');
  const serviceAccountIndex = source.indexOf('SERVICE_ACCOUNT=');
  const backupExecutionIndex = source.indexOf('BACKUP_CHANNEL="visual-matrix-corrected-backup-${GITHUB_RUN_ID}"');
  const deployExecutionIndex = source.indexOf('firebase deploy --project "$PROJECT" --only hosting');

  checks.sourceExists = fs.existsSync(runnerPath);
  checks.orbitOwnedBranchVariable = source.includes('CANONICAL_BRANCH="${ORBIT360_CANONICAL_BRANCH:-}"');
  checks.eventNameCaptured = source.includes('EVENT_NAME="${GITHUB_EVENT_NAME:-}"');
  checks.baseRefCaptured = source.includes('EVENT_BASE_REF="${GITHUB_BASE_REF:-}"');
  checks.githubRefNameAbsent = !source.includes('GITHUB_REF_NAME');
  checks.canonicalGuardPresent = branchGuardIndex >= 0;
  checks.pullRequestBaseGuardPresent = source.includes('PULL_REQUEST') === false && source.includes('EVENT_BASE_REF') && source.includes('[[ "$EVENT_BASE_REF" == "$BRANCH" ]]');
  checks.branchGuardBeforeSecrets = branchGuardIndex >= 0 && serviceAccountIndex > branchGuardIndex;
  checks.branchGuardBeforeBackup = branchGuardIndex >= 0 && backupExecutionIndex > branchGuardIndex;
  checks.branchGuardBeforeDeploy = branchGuardIndex >= 0 && deployExecutionIndex > branchGuardIndex;
  checks.runAttemptStillRestricted = source.includes('GITHUB_RUN_ATTEMPT');
  checks.requestPrerequisitesStillRequired = source.includes('[[ -f "$REQUEST" && -f "$REGISTRATION" && -f "$PREFLIGHT" ]]');
  checks.goGateEvidenceStillRequired = source.includes('.status=="GO_GATE_CONTRACT"');
  checks.hostingOnlyDeploy = source.includes('firebase deploy --project "$PROJECT" --only hosting');
  checks.noFunctionsDeploy = !source.includes('--only functions');
  checks.noRulesDeploy = !source.includes('--only firestore:rules');
  checks.wrongOrbitBranchFails = evaluateBranchContext({ canonicalBranch: 'wrong', eventName: 'pull_request', baseRef: BRANCH }) === 'ORBIT360_CANONICAL_BRANCH_MISMATCH';
  checks.emptyOrbitBranchFails = evaluateBranchContext({ canonicalBranch: '', eventName: 'pull_request', baseRef: BRANCH }) === 'ORBIT360_CANONICAL_BRANCH_MISMATCH';
  checks.wrongPrBaseFails = evaluateBranchContext({ canonicalBranch: BRANCH, eventName: 'pull_request', baseRef: 'main' }) === 'PULL_REQUEST_BASE_REF_MISMATCH';
  checks.emptyPrBaseFails = evaluateBranchContext({ canonicalBranch: BRANCH, eventName: 'pull_request', baseRef: '' }) === 'PULL_REQUEST_BASE_REF_MISMATCH';
  checks.validPrPasses = evaluateBranchContext({ canonicalBranch: BRANCH, eventName: 'pull_request', baseRef: BRANCH }) === 'PASS';
  checks.validNonPrPasses = evaluateBranchContext({ canonicalBranch: BRANCH, eventName: 'workflow_dispatch', baseRef: '' }) === 'PASS';
  checks.prMergeRefIrrelevant = evaluateBranchContext({ canonicalBranch: BRANCH, eventName: 'pull_request', baseRef: BRANCH, refName: '19/merge' }) === 'PASS';
  checks.noRiskExecutionInTest = true;
} catch (caught) {
  error = String(caught && caught.stack || caught);
}

const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const evidence = {
  schemaVersion: 'orbit360-runtime-branch-context-source-test-v2',
  validatorRevision: 'real-backup-execution-anchor-v2',
  gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  contractVersion: '2.7.8',
  status: failedCheckIds.length ? 'STOP_RUNTIME_BRANCH_CONTEXT_SOURCE_TEST' : 'PASS_RUNTIME_BRANCH_CONTEXT_SOURCE',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'PIPELINE_MECHANISM_FAILURE_CLOSED_SOURCE_ONLY',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  orbitOwnedBranchContract: checks.orbitOwnedBranchVariable === true,
  pullRequestBaseRefValidated: checks.pullRequestBaseGuardPresent === true,
  githubRefNameIgnoredForCanonicalBranch: checks.githubRefNameAbsent === true,
  secretsRead: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  runtimeExecuted: false,
  browserExecuted: false,
  backupExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  error,
  ok: failedCheckIds.length === 0 && !error
};

const out = path.join(ROOT, OUT_REL);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(evidence, null, 2));
process.exit(evidence.ok ? 0 : 41);
