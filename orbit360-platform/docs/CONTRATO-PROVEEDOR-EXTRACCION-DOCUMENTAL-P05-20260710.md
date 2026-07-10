# CONTRATO DE PROVEEDOR — EXTRACCIÓN DOCUMENTAL P0.5

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Estado: contrato backend reusable, sin proveedor real conectado.

## 1. Propósito

Definir la frontera segura entre Orbit 360 y cualquier motor determinístico/IA utilizado para inventariar o extraer conocimiento desde fuentes de aseguradoras.

El proveedor no decide tarifas oficiales, no habilita Cotizador/Comparativo y no escribe en `Orbit.store`.

## 2. Proveedores separados

### Inspector estructural

Interfaz esperada:

```js
OrbitExcelParserProvider.inspectWorkbook(request)
```

Responsabilidad:

- inventariar estructura XLSX/XLSM;
- devolver hojas, rangos, fórmulas, validaciones, impresión y alertas;
- no devolver valores de celdas.

### Extractor semántico

Interfaz esperada:

```js
OrbitDocumentExtractionProviderP05.extractFacts(request)
```

Responsabilidad:

- proponer únicamente conceptos solicitados;
- devolver evidencia hoja/rango o página/bloque;
- devolver confianza;
- no aprobar ni habilitar.

## 3. Solicitud del inspector

```js
{
  tenantId,
  aseguradoraId,
  fileRef,
  sourceHash,
  executeMacros: false,
  calculateFormulas: false,
  includeCellValues: false,
  includeBinaryPayload: false
}
```

El proveedor debe rechazar solicitudes que pidan ejecutar macros, fórmulas o devolver payload binario.

## 4. Solicitud del extractor

```js
{
  tenantId,
  aseguradoraId,
  documentId,
  fileRef,
  sourceHash,
  mediaKind,
  versionFuente,
  dimensiones,
  concepts,
  includeRawCells: false,
  includeWorkbookPayload: false,
  includeCustomerPayload: false,
  includeSecrets: false,
  executeMacros: false,
  calculateFormulas: false,
  requiresEvidence: true
}
```

## 5. Conceptos canónicos iniciales

El contrato contempla, entre otros:

```txt
tasa
factor
rango
prima_minima
prima_neta
prima_total
recargo_fraccionamiento
gasto_emision
gasto_expedicion
iva
impuesto
numero_cuotas
cuota
plazo
forma_pago
visa_cuotas
asistencia
catalogo
tipo_vehiculo
uso_vehiculo
edad
sexo
maternidad
cobertura
limite
deducible
beneficio
exclusion
condicion
regla_calculo
seccion_presentacion
otro
```

El proveedor no debe forzar un dato particular a una categoría equivocada. Puede usar `otro` con nombre, calificadores y evidencia.

## 6. Respuesta del extractor

```js
{
  proposals: [
    {
      concepto,
      nombre,
      valor,
      valorTipo,
      unidad,
      moneda,
      dimensiones,
      calificadores,
      vigenciaDesde,
      vigenciaHasta,
      confianza,
      evidencia: {
        mediaKind,
        sheet,
        range,
        formulaRef,
        page,
        block,
        parserMethod,
        evidenceHash
      }
    }
  ]
}
```

## 7. Evidencia

### Excel

Obligatorio:

- `sheet`;
- `range`.

Recomendado:

- `formulaRef` sanitizada;
- `evidenceHash`;
- método determinístico/IA/humano.

### PDF/imagen

Obligatorio:

- página o bloque;
- referencia al documento.

No se debe devolver la página completa dentro de la respuesta del contrato.

## 8. Dimensiones obligatorias

Las propuestas deben resolverse por la combinación aplicable:

- país;
- moneda;
- ramo;
- producto;
- familia/subtipo;
- segmento;
- tipo de riesgo;
- tipo y uso de vehículo;
- plan;
- calificadores adicionales.

Ejemplos:

```txt
GT · Autos · Liviano · Particular
GT · Motos · Motocicleta
GT · Gastos Médicos · Individual · Mujer · rango 30-39
GT · Gastos Médicos · Familiar · dependiente menor
CO · Autos · Todo Riesgo · Particular
```

Una regla no debe propagarse a otra combinación sin evidencia.

## 9. Separación determinístico/IA

Orden recomendado:

```txt
parser estructural determinístico
→ reglas/detecciones conocidas
→ IA acotada para interpretación
→ validadores de contrato
→ diff
→ revisión humana
```

La IA no debe recibir el archivo completo cuando una extracción localizada y sanitizada sea suficiente.

## 10. Seguridad

Prohibido:

- credenciales de portales;
- tokens;
- service accounts;
- payload binario en respuestas;
- datos de clientes no requeridos;
- ejecución de VBA;
- cálculo de fórmulas no confiables;
- acceso de red desde el libro;
- seguimiento de vínculos externos;
- habilitación automática de tarifas.

## 11. Estados

```txt
propuesto
requiere_validacion
sin_evidencia
conflicto
confirmado
corregido
rechazado
validado_pendiente_habilitacion
validado_habilitado
reemplazado_por_version
```

`validado_habilitado` pertenece a un gate posterior y no puede ser emitido por el proveedor.

## 12. Criterios de aceptación del proveedor

Debe superar un benchmark sanitizado por:

- aseguradora;
- país;
- producto;
- tipo de archivo;
- formato/versiones;
- reglas tarifarias;
- secciones de presentación;
- precisión de evidencia;
- omisiones;
- falsos positivos;
- conflictos.

No se seleccionará proveedor definitivo solo por percepción general. La decisión debe basarse en precisión, trazabilidad, costo, seguridad y consistencia sobre fuentes A&S sanitizadas.

## 13. Estado

```txt
CONTRATO_DEFINIDO
PROVEEDOR_INSPECTOR_LOCAL_P04B_DISPONIBLE_PARA_XLSX_XLSM
PROVEEDOR_SEMANTICO_REAL_PENDIENTE
BENCHMARK_REAL_PENDIENTE
SIN_SECRETOS
SIN_DATOS_REALES
SIN_HABILITACION_AUTOMATICA
```
