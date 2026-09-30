# CotComp S4.21 Persistence Adapter Candidate QA

**Date:** 2026-09-29  
**Status:** `SOURCE-ONLY / STATIC CONTRACT QA PASS / DRY-RUN ONLY / EXECUTION OFF / WRITES OFF / NO DEPLOY`

## Context

S4.20 merged the minimal `cotcompRef` preservation patch into the canonical recovery source.

The workflow-schema blocker is therefore no longer “source schema absent”. It is now:

`WORKFLOW_COTCOMP_SCHEMA_MERGED_SOURCE_NOT_DEPLOYED`

The deployed/runtime state remains unchanged.

## Candidate

`functions/cotcomp-persistence-adapter-candidate.js`

Purpose:
compile the S4.16 persistence plan into deterministic dry-run commands without importing Firestore and without executing writes.

## QA

Connector-side parse/static contract QA:

`16/16 PASS`

Verified:
- adapter JS parses;
- adapter test JS parses;
- DRY_RUN_ONLY=true;
- EXECUTION_ENABLED=false;
- WRITES_ENABLED=false;
- Firestore dependency absent from require/import lines;
- execution method fails closed;
- S4.16 blocker reconciled to merged-source/not-deployed truth;
- workflow projection flagged undeployed;
- obsolete source-schema-absent blocker removed;
- payload summaries use SHA-256 digest;
- raw payload is not emitted in command summaries;
- Selection truth delegates to canonical planner;
- Proposal eligibility delegates to canonical planner;
- initial handoff delegates to the deterministic S4.16 plan;
- package QA scripts include S4.21.

## Runtime boundary

No:
- Firebase/Firestore import;
- transaction;
- QuoteCase write;
- Leads/Ops write;
- Proposal/Selection write;
- runtime export;
- deploy;
- production traffic.

## Next gate

Design a server-side persistence writer interface behind dependency injection while preserving:
- `EXECUTION_ENABLED=false`;
- `WRITES_ENABLED=false`;
- explicit LAB-only gate;
- retention policy unresolved;
- case-access persistence unresolved;
- deploy/runtime still separately authorized.
