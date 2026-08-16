# Orbit 360 A&S — STOP R4S5 matriz read-only — Cliente 360 deep-clone composition — 2026-08-16

## Estado

`STOP_RETRY / FUNCTIONAL_DEFECT / CLIENT_VISUAL_PROJECTION_REBUILDS_DEEP_CLONE_BATCH_PER_READ_AND_CLIENTE360_DUPLICATES_GLOBAL_READS`

R4S5 permanece pública, exacta e inmutable. No se ejecutó un segundo runtime. El navegador quedó refrozen `SOURCE_ONLY=true` después de la única matriz autorizada.

## Autorización consumida

Se autorizó exclusivamente:
1. preparar source-only el binding del smoke a R4S5 exacta source `5474a1a9af64c018e6dcc71b4ad0cdfe57ce0484`;
2. solo con gate canónico PASS, ejecutar una única matriz read-only Dirección desktop / Operativo tablet / Asesor móvil;
3. validar Cliente 360, Aseguradoras, roles/scopes, 430 clientes, 30 aseguradoras, cero copy técnico, cero errores browser/HTTP y cero escrituras;
4. ante STOP, no segundo intento: clasificar causa raíz y refreeze inmediato;
5. sin deploy, nueva publicación, cambios de producto, Auth, datos, Rules, store, main ni merge.

La autorización runtime quedó consumida por la única ejecución `31973847177`.

## Binding source-only R4S5

Se encontró primero un `VALIDATOR_STALE`: el contrato/wrapper del smoke todavía solo reconocía manifestos anteriores a R4S5. Producto congelado; se corrigieron únicamente contrato/wrapper/workflow de validación.

- contrato R4S5: commit `d8942377754607f6a0d5310a765ac5c3f6f21fa1`;
- wrapper allowlist R4S5: commit `9f1cb33ef460744e86dbcfb3bde8307549e60a55`;
- binding source-only exacto: commit `283c603dd193efb4376d9c012a9d397933f530ba`.

El commit de contrato disparó un run intermedio antes de que el wrapper quedara actualizado; ese run fue un FAIL source-only por el validador viejo y no ejecutó browser/runtime. La corrección del wrapper produjo source-only PASS.

GO source-only final:
- run `31973809307`;
- job `95230172774`;
- resultado: SUCCESS;
- gate canónico PASS;
- gate de atribución de rutas PASS;
- regresión scopes team/own PASS;
- watchdog PASS;
- secretos/browser/runtime: SKIPPED.

## Única matriz runtime

Activación única:
- commit `de97abd7adde618b806c30ef85f791949303f331`;
- run `31973847177`;
- job `95230265194`;
- evidencia artifact `9270532591`;
- digest `b13eb1b018a222320ee56dbe7a714fb395bc1db306038756a7526e2b9d5f692e`.

El refreeze a `SOURCE_ONLY=true` fue comprometido mientras esa matriz todavía estaba en ejecución:
- commit `9f62674ebabff0e7da393ebe975a8210fbeea1d8`.

Por diseño no existe una segunda activación runtime.

## PASS antes del STOP

La evidencia terminal de `31973847177` confirma:

- manifest R4S5 exacto: PASS;
- sourceHead exacto: PASS;
- 194 archivos: PASS;
- no LAB runtime / no private secret material: PASS;
- Auth asset HTTP 200 + SHA exacto: PASS;
- login HTTP 200: PASS;
- `signedIn=true`;
- `emailVerified=true`;
- membership disponible/activa: PASS;
- tenant `alianzas-soluciones`: PASS;
- 5 roles asignados y Dirección/Operativo/Asesor presentes: PASS;
- runtime started/router/tenant context: PASS;
- store `ready-read-only`: PASS;
- writeEnabled=false;
- requiredMissing=0 / requiredFailed=0;
- 430 clientes;
- 30 aseguradoras;
- advisor bound;
- Dirección active role: PASS;
- Dirección scope Cliente360=`all`;
- Dirección raw/scoped clients=430/430;
- ruta Inicio: PASS.

## STOP exacto

Primer y único fallo runtime:

- stage: `role-Dirección-route-cliente360`;
- clasificación terminal: `FUNCTIONAL_DEFECT`;
- failureFamily del harness: `R4_ROLE_ROUTE_STAGE_FAILED`;
- error: `page.waitForFunction: Timeout 25000ms exceeded.`;
- `hostRendered=false`;
- policyAllowed=true;
- accessBlocked=false.

Cronología:

- runtime activation PASS: 10,119 ms;
- privileged snapshot PASS: 11,547 ms;
- Dirección activation START: 11,548 ms;
- Dirección activation PASS: 35,737 ms → ~24.189 s;
- Inicio START: 35,737 ms;
- Inicio PASS: 36,166 ms → ~0.429 s;
- Cliente360 START: 36,166 ms;
- Cliente360 FAIL: 61,371 ms → ~25.205 s.

La matriz se detuvo allí. Aseguradoras, Operativo y Asesor **no quedaron runtime-validados** en esta ejecución y no se debe afirmar lo contrario.

## Señales limpias

Al STOP:

- `pageErrors=[]`;
- `consoleErrors=[]`;
- `httpFailures=[]`;
- `writeSignals=[]`;
- `technicalCopy=[]`;
- Firestore writes = 0;
- Auth writes = 0;
- operational writes = 0;
- `writesAuthorized=false`;
- deploy=false;
- package rebuild=false;
- PII=false;
- secrets=false;
- browser cerrado limpiamente.

`productionTouched=true` en la evidencia significa observación mediante navegador de la URL productiva; no hubo mutación de producción.

## Causa raíz source-only

### 1. El store productivo clone-on-read es profundo

`data/store-firestore-product-readonly-p0.js` implementa `clone()` mediante `JSON.parse(JSON.stringify(value))` y:

