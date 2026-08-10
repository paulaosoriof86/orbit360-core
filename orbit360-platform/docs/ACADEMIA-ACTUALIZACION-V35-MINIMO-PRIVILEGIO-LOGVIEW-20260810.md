# ACADEMIA — V35 MÍNIMO PRIVILEGIO EN LOG VIEW

Fecha: 2026-08-10

## Aprendizaje incorporado

Cuando un diagnóstico demuestra que faltan permisos para una evidencia autoritativa, la respuesta correcta no es ampliar privilegios de forma general.

V35 enseña el patrón:

1. demostrar primero qué permiso falta;
2. identificar el recurso de menor alcance donde puede concederse la capacidad;
3. evitar proyecto/organización si una Log View es suficiente;
4. preservar la policy existente con `etag`;
5. limitar el cambio a un grant temporal;
6. ejecutar la lectura estrictamente necesaria;
7. retirar el grant incluso si la lectura falla;
8. verificar por readback que el baseline quedó restaurado.

## Diferencias que deben enseñarse por rol

### Dirección / Seguridad

Un rol predefinido puede contener más permisos de lectura que los dos detectados por `testIamPermissions`; por eso el alcance del recurso también forma parte del principio de menor privilegio. Un grant sobre una sola Log View es materialmente más acotado que el mismo rol sobre todo el proyecto.

### Operativo técnico

No hacer `setIamPolicy` con una policy desactualizada. Leer `etag`, preservar bindings y fallar ante concurrencia.

### Auditoría / Academia

Distinguir cuatro capas:

- permiso efectivo;
- alcance del recurso;
- existencia/retención del log;
- procedencia del dato investigado.

Resolver una capa no autoriza inferir las demás.

## Estado Orbit 360

V35 es únicamente preparación source-only. No se otorgó ningún permiso y no se consultaron logs.

Clasificación: `ACADEMIA_ACTUALIZAR`.
