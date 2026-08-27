'use strict';

const REQUIRED_PROPOSAL_FIELDS = Object.freeze([
  'proposalId',
  'quoteCaseId',
  'insurerId',
  'sourceId',
  'country',
  'product',
  'currency',
  'premium',
  'coverages',
  'limits',
  'sublimits',
  'deductibles',
  'assistance',
  'conditions',
  'exclusions',
  'validity',
  'provenance',
  'validationState',
  'validatedBy',
  'validatedAt'
]);

const COMPARISON_SEMANTICS = Object.freeze({
  MISSING: 'MISSING',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  NOT_COVERED: 'NOT_COVERED',
  UNKNOWN: 'UNKNOWN'
});

const COMPARISON_POLICY = Object.freeze({
  comparisonEligibility: 'ONLY_VALIDATED_CURRENT_PROPOSALS',
  missingSemantics: 'MISSING_OR_UNMAPPED_NEVER_EQUALS_NOT_COVERED',
  rankingPolicy: 'NONE_BY_DEFAULT',
  noSilentWeighting: true,
  historicalPricingInferenceAllowed: false
});

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateProposalShape(proposal) {
  const errors = [];
  if (!isPlainObject(proposal)) {
    return { ok: false, errors: [{ fieldId: 'proposal', code: 'INVALID_OBJECT' }] };
  }

  for (const fieldId of REQUIRED_PROPOSAL_FIELDS) {
    if (!hasOwn(proposal, fieldId)) errors.push({ fieldId, code: 'REQUIRED' });
  }

  for (const fieldId of ['proposalId', 'quoteCaseId', 'insurerId', 'sourceId', 'product', 'currency', 'validationState']) {
    if (hasOwn(proposal, fieldId) && !isNonEmptyString(proposal[fieldId])) {
      errors.push({ fieldId, code: 'INVALID_STRING' });
    }
  }

  if (hasOwn(proposal, 'country') && !['GT', 'CO'].includes(proposal.country)) {
    errors.push({ fieldId: 'country', code: 'INVALID_COUNTRY' });
  }

  if (hasOwn(proposal, 'premium')) {
    const validPremium = (typeof proposal.premium === 'number' && Number.isFinite(proposal.premium)) || isPlainObject(proposal.premium);
    if (!validPremium) errors.push({ fieldId: 'premium', code: 'INVALID_PREMIUM_STRUCTURE' });
  }

  if (proposal.validationState === 'VALIDATED') {
    if (!isNonEmptyString(proposal.validatedBy)) errors.push({ fieldId: 'validatedBy', code: 'REQUIRED_FOR_VALIDATED' });
    if (!isNonEmptyString(proposal.validatedAt)) errors.push({ fieldId: 'validatedAt', code: 'REQUIRED_FOR_VALIDATED' });
  }

  return { ok: errors.length === 0, errors };
}

function evaluateComparisonEligibility(proposal, validityContext = {}) {
  const shape = validateProposalShape(proposal);
  if (!shape.ok) {
    return { eligible: false, reason: 'INVALID_PROPOSAL', errors: shape.errors };
  }

  if (proposal.validationState !== 'VALIDATED') {
    return { eligible: false, reason: 'NOT_VALIDATED', errors: [] };
  }

  if (validityContext.currentValidityConfirmed !== true) {
    return { eligible: false, reason: 'CURRENT_VALIDITY_NOT_CONFIRMED', errors: [] };
  }

  return { eligible: true, reason: 'VALIDATED_CURRENT', errors: [] };
}

function validateComparisonSemantic(state, context = {}) {
  if (!Object.values(COMPARISON_SEMANTICS).includes(state)) {
    return { ok: false, code: 'INVALID_COMPARISON_SEMANTIC' };
  }

  if (state === COMPARISON_SEMANTICS.NOT_COVERED && context.explicitSourceDeclaration !== true) {
    return { ok: false, code: 'NOT_COVERED_REQUIRES_EXPLICIT_SOURCE_DECLARATION' };
  }

  return { ok: true, code: null };
}

module.exports = Object.freeze({
  REQUIRED_PROPOSAL_FIELDS,
  COMPARISON_SEMANTICS,
  COMPARISON_POLICY,
  validateProposalShape,
  evaluateComparisonEligibility,
  validateComparisonSemantic
});
