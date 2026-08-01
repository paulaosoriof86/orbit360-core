# Cierre estático — Cobros/Conciliación multievidencia temporal

Fecha: 2026-08-01  
Fecha operativa de fuentes: hasta 2026-07-31, según cada corte  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Veredicto

`COBROS_MULTIEVIDENCIA_TEMPORAL_STATIC_READY`

Gate `block10.3-cobros-multievidencia-temporal-static-v20260801`:

```text
run: 30703777666
artifact: 8819653122
digest: sha256:a596adcb68e7092de0e8fdc71eb9999b161c4101f16693ce7de190d349f93ab4
checks: 58/58 PASS
```

## Corrección metodológica cerrada

El contrato anterior trataba los estados de cartera únicamente como saldos pendientes y difería las planillas de comisiones a otro bloque. Esto impedía aprovechar evidencia válida ya entregada y provocaba solicitudes repetidas.

Clasificación inicial: `DATA_CONTRACT_FAILURE`.

El modelo corregido reconoce:

- CRM de cobranza como pago reportado;
- reporte de pagos/ingresos de aseguradora como evidencia directa de la aseguradora;
- estado de cartera como evidencia del saldo pendiente en su fecha de corte;
- comparación entre carteras como evidencia temporal de permanencia o desaparición de una obligación;
- planilla de comisiones como corroboración de que la aseguradora reconoció el recaudo;
- banco y documentos únicamente como soporte para HOLD específicos;
- histórico financiero como dominio separado.

## Causa raíz del primer fallo del gate

La primera ejecución del gate, run `30703553291`, falló porque el motor generaba un caso independiente por cada corte de cartera. Una obligación podía quedar correctamente conciliada desde el corte inicial y luego ser sobrescrita por su aparición en un corte posterior.

Clasificación: `FUNCTIONAL_DEFECT_TEMPORAL_LINEAGE_DUPLICATION`.

Corrección:

```text
aseguradora + identidad del recibo
→ una sola línea temporal
→ primer corte como origen
→ cortes posteriores solo como evidencia
```

Owner corregido: `20260801.2-multi-evidence-temporal-lineage`.

La segunda y última ejecución pasó 58/58. No se requirió un tercer intento.

## Fuentes registradas

Los diez archivos entregados quedaron registrados por nombre lógico, hash, corte, aseguradora, formato y función probatoria en:

`orbit360-platform/docs/REGISTRO-FUENTES-CONCILIACION-MULTIEVIDENCIA-20260801.json`

Reglas persistidas:

- no volver a pedir una fuente con el mismo hash;
- pedir planillas, estados bancarios y archivos financieros vigentes únicamente cuando un caso concreto los requiera;
- no utilizar como vigentes versiones anteriores después de que la usuaria informe que fueron actualizadas;
- conservar archivos antiguos como evidencia histórica de su propio corte;
- no inferir la identidad de una aseguradora desde un nombre ambiguo;
- documentar cada nueva fuente al recibirla.

## Resultados relevantes

### Aseguradora General

Una obligación estaba pendiente en el estado de cartera del 20/07/2026 y aparece pagada en el reporte de ingresos el 22/07/2026. El pago posterior al corte es una secuencia válida y no una contradicción.

### Mapfre

El archivo de cobros actualizado amplía el corte hasta el 31/07/2026 y conserva las mismas cuatro filas pagadas del archivo anterior. Sustituye el corte previo sin duplicar pagos. El proyectado de agosto funciona como evidencia de los requerimientos siguientes y evita relacionar una cuota pagada con otra vigencia.

### Ficohsa

La planilla de comisión corrobora reconocimiento de recaudo, pero permanece en HOLD porque existe una diferencia de prefijo de póliza y una diferencia de moneda frente al CRM. No se fuerza la conciliación.

### Bantrab

El estado del 03/07/2026 conserva valor histórico. Un pago del CRM con fecha 14/07/2026 es válido por ser posterior al corte, pero las diferencias de periodicidad y monto mantienen el caso en HOLD.

### Estados de cartera

- La Ceiba: incluye obligaciones corrientes y una obligación histórica exigible de una vigencia vencida;
- Aseguradora Guatemalteca: cartera detallada al 28/07/2026;
- Universales: antigüedad y detalle de recibos al 27/07/2026;
- El Roble: perfilado con corte inferido y marcado como tal;
- GyT: registrado, pero la identidad de la aseguradora y el corte requieren validación; no se infiere que sea Columna.

## Contrato temporal

```text
pendiente en T1
+ pago posterior a T1
+ desaparición o cambio en T2
+ comisión reconocida cuando exista
= evidencia multifuente para revisión
```

Límites:

- desaparición sola no crea cobro;
- comisión sola no crea cobro;
- banco solo no crea cobro;
- pago posterior al corte se conserva;
- una cartera antigua no representa el saldo vigente;
- diferencias de monto, fecha, moneda, cuota, endoso y vigencia permanecen visibles;
- recibos históricos exigibles se atienden sin reactivar la póliza.

## Academia

Actualizada por roles en:

`orbit360-platform/docs/ACADEMIA-CONCILIACION-MULTIEVIDENCIA-TEMPORAL-20260801.md`

## Seguridad

```text
fuentes registradas: 10
filas reales en repo: 0
cobros writes: 0
finmovs writes: 0
Firestore writes: 0
operational writes: 0
browser: 0
deploy: 0
production: untouched
```
