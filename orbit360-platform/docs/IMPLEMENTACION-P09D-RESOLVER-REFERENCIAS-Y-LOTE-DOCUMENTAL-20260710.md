# Implementación P0.9d — resolver de referencias y lote documental

Fecha: 2026-07-10  
Módulo: Aseguradoras / ingestión documental  
Estado: `CONTRATOS_IMPLEMENTADOS / RESOLVER_PRODUCTIVO_PENDIENTE / LOTE_SOLO_DRY_RUN`

## 1. Necesidad

El runner P0.9c requiere una ruta montada autorizada, pero el navegador únicamente debe enviar una referencia lógica. P0.9d establece la frontera entre ambas y permite organizar varias fuentes antes de ejecutar el pipeline.

## 2. Archivos

```text
tools/orbit360-document-source-resolver-p09d.mjs
tools/orbit360-document-batch-plan-p09d.mjs
tools/orbit360-test-document-source-resolver-p09d.mjs
tools/orbit360-test-document-batch-plan-p09d.mjs
.github/workflows/orbit360-document-source-resolver-p09d-smoke.yml
```

## 3. Resolver autorizado

Interfaz:

```javascript
createDocumentSourceResolverP09d({
  lookupReference,
  markReferenceUsed,
  allowedTenants,
  clock
})
```

El navegador envía:

```text
tenantId
aseguradoraId
documentId
fileRef
task
purpose
```

El backend consulta un registro interno que contiene:

```text
fileRef
tenantId
aseguradoraId/documentId opcionales
localPath montado
sourceHash
status
tasks permitidas
purposes permitidos
expiresAt
singleUse/usedAt
política de acceso sensible
```

## 4. Validaciones

### Request

- tenant;
- aseguradora;
- documento;
- referencia;
- tarea soportada;
- propósito;
- prohibición de ruta local enviada por cliente.

### Registro

- referencia exacta;
- mismo tenant;
- misma aseguradora/documento cuando están fijados;
- estado `ready`, `mounted` o `available`;
- ruta backend presente;
- no expirado;
- tarea y propósito permitidos;
- single-use no consumido;
- acceso sensible autorizado.

Bloqueos principales:

```text
CLIENT_PATH_FORBIDDEN
TENANT_NOT_ALLOWED
SOURCE_REFERENCE_NOT_FOUND
REFERENCE_TENANT_MISMATCH
REFERENCE_INSURER_MISMATCH
REFERENCE_DOCUMENT_MISMATCH
REFERENCE_NOT_READY
REFERENCE_EXPIRED
REFERENCE_TASK_NOT_ALLOWED
REFERENCE_PURPOSE_NOT_ALLOWED
REFERENCE_ALREADY_USED
```

## 5. Auditoría

El resolver genera metadata con:

- tenant;
- aseguradora;
- documento;
- fileRef;
- tarea;
- propósito;
- referencia interna;
- resultado;
- fecha.

Fuerza:

```text
containsLocalPath: false
containsRawPayload: false
containsSecrets: false
```

La ruta montada solo se entrega internamente al runner.

## 6. Lote documental

`buildDocumentBatchPlanP09d()` recibe fuentes de un tenant y valida:

- documento;
- aseguradora;
- fileRef;
- versión;
- país y moneda;
- tipo compatible;
- tenant coincidente;
- duplicado de documento/versión;
- duplicado de referencia.

Clasifica cada fuente como:

```text
ready_for_dry_run
blocked
```

Resumen:

```text
total
ready
blocked
insurers
excel
pdf
```

Agrupa por aseguradora, pero no fusiona documentos.

## 7. Ejecución del lote

`executeDocumentBatchDryRunP09d()` ejecuta `inspect(item)` secuencialmente.

Características:

- no aplica planes;
- no escribe Orbit.store;
- puede detenerse al primer error;
- conserva resultado por documento;
- requiere revisión humana;
- no habilita módulos.

Fuerza:

```text
writeAllowed: false
applyAllowed: false
enablesCotizador: false
enablesComparativo: false
```

## 8. Reutilización multi-tenant

No existen nombres de A&S ni aseguradoras reales en el código.

Cada tenant aporta:

- directorio;
- referencias;
- archivos;
- países/monedas;
- productos;
- permisos;
- políticas de provider.

Una referencia de un tenant no puede resolverse para otro.

## 9. Smokes

Resolver:

- resolución válida;
- auditoría sin ruta;
- tenant no permitido;
- ruta enviada por cliente;
- tarea no autorizada.

Lote:

- múltiples aseguradoras;
- Excel/PDF;
- resumen;
- dry-run;
- duplicado;
- cero escritura/habilitación.

## 10. Estado real

Implementado:

- contrato de referencia;
- aislamiento tenant;
- expiración/task/purpose;
- política sensible;
- batch plan;
- batch dry-run;
- tests y workflow.

Pendiente:

- repositorio real de referencias Drive/upload;
- montaje/descarga temporal backend;
- lifecycle de referencias;
- empalme runtime;
- ejecución del lote A&S;
- Firestore LAB;
- CI visible.
