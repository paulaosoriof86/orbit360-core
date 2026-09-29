# CotComp S4.11 Local Source QA Evidence

**Date:** 2026-09-29  
**Branch head at evidence cut:** `1dc929a5049bea52a41953ed76916a83df2d46d8`  
**Runtime:** Node.js v22.16.0  
**Status:** `LOCAL EXECUTABLE QA PASS / GITHUB ACTIONS PASS NOT CLAIMED / NO RUNTIME EXPORT`

## Scope

A local executable mirror was assembled from the current CotComp branch source logic plus the canonical PREIMPL-03 contracts/validator/proposal semantics.

The purpose was to obtain observable execution after the repository connector did not expose a successful GitHub Actions run.

This evidence does **not** claim byte-for-byte GitHub checkout identity or a GitHub-hosted CI PASS. It does prove the current source logic exercised in Node 22 under the tests below.

## Syntax

All local JavaScript modules used in the run passed `node --check`, including:
- canonical contracts;
- canonical intake validator;
- proposal contract;
- public/backend bridge;
- transport contract;
- gateway harness;
- completion contract;
- callable policy;
- callable handlers;
- source-only callable wrapper.

## Executed tests

`37 tests / 37 PASS / 0 FAIL / 0 skipped / 0 cancelled`

Coverage includes:
- default-deny / AUTO off;
- GT Auto canonical submit validation;
- GT Health DOB/dependent validation;
- CO Transport conditional fields;
- validated/current proposal eligibility;
- MISSING != NOT_COVERED;
- no ranking / no silent weighting;
- GT/CO public-field normalization;
- App Check public boundary;
- case-level access requirement for proposal reads/selections;
- draft contact deferral;
- handoff idempotency/contact/consent gating;
- canonical validator handoff;
- explicit non-binding proposal selection;
- completion-field conditional logic;
- callable policy/write-off invariants;
- pure callable handlers;
- case-access dependency injection;
- persistence disabled end-to-end.

## Runtime truth

Still false/off:
- runtime export;
- Firestore/Orbit.store persistence;
- QuoteCase/Lead/Ops writes;
- provider/rater calls;
- issuance;
- payment;
- deploy;
- production traffic.

## PR / branch state

Draft PR #149 remains a QA-only comparison surface and is mergeable. No merge is authorized by this evidence.

## Next gate

Use this local PASS to freeze the source-only callable contract, then prepare a runtime/export ticket. Any runtime ticket must preserve:
- App Check;
- case-level access before proposal read/selection;
- explicit user choice;
- no ranking;
- no persistence until the writer contract has its own approval.
