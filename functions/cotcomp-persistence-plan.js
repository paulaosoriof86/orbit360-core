'use strict';

const crypto = require('node:crypto');
const data = require('./cotcomp-runtime-data-contract');

const VERSION = 'ays-cotcomp-persistence-plan-s416-v0.1';
const EXECUTION_ENABLED = false;
const FIRESTORE_IMPORTED = false;
const WRITES_ENABLED = false;

function hash(v) {
  return crypto.createHash('sha256').update(String(v == null ? '' : v),'utf8').digest('hex');
}
function eventId(caseId, kind) {
  return 'evt_' + hash([caseId,kind].join('|')).slice(0,24);
}
function notificationOutboxPath(tenantId, id) {
  return `tenants/${tenantId}/notificationOutbox/${id}`;
}
function workflowPath(tenantId, collection, id) {
  return `tenants/${tenantId}/workflow/${collection}/items/${id}`;
}

function writeGate(input = {}) {
  const reasons = [];
  if (input.projectId !== 'ays-orbit-360-lab') reasons.push('PROJECT_NOT_LAB');
  if (input.environment !== 'LAB') reasons.push('ENVIRONMENT_NOT_LAB');
  if (input.dataContractQaPass !== true) reasons.push('DATA_CONTRACT_QA_REQUIRED');
  if (input.workflowStorageMode !== 'canonicalV2') reasons.push('WORKFLOW_CANONICAL_V2_REQUIRED');
  if (input.workflowCotCompFieldsSupported !== true) reasons.push('WORKFLOW_COTCOMP_SCHEMA_EXTENSION_REQUIRED');
  if (input.retentionPolicyApproved !== true) reasons.push('RETENTION_POLICY_REQUIRED');
  if (input.caseAccessPersistenceApproved !== true) reasons.push('CASE_ACCESS_PERSISTENCE_APPROVAL_REQUIRED');
  if (input.ownerWriteAuthorization !== true) reasons.push('OWNER_WRITE_AUTHORIZATION_REQUIRED');
  return {
    ok: reasons.length === 0,
    reasons,
    executionEnabledByCode: EXECUTION_ENABLED,
    writesEnabledByCode: WRITES_ENABLED,
    effectiveWriteAllowed: false
  };
}

