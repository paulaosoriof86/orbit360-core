# CotComp Callable Source · S4.11 / F8-G4

**Date:** 2026-09-29  
**Status:** SOURCE-ONLY / HANDLERS IMPLEMENTED / CALLABLE WRAPPERS DEFINED / NOT EXPORTED / NO WRITES

## What changed

S4.11 implements the callable layer in two parts:

1. Pure handlers that are executable/testable without Firebase runtime.
2. Cloud Functions v2 callable wrappers with App Check options.

The callable wrapper module is intentionally not imported or exported by the deployed function entrypoints.

## Public operations

### Validate draft
- requires App Check at callable layer;
- pure validation only;
- no persistence.

### Submit handoff
- requires App Check;
- candidate replay protection enabled through token consumption;
- validates canonical submit-ready payload;
- returns VALIDATED_NOT_PERSISTED;
- no QuoteCase/Lead/Ops write.

### Fetch comparable proposals
- requires App Check;
- requires injected case-access verification;
- requires injected proposal loader;
- filters through canonical validated/current proposal eligibility;
- no ranking.

### Select proposal
- requires App Check;
- requires injected case-access verification;
- requires explicit user choice;
- validates continuation only;
- no issuance/binding/coverage confirmation;
- no persistence.

## Runtime gate

`RUNTIME_EXPORT_ALLOWED=false`.

The source exists so the contract can be tested before any deployment decision. No change was made to functions/index.js or bootstrap.js.

## Next gate

Execute source QA including callable handlers. If PASS, freeze S4.11 and prepare a separate runtime/export ticket. Persistence must remain disabled until the QuoteCase/Lead/Ops writer contract is independently reviewed and authorized.
