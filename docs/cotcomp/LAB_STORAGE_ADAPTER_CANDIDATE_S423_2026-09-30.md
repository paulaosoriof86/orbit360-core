# CotComp LAB Storage Dependency Adapter Candidate - S4.23 / F8-G4

Date: 2026-09-30
Status: SOURCE-ONLY / LAB ADAPTER CONTRACT / READY=false / EXECUTION OFF / WRITES OFF / NO DEPLOY

## Objective

Define the future LAB storage dependency that may satisfy the S4.22 server-side writer interface, while remaining impossible to execute.

## Current canonical evidence

The canonical recovery branch was re-read before S4.23.

Observed:
- recovery HEAD advanced;
- effective functions/ops-leads-domain.js blob remains 73e09a4404cb4298dc34c9c38e26ad1f960d3170;
- therefore the S4.20 cotcompRef source patch remains present;
- no runtime deployment is inferred from repository source.

## Exact target

- project: ays-orbit-360-lab
- environment: LAB
- tenant: alianzas-soluciones
- workflow storage: canonicalV2
- required deployed workflow owner blob: 73e09a4404cb4298dc34c9c38e26ad1f960d3170

## Allowed storage paths

CotComp tenant namespace:
tenants/alianzas-soluciones/cotcomp/{entity}/items/{id}

Entities:
quoteCases, proposals, comparisonSets, selections, caseAccess, idempotency, events.

Workflow projection only:
- tenants/alianzas-soluciones/workflow/negocios/items/{id}
- tenants/alianzas-soluciones/workflow/gestiones/items/{id}

Workflow commands require an explicit serverProjection marker.

Notification outbox only:
tenants/alianzas-soluciones/notificationOutbox/{id}

Legacy tenantId/{tenantId}/... paths are denied.

## Required driver shape

A later authorized driver must provide:
- get
- runAtomicGroup
- patch

S4.23 does not import Firebase Admin or Firestore.

## Server-only context

The adapter rejects:
- public browser execution;
- wrong tenant;
- missing SERVER_COTCOMP_WRITER actor context.

## Readiness gate

Logical readiness requires:
- exact LAB project/environment/tenant;
- canonicalV2 workflow storage;
- S4.20 workflow owner blob actually deployed;
- retention policy approved;
- case-access persistence approved;
- negative security QA PASS;
- explicit owner write authorization;
- separate deploy authorization.

Even if every logical prerequisite is supplied:
- READY=false
- EXECUTION_ENABLED=false
- WRITES_ENABLED=false
- DRIVER_CALLS_ALLOWED=false
- effectiveReady=false

## Execution boundary

read, runAtomicGroup, and patch throw COTCOMP_LAB_STORAGE_ADAPTER_NOT_READY before calling the injected driver.

## Next block

S4.24 should define the negative security QA matrix and executable pure harness for:
- cross-tenant path attacks;
- legacy path bypass;
- public-browser write attempts;
- partial case correlation;
- replay/idempotency misuse;
- invalid/expired case access;
- unvalidated proposal comparison;
- implicit proposal selection;
- PII leakage in public DTO/log summaries.

No deploy or writes are authorized by S4.23.
