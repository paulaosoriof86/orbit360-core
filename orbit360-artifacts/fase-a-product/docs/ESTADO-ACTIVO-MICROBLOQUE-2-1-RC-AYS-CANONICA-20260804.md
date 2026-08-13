# ESTADO VIGENTE — MICROBLOQUE 2.1

Fecha: 2026-08-04  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `GO_LAB_CANDIDATE_VISIBLE`  
Estado: `STOP_RETRY_DEFINITIVE_CONTROL_PLANE`

## Entradas preservadas

```text
PASS_PLAN_PERSISTED
PASS_CANONICAL_BASELINE
PASS_ISOLATED_ROUTE_HARNESS
```

Continúan válidos:

```text
run funcional 30962756387: 18/18 PASS
run sintético 30971707956: 8/8 PASS
baseline: 430 clientes / 30 aseguradoras
sourceBaseline: 548cffa50cddfd93ad2118f5a06e9bb420699bde
```

## Autorización consumida

La autorización del Microbloque 2.1 produjo dos intentos autorizados, ambos detenidos antes de secretos:

### Run 30974443335

```text
VALIDATOR_STALE
REQUEST_ACTIVE
VIDEO_LAYOUTFREE_HARNESS
secretos: no
Firebase: no
deploy: no
```

### Run 30974745085

```text
VALIDATOR_STALE
CANONICAL_PREFLIGHT_ENTRYPOINT
CANONICAL_LIFECYCLE_REVISION_MISMATCH
secretos: no
Firebase: no
deploy: no
```

## Causa raíz definitiva

Owner:

```text
tools/orbit360-validar-gate-contracts-v20260717.mjs
```

El outer router exige:

```text
validatorLifecycleRevision = phase-capability-contract-v1
```

La generación del arnés aislado fue registrada incorrectamente en ese mismo campo como:

```text
isolated-context-direct-url-v6
```

La composición canónica y la versión del arnés deben ser campos separados. El inner engine corregido no llegó a ejecutarse en el segundo run.

## Incidente administrativo de cierre

Al marcar el request como consumido se modificó por error el mismo path que dispara el workflow. Esto generó automáticamente:

```text
run: 30975037529
clasificación: ADMINISTRATIVE_TRIGGER_REJECTED_BEFORE_PREFLIGHT
request validation: FAIL
preflight: SKIPPED
secretos: SKIPPED
Functions: SKIPPED
Hosting: SKIPPED
browser: SKIPPED
```

Este run no cuenta como ejecución autorizada ni intento runtime. Fue un error metodológico del procedimiento de cierre y quedó bloqueado antes del preflight. El request disparador no se vuelve a modificar; su consumo vive únicamente en el ledger y evidencia no disparadora.

## Resultado consolidado

```text
URL LAB: no producida
Functions: 0/4
Hosting: no desplegado
rutas visuales: 0/8
snapshots: no ejecutados
Firestore writes: 0
Auth writes: 0
Rules: no
reimportación: no
producción/main/merge: no
```

La candidata y los datos permanecen intactos. No se demostró defecto funcional.

## STOP_RETRY

Quedan prohibidos:

- otro request autorizado;
- otro run runtime;
- otro parche a esta familia;
- otro workflow visual;
- acceso a secretos;
- despliegue LAB bajo esta autorización;
- repetir los 18 escenarios;
- modificar nuevamente el archivo request disparador.

## Siguiente acción exacta

```text
SOURCE_ONLY_CONTROL_PLANE_REDESIGN
PASS_CANONICAL_PREFLIGHT_COMPOSITION
```

Debe probar conjuntamente outer router e inner engine, conservar `phase-capability-contract-v1`, declarar `visualHarnessRevision` por separado, separar request inmutable de ledger de consumo y reparar el generador de evidencia que escribió un contador fijo de Functions.

Esta acción no incluye runtime, secretos, Firebase, navegador o deploy. Después de un PASS estático integrado se requerirá una autorización explícita nueva.

Fuentes vigentes:

1. ledger de `RC-AYS-LAB-CANONICA-01`;
2. `CIERRE-STOP-RETRY-MICROBLOQUE-2-1-GO-LAB-CANDIDATE-VISIBLE-20260805.md`;
3. evidencia `rc-ays-lab-canonica-01-microblock21-stop-retry-v20260805.json`;
4. incidente `rc-ays-lab-canonica-01-request-consumption-trigger-incident-v20260805.json`;
5. PR #5 draft/open.
