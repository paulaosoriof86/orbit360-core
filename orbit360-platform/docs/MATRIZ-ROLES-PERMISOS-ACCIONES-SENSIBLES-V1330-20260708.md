# Matriz roles/permisos/acciones sensibles v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S / base comercializable  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Definir una matriz reusable de roles, permisos, módulos y acciones sensibles para A&S y futuros tenants Orbit 360.

Este documento no contiene datos reales. Es contrato de producto/backend/prototipo para que los módulos sean administrables, auditables y seguros.

## Principios

1. Todo permiso se evalúa por tenant.
2. Ningún módulo debe asumir permisos por hardcode A&S.
3. Las acciones sensibles exigen motivo.
4. Las acciones destructivas exigen confirmación reforzada.
5. Ningún tenant puede quedar sin administrador activo.
6. Los clientes solo ven su portal y documentos permitidos.
7. Integración configurada no significa integración activa.
8. Documento recibido no aplica cambios ni pagos automáticamente.

## Roles base reutilizables

```txt
Direccion
AdminTenant
ITSeguridad
Finanzas
Cobros
Operativo
Asesor
Marketing
AcademiaAdmin
ClientePortal
AuditorSoloLectura
```

## Niveles de permiso

```txt
none = sin acceso
read = lectura
create = crear
update = editar
approve = aprobar/validar
execute = ejecutar acción operativa
admin = administrar configuración
export = exportar
audit = ver bitácora/auditoría
```

## Módulos base

```txt
dashboard
cliente360
leads
polizas
cobros
finanzas
m5_conciliaciones
documentos
portal_cliente
siniestros
renovaciones
comisiones
marketing
automatizaciones
correo_notificaciones
equipo
configuracion
academia
integraciones
auditoria
importadores
```

## Matriz de permisos por rol

| Rol | Permisos principales | Restricciones |
|---|---|---|
| Direccion | read/update/approve/audit en módulos críticos; admin limitado en configuración estratégica | No gestiona secretos directos; no salta gates |
| AdminTenant | admin en equipo/configuración/módulos/usuarios; audit | No puede dejar tenant sin admin activo; no puede activar integración real sin credencial segura |
| ITSeguridad | admin en integraciones, seguridad, Storage futuro, auditoría técnica | No opera cobros ni aplica pagos salvo permiso explícito |
| Finanzas | read/update/approve/execute en finanzas, M5, comisiones, reportes | No modifica cliente/póliza sin diff autorizado |
| Cobros | read/update/approve/execute en cobros, pagos reportados, soportes | No aplica pago sin país/moneda/motivo; no borra trazabilidad |
| Operativo | read/create/update en gestiones, documentos, siniestros, expediente | No aplica pagos ni aprueba diffs sensibles |
| Asesor | read/create/update limitado en cartera asignada, gestiones y seguimiento | No ve comisiones empresa si no está autorizado; no administra roles |
| Marketing | read/create/update en marketing, campañas y contenidos | No accede a documentos sensibles ni finanzas salvo permiso explícito |
| AcademiaAdmin | admin en rutas, lecciones, quizzes y certificados | No modifica backend, permisos ni datos operativos |
| ClientePortal | read/create limitado en su portal: pagos reportados, documentos, solicitudes | No ve otros clientes; no cambia datos maestros directamente |
| AuditorSoloLectura | read/audit transversal según alcance | No crea/edita/aprueba/ejecuta |

## Acciones sensibles por módulo

### Equipo

```txt
crear_usuario -> motivo obligatorio
editar_usuario -> motivo obligatorio
inactivar_usuario -> motivo + bloqueo si deja tenant sin admin
cambiar_rol -> motivo obligatorio
cambiar_permisos -> motivo obligatorio
reset_permisos -> confirmación reforzada
invitar_usuario -> estado honesto: invitación/canal pendiente si no hay Auth real
```

### Configuración

```txt
cambiar_plan -> motivo obligatorio
guardar_modulos_activos -> motivo obligatorio
reset_configuracion -> confirmación reforzada
configurar_integracion -> motivo obligatorio
marcar_integracion_activa -> bloqueado sin proveedor/credencial segura
cambiar_pais_moneda -> motivo + validación cartera/pólizas/cobros
```

### Cobros

```txt
marcar_en_revision -> trazabilidad
rechazar_reporte -> motivo obligatorio, conserva trazabilidad
validar_reporte_no_aplicado -> motivo obligatorio
aplicar_pago_autorizado -> motivo + país/moneda + estado válido
bloquear_reporte -> motivo obligatorio
anular_cobro -> confirmación reforzada
exportar_cartera -> permiso export + auditoría
```

### M5 Conciliaciones

```txt
validar_conciliacion -> motivo + país/moneda
rechazar_conciliacion -> motivo
bloquear_conciliacion -> motivo
anular_conciliacion -> confirmación reforzada
aplicar_conciliacion -> flujo futuro autorizado; no automático
```

### Documentos

```txt
aprobar_documento_expediente -> motivo
rechazar_documento -> motivo
bloquear_documento -> motivo
archivar_documento -> motivo
hacer_visible_cliente -> confirmación reforzada
aprobar_diff -> motivo
aplicar_diff -> confirmación reforzada + auditoría
```

### Cliente360

```txt
editar_cliente -> motivo si dato sensible
cambiar_asesor -> motivo
aplicar_diff_documento -> confirmación reforzada
ver_documento_sensible -> según rol/relación
exportar_ficha -> permiso export + auditoría
```

### Finanzas

```txt
crear_finmov -> motivo si manual
editar_finmov -> motivo
anular_finmov -> confirmación reforzada
cerrar_periodo -> confirmación reforzada
exportar_finanzas -> permiso export + auditoría
```

### Academia

```txt
crear_ruta -> motivo o changelog
editar_ruta -> changelog
archivar_ruta -> motivo
eliminar_leccion -> bloqueo si tiene progreso; archivar preferido
emitir_certificado_manual -> motivo
afectar_progreso -> motivo + auditoría
```

### Integraciones / Automatizaciones

```txt
preparar_canal -> permitido con estado pendiente
activar_canal -> solo con credencial segura/backend/proveedor
probar_canal -> estado honesto: preparado/pending
enviar_masivo -> confirmación reforzada + permiso + proveedor conectado
crear_automatizacion -> motivo si afecta clientes/cobros/documentos
pausar_automatizacion -> motivo
```

## Regla de datos sensibles

Datos sensibles incluyen:

```txt
identificación/NIT/DPI
correo/teléfono
documentos de identidad
pólizas
soportes de pago
estados bancarios
facturas
cuentas bancarias
comisiones
credenciales/integraciones
permisos/roles
```

Toda acción sensible debe registrar:

```txt
tenantId
usuario
rol
modulo
accion
motivo
before
after
fecha
resultado
```

## Reglas para futuros tenants

Para cada nuevo cliente:

1. Definir roles activos.
2. Definir módulos contratados.
3. Crear matriz de permisos desde esta base.
4. Ajustar glosario/moneda/país sin hardcode.
5. Activar Academia por rol según módulos contratados.
6. No activar integraciones sin proveedor real.
7. Auditar cambios antes de producción.

## Instrucción para Claude/prototipo

Claude debe reflejar esta matriz en UX:

- botones deshabilitados con explicación cuando el rol no tiene permiso;
- modales de motivo para acciones sensibles;
- confirmación reforzada en destructivas;
- bitácora visible para roles autorizados;
- copy honesto para integraciones pendientes;
- rutas Academia por rol.

## Estado

Contrato/matriz creado. Pendiente validadores y consumo por módulos reales cuando Auth/roles backend real esté activo.