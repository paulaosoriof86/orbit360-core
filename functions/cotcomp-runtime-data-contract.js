'use strict';

const crypto = require('node:crypto');

const VERSION = 'ays-cotcomp-runtime-data-contract-s415-v1';
const RUNTIME_ENABLED = false;
const WRITES_ENABLED = false;
const DEPLOY_ALLOWED = false;
const TENANT_MODE = 'CANONICAL_COTCOMP_V1';
const WORKFLOW_PROJECTION_REQUIRES = 'canonicalV2';

const ENTITY = Object.freeze({
  QUOTE_CASE: 'quoteCases',
  PROPOSAL: 'proposals',
  COMPARISON_SET: 'comparisonSets',
  SELECTION: 'selections',
  CASE_ACCESS: 'caseAccess',
  IDEMPOTENCY: 'idempotency',
  EVENT: 'events'
});

const QUOTE_CASE_STATUS = Object.freeze([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'QUOTING',
  'PROPOSALS_AVAILABLE',
  'USER_SELECTED',
  'CONTINUATION_HANDOFF',
  'CLOSED'
]);

const PROPOSAL_VALIDATION = Object.freeze([
  'RECEIVED',
  'REQUIRES_REVIEW',
  'VALIDATED',
  'INVALID',
  'SUPERSEDED',
  'EXPIRED'
]);

const SELECTION_TRUTH = Object.freeze({
  status: 'USER_SELECTED_FOR_CONTINUATION',
  issuanceState: 'NOT_ISSUED',
  bindingState: 'NOT_BOUND',
  coverageState: 'NOT_CONFIRMED'
});

const COMPARISON_TRUTH = Object.freeze({
  rankingPolicy: 'NONE_BY_DEFAULT',
  silentWeighting: false,
  missingSemantics: 'MISSING_IS_NOT_NOT_COVERED',
  eligibility: 'VALIDATED_AND_CURRENT_ONLY'
});

const PII_POLICY = Object.freeze({
  classification: 'PII_CONFIDENTIAL',
  urlQueryStringAllowed: false,
  analyticsAllowed: false,
  sanitizedLogsRequired: true,
  marketingConsentSeparate: true,
  retention: 'GOVERNANCE_LEGAL_DECISION_REQUIRED'
});

function clean(value, max = 240) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}
function hash(value) {
  return crypto.createHash('sha256').update(String(value == null ? '' : value), 'utf8').digest('hex');
}
function assertIdPart(value, label) {
  const out = clean(value, 180);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(out)) {
    throw new Error((label || 'id') + '_INVALID');
  }
  return out;
}
function pathFor(tenantId, entity, id) {
  tenantId = assertIdPart(tenantId, 'tenantId');
  if (!Object.values(ENTITY).includes(entity)) throw new Error('COTCOMP_ENTITY_INVALID');
  const base = `tenants/${tenantId}/cotcomp/${entity}/items`;
  return id ? `${base}/${assertIdPart(id, entity + 'Id')}` : base;
}

function stableId(prefix, parts) {
  return prefix + '_' + hash(parts.map(x => String(x == null ? '' : x)).join('|')).slice(0, 24);
}
function deriveCaseIds({ tenantId, idempotencyKey }) {
  tenantId = assertIdPart(tenantId, 'tenantId');
  const key = clean(idempotencyKey, 320);
  if (!key) throw new Error('IDEMPOTENCY_KEY_REQUIRED');
  const caseId = stableId('qcase', [tenantId, key]);
  return Object.freeze({
    caseId,
    correlationId: stableId('corr', [tenantId, caseId]),
    leadBusinessId: stableId('neg', [tenantId, caseId, 'lead']),
    opsManagementId: stableId('ges', [tenantId, caseId, 'ops']),
    idempotencyRecordId: stableId('idem', [tenantId, key])
  });
}

function buildQuoteCase(input = {}) {
  const required = ['tenantId','caseId','journeyId','correlationId','country','source','intent','riskOrProductCandidate'];
  const missing = required.filter(k => !clean(input[k], 300));
  if (missing.length) return { ok:false, code:'QUOTE_CASE_REQUIRED_FIELDS', missing };

  const status = clean(input.status || 'SUBMITTED', 80);
  if (!QUOTE_CASE_STATUS.includes(status)) return { ok:false, code:'QUOTE_CASE_STATUS_INVALID' };

  return {
    ok:true,
    value:{
      schemaVersion: VERSION,
      tenantId: clean(input.tenantId,180),
      caseId: clean(input.caseId,180),
      journeyId: clean(input.journeyId,180),
      correlationId: clean(input.correlationId,180),
      country: clean(input.country,8).toUpperCase(),
      source: clean(input.source,100),
      intent: clean(input.intent,160),
      segment: clean(input.segment,120),
      riskOrProductCandidate: clean(input.riskOrProductCandidate,180),
      mode: clean(input.mode || 'HYBRID',80),
      status,
      progress: input.progress && typeof input.progress === 'object' ? input.progress : {},
      capturedFields: input.capturedFields && typeof input.capturedFields === 'object' ? input.capturedFields : {},
      missingFields: Array.isArray(input.missingFields) ? input.missingFields.slice() : [],
      contact: input.contact && typeof input.contact === 'object' ? {
        name: clean(input.contact.name,180),
        whatsapp: clean(input.contact.whatsapp,80),
        email: clean(input.contact.email,220).toLowerCase()
      } : null,
      consents: input.consents && typeof input.consents === 'object' ? input.consents : {},
      assignmentStatus: clean(input.assignmentStatus || 'UNASSIGNED',80),
      assignedAdvisorId: clean(input.assignedAdvisorId,180),
      projectionStatus: {
        lead: clean(input.projectionStatus && input.projectionStatus.lead || 'PENDING',80),
        ops: clean(input.projectionStatus && input.projectionStatus.ops || 'PENDING',80)
      },
      notificationStatusByChannel: input.notificationStatusByChannel && typeof input.notificationStatusByChannel === 'object'
        ? input.notificationStatusByChannel : {},
      selectedProposalId: clean(input.selectedProposalId,180),
      createdAt: input.createdAt || null,
      updatedAt: input.updatedAt || null
    }
  };
}

