# CotComp Negative Security QA Matrix + Pure Harness - S4.24 / F8-G4

**Date:** 2026-09-30  
**Status:** SOURCE-ONLY / PURE SECURITY HARNESS / NO SIDE EFFECTS / RUNTIME+WRITES+DEPLOY OFF

## Objective

Attempt to break the current CotComp source contracts before any storage adapter can become READY.

S4.24 is deliberately adversarial. It validates failure behavior, not happy-path UI.

## Security scenarios

### SEC-01 Cross-tenant path
A path for another tenant must be denied.

### SEC-02 Legacy-path bypass
Legacy tenantId/{tenantId}/... paths must not bypass the canonical LAB adapter allowlist.

### SEC-03 Public-browser write attempt
A public browser context must be rejected by the storage adapter.

### SEC-04 Partial case correlation
caseId / journeyId / correlationId are atomic as a correlation contract. Partial references fail closed.

### SEC-05 Replay / idempotency conflict
- first digest: NEW_REQUEST;
- same digest: IDEMPOTENT_RETRY_MATCH;
- changed payload digest under the same idempotency identity: IDEMPOTENCY_PAYLOAD_CONFLICT.

This is now a frozen source-level control requirement for the future writer. Runtime enforcement is not yet claimed.

### SEC-06 Invalid / expired case access
Invalid token and expired token fail closed.

### SEC-07 Unvalidated or stale proposal
Only VALIDATED + current proposals are comparison eligible.

### SEC-08 Implicit proposal selection
Selection without explicit user choice is denied.

### SEC-09 Missing versus not covered
NOT_COVERED requires explicit source declaration. Missing/unmapped data cannot silently become NOT_COVERED.

### SEC-10 Public DTO leakage
Public comparison DTO must not expose PII, token material, provenance, validator identity, source diagnostics or internal notes.

### SEC-11 Dry-run/log summary leakage
Persistence dry-run summaries expose digests and metadata, not raw payloads/contact/consent/token fields.

### SEC-12 Writer execution
Writer interface fails closed before dependency invocation.

### SEC-13 Storage execution
LAB storage adapter fails closed before driver invocation.

### SEC-14 Gate escalation
Even if every logical readiness prerequisite is passed as input, the hard code gate still keeps effectiveReady=false while READY=false.

## New security contract

S4.24 adds:
`cotcomp-negative-security-contract.js`

It freezes:
- idempotency replay conflict semantics;
- forbidden public/internal key scanner;
- dry-run summary leakage scanner.

These are source-level contracts only.

## Harness

`cotcomp-negative-security-harness.js`

The harness composes the actual current source contracts:
- LAB storage adapter;
- workflow correlation contract;
- case-access contract;
- proposal contract;
- transport contract;
- runtime data DTO;
- persistence dry-run adapter;
- writer interface;
- S4.24 security contract.

`SIDE_EFFECTS_ALLOWED=false`.

## Runtime truth

S4.24 does not:
- deploy;
- write Firestore;
- call a storage driver;
- write Leads/Ops;
- invoke providers/raters;
- issue/bind/pay;
- enable callable runtime.

## Next gate

Execute/observe the S4.24 harness and tests.

If all negative scenarios PASS, the remaining blockers are governance/runtime blockers rather than missing source-level negative-security contracts:
- retention;
- case-access persistence authorization;
- S4.20 deployed LAB proof;
- explicit write authorization;
- separate deploy authorization.

No storage adapter may become READY before these remain satisfied independently.
