# CotComp Formal Legal Validation Evidence Contract · S4.28 / F8-G4

**Date:** 2026-09-30  
**Status:** SOURCE-ONLY / LEGAL EVIDENCE INTAKE PREPARED / NO LEGAL VALIDATION CLAIMED / RUNTIME+WRITES+DEPLOY OFF

## Objective

Prepare the exact evidence structure that counsel must return before S4.26 can ever be marked formally validated.

This block does **not** perform legal validation and does not infer counsel conclusions.

## Countries

Both are required:
- Guatemala (GT)
- Colombia (CO)

## Required policy items per country

1. DRAFT_RETENTION
2. UNCONVERTED_RETENTION
3. CONVERTED_HANDOFF
4. CASE_ACCESS_LIFETIME
5. TOKEN_STORAGE_AND_REVOCATION
6. CONSENT_SEPARATION
7. HEALTH_SENSITIVE_DATA
8. CONSENT_EVIDENCE_RETENTION

## Allowed legal decisions

- COMPLIANT
- ADJUST
- NOT_APPLICABLE

Every item requires:
- legal/regulatory source;
- legal analysis.

ADJUST additionally requires:
- explicit required adjustment;
- owner acceptance of that adjustment;
- confirmation that the adjustment has been applied to the exact current governance-policy version.

NOT_APPLICABLE requires a reason.

## Country packet requirements

- country;
- exact reviewed policy version;
- entity legal name;
- counsel organization;
- formal opinion/document reference;
- opinion date;
- all eight policy decisions;
- owner acceptance of the country opinion.

## Formal completion rule

Formal legal validation may evaluate true only when:
- GT packet is complete;
- CO packet is complete;
- both review the exact S4.26 policy version;
- every required policy item has a valid disposition;
- any adjustment is accepted and already reflected in the reviewed policy version;
- owner accepts each country opinion.

Even then:
- runtime remains false;
- writes remain false;
- deploy remains false.

## Current truth

No counsel packet has been provided in this project.

Therefore:
`formalLegalValidationComplete = false`

## Next block

S4.29 may connect this evidence-derived result to governance readiness, replacing any manual boolean assumption with a formal evidence object.

That remains source-only until actual legal opinions are supplied.
