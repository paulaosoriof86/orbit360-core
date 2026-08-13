# IMPLEMENTACIÓN P0.3 — DRIVE / MATCHING DE CARPETAS DE ASEGURADORAS

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy y sin `main`.

## 0. Carril y propósito

Carril principal: B, preparando A y la futura incorporación controlada de fuentes reales en C.

P0.3 sigue el plan:

```txt
P0.1/P0.1b inventario multifuentе
→ P0.2 accesos y cuentas sensibles
→ P0.3 matching Drive
→ P0.4 adapters Excel/PDF
→ extracción/propuesta/diff
```

No se recibió ni procesó todavía la carpeta real de A&S.

## 1. Necesidad

A&S ya utiliza Google Drive como repositorio empresarial de:

- carpetas de aseguradoras;
- carpetas de clientes;
- cotizadores;
- tarifarios;
- cotizaciones;
- pólizas ejemplo;
- condiciones;
- formularios;
- documentos comerciales;
- expedientes.

La plataforma debe poder recibir acceso a una carpeta padre y proponer automáticamente cuál subcarpeta corresponde a cada aseguradora, evitando que Paula tenga que compartir o vincular cada carpeta individualmente.

El mismo patrón será reusable posteriormente para Cliente360, pero este bloque se enfoca en Aseguradoras.

## 2. Regla central

El matching no escribe directamente.

```txt
listar metadata autorizada
→ normalizar entidades y carpetas
→ calcular candidatos
→ detectar ambigüedades/conflictos
→ dry-run
→ revisión humana
→ confirmación
→ vínculo metadata-only
```

No se permite:

- mover carpetas;
- renombrarlas;
- cambiar permisos;
- descargar todos los archivos;
- duplicar archivos en Storage;
- inferir un vínculo definitivo sin revisión;
- guardar access tokens en Orbit.store;
- enlazar una carpeta con dos entidades sin validación.

## 3. Archivo implementado

```txt
orbit360-platform/core/drive-folder-matcher-p03.js
```

Es un motor puro y reusable. Recibe:

```txt
entidades[]
carpetas[]
parentFolderId
source
opciones
manual overrides
```

Devuelve:

```txt
propuestas[]
operaciones[]
resumen
writeAllowed: false
requiresConfirmation: true
```

No conoce la API de Google Drive ni realiza solicitudes externas.

## 4. Metadata mínima de entrada

### Entidad aseguradora

```txt
id
nombre
razón social
aliases/nombres alternos
país
NIT/identificación opcional
driveFolderRef existente
driveUrl existente
locked opcional
```

### Carpeta

```txt
folderId
nombre
ruta
país opcional
webViewLink
parentId
NIT/identificación opcional
mimeType
```

El conector real debe entregar únicamente la metadata necesaria para el dry-run.

## 5. Normalización

El motor:

- elimina acentos;
- normaliza signos y espacios;
- compara nombre comercial y razón social;
- admite aliases;
- elimina sufijos legales para comparación;
- normaliza GT/Guatemala/Guate;
- normaliza CO/Colombia;
- detecta país desde la ruta cuando es posible;
- mantiene el valor original para trazabilidad.

Sufijos configurables incluyen conceptos como:

```txt
S.A.
SAS
Limitada
Compañía
Seguros
Aseguradora
```

Esto no altera el nombre maestro de la aseguradora; únicamente mejora el matching.

## 6. Puntaje y señales

El score puede considerar:

- misma referencia existente;
- identificación exacta;
- nombre exacto;
- alias exacto;
- nombre legal sin sufijos;
- similitud de tokens;
- nombre presente en la ruta;
- país coincidente;
- país contradictorio;
- vínculo bloqueado.

Resultados de confianza:

```txt
muy_alta
alta
media
baja
sin_coincidencia
manual
```

Estados de propuesta:

```txt
propuesta_alta_confianza
requiere_validacion
sin_coincidencia
seleccion_manual
omitido_manual
conflicto_carpeta_compartida
```

Una propuesta de alta confianza sigue requiriendo confirmación antes de escribir.

## 7. Ambigüedades y conflictos

### Nombres cercanos

Si los dos mejores candidatos tienen puntajes cercanos, el motor marca:

```txt
requiere_validacion
```

### País contradictorio

Una carpeta de Colombia no debe asociarse automáticamente a una aseguradora configurada en Guatemala.

### Carpeta compartida

Si la misma carpeta queda seleccionada para dos aseguradoras:

```txt
conflicto_carpeta_compartida
```

Ninguna se enlaza automáticamente.

### Vínculo existente

Si la entidad ya tiene la misma carpeta:

```txt
omit_existing
```

Si tiene una carpeta diferente:

```txt
update_proposed
```

El reemplazo requiere confirmación y no borra el histórico.

## 8. Operaciones de dry-run

```txt
link_proposed
link_manual_proposed
update_proposed
omit_existing
omit
requires_validation
```

Cada operación incluye:

- entidad;
- carpeta actual;
- carpeta propuesta;
- URL propuesta;
- score;
- confianza;
- razones;
- advertencias;
- fuente;
- carpeta padre;
- país;
- fecha;
- confirmación humana requerida.

## 9. Confirmación

`buildConfirmedLinks()` solo genera vínculos para IDs expresamente confirmados.

Resultado propuesto:

```txt
driveFolder.provider = google_drive
driveFolder.folderId
driveFolder.webViewLink
driveFolder.status = confirmed
driveFolder.matchedBy
driveFolder.confidence
driveFolder.score
driveFolder.confirmedAt
```

Auditoría:

