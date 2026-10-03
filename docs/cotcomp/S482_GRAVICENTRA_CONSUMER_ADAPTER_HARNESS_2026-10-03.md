# CotComp · S4.82 · Gravicentra consumer adapter harness

**Fecha:** 2026-10-03  
**Estado inicial:** `SOURCE-ONLY / SYNTHETIC TRANSPORT / NO DEPLOY`

## Objective

Prove that CotComp can consume a Gravicentra-owned contract without duplicating insurer, tariff or premium logic.

## Adapter behavior

The adapter:
- loads and validates a Gravicentra manifest;
- builds/validates QuoteRequest via S4.81;
- accepts only responses whose authority is Gravicentra;
- enforces correlation and idempotency echo;
- validates ProposalProjection and ComparisonFact;
- determines comparison eligibility from contract state only;
- prepares SelectionHandoff only with explicit user choice;
- verifies configuration transition semantics.

## Important non-behavior

The adapter does NOT:
- calculate premium;
- calculate taxes;
- calculate installments;
- select an insurer;
- call provider/rater;
- read/write Firebase;
- persist a QuoteCase;
- deploy anything.

## Version transition proof

Synthetic test:
- manifest cfg-v1 is current;
- Proposal is generated and pinned to cfg-v1 / tariff-v1 / rulesDigest-1;
- Gravicentra publishes cfg-v2;
- next quote uses cfg-v2;
- existing Proposal remains pinned to cfg-v1 and is not silently recalculated;
- Web redeploy is not required.

## Release truth

S4.82 is a consumer-side harness only.
It does not certify that the provider-side Gravicentra API exists or is deployed.
