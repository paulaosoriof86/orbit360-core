# Implementación P0.9c — runner backend documental seguro

Fecha: 2026-07-10  
Módulo: Aseguradoras / conocimiento documental  
Estado: `RUNNER_IMPLEMENTADO / BRIDGE_BACKEND_IMPLEMENTADO / STORE_OPERATIVO_SIN_CAMBIOS`

## 1. Necesidad

P0.9/P0.9b definió registry, bridge frontend-agnostic, writer metadata-only, read model e integrador seguro. Faltaba una implementación backend capaz de:

```text
resolver referencia autorizada
→ comprobar ruta y hash
→ invocar extractor Excel/PDF
→ devolver manifiesto sanitizado
→ integrarse con el registry
```

El runner debe servir a cualquier tenant y no contener rutas, aseguradoras o tarifas específicas.

## 2. Archivos implementados

```text
tools/orbit360-document-backend-runner-p09c.mjs
tools/orbit360-document-backend-bridge-p09c.mjs
tools/orbit360-test-document-backend-runner-p09c.mjs
tools/orbit360-test-document-backend-bridge-p09c.mjs
tools/orbit360-test-document-pipeline-p09c.mjs
.github/workflows/orbit360-document-backend-runner-p09c-smoke.yml
```

## 3. Tareas soportadas

```text
excel_manifest
pdf_manifest
```

### Excel

Invoca:

```text
tools/orbit360-extract-excel-rule-facts-p06b.py
```

Formatos:

```text
.xlsx
.xlsm
```

### PDF

Invoca:

```text
tools/orbit360-extract-pdf-manifest-p07b.py
```

Formato:

```text
.pdf
```

OCR, análisis semántico y matching consultivo continúan como tareas separadas del router. El runner determinístico no pretende sustituirlas.

## 4. Referencia frente a ruta local

El navegador y el registry solo conocen una referencia lógica:

```text
drive://tenant/documento
upload://tenant/documento
backend-ref://...
```

Un resolver backend autorizado transforma esa referencia en una ruta montada temporal.

La ruta local:

- nunca se recibe directamente del frontend;
- nunca se devuelve al registry;
- nunca se guarda en Orbit.store;
- debe estar dentro de una raíz permitida;
- se resuelve mediante `realpath`;
- no puede escapar por `..` o symlink;
- no acepta URL remota como ruta.

Estados de bloqueo:

```text
ALLOWED_ROOT_REQUIRED
LOCAL_PATH_REQUIRED
REMOTE_REFERENCE_REQUIRES_RESOLVER
SOURCE_OUTSIDE_ALLOWED_ROOT
SOURCE_FILE_REQUIRED
```

## 5. Integridad

Antes de ejecutar:

1. calcula SHA-256 del archivo resuelto;
2. compara con `sourceHash` si fue proporcionado;
3. verifica extensión contra tarea;
4. crea directorio temporal privado;
5. escribe hints/directorio con permisos restringidos;
6. ejecuta Python sin shell;
7. aplica timeout;
8. verifica que el extractor produzca salida;
9. valida el hash del manifiesto cuando está disponible;
10. elimina el directorio temporal.

Bloqueos:

```text
SOURCE_HASH_MISMATCH
TASK_FILE_TYPE_MISMATCH
EXTRACTOR_TOOL_NOT_FOUND
EXTRACTOR_TIMEOUT
EXTRACTOR_OUTPUT_MISSING
MANIFEST_SOURCE_HASH_MISMATCH
```

## 6. Metadata-only

El resultado fuerza:

```text
containsRawPayload: false
containsBytes: false
containsBase64: false
containsSecrets: false
embeddedContentExecuted: false
externalLinksFollowed: false
macrosExecuted: false
formulasCalculated: false
writeAllowed: false
enabled: false
enabledCotizador: false
enabledComparativo: false
requiresHumanValidation: true
```

El sanitizador elimina:

- API keys;
- tokens;
- credenciales;
- contraseñas;
- rutas locales;
- bytes y base64;
- texto completo marcado como raw.

Conserva claves funcionales como `routeKey`.

## 7. Training frente a operational

### Training

Nunca permite `includeSensitiveValues`.

### Operational

Requiere simultáneamente:

```text
purpose: operational
includeSensitiveValues: true
authorization.allowSensitiveValues: true
authorization.reason no vacío
```

Esta autorización debe generarla el backend después de validar rol, scope y propósito; no el navegador.

## 8. Bridge backend

`createDocumentBackendBridgeP09c()` expone el contrato compatible con P0.9b:

```text
status()
execute(task, request)
```

El bridge:

1. recibe `fileRef` del registry;
2. llama al resolver backend;
3. obtiene una ruta autorizada;
4. ejecuta el runner;
5. si falla, propaga un error controlado;
6. si funciona, devuelve el manifiesto directamente.

### Hallazgo corregido P0

La primera versión devolvía el sobre técnico completo del runner:

```text
{ ok, code, result, audit }
```

Pero `aseguradoras-knowledge-p09.js` espera que `providerResult.result` sea el manifiesto.

Corrección:

- el bridge devuelve `outcome.result` directamente;
- la ejecución queda en `runnerExecution`;
- el registry vuelve a envolver el manifiesto de forma uniforme.

Sin esta corrección, el adapter Excel no encontraba `manifest.document`, facts o candidateGroups.

## 9. Smokes

### Runner

Cubre:

- Excel y PDF;
- hash correcto/incorrecto;
- ruta fuera de raíz;
- URL remota;
- PII training;
- operational sin autorización/motivo;
- sanitización;
- flags metadata-only.

### Bridge

Cubre:

- resolver ausente;
- referencia no resuelta;
- provider conectado;
- manifiesto directo;
- metadata de ejecución.

### Pipeline extremo a extremo

```text
referencia
→ resolver
→ runner
→ bridge P0.9b
→ registry
→ service Aseguradoras
→ plan
→ writer metadata-only
→ read model
→ auditoría
```

Utiliza tenant, aseguradora y datos ficticios en el smoke de repositorio.

## 10. CI

Workflow:

```text
.github/workflows/orbit360-document-backend-runner-p09c-smoke.yml
```

Además de los smokes aislados:

- instala PyMuPDF;
- genera XLSM y PDF ficticios;
- ejecuta los extractores reales mediante el runner;
- comprueba redacción de PII;
- comprueba cero habilitación;
- ejecuta el validador Backend LAB.

## 11. Estado real

Implementado:

- runner backend reusable;
- bridge backend reusable;
- seguridad de ruta/hash;
- ejecución de extractores;
- sanitización;
- pipeline store inyectado;
- smokes/workflow.

No implementado o aplicado todavía:

- resolver Drive/upload productivo;
- endpoint/callable desplegado;
- scripts P0.9 cargados en `index.html`;
- persistencia en Firestore LAB de las fuentes A&S;
- carga por lotes de once fuentes;
- habilitación Cotizador/Comparativo.
