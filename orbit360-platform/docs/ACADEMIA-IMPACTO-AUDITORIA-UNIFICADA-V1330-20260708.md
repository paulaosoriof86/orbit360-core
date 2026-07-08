# Academia — impacto auditoría unificada v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S / base comercializable  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Convertir el contrato de auditoría unificada en aprendizaje por rol para A&S y futuros tenants.

## Rutas impactadas

### Dirección / AdminTenant

Debe aprender:

- leer bitácora por módulo;
- interpretar severidad;
- revisar motivos;
- detectar acciones bloqueadas;
- aprobar cambios sensibles;
- auditar roles/permisos y cobros.

Caso práctico: revisar por qué se bloqueó aplicar un pago por moneda incoherente.

### IT / Seguridad

Debe aprender:

- revisar auditoría técnica;
- detectar intentos de activar canales sin proveedor;
- revisar seguridad documental;
- entender campos prohibidos en bitácora;
- no registrar secretos ni payloads.

Caso práctico: bloqueo de integración por falta de credencial segura.

### Cobros / Finanzas

Debe aprender:

- registrar motivo al validar/rechazar/aplicar;
- leer bloqueos de país/moneda;
- diferenciar validado no aplicado;
- revisar historial antes de aplicar pago;
- auditar anulaciones.

Caso práctico: pago reportado validado no aplicado debe aparecer en historial con motivo.

### Operativo / Cliente360 / Asesor

Debe aprender:

- leer historial documental permitido;
- entender qué acciones requieren escalamiento;
- crear gestiones sin borrar trazabilidad;
- revisar documentos bloqueados o en revisión.

### ClientePortal

Debe aprender:

- ver historial propio con lenguaje simple;
- entender recibido/en revisión/rechazado/aplicado;
- no ver motivos internos sensibles;
- recibir solicitudes de aclaración.

### AcademiaAdmin

Debe aprender:

- documentar cambios de rutas;
- archivar lecciones con trazabilidad;
- emitir certificados manuales solo con motivo;
- usar auditoría para mantener cursos actualizados.

## Lecciones obligatorias

1. Qué es una acción sensible.
2. Qué es motivo obligatorio.
3. Qué es confirmación reforzada.
4. Qué significa severidad info/warning/critical/blocked.
5. Cómo leer bloqueos.
6. Qué datos nunca deben guardarse en bitácora.
7. Cómo auditar pago reportado, documento, M5 e integración.
8. Qué ve el cliente vs qué ve administración.

## Quizzes sugeridos

- ¿Qué debe registrar una acción de anulación?
- ¿Qué diferencia hay entre warning y critical?
- ¿Puede la bitácora guardar token o base64?
- ¿Qué significa resultado=bloqueado?
- ¿Quién puede ver auditoría completa?
- ¿Qué debe ver el cliente sobre su soporte de pago?

## Certificados sugeridos

```txt
Auditoría operativa Orbit 360
Gobierno de acciones sensibles
Seguridad documental y bitácora
Cobros auditables
Administración segura de tenant
```

## Instrucción para Claude

Claude debe incorporar en Academia:

- lecciones de bitácora;
- ejemplos por rol;
- casos de bloqueo;
- diferencias entre historial cliente e historial interno;
- relación con Portal/Cobros/M5/Documentos/Equipo/Config.

## Estado

Impacto Academia documentado. Debe anexarse al próximo paquete Claude si la candidata no lo incorpora.