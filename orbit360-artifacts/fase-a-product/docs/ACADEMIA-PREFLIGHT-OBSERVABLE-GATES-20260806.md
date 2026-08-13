# Academia — preflight observable y evidencia de causa raíz

Fecha: 2026-08-06

## Idea central

Un gate no es confiable solo porque detiene una ejecución. También debe explicar, de forma sanitizada y verificable, por qué la detuvo.

## Problema observado

Un wrapper con aserciones directas y `set -e` puede terminar con código 1 antes de publicar:

- el check fallido;
- el checkpoint;
- la clasificación;
- la evidencia canónica disponible.

Eso protege el sistema, pero no permite diagnosticar la causa y puede generar ciclos de reintentos.

## Regla Orbit 360

```text
fallar cerrado + fallar observable
```

Todo fallo previo a secretos debe dejar como mínimo:

```text
status
classification
failedCheckIds
wrapperCheckpoint
cero accesos y escrituras
```

## Tres niveles de fallo

### Aserción del wrapper

Ejemplos:

```text
BRANCH_MISMATCH
REQUEST_FILE_MISSING
REQUEST_COMMIT_NOT_SINGLE_FILE
REQUEST_CONTRACT_INVALID
```

### Router canónico

El wrapper debe preservar los `failedCheckIds` generados por el router y agregar:

```text
CANONICAL_ROUTER_NONZERO
```

### Evidencia positiva

Un exit code cero no basta. Debe comprobarse:

```text
status == GO_GATE_CONTRACT
failed == 0
ok == true
secretAccess == false
runtimeExecuted == false
deployExecuted == false
```

## Diferencia metodológica

```text
FUNCTIONAL_DEFECT
```

La plataforma no cumple una función esperada.

```text
VALIDATOR_STALE
```

El validador exige una condición que ya no corresponde al contrato vigente.

```text
PIPELINE_MECHANISM_FAILURE
```

El mecanismo de preparación, transporte, observabilidad o ejecución impide obtener una decisión confiable.

El run `31110838424` fue un fallo del mecanismo de preflight, no un defecto funcional.

## Resultado reusable

La prueba source-only validó:

```text
PASS_OBSERVABLE_PREFLIGHT_WRAPPER_SOURCE
18/18
```

- error temprano con checkpoint;
- error del router con check interno preservado;
- camino positivo con `GO_GATE_CONTRACT`;
- cero secretos, datos, runtime, navegador y deploy.

## Aplicación por rol

- Dirección: una autorización no elimina la obligación de evidencia técnica.
- Operativo: no debe interpretar `exit code 1` como causa suficiente.
- Equipo técnico: no debe reintentar hasta convertir el fallo en un checkpoint observable.
- Asesor: sus permisos y datos no cambian por fallos del control plane.

## Regla de continuidad

Si el mismo stage falla sin identificar el check exacto, se congela runtime, se corrige la observabilidad y se prueba source-only antes de solicitar una nueva autorización.
