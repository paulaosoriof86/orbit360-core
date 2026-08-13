# IMPLEMENTACIÓN P0.4B — INSPECTOR SEGURO OOXML XLSX/XLSM

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge ni deploy.

## 1. Posición dentro del plan

Este bloque no inicia Cotizador ni Comparativo. Completa la capacidad primaria de **Aseguradoras como fuente de conocimiento**:

```txt
Aseguradoras
→ referencia documental
→ inspector estructural
→ adapter Excel P0.4
→ propuesta/diff/validación
→ habilitación posterior en Cotizador/Comparativo
```

Carril principal: B.  
Carril A preparado: inventario visual y validación futura.  
Carril C preparado: lectura posterior de cotizadores/tarifarios reales.

## 2. Archivo implementado

```txt
tools/orbit360-inspect-excel-p04.py
```

Prueba:

```txt
tools/orbit360-test-inspect-excel-p04.py
```

El inspector usa únicamente la biblioteca estándar de Python y analiza la estructura OOXML del archivo ZIP.

## 3. Formatos soportados ahora

```txt
.xlsx
.xlsm
```

El soporte XLSM significa:

- detectar `vbaProject.bin`;
- reportar presencia de macros;
- no abrir, extraer ni ejecutar el VBA;
- no habilitar contenido;
- no calcular fórmulas.

## 4. Formatos todavía no soportados

```txt
.xls
.xlsb
```

Estado correcto:

```txt
UNSUPPORTED_FORMAT
```

No se convierte silenciosamente el archivo, no se abre Excel de escritorio y no se simula lectura.

## 5. Información inventariada

### Libro

- formato;
- hash SHA-256 por bloques;
- fingerprint estructural;
- sistema de fechas 1900/1904;
- modo de cálculo;
- protección de estructura;
- cantidad de hojas;
- defined names;
- macros presentes;
- vínculos externos;
- conexiones;
- custom XML;
- parser, versión y fecha.

### Hoja

- nombre e índice;
- visible, hidden o veryHidden;
- rango usado;
- filas y columnas;
- cantidad de fórmulas;
- constantes numéricas y de texto, solo conteos;
- funciones utilizadas;
- fingerprint de fórmulas;
- errores de fórmula;
- validaciones;
- formatos condicionales;
- celdas combinadas;
- tablas;
- rangos nombrados;
- protección;
- perfil de impresión.

### Impresión

- Print Area;
- Print Titles;
- orientación;
- tamaño de papel;
- fit-to-width/height;
- escala;
- márgenes;
- encabezado y pie sanitizados;
- centrado.

## 6. Información que no exporta

```txt
Valores de celdas
Shared strings
Contenido inline de clientes
Resultados calculados
VBA
Bytes/binarios
Base64
Contraseñas
Tokens
Rutas locales
Credenciales
```

El inspector observa la existencia y tipo de las celdas para producir conteos, pero no incluye su valor en el JSON.

## 7. Límites de seguridad

Se añadieron límites para reducir riesgo de archivos malformados o ZIP bombs:

```txt
Archivo comprimido: máximo 150 MB
Contenido descomprimido: máximo 750 MB
Entradas ZIP: máximo 20,000
XML individual: máximo 80 MB
Hojas: máximo 500
```

Además:

- bloquea rutas absolutas o con `..` dentro del ZIP;
- rechaza XML con DTD o entidades;
- usa conversiones numéricas tolerantes;
- calcula hash por bloques de 1 MB;
- no usa red;
- no usa subprocess;
- no automatiza Excel/LibreOffice;
- no depende de librerías de terceros.

## 8. Advertencias generadas

```txt
FORMULAS_NOT_CALCULATED
CELL_VALUES_NOT_EXPORTED
MACROS_DETECTED_NOT_EXECUTED
EXTERNAL_LINKS_BLOCKED
EXTERNAL_CONNECTIONS_BLOCKED
VERY_HIDDEN_SHEETS_PRESENT
```

