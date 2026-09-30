# CotComp Governance-aware Readiness · S4.27 / F8-G4

**Date:** 2026-09-30  
**Status:** SOURCE-ONLY / S4.26 POLICY CONSUMED / LEGAL VALIDATION STILL BLOCKING / RUNTIME+WRITES+DEPLOY OFF

## Objective

Make the owner-approved S4.26 governance policy an explicit prerequisite of the technical readiness chain.

## Exact policy version

Required:
`ays-cotcomp-governance-policy-s426-v1.0`

A version mismatch fails closed.

## Governance translation

Retention and case-access persistence are considered technically approved only when all are true:
1. exact S4.26 policy version;
2. owner governance approval;
3. formal legal validation complete.

Current source truth:
- owner governance approval: yes;
- formal legal validation: no.

Therefore:
- `retentionPolicyApproved=false`;
- `caseAccessPersistenceApproved=false`.

## Independent gates preserved

Even after formal legal validation, readiness still independently requires:
- S4.20 owner blob proven deployed in LAB;
- negative security QA PASS;
- explicit owner write authorization;
- separate deploy authorization.

## Hard locks

S4.27 itself keeps:
- `RUNTIME_ENABLED=false`;
- `WRITES_ENABLED=false`;
- `DEPLOY_ALLOWED=false`;
- `effectiveRuntimeAllowed=false`.

Even a fully satisfied logical input cannot turn these code locks on.

## Frozen governance snapshot

- draft inactivity: 30 days;
- submitted/not converted: 12 months;
- converted: handoff to Gravicentra client/policy governance;
- public case-access token: 7 days;
- raw token persistence: forbidden;
- marketing consent: separate from request-management consent.

## Next block

Prepare a concise legal-validation brief for Guatemala and Colombia that asks counsel to validate:
- the 30-day draft period;
- the 12-month unconverted-prospect period;
- the transition point to client/policy retention;
- seven-day public case token;
- token hashing/revocation;
- consent separation;
- any country-specific mandatory minimum/maximum retention periods for brokers/intermediaries.

That legal brief is evidence preparation only and does not authorize runtime, writes or deploy.
