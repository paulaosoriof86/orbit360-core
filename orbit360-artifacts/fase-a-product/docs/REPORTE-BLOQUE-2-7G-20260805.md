# REPORTE BLOQUE 2.7G — VISUAL OBSERVABLE V2

## Bloque

`2.7G · rootfix visual observable v2`

## Carriles

- A: correctivo de hidratación source-only cerrado 24/24.
- B: Auth y memberships sin cambios; cero secretos leídos.
- C: datos y Cobros sin cambios; cero reimportación.

## Avance visible

El producto ya separa dependencias esenciales y opcionales mediante un overlay de solo lectura. El bloqueo de `Inicio` por `asesores` quedó corregido en fuente.

## Fuente/base

RC-AYS-LAB-CANONICA-01, PR #5, rama obligatoria y evidencia del run 31063000137.

## Implementación

- overlay required/optional;
- proyección visual de responsables;
- lifecycle/engine/runner 2.7.5;
- precheck y matriz preservados;
- backup y rollback definidos.

## Pruebas/evidencia

```text
source validation: 24/24 PASS
workflow runs v2: 0
runtime executed: NO
```

## Estado

```text
STOP_RETRY · PIPELINE_MECHANISM_FAILURE
ACTIONS_TRIGGER_NOT_CREATED
authorization: reserved, not consumed
```

## Acumulado Claude

`REPLICABLE_CLAUDE_INMEDIATO` para el patrón required/optional; no incluir backend protegido ni datos reales.

## Academia

Actualizada con diferencia entre dependencia esencial, fuente opcional, estado degradado y fallo de pipeline.

## Pendiente

Exponer dispatch soportado para el runner ya versionado.

## Siguiente acción exacta

Crear un workflow run mediante dispatch soportado; ejecutar primero el gate canónico y detenerse si no produce `GO_GATE_CONTRACT`.
