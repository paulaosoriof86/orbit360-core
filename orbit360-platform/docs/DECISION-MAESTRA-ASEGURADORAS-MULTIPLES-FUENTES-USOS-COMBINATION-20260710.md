# DECISIÓN MAESTRA — ASEGURADORAS / MÚLTIPLES FUENTES / MÚLTIPLES USOS / COBERTURA POR COMBINACIÓN

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## 0. Decisión ejecutiva

Una aseguradora no tiene una sola póliza ejemplo, una sola cotización ejemplo, un único tarifario ni un único documento de condiciones.

Orbit 360 debe admitir una cantidad abierta de fuentes relacionadas con:

- distintos países;
- distintos ramos;
- distintos productos;
- familias y subtipos de producto;
- segmentos;
- tipos de riesgo;
- tipos y usos de vehículo;
- planes;
- versiones y períodos de vigencia.

La suficiencia documental no se evalúa por aseguradora completa. Se evalúa por cada combinación relevante.

Ejemplo conceptual:

```txt
Aseguradora X / GT / Autos / Automóvil
Aseguradora X / GT / Autos / Motocicleta
Aseguradora X / GT / Gastos Médicos / Individual
Aseguradora X / GT / Gastos Médicos / Familiar
```

Que la combinación Autos/Automóvil tenga tarifas y presentación completas no significa que Autos/Motocicleta o Gastos Médicos estén cubiertos.

## 1. Multiplicidad permitida

Cada combinación puede contener muchos documentos del mismo tipo:

```txt
pólizas ejemplo[]
cotizaciones ejemplo[]
cotizadores Excel[]
tarifarios[]
condiciones[]
beneficios[]
circulares[]
formularios[]
casos de prueba[]
correcciones validadas[]
```

No se debe sobrescribir una fuente anterior al incorporar otra. Se conserva histórico, versión, vigencia y trazabilidad.

Múltiples ejemplos son útiles porque pueden cubrir:

- vehículos diferentes;
- usos particulares o comerciales;
- sumas aseguradas distintas;
- planes distintos;
- personas individuales y familias;
- hombres, mujeres y rangos de edad;
- coberturas, deducibles, asistencias y beneficios diferentes;
- formatos documentales que cambian por producto o versión.

## 2. Tipo de fuente y usos no son equivalentes

### Tipo de fuente

Describe el archivo o mecanismo de origen:

```txt
cotizador_excel_salida
cotizacion_pdf_oficial
tarifario_excel
tarifario_pdf
poliza_ejemplo
condiciones
circular
ajuste_validado
cotizador_linea_asistido
formulario
documento_comercial
otro
```

### Usos

Describe todo lo que esa fuente puede aportar:

```txt
tarifas
reglas_calculo
presentacion_cotizacion
extraccion_comparativo
condiciones_beneficios
casos_prueba
entrenamiento_extraccion
emision
```

Una fuente puede tener varios usos simultáneos.

## 3. Cotizador Excel como fuente múltiple

Un cotizador Excel puede ser simultáneamente:

- fuente de tasas inferidas;
- fuente de reglas de cálculo;
- fuente de primas mínimas;
- fuente de recargos y gastos;
- fuente de listas y validaciones;
- fuente de presentación si contiene hoja de salida o área de impresión;
- fuente de casos de prueba;
- fuente de entrenamiento para lectura y extracción.

Por tanto, `cotizador_excel_salida` no debe interpretarse como una categoría excluyente frente a `tarifario_excel`.

`tarifario_excel` corresponde a un archivo cuya finalidad primaria es presentar tasas o reglas explícitas.  
`cotizador_excel_salida` corresponde a un libro operativo que calcula cotizaciones y del cual Orbit puede inferir tasas y reglas.

Ambos pueden alimentar el motor tarifario, pero mediante rutas de extracción y validación distintas.

## 4. Evaluación por combinación

La clave de cobertura debe considerar, según aplique:

```txt
país
ramo
producto
familiaProducto
subtipoProducto
segmento
tipoRiesgo
tipoVehiculo
usoVehiculo
plan
```

Los campos vacíos se consideran alcance general únicamente dentro de la misma aseguradora y nunca deben completar automáticamente una combinación más específica sin validación.

Cada grupo debe informar:

```txt
cantidad de fuentes
cantidad por tipo
cantidad de pólizas ejemplo
cantidad de cotizaciones ejemplo
cantidad de cotizadores Excel
fuente tarifaria disponible
reglas disponibles
presentación disponible
casos de prueba disponibles
condiciones/beneficios disponibles
requiere cotización ejemplo
estado de cobertura
```

## 5. Reglas de suficiencia

### 5.1 Cotizador Excel con salida completa

Puede completar en una misma combinación:

```txt
tarifas + reglas + presentación + casos de prueba
```

No exige un PDF adicional por defecto si la hoja de salida conserva toda la presentación, pero sí puede complementarse con cotizaciones y pólizas oficiales para validar precisión.

### 5.2 Cotizador Excel sin salida completa

Puede aportar:

```txt
tarifas + reglas
```

Debe marcarse `requiere cotización ejemplo` para esa combinación.

### 5.3 Tarifario explícito

Aporta tasas o reglas, pero no define por sí solo la presentación comercial.

### 5.4 Cotización PDF oficial

Aporta presentación, valores y caso de prueba. No inventa tarifas generales si no existe evidencia suficiente.

