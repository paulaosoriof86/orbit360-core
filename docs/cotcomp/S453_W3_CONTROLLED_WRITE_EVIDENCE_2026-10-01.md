# CotComp S4.53 / W3 · LAB synthetic proposal-versioning controlled-write evidence

**Date:** 2026-10-01  
**Status:** `W3 PHYSICAL PASS / V1 CREATE+READBACK+RETRY+CONFLICT PASS / V2 ATOMIC SUPERSESSION+READBACK+RETRY+CONFLICT PASS / CURRENT-VALIDITY PASS / CLEANUP PASS / INDEPENDENT FINAL ABSENCE PASS / PROVIDER-RATER 0 / REAL DATA 0 / PRODUCTION UNTOUCHED`

## Owner-authorized scope

S4.53 authorized exactly one LAB-only synthetic physical proposal-versioning proof under the S4.52 source contract.

Authorized:
- V1 create + readback;
- V1 same-request retry with no duplicate;
- V1 changed-payload conflict deny;
- atomic V2 create + V1 supersession;
- V1/V2 exact readback;
- V2 same-request retry with no duplicate;
- V2 changed-payload conflict deny;
- persisted current-validity verification;
- exact cleanup;
- final absence.

Explicitly excluded:
- insurer/provider/rater calls;
- real client/business data;
- selection persistence;
- production.

## First attempt stop

Run:
`36798346539 = FAILURE`

Cause:
the proof fixture attempted to add proof metadata to an `Object.freeze()` operation payload from the S4.52 contract.

The accumulated QA reached the S4.53 tests and stopped before credentials were prepared or the physical W3 step executed.

Therefore:
- W3 physical writes in failed run = 0;
- app-data mutation = 0.

Root-fix:
preserve the immutable S4.52 operation payloads and add proof-ownership metadata only to cloned Firestore idempotency documents.

## Successful execution

Branch:
`ays/cotcomp-s453-w3-controlled-write-20261001`

Successful proof HEAD:
`9590a54b47af91a0c3e5ee89fa4232fd667fbf3c`

Workflow:
`36798401751 = SUCCESS`

Job:
`110167016317 = SUCCESS`

Evidence artifact:
`11135081125`

Proof run:
`s453-36798401751`

## QA

Accumulated CotComp:
- 328 tests;
- 328 PASS;
- 0 FAIL.

Combined S4.52/S4.53 W3 proof suite:
- 14 tests;
- 14 PASS;
- 0 FAIL.

S4.53-specific:
- 3 tests;
- 3 PASS;
- 0 FAIL.

## Physical identities

Proposal series:
`pseries_bbbaef6f90ce87a899d53557`

V1 Proposal:
`proposal_d6d006ef654b7ffa521d5f5c`

V2 Proposal:
`proposal_3c9cec48a89fd9367cd67b9b`

V1 request:
`pverreq_4c81b3854fea57a9f2715b46`

V2 request:
`pverreq_ffc6c23abbf100c997f2b675`

## V1 physical proof

First commit:
- writes = 2;
- reused = false.

Created:
1. V1 Proposal;
2. V1 proposal-version idempotency record.

Exact readback:
`PASS`

Same-request retry:
- reused = true;
- writes = 0.

Changed-payload conflict:
- denied = true;
- writes = 0.

## V2 atomic supersession proof

First V2 atomic commit:
- writes = 3;
- reused = false.

Atomic effects:
1. V1 updated to `SUPERSEDED`;
2. V2 created as immutable current version;
3. V2 proposal-version idempotency record created.

Observed:
- V1 `validationState=SUPERSEDED`;
- V1 `isCurrentVersion=false`;
- V1 `supersededByProposalId=proposal_3c9cec48a89fd9367cd67b9b`;
- V2 `isCurrentVersion=true`;
- V2 `supersedesProposalId=proposal_d6d006ef654b7ffa521d5f5c`.

Exact four-document readback:
`PASS`

Same-request V2 retry:
- reused = true;
- writes = 0.

Changed-payload V2 conflict:
- denied = true;
- writes = 0.

## Current-validity / comparison truth

As-of:
`2026-10-15T12:00:00Z`

V2:
- current = true;
- reason = `CURRENT`;
- comparison eligible = true.

V1:
- comparison eligible = false.

Therefore only the validated current V2 remained eligible for comparison.

## Cleanup

Exact proof-owned documents deleted:
- V1 Proposal;
- V1 idempotency;
- V2 Proposal;
- V2 idempotency.

Cleanup deletes:
`4`

Final absence inside proof:
`PASS`

Independent second read:
- checked documents = 4;
- all absent = true;
- verification writes = 0.

## Write accounting

- V1 writes = 2;
- V1 retry writes = 0;
- V1 conflict writes = 0;
- V2 writes = 3;
- V2 retry writes = 0;
- V2 conflict writes = 0;
- cleanup deletes = 4;
- total app-data mutations = 9;
- net persistent documents = 0.

S4.53 is therefore a real authorized synthetic write block and must not be described as zero-write.

## Boundaries

- provider/rater calls = 0;
- real data = 0;
- selection persistence = false;
- production untouched.

## Release truth

Physically proven now:
- W1 synthetic core commit;
- W2 synthetic workflow projection;
- W3 synthetic proposal versioning.

Still not released:
- general proposal persistence;
- W4 selection persistence;
- real-data pilot;
- insurer/rater integration;
- production.

## Next safe stage

`W4 = SYNTHETIC_SELECTION`

Next work should begin source-only/readiness:
- explicit-user-choice persistence contract;
- exact linkage to current eligible Proposal + ComparisonSet;
- selection idempotency;
- immutable selection truth;
- preserve `NOT_ISSUED / NOT_BOUND / NOT_CONFIRMED`;
- retry/conflict/cleanup/final-absence model.

No physical W4 write should occur without a separate explicit Owner authorization.
