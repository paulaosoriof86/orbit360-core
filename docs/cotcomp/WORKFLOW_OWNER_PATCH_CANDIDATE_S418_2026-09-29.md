# CotComp Workflow Owner Patch Candidate · S4.18

**Date:** 2026-09-29  
**Status:** `PATCH SPECIFICATION ONLY / LIVE OWNER NOT MUTATED / PRODUCT SOURCE AUTHORIZATION REQUIRED`

## Target owner

Repository:
`paulaosoriof86/orbit360-core`

Canonical live branch:
`recovery/fase-a-clean-20260831`

Owner:
`functions/ops-leads-domain.js`

Reviewed owner blob:
`d0a1e116186bba860d34ec540e8abba81830b553`

## Exact intended delta

The future candidate patch must be minimal:

1. add a validator/sanitizer for one nested object:
   `cotcompRef`;

2. preserve `cotcompRef` on new `negocios`;

3. preserve `cotcompRef` on new `gestiones`;

4. allow controlled `cotcompRef` update on existing business/management records.

### cotcompRef schema

- schemaVersion
- role
- caseId
- journeyId
- correlationId
- quoteCasePath
- selectedProposalId (optional)
- intakeStatus

Required together:
- caseId
- journeyId
- correlationId

Partial references fail closed.

## Explicit non-delta

The patch must not change:
- Firebase Auth;
- membership authorization;
- role/permission logic;
- workflow collection paths;
- storageMode logic;
- default stage graph;
- transition rules;
- unrelated business/management fields;
- notification provider behavior;
- production data;
- any non-CotComp module.

## Why this is required

The current live `negocios` / `gestiones` owner cannot preserve the CotComp correlation contract. Without this extension, projecting a QuoteCase would lose the canonical relationship required by A&S.

## Apply gate

Do not apply this patch to the live canonical branch by inference.

Before a source candidate branch is opened/applied:
- explicit product-source authorization;
- re-read current live owner HEAD/blob;
- fail closed on owner drift;
- patch only the effective owner;
- run syntax + domain QA;
- create preview/release evidence under Gravicentra governance;
- no production deployment without its later gate.

## Next action

`OWNER AUTHORIZATION → CREATE ISOLATED RECOVERY-BASED PATCH CANDIDATE → QA → NO DEPLOY`
