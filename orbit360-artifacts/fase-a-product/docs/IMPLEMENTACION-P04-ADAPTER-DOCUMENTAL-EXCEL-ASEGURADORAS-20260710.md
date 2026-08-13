# IMPLEMENTACIÓN P0.4 — ADAPTER DOCUMENTAL EXCEL PARA ASEGURADORAS

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## 1. Carril y posición dentro del plan

Carril principal: **B — backend protegido, contratos y seguridad**.  
Preparación de carril A: UX futura de Aseguradoras, Cotizador, Comparativo y Academia.  
Preparación de carril C: lectura futura de fuentes reales sin cargarlas todavía.

Este bloque continúa el orden aprobado:

```txt
CRM/Clientes cerrado en baseline
→ Aseguradoras como fuente de conocimiento
→ inventario documental
→ adapters Excel/PDF
→ propuestas/diff/validación
→ Cotizador
→ Comparativo
→ smoke transversal y Academia
```

No se reabrieron Clientes, Pólizas, Cobros, Cartera, Comisiones ni conciliaciones.

## 2. Necesidad

El módulo Aseguradoras no puede tratar todos los Excel como simples tablas.

Un libro puede contener simultáneamente:

- formulario de entrada;
- listas desplegables;
- marcas, líneas, modelos y catálogos por país;
- tasas y primas mínimas;
- reglas de cálculo;
- recargos por fraccionamiento;
- gastos de emisión;
- impuestos;
- condiciones y beneficios;
- hoja de salida de la cotización;
- diseño y área de impresión;
- fórmulas auxiliares;
- hojas ocultas o muy ocultas;
- rangos nombrados;
- casos de prueba;
- vínculos externos;
- macros que nunca deben ejecutarse durante la lectura.

Además, una misma aseguradora puede tener varios libros según:

- país;
- ramo;
- producto;
- familia o subtipo de producto;
- segmento;
- tipo de riesgo;
- tipo y uso de vehículo;
- plan;
- versión y vigencia.

No se puede representar una aseguradora con una única “póliza ejemplo”, “cotización ejemplo” o “tarifario”.

## 3. Casos A&S que el contrato debe soportar

Los nombres siguientes son ejemplos documentales del tenant A&S, no hardcodes del motor:

1. **Tarifario explícito sin salida de cotización.**  
   Debe clasificarse como `tarifario_excel` y exigir una cotización ejemplo para conocer presentación y contenido completo.

2. **Cotizador Excel usado también como fuente tarifaria.**  
   Debe poder proponer simultáneamente:
   - tarifas;
   - reglas de cálculo;
   - catálogos;
   - hoja de salida;
   - presentación;
   - área de impresión;
   - caso de prueba.

3. **Productos separados.**  
   Un libro de motos no debe mezclarse con autos; un libro de gastos médicos no debe mezclarse con vehículos.

4. **Varios libros o documentos por producto.**  
   Pueden existir múltiples cotizadores, cotizaciones ejemplo, pólizas ejemplo, condiciones, beneficios y circulares para una misma combinación.

5. **Formato propio por aseguradora.**  
   El inventario debe conservar títulos, orden, secciones, hoja de salida y perfil de impresión para que Cotizador pueda presentar toda la información original con branding del tenant, sin convertirla en un formato genérico incompleto.

## 4. Archivos implementados

### 4.1 Contrato documental común

```txt
orbit360-platform/core/document-source-contract-p04.js
```

Responsabilidades:

- crear envelope documental sin bytes;
- normalizar país y moneda;
- conservar referencia/hash/versión;
- sanear metadata;
- bloquear secretos y payload binario;
- preservar referencias seguras como `credentialRef`;
- crear propuesta de versión;
- crear auditoría sanitizada;
- generar diffs que siempre requieren validación.

### 4.2 Adapter Excel

```txt
orbit360-platform/core/excel-workbook-adapter-p04.js
```

Responsabilidades:

- normalizar snapshot estructural;
- clasificar hojas;
- inventariar impresión;
- detectar capacidades propuestas;
- construir propuesta compatible con `Orbit.cotizacionEsquemaAseguradoraP0`;
- construir propuesta de presentación;
- comparar versiones;
- invocar un proveedor de lectura seguro cuando exista;
- producir dry-run sin escritura.

### 4.3 Smokes

```txt
tools/orbit360-test-excel-workbook-adapter-p04.mjs
tools/orbit360-test-excel-workbook-adapter-p04-schema.mjs
```

### 4.4 Workflow

```txt
.github/workflows/orbit360-excel-workbook-adapter-p04-smoke.yml
```

## 5. Frontera del adapter

El core **no abre el archivo Excel directamente**.

Recibe un snapshot sanitizado producido por un proveedor autorizado:

