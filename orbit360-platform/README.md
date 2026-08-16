# Orbit 360 · Plataforma

Estado rector: `docs/orbit360-live-state-v1.json`. Checkpoint vigente: `docs/CIERRE-R4S3-CLIENTE360-BATCH-SUMMARY-ROOTFIX-SOURCE-PASS-20260816.md`. Changelog: `CHANGELOG-R4S3-GOLIVE-20260816.md`.

R4S3 sigue **certificada, publicada y verificada byte a byte** en `app.aysseguros.com`:

- ZIP `orbit360-fase-a-product-r4s3-294ed22bdb56.zip`
- SHA256 `1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e`
- source `294ed22bdb564585b71fc59cefa1d04cdfa6b120`
- 194 archivos
- identidad pública run `31960492114` PASS.

## Auth

La última matriz productiva real, run `31961220051`, confirmó antes del timeout de rendimiento:

- login HTTP 200;
- usuario autenticado y email verificado;
- membership disponible y activa;
- tenant correcto;
- roles requeridos presentes;
- runtime/router/store read-only ready;
- 430 clientes y 30 aseguradoras;
- cero errores de página/consola/HTTP y cero writes.

**Auth no es el bloqueo vigente y no requiere un cambio nuevo.**

## Cliente 360 · causa raíz y rootfix

El timeout del grupo Dirección fue aislado source-only a:

`FUNCTIONAL_DEFECT / CLIENTE360_BATCH_SUMMARY_CONTRACT_MISSING_NX_CLONE`  
Owner: `orbit360-platform/core/queries.js`.

Se autorizó y aplicó exclusivamente ese rootfix en commit `54f671e64b32c7b39100d79e770572a579e79ac7`, implementando/exportando `Orbit.q.clientesResumenIndex()` sin modificar Cliente 360, store, Access, Auth ni datos.

Preflight run `31963457394` PASS.

Validación source-only run `31963555214`, job `95205101103`, artifact `9267857434`, digest `sha256:f04472548212f53ea6d9a9e78acc77729c346b8570bd5f012098a9fe1ca7e43a` → SUCCESS.

Gate boundedness PASS sobre fixture 430/1,375/1,900/900:

- `allCalls=4`
- `getCalls=0`
- `whereCalls=0`
- `cloneRows=4605`
- SHA256 `core/queries.js`: `b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b`.

Regresión semántica PASS: 430/430 resúmenes equivalentes, cero mismatch y API `clienteResumen` preservada.

## Frontera vigente

El rootfix está probado **solo en source**. La R4S3 publicada todavía no contiene el nuevo `core/queries.js`.

También permanece abierto un issue secundario del validador:

`VALIDATOR_STALE_SECONDARY / CUMULATIVE_ROLE_GROUP_BUDGET_AND_ROUTE_ATTRIBUTION`.

No es la causa del trabajo pesado de Cliente 360, pero debe corregirse antes de interpretar otra matriz final.

Browser sigue congelado `SOURCE_ONLY=true`; no hay nuevo paquete, publicación ni matriz autorizados.

Siguiente secuencia: corregir el harness source-only → certificar sucesora mínima con único delta `core/queries.js` → publicar con backup/rollback → ejecutar una única matriz productiva read-only corregida → con `POST_GO_LIVE_SMOKE_PASS`, visualización humana y batería E2E/live.

Sin reimportación, cambios Auth/datos, main ni merge. Avance rector: **100% funcional / 75% técnico / 67% gates (2/3)** hasta el smoke final.
