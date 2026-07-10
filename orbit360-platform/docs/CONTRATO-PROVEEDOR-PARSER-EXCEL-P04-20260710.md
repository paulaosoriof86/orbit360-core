# CONTRATO DEL PROVEEDOR DE PARSER EXCEL — P0.4

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S

## 1. Propósito

Definir la frontera entre el archivo real XLS/XLSX/XLSM/XLSB y el core reusable `excel-workbook-adapter-p04.js`.

El parser realiza lectura técnica del libro. El adapter interpreta el snapshot, propone capacidades y genera dry-run. Ninguno escribe datos maestros.

## 2. Interfaz esperada

```js
window.OrbitExcelParserProvider = {
  async inspectWorkbook(request) {
    return sanitizedWorkbookSnapshot;
  }
};
```

Request:

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

El proveedor debe rechazar solicitudes que intenten cambiar cualquiera de las cuatro banderas de seguridad a `true`.

## 3. Resultado mínimo

```js
{
  format: 'xlsx',
  workbookFingerprint: 'sha256-o-equivalente',
  dateSystem: '1900',
  calculationMode: 'automatic|manual|unknown',
  hasMacros: false,
  externalLinkCount: 0,
  connectionCount: 0,
  protectedWorkbook: false,
  parser: {
    provider: 'nombre-interno',
    version: 'v1',
    generatedAt: 'ISO-8601'
  },
  definedNames: [],
  worksheets: []
}
```

## 4. Snapshot de hoja

```js
{
  name: 'Cotización',
  index: 4,
  visibility: 'visible|hidden|veryHidden',
  usedRange: 'A1:N68',
  rowCount: 68,
  columnCount: 14,
  formulaCount: 85,
  numericConstantCount: 0,
  textConstantCount: 0,
  formulaFunctions: ['IF', 'ROUND', 'SUM'],
  formulaFingerprint: 'hash-normalizado',
  formulaErrorCount: 0,
  circularReferenceCount: 0,
  dataValidationCount: 0,
  conditionalFormatCount: 0,
  mergedRanges: ['$A$1:$N$2'],
  tableNames: [],
  namedRanges: [],
  labels: ['Sección 1', 'Beneficios adicionales'],
  sectionLabels: ['Sección 1', 'Sección 2', 'Sección 3'],
  print: {
    areas: ['$A$1:$N$68'],
    titlesRows: '$1:$3',
    titlesColumns: '',
    orientation: 'portrait',
    paperSize: 'Letter',
    fitToWidth: 1,
    fitToHeight: 2,
    scale: 0,
    margins: {},
    header: '',
    footer: ''
  }
}
```

## 5. Fórmulas

El parser puede inspeccionar texto de fórmulas para producir:

- conteo;
- funciones utilizadas;
- referencias internas/externas;
- fingerprint normalizado;
- errores;
- circularidades.

No debe devolver valores calculados de clientes ni ejecutar recálculo.

El fingerprint debe ignorar cambios irrelevantes de formato y detectar cambios funcionales.

## 6. Macros

Reglas absolutas:

```txt
No ejecutar VBA.
No ejecutar macros XLM.
No ejecutar ActiveX.
No ejecutar complementos.
No habilitar contenido.
No seguir enlaces externos.
```

Solo se reporta presencia, tipo disponible y fingerprint si la biblioteca lo permite sin ejecutar código.

## 7. Etiquetas y muestras

Se permiten únicamente etiquetas necesarias para interpretación:

- encabezados;
- títulos;
- nombres de campos;
- secciones;
- nombres de listas;
- descripciones de cobertura.

No se deben incluir:

- nombres reales de asegurados;
- correos;
- teléfonos;
- DPI/cédula/NIT de clientes;
- placas reales;
- cuentas bancarias;
- valores completos de formularios diligenciados.

Si el parser no puede distinguir etiqueta de dato, debe omitir la muestra y reportar:

```txt
MUESTRA_OMITIDA_POR_PRIVACIDAD
```

## 8. Vínculos externos

Solo devolver:

- cantidad;
- nombre de archivo externo sin ruta;
- hoja/rango que depende del vínculo, si es seguro;
- fingerprint.

No devolver:

- ruta local;
- URL firmada;
- token;
- credenciales;
- nombre de usuario del equipo.

## 9. Rangos nombrados y validaciones

Deben inventariarse porque pueden definir:

- tasas;
- primas mínimas;
- catálogos;
- marcas/líneas/modelos;
- planes;
- factores;
- listas desplegables;
- celdas de entrada;
- área de salida.

El parser no debe asumir el significado. El adapter y la validación humana lo proponen.

## 10. Control de versiones

Por cada libro se debe calcular:

- hash de archivo;
- fingerprint de estructura;
- fingerprint por hoja;
- fingerprint de fórmulas;
- fingerprint de impresión;
- versión declarada si existe;
- fecha de lectura.

Un hash o fingerprint diferente genera `new_version_proposed`; no reemplaza la versión anterior.

## 11. Estados y errores

Estados recomendados:

```txt
lectura_pendiente
inventario_generado
requiere_validacion
bloqueado_por_seguridad
formato_no_soportado
archivo_protegido
parser_error
```

Errores relevantes:

```txt
MACRO_EXECUTION_FORBIDDEN
FORMULA_CALCULATION_FORBIDDEN
BINARY_PAYLOAD_FORBIDDEN
CUSTOMER_VALUES_FORBIDDEN
UNSUPPORTED_FORMAT
PASSWORD_PROTECTED_FILE
CORRUPTED_WORKBOOK
EXTERNAL_LINK_BLOCKED
```

## 12. Auditoría

Registrar solo:

- tenant;
- aseguradora;
- documento;
- hash;
- parser y versión;
- actor/rol;
- fecha;
- resultado;
- advertencias;
- cantidades estructurales.

Nunca registrar bytes, valores de celdas, secretos o rutas locales.

## 13. Tecnologías

La selección de biblioteca o servicio de parser queda desacoplada del contrato. Debe evaluarse por:

- soporte XLS/XLSX/XLSM/XLSB;
- lectura de fórmulas sin ejecución;
- hojas hidden/veryHidden;
- validaciones;
- defined names;
- print area/page setup;
- macros detectables sin ejecución;
- vínculos externos;
- rendimiento;
- aislamiento;
- licencia;
- capacidad de generar snapshot sanitizado.

No se debe elegir una tecnología que requiera abrir el libro en Excel de escritorio como única vía operativa.

## 14. IA

La inspección estructural no depende de IA.

La IA puede asistir después en:

- asignar significado a hojas/rangos;
- proponer campos canónicos;
- interpretar condiciones y beneficios;
- explicar fórmulas;
- sugerir pruebas;
- comparar versiones semánticamente.

Todo resultado de IA permanece como propuesta con evidencia de hoja/celda/rango y confirmación humana.