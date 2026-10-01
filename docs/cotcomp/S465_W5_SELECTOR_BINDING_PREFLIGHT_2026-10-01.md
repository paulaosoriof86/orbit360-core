# CotComp S4.65 — W5 selector-binding preflight

Date: 2026-10-01

## Objective

Prepare the exact selector-commitment mechanism needed for the future real-data W5 pilot without reading or writing any real record.

## Scope

S4.65 is source-only.

It validates the mechanics for three future commitments:
- QuoteCase selector SHA-256;
- authorized actor selector SHA-256;
- request-management consent evidence SHA-256.

Raw selector values must not be persisted or returned by the preflight helper.

## Synthetic proof

A synthetic selector-binding packet is generated from non-real placeholder selectors.

Expected result:
- three 64-character SHA-256 commitments;
- no raw selector persistence;
- no raw selector returned;
- commitment validation PASS;
- Owner-approved W5 scope remains bound;
- final real-data authorization still absent.

## Execution truth

Even if a final authorization boolean is simulated in source tests, S4.65 code remains:
- execution OFF;
- app-data reads OFF;
- app-data writes OFF;
- real data OFF;
- production OFF.

## Exit

S4.65 closes if the binding mechanism is technically proven and the synthetic preflight reduces the simulated binding gate to only:

`OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED`

No actual case, actor or consent record is selected in S4.65.
