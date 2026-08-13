# Cierre read-only — reconciliación dual-path y candidata acumulativa

Fecha: 2026-08-01  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 `draft/open`  
Owner: Pólizas  
Gate: `block7-policies-dual-path-reconciliation-readonly-v20260801`  
Contrato: `7.2.0`

## Veredicto

```text
POLICIES_DUAL_PATH_RECONCILIATION_READONLY_PASS
```

La reconciliación comparó sin filtro de país las rutas:

```text
canónica: tenants/{tenantId}/data/{collection}/items
heredada: tenantId/{tenantId}/{collection}
```

No declaró una ruta autoritativa y no habilitó visualización, migración ni adaptación del frontend.

## Ejecución

```text
run: 30724917136
job: 91434669696
artifact: 8825989653
artifact digest: sha256:19b9cddbd5a08af61655f0d59423608329fd3fda39da8786ab5c31940fb28885
HEAD auditado: c1bbe8e8f446747c51eaa3672e0b59fb2823d08c
```

Todos los pasos terminaron en `success`, incluido el entrypoint canónico previo a secrets y Firestore.

## Resultado global

```text
ruta canónica: 445 documentos
ruta heredada: 4,837 documentos
IDs compartidos: 440
contenido exactamente igual: 0
contenido divergente en IDs compartidos: 440
solo canónica: 5
solo heredada: 4,397
```

Las rutas no son copias ni proyecciones equivalentes. Contienen universos y esquemas diferentes.

## Resultado por colección

| Colección | Canónica | Heredada | Compartidos | Divergentes | Solo canónica | Solo heredada |
|---|---:|---:|---:|---:|---:|---:|
| Clientes | 414 | 430 | 414 | 414 | 0 | 16 |
| Aseguradoras | 26 | 30 | 26 | 26 | 0 | 4 |
| Pólizas | 2 | 1,373 | 0 | 0 | 2 | 1,373 |
| Vehículos | 1 | 1,032 | 0 | 0 | 1 | 1,032 |
| Recibos esperados | 0 | 1,294 | 0 | 0 | 0 | 1,294 |
| Cartera | 0 | 673 | 0 | 0 | 0 | 673 |
| Cobros | 2 | 5 | 0 | 0 | 2 | 5 |

El baseline heredado esperado se confirmó completo.

## Lectura técnica sin declarar autoridad

La ruta canónica contiene una proyección de Clientes y Aseguradoras, pero los documentos compartidos no son idénticos a los heredados: presentan diferencias de esquema, presencia y tipos de campos.

En Pólizas, Vehículos y Cobros, los pocos documentos canónicos no comparten IDs con los registros heredados. Recibos y Cartera están vacíos en la ruta canónica.

Esto descarta tres soluciones incorrectas:

1. asumir que ambas rutas contienen lo mismo;
2. cambiar silenciosamente el frontend a la ruta heredada;
3. reimportar Pólizas para intentar corregir una diferencia de arquitectura.

Antes de decidir autoridad se debe clasificar la procedencia de los cinco registros solo-canónicos, los veinte registros solo-heredados de Clientes/Aseguradoras y la naturaleza de las divergencias en los 440 IDs compartidos.

## Candidata visual acumulativa

La observación de Paula quedó convertida en barrera contractual y evidencia verificable.

El gate generó un manifiesto del HEAD auditado:

```text
archivos visuales y de aplicación rastreados: 308
index.html: 1
modules/: 62
core/: 182
styles/: 10
data/: 53
```

Sellos:

```text
pathDigest: 0c3dbf222646ea46b57e838359ac56fff3994268a97e0d682508bd747a29f3c4
contentDigest: 5b32b90815929acc341cfd4ae7c1e5f76d819e1a6a1b4091d13800508ab9b647
indexDigest: 54df4a1977573ccc6a0702bd0012f2835fcef4cb529e327d16918c4b420382a4
```

La próxima visualización deberá utilizar:

```text
última baseline auditada/aceptada
+ HEAD incremental vigente
+ todos los módulos rastreados
+ la mejor versión acreditada por módulo
```

Quedan prohibidos:

- shells reducidos;
- páginas paralelas de revisión que omitan módulos;
- reemplazos totales por una candidata externa;
- selección parcial de mejoras;
- retroceso a una versión anterior de un módulo sin evidencia y decisión expresa;
- inferir aprobación visual desde un smoke automatizado.

La candidata futura deberá usar el mismo HEAD del manifiesto o un descendiente auditado, explicando cada sustitución o retiro.

## Seguridad e integridad

```text
Firestore read: sí
Firestore writes: 0
operational writes: 0
reimportación: no
navegador: no
preview: no
deploy: no
Rules: no
Functions: no
producción: no
main/merge: no
```

## Aprobación humana

```text
Clientes: aprobado previamente
Pólizas: pendiente
Vehículos: pendiente
Recibos: pendiente
Cartera: pendiente
Resto CRM: pendiente
```

## Siguiente acción exacta

Preparar un gate nuevo read-only de procedencia y decisión arquitectónica que:

```text
clasifique los 5 registros solo-canónicos
+ clasifique los 16 Clientes y 4 Aseguradoras solo-heredados
+ agrupe las divergencias de los 440 IDs compartidos por transformación esperada o conflicto
+ contraste trazabilidad, import batch, source refs y estado de validación
+ recomiende ruta autoritativa por colección
+ no escriba
+ no migre
+ no adapte el frontend
+ no abra preview
```

Solo después de presentar esa evidencia se podrá autorizar por separado la declaración de autoridad y un dry-run de migración o adaptación.