- `all(collection)` clona cada fila del cache;
- `get()` llama `all()`;
- `where()` llama `all()`;
- `find()` termina en `all()` o `where()`.

Este comportamiento es deliberado y protegido. **No se clasifica el store como defecto y no se modifica.**

### 2. La proyección visual R4S5 vuelve a reconstruir el contexto en cada `all('clientes')`

`core/client-insurer-visual-contract-v20260720.js` hace en `projectedAll('clientes')`:

1. `nativeAll('clientes')`;
2. `buildSegmentationContext(nativeAll)`;
3. dentro del contexto, `nativeAll('polizas')` siempre;
4. y `nativeAll('cobros')` cuando el umbral Premium está activo;
5. luego proyecta los 430 clientes.

R4S5 eliminó correctamente el N× por cliente del defecto anterior, pero el batch completo se vuelve a construir **en cada llamada global de clientes**. El fixture source-only anterior midió filas simples; no probó el costo temporal de clonación profunda de objetos productivos reales ni la repetición consecutiva entre consumidores.

### 3. Cliente 360 compone varias lecturas globales antes de pintar las 40 filas

`modules/cliente360.js::lista()` actualmente:

- ejecuta `S().all('clientes')`;
- ejecuta `q.clientesResumenIndex()`;
- el índice vuelve a ejecutar `S().all('clientes')`, `S().all('polizas')`, `S().all('cobros')`, `S().all('comisiones')`;
- después ejecuta lecturas adicionales de pólizas para KPI de activas/históricas y renovaciones próximas;
- solo después construye/renderiza la página de 40 filas.

Con las colecciones conocidas 430/1375/1900 y sin contar todavía `comisiones`, el camino previo al render implica como mínimo:

- primer `all('clientes')` proyectado: 430 + 1,375 + 1,900 = 3,705 clones de fila;
- segundo `all('clientes')` dentro del summary index: otros 3,705;
- `all('polizas')` del summary: 1,375;
- `all('cobros')` del summary: 1,900;
- tres lecturas globales adicionales de pólizas: 4,125;

Total mínimo conocido: **14,810 clones profundos de filas + toda la colección `comisiones`**, antes de completar el render inicial. Esta cifra es conservadora y no incluye costo de serialización por tamaño real de objeto ni otras lecturas accesorias.

### 4. La temporización runtime concuerda con esa composición

La activación de Dirección, que obtiene el universo de clientes para scope, tardó ~24.189 s. El harness hace `Orbit.store.all('clientes')` para calcular raw/scoped. Esa sola lectura global ya dispara la proyección completa.

Al entrar a Cliente360 se repite `all('clientes')` y se añaden las lecturas globales descritas; el event loop no logra completar la transición/render dentro de 25 s. No hay señal de red, Auth, permisos, HTTP, JS error o escritura que explique el tiempo.

## Clasificación final

**Clase:** `FUNCTIONAL_DEFECT`

**Failure family:** `CLIENT_VISUAL_PROJECTION_REBUILDS_DEEP_CLONE_BATCH_PER_READ_AND_CLIENTE360_DUPLICATES_GLOBAL_READS`

**Owner primario:** `orbit360-platform/core/client-insurer-visual-contract-v20260720.js`

**Owner consumidor secundario:** `orbit360-platform/modules/cliente360.js`

**No owners:** Auth, datos, Firestore Rules, store productivo, HostDime, `core/queries.js` como rootfix previo.

La causa raíz anterior N× fue real y R4S5 la redujo; el STOP actual revela el siguiente costo de composición que el fixture anterior no modelaba. No se revierte ni se invalida el rootfix R4S5.

## Refreeze posterior al STOP

Run source-only posterior:
- run `31973877256`;
- job `95230497017`;
- SUCCESS;
- evidence artifact `9270537919`;
- digest `e42e4eca2910d313c06e70249c494a3afa6e9c241f1d3d5cae87952831ab8e28`;
- canonical gate PASS;
- route attribution gate PASS;
- scopes regression PASS;
- watchdog PASS;
- install browser tools: SKIPPED;
- protected identity/secrets: SKIPPED;
- browser frontier: SKIPPED.

Navegador queda congelado en `SOURCE_ONLY=true`.

## Baseline y rollback

R4S5 continúa pública y estáticamente verificada:
- artifact `9270227820`;
- ZIP `orbit360-fase-a-product-r4s5-5474a1a9af64.zip`;
- SHA256 `2d7a2ae75c5e6ef04c4759ff3438d41b8589d542fc20f14a603aaffb2053a1ac`.

No se ejecuta rollback porque no hubo corrupción, escritura, fallo de seguridad ni identidad pública incorrecta. R4S4 permanece preservada como rollback inmediato.

## Alcance de cambios de este bloque

No se modificó producto, Auth, datos, Rules ni store. Solo se actualizó el contrato/harness/workflow de smoke para binding R4S5 y documentación/evidencia. No main, no merge, no deploy, no nueva publicación.

## Estado rector

- funcional: 100%;
- técnico: 90%;
- gates: 2/3 = 67%;
- Gate 3 `POST_GO_LIVE_SMOKE_PASS`: abierto;
- R4S5: pública, exacta, refrozen;
- una matriz R4S5: consumida con STOP;
- nueva matriz: no autorizada.

## Próxima frontera

Requiere autorización nueva **source-only**, sin browser/runtime: diseñar y probar un rootfix que preserve semántica y API, evitando reconstruir el contexto de segmentación deep-cloned en cada lectura consecutiva y colapsando las lecturas globales duplicadas de Cliente 360. El store productivo protegido no debe tocarse.

Solo después de source gate y sucesora mínima durable/publicada bajo autorizaciones separadas podría existir una nueva matriz.