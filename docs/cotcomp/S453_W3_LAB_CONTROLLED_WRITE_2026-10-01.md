# CotComp S4.53 — W3 LAB synthetic proposal-versioning controlled-write proof

Date: 2026-10-01

## Owner-authorized scope

Execute only in `ays-orbit-360-lab` one synthetic physical W3 proof under the S4.52 contract:

- create V1 proposal + version idempotency;
- exact V1 readback;
- same-request retry with 0 writes;
- changed-payload conflict deny with 0 writes;
- atomically supersede V1 + create V2 + V2 idempotency;
- exact V1/V2 readback;
- V2 same-request retry with 0 writes;
- V2 changed-payload conflict deny with 0 writes;
- verify persisted validity/current comparison eligibility;
- exact cleanup;
- independent final absence.

## Expected physical accounting

Forward mutations:
- V1 atomic commit = 2 writes;
- V1 retry = 0;
- V1 conflict = 0;
- V2 atomic supersession commit = 3 writes;
- V2 retry = 0;
- V2 conflict = 0.

Cleanup:
- 4 exact deletes.

Expected total app-data mutations:
`9`

Expected net persistent documents:
`0`

## Hard boundaries

- synthetic only;
- no provider/rater calls;
- no real client/business data;
- no selection persistence;
- no production;
- exact run-owned paths only;
- cleanup mandatory;
- final absence mandatory.

S4.53 does not release general proposal persistence or any later stage.
