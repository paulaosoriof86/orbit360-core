# Orbit 360 · Plataforma

Estado rector: `docs/orbit360-live-state-v1.json`. Checkpoint vigente: `docs/CIERRE-R4S3-ROOTCAUSE-CLIENTE360-BATCH-SUMMARY-NX-CLONE-20260816.md`. Changelog: `CHANGELOG-R4S3-GOLIVE-20260816.md`.

R4S3 está **certificada, publicada y verificada byte a byte** en `app.aysseguros.com`:

- ZIP `orbit360-fase-a-product-r4s3-294ed22bdb56.zip`
- SHA256 `1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e`
- source `294ed22bdb564585b71fc59cefa1d04cdfa6b120`
- 194 archivos
- identidad pública run `31960492114` PASS.

La matriz productiva final read-only autorizada fue consumida en run `31961220051`. Antes del STOP pasaron publicación, Auth, login, membership, tenant, roles, runtime/router/store read-only, 430 clientes, 30 aseguradoras, Dirección Inicio y Dirección Cliente 360, con cero errores de browser y cero writes.

El STOP `FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT` quedó ahora **diagnosticado a causa raíz sin repetir browser**.

Diagnóstico source-only/static: run `31962262791`, job `95201876769`, artifact `9267541412` → SUCCESS. Gate canónico fue la primera etapa ejecutable y pasó.

Owner único probado:

`FUNCTIONAL_DEFECT / CLIENTE360_BATCH_SUMMARY_CONTRACT_MISSING_NX_CLONE`  
`orbit360-platform/core/queries.js`

Cliente 360 ya intenta usar `q.clientesResumenIndex()`, pero `core/queries.js` no lo implementa/exporta. La lista cae en `q.clienteResumen(c.id)` al menos 470 veces en la carga inicial. Cada resumen provoca clones de colecciones completas a través del store read-only. Sobre el fixture versionado 430/1,375/1,900/900, el lower bound es **2,164,350 filas clonadas**, frente a ~4,605 para una pasada batched: amplificación estructural **470×**.

El timeout acumulativo de 90 s quedó reclasificado como `VALIDATOR_STALE_SECONDARY / CUMULATIVE_ROLE_GROUP_BUDGET_AND_ROUTE_ATTRIBUTION`: explica la truncación de Aseguradoras, pero no es el root owner. Aseguradoras no produjo PASS/FAIL propio y no es el owner terminal probado.

Gate correctivo versionado: `tools/orbit360-r4-cliente360-summary-boundedness-gate-v20260816.mjs`. R4S3 actual produce el FAIL esperado `CLIENTE360_BATCH_SUMMARY_CONTRACT_MISSING`. Para cerrar debe existir/exportarse `Orbit.q.clientesResumenIndex` como Map batched preservando semántica y cumplir `allCalls<=8`, `getCalls<=10`, `cloneRows<=20000` en el fixture versionado.

**No se aplicó el rootfix de producto.** Browser permanece congelado `SOURCE_ONLY=true`; no hay nueva matriz, deploy, reimportación, Auth/data changes, main ni merge autorizados.

La siguiente frontera requiere autorización explícita para modificar únicamente `core/queries.js`, ejecutar gate canónico + gate de boundedness + regresión semántica. Empaquetado/publicación/browser quedan fuera de esa autorización hasta un gate posterior.

Avance: **100% funcional / 75% técnico / 67% gates (2/3)** hasta `POST_GO_LIVE_SMOKE_PASS`.
