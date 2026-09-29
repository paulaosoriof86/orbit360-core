'use strict';

const { buildSourceOnlyCallables } = require('./cotcomp-callable-source');
const stagingDeps = require('./cotcomp-staging-deps-candidate');

const VERSION = 'ays-cotcomp-runtime-entry-candidate-s413-v0.1';
const RUNTIME_EXPORT_ALLOWED = false;
const DEPLOY_ALLOWED = false;
const WRITES_ALLOWED = false;

function evaluateCandidateGate(input = {}) {
  const reasons = [];
  if (input.projectId !== 'ays-orbit-360-lab') reasons.push('PROJECT_NOT_LAB');
  if (input.environment !== 'LAB') reasons.push('ENVIRONMENT_NOT_LAB');
  if (input.ownerRuntimeAuthorization !== true) reasons.push('OWNER_RUNTIME_AUTHORIZATION_REQUIRED');
  if (input.sourceQaPass !== true) reasons.push('SOURCE_QA_PASS_REQUIRED');
  if (input.s412GatePass !== true) reasons.push('S412_GATE_PASS_REQUIRED');
  if (input.persistenceEnabled === true) reasons.push('PERSISTENCE_MUST_REMAIN_DISABLED');
  if (stagingDeps.READY !== true) reasons.push('STAGING_DEPS_NOT_READY');

  return {
    ok: reasons.length === 0,
    reasons,
    runtimeExportAllowedByCode: RUNTIME_EXPORT_ALLOWED,
    deployAllowedByCode: DEPLOY_ALLOWED,
    writesAllowedByCode: WRITES_ALLOWED
  };
}

function previewCallableShape() {
  return Object.freeze([
    'cotcompValidateDraft',
    'cotcompSubmitHandoff',
    'cotcompFetchComparableProposals',
    'cotcompSelectProposal'
  ]);
}

function buildCandidateExports(input = {}) {
  const gate = evaluateCandidateGate(input);
  if (!gate.ok || RUNTIME_EXPORT_ALLOWED !== true) {
    return {
      ok: false,
      exports: Object.freeze({}),
      gate,
      reason: 'RUNTIME_EXPORT_GATE_CLOSED'
    };
  }

  return {
    ok: true,
    exports: buildSourceOnlyCallables({
      verifyCaseAccess: stagingDeps.verifyCaseAccess,
      loadProposals: stagingDeps.loadProposals
    }),
    gate
  };
}

module.exports = Object.freeze({
  VERSION,
  RUNTIME_EXPORT_ALLOWED,
  DEPLOY_ALLOWED,
  WRITES_ALLOWED,
  evaluateCandidateGate,
  previewCallableShape,
  buildCandidateExports
});
