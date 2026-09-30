# CotComp Owner No-Counsel Exception · S4.34 / F8-G4

**Date:** 2026-09-30  
**Status:** OWNER DECISION FROZEN / FORMAL COUNSEL PATH WAIVED / LEGAL COMPLIANCE NOT VERIFIED / SOURCE-ONLY CONTINUATION ALLOWED / WRITES+PRODUCTION RELEASE OFF

## Owner decision

Owner explicitly decided to proceed without obtaining a formal legal opinion for S4.26.

Frozen decision:
`PROCEED_WITHOUT_FORMAL_COUNSEL_OPINION`.

This supersedes the prior workflow assumption that technical continuation must wait for a formal GT+CO counsel packet.

It does **not** convert the internal A&S policy into a legally verified policy.

## Truth labels

- ownerWaivesFormalCounsel = true
- ownerAcceptedRisk = true
- legalComplianceVerified = false
- formalCounselPathStatus = WAIVED_BY_OWNER

## Allowed continuation

Allowed now:
- source-only engineering;
- source-only QA;
- architecture/specification;
- LAB no-write preparation;
- synthetic/read-only proof design.

Not authorized by S4.34:
- real customer/prospect data writes;
- production release;
- production legal/compliance claim;
- deployment.

## Governance policy preserved

S4.26 internal policy remains:
- 30-day inactive draft;
- 12-month submitted/not-converted retention;
- converted-case handoff to Gravicentra;
- seven-day case-access token;
- raw token persistence forbidden;
- separate marketing consent.

The policy remains an internal Owner-approved operating rule, not a statutory statement.

## Later production gate

If Owner later chooses production without counsel, that must be a separate explicit production-risk authorization. S4.34 alone is not that authorization.
