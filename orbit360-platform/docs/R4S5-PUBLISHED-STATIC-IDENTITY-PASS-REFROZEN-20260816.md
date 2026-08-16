# Orbit 360 A&S — R4S5 publicada · identidad estática PASS · refreeze source-only — 2026-08-16

## Estado

`R4S5_PUBLISHED_STATIC_IDENTITY_PASS_REFROZEN_SOURCE_ONLY` — **SUCCESS**.

La R4S5 durable certificada fue publicada en `https://app.aysseguros.com` mediante handoff externo autorizado a HostDime y quedó verificada por identidad estática exacta. No hubo reconstrucción del paquete ni cambios de producto.

## Identidad publicada

- Artifact durable: `9270227820`
- ZIP: `orbit360-fase-a-product-r4s5-5474a1a9af64.zip`
- SHA256 ZIP: `2d7a2ae75c5e6ef04c4759ff3438d41b8589d542fc20f14a603aaffb2053a1ac`
- Source/delta: `5474a1a9af64c018e6dcc71b4ad0cdfe57ce0484`
- Manifest: `FASE_A_PRODUCT_R4S5_MINIMAL_SUCCESSOR_CERTIFIED`
- File count: `194`
- Unchanged vs R4S4: `193`
- Delta único: `core/client-insurer-visual-contract-v20260720.js`
- Delta SHA256: `ad6fa96614d4eefe29880fac26a1c349ae24940adc2d8ff75ad04d991595b067`
- `core/queries.js`: `b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b`

## Public identity verification

Workflow: `.github/workflows/orbit360-r4s5-public-identity-static-v20260816.yml`

- Run: `31973486406`
- Job: `95229410788`
- Resultado: **SUCCESS**
- Evidencia artifact: `9270423497`
- Evidencia digest: `c3a73df16a1522c77fe4c8ed9ebb554a51193b2e40a8820adad3a357fb14f451`

Se verificaron por HTTP, sin navegador, hashes exactos de:
- `index.html`
- `orbit360-package-manifest.json`
- `core/access-scope.js`
- `core/auth-product-runtime-p0.js`
- `core/queries.js`
- `core/client-insurer-visual-contract-v20260720.js`
- `modules/policy-receipts-v1199-detail-guard.js`

El gate canónico pasó antes y después de la observación pública.

## Refreeze source-only

Workflow: `.github/workflows/orbit360-r4s5-postpublish-refreeze-source-only-v20260816.yml`

- Run: `31973556582`
- Job: `95229579825`
- Resultado: **SUCCESS**
- Evidencia artifact: `9270441245`
- Evidencia digest: `3648bd712eb3e3e783ddac9826e1eb6cadb88b668922769373e5d5829bb1f4bd`

El refreeze probó:
- R4S5 continúa siendo la identidad pública exacta;
- el workflow de smoke/browser mantiene `ORBIT360_R4_CERTIFIED_SOURCE_ONLY: 'true'`;
- los pasos que instalan Playwright, acceden a secretos, resuelven identidad protegida y ejecutan navegador permanecen condicionados a `SOURCE_ONLY != 'true'`;
- no hubo activación runtime.

## Alcance y seguridad

Durante publicación/verificación/refreeze:
- paquete reconstruido: **no**;
- producto modificado: **no**;
- Auth modificado: **no**;
- datos modificados: **no**;
- Rules/store modificados: **no**;
- browser ejecutado: **no**;
- runtime ejecutado: **no**;
- secretos leídos por los gates: **no**;
- Firestore writes: `0`;
- Auth writes: `0`;
- operational writes: `0`;
- main/merge: **no**.

La mutación productiva autorizada fue exclusivamente la sustitución de archivos públicos R4S4→R4S5 en HostDime por extracción del ZIP exacto ya certificado.

## Rollback

Rollback inmediato de publicación: R4S4 exacta:
- ZIP `orbit360-fase-a-product-r4s4-54f671e64b32.zip`
- SHA256 `f266815e26da04a8c9e86b0db9414ca6c06bedb3cd9371f85e96c8d08e420d4c`

R4S3 durable permanece como rollback anterior:
- ZIP `orbit360-fase-a-product-r4s3-294ed22bdb56.zip`
- SHA256 `1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e`

## Estado de go-live

- funcional: `100%`
- técnico: `90%`
- gates: `2/3 = 67%`
- Gate 3 `POST_GO_LIVE_SMOKE_PASS`: **abierto**

R4S5 ya es baseline público canónico, pero todavía **no se ejecutó la matriz read-only sobre R4S5**. Esa matriz requiere autorización explícita separada.

## Siguiente acción exacta

Con autorización nueva y exclusiva, preparar primero el binding source-only del smoke a la identidad R4S5 exacta, ejecutar el gate canónico y solo con PASS activar **una única** matriz read-only Dirección desktop / Operativo tablet / Asesor móvil contra la R4S5 pública. Debe confirmar Cliente 360, Aseguradoras, roles/scopes, 430 clientes, 30 aseguradoras, cero copy técnico, cero errores browser/HTTP y cero escrituras. Ante cualquier STOP: no segundo intento; clasificar causa raíz y refreeze inmediato.

No deploy ni nueva publicación son necesarios para esa matriz: R4S5 ya está pública.

## Clasificación reusable

- Claude: `REPLICABLE_CLAUDE_ACUMULADO`
- Academia: `ACADEMIA_ACTUALIZAR`

Patrón reusable: separar durable artifact → prepublish exacto → transporte externo autenticado → verificación pública por identidad → refreeze source-only → runtime solo bajo autorización independiente.
