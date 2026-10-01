# CotComp S4.58 — W5 real-data pilot technical contract

Date: 2026-10-01

## Objective

Close the technical W5 readiness gaps found in S4.57 without reading or writing any application data and without touching real data.

S4.58 prepares the contract only. It does not authorize W5 execution.

## Exact-scope model

A future W5 authorization must explicitly identify, through SHA-256 commitments rather than raw identifiers committed to Git:

- the single pilot QuoteCase;
- the authorized pilot actor/user;
- the request-management consent evidence.

The descriptor must also freeze:
- country;
- journey;
- exact allowed W1-W4 stages;
- maximum existing records that may be touched;
- exactly one QuoteCase;
- exactly one data subject;
- one execution only;
- success persistence disposition.

Raw PII, secrets and raw record identifiers are forbidden from repository evidence.

## Success persistence disposition

A future Owner authorization must choose one of:

- `ROLLBACK_TO_BEFORE_STATE`;
- `RETAIN_IF_VALID_BUSINESS_RECORD`.

S4.58 does not choose on the Owner's behalf.

## Data minimization

Hard defaults:
- one QuoteCase maximum;
- one data subject maximum;
- raw case-access token persistence forbidden;
- marketing consent defaults to false;
- provider/rater calls forbidden;
- production forbidden;
- issuance forbidden;
- binding forbidden;
- payment forbidden.

## Sensitive-health boundary

A health/medical journey is blocked unless:
- sensitive-health data is explicitly allowed in the pilot descriptor; and
- the descriptor carries a SHA-256 commitment to the applicable formal health legal evidence.

This condition does not substitute the general formal legal-validation gate.

## Sanitized observability

Future W5 evidence must:
- contain no PII;
- contain no secrets;
- contain no raw record identifiers;
- use SHA-256 selector commitments;
- record before/after digests and mutation counts only;
- record an abort reason on failure.

## Rollback and containment

Future physical W5 must:
- anchor exact before-state digests;
- keep any raw before-image only ephemerally during the run;
- never upload a raw before-image;
- attempt rollback on failure;
- verify rollback;
- abort on any unexpected path or scope expansion.

## Success / abort rules

Abort if any of the following occurs:
- consent evidence mismatch;
- case commitment mismatch;
- actor commitment mismatch;
- unexpected document path;
- provider/rater path;
- production path;
- issuance/binding/payment path;
- declared scope count exceeded.

Success requires all declared stage checks, exact scope counts and no forbidden side effects.

## Current external blockers

Technical contract readiness can pass source-only, but current W5 execution remains blocked by:

- `FORMAL_LEGAL_VALIDATION_REQUIRED`;
- `W5_EXACT_PILOT_SCOPE_REQUIRED`;
- `W5_SUCCESS_PERSISTENCE_DISPOSITION_REQUIRED`;
- `OWNER_W5_REAL_DATA_AUTHORIZATION_REQUIRED`.

Formal legal validation is currently incomplete because no complete accepted GT + CO counsel packets are recorded for the current governance-policy version.

## Boundaries

- execution = OFF;
- app-data reads = 0;
- app-data writes = 0;
- real data = 0;
- production untouched.

## Exit criterion

S4.58 closes when:
- accumulated QA passes;
- W5 contract tests pass;
- technicalW5Ready=true;
- realDataAllowed=false;
- only external/Owner gates remain.

No real-data execution is authorized by S4.58.
