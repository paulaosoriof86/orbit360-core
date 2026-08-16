# STOP R4S4 — matriz corregida consumida · Cliente 360 N× projection clone

Fecha: 2026-08-16

## Estado

La única matriz R4S4 corregida autorizada fue consumida una sola vez y quedó refrozen inmediatamente.

- runtime run: `31968334075`
- job: `95216801889`
- evidence artifact: `9269114049`
- artifact SHA256: `706b4f98de572ec7da572d9397d76c5650dd24819c9bee97c41823ffea251b98`
- activation commit: `7467bf26d9aab0180f5cd57e4c5c5c550ff59ec0`
- refreeze commit: `9813618620714913a016fd2f89a3a9ea077a9f2b`
- refreeze source-only run: `31968457286` → SUCCESS
- browser rerun allowed: **NO**

R4S4 publicada permanece exacta:

- ZIP `orbit360-fase-a-product-r4s4-54f671e64b32.zip`
- SHA256 `f266815e26da04a8c9e86b0db9414ca6c06bedb3cd9371f85e96c8d08e420d4c`
- source `54f671e64b32c7b39100d79e770572a579e79ac7`
- 194 archivos
- único delta R4S3→R4S4: `core/queries.js`
- R4S3 preservada como rollback.

No se modificaron producto, Auth, datos, Rules, HostDime ni paquetes durante esta ejecución/diagnóstico.

## Lo que pasó

La matriz corrigió el defecto anterior del validador: cada ruta tenía stage de 30 s y readiness observable de 25 s, sin `.catch()` silencioso.

Pasaron antes del STOP:

- gate canónico `fase-a-ops-leads-crm-release-lab-v20260812`;
- manifest R4S4 exacto;
- asset Auth productivo exacto;
- login HTTP 200;
- signed-in y email verified;
- membership activa;
- tenant correcto;
- roles requeridos presentes;
- runtime/router/tenant context listos;
- store `ready-read-only`;
- 430 clientes;
- 30 aseguradoras;
- Dirección activa;
- scope Cliente 360 `all`;
- 430/430 clientes visibles por scope;
- Inicio PASS;
- cero page errors;
- cero console errors;
- cero HTTP failures;
- cero write signals;
- Firestore/Auth/operational writes = 0.

Fallo terminal:

- stage: `role-Dirección-route-cliente360`
- error: `page.waitForFunction: Timeout 25000ms exceeded.`
- clasificación emitida por harness: `FUNCTIONAL_DEFECT / R4_ROLE_ROUTE_STAGE_FAILED`
- elapsed terminal: ~69.0 s desde inicio del harness.

El mismo stage ya había fallado en la matriz anterior R4S4 con readiness stale de 8 s. Al repetirse ahora con readiness real de 25 s, aplica STOP_RETRY obligatorio: no se permite ampliar timeouts ni ejecutar otra matriz.

## Causa raíz source-only

Clasificación de causa raíz:

`FUNCTIONAL_DEFECT / CLIENT_VISUAL_PROJECTION_SEGMENTATION_NX_CLONE_COMPOSED_READONLY_STORE`

Owner único aislado:

`orbit360-platform/core/client-insurer-visual-contract-v20260720.js`

Cadena determinística:

1. `installClientReadProjection()` reemplaza `Orbit.store.all` por `projectedAll`.
2. Para `clientes`, `projectedAll('clientes')` ejecuta `rows.map(projectClient)`.
3. `projectClient(row)` siempre calcula `out.segmento = segmentFor(out)`.
4. `segmentFor(row)` ejecuta `rawRows('polizas')` para **cada cliente**.
5. `rawRows` usa `meta.nativeAll`, que en el store productivo read-only es el `all()` nativo clone-on-read.
6. Por tanto, una sola llamada a `Orbit.store.all('clientes')` proyecta 430 clientes y vuelve a clonar las 1,375 pólizas 430 veces.
7. Si existe umbral Premium configurado, `segmentFor` además ejecuta `rawRows('cobros')` por cliente.
8. R4S4 optimizó correctamente `q.clientesResumenIndex()`, pero esa función llama `S().all('clientes')`; por composición recibe el wrapper visual anterior y vuelve a pagar el N× antes de usar el índice batched.

Lower bound con fixture certificado 430 clientes / 1,375 pólizas / 1,900 cobros:

- una `all('clientes')` proyectada, sin contar cobros Premium: `430 + 430×1,375 = 591,680` filas clonadas;
- con umbral Premium activo: `591,680 + 430×1,900 = 1,408,680` filas clonadas;
- Cliente 360 ejecuta al menos dos `all('clientes')` en su render inicial (`lista()` + `clientesResumenIndex()`): lower bound `1,183,360` filas, o `2,817,360` si aplica Premium;
- el enhancer visual `enhanceClient360()` vuelve a ejecutar `Orbit.store.all('clientes')`, elevando el lower bound compuesto a `1,775,040` filas, o `4,226,040` con Premium, antes de contar otras lecturas.

La cronología runtime es coherente con esta causa:

- `role-Dirección-activation` tardó ~23.18 s; el cambio de rol dispara render de la ruta corriente y `Inicio` contiene `Orbit.store.all('clientes')`, por lo que también atraviesa la misma proyección N×;
- `Inicio` luego obtuvo PASS;
- Cliente 360 agotó 25 s en el mismo main thread/composición antes de que Playwright pudiera observar readiness terminal.

Esto explica por qué el rootfix batched de `core/queries.js` es correcto pero insuficiente en runtime compuesto. `queries.js` no se reabre como owner de este STOP.

## Qué NO es el blocker

Con la evidencia actual no se atribuye el STOP a:

- Auth o credenciales;
- membership/tenant;
- scopes de Dirección;
- HostDime o identidad pública R4S4;
- datos faltantes de clientes/aseguradoras;
- writes;
- HTTP/consola;
- `core/queries.js` batched;
- presupuesto 8 s anterior del validador.

## Refreeze

Run `31968457286` → SUCCESS:

- `ORBIT360_R4_CERTIFIED_SOURCE_ONLY=true`;
- gate canónico PASS;
- gate rol/ruta PASS;
- regresión team/own PASS;
- watchdog PASS;
- Playwright skipped;
- credenciales skipped;
- identidad runtime skipped;
- browser skipped.

## Próxima frontera

No existe autorización para modificar el owner ni ejecutar otra matriz.

La próxima autorización, si se concede, debe limitarse a:

1. corregir exclusivamente la proyección/segmentación N× de `core/client-insurer-visual-contract-v20260720.js`, sin tocar `queries.js`, Auth, store productivo, datos ni Rules;
2. preservar semántica de segmentación y proyección visual;
3. crear/ejecutar un gate source-only de composición contra store clone-on-read que mida el costo de `Orbit.store.all('clientes')` y Cliente 360 completo con 430/1,375/1,900;
4. exigir boundedness + equivalencia semántica + gate canónico PASS;
5. solo después decidir una sucesora mínima certificada de R4S4 y cualquier futura matriz mediante autorización separada.

Por repetición del mismo stage, queda prohibido resolver mediante más timeout, reintento de browser o parche adicional por intuición.

## Avance

- readiness funcional: 100%
- avance técnico: 75%
- gates go-live: 2/3 = 67%
- `POST_GO_LIVE_SMOKE_PASS`: **NO**
- Gate 3: **ABIERTO**
