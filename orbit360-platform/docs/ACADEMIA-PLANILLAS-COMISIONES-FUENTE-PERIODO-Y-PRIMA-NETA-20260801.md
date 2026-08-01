# ACADEMIA — PLANILLAS Y COMISIONES — FUENTE, PERIODO Y PRIMA NETA

**Fecha:** 2026-08-01  
**Clasificación:** `ACADEMIA_ACTUALIZAR`

## Propósito

Enseñar que una comisión no se confirma solo porque exista una póliza similar, un importe parecido o una planilla con la estructura correcta. La fila debe corresponder al mismo evento, periodo y fuente autoritativa.

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

### 2. Periodo exacto

Una fila de junio no puede aplicarse a un cobro de julio aunque coincidan:

- póliza;
- prima;
- producto;
- cuota aproximada.

Las pólizas con pagos periódicos pueden repetir importes. La fecha y el periodo son parte de la identidad del registro.

### 3. Prima neta recaudada

Producción, metas y comisiones deben analizarse sobre prima neta recaudada, no sobre:

- prima total;
- IVA;
- gastos de emisión;
- movimientos bancarios agregados;
- ingresos financieros históricos.

### 4. Fuentes separadas

- `planilla_aseguradora`: evidencia emitida por la aseguradora;
- `planilla_comisiones`: detalle de comisión del intermediario y, cuando exista, del vendedor;
- `cobros_realizados`: pagos aplicados a recibos;
- `financiero_historico`: fuente informativa separada.

Una fuente no reemplaza automáticamente a otra.

### 5. `SOURCE_MISSING`

Cuando falta la planilla del periodo exacto, el estado correcto es:

```text
Fuente pendiente
Sin cálculo confirmado
Sin escritura
```

No es un defecto funcional de Orbit 360.

## Caso práctico

Se encuentra una planilla con columnas completas de comisión y una póliza con importe coincidente, pero la fila corresponde al mes anterior.

Pregunta: ¿puede aplicarse la comisión?

Respuesta esperada: no. La estructura sirve para mapear el archivo, pero la fila no es evidencia del cobro actual.

## Evaluación

La persona debe identificar:

1. qué fuente confirma el cobro;
2. qué fuente confirma la comisión;
3. cuál es el periodo del registro;
4. cuál es la prima neta;
5. si la comisión corresponde a A&S o al vendedor;
6. si el caso debe quedar en `SOURCE_MISSING` o `REQUIERE_VALIDACION`.

## Roles

- Dirección: lectura de producción y comisión confirmada;
- Operativo / Cobros: relación cobro–planilla;
- Finanzas: facturación y registro posterior, sin reconstrucción retroactiva;
- Asesores: comisión visible solo cuando esté validada;
- Superadmin / IT: gates, trazabilidad y calidad de fuente.

## Privacidad

Los ejercicios de Academia deben usar datos ficticios. No incluir pólizas, clientes, importes, facturas o referencias reales.
