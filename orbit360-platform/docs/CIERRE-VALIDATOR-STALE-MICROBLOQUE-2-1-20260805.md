# Cierre de causa raíz — VALIDATOR_STALE en Microbloque 2.1

Fecha operativa: 2026-08-04 22:15 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Run detenido: `30974443335`  
Gate: `GO_LAB_CANDIDATE_VISIBLE`

## Decisión

```text
STOP_RETRY aplicado
VALIDATOR_STALE confirmado
producto congelado
continuación correctiva habilitada
```

## Evidencia exacta

El run pasó:

- checkout del request exacto;
- validación del request único;
- comparación contra el baseline congelado.

Se detuvo en el preflight canónico antes de secretos con:

```text
status: VALIDATOR_STALE
checks: 26/28
failed:
- REQUEST_ACTIVE
- VIDEO_LAYOUTFREE_HARNESS
```

No se ejecutaron:

```text
secret access: no
Firestore read: no
Firestore write: 0
Auth write: 0
Functions deploy: no
Hosting deploy: no
browser: no
reimportación: no
Rules: no
producción: no
main: no
merge: no
```

## Causa raíz

El workflow visual ya utilizaba el contrato autorizado del Microbloque 2.1 y el arnés v6 de contextos aislados, pero el motor canónico de Gate 12.0.11 todavía exigía:

- request visual layout-free v1;
- autorización anterior;
- fallo anterior en Pólizas;
- prueba basada en `layoutProbe` y `domProbe` v5.

La candidata no falló. El validador observaba una generación retirada del pipeline.

Clasificación:

```text
VALIDATOR_STALE
owner: tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-layoutfree-lab-v20260804.mjs
```

## Correctivo aplicado

Se sincronizaron:

1. lifecycle Gate 12.0.11;
2. motor canónico del preflight;
3. extensión explícita del registro;
4. request v2 de `GO_LAB_CANDIDATE_VISIBLE`;
5. root cause `ROUTE_ASEGURADORAS_NAVIGATION_TIMEOUT`;
6. evidencia sintética `30971707956 · 8/8 PASS`;
7. arnés v6 `ONE_ISOLATED_BROWSER_CONTEXT_AND_DIRECT_URL_PER_ROUTE`;
8. política de retención: conservar preview cuando producto e integridad pasan, aunque falle solo evidencia visual.

## Continuación

El primer run no consumió secretos ni capacidad de despliegue. La continuación correctiva pertenece a la misma autorización del Microbloque 2.1 y debe:

- ejecutar nuevamente el preflight corregido;
- acceder a secretos solo con `GO_GATE_CONTRACT`;
- desplegar únicamente cuatro Functions allowlisted y un Hosting preview;
- conservar cero escrituras de datos;
- no repetir los 18 escenarios funcionales;
- no crear otro workflow visual.

Ante repetición de `REQUEST_ACTIVE`, `ISOLATED_ROUTE_HARNESS` o la misma etapa de preflight, corresponde STOP definitivo sin otro parche.
