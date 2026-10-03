# CotComp · S4.81 · Gravicentra Authority Contract v1

**Fecha:** 2026-10-03  
**Estado:** `SOURCE-ONLY / CONTRACT READY FOR CROSS-PROJECT RECONCILIATION`

## Purpose

Create the smallest explicit contract that prevents CotComp from becoming a second tariff/quote engine.

## Frozen authority

Gravicentra is authoritative for:
- insurer/product/plan configuration;
- provider/source bindings;
- eligibility;
- tariff rules and enablement;
- premium/minimum/fees/taxes/assistance/discount/surcharge;
- financing/fraccionamiento/installments;
- source provenance, validity and proposal state.

CotComp is authoritative for:
- public journey/UX;
- progressive capture;
- public consent interaction;
- comparison presentation;
- explicit user choice interaction;
- web funnel analytics.

## Contract capabilities

1. Manifest/config projection.
2. QuoteRequest.
3. ProposalProjection.
4. ComparisonFact semantics.
5. SelectionHandoff.
6. Change propagation policy.

## No duplication guarantees

The contract performs no:
- tariff calculation;
- tax calculation;
- premium calculation;
- installment calculation;
- provider/rater call;
- Firebase read/write;
- production enablement.

Financial values are projections reported by Gravicentra.

## Version rule

- New requests consume the latest enabled/effective Gravicentra configuration.
- Existing Proposal records remain pinned to their original configuration/tariff/source/binding/catalog versions and rules digest.
- No silent retroactive recalculation.
- Ordinary tariff changes do not require a Web redeploy.

## Comparison rule

Only VALIDATED + currently valid Proposal projections are eligible.

`MISSING != NOT_COVERED`.

## Selection rule

A request-management consent is not a proposal choice.

SelectionHandoff requires `explicitUserChoice=true` and cannot assert issued/bound/confirmed.

## Next cross-project gate

Gravicentra must reconcile this consumer contract against its contemporary work on premiums, rates and fraccionamiento and return the authoritative provider-side contract/schema.

No runtime integration is released by S4.81.
