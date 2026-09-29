# CotComp Authenticated Transport Contract · S4.8 / F8-G4

**Date:** 2026-09-29  
**Status:** SOURCE-ONLY / CONTRACT DESIGNED / RUNTIME OFF / WRITES OFF

## Decision

The public CotComp does not require the visitor to log in before exploring the journey. Transport security is therefore split by channel:

- PUBLIC_WEB exploration/submission: App Check at the gateway; no visible login is required.
- PUBLIC_WEB proposal reads/selection: App Check plus verified case access bound to the QuoteCase.
- PORTAL / INTERNAL: Firebase Auth identity plus session authorization.

The public browser must not call Orbit360 data stores directly.

## Operations

1. `VALIDATE_DRAFT`
   - no persistence;
   - may defer contact + consent;
   - journey-required technical fields must be complete before backend validation.

2. `SUBMIT_HANDOFF`
   - requires submit-ready journey data;
   - requires contact name, WhatsApp, email, consent and idempotency key;
   - S4.8 contract permits transport validation only; persistence remains OFF.

3. `FETCH_COMPARABLE_PROPOSALS`
   - read-only;
   - only validated and currently valid proposals;
   - MISSING is never silently rendered as NOT_COVERED;
   - no default ranking.

4. `SELECT_PROPOSAL`
   - requires explicit user choice;
   - selection means continuation/handoff only;
   - it is not issuance, binding, payment or coverage confirmation.

## Missing-field strategy

The UX may remain lightweight during exploration, but before `SUBMIT_HANDOFF` the system must collect the backend contract fields still missing.

For GT Auto, the current public form must add/resolve at minimum brand + line/model plus the handoff contact/consent block.

For GT Health, exact dates of birth and backend geography preference cannot be inferred from ages or a broad territory label.

For CO Transport, coverage mode and transport modes must be explicit before submit-ready validation.

No value is invented simply to satisfy the backend.

## Security boundary

App Check protects the callable from requests that do not originate from the registered web app. Case-level access is a separate authorization concern and is required before a public visitor can read or select proposals for an existing QuoteCase.

S4.8 defines the envelope and authorization preconditions only. It does not:
- expose a Cloud Function;
- enable runtime;
- write QuoteCase/Lead/Ops;
- call insurers;
- deploy;
- touch production.

## Next gate

Implement a source-only gateway handler/harness against this contract, then contract-test:
public UI payload -> bridge -> transport -> backend validator.

Only after that PASS may a separate runtime/deploy authorization be considered.
