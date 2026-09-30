# CotComp S4.30-S4.31 Legal Evidence Provenance and Intake

Date: 2026-09-30
Status: SOURCE-ONLY / NO COUNSEL PACKETS RECORDED / NO LEGAL COMPLETION CLAIMED / RUNTIME+WRITES+DEPLOY OFF

## S4.30 provenance
Formal legal evidence requires:
- country GT or CO;
- exact S4.26 policy version;
- formal document reference;
- original file name;
- SHA-256 document hash;
- issuing organization;
- issue date;
- signed-or-official flag.

Public research cannot be promoted into formal counsel evidence.

Owner acceptance is bound to:
- country;
- exact policy version;
- exact evidence document hash;
- acceptance timestamp.

## S4.31 intake
Country intake is accepted only when:
- S4.28 packet is structurally valid;
- provenance is valid;
- country, document reference and policy version match;
- owner acceptance binds the same document hash;
- country opinion acceptance is explicit.

Both GT and CO are required before formal legal completion can be derived.

## Current truth
No GT or CO formal counsel submissions are recorded.

Therefore formal legal validation remains false.

## Hard locks
Runtime false.
Writes false.
Deploy false.
Effective runtime false.

## Operational sequence
1. Preserve original counsel file.
2. Compute its SHA-256.
3. Transcribe the opinion into the S4.28 packet.
4. Bind packet reference to the original document reference/hash.
5. Confirm exact S4.26 policy version.
6. Record Owner acceptance.
7. Run S4.31 intake.

No runtime or data mutation is authorized.
