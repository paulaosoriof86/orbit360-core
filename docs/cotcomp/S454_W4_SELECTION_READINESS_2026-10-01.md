# CotComp S4.54 — W4 synthetic selection source-only readiness

Date: 2026-10-01

## Objective

Open W4 `SYNTHETIC_SELECTION` only at source/readiness level after physical W3 PASS.

No application-data reads or writes are permitted in S4.54.

## Existing strengths confirmed

Current source already freezes:
- explicit user choice is mandatory;
- selection means `USER_SELECTED_FOR_CONTINUATION`;
- issuance remains `NOT_ISSUED`;
- binding remains `NOT_BOUND`;
- coverage remains `NOT_CONFIRMED`;
- selection path lives under the CotComp tenant namespace;
- current adapter remains dry-run only.

## Material gaps found

The current selection persistence plan does not yet prove before persistence that:
- the chosen Proposal belongs to the stated ComparisonSet;
- Proposal, ComparisonSet and QuoteCase refer to the same case;
- the chosen Proposal is still VALIDATED + CURRENT and is the current version;
- a stable selection request identity has a persisted request digest;
- same request + same payload reuses with 0 writes;
- same request + changed payload is denied;
- selection creation + quoteCase selectedProposal/status patch occur atomically;
- the dry-run adapter represents the full multi-document atomic unit;
- exact rollback and final-absence journal is frozen.

## Blockers

- `SELECTION_COMPARISONSET_MEMBERSHIP_REQUIRED`
- `SELECTION_PROPOSAL_CASE_LINK_REQUIRED`
- `SELECTION_CURRENT_ELIGIBLE_PROPOSAL_REQUIRED`
- `SELECTION_IDEMPOTENCY_CONTRACT_REQUIRED`
- `SELECTION_ATOMIC_CASE_PATCH_REQUIRED`
- `SELECTION_MULTI_DOCUMENT_DRYRUN_CONTRACT_REQUIRED`
- `W4_PHYSICAL_ROLLBACK_JOURNAL_REQUIRED`
- `OWNER_W4_AUTHORIZATION_REQUIRED`

## Boundaries

- execution = OFF;
- app-data reads = 0;
- app-data writes = 0;
- real data = 0;
- production = untouched.

## Next safe block

Remediate and freeze these W4 contracts source-only. Physical W4 must remain closed until all technical blockers are closed and Owner separately authorizes one LAB-only synthetic selection proof.
