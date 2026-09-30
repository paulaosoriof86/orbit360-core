# CotComp S4.24 Negative Security Harness - Executed QA

**Date:** 2026-09-30  
**Status:** `PURE SOURCE HARNESS EXECUTED / 14/14 SECURITY SCENARIOS PASS / 13/13 SOURCES PARSE / NO SIDE EFFECTS / RUNTIME+WRITES+DEPLOY OFF`

## Execution source

The harness was executed from the current GitHub branch source:

`ays/cotcomp-public-bridge-s47-20260929`

Source modules loaded:
- LAB storage adapter candidate;
- workflow extension contract;
- case-access contract;
- proposal contracts;
- public bridge;
- transport contract;
- runtime data contract;
- persistence plan;
- persistence dry-run adapter;
- persistence writer interface;
- S4.24 negative security contract;
- S4.24 negative security harness.

## Parse

`13/13 source modules parsed successfully`.

## Security harness

`14/14 PASS`
`0 FAIL`

### PASS matrix

- SEC-01 cross-tenant path deny → STORAGE_PATH_NOT_ALLOWED
- SEC-02 legacy-path bypass deny → STORAGE_PATH_NOT_ALLOWED
- SEC-03 public-browser write deny → PUBLIC_BROWSER_FORBIDDEN
- SEC-04 partial correlation deny → missing correlationId
- SEC-05 idempotency replay conflict deny
  - NEW_REQUEST
  - IDEMPOTENT_RETRY_MATCH
  - IDEMPOTENCY_PAYLOAD_CONFLICT
- SEC-06 invalid/expired case access deny
  - CASE_ACCESS_EXPIRED
  - CASE_ACCESS_TOKEN_INVALID
- SEC-07 unvalidated/stale proposal deny
  - NOT_VALIDATED
  - CURRENT_VALIDITY_NOT_CONFIRMED
- SEC-08 implicit selection deny → EXPLICIT_USER_CHOICE_REQUIRED
- SEC-09 MISSING must not silently become NOT_COVERED
  - NOT_COVERED_REQUIRES_EXPLICIT_SOURCE_DECLARATION
- SEC-10 public comparison DTO strips forbidden PII/internal fields
- SEC-11 dry-run summary contains digests/metadata only, no raw PII payload
- SEC-12 writer execution fails closed → COTCOMP_WRITER_EXECUTION_DISABLED
- SEC-13 storage adapter execution fails closed → COTCOMP_LAB_STORAGE_ADAPTER_NOT_READY
- SEC-14 logical readiness cannot override hard code gate

## Execution qualifier

The connector execution environment is V8 rather than Node.

The current GitHub module sources were evaluated directly. For modules that call `node:crypto`, the crypto API was deterministically shimmed only to exercise hash equality/control-flow.

Therefore this execution supports the negative-security **control-flow contract**, but it does not constitute a cryptographic-strength validation of SHA-256 or a Node/Firebase runtime PASS.

No network, Firestore, driver, callable, provider or write side effect was permitted or executed.

## Important security conclusion

The source model now contains an explicit idempotency conflict contract:

same idempotency identity + changed request digest
→ `IDEMPOTENCY_PAYLOAD_CONFLICT`.

This requirement is frozen at source-contract level.

It is **not yet wired into an executable persistence writer**, because the writer itself remains hard-disabled.

## Remaining blockers

Negative source security is no longer an untested design-only item.

Still open independently:
1. retention policy approval;
2. case-access persistence approval;
3. proof that S4.20 owner source is deployed in authorized LAB;
4. Node/GitHub-hosted source test evidence if required for release;
5. explicit owner write authorization;
6. separate deploy authorization.

## Runtime truth

Still no:
- runtime export;
- Firestore write;
- Leads/Ops data mutation;
- driver execution;
- provider/rater;
- issuance/payment;
- deployment.
