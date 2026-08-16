# CIERRE R4S3 · Cliente 360 batch-summary rootfix source-only PASS · 2026-08-16

## Contexto

R4S3 publicada permanece inmutable en `app.aysseguros.com`. La matriz productiva read-only run `31961220051` confirmó Auth/login/membership/tenant/runtime/store read-only y luego agotó el presupuesto del grupo Dirección por costo dominante de Cliente 360.

Diagnóstico source-only run `31962262791` aisló el owner único en `orbit360-platform/core/queries.js`: `FUNCTIONAL_DEFECT / CLIENTE360_BATCH_SUMMARY_CONTRACT_MISSING_NX_CLONE`.

## Autorización consumida

Se autorizó exclusivamente implementar/exportar `Orbit.q.clientesResumenIndex` en `core/queries.js`, preservando `clienteResumen`, sin modificar Cliente 360, store, Access, Auth, datos ni otro archivo de producto; gate canónico primero, boundedness + regresión semántica después; sin paquete, publicación ni browser.

## Preflight

Run `31963457394`, job `95204846120` → PASS.

- gate canónico primero: PASS
- source-only: true
- browser/secrets/data/deploy/production: false
- writes: 0

## Rootfix aplicado

Único archivo de producto modificado: `orbit360-platform/core/queries.js`.

Commit funcional: `54f671e64b32c7b39100d79e770572a579e79ac7`.

Se implementó/exportó `Orbit.q.clientesResumenIndex()` como agregación batched de una pasada sobre `clientes`, `polizas`, `cobros` y `comisiones`, agrupando por `clienteId` y construyendo el mismo contrato de resumen que `clienteResumen`.

No se modificaron `modules/cliente360.js`, store, Access, Auth ni datos.

## Validación source-only

Workflow commit `1949f0321a18ca31a2f13afc58057adf0e9a5c85`.

Run `31963555214`, job `95205101103`, artifact `9267857434`, digest `sha256:f04472548212f53ea6d9a9e78acc77729c346b8570bd5f012098a9fe1ca7e43a` → SUCCESS.

### Gate canónico

PASS, 13 checks, cero capabilities runtime.

### Gate boundedness

`CLIENTE360_SUMMARY_BOUNDEDNESS_GATE_PASS`.

Fixture versionado: 430 clientes / 1,375 pólizas / 1,900 cobros / 900 comisiones.

- `allCalls=4`
- `getCalls=0`
- `whereCalls=0`
- `cloneRows=4605`
- thresholds: `allCalls<=8`, `getCalls<=10`, `cloneRows<=20000`
- shape PASS
- `core/queries.js` SHA256: `b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b`.

La amplificación anterior de al menos 2,164,350 filas clonadas queda eliminada en el contrato source-only; la ruta batched usa 4,605 filas clonadas en el fixture.

### Regresión semántica

`CLIENTE360_SUMMARY_SEMANTIC_REGRESSION_PASS`.

- 430/430 resúmenes equivalentes al contrato `clienteResumen`
- `Map` de 430 entradas
- API `clienteResumen` preservada
- batch `allCalls=4`, `getCalls=0`, `whereCalls=0`
- cero mismatch.

### Control de delta

Desde el preflight hasta el HEAD de validación, el único archivo bajo `orbit360-platform/core`, `modules` o `data` que cambió fue `orbit360-platform/core/queries.js`.

## Estado de Auth

Auth no fue modificado por este bloque. La última matriz productiva real ya había confirmado login HTTP 200, usuario autenticado, email verificado, membership disponible/activa, tenant correcto, roles requeridos, runtime/router/store read-only y cero errores/escrituras antes del timeout de rendimiento. Por tanto Auth no es el bloqueo vigente.

## Frontera vigente

El fix está probado solo en source. La R4S3 publicada todavía no contiene `core/queries.js` corregido.

Browser permanece congelado y la matriz anterior sigue consumida. El harness conserva un issue secundario `VALIDATOR_STALE_SECONDARY / CUMULATIVE_ROLE_GROUP_BUDGET_AND_ROUTE_ATTRIBUTION`, que debe corregirse antes de interpretar otra matriz como definitiva.

Siguiente secuencia recomendada, con autorización explícita:

1. corregir source-only la atribución/budgets por ruta del harness, sin producto;
2. certificar sucesora mínima de R4S3 cuyo único delta de producto sea `core/queries.js` SHA256 `b906c1d...`;
3. comprobar byte-identidad del resto del paquete;
4. publicar únicamente la sucesora certificada con backup/rollback;
5. ejecutar una única matriz productiva read-only corregida;
6. con PASS `POST_GO_LIVE_SMOKE_PASS`, abrir visualización humana y pruebas E2E/live guiadas.

Sin reimportación, cambios Auth/datos, main ni merge.
