'use strict';

/**
 * SOURCE-ONLY callable wrappers.
 *
 * This module is intentionally NOT imported/exported by functions/index.js or bootstrap.js.
 * It defines the future callable shape while runtime remains release-gated.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const {
  handleValidateDraft,
  handleSubmitHandoff,
  handleFetchComparableProposals,
  handleSelectProposal
} = require('./cotcomp-callable-handlers');

const RUNTIME_EXPORT_ALLOWED = false;

function toHttpsError(response) {
  if (response && response.ok !== false) return response;
  const code = response && response.code || 'FAILED_PRECONDITION';
  const map = {
    APP_CHECK_REQUIRED: 'failed-precondition',
    CASE_ACCESS_VERIFIER_REQUIRED: 'failed-precondition',
    CASE_ACCESS_DENIED: 'permission-denied',
    PROPOSAL_LOADER_REQUIRED: 'failed-precondition'
  };
  throw new HttpsError(map[code] || 'failed-precondition', code);
}

function buildSourceOnlyCallables(deps = {}) {
  return {
    cotcompValidateDraft: onCall(
      { enforceAppCheck: true, consumeAppCheckToken: false },
      async (request) => toHttpsError(await handleValidateDraft(request))
    ),

    cotcompSubmitHandoff: onCall(
      { enforceAppCheck: true, consumeAppCheckToken: true },
      async (request) => toHttpsError(await handleSubmitHandoff(request))
    ),

    cotcompFetchComparableProposals: onCall(
      { enforceAppCheck: true, consumeAppCheckToken: false },
      async (request) => toHttpsError(await handleFetchComparableProposals(request, deps))
    ),

    cotcompSelectProposal: onCall(
      { enforceAppCheck: true, consumeAppCheckToken: true },
      async (request) => toHttpsError(await handleSelectProposal(request, deps))
    )
  };
}

module.exports = Object.freeze({
  RUNTIME_EXPORT_ALLOWED,
  buildSourceOnlyCallables
});