### 5.5 Póliza ejemplo

Aporta condiciones, coberturas, deducibles, exclusiones, anexos y conocimiento de emisión. Puede haber muchas por combinación.

### 5.6 Condiciones, beneficios y circulares

Pueden existir varios documentos por producto, plan, versión o vigencia y deben conservarse separados.

## 6. Situación A&S informada

Sin hardcodear nombres ni reglas en el core reusable, el inventario A&S debe reflejar:

- una aseguradora con tasas explícitas, pero sin cotizador completo, requiere cotización oficial de ejemplo para definir su presentación;
- varias aseguradoras entregan cotizadores Excel y esos cotizadores son la fuente utilizada para inferir tarifas, reglas, recargos, mínimos y presentación;
- una misma aseguradora puede tener cotizadores separados para Autos, Motos o Gastos Médicos;
- Autos y Motos no deben compartir automáticamente tasas, mínimos ni formato;
- Gastos Médicos individual y familiar requieren grupos y casos distintos.

El nombre de una aseguradora mencionado en sesiones como `Colmena`/`Columna` debe resolverse contra el directorio real antes de asociar fuentes. Se registra como `REQUIERE_VALIDACION_NOMBRE`; no se hardcodea ninguna de las variantes.

## 7. Implementación técnica

Archivo actualizado:

```txt
orbit360-platform/core/cotizacion-esquema-aseguradora-p0.js
```

Capacidades añadidas:

- `SOURCE_USES`;
- `normalizeDimensions`;
- `dimensionKey`;
- `normalizeTrainingSource`;
- `summarizeSourceGroup`;
- `createKnowledgeInventory`;
- `sourcesForCombination`;
- conteos por tipo de fuente;
- separación de grupos completos e incompletos;
- detección de ejemplos faltantes por combinación.

Se conserva compatibilidad con:

- `normalizePresentation`;
- `validatePresentation`;
- `inspectTrainingSource`;
- `createTrainingProfile`;
- `attachPresentationToQuote`;
- `flattenCanonicalFields`.

## 8. Smoke

Archivo actualizado:

```txt
tools/orbit360-test-cotizacion-esquema-aseguradora-p0.mjs
```

Casos cubiertos:

1. secciones y beneficios particulares;
2. dimensión tipo de vehículo;
3. cotizador Excel con múltiples usos;
4. tarifario sin presentación;
5. dos pólizas ejemplo para Autos;
6. Motos como grupo independiente;
7. Autos no completa Motos;
8. Gastos Médicos individual y familiar separados;
9. cotización PDF no inventa tarifas;
10. múltiples fuentes dentro del mismo perfil;
11. conteos por tipo;
12. preservación de presentación y campos canónicos.

La sintaxis y el smoke fueron ejecutados localmente antes del commit. GitHub Actions continúa pendiente de evidencia visible.

## 9. Impacto en runtime

El runtime actual ya admite múltiples registros en `aseguradora.docs[]`, pero la interfaz provisional todavía debe ampliarse para capturar y visualizar:

- familia y subtipo de producto;
- segmento;
- tipo de riesgo;
- tipo y uso de vehículo;
- agrupación por combinación;
- cantidad de ejemplos por tipo;
- faltantes específicos por grupo.

Este pendiente es P0.1b y no implica rehacer el inventario ya implementado.

## 10. Claude / prototipo / UX

Claude deberá recibir esta decisión completa.

Debe diseñar una ficha que permita:

- varios documentos del mismo tipo;
- agrupación por país/producto/segmento/tipo de vehículo;
- filtros y desplegables;
- conteos por grupo;
- estados de cobertura por combinación;
- alertas específicas, no una alerta general por aseguradora;
- historial y versión;
- carga masiva;
- vista de fuentes relacionadas;
- distinción visual entre tipo de archivo y usos;
- apertura del documento original.

No debe:

- limitar una aseguradora a una póliza o cotización ejemplo;
- asumir que un cotizador y un tarifario son excluyentes;
- considerar completa toda la aseguradora porque un producto está completo;
- mezclar Autos, Motos, Gastos Médicos u otros productos;
- eliminar ejemplos anteriores al cargar una nueva versión.

Estado Claude: `DOCUMENTADO / LISTO_PARA_PAQUETE_ACUMULADO / NO_ENVIADO`.

## 11. Academia

Academia debe enseñar:

- por qué se requieren varios ejemplos;
- diferencia entre tipo de fuente y usos;
- cómo un cotizador Excel permite inferir tarifas;
- cómo verificar que una regla inferida aplica al producto correcto;
- cómo agrupar por producto, segmento y tipo de vehículo;
- cómo detectar un faltante específico;
- cómo sustituir una versión sin borrar el histórico;
- por qué una cotización ejemplo no prueba por sí sola una tarifa general.

## 12. Continuidad del plan

Este bloque corrige P0.1 sin reabrir CRM.

Orden vigente:

1. cerrar P0.1b en runtime: dimensiones y grupos visibles;
2. P0.2: accesos y cuentas sensibles;
3. P0.3: matching de carpeta Drive;
4. P0.4: adapters Excel/PDF;
5. calibración con fuentes reales;
6. Cotizador;
7. Comparativo;
8. Claude para consolidación visual;
9. Academia profunda.

No se solicitarán archivos uno por uno. Cuando comience la calibración se priorizará acceso a carpetas padre y carga agrupada por aseguradora/producto.