```txt
action: confirm_drive_folder_link
entityId
folderId
source
parentFolderId
containsFileBytes: false
containsAccessToken: false
```

La función sigue sin escribir. Un wire posterior aplicará únicamente vínculos confirmados mediante `Orbit.store`.

## 10. Smoke

Archivo:

```txt
tools/orbit360-test-drive-folder-matcher-p03.mjs
```

Escenarios:

1. Normalización de acentos y sufijos.
2. GT y CO.
3. Alias comercial.
4. País correcto frente a carpeta homónima de otro país.
5. Exclusión de archivos que no son carpetas.
6. Vínculo existente idéntico.
7. Reemplazo propuesto.
8. Entidad sin carpeta.
9. Candidatos ambiguos.
10. Carpeta propuesta para dos entidades.
11. Selección manual con motivo.
12. Confirmación explícita.
13. Ausencia de bytes y tokens.
14. Cero enlaces sin confirmación.

Workflow:

```txt
.github/workflows/orbit360-drive-folder-matcher-p03-smoke.yml
```

Incluye sintaxis, smoke, guard contra API directa/tokens y validador LAB.

No se considera CI aprobado hasta existir un run visible.

## 11. Integración futura con Google Drive

El adapter futuro deberá:

1. autenticar mediante integración segura;
2. recibir el ID de la carpeta padre;
3. listar únicamente carpetas autorizadas;
4. paginar resultados;
5. entregar metadata al matcher;
6. no exponer tokens al frontend;
7. no compartir carpetas automáticamente;
8. registrar errores de permisos;
9. soportar GT/CO;
10. respetar aislamiento tenant.

La plataforma deberá distinguir:

```txt
Integración configurada
Integración conectada
Carpeta padre autorizada
Carpetas listadas
Matching pendiente
Matching validado
Vínculo aplicado
```

No mostrar `Conectado` antes de confirmación real del proveedor.

## 12. Integración con Aseguradoras

La ficha deberá mostrar:

- estado de Drive;
- carpeta propuesta;
- carpeta confirmada;
- botón Abrir carpeta;
- confianza del matching;
- alias usados;
- advertencias;
- cambiar vínculo;
- desvincular con motivo;
- volver a ejecutar matching;
- historial de cambios.

La carpeta de Drive no reemplaza `aseguradora.docs[]`.

Relación esperada:

```txt
Drive = repositorio externo y fuente de archivos
aseguradora.docs[] = inventario normalizado y trazable
```

El adapter documental podrá inventariar archivos dentro de la carpeta después de que el vínculo sea confirmado.

## 13. Aplicación futura a Cliente360

El motor es genérico y puede usarse posteriormente para clientes.

En Clientes deberá considerar además:

- tipo de persona;
- identificación;
- nombre completo o razón social;
- país;
- duplicados;
- carpetas familiares/empresariales;
- asesor;
- expediente confirmado.

Ese carril no se activa en este bloque para no mezclar Aseguradoras con Clientes.

## 14. Datos reales y seguridad

Este bloque no contiene:

- IDs reales de carpetas;
- nombres reales de aseguradoras hardcodeados;
- links privados;
- tokens;
- credenciales;
- permisos de Google;
- archivos reales.

No se modificaron:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-*
core/auth.js
core/importa.js
firestore.rules
```

## 15. Pendientes

### P0.3a — Adapter Google Drive

- conexión segura;
- listado de carpeta padre;
- paginación;
- metadata;
- errores y reintentos;
- tenant isolation.

### P0.3b — Wire de confirmación

- recibir IDs confirmados;
- escribir referencia metadata-only;
- auditoría antes/después;
- motivo para reemplazo/desvinculación;
- idempotencia;
- no mover archivos.

### P0.3c — UX provisional

- tabla de dry-run;
- score y razones;
- ambiguos;
- selector manual;
- confirmar por lote;
- abrir carpeta;
- filtros por país/estado.

### P0.3d — Fuentes reales

Cuando el adapter y la UX estén listos, se solicitará acceso a la carpeta padre de aseguradoras. No hace falta compartir carpetas una por una.

## 16. Impacto Claude

Claude debe representar:

- carpeta padre;
- estado de conexión;
- dry-run;
- coincidencias altas;
- ambiguas;
- sin coincidencia;
- conflicto;
- selección manual;
- confirmación;
- Drive abierto desde la ficha;
- histórico;
- estados honestos;
- ausencia de duplicación inicial en Storage.

No debe:

- enlazar por nombre sin revisión;
- mezclar carpetas GT/CO;
- asumir una carpeta por nombre parecido;
- mostrar tokens o IDs técnicos innecesarios al usuario final;
- duplicar el expediente;
- reemplazar el inventario multifuentе;
- afirmar que Drive está conectado si no lo está.

## 17. Impacto Academia

### Dirección/Admin/Operativo

- conectar carpeta padre;
- interpretar score;
- revisar ambiguos;
- confirmar por lote;
- cambiar vínculo con motivo;
- abrir carpeta;
- comprender Drive frente a inventario Orbit.

### Seguridad/IT

- permisos mínimos;
- aislamiento tenant;
- tokens fuera del frontend;
- auditoría;
- revocación;
- carpetas compartidas por error.

## 18. Estado del bloque

```txt
MOTOR_MATCHING_IMPLEMENTADO
SMOKE_CREADO
WORKFLOW_CREADO
SIN_ADAPTER_GOOGLE_REAL
SIN_DATOS_REALES
SIN_WIRE_DE_ESCRITURA
SIN_UX_RUNTIME
```
