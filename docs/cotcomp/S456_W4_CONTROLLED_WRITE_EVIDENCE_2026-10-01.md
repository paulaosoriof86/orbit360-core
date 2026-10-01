# CotComp S4.56 / W4 · LAB synthetic selection controlled-write evidence

**Date:** 2026-10-01  
**Status:** `W4 PHYSICAL PASS / SYNTHETIC SETUP PASS / ATOMIC SELECTION PASS / RETRY 0 WRITES / CONFLICT DENY 0 WRITES / NON-BINDING TRUTH PASS / CLEANUP 5 / INDEPENDENT FINAL ABSENCE PASS / REAL DATA 0 / PRODUCTION UNTOUCHED`

## Authorized scope

Owner authorized one LAB-only synthetic W4 selection proof under the S4.55 contract.

## Successful execution

Branch:
`ays/cotcomp-s456-w4-controlled-write-20261001`

Proof HEAD:
`dc2402a2b8ca5da81fe73eced8987fccb4bf3830`

Workflow:
`36805598062 = SUCCESS`

Job:
`110189114605 = SUCCESS`

Evidence artifact:
`11137706513`

Artifact SHA-256:
`b0069aa6b390490adac9165153cbaee500e942442b0b354bb15fc78545afb7b1`

Proof run:
`s456-36805598062`

## QA

Accumulated CotComp:
- 332 tests;
- 332 PASS;
- 0 FAIL.

Combined S4.55/S4.56 W4 proof suite:
- 13 tests;
- 13 PASS;
- 0 FAIL.

## Physical identities

QuoteCase:
`qcase_s456-36805598062`

Proposal:
`proposal_s456-36805598062`

ComparisonSet:
`cmp_b983b2392891fdd83a6eb3ab`

Selection:
`sel_89fde0b4fdd5bae3c0874ce6`

Selection request:
`selreq_fb253093d73bba8724a82f38`

## Synthetic setup

Created:
1. QuoteCase;
2. current validated Proposal;
3. ComparisonSet containing the Proposal.

Setup writes:
`3`

Exact setup readback:
`PASS`

## Atomic selection

One transaction:
1. created immutable Selection;
2. created Selection idempotency record;
3. patched QuoteCase with selectedProposalId, selectedComparisonSetId, selectionId and `USER_SELECTED`.

Selection writes:
`3`

Exact five-document readback:
`PASS`

## Retry

Same selection request + same payload:
- reused = true;
- writes = 0;
- state unchanged = true.

## Conflict

Same request identity + changed payload:
- denied = true;
- writes = 0;
- state unchanged = true.

## Truth lock

Persisted Selection:
- status = `USER_SELECTED_FOR_CONTINUATION`;
- issuanceState = `NOT_ISSUED`;
- bindingState = `NOT_BOUND`;
- coverageState = `NOT_CONFIRMED`.

QuoteCase:
- status = `USER_SELECTED`;
- selected Proposal, ComparisonSet and Selection ids linked exactly.

No issuance or binding was executed.

## Cleanup

Exact proof-owned documents deleted:
- QuoteCase;
- Proposal;
- ComparisonSet;
- Selection;
- Selection idempotency.

Cleanup deletes:
`5`

Final absence inside proof:
`PASS`

Independent second verification:
- documents checked = 5;
- all absent = true;
- writes = 0.

## Mutation accounting

- setup writes = 3;
- atomic selection writes = 3;
- retry writes = 0;
- conflict writes = 0;
- cleanup deletes = 5;
- total app-data mutations = 11;
- net persistent documents = 0.

## Boundaries

- real data = 0;
- production untouched;
- provider/rater calls = 0;
- issuance executed = false;
- binding executed = false.

## Release truth

Physically proven:
- W1 synthetic core;
- W2 synthetic workflow projection;
- W3 synthetic proposal versioning;
- W4 synthetic explicit-user selection.

Still not released:
- general persistence;
- real-data pilot;
- production;
- insurer/rater integrations by inference;
- issuance/binding/payment.

## Next stage

`W5 = REAL_DATA_PILOT`

W5 is a separate future gate. It must not start from W4 authorization by inference. It requires its own readiness definition, real-data minimization, rollback/containment, user/record scope, observability, legal/privacy review boundaries, and explicit Owner authorization.
