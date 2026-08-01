# CIERRE READ-ONLY — PLANILLAS Y COMISIONES — INVENTARIO DE FUENTES

**Fecha:** 2026-08-01  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Entorno:** LAB  
**Producción / deploy / main / merge:** no ejecutados

## 1. Alcance

El inventario se limitó a los cinco cobros ya conciliados y post-verificados:

```text
cobros conciliados en alcance: 5
aseguradoras en alcance: 2
residuales HOLD excluidos: 4
país: GT
moneda: GTQ
```

No se incluyeron planillas de otras aseguradoras, movimientos financieros, estados bancarios ni archivos históricos como sustitutos.

## 2. Resultado ejecutivo

```text
fuentes con estructura reusable: 1
fuentes exactas del periodo/caso: 0
casos con planilla de comisión elegible: 0/5
escrituras: 0
```

La clasificación final es:

```text
SCHEMA_REFERENCE_AVAILABLE_CURRENT_CASE_SOURCES_MISSING
```

No corresponde abrir un dry-run de comisión por caso hasta localizar las planillas autoritativas del periodo correcto.

## 3. Mapfre

Se localizó una planilla modificada en julio de 2026 con estructura completa de comisiones, pero sus filas corresponden a pagos de junio de 2026.

La fuente contiene:

- tipo y producto;
- póliza y relación de ingreso;
- fecha de pago;
- moneda;
- requerimiento, serie y factura;
- fecha de vencimiento y número de pago;
- valor de factura;
- prima neta;
- comisión de A&S;
- comisión de vendedor;
- referencia adicional.

Su estructura es válida como patrón para el adaptador de importación. Sin embargo, los dos cobros Mapfre conciliados corresponden a julio de 2026. Las coincidencias de póliza e importe observadas pertenecen a cuotas o eventos de junio y no pueden reutilizarse para calcular o importar la comisión de julio.

Decisión:

```text
SCHEMA_REFERENCE_ONLY_NOT_VALID_FOR_CASE_DRY_RUN
```

También se localizó un archivo denominado “Planilla de comisiones Julio - Mapfre”, pero su contenido corresponde a julio de 2020. Quedó excluido por antigüedad.

## 4. Aseguradora General

El reporte vigente de ingresos cubre el periodo del 1 al 27 de julio de 2026 y contiene evidencia de cobro:

- póliza;
- certificado y endoso;
- cuota y comprobante;
- serie, factura y requerimiento;
- moneda;
- importe neto y total;
- periodo facturado;
- fecha de cobranza y vencimiento.

No contiene:

- comisión de A&S;
- comisión de vendedor;
- tasa de comisión;
- liquidación de comisión;
- total a facturar por comisión.

Por ello no puede utilizarse como `planilla_comisiones` ni como base para inferir una tasa.

Se revisaron Drive y Gmail. No se localizó una planilla autoritativa de comisiones de Aseguradora General para los tres cobros conciliados.

Decisión:

```text
PAYMENT_EVIDENCE_ONLY_NOT_VALID_AS_COMMISSION_PLANILLA
```

## 5. Fuentes excluidas

### Planilla AseGuate

El archivo corresponde a otro universo de aseguradora y pólizas. No es la planilla de Aseguradora General para estos casos.

### Otras planillas

Bantrab, Ficohsa, Universales, La Ceiba, Columna, GyT y demás aseguradoras quedan fuera del alcance de los cinco cobros conciliados.

### Movimientos financieros

El archivo de ingresos y egresos no puede utilizarse para reconstruir comisiones. El histórico financiero es una fuente separada y no escribe `planilla_comisiones`.

## 6. Contrato de fuente reusable

La estructura Mapfre permite definir los aliases iniciales:

```text
tipo
producto
poliza
relacion_ingreso
fecha_pago
moneda
requerimiento
serie
factura
fecha_vencimiento
obligacion
numero_pago
asegurado
valor_factura
prima_neta
comision_ays
comision_vendedor
referencia_adicional
```

Reglas obligatorias:

- país y moneda explícitos;
- periodo exacto de la planilla;
- trazabilidad de archivo, hoja y fila;
- comisión calculada o validada sobre prima neta recaudada;
- no reutilizar una fila de otro mes;
- no inferir tasas desde archivos financieros;
- no mezclar cobros HOLD;
- dry-run y diff antes de cualquier escritura;
- separación entre comisión del intermediario y comisión del vendedor.

## 7. Carriles

### Carril A — frontend, UX y Academia

No se modificó la UI. Debe conservarse el estado honesto `Planilla pendiente / Fuente no recibida`, sin mostrar comisión estimada como confirmada.

### Carril B — backend y adaptadores

No se abrió writer, request ni gate de escritura. Solo quedó definido el esquema reusable para el futuro adaptador de planillas variables.

### Carril C — datos reales A&S

Los cinco cobros permanecen conciliados, pero ninguno tiene una planilla de comisión del periodo exacto localizada. No se creó registro de comisión.

## 8. Impacto metodológico

La primera lectura de la planilla Mapfre pudo sugerir cobertura por coincidencia de póliza e importe. El control temporal demostró que las filas correspondían a junio y los cobros a julio.

Clasificación evitada:

```text
DATA_CONTRACT_FAILURE por reutilización de fila de otro periodo
```

La corrección fue detener el dry-run antes de construirlo y actualizar el inventario, no ajustar fechas ni asumir periodicidad.

## 9. Siguiente acción exacta

```text
localizar o recibir planilla Mapfre del periodo julio de 2026
→ localizar o recibir planilla de comisiones de Aseguradora General para los tres casos
→ verificar archivo, hoja, fila, país, moneda y periodo
→ construir mapeo normalizado y dry-run privado
→ separar crear / omitir / requiere validación
→ no escribir comisión hasta evidencia y autorización
```

Mientras no existan esas fuentes, el bloque permanece en `SOURCE_MISSING`, no en error funcional.
