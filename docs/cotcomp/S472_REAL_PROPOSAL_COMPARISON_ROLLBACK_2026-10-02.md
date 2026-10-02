# CotComp · S4.72 · Real Proposal + ComparisonSet controlled proof

**Fecha:** 2026-10-02

S4.72 is the one additional controlled LAB execution explicitly authorized through S4.71.

Scope:
- existing W5 QuoteCase only;
- three temporary Proposal v1 documents;
- three temporary proposal idempotency documents;
- one temporary ComparisonSet;
- exact readback;
- public comparison DTO;
- W4 control probe with no explicit user choice;
- full rollback of all seven temporary documents;
- independent final absence;
- existing QuoteCase digest must remain unchanged.

Authorization replay prevention:
the existing S4.71 validation document is used as a persistent one-execution control. S4.72 claims it immediately before temporary writes and consumes it after the run. This control record is not a business Proposal/ComparisonSet document and is intentionally not rolled back.

Forbidden:
- provider/rater calls;
- production;
- issuance;
- binding;
- payment;
- general persistence release;
- Selection creation;
- raw PDF persistence;
- PII in Proposal or artifacts;
- cross-risk mixing.

Comparison truth:
- rankingPolicy = NONE_BY_DEFAULT;
- silentWeighting = false;
- missingSemantics = MISSING_IS_NOT_NOT_COVERED;
- only VALIDATED + CURRENT proposals eligible.
