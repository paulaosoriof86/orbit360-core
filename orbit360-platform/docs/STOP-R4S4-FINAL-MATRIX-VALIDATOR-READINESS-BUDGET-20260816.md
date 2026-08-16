# STOP R4S4 — matriz final consumida · readiness interno del validador desalineado

Fecha: 2026-08-16

## Estado ejecutivo

R4S4 está publicada en HostDime y su identidad pública exacta fue verificada antes de abrir browser.

Paquete publicado/certificado:

- ZIP: `orbit360-fase-a-product-r4s4-54f671e64b32.zip`
- SHA256: `f266815e26da04a8c9e86b0db9414ca6c06bedb3cd9371f85e96c8d08e420d4c`
- source: `54f671e64b32c7b39100d79e770572a579e79ac7`
- 194 archivos
- único delta de producto frente a R4S3: `core/queries.js`
- R4S3 continúa preservada como rollback exacto.

El tercer gate **NO** está cerrado: todavía no existe `POST_GO_LIVE_SMOKE_PASS`.

## 1. Publicación e identidad pública exacta

Workflow estático R4S4:

- run `31965583608` → SUCCESS
- sin browser
- sin secretos
- sin datos privados
- sin escrituras

La comprobación validó los bytes públicos exactos de R4S4, incluyendo manifest, `index.html`, `core/access-scope.js`, `core/auth-product-runtime-p0.js`, `core/queries.js` y el owner de recibos/pólizas.

Conclusión: HostDime sirve R4S4 exacta; no existe evidencia de extracción parcial, mezcla R4S3/R4S4 ni caché como causa del STOP posterior.

## 2. Contrato R4S4 source-only

El contrato certificado quedó ligado al source exacto R4S4 y se ejecutó primero en modo source-only:

- run `31965668067` → SUCCESS
- gate canónico PASS
- atribución independiente rol/ruta PASS
- regresión `team/own` PASS
- watchdog PASS
- browser/secrets/runtime productivo no ejecutados

## 3. Única matriz runtime autorizada

La única matriz real autorizada se ejecutó una sola vez:

- run `31965708561`
- job `95210452139`
- autorización consumida

### Fronteras que sí pasaron

Antes del STOP se verificó:

- manifest R4S4 exacto;
- asset Auth productivo exacto;
- login HTTP 200;
- usuario autenticado;
- correo verificado;
- membership disponible y activa;
- tenant correcto;
- roles Dirección / Operativo / Asesor presentes;
- runtime iniciado;
- Router iniciado;
- tenant context listo;
- store `ready-read-only`;
- escrituras deshabilitadas;
- required missing = 0;
- required failed = 0;
- 430 clientes;
- 30 aseguradoras;
- legal observable;
- Dirección activa con scope Cliente 360 = `all`;
- Inicio renderizado PASS;
- cero page errors;
- cero console errors;
- cero HTTP failures;
- cero write signals;
- cero copy técnico detectado;
- Firestore writes = 0;
- Auth writes = 0;
- operational writes = 0.

### STOP observable

La evidencia runtime emitió inicialmente:

- `classification`: `FUNCTIONAL_DEFECT`
- `failureFamily`: `R4_ROLE_ROUTE_STAGE_FAILED`
- `currentStage`: `role-Dirección-route-cliente360`

Cliente 360 tenía `policyAllowed=true`, pero el harness terminó el stage antes de obtener `Orbit.route.key === 'cliente360'`.

## 4. Diagnóstico de causa raíz sin segundo browser

Se activó `STOP_RETRY` inmediatamente. No se ejecutó una segunda matriz ni se tocó producto por intuición.

La auditoría source-only del wrapper encontró una contradicción concreta:

- stage independiente por ruta: `30,000 ms`;
- readiness interno `page.waitForFunction(...)`: `8,000 ms`;
- el fix anterior había eliminado correctamente el `.catch(() => {})` que silenciaba ese timeout;
- como consecuencia, los 8 s internos se convirtieron en el límite efectivo y el stage de 30 s nunca podía utilizar su presupuesto completo.

### Clasificación final del STOP actual

`VALIDATOR_STALE / ROUTE_READINESS_8S_MASKS_30S_STAGE`

Esto es diferente del defecto de producto R4S3 ya corregido.

## 5. Producto R4S4 permanece congelado

No se aplicó otro parche a `core/queries.js` ni a Cliente 360.

El rootfix batched R4S4 ya estaba probado source-only con:

- `allCalls = 4`
- `getCalls = 0`
- `whereCalls = 0`
- `cloneRows = 4,605`
- `Map.size = 430`
- equivalencia semántica = PASS

Por tanto, este STOP no autoriza volver a modificar el producto ni a reabrir el diagnóstico N×clone ya cerrado.

