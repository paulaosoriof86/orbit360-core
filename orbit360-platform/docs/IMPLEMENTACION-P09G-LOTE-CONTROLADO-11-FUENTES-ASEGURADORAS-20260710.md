# Implementación P0.9g — lote controlado de once fuentes de Aseguradoras

Fecha: 2026-07-10  
Módulo: Aseguradoras → conocimiento documental → Cotizador/Comparativo  
Estado: `CONTRATO_IMPLEMENTADO / LOTE_CONFIGURADO / EJECUCION_REAL_PENDIENTE`

## 1. Necesidad

Las once fuentes reales de A&S ya estaban auditadas y clasificadas, pero aún faltaba un mecanismo único para:

- procesarlas en orden;
- resolverlas contra el directorio del tenant;
- recibir referencias backend sin exponer rutas;
- reintentar fallos transitorios;
- separar dry-run de persistencia;
- verificar el read model después de escribir;
- mostrar progreso por aseguradora;
- evaluar dependencias entre tarifarios y presentaciones;
- mantener cerrado el segundo gate.

Ejecutar cada archivo mediante llamadas independientes habría repetido lógica, dificultado reintentos y permitido estados inconsistentes.

## 2. Archivos implementados

```text
orbit360-platform/data/tenant-alianzas-soluciones-source-batch-p09g.js
orbit360-platform/core/aseguradoras-batch-orchestrator-p09g.js
```

Actualizados:

```text
orbit360-platform/core/aseguradoras-runtime-bootstrap-p09f.js
orbit360-platform/modules/aseguradoras-knowledge-panel-p09f.js
```

Pruebas y workflow:

```text
tools/orbit360-test-aseguradoras-batch-orchestrator-p09g.mjs
tools/orbit360-test-aseguradoras-runtime-bootstrap-p09f.mjs
tools/orbit360-test-aseguradoras-knowledge-panel-p09f.mjs
.github/workflows/orbit360-aseguradoras-batch-p09g-smoke.yml
```

## 3. Inventario tenant A&S

El lote contiene:

```text
11 fuentes
6 aseguradoras
8 Excel
3 PDF
3 conjuntos de binding conocidos
```

### Seguros BAM

- Cotizador Vehículos.
- Cotizador Gastos Médicos.

### Bantrab

- Cotizador Autos.
- Cotizador Motocicletas.

### Seguros Columna

- Cotizador Vehículos.

### Aseguradora Guatemalteca

- Tarifario Excel.
- Cotización PDF automóvil.
- Cotización PDF microbús hasta nueve pasajeros.

### Aseguradora Rural (Banrural)

- Cotizador Autos.
- Cotizador Gastos Médicos.

### Seguros Universales

- Cotización PDF Riesgo Plus.

El archivo tenant no contiene rutas locales, fileRefs reales, tasas, PII, binarios, secretos ni estados habilitados.

## 4. Reutilización del pipeline existente

P0.9g no crea otro extractor ni otro writer. Cada elemento reutiliza:

```text
aseguradorasFirstSourceP09f.prepare()
→ dry-run metadata-only
→ aseguradorasFirstSourceP09f.persist()
→ gate LAB P0.9e
→ aseguradorasFirstSourceP09f.verify()
```

Por tanto, continúan vigentes:

- actor y rol activo;
- tenant;
- motivo;
- confirmación del plan;
- confirmación independiente de persistencia;
- security guard;
- snapshots profundos;
- rollback;
- read model;
- cero habilitación.

## 5. Referencias backend

El lote recibe las referencias en tiempo de ejecución mediante:

```text
sourceRefs[documentId]
```

o un resolver backend inyectado.

Una referencia faltante produce:

```text
BACKEND_SOURCE_REFERENCE_REQUIRED
status: waiting_reference
```

No se inventan rutas ni se usa el nombre del archivo como referencia operativa.

El estado público del lote elimina:

- `fileRef`;
- `sourceRef`;
- `archivoRef`;
- rutas montadas/locales;
- URLs temporales o firmadas.

## 6. Estados por fuente

```text
waiting_reference
blocked
failed
dry_run_ready
persisted
verified
```

