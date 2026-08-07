# Cierre sourcefix v20 — exact matrix artifact gate

Fecha: 2026-08-07
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`
Base autorizada: `a3e833b8f162f0313dda19f9bd2cf1730ad9871c`

## Necesidad

Cerrar la causa raíz v19 `PIPELINE_MECHANISM_FAILURE / MATRIX_WRAPPER_TRANSFORM_LEFT_ORPHANED_GO_BODY` sin reintentar runtime ni modificar Cliente 360, datos, Auth, Rules o importadores.

## Causa raíz

El wrapper v19 transformaba parcialmente el texto del archivo auditado: reemplazaba `waitRouteReady()` y solo la apertura de `go()`. El replacement ya contenía un `go()` completo; el cuerpo original quedaba detrás y producía un `return` huérfano al nivel del módulo. El gate source validaba el wrapper, no el artefacto generado.

## Implementación v20

- Nuevo owner de generación: `tools/orbit360-build-v20-route-aware-matrix-artifact-v20260807.mjs`.
- El builder consume el bloque completo `waitRouteReady + go` y genera una sola función `go()`.
- Conserva la secuencia `REQUIRED_HYDRATION` antes de navegación, luego `NAVIGATE`, luego `RENDER_READY`.
- Conserva `VALIDATOR_STALE_RENDER_PROBE_BLOCKED`, route metrics y toda la instrumentación bounded-render v19.
- El wrapper runtime genera el artefacto exacto, ejecuta `node --check` sobre ese mismo archivo y solo entonces lo importa.
- Un fallo de compile/import persiste evidencia como `PIPELINE_MECHANISM_FAILURE`.
- El sealer ya no convierte ausencia/fallo de artefacto en `FUNCTIONAL_DEFECT`.

## Gate exacto

El fixture source crea el mismo artefacto que runtime ejecutará y prueba:

- compilación exacta;
- import/evaluación exacta con dependencias aisladas;
- una sola función `go()`;
- ausencia del cuerpo antiguo huérfano;
- orden required → navigation → render-ready;
- rechazo de un artefacto corrupto con `return` superior;
- determinismo del generador.

Artefacto SHA-256: `ad134ad776f201451dc9a7b0cccd3c4f0ba1a3daf728581d077ed490ba003762`.

## Evidencia

Run final source: `31207526354` · job `92962154309`.

- exact artifact: 21/21 PASS;
- request/lifecycle: 17/17 PASS;
- capture watchdog: 19/19 PASS;
- Windows signal: 7/7 PASS;
- signal-safe: 48/48 PASS;
- cross-runner: 24/24 PASS;
- preflight: 37/37 PASS;
- transport-base SHA: 12/12 PASS.

El primer run source `31207443011` detectó correctamente `VALIDATOR_STALE`: el watchdog exigía delegación textual directa al archivo auditado. Se congeló producto y se actualizó exclusivamente el validator/owner. El run final cerró todo en PASS.

## Frontera de riesgo

Durante source v20:

- secretos: 0;
- Firebase: 0;
- Hosting: 0;
- navegador: 0;
- Firestore/Auth/operational writes: 0;
- Functions/Rules/reimportación/producción/main/merge: 0.

Cliente 360 bounded render v19 permanece intacto y todavía requiere validación runtime mediante una autorización/request v20 nuevo.

## Estado

`PASS_V20_NATIVE_MATRIX_ARTIFACT_SOURCE_ONLY`.

Siguiente acción: sincronizar lifecycle/overlay/relay v20 y realizar transición source→runtime-pending sin secretos. Solo después puede existir un request v20 exclusivo e inmutable.
