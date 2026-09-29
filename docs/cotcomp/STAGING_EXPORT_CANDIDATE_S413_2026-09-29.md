# CotComp S4.13 Staging Export Candidate

**Date:** 2026-09-29  
**Status:** SOURCE-ONLY / EXPORT SHAPE FROZEN / DEPENDENCIES FAIL-CLOSED / NO DEPLOY

## Objective

Prepare the exact staging export shape without modifying `bootstrap.js` or `index.js`.

## Candidate exports

Exactly four callable names are frozen:
- `cotcompValidateDraft`
- `cotcompSubmitHandoff`
- `cotcompFetchComparableProposals`
- `cotcompSelectProposal`

## Fail-closed dependency adapters

The candidate introduces placeholders for:
- `verifyCaseAccess`
- `loadProposals`

Both intentionally throw and `READY=false`.

This prevents an accidental export from exposing proposal reads or selections before the read-only adapters are implemented and tested.

## Hard locks

- `RUNTIME_EXPORT_ALLOWED=false`
- `DEPLOY_ALLOWED=false`
- `WRITES_ALLOWED=false`
- staging dependency `READY=false`
- persistence disabled

## Future bootstrap diff

No bootstrap diff is applied in S4.13.

Once:
1. read-only case-access adapter exists,
2. read-only proposal loader exists,
3. source QA passes,
4. owner explicitly authorizes LAB runtime,

the future isolated bootstrap diff may import a runtime entry module and merge the four exports.

That later diff must still not enable QuoteCase/Lead/Ops writes, insurer provider calls, rating, issuance or payment.

## Next gate

Implement **read-only staging dependency adapters** against verified Orbit360 structures, with no write path. Then contract-test them before any export.
