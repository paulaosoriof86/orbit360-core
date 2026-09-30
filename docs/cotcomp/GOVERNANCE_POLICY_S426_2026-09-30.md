# CotComp Governance Policy · S4.26 / F8-G4

**Date:** 2026-09-30  
**Status:** OWNER-APPROVED INTERNAL GOVERNANCE / FORMAL LEGAL VALIDATION PENDING / RUNTIME+WRITES+DEPLOY OFF

## Owner decision

The owner approved the proposed internal governance model on 2026-09-30.

This freezes a **business/technical governance policy**, not a legal conclusion.

Formal legal validation remains mandatory before production persistence.

## Retention

### Draft not submitted
After **30 days of inactivity**:
`DELETE_OR_ANONYMIZE`.

### Submitted quotation request not converted
Retain for **12 calendar months from closure or last activity**, then:
`DELETE_OR_ANONYMIZE`.

### Converted to client/policy
CotComp stops being the authority for retention.

The record transitions to:
`GRAVICENTRA_CLIENT_POLICY_GOVERNANCE`.

CotComp must not automatically delete the record until the transition is confirmed.

## Case-access

Public case-access token:
- lifetime: **7 days**;
- bound to one QuoteCase;
- raw token never persisted;
- token hash may be persisted server-side after its later write gate;
- renewal creates a new token;
- previous token is revoked on renewal.

Early revocation reasons:
- CASE_CLOSED
- ACCESS_CONTEXT_CHANGED
- TOKEN_ROTATED
- OWNER_REVOKED
- SECURITY_EVENT

## Consent

Request-management consent and marketing consent remain separate.

Marketing:
- optional;
- default false;
- never bundled with quotation-management consent.

## Legal/regulatory evidence boundary

### Colombia
SIC materials state that Law 1581 does not set a general maximum retention term and that retention depends on the processing purpose. SIC also states that personal data should not be kept longer than necessary for that purpose.

Therefore the 30-day / 12-month periods are A&S internal governance choices aligned to purpose limitation; they are **not stated statutory periods**.

### Guatemala
The SIB insurance-sector guide found during review states a minimum five-year recordkeeping period for **the insurer** after the business relationship, including due-diligence and transaction records.

That source does not by itself prove that a broker must keep an unconverted public CotComp prospect for five years.

Therefore A&S does not transplant the insurer-specific five-year period into the public CotComp prospect lifecycle without formal legal validation.

## Hard legal gate

`LEGAL_VALIDATION_REQUIRED=true`
`LEGAL_VALIDATION_COMPLETE=false`

Even after owner approval:
- runtime remains false;
- writes remain false;
- deploy remains false.

## Next technical block

S4.27 may consume this exact governance version in a source-only readiness preflight.

It must require:
- owner-approved policy version;
- formal legal validation before any write gate;
- all existing S4.23/S4.25 security/runtime gates.

S4.26 itself does not authorize any persistence or deployment.
