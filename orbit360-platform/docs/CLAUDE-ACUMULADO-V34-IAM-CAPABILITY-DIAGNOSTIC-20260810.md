# CLAUDE ACUMULADO — V34 IAM CAPABILITY DIAGNOSTIC

Fecha: 2026-08-10

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Cuando una integración externa devuelve `403` o acceso denegado, no inferir inmediatamente que el servicio, recurso o dato no existe y no otorgar un rol a ciegas.

Aplicar esta secuencia:

1. identificar el permiso exacto requerido por la operación;
2. ejecutar una prueba mínima `testIamPermissions` contra el principal efectivo;
3. persistir únicamente booleanos de capacidad, no políticas completas ni identidad cruda;
4. si el permiso está presente, continuar diagnóstico de disponibilidad/API/retención;
5. si el permiso falta, clasificar `ENVIRONMENT_FAILURE / REQUIRED_PERMISSION_NOT_EFFECTIVE`;
6. cualquier grant posterior debe ser una operación separada, least-privilege, explícitamente autorizada, temporal/revocable cuando aplique y con before/after;
7. nunca reintentar la operación original para descubrir por ensayo-error qué rol hace falta.

## Evidencia Orbit 360 v34

La prueba solicitó exclusivamente:

- `logging.logEntries.list`;
- `logging.privateLogEntries.list`.

Resultado:

- ambos permisos efectivos: `false`;
- IAM policy bindings leídos: `false`;
- Audit Log entries leídos: `false`;
- datos cliente leídos: `false`;
- IAM writes: `0`;
- operational writes: `0`.

## Regla de implementación

Separar siempre:

- autorización para diagnosticar permisos;
- autorización para leer el recurso protegido;
- autorización para modificar IAM.

Una autorización no hereda automáticamente a la siguiente.
