# CotComp S4.44 · Source-only write infrastructure candidates

**Date:** 2026-09-30  
**Status:** `SOURCE-ONLY / EXECUTION OFF / WRITES OFF / NO DEPLOY / REAL DATA OFF / PRODUCTION OFF`

## Goal

Close the source engineering prerequisites identified by S4.43 before asking Owner for the W1 synthetic controlled-write gate.

## Added

### 1. LAB Firestore driver candidate
`cotcomp-lab-firestore-driver-s444.js`

Defines exact mapping:
- CREATE_IF_ABSENT -> Firestore transaction.create
- UPSERT_DETERMINISTIC -> transaction.set merge
- UPSERT_VERSIONED_PROPOSAL -> transaction.create
- CREATE_IDEMPOTENT_SELECTION -> transaction.create
- PATCH -> transaction.update

It validates:
- exact LAB project/environment/tenant;
- server-only writer context;
- canonical storage allowlist;
- cross-tenant deny;
- exact-path synthetic cleanup journal.

Hard locks:
`EXECUTION_ENABLED=false`
`WRITE_CALLS_ALLOWED=false`
`DELETE_CALLS_ALLOWED=false`.

### 2. Audit adapter candidate
`cotcomp-audit-adapter-s444.js`

Creates deterministic, digest-only CotComp audit events without raw contact/token/captured-field payloads.

Hard locks:
`EXECUTION_ENABLED=false`
`WRITE_CALLS_ALLOWED=false`.

### 3. Saga / compensation contract
`cotcomp-saga-compensation-s444.js`

Freezes partial-success semantics and compensation rules.

A partially completed multi-group operation can never return complete success.

Compensation is allowed by contract only for:
- synthetic proof;
- explicit proofRunId;
- exact path journal;
- exact pre-delete digest match.

Execution remains off.

### 4. Controlled-write rollback harness
`cotcomp-controlled-write-rollback-harness-s444.js`

Source-only/in-memory proof covers:
- compile core group;
- first readback;
- same-payload retry without duplicate;
- conflicting-payload deny;
- audit preview;
- injected partial failure;
- compensation plan;
- reverse cleanup;
- final absence.

No Firestore/API/app-data side effect occurs.

### 5. W1 preflight
`cotcomp-w1-preflight-s444.js`

S4.44 can conclude source-ready for Owner W1 gate while keeping:
`effectiveWriteAllowed=false`.

## W1 scope frozen

When separately authorized, W1 may prove only:
- idempotency;
- quoteCase;
- caseAccess hash-only;
- CotComp event;
- exact readback;
- retry semantics;
- controlled cleanup;
- final absence.

W1 excludes:
- workflow Lead/Ops projection;
- notification provider delivery;
- proposal persistence;
- selection persistence;
- real data;
- production.

## W2+ remain closed

Workflow owner runtime proof is still required before W2 Lead/Ops projection.

## Closure

S4.44 closes only after full source QA passes. No source-only success authorizes writes by itself.