function buildProposal(input = {}) {
  const required = ['tenantId','proposalId','caseId','country','product','currency','insurerId','sourceId'];
  const missing = required.filter(k => !clean(input[k], 300));
  if (missing.length) return { ok:false, code:'PROPOSAL_REQUIRED_FIELDS', missing };
  const validationState = clean(input.validationState || 'RECEIVED',80);
  if (!PROPOSAL_VALIDATION.includes(validationState)) return { ok:false, code:'PROPOSAL_VALIDATION_STATE_INVALID' };

  return {
    ok:true,
    value:{
      schemaVersion: VERSION,
      tenantId: clean(input.tenantId,180),
      proposalId: clean(input.proposalId,180),
      caseId: clean(input.caseId,180),
      country: clean(input.country,8).toUpperCase(),
      product: clean(input.product,160),
      currency: clean(input.currency,8).toUpperCase(),
      insurerId: clean(input.insurerId,180),
      insurerDisplayName: clean(input.insurerDisplayName,220),
      planName: clean(input.planName,220),
      sourceId: clean(input.sourceId,180),
      premium: Number.isFinite(Number(input.premium)) ? Number(input.premium) : null,
      coverages: input.coverages && typeof input.coverages === 'object' ? input.coverages : {},
      limits: input.limits && typeof input.limits === 'object' ? input.limits : {},
      sublimits: input.sublimits && typeof input.sublimits === 'object' ? input.sublimits : {},
      deductibles: input.deductibles && typeof input.deductibles === 'object' ? input.deductibles : {},
      assistance: input.assistance && typeof input.assistance === 'object' ? input.assistance : {},
      conditions: Array.isArray(input.conditions) ? input.conditions.slice() : [],
      exclusions: Array.isArray(input.exclusions) ? input.exclusions.slice() : [],
      validity: input.validity && typeof input.validity === 'object' ? input.validity : {},
      provenance: input.provenance && typeof input.provenance === 'object' ? input.provenance : {},
      validationState,
      validatedBy: clean(input.validatedBy,180),
      validatedAt: input.validatedAt || null,
      supersedesProposalId: clean(input.supersedesProposalId,180),
      createdAt: input.createdAt || null,
      updatedAt: input.updatedAt || null
    }
  };
}

function eligibleForComparison(proposal, { currentValidityConfirmed = false } = {}) {
  if (!proposal || proposal.validationState !== 'VALIDATED') return false;
  if (currentValidityConfirmed !== true) return false;
  return true;
}

function buildComparisonSet({ tenantId, caseId, proposalIds, criteriaKeys = [], generatedAt = null } = {}) {
  const ids = Array.isArray(proposalIds) ? proposalIds.map(x => clean(x,180)).filter(Boolean) : [];
  if (!clean(tenantId,180) || !clean(caseId,180) || ids.length < 1) {
    return { ok:false, code:'COMPARISON_SET_REQUIRED_FIELDS' };
  }
  const comparisonSetId = stableId('cmp', [tenantId, caseId, ids.slice().sort().join(',')]);
  return {
    ok:true,
    value:{
      schemaVersion: VERSION,
      tenantId: clean(tenantId,180),
      comparisonSetId,
      caseId: clean(caseId,180),
      proposalIds: ids,
      criteriaKeys: Array.isArray(criteriaKeys) ? criteriaKeys.slice() : [],
      generatedAt,
      ...COMPARISON_TRUTH
    }
  };
}

