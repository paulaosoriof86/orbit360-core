# R4S9 — runtime único STOP por contrato de manifest

Fecha: 2026-08-17

## Estado

- Rama: `ays/backend-tenant-lab-v99-20260703`
- PR #5: draft/open; sin main ni merge.
- Producto rootfix Cliente360: commit `861326906558f03d9c8c2e7f34adfb4979a17d73`.
- R4S9 durable artifact: `9299097141`.
- ZIP: `orbit360-fase-a-product-r4s9-861326906558.zip`.
- ZIP SHA256: `9e8566fdc33f4f45b350fd3609c9ee02b22c49edd1d377bff334fc00df902180`.
- Manifest SHA256: `eb3fc2fb2ff46dc78dc1e275ba91bc4af4a5a4fb6bf3870af2f40e8231b08d22`.
- Public byte-exact verify: run `32065001870`, PASS.
- Source-only rebind: commit `c62cf0111ea57dd580006c8d366938041b601947`; run `32065317547`, PASS.

## Matriz runtime única

Activation commit `05c379b788334eec55ee73fca6361baae1764304`.
Run `32065440405`, job `95496324460`, evidence artifact `9299717741`.

La matriz se consumió una sola vez y no puede reintentarse bajo la autorización vigente.

PASS antes del STOP:
- canonical gate;
- browser launch/context/page;
- target HTTPS HTTP 200;
- login form visible;
- public manifest fetch HTTP 200;
- identidad read-only elegible resuelta con roles requeridos y cero writes.

STOP exacto:
- stage `manifest-validated`;
- status manifest R4S9 correcto;
- sourceHead correcto;
- fileCount `194` correcto;
- no se alcanzó login/Auth runtime ni ninguna ruta/rol.

## Causa raíz

Clasificación:

`DATA_CONTRACT_FAILURE / R4S9_SUCCESSOR_MANIFEST_CERTIFICATION_FIELDS_DROPPED`

R4S8 contenía los campos contractuales obligatorios:
- `requiredHydrationCertified: true`
- `dynamicRuntimeClosureCertified: true`
- `productTenantContextCertified: true`
- `routerRenderCertified: true`
- `noLabRuntime: true`
- `noPrivateSecretMaterial: true`
- `writeAuthorized: false`
- metadata adicional de seguridad/closure.

El constructor R4S9 v2 preservó correctamente los 194 archivos de producto y el único delta `modules/cliente360.js`, pero reconstruyó `orbit360-package-manifest.json` sin esos campos. El public verifier probó identidad byte-exacta contra ese manifest, no completitud del contrato runtime, por lo que su PASS no contradecía el STOP posterior.

El harness runtime rechazó correctamente el manifest antes de Auth. No es un defecto de Cliente360 y no justifica tocar `modules/cliente360.js`, `core/queries.js`, store, Auth, Rules o datos.

## Seguridad / writes

- Firestore writes: `0`
- Auth writes: `0`
- operational writes: `0`
- no package rebuild posterior al STOP
- no segundo runtime

## Refreeze inmediato

Commit `48484804b797b7413640032368c50b12c1fc7029` restauró source-only inmediatamente después del STOP.
Run `32065564979`: SUCCESS.

## Gate 3

Gate 3 permanece **ABIERTO**.

No considerar R4S9 runtime-contract certified hasta corregir el mecanismo de construcción/certificación del manifest.

## Próxima acción exacta

Recovery source-only del packaging/manifest:
1. usar R4S8 como contrato rector del manifest;
2. preservar todos los campos de certificación/safety/runtime-closure en la sucesora;
3. añadir gate contractual R4S8→sucesora, además del rehash de 194 archivos;
4. hacer fallar la certificación si desaparece cualquier campo obligatorio;
5. solo después construir/certificar/publicar una sucesora contract-correct.

Cualquier nueva matriz runtime requiere autorización nueva. No main ni merge.
