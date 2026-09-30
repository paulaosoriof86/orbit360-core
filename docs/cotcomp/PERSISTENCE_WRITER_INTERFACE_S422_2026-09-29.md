# CotComp Server-side Persistence Writer Interface · S4.22 / F8-G4

**Date:** 2026-09-29  
**Status:** SOURCE-ONLY / DEPENDENCY-INJECTED INTERFACE / EXECUTION OFF / WRITES OFF / NO DEPLOY

## Objective

Define the server-side writer boundary that will eventually execute the S4.21 dry-run persistence commands, without binding to Firestore or invoking any dependency today.

## Separation of responsibilities

S4.21:
- compiles the canonical persistence plan;
- exposes dry-run paths/digests/blockers;
- never executes.

S4.22:
- defines the future server-side dependency contract;
- exposes preview methods;
- guarantees execution fails before injected dependencies are called.

## Required injected dependencies

### storage
- `read({path})`
- `runAtomicGroup({group,commands,context})`
- `patch({path,patch,context})`

### clock
- `nowIso()`

### audit
- `record({type,caseId,correlationId,digest,status})`

No Firebase/Firestore SDK is imported by S4.22.

## Forbidden dependencies / actions

The interface explicitly forbids:
- browser Firestore SDK;
- direct public workflow writes;
- provider/rater calls;
- issuance/payment.

## Hard locks

- `SERVER_SIDE_ONLY=true`
- `EXECUTION_ENABLED=false`
- `WRITES_ENABLED=false`
- `DEPENDENCY_CALLS_ALLOWED=false`

Every execution method fails with:

`COTCOMP_WRITER_EXECUTION_DISABLED`

before any injected dependency is called.

## Preview behavior

The writer may preview:
- initial handoff;
- proposal persistence;
- explicit selection persistence.

These previews delegate to S4.21 and therefore remain:
- dry-run only;
- no-ranking;
- non-binding;
- workflow projection blocked until the canonical S4.20 source is separately deployed.

## Why dependency injection

The future writer must be testable without network or Firestore side effects.

A later authorized implementation may provide a LAB storage adapter, but:
- it must conform to this interface;
- it must remain behind the write gate;
- it must not be imported into the public browser;
- it must not silently enable execution.

## Remaining blockers

Before any writer implementation can execute:
1. canonical S4.20 Leads/Ops source deployed to LAB through its own gate;
2. retention policy frozen;
3. case-access persistence approved;
4. negative security tests;
5. exact LAB target verified;
6. explicit owner write authorization;
7. separate deploy authorization.

## Next block

S4.23 should define a **LAB storage dependency adapter candidate** that implements the required interface in source only, but keeps:
- adapter READY=false;
- EXECUTION_ENABLED=false;
- WRITES_ENABLED=false;
- no import from runtime entrypoints.

No deployment or data mutation is authorized by S4.22.
