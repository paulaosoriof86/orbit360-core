# CotComp · S4.70 · Owner-supplied real quote evidence · source-only readiness

**Fecha:** 2026-10-02  
**Estado:** `SOURCE EVIDENCE READY / OWNER HUMAN VALIDATION REQUIRED / NO REAL DATA / NO WRITES / NO PROVIDER-RATER / NO PRODUCTION`

## Purpose

Use the insurer PDFs supplied directly by the Owner after S4.69 to resolve the documentary side of:
`REAL_VALIDATED_PROPOSAL_EVIDENCE_REQUIRED`.

This block does not execute a second real W5 write run.

## W5-matching evidence set

Only the two source documents matching the existing W5 vehicle family are admitted into S4.70.

Other uploaded quotations concern different risks/people and are intentionally excluded from the W5 evidence set.

The two admitted documents support three documentary alternatives:
- Aseguradora Guatemalteca · Aseguate Premium;
- Aseguradora Guatemalteca · Aseguate Plus;
- MAPFRE Seguros Guatemala · Seguro de Automóvil.

Raw PDFs are not copied to GitHub.
Names, email, phone, raw quote numbers and raw case identifiers are not copied to GitHub.

GitHub stores only:
- source document SHA-256;
- source-reference commitment SHA-256;
- case-match commitment SHA-256;
- insurer/plan labels;
- normalized non-PII coverage/limit/deductible/assistance terms required for comparison.

## Documentary findings

The admitted sources are both dated 2026-09-30 and state a 15-day quotation-validity window.

They correspond to the same vehicle/risk family and insured amount represented by the W5 intake.

Aseguate PDF:
- two plan columns;
- cash premiums Q2,508.80 and Q2,273.60;
- Premium RC Q1.2M;
- Plus RC Q0.5M;
- different occupant limits, deductibles and assistance levels.

MAPFRE PDF:
- cash premium Q3,292.80;
- RC Q1.3M;
- own damage/theft 3% minimum Q3,000;
- occupant limit Q50,000 per person / Q250,000 per accident;
- additional benefits and underwriting/inspection conditions.

## Validation boundary

Documentary extraction is ready, but S4.70 does not silently convert file upload into:
`humanValidated=true`.

Before any real Proposal write, the Owner must explicitly attest that these are the intended real quotations for the W5 case and authorize the second controlled evidence execution.

That attestation is stored only as SHA-256 commitment.

## Existing authorization boundary

The original W5 authorization allowed one execution.
S4.68 consumed that execution and rolled it back successfully.

Therefore a new physical W3/ComparisonSet proof using these real proposals requires a narrow follow-up Owner authorization.

No earlier authorization is silently reused.

## Next physical candidate after Owner authorization

A follow-up gate may:
1. read exactly the existing W5 QuoteCase;
2. verify its brand/line family commitment matches the admitted source bundle;
3. create three temporary real Proposal v1 documents plus idempotency records;
4. verify all three are VALIDATED + CURRENT at execution time;
5. create one temporary ComparisonSet with rankingPolicy NONE_BY_DEFAULT and silentWeighting=false;
6. build/read the public comparison DTO;
7. keep W4 blocked unless an explicit proposal choice is separately made;
8. rollback all Proposal/idempotency/ComparisonSet documents;
9. verify the QuoteCase digest remains unchanged and final temporary-document absence is complete.

Still forbidden:
- provider/rater calls;
- production;
- issuance/binding/payment;
- general persistence release;
- raw PDF persistence in CotComp;
- PII in Proposal;
- fabricated Proposal;
- implicit selection.

## Current state

`DOCUMENTARY_EVIDENCE_READY = true`
`OWNER_HUMAN_VALIDATION_REQUIRED = true`
`SECOND_CONTROLLED_EXECUTION_AUTHORIZATION_REQUIRED = true`
`APP_DATA_READS = 0`
`APP_DATA_WRITES = 0`
`REAL_DATA_TOUCHED = false`
