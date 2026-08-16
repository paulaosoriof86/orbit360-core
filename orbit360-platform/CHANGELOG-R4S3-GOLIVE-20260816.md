# CHANGELOG · R4S3 Go-Live · 2026-08-16

## R4S3 publicada

R4S3 permanece certificada y publicada sin cambios:

- ZIP `orbit360-fase-a-product-r4s3-294ed22bdb56.zip`
- SHA256 `1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e`
- source `294ed22bdb564585b71fc59cefa1d04cdfa6b120`
- 194 archivos
- identidad pública exacta PASS run `31960492114`.

## Matriz productiva final consumida

Run `31961220051`, job `95199386898`, artifact `9267316246`.

Antes del STOP pasaron manifest, Auth, login, membership, tenant, roles, runtime/router/store read-only, 430 clientes, 30 aseguradoras, Dirección Inicio y Dirección Cliente 360, con cero page/console/HTTP/write errors.

Auth quedó confirmado: login HTTP 200, signed-in, email verificado, membership activa, tenant correcto y roles requeridos. No es el bloqueo vigente.

El fallo terminal fue `FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_TIMEOUT`.

## Diagnóstico de causa raíz

Run source-only `31962262791`, job `95201876769`, artifact `9267541412` → SUCCESS.

Owner único:

`FUNCTIONAL_DEFECT / CLIENTE360_BATCH_SUMMARY_CONTRACT_MISSING_NX_CLONE`  
`orbit360-platform/core/queries.js`.

Cliente 360 ya solicitaba `q.clientesResumenIndex()`, pero `core/queries.js` no lo implementaba/exportaba. El fallback ejecutaba al menos 470 resúmenes individuales y provocaba N×clone de colecciones completas. Lower bound sobre fixture 430/1,375/1,900/900: 2,164,350 filas clonadas frente a 4,605 para una pasada batched.

El timeout acumulativo de 90 s fue reclasificado como issue secundario `VALIDATOR_STALE_SECONDARY / CUMULATIVE_ROLE_GROUP_BUDGET_AND_ROUTE_ATTRIBUTION`: explica truncación/atribución ambigua, no es el root owner.

## Rootfix Cliente 360 autorizado y aplicado

Preflight source-only run `31963457394`, job `95204846120` → PASS. El gate canónico fue la primera etapa ejecutable.

Único archivo de producto modificado:

`orbit360-platform/core/queries.js`

Commit funcional: `54f671e64b32c7b39100d79e770572a579e79ac7`.

Se implementó/exportó `Orbit.q.clientesResumenIndex()` como agregación batched/bounded de una pasada preservando el contrato de `clienteResumen`.

No se modificaron `modules/cliente360.js`, store, Access, Auth ni datos.

## Validación source-only

Run `31963555214`, job `95205101103`, artifact `9267857434`, digest `sha256:f04472548212f53ea6d9a9e78acc77729c346b8570bd5f012098a9fe1ca7e43a` → SUCCESS.

Gate boundedness:

- `CLIENTE360_SUMMARY_BOUNDEDNESS_GATE_PASS`
- `allCalls=4`
- `getCalls=0`
- `whereCalls=0`
- `cloneRows=4605`
- límites: 8 / 10 / 20,000
- SHA256 `core/queries.js`: `b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b`.

Regresión semántica:

- `CLIENTE360_SUMMARY_SEMANTIC_REGRESSION_PASS`
- Map 430/430
- semántica equivalente
- cero mismatch
- API `clienteResumen` preservada
- batch 4 `all`, 0 `get`, 0 `where`.

Control de delta PASS: desde el preflight, el único archivo bajo `core/modules/data` modificado fue `core/queries.js`.

No browser, secretos, datos, deploy, paquete, producción ni writes.

## Próxima frontera

El fix todavía no está en la R4S3 publicada. Browser permanece congelado.

Antes de una nueva matriz final debe cerrarse source-only el issue secundario de atribución/budget del harness. Después: certificar una sucesora mínima de R4S3 con único delta `core/queries.js`; verificar byte-identidad del resto; publicar con backup/rollback; ejecutar una única matriz productiva read-only corregida; solo con `POST_GO_LIVE_SMOKE_PASS` abrir visualización humana y pruebas E2E/live.

Sin reimportación, cambios Auth/datos, main ni merge.
