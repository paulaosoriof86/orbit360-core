# CotComp · S4.69 · Real Proposal evidence path · source-only

**Fecha:** 2026-10-02  
**Estado:** `SOURCE-ONLY / NO REAL DATA / NO WRITES / NO PROVIDER-RATER / NO PRODUCTION`

## 1. Trigger

S4.68 physically closed the first real W5 pilot to the limit of available evidence.

Current W3 dependency:
`EXPLICIT_REAL_PROPOSAL_REQUIRED`.

The project must not fabricate a Proposal or activate provider/rater merely to turn W3 green.

## 2. Existing Gravisentra capability audit

Read-only review of the contemporary Gravisentra source confirms reusable evidence concepts already exist:

- the quote source gate distinguishes automatic validated-source results from manual/documentary drafts;
- manual and PDF-derived quotations remain pending human validation before comparison;
- the quote contract recognizes documentary/assisted/manual versioned origins;
- external PDF extraction is a no-write adapter and requires human validation;
- Aseguradoras/Gravisentra remains the source of truth for insurer documents and validated operational configuration.

Therefore CotComp does not need a second insurer directory, a second rater or a duplicated Gravisentra quotation product.

## 3. Smallest safe path

A real W3 Proposal can be eligible only when a real insurer quotation has documentary/operational evidence and human validation.

Accepted source-origin classes for the source-only adapter:
- `pdf_externo`;
- `cotizador_excel`;
- `cotizador_linea_asistido`;
- `ajuste_manual_versionado`.

For this W5 continuation, all origins remain evidence inputs only.
No provider/rater call is performed by S4.69.

## 4. Evidence packet boundary

Required:
- existing W5 case link;
- insurer identity;
- plan;
- currency and premium;
- comparison structures required by the canonical Proposal contract;
- validity window;
- source document SHA-256;
- source-reference commitment SHA-256;
- validator commitment SHA-256;
- validation timestamp;
- explicit human validation;
- manual-reason commitment for `ajuste_manual_versionado`.

Forbidden:
- raw participant PII;
- raw document bytes inside CotComp Proposal;
- raw bearer/token;
- fabricated insurer/source/proposal;
- unvalidated premium treated as eligible;
- provider/rater calls;
- production.

## 5. Mapping

S4.69 maps governed source evidence to the existing CotComp W3 proposal/versioning contract.

It does not create a new Proposal model.

Eligibility remains:
`VALIDATED + CURRENT VALIDITY`.

Missing/unmapped coverage semantics remain governed by the existing comparison policy and must not silently become `NOT_COVERED`.

## 6. Manual evidence rule

A bare manually typed premium is insufficient.

`ajuste_manual_versionado` additionally requires:
- documentary source hashes/commitments;
- human validation;
- a reason commitment.

This preserves Gravisentra's own rule that manual/document proposals are drafts until validated.

## 7. Current state

S4.69 prepares only the source contract.

It does not assert that a real insurer quotation currently exists for the W5 case.

Current dependency after this source-only preparation remains:
`REAL_VALIDATED_PROPOSAL_EVIDENCE_REQUIRED`.

## 8. Boundaries

- application-data reads = 0;
- application-data writes = 0;
- real data = 0;
- provider/rater = 0;
- production = 0;
- issuance/binding/payment = 0;
- general persistence release unchanged.

## 9. Next action

If a legitimate real insurer quotation already exists or is later received for the W5 case, bind its evidence through this contract and evaluate W3 eligibility.

If none exists:
- record the dependency;
- do not fabricate one;
- continue other independent G4 work.