El adapter JavaScript traduce estas condiciones a advertencias operativas por validar.

## 9. Prueba sintética

El smoke crea dinámicamente un XLSM ficticio con:

- dos hojas;
- hoja de cotización;
- hoja veryHidden;
- fórmulas IF, SUM, VLOOKUP e INDIRECT;
- error de fórmula;
- validaciones;
- formato condicional;
- rango combinado;
- tabla;
- Print Area;
- Print Titles;
- configuración de página;
- protección;
- vínculo externo;
- conexión externa;
- proyecto VBA ficticio;
- texto que simula un dato de cliente.

La prueba exige que:

- se detecte la estructura;
- no se devuelva el dato de cliente;
- no se devuelva el contenido VBA;
- no se devuelva la ruta temporal;
- macros y fórmulas permanezcan sin ejecutar;
- XLS legacy permanezca como no soportado.

## 10. Relación con el adapter P0.4

El resultado del inspector cumple el snapshot esperado por:

```txt
orbit360-platform/core/excel-workbook-adapter-p04.js
```

Flujo futuro:

```txt
fileRef autorizado
→ inspector OOXML
→ snapshot sanitizado
→ adapter P0.4
→ clasificación y capacidades propuestas
→ diff
→ validación humana
```

Todavía no existe wire que tome archivos reales desde Drive ni escritura en `Orbit.store`.

## 11. Estado real

```txt
Inspector XLSX/XLSM: implementado
Prueba sintética: creada
Workflow: actualizado
Ejecución CI visible: pendiente de confirmación
Procesamiento de fuentes reales: no iniciado
Parser XLS/XLSB: pendiente
Extracción semántica de tarifas/reglas: pendiente
Habilitación en Cotizador: pendiente
```

## 12. Registro de cambios y hallazgos

| Fecha | Módulo | Necesidad | Esperado | Causa raíz | Archivo/función | Fix/mejora | Impacto | Estado |
|---|---|---|---|---|---|---|---|---|
| 2026-07-10 | Aseguradoras/Excel | Generar snapshot real sin Excel de escritorio | Inventario OOXML seguro | El adapter puro necesitaba proveedor concreto | `orbit360-inspect-excel-p04.py` | Inspector estándar XLSX/XLSM | Permite primer dry-run real posterior | IMPLEMENTADO_BACKEND |
| 2026-07-10 | Seguridad | Evitar ejecución de macros/fórmulas | Detección sin ejecución | XLSM puede contener VBA y enlaces | `inspect_workbook` | Solo presencia/fingerprint/conteos | Reduce riesgo de código activo | IMPLEMENTADO_BACKEND |
| 2026-07-10 | Privacidad | No exportar datos de celdas | Solo estructura | Cotizadores pueden contener ejemplos diligenciados | `inspect_sheet` | Conteos sin valores/shared strings | Evita fuga de clientes | IMPLEMENTADO_BACKEND |
| 2026-07-10 | Robustez | Evitar bloqueo por archivo malformado | Límites y rechazo controlado | OOXML es ZIP y XML variable | `validate_archive/parse_xml` | Límites, paths seguros, DTD bloqueado | Pipeline más estable | IMPLEMENTADO_BACKEND |
| 2026-07-10 | Compatibilidad | Ser honesto con formatos legacy | Error explícito | XLS/XLSB no son OOXML ZIP estándar | `inspect_workbook` | `UNSUPPORTED_FORMAT` | No simula soporte inexistente | DOCUMENTADO_PENDIENTE |

## 13. Siguiente acción

Cerrar la interoperabilidad automática:

1. ejecutar inspector sobre fixture en CI;
2. pasar su JSON real al adapter P0.4 en un smoke extremo a extremo;
3. validar que el adapter preserve impresión, dimensiones y advertencias;
4. preparar el wire metadata-only desde referencia Drive;
5. después solicitar una primera fuente real sanitizable;
6. luego implementar extracción semántica propuesta y adapter PDF.