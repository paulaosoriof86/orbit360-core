# Claude acumulado — runtime branch context

Fecha: 2026-08-06  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Los workflows disparados por pull request deben separar:

```text
rama canónica de producto → variable propia del sistema
rama base del PR → GITHUB_BASE_REF
ref técnico del evento → GITHUB_REF_NAME
```

Nunca usar `GITHUB_REF_NAME` como identidad canónica del producto.

## Aplicación reusable

```bash
CANONICAL_BRANCH="${ORBIT360_CANONICAL_BRANCH:-}"
EVENT_NAME="${GITHUB_EVENT_NAME:-}"
EVENT_BASE_REF="${GITHUB_BASE_REF:-}"

[[ "$CANONICAL_BRANCH" == "$BRANCH" ]] || stop
if [[ "$EVENT_NAME" == 'pull_request' || -n "$EVENT_BASE_REF" ]]; then
  [[ "$EVENT_BASE_REF" == "$BRANCH" ]] || stop
fi
```

## Gate reusable

El mismo contrato debe aplicarse en:

- wrapper de preflight;
- runner posterior al GO;
- workflows de transporte;
- fixtures y validadores source-only;
- documentación y Academia.

## Regla del validador

Los validadores deben apuntar al checkpoint de ejecución real, no a una coincidencia textual ubicada dentro de helpers declarados antes del guard.

Ejemplo de falso positivo evitado:

```text
hosting:clone dentro de rollback_if_needed
```

Checkpoint correcto:

```text
BACKUP_CHANNEL="visual-matrix-corrected-backup-${GITHUB_RUN_ID}"
```

## Evidencia

```text
run inicial: 31114761477
resultado: VALIDATOR_STALE · 23/24

run corregido: 31114904985
resultado: PASS_RUNTIME_BRANCH_CONTEXT_SOURCE · 24/24
```

## Exclusiones

No enviar a Claude:

- credenciales;
- datos reales;
- configuración de Firebase;
- membresías o identidades;
- backend protegido;
- rutas o secretos operativos.
