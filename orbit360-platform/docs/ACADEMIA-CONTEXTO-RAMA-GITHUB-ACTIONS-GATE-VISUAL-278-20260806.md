# Academia — contexto de rama en GitHub Actions

Fecha: 2026-08-06  
Caso: gate visual 2.7.8

## Tres referencias distintas

### Rama canónica de Orbit

Es la rama autorizada por el contrato operativo:

```text
ays/backend-tenant-lab-v99-20260703
```

Debe viajar en una variable propia:

```text
ORBIT360_CANONICAL_BRANCH
```

### Rama base del pull request

GitHub la publica en:

```text
GITHUB_BASE_REF
```

Para un transporte técnico, debe coincidir con la rama canónica.

### Ref del evento

GitHub puede publicar en `GITHUB_REF_NAME` valores asociados al PR, por ejemplo:

```text
18/merge
```

Ese valor identifica el contexto del evento, no la rama canónica de Orbit.

## Regla operacional

```text
ORBIT360_CANONICAL_BRANCH == rama autorizada
GITHUB_BASE_REF == rama autorizada cuando el evento es pull_request
GITHUB_REF_NAME != fuente de verdad de la rama canónica
```

## Caso real

El transporte, lifecycle y request estaban correctamente ligados. El wrapper se detuvo en:

```text
BRANCH_MISMATCH
```

La causa fue comparar `GITHUB_REF_NAME` contra la rama canónica.

## Clasificación

```text
PIPELINE_MECHANISM_FAILURE
```

No corresponde a un defecto funcional de Orbit 360 ni a datos incorrectos.

## Prueba reusable

La prueba source-only valida:

- variable Orbit incorrecta;
- base PR incorrecta;
- ref PR `18/merge` permitido con base correcta;
- preservación de errores internos del router;
- camino positivo a `GO_GATE_CONTRACT`.

Resultado:

```text
PASS_OBSERVABLE_PREFLIGHT_BRANCH_CONTEXT_SOURCE
24/24
```

## Aplicación por rol

- Dirección autoriza el riesgo y la rama objetivo.
- Operativo distingue rama canónica, base del PR y ref del evento.
- Equipo técnico usa variables propias para contratos de negocio y variables de GitHub únicamente para verificar el contexto del evento.
- Los scopes de Asesor no cambian por la ejecución de un gate.

## Diferencia clave

```text
Defecto funcional
```

Una función de la plataforma no cumple lo esperado.

```text
Validador obsoleto
```

El instrumento exige una condición que ya no corresponde.

```text
Fallo del pipeline
```

El mecanismo interpreta incorrectamente el contexto de ejecución y detiene el gate antes del producto.

Este caso fue un fallo del pipeline y quedó cerrado en fuente.
