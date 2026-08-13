# ACADEMIA — ACTUALIZACIÓN V34 IAM CAPABILITY DIAGNOSTIC

Fecha: 2026-08-10

Clasificación: `ACADEMIA_ACTUALIZAR`

## Aprendizaje transversal

Un error de acceso no debe confundirse con ausencia del recurso.

En v33, la consulta a Audit Logs terminó en `AUDIT_UNAVAILABLE_OR_FORBIDDEN`. V34 no repitió los logs: probó únicamente las capacidades del principal efectivo mediante `testIamPermissions`.

Resultado:

- `logging.logEntries.list`: no efectivo;
- `logging.privateLogEntries.list`: no efectivo.

Por tanto, la causa inmediata es una brecha de permisos del entorno, no evidencia de que los logs no existan.

## Diferencias que debe enseñar Academia

### Defecto funcional

El producto o módulo no cumple el comportamiento esperado.

### Validador obsoleto

El gate o detector rechaza una implementación válida o se auto-coincide con sus propios sentinels. En v34 ocurrió dos veces en preparación source y se corrigió sin tocar producto ni repetir runtime.

### Falla de entorno / IAM

La operación necesaria es válida pero el principal no posee la capacidad efectiva requerida. V34 cerró en esta categoría.

### Ausencia de evidencia

No debe declararse hasta haber distinguido permiso, API, retención y consulta. Un `403` por sí mismo no demuestra que no existan eventos.

## Regla pedagógica

Antes de escalar privilegios:

1. identificar permisos exactos;
2. comprobarlos con la mínima superficie posible;
3. no leer políticas completas si no son necesarias;
4. no conceder roles automáticamente;
5. separar autorización de diagnóstico, lectura y escritura IAM;
6. documentar before/after y rollback cuando exista un grant.

## Aplicación por rol

- Dirección: entiende por qué un bloqueo de acceso no implica pérdida de datos.
- Operativo: distingue un error de plataforma de un permiso faltante.
- Administración técnica: aplica least privilege y gates antes de secretos.
- Academia avanzada: diferencia `ENVIRONMENT_FAILURE`, `VALIDATOR_STALE`, `DATA_CONTRACT_FAILURE` y `SECURITY_FAILURE` con evidencia observable.
