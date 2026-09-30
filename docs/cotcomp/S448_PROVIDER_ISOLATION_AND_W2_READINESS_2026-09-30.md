# CotComp S4.48 — Provider isolation + W2 readiness

Date: 2026-09-30

## Scope

S4.48 is source-only/read-only. It does not execute W2, does not invoke `orbit360OpsLeadsCommand`, does not read or write application data, does not deliver provider notifications, does not use real data, and does not touch production.

## Inputs already closed

- S4.47 physical runtime owner alignment: exact owner blob `73e09a4404cb4298dc34c9c38e26ad1f960d3170`.
- Primary LAB owner function: `orbit360OpsLeadsCommand`.
- W2 candidate remains execution OFF / calls OFF / writes OFF.
- W2 scope remains only synthetic `create_business` + `create_management` with `cotcompRef`.

## S4.48 proof objectives

1. Re-read the deployed LAB owner source physically and require the exact S4.20 blob.
2. Verify that the owner only journals `notificationOutbox` as `pending_provider` and contains no direct provider-delivery marker.
3. Read deployed Functions/Eventarc inventory and fail closed if an automatic consumer of `notificationOutbox` is observed or if the required inventory cannot be read.
4. Materialize a deterministic W2 journal for the eight expected owner documents: entity + event + request + notification outbox for each of the two commands.
5. Prove source-only retry/conflict/cleanup/final-absence semantics in an in-memory harness.
6. Keep W2 physically disabled.

## Important boundary

The W2 entity path depends on the tenant runtime storage mode (`legacyCompatible` or `canonicalV2`). S4.48 therefore does not invent that value. The harness supports both forms and fails closed until a later authorized runtime-config readback resolves the actual mode.

Provider isolation in S4.48 means: no direct delivery in the deployed owner source and no automatic outbox consumer found in the read-only Functions/Eventarc inventory examined by the workflow. It does not convert W2 into an authorized write stage.

## Gate after S4.48

Even with provider isolation PASS and the source harness ready, W2 remains closed until all remaining gates are satisfied, including runtime configuration readback and explicit Owner authorization for the synthetic W2 write proof.