```js
OrbitExcelParserProvider.inspectWorkbook({
  tenantId,
  aseguradoraId,
  fileRef,
  sourceHash,
  executeMacros: false,
  calculateFormulas: false,
  includeCellValues: false,
  includeBinaryPayload: false
});
```

El proveedor puede vivir en backend, worker o servicio de extracción, pero no se acopla al módulo visual.

Sin proveedor, el estado es:

```txt
BACKEND_REQUIRED
Conexión de lectura Excel pendiente.
```

## 6. Información permitida en el snapshot

### Libro

- formato;
- fingerprint;
- sistema de fechas;
- modo de cálculo;
- cantidad de hojas;
- rangos nombrados;
- presencia de macros;
- cantidad de vínculos/conexiones externas;
- protección;
- advertencias del parser;
- versión del parser.

### Hoja

- nombre e índice;
- visible/oculta/muy oculta;
- rango usado;
- filas/columnas;
- conteo de fórmulas;
- conteo de constantes;
- funciones de fórmula;
- fingerprint de fórmulas;
- errores/circularidades;
- validaciones de datos;
- formatos condicionales;
- rangos combinados;
- tablas y rangos nombrados;
- etiquetas sanitizadas;
- secciones;
- perfil de impresión.

### Perfil de impresión

- áreas;
- filas/columnas repetidas;
- orientación;
- tamaño de papel;
- ajuste a ancho/alto;
- escala;
- márgenes;
- encabezado/pie sanitizados;
- centrado.

## 7. Información prohibida

El contrato elimina o prohíbe:

- bytes;
- base64;
- buffers/blobs;
- contenido binario;
- contraseña;
- token;
- API key;
- autorización;
- credencial real;
- payload de cliente;
- rutas locales completas;
- valores completos de celdas de clientes.

Las muestras de etiquetas ocultan correos y teléfonos.

## 8. Clasificación de hojas

Roles propuestos:

```txt
entrada
tarifas
reglas_calculo
salida_cotizacion
catalogos
condiciones_beneficios
instrucciones
calculo_interno
otra
```

Se consideran:

- nombre de la hoja;
- etiquetas;
- rangos nombrados;
- cantidad de fórmulas;
- constantes numéricas;
- validaciones;
- visibilidad;
- secciones;
- áreas de impresión.

La clasificación es propuesta, no aprobación.

## 9. Capacidades propuestas

El dry-run puede proponer:

```txt
containsRatesProposal
containsCalculationRulesProposal
containsInputFormProposal
containsOutputSheetProposal
containsPrintAreaProposal
containsPresentationProposal
containsCatalogsProposal
containsConditionsProposal
```

Tipo de fuente propuesto:

```txt
cotizador_excel_salida
tarifario_excel
otro
```

Nunca se marca una tarifa como oficial o validada por la sola lectura del libro.

## 10. Integración con Aseguradoras

La propuesta conserva:

- tenant;
- aseguradora;
- país;
- moneda;
- ramo;
- producto;
- familia/subtipo;
- segmento;
- riesgo;
- tipo/uso de vehículo;
- plan;
- documento fuente;
- versión;
- fingerprint;
- capacidades;
- trazabilidad.

El resultado pasa por `Orbit.cotizacionEsquemaAseguradoraP0.normalizeTrainingSource()` cuando el esquema está disponible.

No se crea una fuente única global para toda la aseguradora. Cada combinación mantiene su propia cobertura documental.

## 11. Presentación e impresión

Cuando se detectan hojas de salida o áreas de impresión, se genera una propuesta que conserva:

- nombre de la hoja;
- títulos/secciones;
- orden;
- perfil de impresión;
- referencia al documento;
- versión;
- país y moneda.

Estado inicial:

```txt
requiere_validacion
```

Si hay tarifas/reglas pero no salida imprimible:

```txt
requiresExampleQuote: true
sin_presentacion_detectada
```

Esto cubre el caso en que el tarifario no revela cómo presenta realmente la aseguradora la cotización.

## 12. Macros, fórmulas y conexiones

Reglas:

- macros detectadas, nunca ejecutadas;
- fórmulas inventariadas, nunca calculadas por el adapter;
- funciones volátiles requieren prueba;
- vínculos externos requieren revisión;
- conexiones externas requieren revisión;
- hojas muy ocultas requieren revisión;
- referencias circulares y errores se documentan.

Advertencias previstas:

