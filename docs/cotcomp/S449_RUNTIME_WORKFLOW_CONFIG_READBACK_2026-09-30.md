# CotComp S4.49 — Runtime workflow-config / storage-mode readback

Date: 2026-09-30

## Scope

S4.49 is a narrow read-only runtime proof. It is authorized to perform exactly one application-data read attempt against:

`tenants/alianzas-soluciones/config/workflow`

Only the fields `storageMode` and `version` are requested through a Firestore REST field mask.

S4.49 does not write application data, does not execute W2, does not deliver notifications, does not deploy, does not mutate IAM/Firebase configuration, does not use real client/business records, and does not touch production.

## Why this gate exists

The deployed S4.20 owner selects the workflow entity path from the tenant workflow config:

- exact raw `storageMode === canonicalV2` → canonical V2 entity path;
- any other value or absent config document → `legacyCompatible`.

S4.48 prepared both journal shapes but intentionally did not invent which one the tenant actually uses.

## Evidence required

1. Re-read the active primary LAB owner source physically and require exact S4.20 blob.
2. Verify the source markers that define the config document path and effective storage-mode fallback.
3. Read exactly one config document with a field mask.
4. Derive the effective storage mode only from the physical owner semantics + returned config state.
5. Preserve all W2 call/write locks.

## Exit

If PASS, `W2_RUNTIME_CONFIG_READBACK_REQUIRED` closes.

Even after PASS, W2 remains stopped on:

`OWNER_W2_AUTHORIZATION_REQUIRED`

No physical W2 execution is authorized by S4.49.
