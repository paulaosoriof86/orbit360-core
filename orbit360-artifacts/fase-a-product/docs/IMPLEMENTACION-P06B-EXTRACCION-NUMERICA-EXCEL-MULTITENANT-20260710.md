# Implementación P0.6b — extracción numérica Excel multi-tenant

Fecha: 2026-07-10  
Módulo: Aseguradoras → Cotizador → Comparativo  
Estado: `EXTRACTOR_IMPLEMENTADO / OCHO_FUENTES_EJECUTADAS / REGLAS_NO_HABILITADAS`

## Necesidad

P0.4 inventariaba la estructura de XLSX/XLSM sin leer valores. P0.6b añade una segunda fase controlada que identifica hechos tarifarios y valores cacheados con evidencia hoja/rango, sin ejecutar Excel, fórmulas, macros o vínculos externos.

El objetivo no es convertir una coincidencia textual en tarifa activa. El resultado es un manifiesto de candidatos que pasa por mapeo semántico, revisión humana, reconciliación y segundo gate.

## Archivos implementados

```text
tools/orbit360-extract-excel-rule-facts-p06b.py
orbit360-platform/core/excel-rule-proposal-adapter-p06b.js
orbit360-platform/core/tariff-quote-reconciliation-p06c.js
```

## Extractor determinístico

El extractor usa únicamente biblioteca estándar de Python para leer el contenedor OOXML.

Lee:

- hojas visibles, ocultas y muy ocultas;
- shared strings y valores inline;
- valores numéricos cacheados;
- fórmulas como texto, sin calcularlas;
- formatos numéricos;
- nombres definidos y áreas de impresión;
- errores de fórmula;
- referencias externas;
- presencia de macros;
- labels, contexto y celdas cercanas.

Detecta candidatos de:

```text
rate
minimum_premium
base_premium
total_premium
issuance_expense
expedition_expense
tax
assistance
financing_surcharge
installment
deductible
discount
maternity
dental
age_band
gender
plan
vehicle_type
usage
coverage
output
```

Cada hecho conserva:

- identificador estable;
- tipo;
- etiqueta sanitizada;
- valor candidato;
- tipo de valor;
- fórmula no ejecutada;
- formato numérico;
- dimensiones propuestas;
- confianza;
- documento, hoja y rango;
- estado `requires_validation`.

## Seguridad

Límites:

```text
archivo comprimido: 150 MB
contenido descomprimido: 750 MB
entradas ZIP: 20,000
XML individual: 80 MB
hojas: 500
hechos: 8,000
```

El extractor:

- bloquea rutas ZIP inseguras;
- bloquea DTD y entidades;
- no usa red;
- no usa subprocess;
- no abre Excel/LibreOffice;
- no ejecuta VBA;
- no calcula fórmulas;
- no sigue vínculos externos;
- no escribe en Orbit.store;
- no habilita reglas.

En modo `training` redacta PII, incluyendo el caso en que la etiqueta sensible está en una celda y el valor en la celda contigua.

## Agrupación semántica

Los hechos se agrupan provisionalmente en:

```text
pricing
financing
health_matrix
presentation
dimensions
```

Esta agrupación evita mezclar:

- una tasa de producto con un calendario general de financiamiento;
- datos de presentación con reglas tarifarias;
- una matriz de Salud con una prima de vehículo;
- una dimensión de vehículo con un valor monetario.

## Adapter hacia P0.6

`excel-rule-proposal-adapter-p06b.js` transforma el manifiesto en propuestas compatibles con `tariff-rule-proposal-p06.js`.

Puede proponer de forma conservadora:

- tasa con prima mínima;
- prima fija;
- asistencia;
- gastos;
- impuesto;
- dental y maternidad opcionales;
- descuentos;
- cuotas y recargos;
- ruta de salida.

Toda regla queda:

```text
proposed | requires_validation
enabledCotizador: false
enabledComparativo: false
writeAllowed: false
```

Un grupo que solo contiene financiamiento no se asigna automáticamente a un plan. Se devuelve como:

```text
FINANCING_SCOPE_REQUIRES_MAPPING
```

## Reconciliación P0.6c

`tariff-quote-reconciliation-p06c.js` verifica una regla contra una cotización ejemplo.

Soporta inicialmente:

```text
fixed
rate
rate_with_minimum
rate_plus_fixed_with_minimum
lookup_range
```

Exige:

- combinación compatible;
- documento y evidencia;
- valor asegurado cuando aplica;
- base monetaria;
- base explícita para gastos/impuestos porcentuales;
- calendario de pago cuando aplica;
- total observado con evidencia PDF.

Estados:

```text
reconciled_within_tolerance
mismatch_requires_validation
incomplete_requires_validation
```

La reconciliación no aprende, corrige ni habilita automáticamente.

## Pruebas y CI

```text
tools/orbit360-test-excel-rule-facts-p06b.py
tools/orbit360-test-excel-rule-proposal-adapter-p06b.mjs
tools/orbit360-test-tariff-quote-reconciliation-p06c.mjs
.github/workflows/orbit360-excel-rules-reconciliation-p06b-p06c-smoke.yml
```

Cubren:

- XLSX sintético;
- valores y fórmulas cacheadas;
- área de impresión;
- PII contigua;
- tasa, mínimo y asistencia;
- cuotas y recargo;
- financiamiento global sin scope;
- evidencia;
- reconciliación y diferencia;
- bloqueo por base monetaria desconocida;
- bloqueo por vehículo distinto;
- cero escritura y segundo gate.

## Fronteras

No se modificaron store, Auth, reglas, index, Cotizador, Comparativo ni módulos protegidos. Los manifiestos reales y cifras exactas permanecen fuera del repositorio.
