# CotComp S4.57 — W5 real-data pilot source-only readiness

Date: 2026-10-01

## Objective

Open W5 `REAL_DATA_PILOT` only at source/readiness level after physical W4 PASS.

S4.57 must not read or write application data and must not touch real data.

## Current legal/governance truth

The current CotComp governance policy remains owner-approved but formally legally unvalidated.

Current formal evidence truth:
- Guatemala counsel packet: incomplete/not present;
- Colombia counsel packet: incomplete/not present;
- formalLegalValidationComplete = false.

The current 30-day draft, 12-month unconverted and 7-day case-access policies therefore remain internal governance choices pending formal legal validation.

Raw public case-access token persistence remains forbidden and marketing consent remains separate/optional.

## W5 technical gaps

Before any real-data pilot can be considered, W5 needs an explicit contract for:
- exact country/journey/case/user pilot scope without committing raw PII to Git;
- one-time execution authorization;
- real-data minimization and health-sensitive-data boundary;
- sanitized observability/evidence;
- before-state anchoring and rollback/containment;
- success and abort criteria;
- explicit decision on whether successful pilot writes remain or are rolled back;
- hard provider/rater/production/issuance/binding/payment locks.

## Frozen blockers

- `FORMAL_LEGAL_VALIDATION_REQUIRED`
- `W5_EXACT_PILOT_SCOPE_REQUIRED`
- `W5_SINGLE_EXECUTION_GUARD_REQUIRED`
- `W5_REAL_DATA_MINIMIZATION_REQUIRED`
- `W5_SANITIZED_OBSERVABILITY_REQUIRED`
- `W5_ROLLBACK_CONTAINMENT_REQUIRED`
- `W5_SUCCESS_ABORT_CRITERIA_REQUIRED`
- `W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED`
- `W5_PROVIDER_PRODUCTION_LOCKS_REQUIRED`
- `OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED`

## Sensitive journey boundary

The current journey inventory includes `GT_GASTOS_MEDICOS_HYBRID`, which carries a health/medical signal.

S4.57 does not authorize sensitive-health real-data testing. Any future health-data pilot must be explicitly supported by the formal legal evidence and exact pilot authorization.

## Boundaries

- app-data reads = 0;
- app-data writes = 0;
- real data = 0;
- production = untouched;
- W5 execution = OFF.

## Next safe block

Build a source-only W5 pilot contract that closes the technical blockers while leaving external/Owner gates explicit.

No real-data W5 execution is permitted by S4.57.
