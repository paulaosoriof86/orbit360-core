'use strict';

const crypto = require('node:crypto');
const { mapPublicToBackend } = require('./cotcomp-public-bridge');
const { buildTransportPlan, OPERATIONS } = require('./cotcomp-transport-contract');
const { validateSubmitReadyIntake } = require('./cotcomp-validator');
const { evaluateComparisonEligibility } = require('./cotcomp-proposal-contracts');

const VERSION = 'ays-cotcomp-gateway-harness-s49-v0.1';
const RUNTIME_ENABLED = false;
const PERSISTENCE_ENABLED = false;

function stableRequestId(seed) {
  return 'req_' + crypto.createHash('sha256').update(String(seed || '')).digest('hex').slice(0, 24);
}

function validateDraft(input = {}) {
  const requestId = input.requestId || stableRequestId(JSON.stringify({
    country: input.country,
    product: input.product,
    sessionId: input.auth && input.auth.sessionId,
    data: input.data || {}
  }));

  const plan = buildTransportPlan({
    operation: OPERATIONS.VALIDATE_DRAFT,
    requestId,
    auth: input.auth,
    country: input.country,
    product: input.product,
    data: input.data || {}
  });

  return {
    version: VERSION,
    ok: plan.errors.length === 0,
    transportAllowed: plan.transportAllowed,
    persistenceEnabled: PERSISTENCE_ENABLED,
    plan
  };
}

function prepareHandoffSubmit(input = {}) {
  const requestId = input.requestId || stableRequestId(input.idempotencyKey || JSON.stringify(input));
  const plan = buildTransportPlan({
    operation: OPERATIONS.SUBMIT_HANDOFF,
    requestId,
    idempotencyKey: input.idempotencyKey,
    auth: input.auth,
    country: input.country,
    product: input.product,
    data: input.data || {}
  });

  if (!plan.transportAllowed || !plan.mapping || !plan.mapping.journeyId) {
    return {
      version: VERSION,
      ok: false,
      persistenceEnabled: PERSISTENCE_ENABLED,
      plan,
      validator: null,
      payload: null
    };
  }

  const payload = {
    journeyId: plan.mapping.journeyId,
    country: String(input.country || '').toUpperCase(),
    idempotencyKey: input.idempotencyKey,
    data: plan.mapping.mapped
  };

  const validator = validateSubmitReadyIntake(payload);

  return {
    version: VERSION,
    ok: validator.ok,
    persistenceEnabled: PERSISTENCE_ENABLED,
    plan,
    validator,
    payload: validator.ok ? validator.normalized : payload
  };
}

function comparableProposals(input = {}) {
  const proposals = Array.isArray(input.proposals) ? input.proposals : [];
  const validityByProposal = input.validityByProposal || {};
  const eligible = [];
  const excluded = [];

  for (const proposal of proposals) {
    const proposalId = proposal && proposal.proposalId || '';
    const currentValidityConfirmed = validityByProposal[proposalId] === true;
    const evaluation = evaluateComparisonEligibility(proposal, { currentValidityConfirmed });
    if (evaluation.eligible) eligible.push(proposal);
    else excluded.push({ proposalId, reason: evaluation.reason, errors: evaluation.errors || [] });
  }

  return {
    version: VERSION,
    ok: true,
    rankingApplied: false,
    eligible,
    excluded,
    comparisonPolicy: {
      order: 'SOURCE_ORDER_OR_EXPLICIT_USER_SORT_ONLY',
      winner: null,
      silentWeighting: false
    }
  };
}

function prepareSelection(input = {}) {
  const plan = buildTransportPlan({
    operation: OPERATIONS.SELECT_PROPOSAL,
    requestId: input.requestId || stableRequestId([input.quoteCaseId,input.proposalId].join('|')),
    auth: input.auth,
    quoteCaseId: input.quoteCaseId,
    proposalId: input.proposalId,
    explicitUserChoice: input.explicitUserChoice
  });

  return {
    version: VERSION,
    ok: plan.transportAllowed,
    persistenceEnabled: PERSISTENCE_ENABLED,
    plan,
    handoff: plan.transportAllowed ? {
      quoteCaseId: input.quoteCaseId,
      proposalId: input.proposalId,
      status: 'USER_SELECTED_FOR_CONTINUATION',
      issuanceState: 'NOT_ISSUED',
      bindingState: 'NOT_BOUND',
      coverageState: 'NOT_CONFIRMED'
    } : null
  };
}

module.exports = Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  PERSISTENCE_ENABLED,
  stableRequestId,
  validateDraft,
  prepareHandoffSubmit,
  comparableProposals,
  prepareSelection,
  mapPublicToBackend
});
