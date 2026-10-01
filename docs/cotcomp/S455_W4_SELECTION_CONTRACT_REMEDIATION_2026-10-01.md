# CotComp S4.55 — W4 selection contract remediation

Date: 2026-10-01

## Objective

Close the technical W4 blockers frozen by S4.54 without executing any application-data read or write.

## Frozen W4 selection contract

The physical W4 candidate must require all of the following before persistence:

- explicit user choice;
- QuoteCase, ComparisonSet and Proposal belong to the same tenant/case;
- chosen Proposal is a member of the ComparisonSet;
- chosen Proposal is the current version;
- chosen Proposal is VALIDATED and currently valid at an explicit as-of instant;
- ComparisonSet preserves the no-hidden-ranking truth;
- QuoteCase is not already selected to a different Proposal.

## Request-bound identity and idempotency

Selection identity is now bound to:
- tenant;
- case;
- selection request identity.

It is not derived from the chosen Proposal.

Therefore changing Proposal while reusing the same selection request cannot silently create a second selection identity.

The contract freezes:
- same request + same payload → REUSE / 0 writes;
- same request + changed payload → DENY / 0 writes.

The raw client selection request key is not persisted in the Selection document.

## Atomic selection mutation

One future physical selection transaction must atomically:
1. create immutable Selection;
2. create selection idempotency record;
3. patch QuoteCase with selectedProposalId, selectedComparisonSetId, selectionId and USER_SELECTED status.

The transaction requires an exact prerequisite read-set:
- QuoteCase;
- ComparisonSet;
- current Proposal.

## Truth lock

Selection remains only a continuation choice:

- status = USER_SELECTED_FOR_CONTINUATION;
- issuanceState = NOT_ISSUED;
- bindingState = NOT_BOUND;
- coverageState = NOT_CONFIRMED.

Selection must never be represented as issuance, binding or confirmed coverage.

## Synthetic physical proof model

For a future W4 physical proof, the source model freezes:

Synthetic setup:
- QuoteCase create;
- current validated Proposal create;
- ComparisonSet create.

Setup writes:
`3`

Selection transaction:
- Selection create;
- Selection idempotency create;
- QuoteCase patch.

Atomic selection writes:
`3`

Retry:
`0 writes`

Conflict:
`0 writes`

Cleanup:
- delete exact five synthetic proof-owned documents.

Cleanup deletes:
`5`

Expected total app-data mutations:
`11`

Expected net persistent documents:
`0`

Final absence:
required.

## Source integration

`cotcomp-persistence-plan.js` now exposes `buildAtomicSelectionPlan()`.

`cotcomp-persistence-adapter-candidate.js` now exposes `compileAtomicSelection()` as dry-run only.

The older selection preview remains non-executable; the W4 physical contract must use the new atomic selection path.

## Hard boundaries

- execution OFF;
- app-data reads 0;
- app-data writes 0;
- real data 0;
- production untouched;
- physical W4 OFF.

## Exit

S4.55 closes only if accumulated QA plus S4.55 tests pass and the only remaining blocker is:

`OWNER_W4_AUTHORIZATION_REQUIRED`
