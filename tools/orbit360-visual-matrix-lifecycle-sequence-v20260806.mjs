#!/usr/bin/env node
'use strict';

export const GATE_ID = 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805';
export const CONTRACT_VERSION = '2.7.8';
export const REQUEST_REL = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
export const FROZEN_STATUS = 'STOP_RETRY_PIPELINE_SEQUENCE_FAILURE';
export const ACTIVE_STATUS = 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST';
export const SOURCE_PASS = 'PASS_LIFECYCLE_SEQUENCE_SYNTHETIC';

const EXPECTED_CAPABILITIES = Object.freeze({
  secrets: true,
  firestoreRead: true,
  writes: false,
  runtime: true,
  browser: true,
  deploy: true,
  functionsDeploy: false,
  rulesDeploy: false,
  production: false
});

const EXPECTED_SCOPE = Object.freeze({
  hostingOnly: true,
  hostingDeploysMaximum: 1,
  hostingBackupClone: true,
  hostingRollbackCloneOnFailure: true,
  precheckRequiredBeforeMatrix: true,
  functionsDeploy: false,
  rulesDeploy: false,
  firestoreWrites: false,
  authWrites: false,
  operationalWrites: false,
  reimport: false,
  production: false,
  main: false,
  merge: false,
  directionDesktop: true,
  operationalTablet: true,
  advisorMobile: true,
  viewportCaptureOnly: true,
  captureWarningsNonBlocking: true
});

const clone = value => JSON.parse(JSON.stringify(value));
const sha40 = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);

function invariant(condition, code) {
  if (!condition) {
    const error = new Error(code);
    error.code = code;
    throw error;
  }
}

export function validateFrozenLifecycle(lifecycle) {
  invariant(lifecycle && lifecycle.gateId === GATE_ID, 'FROZEN_GATE_ID_MISMATCH');
  invariant(lifecycle.gateContractVersion === CONTRACT_VERSION, 'FROZEN_CONTRACT_VERSION_MISMATCH');
  invariant(lifecycle.status === FROZEN_STATUS, 'FROZEN_STATUS_MISMATCH');
  invariant(lifecycle.authorizationReserved === false, 'FROZEN_AUTHORIZATION_RESERVED_NOT_FALSE');
  invariant(lifecycle.allowedExecutions === 0, 'FROZEN_ALLOWED_EXECUTIONS_NOT_ZERO');
  invariant(lifecycle.executionAuthorized === false, 'FROZEN_EXECUTION_AUTHORIZED_NOT_FALSE');
  invariant(lifecycle.secretAccessAuthorized === false, 'FROZEN_SECRET_ACCESS_NOT_FALSE');
  invariant(lifecycle.firestoreReadAuthorized === false, 'FROZEN_FIRESTORE_READ_NOT_FALSE');
  invariant(lifecycle.browserAuthorized === false, 'FROZEN_BROWSER_NOT_FALSE');
  invariant(lifecycle.hostingDeployAuthorized === false, 'FROZEN_HOSTING_DEPLOY_NOT_FALSE');
  invariant(lifecycle.writeAuthorized === false, 'FROZEN_WRITE_AUTHORIZED_NOT_FALSE');
  invariant(lifecycle.productionAuthorized === false, 'FROZEN_PRODUCTION_AUTHORIZED_NOT_FALSE');
  return true;
}

