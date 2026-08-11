# CIERRE ANTIBUCLE — MATRIZ VISUAL BLOCK 1 · RUN 31502845695

Fecha: 2026-08-11  
Proyecto: Orbit 360 / A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`  
Contrato: `1.0.41`

## 1. Estado de entrada

Universe de release permanece cerrado:

`RELEASE_UNIVERSE_ACCEPTED_WITH_2_CLIENT_PROVENANCE_EXCEPTIONS`

No se reabre procedencia, IAM/Logging, Auth, membership, multirol, Pólizas write histórico, Vehículos ni Recibos/cartera por este hallazgo.

La ejecución autorizada fue única e inmutable:

- request: `.github/orbit360-requests/block1-final-visual-corrected-after-sourcefix-authorization.json`;
- HEAD runtime: `77dd4dc20a158dc32d2a186342a608e4b3be2364`;
- run: `31502845695`;
- job: `93816961022`;
- replay: prohibido.

## 2. Resultado runtime

Resultado: `STOP_RETRY`.

Seguridad e integridad:

- safety backup: PASS;
- baseline restore: PASS;
- Hosting LAB deploys: 1;
- precheck: PASS · `INICIO_READY_PASS`;
- rollback: PASS;
- snapshot final: `VERIFIED_UNCHANGED`;
- Firestore writes: 0;
- Auth writes: 0;
- operational writes: 0;
- Functions/Rules: 0;
- producción/main/merge: 0.

El run reportó inicialmente `FUNCTIONAL_DEFECT` por diez checks fallidos. Esa clasificación agregada no se acepta como causa raíz porque el runner convertía cualquier conjunto de checks fallidos en `FUNCTIONAL_DEFECT` sin distinguir fallos del instrumento.

## 3. Checks fallidos observados

Las fallas se concentraron en tres familias:

1. `cliente360-render-under-30s` en Dirección, Operativo y Asesor.
2. `cliente360-detail` y su efecto descendente `cliente360-empty-relations-honest` en los tres roles.
3. `mobile-menu-opens` únicamente en Asesor móvil.

Al mismo tiempo quedaron PASS:

- Auth y sesión;
- membership/multirol;
- scopes;
- Legal idempotente;
- Cliente 360 lista, paginación acotada, calidad, responsive y target dentro del scope;
- Aseguradoras directorio/ficha/conocimiento según acceso efectivo;
- cero console errors bloqueantes;
- integridad de datos before/after.

## 4. Causa raíz corregida

Clasificación final del run para control de causa raíz:

`VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`

### 4.1 Rendimiento — métrica equivocada como blocker

El contrato declaraba `renderObserverWaitMs`, pero el check bloqueante utilizaba `observed.waitMs`, que incluye latencia del canal Node/Playwright además del intervalo observado dentro del navegador.

Evidencia del mismo run:

- Dirección: channel wait ~31.77 s; browser observer ~23.76 s; render interno ~15.97 s.
- Operativo: channel wait ~30.80 s; browser observer ~23.32 s; render interno ~15.78 s.
- Asesor: channel wait ~30.56 s; browser observer ~23.07 s; render interno ~15.51 s.

El umbral de navegación/render debe evaluar el intervalo del observer dentro del navegador, no overhead del canal de automatización.

Owner nuevo: `browserObserverElapsedMs`.

### 4.2 Menú móvil — click antes de readiness del Router

La matriz verificaba el burger inmediatamente después de login/Legal, antes de exigir readiness del Router + hidratación de Inicio.

La captura de Asesor mostraba topbar/burger pero host de Inicio todavía vacío. El owner real de Router sí implementa `sidebar.open` + `.sb-overlay.show`.

Owner nuevo del check: `router-ready-before-burger`.

La matriz ahora espera primero:

- `Orbit.router` disponible;
- `Orbit.route.key === 'inicio'`;
- hidratación de Inicio ready;
- sin loading visible;
- host con contenido real.

Solo después prueba abrir/cerrar el menú.

### 4.3 Cliente 360 detalle — mecanismo no adjudicaba el flujo real

El runner extraía un ID de la fila y escribía `location.hash` directamente; luego exigía igualdad textual del hash + DOM. Ante timeout no registraba el estado canónico de Router/params/DOM y no podía diferenciar una serialización/encoding del hash de un fallo real de ficha.

El módulo y Router vigentes confirman el contrato real:

- la lista tiene filas clicables hacia Cliente 360;
- Router parsea `c` en `Orbit.route.params`;
- la ficha usa `.fichahdr`, `#ficha-tabs` y `#c360-body`;
- scope se gobierna por `Orbit.access.filter/withScope`.

