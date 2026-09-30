'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const {
  handleValidateDraft,
  handleSubmitHandoff,
  handleFetchComparableProposals,
  handleSelectProposal
} = require('./cotcomp-callable-handlers');

const SYNTHETIC_CASE_ID = 'cotcomp-s440-synthetic-case';
const SYNTHETIC_ACCESS_TOKEN = 'cotcomp-s440-synthetic-token';

function requireSyntheticProof(request) {
  if (!(request && request.data && request.data.syntheticProof === true)) {
    throw new HttpsError('failed-precondition', 'SYNTHETIC_PROOF_ONLY');
  }
}

function syntheticRequest(request, data) {
  return { ...request, data: { ...data, syntheticProof: true } };
}

function syntheticAutoData() {
  return {
    tipoVehiculo: 'Automóvil',
    coberturaObjetivo: 'Daños a terceros / RC',
    usoVehiculo: 'Particular',
    anioModelo: 2024,
    marca: 'Synthetic',
    lineaModelo: 'Proof',
    contactName: 'Synthetic Proof',
    contactWhatsapp: '+50200000000',
    contactEmail: 'synthetic@example.invalid',
    requestManagementConsent: true
  };
}

async function verifyCaseAccess({ quoteCaseId, accessToken, request } = {}) {
  return !!(
    request &&
    request.data &&
    request.data.syntheticProof === true &&
    quoteCaseId === SYNTHETIC_CASE_ID &&
    accessToken === SYNTHETIC_ACCESS_TOKEN
  );
}

async function loadProposals({ quoteCaseId, request } = {}) {
  const allowed = await verifyCaseAccess({
    quoteCaseId,
    accessToken: request && request.data && request.data.caseAccessToken,
    request
  });
  if (!allowed) return { proposals: [], validityByProposal: {} };

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

function failAsHttpsError(response) {
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

const cotcompValidateDraft = onCall(
  { enforceAppCheck: true, consumeAppCheckToken: false, region: 'us-central1' },
  async (request) => {
    requireSyntheticProof(request);
    return failAsHttpsError(await handleValidateDraft(syntheticRequest(request, {
      requestId: 's440-validate',
      country: 'GT',
      product: 'auto',
      data: syntheticAutoData()
    })));
  }
);

const cotcompSubmitHandoff = onCall(
  { enforceAppCheck: true, consumeAppCheckToken: true, region: 'us-central1' },
  async (request) => {
    requireSyntheticProof(request);
    return failAsHttpsError(await handleSubmitHandoff(syntheticRequest(request, {
      requestId: 's440-submit',
      idempotencyKey: 's440-synthetic-idempotency',
      country: 'GT',
      product: 'auto',
      data: syntheticAutoData()
    })));
  }
);

const cotcompFetchComparableProposals = onCall(
  { enforceAppCheck: true, consumeAppCheckToken: false, region: 'us-central1' },
  async (request) => {
    requireSyntheticProof(request);
    return failAsHttpsError(await handleFetchComparableProposals(
      syntheticRequest(request, {
        quoteCaseId: SYNTHETIC_CASE_ID,
        caseAccessToken: SYNTHETIC_ACCESS_TOKEN
      }),
      { verifyCaseAccess, loadProposals }
    ));
  }
);

const cotcompSelectProposal = onCall(
  { enforceAppCheck: true, consumeAppCheckToken: true, region: 'us-central1' },
  async (request) => {
    requireSyntheticProof(request);
    return failAsHttpsError(await handleSelectProposal(
      syntheticRequest(request, {
        requestId: 's440-select',
        quoteCaseId: SYNTHETIC_CASE_ID,
        caseAccessToken: SYNTHETIC_ACCESS_TOKEN,
        proposalId: 'synthetic-proposal-1',
        explicitUserChoice: true
      }),
      { verifyCaseAccess, loadProposals }
    ));
  }
);

module.exports = Object.freeze({
  cotcompValidateDraft,
  cotcompSubmitHandoff,
  cotcompFetchComparableProposals,
  cotcompSelectProposal
});
