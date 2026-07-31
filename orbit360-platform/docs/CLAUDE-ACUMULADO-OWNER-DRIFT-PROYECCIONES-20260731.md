# CLAUDE — PATRÓN ACUMULADO ANTI-REGRESIÓN · OWNER DRIFT

Fecha: 2026-07-31  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Una candidata futura no puede asumir que `wrapped=true` garantiza ownership vigente cuando múltiples bridges/owners envuelven una misma función.

Regla reusable:

- registrar identidad del wrapper vigente;
- si otro owner se instala después, envolver el owner actual sin reemplazarlo por una versión anterior;
- transformación de salida idempotente para impedir doble aplicación;
- reconciliación por eventos de lifecycle relevantes;
- prueba obligatoria de `late owner composition`;
- no duplicar store, auth, router ni backend para solucionar el síntoma.

## Gate anti-regresión

Agregar a la auditoría acumulada de candidatas:

```text
PROJECTION_OWNER_IDENTITY_CURRENT
PROJECTION_LATE_OWNER_RECOVERY
PROJECTION_RESULT_IDEMPOTENT
PROJECTION_NO_DOUBLE_APPLICATION
PROJECTION_LIFECYCLE_RECONCILIATION
VALIDATOR_SEMANTICS_NOT_SYNTAX_ONLY
```

## Frontera

Claude recibe únicamente este patrón arquitectónico reusable. No recibe:

- código backend LAB protegido;
- credenciales;
- datos A&S;
- requests de deploy;
- Rules;
- payloads reales de Recibos/Cartera.

La implementación concreta `backend-lab-receipts-portfolio-projection-v910.js` permanece `BACKEND_PROTEGIDO_NO_CLAUDE`.
