# Orbit 360 A&S — R4S5 source rootfix Cliente 360 batch PASS — 2026-08-16

## Estado

`FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_PROVEN` — **PASS source-only**.

Este checkpoint no certifica, empaqueta, publica ni ejecuta una R4S5. La versión pública continúa siendo R4S4 exacta. No se ejecutó navegador, runtime, deploy, HostDime, secretos ni datos reales.

## Bloque / carril

- Bloque: cierre técnico previo al Gate 3 `POST_GO_LIVE_SMOKE_PASS`.
- Carril A — frontend/UX: rootfix de proyección visual Cliente 360, exclusivamente source-only.
- Carril B — backend/seguridad/Auth/Orbit.store: congelado; sin cambios.
- Carril C — datos reales/migración A&S: congelado; sin reimportación ni escrituras.

## Fuente y baseline

- Repo: `paulaosoriof86/orbit360-core`.
- Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`.
- PR: #5 draft/open; sin merge a `main`.
- Baseline público: R4S4 `orbit360-fase-a-product-r4s4-54f671e64b32.zip`.
- R4S4 SHA256: `f266815e26da04a8c9e86b0db9414ca6c06bedb3cd9371f85e96c8d08e420d4c`.
- R4S4 source: `54f671e64b32c7b39100d79e770572a579e79ac7`.
- `core/queries.js` certificado R4S4 SHA256: `b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b`.

## Necesidad / defecto raíz confirmado

La matriz read-only corregida `31968334075` volvió a detenerse en `role-Dirección-route-cliente360` aun usando el validador corregido de 30 s / 25 s. Por repetición del mismo stage se aplicó STOP_RETRY y se congeló navegador.

Clasificación de causa raíz:

`FUNCTIONAL_DEFECT / CLIENT_VISUAL_PROJECTION_SEGMENTATION_NX_CLONE_COMPOSED_READONLY_STORE`.

Owner único:

`orbit360-platform/core/client-insurer-visual-contract-v20260720.js`.

Cadena causal fuente:

1. la proyección visual envuelve `Orbit.store.all('clientes')`;
2. cada cliente pasa por `projectClient()`;
3. `projectClient()` invocaba `segmentFor()`;
4. `segmentFor()` ejecutaba un `rawRows('polizas')` por cliente;
5. con umbral Premium, también ejecutaba `rawRows('cobros')` por cliente;
6. en store clone-on-read el costo N× volvía a aparecer antes de aprovechar el índice batched ya corregido en `queries.js`.

`queries.js` no es owner de este STOP y permanece congelado.

## Autorización consumida

Se autorizó exclusivamente:

- rootfix source-only de `core/client-insurer-visual-contract-v20260720.js`;
- eliminar N× mediante índices acotados;
- preservar exactamente la semántica de segmentación;
- gate source-only 430/1375/1900;
- documentación.

No se autorizó browser, deploy, HostDime, runtime, paquete sucesor, Auth, store productivo, datos ni Rules.

## Implementación

Commit de producto source-only:

`5474a1a9af64c018e6dcc71b4ad0cdfe57ce0484`

La comparación contra el HEAD previo `7ddc46dc1fe39d1cfd46aa02e910facf1b021c87` mostró exactamente un archivo de producto modificado:

`orbit360-platform/core/client-insurer-visual-contract-v20260720.js`

Delta: 34 adiciones / 9 eliminaciones.

El rootfix:

- agrega `buildSegmentationContext(readAll)`;
- lee pólizas una sola vez por proyección completa y crea `Map` por `clienteId`;
- con umbral Premium activo, lee cobros una sola vez y agrega prima neta recaudada elegible por `clienteId`;
- `segmentFor(row, context)` usa índices cuando recibe contexto y conserva el fallback original cuando se invoca individualmente;
- `projectClient(row, segmentationContext)` conserva campos y reglas existentes;
- `all/where/find('clientes')` reutilizan la misma composición batched por operación;
- no introduce escrituras ni altera la API pública del store.

SHA256 source del owner tras rootfix:

`ad6fa96614d4eefe29880fac26a1c349ae24940adc2d8ff75ad04d991595b067`.

## Gate y control de causa raíz

Gate dedicado:

`tools/orbit360-r4s5-client-projection-batch-rootfix-gate-v20260816.mjs`

Workflow source-only:

`.github/workflows/orbit360-r4s5-client-projection-batch-source-gate-v20260816.yml`

El workflow no instala Playwright, no consume secretos, no abre navegador, no accede a datos reales y no ejecuta deploy.

### Primera ejecución — STOP del validador

- run: `31969401196`
- job: `95219337280`
- canonical gate: PASS
- composition gate: FAIL
- artefacto: `9269355208`
- error: `semantic fixture missing segment Histórico`

Clasificación: `VALIDATOR_STALE`.

La expectativa del gate era incorrecta. La semántica vigente declara la opción `Histórico`, pero el clasificador actual la hace inalcanzable: si existen pólizas no activas, `historical.length > 0` devuelve `Recurrente` antes del retorno final `Histórico`. Cambiar esa lógica habría violado la autorización de preservar exactamente la semántica.

Por tanto se congeló producto y se corrigió únicamente el gate.

Commit de corrección del validador:

`29860193f51459ce7ab0ab55312ae9d3feb30d6f`.

`Histórico` queda registrado como **deuda semántica separada**, no corregida en este bloque.

### Ejecución final source-only — PASS

- run: `31969452166`
- job: `95219466783`
- resultado: `R4S5_CLIENT_PROJECTION_BATCH_ROOTFIX_SOURCE_PASS`
- clasificación: `FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_PROVEN`
- artefacto: `9269368462`
- digest ZIP evidencia: `e074e25c8213da08b4fa1cc8ae16e3f206f322b13dbd168e2ca878d621d8180d`

Fixture sintético contractual:

- clientes: 430
- pólizas: 1,375
- cobros: 1,900
- umbral Premium: 1,000

Equivalencia semántica:

- `semanticEqual=true`
- `mismatchCount=0`
- estados alcanzables cubiertos: `Pendiente de clasificar`, `Nuevo`, `Recurrente`, `Estándar`, `Premium`
- `Histórico`: declarado pero inalcanzable bajo la semántica preservada.

Costo batched por `all('clientes')`:

- `allCalls=3`
- `cloneRows=3,705`

`where('clientes')` y `find('clientes')` conservan el mismo límite 3 llamadas / 3,705 clones en el fixture.

Fallback semántico original para clasificar los 430 clientes:

- `allCalls=810`
- `cloneRows=1,313,250`

Reducción comprobada:

- llamadas: `270x`
- filas clonadas: `354.45x`

`queries.js` durante el gate:

- SHA256 `b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b`
- coincide exactamente con R4S4 certificada.

Controles de seguridad:

- Firestore writes: 0
- Auth writes: 0
- operational writes: 0
- browser: false
- secret access: false
- real data access: false
- deploy: false
- production touched: false
- package rebuilt: false
- PII/secrets in evidence: false

## Avance visible

La causa N× de la proyección Cliente 360 quedó corregida y demostrada source-only con equivalencia semántica y reducción acotada. Esto es avance técnico real, pero **no cierra Gate 3** porque el rootfix aún no forma parte de un paquete sucesor certificado/publicado.

Estado rector permanece:

- readiness funcional: 100%
- avance técnico: 75%
- go-live gates: 2/3 = 67%
- `POST_GO_LIVE_SMOKE_PASS`: abierto

## Claude / Academia

Claude: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrón reusable: una proyección visual que aplica lógica relacional a N entidades debe capturar las colecciones relacionadas una sola vez por operación y construir índices acotados; no debe ejecutar scans clone-on-read por fila.

Academia: `ACADEMIA_ACTUALIZAR`.

Debe enseñar:

- diferencia entre defecto funcional y `VALIDATOR_STALE`;
- por qué un validador no puede exigir un estado que la semántica vigente hace inalcanzable;
- preservación de semántica durante optimizaciones;
- batch/index vs N× en proyecciones read-only;
- `Histórico` como deuda semántica a revisar en un bloque separado, no como parte automática de una optimización de rendimiento.

## Pendiente / siguiente acción exacta

R4S4 permanece pública e inmutable. El rootfix está únicamente en source y **no está empaquetado ni publicado**.

La siguiente frontera requiere autorización explícita nueva para construir y certificar una sucesora mínima desde R4S4 exacta incorporando únicamente el owner rootfix SHA256 `ad6fa96614d4eefe29880fac26a1c349ae24940adc2d8ff75ad04d991595b067`.

Esa autorización no está vigente. Hasta recibirla:

- no crear R4S5 durable;
- no cambiar HostDime;
- no deploy;
- no browser/matriz;
- no secretos;
- no Auth/datos/Rules/store productivo;
- no main ni merge.