```txt
MACROS_DETECTADAS_NO_EJECUTADAS
VINCULOS_EXTERNOS_REQUIEREN_VALIDACION
CONEXIONES_EXTERNAS_REQUIEREN_VALIDACION
HOJAS_MUY_OCULTAS_REQUIEREN_REVISION
REFERENCIAS_CIRCULARES_DETECTADAS
ERRORES_DE_FORMULA_DETECTADOS
NOMBRES_CON_REFERENCIA_EXTERNA
FUNCIONES_VOLATILES_REQUIEREN_PRUEBA
FUNCIONES_EXTERNAS_REQUIEREN_REVISION
```

## 13. Versionado

La comparación detecta:

- hoja agregada/eliminada;
- cambio de visibilidad;
- cambio de fingerprint de fórmulas;
- cambio de impresión;
- cambio en validaciones;
- cambio en rol propuesto;
- presencia de macros;
- vínculos externos;
- rangos nombrados.

Estados:

```txt
omit_same_version
create_version_proposed
new_version_proposed
```

Nunca reemplaza una versión automáticamente.

## 14. Pruebas cubiertas

- cotizador completo con tarifas, reglas, entrada, catálogos y salida;
- tarifario sin presentación;
- libro separado de motos;
- país/moneda faltantes;
- libro ambiguo;
- macros;
- vínculos y conexiones externas;
- funciones volátiles;
- sanitización de correo/teléfono/ruta;
- ausencia de bytes/base64/secretos;
- cambio de fórmulas;
- cambio de impresión;
- cambio de macros;
- fingerprint idéntico;
- proveedor ausente;
- proveedor seguro;
- compatibilidad con el esquema real P0.

## 15. Registro obligatorio de hallazgos/cambios

| Fecha | Módulo | Necesidad | Esperado | Causa raíz | Archivo/función | Fix/mejora | Impacto | Estado |
|---|---|---|---|---|---|---|---|---|
| 2026-07-10 | Aseguradoras/Documentos | No tratar cotizador como tabla simple | Inventario estructural multifunción | La fuente puede contener tarifas, reglas, salida e impresión | `excel-workbook-adapter-p04.js` | Clasificación y capacidades propuestas | Prepara Cotizador/Comparativo sin perder riqueza | IMPLEMENTADO_BACKEND |
| 2026-07-10 | Seguridad documental | Evitar ejecutar macros/fórmulas | Solo inventario seguro | Los libros pueden contener código y conexiones | `inspectWithProvider` | Flags obligatorios `false` | Reduce riesgo de ejecución y fuga | IMPLEMENTADO_BACKEND |
| 2026-07-10 | Multi-producto | No mezclar autos/motos/GM | Dimensiones completas | Una aseguradora puede tener libros separados | `dimensionFields/buildTrainingSourceProposal` | Preserva producto/riesgo/vehículo/plan | Mantiene conocimiento por combinación | IMPLEMENTADO_BACKEND |
| 2026-07-10 | Presentación | Conservar formato original | Perfil de salida e impresión | Tarifario no siempre incluye presentación | `buildPresentationProposal` | Salida/print profile + `requiresExampleQuote` | Base para impresión por aseguradora | IMPLEMENTADO_BACKEND |
| 2026-07-10 | Versionado | No reemplazar archivo sin revisar | Diff estructural | Cotizadores/tasas cambian por versión | `compareWorkbookSnapshots` | Nueva versión propuesta | Trazabilidad y rollback futuro | IMPLEMENTADO_BACKEND |
| 2026-07-10 | Privacidad | No filtrar datos ni rutas | Snapshot sanitizado | Etiquetas o vínculos pueden contener datos | contrato P0.4 | Redacción y nombres externos sin ruta | Minimiza exposición | IMPLEMENTADO_BACKEND |

## 16. Estado real

```txt
Contrato documental: implementado
Adapter estructural Excel: implementado
Compatibilidad esquema P0: cubierta por smoke
Workflow: configurado
CI visible: pendiente de confirmación
Parser real XLS/XLSX/XLSM: pendiente
Archivos reales de cotizadores/tarifarios: no procesados todavía
Tarifas aprobadas: ninguna
Escritura Orbit.store: bloqueada
Empalme visual: pendiente
```

## 17. Siguiente bloque

P0.5 debe implementar el **contrato del parser real y extracción semántica propuesta**, sin cargar aún datos maestros:

1. provider backend/worker que genere el snapshot;
2. lectura real de XLS/XLSX/XLSM sin ejecutar macros;
3. inventario sanitizado descargable solo si se solicita;
4. detección de hojas/celdas/rangos relevantes;
5. propuesta de mapeo de tarifas y reglas;
6. propuesta de secciones de salida;
7. diff visual y corrección humana;
8. casos de prueba;
9. después, adapter PDF bajo el mismo contrato.

La lectura estructural debe ser determinística. La IA podrá asistir posteriormente en interpretación semántica, pero no reemplaza fórmulas, trazabilidad ni validación humana.