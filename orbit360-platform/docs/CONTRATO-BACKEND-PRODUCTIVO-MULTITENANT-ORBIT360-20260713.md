# Contrato backend productivo Orbit 360 — multi-tenant y migración controlada

Fecha: 2026-07-13  
Rama verificada: `ays/backend-tenant-lab-v99-20260703`  
Carriles: B (backend/seguridad) y C (datos reales)  
Estado: diseño de implementación cerrado; sin deploy, sin producción y sin escrituras reales.

## 1. Hallazgo verificado

El frontend conserva `data/store.js` con `localStorage` y seed ficticio como modo predeterminado. El adapter Firestore existente es exclusivamente LAB: solo entra con `?orbitBackend=firestore-lab`, fija el tenant `alianzas-soluciones` y valida un UID/correo LAB. `core/auth.js` mapea cualquier usuario Firebase LAB a rol `Dirección`. Las reglas actuales también contienen tenant y usuario LAB fijos.

Por tanto, no debe renombrarse el adapter LAB ni convertirlo en productivo. Debe mantenerse intacto y añadirse un carril productivo separado.

## 2. Invariantes obligatorios

1. Los módulos continúan usando exclusivamente `Orbit.store`.
2. La API debe conservar:
   `all/get/where/find/insert/update/remove/on/_emit/pref/setPref/init/reseed/raw`.
3. Producción falla cerrada: si Auth, membership, tenant o Firestore no están disponibles, no usa seed ni `localStorage`.
4. El tenant nunca se acepta únicamente desde query string. Se resuelve desde una membership activa del usuario autenticado.
5. Ningún documento operativo puede escribirse sin `tenantId`.
6. Los secretos nunca se almacenan en colecciones operativas, seed, logs, auditoría o manifiestos de importación.
7. El adapter LAB y sus reglas de prueba no se reutilizan como seguridad productiva.

## 3. Modelo canónico de rutas

```text
tenants/{tenantId}
tenants/{tenantId}/members/{uid}
tenants/{tenantId}/data/{collection}/{docId}
tenants/{tenantId}/prefs/orbit360
tenants/{tenantId}/audit/{auditId}
```

Se elimina en producción la ruta temporal:

```text
tenantId/{tenantId}/{collection}/{docId}
```

## 4. Membership productiva

Documento mínimo:

