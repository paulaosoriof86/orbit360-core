# Academia — impacto Equipo/Config + M5 Conciliaciones v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Registrar impacto académico y de adopción por los cambios de Equipo/Config gates y M5 Conciliaciones gates, sin desplazar backend crítico.

## Cambio 1 — Equipo y Configuración

### Rutas impactadas

- Dirección / Superadmin / IT.
- Administrativo / Operativo.
- Asesor con acceso limitado.
- Usuario nuevo de tenant.

### Lecciones requeridas

1. Administración de usuarios y roles.
2. Permisos por módulo y alcance por rol.
3. Cambios sensibles con motivo obligatorio.
4. Reset de permisos/configuración con confirmación reforzada.
5. Integraciones configuradas vs integraciones activas.
6. Seguridad de accesos: credenciales, invitaciones y canales pendientes.

### Aprendizajes esperados

El usuario debe poder explicar:

- qué cambia cuando se modifica un rol;
- por qué cada cambio administrativo debe tener motivo;
- qué acciones requieren confirmación reforzada;
- por qué no debe quedar un tenant sin administrador activo;
- por qué no se deben mostrar términos técnicos al cliente;
- qué significa que una integración esté configurada pero no activa.

### Casos prácticos sugeridos

- Cambiar permisos a un asesor sin otorgar acceso financiero indebido.
- Inactivar usuario verificando que quede al menos un administrador activo.
- Cambiar módulos activos del tenant dejando motivo y bitácora.
- Configurar referencia de conexión sin prometer que el proveedor ya está activo.

### Quiz útil

Preguntas por decisión, no memoria:

- Si se cambia un rol, ¿qué debe pedirse antes de guardar?
- Si un usuario intenta resetear permisos, ¿qué confirmación debe existir?
- Si una integración no tiene proveedor conectado, ¿qué estado debe mostrar la UI?
- Si solo queda un administrador activo, ¿qué acción debe bloquearse?

## Cambio 2 — M5 Conciliaciones

### Rutas impactadas

- Cobros / Finanzas.
- Dirección / Superadmin / IT.
- Administrativo / Operativo.
- Portal Cliente, por la relación con pago reportado.

### Lecciones requeridas

1. Diferencia entre pago reportado, depósito bancario y pago aplicado.
2. Conciliación bancaria como propuesta validable.
3. Estados honestos de conciliación.
4. País/moneda como requisito bloqueante.
5. Validar no equivale a aplicar pago.
6. Motivo y bitácora para validar, rechazar, bloquear o anular.

### Aprendizajes esperados

El usuario debe poder explicar:

- por qué un estado de cuenta no crea cobros automáticamente;
- por qué una conciliación validada no se considera pago aplicado;
- qué pasa si falta país o moneda;
- qué acciones requieren motivo;
- qué diferencia hay entre rechazado, bloqueado y anulado;
- cómo se evita mezclar GTQ y COP.

### Casos prácticos sugeridos

- Depósito con país GT y moneda COP: debe bloquearse.
- Depósito sin moneda: requiere validación, no aplicación.
- Pago reportado por cliente con soporte: queda en revisión, no pagado.
- Conciliación validada: queda lista para aplicación posterior autorizada.

### Quiz útil

- ¿Puede una conciliación validada marcar una póliza como pagada automáticamente?
- ¿Qué dato falta si el sistema muestra país S/D o moneda S/D?
- ¿Qué debe hacer el usuario si un depósito no corresponde a ningún cobro?
- ¿Qué estado corresponde cuando hay sospecha o conflicto?

## Manuales a actualizar por Claude

- Manual maestro.
- Manual Equipo y Configuración.
- Manual Finanzas / Conciliaciones.
- Manual Cobros.
- Manual Portal Cliente.
- Manual Dirección / Superadmin.
- Manual Administrativo / Operativo.

## Notificaciones sugeridas

- Cambio de rol/permisos registrado.
- Reset de permisos/configuración solicitado.
- Conciliación validada pendiente de aplicación.
- Conciliación rechazada/bloqueada/anulada.
- Pago reportado por cliente pendiente de validación.

## Certificados sugeridos

- Certificado de Administración Orbit 360 por tenant.
- Certificado de Cobros y Conciliación A&S.
- Certificado de Operación Financiera básica.

## Riesgo si Claude lo ignora

- UI que simule pagos aplicados sin conciliación real.
- Usuarios administrativos cambiando permisos sin trazabilidad.
- Integraciones presentadas como activas sin conexión real.
- Academia incompleta que no enseña decisiones críticas.
- Mezcla conceptual entre cartera, cobros, finmovs y conciliación.

## Estado

Impacto académico documentado. Pendiente trasladar al próximo paquete Claude/candidata cuando Paula lo autorice o cuando se cierre el bloque Documentos + Storage futuro + adjuntos.