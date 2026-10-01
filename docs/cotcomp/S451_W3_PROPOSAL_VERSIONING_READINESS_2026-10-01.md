# CotComp S4.51 — W3 proposal-versioning source-only readiness

Date: 2026-10-01

## Purpose

Prepare the next frozen stage, W3 `SYNTHETIC_PROPOSAL_VERSIONING`, without executing application-data reads or writes.

S4.51 is a forensic alignment gate. It audits the already-frozen proposal/comparison/persistence contracts before any physical W3 proof can be authorized.

## Material source findings

### 1. Case-link field mismatch

The persisted runtime proposal contract builds:

`caseId`

The comparison proposal contract currently requires:

`quoteCaseId`

A Proposal created through the current runtime data contract therefore does not pass the current comparison shape unchanged.

This is a real contract mismatch and must be resolved before physical W3.

### 2. Versioning label without complete version semantics

`buildProposalPlan()` currently labels the operation:

`UPSERT_VERSIONED_PROPOSAL`

but the current write plan does not yet freeze:
- version number/identity semantics;
- immutable version rule;
- unique current-version resolution;
- same-request idempotency;
- atomic supersession behavior.

The runtime contract does contain `supersedesProposalId` and the validation states `SUPERSEDED` / `EXPIRED`, but the persistence plan does not yet make those transitions atomic.

### 3. Current-validity gap

Comparison eligibility requires:

`VALIDATED + currentValidityConfirmed`

Today `currentValidityConfirmed` is supplied as external evaluation context.

The persisted Proposal has a generic `validity` object, but there is no frozen persisted/deterministically-derived current-validity contract yet.

Physical W3 cannot rely on an unpersisted boolean.

## Source-only candidate direction

The candidate direction preserves:
- persisted canonical case link = `caseId`;
- public API may continue using `quoteCaseId`, but only through an explicit mapping boundary;
- proposalId is version-specific;
- version 2+ links to prior version through `supersedesProposalId`;
- silent overwrite forbidden;
- one uniquely resolvable current proposal version;
- same request + same payload = 0 writes;
- same request + changed payload = deny;
- exact rollback journal + cleanup + final absence required.

This direction is not yet promoted as the final physical persistence contract.

## W3 blockers

- `PROPOSAL_CASE_LINK_FIELD_MISMATCH`
- `PROPOSAL_VERSION_IDENTITY_SEMANTICS_REQUIRED`
- `PROPOSAL_CURRENT_VALIDITY_PERSISTENCE_CONTRACT_REQUIRED`
- `PROPOSAL_IDEMPOTENT_WRITE_CONTRACT_REQUIRED`
- `PROPOSAL_SUPERSESSION_ATOMICITY_CONTRACT_REQUIRED`
- `W3_PHYSICAL_ROLLBACK_JOURNAL_REQUIRED`
- `OWNER_W3_AUTHORIZATION_REQUIRED`

## Boundaries

- execution = OFF;
- app-data reads = 0;
- app-data writes = 0;
- provider/rater calls = 0;
- real data = 0;
- production = untouched.

## Exit

S4.51 closes when the source audit and QA pass and the blockers are frozen.

Physical W3 remains closed. The next safe block is to resolve the proposal contract mismatch and freeze the version/current-validity/idempotency/supersession contract source-only before requesting Owner authorization for a physical W3 proof.
