# CLAUDE ACUMULADO — PATRÓN TRANSACCIONAL REUSABLE

Fecha: 2026-08-05  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón

Para actualizaciones atómicas de múltiples documentos:

```text
fase 1: leer todos los documentos
fase 2: validar snapshots y construir patches allowlisted
fase 3: programar todas las escrituras
fase 4: postverificar fuera de la transacción
```

No intercalar:

```text
read → write → read → write
```

## Requisitos reusables

- diff previo;
- allowlist de documentos y campos;
- comparación del snapshot actual contra el plan;
- cero escrituras si un documento cambió o desapareció;
- contadores derivados del resultado de la transacción, no de variables externas que puedan duplicarse en reintentos internos;
- evidencia sanitizada;
- código de error específico;
- request consumido e inmutable ante fallo;
- nueva autorización para cualquier nueva ejecución.

## Exclusiones

No incluye nombres, correos, tenant real, credenciales, rutas privadas de datos ni código de backend protegido.
