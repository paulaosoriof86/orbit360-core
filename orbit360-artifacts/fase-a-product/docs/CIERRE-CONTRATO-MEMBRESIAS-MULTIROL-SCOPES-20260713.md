# Cierre del contrato productivo de membresías multirol y scopes

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Carril: B  
Estado: contrato y smoke implementados; Auth/rules productivos aún no conectados

## Problema confirmado

La plataforma visual ya permite seleccionar varios roles en Equipo, pero el registro existente conserva el primer rol como principal. El modo Auth LAB devuelve un rol fijo y las reglas actuales aceptan un único campo `role`.

Esto no es suficiente para producción porque un usuario necesita:

- roles asignados;
- rol predeterminado;
- rol activo;
- cambio de vista según roles asignados;
- módulos base, extras y restringidos;
- scopes de datos separados;
- países habilitados;
- estado de membresía;
- trazabilidad de cambios.

## Implementación

Contrato:

`core/membership-multirol-contract-p0.js`

Validador:

`tools/orbit360-validar-membership-multirol-p0.mjs`

CI:

`.github/workflows/orbit360-membership-multirol-p0-smoke.yml`

## Esquema normalizado

```txt
uid
email
tenantId
displayName
roles[]
defaultRole
activeRole
modulesExtra[]
modulesRestricted[]
dataScopes.default
dataScopes.modules{}
countries[]
advisorId
teamId
status
invitedAt
activatedAt
updatedAt
updatedBy
reason
```

Estados admitidos:

```txt
invited
active
suspended
inactive
```

Scopes admitidos:

```txt
own
team
all
none
```

## Visibilidad efectiva

La visibilidad final se calcula como:

```txt
módulos base del rol activo
+ módulos extra
- módulos restringidos
```

No se suman automáticamente todos los módulos de todos los roles asignados. El usuario cambia su vista activa seleccionando uno de sus roles asignados.

## Scope efectivo

El alcance de datos es independiente de la visibilidad del módulo:

1. scope específico del módulo;
2. scope predeterminado de la membresía;
3. scope predeterminado del rol activo;
4. `none` como fallback seguro.

Un módulo visible no implica acceso a todos los registros.

## Cambio de rol activo

Solo se propone cuando:

- la membresía está activa;
- el rol destino está asignado;
- la sesión productiva podrá actualizarse en backend.

El contrato devuelve propuesta, no escritura:

```txt
writeAuthorized = false
requiresBackendSessionUpdate = true
```

## Cambios administrativos

Todo cambio exige:

- actor identificado;
- rol activo del actor;
- rol activo contenido en sus roles asignados;
- permiso administrativo de membresías;
- motivo de al menos 8 caracteres;
- tenant inmutable;
- auditoría antes/después;
- rollback.

## Ampliación de acceso

Se considera ampliación cuando ocurre alguno de estos casos:

- se agrega un rol privilegiado;
- aumenta el scope predeterminado;
- aumenta el scope efectivo de un módulo;
- se agrega un módulo extra;
- se elimina una restricción;
- se activa una membresía;
- se habilita un país adicional.

La ampliación requiere:

```txt
CONFIRMO AMPLIAR ACCESO
```

y MFA cuando la política del tenant lo exija.

La comparación de scopes usa el alcance efectivo. Escribir explícitamente `own` cuando el default ya es `own` no se interpreta como ampliación.

## Seguridad

El contrato rechaza:

- contraseñas;
- claves;
- tokens;
- API keys;
- valores de credenciales;
- rol activo no asignado;
- rol default no asignado;
- scope inválido;
- membresía sin país;
- usuario Asesor sin `advisorId`;
- módulo simultáneamente extra y restringido;
- cambio de tenant;
- actor sin permiso.

## Archivos protegidos

No fueron modificados:

- `core/auth.js`;
- `firestore.rules`;
- `data/store.js`;
- `data/store-firestore-lab.local.js`;
- `core/backend-lab-*`;
- `core/importa.js`.

## Estado de integración

### Ya preparado

- esquema multirol reusable;
- rol activo y default;
- módulos efectivos;
- scopes efectivos;
- cambio de rol propuesto;
- gate de ampliación;
- auditoría y rollback planificados;
- smoke de CI.

### Pendiente productivo

1. colección canónica `tenants/{tenantId}/members/{uid}`;
2. adapter Auth productivo que lea la membresía;
3. actualización de sesión del rol activo;
4. rules por membresía, rol y scope;
5. ejecutor transaccional de cambios;
6. revocación de sesiones al suspender o reducir permisos;
7. cero fallback demo.

## Siguiente acción

Preparar el contrato de rutas canónicas y reglas productivas por tenant sin modificar todavía `firestore.rules`. Ese contrato servirá como especificación ejecutable para el futuro reemplazo seguro del modo LAB.

Acción manual requerida: ninguna.
