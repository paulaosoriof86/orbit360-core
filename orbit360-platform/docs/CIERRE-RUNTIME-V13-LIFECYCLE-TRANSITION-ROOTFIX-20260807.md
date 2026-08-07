# Cierre runtime v13 — lifecycle transition rootfix

Fecha: 2026-08-07  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`  
Contrato: `2.7.8`  
Runtime fallido: `31180161363` / job `92871250697`

## Clasificación

`VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`.

No se observó defecto funcional de Auth, Cliente 360, Aseguradoras, navegación, datos ni UI porque v13 se detuvo antes de secretos, Firebase, Hosting y navegador.

## Causa raíz

El control-plane tenía dos fases conceptuales, pero la transición no estaba implementada como contrato obligatorio:

1. activación source-only validada, sin capacidades runtime;
2. fase runtime-pending, requerida por router y engine antes de crear el request exclusivo.

V12/v13 crearon el request mientras el lifecycle seguía en la primera fase. El guard había sido adaptado para aceptar esa fase source-only, mientras router y engine exigían correctamente `VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION`. Esto produjo `CANONICAL_LIFECYCLE_PHASE_MISMATCH`.

Se detectó además un defecto de cierre: ante el STOP en `GO_GATE_CONTRACT`, el workflow persistió evidencia pero el request v13 permaneció temporalmente `AUTHORIZED_ONCE`. Fue congelado inmediatamente antes de continuar.

## Rootfix

- Guard, router y engine quedan alineados en fase runtime: `VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION`.
- El guard exige status `AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST` y las capacidades exactas del contrato runtime.
- La fase source-only ya no puede validar un request runtime.
- Se agregó transición explícita `tools/orbit360-transition-visual-matrix-lifecycle-source-to-runtime-v20260807.mjs`.
- La transición solo opera después de PASS source-only y con el request previo consumido/frozen.
- Se agregó `tools/orbit360-consume-visual-matrix-request-on-stop-v20260807.mjs` para consumir/freeze automáticamente request, lifecycle y overlay ante cualquier STOP.
- Las pruebas source-only exigen que todo workflow armado incluya el consumidor automático de STOP.

## Evidencia source-only

Run `31181042129`, job `92874108672`, relay safety `31181041526`.

- request↔lifecycle runtime: 12/12 PASS;
- transición/consumo automático: 31/31 PASS;
- transporte base SHA: 12/12 PASS;
- capture watchdog: 17/17 PASS;
- signal-safe: 48/48 PASS;
- cross-runner: 24/24 PASS;
- Windows: 7/7 PASS;
- relay real fail-closed: PASS;
- secretos/Firebase/Hosting/browser/deploy/escrituras: 0.

## Estado protegido

Request v13 consumido, allowedExecutions 0, frozen, replay false. Lifecycle/overlay permanecen STOP_RETRY. Registered relay permanece `NONE_PENDING_FRESH_AUTHORIZATION`.

No existe autorización runtime pendiente. Un futuro runtime requiere autorización explícita nueva y no puede reutilizar v13.
