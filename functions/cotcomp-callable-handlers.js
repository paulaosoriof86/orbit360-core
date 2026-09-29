'use strict';

const { validateDraft, prepareHandoffSubmit, comparableProposals, prepareSelection } = require('./cotcomp-gateway-harness');
const { publicAuthContextFromCallable } = require('./cotcomp-callable-policy');

const VERSION = 'ays-cotcomp-callable-handlers-s411-v0.1';
const PERSISTENCE_ENABLED = false;

function fail(code, detail = {}) {
  return { ok: false, code, persistenceEnabled: PERSISTENCE_ENABLED, ...detail };
}

function requireAppCheck(request) {
  if (!request || !request.app) return fail('APP_CHECK_REQUIRED');
  return null;
}

async function requireCaseAccess(request, operation, verifyCaseAccess) {
  if (typeof verifyCaseAccess !== 'function') return { ok: false, code: 'CASE_ACCESS_VERIFIER_REQUIRED' };
  const quoteCaseId = request && request.data && request.data.quoteCaseId;
  const accessToken = request && request.data && request.data.caseAccessToken;
  const verified = await verifyCaseAccess({ quoteCaseId, accessToken, request, operation });
  return verified === true ? { ok: true } : { ok: false, code: 'CASE_ACCESS_DENIED' };
}

function requestData(request) {
  return request && request.data && typeof request.data === 'object' ? request.data : {};
}

async function handleValidateDraft(request = {}) {
  const appError = requireAppCheck(request);
  if (appError) return appError;
  const data = requestData(request);
  const auth = publicAuthContextFromCallable(request, 'VALIDATE_DRAFT', false);
  const result = validateDraft({
    requestId: data.requestId,
    auth,
    country: data.country,
    product: data.product,
    data: data.data || {}
  });
  return { ok: result.ok, operation: 'VALIDATE_DRAFT', persistenceEnabled: PERSISTENCE_ENABLED, result };
}

async function handleSubmitHandoff(request = {}) {
  const appError = requireAppCheck(request);
  if (appError) return appError;
  const data = requestData(request);
  const auth = publicAuthContextFromCallable(request, 'SUBMIT_HANDOFF', false);
  const result = prepareHandoffSubmit({
    requestId: data.requestId,
    auth,
    idempotencyKey: data.idempotencyKey,
    country: data.country,
    product: data.product,
    data: data.data || {}
  });
  return {
    ok: result.ok,
    operation: 'SUBMIT_HANDOFF',
    persistenceEnabled: PERSISTENCE_ENABLED,
    persisted: false,
    status: result.ok ? 'VALIDATED_NOT_PERSISTED' : 'VALIDATION_BLOCKED',
    result
  };
}

async function handleFetchComparableProposals(request = {}, deps = {}) {
  const appError = requireAppCheck(request);
  if (appError) return appError;
  const access = await requireCaseAccess(request, 'FETCH_COMPARABLE_PROPOSALS', deps.verifyCaseAccess);
  if (!access.ok) return fail(access.code);

  const data = requestData(request);
  if (typeof deps.loadProposals !== 'function') return fail('PROPOSAL_LOADER_REQUIRED');

  const loaded = await deps.loadProposals({ quoteCaseId: data.quoteCaseId, request });
  const proposals = Array.isArray(loaded && loaded.proposals) ? loaded.proposals : [];
  const validityByProposal = loaded && loaded.validityByProposal || {};
  const result = comparableProposals({ proposals, validityByProposal });

  return {
    ok: true,
    operation: 'FETCH_COMPARABLE_PROPOSALS',
    persistenceEnabled: PERSISTENCE_ENABLED,
    result
  };
}

async function handleSelectProposal(request = {}, deps = {}) {
  const appError = requireAppCheck(request);
  if (appError) return appError;
  const access = await requireCaseAccess(request, 'SELECT_PROPOSAL', deps.verifyCaseAccess);
  if (!access.ok) return fail(access.code);

  const data = requestData(request);
  const auth = publicAuthContextFromCallable(request, 'SELECT_PROPOSAL', true);
  const result = prepareSelection({
    requestId: data.requestId,
    auth,
    quoteCaseId: data.quoteCaseId,
    proposalId: data.proposalId,
    explicitUserChoice: data.explicitUserChoice
  });

  return {
    ok: result.ok,
    operation: 'SELECT_PROPOSAL',
    persistenceEnabled: PERSISTENCE_ENABLED,
    persisted: false,
    status: result.ok ? 'SELECTION_VALIDATED_NOT_PERSISTED' : 'SELECTION_BLOCKED',
    result
  };
}

module.exports = Object.freeze({
  VERSION,
  PERSISTENCE_ENABLED,
  handleValidateDraft,
  handleSubmitHandoff,
  handleFetchComparableProposals,
  handleSelectProposal
});