export function activateLifecycle(lifecycle, { sourceHead, evidence = SOURCE_PASS } = {}) {
  validateFrozenLifecycle(lifecycle);
  invariant(sha40(sourceHead), 'ACTIVATION_SOURCE_HEAD_INVALID');
  invariant(evidence === SOURCE_PASS, 'ACTIVATION_SOURCE_EVIDENCE_INVALID');

  const next = clone(lifecycle);
  next.ownerVersion = '20260806.2-explicit-lifecycle-parent-sequence';
  next.status = ACTIVE_STATUS;
  next.classification = 'SOURCE_ONLY_SEQUENCE_READY';
  next.patternClassification = 'REPLICABLE_CLAUDE_ACUMULADO';
  next.activeRequest = false;
  next.requestRetired = false;
  next.requestConsumed = false;
  next.authorizationReserved = true;
  next.replayAllowed = false;
  next.allowedExecutions = 1;
  next.executionAuthorized = true;
  next.secretAccessAuthorized = true;
  next.firestoreReadAuthorized = true;
  next.writeAuthorized = false;
  next.browserAuthorized = true;
  next.hostingDeployAuthorized = true;
  next.functionsDeployAuthorized = false;
  next.rulesDeployAuthorized = false;
  next.productionAuthorized = false;
  next.mainAuthorized = false;
  next.mergeAuthorized = false;
  next.activation = {
    schemaVersion: 'orbit360-lifecycle-activation-parent-v1',
    gateId: GATE_ID,
    contractVersion: CONTRACT_VERSION,
    activatedFromStatus: FROZEN_STATUS,
    activatedFromHead: sourceHead,
    sourceOnlyEvidenceStatus: SOURCE_PASS,
    requestPath: REQUEST_REL,
    requestMustBeChildCommit: true,
    requestMustBeSoleFileInCommit: true,
    requestMustBindExactParentHead: true,
    implicitActivationAllowed: false
  };
  next.sourcePrerequisites = {
    ...(next.sourcePrerequisites || {}),
    lifecycleSequenceSourceEvidence: 'orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-lifecycle-sequence-source-test-sanitized-v20260806.json',
    lifecycleSequenceSourceStatus: SOURCE_PASS,
    activationParentSourceHead: sourceHead,
    requestCurrentlyPresent: false
  };
  next.nextAction = 'ONLY_AFTER_EXPLICIT_REAUTHORIZATION: persist this activation as its own parent commit, then create one new sole-file request child commit; run GO_GATE_CONTRACT before secrets or runtime.';

  validateActivatedLifecycle(next);
  return next;
}

export function validateActivatedLifecycle(lifecycle) {
  invariant(lifecycle && lifecycle.gateId === GATE_ID, 'ACTIVE_GATE_ID_MISMATCH');
  invariant(lifecycle.gateContractVersion === CONTRACT_VERSION, 'ACTIVE_CONTRACT_VERSION_MISMATCH');
  invariant(lifecycle.status === ACTIVE_STATUS, 'ACTIVE_STATUS_MISMATCH');
  invariant(lifecycle.authorizationReserved === true, 'ACTIVE_AUTHORIZATION_NOT_RESERVED');
  invariant(lifecycle.allowedExecutions === 1, 'ACTIVE_ALLOWED_EXECUTIONS_NOT_ONE');
  invariant(lifecycle.executionAuthorized === true, 'ACTIVE_EXECUTION_NOT_AUTHORIZED');
  invariant(lifecycle.secretAccessAuthorized === true, 'ACTIVE_SECRET_ACCESS_NOT_AUTHORIZED');
  invariant(lifecycle.firestoreReadAuthorized === true, 'ACTIVE_FIRESTORE_READ_NOT_AUTHORIZED');
  invariant(lifecycle.browserAuthorized === true, 'ACTIVE_BROWSER_NOT_AUTHORIZED');
  invariant(lifecycle.hostingDeployAuthorized === true, 'ACTIVE_HOSTING_DEPLOY_NOT_AUTHORIZED');
  invariant(lifecycle.writeAuthorized === false, 'ACTIVE_WRITE_AUTHORIZED');
  invariant(lifecycle.functionsDeployAuthorized === false, 'ACTIVE_FUNCTIONS_DEPLOY_AUTHORIZED');
  invariant(lifecycle.rulesDeployAuthorized === false, 'ACTIVE_RULES_DEPLOY_AUTHORIZED');
  invariant(lifecycle.productionAuthorized === false, 'ACTIVE_PRODUCTION_AUTHORIZED');
  invariant(lifecycle.mainAuthorized === false, 'ACTIVE_MAIN_AUTHORIZED');
  invariant(lifecycle.mergeAuthorized === false, 'ACTIVE_MERGE_AUTHORIZED');
  invariant(lifecycle.activation && lifecycle.activation.schemaVersion === 'orbit360-lifecycle-activation-parent-v1', 'ACTIVE_PROOF_MISSING');
  invariant(sha40(lifecycle.activation.activatedFromHead), 'ACTIVE_PARENT_HEAD_INVALID');
  invariant(lifecycle.activation.requestPath === REQUEST_REL, 'ACTIVE_REQUEST_PATH_MISMATCH');
  invariant(lifecycle.activation.requestMustBeChildCommit === true, 'ACTIVE_CHILD_COMMIT_GUARD_MISSING');
  invariant(lifecycle.activation.requestMustBeSoleFileInCommit === true, 'ACTIVE_SOLE_FILE_GUARD_MISSING');
  invariant(lifecycle.activation.requestMustBindExactParentHead === true, 'ACTIVE_PARENT_BINDING_GUARD_MISSING');
  invariant(lifecycle.activation.implicitActivationAllowed === false, 'ACTIVE_IMPLICIT_ACTIVATION_NOT_DENIED');
  return true;
}

