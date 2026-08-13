# Academia — Request inmutable y ledger de consumo separado

Fecha: 2026-08-05

## Regla

Un archivo que dispara un workflow no debe modificarse para registrar su consumo. Deben existir tres piezas separadas:

```text
request inmutable de autorización
ledger de consumo no disparador
evidencia final no disparadora
```

## Riesgo evitado

Modificar el request para cambiar `AUTHORIZED` por `CONSUMED` genera otro evento `push` cuando el workflow observa ese path. Aunque el request final sea rechazado antes de secretos, se crea ruido, consume recursos y puede confundirse con un reintento autorizado.

## Patrón seguro

1. el request se crea una sola vez;
2. el workflow valida commit, nonce y ejecución permitida;
3. el consumo se registra en un ledger distinto;
4. el request nunca se edita;
5. los cierres actualizan documentación y evidencia fuera del path trigger;
6. ante STOP_RETRY no se publica ninguna modificación en paths disparadores.

## Clasificación

```text
PIPELINE_MECHANISM_FAILURE
```

No es defecto funcional ni de datos. Es un defecto en la separación de responsabilidades del control plane.
