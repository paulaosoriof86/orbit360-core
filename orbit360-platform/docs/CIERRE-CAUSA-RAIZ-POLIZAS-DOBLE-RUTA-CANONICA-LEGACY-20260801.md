# Cierre de causa raíz — Pólizas · doble ruta canónica/heredada

Fecha: 2026-08-01  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Owner: Pólizas  
Gate: `block7-policies-static-v20260730`

## Veredicto

```text
POLICIES_VISUAL_FROZEN_DUAL_PATH_DATA_CONTRACT_FAILURE
```

Clasificación principal:

```text
DATA_CONTRACT_FAILURE
```

Clasificación secundaria:

```text
PIPELINE_MECHANISM_FAILURE
```

La revisión visual de Pólizas no fue entregada para aprobación humana. El preview que alcanzó a crearse fue eliminado automáticamente y no existe un enlace activo defectuoso.

## Causa raíz

El producto visual y los diagnósticos previos no estaban leyendo el mismo universo físico de Firestore.

Ruta utilizada por el store productivo read-only:

```text
tenants/{tenantId}/data/{collection}/items
```

Ruta utilizada por los conteos operativos, diagnósticos de este bloque y writers controlados anteriores:

```text
tenantId/{tenantId}/{collection}
```

El gate visual comparó la proyección obtenida desde la ruta canónica del producto contra un baseline medido en la ruta heredada. Ese comparativo no era válido y no podía utilizarse para aprobar Pólizas.

No se declara todavía cuál ruta es autoritativa. Tampoco se corrige cambiando el frontend para apuntar silenciosamente a la ruta heredada ni reimportando Pólizas.

## Ejecuciones

### 1. Fallo pre-risk de entorno

```text
run: 30723519400
job: 91431066978
artifact: 8825594112
clasificación: ENVIRONMENT_FAILURE
causa: SECRET_NAME_BINDING_MISMATCH
preflight: 15/15
```

Se detuvo antes de secrets, Firestore, preview y navegador.

### 2. Ejecución visual read-only

```text
run: 30723733270
job: 91431611947
artifact: 8825662341
artifact digest: sha256:5146e89ec68a23ac7be5ba5e957d57e2e31de530efde0631f20c64a9ea667fbf
preflight: 19/19
resultado: VISUAL_COUNTS_MISMATCH
```

Proyección observada en el navegador:

```text
clientes: 414
aseguradoras: 26
polizas: 2
vehiculos: 1
recibosEsperados: 0
carteraPrimas: 0
cobros: 2
```

El preview fue eliminado automáticamente. No hubo escrituras ni aprobación humana.

### 3. Primer diagnóstico de país

```text
run: 30723931071
job: 91432109841
artifact: 8825711437
artifact digest: sha256:bb6b14b289df020d041c34314d126b605ca1118683a1187230c836e331e321ed
preflight: 17/17
clasificación: VALIDATOR_STALE
```

El validador confundía evidencia anidada con el campo Firestore top-level `pais`.

### 4. Diagnóstico corregido top-level v2

```text
run: 30724084271
job: 91432515980
artifact: 8825758202
artifact digest: sha256:38ef5d0f26f344d8237d6d4dbaed9443832894c810d6c14c3e8e95da6c4f3cd4
preflight: 22/22
validator: top-level-country-v2
```

La evidencia confirmó que el diagnóstico seguía midiendo la ruta heredada, no la ruta canónica utilizada por el navegador. Conforme a la regla de dos fallos en la misma etapa, se detuvieron reintentos y parches.

## Evidencia útil de la ruta heredada

Conteos:

```text
clientes: 430
aseguradoras: 30
polizas: 1373
vehiculos: 1032
recibosEsperados: 1294
carteraPrimas: 673
cobros: 5
```

Documentos sin país top-level:

```text
recibosEsperados: 1294
carteraPrimas: 673
cobros: 5
total: 1972
```

Los 1,972 documentos tienen una relación exacta para proponer país desde Póliza/Recibo, pero continúan en `REQUIERE_VALIDACION`. Esta evidencia no autoriza backfill ni escritura.

Pólizas y Vehículos de la ruta heredada sí contienen `pais` top-level. Por tanto, la proyección de 2 pólizas y 1 vehículo no se explica por ausencia de ese campo en la ruta heredada; se explica por estar consultando otra ruta física y/o otro contrato de proyección.

## Controles preservados

```text
Firestore writes: 0
operational writes: 0
network write candidates: 0
Rules deploy: 0
Functions deploy: 0
default Hosting deploy: 0
preview activo: no
producción: 0
main/merge: 0
```

## Aprobación visual

```text
Clientes: aprobado previamente
Pólizas: pendiente
Vehículos: pendiente
Recibos: pendiente
Cartera: pendiente
Resto CRM: pendiente
```

Ningún smoke o diagnóstico modificó estos estados.

## Siguiente acción exacta

Crear un gate nuevo y único de reconciliación read-only entre rutas:

```text
leer ruta canónica sin filtro de país
+ leer ruta heredada sin filtro de país
+ comparar conteos, IDs, digests y esquema por colección
+ detectar solo-canónica, solo-heredada, iguales y divergentes
+ declarar la ruta autoritativa
+ definir dry-run de migración o adaptación sin reimportar Pólizas
```

Ese gate requiere autorización nueva. No debe abrir navegador ni preview. Cualquier reparación o migración posterior requiere dry-run y autorización de escritura separados.