function buildSelection({ tenantId, caseId, comparisonSetId, proposalId, selectionRequestKey, explicitUserChoice, createdAt = null } = {}) {
  if (explicitUserChoice !== true) return { ok:false, code:'EXPLICIT_USER_CHOICE_REQUIRED' };
  const required = {tenantId,caseId,comparisonSetId,proposalId,selectionRequestKey};
  const missing = Object.entries(required).filter(([,v]) => !clean(v,300)).map(([k]) => k);
  if (missing.length) return { ok:false, code:'SELECTION_REQUIRED_FIELDS', missing };
  const selectionId = stableId('sel', [tenantId,caseId,comparisonSetId,proposalId,selectionRequestKey]);
  return {
    ok:true,
    value:{
      schemaVersion: VERSION,
      tenantId: clean(tenantId,180),
      selectionId,
      caseId: clean(caseId,180),
      comparisonSetId: clean(comparisonSetId,180),
      proposalId: clean(proposalId,180),
      explicitUserChoice: true,
      ...SELECTION_TRUTH,
      createdAt
    }
  };
}

function buildCaseAccessRecord({ tenantId, caseId, rawToken, expiresAt, createdAt = null } = {}) {
  if (!clean(tenantId,180) || !clean(caseId,180) || !clean(rawToken,500) || !expiresAt) {
    return { ok:false, code:'CASE_ACCESS_REQUIRED_FIELDS' };
  }
  return {
    ok:true,
    value:{
      schemaVersion: VERSION,
      tenantId: clean(tenantId,180),
      caseId: clean(caseId,180),
      tokenHash: hash(rawToken),
      rawTokenStored: false,
      expiresAt,
      createdAt,
      revokedAt: null
    }
  };
}

function buildPublicComparisonDto({ caseId, comparisonSet, proposals = [] } = {}) {
  const allowedProposalIds = new Set(comparisonSet && comparisonSet.proposalIds || []);
  return {
    schemaVersion: VERSION,
    caseId: clean(caseId,180),
    comparisonSetId: clean(comparisonSet && comparisonSet.comparisonSetId,180),
    rankingPolicy: COMPARISON_TRUTH.rankingPolicy,
    silentWeighting: false,
    missingSemantics: COMPARISON_TRUTH.missingSemantics,
    alternatives: proposals.filter(p => allowedProposalIds.has(p.proposalId)).map(p => ({
      proposalId: clean(p.proposalId,180),
      insurerDisplayName: clean(p.insurerDisplayName,220),
      planName: clean(p.planName,220),
      currency: clean(p.currency,8),
      premium: Number.isFinite(Number(p.premium)) ? Number(p.premium) : null,
      coverages: p.coverages || {},
      limits: p.limits || {},
      sublimits: p.sublimits || {},
      deductibles: p.deductibles || {},
      assistance: p.assistance || {},
      conditions: Array.isArray(p.conditions) ? p.conditions.slice() : [],
      exclusions: Array.isArray(p.exclusions) ? p.exclusions.slice() : [],
      validity: p.validity || {}
    }))
  };
}

function projectionContract({ tenantId, caseId, journeyId, correlationId, country, product, contactName } = {}) {
  const ids = {
    leadBusinessId: stableId('neg', [tenantId,caseId,'lead']),
    opsManagementId: stableId('ges', [tenantId,caseId,'ops'])
  };
  return Object.freeze({
    workflowStorageRequired: WORKFLOW_PROJECTION_REQUIRES,
    lead: {
      target: `tenants/${tenantId}/workflow/negocios/items/${ids.leadBusinessId}`,
      requiredCotCompFields: { caseId, journeyId, correlationId },
      commercialStatus: 'lead_recibido',
      displayName: clean(contactName,180) || 'Oportunidad CotComp',
      country: clean(country,8).toUpperCase(),
      product: clean(product,180)
    },
    ops: {
      target: `tenants/${tenantId}/workflow/gestiones/items/${ids.opsManagementId}`,
      requiredCotCompFields: { caseId, journeyId, correlationId },
      opsList: 'Cotizaciones',
      status: 'Pendiente'
    },
    existingDomainExtensionRequired: true
  });
}

const SAVE_FIRST_SEQUENCE = Object.freeze([
  'VALIDATE_PAYLOAD',
  'COMMIT_QUOTE_CASE_IDEMPOTENTLY',
  'PROJECT_LEAD',
  'PROJECT_OPS',
  'REGISTER_REQUEST_EVENT',
  'PREPARE_NOTIFICATIONS',
  'ATTEMPT_NOTIFICATIONS',
  'RECORD_CHANNEL_STATUS',
  'IDEMPOTENT_RETRY_IF_NEEDED'
]);

module.exports = Object.freeze({
  VERSION,
  RUNTIME_ENABLED,
  WRITES_ENABLED,
  DEPLOY_ALLOWED,
  TENANT_MODE,
  WORKFLOW_PROJECTION_REQUIRES,
  ENTITY,
  QUOTE_CASE_STATUS,
  PROPOSAL_VALIDATION,
  SELECTION_TRUTH,
  COMPARISON_TRUTH,
  PII_POLICY,
  SAVE_FIRST_SEQUENCE,
  pathFor,
  stableId,
  deriveCaseIds,
  buildQuoteCase,
  buildProposal,
  eligibleForComparison,
  buildComparisonSet,
  buildSelection,
  buildCaseAccessRecord,
  buildPublicComparisonDto,
  projectionContract
});
