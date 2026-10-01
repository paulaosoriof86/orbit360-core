# CotComp S4.60 — W5 external-gate package

Date: 2026-10-01

## Objective

Prepare the exact external/Owner decision package required before any W5 real-data pilot can be authorized.

This block is source-only. It does not read or write application data and does not touch real data.

## What S4.60 freezes

A future W5 decision packet must identify, without placing raw PII or raw record identifiers in Git:

- current governance-policy version;
- pilot country;
- pilot journey;
- exact allowed W1-W4 stages;
- maximum existing record count;
- one QuoteCase only;
- one data subject only;
- case selector SHA-256 commitment;
- authorized actor selector SHA-256 commitment;
- request-management consent evidence SHA-256 commitment;
- success persistence disposition;
- formal legal validation reference;
- explicit Owner W5 real-data authorization.

## Success persistence disposition

Owner must choose exactly one:

- `ROLLBACK_TO_BEFORE_STATE`;
- `RETAIN_IF_VALID_BUSINESS_RECORD`.

S4.60 intentionally leaves this unset.

## Formal legal evidence package

Under the current frozen governance contract, formal completion still requires accepted GT and CO evidence packets for the exact current governance-policy version.

Per-country evidence requires:
- structurally valid formal legal packet;
- formal document reference;
- original file name;
- SHA-256 document hash;
- issuing organization;
- issue date;
- signed-or-official flag;
- exact reviewed governance-policy version;
- Owner acceptance bound to the same country + document hash;
- explicit Owner acceptance of the country opinion.

Public research cannot substitute this formal evidence.

## Hard locks retained

- execution OFF;
- app-data reads OFF;
- app-data writes OFF;
- real data OFF;
- production OFF;
- one QuoteCase maximum;
- one data subject maximum;
- one execution maximum;
- raw token persistence forbidden;
- marketing default false;
- provider/rater calls forbidden;
- issuance forbidden;
- binding forbidden;
- payment forbidden.

## Current unresolved external gates

- formal GT counsel evidence;
- formal CO counsel evidence;
- exact pilot scope;
- success persistence disposition;
- explicit Owner W5 real-data authorization.

## Important distinction

S4.60 may validate that a future decision packet is structurally complete, but its code remains hard-disabled for execution.

A structurally complete packet does not itself perform or authorize real-data execution.

## Exit

S4.60 closes if:
- accumulated CotComp QA passes;
- S4.60 package tests pass;
- externalGatePackageReady=true;
- executionAllowed=false;
- realDataAllowed=false.

No W5 physical execution is authorized by S4.60.
