# CotComp S4.61 — Formal counsel intake kit for W5

Date: 2026-10-01  
Status: `SOURCE-ONLY / TEMPLATE READY / NO LEGAL CONCLUSION / REAL DATA OFF`

## Purpose

Make the remaining formal legal gate operational without fabricating legal conclusions.

The current frozen governance-policy version is:

`ays-cotcomp-governance-policy-s426-v1.0`

Formal W5 legal completion currently requires one accepted country bundle for Guatemala and one for Colombia under that exact version.

## Files prepared

- `docs/cotcomp/legal/GT_COUNSEL_INTAKE_TEMPLATE_S461.json`
- `docs/cotcomp/legal/CO_COUNSEL_INTAKE_TEMPLATE_S461.json`

These are intentionally incomplete templates. They must fail closed until completed from actual formal counsel evidence.

## Counsel review questions — each country

For each required policy item, counsel must provide one disposition:

- `COMPLIANT`
- `ADJUST`
- `NOT_APPLICABLE`

Required policy items:

1. `DRAFT_RETENTION`
2. `UNCONVERTED_RETENTION`
3. `CONVERTED_HANDOFF`
4. `CASE_ACCESS_LIFETIME`
5. `TOKEN_STORAGE_AND_REVOCATION`
6. `CONSENT_SEPARATION`
7. `HEALTH_SENSITIVE_DATA`
8. `CONSENT_EVIDENCE_RETENTION`

For every item, counsel should answer:

- Is the current internal policy compliant for A&S in this country?
- What legal or regulatory source governs this item?
- Is there a mandatory minimum retention/availability period?
- Is there a mandatory maximum retention/availability period?
- Which personal or sensitive data categories are affected?
- What consent or evidence of consent must be retained?
- Is an adjustment required before W5 real-data use?

If `ADJUST` is selected:
- counsel must specify the exact required adjustment;
- Owner must accept it;
- it must be applied to the exact reviewed governance-policy version before the packet can validate.

If `NOT_APPLICABLE` is selected:
- counsel must state the reason.

## Formal evidence provenance

Each country bundle also requires:

- sourceType = `FORMAL_COUNSEL_OPINION`;
- exact policy version;
- formal document reference;
- original document file name;
- SHA-256 of the original document;
- issuing organization;
- issue date;
- signed-or-official = true;
- derivedFromPublicResearch = false.

Owner acceptance must bind:
- the same country;
- the same policy version;
- the exact evidence-document SHA-256;
- an acceptance timestamp.

## Important limitation

Public research, regulator webpages, academic analysis, internal A&S interpretation or ChatGPT analysis cannot be promoted into formal counsel evidence under the currently frozen contract.

## Current truth

No accepted GT or CO counsel bundle is recorded.

Therefore:

`formalLegalValidationComplete=false`

No W5 real-data activity is authorized.
