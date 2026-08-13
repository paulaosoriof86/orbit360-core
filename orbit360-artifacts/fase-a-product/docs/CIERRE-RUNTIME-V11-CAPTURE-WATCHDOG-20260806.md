# Cierre runtime v11 — capture watchdog — 2026-08-06

## Bloque

```text
gateId: block2.7-visual-matrix-corrected-post-auth-lab-v20260805
contractVersion: 2.7.8
requestVersion: 20260806.11-transport-base-sha-runtime
requestCommit: a6ed1d4ba5f97397929376ff61e60b1703c99d36
runId: 31135532118
jobId: 92733899380
```

## Resultado runtime

```text
GO_GATE_CONTRACT: 28/28 PASS
restauración backup v6: PASS
backup previo: visual-matrix-corrected-backup-31135532118
Hosting deploys: 1
precheck: PASS_VISUAL_BROWSER_PRECHECK / INICIO_READY_PASS
Dirección Inicio: PASS
matriz: STOP_RETRY
rollback: PASS
snapshot: VERIFIED_UNCHANGED
Firestore/Auth/operational writes: 0
```

## Clasificación y causa raíz

```text
PIPELINE_MECHANISM_FAILURE
CAPTURE_CHECKPOINT_IDLE_TIMEOUT_BROWSER_TERMINATED
checkpoint reportado: DIRECCION_NAVIGATE_CLIENTE360
último checkpoint estable: DIRECCION_ROUTE_INICIO_PASS
supervisor: CHECKPOINT_IDLE_TIMEOUT
```

La captura inicial de Dirección no emitió progreso durable durante los 90 segundos del presupuesto de inactividad. El supervisor terminó el proceso y la siguiente navegación recibió una página cerrada. Cliente 360 no llegó a ejecutarse con un navegador vivo; por tanto, este STOP no prueba un defecto funcional de Cliente 360, Auth o datos.

## Estado protegido

```text
request v11 consumido: sí
allowedExecutions: 0
authorizationFrozen: true
replayAllowed: false
Hosting LAB: rollback al backup previo v11
snapshot: idéntico
Functions/Rules/reimportación/producción/main/merge: 0
```

## Rootfix source-only

Se preservó la matriz funcional v1 sin cambios en:

```text
tools/orbit360-visual-runtime-rootfix-observable-matrix-v1-audited-20260805.mjs
```

La ruta registrada quedó como una envoltura mínima que parchea únicamente screenshot mediante:

- captura CDP de viewport;
- límite duro de 12 segundos;
- checkpoints START, HEARTBEAT, PASS/TIMEOUT;
- detach exclusivo de la sesión CDP;
- advertencia no bloqueante;
- cero cierre de página, contexto o navegador funcional.

Validación:

```text
runId: 31137027863
jobId: 92738551215
PASS_CAPTURE_WATCHDOG_SOURCE_ONLY: 17/17
PASS_PLAYWRIGHT_155_CAPTURE_PATCHABILITY
fase-aware: 17/17
signal-safe: 48/48
cross-runner: 24/24
Windows: 7/7
relay safety runId: 31137027905
runtime dispatched: false
```

El caso sintético de captura colgada venció en 350 ms, emitió heartbeat, desacopló una sesión CDP y dejó la página utilizable. No se accedió a secretos, Firebase, Hosting ni navegador real.

## Siguiente acción exacta

Mantener STOP_RETRY. No reutilizar v11. Una futura ejecución requiere autorización explícita nueva ligada al HEAD canónico entonces vigente; deberá volver a obtener GO_GATE_CONTRACT antes de secretos y conservar el mismo alcance read-only con rollback signal-safe.
