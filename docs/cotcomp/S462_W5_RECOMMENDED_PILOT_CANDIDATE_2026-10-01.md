# CotComp S4.62 — Recommended low-risk W5 pilot candidate

Date: 2026-10-01

## Objective

Advance everything that remains under technical/project management without crossing into real-data execution or making Owner/legal decisions by implication.

S4.62 prepares a recommended first real-data pilot candidate only.

It is **not approved** and **not executable**.

## Recommended first pilot

Country:
`GT`

Journey:
`GT_AUTO_MOTO_HYBRID`

Allowed stages:
- W1
- W2
- W3
- W4

Scope:
- maximum QuoteCases = 1;
- maximum data subjects = 1;
- maximum existing records touched = 8;
- one execution only.

Success disposition recommendation:
`ROLLBACK_TO_BEFORE_STATE`

Health-sensitive data:
`false`

Provider/rater calls:
`false`

Production:
`false`

Issuance:
`false`

Binding:
`false`

Payment:
`false`

## Why this is the recommended candidate

This is the lowest-risk useful candidate because:

- it is non-health;
- the GT Auto/Moto journey is already frozen and heavily covered by existing CotComp QA;
- W1-W4 are already physically proven synthetically;
- it exercises the complete controlled quote → workflow → proposal/version → comparison/selection persistence path without introducing health-sensitive data;
- the first real-data pilot should be reversible even if technically successful.

Therefore the first-pilot recommendation is to restore the exact before-state after successful verification rather than retain the pilot mutation.

This is a project recommendation, not an Owner decision.

## What is intentionally not filled

The candidate leaves these values unset:

- actual QuoteCase selector commitment;
- actual authorized actor selector commitment;
- actual request-management consent evidence commitment;
- formal legal validation reference;
- Owner approval of the pilot scope;
- Owner W5 real-data authorization.

No raw identifiers or PII are placed in Git.

## Remaining inputs before authorization can even be considered

1. Formal legal validation under the current frozen governance-policy version.
2. Exact case SHA-256 selector commitment.
3. Exact authorized actor SHA-256 selector commitment.
4. Exact request-management consent evidence SHA-256 commitment.
5. Owner approval of the proposed GT Auto/Moto pilot scope and rollback disposition.
6. Separate explicit Owner W5 real-data authorization.

## Boundaries

- app-data reads = 0;
- app-data writes = 0;
- real data = 0;
- production untouched;
- execution disabled.

S4.62 advances decision preparation only.
