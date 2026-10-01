# CotComp S4.52 — W3 proposal contract remediation

Date: 2026-10-01

## Objective

Resolve the technical source blockers found in S4.51 before any physical W3 write.

S4.52 is source-only. It does not read or mutate application data and does not authorize physical W3 execution.

## Remediations

### Canonical case link

Internal persisted Proposal now uses `caseId` as the canonical field.

A public/legacy `quoteCaseId` may be accepted only through an explicit normalization boundary:
- only `caseId` → accepted;
- only `quoteCaseId` → mapped to `caseId`;
- both equal → accepted;
- both different → fail closed with `CASE_LINK_CONFLICT`.

### Version identity

W3 now freezes:
- deterministic `proposalSeriesId`;
- version-specific deterministic `proposalId`;
- positive sequential `versionNumber`;
- `supersedesProposalId` required from version 2 onward;
- silent overwrite forbidden.

### Current validity

The W3 contract persists a timezone-qualified validity interval:
- `validFrom`;
- `validUntil`.

Current validity is derived deterministically from that interval and an explicit `asOf` instant.

An unpersisted arbitrary boolean is not sufficient for W3 persistence proof.

### Atomic supersession

For version 2+ the source contract requires one atomic unit that:
1. verifies the prior version is the current sequential predecessor;
2. marks the prior version `SUPERSEDED`;
3. sets prior `isCurrentVersion=false`;
4. links prior `supersededByProposalId`;
5. creates the new immutable current version;
6. creates the version request/idempotency record.

### Idempotency

Each proposal-version write has deterministic request identity and request digest.

Frozen behavior:
- new request → candidate mutation;
- same request + same payload → reuse / 0 writes;
- same request + changed payload → deny / 0 writes;
- duplicate version create → deny.

### Synthetic rollback model

The source-only W3 lifecycle models:
- create V1 + idempotency;
- exact V1 readback;
- V1 retry and conflict;
- atomic V2 creation + V1 supersession + V2 idempotency;
- exact readback of V1 superseded + V2 current;
- V2 retry and conflict;
- deterministic current-validity proof;
- cleanup of the exact four created documents;
- final absence.

Expected created documents across the synthetic lifecycle: 4.

Expected V2 atomic writes: 3.

## Integration

`cotcomp-persistence-plan.js` now exposes an explicit `buildVersionedProposalPlan()`.

`cotcomp-persistence-adapter-candidate.js` exposes `compileVersionedProposal()` as dry-run only.

The previous generic proposal planner is no longer mislabeled as a complete versioned writer.

## Hard boundaries

- execution = OFF;
- app-data reads = 0;
- app-data writes = 0;
- provider/rater calls = 0;
- real data = 0;
- production = untouched;
- physical W3 = OFF.

## Exit criterion

S4.52 closes only if:
- accumulated CotComp QA passes;
- the source-remediation verifier closes all S4.51 technical blockers;
- physical W3 remains hard-closed;
- the only remaining blocker is explicit Owner W3 authorization.

No physical W3 execution is authorized by S4.52.
