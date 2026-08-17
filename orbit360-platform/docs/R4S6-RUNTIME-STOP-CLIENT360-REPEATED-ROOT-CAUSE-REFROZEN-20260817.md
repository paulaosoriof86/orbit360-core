# Orbit 360 A&S — R4S6 runtime STOP repetido Cliente 360 · causa raíz acotada · source-only refrozen

Fecha: 2026-08-17  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Público: R4S6 exacta

## 1. Bloque y autorización consumida

Se autorizó una única matriz runtime read-only sobre la R4S6 pública exacta:
- source `395f15d9c2e1fac2949763947834b88a9b521207`
- artifact `9271052165`
- ZIP SHA256 `00b283a69511735dbcd8d662b5d95ab0d02895a38fbf90770590754f253f3d2c`
- smoke source-only previamente rebound y PASS en commit `77c990a79f5f6c387d73c85624f3cb7f68feffea`.

Regla de ejecución: una sola activación; ante STOP, cero segundo intento y refreeze inmediato.

## 2. Ejecución única

Activación controlada:
- commit `78ea7529be135bb702f1d93528fa0f5b3a2d92e8`
- único cambio: `ORBIT360_R4_CERTIFIED_SOURCE_ONLY=true → false` en el workflow certificado.

Runtime:
- run `32023286778`
- job `95367258198`
- resultado: **STOP / failure**
- evidence artifact `9286187130`
- digest `cb17b9fbe7edb0792d5ddabd898ba94224e678f01e3f977d5b255ccc0e84ebb2`.

El gate canónico y el binding R4S6 pasaron antes de secretos/browser. Instalación de herramientas, binding de la identidad existente y resolución read-only de identidad también pasaron.

## 3. Evidencia que pasó antes del STOP

- manifest R4S6 exacto, 194 archivos, sin runtime LAB ni material secreto;
- auth asset exacto y HTTP 200;
- sesión autenticada y email verificado;
- membership disponible, activa y tenant correcto;
- roles requeridos presentes;
- runtime/router/tenant/store listos;
- store `ready-read-only`, writeEnabled=false;
- 430 clientes y 30 aseguradoras;
- Dirección activada correctamente;
- scope Cliente 360 Dirección = `all`;
- 430/430 clientes dentro del scope;
- Inicio Dirección PASS;
- legal gate solo observado, no interactuado.

Sin señales colaterales:
- pageErrors = 0
- consoleErrors = 0
- httpFailures = 0
- writeSignals = 0
- technicalCopy = 0
- Firestore/Auth/operational writes = `0/0/0`
- deploy = false
- package rebuild = false.

## 4. STOP exacto

- clasificación de evidencia: `FUNCTIONAL_DEFECT`
- failureFamily emitida: `R4_ROLE_ROUTE_STAGE_FAILED`
- etapa: `role-Dirección-route-cliente360`
- error: `page.waitForFunction: Timeout 25000ms exceeded.`
- Dirección activation: ~25.1 s
- Inicio: ~0.43 s
- Cliente 360: ~25.2 s hasta STOP.

No se alcanzó a runtime-validar:
- Dirección → Aseguradoras y rutas siguientes;
- matriz Operativo tablet;
- matriz Asesor móvil.

## 5. Regla de repetición activada

El STOP coincide con el run R4S5 `31973847177`:
- misma etapa `role-Dirección-route-cliente360`;
- mismo tipo de timeout de 25 s.

Por regla maestra, **no se autoriza ni ejecuta un tercer intento**. Subir el timeout o repetir la matriz sería tratar el síntoma.

## 6. Causa raíz acotada

Clasificación: `FUNCTIONAL_DEFECT`.

Failure family refinada:
`CLIENT_PROJECTION_FULL_CLIENT_NATIVE_CLONE_REPEATS_ACROSS_ROLE_SCOPE_AND_CLIENTE360_BATCH`.

Evidencia de ownership:

1. El store productivo read-only protegido implementa `all(collection)` clonando cada fila con serialización JSON. Esto preserva aislamiento y **no se modifica**.

2. El owner de proyección de clientes R4S6 sí cachea el contexto de segmentación de pólizas/cobros, pero `projectedAll('clientes')` todavía ejecuta `nativeAll('clientes')` y reproyecta todos los clientes en cada lectura.

3. La activación de Dirección hace un `Orbit.store.all('clientes')` antes de `Orbit.access.filter(...)`. Esa etapa tardó ~25.1 s.

4. `Orbit.access.filter` ya tiene el rootfix 20260816 que resuelve rol/scope invariantes una vez y, para scope `all`, devuelve `list.slice()`. Por tanto, no es el candidato principal restante.

5. Inmediatamente después, Cliente 360 usa `withReadBatch(...)`; ese helper vuelve a ejecutar `nativeAll('clientes')` y vuelve a proyectar la colección completa antes de construir el índice/resumen. La etapa volvió a consumir ~25.2 s y bloqueó la disponibilidad del main thread hasta agotar el presupuesto del gate.

6. El rootfix R4S5→R4S6 sí resolvió la amplificación por reconstrucción repetida de pólizas/cobros y redujo las clonaciones del fixture ~75%, pero el fixture no reprodujo la secuencia real **role-scope all('clientes') → Cliente360 withReadBatch** con profundidad representativa de los objetos cliente públicos. Por eso el diagnóstico previo era correcto pero incompleto.

Conclusión: el bloqueo actual no es Auth, HostDime, membership, scope, HTTP ni el store protegido. El owner restante es la **reclonación/reproyección completa de clientes entre consumidores consecutivos**, sobre el main thread.

## 7. Refreeze inmediato

Tras el STOP se restauró inmediatamente:
`ORBIT360_R4_CERTIFIED_SOURCE_ONLY=true`.

- refreeze commit `59c92cf2c8fcec9e255c5d7b7d24562354e7c48e`
- refreeze run `32023487824`
- job `95367875001`
- resultado **SUCCESS**.

En ese run:
- gate canónico PASS;
- role-route source gate PASS;
- team/own regression PASS;
- watchdog PASS;
- browser install, secretos, identidad y runtime: **SKIPPED**.

No existe autorización vigente para otro browser/runtime.

## 8. Carriles

- Carril A — frontend/UX: R4S6 pública exacta; Cliente 360 queda funcionalmente congelado para rootfix source-only de rendimiento.
- Carril B — backend/Auth/store: sin cambios. Auth y store productivo read-only no son el bloqueador actual.
- Carril C — datos reales: cero escrituras y cero reimportaciones; congelado.

## 9. Claude / Academia

- Claude: `REPLICABLE_CLAUDE_ACUMULADO` — patrón reusable de cache de proyección de lectura invalidable entre consumidores consecutivos y gates que reproduzcan la secuencia real, no solo conteos.
- Academia: `ACADEMIA_ACTUALIZAR` — un PASS source-only de volumen no prueba latencia runtime; un STOP idéntico repetido exige detener reintentos y refinar causa raíz.

## 10. Siguiente acción exacta

Con autorización fresca, rootfix **source-only** en el owner de proyección de clientes:
- reutilizar una snapshot proyectada de clientes acotada e invalidable entre `all('clientes')` y `withReadBatch`;
- invalidar ante `clientes`, `polizas`, `cobros`, `*` y cambios del threshold;
- preservar semántica, roles/scopes y API pública de `Orbit.store`;
- no modificar el store protegido;
- gate source-only que reproduzca la secuencia real Dirección scope → Cliente360 con 430 clientes de carga pesada representativa;
- exigir igualdad semántica y reducción material de clonaciones/costo;
- **sin browser/runtime** hasta PASS y nueva autorización.