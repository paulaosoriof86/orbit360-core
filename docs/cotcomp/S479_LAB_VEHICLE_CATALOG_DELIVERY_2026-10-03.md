# CotComp · S4.79 · LAB read-only vehicle catalog delivery surface

**Fecha:** 2026-10-03  
**Estado inicial:** `DEVELOPED / DEPLOYMENT GATED / LAB-ONLY`

## Objective

Close the S4.78 hard blocker `CATALOG_DELIVERY_SURFACE_REQUIRED` by exposing the pinned public vehicle identity subset as a separate read-only LAB service.

This surface is not a rater, does not access Firestore, and does not change global App Check settings.

## Data package

At deployment time the workflow deterministically rebuilds the pinned SAT snapshot and normalized catalog, then generates a deployment-only JSON package containing only the first-release scope:
- AUTOMOVIL;
- CAMIONETA;
- PICK UP;
- MOTO.

Expected:
- 2,216 identities;
- 119 brands;
- source catalog digest `89a77e66025945d015cc51704441a97437286022cafeef4995962fd750358df8`.

Tax values are excluded.

## HTTP operations

GET only:
- `op=meta`
- `op=brands&vehicleClass=AUTO_LIGHT|MOTO&q=...`
- `op=models&vehicleClass=...&brandId=...&q=...`
- `op=years`
- `op=resolve&vehicleClass=...&brandId=...&modelId=...&vehicleYear=...`

Writes return 405.

## Year semantics

The selector range is 2026 down to 1900 because year is a declared vehicle attribute, not a SAT model-year existence assertion.

The response explicitly carries:
`DECLARED_YEAR_NOT_HARD_MODEL_YEAR_EXISTENCE`.

## Security

- public data only;
- no PII;
- no Firestore/app data;
- no provider/rater;
- LAB project only;
- maxInstances=3;
- strict GET/OPTIONS;
- CORS only for LAB Hosting/Firebase Hosting and localhost;
- immutable catalog ETag;
- no production origin;
- no global App Check change.

## Deployment truth

S4.79 may be called `DEPLOYED` only after:
- accumulated QA remains PASS;
- deterministic catalog package generation passes;
- function-only deploy to `ays-orbit-360-lab`;
- physical GET readback passes;
- POST rejection passes;
- Corolla search + year 2006 resolution passes.

No production release is authorized.
