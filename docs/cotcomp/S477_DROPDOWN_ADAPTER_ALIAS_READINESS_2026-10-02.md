# CotComp · S4.77 · Dropdown adapter + alias/exception readiness

**Fecha:** 2026-10-02  
**Estado inicial:** `SOURCE-ONLY / ADAPTER CONTRACT / NO PUBLIC RELEASE`

## Objective

Turn the S4.76 authoritative normalized catalog into an explicit UI/data adapter contract for the future GT Auto/Moto intake.

This is the architectural answer to the earlier intake problem where Marca and Línea/Modelo were free text.

## Adapter contract

Brand control:
- searchable-select;
- options come from catalog entries;
- may be restricted by allowed SAT vehicle types supplied by the journey/product rule.

Model control:
- searchable-select;
- cannot be queried without selected brand;
- options are dependent on brand;
- optional type scope;
- result carries canonical ids, labels, catalog version and digest.

Year:
- separate required selector;
- not inferred from the model label;
- catalog presence does not hard-validate model-year existence.

Fallback:
`OTHER_REQUIRES_REVIEW`.

## Alias safety

Aliases are never activated by string similarity alone.

Only registry rows with:
- `status=APPROVED`;
- explicit mapped canonical model ids;
- approval commitment;
- provenance;
may appear as selectable aliases.

Unapproved candidates remain review-only.

## Current evidence-gap candidates

From the real quote corpus against SAT:
- Mazda CX-5: 8 SAT prefix candidates; no silent rollup;
- Honda CRV: 12 CR-V compact-prefix candidates; punctuation/trim reconciliation required;
- Bajaj Pulsar NS 400Z: 0 SAT prefix candidates; local/provider evidence required before adding.

Toyota Corolla and Toyota Yaris have exact SAT identities and do not require aliases merely for base-name recognition.

## Public-release blockers

1. `GT_AUTO_MOTO_ALLOWED_TYPE_SCOPE_REQUIRED`
2. `REVIEWED_ALIAS_DECISIONS_REQUIRED`
3. `CATALOG_DELIVERY_SURFACE_REQUIRED`

These blockers are independent of the W5 Corolla 2006 documentary Proposal blocker.

## Boundaries

- no app-data read/write;
- no deployment;
- no provider/rater;
- no production;
- no public dropdown release.