Owner nuevo del check:

`rendered-row-user-flow-plus-route-param-dom`.

La prueba principal de detalle ahora hace click en una fila realmente renderizada y valida Router + params + DOM. Para relaciones vacías compara el parámetro canónico parseado, no igualdad textual del hash.

## 5. Correctivo source-only

Nuevo owner de implementación:

`tools/orbit360-block1-final-native-matrix-v20260811.mjs`

Binding canónico:

`tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs`

Prueba sintética anti-bucle:

`tools/fixtures/orbit360-block1-visual-antibucle-fixture-v20260811.mjs`

La prueba reproduce expresamente:

- channel wait >30 s con browser observer <30 s y exige PASS;
- browser observer >30 s y exige FAIL;
- Router ready antes del click móvil;
- detalle por click de fila renderizada + route params + DOM;
- navegación de relación vacía sin dependencia de igualdad textual del hash;
- clasificación por check en vez de convertir automáticamente toda falla en `FUNCTIONAL_DEFECT`.

## 6. Evidencia source PASS

Primer cierre completo del owner + fixture + source gate:

- source run: `31505449540`;
- conclusión: PASS;
- canonical gate: PASS;
- release universe prerequisite: PASS;
- package/syntax: PASS;
- synthetic anti-loop: PASS;
- semantic validator checks: PASS;
- offline request preflight: PASS;
- runtime semantic boundaries: PASS;
- secretos/Firebase/Hosting/browser/runtime/writes: 0.

Después se alineó también el runtime contract futuro. Source run sobre el HEAD con ese workflow:

- run: `31505520202`;
- conclusión: PASS.

## 7. Regla anti-bucle vigente

El request del run `31502845695` está consumido y no puede repetirse.

No se permite:

- rerun del job consumido;
- otro request con el mismo contrato antiguo;
- parche del producto para satisfacer los tres checks obsoletos;
- reimportación;
- tocar Auth, Rules, Functions o datos;
- avanzar a Cobros/Pólizas antes de `PASS_VISUAL_POST_AUTH`.

## 8. Próxima frontera

Lifecycle:

`SOURCE_PASS_AWAITING_FRESH_EXCLUSIVE_REQUEST`

Request futuro preparado, todavía inexistente:

`.github/orbit360-requests/block1-final-visual-antibucle-v20260811-authorization.json`

Versión:

`20260811.block1-final-visual-antibucle`

Requiere autorización humana fresca. El request deberá ser único, parent-bound, inmutable y one-shot. Antes de secretos deberá producir `GO_GATE_CONTRACT`; máximo un deploy Hosting LAB; cero escrituras; rollback ante cualquier STOP.

Si la misma familia reaparece, `STOP_RETRY` inmediato y no se abre otro request.

Solo `PASS_VISUAL_POST_AUTH` permite cerrar Block 1 y continuar con el barrido focal de blockers Cobros/Pólizas.

## 9. Carriles / Claude / Academia

Carril A — frontend/UX: producto congelado; no se corrigió UX para satisfacer un harness obsoleto.  
Carril B — control-plane: rootfix source-only PASS; workflow futuro alineado; runtime no autorizado.  
Carril C — datos: intactos; cero reimportación/escrituras.

Clasificación Claude: `REPLICABLE_CLAUDE_ACUMULADO` — distinguir medición del navegador vs overhead del harness, probar navegación desde el flujo real y esperar readiness del owner antes de interacción.

Academia: `ACADEMIA_ACTUALIZAR` — diferencia entre defecto funcional y validador obsoleto; por qué una prueba debe ejercer el owner real y por qué un timeout sin diagnóstico no demuestra por sí mismo defecto del producto.
