# Block 1 — Rootfix validador late-ready — 2026-08-11

## Bloque
Block 1 — Cliente 360 + Aseguradoras. Gate `block1-client360-insurers-lab-v20260717`, contrato `1.0.41`.

## Fuente y evidencia
Runtime previo: `31517840174`, request one-shot sobre `311b5b9f6d962e4a00302afd6636858871e6404f`.

El rootfix Firebase default-app-ready sí funcionó: Dirección, Operativo y Asesor alcanzaron app `[DEFAULT]`, Auth y custom-token sign-in. Dirección cerró con cero fallos. En Operativo, Cliente360 quedó en estado canónico correcto al finalizar el timeout del validador, pero el harness lo convirtió en `VALIDATOR_STALE` bloqueante. En Asesor, `waitRouterReady()` agotó el timeout y emitió `FUNCTIONAL_DEFECT` sin capturar el estado post-timeout ni identificar qué owner seguía incumplido.

## Clasificación de causa raíz
`VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`.

Familias:
- `ROUTER_TIMEOUT_WITHOUT_POST_STATE_SNAPSHOT`
- `LATE_CANONICAL_CLIENT_READY_MISCLASSIFIED_AS_BLOCKING_VALIDATOR_STALE`
- `FUNCTIONAL_DEFECT_EMITTED_WITHOUT_OWNER_SPECIFIC_POST_TIMEOUT_EVIDENCE`

Un timeout es una observación temporal, no una prueba suficiente de defecto funcional. El defecto funcional solo puede emitirse después de verificar el estado canónico post-timeout y demostrar qué owner sigue incumplido.

## Esperado
- Si el timeout termina pero el estado canónico ya está listo, recuperar como PASS tardío.
- Si el estado no está listo, registrar snapshot y owners fallidos.
- Conservar fail-closed: ruta/parámetro/hidratación/DOM incorrectos siguen bloqueando.
- No tocar producto, backend protegido ni datos para corregir un defecto del validador.

## Implementación source-only
Archivos del control-plane:
- `tools/orbit360-block1-final-native-matrix-v20260811.mjs`
- `tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs`
- `tools/fixtures/orbit360-block1-visual-antibucle-fixture-v20260811.mjs`
- `tools/orbit360-validator-lifecycle-block1-final-visual-runtime-v20260810.json`
- `.github/workflows/orbit360-block1-final-visual-source-v20260810.yml`
- `.github/workflows/orbit360-block1-final-visual-runtime-bootstrap-segmented-v20260811.yml`

Owners nuevos:
- Router readiness: `post-timeout-canonical-state-recheck-with-owner-diagnostics`
- Cliente late-ready: `post-timeout-canonical-state-recovery`
- Fail-closed: `late-ready-recovered-owner-specific-failure-only`

Comportamiento:
1. Router espera normalmente.
2. Ante timeout toma snapshot de Orbit/Router/ruta/hidratación/loading/host/Auth/membership.
3. Si todo está canónicamente listo, registra `ROUTER_READY_LATE_PASS` y continúa.
4. Si no está listo, identifica `failedOwners` y falla según evidencia.
5. Cliente360 recupera como PASS un detalle/ruta que ya está canónicamente listo después del timeout.
6. Parámetro equivocado, DOM incompleto o estado realmente no listo continúan bloqueados.

## Seguridad y alcance
Este rootfix es source-only:
- secretos: 0
- Firebase LAB: 0
- browser runtime: 0
- Hosting: 0
- Firestore/Auth/operational writes: 0
- Functions/Rules: 0
- reimportación: 0
- producción/main/merge: 0

El request del runtime `31517840174` está consumido y no se reutiliza. El futuro contrato utiliza una ruta/version nuevas y el request debe permanecer ausente hasta autorización explícita.

## Carriles
- A — Frontend/UX: producto congelado; no se modifica.
- B — Backend/control-plane: rootfix del harness y validadores.
- C — Datos/migración: sin cambios; universo aceptado preservado.

## Claude / reutilización
`REPLICABLE_CLAUDE_ACUMULADO`: patrón reusable `post-timeout canonical recheck -> late-ready recovery -> owner-specific fail-closed`.

No enviar datos reales, secretos ni backend protegido.

## Estado
Source candidate en preparación. No declarar PASS hasta obtener un run source fail-closed único con evidencia sanitizada v7.

## Siguiente acción exacta
Ejecutar una única validación source v7. Solo si obtiene PASS, persistir evidencia sanitizada y dejar `SOURCE_PASS_AWAITING_FRESH_EXCLUSIVE_REQUEST`. Ningún runtime ni request nuevo sin autorización explícita posterior.
