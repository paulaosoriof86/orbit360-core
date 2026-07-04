# Matriz roles, permisos y módulos — Orbit 360 A&S

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: matriz funcional/backend. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Propósito

Definir una matriz inicial de roles, módulos y permisos para evitar accesos ambiguos.

La matriz debe ser configurable por tenant; A&S es primer tenant, no debe hardcodearse como lógica única.

## 2. Regla general

Todo acceso debe validarse por:

```txt
tenantId + rol + permiso + relación con entidad + visibilidad del módulo
```

## 3. Módulos principales

- Inicio
- Cliente360
- Leads
- Ops
- Pólizas
- Cobros
- Conciliación
- Documentos
- Siniestros/Reclamos
- Renovaciones
- Cancelaciones
- Aseguradoras
- Cotizador/Comparativo
- Finanzas
- Marketing
- Portal Cliente
- Calidad de Datos
- Notificaciones/Topbar
- Academia
- Configuración
- Equipo/Usuarios
- Integraciones
- Auditoría

## 4. Roles iniciales

| Rol | Descripción |
|---|---|
| superadmin_tenant | Administra tenant completo, usuarios, configuración y seguridad. |
| direccion | Visión ejecutiva, reportes, configuración comercial y seguimiento global. |
| admin_operativo | Administra operación diaria, gestiones, usuarios operativos y seguimiento. |
| operativo | Gestiona solicitudes, pólizas, documentos, renovaciones y servicio. |
| cobros | Gestiona cartera, pagos reportados, conciliación y soportes. |
| asesor | Gestiona clientes asignados, leads, seguimiento comercial y solicitudes. |
| marketing | Gestiona contenidos, campañas, leads y comunicaciones permitidas. |
| finanzas | Gestiona finanzas, reportes, comisiones y financiero histórico según permiso. |
| reclamos_siniestros | Gestiona siniestros/reclamos y documentos relacionados. |
| renovaciones | Gestiona renovaciones, retención y seguimientos. |
| soporte_portal | Atiende acceso, dudas y soporte del portal. |
| cliente_portal | Accede únicamente a su portal y datos propios. |
| solo_lectura | Consulta limitada según módulos asignados. |
| auditor | Revisa trazabilidad, cambios y auditoría. |

## 5. Matriz resumida de permisos

| Módulo | Cliente portal | Asesor | Operativo | Cobros | Dirección/Admin |
|---|---|---|---|---|---|
| Cliente360 | Solo propio limitado | Clientes asignados | Ver/editar según permiso | Ver cobros relacionados | Global según permiso |
| Portal Cliente | Propio | Ver actividad de clientes asignados | Soporte/gestiones | Pagos reportados | Configurar/supervisar |
| Pólizas | Propias visibles | Asignadas | Crear/editar | Ver asociadas a cobro | Global |
| Cobros | Propios visibles | Clientes asignados | Ver/gestionar según permiso | Aprobar/conciliar | Global/reportes |
| Conciliación | No | Ver estado asignados | Ver/gestionar | Gestionar/aprobar | Supervisar |
| Documentos | Propios visibles | Clientes asignados | Cargar/validar | Ver soportes pago | Global según permiso |
| Gestiones/Ops | Propias visibles | Crear/seguir asignadas | Gestionar/asignar | Ver pagos/cobros | Supervisar |
| Leads | No | Crear/gestionar propios | Ver según flujo | No | Global |
| Siniestros | Propios visibles | Clientes asignados | Gestionar | No | Supervisar |
| Renovaciones | Propias visibles | Clientes asignados | Gestionar | No | Supervisar |
| Cancelaciones | Solicitar/estado | Clientes asignados | Gestionar/retención | No | Supervisar |
| Finanzas | No | Comisiones propias si autorizado | No | CxC/cobros | Global según permiso |
| Marketing | No | Ver leads/campañas asignadas | No | No | Gestionar según rol |
| Academia | Ruta propia | Ruta asesor | Ruta operativa | Ruta cobros | Asignar/supervisar |
| Configuración | No | No | Parcial | No | Editar según rol |
| Equipo/Usuarios | No | No | No | No | Administrar |
| Integraciones | No | No | No | No | Configurar/supervisar |
| Auditoría | No | Propia limitada | Propia/gestiones | Propia/cobros | Global |

## 6. Permisos críticos por acción

### Cliente portal

- `portal.ver_propio`
- `portal.reportar_pago`
- `portal.solicitar_gestion`
- `portal.cargar_documento`
- `portal.actualizar_datos_propios`
- `portal.ver_estado_solicitudes`
- `academia.ver_ruta_cliente`

### Asesor

- `cliente360.ver_asignados`
- `leads.gestionar_propios`
- `ops.crear_solicitud`
- `ops.ver_gestiones_clientes_asignados`
- `cobros.ver_clientes_asignados`
- `notificaciones.ver_propias`
- `academia.ver_ruta_asesor`

### Operativo

- `ops.ver`
- `ops.asignar`
- `ops.resolver`
- `cliente360.editar_operativo`
- `polizas.crear_editar`
- `documentos.validar`
- `calidad_datos.gestionar`

### Cobros

- `cobros.ver`
- `cobros.gestionar`
- `cobros.aprobar_pago`
- `conciliacion.ver`
- `conciliacion.validar`
- `documentos.ver_soportes_pago`

### Admin/Dirección

- `usuarios.gestionar`
- `roles.gestionar`
- `configuracion.editar`
- `reportes.ver_global`
- `auditoria.ver`
- `academia.asignar`
- `integraciones.configurar`

## 7. Reglas por relación

### Cliente portal

Solo entidades donde `clienteId` coincide con su perfil.

### Asesor

Solo entidades donde:

- `asesorId` coincide;
- cliente está asignado;
- lead/negocio está asignado;
- gestión afecta cliente asignado.

### Operativo/Cobros

Según rol, país, módulo, tenant y asignación.

### Dirección/Admin

Según tenant y permisos globales.

## 8. Módulos visibles por rol

Los módulos visibles deben ser configurables.

Cliente portal no debe ver menú interno. Debe ver interfaz portal simplificada.

Asesor debe ver módulos comerciales y seguimiento, no configuración técnica ni datos de otros asesores.

Operativo debe ver Ops, Cliente360, Pólizas, Documentos, Renovaciones, Cancelaciones, Siniestros y Calidad de Datos según permisos.

Cobros debe ver Cobros, Conciliación, soportes de pago, Cliente360 limitado y notificaciones.

Admin debe ver Equipo, Configuración, Integraciones, Auditoría y reportes.

## 9. Anti-regresiones

No permitir:

- cliente portal con acceso a datos globales;
- asesor viendo cartera de otro asesor sin permiso;
- usuario sin tenant;
- notificación sin destinatario/rol;
- documento visible sin permisos;
- módulo visible sin permiso;
- cambio de rol sin auditoría;
- permisos hardcodeados por A&S;
- datos reales en seed.

## 10. Impacto en Academia y manuales

Cada rol debe tener ruta de aprendizaje coherente con sus permisos.

Actualizar:

- manual Equipo/Usuarios;
- manual Configuración;
- manual Portal Cliente;
- manual Asesor;
- manual Administrativo/Operativo;
- manual Cobros;
- manual Seguridad;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- ruta Superadmin/IT.

## 11. Estado

Matriz creada para guiar backend, frontend, validadores y documentación viva.
