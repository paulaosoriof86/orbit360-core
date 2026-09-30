# CotComp S4.40 LAB runtime deployment + readback evidence

**Date:** 2026-09-30  
**Status:** `FOUR CALLABLES DEPLOYED TO LAB / INVENTORY READBACK PASS / SYNTHETIC-ONLY SOURCE GATE / PERSISTENCE OFF / APP DATA WRITES 0 / REAL DATA 0 / PRODUCTION UNTOUCHED / CALLABLE INVOCATION NOT YET VERIFIED`

## Owner authorization

Owner authorized applying the S4.38 runtime export and deploying **only** to:
`ays-orbit-360-lab`

for synthetic/readback proof, with:
- persistence off;
- writes off;
- no real data;
- no production.

## Pre-deploy guards

The deployment workflow failed closed twice before any deployment:

1. Run `36763474864` detected that the isolated deployment branch still carried the older Leads/Ops owner blob. Deployment did not run.
2. The branch was realigned to canonical S4.20 owner blob `73e09a4404cb4298dc34c9c38e26ad1f960d3170`.
3. Run `36763729648` then passed the immutable-source guard but source QA found two stale transport-test fixtures that did not include the already-frozen public case-access requirement. Deployment did not run.
4. Tests were aligned to the existing S4.10 case-access contract; no transport/security production logic was weakened.

## Deploy run

Run:
`36763893708`

Deployed source:
`17d599e884d5b834b73b9499d8cef177575d56f9`

Source tree:
`e645aaed3d012174f1e6b1a9b083b86e03f8b60d`

Before deploy:
- immutable intent guard PASS;
- npm source QA PASS;
- exact four-callable export/no-persistence-import guard PASS;
- LAB credential project binding PASS.

Firebase successfully created all four Node.js 22 / GCFv2 functions in `us-central1`:
- cotcompValidateDraft
- cotcompSubmitHandoff
- cotcompFetchComparableProposals
- cotcompSelectProposal

The Firebase CLI then returned non-zero **after successful function creation** because Artifact Registry had no cleanup policy configured. No cleanup policy was changed because that was not part of the Owner authorization.

Therefore the deploy workflow terminal conclusion is not recorded as PASS; the function creation itself is evidenced as successful.

## Source artifact

Artifact:
`11119533069`

Digest:
`sha256:9d50a9b8fca53a9971811f5cae663109e602ec028129c6dede8f5adcc539e838`

Backend source digest:
`ea6941bfba5e53347a12713a978b7e35c3077a7854590bc1c520c4b50e628802`

## Independent readback

Readback workflow:
`36764338132`

Conclusion:
`SUCCESS`

Readback artifact:
`11120545801`

Digest:
`sha256:8f0673b0afa05c014c43b99c63d99a7055d87b1b0a65ef0e863d6677736e9e67`

Observed inventory is exact and all four functions are:
- state: ACTIVE;
- region: us-central1;
- platform: gcfv2;
- runtime: nodejs22.

The S4.39 receipt contract validated successfully.

## Runtime security truth

The exact deployed source SHA was re-read and verified to contain:
- App Check on all four callables;
- replay-token consumption on SubmitHandoff and SelectProposal only;
- explicit synthetic-only gate;
- no Firebase Admin / Firestore / persistence writer / Leads-Ops data dependency in the CotComp runtime entry.

This is source-to-deployed-SHA verification, not a live successful callable invocation.

## Data truth

Observed/declared for this deployment/readback:
- `persistenceEnabled=false`
- `appDataWritesExecuted=0`
- `realDataUsed=false`
- `productionTouched=false`

Cloud Functions resources were created in LAB as authorized.

## Remaining boundaries

Not yet claimed:
- successful live callable invocation with valid App Check;
- persistence;
- QuoteCase/Proposal writes;
- real customer/prospect data;
- production release.

Open operational item:
Artifact Registry cleanup policy is not configured for us-central1; Firebase warned that container images may accumulate and cause a small monthly charge.
