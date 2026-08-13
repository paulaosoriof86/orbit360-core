# Contrato guard de autorización — rutas y acciones

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato backend/documental. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Definir un guard central para controlar acceso a rutas, módulos y acciones críticas.

Ocultar un módulo en el sidebar no es suficiente. La autorización debe validar cada acceso relevante.

## 2. Principio

Toda ruta o acción debe validar:

```txt
tenantId + usuario + rol + permiso + relación + estado + módulo activo
```

## 3. Niveles de autorización

### Nivel 1 — Módulo visible

Define si el usuario ve el módulo en navegación.

### Nivel 2 — Ruta accesible

Define si puede abrir la ruta por hash/link/direct URL.

### Nivel 3 — Acción permitida

Define si puede crear, editar, aprobar, eliminar, conciliar, asignar o cerrar.

### Nivel 4 — Relación con entidad

Define si puede ver esa entidad específica.

Ejemplos:

- cliente portal solo `clienteId` propio;
- asesor solo clientes asignados;
- cobros solo cobros según rol/país/tenant;
- operativo según módulo y asignación;
- admin según tenant.

## 4. Funciones sugeridas

- `canSeeModule(route)`
- `canAccessRoute(route, params)`
- `can(action, entity)`
- `canSeeEntity(entityType, entity)`
- `filterByScope(entityType, rows)`
- `requirePerm(permission, context)`
- `auditDenied(reason, context)`

## 5. Manejo de denegación

Si no tiene permiso:

- no mostrar datos sensibles;
- mostrar pantalla amable `No tienes acceso a esta sección`;
- registrar intento en auditoría si es acción crítica;
- no revelar si existe o no una entidad sensible.

## 6. Reglas críticas

No permitir:

- ruta directa a módulo oculto;
- cliente portal con selector de cliente;
- asesor viendo otro asesor;
- acción crítica por solo visibilidad de UI;
- aprobación de pago sin permiso `cobros.aprobar_pago`;
- validación de documento sin `documentos.validar`;
- cambio de rol sin `roles.gestionar`;
- configuración sin `configuracion.editar`;
- acceso a documento privado sin relación/permiso.

## 7. Relación con router actual

El router actual oculta módulos en sidebar usando `Orbit.session.canSee(route)`. Esto debe complementarse con validación central antes de renderizar la ruta.

## 8. Relación con backend real

La UI puede mejorar UX, pero la seguridad real debe estar en backend/reglas.

Firestore rules y adapter deben validar tenant y permisos mínimos cuando se implemente Auth real.

## 9. Smoke futuro

- cliente intenta abrir `#/cliente360` de otro cliente → bloqueado;
- cliente intenta abrir `#/finanzas` → bloqueado;
- asesor intenta abrir cartera no asignada → bloqueado;
- asesor intenta `#/ops` si no tiene permiso → bloqueado;
- cobros aprueba pago con permiso → permitido;
- operativo sin permiso de documentos intenta validar → bloqueado;
- admin cambia rol → permitido y auditado.

## 10. Academia/manuales

Actualizar:

- manual Seguridad/Auth;
- manual Equipo/Usuarios;
- ruta Superadmin/IT;
- ruta Administrativo/Operativo;
- evaluación de permisos.

## 11. Estado

Contrato creado. No implementa guard real ni modifica router.
