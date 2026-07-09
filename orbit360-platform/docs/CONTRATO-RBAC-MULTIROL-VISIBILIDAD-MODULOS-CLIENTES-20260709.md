# Contrato RBAC multirol — visibilidad de módulos, clientes y portal

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Motivo

Paula recordó una regla ya definida en sesiones anteriores: un mismo usuario puede tener varios roles y debe poder cambiar la vista activa según lo que quiera visualizar. Además, Dirección/Admin debe poder activar o restringir módulos adicionales por usuario sin cambiar código.

Esta regla es central para A&S y reusable para futuros tenants.

## Principio

```txt
Un usuario puede tener múltiples roles.
Un usuario tiene una vista/rol activo para navegar.
La visibilidad de módulos se calcula por roles + permisos extra + restricciones explícitas.
El alcance de datos se calcula separado de la visibilidad del módulo.
```

## Modelo conceptual de usuario

```json
{
  "id": "usr...",
  "tenantId": "alianzas-soluciones",
  "nombre": "",
  "email": "",
  "rolesAsignados": ["direccion", "adminTenant", "asesor", "operativo"],
  "rolActivo": "asesor",
  "rolDefault": "direccion",
  "puedeCambiarRol": true,
  "modulosExtraPermitidos": [],
  "modulosRestringidos": [],
  "dataScopes": {
    "clientes": "todos|propios|equipo|ninguno",
    "polizas": "todos|propias|equipo|ninguno",
    "portalSolicitudes": "todos|propios|equipo|ninguno",
    "cobros": "todos|propios|equipo|ninguno"
  },
  "asesorId": "asesor...",
  "equipoId": "",
  "activo": true
}
```

## Reglas de rol activo

```txt
- El usuario puede cambiar entre roles asignados desde selector visible.
- El selector cambia navegación, KPIs, filtros y contexto de operación.
- Cambiar rol activo no cambia permisos persistentes.
- No debe permitir usar un rol no asignado.
- Debe dejar claro en la UI qué vista está activa: Dirección / Operativo / Asesor / Admin.
```

## Visibilidad de módulos

La visibilidad final se calcula así:

```txt
modulosBasePorRol
+ modulosExtraPermitidos por usuario
- modulosRestringidos por usuario
= modulosVisiblesFinales
```

Regla de seguridad:

```txt
Una restricción explícita gana sobre un permiso extra, salvo SuperAdmin/Dirección con confirmación.
```

## Alcance de datos separado

Ver un módulo no significa ver todos los datos.

Ejemplos:

```txt
Asesor puede ver Clientes, Pólizas, Portal y Cobros, pero solo de sus clientes.
Operativo puede ver Clientes/Pólizas/Portal/Cobros de todos, si se le asigna scope todos.
Dirección/AdminTenant puede ver todos.
AuditorSoloLectura puede ver todo lo permitido sin editar.
```

## Roles A&S iniciales indicados por Paula

### Paula Osorio

```txt
Roles: Dirección / SuperAdmin / AdminTenant / Asesor / Operativo.
RolDefault sugerido: Dirección o SuperAdmin.
Puede cambiar rol activo.
Data scope: todos.
También puede ver su cartera como asesora.
```

### Carlos Castro

```txt
Roles: Operativo / Asesor.
RolDefault sugerido: Operativo.
Data scope operativo: todos los clientes/pólizas/cobros/portal si Paula lo habilita.
Data scope asesor: propios.
Módulos adicionales configurables por Paula.
```

### Samuel Daza

```txt
Roles: Asesor / Operativo.
RolDefault configurable: Asesor u Operativo según operación real.
Data scope operativo: todos si Paula lo habilita.
Data scope asesor: propios.
```

### Fernando Arias

```txt
Roles: Asesor principalmente.
RolDefault: Asesor.
Módulos adicionales configurables por Paula.
Data scope asesor: propios.
```

### Johanna Salgado, Braulio Hernández, Nicole Castro

```txt
Roles: Asesor.
RolDefault: Asesor.
Data scope: propios.
Módulos adicionales configurables por Paula si se requiere.
```

## Acceso de asesores a clientes y portal

Los asesores deben ver todo lo relacionado con sus clientes, dentro de sus límites:

```txt
- ficha cliente propia;
- pólizas propias;
- recibos/cobros propios;
- solicitudes del portal de sus clientes;
- estado de acceso portal del cliente;
- invitación/reenvío de acceso al portal si está permitido;
- gestiones del cliente;
- documentos visibles al asesor;
- calidad de datos de sus clientes.
```

No deben ver:

```txt
- clientes de otros asesores;
- pólizas de otros asesores;
- cartera completa del tenant;
- auditoría interna completa;
- contraseñas del portal;
- tokens o secretos;
- datos sensibles restringidos por Dirección/Admin.
```

Sobre credenciales de portal:

```txt
El asesor puede ver estado de activación, correo/usuario de acceso y opción de solicitar/reenviar invitación si el tenant lo permite.
Nunca debe ver contraseña, token, secreto o enlace sensible permanente.
```

## Operativo con acceso completo

Un usuario con rol operativo y scope `todos` puede ver todos los clientes, pólizas, solicitudes de portal y gestiones necesarias para resolver operación.

Debe poder:

```txt
- revisar solicitudes de clientes;
- corregir datos autorizados;
- asignar/reasignar tareas;
- resolver gestiones;
- preparar documentación;
- validar calidad de datos;
- apoyar cobros/renovaciones según permisos.
```

Debe tener auditoría por acción.

## Metas por asesor

Metas deben calcularse por asesor y rol comercial, no por usuario genérico.

```txt
- Un usuario puede tener rol operativo y rol asesor.
- La meta comercial aplica al rol/identidad de asesor.
- Producción/metas/comisiones se calculan sobre prima neta recaudada, no sobre prima total ni facturación.
- No mezclar GTQ/COP.
- Paula/Dirección puede configurar metas por asesor, país, ramo, periodo y moneda.
```

## Configuración por usuario

Dirección/AdminTenant debe poder seleccionar usuario y configurar:

```txt
rolesAsignados
rolDefault
puedeCambiarRol
modulosExtraPermitidos
modulosRestringidos
dataScopes por módulo/colección
metas comerciales si es asesor
países habilitados
estado activo/inactivo
```

## Auditoría

Cambios de roles/visibilidad/scope requieren:

```txt
motivo obligatorio
usuario que cambia
usuario afectado
antes/después
fecha
confirmación reforzada si da acceso a todos los clientes
```

## ¿Aplica a Claude/prototipo?

Sí.

Claude/prototipo debe conservar o implementar:

```txt
- selector de rol/vista activa para usuarios multirol;
- Configuración/Equipo con roles múltiples por usuario;
- módulos extra y restricciones por usuario;
- alcance de datos propios/todos/equipo separado de módulos visibles;
- listado de clientes filtrado por scope;
- asesor ve portal/solicitudes de sus clientes;
- operativo autorizado ve todos;
- metas por asesor;
- auditoría y motivo en cambios de permisos;
- Academia por rol y por vista activa.
```

## Estado

Contrato creado. Pendiente aplicar en Configuración/Equipo, Clientes, Portal, Academia y validadores backend.