# CotComp Workflow Projection Extension Contract · S4.17 / F8-G4

**Date:** 2026-09-29  
**Status:** SOURCE-ONLY / MINIMAL OWNER EXTENSION DEFINED / NO OWNER FILE MUTATION / NO WRITES

## Objective

Close the exact schema gap found in S4.14 without creating a parallel Leads/Ops owner.

The live owner remains:
- repo: `paulaosoriof86/orbit360-core`
- branch: `recovery/fase-a-clean-20260831`
- file: `functions/ops-leads-domain.js`
- reviewed blob: `d0a1e116186bba860d34ec540e8abba81830b553`

## Minimal extension

A future patch to the real owner should add only one nested object to both business and management schemas:

`cotcompRef`

Contents:
- caseId
- journeyId
- correlationId
- quoteCasePath
- selectedProposalId when applicable
- projection role
- intakeStatus

No duplicate top-level identifiers are required.

## Why nested

A single nested correlation object reduces field duplication and allows current Leads/Ops fields to remain stable.

It also makes the CotComp projection identifiable without transferring CotComp source-of-truth authority to Leads/Ops.

## Current workflow semantics

The current workflow stage `cotizando` is retained for operational visibility because it already projects into Leads + Ops/Cotizaciones.

The CotComp semantic intake status remains separately:
`lead_recibido`

No global workflow stage is added in this block.

## Assignment

The owner/advisor is tenant-configured, never hardcoded in the public app.

A future CotComp config document must provide:
- ownerAdvisorId
- ownerUserUid
- notification channels
- optional ops list/workflow stage overrides

Initial state:
`PENDING_OWNER_DECISION`

Owner action:
- work myself
- assign another advisor

Reassignment mutates the same business/management projections; it does not create duplicates.

## Notifications

Target channels remain:
- in-app/platform
- WhatsApp
- email

Delivery remains release-gated. No live-delivery claim.

## Patch discipline

A future source patch to the live owner may:
- preserve validated `cotcompRef` in sanitizeBusiness;
- preserve validated `cotcompRef` in sanitizeManagement;
- allow controlled updates to `cotcompRef`.

It must not alter:
- auth rules;
- storage paths;
- existing workflow stages;
- unrelated collections;
- unrelated modules.

## Next gate

Execute source-only QA for S4.15–S4.17 and then prepare the exact minimal patch against the current live-owner blob.

Applying that patch requires its own product-source authorization and release discipline; S4.17 itself does not mutate the live owner.