```json
{
  "uid": "firebase-uid",
  "tenantId": "tenant-id",
  "email": "correo",
  "displayName": "Nombre",
  "status": "active",
  "roles": ["direccion", "asesor"],
  "defaultRole": "direccion",
  "activeRole": "direccion",
  "baseModulesByRole": {},
  "extraModules": [],
  "restrictedModules": [],
  "dataScope": {
    "clientes": "todos",
    "polizas": "todos",
    "cobros": "todos",
    "finanzas": "todos"
  },
  "countries": ["GT", "CO"],
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

La UI puede solicitar un cambio de rol activo, pero el backend valida que el rol solicitado exista en `roles`.

## 5. Store productivo

Archivo nuevo propuesto:

```text
data/store-firestore-product.js
```

Responsabilidades:

- instalarse solo con ambiente productivo explícito;
- esperar Firebase Auth antes de leer datos;
- resolver membership activa;
- resolver tenant desde membership;
- adjuntar snapshots únicamente a colecciones autorizadas;
- aplicar `tenantId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`;
- exponer estados `booting/auth-required/membership-required/ready/write-pending/write-failed`;
- no declarar una escritura como completada hasta recibir confirmación de Firestore;
- no hacer fallback a demo;
- limpiar metadatos transitorios antes de persistir;
- limitar `remove` según capacidades y reglas del módulo.

## 6. Auth productivo

No debe asignar `Dirección` por defecto.

Secuencia:

1. Firebase Auth identifica el UID.
2. Resolver memberships activas.
3. Si existe una sola, seleccionar tenant.
4. Si existen varias, mostrar selector de tenant autorizado.
5. Cargar `roles`, `defaultRole`, `activeRole`, módulos y scopes.
6. Construir `Orbit.auth.user()` desde membership.
7. Registrar cambios de rol activo con antes/después, motivo y fecha cuando amplíen acceso.

El modo demo puede seguir existiendo únicamente para la candidata comercial, nunca en un build productivo.

## 7. Reglas Firestore

Las reglas deben:

- exigir `request.auth`;
- comprobar membership activa;
- comprobar coincidencia `resource.data.tenantId == tenantId`;
- separar permisos de lectura y escritura;
- impedir que un usuario modifique sus propios roles/scopes;
- reservar cambios de membresías a Dirección/AdminTenant autorizados;
- restringir colecciones sensibles por rol y scope;
- denegar cualquier campo de secreto en datos operativos;
- permitir referencias `credentialRef`, nunca valores de credencial;
- mantener auditoría inmutable.

## 8. Importación de directorios de aseguradoras

Colecciones requeridas:

```text
aseguradoras
contactosAseguradora
plataformasAseguradora
cuentasBancariasAseguradora
documentosAseguradora
relacionesAseguradoraAliado
calidadDatos
auditoriaImportaciones
```

Colecciones prohibidas para valores de secretos:

```text
secrets
credenciales
passwords
tokens
apiKeys
```

Una plataforma puede contener:

```json
{
  "id": "platform-id",
  "tenantId": "tenant-id",
  "aseguradoraId": "insurer-id",
  "name": "Portal",
  "url": "https://...",
  "credentialRef": "credential-reference",
  "credentialStatus": "backend_required",
  "visibilityPolicy": ["direccion", "admin_tenant", "operativo"],
  "sourceTrace": {
    "fileHash": "sha256",
    "sheet": "hoja",
    "row": 1
  }
}
```

## 9. Escritura controlada

El coordinador de escritura debe ser asíncrono y devolver:

```json
{
  "ok": true,
  "batchId": "batch-id",
  "requested": 10,
  "synced": 10,
  "failed": 0,
  "auditIds": [],
  "rollbackPlanId": "rollback-id"
}
```

No basta con que `Orbit.store.insert()` actualice el cache. Debe esperar el resultado remoto o un evento `write-ok/write-error`.

Gates:

- dry-run aprobado;
- cero bloqueos;
- país y moneda validados;
- alias/fusiones resueltos;
- secretos excluidos;
- confirmación humana reforzada;
- backup/rollback durable;
- auditoría antes/después.

## 10. Estado del Carril C

Reconciliación cerrada:

- GT: 13 aseguradoras perfiladas y 1 fuente en cuarentena (`Óle`).
- CO: 13 aseguradoras canónicas, 1 aliado (`Synergias`) y 1 hoja contaminada en cuarentena.
- `Chub` es la fuente utilizable de Chubb.
- La hoja `Chubb` mezcla encabezado SBS con plataforma Chubb y no debe importarse automáticamente.
- `Solidaria` y `Solidaria 1.0` se fusionan selectivamente.
- Rural y Privanza comparten código fuente y requieren validación.
- Todos los valores sensibles quedan excluidos; solo se preparan `credentialRef` con estado `backend_required`.

## 11. Traducción obligatoria al prototipo/Claude

Claude debe reflejar únicamente patrones reutilizables:

- estados de conexión honestos;
- selector de tenant/rol cuando corresponda;
- permisos y scopes visibles según rol;
- `credentialRef/backend_required`;
- acceso temporal auditado;
- calidad y validación de fuentes;
- Academia sobre multirol, importación, calidad, credenciales y seguridad.

Claude no recibe:

- archivos Firebase;
- reglas;
- secretos;
- datos reales;
- nombres de usuarios reales;
- manifiestos de migración del tenant.

## 12. Criterios de aceptación

- Ningún modo productivo puede iniciar con `localStorage` o seed.
- Ningún usuario obtiene `Dirección` por defecto.
- Ningún tenant se elige por parámetro sin membership.
- Las rutas usan `tenants/{tenantId}/...`.
- Las reglas separan roles y scopes.
- El importador admite directorios de aseguradoras sin admitir secretos.
- Una escritura solo se confirma después de persistencia remota.
- Existe rollback durable.
- LAB continúa funcionando sin regresiones y permanece aislado.
