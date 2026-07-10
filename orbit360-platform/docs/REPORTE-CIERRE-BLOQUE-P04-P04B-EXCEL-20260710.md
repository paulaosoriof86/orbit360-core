# REPORTE DE CIERRE DEL BLOQUE P0.4 / P0.4B — EXCEL

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open.

## 1. Alcance cerrado

- contrato documental común;
- adapter Excel estructural;
- compatibilidad con esquema real P0 de Aseguradoras;
- inspector OOXML real XLSX/XLSM;
- fixture XLSM ficticio;
- smoke aislado del contrato/adapter;
- smoke del esquema real;
- smoke del inspector;
- smoke extremo a extremo inspector→adapter→esquema P0;
- workflow dedicado;
- documentación backend/UX/Claude/Academia;
- registro en control maestro.

## 2. Archivos de implementación

```txt
orbit360-platform/core/document-source-contract-p04.js
orbit360-platform/core/excel-workbook-adapter-p04.js
tools/orbit360-inspect-excel-p04.py
```

## 3. Archivos de prueba

```txt
tools/orbit360-test-excel-workbook-adapter-p04.mjs
tools/orbit360-test-excel-workbook-adapter-p04-schema.mjs
tools/orbit360-test-inspect-excel-p04.py
tools/orbit360-create-excel-p04-fixture.py
tools/orbit360-test-excel-p04-e2e.mjs
.github/workflows/orbit360-excel-workbook-adapter-p04-smoke.yml
```

## 4. Contrato de seguridad comprobado por diseño

```txt
writeAllowed = false
approved = false
requiresHumanValidation = true
executeMacros = false
calculateFormulas = false
includeCellValues = false
includeBinaryPayload = false
```

El inspector:

- no importa valores de celdas;
- no importa shared strings;
- no extrae VBA;
- no usa red;
- no usa subprocess;
- no automatiza Excel/LibreOffice;
- no escribe en Orbit.store;
- limita tamaño/entradas/XML/hojas;
- bloquea paths inseguros y DTD/entidades XML.

## 5. Estado de validación

```txt
Código y smokes: creados
Workflow: configurado
Head de rama: por verificar en respuesta final
Runs de GitHub visibles mediante conector: ninguno
Combined status visible: vacío
Ejecución independiente desde contenedor: no disponible por falta de resolución de red
Resultado CI: NO COMPROBADO
```

No se declara ningún smoke como aprobado hasta que GitHub muestre un run concluido o se ejecute en un checkout autorizado.

## 6. Fuentes reales

```txt
Cotizadores/tarifarios reales procesados: 0
Datos reales cargados: 0
Tarifas aprobadas: 0
Versiones reales habilitadas: 0
```

El bloque estuvo deliberadamente basado en fixtures ficticios para cerrar contrato y seguridad antes de solicitar fuentes reales.

## 7. Formatos

```txt
XLSX: implementado estructuralmente
XLSM: implementado estructuralmente; macros solo detectadas
XLS: pendiente
XLSB: pendiente
CSV: corresponde al importador tabular, no a este inspector OOXML
PDF: siguiente adapter documental
```

## 8. Relación con el plan

Este bloque permanece dentro de Aseguradoras y no inició construcción desviada de Cotizador/Comparativo.

Secuencia vigente:

```txt
P0.4/P0.4B contrato + inspector Excel
→ confirmar CI/interoperabilidad
→ wire metadata-only desde referencia autorizada
→ primer inventario sanitizado real
→ extracción semántica propuesta/diff
→ adapter PDF
→ cierre de fuente Aseguradoras
→ Cotizador
→ Comparativo
```

## 9. Claude

```txt
Claude requerido ahora: NO
Patrones documentados para próximo paquete: SÍ
```

Se requerirá Claude cuando exista evidencia real sanitizada suficiente para diseñar:

- wizard de fuentes;
- inventario por hoja;
- clasificación corregible;
- diff de versiones;
- advertencias;
- presentación/impresión;
- relación con Cotizador/Comparativo.

## 10. Acción siguiente

No repetir auditoría del HTML ni del adapter. El siguiente bloque debe convertir este contrato en operación controlada mediante:

1. wire metadata-only;
2. proveedor/ref de archivo autorizado;
3. ejecución de inspector;
4. persistencia solo del inventario confirmado, nunca del archivo ni de tarifas no validadas;
5. primer reporte real sanitizado;
6. extracción semántica propuesta con evidencia de hoja/rango.