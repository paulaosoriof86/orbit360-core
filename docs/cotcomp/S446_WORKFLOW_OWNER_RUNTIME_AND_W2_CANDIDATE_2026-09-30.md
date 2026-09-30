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
