'use strict';

const { mapPublicToBackend } = require('./cotcomp-public-bridge');

const VERSION = 'ays-cotcomp-transport-s48-v0.1';
const RUNTIME_ENABLED = false;
const WRITE_ENABLED = false;

const OPERATIONS = Object.freeze({
  VALIDATE_DRAFT: 'VALIDATE_DRAFT',
  SUBMIT_HANDOFF: 'SUBMIT_HANDOFF',
  FETCH_COMPARABLE_PROPOSALS: 'FETCH_COMPARABLE_PROPOSALS',
  SELECT_PROPOSAL: 'SELECT_PROPOSAL'
});

const CHANNELS = Object.freeze({
  PUBLIC_WEB: 'PUBLIC_WEB',
  PORTAL: 'PORTAL',
  INTERNAL: 'INTERNAL'
});

function nonEmpty(v) { return typeof v === 'string' && v.trim().length > 0; }
function uniq(xs) { return [...new Set(xs)]; }

function validateAuthContext(auth = {}) {
  const errors = [];
  if (!Object.values(CHANNELS).includes(auth.channel)) errors.push('AUTH_CHANNEL_INVALID');

  if (auth.channel === CHANNELS.PUBLIC_WEB) {
    if (!nonEmpty(auth.sessionId)) errors.push('PUBLIC_SESSION_REQUIRED');
    if (auth.appCheckVerified !== true) errors.push('APP_CHECK_REQUIRED');
    if (auth.signedSessionVerified !== true) errors.push('SIGNED_SESSION_REQUIRED');
  }

  if ([CHANNELS.PORTAL, CHANNELS.INTERNAL].includes(auth.channel)) {
    if (auth.firebaseAuthVerified !== true) errors.push('FIREBASE_AUTH_REQUIRED');
    if (!nonEmpty(auth.uid)) errors.push('AUTH_UID_REQUIRED');
  }

  return { ok: errors.length === 0, errors };
}

function classifyBridgeMissing(mapping) {
  const submitOnly = new Set([
    'contact.name',
    'contact.whatsapp',
    'contact.email',
    'consents.requestManagement'
  ]);
  const missingForJourney = [];
  const missingForSubmit = [];
  for (const field of mapping.missing || []) {
    (submitOnly.has(field) ? missingForSubmit : missingForJourney).push(field);
  }
  return {
    missingForJourney: uniq(missingForJourney),
    missingForSubmit: uniq(missingForSubmit)
  };
}

function validateBaseEnvelope(req = {}) {
  const errors = [];
  if (!Object.values(OPERATIONS).includes(req.operation)) errors.push('OPERATION_INVALID');
  if (!nonEmpty(req.requestId)) errors.push('REQUEST_ID_REQUIRED');
  const auth = validateAuthContext(req.auth);
  errors.push(...auth.errors);
  return errors;
}

function buildTransportPlan(req = {}) {
  const errors = validateBaseEnvelope(req);
  const result = {
    version: VERSION,
    operation: req.operation || null,
    runtimeEnabled: RUNTIME_ENABLED,
    writeEnabled: WRITE_ENABLED,
    transportAllowed: false,
    persistenceAllowed: false,
    responseMode: 'CONTRACT_ONLY',
    errors,
    warnings: [],
    mapping: null,
    requirements: {}
  };

  if (errors.length) return result;

  if (req.operation === OPERATIONS.VALIDATE_DRAFT || req.operation === OPERATIONS.SUBMIT_HANDOFF) {
    const mapping = mapPublicToBackend({
      country: req.country,
      product: req.product,
      data: req.data || {}
    });
    const missing = classifyBridgeMissing(mapping);
    result.mapping = mapping;
    result.requirements = missing;

    if (!mapping.journeyId) {
      result.errors.push('NO_EXECUTABLE_JOURNEY');
      result.warnings.push('Keep this route consultative/human-handoff only.');
      return result;
    }

    if (req.operation === OPERATIONS.VALIDATE_DRAFT) {
      result.transportAllowed = missing.missingForJourney.length === 0 && (mapping.unsupported || []).length === 0;
      result.responseMode = 'VALIDATION_ONLY_NO_PERSISTENCE';
      if (!result.transportAllowed) result.warnings.push('Collect journey-required fields before backend validation.');
      if (missing.missingForSubmit.length) result.warnings.push('Contact/consent remain deferred until handoff submit.');
      return result;
    }

    if (!nonEmpty(req.idempotencyKey)) result.errors.push('IDEMPOTENCY_KEY_REQUIRED');
    if (missing.missingForJourney.length) result.errors.push('JOURNEY_FIELDS_INCOMPLETE');
    if (missing.missingForSubmit.length) result.errors.push('CONTACT_OR_CONSENT_INCOMPLETE');
    if ((mapping.unsupported || []).length) result.errors.push('UNSUPPORTED_PUBLIC_MAPPING');

    result.transportAllowed = result.errors.length === 0;
    result.persistenceAllowed = false;
    result.responseMode = 'HANDOFF_SUBMIT_CONTRACT_ONLY';
    result.warnings.push('Runtime write stays disabled until a separate release gate.');
    return result;
  }

  if (req.operation === OPERATIONS.FETCH_COMPARABLE_PROPOSALS) {
    if (!nonEmpty(req.quoteCaseId)) result.errors.push('QUOTE_CASE_ID_REQUIRED');
    result.transportAllowed = result.errors.length === 0;
    result.persistenceAllowed = false;
    result.responseMode = 'READ_ONLY_VALIDATED_CURRENT_PROPOSALS';
    result.requirements = {
      eligibility: 'ONLY_VALIDATED_CURRENT_PROPOSALS',
      ranking: 'NONE_BY_DEFAULT',
      missingSemantics: 'MISSING_IS_NOT_NOT_COVERED'
    };
    return result;
  }

  if (req.operation === OPERATIONS.SELECT_PROPOSAL) {
    if (!nonEmpty(req.quoteCaseId)) result.errors.push('QUOTE_CASE_ID_REQUIRED');
    if (!nonEmpty(req.proposalId)) result.errors.push('PROPOSAL_ID_REQUIRED');
    if (req.explicitUserChoice !== true) result.errors.push('EXPLICIT_USER_CHOICE_REQUIRED');
    result.transportAllowed = result.errors.length === 0;
    result.persistenceAllowed = false;
    result.responseMode = 'SELECTION_HANDOFF_CONTRACT_ONLY';
    result.requirements = {
      selectionMeaning: 'USER_CONTINUATION_CHOICE_ONLY',
      issuanceMeaning: 'NOT_ISSUED_NOT_BOUND_NOT_COVERED'
    };
    result.warnings.push('Selection must never be represented as policy issuance or coverage confirmation.');
    return result;
  }

  return result;
}

module.exports = Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  WRITE_ENABLED,
  OPERATIONS,
  CHANNELS,
  validateAuthContext,
  classifyBridgeMissing,
  buildTransportPlan
});
