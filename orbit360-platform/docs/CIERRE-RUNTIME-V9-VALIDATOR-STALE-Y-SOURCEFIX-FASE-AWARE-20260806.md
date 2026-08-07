# Cierre runtime v9 — validator stale y sourcefix fase-aware — 2026-08-06

## Bloque

```text
gateId: block2.7-visual-matrix-corrected-post-auth-lab-v20260805
contractVersion: 2.7.8
requestVersion: 20260806.9-portable-preflight-runtime
requestCommit: ab2e2c7d6ecf7d17afb209d805a973ca1ce92be7
runId: 31132719654
jobId: 92725164323
```

## Decisión

```text
STOP_RETRY_V9_VALIDATOR_STALE_PRE_GATE
classification: VALIDATOR_STALE
failureCode: PREFLIGHT_SOURCE_TEST_PHASE_EXPECTATION_STALE
checkpoint: VALIDATE_SOURCE_PACKAGE_BEFORE_GATE
```

## Causa raíz

El paquete source-only confirmó correctamente:

```text
Windows compatibility: 7/7 PASS
signal-safe: 48/48 PASS
cross-runner: 24/24 PASS
```

El último test seguía evaluando exclusivamente el estado histórico del overlay v8:

- `stopRetryActive=true`;
- runtime deshabilitado;
- autorización fresca pendiente.

La autorización v9 había cambiado correctamente el overlay a una fase distinta:

- v8 no reutilizable;
- `stopRetryActive=false`;
- runtime permitido únicamente con request fresco y exclusivo;
- producción y escrituras prohibidas.

Por ello fallaron únicamente:

```text
overlayClosesV8
overlayNoRuntime
overlayFreshAuth
```

No era un defecto funcional, del router, del guard, del request ni del producto. Era una expectativa de validador obsoleta frente a la transición de fase autorizada.

## Riesgo ejecutado

```text
GO_GATE_CONTRACT: no ejecutado
secretos: no leídos
Firebase/Firestore/Auth: no accedidos
restauración backup v6: no ejecutada
backup nuevo: no creado
Hosting deploys: 0
precheck/navegador/matriz/snapshot: no ejecutados
Firestore/Auth/operational writes: 0
Functions/Rules/reimportación: 0
producción/main/merge: 0
rollback: no requerido
```

## Control de autorización

El request v9 quedó:

```text
status: CONSUMED_STOP_RETRY_VALIDATOR_STALE_PRE_GATE
allowedExecutions: 0
consumed: true
authorizationFrozen: true
replayAllowed: false
```

El lifecycle y overlay quedaron en STOP_RETRY. PR temporal #28 fue cerrado sin merge.

## Sourcefix

El validador ahora reconoce dos fases válidas y mutuamente excluyentes:

1. `STOP_RETRY`: no runtime, no Hosting y autorización fresca requerida.
2. `AUTHORIZED_FRESH_REQUEST_ONLY`: runtime/Hosting únicamente con request fresco y exclusivo; v8/v9 anteriores siguen no reutilizables; producción y escrituras continúan bloqueadas.

Validación observable:

```text
runId: 31133118442
jobId: 92726421515
PASS_SOURCE_ONLY_PHASE_AWARE_PREFLIGHT_VALIDATOR
17/17 PASS
```

El relay de seguridad paralelo `31133118404` terminó en SKIP seguro; no abrió runtime.

## Evidencias

```text
orbit360-platform/runtime-gate-crm-v20260716/visual-matrix-v9-validator-stale-stop-sanitized-v20260806.json
orbit360-platform/runtime-gate-crm-v20260716/preflight-portable-source-test-sanitized-v20260806.json
.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json
tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json
tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json
```

## Estado

```text
PASS_VISUAL_POST_AUTH: NO
matriz visual: pendiente
snapshot final: pendiente
Hosting LAB: sin cambios
Cobros 4.1: pausado
```

## Siguiente acción exacta

No reutilizar v9 ni repetir el run. Una nueva ejecución requiere autorización explícita separada, activación ligada al HEAD entonces vigente y un request nuevo e inmutable. Antes de secretos debe obtener `GO_GATE_CONTRACT` observable con el validador fase-aware ya corregido.
