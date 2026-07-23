# M2 — Preparación de autorización runtime productiva read-only

Fecha: 2026-07-23  
Estado: `PREPARED_NOT_AUTHORIZED`  
Gate propuesto: `block2-product-readonly-runtime-v20260723`

## Base cerrada

La implementación estática M2 ya fue validada:

```text
Run: 30033331350
Preflight: GO_GATE_CONTRACT 180/180
Contrato raíz: PASS 64/64
Estado: M2_PRODUCT_READONLY_STATIC_VALIDATED
```

No se utilizaron secretos, Firebase productivo, Firestore, Rules, navegador, runtime o deploy.

## Objetivo del siguiente corte

Conectar el proyecto productivo en modo exclusivamente read-only y demostrar:

```text
AUTH PRODUCTIVO: PASS
MEMBERSHIP: PASS
TENANT ISOLATION: PASS
ROL ACTIVO/SCOPES: PASS
STORE PRODUCTIVO READ-ONLY: PASS
CROSS-TENANT: DENEGADO
FALLBACK: IMPOSIBLE
ESCRITURAS: BLOQUEADAS
```

Este documento no autoriza ni ejecuta la conexión.

## Autorizaciones explícitas necesarias

La siguiente ejecución deberá autorizar de forma específica:

1. Identificar el proyecto productivo correcto.
2. Usar referencias de entorno sin mostrar valores.
3. Configurar Auth productivo.
4. Crear la membership inicial autorizada.
5. Aplicar Rules productivas read-only.
6. Aplicar reglas mínimas de Storage read-only.
7. Ejecutar el bootstrap y smoke read-only.

No se autoriza:

- Hosting productivo;
- Functions;
- escrituras operativas;
- importaciones;
- migración de clientes o aseguradoras;
- Pólizas;
- M3;
- merge o `main`.

## Frontera de proveedores

El runtime deberá recibir implementaciones explícitas de:

- `environmentProvider.describePublicConfig()`;
- `firebaseAdapter.initializeFromEnvironment()`;
- `firebaseAdapter.storeDependencies()`;
- `authProvider.waitForAuthenticatedUser()`;
- `membershipProvider.getByUid()`.

Ningún owner contiene configuración, proyecto, correo, UID, credencial o secreto hardcodeado.

## Identidad, tenant y roles

- El tenant se obtiene únicamente desde la membership autenticada.
- La URL no puede definir tenant.
- La membership debe estar activa y corresponder al mismo UID.
- El rol activo debe estar incluido en los roles asignados.
- Los roles deben normalizarse a la taxonomía canónica.
- Países y scopes son obligatorios.
- Cualquier apertura a scope `all` requiere motivo y confirmación reforzada.

## Membership inicial

Crear la membership inicial es una escritura controlada de configuración, no una escritura operativa. Debe ejecutarse como una operación única, auditada e idempotente, con:

- actor;
- motivo;
- antes/después;
- tenant;
- roles/defaultRole/activeRole;
- países;
- scopes;
- rollback exacto.

La membership no puede contener contraseñas, tokens ni secretos.

## Rules read-only

### Firestore

Permitir únicamente:

- lectura sanitizada de `system/config`;
- lectura de la membership propia;
- lectura de datos del mismo tenant bajo rol, país y scope;
- lectura privilegiada de memberships solo si se autoriza explícitamente.

Bloquear:

- cross-tenant;
- lectura frontend de `credentialRefs`;
- create/update/delete en todas las rutas durante M2.

### Storage

Permitir únicamente lectura autorizada del mismo tenant. Cero upload, update o delete. Que Storage esté vacío es un resultado válido.

## Alcance del smoke

El smoke debe validar:

- Auth y correo verificado;
- membership activa;
- tenant derivado de membership;
- taxonomía de roles;
- scope y países;
- store instalado solo después de `ready-read-only`;
- cero fallback;
- consultas con exactamente un tenant constraint;
- denegación cross-tenant;
- bloqueo de `credentialRefs` en frontend;
- bloqueo de todos los métodos de escritura.

Colecciones iniciales:

```text
system/config
members/self
clientes
aseguradoras
gestiones
notificaciones
```

Antes del Bloque 4, que las colecciones operativas estén vacías o aún no migradas es válido. M2 verifica seguridad y conexión, no volumen de datos.

## Condiciones de parada

Detener inmediatamente si ocurre cualquiera de estas situaciones:

- proyecto productivo incorrecto;
- falta referencia de entorno;
- aparece un valor secreto en evidencia;
- Auth o membership no coinciden;
- tenant proviene de URL;
- rol activo no está asignado;
- falta país o scope;
- consulta sin tenant único;
- lectura cross-tenant permitida;
- lectura frontend de credential refs;
- cualquier escritura habilitada;
- Rules permiten create/update/delete;
- fallback a LAB/demo/seed/localStorage;
- store instalado antes de `ready-read-only`.

## Rollback

Ante fallo:

1. Deshabilitar el entrypoint productivo.
2. Desadjuntar snapshots.
3. Restaurar la versión read-only anterior de Rules.
4. Suspender o revertir la membership creada en la misma operación.
5. Retirar el binding temporal de entorno sin borrar secretos.
6. Conservar evidencia sanitizada.

Antes del Bloque 4 no existe dato operativo productivo que deba revertirse.

## Evidencia aceptable

Solo se acepta un resultado sanitizado `ok:true` que confirme:

- identidad del proyecto sin revelar valores;
- Auth y membership;
- tenant, rol, país y scopes;
- consultas permitidas y denegadas;
- store read-only listo;
- cross-tenant denegado;
- cero escrituras;
- cero fallback;
- cero secretos en reportes.

## Claude y Academia

Para Claude se acumulan únicamente:

- UX fail-closed;
- estados honestos de conexión;
- patrón membership-first;
- roles/scopes visibles según permisos.

No se envían proyecto, Firebase, Rules, referencias de entorno, UID, membresías reales ni secretos.

La Academia debe explicar la diferencia entre preparar una autorización y ejecutar una conexión productiva.
