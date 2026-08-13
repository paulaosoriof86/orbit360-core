# Claude acumulado — transporte inmutable por base SHA v10 — 2026-08-06

## Clasificación

```text
REPLICABLE_CLAUDE_ACUMULADO
```

## Patrón reusable

Para un request runtime exclusivo:

```text
head branch = canonical branch
changed files = 1
changed path = immutable request
base commit SHA = request.parentHead
allowedExecutions = 1
replayAllowed = false
```

No exigir que el nombre de la rama base sea la rama canónica cuando la arquitectura usa una rama de activación inmutable como padre del request.

## Implementación

- resolver `origin/$GITHUB_BASE_REF^{commit}`;
- validar SHA de 40 caracteres;
- comparar contra `request.parentHead`;
- rechazar push, base ausente, SHA diferente, request consumido o rama canónica distinta;
- delegar al runner operativo únicamente después del PASS;
- mantener producción, Functions, Rules y escrituras bloqueadas.

## Antipatrón retirado

```text
GITHUB_BASE_REF == canonicalBranch
```

como única prueba de procedencia.

## Evidencia v10

```text
GO_GATE_CONTRACT: 28/28 PASS
prior v6 restore: PASS
runtime stopped before new backup/deploy/browser
writes: 0
request consumed and non-replayable
```

## Exclusiones

No compartir con Claude secretos, credenciales, datos reales A&S ni adaptadores backend protegidos.
