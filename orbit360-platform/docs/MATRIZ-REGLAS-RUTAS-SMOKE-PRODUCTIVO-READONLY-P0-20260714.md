# Matriz ejecutable de reglas por ruta — primer smoke productivo read-only

Fecha: 2026-07-14  
Carril: B — backend protegido, seguridad y `Orbit.store`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: contrato y pruebas; no son `firestore.rules` aplicadas.

## Objetivo

Cerrar la traducción entre rutas canónicas, membresías, roles, países, scopes y operaciones antes de escribir reglas productivas o conectar un emulador.

Este bloque:

- no modifica `firestore.rules`;
- no inicializa Firebase;
- no consulta Firestore;
- no escribe datos;
- no crea índices;
- no autoriza deploy.

## Rutas cubiertas

```txt
tenants/{tenantId}/system/config
tenants/{tenantId}/members/{uid}
tenants/{tenantId}/data/{collection}/items
tenants/{tenantId}/data/{collection}/items/{documentId}
tenants/{tenantId}/auditEvents/{eventId}
tenants/{tenantId}/importBatches/{batchId}
tenants/{tenantId}/credentialRefs/{refId}
tenants/{tenantId}/academyProgress/{uid}
```

## Reglas efectivas

### Identidad

- membresía activa obligatoria;
- rol activo dentro de `roles[]`;
- tenant de membresía igual a tenant de ruta;
- ninguna excepción concede acceso.

### Configuración

- lectura `get` para membresía activa;
- documento obligatoriamente sanitizado;
- lista y escritura bloqueadas.

### Membresías

- usuario lee su membresía;
- Dirección/SuperAdmin/AdminTenant pueden leer otras;
- lista solo privilegiada;
- escritura bloqueada en esta fase.

### Datos operativos

Para listas:

```txt
own  -> tenant + país + advisorId
team -> tenant + país + teamId
all  -> tenant + país
none -> denegar
```

Para documentos:

- tenant e ID coherentes con la ruta;
- país obligatorio cuando la membresía tiene países;
- política efectiva de colección;
- mismo scope que la lista.

### Aseguradoras

- cuentas bancarias: lectura para Dirección, Operativo y Asesor;
- plataformas: Asesor bloqueado;
- referencias de credenciales: nunca lectura directa desde cliente;
- proveedor backend requerido para credenciales.

### Auditoría e importaciones

- lectura privilegiada;
- Asesor/Operativo sin permiso explícito quedan bloqueados;
- escritura bloqueada.

### Academia

- progreso propio o lectura privilegiada;
- lista solo privilegiada.

### Escrituras

`create`, `update` y `delete` se bloquean para todas las rutas en el primer smoke read-only.

## Artefactos

- `core/product-readonly-route-rule-matrix-p0.js`
- `tools/orbit360-validar-product-readonly-route-rule-matrix-p0.mjs`
- `tools/orbit360-generar-product-readonly-route-rule-matrix-p0.mjs`
- workflow específico de CI

## Próximo paso

Traducir esta matriz a una propuesta aislada de reglas y ejecutarla en emulador. Ese paso tampoco debe reemplazar `firestore.rules` hasta que todos los casos pasen y exista autorización expresa.
