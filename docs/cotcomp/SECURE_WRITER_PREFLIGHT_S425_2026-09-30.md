# CotComp Secure Writer Preflight Envelope - S4.25 / F8-G4

**Date:** 2026-09-30  
**Status:** SOURCE-ONLY / SECURITY PREFLIGHT WIRED / EXECUTION OFF / WRITES OFF / DEPENDENCY CALLS OFF

## Objective

Wire the S4.24 negative-security contracts into the future server-side writer path before any dependency can ever be called.

## Initial handoff preflight

The secure envelope combines:
- S4.22 dependency-shape validation;
- server-only tenant context;
- S4.24 idempotency replay semantics;
- S4.24 dry-run PII leakage check;
- S4.21 canonical dry-run persistence preview.

Preflight can PASS as a source contract while effective execution remains false.

## Idempotency enforcement contract

Before future persistence:
- no existing digest + incoming digest → NEW_REQUEST;
- same digest → IDEMPOTENT_RETRY_MATCH;
- changed digest for same idempotency identity → IDEMPOTENCY_PAYLOAD_CONFLICT.

A conflict makes `securityPreflightPass=false`.

## Public response boundary

The envelope exposes a public response only if the S4.24 forbidden-field scanner passes.

Unsafe public payload:
- returns `ok=false`;
- returns `payload=null`.

## Proposal and Selection

Proposal preview remains governed by the canonical writer preview.

Selection preflight fails when the canonical selection contract does not accept the request, including implicit/non-explicit selection.

## No side effects

Injected dependencies are validated for shape but not called.

Hard locks:
- `EXECUTION_ENABLED=false`
- `WRITES_ENABLED=false`
- `DEPENDENCY_CALLS_ALLOWED=false`
- `effectiveExecutionAllowed=false`

Execution assertion throws:
`COTCOMP_SECURE_WRITER_EXECUTION_DISABLED`.

## Runtime truth

S4.25 is not an executable persistence writer and is not imported from deployed runtime entrypoints.

No Firestore/write/deploy/provider/rater/issuance/payment action is authorized or performed.

## Next block

S4.26 should freeze the two remaining governance contracts that source code cannot decide by itself:
1. retention policy;
2. case-access persistence policy.

Those require owner/governance decisions before a write gate can ever open.
