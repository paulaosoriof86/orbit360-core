# Implementación P0.6 — contrato de reglas tarifarias multiproducto

Fecha: 2026-07-10  
Módulo: Aseguradoras → Cotizador → Comparativo  
Estado: `CONTRATO_IMPLEMENTADO / FUENTES_REALES_AUDITADAS / HABILITACION_BLOQUEADA`

## Necesidad

Los cotizadores reales auditados no comparten una fórmula única. Existen reglas por rango de valor, tipo/uso de vehículo, producto, edad, género, maternidad, composición familiar, plan, asistencia, gastos, impuestos y financiamiento.

Sin un contrato común, el empalme repetiría el patrón monolítico del HTML v110, mezclaría productos o sumaría impuestos/gastos dos veces.

## Archivo implementado

```text
orbit360-platform/core/tariff-rule-proposal-p06.js
```

El contrato es puro y reusable:

- no usa `Orbit.store`;
- no usa red;
- no contiene aseguradoras reales;
- no contiene tasas reales;
- no calcula con datos de clientes;
- no habilita Cotizador ni Comparativo;
- requiere evidencia y revisión humana.

## Contratos principales

### Regla

Cada regla conserva:

- tenant y aseguradora;
- documento y versión fuente;
- país, moneda, ramo, producto y plan;
- tipo/uso de vehículo o riesgo;
- aplicabilidad;
- tipo de cálculo;
- base monetaria;
- componentes;
- calendarios de financiamiento;
- opciones;
- tabla/matriz;
- ruta de salida;
- evidencia;
- confianza;
- estado.

### Aplicabilidad

Permite acotar por:

- tipo de vehículo;
- uso;
- tipo de riesgo;
- modalidad individual/familiar;
- género;
- edad;
- valor asegurado;
- antigüedad;
- suma asegurada;
- maternidad;
- coberturas requeridas o excluidas.

### Componentes

Permite separar:

- prima base;
- prima mínima;
- cargo fijo;
- asistencia;
- gastos de emisión/expedición;
- financiamiento;
- impuesto;
- vida;
- dental;
- maternidad;
- coberturas opcionales;
- descuentos.

### Base monetaria

El campo `amountBasis` bloquea la duplicación de cargos:

```text
net
gross_includes_tax
gross_includes_fees
gross_includes_tax_and_fees
requires_validation
```

Una regla bruta no puede volver a sumar un componente fiscal o de gastos sin marcarlo como incluido.

### Ruta de salida

Cotizador resuelve una salida única por contexto. Si dos reglas aplicables devuelven rutas diferentes, el contrato responde:

```text
RUTAS_SALIDA_EN_CONFLICTO
```

No se permite imprimir simultáneamente salidas correspondientes a vehículos, riesgos o planes diferentes.

## Tipos de cálculo

```text
fixed
rate
rate_with_minimum
rate_plus_fixed_with_minimum
lookup_range
matrix_age_gender
matrix_age_gender_maternity
per_member
household_tier
gross_table
manual_validated
```

## Validaciones P0

- tenant, aseguradora, documento, país y producto;
- tipo de cálculo y base monetaria;
- evidencia de regla y componentes;
- matriz completa de maternidad/no maternidad;
- prevención de doble IVA;
- prevención de doble gasto;
- ruta de salida;
- confianza;
- conflicto entre reglas equivalentes.

## Estados y gates

Una regla confirmada queda:

```text
validated_pending_enablement
enabledCotizador: false
enabledComparativo: false
```

La validación humana no es la habilitación. El contrato exige un segundo gate y un writer externo controlado.

## Smoke

```text
tools/orbit360-test-tariff-rule-proposal-p06.mjs
```

Cubre con datos ficticios:

- tasa con mínimo por tipo de vehículo;
- salida única;
- tasa más fijo con mínimo;
- asistencia;
- financiamiento;
- Salud por edad/género/maternidad;
- dental individual/familiar;
- tabla bruta y riesgo de doble IVA;
- falta de evidencia;
- conflictos;
- validación pendiente de habilitación;
- resumen por combinación.

Workflow:

```text
.github/workflows/orbit360-tariff-rule-proposal-p06-smoke.yml
```

## Impacto

### Aseguradoras

Debe administrar las reglas por fuente/producto/versión y mostrar evidencia y estado.

### Cotizador

Debe construir formularios y salidas desde reglas habilitadas, nunca desde fallbacks genéricos.

### Comparativo

Recibirá cotizaciones normalizadas; no ejecutará directamente las fórmulas tarifarias.

### Academia

Debe explicar aplicabilidad, base monetaria, componentes, evidencia, validación y segundo gate.

## Pendientes

- extracción numérica sanitizada por hoja/rango;
- validación humana de valores;
- wire Drive;
- adapter PDF;
- gate de habilitación;
- integración runtime;
- UX Claude;
- CI visible y smoke navegador.
