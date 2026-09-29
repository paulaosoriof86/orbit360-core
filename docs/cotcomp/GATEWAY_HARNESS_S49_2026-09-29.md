# CotComp Source-Only Gateway Harness · S4.9 / F8-G4

**Date:** 2026-09-29  
**Status:** SOURCE-ONLY / PURE HARNESS / NO DEPLOY / NO WRITES

## Purpose

Prove the full pure-code contract chain before exposing any runtime endpoint:

public payload
→ public bridge
→ authenticated transport contract
→ canonical CotComp validator
→ validated/current proposal filter
→ explicit user selection handoff.

## Guarantees

- No Firebase imports in the harness.
- No Orbit.store.
- No Firestore.
- No provider adapter.
- No rater.
- No issuance.
- No deploy.
- No persistence.
- No ranking or hidden weighting.

## Draft

`validateDraft()` allows the UX to stay lightweight while identifying journey-required fields and deferring contact/consent until handoff.

## Submit handoff

`prepareHandoffSubmit()` uses the public bridge and then the existing canonical `validateSubmitReadyIntake()`.

A public payload is not considered submit-ready until the canonical validator passes.

## Proposal comparison

`comparableProposals()` delegates eligibility to the existing proposal contract:
only VALIDATED + current proposals are included.

Order is preserved. No winner is calculated.

## Selection

`prepareSelection()` requires explicit user choice and returns only a continuation handoff state:
- NOT_ISSUED
- NOT_BOUND
- NOT_CONFIRMED

## Next gate

Run source-only contract tests and reconcile any missing public fields by journey.

After that, design the actual callable/gateway implementation behind a separate runtime authorization. The browser must never write directly to internal stores.
