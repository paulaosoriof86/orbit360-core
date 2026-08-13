# Acumulado Claude — Microbloque 2.3

## Clasificación

```text
REPLICABLE_CLAUDE_ACUMULADO
```

## Patrón reusable

Cuando un gate compara una candidata contra un baseline histórico, no debe asumir que el commit existe en un checkout superficial.

Requisito reusable:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

Guard recomendado:

```bash
git cat-file -e "$SOURCE_BASELINE^{commit}"
git diff --quiet "$SOURCE_BASELINE"..HEAD^ -- <paths protegidos>
```

## Regla metodológica

- `0/N` no prueba fallo de un componente si su etapa fue `skipped`.
- La clasificación debe tomar la primera etapa fallida real.
- Un request consumido permanece inmutable.
- Un root fix del workflow no debe volver a disparar el request.
- El workflow se corrige; no se crea una variante paralela.

## No transferir

- nombres de personas;
- secretos;
- credenciales;
- datos reales A&S;
- URLs privadas;
- configuración tenant específica.

## Evidencia sanitizada

```text
classification: PIPELINE_MECHANISM_FAILURE
failureCode: SOURCE_BASELINE_NOT_PRESENT_IN_SHALLOW_CHECKOUT
rootFix: full-history checkout + baseline existence guard
runtime/deploy/browser: no
writes: 0
```