`dry_run_ready` significa que existe un plan metadata-only revisable. No significa que la regla o presentación esté validada ni habilitada.

## 7. Reintentos

Códigos transitorios iniciales:

```text
PROVIDER_EXECUTION_FAILED
PDF_EXTRACTION_FAILED
INSPECTION_NOT_READY
SNAPSHOT_CONFIRMATION_TIMEOUT
WRITE_FAILED_ROLLED_BACK
```

El número máximo de reintentos puede configurarse por lote o ejecución. Los errores estructurales, de tenant, referencia o autorización no se reintentan automáticamente.

## 8. Doble confirmación

Para entrar en modo persistencia se exige:

```text
mode: persist
confirmBatchPersistence: true
```

Además, por fuente se exige:

```text
confirmAllPersistence: true
```

o:

```text
confirmPersistenceByDocumentId[documentId] = true
```

Sin ambas capas, el lote no llama al gate de persistencia.

## 9. Binding sets

### AseGuate automóvil

Requiere:

- tarifario AseGuate;
- presentación PDF automóvil;
- regla tarifaria revisada;
- presentación revisada;
- reconciliación del ejemplo.

### AseGuate microbús

Requiere el mismo conjunto, pero con presentación, regla y reconciliación propias de microbús.

### Universales Riesgo Plus

La presentación existe, pero el lote registra:

```text
knownMissingKnowledge: tariff_rule
```

No se considera listo para binding automático.

## 10. Estados de binding

```text
waiting_sources
invalid_missing_documents
waiting_or_blocked_sources
documents_ready_knowledge_incomplete
incomplete_known_missing_knowledge
ready_for_binding_review
```

Diferencia obligatoria:

```text
documentos procesados
≠ conocimiento suficiente
≠ binding habilitado
```

Incluso `ready_for_binding_review` mantiene:

```text
enabled: false
enablesCotizador: false
enablesComparativo: false
requiresSecondGateForEnablement: true
```

## 11. Panel Aseguradoras

El panel aditivo muestra:

- inventario del lote;
- último estado;
- fuentes listas en dry-run;
- persistidas;
- referencias pendientes;
- fallos;
- bindings listos para revisión;
- bindings incompletos;
- detalle de cada conjunto conocido.

El panel:

- filtra contadores por tenant;
- no ejecuta el lote;
- no escribe `Orbit.store`;
- no incluye botones de habilitación;
- refresca al recibir eventos del runtime o snapshots.

## 12. Eventos

```text
orbit:aseguradoras:batch-state
orbit:aseguradoras:batch-item
```

Los eventos contienen estados sanitizados y no exponen referencias backend.

## 13. Smoke sintético

Cubre:

- once fuentes;
- seis aseguradoras;
- ocho Excel y tres PDF;
- reintento transitorio;
- referencia faltante;
- dry-run sin escritura;
- persistencia bloqueada sin confirmación;
- persistencia confirmada fuente por fuente;
- verificación posterior;
- AseGuate automóvil y microbús separados;
- Universales sin tarifa;
- estado público sin fileRefs;
- panel solo lectura;
- bootstrap sin duplicados;
- cero habilitación.

## 14. Impacto

### Carril B

Cierra la coordinación reusable de múltiples fuentes y conserva un único gate de escritura.

### Carril C

Deja las once fuentes A&S organizadas y listas para recibir referencias backend reales.

### Carril A

Hace visible el estado del conocimiento sin pedir a Claude que diseñe todavía acciones cuyo backend no está conectado.

## 15. Estado honesto

```text
lote configurado: sí
orquestador implementado: sí
smoke sintético: configurado
provider real: no conectado
referencias Drive/upload: no resueltas
lote real: no ejecutado
Firestore LAB: sin lote persistido
bindings reales: no persistidos
Cotizador: deshabilitado
Comparativo: deshabilitado
```

## 16. Pendientes

- ejecución visible de CI;
- bridge backend real;
- referencias autorizadas;
- dry-run real por las once fuentes;
- revisión de propuestas;
- persistencia secuencial metadata-only;
- recarga y read model;
- construcción real de reglas/reconciliaciones;
- bindings AseGuate;
- segundo gate;
- smoke navegador;
- candidata Claude posterior.
