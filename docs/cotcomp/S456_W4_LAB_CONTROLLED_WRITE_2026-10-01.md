# CotComp S4.56 — W4 LAB synthetic selection controlled-write proof

Date: 2026-10-01

## Owner-authorized scope

Execute exactly one synthetic W4 proof in `ays-orbit-360-lab` under the S4.55 contract.

Sequence:
1. create synthetic QuoteCase + current Proposal + ComparisonSet;
2. exact setup readback;
3. atomically create immutable Selection + Selection idempotency + QuoteCase selection patch;
4. exact five-document readback;
5. same-request retry = 0 writes;
6. same request identity + changed payload = deny / 0 writes;
7. verify `USER_SELECTED_FOR_CONTINUATION / NOT_ISSUED / NOT_BOUND / NOT_CONFIRMED`;
8. exact cleanup of five proof-owned documents;
9. independent final absence.

## Expected mutation accounting

- setup = 3 writes;
- atomic selection = 3 writes;
- retry = 0;
- conflict = 0;
- cleanup = 5 deletes;
- total app-data mutations = 11;
- net persistent documents = 0.

## Hard boundaries

- synthetic only;
- no real data;
- no production;
- no provider/rater calls;
- no issuance;
- no binding;
- exact proof-owned paths only;
- cleanup mandatory;
- final absence mandatory.

S4.56 does not release general selection persistence or W5.
