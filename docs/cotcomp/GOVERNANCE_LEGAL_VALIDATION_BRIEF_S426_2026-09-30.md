# CotComp Governance Legal Validation Brief · Guatemala + Colombia

**Date:** 2026-09-30  
**Purpose:** formal legal validation before any CotComp persistence/write/deploy gate.

## Owner-approved internal policy to validate

1. Draft not submitted:
   - delete or anonymize after 30 days of inactivity.

2. Submitted quotation request not converted:
   - retain 12 calendar months from closure or last activity;
   - then delete or anonymize.

3. Converted to client/policy:
   - CotComp stops governing retention;
   - confirmed transition to Gravicentra client/policy governance;
   - no automatic CotComp deletion until transition is confirmed.

4. Public case access:
   - opaque token lifetime: 7 days;
   - one QuoteCase only;
   - raw token never persisted;
   - server stores token hash only;
   - renewal issues new token and revokes previous token;
   - early revocation on case closure, access-context change, rotation, owner revocation or security event.

5. Consent:
   - consent to manage the quotation/request is separate from marketing consent;
   - marketing is optional and defaults to false.

## Questions for Guatemala counsel

Please confirm specifically for **Alianzas y Soluciones Corredores de Seguros, S.A.** as an insurance intermediary/corredor:

1. Is there any Guatemalan statute, SIB/Junta Monetaria rule, AML/CFT rule, tax/commercial rule or intermediary-specific requirement imposing a minimum retention period on:
   - anonymous/identified draft prospects;
   - submitted but unconverted quotation prospects;
   - quotations/proposals;
   - communications and consent evidence;
   - converted clients/policies?

2. Does the five-year insurance-sector recordkeeping language applicable to insurers extend to this broker/intermediary or only to insurers/other obligated entities in defined circumstances?

3. Are any CotComp health-related fields subject to additional confidentiality/sensitive-data requirements?

4. Is deletion acceptable, or should A&S prefer irreversible anonymization for certain evidentiary/audit records?

5. What minimum evidence of consent should be retained, and for how long?

6. Are there mandatory requirements for electronic-record integrity, audit trail, access logs or proof of quotation advice?

## Questions for Colombia counsel

Please confirm specifically for the Colombian A&S entity and its actual regulatory status:

1. Is the proposed 12-month period for an unconverted prospect consistent with the purpose/necessity principles under the applicable personal-data framework?

2. Do insurance-intermediary, financial-sector, commercial, tax, consumer or AML rules impose a longer mandatory retention period for:
   - prospect data;
   - quotation evidence;
   - proposals;
   - communications;
   - consent records?

3. At conversion, what exact retention regime should govern the customer/policy file?

4. For health/medical quotation journeys, what extra rules apply to sensitive health data and explicit authorization?

5. Is a 7-day opaque case-access token with hash-only server persistence an acceptable security design, and are there any required access-log retention periods?

6. Is separate optional marketing consent sufficient, and what wording/evidence should be retained?

## Current public-source evidence reviewed

### Colombia
- Ley 1581 de 2012, SIC official publication.
- SIC Concepto 13-183213: Law 1581 does not establish a general maximum persistence period; duration depends on purpose, and conservation should not exceed what is necessary for that purpose.
- SIC guidance on the principle of finalidad likewise states that processing duration should not exceed what is necessary for the collection purpose.

### Guatemala
- Ley de la Actividad Aseguradora, Decreto 25-2010, including regulation/registration of insurance intermediaries.
- SIB insurance-sector Guide No. 5 includes a five-year recordkeeping statement expressly framed for **the insurer** after the business relationship.

## Important interpretation boundary

The proposed 30-day / 12-month / 7-day periods are **A&S internal governance choices** pending formal legal validation. They are not presented as statutory periods.

The Guatemala insurer-specific five-year statement must not be automatically applied to an unconverted broker prospect without counsel confirming the applicable legal basis.

## Required legal response format

For each country, counsel should return:

- policy item;
- compliant / adjust / not applicable;
- mandatory minimum;
- mandatory maximum, if any;
- legal/regulatory source;
- affected data/category;
- required consent/evidence;
- recommended revised period;
- effective date / transition action.

No runtime/write/deploy gate should open until this validation is recorded.
