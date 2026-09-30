# CotComp S4.15–S4.17 Local Source QA

**Date:** 2026-09-29  
**Status:** `LOCAL EXECUTABLE QA PASS / SOURCE-ONLY / RUNTIME OFF / WRITES OFF / DEPLOY OFF`

## S4.15 Runtime Data Contract

Executed in Node.js 22.16.0.

Result:
`12 tests / 12 PASS / 0 FAIL`

Covered:
- isolated tenant CotComp namespace;
- deterministic case/correlation/projection IDs;
- QuoteCase correlation + PII separation;
- Proposal validated/current eligibility;
- no ranking / no silent weighting;
- explicit non-binding Selection;
- case-access hash-only storage;
- public comparison DTO strips provenance/validator internals;
- canonicalV2 workflow projection requirement;
- save-first sequencing;
- retention left to Governance/Legal.

## S4.16 Persistence Plan

Executed in Node.js 22.16.0.

Result:
`11 tests / 11 PASS / 0 FAIL`

Covered:
- no execution / no Firestore import / no writes;
- fail-closed write gate;
- deterministic save-first plan;
- hash-only case access;
- same case/journey/correlation in Lead + Ops projections;
- current workflow schema blocker explicit;
- outbox-only notification preparation;
- Proposal validated/current gate;
- Selection non-binding truth;
- direct public workflow writes forbidden.

## S4.17 Workflow Extension Contract

Executed in Node.js 22.16.0.

Result:
`9 tests / 9 PASS / 0 FAIL`

Covered:
- source-only schema extension;
- live owner identity frozen;
- minimal nested `cotcompRef` delta only;
- no auth/storage/stage change;
- tenant-configured owner/advisor;
- Lead/Ops correlation parity;
- `cotizando` operational stage + `lead_recibido` CotComp intake semantics;
- reassignment does not duplicate business/management;
- notifications remain release-gated;
- owner patch plan descriptive only.

## Aggregate

Focused S4.15–S4.17:
`32/32 PASS`

## Evidence boundary

These are local executable mirrors of the source logic. They are not claimed as GitHub Actions PASS and do not authorize runtime, Firestore writes, deployment or mutation of the live Gravicentra owner source.
