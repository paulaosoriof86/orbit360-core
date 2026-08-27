'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  COMPARISON_SEMANTICS,
  COMPARISON_POLICY,
  validateProposalShape,
  evaluateComparisonEligibility,
  validateComparisonSemantic
} = require('./cotcomp-proposal-contracts');

function validProposal(overrides = {}) {
  return {
    proposalId: 'proposal-1',
    quoteCaseId: 'quote-1',
    insurerId: 'insurer-1',
    sourceId: 'source-1',
    country: 'GT',
    product: 'AUTO',
    currency: 'GTQ',
    premium: 2500,
    coverages: [],
    limits: [],
    sublimits: [],
    deductibles: [],
    assistance: [],
    conditions: [],
    exclusions: [],
    validity: {},
    provenance: {},
    validationState: 'VALIDATED',
    validatedBy: 'qa-source',
    validatedAt: '2026-08-27T00:00:00Z',
    ...overrides
  };
}

test('valid proposal shape passes', () => {
  assert.equal(validateProposalShape(validProposal()).ok, true);
});

test('proposal shape requires all frozen fields', () => {
  const proposal = validProposal();
  delete proposal.sourceId;
  const result = validateProposalShape(proposal);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.fieldId === 'sourceId' && error.code === 'REQUIRED'));
});

test('validated proposal requires validator provenance', () => {
  const proposal = validProposal({ validatedBy: '', validatedAt: '' });
  const result = validateProposalShape(proposal);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.fieldId === 'validatedBy' && error.code === 'REQUIRED_FOR_VALIDATED'));
  assert.ok(result.errors.some(error => error.fieldId === 'validatedAt' && error.code === 'REQUIRED_FOR_VALIDATED'));
});

test('only validated proposal with current validity is comparison-eligible', () => {
  const eligible = evaluateComparisonEligibility(validProposal(), { currentValidityConfirmed: true });
  assert.deepEqual(eligible, { eligible: true, reason: 'VALIDATED_CURRENT', errors: [] });
});

test('non-validated proposal is comparison-ineligible', () => {
  const result = evaluateComparisonEligibility(validProposal({ validationState: 'PENDING' }), { currentValidityConfirmed: true });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'NOT_VALIDATED');
});

test('proposal without confirmed current validity is comparison-ineligible', () => {
  const result = evaluateComparisonEligibility(validProposal(), { currentValidityConfirmed: false });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'CURRENT_VALIDITY_NOT_CONFIRMED');
});

test('MISSING semantic is valid and never silently means NOT_COVERED', () => {
  assert.equal(validateComparisonSemantic(COMPARISON_SEMANTICS.MISSING).ok, true);
  assert.equal(COMPARISON_POLICY.missingSemantics, 'MISSING_OR_UNMAPPED_NEVER_EQUALS_NOT_COVERED');
});

test('NOT_COVERED requires explicit source declaration', () => {
  const denied = validateComparisonSemantic(COMPARISON_SEMANTICS.NOT_COVERED);
  assert.equal(denied.ok, false);
  assert.equal(denied.code, 'NOT_COVERED_REQUIRES_EXPLICIT_SOURCE_DECLARATION');

  const allowed = validateComparisonSemantic(COMPARISON_SEMANTICS.NOT_COVERED, { explicitSourceDeclaration: true });
  assert.equal(allowed.ok, true);
});

test('comparison policy has no ranking or historical pricing inference by default', () => {
  assert.equal(COMPARISON_POLICY.rankingPolicy, 'NONE_BY_DEFAULT');
  assert.equal(COMPARISON_POLICY.noSilentWeighting, true);
  assert.equal(COMPARISON_POLICY.historicalPricingInferenceAllowed, false);
});