function buildInitialHandoffPlan(input = {}) {
  const ids = data.deriveCaseIds({
    tenantId: input.tenantId,
    idempotencyKey: input.idempotencyKey
  });
  const evt = eventId(ids.caseId,'PUBLIC_HANDOFF_RECEIVED');
  const projection = data.projectionContract({
    tenantId: input.tenantId,
    caseId: ids.caseId,
    journeyId: input.journeyId,
    correlationId: ids.correlationId,
    country: input.country,
    product: input.product,
    contactName: input.contact && input.contact.name
  });
  const quoteCase = data.buildQuoteCase({
    tenantId: input.tenantId,
    caseId: ids.caseId,
    journeyId: input.journeyId,
    correlationId: ids.correlationId,
    country: input.country,
    source: input.source || 'PUBLIC_WEB',
    intent: input.intent || 'COTIZAR',
    segment: input.segment,
    riskOrProductCandidate: input.product,
    mode: input.mode || 'HYBRID',
    capturedFields: input.capturedFields || {},
    missingFields: input.missingFields || [],
    contact: input.contact || null,
    consents: input.consents || {},
    status: 'SUBMITTED'
  });
  if (!quoteCase.ok) return { ok:false, code:quoteCase.code, missing:quoteCase.missing || [] };

  const rawToken = input.caseAccessToken;
  const caseAccess = rawToken ? data.buildCaseAccessRecord({
    tenantId: input.tenantId,
    caseId: ids.caseId,
    rawToken,
    expiresAt: input.caseAccessExpiresAt
  }) : { ok:false, code:'CASE_ACCESS_REQUIRED_FIELDS' };

  const gate = writeGate(input.gate || {});

  return {
    ok: true,
    version: VERSION,
    executionEnabled: EXECUTION_ENABLED,
    writesEnabled: WRITES_ENABLED,
    gate,
    identifiers: ids,
    phases: [
      {
        phase: 'CASE_COMMIT',
        atomicGroup: 'A',
        operations: [
          {
            type:'CREATE_IF_ABSENT',
            entity:'idempotency',
            path:data.pathFor(input.tenantId,data.ENTITY.IDEMPOTENCY,ids.idempotencyRecordId),
            payload:{
              schemaVersion:VERSION,
              idempotencyRecordId:ids.idempotencyRecordId,
              caseId:ids.caseId,
              correlationId:ids.correlationId,
              requestDigest:hash(JSON.stringify(input.capturedFields || {})),
              status:'RESERVED'
            }
          },
          {
            type:'CREATE_IF_ABSENT',
            entity:'quoteCase',
            path:data.pathFor(input.tenantId,data.ENTITY.QUOTE_CASE,ids.caseId),
            payload:quoteCase.value
          },
          {
            type:'CREATE_IF_ABSENT',
            entity:'caseAccess',
            path:data.pathFor(input.tenantId,data.ENTITY.CASE_ACCESS,ids.caseId),
            payload:caseAccess.ok ? caseAccess.value : null,
            blocked:!caseAccess.ok,
            blockReason:caseAccess.ok ? null : caseAccess.code
          }
        ]
      },
      {
        phase:'OPERATIONS_PROJECTION',
        atomicGroup:'B',
        blockedByCurrentWorkflowSchema:true,
        operations:[
          {
            type:'UPSERT_DETERMINISTIC',
            entity:'leadProjection',
            path:workflowPath(input.tenantId,'negocios',ids.leadBusinessId),
            requiredFields:{
              caseId:ids.caseId,
              journeyId:input.journeyId,
              correlationId:ids.correlationId,
              cotcompRole:'LEAD_PROJECTION'
            },
            semantics:{
              commercialStatus:'lead_recibido',
              noDuplicateOnAssignment:true
            }
          },
          {
            type:'UPSERT_DETERMINISTIC',
            entity:'opsProjection',
            path:workflowPath(input.tenantId,'gestiones',ids.opsManagementId),
            requiredFields:{
              caseId:ids.caseId,
              journeyId:input.journeyId,
              correlationId:ids.correlationId,
              businessId:ids.leadBusinessId,
              cotcompRole:'OPS_QUOTATION_PROJECTION'
            },
            semantics:{
              opsList:'Cotizaciones',
              sameBusinessCase:true
            }
          }
        ]
      },
      {
        phase:'EVENT_AND_OUTBOX',
        atomicGroup:'C',
        operations:[
          {
            type:'CREATE_IF_ABSENT',
            entity:'cotcompEvent',
            path:data.pathFor(input.tenantId,data.ENTITY.EVENT,evt),
            payload:{
              schemaVersion:VERSION,
              eventId:evt,
              type:'PUBLIC_HANDOFF_RECEIVED',
              caseId:ids.caseId,
              journeyId:input.journeyId,
              correlationId:ids.correlationId
            }
          },
          {
            type:'CREATE_IF_ABSENT',
            entity:'notificationOutbox',
            path:notificationOutboxPath(input.tenantId,evt),
            payload:{
              schemaVersion:VERSION,
              eventId:evt,
              caseId:ids.caseId,
              correlationId:ids.correlationId,
              targets:[{type:'owner_assignment_queue'}],
              channels:['in_app','whatsapp','email'],
              status:'PREPARED',
              deliveryClaim:'NOT_YET_ATTEMPTED'
            }
          }
        ]
      }
    ],
    executionOrder:data.SAVE_FIRST_SEQUENCE,
    invariant:{
      quoteCaseSurvivesNotificationFailure:true,
      retriesIdempotent:true,
      rawCaseTokenPersisted:false,
      directPublicWorkflowWriteForbidden:true
    },
    blockers:[
      'CURRENT_OPS_LEADS_SCHEMA_DOES_NOT_PRESERVE_COTCOMP_CORRELATION_FIELDS',
      'RETENTION_POLICY_NOT_YET_FROZEN',
      'CASE_ACCESS_PERSISTENCE_NOT_AUTHORIZED',
      'WRITES_DISABLED_BY_CODE'
    ]
  };
}

function buildProposalPlan(input = {}) {
  const proposal = data.buildProposal(input.proposal || {});
  if (!proposal.ok) return { ok:false, code:proposal.code, missing:proposal.missing || [] };
  return {
    ok:true,
    executionEnabled:EXECUTION_ENABLED,
    writesEnabled:WRITES_ENABLED,
    operation:{
      type:'UPSERT_VERSIONED_PROPOSAL',
      path:data.pathFor(proposal.value.tenantId,data.ENTITY.PROPOSAL,proposal.value.proposalId),
      payload:proposal.value
    },
    comparisonEligibility:{
      requiredValidationState:'VALIDATED',
      currentValidityRequired:true,
      rankingPolicy:'NONE_BY_DEFAULT'
    }
  };
}

function buildSelectionPlan(input = {}) {
  const selection = data.buildSelection(input);
  if (!selection.ok) return selection;
  return {
    ok:true,
    executionEnabled:EXECUTION_ENABLED,
    writesEnabled:WRITES_ENABLED,
    operation:{
      type:'CREATE_IDEMPOTENT_SELECTION',
      path:data.pathFor(selection.value.tenantId,data.ENTITY.SELECTION,selection.value.selectionId),
      payload:selection.value
    },
    quoteCasePatch:{
      selectedProposalId:selection.value.proposalId,
      status:'USER_SELECTED'
    },
    truth:data.SELECTION_TRUTH
  };
}

module.exports = Object.freeze({
  VERSION,
  EXECUTION_ENABLED,
  FIRESTORE_IMPORTED,
  WRITES_ENABLED,
  writeGate,
  buildInitialHandoffPlan,
  buildProposalPlan,
  buildSelectionPlan
});
