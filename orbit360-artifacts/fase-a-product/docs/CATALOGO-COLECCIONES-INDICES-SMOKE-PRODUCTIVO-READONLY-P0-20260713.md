# Catálogo de colecciones e índices — primer smoke productivo read-only P0

Fecha: 2026-07-13  
Carril: B — backend, seguridad y `Orbit.store`  
Estado: contrato y manifiesto preparados; sin conexión, escritura, deploy ni cambios de reglas.

## Propósito

Definir de forma determinista qué colecciones se intentarán leer en el primer smoke productivo para los tres roles operativos iniciales de A&S: Dirección, Operativo y Asesor.

El catálogo evita cuatro errores:

1. adjuntar todas las colecciones por defecto;
2. consultar colecciones no permitidas para el rol;
3. pasar documentos de sistema por el store de datos operativos;
4. crear índices repetidos para cada colección lógica.

## Separación de rutas

La membresía y la configuración del tenant se resuelven fuera del store operativo:

```txt
tenants/{tenantId}/system/config
tenants/{tenantId}/members/{uid}
```

Los datos operativos usan:

```txt
tenants/{tenantId}/data/{coleccionLogica}/items
```

Como la subcolección física se llama siempre `items`, los índices se deduplican por firma de consulta y no por nombre lógico del módulo.

## Perfiles del primer smoke

### Dirección

Colecciones obligatorias:

```txt
clientes
polizas
gestiones
aseguradoras
contactosAseguradora
plataformasAseguradora
calidadDatos
financiero_historico
```

Scope esperado: `all`.  
Firmas: `tenantId + country`.

### Operativo

Colecciones obligatorias:

```txt
clientes
polizas
gestiones
aseguradoras
contactosAseguradora
plataformasAseguradora
calidadDatos
```

Scope esperado para colecciones operativas: `team`.  
Firmas: `tenantId + country` y `tenantId + country + teamId`.

Las cuentas bancarias de aseguradora quedan bloqueadas por defecto. Requieren concesión explícita separada; no se heredan por poder ver plataformas.

### Asesor

Colecciones obligatorias:

```txt
clientes
polizas
cobros
gestiones
solicitudesPortal
aseguradoras
contactosAseguradora
calidadDatos
```

Scope esperado para colecciones operativas: `own`.  
Firmas: `tenantId + country` y `tenantId + country + advisorId`.

Bloqueos explícitos:

```txt
plataformasAseguradora
cuentasBancariasAseguradora
credentialRefs
auditoría
finanzas
configuración del tenant
```

## Firmas de índice candidatas

El manifiesto genera únicamente tres firmas:

```txt
1. tenantId ASC + country ASC
2. tenantId ASC + country ASC + advisorId ASC
3. tenantId ASC + country ASC + teamId ASC
```

Todas se declaran como candidatas para:

```txt
collectionGroup: items
queryScope: COLLECTION
```

No se autoriza desplegarlas todavía. Deben validarse primero mediante emulador o error real de Firestore porque el catálogo no debe convertir una predicción de índice en un cambio de infraestructura automático.

## Gates

```txt
- rol activo debe estar asignado;
- membresía debe estar activa;
- cada colección debe existir en COLLECTION_POLICY;
- el módulo debe ser visible;
- scope none deniega la colección;
- toda consulta permitida debe incluir tenantId;
- país debe estar presente para GT/CO;
- Asesor no consulta plataformas ni bancos;
- Operativo no consulta bancos sin permiso separado;
- membresía y config no pasan por data/store;
- writeAuthorized=false;
- deployAuthorized=false.
```

## Academia / Claude

Sí aplica al prototipo:

- explicar que “ver Aseguradoras” no implica ver accesos o cuentas bancarias;
- enseñar la diferencia entre módulo visible y alcance de datos;
- mostrar estados honestos: acceso permitido, acceso restringido por rol, acceso restringido por alcance;
- no mostrar Firestore, índices, rutas técnicas o nombres de colecciones al usuario final.