## 6. Refreeze inmediato

Después de la matriz fallida se restauró:

`ORBIT360_R4_CERTIFIED_SOURCE_ONLY=true`

- commit de refreeze: `576c3d051387bcfc540bb44924f991b968cf66fd`
- run de refreeze: `31965848572` → SUCCESS
- browser/credenciales/matriz: skipped

No existe una segunda matriz en curso.

## 7. Corrección única del validador

Se corrigió exclusivamente el owner de validación:

`tools/orbit360-r4-role-route-attribution-wrapper-v20260816.mjs`

Cambio:

- route stage externo: conserva `30,000 ms`;
- readiness interno: `8,000 ms` → `25,000 ms`;
- sin `.catch()` silencioso;
- quedan 5 s del stage para captura/validación posterior;
- self-test agrega `routeReadinessBudgetAligned`.

Commit:

- `ea04bac7ae28279370c9b63a53562413b9638c9b`

Se actualizó también el gate secundario:

`tools/orbit360-r4-role-route-attribution-gate-v20260816.mjs`

para exigir `routeReadinessBudgetAligned=true`.

Commit:

- `81c5b196b101e14984d8488d1c50d4808e415b3c`

## 8. Evidencia source-only posterior

### Wrapper corregido

- run `31966399464` → SUCCESS
- browser/secrets/datos: no ejecutados

### Wrapper + gate corregidos

- run `31966410400` → SUCCESS
- gate canónico: PASS
- gate de atribución rol/ruta: PASS
- regresión team/own: PASS
- watchdog: PASS
- Playwright: skipped
- credenciales: skipped
- identidad runtime: skipped
- browser frontier: skipped
- escrituras: 0

## 9. Estado de gates

- Gate 1: cerrado.
- Gate 2: cerrado.
- Gate 3 (`POST_GO_LIVE_SMOKE_PASS`): **ABIERTO**.

Progreso conservador:

- readiness funcional: 100%
- progreso técnico de iteración: 75%
- gates go-live: 2/3 = 67%

## 10. Carriles

### Carril A — frontend / UX / Academia

- R4S4 permanece sin nuevo delta de producto.
- No se corrigió UX para satisfacer un validador antiguo.
- Academia debe incorporar el caso de `VALIDATOR_STALE`: un timeout interno no puede contradecir el presupuesto declarado del stage.

### Carril B — backend / seguridad / validación

- Auth/membership/store read-only permanecen PASS.
- Se corrigió solo el validador secundario y su gate.
- Browser sigue congelado.
- Cero cambios en secretos, Rules, store protegido o datos.

### Carril C — datos A&S

- 430 clientes y 30 aseguradoras observados read-only.
- Cero escrituras.
- Cero reimportación.
- Cero mutación de datos.

## 11. Impacto Claude / patrón reusable

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO` únicamente para metodología de validación.

Patrón reusable:

- los stages y sus readiness internos deben tener presupuestos coherentes;
- un validador obsoleto no justifica modificar producto funcional;
- al repetirse una familia de fallo se activa `STOP_RETRY`;
- primero se corrige y prueba el instrumento source-only.

No hay nuevo cambio UX/producto que enviar a Claude por este STOP.

## 12. Impacto Academia

`ACADEMIA_ACTUALIZAR`

Agregar al contenido de gates/causa raíz:

- diferencia entre `FUNCTIONAL_DEFECT` y `VALIDATOR_STALE`;
- nested timeout vs stage budget;
- por qué quitar un timeout silenciado es correcto, pero obliga a alinear su presupuesto;
- por qué no se reabre Cliente 360 ni se reimportan datos cuando la evidencia apunta al validador.

## 13. Siguiente acción exacta

Estado actual:

- R4S4 publicada y estáticamente exacta;
- R4S3 preservada como rollback;
- browser refrozen;
- producto congelado;
- validador corregido y probado source-only;
- tercera compuerta todavía abierta.

La siguiente frontera requiere **nueva autorización explícita**, porque la única matriz runtime anterior ya fue consumida.

Con autorización nueva, la única acción permitida es:

1. mantener R4S4 exacta, sin nuevo paquete ni deploy;
2. ejecutar gate canónico/source-only;
3. abrir exactamente **una** matriz read-only con route stage 30 s y readiness 25 s;
4. Dirección desktop → Operativo tablet → Asesor móvil;
5. exigir cero writes y `POST_GO_LIVE_SMOKE_PASS`;
6. refreeze inmediato al terminar.

Si vuelve a fallar la misma etapa/familia, activar `STOP_RETRY` otra vez; no aumentar timeouts, no crear otro parche y no ejecutar una segunda matriz.

Sin reimportación, Auth changes, data changes, deploy, main ni merge.
