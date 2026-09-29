'use strict';

const VERSION = 'ays-cotcomp-runtime-export-ticket-s412-v0.1';
const RUNTIME_EXPORT_ALLOWED = false;
const DEPLOY_ALLOWED = false;
const WRITES_ALLOWED = false;

const TARGET = Object.freeze({
  projectId: 'ays-orbit-360-lab',
  environment: 'LAB',
  region: 'us-central1',
  productionProjectIds: Object.freeze([])
});

const EXPORTS = Object.freeze({
  cotcompValidateDraft: Object.freeze({
    operation: 'VALIDATE_DRAFT',
    source: './cotcomp-callable-source',
    appCheck: true,
    replayProtection: false,
    caseAccess: false,
    writes: false
  }),
  cotcompSubmitHandoff: Object.freeze({
    operation: 'SUBMIT_HANDOFF',
    source: './cotcomp-callable-source',
    appCheck: true,
    replayProtection: true,
    caseAccess: false,
    writes: false
  }),
  cotcompFetchComparableProposals: Object.freeze({
    operation: 'FETCH_COMPARABLE_PROPOSALS',
    source: './cotcomp-callable-source',
    appCheck: true,
    replayProtection: false,
    caseAccess: true,
    writes: false
  }),
  cotcompSelectProposal: Object.freeze({
    operation: 'SELECT_PROPOSAL',
    source: './cotcomp-callable-source',
    appCheck: true,
    replayProtection: true,
    caseAccess: true,
    writes: false
  })
});

function evaluateRuntimeGate(input = {}) {
  const reasons = [];
  if (input.projectId !== TARGET.projectId) reasons.push('PROJECT_NOT_LAB');
  if (input.environment !== TARGET.environment) reasons.push('ENVIRONMENT_NOT_LAB');
  if (input.ownerRuntimeAuthorization !== true) reasons.push('OWNER_RUNTIME_AUTHORIZATION_REQUIRED');
  if (input.sourceQaPass !== true) reasons.push('SOURCE_QA_PASS_REQUIRED');
  if (input.caseAccessContractFrozen !== true) reasons.push('CASE_ACCESS_CONTRACT_REQUIRED');
  if (input.persistenceEnabled === true) reasons.push('PERSISTENCE_MUST_REMAIN_DISABLED');
  if (input.deployRequested === true) reasons.push('DEPLOY_NOT_AUTHORIZED_BY_EXPORT_TICKET');

  return {
    ok: reasons.length === 0,
    reasons,
    runtimeExportAllowedByCode: RUNTIME_EXPORT_ALLOWED,
    deployAllowedByCode: DEPLOY_ALLOWED,
    writesAllowedByCode: WRITES_ALLOWED,
    effectiveExportAllowed: false
  };
}

function proposedBootstrapDelta() {
  return Object.freeze({
    action: 'FUTURE_DIFF_ONLY',
    import: "require('./cotcomp-runtime-entry')",
    exports: Object.keys(EXPORTS),
    applyNow: false
  });
}

module.exports = Object.freeze({
  VERSION,
  RUNTIME_EXPORT_ALLOWED,
  DEPLOY_ALLOWED,
  WRITES_ALLOWED,
  TARGET,
  EXPORTS,
  evaluateRuntimeGate,
  proposedBootstrapDelta
});
