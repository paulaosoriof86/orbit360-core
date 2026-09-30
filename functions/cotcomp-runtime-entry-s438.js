'use strict';

const { buildSourceOnlyCallables } = require('./cotcomp-callable-source');

const SYNTHETIC_CASE_ID = 'cotcomp-s440-synthetic-case';
const SYNTHETIC_ACCESS_TOKEN = 'cotcomp-s440-synthetic-token';

function isSyntheticProofRequest({ quoteCaseId, accessToken, request } = {}) {
  return !!(
    request &&
    request.data &&
    request.data.syntheticProof === true &&
    quoteCaseId === SYNTHETIC_CASE_ID &&
    accessToken === SYNTHETIC_ACCESS_TOKEN
  );
}

async function verifyCaseAccess(args = {}) {
  return isSyntheticProofRequest(args);
}

async function loadProposals({ quoteCaseId, request } = {}) {
  if (!isSyntheticProofRequest({
    quoteCaseId,
    accessToken: request && request.data && request.data.caseAccessToken,
    request
  })) {
    return { proposals: [], validityByProposal: {} };
  }

  return {
    proposals: [{
      proposalId: 'synthetic-proposal-1',
      quoteCaseId: SYNTHETIC_CASE_ID,
      insurerId: 'synthetic-insurer',
      sourceId: 'synthetic-source',
      country: 'GT',
      product: 'AUTO',
      currency: 'GTQ',
      premium: 0,
      coverages: { rc: 'COVERED' },
      limits: {},
      sublimits: {},
      deductibles: {},
      assistance: {},
      conditions: [],
      exclusions: [],
      validity: {},
      provenance: { source: 'synthetic-proof-only' },
      validationState: 'VALIDATED',
      validatedBy: 'synthetic-proof',
      validatedAt: '2026-09-30T00:00:00.000Z'
    }],
    validityByProposal: {
      'synthetic-proposal-1': true
    }
  };
}

const callables = buildSourceOnlyCallables({
  verifyCaseAccess,
  loadProposals
});

module.exports = Object.freeze({
  cotcompValidateDraft: callables.cotcompValidateDraft,
  cotcompSubmitHandoff: callables.cotcompSubmitHandoff,
  cotcompFetchComparableProposals: callables.cotcompFetchComparableProposals,
  cotcompSelectProposal: callables.cotcompSelectProposal
});
