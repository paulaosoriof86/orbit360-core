# CotComp S4.63 — Owner-approved W5 pilot scope

Date: 2026-10-01

## Objective

Freeze the Owner's explicit approval of the proposed first W5 pilot business scope and success disposition, while preserving the legal and final real-data execution gates.

This block is source-only.

## Owner-approved scope

Approved:
- country: Guatemala;
- journey: `GT_AUTO_MOTO_HYBRID`;
- stages: W1 + W2 + W3 + W4;
- max QuoteCases: 1;
- max data subjects: 1;
- max existing records touched: 8;
- executions: 1;
- success disposition: `ROLLBACK_TO_BEFORE_STATE`;
- health-sensitive data: false.

The Owner explicitly preserved:
- real data execution blocked;
- final W5 authorization not yet given;
- legal gate still required.

## Gates closed by S4.63

- `W5_BUSINESS_SCOPE_OWNER_APPROVED`;
- `W5_SUCCESS_PERSISTENCE_DISPOSITION_APPROVED`.

## Gates still open

- `FORMAL_LEGAL_VALIDATION_REQUIRED`;
- `W5_CASE_SELECTOR_COMMITMENT_REQUIRED`;
- `W5_ACTOR_SELECTOR_COMMITMENT_REQUIRED`;
- `W5_CONSENT_EVIDENCE_COMMITMENT_REQUIRED`;
- `OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED`.

The selector commitments cannot be created yet because no real pilot record may be read before the legal gate and final authorization path are satisfied.

## Boundaries

- execution OFF;
- app-data reads 0;
- app-data writes 0;
- real data 0;
- production untouched.

S4.63 is a governance/traceability milestone only.
