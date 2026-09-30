# CotComp S4.19r1 · Leads/Ops Owner Patch Candidate QA

**Date:** 2026-09-29  
**Status:** `ISOLATED CANDIDATE / STATIC SOURCE QA PASS / DRAFT PR / NO MERGE / NO DEPLOY / NO WRITES`

## Authorization

Owner explicitly authorized creation/modification of an isolated Gravicentra candidate branch for the CotComp Leads/Ops patch, with **no deploy and no writes**.

## Canonical base refresh

The first S4.19 candidate was cut from an older recovery HEAD and was superseded.

Refreshed candidate:
`ays/cotcomp-workflow-schema-s419r1-20260929`

Canonical base at refresh:
`recovery/fase-a-clean-20260831 @ 7820cd9990f2f1693568c4e35f5c367872730d52`

The effective owner blob remained unchanged:
`functions/ops-leads-domain.js @ d0a1e116186bba860d34ec540e8abba81830b553`

Superseded PR:
`#150` closed, not merged.

Current draft PR:
`#151` open/draft/mergeable at review time.

## Production-source delta

Only one effective owner source file is modified:
`functions/ops-leads-domain.js`

Source diff:
- additions: 35
- deletions: 2

Supporting candidate-only files:
- `functions/cotcomp-workflow-owner-patch.test.js`
- `.github/workflows/cotcomp-workflow-s419-source-qa.yml`

## Exact owner change

Adds one nested validated object:
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
- caseId + journeyId + correlationId are required together;
- partial references fail closed;
- new business/management records preserve the object;
- controlled business/management updates preserve the object.

## Preserved owner behavior

Verified unchanged:
- authorization function segment;
- legacyRef;
- canonicalRef;
- domainRef;
- advisor scope guard;
- existing notification outbox;
- existing callable export name.

No direct CotComp collection path was added to the Leads/Ops owner.

## Observable QA

Connector-side V8 parse/static contract verification:

`15/15 PASS`

Checks include:
- candidate JS parses;
- test JS parses;
- sanitizer exists;
- required correlation triple enforced;
- create/update preservation hooks exact count;
- no direct CotComp store paths;
- auth segment byte-identical;
- storage/reference helper functions byte-identical;
- advisor guard preserved;
- notification outbox preserved;
- callable export preserved;
- no new runtime export.

GitHub Actions workflow source exists, but no successful workflow run is observed through the connector. Therefore **no GitHub Actions PASS is claimed**.

## Hard boundary

This candidate:
- is not merged;
- is not deployed;
- does not create Firestore CotComp collections;
- does not enable runtime;
- does not enable writes;
- does not modify production data.

## Next gate

The next operation would mutate the canonical recovery source by merging/applying this owner patch.

That requires a new explicit owner authorization.

Recommended next action:

`OWNER MERGE/AFFECTIVE-SOURCE AUTHORIZATION → RE-READ CANONICAL HEAD/BLOB → FAIL CLOSED ON DRIFT → MERGE/APPLY PATCH → SOURCE QA → STILL NO DEPLOY`
