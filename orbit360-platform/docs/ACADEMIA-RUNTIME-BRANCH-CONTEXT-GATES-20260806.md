# Academia — contexto de rama en preflight y runtime

Fecha: 2026-08-06

## Objetivo

Distinguir la rama canónica del producto del contexto técnico que GitHub Actions expone durante un pull request.

## Regla por rol

### Dirección

Un gate aprobado debe ejecutar exactamente el estado autorizado. Si el HEAD o el contrato de rama no coinciden, se detiene antes de secretos o infraestructura.

### Operativo

Debe revisar cuatro señales antes de una matriz visual:

```text
PASS_LIFECYCLE_SEQUENCE_SYNTHETIC 39/39
PASS_OBSERVABLE_PREFLIGHT_WRAPPER_SOURCE 18/18
PASS_OBSERVABLE_PREFLIGHT_BRANCH_CONTEXT_SOURCE 24/24
PASS_RUNTIME_BRANCH_CONTEXT_SOURCE 24/24
```

### Asesor

No interviene en el control técnico del gate. Su validación ocurre únicamente cuando el precheck y la matriz visual han sido autorizados y alcanzan su rol móvil.

## Variables correctas

```text
ORBIT360_CANONICAL_BRANCH
```

Contrato controlado por Orbit para identificar la rama autorizada.

```text
GITHUB_BASE_REF
```

Rama base del pull request, que debe coincidir con la rama canónica.

```text
GITHUB_REF_NAME
```

Contexto técnico de GitHub. Puede ser un merge ref y no debe decidir la identidad canónica.

## Diferencia entre defecto funcional y mecanismo

Este caso no fue un defecto de Cliente 360, Aseguradoras, Auth, datos, hidratación o renderización.

Clasificación correcta:

```text
PIPELINE_MECHANISM_FAILURE
RUNTIME_RUNNER_GITHUB_REF_NAME_CONTRACT_STALE
```

El primer source test produjo además:

```text
VALIDATOR_STALE
branchGuardBeforeBackup
```

El producto debía permanecer congelado mientras se corregía el validador.

## Orden correcto

```text
verificar source passes
→ activar lifecycle en commit exclusivo
→ crear request hijo exclusivo
→ validar preflight y runtime con el mismo contrato de rama
→ GO_GATE_CONTRACT
→ secretos únicamente con GO
→ backup
→ máximo un Hosting LAB
→ precheck
→ matriz read-only
```

## Resultado actual

```text
PASS_RUNTIME_BRANCH_CONTEXT_SOURCE 24/24
runtime real: no ejecutado
secretos/Firestore/browser/deploy: 0
```
