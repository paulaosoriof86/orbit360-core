# CotComp S4.12 Runtime / Export Ticket

**Date:** 2026-09-29  
**Status:** SOURCE-ONLY / LAB TARGET FROZEN / EXPORT OFF / DEPLOY OFF / WRITES OFF

## Objective

Prepare the exact runtime/export gate without modifying deployed entrypoints.

## Target

- Project: `ays-orbit-360-lab`
- Environment: `LAB`
- Region: `us-central1`
- Production project list in this ticket: empty

This ticket cannot authorize production.

## Candidate callable exports

- `cotcompValidateDraft`
- `cotcompSubmitHandoff`
- `cotcompFetchComparableProposals`
- `cotcompSelectProposal`

Every candidate enforces App Check. Proposal read/selection also requires case-level access. Mutation-sensitive candidates keep replay protection.

## Case-access contract

S4.12 adds a source-only opaque case-access contract:
- the browser may hold an opaque case token;
- server-side storage, when later authorized, stores only the token hash;
- raw token persistence is forbidden;
- token is bound to one QuoteCase;
- expired/revoked/mismatched tokens fail closed.

No persistence implementation is added in this cut.

## Hard gates

Even if all logical preconditions are satisfied:
- `RUNTIME_EXPORT_ALLOWED=false`
- `DEPLOY_ALLOWED=false`
- `WRITES_ALLOWED=false`
- `effectiveExportAllowed=false`

The future bootstrap diff is described only; it is not applied.

## Conditions before a later staging export

1. explicit owner runtime authorization;
2. observable source QA PASS;
3. case-access contract frozen;
4. persistence still disabled;
5. exact LAB project verification;
6. no deploy requested by this ticket.

## Next step

Run/record S4.12 source QA for the export-ticket + case-access modules. If PASS, produce a separate staging-export candidate branch/diff for owner authorization. Do not deploy from this ticket.
