# CotComp Runtime Data Contract · S4.15 / F8-G4

**Date:** 2026-09-29  
**Status:** DESIGNED + SOURCE-ONLY / PHYSICAL MODEL FROZEN / RUNTIME OFF / WRITES OFF / DEPLOY OFF

## 1. Why this contract exists

The S4.14 forensic audit proved that the current Gravicentra canonical store does not yet contain physical QuoteCase / Proposal / ComparisonSet / Selection entities and that the current public A&S runtime explicitly keeps Cotizador/Comparativo disabled.

S4.15 therefore defines the missing physical contract instead of inventing queries against non-existent collections.

## 2. Canonical CotComp namespace

New CotComp entities are isolated under the tenant:

- `tenants/{tenantId}/cotcomp/quoteCases/items/{caseId}`
- `tenants/{tenantId}/cotcomp/proposals/items/{proposalId}`
- `tenants/{tenantId}/cotcomp/comparisonSets/items/{comparisonSetId}`
- `tenants/{tenantId}/cotcomp/selections/items/{selectionId}`
- `tenants/{tenantId}/cotcomp/caseAccess/items/{caseId}`
- `tenants/{tenantId}/cotcomp/idempotency/items/{idempotencyRecordId}`
- `tenants/{tenantId}/cotcomp/events/items/{eventId}`

These paths are **design/source contract only**. S4.15 does not create them in Firestore.

## 3. Identifiers

### caseId
Deterministic from tenant + idempotency key.

### journeyId
The executable public/backend journey contract, e.g. `GT_AUTO_MOTO_HYBRID`.

### correlationId
Stable case correlation identifier shared across CotComp, Lead and Ops projections.

### proposalId
Independent proposal entity ID; never overloaded as insurer/source ID.

### comparisonSetId
Stable identifier for the exact eligible proposal set being compared.

### selectionId
Stable selection event keyed by case + comparison set + proposal + selection request key.

## 4. QuoteCase

QuoteCase is the source of truth for the public CotComp request, not Leads or Ops.

Minimum contractual fields include:
- tenantId
- caseId
- journeyId
- correlationId
- country
- source
- intent
- segment
- riskOrProductCandidate
- mode
- progress
- capturedFields
- missingFields
- contact
- consents
- assignmentStatus
- assignedAdvisorId
- projectionStatus
- notificationStatusByChannel
- selectedProposalId
- lifecycle status
- timestamps

The contact block is PII/confidential and may remain absent during exploration.

## 5. Proposal

Proposal stores the normalized insurer/source alternative independently of the case.

A Proposal contains:
- proposalId
- caseId
- insurerId
- sourceId
- country/product/currency
- premium
- coverages
- limits/sublimits
- deductibles
- assistance
- conditions/exclusions
- validity
- provenance
- validation state
- validator metadata
- supersession relationship

Only `VALIDATED + current` proposals are comparison-eligible.

## 6. ComparisonSet

ComparisonSet contains the exact proposal IDs and criteria used for one comparison view.

Permanent semantics:
- `rankingPolicy = NONE_BY_DEFAULT`
- `silentWeighting = false`
- `MISSING != NOT_COVERED`
- only validated/current proposals.

No automatic winner is stored.

## 7. Selection

Selection is an explicit user action.

It means:
`USER_SELECTED_FOR_CONTINUATION`

It does **not** mean:
- issued;
- bound;
- paid;
- coverage confirmed.

Frozen truth fields:
- `NOT_ISSUED`
- `NOT_BOUND`
- `NOT_CONFIRMED`

## 8. Case access

Public case-specific reads use an opaque token.

Server-side storage, when a writer is separately authorized, stores:
- token hash only;
- case binding;
- expiry;
- revocation state.

Raw tokens are never persisted.

## 9. Public comparison DTO

The web receives only an authorized comparison DTO.

Allowed categories:
- proposal ID
- insurer display name
- plan name
- currency/premium
- coverage statuses
- limits/sublimits
- deductibles
- assistance
- conditions/exclusions
- validity

Not exposed:
- provenance internals
- validator identity
- internal source diagnostics
- secrets
- operational notes
- PII from the QuoteCase

## 10. Leads/Ops projection

QuoteCase remains the canonical CotComp case.

Leads and Ops are coordinated projections of the same case.

Target canonicalV2 patterns:
- Lead: `tenants/{tenantId}/workflow/negocios/items/{leadBusinessId}`
- Ops: `tenants/{tenantId}/workflow/gestiones/items/{opsManagementId}`

Both must preserve:
- caseId
- journeyId
- correlationId

Lead semantics:
- initial commercial status equivalent to `lead_recibido`;
- Paula retains visibility after assignment;
- reassignment mutates the same case/projections; no duplicate.

Ops semantics:
- list = `Cotizaciones`;
- represents operational quotation work, not another business.

**Current blocker:** the existing `ops-leads-domain.js` sanitizer does not preserve these CotComp identifiers. A later, separately reviewed source change is required before projection runtime can open.

## 11. Save-first / projection-second / notify-last

Required order:

1. validate payload;
2. commit QuoteCase idempotently;
3. project Lead;
4. project Ops;
5. register request event;
6. prepare notifications;
7. attempt notifications;
8. record PREPARED / SENT / DELIVERED / FAILED / UNKNOWN by channel;
9. retry idempotently where applicable.

Notification failure never deletes or invalidates the QuoteCase.

## 12. PII and retention

Frozen:
- no PII in URL/querystring;
- no PII/sensitive data in analytics;
- sanitized logs;
- secrets backend-only;
- processing consent separate from marketing consent.

Not yet frozen:
- retention duration.

Retention stays:
`GOVERNANCE_LEGAL_DECISION_REQUIRED`

No implementation may invent a retention period.

## 13. Runtime gates

S4.15 keeps:
- `RUNTIME_ENABLED=false`
- `WRITES_ENABLED=false`
- `DEPLOY_ALLOWED=false`

Before runtime:
1. contract QA PASS;
2. canonical workflow storage mode verified;
3. Ops/Leads schema extension reviewed;
4. QuoteCase writer source implemented with idempotency;
5. case-access persistence implemented server-side;
6. proposal read/write contracts implemented;
7. read-only public DTO proven;
8. negative security tests;
9. staging readback;
10. owner authorization.

## 14. Next block

Implement a **source-only CotComp persistence adapter candidate** against this frozen model, still with writes disabled by code.

That candidate should produce write plans and deterministic IDs, but must not call Firestore until a separate write/runtime gate is explicitly authorized.
