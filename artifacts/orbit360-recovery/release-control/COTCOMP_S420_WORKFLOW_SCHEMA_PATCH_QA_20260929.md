# CotComp S4.20 · Leads/Ops correlation patch · Post-merge QA

**Date:** 2026-09-29  
**Status:** `MERGED TO CANONICAL RECOVERY SOURCE / POST-MERGE STATIC QA 15/15 PASS / NO DEPLOY / NO WRITES`

## Authorization

Owner explicitly authorized applying/merging the CotComp Leads/Ops S4.19r1 patch into:
`recovery/fase-a-clean-20260831`

with post-merge QA and **without deploy or writes**.

## Drift control

Before the authorized merge:
- canonical recovery HEAD: `88d8e53c035180e344651d46815d3368cbbeb9f1`;
- effective owner blob: `d0a1e116186bba860d34ec540e8abba81830b553`;
- owner blob matched the reviewed S4.18/S4.19 source.

A fresh S4.20 candidate was rebuilt from that exact HEAD.

## Merge

PR:
`#152 · CotComp S4.20 · Apply Leads/Ops correlation patch`

Merge method:
`squash`

Canonical merge commit:
`832a39305150faa72f25020e1b86a269e58aa3e2`

Post-merge owner blob:
`functions/ops-leads-domain.js @ 73e09a4404cb4298dc34c9c38e26ad1f960d3170`

## Effective code delta

The production-source owner now preserves one validated nested object:
`cotcompRef`

Fields:
- schemaVersion
- role
- caseId
- journeyId
- correlationId
- quoteCasePath
- selectedProposalId
- intakeStatus

Rules:
- caseId + journeyId + correlationId required together;
- partial references fail closed;
- create business/management preserves cotcompRef;
- controlled update business/management preserves cotcompRef.

No direct CotComp collection path is introduced into Leads/Ops.

## Post-merge QA

Connector-side parse/static invariant QA:

`15/15 PASS`

Verified:
- merged owner JS parses;
- merged test JS parses;
- CotComp sanitizer present;
- required correlation triple enforced;
- exact create/update preservation hooks;
- no direct CotComp store path added;
- authorize segment unchanged;
- legacyRef unchanged;
- canonicalRef unchanged;
- domainRef unchanged;
- advisor scope guard preserved;
- notification outbox preserved;
- existing callable export preserved;
- no new CotComp runtime export.

Merged diff from the pre-patch canonical HEAD:
- 1 squash commit;
- 3 files;
- owner source +35/-2;
- test file added;
- isolated QA workflow added.

## Runtime truth

Still NOT authorized / NOT executed:
- no Firebase deploy;
- no callable runtime export;
- no QuoteCase/Proposal Firestore writes;
- no workflow data writes;
- no provider/rater;
- no issuance/payment;
- no production traffic.

No GitHub Actions PASS is claimed; no workflow run was observed for the merge commit.

## Next gate

The workflow schema blocker is now resolved **in canonical source only**, not deployed runtime.

Next technical work returns to the source-only CotComp persistence/runtime chain:
1. re-read S4.16/S4.17 blockers against the new canonical source;
2. remove only the resolved workflow-schema blocker in the planning layer;
3. keep retention and case-access persistence unresolved;
4. prepare S4.21 persistence-adapter candidate with Firestore execution still disabled;
5. no deploy/writes without a separate authorization.