export function buildSyntheticRequest({ parentHead, authorizedAt = '2026-08-06T08:02:00-06:00' } = {}) {
  invariant(sha40(parentHead), 'REQUEST_PARENT_HEAD_INVALID');
  return {
    schemaVersion: 'orbit360-visual-matrix-corrected-post-auth-request-v1',
    gateId: GATE_ID,
    contractVersion: CONTRACT_VERSION,
    rcId: 'RC-AYS-LAB-CANONICA-01',
    branch: 'ays/backend-tenant-lab-v99-20260703',
    pullRequest: 5,
    projectId: 'ays-orbit-360-lab',
    tenantId: 'alianzas-soluciones',
    status: 'AUTHORIZED_ONCE',
    approved: true,
    authorizedBy: 'synthetic-source-only-fixture',
    authorizedAt,
    authorizationTextSha256: 'source-only-synthetic-no-human-authorization',
    parentHead,
    lifecycleActivationParent: parentHead,
    lifecycleSequenceEvidenceStatus: SOURCE_PASS,
    allowedExecutions: 1,
    consumed: false,
    replayAllowed: false,
    capabilities: clone(EXPECTED_CAPABILITIES),
    scope: clone(EXPECTED_SCOPE),
    retiredRequestCommits: [
      'ba993d061a2d55f1703ebaeb0bad2cd9ab8a98ad',
      '75a50b2176aa4e333fb859169e76d81fb03ed542'
    ],
    retiredRequestsReused: false,
    retiredRuns: ['31071875782', '31067506016', '31104465513'],
    retiredRunsReused: false,
    syntheticOnly: true,
    persistAsRuntimeRequest: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false
  };
}

export function validateRequestBinding(request, activationCommit) {
  invariant(request && request.gateId === GATE_ID, 'REQUEST_GATE_ID_MISMATCH');
  invariant(request.contractVersion === CONTRACT_VERSION, 'REQUEST_CONTRACT_VERSION_MISMATCH');
  invariant(sha40(activationCommit), 'REQUEST_ACTIVATION_COMMIT_INVALID');
  invariant(request.parentHead === activationCommit, 'REQUEST_PARENT_NOT_ACTIVATION_COMMIT');
  invariant(request.lifecycleActivationParent === activationCommit, 'REQUEST_LIFECYCLE_PARENT_BINDING_MISMATCH');
  invariant(request.lifecycleSequenceEvidenceStatus === SOURCE_PASS, 'REQUEST_SOURCE_EVIDENCE_MISMATCH');
  invariant(request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false, 'REQUEST_EXECUTION_BOUNDARY_INVALID');
  invariant(request.syntheticOnly === true && request.persistAsRuntimeRequest === false, 'REQUEST_SYNTHETIC_BOUNDARY_INVALID');
  return true;
}
