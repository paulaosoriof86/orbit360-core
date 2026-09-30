# CotComp S4.46 · Workflow owner runtime verification + W2 candidate

**Date:** 2026-09-30  
**Status:** `SOURCE-ONLY + READ-ONLY RUNTIME VERIFICATION / W2 EXECUTION OFF / W2 WRITES OFF / REAL DATA OFF / PRODUCTION OFF`

## Goal

After W1 physical PASS, verify that the Gravicentra Leads/Ops runtime in LAB actually contains the exact S4.20 owner source and prepare the W2 synthetic workflow-projection contract without executing it.

## Canonical owner

Recovery branch:
`recovery/fase-a-clean-20260831`

Observed recovery head:
`43b64b77c39b86153a5a34abb50d29da4074ec96`

Owner file:
`functions/ops-leads-domain.js`

Expected Git blob:
`73e09a4404cb4298dc34c9c38e26ad1f960d3170`

The source supports `cotcompRef` in business and management creation/update.

## Read-only runtime proof strategy

1. authenticate only to `ays-orbit-360-lab`;
2. read function inventory;
3. locate an active Leads/Ops callable;
4. describe the deployed Gen2 function;
5. read its Cloud Functions source archive without changing it;
6. extract `ops-leads-domain.js`;
7. calculate Git blob hash with `git hash-object`;
8. require exact equality with the canonical S4.20 owner blob;
9. upload only sanitized evidence.

No application-data read/write is required for the source verification.

## W2 candidate

W2 compiles two deterministic canonical commands:
- `create_business`
- `create_management`

Both carry `cotcompRef`.

Execution/calls/writes remain hard-off.

## Notification safety

The synthetic payload intentionally omits advisor and client IDs. That is not yet enough to claim zero notification side effects because the canonical domain can derive advisor context from the authenticated actor and tenant configuration can affect outbox behavior.

Therefore W2 remains blocked until a read-only proof confirms that the future synthetic identity/configuration produces zero provider-notification targets.

## W2 remaining gates

- exact runtime owner proof;
- zero-notification-side-effect proof;
- W2 synthetic cleanup harness;
- explicit Owner W2 authorization;
- explicit W2 deploy authorization.

S4.46 opens none of those write gates.


## Observed read-only runtime result

Corrected read-only workflow:

`36785840790 = SUCCESS`

Evidence artifact:

`11129294030`

Artifact digest:

`sha256:282bf1bb5ed3d1b2c8ffafe547c8638418a132852819647ad2beadc2e596e051`

The LAB source archive was successfully read without application-data access or mutation.

Primary runtime function observed:

- `orbit360OpsLeadsCommand`
- state: `ACTIVE`
- environment: `GEN_2`
- runtime: `nodejs22`
- update time: `2026-09-13T02:56:31.995474351Z`
- build: `f7023f11-606f-4be9-8aa5-a0dc839b858c`

Git-compatible blob extracted from the deployed source archive:

`d0a1e116186bba860d34ec540e8abba81830b553`

Canonical S4.20 owner blob:

`73e09a4404cb4298dc34c9c38e26ad1f960d3170`

Result:

`exactOwnerBlobMatch=false`

`workflowOwnerRuntimeVerified=false`

Blocker:

`DEPLOYED_OWNER_BLOB_MISMATCH`

## Forensic significance of the mismatch

The deployed blob `d0a1e116186bba860d34ec540e8abba81830b553` was read directly from the LAB deployment source archive.

That blob contains the existing Leads/Ops create/update workflow but has **zero `cotcompRef` occurrences** and no `sanitizeCotcompRef` implementation.

The current canonical S4.20 owner blob is `73e09a4404cb4298dc34c9c38e26ad1f960d3170`; it is **not** the deployed blob and it adds validated `cotcompRef` preservation to business and management creation/update.

Therefore W2 cannot be declared runtime-compatible while the primary LAB Leads/Ops function remains on the older deployed owner.

## W2 candidate hardening completed in S4.46

The W2 source candidate now:

- uses the exact canonical S4.20 `cotcompRef` shape;
- uses roles `LEAD_PROJECTION` and `OPS_QUOTATION_PROJECTION`;
- uses `selectedProposalId` rather than unsupported proposal/selection keys;
- mirrors the owner request-identity algorithm with a payload-bound request ID;
- freezes business stage `cotizando`;
- freezes business/management type `Cotización`;
- freezes Ops list `Cotizaciones`;
- keeps execution/calls/writes hard-off.

### Idempotency rationale

The deployed/current owner request ledger reuses an explicit committed request ID without independently comparing a request payload digest.

W2 therefore binds each synthetic request ID to the exact payload using the same stable request-identity algorithm as the owner.

A changed payload must produce a different request ID; it must not reuse the same explicit request identity silently.

## Notification / outbox finding

A successful owner create requires an advisor ID, either supplied explicitly or derived from the authenticated actor.

The owner then creates an advisor notification target and writes a `notificationOutbox` document when targets exist.

Therefore a future W2 physical proof cannot claim zero workflow side effects simply by omitting `asesorId` from the payload.

W2 now freezes the correct boundary:

- notification outbox creation is an expected owner-side effect;
- provider delivery must be isolated/disabled;
- every outbox record must be journaled;
- every outbox record must be included in controlled cleanup;
- portal notification is not expected when no client ID is used.

Expected owner-created documents for the two-command W2 synthetic proof:

- business command: entity + workflow event + workflow request + notification outbox = 4;
- management command: entity + workflow event + workflow request + notification outbox = 4;
- total expected creates = 8.

This does **not** authorize those writes.

## Final S4.46 release truth

Proven:
- W1 physical baseline remains valid;
- LAB Leads/Ops source archive is readable read-only;
- exact deployed owner blob is known;
- deployed owner is older than canonical S4.20;
- deployed owner does not support `cotcompRef`;
- W2 source candidate is aligned to canonical S4.20 schema and payload-bound request identity.

Still closed:
- owner alignment deploy;
- W2 execution;
- W2 application-data writes;
- provider delivery;
- real data;
- production.

## Next gate

Before W2 can be physically tested, the LAB Leads/Ops owner must first be aligned from:

`d0a1e116186bba860d34ec540e8abba81830b553`

to canonical:

`73e09a4404cb4298dc34c9c38e26ad1f960d3170`

with QA/readback and without application-data writes.

That owner-alignment deploy requires a separate explicit Owner authorization.
