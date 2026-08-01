# ACADEMIA — PLANILLAS Y COMISIONES — FUENTE, PERIODO Y PRIMA NETA

**Fecha:** 2026-08-01  
**Clasificación:** `ACADEMIA_ACTUALIZAR`

## Propósito

Enseñar que una comisión no se confirma solo porque exista una póliza similar, un importe parecido o una planilla con estructura correcta. La fila debe corresponder al mismo evento, periodo y fuente autoritativa.

## Conceptos obligatorios

### 1. Cobro conciliado no equivale a comisión liquidada

Un cobro puede estar correctamente aplicado y conciliado sin que todavía exista una planilla de comisión emitida por la aseguradora.

Estados recomendados:

```text
Cobro conciliado
Planilla pendiente
Comisión pendiente de validar
Comisión confirmada
```

### 2. Periodo exacto no significa inventar una fecha

Una fila de junio no puede aplicarse a un cobro de julio aunque coincidan póliza, prima, producto y cuota aproximada.

Sin embargo, algunas aseguradoras emiten planillas mensuales que identifican mes y año sin informar un día exacto por fila. En esos casos:

```text
periodo confiable: obligatorio
fecha exacta: vacía si la fuente no la proporciona
fecha inventada: prohibida
```

El modo de importación debe declarar expresamente que la fuente es mensual. Si no existe ni fecha ni periodo confiable, corresponde `REQUIERE_VALIDACION`.

### 3. Duplicado aparente no siempre es duplicado real

Dos filas pueden mostrar la misma póliza, prima y comisión y aun así representar movimientos válidos distintos. Esto ocurre especialmente cuando la fuente no muestra recibo, requerimiento o fecha individual.

Regla:

```text
identidad fuerte → puede deduplicarse
identidad débil → preservar y validar contra totales/factura
```

Nunca eliminar una fila solo porque “se parece” a otra. Si retirarla rompe la conciliación con la factura o liquidación, la deduplicación era incorrecta.

### 4. Prima neta recaudada

Producción, metas y comisiones deben analizarse sobre prima neta recaudada, no sobre:

- prima total;
- IVA;
- gastos de emisión;
- movimientos bancarios agregados;
- ingresos financieros históricos.

### 5. Comisión A&S, comisión de cobro y comisión de vendedor

Deben mantenerse separadas:

```text
comisión por venta del intermediario
comisión por cobro del intermediario
comisión del vendedor/asesor
IVA de la factura
importe total facturado
```

Una factura valida el total cobrado por A&S, pero no confirma por sí sola cuánto corresponde liquidar a un asesor.

### 6. Fuentes separadas

- `planilla_aseguradora`: evidencia emitida por la aseguradora;
- `planilla_comisiones`: detalle de comisión del intermediario y, cuando exista, del vendedor;
- `cobros_realizados`: pagos aplicados a recibos;
- factura emitida: documento de cobro de la comisión;
- `estado_cuenta_bancario`: evidencia para conciliación financiera;
- `financiero_historico`: fuente informativa separada.

Una fuente no reemplaza automáticamente a otra.

### 7. CRM y finanzas son etapas distintas

Una fila puede estar lista para mostrar histórico CRM y todavía no estar habilitada para movimientos financieros.

Ejemplos:

```text
planilla válida + factura faltante
CRM: CANDIDATE_READONLY
FINANZAS: HOLD_INVOICE_MISSING
```

```text
planilla + factura exactas, pero sin gate financiero
CRM: CANDIDATE_READONLY
FINANZAS: HOLD_FINANCE_NOT_ACTIVATED
```

### 8. `SOURCE_MISSING` y paquete incompleto

Cuando falta la planilla del periodo exacto:

```text
Fuente pendiente
Sin cálculo confirmado
Sin escritura
```

Cuando un archivo depende de recursos externos no entregados, el estado correcto es:

```text
HOLD_SOURCE_PACKAGE_INCOMPLETE
```

No es un defecto funcional de Orbit 360.

## Caso práctico 1 — periodo mensual

Una planilla informa “junio 2026”, país GT y moneda GTQ, pero no fecha exacta por fila.

Pregunta: ¿debe asignarse automáticamente 30 de junio?

Respuesta esperada: no. Se conserva `2026-06` y la fecha queda vacía. El día no se inventa.

## Caso práctico 2 — duplicado aparente

Dos filas son idénticas en póliza e importe, pero la fuente no contiene recibo ni fecha individual. El total de la factura solo concilia cuando ambas se conservan.

Pregunta: ¿debe eliminarse una?

Respuesta esperada: no. La identidad es débil y la conciliación confirma que ambas forman parte del corte.

## Caso práctico 3 — liquidación de asesor

La comisión A&S coincide con la factura, pero el total de comisión de vendedor no coincide con la suma del detalle.

Pregunta: ¿puede publicarse la comisión A&S en CRM y liquidarse al asesor?

Respuesta esperada:

```text
CRM comisión A&S: sí, read-only y trazable
Liquidación asesor: no, HOLD hasta aclarar el total y el alias del vendedor
```

## Evaluación

La persona debe identificar:

1. qué fuente confirma el cobro;
2. qué fuente confirma la comisión;
3. cuál es el periodo del registro;
4. si existe fecha exacta o solo periodo mensual;
5. cuál es la prima neta;
6. cuál comisión corresponde a A&S y cuál al vendedor;
7. si existe identidad fuerte para deduplicar;
8. si el caso es CRM-ready o finance-ready;
9. si corresponde `SOURCE_MISSING`, `REQUIERE_VALIDACION` o `HOLD`.

## Roles

- Dirección: producción y comisión confirmada;
- Operativo / Cobros: relación cobro–planilla y excepciones;
- Finanzas: factura, banco y promoción posterior a movimientos;
- Asesores: comisión visible solo cuando corresponda y liquidación únicamente validada;
- Superadmin / IT: gates, trazabilidad, identidad y calidad de fuente.

## Privacidad

Los ejercicios de Academia deben usar datos ficticios. No incluir pólizas, clientes, importes, facturas, códigos de vendedor ni referencias reales.
