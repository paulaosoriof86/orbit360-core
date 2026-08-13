# Implementación P0.9h — historial reanudable del lote de Aseguradoras

Fecha: 2026-07-10  
Módulo: Aseguradoras → conocimiento documental  
Estado: `CONTRATO_IMPLEMENTADO / HISTORIAL_LAB_PREPARADO / EJECUCION_REAL_PENDIENTE`

## 1. Necesidad

P0.9g podía ejecutar el lote y conservar el último estado en memoria del navegador. Al recargar, se perdían:

- runs anteriores;
- resultado por documento;
- cantidad de intentos;
- causa final;
- diff frente al run previo;
- selección de documentos reanudables.

Eso podía obligar a repetir las once fuentes o depender de memoria manual.

## 2. Causa raíz

Las colecciones profundas existentes cubrían manifiestos, propuestas, reglas, presentaciones, bindings y revisiones, pero no historial del lote.

Además, el orquestador P0.9g excluye correctamente referencias backend de su estado público. El historial debía conservar esa protección y no serializar fileRefs, rutas o URLs temporales.

## 3. Archivos

```text
orbit360-platform/core/aseguradoras-batch-history-p09h.js
orbit360-platform/core/aseguradoras-lab-collections-p09e.js
orbit360-platform/core/aseguradoras-runtime-bootstrap-p09f.js
orbit360-platform/modules/aseguradoras-knowledge-panel-p09f.js
```

## 4. Colecciones añadidas

```text
aseguradora_batch_runs
aseguradora_batch_items
```

`aseguradora_batch_runs` conserva:

- runId;
- tenant y lote;
- modo;
- estado y código;
- inicio/fin;
- resumen;
- estados de binding;
- actor, rol activo y motivo;
- run del cual se reanudó;
- flags de seguridad.

`aseguradora_batch_items` conserva por documento:

- runId;
- documentId;
- aseguradora y tarea;
- estado y código;
- cantidad/resumen de intentos;
- outputs contados;
- errores sanitizados;
- verificación;
- diff frente al último registro del documento;
- elegibilidad para reanudación.

## 5. Datos excluidos

El sanitizador elimina:

- fileRef/sourceRef/archivoRef;
- mountedPath/localPath/path;
- URL y signed URL;
- bytes, base64 y texto completo;
- tokens, claves, secretos y credenciales.

El contrato público de referencias únicamente indica:

```text
documentId
tarea
aseguradora
required
provided
referenceValueExposed: false
```

## 6. Diff

Por documento se comparan:

```text
status
code
attempts
outputs
errors
```

El diff no contiene el archivo ni el payload. Permite identificar, por ejemplo:

- `failed` → `dry_run_ready`;
- referencia faltante → procesado;
- aparición de manifiesto o regla;
- cambio de código de error;
- reducción/aumento de intentos.

## 7. Reanudación

Estados reanudables por defecto:

```text
waiting_reference
failed
blocked
```

`resume()` obtiene los documentos del último run persistido y ejecuta P0.9g con `onlyDocumentIds`.

No repite documentos que ya quedaron `dry_run_ready`, `persisted` o `verified`, salvo selección explícita.

## 8. Persistencia LAB

La persistencia del historial exige:

- plan válido y metadata-only;
- actor administrativo;
- rol activo asignado;
- motivo;
- confirmación del plan;
- confirmación de persistencia;
- gate P0.9e aprobado;
- snapshots de las ocho colecciones profundas.

Operaciones permitidas:

```text
upsert aseguradora_batch_runs
upsert aseguradora_batch_items
```

Se registra actividad sanitizada en `actividades`.

Si una escritura intermedia falla:

```text
HISTORY_WRITE_FAILED_ROLLED_BACK
```

El writer revierte run e ítems para impedir historial parcial.

Después espera:

1. cola LAB asentada;
2. run visible;
3. cantidad esperada de ítems visible.

## 9. UI

El panel aditivo muestra:

- número de runs;
- número de ítems históricos;
- último estado persistido;
- documentos reanudables.

No incluye botones de ejecutar, reanudar o persistir. Continúa siendo solo lectura.

## 10. Seguridad y habilitación

Todo run e ítem fuerza:

```text
enabled: false
enablesCotizador: false
enablesComparativo: false
requiresHumanValidation: true
```

Registrar historial nunca habilita reglas, presentaciones, Cotizador o Comparativo.

## 11. Pruebas

```text
tools/orbit360-test-aseguradoras-batch-history-p09h.mjs
```

Cubre:

- contrato de referencias sin valor;
- persistencia de run e ítems;
- auditoría;
- aislamiento tenant;
- documentos reanudables;
- segundo run;
- diff;
- Asesor bloqueado;
- rollback completo;
- cero red/localStorage;
- cero habilitación.

Workflow:

```text
.github/workflows/orbit360-aseguradoras-batch-history-p09h-smoke.yml
```

## 12. Impacto

### Carril B

Cierra contrato, persistencia, snapshots, reanudación y auditoría.

### Carril C

Permitirá procesar las once fuentes sin repetir las aprobadas después de una interrupción.

### Carril A

Define historial visible y futura UX de detalle, sin diseñar todavía acciones administrativas finales.

## 13. Pendientes

- CI visible;
- bootstrap aplicado en LAB;
- bridge/provider real;
- primera ejecución real;
- persistencia del primer historial;
- reanudación real de una fuente fallida o pendiente;
- smoke visual;
- candidata Claude posterior.
