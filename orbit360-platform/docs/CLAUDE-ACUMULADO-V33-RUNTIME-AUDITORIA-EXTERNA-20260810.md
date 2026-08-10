# Claude acumulado — v33 auditoría externa y control de permisos

Fecha: 2026-08-10

Clasificación principal: `REPLICABLE_CLAUDE_ACUMULADO` / `ACADEMIA_ACTUALIZAR`.

No enviar a Claude: credenciales, PII, IDs reales de documentos, resource names, principals, IPs, contenido de logs crudos, ejecutores backend protegidos ni requests reales.

## Patrones reutilizables

### 1. Gate antes de capacidad externa
Separar source validation de runtime. El gate runtime debe validar request inmutable, parent binding, límites de lectura y zero-write antes de materializar credenciales.

### 2. Permiso no equivale a evidencia
Un error de autorización contra una fuente externa autoritativa se clasifica como `ENVIRONMENT_FAILURE`. No convertirlo en `NO_MATCH`, no inferir inexistencia de eventos y no modificar datos para obtener PASS.

### 3. Request histórico inerte
Después de una ejecución, conservar el request como evidencia y congelarlo:

```text
allowedExecutions = 0
consumed = true
authorizationFrozen = true
replayAllowed = false
```

El source gate puede reconocer ese estado como histórico sin volver a autorizar runtime.

### 4. IAM fail-closed
Antes de conceder permisos, diagnosticar la capacidad exacta requerida. No añadir roles a partir de un `403` genérico. Si la capacidad no está demostrada, preparar primero un test read-only de permisos.

### 5. Sanitización por diseño
La evidencia persistida debe limitarse a clases, conteos, estados, fingerprints y métricas. Nunca persistir entradas crudas de auditoría o identificadores sensibles cuando no son necesarios para la decisión.

## Resultado reusable del bloque

El flujo distinguió correctamente:

- `PIPELINE_MECHANISM_FAILURE` pre-ejecución por YAML inválido;
- `VALIDATOR_STALE` por requerir ausencia física de request consumido;
- `ENVIRONMENT_FAILURE` por auditoría externa no disponible/prohibida;
- `DATA_CONTRACT_FAILURE` que continúa abierto para la procedencia de los registros mientras no exista evidencia autoritativa.

Este patrón debe reutilizarse en futuros tenants y fuentes externas: primero contrato, luego capacidad, luego evidencia; nunca al revés.
