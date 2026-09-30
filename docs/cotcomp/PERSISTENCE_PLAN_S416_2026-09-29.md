# CotComp Persistence Plan · S4.16 / F8-G4

**Date:** 2026-09-29  
**Status:** SOURCE-ONLY WRITE PLAN / NO FIRESTORE IMPORT / EXECUTION OFF / WRITES OFF

S4.16 turns the S4.15 runtime data contract into a deterministic write **plan**, not a writer.

## Purpose

Prove exact paths, IDs, sequencing and blockers before any Firestore implementation.

## Phases

### A. CASE_COMMIT
Plans:
- idempotency reservation;
- QuoteCase create-if-absent;
- case-access hash record.

### B. OPERATIONS_PROJECTION
Plans deterministic projections into canonicalV2:
- Lead → workflow/negocios/items/{leadBusinessId}
- Ops → workflow/gestiones/items/{opsManagementId}

This phase is explicitly blocked because the current Ops/Leads sanitizer does not yet preserve caseId/journeyId/correlationId.

### C. EVENT_AND_OUTBOX
Plans:
- CotComp event;
- notification outbox PREPARED for in-app + WhatsApp + email.

No delivery claim is made.

## Write gate

A future writer must fail closed unless:
- exact LAB project;
- S4.15 QA PASS;
- workflow storage mode canonicalV2;
- workflow CotComp schema extension PASS;
- retention policy approved;
- case-access persistence approved;
- explicit owner write authorization.

Even if all are true, S4.16 still returns:
- `EXECUTION_ENABLED=false`
- `WRITES_ENABLED=false`
- `effectiveWriteAllowed=false`

## Critical separation

The public browser never writes directly to workflow/negocios or workflow/gestiones.

A future authorized server-side CotComp writer owns case persistence and projections.

## Next block

Design the minimal Ops/Leads schema extension required to preserve:
- caseId
- journeyId
- correlationId
- CotComp role/reference

without changing unrelated workflow behavior.

Then test that extension source-only before any persistence runtime is opened.
