# Contrato Auth, usuarios, roles y tenant — LAB A&S

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato backend/documental. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Definir la base de autenticación, usuarios, roles, permisos y tenant para Orbit 360 A&S.

Este contrato es prerequisito para:

- Portal de Clientes;
- invitaciones reales;
- PWA segura;
- notificaciones por usuario;
- documentos privados;
- gestiones trazables;
- Academia por rol/usuario;
- Firestore real con tenant isolation;
- importación real y operación comercializable.

## 2. Principio obligatorio

Ningún usuario debe acceder a datos fuera de su tenant, rol, permisos o relación operativa.

La plataforma debe separar:

- autenticación: quién entra;
- autorización: qué puede ver/hacer;
- tenant: a qué organización pertenece;
- rol: qué función cumple;
- relación: qué clientes, pólizas, cobros o gestiones le corresponden;
- auditoría: qué hizo y cuándo.

## 3. Entidades sugeridas

- `usuarios`
- `roles`
- `permisos`
- `usuarioRoles`
- `portalUsuarios`
- `tenantUsuarios`
- `sesiones`
- `invitacionesUsuario`
- `auditoriaAcceso`
- `preferenciasUsuario`

## 4. Campos base de `usuarios`

- id
- tenantId
- authUid
- nombre
- email
- telefono
- pais
- estadoUsuario
- tipoUsuario
- roles[]
- permisosExtra[]
- modulosVisibles[]
- clienteId si es portal cliente
- asesorId si corresponde
- equipoId si corresponde
- ultimoAccesoAt
- invitadoAt
- activadoAt
- createdAt
- updatedAt

## 5. Tipos de usuario

- interno
- asesor
- operativo
- admin
- superadmin
- cliente_portal
- aliado
- aseguradora_futuro
- sistema

## 6. Estados de usuario

- invitado
- activo
- pendiente_activacion
- pendiente_datos
- suspendido
- bloqueado
- desactivado
- eliminado_logico

## 7. Roles iniciales sugeridos

- superadmin_tenant
- direccion
- admin_operativo
- operativo
- cobros
- asesor
- marketing
- finanzas
- reclamos_siniestros
- renovaciones
- soporte_portal
- cliente_portal
- solo_lectura
- auditor

## 8. Permisos base

Los permisos deben expresarse por acción y módulo:

```txt
modulo.accion
```

Ejemplos:

- `cliente360.ver`
- `cliente360.editar`
- `polizas.ver`
- `polizas.crear`
- `cobros.ver`
- `cobros.aprobar_pago`
- `portal.ver_propio`
- `portal.reportar_pago`
- `ops.ver`
- `ops.asignar`
- `ops.cerrar`
- `documentos.ver`
- `documentos.cargar`
- `documentos.validar`
- `academia.ver`
- `academia.asignar`
- `configuracion.editar`

## 9. Reglas por rol

### Cliente portal

Puede ver únicamente:

- sus datos;
- sus pólizas;
- sus recibos/pagos;
- sus documentos visibles;
- sus gestiones;
- sus notificaciones;
- sus cursos/rutas si aplica.

Puede hacer:

- reportar pago;
- cargar soporte;
- solicitar gestión;
- actualizar datos propios sujetos a validación;
- completar datos faltantes;
- ver estado de solicitudes.

No puede ver:

- otros clientes;
- cartera global;
- comisiones;
- finanzas;
- datos internos;
- notas técnicas;
- documentos privados de operación.

### Asesor

Puede ver clientes, pólizas, oportunidades, gestiones, pagos reportados y documentos relacionados con su cartera o asignación.

No debe ver información de otros asesores salvo permiso explícito.

### Operativo/Cobros

Puede ver gestiones, documentos, cobros, conciliación y solicitudes según país/tenant/rol.

### Dirección/Admin

Puede ver reportes, configuración, usuarios, roles, operación y auditoría según permisos.

### Superadmin/IT

Puede administrar tenant, usuarios, roles, módulos, integraciones y configuración técnica, sin exponer secretos en UI cliente.

## 10. Multi-rol

Un usuario puede tener varios roles. Ejemplo:

- asesor + cobros parcial;
- dirección + admin;
- operativo + renovaciones;
- marketing + lectura de leads.

La autorización debe resolver permisos acumulados, pero siempre respetando tenant y restricciones de relación.

## 11. Tenant isolation

Toda entidad operativa debe llevar `tenantId` y toda lectura/escritura debe validar tenant.

No se permite:

- usuario sin tenant;
- lectura cross-tenant;
- escritura sin tenant;
- notificación sin tenant;
- documento sin tenant;
- portal cliente sin tenant.

## 12. Invitaciones y activación

Usuarios internos, asesores y clientes portal deben activarse mediante invitación segura:

- link de activación;
- magic link;
- creación de contraseña;
- OTP futuro.

No enviar contraseñas planas por correo ni WhatsApp.

## 13. Auditoría de acceso

Registrar:

- login;
- logout;
- intento fallido;
- invitación enviada;
- activación;
- cambio de rol;
- cambio de permisos;
- cambio de estado;
- acceso a documento sensible;
- acción crítica.

## 14. Seguridad mínima

- no exponer secretos;
- no guardar contraseñas en seed;
- no hardcodear emails reales en código;
- no mostrar modo LAB/backend al cliente;
- no permitir usuario demo como productivo;
- no crear usuarios desde documentos sin validación;
- no activar portal sin contacto confiable.

## 15. Relación con Firestore LAB

Cuando se implemente, el adapter debe conservar API `Orbit.store` y filtrar por tenant.

El guard actual de backend LAB debe seguir protegiendo:

- tenant allowlist;
- bloqueo de writes sensibles;
- sanitización de campos sensibles;
- usuario LAB esperado.

## 16. Academia y manuales

Este contrato afecta:

- manual Equipo/Usuarios;
- manual Configuración;
- manual Portal Cliente;
- manual Seguridad;
- manual Integraciones;
- ruta Superadmin/IT;
- ruta Administrativo/Operativo;
- ruta Asesor nuevo;
- ruta Cliente nuevo.

## 17. Criterio de aceptación futuro

El bloque estará listo cuando:

- usuario siempre tenga tenant;
- roles/permisos sean explícitos;
- cliente portal vea solo lo propio;
- asesor vea solo cartera/asignación;
- admin gestione usuarios sin tocar código;
- invitación sea segura;
- todo cambio crítico quede auditado;
- no haya secretos ni credenciales en UI/seed;
- el backend real conserve `Orbit.store`.

## 18. Estado

Contrato creado. No implementa Auth real ni modifica reglas. Debe guiar backend ChatGPT/Codex, frontend Claude, manuales y validadores.
