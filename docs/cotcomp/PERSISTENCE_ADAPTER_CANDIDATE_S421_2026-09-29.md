# CotComp Persistence Adapter Candidate · S4.21 / F8-G4

**Date:** 2026-09-29  
**Status:** SOURCE-ONLY / DRY-RUN ADAPTER / NO FIRESTORE IMPORT / EXECUTION OFF / WRITES OFF

## Context

S4.20 merged the minimal `cotcompRef` preservation patch into the canonical recovery source for Leads/Ops.

That resolves the schema gap **in canonical source**, but not in deployed runtime.

S4.21 therefore advances only the source-side persistence adapter and keeps workflow projection commands blocked until the canonical source is separately deployed under a later release gate.

## Adapter role

The candidate compiles S4.16 persistence plans into deterministic dry-run commands.

It does not:
- import firebase-admin / Firestore;
- open a transaction;
- write QuoteCase;
- write Leads/Ops;
- create case-access records;
- write Proposal/Selection;
- deploy.

## Dry-run summary

The adapter exposes:
- phase;
- atomic group;
- operation type;
- entity;
- physical path;
- payload digest;
- blocked state/reason.

Raw payloads are intentionally not exposed in command summaries.

## Workflow projection truth

Lead/Ops projection is now marked:

`WORKFLOW_COTCOMP_SCHEMA_MERGED_SOURCE_NOT_DEPLOYED`

This replaces the older blocker stating that the source schema itself was absent.

## Hard locks

- `DRY_RUN_ONLY=true`
- `EXECUTION_ENABLED=false`
- `WRITES_ENABLED=false`
- `FIRESTORE_IMPORTED=false`

Calling the execution method throws:
`COTCOMP_PERSISTENCE_EXECUTION_DISABLED`.

## Remaining gates before any writer

1. canonical Leads/Ops source deployed to authorized LAB runtime;
2. retention policy approved;
3. case-access persistence approved;
4. exact LAB project verified;
5. negative security tests;
6. explicit owner write authorization;
7. separate deploy authorization.

## Next block

Run focused S4.21 source QA and freeze the dry-run command contract.

After PASS, design the server-side writer interface behind dependency injection, still with execution disabled.
