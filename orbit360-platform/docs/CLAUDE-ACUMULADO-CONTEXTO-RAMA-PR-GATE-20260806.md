# Claude acumulado — contrato de rama canónica y contexto PR

Fecha: 2026-08-06  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Los workflows de control deben separar:

1. rama canónica autorizada por el producto;
2. rama base reportada por el evento PR;
3. ref técnico del evento.

## Invariantes

```text
ORBIT360_CANONICAL_BRANCH = contrato explícito del producto
GITHUB_BASE_REF = rama base del PR
GITHUB_REF_NAME = contexto técnico del evento, no contrato de negocio
```

No se debe asumir que una variable reservada `GITHUB_*` puede sobrescribirse mediante `env` para cambiar su significado.

## Comportamiento esperado

- si `ORBIT360_CANONICAL_BRANCH` no coincide, detener con checkpoint propio;
- si el evento es PR y `GITHUB_BASE_REF` no coincide, detener;
- permitir refs como `18/merge` cuando la base y el contrato Orbit son correctos;
- ejecutar `GO_GATE_CONTRACT` antes de secretos o runtime;
- conservar checks internos del router;
- persistir evidencia sanitizada en todo fallo temprano.

## Implementación reusable

```text
tools/orbit360-preflight-visual-matrix-corrected-post-auth-once-v20260805.sh
tools/orbit360-test-observable-preflight-wrapper-v20260806.mjs
```

## Evidencia

```text
PASS_OBSERVABLE_PREFLIGHT_BRANCH_CONTEXT_SOURCE
24/24 PASS
```

Camino negativo 1:

```text
ORBIT360_CANONICAL_BRANCH_MISMATCH
```

Camino negativo 2:

```text
PULL_REQUEST_BASE_REF_MISMATCH
```

Camino positivo:

```text
GITHUB_REF_NAME=18/merge
GITHUB_BASE_REF=ays/backend-tenant-lab-v99-20260703
ORBIT360_CANONICAL_BRANCH=ays/backend-tenant-lab-v99-20260703
→ GO_GATE_CONTRACT
```

## Límites para Claude

Claude puede reutilizar:

- separación de contextos;
- nombres genéricos de variables propias;
- pruebas negativa y positiva;
- checkpoints sanitizados;
- validación de base PR.

Claude no debe recibir ni modificar:

- secretos;
- credenciales;
- datos reales A&S;
- requests vigentes;
- decisiones específicas de autorización;
- adaptadores Firestore protegidos;
- Rules;
- Auth productivo.
